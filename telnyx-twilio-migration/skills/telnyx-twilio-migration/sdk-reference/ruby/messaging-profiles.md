<!-- SDK reference: telnyx-messaging-profiles-ruby -->

# Telnyx Messaging Profiles - Ruby

## Core Workflow

### Prerequisites

1. Buy phone number(s) to assign to the profile (see telnyx-numbers-ruby)

### Steps

1. **Create profile**: `client.messaging_profiles.create(name: ..., whitelisted_destinations: [...])`
2. **Configure webhooks**: `client.messaging_profiles.update(id: ..., webhook_url: ..., webhook_failover_url: ...)`
3. **Assign numbers**: `client.phone_numbers.messaging.update(id: ..., messaging_profile_id: ...)`
4. **(Optional) Enable number pool**: `client.messaging_profiles.update(id: ..., number_pool_settings: {...})`

### Common mistakes

- NEVER omit whitelisted_destinations — messages fail if the destination country is not whitelisted
- NEVER send messages with a disabled messaging profile — error 40312
- NEVER forget to assign numbers to the profile — the from number will be rejected
- Number pool requires number_pool_settings to be set AND multiple numbers assigned
- Setting messaging_profile_id to empty string unassigns the number — use null/omit to keep current value

**Related skills**: telnyx-messaging-ruby, telnyx-numbers-ruby, telnyx-10dlc-ruby

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
  result = client.messaging_profiles.create(params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a messaging profile

`client.messaging_profiles.create()` — `POST /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the messaging profile. |
| `whitelisted_destinations` | array[string] | Yes | Destinations to which the messaging profile is allowed to se... |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `webhook_api_version` | enum (1, 2, 2010-04-01) | No | Determines which webhook format will be used, Telnyx API v1,... |
| ... | | | +13 optional params in the API Details section below |

```ruby
messaging_profile = client.messaging_profiles.create(name: "My name", whitelisted_destinations: ["US"])

puts(messaging_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List messaging profiles

`client.messaging_profiles.list()` — `GET /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter[name][eq]` | string | No | Filter profiles by exact name match. |
| ... | | | +1 optional params in the API Details section below |

```ruby
page = client.messaging_profiles.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a messaging profile

`client.messaging_profiles.retrieve()` — `GET /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```ruby
messaging_profile = client.messaging_profiles.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a messaging profile

`client.messaging_profiles.update()` — `PATCH /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `record_type` | enum (messaging_profile) | No | Identifies the type of the resource. |
| ... | | | +17 optional params in the API Details section below |

```ruby
messaging_profile = client.messaging_profiles.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List phone numbers associated with a messaging profile

`client.messaging_profiles.list_phone_numbers()` — `GET /messaging_profiles/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.messaging_profiles.list_phone_numbers("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Delete a messaging profile

`client.messaging_profiles.delete()` — `DELETE /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```ruby
messaging_profile = client.messaging_profiles.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List short codes associated with a messaging profile

`client.messaging_profiles.list_short_codes()` — `GET /messaging_profiles/{id}/short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.messaging_profiles.list_short_codes("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## List short codes

`client.short_codes.list()` — `GET /short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.short_codes.list

puts(page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Retrieve a short code

`client.short_codes.retrieve()` — `GET /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the short code |

```ruby
short_code = client.short_codes.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(short_code)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Update short code

Update the settings for a specific short code. To unbind a short code from a profile, set the `messaging_profile_id` to `null` or an empty string. To add or update tags, include the tags field as an array of strings.

`client.short_codes.update()` — `PATCH /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `id` | string (UUID) | Yes | The id of the short code |
| `tags` | array[string] | No |  |

```ruby
short_code = client.short_codes.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  messaging_profile_id: "abc85f64-5717-4562-b3fc-2c9600000000"
)

puts(short_code)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

---

# Messaging Profiles (Ruby) — API Details

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

### Create a messaging profile — `client.messaging_profiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `webhook_url` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `webhook_api_version` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `number_pool_settings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `url_shortener_settings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `alpha_sender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `daily_spend_limit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `daily_spend_limit_enabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `mms_fall_back_to_sms` | boolean | enables SMS fallback for MMS messages. |
| `mms_transcoding` | boolean | enables automated resizing of MMS media. |
| `mobile_only` | boolean | Send messages only to mobile phone numbers. |
| `smart_encoding` | boolean | Enables automatic character encoding optimization for SMS messages. |
| `resource_group_id` | string (UUID) | The resource group ID to associate with this messaging profile. |
| `health_webhook_url` | string (URL) | A URL to receive health check webhooks for numbers in this profile. |
| `ai_assistant_id` | string (UUID) | The AI assistant ID to associate with this messaging profile. |

### Update a messaging profile — `client.messaging_profiles.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `record_type` | enum (messaging_profile) | Identifies the type of the resource. |
| `id` | string (UUID) | Identifies the type of resource. |
| `name` | string | A user friendly name for the messaging profile. |
| `enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `webhook_url` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `webhook_api_version` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `whitelisted_destinations` | array[string] | Destinations to which the messaging profile is allowed to send. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
| `v1_secret` | string | Secret used to authenticate with v1 endpoints. |
| `number_pool_settings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `url_shortener_settings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `alpha_sender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `daily_spend_limit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `daily_spend_limit_enabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `mms_fall_back_to_sms` | boolean | enables SMS fallback for MMS messages. |
| `mms_transcoding` | boolean | enables automated resizing of MMS media. |
| `mobile_only` | boolean | Send messages only to mobile phone numbers. |
| `smart_encoding` | boolean | Enables automatic character encoding optimization for SMS messages. |

### Update short code — `client.short_codes.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] |  |
