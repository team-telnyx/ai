/**
 * Direct document actions backed by the generated Telnyx Go CLI.
 *
 * Uploads accept a publicly reachable URL, caller-provided Base64, or a local
 * regular file. Local bytes are encoded only for the generated CLI request and
 * are never included in this wrapper's output or validation errors.
 */

import { lstatSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface DocumentListResult {
  count: number;
  documents: JsonRecord[];
  meta: JsonRecord;
}

interface DocumentResult {
  document_id: string;
  document: JsonRecord;
}

interface DocumentUploadResult extends DocumentResult {
  attachment_window_minutes: 30;
}

const MAX_DOCUMENT_PAGE_REQUESTS = 1_000;

export async function listDocumentsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["documents", "list"];
  const filter = buildDocumentFilter(flags, jsonOutput);
  if (filter) args.push("--filter", filter);

  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = parseMaxItems(flags, jsonOutput);
  const sort = stringValue(flags, "sort");
  if (sort !== undefined) args.push("--sort", sort);

  try {
    const result = await collectDocumentPages(args, maxItems ?? -1);
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("Documents retrieved!", { Count: result.count });
    for (const document of result.documents) {
      const id = stringFrom(document.id) || "(unknown)";
      const details = [document.filename, document.customer_reference]
        .map(stringFrom)
        .filter(Boolean)
        .join(" · ");
      console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
    }
    if (result.count === 0) console.log("  (no documents returned)");
    console.log();
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function getDocumentCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requireDocumentId(flags, jsonOutput);
  try {
    const response = await telnyxCli(["documents", "retrieve", "--id", id]);
    const document = responseDataRecord(response);
    const result: DocumentResult = {
      document_id: stringFrom(document.id) || id,
      document,
    };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("Document retrieved!", {
      "Document ID": result.document_id,
      Filename: stringFrom(document.filename) || "(not returned)",
      "Customer Reference": stringFrom(document.customer_reference) || "(not returned)",
    });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function uploadDocumentCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const url = stringValue(flags, "url");
  const base64 = stringValue(flags, "file-base64");
  const filePath = stringValue(flags, "file") ?? stringValue(flags, "file-path");
  const inputCount = Number(url !== undefined) + Number(base64 !== undefined) + Number(filePath !== undefined);
  if (inputCount !== 1) {
    failWith("Provide exactly one upload source: --url, --file-base64, or --file", jsonOutput);
  }

  const filename = stringValue(flags, "filename");
  const customerReference = stringValue(flags, "customer-reference");
  let fileContents: string | undefined;
  let requestFilename = filename;

  if (url !== undefined) {
    validatePublicHttpUrl(url, jsonOutput);
  } else if (base64 !== undefined) {
    validateBase64(base64, jsonOutput);
    if (!requestFilename) failWith("--filename is required with --file-base64", jsonOutput);
    fileContents = base64;
  } else {
    const loaded = loadLocalFile(filePath!, jsonOutput);
    fileContents = loaded.base64;
    requestFilename ??= loaded.filename;
  }

  const document: JsonRecord = {
    ...(customerReference ? { customer_reference: customerReference } : {}),
    ...(requestFilename ? { filename: requestFilename } : {}),
    ...(url !== undefined ? { url } : { file: fileContents! }),
  };

  try {
    // The generated CLI accepts request bodies as YAML/JSON on stdin. Keep
    // Base64 file bytes and signed URL query tokens out of the process argv.
    const response = await telnyxCli(["documents", "upload"], { stdin: JSON.stringify(document) });
    const uploaded = responseDataRecord(response);
    const result: DocumentUploadResult = {
      document_id: stringFrom(uploaded.id),
      document: uploaded,
      attachment_window_minutes: 30,
    };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("Document uploaded!", {
      "Document ID": result.document_id || "(not returned)",
      Filename: stringFrom(uploaded.filename) || "(not returned)",
      "Attachment Window": "Link to a service within 30 minutes or it is automatically deleted.",
    });
  } catch (err) {
    // The Go CLI can include request-validation context in stderr. Never allow
    // upload source (including signed URLs) to reach our output.
    fail(errorMessage(err, [fileContents, url]), jsonOutput);
  }
}

function buildDocumentFilter(flags: Flags, jsonOutput: boolean): string | undefined {
  const rawFilter = stringValue(flags, "filter");
  const filenameContains = stringValue(flags, "filename-contains");
  const customerReference = stringValue(flags, "customer-reference");
  const createdAfter = stringValue(flags, "created-after");
  const createdBefore = stringValue(flags, "created-before");
  const hasFriendlyFilter = Boolean(filenameContains || customerReference || createdAfter || createdBefore);

  if (rawFilter !== undefined && hasFriendlyFilter) {
    failWith("--filter cannot be combined with --filename-contains, --customer-reference, --created-after, or --created-before", jsonOutput);
  }
  if (rawFilter !== undefined) {
    try {
      const parsed = JSON.parse(rawFilter);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    } catch {
      failWith("--filter must be a JSON object", jsonOutput);
    }
    return rawFilter;
  }
  if (!hasFriendlyFilter) return undefined;

  return JSON.stringify({
    ...(filenameContains ? { filename: { contains: filenameContains } } : {}),
    ...(customerReference ? { customer_reference: { in: [customerReference] } } : {}),
    ...((createdAfter || createdBefore)
      ? { created_at: { ...(createdAfter ? { gt: createdAfter } : {}), ...(createdBefore ? { lt: createdBefore } : {}) } }
      : {}),
  });
}

function loadLocalFile(filePath: string, jsonOutput: boolean): { base64: string; filename: string } {
  try {
    const stat = lstatSync(filePath);
    if (!stat.isFile()) throw new Error("not a regular file");
    return { base64: readFileSync(filePath).toString("base64"), filename: basename(filePath) };
  } catch {
    failWith("--file must name a readable regular file", jsonOutput);
  }
}

function validatePublicHttpUrl(value: string, jsonOutput: boolean): void {
  try {
    const parsed = new URL(value);
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !parsed.hostname) throw new Error();
  } catch {
    failWith("--url must be a public http(s) URL", jsonOutput);
  }
}

function validateBase64(value: string, jsonOutput: boolean): void {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    failWith("--file-base64 must be valid padded Base64 content", jsonOutput);
  }
}

function requireDocumentId(flags: Flags, jsonOutput: boolean): string {
  const id = stringValue(flags, "id");
  if (!id) failWith("--id is required (document ID)", jsonOutput);
  return id;
}

function addPositiveIntegerFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = stringValue(flags, name);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) failWith(`--${name} must be a positive integer`, jsonOutput);
  args.push(`--${name}`, value);
}

function parseMaxItems(flags: Flags, jsonOutput: boolean): number | undefined {
  const value = flags["max-items"];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    failWith("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  const parsed = Number(value);
  if (!/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(parsed)) {
    failWith("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return parsed;
}

async function collectDocumentPages(baseArgs: string[], maxItems: number): Promise<DocumentListResult> {
  const documents: JsonRecord[] = [];
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  const startingPage = positiveInteger(argumentValue(baseArgs, "--page-number")) ?? 1;
  let requestedPage = startingPage;
  let pagesFetched = 0;
  let stableMeta: JsonRecord = {};
  let hasContributingPage = false;
  let knownLastPage: number | undefined;
  let args = [...baseArgs];

  if (maxItems === 0) {
    return {
      count: 0,
      documents: [],
      meta: aggregateDocumentMeta({}, startingPage, 0, 0),
    };
  }

  while (true) {
    // Protect malformed endpoints that emit endless unique full pages without
    // metadata, but do not truncate an explicitly bounded "unlimited" result.
    if (pagesFetched >= MAX_DOCUMENT_PAGE_REQUESTS && knownLastPage === undefined) {
      throw new Error(`document pagination exceeded ${MAX_DOCUMENT_PAGE_REQUESTS} page requests without a declared end`);
    }
    const response = await telnyxCli(args, { format: "raw" });
    const page = { documents: dataRecords(response), meta: asRecord(asRecord(response).meta) };
    pagesFetched++;
    if (!hasContributingPage) stableMeta = page.meta;
    if (page.documents.length === 0) break;

    const authoritativePage = positiveInteger(page.meta.page_number);
    const signature = JSON.stringify([
      authoritativePage === undefined ? "content" : `page:${authoritativePage}`,
      page.documents,
    ]);
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    let added = 0;
    for (const document of page.documents) {
      const id = document.id;
      if (typeof id === "string" || typeof id === "number") {
        const identity = String(id);
        if (seenIds.has(identity)) continue;
        seenIds.add(identity);
      }
      documents.push(document);
      added++;
    }
    if (added === 0) break;
    if (!hasContributingPage) {
      stableMeta = page.meta;
      hasContributingPage = true;
    }
    if (maxItems !== -1 && documents.length >= maxItems) break;

    const pageSize = positiveInteger(page.meta.page_size)
      ?? positiveInteger(argumentValue(baseArgs, "--page-size"));
    if (pageSize !== undefined && page.documents.length < pageSize) break;

    const responsePage = authoritativePage ?? requestedPage;
    const totalPages = positiveInteger(page.meta.total_pages)
      ?? totalPagesFromResults(page.meta.total_results, pageSize);
    if (totalPages !== undefined) knownLastPage = totalPages;
    if (totalPages !== undefined && responsePage >= totalPages) break;
    if (responsePage < requestedPage) break;
    if (!Number.isSafeInteger(requestedPage + 1)) {
      throw new Error("document pagination cannot advance beyond the maximum safe page number");
    }
    requestedPage++;
    args = withArgument(baseArgs, "--page-number", String(requestedPage));
  }

  const limited = maxItems === -1 ? documents : documents.slice(0, maxItems);
  return {
    count: limited.length,
    documents: limited,
    meta: aggregateDocumentMeta(stableMeta, startingPage, pagesFetched, limited.length),
  };
}

function aggregateDocumentMeta(
  sourceMeta: JsonRecord,
  startingPage: number,
  pagesFetched: number,
  returnedResults: number,
): JsonRecord {
  const { page_number: _pageNumber, ...stableMeta } = sourceMeta;
  return {
    ...stableMeta,
    starting_page: startingPage,
    pages_fetched: pagesFetched,
    returned_results: returnedResults,
  };
}

function argumentValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function withArgument(args: string[], flag: string, value: string): string[] {
  const updated = [...args];
  const index = updated.indexOf(flag);
  if (index >= 0) updated.splice(index, 2, flag, value);
  else updated.push(flag, value);
  return updated;
}

function positiveInteger(value: unknown): number | undefined {
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function totalPagesFromResults(totalResults: unknown, pageSize: number | undefined): number | undefined {
  if (pageSize === undefined) return undefined;
  const total = typeof totalResults === "number"
    ? totalResults
    : typeof totalResults === "string" && /^\d+$/.test(totalResults)
      ? Number(totalResults)
      : Number.NaN;
  return Number.isSafeInteger(total) && total >= 0 ? Math.ceil(total / pageSize) : undefined;
}

function dataRecords(response: unknown): JsonRecord[] {
  const data = asRecord(response).data;
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
}

function errorMessage(err: unknown, sensitiveValues: Array<string | undefined> = []): string {
  const message = err instanceof TelnyxCLIError
    ? err.stderr || err.message
    : err instanceof Error
      ? err.message
      : String(err);
  return sensitiveValues.reduce<string>(
    (redacted, value) => value ? redacted.split(value).join("[REDACTED]") : redacted,
    message,
  );
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
