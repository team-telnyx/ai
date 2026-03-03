---
name: telnyx-account-reports-javascript
description: >-
  Generate and retrieve usage reports for billing, analytics, and
  reconciliation. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: account-reports
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - JavaScript

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

## List call events

Filters call events by given filter parameters.

`GET /call_events`

```javascript
// Automatically fetches more pages as needed.
for await (const callEventListResponse of client.callEvents.list()) {
  console.log(callEventListResponse.call_leg_id);
}
```

## Create a ledger billing group report

`POST /ledger_billing_group_reports`

Optional: `month` (integer), `year` (integer)

```javascript
const ledgerBillingGroupReport = await client.ledgerBillingGroupReports.create({
  month: 10,
  year: 2019,
});

console.log(ledgerBillingGroupReport.data);
```

## Get a ledger billing group report

`GET /ledger_billing_group_reports/{id}`

```javascript
const ledgerBillingGroupReport = await client.ledgerBillingGroupReports.retrieve(
  'f5586561-8ff0-4291-a0ac-84fe544797bd',
);

console.log(ledgerBillingGroupReport.data);
```

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/messaging`

```javascript
const messagings = await client.legacy.reporting.batchDetailRecords.messaging.list();

console.log(messagings.data);
```

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`POST /legacy/reporting/batch_detail_records/messaging` — Required: `start_time`, `end_time`

Optional: `connections` (array[integer]), `directions` (array[integer]), `filters` (array[object]), `include_message_body` (boolean), `managed_accounts` (array[string]), `profiles` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `timezone` (string)

```javascript
const messaging = await client.legacy.reporting.batchDetailRecords.messaging.create({
  end_time: '2024-02-12T23:59:59Z',
  start_time: '2024-02-01T00:00:00Z',
});

console.log(messaging.data);
```

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`GET /legacy/reporting/batch_detail_records/messaging/{id}`

```javascript
const messaging = await client.legacy.reporting.batchDetailRecords.messaging.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

```javascript
const messaging = await client.legacy.reporting.batchDetailRecords.messaging.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/voice`

```javascript
const voices = await client.legacy.reporting.batchDetailRecords.voice.list();

console.log(voices.data);
```

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`POST /legacy/reporting/batch_detail_records/voice` — Required: `start_time`, `end_time`

Optional: `call_types` (array[integer]), `connections` (array[integer]), `fields` (array[string]), `filters` (array[object]), `include_all_metadata` (boolean), `managed_accounts` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `source` (string), `timezone` (string)

```javascript
const voice = await client.legacy.reporting.batchDetailRecords.voice.create({
  end_time: '2024-02-12T23:59:59Z',
  start_time: '2024-02-01T00:00:00Z',
});

console.log(voice.data);
```

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`GET /legacy/reporting/batch_detail_records/voice/fields`

```javascript
const response = await client.legacy.reporting.batchDetailRecords.voice.retrieveFields();

console.log(response.Billing);
```

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`GET /legacy/reporting/batch_detail_records/voice/{id}`

```javascript
const voice = await client.legacy.reporting.batchDetailRecords.voice.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

## Delete a CDR report request

Deletes a specific CDR report request by ID

`DELETE /legacy/reporting/batch_detail_records/voice/{id}`

```javascript
const voice = await client.legacy.reporting.batchDetailRecords.voice.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`GET /legacy/reporting/usage_reports/messaging`

```javascript
// Automatically fetches more pages as needed.
for await (const mdrUsageReportResponseLegacy of client.legacy.reporting.usageReports.messaging.list()) {
  console.log(mdrUsageReportResponseLegacy.id);
}
```

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`POST /legacy/reporting/usage_reports/messaging`

```javascript
const messaging = await client.legacy.reporting.usageReports.messaging.create({
  aggregation_type: 0,
});

console.log(messaging.data);
```

## Get an MDR usage report

Fetch single MDR usage report by id.

`GET /legacy/reporting/usage_reports/messaging/{id}`

```javascript
const messaging = await client.legacy.reporting.usageReports.messaging.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`DELETE /legacy/reporting/usage_reports/messaging/{id}`

```javascript
const messaging = await client.legacy.reporting.usageReports.messaging.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(messaging.data);
```

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`GET /legacy/reporting/usage_reports/number_lookup`

```javascript
const numberLookups = await client.legacy.reporting.usageReports.numberLookup.list();

console.log(numberLookups.data);
```

## Submit telco data usage report

Submit a new telco data usage report

`POST /legacy/reporting/usage_reports/number_lookup`

```javascript
const numberLookup = await client.legacy.reporting.usageReports.numberLookup.create();

console.log(numberLookup.data);
```

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`GET /legacy/reporting/usage_reports/number_lookup/{id}`

```javascript
const numberLookup = await client.legacy.reporting.usageReports.numberLookup.retrieve('id');

console.log(numberLookup.data);
```

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

```javascript
await client.legacy.reporting.usageReports.numberLookup.delete('id');
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`GET /legacy/reporting/usage_reports/voice`

```javascript
// Automatically fetches more pages as needed.
for await (const cdrUsageReportResponseLegacy of client.legacy.reporting.usageReports.voice.list()) {
  console.log(cdrUsageReportResponseLegacy.id);
}
```

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`POST /legacy/reporting/usage_reports/voice`

```javascript
const voice = await client.legacy.reporting.usageReports.voice.create({
  end_time: '2024-02-01T00:00:00Z',
  start_time: '2024-02-01T00:00:00Z',
});

console.log(voice.data);
```

## Get a CDR usage report

Fetch single cdr usage report by id.

`GET /legacy/reporting/usage_reports/voice/{id}`

```javascript
const voice = await client.legacy.reporting.usageReports.voice.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`DELETE /legacy/reporting/usage_reports/voice/{id}`

```javascript
const voice = await client.legacy.reporting.usageReports.voice.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(voice.data);
```

## List CSV downloads

`GET /phone_numbers/csv_downloads`

```javascript
// Automatically fetches more pages as needed.
for await (const csvDownload of client.phoneNumbers.csvDownloads.list()) {
  console.log(csvDownload.id);
}
```

## Create a CSV download

`POST /phone_numbers/csv_downloads`

```javascript
const csvDownload = await client.phoneNumbers.csvDownloads.create();

console.log(csvDownload.data);
```

## Retrieve a CSV download

`GET /phone_numbers/csv_downloads/{id}`

```javascript
const csvDownload = await client.phoneNumbers.csvDownloads.retrieve('id');

console.log(csvDownload.data);
```

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously.

`GET /reports/cdr_usage_reports/sync`

```javascript
const response = await client.reports.cdrUsageReports.fetchSync({
  aggregation_type: 'NO_AGGREGATION',
  product_breakdown: 'NO_BREAKDOWN',
});

console.log(response.data);
```

## Fetch all Messaging usage reports

Fetch all messaging usage reports.

`GET /reports/mdr_usage_reports`

```javascript
// Automatically fetches more pages as needed.
for await (const mdrUsageReport of client.reports.mdrUsageReports.list()) {
  console.log(mdrUsageReport.id);
}
```

## Create MDR Usage Report

Submit request for new new messaging usage report.

`POST /reports/mdr_usage_reports`

```javascript
const mdrUsageReport = await client.reports.mdrUsageReports.create({
  aggregation_type: 'NO_AGGREGATION',
  end_date: '2020-07-01T00:00:00-06:00',
  start_date: '2020-07-01T00:00:00-06:00',
});

console.log(mdrUsageReport.data);
```

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously.

`GET /reports/mdr_usage_reports/sync`

```javascript
const response = await client.reports.mdrUsageReports.fetchSync({ aggregation_type: 'PROFILE' });

console.log(response.data);
```

## Retrieve messaging report

Fetch a single messaging usage report by id

`GET /reports/mdr_usage_reports/{id}`

```javascript
const mdrUsageReport = await client.reports.mdrUsageReports.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(mdrUsageReport.data);
```

## Delete MDR Usage Report

Delete messaging usage report by id

`DELETE /reports/mdr_usage_reports/{id}`

```javascript
const mdrUsageReport = await client.reports.mdrUsageReports.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(mdrUsageReport.data);
```

## Fetch all Mdr records

`GET /reports/mdrs`

```javascript
const response = await client.reports.listMdrs();

console.log(response.data);
```

## Fetches all Wdr records

Fetch all Wdr records

`GET /reports/wdrs`

```javascript
// Automatically fetches more pages as needed.
for await (const reportListWdrsResponse of client.reports.listWdrs()) {
  console.log(reportListWdrsResponse.id);
}
```

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`GET /usage_reports`

```javascript
// Automatically fetches more pages as needed.
for await (const usageReportListResponse of client.usageReports.list({
  dimensions: ['string'],
  metrics: ['string'],
  product: 'product',
})) {
  console.log(usageReportListResponse);
}
```

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`GET /usage_reports/options`

```javascript
const response = await client.usageReports.getOptions();

console.log(response.data);
```
