# Verify (Go) — API Details

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

### Trigger Call verification — `client.Verifications.TriggerCall()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomCode` | string | Send a self-generated numeric code to the end-user |
| `TimeoutSecs` | integer | The number of seconds the verification code is valid for. |
| `Extension` | string | Optional extension to dial after call is answered using DTMF digits. |

### Trigger Flash call verification — `client.Verifications.TriggerFlashcall()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TimeoutSecs` | integer | The number of seconds the verification code is valid for. |

### Trigger SMS verification — `client.Verifications.TriggerSMS()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomCode` | string | Send a self-generated numeric code to the end-user |
| `TimeoutSecs` | integer | The number of seconds the verification code is valid for. |

### Verify verification code by ID — `client.Verifications.Actions.Verify()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Code` | string | This is the code the user submits for verification. |
| `Status` | enum (accepted, rejected) | Identifies if the verification code has been accepted or rejected. |

### Create a Verify profile — `client.VerifyProfiles.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `WebhookUrl` | string (URL) |  |
| `WebhookFailoverUrl` | string (URL) |  |
| `Sms` | object |  |
| `Call` | object |  |
| `Flashcall` | object |  |
| `Language` | string |  |
| `Rcs` | object |  |

### Update Verify profile — `client.VerifyProfiles.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `WebhookUrl` | string (URL) |  |
| `WebhookFailoverUrl` | string (URL) |  |
| `Sms` | object |  |
| `Call` | object |  |
| `Flashcall` | object |  |
| `Language` | string |  |
| `Rcs` | object |  |
