---
name: telnyx-numbers-config-java
description: >-
  Phone number config: caller ID, call forwarding, messaging enablement,
  connection assignments.
metadata:
  author: telnyx
  product: numbers-config
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

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
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberUpdateParams;
import com.telnyx.sdk.models.mobilephonenumbers.MobilePhoneNumberUpdateResponse;

MobilePhoneNumberUpdateResponse mobilePhoneNumber = client.mobilePhoneNumbers().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
