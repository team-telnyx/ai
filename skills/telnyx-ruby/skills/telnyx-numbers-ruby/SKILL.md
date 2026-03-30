---
name: telnyx-numbers-ruby
description: >-
  Search, order, and manage phone numbers by location, features, and coverage.
metadata:
  author: telnyx
  product: numbers
  language: ruby
  generated_by: telnyx-ext-skills-generator
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
available_phone_numbers = client.available_phone_numbers.list
puts(available_phone_numbers)
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).

## Core Tasks

### Search available phone numbers

Number search is the entrypoint for provisioning. Agents need the search method, key query filters, and the fields returned for candidate numbers.

`client.available_phone_numbers.list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
available_phone_numbers = client.available_phone_numbers.list

puts(available_phone_numbers)
```

Response wrapper:
- items: `available_phone_numbers.data`
- pagination: `available_phone_numbers.meta`

Primary item fields:
- `phone_number`
- `record_type`
- `quickship`
- `reservable`
- `best_effort`
- `cost_information`

### Create a number order

Number ordering is the production provisioning step after number selection.

`client.number_orders.create()` — `POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[object] | Yes |  |
| `connection_id` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```ruby
number_order = client.number_orders.create(phone_numbers: [{"phone_number": "+18005550101"}])
puts(number_order)
```

Primary response fields:
- `number_order.data.id`
- `number_order.data.status`
- `number_order.data.phone_numbers_count`
- `number_order.data.requirements_met`
- `number_order.data.messaging_profile_id`
- `number_order.data.connection_id`

### Check number order status

Order status determines whether provisioning completed or additional requirements are still blocking fulfillment.

`client.number_orders.retrieve()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_id` | string (UUID) | Yes | The number order ID. |

```ruby
number_order = client.number_orders.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(number_order)
```

Primary response fields:
- `number_order.data.id`
- `number_order.data.status`
- `number_order.data.requirements_met`
- `number_order.data.phone_numbers_count`
- `number_order.data.phone_numbers`
- `number_order.data.connection_id`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Create a number reservation

Create or provision an additional resource when the core tasks do not cover this flow.

`client.number_reservations.create()` — `POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[object] | Yes |  |
| `status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `id` | string (UUID) | No |  |
| `record_type` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
number_reservation = client.number_reservations.create(phone_numbers: [{"phone_number": "+18005550101"}])
puts(number_reservation)
```

Primary response fields:
- `number_reservation.data.id`
- `number_reservation.data.status`
- `number_reservation.data.created_at`
- `number_reservation.data.updated_at`
- `number_reservation.data.customer_reference`
- `number_reservation.data.errors`

### Retrieve a number reservation

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.number_reservations.retrieve()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_reservation_id` | string (UUID) | Yes | The number reservation ID. |

```ruby
number_reservation = client.number_reservations.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(number_reservation)
```

Primary response fields:
- `number_reservation.data.id`
- `number_reservation.data.status`
- `number_reservation.data.created_at`
- `number_reservation.data.updated_at`
- `number_reservation.data.customer_reference`
- `number_reservation.data.errors`

### List Advanced Orders

Inspect available resources or choose an existing resource before mutating it.

`client.advanced_orders.list()` — `GET /advanced_orders`

```ruby
advanced_orders = client.advanced_orders.list

puts(advanced_orders)
```

Response wrapper:
- items: `advanced_orders.data`

Primary item fields:
- `id`
- `status`
- `area_code`
- `comments`
- `country_code`
- `customer_reference`

### Create Advanced Order

Create or provision an additional resource when the core tasks do not cover this flow.

`client.advanced_orders.create()` — `POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirement_group_id` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```ruby
advanced_order = client.advanced_orders.create

puts(advanced_order)
```

Primary response fields:
- `advanced_order.id`
- `advanced_order.status`
- `advanced_order.area_code`
- `advanced_order.comments`
- `advanced_order.country_code`
- `advanced_order.customer_reference`

### Update Advanced Order

Modify an existing resource without recreating it.

`client.advanced_orders.update_requirement_group()` — `PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advanced-order-id` | string (UUID) | Yes |  |
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirement_group_id` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.advanced_orders.update_requirement_group("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Primary response fields:
- `response.id`
- `response.status`
- `response.area_code`
- `response.comments`
- `response.country_code`
- `response.customer_reference`

### Get Advanced Order

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.advanced_orders.retrieve()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes |  |

```ruby
advanced_order = client.advanced_orders.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(advanced_order)
```

Primary response fields:
- `advanced_order.id`
- `advanced_order.status`
- `advanced_order.area_code`
- `advanced_order.comments`
- `advanced_order.country_code`
- `advanced_order.customer_reference`

### List available phone number blocks

Inspect available resources or choose an existing resource before mutating it.

`client.available_phone_number_blocks.list()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
available_phone_number_blocks = client.available_phone_number_blocks.list

puts(available_phone_number_blocks)
```

Response wrapper:
- items: `available_phone_number_blocks.data`
- pagination: `available_phone_number_blocks.meta`

Primary item fields:
- `phone_number`
- `cost_information`
- `features`
- `range`
- `record_type`
- `region_information`

### Retrieve all comments

Inspect available resources or choose an existing resource before mutating it.

`client.comments.list()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
comments = client.comments.list

puts(comments)
```

Response wrapper:
- items: `comments.data`
- pagination: `comments.meta`

Primary item fields:
- `id`
- `body`
- `created_at`
- `updated_at`
- `comment_record_id`
- `comment_record_type`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a comment | `client.comments.create()` | `POST /comments` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a comment | `client.comments.retrieve()` | `GET /comments/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Mark a comment as read | `client.comments.mark_as_read()` | `PATCH /comments/{id}/read` | Modify an existing resource without recreating it. | `id` |
| Get country coverage | `client.country_coverage.retrieve()` | `GET /country_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get coverage for a specific country | `client.country_coverage.retrieve_country()` | `GET /country_coverage/countries/{country_code}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `country_code` |
| List customer service records | `client.customer_service_records.list()` | `GET /customer_service_records` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a customer service record | `client.customer_service_records.create()` | `POST /customer_service_records` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Verify CSR phone number coverage | `client.customer_service_records.verify_phone_number_coverage()` | `POST /customer_service_records/phone_number_coverages` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Get a customer service record | `client.customer_service_records.retrieve()` | `GET /customer_service_records/{customer_service_record_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `customer_service_record_id` |
| List inexplicit number orders | `client.inexplicit_number_orders.list()` | `GET /inexplicit_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an inexplicit number order | `client.inexplicit_number_orders.create()` | `POST /inexplicit_number_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `ordering_groups` |
| Retrieve an inexplicit number order | `client.inexplicit_number_orders.retrieve()` | `GET /inexplicit_number_orders/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Create an inventory coverage request | `client.inventory_coverage.list()` | `GET /inventory_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List mobile network operators | `client.mobile_network_operators.list()` | `GET /mobile_network_operators` | Inspect available resources or choose an existing resource before mutating it. | None |
| List network coverage locations | `client.network_coverage.list()` | `GET /network_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List number block orders | `client.number_block_orders.list()` | `GET /number_block_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a number block order | `client.number_block_orders.create()` | `POST /number_block_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `starting_number`, `range` |
| Retrieve a number block order | `client.number_block_orders.retrieve()` | `GET /number_block_orders/{number_block_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `number_block_order_id` |
| Retrieve a list of phone numbers associated to orders | `client.number_order_phone_numbers.list()` | `GET /number_order_phone_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a single phone number within a number order. | `client.number_order_phone_numbers.retrieve()` | `GET /number_order_phone_numbers/{number_order_phone_number_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `number_order_phone_number_id` |
| Update requirements for a single phone number within a number order. | `client.number_order_phone_numbers.update_requirements()` | `PATCH /number_order_phone_numbers/{number_order_phone_number_id}` | Modify an existing resource without recreating it. | `number_order_phone_number_id` |
| List number orders | `client.number_orders.list()` | `GET /number_orders` | Create or inspect provisioning orders for number purchases. | None |
| Update a number order | `client.number_orders.update()` | `PATCH /number_orders/{number_order_id}` | Modify an existing resource without recreating it. | `number_order_id` |
| List number reservations | `client.number_reservations.list()` | `GET /number_reservations` | Inspect available resources or choose an existing resource before mutating it. | None |
| Extend a number reservation | `client.number_reservations.actions.extend_()` | `POST /number_reservations/{number_reservation_id}/actions/extend` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `number_reservation_id` |
| Retrieve the features for a list of numbers | `client.numbers_features.create()` | `POST /numbers_features` | Create or provision an additional resource when the core tasks do not cover this flow. | `phone_numbers` |
| Lists the phone number blocks jobs | `client.phone_number_blocks.jobs.list()` | `GET /phone_number_blocks/jobs` | Inspect available resources or choose an existing resource before mutating it. | None |
| Deletes all numbers associated with a phone number block | `client.phone_number_blocks.jobs.delete_phone_number_block()` | `POST /phone_number_blocks/jobs/delete_phone_number_block` | Create or provision an additional resource when the core tasks do not cover this flow. | `phone_number_block_id` |
| Retrieves a phone number blocks job | `client.phone_number_blocks.jobs.retrieve()` | `GET /phone_number_blocks/jobs/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List sub number orders | `client.sub_number_orders.list()` | `GET /sub_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a sub number order | `client.sub_number_orders.retrieve()` | `GET /sub_number_orders/{sub_number_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `sub_number_order_id` |
| Update a sub number order's requirements | `client.sub_number_orders.update()` | `PATCH /sub_number_orders/{sub_number_order_id}` | Modify an existing resource without recreating it. | `sub_number_order_id` |
| Cancel a sub number order | `client.sub_number_orders.cancel()` | `PATCH /sub_number_orders/{sub_number_order_id}/cancel` | Modify an existing resource without recreating it. | `sub_number_order_id` |
| Create a sub number orders report | `client.sub_number_orders_report.create()` | `POST /sub_number_orders_report` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a sub number orders report | `client.sub_number_orders_report.retrieve()` | `GET /sub_number_orders_report/{report_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `report_id` |
| Download a sub number orders report | `client.sub_number_orders_report.download()` | `GET /sub_number_orders_report/{report_id}/download` | Fetch the current state before updating, deleting, or making control-flow decisions. | `report_id` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
