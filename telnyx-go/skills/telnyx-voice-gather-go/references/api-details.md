# Voice Gather (Go) — API Details

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

### Add messages to AI Assistant — `client.Calls.Actions.AddAIAssistantMessages()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `Messages` | array[object] | The messages to add to the conversation. |

### Start AI Assistant — `client.Calls.Actions.StartAIAssistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Assistant` | object | AI Assistant configuration |
| `Voice` | string | The voice to be used by the voice assistant. |
| `VoiceSettings` | object | The settings associated with the voice selected |
| `Greeting` | string | Text that will be played when the assistant starts, if none then nothing will... |
| `InterruptionSettings` | object | Settings for handling user interruptions during assistant speech |
| `Transcription` | object | The settings associated with speech to text for the voice assistant. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Stop AI Assistant — `client.Calls.Actions.StopAIAssistant()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather — `client.Calls.Actions.Gather()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `MinimumDigits` | integer | The minimum number of digits to fetch. |
| `MaximumDigits` | integer | The maximum number of digits to fetch. |
| `TimeoutMillis` | integer | The number of milliseconds to wait to complete the request. |
| `InterDigitTimeoutMillis` | integer | The number of milliseconds to wait for input between digits. |
| `InitialTimeoutMillis` | integer | The number of milliseconds to wait for the first DTMF. |
| `TerminatingDigit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `ValidDigits` | string | A list of all digits accepted as valid. |
| `GatherId` | string (UUID) | An id that will be sent back in the corresponding `call.gather.ended` webhook. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather stop — `client.Calls.Actions.StopGather()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using AI — `client.Calls.Actions.GatherUsingAI()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Assistant` | object | Assistant configuration including choice of LLM, custom instructions, and tools. |
| `Transcription` | object | The settings associated with speech to text for the voice assistant. |
| `Language` | object |  |
| `Voice` | string | The voice to be used by the voice assistant. |
| `VoiceSettings` | object | The settings associated with the voice selected |
| `Greeting` | string | Text that will be played when the gathering starts, if none then nothing will... |
| `SendPartialResults` | boolean | Default is `false`. |
| `SendMessageHistoryUpdates` | boolean | Default is `false`. |
| `MessageHistory` | array[object] | The message history you want the voice assistant to be aware of, this can be ... |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `InterruptionSettings` | object | Settings for handling user interruptions during assistant speech |
| `UserResponseTimeoutMs` | integer | The maximum time in milliseconds to wait for user response before timing out. |
| `GatherEndedSpeech` | string | Text that will be played when the gathering has finished. |

### Gather using audio — `client.Calls.Actions.GatherUsingAudio()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `AudioUrl` | string (URL) | The URL of a file to be played back at the beginning of each prompt. |
| `MediaName` | string | The media_name of a file to be played back at the beginning of each prompt. |
| `InvalidAudioUrl` | string (URL) | The URL of a file to play when digits don't match the `valid_digits` paramete... |
| `InvalidMediaName` | string | The media_name of a file to be played back when digits don't match the `valid... |
| `MinimumDigits` | integer | The minimum number of digits to fetch. |
| `MaximumDigits` | integer | The maximum number of digits to fetch. |
| `MaximumTries` | integer | The maximum number of times the file should be played if there is no input fr... |
| `TimeoutMillis` | integer | The number of milliseconds to wait for a DTMF response after file playback en... |
| `TerminatingDigit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `ValidDigits` | string | A list of all digits accepted as valid. |
| `InterDigitTimeoutMillis` | integer | The number of milliseconds to wait for input between digits. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather using speak — `client.Calls.Actions.GatherUsingSpeak()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `InvalidPayload` | string | The text or SSML to be converted into speech when digits don't match the `val... |
| `PayloadType` | enum (text, ssml) | The type of the provided payload. |
| `ServiceLevel` | enum (basic, premium) | This parameter impacts speech quality, language options and payload types. |
| `VoiceSettings` | object | The settings associated with the voice selected |
| `Language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | The language you want spoken. |
| `MinimumDigits` | integer | The minimum number of digits to fetch. |
| `MaximumDigits` | integer | The maximum number of digits to fetch. |
| `MaximumTries` | integer | The maximum number of times that a file should be played back if there is no ... |
| `TimeoutMillis` | integer | The number of milliseconds to wait for a DTMF response after speak ends befor... |
| `TerminatingDigit` | string | The digit used to terminate input if fewer than `maximum_digits` digits have ... |
| `ValidDigits` | string | A list of all digits accepted as valid. |
| `InterDigitTimeoutMillis` | integer | The number of milliseconds to wait for input between digits. |
| `ClientState` | string | Use this field to add state to every subsequent webhook. |
| `CommandId` | string (UUID) | Use this field to avoid duplicate commands. |

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
