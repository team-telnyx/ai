/**
 * LangChain.js adapter for the Telnyx Agent Toolkit.
 *
 * Formats tools as DynamicStructuredTool instances from @langchain/core.
 */

import type { ToolDefinition, ToolParameter } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert a JSON Schema property to a Zod schema for LangChain.
 */
function jsonSchemaToZod(
  z: any,
  schema: ToolParameter,
  isRequired: boolean,
): any {
  const schemaType = schema.type;
  let zodType: any;

  if (Array.isArray(schemaType)) {
    zodType = z.union([z.string(), z.array(z.string())]);
  } else if (schemaType === "array") {
    const itemsType =
      (schema.items as Record<string, string> | undefined)?.type ?? "string";
    if (itemsType === "object") {
      zodType = z.array(z.record(z.string(), z.unknown()));
    } else {
      zodType = z.array(z.string());
    }
  } else if (schemaType === "object") {
    zodType = z.record(z.string(), z.unknown());
  } else if (schemaType === "integer") {
    zodType = z.number().int();
  } else if (schemaType === "number") {
    zodType = z.number();
  } else if (schemaType === "boolean") {
    zodType = z.boolean();
  } else {
    zodType = z.string();
  }

  if (schema.enum) {
    zodType = z.enum(schema.enum as [string, ...string[]]);
  }

  if (schema.description) {
    zodType = zodType.describe(schema.description);
  }

  if (!isRequired) {
    zodType = zodType.optional();
  }

  return zodType;
}

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
      const properties = toolDef.parameters.properties;
      const required = new Set(toolDef.parameters.required);
      const core = this.core;
      const toolName = toolDef.name;

      const shape: Record<string, any> = {};
      for (const [propName, propSchema] of Object.entries(properties)) {
        shape[propName] = jsonSchemaToZod(z, propSchema, required.has(propName));
      }

      const zodSchema = z.object(shape);

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
