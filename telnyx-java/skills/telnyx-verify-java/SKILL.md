---
name: telnyx-verify-java
description: >-
  Look up phone number information (carrier, type, caller name) and verify users
  via SMS/voice OTP. Use for phone verification and data enrichment. This skill
  provides Java SDK examples.
metadata:
  internal: true
  author: telnyx
  product: verify
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>6.26.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:6.26.0")
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
    var result = client.messages().send(params);
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

## Lookup phone number data

Returns information about the provided phone number.

`GET /number_lookup/{phone_number}`

```java
import com.telnyx.sdk.models.numberlookup.NumberLookupRetrieveParams;
import com.telnyx.sdk.models.numberlookup.NumberLookupRetrieveResponse;

NumberLookupRetrieveResponse numberLookup = client.numberLookup().retrieve("+18665552368");
```

Returns: `caller_name` (object), `carrier` (object), `country_code` (string), `fraud` (string | null), `national_format` (string), `phone_number` (string), `portability` (object), `record_type` (string)

## List verifications by phone number

`GET /verifications/by_phone_number/{phone_number}`

```java
import com.telnyx.sdk.models.verifications.byphonenumber.ByPhoneNumberListParams;
import com.telnyx.sdk.models.verifications.byphonenumber.ByPhoneNumberListResponse;

ByPhoneNumberListResponse byPhoneNumbers = client.verifications().byPhoneNumber().list("+13035551234");
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall), `updated_at` (string), `verify_profile_id` (uuid)

## Verify verification code by phone number

`POST /verifications/by_phone_number/{phone_number}/actions/verify` — Required: `code`, `verify_profile_id`

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

Returns: `phone_number` (string), `response_code` (enum: accepted, rejected)

## Trigger Call verification

`POST /verifications/call` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (string | null), `extension` (string | null), `timeout_secs` (integer)

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerCallParams;

VerificationTriggerCallParams params = VerificationTriggerCallParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerCall(params);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall), `updated_at` (string), `verify_profile_id` (uuid)

## Trigger Flash call verification

`POST /verifications/flashcall` — Required: `phone_number`, `verify_profile_id`

Optional: `timeout_secs` (integer)

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerFlashcallParams;

VerificationTriggerFlashcallParams params = VerificationTriggerFlashcallParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerFlashcall(params);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall), `updated_at` (string), `verify_profile_id` (uuid)

## Trigger SMS verification

`POST /verifications/sms` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (string | null), `timeout_secs` (integer)

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerSmsParams;

VerificationTriggerSmsParams params = VerificationTriggerSmsParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerSms(params);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall), `updated_at` (string), `verify_profile_id` (uuid)

## Retrieve verification

`GET /verifications/{verification_id}`

```java
import com.telnyx.sdk.models.verifications.VerificationRetrieveParams;
import com.telnyx.sdk.models.verifications.VerificationRetrieveResponse;

VerificationRetrieveResponse verification = client.verifications().retrieve("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall), `updated_at` (string), `verify_profile_id` (uuid)

## Verify verification code by ID

`POST /verifications/{verification_id}/actions/verify`

Optional: `code` (string), `status` (enum: accepted, rejected)

```java
import com.telnyx.sdk.models.verifications.actions.ActionVerifyParams;
import com.telnyx.sdk.models.verifications.byphonenumber.actions.VerifyVerificationCodeResponse;

VerifyVerificationCodeResponse verifyVerificationCodeResponse = client.verifications().actions().verify("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Returns: `phone_number` (string), `response_code` (enum: accepted, rejected)

## List all Verify profiles

Gets a paginated list of Verify profiles.

`GET /verify_profiles`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileListPage;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileListParams;

VerifyProfileListPage page = client.verifyProfiles().list();
```

Returns: `call` (object), `created_at` (string), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `rcs` (object), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string)

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`POST /verify_profiles` — Required: `name`

Optional: `call` (object), `flashcall` (object), `language` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileCreateParams;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;

VerifyProfileCreateParams params = VerifyProfileCreateParams.builder()
    .name("Test Profile")
    .build();
VerifyProfileData verifyProfileData = client.verifyProfiles().create(params);
```

Returns: `call` (object), `created_at` (string), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `rcs` (object), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string)

## Retrieve Verify profile message templates

List all Verify profile message templates.

`GET /verify_profiles/templates`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveTemplatesParams;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveTemplatesResponse;

VerifyProfileRetrieveTemplatesResponse response = client.verifyProfiles().retrieveTemplates();
```

Returns: `id` (uuid), `text` (string)

## Create message template

Create a new Verify profile message template.

`POST /verify_profiles/templates` — Required: `text`

```java
import com.telnyx.sdk.models.verifyprofiles.MessageTemplate;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileCreateTemplateParams;

VerifyProfileCreateTemplateParams params = VerifyProfileCreateTemplateParams.builder()
    .text("Your {{app_name}} verification code is: {{code}}.")
    .build();
MessageTemplate messageTemplate = client.verifyProfiles().createTemplate(params);
```

Returns: `id` (uuid), `text` (string)

## Update message template

Update an existing Verify profile message template.

`PATCH /verify_profiles/templates/{template_id}` — Required: `text`

```java
import com.telnyx.sdk.models.verifyprofiles.MessageTemplate;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileUpdateTemplateParams;

VerifyProfileUpdateTemplateParams params = VerifyProfileUpdateTemplateParams.builder()
    .templateId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .text("Your {{app_name}} verification code is: {{code}}.")
    .build();
MessageTemplate messageTemplate = client.verifyProfiles().updateTemplate(params);
```

Returns: `id` (uuid), `text` (string)

## Retrieve Verify profile

Gets a single Verify profile.

`GET /verify_profiles/{verify_profile_id}`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().retrieve("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Returns: `call` (object), `created_at` (string), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `rcs` (object), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string)

## Update Verify profile

`PATCH /verify_profiles/{verify_profile_id}`

Optional: `call` (object), `flashcall` (object), `language` (string), `name` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileUpdateParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().update("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Returns: `call` (object), `created_at` (string), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `rcs` (object), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string)

## Delete Verify profile

`DELETE /verify_profiles/{verify_profile_id}`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileDeleteParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().delete("12ade33a-21c0-473b-b055-b3c836e1c292");
```

Returns: `call` (object), `created_at` (string), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `rcs` (object), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string)
