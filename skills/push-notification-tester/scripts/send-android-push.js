#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  console.log(`Usage: node send-android-push.js \\
  --token=<fcm_token> \\
  --project-id=<firebase_project_id> \\
  --service-account=<path/to/service-account.json> \\
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

  if (!args.token) fail('Missing required arg: --token');
  if (!args['project-id']) fail('Missing required arg: --project-id');
  if (!args['service-account']) fail('Missing required arg: --service-account');

  if (!fs.existsSync(args['service-account'])) {
    fail(`Service account file not found: ${args['service-account']}`);
  }

  const callerName = args['caller-name'] || 'Test Caller';
  const callerNumber = args['caller-number'] || '+1234567890';

  const { GoogleAuth } = require('google-auth-library');
  const axios = require('axios');

  let accessToken;
  try {
    const auth = new GoogleAuth({
      keyFile: args['service-account'],
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });
    accessToken = await auth.getAccessToken();
  } catch (e) {
    fail(`Authentication failed: ${e.message}`);
  }

  const payload = {
    message: {
      token: args.token,
      data: {
        type: 'voip',
        message: 'Telnyx VoIP Push Notification Tester',
        call_id: '87654321-dcba-4321-dcba-0987654321fe',
        caller_name: callerName,
        caller_number: callerNumber,
        voice_sdk_id: '12345678-abcd-1234-abcd-1234567890ab',
        metadata: JSON.stringify({
          call_id: '87654321-dcba-4321-dcba-0987654321fe',
          caller_name: callerName,
          caller_number: callerNumber,
          voice_sdk_id: '12345678-abcd-1234-abcd-1234567890ab'
        })
      },
      android: { priority: 'high' }
    }
  };

  const url = `https://fcm.googleapis.com/v1/projects/${args['project-id']}/messages:send`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(JSON.stringify({
      success: true,
      message: 'Push notification sent successfully',
      details: { messageName: response.data.name, projectId: args['project-id'] }
    }));
    process.exit(0);
  } catch (e) {
    if (e.response) {
      fail(`FCM error (${e.response.status}): ${JSON.stringify(e.response.data)}`);
    }
    fail(`Error sending push: ${e.message}`);
  }
}

main();
