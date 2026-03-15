---
name: telnyx-voice-ruby
description: >-
  Programmatic call control: make/receive calls, transfer, bridge, gather DTMF,
  stream audio. Real-time call events via webhooks.
metadata:
  author: telnyx
  product: voice
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice - Ruby

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-ruby)
2. Create a Voice API Application (connection) with webhook URLs
3. Assign the phone number to the Voice API Application
4. Ensure webhook endpoint is publicly accessible before making/receiving calls

### Steps

1. **Buy number**: `client.available_phone_numbers.list()`
2. **Create connection**: `client.connections.create(webhook_event_url: ...)`
3. **Assign number**: `client.phone_numbers.update(connection_id: ...)`
4. **Make outbound call**: `client.calls.create(to: ..., from: ..., connection_id: ...)`
5. **Handle webhooks**: `call.initiated → call.answered → send commands → call.hangup`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Full programmatic control, real-time event-driven logic, custom IVR | Call Control API (this skill) |
| Declarative XML call flows, migrating from Twilio/TwiML | TeXML (see telnyx-texml-ruby) |
| LLM-powered conversational voice agents, minimal code | AI Assistants (see telnyx-ai-assistants-ruby) |

### Common mistakes

- VOICE IS EVENT-DRIVEN: dial/create returns immediately. All subsequent actions (answer, play, gather, transfer, hangup) MUST be triggered by webhook events. You need a running webhook server that dispatches on data.event_type (e.g., 'call.initiated', 'call.answered', 'call.hangup') and issues call control commands using the call_control_id from the webhook payload
- OUTBOUND vs INBOUND: For outbound calls, dial → wait for 'call.answered' webhook → issue commands. For inbound calls, receive 'call.initiated' webhook → answer() → issue commands. NEVER call answer() on outbound calls
- NEVER make calls without a publicly accessible webhook URL — call events will be lost and calls uncontrollable
- NEVER skip assigning the number to a Voice API Application — inbound calls will be rejected

**Related skills**: telnyx-voice-media-ruby, telnyx-voice-gather-ruby, telnyx-voice-streaming-ruby, telnyx-texml-ruby, telnyx-ai-assistants-ruby

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
  result = client.calls.dial(params)
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

## Dial

Dial a number or SIP URI from a given connection. A successful response will include a `call_leg_id` which can be used to correlate the command with subsequent webhooks.

`client.calls.dial()` — `POST /calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `from` | string (E.164) | Yes | The `from` number to be used as the caller id presented to t... |
| `connection_id` | string (UUID) | Yes | The ID of the Call Control App (formerly ID of the connectio... |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `billing_group_id` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| ... | | | +48 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.dial(
  connection_id: "7267xxxxxxxxxxxxxx",
  from: "+18005550101",
  to: "+18005550100"
)

puts(response)
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## Answer call

Answer an incoming call. You must issue this command before executing subsequent commands on an incoming call. **Expected Webhooks:**

- `call.answered`
- `streaming.started`, `streaming.stopped` or `streaming.failed` if `stream_url` was set

When the `record` parameter is set to `record-from-answer`, the response will include a `recording_id` field.

`client.calls.actions.answer()` — `POST /calls/{call_control_id}/actions/answer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `billing_group_id` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `webhook_url` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +26 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.answer("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.recording_id, response.data.result`

## Transfer call

Transfer a call to a new destination. If the transfer is unsuccessful, a `call.hangup` webhook for the other call (Leg B) will be sent indicating that the transfer could not be completed. The original call will remain active and may be issued additional commands, potentially transferring the call to an alternate destination.

`client.calls.actions.transfer()` — `POST /calls/{call_control_id}/actions/transfer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `webhook_url` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +33 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.transfer("call_control_id", to: "+18005550100")

puts(response)
```

Key response fields: `response.data.result`

## Hangup call

Hang up the call. **Expected Webhooks:**

- `call.hangup`
- `call.recording.saved`

`client.calls.actions.hangup()` — `POST /calls/{call_control_id}/actions/hangup`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `custom_headers` | array[object] | No | Custom headers to be added to the SIP BYE message. |

```ruby
response = client.calls.actions.hangup("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.result`

## Bridge calls

Bridge two call control calls. **Expected Webhooks:**

- `call.bridged` for Leg A
- `call.bridged` for Leg B

`client.calls.actions.bridge()` — `POST /calls/{call_control_id}/actions/bridge`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | The Call Control ID of the call you want to bridge with, can... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `video_room_id` | string (UUID) | No | The ID of the video room you want to bridge with, can't be u... |
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.bridge(
  "call_control_id",
  call_control_id_to_bridge_with: "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg"
)

puts(response)
```

Key response fields: `response.data.result`

## Reject a call

Reject an incoming call. **Expected Webhooks:**

- `call.hangup`

`client.calls.actions.reject()` — `POST /calls/{call_control_id}/actions/reject`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cause` | enum (CALL_REJECTED, USER_BUSY) | Yes | Cause for call rejection. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```ruby
response = client.calls.actions.reject("call_control_id", cause: :USER_BUSY)

puts(response)
```

Key response fields: `response.data.result`

## Retrieve a call status

Returns the status of a call (data is available 10 minutes after call ended).

`client.calls.retrieve_status()` — `GET /calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```ruby
response = client.calls.retrieve_status("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## List all active calls for given connection

Lists all active calls for given connection. Acceptable connections are either SIP connections with webhook_url or xml_request_url, call control or texml. Returned results are cursor paginated.

`client.connections.list_active_calls()` — `GET /connections/{connection_id}/active_calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Telnyx connection id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.connections.list_active_calls("1293384261075731461")

puts(page)
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## List call control applications

Return a list of call control applications.

`client.call_control_applications.list()` — `GET /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.call_control_applications.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a call control application

Create a call control application.

`client.call_control_applications.create()` — `POST /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| `webhook_api_version` | enum (1, 2) | No | Determines which webhook format will be used, Telnyx API v1 ... |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```ruby
call_control_application = client.call_control_applications.create(
  application_name: "call-router",
  webhook_event_url: "https://example.com"
)

puts(call_control_application)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a call control application

Retrieves the details of an existing call control application.

`client.call_control_applications.retrieve()` — `GET /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
call_control_application = client.call_control_applications.retrieve("1293384261075731499")

puts(call_control_application)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a call control application

Updates settings of an existing call control application.

`client.call_control_applications.update()` — `PATCH /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags assigned to the Call Control Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```ruby
call_control_application = client.call_control_applications.update(
  "1293384261075731499",
  application_name: "call-router",
  webhook_event_url: "https://example.com"
)

puts(call_control_application)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a call control application

Deletes a call control application.

`client.call_control_applications.delete()` — `DELETE /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
call_control_application = client.call_control_applications.delete("1293384261075731499")

puts(call_control_application)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## SIP Refer a call

Initiate a SIP Refer on a Call Control call. You can initiate a SIP Refer at any point in the duration of a call. **Expected Webhooks:**

- `call.refer.started`
- `call.refer.completed`
- `call.refer.failed`

`client.calls.actions.refer()` — `POST /calls/{call_control_id}/actions/refer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sip_address` | string | Yes | The SIP URI to which the call will be referred to. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `custom_headers` | array[object] | No | Custom headers to be added to the SIP INVITE. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.refer("call_control_id", sip_address: "sip:username@sip.non-telnyx-address.com")

puts(response)
```

Key response fields: `response.data.result`

## Send SIP info

Sends SIP info from this leg. **Expected Webhooks:**

- `call.sip_info.received` (to be received on the target call leg)

`client.calls.actions.send_sip_info()` — `POST /calls/{call_control_id}/actions/send_sip_info`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content_type` | string | Yes | Content type of the INFO body. |
| `body` | string | Yes | Content of the SIP INFO |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```ruby
response = client.calls.actions.send_sip_info(
  "call_control_id",
  body: "{\"key\": \"value\", \"numValue\": 100}",
  content_type: "application/json"
)

puts(response)
```

Key response fields: `response.data.result`

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
| `callAnswered` | `call.answered` | Call Answered |
| `callBridged` | `call.bridged` | Call Bridged |
| `callHangup` | `call.hangup` | Call Hangup |
| `callInitiated` | `call.initiated` | Call Initiated |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
