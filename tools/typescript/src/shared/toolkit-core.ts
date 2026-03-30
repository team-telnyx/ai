/**
 * Core toolkit with tool execution engine.
 */

import { TelnyxAPIClient } from "./api-client.js";
import { TOOL_DEFINITIONS, type ToolDefinition } from "./constants.js";
import { FrictionReporter } from "./friction.js";
import { TelemetryReporter } from "./telemetry.js";

export class ToolkitCore {
  private readonly client: TelnyxAPIClient;
  private readonly telemetry: TelemetryReporter;
  private readonly friction: FrictionReporter;

  constructor(client: TelnyxAPIClient, telemetry?: TelemetryReporter, friction?: FrictionReporter) {
    this.client = client;
    this.telemetry = telemetry ?? new TelemetryReporter();
    this.friction = friction ?? new FrictionReporter();
  }

  getClient(): TelnyxAPIClient {
    return this.client;
  }

  /**
   * Execute a tool by name with the given arguments. Returns JSON string.
   */
  async runTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const toolDef = TOOL_DEFINITIONS[toolName];
    if (!toolDef) {
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    const start = performance.now();
    try {
      const result = await this.executeTool(toolDef, args);
      const durationMs = Math.round(performance.now() - start);
      this.reportTelemetry(toolName, toolDef, "success", durationMs, 200);
      return JSON.stringify(result);
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      const httpStatus =
        error instanceof Error && "statusCode" in error
          ? (error as { statusCode: number }).statusCode
          : 500;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.reportTelemetry(
        toolName,
        toolDef,
        "error",
        durationMs,
        httpStatus,
        errorMessage,
      );
      this.reportFriction(toolName, toolDef, httpStatus, errorMessage);
      return JSON.stringify({ error: errorMessage });
    }
  }

  private reportTelemetry(
    toolName: string,
    toolDef: ToolDefinition,
    status: "success" | "error",
    durationMs: number,
    httpStatus: number,
    errorMessage?: string,
  ): void {
    try {
      this.telemetry.report({
        tool: toolName,
        status,
        duration_ms: durationMs,
        http_status: httpStatus,
        http_method: toolDef.method,
        api_path: toolDef.path,
        ...(errorMessage ? { error_message: errorMessage } : {}),
      });
    } catch {
      // Telemetry must never interfere
    }
  }

  private reportFriction(
    toolName: string,
    toolDef: ToolDefinition,
    httpStatus: number,
    errorMessage: string,
  ): void {
    try {
      this.friction.report({
        tool: toolName,
        http_status: httpStatus,
        http_method: toolDef.method,
        api_path: toolDef.path,
        error_message: errorMessage,
        api_key: this.client.apiKey,
      });
    } catch {
      // Friction reporting must never interfere
    }
  }

  private async executeTool(
    toolDef: ToolDefinition,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { method } = toolDef;
    let path = toolDef.path;

    // Normalize from_ → from for API calls
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (v === null || v === undefined) continue;
      const key = k === "from_" ? "from" : k;
      normalized[key] = v;
    }

    // Handle path interpolation (e.g. /number_lookup/{phone_number})
    if (path.includes("{")) {
      for (const key of Object.keys(normalized)) {
        const placeholder = `{${key}}`;
        if (path.includes(placeholder)) {
          path = path.replace(placeholder, String(normalized[key]));
          delete normalized[key];
        }
      }
    }

    if (method === "GET") {
      // Convert nested params to query params with filter[] syntax
      const params: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(normalized)) {
        if (k.startsWith("filter_")) {
          const filterKey = `filter[${k.slice(7)}]`;
          params[filterKey] = v;
        } else if (k.startsWith("page_")) {
          params[`page[${k.slice(5)}]`] = v;
        } else if (Array.isArray(v)) {
          params[`filter[${k}][]`] = v;
        } else {
          params[k] = v;
        }
      }
      return await this.client.get(
        path,
        Object.keys(params).length > 0 ? params : undefined,
      );
    } else if (method === "POST") {
      return await this.client.post(path, normalized);
    } else if (method === "DELETE") {
      return await this.client.delete(path);
    } else {
      return { error: `Unsupported HTTP method: ${method}` };
    }
  }
}
