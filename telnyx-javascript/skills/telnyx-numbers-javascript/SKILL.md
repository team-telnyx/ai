---
name: telnyx-numbers-javascript
description: >-
  Search, order, and manage phone numbers by location, features, and coverage.
metadata:
  author: telnyx
  product: numbers
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers - JavaScript

## Core Workflow

### Prerequisites

1. Check country coverage and regulatory requirements
2. For regulated countries (CH, DK, IT, NO, PT, SE): create and fulfill requirement groups before ordering

### Steps

1. **Search available numbers**: `client.availablePhoneNumbers.list({filter: ...})`
2. **(Optional) Reserve**: `client.numberReservations.create()`
3. **Place order**: `client.numberOrders.create({phoneNumbers: [...]})`
4. **Configure for voice**: `client.phoneNumbers.voice.update({id: ..., connectionId: ...})`
5. **Configure for SMS**: `client.phoneNumbers.messaging.update({id: ..., messagingProfileId: ...})`

### Common mistakes

- NEVER order numbers without a prior search — orders are rejected if numbers don't come from search results
- NEVER rely on reservations for long-term holds — they expire after 30 minutes with no renewal
- NEVER send SMS without assigning the number to a messaging profile — the from number will be rejected
- For SMS: ensure the number has SMS capability (filter during search)

**Related skills**: telnyx-numbers-config-javascript, telnyx-numbers-compliance-javascript, telnyx-voice-javascript, telnyx-messaging-javascript, telnyx-porting-in-javascript

## Installation

```bash
npm install telnyx
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
  const result = await client.number_orders.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List available phone numbers

`client.availablePhoneNumbers.list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const availablePhoneNumbers = await client.availablePhoneNumbers.list();

console.log(availablePhoneNumbers.data);
```

Key response fields: `response.data.phone_number, response.data.best_effort, response.data.cost_information`

## Create a number order

Creates a phone number order.

`client.numberOrders.create()` — `POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[object] | Yes |  |
| `connectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const numberOrder = await client.numberOrders.create({
    phoneNumbers: [{"phone_number": "+18005550101"}],
});

console.log(numberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number order

Get an existing phone number order.

`client.numberOrders.retrieve()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderId` | string (UUID) | Yes | The number order ID. |

```javascript
const numberOrder = await client.numberOrders.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(numberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number reservation

Creates a Phone Number Reservation for multiple numbers.

`client.numberReservations.create()` — `POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[object] | Yes |  |
| `status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `id` | string (UUID) | No |  |
| `recordType` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const numberReservation = await client.numberReservations.create({
    phoneNumbers: [{"phone_number": "+18005550101"}],
});

console.log(numberReservation.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a number reservation

Gets a single phone number reservation.

`client.numberReservations.retrieve()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberReservationId` | string (UUID) | Yes | The number reservation ID. |

```javascript
const numberReservation = await client.numberReservations.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(numberReservation.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Advanced Orders

`client.advancedOrders.list()` — `GET /advanced_orders`

```javascript
const advancedOrders = await client.advancedOrders.list();

console.log(advancedOrders.data);
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Create Advanced Order

`client.advancedOrders.create()` — `POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const advancedOrder = await client.advancedOrders.create();

console.log(advancedOrder.id);
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Update Advanced Order

`client.advancedOrders.updateRequirementGroup()` — `PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advanced-order-id` | string (UUID) | Yes |  |
| `phoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `countryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.advancedOrders.updateRequirementGroup(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.id);
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Get Advanced Order

`client.advancedOrders.retrieve()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string (UUID) | Yes |  |

```javascript
const advancedOrder = await client.advancedOrders.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(advancedOrder.id);
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## List available phone number blocks

`client.availablePhoneNumberBlocks.list()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const availablePhoneNumberBlocks = await client.availablePhoneNumberBlocks.list();

console.log(availablePhoneNumberBlocks.data);
```

Key response fields: `response.data.phone_number, response.data.cost_information, response.data.features`

## Retrieve all comments

`client.comments.list()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const comments = await client.comments.list();

console.log(comments.data);
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment

`client.comments.create()` — `POST /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `commenterType` | enum (admin, user) | No |  |
| `commentRecordType` | enum (sub_number_order, requirement_group) | No |  |
| `commentRecordId` | string (UUID) | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const comment = await client.comments.create();

console.log(comment.data);
```

Key response fields: `response.data.data`

## Retrieve a comment

`client.comments.retrieve()` — `GET /comments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The comment ID. |

```javascript
const comment = await client.comments.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(comment.data);
```

Key response fields: `response.data.data`

## Mark a comment as read

`client.comments.markAsRead()` — `PATCH /comments/{id}/read`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The comment ID. |

```javascript
const response = await client.comments.markAsRead('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.data`

## Get country coverage

`client.countryCoverage.retrieve()` — `GET /country_coverage`

```javascript
const countryCoverage = await client.countryCoverage.retrieve();

console.log(countryCoverage.data);
```

Key response fields: `response.data.data`

## Get coverage for a specific country

`client.countryCoverage.retrieveCountry()` — `GET /country_coverage/countries/{country_code}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | Country ISO code. |

```javascript
const response = await client.countryCoverage.retrieveCountry('US');

console.log(response.data);
```

Key response fields: `response.data.code, response.data.features, response.data.international_sms`

## List customer service records

List customer service records.

`client.customerServiceRecords.list()` — `GET /customer_service_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const customerServiceRecord of client.customerServiceRecords.list()) {
  console.log(customerServiceRecord.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Create a customer service record

Create a new customer service record for the provided phone number.

`client.customerServiceRecords.create()` — `POST /customer_service_records`

```javascript
const customerServiceRecord = await client.customerServiceRecords.create({
  phone_number: '+13035553000',
});

console.log(customerServiceRecord.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify CSR phone number coverage

Verify the coverage for a list of phone numbers.

`client.customerServiceRecords.verifyPhoneNumberCoverage()` — `POST /customer_service_records/phone_number_coverages`

```javascript
const response = await client.customerServiceRecords.verifyPhoneNumberCoverage({
  phone_numbers: ['+13035553000'],
});

console.log(response.data);
```

Key response fields: `response.data.phone_number, response.data.additional_data_required, response.data.has_csr_coverage`

## Get a customer service record

Get a specific customer service record.

`client.customerServiceRecords.retrieve()` — `GET /customer_service_records/{customer_service_record_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerServiceRecordId` | string (UUID) | Yes | The ID of the customer service record |

```javascript
const customerServiceRecord = await client.customerServiceRecords.retrieve(
  'customer_service_record_id',
);

console.log(customerServiceRecord.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List inexplicit number orders

Get a paginated list of inexplicit number orders.

`client.inexplicitNumberOrders.list()` — `GET /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageNumber` | integer | No | The page number to load |
| `pageSize` | integer | No | The size of the page |

```javascript
// Automatically fetches more pages as needed.
for await (const inexplicitNumberOrderResponse of client.inexplicitNumberOrders.list()) {
  console.log(inexplicitNumberOrderResponse.id);
}
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inexplicit number order

Create an inexplicit number order to programmatically purchase phone numbers without specifying exact numbers.

`client.inexplicitNumberOrders.create()` — `POST /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderingGroups` | array[object] | Yes | Group(s) of numbers to order. |
| `connectionId` | string (UUID) | No | Connection id to apply to phone numbers that are purchased |
| `messagingProfileId` | string (UUID) | No | Messaging profile id to apply to phone numbers that are purc... |
| `billingGroupId` | string (UUID) | No | Billing group id to apply to phone numbers that are purchase... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const inexplicitNumberOrder = await client.inexplicitNumberOrders.create({
  ordering_groups: [
    {
      count_requested: 'count_requested',
      country_iso: 'US',
      phone_number_type: 'phone_number_type',
    },
  ],
});

console.log(inexplicitNumberOrder.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Retrieve an inexplicit number order

Get an existing inexplicit number order by ID.

`client.inexplicitNumberOrders.retrieve()` — `GET /inexplicit_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the inexplicit number order |

```javascript
const inexplicitNumberOrder = await client.inexplicitNumberOrders.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(inexplicitNumberOrder.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inventory coverage request

Creates an inventory coverage request. If locality, npa or national_destination_code is used in groupBy, and no region or locality filters are used, the whole paginated set is returned.

`client.inventoryCoverage.list()` — `GET /inventory_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const inventoryCoverages = await client.inventoryCoverage.list();

console.log(inventoryCoverages.data);
```

Key response fields: `response.data.administrative_area, response.data.advance_requirements, response.data.count`

## List mobile network operators

Telnyx has a set of GSM mobile operators partners that are available through our mobile network roaming. This resource is entirely managed by Telnyx and may change over time. That means that this resource won't allow any write operations for it.

`client.mobileNetworkOperators.list()` — `GET /mobile_network_operators`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for mobile network operators (... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const mobileNetworkOperatorListResponse of client.mobileNetworkOperators.list()) {
  console.log(mobileNetworkOperatorListResponse.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.country_code`

## List network coverage locations

List all locations and the interfaces that region supports

`client.networkCoverage.list()` — `GET /network_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const networkCoverageListResponse of client.networkCoverage.list()) {
  console.log(networkCoverageListResponse.available_services);
}
```

Key response fields: `response.data.available_services, response.data.location, response.data.record_type`

## List number block orders

Get a paginated list of number block orders.

`client.numberBlockOrders.list()` — `GET /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const numberBlockOrder of client.numberBlockOrders.list()) {
  console.log(numberBlockOrder.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number block order

Creates a phone number block order.

`client.numberBlockOrders.create()` — `POST /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startingNumber` | string | Yes | Starting phone number block |
| `range` | integer | Yes | The phone number range included in the block. |
| `connectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `status` | enum (pending, success, failure) | No | The status of the order. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const numberBlockOrder = await client.numberBlockOrders.create({
  range: 10,
  starting_number: '+19705555000',
});

console.log(numberBlockOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number block order

Get an existing phone number block order.

`client.numberBlockOrders.retrieve()` — `GET /number_block_orders/{number_block_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberBlockOrderId` | string (UUID) | Yes | The number block order ID. |

```javascript
const numberBlockOrder = await client.numberBlockOrders.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(numberBlockOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a list of phone numbers associated to orders

Get a list of phone numbers associated to orders.

`client.numberOrderPhoneNumbers.list()` — `GET /number_order_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const numberOrderPhoneNumbers = await client.numberOrderPhoneNumbers.list();

console.log(numberOrderPhoneNumbers.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a single phone number within a number order.

Get an existing phone number in number order.

`client.numberOrderPhoneNumbers.retrieve()` — `GET /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderPhoneNumberId` | string (UUID) | Yes | The number order phone number ID. |

```javascript
const numberOrderPhoneNumber = await client.numberOrderPhoneNumbers.retrieve(
  'number_order_phone_number_id',
);

console.log(numberOrderPhoneNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update requirements for a single phone number within a number order.

Updates requirements for a single phone number within a number order.

`client.numberOrderPhoneNumbers.updateRequirements()` — `PATCH /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderPhoneNumberId` | string (UUID) | Yes | The number order phone number ID. |
| `regulatoryRequirements` | array[object] | No |  |

```javascript
const response = await client.numberOrderPhoneNumbers.updateRequirements(
  'number_order_phone_number_id',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List number orders

Get a paginated list of number orders.

`client.numberOrders.list()` — `GET /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const numberOrderListResponse of client.numberOrders.list()) {
  console.log(numberOrderListResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Update a number order

Updates a phone number order.

`client.numberOrders.update()` — `PATCH /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberOrderId` | string (UUID) | Yes | The number order ID. |
| `regulatoryRequirements` | array[object] | No |  |
| `customerReference` | string | No | A customer reference string for customer look ups. |

```javascript
const numberOrder = await client.numberOrders.update('550e8400-e29b-41d4-a716-446655440000');

console.log(numberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## List number reservations

Gets a paginated list of phone number reservations.

`client.numberReservations.list()` — `GET /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const numberReservation of client.numberReservations.list()) {
  console.log(numberReservation.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Extend a number reservation

Extends reservation expiry time on all phone numbers.

`client.numberReservations.actions.extend()` — `POST /number_reservations/{number_reservation_id}/actions/extend`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberReservationId` | string (UUID) | Yes | The number reservation ID. |

```javascript
const response = await client.numberReservations.actions.extend('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve the features for a list of numbers

`client.numbersFeatures.create()` — `POST /numbers_features`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |

```javascript
const numbersFeature = await client.numbersFeatures.create({ phone_numbers: ['string'] });

console.log(numbersFeature.data);
```

Key response fields: `response.data.phone_number, response.data.features`

## Lists the phone number blocks jobs

`client.phoneNumberBlocks.jobs.list()` — `GET /phone_number_blocks/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const job of client.phoneNumberBlocks.jobs.list()) {
  console.log(job.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes all numbers associated with a phone number block

Creates a new background job to delete all the phone numbers associated with the given block. We will only consider the phone number block as deleted after all phone numbers associated with it are removed, so multiple executions of this job may be necessary in case some of the phone numbers present errors during the deletion process.

`client.phoneNumberBlocks.jobs.deletePhoneNumberBlock()` — `POST /phone_number_blocks/jobs/delete_phone_number_block`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberBlockId` | string (UUID) | Yes |  |

```javascript
const response = await client.phoneNumberBlocks.jobs.deletePhoneNumberBlock({
  phone_number_block_id: 'f3946371-7199-4261-9c3d-81a0d7935146',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieves a phone number blocks job

`client.phoneNumberBlocks.jobs.retrieve()` — `GET /phone_number_blocks/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Number Blocks Job. |

```javascript
const job = await client.phoneNumberBlocks.jobs.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(job.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List sub number orders

Get a paginated list of sub number orders.

`client.subNumberOrders.list()` — `GET /sub_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const subNumberOrders = await client.subNumberOrders.list();

console.log(subNumberOrders.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number order

Get an existing sub number order.

`client.subNumberOrders.retrieve()` — `GET /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subNumberOrderId` | string (UUID) | Yes | The sub number order ID. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const subNumberOrder = await client.subNumberOrders.retrieve('sub_number_order_id');

console.log(subNumberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a sub number order's requirements

Updates a sub number order.

`client.subNumberOrders.update()` — `PATCH /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subNumberOrderId` | string (UUID) | Yes | The sub number order ID. |
| `regulatoryRequirements` | array[object] | No |  |

```javascript
const subNumberOrder = await client.subNumberOrders.update('sub_number_order_id');

console.log(subNumberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a sub number order

Allows you to cancel a sub number order in 'pending' status.

`client.subNumberOrders.cancel()` — `PATCH /sub_number_orders/{sub_number_order_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subNumberOrderId` | string (UUID) | Yes | The ID of the sub number order. |

```javascript
const response = await client.subNumberOrders.cancel('sub_number_order_id');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a sub number orders report

Create a CSV report for sub number orders. The report will be generated asynchronously and can be downloaded once complete.

`client.subNumberOrdersReport.create()` — `POST /sub_number_orders_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (pending, success, failure) | No | Filter by order status |
| `orderRequestId` | string (UUID) | No | Filter by specific order request ID |
| `countryCode` | string (ISO 3166-1 alpha-2) | No | Filter by country code |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const subNumberOrdersReport = await client.subNumberOrdersReport.create();

console.log(subNumberOrdersReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number orders report

Get the status and details of a sub number orders report.

`client.subNumberOrdersReport.retrieve()` — `GET /sub_number_orders_report/{report_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```javascript
const subNumberOrdersReport = await client.subNumberOrdersReport.retrieve(
  '12ade33a-21c0-473b-b055-b3c836e1c293',
);

console.log(subNumberOrdersReport.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a sub number orders report

Download the CSV file for a completed sub number orders report. The report status must be 'success' before the file can be downloaded.

`client.subNumberOrdersReport.download()` — `GET /sub_number_orders_report/{report_id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```javascript
const response = await client.subNumberOrdersReport.download(
  '12ade33a-21c0-473b-b055-b3c836e1c293',
);

console.log(response);
```

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```javascript
// In your webhook handler (e.g., Express — use raw body, not parsed JSON):
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body.toString(), {
      headers: req.headers,
    });
    // Signature valid — event is the parsed webhook payload
    console.log('Received event:', event.data.event_type);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
