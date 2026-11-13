// Exercise the packed package with native Node ESM, not tsx's loader.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'telnyx-esm-'));
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, TELNYX_FRICTION_ENABLED: 'false' },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`);
  return result.stdout;
}
function consumer(name, peers, source) {
  const cwd = join(scratch, name);
  mkdirSync(cwd);
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', tarball, ...peers], cwd);
  run('npm', ['ls', '--depth=0'], cwd);
  writeFileSync(join(cwd, 'smoke.mjs'), source);
  run(process.execPath, ['--test', 'smoke.mjs'], cwd);
}
let tarball;
try {
  run(process.execPath, ['--version'], root);
  run('npm', ['--version'], root);
  run('npm', ['run', 'build'], root);
  const packed = run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], root);
  tarball = resolve(scratch, JSON.parse(packed)[0].filename);
  consumer('no-peers', [], `
    import assert from 'node:assert/strict';
    import { test } from 'node:test';
    import { TelnyxAgentToolkit } from '@telnyx/agent-toolkit';
    import { mkdirSync, writeFileSync } from 'node:fs';
    function fixture(name, source, exports = './index.cjs') {
      const dir = new URL('./node_modules/' + name + '/', import.meta.url);
      mkdirSync(dir, { recursive: true });
      writeFileSync(new URL('package.json', dir), JSON.stringify({ name, exports }));
      writeFileSync(new URL('index.cjs', dir), source);
    }
    await import('@telnyx/agent-toolkit/openai');
    await import('@telnyx/agent-toolkit/vercel-ai');
    await import('@telnyx/agent-toolkit/langchain');
    assert.equal(globalThis.require, undefined);
    const toolkit = new TelnyxAgentToolkit('offline-placeholder', { frictionEnabled: false });
    test('core imports and OpenAI schemas need no optional peers', () => {
      assert.equal(toolkit.getOpenAITools().length, toolkit.enabledTools.length);
    });
    for (const [method, dependency] of [['getVercelAITools', 'ai'], ['getLangChainTools', '@langchain/core']]) {
      test(method + ' gives useful missing-peer guidance', () => {
        assert.throws(() => toolkit[method](), error => {
          assert.match(error.message, new RegExp('npm install ' + dependency));
          assert.equal(error.cause?.code, 'MODULE_NOT_FOUND');
          return true;
        });
      });
    }
    import { spawnSync } from 'node:child_process';
    function failsInFreshProcess(method, check) {
      // Node may cache failed package resolution; each module state gets a cold process.
      const result = spawnSync(process.execPath, ['--input-type=module', '-e',
        "import assert from 'node:assert/strict';" +
        "import { TelnyxAgentToolkit } from '@telnyx/agent-toolkit';" +
        "const toolkit = new TelnyxAgentToolkit('offline-placeholder', { frictionEnabled: false });" +
        "assert.throws(() => toolkit['" + method + "'](), error => {" + check + "; return true; });"
      ], { encoding: 'utf8', timeout: 30_000 });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
    }
    // Controlled broken-module fixtures verify diagnostics, not SDK compatibility.
    for (const [method, dependency, exports] of [
      ['getVercelAITools', 'ai', './index.cjs'],
      ['getLangChainTools', '@langchain/core', { './tools': './index.cjs' }],
    ]) {
      test(method + ' retains an installed peer initialization error', () => {
        fixture(dependency, 'throw new Error("peer initialization sentinel")', exports);
        failsInFreshProcess(method, "assert.match(error.message, /synchronously/); assert.equal(error.cause?.message, 'peer initialization sentinel')");
      });
      test(method + ' retains a missing transitive module cause', () => {
        fixture(dependency, 'require("deliberately-missing-peer-internal")', exports);
        failsInFreshProcess(method, "assert.match(error.message, /synchronously/); assert.equal(error.cause?.code, 'MODULE_NOT_FOUND'); assert.match(error.cause.message, /deliberately-missing-peer-internal/)");
      });
    }
    test('both adapters report a missing Zod peer after loading the framework', () => {
      fixture('ai', 'exports.tool = value => value');
      fixture('@langchain/core', 'exports.DynamicStructuredTool = class {}', { './tools': './index.cjs' });
      for (const method of ['getVercelAITools', 'getLangChainTools']) {
        failsInFreshProcess(method, "assert.match(error.message, /npm install zod/); assert.equal(error.cause?.code, 'MODULE_NOT_FOUND'); assert.match(error.cause.message, /zod/)");
      }
    });
    for (const [method, dependency, exports] of [
      ['getVercelAITools', 'ai', './index.mjs'],
      ['getLangChainTools', '@langchain/core', { './tools': './index.mjs' }],
    ]) {
      test(method + ' preserves an asynchronous ESM peer loading cause', () => {
        fixture(dependency, '', exports);
        writeFileSync(new URL('./node_modules/' + dependency + '/index.mjs', import.meta.url),
          'await Promise.resolve(); export const tool = value => value; export class DynamicStructuredTool {}');
        failsInFreshProcess(method, "assert.match(error.message, /synchronously/); assert(['ERR_REQUIRE_ASYNC_MODULE', 'ERR_REQUIRE_ESM'].includes(error.cause?.code))");
      });
    }
  `);
  // These actual dual-format versions implement the adapter's existing parameters contract.
  consumer('with-peers', ['ai@4.3.19', '@langchain/core@0.3.79', 'zod@3.25.76'], `
    import assert from 'node:assert/strict';
    import { test } from 'node:test';
    import { createRequire } from 'node:module';
    import { TelnyxAgentToolkit } from '@telnyx/agent-toolkit';
    const require = createRequire(import.meta.url);
    const { DynamicStructuredTool } = require('@langchain/core/tools');
    assert.equal(globalThis.require, undefined);
    const toolkit = new TelnyxAgentToolkit('offline-placeholder', { frictionEnabled: false });
    test('native ESM Vercel factory stays synchronous and builds valid schemas', async () => {
      const tools = toolkit.getVercelAITools();
      assert.equal(tools instanceof Promise, false);
      assert.equal(toolkit.enabledTools.length, 200);
      assert.equal(Object.keys(tools).length, 200);
      const optional = new TelnyxAgentToolkit('offline-placeholder', { storage: true, frictionEnabled: false });
      assert.equal(optional.enabledTools.length, 205);
      assert.equal(Object.keys(optional.getVercelAITools()).length, 205);
      for (const tool of Object.values(tools)) {
        assert.equal(typeof tool.execute, 'function');
        assert.equal(typeof tool.parameters.safeParse, 'function');
      }
      const relay = tools.start_conversation_relay.parameters;
      assert.equal(relay.safeParse({ call_control_id: 'offline' }).success, false);
      assert.equal(relay.safeParse({ call_control_id: 'offline', url: 'wss://example.test' }).success, true);
      toolkit.core.runTool = async (name, args) => JSON.stringify({ name, args });
      assert.deepEqual(await tools.list_phone_numbers.execute({}), { name: 'list_phone_numbers', args: {} });
    });
    test('native ESM LangChain factory stays synchronous and builds real tools', async () => {
      const tools = toolkit.getLangChainTools();
      assert.equal(tools instanceof Promise, false);
      assert.equal(toolkit.enabledTools.length, 200);
      assert.equal(tools.length, 200);
      const optional = new TelnyxAgentToolkit('offline-placeholder', { storage: true, frictionEnabled: false });
      assert.equal(optional.enabledTools.length, 205);
      assert.equal(optional.getLangChainTools().length, 205);
      for (const tool of tools) {
        assert(tool instanceof DynamicStructuredTool);
        assert.equal(typeof tool.invoke, 'function');
        assert.equal(typeof tool.schema.safeParse, 'function');
      }
      const relay = tools.find(tool => tool.name === 'start_conversation_relay');
      assert.equal(relay.schema.safeParse({ call_control_id: 'offline' }).success, false);
      assert.equal(relay.schema.safeParse({ call_control_id: 'offline', url: 'wss://example.test' }).success, true);
      toolkit.core.runTool = async (name, args) => JSON.stringify({ name, args });
      assert.deepEqual(JSON.parse(await tools.find(tool => tool.name === 'list_phone_numbers').invoke({})), { name: 'list_phone_numbers', args: {} });
    });
  `);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
