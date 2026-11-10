import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TOOL_DEFINITIONS } from "../src/shared/constants.js";

// Load the real Python table without installing optional framework dependencies.
// Fail (never skip) if the interpreter or either definition source is missing.
const pythonDirectory = fileURLToPath(new URL("../../python/", import.meta.url));
const pythonDefinitions = JSON.parse(execFileSync(
  process.env.PYTHON ?? "python3",
  ["-c", "import json, runpy; print(json.dumps(runpy.run_path('telnyx_agent_toolkit/shared/constants.py')['TOOL_DEFINITIONS']))"],
  { cwd: pythonDirectory, encoding: "utf8", timeout: 30_000 },
));
// Python >=3.11 is required; set PYTHON to select a non-default interpreter.
assert.deepEqual(Object.keys(TOOL_DEFINITIONS).sort(), Object.keys(pythonDefinitions).sort());
for (const [name, definition] of Object.entries(TOOL_DEFINITIONS)) {
  assert.deepEqual(definition, pythonDefinitions[name], `${name}: Python/TypeScript definition drift`);
}
console.log(`Definition parity passed (${Object.keys(TOOL_DEFINITIONS).length} tools)`);
