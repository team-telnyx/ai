---
name: telnyx-porting-in-go
description: >-
  Port numbers into Telnyx: portability checks, port orders, LOA upload, status
  tracking.
metadata:
  author: telnyx
  product: porting-in
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting In - Go

## Core Workflow

### Prerequisites

1. Run portability check on all numbers before creating a port order
2. Have Letter of Authorization (LOA) and recent invoice from current carrier ready
3. Pre-create connection_id and/or messaging_profile_id to assign during fulfillment

### Steps

1. **Check portability**: `client.Porting.PortabilityChecks.Create(ctx, params)`
2. **Create draft order**: `client.Porting.Orders.Create(ctx, params)`
3. **Fulfill each split order**: `Upload LOA, invoice, end-user info, service address`
4. **Submit order**: `Transitions from draft to in-process`
5. **Monitor via webhooks**: `porting_order.status_changed, porting_order.new_comment`

### Common mistakes

- NEVER skip portability check — non-portable numbers cause downstream failures
- NEVER treat auto-split orders as a single entity — each split requires independent completion
- NEVER assume requested FOC date is guaranteed — the losing carrier determines the actual date
- ALWAYS monitor for Porting Operations comments — unanswered info requests kill the port

**Related skills**: telnyx-numbers-go, telnyx-numbers-config-go, telnyx-voice-go, telnyx-messaging-go

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

result, err := client.Porting.Orders.Create(ctx, params)
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

## Run a portability check

Runs a portability check, returning the results immediately.

`client.PortabilityChecks.Run()` — `POST /portability_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | No | The list of +E.164 formatted phone numbers to check for port... |

```go
	response, err := client.PortabilityChecks.Run(context.Background(), telnyx.PortabilityCheckRunParams{
		PhoneNumbers: []string{"+18005550101"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.phone_number, response.data.fast_portable, response.data.not_portable_reason`

## Create a porting order

Creates a new porting order object.

`client.PortingOrders.New()` — `POST /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes | The list of +E.164 formatted phone numbers |
| `CustomerReference` | string | No | A customer-specified reference number for customer bookkeepi... |
| `CustomerGroupReference` | string | No | A customer-specified group reference for customer bookkeepin... |

```go
	portingOrder, err := client.PortingOrders.New(context.Background(), telnyx.PortingOrderNewParams{
		PhoneNumbers: []string{"+13035550000", "+13035550001", "+13035550002"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", portingOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting order

Retrieves the details of an existing porting order.

`client.PortingOrders.Get()` — `GET /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `IncludePhoneNumbers` | boolean | No | Include the first 50 phone number objects in the results |

```go
	portingOrder, err := client.PortingOrders.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", portingOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a porting order.

Confirm and submit your porting order.

`client.PortingOrders.Actions.Confirm()` — `POST /porting_orders/{id}/actions/confirm`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.Actions.Confirm(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all porting events

Returns a list of all porting events.

`client.Porting.Events.List()` — `GET /porting/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Porting.Events.List(context.Background(), telnyx.PortingEventListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Show a porting event

Show a specific porting event.

`client.Porting.Events.Get()` — `GET /porting/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the porting event. |

```go
	event, err := client.Porting.Events.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", event.Data)
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Republish a porting event

Republish a specific porting event.

`client.Porting.Events.Republish()` — `POST /porting/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the porting event. |

```go
	err := client.Porting.Events.Republish(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## List LOA configurations

List the LOA configurations.

`client.Porting.LoaConfigurations.List()` — `GET /porting/loa_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Porting.LoaConfigurations.List(context.Background(), telnyx.PortingLoaConfigurationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a LOA configuration

Create a LOA configuration.

`client.Porting.LoaConfigurations.New()` — `POST /porting/loa_configurations`

```go
	loaConfiguration, err := client.Porting.LoaConfigurations.New(context.Background(), telnyx.PortingLoaConfigurationNewParams{
		Address: telnyx.PortingLoaConfigurationNewParamsAddress{
			City:          "Austin",
			CountryCode:   "US",
			State:         "TX",
			StreetAddress: "600 Congress Avenue",
			ZipCode:       "78701",
		},
		CompanyName: "Telnyx",
		Contact: telnyx.PortingLoaConfigurationNewParamsContact{
			Email:       "testing@telnyx.com",
			PhoneNumber: "+12003270001",
		},
		Logo: telnyx.PortingLoaConfigurationNewParamsLogo{
			DocumentID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
		Name: "My LOA Configuration",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", loaConfiguration.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`client.Porting.LoaConfigurations.Preview()` — `POST /porting/loa_configurations/preview`

```go
	response, err := client.Porting.LoaConfigurations.Preview(context.Background(), telnyx.PortingLoaConfigurationPreviewParams{
		Address: telnyx.PortingLoaConfigurationPreviewParamsAddress{
			City:          "Austin",
			CountryCode:   "US",
			State:         "TX",
			StreetAddress: "600 Congress Avenue",
			ZipCode:       "78701",
		},
		CompanyName: "Telnyx",
		Contact: telnyx.PortingLoaConfigurationPreviewParamsContact{
			Email:       "testing@telnyx.com",
			PhoneNumber: "+12003270001",
		},
		Logo: telnyx.PortingLoaConfigurationPreviewParamsLogo{
			DocumentID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
		Name: "My LOA Configuration",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`client.Porting.LoaConfigurations.Get()` — `GET /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies a LOA configuration. |

```go
	loaConfiguration, err := client.Porting.LoaConfigurations.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", loaConfiguration.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a LOA configuration

Update a specific LOA configuration.

`client.Porting.LoaConfigurations.Update()` — `PATCH /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies a LOA configuration. |

```go
	loaConfiguration, err := client.Porting.LoaConfigurations.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingLoaConfigurationUpdateParams{
			Address: telnyx.PortingLoaConfigurationUpdateParamsAddress{
				City:          "Austin",
				CountryCode:   "US",
				State:         "TX",
				StreetAddress: "600 Congress Avenue",
				ZipCode:       "78701",
			},
			CompanyName: "Telnyx",
			Contact: telnyx.PortingLoaConfigurationUpdateParamsContact{
				Email:       "testing@telnyx.com",
				PhoneNumber: "+12003270001",
			},
			Logo: telnyx.PortingLoaConfigurationUpdateParamsLogo{
				DocumentID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			},
			Name: "My LOA Configuration",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", loaConfiguration.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a LOA configuration

Delete a specific LOA configuration.

`client.Porting.LoaConfigurations.Delete()` — `DELETE /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies a LOA configuration. |

```go
	err := client.Porting.LoaConfigurations.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`client.Porting.LoaConfigurations.Preview1()` — `GET /porting/loa_configurations/{id}/preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies a LOA configuration. |

```go
	response, err := client.Porting.LoaConfigurations.Preview1(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List porting related reports

List the reports generated about porting operations.

`client.Porting.Reports.List()` — `GET /porting/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Porting.Reports.List(context.Background(), telnyx.PortingReportListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a porting related report

Generate reports about porting operations.

`client.Porting.Reports.New()` — `POST /porting/reports`

```go
	report, err := client.Porting.Reports.New(context.Background(), telnyx.PortingReportNewParams{
		Params: telnyx.ExportPortingOrdersCsvReportParam{
			Filters: telnyx.ExportPortingOrdersCsvReportFiltersParam{},
		},
		ReportType: telnyx.PortingReportNewParamsReportTypeExportPortingOrdersCsv,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", report.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.Porting.Reports.Get()` — `GET /porting/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies a report. |

```go
	report, err := client.Porting.Reports.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", report.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List available carriers in the UK

List available carriers in the UK.

`client.Porting.ListUkCarriers()` — `GET /porting/uk_carriers`

```go
	response, err := client.Porting.ListUkCarriers(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all porting orders

Returns a list of your porting order.

`client.PortingOrders.List()` — `GET /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `IncludePhoneNumbers` | boolean | No | Include the first 50 phone number objects in the results |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.PortingOrders.List(context.Background(), telnyx.PortingOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all exception types

Returns a list of all possible exception types for a porting order.

`client.PortingOrders.GetExceptionTypes()` — `GET /porting_orders/exception_types`

```go
	response, err := client.PortingOrders.GetExceptionTypes(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.code, response.data.description`

## List all phone number configurations

Returns a list of phone number configurations paginated.

`client.PortingOrders.PhoneNumberConfigurations.List()` — `GET /porting_orders/phone_number_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.PhoneNumberConfigurations.List(context.Background(), telnyx.PortingOrderPhoneNumberConfigurationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of phone number configurations

Creates a list of phone number configurations.

`client.PortingOrders.PhoneNumberConfigurations.New()` — `POST /porting_orders/phone_number_configurations`

```go
	phoneNumberConfiguration, err := client.PortingOrders.PhoneNumberConfigurations.New(context.Background(), telnyx.PortingOrderPhoneNumberConfigurationNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberConfiguration.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Edit a porting order

Edits the details of an existing porting order. Any or all of a porting orders attributes may be included in the resource object included in a PATCH request. If a request does not include all of the attributes for a resource, the system will interpret the missing attributes as if they were included with their current values.

`client.PortingOrders.Update()` — `PATCH /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `WebhookUrl` | string (URL) | No |  |
| `RequirementGroupId` | string (UUID) | No | If present, we will read the current values from the specifi... |
| `Misc` | object | No |  |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```go
	portingOrder, err := client.PortingOrders.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", portingOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a porting order

Deletes an existing porting order. This operation is restrict to porting orders in draft state.

`client.PortingOrders.Delete()` — `DELETE /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	err := client.PortingOrders.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously. This operation is limited to US FastPort orders only.

`client.PortingOrders.Actions.Activate()` — `POST /porting_orders/{id}/actions/activate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.Actions.Activate(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a porting order

`client.PortingOrders.Actions.Cancel()` — `POST /porting_orders/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.Actions.Cancel(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Share a porting order

Creates a sharing token for a porting order. The token can be used to share the porting order with non-Telnyx users.

`client.PortingOrders.Actions.Share()` — `POST /porting_orders/{id}/actions/share`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.Actions.Share(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActionShareParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.expires_at`

## List all porting activation jobs

Returns a list of your porting activation jobs.

`client.PortingOrders.ActivationJobs.List()` — `GET /porting_orders/{id}/activation_jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.PortingOrders.ActivationJobs.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActivationJobListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting activation job

Returns a porting activation job.

`client.PortingOrders.ActivationJobs.Get()` — `GET /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `ActivationJobId` | string (UUID) | Yes | Activation Job Identifier |

```go
	activationJob, err := client.PortingOrders.ActivationJobs.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActivationJobGetParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", activationJob.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a porting activation job

Updates the activation time of a porting activation job.

`client.PortingOrders.ActivationJobs.Update()` — `PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `ActivationJobId` | string (UUID) | Yes | Activation Job Identifier |

```go
	activationJob, err := client.PortingOrders.ActivationJobs.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActivationJobUpdateParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", activationJob.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List additional documents

Returns a list of additional documents for a porting order.

`client.PortingOrders.AdditionalDocuments.List()` — `GET /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.AdditionalDocuments.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAdditionalDocumentListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`client.PortingOrders.AdditionalDocuments.New()` — `POST /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	additionalDocument, err := client.PortingOrders.AdditionalDocuments.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAdditionalDocumentNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", additionalDocument.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an additional document

Deletes an additional document for a porting order.

`client.PortingOrders.AdditionalDocuments.Delete()` — `DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `AdditionalDocumentId` | string (UUID) | Yes | Additional document identification. |

```go
	err := client.PortingOrders.AdditionalDocuments.Delete(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAdditionalDocumentDeleteParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`client.PortingOrders.GetAllowedFocWindows()` — `GET /porting_orders/{id}/allowed_foc_windows`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.GetAllowedFocWindows(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.ended_at, response.data.record_type, response.data.started_at`

## List all comments of a porting order

Returns a list of all comments of a porting order.

`client.PortingOrders.Comments.List()` — `GET /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.PortingOrders.Comments.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderCommentListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment for a porting order

Creates a new comment for a porting order.

`client.PortingOrders.Comments.New()` — `POST /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `Body` | string | No |  |

```go
	comment, err := client.PortingOrders.Comments.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderCommentNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", comment.Data)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Download a porting order loa template

`client.PortingOrders.GetLoaTemplate()` — `GET /porting_orders/{id}/loa_template`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `LoaConfigurationId` | string (UUID) | No | The identifier of the LOA configuration to use for the templ... |

```go
	response, err := client.PortingOrders.GetLoaTemplate(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderGetLoaTemplateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List porting order requirements

Returns a list of all requirements based on country/number type for this porting order.

`client.PortingOrders.GetRequirements()` — `GET /porting_orders/{id}/requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.PortingOrders.GetRequirements(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderGetRequirementsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.field_type, response.data.field_value, response.data.record_type`

## Retrieve the associated V1 sub_request_id and port_request_id

`client.PortingOrders.GetSubRequest()` — `GET /porting_orders/{id}/sub_request`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.GetSubRequest(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.port_request_id, response.data.sub_request_id`

## List verification codes

Returns a list of verification codes for a porting order.

`client.PortingOrders.VerificationCodes.List()` — `GET /porting_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.VerificationCodes.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderVerificationCodeListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Send the verification codes

Send the verification code for all porting phone numbers.

`client.PortingOrders.VerificationCodes.Send()` — `POST /porting_orders/{id}/verification_codes/send`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	err := client.PortingOrders.VerificationCodes.Send(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderVerificationCodeSendParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`client.PortingOrders.VerificationCodes.Verify()` — `POST /porting_orders/{id}/verification_codes/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Porting Order id |

```go
	response, err := client.PortingOrders.VerificationCodes.Verify(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderVerificationCodeVerifyParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`client.PortingOrders.ActionRequirements.List()` — `GET /porting_orders/{porting_order_id}/action_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | The ID of the porting order |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.ActionRequirements.List(
		context.Background(),
		"porting_order_id",
		telnyx.PortingOrderActionRequirementListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`client.PortingOrders.ActionRequirements.Initiate()` — `POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | The ID of the porting order |
| `Id` | string (UUID) | Yes | The ID of the action requirement |

```go
	response, err := client.PortingOrders.ActionRequirements.Initiate(
		context.Background(),
		"id",
		telnyx.PortingOrderActionRequirementInitiateParams{
			PortingOrderID: "550e8400-e29b-41d4-a716-446655440000",
			Params: telnyx.PortingOrderActionRequirementInitiateParamsParams{
				FirstName: "John",
				LastName:  "Doe",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order. Associated phone numbers are used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.PortingOrders.AssociatedPhoneNumbers.List()` — `GET /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.AssociatedPhoneNumbers.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAssociatedPhoneNumberListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an associated phone number

Creates a new associated phone number for a porting order. This is used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.PortingOrders.AssociatedPhoneNumbers.New()` — `POST /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```go
	associatedPhoneNumber, err := client.PortingOrders.AssociatedPhoneNumbers.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAssociatedPhoneNumberNewParams{
			Action:           telnyx.PortingOrderAssociatedPhoneNumberNewParamsActionKeep,
			PhoneNumberRange: telnyx.PortingOrderAssociatedPhoneNumberNewParamsPhoneNumberRange{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", associatedPhoneNumber.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`client.PortingOrders.AssociatedPhoneNumbers.Delete()` — `DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `Id` | string (UUID) | Yes | Identifies the associated phone number to be deleted |

```go
	associatedPhoneNumber, err := client.PortingOrders.AssociatedPhoneNumbers.Delete(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAssociatedPhoneNumberDeleteParams{
			PortingOrderID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", associatedPhoneNumber.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`client.PortingOrders.PhoneNumberBlocks.List()` — `GET /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.PhoneNumberBlocks.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberBlockListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number block

Creates a new phone number block.

`client.PortingOrders.PhoneNumberBlocks.New()` — `POST /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```go
	phoneNumberBlock, err := client.PortingOrders.PhoneNumberBlocks.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberBlockNewParams{
			ActivationRanges: []telnyx.PortingOrderPhoneNumberBlockNewParamsActivationRange{{
				EndAt:   "+4930244999910",
				StartAt: "+4930244999901",
			}},
			PhoneNumberRange: telnyx.PortingOrderPhoneNumberBlockNewParamsPhoneNumberRange{
				EndAt:   "+4930244999910",
				StartAt: "+4930244999901",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberBlock.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number block

Deletes a phone number block.

`client.PortingOrders.PhoneNumberBlocks.Delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `Id` | string (UUID) | Yes | Identifies the phone number block to be deleted |

```go
	phoneNumberBlock, err := client.PortingOrders.PhoneNumberBlocks.Delete(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberBlockDeleteParams{
			PortingOrderID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberBlock.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`client.PortingOrders.PhoneNumberExtensions.List()` — `GET /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.PortingOrders.PhoneNumberExtensions.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberExtensionListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number extension

Creates a new phone number extension.

`client.PortingOrders.PhoneNumberExtensions.New()` — `POST /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```go
	phoneNumberExtension, err := client.PortingOrders.PhoneNumberExtensions.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberExtensionNewParams{
			ActivationRanges: []telnyx.PortingOrderPhoneNumberExtensionNewParamsActivationRange{{
				EndAt:   10,
				StartAt: 1,
			}},
			ExtensionRange: telnyx.PortingOrderPhoneNumberExtensionNewParamsExtensionRange{
				EndAt:   10,
				StartAt: 1,
			},
			PortingPhoneNumberID: "f24151b6-3389-41d3-8747-7dd8c681e5e2",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberExtension.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number extension

Deletes a phone number extension.

`client.PortingOrders.PhoneNumberExtensions.Delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PortingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `Id` | string (UUID) | Yes | Identifies the phone number extension to be deleted |

```go
	phoneNumberExtension, err := client.PortingOrders.PhoneNumberExtensions.Delete(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberExtensionDeleteParams{
			PortingOrderID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberExtension.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all porting phone numbers

Returns a list of your porting phone numbers.

`client.PortingPhoneNumbers.List()` — `GET /porting_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.PortingPhoneNumbers.List(context.Background(), telnyx.PortingPhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.phone_number, response.data.activation_status, response.data.phone_number_type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
