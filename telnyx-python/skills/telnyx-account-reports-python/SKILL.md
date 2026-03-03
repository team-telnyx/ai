---
name: telnyx-account-reports-python
description: >-
  Generate and retrieve usage reports for billing, analytics, and
  reconciliation. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: account-reports
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - Python

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

## List call events

Filters call events by given filter parameters.

`GET /call_events`

```python
page = client.call_events.list()
page = page.data[0]
print(page.call_leg_id)
```

## Create a ledger billing group report

`POST /ledger_billing_group_reports`

Optional: `month` (integer), `year` (integer)

```python
ledger_billing_group_report = client.ledger_billing_group_reports.create(
    month=10,
    year=2019,
)
print(ledger_billing_group_report.data)
```

## Get a ledger billing group report

`GET /ledger_billing_group_reports/{id}`

```python
ledger_billing_group_report = client.ledger_billing_group_reports.retrieve(
    "f5586561-8ff0-4291-a0ac-84fe544797bd",
)
print(ledger_billing_group_report.data)
```

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/messaging`

```python
messagings = client.legacy.reporting.batch_detail_records.messaging.list()
print(messagings.data)
```

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`POST /legacy/reporting/batch_detail_records/messaging` — Required: `start_time`, `end_time`

Optional: `connections` (array[integer]), `directions` (array[integer]), `filters` (array[object]), `include_message_body` (boolean), `managed_accounts` (array[string]), `profiles` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `timezone` (string)

```python
from datetime import datetime

messaging = client.legacy.reporting.batch_detail_records.messaging.create(
    end_time=datetime.fromisoformat("2024-02-12T23:59:59"),
    start_time=datetime.fromisoformat("2024-02-01T00:00:00"),
)
print(messaging.data)
```

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`GET /legacy/reporting/batch_detail_records/messaging/{id}`

```python
messaging = client.legacy.reporting.batch_detail_records.messaging.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

```python
messaging = client.legacy.reporting.batch_detail_records.messaging.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/voice`

```python
voices = client.legacy.reporting.batch_detail_records.voice.list()
print(voices.data)
```

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`POST /legacy/reporting/batch_detail_records/voice` — Required: `start_time`, `end_time`

Optional: `call_types` (array[integer]), `connections` (array[integer]), `fields` (array[string]), `filters` (array[object]), `include_all_metadata` (boolean), `managed_accounts` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `source` (string), `timezone` (string)

```python
from datetime import datetime

voice = client.legacy.reporting.batch_detail_records.voice.create(
    end_time=datetime.fromisoformat("2024-02-12T23:59:59"),
    start_time=datetime.fromisoformat("2024-02-01T00:00:00"),
)
print(voice.data)
```

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`GET /legacy/reporting/batch_detail_records/voice/fields`

```python
response = client.legacy.reporting.batch_detail_records.voice.retrieve_fields()
print(response.billing)
```

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`GET /legacy/reporting/batch_detail_records/voice/{id}`

```python
voice = client.legacy.reporting.batch_detail_records.voice.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

## Delete a CDR report request

Deletes a specific CDR report request by ID

`DELETE /legacy/reporting/batch_detail_records/voice/{id}`

```python
voice = client.legacy.reporting.batch_detail_records.voice.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`GET /legacy/reporting/usage_reports/messaging`

```python
page = client.legacy.reporting.usage_reports.messaging.list()
page = page.data[0]
print(page.id)
```

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`POST /legacy/reporting/usage_reports/messaging`

```python
messaging = client.legacy.reporting.usage_reports.messaging.create(
    aggregation_type=0,
)
print(messaging.data)
```

## Get an MDR usage report

Fetch single MDR usage report by id.

`GET /legacy/reporting/usage_reports/messaging/{id}`

```python
messaging = client.legacy.reporting.usage_reports.messaging.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`DELETE /legacy/reporting/usage_reports/messaging/{id}`

```python
messaging = client.legacy.reporting.usage_reports.messaging.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`GET /legacy/reporting/usage_reports/number_lookup`

```python
number_lookups = client.legacy.reporting.usage_reports.number_lookup.list()
print(number_lookups.data)
```

## Submit telco data usage report

Submit a new telco data usage report

`POST /legacy/reporting/usage_reports/number_lookup`

```python
number_lookup = client.legacy.reporting.usage_reports.number_lookup.create()
print(number_lookup.data)
```

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`GET /legacy/reporting/usage_reports/number_lookup/{id}`

```python
number_lookup = client.legacy.reporting.usage_reports.number_lookup.retrieve(
    "id",
)
print(number_lookup.data)
```

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

```python
client.legacy.reporting.usage_reports.number_lookup.delete(
    "id",
)
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`GET /legacy/reporting/usage_reports/voice`

```python
page = client.legacy.reporting.usage_reports.voice.list()
page = page.data[0]
print(page.id)
```

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`POST /legacy/reporting/usage_reports/voice`

```python
from datetime import datetime

voice = client.legacy.reporting.usage_reports.voice.create(
    end_time=datetime.fromisoformat("2024-02-01T00:00:00"),
    start_time=datetime.fromisoformat("2024-02-01T00:00:00"),
)
print(voice.data)
```

## Get a CDR usage report

Fetch single cdr usage report by id.

`GET /legacy/reporting/usage_reports/voice/{id}`

```python
voice = client.legacy.reporting.usage_reports.voice.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`DELETE /legacy/reporting/usage_reports/voice/{id}`

```python
voice = client.legacy.reporting.usage_reports.voice.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

## List CSV downloads

`GET /phone_numbers/csv_downloads`

```python
page = client.phone_numbers.csv_downloads.list()
page = page.data[0]
print(page.id)
```

## Create a CSV download

`POST /phone_numbers/csv_downloads`

```python
csv_download = client.phone_numbers.csv_downloads.create()
print(csv_download.data)
```

## Retrieve a CSV download

`GET /phone_numbers/csv_downloads/{id}`

```python
csv_download = client.phone_numbers.csv_downloads.retrieve(
    "id",
)
print(csv_download.data)
```

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously.

`GET /reports/cdr_usage_reports/sync`

```python
response = client.reports.cdr_usage_reports.fetch_sync(
    aggregation_type="NO_AGGREGATION",
    product_breakdown="NO_BREAKDOWN",
)
print(response.data)
```

## Fetch all Messaging usage reports

Fetch all messaging usage reports.

`GET /reports/mdr_usage_reports`

```python
page = client.reports.mdr_usage_reports.list()
page = page.data[0]
print(page.id)
```

## Create MDR Usage Report

Submit request for new new messaging usage report.

`POST /reports/mdr_usage_reports`

```python
from datetime import datetime

mdr_usage_report = client.reports.mdr_usage_reports.create(
    aggregation_type="NO_AGGREGATION",
    end_date=datetime.fromisoformat("2020-07-01T00:00:00-06:00"),
    start_date=datetime.fromisoformat("2020-07-01T00:00:00-06:00"),
)
print(mdr_usage_report.data)
```

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously.

`GET /reports/mdr_usage_reports/sync`

```python
response = client.reports.mdr_usage_reports.fetch_sync(
    aggregation_type="PROFILE",
)
print(response.data)
```

## Retrieve messaging report

Fetch a single messaging usage report by id

`GET /reports/mdr_usage_reports/{id}`

```python
mdr_usage_report = client.reports.mdr_usage_reports.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(mdr_usage_report.data)
```

## Delete MDR Usage Report

Delete messaging usage report by id

`DELETE /reports/mdr_usage_reports/{id}`

```python
mdr_usage_report = client.reports.mdr_usage_reports.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(mdr_usage_report.data)
```

## Fetch all Mdr records

`GET /reports/mdrs`

```python
response = client.reports.list_mdrs()
print(response.data)
```

## Fetches all Wdr records

Fetch all Wdr records

`GET /reports/wdrs`

```python
page = client.reports.list_wdrs()
page = page.data[0]
print(page.id)
```

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`GET /usage_reports`

```python
page = client.usage_reports.list(
    dimensions=["string"],
    metrics=["string"],
    product="product",
)
page = page.data[0]
print(page)
```

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`GET /usage_reports/options`

```python
response = client.usage_reports.get_options()
print(response.data)
```
