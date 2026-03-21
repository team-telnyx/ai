<!-- SDK reference: telnyx-porting-out-java -->

# Telnyx Porting Out - Java

## Core Workflow

### Prerequisites

1. Port-out requests are initiated by the GAINING carrier, not by you

### Steps

1. **List port-out requests**: `client.portouts().list(params)`
2. **View details**: `client.portouts().retrieve(params)`
3. **Update status**: `client.portouts().update(params)`

### Common mistakes

- You cannot create port-out requests — they appear when another carrier requests your numbers
- Respond promptly to port-out requests — regulatory deadlines apply

**Related skills**: telnyx-numbers-java, telnyx-porting-in-java

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
    var result = client.portouts().list(params);
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
## List portout requests

Returns the portout requests according to filters

`client.portouts().list()` — `GET /portouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portouts.PortoutListPage;
import com.telnyx.sdk.models.portouts.PortoutListParams;

PortoutListPage page = client.portouts().list();
```

Key response fields: `response.data.id, response.data.status, response.data.state`

## List all port-out events

Returns a list of all port-out events.

`client.portouts().events().list()` — `GET /portouts/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portouts.events.EventListPage;
import com.telnyx.sdk.models.portouts.events.EventListParams;

EventListPage page = client.portouts().events().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Show a port-out event

Show a specific port-out event.

`client.portouts().events().retrieve()` — `GET /portouts/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the port-out event. |

```java
import com.telnyx.sdk.models.portouts.events.EventRetrieveParams;
import com.telnyx.sdk.models.portouts.events.EventRetrieveResponse;

EventRetrieveResponse event = client.portouts().events().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Republish a port-out event

Republish a specific port-out event.

`client.portouts().events().republish()` — `POST /portouts/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the port-out event. |

```java
import com.telnyx.sdk.models.portouts.events.EventRepublishParams;

client.portouts().events().republish("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`client.portouts().listRejectionCodes()` — `GET /portouts/rejections/{portout_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portoutId` | string (UUID) | Yes | Identifies a port out order. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portouts.PortoutListRejectionCodesParams;
import com.telnyx.sdk.models.portouts.PortoutListRejectionCodesResponse;

PortoutListRejectionCodesResponse response = client.portouts().listRejectionCodes("329d6658-8f93-405d-862f-648776e8afd7");
```

Key response fields: `response.data.code, response.data.description, response.data.reason_required`

## List port-out related reports

List the reports generated about port-out operations.

`client.portouts().reports().list()` — `GET /portouts/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portouts.reports.ReportListPage;
import com.telnyx.sdk.models.portouts.reports.ReportListParams;

ReportListPage page = client.portouts().reports().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a port-out related report

Generate reports about port-out operations.

`client.portouts().reports().create()` — `POST /portouts/reports`

```java
import com.telnyx.sdk.models.portouts.reports.ExportPortoutsCsvReport;
import com.telnyx.sdk.models.portouts.reports.ReportCreateParams;
import com.telnyx.sdk.models.portouts.reports.ReportCreateResponse;

ReportCreateParams params = ReportCreateParams.builder()
    .params(ExportPortoutsCsvReport.builder()
        .filters(ExportPortoutsCsvReport.Filters.builder().build())
        .build())
    .reportType(ReportCreateParams.ReportType.EXPORT_PORTOUTS_CSV)
    .build();
ReportCreateResponse report = client.portouts().reports().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.portouts().reports().retrieve()` — `GET /portouts/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a report. |

```java
import com.telnyx.sdk.models.portouts.reports.ReportRetrieveParams;
import com.telnyx.sdk.models.portouts.reports.ReportRetrieveResponse;

ReportRetrieveResponse report = client.portouts().reports().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a portout request

Returns the portout request based on the ID provided

`client.portouts().retrieve()` — `GET /portouts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```java
import com.telnyx.sdk.models.portouts.PortoutRetrieveParams;
import com.telnyx.sdk.models.portouts.PortoutRetrieveResponse;

PortoutRetrieveResponse portout = client.portouts().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.state`

## List all comments for a portout request

Returns a list of comments for a portout request.

`client.portouts().comments().list()` — `GET /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```java
import com.telnyx.sdk.models.portouts.comments.CommentListParams;
import com.telnyx.sdk.models.portouts.comments.CommentListResponse;

CommentListResponse comments = client.portouts().comments().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment on a portout request

Creates a comment on a portout request.

`client.portouts().comments().create()` — `POST /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |
| `body` | string | No | Comment to post on this portout request |

```java
import com.telnyx.sdk.models.portouts.comments.CommentCreateParams;
import com.telnyx.sdk.models.portouts.comments.CommentCreateResponse;

CommentCreateResponse comment = client.portouts().comments().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## List supporting documents on a portout request

List every supporting documents for a portout request.

`client.portouts().supportingDocuments().list()` — `GET /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```java
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentListParams;
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentListResponse;

SupportingDocumentListResponse supportingDocuments = client.portouts().supportingDocuments().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`client.portouts().supportingDocuments().create()` — `POST /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |
| `documents` | array[object] | No | List of supporting documents parameters |

```java
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentCreateParams;
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentCreateResponse;

SupportingDocumentCreateResponse supportingDocument = client.portouts().supportingDocuments().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Update Status

Authorize or reject portout request

`client.portouts().updateStatus()` — `PATCH /portouts/{id}/{status}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | Yes | Provide a reason if rejecting the port out request |
| `id` | string (UUID) | Yes | Portout id |
| `status` | enum (authorized, rejected-pending) | Yes | Updated portout status |
| `hostMessaging` | boolean | No | Indicates whether messaging services should be maintained wi... |

```java
import com.telnyx.sdk.models.portouts.PortoutUpdateStatusParams;
import com.telnyx.sdk.models.portouts.PortoutUpdateStatusResponse;

PortoutUpdateStatusParams params = PortoutUpdateStatusParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .status(PortoutUpdateStatusParams.Status.AUTHORIZED)
    .reason("I do not recognize this transaction")
    .build();
PortoutUpdateStatusResponse response = client.portouts().updateStatus(params);
```

Key response fields: `response.data.id, response.data.status, response.data.state`

---

# Porting Out (Java) — API Details

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

### Create a comment on a portout request — `client.portouts().comments().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `body` | string | Comment to post on this portout request |

### Create a list of supporting documents on a portout request — `client.portouts().supportingDocuments().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `documents` | array[object] | List of supporting documents parameters |

### Update Status — `client.portouts().updateStatus()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `hostMessaging` | boolean | Indicates whether messaging services should be maintained with Telnyx after t... |
