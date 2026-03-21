---
name: telnyx-account-curl
description: >-
  Account balance, payments, invoices, webhooks, audit logs, and detail records.
metadata:
  author: telnyx
  product: account
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - curl

## Core Workflow

### Steps

1. **Check balance**
2. **List invoices**
3. **Configure webhooks**

### Common mistakes

- API keys provide full account access — use scoped tokens for limited permissions

**Related skills**: telnyx-account-access-curl, telnyx-account-reports-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`GET /audit_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (asc, desc) | No | Set the order of the results by the creation date. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/audit_events?sort=desc"
```

Key response fields: `.data.id, .data.created_at, .data.alternate_resource_id`

## Get user balance details

`GET /balance`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/balance"
```

Key response fields: `.data.available_credit, .data.balance, .data.credit_limit`

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`GET /charges_breakdown`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (json, csv) | No | Response format |
| `end_date` | string (date) | No | End date for the charges breakdown in ISO date format (YYYY-... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/charges_breakdown?start_date=2025-05-01&end_date=2025-06-01&format=json"
```

Key response fields: `.data.currency, .data.end_date, .data.results`

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`GET /charges_summary`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/charges_summary?start_date=2025-05-01&end_date=2025-06-01"
```

Key response fields: `.data.currency, .data.end_date, .data.start_date`

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter records on a given record attribute and value. |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/detail_records"
```

Key response fields: `.data.status, .data.direction, .data.created_at`

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (period_start, -period_start) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/invoices?sort=period_start"
```

Key response fields: `.data.url, .data.file_id, .data.invoice_id`

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Invoice UUID |
| `action` | enum (json, link) | No | Invoice action |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/invoices/550e8400-e29b-41d4-a716-446655440000?action=json"
```

Key response fields: `.data.url, .data.download_url, .data.file_id`

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/payment/auto_recharge_prefs"
```

Key response fields: `.data.id, .data.enabled, .data.invoice_enabled`

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `preference` | enum (credit_paypal, ach) | No | The payment preference for auto recharge. |
| `threshold_amount` | string | No | The threshold amount at which the account will be recharged. |
| `recharge_amount` | string | No | The amount to recharge the account, the actual recharge amou... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/payment/auto_recharge_prefs"
```

Key response fields: `.data.id, .data.enabled, .data.invoice_enabled`

## List User Tags

List all user tags.

`GET /user_tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/user_tags"
```

Key response fields: `.data.number_tags, .data.outbound_profile_tags`

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | string | Yes | Amount in dollars and cents, e.g. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "amount": "120.00"
}' \
  "https://api.telnyx.com/v2/v2/payment/stored_payment_transactions"
```

Key response fields: `.data.id, .data.created_at, .data.amount_cents`

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/webhook_deliveries"
```

Key response fields: `.data.id, .data.status, .data.attempts`

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the webhook_delivery. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/webhook_deliveries/C9C0797E-901D-4349-A33C-C2C8F31A92C2"
```

Key response fields: `.data.id, .data.status, .data.attempts`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
