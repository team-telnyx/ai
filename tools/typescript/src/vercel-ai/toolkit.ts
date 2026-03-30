/**
 * Vercel AI SDK adapter for the Telnyx Agent Toolkit.
 *
 * Formats tools for use with `generateText({ tools: {...} })` from the `ai` package.
 */

import type { ToolDefinition, ToolParameter } from "../shared/constants.js";
import type { ToolkitCore } from "../shared/toolkit-core.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert a JSON Schema property to a Zod schema.
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
      const properties = toolDef.parameters.properties;
      const required = new Set(toolDef.parameters.required);
      const core = this.core;
      const toolName = toolDef.name;

      const shape: Record<string, any> = {};
      for (const [propName, propSchema] of Object.entries(properties)) {
        shape[propName] = jsonSchemaToZod(z, propSchema, required.has(propName));
      }

      const zodSchema = z.object(shape);

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
