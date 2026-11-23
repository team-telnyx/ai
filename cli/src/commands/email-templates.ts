/**
 * Agent-friendly lifecycle wrappers for reusable Liquid email templates.
 *
 * The generated Go CLI exposes this resource as `email-templates`; this module
 * adds stable agent command names, input validation, and local delete safety.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
type TemplateMutation = "create" | "update" | "replace";

interface EmailTemplateResult {
  email_template_id: string;
  email_template: JsonRecord;
}

interface EmailTemplateListResult {
  count: number;
  email_templates: JsonRecord[];
  meta: JsonRecord;
}

const EMAIL_TEMPLATE_CLI_MINIMUM_VERSION = "0.32.0";
const MUTATION_STRING_FLAGS = ["html-body", "name", "subject", "text-body", "variables-mode"] as const;
const MUTATION_BOOLEAN_FLAGS = ["autoescape", "strict-variables"] as const;
const LIST_FILTER_FLAGS = [
  "filter-autoescape",
  "filter-content-type",
  "filter-query",
  "filter-strict-variables",
  "page-cursor",
  "page-size",
  "max-items",
] as const;

export async function createEmailTemplateCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredString(flags, "name", "the template name", jsonOutput);
  const args = ["email-templates", "create", "--name", name];
  addTemplateMutationFlags(args, flags, "create", jsonOutput);
  addStringFlag(args, flags, "idempotency-key", jsonOutput);
  await runTemplateMutation("Email template created!", args, jsonOutput);
}

export async function getEmailTemplateCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = templateId(flags, jsonOutput);
  try {
    const response = await telnyxCli(["email-templates", "retrieve", "--id", id], templateCliOptions());
    presentTemplate("Email template retrieved!", normalizeTemplate(response, id), jsonOutput);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function listEmailTemplatesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["email-templates", "list"];
  addListFlags(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { ...templateCliOptions(), format: "raw" });
    presentTemplateList(normalizeTemplateList(response), jsonOutput);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function updateEmailTemplateCommand(flags: Flags): Promise<void> {
  await mutateExistingTemplate("update", flags);
}

export async function replaceEmailTemplateCommand(flags: Flags): Promise<void> {
  // Upstream documents replace as PATCH-compatible, so it does not discard
  // unspecified fields and does not need a destructive-operation confirmation.
  await mutateExistingTemplate("replace", flags);
}

export async function deleteEmailTemplateCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = templateId(flags, jsonOutput);
  if (flags.confirm !== true) {
    fail("--confirm is required to delete an email template", jsonOutput);
  }

  try {
    await telnyxCli(["email-templates", "delete", "--id", id], templateCliOptions());
    const result = { email_template_id: id, deleted: true };
    if (jsonOutput) outputJson(result);
    else printSuccess("Email template deleted!", { "Email Template ID": id, Deleted: true });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function renderEmailTemplateCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = templateId(flags, jsonOutput);
  const args = ["email-templates", "render", "--id", id];
  addJsonObjectFlag(args, flags, "template-variables", false, jsonOutput);

  try {
    const response = await telnyxCli(args, templateCliOptions());
    const envelope = asRecord(response);
    const renderedTemplate = asRecord(envelope.data ?? response);
    const result = { email_template_id: id, rendered_template: renderedTemplate };
    if (jsonOutput) outputJson(result);
    else printSuccess("Email template rendered!", {
      "Email Template ID": id,
      Subject: stringValue(renderedTemplate.subject) || "(empty)",
    });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

async function mutateExistingTemplate(mutation: "update" | "replace", flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = templateId(flags, jsonOutput);
  const args = ["email-templates", mutation, "--id", id];
  const mutationCount = addTemplateMutationFlags(args, flags, mutation, jsonOutput);
  if (mutationCount === 0) fail(`at least one template field must be provided to ${mutation}`, jsonOutput);
  await runTemplateMutation(`Email template ${mutation}d!`, args, jsonOutput, id);
}

async function runTemplateMutation(
  title: string,
  args: string[],
  jsonOutput: boolean,
  fallbackId = "",
): Promise<void> {
  try {
    const response = await telnyxCli(args, templateCliOptions());
    presentTemplate(title, normalizeTemplate(response, fallbackId), jsonOutput);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

function addTemplateMutationFlags(
  args: string[],
  flags: Flags,
  mutation: TemplateMutation,
  jsonOutput: boolean,
): number {
  let count = 0;
  for (const name of MUTATION_STRING_FLAGS) {
    if (name === "name" && mutation === "create") continue;
    count += addStringFlag(args, flags, name, jsonOutput);
  }
  for (const name of MUTATION_BOOLEAN_FLAGS) {
    count += addBooleanFlag(args, flags, name, jsonOutput);
  }
  count += addJsonObjectFlag(args, flags, "variable-schema", mutation !== "create", jsonOutput);
  count += addVariableFlag(args, flags, jsonOutput);
  return count;
}

function addListFlags(args: string[], flags: Flags, jsonOutput: boolean): void {
  for (const name of LIST_FILTER_FLAGS) {
    const value = flags[name];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.length === 0) fail(`--${name} requires a value`, jsonOutput);

    if (["filter-autoescape", "filter-strict-variables"].includes(name) && !["true", "false"].includes(value)) {
      fail(`--${name} must be true or false`, jsonOutput);
    }
    if (name === "filter-content-type" && !["html_and_text", "html_only", "text_only", "no_body"].includes(value)) {
      fail("--filter-content-type must be html_and_text, html_only, text_only, or no_body", jsonOutput);
    }
    if (name === "page-size" && !isPositiveSafeInteger(value)) {
      fail("--page-size must be a positive safe integer", jsonOutput);
    }
    if (name === "max-items" && value !== "-1" && !isPositiveSafeInteger(value)) {
      fail("--max-items must be -1 or a positive safe integer", jsonOutput);
    }
    args.push(`--${name}`, value);
  }
}

function addStringFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): number {
  const value = flags[name];
  if (value === undefined) return 0;
  if (typeof value !== "string") fail(`--${name} requires a value`, jsonOutput);
  args.push(`--${name}`, value);
  return 1;
}

function addBooleanFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): number {
  const value = flags[name];
  if (value === undefined) return 0;
  if (value === true || value === "true") args.push(`--${name}=true`);
  else if (value === false || value === "false") args.push(`--${name}=false`);
  else fail(`--${name} must be true or false`, jsonOutput);
  return 1;
}

function addJsonObjectFlag(
  args: string[],
  flags: Flags,
  name: "template-variables" | "variable-schema",
  nullable: boolean,
  jsonOutput: boolean,
): number {
  const value = flags[name];
  if (value === undefined) return 0;
  if (typeof value !== "string") fail(`--${name} must be a JSON object${nullable ? " or null" : ""}`, jsonOutput);
  try {
    const parsed: unknown = JSON.parse(value);
    if ((parsed === null && !nullable) || (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed)))) {
      throw new Error("not a valid object");
    }
    args.push(`--${name}`, JSON.stringify(parsed));
    return 1;
  } catch {
    fail(`--${name} must be a JSON object${nullable ? " or null" : ""}`, jsonOutput);
  }
}

function addVariableFlag(args: string[], flags: Flags, jsonOutput: boolean): number {
  const value = flags.variable;
  if (value === undefined) return 0;
  if (typeof value !== "string") fail("--variable must be a JSON array or null", jsonOutput);
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && !Array.isArray(parsed)) throw new Error("not an array");
    args.push("--variable", JSON.stringify(parsed));
    return 1;
  } catch {
    fail("--variable must be a JSON array or null", jsonOutput);
  }
}

function templateId(flags: Flags, jsonOutput: boolean): string {
  return requiredString(flags, "id", "the email template ID", jsonOutput);
}

function requiredString(flags: Flags, name: string, description: string, jsonOutput: boolean): string {
  const value = flags[name];
  if (typeof value !== "string" || value.length === 0) {
    fail(`--${name} is required (${description})`, jsonOutput);
  }
  return value;
}

function normalizeTemplate(response: unknown, fallbackId = ""): EmailTemplateResult {
  const envelope = asRecord(response);
  const template = asRecord(envelope.data ?? response);
  return {
    email_template_id: stringValue(template.id) || fallbackId,
    email_template: template,
  };
}

function normalizeTemplateList(response: unknown): EmailTemplateListResult {
  const envelope = asRecord(response);
  const rawTemplates = Array.isArray(response) ? response : Array.isArray(envelope.data) ? envelope.data : [];
  const emailTemplates = rawTemplates.filter(
    (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
  return {
    count: emailTemplates.length,
    email_templates: emailTemplates,
    meta: asRecord(envelope.meta),
  };
}

function presentTemplate(title: string, result: EmailTemplateResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  const template = result.email_template;
  printSuccess(title, {
    "Email Template ID": result.email_template_id || "(not returned)",
    Name: stringValue(template.name) || "(not returned)",
    Subject: stringValue(template.subject) || "(not configured)",
  });
}

function presentTemplateList(result: EmailTemplateListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Email templates retrieved!", { Count: result.count });
  for (const template of result.email_templates) {
    console.log(`  • ${stringValue(template.name) || "(unnamed)"} — ${stringValue(template.id) || "(unknown)"}`);
  }
  if (result.count === 0) console.log("  (no email templates returned)");
  console.log();
}

function templateCliOptions(): { minimumVersion: string } {
  return { minimumVersion: EMAIL_TEMPLATE_CLI_MINIMUM_VERSION };
}

function isPositiveSafeInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
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

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
