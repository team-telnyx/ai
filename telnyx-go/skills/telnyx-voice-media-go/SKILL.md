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

## Play audio URL

Play an audio file on the call.

`POST /calls/{call_control_id}/actions/playback_start`

Optional: `audio_type` (enum), `audio_url` (string), `cache_audio` (boolean), `client_state` (string), `command_id` (string), `loop` (object), `media_name` (string), `overlay` (boolean), `playback_content` (string), `stop` (string), `target_legs` (string)

```go
	response, err := client.Calls.Actions.StartPlayback(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStartPlaybackParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Stop audio playback

Stop audio being played on the call.

`POST /calls/{call_control_id}/actions/playback_stop`

Optional: `client_state` (string), `command_id` (string), `overlay` (boolean), `stop` (string)

```go
	response, err := client.Calls.Actions.StopPlayback(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStopPlaybackParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Record pause

Pause recording the call.

`POST /calls/{call_control_id}/actions/record_pause`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```go
	response, err := client.Calls.Actions.PauseRecording(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionPauseRecordingParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Record resume

Resume recording the call.

`POST /calls/{call_control_id}/actions/record_resume`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```go
	response, err := client.Calls.Actions.ResumeRecording(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionResumeRecordingParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Recording start

Start recording the call.

`POST /calls/{call_control_id}/actions/record_start` — Required: `format`, `channels`

Optional: `client_state` (string), `command_id` (string), `custom_file_name` (string), `max_length` (int32), `play_beep` (boolean), `recording_track` (enum), `timeout_secs` (int32), `transcription` (boolean), `transcription_engine` (enum), `transcription_language` (enum), `transcription_max_speaker_count` (int32), `transcription_min_speaker_count` (int32), `transcription_profanity_filter` (boolean), `transcription_speaker_diarization` (boolean), `trim` (enum)

```go
	response, err := client.Calls.Actions.StartRecording(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStartRecordingParams{
			Channels: telnyx.CallActionStartRecordingParamsChannelsSingle,
			Format:   telnyx.CallActionStartRecordingParamsFormatWav,
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Recording stop

Stop recording the call.

`POST /calls/{call_control_id}/actions/record_stop`

Optional: `client_state` (string), `command_id` (string), `recording_id` (uuid)

```go
	response, err := client.Calls.Actions.StopRecording(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStopRecordingParams{
			StopRecordingRequest: telnyx.StopRecordingRequestParam{},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Speak text

Convert text to speech and play it back on the call.

`POST /calls/{call_control_id}/actions/speak` — Required: `payload`, `voice`

Optional: `client_state` (string), `command_id` (string), `language` (enum), `loop` (object), `payload_type` (enum), `service_level` (enum), `stop` (string), `target_legs` (enum), `voice_settings` (object)

```go
	response, err := client.Calls.Actions.Speak(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionSpeakParams{
			Payload: "Say this on the call",
			Voice:   "female",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

---

## Webhooks

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for verification (Standard Webhooks compatible).

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
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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
| `data.payload.status` | enum | Reflects how command ended. |
| `data.payload.status_detail` | string | Provides details in case of failure. |

**`callPlaybackStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.reason` | enum | Indication that there was a problem recording the call. |

**`callRecordingSaved`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.recording_started_at` | date-time | ISO 8601 datetime of when recording started. |
| `data.payload.recording_ended_at` | date-time | ISO 8601 datetime of when recording ended. |
| `data.payload.channels` | enum | Whether recording was recorded in `single` or `dual` channel. |

**`callRecordingTranscriptionSaved`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.calling_party_type` | enum | The type of calling party connection. |
| `data.payload.recording_id` | string | ID that is unique to the recording session and can be used to correlate webhook events. |
| `data.payload.recording_transcription_id` | string | ID that is unique to the transcription process and can be used to correlate webhook events. |
| `data.payload.status` | enum | The transcription status. |
| `data.payload.transcription_text` | string | The transcribed text |

**`callSpeakEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.status` | enum | Reflects how the command ended. |

**`callSpeakStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
