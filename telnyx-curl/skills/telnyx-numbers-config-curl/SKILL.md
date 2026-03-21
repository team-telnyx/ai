---
name: telnyx-numbers-config-curl
description: >-
  Phone number config: caller ID, call forwarding, messaging enablement,
  connection assignments.
metadata:
  author: telnyx
  product: numbers-config
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - curl

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-curl)

### Steps

1. **List your numbers**
2. **Update voice settings**
3. **Update messaging settings**

### Common mistakes

- Use phone_numbers.voice.update() for voice/connection settings and phone_numbers.messaging.update() for messaging/profile settings — they are SEPARATE endpoints
- Bulk operations are available for updating many numbers at once — see bulk_phone_number_operations endpoints

**Related skills**: telnyx-numbers-curl, telnyx-messaging-profiles-curl, telnyx-voice-curl

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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Bulk update phone number profiles

`POST /messaging_numbers_bulk_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Configure the messaging profile these phone numbers are assi... |
| `numbers` | array[string] | Yes | The list of phone numbers to update. |
| `assign_only` | boolean | No | If true, only assign numbers to the profile without changing... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "numbers": [
    "+13125550001"
  ]
}' \
  "https://api.telnyx.com/v2/messaging_numbers_bulk_updates"
```

Key response fields: `.data.failed, .data.order_id, .data.pending`

## Retrieve bulk update status

`GET /messaging_numbers_bulk_updates/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes | Order ID to verify bulk update status. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_numbers_bulk_updates/{order_id}"
```

Key response fields: `.data.failed, .data.order_id, .data.pending`

## List mobile phone numbers with messaging settings

`GET /mobile_phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/mobile_phone_numbers/messaging"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Retrieve a mobile phone number with messaging settings

`GET /mobile_phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/mobile_phone_numbers/550e8400-e29b-41d4-a716-446655440000/messaging"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## List phone numbers

`GET /phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `handle_messaging_profile_error` | enum (true, false) | No | Although it is an infrequent occurrence, due to the highly d... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers?sort=connection_name&handle_messaging_profile_error=false"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`POST /phone_numbers/actions/verify_ownership`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | Array of phone numbers to verify ownership for |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_numbers": [
    "+15551234567"
  ]
}' \
  "https://api.telnyx.com/v2/phone_numbers/actions/verify_ownership"
```

Key response fields: `.data.found, .data.not_found, .data.record_type`

## Lists the phone numbers jobs

`GET /phone_numbers/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/jobs?sort=created_at"
```

Key response fields: `.data.id, .data.status, .data.type`

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`POST /phone_numbers/jobs/delete_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_numbers": [
    "+13125550001"
  ]
}' \
  "https://api.telnyx.com/v2/phone_numbers/jobs/delete_phone_numbers"
```

Key response fields: `.data.id, .data.status, .data.type`

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers. At most one thousand numbers can be updated per API call.

`POST /phone_numbers/jobs/update_emergency_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |
| `emergency_enabled` | boolean | Yes | Indicates whether to enable or disable emergency services on... |
| `emergency_address_id` | string (UUID) | No | Identifies the address to be used with emergency services. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_numbers": [
    "+13125550001"
  ],
  "emergency_enabled": true
}' \
  "https://api.telnyx.com/v2/phone_numbers/jobs/update_emergency_settings"
```

Key response fields: `.data.id, .data.status, .data.type`

## Update a batch of numbers

Creates a new background job to update a batch of numbers. At most one thousand numbers can be updated per API call. At least one of the updateable fields must be submitted.

`POST /phone_numbers/jobs/update_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | Array of phone number ids and/or phone numbers in E164 forma... |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connection_id` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_numbers": [
    "+13125550001"
  ]
}' \
  "https://api.telnyx.com/v2/phone_numbers/jobs/update_phone_numbers"
```

Key response fields: `.data.id, .data.status, .data.type`

## Retrieve a phone numbers job

`GET /phone_numbers/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Numbers Job. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/jobs/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.type`

## List phone numbers with messaging settings

`GET /phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[type]` | enum (tollfree, longcode, shortcode) | No | Filter by phone number type. |
| `sort[phone_number]` | enum (asc, desc) | No | Sort by phone number. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/messaging"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`GET /phone_numbers/slim`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `include_connection` | boolean | No | Include the connection associated with the phone number. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/slim?sort=connection_name"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## List phone numbers with voice settings

`GET /phone_numbers/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/voice?sort=connection_name"
```

Key response fields: `.data.id, .data.phone_number, .data.connection_id`

## Retrieve a phone number

`GET /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/1293384261075731499"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Update a phone number

`PATCH /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connection_id` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/1293384261075731499"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Delete a phone number

`DELETE /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/phone_numbers/1293384261075731499"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`PATCH /phone_numbers/{id}/actions/bundle_status_change`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundle_id` | string (UUID) | Yes | The new bundle_id setting for the number. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bundle_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/phone_numbers/1293384261075731499/actions/bundle_status_change"
```

Key response fields: `.data.id, .data.phone_number, .data.connection_id`

## Enable emergency for a phone number

`POST /phone_numbers/{id}/actions/enable_emergency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emergency_enabled` | boolean | Yes | Indicates whether to enable emergency services on this numbe... |
| `emergency_address_id` | string (UUID) | Yes | Identifies the address to be used with emergency services. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "emergency_enabled": true,
  "emergency_address_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/phone_numbers/1293384261075731499/actions/enable_emergency"
```

Key response fields: `.data.id, .data.phone_number, .data.connection_id`

## Retrieve a phone number with messaging settings

`GET /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/550e8400-e29b-41d4-a716-446655440000/messaging"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Update the messaging profile and/or messaging product of a phone number

`PATCH /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The phone number to update. |
| `messaging_profile_id` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messaging_product` | string | No | Configure the messaging product for this number:

* Omit thi... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/550e8400-e29b-41d4-a716-446655440000/messaging"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Retrieve a phone number with voice settings

`GET /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/1293384261075731499/voice"
```

Key response fields: `.data.id, .data.phone_number, .data.connection_id`

## Update a phone number with voice settings

`PATCH /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usage_payment_method` | enum (pay-per-minute, channel) | No | Controls whether a number is billed per minute or uses your ... |
| `inbound_call_screening` | enum (disabled, reject_calls, flag_calls) | No | The inbound_call_screening setting is a phone number configu... |
| `tech_prefix_enabled` | boolean | No | Controls whether a tech prefix is enabled for this phone num... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/1293384261075731499/voice"
```

Key response fields: `.data.id, .data.phone_number, .data.connection_id`

## List Mobile Phone Numbers

`GET /v2/mobile_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/v2/mobile_phone_numbers"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Retrieve a Mobile Phone Number

`GET /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/v2/mobile_phone_numbers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Update a Mobile Phone Number

`PATCH /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |
| `connection_id` | string (UUID) | No |  |
| `tags` | array[string] | No |  |
| `inbound_call_screening` | enum (disabled, reject_calls, flag_calls) | No |  |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/v2/mobile_phone_numbers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
