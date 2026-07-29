---
name: telnyx-email-suppressions-curl
description: >-
  Manage email suppressions (blocks), import and export suppression lists,
  and manage unsubscribe groups. Use for deliverability compliance and
  bounce handling.
metadata:
  author: telnyx
  product: email
  language: curl
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Email Suppressions - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication and the API base URL
`https://api.telnyx.com/v2`.

## Error Handling

All API calls can fail with network errors, authentication errors (401), or
framework errors (406). List-query validation failures return 400, resource
lookups can return 404, and JSON body validation failures normally return 422.
Inspect the HTTP status and the top-level `.errors` array before continuing:

```bash
response_file=$(mktemp)
status=$(curl --silent --show-error \
  --output "$response_file" \
  --write-out '%{http_code}' \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_blocks")

if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
  printf 'Telnyx API error (HTTP %s):\n' "$status" >&2
  jq . "$response_file" >&2
  rm -f "$response_file"
  exit 1
fi
jq . "$response_file"
rm -f "$response_file"
```

Common statuses are `400` malformed query or import, `401` invalid API key,
`404` resource not found, `409` group still has active suppressions, `413`
import too large, and `422` invalid request attributes. A successful delete may
return `204 No Content`; do not attempt to parse that response as JSON.

## Important Notes

- **Account isolation:** Every lookup is scoped to the authenticated account. A malformed UUID or a UUID owned by another account is reported as 404.
- **Normalized addresses:** Recipient addresses are trimmed and lower-cased. The `from` address on a manual block is also normalized.
- **Pagination:** Most list operations use `page[number]` and `page[size]` (maximum 100). The main block list also supports opaque cursors. Do not combine offset and cursor modes.
- **URL encoding:** Percent-encode an email address placed in a URL path. For example, use `alice%40example.com`, not an untrusted raw string.
- **Idempotency:** Creating a block or adding a group suppression returns 200 when the matching suppression already exists and 201 when a row is created.

## Operational Caveats

- `POST /v2/email_blocks` always creates `reason: manual_block` with `source: manual`. Customers cannot use this endpoint to create `hard_bounce`, `spam_complaint`, or `invalid` suppressions; caller-supplied `reason` and `source` are ignored.
- Scope is server-derived as `account`, `domain`, or `address`, never customer-set: no `domain_id` and no `from` gives `account`; `domain_id` without `from` gives `domain`; a `from` address gives `address` scope.
- `unsubscribe` and `manual_block` are overridable at send time with `ignore_suppression: true`. `hard_bounce`, `spam_complaint`, and `invalid` are not overridable. Bypassing an overridable suppression should be deliberate and auditable.
- Import is asynchronous. `POST /v2/email_blocks/import` returns 202 and a job ID; poll `GET /v2/email_blocks/import/{id}` until `completed` or `failed`. Import behavior for scoped suppressions may vary. Check the import result for the actual scope assigned.
- Export is synchronous and streams CSV directly. It does not create a job.
- Deleting a block is a soft delete: the row remains as a tombstone with `status: removed`. Recreating the same removed suppression reactivates it.
- The `expires_at` field is available for setting an expiration timestamp on suppressions.
- Check both `error_count` and `skipped_count` in the import response for rejected entries.
- A group suppression prevents sending to that address for every campaign that uses the unsubscribe group. It is not an account-wide unsubscribe for campaigns that do not use that group.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, import counters, or CSV
columns.

- Read [references/api-details.md](references/api-details.md) before building pagination, bulk migration, or delete automation.
- Before deciding whether a send may bypass a block, read [suppression semantics](references/api-details.md#suppression-semantics).
- Before importing an exported list, read [CSV export and import](references/api-details.md#csv-export-and-import) and verify the scope assigned by the import result.
- For exhaustive request fields, response fields, status codes, and operation IDs, use [the operation catalog](references/api-details.md#operation-catalog) and [response schemas](references/api-details.md#response-schemas).

## Core Tasks

### List suppressions

Use offset pagination for page-oriented tools or cursor pagination for
sequential traversal without page-number offsets.

`GET /v2/email_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | Offset page, default 1. Do not combine with a cursor. |
| `page[size]` | integer | No | 1-100, default 25. |
| `page[after]` | string | No | Opaque next-page cursor. Exclusive with `page[number]` and `page[before]`. |
| `page[before]` | string | No | Opaque previous-page cursor. Exclusive with `page[number]` and `page[after]`. |
| `sort` | enum | No | `created_at` or `-created_at` (default). |
| `filter[reason]` | enum | No | Exact reason match. |
| `filter[domain_id]` | UUID | No | Exact domain ID match. |
| `filter[created_after]` | date-time | No | Match `created_at > value`. |
| `filter[created_before]` | date-time | No | Match `created_at < value`. |

```bash
curl --get --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[size]=100' \
  --data-urlencode 'filter[reason]=hard_bounce' \
  --data-urlencode 'sort=-created_at' \
  "https://api.telnyx.com/v2/email_blocks"
```

Offset responses expose `.meta.total_pages`; cursor responses expose
`.meta.has_next` and, when another page exists, `.meta.next_cursor`. Pass the
returned cursor unchanged.

### Create a manual suppression

`POST /v2/email_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | Yes | Recipient address; trimmed and lower-cased by the server. |
| `domain_id` | UUID or null | No | Domain context; omit/null for account scope. |
| `from` | string or null | No | Sender context; a value produces address scope. |
| `expires_at` | date-time or null | No | Expiration timestamp for the suppression. |

```bash
curl --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "blocked@example.com"
  }' \
  "https://api.telnyx.com/v2/email_blocks"
```

The response is `.data` with forced `reason: manual_block`, `source: manual`,
a server-derived `scope`, and `status: active`. Do not send `scope`, `group_id`,
`bounce_category`, `dsn_code`, or `meta` to this public operation.

### Export suppressions as CSV

`GET /v2/email_blocks/export`

```bash
curl --get --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Accept: text/csv" \
  --data-urlencode 'filter[created_after]=2026-01-01T00:00:00Z' \
  --output email_blocks_export.csv \
  "https://api.telnyx.com/v2/email_blocks/export"
```

The 200 response is the CSV stream itself. Filters supported by the list
endpoint affect export. Although `sort` and `page[*]` are parsed and invalid
values can return 400, valid values are ignored; export always streams every
matching row ordered by `created_at ASC, id ASC`.

### Start an asynchronous CSV import

`POST /v2/email_blocks/import`

```bash
curl --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Accept: application/json" \
  -F 'file=@email_blocks.csv;type=text/csv' \
  -F 'block_ttl_days=30' \
  "https://api.telnyx.com/v2/email_blocks/import"
```

A valid request returns 202 with `.data.id` and `.data.status` equal to
`pending`. CSV content may not exceed 25 MiB or 250,000 rows. Provider format is
auto-detected as `sendgrid`, `mailgun`, `ses`, or `generic`.
`block_ttl_days` applies only to imported `manual_block` rows.

### Poll an import job

`GET /v2/email_blocks/import/{id}`

```bash
IMPORT_ID="00000000-0000-0000-0000-000000000000"

while :; do
  body=$(curl --silent --show-error \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/email_blocks/import/$IMPORT_ID") || exit 1
  state=$(printf '%s' "$body" | jq -r '.data.status')
  printf 'import status: %s\n' "$state"
  case "$state" in
    completed)
      printf '%s' "$body" | jq '.data | {
        processed_rows, created_count, existing_count,
        skipped_count, error_count, errors
      }'
      break
      ;;
    failed)
      printf '%s' "$body" | jq '.data | {status, failure_reason}' >&2
      exit 1
      ;;
    pending|processing) sleep 2 ;;
    *) printf 'unexpected import status: %s\n' "$state" >&2; exit 1 ;;
  esac
done
```

Completion counters are omitted until status is `completed`; `failure_reason`
is only present on failure. Check both `error_count` and `skipped_count` in the
import response for rejected entries, and inspect `errors` when present.

### Retrieve a suppression

`GET /v2/email_blocks/{id}`

```bash
BLOCK_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_blocks/$BLOCK_ID"
```

Primary response fields are `.data.id`, `.data.to`, `.data.from`,
`.data.domain_id`, `.data.group_id`, `.data.reason`, `.data.source`,
`.data.scope`, `.data.status`, `.data.expires_at`, `.data.created_at`, and
`.data.updated_at`.

### Soft-delete a suppression

`DELETE /v2/email_blocks/{id}`

```bash
BLOCK_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_blocks/$BLOCK_ID"
```

This returns 200 with the tombstone in `.data`; verify
`.data.status == "removed"`. Repeating the delete is idempotent and does not
append another audit event.

### List a suppression's audit events

`GET /v2/email_blocks/{id}/events`

```bash
BLOCK_ID="00000000-0000-0000-0000-000000000000"
curl --get --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[number]=1' \
  --data-urlencode 'page[size]=50' \
  "https://api.telnyx.com/v2/email_blocks/$BLOCK_ID/events"
```

Events are newest first and can be `created`, `removed`, `expired`, or
`override_used`. This endpoint has offset pagination only and a default page
size of 50; it has no filters, sort, or cursor parameters.

### List unsubscribe groups

`GET /v2/email_unsubscribe_groups`

```bash
curl --get --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[number]=1' \
  --data-urlencode 'page[size]=25' \
  "https://api.telnyx.com/v2/email_unsubscribe_groups"
```

Groups use offset pagination only and fixed newest-first ordering.

### Create an unsubscribe group

`POST /v2/email_unsubscribe_groups`

```bash
curl --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product announcements",
    "description": "Optional opt-out category for product email"
  }' \
  "https://api.telnyx.com/v2/email_unsubscribe_groups"
```

`name` is required, non-empty, and at most 255 characters. A successful create
returns 201 and the group in `.data`.

### Retrieve an unsubscribe group

`GET /v2/email_unsubscribe_groups/{id}`

```bash
GROUP_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID"
```

### Update an unsubscribe group

Only `name` and `description` are mutable. This is a partial update; `PUT` is
not routed.

`PATCH /v2/email_unsubscribe_groups/{id}`

```bash
GROUP_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Announcements and release notes"
  }' \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID"
```

### Delete an unsubscribe group

`DELETE /v2/email_unsubscribe_groups/{id}`

```bash
GROUP_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID"
```

A successful delete returns 204. If active group suppressions remain, the
request returns 409. Either remove them first or deliberately force the delete:

```bash
curl --get --silent --show-error \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'force=true' \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID"
```

`force=true` soft-deletes active group suppressions, clears their group links,
appends removal events, and then hard-deletes the group in one transaction.

### List suppressions in a group

`GET /v2/email_unsubscribe_groups/{id}/suppressions`

```bash
GROUP_ID="00000000-0000-0000-0000-000000000000"
curl --get --silent --show-error \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[number]=1' \
  --data-urlencode 'page[size]=100' \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID/suppressions"
```

Rows use the standard email-block shape with `.group_id` set to this group.
This list supports offset pagination only; no filters, sort, or cursor.

### Add a group suppression

`POST /v2/email_unsubscribe_groups/{id}/suppressions`

```bash
GROUP_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "subscriber@example.com"
  }' \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID/suppressions"
```

Only `to` is read. The server forces `reason: unsubscribe`, `source: manual`,
and this group's `group_id`. A duplicate is idempotent and returns 200.

### Remove a group suppression

`DELETE /v2/email_unsubscribe_groups/{id}/suppressions/{email}`

```bash
GROUP_ID="00000000-0000-0000-0000-000000000000"
# The email path segment is percent-encoded.
EMAIL_PATH="subscriber%40example.com"
curl --silent --show-error \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/email_unsubscribe_groups/$GROUP_ID/suppressions/$EMAIL_PATH"
```

A successful removal returns 204 and soft-deletes every active matching row for
the normalized address in that group. A repeat returns 404 because no active
matching group suppression remains.

## Webhooks

Email webhooks are configured at the **domain level**, not on an individual
suppression. Create a subscription with `POST /email_domains/{id}/webhooks`
using the `https://api.telnyx.com/v2` base URL. The suppression-related event
names in the current OpenAPI `EmailWebhookEvent` enum are:

| Event | Use in a suppression workflow |
|-------|-------------------------------|
| `email.bounced` | Process a bounced-delivery outcome. |
| `email.failed` | Process a terminal delivery failure. |
| `email.complained` | Process a recipient complaint. |
| `email.unsubscribed` | Process a recipient unsubscribe action. |

```bash
DOMAIN_ID="00000000-0000-0000-0000-000000000000"
curl --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhooks/email",
    "events": ["email.bounced", "email.failed", "email.complained", "email.unsubscribed"]
  }' \
  "https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/webhooks"
```

### Verify signatures before parsing

Telnyx signs webhook requests with Ed25519. Read the
`telnyx-signature-ed25519` and `telnyx-timestamp` headers, and retain the exact
raw request body bytes. Do **not** parse or re-serialize the JSON before
verification.

1. Reject a missing or malformed timestamp, signature, or body.
2. Reject a timestamp more than 5 minutes outside the server clock.
3. Verify the Ed25519 signature over `telnyx-timestamp + "|" + raw_body` with
   the Telnyx public key. Ed25519 verification is not HMAC validation.
4. Parse the JSON only after the signature and timestamp are valid.

### Deduplicate and acknowledge quickly

- Deduplicate by event ID with an atomic uniqueness check before applying side
  effects. Treat an already-seen event as successfully handled.
- Enqueue slow work and return a `2xx` response within 10 seconds.
- Telnyx retries on timeout or non-2xx. Keep your endpoint idempotent.

## Additional Operations

Use the core tasks above first. All 16 reachable suppression and unsubscribe
group operations are indexed here with their exact HTTP endpoints. Use
[references/api-details.md](references/api-details.md) for full optional
parameters, response schemas, status codes, and operation IDs.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| List suppressions | HTTP only | `GET /email_blocks` | Inspect suppressions or select a block before another action. | None |
| Create a manual suppression | HTTP only | `POST /email_blocks` | Add a manual recipient suppression. | `to` |
| Export suppressions as CSV | HTTP only | `GET /email_blocks/export` | Download matching suppressions as CSV. | None |
| Start a CSV import | HTTP only | `POST /email_blocks/import` | Upload suppressions for asynchronous import. | `file` |
| Poll an import job | HTTP only | `GET /email_blocks/import/{id}` | Check whether an asynchronous import completed or failed. | `id` |
| Retrieve a suppression | HTTP only | `GET /email_blocks/{id}` | Fetch one suppression by ID. | `id` |
| Soft-delete a suppression | HTTP only | `DELETE /email_blocks/{id}` | Remove an existing suppression. | `id` |
| List suppression audit events | HTTP only | `GET /email_blocks/{id}/events` | Inspect the history of one suppression. | `id` |
| List unsubscribe groups | HTTP only | `GET /email_unsubscribe_groups` | Inspect available unsubscribe groups. | None |
| Create an unsubscribe group | HTTP only | `POST /email_unsubscribe_groups` | Create a campaign-level unsubscribe category. | `name` |
| Retrieve an unsubscribe group | HTTP only | `GET /email_unsubscribe_groups/{id}` | Fetch one unsubscribe group by ID. | `id` |
| Update an unsubscribe group | HTTP only | `PATCH /email_unsubscribe_groups/{id}` | Change a group's name or description. | `id` |
| Delete an unsubscribe group | HTTP only | `DELETE /email_unsubscribe_groups/{id}` | Remove an unsubscribe group. | `id` |
| List group suppressions | HTTP only | `GET /email_unsubscribe_groups/{id}/suppressions` | Inspect recipients suppressed in one group. | `id` |
| Add a group suppression | HTTP only | `POST /email_unsubscribe_groups/{id}/suppressions` | Suppress a recipient in one unsubscribe group. | `id`, `to` |
| Remove a group suppression | HTTP only | `DELETE /email_unsubscribe_groups/{id}/suppressions/{email}` | Remove a recipient suppression from one group. | `id`, `email` |

---

For exhaustive parameter behavior, CSV columns and limitations, response
schemas, status codes, and operation IDs, see
[references/api-details.md](references/api-details.md).
