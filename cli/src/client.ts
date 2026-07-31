/**
 * Telnyx API client — ONLY for operations with no CLI equivalent.
 *
 * The following 9 operations have no `telnyx` CLI command and must use direct API calls:
 * 1. POST /texml_applications (setup-ai)
 * 2. POST /sim_card_groups (setup-iot)
 * 3. PATCH /sim_cards/:id (setup-iot)
 * 4. POST /networks (setup-wireguard)
 * 5. POST /wireguard_interfaces (setup-wireguard)
 * 6. POST /wireguard_peers (setup-wireguard)
 * 7. POST /x402/credit_account/quote (fund-account)
 * 8. POST /x402/credit_account (fund-account)
 * 9. POST /verify_profiles (setup-verify)
 *
 * Additionally, some operations use direct REST due to Go CLI bugs (see commit history):
 * - POST /text-to-speech/speech (tts — Go CLI does not map --voice to the API body)
 * - POST /messages (schedule-sms — Go CLI hits nonexistent /messages/schedule endpoint)
 * - POST /verify_profiles (setup-verify — Go CLI sends no channel settings)
 * - PATCH /phone_numbers/:id (setup-voice, setup-sms — Go CLI doesn't support --force / --messaging-profile-id)
 * - POST /call_control_applications (setup-voice — Go CLI creates credential connections, not Call Control Apps)
 * - GET /outbound_voice_profiles (setup-voice — needed to resolve default outbound profile)
 *
 * All other operations go through the telnyx CLI wrapper (see telnyx-cli.ts).
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
    this.baseUrl = (baseUrl ?? process.env.TELNYX_API_BASE_URL ?? "https://api.telnyx.com/v2").replace(/\/$/, "");
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
    } catch (rawError) {
      const error = this.normalizeNetworkError("GET", path, rawError);
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
    } catch (rawError) {
      const error = this.normalizeNetworkError("POST", path, rawError);
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
    } catch (rawError) {
      const error = this.normalizeNetworkError("PATCH", path, rawError);
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
    } catch (rawError) {
      const error = this.normalizeNetworkError("DELETE", path, rawError);
      const httpStatus = (error as any)?.statusCode ?? 500;
      this.reportTelemetry("DELETE", path, Math.round(performance.now() - start), httpStatus, error);
      this.reportFriction("DELETE", path, httpStatus, error);
      throw error;
    } finally {
      clearTimeout(tid);
    }
  }

  /**
   * Turn an opaque low-level fetch failure into an actionable message. Node's
   * fetch throws a bare `TypeError: fetch failed` with the real reason buried in
   * `.cause`, which surfaced to newcomers as just "fetch failed". This unwraps
   * the cause (ECONNREFUSED / ENOTFOUND / abort/timeout) into plain guidance and
   * leaves already-structured errors (TelnyxAPIError) untouched.
   */
  private normalizeNetworkError(method: string, path: string, error: unknown): unknown {
    if (error instanceof TelnyxAPIError) return error;
    const url = `${this.baseUrl}${path}`;
    // AbortController fires on timeout.
    if (error instanceof Error && error.name === "AbortError") {
      return new Error(`Request timed out after ${this.timeout}ms: ${method} ${url}. Check your network or increase the timeout.`);
    }
    if (error instanceof Error && error.message === "fetch failed") {
      const cause = (error as any).cause;
      const code = cause?.code as string | undefined;
      const hint =
        code === "ECONNREFUSED" ? "connection refused — is the API base URL correct and reachable?"
        : code === "ENOTFOUND" ? "DNS lookup failed — check the API host / your internet connection."
        : code === "ETIMEDOUT" ? "connection timed out — check your network."
        : code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ? "TLS certificate problem contacting the API."
        : cause?.message || "could not reach the API.";
      return new Error(`Network error calling ${method} ${url}: ${hint}${code ? ` (${code})` : ""}`);
    }
    return error;
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
