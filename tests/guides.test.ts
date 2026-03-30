/**
 * Structural validation for operational guides.
 * No API key needed — validates file structure and content requirements.
 *
 * Ported from telnyx-agent-portal/tests/guides.test.ts
 * Paths adapted: docs/guides/ → guides/
 * agent.json parity checks removed (no agent.json in this repo).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GUIDES_DIR = join(ROOT, "guides");

// Get guide files (exclude README)
const guideFiles = readdirSync(GUIDES_DIR).filter(
  (f) => f.endsWith(".md") && f !== "README.md"
);

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
