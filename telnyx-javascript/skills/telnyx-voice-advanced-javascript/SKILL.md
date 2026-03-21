---
name: telnyx-voice-advanced-javascript
description: >-
  DTMF sending, SIPREC recording, noise suppression, client state, and
  supervisor controls.
metadata:
  author: telnyx
  product: voice-advanced
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Advanced - JavaScript

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-javascript)

### Steps

1. **Send DTMF**: `client.calls.actions.sendDtmf({callControlId: ..., digits: ...})`
2. **Update client state**: `client.calls.actions.clientStateUpdate({callControlId: ..., clientState: ...})`
3. **SIP REFER**: `client.calls.actions.refer({callControlId: ..., sipAddress: ...})`

### Common mistakes

- client_state is base64-encoded and returned in every subsequent webhook — use it to track per-call context across webhook events
- DTMF digits are sent as a string, e.g., '1234#' — include terminator if needed
- SIPREC recording requires a SIPREC connector to be configured first

**Related skills**: telnyx-voice-javascript, telnyx-voice-media-javascript, telnyx-voice-gather-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.calls.actions.send_dtmf(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send DTMF

Sends DTMF tones from this leg. DTMF tones will be heard by the other end of the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.calls.actions.sendDtmf()` — `POST /calls/{call_control_id}/actions/send_dtmf`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `digits` | string | Yes | DTMF digits to send. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `durationMillis` | integer | No | Specifies for how many milliseconds each digit will be playe... |

```javascript
const response = await client.calls.actions.sendDtmf('call_control_id', { digits: '1www2WABCDw9' });

console.log(response.data);
```

Key response fields: `response.data.result`

## Update client state

Updates client state

`client.calls.actions.updateClientState()` — `PUT /calls/{call_control_id}/actions/client_state_update`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientState` | string | Yes | Use this field to add state to every subsequent webhook. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```javascript
const response = await client.calls.actions.updateClientState('call_control_id', {
  client_state: 'aGF2ZSBhIG5pY2UgZGF5ID1d',
});

console.log(response.data);
```

Key response fields: `response.data.result`

## Join AI Assistant Conversation

Add a participant to an existing AI assistant conversation. Use this command to bring an additional call leg into a running AI conversation.

`client.calls.actions.joinAIAssistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_join`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string (UUID) | Yes | The ID of the AI assistant conversation to join. |
| `participant` | object | Yes |  |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```javascript
const response = await client.calls.actions.joinAIAssistant('call_control_id', {
  conversation_id: 'v3:abc123',
  participant: { id: 'v3:abc123def456', role: 'user' },
});

console.log(response.data);
```

Key response fields: `response.data.conversation_id, response.data.result`

## SIPREC start

Start siprec session to configured in SIPREC connector SRS. 

**Expected Webhooks:**

- `siprec.started`
- `siprec.stopped`
- `siprec.failed`

`client.calls.actions.startSiprec()` — `POST /calls/{call_control_id}/actions/siprec_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `sipTransport` | enum (udp, tcp, tls) | No | Specifies SIP transport protocol. |
| `siprecTrack` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be sent on siprec session. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.calls.actions.startSiprec('v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ');

console.log(response.data);
```

Key response fields: `response.data.result`

## SIPREC stop

Stop SIPREC session. **Expected Webhooks:**

- `siprec.stopped`

`client.calls.actions.stopSiprec()` — `POST /calls/{call_control_id}/actions/siprec_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```javascript
const response = await client.calls.actions.stopSiprec('v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ');

console.log(response.data);
```

Key response fields: `response.data.result`

## Noise Suppression Start (BETA)

`client.calls.actions.startNoiseSuppression()` — `POST /calls/{call_control_id}/actions/suppression_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `direction` | enum (inbound, outbound, both) | No | The direction of the audio stream to be noise suppressed. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.calls.actions.startNoiseSuppression('v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ');

console.log(response.data);
```

Key response fields: `response.data.result`

## Noise Suppression Stop (BETA)

`client.calls.actions.stopNoiseSuppression()` — `POST /calls/{call_control_id}/actions/suppression_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```javascript
const response = await client.calls.actions.stopNoiseSuppression('v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ');

console.log(response.data);
```

Key response fields: `response.data.result`

## Switch supervisor role

Switch the supervisor role for a bridged call. This allows switching between different supervisor modes during an active call

`client.calls.actions.switchSupervisorRole()` — `POST /calls/{call_control_id}/actions/switch_supervisor_role`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | enum (barge, whisper, monitor) | Yes | The supervisor role to switch to. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```javascript
const response = await client.calls.actions.switchSupervisorRole('call_control_id', {
  role: 'barge',
});

console.log(response.data);
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```javascript
// In your webhook handler (e.g., Express — use raw body, not parsed JSON):
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body.toString(), {
      headers: req.headers,
    });
    // Signature valid — event is the parsed webhook payload
    console.log('Received event:', event.data.event_type);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `callConversationEnded` | `call.conversation.ended` | Call Conversation Ended |
| `callConversationInsightsGenerated` | `call.conversation.insights.generated` | Call Conversation Insights Generated |
| `callDtmfReceived` | `call.dtmf.received` | Call Dtmf Received |
| `callMachineDetectionEnded` | `call.machine.detection.ended` | Call Machine Detection Ended |
| `callMachineGreetingEnded` | `call.machine.greeting.ended` | Call Machine Greeting Ended |
| `callMachinePremiumDetectionEnded` | `call.machine.premium.detection.ended` | Call Machine Premium Detection Ended |
| `callMachinePremiumGreetingEnded` | `call.machine.premium.greeting.ended` | Call Machine Premium Greeting Ended |
| `callReferCompleted` | `call.refer.completed` | Call Refer Completed |
| `callReferFailed` | `call.refer.failed` | Call Refer Failed |
| `callReferStarted` | `call.refer.started` | Call Refer Started |
| `callSiprecFailed` | `call.siprec.failed` | Call Siprec Failed |
| `callSiprecStarted` | `call.siprec.started` | Call Siprec Started |
| `callSiprecStopped` | `call.siprec.stopped` | Call Siprec Stopped |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
