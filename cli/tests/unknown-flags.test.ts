/**
 * Regression test: unrecognized flags must emit a non-blocking warning instead
 * of silently no-opping (found by live-API E2E agent, 2026-07-31 — e.g.
 * `tts --output foo.wav` "succeeded" and wrote nothing when --output was a typo
 * for an unsupported flag). The warning goes to stderr and never changes the
 * command's own behavior.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const launcher = join(cliRoot, "bin", "telnyx-agent.mjs");

function runSync(args: string[]) {
  return spawnSync(process.execPath, [launcher, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, TELNYX_API_KEY: "***" },
  });
}

describe("unrecognized flag warning", () => {
  it("warns on an unknown flag (typo) and names it", () => {
    // stt requires --audio-url; it will error, but the warning must appear first.
    const r = runSync(["stt", "--totally-unknown-flag", "x", "--audio-url", "https://example.com/a.wav"]);
    assert.match(r.stderr, /Ignoring unrecognized flag/i);
    assert.match(r.stderr, /--totally-unknown-flag/);
  });

  it("does NOT warn when only known flags are used", () => {
    const r = runSync(["tts", "--text", "Hi", "--voice", "Amy", "--provider", "telnyx", "--json"]);
    assert.doesNotMatch(r.stderr, /Ignoring unrecognized flag/i);
  });

  it("does not warn for --help", () => {
    const r = runSync(["setup-voice", "--help"]);
    assert.doesNotMatch(r.stderr, /Ignoring unrecognized flag/i);
  });
});
