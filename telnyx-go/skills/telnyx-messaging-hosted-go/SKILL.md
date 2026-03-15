---
name: telnyx-messaging-hosted-go
description: >-
  Hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging.
metadata:
  author: telnyx
  product: messaging-hosted
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - Go

## Core Workflow

### Prerequisites

1. Host phone numbers on Telnyx by completing the hosted number order process
2. For toll-free: submit toll-free verification request

### Steps

1. **Create hosted number order**: `client.HostedNumberOrders.Create(ctx, params)`
2. **Upload LOA**: `Provide Letter of Authorization for the numbers`
3. **Monitor status**: `client.HostedNumberOrders.Retrieve(ctx, params)`

### Common mistakes

- Hosted numbers remain with the original carrier — Telnyx routes messaging only
- Toll-free verification is required before sending A2P traffic on toll-free numbers

**Related skills**: telnyx-messaging-go, telnyx-messaging-profiles-go

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

result, err := client.HostedNumberOrders.Create(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send an RCS message

`client.Messages.Rcs.Send()` — `POST /messages/rcs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AgentId` | string (UUID) | Yes | RCS Agent ID |
| `To` | string (E.164) | Yes | Phone number in +E.164 format |
| `MessagingProfileId` | string (UUID) | Yes | A valid messaging profile ID |
| `AgentMessage` | object | Yes |  |
| `Type` | enum (RCS) | No | Message type - must be set to "RCS" |
| `WebhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `SmsFallback` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.Messages.Rcs.Send(context.Background(), telnyx.MessageRcSendParams{
		AgentID:            "Agent007",
		AgentMessage:       telnyx.RcsAgentMessageParam{},
		MessagingProfileID: "550e8400-e29b-41d4-a716-446655440000",
		To:                 "+13125551234",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`client.Messages.Rcs.GenerateDeeplink()` — `GET /messages/rcs/deeplinks/{agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AgentId` | string (UUID) | Yes | RCS agent ID |
| `PhoneNumber` | string (E.164) | No | Phone number in E164 format (URL encoded) |
| `Body` | string | No | Pre-filled message body (URL encoded) |

```go
	response, err := client.Messages.Rcs.GenerateDeeplink(
		context.Background(),
		"agent_id",
		telnyx.MessageRcGenerateDeeplinkParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.url`

## List all RCS agents

`client.Messaging.Rcs.Agents.List()` — `GET /messaging/rcs/agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Messaging.Rcs.Agents.List(context.Background(), telnyx.MessagingRcAgentListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Retrieve an RCS agent

`client.Messaging.Rcs.Agents.Get()` — `GET /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | RCS agent ID |

```go
	rcsAgentResponse, err := client.Messaging.Rcs.Agents.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", rcsAgentResponse.Data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Modify an RCS agent

`client.Messaging.Rcs.Agents.Update()` — `PATCH /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | RCS agent ID |
| `WebhookUrl` | string (URL) | No | URL to receive RCS events |
| `WebhookFailoverUrl` | string (URL) | No | Failover URL to receive RCS events |
| `ProfileId` | string (UUID) | No | Messaging profile ID associated with the RCS Agent |

```go
	rcsAgentResponse, err := client.Messaging.Rcs.Agents.Update(
		context.Background(),
		"id",
		telnyx.MessagingRcAgentUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", rcsAgentResponse.Data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Check RCS capabilities (batch)

`client.Messaging.Rcs.ListBulkCapabilities()` — `POST /messaging/rcs/bulk_capabilities`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AgentId` | string (UUID) | Yes | RCS Agent ID |
| `PhoneNumbers` | array[string] | Yes | List of phone numbers to check |

```go
	response, err := client.Messaging.Rcs.ListBulkCapabilities(context.Background(), telnyx.MessagingRcListBulkCapabilitiesParams{
		AgentID:      "TestAgent",
		PhoneNumbers: []string{"+13125551234"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Check RCS capabilities

`client.Messaging.Rcs.GetCapabilities()` — `GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AgentId` | string (UUID) | Yes | RCS agent ID |
| `PhoneNumber` | string (E.164) | Yes | Phone number in E164 format |

```go
	response, err := client.Messaging.Rcs.GetCapabilities(
		context.Background(),
		"phone_number",
		telnyx.MessagingRcGetCapabilitiesParams{
			AgentID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`client.Messaging.Rcs.InviteTestNumber()` — `PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | RCS agent ID |
| `PhoneNumber` | string (E.164) | Yes | Phone number in E164 format to invite for testing |

```go
	response, err := client.Messaging.Rcs.InviteTestNumber(
		context.Background(),
		"phone_number",
		telnyx.MessagingRcInviteTestNumberParams{
			ID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.phone_number, response.data.agent_id`

## List messaging hosted number orders

`client.MessagingHostedNumberOrders.List()` — `GET /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.MessagingHostedNumberOrders.List(context.Background(), telnyx.MessagingHostedNumberOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Create a messaging hosted number order

`client.MessagingHostedNumberOrders.New()` — `POST /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessagingProfileId` | string (UUID) | No | Automatically associate the number with this messaging profi... |
| `PhoneNumbers` | array[string] | No | Phone numbers to be used for hosted messaging. |

```go
	messagingHostedNumberOrder, err := client.MessagingHostedNumberOrders.New(context.Background(), telnyx.MessagingHostedNumberOrderNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingHostedNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Check hosted messaging eligibility

`client.MessagingHostedNumberOrders.CheckEligibility()` — `POST /messaging_hosted_number_orders/eligibility_numbers_check`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes | List of phone numbers to check eligibility |

```go
	response, err := client.MessagingHostedNumberOrders.CheckEligibility(context.Background(), telnyx.MessagingHostedNumberOrderCheckEligibilityParams{
		PhoneNumbers: []string{"string"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.PhoneNumbers)
```

Key response fields: `response.data.phone_numbers`

## Retrieve a messaging hosted number order

`client.MessagingHostedNumberOrders.Get()` — `GET /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	messagingHostedNumberOrder, err := client.MessagingHostedNumberOrders.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingHostedNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`client.MessagingHostedNumberOrders.Delete()` — `DELETE /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the messaging hosted number order to delete. |

```go
	messagingHostedNumberOrder, err := client.MessagingHostedNumberOrders.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingHostedNumberOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Upload hosted number document

`client.MessagingHostedNumberOrders.Actions.UploadFile()` — `POST /messaging_hosted_number_orders/{id}/actions/file_upload`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	response, err := client.MessagingHostedNumberOrders.Actions.UploadFile(
		context.Background(),
		"id",
		telnyx.MessagingHostedNumberOrderActionUploadFileParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order. The verification codes must be created in the verification codes endpoint.

`client.MessagingHostedNumberOrders.ValidateCodes()` — `POST /messaging_hosted_number_orders/{id}/validation_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerificationCodes` | array[object] | Yes |  |
| `Id` | string (UUID) | Yes | Order ID related to the validation codes. |

```go
	response, err := client.MessagingHostedNumberOrders.ValidateCodes(
		context.Background(),
		"id",
		telnyx.MessagingHostedNumberOrderValidateCodesParams{
			VerificationCodes: []telnyx.MessagingHostedNumberOrderValidateCodesParamsVerificationCode{{
				Code:        "code",
				PhoneNumber: "+13125550001",
			}},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.order_id, response.data.phone_numbers`

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order. The verification codes will be sent to the numbers of the hosted order.

`client.MessagingHostedNumberOrders.NewVerificationCodes()` — `POST /messaging_hosted_number_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes |  |
| `VerificationMethod` | enum (sms, call) | Yes |  |
| `Id` | string (UUID) | Yes | Order ID to have a verification code created. |

```go
	response, err := client.MessagingHostedNumberOrders.NewVerificationCodes(
		context.Background(),
		"id",
		telnyx.MessagingHostedNumberOrderNewVerificationCodesParams{
			PhoneNumbers:       []string{"string"},
			VerificationMethod: telnyx.MessagingHostedNumberOrderNewVerificationCodesParamsVerificationMethodSMS,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.phone_number, response.data.type, response.data.error`

## Delete a messaging hosted number

`client.MessagingHostedNumbers.Delete()` — `DELETE /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	messagingHostedNumber, err := client.MessagingHostedNumbers.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingHostedNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`client.MessagingTollfree.Verification.Requests.List()` — `GET /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Status` | enum (Verified, Rejected, Waiting For Vendor, Waiting For Customer, Waiting For Telnyx, ...) | No | Tollfree verification status |
| `DateStart` | string (date-time) | No |  |
| `DateEnd` | string (date-time) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.MessagingTollfree.Verification.Requests.List(context.Background(), telnyx.MessagingTollfreeVerificationRequestListParams{
		Page:     1,
		PageSize: 1,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.records, response.data.total_records`

## Submit Verification Request

Submit a new tollfree verification request

`client.MessagingTollfree.Verification.Requests.New()` — `POST /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BusinessName` | string | Yes | Name of the business; there are no specific formatting requi... |
| `CorporateWebsite` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `BusinessAddr1` | string | Yes | Line 1 of the business address |
| `BusinessCity` | string | Yes | The city of the business address; the first letter should be... |
| `BusinessState` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `BusinessZip` | string | Yes | The ZIP code of the business address |
| `BusinessContactFirstName` | string | Yes | First name of the business contact; there are no specific re... |
| `BusinessContactLastName` | string | Yes | Last name of the business contact; there are no specific req... |
| `BusinessContactEmail` | string | Yes | The email address of the business contact |
| `BusinessContactPhone` | string | Yes | The phone number of the business contact in E.164 format |
| `MessageVolume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `PhoneNumbers` | array[object] | Yes | The phone numbers to request the verification of |
| `UseCase` | object | Yes | Machine-readable use-case for the phone numbers |
| `UseCaseSummary` | string | Yes | Human-readable summary of the desired use-case |
| `ProductionMessageContent` | string | Yes | An example of a message that will be sent from the given pho... |
| `OptInWorkflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `OptInWorkflowImageURLs` | array[object] | Yes | Images showing the opt-in workflow |
| `AdditionalInformation` | string | Yes | Any additional information |
| `BusinessAddr2` | string | No | Line 2 of the business address |
| `IsvReseller` | string | No | ISV name |
| `WebhookUrl` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```go
	verificationRequestEgress, err := client.MessagingTollfree.Verification.Requests.New(context.Background(), telnyx.MessagingTollfreeVerificationRequestNewParams{
		TfVerificationRequest: telnyx.TfVerificationRequestParam{
			AdditionalInformation: "Additional context for this request.",
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
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verificationRequestEgress.ID)
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Get Verification Request

Get a single verification request by its ID.

`client.MessagingTollfree.Verification.Requests.Get()` — `GET /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	verificationRequestStatus, err := client.MessagingTollfree.Verification.Requests.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verificationRequestStatus.ID)
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Update Verification Request

Update an existing tollfree verification request. This is particularly useful when there are pending customer actions to be taken.

`client.MessagingTollfree.Verification.Requests.Update()` — `PATCH /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BusinessName` | string | Yes | Name of the business; there are no specific formatting requi... |
| `CorporateWebsite` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `BusinessAddr1` | string | Yes | Line 1 of the business address |
| `BusinessCity` | string | Yes | The city of the business address; the first letter should be... |
| `BusinessState` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `BusinessZip` | string | Yes | The ZIP code of the business address |
| `BusinessContactFirstName` | string | Yes | First name of the business contact; there are no specific re... |
| `BusinessContactLastName` | string | Yes | Last name of the business contact; there are no specific req... |
| `BusinessContactEmail` | string | Yes | The email address of the business contact |
| `BusinessContactPhone` | string | Yes | The phone number of the business contact in E.164 format |
| `MessageVolume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `PhoneNumbers` | array[object] | Yes | The phone numbers to request the verification of |
| `UseCase` | object | Yes | Machine-readable use-case for the phone numbers |
| `UseCaseSummary` | string | Yes | Human-readable summary of the desired use-case |
| `ProductionMessageContent` | string | Yes | An example of a message that will be sent from the given pho... |
| `OptInWorkflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `OptInWorkflowImageURLs` | array[object] | Yes | Images showing the opt-in workflow |
| `AdditionalInformation` | string | Yes | Any additional information |
| `Id` | string (UUID) | Yes |  |
| `BusinessAddr2` | string | No | Line 2 of the business address |
| `IsvReseller` | string | No | ISV name |
| `WebhookUrl` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```go
	verificationRequestEgress, err := client.MessagingTollfree.Verification.Requests.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingTollfreeVerificationRequestUpdateParams{
			TfVerificationRequest: telnyx.TfVerificationRequestParam{
				AdditionalInformation: "Additional context for this request.",
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
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verificationRequestEgress.ID)
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state. * `HTTP 200`: request successfully deleted
* `HTTP 400`: request exists but can't be deleted (i.e. not rejected)
* `HTTP 404`: request unknown or already deleted

`client.MessagingTollfree.Verification.Requests.Delete()` — `DELETE /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	err := client.MessagingTollfree.Verification.Requests.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Get Verification Request Status History

Get the history of status changes for a verification request. Returns a paginated list of historical status changes including the reason for each change and when it occurred.

`client.MessagingTollfree.Verification.Requests.GetStatusHistory()` — `GET /messaging_tollfree/verification/requests/{id}/status_history`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	response, err := client.MessagingTollfree.Verification.Requests.GetStatusHistory(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.MessagingTollfreeVerificationRequestGetStatusHistoryParams{
			PageNumber: 1,
			PageSize:   1,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Records)
```

Key response fields: `response.data.records, response.data.total_records`

## List messaging URL domains

`client.MessagingURLDomains.List()` — `GET /messaging_url_domains`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.MessagingURLDomains.List(context.Background(), telnyx.MessagingURLDomainListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.record_type, response.data.url_domain`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
