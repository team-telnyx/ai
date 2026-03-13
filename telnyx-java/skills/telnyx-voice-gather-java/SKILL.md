---
name: telnyx-voice-gather-java
description: >-
  Collect DTMF input and speech from callers using standard gather or AI-powered
  gather. Build interactive voice menus and AI voice assistants. This skill
  provides Java SDK examples.
metadata:
  internal: true
  author: telnyx
  product: voice-gather
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Gather - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>6.26.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:6.26.0")
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
    var result = client.messages().send(params);
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

## Add messages to AI Assistant

Add messages to the conversation started by an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_add_messages`

Optional: `client_state` (string), `command_id` (string), `messages` (array[object])

```java
import com.telnyx.sdk.models.calls.actions.ActionAddAiAssistantMessagesParams;
import com.telnyx.sdk.models.calls.actions.ActionAddAiAssistantMessagesResponse;

ActionAddAiAssistantMessagesResponse response = client.calls().actions().addAiAssistantMessages("call_control_id");
```

Returns: `result` (string)

## Start AI Assistant

Start an AI assistant on the call. **Expected Webhooks:**

- `call.conversation.ended`
- `call.conversation_insights.generated`

`POST /calls/{call_control_id}/actions/ai_assistant_start`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `greeting` (string), `interruption_settings` (object), `transcription` (object), `voice` (string), `voice_settings` (object)

```java
import com.telnyx.sdk.models.calls.actions.ActionStartAiAssistantParams;
import com.telnyx.sdk.models.calls.actions.ActionStartAiAssistantResponse;

ActionStartAiAssistantResponse response = client.calls().actions().startAiAssistant("call_control_id");
```

Returns: `conversation_id` (uuid), `result` (string)

## Stop AI Assistant

Stop an AI assistant on the call.

`POST /calls/{call_control_id}/actions/ai_assistant_stop`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionStopAiAssistantParams;
import com.telnyx.sdk.models.calls.actions.ActionStopAiAssistantResponse;

ActionStopAiAssistantResponse response = client.calls().actions().stopAiAssistant("call_control_id");
```

Returns: `result` (string)

## Gather

Gather DTMF signals to build interactive menus. You can pass a list of valid digits. The `Answer` command must be issued before the `gather` command.

`POST /calls/{call_control_id}/actions/gather`

Optional: `client_state` (string), `command_id` (string), `gather_id` (string), `initial_timeout_millis` (int32), `inter_digit_timeout_millis` (int32), `maximum_digits` (int32), `minimum_digits` (int32), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionGatherParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherResponse;

ActionGatherResponse response = client.calls().actions().gather("call_control_id");
```

Returns: `result` (string)

## Gather stop

Stop current gather. **Expected Webhooks:**

- `call.gather.ended`

`POST /calls/{call_control_id}/actions/gather_stop`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionStopGatherParams;
import com.telnyx.sdk.models.calls.actions.ActionStopGatherResponse;

ActionStopGatherResponse response = client.calls().actions().stopGather("call_control_id");
```

Returns: `result` (string)

## Gather using AI

Gather parameters defined in the request payload using a voice assistant. You can pass parameters described as a JSON Schema object and the voice assistant will attempt to gather these informations.

`POST /calls/{call_control_id}/actions/gather_using_ai` — Required: `parameters`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `gather_ended_speech` (string), `greeting` (string), `interruption_settings` (object), `language` (object), `message_history` (array[object]), `send_message_history_updates` (boolean), `send_partial_results` (boolean), `transcription` (object), `user_response_timeout_ms` (integer), `voice` (string), `voice_settings` (object)

```java
import com.telnyx.sdk.core.JsonValue;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAiParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAiResponse;

ActionGatherUsingAiParams params = ActionGatherUsingAiParams.builder()
    .callControlId("call_control_id")
    .parameters(ActionGatherUsingAiParams.Parameters.builder()
        .putAdditionalProperty("properties", JsonValue.from("bar"))
        .putAdditionalProperty("required", JsonValue.from("bar"))
        .putAdditionalProperty("type", JsonValue.from("bar"))
        .build())
    .build();
ActionGatherUsingAiResponse response = client.calls().actions().gatherUsingAi(params);
```

Returns: `conversation_id` (uuid), `result` (string)

## Gather using audio

Play an audio file on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_audio_url', which will be played back at the beginning of each prompt. Playback will be interrupted when a DTMF signal is received.

`POST /calls/{call_control_id}/actions/gather_using_audio`

Optional: `audio_url` (string), `client_state` (string), `command_id` (string), `inter_digit_timeout_millis` (int32), `invalid_audio_url` (string), `invalid_media_name` (string), `maximum_digits` (int32), `maximum_tries` (int32), `media_name` (string), `minimum_digits` (int32), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAudioParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingAudioResponse;

ActionGatherUsingAudioResponse response = client.calls().actions().gatherUsingAudio("call_control_id");
```

Returns: `result` (string)

## Gather using speak

Convert text to speech and play it on the call until the required DTMF signals are gathered to build interactive menus. You can pass a list of valid digits along with an 'invalid_payload', which will be played back at the beginning of each prompt. Speech will be interrupted when a DTMF signal is received.

`POST /calls/{call_control_id}/actions/gather_using_speak` — Required: `voice`, `payload`

Optional: `client_state` (string), `command_id` (string), `inter_digit_timeout_millis` (int32), `invalid_payload` (string), `language` (enum: arb, cmn-CN, cy-GB, da-DK, de-DE, en-AU, en-GB, en-GB-WLS, en-IN, en-US, es-ES, es-MX, es-US, fr-CA, fr-FR, hi-IN, is-IS, it-IT, ja-JP, ko-KR, nb-NO, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, tr-TR), `maximum_digits` (int32), `maximum_tries` (int32), `minimum_digits` (int32), `payload_type` (enum: text, ssml), `service_level` (enum: basic, premium), `terminating_digit` (string), `timeout_millis` (int32), `valid_digits` (string), `voice_settings` (object)

```java
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingSpeakParams;
import com.telnyx.sdk.models.calls.actions.ActionGatherUsingSpeakResponse;

ActionGatherUsingSpeakParams params = ActionGatherUsingSpeakParams.builder()
    .callControlId("call_control_id")
    .payload("say this on call")
    .voice("male")
    .build();
ActionGatherUsingSpeakResponse response = client.calls().actions().gatherUsingSpeak(params);
```

Returns: `result` (string)

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

| Event | Description |
|-------|-------------|
| `CallAIGatherEnded` | Call AI Gather Ended |
| `CallAIGatherMessageHistoryUpdated` | Call AI Gather Message History Updated |
| `CallAIGatherPartialResults` | Call AI Gather Partial Results |
| `callGatherEnded` | Call Gather Ended |

### Webhook payload fields

**`CallAIGatherEnded`**

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

**`CallAIGatherMessageHistoryUpdated`**

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

**`CallAIGatherPartialResults`**

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

**`callGatherEnded`**

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
