/**
 * Mock-binary coverage for room-session discovery and moderation actions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-room-sessions-"));
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
function flag(name) {
  const exact = args.find((arg) => arg.startsWith(name + "="));
  if (exact) return exact.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (args[0] === "rooms:sessions" && args[1] === "list-0") {
  console.log(JSON.stringify({
    data: [{
      id: "session-1",
      room_id: "room-1",
      active: true,
      date_created_at: "2026-08-17T10:00:00Z",
      participants: [{ id: "participant-1", context: "Alice" }]
    }],
    meta: { page_number: 2, page_size: 25, total_results: 1 }
  }));
} else if (args[0] === "rooms:sessions" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--room-session-id"),
    room_id: "room-1",
    active: true,
    participants: [{ id: "participant-1", context: "Alice" }]
  } }));
} else if (args[0] === "rooms:sessions" && args[1] === "retrieve-participants") {
  console.log(JSON.stringify({
    data: [{
      id: "participant-1",
      session_id: flag("--room-session-id"),
      context: "Alice",
      date_joined_at: "2026-08-17T10:01:00Z"
    }],
    meta: { page_number: 1, page_size: 10, total_results: 1 }
  }));
} else if (args[0] === "room-participants" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--room-participant-id"),
    session_id: "session-1",
    context: "Alice",
    date_joined_at: "2026-08-17T10:01:00Z"
  } }));
} else if (args[0] === "rooms:sessions:actions" && ["end", "kick", "mute", "unmute"].includes(args[1])) {
  console.log(JSON.stringify({ data: {
    id: flag("--room-session-id"),
    action: args[1],
    status: "ok"
  } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_FRICTION_ENABLED: "false",
      TELNYX_TELEMETRY_ENDPOINT: "",
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function runFailure(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected failure for ${args.join(" ")}`);
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate JSON.stringify(args) with a real newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

describe("room session moderation commands", () => {
  it("lists room sessions with focused filters and raw list output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-room-sessions",
      "--room-id", "room-1",
      "--active", "true",
      "--include-participants", "true",
      "--page-number", "2",
      "--page-size", "25",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      room_sessions: [{
        id: "session-1",
        room_id: "room-1",
        active: true,
        date_created_at: "2026-08-17T10:00:00Z",
        participants: [{ id: "participant-1", context: "Alice" }],
      }],
      meta: { page_number: 2, page_size: 25, total_results: 1 },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "rooms:sessions", "list-0",
      "--filter.room-id", "room-1",
      "--filter.active=true",
      "--include-participants=true",
      "--page-number", "2",
      "--page-size", "25",
      "--format", "raw",
    ]]);
  });

  it("gets a room session and can include participants", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-room-session",
      "--room-session-id", "session-1",
      "--include-participants",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.room_session_id, "session-1");
    assert.equal(result.room_session.participants[0].id, "participant-1");
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "rooms:sessions", "retrieve",
      "--room-session-id", "session-1",
      "--include-participants=true",
      "--format", "json",
    ]]);
  });

  it("lists participants for one room session", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-room-participants",
      "--room-session-id", "session-1",
      "--context", "Alice",
      "--page-number", "1",
      "--page-size", "10",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      room_session_id: "session-1",
      count: 1,
      participants: [{
        id: "participant-1",
        session_id: "session-1",
        context: "Alice",
        date_joined_at: "2026-08-17T10:01:00Z",
      }],
      meta: { page_number: 1, page_size: 10, total_results: 1 },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "rooms:sessions", "retrieve-participants",
      "--room-session-id", "session-1",
      "--filter.context", "Alice",
      "--page-number", "1",
      "--page-size", "10",
      "--format", "raw",
    ]]);
  });

  it("gets one room participant", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-room-participant",
      "--room-participant-id", "participant-1",
      "--json",
    ], fake.env);

    assert.equal(JSON.parse(output).participant.context, "Alice");
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "room-participants", "retrieve",
      "--room-participant-id", "participant-1",
      "--format", "json",
    ]]);
  });

  it("ends a room session through the generated action root", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "end-room-session",
      "--room-session-id", "session-1",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      room_session_id: "session-1",
      action: "end",
      result: { id: "session-1", action: "end", status: "ok" },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "rooms:sessions:actions", "end",
      "--room-session-id", "session-1",
      "--format", "json",
    ]]);
  });

  for (const action of ["kick", "mute", "unmute"] as const) {
    it(`${action}s selected room participants`, () => {
      const fake = setupFakeTelnyx();
      const output = runAgent([
        `${action}-room-participants`,
        "--room-session-id", "session-1",
        "--participants", "participant-1,participant-2",
        "--exclude", "participant-3,participant-4",
        "--json",
      ], fake.env);

      assert.deepEqual(JSON.parse(output), {
        room_session_id: "session-1",
        action,
        participants: ["participant-1", "participant-2"],
        excluded_participants: ["participant-3", "participant-4"],
        result: { id: "session-1", action, status: "ok" },
      });
      assert.deepEqual(loggedArgs(fake.logPath), [[
        "rooms:sessions:actions", action,
        "--room-session-id", "session-1",
        "--participants", JSON.stringify(["participant-1", "participant-2"]),
        "--exclude", "participant-3",
        "--exclude", "participant-4",
        "--format", "json",
      ]]);
    });
  }

  it('passes the special "all" participant selector unchanged', () => {
    const fake = setupFakeTelnyx();
    runAgent([
      "mute-room-participants",
      "--room-session-id", "session-1",
      "--participants", "all",
      "--json",
    ], fake.env);

    assert.deepEqual(loggedArgs(fake.logPath), [[
      "rooms:sessions:actions", "mute",
      "--room-session-id", "session-1",
      "--participants", "all",
      "--format", "json",
    ]]);
  });

  it("validates IDs, participant selection, booleans, and pagination before invoking telnyx", () => {
    for (const args of [
      ["get-room-session", "--json"],
      ["get-room-participant", "--json"],
      ["list-room-participants", "--json"],
      ["end-room-session", "--json"],
      ["kick-room-participants", "--room-session-id", "session-1", "--json"],
      ["mute-room-participants", "--room-session-id", "session-1", "--participants", "", "--json"],
      ["list-room-sessions", "--active", "sometimes", "--json"],
      ["list-room-sessions", "--page-number", "0", "--json"],
      ["list-room-participants", "--room-session-id", "session-1", "--page-size", "9007199254740992", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const failure = runFailure(args, fake.env);
      assert.match(failure.stdout, /"error"/, args.join(" "));
      assert.deepEqual(loggedArgs(fake.logPath), [], args.join(" "));
    }
  });

  it("prints useful room and participant summaries", () => {
    const fake = setupFakeTelnyx();
    assert.match(runAgent(["list-room-sessions"], fake.env), /session-1.*room-1.*active/);
    assert.match(
      runAgent(["list-room-participants", "--room-session-id", "session-1"], fake.env),
      /participant-1.*Alice/,
    );
    assert.match(
      runAgent([
        "kick-room-participants",
        "--room-session-id", "session-1",
        "--participants", "all",
      ], fake.env),
      /Room session kick requested!/,
    );
  });

  it("advertises every room moderation command in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = [
      "list-room-sessions",
      "get-room-session",
      "list-room-participants",
      "get-room-participant",
      "end-room-session",
      "kick-room-participants",
      "mute-room-participants",
      "unmute-room-participants",
    ];

    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some(
          (entry: { name: string }) => entry.name === `telnyx-agent ${command}`,
        ),
        `capabilities should advertise ${command}`,
      );
    }

    const roomActions = capabilities.api_capabilities["🎥 Rooms"][0].actions;
    for (const action of [
      "list_room_sessions",
      "get_room_session",
      "list_room_participants",
      "get_room_participant",
      "end_room_session",
      "kick_room_participants",
      "mute_room_participants",
      "unmute_room_participants",
    ]) {
      assert.ok(roomActions.includes(action), `Rooms capabilities should include ${action}`);
    }
    assert.match(help, /--participants <all\|ids>/);
    assert.match(help, /--room-session-id <id>/);
  });
});
