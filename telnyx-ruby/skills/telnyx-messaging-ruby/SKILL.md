---
name: telnyx-messaging-ruby
description: >-
  Send and receive SMS/MMS messages, manage messaging-enabled phone numbers, and
  handle opt-outs. Use when building messaging applications, implementing 2FA,
  or sending notifications. This skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: messaging
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## List alphanumeric sender IDs

List all alphanumeric sender IDs for the authenticated user.

`GET /alphanumeric_sender_ids`

```ruby
page = client.alphanumeric_sender_ids.list

puts(page)
```

## Create an alphanumeric sender ID

Create a new alphanumeric sender ID associated with a messaging profile.

`POST /alphanumeric_sender_ids` — Required: `alphanumeric_sender_id`, `messaging_profile_id`

Optional: `us_long_code_fallback` (string)

```ruby
alphanumeric_sender_id = client.alphanumeric_sender_ids.create(
  alphanumeric_sender_id: "MyCompany",
  messaging_profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(alphanumeric_sender_id)
```

## Retrieve an alphanumeric sender ID

Retrieve a specific alphanumeric sender ID.

`GET /alphanumeric_sender_ids/{id}`

```ruby
alphanumeric_sender_id = client.alphanumeric_sender_ids.retrieve("id")

puts(alphanumeric_sender_id)
```

## Delete an alphanumeric sender ID

Delete an alphanumeric sender ID and disassociate it from its messaging profile.

`DELETE /alphanumeric_sender_ids/{id}`

```ruby
alphanumeric_sender_id = client.alphanumeric_sender_ids.delete("id")

puts(alphanumeric_sender_id)
```

## Send a message

Send a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool.

`POST /messages` — Required: `to`

Optional: `auto_detect` (boolean), `encoding` (enum), `from` (string), `media_urls` (array[string]), `messaging_profile_id` (string), `send_at` (date-time), `subject` (string), `text` (string), `type` (enum), `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.send_(to: "+18445550001")

puts(response)
```

## Send a message using an alphanumeric sender ID

Send an SMS message using an alphanumeric sender ID.

`POST /messages/alphanumeric_sender_id` — Required: `from`, `to`, `text`, `messaging_profile_id`

Optional: `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.send_with_alphanumeric_sender(
  from: "MyCompany",
  messaging_profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  text: "text",
  to: "+E.164"
)

puts(response)
```

## Retrieve group MMS messages

Retrieve all messages in a group MMS conversation by the group message ID.

`GET /messages/group/{message_id}`

```ruby
response = client.messages.retrieve_group_messages("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## Send a group MMS message

`POST /messages/group_mms` — Required: `from`, `to`

Optional: `media_urls` (array[string]), `subject` (string), `text` (string), `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.send_group_mms(from: "+13125551234", to: ["+18655551234", "+14155551234"])

puts(response)
```

## Send a long code message

`POST /messages/long_code` — Required: `from`, `to`

Optional: `auto_detect` (boolean), `encoding` (enum), `media_urls` (array[string]), `subject` (string), `text` (string), `type` (enum), `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.send_long_code(from: "+18445550001", to: "+13125550002")

puts(response)
```

## Send a message using number pool

`POST /messages/number_pool` — Required: `to`, `messaging_profile_id`

Optional: `auto_detect` (boolean), `encoding` (enum), `media_urls` (array[string]), `subject` (string), `text` (string), `type` (enum), `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.send_number_pool(
  messaging_profile_id: "abc85f64-5717-4562-b3fc-2c9600000000",
  to: "+13125550002"
)

puts(response)
```

## Schedule a message

Schedule a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool.

`POST /messages/schedule` — Required: `to`

Optional: `auto_detect` (boolean), `from` (string), `media_urls` (array[string]), `messaging_profile_id` (string), `send_at` (date-time), `subject` (string), `text` (string), `type` (enum), `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.schedule(to: "+18445550001")

puts(response)
```

## Send a short code message

`POST /messages/short_code` — Required: `from`, `to`

Optional: `auto_detect` (boolean), `encoding` (enum), `media_urls` (array[string]), `subject` (string), `text` (string), `type` (enum), `use_profile_webhooks` (boolean), `webhook_failover_url` (url), `webhook_url` (url)

```ruby
response = client.messages.send_short_code(from: "+18445550001", to: "+18445550001")

puts(response)
```

## Send a Whatsapp message

`POST /messages/whatsapp` — Required: `from`, `to`, `whatsapp_message`

Optional: `type` (enum), `webhook_url` (url)

```ruby
response = client.messages.send_whatsapp(from: "+13125551234", to: "+13125551234", whatsapp_message: {})

puts(response)
```

## Retrieve a message

Note: This API endpoint can only retrieve messages that are no older than 10 days since their creation.

`GET /messages/{id}`

```ruby
message = client.messages.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(message)
```

## Cancel a scheduled message

Cancel a scheduled message that has not yet been sent.

`DELETE /messages/{id}`

```ruby
response = client.messages.cancel_scheduled("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List messaging hosted numbers

List all hosted numbers associated with the authenticated user.

`GET /messaging_hosted_numbers`

```ruby
page = client.messaging_hosted_numbers.list

puts(page)
```

## Retrieve a messaging hosted number

Retrieve a specific messaging hosted number by its ID or phone number.

`GET /messaging_hosted_numbers/{id}`

```ruby
messaging_hosted_number = client.messaging_hosted_numbers.retrieve("id")

puts(messaging_hosted_number)
```

## Update a messaging hosted number

Update the messaging settings for a hosted number.

`PATCH /messaging_hosted_numbers/{id}`

Optional: `messaging_product` (string), `messaging_profile_id` (string), `tags` (array[string])

```ruby
messaging_hosted_number = client.messaging_hosted_numbers.update("id")

puts(messaging_hosted_number)
```

## List opt-outs

Retrieve a list of opt-out blocks.

`GET /messaging_optouts`

```ruby
page = client.messaging_optouts.list

puts(page)
```

## List high-level messaging profile metrics

List high-level metrics for all messaging profiles belonging to the authenticated user.

`GET /messaging_profile_metrics`

```ruby
messaging_profile_metrics = client.messaging_profile_metrics.list

puts(messaging_profile_metrics)
```

## Regenerate messaging profile secret

Regenerate the v1 secret for a messaging profile.

`POST /messaging_profiles/{id}/actions/regenerate_secret`

```ruby
response = client.messaging_profiles.actions.regenerate_secret("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List alphanumeric sender IDs for a messaging profile

List all alphanumeric sender IDs associated with a specific messaging profile.

`GET /messaging_profiles/{id}/alphanumeric_sender_ids`

```ruby
page = client.messaging_profiles.list_alphanumeric_sender_ids("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Get detailed messaging profile metrics

Get detailed metrics for a specific messaging profile, broken down by time interval.

`GET /messaging_profiles/{id}/metrics`

```ruby
response = client.messaging_profiles.retrieve_metrics("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List Auto-Response Settings

`GET /messaging_profiles/{profile_id}/autoresp_configs`

```ruby
autoresp_configs = client.messaging_profiles.autoresp_configs.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(autoresp_configs)
```

## Create auto-response setting

`POST /messaging_profiles/{profile_id}/autoresp_configs` — Required: `op`, `keywords`, `country_code`

Optional: `resp_text` (string)

```ruby
auto_resp_config_response = client.messaging_profiles.autoresp_configs.create(
  "profile_id",
  country_code: "US",
  keywords: ["keyword1", "keyword2"],
  op: :start
)

puts(auto_resp_config_response)
```

## Get Auto-Response Setting

`GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

```ruby
auto_resp_config_response = client.messaging_profiles.autoresp_configs.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(auto_resp_config_response)
```

## Update Auto-Response Setting

`PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` — Required: `op`, `keywords`, `country_code`

Optional: `resp_text` (string)

```ruby
auto_resp_config_response = client.messaging_profiles.autoresp_configs.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  country_code: "US",
  keywords: ["keyword1", "keyword2"],
  op: :start
)

puts(auto_resp_config_response)
```

## Delete Auto-Response Setting

`DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

```ruby
autoresp_config = client.messaging_profiles.autoresp_configs.delete(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(autoresp_config)
```

---

## Webhooks

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for verification (Standard Webhooks compatible).

| Event | Description |
|-------|-------------|
| `deliveryUpdate` | Delivery Update |
| `inboundMessage` | Inbound Message |
| `replacedLinkClick` | Replaced Link Click |

### Webhook payload fields

**`deliveryUpdate`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum | Identifies the type of the resource. |
| `data.payload.direction` | enum | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | uuid | The id of the organization the messaging profile belongs to. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | ['string', 'null'] | Subject of multimedia message |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | ['object', 'null'] |  |
| `data.payload.cost_breakdown` | ['object', 'null'] | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | ['string', 'null'] | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | ['string', 'null'] | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.valid_until` | date-time | Message must be out of the queue by this time or else it will be discarded and marked as 'sending_failed'. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |
| `data.payload.smart_encoding_applied` | boolean | Indicates whether smart encoding was applied to this message. |
| `meta.attempt` | integer | Number of attempts to deliver the webhook event. |
| `meta.delivered_to` | url | The webhook URL the event was delivered to. |

**`inboundMessage`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum | Identifies the type of the resource. |
| `data.payload.direction` | enum | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | string | Unique identifier for a messaging profile. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | ['string', 'null'] | Message subject. |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | ['object', 'null'] |  |
| `data.payload.cost_breakdown` | ['object', 'null'] | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | ['string', 'null'] | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | ['string', 'null'] | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | Not used for inbound messages. |
| `data.payload.completed_at` | date-time | Not used for inbound messages. |
| `data.payload.valid_until` | date-time | Not used for inbound messages. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |

**`replacedLinkClick`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | string | Identifies the type of the resource. |
| `data.url` | string | The original link that was sent in the message. |
| `data.to` | string | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or short code). |
| `data.message_id` | uuid | The message ID associated with the clicked link. |
| `data.time_clicked` | date-time | ISO 8601 formatted date indicating when the message request was received. |
