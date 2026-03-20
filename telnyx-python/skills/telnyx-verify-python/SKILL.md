---
name: telnyx-verify-python
description: >-
  Phone verification via SMS/voice/flashcall OTP and number lookup (carrier,
  type, caller name).
metadata:
  author: telnyx
  product: verify
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - Python

## Core Workflow

### Prerequisites

1. Create a Verify Profile with channel settings (SMS, Call, Flashcall, RCS, DTMF)

### Steps

1. **Create profile**: `client.verify_profiles.create(name=..., default_timeout_secs=...)`
2. **Trigger verification**: `client.verifications.trigger_sms(phone_number=..., verify_profile_id=...)`
3. **User receives code**: `Via SMS, call, flashcall, RCS, or DTMF`
4. **Submit code**: `client.verifications.by_phone_number.actions.verify(phone_number=..., code=..., verify_profile_id=...)`

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

**Related skills**: telnyx-messaging-python, telnyx-voice-python

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
    result = client.verifications.trigger_sms(params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Trigger SMS verification

`client.verifications.trigger_sms()` — `POST /verifications/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |
| `custom_code` | string | No | Send a self-generated numeric code to the end-user |

```python
create_verification_response = client.verifications.trigger_sms(
    phone_number="+13035551234",
    verify_profile_id="12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(create_verification_response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by phone number

`client.verifications.by_phone_number.actions.verify()` — `POST /verifications/by_phone_number/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | This is the code the user submits for verification. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```python
verify_verification_code_response = client.verifications.by_phone_number.actions.verify(
    phone_number="+13035551234",
    code="17686",
    verify_profile_id="12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(verify_verification_code_response.data)
```

Key response fields: `response.data.phone_number, response.data.response_code`

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`client.verify_profiles.create()` — `POST /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `webhook_url` | string (URL) | No |  |
| `webhook_failover_url` | string (URL) | No |  |
| `sms` | object | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
verify_profile_data = client.verify_profiles.create(
    name="Test Profile",
)
print(verify_profile_data.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Trigger Call verification

`client.verifications.trigger_call()` — `POST /verifications/call`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |
| `custom_code` | string | No | Send a self-generated numeric code to the end-user |
| `extension` | string | No | Optional extension to dial after call is answered using DTMF... |

```python
create_verification_response = client.verifications.trigger_call(
    phone_number="+13035551234",
    verify_profile_id="12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(create_verification_response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Lookup phone number data

Returns information about the provided phone number.

`client.number_lookup.retrieve()` — `GET /number_lookup/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | The phone number to be looked up |
| `type_` | enum (carrier, caller-name) | No | Specifies the type of number lookup to be performed |

```python
number_lookup = client.number_lookup.retrieve(
    phone_number="+18665552368",
)
print(number_lookup.data)
```

Key response fields: `response.data.phone_number, response.data.caller_name, response.data.carrier`

## List verifications by phone number

`client.verifications.by_phone_number.list()` — `GET /verifications/by_phone_number/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```python
by_phone_numbers = client.verifications.by_phone_number.list(
    "+13035551234",
)
print(by_phone_numbers.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Trigger Flash call verification

`client.verifications.trigger_flashcall()` — `POST /verifications/flashcall`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |

```python
create_verification_response = client.verifications.trigger_flashcall(
    phone_number="+13035551234",
    verify_profile_id="12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(create_verification_response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve verification

`client.verifications.retrieve()` — `GET /verifications/{verification_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_id` | string (UUID) | Yes | The identifier of the verification to retrieve. |

```python
verification = client.verifications.retrieve(
    "12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(verification.data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by ID

`client.verifications.actions.verify()` — `POST /verifications/{verification_id}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_id` | string (UUID) | Yes | The identifier of the verification to retrieve. |
| `status` | enum (accepted, rejected) | No | Identifies if the verification code has been accepted or rej... |
| `code` | string | No | This is the code the user submits for verification. |

```python
verify_verification_code_response = client.verifications.actions.verify(
    verification_id="12ade33a-21c0-473b-b055-b3c836e1c292",
    code="12345",
)
print(verify_verification_code_response.data)
```

Key response fields: `response.data.phone_number, response.data.response_code`

## List all Verify profiles

Gets a paginated list of Verify profiles.

`client.verify_profiles.list()` — `GET /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.verify_profiles.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve Verify profile message templates

List all Verify profile message templates.

`client.verify_profiles.retrieve_templates()` — `GET /verify_profiles/templates`

```python
response = client.verify_profiles.retrieve_templates()
print(response.data)
```

Key response fields: `response.data.id, response.data.text`

## Create message template

Create a new Verify profile message template.

`client.verify_profiles.create_template()` — `POST /verify_profiles/templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |

```python
message_template = client.verify_profiles.create_template(
    text="Your {{app_name}} verification code is: {{code}}.",
)
print(message_template.data)
```

Key response fields: `response.data.id, response.data.text`

## Update message template

Update an existing Verify profile message template.

`client.verify_profiles.update_template()` — `PATCH /verify_profiles/templates/{template_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |
| `template_id` | string (UUID) | Yes | The identifier of the message template to update. |

```python
message_template = client.verify_profiles.update_template(
    template_id="12ade33a-21c0-473b-b055-b3c836e1c292",
    text="Your {{app_name}} verification code is: {{code}}.",
)
print(message_template.data)
```

Key response fields: `response.data.id, response.data.text`

## Retrieve Verify profile

Gets a single Verify profile.

`client.verify_profiles.retrieve()` — `GET /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to retrieve. |

```python
verify_profile_data = client.verify_profiles.retrieve(
    "12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(verify_profile_data.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Verify profile

`client.verify_profiles.update()` — `PATCH /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to update. |
| `webhook_url` | string (URL) | No |  |
| `webhook_failover_url` | string (URL) | No |  |
| `name` | string | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```python
verify_profile_data = client.verify_profiles.update(
    verify_profile_id="12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(verify_profile_data.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Verify profile

`client.verify_profiles.delete()` — `DELETE /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to delete. |

```python
verify_profile_data = client.verify_profiles.delete(
    "12ade33a-21c0-473b-b055-b3c836e1c292",
)
print(verify_profile_data.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
