/**
 * Isolated browser-session lifecycle and navigation actions backed by the
 * Telnyx Go CLI v0.35.0. Only the currently supported navigate action is
 * exposed; arbitrary generated action fields are intentionally not forwarded.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

const MINIMUM_CLI_VERSION = "0.35.0";
const CLI_OPTIONS = { minimumVersion: MINIMUM_CLI_VERSION } as const;
const SESSION_STATUSES = new Set(["provisioning", "ready", "closing", "closed", "failed", "expired"]);
const WAIT_UNTIL_VALUES = new Set(["load", "dom_stable", "none"]);

export async function createBrowserSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const domains = parseAllowedDomains(flags, jsonOutput);
  const args = ["browser-sessions", "create", "--policy.allowed-domains", JSON.stringify(domains)];
  addOptionalString(args, flags, "idempotency-key", jsonOutput);
  addLimit(args, flags, "idle-timeout-seconds", "--limits.idle-timeout-s", 1, 1800, jsonOutput);
  addLimit(args, flags, "lifetime-seconds", "--limits.lifetime-s", 60, 1800, jsonOutput);
  validateTimeoutRelation(flags, jsonOutput);
  addJsonObject(args, flags, "metadata", jsonOutput);

  try {
    const response = await browserCli(args);
    presentSession("Browser session created!", normalizeSession(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getBrowserSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "browser session ID", jsonOutput);
  try {
    const response = await browserCli(["browser-sessions", "retrieve", "--id", id]);
    presentSession("Browser session retrieved!", normalizeSession(response, id), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listBrowserSessionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["browser-sessions", "list"];
  const status = optionalString(flags, "status", jsonOutput);
  if (status !== undefined) {
    if (!SESSION_STATUSES.has(status)) {
      fail(`--status must be one of: ${[...SESSION_STATUSES].join(", ")}`, jsonOutput);
    }
    args.push("--status", status);
  }

  try {
    const response = await browserCli(args, "raw");
    const envelope = asRecord(response);
    const sessions = records(Array.isArray(response) ? response : envelope.data);
    const result = { count: sessions.length, browser_sessions: sessions, meta: asRecord(envelope.meta) };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("Browser sessions retrieved!", { Count: result.count });
      for (const session of sessions) {
        console.log(`  • ${stringValue(session.id) || "(unknown)"} — ${stringValue(session.status) || "unknown"}`);
      }
      if (sessions.length === 0) console.log("  (no browser sessions returned)");
      console.log();
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function closeBrowserSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "browser session ID", jsonOutput);
  if (flags.confirm !== true) {
    fail("--confirm is required to close a browser session", jsonOutput);
  }

  try {
    const response = await browserCli(["browser-sessions", "delete", "--id", id]);
    const browserSession = responseData(response);
    const result = {
      browser_session_id: stringValue(browserSession.id) || id,
      closed: true as const,
      browser_session: browserSession,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("Browser session closed!", { "Browser Session ID": result.browser_session_id });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function navigateBrowserSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "browser session ID", jsonOutput);
  const url = requiredString(flags, "url", "navigation URL", jsonOutput);
  validateHttpUrl(url, jsonOutput);
  const args = ["browser-sessions:actions", "create", "--id", id, "--type", "navigate", "--url", url];
  addNonNegativeInteger(args, flags, "wait-seconds", jsonOutput);
  addOptionalString(args, flags, "idempotency-key", jsonOutput);
  addBoolean(args, flags, "include-observation", jsonOutput);
  const waitUntil = optionalString(flags, "wait-until", jsonOutput);
  if (waitUntil !== undefined) {
    if (!WAIT_UNTIL_VALUES.has(waitUntil)) {
      fail("--wait-until must be load, dom_stable, or none", jsonOutput);
    }
    args.push("--wait-until", waitUntil);
  }

  try {
    const response = await browserCli(args);
    const action = responseData(response);
    const result = {
      browser_session_id: id,
      browser_session_action_id: stringValue(action.id),
      browser_session_action: action,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("Browser navigation requested!", {
      "Browser Session ID": id,
      "Action ID": result.browser_session_action_id || "(not returned)",
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getBrowserSessionActionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "browser session ID", jsonOutput);
  const actionId = requiredString(flags, "action-id", "browser session action ID", jsonOutput);
  try {
    const response = await browserCli([
      "browser-sessions:actions", "retrieve", "--id", id, "--action-id", actionId,
    ]);
    const action = responseData(response);
    const result = {
      browser_session_id: id,
      browser_session_action_id: stringValue(action.id) || actionId,
      browser_session_action: action,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("Browser session action retrieved!", {
      "Browser Session ID": id,
      "Action ID": result.browser_session_action_id,
      Status: stringValue(action.status) || "(not returned)",
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getBrowserSessionArtifactCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "browser session ID", jsonOutput);
  const artifactId = requiredString(flags, "artifact-id", "browser session artifact ID", jsonOutput);
  try {
    const response = await browserCli([
      "browser-sessions", "retrieve-artifact", "--id", id, "--artifact-id", artifactId,
    ]);
    const artifact = responseData(response);
    const result = {
      browser_session_id: id,
      artifact_id: stringValue(artifact.id) || artifactId,
      artifact,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("Browser session artifact metadata retrieved!", {
      "Browser Session ID": id,
      "Artifact ID": result.artifact_id,
      Type: stringValue(artifact.type) || "(not returned)",
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function browserCli(args: string[], format: "json" | "raw" = "json"): Promise<unknown> {
  return telnyxCli(args, { ...CLI_OPTIONS, format });
}

function parseAllowedDomains(flags: Flags, jsonOutput: boolean): string[] {
  const value = requiredString(flags, "allowed-domains", "comma-separated allowed domain patterns", jsonOutput);
  const domains = value.split(",").map((domain) => domain.trim()).filter(Boolean);
  if (domains.length === 0 || domains.some((domain) => !isAllowedDomain(domain))) {
    fail("--allowed-domains must contain exact domains or *.subdomain wildcards; IP literals are not allowed", jsonOutput);
  }
  return domains;
}

function isAllowedDomain(value: string): boolean {
  const domain = value.startsWith("*.") ? value.slice(2) : value;
  if (!domain || domain.includes("*") || domain.includes(":")) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return false;
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(domain);
}

function validateTimeoutRelation(flags: Flags, jsonOutput: boolean): void {
  const idle = numericFlag(flags, "idle-timeout-seconds", jsonOutput);
  const lifetime = numericFlag(flags, "lifetime-seconds", jsonOutput);
  if (idle !== undefined && lifetime !== undefined && idle > lifetime) {
    fail("--idle-timeout-seconds must not exceed --lifetime-seconds", jsonOutput);
  }
}

function addLimit(
  args: string[], flags: Flags, name: string, target: string, minimum: number, maximum: number, jsonOutput: boolean,
): void {
  const value = numericFlag(flags, name, jsonOutput);
  if (value === undefined) return;
  if (value < minimum || value > maximum) {
    fail(`--${name} must be an integer between ${minimum} and ${maximum}`, jsonOutput);
  }
  args.push(target, String(value));
}

function addNonNegativeInteger(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = numericFlag(flags, name, jsonOutput);
  if (value === undefined) return;
  args.push(`--${name}`, String(value));
}

function numericFlag(flags: Flags, name: string, jsonOutput: boolean): number | undefined {
  const raw = flags[name];
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    fail(`--${name} must be a non-negative safe integer`, jsonOutput);
  }
  return Number(raw);
}

function addOptionalString(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = optionalString(flags, name, jsonOutput);
  if (value !== undefined) args.push(`--${name}`, value);
}

function addJsonObject(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = optionalString(flags, name, jsonOutput);
  if (value === undefined) return;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    fail(`--${name} must be a JSON object`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function addBoolean(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (value === true || value === "true") args.push(`--${name}=true`);
  else if (value === false || value === "false") args.push(`--${name}=false`);
  else fail(`--${name} must be true or false`, jsonOutput);
}

function validateHttpUrl(value: string, jsonOutput: boolean): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    fail("--url must be an absolute http(s) URL", jsonOutput);
  }
}

function normalizeSession(response: unknown, fallbackId = ""): { browser_session_id: string; browser_session: JsonRecord } {
  const browserSession = responseData(response);
  return { browser_session_id: stringValue(browserSession.id) || fallbackId, browser_session: browserSession };
}

function presentSession(
  title: string,
  result: { browser_session_id: string; browser_session: JsonRecord },
  jsonOutput: boolean,
): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Browser Session ID": result.browser_session_id || "(not returned)",
    Status: stringValue(result.browser_session.status) || "(not returned)",
  });
}

function responseData(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function optionalString(flags: Flags, name: string, jsonOutput: boolean): string | undefined {
  const value = flags[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) fail(`--${name} requires a value`, jsonOutput);
  return value;
}

function requiredString(flags: Flags, name: string, label: string, jsonOutput: boolean): string {
  const value = optionalString(flags, name, jsonOutput);
  if (!value) fail(`--${name} is required (${label})`, jsonOutput);
  return value;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
