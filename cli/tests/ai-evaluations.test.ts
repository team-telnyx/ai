/** Mock-binary coverage for the Go CLI v0.35 AI evaluator workflow. */
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

function setupFakeTelnyx(version = "0.35.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-evaluations-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log(${JSON.stringify(`telnyx version ${version}`)}); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }
function flags(name) { return args.flatMap((arg, i) => arg === name ? [args[i + 1]] : []); }
const command = args.slice(0, 2).join(" ");
if (command === "ai:tests:test-framework:v1 retrieve-personalities") {
  console.log(JSON.stringify({ data: [{ id: 7, name: "Helpful caller" }] }));
} else if (command === "ai:tests:test-framework:v1:aiagents create") {
  console.log(JSON.stringify({ data: { id: 11, agent_name: flag("--agent-name"), assistant_id: flag("--assistant-id") } }));
} else if (command === "ai:tests:test-framework:v1:scenarios create") {
  console.log(JSON.stringify({ data: { id: 21, name: flag("--name"), agent: Number(flag("--agent")), personality: Number(flag("--personality")) } }));
} else if (command === "ai:tests:test-framework:v1:scenarios generate-bg") {
  console.log(JSON.stringify({ data: { progress_id: "scenario-progress-1", status: "queued" } }));
} else if (command === "ai:tests:test-framework:v1:scenarios retrieve-generate-progress") {
  console.log(JSON.stringify({ data: { progress_id: flag("--progress-id"), status: "completed" } }));
} else if (command === "ai:tests:test-framework:v1:scenarios run-scenarios") {
  console.log(JSON.stringify({ data: { id: 31, status: "queued" } }));
} else if (command === "ai:tests:test-framework:v1:results retrieve") {
  console.log(JSON.stringify({ data: { id: Number(flag("--id")), status: "completed" } }));
} else if (command === "ai:tests:test-framework:v1:results list") {
  console.log(JSON.stringify({ data: [{ id: 31, status: "completed" }, { id: 32, status: "running" }], meta: { total_results: 2 } }));
} else if (command === "ai:tests:test-framework:v1:results rerun") {
  console.log(JSON.stringify({ data: { id: 33, source_id: Number(flag("--id")), status: "queued" } }));
} else if (command === "ai:tests:test-framework:v1:metrics create") {
  console.log(JSON.stringify({ data: { id: 41, name: flag("--name") } }));
} else if (command === "ai:tests:test-framework:v1:metrics generate-metrics") {
  console.log(JSON.stringify({ data: { progress_id: "metric-progress-1", status: "queued" } }));
} else if (command === "ai:tests:test-framework:v1:metrics retrieve-generate-metrics-progress") {
  console.log(JSON.stringify({ data: { progress_id: flag("--progress-id"), status: "completed" } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath, TELNYX_API_KEY: "KEY_fake_test" },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot, encoding: "utf8", env, timeout: 30_000,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err: any) {
    return { status: err.status ?? 1, stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const jsonl = readFileSync(logPath, "utf8");
  assert.ok(jsonl.endsWith("\n"), "fake binary JSONL records must be newline terminated");
  assert.ok(!jsonl.endsWith("\n\n"), "fake binary must not write blank JSONL records");
  return jsonl.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertSuccess(result: { status: number; stderr: string }): void {
  assert.equal(result.status, 0, result.stderr);
}

describe("AI evaluator workflow commands", () => {
  it("lists test personalities with the exact generated command", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent(["list-ai-evaluation-personalities", "--json"], fake.env);
    assertSuccess(result);
    assert.deepEqual(JSON.parse(result.stdout), { count: 1, personalities: [{ id: 7, name: "Helpful caller" }] });
    assert.deepEqual(loggedArgs(fake.logPath), [[ROOT, "retrieve-personalities", "--format", "json"]]);
  });

  it("creates an evaluation agent and scenario with exact generated flags", () => {
    const fake = setupFakeTelnyx();
    const agent = runAgent([
      "create-ai-evaluation-agent", "--agent-name", "Support evaluation", "--assistant-id", "assistant-1",
      "--description", "Refund quality checks", "--language", "en", "--llm-max-tokens", "512",
      "--llm-temperature", "0.2", "--inbound", "false", "--auto-sync-prompt-enabled", "true", "--json",
    ], fake.env);
    assertSuccess(agent);
    assert.equal(JSON.parse(agent.stdout).evaluation_agent.id, 11);
    const scenario = runAgent([
      "create-ai-evaluation-scenario", "--name", "Refund escalation", "--agent-id", "11", "--personality-id", "7",
      "--first-message", "I need a refund", "--expected-outcome-prompt", "Offer escalation", "--instructions", "Be persistent",
      "--metric-id", "41", "--metric-id", "42", "--tag", "refund", "--tag", "priority", "--json",
    ], fake.env);
    assertSuccess(scenario);
    assert.equal(JSON.parse(scenario.stdout).evaluation_scenario.id, 21);
    assert.deepEqual(loggedArgs(fake.logPath), [
      [AGENTS, "create", "--agent-name", "Support evaluation", "--assistant-id", "assistant-1", "--description", "Refund quality checks", "--language", "en", "--llm-max-tokens", "512", "--llm-temperature", "0.2", "--inbound=false", "--auto-sync-prompt-enabled=true", "--format", "json"],
      [SCENARIOS, "create", "--name", "Refund escalation", "--personality", "7", "--agent", "11", "--expected-outcome-prompt", "Offer escalation", "--first-message", "I need a refund", "--instructions", "Be persistent", "--metric", "41", "--metric", "42", "--tag", "refund", "--tag", "priority", "--format", "json"],
    ]);
  });

  it("generates scenarios in the background and retrieves progress", () => {
    const fake = setupFakeTelnyx();
    const generated = runAgent([
      "generate-ai-evaluation-scenarios", "--agent-id", "11", "--num-scenarios", "3", "--extra-instructions", "Cover refunds",
      "--generate-expected-outcomes", "true", "--personality-id", "7", "--personality-id", "8", "--tag", "refund", "--tool-id", "tool-1", "--json",
    ], fake.env);
    assertSuccess(generated);
    assert.equal(JSON.parse(generated.stdout).generation.progress_id, "scenario-progress-1");
    const progress = runAgent(["get-ai-evaluation-scenario-generation-progress", "--progress-id", "scenario-progress-1", "--json"], fake.env);
    assertSuccess(progress);
    assert.equal(JSON.parse(progress.stdout).progress.status, "completed");
    assert.deepEqual(loggedArgs(fake.logPath), [
      [SCENARIOS, "generate-bg", "--agent-id", "11", "--num-scenarios", "3", "--extra-instructions", "Cover refunds", "--generate-expected-outcomes=true", "--personality", "7", "--personality", "8", "--tag", "refund", "--tool-id", "tool-1", "--format", "json"],
      [SCENARIOS, "retrieve-generate-progress", "--progress-id", "scenario-progress-1", "--format", "json"],
    ]);
  });

  it("runs scenarios and retrieves, lists, and reruns result batches", () => {
    const fake = setupFakeTelnyx();
    const run = runAgent([
      "run-ai-evaluation-scenarios", "--agent-id", "11", "--scenarios", "21, 22", "--concurrency-limit", "2",
      "--mode", "different_numbers", "--personality-id", "7", "--test-profile-id", "9", "--tag", "release", "--json",
    ], fake.env);
    assertSuccess(run);
    const get = runAgent(["get-ai-evaluation-result", "--result-id", "31", "--json"], fake.env);
    assertSuccess(get);
    const list = runAgent(["list-ai-evaluation-results", "--agent-id", "11", "--page", "2", "--page-size", "20", "--scenario-ids", "21, 22", "--search", "refund", "--json"], fake.env);
    assertSuccess(list);
    assert.equal(JSON.parse(list.stdout).count, 2);
    const rerun = runAgent(["rerun-ai-evaluation-result", "--result-id", "31", "--json"], fake.env);
    assertSuccess(rerun);
    assert.equal(JSON.parse(rerun.stdout).source_result_id, "31");
    assert.deepEqual(loggedArgs(fake.logPath), [
      [SCENARIOS, "run-scenarios", "--agent-id", "11", "--scenarios", "21,22", "--mode", "different_numbers", "--concurrency-limit", "2", "--personality-id", "7", "--test-profile-id", "9", "--tag", "release", "--format", "json"],
      [RESULTS, "retrieve", "--id", "31", "--format", "json"],
      [RESULTS, "list", "--agent-id", "11", "--page", "2", "--page-size", "20", "--search", "refund", "--scenarios", "21,22", "--format", "raw"],
      [RESULTS, "rerun", "--id", "31", "--format", "json"],
    ]);
  });

  it("creates a metric and supports its generated workflow", () => {
    const fake = setupFakeTelnyx();
    const metric = runAgent([
      "create-ai-evaluation-metric", "--name", "Refund policy adherence", "--type", "llm_judge",
      "--eval-type", "binary_workflow_adherence", "--prompt", "Did the agent explain policy?", "--agent-id", "11", "--agent-id", "12",
      "--enum-value", "pass", "--enum-value", "fail", "--simulation-enabled", "true", "--json",
    ], fake.env);
    assertSuccess(metric);
    const generated = runAgent(["generate-ai-evaluation-metrics", "--agent-id", "11", "--num-metrics", "2", "--scenario-id", "21", "--scenario-id", "22", "--json"], fake.env);
    assertSuccess(generated);
    const progress = runAgent(["get-ai-evaluation-metric-generation-progress", "--progress-id", "metric-progress-1", "--json"], fake.env);
    assertSuccess(progress);
    assert.deepEqual(loggedArgs(fake.logPath), [
      [METRICS, "create", "--name", "Refund policy adherence", "--prompt", "Did the agent explain policy?", "--type", "llm_judge", "--eval-type", "binary_workflow_adherence", "--agent", "11", "--agent", "12", "--enum-value", "pass", "--enum-value", "fail", "--simulation-enabled=true", "--format", "json"],
      [METRICS, "generate-metrics", "--agent-id", "11", "--num-metrics", "2", "--scenario", "21", "--scenario", "22", "--format", "json"],
      [METRICS, "retrieve-generate-metrics-progress", "--progress-id", "metric-progress-1", "--format", "json"],
    ]);
  });

  it("rejects malformed evaluator inputs before calling the Go CLI", () => {
    const invalid = [
      ["create-ai-evaluation-agent", "--agent-name", "Agent", "--json"],
      ["create-ai-evaluation-scenario", "--name", "Scenario", "--agent-id", "11", "--personality-id", "0", "--json"],
      ["generate-ai-evaluation-scenarios", "--agent-id", "11", "--num-scenarios", "0", "--json"],
      ["run-ai-evaluation-scenarios", "--agent-id", "11", "--scenarios", "1,nope", "--json"],
      ["run-ai-evaluation-scenarios", "--agent-id", "11", "--scenarios", "all", "--mode", "random", "--json"],
      ["list-ai-evaluation-results", "--scenario-ids", "1,zero", "--json"],
      ["create-ai-evaluation-metric", "--name", "Metric", "--type", "invalid", "--json"],
      ["generate-ai-evaluation-metrics", "--agent-id", "11", "--num-metrics", "-1", "--json"],
    ];
    for (const args of invalid) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, args.join(" "));
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("requires a v0.35 Go CLI and advertises the evaluator actions", () => {
    const old = setupFakeTelnyx("0.34.0");
    const blocked = runAgent(["list-ai-evaluation-personalities", "--json"], old.env);
    assert.equal(blocked.status, 1);
    assert.match(JSON.parse(blocked.stdout).error, /requires >= 0\.35\.0/);
    assert.deepEqual(loggedArgs(old.logPath), []);

    const help = runAgent(["help"], setupFakeTelnyx().env);
    assertSuccess(help);
    const capabilities = runAgent(["capabilities", "--json"], setupFakeTelnyx().env);
    assertSuccess(capabilities);
    for (const command of [
      "list-ai-evaluation-personalities", "create-ai-evaluation-agent", "create-ai-evaluation-scenario",
      "generate-ai-evaluation-scenarios", "get-ai-evaluation-scenario-generation-progress", "run-ai-evaluation-scenarios",
      "get-ai-evaluation-result", "list-ai-evaluation-results", "rerun-ai-evaluation-result", "create-ai-evaluation-metric",
      "generate-ai-evaluation-metrics", "get-ai-evaluation-metric-generation-progress",
    ]) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(JSON.parse(capabilities.stdout).composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
    assert.match(help.stdout, /AI Evaluator Workflow Flags \(requires Telnyx Go CLI v0\.35\+\):/);
    assert.match(help.stdout, /--scenarios <ids\|all> Comma-separated positive scenario IDs or all \(run required\)/);
    const evaluator = JSON.parse(capabilities.stdout).api_capabilities["🤖 AI"].find((entry: { name: string }) => entry.name === "Evaluator");
    assert.ok(evaluator.actions.includes("run_ai_evaluation_scenarios"));
    assert.ok(!evaluator.actions.some((action: string) => action.includes("delete") || action.includes("export") || action.includes("scenario_agent")));
  });
});

const ROOT = "ai:tests:test-framework:v1";
const AGENTS = `${ROOT}:aiagents`;
const SCENARIOS = `${ROOT}:scenarios`;
const RESULTS = `${ROOT}:results`;
const METRICS = `${ROOT}:metrics`;
