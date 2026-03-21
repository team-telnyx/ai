<!-- SDK reference: telnyx-account-notifications-curl -->

# Telnyx Account Notifications - curl

## Core Workflow

### Steps

1. **Create notification channel**
2. **Create notification profile**

### Common mistakes

- Notification channels must be verified before they receive alerts

**Related skills**: telnyx-account-curl

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
## List notification channels

List notification channels.

`GET /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_channels"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a notification channel

Create a notification channel.

`POST /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_profile_id` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "channel_type_id": "webhook",
      "channel_destination": "https://example.com/webhooks"
  }' \
  "https://api.telnyx.com/v2/notification_channels"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get a notification channel

Get a notification channel.

`GET /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_channels/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a notification channel

Update a notification channel.

`PATCH /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `notification_profile_id` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/notification_channels/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete a notification channel

Delete a notification channel.

`DELETE /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/notification_channels/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`GET /notification_event_conditions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_event_conditions"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List all Notifications Events

Returns a list of your notifications events.

`GET /notification_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_events"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List all Notifications Profiles

Returns a list of your notifications profiles.

`GET /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_profiles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create a notification profile

Create a notification profile.

`POST /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `created_at` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "name": "My Notification Profile"
  }' \
  "https://api.telnyx.com/v2/notification_profiles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get a notification profile

Get a notification profile.

`GET /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_profiles/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a notification profile

Update a notification profile.

`PATCH /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `created_at` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/notification_profiles/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a notification profile

Delete a notification profile.

`DELETE /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/notification_profiles/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List notification settings

List notification settings.

`GET /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_settings"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Add a Notification Setting

Add a notification setting.

`POST /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_event_condition_id` | string (UUID) | No | A UUID reference to the associated Notification Event Condit... |
| `notification_profile_id` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | No | Most preferences apply immediately; however, other may needs... |
| ... | | | +7 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/notification_settings"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a notification setting

Get a notification setting.

`GET /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/notification_settings/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a notification setting

Delete a notification setting.

`DELETE /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/notification_settings/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

---

# Account Notifications (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List notification channels, Create a notification channel, Get a notification channel, Update a notification channel, Delete a notification channel

| Field | Type |
|-------|------|
| `channel_destination` | string |
| `channel_type_id` | enum: sms, voice, email, webhook |
| `created_at` | date-time |
| `id` | string |
| `notification_profile_id` | string |
| `updated_at` | date-time |

**Returned by:** List all Notifications Events Conditions

| Field | Type |
|-------|------|
| `allow_multiple_channels` | boolean |
| `associated_record_type` | enum: account, phone_number |
| `asynchronous` | boolean |
| `created_at` | date-time |
| `description` | string |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `notification_event_id` | string |
| `parameters` | array[object] |
| `supported_channels` | array[string] |
| `updated_at` | date-time |

**Returned by:** List all Notifications Events

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `notification_category` | string |
| `updated_at` | date-time |

**Returned by:** List all Notifications Profiles, Create a notification profile, Get a notification profile, Update a notification profile, Delete a notification profile

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `name` | string |
| `updated_at` | date-time |

**Returned by:** List notification settings, Add a Notification Setting, Get a notification setting, Delete a notification setting

| Field | Type |
|-------|------|
| `associated_record_type` | string |
| `associated_record_type_value` | string |
| `created_at` | date-time |
| `id` | string |
| `notification_channel_id` | string |
| `notification_event_condition_id` | string |
| `notification_profile_id` | string |
| `parameters` | array[object] |
| `status` | enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted |
| `updated_at` | date-time |

## Optional Parameters

### Create a notification channel

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notification_profile_id` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channel_destination` | string | The destination associated with the channel type. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification channel

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notification_profile_id` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channel_destination` | string | The destination associated with the channel type. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Create a notification profile

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification profile

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Add a Notification Setting

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notification_event_condition_id` | string (UUID) | A UUID reference to the associated Notification Event Condition. |
| `notification_profile_id` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `associated_record_type` | string |  |
| `associated_record_type_value` | string |  |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | Most preferences apply immediately; however, other may needs to propagate. |
| `notification_channel_id` | string (UUID) | A UUID reference to the associated Notification Channel. |
| `parameters` | array[object] |  |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
