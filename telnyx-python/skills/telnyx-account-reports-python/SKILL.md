---
name: telnyx-account-reports-python
description: >-
  Usage reports for billing, analytics, and reconciliation.
metadata:
  author: telnyx
  product: account-reports
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - Python

## Core Workflow

### Steps

1. **Generate usage report**: `client.reports.create(...)`
2. **Download CSV**: `client.csv_downloads.retrieve(id=...)`

### Common mistakes

- Reports are generated asynchronously — poll the status until completed, then download

**Related skills**: telnyx-account-python

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
    result = client.reports.create(params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List call events

Filters call events by given filter parameters. Events are ordered by `occurred_at`. If filter for `leg_id` or `application_session_id` is not present, it only filters events from the last 24 hours.

`client.call_events.list()` — `GET /call_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.call_events.list()
page = page.data[0]
print(page.call_leg_id)
```

Key response fields: `response.data.name, response.data.type, response.data.call_leg_id`

## Create a ledger billing group report

`client.ledger_billing_group_reports.create()` — `POST /ledger_billing_group_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | No | Year of the ledger billing group report |
| `month` | integer | No | Month of the ledger billing group report |

```python
ledger_billing_group_report = client.ledger_billing_group_reports.create(
    month=10,
    year=2019,
)
print(ledger_billing_group_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a ledger billing group report

`client.ledger_billing_group_reports.retrieve()` — `GET /ledger_billing_group_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the ledger billing group report |

```python
ledger_billing_group_report = client.ledger_billing_group_reports.retrieve(
    "f5586561-8ff0-4291-a0ac-84fe544797bd",
)
print(ledger_billing_group_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`client.legacy.reporting.batch_detail_records.messaging.list()` — `GET /legacy/reporting/batch_detail_records/messaging`

```python
messagings = client.legacy.reporting.batch_detail_records.messaging.list()
print(messagings.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`client.legacy.reporting.batch_detail_records.messaging.create()` — `POST /legacy/reporting/batch_detail_records/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string (date-time) | Yes | Start time in ISO format |
| `end_time` | string (date-time) | Yes | End time in ISO format. |
| `timezone` | string | No | Timezone for the report |
| `directions` | array[integer] | No | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `record_types` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```python
from datetime import datetime

messaging = client.legacy.reporting.batch_detail_records.messaging.create(
    end_time=datetime.fromisoformat("2024-02-12T23:59:59"),
    start_time=datetime.fromisoformat("2024-02-01T00:00:00"),
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`client.legacy.reporting.batch_detail_records.messaging.retrieve()` — `GET /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
messaging = client.legacy.reporting.batch_detail_records.messaging.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`client.legacy.reporting.batch_detail_records.messaging.delete()` — `DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
messaging = client.legacy.reporting.batch_detail_records.messaging.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`client.legacy.reporting.batch_detail_records.voice.list()` — `GET /legacy/reporting/batch_detail_records/voice`

```python
voices = client.legacy.reporting.batch_detail_records.voice.list()
print(voices.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`client.legacy.reporting.batch_detail_records.voice.create()` — `POST /legacy/reporting/batch_detail_records/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string (date-time) | Yes | Start time in ISO format |
| `end_time` | string (date-time) | Yes | End time in ISO format |
| `timezone` | string | No | Timezone for the report |
| `call_types` | array[integer] | No | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `record_types` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```python
from datetime import datetime

voice = client.legacy.reporting.batch_detail_records.voice.create(
    end_time=datetime.fromisoformat("2024-02-12T23:59:59"),
    start_time=datetime.fromisoformat("2024-02-01T00:00:00"),
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`client.legacy.reporting.batch_detail_records.voice.retrieve_fields()` — `GET /legacy/reporting/batch_detail_records/voice/fields`

```python
response = client.legacy.reporting.batch_detail_records.voice.retrieve_fields()
print(response.billing)
```

Key response fields: `response.data.Billing, response.data.Interaction Data, response.data.Number Information`

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`client.legacy.reporting.batch_detail_records.voice.retrieve()` — `GET /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
voice = client.legacy.reporting.batch_detail_records.voice.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a CDR report request

Deletes a specific CDR report request by ID

`client.legacy.reporting.batch_detail_records.voice.delete()` — `DELETE /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
voice = client.legacy.reporting.batch_detail_records.voice.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`client.legacy.reporting.usage_reports.messaging.list()` — `GET /legacy/reporting/usage_reports/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `per_page` | integer | No | Size of the page |

```python
page = client.legacy.reporting.usage_reports.messaging.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`client.legacy.reporting.usage_reports.messaging.create()` — `POST /legacy/reporting/usage_reports/messaging`

```python
messaging = client.legacy.reporting.usage_reports.messaging.create(
    aggregation_type=0,
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get an MDR usage report

Fetch single MDR usage report by id.

`client.legacy.reporting.usage_reports.messaging.retrieve()` — `GET /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
messaging = client.legacy.reporting.usage_reports.messaging.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`client.legacy.reporting.usage_reports.messaging.delete()` — `DELETE /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
messaging = client.legacy.reporting.usage_reports.messaging.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(messaging.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`client.legacy.reporting.usage_reports.number_lookup.list()` — `GET /legacy/reporting/usage_reports/number_lookup`

```python
number_lookups = client.legacy.reporting.usage_reports.number_lookup.list()
print(number_lookups.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit telco data usage report

Submit a new telco data usage report

`client.legacy.reporting.usage_reports.number_lookup.create()` — `POST /legacy/reporting/usage_reports/number_lookup`

```python
number_lookup = client.legacy.reporting.usage_reports.number_lookup.create()
print(number_lookup.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`client.legacy.reporting.usage_reports.number_lookup.retrieve()` — `GET /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
number_lookup = client.legacy.reporting.usage_reports.number_lookup.retrieve(
    "id",
)
print(number_lookup.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`client.legacy.reporting.usage_reports.number_lookup.delete()` — `DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
client.legacy.reporting.usage_reports.number_lookup.delete(
    "id",
)
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`client.legacy.reporting.usage_reports.voice.list()` — `GET /legacy/reporting/usage_reports/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `per_page` | integer | No | Size of the page |

```python
page = client.legacy.reporting.usage_reports.voice.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`client.legacy.reporting.usage_reports.voice.create()` — `POST /legacy/reporting/usage_reports/voice`

```python
from datetime import datetime

voice = client.legacy.reporting.usage_reports.voice.create(
    end_time=datetime.fromisoformat("2024-02-01T00:00:00"),
    start_time=datetime.fromisoformat("2024-02-01T00:00:00"),
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a CDR usage report

Fetch single cdr usage report by id.

`client.legacy.reporting.usage_reports.voice.retrieve()` — `GET /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
voice = client.legacy.reporting.usage_reports.voice.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`client.legacy.reporting.usage_reports.voice.delete()` — `DELETE /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
voice = client.legacy.reporting.usage_reports.voice.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(voice.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List CSV downloads

`client.phone_numbers.csv_downloads.list()` — `GET /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.phone_numbers.csv_downloads.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Create a CSV download

`client.phone_numbers.csv_downloads.create()` — `POST /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `csv_format` | enum (V1, V2) | No | Which format to use when generating the CSV file. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
csv_download = client.phone_numbers.csv_downloads.create()
print(csv_download.data)
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Retrieve a CSV download

`client.phone_numbers.csv_downloads.retrieve()` — `GET /phone_numbers/csv_downloads/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the CSV download. |

```python
csv_download = client.phone_numbers.csv_downloads.retrieve(
    "id",
)
print(csv_download.data)
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously. This endpoint will both generate and fetch the voice report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.reports.cdr_usage_reports.fetch_sync()` — `GET /reports/cdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | No |  |
| `end_date` | string (date-time) | No |  |
| `connections` | array[number] | No |  |

```python
response = client.reports.cdr_usage_reports.fetch_sync(
    aggregation_type="NO_AGGREGATION",
    product_breakdown="NO_BREAKDOWN",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Messaging usage reports

Fetch all messaging usage reports. Usage reports are aggregated messaging data for specified time period and breakdown

`client.reports.mdr_usage_reports.list()` — `GET /reports/mdr_usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.reports.mdr_usage_reports.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create MDR Usage Report

Submit request for new new messaging usage report. This endpoint will pull and aggregate messaging data in specified time period.

`client.reports.mdr_usage_reports.create()` — `POST /reports/mdr_usage_reports`

```python
from datetime import datetime

mdr_usage_report = client.reports.mdr_usage_reports.create(
    aggregation_type="NO_AGGREGATION",
    end_date=datetime.fromisoformat("2020-07-01T00:00:00-06:00"),
    start_date=datetime.fromisoformat("2020-07-01T00:00:00-06:00"),
)
print(mdr_usage_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously. This endpoint will both generate and fetch the messaging report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.reports.mdr_usage_reports.fetch_sync()` — `GET /reports/mdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | No |  |
| `end_date` | string (date-time) | No |  |
| `profiles` | array[string] | No |  |

```python
response = client.reports.mdr_usage_reports.fetch_sync(
    aggregation_type="PROFILE",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve messaging report

Fetch a single messaging usage report by id

`client.reports.mdr_usage_reports.retrieve()` — `GET /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
mdr_usage_report = client.reports.mdr_usage_reports.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(mdr_usage_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete MDR Usage Report

Delete messaging usage report by id

`client.reports.mdr_usage_reports.delete()` — `DELETE /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
mdr_usage_report = client.reports.mdr_usage_reports.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(mdr_usage_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Mdr records

`client.reports.list_mdrs()` — `GET /reports/mdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `direction` | enum (INBOUND, OUTBOUND) | No | Direction (inbound or outbound) |
| `status` | enum (GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, ...) | No | Message status |
| `message_type` | enum (SMS, MMS) | No | Type of message |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.reports.list_mdrs()
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.direction`

## Fetches all Wdr records

Fetch all Wdr records

`client.reports.list_wdrs()` — `GET /reports/wdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_group_id` | string (UUID) | No | Sim group unique identifier |
| `sim_card_id` | string (UUID) | No | Sim card unique identifier |
| `start_date` | string | No | Start date |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.reports.list_wdrs()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Get metadata overview

Returns all available record types and supported query parameters for session analysis.

`client.session_analysis.metadata.retrieve()` — `GET /session_analysis/metadata`

```python
metadata = client.session_analysis.metadata.retrieve()
print(metadata.meta)
```

Key response fields: `response.data.meta, response.data.query_parameters, response.data.record_types`

## Get record type metadata

Returns detailed metadata for a specific record type, including relationships and examples.

`client.session_analysis.metadata.retrieve_record_type()` — `GET /session_analysis/metadata/{record_type}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `record_type` | string | Yes | The record type identifier (e.g. |

```python
response = client.session_analysis.metadata.retrieve_record_type(
    "record_type",
)
print(response.aliases)
```

Key response fields: `response.data.aliases, response.data.child_relationships, response.data.event`

## Get session analysis

Retrieves a full session analysis tree for a given event, including costs, child events, and product linkages.

`client.session_analysis.retrieve()` — `GET /session_analysis/{record_type}/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `record_type` | string | Yes | The record type identifier. |
| `event_id` | string (UUID) | Yes | The event identifier (UUID). |
| `expand` | enum (record, none) | No | Controls what data to expand on each event node. |
| `include_children` | boolean | No | Whether to include child events in the response. |
| `max_depth` | integer | No | Maximum traversal depth for the event tree. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
session_analysis = client.session_analysis.retrieve(
    event_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    record_type="record_type",
)
print(session_analysis.session_id)
```

Key response fields: `response.data.status, response.data.created_at, response.data.completed_at`

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`client.usage_reports.list()` — `GET /usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (csv, json) | No | Specify the response format (csv or json). |
| `start_date` | string | No | The start date for the time range you are interested in. |
| `end_date` | string | No | The end date for the time range you are interested in. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.usage_reports.list(
    dimensions=["string"],
    metrics=["string"],
    product="wireless",
)
page = page.data[0]
print(page)
```

Key response fields: `response.data.data, response.data.meta`

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`client.usage_reports.get_options()` — `GET /usage_reports/options`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product` | string | No | Options (dimensions and metrics) for a given product. |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```python
response = client.usage_reports.get_options()
print(response.data)
```

Key response fields: `response.data.product, response.data.product_dimensions, response.data.product_metrics`

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`client.wireless.detail_records_reports.list()` — `GET /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```python
detail_records_reports = client.wireless.detail_records_reports.list()
print(detail_records_reports.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`client.wireless.detail_records_reports.create()` — `POST /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string | No | ISO 8601 formatted date-time indicating the start time. |
| `end_time` | string | No | ISO 8601 formatted date-time indicating the end time. |

```python
detail_records_report = client.wireless.detail_records_reports.create()
print(detail_records_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`client.wireless.detail_records_reports.retrieve()` — `GET /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
detail_records_report = client.wireless.detail_records_reports.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(detail_records_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`client.wireless.detail_records_reports.delete()` — `DELETE /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
detail_records_report = client.wireless.detail_records_reports.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(detail_records_report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
