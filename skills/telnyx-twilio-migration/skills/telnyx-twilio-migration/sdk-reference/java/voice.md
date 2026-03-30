<!-- SDK reference: telnyx-voice-java -->

# Telnyx Voice - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.36.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.36.0")
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
import com.telnyx.sdk.models.calls.CallDialParams;
import com.telnyx.sdk.models.calls.CallDialResponse;
CallDialParams params = CallDialParams.builder()
    .connectionId("7267xxxxxxxxxxxxxx")
    .from("+18005550101")
    .to("+18005550100")
    .build();
CallDialResponse response = client.calls().dial(params);
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

## Operational Caveats

- Call Control is event-driven. After `dial()` or an inbound webhook, issue follow-up commands from webhook handlers using the `call_control_id` in the event payload.
- Outbound and inbound flows are different: outbound calls start with `dial()`, while inbound calls must be answered from the incoming webhook before other commands run.
- A publicly reachable webhook endpoint is required for real call control. Without it, calls may connect but your application cannot drive the live call state.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Dial an outbound call

Primary voice entrypoint. Agents need the async call-control identifiers returned here.

`client.calls().dial()` — `POST /calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `from` | string (E.164) | Yes | The `from` number to be used as the caller id presented to t... |
| `connectionId` | string (UUID) | Yes | The ID of the Call Control App (formerly ID of the connectio... |
| `timeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `billingGroupId` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| ... | | | +48 optional params in the API Details section below |

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

Primary response fields:
- `response.data.callControlId`
- `response.data.callLegId`
- `response.data.callSessionId`
- `response.data.isAlive`
- `response.data.recordingId`
- `response.data.callDuration`

### Answer an inbound call

Primary inbound call-control command.

`client.calls().actions().answer()` — `POST /calls/{call_control_id}/actions/answer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `billingGroupId` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `webhookUrl` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +26 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.calls.actions.ActionAnswerParams;
import com.telnyx.sdk.models.calls.actions.ActionAnswerResponse;

ActionAnswerResponse response = client.calls().actions().answer("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Primary response fields:
- `response.data.result`
- `response.data.recordingId`

### Transfer a live call

Common post-answer control path with downstream webhook implications.

`client.calls().actions().transfer()` — `POST /calls/{call_control_id}/actions/transfer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `timeoutSecs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `webhookUrl` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +33 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.calls.actions.ActionTransferParams;
import com.telnyx.sdk.models.calls.actions.ActionTransferResponse;

ActionTransferParams params = ActionTransferParams.builder()
    .callControlId("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .to("+18005550100")
    .build();
ActionTransferResponse response = client.calls().actions().transfer(params);
```

Primary response fields:
- `response.data.result`

---

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

## Webhooks

These webhook payload fields are inline because they are part of the primary integration path.

### Call Answered

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.answered | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook ev... |

### Call Hangup

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.hangup | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook ev... |

### Call Initiated

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.initiated | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.connection_codecs` | string | The list of comma-separated codecs enabled for the connection. |
| `data.payload.offered_codecs` | string | The list of comma-separated codecs offered by caller. |

If you need webhook fields that are not listed inline here, read [the webhook payload reference](references/api-details.md#webhook-payload-fields) before writing the handler.

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Hangup call

End a live call from your webhook-driven control flow.

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

Primary response fields:
- `response.data.result`

### Bridge calls

Trigger a follow-up action in an existing workflow rather than creating a new top-level resource.

`client.calls().actions().bridge()` — `POST /calls/{call_control_id}/actions/bridge`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | The Call Control ID of the call you want to bridge with, can... |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `videoRoomId` | string (UUID) | No | The ID of the video room you want to bridge with, can't be u... |
| ... | | | +16 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.calls.actions.ActionBridgeParams;
import com.telnyx.sdk.models.calls.actions.ActionBridgeResponse;

ActionBridgeParams params = ActionBridgeParams.builder()
    .callControlIdToBridge("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ")
    .callControlId("v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg")
    .build();
ActionBridgeResponse response = client.calls().actions().bridge(params);
```

Primary response fields:
- `response.data.result`

### Reject a call

Trigger a follow-up action in an existing workflow rather than creating a new top-level resource.

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

Primary response fields:
- `response.data.result`

### Retrieve a call status

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.calls().retrieveStatus()` — `GET /calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```java
import com.telnyx.sdk.models.calls.CallRetrieveStatusParams;
import com.telnyx.sdk.models.calls.CallRetrieveStatusResponse;

CallRetrieveStatusResponse response = client.calls().retrieveStatus("v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ");
```

Primary response fields:
- `response.data.callControlId`
- `response.data.callDuration`
- `response.data.callLegId`
- `response.data.callSessionId`
- `response.data.clientState`
- `response.data.endTime`

### List all active calls for given connection

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `callControlId`
- `callDuration`
- `callLegId`
- `callSessionId`
- `clientState`
- `recordType`

### List call control applications

Inspect available resources or choose an existing resource before mutating it.

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

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `id`
- `createdAt`
- `updatedAt`
- `active`
- `anchorsiteOverride`
- `applicationName`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a call control application | `client.callControlApplications().create()` | `POST /call_control_applications` | Create or provision an additional resource when the core tasks do not cover this flow. | `applicationName`, `webhookEventUrl` |
| Retrieve a call control application | `client.callControlApplications().retrieve()` | `GET /call_control_applications/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Update a call control application | `client.callControlApplications().update()` | `PATCH /call_control_applications/{id}` | Modify an existing resource without recreating it. | `applicationName`, `webhookEventUrl`, `id` |
| Delete a call control application | `client.callControlApplications().delete()` | `DELETE /call_control_applications/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| SIP Refer a call | `client.calls().actions().refer()` | `POST /calls/{call_control_id}/actions/refer` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `sipAddress`, `callControlId` |
| Send SIP info | `client.calls().actions().sendSipInfo()` | `POST /calls/{call_control_id}/actions/send_sip_info` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `contentType`, `body`, `callControlId` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `callBridged` | `call.bridged` | Call Bridged |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
