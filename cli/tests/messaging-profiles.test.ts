/**
 * Mock-binary coverage for direct messaging-profile lifecycle actions.
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
// Default to the package's real production launcher. The override only exists
// for restricted test sandboxes that forbid the tsx launcher's local IPC socket.
const cliBin = process.env.TELNYX_AGENT_TEST_ENTRYPOINT
  ?? join(cliRoot, "bin", "telnyx-agent.mjs");
const cliRuntimeArgs = process.env.TELNYX_AGENT_TEST_ENTRYPOINT ? ["--import", "tsx"] : [];

function setupFakeTelnyx(version = "0.24.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-messaging-profiles-"));
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
if (args[0] === "--version") {
  console.log("telnyx version ${version}");
  process.exit(0);
}
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function flags(name) {
  const values = [];
  for (let index = 0; index < args.length; index++) if (args[index] === name) values.push(args[index + 1]);
  return values;
}
function boolFlag(name, fallback) {
  const entry = args.find((arg) => arg.startsWith("--" + name + "="));
  return entry ? entry.slice(entry.indexOf("=") + 1) === "true" : fallback;
}

if (args[0] === "messaging-profiles" && args[1] === "list") {
  const scenario = process.env.TELNYX_FAKE_SCENARIO;
  const requestedPage = Number(flag("--page-number") || "1");
  const profile = (number) => ({ id: "mp-" + number, name: "Profile " + number, enabled: true });
  if (scenario === "pages") {
    const pages = { 1: [profile(1), profile(2)], 2: [profile(3), profile(4)], 3: [profile(5)] };
    console.log(JSON.stringify({ data: pages[requestedPage] || [], meta: {
      page_number: requestedPage, page_size: 2, total_pages: 3, total_results: 5, marker: "first-page"
    } }));
  } else if (scenario === "empty-end") {
    console.log(JSON.stringify({
      data: requestedPage === 1 ? [profile(1), profile(2)] : [],
      meta: { page_number: requestedPage, page_size: 2, marker: requestedPage === 1 ? "accepted" : "probe" }
    }));
  } else if (scenario === "repeat") {
    console.log(JSON.stringify({
      data: [profile(1), profile(2)],
      meta: { page_size: 2, marker: requestedPage === 1 ? "accepted" : "probe" }
    }));
  } else if (scenario === "identical-idless-pages") {
    console.log(JSON.stringify({
      data: [{ name: "Identical", enabled: true }],
      meta: { page_number: requestedPage, page_size: 1, total_pages: 2 }
    }));
  } else if (scenario === "max-safe-next") {
    console.log(JSON.stringify({
      data: [profile(1)],
      meta: { page_number: requestedPage, page_size: 1 }
    }));
  } else if (scenario === "no-progress") {
    console.log(JSON.stringify({ data: requestedPage === 1
      ? [profile(1), profile(2)]
      : [{ ...profile(1), name: "Changed 1" }, { ...profile(2), name: "Changed 2" }],
      meta: { page_number: requestedPage, page_size: 2, marker: requestedPage === 1 ? "accepted" : "probe" }
    }));
  } else {
    console.log(JSON.stringify({
      data: [
        { id: "mp-1", name: "Production SMS", enabled: true, whitelisted_destinations: ["US", "CA"] },
        { id: "mp-2", name: "Development SMS", enabled: false, whitelisted_destinations: ["US"] }
      ],
      meta: { page_number: requestedPage, page_size: 25, total_results: 2 }
    }));
  }
} else if (args[0] === "messaging-profiles" && args[1] === "create") {
  console.log(JSON.stringify({ data: {
    id: "mp-created",
    name: flag("--name"),
    enabled: boolFlag("enabled", true),
    webhook_url: flag("--webhook-url") || "",
    whitelisted_destinations: flags("--whitelisted-destination")
  } }));
} else if (args[0] === "messaging-profiles" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--messaging-profile-id"),
    name: "Production SMS",
    enabled: true,
    webhook_url: "https://example.com/messages",
    whitelisted_destinations: ["US", "CA"]
  } }));
} else if (args[0] === "messaging-profiles" && args[1] === "update") {
  console.log(JSON.stringify({ data: {
    id: flag("--messaging-profile-id"),
    name: flag("--name") || "Production SMS",
    enabled: boolFlag("enabled", true),
    webhook_url: flag("--webhook-url") || "https://example.com/messages",
    whitelisted_destinations: flags("--whitelisted-destination")
  } }));
} else if (args[0] === "messaging-profiles" && args[1] === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--messaging-profile-id") } }));
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
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(process.execPath, [...cliRuntimeArgs, cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function runAgentFailure(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [...cliRuntimeArgs, cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  return { stdout: result.stdout, stderr: result.stderr };
}

function runAgentCapture(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [...cliRuntimeArgs, cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  return { stdout: result.stdout, stderr: result.stderr };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not append a blank JSONL record");
  assert.ok(!contents.includes("\\n"), "fake binary should write a newline, not a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("Messaging profile lifecycle commands", () => {
  it("lists one raw page without max-items and preserves its stable JSON envelope", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-messaging-profiles",
      "--name", "Production SMS",
      "--name-contains", "Production",
      "--page-number", "2",
      "--page-size", "25",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 2,
      messaging_profiles: [
        { id: "mp-1", name: "Production SMS", enabled: true, whitelisted_destinations: ["US", "CA"] },
        { id: "mp-2", name: "Development SMS", enabled: false, whitelisted_destinations: ["US"] },
      ],
      meta: { page_number: 2, page_size: 25, total_results: 2 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["messaging-profiles", "list"]);
    assertFlag(args, "--filter-name-eq", "Production SMS");
    assertFlag(args, "--filter-name-contains", "Production");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assert.ok(!args.includes("--max-items"));
    assertFlag(args, "--format", "raw");
    assert.equal(loggedArgs(fake.logPath).length, 1);
  });

  it("aggregates multiple pages and slices exactly to a finite max above page size", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-messaging-profiles", "--page-size", "2", "--max-items", "3", "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "pages" });

    const result = JSON.parse(output);
    assert.deepEqual(result.messaging_profiles.map((profile: { id: string }) => profile.id), ["mp-1", "mp-2", "mp-3"]);
    assert.deepEqual(result.meta, {
      page_size: 2, total_pages: 3, total_results: 5, marker: "first-page",
      starting_page: 1, pages_fetched: 2, returned_results: 3,
    });
    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    assertFlag(calls[0], "--page-number", "1");
    assertFlag(calls[1], "--page-number", "2");
    for (const args of calls) {
      assertFlag(args, "--page-size", "2");
      assert.ok(!args.includes("--max-items"));
      assertFlag(args, "--format", "raw");
    }
  });

  it("starts at an explicit page and preserves filters and page size on every request", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-messaging-profiles", "--name", "Profile", "--name-contains", "file",
      "--page-number", "2", "--page-size", "2", "--max-items", "-1", "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "pages" });

    const result = JSON.parse(output);
    assert.deepEqual(result.messaging_profiles.map((profile: { id: string }) => profile.id), ["mp-3", "mp-4", "mp-5"]);
    assert.equal(result.meta.starting_page, 2);
    assert.equal(result.meta.pages_fetched, 2);
    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    for (const [index, args] of calls.entries()) {
      assertFlag(args, "--page-number", String(index + 2));
      assertFlag(args, "--page-size", "2");
      assertFlag(args, "--filter-name-eq", "Profile");
      assertFlag(args, "--filter-name-contains", "file");
      assert.ok(!args.includes("--max-items"));
    }
  });

  it("traverses all pages for max-items -1", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-messaging-profiles", "--max-items", "-1", "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "pages" });
    const result = JSON.parse(output);
    assert.equal(result.count, 5);
    assert.equal(result.meta.pages_fetched, 3);
    assert.equal(loggedArgs(fake.logPath).length, 3);
  });

  it("terminates bounded traversal on empty, repeated, and ID no-progress pages", () => {
    for (const scenario of ["empty-end", "repeat", "no-progress"]) {
      const fake = setupFakeTelnyx();
      const output = runAgent([
        "list-messaging-profiles", "--page-size", "2", "--max-items", "-1", "--json",
      ], { ...fake.env, TELNYX_FAKE_SCENARIO: scenario });
      const result = JSON.parse(output);
      assert.deepEqual(result.messaging_profiles.map((profile: { id: string }) => profile.id), ["mp-1", "mp-2"], scenario);
      assert.deepEqual(result.meta, {
        page_size: 2, marker: "accepted", starting_page: 1, pages_fetched: 2, returned_results: 2,
      }, scenario);
      assert.equal(loggedArgs(fake.logPath).length, 2, scenario);
    }
  });

  it("preserves identical ID-less profiles from distinct authoritative pages", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-messaging-profiles", "--page-size", "1", "--max-items", "-1", "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "identical-idless-pages" });

    const result = JSON.parse(output);
    assert.deepEqual(result.messaging_profiles, [
      { name: "Identical", enabled: true },
      { name: "Identical", enabled: true },
    ]);
    assert.equal(result.meta.pages_fetched, 2);
    assert.equal(loggedArgs(fake.logPath).length, 2);
  });

  it("fails closed when the maximum safe page would need a successor", () => {
    const fake = setupFakeTelnyx();
    const failure = runAgentFailure([
      "list-messaging-profiles", "--page-number", String(Number.MAX_SAFE_INTEGER),
      "--page-size", "1", "--max-items", "-1", "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "max-safe-next" });

    const error = JSON.parse(failure.stdout);
    assert.match(error.error, /maximum safe page number/);
    assert.equal(loggedArgs(fake.logPath).length, 1);
  });

  it("creates a profile using exact generated scalar, repeated slice, boolean, and object flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "create-messaging-profile",
      "--name", "Production SMS",
      "--ai-assistant-id", "assistant-1",
      "--whitelisted-destinations", "us, CA",
      "--enabled", "false",
      "--daily-spend-limit", "25.50",
      "--daily-spend-limit-enabled",
      "--smart-encoding", "true",
      "--webhook-url", "https://example.com/messages",
      "--webhook-api-version", "2",
      "--number-pool-settings", "{\"long_code_weight\":2,\"skip_unhealthy\":true}",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      messaging_profile_id: "mp-created",
      messaging_profile: {
        id: "mp-created",
        name: "Production SMS",
        enabled: false,
        webhook_url: "https://example.com/messages",
        whitelisted_destinations: ["US", "CA"],
      },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["messaging-profiles", "create"]);
    assertFlag(args, "--name", "Production SMS");
    assertFlag(args, "--ai-assistant-id", "assistant-1");
    const destinationIndices = args.flatMap((value, index) => value === "--whitelisted-destination" ? [index] : []);
    assert.deepEqual(destinationIndices.map((index) => args[index + 1]), ["US", "CA"]);
    assert.ok(args.includes("--enabled=false"));
    assert.ok(args.includes("--daily-spend-limit-enabled=true"));
    assert.ok(args.includes("--smart-encoding=true"));
    assertFlag(args, "--daily-spend-limit", "25.50");
    assertFlag(args, "--number-pool-settings", "{\"long_code_weight\":2,\"skip_unhealthy\":true}");
    assertFlag(args, "--format", "json");
  });

  it("accepts the generated repeatable destination alias", () => {
    const fake = setupFakeTelnyx();
    runAgent([
      "create-messaging-profile",
      "--name", "Global SMS",
      "--whitelisted-destination", "US",
      "--whitelisted-destination", "GB",
      "--json",
    ], fake.env);

    const [args] = loggedArgs(fake.logPath);
    const destinationIndices = args.flatMap((value, index) => value === "--whitelisted-destination" ? [index] : []);
    assert.deepEqual(destinationIndices.map((index) => args[index + 1]), ["US", "GB"]);
  });

  it("recognizes documented messaging-profile flags without typo warnings", () => {
    const fake = setupFakeTelnyx();
    const result = runAgentCapture([
      "create-messaging-profile",
      "--name", "Documented flags",
      "--whitelisted-destinations", "US",
      "--ai-assistant-id", "assistant-1",
      "--alpha-sender", "TELNYX",
      "--enabled", "true",
      "--health-webhook-url", "https://example.com/health",
      "--resource-group-id", "group-1",
      "--webhook-failover-url", "https://example.com/failover",
      "--webhook-api-version", "2",
      "--daily-spend-limit", "10",
      "--daily-spend-limit-enabled", "false",
      "--smart-encoding", "true",
      "--mms-fall-back-to-sms", "false",
      "--mms-transcoding", "true",
      "--mobile-only", "false",
      "--number-pool-settings", "null",
      "--url-shortener-settings", "null",
      "--json",
    ], fake.env);
    assert.doesNotMatch(result.stderr, /Ignoring unrecognized flag/);
  });

  it("retrieves a profile by ergonomic --id and preserves the resource under a stable key", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-messaging-profile", "--id", "mp-1", "--json"], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.messaging_profile_id, "mp-1");
    assert.equal(result.messaging_profile.name, "Production SMS");
    assert.deepEqual(result.messaging_profile.whitelisted_destinations, ["US", "CA"]);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["messaging-profiles", "retrieve"]);
    assertFlag(args, "--messaging-profile-id", "mp-1");
    assertFlag(args, "--format", "json");
  });

  it("retrieves a profile by the generated --messaging-profile-id alias", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-messaging-profile", "--messaging-profile-id", "mp-1", "--json",
    ], fake.env);

    assert.equal(JSON.parse(output).messaging_profile_id, "mp-1");
    const [args] = loggedArgs(fake.logPath);
    assertFlag(args, "--messaging-profile-id", "mp-1");
  });

  it("accepts matching profile ID aliases", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-messaging-profile", "--id", "mp-1", "--messaging-profile-id", "mp-1", "--json",
    ], fake.env);

    assert.equal(JSON.parse(output).messaging_profile_id, "mp-1");
    const [args] = loggedArgs(fake.logPath);
    assertFlag(args, "--messaging-profile-id", "mp-1");
  });

  it("rejects conflicting profile ID aliases before invoking telnyx", () => {
    const commands = [
      ["get-messaging-profile"],
      ["update-messaging-profile", "--name", "Renamed SMS"],
      ["delete-messaging-profile", "--confirm"],
    ];

    for (const command of commands) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure([
        ...command, "--id", "mp-1", "--messaging-profile-id", "mp-2", "--json",
      ], fake.env);
      assert.match(failure.stdout, /--id and --messaging-profile-id must match/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("updates only explicitly supplied fields and supports false booleans", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "update-messaging-profile",
      "--id", "mp-1",
      "--name", "Renamed SMS",
      "--enabled", "false",
      "--mms-transcoding", "false",
      "--whitelisted-destinations", "GB,DE",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.messaging_profile_id, "mp-1");
    assert.equal(result.messaging_profile.name, "Renamed SMS");
    assert.equal(result.messaging_profile.enabled, false);
    assert.deepEqual(result.messaging_profile.whitelisted_destinations, ["GB", "DE"]);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["messaging-profiles", "update"]);
    assertFlag(args, "--messaging-profile-id", "mp-1");
    assertFlag(args, "--name", "Renamed SMS");
    assert.ok(args.includes("--enabled=false"));
    assert.ok(args.includes("--mms-transcoding=false"));
    assert.ok(!args.some((arg) => arg.startsWith("--smart-encoding=")));
  });

  it("forwards ai-assistant-id as an update mutation through the production launcher", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "update-messaging-profile", "--id", "mp-1", "--ai-assistant-id", "assistant-1", "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.messaging_profile_id, "mp-1");

    const [versionArgs, args] = loggedArgs(fake.logPath);
    assert.deepEqual(versionArgs, ["--version"]);
    assert.deepEqual(args.slice(0, 2), ["messaging-profiles", "update"]);
    assertFlag(args, "--messaging-profile-id", "mp-1");
    assertFlag(args, "--ai-assistant-id", "assistant-1");
  });

  it("rejects an explicit pre-0.24 Go CLI before dispatching update --ai-assistant-id", () => {
    const fake = setupFakeTelnyx("0.23.9");
    const failure = runAgentFailure([
      "update-messaging-profile", "--id", "mp-1", "--ai-assistant-id", "assistant-1", "--json",
    ], fake.env);

    const error = JSON.parse(failure.stdout) as { error: string };
    assert.match(error.error, /requires >= 0\.24\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), [["--version"]]);
  });

  it("refuses deletion without explicit confirmation before invoking telnyx", () => {
    const fake = setupFakeTelnyx();
    const failure = runAgentFailure(["delete-messaging-profile", "--id", "mp-1", "--json"], fake.env);

    assert.match(failure.stdout, /--confirm is required/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("rejects valued confirmation forms before invoking telnyx", () => {
    for (const value of ["true", "false"]) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure([
        "delete-messaging-profile", "--id", "mp-1", "--confirm", value, "--json",
      ], fake.env);
      assert.match(failure.stdout, /--confirm is required/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("treats messaging-profile booleans as booleans so adjacent help is never swallowed", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["update-messaging-profile", "--enabled", "-h"], fake.env);
    assert.match(output, /Messaging Profile Flags:/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("deletes after --confirm and emits a stable result", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["delete-messaging-profile", "--id", "mp-1", "--confirm", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), { messaging_profile_id: "mp-1", deleted: true });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["messaging-profiles", "delete"]);
    assertFlag(args, "--messaging-profile-id", "mp-1");
    assert.ok(!args.includes("--confirm"), "local confirmation must not be forwarded to the Go CLI");
  });

  it("validates required and malformed values before invoking telnyx", () => {
    const cases: Array<{ args: string[]; expected: RegExp }> = [
      { args: ["create-messaging-profile", "--whitelisted-destinations", "US", "--json"], expected: /--name is required/ },
      { args: ["create-messaging-profile", "--name", "Missing destinations", "--json"], expected: /--whitelisted-destinations is required/ },
      { args: ["create-messaging-profile", "--name", "Bad destination", "--whitelisted-destinations", "USA", "--json"], expected: /invalid whitelisted destination/ },
      { args: ["update-messaging-profile", "--id", "mp-1", "--json"], expected: /at least one profile field/ },
      { args: ["update-messaging-profile", "--id", "mp-1", "--enabled", "maybe", "--json"], expected: /must be true or false/ },
      { args: ["get-messaging-profile", "--json"], expected: /--id is required/ },
      { args: ["get-messaging-profile", "--id", "--json"], expected: /--id must be a non-empty string/ },
      { args: ["get-messaging-profile", "--id", "", "--json"], expected: /--id must be a non-empty string/ },
      { args: ["get-messaging-profile", "--messaging-profile-id", "--json"], expected: /--messaging-profile-id must be a non-empty string/ },
      { args: ["get-messaging-profile", "--messaging-profile-id", "", "--json"], expected: /--messaging-profile-id must be a non-empty string/ },
      { args: ["list-messaging-profiles", "--page-size", "0", "--json"], expected: /positive safe integer/ },
      { args: ["list-messaging-profiles", "--page-number", "9007199254740992", "--json"], expected: /positive safe integer/ },
      { args: ["list-messaging-profiles", "--page-size", "9007199254740992", "--json"], expected: /positive safe integer/ },
      { args: ["list-messaging-profiles", "--max-items", "0", "--json"], expected: /-1 or a positive safe integer/ },
      { args: ["list-messaging-profiles", "--max-items", "-2", "--json"], expected: /-1 or a positive safe integer/ },
      { args: ["list-messaging-profiles", "--max-items", "9007199254740992", "--json"], expected: /positive safe integer/ },
    ];

    for (const testCase of cases) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure(testCase.args, fake.env);
      assert.match(`${failure.stdout}${failure.stderr}`, testCase.expected);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("rejects bare and explicitly empty pagination values before invoking telnyx", () => {
    const cases = [
      { flag: "--page-number", args: ["--page-number"] },
      { flag: "--page-number", args: ["--page-number", ""] },
      { flag: "--page-size", args: ["--page-size"] },
      { flag: "--page-size", args: ["--page-size", ""] },
      { flag: "--max-items", args: ["--max-items"] },
      { flag: "--max-items", args: ["--max-items", ""] },
    ];

    for (const testCase of cases) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure([
        "list-messaging-profiles", ...testCase.args, "--json",
      ], fake.env);
      assert.deepEqual(JSON.parse(failure.stdout), {
        error: testCase.flag === "--max-items"
          ? "--max-items must be -1 or a positive safe integer"
          : `${testCase.flag} must be a positive safe integer`,
      });
      assert.equal(failure.stderr, "");
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("prints useful human output for list and retrieve", () => {
    const listFake = setupFakeTelnyx();
    const listOutput = runAgent(["list-messaging-profiles"], listFake.env);
    assert.match(listOutput, /Messaging profiles retrieved!/);
    assert.match(listOutput, /Production SMS — mp-1 · enabled/);

    const getFake = setupFakeTelnyx();
    const getOutput = runAgent(["get-messaging-profile", "--id", "mp-1"], getFake.env);
    assert.match(getOutput, /Messaging profile retrieved!/);
    assert.match(getOutput, /Messaging Profile ID\s+mp-1/);
    assert.match(getOutput, /Whitelisted Destinations\s+US, CA/);
  });

  it("advertises all lifecycle commands in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = [
      "list-messaging-profiles",
      "create-messaging-profile",
      "get-messaging-profile",
      "update-messaging-profile",
      "delete-messaging-profile",
    ];

    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }

    const actions = capabilities.api_capabilities["📱 Messaging"][0].actions;
    for (const action of [
      "list_messaging_profiles",
      "create_messaging_profile",
      "get_messaging_profile",
      "update_messaging_profile",
      "delete_messaging_profile",
    ]) {
      assert.ok(actions.includes(action), `Messaging capabilities should include ${action}`);
    }
    assert.match(help, /delete-messaging-profile.*requires --confirm/);
    assert.match(help, /--ai-assistant-id .*create, update/);
  });
});
