<!-- SDK reference: telnyx-numbers-javascript -->

# Telnyx Numbers - JavaScript

## Installation

```bash
npm install telnyx@6.74.2
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const availablePhoneNumbers = await client.availablePhoneNumbers.list();
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the Optional Parameters section below and the shared SDK API Details reference before writing code.
- Before using any operation in `## Additional Operations`, read the Optional Parameters section below and [the response-schemas section](../../references/sdk-api-details/numbers.md#response-schemas).

## Core Tasks

### Search available phone numbers

Number search is the entrypoint for provisioning. Agents need the search method, key query filters, and the fields returned for candidate numbers.

`client.availablePhoneNumbers.list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const availablePhoneNumbers = await client.availablePhoneNumbers.list();

console.log(availablePhoneNumbers.data);
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

`client.numberOrders.create()` — `POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[object] | Yes |  |
| `connection_id` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in the Optional Parameters section below and the shared SDK API Details reference |

```javascript
const numberOrder = await client.numberOrders.create({
    phone_numbers: [{"phone_number": "+18005550101"}],
});

console.log(numberOrder.data);
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

`client.numberOrders.retrieve()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_id` | string (UUID) | Yes | The number order ID. |

```javascript
const numberOrder = await client.numberOrders.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(numberOrder.data);
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

`client.numberReservations.create()` — `POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[object] | Yes |  |
| `status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `id` | string (UUID) | No |  |
| `record_type` | string | No |  |
| ... | | | +3 optional params in the Optional Parameters section below and the shared SDK API Details reference |

```javascript
const numberReservation = await client.numberReservations.create({
    phone_numbers: [{"phone_number": "+18005550101"}],
});

console.log(numberReservation.data);
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

`client.numberReservations.retrieve()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_reservation_id` | string (UUID) | Yes | The number reservation ID. |

```javascript
const numberReservation = await client.numberReservations.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(numberReservation.data);
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

`client.advancedOrders.list()` — `GET /advanced_orders`

```javascript
const advancedOrders = await client.advancedOrders.list();

console.log(advancedOrders.data);
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

`client.advancedOrders.create()` — `POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirement_group_id` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in the Optional Parameters section below and the shared SDK API Details reference |

```javascript
const advancedOrder = await client.advancedOrders.create();

console.log(advancedOrder.id);
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

`client.advancedOrders.updateRequirementGroup()` — `PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advanced-order-id` | string (UUID) | Yes | Unique identifier of the advanced order. |
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirement_group_id` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in the Optional Parameters section below and the shared SDK API Details reference |

```javascript
const response = await client.advancedOrders.updateRequirementGroup(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.id);
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

`client.advancedOrders.retrieve()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes | Unique identifier of the order. |

```javascript
const advancedOrder = await client.advancedOrders.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(advancedOrder.id);
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

`client.availablePhoneNumberBlocks.list()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const availablePhoneNumberBlocks = await client.availablePhoneNumberBlocks.list();

console.log(availablePhoneNumberBlocks.data);
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

`client.comments.list()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const comments = await client.comments.list();

console.log(comments.data);
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

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the Optional Parameters section below and the shared SDK API Details reference for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read the Optional Parameters section below and [the response-schemas section](../../references/sdk-api-details/numbers.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a comment | `client.comments.create()` | `POST /comments` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a comment | `client.comments.retrieve()` | `GET /comments/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Mark a comment as read | `client.comments.markAsRead()` | `PATCH /comments/{id}/read` | Modify an existing resource without recreating it. | `id` |
| Get country coverage | `client.countryCoverage.retrieve()` | `GET /country_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get coverage for a specific country | `client.countryCoverage.retrieveCountry()` | `GET /country_coverage/countries/{country_code}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `country_code` |
| List customer service records | `client.customerServiceRecords.list()` | `GET /customer_service_records` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a customer service record | `client.customerServiceRecords.create()` | `POST /customer_service_records` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Verify CSR phone number coverage | `client.customerServiceRecords.verifyPhoneNumberCoverage()` | `POST /customer_service_records/phone_number_coverages` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Get a customer service record | `client.customerServiceRecords.retrieve()` | `GET /customer_service_records/{customer_service_record_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `customer_service_record_id` |
| List inexplicit number orders | `client.inexplicitNumberOrders.list()` | `GET /inexplicit_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an inexplicit number order | `client.inexplicitNumberOrders.create()` | `POST /inexplicit_number_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `ordering_groups` |
| Retrieve an inexplicit number order | `client.inexplicitNumberOrders.retrieve()` | `GET /inexplicit_number_orders/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Create an inventory coverage request | `client.inventoryCoverage.list()` | `GET /inventory_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List mobile network operators | `client.mobileNetworkOperators.list()` | `GET /mobile_network_operators` | Inspect available resources or choose an existing resource before mutating it. | None |
| List network coverage locations | `client.networkCoverage.list()` | `GET /network_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List number block orders | `client.numberBlockOrders.list()` | `GET /number_block_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a number block order | `client.numberBlockOrders.create()` | `POST /number_block_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `starting_number`, `range` |
| Retrieve a number block order | `client.numberBlockOrders.retrieve()` | `GET /number_block_orders/{number_block_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `number_block_order_id` |
| Retrieve a list of phone numbers associated to orders | `client.numberOrderPhoneNumbers.list()` | `GET /number_order_phone_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a single phone number within a number order. | `client.numberOrderPhoneNumbers.retrieve()` | `GET /number_order_phone_numbers/{number_order_phone_number_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `number_order_phone_number_id` |
| Update requirements for a single phone number within a number order. | `client.numberOrderPhoneNumbers.updateRequirements()` | `PATCH /number_order_phone_numbers/{number_order_phone_number_id}` | Modify an existing resource without recreating it. | `number_order_phone_number_id` |
| List number orders | `client.numberOrders.list()` | `GET /number_orders` | Create or inspect provisioning orders for number purchases. | None |
| Update a number order | `client.numberOrders.update()` | `PATCH /number_orders/{number_order_id}` | Modify an existing resource without recreating it. | `number_order_id` |
| List number reservations | `client.numberReservations.list()` | `GET /number_reservations` | Inspect available resources or choose an existing resource before mutating it. | None |
| Extend a number reservation | `client.numberReservations.actions.extend()` | `POST /number_reservations/{number_reservation_id}/actions/extend` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `number_reservation_id` |
| Retrieve the features for a list of numbers | `client.numbersFeatures.create()` | `POST /numbers_features` | Create or provision an additional resource when the core tasks do not cover this flow. | `phone_numbers` |
| Lists the phone number blocks jobs | `client.phoneNumberBlocks.jobs.list()` | `GET /phone_number_blocks/jobs` | Inspect available resources or choose an existing resource before mutating it. | None |
| Deletes all numbers associated with a phone number block | `client.phoneNumberBlocks.jobs.deletePhoneNumberBlock()` | `POST /phone_number_blocks/jobs/delete_phone_number_block` | Create or provision an additional resource when the core tasks do not cover this flow. | `phone_number_block_id` |
| Retrieves a phone number blocks job | `client.phoneNumberBlocks.jobs.retrieve()` | `GET /phone_number_blocks/jobs/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List sub number orders | `client.subNumberOrders.list()` | `GET /sub_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a sub number order | `client.subNumberOrders.retrieve()` | `GET /sub_number_orders/{sub_number_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `sub_number_order_id` |
| Update a sub number order's requirements | `client.subNumberOrders.update()` | `PATCH /sub_number_orders/{sub_number_order_id}` | Modify an existing resource without recreating it. | `sub_number_order_id` |
| Cancel a sub number order | `client.subNumberOrders.cancel()` | `PATCH /sub_number_orders/{sub_number_order_id}/cancel` | Modify an existing resource without recreating it. | `sub_number_order_id` |
| Create a sub number orders report | `client.subNumberOrdersReport.create()` | `POST /sub_number_orders_report` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a sub number orders report | `client.subNumberOrdersReport.retrieve()` | `GET /sub_number_orders_report/{report_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `report_id` |
| Download a sub number orders report | `client.subNumberOrdersReport.download()` | `GET /sub_number_orders_report/{report_id}/download` | Fetch the current state before updating, deleting, or making control-flow decisions. | `report_id` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the Optional Parameters section below and the shared SDK API Details reference.
---

**Do not guess optional fields. Response schemas and webhook payload fields are in [the shared SDK API Details reference](../../references/sdk-api-details/numbers.md). Optional parameters for this language are in the Optional Parameters section below.**

## Optional Parameters

### Create Advanced Order — `client.advancedOrders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `country_code` | string (ISO 3166-1 alpha-2) |  |
| `comments` | string |  |
| `quantity` | integer |  |
| `area_code` | string |  |
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) |  |
| `features` | array[object] |  |
| `customer_reference` | string |  |
| `requirement_group_id` | string (UUID) | The ID of the requirement group to associate with this advanced order |

### Update Advanced Order — `client.advancedOrders.updateRequirementGroup()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `country_code` | string (ISO 3166-1 alpha-2) |  |
| `comments` | string |  |
| `quantity` | integer |  |
| `area_code` | string |  |
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) |  |
| `features` | array[object] |  |
| `customer_reference` | string |  |
| `requirement_group_id` | string (UUID) | The ID of the requirement group to associate with this advanced order |

### Create a comment — `client.comments.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `body` | string |  |
| `commenter` | string |  |
| `commenter_type` | enum (admin, user) |  |
| `comment_record_type` | enum (sub_number_order, requirement_group) |  |
| `comment_record_id` | string (UUID) |  |
| `read_at` | string (date-time) | An ISO 8901 datetime string for when the comment was read. |
| `created_at` | string (date-time) | An ISO 8901 datetime string denoting when the comment was created. |
| `updated_at` | string (date-time) | An ISO 8901 datetime string for when the comment was updated. |

### Create an inexplicit number order — `client.inexplicitNumberOrders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection_id` | string (UUID) | Connection id to apply to phone numbers that are purchased |
| `messaging_profile_id` | string (UUID) | Messaging profile id to apply to phone numbers that are purchased |
| `customer_reference` | string | Reference label for the customer |
| `billing_group_id` | string (UUID) | Billing group id to apply to phone numbers that are purchased |

### Create a number block order — `client.numberBlockOrders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `record_type` | string |  |
| `phone_numbers_count` | integer | The count of phone numbers in the number order. |
| `connection_id` | string (UUID) | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `status` | enum (pending, success, failure) | The status of the order. |
| `customer_reference` | string | A customer reference string for customer look ups. |
| `created_at` | string (date-time) | An ISO 8901 datetime string denoting when the number order was created. |
| `updated_at` | string (date-time) | An ISO 8901 datetime string for when the number order was updated. |
| `requirements_met` | boolean | True if all requirements are met for every phone number, false otherwise. |
| `errors` | string | Errors the reservation could happen upon |

### Update requirements for a single phone number within a number order. — `client.numberOrderPhoneNumbers.updateRequirements()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatory_requirements` | array[object] |  |

### Create a number order — `client.numberOrders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phone_numbers` | array[object] |  |
| `connection_id` | string (UUID) | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `billing_group_id` | string (UUID) | Identifies the billing group associated with the phone number. |
| `customer_reference` | string | A customer reference string for customer look ups. |

### Update a number order — `client.numberOrders.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatory_requirements` | array[object] |  |
| `customer_reference` | string | A customer reference string for customer look ups. |

### Create a number reservation — `client.numberReservations.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `record_type` | string |  |
| `phone_numbers` | array[object] |  |
| `status` | enum (pending, success, failure) | The status of the entire reservation. |
| `customer_reference` | string | A customer reference string for customer look ups. |
| `created_at` | string (date-time) | An ISO 8901 datetime string denoting when the numbers reservation was created. |
| `updated_at` | string (date-time) | An ISO 8901 datetime string for when the number reservation was updated. |

### Update a sub number order's requirements — `client.subNumberOrders.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatory_requirements` | array[object] |  |

### Create a sub number orders report — `client.subNumberOrdersReport.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum (pending, success, failure) | Filter by order status |
| `country_code` | string (ISO 3166-1 alpha-2) | Filter by country code |
| `created_at_gt` | string (date-time) | Filter for orders created after this date |
| `created_at_lt` | string (date-time) | Filter for orders created before this date |
| `order_request_id` | string (UUID) | Filter by specific order request ID |
| `customer_reference` | string | Filter by customer reference |
