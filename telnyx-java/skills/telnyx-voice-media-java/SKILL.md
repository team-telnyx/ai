---
name: telnyx-voice-media-java
description: >-
  Play audio, text-to-speech, and record calls. Use for IVR, announcements, or
  call recording.
metadata:
  author: telnyx
  product: voice-media
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Media - Java

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-java)
2. Call must be answered before issuing playback/record/speak commands

### Steps

1. **Play audio**: `client.calls().actions().playbackStart(params)`
2. **Text-to-speech**: `client.calls().actions().speak(params)`
3. **Start recording**: `client.calls().actions().recordStart(params)`
4. **Stop recording**: `client.calls().actions().recordStop(params)`

### Common mistakes

- NEVER issue playback/record/speak before the call is answered — commands will fail silently
- audio_url for playback must be a publicly accessible URL (MP3 or WAV)
- VOICE IS EVENT-DRIVEN: playback_start returns immediately. Wait for call.playback.ended webhook before issuing the next command
- For dual-channel recording (both legs), set channels='dual'. Default is single (mixed)

**Related skills**: telnyx-voice-java, telnyx-voice-gather-java

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
    var result = client.calls().actions().playbackStart(params);
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

## Play audio URL

Play an audio file on the call. If multiple play audio commands are issued consecutively,
the audio files will be placed in a queue awaiting playback. *Notes:*

- When `overlay` is enabled, `target_legs` is limited to `self`.

`client.calls().actions().startPlayback()` — `POST /calls/{call_control_id}/actions/playback_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `audioType` | enum (mp3, wav) | No | Specifies the type of audio provided in `audio_url` or `play... |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionStartPlaybackParams;
import com.telnyx.sdk.models.calls.actions.ActionStartPlaybackResponse;

ActionStartPlaybackResponse response = client.calls().actions().startPlayback("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Speak text

Convert text to speech and play it back on the call. If multiple speak text commands are issued consecutively, the audio files will be placed in a queue awaiting playback. **Expected Webhooks:**

- `call.speak.started`
- `call.speak.ended`

`client.calls().actions().speak()` — `POST /calls/{call_control_id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `payloadType` | enum (text, ssml) | No | The type of the provided payload. |
| `serviceLevel` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionSpeakParams;
import com.telnyx.sdk.models.calls.actions.ActionSpeakResponse;

ActionSpeakParams params = ActionSpeakParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .payload("Say this on the call")
    .voice("female")
    .language("en-US")
    .build();
ActionSpeakResponse response = client.calls().actions().speak(params);
```

Key response fields: `response.data.result`

## Recording start

Start recording the call. Recording will stop on call hang-up, or can be initiated via the Stop Recording command. **Expected Webhooks:**

- `call.recording.saved`
- `call.recording.transcription.saved`
- `call.recording.error`

`client.calls().actions().startRecording()` — `POST /calls/{call_control_id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (wav, mp3) | Yes | The audio file format used when storing the call recording. |
| `channels` | enum (single, dual) | Yes | When `dual`, final audio file will be stereo recorded with t... |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `timeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the recordin... |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionStartRecordingParams;
import com.telnyx.sdk.models.calls.actions.ActionStartRecordingResponse;

ActionStartRecordingParams params = ActionStartRecordingParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .channels(ActionStartRecordingParams.Channels.SINGLE)
    .format(ActionStartRecordingParams.Format.WAV)
    .build();
ActionStartRecordingResponse response = client.calls().actions().startRecording(params);
```

Key response fields: `response.data.result`

## Recording stop

Stop recording the call. **Expected Webhooks:**

- `call.recording.saved`

`client.calls().actions().stopRecording()` — `POST /calls/{call_control_id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | No | Uniquely identifies the resource. |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopRecordingParams;
import com.telnyx.sdk.models.calls.actions.ActionStopRecordingResponse;
import com.telnyx.sdk.models.calls.actions.StopRecordingRequest;

ActionStopRecordingParams params = ActionStopRecordingParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .stopRecordingRequest(StopRecordingRequest.builder().build())
    .build();
ActionStopRecordingResponse response = client.calls().actions().stopRecording(params);
```

Key response fields: `response.data.result`

## Stop audio playback

Stop audio being played on the call. **Expected Webhooks:**

- `call.playback.ended` or `call.speak.ended`

`client.calls().actions().stopPlayback()` — `POST /calls/{call_control_id}/actions/playback_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `overlay` | boolean | No | When enabled, it stops the audio being played in the overlay... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopPlaybackParams;
import com.telnyx.sdk.models.calls.actions.ActionStopPlaybackResponse;

ActionStopPlaybackResponse response = client.calls().actions().stopPlayback("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Record pause

Pause recording the call. Recording can be resumed via Resume recording command. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.calls().actions().pauseRecording()` — `POST /calls/{call_control_id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | No | Uniquely identifies the resource. |

```java
import com.telnyx.sdk.models.calls.actions.ActionPauseRecordingParams;
import com.telnyx.sdk.models.calls.actions.ActionPauseRecordingResponse;

ActionPauseRecordingResponse response = client.calls().actions().pauseRecording("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Record resume

Resume recording the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`client.calls().actions().resumeRecording()` — `POST /calls/{call_control_id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | No | Uniquely identifies the resource. |

```java
import com.telnyx.sdk.models.calls.actions.ActionResumeRecordingParams;
import com.telnyx.sdk.models.calls.actions.ActionResumeRecordingResponse;

ActionResumeRecordingResponse response = client.calls().actions().resumeRecording("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
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
| `callPlaybackEnded` | `call.playback.ended` | Call Playback Ended |
| `callPlaybackStarted` | `call.playback.started` | Call Playback Started |
| `callRecordingError` | `call.recording.error` | Call Recording Error |
| `callRecordingSaved` | `call.recording.saved` | Call Recording Saved |
| `callRecordingTranscriptionSaved` | `call.recording.transcription.saved` | Call Recording Transcription Saved |
| `callSpeakEnded` | `call.speak.ended` | Call Speak Ended |
| `callSpeakStarted` | `call.speak.started` | Call Speak Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
