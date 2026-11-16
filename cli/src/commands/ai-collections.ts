/**
 * AI collection RAG provisioning, ingestion, and retrieval backed by the
 * Stainless-generated Telnyx Go CLI.
 *
 * Collection retrieval is addressed by slug; lifecycle mutations and source
 * ingestion use the collection UUID required by their upstream routes.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type JsonRecord = Record<string, unknown>;

interface CollectionSearchResult {
  collection_id: string;
  query: string | null;
  count: number;
  documents: JsonRecord[];
  meta: JsonRecord;
}

interface CollectionResult {
  collection_id: string;
  collection: JsonRecord;
}

interface CollectionListResult {
  count: number;
  collections: JsonRecord[];
  meta: JsonRecord;
}

interface CollectionSourceResult {
  collection_uuid: string;
  source: JsonRecord;
}

interface CollectionSourceListResult {
  collection_uuid: string;
  count: number;
  sources: JsonRecord[];
  meta: JsonRecord;
}

interface CollectionSourcesReplaceResult {
  collection_uuid: string;
  sources: JsonRecord[];
  meta: JsonRecord;
}

const RETRIEVAL_TYPES = new Set(["vector", "hybrid", "keyword"]);
const MINIMUM_COLLECTIONS_CLI_VERSION = "0.27.0";

export async function createAiCollectionCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredStringFlag(flags, "name", jsonOutput);
  const args = ["ai:collections", "create", "--name", name];
  addOptionalStringFlag(args, flags, "description", jsonOutput);
  addOptionalStringFlag(args, flags, "slug", jsonOutput);
  addSourceObjects(args, flags, occurrences, jsonOutput);

  try {
    const response = await telnyxCli(args, { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION });
    presentCollection("AI collection created!", normalizeCollection(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getAiCollectionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const slug = requiredStringFlag(flags, "slug", jsonOutput);

  try {
    const response = await telnyxCli(
      ["ai:collections", "retrieve", "--slug", slug],
      { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION },
    );
    presentCollection("AI collection retrieved!", normalizeCollection(response, slug), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listAiCollectionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:collections", "list"];
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);

  try {
    // The generated list command emits concatenated JSON documents with its
    // default format; raw preserves the API's one { data, meta } envelope.
    const result = normalizeCollectionList(await telnyxCli(args, {
      format: "raw",
      minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION,
    }));
    presentCollectionList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateAiCollectionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const uuid = requiredStringFlag(flags, "uuid", jsonOutput);
  const args = ["ai:collections", "update", "--uuid", uuid];
  const mutations = addOptionalStringFlag(args, flags, "name", jsonOutput)
    + addOptionalStringFlag(args, flags, "description", jsonOutput);
  if (mutations === 0) fail("at least one of --name or --description is required to update an AI collection", jsonOutput);

  try {
    const response = await telnyxCli(args, { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION });
    presentCollection("AI collection updated!", normalizeCollection(response, uuid), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteAiCollectionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const uuid = requiredStringFlag(flags, "uuid", jsonOutput);
  requireConfirm(flags, "delete an AI collection", jsonOutput);

  try {
    await telnyxCli(
      ["ai:collections", "delete", "--uuid", uuid],
      { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION },
    );
    presentDelete("AI collection deleted!", { collection_uuid: uuid, deleted: true }, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createAiCollectionSourceCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const uuid = requiredStringFlag(flags, "uuid", jsonOutput);
  const sourceType = requiredStringFlag(flags, "source-type", jsonOutput);
  const args = [
    "ai:collections:sources", "create",
    "--uuid", uuid,
    "--source-type", sourceType,
  ];
  addBucketId(args, flags, sourceType, jsonOutput);

  try {
    const response = await telnyxCli(args, { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION });
    presentSource(
      "AI collection source created!",
      { collection_uuid: uuid, source: responseDataRecord(response) },
      jsonOutput,
    );
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listAiCollectionSourcesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const uuid = requiredStringFlag(flags, "uuid", jsonOutput);

  try {
    const result = normalizeSourceList(
      await telnyxCli(
        ["ai:collections:sources", "list", "--uuid", uuid],
        { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION },
      ),
      uuid,
    );
    presentSourceList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteAiCollectionSourceCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const uuid = requiredStringFlag(flags, "uuid", jsonOutput);
  const sourceId = requiredStringFlag(flags, "source-id", jsonOutput);
  requireConfirm(flags, "delete an AI collection source", jsonOutput);

  try {
    await telnyxCli(
      ["ai:collections:sources", "delete", "--uuid", uuid, "--source-id", sourceId],
      { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION },
    );
    presentDelete(
      "AI collection source deleted!",
      { collection_uuid: uuid, source_id: sourceId, deleted: true },
      jsonOutput,
    );
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function replaceAiCollectionSourcesCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const uuid = requiredStringFlag(flags, "uuid", jsonOutput);
  requireConfirm(flags, "replace AI collection sources", jsonOutput);
  const args = ["ai:collections:sources", "replace", "--uuid", uuid];
  const sourceCount = addSourceObjects(args, flags, occurrences, jsonOutput);
  if (sourceCount === 0) fail("at least one --source JSON object is required to replace AI collection sources", jsonOutput);

  try {
    const result = normalizeSourcesReplace(
      await telnyxCli(args, { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION }),
      uuid,
    );
    presentSourcesReplace(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

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
    const response = await telnyxCli(args, { minimumVersion: MINIMUM_COLLECTIONS_CLI_VERSION });
    presentCollectionSearch(normalizeCollectionSearch(response, collectionId, query), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeCollection(response: unknown, fallbackId = ""): CollectionResult {
  const collection = responseDataRecord(response);
  return {
    collection_id: stringValue(collection.id) || stringValue(collection.slug) || fallbackId,
    collection,
  };
}

function normalizeCollectionList(response: unknown): CollectionListResult {
  const envelope = asRecord(response);
  const collections = recordsFromData(response);
  return { count: collections.length, collections, meta: asRecord(envelope.meta) };
}

function normalizeSourceList(response: unknown, uuid: string): CollectionSourceListResult {
  const envelope = asRecord(response);
  const sources = recordsFromData(response);
  return { collection_uuid: uuid, count: sources.length, sources, meta: asRecord(envelope.meta) };
}

function normalizeSourcesReplace(response: unknown, uuid: string): CollectionSourcesReplaceResult {
  const envelope = asRecord(response);
  return { collection_uuid: uuid, sources: recordsFromData(response), meta: asRecord(envelope.meta) };
}

function normalizeCollectionSearch(
  response: unknown,
  collectionId: string,
  query: string | undefined,
): CollectionSearchResult {
  const envelope = asRecord(response);
  const documents = recordsFromData(response);
  const meta = asRecord(envelope.meta);

  return {
    collection_id: stringValue(meta.collection_slug) || collectionId,
    query: query ?? null,
    count: documents.length,
    documents,
    meta,
  };
}

function presentCollection(resultTitle: string, result: CollectionResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(resultTitle, {
    "Collection ID": result.collection_id || "(not returned)",
    Name: stringValue(result.collection.name) || "(unnamed)",
    Slug: stringValue(result.collection.slug) || "(not returned)",
  });
}

function presentCollectionList(result: CollectionListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("AI collections retrieved!", { Count: result.count });
  for (const collection of result.collections) {
    console.log(`  • ${stringValue(collection.name) || "(unnamed)"} — ${stringValue(collection.id) || stringValue(collection.slug) || "(unknown)"}`);
  }
  if (result.count === 0) console.log("  (no AI collections returned)");
  console.log();
}

function presentSource(title: string, result: CollectionSourceResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Collection UUID": result.collection_uuid,
    "Source ID": stringValue(result.source.id) || "(not returned)",
    "Source Type": stringValue(result.source.source_type) || "(not returned)",
  });
}

function presentSourceList(result: CollectionSourceListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("AI collection sources retrieved!", { "Collection UUID": result.collection_uuid, Count: result.count });
  for (const source of result.sources) {
    console.log(`  • ${stringValue(source.source_type) || "source"} — ${stringValue(source.id) || "(unknown)"}`);
  }
  if (result.count === 0) console.log("  (no AI collection sources returned)");
  console.log();
}

function presentSourcesReplace(result: CollectionSourcesReplaceResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("AI collection sources replaced!", {
    "Collection UUID": result.collection_uuid,
    Sources: result.sources.length,
  });
}

function presentDelete(title: string, result: Record<string, string | boolean>, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, result);
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

function addSourceObjects(
  args: string[],
  flags: Flags,
  occurrences: Occurrences,
  jsonOutput: boolean,
): number {
  const values = occurrences.source ?? (flags.source === undefined ? [] : [flags.source]);
  for (const value of values) {
    if (typeof value !== "string") fail("--source must be a JSON object", jsonOutput);
    let source: JsonRecord;
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      source = parsed as JsonRecord;
    } catch {
      fail("--source must be a JSON object", jsonOutput);
    }
    const sourceType = stringValue(source.source_type).trim();
    if (!sourceType) fail("each --source JSON object requires source_type", jsonOutput);
    if (sourceType === "bucket" && !stringValue(source.bucket_id).trim()) {
      fail("bucket --source JSON objects require bucket_id", jsonOutput);
    }
    args.push("--source", value);
  }
  return values.length;
}

function addBucketId(args: string[], flags: Flags, sourceType: string, jsonOutput: boolean): void {
  const bucketId = optionalStringFlag(flags, "bucket-id");
  if (bucketId !== undefined) {
    if (!bucketId.trim()) fail("--bucket-id requires a value", jsonOutput);
    args.push("--bucket-id", bucketId);
  }
  if (sourceType === "bucket" && bucketId === undefined) {
    fail("--bucket-id is required when --source-type is bucket", jsonOutput);
  }
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

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = nonEmptyStringFlag(flags, key);
  if (!value) fail(`--${key} is required`, jsonOutput);
  return value;
}

function addOptionalStringFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): number {
  const value = optionalStringFlag(flags, name);
  if (value === undefined) return 0;
  if (!value.trim()) fail(`--${name} requires a value`, jsonOutput);
  args.push(`--${name}`, value);
  return 1;
}

function addPositiveIntegerFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = optionalStringFlag(flags, name);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${name} must be a positive integer`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function requireConfirm(flags: Flags, action: string, jsonOutput: boolean): void {
  if (flags.confirm !== true) fail(`pass a bare --confirm to ${action}`, jsonOutput);
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

function responseDataRecord(value: unknown): JsonRecord {
  const data = asRecord(value).data;
  return asRecord(data);
}

function recordsFromData(value: unknown): JsonRecord[] {
  const data = Array.isArray(value) ? value : asRecord(value).data;
  return Array.isArray(data)
    ? data.filter(
      (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    : [];
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
