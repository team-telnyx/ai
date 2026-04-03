# Voice (Java) — API Details

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

### Create a call control application — `client.callControlApplications().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `firstCommandTimeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `firstCommandTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `inbound` | object |  |
| `outbound` | object |  |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this Call Control Applicat... |
| `redactDtmfDebugLogging` | boolean | When enabled, DTMF digits entered by users will be redacted in debug logs to ... |

### Update a call control application — `client.callControlApplications().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this Call Control Applicat... |
| `active` | boolean | Specifies whether the connection can be used. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, London, UK, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `firstCommandTimeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `firstCommandTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `tags` | array[string] | Tags assigned to the Call Control Application. |
| `inbound` | object |  |
| `outbound` | object |  |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `redactDtmfDebugLogging` | boolean | When enabled, DTMF digits entered by users will be redacted in debug logs to ... |

### Dial — `client.calls().dial()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromDisplayName` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `audioUrl` | string (URL) | The URL of a file to be played back to the callee when the call is answered. |
| `mediaName` | string | The media_name of a file to be played back to the callee when the call is ans... |
| `preferredCodecs` | string | The list of comma-separated codecs in a preferred order for the forked media ... |
| `timeoutSecs` | integer | The number of seconds that Telnyx will wait for the call to be answered by th... |
| `timeLimitSecs` | integer | Sets the maximum duration of a Call Control Leg in seconds. |
| `answeringMachineDetection` | enum (premium, detect, detect_beep, detect_words, greeting_end, ...) | Enables Answering Machine Detection. |
| `answeringMachineDetectionConfig` | object | Optional configuration parameters to modify 'answering_machine_detection' per... |
| `conferenceConfig` | object | Optional configuration parameters to dial new participant into a conference. |
| `customHeaders` | array[object] | Custom headers to be added to the SIP INVITE. |
| `billingGroupId` | string (UUID) | Use this field to set the Billing Group ID for the call. |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `linkTo` | string | Use another call's control id for sharing the same call session id |
| `bridgeIntent` | boolean | Indicates the intent to bridge this call with the call specified in link_to. |
| `bridgeOnAnswer` | boolean | Whether to automatically bridge answered call to the call specified in link_to. |
| `preventDoubleBridge` | boolean | Prevents bridging and hangs up the call if the target is already bridged. |
| `parkAfterUnbridge` | string | If supplied with the value `self`, the current leg will be parked after unbri... |
| `mediaEncryption` | enum (disabled, SRTP, DTLS) | Defines whether media should be encrypted on the call. |
| `sipAuthUsername` | string | SIP Authentication username used for SIP challenges. |
| `sipAuthPassword` | string | SIP Authentication password used for SIP challenges. |
| `sipHeaders` | array[object] | SIP headers to be added to the SIP INVITE request. |
| `sipTransportProtocol` | enum (UDP, TCP, TLS) | Defines SIP transport protocol to be used on the call. |
| `soundModifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `streamUrl` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `streamTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `streamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `streamBidirectionalMode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `streamBidirectionalCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `streamBidirectionalTargetLegs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `streamBidirectionalSamplingRate` | enum (8000, 16000, 22050, 24000, 48000) | Audio sampling rate. |
| `streamEstablishBeforeCallOriginate` | boolean | Establish websocket connection before dialing the destination. |
| `sendSilenceWhenIdle` | boolean | Generate silence RTP packets when no transmission available. |
| `webhookUrl` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `webhookUrlMethod` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `recordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `recordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `recordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `recordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `recordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `recordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `recordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `superviseCallControlId` | string (UUID) | The call leg which will be supervised by the new call. |
| `supervisorRole` | enum (barge, whisper, monitor) | The role of the supervisor call. |
| `enableDialogflow` | boolean | Enables Dialogflow for the current call. |
| `dialogflowConfig` | object |  |
| `transcription` | boolean | Enable transcription upon call answer. |
| `transcriptionConfig` | object |  |
| `sipRegion` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `streamAuthToken` | string | An authentication token to be sent as part of the WebSocket connection when u... |

### Answer call — `client.calls().actions().answer()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `billingGroupId` | string (UUID) | Use this field to set the Billing Group ID for the call. |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `customHeaders` | array[object] | Custom headers to be added to the SIP INVITE response. |
| `preferredCodecs` | enum (G722,PCMU,PCMA,G729,OPUS,VP8,H264) | The list of comma-separated codecs in a preferred order for the forked media ... |
| `sipHeaders` | array[object] | SIP headers to be added to the SIP INVITE response. |
| `soundModifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `streamUrl` | string (URL) | The destination WebSocket address where the stream is going to be delivered. |
| `streamTrack` | enum (inbound_track, outbound_track, both_tracks) | Specifies which track should be streamed. |
| `streamCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Specifies the codec to be used for the streamed audio. |
| `streamBidirectionalMode` | enum (mp3, rtp) | Configures method of bidirectional streaming (mp3, rtp). |
| `streamBidirectionalCodec` | enum (PCMU, PCMA, G722, OPUS, AMR-WB, ...) | Indicates codec for bidirectional streaming RTP payloads. |
| `streamBidirectionalTargetLegs` | enum (both, self, opposite) | Specifies which call legs should receive the bidirectional stream audio. |
| `sendSilenceWhenIdle` | boolean | Generate silence RTP packets when no transmission available. |
| `webhookUrl` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `webhookUrlMethod` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `transcription` | boolean | Enable transcription upon call answer. |
| `transcriptionConfig` | object |  |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `recordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `recordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `recordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `recordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `recordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `recordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `recordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `webhookUrls` | object | A map of event types to webhook URLs. |
| `webhookUrlsMethod` | enum (POST, GET) | HTTP request method to invoke `webhook_urls`. |
| `webhookRetriesPolicies` | object | A map of event types to retry policies. |

### Bridge calls — `client.calls().actions().bridge()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `queue` | string | The name of the queue you want to bridge with, can't be used together with ca... |
| `videoRoomId` | string (UUID) | The ID of the video room you want to bridge with, can't be used together with... |
| `videoRoomContext` | string | The additional parameter that will be passed to the video conference. |
| `preventDoubleBridge` | boolean | When set to `true`, it prevents bridging if the target call is already bridge... |
| `parkAfterUnbridge` | string | Specifies behavior after the bridge ends (i.e. |
| `playRingtone` | boolean | Specifies whether to play a ringtone if the call you want to bridge with has ... |
| `ringtone` | enum (at, au, be, bg, br, ...) | Specifies which country ringtone to play when `play_ringtone` is set to `true`. |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `recordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `recordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `recordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `recordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `recordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `recordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `recordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `muteDtmf` | enum (none, both, self, opposite) | When enabled, DTMF tones are not passed to the call participant. |
| `holdAfterUnbridge` | boolean | Specifies behavior after the bridge ends. |

### Hangup call — `client.calls().actions().hangup()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `customHeaders` | array[object] | Custom headers to be added to the SIP BYE message. |

### SIP Refer a call — `client.calls().actions().refer()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `customHeaders` | array[object] | Custom headers to be added to the SIP INVITE. |
| `sipAuthUsername` | string | SIP Authentication username used for SIP challenges. |
| `sipAuthPassword` | string | SIP Authentication password used for SIP challenges. |
| `sipHeaders` | array[object] | SIP headers to be added to the request. |

### Reject a call — `client.calls().actions().reject()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Send SIP info — `client.calls().actions().sendSipInfo()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Transfer call — `client.calls().actions().transfer()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | The `from` number to be used as the caller id presented to the destination (`... |
| `fromDisplayName` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `audioUrl` | string (URL) | The URL of a file to be played back when the transfer destination answers bef... |
| `earlyMedia` | boolean | If set to false, early media will not be passed to the originating leg. |
| `mediaName` | string | The media_name of a file to be played back when the transfer destination answ... |
| `timeoutSecs` | integer | The number of seconds that Telnyx will wait for the call to be answered by th... |
| `timeLimitSecs` | integer | Sets the maximum duration of a Call Control Leg in seconds. |
| `parkAfterUnbridge` | string | Specifies behavior after the bridge ends (i.e. |
| `answeringMachineDetection` | enum (premium, detect, detect_beep, detect_words, greeting_end, ...) | Enables Answering Machine Detection. |
| `answeringMachineDetectionConfig` | object | Optional configuration parameters to modify 'answering_machine_detection' per... |
| `customHeaders` | array[object] | Custom headers to be added to the SIP INVITE. |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `targetLegClientState` | string | Use this field to add state to every subsequent webhook for the new leg. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `mediaEncryption` | enum (disabled, SRTP, DTLS) | Defines whether media should be encrypted on the new call leg. |
| `sipAuthUsername` | string | SIP Authentication username used for SIP challenges. |
| `sipAuthPassword` | string | SIP Authentication password used for SIP challenges. |
| `sipHeaders` | array[object] | SIP headers to be added to the SIP INVITE. |
| `sipTransportProtocol` | enum (UDP, TCP, TLS) | Defines SIP transport protocol to be used on the call. |
| `soundModifications` | object | Use this field to modify sound effects, for example adjust the pitch. |
| `webhookUrl` | string (URL) | Use this field to override the URL for which Telnyx will send subsequent webh... |
| `webhookUrlMethod` | enum (POST, GET) | HTTP request type used for `webhook_url`. |
| `muteDtmf` | enum (none, both, self, opposite) | When enabled, DTMF tones are not passed to the call participant. |
| `record` | enum (record-from-answer) | Start recording automatically after an event. |
| `recordChannels` | enum (single, dual) | Defines which channel should be recorded ('single' or 'dual') when `record` i... |
| `recordFormat` | enum (wav, mp3) | Defines the format of the recording ('wav' or 'mp3') when `record` is specified. |
| `recordMaxLength` | integer | Defines the maximum length for the recording in seconds when `record` is spec... |
| `recordTimeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `recordTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `recordTrim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `recordCustomFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `sipRegion` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `preferredCodecs` | string | The list of comma-separated codecs in order of preference to be used during t... |
| `webhookUrls` | object | A map of event types to webhook URLs. |
| `webhookUrlsMethod` | enum (POST, GET) | HTTP request method to invoke `webhook_urls`. |
| `webhookRetriesPolicies` | object | A map of event types to retry policies. |

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
