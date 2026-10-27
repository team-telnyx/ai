/**
 * telnyx-agent setup-ai — Zero to AI assistant on a phone number.
 *
 * Steps:
 * 1. Create an AI assistant (via telnyx CLI)
 * 2. Search for a phone number (via telnyx CLI)
 * 3. Buy the number (via telnyx CLI)
 * 4. Wire assistant to the number (direct API — TeXML app creation has no CLI equivalent)
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber, NumberOrderedButUnresolvedError } from "../utils/number-order.ts";

interface SetupAiResult {
  assistant_id: string;
  assistant_name: string;
  phone_number: string;
  phone_number_id: string;
  test_command: string;
  texml_app_id: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupAiCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const instructions = (flags.instructions as string) || "You are a helpful assistant.";
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  let assistantName = (flags.name as string) || `Agent AI Assistant - ${ts}`;
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let assistantId = "";
  let phoneNumber = "";
  let phoneNumberId = "";
  let texmlAppId = "";
  let orderId = "";

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up AI Assistant...\n");

    // Resolve every supplied resource before creating or purchasing anything.
    const existingAssistant = optionalId(flags, "assistant-id");
    const existingNumber = optionalId(flags, "phone-number-id");
    const existingApp = optionalId(flags, "texml-app-id");
    if (existingApp && (!existingAssistant || !existingNumber)) {
      throw new Error("--texml-app-id requires --assistant-id and --phone-number-id");
    }
    if (existingAssistant && (flags.name !== undefined || flags.instructions !== undefined)) {
      throw new Error("Do not pass --name or --instructions when reusing --assistant-id; update the assistant separately");
    }
    if (existingAssistant) {
      const data = resource(await telnyxCli(["ai:assistants", "retrieve", "--assistant-id", existingAssistant]));
      assistantId = requiredValue(data.id, "assistant ID");
      if (assistantId !== existingAssistant) throw new Error("Retrieved assistant ID does not match --assistant-id");
      assistantName = typeof data.name === "string" ? data.name : assistantId;
    }
    if (existingApp) {
      const data = resource(await client.get(`/texml_applications/${encodeURIComponent(existingApp)}`));
      if (data.ai_assistant_id !== assistantId || data.active !== true) {
        throw new Error("TeXML application must be active and linked to the supplied assistant");
      }
      texmlAppId = requiredValue(data.id, "TeXML application ID");
      if (texmlAppId !== existingApp) throw new Error("Retrieved TeXML application ID does not match --texml-app-id");
    }
    if (existingNumber) {
      const data = resource(await telnyxCli(["phone-numbers", "retrieve", "--id", existingNumber]));
      phoneNumberId = requiredValue(data.id, "phone number ID");
      phoneNumber = requiredValue(data.phone_number, "phone number");
      if (existingNumber !== phoneNumberId && existingNumber !== phoneNumber) {
        throw new Error("Retrieved phone number does not match --phone-number-id");
      }
      const country = data.country_iso_alpha2 ?? data.country_code ?? data.country;
      if (flags.country && (typeof country !== "string" || country.toUpperCase() !== String(flags.country).toUpperCase())) {
        throw new Error("Existing number does not match the requested country");
      }
      if (data.connection_id && data.connection_id !== texmlAppId) {
        throw new Error("Existing number is assigned to another connection; refusing to rewire it");
      }
    }

    // Step 1: Create or reuse AI assistant via CLI
    const assistantStep = existingAssistant ? "Reuse AI assistant" : "Create AI assistant";
    const step1Start = Date.now();
    try {
      if (!assistantId) {
        const assistantRes = await telnyxCli([
          "ai:assistants", "create",
          "--name", assistantName,
          "--instructions", instructions,
          "--model", "Qwen/Qwen3-235B-A22B",
        ]);
        assistantId = requiredValue(resource(assistantRes).id, "assistant ID");
      }
      steps.push({ step: 1, name: assistantStep, status: "completed", resourceId: assistantId, detail: assistantName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: assistantStep, status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Steps 2+3: Search and buy number via CLI (handles 409 retries automatically)
    const step2Start = Date.now();
    try {
      if (!phoneNumberId) {
        const result = await searchAndBuyNumber(country, {
          features: "voice",
          type: "local",
        });
        orderId = result.orderId;
        phoneNumber = requiredValue(result.phoneNumber, "phone number");
        phoneNumberId = requiredValue(result.phoneNumberId, "phone number ID");
      }
      steps.push({ step: 2, name: existingNumber ? "Retrieve existing number" : "Search for number", status: "completed", detail: phoneNumber, elapsedMs: Date.now() - step2Start });
      steps.push({ step: 3, name: existingNumber ? "Reuse number" : "Buy number", status: "completed", resourceId: phoneNumberId, detail: phoneNumber, elapsedMs: 0 });
    } catch (err) {
      steps.push({ step: 2, name: "Search & buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) {
      printStep(steps[steps.length - 2], totalSteps);
      printStep(steps[steps.length - 1], totalSteps);
    }

    // Step 4: Wire assistant to the number (direct API — no CLI equivalent for TeXML apps)
    const step4Start = Date.now();
    try {
      // Create a TeXML app that routes to the AI assistant
      if (!texmlAppId) {
        const texmlRes = await client.post("/texml_applications", {
          friendly_name: `AI - ${ts}`,
          active: true,
          ai_assistant_id: assistantId,
          voice_url: `https://api.telnyx.com/v2/ai/assistants/${assistantId}/call`,
          voice_method: "POST",
        });
        texmlAppId = requiredValue(resource(texmlRes).id, "TeXML application ID");
      }

      // Use the REST assignment contract, as setup-voice/setup-sms do.
      const assigned = resource(await client.patch(`/phone_numbers/${encodeURIComponent(phoneNumberId)}`, {
        connection_id: texmlAppId,
      }));
      if (assigned.connection_id !== texmlAppId) {
        throw new Error("Number assignment was not confirmed; inspect the number before retrying");
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
    if (err instanceof NumberOrderedButUnresolvedError) {
      phoneNumber = err.phoneNumber;
      orderId = err.orderId;
    }
    const result = {
      status: "failed",
      assistant_id: assistantId || null,
      phone_number: phoneNumber || null,
      phone_number_id: phoneNumberId || null,
      texml_app_id: texmlAppId || null,
      number_order_id: orderId || null,
      recovery: "Keep these resource IDs. Reconcile any timed-out create/order before retrying. Reuse known resources with --assistant-id, --phone-number-id (ID or E.164), and --texml-app-id; omitted resources will be created. A fresh invocation is not idempotent.",
      ready: false,
      steps,
      error: errorMsg(err),
      elapsed_ms: Date.now() - startTime,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printError(errorMsg(err));
      console.log(`  Resources: ${JSON.stringify({ assistant_id: assistantId || null, phone_number: phoneNumber || null, phone_number_id: phoneNumberId || null, texml_app_id: texmlAppId || null, number_order_id: orderId || null })}`);
      console.log(`  Recovery: ${result.recovery}`);
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

function optionalId(flags: Record<string, string | boolean>, name: string): string {
  if (flags[name] === undefined) return "";
  return requiredValue(flags[name], `--${name}`);
}

function requiredValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value === "undefined" || value === "null") {
    throw new Error(`Missing or invalid ${label}`);
  }
  return value;
}

function resource(response: Record<string, unknown>): Record<string, unknown> {
  const data = response.data ?? response;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid resource response");
  return data as Record<string, unknown>;
}
