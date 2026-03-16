---
name: telnyx-voice-advanced-go
description: >-
  DTMF sending, SIPREC recording, noise suppression, client state, and
  supervisor controls.
metadata:
  author: telnyx
  product: voice-advanced
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

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
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
