---
name: telnyx-email-inbound-curl
description: >-
  Manage email inboxes, list and search inbound messages, threads, sender
  filters, and reply to or forward messages. Use for building email agents
  that read and respond to incoming email.
metadata:
  author: telnyx
  product: email
  language: curl
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Email Inbound - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
export TELNYX_API_BASE="https://api.telnyx.com/v2"
```

All examples below use `$TELNYX_API_KEY` for authentication. Resource IDs are UUIDs;
store the IDs returned by create and list calls rather than parsing them from email
addresses.

## Error Handling

All API calls can fail with network errors, authentication errors (401), validation
errors (422), temporary service errors (503), or rate limits (429). Capture the HTTP
status separately from the JSON response in production:

```bash
response_file="$(mktemp)"
status="$({ curl -sS \
  -o "$response_file" \
  -w '%{http_code}' \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "$TELNYX_API_BASE/email_inboxes"; } || printf '000')"

if [[ "$status" != "200" ]]; then
  printf 'Telnyx request failed (HTTP %s)\n' "$status" >&2
  jq . "$response_file" >&2 2>/dev/null || true
fi
rm -f "$response_file"
```

Common status codes:

| Status | Meaning | Action |
|--------|---------|--------|
| `400` | Malformed request or send-time prerequisite failure | Fix the request; do not retry unchanged. |
| `401` | Invalid or missing API key | Replace the key and retry. |
| `403` | The account or inbox domain cannot send | Correct permissions or sending-domain configuration. |
| `404` | Resource is missing, deleted, foreign, or the sending domain could not be resolved | Re-list account-scoped resources; do not use the response to infer foreign resource existence. |
| `422` | Validation failed or every action recipient was suppressed | Read `.errors[]` and fix the referenced field. |
| `429` | Rate limited or inbox-domain reputation suspended sending | Honor retry guidance for rate limits; reputation suspension requires remediation. |
| `503` | Inbound storage, actions, or a dependency is unavailable | Retry with bounded exponential backoff and jitter. |

## Important Notes

- **Base path:** The OpenAPI path names are relative to `https://api.telnyx.com/v2`.
- **Authentication:** Send `Authorization: Bearer $TELNYX_API_KEY` on every request.
- **Identifiers:** `inbox_id`, `message_id`, and `thread_id` path parameters are Telnyx UUIDs. A message's RFC `Message-ID` appears separately as the `message_id` response field.
- **Pagination:** Inbox listing uses `page_size` and `page_cursor`. Message and thread listing uses `page[size]` and `page[after]`. Continue with `.meta.page_cursor` until it is absent.
- **Safe query encoding:** Use `curl --get --data-urlencode` for bracketed filters such as `filter[search]`; this avoids shell globbing and preserves spaces.
- **Delete semantics:** Deleting an inbox soft-deletes it, reserves its address, and returns `204` with no response body.

## Operational Caveats

- **Thread identity is composite.** Treat every thread as `(inbox_id, thread_id)`, not as `thread_id` alone. Inbox-scoped routes encode both values in the path. Account-wide `GET /email_threads/{thread_id}` requires `inbox_id` as a query parameter.
- **Labels are not tags.** Labels are mutable mailbox state such as `spam`, `promos`, or `account_alerts`; tags are immutable billing and reporting attribution set when outbound mail is sent. Label mutation routes are not yet available through the gateway.
- **Sender filters are case-insensitive.** Entries are normalized to lowercase. Exact addresses and `@domain.com` domain wildcards are accepted. Blocklist matches beat allowlist matches. Empty or absent lists accept all senders.
- **Reply and forward use the inbox domain.** The action sends from the inbox address through the standard email send pipeline. The inbox must resolve to a valid configured sending domain.
- **Search is PostgreSQL full-text search.** `filter[search]` searches subject, plain-text body, and HTML body; it is not a literal substring filter. Use `filter[from]` or `filter[subject]` for case-insensitive literal substrings.

## Reference Use Rules

Do not invent Telnyx parameters, enums, recipient shapes, response fields, or webhook
fields.

- If a parameter or response field is not shown inline, read [references/api-details.md](references/api-details.md) before writing code.
- Before composing filters or cursor loops, read [request and query parameters](references/api-details.md#request-and-query-parameters).
- Before relying on a message, thread, or action response field, read [response schemas](references/api-details.md#response-schemas).
- Before implementing an inbound handler, read [webhook guidance](references/api-details.md#webhook-guidance) and the Telnyx webhook documentation.

## Core Tasks

### Create an inbox

Create an inbox on an account-owned inbound-enabled domain. Both body fields are
optional: omit `domain_id` to use the shared inbound subdomain and omit `username` to
generate a unique local part.

`POST /email_inboxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | No | Local part, normalized to lowercase; 1-64 characters using letters, digits, dots, hyphens, and underscores. |
| `domain_id` | UUID | No | Account-owned inbound-enabled domain. Omit for the shared inbound subdomain. |

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "support",
    "domain_id": "22222222-2222-2222-2222-222222222222"
  }' \
  "$TELNYX_API_BASE/email_inboxes"
```

Primary response fields: `.data.id`, `.data.address`, `.data.status`,
`.data.domain_id`, `.data.domain`, `.data.created_at`.

### List inboxes

Lists non-deleted inboxes newest first with stable cursor pagination.

`GET /email_inboxes`

```bash
curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page_size=50' \
  "$TELNYX_API_BASE/email_inboxes"

# Next page: pass the previous response's .meta.page_cursor unchanged.
curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page_size=50' \
  --data-urlencode "page_cursor=$PAGE_CURSOR" \
  "$TELNYX_API_BASE/email_inboxes"
```

`page_size` defaults to 20 and accepts 1-250. An absent `.meta.page_cursor` means
there is no next page.

### Get an inbox

`GET /email_inboxes/{id}`

```bash
export INBOX_ID="11111111-1111-1111-1111-111111111111"

curl -sS \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID"
```

Missing, deleted, and foreign inboxes return an opaque `404`.

### Delete an inbox

Soft-delete an inbox. Its address remains reserved, and list/get no longer return it.

`DELETE /email_inboxes/{id}`

```bash
curl -sS \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID"
```

Success is `204 No Content`. Do not attempt to parse a success response body.

### List and search inbound messages

Lists inbound messages newest first. Filters compose with stable cursor pagination.

`GET /email_inboxes/{inbox_id}/messages`

| Query parameter | Behavior |
|-----------------|----------|
| `filter[from]` | Case-insensitive literal substring of sender address. |
| `filter[subject]` | Case-insensitive literal substring of subject. |
| `filter[received_after]` | Inclusive ISO 8601 lower timestamp bound. |
| `filter[received_before]` | Inclusive ISO 8601 upper timestamp bound. |
| `filter[read]` | Filter by presence of a read timestamp. |
| `filter[unread]` | Set `true` for messages with no read timestamp. |
| `filter[label]` | Exact, case-sensitive label filter; label mutation is not yet gateway-routed. |
| `filter[search]` | PostgreSQL full-text query over subject and bodies, maximum 500 characters. |
| `page[size]` | 1-100; defaults to 25. |
| `page[after]` | Opaque cursor from `.meta.page_cursor`. |

```bash
curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'filter[search]=quarterly renewal' \
  --data-urlencode 'filter[unread]=true' \
  --data-urlencode 'filter[received_after]=2026-07-01T00:00:00Z' \
  --data-urlencode 'page[size]=25' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/messages"
```

Each result includes the Telnyx message UUID in `.data[].id`, the RFC header value in
`.data[].message_id`, its `.data[].thread_id`, envelope addresses, body URLs, file
metadata, labels, and read/received timestamps.

### Mark a message read or unread

`PATCH /email_inboxes/{inbox_id}/messages/{message_id}`

Set `read_at` to `true` for server time, an ISO 8601 timestamp for explicit time, or
`null` to mark unread. Repeating the same update is idempotent.

```bash
export MESSAGE_ID="55555555-5555-5555-5555-555555555555"

# Mark read at server time.
curl -sS \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"read_at": true}' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/messages/$MESSAGE_ID"

# Mark unread.
curl -sS \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"read_at": null}' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/messages/$MESSAGE_ID"
```

The response returns the updated inbound message in `.data`.

### Reply to a message

Recipients are derived from the original `Reply-To`, falling back to `From`. Original
Cc recipients are not included. Telnyx adds the `Re:` subject prefix and threading
headers.

`POST /email_inboxes/{inbox_id}/messages/{message_id}/actions/reply`

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Thanks for the update. I will review it today."}' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/messages/$MESSAGE_ID/actions/reply"
```

At least one of `text` or `html` must contain non-whitespace content. Caller-supplied
`to`, `cc`, and `bcc` are ignored. Success is `202`; `.data.id` is the queued outbound
message ID. Inspect optional `.suppressed[]` and the `X-Telnyx-Reputation-Warning`
response header.

### Reply all to a message

The To list starts with original `Reply-To` or `From` and includes original To
recipients; Cc includes original Cc. The inbox address is excluded and recipients are
de-duplicated case-insensitively. Bcc is empty.

`POST /email_inboxes/{inbox_id}/messages/{message_id}/actions/reply_all`

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html": "<p>Everyone, please review the attached update.</p>"}' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/messages/$MESSAGE_ID/actions/reply_all"
```

The body rules, `202` response, suppression behavior, domain requirement, and threading
behavior are the same as reply.

### Forward a message

Supply at least one To recipient. Recipients may be email strings or objects with
`email` and optional `name`. Telnyx prepends optional `text`/`html` notes to a generated
forwarded-message block and applies the `Fwd:` subject prefix.

`POST /email_inboxes/{inbox_id}/messages/{message_id}/actions/forward`

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "owner@example.com", "name": "Account Owner"}],
    "cc": "audit@example.com",
    "bcc": ["archive@example.com"],
    "text": "FYI — please review this inbound request."
  }' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/messages/$MESSAGE_ID/actions/forward"
```

Success is `202`. Partial suppression appears in `.suppressed[]`; if every recipient is
suppressed, the request returns `422` and no message is sent.

### List threads in one inbox

`GET /email_inboxes/{inbox_id}/threads`

```bash
curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[size]=25' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/threads"
```

Thread summaries are newest first and include `.id`, `.inbox_id`, `.subject`,
`.message_count`, `.unread_count`, `.last_message_id`, and `.last_message_at`. Although
`filter[label]` can filter existing labels, label mutation is not yet available.

### Get a thread and its messages in one inbox

Returns inbound and outbound messages interleaved in chronological order. Message pages
are bounded; follow `.meta.page_cursor` with `page[after]`.

`GET /email_inboxes/{inbox_id}/threads/{thread_id}`

```bash
export THREAD_ID="33333333-3333-3333-3333-333333333333"

curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[size]=50' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/threads/$THREAD_ID"
```

Use `.data.messages[].direction` to distinguish inbound and outbound entries. Never use
the thread ID without retaining its inbox ID.

### List threads across the account

Use this for an agent serving multiple inboxes. Omit `filter[inbox_id]` for every inbox,
or repeat it to constrain the account-wide result.

`GET /email_threads`

```bash
curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "filter[inbox_id][]=$INBOX_ID" \
  --data-urlencode "filter[inbox_id][]=22222222-2222-2222-2222-222222222222" \
  --data-urlencode 'page[size]=50' \
  "$TELNYX_API_BASE/email_threads"
```

The filter also accepts a comma-separated inbox list. Foreign inbox IDs are silently
excluded. Route follow-up actions using each row's `.inbox_id` and `.id` pair.

### Get an account-wide thread

The path has only `thread_id`, but the required `inbox_id` query parameter completes the
thread's composite identity.

`GET /email_threads/{thread_id}`

```bash
curl -sS --get \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "inbox_id=$INBOX_ID" \
  --data-urlencode 'page[size]=50' \
  "$TELNYX_API_BASE/email_threads/$THREAD_ID"
```

Omitting `inbox_id` is a validation error. Use `.meta.page_cursor` as `page[after]` to
continue through chronological thread messages.

### List sender filters

`GET /email_inboxes/{inbox_id}/filters`

```bash
curl -sS \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/filters"
```

The current normalized sets are returned in `.data.allowlist` and `.data.blocklist`.
Empty lists mean accept all senders.

### Add sender filter entries

POST performs idempotent set union against one selected list.

`POST /email_inboxes/{inbox_id}/filters`

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "blocklist",
    "entries": ["sender@spam.example", "@bulk.spam.example"]
  }' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/filters"
```

`type` is `allowlist` or `blocklist`. Each list supports up to 500 exact addresses or
`@domain` wildcards. The response contains both resulting lists.

### Replace all sender filters

PUT atomically replaces both lists. **An omitted list is cleared**, so include both keys
when preserving one side.

`PUT /email_inboxes/{inbox_id}/filters`

```bash
curl -sS \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "allowlist": ["trusted@example.com", "@partner.example"],
    "blocklist": ["@spam.example"]
  }' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/filters"
```

If an address matches both lists, blocklist precedence rejects it.

### Remove sender filter entries

DELETE performs idempotent set subtraction from one selected list and still returns the
current filter state when an entry was not present.

`DELETE /email_inboxes/{inbox_id}/filters`

```bash
curl -sS \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "allowlist",
    "entries": ["former-partner@example.com"]
  }' \
  "$TELNYX_API_BASE/email_inboxes/$INBOX_ID/filters"
```

---

## Additional Operations

Use the core tasks above first. All 17 reachable operations are indexed below with their exact HTTP method, endpoint, use case, and required parameters; use [references/api-details.md](references/api-details.md) for complete request parameters and response schemas.
Before using an operation, read [the request and query parameter section](references/api-details.md#request-and-query-parameters) and [the response schema section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create an inbox | HTTP only | `POST /email_inboxes` | Provision an inbound mailbox on a shared or account-owned domain. | None |
| List inboxes | HTTP only | `GET /email_inboxes` | Discover active inboxes and retain their resource IDs. | None |
| Get an inbox | HTTP only | `GET /email_inboxes/{id}` | Fetch one inbox's current state. | `id` |
| Delete an inbox | HTTP only | `DELETE /email_inboxes/{id}` | Soft-delete an inbox while leaving its address reserved. | `id` |
| List inbound messages | HTTP only | `GET /email_inboxes/{inbox_id}/messages` | Search, filter, or page through messages received by one inbox. | `inbox_id` |
| Update an inbound message | HTTP only | `PATCH /email_inboxes/{inbox_id}/messages/{message_id}` | Mark a message read or unread. | `inbox_id`, `message_id`, `read_at` |
| Reply to a message | HTTP only | `POST /email_inboxes/{inbox_id}/messages/{message_id}/actions/reply` | Reply only to the original sender or Reply-To address. | `inbox_id`, `message_id`, one of `text` or `html` |
| Reply all to a message | HTTP only | `POST /email_inboxes/{inbox_id}/messages/{message_id}/actions/reply_all` | Reply to the original sender and the original To/Cc recipients. | `inbox_id`, `message_id`, one of `text` or `html` |
| Forward a message | HTTP only | `POST /email_inboxes/{inbox_id}/messages/{message_id}/actions/forward` | Forward a received message to caller-selected recipients. | `inbox_id`, `message_id`, `to` |
| List threads in an inbox | HTTP only | `GET /email_inboxes/{inbox_id}/threads` | Page through conversation summaries for one inbox. | `inbox_id` |
| Get a thread in an inbox | HTTP only | `GET /email_inboxes/{inbox_id}/threads/{thread_id}` | Fetch one inbox-scoped thread and its message page. | `inbox_id`, `thread_id` |
| List threads across the account | HTTP only | `GET /email_threads` | Discover conversation summaries across all account inboxes. | None |
| Get an account-wide thread | HTTP only | `GET /email_threads/{thread_id}` | Fetch a thread using its composite inbox and thread identity. | `thread_id`, `inbox_id` |
| List sender filters | HTTP only | `GET /email_inboxes/{inbox_id}/filters` | Inspect an inbox's current allowlist and blocklist. | `inbox_id` |
| Add sender filter entries | HTTP only | `POST /email_inboxes/{inbox_id}/filters` | Add addresses or domain wildcards without replacing existing entries. | `inbox_id`, `type`, `entries` |
| Replace sender filters | HTTP only | `PUT /email_inboxes/{inbox_id}/filters` | Atomically replace both sender-filter lists. | `inbox_id` |
| Remove sender filter entries | HTTP only | `DELETE /email_inboxes/{inbox_id}/filters` | Remove addresses or domain wildcards while preserving other entries. | `inbox_id`, `type`, `entries` |

---

## Webhook Verification

Telnyx signs email webhooks with Ed25519. Each request includes
`telnyx-signature-ed25519` and `telnyx-timestamp` headers. Always verify the signature
over the exact raw request body before parsing JSON or processing message content:

```text
1. Read the exact raw HTTP request body bytes.
2. Reject stale telnyx-timestamp values (commonly more than five minutes old).
3. Verify telnyx-signature-ed25519 with the Telnyx public key and SDK webhook helper.
4. Deduplicate by event ID before starting side effects.
5. Return 2xx promptly, then process asynchronously and idempotently.
```

Ed25519 is asymmetric signature verification, not HMAC. Do not reserialize parsed JSON
before verification.

## Webhooks

### Inbound Email Received

The `email.received` webhook fires when a message arrives in an inbox. The payload includes event metadata and message content. See the Telnyx webhook documentation for the full payload format.

Telnyx retries webhook deliveries on timeout or non-2xx responses. Keep your endpoint idempotent — the same event may be delivered multiple times. Return 2xx within 10 seconds to acknowledge receipt.

---

## Not Yet Available

The following operations exist in the OpenAPI specification but are **not yet routed
through the Telnyx API gateway**. They will become available after gateway routes are
deployed. Do not generate curl examples or call these operations yet.

- **Drafts (8):** `ListEmailDrafts`, `CreateEmailDraft`, `GetEmailDraft`, `UpdateEmailDraft`, `PatchEmailDraft`, `DeleteEmailDraft`, `SendEmailDraft`, `CreateEmailReplyDraft`.
- **Labels (4):** `AddEmailInboxMessageLabels`, `RemoveEmailInboxMessageLabels`, `AddEmailInboxThreadLabels`, `RemoveEmailInboxThreadLabels`.

---

For exhaustive parameters, request and response schemas, cursor behavior, action
semantics, and webhook guidance, see [references/api-details.md](references/api-details.md).
