---
name: telnyx-porting-out-go
description: >-
  Manage port-out requests when numbers leave Telnyx. List, view, and update
  status.
metadata:
  author: telnyx
  product: porting-out
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting Out - Go

## Core Workflow

### Prerequisites

1. Port-out requests are initiated by the GAINING carrier, not by you

### Steps

1. **List port-out requests**: `client.Portouts.List(ctx, params)`
2. **View details**: `client.Portouts.Retrieve(ctx, params)`
3. **Update status**: `client.Portouts.Update(ctx, params)`

### Common mistakes

- You cannot create port-out requests — they appear when another carrier requests your numbers
- Respond promptly to port-out requests — regulatory deadlines apply

**Related skills**: telnyx-numbers-go, telnyx-porting-in-go

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

result, err := client.Portouts.List(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List portout requests

Returns the portout requests according to filters

`client.Portouts.List()` — `GET /portouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Portouts.List(context.Background(), telnyx.PortoutListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.state`

## List all port-out events

Returns a list of all port-out events.

`client.Portouts.Events.List()` — `GET /portouts/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Portouts.Events.List(context.Background(), telnyx.PortoutEventListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Show a port-out event

Show a specific port-out event.

`client.Portouts.Events.Get()` — `GET /portouts/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the port-out event. |

```go
	event, err := client.Portouts.Events.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", event.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Republish a port-out event

Republish a specific port-out event.

`client.Portouts.Events.Republish()` — `POST /portouts/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the port-out event. |

```go
	err := client.Portouts.Events.Republish(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`client.Portouts.ListRejectionCodes()` — `GET /portouts/rejections/{portout_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortoutId` | string (UUID) | Yes | Identifies a port out order. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	response, err := client.Portouts.ListRejectionCodes(
		context.Background(),
		"329d6658-8f93-405d-862f-648776e8afd7",
		telnyx.PortoutListRejectionCodesParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.code, response.data.description, response.data.reason_required`

## List port-out related reports

List the reports generated about port-out operations.

`client.Portouts.Reports.List()` — `GET /portouts/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Portouts.Reports.List(context.Background(), telnyx.PortoutReportListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a port-out related report

Generate reports about port-out operations.

`client.Portouts.Reports.New()` — `POST /portouts/reports`

```go
	report, err := client.Portouts.Reports.New(context.Background(), telnyx.PortoutReportNewParams{
		Params: telnyx.ExportPortoutsCsvReportParam{
			Filters: telnyx.ExportPortoutsCsvReportFiltersParam{},
		},
		ReportType: telnyx.PortoutReportNewParamsReportTypeExportPortoutsCsv,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", report.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.Portouts.Reports.Get()` — `GET /portouts/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies a report. |

```go
	report, err := client.Portouts.Reports.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", report.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a portout request

Returns the portout request based on the ID provided

`client.Portouts.Get()` — `GET /portouts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Portout id |

```go
	portout, err := client.Portouts.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", portout.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.state`

## List all comments for a portout request

Returns a list of comments for a portout request.

`client.Portouts.Comments.List()` — `GET /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Portout id |

```go
	comments, err := client.Portouts.Comments.List(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", comments.Data)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment on a portout request

Creates a comment on a portout request.

`client.Portouts.Comments.New()` — `POST /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Portout id |
| `Body` | string | No | Comment to post on this portout request |

```go
	comment, err := client.Portouts.Comments.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortoutCommentNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", comment.Data)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## List supporting documents on a portout request

List every supporting documents for a portout request.

`client.Portouts.SupportingDocuments.List()` — `GET /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Portout id |

```go
	supportingDocuments, err := client.Portouts.SupportingDocuments.List(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", supportingDocuments.Data)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`client.Portouts.SupportingDocuments.New()` — `POST /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Portout id |
| `Documents` | array[object] | No | List of supporting documents parameters |

```go
	supportingDocument, err := client.Portouts.SupportingDocuments.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortoutSupportingDocumentNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", supportingDocument.Data)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Update Status

Authorize or reject portout request

`client.Portouts.UpdateStatus()` — `PATCH /portouts/{id}/{status}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Reason` | string | Yes | Provide a reason if rejecting the port out request |
| `Id` | string (UUID) | Yes | Portout id |
| `Status` | enum (authorized, rejected-pending) | Yes | Updated portout status |
| `HostMessaging` | boolean | No | Indicates whether messaging services should be maintained wi... |

```go
	response, err := client.Portouts.UpdateStatus(
		context.Background(),
		telnyx.PortoutUpdateStatusParamsStatusAuthorized,
		telnyx.PortoutUpdateStatusParams{
			ID:     "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			Reason: "I do not recognize this transaction",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.state`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
