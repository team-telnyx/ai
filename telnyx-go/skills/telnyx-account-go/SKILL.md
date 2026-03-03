---
name: telnyx-account-go
description: >-
  Manage account balance, payments, invoices, webhooks, and view audit logs and
  detail records. This skill provides Go SDK examples.
metadata:
  author: telnyx
  product: account
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - Go

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

## List Audit Logs

Retrieve a list of audit log entries.

`GET /audit_events`

```go
	page, err := client.AuditEvents.List(context.TODO(), telnyx.AuditEventListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get user balance details

`GET /balance`

```go
	balance, err := client.Balance.Get(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", balance.Data)
```

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range.

`GET /charges_breakdown`

```go
	chargesBreakdown, err := client.ChargesBreakdown.Get(context.TODO(), telnyx.ChargesBreakdownGetParams{
		StartDate: time.Now(),
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", chargesBreakdown.Data)
```

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range.

`GET /charges_summary`

```go
	chargesSummary, err := client.ChargesSummary.Get(context.TODO(), telnyx.ChargesSummaryGetParams{
		EndDate:   time.Now(),
		StartDate: time.Now(),
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", chargesSummary.Data)
```

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

```go
	page, err := client.DetailRecords.List(context.TODO(), telnyx.DetailRecordListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

```go
	page, err := client.Invoices.List(context.TODO(), telnyx.InvoiceListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

```go
	invoice, err := client.Invoices.Get(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.InvoiceGetParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", invoice.Data)
```

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```go
	autoRechargePrefs, err := client.Payment.AutoRechargePrefs.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", autoRechargePrefs.Data)
```

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

Optional: `enabled` (boolean), `invoice_enabled` (boolean), `preference` (enum), `recharge_amount` (string), `threshold_amount` (string)

```go
	autoRechargePref, err := client.Payment.AutoRechargePrefs.Update(context.TODO(), telnyx.PaymentAutoRechargePrefUpdateParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", autoRechargePref.Data)
```

## List User Tags

List all user tags.

`GET /user_tags`

```go
	userTags, err := client.UserTags.List(context.TODO(), telnyx.UserTagListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", userTags.Data)
```

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions` — Required: `amount`

```go
	response, err := client.Payment.NewStoredPaymentTransaction(context.TODO(), telnyx.PaymentNewStoredPaymentTransactionParams{
		Amount: "120.00",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

```go
	page, err := client.WebhookDeliveries.List(context.TODO(), telnyx.WebhookDeliveryListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

```go
	webhookDelivery, err := client.WebhookDeliveries.Get(context.TODO(), "C9C0797E-901D-4349-A33C-C2C8F31A92C2")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", webhookDelivery.Data)
```
