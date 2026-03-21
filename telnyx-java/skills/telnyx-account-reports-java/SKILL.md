---
name: telnyx-account-reports-java
description: >-
  Usage reports for billing, analytics, and reconciliation.
metadata:
  author: telnyx
  product: account-reports
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - Java

## Core Workflow

### Steps

1. **Generate usage report**: `client.reports().create(params)`
2. **Download CSV**: `client.csvDownloads().retrieve(params)`

### Common mistakes

- Reports are generated asynchronously — poll the status until completed, then download

**Related skills**: telnyx-account-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.reports().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List call events

Filters call events by given filter parameters. Events are ordered by `occurred_at`. If filter for `leg_id` or `application_session_id` is not present, it only filters events from the last 24 hours.

`client.callEvents().list()` — `GET /call_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.callevents.CallEventListPage;
import com.telnyx.sdk.models.callevents.CallEventListParams;

CallEventListPage page = client.callEvents().list();
```

Key response fields: `response.data.name, response.data.type, response.data.call_leg_id`

## Create a ledger billing group report

`client.ledgerBillingGroupReports().create()` — `POST /ledger_billing_group_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | No | Year of the ledger billing group report |
| `month` | integer | No | Month of the ledger billing group report |

```java
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportCreateParams;
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportCreateResponse;

LedgerBillingGroupReportCreateResponse ledgerBillingGroupReport = client.ledgerBillingGroupReports().create();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a ledger billing group report

`client.ledgerBillingGroupReports().retrieve()` — `GET /ledger_billing_group_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the ledger billing group report |

```java
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportRetrieveParams;
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportRetrieveResponse;

LedgerBillingGroupReportRetrieveResponse ledgerBillingGroupReport = client.ledgerBillingGroupReports().retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`client.legacy().reporting().batchDetailRecords().messaging().list()` — `GET /legacy/reporting/batch_detail_records/messaging`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingListParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingListResponse;

MessagingListResponse messagings = client.legacy().reporting().batchDetailRecords().messaging().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`client.legacy().reporting().batchDetailRecords().messaging().create()` — `POST /legacy/reporting/batch_detail_records/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string (date-time) | Yes | Start time in ISO format |
| `endTime` | string (date-time) | Yes | End time in ISO format. |
| `timezone` | string | No | Timezone for the report |
| `directions` | array[integer] | No | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `recordTypes` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingCreateParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingCreateResponse;
import java.time.OffsetDateTime;

MessagingCreateParams params = MessagingCreateParams.builder()
    .endTime(OffsetDateTime.parse("2024-02-12T23:59:59Z"))
    .startTime(OffsetDateTime.parse("2024-02-01T00:00:00Z"))
    .build();
MessagingCreateResponse messaging = client.legacy().reporting().batchDetailRecords().messaging().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`client.legacy().reporting().batchDetailRecords().messaging().retrieve()` — `GET /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.legacy().reporting().batchDetailRecords().messaging().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`client.legacy().reporting().batchDetailRecords().messaging().delete()` — `DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingDeleteResponse;

MessagingDeleteResponse messaging = client.legacy().reporting().batchDetailRecords().messaging().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`client.legacy().reporting().batchDetailRecords().voice().list()` — `GET /legacy/reporting/batch_detail_records/voice`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceListParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceListResponse;

VoiceListResponse voices = client.legacy().reporting().batchDetailRecords().voice().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`client.legacy().reporting().batchDetailRecords().voice().create()` — `POST /legacy/reporting/batch_detail_records/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string (date-time) | Yes | Start time in ISO format |
| `endTime` | string (date-time) | Yes | End time in ISO format |
| `timezone` | string | No | Timezone for the report |
| `callTypes` | array[integer] | No | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `recordTypes` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceCreateParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceCreateResponse;
import java.time.OffsetDateTime;

VoiceCreateParams params = VoiceCreateParams.builder()
    .endTime(OffsetDateTime.parse("2024-02-12T23:59:59Z"))
    .startTime(OffsetDateTime.parse("2024-02-01T00:00:00Z"))
    .build();
VoiceCreateResponse voice = client.legacy().reporting().batchDetailRecords().voice().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`client.legacy().reporting().batchDetailRecords().voice().retrieveFields()` — `GET /legacy/reporting/batch_detail_records/voice/fields`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveFieldsParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveFieldsResponse;

VoiceRetrieveFieldsResponse response = client.legacy().reporting().batchDetailRecords().voice().retrieveFields();
```

Key response fields: `response.data.Billing, response.data.Interaction Data, response.data.Number Information`

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`client.legacy().reporting().batchDetailRecords().voice().retrieve()` — `GET /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveResponse;

VoiceRetrieveResponse voice = client.legacy().reporting().batchDetailRecords().voice().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a CDR report request

Deletes a specific CDR report request by ID

`client.legacy().reporting().batchDetailRecords().voice().delete()` — `DELETE /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceDeleteResponse;

VoiceDeleteResponse voice = client.legacy().reporting().batchDetailRecords().voice().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`client.legacy().reporting().usageReports().messaging().list()` — `GET /legacy/reporting/usage_reports/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `perPage` | integer | No | Size of the page |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingListPage;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingListParams;

MessagingListPage page = client.legacy().reporting().usageReports().messaging().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`client.legacy().reporting().usageReports().messaging().create()` — `POST /legacy/reporting/usage_reports/messaging`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingCreateParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingCreateResponse;

MessagingCreateParams params = MessagingCreateParams.builder()
    .aggregationType(0)
    .build();
MessagingCreateResponse messaging = client.legacy().reporting().usageReports().messaging().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get an MDR usage report

Fetch single MDR usage report by id.

`client.legacy().reporting().usageReports().messaging().retrieve()` — `GET /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.legacy().reporting().usageReports().messaging().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`client.legacy().reporting().usageReports().messaging().delete()` — `DELETE /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingDeleteResponse;

MessagingDeleteResponse messaging = client.legacy().reporting().usageReports().messaging().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`client.legacy().reporting().usageReports().numberLookup().list()` — `GET /legacy/reporting/usage_reports/number_lookup`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupListParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupListResponse;

NumberLookupListResponse numberLookups = client.legacy().reporting().usageReports().numberLookup().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit telco data usage report

Submit a new telco data usage report

`client.legacy().reporting().usageReports().numberLookup().create()` — `POST /legacy/reporting/usage_reports/number_lookup`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupCreateParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupCreateResponse;

NumberLookupCreateResponse numberLookup = client.legacy().reporting().usageReports().numberLookup().create();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`client.legacy().reporting().usageReports().numberLookup().retrieve()` — `GET /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupRetrieveResponse;

NumberLookupRetrieveResponse numberLookup = client.legacy().reporting().usageReports().numberLookup().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`client.legacy().reporting().usageReports().numberLookup().delete()` — `DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupDeleteParams;

client.legacy().reporting().usageReports().numberLookup().delete("550e8400-e29b-41d4-a716-446655440000");
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`client.legacy().reporting().usageReports().voice().list()` — `GET /legacy/reporting/usage_reports/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `perPage` | integer | No | Size of the page |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceListPage;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceListParams;

VoiceListPage page = client.legacy().reporting().usageReports().voice().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`client.legacy().reporting().usageReports().voice().create()` — `POST /legacy/reporting/usage_reports/voice`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceCreateParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceCreateResponse;
import java.time.OffsetDateTime;

VoiceCreateParams params = VoiceCreateParams.builder()
    .endTime(OffsetDateTime.parse("2024-02-01T00:00:00Z"))
    .startTime(OffsetDateTime.parse("2024-02-01T00:00:00Z"))
    .build();
VoiceCreateResponse voice = client.legacy().reporting().usageReports().voice().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a CDR usage report

Fetch single cdr usage report by id.

`client.legacy().reporting().usageReports().voice().retrieve()` — `GET /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceRetrieveResponse;

VoiceRetrieveResponse voice = client.legacy().reporting().usageReports().voice().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`client.legacy().reporting().usageReports().voice().delete()` — `DELETE /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceDeleteResponse;

VoiceDeleteResponse voice = client.legacy().reporting().usageReports().voice().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List CSV downloads

`client.phoneNumbers().csvDownloads().list()` — `GET /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadListPage;
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadListParams;

CsvDownloadListPage page = client.phoneNumbers().csvDownloads().list();
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Create a CSV download

`client.phoneNumbers().csvDownloads().create()` — `POST /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `csvFormat` | enum (V1, V2) | No | Which format to use when generating the CSV file. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadCreateParams;
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadCreateResponse;

CsvDownloadCreateResponse csvDownload = client.phoneNumbers().csvDownloads().create();
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Retrieve a CSV download

`client.phoneNumbers().csvDownloads().retrieve()` — `GET /phone_numbers/csv_downloads/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the CSV download. |

```java
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadRetrieveResponse;

CsvDownloadRetrieveResponse csvDownload = client.phoneNumbers().csvDownloads().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously. This endpoint will both generate and fetch the voice report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.reports().cdrUsageReports().fetchSync()` — `GET /reports/cdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (date-time) | No |  |
| `endDate` | string (date-time) | No |  |
| `connections` | array[number] | No |  |

```java
import com.telnyx.sdk.models.reports.cdrusagereports.CdrUsageReportFetchSyncParams;
import com.telnyx.sdk.models.reports.cdrusagereports.CdrUsageReportFetchSyncResponse;

CdrUsageReportFetchSyncParams params = CdrUsageReportFetchSyncParams.builder()
    .aggregationType(CdrUsageReportFetchSyncParams.AggregationType.NO_AGGREGATION)
    .productBreakdown(CdrUsageReportFetchSyncParams.ProductBreakdown.NO_BREAKDOWN)
    .build();
CdrUsageReportFetchSyncResponse response = client.reports().cdrUsageReports().fetchSync(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Messaging usage reports

Fetch all messaging usage reports. Usage reports are aggregated messaging data for specified time period and breakdown

`client.reports().mdrUsageReports().list()` — `GET /reports/mdr_usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportListPage;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportListParams;

MdrUsageReportListPage page = client.reports().mdrUsageReports().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create MDR Usage Report

Submit request for new new messaging usage report. This endpoint will pull and aggregate messaging data in specified time period.

`client.reports().mdrUsageReports().create()` — `POST /reports/mdr_usage_reports`

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportCreateParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportCreateResponse;
import java.time.OffsetDateTime;

MdrUsageReportCreateParams params = MdrUsageReportCreateParams.builder()
    .aggregationType(MdrUsageReportCreateParams.AggregationType.NO_AGGREGATION)
    .endDate(OffsetDateTime.parse("2020-07-01T00:00:00-06:00"))
    .startDate(OffsetDateTime.parse("2020-07-01T00:00:00-06:00"))
    .build();
MdrUsageReportCreateResponse mdrUsageReport = client.reports().mdrUsageReports().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously. This endpoint will both generate and fetch the messaging report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.reports().mdrUsageReports().fetchSync()` — `GET /reports/mdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (date-time) | No |  |
| `endDate` | string (date-time) | No |  |
| `profiles` | array[string] | No |  |

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportFetchSyncParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportFetchSyncResponse;

MdrUsageReportFetchSyncParams params = MdrUsageReportFetchSyncParams.builder()
    .aggregationType(MdrUsageReportFetchSyncParams.AggregationType.PROFILE)
    .build();
MdrUsageReportFetchSyncResponse response = client.reports().mdrUsageReports().fetchSync(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve messaging report

Fetch a single messaging usage report by id

`client.reports().mdrUsageReports().retrieve()` — `GET /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportRetrieveParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportRetrieveResponse;

MdrUsageReportRetrieveResponse mdrUsageReport = client.reports().mdrUsageReports().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete MDR Usage Report

Delete messaging usage report by id

`client.reports().mdrUsageReports().delete()` — `DELETE /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportDeleteParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportDeleteResponse;

MdrUsageReportDeleteResponse mdrUsageReport = client.reports().mdrUsageReports().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Mdr records

`client.reports().listMdrs()` — `GET /reports/mdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `direction` | enum (INBOUND, OUTBOUND) | No | Direction (inbound or outbound) |
| `status` | enum (GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, ...) | No | Message status |
| `messageType` | enum (SMS, MMS) | No | Type of message |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.reports.ReportListMdrsParams;
import com.telnyx.sdk.models.reports.ReportListMdrsResponse;

ReportListMdrsResponse response = client.reports().listMdrs();
```

Key response fields: `response.data.id, response.data.status, response.data.direction`

## Fetches all Wdr records

Fetch all Wdr records

`client.reports().listWdrs()` — `GET /reports/wdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simGroupId` | string (UUID) | No | Sim group unique identifier |
| `simCardId` | string (UUID) | No | Sim card unique identifier |
| `startDate` | string | No | Start date |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.reports.ReportListWdrsPage;
import com.telnyx.sdk.models.reports.ReportListWdrsParams;

ReportListWdrsPage page = client.reports().listWdrs();
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Get metadata overview

Returns all available record types and supported query parameters for session analysis.

`client.sessionAnalysis().metadata().retrieve()` — `GET /session_analysis/metadata`

```java
import com.telnyx.sdk.models.sessionanalysis.metadata.MetadataRetrieveParams;
import com.telnyx.sdk.models.sessionanalysis.metadata.MetadataRetrieveResponse;

MetadataRetrieveResponse metadata = client.sessionAnalysis().metadata().retrieve();
```

Key response fields: `response.data.meta, response.data.query_parameters, response.data.record_types`

## Get record type metadata

Returns detailed metadata for a specific record type, including relationships and examples.

`client.sessionAnalysis().metadata().retrieveRecordType()` — `GET /session_analysis/metadata/{record_type}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordType` | string | Yes | The record type identifier (e.g. |

```java
import com.telnyx.sdk.models.sessionanalysis.metadata.MetadataRetrieveRecordTypeParams;
import com.telnyx.sdk.models.sessionanalysis.metadata.MetadataRetrieveRecordTypeResponse;

MetadataRetrieveRecordTypeResponse response = client.sessionAnalysis().metadata().retrieveRecordType("record_type");
```

Key response fields: `response.data.aliases, response.data.child_relationships, response.data.event`

## Get session analysis

Retrieves a full session analysis tree for a given event, including costs, child events, and product linkages.

`client.sessionAnalysis().retrieve()` — `GET /session_analysis/{record_type}/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordType` | string | Yes | The record type identifier. |
| `eventId` | string (UUID) | Yes | The event identifier (UUID). |
| `expand` | enum (record, none) | No | Controls what data to expand on each event node. |
| `includeChildren` | boolean | No | Whether to include child events in the response. |
| `maxDepth` | integer | No | Maximum traversal depth for the event tree. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.sessionanalysis.SessionAnalysisRetrieveParams;
import com.telnyx.sdk.models.sessionanalysis.SessionAnalysisRetrieveResponse;

SessionAnalysisRetrieveParams params = SessionAnalysisRetrieveParams.builder()
    .recordType("record_type")
    .eventId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
SessionAnalysisRetrieveResponse sessionAnalysis = client.sessionAnalysis().retrieve(params);
```

Key response fields: `response.data.status, response.data.created_at, response.data.completed_at`

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`client.usageReports().list()` — `GET /usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (csv, json) | No | Specify the response format (csv or json). |
| `startDate` | string | No | The start date for the time range you are interested in. |
| `endDate` | string | No | The end date for the time range you are interested in. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.usagereports.UsageReportListPage;
import com.telnyx.sdk.models.usagereports.UsageReportListParams;

UsageReportListParams params = UsageReportListParams.builder()
    .addDimension("string")
    .addMetric("string")
    .product("wireless")
    .build();
UsageReportListPage page = client.usageReports().list(params);
```

Key response fields: `response.data.data, response.data.meta`

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`client.usageReports().getOptions()` — `GET /usage_reports/options`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product` | string | No | Options (dimensions and metrics) for a given product. |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.usagereports.UsageReportGetOptionsParams;
import com.telnyx.sdk.models.usagereports.UsageReportGetOptionsResponse;

UsageReportGetOptionsResponse response = client.usageReports().getOptions();
```

Key response fields: `response.data.product, response.data.product_dimensions, response.data.product_metrics`

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`client.wireless().detailRecordsReports().list()` — `GET /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```java
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportListParams;
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportListResponse;

DetailRecordsReportListResponse detailRecordsReports = client.wireless().detailRecordsReports().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`client.wireless().detailRecordsReports().create()` — `POST /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string | No | ISO 8601 formatted date-time indicating the start time. |
| `endTime` | string | No | ISO 8601 formatted date-time indicating the end time. |

```java
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportCreateParams;
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportCreateResponse;

DetailRecordsReportCreateResponse detailRecordsReport = client.wireless().detailRecordsReports().create();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`client.wireless().detailRecordsReports().retrieve()` — `GET /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportRetrieveParams;
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportRetrieveResponse;

DetailRecordsReportRetrieveResponse detailRecordsReport = client.wireless().detailRecordsReports().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`client.wireless().detailRecordsReports().delete()` — `DELETE /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportDeleteParams;
import com.telnyx.sdk.models.wireless.detailrecordsreports.DetailRecordsReportDeleteResponse;

DetailRecordsReportDeleteResponse detailRecordsReport = client.wireless().detailRecordsReports().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
