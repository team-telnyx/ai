/**
 * telnyx-agent setup-10dlc — Zero to compliant US A2P messaging in one command.
 *
 * Steps:
 * 1. Validate inputs (use-case enum, opt-in method, sample messages, disclosures)
 * 2. Create a 10DLC brand (via telnyx CLI)
 * 3. Create a campaign (via telnyx CLI) with generated compliant message_flow
 * 4. Assign a phone number to the campaign (via telnyx CLI, optional)
 *
 * Compliance logic (use-case catalog, opt-in methods, required disclosures,
 * sample-message validation, HELP/STOP/START defaults) adapted from the
 * internal Minerva 10DLC campaign builder service.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, printWarning, outputJson, failWith, type StepResult } from "../utils/output.ts";

// ─── 10DLC domain constants ──────────────────────────────────────────────────

/** Canonical TCR use cases (snake_case for Go CLI compatibility). */
const VALID_USE_CASES = [
  "2FA",
  "ACCOUNT_NOTIFICATION",
  "CUSTOMER_CARE",
  "DELIVERY_NOTIFICATIONS",
  "FRAUD_ALERT_MESSAGING",
  "HIGHER_EDUCATION",
  "LOW_VOLUME_MIXED",
  "M2M",
  "MARKETING",
  "MIXED",
  "POLLING_AND_VOTING",
  "PUBLIC_SERVICE_ANNOUNCEMENT",
  "SECURITY_ALERT",
] as const;

/** Human-readable labels for display + error messages. */
const USE_CASE_LABELS: Record<string, string> = {
  "2FA": "2FA",
  ACCOUNT_NOTIFICATION: "Account Notification",
  CUSTOMER_CARE: "Customer Care",
  DELIVERY_NOTIFICATIONS: "Delivery Notifications",
  FRAUD_ALERT_MESSAGING: "Fraud Alert Messaging",
  HIGHER_EDUCATION: "Higher Education",
  LOW_VOLUME_MIXED: "Low Volume Mixed",
  M2M: "Machine-to-Machine (M2M)",
  MARKETING: "Marketing",
  MIXED: "Mixed",
  POLLING_AND_VOTING: "Polling and Voting",
  PUBLIC_SERVICE_ANNOUNCEMENT: "Public Service Announcement",
  SECURITY_ALERT: "Security Alert",
};

/** Use cases that require two sample messages. */
const USE_CASES_NEEDING_TWO_SAMPLES = new Set(["MARKETING", "MIXED", "LOW_VOLUME_MIXED", "POLLING_AND_VOTING"]);

/** Opt-in methods. */
const VALID_OPT_IN_METHODS = ["web", "verbal", "paper", "inbound"] as const;

/** Terms that will cause TCR rejection — must not appear in sample messages. */
const PROHIBITED_TERMS = ["guaranteed", "winner", "you have been selected", "act now", "limited time"];

/** Canonical compliant disclosure sentence. */
const CANONICAL_DISCLOSURES =
  "Message frequency may vary. Message and data rates may apply. Reply STOP to opt out, HELP for help. We will not share your mobile information with third parties for marketing purposes.";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ValidationIssue {
  severity: "blocking" | "warning";
  field: string;
  message: string;
}

interface Setup10dlcResult {
  brand_id: string;
  brand_name: string;
  brand_status: string;
  campaign_id: string;
  campaign_status: string;
  usecase: string;
  opt_in_method: string;
  message_flow: string;
  help_message: string;
  stop_message: string;
  start_message: string;
  assigned_number?: string;
  warnings: string[];
  note: string;
  ready: boolean;
  steps: StepResult[];
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseCampaignResponse(response: unknown): { id: string; status: string } {
  const root = response && typeof response === "object"
    ? response as Record<string, unknown>
    : {};
  const data = root.data && typeof root.data === "object"
    ? root.data as Record<string, unknown>
    : {};
  const id = [data.id, data.CampaignID, data.campaignId, root.id, root.CampaignID, root.campaignId]
    .map(nonEmptyString)
    .find((value): value is string => value !== undefined);

  if (!id) {
    throw new Error("Campaign submission response did not include a campaign id");
  }

  return {
    id,
    status: nonEmptyString(data.status)
      ?? nonEmptyString(data.Status)
      ?? nonEmptyString(root.status)
      ?? nonEmptyString(root.Status)
      ?? "PENDING",
  };
}

// ─── Compliance helpers ──────────────────────────────────────────────────────

/** Generate the message_flow based on opt-in method + brand + optional website. */
function buildMessageFlow(method: string, brand: string, website?: string): string {
  const disclosures = CANONICAL_DISCLOSURES;
  switch (method) {
    case "verbal":
      return `Consumers opt in by verbally providing consent over the phone. Our staff reads a script explaining that by providing their phone number, they agree to receive SMS messages from ${brand}. ${disclosures}`;
    case "paper":
      return `Consumers opt in by filling out a paper form that includes an SMS opt-in checkbox. The form states: By providing your phone number and checking this box, you agree to receive SMS messages from ${brand}. ${disclosures}`;
    case "inbound":
      return `Consumers opt in by texting a keyword to our number. The keyword is displayed on our website and marketing materials. Upon texting the keyword, the consumer receives a confirmation message from ${brand}. ${disclosures}`;
    case "web":
    default:
      return `Consumers opt in by submitting the web form located at ${website ?? "[your opt-in URL]"}. The form includes clear SMS consent language: By submitting this form, you agree to receive SMS messages from ${brand}. ${disclosures}`;
  }
}

/** Lint a message_flow for required 10DLC disclosures. Returns blocking issues. */
function lintMessageFlow(flow: string): ValidationIssue[] {
  const lower = flow.toLowerCase();
  const issues: ValidationIssue[] = [];

  const checks: Array<[string, string[], string]> = [
    ["opt-in path", ["opt in", "opt-in", "subscribe", "consent", "agree"], "missing_opt_in_path"],
    ["STOP instruction", ["stop"], "missing_stop"],
    ["HELP instruction", ["help"], "missing_help"],
    ["message frequency", ["frequency", "may vary"], "missing_frequency"],
    ["message & data rates", ["data rates", "msg & data", "message and data"], "missing_rates"],
  ];

  for (const [label, needles] of checks) {
    if (!needles.some((n) => lower.includes(n))) {
      issues.push({ severity: "blocking", field: "message_flow", message: `Message flow missing required disclosure: ${label}` });
    }
  }

  // No-sharing requires all three phrases.
  const hasNoSharing =
    lower.includes("will not share") &&
    lower.includes("mobile information") &&
    lower.includes("third parties");
  if (!hasNoSharing) {
    issues.push({
      severity: "blocking",
      field: "message_flow",
      message: "Message flow missing mobile no-sharing disclosure (must include 'will not share', 'mobile information', and 'third parties')",
    });
  }

  return issues;
}

/** Detect placeholder patterns ([...], <...>, sample_text, placeholder) using linear string ops. */
function hasPlaceholderPattern(msg: string): boolean {
  // [..] bracket placeholder
  const bracketOpen = msg.indexOf("[");
  if (bracketOpen !== -1 && msg.indexOf("]", bracketOpen) !== -1) return true;
  // <..> angle placeholder
  const angleOpen = msg.indexOf("<");
  if (angleOpen !== -1 && msg.indexOf(">", angleOpen) !== -1) return true;
  // Explicit placeholder words
  const lower = msg.toLowerCase();
  return lower.includes("sample_text") || lower.includes("placeholder");
}

/** Validate a sample message. Returns blocking + warning issues. */
function validateSampleMessage(msg: string, brand: string, label: string): ValidationIssue[] {
  const lower = msg.toLowerCase();
  const issues: ValidationIssue[] = [];

  // Blocking: prohibited terms
  for (const term of PROHIBITED_TERMS) {
    if (lower.includes(term)) {
      issues.push({ severity: "blocking", field: label, message: `Prohibited term '${term}' in ${label}` });
    }
  }

  // Warning: placeholder text (string-based checks to avoid ReDoS — no regex on uncontrolled input)
  if (hasPlaceholderPattern(msg)) {
    issues.push({ severity: "warning", field: label, message: `${label} contains placeholder text — replace with real message content` });
  }

  // Warning: brand name should appear
  if (brand.toLowerCase() && !lower.includes(brand.toLowerCase())) {
    issues.push({ severity: "warning", field: label, message: `${label} should include the brand name '${brand}'` });
  }

  // Warning: STOP opt-out
  if (!lower.includes("stop")) {
    issues.push({ severity: "warning", field: label, message: `${label} missing STOP opt-out instruction` });
  }

  // Warning: 160-char SMS limit
  if (msg.length > 160) {
    issues.push({ severity: "warning", field: label, message: `${label} is ${msg.length} characters — exceeds 160-char SMS limit` });
  }

  return issues;
}

/** Generate default HELP/STOP/START auto-response messages. */
function buildHelpStopStart(brand: string, email: string, phone: string) {
  return {
    helpMessage: `${brand} Support: For help, reply HELP or contact us at ${email} or ${phone}. Msg & data rates may apply. Reply STOP to unsubscribe.`,
    stopMessage: `You have been unsubscribed from ${brand} messages. No further messages will be sent. Reply START to resubscribe.`,
    startMessage: `${brand}: You have resubscribed to receive SMS messages. Msg frequency may vary. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.`,
  };
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function setup10dlcCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const phone = flags.phone as string;
  const email = flags.email as string;

  if (!phone || !email) {
    failWith("--phone and --email are required for 10DLC brand registration.", jsonOutput);
  }

  // ── Validate use case ──
  const usecase = (flags.usecase as string) || "CUSTOMER_CARE";
  if (!VALID_USE_CASES.includes(usecase as (typeof VALID_USE_CASES)[number])) {
    failWith(`Invalid use case '${usecase}'. Valid values: ${VALID_USE_CASES.map((u) => USE_CASE_LABELS[u]).join(", ")}`, jsonOutput);
  }

  // ── Validate opt-in method ──
  const optInMethod = (flags["opt-in-method"] as string) || "web";
  if (!VALID_OPT_IN_METHODS.includes(optInMethod as (typeof VALID_OPT_IN_METHODS)[number])) {
    failWith(`Invalid opt-in method '${optInMethod}'. Valid values: ${VALID_OPT_IN_METHODS.join(", ")}`, jsonOutput);
  }

  const phoneNumberId = (flags["phone-number-id"] as string) || "";
  const totalSteps = phoneNumberId ? 3 : 2;
  const steps: StepResult[] = [];
  const startTime = Date.now();
  const warnings: string[] = [];

  let brandId = "";
  let brandName = "";
  let brandStatus = "";
  let campaignId = "";
  let campaignStatus = "";
  let assignedNumber: string | undefined;

  try {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    brandName = (flags["brand-name"] as string) || `Agent Brand - ${ts}`;
    const companyName = (flags["company-name"] as string) || "";
    const vertical = (flags.vertical as string) || "TECHNOLOGY";
    const website = (flags.website as string) || "";

    if (optInMethod === "web" && !website) {
      warnings.push("--website not provided; web opt-in message_flow will contain a placeholder URL");
    }

    if (!jsonOutput) console.log("\n🚀 Setting up 10DLC A2P Messaging...\n");

    // ── Pre-submission compliance validation ──
    const messageFlow = (flags["message-flow"] as string) || buildMessageFlow(optInMethod, brandName, website);
    const flowIssues = lintMessageFlow(messageFlow);
    const blockingFlowIssues = flowIssues.filter((i) => i.severity === "blocking");
    if (blockingFlowIssues.length > 0) {
      const issues = blockingFlowIssues.map((i) => i.message).join("; ");
      failWith(`Message flow failed compliance validation: ${issues}`, jsonOutput);
    }
    flowIssues.filter((i) => i.severity === "warning").forEach((i) => warnings.push(i.message));

    // ── Validate sample messages ──
    const sample1 = (flags["sample-message"] as string) || "Your verification code is {code}. Reply STOP to opt out.";
    const needsTwoSamples = USE_CASES_NEEDING_TWO_SAMPLES.has(usecase);
    const sample2Default = `${brandName}: You are now subscribed to receive SMS messages. Msg frequency may vary. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.`;
    const sample2 = (flags["sample-message-2"] as string) || (needsTwoSamples ? sample2Default : "");

    const sampleIssues = validateSampleMessage(sample1, brandName, "sample_message");
    if (sample2) sampleIssues.push(...validateSampleMessage(sample2, brandName, "sample_message_2"));

    const blockingSamples = sampleIssues.filter((i) => i.severity === "blocking");
    if (blockingSamples.length > 0) {
      const issues = blockingSamples.map((i) => i.message).join("; ");
      failWith(`Sample message validation failed: ${issues}`, jsonOutput);
    }
    sampleIssues.filter((i) => i.severity === "warning").forEach((i) => warnings.push(i.message));

    // ── Generate HELP/STOP/START defaults ──
    const { helpMessage, stopMessage, startMessage } = buildHelpStopStart(brandName, email, phone);
    const helpMsg = (flags["help-message"] as string) || helpMessage;
    const stopMsg = (flags["stop-message"] as string) || stopMessage;
    const startMsg = (flags["start-message"] as string) || startMessage;

    // Print warnings before proceeding
    if (!jsonOutput) {
      for (const w of warnings) printWarning(w);
    }

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
      if (companyName) brandArgs.push("--company-name", companyName);
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

    // Step 2: Submit campaign via CLI
    const description = (flags.description as string) || "Agent-provisioned campaign for customer communications";
    const step2Start = Date.now();
    try {
      const campaignArgs = [
        "messaging-10dlc:campaign-builder", "submit",
        "--brand-id", brandId,
        "--usecase", usecase,
        "--description", description,
        "--sample1", sample1,
        "--message-flow", messageFlow,
        "--help-message", helpMsg,
        "--optout-message", stopMsg,
        "--optin-message", startMsg,
      ];
      if (sample2) campaignArgs.push("--sample2", sample2);
      const campaignRes = await telnyxCli(campaignArgs);
      const campaign = parseCampaignResponse(campaignRes);
      campaignId = campaign.id;
      campaignStatus = campaign.status;
      steps.push({ step: 2, name: "Create campaign", status: "completed", resourceId: campaignId, detail: USE_CASE_LABELS[usecase] ?? usecase, elapsedMs: Date.now() - step2Start });
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
      opt_in_method: optInMethod,
      message_flow: messageFlow,
      help_message: helpMsg,
      stop_message: stopMsg,
      start_message: startMsg,
      assigned_number: assignedNumber,
      warnings,
      note,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Brand ID": brandId,
        "Brand Name": brandName,
        "Brand Status": brandStatus,
        "Campaign ID": campaignId,
        "Campaign Status": campaignStatus,
        "Use Case": USE_CASE_LABELS[usecase] ?? usecase,
        "Opt-In Method": optInMethod,
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
      warnings,
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
