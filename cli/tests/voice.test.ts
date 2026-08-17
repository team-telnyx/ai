/**
 * Tests for the Voice API action commands (call-dial, call-control, call-status).
 *
 * Uses a fake `telnyx` binary that logs every invocation to a file and returns
 * canned JSON, so we can assert exactly which Go CLI flags the wrapper passes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
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

/**
 * Async variants of run()/runFailure(). Required for the call-status tests, which
 * stand up an in-process mock HTTP server: a synchronous execFileSync/spawnSync
 * would block the event loop so the mock could never accept the child's request
 * (deadlock -> timeout). These spawn asynchronously and await exit.
 */
function runAsync(args: string[], env: NodeJS.ProcessEnv): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", cliBin, ...args], { cwd: cliRoot, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timeout running: ${args.join(" ")}`));
    }, 30000);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

function readLoggedArgs(logPath: string): string[][] {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

interface MockApi {
  baseUrl: string;
  close: () => Promise<void>;
}

/** Start a throwaway local HTTP server to stand in for the Telnyx REST API. */
function startMockApi(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<MockApi> {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

function run(args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: env ?? { ...process.env },
    timeout: 30000,
  });
}

function runFailure(args: string[], env: NodeJS.ProcessEnv): string {
  const result = spawnSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  assert.equal(result.error, undefined);
  return result.stderr;
}

function assertNoLoggedCalls(logPath: string): void {
  assert.ok(!existsSync(logPath) || readFileSync(logPath, "utf8") === "", "validation must fail before invoking telnyx");
}

function assertFlagValue(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value, `expected ${flag} ${value} in ${args.join(" ")}`);
}

describe("Voice API action commands", () => {
  it("call-dial POSTs /v2/calls with a +E.164 `to` intact (AIF-327)", async () => {
    let received: Record<string, unknown> | undefined;
    const mock = await startMockApi((req, res) => {
      assert.equal(req.method, "POST");
      assert.equal(req.url, "/calls");
      let raw = "";
      req.on("data", (c) => (raw += c.toString()));
      req.on("end", () => {
        received = JSON.parse(raw);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { call_control_id: "call-dial-123", call_leg_id: "leg-1", call_session_id: "sess-1", is_alive: true } }));
      });
    });
    try {
      const fake = setupFakeTelnyx();
      const { status, stdout } = await runAsync(
        ["call-dial", "--connection-id", "conn-1", "--from", "+13125550000", "--to", "+94771280314", "--json"],
        { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: mock.baseUrl },
      );
      assert.equal(status, 0, `expected success, stdout=${stdout}`);
      const data = JSON.parse(stdout);
      assert.equal(data.call_control_id, "call-dial-123");
      // The +E.164 number must reach the API body verbatim (the AIF-327 bug).
      assert.equal(received?.to, "+94771280314");
      assert.equal(received?.from, "+13125550000");
      assert.equal(received?.connection_id, "conn-1");
      // Detection fields absent when not requested.
      assert.equal(received?.answering_machine_detection, undefined);
      assert.equal(received?.deepfake_detection, undefined);
      assert.equal(received?.retry_on_timeout, undefined);
      // Must NOT shell out to the Go CLI anymore.
      assertNoLoggedCalls(fake.logPath);
    } finally {
      await mock.close();
    }
  });

  for (const [label, retryArgs] of [
    ["bare", ["--retry-on-timeout"]],
    ["explicit true", ["--retry-on-timeout", "true"]],
  ] as const) {
    it(`call-dial maps ${label} --retry-on-timeout to true in the REST body`, async () => {
      let received: Record<string, unknown> | undefined;
      const mock = await startMockApi((req, res) => {
        let raw = "";
        req.on("data", (c) => (raw += c.toString()));
        req.on("end", () => {
          received = JSON.parse(raw);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ data: { call_control_id: "call-dial-123" } }));
        });
      });
      try {
        const fake = setupFakeTelnyx();
        const { status } = await runAsync(
          [
            "call-dial", "--connection-id", "conn-1",
            "--from", "+15550001000", "--to", "+15550001001",
            ...retryArgs, "--json",
          ],
          { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: mock.baseUrl },
        );
        assert.equal(status, 0);
        assert.equal(received?.retry_on_timeout, true);
        assertNoLoggedCalls(fake.logPath);
      } finally {
        await mock.close();
      }
    });
  }

  it("call-dial maps explicit false --retry-on-timeout to false in the REST body", async () => {
    let received: Record<string, unknown> | undefined;
    const mock = await startMockApi((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c.toString()));
      req.on("end", () => {
        received = JSON.parse(raw);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { call_control_id: "call-dial-123" } }));
      });
    });
    try {
      const fake = setupFakeTelnyx();
      const { status } = await runAsync(
        [
          "call-dial", "--connection-id", "conn-1",
          "--from", "+15550001000", "--to", "+15550001001",
          "--retry-on-timeout", "false", "--json",
        ],
        { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: mock.baseUrl },
      );
      assert.equal(status, 0);
      assert.equal(received?.retry_on_timeout, false);
      assertNoLoggedCalls(fake.logPath);
    } finally {
      await mock.close();
    }
  });

  it("call-dial rejects invalid --retry-on-timeout before any network call", () => {
    const fake = setupFakeTelnyx();
    const stderr = runFailure(
      [
        "call-dial", "--connection-id", "conn-1",
        "--from", "+15550001000", "--to", "+15550001001",
        "--retry-on-timeout", "sometimes", "--json",
      ],
      { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: "http://127.0.0.1:1" },
    );
    assert.match(stderr, /Invalid --retry-on-timeout: sometimes\. Must be true or false/);
    assertNoLoggedCalls(fake.logPath);
  });

  it("call-dial maps AMD (bare), deepfake and record into the REST body (AIF-327)", async () => {
    let received: Record<string, unknown> | undefined;
    const mock = await startMockApi((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c.toString()));
      req.on("end", () => {
        received = JSON.parse(raw);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { call_control_id: "call-dial-123" } }));
      });
    });
    try {
      const fake = setupFakeTelnyx();
      const { status } = await runAsync(
        [
          "call-dial",
          "--connection-id", "conn-1",
          "--from", "+13125550000",
          "--to", "+13125551234",
          "--answering-machine-detection",
          "--deepfake-detection",
          "--record",
          "--json",
        ],
        { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: mock.baseUrl },
      );
      assert.equal(status, 0);
      // Bare --answering-machine-detection defaults to "detect".
      assert.equal(received?.answering_machine_detection, "detect");
      // deepfake_detection is an object on the API.
      assert.deepEqual(received?.deepfake_detection, { enabled: true });
      // record takes the event to record from, not a boolean.
      assert.equal(received?.record, "record-from-answer");
    } finally {
      await mock.close();
    }
  });

  it("call-dial forwards an explicit --answering-machine-detection mode (AIF-327)", async () => {
    let received: Record<string, unknown> | undefined;
    const mock = await startMockApi((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c.toString()));
      req.on("end", () => {
        received = JSON.parse(raw);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { call_control_id: "call-dial-123" } }));
      });
    });
    try {
      const fake = setupFakeTelnyx();
      const { status } = await runAsync(
        [
          "call-dial",
          "--connection-id", "conn-1",
          "--from", "+13125550000",
          "--to", "+13125551234",
          "--answering-machine-detection", "premium",
          "--json",
        ],
        { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: mock.baseUrl },
      );
      assert.equal(status, 0);
      assert.equal(received?.answering_machine_detection, "premium");
    } finally {
      await mock.close();
    }
  });

  it("call-dial rejects an invalid --answering-machine-detection mode (no network call)", () => {
    const fake = setupFakeTelnyx();
    const stderr = runFailure(
      [
        "call-dial",
        "--connection-id", "conn-1",
        "--from", "+13125550000",
        "--to", "+13125551234",
        "--answering-machine-detection", "bogus",
        "--json",
      ],
      { ...fake.env, TELNYX_API_KEY: "***" },
    );
    assert.ok(/Invalid --answering-machine-detection mode/.test(stderr));
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

  it("call-control --action reject forwards --cause (default CALL_REJECTED)", () => {
    const fake = setupFakeTelnyx();
    run(["call-control", "--action", "reject", "--call-control-id", "call-1", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const rejectCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions reject");
    assert.ok(rejectCall, "should invoke `calls:actions reject`");
    assertFlagValue(rejectCall!, "--call-control-id", "call-1");
    // The Reject API requires a cause; default to CALL_REJECTED.
    assertFlagValue(rejectCall!, "--cause", "CALL_REJECTED");
  });

  it("call-control --action reject forwards an explicit --cause and rejects invalid ones", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "reject", "--call-control-id", "call-1", "--cause", "USER_BUSY", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const rejectCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions reject");
    assert.ok(rejectCall);
    assertFlagValue(rejectCall!, "--cause", "USER_BUSY");

    assert.throws(() =>
      run(
        ["call-control", "--action", "reject", "--call-control-id", "call-1", "--cause", "NOT_A_CAUSE", "--json"],
        fake.env,
      ),
    );
  });

  it("call-control --action answer forwards deepfake/record flags in Go CLI syntax", () => {
    const fake = setupFakeTelnyx();
    run(
      ["call-control", "--action", "answer", "--call-control-id", "call-1", "--deepfake-detection", "--record", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const answerCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions answer");
    assert.ok(answerCall, "should invoke `calls:actions answer`");
    assert.ok(answerCall!.includes("--deepfake-detection.enabled"), "must include --deepfake-detection.enabled");
    assertFlagValue(answerCall!, "--record", "record-from-answer");
  });

  it("call-status derives 'active' from is_alive:true via REST GET /calls/:id (AIF-334)", async () => {
    const mock = await startMockApi((req, res) => {
      assert.equal(req.method, "GET");
      assert.equal(req.url, "/calls/call-1");
      res.writeHead(200, { "content-type": "application/json" });
      // Real Telnyx retrieve-status shape: is_alive only, NO call_status field.
      res.end(JSON.stringify({ data: { record_type: "call", call_control_id: "call-1", call_session_id: "sess-9", is_alive: true } }));
    });
    try {
      const fake = setupFakeTelnyx();
      const { status, stdout } = await runAsync(["call-status", "--call-control-id", "call-1", "--json"], {
        ...fake.env,
        TELNYX_API_KEY: "KEYtest",
        TELNYX_API_BASE_URL: mock.baseUrl,
      });
      assert.equal(status, 0, `expected success, stdout=${stdout}`);
      const data = JSON.parse(stdout);
      assert.equal(data.call_status, "active");
      assert.equal(data.is_alive, true);
      assert.equal(data.call_control_id, "call-1");
      // Must NOT shell out to the Go CLI anymore.
      assertNoLoggedCalls(fake.logPath);
    } finally {
      await mock.close();
    }
  });

  it("call-status derives 'ended' from is_alive:false for a completed call (AIF-334)", async () => {
    const mock = await startMockApi((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: { record_type: "call", call_control_id: "call-2", is_alive: false } }));
    });
    try {
      const fake = setupFakeTelnyx();
      const { status, stdout } = await runAsync(["call-status", "--call-control-id", "call-2", "--json"], {
        ...fake.env,
        TELNYX_API_KEY: "KEYtest",
        TELNYX_API_BASE_URL: mock.baseUrl,
      });
      assert.equal(status, 0, `expected success, stdout=${stdout}`);
      const data = JSON.parse(stdout);
      assert.equal(data.call_status, "ended");
      assert.equal(data.is_alive, false);
    } finally {
      await mock.close();
    }
  });

  it("call-status surfaces the API error detail on 422 (AIF-334)", async () => {
    const mock = await startMockApi((req, res) => {
      res.writeHead(422, { "content-type": "application/json" });
      res.end(JSON.stringify({ errors: [{ code: "90015", title: "Invalid Call Control ID", detail: "The call_control_id provided was not valid." }] }));
    });
    try {
      const fake = setupFakeTelnyx();
      const { status, stderr } = await runAsync(["call-status", "--call-control-id", "bad-id"], {
        ...fake.env,
        TELNYX_API_KEY: "KEYtest",
        TELNYX_API_BASE_URL: mock.baseUrl,
      });
      assert.notEqual(status, 0, "expected command to fail on 422");
      assert.ok(/call_control_id provided was not valid/.test(stderr), `expected API detail in stderr, got: ${stderr}`);
    } finally {
      await mock.close();
    }
  });

  it("call-status requires --call-control-id", () => {
    const fake = setupFakeTelnyx();
    const stderr = runFailure(["call-status"], { ...fake.env, TELNYX_API_KEY: "KEYtest" });
    assert.ok(/--call-control-id is required/.test(stderr));
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

  it("call-dial maps --privacy, --from-display-name and --transcription into the REST body (AIF-327)", async () => {
    let received: Record<string, unknown> | undefined;
    const mock = await startMockApi((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c.toString()));
      req.on("end", () => {
        received = JSON.parse(raw);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { call_control_id: "call-dial-123" } }));
      });
    });
    try {
      const fake = setupFakeTelnyx();
      const { status } = await runAsync(
        [
          "call-dial", "--connection-id", "conn-1", "--from", "+13125550000", "--to", "+13125551234",
          "--privacy", "id", "--from-display-name", "Acme Corp", "--transcription", "--json",
        ],
        { ...fake.env, TELNYX_API_KEY: "***", TELNYX_API_BASE_URL: mock.baseUrl },
      );
      assert.equal(status, 0);
      assert.equal(received?.privacy, "id");
      assert.equal(received?.from_display_name, "Acme Corp");
      assert.equal(received?.transcription, true);
    } finally {
      await mock.close();
    }
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

  const newActionDispatches: Array<{
    action: string;
    flags: string[];
    values: Array<[string, string]>;
    bare?: string[];
  }> = [
    {
      action: "add-ai-assistant-messages",
      flags: ["--message", '{"role":"user","content":"hello"}', "--client-state", "state-1", "--command-id", "cmd-1", "--trigger-response"],
      values: [["--message", '{"role":"user","content":"hello"}'], ["--client-state", "state-1"], ["--command-id", "cmd-1"]],
      bare: ["--trigger-response"],
    },
    {
      action: "gather-using-ai",
      flags: ["--parameters", '{"type":"object"}', "--greeting", "What is your name?", "--assistant.model", "openai/gpt-4o", "--send-partial-results"],
      values: [["--parameters", '{"type":"object"}'], ["--greeting", "What is your name?"], ["--assistant.model", "openai/gpt-4o"]],
      bare: ["--send-partial-results"],
    },
    {
      action: "gather-using-audio",
      flags: ["--audio-url", "https://example.com/menu.wav", "--maximum-digits", "4", "--valid-digits", "1234"],
      values: [["--audio-url", "https://example.com/menu.wav"], ["--maximum-digits", "4"], ["--valid-digits", "1234"]],
    },
    {
      action: "gather-using-speak",
      flags: ["--payload", "Enter your PIN", "--voice", "Telnyx.KokoroTTS.af", "--invalid-payload", "Try again", "--minimum-digits", "4"],
      values: [["--payload", "Enter your PIN"], ["--voice", "Telnyx.KokoroTTS.af"], ["--invalid-payload", "Try again"], ["--minimum-digits", "4"]],
    },
    {
      action: "join-ai-assistant",
      flags: ["--conversation-id", "conv-1", "--participant", '{"id":"call-2","role":"user"}', "--participant.name", "Caller"],
      values: [["--conversation-id", "conv-1"], ["--participant", '{"id":"call-2","role":"user"}'], ["--participant.name", "Caller"]],
    },
    {
      action: "start-ai-assistant",
      flags: ["--assistant.id", "assistant-1", "--greeting", "Hello", "--transcription", '{"model":"deepgram"}', "--send-message-history-updates"],
      values: [["--assistant.id", "assistant-1"], ["--greeting", "Hello"], ["--transcription", '{"model":"deepgram"}']],
      bare: ["--send-message-history-updates"],
    },
    {
      action: "stop-ai-assistant",
      flags: ["--client-state", "state-stop", "--command-id", "cmd-stop"],
      values: [["--client-state", "state-stop"], ["--command-id", "cmd-stop"]],
    },
    {
      action: "start-conversation-relay",
      flags: ["--url", "wss://example.com/relay", "--voice", "Telnyx.KokoroTTS.af", "--conversation-relay-settings.url", "wss://nested.example.com/relay", "--transcription", '{"provider":"telnyx"}', "--dtmf-detection"],
      values: [["--url", "wss://example.com/relay"], ["--voice", "Telnyx.KokoroTTS.af"], ["--conversation-relay-settings.url", "wss://nested.example.com/relay"], ["--transcription", '{"provider":"telnyx"}']],
      bare: ["--dtmf-detection"],
    },
    {
      action: "stop-conversation-relay",
      flags: ["--client-state", "relay-state", "--command-id", "relay-stop"],
      values: [["--client-state", "relay-state"], ["--command-id", "relay-stop"]],
    },
    {
      action: "switch-supervisor-role",
      flags: ["--role", "whisper"],
      values: [["--role", "whisper"]],
    },
  ];

  for (const testCase of newActionDispatches) {
    it(`call-control --action ${testCase.action} dispatches the generated Go command and flags`, () => {
      const fake = setupFakeTelnyx();
      run(
        ["call-control", "--action", testCase.action, "--call-control-id", "call-ai-1", ...testCase.flags, "--json"],
        fake.env,
      );

      const calls = readLoggedArgs(fake.logPath);
      const actionCall = calls.find((a) => a.slice(0, 2).join(" ") === `calls:actions ${testCase.action}`);
      assert.ok(actionCall, `should invoke calls:actions ${testCase.action}`);
      assertFlagValue(actionCall!, "--call-control-id", "call-ai-1");
      for (const [flag, value] of testCase.values) assertFlagValue(actionCall!, flag, value);
      for (const flag of testCase.bare ?? []) assert.ok(actionCall!.includes(flag), `expected ${flag}`);
    });
  }

  const repeatedObjectFlags = [
    { action: "add-ai-assistant-messages", flag: "message" },
    { action: "gather-using-ai", flag: "message-history", required: ["--parameters", '{"type":"object"}'] },
    { action: "gather-using-ai", flag: "assistant.tools", required: ["--parameters", '{"type":"object"}'] },
    { action: "start-ai-assistant", flag: "message-history" },
    { action: "start-ai-assistant", flag: "assistant.mcp-servers" },
    { action: "start-ai-assistant", flag: "assistant.tools" },
    { action: "start-conversation-relay", flag: "conversation-relay-settings.languages" },
  ];
  for (const testCase of repeatedObjectFlags) {
    it(`call-control --action ${testCase.action} expands a JSON array into repeated --${testCase.flag} flags`, () => {
      const fake = setupFakeTelnyx();
      run(
        [
          "call-control", "--action", testCase.action, "--call-control-id", "call-ai-1",
          ...(testCase.required ?? []),
          `--${testCase.flag}`, '[{"id":"one"},{"id":"two"}]', "--json",
        ],
        fake.env,
      );

      const calls = readLoggedArgs(fake.logPath);
      const actionCall = calls.find((a) => a.slice(0, 2).join(" ") === `calls:actions ${testCase.action}`);
      assert.ok(actionCall);
      const values = actionCall!
        .map((arg, index) => arg === `--${testCase.flag}` ? actionCall![index + 1] : undefined)
        .filter((value): value is string => value !== undefined);
      assert.deepEqual(values, ['{"id":"one"}', '{"id":"two"}']);
    });
  }

  const actionsWithOnlyCallIdRequired = [
    "add-ai-assistant-messages",
    "gather-using-audio",
    "start-ai-assistant",
    "stop-ai-assistant",
    "start-conversation-relay",
    "stop-conversation-relay",
  ];
  for (const action of actionsWithOnlyCallIdRequired) {
    it(`call-control --action ${action} does not invent optional Go flags`, () => {
      const fake = setupFakeTelnyx();
      run(["call-control", "--action", action, "--call-control-id", "call-ai-1", "--json"], fake.env);
      const calls = readLoggedArgs(fake.logPath);
      const actionCall = calls.find((a) => a.slice(0, 2).join(" ") === `calls:actions ${action}`);
      assert.ok(actionCall);
      assert.deepEqual(actionCall!.slice(0, -2), ["calls:actions", action, "--call-control-id", "call-ai-1"]);
    });
  }

  const newActionsWithRequiredCallId = newActionDispatches.map(({ action, flags }) => ({ action, flags }));
  for (const testCase of newActionsWithRequiredCallId) {
    it(`call-control --action ${testCase.action} validates --call-control-id before dispatch`, () => {
      const fake = setupFakeTelnyx();
      const stderr = runFailure(["call-control", "--action", testCase.action, ...testCase.flags, "--json"], fake.env);
      assert.match(stderr, /--call-control-id is required/);
      assertNoLoggedCalls(fake.logPath);
    });
  }

  it("call-pay forwards every upstream payment option to `calls:actions pay`", () => {
    const fake = setupFakeTelnyx();
    const flags = [
      "--call-control-id", "call-pay-1",
      "--amount", "10.50",
      "--client-state", "c3RhdGU=",
      "--command-id", "pay-command-1",
      "--connector-name", "Payments",
      "--currency", "USD",
      "--description", "Order 12345",
      "--inter-digit-timeout-millis", "4500",
      "--language", "en-US",
      "--max-attempts", "4",
      "--metadata", '{"order_id":"12345"}',
      "--parameters", '{"customer_id":"customer-1"}',
      "--payment-method", "credit-card",
      "--payment-token", "tok_abc123",
      "--prompts", '{"security-code":"Enter security code"}',
      "--service-level", "premium",
      "--timeout-millis", "6000",
      "--transaction-type", "charge",
      "--voice", "Telnyx.KokoroTTS.af",
      "--prompts.bank-account-number", "Enter account number",
      "--prompts.bank-routing-number", "Enter routing number",
      "--prompts.expiration-date", "Enter expiration date",
      "--prompts.payment-card-number", "Enter card number",
      "--prompts.postal-code", "Enter postal code",
      "--prompts.security-code", "Enter security code",
    ];

    const output = JSON.parse(run(["call-pay", ...flags, "--json"], fake.env));
    assert.equal(output.action, "pay");
    assert.equal(output.call_control_id, "call-pay-1");

    const calls = readLoggedArgs(fake.logPath);
    const payCall = calls.find((a) => a.slice(0, 2).join(" ") === "calls:actions pay");
    assert.ok(payCall, "should invoke `calls:actions pay`");
    for (let index = 0; index < flags.length; index += 2) {
      assertFlagValue(payCall!, flags[index], flags[index + 1]);
    }
  });

  it("call-control also dispatches pay without inventing optional defaults", () => {
    const fake = setupFakeTelnyx();
    run(["call-control", "--action", "pay", "--call-control-id", "call-pay-2", "--json"], fake.env);
    const payCall = readLoggedArgs(fake.logPath).find((a) => a.slice(0, 2).join(" ") === "calls:actions pay");
    assert.ok(payCall);
    assert.deepEqual(payCall!.slice(0, -2), ["calls:actions", "pay", "--call-control-id", "call-pay-2"]);
  });

  it("call-pay validates --call-control-id before invoking the Go CLI", () => {
    const fake = setupFakeTelnyx();
    const stderr = runFailure(["call-pay", "--amount", "10.50", "--json"], fake.env);
    assert.match(stderr, /--call-control-id is required/);
    assertNoLoggedCalls(fake.logPath);
  });

  const actionSpecificRequiredFlags = [
    { action: "gather-using-ai", missing: "parameters", flags: [] },
    { action: "gather-using-speak", missing: "payload", flags: ["--voice", "Telnyx.KokoroTTS.af"] },
    { action: "gather-using-speak", missing: "voice", flags: ["--payload", "Enter digits"] },
    { action: "join-ai-assistant", missing: "conversation-id", flags: ["--participant", '{"id":"call-2"}'] },
    { action: "join-ai-assistant", missing: "participant", flags: ["--conversation-id", "conv-1"] },
    { action: "switch-supervisor-role", missing: "role", flags: [] },
  ];
  for (const testCase of actionSpecificRequiredFlags) {
    it(`call-control --action ${testCase.action} validates required --${testCase.missing}`, () => {
      const fake = setupFakeTelnyx();
      const stderr = runFailure(
        ["call-control", "--action", testCase.action, "--call-control-id", "call-ai-1", ...testCase.flags, "--json"],
        fake.env,
      );
      assert.match(stderr, new RegExp(`--${testCase.missing} is required for ${testCase.action}`));
      assertNoLoggedCalls(fake.logPath);
    });
  }

  it("help and capabilities advertise AI/relay and payment Call Control actions", () => {
    const help = run(["help"]);
    for (const testCase of newActionDispatches) assert.ok(help.includes(testCase.action), `help should include ${testCase.action}`);

    const fake = setupFakeTelnyx();
    const capabilities = JSON.parse(run(["capabilities", "--json"], fake.env));
    const actions = capabilities.api_capabilities["📞 Voice"][0].actions as string[];
    for (const testCase of newActionDispatches) {
      const capability = testCase.action.replaceAll("-", "_");
      assert.ok(actions.includes(capability), `capabilities should include ${capability}`);
    }
    assert.ok(help.includes("call-pay"), "help should advertise call-pay");
    assert.ok(help.includes("--trigger-response"), "help should document --trigger-response");
    assert.ok(actions.includes("pay"), "capabilities should include pay");
    assert.ok(
      capabilities.composite_commands.some((entry: { name: string }) => entry.name === "telnyx-agent call-pay"),
      "capabilities should advertise call-pay",
    );
  });
});
