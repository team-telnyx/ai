---
name: telnyx-account-reports-java
description: >-
  Generate and retrieve usage reports for billing, analytics, and
  reconciliation. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: account-reports
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Reports - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## List call events

Filters call events by given filter parameters.

`GET /call_events`

```java
import com.telnyx.sdk.models.callevents.CallEventListPage;
import com.telnyx.sdk.models.callevents.CallEventListParams;

CallEventListPage page = client.callEvents().list();
```

## Create a ledger billing group report

`POST /ledger_billing_group_reports`

Optional: `month` (integer), `year` (integer)

```java
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportCreateParams;
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportCreateResponse;

LedgerBillingGroupReportCreateResponse ledgerBillingGroupReport = client.ledgerBillingGroupReports().create();
```

## Get a ledger billing group report

`GET /ledger_billing_group_reports/{id}`

```java
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportRetrieveParams;
import com.telnyx.sdk.models.ledgerbillinggroupreports.LedgerBillingGroupReportRetrieveResponse;

LedgerBillingGroupReportRetrieveResponse ledgerBillingGroupReport = client.ledgerBillingGroupReports().retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/messaging`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingListParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingListResponse;

MessagingListResponse messagings = client.legacy().reporting().batchDetailRecords().messaging().list();
```

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`POST /legacy/reporting/batch_detail_records/messaging` — Required: `start_time`, `end_time`

Optional: `connections` (array[integer]), `directions` (array[integer]), `filters` (array[object]), `include_message_body` (boolean), `managed_accounts` (array[string]), `profiles` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `timezone` (string)

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

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`GET /legacy/reporting/batch_detail_records/messaging/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.legacy().reporting().batchDetailRecords().messaging().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.messaging.MessagingDeleteResponse;

MessagingDeleteResponse messaging = client.legacy().reporting().batchDetailRecords().messaging().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/voice`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceListParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceListResponse;

VoiceListResponse voices = client.legacy().reporting().batchDetailRecords().voice().list();
```

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`POST /legacy/reporting/batch_detail_records/voice` — Required: `start_time`, `end_time`

Optional: `call_types` (array[integer]), `connections` (array[integer]), `fields` (array[string]), `filters` (array[object]), `include_all_metadata` (boolean), `managed_accounts` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `source` (string), `timezone` (string)

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

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`GET /legacy/reporting/batch_detail_records/voice/fields`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveFieldsParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveFieldsResponse;

VoiceRetrieveFieldsResponse response = client.legacy().reporting().batchDetailRecords().voice().retrieveFields();
```

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`GET /legacy/reporting/batch_detail_records/voice/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceRetrieveResponse;

VoiceRetrieveResponse voice = client.legacy().reporting().batchDetailRecords().voice().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Delete a CDR report request

Deletes a specific CDR report request by ID

`DELETE /legacy/reporting/batch_detail_records/voice/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.voice.VoiceDeleteResponse;

VoiceDeleteResponse voice = client.legacy().reporting().batchDetailRecords().voice().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`GET /legacy/reporting/usage_reports/messaging`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingListPage;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingListParams;

MessagingListPage page = client.legacy().reporting().usageReports().messaging().list();
```

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`POST /legacy/reporting/usage_reports/messaging`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingCreateParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingCreateResponse;

MessagingCreateParams params = MessagingCreateParams.builder()
    .aggregationType(0)
    .build();
MessagingCreateResponse messaging = client.legacy().reporting().usageReports().messaging().create(params);
```

## Get an MDR usage report

Fetch single MDR usage report by id.

`GET /legacy/reporting/usage_reports/messaging/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.legacy().reporting().usageReports().messaging().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`DELETE /legacy/reporting/usage_reports/messaging/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.messaging.MessagingDeleteResponse;

MessagingDeleteResponse messaging = client.legacy().reporting().usageReports().messaging().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`GET /legacy/reporting/usage_reports/number_lookup`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupListParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupListResponse;

NumberLookupListResponse numberLookups = client.legacy().reporting().usageReports().numberLookup().list();
```

## Submit telco data usage report

Submit a new telco data usage report

`POST /legacy/reporting/usage_reports/number_lookup`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupCreateParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupCreateResponse;

NumberLookupCreateResponse numberLookup = client.legacy().reporting().usageReports().numberLookup().create();
```

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`GET /legacy/reporting/usage_reports/number_lookup/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupRetrieveResponse;

NumberLookupRetrieveResponse numberLookup = client.legacy().reporting().usageReports().numberLookup().retrieve("id");
```

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.numberlookup.NumberLookupDeleteParams;

client.legacy().reporting().usageReports().numberLookup().delete("id");
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`GET /legacy/reporting/usage_reports/voice`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceListPage;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceListParams;

VoiceListPage page = client.legacy().reporting().usageReports().voice().list();
```

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`POST /legacy/reporting/usage_reports/voice`

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

## Get a CDR usage report

Fetch single cdr usage report by id.

`GET /legacy/reporting/usage_reports/voice/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceRetrieveResponse;

VoiceRetrieveResponse voice = client.legacy().reporting().usageReports().voice().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`DELETE /legacy/reporting/usage_reports/voice/{id}`

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.voice.VoiceDeleteResponse;

VoiceDeleteResponse voice = client.legacy().reporting().usageReports().voice().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List CSV downloads

`GET /phone_numbers/csv_downloads`

```java
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadListPage;
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadListParams;

CsvDownloadListPage page = client.phoneNumbers().csvDownloads().list();
```

## Create a CSV download

`POST /phone_numbers/csv_downloads`

```java
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadCreateParams;
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadCreateResponse;

CsvDownloadCreateResponse csvDownload = client.phoneNumbers().csvDownloads().create();
```

## Retrieve a CSV download

`GET /phone_numbers/csv_downloads/{id}`

```java
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.csvdownloads.CsvDownloadRetrieveResponse;

CsvDownloadRetrieveResponse csvDownload = client.phoneNumbers().csvDownloads().retrieve("id");
```

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously.

`GET /reports/cdr_usage_reports/sync`

```java
import com.telnyx.sdk.models.reports.cdrusagereports.CdrUsageReportFetchSyncParams;
import com.telnyx.sdk.models.reports.cdrusagereports.CdrUsageReportFetchSyncResponse;

CdrUsageReportFetchSyncParams params = CdrUsageReportFetchSyncParams.builder()
    .aggregationType(CdrUsageReportFetchSyncParams.AggregationType.NO_AGGREGATION)
    .productBreakdown(CdrUsageReportFetchSyncParams.ProductBreakdown.NO_BREAKDOWN)
    .build();
CdrUsageReportFetchSyncResponse response = client.reports().cdrUsageReports().fetchSync(params);
```

## Fetch all Messaging usage reports

Fetch all messaging usage reports.

`GET /reports/mdr_usage_reports`

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportListPage;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportListParams;

MdrUsageReportListPage page = client.reports().mdrUsageReports().list();
```

## Create MDR Usage Report

Submit request for new new messaging usage report.

`POST /reports/mdr_usage_reports`

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

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously.

`GET /reports/mdr_usage_reports/sync`

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportFetchSyncParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportFetchSyncResponse;

MdrUsageReportFetchSyncParams params = MdrUsageReportFetchSyncParams.builder()
    .aggregationType(MdrUsageReportFetchSyncParams.AggregationType.PROFILE)
    .build();
MdrUsageReportFetchSyncResponse response = client.reports().mdrUsageReports().fetchSync(params);
```

## Retrieve messaging report

Fetch a single messaging usage report by id

`GET /reports/mdr_usage_reports/{id}`

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportRetrieveParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportRetrieveResponse;

MdrUsageReportRetrieveResponse mdrUsageReport = client.reports().mdrUsageReports().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Delete MDR Usage Report

Delete messaging usage report by id

`DELETE /reports/mdr_usage_reports/{id}`

```java
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportDeleteParams;
import com.telnyx.sdk.models.reports.mdrusagereports.MdrUsageReportDeleteResponse;

MdrUsageReportDeleteResponse mdrUsageReport = client.reports().mdrUsageReports().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Fetch all Mdr records

`GET /reports/mdrs`

```java
import com.telnyx.sdk.models.reports.ReportListMdrsParams;
import com.telnyx.sdk.models.reports.ReportListMdrsResponse;

ReportListMdrsResponse response = client.reports().listMdrs();
```

## Fetches all Wdr records

Fetch all Wdr records

`GET /reports/wdrs`

```java
import com.telnyx.sdk.models.reports.ReportListWdrsPage;
import com.telnyx.sdk.models.reports.ReportListWdrsParams;

ReportListWdrsPage page = client.reports().listWdrs();
```

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`GET /usage_reports`

```java
import com.telnyx.sdk.models.usagereports.UsageReportListPage;
import com.telnyx.sdk.models.usagereports.UsageReportListParams;

UsageReportListParams params = UsageReportListParams.builder()
    .addDimension("string")
    .addMetric("string")
    .product("product")
    .build();
UsageReportListPage page = client.usageReports().list(params);
```

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`GET /usage_reports/options`

```java
import com.telnyx.sdk.models.usagereports.UsageReportGetOptionsParams;
import com.telnyx.sdk.models.usagereports.UsageReportGetOptionsResponse;

UsageReportGetOptionsResponse response = client.usageReports().getOptions();
```
