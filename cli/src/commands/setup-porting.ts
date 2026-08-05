/**
 * telnyx-agent setup-porting — Zero to porting phone numbers in one command.
 *
 * Steps:
 * 1. Check portability of phone numbers (via API)
 * 2. Create a porting order (via API)
 * 3. List requirements for the order (via API)
 * 4. Submit the porting order (via API, optional with --submit flag)
 */

import { TelnyxClient } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";

interface SetupPortingResult {
  porting_order_id: string;
  phone_numbers: string[];
  portable: boolean[];
  status: string;
  requirements: Record<string, unknown>[];
  submitted: boolean;
  steps: StepResult[];
}

export async function setupPortingCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const phoneNumbersRaw = flags["phone-numbers"] as string || flags.numbers as string || "";
  const customerName = flags["customer-name"] as string || "";
  const authorizedPerson = flags["authorized-person"] as string || "";
  const billingPhone = flags["billing-phone"] as string || "";
  const oldProvider = flags["old-provider"] as string || "";
  const doSubmit = flags.submit === true;
  const totalSteps = doSubmit ? 4 : 3;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let portingOrderId = "";
  let portableFlags: boolean[] = [];
  let requirements: Record<string, unknown>[] = [];
  let submitted = false;

  try {
    if (flags.submit !== undefined && flags.submit !== true) {
      throw new Error("--submit does not accept a value; pass bare --submit to submit the order");
    }
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) throw new Error("TELNYX_API_KEY environment variable is required");
    const client = new TelnyxClient(apiKey);

    // Parse phone numbers (comma-separated)
    const phoneNumbers = phoneNumbersRaw
      .split(",")
      .map((n: string) => n.trim())
      .filter(Boolean);

    if (phoneNumbers.length === 0) {
      throw new Error("--phone-numbers is required (comma-separated list of E.164 numbers)");
    }

    if (!jsonOutput) console.log("\n🚀 Setting up porting...\n");

    // Step 1: Check portability
    const step1Start = Date.now();
    try {
      const portRes = await client.post("/portability_checks", {
        phone_numbers: phoneNumbers,
      });
      const portData = (portRes.data ?? portRes) as Record<string, unknown>;
      const results = (portData.results ?? portData) as Array<Record<string, unknown>>;
      portableFlags = results.map((r: Record<string, unknown>) => r.portable === true || r.portable === "true");
      const notPortable = phoneNumbers.filter((_: string, i: number) => !portableFlags[i]);

      steps.push({
        step: 1,
        name: "Check portability",
        status: notPortable.length > 0 ? "completed" : "completed",
        detail: notPortable.length > 0
          ? `${phoneNumbers.length - notPortable.length}/${phoneNumbers.length} portable (${notPortable.join(", ")} not portable)`
          : `All ${phoneNumbers.length} numbers portable`,
        elapsedMs: Date.now() - step1Start,
      });
    } catch (err) {
      steps.push({ step: 1, name: "Check portability", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 2: Create porting order
    const step2Start = Date.now();
    try {
      const orderPayload: Record<string, unknown> = {
        phone_numbers: phoneNumbers,
      };
      if (customerName) orderPayload.customer_name = customerName;
      if (authorizedPerson) orderPayload.authorized_person = authorizedPerson;
      if (billingPhone) orderPayload.billing_phone_number = billingPhone;
      if (oldProvider) orderPayload.old_service_provider = oldProvider;

      const orderRes = await client.post("/porting_orders", orderPayload);
      const orderData = (orderRes.data ?? orderRes) as Record<string, unknown>;
      portingOrderId = String(orderData.id);
      const orderStatus = String(orderData.status ?? "draft");

      steps.push({
        step: 2,
        name: "Create porting order",
        status: "completed",
        resourceId: portingOrderId,
        detail: `Status: ${orderStatus}`,
        elapsedMs: Date.now() - step2Start,
      });
    } catch (err) {
      steps.push({ step: 2, name: "Create porting order", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 3: List requirements
    const step3Start = Date.now();
    try {
      const reqRes = await client.get(`/porting_orders/${portingOrderId}/requirements`);
      const reqData = (reqRes.data ?? reqRes) as Record<string, unknown>;
      requirements = (reqData.requirements ?? reqData) as Record<string, unknown>[];
      const reqCount = Array.isArray(requirements) ? requirements.length : Object.keys(requirements).length;

      steps.push({
        step: 3,
        name: "List requirements",
        status: "completed",
        detail: `${reqCount} requirement(s) found`,
        elapsedMs: Date.now() - step3Start,
      });
    } catch (err) {
      // Requirements may not be available for all order types — non-fatal
      steps.push({
        step: 3,
        name: "List requirements",
        status: "completed",
        detail: "Could not fetch requirements (may not be available yet)",
        elapsedMs: Date.now() - step3Start,
      });
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 4: Submit (optional, only with --submit)
    if (doSubmit && portingOrderId) {
      const step4Start = Date.now();
      try {
        await client.post(`/porting_orders/${portingOrderId}/actions/confirm`, {});
        submitted = true;
        steps.push({
          step: 4,
          name: "Submit porting order",
          status: "completed",
          detail: "Order submitted for processing",
          elapsedMs: Date.now() - step4Start,
        });
      } catch (err) {
        steps.push({
          step: 4,
          name: "Submit porting order",
          status: "failed",
          detail: errorMsg(err),
          elapsedMs: Date.now() - step4Start,
        });
        if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
        // Re-throw so the command exits with failure when submission fails
        throw err;
      }
      if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
    }

    const result: SetupPortingResult = {
      porting_order_id: portingOrderId,
      phone_numbers: phoneNumbers,
      portable: portableFlags,
      status: submitted ? "submitted" : "draft",
      requirements,
      submitted,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(submitted ? "Porting order submitted!" : "Porting order created!", {
        "Order ID": portingOrderId,
        "Phone Numbers": phoneNumbers.join(", "),
        "Portable": portableFlags.every(Boolean) ? "✓ All" : portableFlags.map((p, i) => `${phoneNumbers[i]}: ${p ? "✓" : "✗"}`).join(", "),
        Status: submitted ? "Submitted" : "Draft",
        "Next Step": submitted
          ? "Monitor status with: telnyx-agent status"
          : "Submit with: telnyx-agent setup-porting --phone-numbers ... --submit",
      });
    }
  } catch (err) {
    const result = {
      status: "failed",
      porting_order_id: portingOrderId || null,
      submitted: false,
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
  if (err instanceof Error) return err.message;
  return String(err);
}
