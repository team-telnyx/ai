/**
 * telnyx-agent setup-ai — Zero to AI assistant on a phone number.
 *
 * Steps:
 * 1. Create an AI assistant (via telnyx CLI)
 * 2. Search for a phone number (via telnyx CLI)
 * 3. Buy the number (via telnyx CLI)
 * 4. Point the number at the assistant's own TeXML app (created with the assistant)
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";

interface SetupAiResult {
  assistant_id: string;
  assistant_name: string;
  phone_number: string;
  phone_number_id: string;
  texml_app_id: string;
  test_command: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupAiCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const instructions = (flags.instructions as string) || "You are a helpful assistant.";
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const assistantName = (flags.name as string) || `Agent AI Assistant - ${ts}`;
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let assistantId = "";
  let texmlAppId = "";
  let phoneNumber = "";
  let phoneNumberId = "";

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up AI Assistant...\n");

    // Step 1: Create AI assistant via CLI
    const step1Start = Date.now();
    try {
      const assistantRes = await telnyxCli([
        "ai:assistants", "create",
        "--name", assistantName,
        "--instructions", instructions,
        "--model", "Qwen/Qwen3-235B-A22B",
      ]);
      // AI assistants API returns data at the top level or nested under .data
      const assistantData = (assistantRes.data ?? assistantRes) as Record<string, unknown>;
      assistantId = String(assistantData.id);
      texmlAppId = defaultTexmlAppId(assistantData);
      steps.push({ step: 1, name: "Create AI assistant", status: "completed", resourceId: assistantId, detail: assistantName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create AI assistant", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Steps 2+3: Search and buy number via CLI (handles 409 retries automatically)
    const step2Start = Date.now();
    try {
      const result = await searchAndBuyNumber(country, {
        features: "voice",
        type: "local",
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

    // Step 4: Wire assistant to the number
    const step4Start = Date.now();
    try {
      // Telnyx creates a TeXML app with every assistant
      // (telephony_settings.default_texml_app_id); its voice_url serves the
      // assistant's TeXML. Read it back if the create response left it out.
      if (!texmlAppId) {
        const res = await client.get(`/ai/assistants/${encodeURIComponent(assistantId)}`);
        texmlAppId = defaultTexmlAppId((res.data ?? res) as Record<string, unknown>);
      }
      if (!texmlAppId) throw new Error(`Assistant ${assistantId} has no default TeXML app`);

      // Assign the number via REST, like setup-voice (AIF-329: the Go CLI's
      // `phone-numbers update` doesn't support --force)
      if (!phoneNumberId) throw new Error("No phone number ID to assign");
      await client.patch(`/phone_numbers/${phoneNumberId}`, { connection_id: texmlAppId });
      steps.push({ step: 4, name: "Wire assistant to number", status: "completed", detail: `TeXML app: ${texmlAppId}`, elapsedMs: Date.now() - step4Start });
    } catch (err) {
      steps.push({ step: 4, name: "Wire assistant to number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const testCmd = `Call ${phoneNumber} to talk to your AI assistant`;
    const result: SetupAiResult = {
      assistant_id: assistantId,
      assistant_name: assistantName,
      phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
      texml_app_id: texmlAppId,
      test_command: testCmd,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("AI Assistant setup complete!", {
        "Assistant ID": assistantId,
        "Assistant Name": assistantName,
        "Phone Number": phoneNumber,
        "Test": testCmd,
        Ready: "✓",
      });
    }
  } catch (err) {
    const result = {
      status: "failed",
      assistant_id: assistantId || null,
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

function defaultTexmlAppId(assistant: Record<string, unknown>): string {
  const telephony = assistant.telephony_settings as Record<string, unknown> | undefined;
  return telephony?.default_texml_app_id ? String(telephony.default_texml_app_id) : "";
}
