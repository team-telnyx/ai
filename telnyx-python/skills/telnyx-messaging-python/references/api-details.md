# Messaging (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List alphanumeric sender IDs, Create an alphanumeric sender ID, Retrieve an alphanumeric sender ID, Delete an alphanumeric sender ID, List alphanumeric sender IDs for a messaging profile

| Field | Type |
|-------|------|
| `alphanumeric_sender_id` | string |
| `id` | uuid |
| `messaging_profile_id` | uuid |
| `organization_id` | string |
| `record_type` | enum: alphanumeric_sender_id |
| `us_long_code_fallback` | string |

**Returned by:** Send a message, Send a message using an alphanumeric sender ID, Retrieve group MMS messages, Send a group MMS message, Send a long code message, Send a message using number pool, Schedule a message, Send a short code message

| Field | Type |
|-------|------|
| `cc` | array[object] |
| `completed_at` | date-time |
| `cost` | object \| null |
| `cost_breakdown` | object \| null |
| `direction` | enum: outbound |
| `encoding` | string |
| `errors` | array[object] |
| `from` | object |
| `id` | uuid |
| `media` | array[object] |
| `messaging_profile_id` | string |
| `organization_id` | uuid |
| `parts` | integer |
| `received_at` | date-time |
| `record_type` | enum: message |
| `sent_at` | date-time |
| `smart_encoding_applied` | boolean |
| `subject` | string \| null |
| `tags` | array[string] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_id` | string \| null |
| `tcr_campaign_registered` | string \| null |
| `text` | string |
| `to` | array[object] |
| `type` | enum: SMS, MMS |
| `valid_until` | date-time |
| `wait_seconds` | float |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** Send a WhatsApp message

| Field | Type |
|-------|------|
| `body` | object |
| `direction` | string |
| `encoding` | string |
| `from` | object |
| `id` | string |
| `messaging_profile_id` | string |
| `organization_id` | string |
| `received_at` | date-time |
| `record_type` | string |
| `to` | array[object] |
| `type` | string |
| `wait_seconds` | float |

**Returned by:** Retrieve a message, Get detailed messaging profile metrics

| Field | Type |
|-------|------|
| `data` | object |

**Returned by:** Cancel a scheduled message

| Field | Type |
|-------|------|
| `cc` | array[object] |
| `completed_at` | date-time |
| `cost` | object \| null |
| `cost_breakdown` | object \| null |
| `direction` | enum: outbound |
| `encoding` | string |
| `errors` | array[object] |
| `from` | object |
| `id` | uuid |
| `media` | array[object] |
| `messaging_profile_id` | string |
| `organization_id` | uuid |
| `parts` | integer |
| `received_at` | date-time |
| `record_type` | enum: message |
| `sent_at` | date-time |
| `smart_encoding_applied` | boolean |
| `subject` | string \| null |
| `tags` | array[string] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_id` | string \| null |
| `tcr_campaign_registered` | string \| null |
| `text` | string |
| `to` | array[object] |
| `type` | enum: SMS, MMS |
| `valid_until` | date-time |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** List messaging hosted numbers, Retrieve a messaging hosted number, Update a messaging hosted number

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

**Returned by:** List opt-outs

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `from` | string |
| `keyword` | string \| null |
| `messaging_profile_id` | string \| null |
| `to` | string |

**Returned by:** List high-level messaging profile metrics

| Field | Type |
|-------|------|
| `data` | array[object] |
| `meta` | object |

**Returned by:** Regenerate messaging profile secret

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

**Returned by:** List Auto-Response Settings, Create auto-response setting, Get Auto-Response Setting, Update Auto-Response Setting

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `id` | string |
| `keywords` | array[string] |
| `op` | enum: start, stop, info |
| `resp_text` | string |
| `updated_at` | date-time |

## Optional Parameters

### Create an alphanumeric sender ID — `client.alphanumeric_sender_ids.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `us_long_code_fallback` | string | A US long code number to use as fallback when sending to US destinations. |

### Send a message — `client.messages.send()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from_` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messaging_profile_id` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type_` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `send_at` | string (date-time) | ISO 8601 formatted date indicating when to send the message - accurate up til... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a message using an alphanumeric sender ID — `client.messages.send_with_alphanumeric_sender()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook_url` | string (URL) | Callback URL for delivery status updates. |
| `webhook_failover_url` | string (URL) | Failover callback URL for delivery status updates. |
| `use_profile_webhooks` | boolean | If true, use the messaging profile's webhook settings. |

### Send a group MMS message — `client.messages.send_group_mms()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |

### Send a long code message — `client.messages.send_long_code()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type_` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a message using number pool — `client.messages.send_number_pool()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type_` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Schedule a message — `client.messages.schedule()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from_` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messaging_profile_id` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type_` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `send_at` | string (date-time) | ISO 8601 formatted date indicating when to send the message - accurate up til... |

### Send a short code message — `client.messages.send_short_code()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type_` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a WhatsApp message — `client.messages.send_whatsapp()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `type_` | enum (WHATSAPP) | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |

### Update a messaging hosted number — `client.messaging_hosted_numbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `messaging_profile_id` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `messaging_product` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `tags` | array[string] | Tags to set on this phone number. |

### Create auto-response setting — `client.messaging_profiles.autoresp_configs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `resp_text` | string |  |

### Update Auto-Response Setting — `client.messaging_profiles.autoresp_configs.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `resp_text` | string |  |

## Webhook Payload Fields

### `deliveryUpdate`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum: message.sent, message.finalized | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum: message | Identifies the type of the resource. |
| `data.payload.direction` | enum: outbound | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | uuid | The id of the organization the messaging profile belongs to. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | string \| null | Subject of multimedia message |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | object \| null |  |
| `data.payload.cost_breakdown` | object \| null | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | string \| null | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | string \| null | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.valid_until` | date-time | Message must be out of the queue by this time or else it will be discarded and marked as 'sending_failed'. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |
| `data.payload.smart_encoding_applied` | boolean | Indicates whether smart encoding was applied to this message. |
| `data.payload.wait_seconds` | float | Seconds the message is queued due to rate limiting before being sent to the carrier. |
| `meta.attempt` | integer | Number of attempts to deliver the webhook event. |
| `meta.delivered_to` | url | The webhook URL the event was delivered to. |

### `inboundMessage`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum: message.received | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum: message | Identifies the type of the resource. |
| `data.payload.direction` | enum: inbound | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | string | Unique identifier for a messaging profile. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | string \| null | Message subject. |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | object \| null |  |
| `data.payload.cost_breakdown` | object \| null | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | string \| null | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | string \| null | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | Not used for inbound messages. |
| `data.payload.completed_at` | date-time | Not used for inbound messages. |
| `data.payload.valid_until` | date-time | Not used for inbound messages. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |

### `replacedLinkClick`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | string | Identifies the type of the resource. |
| `data.url` | string | The original link that was sent in the message. |
| `data.to` | string | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or short code). |
| `data.message_id` | uuid | The message ID associated with the clicked link. |
| `data.time_clicked` | date-time | ISO 8601 formatted date indicating when the message request was received. |

### Field Type Notes

- `from` in responses/webhooks: object with sub-fields `phone_number` (string), `carrier` (string), `line_type` (string)
- `to` in responses/webhooks: array of objects, each with `phone_number` (string), `carrier` (string), `line_type` (string), `status` (string)
- `cost`: object with `amount` (string, decimal), `currency` (string, e.g., 'USD')
