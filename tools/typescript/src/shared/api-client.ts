/**
 * Telnyx API client using native fetch (Node 18+).
 */

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

export interface TelnyxAPIClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class TelnyxAPIClient {
  readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    apiKey: string,
    options: TelnyxAPIClientOptions = {},
  ) {
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.telnyx.com/v2").replace(
      /\/$/,
      "",
    );
    this.timeout = options.timeout ?? 30000;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async handleResponse(
    response: Response,
  ): Promise<Record<string, unknown>> {
    if (response.status >= 400) {
      let detail: string;
      let errors: Record<string, unknown>[] = [];
      try {
        const body = (await response.json()) as Record<string, unknown>;
        const bodyErrors = body.errors as Record<string, unknown>[] | undefined;
        if (bodyErrors && bodyErrors.length > 0) {
          errors = bodyErrors;
          detail = (bodyErrors[0].detail as string) ?? response.statusText;
        } else {
          detail = response.statusText;
        }
      } catch {
        detail = response.statusText;
      }
      throw new TelnyxAPIError(response.status, detail, errors);
    }

    if (response.status === 204) {
      return {};
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async get(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let url = `${this.baseUrl}${path}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            searchParams.append(key, String(item));
          }
        } else {
          searchParams.append(key, String(value));
        }
      }
      url += `?${searchParams.toString()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      return await this.handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post(
    path: string,
    json?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: json ? JSON.stringify(json) : undefined,
        signal: controller.signal,
      });
      return await this.handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async delete(path: string): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      return await this.handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
