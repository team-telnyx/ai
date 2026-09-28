/**
 * Create a JWT for an existing on-demand telephony credential.
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

export async function createTelephonyCredentialTokenCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = flags.id;
  if (typeof id !== "string" || !id) {
    failWith("--id is required (telephony credential ID)", jsonOutput);
  }

  try {
    const jwt = await telnyxCliRaw(
      ["telephony-credentials", "create-token", "--id", id],
      { minimumVersion: MINIMUM_CLI_VERSION },
    );
    const framedJwt = jwt.endsWith("\r\n") ? jwt.slice(0, -2) : jwt.endsWith("\n") ? jwt.slice(0, -1) : jwt;
    if (jsonOutput) {
      // `jwt` intentionally avoids the generic output redactor's `token` key:
      // --json is the explicit opt-in to structured sensitive output.
      outputJson({ credential_id: id, jwt: framedJwt });
      return;
    }
    printSuccess("Telephony credential access token created!", {
      "Credential ID": id,
      JWT: "received but hidden; rerun with --json to emit it",
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
  return "Unable to create telephony credential token; sensitive response output was suppressed.";
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
