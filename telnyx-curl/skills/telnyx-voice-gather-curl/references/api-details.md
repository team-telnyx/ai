# Voice Gather (curl) — API Details

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

### Add messages to AI Assistant

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `messages` | array[object] | The messages to add to the conversation. |

### Start AI Assistant

| Parameter | Type | Description |
|-----------|------|-------------|
| `assistant` | object | AI Assistant configuration |
| `voice` | string | The voice to be used by the voice assistant. |
| `voice_settings` | object | The settings associated with the voice selected |
| `greeting` | string | Text that will be played when the assistant starts, if none then nothing will... |
| `interruption_settings` | object | Settings for handling user interruptions during assistant speech |
| `transcription` | object | The settings associated with speech to text for the voice assistant. |
| `message_history` | array[object] | A list of messages to seed the conversation history before the assistant starts. |
| `send_message_history_updates` | boolean | When `true`, a webhook is sent each time the conversation message history is ... |
| `participants` | array[object] | A list of participants to add to the conversation when it starts. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Stop AI Assistant

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather

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

### Gather stop

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using AI

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

### Gather using audio

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

### Gather using speak

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
