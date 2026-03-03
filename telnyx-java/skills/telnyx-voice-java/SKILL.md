---
name: telnyx-voice-java
description: >-
  Make and receive calls, transfer, bridge, and manage call lifecycle with Call
  Control. Includes application management and call events. This skill provides
  Java SDK examples.
metadata:
  author: telnyx
  product: voice
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## List call control applications

Return a list of call control applications.

`GET /call_control_applications`

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationListPage;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationListParams;

CallControlApplicationListPage page = client.callControlApplications().list();
```

## Create a call control application

Create a call control application.

`POST /call_control_applications` — Required: `application_name`, `webhook_event_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `redact_dtmf_debug_logging` (boolean), `webhook_api_version` (enum), `webhook_event_failover_url` (url), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationCreateParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationCreateResponse;

CallControlApplicationCreateParams params = CallControlApplicationCreateParams.builder()
    .applicationName("call-router")
    .webhookEventUrl("https://example.com")
    .build();
CallControlApplicationCreateResponse callControlApplication = client.callControlApplications().create(params);
```

## Retrieve a call control application

Retrieves the details of an existing call control application.

`GET /call_control_applications/{id}`

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationRetrieveParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationRetrieveResponse;

CallControlApplicationRetrieveResponse callControlApplication = client.callControlApplications().retrieve("1293384261075731499");
```

## Update a call control application

Updates settings of an existing call control application.

`PATCH /call_control_applications/{id}` — Required: `application_name`, `webhook_event_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `redact_dtmf_debug_logging` (boolean), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (url), `webhook_timeout_secs` (['integer', 'null'])

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

## Delete a call control application

Deletes a call control application.

`DELETE /call_control_applications/{id}`

```java
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationDeleteParams;
import com.telnyx.sdk.models.callcontrolapplications.CallControlApplicationDeleteResponse;

CallControlApplicationDeleteResponse callControlApplication = client.callControlApplications().delete("1293384261075731499");
```

## Dial

Dial a number or SIP URI from a given connection.

`POST /calls` — Required: `connection_id`, `to`, `from`

Optional: `answering_machine_detection` (enum), `answering_machine_detection_config` (object), `audio_url` (string), `billing_group_id` (uuid), `bridge_intent` (boolean), `bridge_on_answer` (boolean), `client_state` (string), `command_id` (string), `conference_config` (object), `custom_headers` (array[object]), `dialogflow_config` (object), `enable_dialogflow` (boolean), `from_display_name` (string), `link_to` (string), `media_encryption` (enum), `media_name` (string), `park_after_unbridge` (string), `preferred_codecs` (string), `record` (enum), `record_channels` (enum), `record_custom_file_name` (string), `record_format` (enum), `record_max_length` (int32), `record_timeout_secs` (int32), `record_track` (enum), `record_trim` (enum), `send_silence_when_idle` (boolean), `sip_auth_password` (string), `sip_auth_username` (string), `sip_headers` (array[object]), `sip_region` (enum), `sip_transport_protocol` (enum), `sound_modifications` (object), `stream_auth_token` (string), `stream_bidirectional_codec` (enum), `stream_bidirectional_mode` (enum), `stream_bidirectional_sampling_rate` (enum), `stream_bidirectional_target_legs` (enum), `stream_codec` (enum), `stream_establish_before_call_originate` (boolean), `stream_track` (enum), `stream_url` (string), `supervise_call_control_id` (string), `supervisor_role` (enum), `time_limit_secs` (int32), `timeout_secs` (int32), `transcription` (boolean), `transcription_config` (object), `webhook_url` (string), `webhook_url_method` (enum)

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

## Retrieve a call status

Returns the status of a call (data is available 10 minutes after call ended).

`GET /calls/{call_control_id}`

```java
import com.telnyx.sdk.models.calls.CallRetrieveStatusParams;
import com.telnyx.sdk.models.calls.CallRetrieveStatusResponse;

CallRetrieveStatusResponse response = client.calls().retrieveStatus("call_control_id");
```

## Answer call

Answer an incoming call.

`POST /calls/{call_control_id}/actions/answer`

Optional: `billing_group_id` (uuid), `client_state` (string), `command_id` (string), `custom_headers` (array[object]), `preferred_codecs` (enum), `record` (enum), `record_channels` (enum), `record_custom_file_name` (string), `record_format` (enum), `record_max_length` (int32), `record_timeout_secs` (int32), `record_track` (enum), `record_trim` (enum), `send_silence_when_idle` (boolean), `sip_headers` (array[object]), `sound_modifications` (object), `stream_bidirectional_codec` (enum), `stream_bidirectional_mode` (enum), `stream_bidirectional_target_legs` (enum), `stream_codec` (enum), `stream_track` (enum), `stream_url` (string), `transcription` (boolean), `transcription_config` (object), `webhook_retries_policies` (object), `webhook_url` (string), `webhook_url_method` (enum), `webhook_urls` (object), `webhook_urls_method` (enum)

```java
import com.telnyx.sdk.models.calls.actions.ActionAnswerParams;
import com.telnyx.sdk.models.calls.actions.ActionAnswerResponse;

ActionAnswerResponse response = client.calls().actions().answer("call_control_id");
```

## Bridge calls

Bridge two call control calls.

`POST /calls/{call_control_id}/actions/bridge` — Required: `call_control_id`

Optional: `client_state` (string), `command_id` (string), `hold_after_unbridge` (boolean), `mute_dtmf` (enum), `park_after_unbridge` (string), `play_ringtone` (boolean), `prevent_double_bridge` (boolean), `queue` (string), `record` (enum), `record_channels` (enum), `record_custom_file_name` (string), `record_format` (enum), `record_max_length` (int32), `record_timeout_secs` (int32), `record_track` (enum), `record_trim` (enum), `ringtone` (enum), `video_room_context` (string), `video_room_id` (uuid)

```java
import com.telnyx.sdk.models.calls.actions.ActionBridgeParams;
import com.telnyx.sdk.models.calls.actions.ActionBridgeResponse;

ActionBridgeParams params = ActionBridgeParams.builder()
    .callControlIdToBridge("call_control_id")
    .callControlId("v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg")
    .build();
ActionBridgeResponse response = client.calls().actions().bridge(params);
```

## Hangup call

Hang up the call.

`POST /calls/{call_control_id}/actions/hangup`

Optional: `client_state` (string), `command_id` (string), `custom_headers` (array[object])

```java
import com.telnyx.sdk.models.calls.actions.ActionHangupParams;
import com.telnyx.sdk.models.calls.actions.ActionHangupResponse;

ActionHangupResponse response = client.calls().actions().hangup("call_control_id");
```

## SIP Refer a call

Initiate a SIP Refer on a Call Control call.

`POST /calls/{call_control_id}/actions/refer` — Required: `sip_address`

Optional: `client_state` (string), `command_id` (string), `custom_headers` (array[object]), `sip_auth_password` (string), `sip_auth_username` (string), `sip_headers` (array[object])

```java
import com.telnyx.sdk.models.calls.actions.ActionReferParams;
import com.telnyx.sdk.models.calls.actions.ActionReferResponse;

ActionReferParams params = ActionReferParams.builder()
    .callControlId("call_control_id")
    .sipAddress("sip:username@sip.non-telnyx-address.com")
    .build();
ActionReferResponse response = client.calls().actions().refer(params);
```

## Reject a call

Reject an incoming call.

`POST /calls/{call_control_id}/actions/reject` — Required: `cause`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionRejectParams;
import com.telnyx.sdk.models.calls.actions.ActionRejectResponse;

ActionRejectParams params = ActionRejectParams.builder()
    .callControlId("call_control_id")
    .cause(ActionRejectParams.Cause.USER_BUSY)
    .build();
ActionRejectResponse response = client.calls().actions().reject(params);
```

## Send SIP info

Sends SIP info from this leg.

`POST /calls/{call_control_id}/actions/send_sip_info` — Required: `content_type`, `body`

Optional: `client_state` (string), `command_id` (string)

```java
import com.telnyx.sdk.models.calls.actions.ActionSendSipInfoParams;
import com.telnyx.sdk.models.calls.actions.ActionSendSipInfoResponse;

ActionSendSipInfoParams params = ActionSendSipInfoParams.builder()
    .callControlId("call_control_id")
    .sipInfoBody("{\"key\": \"value\", \"numValue\": 100}")
    .contentType("application/json")
    .build();
ActionSendSipInfoResponse response = client.calls().actions().sendSipInfo(params);
```

## Transfer call

Transfer a call to a new destination.

`POST /calls/{call_control_id}/actions/transfer` — Required: `to`

Optional: `answering_machine_detection` (enum), `answering_machine_detection_config` (object), `audio_url` (string), `client_state` (string), `command_id` (string), `custom_headers` (array[object]), `early_media` (boolean), `from` (string), `from_display_name` (string), `media_encryption` (enum), `media_name` (string), `mute_dtmf` (enum), `park_after_unbridge` (string), `preferred_codecs` (string), `record` (enum), `record_channels` (enum), `record_custom_file_name` (string), `record_format` (enum), `record_max_length` (int32), `record_timeout_secs` (int32), `record_track` (enum), `record_trim` (enum), `sip_auth_password` (string), `sip_auth_username` (string), `sip_headers` (array[object]), `sip_region` (enum), `sip_transport_protocol` (enum), `sound_modifications` (object), `target_leg_client_state` (string), `time_limit_secs` (int32), `timeout_secs` (int32), `webhook_retries_policies` (object), `webhook_url` (string), `webhook_url_method` (enum), `webhook_urls` (object), `webhook_urls_method` (enum)

```java
import com.telnyx.sdk.models.calls.actions.ActionTransferParams;
import com.telnyx.sdk.models.calls.actions.ActionTransferResponse;

ActionTransferParams params = ActionTransferParams.builder()
    .callControlId("call_control_id")
    .to("+18005550100")
    .build();
ActionTransferResponse response = client.calls().actions().transfer(params);
```

## List all active calls for given connection

Lists all active calls for given connection.

`GET /connections/{connection_id}/active_calls`

```java
import com.telnyx.sdk.models.connections.ConnectionListActiveCallsPage;
import com.telnyx.sdk.models.connections.ConnectionListActiveCallsParams;

ConnectionListActiveCallsPage page = client.connections().listActiveCalls("1293384261075731461");
```

---

## Webhooks

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for verification (Standard Webhooks compatible).

| Event | Description |
|-------|-------------|
| `callAnswered` | Call Answered |
| `callBridged` | Call Bridged |
| `callHangup` | Call Hangup |
| `callInitiated` | Call Initiated |

### Webhook payload fields

**`callAnswered`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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
| `data.payload.state` | enum | State received from a command. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |

**`callBridged`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.from` | string | Number or SIP URI placing the call. |
| `data.payload.to` | string | Destination number or SIP URI of the call. |

**`callHangup`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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
| `data.payload.state` | enum | State received from a command. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |
| `data.payload.hangup_cause` | enum | The reason the call was ended (`call_rejected`, `normal_clearing`, `originator_cancel`, `timeout`, `time_limit`, `use... |
| `data.payload.hangup_source` | enum | The party who ended the call (`callee`, `caller`, `unknown`). |
| `data.payload.sip_hangup_cause` | string | The reason the call was ended (SIP response code). |
| `data.payload.call_quality_stats` | ['object', 'null'] | Call quality statistics aggregated from the CHANNEL_HANGUP_COMPLETE event. |

**`callInitiated`**

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum | Identifies the type of the resource. |
| `data.event_type` | enum | The type of event being delivered. |
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
| `data.payload.direction` | enum | Whether the call is `incoming` or `outgoing`. |
| `data.payload.state` | enum | State received from a command. |
| `data.payload.start_time` | date-time | ISO 8601 datetime of when the call started. |
| `data.payload.tags` | array[string] | Array of tags associated to number. |
