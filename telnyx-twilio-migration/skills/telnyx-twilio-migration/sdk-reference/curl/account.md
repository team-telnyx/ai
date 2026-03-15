<!-- SDK reference: telnyx-account-curl -->

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +2 optional params in the API Details section below |

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

# Account (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List Audit Logs

| Field | Type |
|-------|------|
| `alternate_resource_id` | string \| null |
| `change_made_by` | enum: telnyx, account_manager, account_owner, organization_member |
| `change_type` | string |
| `changes` | array \| null |
| `created_at` | date-time |
| `id` | uuid |
| `organization_id` | uuid |
| `record_type` | string |
| `resource_id` | string |
| `user_id` | uuid |

**Returned by:** Get user balance details

| Field | Type |
|-------|------|
| `available_credit` | string |
| `balance` | string |
| `credit_limit` | string |
| `currency` | string |
| `pending` | string |
| `record_type` | enum: balance |

**Returned by:** Get monthly charges breakdown

| Field | Type |
|-------|------|
| `currency` | string |
| `end_date` | date |
| `results` | array[object] |
| `start_date` | date |
| `user_email` | email |
| `user_id` | string |

**Returned by:** Get monthly charges summary

| Field | Type |
|-------|------|
| `currency` | string |
| `end_date` | date |
| `start_date` | date |
| `summary` | object |
| `total` | object |
| `user_email` | email |
| `user_id` | string |

**Returned by:** Search detail records

| Field | Type |
|-------|------|
| `carrier` | string |
| `carrier_fee` | string |
| `cld` | string |
| `cli` | string |
| `completed_at` | date-time |
| `cost` | string |
| `country_code` | string |
| `created_at` | date-time |
| `currency` | string |
| `delivery_status` | string |
| `delivery_status_failover_url` | string |
| `delivery_status_webhook_url` | string |
| `direction` | enum: inbound, outbound |
| `errors` | array[string] |
| `fteu` | boolean |
| `mcc` | string |
| `message_type` | enum: SMS, MMS, RCS |
| `mnc` | string |
| `on_net` | boolean |
| `parts` | integer |
| `profile_id` | string |
| `profile_name` | string |
| `rate` | string |
| `record_type` | string |
| `sent_at` | date-time |
| `source_country_code` | string |
| `status` | enum: gw_timeout, delivered, dlr_unconfirmed, dlr_timeout, received, gw_reject, failed |
| `tags` | string |
| `updated_at` | date-time |
| `user_id` | string |
| `uuid` | string |

**Returned by:** List invoices

| Field | Type |
|-------|------|
| `file_id` | uuid |
| `invoice_id` | uuid |
| `paid` | boolean |
| `period_end` | date |
| `period_start` | date |
| `url` | uri |

**Returned by:** Get invoice by ID

| Field | Type |
|-------|------|
| `download_url` | uri |
| `file_id` | uuid |
| `invoice_id` | uuid |
| `paid` | boolean |
| `period_end` | date |
| `period_start` | date |
| `url` | uri |

**Returned by:** List auto recharge preferences, Update auto recharge preferences

| Field | Type |
|-------|------|
| `enabled` | boolean |
| `id` | string |
| `invoice_enabled` | boolean |
| `preference` | enum: credit_paypal, ach |
| `recharge_amount` | string |
| `record_type` | string |
| `threshold_amount` | string |

**Returned by:** List User Tags

| Field | Type |
|-------|------|
| `number_tags` | array[string] |
| `outbound_profile_tags` | array[string] |

**Returned by:** Create a stored payment transaction

| Field | Type |
|-------|------|
| `amount_cents` | integer |
| `amount_currency` | string |
| `auto_recharge` | boolean |
| `created_at` | date-time |
| `id` | string |
| `processor_status` | string |
| `record_type` | enum: transaction |
| `transaction_processing_type` | enum: stored_payment |

**Returned by:** List webhook deliveries, Find webhook_delivery details by ID

| Field | Type |
|-------|------|
| `attempts` | array[object] |
| `finished_at` | date-time |
| `id` | uuid |
| `record_type` | string |
| `started_at` | date-time |
| `status` | enum: delivered, failed |
| `user_id` | uuid |
| `webhook` | object |

## Optional Parameters

### Update auto recharge preferences

| Parameter | Type | Description |
|-----------|------|-------------|
| `threshold_amount` | string | The threshold amount at which the account will be recharged. |
| `recharge_amount` | string | The amount to recharge the account, the actual recharge amount will be the am... |
| `enabled` | boolean | Whether auto recharge is enabled. |
| `invoice_enabled` | boolean |  |
| `preference` | enum (credit_paypal, ach) | The payment preference for auto recharge. |
