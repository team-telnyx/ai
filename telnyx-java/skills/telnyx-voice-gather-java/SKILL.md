---
name: telnyx-voice-gather-java
description: >-
  Collect DTMF and speech input from callers. Standard gather and AI-powered
  gather for voice menus.
metadata:
  author: telnyx
  product: voice-gather
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Gather - Java

## Core Workflow

### Prerequisites

1. Active call via Call Control API (see telnyx-voice-java)
2. Call must be answered before issuing gather commands

### Steps

1. **Gather DTMF**: `client.calls().actions().gather(params)`
2. **Gather with audio prompt**: `client.calls().actions().gatherUsingAudio(params)`
3. **Gather with TTS prompt**: `client.calls().actions().gatherUsingSpeak(params)`
4. **Handle result**: `call.gather.ended webhook — digits in data.payload.digits`

### Common mistakes

- NEVER issue gather before the call is answered — will fail silently
- Gather results arrive via call.gather.ended webhook — NOT in the API response
- Set inter_digit_timeout_millis to control how long to wait between digits (default varies)
- For AI-powered gather, results arrive via call.ai_gather.ended webhook

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
    var result = client.calls().actions().gather(params);
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

## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`client.calls().actions().gather()` — `POST /calls/{call_control_id}/actions/gather`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `gatherId` | string (UUID) | No | An id that will be sent back in the corresponding `call.gath... |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionGatherParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherResponse;

ActionGatherResponse response = client.calls().actions().gather("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_audio_url', which will be played back at the beginning of each prompt. Playback will be interrupted when a DTMF signal is received.

`client.calls().actions().gatherUsingAudio()` — `POST /calls/{call_control_id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `audioUrl` | string (URL) | No | The URL of a file to be played back at the beginning of each... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAudioParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAudioResponse;

ActionGatherUsingAudioResponse response = client.calls().actions().gatherUsingAudio("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_payload', which will be played back at the beginning of each prompt. Speech will be interrupted when a DTMF signal is received.

`client.calls().actions().gatherUsingSpeak()` — `POST /calls/{call_control_id}/actions/gather_using_speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `payloadType` | enum (text, ssml) | No | The type of the provided payload. |
| `serviceLevel` | enum (basic, premium) | No | This parameter impacts speech quality, language options and ... |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingSpeakParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingSpeakResponse;

ActionGatherUsingSpeakParams params = ActionGatherUsingSpeakParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .payload("say this on call")
    .voice("male")
    .build();
ActionGatherUsingSpeakResponse response = client.calls().actions().gatherUsingSpeak(params);
```

Key response fields: `response.data.result`

## Gather using AI

Gather parameters defined in the request payload using a voice assistant. You can pass parameters described as a JSON Schema object and the voice assistant will attempt to gather these informations.

`client.calls().actions().gatherUsingAi()` — `POST /calls/{call_control_id}/actions/gather_using_ai`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parameters` | object | Yes | The parameters described as a JSON Schema object that needs ... |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `assistant` | object | No | Assistant configuration including choice of LLM, custom inst... |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.core.JsonValue;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAiParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAiResponse;

ActionGatherUsingAiParams params = ActionGatherUsingAiParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .parameters(ActionGatherUsingAiParams.Parameters.builder()
        .putAdditionalProperty("properties", JsonValue.from("bar"))
        .putAdditionalProperty("required", JsonValue.from("bar"))
        .putAdditionalProperty("type", JsonValue.from("bar"))
        .build())
    .build();
ActionGatherUsingAiResponse response = client.calls().actions().gatherUsingAi(params);
```

Key response fields: `response.data.conversation_id, response.data.result`

## Gather stop

Stop current gather. **Expected Webhooks:**

- `call.gather.ended`

`client.calls().actions().stopGather()` — `POST /calls/{call_control_id}/actions/gather_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopGatherParams;
import com.telnyx.sdk.models.calls.actions.ActionStopGatherResponse;

ActionStopGatherResponse response = client.calls().actions().stopGather("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`client.calls().actions().addAiAssistantMessages()` — `POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `messages` | array[object] | No | The messages to add to the conversation. |

```java
import com.telnyx.sdk.models.calls.actions.ActionAddAiAssistantMessagesParams;
import com.telnyx.sdk.models.calls.actions.ActionAddAiAssistantMessagesResponse;

ActionAddAiAssistantMessagesResponse response = client.calls().actions().addAiAssistantMessages("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Start AI Assistant

Start an AI assistant on the call. **Expected Webhooks:**

- `call.conversation.ended`
- `call.conversation_insights.generated`

`client.calls().actions().startAiAssistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `assistant` | object | No | AI Assistant configuration |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionStartAiAssistantParams;
import com.telnyx.sdk.models.calls.actions.ActionStartAiAssistantResponse;

ActionStartAiAssistantResponse response = client.calls().actions().startAiAssistant("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.conversation_id, response.data.result`

## Stop AI Assistant

Stop an AI assistant on the call.

`client.calls().actions().stopAiAssistant()` — `POST /calls/{call_control_id}/actions/ai_assistant_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```java
import com.telnyx.sdk.models.calls.actions.ActionStopAiAssistantParams;
import com.telnyx.sdk.models.calls.actions.ActionStopAiAssistantResponse;

ActionStopAiAssistantResponse response = client.calls().actions().stopAiAssistant("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
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
| `CallAIGatherEnded` | `call.ai_gather.ended` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | `call.ai.gather.message.history.updated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | `call.ai.gather.partial.results` | Call AI Gather Partial Results |
| `callGatherEnded` | `call.gather.ended` | Call Gather Ended |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
