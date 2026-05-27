<!-- SDK reference: telnyx-messaging-ruby -->

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
response = client.messages.send_(to: "+18445550001", from: "+18005550101", text: "Hello from Telnyx!")
puts(response)
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

## Operational Caveats

- The sending number must already be assigned to the correct messaging profile before you send traffic from it.
- US A2P long-code traffic must complete 10DLC registration before production sending or carriers will block or heavily filter messages.
- Delivery webhooks are asynchronous. Treat the send response as acceptance of the request, not final carrier delivery.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](#webhook-payload-fields).

## Core Tasks

### Send an SMS

Primary outbound messaging flow. Agents need exact request fields and delivery-related response fields.

`client.messages.send_()` — `POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `from` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in the API Details section below |

```ruby
response = client.messages.send_(to: "+18445550001", from: "+18005550101", text: "Hello from Telnyx!")
puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.text`
- `response.data.sent_at`
- `response.data.errors`

### Send an SMS with an alphanumeric sender ID

Common sender variant that requires different request shape.

`client.messages.send_with_alphanumeric_sender()` — `POST /messages/alphanumeric_sender_id`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | A valid alphanumeric sender ID on the user's account. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `text` | string | Yes | The message body. |
| `messaging_profile_id` | string (UUID) | Yes | The messaging profile ID to use. |
| `webhook_url` | string (URL) | No | Callback URL for delivery status updates. |
| `webhook_failover_url` | string (URL) | No | Failover callback URL for delivery status updates. |
| `use_profile_webhooks` | boolean | No | If true, use the messaging profile's webhook settings. |

```ruby
response = client.messages.send_with_alphanumeric_sender(
  from: "MyCompany",
  messaging_profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  text: "Hello from Telnyx!",
  to: "+13125550001"
)

puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.text`
- `response.data.sent_at`
- `response.data.errors`

---

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```ruby
# In your webhook handler (e.g., Sinatra — use raw body):
post "/webhooks" do
  payload = request.body.read
  headers = {
    "telnyx-signature-ed25519" => request.env["HTTP_TELNYX_SIGNATURE_ED25519"],
    "telnyx-timestamp" => request.env["HTTP_TELNYX_TIMESTAMP"],
  }
  begin
    event = client.webhooks.unwrap(payload, headers)
  rescue => e
    halt 400, "Invalid signature: #{e.message}"
  end
  # Signature valid — event is the parsed webhook payload
  puts "Received event: #{event.data.event_type}"
  status 200
end
```

## Webhooks

These webhook payload fields are inline because they are part of the primary integration path.

### Delivery Update

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.sent, message.finalized | The type of event being delivered. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.to` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.cost` | object \| null |  |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirm... |

### Inbound Message

| Field | Type | Description |
|-------|------|-------------|
| `data.event_type` | enum: message.received | The type of event being delivered. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.direction` | enum: inbound | The direction of the message. |
| `data.payload.to` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.media` | array[object] |  |
| `data.record_type` | enum: event | Identifies the type of the resource. |

If you need webhook fields that are not listed inline here, read [the webhook payload reference](#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Send a group MMS message

Send one MMS payload to multiple recipients.

`client.messages.send_group_mms()` — `POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | array[object] | Yes | A list of destinations. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in the API Details section below |

```ruby
response = client.messages.send_group_mms(from: "+13125551234", to: ["+18655551234", "+14155551234"], text: "Hello from Telnyx!")
puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a long code message

Force a long-code sending path instead of the generic send endpoint.

`client.messages.send_long_code()` — `POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```ruby
response = client.messages.send_long_code(from: "+18445550001", to: "+13125550002", text: "Hello from Telnyx!")
puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a message using number pool

Let a messaging profile or number pool choose the sender for you.

`client.messages.send_number_pool()` — `POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```ruby
response = client.messages.send_number_pool(
  messaging_profile_id: "abc85f64-5717-4562-b3fc-2c9600000000",
  to: "+13125550002"
    text: "Hello from Telnyx!",
)

puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a short code message

Force a short-code sending path when the sender must be a short code.

`client.messages.send_short_code()` — `POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```ruby
response = client.messages.send_short_code(from: "+18445550001", to: "+18445550001", text: "Hello from Telnyx!")
puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Schedule a message

Queue a message for future delivery instead of sending immediately.

`client.messages.schedule()` — `POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in the API Details section below |

```ruby
response = client.messages.schedule(to: "+18445550001", from: "+18005550101", text: "Appointment reminder", send_at: "2025-07-01T15:00:00Z")
puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.text`

### Send a WhatsApp message

Send WhatsApp traffic instead of SMS/MMS.

`client.messages.send_whatsapp()` — `POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number in +E.164 format associated with Whatsapp accou... |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `whatsapp_message` | object | Yes |  |
| `type` | enum (WHATSAPP) | No | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `messaging_profile_id` | string (UUID) | No | Messaging profile ID - required if the 'from' number is not ... |

```ruby
response = client.messages.send_whatsapp(from: "+13125551234", to: "+13125551234", whatsapp_message: {})

puts(response)
```

Primary response fields:
- `response.data.id`
- `response.data.to`
- `response.data.from`
- `response.data.type`
- `response.data.direction`
- `response.data.body`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Retrieve a message | `client.messages.retrieve()` | `GET /messages/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Cancel a scheduled message | `client.messages.cancel_scheduled()` | `DELETE /messages/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| List alphanumeric sender IDs | `client.alphanumeric_sender_ids.list()` | `GET /alphanumeric_sender_ids` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create an alphanumeric sender ID | `client.alphanumeric_sender_ids.create()` | `POST /alphanumeric_sender_ids` | Create or provision an additional resource when the core tasks do not cover this flow. | `alphanumeric_sender_id`, `messaging_profile_id` |
| Retrieve an alphanumeric sender ID | `client.alphanumeric_sender_ids.retrieve()` | `GET /alphanumeric_sender_ids/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Delete an alphanumeric sender ID | `client.alphanumeric_sender_ids.delete()` | `DELETE /alphanumeric_sender_ids/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| Retrieve group MMS messages | `client.messages.retrieve_group_messages()` | `GET /messages/group/{message_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `message_id` |
| List messaging hosted numbers | `client.messaging_hosted_numbers.list()` | `GET /messaging_hosted_numbers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Retrieve a messaging hosted number | `client.messaging_hosted_numbers.retrieve()` | `GET /messaging_hosted_numbers/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Update a messaging hosted number | `client.messaging_hosted_numbers.update()` | `PATCH /messaging_hosted_numbers/{id}` | Modify an existing resource without recreating it. | `id` |
| List opt-outs | `client.messaging_optouts.list()` | `GET /messaging_optouts` | Inspect available resources or choose an existing resource before mutating it. | None |
| List high-level messaging profile metrics | `client.messaging_profile_metrics.list()` | `GET /messaging_profile_metrics` | Inspect available resources or choose an existing resource before mutating it. | None |
| Regenerate messaging profile secret | `client.messaging_profiles.actions.regenerate_secret()` | `POST /messaging_profiles/{id}/actions/regenerate_secret` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `id` |
| List alphanumeric sender IDs for a messaging profile | `client.messaging_profiles.list_alphanumeric_sender_ids()` | `GET /messaging_profiles/{id}/alphanumeric_sender_ids` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Get detailed messaging profile metrics | `client.messaging_profiles.retrieve_metrics()` | `GET /messaging_profiles/{id}/metrics` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| List Auto-Response Settings | `client.messaging_profiles.autoresp_configs.list()` | `GET /messaging_profiles/{profile_id}/autoresp_configs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `profile_id` |
| Create auto-response setting | `client.messaging_profiles.autoresp_configs.create()` | `POST /messaging_profiles/{profile_id}/autoresp_configs` | Create or provision an additional resource when the core tasks do not cover this flow. | `op`, `keywords`, `country_code`, `profile_id` |
| Get Auto-Response Setting | `client.messaging_profiles.autoresp_configs.retrieve()` | `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `profile_id`, `autoresp_cfg_id` |
| Update Auto-Response Setting | `client.messaging_profiles.autoresp_configs.update()` | `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Modify an existing resource without recreating it. | `op`, `keywords`, `country_code`, `profile_id`, +1 more |
| Delete Auto-Response Setting | `client.messaging_profiles.autoresp_configs.delete()` | `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}` | Remove, detach, or clean up an existing resource. | `profile_id`, `autoresp_cfg_id` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
---

# Messaging (Ruby) — API Details

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
| `num_chars` | integer |
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
| `num_chars` | integer |
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

### Send a message — `client.messages.send_()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messaging_profile_id` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
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
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
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
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Schedule a message — `client.messages.schedule()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messaging_profile_id` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
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
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a WhatsApp message — `client.messages.send_whatsapp()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | enum (WHATSAPP) | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `messaging_profile_id` | string (UUID) | Messaging profile ID - required if the 'from' number is not SMS-enabled |

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
| `data.payload.num_chars` | integer | The number of characters in the message text |
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
| `data.payload.num_chars` | integer | The number of characters in the message text |
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
