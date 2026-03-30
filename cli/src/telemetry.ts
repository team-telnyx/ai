/**
 * Fire-and-forget telemetry reporter for the agent CLI.
 *
 * Completely non-blocking: fires fetch() and ignores the result.
 * Never throws — all errors are silently swallowed.
 * Disabled by default; enable via TELNYX_TELEMETRY_ENDPOINT env var.
 */

export interface TelemetryEvent {
  tool: string;
  status: "success" | "error";
  duration_ms: number;
  http_status: number;
  http_method: string;
  api_path: string;
  error_message?: string;
  context?: Record<string, unknown>;
}

export class TelemetryReporter {
  private readonly endpoint: string | undefined;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.TELNYX_TELEMETRY_ENDPOINT || "";
  }

  get enabled(): boolean {
    return !!this.endpoint;
  }

  /**
   * Fire telemetry event. Never blocks or throws.
   */
  report(event: TelemetryEvent): void {
    if (!this.endpoint) return;

    const payload = {
      ...event,
      sdk: "cli" as const,
    };

    try {
      fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    } catch {
      // Telemetry must never interfere with the actual API call
    }
  }
}
