---
name: telnyx-voice-go
description: >-
  Programmatic call control: make/receive calls, transfer, bridge, gather DTMF,
  stream audio. Real-time call events via webhooks.
metadata:
  author: telnyx
  product: voice
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice - Go

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-go)
2. Create a Voice API Application (connection) with webhook URLs
3. Assign the phone number to the Voice API Application
4. Ensure webhook endpoint is publicly accessible before making/receiving calls

### Steps

1. **Buy number**: `client.AvailablePhoneNumbers.List(ctx, params)`
2. **Create connection**: `client.Connections.Create(ctx, params)`
3. **Assign number**: `client.PhoneNumbers.Update(ctx, params)`
4. **Make outbound call**: `client.Calls.Create(ctx, params)`
5. **Handle webhooks**: `call.initiated → call.answered → send commands → call.hangup`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Full programmatic control, real-time event-driven logic, custom IVR | Call Control API (this skill) |
| Declarative XML call flows, migrating from Twilio/TwiML | TeXML (see telnyx-texml-go) |
| LLM-powered conversational voice agents, minimal code | AI Assistants (see telnyx-ai-assistants-go) |

### Common mistakes

- VOICE IS EVENT-DRIVEN: dial/create returns immediately. All subsequent actions (answer, play, gather, transfer, hangup) MUST be triggered by webhook events. You need a running webhook server that dispatches on data.event_type (e.g., 'call.initiated', 'call.answered', 'call.hangup') and issues call control commands using the call_control_id from the webhook payload
- OUTBOUND vs INBOUND: For outbound calls, dial → wait for 'call.answered' webhook → issue commands. For inbound calls, receive 'call.initiated' webhook → answer() → issue commands. NEVER call answer() on outbound calls
- NEVER make calls without a publicly accessible webhook URL — call events will be lost and calls uncontrollable
- NEVER skip assigning the number to a Voice API Application — inbound calls will be rejected

**Related skills**: telnyx-voice-media-go, telnyx-voice-gather-go, telnyx-voice-streaming-go, telnyx-texml-go, telnyx-ai-assistants-go

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

result, err := client.Calls.Dial(ctx, params)
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Dial

Dial a number or SIP URI from a given connection. A successful response will include a `call_leg_id` which can be used to correlate the command with subsequent webhooks.

`client.Calls.Dial()` — `POST /calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `From` | string (E.164) | Yes | The `from` number to be used as the caller id presented to t... |
| `ConnectionId` | string (UUID) | Yes | The ID of the Call Control App (formerly ID of the connectio... |
| `TimeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `BillingGroupId` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| ... | | | +48 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Calls.Dial(context.Background(), telnyx.CallDialParams{
		ConnectionID: "7267xxxxxxxxxxxxxx",
		From:         "+18005550101",
		To: telnyx.CallDialParamsToUnion{
			OfString: telnyx.String("+18005550100"),
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## Answer call

Answer an incoming call. You must issue this command before executing subsequent commands on an incoming call. **Expected Webhooks:**

- `call.answered`
- `streaming.started`, `streaming.stopped` or `streaming.failed` if `stream_url` was set

When the `record` parameter is set to `record-from-answer`, the response will include a `recording_id` field.

`client.Calls.Actions.Answer()` — `POST /calls/{call_control_id}/actions/answer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `BillingGroupId` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `WebhookUrl` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +26 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Calls.Actions.Answer(
		context.Background(),
		"call_control_id",
		telnyx.CallActionAnswerParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.recording_id, response.data.result`

## Transfer call

Transfer a call to a new destination. If the transfer is unsuccessful, a `call.hangup` webhook for the other call (Leg B) will be sent indicating that the transfer could not be completed. The original call will remain active and may be issued additional commands, potentially transferring the call to an alternate destination.

`client.Calls.Actions.Transfer()` — `POST /calls/{call_control_id}/actions/transfer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `TimeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `WebhookUrl` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +33 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Calls.Actions.Transfer(
		context.Background(),
		"call_control_id",
		telnyx.CallActionTransferParams{
			To: "+18005550100",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Hangup call

Hang up the call. **Expected Webhooks:**

- `call.hangup`
- `call.recording.saved`

`client.Calls.Actions.Hangup()` — `POST /calls/{call_control_id}/actions/hangup`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `CustomHeaders` | array[object] | No | Custom headers to be added to the SIP BYE message. |

```go
	response, err := client.Calls.Actions.Hangup(
		context.Background(),
		"call_control_id",
		telnyx.CallActionHangupParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Bridge calls

Bridge two call control calls. **Expected Webhooks:**

- `call.bridged` for Leg A
- `call.bridged` for Leg B

`client.Calls.Actions.Bridge()` — `POST /calls/{call_control_id}/actions/bridge`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | The Call Control ID of the call you want to bridge with, can... |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `VideoRoomId` | string (UUID) | No | The ID of the video room you want to bridge with, can't be u... |
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Calls.Actions.Bridge(
		context.Background(),
		"call_control_id",
		telnyx.CallActionBridgeParams{
			CallControlIDToBridgeWith: "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Reject a call

Reject an incoming call. **Expected Webhooks:**

- `call.hangup`

`client.Calls.Actions.Reject()` — `POST /calls/{call_control_id}/actions/reject`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Cause` | enum (CALL_REJECTED, USER_BUSY) | Yes | Cause for call rejection. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.Reject(
		context.Background(),
		"call_control_id",
		telnyx.CallActionRejectParams{
			Cause: telnyx.CallActionRejectParamsCauseUserBusy,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Retrieve a call status

Returns the status of a call (data is available 10 minutes after call ended).

`client.Calls.GetStatus()` — `GET /calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```go
	response, err := client.Calls.GetStatus(context.Background(), "call_control_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## List all active calls for given connection

Lists all active calls for given connection. Acceptable connections are either SIP connections with webhook_url or xml_request_url, call control or texml. Returned results are cursor paginated.

`client.Connections.ListActiveCalls()` — `GET /connections/{connection_id}/active_calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Telnyx connection id |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Connections.ListActiveCalls(
		context.Background(),
		"1293384261075731461",
		telnyx.ConnectionListActiveCallsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## List call control applications

Return a list of call control applications.

`client.CallControlApplications.List()` — `GET /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.CallControlApplications.List(context.Background(), telnyx.CallControlApplicationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a call control application

Create a call control application.

`client.CallControlApplications.New()` — `POST /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationName` | string | Yes | A user-assigned name to help manage the application. |
| `WebhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| `WebhookApiVersion` | enum (1, 2) | No | Determines which webhook format will be used, Telnyx API v1 ... |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```go
	callControlApplication, err := client.CallControlApplications.New(context.Background(), telnyx.CallControlApplicationNewParams{
		ApplicationName: "call-router",
		WebhookEventURL: "https://example.com",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", callControlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a call control application

Retrieves the details of an existing call control application.

`client.CallControlApplications.Get()` — `GET /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	callControlApplication, err := client.CallControlApplications.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", callControlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a call control application

Updates settings of an existing call control application.

`client.CallControlApplications.Update()` — `PATCH /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationName` | string | Yes | A user-assigned name to help manage the application. |
| `WebhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | Tags assigned to the Call Control Application. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```go
	callControlApplication, err := client.CallControlApplications.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.CallControlApplicationUpdateParams{
			ApplicationName: "call-router",
			WebhookEventURL: "https://example.com",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", callControlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a call control application

Deletes a call control application.

`client.CallControlApplications.Delete()` — `DELETE /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	callControlApplication, err := client.CallControlApplications.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", callControlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## SIP Refer a call

Initiate a SIP Refer on a Call Control call. You can initiate a SIP Refer at any point in the duration of a call. **Expected Webhooks:**

- `call.refer.started`
- `call.refer.completed`
- `call.refer.failed`

`client.Calls.Actions.Refer()` — `POST /calls/{call_control_id}/actions/refer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SipAddress` | string | Yes | The SIP URI to which the call will be referred to. |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `CustomHeaders` | array[object] | No | Custom headers to be added to the SIP INVITE. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Calls.Actions.Refer(
		context.Background(),
		"call_control_id",
		telnyx.CallActionReferParams{
			SipAddress: "sip:username@sip.non-telnyx-address.com",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Send SIP info

Sends SIP info from this leg. **Expected Webhooks:**

- `call.sip_info.received` (to be received on the target call leg)

`client.Calls.Actions.SendSipInfo()` — `POST /calls/{call_control_id}/actions/send_sip_info`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ContentType` | string | Yes | Content type of the INFO body. |
| `Body` | string | Yes | Content of the SIP INFO |
| `CallControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```go
	response, err := client.Calls.Actions.SendSipInfo(
		context.Background(),
		"call_control_id",
		telnyx.CallActionSendSipInfoParams{
			Body:        `{"key": "value", "numValue": 100}`,
			ContentType: "application/json",
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
| `callAnswered` | `call.answered` | Call Answered |
| `callBridged` | `call.bridged` | Call Bridged |
| `callHangup` | `call.hangup` | Call Hangup |
| `callInitiated` | `call.initiated` | Call Initiated |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
