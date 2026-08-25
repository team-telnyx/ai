# Email Domains (curl) — API Details

This reference covers all 13 reachable Telnyx Email Domains operations. Paths
include `/v2` and use the `https://api.telnyx.com/v2` server.

## Table of Contents

- [Authentication and conventions](#authentication-and-conventions)
- [Operation matrix](#operation-matrix)
- [List query parameters](#list-query-parameters)
- [Request schemas](#request-schemas)
- [Response schemas](#response-schemas)
- [DNS and verification semantics](#dns-and-verification-semantics)
- [Webhook event allowlist](#webhook-event-allowlist)
- [Errors and retry behavior](#errors-and-retry-behavior)

## Authentication and Conventions

Set the API base and authenticate every request with a Bearer API key:

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
export TELNYX_API_BASE="https://api.telnyx.com/v2"
```

Requests with a JSON body use `Content-Type: application/json`. All identifiers
in path parameters are UUID strings. On nested webhook routes, `{id}` is the
webhook UUID and `{domain_id}` is its parent domain UUID. Single-resource
responses use `{ "data": {...} }`. List responses use
`{ "data": [...], "meta": {...} }`, except the DNS-record list, which has
`data` without pagination metadata. Errors use `{ "errors": [...] }`.

## Operation Matrix

### Domains (6 operations)

| Operation ID | Method and path | Request | Success | Documented errors |
|--------------|-----------------|---------|---------|-------------------|
| `listEmailDomains` | `GET /v2/email_domains` | Query parameters | `200` `EmailDomainListResponse` | `400`, `500` |
| `createEmailDomain` | `POST /v2/email_domains` | `CreateEmailDomainRequest` | `201` `EmailDomainResponse` | `422`, `500` |
| `getEmailDomain` | `GET /v2/email_domains/{id}` | Domain UUID | `200` `EmailDomainResponse` | `404`, `500` |
| `updateEmailDomain` | `PATCH /v2/email_domains/{id}` | `UpdateEmailDomainRequest` | `200` `EmailDomainResponse` | `403`, `404`, `422`, `500` |
| `deleteEmailDomain` | `DELETE /v2/email_domains/{id}` | Optional `force` query | `200` `EmailDomainResponse` | `403`, `404`, `422`, `500` |
| `getEmailDomainHealth` | `GET /v2/email_domains/{id}/health` | Domain UUID | `200` `EmailDomainHealthResponse` | `404`, `500` |

### DNS records (2 operations)

| Operation ID | Method and path | Request | Success | Documented errors |
|--------------|-----------------|---------|---------|-------------------|
| `listEmailDomainDnsRecords` | `GET /v2/email_domains/{domain_id}/dns_records` | Domain UUID | `200` `DNSRecordListResponse` | `404`, `500` |
| `verifyEmailDomainDnsRecords` | `POST /v2/email_domains/{domain_id}/verify` | No body | `200` `EmailDomainResponse` | `403`, `404`, `422`, `500` |

There are no customer-facing CRUD routes for individual generated DNS records.
Publish records at the authoritative DNS provider and trigger verification here.

### Domain webhooks (5 operations)

| Operation ID | Method and path | Request | Success | Documented errors |
|--------------|-----------------|---------|---------|-------------------|
| `listEmailDomainWebhooks` | `GET /v2/email_domains/{domain_id}/webhooks` | Query parameters | `200` `EmailWebhookListResponse` | `404`, `500` |
| `createEmailDomainWebhook` | `POST /v2/email_domains/{domain_id}/webhooks` | `CreateEmailWebhookRequest` | `201` `EmailWebhookResponse` | `404`, `422`, `500` |
| `getEmailDomainWebhook` | `GET /v2/email_domains/{domain_id}/webhooks/{id}` | Domain + webhook UUIDs | `200` `EmailWebhookResponse` | `404`, `500` |
| `updateEmailDomainWebhook` | `PATCH /v2/email_domains/{domain_id}/webhooks/{id}` | `UpdateEmailWebhookRequest` | `200` `EmailWebhookResponse` | `404`, `422`, `500` |
| `deleteEmailDomainWebhook` | `DELETE /v2/email_domains/{domain_id}/webhooks/{id}` | Domain + webhook UUIDs | `200` `EmailWebhookResponse` | `404`, `500` |

A webhook is bound to the domain in its route; `domain_id` is not mutable.
Create requires a URL and at least one allowlisted event. Update may change the
URL, the event list, or both. Delete returns the deleted webhook in `data`.

## List Query Parameters

### `GET /v2/email_domains`

| Parameter | Type | Default/constraints | Meaning |
|-----------|------|---------------------|---------|
| `page[number]` | integer | Default `1`, minimum `1` | Offset page number. |
| `page[size]` | integer | Default `25`, range `1..100` | Number of records. |
| `page[after]` | string | Opaque cursor | Fetch records after the cursor. |
| `page[before]` | string | Opaque cursor | Fetch records before the cursor. |
| `sort` | enum | `created_at`, `-created_at`, `domain`, `-domain` | Leading `-` means descending. |
| `filter[status]` | enum | See domain statuses | Exact status. |
| `filter[domain]` | string | — | Case-insensitive partial domain match. |
| `filter[profile_id]` | UUID | — | Filter by profile UUID. |
| `filter[type]` | enum | `custom`, `shared`, `shared_inbound` | Domain type. |
| `filter[usable_for_sending]` | boolean | — | Sending usability. |
| `filter[usable_for_inbound]` | boolean | — | Inbound usability. |

Domain lists can return offset metadata or cursor metadata. Use offset pagination
with `page[number]`; use cursor pagination with `page[after]` or `page[before]`.
Treat cursors as opaque and follow `next_cursor`/`previous_cursor` from the
response rather than constructing them.

### `GET /v2/email_domains/{domain_id}/webhooks`

| Parameter | Type | Default/constraints | Meaning |
|-----------|------|---------------------|---------|
| `page[number]` | integer | Default `1`, minimum `1` | Offset page number. |
| `page[size]` | integer | Default `25`, range `1..100` | Number of records. |
| `sort` | enum | `created_at`, `-created_at` | Leading `-` means descending. |

Webhook lists use offset pagination only.

### `DELETE /v2/email_domains/{id}`

| Parameter | Type | Default | Meaning |
|-----------|------|---------|---------|
| `force` | boolean | `false` | Must be `true` to delete a verified domain. |

## Request Schemas

### `CreateEmailDomainRequest`

Only `domain` is required.

| Field | Type | Required | Constraints and behavior |
|-------|------|----------|--------------------------|
| `domain` | string | Yes | Custom domain name, e.g. `example.com`. |
| `inbound_enabled` | boolean | No | Defaults to `false`; enables inbound routing. |
| `dmarc_policy` | object \| null | No | Omit/null for advisory default `v=DMARC1; p=none; rua=mailto:dmarc@telnyx.com`. |
| `tracking` | object | No | Domain tracking defaults. |

### `UpdateEmailDomainRequest`

All fields are optional, but send at least the field to change. `domain` and
`type` are not accepted.

| Field | Type | Behavior |
|-------|------|----------|
| `inbound_enabled` | boolean | Enable/disable inbound routing. |
| `dmarc_policy` | object \| null | Rebuilds recommended `_dmarc` TXT and resets its verification to `pending`. |
| `tracking` | object | Changes domain defaults for future sends unless overridden per send. |

### `EmailDMARCPolicy`

| Field | Type | Default/constraints | Meaning |
|-------|------|---------------------|---------|
| `p` | enum | `none` (default), `quarantine`, `reject` | Policy for failed alignment. |
| `pct` | integer | Default `100`, range `0..100` | Percentage subject to policy; omitted from DNS value at 100. |
| `rua` | string \| null | Telnyx advisory address when absent; null omits | Aggregate report URI. |
| `sp` | enum \| null | `none`, `quarantine`, `reject` | Subdomain policy; omitted when null. |

DMARC is advisory in this contract and does not by itself block sending.

### `DomainsTrackingSettings`

| Field | Type | OpenAPI default | Meaning |
|-------|------|-----------------|---------|
| `open_tracking` | boolean | `false` | Inject an HTML tracking pixel. |
| `click_tracking` | boolean | `false` | Rewrite HTML links through tracking redirect. |
| `unsubscribe_tracking` | boolean | `true` | Add RFC 8058 one-click unsubscribe headers. |

These are domain-level defaults. Per-send overrides are available in the email
send request; they do not mutate domain settings.

### `CreateEmailWebhookRequest`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `url` | URI string | Yes | HTTPS delivery endpoint. |
| `events` | array of `EmailWebhookEvent` | Yes | Minimum 1; exact allowlist; no default-to-all. |

### `UpdateEmailWebhookRequest`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `url` | URI string | No | New delivery endpoint. |
| `events` | array of `EmailWebhookEvent` | No | Minimum 1 when present; replaces desired allowlist. |

`domain_id`, webhook `id`, timestamps, and `record_type` are response-only.

## Response Schemas

### `EmailDomainResponse` / `EmailDomain`

Single-domain create, get, update, delete, and verify responses wrap an
`EmailDomain` in `data`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data.id` | UUID | Yes | Domain resource ID. |
| `data.record_type` | enum `email_domain` | Yes | Resource discriminator. |
| `data.domain` | string | Yes | Domain name. |
| `data.type` | enum | Yes | `custom`, `shared`, `shared_inbound`. |
| `data.status` | enum | Yes | `pending`, `verifying`, `verified`, `failed`, `degraded`, `suspended`. |
| `data.usable_for_sending` | boolean | Yes | Gate for sending readiness. |
| `data.usable_for_inbound` | boolean | Yes | Gate for inbound readiness. |
| `data.verification` | object | Yes | Ownership/SPF/DKIM/DMARC/MX summary. |
| `data.dns_records` | array of `DNSRecord` | Yes | Generated records and their current statuses. |
| `data.dkim` | object | Yes | Selector/key metadata and active state. |
| `data.inbound` | object | Yes | Inbound configuration. |
| `data.dmarc_policy` | object \| null | Yes | Customer policy or advisory default behavior. |
| `data.tracking` | object | Yes | Domain tracking defaults. |
| `data.created_at` | date-time | Yes | Creation timestamp. |
| `data.updated_at` | date-time | Yes | Last update timestamp. |
| `data.verified_at` | date-time \| null | No | Verification timestamp. |
| `data.reputation` | object | No | `band`, arbitrary `breakdown`, nullable `computed_at`. |

#### Domain status enum

`pending`, `verifying`, `verified`, `failed`, `degraded`, `suspended`.

#### `verification`

| Field | Allowed values |
|-------|----------------|
| `ownership` | `pending`, `verified`, `not_required` |
| `spf` | `missing_optional`, `verified`, `failed`, `not_required` |
| `dkim` | `pending`, `verified`, `failed` |
| `dmarc` | `missing_optional`, `verified`, `failed` |
| `mx` | `not_required`, `pending`, `verified`, `failed` |

#### `dkim`

| Field | Type | Notes |
|-------|------|-------|
| `selector` | string \| null | Publish the selector returned by the API. |
| `algorithm` | enum `rsa-sha256` \| null | Nullable before configuration. |
| `key_length` | enum `2048` \| null | Nullable before configuration. |
| `active` | boolean | Whether DKIM is active. |
| `rotated_at` | date-time \| null | Rotation timestamp; no public rotation operation is exposed here. |

#### `inbound`

| Field | Type | Meaning |
|-------|------|---------|
| `enabled` | boolean | Inbound routing setting. |
| `catch_all` | boolean | Catch-all status. |
| `mx_required` | boolean | Whether MX is required for inbound usability. |

### `EmailDomainListResponse`

The response contains an `EmailDomain` array in `data`. Offset metadata has
`page_number`, `page_size`, `total_pages`, and `total_results`; cursor metadata
has `page_size`, nullable `next_cursor`/`previous_cursor`, `has_next`, and
`has_previous`.

### `DNSRecordListResponse` / `DNSRecord`

The response is `{ "data": [DNSRecord, ...] }` with no pagination metadata.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | Yes | DNS record resource ID. |
| `purpose` | enum | Yes | `ownership`, `spf`, `dkim`, `dmarc`, `mx`. |
| `record_type` | enum | Yes | Current schema: `TXT`, `MX`. |
| `host` | string | Yes | DNS owner/name to publish. |
| `value` | string | Yes | Expected value. |
| `actual_value` | string \| null | No | Value observed during verification. |
| `priority` | integer \| null | No | MX priority when relevant. |
| `required` | boolean | Yes | Whether this record gates configured capability. |
| `status` | enum | Yes | `pending`, `verified`, `failed`, `not_required`. |

### `EmailDomainHealthResponse` / `EmailDomainHealth`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data.id` | UUID | Yes | Domain ID. |
| `data.record_type` | enum `email_domain_health` | Yes | Health resource discriminator. |
| `data.status` | domain status enum | Yes | Current aggregate status. |
| `data.usable_for_sending` | boolean | Yes | Whether sending is currently usable. |
| `data.usable_for_inbound` | boolean | Yes | Whether inbound is currently usable. |
| `data.verification` | verification object | Yes | Current authentication summary. |
| `data.checked_at` | date-time | Yes | Last health-check timestamp. |

### `EmailWebhookResponse` / `EmailWebhook`

Create/get/update/delete wrap the webhook in `data`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data.id` | UUID | Yes | Webhook ID. |
| `data.record_type` | enum `email_webhook` | Yes | Resource discriminator. |
| `data.url` | URI string | Yes | HTTPS endpoint. |
| `data.events` | array of event enums | Yes | Non-empty explicit subscription allowlist. |
| `data.domain_id` | UUID | Yes | Immutable parent domain. |
| `data.created_at` | date-time | Yes | Creation time. |
| `data.updated_at` | date-time | Yes | Update time. |

### `EmailWebhookListResponse`

Webhook lists return `data` plus offset metadata (`page_number`, `page_size`,
`total_pages`, `total_results`), not cursor metadata.

## DNS and Verification Semantics

### Expected authentication/routing records

The OpenAPI `DNSRecord` enum models purposes `ownership`, `spf`, `dkim`, `dmarc`,
and `mx`, with record types `TXT` and `MX`. In general, SPF, DKIM, and DMARC
records support authentication, while MX records support inbound routing when
required.

Call `GET /v2/email_domains/{domain_id}/dns_records` to retrieve the exact DNS
records you need to publish. The response includes the record type, host, value,
and priority for each record. Publish every returned required record exactly as
provided; do not construct selectors, targets, hosts, or values from examples.

### Verification procedure

1. Create the custom domain and record its `.data.id`.
2. GET `/v2/email_domains/{domain_id}/dns_records`.
3. Publish exact `host`, `value`, type, and priority values at the DNS provider.
4. Wait for propagation; query authoritative DNS outside this API if needed.
5. POST `/v2/email_domains/{domain_id}/verify` with no body.
6. Inspect the returned domain's `verification` and `dns_records` statuses.
7. GET `/v2/email_domains/{id}/health`; require the relevant usability boolean.
8. Back off before another verification attempt if values remain pending/failed.

A verification request returning `200` means the verification pass completed and
the response contains the latest results. It does not mean all checks are
`verified`. DMARC and SPF can report `missing_optional`; MX can report
`not_required`, depending on configuration. Use each record's `required` flag
and the health booleans.

### Shared versus custom

Telnyx-managed shared infrastructure is pre-provisioned; custom domains require
DNS verification. Non-owners can read shared domains but cannot update, verify,
or delete them (`403`, code `10008`). No DKIM rotation endpoint is exposed in
these 13 operations.

## Webhook Event Allowlist

Webhooks are configured at the domain level. This differs from Telnyx Messaging,
where a send may carry `webhook_url`. `events` is an explicit allowlist with at
least one item; there is no “all” wildcard and no omitted-field default.

### Current OpenAPI `EmailWebhookEvent` values

| Category | Exact subscribable values |
|----------|---------------------------|
| Outbound lifecycle | `email.scheduled`, `email.sandbox`, `email.queued`, `email.sending`, `email.sent`, `email.delivered`, `email.deferred`, `email.bounced`, `email.failed` |
| Engagement/suppression | `email.complained`, `email.opened`, `email.clicked`, `email.unsubscribed` |
| Inbound | `email.received` |
| Domain lifecycle | `email_domain.created`, `email_domain.verified`, `email_domain.degraded`, `email_domain.suspended`, `email_domain.deleted` |

The schema states that an event not in this allowlist cannot be subscribed to and
is silently dropped. Use exact case and punctuation.

### Product taxonomy discrepancy

Product-level domain-event guidance also names `email_domain.failed` and
`email_validation.completed`, but neither is present in the current OpenAPI
subscription enum. Because the OpenAPI spec is the source of truth for request
construction, do not send these names until they are added to
`EmailWebhookEvent` in the current API contract.

`daily_limit_exceeded` and `cancelled` are pollable only and are not domain
webhook subscription values. Poll the relevant email-message/status APIs rather
than attempting to add them to a domain webhook.

PATCH replaces the event list, so send the full desired set and verify returned
`.data.events`/`.data.domain_id`.

### Delivery verification and retries

Telnyx signs webhook deliveries with Ed25519. Preserve the raw request body and
verify it with the `telnyx-signature-ed25519` and `telnyx-timestamp` headers
before parsing JSON. Reject timestamps outside a 5-minute tolerance. After a
delivery is verified, atomically deduplicate it by event ID before applying side
effects. Persist or enqueue work and return `2xx` within 10 seconds.

Telnyx retries on timeout or non-2xx. Keep your endpoint idempotent. Webhooks are
configured at the domain level through
`POST /v2/email_domains/{domain_id}/webhooks`, not per message.

## Errors and Retry Behavior

### Error envelope

```json
{
  "errors": [
    {
      "code": "10015",
      "title": "Validation Failed",
      "detail": "domain is invalid",
      "source": {
        "pointer": "/data/attributes/domain"
      }
    }
  ]
}
```

Every error has string `code`, `title`, and `detail`. `source.pointer` is
optional. The domains error schema enumerates codes `10001`, `10015`, `500`,
`10007`, `10008`, and `10020`; do not assume this enum replaces HTTP status
handling.

| HTTP status | Typical domain API meaning | Retry guidance |
|-------------|----------------------------|----------------|
| `400` | Invalid list query or malformed input | Fix before retrying. |
| `401` | Missing/invalid bearer key | Correct credentials; never retry in a loop. |
| `403` | Shared domain read-only (`10008`) or insufficient access | Use owned resource/correct access. |
| `404` | Domain or webhook not found (`10001`) | Verify IDs and parent-child relationship. |
| `422` | Validation/state failure (`10015` or related) | Inspect all errors and pointers; correct request/state. |
| `429` | Rate limit | Honor `Retry-After`; exponential backoff with jitter. |
| `500` | Unexpected service failure | Retry safe reads with bounds; reconcile mutations before retry. |

The OpenAPI paths explicitly document `400` only on domain listing, `403` on
shared-domain update/delete/verify, `404` on resource lookups, and `422` on
validation-bearing mutations. Authentication/rate-limit failures can still
occur at the API gateway even when not repeated on every operation.

After an ambiguous mutation timeout, reconcile current state before retrying:
list for a possibly created domain, GET before repeating PATCH, and GET/list
before repeating DELETE. Verification is safe to repeat but must allow DNS
propagation time. Retry reads for transient `429`/`5xx` with bounded exponential
backoff and jitter.

Do not print `$TELNYX_API_KEY`, authorization headers, or full environment dumps
in logs.
