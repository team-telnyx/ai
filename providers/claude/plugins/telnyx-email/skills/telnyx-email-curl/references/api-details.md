# Email (curl) — API Details

## Table of Contents

- [Operation Parameters](#operation-parameters)
- [Response Schemas](#response-schemas)
- [Webhook Payload Fields](#webhook-payload-fields)
- [Error Code Taxonomy](#error-code-taxonomy)

All routes below use `https://api.telnyx.com/v2`. Send
`Authorization: Bearer $TELNYX_API_KEY`; send `Content-Type: application/json`
when a JSON body is present.

## Operation Parameters

### Shared input shapes

#### Email address input

Either a string (`"user@example.com"`) or an object with required `email`
(string) and optional `name` (string). `to` has at least one item; `cc`/`bcc`
are optional. Addresses must be unique across all three lists after
trim/case normalization.

#### Attachment input

All fields are optional: `filename` (string, default `attachment`),
`content_type` (string, default `application/octet-stream`), `content` (string,
typically Base64, default empty), `disposition` (string, default `attachment`;
use `inline` for CID content), and `content_id` (string|null). The complete JSON
request must remain under 8,000,000 bytes, including Base64 overhead.

#### Tracking settings input

Optional booleans `open_tracking` (tracking pixel) and `click_tracking` (link
rewriting). Omitted values inherit the domain settings.

#### Idempotency-Key header

Only the five marked creates support this optional 1–255 character header
matching `^[A-Za-z0-9_-]{1,255}$`. Use one UUID v4 per logical operation and
reuse it only for the identical retry. Successes may replay for 24 hours.
Invalid keys return 400/`10015`, in-progress duplicates 409/`10036`, and a key
reused with a different request 422/`10027`.

### POST /email_messages

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | email address input | Yes | Sender address. |
| `from_name` | string | No | Display name for string `from`; overrides `from.name`. |
| `to` | array[email address input] | Yes | At least one recipient. |
| `cc` | array[email address input] | No | Carbon-copy recipients. |
| `bcc` | array[email address input] | No | Blind-copy recipients. |
| `reply_to` | email address input | No | Reply address. If object form has a name, only its email is stored. |
| `subject` | string | Conditional | Required unless `template_id` is present. A rendered template must produce a non-empty subject. |
| `html_body` | string | No | HTML body. Do not use with `template_id`. |
| `text_body` | string | No | Plain-text body. Do not use with `template_id`. |
| `headers` | object[string,string] | No | Custom headers; write-only. |
| `attachments` | array[attachment input] | No | In-band attachments; see shared shape. |
| `tags` | array[string] | No | Immutable EDR/reporting attribution; write-only in this API. |
| `group_id` | UUID or null | No | Unsubscribe group used for scoped suppression checks. |
| `ignore_suppression` | boolean | No | Default false. Requires `email:override`; hard-bounce, complaint, and invalid-address suppressions remain non-overridable. |
| `metadata` | object | No | Arbitrary write-only metadata. |
| `tracking_settings` | object | No | Per-send open/click overrides. |
| `template_id` | UUID | No | Liquid template to render. Do not combine with subject/body fields. |
| `template_variables` | object | No | Arbitrary Liquid values; defaults to `{}`. Non-object input can produce 422 during send. |
| `scheduled_at` | date-time or null | No | Preferred scheduling field. Invalid or past values are silently ignored and send immediately. |
| `send_at` | date-time | No | Deprecated `scheduled_at` alias. `scheduled_at` wins if both are present. |
| `inline_css` | boolean | No | Default false. Inlines CSS before delivery. |
| `sandbox_mode` | boolean | No | Default false. Persists a sandbox message/event/EDR without MTA delivery. |
| `in_reply_to_message_id` | UUID or null | No | Account-scoped parent message. Sets RFC 5322 `In-Reply-To` and `References`; cannot combine with `forward_of_message_id`. |
| `reply_to_all` | boolean or null | No | Default false. Reply-all intent only; recipient selection remains caller-controlled. |
| `forward_of_message_id` | UUID or null | No | Forward provenance. Starts a new thread and is not looked up; cannot combine with `in_reply_to_message_id`. |
| `Idempotency-Key` | header string | No | Supported. See shared rules. |

Success is `202` with `EmailMessageResponse`. Template lookup failure (missing or
wrong account) is 400, not 404. If some recipients are suppressed, accepted
responses can include top-level `suppressed`; if all are suppressed, no message
is created and the response is 422.

### POST /email_messages/batch

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | array[batch message] | Yes | 1–50 items. |
| `sandbox_mode` | boolean | No | Default false; overrides every item-level setting. |
| `Idempotency-Key` | header string | No | Supported for the complete batch operation. |

Each batch message supports every `POST /email_messages` body field except
`in_reply_to_message_id`, `reply_to_all`, and `forward_of_message_id`. Each item
still requires `from` and `to`, and requires `subject` unless it has
`template_id`. Per-message `sandbox_mode` is accepted but loses to the outer
value. The response is always `207 Multi-Status`, never 202.

### GET /email_messages

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_size` | integer 1–100 | No | Default 25. Invalid values are clamped. |
| `page_cursor` | string | No | Opaque URL-safe Base64 cursor from the prior response. |

Messages are sorted by `created_at desc, id desc`. No filters other than cursor
pagination are implemented. The exact parameter is `page_cursor`, not
`page[cursor]`.

### GET /email_messages/{id}

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID path | Yes | Email message ID. |

Returns the detail schema, which adds `text_body` and `html_body`.

### DELETE /email_messages/{email_id}/schedule

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email_id` | UUID path | Yes | Scheduled email message ID. |

Returns 200 with `EmailMessageResponse` and status `cancelled`. A message that is
not cancellable returns an error. The legacy `/v2/emails/{id}/schedule` route is
an alias.

### GET /email_messages/{email_id}/events

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email_id` | UUID path | Yes | Parent message ID. |
| `page_size` | integer 1–100 | No | Default 25. Invalid values are clamped. |
| `page_cursor` | string | No | Opaque next-page cursor. |

Events are sorted by `occurred_at asc, id asc`.

### GET /email_messages/{email_id}/recipients

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email_id` | UUID path | Yes | Parent message ID. |
| `page_size` | integer 1–100 | No | Default 25. |
| `page_cursor` | string | No | Opaque next-page cursor. |
| `status` | enum | No | `queued`, `sending`, `sent`, `deferred`, `delivered`, `bounced`, `failed`, `gw_reject`, or `cancelled`. |
| `kind` | enum | No | `to`, `cc`, or `bcc`. |

### GET /email_messages/{email_id}/recipients/{recipient_id}

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email_id` | UUID path | Yes | Parent message ID. |
| `recipient_id` | UUID path | Yes | Recipient row ID. |

### POST /email_templates

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Letters, numbers, spaces, hyphens, and underscores only. |
| `subject` | string or null | No | Liquid subject. |
| `html_body` | string or null | No | Liquid HTML body. |
| `text_body` | string or null | No | Liquid plain-text body. |
| `variables` | array[string] | No | Auto-extracted from subject/body fields when omitted. |
| `Idempotency-Key` | header string | No | Supported. |

Success is 201.

### GET /email_templates

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_size` | integer 1–100 | No | Default 25; invalid values are clamped. |
| `page_cursor` | string | No | Opaque next-page cursor. |

Templates are sorted by `created_at desc, id desc`.

### Template item operations

Every operation requires `id` (UUID path):

| Operation | Body | Success |
|-----------|------|---------|
| `GET /email_templates/{id}` | None | 200 template |
| `PUT /email_templates/{id}` | Optional `name`, `subject`, `html_body`, `text_body`, `variables`; behaves like PATCH, not full replacement | 200 template |
| `PATCH /email_templates/{id}` | Optional `name`, `subject`, `html_body`, `text_body`, `variables` | 200 template |
| `DELETE /email_templates/{id}` | None | 204 empty body |
| `POST /email_templates/{id}/render` | Optional `template_variables` object, default `{}`; non-object becomes `{}` | 200 rendered template |

Render does not support `Idempotency-Key`.

### GET /email_events

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_size` | integer 1–100 | No | Default 25; invalid values are clamped. |
| `page_cursor` | string | No | Opaque next-page cursor. |
| `event_type` | string or repeated string | No | Comma-separated or repeated event types. Unknown values return no matches. |
| `email_id` | UUID | No | Message filter. An invalid UUID is silently ignored and applies no filter. |
| `from` | date-time | No | Inclusive start; defaults to 30 days ago. |
| `to` | date-time | No | Inclusive end; when only `from` is set, defaults to `from + 30 days`. |

Events are sorted by `occurred_at asc, id asc`. Pollable `event_type` values are:

`queued`, `deferred`, `scheduled`, `cancelled`, `sandbox`, `sending`, `sent`,
`failed`, `delivered`, `bounced`, `complained`, `rejected`, `opened`, `clicked`,
`unsubscribed`, `daily_limit_exceeded`.

### GET /email_events/stats

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | date-time | No | Inclusive start; defaults to 30 days ago. |
| `to` | date-time | No | Inclusive end; when only `from` is set, defaults to `from + 30 days`. |

### POST /email_validations

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Any non-empty string. Invalid syntax returns `valid: false` instead of a request error. |
| `Idempotency-Key` | header string | No | Supported. |

Success is synchronous 200.

### POST /email_validations/batch

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emails` | array[string] | Yes | 1–1,000 addresses. Blank strings are discarded and counted in `duplicates_removed`; all blank returns 400. |
| `webhook_url` | HTTP(S) URL | No | Completion callback, maximum 2048 characters. Empty means omitted. Private/reserved IPs and internal hosts are rejected. |
| `Idempotency-Key` | header string | No | Supported. |

Success is asynchronous 202.

### GET /email_validations/batch/{id}

`id` is the required validation-batch UUID. Poll until status is `completed` or
`failed`.

### Unrouted delete operations

The OpenAPI describes `DELETE /email_messages?address=...` and
`DELETE /email_messages/{id}`, but they are **not yet available** in the deployed
route surface. Do not invoke them.

## Response Schemas

### Message envelopes

| Schema | Fields |
|--------|--------|
| `EmailMessageResponse` | required `data: EmailMessage`; optional `suppressed: SuppressedRecipient[]` |
| `EmailMessageDetailResponse` | required `data: EmailMessageDetail` |
| `EmailMessageListResponse` | required `data: EmailMessage[]`, `meta: PaginationMeta` |
| `MessageEventListResponse` | required `data: MessageEvent[]`, `meta: PaginationMeta` |
| `EmailRecipientListResponse` | required `data: EmailRecipient[]`, `meta` |
| `EmailRecipientResponse` | required `data: EmailRecipient` |

#### EmailMessage

Required fields: `record_type` (enum `email_message`), `id` (UUID), `status`
(enum), `from` (EmailAddress), `to`/`cc`/`bcc` (EmailAddress arrays),
`reply_to` (string|null), `subject` (string), `template_id` (UUID|null),
`template_variables` (object), `attachments` (AttachmentResponse array),
`events` (MessageEvent array), and `created_at` (date-time).

Status is `queued`, `scheduled`, `cancelled`, `sandbox`, `sending`, `sent`,
`failed`, `deferred`, `delivered`, `bounced`, `complained`, `rejected`, `opened`,
`clicked`, or `unsubscribed`. Optional fields are `scheduled_at` (date-time,
retained after send/cancel), `inline_css` (boolean, immediate create only),
`sandbox` (boolean), and `recipient_statuses` (object mapping status to count).

`EmailMessageDetail` contains every `EmailMessage` field and additionally requires
`text_body: string|null` and `html_body: string|null`.

#### EmailAddress response

Required `email` (string); optional `name` (string).

#### AttachmentResponse

All fields are required: `url` (URI|null), `sha256` (string|null), `size_bytes`
(integer|null), `filename` (string), `content_type` (string), `disposition`
(string), and `content_id` (string|null). Content itself is never returned.

#### SuppressedRecipient

All four fields are required: `to` (email), `reason` (string), `scope` (string),
and `override_allowed` (boolean).

#### MessageEvent

| Field | Type | Required |
|-------|------|----------|
| `type` | pollable event enum | Yes |
| `occurred_at` | date-time | Yes |
| `payload` | arbitrary object | No |

#### EmailRecipient

Required fields: `record_type` (enum `email_recipient`), `id` (UUID),
`message_id` (UUID), `address` (email|null; null for BCC), `kind`
(`to`|`cc`|`bcc`), `status` (recipient status enum), and `billable` (boolean).
Optional fields: `sent_at`, `delivered_at`, and `failed_at` (date-time|null),
`smtp_code` (integer|null), and `smtp_response` (string|null).

Recipient list `meta` requires `page_size` and can include nullable
`page_cursor`.

### Batch response

`EmailBatchResponse` requires all three fields:

| Field | Type | Description |
|-------|------|-------------|
| `data` | EmailMessage[] | Successful items. |
| `errors` | EmailBatchItemError[] | Failed items. Empty when all succeed. |
| `meta` | EmailBatchMeta | Aggregate item counts. |

`EmailBatchItemError` requires `index` (zero-based integer), `code`, and
`message`. Code is one of `bad_request`, `not_found`, `forbidden`,
`service_unavailable`, `validation_error`, `recipient_suppressed`, or
`reputation_suspended`. `EmailBatchMeta` requires integer `total`, `succeeded`,
and `failed`.

### Template responses

`EmailTemplateResponse` contains required `data: EmailTemplate`.
`EmailTemplateListResponse` contains required `data: EmailTemplate[]` and
`meta: PaginationMeta`. `RenderedEmailTemplateResponse` contains required
`data: RenderedEmailTemplate`.

#### EmailTemplate

All fields are required; nullable fields remain present:

| Field | Type |
|-------|------|
| `record_type` | enum `email_template` |
| `id` | UUID |
| `name` | string |
| `subject` | string or null |
| `html_body` | string or null |
| `text_body` | string or null |
| `variables` | string[] |
| `created_at` | date-time |
| `updated_at` | date-time |

`RenderedEmailTemplate` has the same fields; `subject`, `html_body`, and
`text_body` contain rendered Liquid output while identity and metadata are
unchanged.

### Validation responses

#### EmailValidation

Required: `record_type` (enum `email_validation`), `email` (string), `valid`
(boolean), `risk_score` (float >= 0), and `checks` (EmailValidationChecks).
Optional: `did_you_mean` (string).

`checks` requires `syntax`, `mx`, `disposable`, `role_based`, and `typo`. Every
check requires `pass: boolean` and can include `details: string`. The typo check
can also include `suggestion: string`.

`EmailValidationResponse` contains required `data: EmailValidation`.

#### EmailValidationBatch (create response)

Required: `record_type` (enum `email_validation_batch`), `id` (UUID), `status`
(enum), `total` and `duplicates_removed` (integers >= 0). Optional:
`webhook_url` (URI).

Status is `pending`, `processing`, `completed`, or `failed`.
`EmailValidationBatchResponse` contains this object in required `data`.

#### EmailValidationBatchDetail (poll response)

Required: `record_type`, `id`, `status`, and `total`. Optional:
`webhook_url`, `completed_at`, and `results`. `results` is an object keyed by the
original email address; each value has `email`, `valid`, `risk_score`, optional
`did_you_mean`, and `checks`. Unlike create, detail does not include
`duplicates_removed`.

### Account event responses

`AccountEmailEventListResponse` requires `data: AccountEmailEvent[]` and
`meta: EventPaginationMeta`.

#### AccountEmailEvent

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `record_type` | enum `email_event` | Yes | Resource discriminator. |
| `id` | UUID | Yes | Event ID; use for deduplication. |
| `type` | pollable event enum | Yes | Unprefixed event type. |
| `occurred_at` | date-time | Yes | Event time. |
| `email_id` | UUID | Yes | Associated message. |
| `email` | EventEmailSummary | No | Present when the message preload is available. |
| `payload` | arbitrary object | No | Event-specific details. |

`EventEmailSummary` requires `from: EmailAddress`, `to: EmailAddress[]`,
`cc: EmailAddress[]`, and `subject: string`.

#### EmailEventStats

`EmailEventStatsResponse` contains required `data` with required
`record_type: email_event_stats`, `counts`, `rates`, and `time_range`.

All count fields are required non-negative integers: `queued`, `sent`,
`delivered`, `deferred`, `bounced`, `opened`, `clicked`, `complained`,
`unsubscribed`, and `failed`. Counts are recipient-level; one message with three
recipients can contribute three outcomes. Repeated same-type events for the same
message/recipient count once. `scheduled`, `cancelled`, `sandbox`, `sending`, and
`rejected` are valid events but are not counted in stats.

All rate fields are required non-negative floats rounded to two decimals:

| Field | Formula |
|-------|---------|
| `delivery_rate` | delivered / queued × 100 |
| `bounce_rate` | bounced / queued × 100 |
| `deferred_rate` | deferred / queued × 100 |
| `open_rate` | opened / delivered × 100 |
| `click_rate` | clicked / opened × 100 |
| `complaint_rate` | complained / delivered × 100 |

`time_range` requires nullable date-time fields `from` and `to`.

### Pagination metadata

`PaginationMeta` requires `page_size` (1–100) and optionally returns
`page_cursor` when more rows exist. `EventPaginationMeta` requires `page_size`
and `time_range`, and optionally returns `page_cursor`.

## Webhook Payload Fields

### Configuration record

Email webhooks are domain-scoped. Create them with
`POST /v2/email_domains/{domain_id}/webhooks`; the create body requires `url`
(HTTPS URI) and a non-empty `events` array. There is no default-to-all behavior.
The resulting record requires `id` (UUID), `record_type` (enum
`email_webhook`), `url` (URI), `events` (subscription-event enum array),
`domain_id` (UUID), and `created_at`/`updated_at` (date-time).

### Delivery payload

Webhook payloads include the event type, timestamp, and event data. See the
Telnyx webhook documentation for the full payload format.

### Webhook subscription enum

These exact event names may be configured:

- Outbound: `email.scheduled`, `email.sandbox`, `email.queued`,
  `email.sending`, `email.sent`, `email.delivered`, `email.deferred`,
  `email.bounced`, `email.failed`, `email.complained`, `email.opened`,
  `email.clicked`, `email.unsubscribed`
- Inbound: `email.received`
- Domain lifecycle: `email_domain.created`, `email_domain.verified`,
  `email_domain.degraded`, `email_domain.suspended`, `email_domain.deleted`

The pollable enum is separate. `cancelled`, `daily_limit_exceeded`, and
`rejected` (including system/gateway rejection details) are pollable but are not
subscription values. `email.failed` is subscribable, so do not drop it merely
because some system failures are poll-only.

### Signature and delivery rules

- Read `telnyx-signature-ed25519` and `telnyx-timestamp`.
- Verify Ed25519 against the exact raw request body; do not verify re-serialized JSON.
- Reject timestamps outside a five-minute tolerance to limit replay.
- Deduplicate repeated events before applying side effects.
- Return a 2xx quickly and process asynchronously.
- Preserve unknown payload keys so new event details do not break the handler.

## Error Code Taxonomy

### HTTP/API errors

The standard envelope is `{ "errors": [ErrorObject, ...] }`. An error object
requires `code`, `title`, and `detail`; `detail` can be a string or structured
object. Optional `source` and `meta` may provide a field pointer or documentation
URL. The envelope can also include top-level `suppressed`.

| HTTP | Code | Meaning and action |
|------|------|--------------------|
| 400 | `10015` | Bad request/validation, including malformed idempotency headers. Fix input; do not retry unchanged. |
| 401 | `10006` | Not authorized. Replace credentials or scopes. |
| 403 | `10007` | Forbidden: domain may be unverified, suspended, degraded, or missing DKIM. Correct account/domain state. |
| 404 | `10001` (or framework `404`) | Account-scoped resource not found. |
| 409 | `10036` | Same idempotency request still in progress. Retry later with the same key and identical body. |
| 413 | varies | Request exceeds the 8,000,000-byte endpoint limit. Reduce attachments/body. |
| 422 | `10015` | Semantic validation/changeset error. |
| 422 | `10027` | Idempotency key was used with a different request. Generate a new key for the new operation. |
| 422 | `render_error` | Liquid rendering failed. Render error items use `message`, not `detail`. |
| 422 | `recipient_suppressed` | Every recipient was suppressed; inspect top-level `suppressed[]`. |
| 429 | `reputation_suspended` or policy detail | Sending is blocked by poor reputation or a daily policy limit. Inspect code/detail; blind backoff cannot fix suspension/policy state. |
| 500 | `10019` (or framework `500`) | Internal server error. Retry safely; use idempotency where supported. |
| 503 | `10016` | Service/upstream unavailable, including unavailable idempotency protection for a keyed request. Retry safely. |

`ReputationSuspendedError` is non-standard but still uses `errors[]`; each item
has string code `reputation_suspended`, title (typically `Sending Suspended`),
and detail. `RecipientSuppressedError` adds `suppressed[]`, whose objects contain
`to`, `reason`, `scope`, and `override_allowed`.

### Batch item error codes

Batch item failures are in top-level `errors[]`, not the standard API error
envelope. Every item has `index`, `code`, and human-readable `message`. Valid
codes: `bad_request`, `not_found`, `forbidden`, `service_unavailable`,
`validation_error`, `recipient_suppressed`, and `reputation_suspended`.

### Delivery error details

For delivery error details, inspect the `type` and `payload` fields in the
message events response. The `payload` object may contain additional
error context specific to the event type.

Never infer the final message outcome from the initial 202/207 alone. Consume
webhooks or poll message events and recipient state until the workflow reaches a
terminal state.
