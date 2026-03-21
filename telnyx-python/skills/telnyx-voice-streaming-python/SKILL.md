---
name: telnyx-voice-streaming-python
description: >-
  Real-time audio streaming, media forking, and live transcription. Use for
  analytics and AI integrations.
metadata:
  author: telnyx
  product: voice-streaming
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Streaming - Python

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-python)
2. WebSocket server ready to receive audio stream (for streaming)

### Steps

1. **Start streaming**: `client.calls.actions.streaming_start(call_control_id=..., stream_url=...)`
2. **Start transcription**: `client.calls.actions.transcription_start(call_control_id=..., language=...)`
3. **Start fork**: `client.calls.actions.fork_start(call_control_id=..., target=..., stream_type=...)`

### Common mistakes

- stream_url must be a WebSocket URL (wss://) — HTTP URLs will fail
- Transcription events arrive via call.transcription webhook — not in the API response
- VOICE IS EVENT-DRIVEN: all streaming commands return immediately, data arrives via WebSocket or webhooks

**Related skills**: telnyx-voice-python, telnyx-voice-media-python

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
    result = client.calls.actions.streaming_start(params)
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

## Streaming start

Start streaming the media from a call to a specific WebSocket address or Dialogflow connection in near-realtime. Audio will be delivered as base64-encoded RTP payload (raw audio), wrapped in JSON payloads. Please find more details about media streaming messages specification under the [link](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming).

`client.calls.actions.start_streaming()` — `POST /calls/{call_control_id}/actions/streaming_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `stream_track` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be streamed. |
| `stream_codec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | No | Specifies the codec to be used for the streamed audio. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_streaming(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    stream_url="wss://example.com/audio-stream",
)
print(response.data)
```

Key response fields: `response.data.result`

## Streaming stop

Stop streaming a call to a WebSocket. **Expected Webhooks:**

- `streaming.stopped`

`client.calls.actions.stop_streaming()` — `POST /calls/{call_control_id}/actions/streaming_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `stream_id` | string (UUID) | No | Identifies the stream. |

```python
response = client.calls.actions.stop_streaming(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Transcription start

Start real-time transcription. Transcription will stop on call hang-up, or can be initiated via the Transcription stop command. **Expected Webhooks:**

- `call.transcription`

`client.calls.actions.start_transcription()` — `POST /calls/{call_control_id}/actions/transcription_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `transcription_engine` | enum (Google, Telnyx, Deepgram, Azure, A, ...) | No | Engine to use for speech recognition. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_transcription(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Transcription stop

Stop real-time transcription.

`client.calls.actions.stop_transcription()` — `POST /calls/{call_control_id}/actions/transcription_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```python
response = client.calls.actions.stop_transcription(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Forking start

Call forking allows you to stream the media from a call to a specific target in realtime. This stream can be used to enable realtime audio analysis to support a 
variety of use cases, including fraud detection, or the creation of AI-generated audio responses. Requests must specify either the `target` attribute or the `rx` and `tx` attributes.

`client.calls.actions.start_forking()` — `POST /calls/{call_control_id}/actions/fork_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `stream_type` | enum (decrypted) | No | Optionally specify a media type to stream. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_forking(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Forking stop

Stop forking a call. **Expected Webhooks:**

- `call.fork.stopped`

`client.calls.actions.stop_forking()` — `POST /calls/{call_control_id}/actions/fork_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `stream_type` | enum (raw, decrypted) | No | Optionally specify a `stream_type`. |

```python
response = client.calls.actions.stop_forking(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
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
| `callForkStarted` | `call.fork.started` | Call Fork Started |
| `callForkStopped` | `call.fork.stopped` | Call Fork Stopped |
| `callStreamingFailed` | `call.streaming.failed` | Call Streaming Failed |
| `callStreamingStarted` | `call.streaming.started` | Call Streaming Started |
| `callStreamingStopped` | `call.streaming.stopped` | Call Streaming Stopped |
| `transcription` | `transcription` | Transcription |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
