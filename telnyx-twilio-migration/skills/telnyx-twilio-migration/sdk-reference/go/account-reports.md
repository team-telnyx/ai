<!-- SDK reference: telnyx-account-reports-go -->

# Telnyx Account Reports - Go

## Core Workflow

### Steps

1. **Generate usage report**: `client.Reports.Create(ctx, params)`
2. **Download CSV**: `client.CsvDownloads.Retrieve(ctx, params)`

### Common mistakes

- Reports are generated asynchronously — poll the status until completed, then download

**Related skills**: telnyx-account-go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Reports.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List call events

Filters call events by given filter parameters. Events are ordered by `occurred_at`. If filter for `leg_id` or `application_session_id` is not present, it only filters events from the last 24 hours.

`client.CallEvents.List()` — `GET /call_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.CallEvents.List(context.Background(), telnyx.CallEventListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.name, response.data.type, response.data.call_leg_id`

## Create a ledger billing group report

`client.LedgerBillingGroupReports.New()` — `POST /ledger_billing_group_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Year` | integer | No | Year of the ledger billing group report |
| `Month` | integer | No | Month of the ledger billing group report |

```go
	ledgerBillingGroupReport, err := client.LedgerBillingGroupReports.New(context.Background(), telnyx.LedgerBillingGroupReportNewParams{
		Month: telnyx.Int(10),
		Year:  telnyx.Int(2019),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ledgerBillingGroupReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a ledger billing group report

`client.LedgerBillingGroupReports.Get()` — `GET /ledger_billing_group_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the ledger billing group report |

```go
	ledgerBillingGroupReport, err := client.LedgerBillingGroupReports.Get(context.Background(), "f5586561-8ff0-4291-a0ac-84fe544797bd")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ledgerBillingGroupReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`client.Legacy.Reporting.BatchDetailRecords.Messaging.List()` — `GET /legacy/reporting/batch_detail_records/messaging`

```go
	messagings, err := client.Legacy.Reporting.BatchDetailRecords.Messaging.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagings.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`client.Legacy.Reporting.BatchDetailRecords.Messaging.New()` — `POST /legacy/reporting/batch_detail_records/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartTime` | string (date-time) | Yes | Start time in ISO format |
| `EndTime` | string (date-time) | Yes | End time in ISO format. |
| `Timezone` | string | No | Timezone for the report |
| `Directions` | array[integer] | No | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `RecordTypes` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +7 optional params in the API Details section below |

```go
	messaging, err := client.Legacy.Reporting.BatchDetailRecords.Messaging.New(context.Background(), telnyx.LegacyReportingBatchDetailRecordMessagingNewParams{
		EndTime:   time.Now(),
		StartTime: time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`client.Legacy.Reporting.BatchDetailRecords.Messaging.Get()` — `GET /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	messaging, err := client.Legacy.Reporting.BatchDetailRecords.Messaging.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`client.Legacy.Reporting.BatchDetailRecords.Messaging.Delete()` — `DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	messaging, err := client.Legacy.Reporting.BatchDetailRecords.Messaging.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`client.Legacy.Reporting.BatchDetailRecords.Voice.List()` — `GET /legacy/reporting/batch_detail_records/voice`

```go
	voices, err := client.Legacy.Reporting.BatchDetailRecords.Voice.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voices.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`client.Legacy.Reporting.BatchDetailRecords.Voice.New()` — `POST /legacy/reporting/batch_detail_records/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartTime` | string (date-time) | Yes | Start time in ISO format |
| `EndTime` | string (date-time) | Yes | End time in ISO format |
| `Timezone` | string | No | Timezone for the report |
| `CallTypes` | array[integer] | No | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `RecordTypes` | array[integer] | No | List of record types to filter by (Complete = 1, Incomplete ... |
| ... | | | +8 optional params in the API Details section below |

```go
	voice, err := client.Legacy.Reporting.BatchDetailRecords.Voice.New(context.Background(), telnyx.LegacyReportingBatchDetailRecordVoiceNewParams{
		EndTime:   time.Now(),
		StartTime: time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`client.Legacy.Reporting.BatchDetailRecords.Voice.GetFields()` — `GET /legacy/reporting/batch_detail_records/voice/fields`

```go
	response, err := client.Legacy.Reporting.BatchDetailRecords.Voice.GetFields(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Billing)
```

Key response fields: `response.data.Billing, response.data.Interaction Data, response.data.Number Information`

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`client.Legacy.Reporting.BatchDetailRecords.Voice.Get()` — `GET /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	voice, err := client.Legacy.Reporting.BatchDetailRecords.Voice.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a CDR report request

Deletes a specific CDR report request by ID

`client.Legacy.Reporting.BatchDetailRecords.Voice.Delete()` — `DELETE /legacy/reporting/batch_detail_records/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	voice, err := client.Legacy.Reporting.BatchDetailRecords.Voice.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`client.Legacy.Reporting.UsageReports.Messaging.List()` — `GET /legacy/reporting/usage_reports/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | integer | No | Page number |
| `PerPage` | integer | No | Size of the page |

```go
	page, err := client.Legacy.Reporting.UsageReports.Messaging.List(context.Background(), telnyx.LegacyReportingUsageReportMessagingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 MDR report request

Creates a new legacy usage V2 MDR report request with the specified filters

`client.Legacy.Reporting.UsageReports.Messaging.New()` — `POST /legacy/reporting/usage_reports/messaging`

```go
	messaging, err := client.Legacy.Reporting.UsageReports.Messaging.New(context.Background(), telnyx.LegacyReportingUsageReportMessagingNewParams{
		AggregationType: 0,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get an MDR usage report

Fetch single MDR usage report by id.

`client.Legacy.Reporting.UsageReports.Messaging.Get()` — `GET /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	messaging, err := client.Legacy.Reporting.UsageReports.Messaging.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`client.Legacy.Reporting.UsageReports.Messaging.Delete()` — `DELETE /legacy/reporting/usage_reports/messaging/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	messaging, err := client.Legacy.Reporting.UsageReports.Messaging.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`client.Legacy.Reporting.UsageReports.NumberLookup.List()` — `GET /legacy/reporting/usage_reports/number_lookup`

```go
	numberLookups, err := client.Legacy.Reporting.UsageReports.NumberLookup.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberLookups.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit telco data usage report

Submit a new telco data usage report

`client.Legacy.Reporting.UsageReports.NumberLookup.New()` — `POST /legacy/reporting/usage_reports/number_lookup`

```go
	numberLookup, err := client.Legacy.Reporting.UsageReports.NumberLookup.New(context.Background(), telnyx.LegacyReportingUsageReportNumberLookupNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberLookup.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`client.Legacy.Reporting.UsageReports.NumberLookup.Get()` — `GET /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	numberLookup, err := client.Legacy.Reporting.UsageReports.NumberLookup.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberLookup.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`client.Legacy.Reporting.UsageReports.NumberLookup.Delete()` — `DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	err := client.Legacy.Reporting.UsageReports.NumberLookup.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`client.Legacy.Reporting.UsageReports.Voice.List()` — `GET /legacy/reporting/usage_reports/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | integer | No | Page number |
| `PerPage` | integer | No | Size of the page |

```go
	page, err := client.Legacy.Reporting.UsageReports.Voice.List(context.Background(), telnyx.LegacyReportingUsageReportVoiceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new legacy usage V2 CDR report request

Creates a new legacy usage V2 CDR report request with the specified filters

`client.Legacy.Reporting.UsageReports.Voice.New()` — `POST /legacy/reporting/usage_reports/voice`

```go
	voice, err := client.Legacy.Reporting.UsageReports.Voice.New(context.Background(), telnyx.LegacyReportingUsageReportVoiceNewParams{
		EndTime:   time.Now(),
		StartTime: time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a CDR usage report

Fetch single cdr usage report by id.

`client.Legacy.Reporting.UsageReports.Voice.Get()` — `GET /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	voice, err := client.Legacy.Reporting.UsageReports.Voice.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`client.Legacy.Reporting.UsageReports.Voice.Delete()` — `DELETE /legacy/reporting/usage_reports/voice/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	voice, err := client.Legacy.Reporting.UsageReports.Voice.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List CSV downloads

`client.PhoneNumbers.CsvDownloads.List()` — `GET /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.PhoneNumbers.CsvDownloads.List(context.Background(), telnyx.PhoneNumberCsvDownloadListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Create a CSV download

`client.PhoneNumbers.CsvDownloads.New()` — `POST /phone_numbers/csv_downloads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CsvFormat` | enum (V1, V2) | No | Which format to use when generating the CSV file. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	csvDownload, err := client.PhoneNumbers.CsvDownloads.New(context.Background(), telnyx.PhoneNumberCsvDownloadNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", csvDownload.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Retrieve a CSV download

`client.PhoneNumbers.CsvDownloads.Get()` — `GET /phone_numbers/csv_downloads/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the CSV download. |

```go
	csvDownload, err := client.PhoneNumbers.CsvDownloads.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", csvDownload.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.url`

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously. This endpoint will both generate and fetch the voice report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.Reports.CdrUsageReports.FetchSync()` — `GET /reports/cdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartDate` | string (date-time) | No |  |
| `EndDate` | string (date-time) | No |  |
| `Connections` | array[number] | No |  |

```go
	response, err := client.Reports.CdrUsageReports.FetchSync(context.Background(), telnyx.ReportCdrUsageReportFetchSyncParams{
		AggregationType:  telnyx.ReportCdrUsageReportFetchSyncParamsAggregationTypeNoAggregation,
		ProductBreakdown: telnyx.ReportCdrUsageReportFetchSyncParamsProductBreakdownNoBreakdown,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Messaging usage reports

Fetch all messaging usage reports. Usage reports are aggregated messaging data for specified time period and breakdown

`client.Reports.MdrUsageReports.List()` — `GET /reports/mdr_usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Reports.MdrUsageReports.List(context.Background(), telnyx.ReportMdrUsageReportListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create MDR Usage Report

Submit request for new new messaging usage report. This endpoint will pull and aggregate messaging data in specified time period.

`client.Reports.MdrUsageReports.New()` — `POST /reports/mdr_usage_reports`

```go
	mdrUsageReport, err := client.Reports.MdrUsageReports.New(context.Background(), telnyx.ReportMdrUsageReportNewParams{
		AggregationType: telnyx.ReportMdrUsageReportNewParamsAggregationTypeNoAggregation,
		EndDate:         time.Now(),
		StartDate:       time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mdrUsageReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously. This endpoint will both generate and fetch the messaging report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`client.Reports.MdrUsageReports.FetchSync()` — `GET /reports/mdr_usage_reports/sync`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartDate` | string (date-time) | No |  |
| `EndDate` | string (date-time) | No |  |
| `Profiles` | array[string] | No |  |

```go
	response, err := client.Reports.MdrUsageReports.FetchSync(context.Background(), telnyx.ReportMdrUsageReportFetchSyncParams{
		AggregationType: telnyx.ReportMdrUsageReportFetchSyncParamsAggregationTypeProfile,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve messaging report

Fetch a single messaging usage report by id

`client.Reports.MdrUsageReports.Get()` — `GET /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	mdrUsageReport, err := client.Reports.MdrUsageReports.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mdrUsageReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete MDR Usage Report

Delete messaging usage report by id

`client.Reports.MdrUsageReports.Delete()` — `DELETE /reports/mdr_usage_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	mdrUsageReport, err := client.Reports.MdrUsageReports.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mdrUsageReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Fetch all Mdr records

`client.Reports.ListMdrs()` — `GET /reports/mdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Direction` | enum (INBOUND, OUTBOUND) | No | Direction (inbound or outbound) |
| `Status` | enum (GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, ...) | No | Message status |
| `MessageType` | enum (SMS, MMS) | No | Type of message |
| ... | | | +6 optional params in the API Details section below |

```go
	response, err := client.Reports.ListMdrs(context.Background(), telnyx.ReportListMdrsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.direction`

## Fetches all Wdr records

Fetch all Wdr records

`client.Reports.ListWdrs()` — `GET /reports/wdrs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SimGroupId` | string (UUID) | No | Sim group unique identifier |
| `SimCardId` | string (UUID) | No | Sim card unique identifier |
| `StartDate` | string | No | Start date |
| ... | | | +9 optional params in the API Details section below |

```go
	page, err := client.Reports.ListWdrs(context.Background(), telnyx.ReportListWdrsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Get metadata overview

Returns all available record types and supported query parameters for session analysis.

`client.SessionAnalysis.Metadata.Get()` — `GET /session_analysis/metadata`

```go
	metadata, err := client.SessionAnalysis.Metadata.Get(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", metadata.Meta)
```

Key response fields: `response.data.meta, response.data.query_parameters, response.data.record_types`

## Get record type metadata

Returns detailed metadata for a specific record type, including relationships and examples.

`client.SessionAnalysis.Metadata.GetRecordType()` — `GET /session_analysis/metadata/{record_type}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RecordType` | string | Yes | The record type identifier (e.g. |

```go
	response, err := client.SessionAnalysis.Metadata.GetRecordType(context.Background(), "record_type")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Aliases)
```

Key response fields: `response.data.aliases, response.data.child_relationships, response.data.event`

## Get session analysis

Retrieves a full session analysis tree for a given event, including costs, child events, and product linkages.

`client.SessionAnalysis.Get()` — `GET /session_analysis/{record_type}/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RecordType` | string | Yes | The record type identifier. |
| `EventId` | string (UUID) | Yes | The event identifier (UUID). |
| `Expand` | enum (record, none) | No | Controls what data to expand on each event node. |
| `IncludeChildren` | boolean | No | Whether to include child events in the response. |
| `MaxDepth` | integer | No | Maximum traversal depth for the event tree. |
| ... | | | +1 optional params in the API Details section below |

```go
	sessionAnalysis, err := client.SessionAnalysis.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.SessionAnalysisGetParams{
			RecordType: "record_type",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", sessionAnalysis.SessionID)
```

Key response fields: `response.data.status, response.data.created_at, response.data.completed_at`

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`client.UsageReports.List()` — `GET /usage_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Format` | enum (csv, json) | No | Specify the response format (csv or json). |
| `StartDate` | string | No | The start date for the time range you are interested in. |
| `EndDate` | string | No | The end date for the time range you are interested in. |
| ... | | | +6 optional params in the API Details section below |

```go
	page, err := client.UsageReports.List(context.Background(), telnyx.UsageReportListParams{
		Dimensions: []string{"string"},
		Metrics:    []string{"string"},
		Product: "wireless",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.data, response.data.meta`

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`client.UsageReports.GetOptions()` — `GET /usage_reports/options`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Product` | string | No | Options (dimensions and metrics) for a given product. |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	response, err := client.UsageReports.GetOptions(context.Background(), telnyx.UsageReportGetOptionsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.product, response.data.product_dimensions, response.data.product_metrics`

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`client.Wireless.DetailRecordsReports.List()` — `GET /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |

```go
	detailRecordsReports, err := client.Wireless.DetailRecordsReports.List(context.Background(), telnyx.WirelessDetailRecordsReportListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", detailRecordsReports.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`client.Wireless.DetailRecordsReports.New()` — `POST /wireless/detail_records_reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartTime` | string | No | ISO 8601 formatted date-time indicating the start time. |
| `EndTime` | string | No | ISO 8601 formatted date-time indicating the end time. |

```go
	detailRecordsReport, err := client.Wireless.DetailRecordsReports.New(context.Background(), telnyx.WirelessDetailRecordsReportNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", detailRecordsReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`client.Wireless.DetailRecordsReports.Get()` — `GET /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	detailRecordsReport, err := client.Wireless.DetailRecordsReports.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", detailRecordsReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`client.Wireless.DetailRecordsReports.Delete()` — `DELETE /wireless/detail_records_reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	detailRecordsReport, err := client.Wireless.DetailRecordsReports.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", detailRecordsReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

# Account Reports (Go) — API Details

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

### Create a ledger billing group report — `client.LedgerBillingGroupReports.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Year` | integer | Year of the ledger billing group report |
| `Month` | integer | Month of the ledger billing group report |

### Create a new MDR detailed report request — `client.Legacy.Reporting.BatchDetailRecords.Messaging.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Timezone` | string | Timezone for the report |
| `Directions` | array[integer] | List of directions to filter by (Inbound = 1, Outbound = 2) |
| `RecordTypes` | array[integer] | List of record types to filter by (Complete = 1, Incomplete = 2, Errors = 3) |
| `Connections` | array[integer] | List of connections to filter by |
| `ReportName` | string | Name of the report |
| `IncludeMessageBody` | boolean | Whether to include message body in the report |
| `Filters` | array[object] | List of filters to apply |
| `Profiles` | array[string] | List of messaging profile IDs to filter by |
| `ManagedAccounts` | array[string] | List of managed accounts to include |
| `SelectAllManagedAccounts` | boolean | Whether to select all managed accounts |

### Create a new CDR report request — `client.Legacy.Reporting.BatchDetailRecords.Voice.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Timezone` | string | Timezone for the report |
| `CallTypes` | array[integer] | List of call types to filter by (Inbound = 1, Outbound = 2) |
| `RecordTypes` | array[integer] | List of record types to filter by (Complete = 1, Incomplete = 2, Errors = 3) |
| `Connections` | array[integer] | List of connections to filter by |
| `ReportName` | string | Name of the report |
| `Source` | string | Source of the report. |
| `IncludeAllMetadata` | boolean | Whether to include all metadata |
| `Filters` | array[object] | List of filters to apply |
| `Fields` | array[string] | Set of fields to include in the report |
| `ManagedAccounts` | array[string] | List of managed accounts to include |
| `SelectAllManagedAccounts` | boolean | Whether to select all managed accounts |

### Create a CSV download — `client.PhoneNumbers.CsvDownloads.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CsvFormat` | enum (V1, V2) | Which format to use when generating the CSV file. |
| `Filter` | object | Consolidated filter parameter (deepObject style). |

### Create a Wireless Detail Records (WDRs) Report — `client.Wireless.DetailRecordsReports.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `StartTime` | string | ISO 8601 formatted date-time indicating the start time. |
| `EndTime` | string | ISO 8601 formatted date-time indicating the end time. |
