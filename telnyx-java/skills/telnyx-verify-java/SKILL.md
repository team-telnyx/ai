---
name: telnyx-verify-java
description: >-
  Look up phone number information (carrier, type, caller name) and verify users
  via SMS/voice OTP. Use for phone verification and data enrichment. This skill
  provides Java SDK examples.
metadata:
  author: telnyx
  product: verify
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Lookup phone number data

Returns information about the provided phone number.

`GET /number_lookup/{phone_number}`

```java
import com.telnyx.sdk.models.numberlookup.NumberLookupRetrieveParams;
import com.telnyx.sdk.models.numberlookup.NumberLookupRetrieveResponse;

NumberLookupRetrieveResponse numberLookup = client.numberLookup().retrieve("+18665552368");
```

## List verifications by phone number

`GET /verifications/by_phone_number/{phone_number}`

```java
import com.telnyx.sdk.models.verifications.byphonenumber.ByPhoneNumberListParams;
import com.telnyx.sdk.models.verifications.byphonenumber.ByPhoneNumberListResponse;

ByPhoneNumberListResponse byPhoneNumbers = client.verifications().byPhoneNumber().list("+13035551234");
```

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

## Trigger Call verification

`POST /verifications/call` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (['string', 'null']), `extension` (['string', 'null']), `timeout_secs` (integer)

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerCallParams;

VerificationTriggerCallParams params = VerificationTriggerCallParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerCall(params);
```

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

## Trigger SMS verification

`POST /verifications/sms` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (['string', 'null']), `timeout_secs` (integer)

```java
import com.telnyx.sdk.models.verifications.CreateVerificationResponse;
import com.telnyx.sdk.models.verifications.VerificationTriggerSmsParams;

VerificationTriggerSmsParams params = VerificationTriggerSmsParams.builder()
    .phoneNumber("+13035551234")
    .verifyProfileId("12ade33a-21c0-473b-b055-b3c836e1c292")
    .build();
CreateVerificationResponse createVerificationResponse = client.verifications().triggerSms(params);
```

## Retrieve verification

`GET /verifications/{verification_id}`

```java
import com.telnyx.sdk.models.verifications.VerificationRetrieveParams;
import com.telnyx.sdk.models.verifications.VerificationRetrieveResponse;

VerificationRetrieveResponse verification = client.verifications().retrieve("12ade33a-21c0-473b-b055-b3c836e1c292");
```

## Verify verification code by ID

`POST /verifications/{verification_id}/actions/verify`

Optional: `code` (string), `status` (enum)

```java
import com.telnyx.sdk.models.verifications.actions.ActionVerifyParams;
import com.telnyx.sdk.models.verifications.byphonenumber.actions.VerifyVerificationCodeResponse;

VerifyVerificationCodeResponse verifyVerificationCodeResponse = client.verifications().actions().verify("12ade33a-21c0-473b-b055-b3c836e1c292");
```

## List all Verify profiles

Gets a paginated list of Verify profiles.

`GET /verify_profiles`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileListPage;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileListParams;

VerifyProfileListPage page = client.verifyProfiles().list();
```

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

## Retrieve Verify profile message templates

List all Verify profile message templates.

`GET /verify_profiles/templates`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveTemplatesParams;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveTemplatesResponse;

VerifyProfileRetrieveTemplatesResponse response = client.verifyProfiles().retrieveTemplates();
```

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

## Retrieve Verify profile

Gets a single Verify profile.

`GET /verify_profiles/{verify_profile_id}`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileRetrieveParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().retrieve("12ade33a-21c0-473b-b055-b3c836e1c292");
```

## Update Verify profile

`PATCH /verify_profiles/{verify_profile_id}`

Optional: `call` (object), `flashcall` (object), `language` (string), `name` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileUpdateParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().update("12ade33a-21c0-473b-b055-b3c836e1c292");
```

## Delete Verify profile

`DELETE /verify_profiles/{verify_profile_id}`

```java
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileData;
import com.telnyx.sdk.models.verifyprofiles.VerifyProfileDeleteParams;

VerifyProfileData verifyProfileData = client.verifyProfiles().delete("12ade33a-21c0-473b-b055-b3c836e1c292");
```
