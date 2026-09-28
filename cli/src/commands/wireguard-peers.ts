/**
 * Retrieve the client configuration for an existing WireGuard peer.
 *
 * The upstream action was added in Telnyx Go CLI v0.30.0. The bundled v0.32.0
 * CLI satisfies that requirement; overrides still receive a command-scoped check.
 */
import {
  IncompatibleTelnyxCLIError,
  telnyxCliRaw,
  TelnyxCLIError,
} from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;

const MINIMUM_CLI_VERSION = "0.30.0";

export async function getWireguardPeerConfigCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = flags.id;
  if (typeof id !== "string" || !id) {
    failWith("--id is required (WireGuard peer ID)", jsonOutput);
  }

  try {
    const wireguardConfig = await telnyxCliRaw(
      ["wireguard-peers", "retrieve-config", "--id", id],
      { minimumVersion: MINIMUM_CLI_VERSION },
    );
    if (jsonOutput) {
      // `wireguard_config` intentionally contains the exact raw config. --json
      // is the explicit opt-in because a config can include a private key.
      outputJson({ wireguard_peer_id: id, wireguard_config: wireguardConfig });
      return;
    }
    printSuccess("WireGuard peer configuration retrieved!", {
      "WireGuard Peer ID": id,
      Configuration: "received but hidden; rerun with --json to emit it",
    });
  } catch (err) {
    fail(safeErrorMessage(err), jsonOutput);
  }
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof IncompatibleTelnyxCLIError) return err.message;
  if (err instanceof TelnyxCLIError) {
    return `Telnyx CLI request failed (exit code ${err.exitCode}); sensitive response output was suppressed.`;
  }
  return "Unable to retrieve WireGuard peer configuration; sensitive response output was suppressed.";
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
