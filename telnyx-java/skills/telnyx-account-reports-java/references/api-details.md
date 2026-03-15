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
