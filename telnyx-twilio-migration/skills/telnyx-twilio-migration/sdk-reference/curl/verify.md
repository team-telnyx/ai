<!-- SDK reference: telnyx-verify-curl -->

# Telnyx Verify - curl

## Core Workflow

### Prerequisites

1. Create a Verify Profile with channel settings (SMS, Call, Flashcall, RCS, DTMF)

### Steps

1. **Create profile**
2. **Trigger verification**
3. **User receives code**
4. **Submit code**

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Default, widest reach | SMS verification |
| Landlines or accessibility | Voice call verification |
| Frictionless mobile (code in caller ID) | Flashcall verification |
| Ownership confirmation without code entry | DTMF Confirm |
| Rich mobile UX with SMS fallback | RCS verification |

### Common mistakes

- NEVER use non-E.164 phone numbers — returns 400 Bad Request
- NEVER reuse expired verification IDs — must re-trigger verification
- For DTMF Confirm: result is ONLY delivered via webhook — configure your webhook endpoint in the Verify Profile settings. No verify webhooks are documented in this skill; handle the verify.dtmf_confirm event manually
- When verifying by ID, you MUST pass the code parameter — omitting it will not validate the user's input

**Related skills**: telnyx-messaging-curl, telnyx-voice-curl

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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Trigger SMS verification

`POST /verifications/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |
| `custom_code` | string | No | Send a self-generated numeric code to the end-user |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_number": "+13035551234",
  "verify_profile_id": "12ade33a-21c0-473b-b055-b3c836e1c292"
}' \
  "https://api.telnyx.com/v2/verifications/sms"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Verify verification code by phone number

`POST /verifications/by_phone_number/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | This is the code the user submits for verification. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "code": "17686",
  "verify_profile_id": "12ade33a-21c0-473b-b055-b3c836e1c292"
}' \
  "https://api.telnyx.com/v2/verifications/by_phone_number/+13035551234/actions/verify"
```

Key response fields: `.data.phone_number, .data.response_code`

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`POST /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `webhook_url` | string (URL) | No |  |
| `webhook_failover_url` | string (URL) | No |  |
| `sms` | object | No |  |
| ... | | | +4 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Test Profile"
}' \
  "https://api.telnyx.com/v2/verify_profiles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Trigger Call verification

`POST /verifications/call`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |
| `custom_code` | string | No | Send a self-generated numeric code to the end-user |
| `extension` | string | No | Optional extension to dial after call is answered using DTMF... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_number": "+13035551234",
  "verify_profile_id": "12ade33a-21c0-473b-b055-b3c836e1c292"
}' \
  "https://api.telnyx.com/v2/verifications/call"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Lookup phone number data

Returns information about the provided phone number.

`GET /number_lookup/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | The phone number to be looked up |
| `type` | enum (carrier, caller-name) | No | Specifies the type of number lookup to be performed |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/number_lookup/+18665552368"
```

Key response fields: `.data.phone_number, .data.caller_name, .data.carrier`

## List verifications by phone number

`GET /verifications/by_phone_number/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verifications/by_phone_number/+13035551234"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Trigger Flash call verification

`POST /verifications/flashcall`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_number": "+13035551234",
  "verify_profile_id": "12ade33a-21c0-473b-b055-b3c836e1c292"
}' \
  "https://api.telnyx.com/v2/verifications/flashcall"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Retrieve verification

`GET /verifications/{verification_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_id` | string (UUID) | Yes | The identifier of the verification to retrieve. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verifications/12ade33a-21c0-473b-b055-b3c836e1c292"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Verify verification code by ID

`POST /verifications/{verification_id}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_id` | string (UUID) | Yes | The identifier of the verification to retrieve. |
| `status` | enum (accepted, rejected) | No | Identifies if the verification code has been accepted or rej... |
| `code` | string | No | This is the code the user submits for verification. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "code": "12345"
  }' \
  "https://api.telnyx.com/v2/verifications/12ade33a-21c0-473b-b055-b3c836e1c292/actions/verify"
```

Key response fields: `.data.phone_number, .data.response_code`

## List all Verify profiles

Gets a paginated list of Verify profiles.

`GET /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verify_profiles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve Verify profile message templates

List all Verify profile message templates.

`GET /verify_profiles/templates`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verify_profiles/templates"
```

Key response fields: `.data.id, .data.text`

## Create message template

Create a new Verify profile message template.

`POST /verify_profiles/templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "text": "Your {{app_name}} verification code is: {{code}}."
}' \
  "https://api.telnyx.com/v2/verify_profiles/templates"
```

Key response fields: `.data.id, .data.text`

## Update message template

Update an existing Verify profile message template.

`PATCH /verify_profiles/templates/{template_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |
| `template_id` | string (UUID) | Yes | The identifier of the message template to update. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "text": "Your {{app_name}} verification code is: {{code}}."
}' \
  "https://api.telnyx.com/v2/verify_profiles/templates/12ade33a-21c0-473b-b055-b3c836e1c292"
```

Key response fields: `.data.id, .data.text`

## Retrieve Verify profile

Gets a single Verify profile.

`GET /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to retrieve. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verify_profiles/12ade33a-21c0-473b-b055-b3c836e1c292"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update Verify profile

`PATCH /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to update. |
| `webhook_url` | string (URL) | No |  |
| `webhook_failover_url` | string (URL) | No |  |
| `name` | string | No |  |
| ... | | | +5 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/verify_profiles/12ade33a-21c0-473b-b055-b3c836e1c292"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete Verify profile

`DELETE /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to delete. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/verify_profiles/12ade33a-21c0-473b-b055-b3c836e1c292"
```

Key response fields: `.data.id, .data.name, .data.created_at`

---

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
