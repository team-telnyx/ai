---
name: telnyx-voice-streaming-javascript
description: >-
  Stream call audio in real-time, fork media to external destinations, and
  transcribe speech live. Use for real-time analytics and AI integrations. This
  skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: voice-streaming
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Streaming - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Forking start

Call forking allows you to stream the media from a call to a specific target in realtime.

`POST /calls/{call_control_id}/actions/fork_start`

Optional: `client_state` (string), `command_id` (string), `rx` (string), `stream_type` (enum), `tx` (string)

```javascript
const response = await client.calls.actions.startForking('call_control_id');

console.log(response.data);
```

## Forking stop

Stop forking a call.

`POST /calls/{call_control_id}/actions/fork_stop`

Optional: `client_state` (string), `command_id` (string), `stream_type` (enum)

```javascript
const response = await client.calls.actions.stopForking('call_control_id');

console.log(response.data);
```

## Streaming start

Start streaming the media from a call to a specific WebSocket address or Dialogflow connection in near-realtime.

`POST /calls/{call_control_id}/actions/streaming_start`

Optional: `client_state` (string), `command_id` (string), `custom_parameters` (array[object]), `dialogflow_config` (object), `enable_dialogflow` (boolean), `stream_auth_token` (string), `stream_bidirectional_codec` (enum), `stream_bidirectional_mode` (enum), `stream_bidirectional_sampling_rate` (enum), `stream_bidirectional_target_legs` (enum), `stream_codec` (enum), `stream_track` (enum), `stream_url` (string)

```javascript
const response = await client.calls.actions.startStreaming('call_control_id');

console.log(response.data);
```

## Streaming stop

Stop streaming a call to a WebSocket.

`POST /calls/{call_control_id}/actions/streaming_stop`

Optional: `client_state` (string), `command_id` (string), `stream_id` (uuid)

```javascript
const response = await client.calls.actions.stopStreaming('call_control_id');

console.log(response.data);
```

## Transcription start

Start real-time transcription.

`POST /calls/{call_control_id}/actions/transcription_start`

Optional: `client_state` (string), `command_id` (string), `transcription_engine` (enum), `transcription_engine_config` (object), `transcription_tracks` (string)

```javascript
const response = await client.calls.actions.startTranscription('call_control_id');

console.log(response.data);
```

## Transcription stop

Stop real-time transcription.

`POST /calls/{call_control_id}/actions/transcription_stop`

Optional: `client_state` (string), `command_id` (string)

```javascript
const response = await client.calls.actions.stopTranscription('call_control_id');

console.log(response.data);
```

---

## Webhooks

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for verification (Standard Webhooks compatible).

| Event | Description |
|-------|-------------|
| `callForkStarted` | Call Fork Started |
| `callForkStopped` | Call Fork Stopped |
| `callStreamingFailed` | Call Streaming Failed |
| `callStreamingStarted` | Call Streaming Started |
| `callStreamingStopped` | Call Streaming Stopped |
| `transcription` | Transcription |

### Webhook payload fields

**`callForkStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_type` | enum | Type of media streamed. |

**`callForkStopped`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_type` | enum | Type of media streamed. |

**`callStreamingFailed`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.failure_reason` | string | A short description explaning why the media streaming failed. |
| `data.payload.stream_id` | uuid | Identifies the streaming. |
| `data.payload.stream_type` | enum | The type of stream connection the stream is performing. |

**`callStreamingStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_url` | string | Destination WebSocket address where the stream is going to be delivered. |

**`callStreamingStopped`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.stream_url` | string | Destination WebSocket address where the stream is going to be delivered. |

**`transcription`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique identifier and token for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | Use this field to add state to every subsequent webhook. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
