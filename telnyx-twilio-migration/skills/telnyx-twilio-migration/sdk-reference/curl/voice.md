<!-- SDK reference: telnyx-voice-curl -->

# Telnyx Voice - curl

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-curl)
2. Create a Voice API Application (connection) with webhook URLs
3. Assign the phone number to the Voice API Application
4. Ensure webhook endpoint is publicly accessible before making/receiving calls

### Steps

1. **Buy number**
2. **Create connection**
3. **Assign number**
4. **Make outbound call**
5. **Handle webhooks**

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Full programmatic control, real-time event-driven logic, custom IVR | Call Control API (this skill) |
| Declarative XML call flows, migrating from Twilio/TwiML | TeXML (see telnyx-texml-curl) |
| LLM-powered conversational voice agents, minimal code | AI Assistants (see telnyx-ai-assistants-curl) |

### Common mistakes

- VOICE IS EVENT-DRIVEN: dial/create returns immediately. All subsequent actions (answer, play, gather, transfer, hangup) MUST be triggered by webhook events. You need a running webhook server that dispatches on data.event_type (e.g., 'call.initiated', 'call.answered', 'call.hangup') and issues call control commands using the call_control_id from the webhook payload
- OUTBOUND vs INBOUND: For outbound calls, dial → wait for 'call.answered' webhook → issue commands. For inbound calls, receive 'call.initiated' webhook → answer() → issue commands. NEVER call answer() on outbound calls
- NEVER make calls without a publicly accessible webhook URL — call events will be lost and calls uncontrollable
- NEVER skip assigning the number to a Voice API Application — inbound calls will be rejected

**Related skills**: telnyx-voice-media-curl, telnyx-voice-gather-curl, telnyx-voice-streaming-curl, telnyx-texml-curl, telnyx-ai-assistants-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Dial

Dial a number or SIP URI from a given connection. A successful response will include a `call_leg_id` which can be used to correlate the command with subsequent webhooks.

`POST /calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `from` | string (E.164) | Yes | The `from` number to be used as the caller id presented to t... |
| `connection_id` | string (UUID) | Yes | The ID of the Call Control App (formerly ID of the connectio... |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `billing_group_id` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| ... | | | +48 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "to": "+13125550001",
  "from": "+18005550101",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/calls"
```

Key response fields: `.data.call_control_id, .data.call_duration, .data.call_leg_id`

## Answer call

Answer an incoming call. You must issue this command before executing subsequent commands on an incoming call. **Expected Webhooks:**

- `call.answered`
- `streaming.started`, `streaming.stopped` or `streaming.failed` if `stream_url` was set

When the `record` parameter is set to `record-from-answer`, the response will include a `recording_id` field.

`POST /calls/{call_control_id}/actions/answer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `billing_group_id` | string (UUID) | No | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `webhook_url` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +26 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/answer"
```

Key response fields: `.data.recording_id, .data.result`

## Transfer call

Transfer a call to a new destination. If the transfer is unsuccessful, a `call.hangup` webhook for the other call (Leg B) will be sent indicating that the transfer could not be completed. The original call will remain active and may be issued additional commands, potentially transferring the call to an alternate destination.

`POST /calls/{call_control_id}/actions/transfer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | The DID or SIP URI to dial out to. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `timeout_secs` | integer | No | The number of seconds that Telnyx will wait for the call to ... |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `webhook_url` | string (URL) | No | Use this field to override the URL for which Telnyx will sen... |
| ... | | | +33 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "to": "+18005550100"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/transfer"
```

Key response fields: `.data.result`

## Hangup call

Hang up the call. **Expected Webhooks:**

- `call.hangup`
- `call.recording.saved`

`POST /calls/{call_control_id}/actions/hangup`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `custom_headers` | array[object] | No | Custom headers to be added to the SIP BYE message. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/hangup"
```

Key response fields: `.data.result`

## Bridge calls

Bridge two call control calls. **Expected Webhooks:**

- `call.bridged` for Leg A
- `call.bridged` for Leg B

`POST /calls/{call_control_id}/actions/bridge`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | The Call Control ID of the call you want to bridge with, can... |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `video_room_id` | string (UUID) | No | The ID of the video room you want to bridge with, can't be u... |
| ... | | | +16 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_id": "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/bridge"
```

Key response fields: `.data.result`

## Reject a call

Reject an incoming call. **Expected Webhooks:**

- `call.hangup`

`POST /calls/{call_control_id}/actions/reject`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cause` | enum (CALL_REJECTED, USER_BUSY) | Yes | Cause for call rejection. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "cause": "USER_BUSY"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/reject"
```

Key response fields: `.data.result`

## Retrieve a call status

Returns the status of a call (data is available 10 minutes after call ended).

`GET /calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ"
```

Key response fields: `.data.call_control_id, .data.call_duration, .data.call_leg_id`

## List all active calls for given connection

Lists all active calls for given connection. Acceptable connections are either SIP connections with webhook_url or xml_request_url, call control or texml. Returned results are cursor paginated.

`GET /connections/{connection_id}/active_calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Telnyx connection id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/connections/1293384261075731461/active_calls"
```

Key response fields: `.data.call_control_id, .data.call_duration, .data.call_leg_id`

## List call control applications

Return a list of call control applications.

`GET /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/call_control_applications?sort=connection_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a call control application

Create a call control application.

`POST /call_control_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| `webhook_api_version` | enum (1, 2) | No | Determines which webhook format will be used, Telnyx API v1 ... |
| ... | | | +9 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "application_name": "call-router",
  "webhook_event_url": "https://example.com"
}' \
  "https://api.telnyx.com/v2/call_control_applications"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a call control application

Retrieves the details of an existing call control application.

`GET /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/call_control_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a call control application

Updates settings of an existing call control application.

`PATCH /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags assigned to the Call Control Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "application_name": "call-router",
  "webhook_event_url": "https://example.com"
}' \
  "https://api.telnyx.com/v2/call_control_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete a call control application

Deletes a call control application.

`DELETE /call_control_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/call_control_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## SIP Refer a call

Initiate a SIP Refer on a Call Control call. You can initiate a SIP Refer at any point in the duration of a call. **Expected Webhooks:**

- `call.refer.started`
- `call.refer.completed`
- `call.refer.failed`

`POST /calls/{call_control_id}/actions/refer`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sip_address` | string | Yes | The SIP URI to which the call will be referred to. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `custom_headers` | array[object] | No | Custom headers to be added to the SIP INVITE. |
| ... | | | +3 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "sip_address": "sip:username@sip.non-telnyx-address.com"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/refer"
```

Key response fields: `.data.result`

## Send SIP info

Sends SIP info from this leg. **Expected Webhooks:**

- `call.sip_info.received` (to be received on the target call leg)

`POST /calls/{call_control_id}/actions/send_sip_info`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content_type` | string | Yes | Content type of the INFO body. |
| `body` | string | Yes | Content of the SIP INFO |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "content_type": "application/json",
  "body": "{\"key\": \"value\", \"numValue\": 100}"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/send_sip_info"
```

Key response fields: `.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```bash
# Telnyx signs webhooks with Ed25519 (asymmetric — NOT HMAC/Standard Webhooks).
# Headers sent with each webhook:
#   telnyx-signature-ed25519: base64-encoded Ed25519 signature
#   telnyx-timestamp: Unix timestamp (reject if >5 minutes old for replay protection)
#
# Get your public key from: Telnyx Portal > Account Settings > Keys & Credentials
# Use the Telnyx SDK in your language for verification (client.webhooks.unwrap).
# Your endpoint MUST return 2xx within 2 seconds or Telnyx will retry (up to 3 attempts).
# Configure a failover URL in Telnyx Portal for additional reliability.
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `callAnswered` | `call.answered` | Call Answered |
| `callBridged` | `call.bridged` | Call Bridged |
| `callHangup` | `call.hangup` | Call Hangup |
| `callInitiated` | `call.initiated` | Call Initiated |

Webhook payload field definitions are in the API Details section below.

---

# Voice (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List call control applications, Create a call control application, Retrieve a call control application, Update a call control application, Delete a call control application

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, Chennai, IN, Amsterdam, Netherlands, Toronto, Canada, Sydney, Australia |
| `application_name` | string |
| `call_cost_in_webhooks` | boolean |
| `created_at` | string |
| `dtmf_type` | enum: RFC 2833, Inband, SIP INFO |
| `first_command_timeout` | boolean |
| `first_command_timeout_secs` | integer |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | enum: call_control_application |
| `redact_dtmf_debug_logging` | boolean |
| `tags` | array[string] |
| `updated_at` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | url |
| `webhook_event_url` | url |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** Dial

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_duration` | integer |
| `call_leg_id` | string |
| `call_session_id` | string |
| `client_state` | string |
| `end_time` | string |
| `is_alive` | boolean |
| `record_type` | enum: call |
| `recording_id` | uuid |
| `start_time` | string |

**Returned by:** Retrieve a call status

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_duration` | integer |
| `call_leg_id` | string |
| `call_session_id` | string |
| `client_state` | string |
| `end_time` | string |
| `is_alive` | boolean |
| `record_type` | enum: call |
| `start_time` | string |

**Returned by:** Answer call

| Field | Type |
|-------|------|
| `recording_id` | uuid |
| `result` | string |

**Returned by:** Bridge calls, Hangup call, SIP Refer a call, Reject a call, Send SIP info, Transfer call

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** List all active calls for given connection

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_duration` | integer |
| `call_leg_id` | string |
| `call_session_id` | string |
| `client_state` | string |
| `record_type` | enum: call |

## Optional Parameters

### Create a call control application

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `first_command_timeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `first_command_timeout_secs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `inbound` | object |  |
| `outbound` | object |  |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this Call Control Applicat... |
| `redact_dtmf_debug_logging` | boolean | When enabled, DTMF digits entered by users will be redacted in debug logs to ... |

### Update a call control application

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this Call Control Applicat... |
| `active` | boolean | Specifies whether the connection can be used. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `first_command_timeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `first_command_timeout_secs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `tags` | array[string] | Tags assigned to the Call Control Application. |
| `inbound` | object |  |
| `outbound` | object |  |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `redact_dtmf_debug_logging` | boolean | When enabled, DTMF digits entered by users will be redacted in debug logs to ... |

### Dial

| Parameter | Type | Description |
|-----------|------|-------------|
| `from_display_name` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `audio_url` | string (URL) | The URL of a file to be played back to the callee when the call is answered. |
| `media_name` | string | The media_name of a file to be played back to the callee when the call is ans... |
| `preferred_codecs` | string | The list of comma-separated codecs in a preferred order for the forked media ... |
| `timeout_secs` | integer | The number of seconds that Telnyx will wait for the call to be answered by th... |
| `time_limit_secs` | integer | Sets the maximum duration of a Call Control Leg in seconds. |
| `answering_machine_detection` | enum (premium, detect, detect_beep, detect_words, greeting_end, ...) | Enables Answering Machine Detection. |
| `answering_machine_detection_config` | object | Optional configuration parameters to modify 'answering_machine_detection' per... |
| `conference_config` | object | Optional configuration parameters to dial new participant into a conference. |
| `custom_headers` | array[object] | Custom headers to be added to the SIP INVITE. |
| `billing_group_id` | string (UUID) | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `link_to` | string | Use another call's control id for sharing the same call session id |
| `bridge_intent` | boolean | Indicates the intent to bridge this call with the call specified in link_to. |
| `bridge_on_answer` | boolean | Whether to automatically bridge answered call to the call specified in link_to. |
| `prevent_double_bridge` | boolean | Prevents bridging and hangs up the call if the target is already bridged. |
| `park_after_unbridge` | string | If supplied with the value `self`, the current leg will be parked after unbri... |
| `media_encryption` | enum (disabled, SRTP, DTLS) | Defines whether media should be encrypted on the call. |
| `sip_auth_username` | string | SIP Authentication username used for SIP challenges. |
| `sip_auth_password` | string | SIP Authentication password used for SIP challenges. |
| `sip_headers` | array[object] | SIP headers to be added to the SIP INVITE request. |
| `sip_transport_protocol` | enum (UDP, TCP, TLS) | Defines SIP transport protocol to be used on the call. |
| `sound_modifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `stream_url` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `stream_track` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `stream_codec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `stream_bidirectional_mode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `stream_bidirectional_codec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `stream_bidirectional_target_legs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `stream_bidirectional_sampling_rate` | enum (8000, 16000, 22050, 24000, 48000) | Audio sampling rate. |
| `stream_establish_before_call_originate` | boolean | Establish websocket connection before dialing the destination. |
| `send_silence_when_idle` | boolean | Generate silence RTP packets when no transmission available. |
| `webhook_url` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `webhook_url_method` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `record_channels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `record_format` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `record_max_length` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `record_timeout_secs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `record_track` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `record_trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `record_custom_file_name` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `supervise_call_control_id` | string (UUID) | The call leg which will be supervised by the new call. |
| `supervisor_role` | enum (barge, whisper, monitor) | The role of the supervisor call. |
| `enable_dialogflow` | boolean | Enables Dialogflow for the current call. |
| `dialogflow_config` | object |  |
| `transcription` | boolean | Enable transcription upon call answer. |
| `transcription_config` | object |  |
| `sip_region` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `stream_auth_token` | string | An authentication token to be sent as part of the WebSocket connection when u... |

### Answer call

| Parameter | Type | Description |
|-----------|------|-------------|
| `billing_group_id` | string (UUID) | Use this field to set the Billing Group ID for the call. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `custom_headers` | array[object] | Custom headers to be added to the SIP INVITE response. |
| `preferred_codecs` | enum (G722,PCMU,PCMA,G729,OPUS,VP8,H264) | The list of comma-separated codecs in a preferred order for the forked media ... |
| `sip_headers` | array[object] | SIP headers to be added to the SIP INVITE response. |
| `sound_modifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `stream_url` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `stream_track` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `stream_codec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `stream_bidirectional_mode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `stream_bidirectional_codec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `stream_bidirectional_target_legs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `send_silence_when_idle` | boolean | Generate silence RTP packets when no transmission available. |
| `webhook_url` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `webhook_url_method` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `transcription` | boolean | Enable transcription upon call answer. |
| `transcription_config` | object |  |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `record_channels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `record_format` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `record_max_length` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `record_timeout_secs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `record_track` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `record_trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `record_custom_file_name` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `webhook_urls` | object | A map of event types to webhook URLs. |
| `webhook_urls_method` | enum (POST, GET) | HTTP request method to invoke `webhook_urls`. |
| `webhook_retries_policies` | object | A map of event types to retry policies. |

### Bridge calls

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `queue` | string | The name of the queue you want to bridge with, can't be used together with ca... |
| `video_room_id` | string (UUID) | The ID of the video room you want to bridge with, can't be used together with... |
| `video_room_context` | string | The additional parameter that will be passed to the video conference. |
| `prevent_double_bridge` | boolean | When set to `true`, it prevents bridging if the target call is already bridge... |
| `park_after_unbridge` | string | Specifies behavior after the bridge ends (i.e. |
| `play_ringtone` | boolean | Specifies whether to play a ringtone if the call you want to bridge with has ... |
| `ringtone` | enum (at, au, be, bg, br, ...) | Specifies which country ringtone to play when `play_ringtone` is set to `true`. |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `record_channels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `record_format` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `record_max_length` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `record_timeout_secs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `record_track` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `record_trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `record_custom_file_name` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `mute_dtmf` | enum (none, both, self, opposite) | When enabled, DTMF tones are not passed to the call participant. |
| `hold_after_unbridge` | boolean | Specifies behavior after the bridge ends. |

### Hangup call

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `custom_headers` | array[object] | Custom headers to be added to the SIP BYE message. |

### SIP Refer a call

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `custom_headers` | array[object] | Custom headers to be added to the SIP INVITE. |
| `sip_auth_username` | string | SIP Authentication username used for SIP challenges. |
| `sip_auth_password` | string | SIP Authentication password used for SIP challenges. |
| `sip_headers` | array[object] | SIP headers to be added to the request. |

### Reject a call

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Send SIP info

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Transfer call

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | The `from` number to be used as the caller id presented to the destination (`... |
| `from_display_name` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `audio_url` | string (URL) | The URL of a file to be played back when the transfer destination answers bef... |
| `early_media` | boolean | If set to false, early media will not be passed to the originating leg. |
| `media_name` | string | The media_name of a file to be played back when the transfer destination answ... |
| `timeout_secs` | integer | The number of seconds that Telnyx will wait for the call to be answered by th... |
| `time_limit_secs` | integer | Sets the maximum duration of a Call Control Leg in seconds. |
| `park_after_unbridge` | string | Specifies behavior after the bridge ends (i.e. |
| `answering_machine_detection` | enum (premium, detect, detect_beep, detect_words, greeting_end, ...) | Enables Answering Machine Detection. |
| `answering_machine_detection_config` | object | Optional configuration parameters to modify 'answering_machine_detection' per... |
| `custom_headers` | array[object] | Custom headers to be added to the SIP INVITE. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `target_leg_client_state` | string | Use this field to add state to every subsequent webhook for the new leg. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `media_encryption` | enum (disabled, SRTP, DTLS) | Defines whether media should be encrypted on the new call leg. |
| `sip_auth_username` | string | SIP Authentication username used for SIP challenges. |
| `sip_auth_password` | string | SIP Authentication password used for SIP challenges. |
| `sip_headers` | array[object] | SIP headers to be added to the SIP INVITE. |
| `sip_transport_protocol` | enum (UDP, TCP, TLS) | Defines SIP transport protocol to be used on the call. |
| `sound_modifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `webhook_url` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `webhook_url_method` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `mute_dtmf` | enum (none, both, self, opposite) | When enabled, DTMF tones are not passed to the call participant. |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `record_channels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `record_format` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `record_max_length` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `record_timeout_secs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `record_track` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `record_trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `record_custom_file_name` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `sip_region` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `preferred_codecs` | string | The list of comma-separated codecs in order of preference to be used during t... |
| `webhook_urls` | object | A map of event types to webhook URLs. |
| `webhook_urls_method` | enum (POST, GET) | HTTP request method to invoke `webhook_urls`. |
| `webhook_retries_policies` | object | A map of event types to retry policies. |

## Webhook Payload Fields

### `callAnswered`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.answered | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.custom_headers` | array[object] | Custom headers set on answer command |
| `data.payload.sip_headers` | array[object] | User-to-User and Diversion headers from sip invite. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.state` | enum: answered | State received from a command. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |

### `callBridged`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.bridged | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

### `callHangup`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.hangup | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.custom_headers` | array[object] | Custom headers set on answer command |
| `data.payload.sip_headers` | array[object] | User-to-User and Diversion headers from sip invite. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.state` | enum: hangup | State received from a command. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |
| `data.payload.hangup_cause` | enum: call_rejected, normal_clearing, originator_cancel, timeout, time_limit, user_busy, not_found, no_answer, unspecified | The reason the call was ended (`call_rejected`, `normal_clearing`, `originator_cancel`, `timeout`, `time_limit`, `use... |
| `data.payload.hangup_source` | enum: caller, callee, unknown | The party who ended the call (`callee`, `caller`, `unknown`). |
| `data.payload.sip_hangup_cause` | string | The reason the call was ended (SIP response code). |
| `data.payload.call_quality_stats` | object \| null | Call quality statistics aggregated from the CHANNEL_HANGUP_COMPLETE event. |

### `callInitiated`

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
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.custom_headers` | array[object] | Custom headers from sip invite |
| `data.payload.sip_headers` | array[object] | User-to-User and Diversion headers from sip invite. |
| `data.payload.shaken_stir_attestation` | string | SHAKEN/STIR attestation level. |
| `data.payload.shaken_stir_validated` | boolean | Whether attestation was successfully validated or not. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.caller_id_name` | string | Caller id. |
| `data.payload.call_screening_result` | string | Call screening result. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |
| `data.payload.direction` | enum: incoming, outgoing | Whether the call is `incoming` or `outgoing`. |
| `data.payload.state` | enum: parked, bridging | State received from a command. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |

### Field Type Notes

- `from` in webhook payloads: string (E.164 phone number)
- `to` in webhook payloads: string (E.164 phone number)
- The return value of `client.webhooks.unwrap()` is a parsed event object — access fields via `event.data.event_type`, `event.data.payload.call_control_id`, etc.
