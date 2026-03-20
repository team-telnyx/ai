# Account Notifications (Go) — API Details

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

### Create a notification channel — `client.NotificationChannels.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | A UUID. |
| `NotificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `ChannelTypeId` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `ChannelDestination` | string | The destination associated with the channel type. |
| `CreatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `UpdatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification channel — `client.NotificationChannels.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | A UUID. |
| `NotificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `ChannelTypeId` | enum (sms, voice, email, webhook) | A Channel Type ID |
| `ChannelDestination` | string | The destination associated with the channel type. |
| `CreatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `UpdatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Create a notification profile — `client.NotificationProfiles.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | A UUID. |
| `Name` | string | A human readable name. |
| `CreatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `UpdatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Update a notification profile — `client.NotificationProfiles.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | A UUID. |
| `Name` | string | A human readable name. |
| `CreatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `UpdatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |

### Add a Notification Setting — `client.NotificationSettings.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | A UUID. |
| `NotificationEventConditionId` | string (UUID) | A UUID reference to the associated Notification Event Condition. |
| `NotificationProfileId` | string (UUID) | A UUID reference to the associated Notification Profile. |
| `AssociatedRecordType` | string |  |
| `AssociatedRecordTypeValue` | string |  |
| `Status` | enum (enabled, enable-received, enable-pending, enable-submtited, delete-received, ...) | Most preferences apply immediately; however, other may needs to propagate. |
| `NotificationChannelId` | string (UUID) | A UUID reference to the associated Notification Channel. |
| `Parameters` | array[object] |  |
| `CreatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `UpdatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
