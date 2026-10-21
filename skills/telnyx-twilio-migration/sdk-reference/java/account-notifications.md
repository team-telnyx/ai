<!-- SDK reference: telnyx-account-notifications-java -->

# Telnyx Account Notifications - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.95.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.95.0")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

// fromEnv() reads TELNYX_API_KEY and TELNYX_PUBLIC_KEY (the public key is required for
// client.webhooks().unwrap() — webhook verification)
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
        // Rate limited — wait, then retry the request (bounded exponential backoff)
        Thread.sleep(1000);
        // ...retry the call here (give up after a few attempts)
    }
    throw e; // Re-throw: a failed request must never look like success to the caller
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

## List notification channels

Returns a paginated list of your notification channels, the destinations that receive notifications.

`GET /notification_channels`

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelListPage;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelListParams;

NotificationChannelListPage page = client.notificationChannels().list();
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Create a notification channel

Creates a new notification channel defining where notifications are delivered, and returns the created channel.

`POST /notification_channels`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelCreateParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelCreateResponse;

NotificationChannelCreateParams params = NotificationChannelCreateParams.builder()

    .channelTypeId("550e8400-e29b-41d4-a716-446655440000")

    .channelDestination("https://example.com/webhooks")

    .build();

NotificationChannelCreateResponse notificationChannel = client.notificationChannels().create(params);
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Get a notification channel

Returns the details of a single notification channel by its identifier.

`GET /notification_channels/{id}`

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelRetrieveParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelRetrieveResponse;

NotificationChannelRetrieveResponse notificationChannel = client.notificationChannels().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Update a notification channel

Updates the specified notification channel and returns the updated channel.

`PATCH /notification_channels/{id}`

Optional: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

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

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## Delete a notification channel

Deletes the specified notification channel so notifications are no longer delivered to it.

`DELETE /notification_channels/{id}`

```java
import com.telnyx.sdk.models.notificationchannels.NotificationChannelDeleteParams;
import com.telnyx.sdk.models.notificationchannels.NotificationChannelDeleteResponse;

NotificationChannelDeleteResponse notificationChannel = client.notificationChannels().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `channel_destination` (string), `channel_type_id` (enum: sms, voice, email, webhook), `created_at` (date-time), `id` (string), `notification_profile_id` (string), `updated_at` (date-time)

## List all Notifications Events Conditions

Returns a list of your notifications events conditions.

`GET /notification_event_conditions`

```java
import com.telnyx.sdk.models.notificationeventconditions.NotificationEventConditionListPage;
import com.telnyx.sdk.models.notificationeventconditions.NotificationEventConditionListParams;

NotificationEventConditionListPage page = client.notificationEventConditions().list();
```

Returns: `allow_multiple_channels` (boolean), `associated_record_type` (enum: account, phone_number), `asynchronous` (boolean), `created_at` (date-time), `description` (string), `enabled` (boolean), `id` (string), `name` (string), `notification_event_id` (string), `parameters` (array[object]), `supported_channels` (array[string]), `updated_at` (date-time)

## List all Notifications Events

Returns a list of your notifications events.

`GET /notification_events`

```java
import com.telnyx.sdk.models.notificationevents.NotificationEventListPage;
import com.telnyx.sdk.models.notificationevents.NotificationEventListParams;

NotificationEventListPage page = client.notificationEvents().list();
```

Returns: `created_at` (date-time), `enabled` (boolean), `id` (string), `name` (string), `notification_category` (string), `updated_at` (date-time)

## List all Notifications Profiles

Returns a list of your notifications profiles.

`GET /notification_profiles`

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileListPage;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileListParams;

NotificationProfileListPage page = client.notificationProfiles().list();
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Create a notification profile

Creates a new notification profile, a named grouping used to organize notification settings, and returns it.

`POST /notification_profiles`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileCreateParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileCreateResponse;

NotificationProfileCreateParams params = NotificationProfileCreateParams.builder()

    .name("My Notification Profile")

    .build();

NotificationProfileCreateResponse notificationProfile = client.notificationProfiles().create(params);
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Get a notification profile

Returns the details of a single notification profile by its identifier.

`GET /notification_profiles/{id}`

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileRetrieveParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileRetrieveResponse;

NotificationProfileRetrieveResponse notificationProfile = client.notificationProfiles().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Update a notification profile

Updates the specified notification profile and returns the updated profile.

`PATCH /notification_profiles/{id}`

Optional: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

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

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## Delete a notification profile

Deletes the specified notification profile from your account.

`DELETE /notification_profiles/{id}`

```java
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileDeleteParams;
import com.telnyx.sdk.models.notificationprofiles.NotificationProfileDeleteResponse;

NotificationProfileDeleteResponse notificationProfile = client.notificationProfiles().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `created_at` (date-time), `id` (string), `name` (string), `updated_at` (date-time)

## List notification settings

Returns a paginated list of your notification settings, which map notification event types to profiles and channels.

`GET /notification_settings`

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingListPage;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingListParams;

NotificationSettingListPage page = client.notificationSettings().list();
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Add a Notification Setting

Adds a notification setting that enables delivery of a notification event type to a notification profile.

`POST /notification_settings`

Optional: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingCreateParams;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingCreateResponse;

NotificationSettingCreateResponse notificationSetting = client.notificationSettings().create();
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Get a notification setting

Returns the details of a single notification setting by its identifier.

`GET /notification_settings/{id}`

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingRetrieveParams;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingRetrieveResponse;

NotificationSettingRetrieveResponse notificationSetting = client.notificationSettings().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)

## Delete a notification setting

Deletes the specified notification setting, disabling that notification delivery.

`DELETE /notification_settings/{id}`

```java
import com.telnyx.sdk.models.notificationsettings.NotificationSettingDeleteParams;
import com.telnyx.sdk.models.notificationsettings.NotificationSettingDeleteResponse;

NotificationSettingDeleteResponse notificationSetting = client.notificationSettings().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `associated_record_type` (string), `associated_record_type_value` (string), `created_at` (date-time), `id` (string), `notification_channel_id` (string), `notification_event_condition_id` (string), `notification_profile_id` (string), `parameters` (array[object]), `status` (enum: enabled, enable-received, enable-pending, enable-submitted, delete-received, delete-pending, delete-submitted, deleted), `updated_at` (date-time)
