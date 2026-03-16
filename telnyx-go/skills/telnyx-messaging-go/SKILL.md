---
name: telnyx-messaging-go
description: >-
  Send and receive SMS/MMS, handle opt-outs and delivery webhooks. Use for
  notifications, 2FA, or messaging apps.
metadata:
  author: telnyx
  product: messaging
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging - Go

## Core Workflow

### Prerequisites

1. Buy a phone number (see telnyx-numbers-go)
2. Create a messaging profile and configure webhook URL (see telnyx-messaging-profiles-go)
3. Assign the phone number to the messaging profile
4. For US A2P via long code: complete 10DLC registration — brand, campaign, number assignment (see telnyx-10dlc-go)
5. For toll-free: complete toll-free verification

### Steps

1. **Search & buy number**: `client.AvailablePhoneNumbers.List(ctx, params)`
2. **Create messaging profile**: `client.MessagingProfiles.Create(ctx, params)`
3. **Assign number to profile**: `client.PhoneNumbers.Messaging.Update(ctx, params)`
4. **Send SMS**: `client.Messages.Send(ctx, params)`
5. **Send MMS**: `client.Messages.Send(ctx, params)`

### Common mistakes

- NEVER send without assigning the number to a messaging profile — the from number will be rejected
- NEVER send US A2P traffic via long code without 10DLC registration — messages silently blocked by carriers
- NEVER use non-E.164 phone numbers — must be +[country code][number] with no spaces or dashes
- NEVER assume delivery receipt = delivery — some carriers never return delivery receipts
- For MMS: pass media_urls: ["https://..."] — URLs must be publicly accessible HTTPS (max 1 MB per file, 10 attachments, 2 MB total). type is auto-detected when media_urls is present

**Related skills**: telnyx-messaging-profiles-go, telnyx-10dlc-go, telnyx-numbers-go

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

result, err := client.Messages.Send(ctx, params)
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

## Send a message

Send a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to send a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`client.Messages.Send()` — `POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `From` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `Text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `MessagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a message using an alphanumeric sender ID

Send an SMS message using an alphanumeric sender ID. This is SMS only.

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a group MMS message

`client.Messages.SendGroupMms()` — `POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `To` | array[object] | Yes | A list of destinations. |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a long code message

`client.Messages.SendLongCode()` — `POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a message using number pool

`client.Messages.SendNumberPool()` — `POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a short code message

`client.Messages.SendShortCode()` — `POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Schedule a message

Schedule a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to schedule a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`client.Messages.Schedule()` — `POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `To` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `MessagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `MediaUrls` | array[string] | No | A list of media URLs. |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a WhatsApp message

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Retrieve a message

Note: This API endpoint can only retrieve messages that are no older than 10 days since their creation. If you require messages older than this, please generate an [MDR report.](https://developers.telnyx.com/api-reference/mdr-usage-reports/create-mdr-usage-report)

`client.Messages.Get()` — `GET /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the message |

```go
	message, err := client.Messages.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", message.Data)
```

Key response fields: `response.data.data`

## Cancel a scheduled message

Cancel a scheduled message that has not yet been sent. Only messages with `status=scheduled` and `send_at` more than a minute from now can be cancelled.

`client.Messages.CancelScheduled()` — `DELETE /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the message to cancel |

```go
	response, err := client.Messages.CancelScheduled(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.ID)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## List alphanumeric sender IDs

List all alphanumeric sender IDs for the authenticated user.

`client.AlphanumericSenderIDs.List()` — `GET /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter[messagingProfileId]` | string (UUID) | No | Filter by messaging profile ID. |
| `Page[number]` | integer | No | Page number. |
| `Page[size]` | integer | No | Page size. |

```go
	page, err := client.AlphanumericSenderIDs.List(context.Background(), telnyx.AlphanumericSenderIDListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Create an alphanumeric sender ID

Create a new alphanumeric sender ID associated with a messaging profile.

`client.AlphanumericSenderIDs.New()` — `POST /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AlphanumericSenderId` | string (UUID) | Yes | The alphanumeric sender ID string. |
| `MessagingProfileId` | string (UUID) | Yes | The messaging profile to associate the sender ID with. |
| `UsLongCodeFallback` | string | No | A US long code number to use as fallback when sending to US ... |

```go
	alphanumericSenderID, err := client.AlphanumericSenderIDs.New(context.Background(), telnyx.AlphanumericSenderIDNewParams{
		AlphanumericSenderID: "MyCompany",
		MessagingProfileID:   "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", alphanumericSenderID.Data)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Retrieve an alphanumeric sender ID

Retrieve a specific alphanumeric sender ID.

`client.AlphanumericSenderIDs.Get()` — `GET /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```go
	alphanumericSenderID, err := client.AlphanumericSenderIDs.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", alphanumericSenderID.Data)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Delete an alphanumeric sender ID

Delete an alphanumeric sender ID and disassociate it from its messaging profile.

`client.AlphanumericSenderIDs.Delete()` — `DELETE /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```go
	alphanumericSenderID, err := client.AlphanumericSenderIDs.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", alphanumericSenderID.Data)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Retrieve group MMS messages

Retrieve all messages in a group MMS conversation by the group message ID.

`client.Messages.GetGroupMessages()` — `GET /messages/group/{message_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessageId` | string (UUID) | Yes | The group message ID. |

```go
	response, err := client.Messages.GetGroupMessages(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## List messaging hosted numbers

List all hosted numbers associated with the authenticated user.

`client.MessagingHostedNumbers.List()` — `GET /messaging_hosted_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort[phoneNumber]` | enum (asc, desc) | No | Sort by phone number. |
| `Filter[messagingProfileId]` | string (UUID) | No | Filter by messaging profile ID. |
| `Filter[phoneNumber]` | string | No | Filter by exact phone number. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.MessagingHostedNumbers.List(context.Background(), telnyx.MessagingHostedNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a messaging hosted number

Retrieve a specific messaging hosted number by its ID or phone number.

`client.MessagingHostedNumbers.Get()` — `GET /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID or phone number of the hosted number. |

```go
	messagingHostedNumber, err := client.MessagingHostedNumbers.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingHostedNumber.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update a messaging hosted number

Update the messaging settings for a hosted number.

`client.MessagingHostedNumbers.Update()` — `PATCH /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID or phone number of the hosted number. |
| `MessagingProfileId` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `Tags` | array[string] | No | Tags to set on this phone number. |
| `MessagingProduct` | string | No | Configure the messaging product for this number:

* Omit thi... |

```go
	messagingHostedNumber, err := client.MessagingHostedNumbers.Update(
		context.Background(),
		"id",
		telnyx.MessagingHostedNumberUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingHostedNumber.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List opt-outs

Retrieve a list of opt-out blocks.

`client.MessagingOptouts.List()` — `GET /messaging_optouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RedactionEnabled` | string | No | If receiving address (+E.164 formatted phone number) should ... |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.MessagingOptouts.List(context.Background(), telnyx.MessagingOptoutListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.to, response.data.from, response.data.messaging_profile_id`

## List high-level messaging profile metrics

List high-level metrics for all messaging profiles belonging to the authenticated user.

`client.MessagingProfileMetrics.List()` — `GET /messaging_profile_metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TimeFrame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```go
	messagingProfileMetrics, err := client.MessagingProfileMetrics.List(context.Background(), telnyx.MessagingProfileMetricListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingProfileMetrics.Data)
```

Key response fields: `response.data.data, response.data.meta`

## Regenerate messaging profile secret

Regenerate the v1 secret for a messaging profile.

`client.MessagingProfiles.Actions.RegenerateSecret()` — `POST /messaging_profiles/{id}/actions/regenerate_secret`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The identifier of the messaging profile. |

```go
	response, err := client.MessagingProfiles.Actions.RegenerateSecret(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List alphanumeric sender IDs for a messaging profile

List all alphanumeric sender IDs associated with a specific messaging profile.

`client.MessagingProfiles.ListAlphanumericSenderIDs()` — `GET /messaging_profiles/{id}/alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `Page[number]` | integer | No |  |
| `Page[size]` | integer | No |  |

```go
	page, err := client.MessagingProfiles.ListAlphanumericSenderIDs(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileListAlphanumericSenderIDsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Get detailed messaging profile metrics

Get detailed metrics for a specific messaging profile, broken down by time interval.

`client.MessagingProfiles.GetMetrics()` — `GET /messaging_profiles/{id}/metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `TimeFrame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```go
	response, err := client.MessagingProfiles.GetMetrics(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileGetMetricsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.data`

## List Auto-Response Settings

`client.MessagingProfiles.AutorespConfigs.List()` — `GET /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ProfileId` | string (UUID) | Yes |  |
| `CountryCode` | string (ISO 3166-1 alpha-2) | No |  |
| `CreatedAt` | object | No | Consolidated created_at parameter (deepObject style). |
| `UpdatedAt` | object | No | Consolidated updated_at parameter (deepObject style). |

```go
	autorespConfigs, err := client.MessagingProfiles.AutorespConfigs.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileAutorespConfigListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autorespConfigs.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create auto-response setting

`client.MessagingProfiles.AutorespConfigs.New()` — `POST /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Op` | enum (start, stop, info) | Yes |  |
| `Keywords` | array[string] | Yes |  |
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes |  |
| `ProfileId` | string (UUID) | Yes |  |
| `RespText` | string | No |  |

```go
	autoRespConfigResponse, err := client.MessagingProfiles.AutorespConfigs.New(
		context.Background(),
		"profile_id",
		telnyx.MessagingProfileAutorespConfigNewParams{
			AutoRespConfigCreate: telnyx.AutoRespConfigCreateParam{
				CountryCode: "US",
				Keywords:    []string{"keyword1", "keyword2"},
				Op:          telnyx.AutoRespConfigCreateOpStart,
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autoRespConfigResponse.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get Auto-Response Setting

`client.MessagingProfiles.AutorespConfigs.Get()` — `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ProfileId` | string (UUID) | Yes |  |
| `AutorespCfgId` | string (UUID) | Yes |  |

```go
	autoRespConfigResponse, err := client.MessagingProfiles.AutorespConfigs.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileAutorespConfigGetParams{
			ProfileID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autoRespConfigResponse.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update Auto-Response Setting

`client.MessagingProfiles.AutorespConfigs.Update()` — `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Op` | enum (start, stop, info) | Yes |  |
| `Keywords` | array[string] | Yes |  |
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes |  |
| `ProfileId` | string (UUID) | Yes |  |
| `AutorespCfgId` | string (UUID) | Yes |  |
| `RespText` | string | No |  |

```go
	autoRespConfigResponse, err := client.MessagingProfiles.AutorespConfigs.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileAutorespConfigUpdateParams{
			ProfileID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			AutoRespConfigCreate: telnyx.AutoRespConfigCreateParam{
				CountryCode: "US",
				Keywords:    []string{"keyword1", "keyword2"},
				Op:          telnyx.AutoRespConfigCreateOpStart,
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autoRespConfigResponse.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete Auto-Response Setting

`client.MessagingProfiles.AutorespConfigs.Delete()` — `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ProfileId` | string (UUID) | Yes |  |
| `AutorespCfgId` | string (UUID) | Yes |  |

```go
	autorespConfig, err := client.MessagingProfiles.AutorespConfigs.Delete(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileAutorespConfigDeleteParams{
			ProfileID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autorespConfig)
```

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
| `deliveryUpdate` | `message.finalized` | Delivery Update |
| `inboundMessage` | `message.received` | Inbound Message |
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
