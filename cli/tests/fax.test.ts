/**
 * Canonical mock-binary tests for telnyx-agent fax-send.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-fax-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });

  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(
    fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");

const command = args.slice(0, -2);
if (command[0] === "faxes" && command[1] === "create") {
  console.log(JSON.stringify({
    data: {
      id: "fax-123",
      record_type: "fax",
      status: "queued",
      connection_id: "response-connection",
      from: "+19999999999",
      to: "+18888888888",
      media_url: "https://api.example.test/temporary-document.pdf",
      created_at: "2026-07-20T00:00:00Z"
    }
  }));
} else if (command[0] === "faxes" && command[1] === "retrieve") {
  console.log(JSON.stringify({
    data: {
      id: "fax-123",
      record_type: "fax",
      status: "delivered",
      direction: "outbound",
      connection_id: "conn-123",
      from: "+131****0000",
      to: "+131****0001",
      page_count: 3,
      created_at: "2026-07-20T00:00:00Z",
      updated_at: "2026-07-20T00:01:00Z",
      media_url: "https://api.example.test/faxes/fax-123.pdf"
    }
  }));
} else if (command[0] === "faxes:actions" && command[1] === "cancel") {
  console.log(JSON.stringify({ data: { result: "success" } }));
} else if (command[0] === "faxes:actions" && command[1] === "refresh") {
  console.log(JSON.stringify({ data: { result: "success" } }));
} else {
  console.error("unexpected command: " + command.join(" "));
  process.exit(2);
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
}

function readLoggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function expectFailure(args: string[], env: NodeJS.ProcessEnv, expected: RegExp): void {
  try {
    runCli(args, env);
    assert.fail("expected fax-send to exit non-zero");
  } catch (err: any) {
    assert.notEqual(err?.status, 0);
    assert.match(`${err?.stderr ?? ""}${err?.stdout ?? ""}`, expected);
  }
}

describe("fax-send command", () => {
  it("is a direct faxes create wrapper with stable JSON output", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(
      [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "+131****0001",
        "--media-url", "https://example.com/document.pdf",
        "--json",
      ],
      fake.env,
    );

    assert.deepEqual(JSON.parse(output), {
      fax_id: "fax-123",
      status: "queued",
      connection_id: "conn-123",
      from: "+131****0000",
      to: "+131****0001",
    });
    assert.deepEqual(readLoggedArgs(fake.logPath), [[
      "faxes", "create",
      "--connection-id", "conn-123",
      "--from", "+131****0000",
      "--to", "+131****0001",
      "--media-url", "https://example.com/document.pdf",
      "--format", "json",
    ]]);
  });

  it("passes useful faxes create options through unchanged", () => {
    const fake = setupFakeTelnyx();
    runCli(
      [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "sip:fax@example.com",
        "--media-name", "uploaded-document.pdf",
        "--webhook-url", "https://example.com/fax-events",
        "--client-state", "c3RhdGU=",
        "--from-display-name", "Example Fax",
        "--quality", "ultra_dark",
        "--black-threshold", "90",
        "--preview-format", "pdf",
        "--json",
      ],
      fake.env,
    );

    assert.deepEqual(readLoggedArgs(fake.logPath)[0], [
      "faxes", "create",
      "--connection-id", "conn-123",
      "--from", "+131****0000",
      "--to", "sip:fax@example.com",
      "--media-name", "uploaded-document.pdf",
      "--webhook-url", "https://example.com/fax-events",
      "--client-state", "c3RhdGU=",
      "--from-display-name", "Example Fax",
      "--quality", "ultra_dark",
      "--black-threshold", "90",
      "--preview-format", "pdf",
      "--format", "json",
    ]);
  });

  it("forwards explicit false values for every fax boolean in equals form", () => {
    const fake = setupFakeTelnyx();
    runCli(
      [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "+131****0001",
        "--media-url", "https://example.com/document.pdf",
        "--monochrome", "false",
        "--store-media", "false",
        "--store-preview", "false",
        "--t38-enabled", "false",
        "--json",
      ],
      fake.env,
    );

    assert.deepEqual(readLoggedArgs(fake.logPath)[0], [
      "faxes", "create",
      "--connection-id", "conn-123",
      "--from", "+131****0000",
      "--to", "+131****0001",
      "--media-url", "https://example.com/document.pdf",
      "--monochrome=false",
      "--store-media=false",
      "--store-preview=false",
      "--t38-enabled=false",
      "--format", "json",
    ]);
  });

  it("preserves bare true fax booleans", () => {
    const fake = setupFakeTelnyx();
    runCli(
      [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "+131****0001",
        "--media-url", "https://example.com/document.pdf",
        "--monochrome",
        "--store-media",
        "--store-preview",
        "--t38-enabled",
        "--json",
      ],
      fake.env,
    );

    assert.deepEqual(readLoggedArgs(fake.logPath)[0], [
      "faxes", "create",
      "--connection-id", "conn-123",
      "--from", "+131****0000",
      "--to", "+131****0001",
      "--media-url", "https://example.com/document.pdf",
      "--monochrome",
      "--store-media",
      "--store-preview",
      "--t38-enabled",
      "--format", "json",
    ]);
  });

  for (const requiredFlag of ["connection-id", "from", "to"]) {
    it(`requires --${requiredFlag} before invoking telnyx`, () => {
      const fake = setupFakeTelnyx();
      const args = [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "+131****0001",
        "--media-url", "https://example.com/document.pdf",
        "--json",
      ];
      const flagIndex = args.indexOf(`--${requiredFlag}`);
      args.splice(flagIndex, 2);

      expectFailure(args, fake.env, new RegExp(`--${requiredFlag} is required`));
      assert.deepEqual(readLoggedArgs(fake.logPath), []);
    });
  }

  it("rejects media-url and media-name together before invoking telnyx", () => {
    const fake = setupFakeTelnyx();
    expectFailure(
      [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "+131****0001",
        "--media-url", "https://example.com/document.pdf",
        "--media-name", "uploaded-document.pdf",
        "--json",
      ],
      fake.env,
      /--media-url and --media-name cannot be used together/,
    );
    assert.deepEqual(readLoggedArgs(fake.logPath), []);
  });

  it("rejects media-name and store-media together before invoking telnyx", () => {
    const fake = setupFakeTelnyx();
    expectFailure(
      [
        "fax-send",
        "--connection-id", "conn-123",
        "--from", "+131****0000",
        "--to", "+131****0001",
        "--media-name", "uploaded-document.pdf",
        "--store-media",
        "--json",
      ],
      fake.env,
      /--media-name and --store-media cannot be used together/,
    );
    assert.deepEqual(readLoggedArgs(fake.logPath), []);
  });

  it("wraps fax retrieve, cancel, and refresh with newline-delimited mock invocations", () => {
    const fake = setupFakeTelnyx();

    const status = JSON.parse(runCli(["fax-status", "--id", "fax-123", "--json"], fake.env));
    const cancel = JSON.parse(runCli(["fax-cancel", "--id", "fax-123", "--json"], fake.env));
    const refresh = JSON.parse(runCli(["fax-refresh", "--id", "fax-123", "--json"], fake.env));

    assert.deepEqual(status, {
      fax_id: "fax-123",
      status: "delivered",
      direction: "outbound",
      connection_id: "conn-123",
      from: "+131****0000",
      to: "+131****0001",
      page_count: 3,
      created_at: "2026-07-20T00:00:00Z",
      updated_at: "2026-07-20T00:01:00Z",
      media_url: "https://api.example.test/faxes/fax-123.pdf",
    });
    assert.deepEqual(cancel, {
      fax_id: "fax-123",
      result: "success",
      cancelled: true,
    });
    assert.deepEqual(refresh, {
      fax_id: "fax-123",
      result: "success",
      refreshed: true,
    });

    // The fake appends one genuine newline-terminated JSON record per process.
    // Reading all three records verifies the fixture is JSONL, not a literal backslash-n string.
    assert.equal(readFileSync(fake.logPath, "utf8").match(/\n/g)?.length, 3);
    assert.deepEqual(readLoggedArgs(fake.logPath), [
      ["faxes", "retrieve", "--id", "fax-123", "--format", "json"],
      ["faxes:actions", "cancel", "--id", "fax-123", "--format", "json"],
      ["faxes:actions", "refresh", "--id", "fax-123", "--format", "json"],
    ]);
  });

  for (const command of ["fax-status", "fax-cancel", "fax-refresh"]) {
    it(`${command} requires --id before invoking telnyx`, () => {
      const fake = setupFakeTelnyx();
      expectFailure([command, "--json"], fake.env, /--id is required \(fax ID\)/);
      assert.deepEqual(readLoggedArgs(fake.logPath), []);
    });
  }

  it("is wired into help and capabilities", () => {
    const help = runCli(["help"]);
    assert.match(help, /fax-send\s+Send a fax/);
    assert.match(help, /Fax Action Flags:/);
    assert.match(help, /--connection-id <id>/);
    assert.match(help, /fax-status\s+Retrieve the latest status/);
    assert.match(help, /fax-cancel\s+Cancel an outbound fax/);
    assert.match(help, /fax-refresh\s+Refresh an expired media URL/);
    assert.match(help, /--id <fax-id>/);

    const capabilities = JSON.parse(runCli(["capabilities", "--json"]));
    const faxCapability = capabilities.api_capabilities["📠 Fax"][0];
    for (const action of ["send_fax", "check_fax_status", "cancel_fax", "refresh_fax_media_url"]) {
      assert.ok(faxCapability.actions.includes(action), `fax capabilities should include ${action}`);
    }
    for (const command of ["fax-send", "fax-status", "fax-cancel", "fax-refresh"]) {
      assert.ok(
        capabilities.composite_commands.some(
          (entry: { name: string }) => entry.name === `telnyx-agent ${command}`,
        ),
        `capabilities should advertise the executable ${command} command`,
      );
    }
  });
});
