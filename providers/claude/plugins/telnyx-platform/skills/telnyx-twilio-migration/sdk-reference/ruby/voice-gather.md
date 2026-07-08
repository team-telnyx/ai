<!-- SDK reference: telnyx-voice-gather-ruby -->

# Telnyx Voice Gather - Ruby

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

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

Optional: `client_state` (string), `command_id` (string), `messages` (array[object])

```ruby
response = client.calls.actions.add_ai_assistant_messages("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Returns: `result` (string)

## Start AI Assistant

Start an AI assistant on the call. **Expected Webhooks:**

- `call.conversation.ended`
- `call.conversation_insights.generated`

`POST /calls/{call_control_id}/actions/ai_assistant_start`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `greeting` (string), `interruption_settings` (object), `message_history` (array[object]), `participants` (array[object]), `send_message_history_updates` (boolean), `transcription` (object), `voice` (string), `voice_settings` (object)

```ruby
response = client.calls.actions.start_ai_assistant("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Returns: `conversation_id` (uuid), `result` (string)

## Stop AI Assistant

Stop an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_stop`

Optional: `client_state` (string), `command_id` (string)

```ruby
response = client.calls.actions.stop_ai_assistant("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Returns: `result` (string)

## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`POST /calls/{call_control_id}/actions/gather`

Optional: `client_state` (string), `command_id` (string), `gather_id` (string), `initial_timeout_millis` (int32), `inter_digit_timeout_millis` (int32), `maximum_digits` (int32), `minimum_digits` (int32), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string)

```ruby
response = client.calls.actions.gather("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Returns: `result` (string)

## Gather stop

Stop current gather. **Expected Webhooks:**

- `call.gather.ended`

`POST /calls/{call_control_id}/actions/gather_stop`

Optional: `client_state` (string), `command_id` (string)

```ruby
response = client.calls.actions.stop_gather("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Returns: `result` (string)

## Gather using AI

Gather parameters defined in the request payload using a voice assistant. You can pass parameters described as a JSON Schema object and the voice assistant will attempt to gather these informations.

`POST /calls/{call_control_id}/actions/gather_using_ai` — Required: `parameters`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `gather_ended_speech` (string), `greeting` (string), `interruption_settings` (object), `language` (object), `message_history` (array[object]), `send_message_history_updates` (boolean), `send_partial_results` (boolean), `transcription` (object), `user_response_timeout_ms` (integer), `voice` (string), `voice_settings` (object)

```ruby
response = client.calls.actions.gather_using_ai(
  "call_control_id",
  parameters: {properties: "bar", required: "bar", type: "bar"}
)

puts(response)
```

Returns: `conversation_id` (uuid), `result` (string)

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_audio_url', which will be played back at the beginning of each prompt. Playback will be interrupted when a DTMF signal is received.

`POST /calls/{call_control_id}/actions/gather_using_audio`

Optional: `audio_url` (string), `client_state` (string), `command_id` (string), `inter_digit_timeout_millis` (int32), `invalid_audio_url` (string), `invalid_media_name` (string), `maximum_digits` (int32), `maximum_tries` (int32), `media_name` (string), `minimum_digits` (int32), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string)

```ruby
response = client.calls.actions.gather_using_audio("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Returns: `result` (string)

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_payload', which will be played back at the beginning of each prompt. Speech will be interrupted when a DTMF signal is received.

`POST /calls/{call_control_id}/actions/gather_using_speak` — Required: `voice`, `payload`

Optional: `client_state` (string), `command_id` (string), `inter_digit_timeout_millis` (int32), `invalid_payload` (string), `language` (enum: arb, cmn-CN, cy-GB, da-DK, de-DE, en-AU, en-GB, en-GB-WLS, en-IN, en-US, es-ES, es-MX, es-US, fr-CA, fr-FR, hi-IN, is-IS, it-IT, ja-JP, ko-KR, nb-NO, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, tr-TR), `maximum_digits` (int32), `maximum_tries` (int32), `minimum_digits` (int32), `payload_type` (enum: text, ssml), `service_level` (enum: basic, premium), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string), `voice_settings` (object)

```ruby
response = client.calls.actions.gather_using_speak("call_control_id", payload: "say this on call", voice: "male")

puts(response)
```

Returns: `result` (string)

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

| Event | Description |
|-------|-------------|
| `CallAIGatherEnded` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | Call AI Gather Partial Results |
| `callGatherEnded` | Call Gather Ended |

### Webhook payload fields

**`CallAIGatherEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.ai_gather.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Telnyx connection ID used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.message_history` | array[object] | The history of the messages exchanged during the AI gather |
| `data.payload.result` | object | The result of the AI gather, its type depends of the `parameters` provided in the command |
| `data.payload.status` | enum: valid, invalid | Reflects how command ended. |

**`CallAIGatherMessageHistoryUpdated`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.ai_gather.message_history_updated | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Telnyx connection ID used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.message_history` | array[object] | The history of the messages exchanged during the AI gather |

**`CallAIGatherPartialResults`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.ai_gather.partial_results | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Telnyx connection ID used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.message_history` | array[object] | The history of the messages exchanged during the AI gather |
| `data.payload.partial_results` | object | The partial result of the AI gather, its type depends of the `parameters` provided in the command |

**`callGatherEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.gather.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.digits` | string | The received DTMF digit or symbol. |
| `data.payload.status` | enum: valid, invalid, call_hangup, cancelled, cancelled_amd, timeout | Reflects how command ended. |
