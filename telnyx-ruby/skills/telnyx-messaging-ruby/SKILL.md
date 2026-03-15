---
name: telnyx-messaging-ruby
description: >-
  Send and receive SMS/MMS, handle opt-outs and delivery webhooks. Use for
  notifications, 2FA, or messaging apps.
metadata:
  author: telnyx
  product: messaging
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging - Ruby

## Core Workflow

### Prerequisites

1. Buy a phone number (see telnyx-numbers-ruby)
2. Create a messaging profile and configure webhook URL (see telnyx-messaging-profiles-ruby)
3. Assign the phone number to the messaging profile
4. For US A2P via long code: complete 10DLC registration — brand, campaign, number assignment (see telnyx-10dlc-ruby)
5. For toll-free: complete toll-free verification

### Steps

1. **Search & buy number**: `client.available_phone_numbers.list()`
2. **Create messaging profile**: `client.messaging_profiles.create(name: ...)`
3. **Assign number to profile**: `client.phone_numbers.messaging.update(id: ..., messaging_profile_id: ...)`
4. **Send SMS**: `client.messages.send(from: ..., to: ..., text: ...)`
5. **Send MMS**: `client.messages.send(from: ..., to: ..., text: ..., media_urls: ['https://...'])`

### Common mistakes

- NEVER send without assigning the number to a messaging profile — the from number will be rejected
- NEVER send US A2P traffic via long code without 10DLC registration — messages silently blocked by carriers
- NEVER use non-E.164 phone numbers — must be +[country code][number] with no spaces or dashes
- NEVER assume delivery receipt = delivery — some carriers never return delivery receipts
- For MMS: pass media_urls: ["https://..."] — URLs must be publicly accessible HTTPS (max 1 MB per file, 10 attachments, 2 MB total). type is auto-detected when media_urls is present

**Related skills**: telnyx-messaging-profiles-ruby, telnyx-10dlc-ruby, telnyx-numbers-ruby

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
begin
  result = client.messages.send_(to: "+13125550001", from: "+13125550002", text: "Hello")
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send a message

Send a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to send a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`client.messages.send_()` — `POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `from` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.messages.send_(to: "+18445550001", from: "+18005550101", text: "Hello from Telnyx!")
puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a message using an alphanumeric sender ID

Send an SMS message using an alphanumeric sender ID. This is SMS only.

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

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a group MMS message

`client.messages.send_group_mms()` — `POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | array[object] | Yes | A list of destinations. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.messages.send_group_mms(from: "+13125551234", to: ["+18655551234", "+14155551234"], text: "Hello from Telnyx!")
puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a long code message

`client.messages.send_long_code()` — `POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.messages.send_long_code(from: "+18445550001", to: "+13125550002", text: "Hello from Telnyx!")
puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a message using number pool

`client.messages.send_number_pool()` — `POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.messages.send_number_pool(
  messaging_profile_id: "abc85f64-5717-4562-b3fc-2c9600000000",
  to: "+13125550002"
    text: "Hello from Telnyx!",
)

puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a short code message

`client.messages.send_short_code()` — `POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.messages.send_short_code(from: "+18445550001", to: "+18445550001", text: "Hello from Telnyx!")
puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Schedule a message

Schedule a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to schedule a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`client.messages.schedule()` — `POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.messages.schedule(to: "+18445550001", from: "+18005550101", text: "Appointment reminder", send_at: "2025-07-01T15:00:00Z")
puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Send a WhatsApp message

`client.messages.send_whatsapp()` — `POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number in +E.164 format associated with Whatsapp accou... |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `whatsapp_message` | object | Yes |  |
| `type` | enum (WHATSAPP) | No | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |

```ruby
response = client.messages.send_whatsapp(from: "+13125551234", to: "+13125551234", whatsapp_message: {})

puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Retrieve a message

Note: This API endpoint can only retrieve messages that are no older than 10 days since their creation. If you require messages older than this, please generate an [MDR report.](https://developers.telnyx.com/api-reference/mdr-usage-reports/create-mdr-usage-report)

`client.messages.retrieve()` — `GET /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the message |

```ruby
message = client.messages.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(message)
```

Key response fields: `response.data.data`

## Cancel a scheduled message

Cancel a scheduled message that has not yet been sent. Only messages with `status=scheduled` and `send_at` more than a minute from now can be cancelled.

`client.messages.cancel_scheduled()` — `DELETE /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the message to cancel |

```ruby
response = client.messages.cancel_scheduled("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## List alphanumeric sender IDs

List all alphanumeric sender IDs for the authenticated user.

`client.alphanumeric_sender_ids.list()` — `GET /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[messaging_profile_id]` | string (UUID) | No | Filter by messaging profile ID. |
| `page[number]` | integer | No | Page number. |
| `page[size]` | integer | No | Page size. |

```ruby
page = client.alphanumeric_sender_ids.list

puts(page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Create an alphanumeric sender ID

Create a new alphanumeric sender ID associated with a messaging profile.

`client.alphanumeric_sender_ids.create()` — `POST /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `alphanumeric_sender_id` | string (UUID) | Yes | The alphanumeric sender ID string. |
| `messaging_profile_id` | string (UUID) | Yes | The messaging profile to associate the sender ID with. |
| `us_long_code_fallback` | string | No | A US long code number to use as fallback when sending to US ... |

```ruby
alphanumeric_sender_id = client.alphanumeric_sender_ids.create(
  alphanumeric_sender_id: "MyCompany",
  messaging_profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(alphanumeric_sender_id)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Retrieve an alphanumeric sender ID

Retrieve a specific alphanumeric sender ID.

`client.alphanumeric_sender_ids.retrieve()` — `GET /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```ruby
alphanumeric_sender_id = client.alphanumeric_sender_ids.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(alphanumeric_sender_id)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Delete an alphanumeric sender ID

Delete an alphanumeric sender ID and disassociate it from its messaging profile.

`client.alphanumeric_sender_ids.delete()` — `DELETE /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```ruby
alphanumeric_sender_id = client.alphanumeric_sender_ids.delete("550e8400-e29b-41d4-a716-446655440000")

puts(alphanumeric_sender_id)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Retrieve group MMS messages

Retrieve all messages in a group MMS conversation by the group message ID.

`client.messages.retrieve_group_messages()` — `GET /messages/group/{message_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message_id` | string (UUID) | Yes | The group message ID. |

```ruby
response = client.messages.retrieve_group_messages("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## List messaging hosted numbers

List all hosted numbers associated with the authenticated user.

`client.messaging_hosted_numbers.list()` — `GET /messaging_hosted_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort[phone_number]` | enum (asc, desc) | No | Sort by phone number. |
| `filter[messaging_profile_id]` | string (UUID) | No | Filter by messaging profile ID. |
| `filter[phone_number]` | string | No | Filter by exact phone number. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
page = client.messaging_hosted_numbers.list

puts(page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a messaging hosted number

Retrieve a specific messaging hosted number by its ID or phone number.

`client.messaging_hosted_numbers.retrieve()` — `GET /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID or phone number of the hosted number. |

```ruby
messaging_hosted_number = client.messaging_hosted_numbers.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(messaging_hosted_number)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update a messaging hosted number

Update the messaging settings for a hosted number.

`client.messaging_hosted_numbers.update()` — `PATCH /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID or phone number of the hosted number. |
| `messaging_profile_id` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messaging_product` | string | No | Configure the messaging product for this number:

* Omit thi... |

```ruby
messaging_hosted_number = client.messaging_hosted_numbers.update("550e8400-e29b-41d4-a716-446655440000")

puts(messaging_hosted_number)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List opt-outs

Retrieve a list of opt-out blocks.

`client.messaging_optouts.list()` — `GET /messaging_optouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `redaction_enabled` | string | No | If receiving address (+E.164 formatted phone number) should ... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```ruby
page = client.messaging_optouts.list

puts(page)
```

Key response fields: `response.data.to, response.data.from, response.data.messaging_profile_id`

## List high-level messaging profile metrics

List high-level metrics for all messaging profiles belonging to the authenticated user.

`client.messaging_profile_metrics.list()` — `GET /messaging_profile_metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `time_frame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```ruby
messaging_profile_metrics = client.messaging_profile_metrics.list

puts(messaging_profile_metrics)
```

Key response fields: `response.data.data, response.data.meta`

## Regenerate messaging profile secret

Regenerate the v1 secret for a messaging profile.

`client.messaging_profiles.actions.regenerate_secret()` — `POST /messaging_profiles/{id}/actions/regenerate_secret`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |

```ruby
response = client.messaging_profiles.actions.regenerate_secret("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List alphanumeric sender IDs for a messaging profile

List all alphanumeric sender IDs associated with a specific messaging profile.

`client.messaging_profiles.list_alphanumeric_sender_ids()` — `GET /messaging_profiles/{id}/alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `page[number]` | integer | No |  |
| `page[size]` | integer | No |  |

```ruby
page = client.messaging_profiles.list_alphanumeric_sender_ids("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.alphanumeric_sender_id`

## Get detailed messaging profile metrics

Get detailed metrics for a specific messaging profile, broken down by time interval.

`client.messaging_profiles.retrieve_metrics()` — `GET /messaging_profiles/{id}/metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `time_frame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```ruby
response = client.messaging_profiles.retrieve_metrics("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Key response fields: `response.data.data`

## List Auto-Response Settings

`client.messaging_profiles.autoresp_configs.list()` — `GET /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile_id` | string (UUID) | Yes |  |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| `created_at` | object | No | Consolidated created_at parameter (deepObject style). |
| `updated_at` | object | No | Consolidated updated_at parameter (deepObject style). |

```ruby
autoresp_configs = client.messaging_profiles.autoresp_configs.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(autoresp_configs)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create auto-response setting

`client.messaging_profiles.autoresp_configs.create()` — `POST /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `op` | enum (start, stop, info) | Yes |  |
| `keywords` | array[string] | Yes |  |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes |  |
| `profile_id` | string (UUID) | Yes |  |
| `resp_text` | string | No |  |

```ruby
auto_resp_config_response = client.messaging_profiles.autoresp_configs.create(
  "profile_id",
  country_code: "US",
  keywords: ["keyword1", "keyword2"],
  op: :start
)

puts(auto_resp_config_response)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get Auto-Response Setting

`client.messaging_profiles.autoresp_configs.retrieve()` — `GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile_id` | string (UUID) | Yes |  |
| `autoresp_cfg_id` | string (UUID) | Yes |  |

```ruby
auto_resp_config_response = client.messaging_profiles.autoresp_configs.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(auto_resp_config_response)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update Auto-Response Setting

`client.messaging_profiles.autoresp_configs.update()` — `PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `op` | enum (start, stop, info) | Yes |  |
| `keywords` | array[string] | Yes |  |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes |  |
| `profile_id` | string (UUID) | Yes |  |
| `autoresp_cfg_id` | string (UUID) | Yes |  |
| `resp_text` | string | No |  |

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

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete Auto-Response Setting

`client.messaging_profiles.autoresp_configs.delete()` — `DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile_id` | string (UUID) | Yes |  |
| `autoresp_cfg_id` | string (UUID) | Yes |  |

```ruby
autoresp_config = client.messaging_profiles.autoresp_configs.delete(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  profile_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(autoresp_config)
```

---

## Webhooks

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

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `deliveryUpdate` | `message.finalized` | Delivery Update |
| `inboundMessage` | `message.received` | Inbound Message |
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
