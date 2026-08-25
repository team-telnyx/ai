/**
 * Shared JSON Schema-to-Zod conversion used by framework adapters.
 *
 * Zod is an optional peer dependency, so this module deliberately accepts the
 * caller's Zod namespace rather than importing it at runtime.
 */

import type {
  ToolParameter,
  ToolParameters,
} from "./constants.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

function jsonSchemaPropertyToZod(
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

/** Return whether an object satisfies at least one `anyOf.required` group. */
export function satisfiesAnyOfRequiredGroups(
  value: Record<string, unknown>,
  anyOf: NonNullable<ToolParameters["anyOf"]>,
): boolean {
  return anyOf.some(({ required }) =>
    required.every((field) => value[field] !== undefined),
  );
}

/** Build the complete object schema, including generic `anyOf.required` rules. */
export function buildToolParametersZodSchema(
  z: any,
  parameters: ToolParameters,
): any {
  const required = new Set(parameters.required);
  const shape: Record<string, any> = {};

  for (const [propertyName, propertySchema] of Object.entries(
    parameters.properties,
  )) {
    shape[propertyName] = jsonSchemaPropertyToZod(
      z,
      propertySchema,
      required.has(propertyName),
    );
  }

  const objectSchema = z.object(shape);
  if (parameters.anyOf === undefined) {
    return objectSchema;
  }

  const anyOf = parameters.anyOf;
  return objectSchema.superRefine(
    (value: Record<string, unknown>, context: any) => {
      if (!satisfiesAnyOfRequiredGroups(value, anyOf)) {
        context.addIssue({
          code: "custom",
          message: "Input must satisfy at least one required-field group",
          path: [],
        });
      }
    },
  );
}
