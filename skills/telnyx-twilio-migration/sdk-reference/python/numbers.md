<!-- SDK reference: telnyx-numbers-python -->

# Telnyx Numbers - Python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    available_phone_numbers = client.available_phone_numbers.list()
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas).

## Core Tasks

### Search available phone numbers

Number search is the entrypoint for provisioning. Agents need the search method, key query filters, and the fields returned for candidate numbers.

`client.available_phone_numbers.list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
available_phone_numbers = client.available_phone_numbers.list()
print(available_phone_numbers.data)
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
| ... | | | +1 optional params in the API Details section below |

```python
number_order = client.number_orders.create(
    phone_numbers=[{"phone_number": "+18005550101"}],
)
print(number_order.data)
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

```python
number_order = client.number_orders.retrieve(
    "number_order_id",
)
print(number_order.data)
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
| ... | | | +3 optional params in the API Details section below |

```python
number_reservation = client.number_reservations.create(
    phone_numbers=[{"phone_number": "+18005550101"}],
)
print(number_reservation.data)
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

```python
number_reservation = client.number_reservations.retrieve(
    "number_reservation_id",
)
print(number_reservation.data)
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

```python
advanced_orders = client.advanced_orders.list()
print(advanced_orders.data)
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
| ... | | | +5 optional params in the API Details section below |

```python
advanced_order = client.advanced_orders.create()
print(advanced_order.id)
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
| ... | | | +5 optional params in the API Details section below |

```python
response = client.advanced_orders.update_requirement_group(
    advanced_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.id)
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

```python
advanced_order = client.advanced_orders.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(advanced_order.id)
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

```python
available_phone_number_blocks = client.available_phone_number_blocks.list()
print(available_phone_number_blocks.data)
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

```python
comments = client.comments.list()
print(comments.data)
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

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas) so you do not guess missing fields.

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
| Extend a number reservation | `client.number_reservations.actions.extend()` | `POST /number_reservations/{number_reservation_id}/actions/extend` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `number_reservation_id` |
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

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
---

# Numbers (Python) — API Details

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

### Create Advanced Order — `client.advanced_orders.create()`

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

### Update Advanced Order — `client.advanced_orders.update_requirement_group()`

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

### Create an inexplicit number order — `client.inexplicit_number_orders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection_id` | string (UUID) | Connection id to apply to phone numbers that are purchased |
| `messaging_profile_id` | string (UUID) | Messaging profile id to apply to phone numbers that are purchased |
| `customer_reference` | string | Reference label for the customer |
| `billing_group_id` | string (UUID) | Billing group id to apply to phone numbers that are purchased |

### Create a number block order — `client.number_block_orders.create()`

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

### Update requirements for a single phone number within a number order. — `client.number_order_phone_numbers.update_requirements()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatory_requirements` | array[object] |  |

### Create a number order — `client.number_orders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phone_numbers` | array[object] |  |
| `connection_id` | string (UUID) | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `billing_group_id` | string (UUID) | Identifies the billing group associated with the phone number. |
| `customer_reference` | string | A customer reference string for customer look ups. |

### Update a number order — `client.number_orders.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatory_requirements` | array[object] |  |
| `customer_reference` | string | A customer reference string for customer look ups. |

### Create a number reservation — `client.number_reservations.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `record_type` | string |  |
| `phone_numbers` | array[object] |  |
| `status` | enum (pending, success, failure) | The status of the entire reservation. |
| `customer_reference` | string | A customer reference string for customer look ups. |
| `created_at` | string (date-time) | An ISO 8901 datetime string denoting when the numbers reservation was created. |
| `updated_at` | string (date-time) | An ISO 8901 datetime string for when the number reservation was updated. |

### Update a sub number order's requirements — `client.sub_number_orders.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regulatory_requirements` | array[object] |  |

### Create a sub number orders report — `client.sub_number_orders_report.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum (pending, success, failure) | Filter by order status |
| `country_code` | string (ISO 3166-1 alpha-2) | Filter by country code |
| `created_at_gt` | string (date-time) | Filter for orders created after this date |
| `created_at_lt` | string (date-time) | Filter for orders created before this date |
| `order_request_id` | string (UUID) | Filter by specific order request ID |
| `customer_reference` | string | Filter by customer reference |

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
