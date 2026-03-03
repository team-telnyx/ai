---
name: telnyx-messaging-hosted-go
description: >-
  Set up hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging features. This skill provides Go
  SDK examples.
metadata:
  author: telnyx
  product: messaging-hosted
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - Go

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

## Send an RCS message

`POST /messages/rcs` — Required: `agent_id`, `to`, `messaging_profile_id`, `agent_message`

Optional: `mms_fallback` (object), `sms_fallback` (object), `type` (enum), `webhook_url` (url)

```go
	response, err := client.Messages.Rcs.Send(context.TODO(), telnyx.MessageRcSendParams{
		AgentID:            "Agent007",
		AgentMessage:       telnyx.RcsAgentMessageParam{},
		MessagingProfileID: "messaging_profile_id",
		To:                 "+13125551234",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`GET /messages/rcs/deeplinks/{agent_id}`

```go
	response, err := client.Messages.Rcs.GenerateDeeplink(
		context.TODO(),
		"agent_id",
		telnyx.MessageRcGenerateDeeplinkParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all RCS agents

`GET /messaging/rcs/agents`

```go
	page, err := client.Messaging.Rcs.Agents.List(context.TODO(), telnyx.MessagingRcAgentListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve an RCS agent

`GET /messaging/rcs/agents/{id}`

```go
	rcsAgentResponse, err := client.Messaging.Rcs.Agents.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", rcsAgentResponse.Data)
```

## Modify an RCS agent

`PATCH /messaging/rcs/agents/{id}`

Optional: `profile_id` (uuid), `webhook_failover_url` (url), `webhook_url` (url)

```go
	rcsAgentResponse, err := client.Messaging.Rcs.Agents.Update(
		context.TODO(),
		"id",
		telnyx.MessagingRcAgentUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", rcsAgentResponse.Data)
```

## Check RCS capabilities (batch)

`POST /messaging/rcs/bulk_capabilities` — Required: `agent_id`, `phone_numbers`

```go
	response, err := client.Messaging.Rcs.ListBulkCapabilities(context.TODO(), telnyx.MessagingRcListBulkCapabilitiesParams{
		AgentID:      "TestAgent",
		PhoneNumbers: []string{"+13125551234"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Check RCS capabilities

`GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

```go
	response, err := client.Messaging.Rcs.GetCapabilities(
		context.TODO(),
		"phone_number",
		telnyx.MessagingRcGetCapabilitiesParams{
			AgentID: "agent_id",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

```go
	response, err := client.Messaging.Rcs.InviteTestNumber(
		context.TODO(),
		"phone_number",
		telnyx.MessagingRcInviteTestNumberParams{
			ID: "id",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List messaging hosted number orders

`GET /messaging_hosted_number_orders`

```go
	page, err := client.MessagingHostedNumberOrders.List(context.TODO(), telnyx.MessagingHostedNumberOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a messaging hosted number order

`POST /messaging_hosted_number_orders`

Optional: `messaging_profile_id` (string), `phone_numbers` (array[string])

```go
	messagingHostedNumberOrder, err := client.MessagingHostedNumberOrders.New(context.TODO(), telnyx.MessagingHostedNumberOrderNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingHostedNumberOrder.Data)
```

## Check hosted messaging eligibility

`POST /messaging_hosted_number_orders/eligibility_numbers_check` — Required: `phone_numbers`

```go
	response, err := client.MessagingHostedNumberOrders.CheckEligibility(context.TODO(), telnyx.MessagingHostedNumberOrderCheckEligibilityParams{
		PhoneNumbers: []string{"string"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.PhoneNumbers)
```

## Retrieve a messaging hosted number order

`GET /messaging_hosted_number_orders/{id}`

```go
	messagingHostedNumberOrder, err := client.MessagingHostedNumberOrders.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingHostedNumberOrder.Data)
```

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`DELETE /messaging_hosted_number_orders/{id}`

```go
	messagingHostedNumberOrder, err := client.MessagingHostedNumberOrders.Delete(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingHostedNumberOrder.Data)
```

## Upload hosted number document

`POST /messaging_hosted_number_orders/{id}/actions/file_upload`

```go
	response, err := client.MessagingHostedNumberOrders.Actions.UploadFile(
		context.TODO(),
		"id",
		telnyx.MessagingHostedNumberOrderActionUploadFileParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/validation_codes` — Required: `verification_codes`

```go
	response, err := client.MessagingHostedNumberOrders.ValidateCodes(
		context.TODO(),
		"id",
		telnyx.MessagingHostedNumberOrderValidateCodesParams{
			VerificationCodes: []telnyx.MessagingHostedNumberOrderValidateCodesParamsVerificationCode{{
				Code:        "code",
				PhoneNumber: "phone_number",
			}},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/verification_codes` — Required: `phone_numbers`, `verification_method`

```go
	response, err := client.MessagingHostedNumberOrders.NewVerificationCodes(
		context.TODO(),
		"id",
		telnyx.MessagingHostedNumberOrderNewVerificationCodesParams{
			PhoneNumbers:       []string{"string"},
			VerificationMethod: telnyx.MessagingHostedNumberOrderNewVerificationCodesParamsVerificationMethodSMS,
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Delete a messaging hosted number

`DELETE /messaging_hosted_numbers/{id}`

```go
	messagingHostedNumber, err := client.MessagingHostedNumbers.Delete(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messagingHostedNumber.Data)
```

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`GET /messaging_tollfree/verification/requests`

```go
	page, err := client.MessagingTollfree.Verification.Requests.List(context.TODO(), telnyx.MessagingTollfreeVerificationRequestListParams{
		Page:     1,
		PageSize: 1,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Submit Verification Request

Submit a new tollfree verification request

`POST /messaging_tollfree/verification/requests` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

```go
	verificationRequestEgress, err := client.MessagingTollfree.Verification.Requests.New(context.TODO(), telnyx.MessagingTollfreeVerificationRequestNewParams{
		TfVerificationRequest: telnyx.TfVerificationRequestParam{
			AdditionalInformation:    "additionalInformation",
			BusinessAddr1:            "600 Congress Avenue",
			BusinessCity:             "Austin",
			BusinessContactEmail:     "email@example.com",
			BusinessContactFirstName: "John",
			BusinessContactLastName:  "Doe",
			BusinessContactPhone:     "+18005550100",
			BusinessName:             "Telnyx LLC",
			BusinessState:            "Texas",
			BusinessZip:              "78701",
			CorporateWebsite:         "http://example.com",
			MessageVolume:            telnyx.VolumeV100000,
			OptInWorkflow:            "User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
			OptInWorkflowImageURLs: []telnyx.URLParam{{
				URL: "https://telnyx.com/sign-up",
			}, {
				URL: "https://telnyx.com/company/data-privacy",
			}},
			PhoneNumbers: []telnyx.TfPhoneNumberParam{{
				PhoneNumber: "+18773554398",
			}, {
				PhoneNumber: "+18773554399",
			}},
			ProductionMessageContent: "Your Telnyx OTP is XXXX",
			UseCase:                  telnyx.UseCaseCategoriesTwoFa,
			UseCaseSummary:           "This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal",
		},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", verificationRequestEgress.ID)
```

## Get Verification Request

Get a single verification request by its ID.

`GET /messaging_tollfree/verification/requests/{id}`

```go
	verificationRequestStatus, err := client.MessagingTollfree.Verification.Requests.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", verificationRequestStatus.ID)
```

## Update Verification Request

Update an existing tollfree verification request.

`PATCH /messaging_tollfree/verification/requests/{id}` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

```go
	verificationRequestEgress, err := client.MessagingTollfree.Verification.Requests.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingTollfreeVerificationRequestUpdateParams{
			TfVerificationRequest: telnyx.TfVerificationRequestParam{
				AdditionalInformation:    "additionalInformation",
				BusinessAddr1:            "600 Congress Avenue",
				BusinessCity:             "Austin",
				BusinessContactEmail:     "email@example.com",
				BusinessContactFirstName: "John",
				BusinessContactLastName:  "Doe",
				BusinessContactPhone:     "+18005550100",
				BusinessName:             "Telnyx LLC",
				BusinessState:            "Texas",
				BusinessZip:              "78701",
				CorporateWebsite:         "http://example.com",
				MessageVolume:            telnyx.VolumeV100000,
				OptInWorkflow:            "User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
				OptInWorkflowImageURLs: []telnyx.URLParam{{
					URL: "https://telnyx.com/sign-up",
				}, {
					URL: "https://telnyx.com/company/data-privacy",
				}},
				PhoneNumbers: []telnyx.TfPhoneNumberParam{{
					PhoneNumber: "+18773554398",
				}, {
					PhoneNumber: "+18773554399",
				}},
				ProductionMessageContent: "Your Telnyx OTP is XXXX",
				UseCase:                  telnyx.UseCaseCategoriesTwoFa,
				UseCaseSummary:           "This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", verificationRequestEgress.ID)
```

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state.

`DELETE /messaging_tollfree/verification/requests/{id}`

```go
	err := client.MessagingTollfree.Verification.Requests.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## Get Verification Request Status History

Get the history of status changes for a verification request.

`GET /messaging_tollfree/verification/requests/{id}/status_history`

```go
	response, err := client.MessagingTollfree.Verification.Requests.GetStatusHistory(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingTollfreeVerificationRequestGetStatusHistoryParams{
			PageNumber: 1,
			PageSize:   1,
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Records)
```

## List messaging URL domains

`GET /messaging_url_domains`

```go
	page, err := client.MessagingURLDomains.List(context.TODO(), telnyx.MessagingURLDomainListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```
