<!-- SDK reference: telnyx-account-notifications-javascript -->

# Telnyx Account Notifications - JavaScript

## Core Workflow

### Steps

1. **Create notification channel**: `client.notificationChannels.create({channelTypeId: ..., channelDestination: ...})`
2. **Create notification profile**: `client.notificationProfiles.create({name: ...})`

### Common mistakes

- Notification channels must be verified before they receive alerts

**Related skills**: telnyx-account-javascript

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
  const result = await client.notification_channels.create(params);
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
## List notification channels

List notification channels.

`client.notificationChannels.list()` — `GET /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const notificationChannel of client.notificationChannels.list()) {
  console.log(notificationChannel.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a notification channel

Create a notification channel.

`client.notificationChannels.create()` — `POST /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```javascript
const notificationChannel = await client.notificationChannels.create({
    channelTypeId: 'webhook',
    channelDestination: 'https://example.com/webhooks',
});

console.log(notificationChannel.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a notification channel

Get a notification channel.

`client.notificationChannels.retrieve()` — `GET /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```javascript
const notificationChannel = await client.notificationChannels.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationChannel.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a notification channel

Update a notification channel.

`client.notificationChannels.update()` — `PATCH /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `notificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```javascript
const notificationChannel = await client.notificationChannels.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationChannel.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a notification channel

Delete a notification channel.

`client.notificationChannels.delete()` — `DELETE /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```javascript
const notificationChannel = await client.notificationChannels.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationChannel.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`client.notificationEventConditions.list()` — `GET /notification_event_conditions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const notificationEventConditionListResponse of client.notificationEventConditions.list()) {
  console.log(notificationEventConditionListResponse.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Events

Returns a list of your notifications events.

`client.notificationEvents.list()` — `GET /notification_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const notificationEventListResponse of client.notificationEvents.list()) {
  console.log(notificationEventListResponse.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Profiles

Returns a list of your notifications profiles.

`client.notificationProfiles.list()` — `GET /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const notificationProfile of client.notificationProfiles.list()) {
  console.log(notificationProfile.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a notification profile

Create a notification profile.

`client.notificationProfiles.create()` — `POST /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `createdAt` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```javascript
const notificationProfile = await client.notificationProfiles.create({
    name: 'My Notification Profile',
});

console.log(notificationProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a notification profile

Get a notification profile.

`client.notificationProfiles.retrieve()` — `GET /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```javascript
const notificationProfile = await client.notificationProfiles.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a notification profile

Update a notification profile.

`client.notificationProfiles.update()` — `PATCH /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `createdAt` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```javascript
const notificationProfile = await client.notificationProfiles.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a notification profile

Delete a notification profile.

`client.notificationProfiles.delete()` — `DELETE /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```javascript
const notificationProfile = await client.notificationProfiles.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List notification settings

List notification settings.

`client.notificationSettings.list()` — `GET /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const notificationSetting of client.notificationSettings.list()) {
  console.log(notificationSetting.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Add a Notification Setting

Add a notification setting.

`client.notificationSettings.create()` — `POST /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notificationEventConditionId` | string (UUID) | No | A UUID reference to the associated Notification Event Condit... |
| `notificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | No | Most preferences apply immediately; however, other may needs... |
| ... | | | +7 optional params in the API Details section below |

```javascript
const notificationSetting = await client.notificationSettings.create();

console.log(notificationSetting.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a notification setting

Get a notification setting.

`client.notificationSettings.retrieve()` — `GET /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```javascript
const notificationSetting = await client.notificationSettings.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationSetting.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a notification setting

Delete a notification setting.

`client.notificationSettings.delete()` — `DELETE /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```javascript
const notificationSetting = await client.notificationSettings.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(notificationSetting.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

# Account Notifications (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List notification channels, Create a notification channel, Get a notification channel, Update a notification channel, Delete a notification channel

| Field | Type |
|-------|------|
| `channel_destination` | string |
| `channel_type_id` | enum: sms, voice, email, webhook |
| `created_at` | date-time |
| `id` | string |
| `notification_profile_id` | string |
| `updated_at` | date-time |

**Returned by:** List all Notifications Events Conditions

| Field | Type |
|-------|------|
| `allow_multiple_channels` | boolean |
| `associated_record_type` | enum: account, phone_number |
| `asynchronous` | boolean |
| `created_at` | date-time |
| `description` | string |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `notification_event_id` | string |
| `parameters` | array[object] |
| `supported_channels` | array[string] |
| `updated_at` | date-time |

**Returned by:** List all Notifications Events

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `notification_category` | string |
| `updated_at` | date-time |

**Returned by:** List all Notifications Profiles, Create a notification profile, Get a notification profile, Update a notification profile, Delete a notification profile

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `name` | string |
| `updated_at` | date-time |

**Returned by:** List notification settings, Add a Notification Setting, Get a notification setting, Delete a notification setting

| Field | Type |
|-------|------|
| `associated_record_type` | string |
| `associated_record_type_value` | string |
| `created_at` | date-time |
| `id` | string |
| `notification_channel_id` | string |
| `notification_event_condition_id` | string |
| `notification_profile_id` | string |
| `parameters` | array[object] |
| `status` | enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted |
| `updated_at` | date-time |

## Optional Parameters

### Create a notification channel — `client.notificationChannels.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channelDestination` | string | The destination associated with the channel type. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification channel — `client.notificationChannels.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channelDestination` | string | The destination associated with the channel type. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Create a notification profile — `client.notificationProfiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification profile — `client.notificationProfiles.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Add a Notification Setting — `client.notificationSettings.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notificationEventConditionId` | string (UUID) | A UUID reference to the associated Notification Event Condition. |
| `notificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `associatedRecordType` | string |  |
| `associatedRecordTypeValue` | string |  |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | Most preferences apply immediately; however, other may needs to propagate. |
| `notificationChannelId` | string (UUID) | A UUID reference to the associated Notification Channel. |
| `parameters` | array[object] |  |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
