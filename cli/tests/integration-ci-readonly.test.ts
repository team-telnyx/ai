/** Exercise the actual CI suite against a local account, without credentials. */
import { it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const cliRoot = fileURLToPath(new URL("..", import.meta.url));
const guardPath = fileURLToPath(new URL("./fixtures/readonly-egress-guard.cjs", import.meta.url));
const blockedEndpoint = "https://readonly-egress.invalid/report";

function childEnvironment(port: number): NodeJS.ProcessEnv {
  // Do not inherit credentials, reporter/proxy settings or arbitrary Node hooks.
  const env: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR"]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return {
    ...env,
    NODE_OPTIONS: `--require=${JSON.stringify(guardPath)}`,
    TELNYX_API_KEY: "test-readonly-key",
    TELNYX_API_BASE_URL: `http://127.0.0.1:${port}/v2`,
    TELNYX_FRICTION_ENABLED: "false",
    TELNYX_FRICTION_ENDPOINT: "",
    TELNYX_TELEMETRY_ENDPOINT: "",
    // All retained commands are REST/local. Any Go CLI call must fail.
    TELNYX_CLI_PATH: "/nonexistent/read-only-suite-must-not-provision",
  };
}

const probes = {
  fetch: `fetch(${JSON.stringify(blockedEndpoint)}).catch(() => {})`,
  http: `require("node:http").get("http://readonly-egress.invalid", () => {}).on("error", () => {})`,
  https: `require("node:https").get(${JSON.stringify(blockedEndpoint)}, () => {}).on("error", () => {})`,
  tcp: `require("node:net").connect(80, "192.0.2.1").on("error", () => {})`,
  descendant: `const result = require("node:child_process").spawnSync(process.execPath, ["--eval", 'fetch("https://readonly-egress.invalid").catch(() => {})'], {stdio: "inherit"}); process.exit(result.status ?? 1)`,
  telemetry: `const { TelemetryReporter } = require("./src/telemetry.ts"); new TelemetryReporter(${JSON.stringify(blockedEndpoint)}).report({tool: "guard-probe", status: "error"})`,
  friction: `const { FrictionReporter } = require("./src/friction.ts"); new FrictionReporter(${JSON.stringify(blockedEndpoint)}, true).report({tool: "guard-probe", http_status: 401, api_key: "test-readonly-key"})`,
};

async function assertBlocked(code: string, port = 1): Promise<void> {
  await assert.rejects(run(process.execPath, ["--import", "tsx", "--eval", code], {
    cwd: cliRoot,
    timeout: 10_000,
    env: childEnvironment(port),
  }), (error: any) => {
    assert.equal(error.code, 86, `${error.stdout}\n${error.stderr}`);
    assert.match(error.stderr, /READONLY_EGRESS_BLOCKED/);
    return true;
  });
}

for (const [name, code] of Object.entries(probes)) {
  it(`read-only egress guard blocks ${name} even when errors are caught`, { timeout: 15_000 }, async () => {
    await assertBlocked(code);
  });
}

it("read-only egress guard blocks redirects away from the local API", { timeout: 15_000 }, async () => {
  let requests = 0;
  const server = createServer((_req, res) => {
    requests++;
    res.writeHead(302, { Location: blockedEndpoint }).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address() as { port: number };
    await assertBlocked(`fetch("http://127.0.0.1:${port}/redirect").catch(() => {})`, port);
    assert.equal(requests, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

const paths = ["/balance", "/phone_numbers", "/messaging_profiles", "/credential_connections", "/call_control_applications", "/ai/assistants"];

for (const { failBalance, inheritedReporting } of [
  { failBalance: false, inheritedReporting: false },
  { failBalance: true, inheritedReporting: false },
  { failBalance: true, inheritedReporting: true },
]) {
  it(`read-only CI sends only expected GETs and ${failBalance ? "rejects partial API failure" : "passes"}${inheritedReporting ? " with inherited reporting enabled" : ""}`, { timeout: 60_000 }, async () => {
    const requests: string[] = [];
    const server = createServer((req, res) => {
      const path = new URL(req.url!, "http://localhost").pathname.replace(/^\/v2/, "");
      requests.push(`${req.method} ${path}`);
      res.setHeader("Content-Type", "application/json");
      if (req.method !== "GET" || !paths.includes(path)) {
        res.writeHead(400).end(JSON.stringify({ errors: [{ detail: "Unexpected request" }] }));
      } else if (failBalance && path === "/balance") {
        res.writeHead(401).end(JSON.stringify({ errors: [{ detail: "Unauthorized" }] }));
      } else {
        res.end(JSON.stringify({
          data: path === "/balance" ? { balance: "10", currency: "USD" } : [],
          meta: { total_results: 0 },
        }));
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    try {
      const result = await run(process.execPath, ["--import", "tsx", "--test", "tests/integration-ci.test.ts"], {
        cwd: cliRoot,
        timeout: 50_000,
        env: {
          ...childEnvironment(address.port),
          // Simulate a live runner with reporting enabled; the suite must still
          // disable both reporters in each packaged CLI descendant.
          ...(inheritedReporting ? {
            TELNYX_FRICTION_ENABLED: "true",
            TELNYX_FRICTION_ENDPOINT: blockedEndpoint,
            TELNYX_TELEMETRY_ENDPOINT: blockedEndpoint,
          } : {}),
        },
      }).then((value) => ({ code: 0, output: value.stdout }), (error) => ({ code: error.code, output: `${error.stdout}\n${error.stderr}` }));
      assert.doesNotMatch(result.output, /READONLY_EGRESS_BLOCKED/);
      assert.ok(requests.length > 0, `Must execute the live suite, not skip it: ${result.output}`);
      assert.deepEqual(requests.sort(), [...paths, ...paths].map((path) => `GET ${path}`).sort());
      if (failBalance) {
        assert.equal(result.code, 1, result.output);
        assert.match(result.output, /partially failed status query/);
      } else {
        assert.equal(result.code, 0, result.output);
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    }
  });
}
