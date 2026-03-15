<!-- SDK reference: telnyx-account-reports-java -->

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +7 optional params in the API Details section below |

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
| ... | | | +8 optional params in the API Details section below |

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
| ... | | | +6 optional params in the API Details section below |

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
| ... | | | +9 optional params in the API Details section below |

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
| ... | | | +1 optional params in the API Details section below |

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
| ... | | | +6 optional params in the API Details section below |

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

# Account Reports (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List call events

| Field | Type |
|-------|------|
| `call_leg_id` | string |
| `call_session_id` | string |
| `event_timestamp` | string |
| `metadata` | object |
| `name` | string |
| `record_type` | enum: call_event |
| `type` | enum: command, webhook |

**Returned by:** Create a ledger billing group report, Get a ledger billing group report

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `organization_id` | uuid |
| `record_type` | enum: ledger_billing_group_report |
| `report_url` | uri |
| `status` | enum: pending, complete, failed, deleted |
| `updated_at` | date-time |

**Returned by:** Get all MDR detailed report requests, Create a new MDR detailed report request, Get a specific MDR detailed report request, Delete a MDR detailed report request

| Field | Type |
|-------|------|
| `connections` | array[integer] |
| `created_at` | date-time |
| `directions` | array[string] |
| `end_date` | date-time |
| `filters` | array[object] |
| `id` | uuid |
| `profiles` | array[string] |
| `record_type` | string |
| `record_types` | array[string] |
| `report_name` | string |
| `report_url` | string |
| `start_date` | date-time |
| `status` | enum: PENDING, COMPLETE, FAILED, EXPIRED |
| `updated_at` | date-time |

**Returned by:** Get all CDR report requests, Create a new CDR report request, Get a specific CDR report request, Delete a CDR report request

| Field | Type |
|-------|------|
| `call_types` | array[integer] |
| `connections` | array[integer] |
| `created_at` | string |
| `end_time` | string |
| `filters` | array[object] |
| `id` | string |
| `managed_accounts` | array[string] |
| `record_type` | string |
| `record_types` | array[integer] |
| `report_name` | string |
| `report_url` | string |
| `retry` | int32 |
| `source` | string |
| `start_time` | string |
| `status` | int32 |
| `timezone` | string |
| `updated_at` | string |

**Returned by:** Get available CDR report fields

| Field | Type |
|-------|------|
| `Billing` | array[string] |
| `Interaction Data` | array[string] |
| `Number Information` | array[string] |
| `Telephony Data` | array[string] |

**Returned by:** List MDR usage reports, Create a new legacy usage V2 MDR report request, Get an MDR usage report, Delete a V2 legacy usage MDR report request

| Field | Type |
|-------|------|
| `aggregation_type` | int32 |
| `connections` | array[string] |
| `created_at` | date-time |
| `end_time` | date-time |
| `id` | uuid |
| `profiles` | array[string] |
| `record_type` | string |
| `report_url` | string |
| `result` | object |
| `start_time` | date-time |
| `status` | int32 |
| `updated_at` | date-time |

**Returned by:** List telco data usage reports, Submit telco data usage report, Get telco data usage report by ID

| Field | Type |
|-------|------|
| `aggregation_type` | string |
| `created_at` | date-time |
| `end_date` | date |
| `id` | uuid |
| `managed_accounts` | array[string] |
| `record_type` | string |
| `report_url` | string |
| `result` | array[object] |
| `start_date` | date |
| `status` | string |
| `updated_at` | date-time |

**Returned by:** List CDR usage reports, Create a new legacy usage V2 CDR report request, Get a CDR usage report, Delete a V2 legacy usage CDR report request

| Field | Type |
|-------|------|
| `aggregation_type` | int32 |
| `connections` | array[string] |
| `created_at` | date-time |
| `end_time` | date-time |
| `id` | uuid |
| `product_breakdown` | int32 |
| `record_type` | string |
| `report_url` | string |
| `result` | object |
| `start_time` | date-time |
| `status` | int32 |
| `updated_at` | date-time |

**Returned by:** List CSV downloads, Create a CSV download, Retrieve a CSV download

| Field | Type |
|-------|------|
| `id` | string |
| `record_type` | string |
| `status` | enum: pending, complete, failed, expired |
| `url` | string |

**Returned by:** Generates and fetches CDR Usage Reports

| Field | Type |
|-------|------|
| `aggregation_type` | enum: NO_AGGREGATION, CONNECTION, TAG, BILLING_GROUP |
| `connections` | array[integer] |
| `created_at` | date-time |
| `end_time` | date-time |
| `id` | uuid |
| `product_breakdown` | enum: NO_BREAKDOWN, DID_VS_TOLL_FREE, COUNTRY, DID_VS_TOLL_FREE_PER_COUNTRY |
| `record_type` | string |
| `report_url` | string |
| `result` | object |
| `start_time` | date-time |
| `status` | enum: PENDING, COMPLETE, FAILED, EXPIRED |
| `updated_at` | date-time |

**Returned by:** Fetch all Messaging usage reports, Create MDR Usage Report, Generate and fetch MDR Usage Report, Retrieve messaging report, Delete MDR Usage Report

| Field | Type |
|-------|------|
| `aggregation_type` | enum: NO_AGGREGATION, PROFILE, TAGS |
| `connections` | array[integer] |
| `created_at` | date-time |
| `end_date` | date-time |
| `id` | uuid |
| `profiles` | string |
| `record_type` | string |
| `report_url` | string |
| `result` | array[object] |
| `start_date` | date-time |
| `status` | enum: PENDING, COMPLETE, FAILED, EXPIRED |
| `updated_at` | date-time |

**Returned by:** Fetch all Mdr records

| Field | Type |
|-------|------|
| `cld` | string |
| `cli` | string |
| `cost` | string |
| `created_at` | date-time |
| `currency` | enum: AUD, CAD, EUR, GBP, USD |
| `direction` | string |
| `id` | string |
| `message_type` | enum: SMS, MMS |
| `parts` | number |
| `profile_name` | string |
| `rate` | string |
| `record_type` | string |
| `status` | enum: GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, GW_REJECT, FAILED |

**Returned by:** Fetches all Wdr records

| Field | Type |
|-------|------|
| `cost` | object |
| `created_at` | date-time |
| `downlink_data` | object |
| `duration_seconds` | number |
| `id` | string |
| `imsi` | string |
| `mcc` | string |
| `mnc` | string |
| `phone_number` | string |
| `rate` | object |
| `record_type` | string |
| `sim_card_id` | string |
| `sim_group_id` | string |
| `sim_group_name` | string |
| `uplink_data` | object |

**Returned by:** Get metadata overview

| Field | Type |
|-------|------|
| `meta` | object |
| `query_parameters` | object |
| `record_types` | array[object] |

**Returned by:** Get record type metadata

| Field | Type |
|-------|------|
| `aliases` | array[string] |
| `child_relationships` | array[object] |
| `event` | string |
| `examples` | object |
| `meta` | object |
| `parent_relationships` | array[object] |
| `product` | string |
| `record_type` | string |

**Returned by:** Get session analysis

| Field | Type |
|-------|------|
| `completed_at` | date-time |
| `cost` | object |
| `created_at` | date-time |
| `meta` | object |
| `root` | object |
| `session_id` | string |
| `status` | string |

**Returned by:** Get Telnyx product usage data (BETA)

| Field | Type |
|-------|------|
| `data` | array[object] |
| `meta` | object |

**Returned by:** Get Usage Reports query options (BETA)

| Field | Type |
|-------|------|
| `product` | string |
| `product_dimensions` | array[string] |
| `product_metrics` | array[string] |
| `record_types` | array[object] |

**Returned by:** Get all Wireless Detail Records (WDRs) Reports, Create a Wireless Detail Records (WDRs) Report, Get a Wireless Detail Record (WDR) Report, Delete a Wireless Detail Record (WDR) Report

| Field | Type |
|-------|------|
| `created_at` | string |
| `end_time` | string |
| `id` | uuid |
| `record_type` | string |
| `report_url` | string |
| `start_time` | string |
| `status` | enum: pending, complete, failed, deleted |
| `updated_at` | string |

## Optional Parameters

### Create a ledger billing group report — `client.ledgerBillingGroupReports().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | integer | Year of the ledger billing group report |
| `month` | integer | Month of the ledger billing group report |

### Create a new MDR detailed report request — `client.legacy().reporting().batchDetailRecords().messaging().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `timezone` | string | Timezone for the report |
| `directions` | array[integer] | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `recordTypes` | array[integer] | List of record types to filter by (Complete = 1, Incomplete = 2, Errors = 3) |
| `connections` | array[integer] | List of connections to filter by |
| `reportName` | string | Name of the report |
| `includeMessageBody` | boolean | Whether to include message body in the report |
| `filters` | array[object] | List of filters to apply |
| `profiles` | array[string] | List of messaging profile IDs to filter by |
| `managedAccounts` | array[string] | List of managed accounts to include |
| `selectAllManagedAccounts` | boolean | Whether to select all managed accounts |

### Create a new CDR report request — `client.legacy().reporting().batchDetailRecords().voice().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `timezone` | string | Timezone for the report |
| `callTypes` | array[integer] | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `recordTypes` | array[integer] | List of record types to filter by (Complete = 1, Incomplete = 2, Errors = 3) |
| `connections` | array[integer] | List of connections to filter by |
| `reportName` | string | Name of the report |
| `source` | string | Source of the report. |
| `includeAllMetadata` | boolean | Whether to include all metadata |
| `filters` | array[object] | List of filters to apply |
| `fields` | array[string] | Set of fields to include in the report |
| `managedAccounts` | array[string] | List of managed accounts to include |
| `selectAllManagedAccounts` | boolean | Whether to select all managed accounts |

### Create a CSV download — `client.phoneNumbers().csvDownloads().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `csvFormat` | enum (V1, V2) | Which format to use when generating the CSV file. |
| `filter` | object | Consolidated filter parameter (deepObject style). |

### Create a Wireless Detail Records (WDRs) Report — `client.wireless().detailRecordsReports().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `startTime` | string | ISO 8601 formatted date-time indicating the start time. |
| `endTime` | string | ISO 8601 formatted date-time indicating the end time. |
