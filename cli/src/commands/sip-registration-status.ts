/**
 * Retrieve the live registration state for one SIP credential or UAC connection.
 *
 * This wraps the Telnyx Go CLI's `sip-registration-status list` command,
 * introduced in v0.33.0. The API has no collection pagination: credential type
 * selects exactly one lookup key and returns its current registration status.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type CredentialType = "uac_external_credential" | "telephony_credential" | "sip_credential_connection";
type JsonRecord = Record<string, unknown>;

const MINIMUM_CLI_VERSION = "0.33.0";
const CREDENTIAL_TYPES = new Set<CredentialType>([
  "uac_external_credential",
  "telephony_credential",
  "sip_credential_connection",
]);

interface SipRegistrationStatusResult {
  credential_type: CredentialType;
  connection_id: string;
  connection_name: string;
  credential_username: string;
  registered: boolean;
  sip_registration_status: string;
  last_registration_response: string | null;
  sip_registration_details: JsonRecord;
}

export async function sipRegistrationStatusCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const credentialType = requiredCredentialType(flags, jsonOutput);
  const connectionId = optionalString(flags, "connection-id", jsonOutput);
  const username = optionalString(flags, "username", jsonOutput);
  validateLookupKey(credentialType, connectionId, username, jsonOutput);

  const args = ["sip-registration-status", "list", "--credential-type", credentialType];
  if (connectionId) args.push("--connection-id", connectionId);
  if (username) args.push("--username", username);

  try {
    const response = await telnyxCli(args, { minimumVersion: MINIMUM_CLI_VERSION });
    const result = normalizeResult(response, credentialType, connectionId, username);
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    presentResult(result);
  } catch (err) {
    if (jsonOutput) outputJson({ error: errorMessage(err) });
    else printError(errorMessage(err));
    process.exit(1);
  }
}

function requiredCredentialType(flags: Flags, jsonOutput: boolean): CredentialType {
  const value = optionalString(flags, "credential-type", jsonOutput);
  if (!value) {
    failWith(
      "--credential-type is required (uac_external_credential, telephony_credential, or sip_credential_connection)",
      jsonOutput,
    );
  }
  if (!CREDENTIAL_TYPES.has(value as CredentialType)) {
    failWith(
      "--credential-type must be one of: uac_external_credential, telephony_credential, sip_credential_connection",
      jsonOutput,
    );
  }
  return value as CredentialType;
}

function optionalString(flags: Flags, name: string, jsonOutput: boolean): string | undefined {
  const value = flags[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    failWith(`--${name} requires a non-empty value`, jsonOutput);
  }
  return value;
}

function validateLookupKey(
  credentialType: CredentialType,
  connectionId: string | undefined,
  username: string | undefined,
  jsonOutput: boolean,
): void {
  if (credentialType === "uac_external_credential") {
    if (!connectionId) {
      failWith("--connection-id is required when --credential-type is uac_external_credential", jsonOutput);
    }
    if (username) {
      failWith("--username is not valid when --credential-type is uac_external_credential; use --connection-id", jsonOutput);
    }
    return;
  }

  if (!username) {
    failWith(`--username is required when --credential-type is ${credentialType}`, jsonOutput);
  }
  if (connectionId) {
    failWith(`--connection-id is not valid when --credential-type is ${credentialType}; use --username`, jsonOutput);
  }
}

function normalizeResult(
  response: unknown,
  credentialType: CredentialType,
  connectionId: string | undefined,
  username: string | undefined,
): SipRegistrationStatusResult {
  const data = asRecord(asRecord(response).data ?? response);
  const lastRegistrationResponse = data.last_registration_response;
  return {
    credential_type: credentialType,
    connection_id: stringValue(data.connection_id) || connectionId || "",
    connection_name: stringValue(data.connection_name),
    credential_username: stringValue(data.credential_username) || username || "",
    registered: typeof data.registered === "boolean" ? data.registered : false,
    sip_registration_status: stringValue(data.sip_registration_status),
    last_registration_response: typeof lastRegistrationResponse === "string" ? lastRegistrationResponse : null,
    sip_registration_details: asRecord(data.sip_registration_details),
  };
}

function presentResult(result: SipRegistrationStatusResult): void {
  const details = result.sip_registration_details;
  printSuccess("SIP registration status retrieved!", {
    "Credential Type": result.credential_type,
    "Connection ID": result.connection_id || "—",
    "Connection Name": result.connection_name || "—",
    "SIP Username": result.credential_username || "—",
    Registered: result.registered ? "Yes" : "No",
    Status: result.sip_registration_status || "Unknown",
    Expires: printableValue(details.expires),
    "Last Response": result.last_registration_response || "—",
  });

  const optionalDetails = [
    ["Transport", details.transport],
    ["User Agent", details.ua_ip && details.ua_port ? `${details.ua_ip}:${details.ua_port}` : details.ua_ip ?? details.ua_port],
    ["Last Modified", details.last_modified],
    ["SIP URI", details.sip_uri_user_host],
    ["Failures", details.failures],
    ["Auth Retries", details.auth_retries],
    ["Next Action", details.next_action_at],
  ] as const;
  for (const [label, value] of optionalDetails) {
    if (value !== undefined && value !== null && value !== "") console.log(`  ${label}: ${String(value)}`);
  }
  console.log();
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function printableValue(value: unknown): string {
  return value === undefined || value === null || value === "" ? "—" : String(value);
}

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
