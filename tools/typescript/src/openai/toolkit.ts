/**
 * OpenAI function-calling adapter for the Telnyx Agent Toolkit.
 */

import type { ToolDefinition } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";

export interface OpenAIToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export class OpenAIToolkit {
  private readonly core: ToolkitCore;
  private readonly tools: ToolDefinition[];

  constructor(core: ToolkitCore, tools: ToolDefinition[]) {
    this.core = core;
    this.tools = tools;
  }

  /**
   * Get tool definitions formatted for OpenAI's `tools` parameter.
   */
  getTools(): Record<string, unknown>[] {
    return this.tools.map((toolDef) => {
      const properties = toolDef.parameters.properties;

      // Clean up properties for OpenAI (remove defaults from schema)
      const cleanProps: Record<string, Record<string, unknown>> = {};
      for (const [propName, propSchema] of Object.entries(properties)) {
        const cleanProp: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(propSchema)) {
          if (k !== "default") {
            cleanProp[k] = v;
          }
        }
        cleanProps[propName] = cleanProp;
      }

      return {
        type: "function",
        function: {
          name: toolDef.name,
          description: toolDef.description,
          parameters: {
            type: "object",
            properties: cleanProps,
            required: toolDef.parameters.required,
          },
        },
      };
    });
  }

  /**
   * Execute an OpenAI tool call and return the result as a string.
   */
  async execute(toolCall: OpenAIToolCall): Promise<string> {
    const name = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments) as Record<
      string,
      unknown
    >;
    return this.core.runTool(name, args);
  }
}
