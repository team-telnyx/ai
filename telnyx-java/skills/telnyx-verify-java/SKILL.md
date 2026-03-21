---
name: telnyx-verify-java
description: >-
  Phone verification via SMS/voice/flashcall OTP and number lookup (carrier,
  type, caller name).
metadata:
  author: telnyx
  product: verify
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - Java

## Core Workflow

### Prerequisites

1. Create a Verify Profile with channel settings (SMS, Call, Flashcall, RCS, DTMF)

### Steps

1. **Create profile**: `client.verifyProfiles().create(params)`
2. **Trigger verification**: `client.verifications().triggerSms(params)`
3. **User receives code**: `Via SMS, call, flashcall, RCS, or DTMF`
4. **Submit code**: `client.verifications().byPhoneNumber().actions().verify(params)`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Default, widest reach | SMS verification |
| Landlines or accessibility | Voice call verification |
| Frictionless mobile (code in caller ID) | Flashcall verification |
| Ownership confirmation without code entry | DTMF Confirm |
| Rich mobile UX with SMS fallback | RCS verification |

### Common mistakes

- NEVER use non-E.164 phone numbers — returns 400 Bad Request
- NEVER reuse expired verification IDs — must re-trigger verification
- For DTMF Confirm: result is ONLY delivered via webhook — configure your webhook endpoint in the Verify Profile settings. No verify webhooks are documented in this skill; handle the verify.dtmf_confirm event manually
- When verifying by ID, you MUST pass the code parameter — omitting it will not validate the user's input

**Related skills**: telnyx-messaging-java, telnyx-voice-java

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
    var result = client.verifications().triggerSms(params);
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Trigger SMS verification

`client.verifications().triggerSms()` — `POST /verifications/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeoutSecs` | integer | No | The number of seconds the verification code is valid for. |
| `customCode` | string | No | Send a self-generated numeric code to the end-user |

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerSmsParams;

VerificationTriggerSmsParams params = VerificationTriggerSmsParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerSms(params);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by phone number

`client.verifications().byPhoneNumber().actions().verify()` — `POST /verifications/by_phone_number/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | This is the code the user submits for verification. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```java
import com.telnyx.sdk.models.verifications.byphonenumber.actions.ActionVerifyParams;
import com.telnyx.sdk.models.verifications.byphonenumber.actions.VerifyVerificationCodeResponse;

ActionVerifyParams params = ActionVerifyParams.builder()
    .phoneNumber("+13035551234")
    .code("17686")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
VerifyVerificationCodeResponse verifyVerificationCodeResponse = client.verifications().byPhoneNumber().actions().verify(params);
```

Key response fields: `response.data.phone_number, response.data.response_code`

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`client.verifyProfiles().create()` — `POST /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `webhookUrl` | string (URL) | No |  |
| `webhookFailoverUrl` | string (URL) | No |  |
| `sms` | object | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileCreateParams;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;

VerifyProfileCreateParams params = VerifyProfileCreateParams.builder()
    .name("Test Profile")
    .build();
VerifyProfileData verifyProfileData = client.verifyProfiles().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Trigger Call verification

`client.verifications().triggerCall()` — `POST /verifications/call`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeoutSecs` | integer | No | The number of seconds the verification code is valid for. |
| `customCode` | string | No | Send a self-generated numeric code to the end-user |
| `extension` | string | No | Optional extension to dial after call is answered using DTMF... |

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerCallParams;

VerificationTriggerCallParams params = VerificationTriggerCallParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerCall(params);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Lookup phone number data

Returns information about the provided phone number.

`client.numberLookup().retrieve()` — `GET /number_lookup/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number to be looked up |
| `type` | enum (carrier, caller-name) | No | Specifies the type of number lookup to be performed |

```java
import com.telnyx.sdk.models.numberlookup.NumberLookupRetrieveParams;
import com.telnyx.sdk.models.numberlookup.NumberLookupRetrieveResponse;

NumberLookupRetrieveResponse numberLookup = client.numberLookup().retrieve("+18665552368");
```

Key response fields: `response.data.phone_number, response.data.caller_name, response.data.carrier`

## List verifications by phone number

`client.verifications().byPhoneNumber().list()` — `GET /verifications/by_phone_number/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```java
import com.telnyx.sdk.models.verifications.byphonenumber.ByPhoneNumberListParams;
import com.telnyx.sdk.models.verifications.byphonenumber.ByPhoneNumberListResponse;

ByPhoneNumberListResponse byPhoneNumbers = client.verifications().byPhoneNumber().list("+13035551234");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Trigger Flash call verification

`client.verifications().triggerFlashcall()` — `POST /verifications/flashcall`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeoutSecs` | integer | No | The number of seconds the verification code is valid for. |

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerFlashcallParams;

VerificationTriggerFlashcallParams params = VerificationTriggerFlashcallParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerFlashcall(params);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve verification

`client.verifications().retrieve()` — `GET /verifications/{verification_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationId` | string (UUID) | Yes | The identifier of the verification to retrieve. |

```java
import com.telnyx.sdk.models.verifications.VerificationRetrieveParams;
import com.telnyx.sdk.models.verifications.VerificationRetrieveResponse;

VerificationRetrieveResponse verification = client.verifications().retrieve("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by ID

`client.verifications().actions().verify()` — `POST /verifications/{verification_id}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationId` | string (UUID) | Yes | The identifier of the verification to retrieve. |
| `status` | enum (accepted, rejected) | No | Identifies if the verification code has been accepted or rej... |
| `code` | string | No | This is the code the user submits for verification. |

```java
import com.telnyx.sdk.models.verifications.actions.ActionVerifyParams;
import com.telnyx.sdk.models.verifications.byphonenumber.actions.VerifyVerificationCodeResponse;

VerifyVerificationCodeResponse verifyVerificationCodeResponse = client.verifications().actions().verify("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Key response fields: `response.data.phone_number, response.data.response_code`

## List all Verify profiles

Gets a paginated list of Verify profiles.

`client.verifyProfiles().list()` — `GET /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileListPage;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileListParams;

VerifyProfileListPage page = client.verifyProfiles().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve Verify profile message templates

List all Verify profile message templates.

`client.verifyProfiles().retrieveTemplates()` — `GET /verify_profiles/templates`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveTemplatesParams;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveTemplatesResponse;

VerifyProfileRetrieveTemplatesResponse response = client.verifyProfiles().retrieveTemplates();
```

Key response fields: `response.data.id, response.data.text`

## Create message template

Create a new Verify profile message template.

`client.verifyProfiles().createTemplate()` — `POST /verify_profiles/templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |

```java
import com.telnyx.sdk.models.verifyprofiles.MessageTemplate;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileCreateTemplateParams;

VerifyProfileCreateTemplateParams params = VerifyProfileCreateTemplateParams.builder()
    .text("Your {{app_name}} verification code is: {{code}}.")
    .build();
MessageTemplate messageTemplate = client.verifyProfiles().createTemplate(params);
```

Key response fields: `response.data.id, response.data.text`

## Update message template

Update an existing Verify profile message template.

`client.verifyProfiles().updateTemplate()` — `PATCH /verify_profiles/templates/{template_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |
| `templateId` | string (UUID) | Yes | The identifier of the message template to update. |

```java
import com.telnyx.sdk.models.verifyprofiles.MessageTemplate;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileUpdateTemplateParams;

VerifyProfileUpdateTemplateParams params = VerifyProfileUpdateTemplateParams.builder()
    .templateId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .text("Your {{app_name}} verification code is: {{code}}.")
    .build();
MessageTemplate messageTemplate = client.verifyProfiles().updateTemplate(params);
```

Key response fields: `response.data.id, response.data.text`

## Retrieve Verify profile

Gets a single Verify profile.

`client.verifyProfiles().retrieve()` — `GET /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to retrieve. |

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().retrieve("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Verify profile

`client.verifyProfiles().update()` — `PATCH /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to update. |
| `webhookUrl` | string (URL) | No |  |
| `webhookFailoverUrl` | string (URL) | No |  |
| `name` | string | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileUpdateParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().update("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Verify profile

`client.verifyProfiles().delete()` — `DELETE /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to delete. |

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileDeleteParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().delete("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
