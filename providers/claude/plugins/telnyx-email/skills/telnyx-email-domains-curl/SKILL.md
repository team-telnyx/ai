---
name: telnyx-email-domains-curl
description: >-
  Manage email sending domains, verify DNS records (SPF, DKIM, DMARC, MX),
  check domain health, and configure domain-level webhooks for delivery
  events.
metadata:
  author: telnyx
  product: email
  language: curl
---

# Telnyx Email Domains — curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+.
# A JSON formatter such as `python3 -m json.tool` is optional.
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
export TELNYX_API_BASE="https://api.telnyx.com/v2"

# Set these from API responses after creating or listing resources.
export EMAIL_DOMAIN_ID="123e4567-e89b-12d3-a456-426614174000"
export EMAIL_WEBHOOK_ID="123e4567-e89b-12d3-a456-426614174003"
```

Every request requires:

```bash
-H "Authorization: Bearer ***"
```

Mutation requests with JSON also require:

```bash
-H "Content-Type: application/json"
```

Use `--fail-with-body --silent --show-error` in automation so non-2xx responses
fail the command without hiding the Telnyx error body.

## Error Handling

Error responses use an `errors` array:

```json
{
  "errors": [
    {
      "code": "10015",
      "title": "Validation Failed",
      "detail": "domain is invalid",
      "source": {"pointer": "/data/attributes/domain"}
    }
  ]
}
```

Common cases:

| HTTP | Meaning | Action |
|------|---------|--------|
| `400` | Invalid list query or malformed input | Fix the query; do not retry unchanged. |
| `401` | Missing or invalid API key | Fix authentication. |
| `403` | Shared domain is read-only (`10008`) or access is insufficient | Use an owned custom domain or correct permissions. |
| `404` | Domain or webhook not found (`10001`) | Re-list resources and verify both IDs. |
| `422` | Request validation or state transition failed (`10015` and related codes) | Inspect every error and `source.pointer`; correct the request or state. |
| `429` | Rate limit | Honor `Retry-After` when present and back off. |
| `500` | Unexpected service error | Retry only safe reads or carefully reconciled mutations. |

Do not retry a create blindly after a transport timeout; first list domains and
check whether the resource was created. `verify` and GET operations are safe to
repeat. Before retrying DELETE or PATCH, retrieve the current state. Use bounded
exponential backoff with jitter for transient `429` and `5xx` failures.

## Important Notes

- All 13 reachable operations use the Telnyx v2 REST API and Bearer
  authentication.
- A custom domain is not ready merely because `POST /v2/email_domains` succeeds.
  Create it, retrieve its generated DNS records, publish those records, trigger
  verification, and check health until `usable_for_sending` is `true`.
- Call `GET /v2/email_domains/{domain_id}/dns_records` to retrieve the exact DNS
  records you need to publish. The response includes the record type, host,
  value, and priority for each record.
- The OpenAPI DNS-purpose enum includes `ownership`, `spf`, `dkim`, `dmarc`, and
  `mx`. SPF, DKIM, and DMARC are authentication-related purposes; MX supports
  inbound routing when required. Publish the exact API-returned values rather
  than constructing DNS records from examples.
- Webhooks are configured at the domain level through
  `POST /v2/email_domains/{domain_id}/webhooks`, not per message.
- Domain IDs and webhook IDs are UUIDs returned by the API, not domain names.

## Operational Caveats

- **Shared versus custom domains:** Telnyx-managed shared domains are
  pre-provisioned and readable/usable by accounts. Custom domains require
  customer DNS setup and verification. Non-owners cannot update, verify, or
  delete a shared domain; those attempts return `403` with code `10008`.
- **DNS is API-generated:** The API does not expose customer-facing
  create/update/delete operations for individual generated DNS records. Publish
  records at the authoritative DNS provider, then call the verify operation.
- **Tracking defaults live on the domain:** `open_tracking`, `click_tracking`,
  and `unsubscribe_tracking` default to `false`, `false`, and `true`,
  respectively. A send may override these defaults without changing the domain.
- **Health is the readiness signal:** Do not infer deliverability from one DNS
  record. Check the aggregate health response and the relevant usability
  boolean.
- **Verification reflects DNS propagation:** A successful verify request means
  the check ran, not that every record passed. Wait and use bounded backoff before
  checking again; never tight-loop verification.
- **Verified deletion requires intent:** Pass `force=true` to delete a verified
  custom domain. Delete returns `200` with the deleted domain, not `204`.
- **Pagination differs by resource:** Domain lists support offset or cursor
  pagination. Webhook lists support offset pagination only. Treat cursors as
  opaque and inspect the returned `.meta` shape.

## Reference Use Rules

Do not invent request fields, DNS values, event names, response fields, or status
enums.

- Read [references/api-details.md](references/api-details.md) for complete
  request/response schemas and every enum.
- Before constructing list filters or pagination, read
  [List query parameters](references/api-details.md#list-query-parameters).
- Before branching on DNS or health, read
  [DNS and verification semantics](references/api-details.md#dns-and-verification-semantics)
  and [Response schemas](references/api-details.md#response-schemas).
- Before subscribing to events, read
  [Webhook event allowlist](references/api-details.md#webhook-event-allowlist).
  The allowlist is explicit and has no default-to-all behavior.
- Before retrying failures, read
  [Errors and retry behavior](references/api-details.md#errors-and-retry-behavior).

## Core Tasks

### Provision and verify a custom domain

#### 1. Create a domain

`POST /v2/email_domains`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Custom domain name, for example `example.com`. |
| `inbound_enabled` | boolean | No | Enable inbound routing; defaults to `false`. |
| `dmarc_policy` | object \| null | No | Advisory DMARC policy (`p`, `pct`, `rua`, `sp`). |
| `tracking` | object | No | Domain defaults for open, click, and unsubscribe tracking. |

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "inbound_enabled": true,
    "dmarc_policy": {
      "p": "none",
      "pct": 100,
      "rua": "mailto:dmarc@example.com"
    },
    "tracking": {
      "open_tracking": true,
      "click_tracking": true,
      "unsubscribe_tracking": true
    }
  }' \
  "$TELNYX_API_BASE/email_domains"
```

Expected status: `201`. Save `.data.id` as `EMAIL_DOMAIN_ID`. Do not send until
`.data.usable_for_sending` is `true`.

#### 2. Retrieve the required DNS records

`GET /v2/email_domains/{domain_id}/dns_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Domain ID returned by the API. |

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/dns_records"
```

Each item in `.data[]` includes `purpose`, `record_type`, `host`, `value`,
`priority`, `required`, `status`, and possibly `actual_value`. Publish every
required record exactly as returned. Use the response to decide which records
are required for this domain's sending and inbound configuration.

#### 3. Trigger DNS verification

`POST /v2/email_domains/{domain_id}/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Domain whose current DNS records should be checked. |
| Request body | — | No | This operation has no request body. |

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/verify"
```

Expected status: `200`. Inspect `.data.verification` and each
`.data.dns_records[].status`. A `200` means the check ran; it does not guarantee
that every record verified.

#### 4. Check domain health

`GET /v2/email_domains/{id}/health`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID path parameter | Yes | Domain whose aggregate readiness should be checked. |

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/health"
```

Read `.data.status`, `.data.usable_for_sending`, `.data.usable_for_inbound`,
`.data.verification`, and `.data.checked_at`. DMARC may be `missing_optional`
without blocking sending; use each record's `required` flag and the health
booleans rather than treating every non-`verified` value as fatal.

### List domains

`GET /v2/email_domains`

| Query parameter | Type | Required | Description |
|-----------------|------|----------|-------------|
| `page[number]` | integer | No | Offset page number. |
| `page[size]` | integer | No | Page size from `1` to `100`. |
| `sort` | enum | No | `created_at`, `-created_at`, `domain`, or `-domain`. |
| `filter[type]` | enum | No | `custom`, `shared`, or `shared_inbound`. |
| `filter[usable_for_sending]` | boolean | No | Limit results by sending readiness. |
| ... | | | See [all list query parameters](references/api-details.md#list-query-parameters). |

```bash
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer ***" \
  --data-urlencode "page[number]=1" \
  --data-urlencode "page[size]=25" \
  --data-urlencode "sort=-created_at" \
  --data-urlencode "filter[type]=custom" \
  --data-urlencode "filter[usable_for_sending]=true" \
  "$TELNYX_API_BASE/email_domains"
```

Supported filters also include `status`, partial case-insensitive `domain`,
`profile_id`, and `usable_for_inbound`. Domain lists support offset pagination
and cursor pagination; inspect the returned `.meta` shape.

### Retrieve a domain

`GET /v2/email_domains/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID path parameter | Yes | Domain to retrieve. |

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID"
```

Expected status: `200`. The response includes DNS, DKIM, inbound, DMARC,
tracking, usability, timestamps, and optional reputation information.

### Update a domain

`PATCH /v2/email_domains/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID path parameter | Yes | Domain to update. |
| `inbound_enabled` | boolean | No | Enable or disable inbound routing. |
| `dmarc_policy` | object \| null | No | Change the advisory DMARC policy. |
| `tracking` | object | No | Change domain tracking defaults. |

The domain name and type are not mutable. Include at least one field to change.
Updating the DMARC policy rebuilds the recommended DMARC record and resets its
verification to `pending`, so retrieve the new DNS records, publish the returned
value, and verify again.

```bash
curl --fail-with-body --silent --show-error \
  -X PATCH \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "inbound_enabled": true,
    "tracking": {
      "open_tracking": false,
      "click_tracking": true,
      "unsubscribe_tracking": true
    }
  }' \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID"
```

Expected status: `200`. A non-owner cannot mutate a shared domain (`403`, code
`10008`).

### Delete a domain

`DELETE /v2/email_domains/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID path parameter | Yes | Domain to delete. |
| `force` | boolean query parameter | For verified domains | Must be `true` to delete a verified domain. |

```bash
# For a pending or unverified custom domain:
curl --fail-with-body --silent --show-error \
  -X DELETE \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID"

# For a verified custom domain, explicitly confirm deletion:
curl --fail-with-body --silent --show-error --get \
  -X DELETE \
  -H "Authorization: Bearer ***" \
  --data-urlencode "force=true" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID"
```

Expected status: `200` with the deleted domain in `.data`. A non-owner cannot
delete a shared domain.

## Webhooks

Webhooks are configured at the **domain** level through
`POST /v2/email_domains/{domain_id}/webhooks`, not per message. A subscription
contains a delivery URL and a non-empty explicit event allowlist.

### Verify and process webhook deliveries

Telnyx signs webhook deliveries with Ed25519 and sends the
`telnyx-signature-ed25519` and `telnyx-timestamp` headers. Follow this order for
every delivery:

1. Read and retain the request's raw body bytes. Do not parse JSON first; changing
   whitespace or serialization before verification invalidates the signed body.
2. Read `telnyx-timestamp` and reject requests outside a 5-minute timestamp
   tolerance to limit replay attacks.
3. Verify `telnyx-signature-ed25519` against the timestamp and raw body with your
   Telnyx Ed25519 public key. Use the official Telnyx verifier for your runtime
   where available. Reject the request before parsing or processing if signature
   verification fails.
4. Parse the verified body, extract its event ID, and atomically record that ID.
   If the event ID was already processed, return a success response without
   repeating side effects.
5. Persist or enqueue work, then return a `2xx` response within 10 seconds. Keep
   slow downstream processing outside the request path.

Telnyx retries on timeout or non-2xx. Keep your endpoint idempotent.

### Webhook events

The current OpenAPI `EmailWebhookEvent` enum contains these exact subscribable
event types:

| Category | Event types |
|----------|-------------|
| Outbound lifecycle | `email.scheduled`, `email.sandbox`, `email.queued`, `email.sending`, `email.sent`, `email.delivered`, `email.deferred`, `email.bounced`, `email.failed` |
| Engagement | `email.complained`, `email.opened`, `email.clicked`, `email.unsubscribed` |
| Inbound | `email.received` |
| Domain lifecycle | `email_domain.created`, `email_domain.verified`, `email_domain.degraded`, `email_domain.suspended`, `email_domain.deleted` |

Use exact case and punctuation. The create request requires at least one event;
there is no implicit all-events subscription. PATCH replaces the event list, so
include the complete desired allowlist.

### List webhooks

`GET /v2/email_domains/{domain_id}/webhooks`

| Query parameter | Type | Required | Description |
|-----------------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Parent domain. |
| `page[number]` | integer | No | Offset page number; defaults to `1`. |
| `page[size]` | integer | No | Page size from `1` to `100`; defaults to `25`. |
| `sort` | enum | No | `created_at` or `-created_at`. |

```bash
curl --fail-with-body --silent --show-error --get \
  -H "Authorization: Bearer ***" \
  --data-urlencode "page[number]=1" \
  --data-urlencode "page[size]=25" \
  --data-urlencode "sort=-created_at" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/webhooks"
```

Expected status: `200` with `.data[]` and `.meta`. Webhook lists use offset
pagination only.

### Create a webhook

`POST /v2/email_domains/{domain_id}/webhooks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Parent domain. |
| `url` | URI string | Yes | Webhook delivery destination. |
| `events` | array of `EmailWebhookEvent` | Yes | Non-empty exact event allowlist. |

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhooks/email",
    "events": [
      "email.queued",
      "email.sent",
      "email.delivered",
      "email.bounced",
      "email.failed",
      "email.received",
      "email_domain.verified"
    ]
  }' \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/webhooks"
```

Expected status: `201`. Save `.data.id` as `EMAIL_WEBHOOK_ID`.

### Retrieve a webhook

`GET /v2/email_domains/{domain_id}/webhooks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Parent domain. |
| `id` | UUID path parameter | Yes | Webhook to retrieve. |

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/webhooks/$EMAIL_WEBHOOK_ID"
```

Expected status: `200`. Confirm `.data.domain_id` matches the domain in the path.

### Update a webhook

`PATCH /v2/email_domains/{domain_id}/webhooks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Parent domain. |
| `id` | UUID path parameter | Yes | Webhook to update. |
| `url` | URI string | No | New delivery destination. |
| `events` | array of `EmailWebhookEvent` | No | Replacement non-empty event allowlist. |

The request may update `url`, `events`, or both. `domain_id` is bound at creation
and cannot be changed.

```bash
curl --fail-with-body --silent --show-error \
  -X PATCH \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      "email.sent",
      "email.delivered",
      "email.bounced",
      "email.complained",
      "email.opened",
      "email.clicked",
      "email.unsubscribed"
    ]
  }' \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/webhooks/$EMAIL_WEBHOOK_ID"
```

Expected status: `200`. Verify the returned `.data.events` contains the complete
desired allowlist.

### Delete a webhook

`DELETE /v2/email_domains/{domain_id}/webhooks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_id` | UUID path parameter | Yes | Parent domain. |
| `id` | UUID path parameter | Yes | Webhook to delete. |

```bash
curl --fail-with-body --silent --show-error \
  -X DELETE \
  -H "Authorization: Bearer ***" \
  "$TELNYX_API_BASE/email_domains/$EMAIL_DOMAIN_ID/webhooks/$EMAIL_WEBHOOK_ID"
```

Expected status: `200` with the deleted webhook in `.data`, not `204`.

## Additional Operations

All 13 reachable operations are indexed below. Use the inline core tasks first;
for exhaustive optional parameters and response schemas, read
[references/api-details.md](references/api-details.md).

| # | Operation | Operation ID | Endpoint | Required params |
|---|-----------|--------------|----------|-----------------|
| 1 | List domains | `listEmailDomains` | `GET /v2/email_domains` | None |
| 2 | Create a domain | `createEmailDomain` | `POST /v2/email_domains` | `domain` |
| 3 | Retrieve a domain | `getEmailDomain` | `GET /v2/email_domains/{id}` | `id` |
| 4 | Update a domain | `updateEmailDomain` | `PATCH /v2/email_domains/{id}` | `id`; include at least one update field |
| 5 | Delete a domain | `deleteEmailDomain` | `DELETE /v2/email_domains/{id}` | `id`; `force=true` for a verified domain |
| 6 | Get domain health | `getEmailDomainHealth` | `GET /v2/email_domains/{id}/health` | `id` |
| 7 | List generated DNS records | `listEmailDomainDnsRecords` | `GET /v2/email_domains/{domain_id}/dns_records` | `domain_id` |
| 8 | Verify current DNS | `verifyEmailDomainDnsRecords` | `POST /v2/email_domains/{domain_id}/verify` | `domain_id` |
| 9 | List domain webhooks | `listEmailDomainWebhooks` | `GET /v2/email_domains/{domain_id}/webhooks` | `domain_id` |
| 10 | Create a domain webhook | `createEmailDomainWebhook` | `POST /v2/email_domains/{domain_id}/webhooks` | `domain_id`, `url`, `events` |
| 11 | Retrieve a domain webhook | `getEmailDomainWebhook` | `GET /v2/email_domains/{domain_id}/webhooks/{id}` | `domain_id`, `id` |
| 12 | Update a domain webhook | `updateEmailDomainWebhook` | `PATCH /v2/email_domains/{domain_id}/webhooks/{id}` | `domain_id`, `id`; include `url`, `events`, or both |
| 13 | Delete a domain webhook | `deleteEmailDomainWebhook` | `DELETE /v2/email_domains/{domain_id}/webhooks/{id}` | `domain_id`, `id` |

Before using lower-frequency optional parameters or branching on response fields,
read [the list-query section](references/api-details.md#list-query-parameters),
[the request schemas](references/api-details.md#request-schemas), and
[the response schemas](references/api-details.md#response-schemas).
