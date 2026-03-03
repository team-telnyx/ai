---
name: telnyx-messaging-profiles-ruby
description: >-
  Create and manage messaging profiles with number pools, sticky sender, and
  geomatch features. Configure short codes for high-volume messaging. This skill
  provides Ruby SDK examples.
metadata:
  author: telnyx
  product: messaging-profiles
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Profiles - Ruby

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

## List messaging profiles

`GET /messaging_profiles`

```ruby
page = client.messaging_profiles.list

puts(page)
```

## Create a messaging profile

`POST /messaging_profiles` — Required: `name`, `whitelisted_destinations`

Optional: `ai_assistant_id` (['string', 'null']), `alpha_sender` (['string', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `health_webhook_url` (url), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `number_pool_settings` (['object', 'null']), `resource_group_id` (['string', 'null']), `smart_encoding` (boolean), `url_shortener_settings` (['object', 'null']), `webhook_api_version` (enum), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
messaging_profile = client.messaging_profiles.create(name: "My name", whitelisted_destinations: ["US"])

puts(messaging_profile)
```

## Retrieve a messaging profile

`GET /messaging_profiles/{id}`

```ruby
messaging_profile = client.messaging_profiles.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging_profile)
```

## Update a messaging profile

`PATCH /messaging_profiles/{id}`

Optional: `alpha_sender` (['string', 'null']), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (uuid), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (['object', 'null']), `record_type` (enum), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (['object', 'null']), `v1_secret` (string), `webhook_api_version` (enum), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

```ruby
messaging_profile = client.messaging_profiles.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging_profile)
```

## Delete a messaging profile

`DELETE /messaging_profiles/{id}`

```ruby
messaging_profile = client.messaging_profiles.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging_profile)
```

## List phone numbers associated with a messaging profile

`GET /messaging_profiles/{id}/phone_numbers`

```ruby
page = client.messaging_profiles.list_phone_numbers("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## List short codes associated with a messaging profile

`GET /messaging_profiles/{id}/short_codes`

```ruby
page = client.messaging_profiles.list_short_codes("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## List short codes

`GET /short_codes`

```ruby
page = client.short_codes.list

puts(page)
```

## Retrieve a short code

`GET /short_codes/{id}`

```ruby
short_code = client.short_codes.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(short_code)
```

## Update short code

Update the settings for a specific short code.

`PATCH /short_codes/{id}` — Required: `messaging_profile_id`

Optional: `tags` (['array'])

```ruby
short_code = client.short_codes.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  messaging_profile_id: "abc85f64-5717-4562-b3fc-2c9600000000"
)

puts(short_code)
```
