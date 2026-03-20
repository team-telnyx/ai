<!-- SDK reference: telnyx-porting-in-java -->

# Telnyx Porting In - Java

## Core Workflow

### Prerequisites

1. Run portability check on all numbers before creating a port order
2. Have Letter of Authorization (LOA) and recent invoice from current carrier ready
3. Pre-create connection_id and/or messaging_profile_id to assign during fulfillment

### Steps

1. **Check portability**: `client.porting().portabilityChecks().create(params)`
2. **Create draft order**: `client.porting().orders().create(params)`
3. **Fulfill each split order**: `Upload LOA, invoice, end-user info, service address`
4. **Submit order**: `Transitions from draft to in-process`
5. **Monitor via webhooks**: `porting_order.status_changed, porting_order.new_comment`

### Common mistakes

- NEVER skip portability check — non-portable numbers cause downstream failures
- NEVER treat auto-split orders as a single entity — each split requires independent completion
- NEVER assume requested FOC date is guaranteed — the losing carrier determines the actual date
- ALWAYS monitor for Porting Operations comments — unanswered info requests kill the port

**Related skills**: telnyx-numbers-java, telnyx-numbers-config-java, telnyx-voice-java, telnyx-messaging-java

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
    var result = client.porting().orders().create(params);
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Run a portability check

Runs a portability check, returning the results immediately.

`client.portabilityChecks().run()` — `POST /portability_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | No | The list of +E.164 formatted phone numbers to check for port... |

```java
import com.telnyx.sdk.models.portabilitychecks.PortabilityCheckRunParams;
import com.telnyx.sdk.models.portabilitychecks.PortabilityCheckRunResponse;

PortabilityCheckRunParams params = PortabilityCheckRunParams.builder()

    .phoneNumbers(java.util.List.of("+18005550101"))

    .build();

PortabilityCheckRunResponse response = client.portabilityChecks().run(params);
```

Key response fields: `response.data.phone_number, response.data.fast_portable, response.data.not_portable_reason`

## Create a porting order

Creates a new porting order object.

`client.portingOrders().create()` — `POST /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | The list of +E.164 formatted phone numbers |
| `customerReference` | string | No | A customer-specified reference number for customer bookkeepi... |
| `customerGroupReference` | string | No | A customer-specified group reference for customer bookkeepin... |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderCreateParams;
import com.telnyx.sdk.models.portingorders.PortingOrderCreateResponse;
import java.util.List;

PortingOrderCreateParams params = PortingOrderCreateParams.builder()
    .phoneNumbers(List.of(
      "+13035550000",
      "+13035550001",
      "+13035550002"
    ))
    .build();
PortingOrderCreateResponse portingOrder = client.portingOrders().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting order

Retrieves the details of an existing porting order.

`client.portingOrders().retrieve()` — `GET /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `includePhoneNumbers` | boolean | No | Include the first 50 phone number objects in the results |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveParams;
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveResponse;

PortingOrderRetrieveResponse portingOrder = client.portingOrders().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a porting order.

Confirm and submit your porting order.

`client.portingOrders().actions().confirm()` — `POST /porting_orders/{id}/actions/confirm`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.actions.ActionConfirmParams;
import com.telnyx.sdk.models.portingorders.actions.ActionConfirmResponse;

ActionConfirmResponse response = client.portingOrders().actions().confirm("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all porting events

Returns a list of all porting events.

`client.porting().events().list()` — `GET /porting/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.porting.events.EventListPage;
import com.telnyx.sdk.models.porting.events.EventListParams;

EventListPage page = client.porting().events().list();
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Show a porting event

Show a specific porting event.

`client.porting().events().retrieve()` — `GET /porting/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the porting event. |

```java
import com.telnyx.sdk.models.porting.events.EventRetrieveParams;
import com.telnyx.sdk.models.porting.events.EventRetrieveResponse;

EventRetrieveResponse event = client.porting().events().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Republish a porting event

Republish a specific porting event.

`client.porting().events().republish()` — `POST /porting/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the porting event. |

```java
import com.telnyx.sdk.models.porting.events.EventRepublishParams;

client.porting().events().republish("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List LOA configurations

List the LOA configurations.

`client.porting().loaConfigurations().list()` — `GET /porting/loa_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationListPage;
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationListParams;

LoaConfigurationListPage page = client.porting().loaConfigurations().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a LOA configuration

Create a LOA configuration.

`client.porting().loaConfigurations().create()` — `POST /porting/loa_configurations`

```java
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationCreateParams;
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationCreateResponse;

LoaConfigurationCreateParams params = LoaConfigurationCreateParams.builder()
    .address(LoaConfigurationCreateParams.Address.builder()
        .city("Austin")
        .countryCode("US")
        .state("TX")
        .streetAddress("600 Congress Avenue")
        .zipCode("78701")
        .build())
    .companyName("Telnyx")
    .contact(LoaConfigurationCreateParams.Contact.builder()
        .email("testing@telnyx.com")
        .phoneNumber("+12003270001")
        .build())
    .logo(LoaConfigurationCreateParams.Logo.builder()
        .documentId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
        .build())
    .name("My LOA Configuration")
    .build();
LoaConfigurationCreateResponse loaConfiguration = client.porting().loaConfigurations().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`client.porting().loaConfigurations().preview()` — `POST /porting/loa_configurations/preview`

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationPreviewParams;

LoaConfigurationPreviewParams params = LoaConfigurationPreviewParams.builder()
    .address(LoaConfigurationPreviewParams.Address.builder()
        .city("Austin")
        .countryCode("US")
        .state("TX")
        .streetAddress("600 Congress Avenue")
        .zipCode("78701")
        .build())
    .companyName("Telnyx")
    .contact(LoaConfigurationPreviewParams.Contact.builder()
        .email("testing@telnyx.com")
        .phoneNumber("+12003270001")
        .build())
    .logo(LoaConfigurationPreviewParams.Logo.builder()
        .documentId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
        .build())
    .name("My LOA Configuration")
    .build();
HttpResponse response = client.porting().loaConfigurations().preview(params);
```

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`client.porting().loaConfigurations().retrieve()` — `GET /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```java
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationRetrieveParams;
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationRetrieveResponse;

LoaConfigurationRetrieveResponse loaConfiguration = client.porting().loaConfigurations().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a LOA configuration

Update a specific LOA configuration.

`client.porting().loaConfigurations().update()` — `PATCH /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```java
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationUpdateParams;
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationUpdateResponse;

LoaConfigurationUpdateParams params = LoaConfigurationUpdateParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .address(LoaConfigurationUpdateParams.Address.builder()
        .city("Austin")
        .countryCode("US")
        .state("TX")
        .streetAddress("600 Congress Avenue")
        .zipCode("78701")
        .build())
    .companyName("Telnyx")
    .contact(LoaConfigurationUpdateParams.Contact.builder()
        .email("testing@telnyx.com")
        .phoneNumber("+12003270001")
        .build())
    .logo(LoaConfigurationUpdateParams.Logo.builder()
        .documentId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
        .build())
    .name("My LOA Configuration")
    .build();
LoaConfigurationUpdateResponse loaConfiguration = client.porting().loaConfigurations().update(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a LOA configuration

Delete a specific LOA configuration.

`client.porting().loaConfigurations().delete()` — `DELETE /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```java
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationDeleteParams;

client.porting().loaConfigurations().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`client.porting().loaConfigurations().preview1()` — `GET /porting/loa_configurations/{id}/preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.porting.loaconfigurations.LoaConfigurationPreview1Params;

HttpResponse response = client.porting().loaConfigurations().preview1("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List porting related reports

List the reports generated about porting operations.

`client.porting().reports().list()` — `GET /porting/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.porting.reports.ReportListPage;
import com.telnyx.sdk.models.porting.reports.ReportListParams;

ReportListPage page = client.porting().reports().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a porting related report

Generate reports about porting operations.

`client.porting().reports().create()` — `POST /porting/reports`

```java
import com.telnyx.sdk.models.porting.reports.ExportPortingOrdersCsvReport;
import com.telnyx.sdk.models.porting.reports.ReportCreateParams;
import com.telnyx.sdk.models.porting.reports.ReportCreateResponse;

ReportCreateParams params = ReportCreateParams.builder()
    .params(ExportPortingOrdersCsvReport.builder()
        .filters(ExportPortingOrdersCsvReport.Filters.builder().build())
        .build())
    .reportType(ReportCreateParams.ReportType.EXPORT_PORTING_ORDERS_CSV)
    .build();
ReportCreateResponse report = client.porting().reports().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.porting().reports().retrieve()` — `GET /porting/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a report. |

```java
import com.telnyx.sdk.models.porting.reports.ReportRetrieveParams;
import com.telnyx.sdk.models.porting.reports.ReportRetrieveResponse;

ReportRetrieveResponse report = client.porting().reports().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List available carriers in the UK

List available carriers in the UK.

`client.porting().listUkCarriers()` — `GET /porting/uk_carriers`

```java
import com.telnyx.sdk.models.porting.PortingListUkCarriersParams;
import com.telnyx.sdk.models.porting.PortingListUkCarriersResponse;

PortingListUkCarriersResponse response = client.porting().listUkCarriers();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all porting orders

Returns a list of your porting order.

`client.portingOrders().list()` — `GET /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `includePhoneNumbers` | boolean | No | Include the first 50 phone number objects in the results |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderListPage;
import com.telnyx.sdk.models.portingorders.PortingOrderListParams;

PortingOrderListPage page = client.portingOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all exception types

Returns a list of all possible exception types for a porting order.

`client.portingOrders().retrieveExceptionTypes()` — `GET /porting_orders/exception_types`

```java
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveExceptionTypesParams;
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveExceptionTypesResponse;

PortingOrderRetrieveExceptionTypesResponse response = client.portingOrders().retrieveExceptionTypes();
```

Key response fields: `response.data.code, response.data.description`

## List all phone number configurations

Returns a list of phone number configurations paginated.

`client.portingOrders().phoneNumberConfigurations().list()` — `GET /porting_orders/phone_number_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.phonenumberconfigurations.PhoneNumberConfigurationListPage;
import com.telnyx.sdk.models.portingorders.phonenumberconfigurations.PhoneNumberConfigurationListParams;

PhoneNumberConfigurationListPage page = client.portingOrders().phoneNumberConfigurations().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of phone number configurations

Creates a list of phone number configurations.

`client.portingOrders().phoneNumberConfigurations().create()` — `POST /porting_orders/phone_number_configurations`

```java
import com.telnyx.sdk.models.portingorders.phonenumberconfigurations.PhoneNumberConfigurationCreateParams;
import com.telnyx.sdk.models.portingorders.phonenumberconfigurations.PhoneNumberConfigurationCreateResponse;

PhoneNumberConfigurationCreateResponse phoneNumberConfiguration = client.portingOrders().phoneNumberConfigurations().create();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Edit a porting order

Edits the details of an existing porting order. Any or all of a porting orders attributes may be included in the resource object included in a PATCH request. If a request does not include all of the attributes for a resource, the system will interpret the missing attributes as if they were included with their current values.

`client.portingOrders().update()` — `PATCH /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `webhookUrl` | string (URL) | No |  |
| `requirementGroupId` | string (UUID) | No | If present, we will read the current values from the specifi... |
| `misc` | object | No |  |
| ... | | | +9 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderUpdateParams;
import com.telnyx.sdk.models.portingorders.PortingOrderUpdateResponse;

PortingOrderUpdateResponse portingOrder = client.portingOrders().update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a porting order

Deletes an existing porting order. This operation is restrict to porting orders in draft state.

`client.portingOrders().delete()` — `DELETE /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderDeleteParams;

client.portingOrders().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously. This operation is limited to US FastPort orders only.

`client.portingOrders().actions().activate()` — `POST /porting_orders/{id}/actions/activate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.actions.ActionActivateParams;
import com.telnyx.sdk.models.portingorders.actions.ActionActivateResponse;

ActionActivateResponse response = client.portingOrders().actions().activate("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a porting order

`client.portingOrders().actions().cancel()` — `POST /porting_orders/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.actions.ActionCancelParams;
import com.telnyx.sdk.models.portingorders.actions.ActionCancelResponse;

ActionCancelResponse response = client.portingOrders().actions().cancel("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Share a porting order

Creates a sharing token for a porting order. The token can be used to share the porting order with non-Telnyx users.

`client.portingOrders().actions().share()` — `POST /porting_orders/{id}/actions/share`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.actions.ActionShareParams;
import com.telnyx.sdk.models.portingorders.actions.ActionShareResponse;

ActionShareResponse response = client.portingOrders().actions().share("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.expires_at`

## List all porting activation jobs

Returns a list of your porting activation jobs.

`client.portingOrders().activationJobs().list()` — `GET /porting_orders/{id}/activation_jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.activationjobs.ActivationJobListPage;
import com.telnyx.sdk.models.portingorders.activationjobs.ActivationJobListParams;

ActivationJobListPage page = client.portingOrders().activationJobs().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting activation job

Returns a porting activation job.

`client.portingOrders().activationJobs().retrieve()` — `GET /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `activationJobId` | string (UUID) | Yes | Activation Job Identifier |

```java
import com.telnyx.sdk.models.portingorders.activationjobs.ActivationJobRetrieveParams;
import com.telnyx.sdk.models.portingorders.activationjobs.ActivationJobRetrieveResponse;

ActivationJobRetrieveParams params = ActivationJobRetrieveParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .activationJobId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
ActivationJobRetrieveResponse activationJob = client.portingOrders().activationJobs().retrieve(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a porting activation job

Updates the activation time of a porting activation job.

`client.portingOrders().activationJobs().update()` — `PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `activationJobId` | string (UUID) | Yes | Activation Job Identifier |

```java
import com.telnyx.sdk.models.portingorders.activationjobs.ActivationJobUpdateParams;
import com.telnyx.sdk.models.portingorders.activationjobs.ActivationJobUpdateResponse;

ActivationJobUpdateParams params = ActivationJobUpdateParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .activationJobId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
ActivationJobUpdateResponse activationJob = client.portingOrders().activationJobs().update(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List additional documents

Returns a list of additional documents for a porting order.

`client.portingOrders().additionalDocuments().list()` — `GET /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.additionaldocuments.AdditionalDocumentListPage;
import com.telnyx.sdk.models.portingorders.additionaldocuments.AdditionalDocumentListParams;

AdditionalDocumentListPage page = client.portingOrders().additionalDocuments().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`client.portingOrders().additionalDocuments().create()` — `POST /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.additionaldocuments.AdditionalDocumentCreateParams;
import com.telnyx.sdk.models.portingorders.additionaldocuments.AdditionalDocumentCreateResponse;

AdditionalDocumentCreateResponse additionalDocument = client.portingOrders().additionalDocuments().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an additional document

Deletes an additional document for a porting order.

`client.portingOrders().additionalDocuments().delete()` — `DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `additionalDocumentId` | string (UUID) | Yes | Additional document identification. |

```java
import com.telnyx.sdk.models.portingorders.additionaldocuments.AdditionalDocumentDeleteParams;

AdditionalDocumentDeleteParams params = AdditionalDocumentDeleteParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .additionalDocumentId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
client.portingOrders().additionalDocuments().delete(params);
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`client.portingOrders().retrieveAllowedFocWindows()` — `GET /porting_orders/{id}/allowed_foc_windows`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveAllowedFocWindowsParams;
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveAllowedFocWindowsResponse;

PortingOrderRetrieveAllowedFocWindowsResponse response = client.portingOrders().retrieveAllowedFocWindows("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.ended_at, response.data.record_type, response.data.started_at`

## List all comments of a porting order

Returns a list of all comments of a porting order.

`client.portingOrders().comments().list()` — `GET /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.comments.CommentListPage;
import com.telnyx.sdk.models.portingorders.comments.CommentListParams;

CommentListPage page = client.portingOrders().comments().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment for a porting order

Creates a new comment for a porting order.

`client.portingOrders().comments().create()` — `POST /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `body` | string | No |  |

```java
import com.telnyx.sdk.models.portingorders.comments.CommentCreateParams;
import com.telnyx.sdk.models.portingorders.comments.CommentCreateResponse;

CommentCreateResponse comment = client.portingOrders().comments().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Download a porting order loa template

`client.portingOrders().retrieveLoaTemplate()` — `GET /porting_orders/{id}/loa_template`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `loaConfigurationId` | string (UUID) | No | The identifier of the LOA configuration to use for the templ... |

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveLoaTemplateParams;

HttpResponse response = client.portingOrders().retrieveLoaTemplate("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List porting order requirements

Returns a list of all requirements based on country/number type for this porting order.

`client.portingOrders().retrieveRequirements()` — `GET /porting_orders/{id}/requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveRequirementsPage;
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveRequirementsParams;

PortingOrderRetrieveRequirementsPage page = client.portingOrders().retrieveRequirements("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.field_type, response.data.field_value, response.data.record_type`

## Retrieve the associated V1 sub_request_id and port_request_id

`client.portingOrders().retrieveSubRequest()` — `GET /porting_orders/{id}/sub_request`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveSubRequestParams;
import com.telnyx.sdk.models.portingorders.PortingOrderRetrieveSubRequestResponse;

PortingOrderRetrieveSubRequestResponse response = client.portingOrders().retrieveSubRequest("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.port_request_id, response.data.sub_request_id`

## List verification codes

Returns a list of verification codes for a porting order.

`client.portingOrders().verificationCodes().list()` — `GET /porting_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.verificationcodes.VerificationCodeListPage;
import com.telnyx.sdk.models.portingorders.verificationcodes.VerificationCodeListParams;

VerificationCodeListPage page = client.portingOrders().verificationCodes().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Send the verification codes

Send the verification code for all porting phone numbers.

`client.portingOrders().verificationCodes().send()` — `POST /porting_orders/{id}/verification_codes/send`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.verificationcodes.VerificationCodeSendParams;

client.portingOrders().verificationCodes().send("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`client.portingOrders().verificationCodes().verify()` — `POST /porting_orders/{id}/verification_codes/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```java
import com.telnyx.sdk.models.portingorders.verificationcodes.VerificationCodeVerifyParams;
import com.telnyx.sdk.models.portingorders.verificationcodes.VerificationCodeVerifyResponse;

VerificationCodeVerifyResponse response = client.portingOrders().verificationCodes().verify("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`client.portingOrders().actionRequirements().list()` — `GET /porting_orders/{porting_order_id}/action_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | The ID of the porting order |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.actionrequirements.ActionRequirementListPage;
import com.telnyx.sdk.models.portingorders.actionrequirements.ActionRequirementListParams;

ActionRequirementListPage page = client.portingOrders().actionRequirements().list("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`client.portingOrders().actionRequirements().initiate()` — `POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | The ID of the porting order |
| `id` | string (UUID) | Yes | The ID of the action requirement |

```java
import com.telnyx.sdk.models.portingorders.actionrequirements.ActionRequirementInitiateParams;
import com.telnyx.sdk.models.portingorders.actionrequirements.ActionRequirementInitiateResponse;

ActionRequirementInitiateParams params = ActionRequirementInitiateParams.builder()
    .portingOrderId("550e8400-e29b-41d4-a716-446655440000")
    .id("550e8400-e29b-41d4-a716-446655440000")
    .params(ActionRequirementInitiateParams.Params.builder()
        .firstName("John")
        .lastName("Doe")
        .build())
    .build();
ActionRequirementInitiateResponse response = client.portingOrders().actionRequirements().initiate(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order. Associated phone numbers are used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.portingOrders().associatedPhoneNumbers().list()` — `GET /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.associatedphonenumbers.AssociatedPhoneNumberListPage;
import com.telnyx.sdk.models.portingorders.associatedphonenumbers.AssociatedPhoneNumberListParams;

AssociatedPhoneNumberListPage page = client.portingOrders().associatedPhoneNumbers().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an associated phone number

Creates a new associated phone number for a porting order. This is used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.portingOrders().associatedPhoneNumbers().create()` — `POST /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```java
import com.telnyx.sdk.models.portingorders.associatedphonenumbers.AssociatedPhoneNumberCreateParams;
import com.telnyx.sdk.models.portingorders.associatedphonenumbers.AssociatedPhoneNumberCreateResponse;

AssociatedPhoneNumberCreateParams params = AssociatedPhoneNumberCreateParams.builder()
    .portingOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .action(AssociatedPhoneNumberCreateParams.Action.KEEP)
    .phoneNumberRange(AssociatedPhoneNumberCreateParams.PhoneNumberRange.builder().build())
    .build();
AssociatedPhoneNumberCreateResponse associatedPhoneNumber = client.portingOrders().associatedPhoneNumbers().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`client.portingOrders().associatedPhoneNumbers().delete()` — `DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the associated phone number to be deleted |

```java
import com.telnyx.sdk.models.portingorders.associatedphonenumbers.AssociatedPhoneNumberDeleteParams;
import com.telnyx.sdk.models.portingorders.associatedphonenumbers.AssociatedPhoneNumberDeleteResponse;

AssociatedPhoneNumberDeleteParams params = AssociatedPhoneNumberDeleteParams.builder()
    .portingOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
AssociatedPhoneNumberDeleteResponse associatedPhoneNumber = client.portingOrders().associatedPhoneNumbers().delete(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`client.portingOrders().phoneNumberBlocks().list()` — `GET /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.phonenumberblocks.PhoneNumberBlockListPage;
import com.telnyx.sdk.models.portingorders.phonenumberblocks.PhoneNumberBlockListParams;

PhoneNumberBlockListPage page = client.portingOrders().phoneNumberBlocks().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number block

Creates a new phone number block.

`client.portingOrders().phoneNumberBlocks().create()` — `POST /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```java
import com.telnyx.sdk.models.portingorders.phonenumberblocks.PhoneNumberBlockCreateParams;
import com.telnyx.sdk.models.portingorders.phonenumberblocks.PhoneNumberBlockCreateResponse;

PhoneNumberBlockCreateParams params = PhoneNumberBlockCreateParams.builder()
    .portingOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .addActivationRange(PhoneNumberBlockCreateParams.ActivationRange.builder()
        .endAt("+4930244999910")
        .startAt("+4930244999901")
        .build())
    .phoneNumberRange(PhoneNumberBlockCreateParams.PhoneNumberRange.builder()
        .endAt("+4930244999910")
        .startAt("+4930244999901")
        .build())
    .build();
PhoneNumberBlockCreateResponse phoneNumberBlock = client.portingOrders().phoneNumberBlocks().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number block

Deletes a phone number block.

`client.portingOrders().phoneNumberBlocks().delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the phone number block to be deleted |

```java
import com.telnyx.sdk.models.portingorders.phonenumberblocks.PhoneNumberBlockDeleteParams;
import com.telnyx.sdk.models.portingorders.phonenumberblocks.PhoneNumberBlockDeleteResponse;

PhoneNumberBlockDeleteParams params = PhoneNumberBlockDeleteParams.builder()
    .portingOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
PhoneNumberBlockDeleteResponse phoneNumberBlock = client.portingOrders().phoneNumberBlocks().delete(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`client.portingOrders().phoneNumberExtensions().list()` — `GET /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingorders.phonenumberextensions.PhoneNumberExtensionListPage;
import com.telnyx.sdk.models.portingorders.phonenumberextensions.PhoneNumberExtensionListParams;

PhoneNumberExtensionListPage page = client.portingOrders().phoneNumberExtensions().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number extension

Creates a new phone number extension.

`client.portingOrders().phoneNumberExtensions().create()` — `POST /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```java
import com.telnyx.sdk.models.portingorders.phonenumberextensions.PhoneNumberExtensionCreateParams;
import com.telnyx.sdk.models.portingorders.phonenumberextensions.PhoneNumberExtensionCreateResponse;

PhoneNumberExtensionCreateParams params = PhoneNumberExtensionCreateParams.builder()
    .portingOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .addActivationRange(PhoneNumberExtensionCreateParams.ActivationRange.builder()
        .endAt(10L)
        .startAt(1L)
        .build())
    .extensionRange(PhoneNumberExtensionCreateParams.ExtensionRange.builder()
        .endAt(10L)
        .startAt(1L)
        .build())
    .portingPhoneNumberId("f24151b6-3389-41d3-8747-7dd8c681e5e2")
    .build();
PhoneNumberExtensionCreateResponse phoneNumberExtension = client.portingOrders().phoneNumberExtensions().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number extension

Deletes a phone number extension.

`client.portingOrders().phoneNumberExtensions().delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the phone number extension to be deleted |

```java
import com.telnyx.sdk.models.portingorders.phonenumberextensions.PhoneNumberExtensionDeleteParams;
import com.telnyx.sdk.models.portingorders.phonenumberextensions.PhoneNumberExtensionDeleteResponse;

PhoneNumberExtensionDeleteParams params = PhoneNumberExtensionDeleteParams.builder()
    .portingOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
PhoneNumberExtensionDeleteResponse phoneNumberExtension = client.portingOrders().phoneNumberExtensions().delete(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all porting phone numbers

Returns a list of your porting phone numbers.

`client.portingPhoneNumbers().list()` — `GET /porting_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.portingphonenumbers.PortingPhoneNumberListPage;
import com.telnyx.sdk.models.portingphonenumbers.PortingPhoneNumberListParams;

PortingPhoneNumberListPage page = client.portingPhoneNumbers().list();
```

Key response fields: `response.data.phone_number, response.data.activation_status, response.data.phone_number_type`

---

# Porting In (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Run a portability check

| Field | Type |
|-------|------|
| `fast_portable` | boolean |
| `not_portable_reason` | string |
| `phone_number` | string |
| `portable` | boolean |
| `record_type` | string |

**Returned by:** List all porting events, Show a porting event

| Field | Type |
|-------|------|
| `available_notification_methods` | array[string] |
| `event_type` | enum: porting_order.deleted |
| `id` | uuid |
| `payload` | object |
| `payload_status` | enum: created, completed |
| `porting_order_id` | uuid |

**Returned by:** List LOA configurations, Create a LOA configuration, Retrieve a LOA configuration, Update a LOA configuration

| Field | Type |
|-------|------|
| `address` | object |
| `company_name` | string |
| `contact` | object |
| `created_at` | date-time |
| `id` | uuid |
| `logo` | object |
| `name` | string |
| `organization_id` | string |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List porting related reports, Create a porting related report, Retrieve a report

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `document_id` | uuid |
| `id` | uuid |
| `params` | object |
| `record_type` | string |
| `report_type` | enum: export_porting_orders_csv |
| `status` | enum: pending, completed |
| `updated_at` | date-time |

**Returned by:** List available carriers in the UK

| Field | Type |
|-------|------|
| `alternative_cupids` | array[string] |
| `created_at` | date-time |
| `cupid` | string |
| `id` | uuid |
| `name` | string |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all porting orders, Create a porting order, Retrieve a porting order, Edit a porting order, Cancel a porting order, Submit a porting order.

| Field | Type |
|-------|------|
| `activation_settings` | object |
| `additional_steps` | array[string] |
| `created_at` | date-time |
| `customer_group_reference` | string \| null |
| `customer_reference` | string \| null |
| `description` | string |
| `documents` | object |
| `end_user` | object |
| `id` | uuid |
| `messaging` | object |
| `misc` | object |
| `old_service_provider_ocn` | string |
| `parent_support_key` | string \| null |
| `phone_number_configuration` | object |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `phone_numbers` | array[object] |
| `porting_phone_numbers_count` | integer |
| `record_type` | string |
| `requirements` | array[object] |
| `requirements_met` | boolean |
| `status` | object |
| `support_key` | string \| null |
| `updated_at` | date-time |
| `user_feedback` | object |
| `user_id` | uuid |
| `webhook_url` | uri |

**Returned by:** List all exception types

| Field | Type |
|-------|------|
| `code` | enum: ACCOUNT_NUMBER_MISMATCH, AUTH_PERSON_MISMATCH, BTN_ATN_MISMATCH, ENTITY_NAME_MISMATCH, FOC_EXPIRED, FOC_REJECTED, LOCATION_MISMATCH, LSR_PENDING, MAIN_BTN_PORTING, OSP_IRRESPONSIVE, OTHER, PASSCODE_PIN_INVALID, PHONE_NUMBER_HAS_SPECIAL_FEATURE, PHONE_NUMBER_MISMATCH, PHONE_NUMBER_NOT_PORTABLE, PORT_TYPE_INCORRECT, PORTING_ORDER_SPLIT_REQUIRED, POSTAL_CODE_MISMATCH, RATE_CENTER_NOT_PORTABLE, SV_CONFLICT, SV_UNKNOWN_FAILURE |
| `description` | string |

**Returned by:** List all phone number configurations, Create a list of phone number configurations

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `porting_phone_number_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |
| `user_bundle_id` | uuid |

**Returned by:** Activate every number in a porting order asynchronously., List all porting activation jobs, Retrieve a porting activation job, Update a porting activation job

| Field | Type |
|-------|------|
| `activate_at` | date-time |
| `activation_type` | enum: scheduled, on-demand |
| `activation_windows` | array[object] |
| `created_at` | date-time |
| `id` | uuid |
| `record_type` | string |
| `status` | enum: created, in-process, completed, failed |
| `updated_at` | date-time |

**Returned by:** Share a porting order

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `expires_at` | date-time |
| `expires_in_seconds` | integer |
| `id` | uuid |
| `permissions` | array[string] |
| `porting_order_id` | uuid |
| `record_type` | string |
| `token` | string |

**Returned by:** List additional documents, Create a list of additional documents

| Field | Type |
|-------|------|
| `content_type` | string |
| `created_at` | date-time |
| `document_id` | uuid |
| `document_type` | enum: loa, invoice, csr, other |
| `filename` | string |
| `id` | uuid |
| `porting_order_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List allowed FOC dates

| Field | Type |
|-------|------|
| `ended_at` | date-time |
| `record_type` | string |
| `started_at` | date-time |

**Returned by:** List all comments of a porting order, Create a comment for a porting order

| Field | Type |
|-------|------|
| `body` | string |
| `created_at` | date-time |
| `id` | uuid |
| `porting_order_id` | uuid |
| `record_type` | string |
| `user_type` | enum: admin, user, system |

**Returned by:** List porting order requirements

| Field | Type |
|-------|------|
| `field_type` | enum: document, textual |
| `field_value` | string |
| `record_type` | string |
| `requirement_status` | string |
| `requirement_type` | object |

**Returned by:** Retrieve the associated V1 sub_request_id and port_request_id

| Field | Type |
|-------|------|
| `port_request_id` | string |
| `sub_request_id` | string |

**Returned by:** List verification codes, Verify the verification code for a list of phone numbers

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `phone_number` | string |
| `porting_order_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |
| `verified` | boolean |

**Returned by:** List action requirements for a porting order, Initiate an action requirement

| Field | Type |
|-------|------|
| `action_type` | string |
| `action_url` | string \| null |
| `cancel_reason` | string \| null |
| `created_at` | date-time |
| `id` | string |
| `porting_order_id` | string |
| `record_type` | enum: porting_action_requirement |
| `requirement_type_id` | string |
| `status` | enum: created, pending, completed, cancelled, failed |
| `updated_at` | date-time |

**Returned by:** List all associated phone numbers, Create an associated phone number, Delete an associated phone number

| Field | Type |
|-------|------|
| `action` | enum: keep, disconnect |
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `phone_number_range` | object |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `porting_order_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all phone number blocks, Create a phone number block, Delete a phone number block

| Field | Type |
|-------|------|
| `activation_ranges` | array[object] |
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `phone_number_range` | object |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all phone number extensions, Create a phone number extension, Delete a phone number extension

| Field | Type |
|-------|------|
| `activation_ranges` | array[object] |
| `created_at` | date-time |
| `extension_range` | object |
| `id` | uuid |
| `porting_phone_number_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all porting phone numbers

| Field | Type |
|-------|------|
| `activation_status` | enum: New, Pending, Conflict, Cancel Pending, Failed, Concurred, Activate RDY, Disconnect Pending, Concurrence Sent, Old, Sending, Active, Cancelled |
| `phone_number` | string |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `portability_status` | enum: pending, confirmed, provisional |
| `porting_order_id` | uuid |
| `porting_order_status` | enum: draft, in-process, submitted, exception, foc-date-confirmed, cancel-pending, ported, cancelled |
| `record_type` | string |
| `requirements_status` | enum: requirement-info-pending, requirement-info-under-review, requirement-info-exception, approved |
| `support_key` | string |

## Optional Parameters

### Run a portability check — `client.portabilityChecks().run()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phoneNumbers` | array[string] | The list of +E.164 formatted phone numbers to check for portability |

### Create a porting order — `client.portingOrders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string | A customer-specified reference number for customer bookkeeping purposes |
| `customerGroupReference` | string | A customer-specified group reference for customer bookkeeping purposes |

### Edit a porting order — `client.portingOrders().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `misc` | object |  |
| `endUser` | object |  |
| `documents` | object | Can be specified directly or via the `requirement_group_id` parameter. |
| `activationSettings` | object |  |
| `phoneNumberConfiguration` | object |  |
| `requirementGroupId` | string (UUID) | If present, we will read the current values from the specified Requirement Gr... |
| `requirements` | array[object] | List of requirements for porting numbers. |
| `userFeedback` | object |  |
| `webhookUrl` | string (URL) |  |
| `customerReference` | string |  |
| `customerGroupReference` | string |  |
| `messaging` | object |  |

### Create a comment for a porting order — `client.portingOrders().comments().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `body` | string |  |
