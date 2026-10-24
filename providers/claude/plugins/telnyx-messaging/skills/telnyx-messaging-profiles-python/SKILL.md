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
  generated_by: telnyx-openapi-pipeline
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
    public_key=os.environ.get("TELNYX_PUBLIC_KEY"),  # Required for client.webhooks.unwrap() (webhook verification)
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
    raise
except telnyx.RateLimitError:
    # 429: rate limited — wait, then retry the request (bounded exponential backoff)
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
    # ...retry the call here (give up after a few attempts); otherwise re-raise:
    raise
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
    raise  # A failed request must never look like success to the caller
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

## List a namespace's profiles

Profiles are never created, only written to, so this lists the ones that hold a memory. A profile whose first ingest is still running is not here yet. Ordered by memory count, largest first, so a profile written to while the listing is paged can move between pages and be repeated or missed.

`GET /ai/memory/namespaces/{namespace}/profiles`

```python
page = client.ai.memory.namespaces.profiles.list(
    "namespace",
)
print(page.data)
```

Returns: `memory_count` (integer), `profile_id` (string)

## Forget a profile's memories

Delete everything held about one profile. A 2xx means none of its memories are left, and its summary goes with them. There is no undo.

`DELETE /ai/memory/namespaces/{namespace}/profiles/{profile_id}`

```python
client.ai.memory.namespaces.profiles.delete(
    "namespace",
    "profile_id",
)
```

Returns: `memories_deleted` (integer), `profile_id` (string)

## List a profile's memories, most recent first

Everything stored under one profile, unranked -- ask `recall` for the memories that answer a question. A profile that holds nothing is an empty page rather than a 404: profiles exist by being written to. Each memory names the `source_id` it was extracted from, or null for a memory derived from other memories -- which can read almost the same as the fact it restates.

`GET /ai/memory/namespaces/{namespace}/profiles/{profile_id}/memories`

```python
page = client.ai.memory.namespaces.profiles.memories.list(
    "namespace",
    "profile_id",
)
print(page.data)
```

Returns: `id` (string), `recorded_at` (object), `source_id` (object), `text` (string)

## Read one memory, and what it came from

One memory by its id, as `recall` and the listing return it, together with what it came from. A fact names its `source_id`: read it with `GET .../sources/{source_id}` to see what was stored. A memory derived from other memories names them in `derived_from` instead; read each of those to reach its source.

`GET /ai/memory/namespaces/{namespace}/profiles/{profile_id}/memories/{memory_id}`

```python
memory = client.ai.memory.namespaces.profiles.memories.retrieve(
    "namespace",
    "profile_id",
    "memory_id",
)
print(memory.data)
```

Returns: `derived_from` (object), `id` (string), `recorded_at` (object), `source_id` (object), `text` (string)

## List messaging profiles

Lists messaging profiles owned by the authenticated account. Apply the documented filters and pagination parameters to narrow the result set.

`GET /messaging_profiles`

```python
page = client.messaging_profiles.list()
page = page.data[0]
print(page.id)
```

Returns: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `health_webhook_url` (url), `id` (uuid), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (object | null), `organization_id` (string), `record_type` (enum: messaging_profile), `redaction_enabled` (boolean), `redaction_level` (integer), `resource_group_id` (string | null), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (object | null), `v1_secret` (string), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

## Create a messaging profile

Creates a messaging profile that controls outbound sender selection, webhook delivery, and inbound message handling for associated numbers and short codes.

`POST /messaging_profiles` — Required: `name`, `whitelisted_destinations`

Optional: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `health_webhook_url` (url), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `number_pool_settings` (object | null), `resource_group_id` (string | null), `smart_encoding` (boolean), `url_shortener_settings` (object | null), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url)

```python
messaging_profile = client.messaging_profiles.create(
    name="My name",
    whitelisted_destinations=["US"],
)
print(messaging_profile.data)
```

Returns: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `health_webhook_url` (url), `id` (uuid), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (object | null), `organization_id` (string), `record_type` (enum: messaging_profile), `redaction_enabled` (boolean), `redaction_level` (integer), `resource_group_id` (string | null), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (object | null), `v1_secret` (string), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

## Retrieve a messaging profile

Returns the complete configuration of the specified messaging profile, including webhook and sender-selection settings.

`GET /messaging_profiles/{id}`

```python
messaging_profile = client.messaging_profiles.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging_profile.data)
```

Returns: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `health_webhook_url` (url), `id` (uuid), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (object | null), `organization_id` (string), `record_type` (enum: messaging_profile), `redaction_enabled` (boolean), `redaction_level` (integer), `resource_group_id` (string | null), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (object | null), `v1_secret` (string), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

## Update a messaging profile

Updates the supplied settings on the specified messaging profile. Settings omitted from the request remain unchanged.

`PATCH /messaging_profiles/{id}`

Optional: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `id` (uuid), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (object | null), `record_type` (enum: messaging_profile), `redaction_enabled` (boolean), `redaction_level` (integer), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (object | null), `v1_secret` (string), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

```python
messaging_profile = client.messaging_profiles.update(
    messaging_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging_profile.data)
```

Returns: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `health_webhook_url` (url), `id` (uuid), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (object | null), `organization_id` (string), `record_type` (enum: messaging_profile), `redaction_enabled` (boolean), `redaction_level` (integer), `resource_group_id` (string | null), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (object | null), `v1_secret` (string), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

## Delete a messaging profile

Deletes the specified messaging profile and returns the profile's final configuration.

`DELETE /messaging_profiles/{id}`

```python
messaging_profile = client.messaging_profiles.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging_profile.data)
```

Returns: `ai_assistant_id` (string | null), `alpha_sender` (string | null), `created_at` (date-time), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `features` (object | null), `health_webhook_url` (url), `id` (uuid), `mm7_metadata` (object | null), `mms_fall_back_to_sms` (boolean), `mms_transcoding` (boolean), `mobile_only` (boolean), `name` (string), `number_pool_settings` (object | null), `organization_id` (string), `record_type` (enum: messaging_profile), `redaction_enabled` (boolean), `redaction_level` (integer), `resource_group_id` (string | null), `smart_encoding` (boolean), `updated_at` (date-time), `url_shortener_settings` (object | null), `v1_secret` (string), `webhook_api_version` (enum: 1, 2, 2010-04-01), `webhook_failover_url` (url), `webhook_url` (url), `whitelisted_destinations` (array[string])

## List phone numbers associated with a messaging profile

Returns the phone numbers currently associated with the specified messaging profile.

`GET /messaging_profiles/{id}/phone_numbers`

```python
page = client.messaging_profiles.list_phone_numbers(
    messaging_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Returns: `country_code` (string), `created_at` (date-time), `eligible_messaging_products` (array[string]), `features` (object), `health` (object), `id` (string), `messaging_product` (string), `messaging_profile_id` (string | null), `organization_id` (string), `phone_number` (string), `record_type` (enum: messaging_phone_number, messaging_settings), `tags` (array[string]), `traffic_type` (string), `type` (enum: long-code, toll-free, short-code, longcode, tollfree, shortcode), `updated_at` (date-time)

## List short codes associated with a messaging profile

Returns the short codes currently associated with the specified messaging profile.

`GET /messaging_profiles/{id}/short_codes`

```python
page = client.messaging_profiles.list_short_codes(
    messaging_profile_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.messaging_profile_id)
```

Returns: `country_code` (string), `created_at` (date-time), `id` (uuid), `messaging_profile_id` (string | null), `record_type` (enum: short_code), `short_code` (string), `tags` (array), `updated_at` (date-time)

## List short codes

Returns short codes owned by the authenticated account. Apply the documented filters and pagination parameters to narrow the result set.

`GET /short_codes`

```python
page = client.short_codes.list()
page = page.data[0]
print(page.messaging_profile_id)
```

Returns: `country_code` (string), `created_at` (date-time), `id` (uuid), `messaging_profile_id` (string | null), `record_type` (enum: short_code), `short_code` (string), `tags` (array), `updated_at` (date-time)

## Retrieve a short code

Returns the messaging configuration and assignment details for the specified short code.

`GET /short_codes/{id}`

```python
short_code = client.short_codes.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(short_code.data)
```

Returns: `country_code` (string), `created_at` (date-time), `id` (uuid), `messaging_profile_id` (string | null), `record_type` (enum: short_code), `short_code` (string), `tags` (array), `updated_at` (date-time)

## Update short code

Update the settings for a specific short code. To unbind a short code from a profile, set the `messaging_profile_id` to `null` or an empty string. To add or update tags, include the tags field as an array of strings.

`PATCH /short_codes/{id}` — Required: `messaging_profile_id`

Optional: `tags` (array)

```python
short_code = client.short_codes.update(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    messaging_profile_id="abc85f64-5717-4562-b3fc-2c9600000000",
)
print(short_code.data)
```

Returns: `country_code` (string), `created_at` (date-time), `id` (uuid), `messaging_profile_id` (string | null), `record_type` (enum: short_code), `short_code` (string), `tags` (array), `updated_at` (date-time)
