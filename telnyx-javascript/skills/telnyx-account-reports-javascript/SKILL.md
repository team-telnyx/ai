---
name: telnyx-account-reports-javascript
description: >-
  Usage reports for billing, analytics, and reconciliation.
metadata:
  author: telnyx
  product: account-reports
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - JavaScript

## Core Workflow

### Steps

1. **Generate usage report**: `client.reports.create({...: ...})`
2. **Download CSV**: `client.csvDownloads.retrieve({id: ...})`

### Common mistakes

- Reports are generated asynchronously — poll the status until completed, then download

**Related skills**: telnyx-account-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.reports.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List call events

Filters call events by given filter parameters. Events are ordered by `occurred_at`. If filter for `leg_id` or `application_session_id` is not present, it only filters events from the last 24 hours.

`client.callEvents.list()` — `GET /call_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const callEventListResponse of client.callEvents.list()) {
  console.log(callEventListResponse.call_leg_id);
}
```

Key response fields: `response.data.name, response.data.type, response.data.call_leg_id`

## Create a ledger billing group report

`client.ledgerBillingGroupReports.create()` — `POST /ledger_billing_group_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | No | Year of the ledger billing group report |
| `month` | integer | No | Month of the ledger billing group report |

```javascript
const ledgerBillingGroupReport = await client.ledgerBillingGroupReports.create({
  month: 10,
  year: 2019,
});

console.log(ledgerBillingGroupReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a ledger billing group report

`client.ledgerBillingGroupReports.retrieve()` — `GET /ledger_billing_group_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the ledger billing group report |

```javascript
const ledgerBillingGroupReport = await client.ledgerBillingGroupReports.retrieve(
  'f5586561-8ff0-4291-a0ac-84fe544797bd',
);

console.log(ledgerBillingGroupReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`client.legacy.reporting.batchDetailRecords.messaging.list()` — `GET /legacy/reporting/batch_detail_records/messaging`

```javascript
const messagings = await client.legacy.reporting.batchDetailRecords.messaging.list();

console.log(messagings.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`client.legacy.reporting.batchDetailRecords.messaging.create()` — `POST /legacy/reporting/batch_detail_records/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string (date-time) | Yes | Start time in ISO format |
| `endTime` | string (date-time) | Yes | End time in ISO format. |
| `timezone` | string | No | Timezone for the report |
| `directions` | array[integer] | No | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `recordTypes` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const messaging = await client.legacy.reporting.batchDetailRecords.messaging.create({
  end_time: '2024-02-12T23:59:59Z',
  start_time: '2024-02-01T00:00:00Z',
});

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`client.legacy.reporting.batchDetailRecords.messaging.retrieve()` — `GET /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const messaging = await client.legacy.reporting.batchDetailRecords.messaging.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`client.legacy.reporting.batchDetailRecords.messaging.delete()` — `DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const messaging = await client.legacy.reporting.batchDetailRecords.messaging.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`client.legacy.reporting.batchDetailRecords.voice.list()` — `GET /legacy/reporting/batch_detail_records/voice`

```javascript
const voices = await client.legacy.reporting.batchDetailRecords.voice.list();

console.log(voices.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`client.legacy.reporting.batchDetailRecords.voice.create()` — `POST /legacy/reporting/batch_detail_records/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string (date-time) | Yes | Start time in ISO format |
| `endTime` | string (date-time) | Yes | End time in ISO format |
| `timezone` | string | No | Timezone for the report |
| `callTypes` | array[integer] | No | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `recordTypes` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const voice = await client.legacy.reporting.batchDetailRecords.voice.create({
  end_time: '2024-02-12T23:59:59Z',
  start_time: '2024-02-01T00:00:00Z',
});

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`client.legacy.reporting.batchDetailRecords.voice.retrieveFields()` — `GET /legacy/reporting/batch_detail_records/voice/fields`

```javascript
const response = await client.legacy.reporting.batchDetailRecords.voice.retrieveFields();

console.log(response.Billing);
```

Key response fields: `response.data.Billing, response.data.Interaction Data, response.data.Number Information`

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`client.legacy.reporting.batchDetailRecords.voice.retrieve()` — `GET /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const voice = await client.legacy.reporting.batchDetailRecords.voice.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a CDR report request

Deletes a specific CDR report request by ID

`client.legacy.reporting.batchDetailRecords.voice.delete()` — `DELETE /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const voice = await client.legacy.reporting.batchDetailRecords.voice.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`client.legacy.reporting.usageReports.messaging.list()` — `GET /legacy/reporting/usage_reports/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `perPage` | integer | No | Size of the page |

```javascript
// Automatically fetches more pages as needed.
for await (const mdrUsageReportResponseLegacy of client.legacy.reporting.usageReports.messaging.list()) {
  console.log(mdrUsageReportResponseLegacy.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`client.legacy.reporting.usageReports.messaging.create()` — `POST /legacy/reporting/usage_reports/messaging`

```javascript
const messaging = await client.legacy.reporting.usageReports.messaging.create({
  aggregation_type: 0,
});

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get an MDR usage report

Fetch single MDR usage report by id.

`client.legacy.reporting.usageReports.messaging.retrieve()` — `GET /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const messaging = await client.legacy.reporting.usageReports.messaging.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`client.legacy.reporting.usageReports.messaging.delete()` — `DELETE /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const messaging = await client.legacy.reporting.usageReports.messaging.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`client.legacy.reporting.usageReports.numberLookup.list()` — `GET /legacy/reporting/usage_reports/number_lookup`

```javascript
const numberLookups = await client.legacy.reporting.usageReports.numberLookup.list();

console.log(numberLookups.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit telco data usage report

Submit a new telco data usage report

`client.legacy.reporting.usageReports.numberLookup.create()` — `POST /legacy/reporting/usage_reports/number_lookup`

```javascript
const numberLookup = await client.legacy.reporting.usageReports.numberLookup.create();

console.log(numberLookup.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`client.legacy.reporting.usageReports.numberLookup.retrieve()` — `GET /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const numberLookup = await client.legacy.reporting.usageReports.numberLookup.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(numberLookup.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`client.legacy.reporting.usageReports.numberLookup.delete()` — `DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
await client.legacy.reporting.usageReports.numberLookup.delete('550e8400-e29b-41d4-a716-446655440000');
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`client.legacy.reporting.usageReports.voice.list()` — `GET /legacy/reporting/usage_reports/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `perPage` | integer | No | Size of the page |

```javascript
// Automatically fetches more pages as needed.
for await (const cdrUsageReportResponseLegacy of client.legacy.reporting.usageReports.voice.list()) {
  console.log(cdrUsageReportResponseLegacy.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`client.legacy.reporting.usageReports.voice.create()` — `POST /legacy/reporting/usage_reports/voice`

```javascript
const voice = await client.legacy.reporting.usageReports.voice.create({
  end_time: '2024-02-01T00:00:00Z',
  start_time: '2024-02-01T00:00:00Z',
});

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a CDR usage report

Fetch single cdr usage report by id.

`client.legacy.reporting.usageReports.voice.retrieve()` — `GET /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const voice = await client.legacy.reporting.usageReports.voice.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`client.legacy.reporting.usageReports.voice.delete()` — `DELETE /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const voice = await client.legacy.reporting.usageReports.voice.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List CSV downloads

`client.phoneNumbers.csvDownloads.list()` — `GET /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const csvDownload of client.phoneNumbers.csvDownloads.list()) {
  console.log(csvDownload.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Create a CSV download

`client.phoneNumbers.csvDownloads.create()` — `POST /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `csvFormat` | enum (V1, V2) | No | Which format to use when generating the CSV file. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const csvDownload = await client.phoneNumbers.csvDownloads.create();

console.log(csvDownload.data);
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Retrieve a CSV download

`client.phoneNumbers.csvDownloads.retrieve()` — `GET /phone_numbers/csv_downloads/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the CSV download. |

```javascript
const csvDownload = await client.phoneNumbers.csvDownloads.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(csvDownload.data);
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously. This endpoint will both generate and fetch the voice report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.reports.cdrUsageReports.fetchSync()` — `GET /reports/cdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (date-time) | No |  |
| `endDate` | string (date-time) | No |  |
| `connections` | array[number] | No |  |

```javascript
const response = await client.reports.cdrUsageReports.fetchSync({
  aggregation_type: 'NO_AGGREGATION',
  product_breakdown: 'NO_BREAKDOWN',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Messaging usage reports

Fetch all messaging usage reports. Usage reports are aggregated messaging data for specified time period and breakdown

`client.reports.mdrUsageReports.list()` — `GET /reports/mdr_usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const mdrUsageReport of client.reports.mdrUsageReports.list()) {
  console.log(mdrUsageReport.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create MDR Usage Report

Submit request for new new messaging usage report. This endpoint will pull and aggregate messaging data in specified time period.

`client.reports.mdrUsageReports.create()` — `POST /reports/mdr_usage_reports`

```javascript
const mdrUsageReport = await client.reports.mdrUsageReports.create({
  aggregation_type: 'NO_AGGREGATION',
  end_date: '2020-07-01T00:00:00-06:00',
  start_date: '2020-07-01T00:00:00-06:00',
});

console.log(mdrUsageReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously. This endpoint will both generate and fetch the messaging report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.reports.mdrUsageReports.fetchSync()` — `GET /reports/mdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (date-time) | No |  |
| `endDate` | string (date-time) | No |  |
| `profiles` | array[string] | No |  |

```javascript
const response = await client.reports.mdrUsageReports.fetchSync({ aggregation_type: 'PROFILE' });

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve messaging report

Fetch a single messaging usage report by id

`client.reports.mdrUsageReports.retrieve()` — `GET /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const mdrUsageReport = await client.reports.mdrUsageReports.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(mdrUsageReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete MDR Usage Report

Delete messaging usage report by id

`client.reports.mdrUsageReports.delete()` — `DELETE /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const mdrUsageReport = await client.reports.mdrUsageReports.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(mdrUsageReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Mdr records

`client.reports.listMdrs()` — `GET /reports/mdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `direction` | enum (INBOUND, OUTBOUND) | No | Direction (inbound or outbound) |
| `status` | enum (GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, ...) | No | Message status |
| `messageType` | enum (SMS, MMS) | No | Type of message |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.reports.listMdrs();

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.direction`

## Fetches all Wdr records

Fetch all Wdr records

`client.reports.listWdrs()` — `GET /reports/wdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simGroupId` | string (UUID) | No | Sim group unique identifier |
| `simCardId` | string (UUID) | No | Sim card unique identifier |
| `startDate` | string | No | Start date |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const reportListWdrsResponse of client.reports.listWdrs()) {
  console.log(reportListWdrsResponse.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Get metadata overview

Returns all available record types and supported query parameters for session analysis.

`client.sessionAnalysis.metadata.retrieve()` — `GET /session_analysis/metadata`

```javascript
const metadata = await client.sessionAnalysis.metadata.retrieve();

console.log(metadata.meta);
```

Key response fields: `response.data.meta, response.data.query_parameters, response.data.record_types`

## Get record type metadata

Returns detailed metadata for a specific record type, including relationships and examples.

`client.sessionAnalysis.metadata.retrieveRecordType()` — `GET /session_analysis/metadata/{record_type}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordType` | string | Yes | The record type identifier (e.g. |

```javascript
const response = await client.sessionAnalysis.metadata.retrieveRecordType('record_type');

console.log(response.aliases);
```

Key response fields: `response.data.aliases, response.data.child_relationships, response.data.event`

## Get session analysis

Retrieves a full session analysis tree for a given event, including costs, child events, and product linkages.

`client.sessionAnalysis.retrieve()` — `GET /session_analysis/{record_type}/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordType` | string | Yes | The record type identifier. |
| `eventId` | string (UUID) | Yes | The event identifier (UUID). |
| `expand` | enum (record, none) | No | Controls what data to expand on each event node. |
| `includeChildren` | boolean | No | Whether to include child events in the response. |
| `maxDepth` | integer | No | Maximum traversal depth for the event tree. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const sessionAnalysis = await client.sessionAnalysis.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { record_type: 'record_type' },
);

console.log(sessionAnalysis.session_id);
```

Key response fields: `response.data.status, response.data.created_at, response.data.completed_at`

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`client.usageReports.list()` — `GET /usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (csv, json) | No | Specify the response format (csv or json). |
| `startDate` | string | No | The start date for the time range you are interested in. |
| `endDate` | string | No | The end date for the time range you are interested in. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const usageReportListResponse of client.usageReports.list({
  dimensions: ['string'],
  metrics: ['string'],
  product: 'wireless',
})) {
  console.log(usageReportListResponse);
}
```

Key response fields: `response.data.data, response.data.meta`

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`client.usageReports.getOptions()` — `GET /usage_reports/options`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product` | string | No | Options (dimensions and metrics) for a given product. |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const response = await client.usageReports.getOptions();

console.log(response.data);
```

Key response fields: `response.data.product, response.data.product_dimensions, response.data.product_metrics`

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`client.wireless.detailRecordsReports.list()` — `GET /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```javascript
const detailRecordsReports = await client.wireless.detailRecordsReports.list();

console.log(detailRecordsReports.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`client.wireless.detailRecordsReports.create()` — `POST /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string | No | ISO 8601 formatted date-time indicating the start time. |
| `endTime` | string | No | ISO 8601 formatted date-time indicating the end time. |

```javascript
const detailRecordsReport = await client.wireless.detailRecordsReports.create();

console.log(detailRecordsReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`client.wireless.detailRecordsReports.retrieve()` — `GET /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const detailRecordsReport = await client.wireless.detailRecordsReports.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(detailRecordsReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`client.wireless.detailRecordsReports.delete()` — `DELETE /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const detailRecordsReport = await client.wireless.detailRecordsReports.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(detailRecordsReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
