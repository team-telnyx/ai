<!-- SDK reference: telnyx-10dlc-javascript -->

# Telnyx 10DLC - JavaScript

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
  const telnyxBrand = await client.messaging10dlc.brand.create({
    country: 'US',
    displayName: 'ABC Mobile',
    email: 'support@example.com',
    entityType: 'PRIVATE_PROFIT',
    vertical: 'TECHNOLOGY',
  });
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
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

## Operational Caveats

- 10DLC is sequential: create the brand first, then submit the campaign, then attach messaging infrastructure such as the messaging profile.
- Registration calls are not enough by themselves. Messaging cannot use the campaign until the assignment step completes successfully.
- Treat registration status fields as part of the control flow. Do not assume the campaign is send-ready until the returned status fields confirm it.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Create a brand

Brand registration is the entrypoint for any US A2P 10DLC campaign flow.

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
| ... | | | +16 optional params in the API Details section below |

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

Primary response fields:
- `telnyxBrand.brandId`
- `telnyxBrand.identityStatus`
- `telnyxBrand.status`
- `telnyxBrand.displayName`
- `telnyxBrand.state`
- `telnyxBrand.altBusinessId`

### Submit a campaign

Campaign submission is the compliance-critical step that determines whether traffic can be provisioned.

`client.messaging10dlc.campaignBuilder.submit()` — `POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `description` | string | Yes | Summary description of this campaign. |
| `usecase` | string | Yes | Campaign usecase. |
| `ageGated` | boolean | No | Age gated message content in campaign. |
| `autoRenewal` | boolean | No | Campaign subscription auto-renewal option. |
| `directLending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in the API Details section below |

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaignBuilder.submit({
  brandId: 'BXXXXXX',
  description: 'Two-factor authentication messages',
  usecase: '2FA',
    sampleMessages: ["Your verification code is {{code}}"],
});

console.log(telnyxCampaignCsp.brandId);
```

Primary response fields:
- `telnyxCampaignCsp.campaignId`
- `telnyxCampaignCsp.brandId`
- `telnyxCampaignCsp.campaignStatus`
- `telnyxCampaignCsp.submissionStatus`
- `telnyxCampaignCsp.failureReasons`
- `telnyxCampaignCsp.status`

### Assign a messaging profile to a campaign

Messaging profile assignment is the practical handoff from registration to send-ready messaging infrastructure.

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

Primary response fields:
- `response.messagingProfileId`
- `response.campaignId`
- `response.taskId`
- `response.tcrCampaignId`

---

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

If you need webhook fields that are not listed inline here, read [the webhook payload reference](references/api-details.md#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Get Brand

Inspect the current state of an existing brand registration.

`client.messaging10dlc.brand.retrieve()` — `GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
const brand = await client.messaging10dlc.brand.retrieve('BXXX001');

console.log(brand);
```

Primary response fields:
- `brand.status`
- `brand.state`
- `brand.altBusinessId`
- `brand.altBusinessIdType`
- `brand.assignedCampaignsCount`
- `brand.brandId`

### Qualify By Usecase

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Primary response fields:
- `response.annualFee`
- `response.maxSubUsecases`
- `response.minSubUsecases`
- `response.mnoMetadata`
- `response.monthlyFee`
- `response.quarterlyFee`

### Create New Phone Number Campaign

Create or provision an additional resource when the core tasks do not cover this flow.

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

Primary response fields:
- `phoneNumberCampaign.assignmentStatus`
- `phoneNumberCampaign.brandId`
- `phoneNumberCampaign.campaignId`
- `phoneNumberCampaign.createdAt`
- `phoneNumberCampaign.failureReasons`
- `phoneNumberCampaign.phoneNumber`

### Get campaign

Inspect the current state of an existing campaign registration.

`client.messaging10dlc.campaign.retrieve()` — `GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```javascript
const telnyxCampaignCsp = await client.messaging10dlc.campaign.retrieve('CXXX001');

console.log(telnyxCampaignCsp.brandId);
```

Primary response fields:
- `telnyxCampaignCsp.status`
- `telnyxCampaignCsp.ageGated`
- `telnyxCampaignCsp.autoRenewal`
- `telnyxCampaignCsp.billedDate`
- `telnyxCampaignCsp.brandDisplayName`
- `telnyxCampaignCsp.brandId`

### List Brands

Inspect available resources or choose an existing resource before mutating it.

`client.messaging10dlc.brand.list()` — `GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No |  |
| `recordsPerPage` | integer | No | number of records per page. |
| ... | | | +6 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const brandListResponse of client.messaging10dlc.brand.list()) {
  console.log(brandListResponse.identityStatus);
}
```

Primary response fields:
- `brandListResponse.page`
- `brandListResponse.records`
- `brandListResponse.totalRecords`

### Get Brand Feedback By Id

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.messaging10dlc.brand.getFeedback()` — `GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```javascript
const response = await client.messaging10dlc.brand.getFeedback('BXXX001');

console.log(response.brandId);
```

Primary response fields:
- `response.brandId`
- `response.category`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Get Brand SMS OTP Status | `client.messaging10dlc.brand.getSMSOtpByReference()` | `GET /10dlc/brand/smsOtp/{referenceId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `referenceId` |
| Update Brand | `client.messaging10dlc.brand.update()` | `PUT /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `entityType`, `displayName`, `country`, `email`, +2 more |
| Delete Brand | `client.messaging10dlc.brand.delete()` | `DELETE /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `brandId` |
| Resend brand 2FA email | `client.messaging10dlc.brand.resend2faEmail()` | `POST /10dlc/brand/{brandId}/2faEmail` | Create or provision an additional resource when the core tasks do not cover this flow. | `brandId` |
| List External Vettings | `client.messaging10dlc.brand.externalVetting.list()` | `GET /10dlc/brand/{brandId}/externalVetting` | Fetch the current state before updating, deleting, or making control-flow decisions. | `brandId` |
| Order Brand External Vetting | `client.messaging10dlc.brand.externalVetting.order()` | `POST /10dlc/brand/{brandId}/externalVetting` | Create or provision an additional resource when the core tasks do not cover this flow. | `evpId`, `vettingClass`, `brandId` |
| Import External Vetting Record | `client.messaging10dlc.brand.externalVetting.imports()` | `PUT /10dlc/brand/{brandId}/externalVetting` | Modify an existing resource without recreating it. | `evpId`, `vettingId`, `brandId` |
| Revet Brand | `client.messaging10dlc.brand.revet()` | `PUT /10dlc/brand/{brandId}/revet` | Modify an existing resource without recreating it. | `brandId` |
| Get Brand SMS OTP Status by Brand ID | `client.messaging10dlc.brand.retrieveSMSOtpStatus()` | `GET /10dlc/brand/{brandId}/smsOtp` | Fetch the current state before updating, deleting, or making control-flow decisions. | `brandId` |
| Trigger Brand SMS OTP | `client.messaging10dlc.brand.triggerSMSOtp()` | `POST /10dlc/brand/{brandId}/smsOtp` | Create or provision an additional resource when the core tasks do not cover this flow. | `pinSms`, `successSms`, `brandId` |
| Verify Brand SMS OTP | `client.messaging10dlc.brand.verifySMSOtp()` | `PUT /10dlc/brand/{brandId}/smsOtp` | Modify an existing resource without recreating it. | `otpPin`, `brandId` |
| List Campaigns | `client.messaging10dlc.campaign.list()` | `GET /10dlc/campaign` | Inspect available resources or choose an existing resource before mutating it. | None |
| Accept Shared Campaign | `client.messaging10dlc.campaign.acceptSharing()` | `POST /10dlc/campaign/acceptSharing/{campaignId}` | Create or provision an additional resource when the core tasks do not cover this flow. | `campaignId` |
| Get Campaign Cost | `client.messaging10dlc.campaign.usecase.getCost()` | `GET /10dlc/campaign/usecase/cost` | Inspect available resources or choose an existing resource before mutating it. | None |
| Update campaign | `client.messaging10dlc.campaign.update()` | `PUT /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `campaignId` |
| Deactivate campaign | `client.messaging10dlc.campaign.deactivate()` | `DELETE /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `campaignId` |
| Submit campaign appeal for manual review | `client.messaging10dlc.campaign.submitAppeal()` | `POST /10dlc/campaign/{campaignId}/appeal` | Create or provision an additional resource when the core tasks do not cover this flow. | `appealReason`, `campaignId` |
| Get Campaign Mno Metadata | `client.messaging10dlc.campaign.getMnoMetadata()` | `GET /10dlc/campaign/{campaignId}/mnoMetadata` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Get campaign operation status | `client.messaging10dlc.campaign.getOperationStatus()` | `GET /10dlc/campaign/{campaignId}/operationStatus` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Get OSR campaign attributes | `client.messaging10dlc.campaign.osr.getAttributes()` | `GET /10dlc/campaign/{campaignId}/osr/attributes` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Get Sharing Status | `client.messaging10dlc.campaign.getSharingStatus()` | `GET /10dlc/campaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| List shared partner campaigns | `client.messaging10dlc.partnerCampaigns.listSharedByMe()` | `GET /10dlc/partnerCampaign/sharedByMe` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Sharing Status | `client.messaging10dlc.partnerCampaigns.retrieveSharingStatus()` | `GET /10dlc/partnerCampaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| List Shared Campaigns | `client.messaging10dlc.partnerCampaigns.list()` | `GET /10dlc/partner_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Shared Campaign | `client.messaging10dlc.partnerCampaigns.retrieve()` | `GET /10dlc/partner_campaigns/{campaignId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Update Single Shared Campaign | `client.messaging10dlc.partnerCampaigns.update()` | `PATCH /10dlc/partner_campaigns/{campaignId}` | Modify an existing resource without recreating it. | `campaignId` |
| Get Assignment Task Status | `client.messaging10dlc.phoneNumberAssignmentByProfile.retrieveStatus()` | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `taskId` |
| Get Phone Number Status | `client.messaging10dlc.phoneNumberAssignmentByProfile.listPhoneNumberStatus()` | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers` | Fetch the current state before updating, deleting, or making control-flow decisions. | `taskId` |
| List phone number campaigns | `client.messaging10dlc.phoneNumberCampaigns.list()` | `GET /10dlc/phone_number_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Phone Number Campaign | `client.messaging10dlc.phoneNumberCampaigns.retrieve()` | `GET /10dlc/phone_number_campaigns/{phoneNumber}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `phoneNumber` |
| Create New Phone Number Campaign | `client.messaging10dlc.phoneNumberCampaigns.update()` | `PUT /10dlc/phone_number_campaigns/{phoneNumber}` | Modify an existing resource without recreating it. | `phoneNumber`, `campaignId`, `phoneNumber` |
| Delete Phone Number Campaign | `client.messaging10dlc.phoneNumberCampaigns.delete()` | `DELETE /10dlc/phone_number_campaigns/{phoneNumber}` | Remove, detach, or clean up an existing resource. | `phoneNumber` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
