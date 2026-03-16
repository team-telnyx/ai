<!-- SDK reference: telnyx-10dlc-java -->

# Telnyx 10Dlc - Java

## Core Workflow

### Prerequisites

1. Create a messaging profile (see telnyx-messaging-profiles-java)
2. Buy US 10DLC phone number(s) and assign to the messaging profile (see telnyx-numbers-java)

### Steps

1. **Register brand**: `client.brands().create(params)`
2. **(Optional) Vet brand**: `Improves throughput score — vetting is automatic but can be expedited`
3. **Create campaign**: `client.campaigns().create(params)`
4. **Assign number to campaign**: `client.campaignPhoneNumbers().create(params)`
5. **Wait for MNO_PROVISIONED status**: `Campaign must be provisioned before sending`

### Common mistakes

- NEVER send messages before the campaign reaches MNO_PROVISIONED status — messages will be filtered/blocked
- NEVER use a P.O. box or missing website in brand registration — causes rejection
- NEVER omit opt-out language in sample messages — campaign will be rejected
- NEVER mismatch content with registered campaign use case — causes carrier filtering even after registration
- Sole Proprietor brands: max 1 campaign, max 1 phone number per campaign

**Related skills**: telnyx-messaging-java, telnyx-messaging-profiles-java, telnyx-numbers-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.brands().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create Brand

This endpoint is used to create a new brand. A brand is an entity created by The Campaign Registry (TCR) that represents an organization or a company. It is this entity that TCR created campaigns will be associated with.

`client.messaging10dlc().brand().create()` — `POST /10dlc/brand`

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

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandCreateParams;
import com.telnyx.sdk.models.messaging10dlc.brand.EntityType;
import com.telnyx.sdk.models.messaging10dlc.brand.TelnyxBrand;
import com.telnyx.sdk.models.messaging10dlc.brand.Vertical;

BrandCreateParams params = BrandCreateParams.builder()
    .country("US")
    .displayName("ABC Mobile")
    .email("support@example.com")
    .entityType(EntityType.PRIVATE_PROFIT)
    .vertical(Vertical.TECHNOLOGY)
    .build();
TelnyxBrand telnyxBrand = client.messaging10dlc().brand().create(params);
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand

Retrieve a brand by `brandId`.

`client.messaging10dlc().brand().retrieve()` — `GET /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandRetrieveParams;
import com.telnyx.sdk.models.messaging10dlc.brand.BrandRetrieveResponse;

BrandRetrieveResponse brand = client.messaging10dlc().brand().retrieve("BXXX001");
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Qualify By Usecase

This endpoint allows you to see whether or not the supplied brand is suitable for your desired campaign use case.

`client.messaging10dlc().campaignBuilder().brand().qualifyByUsecase()` — `GET /10dlc/campaignBuilder/brand/{brandId}/usecase/{usecase}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `usecase` | string | Yes |  |
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.campaignbuilder.brand.BrandQualifyByUsecaseParams;
import com.telnyx.sdk.models.messaging10dlc.campaignbuilder.brand.BrandQualifyByUsecaseResponse;

BrandQualifyByUsecaseParams params = BrandQualifyByUsecaseParams.builder()
    .brandId("BXXX001")
    .usecase("CUSTOMER_CARE")
    .build();
BrandQualifyByUsecaseResponse response = client.messaging10dlc().campaignBuilder().brand().qualifyByUsecase(params);
```

Key response fields: `response.data.annualFee, response.data.maxSubUsecases, response.data.minSubUsecases`

## Submit Campaign

Before creating a campaign, use the [Qualify By Usecase endpoint](https://developers.telnyx.com/api-reference/campaign/qualify-by-usecase) to ensure that the brand you want to assign a new campaign to is qualified for the desired use case of that campaign. **Please note:** After campaign creation, you'll only be able to edit the campaign's sample messages.

`client.messaging10dlc().campaignBuilder().submit()` — `POST /10dlc/campaignBuilder`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | Alphanumeric identifier of the brand associated with this ca... |
| `description` | string | Yes | Summary description of this campaign. |
| `usecase` | string | Yes | Campaign usecase. |
| `ageGated` | boolean | No | Age gated message content in campaign. |
| `autoRenewal` | boolean | No | Campaign subscription auto-renewal option. |
| `directLending` | boolean | No | Direct lending or loan arrangement |
| ... | | | +29 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.TelnyxCampaignCsp;
import com.telnyx.sdk.models.messaging10dlc.campaignbuilder.CampaignBuilderSubmitParams;

CampaignBuilderSubmitParams params = CampaignBuilderSubmitParams.builder()
    .brandId("BXXXXXX")
    .description("Two-factor authentication messages")
    .usecase("2FA")
    .sampleMessages(java.util.List.of("Your verification code is {{code}}"))
    .build();
TelnyxCampaignCsp telnyxCampaignCsp = client.messaging10dlc().campaignBuilder().submit(params);
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Create New Phone Number Campaign

`client.messaging10dlc().phoneNumberCampaigns().create()` — `POST /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaign;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignCreate;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignCreateParams;

PhoneNumberCampaignCreate params = PhoneNumberCampaignCreate.builder()
    .campaignId("4b300178-131c-d902-d54e-72d90ba1620j")
    .phoneNumber("+18005550199")
    .build();
PhoneNumberCampaign phoneNumberCampaign = client.messaging10dlc().phoneNumberCampaigns().create(params);
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Get campaign

Retrieve campaign details by `campaignId`.

`client.messaging10dlc().campaign().retrieve()` — `GET /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignRetrieveParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.TelnyxCampaignCsp;

TelnyxCampaignCsp telnyxCampaignCsp = client.messaging10dlc().campaign().retrieve("CXXX001");
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## List Brands

This endpoint is used to list all brands associated with your organization.

`client.messaging10dlc().brand().list()` — `GET /10dlc/brand`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedCampaignsCount, -assignedCampaignsCount, brandId, -brandId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No |  |
| `recordsPerPage` | integer | No | number of records per page. |
| ... | | | +6 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandListPage;
import com.telnyx.sdk.models.messaging10dlc.brand.BrandListParams;

BrandListPage page = client.messaging10dlc().brand().list();
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Brand Feedback By Id

Get feedback about a brand by ID. This endpoint can be used after creating or revetting
a brand. Possible values for `.category[].id`:

* `TAX_ID` - Data mismatch related to tax id and its associated properties. * `STOCK_SYMBOL` - Non public entity registered as a public for profit entity or
  the stock information mismatch.

`client.messaging10dlc().brand().getFeedback()` — `GET /10dlc/brand/feedback/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandGetFeedbackParams;
import com.telnyx.sdk.models.messaging10dlc.brand.BrandGetFeedbackResponse;

BrandGetFeedbackResponse response = client.messaging10dlc().brand().getFeedback("BXXX001");
```

Key response fields: `response.data.brandId, response.data.category`

## Get Brand SMS OTP Status

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification. This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process.

`client.messaging10dlc().brand().getSmsOtpByReference()` — `GET /10dlc/brand/smsOtp/{referenceId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceId` | string (UUID) | Yes | The reference ID returned when the OTP was initially trigger... |
| `brandId` | string (UUID) | No | Filter by Brand ID for easier lookup in portal applications |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandGetSmsOtpByReferenceParams;
import com.telnyx.sdk.models.messaging10dlc.brand.BrandGetSmsOtpByReferenceResponse;

BrandGetSmsOtpByReferenceResponse response = client.messaging10dlc().brand().getSmsOtpByReference("OTP4B2001");
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Update Brand

Update a brand's attributes by `brandId`.

`client.messaging10dlc().brand().update()` — `PUT /10dlc/brand/{brandId}`

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
| ... | | | +17 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandUpdateParams;
import com.telnyx.sdk.models.messaging10dlc.brand.EntityType;
import com.telnyx.sdk.models.messaging10dlc.brand.TelnyxBrand;
import com.telnyx.sdk.models.messaging10dlc.brand.Vertical;

BrandUpdateParams params = BrandUpdateParams.builder()
    .brandId("BXXX001")
    .country("US")
    .displayName("ABC Mobile")
    .email("support@example.com")
    .entityType(EntityType.PRIVATE_PROFIT)
    .vertical(Vertical.TECHNOLOGY)
    .build();
TelnyxBrand telnyxBrand = client.messaging10dlc().brand().update(params);
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Delete Brand

Delete Brand. This endpoint is used to delete a brand. Note the brand cannot be deleted if it contains one or more active campaigns, the campaigns need to be inactive and at least 3 months old due to billing purposes.

`client.messaging10dlc().brand().delete()` — `DELETE /10dlc/brand/{brandId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandDeleteParams;

client.messaging10dlc().brand().delete("BXXX001");
```

## Resend brand 2FA email

`client.messaging10dlc().brand().resend2faEmail()` — `POST /10dlc/brand/{brandId}/2faEmail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandResend2faEmailParams;

client.messaging10dlc().brand().resend2faEmail("BXXX001");
```

## List External Vettings

Get list of valid external vetting record for a given brand

`client.messaging10dlc().brand().externalVetting().list()` — `GET /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.externalvetting.ExternalVettingListParams;
import com.telnyx.sdk.models.messaging10dlc.brand.externalvetting.ExternalVettingListResponse;

List<ExternalVettingListResponse> externalVettings = client.messaging10dlc().brand().externalVetting().list("BXXX001");
```

## Order Brand External Vetting

Order new external vetting for a brand

`client.messaging10dlc().brand().externalVetting().order()` — `POST /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vettingClass` | string | Yes | Identifies the vetting classification. |
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.externalvetting.ExternalVettingOrderParams;
import com.telnyx.sdk.models.messaging10dlc.brand.externalvetting.ExternalVettingOrderResponse;

ExternalVettingOrderParams params = ExternalVettingOrderParams.builder()
    .brandId("BXXX001")
    .evpId("550e8400-e29b-41d4-a716-446655440000")
    .vettingClass("STANDARD")
    .build();
ExternalVettingOrderResponse response = client.messaging10dlc().brand().externalVetting().order(params);
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Import External Vetting Record

This operation can be used to import an external vetting record from a TCR-approved
vetting provider. If the vetting provider confirms validity of the record, it will be
saved with the brand and will be considered for future campaign qualification.

`client.messaging10dlc().brand().externalVetting().imports()` — `PUT /10dlc/brand/{brandId}/externalVetting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evpId` | string (UUID) | Yes | External vetting provider ID for the brand. |
| `vettingId` | string (UUID) | Yes | Unique ID that identifies a vetting transaction performed by... |
| `brandId` | string (UUID) | Yes |  |
| `vettingToken` | string | No | Required by some providers for vetting record confirmation. |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.externalvetting.ExternalVettingImportsParams;
import com.telnyx.sdk.models.messaging10dlc.brand.externalvetting.ExternalVettingImportsResponse;

ExternalVettingImportsParams params = ExternalVettingImportsParams.builder()
    .brandId("BXXX001")
    .evpId("550e8400-e29b-41d4-a716-446655440000")
    .vettingId("550e8400-e29b-41d4-a716-446655440000")
    .build();
ExternalVettingImportsResponse response = client.messaging10dlc().brand().externalVetting().imports(params);
```

Key response fields: `response.data.createDate, response.data.evpId, response.data.vettedDate`

## Revet Brand

This operation allows you to revet the brand. However, revetting is allowed once after the successful brand registration and thereafter limited to once every 3 months.

`client.messaging10dlc().brand().revet()` — `PUT /10dlc/brand/{brandId}/revet`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandRevetParams;
import com.telnyx.sdk.models.messaging10dlc.brand.TelnyxBrand;

TelnyxBrand telnyxBrand = client.messaging10dlc().brand().revet("BXXX001");
```

Key response fields: `response.data.status, response.data.state, response.data.altBusinessId`

## Get Brand SMS OTP Status by Brand ID

Query the status of an SMS OTP (One-Time Password) for Sole Proprietor brand verification using the Brand ID.

This endpoint allows you to check the delivery and verification status of an OTP sent during the Sole Proprietor brand verification process by looking it up with the brand ID.

The response includes delivery status, verification dates, and detailed delivery information.

`client.messaging10dlc().brand().retrieveSmsOtpStatus()` — `GET /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | string (UUID) | Yes | The Brand ID for which to query OTP status |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandRetrieveSmsOtpStatusParams;
import com.telnyx.sdk.models.messaging10dlc.brand.BrandRetrieveSmsOtpStatusResponse;

BrandRetrieveSmsOtpStatusResponse response = client.messaging10dlc().brand().retrieveSmsOtpStatus("4b20019b-043a-78f8-0657-b3be3f4b4002");
```

Key response fields: `response.data.brandId, response.data.deliveryStatus, response.data.deliveryStatusDate`

## Trigger Brand SMS OTP

Trigger or re-trigger an SMS OTP (One-Time Password) for Sole Proprietor brand verification.

`client.messaging10dlc().brand().triggerSmsOtp()` — `POST /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pinSms` | string | Yes | SMS message template to send the OTP. |
| `successSms` | string | Yes | SMS message to send upon successful OTP verification |
| `brandId` | string (UUID) | Yes | The Brand ID for which to trigger the OTP |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandTriggerSmsOtpParams;
import com.telnyx.sdk.models.messaging10dlc.brand.BrandTriggerSmsOtpResponse;

BrandTriggerSmsOtpParams params = BrandTriggerSmsOtpParams.builder()
    .brandId("4b20019b-043a-78f8-0657-b3be3f4b4002")
    .pinSms("Your PIN is @OTP_PIN@")
    .successSms("Verification successful!")
    .build();
BrandTriggerSmsOtpResponse response = client.messaging10dlc().brand().triggerSmsOtp(params);
```

Key response fields: `response.data.brandId, response.data.referenceId`

## Verify Brand SMS OTP

Verify the SMS OTP (One-Time Password) for Sole Proprietor brand verification. **Verification Flow:**

1. User receives OTP via SMS after triggering
2.

`client.messaging10dlc().brand().verifySmsOtp()` — `PUT /10dlc/brand/{brandId}/smsOtp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `otpPin` | string | Yes | The OTP PIN received via SMS |
| `brandId` | string (UUID) | Yes | The Brand ID for which to verify the OTP |

```java
import com.telnyx.sdk.models.messaging10dlc.brand.BrandVerifySmsOtpParams;

BrandVerifySmsOtpParams params = BrandVerifySmsOtpParams.builder()
    .brandId("4b20019b-043a-78f8-0657-b3be3f4b4002")
    .otpPin("123456")
    .build();
client.messaging10dlc().brand().verifySmsOtp(params);
```

## List Campaigns

Retrieve a list of campaigns associated with a supplied `brandId`.

`client.messaging10dlc().campaign().list()` — `GET /10dlc/campaign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, campaignId, -campaignId, createdAt, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignListPage;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignListParams;

CampaignListParams params = CampaignListParams.builder()
    .brandId("BXXX001")
    .build();
CampaignListPage page = client.messaging10dlc().campaign().list(params);
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Accept Shared Campaign

Manually accept a campaign shared with Telnyx

`client.messaging10dlc().campaign().acceptSharing()` — `POST /10dlc/campaign/acceptSharing/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | TCR's ID for the campaign to import |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignAcceptSharingParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignAcceptSharingResponse;

CampaignAcceptSharingResponse response = client.messaging10dlc().campaign().acceptSharing("C26F1KLZN");
```

## Get Campaign Cost

`client.messaging10dlc().campaign().usecase().getCost()` — `GET /10dlc/campaign/usecase/cost`

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.usecase.UsecaseGetCostParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.usecase.UsecaseGetCostResponse;

UsecaseGetCostParams params = UsecaseGetCostParams.builder()
    .usecase("CUSTOMER_CARE")
    .build();
UsecaseGetCostResponse response = client.messaging10dlc().campaign().usecase().getCost(params);
```

Key response fields: `response.data.campaignUsecase, response.data.description, response.data.monthlyCost`

## Update campaign

Update a campaign's properties by `campaignId`. **Please note:** only sample messages are editable.

`client.messaging10dlc().campaign().update()` — `PUT /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |
| `resellerId` | string (UUID) | No | Alphanumeric identifier of the reseller that you want to ass... |
| `sample1` | string | No | Message sample. |
| `sample2` | string | No | Message sample. |
| ... | | | +8 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignUpdateParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.TelnyxCampaignCsp;

TelnyxCampaignCsp telnyxCampaignCsp = client.messaging10dlc().campaign().update("CXXX001");
```

Key response fields: `response.data.status, response.data.ageGated, response.data.autoRenewal`

## Deactivate campaign

Terminate a campaign. Note that once deactivated, a campaign cannot be restored.

`client.messaging10dlc().campaign().deactivate()` — `DELETE /10dlc/campaign/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignDeactivateParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignDeactivateResponse;

CampaignDeactivateResponse response = client.messaging10dlc().campaign().deactivate("CXXX001");
```

Key response fields: `response.data.message, response.data.record_type, response.data.time`

## Submit campaign appeal for manual review

Submits an appeal for rejected native campaigns in TELNYX_FAILED or MNO_REJECTED status. The appeal is recorded for manual compliance team review and the campaign status is reset to TCR_ACCEPTED. Note: Appeal forwarding is handled manually to allow proper review before incurring upstream charges.

`client.messaging10dlc().campaign().submitAppeal()` — `POST /10dlc/campaign/{campaignId}/appeal`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appealReason` | string | Yes | Detailed explanation of why the campaign should be reconside... |
| `campaignId` | string (UUID) | Yes | The Telnyx campaign identifier |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignSubmitAppealParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignSubmitAppealResponse;

CampaignSubmitAppealParams params = CampaignSubmitAppealParams.builder()
    .campaignId("5eb13888-32b7-4cab-95e6-d834dde21d64")
    .appealReason("The website has been updated to include the required privacy policy and terms of service.")
    .build();
CampaignSubmitAppealResponse response = client.messaging10dlc().campaign().submitAppeal(params);
```

Key response fields: `response.data.appealed_at`

## Get Campaign Mno Metadata

Get the campaign metadata for each MNO it was submitted to.

`client.messaging10dlc().campaign().getMnoMetadata()` — `GET /10dlc/campaign/{campaignId}/mnoMetadata`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignGetMnoMetadataParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignGetMnoMetadataResponse;

CampaignGetMnoMetadataResponse response = client.messaging10dlc().campaign().getMnoMetadata("CXXX001");
```

## Get campaign operation status

Retrieve campaign's operation status at MNO level.

`client.messaging10dlc().campaign().getOperationStatus()` — `GET /10dlc/campaign/{campaignId}/operationStatus`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignGetOperationStatusParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignGetOperationStatusResponse;

CampaignGetOperationStatusResponse response = client.messaging10dlc().campaign().getOperationStatus("CXXX001");
```

## Get OSR campaign attributes

`client.messaging10dlc().campaign().osr().getAttributes()` — `GET /10dlc/campaign/{campaignId}/osr/attributes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.osr.OsrGetAttributesParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.osr.OsrGetAttributesResponse;

OsrGetAttributesResponse response = client.messaging10dlc().campaign().osr().getAttributes("CXXX001");
```

## Get Sharing Status

`client.messaging10dlc().campaign().getSharingStatus()` — `GET /10dlc/campaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```java
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignGetSharingStatusParams;
import com.telnyx.sdk.models.messaging10dlc.campaign.CampaignGetSharingStatusResponse;

CampaignGetSharingStatusResponse response = client.messaging10dlc().campaign().getSharingStatus("CXXX001");
```

Key response fields: `response.data.sharedByMe, response.data.sharedWithMe`

## List shared partner campaigns

Get all partner campaigns you have shared to Telnyx in a paginated fashion

This endpoint is currently limited to only returning shared campaigns that Telnyx
has accepted. In other words, shared but pending campaigns are currently omitted
from the response from this endpoint.

`client.messaging10dlc().partnerCampaigns().listSharedByMe()` — `GET /10dlc/partnerCampaign/sharedByMe`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```java
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignListSharedByMePage;
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignListSharedByMeParams;

PartnerCampaignListSharedByMePage page = client.messaging10dlc().partnerCampaigns().listSharedByMe();
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Sharing Status

`client.messaging10dlc().partnerCampaigns().retrieveSharingStatus()` — `GET /10dlc/partnerCampaign/{campaignId}/sharing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes | ID of the campaign in question |

```java
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignRetrieveSharingStatusParams;
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignRetrieveSharingStatusResponse;

PartnerCampaignRetrieveSharingStatusResponse response = client.messaging10dlc().partnerCampaigns().retrieveSharingStatus("CXXX001");
```

## List Shared Campaigns

Retrieve all partner campaigns you have shared to Telnyx in a paginated fashion. This endpoint is currently limited to only returning shared campaigns that Telnyx has accepted. In other words, shared but pending campaigns are currently omitted from the response from this endpoint.

`client.messaging10dlc().partnerCampaigns().list()` — `GET /10dlc/partner_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignedPhoneNumbersCount, -assignedPhoneNumbersCount, brandDisplayName, -brandDisplayName, tcrBrandId, ...) | No | Specifies the sort order for results. |
| `page` | integer | No | The 1-indexed page number to get. |
| `recordsPerPage` | integer | No | The amount of records per page, limited to between 1 and 500... |

```java
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignListPage;
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignListParams;

PartnerCampaignListPage page = client.messaging10dlc().partnerCampaigns().list();
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Shared Campaign

Retrieve campaign details by `campaignId`.

`client.messaging10dlc().partnerCampaigns().retrieve()` — `GET /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignRetrieveParams;
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.TelnyxDownstreamCampaign;

TelnyxDownstreamCampaign telnyxDownstreamCampaign = client.messaging10dlc().partnerCampaigns().retrieve("CXXX001");
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Update Single Shared Campaign

Update campaign details by `campaignId`. **Please note:** Only webhook urls are editable.

`client.messaging10dlc().partnerCampaigns().update()` — `PATCH /10dlc/partner_campaigns/{campaignId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string (UUID) | Yes |  |
| `webhookURL` | string | No | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | No | Webhook failover to which campaign status updates are sent. |

```java
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.PartnerCampaignUpdateParams;
import com.telnyx.sdk.models.messaging10dlc.partnercampaigns.TelnyxDownstreamCampaign;

TelnyxDownstreamCampaign telnyxDownstreamCampaign = client.messaging10dlc().partnerCampaigns().update("CXXX001");
```

Key response fields: `response.data.ageGated, response.data.assignedPhoneNumbersCount, response.data.brandDisplayName`

## Assign Messaging Profile To Campaign

This endpoint allows you to link all phone numbers associated with a Messaging Profile to a campaign. **Please note:** if you want to assign phone numbers to a campaign that you did not create with Telnyx 10DLC services, this endpoint allows that provided that you've shared the campaign with Telnyx. In this case, only provide the parameter, `tcrCampaignId`, and not `campaignId`.

`client.messaging10dlc().phoneNumberAssignmentByProfile().assign()` — `POST /10dlc/phoneNumberAssignmentByProfile`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | The ID of the messaging profile that you want to link to the... |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified mes... |
| `tcrCampaignId` | string (UUID) | No | The TCR ID of the shared campaign you want to link to the sp... |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumberassignmentbyprofile.PhoneNumberAssignmentByProfileAssignParams;
import com.telnyx.sdk.models.messaging10dlc.phonenumberassignmentbyprofile.PhoneNumberAssignmentByProfileAssignResponse;

PhoneNumberAssignmentByProfileAssignParams params = PhoneNumberAssignmentByProfileAssignParams.builder()
    .messagingProfileId("4001767e-ce0f-4cae-9d5f-0d5e636e7809")
    .campaignId("CXXX001")
    .build();
PhoneNumberAssignmentByProfileAssignResponse response = client.messaging10dlc().phoneNumberAssignmentByProfile().assign(params);
```

Key response fields: `response.data.campaignId, response.data.messagingProfileId, response.data.taskId`

## Get Assignment Task Status

Check the status of the task associated with assigning all phone numbers on a messaging profile to a campaign by `taskId`.

`client.messaging10dlc().phoneNumberAssignmentByProfile().retrieveStatus()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumberassignmentbyprofile.PhoneNumberAssignmentByProfileRetrieveStatusParams;
import com.telnyx.sdk.models.messaging10dlc.phonenumberassignmentbyprofile.PhoneNumberAssignmentByProfileRetrieveStatusResponse;

PhoneNumberAssignmentByProfileRetrieveStatusResponse response = client.messaging10dlc().phoneNumberAssignmentByProfile().retrieveStatus("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.status, response.data.createdAt, response.data.taskId`

## Get Phone Number Status

Check the status of the individual phone number/campaign assignments associated with the supplied `taskId`.

`client.messaging10dlc().phoneNumberAssignmentByProfile().listPhoneNumberStatus()` — `GET /10dlc/phoneNumberAssignmentByProfile/{taskId}/phoneNumbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `recordsPerPage` | integer | No |  |
| `page` | integer | No |  |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumberassignmentbyprofile.PhoneNumberAssignmentByProfileListPhoneNumberStatusParams;
import com.telnyx.sdk.models.messaging10dlc.phonenumberassignmentbyprofile.PhoneNumberAssignmentByProfileListPhoneNumberStatusResponse;

PhoneNumberAssignmentByProfileListPhoneNumberStatusResponse response = client.messaging10dlc().phoneNumberAssignmentByProfile().listPhoneNumberStatus("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.records`

## List phone number campaigns

`client.messaging10dlc().phoneNumberCampaigns().list()` — `GET /10dlc/phone_number_campaigns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (assignmentStatus, -assignmentStatus, createdAt, -createdAt, phoneNumber, ...) | No | Specifies the sort order for results. |
| `recordsPerPage` | integer | No |  |
| `page` | integer | No |  |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignListPage;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignListParams;

PhoneNumberCampaignListPage page = client.messaging10dlc().phoneNumberCampaigns().list();
```

Key response fields: `response.data.page, response.data.records, response.data.totalRecords`

## Get Single Phone Number Campaign

Retrieve an individual phone number/campaign assignment by `phoneNumber`.

`client.messaging10dlc().phoneNumberCampaigns().retrieve()` — `GET /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaign;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignRetrieveParams;

PhoneNumberCampaign phoneNumberCampaign = client.messaging10dlc().phoneNumberCampaigns().retrieve("+13125550001");
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Create New Phone Number Campaign

`client.messaging10dlc().phoneNumberCampaigns().update()` — `PUT /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number you want to link to a specified campaign. |
| `campaignId` | string (UUID) | Yes | The ID of the campaign you want to link to the specified pho... |
| `phoneNumber` | string (E.164) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaign;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignCreate;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignUpdateParams;

PhoneNumberCampaignUpdateParams params = PhoneNumberCampaignUpdateParams.builder()
    .campaignPhoneNumber("+13125550001")
    .phoneNumberCampaignCreate(PhoneNumberCampaignCreate.builder()
        .campaignId("4b300178-131c-d902-d54e-72d90ba1620j")
        .phoneNumber("+18005550199")
        .build())
    .build();
PhoneNumberCampaign phoneNumberCampaign = client.messaging10dlc().phoneNumberCampaigns().update(params);
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

## Delete Phone Number Campaign

This endpoint allows you to remove a campaign assignment from the supplied `phoneNumber`.

`client.messaging10dlc().phoneNumberCampaigns().delete()` — `DELETE /10dlc/phone_number_campaigns/{phoneNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |

```java
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaign;
import com.telnyx.sdk.models.messaging10dlc.phonenumbercampaigns.PhoneNumberCampaignDeleteParams;

PhoneNumberCampaign phoneNumberCampaign = client.messaging10dlc().phoneNumberCampaigns().delete("+13125550001");
```

Key response fields: `response.data.assignmentStatus, response.data.brandId, response.data.campaignId`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```java
import com.telnyx.sdk.core.UnwrapWebhookParams;
import com.telnyx.sdk.core.http.Headers;

// In your webhook handler (e.g., Spring — use raw body):
@PostMapping("/webhooks")
public ResponseEntity<String> handleWebhook(
    @RequestBody String payload,
    HttpServletRequest request) {
  try {
    Headers headers = Headers.builder()
        .put("telnyx-signature-ed25519", request.getHeader("telnyx-signature-ed25519"))
        .put("telnyx-timestamp", request.getHeader("telnyx-timestamp"))
        .build();
    var event = client.webhooks().unwrap(
        UnwrapWebhookParams.builder()
            .body(payload)
            .headers(headers)
            .build());
    // Signature valid — process the event
    System.out.println("Received webhook event");
    return ResponseEntity.ok("OK");
  } catch (Exception e) {
    System.err.println("Webhook verification failed: " + e.getMessage());
    return ResponseEntity.badRequest().body("Invalid signature");
  }
}
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `campaignStatusUpdate` | `10dlc.campaign.status_update` | Campaign Status Update |

Webhook payload field definitions are in the API Details section below.

---

# 10DLC (Java) — API Details

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

### Create Brand — `client.messaging10dlc().brand().create()`

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

### Update Brand — `client.messaging10dlc().brand().update()`

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

### Import External Vetting Record — `client.messaging10dlc().brand().externalVetting().imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `vettingToken` | string | Required by some providers for vetting record confirmation. |

### Update campaign — `client.messaging10dlc().campaign().update()`

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

### Submit Campaign — `client.messaging10dlc().campaignBuilder().submit()`

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

### Update Single Shared Campaign — `client.messaging10dlc().partnerCampaigns().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookURL` | string | Webhook to which campaign status updates are sent. |
| `webhookFailoverURL` | string | Webhook failover to which campaign status updates are sent. |

### Assign Messaging Profile To Campaign — `client.messaging10dlc().phoneNumberAssignmentByProfile().assign()`

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
