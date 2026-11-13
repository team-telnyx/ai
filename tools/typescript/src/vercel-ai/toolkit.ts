/**
 * Vercel AI SDK adapter for the Telnyx Agent Toolkit.
 *
 * Formats tools for use with `generateText({ tools: {...} })` from the `ai` package.
 */

import { createRequire } from "node:module";

import type { ToolDefinition } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";
import { buildToolParametersZodSchema } from "../shared/tool-parameters-zod.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Keep the public factory synchronous without relying on a global CJS require.
const require = createRequire(import.meta.url);

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
    } catch (cause) {
      throw new Error(
        "Unable to load Vercel AI SDK synchronously. If missing, install with: npm install ai; otherwise check the cause and use a compatible synchronous SDK version.",
        { cause },
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      z = require("zod").z;
    } catch (cause) {
      throw new Error(
        "Unable to load Zod synchronously for Vercel AI tools. If missing, install with: npm install zod; otherwise check the cause.",
        { cause },
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
