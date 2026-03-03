---
name: telnyx-account-python
description: >-
  Manage account balance, payments, invoices, webhooks, and view audit logs and
  detail records. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: account
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

## List Audit Logs

Retrieve a list of audit log entries.

`GET /audit_events`

```python
page = client.audit_events.list()
page = page.data[0]
print(page.id)
```

## Get user balance details

`GET /balance`

```python
balance = client.balance.retrieve()
print(balance.data)
```

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range.

`GET /charges_breakdown`

```python
from datetime import date

charges_breakdown = client.charges_breakdown.retrieve(
    start_date=date.fromisoformat("2025-05-01"),
)
print(charges_breakdown.data)
```

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range.

`GET /charges_summary`

```python
from datetime import date

charges_summary = client.charges_summary.retrieve(
    end_date=date.fromisoformat("2025-06-01"),
    start_date=date.fromisoformat("2025-05-01"),
)
print(charges_summary.data)
```

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

```python
page = client.detail_records.list()
page = page.data[0]
print(page)
```

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

```python
page = client.invoices.list()
page = page.data[0]
print(page.file_id)
```

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

```python
invoice = client.invoices.retrieve(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(invoice.data)
```

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```python
auto_recharge_prefs = client.payment.auto_recharge_prefs.list()
print(auto_recharge_prefs.data)
```

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

Optional: `enabled` (boolean), `invoice_enabled` (boolean), `preference` (enum), `recharge_amount` (string), `threshold_amount` (string)

```python
auto_recharge_pref = client.payment.auto_recharge_prefs.update()
print(auto_recharge_pref.data)
```

## List User Tags

List all user tags.

`GET /user_tags`

```python
user_tags = client.user_tags.list()
print(user_tags.data)
```

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions` — Required: `amount`

```python
response = client.payment.create_stored_payment_transaction(
    amount="120.00",
)
print(response.data)
```

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

```python
page = client.webhook_deliveries.list()
page = page.data[0]
print(page.id)
```

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

```python
webhook_delivery = client.webhook_deliveries.retrieve(
    "C9C0797E-901D-4349-A33C-C2C8F31A92C2",
)
print(webhook_delivery.data)
```
