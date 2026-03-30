/**
 * Telnyx API client for the agent CLI.
 * Uses native fetch() — no external HTTP dependencies.
 * Reuses the pattern from packages/typescript/src/shared/api-client.ts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { FrictionReporter } from "./friction.js";
import { TelemetryReporter } from "./telemetry.js";

export class TelnyxAPIError extends Error {
  readonly statusCode: number;
  readonly detail: string;
  readonly errors: Record<string, unknown>[];

  constructor(
    statusCode: number,
    detail: string,
    errors: Record<string, unknown>[] = [],
  ) {
    super(`Telnyx API error ${statusCode}: ${detail}`);
    this.name = "TelnyxAPIError";
    this.statusCode = statusCode;
    this.detail = detail;
    this.errors = errors;
  }
}

export class TelnyxClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly telemetry: TelemetryReporter;
  private readonly friction: FrictionReporter;

  constructor(apiKey?: string, baseUrl?: string, timeout?: number) {
    this.apiKey = apiKey || resolveApiKey();
    this.baseUrl = (baseUrl ?? "https://api.telnyx.com/v2").replace(/\/$/, "");
    this.timeout = timeout ?? 30000;
    this.telemetry = new TelemetryReporter();
    this.friction = new FrictionReporter();
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async handleResponse(response: Response): Promise<Record<string, unknown>> {
    if (response.status >= 400) {
      let detail: string;
      let errors: Record<string, unknown>[] = [];
      try {
        const body = (await response.json()) as Record<string, unknown>;
        const bodyErrors = body.errors as Record<string, unknown>[] | undefined;
        if (bodyErrors?.length) {
          errors = bodyErrors;
          detail = (bodyErrors[0].detail as string) ?? response.statusText;
        } else {
          detail = response.statusText;
        }
      } catch {
        detail = response.statusText;
      }
      const apiError = new TelnyxAPIError(response.status, detail, errors);
      throw apiError;
    }
    if (response.status === 204) return {};
    return (await response.json()) as Record<string, unknown>;
  }

  async get(path: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const sp = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const item of value) sp.append(key, String(item));
        } else {
          sp.append(key, String(value));
        }
      }
      url += `?${sp.toString()}`;
    }
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.timeout);
    const start = performance.now();
    try {
      const res = await fetch(url, { method: "GET", headers: this.headers(), signal: controller.signal });
      const result = await this.handleResponse(res);
      this.reportTelemetry("GET", path, Math.round(performance.now() - start), res.status);
      return result;
    } catch (error) {
      const httpStatus = (error as any)?.statusCode ?? 500;
      this.reportTelemetry("GET", path, Math.round(performance.now() - start), httpStatus, error);
      this.reportFriction("GET", path, httpStatus, error);
      throw error;
    } finally {
      clearTimeout(tid);
    }
  }

  async post(path: string, json?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.timeout);
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.headers(),
        body: json ? JSON.stringify(json) : undefined,
        signal: controller.signal,
      });
      const result = await this.handleResponse(res);
      this.reportTelemetry("POST", path, Math.round(performance.now() - start), res.status);
      return result;
    } catch (error) {
      const httpStatus = (error as any)?.statusCode ?? 500;
      this.reportTelemetry("POST", path, Math.round(performance.now() - start), httpStatus, error);
      this.reportFriction("POST", path, httpStatus, error);
      throw error;
    } finally {
      clearTimeout(tid);
    }
  }

  async patch(path: string, json?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.timeout);
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "PATCH",
        headers: this.headers(),
        body: json ? JSON.stringify(json) : undefined,
        signal: controller.signal,
      });
      const result = await this.handleResponse(res);
      this.reportTelemetry("PATCH", path, Math.round(performance.now() - start), res.status);
      return result;
    } catch (error) {
      const httpStatus = (error as any)?.statusCode ?? 500;
      this.reportTelemetry("PATCH", path, Math.round(performance.now() - start), httpStatus, error);
      this.reportFriction("PATCH", path, httpStatus, error);
      throw error;
    } finally {
      clearTimeout(tid);
    }
  }

  async delete(path: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.timeout);
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "DELETE",
        headers: this.headers(),
        signal: controller.signal,
      });
      const result = await this.handleResponse(res);
      this.reportTelemetry("DELETE", path, Math.round(performance.now() - start), res.status);
      return result;
    } catch (error) {
      const httpStatus = (error as any)?.statusCode ?? 500;
      this.reportTelemetry("DELETE", path, Math.round(performance.now() - start), httpStatus, error);
      this.reportFriction("DELETE", path, httpStatus, error);
      throw error;
    } finally {
      clearTimeout(tid);
    }
  }

  private reportFriction(method: string, path: string, httpStatus: number, error: unknown): void {
    try {
      const errorMessage = error instanceof TelnyxAPIError
        ? error.detail
        : error instanceof Error
          ? error.message
          : String(error);
      this.friction.report({
        tool: path.replace(/^\//, "").replace(/\//g, "_"),
        http_status: httpStatus,
        http_method: method,
        api_path: path,
        error_message: errorMessage,
        api_key: this.apiKey,
      });
    } catch {
      // Friction must never interfere
    }
  }

  private reportTelemetry(method: string, path: string, durationMs: number, httpStatus: number, error?: unknown): void {
    try {
      this.telemetry.report({
        tool: path.replace(/^\//, "").replace(/\//g, "_"),
        status: error ? "error" : "success",
        duration_ms: durationMs,
        http_status: httpStatus,
        http_method: method,
        api_path: path,
        ...(error ? { error_message: error instanceof Error ? error.message : String(error) } : {}),
      });
    } catch {
      // Telemetry must never interfere
    }
  }
}

/**
 * Resolve API key from env var or config file.
 */
function resolveApiKey(): string {
  // 1. Environment variable
  if (process.env.TELNYX_API_KEY) {
    return process.env.TELNYX_API_KEY;
  }

  // 2. Config file (~/.config/telnyx/config.json)
  try {
    const configPath = join(homedir(), ".config", "telnyx", "config.json");
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const profiles = config.profiles as Record<string, Record<string, string>> | undefined;
    if (profiles?.default?.api_key) return profiles.default.api_key;
    if (profiles?.default?.apiKey) return profiles.default.apiKey;
    if (typeof config.api_key === "string") return config.api_key;
    if (typeof config.apiKey === "string") return config.apiKey;
  } catch {
    // Config file not found or invalid — fall through
  }

  throw new Error(
    "No Telnyx API key found.\n" +
    "Set TELNYX_API_KEY environment variable or configure ~/.config/telnyx/config.json",
  );
}
