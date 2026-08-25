# Troubleshooting — Telnyx Contact Center (AIF-273)

## SIP / Q.850 Error Code Reference

| Code | Meaning | Contact Center Scenario | Resolution |
|------|---------|------------------------|------------|
| 480 | Temporarily Unavailable | Agent softphone not registered | Check SIP credentials, verify softphone registration, ensure `sip.telnyx.com:5060` is configured |
| 486 | Busy Here | Agent already on a call | Implement round-robin: try next agent in pool |
| 487 | Request Terminated | Call cancelled by caller/agent | Normal hangup; clean up both legs and update metrics |
| 503 | Service Unavailable | Vendor/routing failure | Retry with different route; check OVP and vendor status |
| D13 | Country Not Whitelisted | Agent country not in OVP `whitelisted_destinations` | `PATCH /v2/outbound_voice_profiles/{id}` to add agent country code |
| D38 | No Outbound Voice Profile | CCA has no `outbound_voice_profile_id` assigned | `PATCH /v2/call_control_applications/{id}` with OVP ID |
| D41 | Telnyx Prefix/Policy Block | Destination blocked by Telnyx policy | Contact Telnyx support; do not promise unblock to customer |

## Webhook Event Reference

### call.initiated

Fires when a call is placed or received. **Check `direction` field first.**

```json
{
  "data": {
    "event_type": "call.initiated",
    "occurred_at": "2025-01-15T10:30:00.000Z",
    "payload": {
      "call_control_id": "call-xxx-xxx",
      "direction": "incoming",
      "from": "+1234567890",
      "to": "+1987654321",
      "telnyx_call_id": "uuid-here",
      "state": "parked"
    }
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `direction` | string | `incoming` (customer calling) or `outgoing` (agent being dialed) |
| `call_control_id` | string | Use for all subsequent call control actions |
| `state` | string | `parked` on initiate — must be answered |

### call.answered

Fires when a call leg is answered.

```json
{
  "data": {
    "event_type": "call.answered",
    "occurred_at": "2025-01-15T10:30:05.000Z",
    "payload": {
      "call_control_id": "call-xxx-xxx",
      "direction": "incoming",
      "from": "+1234567890",
      "to": "+1987654321",
      "telnyx_call_id": "uuid-here"
    }
  }
}
```

### call.gather.ended

Fires when DTMF gather completes.

```json
{
  "data": {
    "event_type": "call.gather.ended",
    "occurred_at": "2025-01-15T10:30:15.000Z",
    "payload": {
      "call_control_id": "call-xxx-xxx",
      "digits": "1",
      "status": "success"
    }
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `digits` | string | DTMF digits collected (e.g., `"1"`, `"2"`) |
| `status` | string | `success` or `timeout` (no DTMF detected) |

### call.bridged

Fires when two call legs are successfully bridged.

```json
{
  "data": {
    "event_type": "call.bridged",
    "occurred_at": "2025-01-15T10:30:25.000Z",
    "payload": {
      "call_control_id": "call-xxx-xxx",
      "bridged_to": "call-yyy-yyy",
      "from": "+1234567890",
      "to": "+1987654321"
    }
  }
}
```

### call.hangup

Fires when either party hangs up.

```json
{
  "data": {
    "event_type": "call.hangup",
    "occurred_at": "2025-01-15T10:35:00.000Z",
    "payload": {
      "call_control_id": "call-xxx-xxx",
      "direction": "incoming",
      "hangup_cause": "normal",
      "hangup_source": "caller",
      "duration": 300
    }
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `hangup_cause` | string | `normal`, `timeout`, `busy`, `cancel`, `reject` |
| `hangup_source` | string | `caller`, `callee`, `telnyx`, `api` |
| `duration` | number | Call duration in seconds |

### call.recording.saved

Fires when recording is processed and available. **May arrive after `call.hangup`.**

```json
{
  "data": {
    "event_type": "call.recording.saved",
    "occurred_at": "2025-01-15T10:35:05.000Z",
    "payload": {
      "call_control_id": "call-xxx-xxx",
      "recording_url": "https://storage.telnyx.com/recordings/xxx",
      "recording_id": "rec-xxx",
      "duration": 300,
      "transcription": "..."
    }
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `recording_url` | string | HTTPS URL to recording file |
| `recording_id` | string | Recording identifier for API access |
| `transcription` | string | Transcription text (if requested) |

## Diagnostic Decision Tree

```
Call fails? Start here
│
├── Inbound call fails to reach webhook?
│   ├── Check: CCA webhook URL is HTTPS and reachable
│   ├── Check: Phone number's connection_id matches CCA
│   └── Check: Webhook server is running and accepting POST
│
├── Outbound call (dial agent) fails?
│   ├── Check D38: Is OVP assigned to CCA?
│   │   └── No → PATCH /v2/call_control_applications/{id} with OVP ID
│   ├── Check D13: Is agent country in OVP whitelisted_destinations?
│   │   └── No → PATCH /v2/outbound_voice_profiles/{id} to add country
│   ├── Check credentials: SIP username/password valid?
│   │   └── No → Recreate credential_connection, present new credentials
│   └── Check phone number: Is agent number correct E.164 format?
│       └── No → Normalize to +E.164
│
├── Bridge fails?
│   ├── Check: Agent leg call_control_id stored before bridge attempt?
│   │   └── No → Fix race condition (FRIC-004), store state first
│   ├── Check: Agent leg state is "answered"?
│   │   └── No → Wait for call.answered before bridging
│   └── Retry bridge with 500ms delay (max 2 retries)
│
├── Recording missing?
│   ├── Check: record_start called after call.bridged?
│   ├── Check: call.recording.saved handler exists?
│   └── Check: Call record kept open after hangup for retroactive update?
│       └── No → Fix FRIC-006, keep record for 60s grace period
│
└── Agent keeps ringing after customer hangs up?
    ├── Check: call.hangup handler cancels agent leg?
    │   └── No → Add POST /v2/calls/{agent_id}/actions/hangup
    └── Check: Agent call_control_id stored in call state?
        └── No → Store both leg IDs in call state map
```

## Retry Logic for Transient Failures

```javascript
// Exponential backoff retry — max 3 retries
async function withRetry(fn, maxRetries = 3, baseDelay = 500) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage: retry bridge action
await withRetry(() => bridgeCalls(customerLegId, agentLegId));
```

| Retry Scenario | Max Retries | Base Delay | Notes |
|----------------|-------------|------------|-------|
| Bridge 422 (state not ready) | 2 | 500ms | Agent leg may still be building |
| Telnyx API 429 (rate limit) | 3 | 1000ms | Honor Retry-After header if present |
| Telnyx API 503 (service unavailable) | 3 | 2000ms | Transient; check status page |
| Webhook delivery timeout | 3 | 500ms | Telnyx retries automatically, but webhook server should be idempotent |

## Production Checklist

- [ ] Webhook URL is HTTPS and publicly reachable (test with `curl -X POST`)
- [ ] Webhook server returns 200 within 3 seconds for all events
- [ ] Call Control Application has `outbound_voice_profile_id` assigned (prevents D38)
- [ ] All agent destination countries are in OVP `whitelisted_destinations` (prevents D13)
- [ ] Phone number's `connection_id` matches the CCA ID
- [ ] SIP/WebRTC credentials are valid and agents are registered (for Path B/C)
- [ ] Call recording is enabled (test end-to-end, verify recording URL is stored)
- [ ] Voicemail fallback is implemented for agent no-answer
- [ ] Agent leg cancellation on customer hangup is implemented (prevents ringing)
- [ ] `call.initiated` handler checks `direction` field (prevents IVR on agent leg)
- [ ] `call.recording.saved` handler updates metrics retroactively (may arrive after hangup)
- [ ] Webhook handlers are idempotent (same event processed twice = no side effects)
- [ ] Monitoring: webhook server health endpoint (`GET /health`)
- [ ] Monitoring: alert on webhook 5xx error rate > 1%
- [ ] Rate limiting on webhook server to prevent abuse

## Webhook Receiver Examples

### Express.js Middleware Pattern

```javascript
const express = require('express');
const app = express();

// Raw body for webhook signature verification (if needed)
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/telnyx', (req, res) => {
  // Always return 200 quickly — Telnyx expects fast acknowledgment
  res.status(200).json({ ok: true });

  // Parse the event (async, off the request path)
  setImmediate(() => {
    try {
      const event = JSON.parse(req.body);
      handleEvent(event);
    } catch (err) {
      console.error('Webhook parse error:', err.message);
    }
  });
});

function handleEvent(event) {
  const { event_type, payload } = event.data;
  switch (event_type) {
    case 'call.initiated':
      if (payload.direction === 'incoming') {
        answerCall(payload.call_control_id);
      }
      break;
    case 'call.answered':
      startIVRGather(payload.call_control_id);
      break;
    case 'call.gather.ended':
      routeToDepartment(payload.call_control_id, payload.digits);
      break;
    case 'call.bridged':
      startRecording(payload.call_control_id);
      break;
    case 'call.hangup':
      handleHangup(payload.call_control_id, payload);
      break;
    case 'call.recording.saved':
      updateRecordingUrl(payload.call_control_id, payload.recording_url);
      break;
    default:
      console.log('Unhandled event:', event_type);
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Webhook server on :3000'));
```
