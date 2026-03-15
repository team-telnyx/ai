---
name: telnyx-numbers-config-javascript
description: >-
  Phone number config: caller ID, call forwarding, messaging enablement,
  connection assignments.
metadata:
  author: telnyx
  product: numbers-config
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - JavaScript

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-javascript)

### Steps

1. **List your numbers**: `client.phoneNumbers.list()`
2. **Update voice settings**: `client.phoneNumbers.voice.update({id: ..., connectionId: ...})`
3. **Update messaging settings**: `client.phoneNumbers.messaging.update({id: ..., messagingProfileId: ...})`

### Common mistakes

- Use phone_numbers.voice.update() for voice/connection settings and phone_numbers.messaging.update() for messaging/profile settings — they are SEPARATE endpoints
- Bulk operations are available for updating many numbers at once — see bulk_phone_number_operations endpoints

**Related skills**: telnyx-numbers-javascript, telnyx-messaging-profiles-javascript, telnyx-voice-javascript

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.phone_numbers.list(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Bulk update phone number profiles

`client.messagingNumbersBulkUpdates.create()` — `POST /messaging_numbers_bulk_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | Configure the messaging profile these phone numbers are assi... |
| `numbers` | array[string] | Yes | The list of phone numbers to update. |
| `assignOnly` | boolean | No | If true, only assign numbers to the profile without changing... |

```javascript
const messagingNumbersBulkUpdate = await client.messagingNumbersBulkUpdates.create({
  messaging_profile_id: '00000000-0000-0000-0000-000000000000',
  numbers: ['+18880000000', '+18880000001', '+18880000002'],
});

console.log(messagingNumbersBulkUpdate.data);
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## Retrieve bulk update status

`client.messagingNumbersBulkUpdates.retrieve()` — `GET /messaging_numbers_bulk_updates/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string (UUID) | Yes | Order ID to verify bulk update status. |

```javascript
const messagingNumbersBulkUpdate = await client.messagingNumbersBulkUpdates.retrieve('order_id');

console.log(messagingNumbersBulkUpdate.data);
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## List mobile phone numbers with messaging settings

`client.mobilePhoneNumbers.messaging.list()` — `GET /mobile_phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const messagingListResponse of client.mobilePhoneNumbers.messaging.list()) {
  console.log(messagingListResponse.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a mobile phone number with messaging settings

`client.mobilePhoneNumbers.messaging.retrieve()` — `GET /mobile_phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const messaging = await client.mobilePhoneNumbers.messaging.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List phone numbers

`client.phoneNumbers.list()` — `GET /phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `handleMessagingProfileError` | enum (true, false) | No | Although it is an infrequent occurrence, due to the highly d... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberDetailed of client.phoneNumbers.list()) {
  console.log(phoneNumberDetailed.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`client.phoneNumbers.actions.verifyOwnership()` — `POST /phone_numbers/actions/verify_ownership`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | Array of phone numbers to verify ownership for |

```javascript
const response = await client.phoneNumbers.actions.verifyOwnership({
  phone_numbers: ['+15551234567'],
});

console.log(response.data);
```

Key response fields: `response.data.found, response.data.not_found, response.data.record_type`

## Lists the phone numbers jobs

`client.phoneNumbers.jobs.list()` — `GET /phone_numbers/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumbersJob of client.phoneNumbers.jobs.list()) {
  console.log(phoneNumbersJob.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`client.phoneNumbers.jobs.deleteBatch()` — `POST /phone_numbers/jobs/delete_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |

```javascript
const response = await client.phoneNumbers.jobs.deleteBatch({
  phone_numbers: ['+19705555098', '+19715555098', '32873127836'],
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers. At most one thousand numbers can be updated per API call.

`client.phoneNumbers.jobs.updateEmergencySettingsBatch()` — `POST /phone_numbers/jobs/update_emergency_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |
| `emergencyEnabled` | boolean | Yes | Indicates whether to enable or disable emergency services on... |
| `emergencyAddressId` | string (UUID) | No | Identifies the address to be used with emergency services. |

```javascript
const response = await client.phoneNumbers.jobs.updateEmergencySettingsBatch({
  emergency_enabled: true,
  phone_numbers: ['+19705555098', '+19715555098', '32873127836'],
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update a batch of numbers

Creates a new background job to update a batch of numbers. At most one thousand numbers can be updated per API call. At least one of the updateable fields must be submitted.

`client.phoneNumbers.jobs.updateBatch()` — `POST /phone_numbers/jobs/update_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | Array of phone number ids and/or phone numbers in E164 forma... |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connectionId` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.phoneNumbers.jobs.updateBatch({
  phone_numbers: ['1583466971586889004', '+13127367254'],
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieve a phone numbers job

`client.phoneNumbers.jobs.retrieve()` — `GET /phone_numbers/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Numbers Job. |

```javascript
const job = await client.phoneNumbers.jobs.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(job.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List phone numbers with messaging settings

`client.phoneNumbers.messaging.list()` — `GET /phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[type]` | enum (tollfree, longcode, shortcode) | No | Filter by phone number type. |
| `sort[phoneNumber]` | enum (asc, desc) | No | Sort by phone number. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberWithMessagingSettings of client.phoneNumbers.messaging.list()) {
  console.log(phoneNumberWithMessagingSettings.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`client.phoneNumbers.slimList()` — `GET /phone_numbers/slim`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `includeConnection` | boolean | No | Include the connection associated with the phone number. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberSlimListResponse of client.phoneNumbers.slimList()) {
  console.log(phoneNumberSlimListResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List phone numbers with voice settings

`client.phoneNumbers.voice.list()` — `GET /phone_numbers/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberWithVoiceSettings of client.phoneNumbers.voice.list()) {
  console.log(phoneNumberWithVoiceSettings.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number

`client.phoneNumbers.retrieve()` — `GET /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const phoneNumber = await client.phoneNumbers.retrieve('1293384261075731499');

console.log(phoneNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a phone number

`client.phoneNumbers.update()` — `PATCH /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connectionId` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const phoneNumber = await client.phoneNumbers.update('1293384261075731499');

console.log(phoneNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Delete a phone number

`client.phoneNumbers.delete()` — `DELETE /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const phoneNumber = await client.phoneNumbers.delete('1293384261075731499');

console.log(phoneNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`client.phoneNumbers.actions.changeBundleStatus()` — `PATCH /phone_numbers/{id}/actions/bundle_status_change`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundleId` | string (UUID) | Yes | The new bundle_id setting for the number. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.phoneNumbers.actions.changeBundleStatus('1293384261075731499', {
  bundle_id: '5194d8fc-87e6-4188-baa9-1c434bbe861b',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Enable emergency for a phone number

`client.phoneNumbers.actions.enableEmergency()` — `POST /phone_numbers/{id}/actions/enable_emergency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emergencyEnabled` | boolean | Yes | Indicates whether to enable emergency services on this numbe... |
| `emergencyAddressId` | string (UUID) | Yes | Identifies the address to be used with emergency services. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.phoneNumbers.actions.enableEmergency('1293384261075731499', {
  emergency_address_id: '53829456729313',
  emergency_enabled: true,
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number with messaging settings

`client.phoneNumbers.messaging.retrieve()` — `GET /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const messaging = await client.phoneNumbers.messaging.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update the messaging profile and/or messaging product of a phone number

`client.phoneNumbers.messaging.update()` — `PATCH /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The phone number to update. |
| `messagingProfileId` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messagingProduct` | string | No | Configure the messaging product for this number:

* Omit thi... |

```javascript
const messaging = await client.phoneNumbers.messaging.update('550e8400-e29b-41d4-a716-446655440000');

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a phone number with voice settings

`client.phoneNumbers.voice.retrieve()` — `GET /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const voice = await client.phoneNumbers.voice.retrieve('1293384261075731499');

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Update a phone number with voice settings

`client.phoneNumbers.voice.update()` — `PATCH /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usagePaymentMethod` | enum (pay-per-minute, channel) | No | Controls whether a number is billed per minute or uses your ... |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) | No | The inbound_call_screening setting is a phone number configu... |
| `techPrefixEnabled` | boolean | No | Controls whether a tech prefix is enabled for this phone num... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const voice = await client.phoneNumbers.voice.update('1293384261075731499');

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## List Mobile Phone Numbers

`client.mobilePhoneNumbers.list()` — `GET /v2/mobile_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```javascript
// Automatically fetches more pages as needed.
for await (const mobilePhoneNumber of client.mobilePhoneNumbers.list()) {
  console.log(mobilePhoneNumber.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a Mobile Phone Number

`client.mobilePhoneNumbers.retrieve()` — `GET /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |

```javascript
const mobilePhoneNumber = await client.mobilePhoneNumbers.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(mobilePhoneNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a Mobile Phone Number

`client.mobilePhoneNumbers.update()` — `PATCH /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |
| `connectionId` | string (UUID) | No |  |
| `tags` | array[string] | No |  |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) | No |  |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const mobilePhoneNumber = await client.mobilePhoneNumbers.update('550e8400-e29b-41d4-a716-446655440000');

console.log(mobilePhoneNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
