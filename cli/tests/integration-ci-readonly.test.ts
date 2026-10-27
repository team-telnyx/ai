/** Exercise the actual CI suite against a local account, without credentials. */
import { it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const cliRoot = fileURLToPath(new URL("..", import.meta.url));
const paths = ["/balance", "/phone_numbers", "/messaging_profiles", "/credential_connections", "/call_control_applications", "/ai/assistants"];

for (const failBalance of [false, true]) {
  it(`read-only CI sends only expected GETs and ${failBalance ? "rejects partial API failure" : "passes"}`, { timeout: 60_000 }, async () => {
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
      const childEnv = { ...process.env };
      delete childEnv.NODE_TEST_CONTEXT;
      const result = await run(process.execPath, ["--import", "tsx", "--test", "tests/integration-ci.test.ts"], {
        cwd: cliRoot,
        timeout: 50_000,
        env: {
          ...childEnv,
          TELNYX_API_KEY: "test-readonly-key",
          TELNYX_API_BASE_URL: `http://127.0.0.1:${address.port}/v2`,
          // All retained commands are REST/local. Any Go CLI call must fail.
          TELNYX_CLI_PATH: "/nonexistent/read-only-suite-must-not-provision",
        },
      }).then((value) => ({ code: 0, output: value.stdout }), (error) => ({ code: error.code, output: `${error.stdout}\n${error.stderr}` }));
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
