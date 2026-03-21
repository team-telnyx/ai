<!-- SDK reference: telnyx-numbers-services-python -->

# Telnyx Numbers Services - Python

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-python)

### Steps

1. **Set up voicemail**: `client.voicemail.create(phone_number_id=...)`
2. **Configure E911**: `client.dynamic_emergency_endpoints.create(...)`

### Common mistakes

- E911 addresses must be validated — invalid addresses will cause regulatory issues

**Related skills**: telnyx-numbers-python, telnyx-numbers-config-python

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
    result = client.voicemail.create(params)
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
## List your voice channels for non-US zones

Returns the non-US voice channels for your account. voice channels allow you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.channel_zones.list()` — `GET /channel_zones`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.channel_zones.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones. This allows your account to handle multiple simultaneous inbound calls to Non-US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.channel_zones.update()` — `PUT /channel_zones/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The number of reserved channels |

```python
channel_zone = client.channel_zones.update(
    channel_zone_id="550e8400-e29b-41d4-a716-446655440000",
    channels=0,
)
print(channel_zone.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`client.dynamic_emergency_addresses.list()` — `GET /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.dynamic_emergency_addresses.list()
page = page.data[0]
print(page.id)
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
| ... | | | +8 optional params in the API Details section below |

```python
dynamic_emergency_address = client.dynamic_emergency_addresses.create(
    administrative_area="TX",
    country_code="US",
    house_number="600",
    locality="Austin",
    postal_code="78701",
    street_name="Congress",
)
print(dynamic_emergency_address.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`client.dynamic_emergency_addresses.retrieve()` — `GET /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```python
dynamic_emergency_address = client.dynamic_emergency_addresses.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(dynamic_emergency_address.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`client.dynamic_emergency_addresses.delete()` — `DELETE /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```python
dynamic_emergency_address = client.dynamic_emergency_addresses.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(dynamic_emergency_address.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`client.dynamic_emergency_endpoints.list()` — `GET /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.dynamic_emergency_endpoints.list()
page = page.data[0]
print(page.dynamic_emergency_address_id)
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
| ... | | | +3 optional params in the API Details section below |

```python
dynamic_emergency_endpoint = client.dynamic_emergency_endpoints.create(
    callback_number="+13125550000",
    caller_name="Jane Doe Desk Phone",
    dynamic_emergency_address_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(dynamic_emergency_endpoint.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`client.dynamic_emergency_endpoints.retrieve()` — `GET /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```python
dynamic_emergency_endpoint = client.dynamic_emergency_endpoints.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(dynamic_emergency_endpoint.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`client.dynamic_emergency_endpoints.delete()` — `DELETE /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```python
dynamic_emergency_endpoint = client.dynamic_emergency_endpoints.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(dynamic_emergency_endpoint.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List your voice channels for US Zone

Returns the US Zone voice channels for your account. voice channels allows you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.inbound_channels.list()` — `GET /inbound_channels`

```python
inbound_channels = client.inbound_channels.list()
print(inbound_channels.data)
```

Key response fields: `response.data.channels, response.data.record_type`

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone. This allows your account to handle multiple simultaneous inbound calls to US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.inbound_channels.update()` — `PATCH /inbound_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The new number of concurrent channels for the account |

```python
inbound_channel = client.inbound_channels.update(
    channels=7,
)
print(inbound_channel.data)
```

Key response fields: `response.data.channels, response.data.record_type`

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`client.list.retrieve_all()` — `GET /list`

```python
response = client.list.retrieve_all()
print(response.data)
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`client.list.retrieve_by_zone()` — `GET /list/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_zone_id` | string (UUID) | Yes | Channel zone identifier |

```python
response = client.list.retrieve_by_zone(
    "channel_zone_id",
)
print(response.data)
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## Get voicemail

Returns the voicemail settings for a phone number

`client.phone_numbers.voicemail.retrieve()` — `GET /phone_numbers/{phone_number_id}/voicemail`

```python
voicemail = client.phone_numbers.voicemail.retrieve(
    "123455678900",
)
print(voicemail.data)
```

Key response fields: `response.data.enabled, response.data.pin`

## Create voicemail

Create voicemail settings for a phone number

`client.phone_numbers.voicemail.create()` — `POST /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```python
voicemail = client.phone_numbers.voicemail.create(
    phone_number_id="123455678900",
)
print(voicemail.data)
```

Key response fields: `response.data.enabled, response.data.pin`

## Update voicemail

Update voicemail settings for a phone number

`client.phone_numbers.voicemail.update()` — `PATCH /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```python
voicemail = client.phone_numbers.voicemail.update(
    phone_number_id="123455678900",
)
print(voicemail.data)
```

Key response fields: `response.data.enabled, response.data.pin`

---

# Numbers Services (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List your voice channels for non-US zones, Update voice channels for non-US Zones

| Field | Type |
|-------|------|
| `channels` | int64 |
| `countries` | array[string] |
| `created_at` | string |
| `id` | string |
| `name` | string |
| `record_type` | enum: channel_zone |
| `updated_at` | string |

**Returned by:** List dynamic emergency addresses, Create a dynamic emergency address., Get a dynamic emergency address, Delete a dynamic emergency address

| Field | Type |
|-------|------|
| `administrative_area` | string |
| `country_code` | enum: US, CA, PR |
| `created_at` | string |
| `extended_address` | string |
| `house_number` | string |
| `house_suffix` | string |
| `id` | string |
| `locality` | string |
| `postal_code` | string |
| `record_type` | string |
| `sip_geolocation_id` | string |
| `status` | enum: pending, activated, rejected |
| `street_name` | string |
| `street_post_directional` | string |
| `street_pre_directional` | string |
| `street_suffix` | string |
| `updated_at` | string |

**Returned by:** List dynamic emergency endpoints, Create a dynamic emergency endpoint., Get a dynamic emergency endpoint, Delete a dynamic emergency endpoint

| Field | Type |
|-------|------|
| `callback_number` | string |
| `caller_name` | string |
| `created_at` | string |
| `dynamic_emergency_address_id` | string |
| `id` | string |
| `record_type` | string |
| `sip_from_id` | string |
| `status` | enum: pending, activated, rejected |
| `updated_at` | string |

**Returned by:** List your voice channels for US Zone, Update voice channels for US Zone

| Field | Type |
|-------|------|
| `channels` | integer |
| `record_type` | string |

**Returned by:** List All Numbers using Channel Billing, List Numbers using Channel Billing for a specific Zone

| Field | Type |
|-------|------|
| `number_of_channels` | integer |
| `numbers` | array[object] |
| `zone_id` | string |
| `zone_name` | string |

**Returned by:** Get voicemail, Create voicemail, Update voicemail

| Field | Type |
|-------|------|
| `enabled` | boolean |
| `pin` | string |

## Optional Parameters

### Create a dynamic emergency address. — `client.dynamic_emergency_addresses.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `record_type` | string | Identifies the type of the resource. |
| `sip_geolocation_id` | string (UUID) | Unique location reference string to be used in SIP INVITE from / p-asserted h... |
| `status` | enum (pending, activated, rejected) | Status of dynamic emergency address |
| `house_suffix` | string |  |
| `street_pre_directional` | string |  |
| `street_suffix` | string |  |
| `street_post_directional` | string |  |
| `extended_address` | string |  |
| `created_at` | string | ISO 8601 formatted date of when the resource was created |
| `updated_at` | string | ISO 8601 formatted date of when the resource was last updated |

### Create a dynamic emergency endpoint. — `client.dynamic_emergency_endpoints.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `record_type` | string | Identifies the type of the resource. |
| `status` | enum (pending, activated, rejected) | Status of dynamic emergency address |
| `sip_from_id` | string (UUID) |  |
| `created_at` | string | ISO 8601 formatted date of when the resource was created |
| `updated_at` | string | ISO 8601 formatted date of when the resource was last updated |

### Create voicemail — `client.phone_numbers.voicemail.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `pin` | string | The pin used for voicemail |
| `enabled` | boolean | Whether voicemail is enabled. |

### Update voicemail — `client.phone_numbers.voicemail.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `pin` | string | The pin used for voicemail |
| `enabled` | boolean | Whether voicemail is enabled. |
