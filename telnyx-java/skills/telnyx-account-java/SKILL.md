---
name: telnyx-account-java
description: >-
  Manage account balance, payments, invoices, webhooks, and view audit logs and
  detail records. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: account
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account - Java

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

## List Audit Logs

Retrieve a list of audit log entries.

`GET /audit_events`

```java
import com.telnyx.sdk.models.auditevents.AuditEventListPage;
import com.telnyx.sdk.models.auditevents.AuditEventListParams;

AuditEventListPage page = client.auditEvents().list();
```

## Get user balance details

`GET /balance`

```java
import com.telnyx.sdk.models.balance.BalanceRetrieveParams;
import com.telnyx.sdk.models.balance.BalanceRetrieveResponse;

BalanceRetrieveResponse balance = client.balance().retrieve();
```

## Get monthly charges breakdown

Retrieve a detailed breakdown of monthly charges for phone numbers in a specified date range.

`GET /charges_breakdown`

```java
import com.telnyx.sdk.models.chargesbreakdown.ChargesBreakdownRetrieveParams;
import com.telnyx.sdk.models.chargesbreakdown.ChargesBreakdownRetrieveResponse;
import java.time.LocalDate;

ChargesBreakdownRetrieveParams params = ChargesBreakdownRetrieveParams.builder()
    .startDate(LocalDate.parse("2025-05-01"))
    .build();
ChargesBreakdownRetrieveResponse chargesBreakdown = client.chargesBreakdown().retrieve(params);
```

## Get monthly charges summary

Retrieve a summary of monthly charges for a specified date range.

`GET /charges_summary`

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

## Search detail records

Search for any detail record across the Telnyx Platform

`GET /detail_records`

```java
import com.telnyx.sdk.models.detailrecords.DetailRecordListPage;
import com.telnyx.sdk.models.detailrecords.DetailRecordListParams;

DetailRecordListPage page = client.detailRecords().list();
```

## List invoices

Retrieve a paginated list of invoices.

`GET /invoices`

```java
import com.telnyx.sdk.models.invoices.InvoiceListPage;
import com.telnyx.sdk.models.invoices.InvoiceListParams;

InvoiceListPage page = client.invoices().list();
```

## Get invoice by ID

Retrieve a single invoice by its unique identifier.

`GET /invoices/{id}`

```java
import com.telnyx.sdk.models.invoices.InvoiceRetrieveParams;
import com.telnyx.sdk.models.invoices.InvoiceRetrieveResponse;

InvoiceRetrieveResponse invoice = client.invoices().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List auto recharge preferences

Returns the payment auto recharge preferences.

`GET /payment/auto_recharge_prefs`

```java
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefListParams;
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefListResponse;

AutoRechargePrefListResponse autoRechargePrefs = client.payment().autoRechargePrefs().list();
```

## Update auto recharge preferences

Update payment auto recharge preferences.

`PATCH /payment/auto_recharge_prefs`

Optional: `enabled` (boolean), `invoice_enabled` (boolean), `preference` (enum), `recharge_amount` (string), `threshold_amount` (string)

```java
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefUpdateParams;
import com.telnyx.sdk.models.payment.autorechargeprefs.AutoRechargePrefUpdateResponse;

AutoRechargePrefUpdateResponse autoRechargePref = client.payment().autoRechargePrefs().update();
```

## List User Tags

List all user tags.

`GET /user_tags`

```java
import com.telnyx.sdk.models.usertags.UserTagListParams;
import com.telnyx.sdk.models.usertags.UserTagListResponse;

UserTagListResponse userTags = client.userTags().list();
```

## Create a stored payment transaction

`POST /v2/payment/stored_payment_transactions` — Required: `amount`

```java
import com.telnyx.sdk.models.payment.PaymentCreateStoredPaymentTransactionParams;
import com.telnyx.sdk.models.payment.PaymentCreateStoredPaymentTransactionResponse;

PaymentCreateStoredPaymentTransactionParams params = PaymentCreateStoredPaymentTransactionParams.builder()
    .amount("120.00")
    .build();
PaymentCreateStoredPaymentTransactionResponse response = client.payment().createStoredPaymentTransaction(params);
```

## List webhook deliveries

Lists webhook_deliveries for the authenticated user

`GET /webhook_deliveries`

```java
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryListPage;
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryListParams;

WebhookDeliveryListPage page = client.webhookDeliveries().list();
```

## Find webhook_delivery details by ID

Provides webhook_delivery debug data, such as timestamps, delivery status and attempts.

`GET /webhook_deliveries/{id}`

```java
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryRetrieveParams;
import com.telnyx.sdk.models.webhookdeliveries.WebhookDeliveryRetrieveResponse;

WebhookDeliveryRetrieveResponse webhookDelivery = client.webhookDeliveries().retrieve("C9C0797E-901D-4349-A33C-C2C8F31A92C2");
```
