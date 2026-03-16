<!-- SDK reference: telnyx-voice-media-ruby -->

# Telnyx Voice Media - Ruby

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-ruby)
2. Call must be answered before issuing playback/record/speak commands

### Steps

1. **Play audio**: `client.calls.actions.playback_start(call_control_id: ..., audio_url: ...)`
2. **Text-to-speech**: `client.calls.actions.speak(call_control_id: ..., payload: ..., voice: ...)`
3. **Start recording**: `client.calls.actions.record_start(call_control_id: ..., channels: ..., format: ...)`
4. **Stop recording**: `client.calls.actions.record_stop(call_control_id: ...)`

### Common mistakes

- NEVER issue playback/record/speak before the call is answered — commands will fail silently
- audio_url for playback must be a publicly accessible URL (MP3 or WAV)
- VOICE IS EVENT-DRIVEN: playback_start returns immediately. Wait for call.playback.ended webhook before issuing the next command
- For dual-channel recording (both legs), set channels='dual'. Default is single (mixed)

**Related skills**: telnyx-voice-ruby, telnyx-voice-gather-ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.calls.actions.playback_start(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +8 optional params in the API Details section below |

```ruby
response = client.calls.actions.start_playback("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
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
| ... | | | +6 optional params in the API Details section below |

```ruby
response = client.calls.actions.speak("call_control_id", payload: "Say this on the call", voice: "female", language: "en-US")
puts(response)
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
| ... | | | +12 optional params in the API Details section below |

```ruby
response = client.calls.actions.start_recording("call_control_id", channels: :single, format_: :wav)

puts(response)
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

```ruby
response = client.calls.actions.stop_recording("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
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
| ... | | | +1 optional params in the API Details section below |

```ruby
response = client.calls.actions.stop_playback("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
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

```ruby
response = client.calls.actions.pause_recording("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
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

```ruby
response = client.calls.actions.resume_recording("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```ruby
# In your webhook handler (e.g., Sinatra — use raw body):
post "/webhooks" do
  payload = request.body.read
  headers = {
    "telnyx-signature-ed25519" => request.env["HTTP_TELNYX_SIGNATURE_ED25519"],
    "telnyx-timestamp" => request.env["HTTP_TELNYX_TIMESTAMP"],
  }
  begin
    event = client.webhooks.unwrap(payload, headers)
  rescue => e
    halt 400, "Invalid signature: #{e.message}"
  end
  # Signature valid — event is the parsed webhook payload
  puts "Received event: #{event.data.event_type}"
  status 200
end
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

Webhook payload field definitions are in the API Details section below.

---

# Voice Media (Ruby) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Play audio URL, Stop audio playback, Record pause, Record resume, Recording start, Recording stop, Speak text

| Field | Type |
|-------|------|
| `result` | string |

## Optional Parameters

### Play audio URL — `client.calls.actions.start_playback()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `audio_url` | string (URL) | The URL of a file to be played back on the call. |
| `media_name` | string | The media_name of a file to be played back on the call. |
| `loop` | string |  |
| `overlay` | boolean | When enabled, audio will be mixed on top of any other audio that is actively ... |
| `stop` | string | When specified, it stops the current audio being played. |
| `target_legs` | string | Specifies the leg or legs on which audio will be played. |
| `cache_audio` | boolean | Caches the audio file. |
| `audio_type` | enum (mp3, wav) | Specifies the type of audio provided in `audio_url` or `playback_content`. |
| `playback_content` | string | Allows a user to provide base64 encoded mp3 or wav. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Stop audio playback — `client.calls.actions.stop_playback()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `overlay` | boolean | When enabled, it stops the audio being played in the overlay queue. |
| `stop` | string | Use `current` to stop the current audio being played. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Record pause — `client.calls.actions.pause_recording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | Uniquely identifies the resource. |

### Record resume — `client.calls.actions.resume_recording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | Uniquely identifies the resource. |

### Recording start — `client.calls.actions.start_recording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `play_beep` | boolean | If enabled, a beep sound will be played at the start of a recording. |
| `max_length` | integer | Defines the maximum length for the recording in seconds. |
| `timeout_secs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `recording_track` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `custom_file_name` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `transcription` | boolean | Enable post recording transcription. |
| `transcription_engine` | enum (A, B, deepgram/nova-3) | Engine to use for speech recognition. |
| `transcription_language` | enum (af, af-ZA, am, am-ET, ar, ...) | Language code for transcription. |
| `transcription_profanity_filter` | boolean | Enables profanity_filter. |
| `transcription_speaker_diarization` | boolean | Enables speaker diarization. |
| `transcription_min_speaker_count` | integer | Defines minimum number of speakers in the conversation. |
| `transcription_max_speaker_count` | integer | Defines maximum number of speakers in the conversation. |

### Recording stop — `client.calls.actions.stop_recording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | Uniquely identifies the resource. |

### Speak text — `client.calls.actions.speak()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload_type` | enum (text, ssml) | The type of the provided payload. |
| `service_level` | enum (basic, premium) | This parameter impacts speech quality, language options and payload types. |
| `stop` | string | When specified, it stops the current audio being played. |
| `voice_settings` | object | The settings associated with the voice selected |
| `language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | The language you want spoken. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `loop` | string |  |
| `target_legs` | enum (self, opposite, both) | Specifies which legs of the call should receive the spoken audio. |

## Webhook Payload Fields

### `callPlaybackEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.playback.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.overlay` | boolean | Whether the stopped audio was in overlay mode or not. |
| `data.payload.status` | enum: file_not_found, call_hangup, unknown, cancelled, cancelled_amd, completed, failed | Reflects how command ended. |
| `data.payload.status_detail` | string | Provides details in case of failure. |

### `callPlaybackStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.playback.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.overlay` | boolean | Whether the audio is going to be played in overlay mode or not. |

### `callRecordingError`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.recording.error | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.reason` | enum: Failed to authorize with storage using custom credentials, Invalid credentials json, Unsupported backend, Internal server error | Indication that there was a problem recording the call. |

### `callRecordingSaved`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.recording.saved | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.recording_started_at` | date-time | ISO 8601 datetime of when recording started. |
| `data.payload.recording_ended_at` | date-time | ISO 8601 datetime of when recording ended. |
| `data.payload.channels` | enum: single, dual | Whether recording was recorded in `single` or `dual` channel. |

### `callRecordingTranscriptionSaved`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.recording.transcription.saved | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.recording_id` | string | ID that is unique to the recording session and can be used to correlate webhook events. |
| `data.payload.recording_transcription_id` | string | ID that is unique to the transcription process and can be used to correlate webhook events. |
| `data.payload.status` | enum: completed | The transcription status. |
| `data.payload.transcription_text` | string | The transcribed text |

### `callSpeakEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.speak.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.status` | enum: completed, call_hangup, cancelled_amd | Reflects how the command ended. |

### `callSpeakStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.speak.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
