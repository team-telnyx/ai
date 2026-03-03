---
name: telnyx-voice-gather-go
description: >-
  Collect DTMF input and speech from callers using standard gather or AI-powered
  gather. Build interactive voice menus and AI voice assistants. This skill
  provides Go SDK examples.
metadata:
  author: telnyx
  product: voice-gather
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Gather - Go

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

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

Optional: `client_state` (string), `command_id` (string), `messages` (array[object])

```go
	response, err := client.Calls.Actions.AddAIAssistantMessages(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionAddAIAssistantMessagesParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Start AI Assistant

Start an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_start`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `greeting` (string), `interruption_settings` (object), `transcription` (object), `voice` (string), `voice_settings` (object)

```go
	response, err := client.Calls.Actions.StartAIAssistant(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStartAIAssistantParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Stop AI Assistant

Stop an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_stop`

Optional: `client_state` (string), `command_id` (string)

```go
	response, err := client.Calls.Actions.StopAIAssistant(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStopAIAssistantParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Gather

Gather DTMF signals to build interactive menus.

`POST /calls/{call_control_id}/actions/gather`

Optional: `client_state` (string), `command_id` (string), `gather_id` (string), `initial_timeout_millis` (int32), `inter_digit_timeout_millis` (int32), `maximum_digits` (int32), `minimum_digits` (int32), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string)

```go
	response, err := client.Calls.Actions.Gather(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionGatherParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Gather stop

Stop current gather.

`POST /calls/{call_control_id}/actions/gather_stop`

Optional: `client_state` (string), `command_id` (string)

```go
	response, err := client.Calls.Actions.StopGather(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionStopGatherParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Gather using AI

Gather parameters defined in the request payload using a voice assistant.

`POST /calls/{call_control_id}/actions/gather_using_ai` — Required: `parameters`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `gather_ended_speech` (string), `greeting` (string), `interruption_settings` (object), `language` (object), `message_history` (array[object]), `send_message_history_updates` (boolean), `send_partial_results` (boolean), `transcription` (object), `user_response_timeout_ms` (integer), `voice` (string), `voice_settings` (object)

```go
	response, err := client.Calls.Actions.GatherUsingAI(
		context.TODO(),
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
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus.

`POST /calls/{call_control_id}/actions/gather_using_audio`

Optional: `audio_url` (string), `client_state` (string), `command_id` (string), `inter_digit_timeout_millis` (int32), `invalid_audio_url` (string), `invalid_media_name` (string), `maximum_digits` (int32), `maximum_tries` (int32), `media_name` (string), `minimum_digits` (int32), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string)

```go
	response, err := client.Calls.Actions.GatherUsingAudio(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionGatherUsingAudioParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus.

`POST /calls/{call_control_id}/actions/gather_using_speak` — Required: `voice`, `payload`

Optional: `client_state` (string), `command_id` (string), `inter_digit_timeout_millis` (int32), `invalid_payload` (string), `language` (enum), `maximum_digits` (int32), `maximum_tries` (int32), `minimum_digits` (int32), `payload_type` (enum), `service_level` (enum), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string), `voice_settings` (object)

```go
	response, err := client.Calls.Actions.GatherUsingSpeak(
		context.TODO(),
		"call_control_id",
		telnyx.CallActionGatherUsingSpeakParams{
			Payload: "say this on call",
			Voice:   "male",
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
| `CallAIGatherEnded` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | Call AI Gather Partial Results |
| `callGatherEnded` | Call Gather Ended |

### Webhook payload fields

**`CallAIGatherEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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
| `data.payload.status` | enum | Reflects how command ended. |

**`CallAIGatherMessageHistoryUpdated`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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

**`CallAIGatherPartialResults`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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

**`callGatherEnded`**

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
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.digits` | string | The received DTMF digit or symbol. |
| `data.payload.status` | enum | Reflects how command ended. |
