---
name: telnyx-voice-media-curl
description: >-
  Play audio, text-to-speech, and record calls. Use for IVR, announcements, or
  call recording.
metadata:
  author: telnyx
  product: voice-media
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Media - curl

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-curl)
2. Call must be answered before issuing playback/record/speak commands

### Steps

1. **Play audio**
2. **Text-to-speech**
3. **Start recording**
4. **Stop recording**

### Common mistakes

- NEVER issue playback/record/speak before the call is answered — commands will fail silently
- audio_url for playback must be a publicly accessible URL (MP3 or WAV)
- VOICE IS EVENT-DRIVEN: playback_start returns immediately. Wait for call.playback.ended webhook before issuing the next command
- For dual-channel recording (both legs), set channels='dual'. Default is single (mixed)

**Related skills**: telnyx-voice-curl, telnyx-voice-gather-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Play audio URL

Play an audio file on the call. If multiple play audio commands are issued consecutively,
the audio files will be placed in a queue awaiting playback. *Notes:*

- When `overlay` is enabled, `target_legs` is limited to `self`.

`POST /calls/{call_control_id}/actions/playback_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `audio_type` | enum (mp3, wav) | No | Specifies the type of audio provided in `audio_url` or `play... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "audio_url": "https://example.com/audio.mp3"
  }' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/playback_start"
```

Key response fields: `.data.result`

## Speak text

Convert text to speech and play it back on the call. If multiple speak text commands are issued consecutively, the audio files will be placed in a queue awaiting playback. **Expected Webhooks:**

- `call.speak.started`
- `call.speak.ended`

`POST /calls/{call_control_id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `payload_type` | enum (text, ssml) | No | The type of the provided payload. |
| `service_level` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "payload": "Say this on the call",
      "voice": "Telnyx.KokoroTTS.af",
      "language": "en-US"
  }' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/speak"
```

Key response fields: `.data.result`

## Recording start

Start recording the call. Recording will stop on call hang-up, or can be initiated via the Stop Recording command. **Expected Webhooks:**

- `call.recording.saved`
- `call.recording.transcription.saved`
- `call.recording.error`

`POST /calls/{call_control_id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (wav, mp3) | Yes | The audio file format used when storing the call recording. |
| `channels` | enum (single, dual) | Yes | When `dual`, final audio file will be stereo recorded with t... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the recordin... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "format": "mp3",
  "channels": "single"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/record_start"
```

Key response fields: `.data.result`

## Recording stop

Stop recording the call. **Expected Webhooks:**

- `call.recording.saved`

`POST /calls/{call_control_id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/record_stop"
```

Key response fields: `.data.result`

## Stop audio playback

Stop audio being played on the call. **Expected Webhooks:**

- `call.playback.ended` or `call.speak.ended`

`POST /calls/{call_control_id}/actions/playback_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `overlay` | boolean | No | When enabled, it stops the audio being played in the overlay... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/playback_stop"
```

Key response fields: `.data.result`

## Record pause

Pause recording the call. Recording can be resumed via Resume recording command. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/record_pause"
```

Key response fields: `.data.result`

## Record resume

Resume recording the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/record_resume"
```

Key response fields: `.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```bash
# Telnyx signs webhooks with Ed25519 (asymmetric — NOT HMAC/Standard Webhooks).
# Headers sent with each webhook:
#   telnyx-signature-ed25519: base64-encoded Ed25519 signature
#   telnyx-timestamp: Unix timestamp (reject if >5 minutes old for replay protection)
#
# Get your public key from: Telnyx Portal > Account Settings > Keys & Credentials
# Use the Telnyx SDK in your language for verification (client.webhooks.unwrap).
# Your endpoint MUST return 2xx within 2 seconds or Telnyx will retry (up to 3 attempts).
# Configure a failover URL in Telnyx Portal for additional reliability.
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
