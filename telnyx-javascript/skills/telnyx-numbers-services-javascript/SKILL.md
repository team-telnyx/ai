---
name: telnyx-numbers-services-javascript
description: >-
  Configure voicemail, voice channels, and emergency (E911) services for your
  phone numbers. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: numbers-services
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Services - JavaScript

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

## List your voice channels for non-US zones

Returns the non-US voice channels for your account.

`GET /channel_zones`

```javascript
// Automatically fetches more pages as needed.
for await (const channelZoneListResponse of client.channelZones.list()) {
  console.log(channelZoneListResponse.id);
}
```

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones.

`PUT /channel_zones/{channel_zone_id}` — Required: `channels`

```javascript
const channelZone = await client.channelZones.update('channel_zone_id', { channels: 0 });

console.log(channelZone.id);
```

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`GET /dynamic_emergency_addresses`

```javascript
// Automatically fetches more pages as needed.
for await (const dynamicEmergencyAddress of client.dynamicEmergencyAddresses.list()) {
  console.log(dynamicEmergencyAddress.id);
}
```

## Create a dynamic emergency address.

Creates a dynamic emergency address.

`POST /dynamic_emergency_addresses` — Required: `house_number`, `street_name`, `locality`, `administrative_area`, `postal_code`, `country_code`

Optional: `created_at` (string), `extended_address` (string), `house_suffix` (string), `id` (string), `record_type` (string), `sip_geolocation_id` (string), `status` (enum), `street_post_directional` (string), `street_pre_directional` (string), `street_suffix` (string), `updated_at` (string)

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

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`GET /dynamic_emergency_addresses/{id}`

```javascript
const dynamicEmergencyAddress = await client.dynamicEmergencyAddresses.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyAddress.data);
```

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`DELETE /dynamic_emergency_addresses/{id}`

```javascript
const dynamicEmergencyAddress = await client.dynamicEmergencyAddresses.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyAddress.data);
```

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`GET /dynamic_emergency_endpoints`

```javascript
// Automatically fetches more pages as needed.
for await (const dynamicEmergencyEndpoint of client.dynamicEmergencyEndpoints.list()) {
  console.log(dynamicEmergencyEndpoint.dynamic_emergency_address_id);
}
```

## Create a dynamic emergency endpoint.

Creates a dynamic emergency endpoints.

`POST /dynamic_emergency_endpoints` — Required: `dynamic_emergency_address_id`, `callback_number`, `caller_name`

Optional: `created_at` (string), `id` (string), `record_type` (string), `sip_from_id` (string), `status` (enum), `updated_at` (string)

```javascript
const dynamicEmergencyEndpoint = await client.dynamicEmergencyEndpoints.create({
  callback_number: '+13125550000',
  caller_name: 'Jane Doe Desk Phone',
  dynamic_emergency_address_id: '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
});

console.log(dynamicEmergencyEndpoint.data);
```

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`GET /dynamic_emergency_endpoints/{id}`

```javascript
const dynamicEmergencyEndpoint = await client.dynamicEmergencyEndpoints.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyEndpoint.data);
```

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`DELETE /dynamic_emergency_endpoints/{id}`

```javascript
const dynamicEmergencyEndpoint = await client.dynamicEmergencyEndpoints.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(dynamicEmergencyEndpoint.data);
```

## List your voice channels for US Zone

Returns the US Zone voice channels for your account.

`GET /inbound_channels`

```javascript
const inboundChannels = await client.inboundChannels.list();

console.log(inboundChannels.data);
```

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone.

`PATCH /inbound_channels` — Required: `channels`

```javascript
const inboundChannel = await client.inboundChannels.update({ channels: 7 });

console.log(inboundChannel.data);
```

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`GET /list`

```javascript
const response = await client.list.retrieveAll();

console.log(response.data);
```

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`GET /list/{channel_zone_id}`

```javascript
const response = await client.list.retrieveByZone('channel_zone_id');

console.log(response.data);
```

## Get voicemail

Returns the voicemail settings for a phone number

`GET /phone_numbers/{phone_number_id}/voicemail`

```javascript
const voicemail = await client.phoneNumbers.voicemail.retrieve('123455678900');

console.log(voicemail.data);
```

## Create voicemail

Create voicemail settings for a phone number

`POST /phone_numbers/{phone_number_id}/voicemail`

Optional: `enabled` (boolean), `pin` (string)

```javascript
const voicemail = await client.phoneNumbers.voicemail.create('123455678900');

console.log(voicemail.data);
```

## Update voicemail

Update voicemail settings for a phone number

`PATCH /phone_numbers/{phone_number_id}/voicemail`

Optional: `enabled` (boolean), `pin` (string)

```javascript
const voicemail = await client.phoneNumbers.voicemail.update('123455678900');

console.log(voicemail.data);
```
