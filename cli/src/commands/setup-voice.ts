/**
 * telnyx-agent setup-voice — Zero to making/receiving calls in one command.
 *
 * Steps:
 * 1. Create a credential connection (direct API — CLI doesn't expose user_name/password for SIP creds)
 * 2. Search for a phone number with voice capability (via telnyx CLI)
 * 3. Buy the number (via telnyx CLI)
 * 4. Assign number to connection (via telnyx CLI)
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";

interface SetupVoiceResult {
  connection_id: string;
  connection_name: string;
  phone_number: string;
  phone_number_id: string;
  sip_username: string;
  sip_password: string;
  webhook_url: string | null;
  ready: boolean;
  steps: StepResult[];
}

export async function setupVoiceCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const webhookUrl = (flags.webhook as string) || null;
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let connectionId = "";
  let connectionName = "";
  let phoneNumber = "";
  let phoneNumberId = "";
  let sipUsername = "";
  let sipPassword = "";

  try {
    // Step 1: Create credential connection (direct API — need SIP username/password)
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    connectionName = `Agent Voice Connection - ${ts}`;
    if (!jsonOutput) console.log("\n🚀 Setting up Voice...\n");

    const step1Start = Date.now();
    try {
      // Generate SIP credentials — username must be alphanumeric only
      const generatedUser = "agent" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const generatedPass = "Ag" + Math.random().toString(36).slice(2, 10) + "1!";
      const connBody: Record<string, unknown> = {
        connection_name: connectionName,
        active: true,
        user_name: generatedUser,
        password: generatedPass,
      };
      if (webhookUrl) {
        connBody.webhook_event_url = webhookUrl;
      }
      const connRes = await client.post("/credential_connections", connBody);
      const connData = connRes.data as Record<string, unknown>;
      connectionId = String(connData.id);
      sipUsername = String(connData.user_name ?? generatedUser);
      sipPassword = String(connData.password ?? generatedPass);
      steps.push({ step: 1, name: "Create credential connection", status: "completed", resourceId: connectionId, detail: connectionName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create credential connection", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Steps 2+3: Search and buy number via CLI (handles 409 retries automatically)
    const step2Start = Date.now();
    try {
      const result = await searchAndBuyNumber(country, {
        features: "voice",
        type: "local",
        connectionId: connectionId,
      });
      phoneNumber = result.phoneNumber;
      phoneNumberId = result.phoneNumberId;
      steps.push({ step: 2, name: "Search for number", status: "completed", detail: phoneNumber, elapsedMs: Date.now() - step2Start });
      steps.push({ step: 3, name: "Buy number", status: "completed", resourceId: phoneNumberId, detail: phoneNumber, elapsedMs: 0 });
    } catch (err) {
      steps.push({ step: 2, name: "Search & buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) {
      printStep(steps[steps.length - 2], totalSteps);
      printStep(steps[steps.length - 1], totalSteps);
    }

    // Step 4: Assign number to connection via CLI
    const step4Start = Date.now();
    try {
      if (phoneNumber) {
        await telnyxCli([
          "phone-numbers", "update",
          "--phone-number-id", phoneNumber,
          "--connection-id", connectionId,
          "--force",
        ]);
      }
      steps.push({ step: 4, name: "Assign number to connection", status: "completed", elapsedMs: Date.now() - step4Start });
    } catch (err) {
      steps.push({ step: 4, name: "Assign number to connection", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const result: SetupVoiceResult = {
      connection_id: connectionId,
      connection_name: connectionName,
      phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
      sip_username: sipUsername,
      sip_password: sipPassword,
      webhook_url: webhookUrl,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Voice setup complete!", {
        "Connection ID": connectionId,
        "Connection Name": connectionName,
        "Phone Number": phoneNumber,
        "SIP Username": sipUsername || "(see portal)",
        "SIP Password": sipPassword || "(see portal)",
        "Webhook URL": webhookUrl || "(none)",
        Ready: "✓",
      });
      console.log("  ⚠️  Save your SIP credentials — they cannot be retrieved later.\n");
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
