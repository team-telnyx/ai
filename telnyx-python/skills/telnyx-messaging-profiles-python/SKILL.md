---
name: telnyx-messaging-profiles-python
description: >-
  Create and manage messaging profiles with number pools, sticky sender, and
  geomatch features. Configure short codes for high-volume messaging. This skill
  provides Python SDK examples.
metadata:
  author: telnyx
  product: messaging-profiles
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Profiles - Python

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

## List messaging profiles

`GET /messaging_profiles`

```python
page = client.messaging_profiles.list()
page = page.data[0]
print(page.id)
```

## Create a messaging profile

`POST /messaging_profiles` — Required: `name`, `whitelisted_destinations`

Optional: `ai_assistant_id` (['string', 'null']), `alpha_sender` (['string', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `health_webhook_url` (url), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `number_pool_settings` (['object', 'null']), `resource_group_id` (['string', 'null']), `smart_encoding` (boolean), `url_shortener_settings` (['object', 'null']), `webhook_api_version` (enum), `webhook_failover_url` (url), `webhook_url` (url)

```python
messaging_profile = client.messaging_profiles.create(
    name="My name",
    whitelisted_destinations=["US"],
)
print(messaging_profile.data)
```

## Retrieve a messaging profile

`GET /messaging_profiles/{id}`

```python
messaging_profile = client.messaging_profiles.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging_profile.data)
```

## Update a messaging profile

`PATCH /messaging_profiles/{id}`

Optional: `alpha_sender` (['string', 'null']), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (uuid), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (['object', 'null']), `record_type` (enum), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (['object', 'null']), `v1_secret` (string), `webhook_api_version` (enum), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

```python
messaging_profile = client.messaging_profiles.update(
    messaging_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging_profile.data)
```

## Delete a messaging profile

`DELETE /messaging_profiles/{id}`

```python
messaging_profile = client.messaging_profiles.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging_profile.data)
```

## List phone numbers associated with a messaging profile

`GET /messaging_profiles/{id}/phone_numbers`

```python
page = client.messaging_profiles.list_phone_numbers(
    messaging_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## List short codes associated with a messaging profile

`GET /messaging_profiles/{id}/short_codes`

```python
page = client.messaging_profiles.list_short_codes(
    messaging_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.messaging_profile_id)
```

## List short codes

`GET /short_codes`

```python
page = client.short_codes.list()
page = page.data[0]
print(page.messaging_profile_id)
```

## Retrieve a short code

`GET /short_codes/{id}`

```python
short_code = client.short_codes.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(short_code.data)
```

## Update short code

Update the settings for a specific short code.

`PATCH /short_codes/{id}` — Required: `messaging_profile_id`

Optional: `tags` (['array'])

```python
short_code = client.short_codes.update(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    messaging_profile_id="abc85f64-5717-4562-b3fc-2c9600000000",
)
print(short_code.data)
```
