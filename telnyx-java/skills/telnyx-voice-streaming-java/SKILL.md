---
name: telnyx-voice-streaming-java
description: >-
  Real-time audio streaming, media forking, and live transcription. Use for
  analytics and AI integrations.
metadata:
  author: telnyx
  product: voice-streaming
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Streaming start

Start streaming the media from a call to a specific WebSocket address or Dialogflow connection in near-realtime. Audio will be delivered as base64-encoded RTP payload (raw audio), wrapped in JSON payloads. Please find more details about media streaming messages specification under the [link](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming).

`client.calls().actions().startStreaming()` — `POST /calls/{call_control_id}/actions/streaming_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `streamTrack` | enum (inbound_track, outbound_track, both_tracks) | No | Specifies which track should be streamed. |
| `streamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | No | Specifies the codec to be used for the streamed audio. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
