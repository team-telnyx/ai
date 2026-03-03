---
name: telnyx-messaging-profiles-go
description: >-
  Create and manage messaging profiles with number pools, sticky sender, and
  geomatch features. Configure short codes for high-volume messaging. This skill
  provides Go SDK examples.
metadata:
  author: telnyx
  product: messaging-profiles
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Profiles - Go

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

## List messaging profiles

`GET /messaging_profiles`

```go
	page, err := client.MessagingProfiles.List(context.TODO(), telnyx.MessagingProfileListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a messaging profile

`POST /messaging_profiles` — Required: `name`, `whitelisted_destinations`

Optional: `ai_assistant_id` (['string', 'null']), `alpha_sender` (['string', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `health_webhook_url` (url), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `number_pool_settings` (['object', 'null']), `resource_group_id` (['string', 'null']), `smart_encoding` (boolean), `url_shortener_settings` (['object', 'null']), `webhook_api_version` (enum), `webhook_failover_url` (url), `webhook_url` (url)

```go
	messagingProfile, err := client.MessagingProfiles.New(context.TODO(), telnyx.MessagingProfileNewParams{
		Name:                    "My name",
		WhitelistedDestinations: []string{"US"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

## Retrieve a messaging profile

`GET /messaging_profiles/{id}`

```go
	messagingProfile, err := client.MessagingProfiles.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

## Update a messaging profile

`PATCH /messaging_profiles/{id}`

Optional: `alpha_sender` (['string', 'null']), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (uuid), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (['object', 'null']), `record_type` (enum), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (['object', 'null']), `v1_secret` (string), `webhook_api_version` (enum), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

```go
	messagingProfile, err := client.MessagingProfiles.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

## Delete a messaging profile

`DELETE /messaging_profiles/{id}`

```go
	messagingProfile, err := client.MessagingProfiles.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingProfile.Data)
```

## List phone numbers associated with a messaging profile

`GET /messaging_profiles/{id}/phone_numbers`

```go
	page, err := client.MessagingProfiles.ListPhoneNumbers(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileListPhoneNumbersParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## List short codes associated with a messaging profile

`GET /messaging_profiles/{id}/short_codes`

```go
	page, err := client.MessagingProfiles.ListShortCodes(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingProfileListShortCodesParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## List short codes

`GET /short_codes`

```go
	page, err := client.ShortCodes.List(context.TODO(), telnyx.ShortCodeListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve a short code

`GET /short_codes/{id}`

```go
	shortCode, err := client.ShortCodes.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", shortCode.Data)
```

## Update short code

Update the settings for a specific short code.

`PATCH /short_codes/{id}` — Required: `messaging_profile_id`

Optional: `tags` (['array'])

```go
	shortCode, err := client.ShortCodes.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ShortCodeUpdateParams{
			MessagingProfileID: "abc85f64-5717-4562-b3fc-2c9600000000",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", shortCode.Data)
```
