---
name: telnyx-voice-streaming-go
description: >-
  Real-time audio streaming, media forking, and live transcription. Use for
  analytics and AI integrations.
metadata:
  author: telnyx
  product: voice-streaming
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Streaming start

Start streaming the media from a call to a specific WebSocket address or Dialogflow connection in near-realtime. Audio will be delivered as base64-encoded RTP payload (raw audio), wrapped in JSON payloads. Please find more details about media streaming messages specification under the [link](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming).

`client.Calls.Actions.StartStreaming()` — `POST /calls/{call_control_id}/actions/streaming_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `StreamTrack` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be streamed. |
| `StreamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | No | Specifies the codec to be used for the streamed audio. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
