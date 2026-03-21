---
name: telnyx-voice-media-python
description: >-
  Play audio, text-to-speech, and record calls. Use for IVR, announcements, or
  call recording.
metadata:
  author: telnyx
  product: voice-media
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Media - Python

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-python)
2. Call must be answered before issuing playback/record/speak commands

### Steps

1. **Play audio**: `client.calls.actions.playback_start(call_control_id=..., audio_url=...)`
2. **Text-to-speech**: `client.calls.actions.speak(call_control_id=..., payload=..., voice=...)`
3. **Start recording**: `client.calls.actions.record_start(call_control_id=..., channels=..., format=...)`
4. **Stop recording**: `client.calls.actions.record_stop(call_control_id=...)`

### Common mistakes

- NEVER issue playback/record/speak before the call is answered — commands will fail silently
- audio_url for playback must be a publicly accessible URL (MP3 or WAV)
- VOICE IS EVENT-DRIVEN: playback_start returns immediately. Wait for call.playback.ended webhook before issuing the next command
- For dual-channel recording (both legs), set channels='dual'. Default is single (mixed)

**Related skills**: telnyx-voice-python, telnyx-voice-gather-python

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
    result = client.calls.actions.playback_start(params)
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

## Play audio URL

Play an audio file on the call. If multiple play audio commands are issued consecutively,
the audio files will be placed in a queue awaiting playback. *Notes:*

- When `overlay` is enabled, `target_legs` is limited to `self`.

`client.calls.actions.start_playback()` — `POST /calls/{call_control_id}/actions/playback_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `audio_type` | enum (mp3, wav) | No | Specifies the type of audio provided in `audio_url` or `play... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_playback(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    audio_url="https://example.com/audio.mp3",
)
print(response.data)
```

Key response fields: `response.data.result`

## Speak text

Convert text to speech and play it back on the call. If multiple speak text commands are issued consecutively, the audio files will be placed in a queue awaiting playback. **Expected Webhooks:**

- `call.speak.started`
- `call.speak.ended`

`client.calls.actions.speak()` — `POST /calls/{call_control_id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `payload_type` | enum (text, ssml) | No | The type of the provided payload. |
| `service_level` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.speak(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    payload="Say this on the call",
    voice="female",
    language="en-US",
)
print(response.data)
```

Key response fields: `response.data.result`

## Recording start

Start recording the call. Recording will stop on call hang-up, or can be initiated via the Stop Recording command. **Expected Webhooks:**

- `call.recording.saved`
- `call.recording.transcription.saved`
- `call.recording.error`

`client.calls.actions.start_recording()` — `POST /calls/{call_control_id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (wav, mp3) | Yes | The audio file format used when storing the call recording. |
| `channels` | enum (single, dual) | Yes | When `dual`, final audio file will be stereo recorded with t... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the recordin... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.start_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    channels="single",
    format="wav",
)
print(response.data)
```

Key response fields: `response.data.result`

## Recording stop

Stop recording the call. **Expected Webhooks:**

- `call.recording.saved`

`client.calls.actions.stop_recording()` — `POST /calls/{call_control_id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |

```python
response = client.calls.actions.stop_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Stop audio playback

Stop audio being played on the call. **Expected Webhooks:**

- `call.playback.ended` or `call.speak.ended`

`client.calls.actions.stop_playback()` — `POST /calls/{call_control_id}/actions/playback_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `overlay` | boolean | No | When enabled, it stops the audio being played in the overlay... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.stop_playback(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Record pause

Pause recording the call. Recording can be resumed via Resume recording command. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.calls.actions.pause_recording()` — `POST /calls/{call_control_id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |

```python
response = client.calls.actions.pause_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

## Record resume

Resume recording the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.calls.actions.resume_recording()` — `POST /calls/{call_control_id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |

```python
response = client.calls.actions.resume_recording(
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
| `callPlaybackEnded` | `call.playback.ended` | Call Playback Ended |
| `callPlaybackStarted` | `call.playback.started` | Call Playback Started |
| `callRecordingError` | `call.recording.error` | Call Recording Error |
| `callRecordingSaved` | `call.recording.saved` | Call Recording Saved |
| `callRecordingTranscriptionSaved` | `call.recording.transcription.saved` | Call Recording Transcription Saved |
| `callSpeakEnded` | `call.speak.ended` | Call Speak Ended |
| `callSpeakStarted` | `call.speak.started` | Call Speak Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
