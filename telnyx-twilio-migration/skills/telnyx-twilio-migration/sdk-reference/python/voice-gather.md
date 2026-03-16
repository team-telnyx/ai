<!-- SDK reference: telnyx-voice-gather-python -->

# Telnyx Voice Gather - Python

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-python)
2. Call must be answered before issuing gather commands

### Steps

1. **Gather DTMF**: `client.calls.actions.gather(call_control_id=..., minimum_digits=..., maximum_digits=...)`
2. **Gather with audio prompt**: `client.calls.actions.gather_using_audio(call_control_id=..., audio_url=...)`
3. **Gather with TTS prompt**: `client.calls.actions.gather_using_speak(call_control_id=..., payload=..., voice=...)`
4. **Handle result**: `call.gather.ended webhook — digits in data.payload.digits`

### Common mistakes

- NEVER issue gather before the call is answered — will fail silently
- Gather results arrive via call.gather.ended webhook — NOT in the API response
- Set inter_digit_timeout_millis to control how long to wait between digits (default varies)
- For AI-powered gather, results arrive via call.ai_gather.ended webhook

**Related skills**: telnyx-voice-python, telnyx-voice-media-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.calls.actions.gather(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`client.calls.actions.gather()` — `POST /calls/{call_control_id}/actions/gather`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `gather_id` | string (UUID) | No | An id that will be sent back in the corresponding `call.gath... |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +7 optional params in the API Details section below |

```python
response = client.calls.actions.gather(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    minimum_digits=1,
    maximum_digits=4,
)
print(response.data)
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
| ... | | | +10 optional params in the API Details section below |

```python
response = client.calls.actions.gather_using_audio(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
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
| ... | | | +11 optional params in the API Details section below |

```python
response = client.calls.actions.gather_using_speak(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    payload="say this on call",
    voice="male",
)
print(response.data)
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
| ... | | | +11 optional params in the API Details section below |

```python
response = client.calls.actions.gather_using_ai(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    parameters={
        "properties": "bar",
        "required": "bar",
        "type": "bar",
    },
)
print(response.data)
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

```python
response = client.calls.actions.stop_gather(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
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

```python
response = client.calls.actions.add_ai_assistant_messages(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
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
| ... | | | +5 optional params in the API Details section below |

```python
response = client.calls.actions.start_ai_assistant(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
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

```python
response = client.calls.actions.stop_ai_assistant(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```python
# In your webhook handler (e.g., Flask — use raw body, not parsed JSON):
@app.route("/webhooks", methods=["POST"])
def handle_webhook():
    payload = request.get_data(as_text=True)  # raw body as string
    headers = dict(request.headers)
    try:
        event = client.webhooks.unwrap(payload, headers=headers)
    except Exception as e:
        print(f"Webhook verification failed: {e}")
        return "Invalid signature", 400
    # Signature valid — event is the parsed webhook payload
    print(f"Received event: {event.data.event_type}")
    return "OK", 200
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `CallAIGatherEnded` | `call.ai_gather.ended` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | `call.ai.gather.message.history.updated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | `call.ai.gather.partial.results` | Call AI Gather Partial Results |
| `callGatherEnded` | `call.gather.ended` | Call Gather Ended |

Webhook payload field definitions are in the API Details section below.

---

# Voice Gather (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Add messages to AI Assistant, Stop AI Assistant, Gather, Gather stop, Gather using audio, Gather using speak

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** Start AI Assistant, Gather using AI

| Field | Type |
|-------|------|
| `conversation_id` | uuid |
| `result` | string |

## Optional Parameters

### Add messages to AI Assistant — `client.calls.actions.add_ai_assistant_messages()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `messages` | array[object] | The messages to add to the conversation. |

### Start AI Assistant — `client.calls.actions.start_ai_assistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `assistant` | object | AI Assistant configuration |
| `voice` | string | The voice to be used by the voice assistant. |
| `voice_settings` | object | The settings associated with the voice selected |
| `greeting` | string | Text that will be played when the assistant starts, if none then nothing will... |
| `interruption_settings` | object | Settings for handling user interruptions during assistant speech |
| `transcription` | object | The settings associated with speech to text for the voice assistant. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Stop AI Assistant — `client.calls.actions.stop_ai_assistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather — `client.calls.actions.gather()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `minimum_digits` | integer | The minimum number of digits to fetch. |
| `maximum_digits` | integer | The maximum number of digits to fetch. |
| `timeout_millis` | integer | The number of milliseconds to wait to complete the request. |
| `inter_digit_timeout_millis` | integer | The number of milliseconds to wait for input between digits. |
| `initial_timeout_millis` | integer | The number of milliseconds to wait for the first DTMF. |
| `terminating_digit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `valid_digits` | string | A list of all digits accepted as valid. |
| `gather_id` | string (UUID) | An id that will be sent back in the corresponding `call.gather.ended` webhook. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather stop — `client.calls.actions.stop_gather()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using AI — `client.calls.actions.gather_using_ai()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `assistant` | object | Assistant configuration including choice of LLM, custom instructions, and tools. |
| `transcription` | object | The settings associated with speech to text for the voice assistant. |
| `language` | object |  |
| `voice` | string | The voice to be used by the voice assistant. |
| `voice_settings` | object | The settings associated with the voice selected |
| `greeting` | string | Text that will be played when the gathering starts, if none then nothing will... |
| `send_partial_results` | boolean | Default is `false`. |
| `send_message_history_updates` | boolean | Default is `false`. |
| `message_history` | array[object] | The message history you want the voice assistant to be aware of, this can be ... |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `interruption_settings` | object | Settings for handling user interruptions during assistant speech |
| `user_response_timeout_ms` | integer | The maximum time in milliseconds to wait for user response before timing out. |
| `gather_ended_speech` | string | Text that will be played when the gathering has finished. |

### Gather using audio — `client.calls.actions.gather_using_audio()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `audio_url` | string (URL) | The URL of a file to be played back at the beginning of each prompt. |
| `media_name` | string | The media_name of a file to be played back at the beginning of each prompt. |
| `invalid_audio_url` | string (URL) | The URL of a file to play when digits don't match the `valid_digits` paramete... |
| `invalid_media_name` | string | The media_name of a file to be played back when digits don't match the `valid... |
| `minimum_digits` | integer | The minimum number of digits to fetch. |
| `maximum_digits` | integer | The maximum number of digits to fetch. |
| `maximum_tries` | integer | The maximum number of times the file should be played if there is no input fr... |
| `timeout_millis` | integer | The number of milliseconds to wait for a DTMF response after file playback en... |
| `terminating_digit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `valid_digits` | string | A list of all digits accepted as valid. |
| `inter_digit_timeout_millis` | integer | The number of milliseconds to wait for input between digits. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using speak — `client.calls.actions.gather_using_speak()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `invalid_payload` | string | The text or SSML to be converted into speech when digits don't match the `val... |
| `payload_type` | enum (text, ssml) | The type of the provided payload. |
| `service_level` | enum (basic, premium) | This parameter impacts speech quality, language options and payload types. |
| `voice_settings` | object | The settings associated with the voice selected |
| `language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | The language you want spoken. |
| `minimum_digits` | integer | The minimum number of digits to fetch. |
| `maximum_digits` | integer | The maximum number of digits to fetch. |
| `maximum_tries` | integer | The maximum number of times that a file should be played back if there is no ... |
| `timeout_millis` | integer | The number of milliseconds to wait for a DTMF response after speak ends befor... |
| `terminating_digit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `valid_digits` | string | A list of all digits accepted as valid. |
| `inter_digit_timeout_millis` | integer | The number of milliseconds to wait for input between digits. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

## Webhook Payload Fields

### `CallAIGatherEnded`

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

### `CallAIGatherMessageHistoryUpdated`

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

### `CallAIGatherPartialResults`

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

### `callGatherEnded`

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
