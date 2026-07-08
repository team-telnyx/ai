---
name: telnyx-whatsapp-java
description: >-
  Send WhatsApp messages, manage templates, WABAs, and phone numbers via the
  Telnyx WhatsApp Business API.
metadata:
  author: telnyx
  product: whatsapp
  language: java
---

# Telnyx WhatsApp Business API - Java

## Installation

**Maven:**

```xml
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.36.0</version>
</dependency>
```

**Gradle:**

```groovy
implementation("com.telnyx.sdk:telnyx:6.36.0")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.TelnyxException;

try {
    var response = client.messages().sendWhatsapp()
        .from("+19452940762")
        .to("+18005551234")
        .type("WHATSAPP")
        .whatsappMessage(Map.of(
            "type", "text",
            "text", Map.of("body", "Hello from Telnyx!")
        ))
        .execute();
} catch (TelnyxException e) {
    System.out.println("API error: " + e.statusCode() + " - " + e.getMessage());
}
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
- **Pagination:** List endpoints return paginated results. Use the auto-pager pattern: `for (var item : response.autoPager()) { }`.

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

`client.messages().sendWhatsapp()` — `POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | WhatsApp-enabled phone number in +E.164 format |
| `to` | string (E.164) | Yes | Recipient phone number in +E.164 format |
| `type` | string | No | Must be `WHATSAPP` |
| `whatsappMessage` | object | Yes | WhatsApp message object |
| `messagingProfileId` | string (UUID) | No | Messaging profile to use |
| `webhookUrl` | string (URL) | No | Callback URL for delivery status updates |

```java
// Send by template name + language
var response = client.messages().sendWhatsapp()
    .from("+19452940762")
    .to("+18005551234")
    .type("WHATSAPP")
    .whatsappMessage(Map.of(
        "type", "template",
        "template", Map.of(
            "name", "order_confirmation",
            "language", Map.of("code", "en_US"),
            "components", List.of(
                Map.of(
                    "type", "body",
                    "parameters", List.of(
                        Map.of("type", "text", "text", "ORD-12345"),
                        Map.of("type", "text", "text", "March 15, 2026")
                    )
                )
            )
        )
    ))
    .execute();
System.out.println(response.data().id());
```

```java
// Send by Telnyx template_id (no name/language needed)
var response = client.messages().sendWhatsapp()
    .from("+19452940762")
    .to("+18005551234")
    .type("WHATSAPP")
    .whatsappMessage(Map.of(
        "type", "template",
        "template", Map.of(
            "template_id", "019cd44b-3a1c-781b-956e-bd33e9fd2ac6",
            "components", List.of(
                Map.of(
                    "type", "body",
                    "parameters", List.of(
                        Map.of("type", "text", "text", "483291")
                    )
                )
            )
        )
    ))
    .execute();
```

Primary response fields:
- `response.data().id()` — Message UUID
- `response.data().to().get(0).status()` — `queued`, `sent`, `delivered`, `failed`
- `response.data().from().phoneNumber()`
- `response.data().type()` — `WHATSAPP`

### Send a free-form WhatsApp text message

Send a text message within the 24-hour customer service window.

`client.messages().sendWhatsapp()` — `POST /messages/whatsapp`

```java
var response = client.messages().sendWhatsapp()
    .from("+19452940762")
    .to("+18005551234")
    .type("WHATSAPP")
    .whatsappMessage(Map.of(
        "type", "text",
        "text", Map.of("body", "Your order has shipped!")
    ))
    .execute();
```

### List WhatsApp Business Accounts

`client.whatsapp().businessAccounts().list()` — `GET /v2/whatsapp/business_accounts`

```java
var response = client.whatsapp().businessAccounts().list().execute();
for (var waba : response.data()) {
    System.out.println(waba.id() + ": " + waba.name() + " (" + waba.status() + ")");
}
```

Primary response fields:
- `waba.id()` — Telnyx WABA UUID
- `waba.wabaId()` — Meta WABA ID
- `waba.name()` — Business name
- `waba.status()` — Account status
- `waba.country()` — WABA country

### List templates for a WABA

`client.whatsapp().templates().list()` — `GET /v2/whatsapp/message_templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wabaId` | string (UUID) | Yes | Telnyx WABA UUID |
| `category` | string | No | Filter: `AUTHENTICATION`, `MARKETING`, `UTILITY` |
| `status` | string | No | Filter: `APPROVED`, `PENDING`, `REJECTED`, `DISABLED` |

```java
var response = client.whatsapp().templates().list()
    .wabaId("019c1ff0-5c30-7f36-8436-730b1d0b0e56")
    .status("APPROVED")
    .execute();
for (var tmpl : response.data()) {
    System.out.println(tmpl.id() + ": " + tmpl.name() + " (" + tmpl.category() + ") - " + tmpl.status());
}
```

Primary response fields:
- `tmpl.id()` — Telnyx template UUID (use as `template_id` when sending)
- `tmpl.name()` — Template name
- `tmpl.category()` — `AUTHENTICATION`, `MARKETING`, or `UTILITY`
- `tmpl.language()` — Language code
- `tmpl.status()` — `APPROVED`, `PENDING`, `REJECTED`, `DISABLED`
- `tmpl.components()` — Template components

### Create a message template

`client.whatsapp().templates().create()` — `POST /v2/whatsapp/message_templates`

```java
var response = client.whatsapp().templates().create()
    .wabaId("019c1ff0-5c30-7f36-8436-730b1d0b0e56")
    .name("order_shipped")
    .category("UTILITY")
    .language("en_US")
    .components(List.of(
        Map.of(
            "type", "BODY",
            "text", "Your order {{1}} has been shipped and will arrive by {{2}}.",
            "example", Map.of(
                "body_text", List.of(List.of("ORD-12345", "March 20, 2026"))
            )
        )
    ))
    .execute();
System.out.println("Template created: " + response.data().id() + " (status: " + response.data().status() + ")");
```

### List phone numbers for a WABA

`client.whatsapp().phoneNumbers().list()` — `GET /v2/whatsapp/phone_numbers`

```java
var response = client.whatsapp().phoneNumbers().list()
    .wabaId("019c1ff0-5c30-7f36-8436-730b1d0b0e56")
    .execute();
for (var pn : response.data()) {
    System.out.println(pn.phoneNumber() + " - quality: " + pn.qualityRating());
}
```

---

### Webhook Verification

Telnyx signs webhooks with Ed25519. Always verify signatures in production:

```java
import com.telnyx.sdk.webhooks.Webhook;

var event = Webhook.constructEvent(
    requestBody,
    request.getHeader("telnyx-signature-ed25519"),
    request.getHeader("telnyx-timestamp"),
    TELNYX_PUBLIC_KEY
);
```

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

### Template Status Change

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | string | `whatsapp.template.approved`, `whatsapp.template.rejected`, `whatsapp.template.disabled` |
| `payload.template_id` | string | Telnyx template UUID |
| `payload.template_name` | string | Template name |
| `payload.status` | string | New template status |
| `payload.reason` | string | Rejection/disable reason |

## Template Best Practices

- **Naming**: Use lowercase with underscores. Be descriptive (e.g., `appointment_reminder`, not `msg1`).
- **Sample values**: Provide realistic examples in the `example` field — Meta reviewers check these.
- **Category selection**:
  - `AUTHENTICATION` — OTP/verification codes only. Gets special pricing.
  - `UTILITY` — Transactional (order updates, shipping, account alerts).
  - `MARKETING` — Promotional content, offers, newsletters.
- **Keep it concise**: Meta prefers shorter templates. Avoid unnecessary formatting.
- **Parameters**: Use `{{1}}`, `{{2}}`, etc. for variable content. Always provide the correct number of parameters when sending.

## Important Supporting Operations

| Operation | SDK Method | Use Case |
|-----------|-----------|----------|
| Get template details | `client.whatsappMessageTemplates().retrieve()` | Check template status |
| Get business profile | `client.whatsapp().phoneNumbers().profile().retrieve()` | View business profile |
| Configure webhooks | `client.whatsapp().businessAccounts().settings().update()` | Subscribe to events |

## Additional Operations

| Operation | SDK Method | Endpoint | Required Params |
|-----------|-----------|----------|-----------------|
| Send WhatsApp message | `client.messages().sendWhatsapp()` | `POST /messages/whatsapp` | `from`, `to`, `whatsappMessage` |
| List WABAs | `client.whatsapp().businessAccounts().list()` | `GET /v2/whatsapp/business_accounts` | — |
| Get WABA | `client.whatsapp().businessAccounts().retrieve()` | `GET /v2/whatsapp/business_accounts/:id` | `wabaId` |
| List templates | `client.whatsapp().templates().list()` | `GET /v2/whatsapp/message_templates` | `wabaId` |
| Get template | `client.whatsappMessageTemplates().retrieve()` | `GET /v2/whatsapp_message_templates/:id` | `templateId` |
| Create template | `client.whatsapp().templates().create()` | `POST /v2/whatsapp/message_templates` | `wabaId`, `name`, `category`, `language`, `components` |
| List phone numbers | `client.whatsapp().phoneNumbers().list()` | `GET /v2/whatsapp/phone_numbers` | `wabaId` |
| Configure webhooks | `client.whatsapp().businessAccounts().settings().update()` | `PATCH /v2/whatsapp/business_accounts/:id/settings` | `wabaId` |
