---
name: telnyx-numbers-services-curl
description: >-
  Configure voicemail, voice channels, and emergency (E911) services for your
  phone numbers. This skill provides REST API (curl) examples.
metadata:
  author: telnyx
  product: numbers-services
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Services - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## List your voice channels for non-US zones

Returns the non-US voice channels for your account. voice channels allow you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`GET /channel_zones`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/channel_zones"
```

Returns: `channels` (int64), `countries` (array[string]), `created_at` (string), `id` (string), `name` (string), `record_type` (enum: channel_zone), `updated_at` (string)

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones. This allows your account to handle multiple simultaneous inbound calls to Non-US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`PUT /channel_zones/{channel_zone_id}` — Required: `channels`

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "channels": 0
}' \
  "https://api.telnyx.com/v2/channel_zones/{channel_zone_id}"
```

Returns: `channels` (int64), `countries` (array[string]), `created_at` (string), `id` (string), `name` (string), `record_type` (enum: channel_zone), `updated_at` (string)

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`GET /dynamic_emergency_addresses`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/dynamic_emergency_addresses"
```

Returns: `administrative_area` (string), `country_code` (enum: US, CA, PR), `created_at` (string), `extended_address` (string), `house_number` (string), `house_suffix` (string), `id` (string), `locality` (string), `postal_code` (string), `record_type` (string), `sip_geolocation_id` (string), `status` (enum: pending, activated, rejected), `street_name` (string), `street_post_directional` (string), `street_pre_directional` (string), `street_suffix` (string), `updated_at` (string)

## Create a dynamic emergency address.

Creates a dynamic emergency address.

`POST /dynamic_emergency_addresses` — Required: `house_number`, `street_name`, `locality`, `administrative_area`, `postal_code`, `country_code`

Optional: `created_at` (string), `extended_address` (string), `house_suffix` (string), `id` (string), `record_type` (string), `sip_geolocation_id` (string), `status` (enum: pending, activated, rejected), `street_post_directional` (string), `street_pre_directional` (string), `street_suffix` (string), `updated_at` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "house_number": "600",
  "street_name": "Congress",
  "locality": "Austin",
  "administrative_area": "TX",
  "postal_code": "78701",
  "country_code": "US"
}' \
  "https://api.telnyx.com/v2/dynamic_emergency_addresses"
```

Returns: `administrative_area` (string), `country_code` (enum: US, CA, PR), `created_at` (string), `extended_address` (string), `house_number` (string), `house_suffix` (string), `id` (string), `locality` (string), `postal_code` (string), `record_type` (string), `sip_geolocation_id` (string), `status` (enum: pending, activated, rejected), `street_name` (string), `street_post_directional` (string), `street_pre_directional` (string), `street_suffix` (string), `updated_at` (string)

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`GET /dynamic_emergency_addresses/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/dynamic_emergency_addresses/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `administrative_area` (string), `country_code` (enum: US, CA, PR), `created_at` (string), `extended_address` (string), `house_number` (string), `house_suffix` (string), `id` (string), `locality` (string), `postal_code` (string), `record_type` (string), `sip_geolocation_id` (string), `status` (enum: pending, activated, rejected), `street_name` (string), `street_post_directional` (string), `street_pre_directional` (string), `street_suffix` (string), `updated_at` (string)

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`DELETE /dynamic_emergency_addresses/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/dynamic_emergency_addresses/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `administrative_area` (string), `country_code` (enum: US, CA, PR), `created_at` (string), `extended_address` (string), `house_number` (string), `house_suffix` (string), `id` (string), `locality` (string), `postal_code` (string), `record_type` (string), `sip_geolocation_id` (string), `status` (enum: pending, activated, rejected), `street_name` (string), `street_post_directional` (string), `street_pre_directional` (string), `street_suffix` (string), `updated_at` (string)

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`GET /dynamic_emergency_endpoints`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/dynamic_emergency_endpoints"
```

Returns: `callback_number` (string), `caller_name` (string), `created_at` (string), `dynamic_emergency_address_id` (string), `id` (string), `record_type` (string), `sip_from_id` (string), `status` (enum: pending, activated, rejected), `updated_at` (string)

## Create a dynamic emergency endpoint.

Creates a dynamic emergency endpoints.

`POST /dynamic_emergency_endpoints` — Required: `dynamic_emergency_address_id`, `callback_number`, `caller_name`

Optional: `created_at` (string), `id` (string), `record_type` (string), `sip_from_id` (string), `status` (enum: pending, activated, rejected), `updated_at` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "dynamic_emergency_address_id": "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
  "callback_number": "+13125550000",
  "caller_name": "Jane Doe Desk Phone"
}' \
  "https://api.telnyx.com/v2/dynamic_emergency_endpoints"
```

Returns: `callback_number` (string), `caller_name` (string), `created_at` (string), `dynamic_emergency_address_id` (string), `id` (string), `record_type` (string), `sip_from_id` (string), `status` (enum: pending, activated, rejected), `updated_at` (string)

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`GET /dynamic_emergency_endpoints/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/dynamic_emergency_endpoints/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `callback_number` (string), `caller_name` (string), `created_at` (string), `dynamic_emergency_address_id` (string), `id` (string), `record_type` (string), `sip_from_id` (string), `status` (enum: pending, activated, rejected), `updated_at` (string)

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`DELETE /dynamic_emergency_endpoints/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/dynamic_emergency_endpoints/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `callback_number` (string), `caller_name` (string), `created_at` (string), `dynamic_emergency_address_id` (string), `id` (string), `record_type` (string), `sip_from_id` (string), `status` (enum: pending, activated, rejected), `updated_at` (string)

## List your voice channels for US Zone

Returns the US Zone voice channels for your account. voice channels allows you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`GET /inbound_channels`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/inbound_channels"
```

Returns: `channels` (integer), `record_type` (string)

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone. This allows your account to handle multiple simultaneous inbound calls to US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`PATCH /inbound_channels` — Required: `channels`

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "channels": 7
}' \
  "https://api.telnyx.com/v2/inbound_channels"
```

Returns: `channels` (integer), `record_type` (string)

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`GET /list`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/list"
```

Returns: `number_of_channels` (integer), `numbers` (array[object]), `zone_id` (string), `zone_name` (string)

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`GET /list/{channel_zone_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/list/{channel_zone_id}"
```

Returns: `number_of_channels` (integer), `numbers` (array[object]), `zone_id` (string), `zone_name` (string)

## Get voicemail

Returns the voicemail settings for a phone number

`GET /phone_numbers/{phone_number_id}/voicemail`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/{phone_number_id}/voicemail"
```

Returns: `enabled` (boolean), `pin` (string)

## Create voicemail

Create voicemail settings for a phone number

`POST /phone_numbers/{phone_number_id}/voicemail`

Optional: `enabled` (boolean), `pin` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/{phone_number_id}/voicemail"
```

Returns: `enabled` (boolean), `pin` (string)

## Update voicemail

Update voicemail settings for a phone number

`PATCH /phone_numbers/{phone_number_id}/voicemail`

Optional: `enabled` (boolean), `pin` (string)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/{phone_number_id}/voicemail"
```

Returns: `enabled` (boolean), `pin` (string)
