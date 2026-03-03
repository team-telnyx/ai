---
name: telnyx-numbers-config-java
description: >-
  Configure phone number settings including caller ID, call forwarding,
  messaging enablement, and connection assignments. This skill provides Java SDK
  examples.
metadata:
  author: telnyx
  product: numbers-config
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - Java

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

## Bulk update phone number profiles

`POST /messaging_numbers_bulk_updates` — Required: `messaging_profile_id`, `numbers`

Optional: `assign_only` (boolean)

```java
import com.telnyx.sdk.models.messagingnumbersbulkupdates.MessagingNumbersBulkUpdateCreateParams;
import com.telnyx.sdk.models.messagingnumbersbulkupdates.MessagingNumbersBulkUpdateCreateResponse;
import java.util.List;

MessagingNumbersBulkUpdateCreateParams params = MessagingNumbersBulkUpdateCreateParams.builder()
    .messagingProfileId("00000000-0000-0000-0000-000000000000")
    .numbers(List.of(
      "+18880000000",
      "+18880000001",
      "+18880000002"
    ))
    .build();
MessagingNumbersBulkUpdateCreateResponse messagingNumbersBulkUpdate = client.messagingNumbersBulkUpdates().create(params);
```

## Retrieve bulk update status

`GET /messaging_numbers_bulk_updates/{order_id}`

```java
import com.telnyx.sdk.models.messagingnumbersbulkupdates.MessagingNumbersBulkUpdateRetrieveParams;
import com.telnyx.sdk.models.messagingnumbersbulkupdates.MessagingNumbersBulkUpdateRetrieveResponse;

MessagingNumbersBulkUpdateRetrieveResponse messagingNumbersBulkUpdate = client.messagingNumbersBulkUpdates().retrieve("order_id");
```

## List mobile phone numbers with messaging settings

`GET /mobile_phone_numbers/messaging`

```java
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingListPage;
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingListParams;

MessagingListPage page = client.mobilePhoneNumbers().messaging().list();
```

## Retrieve a mobile phone number with messaging settings

`GET /mobile_phone_numbers/{id}/messaging`

```java
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.mobilePhoneNumbers().messaging().retrieve("id");
```

## List phone numbers

`GET /phone_numbers`

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberListPage;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberListParams;

PhoneNumberListPage page = client.phoneNumbers().list();
```

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`POST /phone_numbers/actions/verify_ownership` — Required: `phone_numbers`

```java
import com.telnyx.sdk.models.phonenumbers.actions.ActionVerifyOwnershipParams;
import com.telnyx.sdk.models.phonenumbers.actions.ActionVerifyOwnershipResponse;

ActionVerifyOwnershipParams params = ActionVerifyOwnershipParams.builder()
    .addPhoneNumber("+15551234567")
    .build();
ActionVerifyOwnershipResponse response = client.phoneNumbers().actions().verifyOwnership(params);
```

## Lists the phone numbers jobs

`GET /phone_numbers/jobs`

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobListPage;
import com.telnyx.sdk.models.phonenumbers.jobs.JobListParams;

JobListPage page = client.phoneNumbers().jobs().list();
```

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers.

`POST /phone_numbers/jobs/delete_phone_numbers` — Required: `phone_numbers`

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobDeleteBatchParams;
import com.telnyx.sdk.models.phonenumbers.jobs.JobDeleteBatchResponse;
import java.util.List;

JobDeleteBatchParams params = JobDeleteBatchParams.builder()
    .phoneNumbers(List.of(
      "+19705555098",
      "+19715555098",
      "32873127836"
    ))
    .build();
JobDeleteBatchResponse response = client.phoneNumbers().jobs().deleteBatch(params);
```

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers.

`POST /phone_numbers/jobs/update_emergency_settings` — Required: `emergency_enabled`, `phone_numbers`

Optional: `emergency_address_id` (['string', 'null'])

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobUpdateEmergencySettingsBatchParams;
import com.telnyx.sdk.models.phonenumbers.jobs.JobUpdateEmergencySettingsBatchResponse;
import java.util.List;

JobUpdateEmergencySettingsBatchParams params = JobUpdateEmergencySettingsBatchParams.builder()
    .emergencyEnabled(true)
    .phoneNumbers(List.of(
      "+19705555098",
      "+19715555098",
      "32873127836"
    ))
    .build();
JobUpdateEmergencySettingsBatchResponse response = client.phoneNumbers().jobs().updateEmergencySettingsBatch(params);
```

## Update a batch of numbers

Creates a new background job to update a batch of numbers.

`POST /phone_numbers/jobs/update_phone_numbers` — Required: `phone_numbers`

Optional: `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `deletion_lock_enabled` (boolean), `external_pin` (string), `hd_voice_enabled` (boolean), `tags` (array[string]), `voice` (object)

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobUpdateBatchParams;
import com.telnyx.sdk.models.phonenumbers.jobs.JobUpdateBatchResponse;

JobUpdateBatchParams params = JobUpdateBatchParams.builder()
    .addPhoneNumber("1583466971586889004")
    .addPhoneNumber("+13127367254")
    .build();
JobUpdateBatchResponse response = client.phoneNumbers().jobs().updateBatch(params);
```

## Retrieve a phone numbers job

`GET /phone_numbers/jobs/{id}`

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.jobs.JobRetrieveResponse;

JobRetrieveResponse job = client.phoneNumbers().jobs().retrieve("id");
```

## List phone numbers with messaging settings

`GET /phone_numbers/messaging`

```java
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingListPage;
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingListParams;

MessagingListPage page = client.phoneNumbers().messaging().list();
```

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`GET /phone_numbers/slim`

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberSlimListPage;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberSlimListParams;

PhoneNumberSlimListPage page = client.phoneNumbers().slimList();
```

## List phone numbers with voice settings

`GET /phone_numbers/voice`

```java
import com.telnyx.sdk.models.phonenumbers.voice.VoiceListPage;
import com.telnyx.sdk.models.phonenumbers.voice.VoiceListParams;

VoiceListPage page = client.phoneNumbers().voice().list();
```

## Retrieve a phone number

`GET /phone_numbers/{id}`

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberRetrieveResponse;

PhoneNumberRetrieveResponse phoneNumber = client.phoneNumbers().retrieve("1293384261075731499");
```

## Update a phone number

`PATCH /phone_numbers/{id}`

Optional: `address_id` (string), `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `external_pin` (string), `hd_voice_enabled` (boolean), `id` (string), `tags` (array[string])

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberUpdateParams;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberUpdateResponse;

PhoneNumberUpdateResponse phoneNumber = client.phoneNumbers().update("1293384261075731499");
```

## Delete a phone number

`DELETE /phone_numbers/{id}`

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberDeleteParams;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberDeleteResponse;

PhoneNumberDeleteResponse phoneNumber = client.phoneNumbers().delete("1293384261075731499");
```

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`PATCH /phone_numbers/{id}/actions/bundle_status_change` — Required: `bundle_id`

```java
import com.telnyx.sdk.models.phonenumbers.actions.ActionChangeBundleStatusParams;
import com.telnyx.sdk.models.phonenumbers.actions.ActionChangeBundleStatusResponse;

ActionChangeBundleStatusParams params = ActionChangeBundleStatusParams.builder()
    .id("1293384261075731499")
    .bundleId("5194d8fc-87e6-4188-baa9-1c434bbe861b")
    .build();
ActionChangeBundleStatusResponse response = client.phoneNumbers().actions().changeBundleStatus(params);
```

## Enable emergency for a phone number

`POST /phone_numbers/{id}/actions/enable_emergency` — Required: `emergency_enabled`, `emergency_address_id`

```java
import com.telnyx.sdk.models.phonenumbers.actions.ActionEnableEmergencyParams;
import com.telnyx.sdk.models.phonenumbers.actions.ActionEnableEmergencyResponse;

ActionEnableEmergencyParams params = ActionEnableEmergencyParams.builder()
    .id("1293384261075731499")
    .emergencyAddressId("53829456729313")
    .emergencyEnabled(true)
    .build();
ActionEnableEmergencyResponse response = client.phoneNumbers().actions().enableEmergency(params);
```

## Retrieve a phone number with messaging settings

`GET /phone_numbers/{id}/messaging`

```java
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.phoneNumbers().messaging().retrieve("id");
```

## Update the messaging profile and/or messaging product of a phone number

`PATCH /phone_numbers/{id}/messaging`

Optional: `messaging_product` (string), `messaging_profile_id` (string), `tags` (array[string])

```java
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingUpdateParams;
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingUpdateResponse;

MessagingUpdateResponse messaging = client.phoneNumbers().messaging().update("id");
```

## Retrieve a phone number with voice settings

`GET /phone_numbers/{id}/voice`

```java
import com.telnyx.sdk.models.phonenumbers.voice.VoiceRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.voice.VoiceRetrieveResponse;

VoiceRetrieveResponse voice = client.phoneNumbers().voice().retrieve("1293384261075731499");
```

## Update a phone number with voice settings

`PATCH /phone_numbers/{id}/voice`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `inbound_call_screening` (enum), `media_features` (object), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum)

```java
import com.telnyx.sdk.models.phonenumbers.voice.UpdateVoiceSettings;
import com.telnyx.sdk.models.phonenumbers.voice.VoiceUpdateParams;
import com.telnyx.sdk.models.phonenumbers.voice.VoiceUpdateResponse;

VoiceUpdateParams params = VoiceUpdateParams.builder()
    .id("1293384261075731499")
    .updateVoiceSettings(UpdateVoiceSettings.builder().build())
    .build();
VoiceUpdateResponse voice = client.phoneNumbers().voice().update(params);
```

## List Mobile Phone Numbers

`GET /v2/mobile_phone_numbers`

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberListPage;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberListParams;

MobilePhoneNumberListPage page = client.mobilePhoneNumbers().list();
```

## Retrieve a Mobile Phone Number

`GET /v2/mobile_phone_numbers/{id}`

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberRetrieveParams;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberRetrieveResponse;

MobilePhoneNumberRetrieveResponse mobilePhoneNumber = client.mobilePhoneNumbers().retrieve("id");
```

## Update a Mobile Phone Number

`PATCH /v2/mobile_phone_numbers/{id}`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (['string', 'null']), `customer_reference` (['string', 'null']), `inbound` (object), `inbound_call_screening` (enum), `noise_suppression` (boolean), `outbound` (object), `tags` (array[string])

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberUpdateParams;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberUpdateResponse;

MobilePhoneNumberUpdateResponse mobilePhoneNumber = client.mobilePhoneNumbers().update("id");
```
