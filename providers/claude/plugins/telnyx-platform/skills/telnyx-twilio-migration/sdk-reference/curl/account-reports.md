<!-- SDK reference: telnyx-account-reports-curl -->

# Telnyx Account Reports - curl

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
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

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

## List call events

Filters call events by given filter parameters. Events are ordered by `occurred_at`. If filter for `leg_id` or `application_session_id` is not present, it only filters events from the last 24 hours.

`GET /call_events`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/call_events"
```

Returns: `call_leg_id` (string), `call_session_id` (string), `event_timestamp` (string), `metadata` (object), `name` (string), `record_type` (enum: call_event), `type` (enum: command, webhook)

## Create a ledger billing group report

`POST /ledger_billing_group_reports`

Optional: `month` (integer), `year` (integer)

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

Returns: `created_at` (date-time), `id` (uuid), `organization_id` (uuid), `record_type` (enum: ledger_billing_group_report), `report_url` (uri), `status` (enum: pending, complete, failed, deleted), `updated_at` (date-time)

## Get a ledger billing group report

`GET /ledger_billing_group_reports/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ledger_billing_group_reports/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Returns: `created_at` (date-time), `id` (uuid), `organization_id` (uuid), `record_type` (enum: ledger_billing_group_report), `report_url` (uri), `status` (enum: pending, complete, failed, deleted), `updated_at` (date-time)

## Get all MDR detailed report requests

Retrieves all MDR detailed report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/messaging`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging"
```

Returns: `connections` (array[integer]), `created_at` (date-time), `directions` (array[string]), `end_date` (date-time), `filters` (array[object]), `id` (uuid), `profiles` (array[string]), `record_type` (string), `record_types` (array[string]), `report_name` (string), `report_url` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Create a new MDR detailed report request

Creates a new MDR detailed report request with the specified filters

`POST /legacy/reporting/batch_detail_records/messaging` — Required: `start_time`, `end_time`

Optional: `connections` (array[integer]), `directions` (array[integer]), `filters` (array[object]), `include_message_body` (boolean), `managed_accounts` (array[string]), `profiles` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `timezone` (string)

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

Returns: `connections` (array[integer]), `created_at` (date-time), `directions` (array[string]), `end_date` (date-time), `filters` (array[object]), `id` (uuid), `profiles` (array[string]), `record_type` (string), `record_types` (array[string]), `report_name` (string), `report_url` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Get a specific MDR detailed report request

Retrieves a specific MDR detailed report request by ID

`GET /legacy/reporting/batch_detail_records/messaging/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `connections` (array[integer]), `created_at` (date-time), `directions` (array[string]), `end_date` (date-time), `filters` (array[object]), `id` (uuid), `profiles` (array[string]), `record_type` (string), `record_types` (array[string]), `report_name` (string), `report_url` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Delete a MDR detailed report request

Deletes a specific MDR detailed report request by ID

`DELETE /legacy/reporting/batch_detail_records/messaging/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `connections` (array[integer]), `created_at` (date-time), `directions` (array[string]), `end_date` (date-time), `filters` (array[object]), `id` (uuid), `profiles` (array[string]), `record_type` (string), `record_types` (array[string]), `report_name` (string), `report_url` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Get all CDR report requests

Retrieves all CDR report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/voice`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice"
```

Returns: `call_types` (array[integer]), `connections` (array[integer]), `created_at` (string), `end_time` (string), `filters` (array[object]), `id` (string), `managed_accounts` (array[string]), `record_type` (string), `record_types` (array[integer]), `report_name` (string), `report_url` (string), `retry` (int32), `source` (string), `start_time` (string), `status` (int32), `timezone` (string), `updated_at` (string)

## Create a new CDR report request

Creates a new CDR report request with the specified filters

`POST /legacy/reporting/batch_detail_records/voice` — Required: `start_time`, `end_time`

Optional: `call_types` (array[integer]), `connections` (array[integer]), `fields` (array[string]), `filters` (array[object]), `include_all_metadata` (boolean), `managed_accounts` (array[string]), `record_types` (array[integer]), `report_name` (string), `select_all_managed_accounts` (boolean), `source` (string), `timezone` (string)

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

Returns: `call_types` (array[integer]), `connections` (array[integer]), `created_at` (string), `end_time` (string), `filters` (array[object]), `id` (string), `managed_accounts` (array[string]), `record_type` (string), `record_types` (array[integer]), `report_name` (string), `report_url` (string), `retry` (int32), `source` (string), `start_time` (string), `status` (int32), `timezone` (string), `updated_at` (string)

## Get available CDR report fields

Retrieves all available fields that can be used in CDR reports

`GET /legacy/reporting/batch_detail_records/voice/fields`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice/fields"
```

Returns: `Billing` (array[string]), `Interaction Data` (array[string]), `Number Information` (array[string]), `Telephony Data` (array[string])

## Get a specific CDR report request

Retrieves a specific CDR report request by ID

`GET /legacy/reporting/batch_detail_records/voice/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `call_types` (array[integer]), `connections` (array[integer]), `created_at` (string), `end_time` (string), `filters` (array[object]), `id` (string), `managed_accounts` (array[string]), `record_type` (string), `record_types` (array[integer]), `report_name` (string), `report_url` (string), `retry` (int32), `source` (string), `start_time` (string), `status` (int32), `timezone` (string), `updated_at` (string)

## Delete a CDR report request

Deletes a specific CDR report request by ID

`DELETE /legacy/reporting/batch_detail_records/voice/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/voice/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `call_types` (array[integer]), `connections` (array[integer]), `created_at` (string), `end_time` (string), `filters` (array[object]), `id` (string), `managed_accounts` (array[string]), `record_type` (string), `record_types` (array[integer]), `report_name` (string), `report_url` (string), `retry` (int32), `source` (string), `start_time` (string), `status` (int32), `timezone` (string), `updated_at` (string)

## List MDR usage reports

Fetch all previous requests for MDR usage reports.

`GET /legacy/reporting/usage_reports/messaging`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging"
```

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `profiles` (array[string]), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

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

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `profiles` (array[string]), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

## Get an MDR usage report

Fetch single MDR usage report by id.

`GET /legacy/reporting/usage_reports/messaging/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `profiles` (array[string]), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

## Delete a V2 legacy usage MDR report request

Deletes a specific V2 legacy usage MDR report request by ID

`DELETE /legacy/reporting/usage_reports/messaging/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/messaging/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `profiles` (array[string]), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

## List telco data usage reports

Retrieve a paginated list of telco data usage reports

`GET /legacy/reporting/usage_reports/number_lookup`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup"
```

Returns: `aggregation_type` (string), `created_at` (date-time), `end_date` (date), `id` (uuid), `managed_accounts` (array[string]), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date), `status` (string), `updated_at` (date-time)

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

Returns: `aggregation_type` (string), `created_at` (date-time), `end_date` (date), `id` (uuid), `managed_accounts` (array[string]), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date), `status` (string), `updated_at` (date-time)

## Get telco data usage report by ID

Retrieve a specific telco data usage report by its ID

`GET /legacy/reporting/usage_reports/number_lookup/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (string), `created_at` (date-time), `end_date` (date), `id` (uuid), `managed_accounts` (array[string]), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date), `status` (string), `updated_at` (date-time)

## Delete telco data usage report

Delete a specific telco data usage report by its ID

`DELETE /legacy/reporting/usage_reports/number_lookup/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/number_lookup/550e8400-e29b-41d4-a716-446655440000"
```

## List CDR usage reports

Fetch all previous requests for cdr usage reports.

`GET /legacy/reporting/usage_reports/voice`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice"
```

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `product_breakdown` (int32), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

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

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `product_breakdown` (int32), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

## Get a CDR usage report

Fetch single cdr usage report by id.

`GET /legacy/reporting/usage_reports/voice/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `product_breakdown` (int32), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

## Delete a V2 legacy usage CDR report request

Deletes a specific V2 legacy usage CDR report request by ID

`DELETE /legacy/reporting/usage_reports/voice/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/usage_reports/voice/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (int32), `connections` (array[string]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `product_breakdown` (int32), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (int32), `updated_at` (date-time)

## List CSV downloads

`GET /phone_numbers/csv_downloads`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/csv_downloads"
```

Returns: `id` (string), `record_type` (string), `status` (enum: pending, complete, failed, expired), `url` (string)

## Create a CSV download

`POST /phone_numbers/csv_downloads`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/phone_numbers/csv_downloads"
```

Returns: `id` (string), `record_type` (string), `status` (enum: pending, complete, failed, expired), `url` (string)

## Retrieve a CSV download

`GET /phone_numbers/csv_downloads/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers/csv_downloads/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `id` (string), `record_type` (string), `status` (enum: pending, complete, failed, expired), `url` (string)

## Generates and fetches CDR Usage Reports

Generate and fetch voice usage report synchronously. This endpoint will both generate and fetch the voice report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`GET /reports/cdr_usage_reports/sync`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/cdr_usage_reports/sync?start_date=2020-07-01T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00&aggregation_type=NO_AGGREGATION&product_breakdown=NO_BREAKDOWN&connections=[1234567890123]"
```

Returns: `aggregation_type` (enum: NO_AGGREGATION, CONNECTION, TAG, BILLING_GROUP), `connections` (array[integer]), `created_at` (date-time), `end_time` (date-time), `id` (uuid), `product_breakdown` (enum: NO_BREAKDOWN, DID_VS_TOLL_FREE, COUNTRY, DID_VS_TOLL_FREE_PER_COUNTRY), `record_type` (string), `report_url` (string), `result` (object), `start_time` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Fetch all Messaging usage reports

Fetch all messaging usage reports. Usage reports are aggregated messaging data for specified time period and breakdown

`GET /reports/mdr_usage_reports`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdr_usage_reports"
```

Returns: `aggregation_type` (enum: NO_AGGREGATION, PROFILE, TAGS), `connections` (array[integer]), `created_at` (date-time), `end_date` (date-time), `id` (uuid), `profiles` (string), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

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

Returns: `aggregation_type` (enum: NO_AGGREGATION, PROFILE, TAGS), `connections` (array[integer]), `created_at` (date-time), `end_date` (date-time), `id` (uuid), `profiles` (string), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Generate and fetch MDR Usage Report

Generate and fetch messaging usage report synchronously. This endpoint will both generate and fetch the messaging report over a specified time period. No polling is necessary but the response may take up to a couple of minutes.

`GET /reports/mdr_usage_reports/sync`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdr_usage_reports/sync?start_date=2020-07-01T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00&aggregation_type=PROFILE&profiles=['My profile']"
```

Returns: `aggregation_type` (enum: NO_AGGREGATION, PROFILE, TAGS), `connections` (array[integer]), `created_at` (date-time), `end_date` (date-time), `id` (uuid), `profiles` (string), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Retrieve messaging report

Fetch a single messaging usage report by id

`GET /reports/mdr_usage_reports/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdr_usage_reports/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (enum: NO_AGGREGATION, PROFILE, TAGS), `connections` (array[integer]), `created_at` (date-time), `end_date` (date-time), `id` (uuid), `profiles` (string), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Delete MDR Usage Report

Delete messaging usage report by id

`DELETE /reports/mdr_usage_reports/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/reports/mdr_usage_reports/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `aggregation_type` (enum: NO_AGGREGATION, PROFILE, TAGS), `connections` (array[integer]), `created_at` (date-time), `end_date` (date-time), `id` (uuid), `profiles` (string), `record_type` (string), `report_url` (string), `result` (array[object]), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED), `updated_at` (date-time)

## Fetch all Mdr records

`GET /reports/mdrs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/mdrs?id=e093fbe0-5bde-11eb-ae93-0242ac130002&direction=INBOUND&profile=My profile&cld=+15551237654&cli=+15551237654&status=DELIVERED&message_type=SMS"
```

Returns: `cld` (string), `cli` (string), `cost` (string), `created_at` (date-time), `currency` (enum: AUD, CAD, EUR, GBP, USD), `direction` (string), `id` (string), `message_type` (enum: SMS, MMS), `parts` (number), `profile_name` (string), `rate` (string), `record_type` (string), `status` (enum: GW_TIMEOUT, DELIVERED, DLR_UNCONFIRMED, DLR_TIMEOUT, RECEIVED, GW_REJECT, FAILED)

## Fetches all Wdr records

Fetch all Wdr records

`GET /reports/wdrs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/reports/wdrs?start_date=2021-05-01T00:00:00Z&end_date=2021-06-01T00:00:00Z&id=e093fbe0-5bde-11eb-ae93-0242ac130002&mcc=204&mnc=01&imsi=123456&sim_group_name=sim name&sim_group_id=f05a189f-7c46-4531-ac56-1460dc465a42&sim_card_id=877f80a6-e5b2-4687-9a04-88076265720f&phone_number=+12345678910&sort=['created_at']"
```

Returns: `cost` (object), `created_at` (date-time), `downlink_data` (object), `duration_seconds` (number), `id` (string), `imsi` (string), `mcc` (string), `mnc` (string), `phone_number` (string), `rate` (object), `record_type` (string), `sim_card_id` (string), `sim_group_id` (string), `sim_group_name` (string), `uplink_data` (object)

## Get metadata overview

Returns all available record types and supported query parameters for session analysis.

`GET /session_analysis/metadata`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/session_analysis/metadata"
```

Returns: `meta` (object), `query_parameters` (object), `record_types` (array[object])

## Get record type metadata

Returns detailed metadata for a specific record type, including relationships and examples.

`GET /session_analysis/metadata/{record_type}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/session_analysis/metadata/{record_type}"
```

Returns: `aliases` (array[string]), `child_relationships` (array[object]), `event` (string), `examples` (object), `meta` (object), `parent_relationships` (array[object]), `product` (string), `record_type` (string)

## Get session analysis

Retrieves a full session analysis tree for a given event, including costs, child events, and product linkages.

`GET /session_analysis/{record_type}/{event_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/session_analysis/{record_type}/{event_id}"
```

Returns: `completed_at` (date-time), `cost` (object), `created_at` (date-time), `meta` (object), `root` (object), `session_id` (string), `status` (string)

## Get Telnyx product usage data (BETA)

Get Telnyx usage data by product, broken out by the specified dimensions

`GET /usage_reports`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/usage_reports"
```

Returns: `data` (array[object]), `meta` (object)

## Get Usage Reports query options (BETA)

Get the Usage Reports options for querying usage, including the products available and their respective metrics and dimensions

`GET /usage_reports/options`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/usage_reports/options"
```

Returns: `product` (string), `product_dimensions` (array[string]), `product_metrics` (array[string]), `record_types` (array[object])

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`GET /wireless/detail_records_reports`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless/detail_records_reports"
```

Returns: `created_at` (string), `end_time` (string), `id` (uuid), `record_type` (string), `report_url` (string), `start_time` (string), `status` (enum: pending, complete, failed, deleted), `updated_at` (string)

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`POST /wireless/detail_records_reports`

Optional: `end_time` (string), `start_time` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/wireless/detail_records_reports"
```

Returns: `created_at` (string), `end_time` (string), `id` (uuid), `record_type` (string), `report_url` (string), `start_time` (string), `status` (enum: pending, complete, failed, deleted), `updated_at` (string)

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`GET /wireless/detail_records_reports/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless/detail_records_reports/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `end_time` (string), `id` (uuid), `record_type` (string), `report_url` (string), `start_time` (string), `status` (enum: pending, complete, failed, deleted), `updated_at` (string)

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`DELETE /wireless/detail_records_reports/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireless/detail_records_reports/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `end_time` (string), `id` (uuid), `record_type` (string), `report_url` (string), `start_time` (string), `status` (enum: pending, complete, failed, deleted), `updated_at` (string)
