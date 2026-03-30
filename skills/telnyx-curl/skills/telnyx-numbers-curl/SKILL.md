---
name: telnyx-numbers-curl
description: >-
  Search, order, and manage phone numbers by location, features, and coverage.
metadata:
  author: telnyx
  product: numbers
  language: curl
  generated_by: telnyx-ext-skills-generator
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/available_phone_numbers"
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).

## Core Tasks

### Search available phone numbers

Number search is the entrypoint for provisioning. Agents need the search method, key query filters, and the fields returned for candidate numbers.

`GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/available_phone_numbers"
```

Response wrapper:
- items: `.data`
- pagination: `.meta`

Primary item fields:
- `phone_number`
- `record_type`
- `quickship`
- `reservable`
- `best_effort`
- `cost_information`

### Create a number order

Number ordering is the production provisioning step after number selection.

`POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[object] | Yes |  |
| `connection_id` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `billing_group_id` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "phone_numbers": [
          {
              "phone_number": "+18005550101"
          }
      ]
  }' \
  "https://api.telnyx.com/v2/number_orders"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.phone_numbers_count`
- `.data.requirements_met`
- `.data.messaging_profile_id`
- `.data.connection_id`

### Check number order status

Order status determines whether provisioning completed or additional requirements are still blocking fulfillment.

`GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_id` | string (UUID) | Yes | The number order ID. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/number_orders/550e8400-e29b-41d4-a716-446655440000"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.requirements_met`
- `.data.phone_numbers_count`
- `.data.phone_numbers`
- `.data.connection_id`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Create a number reservation

Create or provision an additional resource when the core tasks do not cover this flow.

`POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[object] | Yes |  |
| `status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `id` | string (UUID) | No |  |
| `record_type` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "phone_numbers": [
          {
              "phone_number": "+18005550101"
          }
      ]
  }' \
  "https://api.telnyx.com/v2/number_reservations"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.created_at`
- `.data.updated_at`
- `.data.customer_reference`
- `.data.errors`

### Retrieve a number reservation

Fetch the current state before updating, deleting, or making control-flow decisions.

`GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_reservation_id` | string (UUID) | Yes | The number reservation ID. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/number_reservations/550e8400-e29b-41d4-a716-446655440000"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.created_at`
- `.data.updated_at`
- `.data.customer_reference`
- `.data.errors`

### List Advanced Orders

Inspect available resources or choose an existing resource before mutating it.

`GET /advanced_orders`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/advanced_orders"
```

Response wrapper:
- items: `.data`

Primary item fields:
- `id`
- `status`
- `area_code`
- `comments`
- `country_code`
- `customer_reference`

### Create Advanced Order

Create or provision an additional resource when the core tasks do not cover this flow.

`POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirement_group_id` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/advanced_orders"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.area_code`
- `.data.comments`
- `.data.country_code`
- `.data.customer_reference`

### Update Advanced Order

Modify an existing resource without recreating it.

`PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advanced-order-id` | string (UUID) | Yes |  |
| `phone_number_type` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `requirement_group_id` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/advanced_orders/{advanced-order-id}/requirement_group"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.area_code`
- `.data.comments`
- `.data.country_code`
- `.data.customer_reference`

### Get Advanced Order

Fetch the current state before updating, deleting, or making control-flow decisions.

`GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/advanced_orders/{order_id}"
```

Primary response fields:
- `.data.id`
- `.data.status`
- `.data.area_code`
- `.data.comments`
- `.data.country_code`
- `.data.customer_reference`

### List available phone number blocks

Inspect available resources or choose an existing resource before mutating it.

`GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/available_phone_number_blocks"
```

Response wrapper:
- items: `.data`
- pagination: `.meta`

Primary item fields:
- `phone_number`
- `cost_information`
- `features`
- `range`
- `record_type`
- `region_information`

### Retrieve all comments

Inspect available resources or choose an existing resource before mutating it.

`GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/comments"
```

Response wrapper:
- items: `.data`
- pagination: `.meta`

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
| Create a comment | HTTP only | `POST /comments` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a comment | HTTP only | `GET /comments/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Mark a comment as read | HTTP only | `PATCH /comments/{id}/read` | Modify an existing resource without recreating it. | `id` |
| Get country coverage | HTTP only | `GET /country_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get coverage for a specific country | HTTP only | `GET /country_coverage/countries/{country_code}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `country_code` |
| List customer service records | HTTP only | `GET /customer_service_records` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a customer service record | HTTP only | `POST /customer_service_records` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Verify CSR phone number coverage | HTTP only | `POST /customer_service_records/phone_number_coverages` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Get a customer service record | HTTP only | `GET /customer_service_records/{customer_service_record_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `customer_service_record_id` |
| List inexplicit number orders | HTTP only | `GET /inexplicit_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an inexplicit number order | HTTP only | `POST /inexplicit_number_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `ordering_groups` |
| Retrieve an inexplicit number order | HTTP only | `GET /inexplicit_number_orders/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Create an inventory coverage request | HTTP only | `GET /inventory_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List mobile network operators | HTTP only | `GET /mobile_network_operators` | Inspect available resources or choose an existing resource before mutating it. | None |
| List network coverage locations | HTTP only | `GET /network_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List number block orders | HTTP only | `GET /number_block_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a number block order | HTTP only | `POST /number_block_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `starting_number`, `range` |
| Retrieve a number block order | HTTP only | `GET /number_block_orders/{number_block_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `number_block_order_id` |
| Retrieve a list of phone numbers associated to orders | HTTP only | `GET /number_order_phone_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a single phone number within a number order. | HTTP only | `GET /number_order_phone_numbers/{number_order_phone_number_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `number_order_phone_number_id` |
| Update requirements for a single phone number within a number order. | HTTP only | `PATCH /number_order_phone_numbers/{number_order_phone_number_id}` | Modify an existing resource without recreating it. | `number_order_phone_number_id` |
| List number orders | HTTP only | `GET /number_orders` | Create or inspect provisioning orders for number purchases. | None |
| Update a number order | HTTP only | `PATCH /number_orders/{number_order_id}` | Modify an existing resource without recreating it. | `number_order_id` |
| List number reservations | HTTP only | `GET /number_reservations` | Inspect available resources or choose an existing resource before mutating it. | None |
| Extend a number reservation | HTTP only | `POST /number_reservations/{number_reservation_id}/actions/extend` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `number_reservation_id` |
| Retrieve the features for a list of numbers | HTTP only | `POST /numbers_features` | Create or provision an additional resource when the core tasks do not cover this flow. | `phone_numbers` |
| Lists the phone number blocks jobs | HTTP only | `GET /phone_number_blocks/jobs` | Inspect available resources or choose an existing resource before mutating it. | None |
| Deletes all numbers associated with a phone number block | HTTP only | `POST /phone_number_blocks/jobs/delete_phone_number_block` | Create or provision an additional resource when the core tasks do not cover this flow. | `phone_number_block_id` |
| Retrieves a phone number blocks job | HTTP only | `GET /phone_number_blocks/jobs/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List sub number orders | HTTP only | `GET /sub_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a sub number order | HTTP only | `GET /sub_number_orders/{sub_number_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `sub_number_order_id` |
| Update a sub number order's requirements | HTTP only | `PATCH /sub_number_orders/{sub_number_order_id}` | Modify an existing resource without recreating it. | `sub_number_order_id` |
| Cancel a sub number order | HTTP only | `PATCH /sub_number_orders/{sub_number_order_id}/cancel` | Modify an existing resource without recreating it. | `sub_number_order_id` |
| Create a sub number orders report | HTTP only | `POST /sub_number_orders_report` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a sub number orders report | HTTP only | `GET /sub_number_orders_report/{report_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `report_id` |
| Download a sub number orders report | HTTP only | `GET /sub_number_orders_report/{report_id}/download` | Fetch the current state before updating, deleting, or making control-flow decisions. | `report_id` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
