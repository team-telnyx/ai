<!-- SDK reference: telnyx-numbers-java -->

# Telnyx Numbers - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.58.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.58.0")
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
import com.telnyx.sdk.models.availablephonenumbers.AvailablePhoneNumberListParams;
import com.telnyx.sdk.models.availablephonenumbers.AvailablePhoneNumberListResponse;
AvailablePhoneNumberListResponse availablePhoneNumbers = client.availablePhoneNumbers().list();
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas).

## Core Tasks

### Search available phone numbers

Number search is the entrypoint for provisioning. Agents need the search method, key query filters, and the fields returned for candidate numbers.

`client.availablePhoneNumbers().list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.availablephonenumbers.AvailablePhoneNumberListParams;
import com.telnyx.sdk.models.availablephonenumbers.AvailablePhoneNumberListResponse;

AvailablePhoneNumberListResponse availablePhoneNumbers = client.availablePhoneNumbers().list();
```

Response wrapper:
- items: `availablePhoneNumbers.data`
- pagination: `availablePhoneNumbers.meta`

Primary item fields:
- `phoneNumber`
- `recordType`
- `quickship`
- `reservable`
- `bestEffort`
- `costInformation`

### Create a number order

Number ordering is the production provisioning step after number selection.

`client.numberOrders().create()` — `POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[object] | Yes |  |
| `connectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in the API Details section below |

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

Primary response fields:
- `numberOrder.data.id`
- `numberOrder.data.status`
- `numberOrder.data.phoneNumbersCount`
- `numberOrder.data.requirementsMet`
- `numberOrder.data.messagingProfileId`
- `numberOrder.data.connectionId`

### Check number order status

Order status determines whether provisioning completed or additional requirements are still blocking fulfillment.

`client.numberOrders().retrieve()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderId` | string (UUID) | Yes | The number order ID. |

```java
import com.telnyx.sdk.models.numberorders.NumberOrderRetrieveParams;
import com.telnyx.sdk.models.numberorders.NumberOrderRetrieveResponse;

NumberOrderRetrieveResponse numberOrder = client.numberOrders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Primary response fields:
- `numberOrder.data.id`
- `numberOrder.data.status`
- `numberOrder.data.requirementsMet`
- `numberOrder.data.phoneNumbersCount`
- `numberOrder.data.phoneNumbers`
- `numberOrder.data.connectionId`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Create a number reservation

Create or provision an additional resource when the core tasks do not cover this flow.

`client.numberReservations().create()` — `POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[object] | Yes |  |
| `status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `id` | string (UUID) | No |  |
| `recordType` | string | No |  |
| ... | | | +3 optional params in the API Details section below |

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

Primary response fields:
- `numberReservation.data.id`
- `numberReservation.data.status`
- `numberReservation.data.createdAt`
- `numberReservation.data.updatedAt`
- `numberReservation.data.customerReference`
- `numberReservation.data.errors`

### Retrieve a number reservation

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.numberReservations().retrieve()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberReservationId` | string (UUID) | Yes | The number reservation ID. |

```java
import com.telnyx.sdk.models.numberreservations.NumberReservationRetrieveParams;
import com.telnyx.sdk.models.numberreservations.NumberReservationRetrieveResponse;

NumberReservationRetrieveResponse numberReservation = client.numberReservations().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Primary response fields:
- `numberReservation.data.id`
- `numberReservation.data.status`
- `numberReservation.data.createdAt`
- `numberReservation.data.updatedAt`
- `numberReservation.data.customerReference`
- `numberReservation.data.errors`

### List Advanced Orders

Inspect available resources or choose an existing resource before mutating it.

`client.advancedOrders().list()` — `GET /advanced_orders`

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrderListParams;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderListResponse;

AdvancedOrderListResponse advancedOrders = client.advancedOrders().list();
```

Response wrapper:
- items: `advancedOrders.data`

Primary item fields:
- `id`
- `status`
- `areaCode`
- `comments`
- `countryCode`
- `customerReference`

### Create Advanced Order

Create or provision an additional resource when the core tasks do not cover this flow.

`client.advancedOrders().create()` — `POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrder;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderCreateResponse;

AdvancedOrder params = AdvancedOrder.builder().build();
AdvancedOrderCreateResponse advancedOrder = client.advancedOrders().create(params);
```

Primary response fields:
- `advancedOrder.id`
- `advancedOrder.status`
- `advancedOrder.areaCode`
- `advancedOrder.comments`
- `advancedOrder.countryCode`
- `advancedOrder.customerReference`

### Update Advanced Order

Modify an existing resource without recreating it.

`client.advancedOrders().updateRequirementGroup()` — `PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advanced-order-id` | string (UUID) | Yes |  |
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in the API Details section below |

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

Primary response fields:
- `response.id`
- `response.status`
- `response.areaCode`
- `response.comments`
- `response.countryCode`
- `response.customerReference`

### Get Advanced Order

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.advancedOrders().retrieve()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.advancedorders.AdvancedOrderRetrieveParams;
import com.telnyx.sdk.models.advancedorders.AdvancedOrderRetrieveResponse;

AdvancedOrderRetrieveResponse advancedOrder = client.advancedOrders().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Primary response fields:
- `advancedOrder.id`
- `advancedOrder.status`
- `advancedOrder.areaCode`
- `advancedOrder.comments`
- `advancedOrder.countryCode`
- `advancedOrder.customerReference`

### List available phone number blocks

Inspect available resources or choose an existing resource before mutating it.

`client.availablePhoneNumberBlocks().list()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.availablephonenumberblocks.AvailablePhoneNumberBlockListParams;
import com.telnyx.sdk.models.availablephonenumberblocks.AvailablePhoneNumberBlockListResponse;

AvailablePhoneNumberBlockListResponse availablePhoneNumberBlocks = client.availablePhoneNumberBlocks().list();
```

Response wrapper:
- items: `availablePhoneNumberBlocks.data`
- pagination: `availablePhoneNumberBlocks.meta`

Primary item fields:
- `phoneNumber`
- `costInformation`
- `features`
- `range`
- `recordType`
- `regionInformation`

### Retrieve all comments

Inspect available resources or choose an existing resource before mutating it.

`client.comments().list()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.comments.CommentListParams;
import com.telnyx.sdk.models.comments.CommentListResponse;

CommentListResponse comments = client.comments().list();
```

Response wrapper:
- items: `comments.data`
- pagination: `comments.meta`

Primary item fields:
- `id`
- `body`
- `createdAt`
- `updatedAt`
- `commentRecordId`
- `commentRecordType`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a comment | `client.comments().create()` | `POST /comments` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a comment | `client.comments().retrieve()` | `GET /comments/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Mark a comment as read | `client.comments().markAsRead()` | `PATCH /comments/{id}/read` | Modify an existing resource without recreating it. | `id` |
| Get country coverage | `client.countryCoverage().retrieve()` | `GET /country_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get coverage for a specific country | `client.countryCoverage().retrieveCountry()` | `GET /country_coverage/countries/{country_code}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `countryCode` |
| List customer service records | `client.customerServiceRecords().list()` | `GET /customer_service_records` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a customer service record | `client.customerServiceRecords().create()` | `POST /customer_service_records` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Verify CSR phone number coverage | `client.customerServiceRecords().verifyPhoneNumberCoverage()` | `POST /customer_service_records/phone_number_coverages` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Get a customer service record | `client.customerServiceRecords().retrieve()` | `GET /customer_service_records/{customer_service_record_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `customerServiceRecordId` |
| List inexplicit number orders | `client.inexplicitNumberOrders().list()` | `GET /inexplicit_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an inexplicit number order | `client.inexplicitNumberOrders().create()` | `POST /inexplicit_number_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `orderingGroups` |
| Retrieve an inexplicit number order | `client.inexplicitNumberOrders().retrieve()` | `GET /inexplicit_number_orders/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Create an inventory coverage request | `client.inventoryCoverage().list()` | `GET /inventory_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List mobile network operators | `client.mobileNetworkOperators().list()` | `GET /mobile_network_operators` | Inspect available resources or choose an existing resource before mutating it. | None |
| List network coverage locations | `client.networkCoverage().list()` | `GET /network_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List number block orders | `client.numberBlockOrders().list()` | `GET /number_block_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a number block order | `client.numberBlockOrders().create()` | `POST /number_block_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `startingNumber`, `range` |
| Retrieve a number block order | `client.numberBlockOrders().retrieve()` | `GET /number_block_orders/{number_block_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `numberBlockOrderId` |
| Retrieve a list of phone numbers associated to orders | `client.numberOrderPhoneNumbers().list()` | `GET /number_order_phone_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a single phone number within a number order. | `client.numberOrderPhoneNumbers().retrieve()` | `GET /number_order_phone_numbers/{number_order_phone_number_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `numberOrderPhoneNumberId` |
| Update requirements for a single phone number within a number order. | `client.numberOrderPhoneNumbers().updateRequirements()` | `PATCH /number_order_phone_numbers/{number_order_phone_number_id}` | Modify an existing resource without recreating it. | `numberOrderPhoneNumberId` |
| List number orders | `client.numberOrders().list()` | `GET /number_orders` | Create or inspect provisioning orders for number purchases. | None |
| Update a number order | `client.numberOrders().update()` | `PATCH /number_orders/{number_order_id}` | Modify an existing resource without recreating it. | `numberOrderId` |
| List number reservations | `client.numberReservations().list()` | `GET /number_reservations` | Inspect available resources or choose an existing resource before mutating it. | None |
| Extend a number reservation | `client.numberReservations().actions().extend()` | `POST /number_reservations/{number_reservation_id}/actions/extend` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `numberReservationId` |
| Retrieve the features for a list of numbers | `client.numbersFeatures().create()` | `POST /numbers_features` | Create or provision an additional resource when the core tasks do not cover this flow. | `phoneNumbers` |
| Lists the phone number blocks jobs | `client.phoneNumberBlocks().jobs().list()` | `GET /phone_number_blocks/jobs` | Inspect available resources or choose an existing resource before mutating it. | None |
| Deletes all numbers associated with a phone number block | `client.phoneNumberBlocks().jobs().deletePhoneNumberBlock()` | `POST /phone_number_blocks/jobs/delete_phone_number_block` | Create or provision an additional resource when the core tasks do not cover this flow. | `phoneNumberBlockId` |
| Retrieves a phone number blocks job | `client.phoneNumberBlocks().jobs().retrieve()` | `GET /phone_number_blocks/jobs/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List sub number orders | `client.subNumberOrders().list()` | `GET /sub_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a sub number order | `client.subNumberOrders().retrieve()` | `GET /sub_number_orders/{sub_number_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `subNumberOrderId` |
| Update a sub number order's requirements | `client.subNumberOrders().update()` | `PATCH /sub_number_orders/{sub_number_order_id}` | Modify an existing resource without recreating it. | `subNumberOrderId` |
| Cancel a sub number order | `client.subNumberOrders().cancel()` | `PATCH /sub_number_orders/{sub_number_order_id}/cancel` | Modify an existing resource without recreating it. | `subNumberOrderId` |
| Create a sub number orders report | `client.subNumberOrdersReport().create()` | `POST /sub_number_orders_report` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a sub number orders report | `client.subNumberOrdersReport().retrieve()` | `GET /sub_number_orders_report/{report_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `reportId` |
| Download a sub number orders report | `client.subNumberOrdersReport().download()` | `GET /sub_number_orders_report/{report_id}/download` | Fetch the current state before updating, deleting, or making control-flow decisions. | `reportId` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
---

# Numbers (Java) — API Details

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List Advanced Orders, Create Advanced Order, Update Advanced Order, Get Advanced Order

| Field | Type |
|-------|------|
| `area_code` | string |
| `comments` | string |
| `country_code` | string |
| `customer_reference` | string |
| `features` | array[object] |
| `id` | uuid |
| `orders` | array[string] |
| `phone_number_type` | object |
| `quantity` | integer |
| `requirement_group_id` | uuid |
| `status` | object |

**Returned by:** List available phone number blocks

| Field | Type |
|-------|------|
| `cost_information` | object |
| `features` | array[object] |
| `phone_number` | string |
| `range` | integer |
| `record_type` | enum: available_phone_number_block |
| `region_information` | array[object] |

**Returned by:** List available phone numbers

| Field | Type |
|-------|------|
| `best_effort` | boolean |
| `cost_information` | object |
| `features` | array[object] |
| `phone_number` | string |
| `quickship` | boolean |
| `record_type` | enum: available_phone_number |
| `region_information` | array[object] |
| `reservable` | boolean |
| `vanity_format` | string |

**Returned by:** Retrieve all comments

| Field | Type |
|-------|------|
| `body` | string |
| `comment_record_id` | uuid |
| `comment_record_type` | enum: sub_number_order, requirement_group |
| `commenter` | string |
| `commenter_type` | enum: admin, user |
| `created_at` | date-time |
| `id` | uuid |
| `read_at` | date-time |
| `updated_at` | date-time |

**Returned by:** Create a comment, Retrieve a comment, Mark a comment as read, Get country coverage

| Field | Type |
|-------|------|
| `data` | object |

**Returned by:** Get coverage for a specific country

| Field | Type |
|-------|------|
| `code` | string |
| `features` | array[string] |
| `international_sms` | boolean |
| `inventory_coverage` | boolean |
| `local` | object |
| `mobile` | object |
| `national` | object |
| `numbers` | boolean |
| `p2p` | boolean |
| `phone_number_type` | array[string] |
| `quickship` | boolean |
| `region` | string \| null |
| `reservable` | boolean |
| `shared_cost` | object |
| `toll_free` | object |

**Returned by:** List customer service records, Create a customer service record, Get a customer service record

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `error_message` | string \| null |
| `id` | uuid |
| `phone_number` | string |
| `record_type` | string |
| `result` | object \| null |
| `status` | enum: pending, completed, failed |
| `updated_at` | date-time |
| `webhook_url` | string |

**Returned by:** Verify CSR phone number coverage

| Field | Type |
|-------|------|
| `additional_data_required` | array[string] |
| `has_csr_coverage` | boolean |
| `phone_number` | string |
| `reason` | string |
| `record_type` | string |

**Returned by:** List inexplicit number orders, Create an inexplicit number order, Retrieve an inexplicit number order

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `connection_id` | string |
| `created_at` | date-time |
| `customer_reference` | string |
| `id` | string |
| `messaging_profile_id` | string |
| `ordering_groups` | array[object] |
| `updated_at` | date-time |

**Returned by:** Create an inventory coverage request

| Field | Type |
|-------|------|
| `administrative_area` | string |
| `advance_requirements` | boolean |
| `count` | integer |
| `coverage_type` | enum: number, block |
| `group` | string |
| `group_type` | string |
| `number_range` | integer |
| `number_type` | enum: did, toll-free |
| `phone_number_type` | enum: local, toll_free, national, landline, shared_cost, mobile |
| `record_type` | string |

**Returned by:** List mobile network operators

| Field | Type |
|-------|------|
| `country_code` | string |
| `id` | uuid |
| `mcc` | string |
| `mnc` | string |
| `name` | string |
| `network_preferences_enabled` | boolean |
| `record_type` | string |
| `tadig` | string |

**Returned by:** List network coverage locations

| Field | Type |
|-------|------|
| `available_services` | array[object] |
| `location` | object |
| `record_type` | string |

**Returned by:** List number block orders, Create a number block order, Retrieve a number block order

| Field | Type |
|-------|------|
| `connection_id` | string |
| `created_at` | date-time |
| `customer_reference` | string |
| `id` | uuid |
| `messaging_profile_id` | string |
| `phone_numbers_count` | integer |
| `range` | integer |
| `record_type` | string |
| `requirements_met` | boolean |
| `starting_number` | string |
| `status` | enum: pending, success, failure |
| `updated_at` | date-time |

**Returned by:** Retrieve a list of phone numbers associated to orders, Retrieve a single phone number within a number order., Update requirements for a single phone number within a number order.

| Field | Type |
|-------|------|
| `bundle_id` | uuid |
| `country_code` | string |
| `deadline` | date-time |
| `id` | uuid |
| `is_block_number` | boolean |
| `locality` | string |
| `order_request_id` | uuid |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline |
| `record_type` | string |
| `regulatory_requirements` | array[object] |
| `requirements_met` | boolean |
| `requirements_status` | enum: pending, approved, cancelled, deleted, requirement-info-exception, requirement-info-pending, requirement-info-under-review |
| `status` | enum: pending, success, failure |
| `sub_number_order_id` | uuid |

**Returned by:** List number orders, Create a number order, Retrieve a number order, Update a number order

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `connection_id` | string |
| `created_at` | date-time |
| `customer_reference` | string |
| `id` | uuid |
| `messaging_profile_id` | string |
| `phone_numbers` | array[object] |
| `phone_numbers_count` | integer |
| `record_type` | string |
| `requirements_met` | boolean |
| `status` | enum: pending, success, failure |
| `sub_number_orders_ids` | array[string] |
| `updated_at` | date-time |

**Returned by:** List number reservations, Create a number reservation, Retrieve a number reservation, Extend a number reservation

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `customer_reference` | string |
| `errors` | string |
| `id` | uuid |
| `phone_numbers` | array[object] |
| `record_type` | string |
| `status` | enum: pending, success, failure |
| `updated_at` | date-time |

**Returned by:** Retrieve the features for a list of numbers

| Field | Type |
|-------|------|
| `features` | array[string] |
| `phone_number` | string |

**Returned by:** Lists the phone number blocks jobs, Deletes all numbers associated with a phone number block, Retrieves a phone number blocks job

| Field | Type |
|-------|------|
| `created_at` | string |
| `etc` | date-time |
| `failed_operations` | array[object] |
| `id` | uuid |
| `record_type` | string |
| `status` | enum: pending, in_progress, completed, failed |
| `successful_operations` | array[object] |
| `type` | enum: delete_phone_number_block |
| `updated_at` | string |

**Returned by:** List sub number orders, Retrieve a sub number order, Update a sub number order's requirements, Cancel a sub number order

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `customer_reference` | string |
| `id` | uuid |
| `is_block_sub_number_order` | boolean |
| `order_request_id` | uuid |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline |
| `phone_numbers_count` | integer |
| `record_type` | string |
| `regulatory_requirements` | array[object] |
| `requirements_met` | boolean |
| `status` | enum: pending, success, failure |
| `updated_at` | date-time |
| `user_id` | uuid |

**Returned by:** Create a sub number orders report, Retrieve a sub number orders report

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `filters` | object |
| `id` | uuid |
| `order_type` | string |
| `status` | enum: pending, success, failed, expired |
| `updated_at` | date-time |
| `user_id` | uuid |

## Optional Parameters

### Create Advanced Order — `client.advancedOrders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `countryCode` | string (ISO 3166-1 alpha-2) |  |
| `comments` | string |  |
| `quantity` | integer |  |
| `areaCode` | string |  |
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) |  |
| `features` | array[object] |  |
| `customerReference` | string |  |
| `requirementGroupId` | string (UUID) | The ID of the requirement group to associate with this advanced order |

### Update Advanced Order — `client.advancedOrders().updateRequirementGroup()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `countryCode` | string (ISO 3166-1 alpha-2) |  |
| `comments` | string |  |
| `quantity` | integer |  |
| `areaCode` | string |  |
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) |  |
| `features` | array[object] |  |
| `customerReference` | string |  |
| `requirementGroupId` | string (UUID) | The ID of the requirement group to associate with this advanced order |

### Create a comment — `client.comments().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `body` | string |  |
| `commenter` | string |  |
| `commenterType` | enum (admin, user) |  |
| `commentRecordType` | enum (sub_number_order, requirement_group) |  |
| `commentRecordId` | string (UUID) |  |
| `readAt` | string (date-time) | An ISO 8901 datetime string for when the comment was read. |
| `createdAt` | string (date-time) | An ISO 8901 datetime string denoting when the comment was created. |
| `updatedAt` | string (date-time) | An ISO 8901 datetime string for when the comment was updated. |

### Create an inexplicit number order — `client.inexplicitNumberOrders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | string (UUID) | Connection id to apply to phone numbers that are purchased |
| `messagingProfileId` | string (UUID) | Messaging profile id to apply to phone numbers that are purchased |
| `customerReference` | string | Reference label for the customer |
| `billingGroupId` | string (UUID) | Billing group id to apply to phone numbers that are purchased |

### Create a number block order — `client.numberBlockOrders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `recordType` | string |  |
| `phoneNumbersCount` | integer | The count of phone numbers in the number order. |
| `connectionId` | string (UUID) | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `status` | enum (pending, success, failure) | The status of the order. |
| `customerReference` | string | A customer reference string for customer look ups. |
| `createdAt` | string (date-time) | An ISO 8901 datetime string denoting when the number order was created. |
| `updatedAt` | string (date-time) | An ISO 8901 datetime string for when the number order was updated. |
| `requirementsMet` | boolean | True if all requirements are met for every phone number, false otherwise. |
| `errors` | string | Errors the reservation could happen upon |

### Update requirements for a single phone number within a number order. — `client.numberOrderPhoneNumbers().updateRequirements()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatoryRequirements` | array[object] |  |

### Create a number order — `client.numberOrders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phoneNumbers` | array[object] |  |
| `connectionId` | string (UUID) | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `billingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |
| `customerReference` | string | A customer reference string for customer look ups. |

### Update a number order — `client.numberOrders().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatoryRequirements` | array[object] |  |
| `customerReference` | string | A customer reference string for customer look ups. |

### Create a number reservation — `client.numberReservations().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `recordType` | string |  |
| `phoneNumbers` | array[object] |  |
| `status` | enum (pending, success, failure) | The status of the entire reservation. |
| `customerReference` | string | A customer reference string for customer look ups. |
| `createdAt` | string (date-time) | An ISO 8901 datetime string denoting when the numbers reservation was created. |
| `updatedAt` | string (date-time) | An ISO 8901 datetime string for when the number reservation was updated. |

### Update a sub number order's requirements — `client.subNumberOrders().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatoryRequirements` | array[object] |  |

### Create a sub number orders report — `client.subNumberOrdersReport().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum (pending, success, failure) | Filter by order status |
| `countryCode` | string (ISO 3166-1 alpha-2) | Filter by country code |
| `createdAtGt` | string (date-time) | Filter for orders created after this date |
| `createdAtLt` | string (date-time) | Filter for orders created before this date |
| `orderRequestId` | string (UUID) | Filter by specific order request ID |
| `customerReference` | string | Filter by customer reference |

## Webhook Payload Fields

### `numberOrderStatusUpdate`

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | string | The type of event being sent |
| `data.id` | uuid | Unique identifier for the event |
| `data.occurred_at` | date-time | ISO 8601 timestamp of when the event occurred |
| `data.payload.id` | uuid |  |
| `data.payload.record_type` | string |  |
| `data.payload.phone_numbers_count` | integer | The count of phone numbers in the number order. |
| `data.payload.connection_id` | string | Identifies the connection associated with this phone number. |
| `data.payload.messaging_profile_id` | string | Identifies the messaging profile associated with the phone number. |
| `data.payload.billing_group_id` | string | Identifies the messaging profile associated with the phone number. |
| `data.payload.phone_numbers` | array[object] |  |
| `data.payload.sub_number_orders_ids` | array[string] |  |
| `data.payload.status` | enum: pending, success, failure | The status of the order. |
| `data.payload.customer_reference` | string | A customer reference string for customer look ups. |
| `data.payload.created_at` | date-time | An ISO 8901 datetime string denoting when the number order was created. |
| `data.payload.updated_at` | date-time | An ISO 8901 datetime string for when the number order was updated. |
| `data.payload.requirements_met` | boolean | True if all requirements are met for every phone number, false otherwise. |
| `data.record_type` | string | Type of record |
| `meta.attempt` | integer | Webhook delivery attempt number |
| `meta.delivered_to` | uri | URL where the webhook was delivered |
