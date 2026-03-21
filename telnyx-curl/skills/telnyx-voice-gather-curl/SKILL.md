---
name: telnyx-voice-gather-curl
description: >-
  Collect DTMF and speech input from callers. Standard gather and AI-powered
  gather for voice menus.
metadata:
  author: telnyx
  product: voice-gather
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Gather - curl

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-curl)
2. Call must be answered before issuing gather commands

### Steps

1. **Gather DTMF**
2. **Gather with audio prompt**
3. **Gather with TTS prompt**
4. **Handle result**

### Common mistakes

- NEVER issue gather before the call is answered — will fail silently
- Gather results arrive via call.gather.ended webhook — NOT in the API response
- Set inter_digit_timeout_millis to control how long to wait between digits (default varies)
- For AI-powered gather, results arrive via call.ai_gather.ended webhook

**Related skills**: telnyx-voice-curl, telnyx-voice-media-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`POST /calls/{call_control_id}/actions/gather`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `gather_id` | string (UUID) | No | An id that will be sent back in the corresponding `call.gath... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "minimum_digits": 1,
      "maximum_digits": 4
  }' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/gather"
```

Key response fields: `.data.result`

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_audio_url', which will be played back at the beginning of each prompt. Playback will be interrupted when a DTMF signal is received.

`POST /calls/{call_control_id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `audio_url` | string (URL) | No | The URL of a file to be played back at the beginning of each... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/gather_using_audio"
```

Key response fields: `.data.result`

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_payload', which will be played back at the beginning of each prompt. Speech will be interrupted when a DTMF signal is received.

`POST /calls/{call_control_id}/actions/gather_using_speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `payload_type` | enum (text, ssml) | No | The type of the provided payload. |
| `service_level` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "payload": "Say this on the call",
  "voice": "Telnyx.KokoroTTS.af"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/gather_using_speak"
```

Key response fields: `.data.result`

## Gather using AI

Gather parameters defined in the request payload using a voice assistant. You can pass parameters described as a JSON Schema object and the voice assistant will attempt to gather these informations.

`POST /calls/{call_control_id}/actions/gather_using_ai`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parameters` | object | Yes | The parameters described as a JSON Schema object that needs ... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `assistant` | object | No | Assistant configuration including choice of LLM, custom inst... |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "parameters": {
    "properties": {
      "age": {
        "description": "The age of the customer.",
        "type": "integer"
      },
      "location": {
        "description": "The location of the customer.",
        "type": "webhook"
      }
    },
    "required": [
      "age",
      "location"
    ],
    "type": "object"
  }
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/gather_using_ai"
```

Key response fields: `.data.conversation_id, .data.result`

## Gather stop

Stop current gather. **Expected Webhooks:**

- `call.gather.ended`

`POST /calls/{call_control_id}/actions/gather_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/gather_stop"
```

Key response fields: `.data.result`

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `messages` | array[object] | No | The messages to add to the conversation. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/ai_assistant_add_messages"
```

Key response fields: `.data.result`

## Start AI Assistant

Start an AI assistant on the call. **Expected Webhooks:**

- `call.conversation.ended`
- `call.conversation_insights.generated`

`POST /calls/{call_control_id}/actions/ai_assistant_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `assistant` | object | No | AI Assistant configuration |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/ai_assistant_start"
```

Key response fields: `.data.conversation_id, .data.result`

## Stop AI Assistant

Stop an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/ai_assistant_stop"
```

Key response fields: `.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```bash
# Telnyx signs webhooks with Ed25519 (asymmetric — NOT HMAC/Standard Webhooks).
# Headers sent with each webhook:
#   telnyx-signature-ed25519: base64-encoded Ed25519 signature
#   telnyx-timestamp: Unix timestamp (reject if >5 minutes old for replay protection)
#
# Get your public key from: Telnyx Portal > Account Settings > Keys & Credentials
# Use the Telnyx SDK in your language for verification (client.webhooks.unwrap).
# Your endpoint MUST return 2xx within 2 seconds or Telnyx will retry (up to 3 attempts).
# Configure a failover URL in Telnyx Portal for additional reliability.
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
