---
name: telnyx-verify-ruby
description: >-
  Look up phone number information (carrier, type, caller name) and verify users
  via SMS/voice OTP. Use for phone verification and data enrichment. This skill
  provides Ruby SDK examples.
metadata:
  author: telnyx
  product: verify
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - Ruby

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

## Lookup phone number data

Returns information about the provided phone number.

`GET /number_lookup/{phone_number}`

```ruby
number_lookup = client.number_lookup.retrieve("+18665552368")

puts(number_lookup)
```

## List verifications by phone number

`GET /verifications/by_phone_number/{phone_number}`

```ruby
by_phone_numbers = client.verifications.by_phone_number.list("+13035551234")

puts(by_phone_numbers)
```

## Verify verification code by phone number

`POST /verifications/by_phone_number/{phone_number}/actions/verify` — Required: `code`, `verify_profile_id`

```ruby
verify_verification_code_response = client.verifications.by_phone_number.actions.verify(
  "+13035551234",
  code: "17686",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(verify_verification_code_response)
```

## Trigger Call verification

`POST /verifications/call` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (['string', 'null']), `extension` (['string', 'null']), `timeout_secs` (integer)

```ruby
create_verification_response = client.verifications.trigger_call(
  phone_number: "+13035551234",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(create_verification_response)
```

## Trigger Flash call verification

`POST /verifications/flashcall` — Required: `phone_number`, `verify_profile_id`

Optional: `timeout_secs` (integer)

```ruby
create_verification_response = client.verifications.trigger_flashcall(
  phone_number: "+13035551234",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(create_verification_response)
```

## Trigger SMS verification

`POST /verifications/sms` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (['string', 'null']), `timeout_secs` (integer)

```ruby
create_verification_response = client.verifications.trigger_sms(
  phone_number: "+13035551234",
  verify_profile_id: "12ade33a-21c0-473b-b055-b3c836e1c292"
)

puts(create_verification_response)
```

## Retrieve verification

`GET /verifications/{verification_id}`

```ruby
verification = client.verifications.retrieve("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verification)
```

## Verify verification code by ID

`POST /verifications/{verification_id}/actions/verify`

Optional: `code` (string), `status` (enum)

```ruby
verify_verification_code_response = client.verifications.actions.verify("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_verification_code_response)
```

## List all Verify profiles

Gets a paginated list of Verify profiles.

`GET /verify_profiles`

```ruby
page = client.verify_profiles.list

puts(page)
```

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`POST /verify_profiles` — Required: `name`

Optional: `call` (object), `flashcall` (object), `language` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```ruby
verify_profile_data = client.verify_profiles.create(name: "Test Profile")

puts(verify_profile_data)
```

## Retrieve Verify profile message templates

List all Verify profile message templates.

`GET /verify_profiles/templates`

```ruby
response = client.verify_profiles.retrieve_templates

puts(response)
```

## Create message template

Create a new Verify profile message template.

`POST /verify_profiles/templates` — Required: `text`

```ruby
message_template = client.verify_profiles.create_template(text: "Your {{app_name}} verification code is: {{code}}.")

puts(message_template)
```

## Update message template

Update an existing Verify profile message template.

`PATCH /verify_profiles/templates/{template_id}` — Required: `text`

```ruby
message_template = client.verify_profiles.update_template(
  "12ade33a-21c0-473b-b055-b3c836e1c292",
  text: "Your {{app_name}} verification code is: {{code}}."
)

puts(message_template)
```

## Retrieve Verify profile

Gets a single Verify profile.

`GET /verify_profiles/{verify_profile_id}`

```ruby
verify_profile_data = client.verify_profiles.retrieve("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_profile_data)
```

## Update Verify profile

`PATCH /verify_profiles/{verify_profile_id}`

Optional: `call` (object), `flashcall` (object), `language` (string), `name` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```ruby
verify_profile_data = client.verify_profiles.update("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_profile_data)
```

## Delete Verify profile

`DELETE /verify_profiles/{verify_profile_id}`

```ruby
verify_profile_data = client.verify_profiles.delete("12ade33a-21c0-473b-b055-b3c836e1c292")

puts(verify_profile_data)
```
