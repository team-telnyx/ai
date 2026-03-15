<!-- SDK reference: telnyx-porting-out-curl -->

# Telnyx Porting Out - curl

## Core Workflow

### Prerequisites

1. Port-out requests are initiated by the GAINING carrier, not by you

### Steps

1. **List port-out requests**
2. **View details**
3. **Update status**

### Common mistakes

- You cannot create port-out requests — they appear when another carrier requests your numbers
- Respond promptly to port-out requests — regulatory deadlines apply

**Related skills**: telnyx-numbers-curl, telnyx-porting-in-curl

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List portout requests

Returns the portout requests according to filters

`GET /portouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts"
```

Key response fields: `.data.id, .data.status, .data.state`

## List all port-out events

Returns a list of all port-out events.

`GET /portouts/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/events"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Show a port-out event

Show a specific port-out event.

`GET /portouts/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the port-out event. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/events/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Republish a port-out event

Republish a specific port-out event.

`POST /portouts/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the port-out event. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/portouts/events/550e8400-e29b-41d4-a716-446655440000/republish"
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`GET /portouts/rejections/{portout_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portout_id` | string (UUID) | Yes | Identifies a port out order. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/rejections/329d6658-8f93-405d-862f-648776e8afd7"
```

Key response fields: `.data.code, .data.description, .data.reason_required`

## List port-out related reports

List the reports generated about port-out operations.

`GET /portouts/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a port-out related report

Generate reports about port-out operations.

`POST /portouts/reports`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/portouts/reports"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`GET /portouts/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a report. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/reports/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a portout request

Returns the portout request based on the ID provided

`GET /portouts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.state`

## List all comments for a portout request

Returns a list of comments for a portout request.

`GET /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/550e8400-e29b-41d4-a716-446655440000/comments"
```

Key response fields: `.data.id, .data.body, .data.created_at`

## Create a comment on a portout request

Creates a comment on a portout request.

`POST /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |
| `body` | string | No | Comment to post on this portout request |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/portouts/550e8400-e29b-41d4-a716-446655440000/comments"
```

Key response fields: `.data.id, .data.body, .data.created_at`

## List supporting documents on a portout request

List every supporting documents for a portout request.

`GET /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/portouts/550e8400-e29b-41d4-a716-446655440000/supporting_documents"
```

Key response fields: `.data.id, .data.type, .data.created_at`

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`POST /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |
| `documents` | array[object] | No | List of supporting documents parameters |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/portouts/550e8400-e29b-41d4-a716-446655440000/supporting_documents"
```

Key response fields: `.data.id, .data.type, .data.created_at`

## Update Status

Authorize or reject portout request

`PATCH /portouts/{id}/{status}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | Yes | Provide a reason if rejecting the port out request |
| `id` | string (UUID) | Yes | Portout id |
| `status` | enum (authorized, rejected-pending) | Yes | Updated portout status |
| `host_messaging` | boolean | No | Indicates whether messaging services should be maintained wi... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "reason": "I do not recognize this transaction"
}' \
  "https://api.telnyx.com/v2/portouts/550e8400-e29b-41d4-a716-446655440000/{status}"
```

Key response fields: `.data.id, .data.status, .data.state`

---

# Porting Out (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List portout requests, Get a portout request, Update Status

| Field | Type |
|-------|------|
| `already_ported` | boolean |
| `authorized_name` | string |
| `carrier_name` | string |
| `city` | string |
| `created_at` | string |
| `current_carrier` | string |
| `end_user_name` | string |
| `foc_date` | string |
| `host_messaging` | boolean |
| `id` | string |
| `inserted_at` | string |
| `lsr` | array[string] |
| `phone_numbers` | array[string] |
| `pon` | string |
| `reason` | string \| null |
| `record_type` | string |
| `rejection_code` | integer |
| `requested_foc_date` | string |
| `service_address` | string |
| `spid` | string |
| `state` | string |
| `status` | enum: pending, authorized, ported, rejected, rejected-pending, canceled |
| `support_key` | string |
| `updated_at` | string |
| `user_id` | uuid |
| `vendor` | uuid |
| `zip` | string |

**Returned by:** List all port-out events, Show a port-out event

| Field | Type |
|-------|------|
| `available_notification_methods` | array[string] |
| `created_at` | date-time |
| `event_type` | enum: portout.status_changed, portout.foc_date_changed, portout.new_comment |
| `id` | uuid |
| `payload` | object |
| `payload_status` | enum: created, completed |
| `portout_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List eligible port-out rejection codes for a specific order

| Field | Type |
|-------|------|
| `code` | integer |
| `description` | string |
| `reason_required` | boolean |

**Returned by:** List port-out related reports, Create a port-out related report, Retrieve a report

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `document_id` | uuid |
| `id` | uuid |
| `params` | object |
| `record_type` | string |
| `report_type` | enum: export_portouts_csv |
| `status` | enum: pending, completed |
| `updated_at` | date-time |

**Returned by:** List all comments for a portout request, Create a comment on a portout request

| Field | Type |
|-------|------|
| `body` | string |
| `created_at` | string |
| `id` | string |
| `portout_id` | string |
| `record_type` | string |
| `user_id` | string |

**Returned by:** List supporting documents on a portout request, Create a list of supporting documents on a portout request

| Field | Type |
|-------|------|
| `created_at` | string |
| `document_id` | uuid |
| `id` | uuid |
| `portout_id` | uuid |
| `record_type` | string |
| `type` | enum: loa, invoice |
| `updated_at` | string |

## Optional Parameters

### Create a comment on a portout request

| Parameter | Type | Description |
|-----------|------|-------------|
| `body` | string | Comment to post on this portout request |

### Create a list of supporting documents on a portout request

| Parameter | Type | Description |
|-----------|------|-------------|
| `documents` | array[object] | List of supporting documents parameters |

### Update Status

| Parameter | Type | Description |
|-----------|------|-------------|
| `host_messaging` | boolean | Indicates whether messaging services should be maintained with Telnyx after t... |
