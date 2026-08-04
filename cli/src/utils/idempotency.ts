/**
 * Idempotency helpers for the setup-* commands (AIF-336).
 *
 * The setup-sms / setup-voice commands used to create a fresh messaging profile
 * or Call Control Application AND buy a fresh phone number on every run — with
 * no reuse detection, no cost warning, and no confirmation gate. Re-running the
 * command (or even a `--help` that accidentally executed, see AIF-325) silently
 * accumulated duplicate ~$1/mo numbers and duplicate profiles/apps.
 *
 * These helpers let the setup commands:
 *   1. Detect a previously agent-created resource by its stable name prefix, and
 *   2. Find a phone number already assigned to it,
 * so the command can reuse the existing pair instead of buying again — unless
 * the caller explicitly passes --force to provision a brand-new set.
 */

import type { TelnyxClient } from "../client.ts";

/** Stable name prefixes the setup commands stamp on the resources they create. */
export const AGENT_SMS_PROFILE_PREFIX = "Agent SMS Profile - ";
export const AGENT_VOICE_APP_PREFIX = "Agent Voice App - ";
export const AGENT_VERIFY_PROFILE_PREFIX = "Agent Verify Profile - ";

export interface ExistingResource {
  id: string;
  name: string;
}

export interface ReusablePair {
  resource: ExistingResource;
  phoneNumber: string;
  phoneNumberId: string;
  /** ISO country of the reused number (uppercased), when the API exposes it. */
  country: string;
}

/**
 * Find the most recent existing resource whose name starts with `prefix`.
 * `listPath` is a paged list endpoint (e.g. "/messaging_profiles"); `nameField`
 * is the property holding the human name ("name" or "application_name").
 * Returns undefined when none match (or on any lookup error — reuse is a
 * best-effort optimization and must never block a fresh setup).
 */
export async function findExistingByPrefix(
  client: TelnyxClient,
  listPath: string,
  nameField: string,
  prefix: string,
): Promise<ExistingResource | undefined> {
  const all = await findAllByPrefix(client, listPath, nameField, prefix);
  return all[0];
}

/**
 * Find the newest prefix-matched resource that is BARE — i.e. has NO phone
 * number assigned to it. This is the only kind of app that is safe to "adopt"
 * (buy+assign a number onto) without mutating an existing, live setup.
 *
 * The plain {@link findExistingByPrefix} returns the newest prefix app
 * regardless of whether it already has a number. Adopting such an app would let
 * a later patch/number-order run against a live app (e.g. rerunning
 * `setup-voice --country GB` when an existing US app already has a US number),
 * changing its webhook/outbound profile and stacking a second number onto it.
 * This helper scopes adoption to genuinely number-less apps.
 *
 * `filterKey` is the phone_numbers list filter used to detect an assigned
 * number (e.g. "connection_id").
 */
export async function findBareByPrefix(
  client: TelnyxClient,
  listPath: string,
  nameField: string,
  prefix: string,
  filterKey: string,
): Promise<ExistingResource | undefined> {
  const all = await findAllByPrefix(client, listPath, nameField, prefix);
  for (const resource of all) {
    const assigned = await findAssignedNumber(client, filterKey, resource.id);
    if (!assigned || !assigned.phoneNumber) return resource;
  }
  return undefined;
}

/**
 * Like {@link findExistingByPrefix}, but returns ALL prefix-matched resources,
 * newest first. Callers that need to keep scanning (e.g. to find one with an
 * assigned number, skipping orphaned newer ones) use this instead of only
 * seeing the most recent match.
 */
export async function findAllByPrefix(
  client: TelnyxClient,
  listPath: string,
  nameField: string,
  prefix: string,
): Promise<ExistingResource[]> {
  try {
    const res = await client.get(listPath, { "page[size]": 250 });
    const rows = ((res.data as Array<Record<string, unknown>>) ?? (Array.isArray(res) ? res : [])) as Array<Record<string, unknown>>;
    const matches = rows
      .filter((r) => typeof r[nameField] === "string" && (r[nameField] as string).startsWith(prefix))
      .map((r) => ({ id: String(r.id), name: String(r[nameField]) }));
    // Names carry a trailing timestamp, so the lexicographically largest name
    // is the most recently created one.
    matches.sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
    return matches;
  } catch {
    return [];
  }
}

/**
 * Find a phone number already assigned to the given resource.
 * `filterKey` is the phone_numbers list filter to scope by
 * ("messaging_profile_id" or "connection_id").
 * Returns undefined when the resource has no assigned number (or on error).
 */
export async function findAssignedNumber(
  client: TelnyxClient,
  filterKey: string,
  resourceId: string,
): Promise<{ phoneNumber: string; phoneNumberId: string; country: string } | undefined> {
  try {
    const res = await client.get("/phone_numbers", { [`filter[${filterKey}]`]: resourceId, "page[size]": 1 });
    const rows = ((res.data as Array<Record<string, unknown>>) ?? (Array.isArray(res) ? res : [])) as Array<Record<string, unknown>>;
    if (rows.length === 0) return undefined;
    const n = rows[0];
    // The number's country: the live GET /phone_numbers records expose it as
    // `country_iso_alpha2`; older/mocked shapes may use `country_code` or
    // `country`. Check the real field FIRST so country-scoped reuse actually
    // sees a country on live rows (otherwise it falls through to "" and a US
    // number could be reused for a --country GB request).
    const country = String(n.country_iso_alpha2 ?? n.country_code ?? n.country ?? "").toUpperCase();
    return { phoneNumber: String(n.phone_number ?? ""), phoneNumberId: String(n.id ?? ""), country };
  } catch {
    return undefined;
  }
}

/**
 * Look for a fully reusable (resource + assigned number) pair for the given
 * name prefix. Returns undefined unless BOTH an existing resource and a number
 * assigned to it are found — a bare resource with no number is not reusable for
 * "zero to sending" and would still require a purchase.
 */
export async function findReusablePair(
  client: TelnyxClient,
  listPath: string,
  nameField: string,
  prefix: string,
  filterKey: string,
  /**
   * When set (an explicit --country request), only reuse a number whose country
   * matches. An explicit country is a material setting: reusing a US number for
   * a `--country GB` request would silently hand back the wrong country while
   * reporting ready. Numbers with no exposed country are treated as a match so
   * accounts/mocks that don't return a country field still reuse as before.
   */
  requiredCountry?: string,
): Promise<ReusablePair | undefined> {
  // Scan ALL prefix-matched resources (newest first), not just the newest one.
  // A prior failed setup can leave a newer orphan profile/app with no number
  // while an older one still has a usable assigned number; stopping at the
  // first match would make us fall through and buy another paid number.
  const want = requiredCountry ? requiredCountry.toUpperCase() : "";
  const resources = await findAllByPrefix(client, listPath, nameField, prefix);
  for (const resource of resources) {
    const number = await findAssignedNumber(client, filterKey, resource.id);
    if (!number) continue;
    // Skip a reusable pair whose country doesn't match an explicit request.
    if (want && number.country && number.country !== want) continue;
    return { resource, phoneNumber: number.phoneNumber, phoneNumberId: number.phoneNumberId, country: number.country };
  }
  return undefined;
}
