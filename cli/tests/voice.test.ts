/**
 * Tests for the Voice API action commands (call-dial, call-control, call-status).
 *
 * Uses a fake `telnyx` binary that logs every invocation to a file and returns
 * canned JSON, so we can assert exactly which Go CLI flags the wrapper passes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-voice-"));
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

// Strip --format json for command matching (the wrapper always appends it).
const command = args.filter((a) => a !== "--format" && a !== "json");

if (command[0] === "calls" && command[1] === "dial") {
  console.log(JSON.stringify({ data: { call_control_id: "call-dial-123", call_leg_id: "leg-1", call_session_id: "sess-1", is_alive: true } }));
} else if (command[0] === "calls" && command[1] === "retrieve-status") {
  console.log(JSON.stringify({ data: { call_control_id: "call-status-123", call_status: "active", is_alive: true } }));
} else if (command[0] === "calls:actions") {
  console.log(JSON.stringify({ data: { result: "ok", call_control_id: "call-control-123", command: command.slice(2).join(" ") } }));
} else {
  console.log(JSON.stringify({ data: {} }));
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
    },
  };
}

function readLoggedArgs(logPath: string): string[][] {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function run(args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: env ?? { ...process.env },
    timeout: 30000,
  });
}

function assertFlagValue(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value, `expected ${flag} ${value} in ${args.join(" ")}`);
}

describe("Voice API action commands", () => {
  it("call-dial passes the correct flags to `calls dial`", () => {
    const fake = setupFakeTelnyx();
    const output = run(
      ["call-dial", "--connection-id", "conn-1", "--from", "+13125550000", "--to", "+13125551234", "--json"],
      fake.env,
    );

    const data = JSON.parse(output);
    assert.equal(data.call_control_id, "call-dial-123");

    const calls = readLoggedArgs(fake.logPath);
    const dialCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls dial");
    assert.ok(dialCall, "should invoke `calls dial`");
    assertFlagValue(dialCall!, "--connection-id", "conn-1");
    assertFlagValue(dialCall!, "--from", "+13125550000");
    assertFlagValue(dialCall!, "--to", "+13125551234");
    // Boolean/detection flags should NOT be present when not requested.
    assert.ok(!dialCall!.includes("--answering-machine-detection"));
    assert.ok(!dialCall!.includes("--deepfake-detection"));
  });

  it("call-dial forwards --answering-machine-detection and --deepfake-detection flags", () => {
    const fake = setupFakeTelnyx();
    run(
      [
        "call-dial",
        "--connection-id", "conn-1",
        "--from", "+13125550000",
        "--to", "+13125551234",
        "--answering-machine-detection",
        "--deepfake-detection",
        "--json",
      ],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const dialCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls dial");
    assert.ok(dialCall, "should invoke `calls dial`");
    assert.ok(dialCall!.includes("--answering-machine-detection"), "must include --answering-machine-detection");
    assert.ok(dialCall!.includes("--deepfake-detection"), "must include --deepfake-detection");
  });

  it("call-control --action hangup calls `calls:actions hangup`", () => {
    const fake = setupFakeTelnyx();
    const output = run(["call-control", "--action", "hangup", "--call-control-id", "call-1", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.action, "hangup");
    assert.equal(data.call_control_id, "call-1");

    const calls = readLoggedArgs(fake.logPath);
    const hangupCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions hangup");
    assert.ok(hangupCall, "should invoke `calls:actions hangup`");
    assertFlagValue(hangupCall!, "--call-control-id", "call-1");
  });

  it("call-control --action transfer calls `calls:actions transfer` with --to", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "transfer", "--call-control-id", "call-1", "--to", "+13125559999", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const transferCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions transfer");
    assert.ok(transferCall, "should invoke `calls:actions transfer`");
    assertFlagValue(transferCall!, "--call-control-id", "call-1");
    assertFlagValue(transferCall!, "--to", "+13125559999");
  });

  it("call-control --action dtmf calls `calls:actions send-dtmf` with --digits", () => {
    const fake = setupFakeTelnyx();
    run(["call-control", "--action", "dtmf", "--call-control-id", "call-1", "--digits", "1234", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const dtmfCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions send-dtmf");
    assert.ok(dtmfCall, "should invoke `calls:actions send-dtmf`");
    assertFlagValue(dtmfCall!, "--call-control-id", "call-1");
    assertFlagValue(dtmfCall!, "--digits", "1234");
  });

  it("call-control --action start-recording calls `calls:actions start-recording` with channels/format", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "start-recording", "--call-control-id", "call-1", "--channels", "dual", "--format", "mp3", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const recCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions start-recording");
    assert.ok(recCall, "should invoke `calls:actions start-recording`");
    assertFlagValue(recCall!, "--call-control-id", "call-1");
    assertFlagValue(recCall!, "--channels", "dual");
    assertFlagValue(recCall!, "--format", "mp3");
  });

  it("call-control --action speak calls `calls:actions speak` with --payload and --voice", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "speak", "--call-control-id", "call-1", "--payload", "Hello world", "--voice", "female", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const speakCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions speak");
    assert.ok(speakCall, "should invoke `calls:actions speak`");
    assertFlagValue(speakCall!, "--call-control-id", "call-1");
    assertFlagValue(speakCall!, "--payload", "Hello world");
    assertFlagValue(speakCall!, "--voice", "female");
  });

  it("call-control --action speak defaults --voice to female when omitted", () => {
    const fake = setupFakeTelnyx();
    run(["call-control", "--action", "speak", "--call-control-id", "call-1", "--payload", "Hi", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const speakCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions speak");
    assert.ok(speakCall);
    assertFlagValue(speakCall!, "--voice", "female");
  });

  it("call-control --action bridge uses --call-control-id-to-bridge / -with flags", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "bridge", "--call-control-id", "call-1", "--call-control-id-2", "call-2", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const bridgeCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions bridge");
    assert.ok(bridgeCall, "should invoke `calls:actions bridge`");
    assertFlagValue(bridgeCall!, "--call-control-id-to-bridge", "call-1");
    assertFlagValue(bridgeCall!, "--call-control-id-to-bridge-with", "call-2");
  });

  it("call-status calls `calls retrieve-status`", () => {
    const fake = setupFakeTelnyx();
    const output = run(["call-status", "--call-control-id", "call-1", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.call_status, "active");

    const calls = readLoggedArgs(fake.logPath);
    const statusCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls retrieve-status");
    assert.ok(statusCall, "should invoke `calls retrieve-status`");
    assertFlagValue(statusCall!, "--call-control-id", "call-1");
  });

  it("help text includes the voice commands", () => {
    const output = run(["help"]);
    assert.ok(output.includes("call-dial"), "help should list call-dial");
    assert.ok(output.includes("call-control"), "help should list call-control");
    assert.ok(output.includes("call-status"), "help should list call-status");
    assert.ok(output.includes("--answering-machine-detection"), "help should document AMD flag");
  });

  it("capabilities lists the voice actions and composite commands", () => {
    const fake = setupFakeTelnyx();
    const output = run(["capabilities", "--json"], fake.env);
    const data = JSON.parse(output);

    const voice = data.api_capabilities["📞 Voice"] as Array<{ name: string; actions: string[] }>;
    assert.ok(voice, "Voice category should exist");
    const actions = voice[0].actions;
    for (const a of ["answer_call", "hangup_call", "transfer_call", "send_dtmf", "speak_tts", "bridge_calls", "get_call_status", "deepfake_detection"]) {
      assert.ok(actions.includes(a), `Voice actions should include ${a}`);
    }

    const composite = data.composite_commands.map((c: any) => c.name);
    assert.ok(composite.some((c: string) => c.includes("call-dial")));
    assert.ok(composite.some((c: string) => c.includes("call-control")));
    assert.ok(composite.some((c: string) => c.includes("call-status")));
  });

  // === Gap PR tests: number masking + advanced call-control actions ===

  it("call-dial with --privacy id passes number masking flag to Go CLI", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-dial", "--connection-id", "conn-1", "--from", "+13125550000", "--to", "+13125551234", "--privacy", "id", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const dialCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls dial");
    assert.ok(dialCall, "should invoke `calls dial`");
    assertFlagValue(dialCall!, "--privacy", "id");
  });

  it("call-dial with --from-display-name passes the flag through", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-dial", "--connection-id", "conn-1", "--from", "+13125550000", "--to", "+13125551234", "--from-display-name", "Acme Corp", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const dialCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls dial");
    assert.ok(dialCall);
    assertFlagValue(dialCall!, "--from-display-name", "Acme Corp");
  });

  it("call-dial with --transcription flag passes through", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-dial", "--connection-id", "conn-1", "--from", "+13125550000", "--to", "+13125551234", "--transcription", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const dialCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls dial");
    assert.ok(dialCall);
    assert.ok(dialCall!.includes("--transcription"), "should include --transcription flag");
  });

  it("call-control --action gather calls `calls:actions gather` and forwards client-state/command-id", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "gather", "--call-control-id", "call-1", "--client-state", "state-1", "--command-id", "cmd-1", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const gatherCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions gather");
    assert.ok(gatherCall, "should invoke `calls:actions gather`");
    assertFlagValue(gatherCall!, "--call-control-id", "call-1");
    assertFlagValue(gatherCall!, "--client-state", "state-1");
    assertFlagValue(gatherCall!, "--command-id", "cmd-1");
  });

  it("call-control --action gather works without --client-state/--command-id (optional)", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "gather", "--call-control-id", "call-1", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const gatherCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions gather");
    assert.ok(gatherCall, "should invoke `calls:actions gather`");
    assertFlagValue(gatherCall!, "--call-control-id", "call-1");
    assert.ok(!gatherCall!.includes("--client-state"), "must not include --client-state when omitted");
    assert.ok(!gatherCall!.includes("--command-id"), "must not include --command-id when omitted");
  });

  it("call-control --action send-sip-info forwards --body and --content-type", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "send-sip-info", "--call-control-id", "call-1", "--body", "Signal=1234", "--content-type", "application/dtmf-relay", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const sipCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions send-sip-info");
    assert.ok(sipCall, "should invoke `calls:actions send-sip-info`");
    assertFlagValue(sipCall!, "--call-control-id", "call-1");
    assertFlagValue(sipCall!, "--body", "Signal=1234");
    assertFlagValue(sipCall!, "--content-type", "application/dtmf-relay");
  });

  it("call-control --action start-playback calls `calls:actions start-playback` with --audio-url", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "start-playback", "--call-control-id", "call-1", "--audio-url", "https://example.com/hello.wav", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const playbackCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions start-playback");
    assert.ok(playbackCall, "should invoke `calls:actions start-playback`");
    assertFlagValue(playbackCall!, "--call-control-id", "call-1");
    assertFlagValue(playbackCall!, "--audio-url", "https://example.com/hello.wav");
  });

  it("call-control --action stop-gather calls `calls:actions stop-gather`", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "stop-gather", "--call-control-id", "call-1", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const stopCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions stop-gather");
    assert.ok(stopCall, "should invoke `calls:actions stop-gather`");
  });

  it("call-control --action pause-recording calls `calls:actions pause-recording`", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "pause-recording", "--call-control-id", "call-1", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const pauseCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions pause-recording");
    assert.ok(pauseCall, "should invoke `calls:actions pause-recording`");
  });

  it("call-control --action start-transcription calls `calls:actions start-transcription`", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "start-transcription", "--call-control-id", "call-1", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const transCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions start-transcription");
    assert.ok(transCall, "should invoke `calls:actions start-transcription`");
  });

  it("help text includes --privacy flag for number masking", () => {
    const output = run(["help"]);
    assert.ok(output.includes("--privacy"), "help should document --privacy flag");
    assert.ok(output.includes("number masking") || output.includes("Number masking") || output.includes("caller ID"), "help should mention number masking");
  });
});
