/**
 * Telnyx Agent Toolkit — Main entry point.
 */

export { TelnyxAPIClient, TelnyxAPIError } from "./shared/api-client.js";
export type { TelnyxAPIClientOptions } from "./shared/api-client.js";
export { ToolkitCore } from "./shared/toolkit-core.js";
export { TelemetryReporter } from "./shared/telemetry.js";
export type { TelemetryEvent } from "./shared/telemetry.js";
export { FrictionReporter } from "./shared/friction.js";
export type { FrictionReport } from "./shared/friction.js";
export { TOOL_DEFINITIONS, PERMISSION_MAP } from "./shared/constants.js";
export type { ToolDefinition, ToolParameter } from "./shared/constants.js";
export { OpenAIToolkit } from "./openai/toolkit.js";
export type { OpenAIToolCall } from "./openai/toolkit.js";
export { VercelAIToolkit } from "./vercel-ai/toolkit.js";
export { LangChainToolkit } from "./langchain/toolkit.js";

import { TelnyxAPIClient } from "./shared/api-client.js";
import {
  TOOL_DEFINITIONS,
  PERMISSION_MAP,
  type ToolDefinition,
} from "./shared/constants.js";
import { ToolkitCore } from "./shared/toolkit-core.js";
import { FrictionReporter } from "./shared/friction.js";
import { TelemetryReporter } from "./shared/telemetry.js";
import { OpenAIToolkit } from "./openai/toolkit.js";
import { VercelAIToolkit } from "./vercel-ai/toolkit.js";
import { LangChainToolkit } from "./langchain/toolkit.js";

/**
 * Configuration for the Telnyx Agent Toolkit.
 */
export interface TelnyxConfig {
  /** Permission map: { category: { actionKey: boolean } } */
  actions?: Record<string, Record<string, boolean>>;
  /** Additional context to pass through */
  context?: Record<string, unknown>;
}

export interface TelnyxAgentToolkitOptions {
  configuration?: TelnyxConfig;
  baseUrl?: string;
  telemetryEndpoint?: string;
  frictionEndpoint?: string;
  frictionEnabled?: boolean;
}

/**
 * Main entry point for the Telnyx Agent Toolkit.
 *
 * @example
 * ```typescript
 * const toolkit = new TelnyxAgentToolkit("KEY...", {
 *   configuration: {
 *     actions: {
 *       messaging: { send_sms: true },
 *       numbers: { list: true, search: true },
 *     },
 *   },
 * });
 * const tools = toolkit.getOpenAITools();
 * ```
 */
export class TelnyxAgentToolkit {
  private readonly config: TelnyxConfig;
  private readonly client: TelnyxAPIClient;
  private readonly _core: ToolkitCore;
  private readonly _enabledTools: ToolDefinition[];

  constructor(apiKey: string, options: TelnyxAgentToolkitOptions = {}) {
    this.config = options.configuration ?? {};
    this.client = new TelnyxAPIClient(apiKey, {
      baseUrl: options.baseUrl,
    });
    const telemetry = new TelemetryReporter(options.telemetryEndpoint);
    const friction = new FrictionReporter(options.frictionEndpoint, options.frictionEnabled);
    this._core = new ToolkitCore(this.client, telemetry, friction);
    this._enabledTools = this.resolveEnabledTools();
  }

  private resolveEnabledTools(): ToolDefinition[] {
    const actions = this.config.actions;
    if (!actions || Object.keys(actions).length === 0) {
      return Object.values(TOOL_DEFINITIONS);
    }

    const enabled: ToolDefinition[] = [];
    const seen = new Set<string>();

    for (const [category, categoryActions] of Object.entries(actions)) {
      for (const [actionKey, isEnabled] of Object.entries(categoryActions)) {
        if (!isEnabled) continue;

        let toolName = PERMISSION_MAP[`${category}.${actionKey}`];

        if (!toolName && actionKey in TOOL_DEFINITIONS) {
          toolName = actionKey;
        }

        if (toolName && toolName in TOOL_DEFINITIONS && !seen.has(toolName)) {
          enabled.push(TOOL_DEFINITIONS[toolName]);
          seen.add(toolName);
        }
      }
    }

    return enabled;
  }

  /** Access the underlying API client. */
  get apiClient(): TelnyxAPIClient {
    return this.client;
  }

  /** Access the toolkit core for direct tool execution. */
  get core(): ToolkitCore {
    return this._core;
  }

  /** List of enabled tool definitions. */
  get enabledTools(): ToolDefinition[] {
    return this._enabledTools;
  }

  /**
   * Get tools formatted for OpenAI function calling.
   */
  getOpenAITools(): Record<string, unknown>[] {
    const adapter = new OpenAIToolkit(this._core, this._enabledTools);
    return adapter.getTools();
  }

  /**
   * Get an OpenAI tool executor that can run tool calls.
   */
  getOpenAIToolExecutor(): OpenAIToolkit {
    return new OpenAIToolkit(this._core, this._enabledTools);
  }

  /**
   * Get tools formatted for Vercel AI SDK.
   */
  getVercelAITools(): Record<string, unknown> {
    const adapter = new VercelAIToolkit(this._core, this._enabledTools);
    return adapter.getTools();
  }

  /**
   * Get tools formatted for LangChain.js.
   */
  getLangChainTools(): unknown[] {
    const adapter = new LangChainToolkit(this._core, this._enabledTools);
    return adapter.getTools();
  }
}
