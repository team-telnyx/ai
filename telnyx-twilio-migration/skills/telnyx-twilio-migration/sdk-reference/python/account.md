<!-- SDK reference: telnyx-account-python -->

# Telnyx Account - Python

## Core Workflow

### Steps

1. **Check balance**: `client.balance.retrieve()`
2. **List invoices**: `client.billing.invoices.list()`
3. **Configure webhooks**: `client.webhook_deliveries.list()`

### Common mistakes

- API keys provide full account access — use scoped tokens for limited permissions

**Related skills**: telnyx-account-access-python, telnyx-account-reports-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.balance.retrieve(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`client.audit_events.list()` — `GET /audit_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (asc, desc) | No | Set the order of the results by the creation date. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.audit_events.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.alternate_resource_id`

## Get user balance details

`client.balance.retrieve()` — `GET /balance`

```python
balance = client.balance.retrieve()
print(balance.data)
```

Key response fields: `response.data.available_credit, response.data.balance, response.data.credit_limit`

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`client.charges_breakdown.retrieve()` — `GET /charges_breakdown`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (json, csv) | No | Response format |
| `end_date` | string (date) | No | End date for the charges breakdown in ISO date format (YYYY-... |

```python
from datetime import date

charges_breakdown = client.charges_breakdown.retrieve(
    start_date=date.fromisoformat("2025-05-01"),
)
print(charges_breakdown.data)
```

Key response fields: `response.data.currency, response.data.end_date, response.data.results`

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`client.charges_summary.retrieve()` — `GET /charges_summary`

```python
from datetime import date

charges_summary = client.charges_summary.retrieve(
    end_date=date.fromisoformat("2025-06-01"),
    start_date=date.fromisoformat("2025-05-01"),
)
print(charges_summary.data)
```

Key response fields: `response.data.currency, response.data.end_date, response.data.start_date`

## Search detail records

Search for any detail record across the Telnyx Platform

`client.detail_records.list()` — `GET /detail_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter records on a given record attribute and value. |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.detail_records.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.status, response.data.direction, response.data.created_at`

## List invoices

Retrieve a paginated list of invoices.

`client.invoices.list()` — `GET /invoices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (period_start, -period_start) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.invoices.list()
page = page.data[0]
print(page.file_id)
```

Key response fields: `response.data.url, response.data.file_id, response.data.invoice_id`

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`client.invoices.retrieve()` — `GET /invoices/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Invoice UUID |
| `action` | enum (json, link) | No | Invoice action |

```python
invoice = client.invoices.retrieve(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(invoice.data)
```

Key response fields: `response.data.url, response.data.download_url, response.data.file_id`

## List auto recharge preferences

Returns the payment auto recharge preferences.

`client.payment.auto_recharge_prefs.list()` — `GET /payment/auto_recharge_prefs`

```python
auto_recharge_prefs = client.payment.auto_recharge_prefs.list()
print(auto_recharge_prefs.data)
```

Key response fields: `response.data.id, response.data.enabled, response.data.invoice_enabled`

## Update auto recharge preferences

Update payment auto recharge preferences.

`client.payment.auto_recharge_prefs.update()` — `PATCH /payment/auto_recharge_prefs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `preference` | enum (credit_paypal, ach) | No | The payment preference for auto recharge. |
| `threshold_amount` | string | No | The threshold amount at which the account will be recharged. |
| `recharge_amount` | string | No | The amount to recharge the account, the actual recharge amou... |
| ... | | | +2 optional params in the API Details section below |

```python
auto_recharge_pref = client.payment.auto_recharge_prefs.update()
print(auto_recharge_pref.data)
```

Key response fields: `response.data.id, response.data.enabled, response.data.invoice_enabled`

## List User Tags

List all user tags.

`client.user_tags.list()` — `GET /user_tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
user_tags = client.user_tags.list()
print(user_tags.data)
```

Key response fields: `response.data.number_tags, response.data.outbound_profile_tags`

## Create a stored payment transaction

`client.payment.create_stored_payment_transaction()` — `POST /v2/payment/stored_payment_transactions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | string | Yes | Amount in dollars and cents, e.g. |

```python
response = client.payment.create_stored_payment_transaction(
    amount="120.00",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.amount_cents`

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`client.webhook_deliveries.list()` — `GET /webhook_deliveries`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.webhook_deliveries.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.attempts`

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`client.webhook_deliveries.retrieve()` — `GET /webhook_deliveries/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the webhook_delivery. |

```python
webhook_delivery = client.webhook_deliveries.retrieve(
    "C9C0797E-901D-4349-A33C-C2C8F31A92C2",
)
print(webhook_delivery.data)
```

Key response fields: `response.data.id, response.data.status, response.data.attempts`

---

# Account (Python) — API Details

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

### Update auto recharge preferences — `client.payment.auto_recharge_prefs.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `threshold_amount` | string | The threshold amount at which the account will be recharged. |
| `recharge_amount` | string | The amount to recharge the account, the actual recharge amount will be the am... |
| `enabled` | boolean | Whether auto recharge is enabled. |
| `invoice_enabled` | boolean |  |
| `preference` | enum (credit_paypal, ach) | The payment preference for auto recharge. |
