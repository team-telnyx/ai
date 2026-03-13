---
name: telnyx-account-notifications-ruby
description: >-
  Configure notification channels and settings for account alerts and events.
  This skill provides Ruby SDK examples.
metadata:
  internal: true
  author: telnyx
  product: account-notifications
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Notifications - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.messages.send_(to: "+13125550001", from: "+13125550002", text: "Hello")
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

## List notification channels

List notification channels.

`GET /notification_channels`

```ruby
page = client.notification_channels.list

puts(page)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Create a notification channel

Create a notification channel.

`POST /notification_channels`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

```ruby
notification_channel = client.notification_channels.create

puts(notification_channel)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Get a notification channel

Get a notification channel.

`GET /notification_channels/{id}`

```ruby
notification_channel = client.notification_channels.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_channel)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Update a notification channel

Update a notification channel.

`PATCH /notification_channels/{id}`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

```ruby
notification_channel = client.notification_channels.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_channel)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Delete a notification channel

Delete a notification channel.

`DELETE /notification_channels/{id}`

```ruby
notification_channel = client.notification_channels.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_channel)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`GET /notification_event_conditions`

```ruby
page = client.notification_event_conditions.list

puts(page)
```

Returns: `allow_multiple_channels` (boolean), `associated_record_type` (enum: account, phone_number), `asynchronous` (boolean), `created_at` (date-time), `description` (string), `enabled` (boolean), `id` (string), `name` (string), `notification_event_id` (string), `parameters` (array[object]), `supported_channels` (array[string]), `updated_at` (date-time)

## List all Notifications Events

Returns a list of your notifications events.

`GET /notification_events`

```ruby
page = client.notification_events.list

puts(page)
```

Returns: `created_at` (date-time), `enabled` (boolean), `id` (string), `name` (string), `notification_category` (string), `updated_at` (date-time)

## List all Notifications Profiles

Returns a list of your notifications profiles.

`GET /notification_profiles`

```ruby
page = client.notification_profiles.list

puts(page)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Create a notification profile

Create a notification profile.

`POST /notification_profiles`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

```ruby
notification_profile = client.notification_profiles.create

puts(notification_profile)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Get a notification profile

Get a notification profile.

`GET /notification_profiles/{id}`

```ruby
notification_profile = client.notification_profiles.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_profile)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Update a notification profile

Update a notification profile.

`PATCH /notification_profiles/{id}`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

```ruby
notification_profile = client.notification_profiles.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_profile)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Delete a notification profile

Delete a notification profile.

`DELETE /notification_profiles/{id}`

```ruby
notification_profile = client.notification_profiles.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_profile)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## List notification settings

List notification settings.

`GET /notification_settings`

```ruby
page = client.notification_settings.list

puts(page)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Add a Notification Setting

Add a notification setting.

`POST /notification_settings`

Optional: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

```ruby
notification_setting = client.notification_settings.create

puts(notification_setting)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Get a notification setting

Get a notification setting.

`GET /notification_settings/{id}`

```ruby
notification_setting = client.notification_settings.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_setting)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Delete a notification setting

Delete a notification setting.

`DELETE /notification_settings/{id}`

```ruby
notification_setting = client.notification_settings.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(notification_setting)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)
