import assert from "node:assert/strict";

import { OpenAIToolkit } from "../src/openai/toolkit.js";
import { TOOL_DEFINITIONS } from "../src/shared/constants.js";
import type { ToolkitCore } from "../src/shared/toolkit-core.js";

const relayDefinition = TOOL_DEFINITIONS.start_conversation_relay;
const [openAITool] = new OpenAIToolkit(
  {} as ToolkitCore,
  [relayDefinition],
).getTools();
const openAIParameters = (
  openAITool.function as { parameters: Record<string, unknown> }
).parameters;

assert.deepEqual(
  openAIParameters.anyOf,
  [
    { required: ["url"] },
    { required: ["conversation_relay_url"] },
    { required: ["conversation_relay_settings"] },
  ],
  "OpenAI must preserve start_conversation_relay's exact anyOf constraint",
);

const { properties: relayProperties, ...relayTopLevelSchema } = relayDefinition.parameters;
const { properties: openAIProperties, ...openAITopLevelSchema } = openAIParameters;
assert.deepEqual(
  openAITopLevelSchema,
  relayTopLevelSchema,
  "OpenAI must preserve every top-level ToolParameters schema key",
);

const defaultedDefinition = TOOL_DEFINITIONS.list_phone_numbers;
const [defaultedOpenAITool] = new OpenAIToolkit(
  {} as ToolkitCore,
  [defaultedDefinition],
).getTools();
const defaultedParameters = (
  defaultedOpenAITool.function as { parameters: { properties: Record<string, Record<string, unknown>> } }
).parameters;
assert.equal(defaultedDefinition.parameters.properties.page_size.default, 20);
assert.equal("default" in defaultedParameters.properties.page_size, false);

const syntheticDefinition = {
  ...relayDefinition,
  parameters: {
    ...relayDefinition.parameters,
    additionalProperties: false,
    minProperties: 2,
  },
};
const [syntheticOpenAITool] = new OpenAIToolkit(
  {} as ToolkitCore,
  [syntheticDefinition],
).getTools();
const syntheticParameters = (
  syntheticOpenAITool.function as { parameters: Record<string, unknown> }
).parameters;
assert.equal(syntheticParameters.additionalProperties, false);
assert.equal(syntheticParameters.minProperties, 2);

const { buildToolParametersZodSchema } = await import(
  "../src/shared/tool-parameters-zod.js"
);
const { z } = await import("zod");

const genericParameters = {
  type: "object" as const,
  properties: {
    always: { type: "string" as const, description: "Always required" },
    alpha: { type: "string" as const, description: "First member of one group" },
    beta: { type: "string" as const, description: "Second member of one group" },
    gamma: { type: "string" as const, description: "Member of another group" },
    mode: {
      type: "string" as const,
      description: "Enum behavior must be retained",
      enum: ["one", "two"],
    },
  },
  required: ["always"],
  anyOf: [
    { required: ["alpha", "beta"] },
    { required: ["gamma"] },
  ],
};

const genericSchema = buildToolParametersZodSchema(z, genericParameters);
assert.equal(
  genericSchema.safeParse({ always: "yes", alpha: "a", beta: "b", mode: "one" }).success,
  true,
  "the first complete anyOf required-field group must validate",
);
assert.equal(
  genericSchema.safeParse({ always: "yes", gamma: "g", mode: "two" }).success,
  true,
  "any alternative complete anyOf required-field group must validate",
);
assert.equal(
  genericSchema.safeParse({ always: "yes", alpha: "a" }).success,
  false,
  "a partial alternative must not satisfy anyOf",
);
assert.equal(
  genericSchema.safeParse({ always: "yes" }).success,
  false,
  "validation must fail when no anyOf alternative is present",
);
assert.equal(
  genericSchema.safeParse({ gamma: "g" }).success,
  false,
  "ordinary per-field required behavior must remain enforced",
);
assert.equal(
  genericSchema.safeParse({ always: "yes", gamma: "g", mode: "invalid" }).success,
  false,
  "ordinary enum behavior must remain enforced",
);

console.log("OpenAI and shared Zod anyOf adapter tests passed");
