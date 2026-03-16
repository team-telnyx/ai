---
name: telnyx-account-go
description: >-
  Account balance, payments, invoices, webhooks, audit logs, and detail records.
metadata:
  author: telnyx
  product: account
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - Go

## Core Workflow

### Steps

1. **Check balance**: `client.Balance.Retrieve(ctx, params)`
2. **List invoices**: `client.Billing.Invoices.List(ctx, params)`
3. **Configure webhooks**: `client.WebhookDeliveries.List(ctx, params)`

### Common mistakes

- API keys provide full account access — use scoped tokens for limited permissions

**Related skills**: telnyx-account-access-go, telnyx-account-reports-go

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

result, err := client.Balance.Retrieve(ctx, params)
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

## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`client.AuditEvents.List()` — `GET /audit_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (asc, desc) | No | Set the order of the results by the creation date. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.AuditEvents.List(context.Background(), telnyx.AuditEventListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.alternate_resource_id`

## Get user balance details

`client.Balance.Get()` — `GET /balance`

```go
	balance, err := client.Balance.Get(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", balance.Data)
```

Key response fields: `response.data.available_credit, response.data.balance, response.data.credit_limit`

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`client.ChargesBreakdown.Get()` — `GET /charges_breakdown`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Format` | enum (json, csv) | No | Response format |
| `EndDate` | string (date) | No | End date for the charges breakdown in ISO date format (YYYY-... |

```go
	chargesBreakdown, err := client.ChargesBreakdown.Get(context.Background(), telnyx.ChargesBreakdownGetParams{
		StartDate: time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", chargesBreakdown.Data)
```

Key response fields: `response.data.currency, response.data.end_date, response.data.results`

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`client.ChargesSummary.Get()` — `GET /charges_summary`

```go
	chargesSummary, err := client.ChargesSummary.Get(context.Background(), telnyx.ChargesSummaryGetParams{
		EndDate:   time.Now(),
		StartDate: time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", chargesSummary.Data)
```

Key response fields: `response.data.currency, response.data.end_date, response.data.start_date`

## Search detail records

Search for any detail record across the Telnyx Platform

`client.DetailRecords.List()` — `GET /detail_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Filter records on a given record attribute and value. |
| `Sort` | array[string] | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.DetailRecords.List(context.Background(), telnyx.DetailRecordListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.direction, response.data.created_at`

## List invoices

Retrieve a paginated list of invoices.

`client.Invoices.List()` — `GET /invoices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (period_start, -period_start) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Invoices.List(context.Background(), telnyx.InvoiceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.url, response.data.file_id, response.data.invoice_id`

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`client.Invoices.Get()` — `GET /invoices/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Invoice UUID |
| `Action` | enum (json, link) | No | Invoice action |

```go
	invoice, err := client.Invoices.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.InvoiceGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", invoice.Data)
```

Key response fields: `response.data.url, response.data.download_url, response.data.file_id`

## List auto recharge preferences

Returns the payment auto recharge preferences.

`client.Payment.AutoRechargePrefs.List()` — `GET /payment/auto_recharge_prefs`

```go
	autoRechargePrefs, err := client.Payment.AutoRechargePrefs.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autoRechargePrefs.Data)
```

Key response fields: `response.data.id, response.data.enabled, response.data.invoice_enabled`

## Update auto recharge preferences

Update payment auto recharge preferences.

`client.Payment.AutoRechargePrefs.Update()` — `PATCH /payment/auto_recharge_prefs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Preference` | enum (credit_paypal, ach) | No | The payment preference for auto recharge. |
| `ThresholdAmount` | string | No | The threshold amount at which the account will be recharged. |
| `RechargeAmount` | string | No | The amount to recharge the account, the actual recharge amou... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	autoRechargePref, err := client.Payment.AutoRechargePrefs.Update(context.Background(), telnyx.PaymentAutoRechargePrefUpdateParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", autoRechargePref.Data)
```

Key response fields: `response.data.id, response.data.enabled, response.data.invoice_enabled`

## List User Tags

List all user tags.

`client.UserTags.List()` — `GET /user_tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	userTags, err := client.UserTags.List(context.Background(), telnyx.UserTagListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", userTags.Data)
```

Key response fields: `response.data.number_tags, response.data.outbound_profile_tags`

## Create a stored payment transaction

`client.Payment.NewStoredPaymentTransaction()` — `POST /v2/payment/stored_payment_transactions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Amount` | string | Yes | Amount in dollars and cents, e.g. |

```go
	response, err := client.Payment.NewStoredPaymentTransaction(context.Background(), telnyx.PaymentNewStoredPaymentTransactionParams{
		Amount: "120.00",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.amount_cents`

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`client.WebhookDeliveries.List()` — `GET /webhook_deliveries`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.WebhookDeliveries.List(context.Background(), telnyx.WebhookDeliveryListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.attempts`

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`client.WebhookDeliveries.Get()` — `GET /webhook_deliveries/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the webhook_delivery. |

```go
	webhookDelivery, err := client.WebhookDeliveries.Get(context.Background(), "C9C0797E-901D-4349-A33C-C2C8F31A92C2")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", webhookDelivery.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.attempts`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
