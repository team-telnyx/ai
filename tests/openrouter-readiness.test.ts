import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OPENROUTER_DIR = join(ROOT, "inference", "openrouter");
const MANIFEST_PATH = join(OPENROUTER_DIR, "models.example.json");

const requiredFiles = [
  "README.md",
  "provider-application.md",
  "models.example.json",
  "validate-openrouter-readiness.mjs",
];

describe("OpenRouter readiness packet", () => {
  it("includes the expected packet files", () => {
    for (const file of requiredFiles) {
      assert.ok(existsSync(join(OPENROUTER_DIR, file)), `${file} is missing`);
    }
  });

  it("documents the external application gate", () => {
    const readme = readFileSync(join(OPENROUTER_DIR, "README.md"), "utf8");
    assert.match(readme, /Do not submit the OpenRouter provider application/i);
    assert.match(readme, /privacy and data-retention/i);
    assert.match(readme, /pricing/i);
    assert.match(readme, /capacity/i);
  });

  it("keeps the model manifest marked as draft until product fields are confirmed", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    assert.ok(Array.isArray(manifest.data));
    assert.ok(manifest.data.length >= 4);

    const serialized = JSON.stringify(manifest);
    assert.match(serialized, /TODO_/);

    for (const model of manifest.data) {
      assert.equal(model.is_ready, false, `${model.id} must stay hidden until ready`);
      assert.ok(model.id);
      assert.ok(model.name);
      assert.ok(Number.isInteger(model.context_length));
      assert.ok(model.pricing);
      assert.equal(typeof model.pricing.prompt, "string");
      assert.equal(typeof model.pricing.completion, "string");
      assert.ok(Array.isArray(model.input_modalities));
      assert.ok(Array.isArray(model.output_modalities));
      assert.ok(Array.isArray(model.supported_sampling_parameters));
      assert.ok(Array.isArray(model.supported_features));
      assert.ok(model.openrouter?.slug);
      assert.ok(Array.isArray(model.datacenters));
    }
  });
});
