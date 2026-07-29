# Email Inbound (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Reachable Operation Index](#reachable-operation-index)
- [Request and Query Parameters](#request-and-query-parameters)
- [Response Schemas](#response-schemas)
- [Pagination and Ordering](#pagination-and-ordering)
- [Webhook Guidance](#webhook-guidance)
- [Error Behavior](#error-behavior)
- [Not Yet Available](#not-yet-available)

## Reachable Operation Index

All paths in this table are relative to `https://api.telnyx.com/v2`. These are the
inbound-email operations currently reachable through the API gateway and covered by the
skill.

| Operation ID | Method | Path | Success |
|--------------|--------|------|---------|
| `CreateEmailInbox` | `POST` | `/email_inboxes` | `201` with inbox |
| `ListEmailInboxes` | `GET` | `/email_inboxes` | `200` with inbox page |
| `GetEmailInbox` | `GET` | `/email_inboxes/{id}` | `200` with inbox |
| `DeleteEmailInbox` | `DELETE` | `/email_inboxes/{id}` | `204`, no body |
| `ListEmailInboxMessages` | `GET` | `/email_inboxes/{inbox_id}/messages` | `200` with message page |
| `UpdateEmailInboxMessage` | `PATCH` | `/email_inboxes/{inbox_id}/messages/{message_id}` | `200` with updated message |
| `ReplyToEmailInboxMessage` | `POST` | `/email_inboxes/{inbox_id}/messages/{message_id}/actions/reply` | `202` with outbound message |
| `ReplyAllToEmailInboxMessage` | `POST` | `/email_inboxes/{inbox_id}/messages/{message_id}/actions/reply_all` | `202` with outbound message |
| `ForwardEmailInboxMessage` | `POST` | `/email_inboxes/{inbox_id}/messages/{message_id}/actions/forward` | `202` with outbound message |
| `ListEmailInboxThreads` | `GET` | `/email_inboxes/{inbox_id}/threads` | `200` with thread page |
| `GetEmailInboxThread` | `GET` | `/email_inboxes/{inbox_id}/threads/{thread_id}` | `200` with thread and message page |
| `ListEmailThreads` | `GET` | `/email_threads` | `200` with account-wide thread page |
| `GetEmailThread` | `GET` | `/email_threads/{thread_id}` | `200` with thread and message page |
| `ListEmailInboxFilters` | `GET` | `/email_inboxes/{inbox_id}/filters` | `200` with both filter lists |
| `AddEmailInboxFilterEntries` | `POST` | `/email_inboxes/{inbox_id}/filters` | `200` with both filter lists |
| `ReplaceEmailInboxFilters` | `PUT` | `/email_inboxes/{inbox_id}/filters` | `200` with both filter lists |
| `RemoveEmailInboxFilterEntries` | `DELETE` | `/email_inboxes/{inbox_id}/filters` | `200` with both filter lists |

The Telnyx UUID in a message resource's `id` field is the `message_id` path parameter.
Do not substitute the RFC `Message-ID` header stored in the resource's separate
`message_id` field.

## Request and Query Parameters

### CreateEmailInbox

`POST /email_inboxes`

The JSON request body is optional. An empty object creates an immediately usable inbox
with a generated username on the account's shared inbound subdomain.

| Field | Type | Required | Constraints and behavior |
|-------|------|----------|--------------------------|
| `username` | string | No | Trimmed and lowercased. Normalized value is 1-64 characters, starts and ends with a letter or digit, and uses only letters, digits, `.`, `-`, and `_`. Generated when omitted. |
| `domain_id` | UUID | No | Must identify an account-owned, inbound-enabled domain. Omit to allocate/use the shared inbound subdomain. |

Valid bodies range from `{}` to both fields together. Invalid normalized usernames or
domain selections return `422` code `10015`.

### ListEmailInboxes

`GET /email_inboxes`

| Query parameter | Type | Required | Constraints and behavior |
|-----------------|------|----------|--------------------------|
| `page_size` | integer | No | Defaults to 20; minimum 1, maximum 250. |
| `page_cursor` | string | No | Opaque value returned in the previous response's `meta.page_cursor`. |

Do not use JSON:API bracketed pagination on this endpoint. Inbox pagination deliberately
uses `page_size` and `page_cursor`.

### GetEmailInbox and DeleteEmailInbox

`GET|DELETE /email_inboxes/{id}`

| Path parameter | Type | Required | Description |
|----------------|------|----------|-------------|
| `id` | UUID | Yes | Account-scoped email inbox ID. |

Delete soft-deletes the inbox. The address stays reserved; deleted inboxes are omitted
from list and get operations. A successful delete returns no JSON body.

### ListEmailInboxMessages

`GET /email_inboxes/{inbox_id}/messages`

| Parameter | Type | Required | Constraints and behavior |
|-----------|------|----------|--------------------------|
| `inbox_id` | UUID path | Yes | Account-scoped inbox. |
| `filter[from]` | string | No | Case-insensitive literal substring of sender address. |
| `filter[subject]` | string | No | Case-insensitive literal substring of subject. |
| `filter[received_after]` | date-time | No | Inclusive ISO 8601 lower bound. |
| `filter[received_before]` | date-time | No | Inclusive ISO 8601 upper bound. |
| `filter[read]` | boolean | No | Filters on whether `read_at` is present. |
| `filter[unread]` | boolean | No | Set `true` for messages whose `read_at` is null. |
| `filter[label]` | string | No | Exact, case-sensitive match; maximum 255 characters. Reserved `telnyx:` labels may be read/filtered even though customer label mutation is unavailable. |
| `filter[search]` | string | No | PostgreSQL full-text query across subject, plain-text body, and HTML body; maximum 500 characters. |
| `page[size]` | integer | No | Defaults to 25; minimum 1, maximum 100. |
| `page[after]` | string | No | Opaque value from the previous response's `meta.page_cursor`. |

All filters compose. Full-text search is not the same as a literal substring search:
use `filter[subject]` for a literal subject fragment. Pass bracketed names through
`curl --data-urlencode` so shells and URL encoders do not alter them.

`filter[read]` and `filter[unread]` express the same underlying state from opposite
directions. Prefer one in a request rather than relying on behavior from contradictory
combinations.

### UpdateEmailInboxMessage

`PATCH /email_inboxes/{inbox_id}/messages/{message_id}`

| Parameter or field | Type | Required | Constraints and behavior |
|--------------------|------|----------|--------------------------|
| `inbox_id` | UUID path | Yes | Inbox containing the inbound message. |
| `message_id` | UUID path | Yes | Telnyx inbound message resource ID. |
| `read_at` | `true`, date-time, or null | Yes | `true` uses server current time; an ISO 8601 timestamp sets explicit read time; null marks unread. |

`false` is not a valid `read_at` value. Use JSON null to mark unread. Repeating the same
update is idempotent.

### ReplyToEmailInboxMessage and ReplyAllToEmailInboxMessage

`POST .../actions/reply` and `POST .../actions/reply_all`

| Parameter or field | Type | Required | Constraints and behavior |
|--------------------|------|----------|--------------------------|
| `inbox_id` | UUID path | Yes | Inbox whose configured address/domain sends the reply. |
| `message_id` | UUID path | Yes | Telnyx inbound message resource ID. |
| `text` | string | Conditionally | Plain-text body with at least one non-whitespace character. |
| `html` | string | Conditionally | HTML body with at least one non-whitespace character. |

At least one of `text` or `html` is required. Both may be sent. Recipients are derived
by the service; caller-supplied `to`, `cc`, and `bcc` values are ignored rather than
used to redirect a reply.

The inbox must have a resolvable sending domain. These actions pass through the same
suppression, reputation, quota, persistence, and delivery pipeline as ordinary outbound
email.

### ForwardEmailInboxMessage

`POST .../actions/forward`

| Parameter or field | Type | Required | Constraints and behavior |
|--------------------|------|----------|--------------------------|
| `inbox_id` | UUID path | Yes | Inbox whose configured address/domain sends the forward. |
| `message_id` | UUID path | Yes | Telnyx inbound message resource ID. |
| `to` | recipient or non-empty recipient array | Yes | At least one recipient before suppression checks. |
| `cc` | recipient or recipient array | No | Carbon-copy recipients. |
| `bcc` | recipient or recipient array | No | Blind-carbon-copy recipients. |
| `text` | string | No | Plain-text note prepended to the generated forwarded-message block; blank is treated as omitted. |
| `html` | string | No | HTML note prepended to the generated forwarded-message block; blank is treated as omitted. |

A recipient may be either an email string or an object:

```json
{
  "email": "owner@example.com",
  "name": "Account Owner"
}
```

`to`, `cc`, and `bcc` each accept one such value or an array. The email address must
match a normal `local@domain` shape. The action does not require a caller-provided body;
the generated forward block contains the original metadata and available body content.

### ListEmailInboxThreads

`GET /email_inboxes/{inbox_id}/threads`

| Parameter | Type | Required | Constraints and behavior |
|-----------|------|----------|--------------------------|
| `inbox_id` | UUID path | Yes | Account-scoped inbox. |
| `page[size]` | integer | No | Defaults to 25; minimum 1, maximum 100. |
| `page[after]` | string | No | Opaque cursor from the previous thread page. |
| `filter[label]` | string | No | Exact label filter, maximum 255 characters. Existing labels are readable, but mutation routes are not yet gateway-routed. |

### GetEmailInboxThread

`GET /email_inboxes/{inbox_id}/threads/{thread_id}`

| Parameter | Type | Required | Constraints and behavior |
|-----------|------|----------|--------------------------|
| `inbox_id` | UUID path | Yes | Inbox half of the composite thread identity. |
| `thread_id` | UUID path | Yes | Thread half of the composite identity. |
| `page[size]` | integer | No | Number of messages, default 25; minimum 1, maximum 100. |
| `page[after]` | string | No | Opaque message cursor from the previous thread-detail page. |

This endpoint returns one thread summary plus a bounded chronological page in
`data.messages`. It may interleave inbound and outbound message records.

### ListEmailThreads

`GET /email_threads`

| Parameter | Type | Required | Constraints and behavior |
|-----------|------|----------|--------------------------|
| `filter[inbox_id]` | UUID array | No | Restrict to one or more inboxes; repeat `filter[inbox_id][]=...` or pass comma-separated UUIDs. Omit for all account inboxes. |
| `page[size]` | integer | No | Defaults to 25; minimum 1, maximum 100. |
| `page[after]` | string | No | Opaque cursor from the previous page. |
| `filter[label]` | string | No | Exact, case-sensitive thread label; maximum 255 characters. |

If `filter[inbox_id]` is present, it must contain a non-empty UUID. Inbox IDs outside the
authenticated account are silently excluded. Every result carries `inbox_id`; retain it
with `id` for detail requests and reply routing.

### GetEmailThread

`GET /email_threads/{thread_id}`

| Parameter | Type | Required | Constraints and behavior |
|-----------|------|----------|--------------------------|
| `thread_id` | UUID path | Yes | Thread half of the composite identity. |
| `inbox_id` | UUID query | Yes | Inbox half of the composite identity. |
| `page[size]` | integer | No | Number of messages, default 25; minimum 1, maximum 100. |
| `page[after]` | string | No | Opaque message cursor from the previous detail page. |

`inbox_id` is required even though this is the account-wide route. A thread ID may occur
in multiple inboxes, so the service returns only messages matching the supplied
`(inbox_id, thread_id)` pair.

### Sender Filter Requests

All sender filter routes use `/email_inboxes/{inbox_id}/filters` and require an
account-scoped inbox UUID.

For incremental POST and DELETE mutations:

| Field | Type | Required | Constraints and behavior |
|-------|------|----------|--------------------------|
| `type` | enum | Yes | `allowlist` or `blocklist`. |
| `entries` | string array | Yes | Up to 500 exact addresses or `@domain` wildcards. |

For atomic PUT replacement:

| Field | Type | Required | Constraints and behavior |
|-------|------|----------|--------------------------|
| `allowlist` | string array | No | Complete replacement allowlist, maximum 500. Omission clears this list. |
| `blocklist` | string array | No | Complete replacement blocklist, maximum 500. Omission clears this list. |

Unknown keys in the replacement request are ignored by the controller; callers should
still reject typos locally because an ignored misspelling can accidentally clear a list.

## Response Schemas

### Email inbox

**Returned by:** `CreateEmailInbox`, `GetEmailInbox`, and each item from
`ListEmailInboxes`.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `id` | UUID | Yes | Inbox resource ID. |
| `record_type` | enum: `email_inbox` | Yes | Resource discriminator. |
| `address` | email | Yes | Complete inbound address. |
| `status` | enum: `active`, `paused` | Yes | Inbox state. |
| `domain_id` | UUID | Yes | Domain backing the inbox, including allocated shared domain. |
| `domain` | string | Yes | Domain name used by the address. |
| `settings` | object | Yes | Inbox settings object; do not assume keys not documented by the active spec. |
| `created_at` | date-time | Yes | Creation timestamp. |
| `updated_at` | date-time | Yes | Last update timestamp. |

Single-resource responses wrap this object in `data`. The list response returns a
`data` array and `meta` pagination object.

### Inbox filters

**Returned by:** all four sender filter operations.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `record_type` | enum: `email_inbox_filters` | Yes | Resource discriminator. |
| `allowlist` | string array | Yes | Normalized lowercase exact addresses and domain wildcards. |
| `blocklist` | string array | Yes | Normalized lowercase exact addresses and domain wildcards. |

The filter object is wrapped in `data`. Mutation responses return both lists.

### Inbound and thread message

**Returned by:** `ListEmailInboxMessages`, `UpdateEmailInboxMessage`, and inside
`GetEmailInboxThread` or `GetEmailThread`.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `id` | UUID | Yes | Telnyx message resource ID used in action paths. |
| `record_type` | enum: `email_message` | Yes | Resource discriminator. |
| `direction` | enum: `inbound`, `outbound` | Yes | Direction; list-inbox messages are inbound, thread detail may interleave both. |
| `status` | string | Yes | `received` for inbound; current send status for outbound. |
| `inbox_id` | UUID | Yes | Inbox owning this thread instance. |
| `thread_id` | UUID | Yes | Thread ID; combine with `inbox_id`. |
| `message_id` | string or null | Yes | RFC `Message-ID`, not the Telnyx path ID. Legacy outbound rows may be null. |
| `in_reply_to` | string or null | Yes | RFC `In-Reply-To`. |
| `references` | string array | Yes | Ordered RFC `Message-ID` values from `References`. |
| `from` | address object | Yes | Object containing `email` and optional `name`. |
| `to` | address array | Yes | To recipients. |
| `cc` | address array | Yes | Cc recipients. |
| `bcc` | address array | Yes | Bcc recipients. |
| `reply_to` | address array | Yes | Reply-To addresses on inbound/thread records. |
| `subject` | string or null | Yes | Message subject. |
| `text_body_url` | URL or null | Yes | Offloaded text body URL when present. Null can mean an inline body existed but is not returned on list reads. |
| `html_body_url` | URL or null | Yes | Offloaded HTML body URL when present. Null can mean an inline body existed but is not returned on list reads. |
| `reply_text` | string or null | Yes | Conservatively extracted new reply content from plain text. Null means extraction input was absent, skipped, or failed. |
| `has_quoted_text` | boolean | Yes | Whether conservative extraction detected a quoted tail; false is not proof no quoted content exists. |
| `headers` | object | Yes | Parsed header map. Treat unrecognized keys as untrusted input. |
| `inline_files` | object array | Yes | Inline-file metadata. |
| `attachments` | object array | Yes | Stored attachment metadata. |
| `labels` | string array | Yes | Mutable mailbox state; always empty for outbound thread entries. Mutation is not yet available. |
| `read_at` | date-time or null | Yes | Null means unread. |
| `received_at` | date-time or null | Yes | Receipt time for inbound; null for outbound. |
| `sent_at` | date-time or null | Yes | Send acceptance/creation time for outbound; null for inbound. |
| `created_at` | date-time | Yes | Persistence timestamp. |
| `updated_at` | date-time | Yes | Last update timestamp. |

Do not infer that `text_body_url: null` or `html_body_url: null` means the original MIME
part was empty. The list schema explicitly allows an inline body to have existed without
returning it on list reads.

### Thread summary

**Returned by:** `ListEmailInboxThreads`, `ListEmailThreads`, `GetEmailInboxThread`, and
`GetEmailThread`.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `id` | UUID | Yes | Thread ID; only unique together with `inbox_id`. |
| `record_type` | enum: `email_thread` | Yes | Resource discriminator. |
| `inbox_id` | UUID | Yes | Inbox half of composite identity. |
| `subject` | string or null | Yes | Thread subject. |
| `preview` | string or null | Yes | Up to 200 characters. |
| `message_count` | integer >= 1 | Yes | Total inbound and outbound messages. |
| `unread_count` | integer >= 0 | Yes | Unread inbound messages; outbound does not increment this value. |
| `last_message_id` | UUID | Yes | Most recent Telnyx message resource ID. |
| `last_message_at` | date-time | Yes | Time of most recent message. |
| `created_at` | date-time | Yes | Thread creation time. |
| `updated_at` | date-time | Yes | Thread update time. |
| `labels` | string array | Yes | Mutable thread labels, independent of message labels; mutation is not yet available. |

Detail responses extend the summary with `messages`, a chronological array of thread
message objects, and return pagination in the top-level `meta` object.

### Reply, reply-all, and forward action response

All three actions return `202 Accepted` with a created outbound email message in `.data`.
Important fields are `.data.id`, `.data.status`, `.data.from`, `.data.to`, `.data.cc`,
`.data.bcc`, `.data.subject`, and `.data.created_at`. The subject is derived with `Re:`
or `Fwd:` and the initial status is commonly queued. An optional `.suppressed[]` lists
recipients removed when at least one recipient remains, including destination, reason,
scope, and whether override is allowed. Complete suppression returns `422` instead.

`X-Telnyx-Reputation-Warning: warn` may accompany acceptance; sending continues under
reduced limits, so record the warning without treating the request as failed.

### Pagination metadata

Inbox list metadata:

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `page_size` | integer 1-250 | Yes | Effective page size. |
| `page_cursor` | string | No | Cursor for the next page. |

Message and thread metadata:

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `page_size` | integer 1-100 | Yes | Effective page size. |
| `page_cursor` | string | No | Cursor for the next page or next detail-message page. |

Cursor absence means traversal is complete. Treat cursors as opaque; do not decode,
modify, compare, or persist them as resource identifiers.

## Pagination and Ordering

- Inbox list order is newest first and stable across cursor pages.
- Inbox message list order is newest first and supports filters plus a stable cursor.
- Inbox and account-wide thread summary lists are newest first.
- Thread detail messages are interleaved inbound/outbound in chronological order.
- A thread detail cursor paginates the `messages` collection, not the thread summary.
- Continue with the same resource/filter set through a cursor chain; changing filters can
  invalidate coverage assumptions.
- Stop when `meta.page_cursor` is absent.

## Webhook Guidance

### `email.received`

The `email.received` webhook fires when a message arrives in an inbox. The payload includes event metadata and message content. See the Telnyx webhook documentation for the full payload format.

Telnyx retries webhook deliveries on timeout or non-2xx responses. Keep your endpoint idempotent — the same event may be delivered multiple times. Return 2xx within 10 seconds to acknowledge receipt.

### Ed25519 verification

Telnyx email webhooks use the same Ed25519 verification model as outbound email
webhooks. Required request headers are:

| Header | Meaning |
|--------|---------|
| `telnyx-signature-ed25519` | Base64-encoded asymmetric signature. |
| `telnyx-timestamp` | Unix timestamp included in signed webhook verification and replay checks. |

Verify against the exact raw request body bytes before JSON parsing. Do not use an HMAC
implementation and do not verify a reserialized JSON object. Reject timestamps outside
your replay window (commonly five minutes), then deduplicate using the event identifier
from the documented payload. Return 2xx quickly and move message processing to an
idempotent asynchronous worker.

## Error Behavior

Most failures return `.errors[]` entries with `code`, `title`, `detail`, and sometimes
`source.pointer`. Branch on status/code, not human-readable wording.

| Status | Inbound email meaning |
|--------|-----------------------|
| `400` | Malformed action or missing send prerequisite. |
| `401` | Missing or invalid API key. |
| `403` | Inbox/domain may not send. |
| `404` | Account resource missing/foreign; an action's sending domain can also be unresolved. |
| `422` | Invalid cursor/filter/body/read state, no forward To recipient, or all recipients suppressed. |
| `429` | Rate limit or `reputation_suspended`; reputation suspension needs remediation, not blind retry. |
| `503` | Inbound storage, action, or domain dependency temporarily unavailable. |

Replies require non-whitespace `text` or `html`; forwards require a non-empty `to`.
Partial suppression may return `202` plus `.suppressed[]`, while complete suppression
returns `422 recipient_suppressed`. Retry only transient errors, with bounded exponential
backoff, jitter, and an application idempotency guard.

## Not Yet Available

These operations exist in the OpenAPI specification but are not yet routed through the
API gateway. They will be usable after gateway routes are deployed. No request examples
are provided because callers must not treat them as currently reachable.

- **Drafts (8):** `ListEmailDrafts`, `CreateEmailDraft`, `GetEmailDraft`, `UpdateEmailDraft`, `PatchEmailDraft`, `DeleteEmailDraft`, `SendEmailDraft`, `CreateEmailReplyDraft`.
- **Labels (4):** `AddEmailInboxMessageLabels`, `RemoveEmailInboxMessageLabels`, `AddEmailInboxThreadLabels`, `RemoveEmailInboxThreadLabels`.

Labels may already appear on read responses and may be used as read filters, but their
mutation operations remain unavailable. Labels are mutable mailbox workflow state and
must not be confused with outbound `tags`, which are immutable billing/reporting
attribution.
