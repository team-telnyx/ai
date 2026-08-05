---
name: telnyx-email-curl
description: >-
  Send transactional email, batch sends, scheduled delivery, templates, email
  validation, and track delivery events. Use for notifications, alerts, and
  automated email workflows.
metadata:
  author: telnyx
  product: email
  language: curl
---

# Telnyx Email - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
# jq is required for examples that capture IDs from responses:
#   macOS: brew install jq
#   Debian/Ubuntu: sudo apt-get install jq
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors
(400 or 422), or authentication errors (401). Preserve the response body so the
Telnyx error code and detail remain available:

```bash
curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"email": "sender@example.com", "name": "Example"},
    "to": ["recipient@example.net"],
    "subject": "Hello from Telnyx",
    "text_body": "Your notification is ready."
  }' \
  "https://api.telnyx.com/v2/email_messages"
```

Common errors: `401` invalid credentials, `403` sender-domain eligibility or
verification failure, `404` resource not found, `413` body larger than
8,000,000 bytes, and `422` semantic validation or template-rendering failure.
A `429` is not necessarily a transient throughput limit: it can indicate a
reputation suspension or a daily policy limit. Inspect `.errors[0].code` and
`.errors[0].detail` before deciding whether to retry. See the full taxonomy in
[references/api-details.md](references/api-details.md#error-code-taxonomy).

## Important Notes

- **Base URL:** All paths in this skill are relative to `https://api.telnyx.com/v2`.
- **Sender domain:** The domain in `from.email` must be authorized and ready for sending. A successful create response means accepted, queued, scheduled, or sandbox-created—not delivered.
- **Address input:** `from`, `reply_to`, and each `to`/`cc`/`bcc` item accept either a string address or `{ "email": "...", "name": "..." }`. Recipients must be unique across `to`, `cc`, and `bcc` after case-insensitive normalization.
- **Body or template:** `subject` is required unless `template_id` is supplied. With `template_id`, do not also send `subject`, `html_body`, or `text_body`; pass Liquid values in `template_variables`.
- **Pagination:** Core Email endpoints use `page_size` (default 25, maximum 100) and the opaque `page_cursor` returned in `.meta.page_cursor`. Do not translate these names to `page[size]` or `page[cursor]`.
- **Message listing:** `GET /email_messages` currently implements cursor pagination only; no message filters are exposed. Event and recipient list endpoints have their own filters.

## Operational Caveats

- **Scheduling is fail-open:** `scheduled_at` is the preferred field. If it is invalid or in the past, the API silently sends immediately. Validate the timestamp before sending and confirm the response status is `scheduled` when future delivery is required. The legacy `send_at` alias remains accepted; if both are present, `scheduled_at` wins.
- **Batch status:** `POST /email_messages/batch` always returns `207 Multi-Status`, including when every item succeeds. It does not return 202.
- **Batch limit:** A batch contains 1–50 messages. Split larger jobs and give each request its own idempotency key.
- **Idempotency is endpoint-specific:** `Idempotency-Key` is supported only on `POST /email_messages`, `POST /email_messages/batch`, `POST /email_templates`, `POST /email_validations`, and `POST /email_validations/batch`. Do not send it universally.
- **Sandbox behavior:** `sandbox_mode: true` skips Kafka/MTA delivery, but still persists the message, emits a sandbox event, and creates a non-billable Email Detail Record (EDR). Batch-level `sandbox_mode` overrides every per-message value.
- **429 requires classification:** It can mean reputation suspension or a daily policy limit. Read the error code/detail; do not blindly back off and retry an account-policy failure.
- **Attachments are in-band JSON:** Put attachment content in the request as a Base64 string. `disposition: "inline"` plus `content_id` supports CID references. The whole request body is limited to 8,000,000 bytes (approximately 8 MB), including Base64 overhead.
- **Tags are not labels:** Outbound `tags` are immutable billing/reporting attribution propagated to EDRs and Mission Control. Mailbox `labels` are mutable workflow state and are a different concept.
- **Threading is single-send only:** `in_reply_to_message_id`, `reply_to_all`, and `forward_of_message_id` are accepted by single send but not by batch send. `in_reply_to_message_id` and `forward_of_message_id` are mutually exclusive.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If a parameter, enum, or response field is not shown inline, read [references/api-details.md](references/api-details.md) before writing the request or handler.
- Before using an operation in `## Additional Operations`, read [the parameter reference](references/api-details.md#operation-parameters) and [the response schemas](references/api-details.md#response-schemas).
- Before matching webhook fields or event names, read [the webhook payload reference](references/api-details.md#webhook-payload-fields). Pollable and subscribable event enums are intentionally different.
- Treat the two delete-message routes marked **not yet available** as unreachable even though they appear in the OpenAPI contract.

## Core Tasks

### Send an email

Primary outbound transactional-email flow.

`POST /v2/email_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string or email-address object | Yes | Sender address; object form supports `email` and optional `name`. |
| `to` | array[string or email-address object] | Yes | At least one recipient. Must be unique across all recipient lists. |
| `from_name` | string | No | Display name for string `from`; overrides `from.name`. |
| `cc` | array[string or object] | No | Carbon-copy recipients. |
| `bcc` | array[string or object] | No | Blind-copy recipients. |
| `reply_to` | string or object | No | Reply-to address; an object name is ignored when stored. |
| `subject` | string | Conditional | Required without `template_id`. Do not use with a template. |
| `html_body` | string | No | HTML body. Returned only by the message detail endpoint. |
| `text_body` | string | No | Plain-text body. Returned only by the message detail endpoint. |
| `headers` | object[string,string] | No | Custom headers; write-only. |
| `attachments` | array[attachment] | No | Embedded Base64 attachment objects. |
| `tags` | array[string] | No | Immutable EDR/reporting attribution; not returned by the API. |
| `group_id` | UUID or null | No | Unsubscribe group for suppression checks. |
| `ignore_suppression` | boolean | No | Default false; requires `email:override` scope and cannot override hard-bounce, complaint, or invalid-address suppressions. |
| `metadata` | object | No | Custom write-only metadata. |
| `tracking_settings` | object | No | `open_tracking` and/or `click_tracking`; omitted values inherit domain settings. |
| `template_id` | UUID | No | Liquid template ID. Makes `subject`/body fields mutually exclusive. |
| `template_variables` | object | No | Liquid values; defaults to `{}`. |
| `scheduled_at` | date-time or null | No | Preferred future send time; invalid/past values send immediately. |
| `send_at` | date-time | No | Deprecated alias for `scheduled_at`. |
| `inline_css` | boolean | No | Inline CSS before sending; default false. |
| `sandbox_mode` | boolean | No | Persist and emit sandbox records without MTA delivery; default false. |
| `in_reply_to_message_id` | UUID or null | No | Parent Telnyx message; adds RFC 5322 threading headers. |
| `reply_to_all` | boolean or null | No | Reply-all intent; meaningful only with `in_reply_to_message_id`. |
| `forward_of_message_id` | UUID or null | No | Forward provenance; mutually exclusive with `in_reply_to_message_id`. |
| `Idempotency-Key` | header string | No | 1–255 letters, digits, `_`, or `-`; reuse only for the identical retry. |

```bash
curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 8e03978e-40d5-43e8-bc93-6894a57f9326" \
  -d '{
    "from": {"email": "orders@example.com", "name": "Example Orders"},
    "to": [{"email": "customer@example.net", "name": "Customer"}],
    "subject": "Order received",
    "html_body": "<p>Thanks for your order.</p>",
    "text_body": "Thanks for your order.",
    "tags": ["order-confirmation"],
    "tracking_settings": {"open_tracking": true, "click_tracking": true}
  }' \
  "https://api.telnyx.com/v2/email_messages"
```

Primary response fields:
- `.data.id`, `.data.status`, `.data.from`, `.data.to`, `.data.cc`, `.data.bcc`
- `.data.subject`, `.data.template_id`, `.data.attachments`, `.data.events`
- `.data.created_at`, optional `.data.scheduled_at`, `.data.sandbox`, and `.data.recipient_statuses`
- optional top-level `.suppressed[]` when some recipients were removed but at least one remains

### Send a batch

Send 1–50 independent messages. Always parse both success and error arrays from
the `207` response.

`POST /v2/email_messages/batch`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | array[message] | Yes | 1–50 items; each has the single-send shape except the three threading fields. |
| `sandbox_mode` | boolean | No | Applies to every item and overrides item-level `sandbox_mode`. |
| `Idempotency-Key` | header string | No | Idempotency for the whole batch request. |

```bash
curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: d6aa99f9-df20-4caf-99aa-e4c8b67e80ef" \
  -d '{
    "messages": [
      {
        "from": "alerts@example.com",
        "to": ["one@example.net"],
        "subject": "Alert one",
        "text_body": "First alert"
      },
      {
        "from": "alerts@example.com",
        "to": ["two@example.net"],
        "subject": "Alert two",
        "text_body": "Second alert"
      }
    ]
  }' \
  "https://api.telnyx.com/v2/email_messages/batch"
```

Primary response fields:
- `.data[]` — successful `EmailMessage` objects
- `.errors[]` — failed items with zero-based `index`, `code`, and `message`
- `.meta.total`, `.meta.succeeded`, `.meta.failed`

### Schedule and cancel an email

Scheduling uses the normal create endpoint. Confirm `.data.status == "scheduled"`;
an invalid or past timestamp is silently treated as an immediate send.

```bash
# Schedule for a future time (compute dynamically so the value is always in the future)
SCHEDULED_AT=$(date -u -v+1H '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+1 hour' '+%Y-%m-%dT%H:%M:%SZ')

# Capture the scheduled message ID for cancellation below
EMAIL_ID=$(curl -s --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "reminders@example.com",
    "to": ["customer@example.net"],
    "subject": "Appointment reminder",
    "text_body": "Your appointment is tomorrow.",
    "scheduled_at": "'$SCHEDULED_AT'"
  }' \
  "https://api.telnyx.com/v2/email_messages" | jq -r '.data.id')
```

Cancel only while the message is still scheduled:

`DELETE /v2/email_messages/{email_id}/schedule`

```bash
curl --fail-with-body \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_messages/$EMAIL_ID/schedule"
```

The cancel response is an `EmailMessageResponse` whose `.data.status` is
`cancelled`.

### List and retrieve messages

`GET /v2/email_messages` uses newest-first cursor pagination and has no filters.
`GET /v2/email_messages/{id}` returns the detail shape, including bodies.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_size` | integer 1–100 | No | Defaults to 25; invalid values are clamped. |
| `page_cursor` | string | No | Opaque URL-safe Base64 cursor from the preceding response. |
| `id` | UUID path | For get | Email message ID. |

```bash
curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "page_size=25" \
  --data-urlencode "page_cursor=$PAGE_CURSOR" \
  "https://api.telnyx.com/v2/email_messages"

curl --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_messages/$EMAIL_ID"
```

The detail response adds `.data.text_body` and `.data.html_body`. Continue
pagination only when `.meta.page_cursor` is present.

---

### Webhook Verification

Telnyx signs webhook requests with Ed25519 using the
`telnyx-signature-ed25519` and `telnyx-timestamp` headers.

```text
# Verify the signature against: telnyx-timestamp + "|" + the exact raw body.
# Do not parse/re-serialize JSON before verification.
# Reject timestamps more than 5 minutes outside your server clock.
# Deduplicate by event ID, then enqueue work and return 2xx quickly.
# Ed25519 is asymmetric signature verification; it is not HMAC.
```

## Webhooks

Outbound lifecycle normally progresses:

`email.queued` → `email.sending` → `email.sent` → `email.delivered`

Terminal alternatives include `email.bounced` and `email.failed`; deferred,
complaint, engagement, unsubscribe, sandbox, and scheduled events may also occur.

Email webhooks are configured per sender domain—not per message—using
`POST /v2/email_domains/{domain_id}/webhooks`. A message-send request has no
`webhook_url` parameter.

Telnyx retries webhook deliveries on timeout or non-2xx responses. Keep your
endpoint idempotent — the same event may be delivered multiple times. Return
2xx within 10 seconds to acknowledge receipt.

```bash
curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.net/webhooks/email",
    "events": ["email.sent", "email.delivered", "email.bounced", "email.failed"]
  }' \
  "https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/webhooks"
```

The webhook subscription enum is not the pollable event enum. In particular,
`cancelled`, `daily_limit_exceeded`, and system/gateway rejection events can be
pollable without being subscribable webhooks. Conversely, subscriptions use
`email.*` names while polling uses unprefixed values such as `delivered`. Read
[the complete enum and payload reference](references/api-details.md#webhook-payload-fields)
before writing event dispatch code.

---

## Important Supporting Operations

Use these when the core send flow needs a follow-up, reusable content, reporting,
or pre-send address checks.

### Inspect message events and recipient states

| Operation | Endpoint | Optional query parameters |
|-----------|----------|---------------------------|
| List one message's events | `GET /v2/email_messages/{email_id}/events` | `page_size`, `page_cursor` |
| List one message's recipients | `GET /v2/email_messages/{email_id}/recipients` | `page_size`, `page_cursor`, `status`, `kind` |
| Get one recipient | `GET /v2/email_messages/{email_id}/recipients/{recipient_id}` | None |

```bash
curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "page_size=25" \
  --data-urlencode "page_cursor=$PAGE_CURSOR" \
  "https://api.telnyx.com/v2/email_messages/$EMAIL_ID/events"

curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "status=bounced" \
  --data-urlencode "kind=to" \
  "https://api.telnyx.com/v2/email_messages/$EMAIL_ID/recipients"

curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_messages/$EMAIL_ID/recipients/$RECIPIENT_ID"
```

Recipient status values are `queued`, `sending`, `sent`, `deferred`,
`delivered`, `bounced`, `failed`, `gw_reject`, and `cancelled`. Each recipient
has its own billable flag and SMTP outcome. BCC addresses are returned as null.

### Create, manage, and render templates

Templates use Liquid. Create requires only `name`; subject and bodies may be
null, and `variables` are auto-extracted when omitted.

| Operation | Endpoint | Body or query |
|-----------|----------|---------------|
| Create | `POST /v2/email_templates` | `name`; optional `subject`, `html_body`, `text_body`, `variables` |
| List | `GET /v2/email_templates` | optional `page_size`, `page_cursor` |
| Get | `GET /v2/email_templates/{id}` | None |
| Replace | `PUT /v2/email_templates/{id}` | Any template fields; despite the name, behaves identically to PATCH |
| Update | `PATCH /v2/email_templates/{id}` | One or more template fields |
| Delete | `DELETE /v2/email_templates/{id}` | None; success is 204 with no body |
| Render | `POST /v2/email_templates/{id}/render` | optional `template_variables`; defaults to `{}` |

```bash
curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 91f8e70a-9ca0-43c7-b77c-594935493637" \
  -d '{
    "name": "order-confirmation",
    "subject": "Order {{ order_id }} received",
    "html_body": "<p>Hello {{ customer_name }}</p>"
  }' \
  "https://api.telnyx.com/v2/email_templates"

curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "page_size=25" \
  --data-urlencode "page_cursor=$PAGE_CURSOR" \
  "https://api.telnyx.com/v2/email_templates"

curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_templates/$TEMPLATE_ID"

curl --fail-with-body \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order-confirmation-v2",
    "subject": "Order {{ order_id }} confirmed"
  }' \
  "https://api.telnyx.com/v2/email_templates/$TEMPLATE_ID"

curl --fail-with-body \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Order {{ order_id }} is confirmed"}' \
  "https://api.telnyx.com/v2/email_templates/$TEMPLATE_ID"

curl --fail-with-body \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_templates/$TEMPLATE_ID"

curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template_variables":{"order_id":"A-100","customer_name":"Ada"}}' \
  "https://api.telnyx.com/v2/email_templates/$TEMPLATE_ID/render"
```

### List account events and statistics

`GET /v2/email_events` lists account events oldest first. It accepts
`event_type` as comma-separated or repeated parameters, plus `email_id`, `from`,
and `to`. `GET /v2/email_events/stats` accepts `from` and `to` and returns
recipient-level counts and rates.

```bash
curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "event_type=delivered,bounced" \
  --data-urlencode "from=2026-07-01T00:00:00Z" \
  --data-urlencode "to=2026-07-31T23:59:59Z" \
  "https://api.telnyx.com/v2/email_events"

curl --get --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "from=2026-07-01T00:00:00Z" \
  --data-urlencode "to=2026-07-31T23:59:59Z" \
  "https://api.telnyx.com/v2/email_events/stats"
```

When `from` is omitted it defaults to 30 days ago. If `from` is present without
`to`, the end defaults to `from + 30 days`.

### Validate email addresses

Single validation is synchronous. Batch validation accepts 1–1,000 addresses,
deduplicates them, and returns an asynchronous job to poll.

```bash
curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.net"}' \
  "https://api.telnyx.com/v2/email_validations"

curl --fail-with-body \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails":["one@example.net","two@example.net"],
    "webhook_url":"https://example.net/webhooks/validation-complete"
  }' \
  "https://api.telnyx.com/v2/email_validations/batch"

curl --fail-with-body \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_validations/batch/$BATCH_ID"
```

Poll until `.data.status` is `completed` or `failed`; completed results are in
`.data.results`, keyed by the original address.

---

## Additional Operations

The 20 operations below are reachable. Use the core tasks above first, then
consult [references/api-details.md](references/api-details.md) for every optional
parameter and full response shape. There are no curl SDK methods: use the raw
HTTP method and path shown here.

| Operation | HTTP method | Endpoint | Use when | Required params |
|-----------|-------------|----------|----------|-----------------|
| Send, schedule, or sandbox an email | POST | `/v2/email_messages` | Create one outbound message. | `from`, `to`; `subject` unless `template_id` |
| Send a batch | POST | `/v2/email_messages/batch` | Create up to 50 messages and parse per-item outcomes. | `messages` |
| List messages | GET | `/v2/email_messages` | Page through account messages. | None |
| Get a message | GET | `/v2/email_messages/{id}` | Retrieve bodies and current state. | `id` |
| Cancel a scheduled message | DELETE | `/v2/email_messages/{email_id}/schedule` | Stop a message that is still scheduled. | `email_id` |
| List message events | GET | `/v2/email_messages/{email_id}/events` | Poll one message's lifecycle. | `email_id` |
| List message recipients | GET | `/v2/email_messages/{email_id}/recipients` | Inspect per-recipient outcomes. | `email_id` |
| Get one message recipient | GET | `/v2/email_messages/{email_id}/recipients/{recipient_id}` | Inspect one recipient's SMTP state. | `email_id`, `recipient_id` |
| Create a template | POST | `/v2/email_templates` | Store reusable Liquid content. | `name` |
| List templates | GET | `/v2/email_templates` | Select or audit templates. | None |
| Get a template | GET | `/v2/email_templates/{id}` | Retrieve one template. | `id` |
| Replace a template | PUT | `/v2/email_templates/{id}` | Compatibility update; behaves like PATCH. | `id` |
| Update a template | PATCH | `/v2/email_templates/{id}` | Modify selected template fields. | `id` |
| Delete a template | DELETE | `/v2/email_templates/{id}` | Remove reusable content. | `id` |
| Render a template | POST | `/v2/email_templates/{id}/render` | Preview Liquid output. | `id` |
| List account events | GET | `/v2/email_events` | Query pollable lifecycle/engagement events. | None |
| Get event statistics | GET | `/v2/email_events/stats` | Compute recipient-level counts and rates. | None |
| Validate one address | POST | `/v2/email_validations` | Synchronously assess deliverability. | `email` |
| Create a validation batch | POST | `/v2/email_validations/batch` | Validate up to 1,000 addresses asynchronously. | `emails` |
| Get a validation batch | GET | `/v2/email_validations/batch/{id}` | Poll batch status and retrieve results. | `id` |

### Not yet available

These OpenAPI operations are not routed in the deployed API. Do not call them
or count them among the 20 reachable operations:

| Operation | Endpoint | Status |
|-----------|----------|--------|
| Delete all account email data matching an address | `DELETE /v2/email_messages?address=...` | **Not yet available** |
| Delete one email message and retained child data | `DELETE /v2/email_messages/{id}` | **Not yet available** |

---

For exhaustive operation parameters, complete response schemas, webhook fields,
and error codes, see [references/api-details.md](references/api-details.md).
