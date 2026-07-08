---
name: telnyx-whatsapp-curl
description: >-
  Send WhatsApp messages, manage templates, WABAs, and phone numbers via the
  Telnyx WhatsApp Business API.
metadata:
  author: telnyx
  product: whatsapp
  language: curl
---

# Telnyx WhatsApp Business API - curl

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
      "from": "+19452940762",
      "to": "+18005551234",
      "type": "WHATSAPP",
      "whatsapp_message": {
        "type": "text",
        "text": { "body": "Hello from Telnyx!" }
      }
  }' \
  "https://api.telnyx.com/v2/messages/whatsapp"
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

### WhatsApp-Specific Errors

- **40008** — Meta catch-all error. Check template parameters, phone number formatting, and 24-hour window rules.
- **131047** — Message failed to send during the 24-hour window. The customer hasn't messaged you first (for non-template messages).
- **131026** — Recipient phone number is not a WhatsApp user.
- **132000** — Template parameter count mismatch. Ensure the number of parameters matches the template definition.
- **132015** — Template paused or disabled by Meta due to quality issues.

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code.
- **Template messages** can be sent anytime. Free-form (session) messages can only be sent within a 24-hour window after the customer last messaged you.
- **Template IDs**: You can reference templates by Telnyx UUID (`template_id`) instead of `name` + `language`. When `template_id` is provided, name and language are resolved automatically.
- **Billing types**: Template messages are billed as `whatsapp_marketing`, `whatsapp_utility`, `whatsapp_authentication`, or `whatsapp_authentication_international` based on category and destination.

## Operational Caveats

- The sending phone number must be registered with a WhatsApp Business Account (WABA) and associated with a messaging profile.
- Templates must be in `APPROVED` status before they can be used for sending.
- Template names must be lowercase with underscores only (e.g., `order_confirmation`). No spaces, hyphens, or uppercase.
- When creating templates, provide realistic sample values for body parameters — Meta reviewers check these during approval.
- Category selection matters for billing: `AUTHENTICATION` templates get special pricing but must contain an OTP. `UTILITY` is for transactional messages. `MARKETING` for promotional content.
- Meta may reclassify your template category (e.g., UTILITY to MARKETING) which affects billing.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Send a WhatsApp template message

Send a pre-approved template message. Templates can be sent anytime — no 24-hour window restriction.

`POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | WhatsApp-enabled phone number in +E.164 format |
| `to` | string (E.164) | Yes | Recipient phone number in +E.164 format |
| `type` | string | No | Must be `WHATSAPP` |
| `whatsapp_message.type` | string | Yes | Must be `template` |
| `whatsapp_message.template.name` | string | Yes* | Template name (e.g., `order_confirmation`) |
| `whatsapp_message.template.language.code` | string | Yes* | Language code (e.g., `en_US`) |
| `whatsapp_message.template.template_id` | string (UUID) | No | Telnyx template UUID. If provided, `name` and `language` are resolved from DB |
| `whatsapp_message.template.components` | array | No | Template parameter values |
| `messaging_profile_id` | string (UUID) | No | Messaging profile to use |
| `webhook_url` | string (URL) | No | Callback URL for delivery status updates |

*Required unless `template_id` is provided.

```bash
# Send by template name + language
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+19452940762",
      "to": "+18005551234",
      "type": "WHATSAPP",
      "whatsapp_message": {
        "type": "template",
        "template": {
          "name": "order_confirmation",
          "language": { "code": "en_US" },
          "components": [
            {
              "type": "body",
              "parameters": [
                { "type": "text", "text": "ORD-12345" },
                { "type": "text", "text": "March 15, 2026" }
              ]
            }
          ]
        }
      }
  }' \
  "https://api.telnyx.com/v2/messages/whatsapp"
```

```bash
# Send by Telnyx template_id (no name/language needed)
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+19452940762",
      "to": "+18005551234",
      "type": "WHATSAPP",
      "whatsapp_message": {
        "type": "template",
        "template": {
          "template_id": "019cd44b-3a1c-781b-956e-bd33e9fd2ac6",
          "components": [
            {
              "type": "body",
              "parameters": [
                { "type": "text", "text": "483291" }
              ]
            }
          ]
        }
      }
  }' \
  "https://api.telnyx.com/v2/messages/whatsapp"
```

Primary response fields:
- `.data.id` — Message UUID
- `.data.to[0].status` — `queued`, `sent`, `delivered`, `failed`
- `.data.from.phone_number`
- `.data.type` — `WHATSAPP`

### Send a free-form WhatsApp text message

Send a text message within the 24-hour customer service window (customer must have messaged you first).

`POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | WhatsApp-enabled phone number |
| `to` | string (E.164) | Yes | Recipient phone number |
| `whatsapp_message.type` | string | Yes | `text` |
| `whatsapp_message.text.body` | string | Yes | Message content |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+19452940762",
      "to": "+18005551234",
      "type": "WHATSAPP",
      "whatsapp_message": {
        "type": "text",
        "text": { "body": "Your order has shipped!" }
      }
  }' \
  "https://api.telnyx.com/v2/messages/whatsapp"
```

### List WhatsApp Business Accounts

Retrieve all WABAs associated with your Telnyx account.

`GET /v2/whatsapp/business_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | Page number (default: 1) |
| `page[size]` | integer | No | Page size (default: 20) |

```bash
curl \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/whatsapp/business_accounts"
```

Primary response fields:
- `.data[].id` — Telnyx WABA UUID
- `.data[].waba_id` — Meta WABA ID
- `.data[].name` — Business name
- `.data[].status` — Account status
- `.data[].country` — WABA country

### List templates

Retrieve message templates, optionally filtered by WABA.

`GET /v2/whatsapp/message_templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `waba_id` | string (UUID) | No | Filter by Telnyx WABA UUID (query parameter) |
| `category` | string | No | Filter by category: `AUTHENTICATION`, `MARKETING`, `UTILITY` |
| `status` | string | No | Filter by status: `APPROVED`, `PENDING`, `REJECTED`, `DISABLED` |
| `page[number]` | integer | No | Page number |
| `page[size]` | integer | No | Page size |

```bash
curl \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/whatsapp/message_templates?waba_id=019c1ff0-5c30-7f36-8436-730b1d0b0e56&status=APPROVED"
```

Primary response fields:
- `.data[].id` — Telnyx template UUID (use this as `template_id` when sending)
- `.data[].name` — Template name
- `.data[].category` — `AUTHENTICATION`, `MARKETING`, or `UTILITY`
- `.data[].language` — Language code (e.g., `en_US`)
- `.data[].status` — `APPROVED`, `PENDING`, `REJECTED`, `DISABLED`
- `.data[].components` — Template components (header, body, footer, buttons)

### Create a message template

Submit a new template for Meta review. Templates typically take minutes to hours for approval.

`POST /v2/whatsapp/message_templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `waba_id` | string (UUID) | Yes | Telnyx WABA UUID (body parameter) |
| `name` | string | Yes | Lowercase with underscores only (e.g., `order_update`) |
| `category` | string | Yes | `AUTHENTICATION`, `MARKETING`, or `UTILITY` |
| `language` | string | Yes | Language code (e.g., `en_US`) |
| `components` | array | Yes | Template components |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "waba_id": "019c1ff0-5c30-7f36-8436-730b1d0b0e56",
      "name": "order_shipped",
      "category": "UTILITY",
      "language": "en_US",
      "components": [
        {
          "type": "BODY",
          "text": "Your order {{1}} has been shipped and will arrive by {{2}}.",
          "example": {
            "body_text": [["ORD-12345", "March 20, 2026"]]
          }
        }
      ]
  }' \
  "https://api.telnyx.com/v2/whatsapp/message_templates"
```

Primary response fields:
- `.data.id` — Telnyx template UUID
- `.data.name` — Template name
- `.data.status` — Initially `PENDING` until Meta approves

### List phone numbers

`GET /v2/whatsapp/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `waba_id` | string (UUID) | No | Filter by Telnyx WABA UUID (query parameter) |

```bash
curl \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/whatsapp/phone_numbers?waba_id=019c1ff0-5c30-7f36-8436-730b1d0b0e56"
```

Primary response fields:
- `.data[].phone_number` — Phone number in E.164 format
- `.data[].number_id` — Meta phone number ID
- `.data[].quality_rating` — `GREEN`, `YELLOW`, or `RED`
- `.data[].messaging_limit_tier` — Current messaging tier

---

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production.

## Webhooks

These webhook payload fields are inline because they are part of the primary integration path.

### Message Delivery Update

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.sent, message.finalized | Delivery status event |
| `data.payload.id` | uuid | Message ID |
| `data.payload.to[0].status` | string | `queued`, `sent`, `delivered`, `read`, `failed` |
| `data.payload.template_id` | string | Telnyx template UUID (if template message) |
| `data.payload.template_name` | string | Template name (if template message) |
| `data.payload.cost` | object | Cost information |
| `data.payload.errors` | array | Error details if failed |

### Template Status Change

Configure webhook events on your WABA to receive template lifecycle notifications.

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | string | `whatsapp.template.approved`, `whatsapp.template.rejected`, `whatsapp.template.disabled` |
| `payload.template_id` | string | Telnyx template UUID |
| `payload.template_name` | string | Template name |
| `payload.status` | string | New template status |
| `payload.reason` | string | Rejection/disable reason (if applicable) |
| `payload.waba_id` | string | WABA ID |

### Phone Number Quality Change

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | string | `whatsapp.phone_number.quality_changed` |
| `payload.phone_number` | string | Phone number in E.164 format |
| `payload.previous_quality_rating` | string | Previous rating (GREEN, YELLOW, RED) |
| `payload.new_quality_rating` | string | New rating |

## Template Best Practices

- **Naming**: Use lowercase with underscores. Be descriptive (e.g., `appointment_reminder`, not `msg1`).
- **Sample values**: Provide realistic examples in the `example` field — Meta reviewers check these.
- **Category selection**:
  - `AUTHENTICATION` — OTP/verification codes only. Gets special pricing.
  - `UTILITY` — Transactional (order updates, shipping, account alerts).
  - `MARKETING` — Promotional content, offers, newsletters.
- **Keep it concise**: Meta prefers shorter templates. Avoid unnecessary formatting.
- **Avoid prohibited content**: No misleading claims, prohibited products, or URL shorteners in template body.
- **Parameters**: Use `{{1}}`, `{{2}}`, etc. for variable content. Always provide the correct number of parameters when sending.

## Important Supporting Operations

| Operation | Endpoint | Use Case |
|-----------|----------|----------|
| Get template details | `GET /v2/whatsapp_message_templates/{id}` | Check template status, view components |
| Get business profile | `GET /v2/whatsapp/phone_numbers/{phone_number}/profile` | View business display name, photo, description |
| Configure WABA settings | `PATCH /v2/whatsapp/business_accounts/{id}/settings` | Subscribe to template/account events |

## Additional Operations

| Operation | Method | Endpoint | Use Case | Required Params |
|-----------|--------|----------|----------|-----------------|
| Send WhatsApp message | POST | `/messages/whatsapp` | Send template or free-form message | `from`, `to`, `whatsapp_message` |
| List WABAs | GET | `/v2/whatsapp/business_accounts` | List all business accounts | — |
| Get WABA | GET | `/v2/whatsapp/business_accounts/{id}` | Get WABA details | `id` |
| List templates | GET | `/v2/whatsapp/message_templates` | List templates with filtering | — |
| Get template | GET | `/v2/whatsapp_message_templates/{id}` | Get template details | `id` |
| Create template | POST | `/v2/whatsapp/message_templates` | Create new template | `waba_id`, `name`, `category`, `language`, `components` |
| List phone numbers | GET | `/v2/whatsapp/phone_numbers` | List WABA phone numbers | — |
| Get business profile | GET | `/v2/whatsapp/phone_numbers/{phone_number}/profile` | View profile info | `phone_number` |
| Update business profile | PATCH | `/v2/whatsapp/phone_numbers/{phone_number}/profile` | Update profile info | `phone_number` |
| Get WABA settings | GET | `/v2/whatsapp/business_accounts/{id}/settings` | View WABA settings/webhook config | `id` |
| Update WABA settings | PATCH | `/v2/whatsapp/business_accounts/{id}/settings` | Set webhook URL and events | `id` |
