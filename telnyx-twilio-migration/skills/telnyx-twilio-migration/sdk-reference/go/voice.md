<!-- SDK reference: telnyx-voice-go -->

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +48 optional params in the API Details section below |

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
| ... | | | +26 optional params in the API Details section below |

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
| ... | | | +33 optional params in the API Details section below |

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
| ... | | | +16 optional params in the API Details section below |

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
| ... | | | +9 optional params in the API Details section below |

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
| ... | | | +10 optional params in the API Details section below |

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
| ... | | | +3 optional params in the API Details section below |

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

Webhook payload field definitions are in the API Details section below.

---

# Voice (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List call control applications, Create a call control application, Retrieve a call control application, Update a call control application, Delete a call control application

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, Chennai, IN, Amsterdam, Netherlands, Toronto, Canada, Sydney, Australia |
| `application_name` | string |
| `call_cost_in_webhooks` | boolean |
| `created_at` | string |
| `dtmf_type` | enum: RFC 2833, Inband, SIP INFO |
| `first_command_timeout` | boolean |
| `first_command_timeout_secs` | integer |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | enum: call_control_application |
| `redact_dtmf_debug_logging` | boolean |
| `tags` | array[string] |
| `updated_at` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | url |
| `webhook_event_url` | url |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** Dial

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_duration` | integer |
| `call_leg_id` | string |
| `call_session_id` | string |
| `client_state` | string |
| `end_time` | string |
| `is_alive` | boolean |
| `record_type` | enum: call |
| `recording_id` | uuid |
| `start_time` | string |

**Returned by:** Retrieve a call status

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_duration` | integer |
| `call_leg_id` | string |
| `call_session_id` | string |
| `client_state` | string |
| `end_time` | string |
| `is_alive` | boolean |
| `record_type` | enum: call |
| `start_time` | string |

**Returned by:** Answer call

| Field | Type |
|-------|------|
| `recording_id` | uuid |
| `result` | string |

**Returned by:** Bridge calls, Hangup call, SIP Refer a call, Reject a call, Send SIP info, Transfer call

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** List all active calls for given connection

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_duration` | integer |
| `call_leg_id` | string |
| `call_session_id` | string |
| `client_state` | string |
| `record_type` | enum: call |

## Optional Parameters

### Create a call control application — `client.CallControlApplications.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Specifies whether the connection can be used. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `FirstCommandTimeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `FirstCommandTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this Call Control Applicat... |
| `RedactDtmfDebugLogging` | boolean | When enabled, DTMF digits entered by users will be redacted in debug logs to ... |

### Update a call control application — `client.CallControlApplications.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this Call Control Applicat... |
| `Active` | boolean | Specifies whether the connection can be used. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `FirstCommandTimeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `FirstCommandTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `Tags` | array[string] | Tags assigned to the Call Control Application. |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `RedactDtmfDebugLogging` | boolean | When enabled, DTMF digits entered by users will be redacted in debug logs to ... |

### Dial — `client.Calls.Dial()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `FromDisplayName` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `AudioUrl` | string (URL) | The URL of a file to be played back to the callee when the call is answered. |
| `MediaName` | string | The media_name of a file to be played back to the callee when the call is ans... |
| `PreferredCodecs` | string | The list of comma-separated codecs in a preferred order for the forked media ... |
| `TimeoutSecs` | integer | The number of seconds that Telnyx will wait for the call to be answered by th... |
| `TimeLimitSecs` | integer | Sets the maximum duration of a Call Control Leg in seconds. |
| `AnsweringMachineDetection` | enum (premium, detect, detect_beep, detect_words, greeting_end, ...) | Enables Answering Machine Detection. |
| `AnsweringMachineDetectionConfig` | object | Optional configuration parameters to modify 'answering_machine_detection' per... |
| `ConferenceConfig` | object | Optional configuration parameters to dial new participant into a conference. |
| `CustomHeaders` | array[object] | Custom headers to be added to the SIP INVITE. |
| `BillingGroupId` | string (UUID) | Use this field to set the Billing Group ID for the call. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `LinkTo` | string | Use another call's control id for sharing the same call session id |
| `BridgeIntent` | boolean | Indicates the intent to bridge this call with the call specified in link_to. |
| `BridgeOnAnswer` | boolean | Whether to automatically bridge answered call to the call specified in link_to. |
| `PreventDoubleBridge` | boolean | Prevents bridging and hangs up the call if the target is already bridged. |
| `ParkAfterUnbridge` | string | If supplied with the value `self`, the current leg will be parked after unbri... |
| `MediaEncryption` | enum (disabled, SRTP, DTLS) | Defines whether media should be encrypted on the call. |
| `SipAuthUsername` | string | SIP Authentication username used for SIP challenges. |
| `SipAuthPassword` | string | SIP Authentication password used for SIP challenges. |
| `SipHeaders` | array[object] | SIP headers to be added to the SIP INVITE request. |
| `SipTransportProtocol` | enum (UDP, TCP, TLS) | Defines SIP transport protocol to be used on the call. |
| `SoundModifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `StreamUrl` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `StreamTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `StreamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `StreamBidirectionalMode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `StreamBidirectionalCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `StreamBidirectionalTargetLegs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `StreamBidirectionalSamplingRate` | enum (8000, 16000, 22050, 24000, 48000) | Audio sampling rate. |
| `StreamEstablishBeforeCallOriginate` | boolean | Establish websocket connection before dialing the destination. |
| `SendSilenceWhenIdle` | boolean | Generate silence RTP packets when no transmission available. |
| `WebhookUrl` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `WebhookUrlMethod` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `Record` | enum (record-from-answer) | Start recording automatically after an event. |
| `RecordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `RecordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `RecordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `RecordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `RecordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `RecordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `RecordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `SuperviseCallControlId` | string (UUID) | The call leg which will be supervised by the new call. |
| `SupervisorRole` | enum (barge, whisper, monitor) | The role of the supervisor call. |
| `EnableDialogflow` | boolean | Enables Dialogflow for the current call. |
| `DialogflowConfig` | object |  |
| `Transcription` | boolean | Enable transcription upon call answer. |
| `TranscriptionConfig` | object |  |
| `SipRegion` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `StreamAuthToken` | string | An authentication token to be sent as part of the WebSocket connection when u... |

### Answer call — `client.Calls.Actions.Answer()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `BillingGroupId` | string (UUID) | Use this field to set the Billing Group ID for the call. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `CustomHeaders` | array[object] | Custom headers to be added to the SIP INVITE response. |
| `PreferredCodecs` | enum (G722,PCMU,PCMA,G729,OPUS,VP8,H264) | The list of comma-separated codecs in a preferred order for the forked media ... |
| `SipHeaders` | array[object] | SIP headers to be added to the SIP INVITE response. |
| `SoundModifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `StreamUrl` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `StreamTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `StreamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `StreamBidirectionalMode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `StreamBidirectionalCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `StreamBidirectionalTargetLegs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `SendSilenceWhenIdle` | boolean | Generate silence RTP packets when no transmission available. |
| `WebhookUrl` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `WebhookUrlMethod` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `Transcription` | boolean | Enable transcription upon call answer. |
| `TranscriptionConfig` | object |  |
| `Record` | enum (record-from-answer) | Start recording automatically after an event. |
| `RecordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `RecordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `RecordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `RecordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `RecordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `RecordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `RecordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `WebhookUrls` | object | A map of event types to webhook URLs. |
| `WebhookUrlsMethod` | enum (POST, GET) | HTTP request method to invoke `webhook_urls`. |
| `WebhookRetriesPolicies` | object | A map of event types to retry policies. |

### Bridge calls — `client.Calls.Actions.Bridge()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `Queue` | string | The name of the queue you want to bridge with, can't be used together with ca... |
| `VideoRoomId` | string (UUID) | The ID of the video room you want to bridge with, can't be used together with... |
| `VideoRoomContext` | string | The additional parameter that will be passed to the video conference. |
| `PreventDoubleBridge` | boolean | When set to `true`, it prevents bridging if the target call is already bridge... |
| `ParkAfterUnbridge` | string | Specifies behavior after the bridge ends (i.e. |
| `PlayRingtone` | boolean | Specifies whether to play a ringtone if the call you want to bridge with has ... |
| `Ringtone` | enum (at, au, be, bg, br, ...) | Specifies which country ringtone to play when `play_ringtone` is set to `true`. |
| `Record` | enum (record-from-answer) | Start recording automatically after an event. |
| `RecordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `RecordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `RecordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `RecordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `RecordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `RecordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `RecordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `MuteDtmf` | enum (none, both, self, opposite) | When enabled, DTMF tones are not passed to the call participant. |
| `HoldAfterUnbridge` | boolean | Specifies behavior after the bridge ends. |

### Hangup call — `client.Calls.Actions.Hangup()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `CustomHeaders` | array[object] | Custom headers to be added to the SIP BYE message. |

### SIP Refer a call — `client.Calls.Actions.Refer()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `CustomHeaders` | array[object] | Custom headers to be added to the SIP INVITE. |
| `SipAuthUsername` | string | SIP Authentication username used for SIP challenges. |
| `SipAuthPassword` | string | SIP Authentication password used for SIP challenges. |
| `SipHeaders` | array[object] | SIP headers to be added to the request. |

### Reject a call — `client.Calls.Actions.Reject()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Send SIP info — `client.Calls.Actions.SendSipInfo()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Transfer call — `client.Calls.Actions.Transfer()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `From` | string (E.164) | The `from` number to be used as the caller id presented to the destination (`... |
| `FromDisplayName` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `AudioUrl` | string (URL) | The URL of a file to be played back when the transfer destination answers bef... |
| `EarlyMedia` | boolean | If set to false, early media will not be passed to the originating leg. |
| `MediaName` | string | The media_name of a file to be played back when the transfer destination answ... |
| `TimeoutSecs` | integer | The number of seconds that Telnyx will wait for the call to be answered by th... |
| `TimeLimitSecs` | integer | Sets the maximum duration of a Call Control Leg in seconds. |
| `ParkAfterUnbridge` | string | Specifies behavior after the bridge ends (i.e. |
| `AnsweringMachineDetection` | enum (premium, detect, detect_beep, detect_words, greeting_end, ...) | Enables Answering Machine Detection. |
| `AnsweringMachineDetectionConfig` | object | Optional configuration parameters to modify 'answering_machine_detection' per... |
| `CustomHeaders` | array[object] | Custom headers to be added to the SIP INVITE. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `TargetLegClientState` | string | Use this field to add state to every subsequent webhook for the new leg. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `MediaEncryption` | enum (disabled, SRTP, DTLS) | Defines whether media should be encrypted on the new call leg. |
| `SipAuthUsername` | string | SIP Authentication username used for SIP challenges. |
| `SipAuthPassword` | string | SIP Authentication password used for SIP challenges. |
| `SipHeaders` | array[object] | SIP headers to be added to the SIP INVITE. |
| `SipTransportProtocol` | enum (UDP, TCP, TLS) | Defines SIP transport protocol to be used on the call. |
| `SoundModifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `WebhookUrl` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `WebhookUrlMethod` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `MuteDtmf` | enum (none, both, self, opposite) | When enabled, DTMF tones are not passed to the call participant. |
| `Record` | enum (record-from-answer) | Start recording automatically after an event. |
| `RecordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `RecordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `RecordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `RecordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `RecordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `RecordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `RecordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `SipRegion` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `PreferredCodecs` | string | The list of comma-separated codecs in order of preference to be used during t... |
| `WebhookUrls` | object | A map of event types to webhook URLs. |
| `WebhookUrlsMethod` | enum (POST, GET) | HTTP request method to invoke `webhook_urls`. |
| `WebhookRetriesPolicies` | object | A map of event types to retry policies. |

## Webhook Payload Fields

### `callAnswered`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.answered | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.custom_headers` | array[object] | Custom headers set on answer command |
| `data.payload.sip_headers` | array[object] | User-to-User and Diversion headers from sip invite. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.state` | enum: answered | State received from a command. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |

### `callBridged`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.bridged | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

### `callHangup`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.hangup | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.custom_headers` | array[object] | Custom headers set on answer command |
| `data.payload.sip_headers` | array[object] | User-to-User and Diversion headers from sip invite. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.state` | enum: hangup | State received from a command. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |
| `data.payload.hangup_cause` | enum: call_rejected, normal_clearing, originator_cancel, timeout, time_limit, user_busy, not_found, no_answer, unspecified | The reason the call was ended (`call_rejected`, `normal_clearing`, `originator_cancel`, `timeout`, `time_limit`, `use... |
| `data.payload.hangup_source` | enum: caller, callee, unknown | The party who ended the call (`callee`, `caller`, `unknown`). |
| `data.payload.sip_hangup_cause` | string | The reason the call was ended (SIP response code). |
| `data.payload.call_quality_stats` | object \| null | Call quality statistics aggregated from the CHANNEL_HANGUP_COMPLETE event. |

### `callInitiated`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.initiated | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.connection_codecs` | string | The list of comma-separated codecs enabled for the connection. |
| `data.payload.offered_codecs` | string | The list of comma-separated codecs offered by caller. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.custom_headers` | array[object] | Custom headers from sip invite |
| `data.payload.sip_headers` | array[object] | User-to-User and Diversion headers from sip invite. |
| `data.payload.shaken_stir_attestation` | string | SHAKEN/STIR attestation level. |
| `data.payload.shaken_stir_validated` | boolean | Whether attestation was successfully validated or not. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.caller_id_name` | string | Caller id. |
| `data.payload.call_screening_result` | string | Call screening result. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.direction` | enum: incoming, outgoing | Whether the call is `incoming` or `outgoing`. |
| `data.payload.state` | enum: parked, bridging | State received from a command. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |

### Field Type Notes

- `from` in webhook payloads: string (E.164 phone number)
- `to` in webhook payloads: string (E.164 phone number)
- The return value of `client.webhooks.unwrap()` is a parsed event object — access fields via `event.data.event_type`, `event.data.payload.call_control_id`, etc.
