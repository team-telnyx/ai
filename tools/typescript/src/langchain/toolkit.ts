/**
 * LangChain.js adapter for the Telnyx Agent Toolkit.
 *
 * Formats tools as DynamicStructuredTool instances from @langchain/core.
 */

import type { ToolDefinition } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";
import { buildToolParametersZodSchema } from "../shared/tool-parameters-zod.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    } catch {
      throw new Error(
        "LangChain is required for LangChain tools. Install with: npm install @langchain/core",
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      z = require("zod").z;
    } catch {
      throw new Error(
        "Zod is required for LangChain tools. Install with: npm install zod",
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
