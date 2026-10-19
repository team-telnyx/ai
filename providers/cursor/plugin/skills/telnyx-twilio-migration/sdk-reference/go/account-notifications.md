<!-- SDK reference: telnyx-account-notifications-go -->

# Telnyx Account Notifications - Go

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

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

## List notification channels

Returns a paginated list of your notification channels, the destinations that receive notifications.

`GET /notification_channels`

```go
	page, err := client.NotificationChannels.List(context.Background(), telnyx.NotificationChannelListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Create a notification channel

Creates a new notification channel defining where notifications are delivered, and returns the created channel.

`POST /notification_channels`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

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

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Get a notification channel

Returns the details of a single notification channel by its identifier.

`GET /notification_channels/{id}`

```go
	notificationChannel, err := client.NotificationChannels.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationChannel.Data)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Update a notification channel

Updates the specified notification channel and returns the updated channel.

`PATCH /notification_channels/{id}`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

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

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Delete a notification channel

Deletes the specified notification channel so notifications are no longer delivered to it.

`DELETE /notification_channels/{id}`

```go
	notificationChannel, err := client.NotificationChannels.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationChannel.Data)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`GET /notification_event_conditions`

```go
	page, err := client.NotificationEventConditions.List(context.Background(), telnyx.NotificationEventConditionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `allow_multiple_channels` (boolean), `associated_record_type` (enum: account, phone_number), `asynchronous` (boolean), `created_at` (date-time), `description` (string), `enabled` (boolean), `id` (string), `name` (string), `notification_event_id` (string), `parameters` (array[object]), `supported_channels` (array[string]), `updated_at` (date-time)

## List all Notifications Events

Returns a list of your notifications events.

`GET /notification_events`

```go
	page, err := client.NotificationEvents.List(context.Background(), telnyx.NotificationEventListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (date-time), `enabled` (boolean), `id` (string), `name` (string), `notification_category` (string), `updated_at` (date-time)

## List all Notifications Profiles

Returns a list of your notifications profiles.

`GET /notification_profiles`

```go
	page, err := client.NotificationProfiles.List(context.Background(), telnyx.NotificationProfileListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Create a notification profile

Creates a new notification profile, a named grouping used to organize notification settings, and returns it.

`POST /notification_profiles`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

```go
	notificationProfile, err := client.NotificationProfiles.New(context.Background(), telnyx.NotificationProfileNewParams{
		Name: "My Notification Profile",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Get a notification profile

Returns the details of a single notification profile by its identifier.

`GET /notification_profiles/{id}`

```go
	notificationProfile, err := client.NotificationProfiles.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Update a notification profile

Updates the specified notification profile and returns the updated profile.

`PATCH /notification_profiles/{id}`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

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

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Delete a notification profile

Deletes the specified notification profile from your account.

`DELETE /notification_profiles/{id}`

```go
	notificationProfile, err := client.NotificationProfiles.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationProfile.Data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## List notification settings

Returns a paginated list of your notification settings, which map notification event types to profiles and channels.

`GET /notification_settings`

```go
	page, err := client.NotificationSettings.List(context.Background(), telnyx.NotificationSettingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Add a Notification Setting

Adds a notification setting that enables delivery of a notification event type to a notification profile.

`POST /notification_settings`

Optional: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

```go
	notificationSetting, err := client.NotificationSettings.New(context.Background(), telnyx.NotificationSettingNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationSetting.Data)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Get a notification setting

Returns the details of a single notification setting by its identifier.

`GET /notification_settings/{id}`

```go
	notificationSetting, err := client.NotificationSettings.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationSetting.Data)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Delete a notification setting

Deletes the specified notification setting, disabling that notification delivery.

`DELETE /notification_settings/{id}`

```go
	notificationSetting, err := client.NotificationSettings.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", notificationSetting.Data)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)
