---
name: telnyx-voice-media-python
description: >-
  Play audio files, use text-to-speech, and record calls. Use when building IVR
  systems, playing announcements, or recording conversations. This skill
  provides Python SDK examples.
metadata:
  author: telnyx
  product: voice-media
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Media - Python

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
    result = client.messages.send(to="+13125550001", from_="+13125550002", text="Hello")
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

## Play audio URL

Play an audio file on the call. If multiple play audio commands are issued consecutively,
the audio files will be placed in a queue awaiting playback. *Notes:*

- When `overlay` is enabled, `target_legs` is limited to `self`.

`POST /calls/{call_control_id}/actions/playback_start`

Optional: `audio_type` (enum: mp3, wav), `audio_url` (string), `cache_audio` (boolean), `client_state` (string), `command_id` (string), `loop` (string), `media_name` (string), `overlay` (boolean), `playback_content` (string), `stop` (string), `target_legs` (string)

```python
response = client.calls.actions.start_playback(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    audio_url="https://example.com/audio.mp3",
)
print(response.data)
```

Returns: `result` (string)

## Stop audio playback

Stop audio being played on the call. **Expected Webhooks:**

- `call.playback.ended` or `call.speak.ended`

`POST /calls/{call_control_id}/actions/playback_stop`

Optional: `client_state` (string), `command_id` (string), `overlay` (boolean), `stop` (string)

```python
response = client.calls.actions.stop_playback(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Returns: `result` (string)

## Record pause

Pause recording the call. Recording can be resumed via Resume recording command. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/record_pause`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```python
response = client.calls.actions.pause_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Returns: `result` (string)

## Record resume

Resume recording the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/record_resume`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```python
response = client.calls.actions.resume_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Returns: `result` (string)

## Recording start

Start recording the call. Recording will stop on call hang-up, or can be initiated via the Stop Recording command. **Expected Webhooks:**

- `call.recording.saved`
- `call.recording.transcription.saved`
- `call.recording.error`

`POST /calls/{call_control_id}/actions/record_start` — Required: `format`, `channels`

Optional: `client_state` (string), `command_id` (string), `custom_file_name` (string), `max_length` (int32), `play_beep` (boolean), `recording_track` (enum: both, inbound, outbound), `timeout_secs` (int32), `transcription` (boolean), `transcription_engine` (enum: A, B, deepgram/nova-3), `transcription_language` (enum: af, af-ZA, am, am-ET, ar, ar-AE, ar-BH, ar-DZ, ar-EG, ar-IL, ar-IQ, ar-JO, ar-KW, ar-LB, ar-MA, ar-MR, ar-OM, ar-PS, ar-QA, ar-SA, ar-TN, ar-YE, as, auto_detect, az, az-AZ, ba, be, bg, bg-BG, bn, bn-BD, bn-IN, bo, br, bs, bs-BA, ca, ca-ES, cs, cs-CZ, cy, da, da-DK, de, de-AT, de-CH, de-DE, el, el-GR, en, en-AU, en-CA, en-GB, en-GH, en-HK, en-IE, en-IN, en-KE, en-NG, en-NZ, en-PH, en-PK, en-SG, en-TZ, en-US, en-ZA, es, es-419, es-AR, es-BO, es-CL, es-CO, es-CR, es-DO, es-EC, es-ES, es-GT, es-HN, es-MX, es-NI, es-PA, es-PE, es-PR, es-PY, es-SV, es-US, es-UY, es-VE, et, et-EE, eu, eu-ES, fa, fa-IR, fi, fi-FI, fil-PH, fo, fr, fr-BE, fr-CA, fr-CH, fr-FR, gl, gl-ES, gu, gu-IN, ha, haw, he, hi, hi-IN, hr, hr-HR, ht, hu, hu-HU, hy, hy-AM, id, id-ID, is, is-IS, it, it-CH, it-IT, iw-IL, ja, ja-JP, jv-ID, jw, ka, ka-GE, kk, kk-KZ, km, km-KH, kn, kn-IN, ko, ko-KR, la, lb, ln, lo, lo-LA, lt, lt-LT, lv, lv-LV, mg, mi, mk, mk-MK, ml, ml-IN, mn, mn-MN, mr, mr-IN, ms, ms-MY, mt, my, my-MM, ne, ne-NP, nl, nl-BE, nl-NL, nn, no, no-NO, oc, pa, pa-Guru-IN, pl, pl-PL, ps, pt, pt-BR, pt-PT, ro, ro-RO, ru, ru-RU, rw-RW, sa, sd, si, si-LK, sk, sk-SK, sl, sl-SI, sn, so, sq, sq-AL, sr, sr-RS, ss-latn-za, st-ZA, su, su-ID, sv, sv-SE, sw, sw-KE, sw-TZ, ta, ta-IN, ta-LK, ta-MY, ta-SG, te, te-IN, tg, th, th-TH, tk, tl, tn-latn-za, tr, tr-TR, ts-ZA, tt, uk, uk-UA, ur, ur-IN, ur-PK, uz, uz-UZ, ve-ZA, vi, vi-VN, xh-ZA, yi, yo, yue-Hant-HK, zh, zh-TW, zu-ZA), `transcription_max_speaker_count` (int32), `transcription_min_speaker_count` (int32), `transcription_profanity_filter` (boolean), `transcription_speaker_diarization` (boolean), `trim` (enum: trim-silence)

```python
response = client.calls.actions.start_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    channels="single",
    format="wav",
)
print(response.data)
```

Returns: `result` (string)

## Recording stop

Stop recording the call. **Expected Webhooks:**

- `call.recording.saved`

`POST /calls/{call_control_id}/actions/record_stop`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```python
response = client.calls.actions.stop_recording(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Returns: `result` (string)

## Speak text

Convert text to speech and play it back on the call. If multiple speak text commands are issued consecutively, the audio files will be placed in a queue awaiting playback. **Expected Webhooks:**

- `call.speak.started`
- `call.speak.ended`

`POST /calls/{call_control_id}/actions/speak` — Required: `payload`, `voice`

Optional: `client_state` (string), `command_id` (string), `language` (enum: arb, cmn-CN, cy-GB, da-DK, de-DE, en-AU, en-GB, en-GB-WLS, en-IN, en-US, es-ES, es-MX, es-US, fr-CA, fr-FR, hi-IN, is-IS, it-IT, ja-JP, ko-KR, nb-NO, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, tr-TR), `loop` (string), `payload_type` (enum: text, ssml), `service_level` (enum: basic, premium), `stop` (string), `target_legs` (enum: self, opposite, both), `voice_settings` (object)

```python
response = client.calls.actions.speak(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    payload="Say this on the call",
    voice="female",
    language="en-US",
)
print(response.data)
```

Returns: `result` (string)

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

| Event | Description |
|-------|-------------|
| `callPlaybackEnded` | Call Playback Ended |
| `callPlaybackStarted` | Call Playback Started |
| `callRecordingError` | Call Recording Error |
| `callRecordingSaved` | Call Recording Saved |
| `callRecordingTranscriptionSaved` | Call Recording Transcription Saved |
| `callSpeakEnded` | Call Speak Ended |
| `callSpeakStarted` | Call Speak Started |

### Webhook payload fields

**`callPlaybackEnded`**

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

**`callPlaybackStarted`**

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

**`callRecordingError`**

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

**`callRecordingSaved`**

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

**`callRecordingTranscriptionSaved`**

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

**`callSpeakEnded`**

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

**`callSpeakStarted`**

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
