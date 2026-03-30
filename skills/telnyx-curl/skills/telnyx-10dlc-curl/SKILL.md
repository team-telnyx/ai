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
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10DLC - curl

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

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## Operational Caveats

- 10DLC is sequential: create the brand first, then submit the campaign, then attach messaging infrastructure such as the messaging profile.
- Registration calls are not enough by themselves. Messaging cannot use the campaign until the assignment step completes successfully.
- Treat registration status fields as part of the control flow. Do not assume the campaign is send-ready until the returned status fields confirm it.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Create a brand

Brand registration is the entrypoint for any US A2P 10DLC campaign flow.

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

Primary response fields:
- `.data.brandId`
- `.data.identityStatus`
- `.data.status`
- `.data.displayName`
- `.data.state`
- `.data.altBusinessId`

### Submit a campaign

Campaign submission is the compliance-critical step that determines whether traffic can be provisioned.

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

Primary response fields:
- `.data.campaignId`
- `.data.brandId`
- `.data.campaignStatus`
- `.data.submissionStatus`
- `.data.failureReasons`
- `.data.status`

### Assign a messaging profile to a campaign

Messaging profile assignment is the practical handoff from registration to send-ready messaging infrastructure.

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

Primary response fields:
- `.data.messagingProfileId`
- `.data.campaignId`
- `.data.taskId`
- `.data.tcrCampaignId`

---

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

`GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/BXXX001"
```

Primary response fields:
- `.data.status`
- `.data.state`
- `.data.altBusinessId`
- `.data.altBusinessIdType`
- `.data.assignedCampaignsCount`
- `.data.brandId`

### Qualify By Usecase

Fetch the current state before updating, deleting, or making control-flow decisions.

`GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `usecase` | string | Yes |  |
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaignBuilder/brand/BXXX001/usecase/{usecase}"
```

Primary response fields:
- `.data.annualFee`
- `.data.maxSubUsecases`
- `.data.minSubUsecases`
- `.data.mnoMetadata`
- `.data.monthlyFee`
- `.data.quarterlyFee`

### Create New Phone Number Campaign

Create or provision an additional resource when the core tasks do not cover this flow.

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

Primary response fields:
- `.data.assignmentStatus`
- `.data.brandId`
- `.data.campaignId`
- `.data.createdAt`
- `.data.failureReasons`
- `.data.phoneNumber`

### Get campaign

Inspect the current state of an existing campaign registration.

`GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/campaign/CXXX001"
```

Primary response fields:
- `.data.status`
- `.data.ageGated`
- `.data.autoRenewal`
- `.data.billedDate`
- `.data.brandDisplayName`
- `.data.brandId`

### List Brands

Inspect available resources or choose an existing resource before mutating it.

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

Primary response fields:
- `.data.page`
- `.data.records`
- `.data.totalRecords`

### Get Brand Feedback By Id

Fetch the current state before updating, deleting, or making control-flow decisions.

`GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/brand/feedback/BXXX001"
```

Primary response fields:
- `.data.brandId`
- `.data.category`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Get Brand SMS OTP Status | HTTP only | `GET /10dlc/brand/smsOtp/{referenceId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `referenceId` |
| Update Brand | HTTP only | `PUT /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `entityType`, `displayName`, `country`, `email`, +2 more |
| Delete Brand | HTTP only | `DELETE /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `brandId` |
| Resend brand 2FA email | HTTP only | `POST /10dlc/brand/{brandId}/2faEmail` | Create or provision an additional resource when the core tasks do not cover this flow. | `brandId` |
| List External Vettings | HTTP only | `GET /10dlc/brand/{brandId}/externalVetting` | Fetch the current state before updating, deleting, or making control-flow decisions. | `brandId` |
| Order Brand External Vetting | HTTP only | `POST /10dlc/brand/{brandId}/externalVetting` | Create or provision an additional resource when the core tasks do not cover this flow. | `evpId`, `vettingClass`, `brandId` |
| Import External Vetting Record | HTTP only | `PUT /10dlc/brand/{brandId}/externalVetting` | Modify an existing resource without recreating it. | `evpId`, `vettingId`, `brandId` |
| Revet Brand | HTTP only | `PUT /10dlc/brand/{brandId}/revet` | Modify an existing resource without recreating it. | `brandId` |
| Get Brand SMS OTP Status by Brand ID | HTTP only | `GET /10dlc/brand/{brandId}/smsOtp` | Fetch the current state before updating, deleting, or making control-flow decisions. | `brandId` |
| Trigger Brand SMS OTP | HTTP only | `POST /10dlc/brand/{brandId}/smsOtp` | Create or provision an additional resource when the core tasks do not cover this flow. | `pinSms`, `successSms`, `brandId` |
| Verify Brand SMS OTP | HTTP only | `PUT /10dlc/brand/{brandId}/smsOtp` | Modify an existing resource without recreating it. | `otpPin`, `brandId` |
| List Campaigns | HTTP only | `GET /10dlc/campaign` | Inspect available resources or choose an existing resource before mutating it. | None |
| Accept Shared Campaign | HTTP only | `POST /10dlc/campaign/acceptSharing/{campaignId}` | Create or provision an additional resource when the core tasks do not cover this flow. | `campaignId` |
| Get Campaign Cost | HTTP only | `GET /10dlc/campaign/usecase/cost` | Inspect available resources or choose an existing resource before mutating it. | None |
| Update campaign | HTTP only | `PUT /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `campaignId` |
| Deactivate campaign | HTTP only | `DELETE /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `campaignId` |
| Submit campaign appeal for manual review | HTTP only | `POST /10dlc/campaign/{campaignId}/appeal` | Create or provision an additional resource when the core tasks do not cover this flow. | `appeal_reason`, `campaignId` |
| Get Campaign Mno Metadata | HTTP only | `GET /10dlc/campaign/{campaignId}/mnoMetadata` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Get campaign operation status | HTTP only | `GET /10dlc/campaign/{campaignId}/operationStatus` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Get OSR campaign attributes | HTTP only | `GET /10dlc/campaign/{campaignId}/osr/attributes` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Get Sharing Status | HTTP only | `GET /10dlc/campaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| List shared partner campaigns | HTTP only | `GET /10dlc/partnerCampaign/sharedByMe` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Sharing Status | HTTP only | `GET /10dlc/partnerCampaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| List Shared Campaigns | HTTP only | `GET /10dlc/partner_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Shared Campaign | HTTP only | `GET /10dlc/partner_campaigns/{campaignId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaignId` |
| Update Single Shared Campaign | HTTP only | `PATCH /10dlc/partner_campaigns/{campaignId}` | Modify an existing resource without recreating it. | `campaignId` |
| Get Assignment Task Status | HTTP only | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `taskId` |
| Get Phone Number Status | HTTP only | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers` | Fetch the current state before updating, deleting, or making control-flow decisions. | `taskId` |
| List phone number campaigns | HTTP only | `GET /10dlc/phone_number_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Phone Number Campaign | HTTP only | `GET /10dlc/phone_number_campaigns/{phoneNumber}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `phoneNumber` |
| Create New Phone Number Campaign | HTTP only | `PUT /10dlc/phone_number_campaigns/{phoneNumber}` | Modify an existing resource without recreating it. | `phoneNumber`, `campaignId`, `phoneNumber` |
| Delete Phone Number Campaign | HTTP only | `DELETE /10dlc/phone_number_campaigns/{phoneNumber}` | Remove, detach, or clean up an existing resource. | `phoneNumber` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
