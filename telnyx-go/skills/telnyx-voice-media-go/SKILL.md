---
name: telnyx-voice-media-go
description: >-
  Play audio, text-to-speech, and record calls. Use for IVR, announcements, or
  call recording.
metadata:
  author: telnyx
  product: voice-media
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Media - Go

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-go)
2. Call must be answered before issuing playback/record/speak commands

### Steps

1. **Play audio**: `client.Calls.Actions.PlaybackStart(ctx, params)`
2. **Text-to-speech**: `client.Calls.Actions.Speak(ctx, params)`
3. **Start recording**: `client.Calls.Actions.RecordStart(ctx, params)`
4. **Stop recording**: `client.Calls.Actions.RecordStop(ctx, params)`

### Common mistakes

- NEVER issue playback/record/speak before the call is answered — commands will fail silently
- audio_url for playback must be a publicly accessible URL (MP3 or WAV)
- VOICE IS EVENT-DRIVEN: playback_start returns immediately. Wait for call.playback.ended webhook before issuing the next command
- For dual-channel recording (both legs), set channels='dual'. Default is single (mixed)

**Related skills**: telnyx-voice-go, telnyx-voice-gather-go

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

result, err := client.Calls.Actions.PlaybackStart(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Play audio URL

Play an audio file on the call. If multiple play audio commands are issued consecutively,
the audio files will be placed in a queue awaiting playback. *Notes:*

- When `overlay` is enabled, `target_legs` is limited to `self`.

`client.Calls.Actions.StartPlayback()` — `POST /calls/{call_control_id}/actions/playback_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `AudioType` | enum (mp3, wav) | No | Specifies the type of audio provided in `audio_url` or `play... |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.result`

## Speak text

Convert text to speech and play it back on the call. If multiple speak text commands are issued consecutively, the audio files will be placed in a queue awaiting playback. **Expected Webhooks:**

- `call.speak.started`
- `call.speak.ended`

`client.Calls.Actions.Speak()` — `POST /calls/{call_control_id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Payload` | string | Yes | The text or SSML to be converted into speech. |
| `Voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `PayloadType` | enum (text, ssml) | No | The type of the provided payload. |
| `ServiceLevel` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.result`

## Recording start

Start recording the call. Recording will stop on call hang-up, or can be initiated via the Stop Recording command. **Expected Webhooks:**

- `call.recording.saved`
- `call.recording.transcription.saved`
- `call.recording.error`

`client.Calls.Actions.StartRecording()` — `POST /calls/{call_control_id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Format` | enum (wav, mp3) | Yes | The audio file format used when storing the call recording. |
| `Channels` | enum (single, dual) | Yes | When `dual`, final audio file will be stereo recorded with t... |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `TimeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the recordin... |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.result`

## Recording stop

Stop recording the call. **Expected Webhooks:**

- `call.recording.saved`

`client.Calls.Actions.StopRecording()` — `POST /calls/{call_control_id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `RecordingId` | string (UUID) | No | Uniquely identifies the resource. |

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

Key response fields: `response.data.result`

## Stop audio playback

Stop audio being played on the call. **Expected Webhooks:**

- `call.playback.ended` or `call.speak.ended`

`client.Calls.Actions.StopPlayback()` — `POST /calls/{call_control_id}/actions/playback_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `Overlay` | boolean | No | When enabled, it stops the audio being played in the overlay... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.result`

## Record pause

Pause recording the call. Recording can be resumed via Resume recording command. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.Calls.Actions.PauseRecording()` — `POST /calls/{call_control_id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `RecordingId` | string (UUID) | No | Uniquely identifies the resource. |

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

Key response fields: `response.data.result`

## Record resume

Resume recording the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.Calls.Actions.ResumeRecording()` — `POST /calls/{call_control_id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `RecordingId` | string (UUID) | No | Uniquely identifies the resource. |

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

Key response fields: `response.data.result`

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
