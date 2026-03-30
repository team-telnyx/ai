---
name: telnyx-voice-media-go
description: >-
  Play audio files, use text-to-speech, and record calls. Use when building IVR
  systems, playing announcements, or recording conversations. This skill
  provides Go SDK examples.
metadata:
  author: telnyx
  product: voice-media
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Media - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Messages.Send(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
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

```go
	response, err := client.Calls.Actions.StartPlayback(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartPlaybackParams{
		AudioURL: "https://example.com/audio.mp3",
	},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

## Stop audio playback

Stop audio being played on the call. **Expected Webhooks:**

- `call.playback.ended` or `call.speak.ended`

`POST /calls/{call_control_id}/actions/playback_stop`

Optional: `client_state` (string), `command_id` (string), `overlay` (boolean), `stop` (string)

```go
	response, err := client.Calls.Actions.StopPlayback(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopPlaybackParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

## Record pause

Pause recording the call. Recording can be resumed via Resume recording command. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/record_pause`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```go
	response, err := client.Calls.Actions.PauseRecording(
		context.Background(),
		"call_control_id",
		telnyx.CallActionPauseRecordingParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

## Record resume

Resume recording the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/record_resume`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```go
	response, err := client.Calls.Actions.ResumeRecording(
		context.Background(),
		"call_control_id",
		telnyx.CallActionResumeRecordingParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

## Recording start

Start recording the call. Recording will stop on call hang-up, or can be initiated via the Stop Recording command. **Expected Webhooks:**

- `call.recording.saved`
- `call.recording.transcription.saved`
- `call.recording.error`

`POST /calls/{call_control_id}/actions/record_start` — Required: `format`, `channels`

Optional: `client_state` (string), `command_id` (string), `custom_file_name` (string), `max_length` (int32), `play_beep` (boolean), `recording_track` (enum: both, inbound, outbound), `timeout_secs` (int32), `transcription` (boolean), `transcription_engine` (enum: A, B, deepgram/nova-3), `transcription_language` (enum: af, af-ZA, am, am-ET, ar, ar-AE, ar-BH, ar-DZ, ar-EG, ar-IL, ar-IQ, ar-JO, ar-KW, ar-LB, ar-MA, ar-MR, ar-OM, ar-PS, ar-QA, ar-SA, ar-TN, ar-YE, as, auto_detect, az, az-AZ, ba, be, bg, bg-BG, bn, bn-BD, bn-IN, bo, br, bs, bs-BA, ca, ca-ES, cs, cs-CZ, cy, da, da-DK, de, de-AT, de-CH, de-DE, el, el-GR, en, en-AU, en-CA, en-GB, en-GH, en-HK, en-IE, en-IN, en-KE, en-NG, en-NZ, en-PH, en-PK, en-SG, en-TZ, en-US, en-ZA, es, es-419, es-AR, es-BO, es-CL, es-CO, es-CR, es-DO, es-EC, es-ES, es-GT, es-HN, es-MX, es-NI, es-PA, es-PE, es-PR, es-PY, es-SV, es-US, es-UY, es-VE, et, et-EE, eu, eu-ES, fa, fa-IR, fi, fi-FI, fil-PH, fo, fr, fr-BE, fr-CA, fr-CH, fr-FR, gl, gl-ES, gu, gu-IN, ha, haw, he, hi, hi-IN, hr, hr-HR, ht, hu, hu-HU, hy, hy-AM, id, id-ID, is, is-IS, it, it-CH, it-IT, iw-IL, ja, ja-JP, jv-ID, jw, ka, ka-GE, kk, kk-KZ, km, km-KH, kn, kn-IN, ko, ko-KR, la, lb, ln, lo, lo-LA, lt, lt-LT, lv, lv-LV, mg, mi, mk, mk-MK, ml, ml-IN, mn, mn-MN, mr, mr-IN, ms, ms-MY, mt, my, my-MM, ne, ne-NP, nl, nl-BE, nl-NL, nn, no, no-NO, oc, pa, pa-Guru-IN, pl, pl-PL, ps, pt, pt-BR, pt-PT, ro, ro-RO, ru, ru-RU, rw-RW, sa, sd, si, si-LK, sk, sk-SK, sl, sl-SI, sn, so, sq, sq-AL, sr, sr-RS, ss-latn-za, st-ZA, su, su-ID, sv, sv-SE, sw, sw-KE, sw-TZ, ta, ta-IN, ta-LK, ta-MY, ta-SG, te, te-IN, tg, th, th-TH, tk, tl, tn-latn-za, tr, tr-TR, ts-ZA, tt, uk, uk-UA, ur, ur-IN, ur-PK, uz, uz-UZ, ve-ZA, vi, vi-VN, xh-ZA, yi, yo, yue-Hant-HK, zh, zh-TW, zu-ZA), `transcription_max_speaker_count` (int32), `transcription_min_speaker_count` (int32), `transcription_profanity_filter` (boolean), `transcription_speaker_diarization` (boolean), `trim` (enum: trim-silence)

```go
	response, err := client.Calls.Actions.StartRecording(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartRecordingParams{
			Channels: telnyx.CallActionStartRecordingParamsChannelsSingle,
			Format:   telnyx.CallActionStartRecordingParamsFormatWav,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

## Recording stop

Stop recording the call. **Expected Webhooks:**

- `call.recording.saved`

`POST /calls/{call_control_id}/actions/record_stop`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```go
	response, err := client.Calls.Actions.StopRecording(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopRecordingParams{
			StopRecordingRequest: telnyx.StopRecordingRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

## Speak text

Convert text to speech and play it back on the call. If multiple speak text commands are issued consecutively, the audio files will be placed in a queue awaiting playback. **Expected Webhooks:**

- `call.speak.started`
- `call.speak.ended`

`POST /calls/{call_control_id}/actions/speak` — Required: `payload`, `voice`

Optional: `client_state` (string), `command_id` (string), `language` (enum: arb, cmn-CN, cy-GB, da-DK, de-DE, en-AU, en-GB, en-GB-WLS, en-IN, en-US, es-ES, es-MX, es-US, fr-CA, fr-FR, hi-IN, is-IS, it-IT, ja-JP, ko-KR, nb-NO, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, tr-TR), `loop` (string), `payload_type` (enum: text, ssml), `service_level` (enum: basic, premium), `stop` (string), `target_legs` (enum: self, opposite, both), `voice_settings` (object)

```go
	response, err := client.Calls.Actions.Speak(
		context.Background(),
		"call_control_id",
		telnyx.CallActionSpeakParams{
			Payload: "Say this on the call",
			Voice:   "female",
		},
	)
	if err != nil {
		log.Fatal(err)
		Language: "en-US",
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `result` (string)

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```go
// In your webhook handler:
func handleWebhook(w http.ResponseWriter, r *http.Request) {
  body, _ := io.ReadAll(r.Body)
  event, err := client.Webhooks.Unwrap(body, r.Header)
  if err != nil {
    http.Error(w, "Invalid signature", http.StatusBadRequest)
    return
  }
  // Signature valid — event is the parsed webhook payload
  fmt.Println("Received event:", event.Data.EventType)
  w.WriteHeader(http.StatusOK)
}
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
