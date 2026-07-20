/**
 * Vercel AI SDK adapter for the Telnyx Agent Toolkit.
 *
 * Formats tools for use with `generateText({ tools: {...} })` from the `ai` package.
 */

import type { ToolDefinition } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";
import { buildToolParametersZodSchema } from "../shared/tool-parameters-zod.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export class VercelAIToolkit {
  private readonly core: ToolkitCore;
  private readonly tools: ToolDefinition[];

  constructor(core: ToolkitCore, tools: ToolDefinition[]) {
    this.core = core;
    this.tools = tools;
  }

  /**
   * Get tools formatted for Vercel AI SDK's `generateText({ tools })`.
   */
  getTools(): Record<string, unknown> {
    let tool: any;
    let z: any;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      tool = require("ai").tool;
    } catch {
      throw new Error(
        "Vercel AI SDK is required for Vercel AI tools. Install with: npm install ai",
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      z = require("zod").z;
    } catch {
      throw new Error(
        "Zod is required for Vercel AI tools. Install with: npm install zod",
      );
    }

    const result: Record<string, unknown> = {};

    for (const toolDef of this.tools) {
      const core = this.core;
      const toolName = toolDef.name;
      const zodSchema = buildToolParametersZodSchema(z, toolDef.parameters);

      result[toolDef.name] = tool({
        description: toolDef.description,
        parameters: zodSchema,
        execute: async (args: Record<string, unknown>) => {
          const resultStr = await core.runTool(toolName, args);
          return JSON.parse(resultStr);
        },
      });
    }

    return result;
  }
}
