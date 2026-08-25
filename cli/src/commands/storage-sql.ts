/**
 * Agent-friendly SQL execution backed by the Stainless-generated Telnyx Go CLI.
 *
 * Keep the generated command and flag surface intact: `--id` identifies the SQL
 * database, `--sql` is the statement or script, and each repeated `--param`
 * contributes one positional binding. In particular, parameter values are
 * forwarded verbatim so the Go CLI can parse strings, numbers, booleans, and
 * null with its generated `[]any` request flag.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

const MINIMUM_CLI_VERSION = "0.27.0";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type JsonRecord = Record<string, unknown>;

export async function storageSqlQueryCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const databaseId = requiredString(flags, "id", "SQL database ID", jsonOutput);
  const sql = requiredString(flags, "sql", "SQL query or statement", jsonOutput);
  const args = ["storage:sqldbs:actions", "query", "--id", databaseId, "--sql", sql];

  const params = occurrences.param ?? (flags.param === undefined ? [] : [flags.param]);
  for (const param of params) {
    if (typeof param !== "string") {
      failWith("--param requires a value (repeat it once per positional ? placeholder)", jsonOutput);
    }
    args.push("--param", param);
  }

  try {
    const response = await telnyxCli(args, { minimumVersion: MINIMUM_CLI_VERSION });
    if (jsonOutput) {
      // Query rows, mutation metadata, counts, and timing are all useful to an
      // agent, so preserve the complete generated response envelope.
      outputJson(response);
      return;
    }

    const data = asRecord(asRecord(response).data ?? response);
    const results = Array.isArray(data.results) ? data.results : [];
    printSuccess("SQL query completed!", {
      "SQL Database ID": databaseId,
      Success: typeof data.success === "boolean" ? data.success : "(not returned)",
      "Rows returned": numberOrFallback(data.count, results.length),
      "Duration (ms)": numberOrFallback(data.duration, "(not returned)"),
    });
    outputJson(response);
  } catch (err) {
    const message = errorMsg(err);
    if (jsonOutput) outputJson({ error: message });
    else printError(message);
    process.exit(1);
  }
}

function requiredString(
  flags: Flags,
  name: string,
  description: string,
  jsonOutput: boolean,
): string {
  const value = flags[name];
  if (typeof value !== "string" || value.length === 0) {
    failWith(`--${name} is required (${description})`, jsonOutput);
  }
  return value;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function numberOrFallback(value: unknown, fallback: number | string): number | string {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
