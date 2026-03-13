---
name: telnyx-messaging-javascript
description: >-
  Send and receive SMS/MMS, handle opt-outs and delivery webhooks. Use for
  notifications, 2FA, or messaging apps.
metadata:
  author: telnyx
  product: messaging
  language: javascript
  generated_by: telnyx-ext-skills-generator
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging - JavaScript

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
  const response = await client.messages.send({
      to: '+18445550001',
      from: '+18005550101',
      text: 'Hello from Telnyx!',
  });
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
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

## Operational Caveats

- The sending number must already be assigned to the correct messaging profile before you send traffic from it.
- US A2P long-code traffic must complete 10DLC registration before production sending or carriers will block or heavily filter messages.
- Delivery webhooks are asynchronous. Treat the send response as acceptance of the request, not final carrier delivery.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Send an SMS

Primary outbound messaging flow. Agents need exact request fields and delivery-related response fields.

`client.messages.send()` — `POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `from` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `messagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.send({
    to: '+18445550001',
    from: '+18005550101',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.text`
- `response.data.sentAt`
- `response.data.errors`

### Send an SMS with an alphanumeric sender ID

Common sender variant that requires different request shape.

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

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.text`
- `response.data.sentAt`
- `response.data.errors`

---

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

## Webhooks

These webhook payload fields are inline because they are part of the primary integration path.

### Delivery Update

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.sent, message.finalized | The type of event being delivered. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.to` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.cost` | object \| null |  |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirm... |

### Inbound Message

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.received | The type of event being delivered. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.direction` | enum: inbound | The direction of the message. |
| `data.payload.to` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.media` | array[object] |  |
| `data.record_type` | enum: event | Identifies the type of the resource. |

If you need webhook fields that are not listed inline here, read [the webhook payload reference](references/api-details.md#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Send a group MMS message

Send one MMS payload to multiple recipients.

`client.messages.sendGroupMms()` — `POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | array[object] | Yes | A list of destinations. |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.sendGroupMms({
  from: '+13125551234',
  to: ['+18655551234', '+14155551234'],
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a long code message

Force a long-code sending path instead of the generic send endpoint.

`client.messages.sendLongCode()` — `POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.sendLongCode({
    from: '+18445550001', to: '+13125550002',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a message using number pool

Let a messaging profile or number pool choose the sender for you.

`client.messages.sendNumberPool()` — `POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.sendNumberPool({
  messaging_profile_id: 'abc85f64-5717-4562-b3fc-2c9600000000',
  to: '+13125550002',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a short code message

Force a short-code sending path when the sender must be a short code.

`client.messages.sendShortCode()` — `POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.sendShortCode({
    from: '+18445550001', to: '+18445550001',
    text: 'Hello from Telnyx!',
});

console.log(response.data);
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Schedule a message

Queue a message for future delivery instead of sending immediately.

`client.messages.schedule()` — `POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `messagingProfileId` | string (UUID) | No | Unique identifier for a messaging profile. |
| `mediaUrls` | array[string] | No | A list of media URLs. |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.schedule({
    to: '+18445550001',
    from: '+18005550101',
    text: 'Appointment reminder',
    sendAt: '2025-07-01T15:00:00Z',
});

console.log(response.data);
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a WhatsApp message

Send WhatsApp traffic instead of SMS/MMS.

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

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.body`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Retrieve a message | `client.messages.retrieve()` | `GET /messages/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Cancel a scheduled message | `client.messages.cancelScheduled()` | `DELETE /messages/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| List alphanumeric sender IDs | `client.alphanumericSenderIDs.list()` | `GET /alphanumeric_sender_ids` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an alphanumeric sender ID | `client.alphanumericSenderIDs.create()` | `POST /alphanumeric_sender_ids` | Create or provision an additional resource when the core tasks do not cover this flow. | `alphanumericSenderId`, `messagingProfileId` |
| Retrieve an alphanumeric sender ID | `client.alphanumericSenderIDs.retrieve()` | `GET /alphanumeric_sender_ids/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Delete an alphanumeric sender ID | `client.alphanumericSenderIDs.delete()` | `DELETE /alphanumeric_sender_ids/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| Retrieve group MMS messages | `client.messages.retrieveGroupMessages()` | `GET /messages/group/{message_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `messageId` |
| List messaging hosted numbers | `client.messagingHostedNumbers.list()` | `GET /messaging_hosted_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a messaging hosted number | `client.messagingHostedNumbers.retrieve()` | `GET /messaging_hosted_numbers/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Update a messaging hosted number | `client.messagingHostedNumbers.update()` | `PATCH /messaging_hosted_numbers/{id}` | Modify an existing resource without recreating it. | `id` |
| List opt-outs | `client.messagingOptouts.list()` | `GET /messaging_optouts` | Inspect available resources or choose an existing resource before mutating it. | None |
| List high-level messaging profile metrics | `client.messagingProfileMetrics.list()` | `GET /messaging_profile_metrics` | Inspect available resources or choose an existing resource before mutating it. | None |
| Regenerate messaging profile secret | `client.messagingProfiles.actions.regenerateSecret()` | `POST /messaging_profiles/{id}/actions/regenerate_secret` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `id` |
| List alphanumeric sender IDs for a messaging profile | `client.messagingProfiles.listAlphanumericSenderIDs()` | `GET /messaging_profiles/{id}/alphanumeric_sender_ids` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Get detailed messaging profile metrics | `client.messagingProfiles.retrieveMetrics()` | `GET /messaging_profiles/{id}/metrics` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List Auto-Response Settings | `client.messagingProfiles.autorespConfigs.list()` | `GET /messaging_profiles/{profile_id}/autoresp_configs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `profileId` |
| Create auto-response setting | `client.messagingProfiles.autorespConfigs.create()` | `POST /messaging_profiles/{profile_id}/autoresp_configs` | Create or provision an additional resource when the core tasks do not cover this flow. | `op`, `keywords`, `countryCode`, `profileId` |
| Get Auto-Response Setting | `client.messagingProfiles.autorespConfigs.retrieve()` | `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `profileId`, `autorespCfgId` |
| Update Auto-Response Setting | `client.messagingProfiles.autorespConfigs.update()` | `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Modify an existing resource without recreating it. | `op`, `keywords`, `countryCode`, `profileId`, +1 more |
| Delete Auto-Response Setting | `client.messagingProfiles.autorespConfigs.delete()` | `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Remove, detach, or clean up an existing resource. | `profileId`, `autorespCfgId` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
