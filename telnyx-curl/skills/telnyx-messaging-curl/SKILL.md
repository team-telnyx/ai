---
name: telnyx-messaging-curl
description: >-
  Send and receive SMS/MMS, handle opt-outs and delivery webhooks. Use for
  notifications, 2FA, or messaging apps.
metadata:
  internal: true
  author: telnyx
  product: messaging
  language: curl
  generated_by: telnyx-ext-skills-generator
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "to": "+13125550001",
      "from": "+18005550101",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages"
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

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

`POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `from` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "to": "+13125550001",
      "from": "+18005550101",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.text`
- `.data.sent_at`
- `.data.errors`

### Send an SMS with an alphanumeric sender ID

Common sender variant that requires different request shape.

`POST /messages/alphanumeric_sender_id`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | A valid alphanumeric sender ID on the user's account. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `text` | string | Yes | The message body. |
| `messaging_profile_id` | string (UUID) | Yes | The messaging profile ID to use. |
| `webhook_url` | string (URL) | No | Callback URL for delivery status updates. |
| `webhook_failover_url` | string (URL) | No | Failover callback URL for delivery status updates. |
| `use_profile_webhooks` | boolean | No | If true, use the messaging profile's webhook settings. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "from": "MyCompany",
  "to": "+13125550001",
  "text": "Hello from Telnyx!",
  "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/messages/alphanumeric_sender_id"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.text`
- `.data.sent_at`
- `.data.errors`

---

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```bash
# Telnyx signs webhooks with Ed25519 (asymmetric — NOT HMAC/Standard Webhooks).
# Headers sent with each webhook:
#   telnyx-signature-ed25519: base64-encoded Ed25519 signature
#   telnyx-timestamp: Unix timestamp (reject if >5 minutes old for replay protection)
#
# Get your public key from: Telnyx Portal > Account Settings > Keys & Credentials
# Use the Telnyx SDK in your language for verification (client.webhooks.unwrap).
# Your endpoint MUST return 2xx within 2 seconds or Telnyx will retry (up to 3 attempts).
# Configure a failover URL in Telnyx Portal for additional reliability.
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

`POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | array[object] | Yes | A list of destinations. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+18005550101",
      "to": [
          "+13125550001"
      ],
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/group_mms"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.type`
- `.data.direction`
- `.data.text`

### Send a long code message

Force a long-code sending path instead of the generic send endpoint.

`POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+18005550101",
      "to": "+13125550001",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/long_code"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.type`
- `.data.direction`
- `.data.text`

### Send a message using number pool

Let a messaging profile or number pool choose the sender for you.

`POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000",
      "to": "+13125550001",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/number_pool"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.type`
- `.data.direction`
- `.data.text`

### Send a short code message

Force a short-code sending path when the sender must be a short code.

`POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "12345",
      "to": "+13125550001",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/short_code"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.type`
- `.data.direction`
- `.data.text`

### Schedule a message

Queue a message for future delivery instead of sending immediately.

`POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "to": "+13125550001",
      "from": "+18005550101",
      "text": "Appointment reminder",
      "send_at": "2025-07-01T15:00:00Z"
  }' \
  "https://api.telnyx.com/v2/messages/schedule"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.type`
- `.data.direction`
- `.data.text`

### Send a WhatsApp message

Send WhatsApp traffic instead of SMS/MMS.

`POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number in +E.164 format associated with Whatsapp accou... |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `whatsapp_message` | object | Yes |  |
| `type` | enum (WHATSAPP) | No | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "from": "+13125551234",
  "to": "+13125551234",
  "whatsapp_message": {}
}' \
  "https://api.telnyx.com/v2/messages/whatsapp"
```

Primary response fields:
- `.data.id`
- `.data.to`
- `.data.from`
- `.data.type`
- `.data.direction`
- `.data.body`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Retrieve a message | HTTP only | `GET /messages/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Cancel a scheduled message | HTTP only | `DELETE /messages/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| List alphanumeric sender IDs | HTTP only | `GET /alphanumeric_sender_ids` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an alphanumeric sender ID | HTTP only | `POST /alphanumeric_sender_ids` | Create or provision an additional resource when the core tasks do not cover this flow. | `alphanumeric_sender_id`, `messaging_profile_id` |
| Retrieve an alphanumeric sender ID | HTTP only | `GET /alphanumeric_sender_ids/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Delete an alphanumeric sender ID | HTTP only | `DELETE /alphanumeric_sender_ids/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| Retrieve group MMS messages | HTTP only | `GET /messages/group/{message_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `message_id` |
| List messaging hosted numbers | HTTP only | `GET /messaging_hosted_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a messaging hosted number | HTTP only | `GET /messaging_hosted_numbers/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Update a messaging hosted number | HTTP only | `PATCH /messaging_hosted_numbers/{id}` | Modify an existing resource without recreating it. | `id` |
| List opt-outs | HTTP only | `GET /messaging_optouts` | Inspect available resources or choose an existing resource before mutating it. | None |
| List high-level messaging profile metrics | HTTP only | `GET /messaging_profile_metrics` | Inspect available resources or choose an existing resource before mutating it. | None |
| Regenerate messaging profile secret | HTTP only | `POST /messaging_profiles/{id}/actions/regenerate_secret` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `id` |
| List alphanumeric sender IDs for a messaging profile | HTTP only | `GET /messaging_profiles/{id}/alphanumeric_sender_ids` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Get detailed messaging profile metrics | HTTP only | `GET /messaging_profiles/{id}/metrics` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List Auto-Response Settings | HTTP only | `GET /messaging_profiles/{profile_id}/autoresp_configs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `profile_id` |
| Create auto-response setting | HTTP only | `POST /messaging_profiles/{profile_id}/autoresp_configs` | Create or provision an additional resource when the core tasks do not cover this flow. | `op`, `keywords`, `country_code`, `profile_id` |
| Get Auto-Response Setting | HTTP only | `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `profile_id`, `autoresp_cfg_id` |
| Update Auto-Response Setting | HTTP only | `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Modify an existing resource without recreating it. | `op`, `keywords`, `country_code`, `profile_id`, +1 more |
| Delete Auto-Response Setting | HTTP only | `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Remove, detach, or clean up an existing resource. | `profile_id`, `autoresp_cfg_id` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
