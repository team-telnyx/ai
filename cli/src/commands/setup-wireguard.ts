/**
 * telnyx-agent setup-wireguard — Zero to VPN tunnel in one command.
 *
 * Steps:
 * 1. Create a network (or use existing --network-id)
 * 2. Create a WireGuard interface (gateway)
 * 3. Create a WireGuard peer
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";

interface SetupWireguardResult {
  network_id: string;
  network_name: string;
  wireguard_interface_id: string;
  wireguard_peer_id: string;
  peer_public_key: string;
  peer_private_key: string;
  peer_endpoint: string;
  peer_allowed_ips: string;
  wg_config: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupWireguardCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const existingNetworkId = (flags["network-id"] as string) || "";
  const totalSteps = existingNetworkId ? 2 : 3;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let networkId = existingNetworkId;
  let networkName = "";
  let wgInterfaceId = "";
  let wgPeerId = "";
  let peerPublicKey = "";
  let peerPrivateKey = "";
  let peerEndpoint = "";
  let peerAllowedIps = "";
  let peerIp = "";
  let gatewayPublicKey = "";
  let gatewayEndpoint = "";

  let stepNum = 0;

  try {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (!jsonOutput) console.log("\n🚀 Setting up WireGuard VPN...\n");

    // Step 1: Create a network (skip if --network-id provided)
    if (!existingNetworkId) {
      stepNum++;
      networkName = `Agent Network - ${ts}`;
      const step1Start = Date.now();
      try {
        const netRes = await client.post("/networks", { name: networkName });
        const netData = netRes.data as Record<string, unknown>;
        networkId = String(netData.id);
        steps.push({ step: stepNum, name: "Create network", status: "completed", resourceId: networkId, detail: networkName, elapsedMs: Date.now() - step1Start });
      } catch (err) {
        steps.push({ step: stepNum, name: "Create network", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
        throw err;
      }
      if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
    } else {
      networkName = "(existing network)";
    }

    // Step 2: Create a WireGuard interface (gateway)
    stepNum++;
    const ifaceName = `Agent WG Gateway - ${ts}`;
    const step2Start = Date.now();
    try {
      const ifaceRes = await client.post("/wireguard_interfaces", {
        network_id: networkId,
        name: ifaceName,
      });
      const ifaceData = ifaceRes.data as Record<string, unknown>;
      wgInterfaceId = String(ifaceData.id);
      gatewayPublicKey = String((ifaceData as Record<string, unknown>).public_key ?? "");
      gatewayEndpoint = String((ifaceData as Record<string, unknown>).endpoint ?? "");
      steps.push({ step: stepNum, name: "Create WireGuard interface", status: "completed", resourceId: wgInterfaceId, detail: ifaceName, elapsedMs: Date.now() - step2Start });
    } catch (err) {
      steps.push({ step: stepNum, name: "Create WireGuard interface", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 3: Create a WireGuard peer
    stepNum++;
    const step3Start = Date.now();
    try {
      const peerRes = await client.post("/wireguard_peers", {
        wireguard_interface_id: wgInterfaceId,
      });
      const peerData = peerRes.data as Record<string, unknown>;
      wgPeerId = String(peerData.id);
      peerPublicKey = String(peerData.public_key ?? "");
      peerPrivateKey = String(peerData.private_key ?? "");
      peerEndpoint = String(peerData.endpoint ?? "");
      peerAllowedIps = String(peerData.allowed_ips ?? "0.0.0.0/0");
      peerIp = String(peerData.ip ?? peerData.address ?? "");
      steps.push({ step: stepNum, name: "Create WireGuard peer", status: "completed", resourceId: wgPeerId, elapsedMs: Date.now() - step3Start });
    } catch (err) {
      steps.push({ step: stepNum, name: "Create WireGuard peer", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step3Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Build WireGuard config
    const wgConfig = [
      "[Interface]",
      `PrivateKey = ${peerPrivateKey}`,
      `Address = ${peerIp}/32`,
      "",
      "[Peer]",
      `PublicKey = ${gatewayPublicKey}`,
      `Endpoint = ${gatewayEndpoint}`,
      `AllowedIPs = ${peerAllowedIps}`,
    ].join("\n");

    const result: SetupWireguardResult = {
      network_id: networkId,
      network_name: networkName,
      wireguard_interface_id: wgInterfaceId,
      wireguard_peer_id: wgPeerId,
      peer_public_key: peerPublicKey,
      peer_private_key: peerPrivateKey,
      peer_endpoint: peerEndpoint,
      peer_allowed_ips: peerAllowedIps,
      wg_config: wgConfig,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("WireGuard VPN setup complete!", {
        "Network ID": networkId,
        "Interface ID": wgInterfaceId,
        "Peer ID": wgPeerId,
        "Peer IP": peerIp || "(see config)",
        Ready: "✓",
      });
      console.log("  📄 WireGuard Config:\n");
      console.log(wgConfig.split("\n").map((l) => `    ${l}`).join("\n"));
      console.log("\n  ⚠️  Save your private key — it cannot be retrieved later.\n");
    }
  } catch (err) {
    const result = {
      status: "failed",
      network_id: networkId || null,
      wireguard_interface_id: wgInterfaceId || null,
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
