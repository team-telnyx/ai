/**
 * telnyx-agent setup-10dlc — Zero to compliant US A2P messaging in one command.
 *
 * Steps:
 * 1. Create a 10DLC brand (via telnyx CLI)
 * 2. Create a campaign (via telnyx CLI)
 * 3. Assign a phone number to the campaign (via telnyx CLI, optional)
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";

interface Setup10dlcResult {
  brand_id: string;
  brand_name: string;
  brand_status: string;
  campaign_id: string;
  campaign_status: string;
  usecase: string;
  assigned_number?: string;
  note: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setup10dlcCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const phone = flags.phone as string;
  const email = flags.email as string;

  if (!phone || !email) {
    printError("--phone and --email are required for 10DLC brand registration.");
    process.exit(1);
  }

  const phoneNumberId = (flags["phone-number-id"] as string) || "";
  const totalSteps = phoneNumberId ? 3 : 2;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let brandId = "";
  let brandName = "";
  let brandStatus = "";
  let campaignId = "";
  let campaignStatus = "";
  let assignedNumber: string | undefined;
  const usecase = (flags.usecase as string) || "CUSTOMER_CARE";

  try {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    brandName = (flags["brand-name"] as string) || `Agent Brand - ${ts}`;
    const vertical = (flags.vertical as string) || "TECHNOLOGY";
    if (!jsonOutput) console.log("\n🚀 Setting up 10DLC A2P Messaging...\n");

    // Step 1: Create 10DLC brand via CLI
    const step1Start = Date.now();
    try {
      const brandArgs = [
        "messaging-10dlc:brand", "create",
        "--display-name", brandName,
        "--email", email,
        "--vertical", vertical,
        "--phone", phone,
        "--sole-prop",
        "--country", "US",
      ];
      const brandRes = await telnyxCli(brandArgs);
      const brandData = brandRes.data as Record<string, unknown>;
      brandId = String(brandData.id);
      brandStatus = String(brandData.status ?? "PENDING");
      steps.push({ step: 1, name: "Create 10DLC brand", status: "completed", resourceId: brandId, detail: brandName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create 10DLC brand", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 2: Create campaign via CLI
    const description = (flags.description as string) || "Agent-provisioned campaign for customer communications";
    const sampleMessage = (flags["sample-message"] as string) || "Your verification code is {code}. Reply STOP to opt out.";
    const step2Start = Date.now();
    try {
      const campaignArgs = [
        "messaging-10dlc:campaign", "create",
        "--brand-id", brandId,
        "--usecase", usecase,
        "--description", description,
        "--sample1", sampleMessage,
        "--message-flow", "Customers opt in via our website by providing their phone number.",
      ];
      const campaignRes = await telnyxCli(campaignArgs);
      const campaignData = campaignRes.data as Record<string, unknown>;
      campaignId = String(campaignData.id);
      campaignStatus = String(campaignData.status ?? "PENDING");
      steps.push({ step: 2, name: "Create campaign", status: "completed", resourceId: campaignId, detail: usecase, elapsedMs: Date.now() - step2Start });
    } catch (err) {
      steps.push({ step: 2, name: "Create campaign", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 3: Assign phone number to campaign via CLI (optional)
    if (phoneNumberId) {
      const step3Start = Date.now();
      try {
        const assignRes = await telnyxCli([
          "messaging-10dlc:phone-number-campaigns", "create",
          "--phone-number", phoneNumberId,
          "--campaign-id", campaignId,
        ]);
        const assignData = (assignRes.data ?? assignRes) as Record<string, unknown>;
        assignedNumber = String(assignData.phone_number ?? phoneNumberId);
        steps.push({ step: 3, name: "Assign number to campaign", status: "completed", detail: assignedNumber, elapsedMs: Date.now() - step3Start });
      } catch (err) {
        steps.push({ step: 3, name: "Assign number to campaign", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step3Start });
        throw err;
      }
      if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
    }

    const note = "Campaign submitted for review. Approval typically takes 24-48 hours.";

    const result: Setup10dlcResult = {
      brand_id: brandId,
      brand_name: brandName,
      brand_status: brandStatus,
      campaign_id: campaignId,
      campaign_status: campaignStatus,
      usecase,
      assigned_number: assignedNumber,
      note,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string> = {
        "Brand ID": brandId,
        "Brand Name": brandName,
        "Brand Status": brandStatus,
        "Campaign ID": campaignId,
        "Campaign Status": campaignStatus,
        "Use Case": usecase,
      };
      if (assignedNumber) details["Assigned Number"] = assignedNumber;
      details["Ready"] = "✓";
      printSuccess("10DLC A2P Messaging setup complete!", details);
      console.log(`  ℹ️  ${note}\n`);
    }
  } catch (err) {
    const result = {
      status: "failed",
      brand_id: brandId || null,
      campaign_id: campaignId || null,
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
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
