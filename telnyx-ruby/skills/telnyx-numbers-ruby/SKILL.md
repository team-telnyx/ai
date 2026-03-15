---
name: telnyx-numbers-ruby
description: >-
  Search, order, and manage phone numbers by location, features, and coverage.
metadata:
  author: telnyx
  product: numbers
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers - Ruby

## Core Workflow

### Prerequisites

1. Check country coverage and regulatory requirements
2. For regulated countries (CH, DK, IT, NO, PT, SE): create and fulfill requirement groups before ordering

### Steps

1. **Search available numbers**: `client.available_phone_numbers.list(filter: ...)`
2. **(Optional) Reserve**: `client.number_reservations.create()`
3. **Place order**: `client.number_orders.create(phone_numbers: [...])`
4. **Configure for voice**: `client.phone_numbers.voice.update(id: ..., connection_id: ...)`
5. **Configure for SMS**: `client.phone_numbers.messaging.update(id: ..., messaging_profile_id: ...)`

### Common mistakes

- NEVER order numbers without a prior search — orders are rejected if numbers don't come from search results
- NEVER rely on reservations for long-term holds — they expire after 30 minutes with no renewal
- NEVER send SMS without assigning the number to a messaging profile — the from number will be rejected
- For SMS: ensure the number has SMS capability (filter during search)

**Related skills**: telnyx-numbers-config-ruby, telnyx-numbers-compliance-ruby, telnyx-voice-ruby, telnyx-messaging-ruby, telnyx-porting-in-ruby

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
begin
  result = client.number_orders.create(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List available phone numbers

`client.available_phone_numbers.list()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
available_phone_numbers = client.available_phone_numbers.list

puts(available_phone_numbers)
```

Key response fields: `response.data.phone_number, response.data.best_effort, response.data.cost_information`

## Create a number order

Creates a phone number order.

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

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number order

Get an existing phone number order.

`client.number_orders.retrieve()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_id` | string (UUID) | Yes | The number order ID. |

```ruby
number_order = client.number_orders.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(number_order)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number reservation

Creates a Phone Number Reservation for multiple numbers.

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

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a number reservation

Gets a single phone number reservation.

`client.number_reservations.retrieve()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_reservation_id` | string (UUID) | Yes | The number reservation ID. |

```ruby
number_reservation = client.number_reservations.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(number_reservation)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Advanced Orders

`client.advanced_orders.list()` — `GET /advanced_orders`

```ruby
advanced_orders = client.advanced_orders.list

puts(advanced_orders)
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Create Advanced Order

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

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Update Advanced Order

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

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Get Advanced Order

`client.advanced_orders.retrieve()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | string (UUID) | Yes |  |

```ruby
advanced_order = client.advanced_orders.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(advanced_order)
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## List available phone number blocks

`client.available_phone_number_blocks.list()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
available_phone_number_blocks = client.available_phone_number_blocks.list

puts(available_phone_number_blocks)
```

Key response fields: `response.data.phone_number, response.data.cost_information, response.data.features`

## Retrieve all comments

`client.comments.list()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
comments = client.comments.list

puts(comments)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment

`client.comments.create()` — `POST /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `commenter_type` | enum (admin, user) | No |  |
| `comment_record_type` | enum (sub_number_order, requirement_group) | No |  |
| `comment_record_id` | string (UUID) | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```ruby
comment = client.comments.create

puts(comment)
```

Key response fields: `response.data.data`

## Retrieve a comment

`client.comments.retrieve()` — `GET /comments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The comment ID. |

```ruby
comment = client.comments.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(comment)
```

Key response fields: `response.data.data`

## Mark a comment as read

`client.comments.mark_as_read()` — `PATCH /comments/{id}/read`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The comment ID. |

```ruby
response = client.comments.mark_as_read("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Key response fields: `response.data.data`

## Get country coverage

`client.country_coverage.retrieve()` — `GET /country_coverage`

```ruby
country_coverage = client.country_coverage.retrieve

puts(country_coverage)
```

Key response fields: `response.data.data`

## Get coverage for a specific country

`client.country_coverage.retrieve_country()` — `GET /country_coverage/countries/{country_code}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | Country ISO code. |

```ruby
response = client.country_coverage.retrieve_country("US")

puts(response)
```

Key response fields: `response.data.code, response.data.features, response.data.international_sms`

## List customer service records

List customer service records.

`client.customer_service_records.list()` — `GET /customer_service_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```ruby
page = client.customer_service_records.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Create a customer service record

Create a new customer service record for the provided phone number.

`client.customer_service_records.create()` — `POST /customer_service_records`

```ruby
customer_service_record = client.customer_service_records.create(phone_number: "+13035553000")

puts(customer_service_record)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify CSR phone number coverage

Verify the coverage for a list of phone numbers.

`client.customer_service_records.verify_phone_number_coverage()` — `POST /customer_service_records/phone_number_coverages`

```ruby
response = client.customer_service_records.verify_phone_number_coverage(phone_numbers: ["+13035553000"])

puts(response)
```

Key response fields: `response.data.phone_number, response.data.additional_data_required, response.data.has_csr_coverage`

## Get a customer service record

Get a specific customer service record.

`client.customer_service_records.retrieve()` — `GET /customer_service_records/{customer_service_record_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_service_record_id` | string (UUID) | Yes | The ID of the customer service record |

```ruby
customer_service_record = client.customer_service_records.retrieve("customer_service_record_id")

puts(customer_service_record)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List inexplicit number orders

Get a paginated list of inexplicit number orders.

`client.inexplicit_number_orders.list()` — `GET /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_number` | integer | No | The page number to load |
| `page_size` | integer | No | The size of the page |

```ruby
page = client.inexplicit_number_orders.list

puts(page)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inexplicit number order

Create an inexplicit number order to programmatically purchase phone numbers without specifying exact numbers.

`client.inexplicit_number_orders.create()` — `POST /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ordering_groups` | array[object] | Yes | Group(s) of numbers to order. |
| `connection_id` | string (UUID) | No | Connection id to apply to phone numbers that are purchased |
| `messaging_profile_id` | string (UUID) | No | Messaging profile id to apply to phone numbers that are purc... |
| `billing_group_id` | string (UUID) | No | Billing group id to apply to phone numbers that are purchase... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```ruby
inexplicit_number_order = client.inexplicit_number_orders.create(
  ordering_groups: [{count_requested: "count_requested", country_iso: :US, phone_number_type: "phone_number_type"}]
)

puts(inexplicit_number_order)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Retrieve an inexplicit number order

Get an existing inexplicit number order by ID.

`client.inexplicit_number_orders.retrieve()` — `GET /inexplicit_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the inexplicit number order |

```ruby
inexplicit_number_order = client.inexplicit_number_orders.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(inexplicit_number_order)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inventory coverage request

Creates an inventory coverage request. If locality, npa or national_destination_code is used in groupBy, and no region or locality filters are used, the whole paginated set is returned.

`client.inventory_coverage.list()` — `GET /inventory_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
inventory_coverages = client.inventory_coverage.list

puts(inventory_coverages)
```

Key response fields: `response.data.administrative_area, response.data.advance_requirements, response.data.count`

## List mobile network operators

Telnyx has a set of GSM mobile operators partners that are available through our mobile network roaming. This resource is entirely managed by Telnyx and may change over time. That means that this resource won't allow any write operations for it.

`client.mobile_network_operators.list()` — `GET /mobile_network_operators`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for mobile network operators (... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```ruby
page = client.mobile_network_operators.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.country_code`

## List network coverage locations

List all locations and the interfaces that region supports

`client.network_coverage.list()` — `GET /network_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.network_coverage.list

puts(page)
```

Key response fields: `response.data.available_services, response.data.location, response.data.record_type`

## List number block orders

Get a paginated list of number block orders.

`client.number_block_orders.list()` — `GET /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.number_block_orders.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number block order

Creates a phone number block order.

`client.number_block_orders.create()` — `POST /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `starting_number` | string | Yes | Starting phone number block |
| `range` | integer | Yes | The phone number range included in the block. |
| `connection_id` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `messaging_profile_id` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `status` | enum (pending, success, failure) | No | The status of the order. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```ruby
number_block_order = client.number_block_orders.create(range: 10, starting_number: "+19705555000")

puts(number_block_order)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number block order

Get an existing phone number block order.

`client.number_block_orders.retrieve()` — `GET /number_block_orders/{number_block_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_block_order_id` | string (UUID) | Yes | The number block order ID. |

```ruby
number_block_order = client.number_block_orders.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(number_block_order)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a list of phone numbers associated to orders

Get a list of phone numbers associated to orders.

`client.number_order_phone_numbers.list()` — `GET /number_order_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
number_order_phone_numbers = client.number_order_phone_numbers.list

puts(number_order_phone_numbers)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a single phone number within a number order.

Get an existing phone number in number order.

`client.number_order_phone_numbers.retrieve()` — `GET /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_phone_number_id` | string (UUID) | Yes | The number order phone number ID. |

```ruby
number_order_phone_number = client.number_order_phone_numbers.retrieve("number_order_phone_number_id")

puts(number_order_phone_number)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update requirements for a single phone number within a number order.

Updates requirements for a single phone number within a number order.

`client.number_order_phone_numbers.update_requirements()` — `PATCH /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_phone_number_id` | string (UUID) | Yes | The number order phone number ID. |
| `regulatory_requirements` | array[object] | No |  |

```ruby
response = client.number_order_phone_numbers.update_requirements("number_order_phone_number_id")

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List number orders

Get a paginated list of number orders.

`client.number_orders.list()` — `GET /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.number_orders.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Update a number order

Updates a phone number order.

`client.number_orders.update()` — `PATCH /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_order_id` | string (UUID) | Yes | The number order ID. |
| `regulatory_requirements` | array[object] | No |  |
| `customer_reference` | string | No | A customer reference string for customer look ups. |

```ruby
number_order = client.number_orders.update("550e8400-e29b-41d4-a716-446655440000")

puts(number_order)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## List number reservations

Gets a paginated list of phone number reservations.

`client.number_reservations.list()` — `GET /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.number_reservations.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Extend a number reservation

Extends reservation expiry time on all phone numbers.

`client.number_reservations.actions.extend_()` — `POST /number_reservations/{number_reservation_id}/actions/extend`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_reservation_id` | string (UUID) | Yes | The number reservation ID. |

```ruby
response = client.number_reservations.actions.extend_("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve the features for a list of numbers

`client.numbers_features.create()` — `POST /numbers_features`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |

```ruby
numbers_feature = client.numbers_features.create(phone_numbers: ["string"])

puts(numbers_feature)
```

Key response fields: `response.data.phone_number, response.data.features`

## Lists the phone number blocks jobs

`client.phone_number_blocks.jobs.list()` — `GET /phone_number_blocks/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.phone_number_blocks.jobs.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes all numbers associated with a phone number block

Creates a new background job to delete all the phone numbers associated with the given block. We will only consider the phone number block as deleted after all phone numbers associated with it are removed, so multiple executions of this job may be necessary in case some of the phone numbers present errors during the deletion process.

`client.phone_number_blocks.jobs.delete_phone_number_block()` — `POST /phone_number_blocks/jobs/delete_phone_number_block`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number_block_id` | string (UUID) | Yes |  |

```ruby
response = client.phone_number_blocks.jobs.delete_phone_number_block(
  phone_number_block_id: "f3946371-7199-4261-9c3d-81a0d7935146"
)

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieves a phone number blocks job

`client.phone_number_blocks.jobs.retrieve()` — `GET /phone_number_blocks/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Number Blocks Job. |

```ruby
job = client.phone_number_blocks.jobs.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(job)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List sub number orders

Get a paginated list of sub number orders.

`client.sub_number_orders.list()` — `GET /sub_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
sub_number_orders = client.sub_number_orders.list

puts(sub_number_orders)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number order

Get an existing sub number order.

`client.sub_number_orders.retrieve()` — `GET /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sub_number_order_id` | string (UUID) | Yes | The sub number order ID. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
sub_number_order = client.sub_number_orders.retrieve("sub_number_order_id")

puts(sub_number_order)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a sub number order's requirements

Updates a sub number order.

`client.sub_number_orders.update()` — `PATCH /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sub_number_order_id` | string (UUID) | Yes | The sub number order ID. |
| `regulatory_requirements` | array[object] | No |  |

```ruby
sub_number_order = client.sub_number_orders.update("sub_number_order_id")

puts(sub_number_order)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a sub number order

Allows you to cancel a sub number order in 'pending' status.

`client.sub_number_orders.cancel()` — `PATCH /sub_number_orders/{sub_number_order_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sub_number_order_id` | string (UUID) | Yes | The ID of the sub number order. |

```ruby
response = client.sub_number_orders.cancel("sub_number_order_id")

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a sub number orders report

Create a CSV report for sub number orders. The report will be generated asynchronously and can be downloaded once complete.

`client.sub_number_orders_report.create()` — `POST /sub_number_orders_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (pending, success, failure) | No | Filter by order status |
| `order_request_id` | string (UUID) | No | Filter by specific order request ID |
| `country_code` | string (ISO 3166-1 alpha-2) | No | Filter by country code |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
sub_number_orders_report = client.sub_number_orders_report.create

puts(sub_number_orders_report)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number orders report

Get the status and details of a sub number orders report.

`client.sub_number_orders_report.retrieve()` — `GET /sub_number_orders_report/{report_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `report_id` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```ruby
sub_number_orders_report = client.sub_number_orders_report.retrieve("12ade33a-21c0-473b-b055-b3c836e1c293")

puts(sub_number_orders_report)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a sub number orders report

Download the CSV file for a completed sub number orders report. The report status must be 'success' before the file can be downloaded.

`client.sub_number_orders_report.download()` — `GET /sub_number_orders_report/{report_id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `report_id` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```ruby
response = client.sub_number_orders_report.download("12ade33a-21c0-473b-b055-b3c836e1c293")

puts(response)
```

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```ruby
# In your webhook handler (e.g., Sinatra — use raw body):
post "/webhooks" do
  payload = request.body.read
  headers = {
    "telnyx-signature-ed25519" => request.env["HTTP_TELNYX_SIGNATURE_ED25519"],
    "telnyx-timestamp" => request.env["HTTP_TELNYX_TIMESTAMP"],
  }
  begin
    event = client.webhooks.unwrap(payload, headers)
  rescue => e
    halt 400, "Invalid signature: #{e.message}"
  end
  # Signature valid — event is the parsed webhook payload
  puts "Received event: #{event.data.event_type}"
  status 200
end
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
