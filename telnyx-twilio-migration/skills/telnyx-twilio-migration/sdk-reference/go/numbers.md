<!-- SDK reference: telnyx-numbers-go -->

# Telnyx Numbers - Go

## Core Workflow

### Prerequisites

1. Check country coverage and regulatory requirements
2. For regulated countries (CH, DK, IT, NO, PT, SE): create and fulfill requirement groups before ordering

### Steps

1. **Search available numbers**: `client.AvailablePhoneNumbers.List(ctx, params)`
2. **(Optional) Reserve**: `client.NumberReservations.Create(ctx, params)`
3. **Place order**: `client.NumberOrders.Create(ctx, params)`
4. **Configure for voice**: `client.PhoneNumbers.Voice.Update(ctx, params)`
5. **Configure for SMS**: `client.PhoneNumbers.Messaging.Update(ctx, params)`

### Common mistakes

- NEVER order numbers without a prior search — orders are rejected if numbers don't come from search results
- NEVER rely on reservations for long-term holds — they expire after 30 minutes with no renewal
- NEVER send SMS without assigning the number to a messaging profile — the from number will be rejected
- For SMS: ensure the number has SMS capability (filter during search)

**Related skills**: telnyx-numbers-config-go, telnyx-numbers-compliance-go, telnyx-voice-go, telnyx-messaging-go, telnyx-porting-in-go

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

result, err := client.NumberOrders.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List available phone numbers

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

Key response fields: `response.data.phone_number, response.data.best_effort, response.data.cost_information`

## Create a number order

Creates a phone number order.

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

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number order

Get an existing phone number order.

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

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number reservation

Creates a Phone Number Reservation for multiple numbers.

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

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a number reservation

Gets a single phone number reservation.

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

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Advanced Orders

`client.AdvancedOrders.List()` — `GET /advanced_orders`

```go
	advancedOrders, err := client.AdvancedOrders.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", advancedOrders.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Create Advanced Order

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

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Update Advanced Order

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

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## Get Advanced Order

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

Key response fields: `response.data.id, response.data.status, response.data.area_code`

## List available phone number blocks

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

Key response fields: `response.data.phone_number, response.data.cost_information, response.data.features`

## Retrieve all comments

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

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment

`client.Comments.New()` — `POST /comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CommenterType` | enum (admin, user) | No |  |
| `CommentRecordType` | enum (sub_number_order, requirement_group) | No |  |
| `CommentRecordId` | string (UUID) | No |  |
| ... | | | +6 optional params in the API Details section below |

```go
	comment, err := client.Comments.New(context.Background(), telnyx.CommentNewParams{
		Comment: telnyx.CommentParam{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", comment.Data)
```

Key response fields: `response.data.data`

## Retrieve a comment

`client.Comments.Get()` — `GET /comments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The comment ID. |

```go
	comment, err := client.Comments.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", comment.Data)
```

Key response fields: `response.data.data`

## Mark a comment as read

`client.Comments.MarkAsRead()` — `PATCH /comments/{id}/read`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The comment ID. |

```go
	response, err := client.Comments.MarkAsRead(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.data`

## Get country coverage

`client.CountryCoverage.Get()` — `GET /country_coverage`

```go
	countryCoverage, err := client.CountryCoverage.Get(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", countryCoverage.Data)
```

Key response fields: `response.data.data`

## Get coverage for a specific country

`client.CountryCoverage.GetCountry()` — `GET /country_coverage/countries/{country_code}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes | Country ISO code. |

```go
	response, err := client.CountryCoverage.GetCountry(context.Background(), "US")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.code, response.data.features, response.data.international_sms`

## List customer service records

List customer service records.

`client.CustomerServiceRecords.List()` — `GET /customer_service_records`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Sort` | object | No | Consolidated sort parameter (deepObject style). |

```go
	page, err := client.CustomerServiceRecords.List(context.Background(), telnyx.CustomerServiceRecordListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Create a customer service record

Create a new customer service record for the provided phone number.

`client.CustomerServiceRecords.New()` — `POST /customer_service_records`

```go
	customerServiceRecord, err := client.CustomerServiceRecords.New(context.Background(), telnyx.CustomerServiceRecordNewParams{
		PhoneNumber: "+13035553000",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", customerServiceRecord.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify CSR phone number coverage

Verify the coverage for a list of phone numbers.

`client.CustomerServiceRecords.VerifyPhoneNumberCoverage()` — `POST /customer_service_records/phone_number_coverages`

```go
	response, err := client.CustomerServiceRecords.VerifyPhoneNumberCoverage(context.Background(), telnyx.CustomerServiceRecordVerifyPhoneNumberCoverageParams{
		PhoneNumbers: []string{"+13035553000"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.phone_number, response.data.additional_data_required, response.data.has_csr_coverage`

## Get a customer service record

Get a specific customer service record.

`client.CustomerServiceRecords.Get()` — `GET /customer_service_records/{customer_service_record_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CustomerServiceRecordId` | string (UUID) | Yes | The ID of the customer service record |

```go
	customerServiceRecord, err := client.CustomerServiceRecords.Get(context.Background(), "customer_service_record_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", customerServiceRecord.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List inexplicit number orders

Get a paginated list of inexplicit number orders.

`client.InexplicitNumberOrders.List()` — `GET /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PageNumber` | integer | No | The page number to load |
| `PageSize` | integer | No | The size of the page |

```go
	page, err := client.InexplicitNumberOrders.List(context.Background(), telnyx.InexplicitNumberOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inexplicit number order

Create an inexplicit number order to programmatically purchase phone numbers without specifying exact numbers.

`client.InexplicitNumberOrders.New()` — `POST /inexplicit_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `OrderingGroups` | array[object] | Yes | Group(s) of numbers to order. |
| `ConnectionId` | string (UUID) | No | Connection id to apply to phone numbers that are purchased |
| `MessagingProfileId` | string (UUID) | No | Messaging profile id to apply to phone numbers that are purc... |
| `BillingGroupId` | string (UUID) | No | Billing group id to apply to phone numbers that are purchase... |
| ... | | | +1 optional params in the API Details section below |

```go
	inexplicitNumberOrder, err := client.InexplicitNumberOrders.New(context.Background(), telnyx.InexplicitNumberOrderNewParams{
		OrderingGroups: []telnyx.InexplicitNumberOrderNewParamsOrderingGroup{{
			CountRequested:  "count_requested",
			CountryISO:      "US",
			PhoneNumberType: "phone_number_type",
		}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", inexplicitNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Retrieve an inexplicit number order

Get an existing inexplicit number order by ID.

`client.InexplicitNumberOrders.Get()` — `GET /inexplicit_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the inexplicit number order |

```go
	inexplicitNumberOrder, err := client.InexplicitNumberOrders.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", inexplicitNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.messaging_profile_id`

## Create an inventory coverage request

Creates an inventory coverage request. If locality, npa or national_destination_code is used in groupBy, and no region or locality filters are used, the whole paginated set is returned.

`client.InventoryCoverage.List()` — `GET /inventory_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	inventoryCoverages, err := client.InventoryCoverage.List(context.Background(), telnyx.InventoryCoverageListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", inventoryCoverages.Data)
```

Key response fields: `response.data.administrative_area, response.data.advance_requirements, response.data.count`

## List mobile network operators

Telnyx has a set of GSM mobile operators partners that are available through our mobile network roaming. This resource is entirely managed by Telnyx and may change over time. That means that this resource won't allow any write operations for it.

`client.MobileNetworkOperators.List()` — `GET /mobile_network_operators`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for mobile network operators (... |
| `Page` | object | No | Consolidated pagination parameter (deepObject style). |

```go
	page, err := client.MobileNetworkOperators.List(context.Background(), telnyx.MobileNetworkOperatorListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.country_code`

## List network coverage locations

List all locations and the interfaces that region supports

`client.NetworkCoverage.List()` — `GET /network_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filters` | object | No | Consolidated filters parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.NetworkCoverage.List(context.Background(), telnyx.NetworkCoverageListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.available_services, response.data.location, response.data.record_type`

## List number block orders

Get a paginated list of number block orders.

`client.NumberBlockOrders.List()` — `GET /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.NumberBlockOrders.List(context.Background(), telnyx.NumberBlockOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Create a number block order

Creates a phone number block order.

`client.NumberBlockOrders.New()` — `POST /number_block_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartingNumber` | string | Yes | Starting phone number block |
| `Range` | integer | Yes | The phone number range included in the block. |
| `ConnectionId` | string (UUID) | No | Identifies the connection associated with this phone number. |
| `MessagingProfileId` | string (UUID) | No | Identifies the messaging profile associated with the phone n... |
| `Status` | enum (pending, success, failure) | No | The status of the order. |
| ... | | | +8 optional params in the API Details section below |

```go
	numberBlockOrder, err := client.NumberBlockOrders.New(context.Background(), telnyx.NumberBlockOrderNewParams{
		Range:          10,
		StartingNumber: "+19705555000",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberBlockOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a number block order

Get an existing phone number block order.

`client.NumberBlockOrders.Get()` — `GET /number_block_orders/{number_block_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberBlockOrderId` | string (UUID) | Yes | The number block order ID. |

```go
	numberBlockOrder, err := client.NumberBlockOrders.Get(context.Background(), "number_block_order_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberBlockOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Retrieve a list of phone numbers associated to orders

Get a list of phone numbers associated to orders.

`client.NumberOrderPhoneNumbers.List()` — `GET /number_order_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	numberOrderPhoneNumbers, err := client.NumberOrderPhoneNumbers.List(context.Background(), telnyx.NumberOrderPhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberOrderPhoneNumbers.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a single phone number within a number order.

Get an existing phone number in number order.

`client.NumberOrderPhoneNumbers.Get()` — `GET /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberOrderPhoneNumberId` | string (UUID) | Yes | The number order phone number ID. |

```go
	numberOrderPhoneNumber, err := client.NumberOrderPhoneNumbers.Get(context.Background(), "number_order_phone_number_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberOrderPhoneNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update requirements for a single phone number within a number order.

Updates requirements for a single phone number within a number order.

`client.NumberOrderPhoneNumbers.UpdateRequirements()` — `PATCH /number_order_phone_numbers/{number_order_phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberOrderPhoneNumberId` | string (UUID) | Yes | The number order phone number ID. |
| `RegulatoryRequirements` | array[object] | No |  |

```go
	response, err := client.NumberOrderPhoneNumbers.UpdateRequirements(
		context.Background(),
		"number_order_phone_number_id",
		telnyx.NumberOrderPhoneNumberUpdateRequirementsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List number orders

Get a paginated list of number orders.

`client.NumberOrders.List()` — `GET /number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.NumberOrders.List(context.Background(), telnyx.NumberOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## Update a number order

Updates a phone number order.

`client.NumberOrders.Update()` — `PATCH /number_orders/{number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberOrderId` | string (UUID) | Yes | The number order ID. |
| `RegulatoryRequirements` | array[object] | No |  |
| `CustomerReference` | string | No | A customer reference string for customer look ups. |

```go
	numberOrder, err := client.NumberOrders.Update(
		context.Background(),
		"number_order_id",
		telnyx.NumberOrderUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.connection_id`

## List number reservations

Gets a paginated list of phone number reservations.

`client.NumberReservations.List()` — `GET /number_reservations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.NumberReservations.List(context.Background(), telnyx.NumberReservationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Extend a number reservation

Extends reservation expiry time on all phone numbers.

`client.NumberReservations.Actions.Extend()` — `POST /number_reservations/{number_reservation_id}/actions/extend`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberReservationId` | string (UUID) | Yes | The number reservation ID. |

```go
	response, err := client.NumberReservations.Actions.Extend(context.Background(), "number_reservation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve the features for a list of numbers

`client.NumbersFeatures.New()` — `POST /numbers_features`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes |  |

```go
	numbersFeature, err := client.NumbersFeatures.New(context.Background(), telnyx.NumbersFeatureNewParams{
		PhoneNumbers: []string{"string"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numbersFeature.Data)
```

Key response fields: `response.data.phone_number, response.data.features`

## Lists the phone number blocks jobs

`client.PhoneNumberBlocks.Jobs.List()` — `GET /phone_number_blocks/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.PhoneNumberBlocks.Jobs.List(context.Background(), telnyx.PhoneNumberBlockJobListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes all numbers associated with a phone number block

Creates a new background job to delete all the phone numbers associated with the given block. We will only consider the phone number block as deleted after all phone numbers associated with it are removed, so multiple executions of this job may be necessary in case some of the phone numbers present errors during the deletion process.

`client.PhoneNumberBlocks.Jobs.DeletePhoneNumberBlock()` — `POST /phone_number_blocks/jobs/delete_phone_number_block`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumberBlockId` | string (UUID) | Yes |  |

```go
	response, err := client.PhoneNumberBlocks.Jobs.DeletePhoneNumberBlock(context.Background(), telnyx.PhoneNumberBlockJobDeletePhoneNumberBlockParams{
		PhoneNumberBlockID: "f3946371-7199-4261-9c3d-81a0d7935146",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieves a phone number blocks job

`client.PhoneNumberBlocks.Jobs.Get()` — `GET /phone_number_blocks/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the Phone Number Blocks Job. |

```go
	job, err := client.PhoneNumberBlocks.Jobs.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", job.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List sub number orders

Get a paginated list of sub number orders.

`client.SubNumberOrders.List()` — `GET /sub_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	subNumberOrders, err := client.SubNumberOrders.List(context.Background(), telnyx.SubNumberOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", subNumberOrders.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number order

Get an existing sub number order.

`client.SubNumberOrders.Get()` — `GET /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SubNumberOrderId` | string (UUID) | Yes | The sub number order ID. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	subNumberOrder, err := client.SubNumberOrders.Get(
		context.Background(),
		"sub_number_order_id",
		telnyx.SubNumberOrderGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", subNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a sub number order's requirements

Updates a sub number order.

`client.SubNumberOrders.Update()` — `PATCH /sub_number_orders/{sub_number_order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SubNumberOrderId` | string (UUID) | Yes | The sub number order ID. |
| `RegulatoryRequirements` | array[object] | No |  |

```go
	subNumberOrder, err := client.SubNumberOrders.Update(
		context.Background(),
		"sub_number_order_id",
		telnyx.SubNumberOrderUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", subNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a sub number order

Allows you to cancel a sub number order in 'pending' status.

`client.SubNumberOrders.Cancel()` — `PATCH /sub_number_orders/{sub_number_order_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SubNumberOrderId` | string (UUID) | Yes | The ID of the sub number order. |

```go
	response, err := client.SubNumberOrders.Cancel(context.Background(), "sub_number_order_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a sub number orders report

Create a CSV report for sub number orders. The report will be generated asynchronously and can be downloaded once complete.

`client.SubNumberOrdersReport.New()` — `POST /sub_number_orders_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Status` | enum (pending, success, failure) | No | Filter by order status |
| `OrderRequestId` | string (UUID) | No | Filter by specific order request ID |
| `CountryCode` | string (ISO 3166-1 alpha-2) | No | Filter by country code |
| ... | | | +3 optional params in the API Details section below |

```go
	subNumberOrdersReport, err := client.SubNumberOrdersReport.New(context.Background(), telnyx.SubNumberOrdersReportNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", subNumberOrdersReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a sub number orders report

Get the status and details of a sub number orders report.

`client.SubNumberOrdersReport.Get()` — `GET /sub_number_orders_report/{report_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ReportId` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```go
	subNumberOrdersReport, err := client.SubNumberOrdersReport.Get(context.Background(), "12ade33a-21c0-473b-b055-b3c836e1c293")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", subNumberOrdersReport.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a sub number orders report

Download the CSV file for a completed sub number orders report. The report status must be 'success' before the file can be downloaded.

`client.SubNumberOrdersReport.Download()` — `GET /sub_number_orders_report/{report_id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ReportId` | string (UUID) | Yes | The unique identifier of the sub number orders report |

```go
	response, err := client.SubNumberOrdersReport.Download(context.Background(), "12ade33a-21c0-473b-b055-b3c836e1c293")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```go
// In your webhook handler:
func handleWebhook(w http.ResponseWriter, r *http.Request) {
  body, _ := io.ReadAll(r.Body)
  event, err := client.Webhooks.Unwrap(body, r.Header)
  if err != nil {
    http.Error(w, "Invalid signature", http.StatusBadRequest)
    return
  }
  // Signature valid — event is the parsed webhook payload
  fmt.Println("Received event:", event.Data.EventType)
  w.WriteHeader(http.StatusOK)
}
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `numberOrderStatusUpdate` | `number.order.status.update` | Number Order Status Update |

Webhook payload field definitions are in the API Details section below.

---

# Numbers (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

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
