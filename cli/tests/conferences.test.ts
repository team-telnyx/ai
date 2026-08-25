/**
 * Conference command tests use a mock executable and JSONL invocation log.
 * The executable writes a real newline after every entry so multiple conference
 * actions prove that each Go CLI invocation remains independently inspectable.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-conferences-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });
  const binary = join(binDir, "telnyx");
  writeFileSync(binary, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "conferences" && args[1] === "list") {
  console.log(JSON.stringify({ data: [
    { id: "conf-1", name: "support", status: "active" },
    { id: "conf-2", name: "sales", status: "completed" }
  ], meta: { page_number: 2, page_size: 10, total_results: 2 } }));
} else if (args[0] === "conferences" && args[1] === "list-participants") {
  console.log(JSON.stringify({ data: [
    { id: "participant-1", call_control_id: "call-1", muted: true },
    { id: "participant-2", call_control_id: "call-2", muted: false }
  ], meta: { page_number: 1, total_results: 2 } }));
} else if (args[0] === "conferences" && args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "conf-new", name: "support", status: "init" } }));
} else if (args[0] === "conferences" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: "conf-1", name: "support", status: "active" } }));
} else if (args[0] === "conferences:actions") {
  console.log(JSON.stringify({ data: { result: "ok", action: args[1] } }));
} else {
  console.log(JSON.stringify({ data: {} }));
}
`);
  chmodSync(binary, 0o755);
  return {
    logPath,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_CLI_PATH: binary,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
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
  assert.notEqual(result.status, 0, `expected failure: ${args.join(" ")}`);
  assert.equal(result.error, undefined);
  return `${result.stdout}${result.stderr}`;
}

function loggedCalls(path: string): string[][] {
  const raw = readFileSync(path, "utf8");
  assert.ok(raw.endsWith("\n"), "mock binary must terminate its JSONL entry with a real newline");
  return raw.trimEnd().split("\n").map((line) => JSON.parse(line));
}

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
}

function occurrences(args: string[], flag: string): string[] {
  return args.flatMap((value, index) => value === flag ? [args[index + 1]!] : []);
}

describe("conference commands", () => {
  it("creates and retrieves conferences with exact generated Go CLI commands", () => {
    const fake = setupFakeTelnyx();
    const created = JSON.parse(run([
      "create-conference", "--call-control-id", "call-owner", "--name", "support",
      "--beep-enabled", "always", "--comfort-noise", "false", "--json",
    ], fake.env));
    const retrieved = JSON.parse(run(["get-conference", "--id", "conf-1", "--region", "US", "--json"], fake.env));

    assert.equal(created.conference.id, "conf-new");
    assert.equal(retrieved.conference.id, "conf-1");
    const [create, get] = loggedCalls(fake.logPath);
    assert.deepEqual(create.slice(0, 2), ["conferences", "create"]);
    assert.equal(flagValue(create, "--call-control-id"), "call-owner");
    assert.equal(flagValue(create, "--name"), "support");
    assert.ok(create.includes("--comfort-noise=false"));
    assert.deepEqual(get.slice(0, 2), ["conferences", "retrieve"]);
    assert.equal(flagValue(get, "--id"), "conf-1");
    assert.equal(flagValue(get, "--region"), "US");
  });

  it("lists conferences and participants as stable JSON collections using raw Go output", () => {
    const fake = setupFakeTelnyx();
    const conferences = JSON.parse(run([
      "list-conferences", "--name", "support", "--status", "active",
      "--page-number", "2", "--page-size", "10", "--max-items", "1", "--json",
    ], fake.env));
    const participants = JSON.parse(run([
      "list-conference-participants", "--conference-id", "conf-1",
      "--muted", "true", "--on-hold", "false", "--json",
    ], fake.env));

    assert.equal(conferences.count, 1);
    assert.equal(conferences.conferences[0].id, "conf-1");
    assert.equal(conferences.meta.total_results, 2);
    assert.equal(participants.conference_id, "conf-1");
    assert.equal(participants.count, 2);

    const [list, listParticipants] = loggedCalls(fake.logPath);
    assert.deepEqual(list.slice(0, 2), ["conferences", "list"]);
    assert.equal(flagValue(list, "--filter.name"), "support");
    assert.equal(flagValue(list, "--filter.status"), "active");
    assert.deepEqual(list.slice(-2), ["--format", "raw"]);
    assert.deepEqual(listParticipants.slice(0, 2), ["conferences", "list-participants"]);
    assert.ok(listParticipants.includes("--filter.muted=true"));
    assert.ok(listParticipants.includes("--filter.on-hold=false"));
    assert.deepEqual(listParticipants.slice(-2), ["--format", "raw"]);
  });

  it("dispatches every upstream conference action with its required minimum flags", () => {
    const fake = setupFakeTelnyx();
    const actions: Array<[string, string[]]> = [
      ["update", ["--call-control-id", "call-1", "--supervisor-role", "monitor"]],
      ["end-conference", []],
      ["gather-dtmf-audio", ["--call-control-id", "call-1"]],
      ["hold", []],
      ["join", ["--call-control-id", "call-1"]],
      ["leave", ["--call-control-id", "call-1"]],
      ["mute", []],
      ["play", []],
      ["record-pause", []],
      ["record-resume", []],
      ["record-start", ["--format", "mp3"]],
      ["record-stop", []],
      ["send-dtmf", ["--digits", "12#"]],
      ["speak", ["--payload", "Welcome", "--voice", "Telnyx.KokoroTTS.af"]],
      ["stop", []],
      ["unhold", ["--call-control-id", "call-1"]],
      ["unmute", []],
    ];

    for (const [action, actionFlags] of actions) {
      const output = JSON.parse(run([
        "conference-control", "--conference-id", "conf-1", "--action", action,
        ...actionFlags, "--json",
      ], fake.env));
      assert.equal(output.action, action);
      assert.equal(output.conference_id, "conf-1");
    }

    const calls = loggedCalls(fake.logPath);
    assert.equal(calls.length, actions.length, "real JSONL newlines must preserve every action invocation");
    assert.deepEqual(calls.map((args) => args.slice(0, 2)), actions.map(([action]) => ["conferences:actions", action]));
    for (const args of calls) assert.equal(flagValue(args, "--id"), "conf-1");
  });

  it("preserves repeatable participant targets and maps boolean join options", () => {
    const fake = setupFakeTelnyx();
    run([
      "conference-control", "--conference-id", "conf-1", "--action", "join",
      "--call-control-id", "call-1", "--mute", "--hold", "false",
      "--whisper-call-control-id", "call-2", "--whisper-call-control-id", "call-3", "--json",
    ], fake.env);
    run([
      "conference-control", "--conference-id", "conf-1", "--action", "mute",
      "--call-control-id", "call-1,call-2", "--call-control-id", "call-3", "--json",
    ], fake.env);

    const [join, mute] = loggedCalls(fake.logPath);
    assert.ok(join.includes("--mute=true"));
    assert.ok(join.includes("--hold=false"));
    assert.deepEqual(occurrences(join, "--whisper-call-control-id"), ["call-2", "call-3"]);
    assert.deepEqual(occurrences(mute, "--call-control-id"), ["call-1", "call-2", "call-3"]);
  });

  it("supports agent-friendly recording/end aliases while dispatching exact upstream names", () => {
    const fake = setupFakeTelnyx();
    const recording = JSON.parse(run([
      "conference-control", "--conference-id", "conf-1", "--action", "start-recording", "--format", "wav", "--json",
    ], fake.env));
    const ended = JSON.parse(run([
      "conference-control", "--conference-id", "conf-1", "--action", "end", "--json",
    ], fake.env));
    assert.equal(recording.action, "record-start");
    assert.equal(ended.action, "end-conference");
    assert.deepEqual(loggedCalls(fake.logPath).map((args) => args[1]), ["record-start", "end-conference"]);
  });

  it("validates conference/action requirements before invoking the binary", () => {
    const fake = setupFakeTelnyx();
    assert.match(runFailure(["create-conference", "--name", "room", "--json"], fake.env), /--call-control-id is required/);
    assert.match(runFailure(["conference-control", "--action", "join", "--json"], fake.env), /--conference-id is required/);
    assert.match(runFailure([
      "conference-control", "--conference-id", "conf-1", "--action", "speak", "--payload", "hello", "--json",
    ], fake.env), /--voice is required for speak/);
    assert.match(runFailure([
      "conference-control", "--conference-id", "conf-1", "--action", "mute", "--audio-url", "https:\/\/example.com\/x.wav", "--json",
    ], fake.env), /Unsupported flag for mute: --audio-url/);
  });

  it("registers conference help and capabilities for agents", () => {
    const help = run(["help"]);
    for (const command of [
      "create-conference", "get-conference", "list-conferences",
      "list-conference-participants", "conference-control",
    ]) assert.ok(help.includes(command), `help should include ${command}`);
    for (const action of ["gather-dtmf-audio", "record-start", "unhold", "end-conference"]) {
      assert.ok(help.includes(action), `help should include ${action}`);
    }

    const capabilities = JSON.parse(run(["capabilities", "--json"]));
    const conferences = capabilities.api_capabilities["📞 Voice"].find((item: { name: string }) => item.name === "Conferences");
    assert.ok(conferences);
    for (const action of ["create_conference", "list_conference_participants", "start_conference_recording", "end_conference"]) {
      assert.ok(conferences.actions.includes(action), `capabilities should include ${action}`);
    }
    const commands = capabilities.composite_commands.map((item: { name: string }) => item.name);
    assert.ok(commands.includes("telnyx-agent conference-control"));
  });
});
