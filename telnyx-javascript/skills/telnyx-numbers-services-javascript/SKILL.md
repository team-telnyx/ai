---
name: telnyx-numbers-services-javascript
description: >-
  Voicemail, voice channels, and emergency (E911) services for phone numbers.
metadata:
  author: telnyx
  product: numbers-services
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Services - JavaScript

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-javascript)

### Steps

1. **Set up voicemail**: `client.voicemail.create({phoneNumberId: ...})`
2. **Configure E911**: `client.dynamicEmergencyEndpoints.create({...: ...})`

### Common mistakes

- E911 addresses must be validated — invalid addresses will cause regulatory issues

**Related skills**: telnyx-numbers-javascript, telnyx-numbers-config-javascript

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
  const result = await client.voicemail.create(params);
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

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List your voice channels for non-US zones

Returns the non-US voice channels for your account. voice channels allow you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.channelZones.list()` — `GET /channel_zones`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const channelZoneListResponse of client.channelZones.list()) {
  console.log(channelZoneListResponse.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones. This allows your account to handle multiple simultaneous inbound calls to Non-US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.channelZones.update()` — `PUT /channel_zones/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The number of reserved channels |

```javascript
const channelZone = await client.channelZones.update('channel_zone_id', { channels: 0 });

console.log(channelZone.id);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`client.dynamicEmergencyAddresses.list()` — `GET /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const dynamicEmergencyAddress of client.dynamicEmergencyAddresses.list()) {
  console.log(dynamicEmergencyAddress.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency address.

Creates a dynamic emergency address.

`client.dynamicEmergencyAddresses.create()` — `POST /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `houseNumber` | string | Yes |  |
| `streetName` | string | Yes |  |
| `locality` | string | Yes |  |
| `administrativeArea` | string | Yes |  |
| `postalCode` | string | Yes |  |
| `countryCode` | enum (US, CA, PR) | Yes |  |
| `sipGeolocationId` | string (UUID) | No | Unique location reference string to be used in SIP INVITE fr... |
| `status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `id` | string (UUID) | No |  |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const dynamicEmergencyAddress = await client.dynamicEmergencyAddresses.create({
  administrative_area: 'TX',
  country_code: 'US',
  house_number: '600',
  locality: 'Austin',
  postal_code: '78701',
  street_name: 'Congress',
});

console.log(dynamicEmergencyAddress.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`client.dynamicEmergencyAddresses.retrieve()` — `GET /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```javascript
const dynamicEmergencyAddress = await client.dynamicEmergencyAddresses.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyAddress.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`client.dynamicEmergencyAddresses.delete()` — `DELETE /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```javascript
const dynamicEmergencyAddress = await client.dynamicEmergencyAddresses.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyAddress.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`client.dynamicEmergencyEndpoints.list()` — `GET /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const dynamicEmergencyEndpoint of client.dynamicEmergencyEndpoints.list()) {
  console.log(dynamicEmergencyEndpoint.dynamic_emergency_address_id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency endpoint.

Creates a dynamic emergency endpoints.

`client.dynamicEmergencyEndpoints.create()` — `POST /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dynamicEmergencyAddressId` | string (UUID) | Yes | An id of a currently active dynamic emergency location. |
| `callbackNumber` | string | Yes |  |
| `callerName` | string | Yes |  |
| `status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `sipFromId` | string (UUID) | No |  |
| `id` | string (UUID) | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const dynamicEmergencyEndpoint = await client.dynamicEmergencyEndpoints.create({
  callback_number: '+13125550000',
  caller_name: 'Jane Doe Desk Phone',
  dynamic_emergency_address_id: '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
});

console.log(dynamicEmergencyEndpoint.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`client.dynamicEmergencyEndpoints.retrieve()` — `GET /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```javascript
const dynamicEmergencyEndpoint = await client.dynamicEmergencyEndpoints.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyEndpoint.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`client.dynamicEmergencyEndpoints.delete()` — `DELETE /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```javascript
const dynamicEmergencyEndpoint = await client.dynamicEmergencyEndpoints.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyEndpoint.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List your voice channels for US Zone

Returns the US Zone voice channels for your account. voice channels allows you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.inboundChannels.list()` — `GET /inbound_channels`

```javascript
const inboundChannels = await client.inboundChannels.list();

console.log(inboundChannels.data);
```

Key response fields: `response.data.channels, response.data.record_type`

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone. This allows your account to handle multiple simultaneous inbound calls to US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.inboundChannels.update()` — `PATCH /inbound_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The new number of concurrent channels for the account |

```javascript
const inboundChannel = await client.inboundChannels.update({ channels: 7 });

console.log(inboundChannel.data);
```

Key response fields: `response.data.channels, response.data.record_type`

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`client.list.retrieveAll()` — `GET /list`

```javascript
const response = await client.list.retrieveAll();

console.log(response.data);
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`client.list.retrieveByZone()` — `GET /list/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelZoneId` | string (UUID) | Yes | Channel zone identifier |

```javascript
const response = await client.list.retrieveByZone('channel_zone_id');

console.log(response.data);
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## Get voicemail

Returns the voicemail settings for a phone number

`client.phoneNumbers.voicemail.retrieve()` — `GET /phone_numbers/{phone_number_id}/voicemail`

```javascript
const voicemail = await client.phoneNumbers.voicemail.retrieve('123455678900');

console.log(voicemail.data);
```

Key response fields: `response.data.enabled, response.data.pin`

## Create voicemail

Create voicemail settings for a phone number

`client.phoneNumbers.voicemail.create()` — `POST /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```javascript
const voicemail = await client.phoneNumbers.voicemail.create('123455678900');

console.log(voicemail.data);
```

Key response fields: `response.data.enabled, response.data.pin`

## Update voicemail

Update voicemail settings for a phone number

`client.phoneNumbers.voicemail.update()` — `PATCH /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```javascript
const voicemail = await client.phoneNumbers.voicemail.update('123455678900');

console.log(voicemail.data);
```

Key response fields: `response.data.enabled, response.data.pin`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
