<!-- SDK reference: telnyx-voice-streaming-java -->

# Telnyx Voice Streaming - Java

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-java)
2. WebSocket server ready to receive audio stream (for streaming)

### Steps

1. **Start streaming**: `client.calls().actions().streamingStart(params)`
2. **Start transcription**: `client.calls().actions().transcriptionStart(params)`
3. **Start fork**: `client.calls().actions().forkStart(params)`

### Common mistakes

- stream_url must be a WebSocket URL (wss://) — HTTP URLs will fail
- Transcription events arrive via call.transcription webhook — not in the API response
- VOICE IS EVENT-DRIVEN: all streaming commands return immediately, data arrives via WebSocket or webhooks

**Related skills**: telnyx-voice-java, telnyx-voice-media-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.calls().actions().streamingStart(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Streaming start

Start streaming the media from a call to a specific WebSocket address or Dialogflow connection in near-realtime. Audio will be delivered as base64-encoded RTP payload (raw audio), wrapped in JSON payloads. Please find more details about media streaming messages specification under the [link](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming).

`client.calls().actions().startStreaming()` — `POST /calls/{call_control_id}/actions/streaming_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `streamTrack` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be streamed. |
| `streamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | No | Specifies the codec to be used for the streamed audio. |
| ... | | | +10 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.calls.actions.ActionStartStreamingParams;
import com.telnyx.sdk.models.calls.actions.ActionStartStreamingResponse;

ActionStartStreamingResponse response = client.calls().actions().startStreaming("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Streaming stop

Stop streaming a call to a WebSocket. **Expected Webhooks:**

- `streaming.stopped`

`client.calls().actions().stopStreaming()` — `POST /calls/{call_control_id}/actions/streaming_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `streamId` | string (UUID) | No | Identifies the stream. |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopStreamingParams;
import com.telnyx.sdk.models.calls.actions.ActionStopStreamingResponse;

ActionStopStreamingResponse response = client.calls().actions().stopStreaming("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Transcription start

Start real-time transcription. Transcription will stop on call hang-up, or can be initiated via the Transcription stop command. **Expected Webhooks:**

- `call.transcription`

`client.calls().actions().startTranscription()` — `POST /calls/{call_control_id}/actions/transcription_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `transcriptionEngine` | enum (Google, Telnyx, Deepgram, Azure, A, ...) | No | Engine to use for speech recognition. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +2 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.calls.actions.ActionStartTranscriptionParams;
import com.telnyx.sdk.models.calls.actions.ActionStartTranscriptionResponse;
import com.telnyx.sdk.models.calls.actions.TranscriptionStartRequest;

ActionStartTranscriptionParams params = ActionStartTranscriptionParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .transcriptionStartRequest(TranscriptionStartRequest.builder().build())
    .build();
ActionStartTranscriptionResponse response = client.calls().actions().startTranscription(params);
```

Key response fields: `response.data.result`

## Transcription stop

Stop real-time transcription.

`client.calls().actions().stopTranscription()` — `POST /calls/{call_control_id}/actions/transcription_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopTranscriptionParams;
import com.telnyx.sdk.models.calls.actions.ActionStopTranscriptionResponse;

ActionStopTranscriptionResponse response = client.calls().actions().stopTranscription("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Forking start

Call forking allows you to stream the media from a call to a specific target in realtime. This stream can be used to enable realtime audio analysis to support a 
variety of use cases, including fraud detection, or the creation of AI-generated audio responses. Requests must specify either the `target` attribute or the `rx` and `tx` attributes.

`client.calls().actions().startForking()` — `POST /calls/{call_control_id}/actions/fork_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `streamType` | enum (decrypted) | No | Optionally specify a media type to stream. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +2 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.calls.actions.ActionStartForkingParams;
import com.telnyx.sdk.models.calls.actions.ActionStartForkingResponse;

ActionStartForkingResponse response = client.calls().actions().startForking("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Forking stop

Stop forking a call. **Expected Webhooks:**

- `call.fork.stopped`

`client.calls().actions().stopForking()` — `POST /calls/{call_control_id}/actions/fork_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `streamType` | enum (raw, decrypted) | No | Optionally specify a `stream_type`. |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopForkingParams;
import com.telnyx.sdk.models.calls.actions.ActionStopForkingResponse;

ActionStopForkingResponse response = client.calls().actions().stopForking("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```java
import com.telnyx.sdk.core.UnwrapWebhookParams;
import com.telnyx.sdk.core.http.Headers;

// In your webhook handler (e.g., Spring — use raw body):
@PostMapping("/webhooks")
public ResponseEntity<String> handleWebhook(
    @RequestBody String payload,
    HttpServletRequest request) {
  try {
    Headers headers = Headers.builder()
        .put("telnyx-signature-ed25519", request.getHeader("telnyx-signature-ed25519"))
        .put("telnyx-timestamp", request.getHeader("telnyx-timestamp"))
        .build();
    var event = client.webhooks().unwrap(
        UnwrapWebhookParams.builder()
            .body(payload)
            .headers(headers)
            .build());
    // Signature valid — process the event
    System.out.println("Received webhook event");
    return ResponseEntity.ok("OK");
  } catch (Exception e) {
    System.err.println("Webhook verification failed: " + e.getMessage());
    return ResponseEntity.badRequest().body("Invalid signature");
  }
}
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `callForkStarted` | `call.fork.started` | Call Fork Started |
| `callForkStopped` | `call.fork.stopped` | Call Fork Stopped |
| `callStreamingFailed` | `call.streaming.failed` | Call Streaming Failed |
| `callStreamingStarted` | `call.streaming.started` | Call Streaming Started |
| `callStreamingStopped` | `call.streaming.stopped` | Call Streaming Stopped |
| `transcription` | `transcription` | Transcription |

Webhook payload field definitions are in the API Details section below.

---

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
