---
name: telnyx-numbers-config-ruby
description: >-
  Configure phone number settings including caller ID, call forwarding,
  messaging enablement, and connection assignments. This skill provides Ruby SDK
  examples.
metadata:
  author: telnyx
  product: numbers-config
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - Ruby

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

## Bulk update phone number profiles

`POST /messaging_numbers_bulk_updates` — Required: `messaging_profile_id`, `numbers`

Optional: `assign_only` (boolean)

```ruby
messaging_numbers_bulk_update = client.messaging_numbers_bulk_updates.create(
  messaging_profile_id: "00000000-0000-0000-0000-000000000000",
  numbers: ["+18880000000", "+18880000001", "+18880000002"]
)

puts(messaging_numbers_bulk_update)
```

## Retrieve bulk update status

`GET /messaging_numbers_bulk_updates/{order_id}`

```ruby
messaging_numbers_bulk_update = client.messaging_numbers_bulk_updates.retrieve("order_id")

puts(messaging_numbers_bulk_update)
```

## List mobile phone numbers with messaging settings

`GET /mobile_phone_numbers/messaging`

```ruby
page = client.mobile_phone_numbers.messaging.list

puts(page)
```

## Retrieve a mobile phone number with messaging settings

`GET /mobile_phone_numbers/{id}/messaging`

```ruby
messaging = client.mobile_phone_numbers.messaging.retrieve("id")

puts(messaging)
```

## List phone numbers

`GET /phone_numbers`

```ruby
page = client.phone_numbers.list

puts(page)
```

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`POST /phone_numbers/actions/verify_ownership` — Required: `phone_numbers`

```ruby
response = client.phone_numbers.actions.verify_ownership(phone_numbers: ["+15551234567"])

puts(response)
```

## Lists the phone numbers jobs

`GET /phone_numbers/jobs`

```ruby
page = client.phone_numbers.jobs.list

puts(page)
```

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers.

`POST /phone_numbers/jobs/delete_phone_numbers` — Required: `phone_numbers`

```ruby
response = client.phone_numbers.jobs.delete_batch(phone_numbers: ["+19705555098", "+19715555098", "32873127836"])

puts(response)
```

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers.

`POST /phone_numbers/jobs/update_emergency_settings` — Required: `emergency_enabled`, `phone_numbers`

Optional: `emergency_address_id` (['string', 'null'])

```ruby
response = client.phone_numbers.jobs.update_emergency_settings_batch(
  emergency_enabled: true,
  phone_numbers: ["+19705555098", "+19715555098", "32873127836"]
)

puts(response)
```

## Update a batch of numbers

Creates a new background job to update a batch of numbers.

`POST /phone_numbers/jobs/update_phone_numbers` — Required: `phone_numbers`

Optional: `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `deletion_lock_enabled` (boolean), `external_pin` (string), `hd_voice_enabled` (boolean), `tags` (array[string]), `voice` (object)

```ruby
response = client.phone_numbers.jobs.update_batch(phone_numbers: ["1583466971586889004", "+13127367254"])

puts(response)
```

## Retrieve a phone numbers job

`GET /phone_numbers/jobs/{id}`

```ruby
job = client.phone_numbers.jobs.retrieve("id")

puts(job)
```

## List phone numbers with messaging settings

`GET /phone_numbers/messaging`

```ruby
page = client.phone_numbers.messaging.list

puts(page)
```

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`GET /phone_numbers/slim`

```ruby
page = client.phone_numbers.slim_list

puts(page)
```

## List phone numbers with voice settings

`GET /phone_numbers/voice`

```ruby
page = client.phone_numbers.voice.list

puts(page)
```

## Retrieve a phone number

`GET /phone_numbers/{id}`

```ruby
phone_number = client.phone_numbers.retrieve("1293384261075731499")

puts(phone_number)
```

## Update a phone number

`PATCH /phone_numbers/{id}`

Optional: `address_id` (string), `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `external_pin` (string), `hd_voice_enabled` (boolean), `id` (string), `tags` (array[string])

```ruby
phone_number = client.phone_numbers.update("1293384261075731499")

puts(phone_number)
```

## Delete a phone number

`DELETE /phone_numbers/{id}`

```ruby
phone_number = client.phone_numbers.delete("1293384261075731499")

puts(phone_number)
```

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`PATCH /phone_numbers/{id}/actions/bundle_status_change` — Required: `bundle_id`

```ruby
response = client.phone_numbers.actions.change_bundle_status(
  "1293384261075731499",
  bundle_id: "5194d8fc-87e6-4188-baa9-1c434bbe861b"
)

puts(response)
```

## Enable emergency for a phone number

`POST /phone_numbers/{id}/actions/enable_emergency` — Required: `emergency_enabled`, `emergency_address_id`

```ruby
response = client.phone_numbers.actions.enable_emergency(
  "1293384261075731499",
  emergency_address_id: "53829456729313",
  emergency_enabled: true
)

puts(response)
```

## Retrieve a phone number with messaging settings

`GET /phone_numbers/{id}/messaging`

```ruby
messaging = client.phone_numbers.messaging.retrieve("id")

puts(messaging)
```

## Update the messaging profile and/or messaging product of a phone number

`PATCH /phone_numbers/{id}/messaging`

Optional: `messaging_product` (string), `messaging_profile_id` (string), `tags` (array[string])

```ruby
messaging = client.phone_numbers.messaging.update("id")

puts(messaging)
```

## Retrieve a phone number with voice settings

`GET /phone_numbers/{id}/voice`

```ruby
voice = client.phone_numbers.voice.retrieve("1293384261075731499")

puts(voice)
```

## Update a phone number with voice settings

`PATCH /phone_numbers/{id}/voice`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `inbound_call_screening` (enum), `media_features` (object), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum)

```ruby
voice = client.phone_numbers.voice.update("1293384261075731499")

puts(voice)
```

## List Mobile Phone Numbers

`GET /v2/mobile_phone_numbers`

```ruby
page = client.mobile_phone_numbers.list

puts(page)
```

## Retrieve a Mobile Phone Number

`GET /v2/mobile_phone_numbers/{id}`

```ruby
mobile_phone_number = client.mobile_phone_numbers.retrieve("id")

puts(mobile_phone_number)
```

## Update a Mobile Phone Number

`PATCH /v2/mobile_phone_numbers/{id}`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (['string', 'null']), `customer_reference` (['string', 'null']), `inbound` (object), `inbound_call_screening` (enum), `noise_suppression` (boolean), `outbound` (object), `tags` (array[string])

```ruby
mobile_phone_number = client.mobile_phone_numbers.update("id")

puts(mobile_phone_number)
```
