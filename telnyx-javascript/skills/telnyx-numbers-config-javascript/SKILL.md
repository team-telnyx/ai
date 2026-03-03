---
name: telnyx-numbers-config-javascript
description: >-
  Configure phone number settings including caller ID, call forwarding,
  messaging enablement, and connection assignments. This skill provides
  JavaScript SDK examples.
metadata:
  author: telnyx
  product: numbers-config
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Bulk update phone number profiles

`POST /messaging_numbers_bulk_updates` — Required: `messaging_profile_id`, `numbers`

Optional: `assign_only` (boolean)

```javascript
const messagingNumbersBulkUpdate = await client.messagingNumbersBulkUpdates.create({
  messaging_profile_id: '00000000-0000-0000-0000-000000000000',
  numbers: ['+18880000000', '+18880000001', '+18880000002'],
});

console.log(messagingNumbersBulkUpdate.data);
```

## Retrieve bulk update status

`GET /messaging_numbers_bulk_updates/{order_id}`

```javascript
const messagingNumbersBulkUpdate = await client.messagingNumbersBulkUpdates.retrieve('order_id');

console.log(messagingNumbersBulkUpdate.data);
```

## List mobile phone numbers with messaging settings

`GET /mobile_phone_numbers/messaging`

```javascript
// Automatically fetches more pages as needed.
for await (const messagingListResponse of client.mobilePhoneNumbers.messaging.list()) {
  console.log(messagingListResponse.id);
}
```

## Retrieve a mobile phone number with messaging settings

`GET /mobile_phone_numbers/{id}/messaging`

```javascript
const messaging = await client.mobilePhoneNumbers.messaging.retrieve('id');

console.log(messaging.data);
```

## List phone numbers

`GET /phone_numbers`

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberDetailed of client.phoneNumbers.list()) {
  console.log(phoneNumberDetailed.id);
}
```

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`POST /phone_numbers/actions/verify_ownership` — Required: `phone_numbers`

```javascript
const response = await client.phoneNumbers.actions.verifyOwnership({
  phone_numbers: ['+15551234567'],
});

console.log(response.data);
```

## Lists the phone numbers jobs

`GET /phone_numbers/jobs`

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumbersJob of client.phoneNumbers.jobs.list()) {
  console.log(phoneNumbersJob.id);
}
```

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers.

`POST /phone_numbers/jobs/delete_phone_numbers` — Required: `phone_numbers`

```javascript
const response = await client.phoneNumbers.jobs.deleteBatch({
  phone_numbers: ['+19705555098', '+19715555098', '32873127836'],
});

console.log(response.data);
```

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers.

`POST /phone_numbers/jobs/update_emergency_settings` — Required: `emergency_enabled`, `phone_numbers`

Optional: `emergency_address_id` (['string', 'null'])

```javascript
const response = await client.phoneNumbers.jobs.updateEmergencySettingsBatch({
  emergency_enabled: true,
  phone_numbers: ['+19705555098', '+19715555098', '32873127836'],
});

console.log(response.data);
```

## Update a batch of numbers

Creates a new background job to update a batch of numbers.

`POST /phone_numbers/jobs/update_phone_numbers` — Required: `phone_numbers`

Optional: `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `deletion_lock_enabled` (boolean), `external_pin` (string), `hd_voice_enabled` (boolean), `tags` (array[string]), `voice` (object)

```javascript
const response = await client.phoneNumbers.jobs.updateBatch({
  phone_numbers: ['1583466971586889004', '+13127367254'],
});

console.log(response.data);
```

## Retrieve a phone numbers job

`GET /phone_numbers/jobs/{id}`

```javascript
const job = await client.phoneNumbers.jobs.retrieve('id');

console.log(job.data);
```

## List phone numbers with messaging settings

`GET /phone_numbers/messaging`

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberWithMessagingSettings of client.phoneNumbers.messaging.list()) {
  console.log(phoneNumberWithMessagingSettings.id);
}
```

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`GET /phone_numbers/slim`

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberSlimListResponse of client.phoneNumbers.slimList()) {
  console.log(phoneNumberSlimListResponse.id);
}
```

## List phone numbers with voice settings

`GET /phone_numbers/voice`

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberWithVoiceSettings of client.phoneNumbers.voice.list()) {
  console.log(phoneNumberWithVoiceSettings.id);
}
```

## Retrieve a phone number

`GET /phone_numbers/{id}`

```javascript
const phoneNumber = await client.phoneNumbers.retrieve('1293384261075731499');

console.log(phoneNumber.data);
```

## Update a phone number

`PATCH /phone_numbers/{id}`

Optional: `address_id` (string), `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `external_pin` (string), `hd_voice_enabled` (boolean), `id` (string), `tags` (array[string])

```javascript
const phoneNumber = await client.phoneNumbers.update('1293384261075731499');

console.log(phoneNumber.data);
```

## Delete a phone number

`DELETE /phone_numbers/{id}`

```javascript
const phoneNumber = await client.phoneNumbers.delete('1293384261075731499');

console.log(phoneNumber.data);
```

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`PATCH /phone_numbers/{id}/actions/bundle_status_change` — Required: `bundle_id`

```javascript
const response = await client.phoneNumbers.actions.changeBundleStatus('1293384261075731499', {
  bundle_id: '5194d8fc-87e6-4188-baa9-1c434bbe861b',
});

console.log(response.data);
```

## Enable emergency for a phone number

`POST /phone_numbers/{id}/actions/enable_emergency` — Required: `emergency_enabled`, `emergency_address_id`

```javascript
const response = await client.phoneNumbers.actions.enableEmergency('1293384261075731499', {
  emergency_address_id: '53829456729313',
  emergency_enabled: true,
});

console.log(response.data);
```

## Retrieve a phone number with messaging settings

`GET /phone_numbers/{id}/messaging`

```javascript
const messaging = await client.phoneNumbers.messaging.retrieve('id');

console.log(messaging.data);
```

## Update the messaging profile and/or messaging product of a phone number

`PATCH /phone_numbers/{id}/messaging`

Optional: `messaging_product` (string), `messaging_profile_id` (string), `tags` (array[string])

```javascript
const messaging = await client.phoneNumbers.messaging.update('id');

console.log(messaging.data);
```

## Retrieve a phone number with voice settings

`GET /phone_numbers/{id}/voice`

```javascript
const voice = await client.phoneNumbers.voice.retrieve('1293384261075731499');

console.log(voice.data);
```

## Update a phone number with voice settings

`PATCH /phone_numbers/{id}/voice`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `inbound_call_screening` (enum), `media_features` (object), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum)

```javascript
const voice = await client.phoneNumbers.voice.update('1293384261075731499');

console.log(voice.data);
```

## List Mobile Phone Numbers

`GET /v2/mobile_phone_numbers`

```javascript
// Automatically fetches more pages as needed.
for await (const mobilePhoneNumber of client.mobilePhoneNumbers.list()) {
  console.log(mobilePhoneNumber.id);
}
```

## Retrieve a Mobile Phone Number

`GET /v2/mobile_phone_numbers/{id}`

```javascript
const mobilePhoneNumber = await client.mobilePhoneNumbers.retrieve('id');

console.log(mobilePhoneNumber.data);
```

## Update a Mobile Phone Number

`PATCH /v2/mobile_phone_numbers/{id}`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (['string', 'null']), `customer_reference` (['string', 'null']), `inbound` (object), `inbound_call_screening` (enum), `noise_suppression` (boolean), `outbound` (object), `tags` (array[string])

```javascript
const mobilePhoneNumber = await client.mobilePhoneNumbers.update('id');

console.log(mobilePhoneNumber.data);
```
