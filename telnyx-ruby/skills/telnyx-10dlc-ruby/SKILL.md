---
name: telnyx-10dlc-ruby
description: >-
  Register brands and campaigns for 10DLC (10-digit long code) A2P messaging
  compliance in the US. Manage campaign assignments to phone numbers. This skill
  provides Ruby SDK examples.
metadata:
  author: telnyx
  product: 10dlc
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## List Brands

This endpoint is used to list all brands associated with your organization.

`GET /10dlc/brand`

```ruby
page = client.messaging_10dlc.brand.list

puts(page)
```

## Create Brand

This endpoint is used to create a new brand.

`POST /10dlc/brand` — Required: `entityType`, `displayName`, `country`, `email`, `vertical`

Optional: `businessContactEmail` (string), `city` (string), `companyName` (string), `ein` (string), `firstName` (string), `ipAddress` (string), `isReseller` (boolean), `lastName` (string), `mobilePhone` (string), `mock` (boolean), `phone` (string), `postalCode` (string), `state` (string), `stockExchange` (object), `stockSymbol` (string), `street` (string), `webhookFailoverURL` (string), `webhookURL` (string), `website` (string)

```ruby
telnyx_brand = client.messaging_10dlc.brand.create(
  country: "US",
  display_name: "ABC Mobile",
  email: "email",
  entity_type: :PRIVATE_PROFIT,
  vertical: :TECHNOLOGY
)

puts(telnyx_brand)
```

## Get Brand Feedback By Id

Get feedback about a brand by ID.

`GET /10dlc/brand/feedback/{brandId}`

```ruby
response = client.messaging_10dlc.brand.get_feedback("brandId")

puts(response)
```

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`GET /10dlc/brand/smsOtp/{referenceId}`

```ruby
response = client.messaging_10dlc.brand.get_sms_otp_by_reference("OTP4B2001")

puts(response)
```

## Get Brand

Retrieve a brand by `brandId`.

`GET /10dlc/brand/{brandId}`

```ruby
brand = client.messaging_10dlc.brand.retrieve("brandId")

puts(brand)
```

## Update Brand

Update a brand's attributes by `brandId`.

`PUT /10dlc/brand/{brandId}` — Required: `entityType`, `displayName`, `country`, `email`, `vertical`

Optional: `altBusinessId` (string), `altBusinessIdType` (enum), `businessContactEmail` (string), `city` (string), `companyName` (string), `ein` (string), `firstName` (string), `identityStatus` (enum), `ipAddress` (string), `isReseller` (boolean), `lastName` (string), `phone` (string), `postalCode` (string), `state` (string), `stockExchange` (object), `stockSymbol` (string), `street` (string), `webhookFailoverURL` (string), `webhookURL` (string), `website` (string)

```ruby
telnyx_brand = client.messaging_10dlc.brand.update(
  "brandId",
  country: "US",
  display_name: "ABC Mobile",
  email: "email",
  entity_type: :PRIVATE_PROFIT,
  vertical: :TECHNOLOGY
)

puts(telnyx_brand)
```

## Delete Brand

Delete Brand.

`DELETE /10dlc/brand/{brandId}`

```ruby
result = client.messaging_10dlc.brand.delete("brandId")

puts(result)
```

## Resend brand 2FA email

`POST /10dlc/brand/{brandId}/2faEmail`

```ruby
result = client.messaging_10dlc.brand.resend_2fa_email("brandId")

puts(result)
```

## List External Vettings

Get list of valid external vetting record for a given brand

`GET /10dlc/brand/{brandId}/externalVetting`

```ruby
external_vettings = client.messaging_10dlc.brand.external_vetting.list("brandId")

puts(external_vettings)
```

## Order Brand External Vetting

Order new external vetting for a brand

`POST /10dlc/brand/{brandId}/externalVetting` — Required: `evpId`, `vettingClass`

```ruby
response = client.messaging_10dlc.brand.external_vetting.order(
  "brandId",
  evp_id: "evpId",
  vetting_class: "vettingClass"
)

puts(response)
```

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider.

`PUT /10dlc/brand/{brandId}/externalVetting` — Required: `evpId`, `vettingId`

Optional: `vettingToken` (string)

```ruby
response = client.messaging_10dlc.brand.external_vetting.imports("brandId", evp_id: "evpId", vetting_id: "vettingId")

puts(response)
```

## Revet Brand

This operation allows you to revet the brand.

`PUT /10dlc/brand/{brandId}/revet`

```ruby
telnyx_brand = client.messaging_10dlc.brand.revet("brandId")

puts(telnyx_brand)
```

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

`GET /10dlc/brand/{brandId}/smsOtp`

```ruby
response = client.messaging_10dlc.brand.retrieve_sms_otp_status("4b20019b-043a-78f8-0657-b3be3f4b4002")

puts(response)
```

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`POST /10dlc/brand/{brandId}/smsOtp` — Required: `pinSms`, `successSms`

```ruby
response = client.messaging_10dlc.brand.trigger_sms_otp(
  "4b20019b-043a-78f8-0657-b3be3f4b4002",
  pin_sms: "Your PIN is @OTP_PIN@",
  success_sms: "Verification successful!"
)

puts(response)
```

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`PUT /10dlc/brand/{brandId}/smsOtp` — Required: `otpPin`

```ruby
result = client.messaging_10dlc.brand.verify_sms_otp("4b20019b-043a-78f8-0657-b3be3f4b4002", otp_pin: "123456")

puts(result)
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`GET /10dlc/campaign`

```ruby
page = client.messaging_10dlc.campaign.list(brand_id: "brandId")

puts(page)
```

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`POST /10dlc/campaign/acceptSharing/{campaignId}`

```ruby
response = client.messaging_10dlc.campaign.accept_sharing("C26F1KLZN")

puts(response)
```

## Get Campaign Cost

`GET /10dlc/campaign/usecase/cost`

```ruby
response = client.messaging_10dlc.campaign.usecase.get_cost(usecase: "usecase")

puts(response)
```

## Get campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/campaign/{campaignId}`

```ruby
telnyx_campaign_csp = client.messaging_10dlc.campaign.retrieve("campaignId")

puts(telnyx_campaign_csp)
```

## Update campaign

Update a campaign's properties by `campaignId`.

`PUT /10dlc/campaign/{campaignId}`

Optional: `autoRenewal` (boolean), `helpMessage` (string), `messageFlow` (string), `resellerId` (string), `sample1` (string), `sample2` (string), `sample3` (string), `sample4` (string), `sample5` (string), `webhookFailoverURL` (string), `webhookURL` (string)

```ruby
telnyx_campaign_csp = client.messaging_10dlc.campaign.update("campaignId")

puts(telnyx_campaign_csp)
```

## Deactivate campaign

Terminate a campaign.

`DELETE /10dlc/campaign/{campaignId}`

```ruby
response = client.messaging_10dlc.campaign.deactivate("campaignId")

puts(response)
```

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status.

`POST /10dlc/campaign/{campaignId}/appeal` — Required: `appeal_reason`

```ruby
response = client.messaging_10dlc.campaign.submit_appeal(
  "5eb13888-32b7-4cab-95e6-d834dde21d64",
  appeal_reason: "The website has been updated to include the required privacy policy and terms of service."
)

puts(response)
```

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`GET /10dlc/campaign/{campaignId}/mnoMetadata`

```ruby
response = client.messaging_10dlc.campaign.get_mno_metadata("campaignId")

puts(response)
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`GET /10dlc/campaign/{campaignId}/operationStatus`

```ruby
response = client.messaging_10dlc.campaign.get_operation_status("campaignId")

puts(response)
```

## Get OSR campaign attributes

`GET /10dlc/campaign/{campaignId}/osr/attributes`

```ruby
response = client.messaging_10dlc.campaign.osr.get_attributes("campaignId")

puts(response)
```

## Get Sharing Status

`GET /10dlc/campaign/{campaignId}/sharing`

```ruby
response = client.messaging_10dlc.campaign.get_sharing_status("campaignId")

puts(response)
```

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign...

`POST /10dlc/campaignBuilder` — Required: `brandId`, `description`, `usecase`

Optional: `ageGated` (boolean), `autoRenewal` (boolean), `directLending` (boolean), `embeddedLink` (boolean), `embeddedLinkSample` (string), `embeddedPhone` (boolean), `helpKeywords` (string), `helpMessage` (string), `messageFlow` (string), `mnoIds` (array[integer]), `numberPool` (boolean), `optinKeywords` (string), `optinMessage` (string), `optoutKeywords` (string), `optoutMessage` (string), `privacyPolicyLink` (string), `referenceId` (string), `resellerId` (string), `sample1` (string), `sample2` (string), `sample3` (string), `sample4` (string), `sample5` (string), `subUsecases` (array[string]), `subscriberHelp` (boolean), `subscriberOptin` (boolean), `subscriberOptout` (boolean), `tag` (array[string]), `termsAndConditions` (boolean), `termsAndConditionsLink` (string), `webhookFailoverURL` (string), `webhookURL` (string)

```ruby
telnyx_campaign_csp = client.messaging_10dlc.campaign_builder.submit(
  brand_id: "brandId",
  description: "description",
  usecase: "usecase"
)

puts(telnyx_campaign_csp)
```

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

```ruby
response = client.messaging_10dlc.campaign_builder.brand.qualify_by_usecase("usecase", brand_id: "brandId")

puts(response)
```

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted.

`GET /10dlc/partnerCampaign/sharedByMe`

```ruby
page = client.messaging_10dlc.partner_campaigns.list_shared_by_me

puts(page)
```

## Get Sharing Status

`GET /10dlc/partnerCampaign/{campaignId}/sharing`

```ruby
response = client.messaging_10dlc.partner_campaigns.retrieve_sharing_status("campaignId")

puts(response)
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion.

`GET /10dlc/partner_campaigns`

```ruby
page = client.messaging_10dlc.partner_campaigns.list

puts(page)
```

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`GET /10dlc/partner_campaigns/{campaignId}`

```ruby
telnyx_downstream_campaign = client.messaging_10dlc.partner_campaigns.retrieve("campaignId")

puts(telnyx_downstream_campaign)
```

## Update Single Shared Campaign

Update campaign details by `campaignId`.

`PATCH /10dlc/partner_campaigns/{campaignId}`

Optional: `webhookFailoverURL` (string), `webhookURL` (string)

```ruby
telnyx_downstream_campaign = client.messaging_10dlc.partner_campaigns.update("campaignId")

puts(telnyx_downstream_campaign)
```

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign.

`POST /10dlc/phoneNumberAssignmentByProfile` — Required: `messagingProfileId`

Optional: `campaignId` (string), `tcrCampaignId` (string)

```ruby
response = client.messaging_10dlc.phone_number_assignment_by_profile.assign(
  messaging_profile_id: "4001767e-ce0f-4cae-9d5f-0d5e636e7809"
)

puts(response)
```

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

```ruby
response = client.messaging_10dlc.phone_number_assignment_by_profile.retrieve_status("taskId")

puts(response)
```

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

```ruby
response = client.messaging_10dlc.phone_number_assignment_by_profile.list_phone_number_status("taskId")

puts(response)
```

## List phone number campaigns

`GET /10dlc/phone_number_campaigns`

```ruby
page = client.messaging_10dlc.phone_number_campaigns.list

puts(page)
```

## Create New Phone Number Campaign

`POST /10dlc/phone_number_campaigns` — Required: `phoneNumber`, `campaignId`

```ruby
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.create(
  campaign_id: "4b300178-131c-d902-d54e-72d90ba1620j",
  phone_number: "+18005550199"
)

puts(phone_number_campaign)
```

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`GET /10dlc/phone_number_campaigns/{phoneNumber}`

```ruby
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.retrieve("phoneNumber")

puts(phone_number_campaign)
```

## Create New Phone Number Campaign

`PUT /10dlc/phone_number_campaigns/{phoneNumber}` — Required: `phoneNumber`, `campaignId`

```ruby
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.update(
  "phoneNumber",
  campaign_id: "4b300178-131c-d902-d54e-72d90ba1620j",
  phone_number: "+18005550199"
)

puts(phone_number_campaign)
```

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

```ruby
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.delete("phoneNumber")

puts(phone_number_campaign)
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
