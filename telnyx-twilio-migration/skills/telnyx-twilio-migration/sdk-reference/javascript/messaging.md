<!-- SDK reference: telnyx-messaging-javascript -->

# Telnyx Messaging - JavaScript

## Core Workflow

### Prerequisites

1. Buy a phone number (see telnyx-numbers-javascript)
2. Create a messaging profile and configure webhook URL (see telnyx-messaging-profiles-javascript)
3. Assign the phone number to the messaging profile
4. For US A2P via long code: complete 10DLC registration — brand, campaign, number assignment (see telnyx-10dlc-javascript)
5. For toll-free: complete toll-free verification

### Steps

1. **Search & buy number**: `client.availablePhoneNumbers.list()`
2. **Create messaging profile**: `client.messagingProfiles.create({name: ...})`
3. **Assign number to profile**: `client.phoneNumbers.messaging.update({id: ..., messagingProfileId: ...})`
4. **Send SMS**: `client.messages.send({from: ..., to: ..., text: ...})`
5. **Send MMS**: `client.messages.send({from: ..., to: ..., text: ..., mediaUrls: ['https://...']})`

### Common mistakes

- NEVER send without assigning the number to a messaging profile — the from number will be rejected
- NEVER send US A2P traffic via long code without 10DLC registration — messages silently blocked by carriers
- NEVER use non-E.164 phone numbers — must be +[country code][number] with no spaces or dashes
- NEVER assume delivery receipt = delivery — some carriers never return delivery receipts
- For MMS: pass media_urls: ["https://..."] — URLs must be publicly accessible HTTPS (max 1 MB per file, 10 attachments, 2 MB total). type is auto-detected when media_urls is present

**Related skills**: telnyx-messaging-profiles-javascript, telnyx-10dlc-javascript, telnyx-numbers-javascript

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
  const result = await client.messages.send({ to: '+13125550001', from: '+13125550002', text: 'Hello' });
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Send a message

Send a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to send a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`client.messages.send()` — `POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `from` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `messagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in the API Details section below |

```javascript
const response = await client.messages.send({
    to: '+18445550001',
    from: '+18005550101',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a message using an alphanumeric sender ID

Send an SMS message using an alphanumeric sender ID. This is SMS only.

`client.messages.sendWithAlphanumericSender()` — `POST /messages/alphanumeric_sender_id`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | A valid alphanumeric sender ID on the user's account. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `text` | string | Yes | The message body. |
| `messagingProfileId` | string (UUID) | Yes | The messaging profile ID to use. |
| `webhookUrl` | string (URL) | No | Callback URL for delivery status updates. |
| `webhookFailoverUrl` | string (URL) | No | Failover callback URL for delivery status updates. |
| `useProfileWebhooks` | boolean | No | If true, use the messaging profile's webhook settings. |

```javascript
const response = await client.messages.sendWithAlphanumericSender({
  from: 'MyCompany',
  messaging_profile_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  text: 'Hello from Telnyx!',
  to: '+13125550001',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a group MMS message

`client.messages.sendGroupMms()` — `POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | array[object] | Yes | A list of destinations. |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in the API Details section below |

```javascript
const response = await client.messages.sendGroupMms({
  from: '+13125551234',
  to: ['+18655551234', '+14155551234'],
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a long code message

`client.messages.sendLongCode()` — `POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```javascript
const response = await client.messages.sendLongCode({
    from: '+18445550001', to: '+13125550002',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a message using number pool

`client.messages.sendNumberPool()` — `POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```javascript
const response = await client.messages.sendNumberPool({
  messaging_profile_id: 'abc85f64-5717-4562-b3fc-2c9600000000',
  to: '+13125550002',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a short code message

`client.messages.sendShortCode()` — `POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```javascript
const response = await client.messages.sendShortCode({
    from: '+18445550001', to: '+18445550001',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Schedule a message

Schedule a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to schedule a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`client.messages.schedule()` — `POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `messagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in the API Details section below |

```javascript
const response = await client.messages.schedule({
    to: '+18445550001',
    from: '+18005550101',
    text: 'Appointment reminder',
    sendAt: '2025-07-01T15:00:00Z',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a WhatsApp message

`client.messages.sendWhatsapp()` — `POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number in +E.164 format associated with Whatsapp accou... |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `whatsappMessage` | object | Yes |  |
| `type` | enum (WHATSAPP) | No | Message type - must be set to "WHATSAPP" |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |

```javascript
const response = await client.messages.sendWhatsapp({
  from: '+13125551234',
  to: '+13125551234',
  whatsapp_message: {},
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Retrieve a message

Note: This API endpoint can only retrieve messages that are no older than 10 days since their creation. If you require messages older than this, please generate an [MDR report.](https://developers.telnyx.com/api-reference/mdr-usage-reports/create-mdr-usage-report)

`client.messages.retrieve()` — `GET /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the message |

```javascript
const message = await client.messages.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(message.data);
```

Key response fields: `response.data.data`

## Cancel a scheduled message

Cancel a scheduled message that has not yet been sent. Only messages with `status=scheduled` and `send_at` more than a minute from now can be cancelled.

`client.messages.cancelScheduled()` — `DELETE /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the message to cancel |

```javascript
const response = await client.messages.cancelScheduled('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.id);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## List alphanumeric sender IDs

List all alphanumeric sender IDs for the authenticated user.

`client.alphanumericSenderIDs.list()` — `GET /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[messagingProfileId]` | string (UUID) | No | Filter by messaging profile ID. |
| `page[number]` | integer | No | Page number. |
| `page[size]` | integer | No | Page size. |

```javascript
// Automatically fetches more pages as needed.
for await (const alphanumericSenderID of client.alphanumericSenderIDs.list()) {
  console.log(alphanumericSenderID.id);
}
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Create an alphanumeric sender ID

Create a new alphanumeric sender ID associated with a messaging profile.

`client.alphanumericSenderIDs.create()` — `POST /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `alphanumericSenderId` | string (UUID) | Yes | The alphanumeric sender ID string. |
| `messagingProfileId` | string (UUID) | Yes | The messaging profile to associate the sender ID with. |
| `usLongCodeFallback` | string | No | A US long code number to use as fallback when sending to US ... |

```javascript
const alphanumericSenderID = await client.alphanumericSenderIDs.create({
  alphanumeric_sender_id: 'MyCompany',
  messaging_profile_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(alphanumericSenderID.data);
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Retrieve an alphanumeric sender ID

Retrieve a specific alphanumeric sender ID.

`client.alphanumericSenderIDs.retrieve()` — `GET /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```javascript
const alphanumericSenderID = await client.alphanumericSenderIDs.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(alphanumericSenderID.data);
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Delete an alphanumeric sender ID

Delete an alphanumeric sender ID and disassociate it from its messaging profile.

`client.alphanumericSenderIDs.delete()` — `DELETE /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```javascript
const alphanumericSenderID = await client.alphanumericSenderIDs.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(alphanumericSenderID.data);
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Retrieve group MMS messages

Retrieve all messages in a group MMS conversation by the group message ID.

`client.messages.retrieveGroupMessages()` — `GET /messages/group/{message_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageId` | string (UUID) | Yes | The group message ID. |

```javascript
const response = await client.messages.retrieveGroupMessages(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## List messaging hosted numbers

List all hosted numbers associated with the authenticated user.

`client.messagingHostedNumbers.list()` — `GET /messaging_hosted_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort[phoneNumber]` | enum (asc, desc) | No | Sort by phone number. |
| `filter[messagingProfileId]` | string (UUID) | No | Filter by messaging profile ID. |
| `filter[phoneNumber]` | string | No | Filter by exact phone number. |
| ... | | | +3 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberWithMessagingSettings of client.messagingHostedNumbers.list()) {
  console.log(phoneNumberWithMessagingSettings.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a messaging hosted number

Retrieve a specific messaging hosted number by its ID or phone number.

`client.messagingHostedNumbers.retrieve()` — `GET /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID or phone number of the hosted number. |

```javascript
const messagingHostedNumber = await client.messagingHostedNumbers.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(messagingHostedNumber.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update a messaging hosted number

Update the messaging settings for a hosted number.

`client.messagingHostedNumbers.update()` — `PATCH /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID or phone number of the hosted number. |
| `messagingProfileId` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messagingProduct` | string | No | Configure the messaging product for this number:

* Omit thi... |

```javascript
const messagingHostedNumber = await client.messagingHostedNumbers.update('550e8400-e29b-41d4-a716-446655440000');

console.log(messagingHostedNumber.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List opt-outs

Retrieve a list of opt-out blocks.

`client.messagingOptouts.list()` — `GET /messaging_optouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `redactionEnabled` | string | No | If receiving address (+E.164 formatted phone number) should ... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const messagingOptoutListResponse of client.messagingOptouts.list()) {
  console.log(messagingOptoutListResponse.messaging_profile_id);
}
```

Key response fields: `response.data.to, response.data.from, response.data.messaging_profile_id`

## List high-level messaging profile metrics

List high-level metrics for all messaging profiles belonging to the authenticated user.

`client.messagingProfileMetrics.list()` — `GET /messaging_profile_metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `timeFrame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```javascript
const messagingProfileMetrics = await client.messagingProfileMetrics.list();

console.log(messagingProfileMetrics.data);
```

Key response fields: `response.data.data, response.data.meta`

## Regenerate messaging profile secret

Regenerate the v1 secret for a messaging profile.

`client.messagingProfiles.actions.regenerateSecret()` — `POST /messaging_profiles/{id}/actions/regenerate_secret`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |

```javascript
const response = await client.messagingProfiles.actions.regenerateSecret(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List alphanumeric sender IDs for a messaging profile

List all alphanumeric sender IDs associated with a specific messaging profile.

`client.messagingProfiles.listAlphanumericSenderIDs()` — `GET /messaging_profiles/{id}/alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `page[number]` | integer | No |  |
| `page[size]` | integer | No |  |

```javascript
// Automatically fetches more pages as needed.
for await (const alphanumericSenderID of client.messagingProfiles.listAlphanumericSenderIDs(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(alphanumericSenderID.id);
}
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Get detailed messaging profile metrics

Get detailed metrics for a specific messaging profile, broken down by time interval.

`client.messagingProfiles.retrieveMetrics()` — `GET /messaging_profiles/{id}/metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `timeFrame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```javascript
const response = await client.messagingProfiles.retrieveMetrics(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.data`

## List Auto-Response Settings

`client.messagingProfiles.autorespConfigs.list()` — `GET /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profileId` | string (UUID) | Yes |  |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| `createdAt` | object | No | Consolidated created_at parameter (deepObject style). |
| `updatedAt` | object | No | Consolidated updated_at parameter (deepObject style). |

```javascript
const autorespConfigs = await client.messagingProfiles.autorespConfigs.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(autorespConfigs.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create auto-response setting

`client.messagingProfiles.autorespConfigs.create()` — `POST /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `op` | enum (start, stop, info) | Yes |  |
| `keywords` | array[string] | Yes |  |
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes |  |
| `profileId` | string (UUID) | Yes |  |
| `respText` | string | No |  |

```javascript
const autoRespConfigResponse = await client.messagingProfiles.autorespConfigs.create('profile_id', {
  country_code: 'US',
  keywords: ['keyword1', 'keyword2'],
  op: 'start',
});

console.log(autoRespConfigResponse.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get Auto-Response Setting

`client.messagingProfiles.autorespConfigs.retrieve()` — `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profileId` | string (UUID) | Yes |  |
| `autorespCfgId` | string (UUID) | Yes |  |

```javascript
const autoRespConfigResponse = await client.messagingProfiles.autorespConfigs.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { profile_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(autoRespConfigResponse.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update Auto-Response Setting

`client.messagingProfiles.autorespConfigs.update()` — `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `op` | enum (start, stop, info) | Yes |  |
| `keywords` | array[string] | Yes |  |
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes |  |
| `profileId` | string (UUID) | Yes |  |
| `autorespCfgId` | string (UUID) | Yes |  |
| `respText` | string | No |  |

```javascript
const autoRespConfigResponse = await client.messagingProfiles.autorespConfigs.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    profile_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
    country_code: 'US',
    keywords: ['keyword1', 'keyword2'],
    op: 'start',
  },
);

console.log(autoRespConfigResponse.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete Auto-Response Setting

`client.messagingProfiles.autorespConfigs.delete()` — `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profileId` | string (UUID) | Yes |  |
| `autorespCfgId` | string (UUID) | Yes |  |

```javascript
const autorespConfig = await client.messagingProfiles.autorespConfigs.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { profile_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(autorespConfig);
```

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```javascript
// In your webhook handler (e.g., Express — use raw body, not parsed JSON):
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body.toString(), {
      headers: req.headers,
    });
    // Signature valid — event is the parsed webhook payload
    console.log('Received event:', event.data.event_type);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `deliveryUpdate` | `message.finalized` | Delivery Update |
| `inboundMessage` | `message.received` | Inbound Message |
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

Webhook payload field definitions are in the API Details section below.

---

# Messaging (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List alphanumeric sender IDs, Create an alphanumeric sender ID, Retrieve an alphanumeric sender ID, Delete an alphanumeric sender ID, List alphanumeric sender IDs for a messaging profile

| Field | Type |
|-------|------|
| `alphanumeric_sender_id` | string |
| `id` | uuid |
| `messaging_profile_id` | uuid |
| `organization_id` | string |
| `record_type` | enum: alphanumeric_sender_id |
| `us_long_code_fallback` | string |

**Returned by:** Send a message, Send a message using an alphanumeric sender ID, Retrieve group MMS messages, Send a group MMS message, Send a long code message, Send a message using number pool, Schedule a message, Send a short code message

| Field | Type |
|-------|------|
| `cc` | array[object] |
| `completed_at` | date-time |
| `cost` | object \| null |
| `cost_breakdown` | object \| null |
| `direction` | enum: outbound |
| `encoding` | string |
| `errors` | array[object] |
| `from` | object |
| `id` | uuid |
| `media` | array[object] |
| `messaging_profile_id` | string |
| `organization_id` | uuid |
| `parts` | integer |
| `received_at` | date-time |
| `record_type` | enum: message |
| `sent_at` | date-time |
| `smart_encoding_applied` | boolean |
| `subject` | string \| null |
| `tags` | array[string] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_id` | string \| null |
| `tcr_campaign_registered` | string \| null |
| `text` | string |
| `to` | array[object] |
| `type` | enum: SMS, MMS |
| `valid_until` | date-time |
| `wait_seconds` | float |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** Send a WhatsApp message

| Field | Type |
|-------|------|
| `body` | object |
| `direction` | string |
| `encoding` | string |
| `from` | object |
| `id` | string |
| `messaging_profile_id` | string |
| `organization_id` | string |
| `received_at` | date-time |
| `record_type` | string |
| `to` | array[object] |
| `type` | string |
| `wait_seconds` | float |

**Returned by:** Retrieve a message, Get detailed messaging profile metrics

| Field | Type |
|-------|------|
| `data` | object |

**Returned by:** Cancel a scheduled message

| Field | Type |
|-------|------|
| `cc` | array[object] |
| `completed_at` | date-time |
| `cost` | object \| null |
| `cost_breakdown` | object \| null |
| `direction` | enum: outbound |
| `encoding` | string |
| `errors` | array[object] |
| `from` | object |
| `id` | uuid |
| `media` | array[object] |
| `messaging_profile_id` | string |
| `organization_id` | uuid |
| `parts` | integer |
| `received_at` | date-time |
| `record_type` | enum: message |
| `sent_at` | date-time |
| `smart_encoding_applied` | boolean |
| `subject` | string \| null |
| `tags` | array[string] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_id` | string \| null |
| `tcr_campaign_registered` | string \| null |
| `text` | string |
| `to` | array[object] |
| `type` | enum: SMS, MMS |
| `valid_until` | date-time |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** List messaging hosted numbers, Retrieve a messaging hosted number, Update a messaging hosted number

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

**Returned by:** List opt-outs

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `from` | string |
| `keyword` | string \| null |
| `messaging_profile_id` | string \| null |
| `to` | string |

**Returned by:** List high-level messaging profile metrics

| Field | Type |
|-------|------|
| `data` | array[object] |
| `meta` | object |

**Returned by:** Regenerate messaging profile secret

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

**Returned by:** List Auto-Response Settings, Create auto-response setting, Get Auto-Response Setting, Update Auto-Response Setting

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `id` | string |
| `keywords` | array[string] |
| `op` | enum: start, stop, info |
| `resp_text` | string |
| `updated_at` | date-time |

## Optional Parameters

### Create an alphanumeric sender ID — `client.alphanumericSenderIDs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `usLongCodeFallback` | string | A US long code number to use as fallback when sending to US destinations. |

### Send a message — `client.messages.send()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messagingProfileId` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `mediaUrls` | array[string] | A list of media URLs. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `useProfileWebhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `autoDetect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `sendAt` | string (date-time) | ISO 8601 formatted date indicating when to send the message - accurate up til... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a message using an alphanumeric sender ID — `client.messages.sendWithAlphanumericSender()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookUrl` | string (URL) | Callback URL for delivery status updates. |
| `webhookFailoverUrl` | string (URL) | Failover callback URL for delivery status updates. |
| `useProfileWebhooks` | boolean | If true, use the messaging profile's webhook settings. |

### Send a group MMS message — `client.messages.sendGroupMms()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `mediaUrls` | array[string] | A list of media URLs. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `useProfileWebhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |

### Send a long code message — `client.messages.sendLongCode()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `mediaUrls` | array[string] | A list of media URLs. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `useProfileWebhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `autoDetect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a message using number pool — `client.messages.sendNumberPool()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `mediaUrls` | array[string] | A list of media URLs. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `useProfileWebhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `autoDetect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Schedule a message — `client.messages.schedule()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messagingProfileId` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `mediaUrls` | array[string] | A list of media URLs. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `useProfileWebhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `autoDetect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `sendAt` | string (date-time) | ISO 8601 formatted date indicating when to send the message - accurate up til... |

### Send a short code message — `client.messages.sendShortCode()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `mediaUrls` | array[string] | A list of media URLs. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `useProfileWebhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `autoDetect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a WhatsApp message — `client.messages.sendWhatsapp()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | enum (WHATSAPP) | Message type - must be set to "WHATSAPP" |
| `webhookUrl` | string (URL) | The URL where webhooks related to this message will be sent. |

### Update a messaging hosted number — `client.messagingHostedNumbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `messagingProfileId` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `messagingProduct` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `tags` | array[string] | Tags to set on this phone number. |

### Create auto-response setting — `client.messagingProfiles.autorespConfigs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `respText` | string |  |

### Update Auto-Response Setting — `client.messagingProfiles.autorespConfigs.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `respText` | string |  |

## Webhook Payload Fields

### `deliveryUpdate`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum: message.sent, message.finalized | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum: message | Identifies the type of the resource. |
| `data.payload.direction` | enum: outbound | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | uuid | The id of the organization the messaging profile belongs to. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | string \| null | Subject of multimedia message |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | object \| null |  |
| `data.payload.cost_breakdown` | object \| null | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | string \| null | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | string \| null | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.valid_until` | date-time | Message must be out of the queue by this time or else it will be discarded and marked as 'sending_failed'. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |
| `data.payload.smart_encoding_applied` | boolean | Indicates whether smart encoding was applied to this message. |
| `data.payload.wait_seconds` | float | Seconds the message is queued due to rate limiting before being sent to the carrier. |
| `meta.attempt` | integer | Number of attempts to deliver the webhook event. |
| `meta.delivered_to` | url | The webhook URL the event was delivered to. |

### `inboundMessage`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum: message.received | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum: message | Identifies the type of the resource. |
| `data.payload.direction` | enum: inbound | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | string | Unique identifier for a messaging profile. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | string \| null | Message subject. |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | object \| null |  |
| `data.payload.cost_breakdown` | object \| null | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | string \| null | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | string \| null | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | Not used for inbound messages. |
| `data.payload.completed_at` | date-time | Not used for inbound messages. |
| `data.payload.valid_until` | date-time | Not used for inbound messages. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |

### `replacedLinkClick`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | string | Identifies the type of the resource. |
| `data.url` | string | The original link that was sent in the message. |
| `data.to` | string | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or short code). |
| `data.message_id` | uuid | The message ID associated with the clicked link. |
| `data.time_clicked` | date-time | ISO 8601 formatted date indicating when the message request was received. |

### Field Type Notes

- `from` in responses/webhooks: object with sub-fields `phone_number` (string), `carrier` (string), `line_type` (string)
- `to` in responses/webhooks: array of objects, each with `phone_number` (string), `carrier` (string), `line_type` (string), `status` (string)
- `cost`: object with `amount` (string, decimal), `currency` (string, e.g., 'USD')
