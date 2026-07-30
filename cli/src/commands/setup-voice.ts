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
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";

interface SetupVoiceResult {
  connection_id: string;
  connection_name: string;
  phone_number: string;
  phone_number_id: string;
  webhook_url: string;
  outbound_voice_profile_id: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupVoiceCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const webhookUrl = (flags["webhook-url"] as string) || (flags.webhook as string) || "https://example.com/webhook";
  const outboundProfileIdFlag = (flags["outbound-voice-profile-id"] as string) || "";
  const totalSteps = 5;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let connectionId = "";
  let connectionName = "";
  let phoneNumber = "";
  let phoneNumberId = "";
  let outboundProfileId = "";

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up Voice...\n");

    // Step 1: Resolve outbound voice profile
    const step1Start = Date.now();
    try {
      if (outboundProfileIdFlag) {
        outboundProfileId = outboundProfileIdFlag;
      } else {
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

    // Step 2: Create Call Control Application
    const step2Start = Date.now();
    try {
      const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
      connectionName = `Agent Voice App - ${ts}`;
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
      steps.push({ step: 2, name: "Create Call Control Application", status: "completed", resourceId: connectionId, detail: connectionName, elapsedMs: Date.now() - step2Start });
    } catch (err) {
      steps.push({ step: 2, name: "Create Call Control Application", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

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
    const result = {
      status: "failed",
      connection_id: connectionId || null,
      phone_number: phoneNumber || null,
      ready: false,
      steps,
      error: errorMsg(err),
      elapsed_ms: Date.now() - startTime,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printError(errorMsg(err));
      console.log("  Steps completed before failure:");
      for (const s of steps) printStep(s, totalSteps);
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
