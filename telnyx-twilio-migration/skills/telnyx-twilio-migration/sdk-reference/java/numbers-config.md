<!-- SDK reference: telnyx-numbers-config-java -->

# Telnyx Numbers Config - Java

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-java)

### Steps

1. **List your numbers**: `client.phoneNumbers().list(params)`
2. **Update voice settings**: `client.phoneNumbers().voice().update(params)`
3. **Update messaging settings**: `client.phoneNumbers().messaging().update(params)`

### Common mistakes

- Use phone_numbers.voice.update() for voice/connection settings and phone_numbers.messaging.update() for messaging/profile settings — they are SEPARATE endpoints
- Bulk operations are available for updating many numbers at once — see bulk_phone_number_operations endpoints

**Related skills**: telnyx-numbers-java, telnyx-messaging-profiles-java, telnyx-voice-java

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
    var result = client.phoneNumbers().list(params);
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Bulk update phone number profiles

`client.messagingNumbersBulkUpdates().create()` — `POST /messaging_numbers_bulk_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | Configure the messaging profile these phone numbers are assi... |
| `numbers` | array[string] | Yes | The list of phone numbers to update. |
| `assignOnly` | boolean | No | If true, only assign numbers to the profile without changing... |

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

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## Retrieve bulk update status

`client.messagingNumbersBulkUpdates().retrieve()` — `GET /messaging_numbers_bulk_updates/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string (UUID) | Yes | Order ID to verify bulk update status. |

```java
import com.telnyx.sdk.models.messagingnumbersbulkupdates.MessagingNumbersBulkUpdateRetrieveParams;
import com.telnyx.sdk.models.messagingnumbersbulkupdates.MessagingNumbersBulkUpdateRetrieveResponse;

MessagingNumbersBulkUpdateRetrieveResponse messagingNumbersBulkUpdate = client.messagingNumbersBulkUpdates().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## List mobile phone numbers with messaging settings

`client.mobilePhoneNumbers().messaging().list()` — `GET /mobile_phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingListPage;
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingListParams;

MessagingListPage page = client.mobilePhoneNumbers().messaging().list();
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a mobile phone number with messaging settings

`client.mobilePhoneNumbers().messaging().retrieve()` — `GET /mobile_phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.mobilephonenumbers.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.mobilePhoneNumbers().messaging().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List phone numbers

`client.phoneNumbers().list()` — `GET /phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `handleMessagingProfileError` | enum (true, false) | No | Although it is an infrequent occurrence, due to the highly d... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberListPage;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberListParams;

PhoneNumberListPage page = client.phoneNumbers().list();
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`client.phoneNumbers().actions().verifyOwnership()` — `POST /phone_numbers/actions/verify_ownership`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | Array of phone numbers to verify ownership for |

```java
import com.telnyx.sdk.models.phonenumbers.actions.ActionVerifyOwnershipParams;
import com.telnyx.sdk.models.phonenumbers.actions.ActionVerifyOwnershipResponse;

ActionVerifyOwnershipParams params = ActionVerifyOwnershipParams.builder()
    .addPhoneNumber("+15551234567")
    .build();
ActionVerifyOwnershipResponse response = client.phoneNumbers().actions().verifyOwnership(params);
```

Key response fields: `response.data.found, response.data.not_found, response.data.record_type`

## Lists the phone numbers jobs

`client.phoneNumbers().jobs().list()` — `GET /phone_numbers/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobListPage;
import com.telnyx.sdk.models.phonenumbers.jobs.JobListParams;

JobListPage page = client.phoneNumbers().jobs().list();
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`client.phoneNumbers().jobs().deleteBatch()` — `POST /phone_numbers/jobs/delete_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |

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

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers. At most one thousand numbers can be updated per API call.

`client.phoneNumbers().jobs().updateEmergencySettingsBatch()` — `POST /phone_numbers/jobs/update_emergency_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |
| `emergencyEnabled` | boolean | Yes | Indicates whether to enable or disable emergency services on... |
| `emergencyAddressId` | string (UUID) | No | Identifies the address to be used with emergency services. |

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

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update a batch of numbers

Creates a new background job to update a batch of numbers. At most one thousand numbers can be updated per API call. At least one of the updateable fields must be submitted.

`client.phoneNumbers().jobs().updateBatch()` — `POST /phone_numbers/jobs/update_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | Array of phone number ids and/or phone numbers in E164 forma... |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connectionId` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +6 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobUpdateBatchParams;
import com.telnyx.sdk.models.phonenumbers.jobs.JobUpdateBatchResponse;

JobUpdateBatchParams params = JobUpdateBatchParams.builder()
    .addPhoneNumber("1583466971586889004")
    .addPhoneNumber("+13127367254")
    .build();
JobUpdateBatchResponse response = client.phoneNumbers().jobs().updateBatch(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieve a phone numbers job

`client.phoneNumbers().jobs().retrieve()` — `GET /phone_numbers/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the Phone Numbers Job. |

```java
import com.telnyx.sdk.models.phonenumbers.jobs.JobRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.jobs.JobRetrieveResponse;

JobRetrieveResponse job = client.phoneNumbers().jobs().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List phone numbers with messaging settings

`client.phoneNumbers().messaging().list()` — `GET /phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[type]` | enum (tollfree, longcode, shortcode) | No | Filter by phone number type. |
| `sort[phoneNumber]` | enum (asc, desc) | No | Sort by phone number. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +3 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingListPage;
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingListParams;

MessagingListPage page = client.phoneNumbers().messaging().list();
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`client.phoneNumbers().slimList()` — `GET /phone_numbers/slim`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `includeConnection` | boolean | No | Include the connection associated with the phone number. |
| ... | | | +2 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberSlimListPage;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberSlimListParams;

PhoneNumberSlimListPage page = client.phoneNumbers().slimList();
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List phone numbers with voice settings

`client.phoneNumbers().voice().list()` — `GET /phone_numbers/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.phonenumbers.voice.VoiceListPage;
import com.telnyx.sdk.models.phonenumbers.voice.VoiceListParams;

VoiceListPage page = client.phoneNumbers().voice().list();
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number

`client.phoneNumbers().retrieve()` — `GET /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberRetrieveResponse;

PhoneNumberRetrieveResponse phoneNumber = client.phoneNumbers().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a phone number

`client.phoneNumbers().update()` — `PATCH /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `connectionId` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +5 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberUpdateParams;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberUpdateResponse;

PhoneNumberUpdateResponse phoneNumber = client.phoneNumbers().update("1293384261075731499");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Delete a phone number

`client.phoneNumbers().delete()` — `DELETE /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.phonenumbers.PhoneNumberDeleteParams;
import com.telnyx.sdk.models.phonenumbers.PhoneNumberDeleteResponse;

PhoneNumberDeleteResponse phoneNumber = client.phoneNumbers().delete("1293384261075731499");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`client.phoneNumbers().actions().changeBundleStatus()` — `PATCH /phone_numbers/{id}/actions/bundle_status_change`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundleId` | string (UUID) | Yes | The new bundle_id setting for the number. |
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.phonenumbers.actions.ActionChangeBundleStatusParams;
import com.telnyx.sdk.models.phonenumbers.actions.ActionChangeBundleStatusResponse;

ActionChangeBundleStatusParams params = ActionChangeBundleStatusParams.builder()
    .id("1293384261075731499")
    .bundleId("5194d8fc-87e6-4188-baa9-1c434bbe861b")
    .build();
ActionChangeBundleStatusResponse response = client.phoneNumbers().actions().changeBundleStatus(params);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Enable emergency for a phone number

`client.phoneNumbers().actions().enableEmergency()` — `POST /phone_numbers/{id}/actions/enable_emergency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emergencyEnabled` | boolean | Yes | Indicates whether to enable emergency services on this numbe... |
| `emergencyAddressId` | string (UUID) | Yes | Identifies the address to be used with emergency services. |
| `id` | string (UUID) | Yes | Identifies the resource. |

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

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number with messaging settings

`client.phoneNumbers().messaging().retrieve()` — `GET /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingRetrieveResponse;

MessagingRetrieveResponse messaging = client.phoneNumbers().messaging().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update the messaging profile and/or messaging product of a phone number

`client.phoneNumbers().messaging().update()` — `PATCH /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The phone number to update. |
| `messagingProfileId` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messagingProduct` | string | No | Configure the messaging product for this number:

* Omit thi... |

```java
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingUpdateParams;
import com.telnyx.sdk.models.phonenumbers.messaging.MessagingUpdateResponse;

MessagingUpdateResponse messaging = client.phoneNumbers().messaging().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a phone number with voice settings

`client.phoneNumbers().voice().retrieve()` — `GET /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.phonenumbers.voice.VoiceRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.voice.VoiceRetrieveResponse;

VoiceRetrieveResponse voice = client.phoneNumbers().voice().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Update a phone number with voice settings

`client.phoneNumbers().voice().update()` — `PATCH /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usagePaymentMethod` | enum (pay-per-minute, channel) | No | Controls whether a number is billed per minute or uses your ... |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) | No | The inbound_call_screening setting is a phone number configu... |
| `techPrefixEnabled` | boolean | No | Controls whether a tech prefix is enabled for this phone num... |
| ... | | | +6 optional params in the API Details section below |

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

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## List Mobile Phone Numbers

`client.mobilePhoneNumbers().list()` — `GET /v2/mobile_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberListPage;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberListParams;

MobilePhoneNumberListPage page = client.mobilePhoneNumbers().list();
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a Mobile Phone Number

`client.mobilePhoneNumbers().retrieve()` — `GET /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberRetrieveParams;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberRetrieveResponse;

MobilePhoneNumberRetrieveResponse mobilePhoneNumber = client.mobilePhoneNumbers().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a Mobile Phone Number

`client.mobilePhoneNumbers().update()` — `PATCH /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile phone number |
| `connectionId` | string (UUID) | No |  |
| `tags` | array[string] | No |  |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) | No |  |
| ... | | | +8 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberUpdateParams;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberUpdateResponse;

MobilePhoneNumberUpdateResponse mobilePhoneNumber = client.mobilePhoneNumbers().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

---

# Numbers Config (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Bulk update phone number profiles, Retrieve bulk update status

| Field | Type |
|-------|------|
| `failed` | array[string] |
| `order_id` | uuid |
| `pending` | array[string] |
| `record_type` | enum: messaging_numbers_bulk_update |
| `success` | array[string] |

**Returned by:** List mobile phone numbers with messaging settings, Retrieve a mobile phone number with messaging settings

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `features` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: longcode |
| `updated_at` | date-time |

**Returned by:** List phone numbers, Retrieve a phone number, Update a phone number

| Field | Type |
|-------|------|
| `billing_group_id` | string \| null |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string \| null |
| `connection_name` | string \| null |
| `country_iso_alpha2` | string |
| `created_at` | date-time |
| `customer_reference` | string \| null |
| `deletion_lock_enabled` | boolean |
| `emergency_address_id` | string \| null |
| `emergency_enabled` | boolean |
| `emergency_status` | enum: active, deprovisioning, disabled, provisioning, provisioning-failed |
| `external_pin` | string \| null |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `messaging_profile_id` | string \| null |
| `messaging_profile_name` | string \| null |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode |
| `purchased_at` | string |
| `record_type` | string |
| `source_type` | object |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending |
| `t38_fax_gateway_enabled` | boolean |
| `tags` | array[string] |
| `updated_at` | string |

**Returned by:** Verify ownership of phone numbers

| Field | Type |
|-------|------|
| `found` | array[object] |
| `not_found` | array[string] |
| `record_type` | string |

**Returned by:** Lists the phone numbers jobs, Delete a batch of numbers, Update the emergency settings from a batch of numbers, Update a batch of numbers, Retrieve a phone numbers job

| Field | Type |
|-------|------|
| `created_at` | string |
| `etc` | date-time |
| `failed_operations` | array[object] |
| `id` | uuid |
| `pending_operations` | array[object] |
| `phone_numbers` | array[object] |
| `record_type` | string |
| `status` | enum: pending, in_progress, completed, failed, expired |
| `successful_operations` | array[object] |
| `type` | enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers |
| `updated_at` | string |

**Returned by:** List phone numbers with messaging settings, Retrieve a phone number with messaging settings, Update the messaging profile and/or messaging product of a phone number

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `eligible_messaging_products` | array[string] |
| `features` | object |
| `health` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: long-code, toll-free, short-code, longcode, tollfree, shortcode |
| `updated_at` | date-time |

**Returned by:** Slim List phone numbers

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string |
| `country_iso_alpha2` | string |
| `created_at` | string |
| `customer_reference` | string |
| `emergency_address_id` | string |
| `emergency_enabled` | boolean |
| `emergency_status` | enum: active, deprovisioning, disabled, provisioning, provisioning-failed |
| `external_pin` | string |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode |
| `purchased_at` | string |
| `record_type` | string |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending |
| `t38_fax_gateway_enabled` | boolean |
| `updated_at` | string |

**Returned by:** List phone numbers with voice settings, Change the bundle status for a phone number (set to being in a bundle or remove from a bundle), Enable emergency for a phone number, Retrieve a phone number with voice settings, Update a phone number with voice settings

| Field | Type |
|-------|------|
| `call_forwarding` | object |
| `call_recording` | object |
| `cnam_listing` | object |
| `connection_id` | string |
| `customer_reference` | string |
| `emergency` | object |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `media_features` | object |
| `phone_number` | string |
| `record_type` | string |
| `tech_prefix_enabled` | boolean |
| `translated_number` | string |
| `usage_payment_method` | enum: pay-per-minute, channel |

**Returned by:** Delete a phone number

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string |
| `connection_name` | string |
| `created_at` | string |
| `customer_reference` | string |
| `deletion_lock_enabled` | boolean |
| `emergency_address_id` | string |
| `emergency_enabled` | boolean |
| `external_pin` | string |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `messaging_profile_id` | string |
| `messaging_profile_name` | string |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline |
| `purchased_at` | string |
| `record_type` | string |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending |
| `t38_fax_gateway_enabled` | boolean |
| `tags` | array[string] |
| `updated_at` | string |

**Returned by:** List Mobile Phone Numbers, Retrieve a Mobile Phone Number, Update a Mobile Phone Number

| Field | Type |
|-------|------|
| `call_forwarding` | object |
| `call_recording` | object |
| `caller_id_name_enabled` | boolean |
| `cnam_listing` | object |
| `connection_id` | string \| null |
| `connection_name` | string \| null |
| `connection_type` | string \| null |
| `country_iso_alpha2` | string |
| `created_at` | date-time |
| `customer_reference` | string \| null |
| `id` | string |
| `inbound` | object |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `mobile_voice_enabled` | boolean |
| `noise_suppression` | enum: inbound, outbound, both, disabled |
| `outbound` | object |
| `phone_number` | string |
| `record_type` | string |
| `sim_card_id` | uuid |
| `status` | string |
| `tags` | array[string] |
| `updated_at` | date-time |

## Optional Parameters

### Bulk update phone number profiles — `client.messagingNumbersBulkUpdates().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignOnly` | boolean | If true, only assign numbers to the profile without changing other settings. |

### Update the emergency settings from a batch of numbers — `client.phoneNumbers().jobs().updateEmergencySettingsBatch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `emergencyAddressId` | string (UUID) | Identifies the address to be used with emergency services. |

### Update a batch of numbers — `client.phoneNumbers().jobs().updateBatch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `externalPin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `customerReference` | string | A customer reference string for customer look ups. |
| `connectionId` | string (UUID) | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |
| `hdVoiceEnabled` | boolean | Indicates whether to enable or disable HD Voice on each phone number. |
| `deletionLockEnabled` | boolean | Indicates whether to enable or disable the deletion lock on each phone number. |
| `voice` | object |  |
| `filter` | object | Consolidated filter parameter (deepObject style). |

### Update a phone number — `client.phoneNumbers().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the type of resource. |
| `tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `externalPin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `hdVoiceEnabled` | boolean | Indicates whether HD voice is enabled for this number. |
| `customerReference` | string | A customer reference string for customer look ups. |
| `addressId` | string (UUID) | Identifies the address associated with the phone number. |
| `connectionId` | string (UUID) | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |

### Update the messaging profile and/or messaging product of a phone number — `client.phoneNumbers().messaging().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `messagingProfileId` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `messagingProduct` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `tags` | array[string] | Tags to set on this phone number. |

### Update a phone number with voice settings — `client.phoneNumbers().voice().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `techPrefixEnabled` | boolean | Controls whether a tech prefix is enabled for this phone number. |
| `translatedNumber` | string | This field allows you to rewrite the destination number of an inbound call be... |
| `callerIdNameEnabled` | boolean | Controls whether the caller ID name is enabled for this phone number. |
| `callForwarding` | object | The call forwarding settings for a phone number. |
| `cnamListing` | object | The CNAM listing settings for a phone number. |
| `usagePaymentMethod` | enum (pay-per-minute, channel) | Controls whether a number is billed per minute or uses your concurrent channels. |
| `mediaFeatures` | object | The media features settings for a phone number. |
| `callRecording` | object | The call recording settings for a phone number. |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) | The inbound_call_screening setting is a phone number configuration option var... |

### Update a Mobile Phone Number — `client.mobilePhoneNumbers().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string |  |
| `connectionId` | string (UUID) |  |
| `noiseSuppression` | boolean |  |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) |  |
| `callerIdNameEnabled` | boolean |  |
| `tags` | array[string] |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `callForwarding` | object |  |
| `cnamListing` | object |  |
| `callRecording` | object |  |
