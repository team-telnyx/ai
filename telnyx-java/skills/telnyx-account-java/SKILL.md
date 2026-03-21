---
name: telnyx-account-java
description: >-
  Account balance, payments, invoices, webhooks, audit logs, and detail records.
metadata:
  author: telnyx
  product: account
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - Java

## Core Workflow

### Steps

1. **Check balance**: `client.balance().retrieve(params)`
2. **List invoices**: `client.billing().invoices().list(params)`
3. **Configure webhooks**: `client.webhookDeliveries().list(params)`

### Common mistakes

- API keys provide full account access — use scoped tokens for limited permissions

**Related skills**: telnyx-account-access-java, telnyx-account-reports-java

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
    var result = client.balance().retrieve(params);
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List Audit Logs

Retrieve a list of audit log entries. Audit logs are a best-effort, eventually consistent record of significant account-related changes.

`client.auditEvents().list()` — `GET /audit_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (asc, desc) | No | Set the order of the results by the creation date. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.auditevents.AuditEventListPage;
import com.telnyx.sdk.models.auditevents.AuditEventListParams;

AuditEventListPage page = client.auditEvents().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.alternate_resource_id`

## Get user balance details

`client.balance().retrieve()` — `GET /balance`

```java
import com.telnyx.sdk.models.balance.BalanceRetrieveParams;
import com.telnyx.sdk.models.balance.BalanceRetrieveResponse;

BalanceRetrieveResponse balance = client.balance().retrieve();
```

Key response fields: `response.data.available_credit, response.data.balance, response.data.credit_limit`

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range. The date range cannot exceed 31 days.

`client.chargesBreakdown().retrieve()` — `GET /charges_breakdown`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (json, csv) | No | Response format |
| `endDate` | string (date) | No | End date for the charges breakdown in ISO date format (YYYY-... |

```java
import com.telnyx.sdk.models.chargesbreakdown.ChargesBreakdownRetrieveParams;
import com.telnyx.sdk.models.chargesbreakdown.ChargesBreakdownRetrieveResponse;
import java.time.LocalDate;

ChargesBreakdownRetrieveParams params = ChargesBreakdownRetrieveParams.builder()
    .startDate(LocalDate.parse("2025-05-01"))
    .build();
ChargesBreakdownRetrieveResponse chargesBreakdown = client.chargesBreakdown().retrieve(params);
```

Key response fields: `response.data.currency, response.data.end_date, response.data.results`

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range. The date range cannot exceed 31 days.

`client.chargesSummary().retrieve()` — `GET /charges_summary`

```java
import com.telnyx.sdk.models.chargessummary.ChargesSummaryRetrieveParams;
import com.telnyx.sdk.models.chargessummary.ChargesSummaryRetrieveResponse;
import java.time.LocalDate;

ChargesSummaryRetrieveParams params = ChargesSummaryRetrieveParams.builder()
    .endDate(LocalDate.parse("2025-06-01"))
    .startDate(LocalDate.parse("2025-05-01"))
    .build();
ChargesSummaryRetrieveResponse chargesSummary = client.chargesSummary().retrieve(params);
```

Key response fields: `response.data.currency, response.data.end_date, response.data.start_date`

## Search detail records

Search for any detail record across the Telnyx Platform

`client.detailRecords().list()` — `GET /detail_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter records on a given record attribute and value. |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.detailrecords.DetailRecordListPage;
import com.telnyx.sdk.models.detailrecords.DetailRecordListParams;

DetailRecordListPage page = client.detailRecords().list();
```

Key response fields: `response.data.status, response.data.direction, response.data.created_at`

## List invoices

Retrieve a paginated list of invoices.

`client.invoices().list()` — `GET /invoices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (period_start, -period_start) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.invoices.InvoiceListPage;
import com.telnyx.sdk.models.invoices.InvoiceListParams;

InvoiceListPage page = client.invoices().list();
```

Key response fields: `response.data.url, response.data.file_id, response.data.invoice_id`

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`client.invoices().retrieve()` — `GET /invoices/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Invoice UUID |
| `action` | enum (json, link) | No | Invoice action |

```java
import com.telnyx.sdk.models.invoices.InvoiceRetrieveParams;
import com.telnyx.sdk.models.invoices.InvoiceRetrieveResponse;

InvoiceRetrieveResponse invoice = client.invoices().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.url, response.data.download_url, response.data.file_id`

## List auto recharge preferences

Returns the payment auto recharge preferences.

`client.payment().autoRechargePrefs().list()` — `GET /payment/auto_recharge_prefs`

```java
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefListParams;
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefListResponse;

AutoRechargePrefListResponse autoRechargePrefs = client.payment().autoRechargePrefs().list();
```

Key response fields: `response.data.id, response.data.enabled, response.data.invoice_enabled`

## Update auto recharge preferences

Update payment auto recharge preferences.

`client.payment().autoRechargePrefs().update()` — `PATCH /payment/auto_recharge_prefs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `preference` | enum (credit_paypal, ach) | No | The payment preference for auto recharge. |
| `thresholdAmount` | string | No | The threshold amount at which the account will be recharged. |
| `rechargeAmount` | string | No | The amount to recharge the account, the actual recharge amou... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefUpdateParams;
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefUpdateResponse;

AutoRechargePrefUpdateResponse autoRechargePref = client.payment().autoRechargePrefs().update();
```

Key response fields: `response.data.id, response.data.enabled, response.data.invoice_enabled`

## List User Tags

List all user tags.

`client.userTags().list()` — `GET /user_tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.usertags.UserTagListParams;
import com.telnyx.sdk.models.usertags.UserTagListResponse;

UserTagListResponse userTags = client.userTags().list();
```

Key response fields: `response.data.number_tags, response.data.outbound_profile_tags`

## Create a stored payment transaction

`client.payment().createStoredPaymentTransaction()` — `POST /v2/payment/stored_payment_transactions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | string | Yes | Amount in dollars and cents, e.g. |

```java
import com.telnyx.sdk.models.payment.PaymentCreateStoredPaymentTransactionParams;
import com.telnyx.sdk.models.payment.PaymentCreateStoredPaymentTransactionResponse;

PaymentCreateStoredPaymentTransactionParams params = PaymentCreateStoredPaymentTransactionParams.builder()
    .amount("120.00")
    .build();
PaymentCreateStoredPaymentTransactionResponse response = client.payment().createStoredPaymentTransaction(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.amount_cents`

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`client.webhookDeliveries().list()` — `GET /webhook_deliveries`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryListPage;
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryListParams;

WebhookDeliveryListPage page = client.webhookDeliveries().list();
```

Key response fields: `response.data.id, response.data.status, response.data.attempts`

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`client.webhookDeliveries().retrieve()` — `GET /webhook_deliveries/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the webhook_delivery. |

```java
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryRetrieveParams;
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryRetrieveResponse;

WebhookDeliveryRetrieveResponse webhookDelivery = client.webhookDeliveries().retrieve("C9C0797E-901D-4349-A33C-C2C8F31A92C2");
```

Key response fields: `response.data.id, response.data.status, response.data.attempts`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
