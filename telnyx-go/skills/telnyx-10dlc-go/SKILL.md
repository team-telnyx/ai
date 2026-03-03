---
name: telnyx-10dlc-go
description: >-
  Register brands and campaigns for 10DLC (10-digit long code) A2P messaging
  compliance in the US. Manage campaign assignments to phone numbers. This skill
  provides Go SDK examples.
metadata:
  author: telnyx
  product: 10dlc
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - Go

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

## List Brands

This endpoint is used to list all brands associated with your organization.

`GET /10dlc/brand`

```go
	page, err := client.Messaging10dlc.Brand.List(context.TODO(), telnyx.Messaging10dlcBrandListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create Brand

This endpoint is used to create a new brand.

`POST /10dlc/brand` — Required: `entityType`, `displayName`, `country`, `email`, `vertical`

Optional: `businessContactEmail` (string), `city` (string), `companyName` (string), `ein` (string), `firstName` (string), `ipAddress` (string), `isReseller` (boolean), `lastName` (string), `mobilePhone` (string), `mock` (boolean), `phone` (string), `postalCode` (string), `state` (string), `stockExchange` (object), `stockSymbol` (string), `street` (string), `webhookFailoverURL` (string), `webhookURL` (string), `website` (string)

```go
	telnyxBrand, err := client.Messaging10dlc.Brand.New(context.TODO(), telnyx.Messaging10dlcBrandNewParams{
		Country:     "US",
		DisplayName: "ABC Mobile",
		Email:       "email",
		EntityType:  telnyx.EntityTypePrivateProfit,
		Vertical:    telnyx.VerticalTechnology,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxBrand.IdentityStatus)
```

## Get Brand Feedback By Id

Get feedback about a brand by ID.

`GET /10dlc/brand/feedback/{brandId}`

```go
	response, err := client.Messaging10dlc.Brand.GetFeedback(context.TODO(), "brandId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.BrandID)
```

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`GET /10dlc/brand/smsOtp/{referenceId}`

```go
	response, err := client.Messaging10dlc.Brand.GetSMSOtpByReference(
		context.TODO(),
		"OTP4B2001",
		telnyx.Messaging10dlcBrandGetSMSOtpByReferenceParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.BrandID)
```

## Get Brand

Retrieve a brand by `brandId`.

`GET /10dlc/brand/{brandId}`

```go
	brand, err := client.Messaging10dlc.Brand.Get(context.TODO(), "brandId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", brand)
```

## Update Brand

Update a brand's attributes by `brandId`.

`PUT /10dlc/brand/{brandId}` — Required: `entityType`, `displayName`, `country`, `email`, `vertical`

Optional: `altBusinessId` (string), `altBusinessIdType` (enum), `businessContactEmail` (string), `city` (string), `companyName` (string), `ein` (string), `firstName` (string), `identityStatus` (enum), `ipAddress` (string), `isReseller` (boolean), `lastName` (string), `phone` (string), `postalCode` (string), `state` (string), `stockExchange` (object), `stockSymbol` (string), `street` (string), `webhookFailoverURL` (string), `webhookURL` (string), `website` (string)

```go
	telnyxBrand, err := client.Messaging10dlc.Brand.Update(
		context.TODO(),
		"brandId",
		telnyx.Messaging10dlcBrandUpdateParams{
			Country:     "US",
			DisplayName: "ABC Mobile",
			Email:       "email",
			EntityType:  telnyx.EntityTypePrivateProfit,
			Vertical:    telnyx.VerticalTechnology,
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxBrand.IdentityStatus)
```

## Delete Brand

Delete Brand.

`DELETE /10dlc/brand/{brandId}`

```go
	err := client.Messaging10dlc.Brand.Delete(context.TODO(), "brandId")
	if err != nil {
		panic(err.Error())
	}
```

## Resend brand 2FA email

`POST /10dlc/brand/{brandId}/2faEmail`

```go
	err := client.Messaging10dlc.Brand.Resend2faEmail(context.TODO(), "brandId")
	if err != nil {
		panic(err.Error())
	}
```

## List External Vettings

Get list of valid external vetting record for a given brand

`GET /10dlc/brand/{brandId}/externalVetting`

```go
	externalVettings, err := client.Messaging10dlc.Brand.ExternalVetting.List(context.TODO(), "brandId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", externalVettings)
```

## Order Brand External Vetting

Order new external vetting for a brand

`POST /10dlc/brand/{brandId}/externalVetting` — Required: `evpId`, `vettingClass`

```go
	response, err := client.Messaging10dlc.Brand.ExternalVetting.Order(
		context.TODO(),
		"brandId",
		telnyx.Messaging10dlcBrandExternalVettingOrderParams{
			EvpID:        "evpId",
			VettingClass: "vettingClass",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.CreateDate)
```

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider.

`PUT /10dlc/brand/{brandId}/externalVetting` — Required: `evpId`, `vettingId`

Optional: `vettingToken` (string)

```go
	response, err := client.Messaging10dlc.Brand.ExternalVetting.Imports(
		context.TODO(),
		"brandId",
		telnyx.Messaging10dlcBrandExternalVettingImportsParams{
			EvpID:     "evpId",
			VettingID: "vettingId",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.CreateDate)
```

## Revet Brand

This operation allows you to revet the brand.

`PUT /10dlc/brand/{brandId}/revet`

```go
	telnyxBrand, err := client.Messaging10dlc.Brand.Revet(context.TODO(), "brandId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxBrand.IdentityStatus)
```

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

`GET /10dlc/brand/{brandId}/smsOtp`

```go
	response, err := client.Messaging10dlc.Brand.GetSMSOtpStatus(context.TODO(), "4b20019b-043a-78f8-0657-b3be3f4b4002")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.BrandID)
```

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`POST /10dlc/brand/{brandId}/smsOtp` — Required: `pinSms`, `successSms`

```go
	response, err := client.Messaging10dlc.Brand.TriggerSMSOtp(
		context.TODO(),
		"4b20019b-043a-78f8-0657-b3be3f4b4002",
		telnyx.Messaging10dlcBrandTriggerSMSOtpParams{
			PinSMS:     "Your PIN is @OTP_PIN@",
			SuccessSMS: "Verification successful!",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.BrandID)
```

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`PUT /10dlc/brand/{brandId}/smsOtp` — Required: `otpPin`

```go
	err := client.Messaging10dlc.Brand.VerifySMSOtp(
		context.TODO(),
		"4b20019b-043a-78f8-0657-b3be3f4b4002",
		telnyx.Messaging10dlcBrandVerifySMSOtpParams{
			OtpPin: "123456",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`GET /10dlc/campaign`

```go
	page, err := client.Messaging10dlc.Campaign.List(context.TODO(), telnyx.Messaging10dlcCampaignListParams{
		BrandID: "brandId",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`POST /10dlc/campaign/acceptSharing/{campaignId}`

```go
	response, err := client.Messaging10dlc.Campaign.AcceptSharing(context.TODO(), "C26F1KLZN")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## Get Campaign Cost

`GET /10dlc/campaign/usecase/cost`

```go
	response, err := client.Messaging10dlc.Campaign.Usecase.GetCost(context.TODO(), telnyx.Messaging10dlcCampaignUsecaseGetCostParams{
		Usecase: "usecase",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.CampaignUsecase)
```

## Get campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/campaign/{campaignId}`

```go
	telnyxCampaignCsp, err := client.Messaging10dlc.Campaign.Get(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxCampaignCsp.BrandID)
```

## Update campaign

Update a campaign's properties by `campaignId`.

`PUT /10dlc/campaign/{campaignId}`

Optional: `autoRenewal` (boolean), `helpMessage` (string), `messageFlow` (string), `resellerId` (string), `sample1` (string), `sample2` (string), `sample3` (string), `sample4` (string), `sample5` (string), `webhookFailoverURL` (string), `webhookURL` (string)

```go
	telnyxCampaignCsp, err := client.Messaging10dlc.Campaign.Update(
		context.TODO(),
		"campaignId",
		telnyx.Messaging10dlcCampaignUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxCampaignCsp.BrandID)
```

## Deactivate campaign

Terminate a campaign.

`DELETE /10dlc/campaign/{campaignId}`

```go
	response, err := client.Messaging10dlc.Campaign.Deactivate(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Time)
```

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status.

`POST /10dlc/campaign/{campaignId}/appeal` — Required: `appeal_reason`

```go
	response, err := client.Messaging10dlc.Campaign.SubmitAppeal(
		context.TODO(),
		"5eb13888-32b7-4cab-95e6-d834dde21d64",
		telnyx.Messaging10dlcCampaignSubmitAppealParams{
			AppealReason: "The website has been updated to include the required privacy policy and terms of service.",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AppealedAt)
```

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`GET /10dlc/campaign/{campaignId}/mnoMetadata`

```go
	response, err := client.Messaging10dlc.Campaign.GetMnoMetadata(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Number10999)
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`GET /10dlc/campaign/{campaignId}/operationStatus`

```go
	response, err := client.Messaging10dlc.Campaign.GetOperationStatus(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## Get OSR campaign attributes

`GET /10dlc/campaign/{campaignId}/osr/attributes`

```go
	response, err := client.Messaging10dlc.Campaign.Osr.GetAttributes(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## Get Sharing Status

`GET /10dlc/campaign/{campaignId}/sharing`

```go
	response, err := client.Messaging10dlc.Campaign.GetSharingStatus(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.SharedByMe)
```

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign...

`POST /10dlc/campaignBuilder` — Required: `brandId`, `description`, `usecase`

Optional: `ageGated` (boolean), `autoRenewal` (boolean), `directLending` (boolean), `embeddedLink` (boolean), `embeddedLinkSample` (string), `embeddedPhone` (boolean), `helpKeywords` (string), `helpMessage` (string), `messageFlow` (string), `mnoIds` (array[integer]), `numberPool` (boolean), `optinKeywords` (string), `optinMessage` (string), `optoutKeywords` (string), `optoutMessage` (string), `privacyPolicyLink` (string), `referenceId` (string), `resellerId` (string), `sample1` (string), `sample2` (string), `sample3` (string), `sample4` (string), `sample5` (string), `subUsecases` (array[string]), `subscriberHelp` (boolean), `subscriberOptin` (boolean), `subscriberOptout` (boolean), `tag` (array[string]), `termsAndConditions` (boolean), `termsAndConditionsLink` (string), `webhookFailoverURL` (string), `webhookURL` (string)

```go
	telnyxCampaignCsp, err := client.Messaging10dlc.CampaignBuilder.Submit(context.TODO(), telnyx.Messaging10dlcCampaignBuilderSubmitParams{
		BrandID:     "brandId",
		Description: "description",
		Usecase:     "usecase",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxCampaignCsp.BrandID)
```

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

```go
	response, err := client.Messaging10dlc.CampaignBuilder.Brand.QualifyByUsecase(
		context.TODO(),
		"usecase",
		telnyx.Messaging10dlcCampaignBuilderBrandQualifyByUsecaseParams{
			BrandID: "brandId",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AnnualFee)
```

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted.

`GET /10dlc/partnerCampaign/sharedByMe`

```go
	page, err := client.Messaging10dlc.PartnerCampaigns.ListSharedByMe(context.TODO(), telnyx.Messaging10dlcPartnerCampaignListSharedByMeParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get Sharing Status

`GET /10dlc/partnerCampaign/{campaignId}/sharing`

```go
	response, err := client.Messaging10dlc.PartnerCampaigns.GetSharingStatus(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion.

`GET /10dlc/partner_campaigns`

```go
	page, err := client.Messaging10dlc.PartnerCampaigns.List(context.TODO(), telnyx.Messaging10dlcPartnerCampaignListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/partner_campaigns/{campaignId}`

```go
	telnyxDownstreamCampaign, err := client.Messaging10dlc.PartnerCampaigns.Get(context.TODO(), "campaignId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxDownstreamCampaign.TcrBrandID)
```

## Update Single Shared Campaign

Update campaign details by `campaignId`.

`PATCH /10dlc/partner_campaigns/{campaignId}`

Optional: `webhookFailoverURL` (string), `webhookURL` (string)

```go
	telnyxDownstreamCampaign, err := client.Messaging10dlc.PartnerCampaigns.Update(
		context.TODO(),
		"campaignId",
		telnyx.Messaging10dlcPartnerCampaignUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telnyxDownstreamCampaign.TcrBrandID)
```

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign.

`POST /10dlc/phoneNumberAssignmentByProfile` — Required: `messagingProfileId`

Optional: `campaignId` (string), `tcrCampaignId` (string)

```go
	response, err := client.Messaging10dlc.PhoneNumberAssignmentByProfile.Assign(context.TODO(), telnyx.Messaging10dlcPhoneNumberAssignmentByProfileAssignParams{
		MessagingProfileID: "4001767e-ce0f-4cae-9d5f-0d5e636e7809",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.MessagingProfileID)
```

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

```go
	response, err := client.Messaging10dlc.PhoneNumberAssignmentByProfile.GetStatus(context.TODO(), "taskId")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Status)
```

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

```go
	response, err := client.Messaging10dlc.PhoneNumberAssignmentByProfile.ListPhoneNumberStatus(
		context.TODO(),
		"taskId",
		telnyx.Messaging10dlcPhoneNumberAssignmentByProfileListPhoneNumberStatusParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Records)
```

## List phone number campaigns

`GET /10dlc/phone_number_campaigns`

```go
	page, err := client.Messaging10dlc.PhoneNumberCampaigns.List(context.TODO(), telnyx.Messaging10dlcPhoneNumberCampaignListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create New Phone Number Campaign

`POST /10dlc/phone_number_campaigns` — Required: `phoneNumber`, `campaignId`

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.New(context.TODO(), telnyx.Messaging10dlcPhoneNumberCampaignNewParams{
		PhoneNumberCampaignCreate: telnyx.PhoneNumberCampaignCreateParam{
			CampaignID:  "4b300178-131c-d902-d54e-72d90ba1620j",
			PhoneNumber: "+18005550199",
		},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`GET /10dlc/phone_number_campaigns/{phoneNumber}`

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.Get(context.TODO(), "phoneNumber")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

## Create New Phone Number Campaign

`PUT /10dlc/phone_number_campaigns/{phoneNumber}` — Required: `phoneNumber`, `campaignId`

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.Update(
		context.TODO(),
		"phoneNumber",
		telnyx.Messaging10dlcPhoneNumberCampaignUpdateParams{
			PhoneNumberCampaignCreate: telnyx.PhoneNumberCampaignCreateParam{
				CampaignID:  "4b300178-131c-d902-d54e-72d90ba1620j",
				PhoneNumber: "+18005550199",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.Delete(context.TODO(), "phoneNumber")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

---

## Webhooks

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for verification (Standard Webhooks compatible).

| Event | Description |
|-------|-------------|
| `campaignStatusUpdate` | Campaign Status Update |

### Webhook payload fields

**`campaignStatusUpdate`**

| Field | Type | Description |
|-------|------|-------------|
| `brandId` | string | Brand ID associated with the campaign. |
| `campaignId` | string | The ID of the campaign. |
| `createDate` | string | Unix timestamp when campaign was created. |
| `cspId` | string | Alphanumeric identifier of the CSP associated with this campaign. |
| `isTMobileRegistered` | boolean | Indicates whether the campaign is registered with T-Mobile. |
| `type` | enum |  |
| `description` | string | Description of the event. |
| `status` | enum | The status of the campaign. |
