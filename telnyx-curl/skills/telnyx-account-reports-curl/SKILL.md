---
name: telnyx-account-reports-curl
description: >-
  Usage reports for billing, analytics, and reconciliation.
metadata:
  author: telnyx
  product: account-reports
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - curl

## Core Workflow

### Steps

1. **Generate usage report**
2. **Download CSV**

### Common mistakes

- Reports are generated asynchronously — poll the status until completed, then download

**Related skills**: telnyx-account-curl

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

## List call events

Filters call events by given filter parameters. Events are ordered by `occurred_at`. If filter for `leg_id` or `application_session_id` is not present, it only filters events from the last 24 hours.

`GET /call_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/call_events"
```

Key response fields: `.data.name, .data.type, .data.call_leg_id`

## Create a ledger billing group report

`POST /ledger_billing_group_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | No | Year of the ledger billing group report |
| `month` | integer | No | Month of the ledger billing group report |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "year": 2019,
  "month": 10
}' \
  "https://api.telnyx.com/v2/ledger_billing_group_reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a ledger billing group report

`GET /ledger_billing_group_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the ledger billing group report |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ledger_billing_group_reports/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/messaging`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`POST /legacy/reporting/batch_detail_records/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string (date-time) | Yes | Start time in ISO format |
| `end_time` | string (date-time) | Yes | End time in ISO format. |
| `timezone` | string | No | Timezone for the report |
| `directions` | array[integer] | No | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `record_types` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "start_time": "2024-02-01T00:00:00Z",
  "end_time": "2024-02-12T23:59:59Z"
}' \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`GET /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/voice`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`POST /legacy/reporting/batch_detail_records/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string (date-time) | Yes | Start time in ISO format |
| `end_time` | string (date-time) | Yes | End time in ISO format |
| `timezone` | string | No | Timezone for the report |
| `call_types` | array[integer] | No | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `record_types` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "start_time": "2024-02-01T00:00:00Z",
  "end_time": "2024-02-12T23:59:59Z"
}' \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`GET /legacy/reporting/batch_detail_records/voice/fields`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice/fields"
```

Key response fields: `.data.Billing, .data.Interaction Data, .data.Number Information`

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`GET /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a CDR report request

Deletes a specific CDR report request by ID

`DELETE /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`GET /legacy/reporting/usage_reports/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `per_page` | integer | No | Size of the page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`POST /legacy/reporting/usage_reports/messaging`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get an MDR usage report

Fetch single MDR usage report by id.

`GET /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`DELETE /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`GET /legacy/reporting/usage_reports/number_lookup`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Submit telco data usage report

Submit a new telco data usage report

`POST /legacy/reporting/usage_reports/number_lookup`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`GET /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup/550e8400-e29b-41d4-a716-446655440000"
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`GET /legacy/reporting/usage_reports/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `per_page` | integer | No | Size of the page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`POST /legacy/reporting/usage_reports/voice`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a CDR usage report

Fetch single cdr usage report by id.

`GET /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`DELETE /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List CSV downloads

`GET /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/csv_downloads"
```

Key response fields: `.data.id, .data.status, .data.url`

## Create a CSV download

`POST /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `csv_format` | enum (V1, V2) | No | Which format to use when generating the CSV file. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/csv_downloads"
```

Key response fields: `.data.id, .data.status, .data.url`

## Retrieve a CSV download

`GET /phone_numbers/csv_downloads/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the CSV download. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/csv_downloads/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.url`

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously. This endpoint will both generate and fetch the voice report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`GET /reports/cdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | No |  |
| `end_date` | string (date-time) | No |  |
| `connections` | array[number] | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/cdr_usage_reports/sync?start_date=2020-07-01T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00&aggregation_type=NO_AGGREGATION&product_breakdown=NO_BREAKDOWN&connections=[1234567890123]"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Fetch all Messaging usage reports

Fetch all messaging usage reports. Usage reports are aggregated messaging data for specified time period and breakdown

`GET /reports/mdr_usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdr_usage_reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create MDR Usage Report

Submit request for new new messaging usage report. This endpoint will pull and aggregate messaging data in specified time period.

`POST /reports/mdr_usage_reports`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/reports/mdr_usage_reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously. This endpoint will both generate and fetch the messaging report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`GET /reports/mdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | No |  |
| `end_date` | string (date-time) | No |  |
| `profiles` | array[string] | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdr_usage_reports/sync?start_date=2020-07-01T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00&aggregation_type=PROFILE&profiles=['My profile']"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve messaging report

Fetch a single messaging usage report by id

`GET /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdr_usage_reports/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete MDR Usage Report

Delete messaging usage report by id

`DELETE /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/reports/mdr_usage_reports/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Fetch all Mdr records

`GET /reports/mdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `direction` | enum (INBOUND, OUTBOUND) | No | Direction (inbound or outbound) |
| `status` | enum (GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, ...) | No | Message status |
| `message_type` | enum (SMS, MMS) | No | Type of message |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdrs?id=e093fbe0-5bde-11eb-ae93-0242ac130002&direction=INBOUND&profile=My profile&cld=+15551237654&cli=+15551237654&status=DELIVERED&message_type=SMS"
```

Key response fields: `.data.id, .data.status, .data.direction`

## Fetches all Wdr records

Fetch all Wdr records

`GET /reports/wdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_group_id` | string (UUID) | No | Sim group unique identifier |
| `sim_card_id` | string (UUID) | No | Sim card unique identifier |
| `start_date` | string | No | Start date |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/wdrs?start_date=2021-05-01T00:00:00Z&end_date=2021-06-01T00:00:00Z&id=e093fbe0-5bde-11eb-ae93-0242ac130002&mcc=204&mnc=01&imsi=123456&sim_group_name=sim name&sim_group_id=f05a189f-7c46-4531-ac56-1460dc465a42&sim_card_id=877f80a6-e5b2-4687-9a04-88076265720f&phone_number=+12345678910&sort=['created_at']"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Get metadata overview

Returns all available record types and supported query parameters for session analysis.

`GET /session_analysis/metadata`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/session_analysis/metadata"
```

Key response fields: `.data.meta, .data.query_parameters, .data.record_types`

## Get record type metadata

Returns detailed metadata for a specific record type, including relationships and examples.

`GET /session_analysis/metadata/{record_type}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `record_type` | string | Yes | The record type identifier (e.g. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/session_analysis/metadata/{record_type}"
```

Key response fields: `.data.aliases, .data.child_relationships, .data.event`

## Get session analysis

Retrieves a full session analysis tree for a given event, including costs, child events, and product linkages.

`GET /session_analysis/{record_type}/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `record_type` | string | Yes | The record type identifier. |
| `event_id` | string (UUID) | Yes | The event identifier (UUID). |
| `expand` | enum (record, none) | No | Controls what data to expand on each event node. |
| `include_children` | boolean | No | Whether to include child events in the response. |
| `max_depth` | integer | No | Maximum traversal depth for the event tree. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/session_analysis/{record_type}/{event_id}"
```

Key response fields: `.data.status, .data.created_at, .data.completed_at`

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`GET /usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (csv, json) | No | Specify the response format (csv or json). |
| `start_date` | string | No | The start date for the time range you are interested in. |
| `end_date` | string | No | The end date for the time range you are interested in. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/usage_reports"
```

Key response fields: `.data.data, .data.meta`

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`GET /usage_reports/options`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product` | string | No | Options (dimensions and metrics) for a given product. |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/usage_reports/options"
```

Key response fields: `.data.product, .data.product_dimensions, .data.product_metrics`

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`GET /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless/detail_records_reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`POST /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string | No | ISO 8601 formatted date-time indicating the start time. |
| `end_time` | string | No | ISO 8601 formatted date-time indicating the end time. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/wireless/detail_records_reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`GET /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless/detail_records_reports/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`DELETE /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireless/detail_records_reports/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
