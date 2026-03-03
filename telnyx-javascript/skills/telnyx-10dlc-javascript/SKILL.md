---
name: telnyx-10dlc-javascript
description: >-
  Register brands and campaigns for 10DLC (10-digit long code) A2P messaging
  compliance in the US. Manage campaign assignments to phone numbers. This skill
  provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: 10dlc
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - JavaScript

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

## List Brands

This endpoint is used to list all brands associated with your organization.

`GET /10dlc/brand`

```javascript
// Automatically fetches more pages as needed.
for await (const brandListResponse of client.messaging10dlc.brand.list()) {
  console.log(brandListResponse.identityStatus);
}
```

## Create Brand

This endpoint is used to create a new brand.

`POST /10dlc/brand` — Required: `entityType`, `displayName`, `country`, `email`, `vertical`

Optional: `businessContactEmail` (string), `city` (string), `companyName` (string), `ein` (string), `firstName` (string), `ipAddress` (string), `isReseller` (boolean), `lastName` (string), `mobilePhone` (string), `mock` (boolean), `phone` (string), `postalCode` (string), `state` (string), `stockExchange` (object), `stockSymbol` (string), `street` (string), `webhookFailoverURL` (string), `webhookURL` (string), `website` (string)

```javascript
const telnyxBrand = await client.messaging10dlc.brand.create({
  country: 'US',
  displayName: 'ABC Mobile',
  email: 'email',
  entityType: 'PRIVATE_PROFIT',
  vertical: 'TECHNOLOGY',
});

console.log(telnyxBrand.identityStatus);
```

## Get Brand Feedback By Id

Get feedback about a brand by ID.

`GET /10dlc/brand/feedback/{brandId}`

```javascript
const response = await client.messaging10dlc.brand.getFeedback('brandId');

console.log(response.brandId);
```

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`GET /10dlc/brand/smsOtp/{referenceId}`

```javascript
const response = await client.messaging10dlc.brand.getSMSOtpByReference('OTP4B2001');

console.log(response.brandId);
```

## Get Brand

Retrieve a brand by `brandId`.

`GET /10dlc/brand/{brandId}`

```javascript
const brand = await client.messaging10dlc.brand.retrieve('brandId');

console.log(brand);
```

## Update Brand

Update a brand's attributes by `brandId`.

`PUT /10dlc/brand/{brandId}` — Required: `entityType`, `displayName`, `country`, `email`, `vertical`

Optional: `altBusinessId` (string), `altBusinessIdType` (enum), `businessContactEmail` (string), `city` (string), `companyName` (string), `ein` (string), `firstName` (string), `identityStatus` (enum), `ipAddress` (string), `isReseller` (boolean), `lastName` (string), `phone` (string), `postalCode` (string), `state` (string), `stockExchange` (object), `stockSymbol` (string), `street` (string), `webhookFailoverURL` (string), `webhookURL` (string), `website` (string)

```javascript
const telnyxBrand = await client.messaging10dlc.brand.update('brandId', {
  country: 'US',
  displayName: 'ABC Mobile',
  email: 'email',
  entityType: 'PRIVATE_PROFIT',
  vertical: 'TECHNOLOGY',
});

console.log(telnyxBrand.identityStatus);
```

## Delete Brand

Delete Brand.

`DELETE /10dlc/brand/{brandId}`

```javascript
await client.messaging10dlc.brand.delete('brandId');
```

## Resend brand 2FA email

`POST /10dlc/brand/{brandId}/2faEmail`

```javascript
await client.messaging10dlc.brand.resend2faEmail('brandId');
```

## List External Vettings

Get list of valid external vetting record for a given brand

`GET /10dlc/brand/{brandId}/externalVetting`

```javascript
const externalVettings = await client.messaging10dlc.brand.externalVetting.list('brandId');

console.log(externalVettings);
```

## Order Brand External Vetting

Order new external vetting for a brand

`POST /10dlc/brand/{brandId}/externalVetting` — Required: `evpId`, `vettingClass`

```javascript
const response = await client.messaging10dlc.brand.externalVetting.order('brandId', {
  evpId: 'evpId',
  vettingClass: 'vettingClass',
});

console.log(response.createDate);
```

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider.

`PUT /10dlc/brand/{brandId}/externalVetting` — Required: `evpId`, `vettingId`

Optional: `vettingToken` (string)

```javascript
const response = await client.messaging10dlc.brand.externalVetting.imports('brandId', {
  evpId: 'evpId',
  vettingId: 'vettingId',
});

console.log(response.createDate);
```

## Revet Brand

This operation allows you to revet the brand.

`PUT /10dlc/brand/{brandId}/revet`

```javascript
const telnyxBrand = await client.messaging10dlc.brand.revet('brandId');

console.log(telnyxBrand.identityStatus);
```

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

`GET /10dlc/brand/{brandId}/smsOtp`

```javascript
const response = await client.messaging10dlc.brand.retrieveSMSOtpStatus(
  '4b20019b-043a-78f8-0657-b3be3f4b4002',
);

console.log(response.brandId);
```

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`POST /10dlc/brand/{brandId}/smsOtp` — Required: `pinSms`, `successSms`

```javascript
const response = await client.messaging10dlc.brand.triggerSMSOtp(
  '4b20019b-043a-78f8-0657-b3be3f4b4002',
  { pinSms: 'Your PIN is @OTP_PIN@', successSms: 'Verification successful!' },
);

console.log(response.brandId);
```

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`PUT /10dlc/brand/{brandId}/smsOtp` — Required: `otpPin`

```javascript
await client.messaging10dlc.brand.verifySMSOtp('4b20019b-043a-78f8-0657-b3be3f4b4002', {
  otpPin: '123456',
});
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`GET /10dlc/campaign`

```javascript
// Automatically fetches more pages as needed.
for await (const campaignListResponse of client.messaging10dlc.campaign.list({
  brandId: 'brandId',
})) {
  console.log(campaignListResponse.ageGated);
}
```

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`POST /10dlc/campaign/acceptSharing/{campaignId}`

```javascript
const response = await client.messaging10dlc.campaign.acceptSharing('C26F1KLZN');

console.log(response);
```

## Get Campaign Cost

`GET /10dlc/campaign/usecase/cost`

```javascript
const response = await client.messaging10dlc.campaign.usecase.getCost({ usecase: 'usecase' });

console.log(response.campaignUsecase);
```

## Get campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/campaign/{campaignId}`

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaign.retrieve('campaignId');

console.log(telnyxCampaignCsp.brandId);
```

## Update campaign

Update a campaign's properties by `campaignId`.

`PUT /10dlc/campaign/{campaignId}`

Optional: `autoRenewal` (boolean), `helpMessage` (string), `messageFlow` (string), `resellerId` (string), `sample1` (string), `sample2` (string), `sample3` (string), `sample4` (string), `sample5` (string), `webhookFailoverURL` (string), `webhookURL` (string)

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaign.update('campaignId');

console.log(telnyxCampaignCsp.brandId);
```

## Deactivate campaign

Terminate a campaign.

`DELETE /10dlc/campaign/{campaignId}`

```javascript
const response = await client.messaging10dlc.campaign.deactivate('campaignId');

console.log(response.time);
```

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status.

`POST /10dlc/campaign/{campaignId}/appeal` — Required: `appeal_reason`

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

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`GET /10dlc/campaign/{campaignId}/mnoMetadata`

```javascript
const response = await client.messaging10dlc.campaign.getMnoMetadata('campaignId');

console.log(response['10999']);
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`GET /10dlc/campaign/{campaignId}/operationStatus`

```javascript
const response = await client.messaging10dlc.campaign.getOperationStatus('campaignId');

console.log(response);
```

## Get OSR campaign attributes

`GET /10dlc/campaign/{campaignId}/osr/attributes`

```javascript
const response = await client.messaging10dlc.campaign.osr.getAttributes('campaignId');

console.log(response);
```

## Get Sharing Status

`GET /10dlc/campaign/{campaignId}/sharing`

```javascript
const response = await client.messaging10dlc.campaign.getSharingStatus('campaignId');

console.log(response.sharedByMe);
```

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign...

`POST /10dlc/campaignBuilder` — Required: `brandId`, `description`, `usecase`

Optional: `ageGated` (boolean), `autoRenewal` (boolean), `directLending` (boolean), `embeddedLink` (boolean), `embeddedLinkSample` (string), `embeddedPhone` (boolean), `helpKeywords` (string), `helpMessage` (string), `messageFlow` (string), `mnoIds` (array[integer]), `numberPool` (boolean), `optinKeywords` (string), `optinMessage` (string), `optoutKeywords` (string), `optoutMessage` (string), `privacyPolicyLink` (string), `referenceId` (string), `resellerId` (string), `sample1` (string), `sample2` (string), `sample3` (string), `sample4` (string), `sample5` (string), `subUsecases` (array[string]), `subscriberHelp` (boolean), `subscriberOptin` (boolean), `subscriberOptout` (boolean), `tag` (array[string]), `termsAndConditions` (boolean), `termsAndConditionsLink` (string), `webhookFailoverURL` (string), `webhookURL` (string)

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaignBuilder.submit({
  brandId: 'brandId',
  description: 'description',
  usecase: 'usecase',
});

console.log(telnyxCampaignCsp.brandId);
```

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

```javascript
const response = await client.messaging10dlc.campaignBuilder.brand.qualifyByUsecase('usecase', {
  brandId: 'brandId',
});

console.log(response.annualFee);
```

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted.

`GET /10dlc/partnerCampaign/sharedByMe`

```javascript
// Automatically fetches more pages as needed.
for await (const partnerCampaignListSharedByMeResponse of client.messaging10dlc.partnerCampaigns.listSharedByMe()) {
  console.log(partnerCampaignListSharedByMeResponse.brandId);
}
```

## Get Sharing Status

`GET /10dlc/partnerCampaign/{campaignId}/sharing`

```javascript
const response = await client.messaging10dlc.partnerCampaigns.retrieveSharingStatus('campaignId');

console.log(response);
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion.

`GET /10dlc/partner_campaigns`

```javascript
// Automatically fetches more pages as needed.
for await (const telnyxDownstreamCampaign of client.messaging10dlc.partnerCampaigns.list()) {
  console.log(telnyxDownstreamCampaign.tcrBrandId);
}
```

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/partner_campaigns/{campaignId}`

```javascript
const telnyxDownstreamCampaign = await client.messaging10dlc.partnerCampaigns.retrieve(
  'campaignId',
);

console.log(telnyxDownstreamCampaign.tcrBrandId);
```

## Update Single Shared Campaign

Update campaign details by `campaignId`.

`PATCH /10dlc/partner_campaigns/{campaignId}`

Optional: `webhookFailoverURL` (string), `webhookURL` (string)

```javascript
const telnyxDownstreamCampaign = await client.messaging10dlc.partnerCampaigns.update('campaignId');

console.log(telnyxDownstreamCampaign.tcrBrandId);
```

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign.

`POST /10dlc/phoneNumberAssignmentByProfile` — Required: `messagingProfileId`

Optional: `campaignId` (string), `tcrCampaignId` (string)

```javascript
const response = await client.messaging10dlc.phoneNumberAssignmentByProfile.assign({
  messagingProfileId: '4001767e-ce0f-4cae-9d5f-0d5e636e7809',
});

console.log(response.messagingProfileId);
```

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

```javascript
const response = await client.messaging10dlc.phoneNumberAssignmentByProfile.retrieveStatus(
  'taskId',
);

console.log(response.status);
```

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

```javascript
const response = await client.messaging10dlc.phoneNumberAssignmentByProfile.listPhoneNumberStatus(
  'taskId',
);

console.log(response.records);
```

## List phone number campaigns

`GET /10dlc/phone_number_campaigns`

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberCampaign of client.messaging10dlc.phoneNumberCampaigns.list()) {
  console.log(phoneNumberCampaign.campaignId);
}
```

## Create New Phone Number Campaign

`POST /10dlc/phone_number_campaigns` — Required: `phoneNumber`, `campaignId`

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.create({
  campaignId: '4b300178-131c-d902-d54e-72d90ba1620j',
  phoneNumber: '+18005550199',
});

console.log(phoneNumberCampaign.campaignId);
```

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`GET /10dlc/phone_number_campaigns/{phoneNumber}`

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.retrieve(
  'phoneNumber',
);

console.log(phoneNumberCampaign.campaignId);
```

## Create New Phone Number Campaign

`PUT /10dlc/phone_number_campaigns/{phoneNumber}` — Required: `phoneNumber`, `campaignId`

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.update('phoneNumber', {
  campaignId: '4b300178-131c-d902-d54e-72d90ba1620j',
  phoneNumber: '+18005550199',
});

console.log(phoneNumberCampaign.campaignId);
```

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

```javascript
const phoneNumberCampaign = await client.messaging10dlc.phoneNumberCampaigns.delete('phoneNumber');

console.log(phoneNumberCampaign.campaignId);
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
