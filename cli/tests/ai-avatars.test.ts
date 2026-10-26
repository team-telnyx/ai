/** Mock-binary coverage for direct AI avatar lifecycle actions. */
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

function setupFakeTelnyx(version = "0.34.0"): { env: NodeJS.ProcessEnv; logPath: string; imagePath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-avatars-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const imagePath = join(tempDir, "avatar.png");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(imagePath, "not-an-image: the Go CLI owns image validation");
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "--version") {
  console.log("telnyx version ${version}");
} else if (args[0] === "ai:avatars" && args[1] === "list") {
  console.log(JSON.stringify({ data: [
    { id: "stock-1", name: "Stock Host", avatar_type: "stock" },
    { id: "avatar_custom-1", name: "Custom Host", avatar_type: "custom" }
  ], meta: { total_results: 2, page_number: 1, page_size: 20 } }));
} else if (args[0] === "ai:avatars" && args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "avatar_custom-created", name: args[args.indexOf("--name") + 1], avatar_type: "custom" } }));
} else if (args[0] === "ai:avatars" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: args[args.indexOf("--avatar-id") + 1], name: "Stock Host", avatar_type: "stock" } }));
} else if (args[0] === "ai:avatars" && args[1] === "update") {
  console.log(JSON.stringify({ data: { id: args[args.indexOf("--avatar-id") + 1], name: args[args.indexOf("--name") + 1], avatar_type: "custom" } }));
} else {
  console.error("unexpected fake invocation: " + JSON.stringify(args));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    imagePath,
    env: {
      ...process.env,
      TELNYX_API_KEY: "KEY_fake_test",
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
      status: err.status ?? 1,
    };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function actionCall(logPath: string): string[] {
  const call = loggedArgs(logPath).find((args) => args[0] !== "--version");
  assert.ok(call, "expected an AI avatar action invocation");
  return call;
}

describe("AI avatar lifecycle action commands", () => {
  it("creates a custom avatar through the multipart generated command", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "create-ai-avatar", "--image-file", fake.imagePath, "--name", "After-hours Host", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      avatar_id: "avatar_custom-created",
      ai_avatar: { id: "avatar_custom-created", name: "After-hours Host", avatar_type: "custom" },
    });
    assert.deepEqual(actionCall(fake.logPath), [
      "ai:avatars", "create", "--image-file", fake.imagePath, "--name", "After-hours Host", "--format", "json",
    ]);
  });

  it("retrieves and updates avatars using the generated avatar-id flag", () => {
    const retrieveFake = setupFakeTelnyx();
    const retrieved = runAgent(["get-ai-avatar", "--avatar-id", "stock-1", "--json"], retrieveFake.env);
    assert.equal(retrieved.status, 0, retrieved.stderr);
    assert.deepEqual(JSON.parse(retrieved.stdout), {
      avatar_id: "stock-1",
      ai_avatar: { id: "stock-1", name: "Stock Host", avatar_type: "stock" },
    });
    assert.deepEqual(actionCall(retrieveFake.logPath), [
      "ai:avatars", "retrieve", "--avatar-id", "stock-1", "--format", "json",
    ]);

    const updateFake = setupFakeTelnyx();
    const updated = runAgent([
      "update-ai-avatar", "--id", "avatar_custom-1", "--name", "Evening Host", "--json",
    ], updateFake.env);
    assert.equal(updated.status, 0, updated.stderr);
    assert.deepEqual(JSON.parse(updated.stdout), {
      avatar_id: "avatar_custom-1",
      ai_avatar: { id: "avatar_custom-1", name: "Evening Host", avatar_type: "custom" },
    });
    assert.deepEqual(actionCall(updateFake.logPath), [
      "ai:avatars", "update", "--avatar-id", "avatar_custom-1", "--name", "Evening Host", "--format", "json",
    ]);
  });

  it("lists avatars as one raw envelope and forwards generated filters and pagination", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "list-ai-avatars",
      "--filter-avatar-type", "custom",
      "--filter-id", "avatar_custom-1",
      "--filter-name", "host",
      "--page-number", "2",
      "--page-size", "10",
      "--max-items", "1",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      count: 1,
      ai_avatars: [{ id: "stock-1", name: "Stock Host", avatar_type: "stock" }],
      meta: { total_results: 2, page_number: 1, page_size: 20 },
    });
    assert.deepEqual(actionCall(fake.logPath), [
      "ai:avatars", "list",
      "--filter-avatar-type", "custom",
      "--filter-id", "avatar_custom-1",
      "--filter-name", "host",
      "--page-number", "2",
      "--page-size", "10",
      "--max-items", "1",
      "--format", "raw",
    ]);
  });

  it("validates local inputs and required avatar fields before dispatch", () => {
    const invalidCases: Array<{ args: string[]; fake: ReturnType<typeof setupFakeTelnyx> }> = [];
    const missingFile = setupFakeTelnyx();
    invalidCases.push({
      fake: missingFile,
      args: ["create-ai-avatar", "--image-file", join(dirname(missingFile.imagePath), "missing.png"), "--name", "Host", "--json"],
    });
    const missingName = setupFakeTelnyx();
    invalidCases.push({ fake: missingName, args: ["create-ai-avatar", "--image-file", missingName.imagePath, "--json"] });
    const missingId = setupFakeTelnyx();
    invalidCases.push({ fake: missingId, args: ["get-ai-avatar", "--json"] });
    const conflictingIds = setupFakeTelnyx();
    invalidCases.push({
      fake: conflictingIds,
      args: ["update-ai-avatar", "--id", "avatar_custom-1", "--avatar-id", "avatar_custom-2", "--name", "Host", "--json"],
    });
    const invalidPage = setupFakeTelnyx();
    invalidCases.push({ fake: invalidPage, args: ["list-ai-avatars", "--page-size", "0", "--json"] });

    for (const { args, fake } of invalidCases) {
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("requires Go CLI v0.34 before dispatching avatar actions", () => {
    const fake = setupFakeTelnyx("0.33.9");
    const result = runAgent(["list-ai-avatars", "--json"], fake.env);

    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /requires >= 0\.34\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), [["--version"]]);
  });

  it("advertises avatar commands in help and capabilities", () => {
    const fake = setupFakeTelnyx();
    const help = runAgent(["help"], fake.env);
    assert.equal(help.status, 0, help.stderr);
    const capabilitiesResult = runAgent(["capabilities", "--json"], fake.env);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);
    const avatarsCapability = capabilities.api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "AI Avatars",
    );

    for (const command of ["list-ai-avatars", "create-ai-avatar", "get-ai-avatar", "update-ai-avatar"]) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
    assert.match(help.stdout, /AI Avatar Lifecycle Flags \(requires Telnyx Go CLI v0\.34\+\)/);
    assert.deepEqual(avatarsCapability.actions, ["list_ai_avatars", "create_ai_avatar", "get_ai_avatar", "update_ai_avatar"]);
  });
});
