/**
 * API smoke tests for operational guides.
 * Extracts GET curl commands from guides and verifies endpoints exist.
 * Requires TELNYX_API_KEY environment variable.
 *
 * Ported from telnyx-agent-portal/tests/guides-api.test.ts
 * Paths adapted: docs/guides/ → guides/
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.TELNYX_API_KEY;
const GUIDES_DIR = join(__dirname, "..", "guides");

// Skip all tests if no API key
if (!API_KEY) {
  describe("guide API smoke tests (SKIPPED — no TELNYX_API_KEY)", () => {
    it("skipped", () => {
      console.log("Set TELNYX_API_KEY to run API smoke tests");
    });
  });
} else {
  const guideFiles = readdirSync(GUIDES_DIR).filter(
    (f) => f.endsWith(".md") && f !== "README.md"
  );

  /**
   * Extract GET-only curl URLs from a guide.
   * Matches: curl "https://api.telnyx.com/v2/..." with -H header
   * Skips: lines containing -X POST/PUT/DELETE/PATCH (non-GET)
   */
  function extractGetUrls(content: string): string[] {
    const urls: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      // Skip non-GET methods
      if (/-X\s+(POST|PUT|DELETE|PATCH)/i.test(line)) continue;

      // Match curl commands hitting api.telnyx.com/v2
      const match = line.match(
        /curl\s+.*["']?(https:\/\/api\.telnyx\.com\/v2\/[^\s"']+)["']?/
      );
      if (match) {
        let url = match[1];
        // Replace template variables with dummy values
        url = url.replace(/\{[^}]+\}/g, "test-id");
        // Remove trailing quotes
        url = url.replace(/["']$/, "");
        urls.push(url);
      }
    }

    // Deduplicate
    return [...new Set(urls)];
  }

  describe("guide API smoke tests", () => {
    for (const file of guideFiles) {
      const filepath = join(GUIDES_DIR, file);
      const content = readFileSync(filepath, "utf-8");
      const urls = extractGetUrls(content);

      if (urls.length === 0) continue;

      describe(file, () => {
        for (const url of urls) {
          it(`GET ${url} — endpoint exists (not 500)`, async () => {
            const response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${API_KEY}`,
              },
            });

            assert.notEqual(
              response.status,
              500,
              `${url} returned 500 Internal Server Error`
            );

            // If 200, verify valid JSON
            if (response.status === 200) {
              const text = await response.text();
              try {
                JSON.parse(text);
              } catch {
                assert.fail(`${url} returned 200 but body is not valid JSON`);
              }
            }
          });
        }
      });
    }
  });
}
