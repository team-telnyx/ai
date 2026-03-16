---
name: telnyx-voice-advanced-python
description: >-
  DTMF sending, SIPREC recording, noise suppression, client state, and
  supervisor controls.
metadata:
  author: telnyx
  product: voice-advanced
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Advanced - Python

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-python)

### Steps

1. **Send DTMF**: `client.calls.actions.send_dtmf(call_control_id=..., digits=...)`
2. **Update client state**: `client.calls.actions.client_state_update(call_control_id=..., client_state=...)`
3. **SIP REFER**: `client.calls.actions.refer(call_control_id=..., sip_address=...)`

### Common mistakes

- client_state is base64-encoded and returned in every subsequent webhook — use it to track per-call context across webhook events
- DTMF digits are sent as a string, e.g., '1234#' — include terminator if needed
- SIPREC recording requires a SIPREC connector to be configured first

**Related skills**: telnyx-voice-python, telnyx-voice-media-python, telnyx-voice-gather-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.calls.actions.send_dtmf(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send DTMF

Sends DTMF tones from this leg. DTMF tones will be heard by the other end of the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.calls.actions.send_dtmf()` — `POST /calls/{call_control_id}/actions/send_dtmf`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `digits` | string | Yes | DTMF digits to send. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `duration_millis` | integer | No | Specifies for how many milliseconds each digit will be playe... |

```python
response = client.calls.actions.send_dtmf(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    digits="1www2WABCDw9",
)
print(response.data)
```

Key response fields: `response.data.result`

## Update client state

Updates client state

`client.calls.actions.update_client_state()` — `PUT /calls/{call_control_id}/actions/client_state_update`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_state` | string | Yes | Use this field to add state to every subsequent webhook. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```python
response = client.calls.actions.update_client_state(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    client_state="aGF2ZSBhIG5pY2UgZGF5ID1d",
)
print(response.data)
```

Key response fields: `response.data.result`

## SIPREC start

Start siprec session to configured in SIPREC connector SRS. 

**Expected Webhooks:**

- `siprec.started`
- `siprec.stopped`
- `siprec.failed`

`client.calls.actions.start_siprec()` — `POST /calls/{call_control_id}/actions/siprec_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `sip_transport` | enum (udp, tcp, tls) | No | Specifies SIP transport protocol. |
| `siprec_track` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be sent on siprec session. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_siprec(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## SIPREC stop

Stop SIPREC session. **Expected Webhooks:**

- `siprec.stopped`

`client.calls.actions.stop_siprec()` — `POST /calls/{call_control_id}/actions/siprec_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```python
response = client.calls.actions.stop_siprec(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Noise Suppression Start (BETA)

`client.calls.actions.start_noise_suppression()` — `POST /calls/{call_control_id}/actions/suppression_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `direction` | enum (inbound, outbound, both) | No | The direction of the audio stream to be noise suppressed. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_noise_suppression(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Noise Suppression Stop (BETA)

`client.calls.actions.stop_noise_suppression()` — `POST /calls/{call_control_id}/actions/suppression_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```python
response = client.calls.actions.stop_noise_suppression(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Switch supervisor role

Switch the supervisor role for a bridged call. This allows switching between different supervisor modes during an active call

`client.calls.actions.switch_supervisor_role()` — `POST /calls/{call_control_id}/actions/switch_supervisor_role`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | enum (barge, whisper, monitor) | Yes | The supervisor role to switch to. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```python
response = client.calls.actions.switch_supervisor_role(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    role="barge",
)
print(response.data)
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```python
# In your webhook handler (e.g., Flask — use raw body, not parsed JSON):
@app.route("/webhooks", methods=["POST"])
def handle_webhook():
    payload = request.get_data(as_text=True)  # raw body as string
    headers = dict(request.headers)
    try:
        event = client.webhooks.unwrap(payload, headers=headers)
    except Exception as e:
        print(f"Webhook verification failed: {e}")
        return "Invalid signature", 400
    # Signature valid — event is the parsed webhook payload
    print(f"Received event: {event.data.event_type}")
    return "OK", 200
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
