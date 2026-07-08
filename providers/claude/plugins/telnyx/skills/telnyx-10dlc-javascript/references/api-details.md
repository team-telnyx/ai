# 10DLC (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

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

### Create Brand — `client.messaging10dlc.brand.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `companyName` | string | (Required for Non-profit/private/public) Legal company name. |
| `firstName` | string | First name of business contact. |
| `lastName` | string | Last name of business contact. |
| `ein` | string | (Required for Non-profit) Government assigned corporate tax ID. |
| `phone` | string | Valid phone number in e.164 international format. |
| `street` | string | Street number and name. |
| `city` | string | City name |
| `state` | string | State. |
| `postalCode` | string | Postal codes. |
| `stockSymbol` | string | (Required for public company) stock symbol. |
| `stockExchange` | object | (Required for public company) stock exchange. |
| `ipAddress` | string (IPv4/IPv6) | IP address of the browser requesting to create brand identity. |
| `website` | string | Brand website URL. |
| `isReseller` | boolean |  |
| `mock` | boolean | Mock brand for testing purposes. |
| `mobilePhone` | string | Valid mobile phone number in e.164 international format. |
| `businessContactEmail` | string | Business contact email. |
| `webhookURL` | string | Webhook URL for brand status updates. |
| `webhookFailoverURL` | string | Webhook failover URL for brand status updates. |

### Update Brand — `client.messaging10dlc.brand.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `companyName` | string | (Required for Non-profit/private/public) Legal company name. |
| `firstName` | string | First name of business contact. |
| `lastName` | string | Last name of business contact. |
| `ein` | string | (Required for Non-profit) Government assigned corporate tax ID. |
| `phone` | string | Valid phone number in e.164 international format. |
| `street` | string | Street number and name. |
| `city` | string | City name |
| `state` | string | State. |
| `postalCode` | string | Postal codes. |
| `stockSymbol` | string | (Required for public company) stock symbol. |
| `stockExchange` | object | (Required for public company) stock exchange. |
| `ipAddress` | string (IPv4/IPv6) | IP address of the browser requesting to create brand identity. |
| `website` | string | Brand website URL. |
| `altBusinessIdType` | enum (NONE, DUNS, GIIN, LEI) | An enumeration. |
| `isReseller` | boolean |  |
| `identityStatus` | enum (VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED) | The verification status of an active brand |
| `businessContactEmail` | string | Business contact email. |
| `webhookURL` | string | Webhook URL for brand status updates. |
| `webhookFailoverURL` | string | Webhook failover URL for brand status updates. |
| `altBusinessId` | string (UUID) | Alternate business identifier such as DUNS, LEI, or GIIN |

### Import External Vetting Record — `client.messaging10dlc.brand.externalVetting.imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `vettingToken` | string | Required by some providers for vetting record confirmation. |

### Update campaign — `client.messaging10dlc.campaign.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `resellerId` | string (UUID) | Alphanumeric identifier of the reseller that you want to associate with this ... |
| `sample1` | string | Message sample. |
| `sample2` | string | Message sample. |
| `sample3` | string | Message sample. |
| `sample4` | string | Message sample. |
| `sample5` | string | Message sample. |
| `messageFlow` | string | Message flow description. |
| `helpMessage` | string | Help message of the campaign. |
| `autoRenewal` | boolean | Help message of the campaign. |
| `webhookURL` | string | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | Webhook failover to which campaign status updates are sent. |

### Submit Campaign — `client.messaging10dlc.campaignBuilder.submit()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ageGated` | boolean | Age gated message content in campaign. |
| `autoRenewal` | boolean | Campaign subscription auto-renewal option. |
| `directLending` | boolean | Direct lending or loan arrangement |
| `embeddedLink` | boolean | Does message generated by the campaign include URL link in SMS? |
| `embeddedPhone` | boolean | Does message generated by the campaign include phone number in SMS? |
| `helpKeywords` | string | Subscriber help keywords. |
| `helpMessage` | string | Help message of the campaign. |
| `messageFlow` | string | Message flow description. |
| `mnoIds` | array[integer] | Submit campaign to given list of MNOs by MNO's network ID. |
| `numberPool` | boolean | Does campaign utilize pool of phone numbers? |
| `optinKeywords` | string | Subscriber opt-in keywords. |
| `optinMessage` | string | Subscriber opt-in message. |
| `optoutKeywords` | string | Subscriber opt-out keywords. |
| `optoutMessage` | string | Subscriber opt-out message. |
| `referenceId` | string (UUID) | Caller supplied campaign reference ID. |
| `resellerId` | string (UUID) | Alphanumeric identifier of the reseller that you want to associate with this ... |
| `sample1` | string | Message sample. |
| `sample2` | string | Message sample. |
| `sample3` | string | Message sample. |
| `sample4` | string | Message sample. |
| `sample5` | string | Message sample. |
| `subUsecases` | array[string] | Campaign sub-usecases. |
| `subscriberHelp` | boolean | Does campaign responds to help keyword(s)? |
| `subscriberOptin` | boolean | Does campaign require subscriber to opt-in before SMS is sent to subscriber? |
| `subscriberOptout` | boolean | Does campaign support subscriber opt-out keyword(s)? |
| `tag` | array[string] | Tags to be set on the Campaign. |
| `termsAndConditions` | boolean | Is terms and conditions accepted? |
| `privacyPolicyLink` | string | Link to the campaign's privacy policy. |
| `termsAndConditionsLink` | string | Link to the campaign's terms and conditions. |
| `embeddedLinkSample` | string | Sample of an embedded link that will be sent to subscribers. |
| `webhookURL` | string | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | Failover webhook to which campaign status updates are sent. |

### Update Single Shared Campaign — `client.messaging10dlc.partnerCampaigns.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookURL` | string | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | Webhook failover to which campaign status updates are sent. |

### Assign Messaging Profile To Campaign — `client.messaging10dlc.phoneNumberAssignmentByProfile.assign()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tcrCampaignId` | string (UUID) | The TCR ID of the shared campaign you want to link to the specified messaging... |
| `campaignId` | string (UUID) | The ID of the campaign you want to link to the specified messaging profile. |

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
