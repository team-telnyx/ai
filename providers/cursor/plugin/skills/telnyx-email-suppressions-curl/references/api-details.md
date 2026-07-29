# Telnyx Email Suppressions API Details

This reference covers the 16 public, reachable email-suppression operations at
`https://api.telnyx.com/v2`. It is the detail layer for the curl examples in
[`../SKILL.md`](../SKILL.md). Email validation is outside this skill.

## Authentication and Conventions

Every request uses bearer authentication:

```bash
-H "Authorization: Bearer $TELNYX_API_KEY"
```

Use `Content-Type: application/json` for JSON request bodies and let curl set
the multipart boundary when using `-F` for an import. Do not manually set a
multipart `Content-Type` header. Successful JSON responses wrap resources in
`.data`; list responses add `.meta`. CSV export is the exception: its response
body is the CSV file itself. Successful group and group-suppression deletes
return 204 with an empty body.

IDs are UUIDs. Malformed IDs, cross-account IDs, and absent resources are
reported as 404 rather than exposing whether another account owns a resource.
Recipient addresses are normalized with trim and lower-case before storage or
matching.

## Operation Catalog

| # | Operation ID | Method and path | Success | Request/response |
|---|--------------|-----------------|---------|------------------|
| 1 | `listEmailBlocks` | `GET /v2/email_blocks` | 200 | JSON list + offset or cursor meta |
| 2 | `createEmailBlock` | `POST /v2/email_blocks` | 201 created; 200 existing/reactivated | JSON block |
| 3 | `exportEmailBlocks` | `GET /v2/email_blocks/export` | 200 | `text/csv` stream |
| 4 | `createEmailBlockImport` | `POST /v2/email_blocks/import` | 202 | multipart request; JSON import job |
| 5 | `showEmailBlockImport` | `GET /v2/email_blocks/import/{id}` | 200 | JSON import job |
| 6 | `showEmailBlock` | `GET /v2/email_blocks/{id}` | 200 | JSON block |
| 7 | `deleteEmailBlock` | `DELETE /v2/email_blocks/{id}` | 200 | JSON block tombstone |
| 8 | `listEmailBlockEvents` | `GET /v2/email_blocks/{id}/events` | 200 | JSON event list + offset meta |
| 9 | `listUnsubscribeGroups` | `GET /v2/email_unsubscribe_groups` | 200 | JSON group list + offset meta |
| 10 | `createUnsubscribeGroup` | `POST /v2/email_unsubscribe_groups` | 201 | JSON group |
| 11 | `showUnsubscribeGroup` | `GET /v2/email_unsubscribe_groups/{id}` | 200 | JSON group |
| 12 | `updateUnsubscribeGroup` | `PATCH /v2/email_unsubscribe_groups/{id}` | 200 | JSON group |
| 13 | `deleteUnsubscribeGroup` | `DELETE /v2/email_unsubscribe_groups/{id}` | 204 | Empty body |
| 14 | `listGroupSuppressions` | `GET /v2/email_unsubscribe_groups/{id}/suppressions` | 200 | JSON block list + offset meta |
| 15 | `addGroupSuppression` | `POST /v2/email_unsubscribe_groups/{id}/suppressions` | 201 created; 200 existing | JSON block |
| 16 | `removeGroupSuppression` | `DELETE /v2/email_unsubscribe_groups/{id}/suppressions/{email}` | 204 | Empty body |

The API server already includes `/v2`; operation paths in the source OpenAPI
are written without that prefix. The full curl URLs must include it.

## Suppression Semantics

### Reasons

| Value | How it is created | Send-time override |
|-------|-------------------|--------------------|
| `hard_bounce` | Delivery/system or supported import | Never overridable |
| `spam_complaint` | Feedback/system or supported import | Never overridable |
| `unsubscribe` | Unsubscribe flow or group-suppression endpoint | Overridable with `ignore_suppression: true` |
| `invalid` | Validation/system or supported import | Never overridable |
| `manual_block` | Public block-create endpoint or import | Overridable with `ignore_suppression: true` |

`POST /v2/email_blocks` cannot directly manufacture system-derived reasons. It
forces `manual_block` and `source: manual` even if a client sends different
values. `POST .../{group_id}/suppressions` forces `unsubscribe`,
`source: manual`, and the path group's ID. The `ignore_suppression` field belongs
to the email-send request, not to suppression creation. Use it only after
checking that the matched reason is overridable.

### Scope

Scope is read-only and server-derived from the block entry:

| Input context | Derived scope | Meaning |
|---------------|---------------|---------|
| `domain_id` absent/null and `from` absent/null | `account` | Applies across the account |
| `domain_id` set and `from` absent/null | `domain` | Applies in that domain context |
| `from` set | `address` | Applies to that sender-address context |

The public create request must not include `scope`. It also does not accept
`group_id`, `bounce_category`, `dsn_code`, or `meta`.

### Source and status enums

A response `source` is one of `feedback`, `manual`, `import`, or `system`.
A response `status` is one of `active`, `expired`, or `removed`. The
`expires_at` field is available for setting an expiration timestamp on
suppressions.

### Idempotency, tombstones, and audit

Manual block creation is deduplicated on the normalized suppression identity.
An already-active match returns 200 rather than creating another row or audit
event. A matching removed tombstone is reactivated rather than duplicated.
New creation returns 201.

`DELETE /v2/email_blocks/{id}` is a soft delete. It sets `status: removed`,
updates `updated_at`, and appends a `removed` audit event. Deleting an already
removed block returns the same row with 200 and does not append a second event.
The audit endpoint returns newest events first using fixed ordering
`occurred_at DESC, id DESC`.

## Query Parameters and Pagination

### Main block list

`GET /v2/email_blocks` has two mutually exclusive pagination modes.

**Offset mode**

| Parameter | Constraints | Default |
|-----------|-------------|---------|
| `page[number]` | integer >= 1 | 1 |
| `page[size]` | integer 1-100 | 25 |

Offset metadata:

```json
{
  "page_number": 1,
  "page_size": 25,
  "total_pages": 4,
  "total_results": 83
}
```

**Cursor mode**

| Parameter | Constraints |
|-----------|-------------|
| `page[after]` | Opaque cursor; cannot combine with `page[number]` or `page[before]` |
| `page[before]` | Opaque cursor; cannot combine with `page[number]` or `page[after]` |
| `page[size]` | integer 1-100, default 25 |

The cursors are opaque. Although the service currently encodes a
`{"created_at","id"}` pair, clients must not decode, alter, or synthesize one.
Use `.meta.next_cursor` only when `.meta.has_next` is true and
`.meta.previous_cursor` only when `.meta.has_previous` is true. Cursor fields
are omitted when their corresponding flag is false.

Cursor metadata:

```json
{
  "page_size": 25,
  "has_next": true,
  "has_previous": false,
  "next_cursor": "opaque-value-from-the-response"
}
```

The block list accepts these additional query parameters:

| Parameter | Values/behavior |
|-----------|-----------------|
| `sort` | `created_at` ascending or `-created_at` descending; default `-created_at`; a `--` prefix is invalid |
| `filter[reason]` | Exact match: `hard_bounce`, `spam_complaint`, `unsubscribe`, `invalid`, or `manual_block` |
| `filter[domain_id]` | Exact UUID match |
| `filter[created_after]` | ISO 8601; strict `created_at > value` |
| `filter[created_before]` | ISO 8601; strict `created_at < value` |

Nil or empty filter values are silently dropped. Use `curl --get` and
`--data-urlencode` so brackets and timestamps are encoded safely.

### Offset-only lists

| Operation | Default page size | Maximum | Fixed ordering |
|-----------|-------------------|---------|----------------|
| Block audit events | 50 | 100 | `occurred_at DESC, id DESC` |
| Unsubscribe groups | 25 | 100 | `created_at DESC, id DESC` |
| Suppressions in a group | 25 | 100 | `created_at DESC, id DESC` |

These operations accept `page[number]` and `page[size]` only. They do not
support filters, custom sort, or cursors. A flat `?page=1` is malformed; use
`?page[number]=1`.

## Request Schemas

### CreateEmailBlockRequest

Used by `POST /v2/email_blocks`.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `to` | string | Yes | Recipient; normalized with trim + lower-case |
| `domain_id` | UUID or null | No | Null/omitted contributes to account scope |
| `from` | string or null | No | Normalized sender; set for address scope |
| `expires_at` | ISO 8601 date-time or null | No | Expiration timestamp for the suppression |

Caller-supplied `reason` and `source` are ignored. `scope` is derived. The
public surface does not accept `bounce_category`, `dsn_code`, `meta`, or
`group_id`.

### CreateImportRequest

Used by `POST /v2/email_blocks/import` as `multipart/form-data`.

| Part | Type | Required | Rules |
|------|------|----------|-------|
| `file` | binary CSV upload | Yes | Decoded content <= 25 MiB; <= 250,000 rows |
| `block_ttl_days` | integer >= 1 | No | Default 30; applies only to imported `manual_block` rows |

A missing/non-upload `file`, header-only file, all-blank file, or format whose
provider cannot be detected returns 400. Invalid or missing
`block_ttl_days` falls back to 30. Do not send this endpoint JSON.

### CreateUnsubscribeGroupRequest

Used by `POST /v2/email_unsubscribe_groups`.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | 1-255 characters |
| `description` | string or null | No | Optional group description |

### UpdateUnsubscribeGroupRequest

Used by `PATCH /v2/email_unsubscribe_groups/{id}`. It is a partial body with
optional `name` (1-255 characters) and `description` (string or null). `id` and
`account_id` are immutable. `PUT` is not routed.

### AddGroupSuppressionRequest

Used by `POST /v2/email_unsubscribe_groups/{id}/suppressions`.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `to` | string | Yes | Only body field read by the server |

All other fields are ignored. The path group supplies `group_id`; the server
forces `reason: unsubscribe` and `source: manual`.

## CSV Export and Import

### Export contract

`GET /v2/email_blocks/export` responds immediately with:

- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="email_blocks_export.csv"`
- A chunked, server-side cursor stream; the complete result is not materialized

The exact column order is:

```text
id,to,from,reason,source,scope,status,domain_id,created_at,updated_at,expires_at,group_id
```

The same four filters as the list endpoint affect output:
`filter[reason]`, `filter[domain_id]`, `filter[created_after]`, and
`filter[created_before]`. The endpoint parses `sort`, `page[number]`, and
`page[size]`, so malformed values still cause 400, but valid values do not
change the export. Every matching row is streamed in
`created_at ASC, id ASC` order with no pagination.

### Import lifecycle

Import is asynchronous:

1. Upload a CSV with `POST /v2/email_blocks/import`.
2. Require HTTP 202 and save `.data.id` durably.
3. Poll `GET /v2/email_blocks/import/{id}` with bounded backoff.
4. Continue for `pending` or `processing`.
5. On `completed`, inspect all counts and the `errors` map.
6. On `failed`, capture `failure_reason` and stop.

The worker lifecycle is `pending -> processing -> completed | failed`. The
worker can attempt the job up to three times. Provider detection is based on
the CSV header and can identify `sendgrid`, `mailgun`, `ses`, or `generic`.

Upload limits have two separate 413 paths:

- Decoded CSV above 25 MiB or more than 250,000 rows produces a content-level
  error, code `10015`, with `source.pointer: "/file"`.
- An encoded multipart body above 26 MiB can be rejected earlier by the parser
  with a framework 413 response.

### Import scope

Import behavior for scoped suppressions may vary. Check the import result for
the actual scope assigned. `block_ttl_days` sets the requested TTL for imported
rows when provided.

### Import job fields and counters

Base fields are visible immediately: `id`, `record_type`, `status`, `total`,
`created_at`, and `updated_at`. `provider` is omitted while unknown.
`completed_at` is omitted until terminal success.

These counters appear only for a completed job:

| Field | Meaning |
|-------|---------|
| `processed_rows` | Data rows the worker processed |
| `created_count` | New suppressions created |
| `existing_count` | Rows matching existing suppressions |
| `skipped_count` | Rejected/skipped rows |
| `error_count` | Import errors reported for the completed job |
| `errors` | Map of CSV row number to rejection reason; omitted when empty |

`failure_reason` is present only on terminal failure. Check both `error_count`
and `skipped_count` in the import response for rejected entries, and inspect
`errors` when present.

## Unsubscribe Group Behavior

A group models a campaign-level unsubscribe category. An active suppression in
a group prevents sending to that normalized recipient for any campaign that
uses the group. It does not automatically block campaigns that use another
group or no group.

Group create returns 201. Group retrieval and update return 200. The group
response always includes `description`, with JSON `null` when unset.

Deleting a group has two modes:

- Without `force=true`, a group with no active suppressions is hard-deleted and
  returns 204. A group with active suppressions returns 409.
- With `force=true`, all active suppressions are soft-deleted, their `group_id`
  values are cleared, one `removed` audit event is emitted per block, and the
  group is hard-deleted in the same transaction. Only boolean `true` or the
  exact query string `"true"` is truthy; other values act as false.

Removing one recipient uses
`DELETE /v2/email_unsubscribe_groups/{id}/suppressions/{email}`. The email path
segment is trimmed and lower-cased for matching, but clients must still
percent-encode it. The operation soft-deletes all active matching blocks in the
group and returns 204. It has two distinct 404 cases:

- Group absent/cross-account: `The requested unsubscribe group was not found`.
- Group exists but has no active match: `The requested group suppression was not found`.

Repeating a successful removal therefore returns 404, not 204.

## Response Schemas

### EmailBlockResponse

Single-resource operations return:

```json
{
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "record_type": "email_block",
    "to": "blocked@example.com",
    "from": null,
    "domain_id": null,
    "group_id": null,
    "reason": "manual_block",
    "source": "manual",
    "scope": "account",
    "status": "active",
    "expires_at": null,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
}
```

Required block fields are `id`, `record_type`, `to`, `reason`, `source`,
`scope`, `status`, `created_at`, and `updated_at`. `from`, `domain_id`,
`group_id`, and `expires_at` are nullable/contextual. Internal fields
`account_id`, `bounce_category`, `dsn_code`, and `meta` are hidden by the
public response view.

### Email block list

Both list modes return `.data` as an array of the standard block shape. Offset
mode uses offset metadata; cursor mode uses cursor metadata. A group
suppression list also returns standard block objects, with each row's
`group_id` equal to the requested group, plus offset metadata.

### EmailBlockEventListResponse

Each `.data[]` event has:

| Field | Type/values |
|-------|-------------|
| `id` | UUID |
| `record_type` | `email_block_event` |
| `event_type` | `created`, `removed`, `expired`, or `override_used` |
| `reason` | Free-text snapshot at event time |
| `source` | Free-text snapshot at event time |
| `actor` | Free text such as `user_id`, `org_id`, `api_key`, `dev_bypass`, `system`, or `manual` |
| `meta` | Object or null; contextual |
| `occurred_at` | ISO 8601 date-time |

The response includes offset `.meta` with `page_number`, `page_size`,
`total_pages`, and `total_results`.

### EmailBlockImportResponse

The wrapper is `{ "data": <import job> }`. Job status is one of `pending`,
`processing`, `completed`, or `failed`; `record_type` is
`email_block_import`. See [import job fields and counters](#import-job-fields-and-counters)
for conditional fields.

### UnsubscribeGroupResponse

A group contains `id`, `record_type: email_unsubscribe_group`, `name`,
`description` (always present, possibly null), `created_at`, and `updated_at`.
Group lists return an array of this shape and offset `.meta`.

## Error Schema and Status Matrix

Structured errors use:

```json
{
  "errors": [
    {
      "code": "10015",
      "title": "Validation Failed",
      "detail": "Human-readable detail",
      "source": {"pointer": "/field"}
    }
  ]
}
```

`source` is contextual and may be absent. Common codes include `10001` not
found, `10007` unauthorized, `10015` validation failed, `10019` import-create
fallback, `40901` conflict, and `500` framework/catch-all.

| Status | Relevant operations | Meaning/action |
|--------|---------------------|----------------|
| 200 | Reads, updates, block delete, idempotent creates | Parse JSON `.data` or list |
| 201 | New manual block, group, or group suppression | Resource created |
| 202 | Import create | Save job ID and poll; work is not complete |
| 204 | Group delete or group-suppression removal | Success with no JSON body |
| 400 | Query parsing and invalid import content/format | Correct query shape or CSV |
| 401 | All | Replace/fix bearer API key |
| 404 | ID/path resource operations | Invalid, absent, or cross-account resource |
| 406 | Framework/content-negotiation path | Inspect structured framework error |
| 409 | Group delete without force | Remove active suppressions or intentionally force |
| 413 | Import create | Reduce decoded CSV/row count or multipart body size |
| 422 | Mutation validation | Correct request fields; inspect error pointers |
| 500 | Import-create fallback | Record request context and retry/escalate safely |

Changeset/JSON pointers generally use `/data/attributes/<field>`; query errors
use `/<field>`. Do not branch only on the human-readable `detail`; prefer HTTP
status plus stable `code` and `source.pointer` when available.

## Verification Checklist

- [ ] The curl URL includes `/v2` and bearer authentication.
- [ ] JSON mutations set `Content-Type: application/json`; import uses curl `-F` without a manual multipart boundary.
- [ ] Manual block code does not attempt to set a system reason or caller-defined scope.
- [ ] Pagination uses either offset or cursor mode, never both.
- [ ] Export code handles raw CSV rather than expecting `.data` or an async job.
- [ ] Import code requires 202, persists the job ID, and polls through a terminal status.
- [ ] Import completion checks both `error_count` and `skipped_count`, plus `errors` when present.
- [ ] Import automation verifies the actual scope assigned to imported suppressions.
- [ ] Block delete verifies a 200 tombstone; group deletes and group suppression removal expect 204.
- [ ] Forced group deletion is explicit and accepted only after understanding its suppression side effects.
- [ ] Email path segments are percent-encoded.
- [ ] No email-validation operations were added to the suppression workflow.
