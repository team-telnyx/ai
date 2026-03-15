<!-- SDK reference: telnyx-account-go -->

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +2 optional params in the API Details section below |

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

# Account (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List Audit Logs

| Field | Type |
|-------|------|
| `alternate_resource_id` | string \| null |
| `change_made_by` | enum: telnyx, account_manager, account_owner, organization_member |
| `change_type` | string |
| `changes` | array \| null |
| `created_at` | date-time |
| `id` | uuid |
| `organization_id` | uuid |
| `record_type` | string |
| `resource_id` | string |
| `user_id` | uuid |

**Returned by:** Get user balance details

| Field | Type |
|-------|------|
| `available_credit` | string |
| `balance` | string |
| `credit_limit` | string |
| `currency` | string |
| `pending` | string |
| `record_type` | enum: balance |

**Returned by:** Get monthly charges breakdown

| Field | Type |
|-------|------|
| `currency` | string |
| `end_date` | date |
| `results` | array[object] |
| `start_date` | date |
| `user_email` | email |
| `user_id` | string |

**Returned by:** Get monthly charges summary

| Field | Type |
|-------|------|
| `currency` | string |
| `end_date` | date |
| `start_date` | date |
| `summary` | object |
| `total` | object |
| `user_email` | email |
| `user_id` | string |

**Returned by:** Search detail records

| Field | Type |
|-------|------|
| `carrier` | string |
| `carrier_fee` | string |
| `cld` | string |
| `cli` | string |
| `completed_at` | date-time |
| `cost` | string |
| `country_code` | string |
| `created_at` | date-time |
| `currency` | string |
| `delivery_status` | string |
| `delivery_status_failover_url` | string |
| `delivery_status_webhook_url` | string |
| `direction` | enum: inbound, outbound |
| `errors` | array[string] |
| `fteu` | boolean |
| `mcc` | string |
| `message_type` | enum: SMS, MMS, RCS |
| `mnc` | string |
| `on_net` | boolean |
| `parts` | integer |
| `profile_id` | string |
| `profile_name` | string |
| `rate` | string |
| `record_type` | string |
| `sent_at` | date-time |
| `source_country_code` | string |
| `status` | enum: gw_timeout, delivered, dlr_unconfirmed, dlr_timeout, received, gw_reject, failed |
| `tags` | string |
| `updated_at` | date-time |
| `user_id` | string |
| `uuid` | string |

**Returned by:** List invoices

| Field | Type |
|-------|------|
| `file_id` | uuid |
| `invoice_id` | uuid |
| `paid` | boolean |
| `period_end` | date |
| `period_start` | date |
| `url` | uri |

**Returned by:** Get invoice by ID

| Field | Type |
|-------|------|
| `download_url` | uri |
| `file_id` | uuid |
| `invoice_id` | uuid |
| `paid` | boolean |
| `period_end` | date |
| `period_start` | date |
| `url` | uri |

**Returned by:** List auto recharge preferences, Update auto recharge preferences

| Field | Type |
|-------|------|
| `enabled` | boolean |
| `id` | string |
| `invoice_enabled` | boolean |
| `preference` | enum: credit_paypal, ach |
| `recharge_amount` | string |
| `record_type` | string |
| `threshold_amount` | string |

**Returned by:** List User Tags

| Field | Type |
|-------|------|
| `number_tags` | array[string] |
| `outbound_profile_tags` | array[string] |

**Returned by:** Create a stored payment transaction

| Field | Type |
|-------|------|
| `amount_cents` | integer |
| `amount_currency` | string |
| `auto_recharge` | boolean |
| `created_at` | date-time |
| `id` | string |
| `processor_status` | string |
| `record_type` | enum: transaction |
| `transaction_processing_type` | enum: stored_payment |

**Returned by:** List webhook deliveries, Find webhook_delivery details by ID

| Field | Type |
|-------|------|
| `attempts` | array[object] |
| `finished_at` | date-time |
| `id` | uuid |
| `record_type` | string |
| `started_at` | date-time |
| `status` | enum: delivered, failed |
| `user_id` | uuid |
| `webhook` | object |

## Optional Parameters

### Update auto recharge preferences — `client.Payment.AutoRechargePrefs.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ThresholdAmount` | string | The threshold amount at which the account will be recharged. |
| `RechargeAmount` | string | The amount to recharge the account, the actual recharge amount will be the am... |
| `Enabled` | boolean | Whether auto recharge is enabled. |
| `InvoiceEnabled` | boolean |  |
| `Preference` | enum (credit_paypal, ach) | The payment preference for auto recharge. |
