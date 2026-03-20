<!-- SDK reference: telnyx-verify-ruby -->

# Telnyx Verify - Ruby

## Core Workflow

### Prerequisites

1. Create a Verify Profile with channel settings (SMS, Call, Flashcall, RCS, DTMF)

### Steps

1. **Create profile**: `client.verify_profiles.create(name: ..., default_timeout_secs: ...)`
2. **Trigger verification**: `client.verifications.trigger_sms(phone_number: ..., verify_profile_id: ...)`
3. **User receives code**: `Via SMS, call, flashcall, RCS, or DTMF`
4. **Submit code**: `client.verifications.by_phone_number.actions.verify(phone_number: ..., code: ..., verify_profile_id: ...)`

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

**Related skills**: telnyx-messaging-ruby, telnyx-voice-ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.verifications.trigger_sms(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Trigger SMS verification

`client.verifications.trigger_sms()` — `POST /verifications/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |
| `custom_code` | string | No | Send a self-generated numeric code to the end-user |

```ruby
create_verification_response = client.verifications.trigger_sms(
  phone_number: "+13035551234",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(create_verification_response)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by phone number

`client.verifications.by_phone_number.actions.verify()` — `POST /verifications/by_phone_number/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | This is the code the user submits for verification. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```ruby
verify_verification_code_response = client.verifications.by_phone_number.actions.verify(
  "+13035551234",
  code: "17686",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(verify_verification_code_response)
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
| ... | | | +4 optional params in the API Details section below |

```ruby
verify_profile_data = client.verify_profiles.create(name: "Test Profile")

puts(verify_profile_data)
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

```ruby
create_verification_response = client.verifications.trigger_call(
  phone_number: "+13035551234",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(create_verification_response)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Lookup phone number data

Returns information about the provided phone number.

`client.number_lookup.retrieve()` — `GET /number_lookup/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | The phone number to be looked up |
| `type` | enum (carrier, caller-name) | No | Specifies the type of number lookup to be performed |

```ruby
number_lookup = client.number_lookup.retrieve("+18665552368")

puts(number_lookup)
```

Key response fields: `response.data.phone_number, response.data.caller_name, response.data.carrier`

## List verifications by phone number

`client.verifications.by_phone_number.list()` — `GET /verifications/by_phone_number/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```ruby
by_phone_numbers = client.verifications.by_phone_number.list("+13035551234")

puts(by_phone_numbers)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Trigger Flash call verification

`client.verifications.trigger_flashcall()` — `POST /verifications/flashcall`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |
| `verify_profile_id` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeout_secs` | integer | No | The number of seconds the verification code is valid for. |

```ruby
create_verification_response = client.verifications.trigger_flashcall(
  phone_number: "+13035551234",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(create_verification_response)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve verification

`client.verifications.retrieve()` — `GET /verifications/{verification_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_id` | string (UUID) | Yes | The identifier of the verification to retrieve. |

```ruby
verification = client.verifications.retrieve("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verification)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by ID

`client.verifications.actions.verify()` — `POST /verifications/{verification_id}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_id` | string (UUID) | Yes | The identifier of the verification to retrieve. |
| `status` | enum (accepted, rejected) | No | Identifies if the verification code has been accepted or rej... |
| `code` | string | No | This is the code the user submits for verification. |

```ruby
verify_verification_code_response = client.verifications.actions.verify("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_verification_code_response)
```

Key response fields: `response.data.phone_number, response.data.response_code`

## List all Verify profiles

Gets a paginated list of Verify profiles.

`client.verify_profiles.list()` — `GET /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.verify_profiles.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve Verify profile message templates

List all Verify profile message templates.

`client.verify_profiles.retrieve_templates()` — `GET /verify_profiles/templates`

```ruby
response = client.verify_profiles.retrieve_templates

puts(response)
```

Key response fields: `response.data.id, response.data.text`

## Create message template

Create a new Verify profile message template.

`client.verify_profiles.create_template()` — `POST /verify_profiles/templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |

```ruby
message_template = client.verify_profiles.create_template(text: "Your {{app_name}} verification code is: {{code}}.")

puts(message_template)
```

Key response fields: `response.data.id, response.data.text`

## Update message template

Update an existing Verify profile message template.

`client.verify_profiles.update_template()` — `PATCH /verify_profiles/templates/{template_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |
| `template_id` | string (UUID) | Yes | The identifier of the message template to update. |

```ruby
message_template = client.verify_profiles.update_template(
  "12ade33a-21c0-473b-b055-b3c836e1c292",
  text: "Your {{app_name}} verification code is: {{code}}."
)

puts(message_template)
```

Key response fields: `response.data.id, response.data.text`

## Retrieve Verify profile

Gets a single Verify profile.

`client.verify_profiles.retrieve()` — `GET /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to retrieve. |

```ruby
verify_profile_data = client.verify_profiles.retrieve("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_profile_data)
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
| ... | | | +5 optional params in the API Details section below |

```ruby
verify_profile_data = client.verify_profiles.update("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_profile_data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Verify profile

`client.verify_profiles.delete()` — `DELETE /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verify_profile_id` | string (UUID) | Yes | The identifier of the Verify profile to delete. |

```ruby
verify_profile_data = client.verify_profiles.delete("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_profile_data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

# Verify (Ruby) — API Details

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

### Trigger Call verification — `client.verifications.trigger_call()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `custom_code` | string | Send a self-generated numeric code to the end-user |
| `timeout_secs` | integer | The number of seconds the verification code is valid for. |
| `extension` | string | Optional extension to dial after call is answered using DTMF digits. |

### Trigger Flash call verification — `client.verifications.trigger_flashcall()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `timeout_secs` | integer | The number of seconds the verification code is valid for. |

### Trigger SMS verification — `client.verifications.trigger_sms()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `custom_code` | string | Send a self-generated numeric code to the end-user |
| `timeout_secs` | integer | The number of seconds the verification code is valid for. |

### Verify verification code by ID — `client.verifications.actions.verify()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | This is the code the user submits for verification. |
| `status` | enum (accepted, rejected) | Identifies if the verification code has been accepted or rejected. |

### Create a Verify profile — `client.verify_profiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook_url` | string (URL) |  |
| `webhook_failover_url` | string (URL) |  |
| `sms` | object |  |
| `call` | object |  |
| `flashcall` | object |  |
| `language` | string |  |
| `rcs` | object |  |

### Update Verify profile — `client.verify_profiles.update()`

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
