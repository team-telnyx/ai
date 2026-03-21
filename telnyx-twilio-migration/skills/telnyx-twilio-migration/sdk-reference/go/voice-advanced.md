<!-- SDK reference: telnyx-voice-advanced-go -->

# Telnyx Voice Advanced - Go

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-go)

### Steps

1. **Send DTMF**: `client.Calls.Actions.SendDtmf(ctx, params)`
2. **Update client state**: `client.Calls.Actions.ClientStateUpdate(ctx, params)`
3. **SIP REFER**: `client.Calls.Actions.Refer(ctx, params)`

### Common mistakes

- client_state is base64-encoded and returned in every subsequent webhook — use it to track per-call context across webhook events
- DTMF digits are sent as a string, e.g., '1234#' — include terminator if needed
- SIPREC recording requires a SIPREC connector to be configured first

**Related skills**: telnyx-voice-go, telnyx-voice-media-go, telnyx-voice-gather-go

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

result, err := client.Calls.Actions.SendDtmf(ctx, params)
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
## Send DTMF

Sends DTMF tones from this leg. DTMF tones will be heard by the other end of the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.Calls.Actions.SendDtmf()` — `POST /calls/{call_control_id}/actions/send_dtmf`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Digits` | string | Yes | DTMF digits to send. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `DurationMillis` | integer | No | Specifies for how many milliseconds each digit will be playe... |

```go
	response, err := client.Calls.Actions.SendDtmf(
		context.Background(),
		"call_control_id",
		telnyx.CallActionSendDtmfParams{
			Digits: "1www2WABCDw9",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Update client state

Updates client state

`client.Calls.Actions.UpdateClientState()` — `PUT /calls/{call_control_id}/actions/client_state_update`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ClientState` | string | Yes | Use this field to add state to every subsequent webhook. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```go
	response, err := client.Calls.Actions.UpdateClientState(
		context.Background(),
		"call_control_id",
		telnyx.CallActionUpdateClientStateParams{
			ClientState: "aGF2ZSBhIG5pY2UgZGF5ID1d",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Join AI Assistant Conversation

Add a participant to an existing AI assistant conversation. Use this command to bring an additional call leg into a running AI conversation.

`client.Calls.Actions.JoinAIAssistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_join`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConversationId` | string (UUID) | Yes | The ID of the AI assistant conversation to join. |
| `Participant` | object | Yes |  |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.JoinAIAssistant(
		context.Background(),
		"call_control_id",
		telnyx.CallActionJoinAIAssistantParams{
			ConversationID: "v3:abc123",
			Participant: telnyx.CallActionJoinAIAssistantParamsParticipant{
				ID:   "v3:abc123def456",
				Role: "user",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.conversation_id, response.data.result`

## SIPREC start

Start siprec session to configured in SIPREC connector SRS. 

**Expected Webhooks:**

- `siprec.started`
- `siprec.stopped`
- `siprec.failed`

`client.Calls.Actions.StartSiprec()` — `POST /calls/{call_control_id}/actions/siprec_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `SipTransport` | enum (udp, tcp, tls) | No | Specifies SIP transport protocol. |
| `SiprecTrack` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be sent on siprec session. |
| ... | | | +4 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.StartSiprec(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartSiprecParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## SIPREC stop

Stop SIPREC session. **Expected Webhooks:**

- `siprec.stopped`

`client.Calls.Actions.StopSiprec()` — `POST /calls/{call_control_id}/actions/siprec_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.StopSiprec(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopSiprecParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Noise Suppression Start (BETA)

`client.Calls.Actions.StartNoiseSuppression()` — `POST /calls/{call_control_id}/actions/suppression_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `Direction` | enum (inbound, outbound, both) | No | The direction of the audio stream to be noise suppressed. |
| ... | | | +2 optional params in the API Details section below |

```go
	response, err := client.Calls.Actions.StartNoiseSuppression(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStartNoiseSuppressionParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Noise Suppression Stop (BETA)

`client.Calls.Actions.StopNoiseSuppression()` — `POST /calls/{call_control_id}/actions/suppression_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.StopNoiseSuppression(
		context.Background(),
		"call_control_id",
		telnyx.CallActionStopNoiseSuppressionParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Switch supervisor role

Switch the supervisor role for a bridged call. This allows switching between different supervisor modes during an active call

`client.Calls.Actions.SwitchSupervisorRole()` — `POST /calls/{call_control_id}/actions/switch_supervisor_role`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Role` | enum (barge, whisper, monitor) | Yes | The supervisor role to switch to. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```go
	response, err := client.Calls.Actions.SwitchSupervisorRole(
		context.Background(),
		"call_control_id",
		telnyx.CallActionSwitchSupervisorRoleParams{
			Role: telnyx.CallActionSwitchSupervisorRoleParamsRoleBarge,
		},
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
| `callConversationEnded` | `call.conversation.ended` | Call Conversation Ended |
| `callConversationInsightsGenerated` | `call.conversation.insights.generated` | Call Conversation Insights Generated |
| `callDtmfReceived` | `call.dtmf.received` | Call Dtmf Received |
| `callMachineDetectionEnded` | `call.machine.detection.ended` | Call Machine Detection Ended |
| `callMachineGreetingEnded` | `call.machine.greeting.ended` | Call Machine Greeting Ended |
| `callMachinePremiumDetectionEnded` | `call.machine.premium.detection.ended` | Call Machine Premium Detection Ended |
| `callMachinePremiumGreetingEnded` | `call.machine.premium.greeting.ended` | Call Machine Premium Greeting Ended |
| `callReferCompleted` | `call.refer.completed` | Call Refer Completed |
| `callReferFailed` | `call.refer.failed` | Call Refer Failed |
| `callReferStarted` | `call.refer.started` | Call Refer Started |
| `callSiprecFailed` | `call.siprec.failed` | Call Siprec Failed |
| `callSiprecStarted` | `call.siprec.started` | Call Siprec Started |
| `callSiprecStopped` | `call.siprec.stopped` | Call Siprec Stopped |

Webhook payload field definitions are in the API Details section below.

---

# Voice Advanced (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Join AI Assistant Conversation

| Field | Type |
|-------|------|
| `conversation_id` | uuid |
| `result` | string |

**Returned by:** Update client state, Send DTMF, SIPREC start, SIPREC stop, Noise Suppression Start (BETA), Noise Suppression Stop (BETA), Switch supervisor role

| Field | Type |
|-------|------|
| `result` | string |

## Optional Parameters

### Join AI Assistant Conversation — `client.Calls.Actions.JoinAIAssistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Send DTMF — `client.Calls.Actions.SendDtmf()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `DurationMillis` | integer | Specifies for how many milliseconds each digit will be played in the audio st... |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### SIPREC start — `client.Calls.Actions.StartSiprec()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ConnectorName` | string | Name of configured SIPREC connector to be used. |
| `SipTransport` | enum (udp, tcp, tls) | Specifies SIP transport protocol. |
| `SiprecTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be sent on siprec session. |
| `IncludeMetadataCustomHeaders` | enum (True, False) | When set, custom parameters will be added as metadata (recording.session.Exte... |
| `Secure` | enum (True, False) | Controls whether to encrypt media sent to your SRS using SRTP and TLS. |
| `SessionTimeoutSecs` | integer | Sets `Session-Expires` header to the INVITE. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |

### SIPREC stop — `client.Calls.Actions.StopSiprec()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Noise Suppression Start (BETA) — `client.Calls.Actions.StartNoiseSuppression()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `Direction` | enum (inbound, outbound, both) | The direction of the audio stream to be noise suppressed. |
| `NoiseSuppressionEngine` | enum (Denoiser, DeepFilterNet, Krisp, AiCoustics) | The engine to use for noise suppression. |
| `NoiseSuppressionEngineConfig` | object | Configuration parameters for noise suppression engines. |

### Noise Suppression Stop (BETA) — `client.Calls.Actions.StopNoiseSuppression()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

## Webhook Payload Fields

### `callConversationEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.conversation.ended | The type of event being delivered. |
| `data.id` | uuid | Unique identifier for the event. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.created_at` | date-time | Timestamp when the event was created in the system. |
| `data.payload.assistant_id` | string | Unique identifier of the assistant involved in the call. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call leg. |
| `data.payload.call_session_id` | string | ID that is unique to the call session (group of related call legs). |
| `data.payload.client_state` | string | Base64-encoded state received from a command. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.conversation_id` | string | ID unique to the conversation or insight group generated for the call. |
| `data.payload.duration_sec` | integer | Duration of the conversation in seconds. |
| `data.payload.from` | string | The caller's number or identifier. |
| `data.payload.to` | string | The callee's number or SIP address. |
| `data.payload.llm_model` | string | The large language model used during the conversation. |
| `data.payload.stt_model` | string | The speech-to-text model used in the conversation. |
| `data.payload.tts_provider` | string | The text-to-speech provider used in the call. |
| `data.payload.tts_model_id` | string | The model ID used for text-to-speech synthesis. |
| `data.payload.tts_voice_id` | string | Voice ID used for TTS. |

### `callConversationInsightsGenerated`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.conversation_insights.generated | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.insight_group_id` | string | ID that is unique to the insight group being generated for the call. |
| `data.payload.results` | array[object] | Array of insight results being generated for the call. |

### `callDtmfReceived`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.dtmf.received | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Identifies the type of resource. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.digit` | string | The received DTMF digit or symbol. |

### `callMachineDetectionEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.detection.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: human, machine, not_sure | Answering machine detection result. |

### `callMachineGreetingEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.greeting.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: beep_detected, ended, not_sure | Answering machine greeting ended result. |

### `callMachinePremiumDetectionEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.premium.detection.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: human_residence, human_business, machine, silence, fax_detected, not_sure | Premium Answering Machine Detection result. |

### `callMachinePremiumGreetingEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.premium.greeting.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: beep_detected, no_beep_detected | Premium Answering Machine Greeting Ended result. |

### `callReferCompleted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.refer.completed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.sip_notify_response` | integer | SIP NOTIFY event status for tracking the REFER attempt. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

### `callReferFailed`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.refer.failed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.sip_notify_response` | integer | SIP NOTIFY event status for tracking the REFER attempt. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

### `callReferStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.refer.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.sip_notify_response` | integer | SIP NOTIFY event status for tracking the REFER attempt. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

### `callSiprecFailed`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the resource. |
| `data.event_type` | enum: siprec.failed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.failure_cause` | string | Q850 reason why siprec session failed. |

### `callSiprecStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: siprec.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |

### `callSiprecStopped`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: siprec.stopped | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.hangup_cause` | string | Q850 reason why the SIPREC session was stopped. |
