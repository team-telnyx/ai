/**
 * telnyx-agent setup-ai — Zero to AI assistant on a phone number.
 *
 * Steps:
 * 1. Create an AI assistant
 * 2. Search for a phone number
 * 3. Buy the number
 * 4. Wire assistant to the number
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";

interface SetupAiResult {
  assistant_id: string;
  assistant_name: string;
  phone_number: string;
  phone_number_id: string;
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
  let phoneNumber = "";
  let phoneNumberId = "";

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up AI Assistant...\n");

    // Step 1: Create AI assistant
    const step1Start = Date.now();
    try {
      const assistantRes = await client.post("/ai/assistants", {
        name: assistantName,
        instructions,
        model: "Qwen/Qwen3-235B-A22B",
      });
      // AI assistants API returns data at the top level (not nested under .data)
      const assistantData = (assistantRes.data ?? assistantRes) as Record<string, unknown>;
      assistantId = String(assistantData.id);
      steps.push({ step: 1, name: "Create AI assistant", status: "completed", resourceId: assistantId, detail: assistantName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create AI assistant", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Steps 2+3: Search and buy number (handles 409 retries automatically)
    const step2Start = Date.now();
    try {
      const result = await searchAndBuyNumber(
        client,
        { "filter[country_code]": country, "filter[features][]": "voice", "filter[phone_number_type]": "local" },
      );
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
    // Create a TeXML application for the assistant and assign it to the phone number
    const step4Start = Date.now();
    try {
      // Create a TeXML app that routes to the AI assistant
      const texmlRes = await client.post("/texml_applications", {
        friendly_name: `AI - ${ts}`,
        active: true,
        ai_assistant_id: assistantId,
        voice_url: `https://api.telnyx.com/v2/ai/assistants/${assistantId}/call`,
        voice_method: "POST",
      });
      const texmlData = texmlRes.data as Record<string, unknown>;
      const texmlAppId = String(texmlData.id ?? "");

      // Assign the TeXML app to the phone number via voice settings
      if (phoneNumberId && texmlAppId) {
        await client.patch(`/phone_numbers/${phoneNumberId}/voice`, {
          connection_id: texmlAppId,
        });
      }
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
  if (err instanceof Error) return err.message;
  return String(err);
}
