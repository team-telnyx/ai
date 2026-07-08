<!-- SDK reference: telnyx-account-notifications-python -->

# Telnyx Account Notifications - Python

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
    result = client.messages.send(to="+13125550001", from_="+13125550002", text="Hello")
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

## List notification channels

List notification channels.

`GET /notification_channels`

```python
page = client.notification_channels.list()
page = page.data[0]
print(page.id)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Create a notification channel

Create a notification channel.

`POST /notification_channels`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

```python
notification_channel = client.notification_channels.create(
    channel_type_id="webhook",
    channel_destination="https://example.com/webhooks",
)
print(notification_channel.data)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Get a notification channel

Get a notification channel.

`GET /notification_channels/{id}`

```python
notification_channel = client.notification_channels.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_channel.data)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Update a notification channel

Update a notification channel.

`PATCH /notification_channels/{id}`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

```python
notification_channel = client.notification_channels.update(
    notification_channel_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_channel.data)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Delete a notification channel

Delete a notification channel.

`DELETE /notification_channels/{id}`

```python
notification_channel = client.notification_channels.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_channel.data)
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`GET /notification_event_conditions`

```python
page = client.notification_event_conditions.list()
page = page.data[0]
print(page.id)
```

Returns: `allow_multiple_channels` (boolean), `associated_record_type` (enum: account, phone_number), `asynchronous` (boolean), `created_at` (date-time), `description` (string), `enabled` (boolean), `id` (string), `name` (string), `notification_event_id` (string), `parameters` (array[object]), `supported_channels` (array[string]), `updated_at` (date-time)

## List all Notifications Events

Returns a list of your notifications events.

`GET /notification_events`

```python
page = client.notification_events.list()
page = page.data[0]
print(page.id)
```

Returns: `created_at` (date-time), `enabled` (boolean), `id` (string), `name` (string), `notification_category` (string), `updated_at` (date-time)

## List all Notifications Profiles

Returns a list of your notifications profiles.

`GET /notification_profiles`

```python
page = client.notification_profiles.list()
page = page.data[0]
print(page.id)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Create a notification profile

Create a notification profile.

`POST /notification_profiles`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

```python
notification_profile = client.notification_profiles.create(
    name="My Notification Profile",
)
print(notification_profile.data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Get a notification profile

Get a notification profile.

`GET /notification_profiles/{id}`

```python
notification_profile = client.notification_profiles.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_profile.data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Update a notification profile

Update a notification profile.

`PATCH /notification_profiles/{id}`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

```python
notification_profile = client.notification_profiles.update(
    notification_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_profile.data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Delete a notification profile

Delete a notification profile.

`DELETE /notification_profiles/{id}`

```python
notification_profile = client.notification_profiles.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_profile.data)
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## List notification settings

List notification settings.

`GET /notification_settings`

```python
page = client.notification_settings.list()
page = page.data[0]
print(page.id)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Add a Notification Setting

Add a notification setting.

`POST /notification_settings`

Optional: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

```python
notification_setting = client.notification_settings.create()
print(notification_setting.data)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Get a notification setting

Get a notification setting.

`GET /notification_settings/{id}`

```python
notification_setting = client.notification_settings.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_setting.data)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Delete a notification setting

Delete a notification setting.

`DELETE /notification_settings/{id}`

```python
notification_setting = client.notification_settings.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(notification_setting.data)
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)
