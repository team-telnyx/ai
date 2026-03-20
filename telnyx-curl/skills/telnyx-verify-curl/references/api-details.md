# Verify (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Lookup phone number data

| Field | Type |
|-------|------|
| `caller_name` | object |
| `carrier` | object |
| `country_code` | string |
| `fraud` | string \| null |
| `national_format` | string |
| `phone_number` | string |
| `portability` | object |
| `record_type` | string |

**Returned by:** List verifications by phone number, Trigger Call verification, Trigger Flash call verification, Trigger SMS verification, Retrieve verification

| Field | Type |
|-------|------|
| `created_at` | string |
| `custom_code` | string \| null |
| `id` | uuid |
| `phone_number` | string |
| `record_type` | enum: verification |
| `status` | enum: pending, accepted, invalid, expired, error |
| `timeout_secs` | integer |
| `type` | enum: sms, call, flashcall |
| `updated_at` | string |
| `verify_profile_id` | uuid |

**Returned by:** Verify verification code by phone number, Verify verification code by ID

| Field | Type |
|-------|------|
| `phone_number` | string |
| `response_code` | enum: accepted, rejected |

**Returned by:** List all Verify profiles, Create a Verify profile, Retrieve Verify profile, Update Verify profile, Delete Verify profile

| Field | Type |
|-------|------|
| `call` | object |
| `created_at` | string |
| `flashcall` | object |
| `id` | uuid |
| `language` | string |
| `name` | string |
| `rcs` | object |
| `record_type` | enum: verification_profile |
| `sms` | object |
| `updated_at` | string |
| `webhook_failover_url` | string |
| `webhook_url` | string |

**Returned by:** Retrieve Verify profile message templates, Create message template, Update message template

| Field | Type |
|-------|------|
| `id` | uuid |
| `text` | string |

## Optional Parameters

### Trigger Call verification

| Parameter | Type | Description |
|-----------|------|-------------|
| `custom_code` | string | Send a self-generated numeric code to the end-user |
| `timeout_secs` | integer | The number of seconds the verification code is valid for. |
| `extension` | string | Optional extension to dial after call is answered using DTMF digits. |

### Trigger Flash call verification

| Parameter | Type | Description |
|-----------|------|-------------|
| `timeout_secs` | integer | The number of seconds the verification code is valid for. |

### Trigger SMS verification

| Parameter | Type | Description |
|-----------|------|-------------|
| `custom_code` | string | Send a self-generated numeric code to the end-user |
| `timeout_secs` | integer | The number of seconds the verification code is valid for. |

### Verify verification code by ID

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | This is the code the user submits for verification. |
| `status` | enum (accepted, rejected) | Identifies if the verification code has been accepted or rejected. |

### Create a Verify profile

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook_url` | string (URL) |  |
| `webhook_failover_url` | string (URL) |  |
| `sms` | object |  |
| `call` | object |  |
| `flashcall` | object |  |
| `language` | string |  |
| `rcs` | object |  |

### Update Verify profile

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `webhook_url` | string (URL) |  |
| `webhook_failover_url` | string (URL) |  |
| `sms` | object |  |
| `call` | object |  |
| `flashcall` | object |  |
| `language` | string |  |
| `rcs` | object |  |
