---
name: telnyx-10dlc-go
description: >-
  10DLC brand and campaign registration for US A2P messaging compliance. Assign
  phone numbers to campaigns.
metadata:
  author: telnyx
  product: 10dlc
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - Go

## Core Workflow

### Prerequisites

1. Create a messaging profile (see telnyx-messaging-profiles-go)
2. Buy US 10DLC phone number(s) and assign to the messaging profile (see telnyx-numbers-go)

### Steps

1. **Register brand**: `client.Brands.Create(ctx, params)`
2. **(Optional) Vet brand**: `Improves throughput score — vetting is automatic but can be expedited`
3. **Create campaign**: `client.Campaigns.Create(ctx, params)`
4. **Assign number to campaign**: `client.CampaignPhoneNumbers.Create(ctx, params)`
5. **Wait for MNO_PROVISIONED status**: `Campaign must be provisioned before sending`

### Common mistakes

- NEVER send messages before the campaign reaches MNO_PROVISIONED status — messages will be filtered/blocked
- NEVER use a P.O. box or missing website in brand registration — causes rejection
- NEVER omit opt-out language in sample messages — campaign will be rejected
- NEVER mismatch content with registered campaign use case — causes carrier filtering even after registration
- Sole Proprietor brands: max 1 campaign, max 1 phone number per campaign

**Related skills**: telnyx-messaging-go, telnyx-messaging-profiles-go, telnyx-numbers-go

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

result, err := client.Brands.Create(ctx, params)
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

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create Brand

This endpoint is used to create a new brand. A brand is an entity created by The Campaign Registry (TCR) that represents an organization or a company. It is this entity that TCR created campaigns will be associated with.

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
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand

Retrieve a brand by `brandId`.

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

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

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

Key response fields: `response.data.annualFee, response.data.maxSubUsecases, response.data.minSubUsecases`

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign to is qualified for the desired use case of that campaign. **Please note:** After campaign creation, you'll only be able to edit the campaign's sample messages.

`client.Messaging10dlc.CampaignBuilder.Submit()` — `POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `Description` | string | Yes | Summary description of this campaign. |
| `Usecase` | string | Yes | Campaign usecase. |
| `AgeGated` | boolean | No | Age gated message content in campaign. |
| `AutoRenewal` | boolean | No | Campaign subscription auto-renewal option. |
| `DirectLending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Create New Phone Number Campaign

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

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Get campaign

Retrieve campaign details by `campaignId`.

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

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## List Brands

This endpoint is used to list all brands associated with your organization.

`client.Messaging10dlc.Brand.List()` — `GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `Page` | integer | No |  |
| `RecordsPerPage` | integer | No | number of records per page. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.Messaging10dlc.Brand.List(context.Background(), telnyx.Messaging10dlcBrandListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Brand Feedback By Id

Get feedback about a brand by ID. This endpoint can be used after creating or revetting
a brand. Possible values for `.category[].id`:

* `TAX_ID` - Data mismatch related to tax id and its associated properties. * `STOCK_SYMBOL` - Non public entity registered as a public for profit entity or
  the stock information mismatch.

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

Key response fields: `response.data.brandId, response.data.category`

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification. This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process.

`client.Messaging10dlc.Brand.GetSMSOtpByReference()` — `GET /10dlc/brand/smsOtp/{referenceId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ReferenceId` | string (UUID) | Yes | The reference ID returned when the OTP was initially trigger... |
| `BrandId` | string (UUID) | No | Filter by Brand ID for easier lookup in portal applications |

```go
	response, err := client.Messaging10dlc.Brand.GetSMSOtpByReference(
		context.Background(),
		"OTP4B2001",
		telnyx.Messaging10dlcBrandGetSMSOtpByReferenceParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.BrandID)
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Update Brand

Update a brand's attributes by `brandId`.

`client.Messaging10dlc.Brand.Update()` — `PUT /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EntityType` | object | Yes | Entity type behind the brand. |
| `DisplayName` | string | Yes | Display or marketing name of the brand. |
| `Country` | string | Yes | ISO2 2 characters country code. |
| `Email` | string | Yes | Valid email address of brand support contact. |
| `Vertical` | object | Yes | Vertical or industry segment of the brand. |
| `BrandId` | string (UUID) | Yes |  |
| `AltBusinessIdType` | enum (NONE, DUNS, GIIN, LEI) | No | An enumeration. |
| `IdentityStatus` | enum (VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED) | No | The verification status of an active brand |
| `CompanyName` | string | No | (Required for Non-profit/private/public) Legal company name. |
| ... | | | +17 optional params in [references/api-details.md](references/api-details.md) |

```go
	telnyxBrand, err := client.Messaging10dlc.Brand.Update(
		context.Background(),
		"brandId",
		telnyx.Messaging10dlcBrandUpdateParams{
			Country:     "US",
			DisplayName: "ABC Mobile",
			Email: "support@example.com",
			EntityType:  telnyx.EntityTypePrivateProfit,
			Vertical:    telnyx.VerticalTechnology,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxBrand.IdentityStatus)
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Delete Brand

Delete Brand. This endpoint is used to delete a brand. Note the brand cannot be deleted if it contains one or more active campaigns, the campaigns need to be inactive and at least 3 months old due to billing purposes.

`client.Messaging10dlc.Brand.Delete()` — `DELETE /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes |  |

```go
	err := client.Messaging10dlc.Brand.Delete(context.Background(), "brandId")
	if err != nil {
		log.Fatal(err)
	}
```

## Resend brand 2FA email

`client.Messaging10dlc.Brand.Resend2faEmail()` — `POST /10dlc/brand/{brandId}/2faEmail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes |  |

```go
	err := client.Messaging10dlc.Brand.Resend2faEmail(context.Background(), "brandId")
	if err != nil {
		log.Fatal(err)
	}
```

## List External Vettings

Get list of valid external vetting record for a given brand

`client.Messaging10dlc.Brand.ExternalVetting.List()` — `GET /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes |  |

```go
	externalVettings, err := client.Messaging10dlc.Brand.ExternalVetting.List(context.Background(), "brandId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", externalVettings)
```

## Order Brand External Vetting

Order new external vetting for a brand

`client.Messaging10dlc.Brand.ExternalVetting.Order()` — `POST /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EvpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `VettingClass` | string | Yes | Identifies the vetting classification. |
| `BrandId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.Brand.ExternalVetting.Order(
		context.Background(),
		"brandId",
		telnyx.Messaging10dlcBrandExternalVettingOrderParams{
			EvpID: "550e8400-e29b-41d4-a716-446655440000",
			VettingClass: "STANDARD",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.CreateDate)
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider. If the vetting provider confirms validity of the record, it will be
saved with the brand and will be considered for future campaign qualification.

`client.Messaging10dlc.Brand.ExternalVetting.Imports()` — `PUT /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EvpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `VettingId` | string (UUID) | Yes | Unique ID that identifies a vetting transaction performed by... |
| `BrandId` | string (UUID) | Yes |  |
| `VettingToken` | string | No | Required by some providers for vetting record confirmation. |

```go
	response, err := client.Messaging10dlc.Brand.ExternalVetting.Imports(
		context.Background(),
		"brandId",
		telnyx.Messaging10dlcBrandExternalVettingImportsParams{
			EvpID: "550e8400-e29b-41d4-a716-446655440000",
			VettingID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.CreateDate)
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Revet Brand

This operation allows you to revet the brand. However, revetting is allowed once after the successful brand registration and thereafter limited to once every 3 months.

`client.Messaging10dlc.Brand.Revet()` — `PUT /10dlc/brand/{brandId}/revet`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes |  |

```go
	telnyxBrand, err := client.Messaging10dlc.Brand.Revet(context.Background(), "brandId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxBrand.IdentityStatus)
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process by looking it up with the brand ID.

The response includes delivery status, verification dates, and detailed delivery information.

`client.Messaging10dlc.Brand.GetSMSOtpStatus()` — `GET /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BrandId` | string (UUID) | Yes | The Brand ID for which to query OTP status |

```go
	response, err := client.Messaging10dlc.Brand.GetSMSOtpStatus(context.Background(), "4b20019b-043a-78f8-0657-b3be3f4b4002")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.BrandID)
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`client.Messaging10dlc.Brand.TriggerSMSOtp()` — `POST /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PinSms` | string | Yes | SMS message template to send the OTP. |
| `SuccessSms` | string | Yes | SMS message to send upon successful OTP verification |
| `BrandId` | string (UUID) | Yes | The Brand ID for which to trigger the OTP |

```go
	response, err := client.Messaging10dlc.Brand.TriggerSMSOtp(
		context.Background(),
		"4b20019b-043a-78f8-0657-b3be3f4b4002",
		telnyx.Messaging10dlcBrandTriggerSMSOtpParams{
			PinSMS:     "Your PIN is @OTP_PIN@",
			SuccessSMS: "Verification successful!",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.BrandID)
```

Key response fields: `response.data.brandId, response.data.referenceId`

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification. **Verification Flow:**

1. User receives OTP via SMS after triggering
2.

`client.Messaging10dlc.Brand.VerifySMSOtp()` — `PUT /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `OtpPin` | string | Yes | The OTP PIN received via SMS |
| `BrandId` | string (UUID) | Yes | The Brand ID for which to verify the OTP |

```go
	err := client.Messaging10dlc.Brand.VerifySMSOtp(
		context.Background(),
		"4b20019b-043a-78f8-0657-b3be3f4b4002",
		telnyx.Messaging10dlcBrandVerifySMSOtpParams{
			OtpPin: "123456",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`client.Messaging10dlc.Campaign.List()` — `GET /10dlc/campaign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, campaignId, -campaignId, createdAt, ...) | No | Specifies the sort order for results. |
| `Page` | integer | No | The 1-indexed page number to get. |
| `RecordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```go
	page, err := client.Messaging10dlc.Campaign.List(context.Background(), telnyx.Messaging10dlcCampaignListParams{
		BrandID: "BXXX001",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`client.Messaging10dlc.Campaign.AcceptSharing()` — `POST /10dlc/campaign/acceptSharing/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes | TCR's ID for the campaign to import |

```go
	response, err := client.Messaging10dlc.Campaign.AcceptSharing(context.Background(), "C26F1KLZN")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get Campaign Cost

`client.Messaging10dlc.Campaign.Usecase.GetCost()` — `GET /10dlc/campaign/usecase/cost`

```go
	response, err := client.Messaging10dlc.Campaign.Usecase.GetCost(context.Background(), telnyx.Messaging10dlcCampaignUsecaseGetCostParams{
		Usecase: "CUSTOMER_CARE",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.CampaignUsecase)
```

Key response fields: `response.data.campaignUsecase, response.data.description, response.data.monthlyCost`

## Update campaign

Update a campaign's properties by `campaignId`. **Please note:** only sample messages are editable.

`client.Messaging10dlc.Campaign.Update()` — `PUT /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |
| `ResellerId` | string (UUID) | No | Alphanumeric identifier of the reseller that you want to ass... |
| `Sample1` | string | No | Message sample. |
| `Sample2` | string | No | Message sample. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```go
	telnyxCampaignCsp, err := client.Messaging10dlc.Campaign.Update(
		context.Background(),
		"campaignId",
		telnyx.Messaging10dlcCampaignUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxCampaignCsp.BrandID)
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Deactivate campaign

Terminate a campaign. Note that once deactivated, a campaign cannot be restored.

`client.Messaging10dlc.Campaign.Deactivate()` — `DELETE /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.Campaign.Deactivate(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Time)
```

Key response fields: `response.data.message, response.data.record_type, response.data.time`

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status. The appeal is recorded for manual compliance team review and the campaign status is reset to TCR_ACCEPTED. Note: Appeal forwarding is handled manually to allow proper review before incurring upstream charges.

`client.Messaging10dlc.Campaign.SubmitAppeal()` — `POST /10dlc/campaign/{campaignId}/appeal`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AppealReason` | string | Yes | Detailed explanation of why the campaign should be reconside... |
| `CampaignId` | string (UUID) | Yes | The Telnyx campaign identifier |

```go
	response, err := client.Messaging10dlc.Campaign.SubmitAppeal(
		context.Background(),
		"5eb13888-32b7-4cab-95e6-d834dde21d64",
		telnyx.Messaging10dlcCampaignSubmitAppealParams{
			AppealReason: "The website has been updated to include the required privacy policy and terms of service.",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AppealedAt)
```

Key response fields: `response.data.appealed_at`

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`client.Messaging10dlc.Campaign.GetMnoMetadata()` — `GET /10dlc/campaign/{campaignId}/mnoMetadata`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes | ID of the campaign in question |

```go
	response, err := client.Messaging10dlc.Campaign.GetMnoMetadata(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Number10999)
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`client.Messaging10dlc.Campaign.GetOperationStatus()` — `GET /10dlc/campaign/{campaignId}/operationStatus`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.Campaign.GetOperationStatus(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get OSR campaign attributes

`client.Messaging10dlc.Campaign.Osr.GetAttributes()` — `GET /10dlc/campaign/{campaignId}/osr/attributes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.Campaign.Osr.GetAttributes(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get Sharing Status

`client.Messaging10dlc.Campaign.GetSharingStatus()` — `GET /10dlc/campaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes | ID of the campaign in question |

```go
	response, err := client.Messaging10dlc.Campaign.GetSharingStatus(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.SharedByMe)
```

Key response fields: `response.data.sharedByMe, response.data.sharedWithMe`

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted. In other words, shared but pending campaigns are currently omitted
from the response from this endpoint.

`client.Messaging10dlc.PartnerCampaigns.ListSharedByMe()` — `GET /10dlc/partnerCampaign/sharedByMe`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | integer | No | The 1-indexed page number to get. |
| `RecordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```go
	page, err := client.Messaging10dlc.PartnerCampaigns.ListSharedByMe(context.Background(), telnyx.Messaging10dlcPartnerCampaignListSharedByMeParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Sharing Status

`client.Messaging10dlc.PartnerCampaigns.GetSharingStatus()` — `GET /10dlc/partnerCampaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes | ID of the campaign in question |

```go
	response, err := client.Messaging10dlc.PartnerCampaigns.GetSharingStatus(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion. This endpoint is currently limited to only returning shared campaigns that Telnyx has accepted. In other words, shared but pending campaigns are currently omitted from the response from this endpoint.

`client.Messaging10dlc.PartnerCampaigns.List()` — `GET /10dlc/partner_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, brandDisplayName, -brandDisplayName, tcrBrandId, ...) | No | Specifies the sort order for results. |
| `Page` | integer | No | The 1-indexed page number to get. |
| `RecordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```go
	page, err := client.Messaging10dlc.PartnerCampaigns.List(context.Background(), telnyx.Messaging10dlcPartnerCampaignListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`client.Messaging10dlc.PartnerCampaigns.Get()` — `GET /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |

```go
	telnyxDownstreamCampaign, err := client.Messaging10dlc.PartnerCampaigns.Get(context.Background(), "campaignId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxDownstreamCampaign.TcrBrandID)
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Update Single Shared Campaign

Update campaign details by `campaignId`. **Please note:** Only webhook urls are editable.

`client.Messaging10dlc.PartnerCampaigns.Update()` — `PATCH /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CampaignId` | string (UUID) | Yes |  |
| `WebhookURL` | string | No | Webhook to which campaign status updates are sent. |
| `WebhookFailoverURL` | string | No | Webhook failover to which campaign status updates are sent. |

```go
	telnyxDownstreamCampaign, err := client.Messaging10dlc.PartnerCampaigns.Update(
		context.Background(),
		"campaignId",
		telnyx.Messaging10dlcPartnerCampaignUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxDownstreamCampaign.TcrBrandID)
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign. **Please note:** if you want to assign phone numbers to a campaign that you did not create with Telnyx 10DLC services, this endpoint allows that provided that you've shared the campaign with Telnyx. In this case, only provide the parameter, `tcrCampaignId`, and not `campaignId`.

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

Key response fields: `response.data.campaignId, response.data.messagingProfileId, response.data.taskId`

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`client.Messaging10dlc.PhoneNumberAssignmentByProfile.GetStatus()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TaskId` | string (UUID) | Yes |  |

```go
	response, err := client.Messaging10dlc.PhoneNumberAssignmentByProfile.GetStatus(context.Background(), "taskId")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Status)
```

Key response fields: `response.data.status, response.data.createdAt, response.data.taskId`

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`client.Messaging10dlc.PhoneNumberAssignmentByProfile.ListPhoneNumberStatus()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TaskId` | string (UUID) | Yes |  |
| `RecordsPerPage` | integer | No |  |
| `Page` | integer | No |  |

```go
	response, err := client.Messaging10dlc.PhoneNumberAssignmentByProfile.ListPhoneNumberStatus(
		context.Background(),
		"taskId",
		telnyx.Messaging10dlcPhoneNumberAssignmentByProfileListPhoneNumberStatusParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Records)
```

Key response fields: `response.data.records`

## List phone number campaigns

`client.Messaging10dlc.PhoneNumberCampaigns.List()` — `GET /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (assignmentStatus, -assignmentStatus, createdAt, -createdAt, phoneNumber, ...) | No | Specifies the sort order for results. |
| `RecordsPerPage` | integer | No |  |
| `Page` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.Messaging10dlc.PhoneNumberCampaigns.List(context.Background(), telnyx.Messaging10dlcPhoneNumberCampaignListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`client.Messaging10dlc.PhoneNumberCampaigns.Get()` — `GET /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes |  |

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.Get(context.Background(), "phoneNumber")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Create New Phone Number Campaign

`client.Messaging10dlc.PhoneNumberCampaigns.Update()` — `PUT /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `CampaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |
| `PhoneNumber` | string (E.164) | Yes |  |

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.Update(
		context.Background(),
		"phoneNumber",
		telnyx.Messaging10dlcPhoneNumberCampaignUpdateParams{
			PhoneNumberCampaignCreate: telnyx.PhoneNumberCampaignCreateParam{
				CampaignID:  "4b300178-131c-d902-d54e-72d90ba1620j",
				PhoneNumber: "+18005550199",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`client.Messaging10dlc.PhoneNumberCampaigns.Delete()` — `DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes |  |

```go
	phoneNumberCampaign, err := client.Messaging10dlc.PhoneNumberCampaigns.Delete(context.Background(), "phoneNumber")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumberCampaign.CampaignID)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

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
| `campaignStatusUpdate` | `10dlc.campaign.status_update` | Campaign Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
