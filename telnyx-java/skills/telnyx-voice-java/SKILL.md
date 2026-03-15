---
name: telnyx-voice-java
description: >-
  Programmatic call control: make/receive calls, transfer, bridge, gather DTMF,
  stream audio. Real-time call events via webhooks.
metadata:
  author: telnyx
  product: voice
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice - Java

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-java)
2. Create a Voice API Application (connection) with webhook URLs
3. Assign the phone number to the Voice API Application
4. Ensure webhook endpoint is publicly accessible before making/receiving calls

### Steps

1. **Buy number**: `client.availablePhoneNumbers().list(params)`
2. **Create connection**: `client.connections().create(params)`
3. **Assign number**: `client.phoneNumbers().update(params)`
4. **Make outbound call**: `client.calls().create(params)`
5. **Handle webhooks**: `call.initiated → call.answered → send commands → call.hangup`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Full programmatic control, real-time event-driven logic, custom IVR | Call Control API (this skill) |
| Declarative XML call flows, migrating from Twilio/TwiML | TeXML (see telnyx-texml-java) |
| LLM-powered conversational voice agents, minimal code | AI Assistants (see telnyx-ai-assistants-java) |

### Common mistakes

- VOICE IS EVENT-DRIVEN: dial/create returns immediately. All subsequent actions (answer, play, gather, transfer, hangup) MUST be triggered by webhook events. You need a running webhook server that dispatches on data.event_type (e.g., 'call.initiated', 'call.answered', 'call.hangup') and issues call control commands using the call_control_id from the webhook payload
- OUTBOUND vs INBOUND: For outbound calls, dial → wait for 'call.answered' webhook → issue commands. For inbound calls, receive 'call.initiated' webhook → answer() → issue commands. NEVER call answer() on outbound calls
- NEVER make calls without a publicly accessible webhook URL — call events will be lost and calls uncontrollable
- NEVER skip assigning the number to a Voice API Application — inbound calls will be rejected

**Related skills**: telnyx-voice-media-java, telnyx-voice-gather-java, telnyx-voice-streaming-java, telnyx-texml-java, telnyx-ai-assistants-java

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
    var result = client.calls().dial(params);
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

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Dial

Dial a number or SIP URI from a given connection. A successful response will include a `call_leg_id` which can be used to correlate the command with subsequent webhooks.

`client.calls().dial()` — `POST /calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `from` | string (E.164) | Yes | The `from` number to be used as the caller id presented to t... |
| `connectionId` | string (UUID) | Yes | The ID of the Call Control App (formerly ID of the connectio... |
| `timeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `billingGroupId` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| ... | | | +48 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.CallDialParams;
import com.telnyx.sdk.models.calls.CallDialResponse;

CallDialParams params = CallDialParams.builder()
    .connectionId("7267xxxxxxxxxxxxxx")
    .from("+18005550101")
    .to("+18005550100")
    .build();
CallDialResponse response = client.calls().dial(params);
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## Answer call

Answer an incoming call. You must issue this command before executing subsequent commands on an incoming call. **Expected Webhooks:**

- `call.answered`
- `streaming.started`, `streaming.stopped` or `streaming.failed` if `stream_url` was set

When the `record` parameter is set to `record-from-answer`, the response will include a `recording_id` field.

`client.calls().actions().answer()` — `POST /calls/{call_control_id}/actions/answer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `billingGroupId` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `webhookUrl` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +26 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionAnswerParams;
import com.telnyx.sdk.models.calls.actions.ActionAnswerResponse;

ActionAnswerResponse response = client.calls().actions().answer("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.recording_id, response.data.result`

## Transfer call

Transfer a call to a new destination. If the transfer is unsuccessful, a `call.hangup` webhook for the other call (Leg B) will be sent indicating that the transfer could not be completed. The original call will remain active and may be issued additional commands, potentially transferring the call to an alternate destination.

`client.calls().actions().transfer()` — `POST /calls/{call_control_id}/actions/transfer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `timeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `webhookUrl` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +33 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionTransferParams;
import com.telnyx.sdk.models.calls.actions.ActionTransferResponse;

ActionTransferParams params = ActionTransferParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .to("+18005550100")
    .build();
ActionTransferResponse response = client.calls().actions().transfer(params);
```

Key response fields: `response.data.result`

## Hangup call

Hang up the call. **Expected Webhooks:**

- `call.hangup`
- `call.recording.saved`

`client.calls().actions().hangup()` — `POST /calls/{call_control_id}/actions/hangup`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `customHeaders` | array[object] | No | Custom headers to be added to the SIP BYE message. |

```java
import com.telnyx.sdk.models.calls.actions.ActionHangupParams;
import com.telnyx.sdk.models.calls.actions.ActionHangupResponse;

ActionHangupResponse response = client.calls().actions().hangup("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.result`

## Bridge calls

Bridge two call control calls. **Expected Webhooks:**

- `call.bridged` for Leg A
- `call.bridged` for Leg B

`client.calls().actions().bridge()` — `POST /calls/{call_control_id}/actions/bridge`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | The Call Control ID of the call you want to bridge with, can... |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `videoRoomId` | string (UUID) | No | The ID of the video room you want to bridge with, can't be u... |
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionBridgeParams;
import com.telnyx.sdk.models.calls.actions.ActionBridgeResponse;

ActionBridgeParams params = ActionBridgeParams.builder()
    .callControlIdToBridge("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .callControlId("v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg")
    .build();
ActionBridgeResponse response = client.calls().actions().bridge(params);
```

Key response fields: `response.data.result`

## Reject a call

Reject an incoming call. **Expected Webhooks:**

- `call.hangup`

`client.calls().actions().reject()` — `POST /calls/{call_control_id}/actions/reject`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cause` | enum (CALL_REJECTED, USER_BUSY) | Yes | Cause for call rejection. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```java
import com.telnyx.sdk.models.calls.actions.ActionRejectParams;
import com.telnyx.sdk.models.calls.actions.ActionRejectResponse;

ActionRejectParams params = ActionRejectParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .cause(ActionRejectParams.Cause.USER_BUSY)
    .build();
ActionRejectResponse response = client.calls().actions().reject(params);
```

Key response fields: `response.data.result`

## Retrieve a call status

Returns the status of a call (data is available 10 minutes after call ended).

`client.calls().retrieveStatus()` — `GET /calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```java
import com.telnyx.sdk.models.calls.CallRetrieveStatusParams;
import com.telnyx.sdk.models.calls.CallRetrieveStatusResponse;

CallRetrieveStatusResponse response = client.calls().retrieveStatus("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## List all active calls for given connection

Lists all active calls for given connection. Acceptable connections are either SIP connections with webhook_url or xml_request_url, call control or texml. Returned results are cursor paginated.

`client.connections().listActiveCalls()` — `GET /connections/{connection_id}/active_calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Telnyx connection id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.connections.ConnectionListActiveCallsPage;
import com.telnyx.sdk.models.connections.ConnectionListActiveCallsParams;

ConnectionListActiveCallsPage page = client.connections().listActiveCalls("1293384261075731461");
```

Key response fields: `response.data.call_control_id, response.data.call_duration, response.data.call_leg_id`

## List call control applications

Return a list of call control applications.

`client.callControlApplications().list()` — `GET /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationListPage;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationListParams;

CallControlApplicationListPage page = client.callControlApplications().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a call control application

Create a call control application.

`client.callControlApplications().create()` — `POST /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationName` | string | Yes | A user-assigned name to help manage the application. |
| `webhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| `webhookApiVersion` | enum (1, 2) | No | Determines which webhook format will be used, Telnyx API v1 ... |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationCreateParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationCreateResponse;

CallControlApplicationCreateParams params = CallControlApplicationCreateParams.builder()
    .applicationName("call-router")
    .webhookEventUrl("https://example.com")
    .build();
CallControlApplicationCreateResponse callControlApplication = client.callControlApplications().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a call control application

Retrieves the details of an existing call control application.

`client.callControlApplications().retrieve()` — `GET /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationRetrieveParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationRetrieveResponse;

CallControlApplicationRetrieveResponse callControlApplication = client.callControlApplications().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a call control application

Updates settings of an existing call control application.

`client.callControlApplications().update()` — `PATCH /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationName` | string | Yes | A user-assigned name to help manage the application. |
| `webhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags assigned to the Call Control Application. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationUpdateParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationUpdateResponse;

CallControlApplicationUpdateParams params = CallControlApplicationUpdateParams.builder()
    .id("1293384261075731499")
    .applicationName("call-router")
    .webhookEventUrl("https://example.com")
    .build();
CallControlApplicationUpdateResponse callControlApplication = client.callControlApplications().update(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a call control application

Deletes a call control application.

`client.callControlApplications().delete()` — `DELETE /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationDeleteParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationDeleteResponse;

CallControlApplicationDeleteResponse callControlApplication = client.callControlApplications().delete("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## SIP Refer a call

Initiate a SIP Refer on a Call Control call. You can initiate a SIP Refer at any point in the duration of a call. **Expected Webhooks:**

- `call.refer.started`
- `call.refer.completed`
- `call.refer.failed`

`client.calls().actions().refer()` — `POST /calls/{call_control_id}/actions/refer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sipAddress` | string | Yes | The SIP URI to which the call will be referred to. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `customHeaders` | array[object] | No | Custom headers to be added to the SIP INVITE. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.calls.actions.ActionReferParams;
import com.telnyx.sdk.models.calls.actions.ActionReferResponse;

ActionReferParams params = ActionReferParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .sipAddress("sip:username@sip.non-telnyx-address.com")
    .build();
ActionReferResponse response = client.calls().actions().refer(params);
```

Key response fields: `response.data.result`

## Send SIP info

Sends SIP info from this leg. **Expected Webhooks:**

- `call.sip_info.received` (to be received on the target call leg)

`client.calls().actions().sendSipInfo()` — `POST /calls/{call_control_id}/actions/send_sip_info`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contentType` | string | Yes | Content type of the INFO body. |
| `body` | string | Yes | Content of the SIP INFO |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```java
import com.telnyx.sdk.models.calls.actions.ActionSendSipInfoParams;
import com.telnyx.sdk.models.calls.actions.ActionSendSipInfoResponse;

ActionSendSipInfoParams params = ActionSendSipInfoParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .sipInfoBody("{\"key\": \"value\", \"numValue\": 100}")
    .contentType("application/json")
    .build();
ActionSendSipInfoResponse response = client.calls().actions().sendSipInfo(params);
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
| `callAnswered` | `call.answered` | Call Answered |
| `callBridged` | `call.bridged` | Call Bridged |
| `callHangup` | `call.hangup` | Call Hangup |
| `callInitiated` | `call.initiated` | Call Initiated |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
