<!-- SDK reference: telnyx-video-go -->

# Telnyx Video - Go

## Core Workflow

### Prerequisites

1. No phone number needed — video rooms are standalone

### Steps

1. **Create room**: `client.Rooms.Create(ctx, params)`
2. **Generate client token**: `client.Rooms.ClientTokens.Create(ctx, params)`
3. **Join from client**: `Use the client token in a WebRTC client SDK`
4. **List recordings**: `client.RoomRecordings.List(ctx, params)`

### Common mistakes

- Client tokens are short-lived — generate a new one for each participant session
- Room unique_name must be globally unique — use UUIDs or prefixed names

**Related skills**: telnyx-webrtc-go

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

result, err := client.Rooms.Create(ctx, params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a room.

Synchronously create a Room.

`client.Rooms.New()` — `POST /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UniqueName` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `MaxParticipants` | integer | No | The maximum amount of participants allowed in a room. |
| `EnableRecording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in the API Details section below |

```go
	room, err := client.Rooms.New(context.Background(), telnyx.RoomNewParams{
		UniqueName: "my-meeting-room",
		MaxParticipants: 10,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", room.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create Client Token to join a room.

Synchronously create an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`, a Refresh Token is also provided to refresh a Client Token, the Refresh Token expires after `refresh_token_ttl_secs`.

`client.Rooms.Actions.GenerateJoinClientToken()` — `POST /rooms/{room_id}/actions/generate_join_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomId` | string (UUID) | Yes | The unique identifier of a room. |
| `TokenTtlSecs` | integer | No | The time to live in seconds of the Client Token, after that ... |
| `RefreshTokenTtlSecs` | integer | No | The time to live in seconds of the Refresh Token, after that... |

```go
	response, err := client.Rooms.Actions.GenerateJoinClientToken(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomActionGenerateJoinClientTokenParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.refresh_token, response.data.refresh_token_expires_at, response.data.token`

## View a list of rooms.

`client.Rooms.List()` — `GET /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IncludeSessions` | boolean | No | To decide if room sessions should be included in the respons... |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Rooms.List(context.Background(), telnyx.RoomListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room.

`client.Rooms.Get()` — `GET /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomId` | string (UUID) | Yes | The unique identifier of a room. |
| `IncludeSessions` | boolean | No | To decide if room sessions should be included in the respons... |

```go
	room, err := client.Rooms.Get(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", room.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a room composition.

Asynchronously create a room composition.

`client.RoomCompositions.New()` — `POST /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SessionId` | string (UUID) | No | id of the room session associated with the room composition. |
| `Format` | string | No | The desired format of the room composition. |
| `Resolution` | string | No | The desired resolution (width/height in pixels) of the resul... |
| ... | | | +4 optional params in the API Details section below |

```go
	roomComposition, err := client.RoomCompositions.New(context.Background(), telnyx.RoomCompositionNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", roomComposition.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a list of room compositions.

`client.RoomCompositions.List()` — `GET /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.RoomCompositions.List(context.Background(), telnyx.RoomCompositionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a room composition.

`client.RoomCompositions.Get()` — `GET /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomCompositionId` | string (UUID) | Yes | The unique identifier of a room composition. |

```go
	roomComposition, err := client.RoomCompositions.Get(context.Background(), "5219b3af-87c6-4c08-9b58-5a533d893e21")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", roomComposition.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a room composition.

Synchronously delete a room composition.

`client.RoomCompositions.Delete()` — `DELETE /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomCompositionId` | string (UUID) | Yes | The unique identifier of a room composition. |

```go
	err := client.RoomCompositions.Delete(context.Background(), "5219b3af-87c6-4c08-9b58-5a533d893e21")
	if err != nil {
		log.Fatal(err)
	}
```

## View a list of room participants.

`client.RoomParticipants.List()` — `GET /room_participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.RoomParticipants.List(context.Background(), telnyx.RoomParticipantListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a room participant.

`client.RoomParticipants.Get()` — `GET /room_participants/{room_participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomParticipantId` | string (UUID) | Yes | The unique identifier of a room participant. |

```go
	roomParticipant, err := client.RoomParticipants.Get(context.Background(), "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", roomParticipant.Data)
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a list of room recordings.

`client.RoomRecordings.List()` — `GET /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.RoomRecordings.List(context.Background(), telnyx.RoomRecordingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete several room recordings in a bulk.

`client.RoomRecordings.DeleteBulk()` — `DELETE /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	response, err := client.RoomRecordings.DeleteBulk(context.Background(), telnyx.RoomRecordingDeleteBulkParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.room_recordings`

## View a room recording.

`client.RoomRecordings.Get()` — `GET /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomRecordingId` | string (UUID) | Yes | The unique identifier of a room recording. |

```go
	roomRecording, err := client.RoomRecordings.Get(context.Background(), "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", roomRecording.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a room recording.

Synchronously delete a Room Recording.

`client.RoomRecordings.Delete()` — `DELETE /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomRecordingId` | string (UUID) | Yes | The unique identifier of a room recording. |

```go
	err := client.RoomRecordings.Delete(context.Background(), "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
	if err != nil {
		log.Fatal(err)
	}
```

## View a list of room sessions.

`client.Rooms.Sessions.List0()` — `GET /room_sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IncludeParticipants` | boolean | No | To decide if room participants should be included in the res... |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Rooms.Sessions.List0(context.Background(), telnyx.RoomSessionList0Params{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room session.

`client.Rooms.Sessions.Get()` — `GET /room_sessions/{room_session_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `IncludeParticipants` | boolean | No | To decide if room participants should be included in the res... |

```go
	session, err := client.Rooms.Sessions.Get(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomSessionGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", session.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## End a room session.

Note: this will also kick all participants currently present in the room

`client.Rooms.Sessions.Actions.End()` — `POST /room_sessions/{room_session_id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |

```go
	response, err := client.Rooms.Sessions.Actions.End(context.Background(), "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Kick participants from a room session.

`client.Rooms.Sessions.Actions.Kick()` — `POST /room_sessions/{room_session_id}/actions/kick`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `Participants` | object | No | Either a list of participant id to perform the action on, or... |
| `Exclude` | array[string] | No | List of participant id to exclude from the action. |

```go
	response, err := client.Rooms.Sessions.Actions.Kick(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomSessionActionKickParams{
			ActionsParticipantsRequest: telnyx.ActionsParticipantsRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Mute participants in room session.

`client.Rooms.Sessions.Actions.Mute()` — `POST /room_sessions/{room_session_id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `Participants` | object | No | Either a list of participant id to perform the action on, or... |
| `Exclude` | array[string] | No | List of participant id to exclude from the action. |

```go
	response, err := client.Rooms.Sessions.Actions.Mute(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomSessionActionMuteParams{
			ActionsParticipantsRequest: telnyx.ActionsParticipantsRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Unmute participants in room session.

`client.Rooms.Sessions.Actions.Unmute()` — `POST /room_sessions/{room_session_id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `Participants` | object | No | Either a list of participant id to perform the action on, or... |
| `Exclude` | array[string] | No | List of participant id to exclude from the action. |

```go
	response, err := client.Rooms.Sessions.Actions.Unmute(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomSessionActionUnmuteParams{
			ActionsParticipantsRequest: telnyx.ActionsParticipantsRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## View a list of room participants.

`client.Rooms.Sessions.GetParticipants()` — `GET /room_sessions/{room_session_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Rooms.Sessions.GetParticipants(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomSessionGetParticipantsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## Update a room.

Synchronously update a Room.

`client.Rooms.Update()` — `PATCH /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomId` | string (UUID) | Yes | The unique identifier of a room. |
| `UniqueName` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `MaxParticipants` | integer | No | The maximum amount of participants allowed in a room. |
| `EnableRecording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in the API Details section below |

```go
	room, err := client.Rooms.Update(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", room.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a room.

Synchronously delete a Room. Participants from that room will be kicked out, they won't be able to join that room anymore, and you won't be charged anymore for that room.

`client.Rooms.Delete()` — `DELETE /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomId` | string (UUID) | Yes | The unique identifier of a room. |

```go
	err := client.Rooms.Delete(context.Background(), "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
	if err != nil {
		log.Fatal(err)
	}
```

## Refresh Client Token to join a room.

Synchronously refresh an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`.

`client.Rooms.Actions.RefreshClientToken()` — `POST /rooms/{room_id}/actions/refresh_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RefreshToken` | string | Yes |  |
| `RoomId` | string (UUID) | Yes | The unique identifier of a room. |
| `TokenTtlSecs` | integer | No | The time to live in seconds of the Client Token, after that ... |

```go
	response, err := client.Rooms.Actions.RefreshClientToken(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomActionRefreshClientTokenParams{
			RefreshToken: "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZWxueXhfdGVsZXBob255IiwiZXhwIjoxNTkwMDEwMTQzLCJpYXQiOjE1ODc1OTA5NDMsImlzcyI6InRlbG55eF90ZWxlcGhvbnkiLCJqdGkiOiJiOGM3NDgzNy1kODllLTRhNjUtOWNmMi0zNGM3YTZmYTYwYzgiLCJuYmYiOjE1ODc1OTA5NDIsInN1YiI6IjVjN2FjN2QwLWRiNjUtNGYxMS05OGUxLWVlYzBkMWQ1YzZhZSIsInRlbF90b2tlbiI6InJqX1pra1pVT1pNeFpPZk9tTHBFVUIzc2lVN3U2UmpaRmVNOXMtZ2JfeENSNTZXRktGQUppTXlGMlQ2Q0JSbWxoX1N5MGlfbGZ5VDlBSThzRWlmOE1USUlzenl6U2xfYURuRzQ4YU81MHlhSEd1UlNZYlViU1ltOVdJaVEwZz09IiwidHlwIjoiYWNjZXNzIn0.gNEwzTow5MLLPLQENytca7pUN79PmPj6FyqZWW06ZeEmesxYpwKh0xRtA0TzLh6CDYIRHrI8seofOO0YFGDhpQ",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.token, response.data.token_expires_at`

## View a list of room sessions.

`client.Rooms.Sessions.List1()` — `GET /rooms/{room_id}/sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RoomId` | string (UUID) | Yes | The unique identifier of a room. |
| `IncludeParticipants` | boolean | No | To decide if room participants should be included in the res... |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Rooms.Sessions.List1(
		context.Background(),
		"0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		telnyx.RoomSessionList1Params{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

# Video (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** View a list of room compositions., Create a room composition., View a room composition.

| Field | Type |
|-------|------|
| `completed_at` | date-time |
| `created_at` | date-time |
| `download_url` | string |
| `duration_secs` | integer |
| `ended_at` | date-time |
| `format` | enum: mp4 |
| `id` | uuid |
| `record_type` | string |
| `resolution` | string |
| `room_id` | uuid |
| `session_id` | uuid |
| `size_mb` | float |
| `started_at` | date-time |
| `status` | enum: completed, enqueued, processing |
| `updated_at` | date-time |
| `user_id` | uuid |
| `video_layout` | object |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer |

**Returned by:** View a list of room participants., View a room participant., View a list of room participants.

| Field | Type |
|-------|------|
| `context` | string |
| `id` | uuid |
| `joined_at` | date-time |
| `left_at` | date-time |
| `record_type` | string |
| `session_id` | uuid |
| `updated_at` | date-time |

**Returned by:** View a list of room recordings., View a room recording.

| Field | Type |
|-------|------|
| `codec` | string |
| `completed_at` | date-time |
| `created_at` | date-time |
| `download_url` | string |
| `duration_secs` | integer |
| `ended_at` | date-time |
| `id` | uuid |
| `participant_id` | uuid |
| `record_type` | string |
| `room_id` | uuid |
| `session_id` | uuid |
| `size_mb` | float |
| `started_at` | date-time |
| `status` | enum: completed, processing |
| `type` | enum: audio, video |
| `updated_at` | date-time |

**Returned by:** Delete several room recordings in a bulk.

| Field | Type |
|-------|------|
| `room_recordings` | integer |

**Returned by:** View a list of room sessions., View a room session., View a list of room sessions.

| Field | Type |
|-------|------|
| `active` | boolean |
| `created_at` | date-time |
| `ended_at` | date-time |
| `id` | uuid |
| `participants` | array[object] |
| `record_type` | string |
| `room_id` | uuid |
| `updated_at` | date-time |

**Returned by:** End a room session., Kick participants from a room session., Mute participants in room session., Unmute participants in room session.

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** View a list of rooms., Create a room., View a room., Update a room.

| Field | Type |
|-------|------|
| `active_session_id` | uuid |
| `created_at` | date-time |
| `enable_recording` | boolean |
| `id` | uuid |
| `max_participants` | integer |
| `record_type` | string |
| `sessions` | array[object] |
| `unique_name` | string |
| `updated_at` | date-time |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer |

**Returned by:** Create Client Token to join a room.

| Field | Type |
|-------|------|
| `refresh_token` | string |
| `refresh_token_expires_at` | date-time |
| `token` | string |
| `token_expires_at` | date-time |

**Returned by:** Refresh Client Token to join a room.

| Field | Type |
|-------|------|
| `token` | string |
| `token_expires_at` | date-time |

## Optional Parameters

### Create a room composition. — `client.RoomCompositions.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Format` | string | The desired format of the room composition. |
| `Resolution` | string | The desired resolution (width/height in pixels) of the resulting video of the... |
| `SessionId` | string (UUID) | id of the room session associated with the room composition. |
| `VideoLayout` | object | Describes the video layout of the room composition in terms of regions. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this room composition will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room composition will be sent... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Kick participants from a room session. — `client.Rooms.Sessions.Actions.Kick()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `Exclude` | array[string] | List of participant id to exclude from the action. |

### Mute participants in room session. — `client.Rooms.Sessions.Actions.Mute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `Exclude` | array[string] | List of participant id to exclude from the action. |

### Unmute participants in room session. — `client.Rooms.Sessions.Actions.Unmute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `Exclude` | array[string] | List of participant id to exclude from the action. |

### Create a room. — `client.Rooms.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `UniqueName` | string | The unique (within the Telnyx account scope) name of the room. |
| `MaxParticipants` | integer | The maximum amount of participants allowed in a room. |
| `EnableRecording` | boolean | Enable or disable recording for that room. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this room will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Update a room. — `client.Rooms.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `UniqueName` | string | The unique (within the Telnyx account scope) name of the room. |
| `MaxParticipants` | integer | The maximum amount of participants allowed in a room. |
| `EnableRecording` | boolean | Enable or disable recording for that room. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this room will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Create Client Token to join a room. — `client.Rooms.Actions.GenerateJoinClientToken()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TokenTtlSecs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
| `RefreshTokenTtlSecs` | integer | The time to live in seconds of the Refresh Token, after that time the Refresh... |

### Refresh Client Token to join a room. — `client.Rooms.Actions.RefreshClientToken()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TokenTtlSecs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
