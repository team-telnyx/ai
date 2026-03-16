---
name: telnyx-numbers-java
description: >-
  Search, order, and manage phone numbers by location, features, and coverage.
metadata:
  author: telnyx
  product: numbers
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers - Java

## Core Workflow

### Prerequisites

1. Check country coverage and regulatory requirements
2. For regulated countries (CH, DK, IT, NO, PT, SE): create and fulfill requirement groups before ordering

### Steps

1. **Search available numbers**: `client.availablePhoneNumbers().list(params)`
2. **(Optional) Reserve**: `client.numberReservations().create(params)`
3. **Place order**: `client.numberOrders().create(params)`
4. **Configure for voice**: `client.phoneNumbers().voice().update(params)`
5. **Configure for SMS**: `client.phoneNumbers().messaging().update(params)`

### Common mistakes

- NEVER order numbers without a prior search — orders are rejected if numbers don't come from search results
- NEVER rely on reservations for long-term holds — they expire after 30 minutes with no renewal
- NEVER send SMS without assigning the number to a messaging profile — the from number will be rejected
- For SMS: ensure the number has SMS capability (filter during search)

**Related skills**: telnyx-numbers-config-java, telnyx-numbers-compliance-java, telnyx-voice-java, telnyx-messaging-java, telnyx-porting-in-java

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
    var result = client.numberOrders().create(params);
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List available phone numbers

`client.availablePhoneNumbers().list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.availablephonenumbers.AvailablePhoneNumberListParams;
import com.telnyx.sdk.models.availablephonenumbers.AvailablePhoneNumberListResponse;

AvailablePhoneNumberListResponse availablePhoneNumbers = client.availablePhoneNumbers().list();
```

Key response fields: `response.data.phone_number, response.data.best_effort, response.data.cost_information`

## Create a number order

Creates a phone number order.

`client.numberOrders().create()` — `POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[object] | Yes |  |
| `connectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.numberorders.NumberOrderCreateParams;
import com.telnyx.sdk.models.numberorders.NumberOrderCreateResponse;

NumberOrderCreateParams params = NumberOrderCreateParams.builder()

    .addPhoneNumber(

        NumberOrderCreateParams.PhoneNumber.builder()

            .phoneNumber("+18005550101")

            .build()

        )

    .build();

NumberOrderCreateResponse numberOrder = client.numberOrders().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number order

Get an existing phone number order.

`client.numberOrders().retrieve()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderId` | string (UUID) | Yes | The number order ID. |

```java
import com.telnyx.sdk.models.numberorders.NumberOrderRetrieveParams;
import com.telnyx.sdk.models.numberorders.NumberOrderRetrieveResponse;

NumberOrderRetrieveResponse numberOrder = client.numberOrders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number reservation

Creates a Phone Number Reservation for multiple numbers.

`client.numberReservations().create()` — `POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[object] | Yes |  |
| `status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `id` | string (UUID) | No |  |
| `recordType` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.numberreservations.NumberReservationCreateParams;
import com.telnyx.sdk.models.numberreservations.NumberReservationCreateResponse;

NumberReservationCreateParams params = NumberReservationCreateParams.builder()

    .addPhoneNumber(

        NumberReservationCreateParams.PhoneNumber.builder()

            .phoneNumber("+18005550101")

            .build()

        )

    .build();

NumberReservationCreateResponse numberReservation = client.numberReservations().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a number reservation

Gets a single phone number reservation.

`client.numberReservations().retrieve()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberReservationId` | string (UUID) | Yes | The number reservation ID. |

```java
import com.telnyx.sdk.models.numberreservations.NumberReservationRetrieveParams;
import com.telnyx.sdk.models.numberreservations.NumberReservationRetrieveResponse;

NumberReservationRetrieveResponse numberReservation = client.numberReservations().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Advanced Orders

`client.advancedOrders().list()` — `GET /advanced_orders`

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrderListParams;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderListResponse;

AdvancedOrderListResponse advancedOrders = client.advancedOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Create Advanced Order

`client.advancedOrders().create()` — `POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrder;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderCreateParams;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderCreateResponse;

AdvancedOrder params = AdvancedOrder.builder().build();
AdvancedOrderCreateResponse advancedOrder = client.advancedOrders().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Update Advanced Order

`client.advancedOrders().updateRequirementGroup()` — `PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advanced-order-id` | string (UUID) | Yes |  |
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrder;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderUpdateRequirementGroupParams;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderUpdateRequirementGroupResponse;

AdvancedOrderUpdateRequirementGroupParams params = AdvancedOrderUpdateRequirementGroupParams.builder()
    .advancedOrderId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .advancedOrder(AdvancedOrder.builder().build())
    .build();
AdvancedOrderUpdateRequirementGroupResponse response = client.advancedOrders().updateRequirementGroup(params);
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Get Advanced Order

`client.advancedOrders().retrieve()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrderRetrieveParams;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderRetrieveResponse;

AdvancedOrderRetrieveResponse advancedOrder = client.advancedOrders().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## List available phone number blocks

`client.availablePhoneNumberBlocks().list()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.availablephonenumberblocks.AvailablePhoneNumberBlockListParams;
import com.telnyx.sdk.models.availablephonenumberblocks.AvailablePhoneNumberBlockListResponse;

AvailablePhoneNumberBlockListResponse availablePhoneNumberBlocks = client.availablePhoneNumberBlocks().list();
```

Key response fields: `response.data.phone_number, response.data.cost_information, response.data.features`

## Retrieve all comments

`client.comments().list()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.comments.CommentListParams;
import com.telnyx.sdk.models.comments.CommentListResponse;

CommentListResponse comments = client.comments().list();
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment

`client.comments().create()` — `POST /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `commenterType` | enum (admin, user) | No |  |
| `commentRecordType` | enum (sub_number_order, requirement_group) | No |  |
| `commentRecordId` | string (UUID) | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.comments.Comment;
import com.telnyx.sdk.models.comments.CommentCreateParams;
import com.telnyx.sdk.models.comments.CommentCreateResponse;

Comment params = Comment.builder().build();
CommentCreateResponse comment = client.comments().create(params);
```

Key response fields: `response.data.data`

## Retrieve a comment

`client.comments().retrieve()` — `GET /comments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The comment ID. |

```java
import com.telnyx.sdk.models.comments.CommentRetrieveParams;
import com.telnyx.sdk.models.comments.CommentRetrieveResponse;

CommentRetrieveResponse comment = client.comments().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.data`

## Mark a comment as read

`client.comments().markAsRead()` — `PATCH /comments/{id}/read`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The comment ID. |

```java
import com.telnyx.sdk.models.comments.CommentMarkAsReadParams;
import com.telnyx.sdk.models.comments.CommentMarkAsReadResponse;

CommentMarkAsReadResponse response = client.comments().markAsRead("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.data`

## Get country coverage

`client.countryCoverage().retrieve()` — `GET /country_coverage`

```java
import com.telnyx.sdk.models.countrycoverage.CountryCoverageRetrieveParams;
import com.telnyx.sdk.models.countrycoverage.CountryCoverageRetrieveResponse;

CountryCoverageRetrieveResponse countryCoverage = client.countryCoverage().retrieve();
```

Key response fields: `response.data.data`

## Get coverage for a specific country

`client.countryCoverage().retrieveCountry()` — `GET /country_coverage/countries/{country_code}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | Country ISO code. |

```java
import com.telnyx.sdk.models.countrycoverage.CountryCoverageRetrieveCountryParams;
import com.telnyx.sdk.models.countrycoverage.CountryCoverageRetrieveCountryResponse;

CountryCoverageRetrieveCountryResponse response = client.countryCoverage().retrieveCountry("US");
```

Key response fields: `response.data.code, response.data.features, response.data.international_sms`

## List customer service records

List customer service records.

`client.customerServiceRecords().list()` — `GET /customer_service_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```java
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordListPage;
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordListParams;

CustomerServiceRecordListPage page = client.customerServiceRecords().list();
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Create a customer service record

Create a new customer service record for the provided phone number.

`client.customerServiceRecords().create()` — `POST /customer_service_records`

```java
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordCreateParams;
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordCreateResponse;

CustomerServiceRecordCreateParams params = CustomerServiceRecordCreateParams.builder()
    .phoneNumber("+13035553000")
    .build();
CustomerServiceRecordCreateResponse customerServiceRecord = client.customerServiceRecords().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify CSR phone number coverage

Verify the coverage for a list of phone numbers.

`client.customerServiceRecords().verifyPhoneNumberCoverage()` — `POST /customer_service_records/phone_number_coverages`

```java
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordVerifyPhoneNumberCoverageParams;
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordVerifyPhoneNumberCoverageResponse;

CustomerServiceRecordVerifyPhoneNumberCoverageParams params = CustomerServiceRecordVerifyPhoneNumberCoverageParams.builder()
    .addPhoneNumber("+13035553000")
    .build();
CustomerServiceRecordVerifyPhoneNumberCoverageResponse response = client.customerServiceRecords().verifyPhoneNumberCoverage(params);
```

Key response fields: `response.data.phone_number, response.data.additional_data_required, response.data.has_csr_coverage`

## Get a customer service record

Get a specific customer service record.

`client.customerServiceRecords().retrieve()` — `GET /customer_service_records/{customer_service_record_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerServiceRecordId` | string (UUID) | Yes | The ID of the customer service record |

```java
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordRetrieveParams;
import com.telnyx.sdk.models.customerservicerecords.CustomerServiceRecordRetrieveResponse;

CustomerServiceRecordRetrieveResponse customerServiceRecord = client.customerServiceRecords().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List inexplicit number orders

Get a paginated list of inexplicit number orders.

`client.inexplicitNumberOrders().list()` — `GET /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageNumber` | integer | No | The page number to load |
| `pageSize` | integer | No | The size of the page |

```java
import com.telnyx.sdk.models.inexplicitnumberorders.InexplicitNumberOrderListPage;
import com.telnyx.sdk.models.inexplicitnumberorders.InexplicitNumberOrderListParams;

InexplicitNumberOrderListPage page = client.inexplicitNumberOrders().list();
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inexplicit number order

Create an inexplicit number order to programmatically purchase phone numbers without specifying exact numbers.

`client.inexplicitNumberOrders().create()` — `POST /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderingGroups` | array[object] | Yes | Group(s) of numbers to order. |
| `connectionId` | string (UUID) | No | Connection id to apply to phone numbers that are purchased |
| `messagingProfileId` | string (UUID) | No | Messaging profile id to apply to phone numbers that are purc... |
| `billingGroupId` | string (UUID) | No | Billing group id to apply to phone numbers that are purchase... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.inexplicitnumberorders.InexplicitNumberOrderCreateParams;
import com.telnyx.sdk.models.inexplicitnumberorders.InexplicitNumberOrderCreateResponse;

InexplicitNumberOrderCreateParams params = InexplicitNumberOrderCreateParams.builder()
    .addOrderingGroup(InexplicitNumberOrderCreateParams.OrderingGroup.builder()
        .countRequested("count_requested")
        .countryIso(InexplicitNumberOrderCreateParams.OrderingGroup.CountryIso.US)
        .phoneNumberType("phone_number_type")
        .build())
    .build();
InexplicitNumberOrderCreateResponse inexplicitNumberOrder = client.inexplicitNumberOrders().create(params);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Retrieve an inexplicit number order

Get an existing inexplicit number order by ID.

`client.inexplicitNumberOrders().retrieve()` — `GET /inexplicit_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the inexplicit number order |

```java
import com.telnyx.sdk.models.inexplicitnumberorders.InexplicitNumberOrderRetrieveParams;
import com.telnyx.sdk.models.inexplicitnumberorders.InexplicitNumberOrderRetrieveResponse;

InexplicitNumberOrderRetrieveResponse inexplicitNumberOrder = client.inexplicitNumberOrders().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inventory coverage request

Creates an inventory coverage request. If locality, npa or national_destination_code is used in groupBy, and no region or locality filters are used, the whole paginated set is returned.

`client.inventoryCoverage().list()` — `GET /inventory_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.inventorycoverage.InventoryCoverageListParams;
import com.telnyx.sdk.models.inventorycoverage.InventoryCoverageListResponse;

InventoryCoverageListResponse inventoryCoverages = client.inventoryCoverage().list();
```

Key response fields: `response.data.administrative_area, response.data.advance_requirements, response.data.count`

## List mobile network operators

Telnyx has a set of GSM mobile operators partners that are available through our mobile network roaming. This resource is entirely managed by Telnyx and may change over time. That means that this resource won't allow any write operations for it.

`client.mobileNetworkOperators().list()` — `GET /mobile_network_operators`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for mobile network operators (... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```java
import com.telnyx.sdk.models.mobilenetworkoperators.MobileNetworkOperatorListPage;
import com.telnyx.sdk.models.mobilenetworkoperators.MobileNetworkOperatorListParams;

MobileNetworkOperatorListPage page = client.mobileNetworkOperators().list();
```

Key response fields: `response.data.id, response.data.name, response.data.country_code`

## List network coverage locations

List all locations and the interfaces that region supports

`client.networkCoverage().list()` — `GET /network_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.networkcoverage.NetworkCoverageListPage;
import com.telnyx.sdk.models.networkcoverage.NetworkCoverageListParams;

NetworkCoverageListPage page = client.networkCoverage().list();
```

Key response fields: `response.data.available_services, response.data.location, response.data.record_type`

## List number block orders

Get a paginated list of number block orders.

`client.numberBlockOrders().list()` — `GET /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.numberblockorders.NumberBlockOrderListPage;
import com.telnyx.sdk.models.numberblockorders.NumberBlockOrderListParams;

NumberBlockOrderListPage page = client.numberBlockOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number block order

Creates a phone number block order.

`client.numberBlockOrders().create()` — `POST /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startingNumber` | string | Yes | Starting phone number block |
| `range` | integer | Yes | The phone number range included in the block. |
| `connectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `status` | enum (pending, success, failure) | No | The status of the order. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.numberblockorders.NumberBlockOrderCreateParams;
import com.telnyx.sdk.models.numberblockorders.NumberBlockOrderCreateResponse;

NumberBlockOrderCreateParams params = NumberBlockOrderCreateParams.builder()
    .range(10L)
    .startingNumber("+19705555000")
    .build();
NumberBlockOrderCreateResponse numberBlockOrder = client.numberBlockOrders().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number block order

Get an existing phone number block order.

`client.numberBlockOrders().retrieve()` — `GET /number_block_orders/{number_block_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberBlockOrderId` | string (UUID) | Yes | The number block order ID. |

```java
import com.telnyx.sdk.models.numberblockorders.NumberBlockOrderRetrieveParams;
import com.telnyx.sdk.models.numberblockorders.NumberBlockOrderRetrieveResponse;

NumberBlockOrderRetrieveResponse numberBlockOrder = client.numberBlockOrders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a list of phone numbers associated to orders

Get a list of phone numbers associated to orders.

`client.numberOrderPhoneNumbers().list()` — `GET /number_order_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberListParams;
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberListResponse;

NumberOrderPhoneNumberListResponse numberOrderPhoneNumbers = client.numberOrderPhoneNumbers().list();
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a single phone number within a number order.

Get an existing phone number in number order.

`client.numberOrderPhoneNumbers().retrieve()` — `GET /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderPhoneNumberId` | string (UUID) | Yes | The number order phone number ID. |

```java
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberRetrieveParams;
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberRetrieveResponse;

NumberOrderPhoneNumberRetrieveResponse numberOrderPhoneNumber = client.numberOrderPhoneNumbers().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update requirements for a single phone number within a number order.

Updates requirements for a single phone number within a number order.

`client.numberOrderPhoneNumbers().updateRequirements()` — `PATCH /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderPhoneNumberId` | string (UUID) | Yes | The number order phone number ID. |
| `regulatoryRequirements` | array[object] | No |  |

```java
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberUpdateRequirementsParams;
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberUpdateRequirementsResponse;

NumberOrderPhoneNumberUpdateRequirementsResponse response = client.numberOrderPhoneNumbers().updateRequirements("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List number orders

Get a paginated list of number orders.

`client.numberOrders().list()` — `GET /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.numberorders.NumberOrderListPage;
import com.telnyx.sdk.models.numberorders.NumberOrderListParams;

NumberOrderListPage page = client.numberOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Update a number order

Updates a phone number order.

`client.numberOrders().update()` — `PATCH /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderId` | string (UUID) | Yes | The number order ID. |
| `regulatoryRequirements` | array[object] | No |  |
| `customerReference` | string | No | A customer reference string for customer look ups. |

```java
import com.telnyx.sdk.models.numberorders.NumberOrderUpdateParams;
import com.telnyx.sdk.models.numberorders.NumberOrderUpdateResponse;

NumberOrderUpdateResponse numberOrder = client.numberOrders().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## List number reservations

Gets a paginated list of phone number reservations.

`client.numberReservations().list()` — `GET /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.numberreservations.NumberReservationListPage;
import com.telnyx.sdk.models.numberreservations.NumberReservationListParams;

NumberReservationListPage page = client.numberReservations().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Extend a number reservation

Extends reservation expiry time on all phone numbers.

`client.numberReservations().actions().extend()` — `POST /number_reservations/{number_reservation_id}/actions/extend`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberReservationId` | string (UUID) | Yes | The number reservation ID. |

```java
import com.telnyx.sdk.models.numberreservations.actions.ActionExtendParams;
import com.telnyx.sdk.models.numberreservations.actions.ActionExtendResponse;

ActionExtendResponse response = client.numberReservations().actions().extend("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve the features for a list of numbers

`client.numbersFeatures().create()` — `POST /numbers_features`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |

```java
import com.telnyx.sdk.models.numbersfeatures.NumbersFeatureCreateParams;
import com.telnyx.sdk.models.numbersfeatures.NumbersFeatureCreateResponse;

NumbersFeatureCreateParams params = NumbersFeatureCreateParams.builder()
    .addPhoneNumber("string")
    .build();
NumbersFeatureCreateResponse numbersFeature = client.numbersFeatures().create(params);
```

Key response fields: `response.data.phone_number, response.data.features`

## Lists the phone number blocks jobs

`client.phoneNumberBlocks().jobs().list()` — `GET /phone_number_blocks/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.phonenumberblocks.jobs.JobListPage;
import com.telnyx.sdk.models.phonenumberblocks.jobs.JobListParams;

JobListPage page = client.phoneNumberBlocks().jobs().list();
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes all numbers associated with a phone number block

Creates a new background job to delete all the phone numbers associated with the given block. We will only consider the phone number block as deleted after all phone numbers associated with it are removed, so multiple executions of this job may be necessary in case some of the phone numbers present errors during the deletion process.

`client.phoneNumberBlocks().jobs().deletePhoneNumberBlock()` — `POST /phone_number_blocks/jobs/delete_phone_number_block`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberBlockId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.phonenumberblocks.jobs.JobDeletePhoneNumberBlockParams;
import com.telnyx.sdk.models.phonenumberblocks.jobs.JobDeletePhoneNumberBlockResponse;

JobDeletePhoneNumberBlockParams params = JobDeletePhoneNumberBlockParams.builder()
    .phoneNumberBlockId("f3946371-7199-4261-9c3d-81a0d7935146")
    .build();
JobDeletePhoneNumberBlockResponse response = client.phoneNumberBlocks().jobs().deletePhoneNumberBlock(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieves a phone number blocks job

`client.phoneNumberBlocks().jobs().retrieve()` — `GET /phone_number_blocks/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Number Blocks Job. |

```java
import com.telnyx.sdk.models.phonenumberblocks.jobs.JobRetrieveParams;
import com.telnyx.sdk.models.phonenumberblocks.jobs.JobRetrieveResponse;

JobRetrieveResponse job = client.phoneNumberBlocks().jobs().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List sub number orders

Get a paginated list of sub number orders.

`client.subNumberOrders().list()` — `GET /sub_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderListParams;
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderListResponse;

SubNumberOrderListResponse subNumberOrders = client.subNumberOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number order

Get an existing sub number order.

`client.subNumberOrders().retrieve()` — `GET /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subNumberOrderId` | string (UUID) | Yes | The sub number order ID. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderRetrieveParams;
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderRetrieveResponse;

SubNumberOrderRetrieveResponse subNumberOrder = client.subNumberOrders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a sub number order's requirements

Updates a sub number order.

`client.subNumberOrders().update()` — `PATCH /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subNumberOrderId` | string (UUID) | Yes | The sub number order ID. |
| `regulatoryRequirements` | array[object] | No |  |

```java
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderUpdateParams;
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderUpdateResponse;

SubNumberOrderUpdateResponse subNumberOrder = client.subNumberOrders().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a sub number order

Allows you to cancel a sub number order in 'pending' status.

`client.subNumberOrders().cancel()` — `PATCH /sub_number_orders/{sub_number_order_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subNumberOrderId` | string (UUID) | Yes | The ID of the sub number order. |

```java
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderCancelParams;
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderCancelResponse;

SubNumberOrderCancelResponse response = client.subNumberOrders().cancel("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a sub number orders report

Create a CSV report for sub number orders. The report will be generated asynchronously and can be downloaded once complete.

`client.subNumberOrdersReport().create()` — `POST /sub_number_orders_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (pending, success, failure) | No | Filter by order status |
| `orderRequestId` | string (UUID) | No | Filter by specific order request ID |
| `countryCode` | string (ISO 3166-1 alpha-2) | No | Filter by country code |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.subnumberordersreport.SubNumberOrdersReportCreateParams;
import com.telnyx.sdk.models.subnumberordersreport.SubNumberOrdersReportCreateResponse;

SubNumberOrdersReportCreateResponse subNumberOrdersReport = client.subNumberOrdersReport().create();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number orders report

Get the status and details of a sub number orders report.

`client.subNumberOrdersReport().retrieve()` — `GET /sub_number_orders_report/{report_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```java
import com.telnyx.sdk.models.subnumberordersreport.SubNumberOrdersReportRetrieveParams;
import com.telnyx.sdk.models.subnumberordersreport.SubNumberOrdersReportRetrieveResponse;

SubNumberOrdersReportRetrieveResponse subNumberOrdersReport = client.subNumberOrdersReport().retrieve("12ade33a-21c0-473b-b055-b3c836e1c293");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a sub number orders report

Download the CSV file for a completed sub number orders report. The report status must be 'success' before the file can be downloaded.

`client.subNumberOrdersReport().download()` — `GET /sub_number_orders_report/{report_id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```java
import com.telnyx.sdk.models.subnumberordersreport.SubNumberOrdersReportDownloadParams;

String response = client.subNumberOrdersReport().download("12ade33a-21c0-473b-b055-b3c836e1c293");
```

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```java
import com.telnyx.sdk.core.UnwrapWebhookParams;
import com.telnyx.sdk.core.http.Headers;

// In your webhook handler (e.g., Spring — use raw body):
@PostMapping("/webhooks")
public ResponseEntity<String> handleWebhook(
    @RequestBody String payload,
    HttpServletRequest request) {
  try {
    Headers headers = Headers.builder()
        .put("telnyx-signature-ed25519", request.getHeader("telnyx-signature-ed25519"))
        .put("telnyx-timestamp", request.getHeader("telnyx-timestamp"))
        .build();
    var event = client.webhooks().unwrap(
        UnwrapWebhookParams.builder()
            .body(payload)
            .headers(headers)
            .build());
    // Signature valid — process the event
    System.out.println("Received webhook event");
    return ResponseEntity.ok("OK");
  } catch (Exception e) {
    System.err.println("Webhook verification failed: " + e.getMessage());
    return ResponseEntity.badRequest().body("Invalid signature");
  }
}
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
