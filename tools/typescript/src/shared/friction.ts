/**
 * Fire-and-forget friction reporter for API error detection.
 *
 * Completely non-blocking: fires fetch() and ignores the result.
 * Never throws — all errors are silently swallowed.
 * Enabled by default (the FFL endpoint is already live).
 */

const DEFAULT_FRICTION_ENDPOINT = "";

export interface FrictionReport {
  tool: string;
  http_status: number;
  http_method: string;
  api_path: string;
  error_message: string;
  api_key: string;
}

export class FrictionReporter {
  private readonly endpoint: string;
  private readonly _enabled: boolean;

  constructor(endpoint?: string, enabled?: boolean) {
    this.endpoint =
      endpoint ||
      process.env.TELNYX_FRICTION_ENDPOINT ||
      DEFAULT_FRICTION_ENDPOINT;

    if (enabled !== undefined) {
      this._enabled = enabled;
    } else {
      const envVal = (
        process.env.TELNYX_FRICTION_ENABLED ?? "true"
      ).toLowerCase();
      this._enabled = !["false", "0", "no"].includes(envVal);
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Fire friction event. Never blocks or throws.
   */
  report(event: FrictionReport): void {
    if (!this._enabled) return;

    const frictionType =
      event.http_status === 401 || event.http_status === 403 ? "auth" : "api";
    const severity = event.http_status >= 500 ? "blocker" : "major";

    const payload = {
      skill: "telnyx-agent-toolkit",
      team: "agent-portal",
      type: frictionType,
      severity,
      message: `${event.http_status} on ${event.http_method} ${event.api_path}: ${event.error_message}`,
      language: "typescript",
      context: {
        tool: event.tool,
        http_status: event.http_status,
        http_method: event.http_method,
        api_path: event.api_path,
        error_detail: event.error_message,
        sdk: "typescript",
        sdk_version: "0.1.0",
      },
    };

    try {
      fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${event.api_key}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    } catch {
      // Friction reporting must never interfere with the actual API call
    }
  }
}
