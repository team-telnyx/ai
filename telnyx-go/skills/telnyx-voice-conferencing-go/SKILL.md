---
name: telnyx-voice-conferencing-go
description: >-
  Conference calls, queues, and multi-party sessions. Use for call centers or
  conferencing apps.
metadata:
  author: telnyx
  product: voice-conferencing
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Conferencing - Go

## Core Workflow

### Prerequisites

1. Active calls via Call Control API (see telnyx-voice-go)

### Steps

1. **Create conference**: `client.Conferences.Create(ctx, params)`
2. **Join participants**: `Additional calls join via the conference ID or name`
3. **Mute/hold**: `client.Conferences.Mute(ctx, params)`
4. **End conference**: `client.Conferences.Leave(ctx, params)`

### Common mistakes

- First participant's call_control_id creates the conference — others join by conference ID
- Conference webhooks (conference.participant.joined, etc.) fire for lifecycle events — handle them for participant tracking
- Queue commands (enqueue/leave_queue) are also in this skill — use for call center queue management

**Related skills**: telnyx-voice-go

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

result, err := client.Conferences.Create(ctx, params)
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

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create conference

Create a conference from an existing call leg using a `call_control_id` and a conference name. Upon creating the conference, the call will be automatically bridged to the conference. Conferences will expire after all participants have left the conference or after 4 hours regardless of the number of active participants.

`client.Conferences.New()` — `POST /conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `Name` | string | Yes | Name of the conference |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `BeepEnabled` | enum (always, never, on_enter, on_exit) | No | Whether a beep sound should be played when participants join... |
| `CommandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```go
	conference, err := client.Conferences.New(context.Background(), telnyx.ConferenceNewParams{
		CallControlID: "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg",
		Name:          "Business",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conference.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Join a conference

Join an existing call leg to a conference. Issue the Join Conference command with the conference ID in the path and the `call_control_id` of the leg you wish to join to the conference as an attribute. The conference can have up to a certain amount of active participants, as set by the `max_participants` parameter in conference creation request.

`client.Conferences.Actions.Join()` — `POST /conferences/{id}/actions/join`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `SupervisorRole` | enum (barge, monitor, none, whisper) | No | Sets the joining participant as a supervisor for the confere... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.Join(
		context.Background(),
		"id",
		telnyx.ConferenceActionJoinParams{
			CallControlID: "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Mute conference participants

Mute a list of participants in a conference call

`client.Conferences.Actions.Mute()` — `POST /conferences/{id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `CallControlIds` | array[string] | No | Array of unique identifiers and tokens for controlling the c... |

```go
	response, err := client.Conferences.Actions.Mute(
		context.Background(),
		"id",
		telnyx.ConferenceActionMuteParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Unmute conference participants

Unmute a list of participants in a conference call

`client.Conferences.Actions.Unmute()` — `POST /conferences/{id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `CallControlIds` | array[string] | No | List of unique identifiers and tokens for controlling the ca... |

```go
	response, err := client.Conferences.Actions.Unmute(
		context.Background(),
		"id",
		telnyx.ConferenceActionUnmuteParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Play audio to conference participants

Play audio to all or some participants on a conference call.

`client.Conferences.Actions.Play()` — `POST /conferences/{id}/actions/play`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `AudioUrl` | string (URL) | No | The URL of a file to be played back in the conference. |
| `MediaName` | string | No | The media_name of a file to be played back in the conference... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.Play(
		context.Background(),
		"id",
		telnyx.ConferenceActionPlayParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Speak text to conference participants

Convert text to speech and play it to all or some participants.

`client.Conferences.Actions.Speak()` — `POST /conferences/{id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Payload` | string | Yes | The text or SSML to be converted into speech. |
| `Voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `Id` | string (UUID) | Yes | Specifies the conference by id or name |
| `PayloadType` | enum (text, ssml) | No | The type of the provided payload. |
| `Language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | No | The language you want spoken. |
| `CommandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.Speak(
		context.Background(),
		"id",
		telnyx.ConferenceActionSpeakParams{
			Payload: "Say this to participants",
			Voice:   "female",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Conference recording start

Start recording the conference. Recording will stop on conference end, or via the Stop Recording command. **Expected Webhooks:**

- `conference.recording.saved`

`client.Conferences.Actions.RecordStart()` — `POST /conferences/{id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Format` | enum (wav, mp3) | Yes | The audio file format used when storing the conference recor... |
| `Id` | string (UUID) | Yes | Specifies the conference to record by id or name |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `Channels` | enum (single, dual) | No | When `dual`, final audio file will be stereo recorded with t... |
| `Trim` | enum (trim-silence) | No | When set to `trim-silence`, silence will be removed from the... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.RecordStart(
		context.Background(),
		"id",
		telnyx.ConferenceActionRecordStartParams{
			Format: telnyx.ConferenceActionRecordStartParamsFormatWav,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Conference recording stop

Stop recording the conference. **Expected Webhooks:**

- `conference.recording.saved`

`client.Conferences.Actions.RecordStop()` — `POST /conferences/{id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Specifies the conference to stop the recording for by id or ... |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `RecordingId` | string (UUID) | No | Uniquely identifies the resource. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.RecordStop(
		context.Background(),
		"id",
		telnyx.ConferenceActionRecordStopParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## End a conference

End a conference and terminate all active participants.

`client.Conferences.Actions.EndConference()` — `POST /conferences/{id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Conferences.Actions.EndConference(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ConferenceActionEndConferenceParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## List conferences

Lists conferences. Conferences are created on demand, and will expire after all participants have left the conference or after 4 hours regardless of the number of active participants. Conferences are listed in descending order by `expires_at`.

`client.Conferences.List()` — `GET /conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Conferences.List(context.Background(), telnyx.ConferenceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Enqueue call

Put the call in a queue.

`client.Calls.Actions.Enqueue()` — `POST /calls/{call_control_id}/actions/enqueue`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | The name of the queue the call should be put in. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `MaxWaitTimeSecs` | integer | No | The number of seconds after which the call will be removed f... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Calls.Actions.Enqueue(
		context.Background(),
		"call_control_id",
		telnyx.CallActionEnqueueParams{
			QueueName: "support",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Remove call from a queue

Removes the call from a queue.

`client.Calls.Actions.LeaveQueue()` — `POST /calls/{call_control_id}/actions/leave_queue`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.LeaveQueue(
		context.Background(),
		"call_control_id",
		telnyx.CallActionLeaveQueueParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## List conference participants

Lists conference participants

`client.Conferences.ListParticipants()` — `GET /conferences/{conference_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConferenceId` | string (UUID) | Yes | Uniquely identifies the conference by id |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Conferences.ListParticipants(
		context.Background(),
		"conference_id",
		telnyx.ConferenceListParticipantsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.call_control_id`

## Retrieve a conference

Retrieve an existing conference

`client.Conferences.Get()` — `GET /conferences/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |

```go
	conference, err := client.Conferences.Get(
		context.Background(),
		"id",
		telnyx.ConferenceGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conference.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Gather DTMF using audio prompt in a conference

Play an audio file to a specific conference participant and gather DTMF input.

`client.Conferences.Actions.GatherDtmfAudio()` — `POST /conferences/{id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call leg tha... |
| `Id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `GatherId` | string (UUID) | No | Identifier for this gather command. |
| `AudioUrl` | string (URL) | No | The URL of the audio file to play as the gather prompt. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.GatherDtmfAudio(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ConferenceActionGatherDtmfAudioParams{
			CallControlID: "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Hold conference participants

Hold a list of participants in a conference call

`client.Conferences.Actions.Hold()` — `POST /conferences/{id}/actions/hold`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `CallControlIds` | array[string] | No | List of unique identifiers and tokens for controlling the ca... |
| `AudioUrl` | string (URL) | No | The URL of a file to be played to the participants when they... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Conferences.Actions.Hold(
		context.Background(),
		"id",
		telnyx.ConferenceActionHoldParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Leave a conference

Removes a call leg from a conference and moves it back to parked state. **Expected Webhooks:**

- `conference.participant.left`

`client.Conferences.Actions.Leave()` — `POST /conferences/{id}/actions/leave`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `CommandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `BeepEnabled` | enum (always, never, on_enter, on_exit) | No | Whether a beep sound should be played when the participant l... |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```go
	response, err := client.Conferences.Actions.Leave(
		context.Background(),
		"id",
		telnyx.ConferenceActionLeaveParams{
			CallControlID: "c46e06d7-b78f-4b13-96b6-c576af9640ff",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Conference recording pause

Pause conference recording.

`client.Conferences.Actions.RecordPause()` — `POST /conferences/{id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Specifies the conference by id or name |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `RecordingId` | string (UUID) | No | Use this field to pause specific recording. |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```go
	response, err := client.Conferences.Actions.RecordPause(
		context.Background(),
		"id",
		telnyx.ConferenceActionRecordPauseParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Conference recording resume

Resume conference recording.

`client.Conferences.Actions.RecordResume()` — `POST /conferences/{id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Specifies the conference by id or name |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `RecordingId` | string (UUID) | No | Use this field to resume specific recording. |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```go
	response, err := client.Conferences.Actions.RecordResume(
		context.Background(),
		"id",
		telnyx.ConferenceActionRecordResumeParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Send DTMF to conference participants

Send DTMF tones to one or more conference participants.

`client.Conferences.Actions.SendDtmf()` — `POST /conferences/{id}/actions/send_dtmf`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Digits` | string | Yes | DTMF digits to send. |
| `Id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CallControlIds` | array[string] | No | Array of participant call control IDs to send DTMF to. |
| `DurationMillis` | integer | No | Duration of each DTMF digit in milliseconds. |

```go
	response, err := client.Conferences.Actions.SendDtmf(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ConferenceActionSendDtmfParams{
			Digits: "1234#",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Stop audio being played on the conference

Stop audio being played to all or some participants on a conference call.

`client.Conferences.Actions.Stop()` — `POST /conferences/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `CallControlIds` | array[string] | No | List of call control ids identifying participants the audio ... |

```go
	response, err := client.Conferences.Actions.Stop(
		context.Background(),
		"id",
		telnyx.ConferenceActionStopParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Unhold conference participants

Unhold a list of participants in a conference call

`client.Conferences.Actions.Unhold()` — `POST /conferences/{id}/actions/unhold`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlIds` | array[string] | Yes | List of unique identifiers and tokens for controlling the ca... |
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```go
	response, err := client.Conferences.Actions.Unhold(
		context.Background(),
		"id",
		telnyx.ConferenceActionUnholdParams{
			CallControlIDs: []string{"v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg"},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Update conference participant

Update conference participant supervisor_role

`client.Conferences.Actions.Update()` — `POST /conferences/{id}/actions/update`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `SupervisorRole` | enum (barge, monitor, none, whisper) | Yes | Sets the participant as a supervisor for the conference. |
| `Id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `CommandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `Region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `WhisperCallControlIds` | array[string] | No | Array of unique call_control_ids the supervisor can whisper ... |

```go
	action, err := client.Conferences.Actions.Update(
		context.Background(),
		"id",
		telnyx.ConferenceActionUpdateParams{
			UpdateConference: telnyx.UpdateConferenceParam{
				CallControlID:  "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg",
				SupervisorRole: telnyx.UpdateConferenceSupervisorRoleWhisper,
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", action.Data)
```

Key response fields: `response.data.result`

## Retrieve a conference participant

Retrieve details of a specific conference participant by their ID or label.

`client.Conferences.GetParticipant()` — `GET /conferences/{id}/participants/{participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `ParticipantId` | string (UUID) | Yes | Uniquely identifies the participant by their ID or label. |

```go
	response, err := client.Conferences.GetParticipant(
		context.Background(),
		"participant_id",
		telnyx.ConferenceGetParticipantParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.call_control_id`

## Update a conference participant

Update properties of a conference participant.

`client.Conferences.UpdateParticipant()` — `PATCH /conferences/{id}/participants/{participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `ParticipantId` | string (UUID) | Yes | Uniquely identifies the participant. |
| `BeepEnabled` | enum (always, never, on_enter, on_exit) | No | Whether entry/exit beeps are enabled for this participant. |
| `EndConferenceOnExit` | boolean | No | Whether the conference should end when this participant exit... |
| `SoftEndConferenceOnExit` | boolean | No | Whether the conference should soft-end when this participant... |

```go
	response, err := client.Conferences.UpdateParticipant(
		context.Background(),
		"participant_id",
		telnyx.ConferenceUpdateParticipantParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.call_control_id`

## List queues

List all queues for the authenticated user.

`client.Queues.List()` — `GET /queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load |
| `Page[size]` | integer | No | The size of the page |

```go
	page, err := client.Queues.List(context.Background(), telnyx.QueueListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a queue

Create a new call queue.

`client.Queues.New()` — `POST /queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | The name of the queue. |
| `MaxSize` | integer | No | The maximum number of calls allowed in the queue. |

```go
	queue, err := client.Queues.New(context.Background(), telnyx.QueueNewParams{
		QueueName: "tier_1_support",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", queue.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a call queue

Retrieve an existing call queue

`client.Queues.Get()` — `GET /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | Uniquely identifies the queue by name |

```go
	queue, err := client.Queues.Get(context.Background(), "queue_name")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", queue.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a queue

Update properties of an existing call queue.

`client.Queues.Update()` — `POST /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MaxSize` | integer | Yes | The maximum number of calls allowed in the queue. |
| `QueueName` | string | Yes | Uniquely identifies the queue by name |

```go
	queue, err := client.Queues.Update(
		context.Background(),
		"queue_name",
		telnyx.QueueUpdateParams{
			MaxSize: 200,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", queue.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a queue

Delete an existing call queue.

`client.Queues.Delete()` — `DELETE /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | Uniquely identifies the queue by name |

```go
	err := client.Queues.Delete(context.Background(), "queue_name")
	if err != nil {
		log.Fatal(err)
	}
```

## Retrieve calls from a queue

Retrieve the list of calls in an existing queue

`client.Queues.Calls.List()` — `GET /queues/{queue_name}/calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | Uniquely identifies the queue by name |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Queues.Calls.List(
		context.Background(),
		"queue_name",
		telnyx.QueueCallListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.to, response.data.from, response.data.connection_id`

## Retrieve a call from a queue

Retrieve an existing call from an existing queue

`client.Queues.Calls.Get()` — `GET /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | Uniquely identifies the queue by name |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```go
	call, err := client.Queues.Calls.Get(
		context.Background(),
		"call_control_id",
		telnyx.QueueCallGetParams{
			QueueName: "my-queue",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", call.Data)
```

Key response fields: `response.data.to, response.data.from, response.data.connection_id`

## Update queued call

Update queued call's keep_after_hangup flag

`client.Queues.Calls.Update()` — `PATCH /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | Uniquely identifies the queue by name |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `KeepAfterHangup` | boolean | No | Whether the call should remain in queue after hangup. |

```go
	err := client.Queues.Calls.Update(
		context.Background(),
		"call_control_id",
		telnyx.QueueCallUpdateParams{
			QueueName: "my-queue",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Force remove a call from a queue

Removes an inactive call from a queue. If the call is no longer active, use this command to remove it from the queue.

`client.Queues.Calls.Remove()` — `DELETE /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `QueueName` | string | Yes | Uniquely identifies the queue by name |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```go
	err := client.Queues.Calls.Remove(
		context.Background(),
		"call_control_id",
		telnyx.QueueCallRemoveParams{
			QueueName: "my-queue",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

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
| `callEnqueued` | `call.enqueued` | Call Enqueued |
| `callLeftQueue` | `call.left.queue` | Call Left Queue |
| `conferenceCreated` | `conference.created` | Conference Created |
| `conferenceEnded` | `conference.ended` | Conference Ended |
| `conferenceFloorChanged` | `conference.floor.changed` | Conference Floor Changed |
| `conferenceParticipantJoined` | `conference.participant.joined` | Conference Participant Joined |
| `conferenceParticipantLeft` | `conference.participant.left` | Conference Participant Left |
| `conferenceParticipantPlaybackEnded` | `conference.participant.playback.ended` | Conference Participant Playback Ended |
| `conferenceParticipantPlaybackStarted` | `conference.participant.playback.started` | Conference Participant Playback Started |
| `conferenceParticipantSpeakEnded` | `conference.participant.speak.ended` | Conference Participant Speak Ended |
| `conferenceParticipantSpeakStarted` | `conference.participant.speak.started` | Conference Participant Speak Started |
| `conferencePlaybackEnded` | `conference.playback.ended` | Conference Playback Ended |
| `conferencePlaybackStarted` | `conference.playback.started` | Conference Playback Started |
| `conferenceRecordingSaved` | `conference.recording.saved` | Conference Recording Saved |
| `conferenceSpeakEnded` | `conference.speak.ended` | Conference Speak Ended |
| `conferenceSpeakStarted` | `conference.speak.started` | Conference Speak Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
