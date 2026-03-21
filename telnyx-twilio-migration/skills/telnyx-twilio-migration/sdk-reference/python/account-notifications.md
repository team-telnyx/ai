<!-- SDK reference: telnyx-account-notifications-python -->

# Telnyx Account Notifications - Python

## Core Workflow

### Steps

1. **Create notification channel**: `client.notification_channels.create(channel_type_id=..., channel_destination=...)`
2. **Create notification profile**: `client.notification_profiles.create(name=...)`

### Common mistakes

- Notification channels must be verified before they receive alerts

**Related skills**: telnyx-account-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.notification_channels.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List notification channels

List notification channels.

`client.notification_channels.list()` — `GET /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.notification_channels.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a notification channel

Create a notification channel.

`client.notification_channels.create()` — `POST /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_profile_id` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```python
notification_channel = client.notification_channels.create(
    channel_type_id="webhook",
    channel_destination="https://example.com/webhooks",
)
print(notification_channel.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a notification channel

Get a notification channel.

`client.notification_channels.retrieve()` — `GET /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```python
notification_channel = client.notification_channels.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_channel.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a notification channel

Update a notification channel.

`client.notification_channels.update()` — `PATCH /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `notification_profile_id` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```python
notification_channel = client.notification_channels.update(
    notification_channel_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_channel.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a notification channel

Delete a notification channel.

`client.notification_channels.delete()` — `DELETE /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```python
notification_channel = client.notification_channels.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_channel.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`client.notification_event_conditions.list()` — `GET /notification_event_conditions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.notification_event_conditions.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Events

Returns a list of your notifications events.

`client.notification_events.list()` — `GET /notification_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.notification_events.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Profiles

Returns a list of your notifications profiles.

`client.notification_profiles.list()` — `GET /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.notification_profiles.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a notification profile

Create a notification profile.

`client.notification_profiles.create()` — `POST /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `created_at` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```python
notification_profile = client.notification_profiles.create(
    name="My Notification Profile",
)
print(notification_profile.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a notification profile

Get a notification profile.

`client.notification_profiles.retrieve()` — `GET /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```python
notification_profile = client.notification_profiles.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_profile.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a notification profile

Update a notification profile.

`client.notification_profiles.update()` — `PATCH /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `created_at` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```python
notification_profile = client.notification_profiles.update(
    notification_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_profile.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a notification profile

Delete a notification profile.

`client.notification_profiles.delete()` — `DELETE /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```python
notification_profile = client.notification_profiles.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_profile.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List notification settings

List notification settings.

`client.notification_settings.list()` — `GET /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.notification_settings.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Add a Notification Setting

Add a notification setting.

`client.notification_settings.create()` — `POST /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_event_condition_id` | string (UUID) | No | A UUID reference to the associated Notification Event Condit... |
| `notification_profile_id` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | No | Most preferences apply immediately; however, other may needs... |
| ... | | | +7 optional params in the API Details section below |

```python
notification_setting = client.notification_settings.create()
print(notification_setting.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a notification setting

Get a notification setting.

`client.notification_settings.retrieve()` — `GET /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```python
notification_setting = client.notification_settings.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_setting.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a notification setting

Delete a notification setting.

`client.notification_settings.delete()` — `DELETE /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```python
notification_setting = client.notification_settings.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_setting.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

# Account Notifications (Python) — API Details

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

### Create a notification channel — `client.notification_channels.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notification_profile_id` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channel_destination` | string | The destination associated with the channel type. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification channel — `client.notification_channels.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notification_profile_id` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channel_type_id` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channel_destination` | string | The destination associated with the channel type. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Create a notification profile — `client.notification_profiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification profile — `client.notification_profiles.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `created_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updated_at` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Add a Notification Setting — `client.notification_settings.create()`

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
