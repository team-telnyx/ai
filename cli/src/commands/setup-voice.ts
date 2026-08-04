/**
 * telnyx-agent setup-voice — Zero to making/receiving calls in one command.
 *
 * Steps:
 * 1. Resolve outbound voice profile (GET /outbound_voice_profiles, or use --outbound-voice-profile-id)
 * 2. Create a Call Control Application (POST /call_control_applications with webhook + outbound profile)
 * 3. Search for a phone number with voice capability (via telnyx CLI)
 * 4. Buy the number (via telnyx CLI)
 * 5. Assign number to the Call Control App (PATCH /phone_numbers/:id)
 *
 * AIF-328: Previously created a credential connection which call-dial cannot
 * use. call-dial requires a Call Control Application with a valid webhook URL.
 *
 * E2E follow-up (orphan handling): setup-voice now mirrors setup-sms —
 * (a) if the number search/buy/assign fails after the app is created, the app
 *     created THIS run is rolled back so failed retries don't pile up orphaned
 *     Call Control Apps; and
 * (b) on reuse, if a prefix-matched app exists but has NO assigned number (a
 *     bare orphan), we ADOPT it and just buy+assign a number, instead of
 *     creating yet another app every run.
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";
import { findReusablePair, findExistingByPrefix, AGENT_VOICE_APP_PREFIX } from "../utils/idempotency.ts";

interface SetupVoiceResult {
  connection_id: string;
  connection_name: string;
  phone_number: string;
  phone_number_id: string;
  webhook_url: string;
  outbound_voice_profile_id: string;
  ready: boolean;
  reused: boolean;
  webhook_not_applied?: boolean;
  steps: StepResult[];
}

export async function setupVoiceCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const webhookExplicit = !!((flags["webhook-url"] as string) || (flags.webhook as string));
  const webhookUrl = (flags["webhook-url"] as string) || (flags.webhook as string) || "https://example.com/webhook";
  const outboundProfileIdFlag = (flags["outbound-voice-profile-id"] as string) || "";
  // AIF-336: reuse a previously agent-created Call Control App + number by
  // default so re-runs don't silently buy another ~$1/mo number. Pass --force
  // to always provision a fresh app and number.
  const force = flags.force === true;
  const totalSteps = 5;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let connectionId = "";
  let connectionName = "";
  let phoneNumber = "";
  let phoneNumberId = "";
  let outboundProfileId = "";
  let reused = false;
  // Track a Call Control App we CREATE this run (not one we adopt) so we can
  // roll it back if a later step fails and leaves it with no number.
  let createdAppId = "";
  // True when we adopt a pre-existing bare (number-less) prefix-matched app
  // instead of creating a new one.
  let adoptedApp = false;

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up Voice...\n");

    // AIF-336: idempotency — reuse an existing agent-created Call Control App +
    // assigned number unless --force was passed.
    if (!force) {
      const existing = await findReusablePair(
        client,
        "/call_control_applications",
        "application_name",
        AGENT_VOICE_APP_PREFIX,
        "connection_id",
      );
      if (existing) {
        connectionId = existing.resource.id;
        connectionName = existing.resource.name;
        phoneNumber = existing.phoneNumber;
        phoneNumberId = existing.phoneNumberId;
        reused = true;
        // Surface the reused app's REAL outbound profile id and REAL webhook
        // instead of ""/the default placeholder. Best-effort — never block reuse
        // on this lookup.
        let existingWebhookUrl = "";
        try {
          const appRes = await client.get(`/call_control_applications/${connectionId}`);
          const appData = (appRes.data ?? appRes) as Record<string, unknown>;
          const outbound = (appData.outbound ?? {}) as Record<string, unknown>;
          outboundProfileId = String(outbound.outbound_voice_profile_id ?? "");
          existingWebhookUrl = String(appData.webhook_event_url ?? "");
        } catch { /* leave outboundProfileId / existingWebhookUrl as-is */ }
        // When reusing, the existing app keeps its OWN webhook — a --webhook
        // passed on this run is NOT applied. Report honestly instead of echoing
        // a webhook we didn't set, and tell the user how to apply a new one.
        steps.push({ step: 1, name: "Reuse existing Call Control App + number", status: "completed", resourceId: connectionId, detail: `${connectionName} → ${phoneNumber}`, elapsedMs: 0 });

        const result: SetupVoiceResult = {
          connection_id: connectionId,
          connection_name: connectionName,
          phone_number: phoneNumber,
          phone_number_id: phoneNumberId,
          // Report the reused app's ACTUAL configured webhook, not the requested
          // one or the default placeholder. Fall back to a clear note if the
          // app lookup didn't return a webhook.
          webhook_url: existingWebhookUrl || "(existing app's webhook — unchanged)",
          outbound_voice_profile_id: outboundProfileId,
          ready: true,
          reused: true,
          ...(webhookExplicit ? { webhook_not_applied: true } : {}),
          steps,
        };
        if (jsonOutput) {
          outputJson(result);
        } else {
          printStep(steps[0], totalSteps);
          printSuccess("Voice already set up — reusing existing resources", {
            "Connection ID": connectionId,
            "App Name": connectionName,
            "Phone Number": phoneNumber,
            Ready: "✓",
            "Reused": "✓ (pass --force to provision a new app + number)",
          });
          if (webhookExplicit) {
            console.log("  ⚠ Your --webhook was NOT applied — the reused app keeps its existing webhook. Use --force to create a new app with your webhook.");
          }
          console.log("  💡 Use the Connection ID above with: telnyx-agent call-dial --connection-id " + connectionId + " ...\n");
        }
        return;
      }

      // No fully-reusable pair. Before provisioning a brand-new app, check for a
      // BARE prefix-matched app (created by an earlier failed run: app exists
      // but never got a number). Adopt it and just buy+assign a number, so
      // repeated failures don't spawn a new app every time.
      const bareApp = await findExistingByPrefix(
        client,
        "/call_control_applications",
        "application_name",
        AGENT_VOICE_APP_PREFIX,
      );
      if (bareApp) {
        connectionId = bareApp.id;
        connectionName = bareApp.name;
        adoptedApp = true;
        // Resolve the adopted app's outbound profile for the final output.
        try {
          const appRes = await client.get(`/call_control_applications/${connectionId}`);
          const appData = (appRes.data ?? appRes) as Record<string, unknown>;
          const outbound = (appData.outbound ?? {}) as Record<string, unknown>;
          outboundProfileId = String(outbound.outbound_voice_profile_id ?? "");
        } catch { /* resolved below if still empty */ }
        steps.push({ step: 1, name: "Adopt existing bare Call Control App", status: "completed", resourceId: connectionId, detail: connectionName, elapsedMs: 0 });
        if (!jsonOutput) {
          printStep(steps[steps.length - 1], totalSteps);
          console.log("  ↩ Adopting an existing app with no number (from an earlier incomplete run) instead of creating a new one.\n");
        }
      }
    } else if (!jsonOutput) {
      console.log("  ⚠ --force: provisioning a NEW Call Control App + number (this buys a ~$1/mo number).\n");
    }

    // Step 1: Resolve outbound voice profile. When we adopted a bare app that
    // already carries an outbound profile, keep it; otherwise resolve one.
    const step1Start = Date.now();
    try {
      if (outboundProfileIdFlag) {
        outboundProfileId = outboundProfileIdFlag;
      } else if (!(adoptedApp && outboundProfileId)) {
        // Fetch the first available outbound voice profile
        const profilesRes = await client.get("/outbound_voice_profiles");
        const profilesData = profilesRes.data as Record<string, unknown>[];
        if (!profilesData || profilesData.length === 0) {
          throw new Error("No outbound voice profiles found. Create one in the Telnyx portal or pass --outbound-voice-profile-id.");
        }
        outboundProfileId = String(profilesData[0].id);
      }
      steps.push({ step: 1, name: "Resolve outbound voice profile", status: "completed", resourceId: outboundProfileId, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Resolve outbound voice profile", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 2: Create Call Control Application — skipped when adopting a bare app.
    const step2Start = Date.now();
    if (adoptedApp) {
      steps.push({ step: 2, name: "Reuse adopted Call Control App", status: "completed", resourceId: connectionId, detail: connectionName, elapsedMs: 0 });
      if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
    } else {
      try {
        const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
        connectionName = `${AGENT_VOICE_APP_PREFIX}${ts}`;
        const appBody: Record<string, unknown> = {
          application_name: connectionName,
          webhook_event_url: webhookUrl,
          outbound: {
            outbound_voice_profile_id: outboundProfileId,
          },
        };
        const appRes = await client.post("/call_control_applications", appBody);
        const appData = appRes.data as Record<string, unknown>;
        connectionId = String(appData.id);
        createdAppId = connectionId;
        steps.push({ step: 2, name: "Create Call Control Application", status: "completed", resourceId: connectionId, detail: connectionName, elapsedMs: Date.now() - step2Start });
      } catch (err) {
        steps.push({ step: 2, name: "Create Call Control Application", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
        throw err;
      }
      if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
    }

    // Steps 3+4: Search and buy number via CLI
    const step3Start = Date.now();
    try {
      const result = await searchAndBuyNumber(country, {
        features: "voice",
        type: "local",
        connectionId: connectionId,
      });
      phoneNumber = result.phoneNumber;
      phoneNumberId = result.phoneNumberId;
      steps.push({ step: 3, name: "Search for number", status: "completed", detail: phoneNumber, elapsedMs: Date.now() - step3Start });
      steps.push({ step: 4, name: "Buy number", status: "completed", resourceId: phoneNumberId, detail: phoneNumber, elapsedMs: 0 });
    } catch (err) {
      steps.push({ step: 3, name: "Search & buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step3Start });
      throw err;
    }
    if (!jsonOutput) {
      printStep(steps[steps.length - 2], totalSteps);
      printStep(steps[steps.length - 1], totalSteps);
    }

    // Step 5: Assign number to Call Control Application
    const step5Start = Date.now();
    try {
      if (phoneNumberId) {
        await client.patch(`/phone_numbers/${phoneNumberId}`, {
          connection_id: connectionId,
        });
      }
      steps.push({ step: 5, name: "Assign number to Call Control App", status: "completed", elapsedMs: Date.now() - step5Start });
    } catch (err) {
      steps.push({ step: 5, name: "Assign number to Call Control App", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step5Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const result: SetupVoiceResult = {
      connection_id: connectionId,
      connection_name: connectionName,
      phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
      webhook_url: webhookUrl,
      outbound_voice_profile_id: outboundProfileId,
      ready: true,
      // Adopting a bare app is a partial reuse (existing app + new number).
      reused: adoptedApp,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Voice setup complete!", {
        "Connection ID": connectionId,
        "App Name": connectionName,
        "Phone Number": phoneNumber,
        "Webhook URL": webhookUrl,
        "Outbound Profile": outboundProfileId,
        Ready: "✓",
      });
      console.log("  💡 Use the Connection ID above with: telnyx-agent call-dial --connection-id " + connectionId + " ...\n");
    }
  } catch (err) {
    // Mirror setup-sms: if we CREATED a Call Control App this run but never got a
    // number assigned to it, roll it back so failed retries don't leave orphaned
    // apps. Only clean up an app we created here (not an adopted/reused one) and
    // only when it has no number (phoneNumberId unset).
    let cleanup: "deleted" | "kept" | "failed" | undefined;
    if (createdAppId && !phoneNumberId) {
      try {
        await client.delete(`/call_control_applications/${createdAppId}`);
        cleanup = "deleted";
      } catch {
        cleanup = "failed";
      }
    } else if (createdAppId && phoneNumberId) {
      cleanup = "kept";
    }

    const result = {
      status: "failed",
      connection_id: connectionId || null,
      phone_number: phoneNumber || null,
      ready: false,
      steps,
      ...(cleanup ? { orphan_cleanup: cleanup } : {}),
      error: errorMsg(err),
      elapsed_ms: Date.now() - startTime,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printError(errorMsg(err));
      console.log("  Steps completed before failure:");
      for (const s of steps) printStep(s, totalSteps);
      if (cleanup === "deleted") console.log("  ↩ Rolled back the Call Control App created this run (no orphan left).");
      else if (cleanup === "failed") console.log(`  ⚠ Could not roll back Call Control App ${createdAppId} — delete it manually.`);
      console.log();
    }
    process.exit(1);
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxAPIError) return `${err.detail} (HTTP ${err.statusCode})`;
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
