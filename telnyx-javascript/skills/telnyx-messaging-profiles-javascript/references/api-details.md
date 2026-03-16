# Messaging Profiles (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List messaging profiles, Create a messaging profile, Retrieve a messaging profile, Update a messaging profile, Delete a messaging profile

| Field | Type |
|-------|------|
| `ai_assistant_id` | string \| null |
| `alpha_sender` | string \| null |
| `created_at` | date-time |
| `daily_spend_limit` | string |
| `daily_spend_limit_enabled` | boolean |
| `enabled` | boolean |
| `health_webhook_url` | url |
| `id` | uuid |
| `mms_fall_back_to_sms` | boolean |
| `mms_transcoding` | boolean |
| `mobile_only` | boolean |
| `name` | string |
| `number_pool_settings` | object \| null |
| `organization_id` | string |
| `record_type` | enum: messaging_profile |
| `redaction_enabled` | boolean |
| `redaction_level` | integer |
| `resource_group_id` | string \| null |
| `smart_encoding` | boolean |
| `updated_at` | date-time |
| `url_shortener_settings` | object \| null |
| `v1_secret` | string |
| `webhook_api_version` | enum: 1, 2, 2010-04-01 |
| `webhook_failover_url` | url |
| `webhook_url` | url |
| `whitelisted_destinations` | array[string] |

**Returned by:** List phone numbers associated with a messaging profile

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

**Returned by:** List short codes associated with a messaging profile, List short codes, Retrieve a short code, Update short code

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `messaging_profile_id` | string \| null |
| `record_type` | enum: short_code |
| `short_code` | string |
| `tags` | array |
| `updated_at` | date-time |

## Optional Parameters

### Create a messaging profile — `client.messagingProfiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `webhookApiVersion` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `numberPoolSettings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `urlShortenerSettings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `alphaSender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `dailySpendLimit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `dailySpendLimitEnabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `mmsFallBackToSms` | boolean | enables SMS fallback for MMS messages. |
| `mmsTranscoding` | boolean | enables automated resizing of MMS media. |
| `mobileOnly` | boolean | Send messages only to mobile phone numbers. |
| `smartEncoding` | boolean | Enables automatic character encoding optimization for SMS messages. |
| `resourceGroupId` | string (UUID) | The resource group ID to associate with this messaging profile. |
| `healthWebhookUrl` | string (URL) | A URL to receive health check webhooks for numbers in this profile. |
| `aiAssistantId` | string (UUID) | The AI assistant ID to associate with this messaging profile. |

### Update a messaging profile — `client.messagingProfiles.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `recordType` | enum (messaging_profile) | Identifies the type of the resource. |
| `id` | string (UUID) | Identifies the type of resource. |
| `name` | string | A user friendly name for the messaging profile. |
| `enabled` | boolean | Specifies whether the messaging profile is enabled or not. |
| `webhookUrl` | string (URL) | The URL where webhooks related to this messaging profile will be sent. |
| `webhookFailoverUrl` | string (URL) | The failover URL where webhooks related to this messaging profile will be sen... |
| `webhookApiVersion` | enum (1, 2, 2010-04-01) | Determines which webhook format will be used, Telnyx API v1, v2, or a legacy ... |
| `whitelistedDestinations` | array[string] | Destinations to which the messaging profile is allowed to send. |
| `createdAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was created. |
| `updatedAt` | string (date-time) | ISO 8601 formatted date indicating when the resource was updated. |
| `v1Secret` | string | Secret used to authenticate with v1 endpoints. |
| `numberPoolSettings` | object | Number Pool allows you to send messages from a pool of numbers of different t... |
| `urlShortenerSettings` | object | The URL shortener feature allows automatic replacement of URLs that were gene... |
| `alphaSender` | string | The alphanumeric sender ID to use when sending to destinations that require a... |
| `dailySpendLimit` | string | The maximum amount of money (in USD) that can be spent by this profile before... |
| `dailySpendLimitEnabled` | boolean | Whether to enforce the value configured by `daily_spend_limit`. |
| `mmsFallBackToSms` | boolean | enables SMS fallback for MMS messages. |
| `mmsTranscoding` | boolean | enables automated resizing of MMS media. |
| `mobileOnly` | boolean | Send messages only to mobile phone numbers. |
| `smartEncoding` | boolean | Enables automatic character encoding optimization for SMS messages. |

### Update short code — `client.shortCodes.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] |  |
