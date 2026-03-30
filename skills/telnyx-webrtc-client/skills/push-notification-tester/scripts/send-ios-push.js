#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Auto-install deps
const nodeModules = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModules)) {
  require('child_process').execSync('npm install --production', { cwd: __dirname, stdio: 'pipe' });
}

// --- Arg parsing ---
function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([a-z-]+)=(.+)$/);
    if (m) args[m[1]] = m[2];
    else if (arg === '--help') args.help = true;
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node send-ios-push.js \\
  --token=<device_token> \\
  --bundle-id=<bundle_id> \\
  --cert=<path/to/cert.pem> \\
  --key=<path/to/key.pem> \\
  [--env=sandbox|production] \\
  [--caller-name="Test Caller"] \\
  [--caller-number="+1234567890"]`);
}

function fail(msg) {
  console.log(JSON.stringify({ success: false, error: msg }));
  process.exit(1);
}

// --- Main ---
async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  // Validate required
  if (!args.token) fail('Missing required arg: --token');
  if (!args['bundle-id']) fail('Missing required arg: --bundle-id');
  if (!args.cert) fail('Missing required arg: --cert');
  if (!args.key) fail('Missing required arg: --key');

  if (!/^[a-fA-F0-9]{64}$/.test(args.token)) {
    fail('Invalid device token format. Must be 64 hex characters.');
  }

  if (!fs.existsSync(args.cert)) fail(`Certificate file not found: ${args.cert}`);
  if (!fs.existsSync(args.key)) fail(`Key file not found: ${args.key}`);

  const env = args.env || 'sandbox';
  if (env !== 'sandbox' && env !== 'production') {
    fail('--env must be "sandbox" or "production"');
  }

  const callerName = args['caller-name'] || 'Test Caller';
  const callerNumber = args['caller-number'] || '+1234567890';

  // Send
  const apn = require('@parse/node-apn');

  let provider;
  try {
    provider = new apn.Provider({
      cert: args.cert,
      key: args.key,
      production: env === 'production'
    });
  } catch (e) {
    fail(`Failed to create APN provider: ${e.message}`);
  }

  const notification = new apn.Notification();
  notification.topic = args['bundle-id'] + '.voip';
  notification.priority = 10;
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
  notification.payload = {
    metadata: {
      voice_sdk_id: randomUUID(),
      call_id: randomUUID(),
      caller_name: callerName,
      caller_number: callerNumber
    }
  };

  try {
    const result = await provider.send(notification, args.token);

    if (result.sent.length > 0) {
      console.log(JSON.stringify({
        success: true,
        message: 'Push notification sent successfully',
        details: { device: result.sent[0].device, payload: notification.payload }
      }));
      process.exit(0);
    }

    if (result.failed.length > 0) {
      const f = result.failed[0];
      fail(`APNs rejected: status=${f.status}, response=${JSON.stringify(f.response)}`);
    }

    fail('Unknown result from APNs');
  } catch (e) {
    fail(`Error sending push: ${e.message}`);
  } finally {
    provider.shutdown();
  }
}

main();
