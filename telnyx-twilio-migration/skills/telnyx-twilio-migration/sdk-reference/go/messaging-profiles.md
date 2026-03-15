<!-- SDK reference: telnyx-messaging-profiles-go -->

# Telnyx Messaging Profiles - Go

## Core Workflow

### Prerequisites

1. Buy phone number(s) to assign to the profile (see telnyx-numbers-go)

### Steps

1. **Create profile**: `client.MessagingProfiles.Create(ctx, params)`
2. **Configure webhooks**: `client.MessagingProfiles.Update(ctx, params)`
3. **Assign numbers**: `client.PhoneNumbers.Messaging.Update(ctx, params)`
4. **(Optional) Enable number pool**: `client.MessagingProfiles.Update(ctx, params)`

### Common mistakes

- NEVER omit whitelisted_destinations — messages fail if the destination country is not whitelisted
- NEVER send messages with a disabled messaging profile — error 40312
- NEVER forget to assign numbers to the profile — the from number will be rejected
- Number pool requires number_pool_settings to be set AND multiple numbers assigned
- Setting messaging_profile_id to empty string unassigns the number — use null/omit to keep current value

**Related skills**: telnyx-messaging-go, telnyx-numbers-go, telnyx-10dlc-go

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

result, err := client.MessagingProfiles.Create(ctx, params)
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

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a messaging profile

`client.MessagingProfiles.New()` — `POST /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A user friendly name for the messaging profile. |
| `WhitelistedDestinations` | array[string] | Yes | Destinations to which the messaging profile is allowed to se... |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `WebhookApiVersion` | enum (1, 2, 2010-04-01) | No | Determines which webhook format will be used, Telnyx API v1,... |
| ... | | | +13 optional params in the API Details section below |

```go
	messagingProfile, err := client.MessagingProfiles.New(context.Background(), telnyx.MessagingProfileNewParams{
		Name:                    "My name",
		WhitelistedDestinations: []string{"US"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List messaging profiles

`client.MessagingProfiles.List()` — `GET /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter[name][eq]` | string | No | Filter profiles by exact name match. |
| ... | | | +1 optional params in the API Details section below |

```go
	page, err := client.MessagingProfiles.List(context.Background(), telnyx.MessagingProfileListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a messaging profile

`client.MessagingProfiles.Get()` — `GET /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```go
	messagingProfile, err := client.MessagingProfiles.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a messaging profile

`client.MessagingProfiles.Update()` — `PATCH /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `WebhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `RecordType` | enum (messaging_profile) | No | Identifies the type of the resource. |
| ... | | | +17 optional params in the API Details section below |

```go
	messagingProfile, err := client.MessagingProfiles.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List phone numbers associated with a messaging profile

`client.MessagingProfiles.ListPhoneNumbers()` — `GET /messaging_profiles/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.MessagingProfiles.ListPhoneNumbers(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileListPhoneNumbersParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Delete a messaging profile

`client.MessagingProfiles.Delete()` — `DELETE /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```go
	messagingProfile, err := client.MessagingProfiles.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List short codes associated with a messaging profile

`client.MessagingProfiles.ListShortCodes()` — `GET /messaging_profiles/{id}/short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.MessagingProfiles.ListShortCodes(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileListShortCodesParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## List short codes

`client.ShortCodes.List()` — `GET /short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ShortCodes.List(context.Background(), telnyx.ShortCodeListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Retrieve a short code

`client.ShortCodes.Get()` — `GET /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the short code |

```go
	shortCode, err := client.ShortCodes.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", shortCode.Data)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Update short code

Update the settings for a specific short code. To unbind a short code from a profile, set the `messaging_profile_id` to `null` or an empty string. To add or update tags, include the tags field as an array of strings.

`client.ShortCodes.Update()` — `PATCH /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `Id` | string (UUID) | Yes | The id of the short code |
| `Tags` | array[string] | No |  |

```go
	shortCode, err := client.ShortCodes.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ShortCodeUpdateParams{
			MessagingProfileID: "abc85f64-5717-4562-b3fc-2c9600000000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", shortCode.Data)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

---

# Messaging Profiles (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List messaging profiles, Create a messaging profile, Retrieve a messaging profile, Update a messaging profile, Delete a messaging profile

| Field | Type |
|-------|------|
| `ai_assistant_id` | string \| null |
| `alpha_sender` | string \| null |
| `created_at` | date-time |
| `daily_spend_limit` | string |
| `daily_spend_limit_enabled` | boolean |
| `enabled` | boolean |
| `health_webhook_url` | url |
| `id` | uuid |
| `mms_fall_back_to_sms` | boolean |
| `mms_transcoding` | boolean |
| `mobile_only` | boolean |
| `name` | string |
| `number_pool_settings` | object \| null |
| `organization_id` | string |
| `record_type` | enum: messaging_profile |
| `redaction_enabled` | boolean |
| `redaction_level` | integer |
| `resource_group_id` | string \| null |
| `smart_encoding` | boolean |
| `updated_at` | date-time |
| `url_shortener_settings` | object \| null |
| `v1_secret` | string |
| `webhook_api_version` | enum: 1, 2, 2010-04-01 |
| `webhook_failover_url` | url |
| `webhook_url` | url |
| `whitelisted_destinations` | array[string] |

**Returned by:** List phone numbers associated with a messaging profile

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `eligible_messaging_products` | array[string] |
| `features` | object |
| `health` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: long-code, toll-free, short-code, longcode, tollfree, shortcode |
| `updated_at` | date-time |

**Returned by:** List short codes associated with a messaging profile, List short codes, Retrieve a short code, Update short code

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `messaging_profile_id` | string \| null |
| `record_type` | enum: short_code |
| `short_code` | string |
| `tags` | array |
| `updated_at` | date-time |

## Optional Parameters

### Create a messaging profile — `client.MessagingProfiles.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `WebhookUrl` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `WebhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `WebhookApiVersion` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `NumberPoolSettings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `UrlShortenerSettings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `AlphaSender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `DailySpendLimit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `DailySpendLimitEnabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `MmsFallBackToSms` | boolean | enables SMS fallback for MMS messages. |
| `MmsTranscoding` | boolean | enables automated resizing of MMS media. |
| `MobileOnly` | boolean | Send messages only to mobile phone numbers. |
| `SmartEncoding` | boolean | Enables automatic character encoding optimization for SMS messages. |
| `ResourceGroupId` | string (UUID) | The resource group ID to associate with this messaging profile. |
| `HealthWebhookUrl` | string (URL) | A URL to receive health check webhooks for numbers in this profile. |
| `AiAssistantId` | string (UUID) | The AI assistant ID to associate with this messaging profile. |

### Update a messaging profile — `client.MessagingProfiles.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RecordType` | enum (messaging_profile) | Identifies the type of the resource. |
| `Id` | string (UUID) | Identifies the type of resource. |
| `Name` | string | A user friendly name for the messaging profile. |
| `Enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `WebhookUrl` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `WebhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `WebhookApiVersion` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `WhitelistedDestinations` | array[string] | Destinations to which the messaging profile is allowed to send. |
| `CreatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `UpdatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
| `V1Secret` | string | Secret used to authenticate with v1 endpoints. |
| `NumberPoolSettings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `UrlShortenerSettings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `AlphaSender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `DailySpendLimit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `DailySpendLimitEnabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `MmsFallBackToSms` | boolean | enables SMS fallback for MMS messages. |
| `MmsTranscoding` | boolean | enables automated resizing of MMS media. |
| `MobileOnly` | boolean | Send messages only to mobile phone numbers. |
| `SmartEncoding` | boolean | Enables automatic character encoding optimization for SMS messages. |

### Update short code — `client.ShortCodes.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Tags` | array[string] |  |
