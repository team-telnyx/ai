---
name: telnyx-porting-in-go
description: >-
  Port phone numbers into Telnyx. Check portability, create port orders, upload
  LOA documents, and track porting status. This skill provides Go SDK examples.
metadata:
  author: telnyx
  product: porting-in
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting In - Go

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

## Run a portability check

Runs a portability check, returning the results immediately.

`POST /portability_checks`

Optional: `phone_numbers` (array[string])

```go
	response, err := client.PortabilityChecks.Run(context.TODO(), telnyx.PortabilityCheckRunParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all porting events

Returns a list of all porting events.

`GET /porting/events`

```go
	page, err := client.Porting.Events.List(context.TODO(), telnyx.PortingEventListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Show a porting event

Show a specific porting event.

`GET /porting/events/{id}`

```go
	event, err := client.Porting.Events.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", event.Data)
```

## Republish a porting event

Republish a specific porting event.

`POST /porting/events/{id}/republish`

```go
	err := client.Porting.Events.Republish(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`POST /porting/loa_configuration/preview`

```go
	response, err := client.Porting.LoaConfigurations.Preview0(context.TODO(), telnyx.PortingLoaConfigurationPreview0Params{
		Address: telnyx.PortingLoaConfigurationPreview0ParamsAddress{
			City:          "Austin",
			CountryCode:   "US",
			State:         "TX",
			StreetAddress: "600 Congress Avenue",
			ZipCode:       "78701",
		},
		CompanyName: "Telnyx",
		Contact: telnyx.PortingLoaConfigurationPreview0ParamsContact{
			Email:       "testing@telnyx.com",
			PhoneNumber: "+12003270001",
		},
		Logo: telnyx.PortingLoaConfigurationPreview0ParamsLogo{
			DocumentID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
		Name: "My LOA Configuration",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## List LOA configurations

List the LOA configurations.

`GET /porting/loa_configurations`

```go
	page, err := client.Porting.LoaConfigurations.List(context.TODO(), telnyx.PortingLoaConfigurationListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a LOA configuration

Create a LOA configuration.

`POST /porting/loa_configurations`

```go
	loaConfiguration, err := client.Porting.LoaConfigurations.New(context.TODO(), telnyx.PortingLoaConfigurationNewParams{
		Address: telnyx.PortingLoaConfigurationNewParamsAddress{
			City:          "Austin",
			CountryCode:   "US",
			State:         "TX",
			StreetAddress: "600 Congress Avenue",
			ZipCode:       "78701",
		},
		CompanyName: "Telnyx",
		Contact: telnyx.PortingLoaConfigurationNewParamsContact{
			Email:       "testing@telnyx.com",
			PhoneNumber: "+12003270001",
		},
		Logo: telnyx.PortingLoaConfigurationNewParamsLogo{
			DocumentID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
		Name: "My LOA Configuration",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", loaConfiguration.Data)
```

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`GET /porting/loa_configurations/{id}`

```go
	loaConfiguration, err := client.Porting.LoaConfigurations.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", loaConfiguration.Data)
```

## Update a LOA configuration

Update a specific LOA configuration.

`PATCH /porting/loa_configurations/{id}`

```go
	loaConfiguration, err := client.Porting.LoaConfigurations.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingLoaConfigurationUpdateParams{
			Address: telnyx.PortingLoaConfigurationUpdateParamsAddress{
				City:          "Austin",
				CountryCode:   "US",
				State:         "TX",
				StreetAddress: "600 Congress Avenue",
				ZipCode:       "78701",
			},
			CompanyName: "Telnyx",
			Contact: telnyx.PortingLoaConfigurationUpdateParamsContact{
				Email:       "testing@telnyx.com",
				PhoneNumber: "+12003270001",
			},
			Logo: telnyx.PortingLoaConfigurationUpdateParamsLogo{
				DocumentID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			},
			Name: "My LOA Configuration",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", loaConfiguration.Data)
```

## Delete a LOA configuration

Delete a specific LOA configuration.

`DELETE /porting/loa_configurations/{id}`

```go
	err := client.Porting.LoaConfigurations.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`GET /porting/loa_configurations/{id}/preview`

```go
	response, err := client.Porting.LoaConfigurations.Preview1(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## List porting related reports

List the reports generated about porting operations.

`GET /porting/reports`

```go
	page, err := client.Porting.Reports.List(context.TODO(), telnyx.PortingReportListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a porting related report

Generate reports about porting operations.

`POST /porting/reports`

```go
	report, err := client.Porting.Reports.New(context.TODO(), telnyx.PortingReportNewParams{
		Params: telnyx.ExportPortingOrdersCsvReportParam{
			Filters: telnyx.ExportPortingOrdersCsvReportFiltersParam{},
		},
		ReportType: telnyx.PortingReportNewParamsReportTypeExportPortingOrdersCsv,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", report.Data)
```

## Retrieve a report

Retrieve a specific report generated.

`GET /porting/reports/{id}`

```go
	report, err := client.Porting.Reports.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", report.Data)
```

## List available carriers in the UK

List available carriers in the UK.

`GET /porting/uk_carriers`

```go
	response, err := client.Porting.ListUkCarriers(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all porting orders

Returns a list of your porting order.

`GET /porting_orders`

```go
	page, err := client.PortingOrders.List(context.TODO(), telnyx.PortingOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a porting order

Creates a new porting order object.

`POST /porting_orders` — Required: `phone_numbers`

Optional: `customer_group_reference` (string), `customer_reference` (['string', 'null'])

```go
	portingOrder, err := client.PortingOrders.New(context.TODO(), telnyx.PortingOrderNewParams{
		PhoneNumbers: []string{"+13035550000", "+13035550001", "+13035550002"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", portingOrder.Data)
```

## List all exception types

Returns a list of all possible exception types for a porting order.

`GET /porting_orders/exception_types`

```go
	response, err := client.PortingOrders.GetExceptionTypes(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all phone number configurations

Returns a list of phone number configurations paginated.

`GET /porting_orders/phone_number_configurations`

```go
	page, err := client.PortingOrders.PhoneNumberConfigurations.List(context.TODO(), telnyx.PortingOrderPhoneNumberConfigurationListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a list of phone number configurations

Creates a list of phone number configurations.

`POST /porting_orders/phone_number_configurations`

```go
	phoneNumberConfiguration, err := client.PortingOrders.PhoneNumberConfigurations.New(context.TODO(), telnyx.PortingOrderPhoneNumberConfigurationNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberConfiguration.Data)
```

## Retrieve a porting order

Retrieves the details of an existing porting order.

`GET /porting_orders/{id}`

```go
	portingOrder, err := client.PortingOrders.Get(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderGetParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", portingOrder.Data)
```

## Edit a porting order

Edits the details of an existing porting order.

`PATCH /porting_orders/{id}`

Optional: `activation_settings` (object), `customer_group_reference` (string), `customer_reference` (string), `documents` (object), `end_user` (object), `messaging` (object), `misc` (object), `phone_number_configuration` (object), `requirement_group_id` (uuid), `requirements` (array[object]), `user_feedback` (object), `webhook_url` (uri)

```go
	portingOrder, err := client.PortingOrders.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", portingOrder.Data)
```

## Delete a porting order

Deletes an existing porting order.

`DELETE /porting_orders/{id}`

```go
	err := client.PortingOrders.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously.

`POST /porting_orders/{id}/actions/activate`

```go
	response, err := client.PortingOrders.Actions.Activate(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Cancel a porting order

`POST /porting_orders/{id}/actions/cancel`

```go
	response, err := client.PortingOrders.Actions.Cancel(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Submit a porting order.

Confirm and submit your porting order.

`POST /porting_orders/{id}/actions/confirm`

```go
	response, err := client.PortingOrders.Actions.Confirm(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Share a porting order

Creates a sharing token for a porting order.

`POST /porting_orders/{id}/actions/share`

```go
	response, err := client.PortingOrders.Actions.Share(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActionShareParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all porting activation jobs

Returns a list of your porting activation jobs.

`GET /porting_orders/{id}/activation_jobs`

```go
	page, err := client.PortingOrders.ActivationJobs.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActivationJobListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve a porting activation job

Returns a porting activation job.

`GET /porting_orders/{id}/activation_jobs/{activationJobId}`

```go
	activationJob, err := client.PortingOrders.ActivationJobs.Get(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActivationJobGetParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", activationJob.Data)
```

## Update a porting activation job

Updates the activation time of a porting activation job.

`PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

```go
	activationJob, err := client.PortingOrders.ActivationJobs.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderActivationJobUpdateParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", activationJob.Data)
```

## List additional documents

Returns a list of additional documents for a porting order.

`GET /porting_orders/{id}/additional_documents`

```go
	page, err := client.PortingOrders.AdditionalDocuments.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAdditionalDocumentListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`POST /porting_orders/{id}/additional_documents`

```go
	additionalDocument, err := client.PortingOrders.AdditionalDocuments.New(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAdditionalDocumentNewParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", additionalDocument.Data)
```

## Delete an additional document

Deletes an additional document for a porting order.

`DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

```go
	err := client.PortingOrders.AdditionalDocuments.Delete(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAdditionalDocumentDeleteParams{
			ID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`GET /porting_orders/{id}/allowed_foc_windows`

```go
	response, err := client.PortingOrders.GetAllowedFocWindows(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all comments of a porting order

Returns a list of all comments of a porting order.

`GET /porting_orders/{id}/comments`

```go
	page, err := client.PortingOrders.Comments.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderCommentListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a comment for a porting order

Creates a new comment for a porting order.

`POST /porting_orders/{id}/comments`

Optional: `body` (string)

```go
	comment, err := client.PortingOrders.Comments.New(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderCommentNewParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", comment.Data)
```

## Download a porting order loa template

`GET /porting_orders/{id}/loa_template`

```go
	response, err := client.PortingOrders.GetLoaTemplate(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderGetLoaTemplateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## List porting order requirements

Returns a list of all requirements based on country/number type for this porting order.

`GET /porting_orders/{id}/requirements`

```go
	page, err := client.PortingOrders.GetRequirements(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderGetRequirementsParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve the associated V1 sub_request_id and port_request_id

`GET /porting_orders/{id}/sub_request`

```go
	response, err := client.PortingOrders.GetSubRequest(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List verification codes

Returns a list of verification codes for a porting order.

`GET /porting_orders/{id}/verification_codes`

```go
	page, err := client.PortingOrders.VerificationCodes.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderVerificationCodeListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Send the verification codes

Send the verification code for all porting phone numbers.

`POST /porting_orders/{id}/verification_codes/send`

```go
	err := client.PortingOrders.VerificationCodes.Send(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderVerificationCodeSendParams{},
	)
	if err != nil {
		panic(err.Error())
	}
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`POST /porting_orders/{id}/verification_codes/verify`

```go
	response, err := client.PortingOrders.VerificationCodes.Verify(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderVerificationCodeVerifyParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`GET /porting_orders/{porting_order_id}/action_requirements`

```go
	page, err := client.PortingOrders.ActionRequirements.List(
		context.TODO(),
		"porting_order_id",
		telnyx.PortingOrderActionRequirementListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

```go
	response, err := client.PortingOrders.ActionRequirements.Initiate(
		context.TODO(),
		"id",
		telnyx.PortingOrderActionRequirementInitiateParams{
			PortingOrderID: "porting_order_id",
			Params: telnyx.PortingOrderActionRequirementInitiateParamsParams{
				FirstName: "John",
				LastName:  "Doe",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order.

`GET /porting_orders/{porting_order_id}/associated_phone_numbers`

```go
	page, err := client.PortingOrders.AssociatedPhoneNumbers.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAssociatedPhoneNumberListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an associated phone number

Creates a new associated phone number for a porting order.

`POST /porting_orders/{porting_order_id}/associated_phone_numbers`

```go
	associatedPhoneNumber, err := client.PortingOrders.AssociatedPhoneNumbers.New(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAssociatedPhoneNumberNewParams{
			Action:           telnyx.PortingOrderAssociatedPhoneNumberNewParamsActionKeep,
			PhoneNumberRange: telnyx.PortingOrderAssociatedPhoneNumberNewParamsPhoneNumberRange{},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", associatedPhoneNumber.Data)
```

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

```go
	associatedPhoneNumber, err := client.PortingOrders.AssociatedPhoneNumbers.Delete(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderAssociatedPhoneNumberDeleteParams{
			PortingOrderID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", associatedPhoneNumber.Data)
```

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`GET /porting_orders/{porting_order_id}/phone_number_blocks`

```go
	page, err := client.PortingOrders.PhoneNumberBlocks.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberBlockListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a phone number block

Creates a new phone number block.

`POST /porting_orders/{porting_order_id}/phone_number_blocks`

```go
	phoneNumberBlock, err := client.PortingOrders.PhoneNumberBlocks.New(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberBlockNewParams{
			ActivationRanges: []telnyx.PortingOrderPhoneNumberBlockNewParamsActivationRange{{
				EndAt:   "+4930244999910",
				StartAt: "+4930244999901",
			}},
			PhoneNumberRange: telnyx.PortingOrderPhoneNumberBlockNewParamsPhoneNumberRange{
				EndAt:   "+4930244999910",
				StartAt: "+4930244999901",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberBlock.Data)
```

## Delete a phone number block

Deletes a phone number block.

`DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

```go
	phoneNumberBlock, err := client.PortingOrders.PhoneNumberBlocks.Delete(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberBlockDeleteParams{
			PortingOrderID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberBlock.Data)
```

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`GET /porting_orders/{porting_order_id}/phone_number_extensions`

```go
	page, err := client.PortingOrders.PhoneNumberExtensions.List(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberExtensionListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a phone number extension

Creates a new phone number extension.

`POST /porting_orders/{porting_order_id}/phone_number_extensions`

```go
	phoneNumberExtension, err := client.PortingOrders.PhoneNumberExtensions.New(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberExtensionNewParams{
			ActivationRanges: []telnyx.PortingOrderPhoneNumberExtensionNewParamsActivationRange{{
				EndAt:   10,
				StartAt: 1,
			}},
			ExtensionRange: telnyx.PortingOrderPhoneNumberExtensionNewParamsExtensionRange{
				EndAt:   10,
				StartAt: 1,
			},
			PortingPhoneNumberID: "f24151b6-3389-41d3-8747-7dd8c681e5e2",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberExtension.Data)
```

## Delete a phone number extension

Deletes a phone number extension.

`DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

```go
	phoneNumberExtension, err := client.PortingOrders.PhoneNumberExtensions.Delete(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.PortingOrderPhoneNumberExtensionDeleteParams{
			PortingOrderID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberExtension.Data)
```

## List all porting phone numbers

Returns a list of your porting phone numbers.

`GET /porting_phone_numbers`

```go
	page, err := client.PortingPhoneNumbers.List(context.TODO(), telnyx.PortingPhoneNumberListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```
