<!-- SDK reference: telnyx-account-python -->

# Telnyx Account - Python

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
    result = client.messages.send(to="+13125550001", from_="+13125550002", text="Hello")
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

## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`GET /audit_events`

```python
page = client.audit_events.list()
page = page.data[0]
print(page.id)
```

Returns: `alternate_resource_id` (string | null), `change_made_by` (enum: telnyx, account_manager, account_owner, organization_member), `change_type` (string), `changes` (array | null), `created_at` (date-time), `id` (uuid), `organization_id` (uuid), `record_type` (string), `resource_id` (string), `user_id` (uuid)

## Get user balance details

`GET /balance`

```python
balance = client.balance.retrieve()
print(balance.data)
```

Returns: `available_credit` (string), `balance` (string), `credit_limit` (string), `currency` (string), `pending` (string), `record_type` (enum: balance)

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`GET /charges_breakdown`

```python
from datetime import date

charges_breakdown = client.charges_breakdown.retrieve(
    start_date=date.fromisoformat("2025-05-01"),
)
print(charges_breakdown.data)
```

Returns: `currency` (string), `end_date` (date), `results` (array[object]), `start_date` (date), `user_email` (email), `user_id` (string)

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`GET /charges_summary`

```python
from datetime import date

charges_summary = client.charges_summary.retrieve(
    end_date=date.fromisoformat("2025-06-01"),
    start_date=date.fromisoformat("2025-05-01"),
)
print(charges_summary.data)
```

Returns: `currency` (string), `end_date` (date), `start_date` (date), `summary` (object), `total` (object), `user_email` (email), `user_id` (string)

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

```python
page = client.detail_records.list()
page = page.data[0]
print(page)
```

Returns: `carrier` (string), `carrier_fee` (string), `cld` (string), `cli` (string), `completed_at` (date-time), `cost` (string), `country_code` (string), `created_at` (date-time), `currency` (string), `delivery_status` (string), `delivery_status_failover_url` (string), `delivery_status_webhook_url` (string), `direction` (enum: inbound, outbound), `errors` (array[string]), `fteu` (boolean), `mcc` (string), `message_type` (enum: SMS, MMS, RCS), `mnc` (string), `on_net` (boolean), `parts` (integer), `profile_id` (string), `profile_name` (string), `rate` (string), `record_type` (string), `sent_at` (date-time), `source_country_code` (string), `status` (enum: gw_timeout, delivered, dlr_unconfirmed, dlr_timeout, received, gw_reject, failed), `tags` (string), `updated_at` (date-time), `user_id` (string), `uuid` (string)

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

```python
page = client.invoices.list()
page = page.data[0]
print(page.file_id)
```

Returns: `file_id` (uuid), `invoice_id` (uuid), `paid` (boolean), `period_end` (date), `period_start` (date), `url` (uri)

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

```python
invoice = client.invoices.retrieve(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(invoice.data)
```

Returns: `download_url` (uri), `file_id` (uuid), `invoice_id` (uuid), `paid` (boolean), `period_end` (date), `period_start` (date), `url` (uri)

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```python
auto_recharge_prefs = client.payment.auto_recharge_prefs.list()
print(auto_recharge_prefs.data)
```

Returns: `enabled` (boolean), `id` (string), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `record_type` (string), `threshold_amount` (string)

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

Optional: `enabled` (boolean), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `threshold_amount` (string)

```python
auto_recharge_pref = client.payment.auto_recharge_prefs.update()
print(auto_recharge_pref.data)
```

Returns: `enabled` (boolean), `id` (string), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `record_type` (string), `threshold_amount` (string)

## List User Tags

List all user tags.

`GET /user_tags`

```python
user_tags = client.user_tags.list()
print(user_tags.data)
```

Returns: `number_tags` (array[string]), `outbound_profile_tags` (array[string])

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions` — Required: `amount`

```python
response = client.payment.create_stored_payment_transaction(
    amount="120.00",
)
print(response.data)
```

Returns: `amount_cents` (integer), `amount_currency` (string), `auto_recharge` (boolean), `created_at` (date-time), `id` (string), `processor_status` (string), `record_type` (enum: transaction), `transaction_processing_type` (enum: stored_payment)

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

```python
page = client.webhook_deliveries.list()
page = page.data[0]
print(page.id)
```

Returns: `attempts` (array[object]), `finished_at` (date-time), `id` (uuid), `record_type` (string), `started_at` (date-time), `status` (enum: delivered, failed), `user_id` (uuid), `webhook` (object)

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

```python
webhook_delivery = client.webhook_deliveries.retrieve(
    "C9C0797E-901D-4349-A33C-C2C8F31A92C2",
)
print(webhook_delivery.data)
```

Returns: `attempts` (array[object]), `finished_at` (date-time), `id` (uuid), `record_type` (string), `started_at` (date-time), `status` (enum: delivered, failed), `user_id` (uuid), `webhook` (object)
