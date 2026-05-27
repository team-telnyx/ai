<!-- SDK reference: telnyx-10dlc-go -->

# Telnyx 10DLC - Go

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

telnyxBrand, err := client.Messaging10dlc.Brand.New(context.Background(), telnyx.Messaging10dlcBrandNewParams{
		Country:     "US",
		DisplayName: "ABC Mobile",
		Email: "support@example.com",
		EntityType:  telnyx.EntityTypePrivateProfit,
		Vertical:    telnyx.VerticalTechnology,
	})
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

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

## Operational Caveats

- 10DLC is sequential: create the brand first, then submit the campaign, then attach messaging infrastructure such as the messaging profile.
- Registration calls are not enough by themselves. Messaging cannot use the campaign until the assignment step completes successfully.
- Treat registration status fields as part of the control flow. Do not assume the campaign is send-ready until the returned status fields confirm it.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](#webhook-payload-fields).

## Core Tasks

### Create a brand

Brand registration is the entrypoint for any US A2P 10DLC campaign flow.

`client.Messaging10dlc.Brand.New()` — `POST /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EntityType` | object | Yes | Entity type behind the brand. |
| `DisplayName` | string | Yes | Display name, marketing name, or DBA name of the brand. |
| `Country` | string | Yes | ISO2 2 characters country code. |
| `Email` | string | Yes | Valid email address of brand support contact. |
| `Vertical` | object | Yes | Vertical or industry segment of the brand. |
| `CompanyName` | string | No | (Required for Non-profit/private/public) Legal company name. |
| `FirstName` | string | No | First name of business contact. |
| `LastName` | string | No | Last name of business contact. |
| ... | | | +16 optional params in the API Details section below |

```go
	telnyxBrand, err := client.Messaging10dlc.Brand.New(context.Background(), telnyx.Messaging10dlcBrandNewParams{
		Country:     "US",
		DisplayName: "ABC Mobile",
		Email: "support@example.com",
		EntityType:  telnyx.EntityTypePrivateProfit,
		Vertical:    telnyx.VerticalTechnology,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxBrand.IdentityStatus)
```

Primary response fields:
- `telnyxBrand.BrandID`
- `telnyxBrand.IdentityStatus`
- `telnyxBrand.Status`
- `telnyxBrand.DisplayName`
- `telnyxBrand.State`
- `telnyxBrand.AltBusinessID`

### Submit a campaign

Campaign submission is the compliance-critical step that determines whether traffic can be provisioned.

`client.Messaging10dlc.CampaignBuilder.Submit()` — `POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `Description` | string | Yes | Summary description of this campaign. |
| `Usecase` | string | Yes | Campaign usecase. |
| `AgeGated` | boolean | No | Age gated message content in campaign. |
| `AutoRenewal` | boolean | No | Campaign subscription auto-renewal option. |
| `DirectLending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in the API Details section below |

```go
	telnyxCampaignCsp, err := client.Messaging10dlc.CampaignBuilder.Submit(context.Background(), telnyx.Messaging10dlcCampaignBuilderSubmitParams{
		BrandID: "BXXXXXX",
		Description: "Two-factor authentication messages",
		Usecase: "2FA",
		SampleMessages: []string{"Your verification code is {{code}}"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxCampaignCsp.BrandID)
```

Primary response fields:
- `telnyxCampaignCsp.CampaignID`
- `telnyxCampaignCsp.BrandID`
- `telnyxCampaignCsp.CampaignStatus`
- `telnyxCampaignCsp.SubmissionStatus`
- `telnyxCampaignCsp.FailureReasons`
- `telnyxCampaignCsp.Status`

### Assign a messaging profile to a campaign

Messaging profile assignment is the practical handoff from registration to send-ready messaging infrastructure.

`client.Messaging10dlc.PhoneNumberAssignmentByProfile.Assign()` — `POST /10dlc/phoneNumberAssignmentByProfile`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessagingProfileId` | string (UUID) | Yes | The ID of the messaging profile that you want to link to the... |
| `CampaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified mes... |
| `TcrCampaignId` | string (UUID) | No | The TCR ID of the shared campaign you want to link to the sp... |

```go
	response, err := client.Messaging10dlc.PhoneNumberAssignmentByProfile.Assign(context.Background(), telnyx.Messaging10dlcPhoneNumberAssignmentByProfileAssignParams{
		MessagingProfileID: "4001767e-ce0f-4cae-9d5f-0d5e636e7809",
		CampaignID: telnyx.String("CXXX001"),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.MessagingProfileID)
```

Primary response fields:
- `response.MessagingProfileID`
- `response.CampaignID`
- `response.TaskID`
- `response.TCRCampaignID`

---

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

## Webhooks

These webhook payload fields are inline because they are part of the primary integration path.

### Campaign Status Update

| Field | Type | Description |
|-------|------|-------------|
| `brandId` | string | Brand ID associated with the campaign. |
| `campaignId` | string | The ID of the campaign. |
| `createDate` | string | Unix timestamp when campaign was created. |
| `cspId` | string | Alphanumeric identifier of the CSP associated with this campaign. |
| `isTMobileRegistered` | boolean | Indicates whether the campaign is registered with T-Mobile. |
| `type` | enum: TELNYX_EVENT, REGISTRATION, MNO_REVIEW, TELNYX_REVIEW, NUMBER_POOL_PROVISIONED, NUMBER_POOL_DEPROVISIONED, TCR_EVENT, VERIFIED |  |
| `description` | string | Description of the event. |
| `status` | enum: ACCEPTED, REJECTED, DORMANT, success, failed | The status of the campaign. |

If you need webhook fields that are not listed inline here, read [the webhook payload reference](#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Get Brand

Inspect the current state of an existing brand registration.

`client.Messaging10dlc.Brand.Get()` — `GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes |  |

```go
	brand, err := client.Messaging10dlc.Brand.Get(context.Background(), "brandId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", brand)
```

Primary response fields:
- `brand.Status`
- `brand.State`
- `brand.AltBusinessID`
- `brand.AltBusinessIDType`
- `brand.AssignedCampaignsCount`
- `brand.BrandID`

### Qualify By Usecase

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.Messaging10dlc.CampaignBuilder.Brand.QualifyByUsecase()` — `GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Usecase` | string | Yes |  |
| `BrandId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.CampaignBuilder.Brand.QualifyByUsecase(
		context.Background(),
		"usecase",
		telnyx.Messaging10dlcCampaignBuilderBrandQualifyByUsecaseParams{
			BrandID: "BXXX001",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AnnualFee)
```

Primary response fields:
- `response.AnnualFee`
- `response.MaxSubUsecases`
- `response.MinSubUsecases`
- `response.MNOMetadata`
- `response.MonthlyFee`
- `response.QuarterlyFee`

### Create New Phone Number Campaign

Create or provision an additional resource when the core tasks do not cover this flow.

`client.Messaging10dlc.PhoneNumberCampaigns.New()` — `POST /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `CampaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.New(context.Background(), telnyx.Messaging10dlcPhoneNumberCampaignNewParams{
		PhoneNumberCampaignCreate: telnyx.PhoneNumberCampaignCreateParam{
			CampaignID:  "4b300178-131c-d902-d54e-72d90ba1620j",
			PhoneNumber: "+18005550199",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

Primary response fields:
- `phoneNumberCampaign.AssignmentStatus`
- `phoneNumberCampaign.BrandID`
- `phoneNumberCampaign.CampaignID`
- `phoneNumberCampaign.CreatedAt`
- `phoneNumberCampaign.FailureReasons`
- `phoneNumberCampaign.PhoneNumber`

### Get campaign

Inspect the current state of an existing campaign registration.

`client.Messaging10dlc.Campaign.Get()` — `GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |

```go
	telnyxCampaignCsp, err := client.Messaging10dlc.Campaign.Get(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxCampaignCsp.BrandID)
```

Primary response fields:
- `telnyxCampaignCsp.Status`
- `telnyxCampaignCsp.AgeGated`
- `telnyxCampaignCsp.AutoRenewal`
- `telnyxCampaignCsp.BilledDate`
- `telnyxCampaignCsp.BrandDisplayName`
- `telnyxCampaignCsp.BrandID`

### List Brands

Inspect available resources or choose an existing resource before mutating it.

`client.Messaging10dlc.Brand.List()` — `GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `Page` | integer | No |  |
| `RecordsPerPage` | integer | No | number of records per page. |
| ... | | | +6 optional params in the API Details section below |

```go
	page, err := client.Messaging10dlc.Brand.List(context.Background(), telnyx.Messaging10dlcBrandListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Primary response fields:
- `page.Page`
- `page.Records`
- `page.TotalRecords`

### Get Brand Feedback By Id

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.Messaging10dlc.Brand.GetFeedback()` — `GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.Brand.GetFeedback(context.Background(), "brandId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.BrandID)
```

Primary response fields:
- `response.BrandID`
- `response.Category`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Get Brand SMS OTP Status | `client.Messaging10dlc.Brand.GetSMSOtpByReference()` | `GET /10dlc/brand/smsOtp/{referenceId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `ReferenceId` |
| Update Brand | `client.Messaging10dlc.Brand.Update()` | `PUT /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `EntityType`, `DisplayName`, `Country`, `Email`, +2 more |
| Delete Brand | `client.Messaging10dlc.Brand.Delete()` | `DELETE /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `BrandId` |
| Resend brand 2FA email | `client.Messaging10dlc.Brand.Resend2faEmail()` | `POST /10dlc/brand/{brandId}/2faEmail` | Create or provision an additional resource when the core tasks do not cover this flow. | `BrandId` |
| List External Vettings | `client.Messaging10dlc.Brand.ExternalVetting.List()` | `GET /10dlc/brand/{brandId}/externalVetting` | Fetch the current state before updating, deleting, or making control-flow decisions. | `BrandId` |
| Order Brand External Vetting | `client.Messaging10dlc.Brand.ExternalVetting.Order()` | `POST /10dlc/brand/{brandId}/externalVetting` | Create or provision an additional resource when the core tasks do not cover this flow. | `EvpId`, `VettingClass`, `BrandId` |
| Import External Vetting Record | `client.Messaging10dlc.Brand.ExternalVetting.Imports()` | `PUT /10dlc/brand/{brandId}/externalVetting` | Modify an existing resource without recreating it. | `EvpId`, `VettingId`, `BrandId` |
| Revet Brand | `client.Messaging10dlc.Brand.Revet()` | `PUT /10dlc/brand/{brandId}/revet` | Modify an existing resource without recreating it. | `BrandId` |
| Get Brand SMS OTP Status by Brand ID | `client.Messaging10dlc.Brand.GetSMSOtpStatus()` | `GET /10dlc/brand/{brandId}/smsOtp` | Fetch the current state before updating, deleting, or making control-flow decisions. | `BrandId` |
| Trigger Brand SMS OTP | `client.Messaging10dlc.Brand.TriggerSMSOtp()` | `POST /10dlc/brand/{brandId}/smsOtp` | Create or provision an additional resource when the core tasks do not cover this flow. | `PinSms`, `SuccessSms`, `BrandId` |
| Verify Brand SMS OTP | `client.Messaging10dlc.Brand.VerifySMSOtp()` | `PUT /10dlc/brand/{brandId}/smsOtp` | Modify an existing resource without recreating it. | `OtpPin`, `BrandId` |
| List Campaigns | `client.Messaging10dlc.Campaign.List()` | `GET /10dlc/campaign` | Inspect available resources or choose an existing resource before mutating it. | None |
| Accept Shared Campaign | `client.Messaging10dlc.Campaign.AcceptSharing()` | `POST /10dlc/campaign/acceptSharing/{campaignId}` | Create or provision an additional resource when the core tasks do not cover this flow. | `CampaignId` |
| Get Campaign Cost | `client.Messaging10dlc.Campaign.Usecase.GetCost()` | `GET /10dlc/campaign/usecase/cost` | Inspect available resources or choose an existing resource before mutating it. | None |
| Update campaign | `client.Messaging10dlc.Campaign.Update()` | `PUT /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `CampaignId` |
| Deactivate campaign | `client.Messaging10dlc.Campaign.Deactivate()` | `DELETE /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `CampaignId` |
| Submit campaign appeal for manual review | `client.Messaging10dlc.Campaign.SubmitAppeal()` | `POST /10dlc/campaign/{campaignId}/appeal` | Create or provision an additional resource when the core tasks do not cover this flow. | `AppealReason`, `CampaignId` |
| Get Campaign Mno Metadata | `client.Messaging10dlc.Campaign.GetMnoMetadata()` | `GET /10dlc/campaign/{campaignId}/mnoMetadata` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CampaignId` |
| Get campaign operation status | `client.Messaging10dlc.Campaign.GetOperationStatus()` | `GET /10dlc/campaign/{campaignId}/operationStatus` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CampaignId` |
| Get OSR campaign attributes | `client.Messaging10dlc.Campaign.Osr.GetAttributes()` | `GET /10dlc/campaign/{campaignId}/osr/attributes` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CampaignId` |
| Get Sharing Status | `client.Messaging10dlc.Campaign.GetSharingStatus()` | `GET /10dlc/campaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CampaignId` |
| List shared partner campaigns | `client.Messaging10dlc.PartnerCampaigns.ListSharedByMe()` | `GET /10dlc/partnerCampaign/sharedByMe` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Sharing Status | `client.Messaging10dlc.PartnerCampaigns.GetSharingStatus()` | `GET /10dlc/partnerCampaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CampaignId` |
| List Shared Campaigns | `client.Messaging10dlc.PartnerCampaigns.List()` | `GET /10dlc/partner_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Shared Campaign | `client.Messaging10dlc.PartnerCampaigns.Get()` | `GET /10dlc/partner_campaigns/{campaignId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `CampaignId` |
| Update Single Shared Campaign | `client.Messaging10dlc.PartnerCampaigns.Update()` | `PATCH /10dlc/partner_campaigns/{campaignId}` | Modify an existing resource without recreating it. | `CampaignId` |
| Get Assignment Task Status | `client.Messaging10dlc.PhoneNumberAssignmentByProfile.GetStatus()` | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `TaskId` |
| Get Phone Number Status | `client.Messaging10dlc.PhoneNumberAssignmentByProfile.ListPhoneNumberStatus()` | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers` | Fetch the current state before updating, deleting, or making control-flow decisions. | `TaskId` |
| List phone number campaigns | `client.Messaging10dlc.PhoneNumberCampaigns.List()` | `GET /10dlc/phone_number_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Phone Number Campaign | `client.Messaging10dlc.PhoneNumberCampaigns.Get()` | `GET /10dlc/phone_number_campaigns/{phoneNumber}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `PhoneNumber` |
| Create New Phone Number Campaign | `client.Messaging10dlc.PhoneNumberCampaigns.Update()` | `PUT /10dlc/phone_number_campaigns/{phoneNumber}` | Modify an existing resource without recreating it. | `PhoneNumber`, `CampaignId`, `PhoneNumber` |
| Delete Phone Number Campaign | `client.Messaging10dlc.PhoneNumberCampaigns.Delete()` | `DELETE /10dlc/phone_number_campaigns/{phoneNumber}` | Remove, detach, or clean up an existing resource. | `PhoneNumber` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
---

# 10DLC (Go) — API Details

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List Brands, List Campaigns, List shared partner campaigns, List Shared Campaigns, List phone number campaigns

| Field | Type |
|-------|------|
| `page` | integer |
| `records` | array[object] |
| `totalRecords` | integer |

**Returned by:** Create Brand, Update Brand, Revet Brand

| Field | Type |
|-------|------|
| `altBusinessId` | string |
| `altBusinessIdType` | enum: NONE, DUNS, GIIN, LEI |
| `brandId` | string |
| `brandRelationship` | object |
| `businessContactEmail` | string |
| `city` | string |
| `companyName` | string |
| `country` | string |
| `createdAt` | string |
| `cspId` | string |
| `displayName` | string |
| `ein` | string |
| `email` | string |
| `entityType` | object |
| `failureReasons` | string |
| `firstName` | string |
| `identityStatus` | enum: VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED |
| `ipAddress` | string |
| `isReseller` | boolean |
| `lastName` | string |
| `mobilePhone` | string |
| `mock` | boolean |
| `optionalAttributes` | object |
| `phone` | string |
| `postalCode` | string |
| `referenceId` | string |
| `state` | string |
| `status` | enum: OK, REGISTRATION_PENDING, REGISTRATION_FAILED |
| `stockExchange` | object |
| `stockSymbol` | string |
| `street` | string |
| `tcrBrandId` | string |
| `universalEin` | string |
| `updatedAt` | string |
| `vertical` | string |
| `webhookFailoverURL` | string |
| `webhookURL` | string |
| `website` | string |

**Returned by:** Get Brand Feedback By Id

| Field | Type |
|-------|------|
| `brandId` | string |
| `category` | array[object] |

**Returned by:** Get Brand SMS OTP Status, Get Brand SMS OTP Status by Brand ID

| Field | Type |
|-------|------|
| `brandId` | string |
| `deliveryStatus` | string |
| `deliveryStatusDate` | date-time |
| `deliveryStatusDetails` | string |
| `mobilePhone` | string |
| `referenceId` | string |
| `requestDate` | date-time |
| `verifyDate` | date-time |

**Returned by:** Get Brand

| Field | Type |
|-------|------|
| `altBusinessId` | string |
| `altBusinessIdType` | enum: NONE, DUNS, GIIN, LEI |
| `assignedCampaignsCount` | number |
| `brandId` | string |
| `brandRelationship` | object |
| `businessContactEmail` | string |
| `city` | string |
| `companyName` | string |
| `country` | string |
| `createdAt` | string |
| `cspId` | string |
| `displayName` | string |
| `ein` | string |
| `email` | string |
| `entityType` | object |
| `failureReasons` | string |
| `firstName` | string |
| `identityStatus` | enum: VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED |
| `ipAddress` | string |
| `isReseller` | boolean |
| `lastName` | string |
| `mobilePhone` | string |
| `mock` | boolean |
| `optionalAttributes` | object |
| `phone` | string |
| `postalCode` | string |
| `referenceId` | string |
| `state` | string |
| `status` | enum: OK, REGISTRATION_PENDING, REGISTRATION_FAILED |
| `stockExchange` | object |
| `stockSymbol` | string |
| `street` | string |
| `tcrBrandId` | string |
| `universalEin` | string |
| `updatedAt` | string |
| `vertical` | string |
| `webhookFailoverURL` | string |
| `webhookURL` | string |
| `website` | string |

**Returned by:** Order Brand External Vetting, Import External Vetting Record

| Field | Type |
|-------|------|
| `createDate` | string |
| `evpId` | string |
| `vettedDate` | string |
| `vettingClass` | string |
| `vettingId` | string |
| `vettingScore` | integer |
| `vettingToken` | string |

**Returned by:** Trigger Brand SMS OTP

| Field | Type |
|-------|------|
| `brandId` | string |
| `referenceId` | string |

**Returned by:** Get Campaign Cost

| Field | Type |
|-------|------|
| `campaignUsecase` | string |
| `description` | string |
| `monthlyCost` | string |
| `upFrontCost` | string |

**Returned by:** Get campaign, Update campaign, Submit Campaign

| Field | Type |
|-------|------|
| `ageGated` | boolean |
| `autoRenewal` | boolean |
| `billedDate` | string |
| `brandDisplayName` | string |
| `brandId` | string |
| `campaignId` | string |
| `campaignStatus` | enum: TCR_PENDING, TCR_SUSPENDED, TCR_EXPIRED, TCR_ACCEPTED, TCR_FAILED, TELNYX_ACCEPTED, TELNYX_FAILED, MNO_PENDING, MNO_ACCEPTED, MNO_REJECTED, MNO_PROVISIONED, MNO_PROVISIONING_FAILED |
| `createDate` | string |
| `cspId` | string |
| `description` | string |
| `directLending` | boolean |
| `embeddedLink` | boolean |
| `embeddedLinkSample` | string |
| `embeddedPhone` | boolean |
| `failureReasons` | string |
| `helpKeywords` | string |
| `helpMessage` | string |
| `isTMobileNumberPoolingEnabled` | boolean |
| `isTMobileRegistered` | boolean |
| `isTMobileSuspended` | boolean |
| `messageFlow` | string |
| `mock` | boolean |
| `nextRenewalOrExpirationDate` | string |
| `numberPool` | boolean |
| `optinKeywords` | string |
| `optinMessage` | string |
| `optoutKeywords` | string |
| `optoutMessage` | string |
| `privacyPolicyLink` | string |
| `referenceId` | string |
| `resellerId` | string |
| `sample1` | string |
| `sample2` | string |
| `sample3` | string |
| `sample4` | string |
| `sample5` | string |
| `status` | string |
| `subUsecases` | array[string] |
| `submissionStatus` | enum: CREATED, FAILED, PENDING |
| `subscriberHelp` | boolean |
| `subscriberOptin` | boolean |
| `subscriberOptout` | boolean |
| `tcrBrandId` | string |
| `tcrCampaignId` | string |
| `termsAndConditions` | boolean |
| `termsAndConditionsLink` | string |
| `usecase` | string |
| `vertical` | string |
| `webhookFailoverURL` | string |
| `webhookURL` | string |

**Returned by:** Deactivate campaign

| Field | Type |
|-------|------|
| `message` | string |
| `record_type` | string |
| `time` | number |

**Returned by:** Submit campaign appeal for manual review

| Field | Type |
|-------|------|
| `appealed_at` | date-time |

**Returned by:** Get Campaign Mno Metadata

| Field | Type |
|-------|------|
| `10999` | object |

**Returned by:** Get Sharing Status

| Field | Type |
|-------|------|
| `sharedByMe` | object |
| `sharedWithMe` | object |

**Returned by:** Qualify By Usecase

| Field | Type |
|-------|------|
| `annualFee` | number |
| `maxSubUsecases` | integer |
| `minSubUsecases` | integer |
| `mnoMetadata` | object |
| `monthlyFee` | number |
| `quarterlyFee` | number |
| `usecase` | string |

**Returned by:** Get Single Shared Campaign, Update Single Shared Campaign

| Field | Type |
|-------|------|
| `ageGated` | boolean |
| `assignedPhoneNumbersCount` | number |
| `brandDisplayName` | string |
| `campaignStatus` | enum: TCR_PENDING, TCR_SUSPENDED, TCR_EXPIRED, TCR_ACCEPTED, TCR_FAILED, TELNYX_ACCEPTED, TELNYX_FAILED, MNO_PENDING, MNO_ACCEPTED, MNO_REJECTED, MNO_PROVISIONED, MNO_PROVISIONING_FAILED |
| `createdAt` | string |
| `description` | string |
| `directLending` | boolean |
| `embeddedLink` | boolean |
| `embeddedLinkSample` | string |
| `embeddedPhone` | boolean |
| `failureReasons` | string |
| `helpKeywords` | string |
| `helpMessage` | string |
| `isNumberPoolingEnabled` | boolean |
| `messageFlow` | string |
| `numberPool` | boolean |
| `optinKeywords` | string |
| `optinMessage` | string |
| `optoutKeywords` | string |
| `optoutMessage` | string |
| `privacyPolicyLink` | string |
| `sample1` | string |
| `sample2` | string |
| `sample3` | string |
| `sample4` | string |
| `sample5` | string |
| `subUsecases` | array[string] |
| `subscriberOptin` | boolean |
| `subscriberOptout` | boolean |
| `tcrBrandId` | string |
| `tcrCampaignId` | string |
| `termsAndConditions` | boolean |
| `termsAndConditionsLink` | string |
| `updatedAt` | string |
| `usecase` | string |
| `webhookFailoverURL` | string |
| `webhookURL` | string |

**Returned by:** Assign Messaging Profile To Campaign

| Field | Type |
|-------|------|
| `campaignId` | string |
| `messagingProfileId` | string |
| `taskId` | string |
| `tcrCampaignId` | string |

**Returned by:** Get Assignment Task Status

| Field | Type |
|-------|------|
| `createdAt` | date-time |
| `status` | string |
| `taskId` | string |
| `updatedAt` | date-time |

**Returned by:** Get Phone Number Status

| Field | Type |
|-------|------|
| `records` | array[object] |

**Returned by:** Create New Phone Number Campaign, Get Single Phone Number Campaign, Create New Phone Number Campaign, Delete Phone Number Campaign

| Field | Type |
|-------|------|
| `assignmentStatus` | enum: FAILED_ASSIGNMENT, PENDING_ASSIGNMENT, ASSIGNED, PENDING_UNASSIGNMENT, FAILED_UNASSIGNMENT |
| `brandId` | string |
| `campaignId` | string |
| `createdAt` | string |
| `failureReasons` | string |
| `phoneNumber` | string |
| `tcrBrandId` | string |
| `tcrCampaignId` | string |
| `telnyxCampaignId` | string |
| `updatedAt` | string |

## Optional Parameters

### Create Brand — `client.Messaging10dlc.Brand.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CompanyName` | string | (Required for Non-profit/private/public) Legal company name. |
| `FirstName` | string | First name of business contact. |
| `LastName` | string | Last name of business contact. |
| `Ein` | string | (Required for Non-profit) Government assigned corporate tax ID. |
| `Phone` | string | Valid phone number in e.164 international format. |
| `Street` | string | Street number and name. |
| `City` | string | City name |
| `State` | string | State. |
| `PostalCode` | string | Postal codes. |
| `StockSymbol` | string | (Required for public company) stock symbol. |
| `StockExchange` | object | (Required for public company) stock exchange. |
| `IpAddress` | string (IPv4/IPv6) | IP address of the browser requesting to create brand identity. |
| `Website` | string | Brand website URL. |
| `IsReseller` | boolean |  |
| `Mock` | boolean | Mock brand for testing purposes. |
| `MobilePhone` | string | Valid mobile phone number in e.164 international format. |
| `BusinessContactEmail` | string | Business contact email. |
| `WebhookURL` | string | Webhook URL for brand status updates. |
| `WebhookFailoverURL` | string | Webhook failover URL for brand status updates. |

### Update Brand — `client.Messaging10dlc.Brand.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CompanyName` | string | (Required for Non-profit/private/public) Legal company name. |
| `FirstName` | string | First name of business contact. |
| `LastName` | string | Last name of business contact. |
| `Ein` | string | (Required for Non-profit) Government assigned corporate tax ID. |
| `Phone` | string | Valid phone number in e.164 international format. |
| `Street` | string | Street number and name. |
| `City` | string | City name |
| `State` | string | State. |
| `PostalCode` | string | Postal codes. |
| `StockSymbol` | string | (Required for public company) stock symbol. |
| `StockExchange` | object | (Required for public company) stock exchange. |
| `IpAddress` | string (IPv4/IPv6) | IP address of the browser requesting to create brand identity. |
| `Website` | string | Brand website URL. |
| `AltBusinessIdType` | enum (NONE, DUNS, GIIN, LEI) | An enumeration. |
| `IsReseller` | boolean |  |
| `IdentityStatus` | enum (VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED) | The verification status of an active brand |
| `BusinessContactEmail` | string | Business contact email. |
| `WebhookURL` | string | Webhook URL for brand status updates. |
| `WebhookFailoverURL` | string | Webhook failover URL for brand status updates. |
| `AltBusinessId` | string (UUID) | Alternate business identifier such as DUNS, LEI, or GIIN |

### Import External Vetting Record — `client.Messaging10dlc.Brand.ExternalVetting.Imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `VettingToken` | string | Required by some providers for vetting record confirmation. |

### Update campaign — `client.Messaging10dlc.Campaign.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ResellerId` | string (UUID) | Alphanumeric identifier of the reseller that you want to associate with this ... |
| `Sample1` | string | Message sample. |
| `Sample2` | string | Message sample. |
| `Sample3` | string | Message sample. |
| `Sample4` | string | Message sample. |
| `Sample5` | string | Message sample. |
| `MessageFlow` | string | Message flow description. |
| `HelpMessage` | string | Help message of the campaign. |
| `AutoRenewal` | boolean | Help message of the campaign. |
| `WebhookURL` | string | Webhook to which campaign status updates are sent. |
| `WebhookFailoverURL` | string | Webhook failover to which campaign status updates are sent. |

### Submit Campaign — `client.Messaging10dlc.CampaignBuilder.Submit()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `AgeGated` | boolean | Age gated message content in campaign. |
| `AutoRenewal` | boolean | Campaign subscription auto-renewal option. |
| `DirectLending` | boolean | Direct lending or loan arrangement |
| `EmbeddedLink` | boolean | Does message generated by the campaign include URL link in SMS? |
| `EmbeddedPhone` | boolean | Does message generated by the campaign include phone number in SMS? |
| `HelpKeywords` | string | Subscriber help keywords. |
| `HelpMessage` | string | Help message of the campaign. |
| `MessageFlow` | string | Message flow description. |
| `MnoIds` | array[integer] | Submit campaign to given list of MNOs by MNO's network ID. |
| `NumberPool` | boolean | Does campaign utilize pool of phone numbers? |
| `OptinKeywords` | string | Subscriber opt-in keywords. |
| `OptinMessage` | string | Subscriber opt-in message. |
| `OptoutKeywords` | string | Subscriber opt-out keywords. |
| `OptoutMessage` | string | Subscriber opt-out message. |
| `ReferenceId` | string (UUID) | Caller supplied campaign reference ID. |
| `ResellerId` | string (UUID) | Alphanumeric identifier of the reseller that you want to associate with this ... |
| `Sample1` | string | Message sample. |
| `Sample2` | string | Message sample. |
| `Sample3` | string | Message sample. |
| `Sample4` | string | Message sample. |
| `Sample5` | string | Message sample. |
| `SubUsecases` | array[string] | Campaign sub-usecases. |
| `SubscriberHelp` | boolean | Does campaign responds to help keyword(s)? |
| `SubscriberOptin` | boolean | Does campaign require subscriber to opt-in before SMS is sent to subscriber? |
| `SubscriberOptout` | boolean | Does campaign support subscriber opt-out keyword(s)? |
| `Tag` | array[string] | Tags to be set on the Campaign. |
| `TermsAndConditions` | boolean | Is terms and conditions accepted? |
| `PrivacyPolicyLink` | string | Link to the campaign's privacy policy. |
| `TermsAndConditionsLink` | string | Link to the campaign's terms and conditions. |
| `EmbeddedLinkSample` | string | Sample of an embedded link that will be sent to subscribers. |
| `WebhookURL` | string | Webhook to which campaign status updates are sent. |
| `WebhookFailoverURL` | string | Failover webhook to which campaign status updates are sent. |

### Update Single Shared Campaign — `client.Messaging10dlc.PartnerCampaigns.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `WebhookURL` | string | Webhook to which campaign status updates are sent. |
| `WebhookFailoverURL` | string | Webhook failover to which campaign status updates are sent. |

### Assign Messaging Profile To Campaign — `client.Messaging10dlc.PhoneNumberAssignmentByProfile.Assign()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TcrCampaignId` | string (UUID) | The TCR ID of the shared campaign you want to link to the specified messaging... |
| `CampaignId` | string (UUID) | The ID of the campaign you want to link to the specified messaging profile. |

## Webhook Payload Fields

### `campaignStatusUpdate`

| Field | Type | Description |
|-------|------|-------------|
| `brandId` | string | Brand ID associated with the campaign. |
| `campaignId` | string | The ID of the campaign. |
| `createDate` | string | Unix timestamp when campaign was created. |
| `cspId` | string | Alphanumeric identifier of the CSP associated with this campaign. |
| `isTMobileRegistered` | boolean | Indicates whether the campaign is registered with T-Mobile. |
| `type` | enum: TELNYX_EVENT, REGISTRATION, MNO_REVIEW, TELNYX_REVIEW, NUMBER_POOL_PROVISIONED, NUMBER_POOL_DEPROVISIONED, TCR_EVENT, VERIFIED |  |
| `description` | string | Description of the event. |
| `status` | enum: ACCEPTED, REJECTED, DORMANT, success, failed | The status of the campaign. |
