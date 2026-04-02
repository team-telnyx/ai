/**
 * telnyx-agent setup-iot — Zero to connected SIM in one command.
 *
 * Steps:
 * 1. List existing SIM cards (via telnyx CLI)
 * 2. Create a SIM card group (direct API — no CLI equivalent)
 * 3. Activate first available SIM (via telnyx CLI)
 * 4. Assign SIM to group (direct API — no CLI equivalent)
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printStep, printSuccess, printError, printWarning, outputJson, type StepResult } from "../utils/output.ts";

interface SetupIotResult {
  sim_id: string;
  sim_iccid: string;
  group_id: string;
  group_name: string;
  status: string;
  apn_config: { apn: string; username: string; password: string };
  ready: boolean;
  steps: StepResult[];
}

export async function setupIotCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let groupId = "";
  let groupName = "";
  let simId = "";
  let simIccid = "";
  let simStatus = "";

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up IoT...\n");

    // Step 1: List existing SIMs via CLI
    const step1Start = Date.now();
    let availableSim: Record<string, unknown> | null = null;
    try {
      const simsRes = await telnyxCli(["sim-cards", "list"]);
      const sims = simsRes.data as Record<string, unknown>[];

      // Find a disabled/standby SIM that can be activated
      availableSim = sims?.find(
        (s) => s.status === "disabled" || s.status === "standby" || s.status === "inactive",
      ) ?? null;

      const detail = sims?.length
        ? `Found ${sims.length} SIM(s), ${availableSim ? "1 available for activation" : "none available for activation"}`
        : "No SIMs found on account";

      steps.push({ step: 1, name: "List SIM cards", status: "completed", detail, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "List SIM cards", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    if (!availableSim) {
      const msg = "No inactive/disabled SIM cards found. Purchase SIMs via the Telnyx portal first.";
      if (!jsonOutput) printWarning(msg);
      steps.push({ step: 2, name: "Create SIM group", status: "skipped", detail: "No SIMs to configure", elapsedMs: 0 });
      steps.push({ step: 3, name: "Activate SIM", status: "skipped", detail: "No SIMs available", elapsedMs: 0 });
      steps.push({ step: 4, name: "Assign SIM to group", status: "skipped", detail: "No SIMs available", elapsedMs: 0 });

      const result = { status: "no_sims", message: msg, ready: false, steps, elapsed_ms: Date.now() - startTime };
      if (jsonOutput) outputJson(result);
      else {
        for (const s of steps.slice(1)) printStep(s, totalSteps);
        console.log();
      }
      return;
    }

    simId = String(availableSim.id);
    simIccid = String(availableSim.iccid ?? "");

    // Step 2: Create SIM card group (direct API — no CLI equivalent)
    const step2Start = Date.now();
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    groupName = `Agent IoT Group - ${ts}`;
    try {
      const groupRes = await client.post("/sim_card_groups", { name: groupName });
      const groupData = groupRes.data as Record<string, unknown>;
      groupId = String(groupData.id);
      steps.push({ step: 2, name: "Create SIM group", status: "completed", resourceId: groupId, detail: groupName, elapsedMs: Date.now() - step2Start });
    } catch (err) {
      steps.push({ step: 2, name: "Create SIM group", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 3: Activate the SIM via CLI
    const step3Start = Date.now();
    try {
      await telnyxCli(["sim-cards:actions", "enable", "--id", simId]);
      simStatus = "enabled";
      steps.push({ step: 3, name: "Activate SIM", status: "completed", resourceId: simId, detail: `ICCID: ${simIccid}`, elapsedMs: Date.now() - step3Start });
    } catch (err) {
      // SIM might already be enabled — CLI returns error for 422
      if (err instanceof TelnyxCLIError && (err.stderr.includes("422") || err.stderr.includes("already"))) {
        simStatus = "already_enabled";
        steps.push({ step: 3, name: "Activate SIM", status: "completed", resourceId: simId, detail: "Already enabled", elapsedMs: Date.now() - step3Start });
      } else {
        steps.push({ step: 3, name: "Activate SIM", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step3Start });
        throw err;
      }
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 4: Assign SIM to group (direct API — no CLI equivalent)
    const step4Start = Date.now();
    try {
      await client.patch(`/sim_cards/${simId}`, { sim_card_group_id: groupId });
      steps.push({ step: 4, name: "Assign SIM to group", status: "completed", elapsedMs: Date.now() - step4Start });
    } catch (err) {
      steps.push({ step: 4, name: "Assign SIM to group", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const result: SetupIotResult = {
      sim_id: simId,
      sim_iccid: simIccid,
      group_id: groupId,
      group_name: groupName,
      status: simStatus,
      apn_config: { apn: "telnyx", username: "", password: "" },
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("IoT setup complete!", {
        "SIM ID": simId,
        "ICCID": simIccid,
        "Group ID": groupId,
        "Group Name": groupName,
        Status: simStatus,
        APN: "telnyx",
        Ready: "✓",
      });
    }
  } catch (err) {
    const result = {
      status: "failed",
      sim_id: simId || null,
      group_id: groupId || null,
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
