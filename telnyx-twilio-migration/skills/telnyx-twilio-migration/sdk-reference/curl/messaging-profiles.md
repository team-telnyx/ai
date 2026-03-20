<!-- SDK reference: telnyx-messaging-profiles-curl -->

# Telnyx Messaging Profiles - curl

## Core Workflow

### Prerequisites

1. Buy phone number(s) to assign to the profile (see telnyx-numbers-curl)

### Steps

1. **Create profile**
2. **Configure webhooks**
3. **Assign numbers**
4. **(Optional) Enable number pool**

### Common mistakes

- NEVER omit whitelisted_destinations — messages fail if the destination country is not whitelisted
- NEVER send messages with a disabled messaging profile — error 40312
- NEVER forget to assign numbers to the profile — the from number will be rejected
- Number pool requires number_pool_settings to be set AND multiple numbers assigned
- Setting messaging_profile_id to empty string unassigns the number — use null/omit to keep current value

**Related skills**: telnyx-messaging-curl, telnyx-numbers-curl, telnyx-10dlc-curl

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
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a messaging profile

`POST /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the messaging profile. |
| `whitelisted_destinations` | array[string] | Yes | Destinations to which the messaging profile is allowed to se... |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `webhook_api_version` | enum (1, 2, 2010-04-01) | No | Determines which webhook format will be used, Telnyx API v1,... |
| ... | | | +13 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource",
  "whitelisted_destinations": [
    "US"
  ]
}' \
  "https://api.telnyx.com/v2/messaging_profiles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List messaging profiles

`GET /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter[name][eq]` | string | No | Filter profiles by exact name match. |
| ... | | | +1 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve a messaging profile

`GET /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a messaging profile

`PATCH /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `record_type` | enum (messaging_profile) | No | Identifies the type of the resource. |
| ... | | | +17 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List phone numbers associated with a messaging profile

`GET /messaging_profiles/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000/phone_numbers"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Delete a messaging profile

`DELETE /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List short codes associated with a messaging profile

`GET /messaging_profiles/{id}/short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000/short_codes"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.created_at`

## List short codes

`GET /short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/short_codes"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.created_at`

## Retrieve a short code

`GET /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the short code |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/short_codes/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.created_at`

## Update short code

Update the settings for a specific short code. To unbind a short code from a profile, set the `messaging_profile_id` to `null` or an empty string. To add or update tags, include the tags field as an array of strings.

`PATCH /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `id` | string (UUID) | Yes | The id of the short code |
| `tags` | array[string] | No |  |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/short_codes/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.created_at`

---

# Messaging Profiles (curl) — API Details

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

### Create a messaging profile

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

### Update a messaging profile

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

### Update short code

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] |  |
