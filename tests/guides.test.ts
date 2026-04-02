/**
 * Structural validation for operational guides.
 * No API key needed — validates file structure, content, and parity with agent.json.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GUIDES_DIR = join(ROOT, "guides");
// agent.json lives alongside guides in the repo root (site is a separate repo)
const AGENT_JSON_PATH = join(ROOT, "agent.json");

// Load agent.json
const agentJson = JSON.parse(readFileSync(AGENT_JSON_PATH, "utf-8"));

// Get guide files
const guideFiles = readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".md"));

// Get capabilities with guide fields
const capabilitiesWithGuides = agentJson.capabilities.filter(
  (c: any) => c.guide
);
const guidePathsFromAgent = capabilitiesWithGuides.map((c: any) =>
  c.guide.replace(/^\/guides\//, "")
);

describe("agent.json validity", () => {
  it("is valid JSON with required top-level keys", () => {
    for (const key of ["name", "capabilities", "auth", "cli", "sdks"]) {
      assert.ok(
        key in agentJson,
        `agent.json missing required key: ${key}`
      );
    }
  });
});

describe("guide ↔ agent.json parity", () => {
  it("every capability with a guide field → file exists", () => {
    for (const cap of capabilitiesWithGuides) {
      const filename = cap.guide.replace(/^\/guides\//, "");
      const filepath = join(GUIDES_DIR, filename);
      assert.ok(
        existsSync(filepath),
        `Capability "${cap.id}" references guide "${cap.guide}" but file not found at ${filepath}`
      );
    }
  });

  it("every .md file in guides/ is referenced by at least one capability", () => {
    for (const file of guideFiles) {
      assert.ok(
        guidePathsFromAgent.includes(file),
        `Guide file "${file}" is not referenced by any capability in agent.json`
      );
    }
  });

  it("total guide count matches guide fields count in agent.json", () => {
    assert.equal(
      guideFiles.length,
      guidePathsFromAgent.length,
      `Guide files (${guideFiles.length}) != agent.json guide refs (${guidePathsFromAgent.length})`
    );
  });
});

describe("guide content requirements", () => {
  for (const file of guideFiles) {
    const filepath = join(GUIDES_DIR, file);
    const content = readFileSync(filepath, "utf-8");
    const lines = content.split("\n");

    describe(file, () => {
      it('has "## Prerequisites" section', () => {
        assert.ok(
          content.includes("## Prerequisites"),
          `${file} missing "## Prerequisites" section`
        );
      });

      it('has "## Quick Start" section', () => {
        assert.ok(
          content.includes("## Quick Start"),
          `${file} missing "## Quick Start" section`
        );
      });

      it('has "## API Reference" section', () => {
        assert.ok(
          content.includes("## API Reference"),
          `${file} missing "## API Reference" section`
        );
      });

      it("has at least 1 curl example", () => {
        assert.ok(
          /curl\s/.test(content),
          `${file} has no curl examples`
        );
      });

      it("has at least 1 Python code block", () => {
        assert.ok(
          content.includes("```python"),
          `${file} has no Python code blocks`
        );
      });

      it("has at least 1 TypeScript code block", () => {
        assert.ok(
          content.includes("```typescript"),
          `${file} has no TypeScript code blocks`
        );
      });

      it("is between 50-500 lines", () => {
        assert.ok(
          lines.length >= 50 && lines.length <= 500,
          `${file} has ${lines.length} lines (expected 50-500)`
        );
      });

      it("has no internal URL leaks", () => {
        const leakPatterns = [
          /\.consul/i,
          /internal\.telnyx/i,
          /clawdbot/i,
          /clawhub/i,
          /openclaw/i,
        ];
        for (const pattern of leakPatterns) {
          assert.ok(
            !pattern.test(content),
            `${file} contains internal URL leak matching ${pattern}`
          );
        }
      });
    });
  }
});
