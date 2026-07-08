---
name: telnyx-account-ruby
description: >-
  Manage account balance, payments, invoices, webhooks, and view audit logs and
  detail records. This skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: account
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.messages.send_(to: "+13125550001", from: "+13125550002", text: "Hello")
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`GET /audit_events`

```ruby
page = client.audit_events.list

puts(page)
```

Returns: `alternate_resource_id` (string | null), `change_made_by` (enum: telnyx, account_manager, account_owner, organization_member), `change_type` (string), `changes` (array | null), `created_at` (date-time), `id` (uuid), `organization_id` (uuid), `record_type` (string), `resource_id` (string), `user_id` (uuid)

## Get user balance details

`GET /balance`

```ruby
balance = client.balance.retrieve

puts(balance)
```

Returns: `available_credit` (string), `balance` (string), `credit_limit` (string), `currency` (string), `pending` (string), `record_type` (enum: balance)

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`GET /charges_breakdown`

```ruby
charges_breakdown = client.charges_breakdown.retrieve(start_date: "2025-05-01")

puts(charges_breakdown)
```

Returns: `currency` (string), `end_date` (date), `results` (array[object]), `start_date` (date), `user_email` (email), `user_id` (string)

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`GET /charges_summary`

```ruby
charges_summary = client.charges_summary.retrieve(end_date: "2025-06-01", start_date: "2025-05-01")

puts(charges_summary)
```

Returns: `currency` (string), `end_date` (date), `start_date` (date), `summary` (object), `total` (object), `user_email` (email), `user_id` (string)

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

```ruby
page = client.detail_records.list

puts(page)
```

Returns: `carrier` (string), `carrier_fee` (string), `cld` (string), `cli` (string), `completed_at` (date-time), `cost` (string), `country_code` (string), `created_at` (date-time), `currency` (string), `delivery_status` (string), `delivery_status_failover_url` (string), `delivery_status_webhook_url` (string), `direction` (enum: inbound, outbound), `errors` (array[string]), `fteu` (boolean), `mcc` (string), `message_type` (enum: SMS, MMS, RCS), `mnc` (string), `on_net` (boolean), `parts` (integer), `profile_id` (string), `profile_name` (string), `rate` (string), `record_type` (string), `sent_at` (date-time), `source_country_code` (string), `status` (enum: gw_timeout, delivered, dlr_unconfirmed, dlr_timeout, received, gw_reject, failed), `tags` (string), `updated_at` (date-time), `user_id` (string), `uuid` (string)

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

```ruby
page = client.invoices.list

puts(page)
```

Returns: `file_id` (uuid), `invoice_id` (uuid), `paid` (boolean), `period_end` (date), `period_start` (date), `url` (uri)

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

```ruby
invoice = client.invoices.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(invoice)
```

Returns: `download_url` (uri), `file_id` (uuid), `invoice_id` (uuid), `paid` (boolean), `period_end` (date), `period_start` (date), `url` (uri)

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```ruby
auto_recharge_prefs = client.payment.auto_recharge_prefs.list

puts(auto_recharge_prefs)
```

Returns: `enabled` (boolean), `id` (string), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `record_type` (string), `threshold_amount` (string)

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

Optional: `enabled` (boolean), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `threshold_amount` (string)

```ruby
auto_recharge_pref = client.payment.auto_recharge_prefs.update

puts(auto_recharge_pref)
```

Returns: `enabled` (boolean), `id` (string), `invoice_enabled` (boolean), `preference` (enum: credit_paypal, ach), `recharge_amount` (string), `record_type` (string), `threshold_amount` (string)

## List User Tags

List all user tags.

`GET /user_tags`

```ruby
user_tags = client.user_tags.list

puts(user_tags)
```

Returns: `number_tags` (array[string]), `outbound_profile_tags` (array[string])

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions` — Required: `amount`

```ruby
response = client.payment.create_stored_payment_transaction(amount: "120.00")

puts(response)
```

Returns: `amount_cents` (integer), `amount_currency` (string), `auto_recharge` (boolean), `created_at` (date-time), `id` (string), `processor_status` (string), `record_type` (enum: transaction), `transaction_processing_type` (enum: stored_payment)

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

```ruby
page = client.webhook_deliveries.list

puts(page)
```

Returns: `attempts` (array[object]), `finished_at` (date-time), `id` (uuid), `record_type` (string), `started_at` (date-time), `status` (enum: delivered, failed), `user_id` (uuid), `webhook` (object)

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

```ruby
webhook_delivery = client.webhook_deliveries.retrieve("C9C0797E-901D-4349-A33C-C2C8F31A92C2")

puts(webhook_delivery)
```

Returns: `attempts` (array[object]), `finished_at` (date-time), `id` (uuid), `record_type` (string), `started_at` (date-time), `status` (enum: delivered, failed), `user_id` (uuid), `webhook` (object)
