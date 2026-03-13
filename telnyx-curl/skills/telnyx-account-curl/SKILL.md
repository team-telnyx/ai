---
name: telnyx-account-curl
description: >-
  Manage account balance, payments, invoices, webhooks, and view audit logs and
  detail records. This skill provides REST API (curl) examples.
metadata:
  internal: true
  author: telnyx
  product: account
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - curl

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
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

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

## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`GET /audit_events`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/audit_events?sort=desc"
```

Returns: `alternate_resource_id` (string | null), `change_made_by` (enum: telnyx, account_manager, account_owner, organization_member), `change_type` (string), `changes` (array | null), `created_at` (date-time), `id` (uuid), `organization_id` (uuid), `record_type` (string), `resource_id` (string), `user_id` (uuid)

## Get user balance details

`GET /balance`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/balance"
```

Returns: `available_credit` (string), `balance` (string), `credit_limit` (string), `currency` (string), `pending` (string), `record_type` (enum: balance)

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`GET /charges_breakdown`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/charges_breakdown?start_date=2025-05-01&end_date=2025-06-01&format=json"
```

Returns: `currency` (string), `end_date` (date), `results` (array[object]), `start_date` (date), `user_email` (email), `user_id` (string)

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`GET /charges_summary`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/charges_summary?start_date=2025-05-01&end_date=2025-06-01"
```

Returns: `currency` (string), `end_date` (date), `start_date` (date), `summary` (object), `total` (object), `user_email` (email), `user_id` (string)

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/detail_records"
```

Returns: `data` (array[object]), `meta` (object)

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/invoices?sort=period_start"
```

Returns: `file_id` (uuid), `invoice_id` (uuid), `paid` (boolean), `period_end` (date), `period_start` (date), `url` (uri)

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/invoices/{id}?action=json"
```

Returns: `download_url` (uri), `file_id` (uuid), `invoice_id` (uuid), `paid` (boolean), `period_end` (date), `period_start` (date), `url` (uri)

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/payment/auto_recharge_prefs"
```

Returns: `enabled` (boolean), `id` (string), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `record_type` (string), `threshold_amount` (string)

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

Optional: `enabled` (boolean), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `threshold_amount` (string)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "threshold_amount": "104.00",
  "recharge_amount": "104.00",
  "enabled": true,
  "invoice_enabled": true,
  "preference": "credit_paypal"
}' \
  "https://api.telnyx.com/v2/payment/auto_recharge_prefs"
```

Returns: `enabled` (boolean), `id` (string), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `record_type` (string), `threshold_amount` (string)

## List User Tags

List all user tags.

`GET /user_tags`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/user_tags"
```

Returns: `number_tags` (array[string]), `outbound_profile_tags` (array[string])

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions` — Required: `amount`

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

Returns: `amount_cents` (integer), `amount_currency` (string), `auto_recharge` (boolean), `created_at` (date-time), `id` (string), `processor_status` (string), `record_type` (enum: transaction), `transaction_processing_type` (enum: stored_payment)

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/webhook_deliveries"
```

Returns: `attempts` (array[object]), `finished_at` (date-time), `id` (uuid), `record_type` (string), `started_at` (date-time), `status` (enum: delivered, failed), `user_id` (uuid), `webhook` (object)

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/webhook_deliveries/C9C0797E-901D-4349-A33C-C2C8F31A92C2"
```

Returns: `attempts` (array[object]), `finished_at` (date-time), `id` (uuid), `record_type` (string), `started_at` (date-time), `status` (enum: delivered, failed), `user_id` (uuid), `webhook` (object)
