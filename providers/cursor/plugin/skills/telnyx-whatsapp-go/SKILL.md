---
name: telnyx-whatsapp-go
description: >-
  Send WhatsApp messages, manage templates, WABAs, and phone numbers via the
  Telnyx WhatsApp Business API.
metadata:
  author: telnyx
  product: whatsapp
  language: go
---

# Telnyx WhatsApp Business API - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
	"context"
	"fmt"
	"os"

	"github.com/team-telnyx/telnyx-go"
	"github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(option.WithAPIKey(os.Getenv("TELNYX_API_KEY")))
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
ctx := context.TODO()

response, err := client.Messages.SendWhatsapp(ctx, telnyx.MessageSendWhatsappParams{
	From: telnyx.String("+19452940762"),
	To:   telnyx.String("+18005551234"),
	Type: telnyx.F(telnyx.MessageSendWhatsappParamsTypeWhatsapp),
	WhatsappMessage: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessage{
		Type: telnyx.F("text"),
		Text: telnyx.F(map[string]interface{}{
			"body": "Hello from Telnyx!",
		}),
	}),
})
if err != nil {
	var apiErr *telnyx.Error
	if errors.As(err, &apiErr) {
		fmt.Printf("API error: %d - %s\n", apiErr.StatusCode, apiErr.Message)
	}
	return err
}
fmt.Println(response.Data.ID)
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
- **Pagination:** List endpoints return paginated results. Use the auto-paging iterator: `iter.Next()` in a loop.

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

`client.Messages.SendWhatsapp()` — `POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes | WhatsApp-enabled phone number in +E.164 format |
| `To` | string (E.164) | Yes | Recipient phone number in +E.164 format |
| `Type` | string | No | Must be `WHATSAPP` |
| `WhatsappMessage` | object | Yes | WhatsApp message object |
| `MessagingProfileID` | string (UUID) | No | Messaging profile to use |
| `WebhookURL` | string (URL) | No | Callback URL for delivery status updates |

```go
// Send by template name + language
ctx := context.TODO()

response, err := client.Messages.SendWhatsapp(ctx, telnyx.MessageSendWhatsappParams{
	From: telnyx.String("+19452940762"),
	To:   telnyx.String("+18005551234"),
	Type: telnyx.F(telnyx.MessageSendWhatsappParamsTypeWhatsapp),
	WhatsappMessage: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessage{
		Type: telnyx.F("template"),
		Template: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessageTemplate{
			Name:     telnyx.String("order_confirmation"),
			Language: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessageTemplateLanguage{
				Code: telnyx.String("en_US"),
			}),
			Components: telnyx.F([]telnyx.MessageSendWhatsappParamsWhatsappMessageTemplateComponent{
				{
					Type: telnyx.F("body"),
					Parameters: telnyx.F([]telnyx.MessageSendWhatsappParamsWhatsappMessageTemplateComponentParameter{
						{Type: telnyx.F("text"), Text: telnyx.String("ORD-12345")},
						{Type: telnyx.F("text"), Text: telnyx.String("March 15, 2026")},
					}),
				},
			}),
		}),
	}),
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(response.Data.ID)
```

```go
// Send by Telnyx template_id (no name/language needed)
ctx := context.TODO()

response, err := client.Messages.SendWhatsapp(ctx, telnyx.MessageSendWhatsappParams{
	From: telnyx.String("+19452940762"),
	To:   telnyx.String("+18005551234"),
	Type: telnyx.F(telnyx.MessageSendWhatsappParamsTypeWhatsapp),
	WhatsappMessage: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessage{
		Type: telnyx.F("template"),
		Template: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessageTemplate{
			TemplateID: telnyx.String("019cd44b-3a1c-781b-956e-bd33e9fd2ac6"),
			Components: telnyx.F([]telnyx.MessageSendWhatsappParamsWhatsappMessageTemplateComponent{
				{
					Type: telnyx.F("body"),
					Parameters: telnyx.F([]telnyx.MessageSendWhatsappParamsWhatsappMessageTemplateComponentParameter{
						{Type: telnyx.F("text"), Text: telnyx.String("483291")},
					}),
				},
			}),
		}),
	}),
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(response.Data.ID)
```

Primary response fields:
- `response.Data.ID` — Message UUID
- `response.Data.To[0].Status` — `queued`, `sent`, `delivered`, `failed`
- `response.Data.From.PhoneNumber`
- `response.Data.Type` — `WHATSAPP`

### Send a free-form WhatsApp text message

Send a text message within the 24-hour customer service window.

`client.Messages.SendWhatsapp()` — `POST /messages/whatsapp`

```go
ctx := context.TODO()

response, err := client.Messages.SendWhatsapp(ctx, telnyx.MessageSendWhatsappParams{
	From: telnyx.String("+19452940762"),
	To:   telnyx.String("+18005551234"),
	Type: telnyx.F(telnyx.MessageSendWhatsappParamsTypeWhatsapp),
	WhatsappMessage: telnyx.F(telnyx.MessageSendWhatsappParamsWhatsappMessage{
		Type: telnyx.F("text"),
		Text: telnyx.F(map[string]interface{}{
			"body": "Your order has shipped!",
		}),
	}),
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(response.Data.ID)
```

### List WhatsApp Business Accounts

`client.Whatsapp.BusinessAccounts.List()` — `GET /v2/whatsapp/business_accounts`

```go
ctx := context.TODO()

response, err := client.Whatsapp.BusinessAccounts.List(ctx, telnyx.WhatsappBusinessAccountListParams{})
if err != nil {
	log.Fatal(err)
}
for _, waba := range response.Data {
	fmt.Printf("%s: %s (%s)\n", waba.ID, waba.Name, waba.Status)
}
```

Primary response fields:
- `waba.ID` — Telnyx WABA UUID
- `waba.WabaID` — Meta WABA ID
- `waba.Name` — Business name
- `waba.Status` — Account status
- `waba.Country` — WABA country

### List templates for a WABA

`client.Whatsapp.Templates.List()` — `GET /v2/whatsapp/message_templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `WabaID` | string (UUID) | Yes | Telnyx WABA UUID |
| `Category` | string | No | Filter: `AUTHENTICATION`, `MARKETING`, `UTILITY` |
| `Status` | string | No | Filter: `APPROVED`, `PENDING`, `REJECTED`, `DISABLED` |

```go
ctx := context.TODO()

response, err := client.Whatsapp.Templates.List(ctx,
	telnyx.WhatsappTemplateListParams{
		WabaID: telnyx.String("019c1ff0-5c30-7f36-8436-730b1d0b0e56"),
		Status: telnyx.String("APPROVED"),
	},
)
if err != nil {
	log.Fatal(err)
}
for _, tmpl := range response.Data {
	fmt.Printf("%s: %s (%s) - %s\n", tmpl.ID, tmpl.Name, tmpl.Category, tmpl.Status)
}
```

Primary response fields:
- `tmpl.ID` — Telnyx template UUID (use as `template_id` when sending)
- `tmpl.Name` — Template name
- `tmpl.Category` — `AUTHENTICATION`, `MARKETING`, or `UTILITY`
- `tmpl.Language` — Language code
- `tmpl.Status` — `APPROVED`, `PENDING`, `REJECTED`, `DISABLED`
- `tmpl.Components` — Template components

### Create a message template

`client.Whatsapp.Templates.Create()` — `POST /v2/whatsapp/message_templates`

```go
ctx := context.TODO()

response, err := client.Whatsapp.Templates.Create(ctx,
	telnyx.WhatsappTemplateCreateParams{
		WabaID:   telnyx.String("019c1ff0-5c30-7f36-8436-730b1d0b0e56"),
		Name:     telnyx.String("order_shipped"),
		Category: telnyx.String("UTILITY"),
		Language: telnyx.String("en_US"),
		Components: telnyx.F([]telnyx.WhatsappTemplateCreateParamsComponent{
			{
				Type: telnyx.F("BODY"),
				Text: telnyx.String("Your order {{1}} has been shipped and will arrive by {{2}}."),
				Example: telnyx.F(telnyx.WhatsappTemplateCreateParamsComponentExample{
					BodyText: telnyx.F([][]string{{"ORD-12345", "March 20, 2026"}}),
				}),
			},
		}),
	},
)
if err != nil {
	log.Fatal(err)
}
fmt.Printf("Template created: %s (status: %s)\n", response.Data.ID, response.Data.Status)
```

### List phone numbers for a WABA

`client.Whatsapp.PhoneNumbers.List()` — `GET /v2/whatsapp/phone_numbers`

```go
ctx := context.TODO()

response, err := client.Whatsapp.PhoneNumbers.List(ctx,
	telnyx.WhatsappPhoneNumberListParams{
		WabaID: telnyx.String("019c1ff0-5c30-7f36-8436-730b1d0b0e56"),
	},
)
if err != nil {
	log.Fatal(err)
}
for _, pn := range response.Data {
	fmt.Printf("%s - quality: %s\n", pn.PhoneNumber, pn.QualityRating)
}
```

---

### Webhook Verification

Telnyx signs webhooks with Ed25519. Always verify signatures in production:

```go
import "github.com/team-telnyx/telnyx-go/webhook"

event, err := webhook.ConstructEvent(
	payload,                                 // []byte — raw request body
	request.Header.Get("telnyx-signature-ed25519"),
	request.Header.Get("telnyx-timestamp"),
	telnyxPublicKey,
)
if err != nil {
	log.Printf("Webhook verification failed: %v", err)
	http.Error(w, "Invalid signature", http.StatusForbidden)
	return
}
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
| Get template details | `client.WhatsappMessageTemplates.Retrieve()` | Check template status |
| Get business profile | `client.Whatsapp.PhoneNumbers.Profile.Retrieve()` | View business profile |
| Configure webhooks | `client.Whatsapp.BusinessAccounts.Settings.Update()` | Subscribe to events |

## Additional Operations

| Operation | SDK Method | Endpoint | Required Params |
|-----------|-----------|----------|-----------------|
| Send WhatsApp message | `client.Messages.SendWhatsapp()` | `POST /messages/whatsapp` | `From`, `To`, `WhatsappMessage` |
| List WABAs | `client.Whatsapp.BusinessAccounts.List()` | `GET /v2/whatsapp/business_accounts` | — |
| Get WABA | `client.Whatsapp.BusinessAccounts.Retrieve()` | `GET /v2/whatsapp/business_accounts/:id` | `WabaID` |
| List templates | `client.Whatsapp.Templates.List()` | `GET /v2/whatsapp/message_templates` | `WabaID` |
| Get template | `client.WhatsappMessageTemplates.Retrieve()` | `GET /v2/whatsapp_message_templates/:id` | `TemplateID` |
| Create template | `client.Whatsapp.Templates.Create()` | `POST /v2/whatsapp/message_templates` | `WabaID`, `Name`, `Category`, `Language`, `Components` |
| List phone numbers | `client.Whatsapp.PhoneNumbers.List()` | `GET /v2/whatsapp/phone_numbers` | `WabaID` |
| Configure webhooks | `client.Whatsapp.BusinessAccounts.Settings.Update()` | `PATCH /v2/whatsapp/business_accounts/:id/settings` | `WabaID` |
