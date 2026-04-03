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
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx 10DLC - Python

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
    telnyx_brand = client.messaging_10dlc.brand.create(
        country="US",
        display_name="ABC Mobile",
        email="support@example.com",
        entity_type="PRIVATE_PROFIT",
        vertical="TECHNOLOGY",
    )
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
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

Primary response fields:
- `telnyx_brand.brand_id`
- `telnyx_brand.identity_status`
- `telnyx_brand.status`
- `telnyx_brand.display_name`
- `telnyx_brand.state`
- `telnyx_brand.alt_business_id`

### Submit a campaign

Campaign submission is the compliance-critical step that determines whether traffic can be provisioned.

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

Primary response fields:
- `telnyx_campaign_csp.campaign_id`
- `telnyx_campaign_csp.brand_id`
- `telnyx_campaign_csp.campaign_status`
- `telnyx_campaign_csp.submission_status`
- `telnyx_campaign_csp.failure_reasons`
- `telnyx_campaign_csp.status`

### Assign a messaging profile to a campaign

Messaging profile assignment is the practical handoff from registration to send-ready messaging infrastructure.

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

Primary response fields:
- `response.messaging_profile_id`
- `response.campaign_id`
- `response.task_id`
- `response.tcr_campaign_id`

---

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

Primary response fields:
- `brand.status`
- `brand.state`
- `brand.alt_business_id`
- `brand.alt_business_id_type`
- `brand.assigned_campaigns_count`
- `brand.brand_id`

### Qualify By Usecase

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Primary response fields:
- `response.annual_fee`
- `response.max_sub_usecases`
- `response.min_sub_usecases`
- `response.mno_metadata`
- `response.monthly_fee`
- `response.quarterly_fee`

### Create New Phone Number Campaign

Create or provision an additional resource when the core tasks do not cover this flow.

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

Primary response fields:
- `phone_number_campaign.assignment_status`
- `phone_number_campaign.brand_id`
- `phone_number_campaign.campaign_id`
- `phone_number_campaign.created_at`
- `phone_number_campaign.failure_reasons`
- `phone_number_campaign.phone_number`

### Get campaign

Inspect the current state of an existing campaign registration.

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

Primary response fields:
- `telnyx_campaign_csp.status`
- `telnyx_campaign_csp.age_gated`
- `telnyx_campaign_csp.auto_renewal`
- `telnyx_campaign_csp.billed_date`
- `telnyx_campaign_csp.brand_display_name`
- `telnyx_campaign_csp.brand_id`

### List Brands

Inspect available resources or choose an existing resource before mutating it.

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

Primary response fields:
- `page.page`
- `page.records`
- `page.total_records`

### Get Brand Feedback By Id

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Primary response fields:
- `response.brand_id`
- `response.category`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Get Brand SMS OTP Status | `client.messaging_10dlc.brand.get_sms_otp_by_reference()` | `GET /10dlc/brand/smsOtp/{referenceId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `reference_id` |
| Update Brand | `client.messaging_10dlc.brand.update()` | `PUT /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `entity_type`, `display_name`, `country`, `email`, +2 more |
| Delete Brand | `client.messaging_10dlc.brand.delete()` | `DELETE /10dlc/brand/{brandId}` | Inspect the current state of an existing brand registration. | `brand_id` |
| Resend brand 2FA email | `client.messaging_10dlc.brand.resend_2fa_email()` | `POST /10dlc/brand/{brandId}/2faEmail` | Create or provision an additional resource when the core tasks do not cover this flow. | `brand_id` |
| List External Vettings | `client.messaging_10dlc.brand.external_vetting.list()` | `GET /10dlc/brand/{brandId}/externalVetting` | Fetch the current state before updating, deleting, or making control-flow decisions. | `brand_id` |
| Order Brand External Vetting | `client.messaging_10dlc.brand.external_vetting.order()` | `POST /10dlc/brand/{brandId}/externalVetting` | Create or provision an additional resource when the core tasks do not cover this flow. | `evp_id`, `vetting_class`, `brand_id` |
| Import External Vetting Record | `client.messaging_10dlc.brand.external_vetting.imports()` | `PUT /10dlc/brand/{brandId}/externalVetting` | Modify an existing resource without recreating it. | `evp_id`, `vetting_id`, `brand_id` |
| Revet Brand | `client.messaging_10dlc.brand.revet()` | `PUT /10dlc/brand/{brandId}/revet` | Modify an existing resource without recreating it. | `brand_id` |
| Get Brand SMS OTP Status by Brand ID | `client.messaging_10dlc.brand.retrieve_sms_otp_status()` | `GET /10dlc/brand/{brandId}/smsOtp` | Fetch the current state before updating, deleting, or making control-flow decisions. | `brand_id` |
| Trigger Brand SMS OTP | `client.messaging_10dlc.brand.trigger_sms_otp()` | `POST /10dlc/brand/{brandId}/smsOtp` | Create or provision an additional resource when the core tasks do not cover this flow. | `pin_sms`, `success_sms`, `brand_id` |
| Verify Brand SMS OTP | `client.messaging_10dlc.brand.verify_sms_otp()` | `PUT /10dlc/brand/{brandId}/smsOtp` | Modify an existing resource without recreating it. | `otp_pin`, `brand_id` |
| List Campaigns | `client.messaging_10dlc.campaign.list()` | `GET /10dlc/campaign` | Inspect available resources or choose an existing resource before mutating it. | None |
| Accept Shared Campaign | `client.messaging_10dlc.campaign.accept_sharing()` | `POST /10dlc/campaign/acceptSharing/{campaignId}` | Create or provision an additional resource when the core tasks do not cover this flow. | `campaign_id` |
| Get Campaign Cost | `client.messaging_10dlc.campaign.usecase.get_cost()` | `GET /10dlc/campaign/usecase/cost` | Inspect available resources or choose an existing resource before mutating it. | None |
| Update campaign | `client.messaging_10dlc.campaign.update()` | `PUT /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `campaign_id` |
| Deactivate campaign | `client.messaging_10dlc.campaign.deactivate()` | `DELETE /10dlc/campaign/{campaignId}` | Inspect the current state of an existing campaign registration. | `campaign_id` |
| Submit campaign appeal for manual review | `client.messaging_10dlc.campaign.submit_appeal()` | `POST /10dlc/campaign/{campaignId}/appeal` | Create or provision an additional resource when the core tasks do not cover this flow. | `appeal_reason`, `campaign_id` |
| Get Campaign Mno Metadata | `client.messaging_10dlc.campaign.get_mno_metadata()` | `GET /10dlc/campaign/{campaignId}/mnoMetadata` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaign_id` |
| Get campaign operation status | `client.messaging_10dlc.campaign.get_operation_status()` | `GET /10dlc/campaign/{campaignId}/operationStatus` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaign_id` |
| Get OSR campaign attributes | `client.messaging_10dlc.campaign.osr.get_attributes()` | `GET /10dlc/campaign/{campaignId}/osr/attributes` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaign_id` |
| Get Sharing Status | `client.messaging_10dlc.campaign.get_sharing_status()` | `GET /10dlc/campaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaign_id` |
| List shared partner campaigns | `client.messaging_10dlc.partner_campaigns.list_shared_by_me()` | `GET /10dlc/partnerCampaign/sharedByMe` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Sharing Status | `client.messaging_10dlc.partner_campaigns.retrieve_sharing_status()` | `GET /10dlc/partnerCampaign/{campaignId}/sharing` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaign_id` |
| List Shared Campaigns | `client.messaging_10dlc.partner_campaigns.list()` | `GET /10dlc/partner_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Shared Campaign | `client.messaging_10dlc.partner_campaigns.retrieve()` | `GET /10dlc/partner_campaigns/{campaignId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `campaign_id` |
| Update Single Shared Campaign | `client.messaging_10dlc.partner_campaigns.update()` | `PATCH /10dlc/partner_campaigns/{campaignId}` | Modify an existing resource without recreating it. | `campaign_id` |
| Get Assignment Task Status | `client.messaging_10dlc.phone_number_assignment_by_profile.retrieve_status()` | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `task_id` |
| Get Phone Number Status | `client.messaging_10dlc.phone_number_assignment_by_profile.list_phone_number_status()` | `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers` | Fetch the current state before updating, deleting, or making control-flow decisions. | `task_id` |
| List phone number campaigns | `client.messaging_10dlc.phone_number_campaigns.list()` | `GET /10dlc/phone_number_campaigns` | Inspect available resources or choose an existing resource before mutating it. | None |
| Get Single Phone Number Campaign | `client.messaging_10dlc.phone_number_campaigns.retrieve()` | `GET /10dlc/phone_number_campaigns/{phoneNumber}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `phone_number` |
| Create New Phone Number Campaign | `client.messaging_10dlc.phone_number_campaigns.update()` | `PUT /10dlc/phone_number_campaigns/{phoneNumber}` | Modify an existing resource without recreating it. | `phone_number`, `campaign_id`, `phone_number` |
| Delete Phone Number Campaign | `client.messaging_10dlc.phone_number_campaigns.delete()` | `DELETE /10dlc/phone_number_campaigns/{phoneNumber}` | Remove, detach, or clean up an existing resource. | `phone_number` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
