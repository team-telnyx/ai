/**
 * LangChain.js adapter for the Telnyx Agent Toolkit.
 *
 * Formats tools as DynamicStructuredTool instances from @langchain/core.
 */

import { createRequire } from "node:module";

import type { ToolDefinition } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";
import { buildToolParametersZodSchema } from "../shared/tool-parameters-zod.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Keep the public factory synchronous without relying on a global CJS require.
const require = createRequire(import.meta.url);

export class LangChainToolkit {
  private readonly core: ToolkitCore;
  private readonly tools: ToolDefinition[];

  constructor(core: ToolkitCore, tools: ToolDefinition[]) {
    this.core = core;
    this.tools = tools;
  }

  /**
   * Get a list of LangChain DynamicStructuredTool instances.
   */
  getTools(): any[] {
    let DynamicStructuredTool: any;
    let z: any;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      DynamicStructuredTool = require("@langchain/core/tools").DynamicStructuredTool;
    } catch (cause) {
      throw new Error(
        "Unable to load LangChain synchronously. If missing, install with: npm install @langchain/core; otherwise check the cause and use a compatible synchronous SDK version.",
        { cause },
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      z = require("zod").z;
    } catch (cause) {
      throw new Error(
        "Unable to load Zod synchronously for LangChain tools. If missing, install with: npm install zod; otherwise check the cause.",
        { cause },
      );
    }

    const result: any[] = [];

    for (const toolDef of this.tools) {
      const core = this.core;
      const toolName = toolDef.name;
      const zodSchema = buildToolParametersZodSchema(z, toolDef.parameters);

      const tool = new DynamicStructuredTool({
        name: toolDef.name,
        description: toolDef.description,
        schema: zodSchema,
        func: async (args: Record<string, unknown>) => {
          return core.runTool(toolName, args);
        },
      });

      result.push(tool);
    }

    return result;
  }
}
