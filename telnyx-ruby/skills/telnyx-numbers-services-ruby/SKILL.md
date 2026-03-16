---
name: telnyx-numbers-services-ruby
description: >-
  Voicemail, voice channels, and emergency (E911) services for phone numbers.
metadata:
  author: telnyx
  product: numbers-services
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Services - Ruby

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-ruby)

### Steps

1. **Set up voicemail**: `client.voicemail.create(phone_number_id: ...)`
2. **Configure E911**: `client.dynamic_emergency_endpoints.create(...: ...)`

### Common mistakes

- E911 addresses must be validated — invalid addresses will cause regulatory issues

**Related skills**: telnyx-numbers-ruby, telnyx-numbers-config-ruby

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
  result = client.voicemail.create(params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List your voice channels for non-US zones

Returns the non-US voice channels for your account. voice channels allow you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.channel_zones.list()` — `GET /channel_zones`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.channel_zones.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones. This allows your account to handle multiple simultaneous inbound calls to Non-US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.channel_zones.update()` — `PUT /channel_zones/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The number of reserved channels |

```ruby
channel_zone = client.channel_zones.update("channel_zone_id", channels: 0)

puts(channel_zone)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`client.dynamic_emergency_addresses.list()` — `GET /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.dynamic_emergency_addresses.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency address.

Creates a dynamic emergency address.

`client.dynamic_emergency_addresses.create()` — `POST /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `house_number` | string | Yes |  |
| `street_name` | string | Yes |  |
| `locality` | string | Yes |  |
| `administrative_area` | string | Yes |  |
| `postal_code` | string | Yes |  |
| `country_code` | enum (US, CA, PR) | Yes |  |
| `sip_geolocation_id` | string (UUID) | No | Unique location reference string to be used in SIP INVITE fr... |
| `status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `id` | string (UUID) | No |  |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```ruby
dynamic_emergency_address = client.dynamic_emergency_addresses.create(
  administrative_area: "TX",
  country_code: :US,
  house_number: "600",
  locality: "Austin",
  postal_code: "78701",
  street_name: "Congress"
)

puts(dynamic_emergency_address)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`client.dynamic_emergency_addresses.retrieve()` — `GET /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```ruby
dynamic_emergency_address = client.dynamic_emergency_addresses.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(dynamic_emergency_address)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`client.dynamic_emergency_addresses.delete()` — `DELETE /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```ruby
dynamic_emergency_address = client.dynamic_emergency_addresses.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(dynamic_emergency_address)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`client.dynamic_emergency_endpoints.list()` — `GET /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.dynamic_emergency_endpoints.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency endpoint.

Creates a dynamic emergency endpoints.

`client.dynamic_emergency_endpoints.create()` — `POST /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dynamic_emergency_address_id` | string (UUID) | Yes | An id of a currently active dynamic emergency location. |
| `callback_number` | string | Yes |  |
| `caller_name` | string | Yes |  |
| `status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `sip_from_id` | string (UUID) | No |  |
| `id` | string (UUID) | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
dynamic_emergency_endpoint = client.dynamic_emergency_endpoints.create(
  callback_number: "+13125550000",
  caller_name: "Jane Doe Desk Phone",
  dynamic_emergency_address_id: "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0"
)

puts(dynamic_emergency_endpoint)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`client.dynamic_emergency_endpoints.retrieve()` — `GET /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```ruby
dynamic_emergency_endpoint = client.dynamic_emergency_endpoints.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(dynamic_emergency_endpoint)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`client.dynamic_emergency_endpoints.delete()` — `DELETE /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```ruby
dynamic_emergency_endpoint = client.dynamic_emergency_endpoints.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(dynamic_emergency_endpoint)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List your voice channels for US Zone

Returns the US Zone voice channels for your account. voice channels allows you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.inbound_channels.list()` — `GET /inbound_channels`

```ruby
inbound_channels = client.inbound_channels.list

puts(inbound_channels)
```

Key response fields: `response.data.channels, response.data.record_type`

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone. This allows your account to handle multiple simultaneous inbound calls to US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.inbound_channels.update()` — `PATCH /inbound_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The new number of concurrent channels for the account |

```ruby
inbound_channel = client.inbound_channels.update(channels: 7)

puts(inbound_channel)
```

Key response fields: `response.data.channels, response.data.record_type`

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`client.list.retrieve_all()` — `GET /list`

```ruby
response = client.list.retrieve_all

puts(response)
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`client.list.retrieve_by_zone()` — `GET /list/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_zone_id` | string (UUID) | Yes | Channel zone identifier |

```ruby
response = client.list.retrieve_by_zone("channel_zone_id")

puts(response)
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## Get voicemail

Returns the voicemail settings for a phone number

`client.phone_numbers.voicemail.retrieve()` — `GET /phone_numbers/{phone_number_id}/voicemail`

```ruby
voicemail = client.phone_numbers.voicemail.retrieve("123455678900")

puts(voicemail)
```

Key response fields: `response.data.enabled, response.data.pin`

## Create voicemail

Create voicemail settings for a phone number

`client.phone_numbers.voicemail.create()` — `POST /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```ruby
voicemail = client.phone_numbers.voicemail.create("123455678900")

puts(voicemail)
```

Key response fields: `response.data.enabled, response.data.pin`

## Update voicemail

Update voicemail settings for a phone number

`client.phone_numbers.voicemail.update()` — `PATCH /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```ruby
voicemail = client.phone_numbers.voicemail.update("123455678900")

puts(voicemail)
```

Key response fields: `response.data.enabled, response.data.pin`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
