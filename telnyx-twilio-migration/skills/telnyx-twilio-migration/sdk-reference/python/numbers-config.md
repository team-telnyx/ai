<!-- SDK reference: telnyx-numbers-config-python -->

# Telnyx Numbers Config - Python

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-python)

### Steps

1. **List your numbers**: `client.phone_numbers.list()`
2. **Update voice settings**: `client.phone_numbers.voice.update(id=..., connection_id=...)`
3. **Update messaging settings**: `client.phone_numbers.messaging.update(id=..., messaging_profile_id=...)`

### Common mistakes

- Use phone_numbers.voice.update() for voice/connection settings and phone_numbers.messaging.update() for messaging/profile settings — they are SEPARATE endpoints
- Bulk operations are available for updating many numbers at once — see bulk_phone_number_operations endpoints

**Related skills**: telnyx-numbers-python, telnyx-messaging-profiles-python, telnyx-voice-python

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
    result = client.phone_numbers.list(params)
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Bulk update phone number profiles

`client.messaging_numbers_bulk_updates.create()` — `POST /messaging_numbers_bulk_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Configure the messaging profile these phone numbers are assi... |
| `numbers` | array[string] | Yes | The list of phone numbers to update. |
| `assign_only` | boolean | No | If true, only assign numbers to the profile without changing... |

```python
messaging_numbers_bulk_update = client.messaging_numbers_bulk_updates.create(
    messaging_profile_id="00000000-0000-0000-0000-000000000000",
    numbers=["+18880000000", "+18880000001", "+18880000002"],
)
print(messaging_numbers_bulk_update.data)
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## Retrieve bulk update status

`client.messaging_numbers_bulk_updates.retrieve()` — `GET /messaging_numbers_bulk_updates/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes | Order ID to verify bulk update status. |

```python
messaging_numbers_bulk_update = client.messaging_numbers_bulk_updates.retrieve(
    "order_id",
)
print(messaging_numbers_bulk_update.data)
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## List mobile phone numbers with messaging settings

`client.mobile_phone_numbers.messaging.list()` — `GET /mobile_phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.mobile_phone_numbers.messaging.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a mobile phone number with messaging settings

`client.mobile_phone_numbers.messaging.retrieve()` — `GET /mobile_phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```python
messaging = client.mobile_phone_numbers.messaging.retrieve(
    "id",
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List phone numbers

`client.phone_numbers.list()` — `GET /phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `handle_messaging_profile_error` | enum (true, false) | No | Although it is an infrequent occurrence, due to the highly d... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```python
page = client.phone_numbers.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`client.phone_numbers.actions.verify_ownership()` — `POST /phone_numbers/actions/verify_ownership`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | Array of phone numbers to verify ownership for |

```python
response = client.phone_numbers.actions.verify_ownership(
    phone_numbers=["+15551234567"],
)
print(response.data)
```

Key response fields: `response.data.found, response.data.not_found, response.data.record_type`

## Lists the phone numbers jobs

`client.phone_numbers.jobs.list()` — `GET /phone_numbers/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.phone_numbers.jobs.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`client.phone_numbers.jobs.delete_batch()` — `POST /phone_numbers/jobs/delete_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |

```python
response = client.phone_numbers.jobs.delete_batch(
    phone_numbers=["+19705555098", "+19715555098", "32873127836"],
)
print(response.data)
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

```python
response = client.phone_numbers.jobs.update_emergency_settings_batch(
    emergency_enabled=True,
    phone_numbers=["+19705555098", "+19715555098", "32873127836"],
)
print(response.data)
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
| ... | | | +6 optional params in the API Details section below |

```python
response = client.phone_numbers.jobs.update_batch(
    phone_numbers=["1583466971586889004", "+13127367254"],
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieve a phone numbers job

`client.phone_numbers.jobs.retrieve()` — `GET /phone_numbers/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Numbers Job. |

```python
job = client.phone_numbers.jobs.retrieve(
    "id",
)
print(job.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List phone numbers with messaging settings

`client.phone_numbers.messaging.list()` — `GET /phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[type]` | enum (tollfree, longcode, shortcode) | No | Filter by phone number type. |
| `sort[phone_number]` | enum (asc, desc) | No | Sort by phone number. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +3 optional params in the API Details section below |

```python
page = client.phone_numbers.messaging.list()
page = page.data[0]
print(page.id)
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
| ... | | | +2 optional params in the API Details section below |

```python
page = client.phone_numbers.slim_list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List phone numbers with voice settings

`client.phone_numbers.voice.list()` — `GET /phone_numbers/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.phone_numbers.voice.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number

`client.phone_numbers.retrieve()` — `GET /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
phone_number = client.phone_numbers.retrieve(
    "1293384261075731499",
)
print(phone_number.data)
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
| ... | | | +5 optional params in the API Details section below |

```python
phone_number = client.phone_numbers.update(
    phone_number_id="1293384261075731499",
)
print(phone_number.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Delete a phone number

`client.phone_numbers.delete()` — `DELETE /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
phone_number = client.phone_numbers.delete(
    "1293384261075731499",
)
print(phone_number.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`client.phone_numbers.actions.change_bundle_status()` — `PATCH /phone_numbers/{id}/actions/bundle_status_change`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundle_id` | string (UUID) | Yes | The new bundle_id setting for the number. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.phone_numbers.actions.change_bundle_status(
    id="1293384261075731499",
    bundle_id="5194d8fc-87e6-4188-baa9-1c434bbe861b",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Enable emergency for a phone number

`client.phone_numbers.actions.enable_emergency()` — `POST /phone_numbers/{id}/actions/enable_emergency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emergency_enabled` | boolean | Yes | Indicates whether to enable emergency services on this numbe... |
| `emergency_address_id` | string (UUID) | Yes | Identifies the address to be used with emergency services. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.phone_numbers.actions.enable_emergency(
    id="1293384261075731499",
    emergency_address_id="53829456729313",
    emergency_enabled=True,
)
print(response.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number with messaging settings

`client.phone_numbers.messaging.retrieve()` — `GET /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```python
messaging = client.phone_numbers.messaging.retrieve(
    "id",
)
print(messaging.data)
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

```python
messaging = client.phone_numbers.messaging.update(
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a phone number with voice settings

`client.phone_numbers.voice.retrieve()` — `GET /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
voice = client.phone_numbers.voice.retrieve(
    "1293384261075731499",
)
print(voice.data)
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
| ... | | | +6 optional params in the API Details section below |

```python
voice = client.phone_numbers.voice.update(
    id="1293384261075731499",
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## List Mobile Phone Numbers

`client.mobile_phone_numbers.list()` — `GET /v2/mobile_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```python
page = client.mobile_phone_numbers.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a Mobile Phone Number

`client.mobile_phone_numbers.retrieve()` — `GET /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |

```python
mobile_phone_number = client.mobile_phone_numbers.retrieve(
    "id",
)
print(mobile_phone_number.data)
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
| ... | | | +8 optional params in the API Details section below |

```python
mobile_phone_number = client.mobile_phone_numbers.update(
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(mobile_phone_number.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

---

# Numbers Config (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Bulk update phone number profiles, Retrieve bulk update status

| Field | Type |
|-------|------|
| `failed` | array[string] |
| `order_id` | uuid |
| `pending` | array[string] |
| `record_type` | enum: messaging_numbers_bulk_update |
| `success` | array[string] |

**Returned by:** List mobile phone numbers with messaging settings, Retrieve a mobile phone number with messaging settings

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `features` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: longcode |
| `updated_at` | date-time |

**Returned by:** List phone numbers, Retrieve a phone number, Update a phone number

| Field | Type |
|-------|------|
| `billing_group_id` | string \| null |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string \| null |
| `connection_name` | string \| null |
| `country_iso_alpha2` | string |
| `created_at` | date-time |
| `customer_reference` | string \| null |
| `deletion_lock_enabled` | boolean |
| `emergency_address_id` | string \| null |
| `emergency_enabled` | boolean |
| `emergency_status` | enum: active, deprovisioning, disabled, provisioning, provisioning-failed |
| `external_pin` | string \| null |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `messaging_profile_id` | string \| null |
| `messaging_profile_name` | string \| null |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode |
| `purchased_at` | string |
| `record_type` | string |
| `source_type` | object |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending |
| `t38_fax_gateway_enabled` | boolean |
| `tags` | array[string] |
| `updated_at` | string |

**Returned by:** Verify ownership of phone numbers

| Field | Type |
|-------|------|
| `found` | array[object] |
| `not_found` | array[string] |
| `record_type` | string |

**Returned by:** Lists the phone numbers jobs, Delete a batch of numbers, Update the emergency settings from a batch of numbers, Update a batch of numbers, Retrieve a phone numbers job

| Field | Type |
|-------|------|
| `created_at` | string |
| `etc` | date-time |
| `failed_operations` | array[object] |
| `id` | uuid |
| `pending_operations` | array[object] |
| `phone_numbers` | array[object] |
| `record_type` | string |
| `status` | enum: pending, in_progress, completed, failed, expired |
| `successful_operations` | array[object] |
| `type` | enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers |
| `updated_at` | string |

**Returned by:** List phone numbers with messaging settings, Retrieve a phone number with messaging settings, Update the messaging profile and/or messaging product of a phone number

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

**Returned by:** Slim List phone numbers

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string |
| `country_iso_alpha2` | string |
| `created_at` | string |
| `customer_reference` | string |
| `emergency_address_id` | string |
| `emergency_enabled` | boolean |
| `emergency_status` | enum: active, deprovisioning, disabled, provisioning, provisioning-failed |
| `external_pin` | string |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode |
| `purchased_at` | string |
| `record_type` | string |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending |
| `t38_fax_gateway_enabled` | boolean |
| `updated_at` | string |

**Returned by:** List phone numbers with voice settings, Change the bundle status for a phone number (set to being in a bundle or remove from a bundle), Enable emergency for a phone number, Retrieve a phone number with voice settings, Update a phone number with voice settings

| Field | Type |
|-------|------|
| `call_forwarding` | object |
| `call_recording` | object |
| `cnam_listing` | object |
| `connection_id` | string |
| `customer_reference` | string |
| `emergency` | object |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `media_features` | object |
| `phone_number` | string |
| `record_type` | string |
| `tech_prefix_enabled` | boolean |
| `translated_number` | string |
| `usage_payment_method` | enum: pay-per-minute, channel |

**Returned by:** Delete a phone number

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string |
| `connection_name` | string |
| `created_at` | string |
| `customer_reference` | string |
| `deletion_lock_enabled` | boolean |
| `emergency_address_id` | string |
| `emergency_enabled` | boolean |
| `external_pin` | string |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `messaging_profile_id` | string |
| `messaging_profile_name` | string |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline |
| `purchased_at` | string |
| `record_type` | string |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending |
| `t38_fax_gateway_enabled` | boolean |
| `tags` | array[string] |
| `updated_at` | string |

**Returned by:** List Mobile Phone Numbers, Retrieve a Mobile Phone Number, Update a Mobile Phone Number

| Field | Type |
|-------|------|
| `call_forwarding` | object |
| `call_recording` | object |
| `caller_id_name_enabled` | boolean |
| `cnam_listing` | object |
| `connection_id` | string \| null |
| `connection_name` | string \| null |
| `connection_type` | string \| null |
| `country_iso_alpha2` | string |
| `created_at` | date-time |
| `customer_reference` | string \| null |
| `id` | string |
| `inbound` | object |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `mobile_voice_enabled` | boolean |
| `noise_suppression` | enum: inbound, outbound, both, disabled |
| `outbound` | object |
| `phone_number` | string |
| `record_type` | string |
| `sim_card_id` | uuid |
| `status` | string |
| `tags` | array[string] |
| `updated_at` | date-time |

## Optional Parameters

### Bulk update phone number profiles — `client.messaging_numbers_bulk_updates.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `assign_only` | boolean | If true, only assign numbers to the profile without changing other settings. |

### Update the emergency settings from a batch of numbers — `client.phone_numbers.jobs.update_emergency_settings_batch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `emergency_address_id` | string (UUID) | Identifies the address to be used with emergency services. |

### Update a batch of numbers — `client.phone_numbers.jobs.update_batch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `external_pin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `customer_reference` | string | A customer reference string for customer look ups. |
| `connection_id` | string (UUID) | Identifies the connection associated with the phone number. |
| `billing_group_id` | string (UUID) | Identifies the billing group associated with the phone number. |
| `hd_voice_enabled` | boolean | Indicates whether to enable or disable HD Voice on each phone number. |
| `deletion_lock_enabled` | boolean | Indicates whether to enable or disable the deletion lock on each phone number. |
| `voice` | object |  |
| `filter` | object | Consolidated filter parameter (deepObject style). |

### Update a phone number — `client.phone_numbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the type of resource. |
| `tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `external_pin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `hd_voice_enabled` | boolean | Indicates whether HD voice is enabled for this number. |
| `customer_reference` | string | A customer reference string for customer look ups. |
| `address_id` | string (UUID) | Identifies the address associated with the phone number. |
| `connection_id` | string (UUID) | Identifies the connection associated with the phone number. |
| `billing_group_id` | string (UUID) | Identifies the billing group associated with the phone number. |

### Update the messaging profile and/or messaging product of a phone number — `client.phone_numbers.messaging.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `messaging_profile_id` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `messaging_product` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `tags` | array[string] | Tags to set on this phone number. |

### Update a phone number with voice settings — `client.phone_numbers.voice.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tech_prefix_enabled` | boolean | Controls whether a tech prefix is enabled for this phone number. |
| `translated_number` | string | This field allows you to rewrite the destination number of an inbound call be... |
| `caller_id_name_enabled` | boolean | Controls whether the caller ID name is enabled for this phone number. |
| `call_forwarding` | object | The call forwarding settings for a phone number. |
| `cnam_listing` | object | The CNAM listing settings for a phone number. |
| `usage_payment_method` | enum (pay-per-minute, channel) | Controls whether a number is billed per minute or uses your concurrent channels. |
| `media_features` | object | The media features settings for a phone number. |
| `call_recording` | object | The call recording settings for a phone number. |
| `inbound_call_screening` | enum (disabled, reject_calls, flag_calls) | The inbound_call_screening setting is a phone number configuration option var... |

### Update a Mobile Phone Number — `client.mobile_phone_numbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer_reference` | string |  |
| `connection_id` | string (UUID) |  |
| `noise_suppression` | boolean |  |
| `inbound_call_screening` | enum (disabled, reject_calls, flag_calls) |  |
| `caller_id_name_enabled` | boolean |  |
| `tags` | array[string] |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `call_forwarding` | object |  |
| `cnam_listing` | object |  |
| `call_recording` | object |  |
