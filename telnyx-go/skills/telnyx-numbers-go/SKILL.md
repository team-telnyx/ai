---
name: telnyx-numbers-go
description: >-
  Search for available phone numbers by location and features, check coverage,
  and place orders. Use when acquiring new phone numbers. This skill provides Go
  SDK examples.
metadata:
  author: telnyx
  product: numbers
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

## List Advanced Orders

`GET /advanced_orders`

```go
	advancedOrders, err := client.AdvancedOrders.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", advancedOrders.Data)
```

## Create Advanced Order

`POST /advanced_orders`

Optional: `area_code` (string), `comments` (string), `country_code` (string), `customer_reference` (string), `features` (array[object]), `phone_number_type` (enum), `quantity` (integer), `requirement_group_id` (uuid)

```go
	advancedOrder, err := client.AdvancedOrders.New(context.TODO(), telnyx.AdvancedOrderNewParams{
		AdvancedOrder: telnyx.AdvancedOrderParam{},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", advancedOrder.ID)
```

## Update Advanced Order

`PATCH /advanced_orders/{advanced-order-id}/requirement_group`

Optional: `area_code` (string), `comments` (string), `country_code` (string), `customer_reference` (string), `features` (array[object]), `phone_number_type` (enum), `quantity` (integer), `requirement_group_id` (uuid)

```go
	response, err := client.AdvancedOrders.UpdateRequirementGroup(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AdvancedOrderUpdateRequirementGroupParams{
			AdvancedOrder: telnyx.AdvancedOrderParam{},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.ID)
```

## Get Advanced Order

`GET /advanced_orders/{order_id}`

```go
	advancedOrder, err := client.AdvancedOrders.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", advancedOrder.ID)
```

## List available phone number blocks

`GET /available_phone_number_blocks`

```go
	availablePhoneNumberBlocks, err := client.AvailablePhoneNumberBlocks.List(context.TODO(), telnyx.AvailablePhoneNumberBlockListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", availablePhoneNumberBlocks.Data)
```

## List available phone numbers

`GET /available_phone_numbers`

```go
	availablePhoneNumbers, err := client.AvailablePhoneNumbers.List(context.TODO(), telnyx.AvailablePhoneNumberListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", availablePhoneNumbers.Data)
```

## Retrieve all comments

`GET /comments`

```go
	comments, err := client.Comments.List(context.TODO(), telnyx.CommentListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", comments.Data)
```

## Create a comment

`POST /comments`

Optional: `body` (string), `comment_record_id` (uuid), `comment_record_type` (enum), `commenter` (string), `commenter_type` (enum), `created_at` (date-time), `id` (uuid), `read_at` (date-time), `updated_at` (date-time)

```go
	comment, err := client.Comments.New(context.TODO(), telnyx.CommentNewParams{
		Comment: telnyx.CommentParam{},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", comment.Data)
```

## Retrieve a comment

`GET /comments/{id}`

```go
	comment, err := client.Comments.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", comment.Data)
```

## Mark a comment as read

`PATCH /comments/{id}/read`

```go
	response, err := client.Comments.MarkAsRead(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get country coverage

`GET /country_coverage`

```go
	countryCoverage, err := client.CountryCoverage.Get(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", countryCoverage.Data)
```

## Get coverage for a specific country

`GET /country_coverage/countries/{country_code}`

```go
	response, err := client.CountryCoverage.GetCountry(context.TODO(), "US")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List customer service records

List customer service records.

`GET /customer_service_records`

```go
	page, err := client.CustomerServiceRecords.List(context.TODO(), telnyx.CustomerServiceRecordListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a customer service record

Create a new customer service record for the provided phone number.

`POST /customer_service_records`

```go
	customerServiceRecord, err := client.CustomerServiceRecords.New(context.TODO(), telnyx.CustomerServiceRecordNewParams{
		PhoneNumber: "+13035553000",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", customerServiceRecord.Data)
```

## Verify CSR phone number coverage

Verify the coverage for a list of phone numbers.

`POST /customer_service_records/phone_number_coverages`

```go
	response, err := client.CustomerServiceRecords.VerifyPhoneNumberCoverage(context.TODO(), telnyx.CustomerServiceRecordVerifyPhoneNumberCoverageParams{
		PhoneNumbers: []string{"+13035553000"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get a customer service record

Get a specific customer service record.

`GET /customer_service_records/{customer_service_record_id}`

```go
	customerServiceRecord, err := client.CustomerServiceRecords.Get(context.TODO(), "customer_service_record_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", customerServiceRecord.Data)
```

## List inexplicit number orders

Get a paginated list of inexplicit number orders.

`GET /inexplicit_number_orders`

```go
	page, err := client.InexplicitNumberOrders.List(context.TODO(), telnyx.InexplicitNumberOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an inexplicit number order

Create an inexplicit number order to programmatically purchase phone numbers without specifying exact numbers.

`POST /inexplicit_number_orders` — Required: `ordering_groups`

Optional: `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `messaging_profile_id` (string)

```go
	inexplicitNumberOrder, err := client.InexplicitNumberOrders.New(context.TODO(), telnyx.InexplicitNumberOrderNewParams{
		OrderingGroups: []telnyx.InexplicitNumberOrderNewParamsOrderingGroup{{
			CountRequested:  "count_requested",
			CountryISO:      "US",
			PhoneNumberType: "phone_number_type",
		}},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", inexplicitNumberOrder.Data)
```

## Retrieve an inexplicit number order

Get an existing inexplicit number order by ID.

`GET /inexplicit_number_orders/{id}`

```go
	inexplicitNumberOrder, err := client.InexplicitNumberOrders.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", inexplicitNumberOrder.Data)
```

## Create an inventory coverage request

Creates an inventory coverage request.

`GET /inventory_coverage`

```go
	inventoryCoverages, err := client.InventoryCoverage.List(context.TODO(), telnyx.InventoryCoverageListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", inventoryCoverages.Data)
```

## List mobile network operators

Telnyx has a set of GSM mobile operators partners that are available through our mobile network roaming.

`GET /mobile_network_operators`

```go
	page, err := client.MobileNetworkOperators.List(context.TODO(), telnyx.MobileNetworkOperatorListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## List network coverage locations

List all locations and the interfaces that region supports

`GET /network_coverage`

```go
	page, err := client.NetworkCoverage.List(context.TODO(), telnyx.NetworkCoverageListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## List number block orders

Get a paginated list of number block orders.

`GET /number_block_orders`

```go
	page, err := client.NumberBlockOrders.List(context.TODO(), telnyx.NumberBlockOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a number block order

Creates a phone number block order.

`POST /number_block_orders` — Required: `starting_number`, `range`

Optional: `connection_id` (string), `created_at` (date-time), `customer_reference` (string), `errors` (string), `id` (uuid), `messaging_profile_id` (string), `phone_numbers_count` (integer), `record_type` (string), `requirements_met` (boolean), `status` (enum), `updated_at` (date-time)

```go
	numberBlockOrder, err := client.NumberBlockOrders.New(context.TODO(), telnyx.NumberBlockOrderNewParams{
		Range:          10,
		StartingNumber: "+19705555000",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberBlockOrder.Data)
```

## Retrieve a number block order

Get an existing phone number block order.

`GET /number_block_orders/{number_block_order_id}`

```go
	numberBlockOrder, err := client.NumberBlockOrders.Get(context.TODO(), "number_block_order_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberBlockOrder.Data)
```

## Retrieve a list of phone numbers associated to orders

Get a list of phone numbers associated to orders.

`GET /number_order_phone_numbers`

```go
	numberOrderPhoneNumbers, err := client.NumberOrderPhoneNumbers.List(context.TODO(), telnyx.NumberOrderPhoneNumberListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberOrderPhoneNumbers.Data)
```

## Retrieve a single phone number within a number order.

Get an existing phone number in number order.

`GET /number_order_phone_numbers/{number_order_phone_number_id}`

```go
	numberOrderPhoneNumber, err := client.NumberOrderPhoneNumbers.Get(context.TODO(), "number_order_phone_number_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberOrderPhoneNumber.Data)
```

## Update requirements for a single phone number within a number order.

Updates requirements for a single phone number within a number order.

`PATCH /number_order_phone_numbers/{number_order_phone_number_id}`

Optional: `regulatory_requirements` (array[object])

```go
	response, err := client.NumberOrderPhoneNumbers.UpdateRequirements(
		context.TODO(),
		"number_order_phone_number_id",
		telnyx.NumberOrderPhoneNumberUpdateRequirementsParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List number orders

Get a paginated list of number orders.

`GET /number_orders`

```go
	page, err := client.NumberOrders.List(context.TODO(), telnyx.NumberOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a number order

Creates a phone number order.

`POST /number_orders`

Optional: `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `messaging_profile_id` (string), `phone_numbers` (array[object])

```go
	numberOrder, err := client.NumberOrders.New(context.TODO(), telnyx.NumberOrderNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberOrder.Data)
```

## Retrieve a number order

Get an existing phone number order.

`GET /number_orders/{number_order_id}`

```go
	numberOrder, err := client.NumberOrders.Get(context.TODO(), "number_order_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberOrder.Data)
```

## Update a number order

Updates a phone number order.

`PATCH /number_orders/{number_order_id}`

Optional: `customer_reference` (string), `regulatory_requirements` (array[object])

```go
	numberOrder, err := client.NumberOrders.Update(
		context.TODO(),
		"number_order_id",
		telnyx.NumberOrderUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberOrder.Data)
```

## List number reservations

Gets a paginated list of phone number reservations.

`GET /number_reservations`

```go
	page, err := client.NumberReservations.List(context.TODO(), telnyx.NumberReservationListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a number reservation

Creates a Phone Number Reservation for multiple numbers.

`POST /number_reservations`

Optional: `created_at` (date-time), `customer_reference` (string), `id` (uuid), `phone_numbers` (array[object]), `record_type` (string), `status` (enum), `updated_at` (date-time)

```go
	numberReservation, err := client.NumberReservations.New(context.TODO(), telnyx.NumberReservationNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberReservation.Data)
```

## Retrieve a number reservation

Gets a single phone number reservation.

`GET /number_reservations/{number_reservation_id}`

```go
	numberReservation, err := client.NumberReservations.Get(context.TODO(), "number_reservation_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numberReservation.Data)
```

## Extend a number reservation

Extends reservation expiry time on all phone numbers.

`POST /number_reservations/{number_reservation_id}/actions/extend`

```go
	response, err := client.NumberReservations.Actions.Extend(context.TODO(), "number_reservation_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Retrieve the features for a list of numbers

`POST /numbers_features` — Required: `phone_numbers`

```go
	numbersFeature, err := client.NumbersFeatures.New(context.TODO(), telnyx.NumbersFeatureNewParams{
		PhoneNumbers: []string{"string"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", numbersFeature.Data)
```

## Lists the phone number blocks jobs

`GET /phone_number_blocks/jobs`

```go
	page, err := client.PhoneNumberBlocks.Jobs.List(context.TODO(), telnyx.PhoneNumberBlockJobListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Deletes all numbers associated with a phone number block

Creates a new background job to delete all the phone numbers associated with the given block.

`POST /phone_number_blocks/jobs/delete_phone_number_block` — Required: `phone_number_block_id`

```go
	response, err := client.PhoneNumberBlocks.Jobs.DeletePhoneNumberBlock(context.TODO(), telnyx.PhoneNumberBlockJobDeletePhoneNumberBlockParams{
		PhoneNumberBlockID: "f3946371-7199-4261-9c3d-81a0d7935146",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Retrieves a phone number blocks job

`GET /phone_number_blocks/jobs/{id}`

```go
	job, err := client.PhoneNumberBlocks.Jobs.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", job.Data)
```

## List sub number orders

Get a paginated list of sub number orders.

`GET /sub_number_orders`

```go
	subNumberOrders, err := client.SubNumberOrders.List(context.TODO(), telnyx.SubNumberOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", subNumberOrders.Data)
```

## Retrieve a sub number order

Get an existing sub number order.

`GET /sub_number_orders/{sub_number_order_id}`

```go
	subNumberOrder, err := client.SubNumberOrders.Get(
		context.TODO(),
		"sub_number_order_id",
		telnyx.SubNumberOrderGetParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", subNumberOrder.Data)
```

## Update a sub number order's requirements

Updates a sub number order.

`PATCH /sub_number_orders/{sub_number_order_id}`

Optional: `regulatory_requirements` (array[object])

```go
	subNumberOrder, err := client.SubNumberOrders.Update(
		context.TODO(),
		"sub_number_order_id",
		telnyx.SubNumberOrderUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", subNumberOrder.Data)
```

## Cancel a sub number order

Allows you to cancel a sub number order in 'pending' status.

`PATCH /sub_number_orders/{sub_number_order_id}/cancel`

```go
	response, err := client.SubNumberOrders.Cancel(context.TODO(), "sub_number_order_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Create a sub number orders report

Create a CSV report for sub number orders.

`POST /sub_number_orders_report`

Optional: `country_code` (string), `created_at_gt` (date-time), `created_at_lt` (date-time), `customer_reference` (string), `order_request_id` (uuid), `status` (enum)

```go
	subNumberOrdersReport, err := client.SubNumberOrdersReport.New(context.TODO(), telnyx.SubNumberOrdersReportNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", subNumberOrdersReport.Data)
```

## Retrieve a sub number orders report

Get the status and details of a sub number orders report.

`GET /sub_number_orders_report/{report_id}`

```go
	subNumberOrdersReport, err := client.SubNumberOrdersReport.Get(context.TODO(), "12ade33a-21c0-473b-b055-b3c836e1c293")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", subNumberOrdersReport.Data)
```

## Download a sub number orders report

Download the CSV file for a completed sub number orders report.

`GET /sub_number_orders_report/{report_id}/download`

```go
	response, err := client.SubNumberOrdersReport.Download(context.TODO(), "12ade33a-21c0-473b-b055-b3c836e1c293")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

---

## Webhooks

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for verification (Standard Webhooks compatible).

| Event | Description |
|-------|-------------|
| `numberOrderStatusUpdate` | Number Order Status Update |

### Webhook payload fields

**`numberOrderStatusUpdate`**

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
| `data.payload.status` | enum | The status of the order. |
| `data.payload.customer_reference` | string | A customer reference string for customer look ups. |
| `data.payload.created_at` | date-time | An ISO 8901 datetime string denoting when the number order was created. |
| `data.payload.updated_at` | date-time | An ISO 8901 datetime string for when the number order was updated. |
| `data.payload.requirements_met` | boolean | True if all requirements are met for every phone number, false otherwise. |
| `data.record_type` | string | Type of record |
| `meta.attempt` | integer | Webhook delivery attempt number |
| `meta.delivered_to` | uri | URL where the webhook was delivered |
