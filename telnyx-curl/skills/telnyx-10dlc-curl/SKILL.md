---
name: telnyx-10dlc-curl
description: >-
  10DLC brand and campaign registration for US A2P messaging compliance. Assign
  phone numbers to campaigns.
metadata:
  author: telnyx
  product: 10dlc
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - curl

## Core Workflow

### Prerequisites

1. Create a messaging profile (see telnyx-messaging-profiles-curl)
2. Buy US 10DLC phone number(s) and assign to the messaging profile (see telnyx-numbers-curl)

### Steps

1. **Register brand**
2. **(Optional) Vet brand**
3. **Create campaign**
4. **Assign number to campaign**
5. **Wait for MNO_PROVISIONED status**

### Common mistakes

- NEVER send messages before the campaign reaches MNO_PROVISIONED status — messages will be filtered/blocked
- NEVER use a P.O. box or missing website in brand registration — causes rejection
- NEVER omit opt-out language in sample messages — campaign will be rejected
- NEVER mismatch content with registered campaign use case — causes carrier filtering even after registration
- Sole Proprietor brands: max 1 campaign, max 1 phone number per campaign

**Related skills**: telnyx-messaging-curl, telnyx-messaging-profiles-curl, telnyx-numbers-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create Brand

This endpoint is used to create a new brand. A brand is an entity created by The Campaign Registry (TCR) that represents an organization or a company. It is this entity that TCR created campaigns will be associated with.

`POST /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | object | Yes | Entity type behind the brand. |
| `displayName` | string | Yes | Display name, marketing name, or DBA name of the brand. |
| `country` | string | Yes | ISO2 2 characters country code. |
| `email` | string | Yes | Valid email address of brand support contact. |
| `vertical` | object | Yes | Vertical or industry segment of the brand. |
| `companyName` | string | No | (Required for Non-profit/private/public) Legal company name. |
| `firstName` | string | No | First name of business contact. |
| `lastName` | string | No | Last name of business contact. |
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "entityType": "PRIVATE_PROFIT",
  "displayName": "ABC Mobile",
  "country": "US",
  "email": "support@example.com",
  "vertical": "TECHNOLOGY"
}' \
  "https://api.telnyx.com/v2/10dlc/brand"
```

Key response fields: `.data.status, .data.state, .data.altBusinessId`

## Get Brand

Retrieve a brand by `brandId`.

`GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/BXXX001"
```

Key response fields: `.data.status, .data.state, .data.altBusinessId`

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `usecase` | string | Yes |  |
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaignBuilder/brand/BXXX001/usecase/{usecase}"
```

Key response fields: `.data.annualFee, .data.maxSubUsecases, .data.minSubUsecases`

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign to is qualified for the desired use case of that campaign. **Please note:** After campaign creation, you'll only be able to edit the campaign's sample messages.

`POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `description` | string | Yes | Summary description of this campaign. |
| `usecase` | string | Yes | Campaign usecase. |
| `ageGated` | boolean | No | Age gated message content in campaign. |
| `autoRenewal` | boolean | No | Campaign subscription auto-renewal option. |
| `directLending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "brandId": "BXXX001",
      "description": "Two-factor authentication messages",
      "usecase": "2FA",
      "sample_messages": [
          "Your verification code is {{code}}"
      ]
  }' \
  "https://api.telnyx.com/v2/10dlc/campaignBuilder"
```

Key response fields: `.data.status, .data.ageGated, .data.autoRenewal`

## Create New Phone Number Campaign

`POST /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phoneNumber": "+18005550199",
  "campaignId": "4b300178-131c-d902-d54e-72d90ba1620j"
}' \
  "https://api.telnyx.com/v2/10dlc/phone_number_campaigns"
```

Key response fields: `.data.assignmentStatus, .data.brandId, .data.campaignId`

## Get campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/CXXX001"
```

Key response fields: `.data.status, .data.ageGated, .data.autoRenewal`

## List Brands

This endpoint is used to list all brands associated with your organization.

`GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No |  |
| `recordsPerPage` | integer | No | number of records per page. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand?sort=-identityStatus&brandId=826ef77a-348c-445b-81a5-a9b13c68fbfe&tcrBrandId=BBAND1"
```

Key response fields: `.data.page, .data.records, .data.totalRecords`

## Get Brand Feedback By Id

Get feedback about a brand by ID. This endpoint can be used after creating or revetting
a brand. Possible values for `.category[].id`:

* `TAX_ID` - Data mismatch related to tax id and its associated properties. * `STOCK_SYMBOL` - Non public entity registered as a public for profit entity or
  the stock information mismatch.

`GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/feedback/BXXX001"
```

Key response fields: `.data.brandId, .data.category`

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification. This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process.

`GET /10dlc/brand/smsOtp/{referenceId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceId` | string (UUID) | Yes | The reference ID returned when the OTP was initially trigger... |
| `brandId` | string (UUID) | No | Filter by Brand ID for easier lookup in portal applications |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/smsOtp/OTP4B2001?brandId=B123ABC"
```

Key response fields: `.data.brandId, .data.deliveryStatus, .data.deliveryStatusDate`

## Update Brand

Update a brand's attributes by `brandId`.

`PUT /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | object | Yes | Entity type behind the brand. |
| `displayName` | string | Yes | Display or marketing name of the brand. |
| `country` | string | Yes | ISO2 2 characters country code. |
| `email` | string | Yes | Valid email address of brand support contact. |
| `vertical` | object | Yes | Vertical or industry segment of the brand. |
| `brandId` | string (UUID) | Yes |  |
| `altBusinessIdType` | enum (NONE, DUNS, GIIN, LEI) | No | An enumeration. |
| `identityStatus` | enum (VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED) | No | The verification status of an active brand |
| `companyName` | string | No | (Required for Non-profit/private/public) Legal company name. |
| ... | | | +17 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "entityType": "PRIVATE_PROFIT",
  "displayName": "ABC Mobile",
  "country": "US",
  "email": "support@example.com",
  "vertical": "TECHNOLOGY"
}' \
  "https://api.telnyx.com/v2/10dlc/brand/BXXX001"
```

Key response fields: `.data.status, .data.state, .data.altBusinessId`

## Delete Brand

Delete Brand. This endpoint is used to delete a brand. Note the brand cannot be deleted if it contains one or more active campaigns, the campaigns need to be inactive and at least 3 months old due to billing purposes.

`DELETE /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/10dlc/brand/BXXX001"
```

## Resend brand 2FA email

`POST /10dlc/brand/{brandId}/2faEmail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/10dlc/brand/BXXX001/2faEmail"
```

## List External Vettings

Get list of valid external vetting record for a given brand

`GET /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/BXXX001/externalVetting"
```

## Order Brand External Vetting

Order new external vetting for a brand

`POST /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vettingClass` | string | Yes | Identifies the vetting classification. |
| `brandId` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "evpId": "550e8400-e29b-41d4-a716-446655440000",
  "vettingClass": "STANDARD"
}' \
  "https://api.telnyx.com/v2/10dlc/brand/BXXX001/externalVetting"
```

Key response fields: `.data.createDate, .data.evpId, .data.vettedDate`

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider. If the vetting provider confirms validity of the record, it will be
saved with the brand and will be considered for future campaign qualification.

`PUT /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vettingId` | string (UUID) | Yes | Unique ID that identifies a vetting transaction performed by... |
| `brandId` | string (UUID) | Yes |  |
| `vettingToken` | string | No | Required by some providers for vetting record confirmation. |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "evpId": "550e8400-e29b-41d4-a716-446655440000",
  "vettingId": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/10dlc/brand/BXXX001/externalVetting"
```

Key response fields: `.data.createDate, .data.evpId, .data.vettedDate`

## Revet Brand

This operation allows you to revet the brand. However, revetting is allowed once after the successful brand registration and thereafter limited to once every 3 months.

`PUT /10dlc/brand/{brandId}/revet`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/10dlc/brand/BXXX001/revet"
```

Key response fields: `.data.status, .data.state, .data.altBusinessId`

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process by looking it up with the brand ID.

The response includes delivery status, verification dates, and detailed delivery information.

`GET /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | The Brand ID for which to query OTP status |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/4b20019b-043a-78f8-0657-b3be3f4b4002/smsOtp"
```

Key response fields: `.data.brandId, .data.deliveryStatus, .data.deliveryStatusDate`

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`POST /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pinSms` | string | Yes | SMS message template to send the OTP. |
| `successSms` | string | Yes | SMS message to send upon successful OTP verification |
| `brandId` | string (UUID) | Yes | The Brand ID for which to trigger the OTP |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "pinSms": "Your PIN is @OTP_PIN@",
  "successSms": "Verification successful!"
}' \
  "https://api.telnyx.com/v2/10dlc/brand/4b20019b-043a-78f8-0657-b3be3f4b4002/smsOtp"
```

Key response fields: `.data.brandId, .data.referenceId`

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification. **Verification Flow:**

1. User receives OTP via SMS after triggering
2.

`PUT /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `otpPin` | string | Yes | The OTP PIN received via SMS |
| `brandId` | string (UUID) | Yes | The Brand ID for which to verify the OTP |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "otpPin": "123456"
}' \
  "https://api.telnyx.com/v2/10dlc/brand/4b20019b-043a-78f8-0657-b3be3f4b4002/smsOtp"
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`GET /10dlc/campaign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, campaignId, -campaignId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign?sort=-assignedPhoneNumbersCount"
```

Key response fields: `.data.page, .data.records, .data.totalRecords`

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`POST /10dlc/campaign/acceptSharing/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | TCR's ID for the campaign to import |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/10dlc/campaign/acceptSharing/CXXX001"
```

## Get Campaign Cost

`GET /10dlc/campaign/usecase/cost`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/usecase/cost"
```

Key response fields: `.data.campaignUsecase, .data.description, .data.monthlyCost`

## Update campaign

Update a campaign's properties by `campaignId`. **Please note:** only sample messages are editable.

`PUT /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |
| `resellerId` | string (UUID) | No | Alphanumeric identifier of the reseller that you want to ass... |
| `sample1` | string | No | Message sample. |
| `sample2` | string | No | Message sample. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/10dlc/campaign/CXXX001"
```

Key response fields: `.data.status, .data.ageGated, .data.autoRenewal`

## Deactivate campaign

Terminate a campaign. Note that once deactivated, a campaign cannot be restored.

`DELETE /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/10dlc/campaign/CXXX001"
```

Key response fields: `.data.message, .data.record_type, .data.time`

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status. The appeal is recorded for manual compliance team review and the campaign status is reset to TCR_ACCEPTED. Note: Appeal forwarding is handled manually to allow proper review before incurring upstream charges.

`POST /10dlc/campaign/{campaignId}/appeal`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appeal_reason` | string | Yes | Detailed explanation of why the campaign should be reconside... |
| `campaignId` | string (UUID) | Yes | The Telnyx campaign identifier |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "appeal_reason": "The website has been updated to include the required privacy policy and terms of service."
}' \
  "https://api.telnyx.com/v2/10dlc/campaign/5eb13888-32b7-4cab-95e6-d834dde21d64/appeal"
```

Key response fields: `.data.appealed_at`

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`GET /10dlc/campaign/{campaignId}/mnoMetadata`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/CXXX001/mnoMetadata"
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`GET /10dlc/campaign/{campaignId}/operationStatus`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/CXXX001/operationStatus"
```

## Get OSR campaign attributes

`GET /10dlc/campaign/{campaignId}/osr/attributes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/CXXX001/osr/attributes"
```

## Get Sharing Status

`GET /10dlc/campaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/CXXX001/sharing"
```

Key response fields: `.data.sharedByMe, .data.sharedWithMe`

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted. In other words, shared but pending campaigns are currently omitted
from the response from this endpoint.

`GET /10dlc/partnerCampaign/sharedByMe`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/partnerCampaign/sharedByMe"
```

Key response fields: `.data.page, .data.records, .data.totalRecords`

## Get Sharing Status

`GET /10dlc/partnerCampaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/partnerCampaign/CXXX001/sharing"
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion. This endpoint is currently limited to only returning shared campaigns that Telnyx has accepted. In other words, shared but pending campaigns are currently omitted from the response from this endpoint.

`GET /10dlc/partner_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, brandDisplayName, -brandDisplayName, tcrBrandId, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/partner_campaigns?sort=-assignedPhoneNumbersCount"
```

Key response fields: `.data.page, .data.records, .data.totalRecords`

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/partner_campaigns/CXXX001"
```

Key response fields: `.data.ageGated, .data.assignedPhoneNumbersCount, .data.brandDisplayName`

## Update Single Shared Campaign

Update campaign details by `campaignId`. **Please note:** Only webhook urls are editable.

`PATCH /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |
| `webhookURL` | string | No | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | No | Webhook failover to which campaign status updates are sent. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/10dlc/partner_campaigns/CXXX001"
```

Key response fields: `.data.ageGated, .data.assignedPhoneNumbersCount, .data.brandDisplayName`

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign. **Please note:** if you want to assign phone numbers to a campaign that you did not create with Telnyx 10DLC services, this endpoint allows that provided that you've shared the campaign with Telnyx. In this case, only provide the parameter, `tcrCampaignId`, and not `campaignId`.

`POST /10dlc/phoneNumberAssignmentByProfile`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | The ID of the messaging profile that you want to link to the... |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified mes... |
| `tcrCampaignId` | string (UUID) | No | The TCR ID of the shared campaign you want to link to the sp... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "messagingProfileId": "4001767e-ce0f-4cae-9d5f-0d5e636e7809",
      "campaignId": "CXXX001"
  }' \
  "https://api.telnyx.com/v2/10dlc/phoneNumberAssignmentByProfile"
```

Key response fields: `.data.campaignId, .data.messagingProfileId, .data.taskId`

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/phoneNumberAssignmentByProfile/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.status, .data.createdAt, .data.taskId`

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `recordsPerPage` | integer | No |  |
| `page` | integer | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/phoneNumberAssignmentByProfile/550e8400-e29b-41d4-a716-446655440000/phoneNumbers"
```

Key response fields: `.data.records`

## List phone number campaigns

`GET /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignmentStatus, -assignmentStatus, createdAt, -createdAt, phoneNumber, ...) | No | Specifies the sort order for results. |
| `recordsPerPage` | integer | No |  |
| `page` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/phone_number_campaigns?sort=-phoneNumber"
```

Key response fields: `.data.page, .data.records, .data.totalRecords`

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`GET /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/phone_number_campaigns/+13125550001"
```

Key response fields: `.data.assignmentStatus, .data.brandId, .data.campaignId`

## Create New Phone Number Campaign

`PUT /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |
| `phoneNumber` | string (E.164) | Yes |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phoneNumber": "+18005550199",
  "campaignId": "4b300178-131c-d902-d54e-72d90ba1620j"
}' \
  "https://api.telnyx.com/v2/10dlc/phone_number_campaigns/+13125550001"
```

Key response fields: `.data.assignmentStatus, .data.brandId, .data.campaignId`

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/10dlc/phone_number_campaigns/+13125550001"
```

Key response fields: `.data.assignmentStatus, .data.brandId, .data.campaignId`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```bash
# Telnyx signs webhooks with Ed25519 (asymmetric — NOT HMAC/Standard Webhooks).
# Headers sent with each webhook:
#   telnyx-signature-ed25519: base64-encoded Ed25519 signature
#   telnyx-timestamp: Unix timestamp (reject if >5 minutes old for replay protection)
#
# Get your public key from: Telnyx Portal > Account Settings > Keys & Credentials
# Use the Telnyx SDK in your language for verification (client.webhooks.unwrap).
# Your endpoint MUST return 2xx within 2 seconds or Telnyx will retry (up to 3 attempts).
# Configure a failover URL in Telnyx Portal for additional reliability.
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `campaignStatusUpdate` | `10dlc.campaign.status_update` | Campaign Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
