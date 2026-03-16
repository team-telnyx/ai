---
name: telnyx-10dlc-javascript
description: >-
  10DLC brand and campaign registration for US A2P messaging compliance. Assign
  phone numbers to campaigns.
metadata:
  author: telnyx
  product: 10dlc
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - JavaScript

## Core Workflow

### Prerequisites

1. Create a messaging profile (see telnyx-messaging-profiles-javascript)
2. Buy US 10DLC phone number(s) and assign to the messaging profile (see telnyx-numbers-javascript)

### Steps

1. **Register brand**: `client.brands.create({entityType: ..., ein: ..., legalName: ...})`
2. **(Optional) Vet brand**: `Improves throughput score — vetting is automatic but can be expedited`
3. **Create campaign**: `client.campaigns.create({brandId: ..., useCase: ..., sampleMessages: [...]})`
4. **Assign number to campaign**: `client.campaignPhoneNumbers.create({campaignId: ..., phoneNumberId: ...})`
5. **Wait for MNO_PROVISIONED status**: `Campaign must be provisioned before sending`

### Common mistakes

- NEVER send messages before the campaign reaches MNO_PROVISIONED status — messages will be filtered/blocked
- NEVER use a P.O. box or missing website in brand registration — causes rejection
- NEVER omit opt-out language in sample messages — campaign will be rejected
- NEVER mismatch content with registered campaign use case — causes carrier filtering even after registration
- Sole Proprietor brands: max 1 campaign, max 1 phone number per campaign

**Related skills**: telnyx-messaging-javascript, telnyx-messaging-profiles-javascript, telnyx-numbers-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.brands.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create Brand

This endpoint is used to create a new brand. A brand is an entity created by The Campaign Registry (TCR) that represents an organization or a company. It is this entity that TCR created campaigns will be associated with.

`client.messaging10dlc.brand.create()` — `POST /10dlc/brand`

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

```javascript
const telnyxBrand = await client.messaging10dlc.brand.create({
  country: 'US',
  displayName: 'ABC Mobile',
  email: 'support@example.com',
  entityType: 'PRIVATE_PROFIT',
  vertical: 'TECHNOLOGY',
});

console.log(telnyxBrand.identityStatus);
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand

Retrieve a brand by `brandId`.

`client.messaging10dlc.brand.retrieve()` — `GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
const brand = await client.messaging10dlc.brand.retrieve('BXXX001');

console.log(brand);
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`client.messaging10dlc.campaignBuilder.brand.qualifyByUsecase()` — `GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `usecase` | string | Yes |  |
| `brandId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.campaignBuilder.brand.qualifyByUsecase('usecase', {
  brandId: 'BXXX001',
});

console.log(response.annualFee);
```

Key response fields: `response.data.annualFee, response.data.maxSubUsecases, response.data.minSubUsecases`

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign to is qualified for the desired use case of that campaign. **Please note:** After campaign creation, you'll only be able to edit the campaign's sample messages.

`client.messaging10dlc.campaignBuilder.submit()` — `POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `description` | string | Yes | Summary description of this campaign. |
| `usecase` | string | Yes | Campaign usecase. |
| `ageGated` | boolean | No | Age gated message content in campaign. |
| `autoRenewal` | boolean | No | Campaign subscription auto-renewal option. |
| `directLending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaignBuilder.submit({
  brandId: 'BXXXXXX',
  description: 'Two-factor authentication messages',
  usecase: '2FA',
    sampleMessages: ["Your verification code is {{code}}"],
});

console.log(telnyxCampaignCsp.brandId);
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Create New Phone Number Campaign

`client.messaging10dlc.phoneNumberCampaigns.create()` — `POST /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.create({
  campaignId: '4b300178-131c-d902-d54e-72d90ba1620j',
  phoneNumber: '+18005550199',
});

console.log(phoneNumberCampaign.campaignId);
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Get campaign

Retrieve campaign details by `campaignId`.

`client.messaging10dlc.campaign.retrieve()` — `GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaign.retrieve('CXXX001');

console.log(telnyxCampaignCsp.brandId);
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## List Brands

This endpoint is used to list all brands associated with your organization.

`client.messaging10dlc.brand.list()` — `GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No |  |
| `recordsPerPage` | integer | No | number of records per page. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const brandListResponse of client.messaging10dlc.brand.list()) {
  console.log(brandListResponse.identityStatus);
}
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Brand Feedback By Id

Get feedback about a brand by ID. This endpoint can be used after creating or revetting
a brand. Possible values for `.category[].id`:

* `TAX_ID` - Data mismatch related to tax id and its associated properties. * `STOCK_SYMBOL` - Non public entity registered as a public for profit entity or
  the stock information mismatch.

`client.messaging10dlc.brand.getFeedback()` — `GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.brand.getFeedback('BXXX001');

console.log(response.brandId);
```

Key response fields: `response.data.brandId, response.data.category`

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification. This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process.

`client.messaging10dlc.brand.getSMSOtpByReference()` — `GET /10dlc/brand/smsOtp/{referenceId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceId` | string (UUID) | Yes | The reference ID returned when the OTP was initially trigger... |
| `brandId` | string (UUID) | No | Filter by Brand ID for easier lookup in portal applications |

```javascript
const response = await client.messaging10dlc.brand.getSMSOtpByReference('OTP4B2001');

console.log(response.brandId);
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Update Brand

Update a brand's attributes by `brandId`.

`client.messaging10dlc.brand.update()` — `PUT /10dlc/brand/{brandId}`

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

```javascript
const telnyxBrand = await client.messaging10dlc.brand.update('brandId', {
  country: 'US',
  displayName: 'ABC Mobile',
  email: 'support@example.com',
  entityType: 'PRIVATE_PROFIT',
  vertical: 'TECHNOLOGY',
});

console.log(telnyxBrand.identityStatus);
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Delete Brand

Delete Brand. This endpoint is used to delete a brand. Note the brand cannot be deleted if it contains one or more active campaigns, the campaigns need to be inactive and at least 3 months old due to billing purposes.

`client.messaging10dlc.brand.delete()` — `DELETE /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
await client.messaging10dlc.brand.delete('BXXX001');
```

## Resend brand 2FA email

`client.messaging10dlc.brand.resend2faEmail()` — `POST /10dlc/brand/{brandId}/2faEmail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
await client.messaging10dlc.brand.resend2faEmail('BXXX001');
```

## List External Vettings

Get list of valid external vetting record for a given brand

`client.messaging10dlc.brand.externalVetting.list()` — `GET /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
const externalVettings = await client.messaging10dlc.brand.externalVetting.list('BXXX001');

console.log(externalVettings);
```

## Order Brand External Vetting

Order new external vetting for a brand

`client.messaging10dlc.brand.externalVetting.order()` — `POST /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vettingClass` | string | Yes | Identifies the vetting classification. |
| `brandId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.brand.externalVetting.order('brandId', {
  evpId: '550e8400-e29b-41d4-a716-446655440000',
  vettingClass: 'STANDARD',
});

console.log(response.createDate);
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider. If the vetting provider confirms validity of the record, it will be
saved with the brand and will be considered for future campaign qualification.

`client.messaging10dlc.brand.externalVetting.imports()` — `PUT /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vettingId` | string (UUID) | Yes | Unique ID that identifies a vetting transaction performed by... |
| `brandId` | string (UUID) | Yes |  |
| `vettingToken` | string | No | Required by some providers for vetting record confirmation. |

```javascript
const response = await client.messaging10dlc.brand.externalVetting.imports('brandId', {
  evpId: '550e8400-e29b-41d4-a716-446655440000',
  vettingId: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.createDate);
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Revet Brand

This operation allows you to revet the brand. However, revetting is allowed once after the successful brand registration and thereafter limited to once every 3 months.

`client.messaging10dlc.brand.revet()` — `PUT /10dlc/brand/{brandId}/revet`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
const telnyxBrand = await client.messaging10dlc.brand.revet('BXXX001');

console.log(telnyxBrand.identityStatus);
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process by looking it up with the brand ID.

The response includes delivery status, verification dates, and detailed delivery information.

`client.messaging10dlc.brand.retrieveSMSOtpStatus()` — `GET /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | The Brand ID for which to query OTP status |

```javascript
const response = await client.messaging10dlc.brand.retrieveSMSOtpStatus(
  '4b20019b-043a-78f8-0657-b3be3f4b4002',
);

console.log(response.brandId);
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`client.messaging10dlc.brand.triggerSMSOtp()` — `POST /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pinSms` | string | Yes | SMS message template to send the OTP. |
| `successSms` | string | Yes | SMS message to send upon successful OTP verification |
| `brandId` | string (UUID) | Yes | The Brand ID for which to trigger the OTP |

```javascript
const response = await client.messaging10dlc.brand.triggerSMSOtp(
  '4b20019b-043a-78f8-0657-b3be3f4b4002',
  { pinSms: 'Your PIN is @OTP_PIN@', successSms: 'Verification successful!' },
);

console.log(response.brandId);
```

Key response fields: `response.data.brandId, response.data.referenceId`

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification. **Verification Flow:**

1. User receives OTP via SMS after triggering
2.

`client.messaging10dlc.brand.verifySMSOtp()` — `PUT /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `otpPin` | string | Yes | The OTP PIN received via SMS |
| `brandId` | string (UUID) | Yes | The Brand ID for which to verify the OTP |

```javascript
await client.messaging10dlc.brand.verifySMSOtp('4b20019b-043a-78f8-0657-b3be3f4b4002', {
  otpPin: '123456',
});
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`client.messaging10dlc.campaign.list()` — `GET /10dlc/campaign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, campaignId, -campaignId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```javascript
// Automatically fetches more pages as needed.
for await (const campaignListResponse of client.messaging10dlc.campaign.list({
  brandId: 'BXXX001',
})) {
  console.log(campaignListResponse.ageGated);
}
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`client.messaging10dlc.campaign.acceptSharing()` — `POST /10dlc/campaign/acceptSharing/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | TCR's ID for the campaign to import |

```javascript
const response = await client.messaging10dlc.campaign.acceptSharing('C26F1KLZN');

console.log(response);
```

## Get Campaign Cost

`client.messaging10dlc.campaign.usecase.getCost()` — `GET /10dlc/campaign/usecase/cost`

```javascript
const response = await client.messaging10dlc.campaign.usecase.getCost({ usecase: 'CUSTOMER_CARE' });

console.log(response.campaignUsecase);
```

Key response fields: `response.data.campaignUsecase, response.data.description, response.data.monthlyCost`

## Update campaign

Update a campaign's properties by `campaignId`. **Please note:** only sample messages are editable.

`client.messaging10dlc.campaign.update()` — `PUT /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |
| `resellerId` | string (UUID) | No | Alphanumeric identifier of the reseller that you want to ass... |
| `sample1` | string | No | Message sample. |
| `sample2` | string | No | Message sample. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaign.update('CXXX001');

console.log(telnyxCampaignCsp.brandId);
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Deactivate campaign

Terminate a campaign. Note that once deactivated, a campaign cannot be restored.

`client.messaging10dlc.campaign.deactivate()` — `DELETE /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.campaign.deactivate('CXXX001');

console.log(response.time);
```

Key response fields: `response.data.message, response.data.record_type, response.data.time`

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status. The appeal is recorded for manual compliance team review and the campaign status is reset to TCR_ACCEPTED. Note: Appeal forwarding is handled manually to allow proper review before incurring upstream charges.

`client.messaging10dlc.campaign.submitAppeal()` — `POST /10dlc/campaign/{campaignId}/appeal`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appealReason` | string | Yes | Detailed explanation of why the campaign should be reconside... |
| `campaignId` | string (UUID) | Yes | The Telnyx campaign identifier |

```javascript
const response = await client.messaging10dlc.campaign.submitAppeal(
  '5eb13888-32b7-4cab-95e6-d834dde21d64',
  {
    appeal_reason:
      'The website has been updated to include the required privacy policy and terms of service.',
  },
);

console.log(response.appealed_at);
```

Key response fields: `response.data.appealed_at`

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`client.messaging10dlc.campaign.getMnoMetadata()` — `GET /10dlc/campaign/{campaignId}/mnoMetadata`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```javascript
const response = await client.messaging10dlc.campaign.getMnoMetadata('CXXX001');

console.log(response['10999']);
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`client.messaging10dlc.campaign.getOperationStatus()` — `GET /10dlc/campaign/{campaignId}/operationStatus`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.campaign.getOperationStatus('CXXX001');

console.log(response);
```

## Get OSR campaign attributes

`client.messaging10dlc.campaign.osr.getAttributes()` — `GET /10dlc/campaign/{campaignId}/osr/attributes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.campaign.osr.getAttributes('CXXX001');

console.log(response);
```

## Get Sharing Status

`client.messaging10dlc.campaign.getSharingStatus()` — `GET /10dlc/campaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```javascript
const response = await client.messaging10dlc.campaign.getSharingStatus('CXXX001');

console.log(response.sharedByMe);
```

Key response fields: `response.data.sharedByMe, response.data.sharedWithMe`

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted. In other words, shared but pending campaigns are currently omitted
from the response from this endpoint.

`client.messaging10dlc.partnerCampaigns.listSharedByMe()` — `GET /10dlc/partnerCampaign/sharedByMe`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```javascript
// Automatically fetches more pages as needed.
for await (const partnerCampaignListSharedByMeResponse of client.messaging10dlc.partnerCampaigns.listSharedByMe()) {
  console.log(partnerCampaignListSharedByMeResponse.brandId);
}
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Sharing Status

`client.messaging10dlc.partnerCampaigns.retrieveSharingStatus()` — `GET /10dlc/partnerCampaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```javascript
const response = await client.messaging10dlc.partnerCampaigns.retrieveSharingStatus('CXXX001');

console.log(response);
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion. This endpoint is currently limited to only returning shared campaigns that Telnyx has accepted. In other words, shared but pending campaigns are currently omitted from the response from this endpoint.

`client.messaging10dlc.partnerCampaigns.list()` — `GET /10dlc/partner_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, brandDisplayName, -brandDisplayName, tcrBrandId, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```javascript
// Automatically fetches more pages as needed.
for await (const telnyxDownstreamCampaign of client.messaging10dlc.partnerCampaigns.list()) {
  console.log(telnyxDownstreamCampaign.tcrBrandId);
}
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`client.messaging10dlc.partnerCampaigns.retrieve()` — `GET /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```javascript
const telnyxDownstreamCampaign = await client.messaging10dlc.partnerCampaigns.retrieve(
  'campaignId',
);

console.log(telnyxDownstreamCampaign.tcrBrandId);
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Update Single Shared Campaign

Update campaign details by `campaignId`. **Please note:** Only webhook urls are editable.

`client.messaging10dlc.partnerCampaigns.update()` — `PATCH /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |
| `webhookURL` | string | No | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | No | Webhook failover to which campaign status updates are sent. |

```javascript
const telnyxDownstreamCampaign = await client.messaging10dlc.partnerCampaigns.update('CXXX001');

console.log(telnyxDownstreamCampaign.tcrBrandId);
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign. **Please note:** if you want to assign phone numbers to a campaign that you did not create with Telnyx 10DLC services, this endpoint allows that provided that you've shared the campaign with Telnyx. In this case, only provide the parameter, `tcrCampaignId`, and not `campaignId`.

`client.messaging10dlc.phoneNumberAssignmentByProfile.assign()` — `POST /10dlc/phoneNumberAssignmentByProfile`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | The ID of the messaging profile that you want to link to the... |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified mes... |
| `tcrCampaignId` | string (UUID) | No | The TCR ID of the shared campaign you want to link to the sp... |

```javascript
const response = await client.messaging10dlc.phoneNumberAssignmentByProfile.assign({
  messagingProfileId: '4001767e-ce0f-4cae-9d5f-0d5e636e7809',
    campaignId: 'CXXX001',
});

console.log(response.messagingProfileId);
```

Key response fields: `response.data.campaignId, response.data.messagingProfileId, response.data.taskId`

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`client.messaging10dlc.phoneNumberAssignmentByProfile.retrieveStatus()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.phoneNumberAssignmentByProfile.retrieveStatus(
  'taskId',
);

console.log(response.status);
```

Key response fields: `response.data.status, response.data.createdAt, response.data.taskId`

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`client.messaging10dlc.phoneNumberAssignmentByProfile.listPhoneNumberStatus()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `recordsPerPage` | integer | No |  |
| `page` | integer | No |  |

```javascript
const response = await client.messaging10dlc.phoneNumberAssignmentByProfile.listPhoneNumberStatus(
  'taskId',
);

console.log(response.records);
```

Key response fields: `response.data.records`

## List phone number campaigns

`client.messaging10dlc.phoneNumberCampaigns.list()` — `GET /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignmentStatus, -assignmentStatus, createdAt, -createdAt, phoneNumber, ...) | No | Specifies the sort order for results. |
| `recordsPerPage` | integer | No |  |
| `page` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberCampaign of client.messaging10dlc.phoneNumberCampaigns.list()) {
  console.log(phoneNumberCampaign.campaignId);
}
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`client.messaging10dlc.phoneNumberCampaigns.retrieve()` — `GET /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.retrieve(
  'phoneNumber',
);

console.log(phoneNumberCampaign.campaignId);
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Create New Phone Number Campaign

`client.messaging10dlc.phoneNumberCampaigns.update()` — `PUT /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |
| `phoneNumber` | string (E.164) | Yes |  |

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.update('phoneNumber', {
  campaignId: '4b300178-131c-d902-d54e-72d90ba1620j',
  phoneNumber: '+18005550199',
});

console.log(phoneNumberCampaign.campaignId);
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`client.messaging10dlc.phoneNumberCampaigns.delete()` — `DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.delete('+13125550001');

console.log(phoneNumberCampaign.campaignId);
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```javascript
// In your webhook handler (e.g., Express — use raw body, not parsed JSON):
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body.toString(), {
      headers: req.headers,
    });
    // Signature valid — event is the parsed webhook payload
    console.log('Received event:', event.data.event_type);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `campaignStatusUpdate` | `10dlc.campaign.status_update` | Campaign Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
