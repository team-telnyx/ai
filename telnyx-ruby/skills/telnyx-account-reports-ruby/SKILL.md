---
name: telnyx-account-reports-ruby
description: >-
  Generate and retrieve usage reports for billing, analytics, and
  reconciliation. This skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: account-reports
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - Ruby

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

## List call events

Filters call events by given filter parameters.

`GET /call_events`

```ruby
page = client.call_events.list

puts(page)
```

## Create a ledger billing group report

`POST /ledger_billing_group_reports`

Optional: `month` (integer), `year` (integer)

```ruby
ledger_billing_group_report = client.ledger_billing_group_reports.create

puts(ledger_billing_group_report)
```

## Get a ledger billing group report

`GET /ledger_billing_group_reports/{id}`

```ruby
ledger_billing_group_report = client.ledger_billing_group_reports.retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd")

puts(ledger_billing_group_report)
```

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/messaging`

```ruby
messagings = client.legacy.reporting.batch_detail_records.messaging.list

puts(messagings)
```

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`POST /legacy/reporting/batch_detail_records/messaging` — Required: `start_time`, `end_time`

Optional: `connections` (array[integer]), `directions` (array[integer]), `filters` (array[object]), `include_message_body` (boolean), `managed_accounts` (array[string]), `profiles` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `timezone` (string)

```ruby
messaging = client.legacy.reporting.batch_detail_records.messaging.create(
  end_time: "2024-02-12T23:59:59Z",
  start_time: "2024-02-01T00:00:00Z"
)

puts(messaging)
```

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`GET /legacy/reporting/batch_detail_records/messaging/{id}`

```ruby
messaging = client.legacy.reporting.batch_detail_records.messaging.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging)
```

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

```ruby
messaging = client.legacy.reporting.batch_detail_records.messaging.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging)
```

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/voice`

```ruby
voices = client.legacy.reporting.batch_detail_records.voice.list

puts(voices)
```

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`POST /legacy/reporting/batch_detail_records/voice` — Required: `start_time`, `end_time`

Optional: `call_types` (array[integer]), `connections` (array[integer]), `fields` (array[string]), `filters` (array[object]), `include_all_metadata` (boolean), `managed_accounts` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `source` (string), `timezone` (string)

```ruby
voice = client.legacy.reporting.batch_detail_records.voice.create(
  end_time: "2024-02-12T23:59:59Z",
  start_time: "2024-02-01T00:00:00Z"
)

puts(voice)
```

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`GET /legacy/reporting/batch_detail_records/voice/fields`

```ruby
response = client.legacy.reporting.batch_detail_records.voice.retrieve_fields

puts(response)
```

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`GET /legacy/reporting/batch_detail_records/voice/{id}`

```ruby
voice = client.legacy.reporting.batch_detail_records.voice.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(voice)
```

## Delete a CDR report request

Deletes a specific CDR report request by ID

`DELETE /legacy/reporting/batch_detail_records/voice/{id}`

```ruby
voice = client.legacy.reporting.batch_detail_records.voice.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(voice)
```

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`GET /legacy/reporting/usage_reports/messaging`

```ruby
page = client.legacy.reporting.usage_reports.messaging.list

puts(page)
```

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`POST /legacy/reporting/usage_reports/messaging`

```ruby
messaging = client.legacy.reporting.usage_reports.messaging.create(aggregation_type: 0)

puts(messaging)
```

## Get an MDR usage report

Fetch single MDR usage report by id.

`GET /legacy/reporting/usage_reports/messaging/{id}`

```ruby
messaging = client.legacy.reporting.usage_reports.messaging.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging)
```

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`DELETE /legacy/reporting/usage_reports/messaging/{id}`

```ruby
messaging = client.legacy.reporting.usage_reports.messaging.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(messaging)
```

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`GET /legacy/reporting/usage_reports/number_lookup`

```ruby
number_lookups = client.legacy.reporting.usage_reports.number_lookup.list

puts(number_lookups)
```

## Submit telco data usage report

Submit a new telco data usage report

`POST /legacy/reporting/usage_reports/number_lookup`

```ruby
number_lookup = client.legacy.reporting.usage_reports.number_lookup.create

puts(number_lookup)
```

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`GET /legacy/reporting/usage_reports/number_lookup/{id}`

```ruby
number_lookup = client.legacy.reporting.usage_reports.number_lookup.retrieve("id")

puts(number_lookup)
```

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

```ruby
result = client.legacy.reporting.usage_reports.number_lookup.delete("id")

puts(result)
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`GET /legacy/reporting/usage_reports/voice`

```ruby
page = client.legacy.reporting.usage_reports.voice.list

puts(page)
```

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`POST /legacy/reporting/usage_reports/voice`

```ruby
voice = client.legacy.reporting.usage_reports.voice.create(
  end_time: "2024-02-01T00:00:00Z",
  start_time: "2024-02-01T00:00:00Z"
)

puts(voice)
```

## Get a CDR usage report

Fetch single cdr usage report by id.

`GET /legacy/reporting/usage_reports/voice/{id}`

```ruby
voice = client.legacy.reporting.usage_reports.voice.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(voice)
```

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`DELETE /legacy/reporting/usage_reports/voice/{id}`

```ruby
voice = client.legacy.reporting.usage_reports.voice.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(voice)
```

## List CSV downloads

`GET /phone_numbers/csv_downloads`

```ruby
page = client.phone_numbers.csv_downloads.list

puts(page)
```

## Create a CSV download

`POST /phone_numbers/csv_downloads`

```ruby
csv_download = client.phone_numbers.csv_downloads.create

puts(csv_download)
```

## Retrieve a CSV download

`GET /phone_numbers/csv_downloads/{id}`

```ruby
csv_download = client.phone_numbers.csv_downloads.retrieve("id")

puts(csv_download)
```

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously.

`GET /reports/cdr_usage_reports/sync`

```ruby
response = client.reports.cdr_usage_reports.fetch_sync(
  aggregation_type: :NO_AGGREGATION,
  product_breakdown: :NO_BREAKDOWN
)

puts(response)
```

## Fetch all Messaging usage reports

Fetch all messaging usage reports.

`GET /reports/mdr_usage_reports`

```ruby
page = client.reports.mdr_usage_reports.list

puts(page)
```

## Create MDR Usage Report

Submit request for new new messaging usage report.

`POST /reports/mdr_usage_reports`

```ruby
mdr_usage_report = client.reports.mdr_usage_reports.create(
  aggregation_type: :NO_AGGREGATION,
  end_date: "2020-07-01T00:00:00-06:00",
  start_date: "2020-07-01T00:00:00-06:00"
)

puts(mdr_usage_report)
```

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously.

`GET /reports/mdr_usage_reports/sync`

```ruby
response = client.reports.mdr_usage_reports.fetch_sync(aggregation_type: :PROFILE)

puts(response)
```

## Retrieve messaging report

Fetch a single messaging usage report by id

`GET /reports/mdr_usage_reports/{id}`

```ruby
mdr_usage_report = client.reports.mdr_usage_reports.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(mdr_usage_report)
```

## Delete MDR Usage Report

Delete messaging usage report by id

`DELETE /reports/mdr_usage_reports/{id}`

```ruby
mdr_usage_report = client.reports.mdr_usage_reports.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(mdr_usage_report)
```

## Fetch all Mdr records

`GET /reports/mdrs`

```ruby
response = client.reports.list_mdrs

puts(response)
```

## Fetches all Wdr records

Fetch all Wdr records

`GET /reports/wdrs`

```ruby
page = client.reports.list_wdrs

puts(page)
```

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`GET /usage_reports`

```ruby
page = client.usage_reports.list(dimensions: ["string"], metrics: ["string"], product: "product")

puts(page)
```

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`GET /usage_reports/options`

```ruby
response = client.usage_reports.get_options

puts(response)
```
