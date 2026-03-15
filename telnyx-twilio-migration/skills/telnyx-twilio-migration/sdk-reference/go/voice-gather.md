<!-- SDK reference: telnyx-voice-gather-go -->

# Telnyx Voice Gather - Go

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-go)
2. Call must be answered before issuing gather commands

### Steps

1. **Gather DTMF**: `client.Calls.Actions.Gather(ctx, params)`
2. **Gather with audio prompt**: `client.Calls.Actions.GatherUsingAudio(ctx, params)`
3. **Gather with TTS prompt**: `client.Calls.Actions.GatherUsingSpeak(ctx, params)`
4. **Handle result**: `call.gather.ended webhook — digits in data.payload.digits`

### Common mistakes

- NEVER issue gather before the call is answered — will fail silently
- Gather results arrive via call.gather.ended webhook — NOT in the API response
- Set inter_digit_timeout_millis to control how long to wait between digits (default varies)
- For AI-powered gather, results arrive via call.ai_gather.ended webhook

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

result, err := client.Calls.Actions.Gather(ctx, params)
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
## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`client.Calls.Actions.Gather()` — `POST /calls/{call_control_id}/actions/gather`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `GatherId` | string (UUID) | No | An id that will be sent back in the corresponding `call.gath... |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +7 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.Gather(
		context.Background(),
		"call_control_id",
		telnyx.CallActionGatherParams{
		MinimumDigits: 1,
		MaximumDigits: 4,
	},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_audio_url', which will be played back at the beginning of each prompt. Playback will be interrupted when a DTMF signal is received.

`client.Calls.Actions.GatherUsingAudio()` — `POST /calls/{call_control_id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `AudioUrl` | string (URL) | No | The URL of a file to be played back at the beginning of each... |
| ... | | | +10 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.GatherUsingAudio(
		context.Background(),
		"call_control_id",
		telnyx.CallActionGatherUsingAudioParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_payload', which will be played back at the beginning of each prompt. Speech will be interrupted when a DTMF signal is received.

`client.Calls.Actions.GatherUsingSpeak()` — `POST /calls/{call_control_id}/actions/gather_using_speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Payload` | string | Yes | The text or SSML to be converted into speech. |
| `Voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `PayloadType` | enum (text, ssml) | No | The type of the provided payload. |
| `ServiceLevel` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +11 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.GatherUsingSpeak(
		context.Background(),
		"call_control_id",
		telnyx.CallActionGatherUsingSpeakParams{
			Payload: "say this on call",
			Voice:   "male",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Gather using AI

Gather parameters defined in the request payload using a voice assistant. You can pass parameters described as a JSON Schema object and the voice assistant will attempt to gather these informations.

`client.Calls.Actions.GatherUsingAI()` — `POST /calls/{call_control_id}/actions/gather_using_ai`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Parameters` | object | Yes | The parameters described as a JSON Schema object that needs ... |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `Assistant` | object | No | Assistant configuration including choice of LLM, custom inst... |
| ... | | | +11 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.GatherUsingAI(
		context.Background(),
		"call_control_id",
		telnyx.CallActionGatherUsingAIParams{
			Parameters: map[string]any{
				"properties": "bar",
				"required":   "bar",
				"type":       "bar",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.conversation_id, response.data.result`

## Gather stop

Stop current gather. **Expected Webhooks:**

- `call.gather.ended`

`client.Calls.Actions.StopGather()` — `POST /calls/{call_control_id}/actions/gather_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.StopGather(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopGatherParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`client.Calls.Actions.AddAIAssistantMessages()` — `POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `Messages` | array[object] | No | The messages to add to the conversation. |

```go
	response, err := client.Calls.Actions.AddAIAssistantMessages(
		context.Background(),
		"call_control_id",
		telnyx.CallActionAddAIAssistantMessagesParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Start AI Assistant

Start an AI assistant on the call. **Expected Webhooks:**

- `call.conversation.ended`
- `call.conversation_insights.generated`

`client.Calls.Actions.StartAIAssistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `Assistant` | object | No | AI Assistant configuration |
| ... | | | +5 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.StartAIAssistant(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartAIAssistantParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.conversation_id, response.data.result`

## Stop AI Assistant

Stop an AI assistant on the call.

`client.Calls.Actions.StopAIAssistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.StopAIAssistant(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopAIAssistantParams{},
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
| `CallAIGatherEnded` | `call.ai_gather.ended` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | `call.ai.gather.message.history.updated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | `call.ai.gather.partial.results` | Call AI Gather Partial Results |
| `callGatherEnded` | `call.gather.ended` | Call Gather Ended |

Webhook payload field definitions are in the API Details section below.

---

# Voice Gather (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Add messages to AI Assistant, Stop AI Assistant, Gather, Gather stop, Gather using audio, Gather using speak

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** Start AI Assistant, Gather using AI

| Field | Type |
|-------|------|
| `conversation_id` | uuid |
| `result` | string |

## Optional Parameters

### Add messages to AI Assistant — `client.Calls.Actions.AddAIAssistantMessages()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `Messages` | array[object] | The messages to add to the conversation. |

### Start AI Assistant — `client.Calls.Actions.StartAIAssistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Assistant` | object | AI Assistant configuration |
| `Voice` | string | The voice to be used by the voice assistant. |
| `VoiceSettings` | object | The settings associated with the voice selected |
| `Greeting` | string | Text that will be played when the assistant starts, if none then nothing will... |
| `InterruptionSettings` | object | Settings for handling user interruptions during assistant speech |
| `Transcription` | object | The settings associated with speech to text for the voice assistant. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Stop AI Assistant — `client.Calls.Actions.StopAIAssistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather — `client.Calls.Actions.Gather()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `MinimumDigits` | integer | The minimum number of digits to fetch. |
| `MaximumDigits` | integer | The maximum number of digits to fetch. |
| `TimeoutMillis` | integer | The number of milliseconds to wait to complete the request. |
| `InterDigitTimeoutMillis` | integer | The number of milliseconds to wait for input between digits. |
| `InitialTimeoutMillis` | integer | The number of milliseconds to wait for the first DTMF. |
| `TerminatingDigit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `ValidDigits` | string | A list of all digits accepted as valid. |
| `GatherId` | string (UUID) | An id that will be sent back in the corresponding `call.gather.ended` webhook. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather stop — `client.Calls.Actions.StopGather()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using AI — `client.Calls.Actions.GatherUsingAI()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Assistant` | object | Assistant configuration including choice of LLM, custom instructions, and tools. |
| `Transcription` | object | The settings associated with speech to text for the voice assistant. |
| `Language` | object |  |
| `Voice` | string | The voice to be used by the voice assistant. |
| `VoiceSettings` | object | The settings associated with the voice selected |
| `Greeting` | string | Text that will be played when the gathering starts, if none then nothing will... |
| `SendPartialResults` | boolean | Default is `false`. |
| `SendMessageHistoryUpdates` | boolean | Default is `false`. |
| `MessageHistory` | array[object] | The message history you want the voice assistant to be aware of, this can be ... |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `InterruptionSettings` | object | Settings for handling user interruptions during assistant speech |
| `UserResponseTimeoutMs` | integer | The maximum time in milliseconds to wait for user response before timing out. |
| `GatherEndedSpeech` | string | Text that will be played when the gathering has finished. |

### Gather using audio — `client.Calls.Actions.GatherUsingAudio()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `AudioUrl` | string (URL) | The URL of a file to be played back at the beginning of each prompt. |
| `MediaName` | string | The media_name of a file to be played back at the beginning of each prompt. |
| `InvalidAudioUrl` | string (URL) | The URL of a file to play when digits don't match the `valid_digits` paramete... |
| `InvalidMediaName` | string | The media_name of a file to be played back when digits don't match the `valid... |
| `MinimumDigits` | integer | The minimum number of digits to fetch. |
| `MaximumDigits` | integer | The maximum number of digits to fetch. |
| `MaximumTries` | integer | The maximum number of times the file should be played if there is no input fr... |
| `TimeoutMillis` | integer | The number of milliseconds to wait for a DTMF response after file playback en... |
| `TerminatingDigit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `ValidDigits` | string | A list of all digits accepted as valid. |
| `InterDigitTimeoutMillis` | integer | The number of milliseconds to wait for input between digits. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using speak — `client.Calls.Actions.GatherUsingSpeak()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `InvalidPayload` | string | The text or SSML to be converted into speech when digits don't match the `val... |
| `PayloadType` | enum (text, ssml) | The type of the provided payload. |
| `ServiceLevel` | enum (basic, premium) | This parameter impacts speech quality, language options and payload types. |
| `VoiceSettings` | object | The settings associated with the voice selected |
| `Language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | The language you want spoken. |
| `MinimumDigits` | integer | The minimum number of digits to fetch. |
| `MaximumDigits` | integer | The maximum number of digits to fetch. |
| `MaximumTries` | integer | The maximum number of times that a file should be played back if there is no ... |
| `TimeoutMillis` | integer | The number of milliseconds to wait for a DTMF response after speak ends befor... |
| `TerminatingDigit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `ValidDigits` | string | A list of all digits accepted as valid. |
| `InterDigitTimeoutMillis` | integer | The number of milliseconds to wait for input between digits. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

## Webhook Payload Fields

### `CallAIGatherEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.ai_gather.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Telnyx connection ID used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.message_history` | array[object] | The history of the messages exchanged during the AI gather |
| `data.payload.result` | object | The result of the AI gather, its type depends of the `parameters` provided in the command |
| `data.payload.status` | enum: valid, invalid | Reflects how command ended. |

### `CallAIGatherMessageHistoryUpdated`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.ai_gather.message_history_updated | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Telnyx connection ID used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.message_history` | array[object] | The history of the messages exchanged during the AI gather |

### `CallAIGatherPartialResults`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.ai_gather.partial_results | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Telnyx connection ID used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.message_history` | array[object] | The history of the messages exchanged during the AI gather |
| `data.payload.partial_results` | object | The partial result of the AI gather, its type depends of the `parameters` provided in the command |

### `callGatherEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.gather.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.digits` | string | The received DTMF digit or symbol. |
| `data.payload.status` | enum: valid, invalid, call_hangup, cancelled, cancelled_amd, timeout | Reflects how command ended. |
