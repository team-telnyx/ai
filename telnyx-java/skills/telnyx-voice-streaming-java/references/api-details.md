# Voice Streaming (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Forking start, Forking stop, Streaming start, Streaming stop, Transcription start, Transcription stop

| Field | Type |
|-------|------|
| `result` | string |

## Optional Parameters

### Forking start — `client.calls().actions().startForking()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `rx` | string | The network target, , where the call's incoming RTP media packets should be f... |
| `streamType` | enum (decrypted) | Optionally specify a media type to stream. |
| `tx` | string | The network target, , where the call's outgoing RTP media packets should be f... |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Forking stop — `client.calls().actions().stopForking()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `streamType` | enum (raw, decrypted) | Optionally specify a `stream_type`. |

### Streaming start — `client.calls().actions().startStreaming()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `streamUrl` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `streamTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `streamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `streamBidirectionalMode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `streamBidirectionalCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `streamBidirectionalTargetLegs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `streamBidirectionalSamplingRate` | enum (8000, 16000, 22050, 24000, 48000) | Audio sampling rate. |
| `enableDialogflow` | boolean | Enables Dialogflow for the current call. |
| `dialogflowConfig` | object |  |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `customParameters` | array[object] | Custom parameters to be sent as part of the WebSocket connection. |
| `streamAuthToken` | string | An authentication token to be sent as part of the WebSocket connection. |

### Streaming stop — `client.calls().actions().stopStreaming()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `streamId` | string (UUID) | Identifies the stream. |

### Transcription start — `client.calls().actions().startTranscription()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `transcriptionEngine` | enum (Google, Telnyx, Deepgram, Azure, A, ...) | Engine to use for speech recognition. |
| `transcriptionEngineConfig` | object |  |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `transcriptionTracks` | string | Indicates which leg of the call will be transcribed. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Transcription stop — `client.calls().actions().stopTranscription()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

## Webhook Payload Fields

### `callForkStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.fork.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_type` | enum: decrypted | Type of media streamed. |

### `callForkStopped`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.fork.stopped | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_type` | enum: decrypted | Type of media streamed. |

### `callStreamingFailed`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the resource. |
| `data.event_type` | enum: streaming.failed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.failure_reason` | string | A short description explaning why the media streaming failed. |
| `data.payload.stream_id` | uuid | Identifies the streaming. |
| `data.payload.stream_type` | enum: websocket, dialogflow | The type of stream connection the stream is performing. |

### `callStreamingStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: streaming.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_url` | string | Destination WebSocket address where the stream is going to be delivered. |

### `callStreamingStopped`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: streaming.stopped | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_url` | string | Destination WebSocket address where the stream is going to be delivered. |

### `transcription`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.transcription | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique identifier and token for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | Use this field to add state to every subsequent webhook. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
