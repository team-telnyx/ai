---
name: telnyx-voice-python
description: >-
  Programmatic call control: make/receive calls, transfer, bridge, gather DTMF,
  stream audio. Real-time call events via webhooks.
metadata:
  author: telnyx
  product: voice
  language: python
  generated_by: telnyx-ext-skills-generator
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice - Python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    response = client.calls.dial(
        connection_id="7267xxxxxxxxxxxxxx",
        from_="+18005550101",
        to="+18005550100",
    )
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

## Operational Caveats

- Call Control is event-driven. After `dial()` or an inbound webhook, issue follow-up commands from webhook handlers using the `call_control_id` in the event payload.
- Outbound and inbound flows are different: outbound calls start with `dial()`, while inbound calls must be answered from the incoming webhook before other commands run.
- A publicly reachable webhook endpoint is required for real call control. Without it, calls may connect but your application cannot drive the live call state.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).
- Before reading or matching webhook fields beyond the inline examples, read [the webhook payload reference](references/api-details.md#webhook-payload-fields).

## Core Tasks

### Dial an outbound call

Primary voice entrypoint. Agents need the async call-control identifiers returned here.

`client.calls.dial()` — `POST /calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `from_` | string (E.164) | Yes | The `from` number to be used as the caller id presented to t... |
| `connection_id` | string (UUID) | Yes | The ID of the Call Control App (formerly ID of the connectio... |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `billing_group_id` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| ... | | | +48 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.dial(
    connection_id="7267xxxxxxxxxxxxxx",
    from_="+18005550101",
    to="+18005550100",
)
print(response.data)
```

Primary response fields:
- `response.data.call_control_id`
- `response.data.call_leg_id`
- `response.data.call_session_id`
- `response.data.is_alive`
- `response.data.recording_id`
- `response.data.call_duration`

### Answer an inbound call

Primary inbound call-control command.

`client.calls.actions.answer()` — `POST /calls/{call_control_id}/actions/answer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `billing_group_id` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `webhook_url` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +26 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.answer(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Primary response fields:
- `response.data.result`
- `response.data.recording_id`

### Transfer a live call

Common post-answer control path with downstream webhook implications.

`client.calls.actions.transfer()` — `POST /calls/{call_control_id}/actions/transfer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `webhook_url` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +33 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.transfer(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    to="+18005550100",
)
print(response.data)
```

Primary response fields:
- `response.data.result`

---

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```python
# In your webhook handler (e.g., Flask — use raw body, not parsed JSON):
@app.route("/webhooks", methods=["POST"])
def handle_webhook():
    payload = request.get_data(as_text=True)  # raw body as string
    headers = dict(request.headers)
    try:
        event = client.webhooks.unwrap(payload, headers=headers)
    except Exception as e:
        print(f"Webhook verification failed: {e}")
        return "Invalid signature", 400
    # Signature valid — event is the parsed webhook payload
    print(f"Received event: {event.data.event_type}")
    return "OK", 200
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

`client.calls.actions.hangup()` — `POST /calls/{call_control_id}/actions/hangup`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `custom_headers` | array[object] | No | Custom headers to be added to the SIP BYE message. |

```python
response = client.calls.actions.hangup(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Primary response fields:
- `response.data.result`

### Bridge calls

Trigger a follow-up action in an existing workflow rather than creating a new top-level resource.

`client.calls.actions.bridge()` — `POST /calls/{call_control_id}/actions/bridge`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | The Call Control ID of the call you want to bridge with, can... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `video_room_id` | string (UUID) | No | The ID of the video room you want to bridge with, can't be u... |
| ... | | | +16 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.calls.actions.bridge(
    call_control_id_to_bridge="call_control_id",
    call_control_id_to_bridge_with="v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg",
)
print(response.data)
```

Primary response fields:
- `response.data.result`

### Reject a call

Trigger a follow-up action in an existing workflow rather than creating a new top-level resource.

`client.calls.actions.reject()` — `POST /calls/{call_control_id}/actions/reject`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cause` | enum (CALL_REJECTED, USER_BUSY) | Yes | Cause for call rejection. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```python
response = client.calls.actions.reject(
    call_control_id="550e8400-e29b-41d4-a716-446655440000",
    cause="USER_BUSY",
)
print(response.data)
```

Primary response fields:
- `response.data.result`

### Retrieve a call status

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.calls.retrieve_status()` — `GET /calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```python
response = client.calls.retrieve_status(
    "call_control_id",
)
print(response.data)
```

Primary response fields:
- `response.data.call_control_id`
- `response.data.call_duration`
- `response.data.call_leg_id`
- `response.data.call_session_id`
- `response.data.client_state`
- `response.data.end_time`

### List all active calls for given connection

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.connections.list_active_calls()` — `GET /connections/{connection_id}/active_calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Telnyx connection id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.connections.list_active_calls(
    connection_id="1293384261075731461",
)
page = page.data[0]
print(page.call_control_id)
```

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `call_control_id`
- `call_duration`
- `call_leg_id`
- `call_session_id`
- `client_state`
- `record_type`

### List call control applications

Inspect available resources or choose an existing resource before mutating it.

`client.call_control_applications.list()` — `GET /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.call_control_applications.list()
page = page.data[0]
print(page.id)
```

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `id`
- `created_at`
- `updated_at`
- `active`
- `anchorsite_override`
- `application_name`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Create a call control application | `client.call_control_applications.create()` | `POST /call_control_applications` | Create or provision an additional resource when the core tasks do not cover this flow. | `application_name`, `webhook_event_url` |
| Retrieve a call control application | `client.call_control_applications.retrieve()` | `GET /call_control_applications/{id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `id` |
| Update a call control application | `client.call_control_applications.update()` | `PATCH /call_control_applications/{id}` | Modify an existing resource without recreating it. | `application_name`, `webhook_event_url`, `id` |
| Delete a call control application | `client.call_control_applications.delete()` | `DELETE /call_control_applications/{id}` | Remove, detach, or clean up an existing resource. | `id` |
| SIP Refer a call | `client.calls.actions.refer()` | `POST /calls/{call_control_id}/actions/refer` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `sip_address`, `call_control_id` |
| Send SIP info | `client.calls.actions.send_sip_info()` | `POST /calls/{call_control_id}/actions/send_sip_info` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `content_type`, `body`, `call_control_id` |

### Other Webhook Events

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `callBridged` | `call.bridged` | Call Bridged |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
