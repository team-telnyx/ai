/**
 * telnyx-agent whatsapp-templates — List or create WhatsApp message templates.
 *
 * Default (list) mode lists templates for a WABA, optionally filtered by status.
 * Create mode (--create) submits a new template for approval.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface WhatsappTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  id?: string;
}

interface WhatsappTemplatesListResult {
  waba_id: string;
  templates: WhatsappTemplate[];
}

interface WhatsappTemplateCreateResult {
  waba_id: string;
  name: string;
  language: string;
  category: string;
  template_id?: string;
  status: string;
}

export async function whatsappTemplatesCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const wabaId = flags["waba-id"] as string;
  const create = flags.create === true;
  const name = flags.name as string;
  const language = (flags.language as string) || "en_US";
  const category = flags.category as string;
  const component = flags.component as string;
  const status = flags.status as string;

  if (!wabaId) {
    printError("--waba-id is required");
    process.exit(1);
  }

  try {
    if (create) {
      // Create mode
      if (!name || !category || !component) {
        printError(
          "Create mode requires --name, --category (UTILITY|MARKETING|AUTHENTICATION), and --component (JSON array)",
        );
        process.exit(1);
      }
      // Validate and expand the component JSON
      // Go CLI v0.21: --component is Flag[[]map[string]any] — requestflag appends one map
      // per --component occurrence. A JSON array as a single value is rejected.
      let components: Array<Record<string, unknown>>;
      try {
        const parsed = JSON.parse(component);
        if (!Array.isArray(parsed)) {
          // Single object — wrap in array
          components = [parsed];
        } else {
          components = parsed;
        }
      } catch {
        printError("--component must be valid JSON");
        process.exit(1);
      }

      const createArgs = [
        "whatsapp:templates", "create",
        "--waba-id", wabaId,
        "--name", name,
        "--language", language,
        "--category", category,
      ];
      // Emit one --component flag per component object (Go CLI slice semantics)
      for (const comp of components) {
        createArgs.push("--component", JSON.stringify(comp));
      }

      const res = await telnyxCli(createArgs);
      const data = (res.data ?? res) as Record<string, unknown>;
      const templateId = String(data.id ?? "");

      const result: WhatsappTemplateCreateResult = {
        waba_id: wabaId,
        name,
        language,
        category,
        template_id: templateId || undefined,
        status: String(data.status ?? "PENDING"),
      };

      if (jsonOutput) {
        outputJson(result);
      } else {
        printSuccess("WhatsApp template created!", {
          "WABA ID": wabaId,
          Name: name,
          Language: language,
          Category: category,
          "Template ID": templateId || "—",
          Status: String(data.status ?? "PENDING"),
        });
      }
    } else {
      // List mode (default)
      const args = ["whatsapp:templates", "list", "--filter-waba-id", wabaId];
      if (status) args.push("--filter-status", status);

      // format: "raw" — list output via --format json is concatenated per-item
      // JSON documents, not a parseable array (see telnyxCli docs).
      const res = await telnyxCli(args, { format: "raw" });
      const raw = (Array.isArray(res) ? res : (res.data as Array<Record<string, unknown>>) ?? []) as Array<Record<string, unknown>>;
      const templates: WhatsappTemplate[] = raw.map((t) => ({
        name: String(t.name ?? ""),
        language: String(t.language ?? ""),
        category: String(t.category ?? ""),
        status: String(t.status ?? ""),
        id: t.id ? String(t.id) : undefined,
      }));

      const result: WhatsappTemplatesListResult = { waba_id: wabaId, templates };

      if (jsonOutput) {
        outputJson(result);
      } else {
        console.log("\n📋 WhatsApp Templates\n");
        if (!templates.length) {
          console.log("  No templates found.");
        } else {
          for (const t of templates) {
            console.log(`  ${t.name} [${t.status}]`);
            console.log(`    language: ${t.language}, category: ${t.category}${t.id ? `, id: ${t.id}` : ""}`);
          }
        }
        console.log();
      }
    }
  } catch (err) {
    if (jsonOutput) {
      outputJson({ waba_id: wabaId, status: "failed", error: errorMsg(err) });
    } else {
      printError(errorMsg(err));
    }
    process.exit(1);
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
