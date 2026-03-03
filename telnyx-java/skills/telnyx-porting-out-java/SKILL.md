---
name: telnyx-porting-out-java
description: >-
  Manage port-out requests when numbers are being ported away from Telnyx. List,
  view, and update port-out status. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: porting-out
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting Out - Java

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

## List portout requests

Returns the portout requests according to filters

`GET /portouts`

```java
import com.telnyx.sdk.models.portouts.PortoutListPage;
import com.telnyx.sdk.models.portouts.PortoutListParams;

PortoutListPage page = client.portouts().list();
```

## List all port-out events

Returns a list of all port-out events.

`GET /portouts/events`

```java
import com.telnyx.sdk.models.portouts.events.EventListPage;
import com.telnyx.sdk.models.portouts.events.EventListParams;

EventListPage page = client.portouts().events().list();
```

## Show a port-out event

Show a specific port-out event.

`GET /portouts/events/{id}`

```java
import com.telnyx.sdk.models.portouts.events.EventRetrieveParams;
import com.telnyx.sdk.models.portouts.events.EventRetrieveResponse;

EventRetrieveResponse event = client.portouts().events().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Republish a port-out event

Republish a specific port-out event.

`POST /portouts/events/{id}/republish`

```java
import com.telnyx.sdk.models.portouts.events.EventRepublishParams;

client.portouts().events().republish("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`GET /portouts/rejections/{portout_id}`

```java
import com.telnyx.sdk.models.portouts.PortoutListRejectionCodesParams;
import com.telnyx.sdk.models.portouts.PortoutListRejectionCodesResponse;

PortoutListRejectionCodesResponse response = client.portouts().listRejectionCodes("329d6658-8f93-405d-862f-648776e8afd7");
```

## List port-out related reports

List the reports generated about port-out operations.

`GET /portouts/reports`

```java
import com.telnyx.sdk.models.portouts.reports.ReportListPage;
import com.telnyx.sdk.models.portouts.reports.ReportListParams;

ReportListPage page = client.portouts().reports().list();
```

## Create a port-out related report

Generate reports about port-out operations.

`POST /portouts/reports`

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

## Retrieve a report

Retrieve a specific report generated.

`GET /portouts/reports/{id}`

```java
import com.telnyx.sdk.models.portouts.reports.ReportRetrieveParams;
import com.telnyx.sdk.models.portouts.reports.ReportRetrieveResponse;

ReportRetrieveResponse report = client.portouts().reports().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Get a portout request

Returns the portout request based on the ID provided

`GET /portouts/{id}`

```java
import com.telnyx.sdk.models.portouts.PortoutRetrieveParams;
import com.telnyx.sdk.models.portouts.PortoutRetrieveResponse;

PortoutRetrieveResponse portout = client.portouts().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List all comments for a portout request

Returns a list of comments for a portout request.

`GET /portouts/{id}/comments`

```java
import com.telnyx.sdk.models.portouts.comments.CommentListParams;
import com.telnyx.sdk.models.portouts.comments.CommentListResponse;

CommentListResponse comments = client.portouts().comments().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Create a comment on a portout request

Creates a comment on a portout request.

`POST /portouts/{id}/comments`

Optional: `body` (string)

```java
import com.telnyx.sdk.models.portouts.comments.CommentCreateParams;
import com.telnyx.sdk.models.portouts.comments.CommentCreateResponse;

CommentCreateResponse comment = client.portouts().comments().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List supporting documents on a portout request

List every supporting documents for a portout request.

`GET /portouts/{id}/supporting_documents`

```java
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentListParams;
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentListResponse;

SupportingDocumentListResponse supportingDocuments = client.portouts().supportingDocuments().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`POST /portouts/{id}/supporting_documents`

Optional: `documents` (array[object])

```java
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentCreateParams;
import com.telnyx.sdk.models.portouts.supportingdocuments.SupportingDocumentCreateResponse;

SupportingDocumentCreateResponse supportingDocument = client.portouts().supportingDocuments().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Update Status

Authorize or reject portout request

`PATCH /portouts/{id}/{status}` — Required: `reason`

Optional: `host_messaging` (boolean)

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
