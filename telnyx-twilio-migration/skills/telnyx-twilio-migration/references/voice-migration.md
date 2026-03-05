# Voice Migration: TwiML to TeXML

Step-by-step guide for migrating Twilio TwiML-based voice applications to Telnyx TeXML.

## Table of Contents

- [Overview](#overview)
- [Step 1: Create a Telnyx Account](#step-1-create-a-telnyx-account)
- [Step 2: Create a TeXML Application](#step-2-create-a-texml-application)
- [Step 3: Configure Webhook URLs](#step-3-configure-webhook-urls)
- [Step 4: Purchase or Port Phone Numbers](#step-4-purchase-or-port-phone-numbers)
- [Step 5: Update API Endpoints](#step-5-update-api-endpoints)
- [Step 6: Update Authentication](#step-6-update-authentication)
- [Step 7: Update Webhook Signature Validation](#step-7-update-webhook-signature-validation)
- [TeXML Bins](#texml-bins)
- [Testing Your Migration](#testing-your-migration)
- [Webhook Differences](#webhook-differences)
- [REST API Mapping](#rest-api-mapping)
- [Call Control API (Alternative to TeXML)](#call-control-api-alternative-to-texml)
- [Advanced Voice Patterns](#advanced-voice-patterns)

## Overview

TeXML is Telnyx's TwiML-compatible markup language. Most TwiML documents work with Telnyx with these changes:

1. API base URL: `api.twilio.com` → `api.telnyx.com/v2/texml`
2. Authentication: Basic Auth → Bearer Token
3. Webhook signatures: HMAC-SHA1 → Ed25519
4. Webhook payloads: same top-level structure for TeXML callbacks

Your XML voice documents (`<Response>`, `<Say>`, `<Gather>`, etc.) generally require **no changes**.

**TwiML builder classes → raw XML strings**: Twilio provides helper classes (`VoiceResponse` in Python, `twiml.VoiceResponse` in Node) that generate XML programmatically. Telnyx has no equivalent builder — return raw XML strings from your webhook endpoint instead:

```python
# Twilio (builder class)
from twilio.twiml.voice_response import VoiceResponse
resp = VoiceResponse()
resp.say('Hello')
gather = resp.gather(num_digits=1, action='/handle-key')
gather.say('Press 1 for sales')
return str(resp)

# Telnyx (raw XML string — same XML, just no builder)
return '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello</Say>
  <Gather numDigits="1" action="/handle-key">
    <Say>Press 1 for sales</Say>
  </Gather>
</Response>'''
```

```javascript
// Twilio (builder)
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const resp = new VoiceResponse();
resp.say('Hello');
const gather = resp.gather({ numDigits: 1, action: '/handle-key' });
gather.say('Press 1 for sales');
res.type('text/xml').send(resp.toString());

// Telnyx (raw XML — same output)
res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello</Say>
  <Gather numDigits="1" action="/handle-key">
    <Say>Press 1 for sales</Say>
  </Gather>
</Response>`);
```

The XML content is identical — only the generation method changes. For a complete verb reference, see `{baseDir}/references/texml-verbs.md`.

## Step 1: Create a Telnyx Account

1. Sign up at https://telnyx.com/sign-up
2. Complete identity verification
3. Generate an API Key v2 at https://portal.telnyx.com/#/app/api-keys
4. Note your public key at https://portal.telnyx.com/#/app/account/public-key (needed for webhook validation)

## Step 2: Create a TeXML Application

In the Mission Control Portal:

1. Navigate to **Voice** → **TeXML Applications**
2. Click **Add New App**
3. Set a friendly name (e.g., `my-ivr-app`)
4. Configure voice webhook URLs (see Step 3)

Or via API:

```bash
curl -X POST https://api.telnyx.com/v2/texml_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "my-ivr-app",
    "voice_url": "https://example.com/voice",
    "voice_method": "POST",
    "status_callback": "https://example.com/status",
    "status_callback_method": "POST"
  }'
```

## Step 3: Configure Webhook URLs

Point your TeXML application to the same webhook server that currently serves your TwiML responses. Your server returns XML in the `<Response>` format — this does not change.

| Setting | Description |
|---|---|
| Voice URL | Your server endpoint that returns TeXML/TwiML XML for incoming calls |
| Voice Fallback URL | Backup URL if the primary fails |
| Voice Method | `POST` (recommended) or `GET` |
| Status Callback | URL for call status events (initiated, ringing, answered, completed) |

## Step 4: Purchase or Port Phone Numbers

**Purchase new numbers:**

```bash
curl -X POST https://api.telnyx.com/v2/number_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [{"phone_number": "+15551234567"}],
    "connection_id": "YOUR_TEXML_APP_ID"
  }'
```

**Port existing numbers from Twilio:** See `{baseDir}/references/number-porting.md` for the full FastPort guide.

Assign each number to your TeXML Application in the portal or via API.

## Step 5: Update API Endpoints

Replace Twilio REST API endpoints with Telnyx TeXML endpoints:

| Operation | Twilio | Telnyx |
|---|---|---|
| **Base URL** | `https://api.twilio.com/2010-04-01/Accounts/{SID}` | `https://api.telnyx.com/v2/texml` |
| List calls | `GET /Calls.json` | `GET /Calls` |
| Make a call | `POST /Calls.json` | `POST /Calls` |
| Get call | `GET /Calls/{SID}.json` | `GET /Calls/{SID}` |
| Update call | `POST /Calls/{SID}.json` | `POST /Calls/{SID}` |
| List recordings | `GET /Recordings.json` | `GET /Recordings` |
| List conferences | `GET /Conferences.json` | `GET /Conferences` |

Example — initiate an outbound call:

```bash
# Twilio
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_SID/Calls.json" \
  -u "$TWILIO_SID:$TWILIO_AUTH_TOKEN" \
  -d "To=+15559876543" \
  -d "From=+15551234567" \
  -d "Url=https://example.com/outbound-call"

# Telnyx
curl -X POST "https://api.telnyx.com/v2/texml/Calls" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=+15559876543" \
  -d "From=+15551234567" \
  -d "Url=https://example.com/outbound-call"
```

## Step 6: Update Authentication

Replace Twilio's Basic Auth with Telnyx Bearer Token in all API calls:

```python
# Twilio
from twilio.rest import Client
client = Client("ACCOUNT_SID", "AUTH_TOKEN")

# Telnyx — using native SDK
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")
```

```javascript
// Twilio
const twilio = require('twilio');
const client = twilio('ACCOUNT_SID', 'AUTH_TOKEN');

// Telnyx — using native SDK
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_TELNYX_API_KEY' });
```

```bash
# Twilio
curl -u "$TWILIO_SID:$TWILIO_AUTH_TOKEN" ...

# Telnyx
curl -H "Authorization: Bearer $TELNYX_API_KEY" ...
```

```go
// Go
// Twilio
import "github.com/twilio/twilio-go"
client := twilio.NewRestClientWithParams(twilio.ClientParams{
    Username: "ACCOUNT_SID", Password: "AUTH_TOKEN",
})

// Telnyx
import (
    "github.com/team-telnyx/telnyx-go"
    "github.com/team-telnyx/telnyx-go/option"
)
client := telnyx.NewClient(option.WithAPIKey("YOUR_TELNYX_API_KEY"))
```

```ruby
# Twilio
require 'twilio-ruby'
client = Twilio::REST::Client.new(account_sid, auth_token)

# Telnyx
require 'telnyx'
client = Telnyx::Client.new(api_key: 'YOUR_TELNYX_API_KEY')
```

```java
// Twilio
import com.twilio.Twilio;
Twilio.init("ACCOUNT_SID", "AUTH_TOKEN");

// Telnyx — use REST API with Bearer token
// Java: use OkHttp/HttpClient with Authorization: Bearer header
```

## Step 7: Update Webhook Signature Validation

This is the most important code change. Twilio uses HMAC-SHA1 with your auth token. Telnyx uses Ed25519 with a public key.

**Python:**
```python
# Twilio (remove this)
from twilio.request_validator import RequestValidator
validator = RequestValidator(auth_token)
is_valid = validator.validate(url, params, request.headers.get('X-Twilio-Signature'))

# Telnyx (add this)
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

# Verify webhook signature using Ed25519
from telnyx.webhooks import verify_signature
try:
    verify_signature(
        payload=request.data.decode("utf-8"),
        signature=request.headers.get("telnyx-signature-ed25519"),
        timestamp=request.headers.get("telnyx-timestamp"),
        public_key="YOUR_PUBLIC_KEY"  # from portal.telnyx.com
    )
    # Signature valid
except Exception:
    # Signature invalid — reject the request
    return "Forbidden", 403
```

**Node.js:**
```javascript
// Twilio (remove this)
const twilio = require('twilio');
const isValid = twilio.validateRequest(authToken, signature, url, params);

// Telnyx (add this)
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_API_KEY' });
const PUBLIC_KEY = "YOUR_PUBLIC_KEY";

try {
  client.webhooks.signature.verifySignature(
    req.rawBody,  // Must be original bytes — see SKILL.md Express raw body setup
    req.headers['telnyx-signature-ed25519'],
    req.headers['telnyx-timestamp'],
    PUBLIC_KEY
  );
  // Signature valid
} catch (e) {
  // Signature invalid
  res.status(403).send('Forbidden');
}
```

**Go:**
```go
// Telnyx webhook signature validation in Go
// Use the telnyx-go SDK or verify Ed25519 manually:
import (
    "crypto/ed25519"
    "encoding/base64"
    "io"
    "net/http"
)

func verifyWebhook(r *http.Request, publicKeyBase64 string) bool {
    bodyBytes, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("telnyx-signature-ed25519")
    timestamp := r.Header.Get("telnyx-timestamp")
    // Concatenate timestamp + "|" + payload, verify with Ed25519 public key
    pubKeyBytes, _ := base64.StdEncoding.DecodeString(publicKeyBase64)
    sigBytes, _ := base64.StdEncoding.DecodeString(signature)
    message := []byte(timestamp + "|" + string(bodyBytes))
    return ed25519.Verify(ed25519.PublicKey(pubKeyBytes), message, sigBytes)
}
```

**Ruby:**
```ruby
# Telnyx webhook signature validation in Ruby
require 'telnyx'
client = Telnyx::Client.new(api_key: 'YOUR_API_KEY')

post '/webhook' do
  payload = request.body.read
  signature = request.env['HTTP_TELNYX_SIGNATURE_ED25519']
  timestamp = request.env['HTTP_TELNYX_TIMESTAMP']
  begin
    Telnyx::Webhook.construct_event(payload, signature, timestamp, public_key: 'YOUR_PUBLIC_KEY')
    # Signature valid
  rescue Telnyx::SignatureVerificationError
    halt 403, 'Forbidden'
  end
end
```

**Java:**
```java
// Telnyx webhook signature validation in Java
// No official Java SDK — verify Ed25519 manually using Bouncy Castle or java.security
// 1. Decode the base64 public key and signature
// 2. Concatenate: timestamp + "|" + requestBody
// 3. Verify using Ed25519 (java.security.Signature with "Ed25519" algorithm, Java 15+)
```

## TeXML Bins

Twilio has TwiML Bins — static TwiML documents hosted by Twilio. Telnyx has an equivalent: **TeXML Bins**.

Create a TeXML Bin in the Mission Control Portal under **Voice** → **TeXML Applications** → **TeXML Bins**. Paste your static XML and get a hosted URL you can use as a Voice URL or waitUrl.

## Testing Your Migration

1. **Validate your XML first:**
   ```bash
   bash {baseDir}/scripts/validate-texml.sh /path/to/your/twiml.xml
   ```

2. **Test with a single number:** Assign one number to your TeXML Application and make a test call.

3. **Check webhook delivery:** In the Mission Control Portal, navigate to **Debugging** → **API Logs** to see webhook deliveries and responses.

4. **Verify recordings:** If your app uses recording, confirm that dual-channel is acceptable or explicitly set `channels="single"` / `recordingChannels="single"`.

5. **Test answering machine detection (AMD):** If you use AMD, verify `machineDetection` attribute behavior. Telnyx supports `Regular` and `Premium` detection modes.

## Webhook Differences

TeXML callbacks use the same parameter names as TwiML for most fields. Key differences:

| Parameter | Notes |
|---|---|
| `AccountSid` | Your Telnyx Connection ID (not the same as Twilio Account SID) |
| `CallSid` | Telnyx call control ID |
| `RecordingUrl` | Valid for 10 minutes after call ends (Twilio URLs persist longer) |

Status callback events match Twilio's: `initiated`, `ringing`, `answered`, `completed`.

## Common Pitfalls

1. **Recording channels default to dual-channel** — Telnyx records in dual-channel (stereo) by default, Twilio uses single-channel. If your audio processing expects mono, explicitly set `channels="single"` on `<Record>` or `record_channels: "single"` in Call Control.

2. **Caller ID policy is strict** — Telnyx validates outbound caller IDs against your Outbound Voice Profile. If you're using dynamic caller IDs, make sure they're all authorized in your profile. Calls with unauthorized caller IDs will fail immediately.

3. **Status callback event names match but payloads differ** — Event names (initiated, ringing, answered, completed) are the same, but the webhook payload structure for Call Control API differs from TeXML callbacks. TeXML callbacks are form-encoded like Twilio; Call Control uses JSON.

4. **RecordingUrl is temporary** — Telnyx recording URLs are AWS S3 signed URLs that expire after 10 minutes (`X-Amz-Expires=600`). Any code that stores the URL for later playback will silently fail. Download the recording immediately in your webhook handler and persist it to your own storage.

```python
# Twilio (URL never expires — store it directly)
@app.route('/recording-callback', methods=['POST'])
def handle_recording():
    recording_url = request.form['RecordingUrl']
    call_sid = request.form['CallSid']
    # Safe to store URL and download days later
    db.save_recording(call_sid=call_sid, url=recording_url)
    return '', 204

# Telnyx (URL expires in 10 minutes — download immediately)
@app.route('/recording-callback', methods=['POST'])
def handle_recording():
    payload = request.json['data']['payload']
    recording_url = payload['recording_urls']['mp3']
    call_control_id = payload['call_control_id']

    # Download NOW — URL expires in 10 minutes
    response = requests.get(recording_url)
    response.raise_for_status()  # Fail loudly if download fails (e.g., URL expired)
    filename = f"recordings/{call_control_id}.mp3"
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    # Save to local filesystem (or upload to S3/GCS)
    with open(filename, 'wb') as f:
        f.write(response.content)
    db.save_recording(call_id=call_control_id, path=filename)
    return '', 200
```

```javascript
// Twilio (URL never expires — store it directly)
app.post('/recording-callback', (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  const callSid = req.body.CallSid;
  // Safe to store URL and download days later
  db.saveRecording({ callSid, url: recordingUrl });
  res.sendStatus(204);
});

// Telnyx (URL expires in 10 minutes — download immediately)
const fs = require('fs');
const { pipeline } = require('stream/promises');

app.post('/recording-callback', async (req, res) => {
  const payload = req.body.data.payload;
  const recordingUrl = payload.recording_urls.mp3;
  const callControlId = payload.call_control_id;

  // Download NOW — URL expires in 10 minutes
  const response = await fetch(recordingUrl);
  if (!response.ok) throw new Error(`Recording download failed: ${response.status} (URL may have expired)`);
  const filename = `recordings/${callControlId}.mp3`;
  fs.mkdirSync('recordings', { recursive: true });
  // Save to local filesystem (or upload to S3/GCS)
  await pipeline(response.body, fs.createWriteStream(filename));
  await db.saveRecording({ callId: callControlId, path: filename });
  res.sendStatus(200);
});
```

5. **AMD (Answering Machine Detection)** — Telnyx supports `Regular` and `Premium` detection modes. Twilio's `machineDetection` param maps to Telnyx's `answering_machine_detection`. The `Premium` mode provides async detection with separate webhook events (`call.machine.detection.ended`).

6. **Speech recognition engines** — In TeXML `<Gather>`, Telnyx supports multiple STT engines via the `transcriptionEngine` attribute (e.g., `transcriptionEngine="Google"`). If you were using Twilio's default speech recognition, you now have a choice of Google, Telnyx, Deepgram, or Azure.

## REST API Mapping

For REST API operations (managing calls, conferences, recordings programmatically), the existing TeXML skills in this repo provide complete SDK examples:

> **Complete TeXML API examples** with all parameters are in the sdk-reference files: `sdk-reference/{language}/texml.md`.

## Call Control API (Alternative to TeXML)

### Decision Tree: TeXML vs Call Control

Choose your migration path based on your current architecture:

- **You have existing TwiML XML** → **Use TeXML** (lowest effort, XML is compatible)
- **You generate TwiML programmatically** → **Consider either**: TeXML if the XML generation is simple; Call Control if you want finer control
- **You need real-time call manipulation** (bridge, park, supervisor) → **Use Call Control**
- **You're building from scratch** during migration → **Use Call Control** (more powerful, Telnyx-native)
- **You want to migrate incrementally** → **Start with TeXML** (drop-in), then migrate complex flows to Call Control over time

Telnyx offers a second voice API that has no Twilio equivalent: the **Call Control API**. It provides imperative, event-driven call management via REST instead of declarative XML.

| Aspect | TeXML | Call Control API |
|--------|-------|------------------|
| Model | Declarative XML | Imperative REST calls |
| State management | Stateless (XML per request) | Stateful (commands per call) |
| Flexibility | Limited to XML verbs | Full programmatic control |
| Learning curve | Low (TwiML-compatible) | Medium |
| Best for | Migrating existing TwiML apps | New apps needing complex logic |

**When to consider Call Control instead of TeXML:**
- Complex conditional routing that's awkward in XML
- Real-time call manipulation (bridging, parking, supervisor roles)
- Event-driven architectures (each call event triggers a webhook)
- Applications that need client state management (see below)

**Basic example — IVR with Call Control:**
```javascript
app.post('/call-webhook', async (req, res) => {
  const event = req.body.data;
  const callControlId = event.payload.call_control_id;

  switch (event.event_type) {
    case 'call.initiated':
      await client.calls.actions.answer(callControlId);
      break;
    case 'call.answered':
      await client.calls.actions.gatherUsingSpeak(callControlId, {
        minimum_digits: 1, maximum_digits: 1, timeout_millis: 10000,
        payload: 'Press 1 for sales, 2 for support'
      });
      break;
    case 'call.gather.ended':
      const digit = event.payload.digits;
      const dest = digit === '1' ? '+15551111111' : '+15552222222';
      await client.calls.actions.transfer(callControlId, { to: dest });
      break;
  }
  res.sendStatus(200);
});
```

> **Complete Call Control API examples** including bridge, gather, speak, transfer, streaming, and recording are in the sdk-reference files: `sdk-reference/{language}/voice.md` and `sdk-reference/{language}/voice-advanced.md`.

## Advanced Voice Patterns

These patterns are specific to Telnyx and have no direct Twilio equivalent. They are relevant when migrating contact center, PBX, or complex IVR applications.

### Client State (State Machine Pattern)

Telnyx Call Control uses `client_state` as a base64-encoded object to maintain state across webhook events. This replaces Twilio's pattern of encoding state in callback URLs or session storage.

```javascript
// Encode state when issuing a command
const state = Buffer.from(JSON.stringify({
  step: 'greeting_complete',
  caller_tier: 'premium',
  retry_count: 0
})).toString('base64');

await client.calls.actions.answer(callControlId, {
  client_state: state
});

// Decode state in the next webhook
app.post('/webhook', (req, res) => {
  const event = req.body.data;
  const clientState = JSON.parse(
    Buffer.from(event.payload.client_state, 'base64').toString()
  );
  // clientState.step === 'greeting_complete'
});
```

Every Call Control command (`answer`, `speak`, `gather`, `bridge`, `transfer`, etc.) accepts `client_state`. The state is echoed back in the subsequent webhook event, giving you a stateless server architecture.

> **`updateClientState()`** for modifying state on active calls is documented in `sdk-reference/{language}/voice-advanced.md`.

### Bridge, link_to, and bridge_on_answer

Telnyx Call Control provides fine-grained control over how calls are connected:

**Bridge** — connect two active Call Control calls:
```javascript
// Both calls must already be answered
await client.calls.actions.bridge(callControlIdA, {
  call_control_id: callControlIdB,
  client_state: state
});
```

**Dial with bridge_on_answer** — automatically bridge when the B-leg answers, without waiting for a webhook round-trip:
```bash
curl -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "YOUR_CONNECTION_ID",
    "to": "+15559876543",
    "from": "+15551234567",
    "answering_machine_detection": "disabled",
    "bridge_to": "CALL_CONTROL_ID_OF_WAITING_LEG",
    "bridge_on_answer": "bridge_on_answer"
  }'
```

This eliminates the need to handle the `call.answered` webhook and then issue a separate `bridge` command — reducing latency and code complexity.

**link_to** — permanently associate two calls so they share lifecycle events:
```javascript
// link_to is set during dial or bridge commands
await client.calls.dial({
  connection_id: 'YOUR_CONNECTION_ID',
  to: '+15559876543',
  from: '+15551234567',
  link_to: otherCallControlId
});
```

Linked calls receive each other's events, useful for building agent dashboards or call monitoring.

> **All optional parameters** for `dial` (including `bridge_on_answer`, `bridge_intent`, `link_to`, `supervisor_role`, `park_after_unbridge`, `sip_headers`, `custom_headers`) and `bridge` (including `park_after_unbridge`, `mute_dtmf`) are documented in the sdk-reference files under `voice.md` and `voice-advanced.md`.

### Caller ID Policy

Telnyx enforces caller ID policy on outbound calls. Unlike Twilio (where you pass any owned number as `callerId`), Telnyx validates caller ID against your **Outbound Voice Profile**:

- Each SIP Connection or TeXML Application has an associated Outbound Voice Profile
- The profile controls which numbers and CNAM settings can be used for outbound caller ID
- If you attempt to use a caller ID not authorized in your profile, the call will fail

```bash
# Create an outbound voice profile
curl -X POST https://api.telnyx.com/v2/outbound_voice_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "production-caller-ids"}'
```

Assign it to your connection in the Mission Control Portal under **SIP** → **Connections** → **Outbound**.

> **Complete SIP CRUD examples** for outbound voice profiles (with `whitelisted_destinations`, `traffic_type`, `calling_window`, `concurrent_call_limit`, `daily_spend_limit`, etc.) and credential connections (with `sip_uri_calling_preference`, `encrypted_media`, `inbound`/`outbound` objects, etc.) are in `sdk-reference/{language}/sip.md` and `sdk-reference/{language}/sip-integrations.md`.

### Subdomains

Telnyx supports SIP subdomains for credential-based connections. A subdomain provides a unique SIP registration URI per connection:

```
sip:username@YOUR_SUBDOMAIN.sip.telnyx.com
```

Configure via API when creating a credential connection:
```bash
curl -X POST https://api.telnyx.com/v2/credential_connections \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_name": "my-pbx",
    "active": true,
    "sip_subdomain": "my-company",
    "sip_subdomain_receive_settings": "only_my_connections"
  }'
```

`sip_subdomain_receive_settings` controls who can send calls to the subdomain:
- `from_anyone` — accept calls from any source
- `only_my_connections` — only accept calls from your other Telnyx connections

This is important for multi-tenant PBX deployments and inter-connection routing.

## Testing

When migrating voice tests from Twilio to Telnyx, update mocks and webhook payloads.

### Mock Patterns

**Python (pytest/unittest):**
```python
# Twilio mock:
# @patch('twilio.rest.Client')
# def test_call(mock_client):
#     mock_client.return_value.calls.create.return_value.sid = 'CA...'

# Telnyx mock (v4 SDK — client.calls.create):
@patch('your_module.client.calls.create')  # patch where client is used
def test_call(mock_create):
    mock_create.return_value = type('obj', (object,), {
        'data': type('obj', (object,), {
            'call_control_id': 'v3:uuid-here',
            'call_leg_id': 'uuid-here',
            'call_session_id': 'uuid-here',
            'is_alive': True,
        })()
    })()
    result = make_call('+15559876543')
    mock_create.assert_called_once()
```

**JavaScript (Jest):**
```javascript
jest.mock('telnyx', () => {
  return jest.fn().mockImplementation(() => ({
    calls: {
      create: jest.fn().mockResolvedValue({
        data: {
          call_control_id: 'v3:uuid-here',
          call_leg_id: 'uuid-here',
          call_session_id: 'uuid-here',
          is_alive: true,
        }
      })
    }
  }));
});
```

### Webhook Mock Payloads

```json
{
  "data": {
    "event_type": "call.initiated",
    "id": "evt-uuid",
    "occurred_at": "2024-01-15T10:30:00Z",
    "payload": {
      "call_control_id": "v3:uuid-here",
      "call_leg_id": "uuid-here",
      "call_session_id": "uuid-here",
      "connection_id": "conn-uuid",
      "from": "+15551234567",
      "to": "+15559876543",
      "direction": "incoming",
      "state": "ringing",
      "client_state": null
    },
    "record_type": "event"
  },
  "meta": { "attempt": 1 }
}
```

### Assertion Changes

| Twilio Assertion | Telnyx Assertion |
|---|---|
| `assert result.sid.startswith('CA')` | `assert result.data.call_control_id is not None` |
| `assert result.status == 'queued'` | `assert result.data.is_alive == True` |
| `assert result.from_ == '+15551234567'` | `assert result.data.from_ == '+15551234567'` (Call Control) |
| TwiML response content type `text/xml` | TeXML response content type `text/xml` (same) |
