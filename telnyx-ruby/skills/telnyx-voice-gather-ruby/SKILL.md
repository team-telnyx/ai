---
name: telnyx-voice-gather-ruby
description: >-
  Collect DTMF and speech input from callers. Standard gather and AI-powered
  gather for voice menus.
metadata:
  author: telnyx
  product: voice-gather
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Gather - Ruby

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-ruby)
2. Call must be answered before issuing gather commands

### Steps

1. **Gather DTMF**: `client.calls.actions.gather(call_control_id: ..., minimum_digits: ..., maximum_digits: ...)`
2. **Gather with audio prompt**: `client.calls.actions.gather_using_audio(call_control_id: ..., audio_url: ...)`
3. **Gather with TTS prompt**: `client.calls.actions.gather_using_speak(call_control_id: ..., payload: ..., voice: ...)`
4. **Handle result**: `call.gather.ended webhook — digits in data.payload.digits`

### Common mistakes

- NEVER issue gather before the call is answered — will fail silently
- Gather results arrive via call.gather.ended webhook — NOT in the API response
- Set inter_digit_timeout_millis to control how long to wait between digits (default varies)
- For AI-powered gather, results arrive via call.ai_gather.ended webhook

**Related skills**: telnyx-voice-ruby, telnyx-voice-media-ruby

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
  result = client.calls.actions.gather(params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`client.calls.actions.gather()` — `POST /calls/{call_control_id}/actions/gather`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `gather_id` | string (UUID) | No | An id that will be sent back in the corresponding `call.gath... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.gather("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.result`

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_audio_url', which will be played back at the beginning of each prompt. Playback will be interrupted when a DTMF signal is received.

`client.calls.actions.gather_using_audio()` — `POST /calls/{call_control_id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `audio_url` | string (URL) | No | The URL of a file to be played back at the beginning of each... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.gather_using_audio("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.result`

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_payload', which will be played back at the beginning of each prompt. Speech will be interrupted when a DTMF signal is received.

`client.calls.actions.gather_using_speak()` — `POST /calls/{call_control_id}/actions/gather_using_speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `payload_type` | enum (text, ssml) | No | The type of the provided payload. |
| `service_level` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.gather_using_speak("call_control_id", payload: "say this on call", voice: "male")

puts(response)
```

Key response fields: `response.data.result`

## Gather using AI

Gather parameters defined in the request payload using a voice assistant. You can pass parameters described as a JSON Schema object and the voice assistant will attempt to gather these informations.

`client.calls.actions.gather_using_ai()` — `POST /calls/{call_control_id}/actions/gather_using_ai`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parameters` | object | Yes | The parameters described as a JSON Schema object that needs ... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `assistant` | object | No | Assistant configuration including choice of LLM, custom inst... |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.gather_using_ai(
  "call_control_id",
  parameters: {properties: "bar", required: "bar", type: "bar"}
)

puts(response)
```

Key response fields: `response.data.conversation_id, response.data.result`

## Gather stop

Stop current gather. **Expected Webhooks:**

- `call.gather.ended`

`client.calls.actions.stop_gather()` — `POST /calls/{call_control_id}/actions/gather_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```ruby
response = client.calls.actions.stop_gather("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.result`

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`client.calls.actions.add_ai_assistant_messages()` — `POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `messages` | array[object] | No | The messages to add to the conversation. |

```ruby
response = client.calls.actions.add_ai_assistant_messages("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.result`

## Start AI Assistant

Start an AI assistant on the call. **Expected Webhooks:**

- `call.conversation.ended`
- `call.conversation_insights.generated`

`client.calls.actions.start_ai_assistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `assistant` | object | No | AI Assistant configuration |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.calls.actions.start_ai_assistant("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

puts(response)
```

Key response fields: `response.data.conversation_id, response.data.result`

## Stop AI Assistant

Stop an AI assistant on the call.

`client.calls.actions.stop_ai_assistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```ruby
response = client.calls.actions.stop_ai_assistant("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")

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
| `CallAIGatherEnded` | `call.ai_gather.ended` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | `call.ai.gather.message.history.updated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | `call.ai.gather.partial.results` | Call AI Gather Partial Results |
| `callGatherEnded` | `call.gather.ended` | Call Gather Ended |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
