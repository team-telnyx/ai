<!-- SDK reference: telnyx-messaging-profiles-javascript -->

# Telnyx Messaging Profiles - JavaScript

## Core Workflow

### Prerequisites

1. Buy phone number(s) to assign to the profile (see telnyx-numbers-javascript)

### Steps

1. **Create profile**: `client.messagingProfiles.create({name: ..., whitelistedDestinations: [...]})`
2. **Configure webhooks**: `client.messagingProfiles.update({id: ..., webhookUrl: ..., webhookFailoverUrl: ...})`
3. **Assign numbers**: `client.phoneNumbers.messaging.update({id: ..., messagingProfileId: ...})`
4. **(Optional) Enable number pool**: `client.messagingProfiles.update({id: ..., numberPoolSettings: {...}})`

### Common mistakes

- NEVER omit whitelisted_destinations — messages fail if the destination country is not whitelisted
- NEVER send messages with a disabled messaging profile — error 40312
- NEVER forget to assign numbers to the profile — the from number will be rejected
- Number pool requires number_pool_settings to be set AND multiple numbers assigned
- Setting messaging_profile_id to empty string unassigns the number — use null/omit to keep current value

**Related skills**: telnyx-messaging-javascript, telnyx-numbers-javascript, telnyx-10dlc-javascript

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
  const result = await client.messaging_profiles.create(params);
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a messaging profile

`client.messagingProfiles.create()` — `POST /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the messaging profile. |
| `whitelistedDestinations` | array[string] | Yes | Destinations to which the messaging profile is allowed to se... |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `webhookApiVersion` | enum (1, 2, 2010-04-01) | No | Determines which webhook format will be used, Telnyx API v1,... |
| ... | | | +13 optional params in the API Details section below |

```javascript
const messagingProfile = await client.messagingProfiles.create({
  name: 'My name',
  whitelisted_destinations: ['US'],
});

console.log(messagingProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List messaging profiles

`client.messagingProfiles.list()` — `GET /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter[name][eq]` | string | No | Filter profiles by exact name match. |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const messagingProfile of client.messagingProfiles.list()) {
  console.log(messagingProfile.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a messaging profile

`client.messagingProfiles.retrieve()` — `GET /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```javascript
const messagingProfile = await client.messagingProfiles.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messagingProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a messaging profile

`client.messagingProfiles.update()` — `PATCH /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `recordType` | enum (messaging_profile) | No | Identifies the type of the resource. |
| ... | | | +17 optional params in the API Details section below |

```javascript
const messagingProfile = await client.messagingProfiles.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messagingProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List phone numbers associated with a messaging profile

`client.messagingProfiles.listPhoneNumbers()` — `GET /messaging_profiles/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberWithMessagingSettings of client.messagingProfiles.listPhoneNumbers(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(phoneNumberWithMessagingSettings.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Delete a messaging profile

`client.messagingProfiles.delete()` — `DELETE /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```javascript
const messagingProfile = await client.messagingProfiles.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messagingProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List short codes associated with a messaging profile

`client.messagingProfiles.listShortCodes()` — `GET /messaging_profiles/{id}/short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const shortCode of client.messagingProfiles.listShortCodes(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(shortCode.messaging_profile_id);
}
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## List short codes

`client.shortCodes.list()` — `GET /short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const shortCode of client.shortCodes.list()) {
  console.log(shortCode.messaging_profile_id);
}
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Retrieve a short code

`client.shortCodes.retrieve()` — `GET /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the short code |

```javascript
const shortCode = await client.shortCodes.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(shortCode.data);
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Update short code

Update the settings for a specific short code. To unbind a short code from a profile, set the `messaging_profile_id` to `null` or an empty string. To add or update tags, include the tags field as an array of strings.

`client.shortCodes.update()` — `PATCH /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `id` | string (UUID) | Yes | The id of the short code |
| `tags` | array[string] | No |  |

```javascript
const shortCode = await client.shortCodes.update('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  messaging_profile_id: 'abc85f64-5717-4562-b3fc-2c9600000000',
});

console.log(shortCode.data);
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

---

# Messaging Profiles (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List messaging profiles, Create a messaging profile, Retrieve a messaging profile, Update a messaging profile, Delete a messaging profile

| Field | Type |
|-------|------|
| `ai_assistant_id` | string \| null |
| `alpha_sender` | string \| null |
| `created_at` | date-time |
| `daily_spend_limit` | string |
| `daily_spend_limit_enabled` | boolean |
| `enabled` | boolean |
| `health_webhook_url` | url |
| `id` | uuid |
| `mms_fall_back_to_sms` | boolean |
| `mms_transcoding` | boolean |
| `mobile_only` | boolean |
| `name` | string |
| `number_pool_settings` | object \| null |
| `organization_id` | string |
| `record_type` | enum: messaging_profile |
| `redaction_enabled` | boolean |
| `redaction_level` | integer |
| `resource_group_id` | string \| null |
| `smart_encoding` | boolean |
| `updated_at` | date-time |
| `url_shortener_settings` | object \| null |
| `v1_secret` | string |
| `webhook_api_version` | enum: 1, 2, 2010-04-01 |
| `webhook_failover_url` | url |
| `webhook_url` | url |
| `whitelisted_destinations` | array[string] |

**Returned by:** List phone numbers associated with a messaging profile

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `eligible_messaging_products` | array[string] |
| `features` | object |
| `health` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: long-code, toll-free, short-code, longcode, tollfree, shortcode |
| `updated_at` | date-time |

**Returned by:** List short codes associated with a messaging profile, List short codes, Retrieve a short code, Update short code

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `messaging_profile_id` | string \| null |
| `record_type` | enum: short_code |
| `short_code` | string |
| `tags` | array |
| `updated_at` | date-time |

## Optional Parameters

### Create a messaging profile — `client.messagingProfiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `webhookApiVersion` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `numberPoolSettings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `urlShortenerSettings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `alphaSender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `dailySpendLimit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `dailySpendLimitEnabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `mmsFallBackToSms` | boolean | enables SMS fallback for MMS messages. |
| `mmsTranscoding` | boolean | enables automated resizing of MMS media. |
| `mobileOnly` | boolean | Send messages only to mobile phone numbers. |
| `smartEncoding` | boolean | Enables automatic character encoding optimization for SMS messages. |
| `resourceGroupId` | string (UUID) | The resource group ID to associate with this messaging profile. |
| `healthWebhookUrl` | string (URL) | A URL to receive health check webhooks for numbers in this profile. |
| `aiAssistantId` | string (UUID) | The AI assistant ID to associate with this messaging profile. |

### Update a messaging profile — `client.messagingProfiles.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `recordType` | enum (messaging_profile) | Identifies the type of the resource. |
| `id` | string (UUID) | Identifies the type of resource. |
| `name` | string | A user friendly name for the messaging profile. |
| `enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `webhookApiVersion` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `whitelistedDestinations` | array[string] | Destinations to which the messaging profile is allowed to send. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
| `v1Secret` | string | Secret used to authenticate with v1 endpoints. |
| `numberPoolSettings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `urlShortenerSettings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `alphaSender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `dailySpendLimit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `dailySpendLimitEnabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `mmsFallBackToSms` | boolean | enables SMS fallback for MMS messages. |
| `mmsTranscoding` | boolean | enables automated resizing of MMS media. |
| `mobileOnly` | boolean | Send messages only to mobile phone numbers. |
| `smartEncoding` | boolean | Enables automatic character encoding optimization for SMS messages. |

### Update short code — `client.shortCodes.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] |  |
