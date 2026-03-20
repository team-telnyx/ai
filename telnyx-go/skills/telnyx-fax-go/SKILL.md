---
name: telnyx-fax-go
description: >-
  Send and receive faxes programmatically. Manage fax apps and media.
metadata:
  author: telnyx
  product: fax
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Fax - Go

## Core Workflow

### Prerequisites

1. Buy or port a phone number with fax capability (see telnyx-numbers-go)
2. Create a Fax Application with webhook URLs for inbound fax events
3. Assign the phone number to the Fax Application

### Steps

1. **Send fax**: `client.Faxes.Create(ctx, params)`
2. **Check status**: `client.Faxes.Retrieve(ctx, params)`
3. **Receive inbound fax**: `Handle fax.received webhook — media_url in payload`

### Common mistakes

- media_url must be a publicly accessible URL to a PDF or TIFF file
- Fax delivery is not instant — monitor status via webhooks or polling

**Related skills**: telnyx-numbers-go

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

result, err := client.Faxes.Create(ctx, params)
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send a fax

Send a fax. Files have size limits and page count limit validations. If a file is bigger than 50MB or has more than 350 pages it will fail with `file_size_limit_exceeded` and `page_count_limit_exceeded` respectively.

`client.Faxes.New()` — `POST /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | The connection ID to send the fax with. |
| `To` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent to o... |
| `From` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent from... |
| `WebhookUrl` | string (URL) | No | Use this field to override the URL to which Telnyx will send... |
| `ClientState` | string | No | Use this field to add state to every subsequent webhook. |
| `Quality` | enum (normal, high, very_high, ultra_light, ultra_dark) | No | The quality of the fax. |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```go
	fax, err := client.Faxes.New(context.Background(), telnyx.FaxNewParams{
		ConnectionID: "234423",
		From:         "+13125790015",
		To:           "+13127367276",
		MediaURL: "https://example.com/document.pdf",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fax.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## View a fax

`client.Faxes.Get()` — `GET /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The unique identifier of a fax. |

```go
	fax, err := client.Faxes.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fax.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a fax

`client.Faxes.Delete()` — `DELETE /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The unique identifier of a fax. |

```go
	err := client.Faxes.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## List all Fax Applications

This endpoint returns a list of your Fax Applications inside the 'data' attribute of the response. You can adjust which applications are listed by using filters. Fax Applications are used to configure how you send and receive faxes using the Programmable Fax API with Telnyx.

`client.FaxApplications.List()` — `GET /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, application_name, active) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.FaxApplications.List(context.Background(), telnyx.FaxApplicationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates a Fax Application

Creates a new Fax Application based on the parameters sent in the request. The application name and webhook URL are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.FaxApplications.New()` — `POST /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationName` | string | Yes | A user-assigned name to help manage the application. |
| `WebhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `Tags` | array[string] | No | Tags associated with the Fax Application. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `Active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	faxApplication, err := client.FaxApplications.New(context.Background(), telnyx.FaxApplicationNewParams{
		ApplicationName: "fax-router",
		WebhookEventURL: "https://example.com",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", faxApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Fax Application

Return the details of an existing Fax Application inside the 'data' attribute of the response.

`client.FaxApplications.Get()` — `GET /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	faxApplication, err := client.FaxApplications.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", faxApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Fax Application

Updates settings of an existing Fax Application based on the parameters of the request.

`client.FaxApplications.Update()` — `PATCH /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationName` | string | Yes | A user-assigned name to help manage the application. |
| `WebhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | Tags associated with the Fax Application. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `Active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```go
	faxApplication, err := client.FaxApplications.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.FaxApplicationUpdateParams{
			ApplicationName: "fax-router",
			WebhookEventURL: "https://example.com",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", faxApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes a Fax Application

Permanently deletes a Fax Application. Deletion may be prevented if the application is in use by phone numbers.

`client.FaxApplications.Delete()` — `DELETE /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	faxApplication, err := client.FaxApplications.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", faxApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a list of faxes

`client.Faxes.List()` — `GET /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated pagination parameter (deepObject style). |

```go
	page, err := client.Faxes.List(context.Background(), telnyx.FaxListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Cancel a fax

Cancel the outbound fax that is in one of the following states: `queued`, `media.processed`, `originated` or `sending`

`client.Faxes.Actions.Cancel()` — `POST /faxes/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The unique identifier of a fax. |

```go
	response, err := client.Faxes.Actions.Cancel(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

## Refresh a fax

Refreshes the inbound fax's media_url when it has expired

`client.Faxes.Actions.Refresh()` — `POST /faxes/{id}/actions/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The unique identifier of a fax. |

```go
	response, err := client.Faxes.Actions.Refresh(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```go
// In your webhook handler:
func handleWebhook(w http.ResponseWriter, r *http.Request) {
  body, _ := io.ReadAll(r.Body)
  event, err := client.Webhooks.Unwrap(body, r.Header)
  if err != nil {
    http.Error(w, "Invalid signature", http.StatusBadRequest)
    return
  }
  // Signature valid — event is the parsed webhook payload
  fmt.Println("Received event:", event.Data.EventType)
  w.WriteHeader(http.StatusOK)
}
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `fax.delivered` | `fax.delivered` | Fax Delivered |
| `fax.failed` | `fax.failed` | Fax Failed |
| `fax.media.processed` | `fax.media.processed` | Fax Media Processed |
| `fax.queued` | `fax.queued` | Fax Queued |
| `fax.sending.started` | `fax.sending.started` | Fax Sending Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
