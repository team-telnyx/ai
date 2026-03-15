---
name: telnyx-10dlc-python
description: >-
  10DLC brand and campaign registration for US A2P messaging compliance. Assign
  phone numbers to campaigns.
metadata:
  author: telnyx
  product: 10dlc
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10Dlc - Python

## Core Workflow

### Prerequisites

1. Create a messaging profile (see telnyx-messaging-profiles-python)
2. Buy US 10DLC phone number(s) and assign to the messaging profile (see telnyx-numbers-python)

### Steps

1. **Register brand**: `client.brands.create(entity_type=..., ein=..., legal_name=...)`
2. **(Optional) Vet brand**: `Improves throughput score — vetting is automatic but can be expedited`
3. **Create campaign**: `client.campaigns.create(brand_id=..., use_case=..., sample_messages=[...])`
4. **Assign number to campaign**: `client.campaign_phone_numbers.create(campaign_id=..., phone_number_id=...)`
5. **Wait for MNO_PROVISIONED status**: `Campaign must be provisioned before sending`

### Common mistakes

- NEVER send messages before the campaign reaches MNO_PROVISIONED status — messages will be filtered/blocked
- NEVER use a P.O. box or missing website in brand registration — causes rejection
- NEVER omit opt-out language in sample messages — campaign will be rejected
- NEVER mismatch content with registered campaign use case — causes carrier filtering even after registration
- Sole Proprietor brands: max 1 campaign, max 1 phone number per campaign

**Related skills**: telnyx-messaging-python, telnyx-messaging-profiles-python, telnyx-numbers-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.brands.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create Brand

This endpoint is used to create a new brand. A brand is an entity created by The Campaign Registry (TCR) that represents an organization or a company. It is this entity that TCR created campaigns will be associated with.

`client.messaging_10dlc.brand.create()` — `POST /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_type` | object | Yes | Entity type behind the brand. |
| `display_name` | string | Yes | Display name, marketing name, or DBA name of the brand. |
| `country` | string | Yes | ISO2 2 characters country code. |
| `email` | string | Yes | Valid email address of brand support contact. |
| `vertical` | object | Yes | Vertical or industry segment of the brand. |
| `company_name` | string | No | (Required for Non-profit/private/public) Legal company name. |
| `first_name` | string | No | First name of business contact. |
| `last_name` | string | No | Last name of business contact. |
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

```python
telnyx_brand = client.messaging_10dlc.brand.create(
    country="US",
    display_name="ABC Mobile",
    email="support@example.com",
    entity_type="PRIVATE_PROFIT",
    vertical="TECHNOLOGY",
)
print(telnyx_brand.identity_status)
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand

Retrieve a brand by `brandId`.

`client.messaging_10dlc.brand.retrieve()` — `GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes |  |

```python
brand = client.messaging_10dlc.brand.retrieve(
    "brandId",
)
print(brand)
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`client.messaging_10dlc.campaign_builder.brand.qualify_by_usecase()` — `GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `usecase` | string | Yes |  |
| `brand_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.campaign_builder.brand.qualify_by_usecase(
    usecase="CUSTOMER_CARE",
    brand_id="brandId",
)
print(response.annual_fee)
```

Key response fields: `response.data.annualFee, response.data.maxSubUsecases, response.data.minSubUsecases`

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign to is qualified for the desired use case of that campaign. **Please note:** After campaign creation, you'll only be able to edit the campaign's sample messages.

`client.messaging_10dlc.campaign_builder.submit()` — `POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `description` | string | Yes | Summary description of this campaign. |
| `usecase` | string | Yes | Campaign usecase. |
| `age_gated` | boolean | No | Age gated message content in campaign. |
| `auto_renewal` | boolean | No | Campaign subscription auto-renewal option. |
| `direct_lending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in [references/api-details.md](references/api-details.md) |

```python
telnyx_campaign_csp = client.messaging_10dlc.campaign_builder.submit(
    brand_id="BXXXXXX",
    description="Two-factor authentication messages",
    usecase="2FA",
    sample_messages=["Your verification code is {{code}}"],
)
print(telnyx_campaign_csp.brand_id)
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Create New Phone Number Campaign

`client.messaging_10dlc.phone_number_campaigns.create()` — `POST /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaign_id` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |

```python
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.create(
    campaign_id="4b300178-131c-d902-d54e-72d90ba1620j",
    phone_number="+18005550199",
)
print(phone_number_campaign.campaign_id)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Get campaign

Retrieve campaign details by `campaignId`.

`client.messaging_10dlc.campaign.retrieve()` — `GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |

```python
telnyx_campaign_csp = client.messaging_10dlc.campaign.retrieve(
    "campaignId",
)
print(telnyx_campaign_csp.brand_id)
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## List Brands

This endpoint is used to list all brands associated with your organization.

`client.messaging_10dlc.brand.list()` — `GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No |  |
| `records_per_page` | integer | No | number of records per page. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.messaging_10dlc.brand.list()
page = page.records[0]
print(page.identity_status)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Brand Feedback By Id

Get feedback about a brand by ID. This endpoint can be used after creating or revetting
a brand. Possible values for `.category[].id`:

* `TAX_ID` - Data mismatch related to tax id and its associated properties. * `STOCK_SYMBOL` - Non public entity registered as a public for profit entity or
  the stock information mismatch.

`client.messaging_10dlc.brand.get_feedback()` — `GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.brand.get_feedback(
    "brandId",
)
print(response.brand_id)
```

Key response fields: `response.data.brandId, response.data.category`

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification. This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process.

`client.messaging_10dlc.brand.get_sms_otp_by_reference()` — `GET /10dlc/brand/smsOtp/{referenceId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reference_id` | string (UUID) | Yes | The reference ID returned when the OTP was initially trigger... |
| `brand_id` | string (UUID) | No | Filter by Brand ID for easier lookup in portal applications |

```python
response = client.messaging_10dlc.brand.get_sms_otp_by_reference(
    reference_id="OTP4B2001",
)
print(response.brand_id)
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Update Brand

Update a brand's attributes by `brandId`.

`client.messaging_10dlc.brand.update()` — `PUT /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_type` | object | Yes | Entity type behind the brand. |
| `display_name` | string | Yes | Display or marketing name of the brand. |
| `country` | string | Yes | ISO2 2 characters country code. |
| `email` | string | Yes | Valid email address of brand support contact. |
| `vertical` | object | Yes | Vertical or industry segment of the brand. |
| `brand_id` | string (UUID) | Yes |  |
| `alt_business_id_type` | enum (NONE, DUNS, GIIN, LEI) | No | An enumeration. |
| `identity_status` | enum (VERIFIED, UNVERIFIED, SELF_DECLARED, VETTED_VERIFIED) | No | The verification status of an active brand |
| `company_name` | string | No | (Required for Non-profit/private/public) Legal company name. |
| ... | | | +17 optional params in [references/api-details.md](references/api-details.md) |

```python
telnyx_brand = client.messaging_10dlc.brand.update(
    brand_id="brandId",
    country="US",
    display_name="ABC Mobile",
    email="support@example.com",
    entity_type="PRIVATE_PROFIT",
    vertical="TECHNOLOGY",
)
print(telnyx_brand.identity_status)
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Delete Brand

Delete Brand. This endpoint is used to delete a brand. Note the brand cannot be deleted if it contains one or more active campaigns, the campaigns need to be inactive and at least 3 months old due to billing purposes.

`client.messaging_10dlc.brand.delete()` — `DELETE /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes |  |

```python
client.messaging_10dlc.brand.delete(
    "brandId",
)
```

## Resend brand 2FA email

`client.messaging_10dlc.brand.resend_2fa_email()` — `POST /10dlc/brand/{brandId}/2faEmail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes |  |

```python
client.messaging_10dlc.brand.resend_2fa_email(
    "brandId",
)
```

## List External Vettings

Get list of valid external vetting record for a given brand

`client.messaging_10dlc.brand.external_vetting.list()` — `GET /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes |  |

```python
external_vettings = client.messaging_10dlc.brand.external_vetting.list(
    "brandId",
)
print(external_vettings)
```

## Order Brand External Vetting

Order new external vetting for a brand

`client.messaging_10dlc.brand.external_vetting.order()` — `POST /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evp_id` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vetting_class` | string | Yes | Identifies the vetting classification. |
| `brand_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.brand.external_vetting.order(
    brand_id="brandId",
    evp_id="evpId",
    vetting_class="vettingClass",
)
print(response.create_date)
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider. If the vetting provider confirms validity of the record, it will be
saved with the brand and will be considered for future campaign qualification.

`client.messaging_10dlc.brand.external_vetting.imports()` — `PUT /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evp_id` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vetting_id` | string (UUID) | Yes | Unique ID that identifies a vetting transaction performed by... |
| `brand_id` | string (UUID) | Yes |  |
| `vetting_token` | string | No | Required by some providers for vetting record confirmation. |

```python
response = client.messaging_10dlc.brand.external_vetting.imports(
    brand_id="brandId",
    evp_id="evpId",
    vetting_id="vettingId",
)
print(response.create_date)
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Revet Brand

This operation allows you to revet the brand. However, revetting is allowed once after the successful brand registration and thereafter limited to once every 3 months.

`client.messaging_10dlc.brand.revet()` — `PUT /10dlc/brand/{brandId}/revet`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes |  |

```python
telnyx_brand = client.messaging_10dlc.brand.revet(
    "brandId",
)
print(telnyx_brand.identity_status)
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process by looking it up with the brand ID.

The response includes delivery status, verification dates, and detailed delivery information.

`client.messaging_10dlc.brand.retrieve_sms_otp_status()` — `GET /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand_id` | string (UUID) | Yes | The Brand ID for which to query OTP status |

```python
response = client.messaging_10dlc.brand.retrieve_sms_otp_status(
    "4b20019b-043a-78f8-0657-b3be3f4b4002",
)
print(response.brand_id)
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`client.messaging_10dlc.brand.trigger_sms_otp()` — `POST /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin_sms` | string | Yes | SMS message template to send the OTP. |
| `success_sms` | string | Yes | SMS message to send upon successful OTP verification |
| `brand_id` | string (UUID) | Yes | The Brand ID for which to trigger the OTP |

```python
response = client.messaging_10dlc.brand.trigger_sms_otp(
    brand_id="4b20019b-043a-78f8-0657-b3be3f4b4002",
    pin_sms="Your PIN is @OTP_PIN@",
    success_sms="Verification successful!",
)
print(response.brand_id)
```

Key response fields: `response.data.brandId, response.data.referenceId`

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification. **Verification Flow:**

1. User receives OTP via SMS after triggering
2.

`client.messaging_10dlc.brand.verify_sms_otp()` — `PUT /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `otp_pin` | string | Yes | The OTP PIN received via SMS |
| `brand_id` | string (UUID) | Yes | The Brand ID for which to verify the OTP |

```python
client.messaging_10dlc.brand.verify_sms_otp(
    brand_id="4b20019b-043a-78f8-0657-b3be3f4b4002",
    otp_pin="123456",
)
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`client.messaging_10dlc.campaign.list()` — `GET /10dlc/campaign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, campaignId, -campaignId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `records_per_page` | integer | No | The amount of records per page, limited to between 1 and 500... |

```python
page = client.messaging_10dlc.campaign.list(
    brand_id="brandId",
)
page = page.records[0]
print(page.age_gated)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`client.messaging_10dlc.campaign.accept_sharing()` — `POST /10dlc/campaign/acceptSharing/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes | TCR's ID for the campaign to import |

```python
response = client.messaging_10dlc.campaign.accept_sharing(
    "C26F1KLZN",
)
print(response)
```

## Get Campaign Cost

`client.messaging_10dlc.campaign.usecase.get_cost()` — `GET /10dlc/campaign/usecase/cost`

```python
response = client.messaging_10dlc.campaign.usecase.get_cost(
    usecase="CUSTOMER_CARE",
)
print(response.campaign_usecase)
```

Key response fields: `response.data.campaignUsecase, response.data.description, response.data.monthlyCost`

## Update campaign

Update a campaign's properties by `campaignId`. **Please note:** only sample messages are editable.

`client.messaging_10dlc.campaign.update()` — `PUT /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |
| `reseller_id` | string (UUID) | No | Alphanumeric identifier of the reseller that you want to ass... |
| `sample1` | string | No | Message sample. |
| `sample2` | string | No | Message sample. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```python
telnyx_campaign_csp = client.messaging_10dlc.campaign.update(
    campaign_id="campaignId",
)
print(telnyx_campaign_csp.brand_id)
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Deactivate campaign

Terminate a campaign. Note that once deactivated, a campaign cannot be restored.

`client.messaging_10dlc.campaign.deactivate()` — `DELETE /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.campaign.deactivate(
    "campaignId",
)
print(response.time)
```

Key response fields: `response.data.message, response.data.record_type, response.data.time`

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status. The appeal is recorded for manual compliance team review and the campaign status is reset to TCR_ACCEPTED. Note: Appeal forwarding is handled manually to allow proper review before incurring upstream charges.

`client.messaging_10dlc.campaign.submit_appeal()` — `POST /10dlc/campaign/{campaignId}/appeal`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appeal_reason` | string | Yes | Detailed explanation of why the campaign should be reconside... |
| `campaign_id` | string (UUID) | Yes | The Telnyx campaign identifier |

```python
response = client.messaging_10dlc.campaign.submit_appeal(
    campaign_id="5eb13888-32b7-4cab-95e6-d834dde21d64",
    appeal_reason="The website has been updated to include the required privacy policy and terms of service.",
)
print(response.appealed_at)
```

Key response fields: `response.data.appealed_at`

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`client.messaging_10dlc.campaign.get_mno_metadata()` — `GET /10dlc/campaign/{campaignId}/mnoMetadata`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes | ID of the campaign in question |

```python
response = client.messaging_10dlc.campaign.get_mno_metadata(
    "campaignId",
)
print(response._10999)
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`client.messaging_10dlc.campaign.get_operation_status()` — `GET /10dlc/campaign/{campaignId}/operationStatus`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.campaign.get_operation_status(
    "campaignId",
)
print(response)
```

## Get OSR campaign attributes

`client.messaging_10dlc.campaign.osr.get_attributes()` — `GET /10dlc/campaign/{campaignId}/osr/attributes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.campaign.osr.get_attributes(
    "campaignId",
)
print(response)
```

## Get Sharing Status

`client.messaging_10dlc.campaign.get_sharing_status()` — `GET /10dlc/campaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes | ID of the campaign in question |

```python
response = client.messaging_10dlc.campaign.get_sharing_status(
    "campaignId",
)
print(response.shared_by_me)
```

Key response fields: `response.data.sharedByMe, response.data.sharedWithMe`

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted. In other words, shared but pending campaigns are currently omitted
from the response from this endpoint.

`client.messaging_10dlc.partner_campaigns.list_shared_by_me()` — `GET /10dlc/partnerCampaign/sharedByMe`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | The 1-indexed page number to get. |
| `records_per_page` | integer | No | The amount of records per page, limited to between 1 and 500... |

```python
page = client.messaging_10dlc.partner_campaigns.list_shared_by_me()
page = page.records[0]
print(page.brand_id)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Sharing Status

`client.messaging_10dlc.partner_campaigns.retrieve_sharing_status()` — `GET /10dlc/partnerCampaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes | ID of the campaign in question |

```python
response = client.messaging_10dlc.partner_campaigns.retrieve_sharing_status(
    "campaignId",
)
print(response)
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion. This endpoint is currently limited to only returning shared campaigns that Telnyx has accepted. In other words, shared but pending campaigns are currently omitted from the response from this endpoint.

`client.messaging_10dlc.partner_campaigns.list()` — `GET /10dlc/partner_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, brandDisplayName, -brandDisplayName, tcrBrandId, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `records_per_page` | integer | No | The amount of records per page, limited to between 1 and 500... |

```python
page = client.messaging_10dlc.partner_campaigns.list()
page = page.records[0]
print(page.tcr_brand_id)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`client.messaging_10dlc.partner_campaigns.retrieve()` — `GET /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |

```python
telnyx_downstream_campaign = client.messaging_10dlc.partner_campaigns.retrieve(
    "campaignId",
)
print(telnyx_downstream_campaign.tcr_brand_id)
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Update Single Shared Campaign

Update campaign details by `campaignId`. **Please note:** Only webhook urls are editable.

`client.messaging_10dlc.partner_campaigns.update()` — `PATCH /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string (UUID) | Yes |  |
| `webhook_url` | string | No | Webhook to which campaign status updates are sent. |
| `webhook_failover_url` | string | No | Webhook failover to which campaign status updates are sent. |

```python
telnyx_downstream_campaign = client.messaging_10dlc.partner_campaigns.update(
    campaign_id="campaignId",
)
print(telnyx_downstream_campaign.tcr_brand_id)
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign. **Please note:** if you want to assign phone numbers to a campaign that you did not create with Telnyx 10DLC services, this endpoint allows that provided that you've shared the campaign with Telnyx. In this case, only provide the parameter, `tcrCampaignId`, and not `campaignId`.

`client.messaging_10dlc.phone_number_assignment_by_profile.assign()` — `POST /10dlc/phoneNumberAssignmentByProfile`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | The ID of the messaging profile that you want to link to the... |
| `campaign_id` | string (UUID) | Yes | The ID of the campaign you want to link to the specified mes... |
| `tcr_campaign_id` | string (UUID) | No | The TCR ID of the shared campaign you want to link to the sp... |

```python
response = client.messaging_10dlc.phone_number_assignment_by_profile.assign(
    messaging_profile_id="4001767e-ce0f-4cae-9d5f-0d5e636e7809",
    campaign_id="CXXX001",
)
print(response.messaging_profile_id)
```

Key response fields: `response.data.campaignId, response.data.messagingProfileId, response.data.taskId`

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`client.messaging_10dlc.phone_number_assignment_by_profile.retrieve_status()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |

```python
response = client.messaging_10dlc.phone_number_assignment_by_profile.retrieve_status(
    "taskId",
)
print(response.status)
```

Key response fields: `response.data.status, response.data.createdAt, response.data.taskId`

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`client.messaging_10dlc.phone_number_assignment_by_profile.list_phone_number_status()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |
| `records_per_page` | integer | No |  |
| `page` | integer | No |  |

```python
response = client.messaging_10dlc.phone_number_assignment_by_profile.list_phone_number_status(
    task_id="taskId",
)
print(response.records)
```

Key response fields: `response.data.records`

## List phone number campaigns

`client.messaging_10dlc.phone_number_campaigns.list()` — `GET /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignmentStatus, -assignmentStatus, createdAt, -createdAt, phoneNumber, ...) | No | Specifies the sort order for results. |
| `records_per_page` | integer | No |  |
| `page` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.messaging_10dlc.phone_number_campaigns.list()
page = page.records[0]
print(page.campaign_id)
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`client.messaging_10dlc.phone_number_campaigns.retrieve()` — `GET /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes |  |

```python
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.retrieve(
    "phoneNumber",
)
print(phone_number_campaign.campaign_id)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Create New Phone Number Campaign

`client.messaging_10dlc.phone_number_campaigns.update()` — `PUT /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaign_id` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |
| `phone_number` | string (E.164) | Yes |  |

```python
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.update(
    campaign_phone_number="phoneNumber",
    campaign_id="4b300178-131c-d902-d54e-72d90ba1620j",
    phone_number="+18005550199",
)
print(phone_number_campaign.campaign_id)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`client.messaging_10dlc.phone_number_campaigns.delete()` — `DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes |  |

```python
phone_number_campaign = client.messaging_10dlc.phone_number_campaigns.delete(
    "phoneNumber",
)
print(phone_number_campaign.campaign_id)
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```python
# In your webhook handler (e.g., Flask — use raw body, not parsed JSON):
@app.route("/webhooks", methods=["POST"])
def handle_webhook():
    payload = request.get_data(as_text=True)  # raw body as string
    headers = dict(request.headers)
    try:
        event = client.webhooks.unwrap(payload, headers=headers)
    except Exception as e:
        print(f"Webhook verification failed: {e}")
        return "Invalid signature", 400
    # Signature valid — event is the parsed webhook payload
    print(f"Received event: {event.data.event_type}")
    return "OK", 200
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `campaignStatusUpdate` | `10dlc.campaign.status_update` | Campaign Status Update |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
