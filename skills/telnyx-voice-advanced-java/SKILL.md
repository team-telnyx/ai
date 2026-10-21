---
name: telnyx-voice-advanced-java
description: >-
  Advanced call control features including DTMF sending, SIPREC recording, noise
  suppression, client state, and supervisor controls. This skill provides Java
  SDK examples.
metadata:
  author: telnyx
  product: voice-advanced
  language: java
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Advanced - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.95.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.95.0")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

// fromEnv() reads TELNYX_API_KEY and TELNYX_PUBLIC_KEY (the public key is required for
// client.webhooks().unwrap() — webhook verification)
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
        // Rate limited — wait, then retry the request (bounded exponential backoff)
        Thread.sleep(1000);
        // ...retry the call here (give up after a few attempts)
    }
    throw e; // Re-throw: a failed request must never look like success to the caller
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Join AI Assistant Conversation

Add a participant to an existing AI assistant conversation. Use this command to bring an additional call leg into a running AI conversation.

`POST /calls/{call_control_id}/actions/ai_assistant_join` — Required: `conversation_id`, `participant`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionJoinAiAssistantParams;
import com.telnyx.sdk.models.calls.actions.ActionJoinAiAssistantResponse;

ActionJoinAiAssistantParams params = ActionJoinAiAssistantParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .conversationId("v3:abc123")
    .participant(ActionJoinAiAssistantParams.Participant.builder()
        .id("v3:abc123def456")
        .role(ActionJoinAiAssistantParams.Participant.Role.USER)
        .build())
    .build();
ActionJoinAiAssistantResponse response = client.calls().actions().joinAiAssistant(params);
```

Returns: `conversation_id` (uuid), `result` (string)

## Update client state

Updates the client state associated with the call. Client state is an opaque value echoed back in subsequent webhooks for the call, letting you correlate events with your application's state.

`PUT /calls/{call_control_id}/actions/client_state_update` — Required: `client_state`

```java
import com.telnyx.sdk.models.calls.actions.ActionUpdateClientStateParams;
import com.telnyx.sdk.models.calls.actions.ActionUpdateClientStateResponse;

ActionUpdateClientStateParams params = ActionUpdateClientStateParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .clientState("aGF2ZSBhIG5pY2UgZGF5ID1d")
    .build();
ActionUpdateClientStateResponse response = client.calls().actions().updateClientState(params);
```

Returns: `result` (string)

## Start Conversation Relay

Start a Conversation Relay session on an active call. Conversation Relay connects the call audio to your WebSocket so your application can exchange realtime messages with the caller while Telnyx handles speech recognition and text-to-speech. Only one AI Assistant or Conversation Relay session can be active on a call at a time.

`POST /calls/{call_control_id}/actions/conversation_relay_start`

Optional: `assistant` (object), `client_state` (string), `command_id` (string), `conversation_relay_dtmf_detection` (boolean), `conversation_relay_settings` (object), `conversation_relay_url` (string), `custom_parameters` (object), `dtmf_detection` (boolean), `greeting` (string), `interruptible` (enum: none, any, speech, dtmf), `interruptible_greeting` (enum: none, any, speech, dtmf), `interruption_settings` (object), `language` (string), `languages` (array[object]), `provider` (string), `structured_provider` (object), `transcription` (object), `transcription_engine` (enum: Google, Telnyx, Deepgram, Azure, xAI, AssemblyAI, Speechmatics, Soniox, A, B), `transcription_engine_config` (object), `tts_provider` (string), `url` (string), `voice` (string), `voice_settings` (object)

```java
import com.telnyx.sdk.models.calls.actions.ActionStartConversationRelayParams;
import com.telnyx.sdk.models.calls.actions.ActionStartConversationRelayResponse;

ActionStartConversationRelayResponse response = client.calls().actions().startConversationRelay("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Returns: `conversation_relay_id` (string), `result` (string)

## Stop Conversation Relay

Stop the active Conversation Relay session on a call.

`POST /calls/{call_control_id}/actions/conversation_relay_stop`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionStopConversationRelayParams;
import com.telnyx.sdk.models.calls.actions.ActionStopConversationRelayResponse;

ActionStopConversationRelayResponse response = client.calls().actions().stopConversationRelay("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Returns: `result` (string)

## Process a payment

Collect payment details from the caller using DTMF and either charge or tokenize the payment method through a configured Pay connector. Pay pauses active call recordings while sensitive payment details are collected. When `payment_token` is supplied, the DTMF collection steps are skipped and the existing token is sent to the connector.

`POST /calls/{call_control_id}/actions/pay`

Optional: `amount` (number), `client_state` (string), `command_id` (string), `connector_name` (string), `currency` (enum: USD, usd), `description` (string), `inter_digit_timeout_millis` (int32), `language` (string), `max_attempts` (int32), `metadata` (object), `min_postal_code_length` (integer), `parameters` (object), `payment_method` (enum: credit-card, ach-debit), `payment_token` (string), `postal_code` (object), `prompts` (object), `service_level` (string), `timeout_millis` (int32), `transaction_type` (enum: charge, tokenize), `valid_card_types` (array[string]), `voice` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionPayParams;

ActionPayParams params = ActionPayParams.builder()
    .connectorName("Default")
    .build();
var response = client.calls().actions().pay("call_control_id", params);
```

Returns: `result` (string)

## Send DTMF

Sends DTMF tones from this leg. DTMF tones will be heard by the other end of the call. **Expected Webhooks:**

There are no webhooks associated with this command.

`POST /calls/{call_control_id}/actions/send_dtmf` — Required: `digits`

Optional: `client_state` (string), `command_id` (string), `duration_millis` (int32)

```java
import com.telnyx.sdk.models.calls.actions.ActionSendDtmfParams;
import com.telnyx.sdk.models.calls.actions.ActionSendDtmfResponse;

ActionSendDtmfParams params = ActionSendDtmfParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .digits("1www2WABCDw9")
    .build();
ActionSendDtmfResponse response = client.calls().actions().sendDtmf(params);
```

Returns: `result` (string)

## SIPREC start

Start siprec session to configured in SIPREC connector SRS. 

**Expected Webhooks:**

- `siprec.started`
- `siprec.stopped`
- `siprec.failed`

`POST /calls/{call_control_id}/actions/siprec_start`

Optional: `client_state` (string), `connector_name` (string), `include_metadata_custom_headers` (boolean), `secure` (boolean), `session_timeout_secs` (integer), `sip_transport` (enum: udp, tcp, tls), `siprec_track` (enum: inbound_track, outbound_track, both_tracks)

```java
import com.telnyx.sdk.models.calls.actions.ActionStartSiprecParams;
import com.telnyx.sdk.models.calls.actions.ActionStartSiprecResponse;

ActionStartSiprecResponse response = client.calls().actions().startSiprec("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Returns: `result` (string)

## SIPREC stop

Stop SIPREC session. **Expected Webhooks:**

- `siprec.stopped`

`POST /calls/{call_control_id}/actions/siprec_stop`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionStopSiprecParams;
import com.telnyx.sdk.models.calls.actions.ActionStopSiprecResponse;

ActionStopSiprecResponse response = client.calls().actions().stopSiprec("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Returns: `result` (string)

## Noise Suppression Start (BETA)

Start noise suppression on an active call to reduce background noise. This feature is currently in beta.

`POST /calls/{call_control_id}/actions/suppression_start`

Optional: `client_state` (string), `command_id` (string), `direction` (enum: inbound, outbound, both), `noise_suppression_engine` (enum: Denoiser, DeepFilterNet, Krisp, AiCoustics, aic_l_quail, aic_l_rook, aic_s_quail, aic_s_rook, quail_voice_focus_s, quail_voice_focus_xs), `noise_suppression_engine_config` (object)

```java
import com.telnyx.sdk.models.calls.actions.ActionStartNoiseSuppressionParams;
import com.telnyx.sdk.models.calls.actions.ActionStartNoiseSuppressionResponse;

ActionStartNoiseSuppressionResponse response = client.calls().actions().startNoiseSuppression("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Returns: `result` (string)

## Noise Suppression Stop (BETA)

Stop noise suppression previously started on an active call. This feature is currently in beta.

`POST /calls/{call_control_id}/actions/suppression_stop`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionStopNoiseSuppressionParams;
import com.telnyx.sdk.models.calls.actions.ActionStopNoiseSuppressionResponse;

ActionStopNoiseSuppressionResponse response = client.calls().actions().stopNoiseSuppression("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Returns: `result` (string)

## Switch supervisor role

Switch the supervisor role for a bridged call. This allows switching between different supervisor modes during an active call

`POST /calls/{call_control_id}/actions/switch_supervisor_role` — Required: `role`

```java
import com.telnyx.sdk.models.calls.actions.ActionSwitchSupervisorRoleParams;
import com.telnyx.sdk.models.calls.actions.ActionSwitchSupervisorRoleResponse;

ActionSwitchSupervisorRoleParams params = ActionSwitchSupervisorRoleParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .role(ActionSwitchSupervisorRoleParams.Role.BARGE)
    .build();
ActionSwitchSupervisorRoleResponse response = client.calls().actions().switchSupervisorRole(params);
```

Returns: `result` (string)

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

Verification needs your account's **public key** (Mission Control Portal → API Keys → Public Key).
The SDK reads it from `TELNYX_PUBLIC_KEY` (the `## Setup` block above passes it explicitly);
without it every valid webhook fails verification and the handler below returns 400.

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
| `callConversationCreated` | Call Conversation Created. Emitted when a conversation is created for a call, including when an AI assistant starts automatically after an `answer` command with `assistant.id` or a `dial` command with `assistant.id`, or through `ai_assistant_start` or `gather_using_ai`. Read `data.payload.conversation_id` and correlate it with `data.payload.call_control_id` |
| `callConversationEnded` | Call Conversation Ended |
| `callConversationInsightsGenerated` | Call Conversation Insights Generated |
| `callConversationStartFailed` | Call Conversation Start Failed. Emitted when an AI assistant requested with an `answer` or `dial` command (`assistant.id`) could not be started after the call was answered, for example because the assistant ID does not exist. No conversation is created, so neither `call.conversation.created` nor `call.conversation.ended` is sent for this attempt |
| `callDtmfReceived` | Call Dtmf Received |
| `callMachineDetectionEnded` | Call Machine Detection Ended |
| `callMachineGreetingEnded` | Call Machine Greeting Ended |
| `callMachinePremiumCallScreeningDetected` | Call Machine Premium Call Screening Detected. This webhook is sent when `answering_machine_detection=premium_ios_call_screening_detection` detects an Apple Call Screening tone. Premium AMD is then restarted on the screened call; expect another `call.machine.premium.detection.ended` webhook with the post-screening classification |
| `callMachinePremiumDetectionEnded` | Call Machine Premium Detection Ended |
| `callMachinePremiumDetectionStarted` | Call Machine Premium Detection Started |
| `callMachinePremiumGreetingEnded` | Call Machine Premium Greeting Ended |
| `callReferCompleted` | Call Refer Completed |
| `callReferFailed` | Call Refer Failed |
| `callReferStarted` | Call Refer Started |
| `callSiprecFailed` | Call Siprec Failed |
| `callSiprecStarted` | Call Siprec Started |
| `callSiprecStopped` | Call Siprec Stopped |

### Webhook payload fields

**`callConversationCreated`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.conversation.created | The type of event being delivered. |
| `data.id` | uuid | Unique identifier for the event. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.created_at` | date-time | Timestamp when the event was created in the system. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.call_leg_id` | string | ID that is unique to the call leg. |
| `data.payload.call_session_id` | string | ID that is unique to the call session (group of related call legs). |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | Base64-encoded state received from a command. |
| `data.payload.conversation_id` | uuid | Unique identifier of the conversation created for this call. |
| `data.payload.from` | string | The caller's number or identifier. |
| `data.payload.to` | string | The callee's number or SIP address. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |

**`callConversationEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.conversation.ended | The type of event being delivered. |
| `data.id` | uuid | Unique identifier for the event. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.created_at` | date-time | Timestamp when the event was created in the system. |
| `data.payload.assistant_id` | string | Unique identifier of the assistant involved in the call. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call leg. |
| `data.payload.call_session_id` | string | ID that is unique to the call session (group of related call legs). |
| `data.payload.client_state` | string | Base64-encoded state received from a command. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.conversation_id` | string | ID unique to the conversation or insight group generated for the call. |
| `data.payload.duration_sec` | integer | Duration of the conversation in seconds. |
| `data.payload.reason` | string \| null | Reason the conversation ended. |
| `data.payload.messages` | array[object] | The conversation transcript, in order. |
| `data.payload.from` | string | The caller's number or identifier. |
| `data.payload.to` | string | The callee's number or SIP address. |
| `data.payload.llm_model` | string | The large language model used during the conversation. |
| `data.payload.stt_model` | string | The speech-to-text model used in the conversation. |
| `data.payload.tts_provider` | string | The text-to-speech provider used in the call. |
| `data.payload.tts_model_id` | string | The model ID used for text-to-speech synthesis. |
| `data.payload.tts_voice_id` | string | Voice ID used for TTS. |

**`callConversationInsightsGenerated`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.conversation_insights.generated | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.insight_group_id` | string | ID that is unique to the insight group being generated for the call. |
| `data.payload.results` | array[object] | Array of insight results being generated for the call. |

**`callConversationStartFailed`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.conversation.start_failed | The type of event being delivered. |
| `data.id` | uuid | Unique identifier for the event. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.created_at` | date-time | Timestamp when the event was created in the system. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.call_leg_id` | string | ID that is unique to the call leg. |
| `data.payload.call_session_id` | string | ID that is unique to the call session (group of related call legs). |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | Base64-encoded state received from a command. |
| `data.payload.from` | string | The caller's number or identifier. |
| `data.payload.to` | string | The callee's number or SIP address. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.assistant_id` | string | Identifier of the AI assistant that failed to start. |
| `data.payload.reason` | enum: invalid_request, service_error | Why the conversation could not be started. |

**`callDtmfReceived`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.dtmf.received | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Identifies the type of resource. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.digit` | string | The received DTMF digit or symbol. |

**`callMachineDetectionEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.detection.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: human, machine, not_sure | Answering machine detection result. |

**`callMachineGreetingEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.greeting.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: beep_detected, ended, not_sure | Answering machine greeting ended result. |

**`callMachinePremiumCallScreeningDetected`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.premium.call_screening.detected | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: screening | Apple Call Screening detection result. |

**`callMachinePremiumDetectionEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.premium.detection.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: human_residence, human_business, machine, silence, fax_detected, not_sure | Premium Answering Machine Detection result. |

**`callMachinePremiumDetectionStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.premium.detection.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

**`callMachinePremiumGreetingEnded`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.machine.premium.greeting.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.result` | enum: beep_detected, no_beep_detected, prompt_ended | Premium Answering Machine Greeting Ended result. |

**`callReferCompleted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.refer.completed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.sip_notify_response` | integer | SIP NOTIFY event status for tracking the REFER attempt. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

**`callReferFailed`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.refer.failed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.sip_notify_response` | integer | SIP NOTIFY event status for tracking the REFER attempt. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

**`callReferStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.refer.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Unique ID for controlling the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.sip_notify_response` | integer | SIP NOTIFY event status for tracking the REFER attempt. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

**`callSiprecFailed`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the resource. |
| `data.event_type` | enum: siprec.failed | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.failure_cause` | string | Q850 reason why siprec session failed. |

**`callSiprecStarted`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: siprec.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |

**`callSiprecStopped`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: siprec.stopped | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.hangup_cause` | string | Q850 reason why the SIPREC session was stopped. |
