---
name: telnyx-numbers-config-ruby
description: >-
  Phone number config: caller ID, call forwarding, messaging enablement,
  connection assignments.
metadata:
  author: telnyx
  product: numbers-config
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - Ruby

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-ruby)

### Steps

1. **List your numbers**: `client.phone_numbers.list()`
2. **Update voice settings**: `client.phone_numbers.voice.update(id: ..., connection_id: ...)`
3. **Update messaging settings**: `client.phone_numbers.messaging.update(id: ..., messaging_profile_id: ...)`

### Common mistakes

- Use phone_numbers.voice.update() for voice/connection settings and phone_numbers.messaging.update() for messaging/profile settings — they are SEPARATE endpoints
- Bulk operations are available for updating many numbers at once — see bulk_phone_number_operations endpoints

**Related skills**: telnyx-numbers-ruby, telnyx-messaging-profiles-ruby, telnyx-voice-ruby

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
  result = client.phone_numbers.list(params)
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Bulk update phone number profiles

`client.messaging_numbers_bulk_updates.create()` — `POST /messaging_numbers_bulk_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Configure the messaging profile these phone numbers are assi... |
| `numbers` | array[string] | Yes | The list of phone numbers to update. |
| `assign_only` | boolean | No | If true, only assign numbers to the profile without changing... |

```ruby
messaging_numbers_bulk_update = client.messaging_numbers_bulk_updates.create(
  messaging_profile_id: "00000000-0000-0000-0000-000000000000",
  numbers: ["+18880000000", "+18880000001", "+18880000002"]
)

puts(messaging_numbers_bulk_update)
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## Retrieve bulk update status

`client.messaging_numbers_bulk_updates.retrieve()` — `GET /messaging_numbers_bulk_updates/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes | Order ID to verify bulk update status. |

```ruby
messaging_numbers_bulk_update = client.messaging_numbers_bulk_updates.retrieve("order_id")

puts(messaging_numbers_bulk_update)
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## List mobile phone numbers with messaging settings

`client.mobile_phone_numbers.messaging.list()` — `GET /mobile_phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.mobile_phone_numbers.messaging.list

puts(page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a mobile phone number with messaging settings

`client.mobile_phone_numbers.messaging.retrieve()` — `GET /mobile_phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```ruby
messaging = client.mobile_phone_numbers.messaging.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(messaging)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List phone numbers

`client.phone_numbers.list()` — `GET /phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `handle_messaging_profile_error` | enum (true, false) | No | Although it is an infrequent occurrence, due to the highly d... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```ruby
page = client.phone_numbers.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`client.phone_numbers.actions.verify_ownership()` — `POST /phone_numbers/actions/verify_ownership`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | Array of phone numbers to verify ownership for |

```ruby
response = client.phone_numbers.actions.verify_ownership(phone_numbers: ["+15551234567"])

puts(response)
```

Key response fields: `response.data.found, response.data.not_found, response.data.record_type`

## Lists the phone numbers jobs

`client.phone_numbers.jobs.list()` — `GET /phone_numbers/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.phone_numbers.jobs.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`client.phone_numbers.jobs.delete_batch()` — `POST /phone_numbers/jobs/delete_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |

```ruby
response = client.phone_numbers.jobs.delete_batch(phone_numbers: ["+19705555098", "+19715555098", "32873127836"])

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers. At most one thousand numbers can be updated per API call.

`client.phone_numbers.jobs.update_emergency_settings_batch()` — `POST /phone_numbers/jobs/update_emergency_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |
| `emergency_enabled` | boolean | Yes | Indicates whether to enable or disable emergency services on... |
| `emergency_address_id` | string (UUID) | No | Identifies the address to be used with emergency services. |

```ruby
response = client.phone_numbers.jobs.update_emergency_settings_batch(
  emergency_enabled: true,
  phone_numbers: ["+19705555098", "+19715555098", "32873127836"]
)

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update a batch of numbers

Creates a new background job to update a batch of numbers. At most one thousand numbers can be updated per API call. At least one of the updateable fields must be submitted.

`client.phone_numbers.jobs.update_batch()` — `POST /phone_numbers/jobs/update_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | Array of phone number ids and/or phone numbers in E164 forma... |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connection_id` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.phone_numbers.jobs.update_batch(phone_numbers: ["1583466971586889004", "+13127367254"])

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieve a phone numbers job

`client.phone_numbers.jobs.retrieve()` — `GET /phone_numbers/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Numbers Job. |

```ruby
job = client.phone_numbers.jobs.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(job)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List phone numbers with messaging settings

`client.phone_numbers.messaging.list()` — `GET /phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[type]` | enum (tollfree, longcode, shortcode) | No | Filter by phone number type. |
| `sort[phone_number]` | enum (asc, desc) | No | Sort by phone number. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
page = client.phone_numbers.messaging.list

puts(page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`client.phone_numbers.slim_list()` — `GET /phone_numbers/slim`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `include_connection` | boolean | No | Include the connection associated with the phone number. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```ruby
page = client.phone_numbers.slim_list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List phone numbers with voice settings

`client.phone_numbers.voice.list()` — `GET /phone_numbers/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.phone_numbers.voice.list

puts(page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number

`client.phone_numbers.retrieve()` — `GET /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
phone_number = client.phone_numbers.retrieve("1293384261075731499")

puts(phone_number)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a phone number

`client.phone_numbers.update()` — `PATCH /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connection_id` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```ruby
phone_number = client.phone_numbers.update("1293384261075731499")

puts(phone_number)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Delete a phone number

`client.phone_numbers.delete()` — `DELETE /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
phone_number = client.phone_numbers.delete("1293384261075731499")

puts(phone_number)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`client.phone_numbers.actions.change_bundle_status()` — `PATCH /phone_numbers/{id}/actions/bundle_status_change`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundle_id` | string (UUID) | Yes | The new bundle_id setting for the number. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.phone_numbers.actions.change_bundle_status(
  "1293384261075731499",
  bundle_id: "5194d8fc-87e6-4188-baa9-1c434bbe861b"
)

puts(response)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Enable emergency for a phone number

`client.phone_numbers.actions.enable_emergency()` — `POST /phone_numbers/{id}/actions/enable_emergency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emergency_enabled` | boolean | Yes | Indicates whether to enable emergency services on this numbe... |
| `emergency_address_id` | string (UUID) | Yes | Identifies the address to be used with emergency services. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.phone_numbers.actions.enable_emergency(
  "1293384261075731499",
  emergency_address_id: "53829456729313",
  emergency_enabled: true
)

puts(response)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number with messaging settings

`client.phone_numbers.messaging.retrieve()` — `GET /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```ruby
messaging = client.phone_numbers.messaging.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(messaging)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update the messaging profile and/or messaging product of a phone number

`client.phone_numbers.messaging.update()` — `PATCH /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The phone number to update. |
| `messaging_profile_id` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messaging_product` | string | No | Configure the messaging product for this number:

* Omit thi... |

```ruby
messaging = client.phone_numbers.messaging.update("550e8400-e29b-41d4-a716-446655440000")

puts(messaging)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a phone number with voice settings

`client.phone_numbers.voice.retrieve()` — `GET /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
voice = client.phone_numbers.voice.retrieve("1293384261075731499")

puts(voice)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Update a phone number with voice settings

`client.phone_numbers.voice.update()` — `PATCH /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usage_payment_method` | enum (pay-per-minute, channel) | No | Controls whether a number is billed per minute or uses your ... |
| `inbound_call_screening` | enum (disabled, reject_calls, flag_calls) | No | The inbound_call_screening setting is a phone number configu... |
| `tech_prefix_enabled` | boolean | No | Controls whether a tech prefix is enabled for this phone num... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```ruby
voice = client.phone_numbers.voice.update("1293384261075731499")

puts(voice)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## List Mobile Phone Numbers

`client.mobile_phone_numbers.list()` — `GET /v2/mobile_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```ruby
page = client.mobile_phone_numbers.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a Mobile Phone Number

`client.mobile_phone_numbers.retrieve()` — `GET /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |

```ruby
mobile_phone_number = client.mobile_phone_numbers.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(mobile_phone_number)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a Mobile Phone Number

`client.mobile_phone_numbers.update()` — `PATCH /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |
| `connection_id` | string (UUID) | No |  |
| `tags` | array[string] | No |  |
| `inbound_call_screening` | enum (disabled, reject_calls, flag_calls) | No |  |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```ruby
mobile_phone_number = client.mobile_phone_numbers.update("550e8400-e29b-41d4-a716-446655440000")

puts(mobile_phone_number)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
