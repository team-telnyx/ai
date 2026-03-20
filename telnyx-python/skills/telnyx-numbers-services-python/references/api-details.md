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
