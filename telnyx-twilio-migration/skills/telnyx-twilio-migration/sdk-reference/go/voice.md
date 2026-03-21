<!-- SDK reference: telnyx-voice-go -->

# Telnyx Voice - Go

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

response, err := client.Calls.Dial(context.Background(), telnyx.CallDialParams{
		ConnectionID: "7267xxxxxxxxxxxxxx",
		From:         "+18005550101",
		To: telnyx.CallDialParamsToUnion{
			OfString: telnyx.String("+18005550100"),
		},
	})
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
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

## Operational Caveats

- Call Control is event-driven. After `dial()` or an inbound webhook, issue follow-up commands from webhook handlers using the `call_control_id` in the event payload.
- Outbound and inbound flows are different: outbound calls start with `dial()`, while inbound calls must be answered from the incoming webhook before other commands run.
- A publicly reachable webhook endpoint is required for real call control. Without it, calls may connect but your application cannot drive the live call state.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Dial an outbound call

Primary voice entrypoint. Agents need the async call-control identifiers returned here.

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

Primary response fields:
- `response.Data.CallControlID`
- `response.Data.CallLegID`
- `response.Data.CallSessionID`
- `response.Data.IsAlive`
- `response.Data.RecordingID`
- `response.Data.CallDuration`

### Answer an inbound call

Primary inbound call-control command.

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

Primary response fields:
- `response.Data.Result`
- `response.Data.RecordingID`

### Transfer a live call

Common post-answer control path with downstream webhook implications.

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

Primary response fields:
- `response.Data.Result`

---

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

## Webhooks

These webhook payload fields are inline because they are part of the primary integration path.

### Call Answered

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.answered | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook ev... |

### Call Hangup

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.hangup | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook ev... |

### Call Initiated

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

If you need webhook fields that are not listed inline here, read [the webhook payload reference](references/api-details.md#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Hangup call

End a live call from your webhook-driven control flow.

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

Primary response fields:
- `response.Data.Result`

### Bridge calls

Trigger a follow-up action in an existing workflow rather than creating a new top-level resource.

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

Primary response fields:
- `response.Data.Result`

### Reject a call

Trigger a follow-up action in an existing workflow rather than creating a new top-level resource.

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

Primary response fields:
- `response.Data.Result`

### Retrieve a call status

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Primary response fields:
- `response.Data.CallControlID`
- `response.Data.CallDuration`
- `response.Data.CallLegID`
- `response.Data.CallSessionID`
- `response.Data.ClientState`
- `response.Data.EndTime`

### List all active calls for given connection

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `CallControlID`
- `CallDuration`
- `CallLegID`
- `CallSessionID`
- `ClientState`
- `RecordType`

### List call control applications

Inspect available resources or choose an existing resource before mutating it.

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

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `ID`
- `CreatedAt`
- `UpdatedAt`
- `Active`
- `AnchorsiteOverride`
- `ApplicationName`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a call control application | `client.CallControlApplications.New()` | `POST /call_control_applications` | Create or provision an additional resource when the core tasks do not cover this flow. | `ApplicationName`, `WebhookEventUrl` |
| Retrieve a call control application | `client.CallControlApplications.Get()` | `GET /call_control_applications/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Update a call control application | `client.CallControlApplications.Update()` | `PATCH /call_control_applications/{id}` | Modify an existing resource without recreating it. | `ApplicationName`, `WebhookEventUrl`, `Id` |
| Delete a call control application | `client.CallControlApplications.Delete()` | `DELETE /call_control_applications/{id}` | Remove, detach, or clean up an existing resource. | `Id` |
| SIP Refer a call | `client.Calls.Actions.Refer()` | `POST /calls/{call_control_id}/actions/refer` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `SipAddress`, `CallControlId` |
| Send SIP info | `client.Calls.Actions.SendSipInfo()` | `POST /calls/{call_control_id}/actions/send_sip_info` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `ContentType`, `Body`, `CallControlId` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `callBridged` | `call.bridged` | Call Bridged |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
