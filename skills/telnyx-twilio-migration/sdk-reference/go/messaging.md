<!-- SDK reference: telnyx-messaging-go -->

# Telnyx Messaging - Go

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

response, err := client.Messages.Send(context.Background(), telnyx.MessageSendParams{
		To: "+18445550001",
		From: "+18005550101",
		Text: "Hello from Telnyx!",
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

- The sending number must already be assigned to the correct messaging profile before you send traffic from it.
- US A2P long-code traffic must complete 10DLC registration before production sending or carriers will block or heavily filter messages.
- Delivery webhooks are asynchronous. Treat the send response as acceptance of the request, not final carrier delivery.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Send an SMS

Primary outbound messaging flow. Agents need exact request fields and delivery-related response fields.

`client.Messages.Send()` — `POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `From` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `Text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `MessagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in the API Details section below |

```go
	response, err := client.Messages.Send(context.Background(), telnyx.MessageSendParams{
		To: "+18445550001",
		From: "+18005550101",
		Text: "Hello from Telnyx!",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Text`
- `response.Data.SentAt`
- `response.Data.Errors`

### Send an SMS with an alphanumeric sender ID

Common sender variant that requires different request shape.

`client.Messages.SendWithAlphanumericSender()` — `POST /messages/alphanumeric_sender_id`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | A valid alphanumeric sender ID on the user's account. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `Text` | string | Yes | The message body. |
| `MessagingProfileId` | string (UUID) | Yes | The messaging profile ID to use. |
| `WebhookUrl` | string (URL) | No | Callback URL for delivery status updates. |
| `WebhookFailoverUrl` | string (URL) | No | Failover callback URL for delivery status updates. |
| `UseProfileWebhooks` | boolean | No | If true, use the messaging profile's webhook settings. |

```go
	response, err := client.Messages.SendWithAlphanumericSender(context.Background(), telnyx.MessageSendWithAlphanumericSenderParams{
		From:               "MyCompany",
		MessagingProfileID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		Text: "Hello from Telnyx!",
		To: "+13125550001",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Text`
- `response.Data.SentAt`
- `response.Data.Errors`

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

### Delivery Update

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.sent, message.finalized | The type of event being delivered. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.to` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.cost` | object \| null |  |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirm... |

### Inbound Message

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.received | The type of event being delivered. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.direction` | enum: inbound | The direction of the message. |
| `data.payload.to` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.media` | array[object] |  |
| `data.record_type` | enum: event | Identifies the type of the resource. |

If you need webhook fields that are not listed inline here, read [the webhook payload reference](references/api-details.md#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Send a group MMS message

Send one MMS payload to multiple recipients.

`client.Messages.SendGroupMms()` — `POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `To` | array[object] | Yes | A list of destinations. |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in the API Details section below |

```go
	response, err := client.Messages.SendGroupMms(context.Background(), telnyx.MessageSendGroupMmsParams{
		From: "+13125551234",
		To:   []string{"+18655551234", "+14155551234"},
		Text: "Hello from Telnyx!",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Type`
- `response.Data.Direction`
- `response.Data.Text`

### Send a long code message

Force a long-code sending path instead of the generic send endpoint.

`client.Messages.SendLongCode()` — `POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```go
	response, err := client.Messages.SendLongCode(context.Background(), telnyx.MessageSendLongCodeParams{
		From: "+18445550001",
		To:   "+13125550002",
		Text: "Hello from Telnyx!",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Type`
- `response.Data.Direction`
- `response.Data.Text`

### Send a message using number pool

Let a messaging profile or number pool choose the sender for you.

`client.Messages.SendNumberPool()` — `POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```go
	response, err := client.Messages.SendNumberPool(context.Background(), telnyx.MessageSendNumberPoolParams{
		MessagingProfileID: "abc85f64-5717-4562-b3fc-2c9600000000",
		To:                 "+13125550002",
		Text: "Hello from Telnyx!",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Type`
- `response.Data.Direction`
- `response.Data.Text`

### Send a short code message

Force a short-code sending path when the sender must be a short code.

`client.Messages.SendShortCode()` — `POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```go
	response, err := client.Messages.SendShortCode(context.Background(), telnyx.MessageSendShortCodeParams{
		From: "+18445550001",
		To:   "+18445550001",
		Text: "Hello from Telnyx!",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Type`
- `response.Data.Direction`
- `response.Data.Text`

### Schedule a message

Queue a message for future delivery instead of sending immediately.

`client.Messages.Schedule()` — `POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MessagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in the API Details section below |

```go
	response, err := client.Messages.Schedule(context.Background(), telnyx.MessageScheduleParams{
		To: "+18445550001",
		From: "+18005550101",
		Text: "Appointment reminder",
		SendAt: "2025-07-01T15:00:00Z",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Type`
- `response.Data.Direction`
- `response.Data.Text`

### Send a WhatsApp message

Send WhatsApp traffic instead of SMS/MMS.

`client.Messages.SendWhatsapp()` — `POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number in +E.164 format associated with Whatsapp accou... |
| `To` | string (E.164) | Yes | Phone number in +E.164 format |
| `WhatsappMessage` | object | Yes |  |
| `Type` | enum (WHATSAPP) | No | Message type - must be set to "WHATSAPP" |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |

```go
	response, err := client.Messages.SendWhatsapp(context.Background(), telnyx.MessageSendWhatsappParams{
		From:            "+13125551234",
		To:              "+13125551234",
		WhatsappMessage: telnyx.WhatsappMessageContentParam{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Primary response fields:
- `response.Data.ID`
- `response.Data.To`
- `response.Data.From`
- `response.Data.Type`
- `response.Data.Direction`
- `response.Data.Body`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Retrieve a message | `client.Messages.Get()` | `GET /messages/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Cancel a scheduled message | `client.Messages.CancelScheduled()` | `DELETE /messages/{id}` | Remove, detach, or clean up an existing resource. | `Id` |
| List alphanumeric sender IDs | `client.AlphanumericSenderIDs.List()` | `GET /alphanumeric_sender_ids` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an alphanumeric sender ID | `client.AlphanumericSenderIDs.New()` | `POST /alphanumeric_sender_ids` | Create or provision an additional resource when the core tasks do not cover this flow. | `AlphanumericSenderId`, `MessagingProfileId` |
| Retrieve an alphanumeric sender ID | `client.AlphanumericSenderIDs.Get()` | `GET /alphanumeric_sender_ids/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Delete an alphanumeric sender ID | `client.AlphanumericSenderIDs.Delete()` | `DELETE /alphanumeric_sender_ids/{id}` | Remove, detach, or clean up an existing resource. | `Id` |
| Retrieve group MMS messages | `client.Messages.GetGroupMessages()` | `GET /messages/group/{message_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `MessageId` |
| List messaging hosted numbers | `client.MessagingHostedNumbers.List()` | `GET /messaging_hosted_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a messaging hosted number | `client.MessagingHostedNumbers.Get()` | `GET /messaging_hosted_numbers/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Update a messaging hosted number | `client.MessagingHostedNumbers.Update()` | `PATCH /messaging_hosted_numbers/{id}` | Modify an existing resource without recreating it. | `Id` |
| List opt-outs | `client.MessagingOptouts.List()` | `GET /messaging_optouts` | Inspect available resources or choose an existing resource before mutating it. | None |
| List high-level messaging profile metrics | `client.MessagingProfileMetrics.List()` | `GET /messaging_profile_metrics` | Inspect available resources or choose an existing resource before mutating it. | None |
| Regenerate messaging profile secret | `client.MessagingProfiles.Actions.RegenerateSecret()` | `POST /messaging_profiles/{id}/actions/regenerate_secret` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `Id` |
| List alphanumeric sender IDs for a messaging profile | `client.MessagingProfiles.ListAlphanumericSenderIDs()` | `GET /messaging_profiles/{id}/alphanumeric_sender_ids` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Get detailed messaging profile metrics | `client.MessagingProfiles.GetMetrics()` | `GET /messaging_profiles/{id}/metrics` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| List Auto-Response Settings | `client.MessagingProfiles.AutorespConfigs.List()` | `GET /messaging_profiles/{profile_id}/autoresp_configs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `ProfileId` |
| Create auto-response setting | `client.MessagingProfiles.AutorespConfigs.New()` | `POST /messaging_profiles/{profile_id}/autoresp_configs` | Create or provision an additional resource when the core tasks do not cover this flow. | `Op`, `Keywords`, `CountryCode`, `ProfileId` |
| Get Auto-Response Setting | `client.MessagingProfiles.AutorespConfigs.Get()` | `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `ProfileId`, `AutorespCfgId` |
| Update Auto-Response Setting | `client.MessagingProfiles.AutorespConfigs.Update()` | `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Modify an existing resource without recreating it. | `Op`, `Keywords`, `CountryCode`, `ProfileId`, +1 more |
| Delete Auto-Response Setting | `client.MessagingProfiles.AutorespConfigs.Delete()` | `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Remove, detach, or clean up an existing resource. | `ProfileId`, `AutorespCfgId` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
