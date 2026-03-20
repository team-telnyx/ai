---
name: telnyx-account-notifications-go
description: >-
  Notification channels and settings for account alerts.
metadata:
  author: telnyx
  product: account-notifications
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Notifications - Go

## Core Workflow

### Steps

1. **Create notification channel**: `client.NotificationChannels.Create(ctx, params)`
2. **Create notification profile**: `client.NotificationProfiles.Create(ctx, params)`

### Common mistakes

- Notification channels must be verified before they receive alerts

**Related skills**: telnyx-account-go

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

result, err := client.NotificationChannels.Create(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List notification channels

List notification channels.

`client.NotificationChannels.List()` — `GET /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.NotificationChannels.List(context.Background(), telnyx.NotificationChannelListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a notification channel

Create a notification channel.

`client.NotificationChannels.New()` — `POST /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NotificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `ChannelTypeId` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `Id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	notificationChannel, err := client.NotificationChannels.New(context.Background(), telnyx.NotificationChannelNewParams{
		ChannelTypeID: "550e8400-e29b-41d4-a716-446655440000",
		ChannelDestination: "https://example.com/webhooks",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationChannel.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a notification channel

Get a notification channel.

`client.NotificationChannels.Get()` — `GET /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |

```go
	notificationChannel, err := client.NotificationChannels.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationChannel.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a notification channel

Update a notification channel.

`client.NotificationChannels.Update()` — `PATCH /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |
| `NotificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `ChannelTypeId` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `Id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	notificationChannel, err := client.NotificationChannels.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.NotificationChannelUpdateParams{
			NotificationChannel: telnyx.NotificationChannelParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationChannel.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a notification channel

Delete a notification channel.

`client.NotificationChannels.Delete()` — `DELETE /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |

```go
	notificationChannel, err := client.NotificationChannels.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationChannel.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`client.NotificationEventConditions.List()` — `GET /notification_event_conditions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.NotificationEventConditions.List(context.Background(), telnyx.NotificationEventConditionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Events

Returns a list of your notifications events.

`client.NotificationEvents.List()` — `GET /notification_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.NotificationEvents.List(context.Background(), telnyx.NotificationEventListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Profiles

Returns a list of your notifications profiles.

`client.NotificationProfiles.List()` — `GET /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.NotificationProfiles.List(context.Background(), telnyx.NotificationProfileListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a notification profile

Create a notification profile.

`client.NotificationProfiles.New()` — `POST /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | No | A UUID. |
| `Name` | string | No | A human readable name. |
| `CreatedAt` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	notificationProfile, err := client.NotificationProfiles.New(context.Background(), telnyx.NotificationProfileNewParams{
		Name: "My Notification Profile",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a notification profile

Get a notification profile.

`client.NotificationProfiles.Get()` — `GET /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |

```go
	notificationProfile, err := client.NotificationProfiles.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a notification profile

Update a notification profile.

`client.NotificationProfiles.Update()` — `PATCH /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |
| `Id` | string (UUID) | No | A UUID. |
| `Name` | string | No | A human readable name. |
| `CreatedAt` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	notificationProfile, err := client.NotificationProfiles.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.NotificationProfileUpdateParams{
			NotificationProfile: telnyx.NotificationProfileParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a notification profile

Delete a notification profile.

`client.NotificationProfiles.Delete()` — `DELETE /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |

```go
	notificationProfile, err := client.NotificationProfiles.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List notification settings

List notification settings.

`client.NotificationSettings.List()` — `GET /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.NotificationSettings.List(context.Background(), telnyx.NotificationSettingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Add a Notification Setting

Add a notification setting.

`client.NotificationSettings.New()` — `POST /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NotificationEventConditionId` | string (UUID) | No | A UUID reference to the associated Notification Event Condit... |
| `NotificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `Status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | No | Most preferences apply immediately; however, other may needs... |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```go
	notificationSetting, err := client.NotificationSettings.New(context.Background(), telnyx.NotificationSettingNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationSetting.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a notification setting

Get a notification setting.

`client.NotificationSettings.Get()` — `GET /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |

```go
	notificationSetting, err := client.NotificationSettings.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationSetting.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a notification setting

Delete a notification setting.

`client.NotificationSettings.Delete()` — `DELETE /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the resource. |

```go
	notificationSetting, err := client.NotificationSettings.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationSetting.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
