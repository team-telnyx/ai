<!-- SDK reference: telnyx-voice-streaming-go -->

# Telnyx Voice Streaming - Go

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-go)
2. WebSocket server ready to receive audio stream (for streaming)

### Steps

1. **Start streaming**: `client.Calls.Actions.StreamingStart(ctx, params)`
2. **Start transcription**: `client.Calls.Actions.TranscriptionStart(ctx, params)`
3. **Start fork**: `client.Calls.Actions.ForkStart(ctx, params)`

### Common mistakes

- stream_url must be a WebSocket URL (wss://) — HTTP URLs will fail
- Transcription events arrive via call.transcription webhook — not in the API response
- VOICE IS EVENT-DRIVEN: all streaming commands return immediately, data arrives via WebSocket or webhooks

**Related skills**: telnyx-voice-go, telnyx-voice-media-go

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

result, err := client.Calls.Actions.StreamingStart(ctx, params)
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
## Streaming start

Start streaming the media from a call to a specific WebSocket address or Dialogflow connection in near-realtime. Audio will be delivered as base64-encoded RTP payload (raw audio), wrapped in JSON payloads. Please find more details about media streaming messages specification under the [link](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming).

`client.Calls.Actions.StartStreaming()` — `POST /calls/{call_control_id}/actions/streaming_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `StreamTrack` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be streamed. |
| `StreamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | No | Specifies the codec to be used for the streamed audio. |
| ... | | | +10 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.StartStreaming(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartStreamingParams{
		StreamURL: "wss://example.com/audio-stream",
	},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Streaming stop

Stop streaming a call to a WebSocket. **Expected Webhooks:**

- `streaming.stopped`

`client.Calls.Actions.StopStreaming()` — `POST /calls/{call_control_id}/actions/streaming_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `StreamId` | string (UUID) | No | Identifies the stream. |

```go
	response, err := client.Calls.Actions.StopStreaming(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopStreamingParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Transcription start

Start real-time transcription. Transcription will stop on call hang-up, or can be initiated via the Transcription stop command. **Expected Webhooks:**

- `call.transcription`

`client.Calls.Actions.StartTranscription()` — `POST /calls/{call_control_id}/actions/transcription_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `TranscriptionEngine` | enum (Google, Telnyx, Deepgram, Azure, A, ...) | No | Engine to use for speech recognition. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +2 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.StartTranscription(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartTranscriptionParams{
			TranscriptionStartRequest: telnyx.TranscriptionStartRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Transcription stop

Stop real-time transcription.

`client.Calls.Actions.StopTranscription()` — `POST /calls/{call_control_id}/actions/transcription_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.StopTranscription(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopTranscriptionParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Forking start

Call forking allows you to stream the media from a call to a specific target in realtime. This stream can be used to enable realtime audio analysis to support a 
variety of use cases, including fraud detection, or the creation of AI-generated audio responses. Requests must specify either the `target` attribute or the `rx` and `tx` attributes.

`client.Calls.Actions.StartForking()` — `POST /calls/{call_control_id}/actions/fork_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `StreamType` | enum (decrypted) | No | Optionally specify a media type to stream. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +2 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.StartForking(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartForkingParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Forking stop

Stop forking a call. **Expected Webhooks:**

- `call.fork.stopped`

`client.Calls.Actions.StopForking()` — `POST /calls/{call_control_id}/actions/fork_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `StreamType` | enum (raw, decrypted) | No | Optionally specify a `stream_type`. |

```go
	response, err := client.Calls.Actions.StopForking(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopForkingParams{},
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
| `callForkStarted` | `call.fork.started` | Call Fork Started |
| `callForkStopped` | `call.fork.stopped` | Call Fork Stopped |
| `callStreamingFailed` | `call.streaming.failed` | Call Streaming Failed |
| `callStreamingStarted` | `call.streaming.started` | Call Streaming Started |
| `callStreamingStopped` | `call.streaming.stopped` | Call Streaming Stopped |
| `transcription` | `transcription` | Transcription |

Webhook payload field definitions are in the API Details section below.

---

# Voice Streaming (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Forking start, Forking stop, Streaming start, Streaming stop, Transcription start, Transcription stop

| Field | Type |
|-------|------|
| `result` | string |

## Optional Parameters

### Forking start — `client.Calls.Actions.StartForking()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Rx` | string | The network target, , where the call's incoming RTP media packets should be f... |
| `StreamType` | enum (decrypted) | Optionally specify a media type to stream. |
| `Tx` | string | The network target, , where the call's outgoing RTP media packets should be f... |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Forking stop — `client.Calls.Actions.StopForking()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `StreamType` | enum (raw, decrypted) | Optionally specify a `stream_type`. |

### Streaming start — `client.Calls.Actions.StartStreaming()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `StreamUrl` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `StreamTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `StreamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `StreamBidirectionalMode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `StreamBidirectionalCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `StreamBidirectionalTargetLegs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `StreamBidirectionalSamplingRate` | enum (8000, 16000, 22050, 24000, 48000) | Audio sampling rate. |
| `EnableDialogflow` | boolean | Enables Dialogflow for the current call. |
| `DialogflowConfig` | object |  |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `CustomParameters` | array[object] | Custom parameters to be sent as part of the WebSocket connection. |
| `StreamAuthToken` | string | An authentication token to be sent as part of the WebSocket connection. |

### Streaming stop — `client.Calls.Actions.StopStreaming()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `StreamId` | string (UUID) | Identifies the stream. |

### Transcription start — `client.Calls.Actions.StartTranscription()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TranscriptionEngine` | enum (Google, Telnyx, Deepgram, Azure, A, ...) | Engine to use for speech recognition. |
| `TranscriptionEngineConfig` | object |  |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `TranscriptionTracks` | string | Indicates which leg of the call will be transcribed. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Transcription stop — `client.Calls.Actions.StopTranscription()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

## Webhook Payload Fields

### `callForkStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.fork.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_type` | enum: decrypted | Type of media streamed. |

### `callForkStopped`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.fork.stopped | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_type` | enum: decrypted | Type of media streamed. |

### `callStreamingFailed`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the resource. |
| `data.event_type` | enum: streaming.failed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.failure_reason` | string | A short description explaning why the media streaming failed. |
| `data.payload.stream_id` | uuid | Identifies the streaming. |
| `data.payload.stream_type` | enum: websocket, dialogflow | The type of stream connection the stream is performing. |

### `callStreamingStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: streaming.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_url` | string | Destination WebSocket address where the stream is going to be delivered. |

### `callStreamingStopped`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: streaming.stopped | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_url` | string | Destination WebSocket address where the stream is going to be delivered. |

### `transcription`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.transcription | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique identifier and token for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | Use this field to add state to every subsequent webhook. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
