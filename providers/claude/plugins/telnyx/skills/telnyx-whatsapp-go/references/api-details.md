# WhatsApp Business API (Go) — API Details

## Optional Parameters

### Send WhatsApp Message (`POST /messages/whatsapp`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `messaging_profile_id` | string (UUID) | Messaging profile to use for this message |
| `webhook_url` | string (URL) | Override webhook URL for this message |
| `webhook_failover_url` | string (URL) | Failover webhook URL |
| `whatsapp_message.context.message_id` | string | Reply to a specific message by ID |
| `whatsapp_message.interactive` | object | Interactive message (buttons, lists) |
| `whatsapp_message.location` | object | Location message (latitude, longitude, name, address) |
| `whatsapp_message.contacts` | array | Contact card message |
| `whatsapp_message.reaction` | object | Reaction to a message (emoji + message_id) |

### Template Components

Templates support these component types:

| Component Type | Description |
|----------------|-------------|
| `HEADER` | Top section — can be text, image, video, or document |
| `BODY` | Main message content with `{{1}}`, `{{2}}` parameters |
| `FOOTER` | Bottom text (no parameters) |
| `BUTTONS` | Call-to-action or quick reply buttons |

#### Button Types

| Button Type | Description |
|-------------|-------------|
| `PHONE_NUMBER` | Opens phone dialer with pre-filled number |
| `URL` | Opens a URL (can include one `{{1}}` parameter for dynamic suffix) |
| `QUICK_REPLY` | Customer taps to send a predefined response |
| `COPY_CODE` | Copies a code to clipboard (used with AUTHENTICATION templates) |

### Template Categories

| Category | Use Case | Billing |
|----------|----------|---------|
| `AUTHENTICATION` | OTP codes, verification | `whatsapp_authentication` (domestic) or `whatsapp_authentication_international` (cross-border) |
| `UTILITY` | Order updates, shipping, account alerts | `whatsapp_utility` |
| `MARKETING` | Promotions, newsletters, offers | `whatsapp_marketing` |

### List Templates Filters (`GET /v2/whatsapp/message_templates`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter: `AUTHENTICATION`, `MARKETING`, `UTILITY` |
| `status` | string | Filter: `APPROVED`, `PENDING`, `REJECTED`, `DISABLED`, `PENDING_DELETION` |
| `search` | string | Search by template name |
| `page[number]` | integer | Page number (default: 1) |
| `page[size]` | integer | Results per page (default: 20, max: 250) |

## Response Schemas

### WhatsApp Message Response

```json
{
  "data": {
    "record_type": "message",
    "direction": "outbound",
    "id": "40319d48-d075-4490-b230-f981e27f14ec",
    "type": "WHATSAPP",
    "organization_id": "b4712e65-a29a-4ad6-ad24-a69c62f8cfcd",
    "messaging_profile_id": "400179a5-0f37-4ca4-b8db-b07e32d916f6",
    "from": {
      "phone_number": "+19452940762",
      "carrier": "Telnyx",
      "line_type": "Wireless"
    },
    "to": [{
      "phone_number": "+18005551234",
      "status": "queued",
      "carrier": "...",
      "line_type": "Wireless"
    }],
    "received_at": "2026-04-01T11:31:54.490+00:00",
    "sent_at": null,
    "completed_at": null,
    "valid_until": "2026-04-01T12:31:54.490+00:00"
  }
}
```

### Template Response

```json
{
  "data": {
    "id": "019cd44b-3a1c-781b-956e-bd33e9fd2ac6",
    "template_id": "1983190755928840",
    "waba_id": "1221529010180092",
    "name": "verify_login_code",
    "category": "AUTHENTICATION",
    "language": "en_US",
    "status": "APPROVED",
    "quality_rating": "GREEN",
    "components": [
      {
        "type": "BODY",
        "text": "Your verification code is {{1}}."
      },
      {
        "type": "BUTTONS",
        "buttons": [
          { "type": "URL", "text": "Copy Code", "url": "https://example.com/{{1}}" }
        ]
      }
    ],
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-01T12:00:00Z"
  }
}
```

### WABA Response

```json
{
  "data": {
    "id": "019c1ff0-5c30-7f36-8436-730b1d0b0e56",
    "waba_id": "1221529010180092",
    "name": "My Business",
    "status": "ACTIVE",
    "country": "US",
    "webhook_url": "https://example.com/webhook",
    "webhook_enabled": true,
    "webhook_events": ["message_template_status_update", "phone_number_quality_update"]
  }
}
```

## Webhook Payload Fields

### Message Delivery Webhook

```json
{
  "data": {
    "event_type": "message.finalized",
    "id": "event-uuid",
    "occurred_at": "2026-04-01T11:32:01.077+00:00",
    "payload": {
      "record_type": "message",
      "direction": "outbound",
      "id": "40319d48-d075-4490-b230-f981e27f14ec",
      "type": "WHATSAPP",
      "to": [{ "phone_number": "+18005551234", "status": "delivered" }],
      "template_id": "019cd44b-3a1c-781b-956e-bd33e9fd2ac6",
      "template_name": "verify_login_code",
      "cost": { "amount": "0.0500", "currency": "USD" }
    }
  },
  "meta": { "attempt": 1 }
}
```

### Template Status Webhook

```json
{
  "event_type": "whatsapp.template.approved",
  "payload": {
    "record_type": "whatsapp_template",
    "template_id": "019cd44b-3a1c-781b-956e-bd33e9fd2ac6",
    "template_name": "order_confirmation",
    "language": "en_US",
    "meta_template_id": "1977527823202710",
    "waba_id": "1221529010180092",
    "status": "APPROVED"
  }
}
```

### Phone Number Quality Webhook

```json
{
  "event_type": "whatsapp.phone_number.quality_changed",
  "payload": {
    "record_type": "whatsapp_phone_number",
    "phone_number": "+19452940762",
    "previous_quality_rating": "GREEN",
    "new_quality_rating": "YELLOW",
    "waba_id": "1221529010180092"
  }
}
```

### Account Event Webhook

```json
{
  "event_type": "whatsapp.account.restricted",
  "payload": {
    "record_type": "whatsapp_account",
    "waba_id": "1221529010180092",
    "ban_info": {
      "waba_ban_state": "SCHEDULE_FOR_DISABLE",
      "waba_ban_date": "2026-04-10"
    }
  }
}
```

## Common Workflows

### 1. Send an OTP via WhatsApp

1. List templates filtered by `category=AUTHENTICATION` to find your OTP template
2. Send the template message with the OTP code as a parameter
3. Listen for `message.finalized` webhook to confirm delivery

### 2. Monitor template approvals

1. Configure webhook events on your WABA: `PATCH /v2/whatsapp/business_accounts/{id}/settings`
2. Subscribe to `message_template_status_update`
3. Create a new template via `POST .../templates`
4. Wait for `whatsapp.template.approved` or `whatsapp.template.rejected` webhook

### 3. Handle quality rating degradation

1. Subscribe to `phone_number_quality_update` webhook events
2. When `whatsapp.phone_number.quality_changed` fires with `new_quality_rating: "YELLOW"`:
   - Review recent message patterns
   - Check template quality scores
   - Reduce sending volume if needed
3. `RED` rating leads to messaging restrictions — take immediate action
