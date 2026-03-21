<!-- SDK reference: telnyx-account-notifications-java -->

# Telnyx Account Notifications - Java

## Core Workflow

### Steps

1. **Create notification channel**: `client.notificationChannels().create(params)`
2. **Create notification profile**: `client.notificationProfiles().create(params)`

### Common mistakes

- Notification channels must be verified before they receive alerts

**Related skills**: telnyx-account-java

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
    var result = client.notificationChannels().create(params);
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
## List notification channels

List notification channels.

`client.notificationChannels().list()` — `GET /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelListPage;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelListParams;

NotificationChannelListPage page = client.notificationChannels().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a notification channel

Create a notification channel.

`client.notificationChannels().create()` — `POST /notification_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelCreateParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelCreateResponse;

NotificationChannelCreateParams params = NotificationChannelCreateParams.builder()

    .channelTypeId("550e8400-e29b-41d4-a716-446655440000")

    .channelDestination("https://example.com/webhooks")

    .build();

NotificationChannelCreateResponse notificationChannel = client.notificationChannels().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a notification channel

Get a notification channel.

`client.notificationChannels().retrieve()` — `GET /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelRetrieveParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelRetrieveResponse;

NotificationChannelRetrieveResponse notificationChannel = client.notificationChannels().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a notification channel

Update a notification channel.

`client.notificationChannels().update()` — `PATCH /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `notificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | No | A Channel Type ID |
| `id` | string (UUID) | No | A UUID. |
| ... | | | +3 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannel;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelUpdateParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelUpdateResponse;

NotificationChannelUpdateParams params = NotificationChannelUpdateParams.builder()
    .notificationChannelId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .notificationChannel(NotificationChannel.builder().build())
    .build();
NotificationChannelUpdateResponse notificationChannel = client.notificationChannels().update(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a notification channel

Delete a notification channel.

`client.notificationChannels().delete()` — `DELETE /notification_channels/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelDeleteParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelDeleteResponse;

NotificationChannelDeleteResponse notificationChannel = client.notificationChannels().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`client.notificationEventConditions().list()` — `GET /notification_event_conditions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.notificationeventconditions.NotificationEventConditionListPage;
import com.telnyx.sdk.models.notificationeventconditions.NotificationEventConditionListParams;

NotificationEventConditionListPage page = client.notificationEventConditions().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Events

Returns a list of your notifications events.

`client.notificationEvents().list()` — `GET /notification_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.notificationevents.NotificationEventListPage;
import com.telnyx.sdk.models.notificationevents.NotificationEventListParams;

NotificationEventListPage page = client.notificationEvents().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Notifications Profiles

Returns a list of your notifications profiles.

`client.notificationProfiles().list()` — `GET /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileListPage;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileListParams;

NotificationProfileListPage page = client.notificationProfiles().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a notification profile

Create a notification profile.

`client.notificationProfiles().create()` — `POST /notification_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `createdAt` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileCreateParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileCreateResponse;

NotificationProfileCreateParams params = NotificationProfileCreateParams.builder()

    .name("My Notification Profile")

    .build();

NotificationProfileCreateResponse notificationProfile = client.notificationProfiles().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a notification profile

Get a notification profile.

`client.notificationProfiles().retrieve()` — `GET /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileRetrieveParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileRetrieveResponse;

NotificationProfileRetrieveResponse notificationProfile = client.notificationProfiles().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a notification profile

Update a notification profile.

`client.notificationProfiles().update()` — `PATCH /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |
| `id` | string (UUID) | No | A UUID. |
| `name` | string | No | A human readable name. |
| `createdAt` | string (date-time) | No | ISO 8601 formatted date indicating when the resource was cre... |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfile;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileUpdateParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileUpdateResponse;

NotificationProfileUpdateParams params = NotificationProfileUpdateParams.builder()
    .notificationProfileId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .notificationProfile(NotificationProfile.builder().build())
    .build();
NotificationProfileUpdateResponse notificationProfile = client.notificationProfiles().update(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a notification profile

Delete a notification profile.

`client.notificationProfiles().delete()` — `DELETE /notification_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileDeleteParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileDeleteResponse;

NotificationProfileDeleteResponse notificationProfile = client.notificationProfiles().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List notification settings

List notification settings.

`client.notificationSettings().list()` — `GET /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingListPage;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingListParams;

NotificationSettingListPage page = client.notificationSettings().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Add a Notification Setting

Add a notification setting.

`client.notificationSettings().create()` — `POST /notification_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notificationEventConditionId` | string (UUID) | No | A UUID reference to the associated Notification Event Condit... |
| `notificationProfileId` | string (UUID) | No | A UUID reference to the associated Notification Profile. |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | No | Most preferences apply immediately; however, other may needs... |
| ... | | | +7 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingCreateParams;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingCreateResponse;

NotificationSettingCreateResponse notificationSetting = client.notificationSettings().create();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a notification setting

Get a notification setting.

`client.notificationSettings().retrieve()` — `GET /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingRetrieveParams;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingRetrieveResponse;

NotificationSettingRetrieveResponse notificationSetting = client.notificationSettings().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a notification setting

Delete a notification setting.

`client.notificationSettings().delete()` — `DELETE /notification_settings/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the resource. |

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingDeleteParams;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingDeleteResponse;

NotificationSettingDeleteResponse notificationSetting = client.notificationSettings().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

---

# Account Notifications (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List notification channels, Create a notification channel, Get a notification channel, Update a notification channel, Delete a notification channel

| Field | Type |
|-------|------|
| `channel_destination` | string |
| `channel_type_id` | enum: sms, voice, email, webhook |
| `created_at` | date-time |
| `id` | string |
| `notification_profile_id` | string |
| `updated_at` | date-time |

**Returned by:** List all Notifications Events Conditions

| Field | Type |
|-------|------|
| `allow_multiple_channels` | boolean |
| `associated_record_type` | enum: account, phone_number |
| `asynchronous` | boolean |
| `created_at` | date-time |
| `description` | string |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `notification_event_id` | string |
| `parameters` | array[object] |
| `supported_channels` | array[string] |
| `updated_at` | date-time |

**Returned by:** List all Notifications Events

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `notification_category` | string |
| `updated_at` | date-time |

**Returned by:** List all Notifications Profiles, Create a notification profile, Get a notification profile, Update a notification profile, Delete a notification profile

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `name` | string |
| `updated_at` | date-time |

**Returned by:** List notification settings, Add a Notification Setting, Get a notification setting, Delete a notification setting

| Field | Type |
|-------|------|
| `associated_record_type` | string |
| `associated_record_type_value` | string |
| `created_at` | date-time |
| `id` | string |
| `notification_channel_id` | string |
| `notification_event_condition_id` | string |
| `notification_profile_id` | string |
| `parameters` | array[object] |
| `status` | enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted |
| `updated_at` | date-time |

## Optional Parameters

### Create a notification channel — `client.notificationChannels().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channelDestination` | string | The destination associated with the channel type. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification channel — `client.notificationChannels().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `channelTypeId` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `channelDestination` | string | The destination associated with the channel type. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Create a notification profile — `client.notificationProfiles().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification profile — `client.notificationProfiles().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `name` | string | A human readable name. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Add a Notification Setting — `client.notificationSettings().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | A UUID. |
| `notificationEventConditionId` | string (UUID) | A UUID reference to the associated Notification Event Condition. |
| `notificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `associatedRecordType` | string |  |
| `associatedRecordTypeValue` | string |  |
| `status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | Most preferences apply immediately; however, other may needs to propagate. |
| `notificationChannelId` | string (UUID) | A UUID reference to the associated Notification Channel. |
| `parameters` | array[object] |  |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
