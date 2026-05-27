<!-- SDK reference: telnyx-numbers-go -->

# Telnyx Numbers - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

availablePhoneNumbers, err := client.AvailablePhoneNumbers.List(context.Background(), telnyx.AvailablePhoneNumberListParams{})
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas).

## Core Tasks

### Search available phone numbers

Number search is the entrypoint for provisioning. Agents need the search method, key query filters, and the fields returned for candidate numbers.

`client.AvailablePhoneNumbers.List()` — `GET /available_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	availablePhoneNumbers, err := client.AvailablePhoneNumbers.List(context.Background(), telnyx.AvailablePhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", availablePhoneNumbers.Data)
```

Response wrapper:
- items: `availablePhoneNumbers.data`
- pagination: `availablePhoneNumbers.meta`

Primary item fields:
- `PhoneNumber`
- `RecordType`
- `Quickship`
- `Reservable`
- `BestEffort`
- `CostInformation`

### Create a number order

Number ordering is the production provisioning step after number selection.

`client.NumberOrders.New()` — `POST /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[object] | Yes |  |
| `ConnectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `MessagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `BillingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +1 optional params in the API Details section below |

```go
	numberOrder, err := client.NumberOrders.New(context.Background(), telnyx.NumberOrderNewParams{
		PhoneNumbers: []telnyx.NumberOrderNewParamsPhoneNumber{{PhoneNumber: "+18005550101"}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberOrder.Data)
```

Primary response fields:
- `numberOrder.Data.ID`
- `numberOrder.Data.Status`
- `numberOrder.Data.PhoneNumbersCount`
- `numberOrder.Data.RequirementsMet`
- `numberOrder.Data.MessagingProfileID`
- `numberOrder.Data.ConnectionID`

### Check number order status

Order status determines whether provisioning completed or additional requirements are still blocking fulfillment.

`client.NumberOrders.Get()` — `GET /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberOrderId` | string (UUID) | Yes | The number order ID. |

```go
	numberOrder, err := client.NumberOrders.Get(context.Background(), "number_order_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberOrder.Data)
```

Primary response fields:
- `numberOrder.Data.ID`
- `numberOrder.Data.Status`
- `numberOrder.Data.RequirementsMet`
- `numberOrder.Data.PhoneNumbersCount`
- `numberOrder.Data.PhoneNumbers`
- `numberOrder.Data.ConnectionID`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Create a number reservation

Create or provision an additional resource when the core tasks do not cover this flow.

`client.NumberReservations.New()` — `POST /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[object] | Yes |  |
| `Status` | enum (pending, success, failure) | No | The status of the entire reservation. |
| `Id` | string (UUID) | No |  |
| `RecordType` | string | No |  |
| ... | | | +3 optional params in the API Details section below |

```go
	numberReservation, err := client.NumberReservations.New(context.Background(), telnyx.NumberReservationNewParams{
		PhoneNumbers: []telnyx.NumberReservationNewParamsPhoneNumber{{PhoneNumber: "+18005550101"}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberReservation.Data)
```

Primary response fields:
- `numberReservation.Data.ID`
- `numberReservation.Data.Status`
- `numberReservation.Data.CreatedAt`
- `numberReservation.Data.UpdatedAt`
- `numberReservation.Data.CustomerReference`
- `numberReservation.Data.Errors`

### Retrieve a number reservation

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.NumberReservations.Get()` — `GET /number_reservations/{number_reservation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberReservationId` | string (UUID) | Yes | The number reservation ID. |

```go
	numberReservation, err := client.NumberReservations.Get(context.Background(), "number_reservation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberReservation.Data)
```

Primary response fields:
- `numberReservation.Data.ID`
- `numberReservation.Data.Status`
- `numberReservation.Data.CreatedAt`
- `numberReservation.Data.UpdatedAt`
- `numberReservation.Data.CustomerReference`
- `numberReservation.Data.Errors`

### List Advanced Orders

Inspect available resources or choose an existing resource before mutating it.

`client.AdvancedOrders.List()` — `GET /advanced_orders`

```go
	advancedOrders, err := client.AdvancedOrders.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", advancedOrders.Data)
```

Response wrapper:
- items: `advancedOrders.data`

Primary item fields:
- `ID`
- `Status`
- `AreaCode`
- `Comments`
- `CountryCode`
- `CustomerReference`

### Create Advanced Order

Create or provision an additional resource when the core tasks do not cover this flow.

`client.AdvancedOrders.New()` — `POST /advanced_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `RequirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `CountryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in the API Details section below |

```go
	advancedOrder, err := client.AdvancedOrders.New(context.Background(), telnyx.AdvancedOrderNewParams{
		AdvancedOrder: telnyx.AdvancedOrderParam{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", advancedOrder.ID)
```

Primary response fields:
- `advancedOrder.ID`
- `advancedOrder.Status`
- `advancedOrder.AreaCode`
- `advancedOrder.Comments`
- `advancedOrder.CountryCode`
- `advancedOrder.CustomerReference`

### Update Advanced Order

Modify an existing resource without recreating it.

`client.AdvancedOrders.UpdateRequirementGroup()` — `PATCH /advanced_orders/{advanced-order-id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Advanced-order-id` | string (UUID) | Yes |  |
| `PhoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) | No |  |
| `RequirementGroupId` | string (UUID) | No | The ID of the requirement group to associate with this advan... |
| `CountryCode` | string (ISO 3166-1 alpha-2) | No |  |
| ... | | | +5 optional params in the API Details section below |

```go
	response, err := client.AdvancedOrders.UpdateRequirementGroup(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AdvancedOrderUpdateRequirementGroupParams{
			AdvancedOrder: telnyx.AdvancedOrderParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.ID)
```

Primary response fields:
- `response.ID`
- `response.Status`
- `response.AreaCode`
- `response.Comments`
- `response.CountryCode`
- `response.CustomerReference`

### Get Advanced Order

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.AdvancedOrders.Get()` — `GET /advanced_orders/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `OrderId` | string (UUID) | Yes |  |

```go
	advancedOrder, err := client.AdvancedOrders.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", advancedOrder.ID)
```

Primary response fields:
- `advancedOrder.ID`
- `advancedOrder.Status`
- `advancedOrder.AreaCode`
- `advancedOrder.Comments`
- `advancedOrder.CountryCode`
- `advancedOrder.CustomerReference`

### List available phone number blocks

Inspect available resources or choose an existing resource before mutating it.

`client.AvailablePhoneNumberBlocks.List()` — `GET /available_phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	availablePhoneNumberBlocks, err := client.AvailablePhoneNumberBlocks.List(context.Background(), telnyx.AvailablePhoneNumberBlockListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", availablePhoneNumberBlocks.Data)
```

Response wrapper:
- items: `availablePhoneNumberBlocks.data`
- pagination: `availablePhoneNumberBlocks.meta`

Primary item fields:
- `PhoneNumber`
- `CostInformation`
- `Features`
- `Range`
- `RecordType`
- `RegionInformation`

### Retrieve all comments

Inspect available resources or choose an existing resource before mutating it.

`client.Comments.List()` — `GET /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	comments, err := client.Comments.List(context.Background(), telnyx.CommentListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", comments.Data)
```

Response wrapper:
- items: `comments.data`
- pagination: `comments.meta`

Primary item fields:
- `ID`
- `Body`
- `CreatedAt`
- `UpdatedAt`
- `CommentRecordID`
- `CommentRecordType`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a comment | `client.Comments.New()` | `POST /comments` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a comment | `client.Comments.Get()` | `GET /comments/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Mark a comment as read | `client.Comments.MarkAsRead()` | `PATCH /comments/{id}/read` | Modify an existing resource without recreating it. | `Id` |
| Get country coverage | `client.CountryCoverage.Get()` | `GET /country_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get coverage for a specific country | `client.CountryCoverage.GetCountry()` | `GET /country_coverage/countries/{country_code}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CountryCode` |
| List customer service records | `client.CustomerServiceRecords.List()` | `GET /customer_service_records` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a customer service record | `client.CustomerServiceRecords.New()` | `POST /customer_service_records` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Verify CSR phone number coverage | `client.CustomerServiceRecords.VerifyPhoneNumberCoverage()` | `POST /customer_service_records/phone_number_coverages` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Get a customer service record | `client.CustomerServiceRecords.Get()` | `GET /customer_service_records/{customer_service_record_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CustomerServiceRecordId` |
| List inexplicit number orders | `client.InexplicitNumberOrders.List()` | `GET /inexplicit_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an inexplicit number order | `client.InexplicitNumberOrders.New()` | `POST /inexplicit_number_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `OrderingGroups` |
| Retrieve an inexplicit number order | `client.InexplicitNumberOrders.Get()` | `GET /inexplicit_number_orders/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| Create an inventory coverage request | `client.InventoryCoverage.List()` | `GET /inventory_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List mobile network operators | `client.MobileNetworkOperators.List()` | `GET /mobile_network_operators` | Inspect available resources or choose an existing resource before mutating it. | None |
| List network coverage locations | `client.NetworkCoverage.List()` | `GET /network_coverage` | Inspect available resources or choose an existing resource before mutating it. | None |
| List number block orders | `client.NumberBlockOrders.List()` | `GET /number_block_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create a number block order | `client.NumberBlockOrders.New()` | `POST /number_block_orders` | Create or provision an additional resource when the core tasks do not cover this flow. | `StartingNumber`, `Range` |
| Retrieve a number block order | `client.NumberBlockOrders.Get()` | `GET /number_block_orders/{number_block_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `NumberBlockOrderId` |
| Retrieve a list of phone numbers associated to orders | `client.NumberOrderPhoneNumbers.List()` | `GET /number_order_phone_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a single phone number within a number order. | `client.NumberOrderPhoneNumbers.Get()` | `GET /number_order_phone_numbers/{number_order_phone_number_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `NumberOrderPhoneNumberId` |
| Update requirements for a single phone number within a number order. | `client.NumberOrderPhoneNumbers.UpdateRequirements()` | `PATCH /number_order_phone_numbers/{number_order_phone_number_id}` | Modify an existing resource without recreating it. | `NumberOrderPhoneNumberId` |
| List number orders | `client.NumberOrders.List()` | `GET /number_orders` | Create or inspect provisioning orders for number purchases. | None |
| Update a number order | `client.NumberOrders.Update()` | `PATCH /number_orders/{number_order_id}` | Modify an existing resource without recreating it. | `NumberOrderId` |
| List number reservations | `client.NumberReservations.List()` | `GET /number_reservations` | Inspect available resources or choose an existing resource before mutating it. | None |
| Extend a number reservation | `client.NumberReservations.Actions.Extend()` | `POST /number_reservations/{number_reservation_id}/actions/extend` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `NumberReservationId` |
| Retrieve the features for a list of numbers | `client.NumbersFeatures.New()` | `POST /numbers_features` | Create or provision an additional resource when the core tasks do not cover this flow. | `PhoneNumbers` |
| Lists the phone number blocks jobs | `client.PhoneNumberBlocks.Jobs.List()` | `GET /phone_number_blocks/jobs` | Inspect available resources or choose an existing resource before mutating it. | None |
| Deletes all numbers associated with a phone number block | `client.PhoneNumberBlocks.Jobs.DeletePhoneNumberBlock()` | `POST /phone_number_blocks/jobs/delete_phone_number_block` | Create or provision an additional resource when the core tasks do not cover this flow. | `PhoneNumberBlockId` |
| Retrieves a phone number blocks job | `client.PhoneNumberBlocks.Jobs.Get()` | `GET /phone_number_blocks/jobs/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `Id` |
| List sub number orders | `client.SubNumberOrders.List()` | `GET /sub_number_orders` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a sub number order | `client.SubNumberOrders.Get()` | `GET /sub_number_orders/{sub_number_order_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `SubNumberOrderId` |
| Update a sub number order's requirements | `client.SubNumberOrders.Update()` | `PATCH /sub_number_orders/{sub_number_order_id}` | Modify an existing resource without recreating it. | `SubNumberOrderId` |
| Cancel a sub number order | `client.SubNumberOrders.Cancel()` | `PATCH /sub_number_orders/{sub_number_order_id}/cancel` | Modify an existing resource without recreating it. | `SubNumberOrderId` |
| Create a sub number orders report | `client.SubNumberOrdersReport.New()` | `POST /sub_number_orders_report` | Create or provision an additional resource when the core tasks do not cover this flow. | None |
| Retrieve a sub number orders report | `client.SubNumberOrdersReport.Get()` | `GET /sub_number_orders_report/{report_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `ReportId` |
| Download a sub number orders report | `client.SubNumberOrdersReport.Download()` | `GET /sub_number_orders_report/{report_id}/download` | Fetch the current state before updating, deleting, or making control-flow decisions. | `ReportId` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
---

# Numbers (Go) — API Details

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

### Create Advanced Order — `client.AdvancedOrders.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CountryCode` | string (ISO 3166-1 alpha-2) |  |
| `Comments` | string |  |
| `Quantity` | integer |  |
| `AreaCode` | string |  |
| `PhoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) |  |
| `Features` | array[object] |  |
| `CustomerReference` | string |  |
| `RequirementGroupId` | string (UUID) | The ID of the requirement group to associate with this advanced order |

### Update Advanced Order — `client.AdvancedOrders.UpdateRequirementGroup()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CountryCode` | string (ISO 3166-1 alpha-2) |  |
| `Comments` | string |  |
| `Quantity` | integer |  |
| `AreaCode` | string |  |
| `PhoneNumberType` | enum (local, mobile, toll_free, shared_cost, national, ...) |  |
| `Features` | array[object] |  |
| `CustomerReference` | string |  |
| `RequirementGroupId` | string (UUID) | The ID of the requirement group to associate with this advanced order |

### Create a comment — `client.Comments.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) |  |
| `Body` | string |  |
| `Commenter` | string |  |
| `CommenterType` | enum (admin, user) |  |
| `CommentRecordType` | enum (sub_number_order, requirement_group) |  |
| `CommentRecordId` | string (UUID) |  |
| `ReadAt` | string (date-time) | An ISO 8901 datetime string for when the comment was read. |
| `CreatedAt` | string (date-time) | An ISO 8901 datetime string denoting when the comment was created. |
| `UpdatedAt` | string (date-time) | An ISO 8901 datetime string for when the comment was updated. |

### Create an inexplicit number order — `client.InexplicitNumberOrders.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ConnectionId` | string (UUID) | Connection id to apply to phone numbers that are purchased |
| `MessagingProfileId` | string (UUID) | Messaging profile id to apply to phone numbers that are purchased |
| `CustomerReference` | string | Reference label for the customer |
| `BillingGroupId` | string (UUID) | Billing group id to apply to phone numbers that are purchased |

### Create a number block order — `client.NumberBlockOrders.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) |  |
| `RecordType` | string |  |
| `PhoneNumbersCount` | integer | The count of phone numbers in the number order. |
| `ConnectionId` | string (UUID) | Identifies the connection associated with this phone number. |
| `MessagingProfileId` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `Status` | enum (pending, success, failure) | The status of the order. |
| `CustomerReference` | string | A customer reference string for customer look ups. |
| `CreatedAt` | string (date-time) | An ISO 8901 datetime string denoting when the number order was created. |
| `UpdatedAt` | string (date-time) | An ISO 8901 datetime string for when the number order was updated. |
| `RequirementsMet` | boolean | True if all requirements are met for every phone number, false otherwise. |
| `Errors` | string | Errors the reservation could happen upon |

### Update requirements for a single phone number within a number order. — `client.NumberOrderPhoneNumbers.UpdateRequirements()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RegulatoryRequirements` | array[object] |  |

### Create a number order — `client.NumberOrders.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `PhoneNumbers` | array[object] |  |
| `ConnectionId` | string (UUID) | Identifies the connection associated with this phone number. |
| `MessagingProfileId` | string (UUID) | Identifies the messaging profile associated with the phone number. |
| `BillingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |
| `CustomerReference` | string | A customer reference string for customer look ups. |

### Update a number order — `client.NumberOrders.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RegulatoryRequirements` | array[object] |  |
| `CustomerReference` | string | A customer reference string for customer look ups. |

### Create a number reservation — `client.NumberReservations.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) |  |
| `RecordType` | string |  |
| `PhoneNumbers` | array[object] |  |
| `Status` | enum (pending, success, failure) | The status of the entire reservation. |
| `CustomerReference` | string | A customer reference string for customer look ups. |
| `CreatedAt` | string (date-time) | An ISO 8901 datetime string denoting when the numbers reservation was created. |
| `UpdatedAt` | string (date-time) | An ISO 8901 datetime string for when the number reservation was updated. |

### Update a sub number order's requirements — `client.SubNumberOrders.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RegulatoryRequirements` | array[object] |  |

### Create a sub number orders report — `client.SubNumberOrdersReport.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Status` | enum (pending, success, failure) | Filter by order status |
| `CountryCode` | string (ISO 3166-1 alpha-2) | Filter by country code |
| `CreatedAtGt` | string (date-time) | Filter for orders created after this date |
| `CreatedAtLt` | string (date-time) | Filter for orders created before this date |
| `OrderRequestId` | string (UUID) | Filter by specific order request ID |
| `CustomerReference` | string | Filter by customer reference |

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
