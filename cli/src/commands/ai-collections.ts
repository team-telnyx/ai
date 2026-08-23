/**
 * AI collection RAG document retrieval backed by the Stainless-generated Go CLI.
 *
 * The API addresses collections by slug, while the agent-facing command calls
 * that value a collection ID and also accepts the generated CLI's `--slug`
 * spelling. Documents and response metadata are preserved for downstream agents.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface CollectionSearchResult {
  collection_id: string;
  query: string | null;
  count: number;
  documents: JsonRecord[];
  meta: JsonRecord;
}

const RETRIEVAL_TYPES = new Set(["vector", "hybrid", "keyword"]);
const MINIMUM_COLLECTIONS_CLI_VERSION = "0.27.0";

export async function searchAiCollectionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const collectionId = collectionIdFlag(flags, jsonOutput);
  const args = ["ai:collections", "retrieve-documents", "--slug", collectionId];

  const query = optionalStringFlag(flags, "query");
  if (query !== undefined) args.push("--query", query);

  const retrievalType = optionalStringFlag(flags, "retrieval-type");
  if (retrievalType !== undefined) {
    if (!RETRIEVAL_TYPES.has(retrievalType)) {
      fail('--retrieval-type must be "vector", "hybrid", or "keyword"', jsonOutput);
    }
    args.push("--retrieval-type", retrievalType);
  }

  addPositiveIntegerFlag(args, flags, "top-k", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);

  const sources = optionalStringFlag(flags, "sources");
  if (sources !== undefined) {
    const sourceValues = sources.split(",").map((source) => source.trim()).filter(Boolean);
    if (sourceValues.length === 0) fail("--sources must contain at least one source type", jsonOutput);
    args.push("--sources", sourceValues.join(","));
  }

  const filter = optionalStringFlag(flags, "filter");
  if (filter !== undefined) {
    try {
      const parsed = JSON.parse(filter);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    } catch {
      fail("--filter must be a JSON object", jsonOutput);
    }
    args.push("--filter", filter);
  }

  try {
    const response = await telnyxCli(args, {
      minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION,
    });
    presentCollectionSearch(normalizeCollectionSearch(response, collectionId, query), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeCollectionSearch(
  response: unknown,
  collectionId: string,
  query: string | undefined,
): CollectionSearchResult {
  const envelope = asRecord(response);
  const documents = Array.isArray(envelope.data)
    ? envelope.data.filter(
      (document): document is JsonRecord => Boolean(document)
        && typeof document === "object"
        && !Array.isArray(document),
    )
    : [];
  const meta = asRecord(envelope.meta);

  return {
    collection_id: stringValue(meta.collection_slug) || collectionId,
    query: query ?? null,
    count: documents.length,
    documents,
    meta,
  };
}

function presentCollectionSearch(result: CollectionSearchResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("AI collection documents retrieved!", {
    Collection: result.collection_id,
    Query: result.query ?? "(catalog listing)",
    Results: result.count,
    "Total Results": stringValue(result.meta.total_results) || result.count,
    "Retrieval Type": stringValue(result.meta.retrieval_type) || "(collection default)",
  });

  for (const document of result.documents) {
    const recordType = stringValue(document.record_type) || "document";
    const recordId = stringValue(document.record_id) || stringValue(document.id) || "(unknown)";
    const score = typeof document.score === "number" ? ` · score ${document.score}` : "";
    const text = stringValue(document.text).replace(/\s+/g, " ").trim();
    const preview = text.length > 180 ? `${text.slice(0, 177)}...` : text;
    console.log(`  • ${recordType}:${recordId}${score}`);
    if (preview) console.log(`    ${preview}`);
  }
  if (result.count === 0) console.log("  (no documents returned)");
  console.log();
}

function collectionIdFlag(flags: Flags, jsonOutput: boolean): string {
  const collectionId = nonEmptyStringFlag(flags, "collection-id");
  const slug = nonEmptyStringFlag(flags, "slug");
  if (collectionId && slug && collectionId !== slug) {
    fail("--collection-id and --slug cannot specify different values", jsonOutput);
  }
  const value = collectionId ?? slug;
  if (!value) {
    fail("--collection-id is required (the collection slug; --slug is also accepted)", jsonOutput);
  }
  return value;
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  name: string,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, name);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${name} must be a positive integer`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function optionalStringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") return "";
  return value;
}

function nonEmptyStringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
