---
name: telnyx-seti-go
description: >-
  SETI (Space Exploration Telecommunications Infrastructure) APIs.
metadata:
  author: telnyx
  product: seti
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Seti - Go

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

result, err := client.Messages.Send(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Get Enum

`client.Messaging10dlc.GetEnum()` — `GET /10dlc/enum/{endpoint}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Endpoint` | enum (mno, optionalAttributes, usecase, vertical, altBusinessIdType, ...) | Yes |  |

```go
	response, err := client.Messaging10dlc.GetEnum(context.Background(), telnyx.Messaging10dlcGetEnumParamsEndpointMno)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`client.Seti.GetBlackBoxTestResults()` — `GET /seti/black_box_test_results`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	response, err := client.Seti.GetBlackBoxTestResults(context.Background(), telnyx.SetiGetBlackBoxTestResultsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.black_box_tests, response.data.product, response.data.record_type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
