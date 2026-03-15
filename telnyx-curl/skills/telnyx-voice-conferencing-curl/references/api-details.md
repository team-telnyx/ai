# Voice Conferencing (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Enqueue call, Remove call from a queue, End a conference, Gather DTMF using audio prompt in a conference, Hold conference participants, Join a conference, Leave a conference, Mute conference participants, Play audio to conference participants, Conference recording pause, Conference recording resume, Conference recording start, Conference recording stop, Send DTMF to conference participants, Speak text to conference participants, Stop audio being played on the conference, Unhold conference participants, Unmute conference participants, Update conference participant

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** List conferences, Create conference, Retrieve a conference

| Field | Type |
|-------|------|
| `connection_id` | string |
| `created_at` | string |
| `end_reason` | enum: all_left, ended_via_api, host_left, time_exceeded |
| `ended_by` | object |
| `expires_at` | string |
| `id` | string |
| `name` | string |
| `record_type` | enum: conference |
| `region` | string |
| `status` | enum: init, in_progress, completed |
| `updated_at` | string |

**Returned by:** List conference participants

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_leg_id` | string |
| `conference` | object |
| `created_at` | string |
| `end_conference_on_exit` | boolean |
| `id` | string |
| `muted` | boolean |
| `on_hold` | boolean |
| `record_type` | enum: participant |
| `soft_end_conference_on_exit` | boolean |
| `status` | enum: joining, joined, left |
| `updated_at` | string |
| `whisper_call_control_ids` | array[string] |

**Returned by:** Retrieve a conference participant, Update a conference participant

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_leg_id` | string |
| `conference_id` | string |
| `created_at` | date-time |
| `end_conference_on_exit` | boolean |
| `id` | string |
| `label` | string |
| `muted` | boolean |
| `on_hold` | boolean |
| `soft_end_conference_on_exit` | boolean |
| `status` | enum: joining, joined, left |
| `updated_at` | date-time |
| `whisper_call_control_ids` | array[string] |

**Returned by:** List queues, Create a queue, Retrieve a call queue, Update a queue

| Field | Type |
|-------|------|
| `average_wait_time_secs` | integer |
| `created_at` | string |
| `current_size` | integer |
| `id` | string |
| `max_size` | integer |
| `name` | string |
| `record_type` | enum: queue |
| `updated_at` | string |

**Returned by:** Retrieve calls from a queue, Retrieve a call from a queue

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_leg_id` | string |
| `call_session_id` | string |
| `connection_id` | string |
| `enqueued_at` | string |
| `from` | string |
| `is_alive` | boolean |
| `queue_id` | string |
| `queue_position` | integer |
| `record_type` | enum: queue_call |
| `to` | string |
| `wait_time_secs` | integer |

## Optional Parameters

### Enqueue call

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `max_wait_time_secs` | integer | The number of seconds after which the call will be removed from the queue. |
| `max_size` | integer | The maximum number of calls allowed in the queue at a given time. |
| `keep_after_hangup` | boolean | If set to true, the call will remain in the queue after hangup. |

### Remove call from a queue

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Create conference

| Parameter | Type | Description |
|-----------|------|-------------|
| `beep_enabled` | enum (always, never, on_enter, on_exit) | Whether a beep sound should be played when participants join and/or leave the... |
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `comfort_noise` | boolean | Toggle background comfort noise. |
| `command_id` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `duration_minutes` | integer | Time length (minutes) after which the conference will end. |
| `hold_audio_url` | string (URL) | The URL of a file to be played to participants joining the conference. |
| `hold_media_name` | string | The media_name of a file to be played to participants joining the conference. |
| `max_participants` | integer | The maximum number of active conference participants to allow. |
| `start_conference_on_create` | boolean | Whether the conference should be started on creation. |
| `region` | enum (Australia, Europe, Middle East, US) | Sets the region where the conference data will be hosted. |

### End a conference

| Parameter | Type | Description |
|-----------|------|-------------|
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |

### Gather DTMF using audio prompt in a conference

| Parameter | Type | Description |
|-----------|------|-------------|
| `audio_url` | string (URL) | The URL of the audio file to play as the gather prompt. |
| `media_name` | string | The name of the media file uploaded to the Media Storage API to play as the g... |
| `minimum_digits` | integer | Minimum number of digits to gather. |
| `maximum_digits` | integer | Maximum number of digits to gather. |
| `maximum_tries` | integer | Maximum number of times to play the prompt if no input is received. |
| `timeout_millis` | integer | Duration in milliseconds to wait for input before timing out. |
| `terminating_digit` | string | Digit that terminates gathering. |
| `valid_digits` | string | Digits that are valid for gathering. |
| `inter_digit_timeout_millis` | integer | Duration in milliseconds to wait between digits. |
| `initial_timeout_millis` | integer | Duration in milliseconds to wait for the first digit before timing out. |
| `stop_playback_on_dtmf` | boolean | Whether to stop the audio playback when a DTMF digit is received. |
| `invalid_audio_url` | string (URL) | URL of audio file to play when invalid input is received. |
| `invalid_media_name` | string | Name of media file to play when invalid input is received. |
| `gather_id` | string (UUID) | Identifier for this gather command. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |

### Hold conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_control_ids` | array[string] | List of unique identifiers and tokens for controlling the call. |
| `audio_url` | string (URL) | The URL of a file to be played to the participants when they are put on hold. |
| `media_name` | string | The media_name of a file to be played to the participants when they are put o... |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Join a conference

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `end_conference_on_exit` | boolean | Whether the conference should end and all remaining participants be hung up a... |
| `soft_end_conference_on_exit` | boolean | Whether the conference should end after the participant leaves the conference. |
| `hold` | boolean | Whether the participant should be put on hold immediately after joining the c... |
| `hold_audio_url` | string (URL) | The URL of a file to be played to the participant when they are put on hold a... |
| `hold_media_name` | string | The media_name of a file to be played to the participant when they are put on... |
| `mute` | boolean | Whether the participant should be muted immediately after joining the confere... |
| `start_conference_on_enter` | boolean | Whether the conference should be started after the participant joins the conf... |
| `supervisor_role` | enum (barge, monitor, none, whisper) | Sets the joining participant as a supervisor for the conference. |
| `whisper_call_control_ids` | array[string] | Array of unique call_control_ids the joining supervisor can whisper to. |
| `beep_enabled` | enum (always, never, on_enter, on_exit) | Whether a beep sound should be played when the participant joins and/or leave... |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Leave a conference

| Parameter | Type | Description |
|-----------|------|-------------|
| `command_id` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `beep_enabled` | enum (always, never, on_enter, on_exit) | Whether a beep sound should be played when the participant leaves the confere... |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Mute conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_control_ids` | array[string] | Array of unique identifiers and tokens for controlling the call. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Play audio to conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `audio_url` | string (URL) | The URL of a file to be played back in the conference. |
| `media_name` | string | The media_name of a file to be played back in the conference. |
| `loop` | string |  |
| `call_control_ids` | array[string] | List of call control ids identifying participants the audio file should be pl... |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Conference recording pause

| Parameter | Type | Description |
|-----------|------|-------------|
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | Use this field to pause specific recording. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Conference recording resume

| Parameter | Type | Description |
|-----------|------|-------------|
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | Use this field to resume specific recording. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Conference recording start

| Parameter | Type | Description |
|-----------|------|-------------|
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `channels` | enum (single, dual) | When `dual`, final audio file will be stereo recorded with the conference cre... |
| `play_beep` | boolean | If enabled, a beep sound will be played at the start of a recording. |
| `trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `custom_file_name` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Conference recording stop

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_state` | string | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | Uniquely identifies the resource. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Send DTMF to conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_control_ids` | array[string] | Array of participant call control IDs to send DTMF to. |
| `duration_millis` | integer | Duration of each DTMF digit in milliseconds. |
| `client_state` | string | Use this field to add state to every subsequent webhook. |

### Speak text to conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_control_ids` | array[string] | Call Control IDs of participants who will hear the spoken text. |
| `payload_type` | enum (text, ssml) | The type of the provided payload. |
| `voice_settings` | object | The settings associated with the voice selected |
| `language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | The language you want spoken. |
| `command_id` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Stop audio being played on the conference

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_control_ids` | array[string] | List of call control ids identifying participants the audio file should stop ... |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Unhold conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Unmute conference participants

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_control_ids` | array[string] | List of unique identifiers and tokens for controlling the call. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Update conference participant

| Parameter | Type | Description |
|-----------|------|-------------|
| `command_id` | string (UUID) | Use this field to avoid execution of duplicate commands. |
| `whisper_call_control_ids` | array[string] | Array of unique call_control_ids the supervisor can whisper to. |
| `region` | enum (Australia, Europe, Middle East, US) | Region where the conference data is located. |

### Update a conference participant

| Parameter | Type | Description |
|-----------|------|-------------|
| `end_conference_on_exit` | boolean | Whether the conference should end when this participant exits. |
| `soft_end_conference_on_exit` | boolean | Whether the conference should soft-end when this participant exits. |
| `beep_enabled` | enum (always, never, on_enter, on_exit) | Whether entry/exit beeps are enabled for this participant. |

### Create a queue

| Parameter | Type | Description |
|-----------|------|-------------|
| `max_size` | integer | The maximum number of calls allowed in the queue. |

### Update queued call

| Parameter | Type | Description |
|-----------|------|-------------|
| `keep_after_hangup` | boolean | Whether the call should remain in queue after hangup. |

## Webhook Payload Fields

### `callEnqueued`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.enqueued | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.queue` | string | The name of the queue |
| `data.payload.current_position` | integer | Current position of the call in the queue. |
| `data.payload.queue_avg_wait_time_secs` | integer | Average time call spends in the queue in seconds. |

### `callLeftQueue`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.dequeued | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.queue` | string | The name of the queue |
| `data.payload.queue_position` | integer | Last position of the call in the queue. |
| `data.payload.reason` | enum: bridged, bridging-in-process, hangup, leave, timeout | The reason for leaving the queue |
| `data.payload.wait_time_secs` | integer | Time call spent in the queue in seconds. |

### `conferenceCreated`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.created | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.conference_id` | string | Conference ID that the participant joined. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.conference_id` | string | Conference ID that the participant joined. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.reason` | enum: all_left, host_left, time_exceeded | Reason the conference ended. |

### `conferenceFloorChanged`

| Field | Type | Description |
|-------|------|-------------|
| `record_type` | enum: event | Identifies the type of the resource. |
| `event_type` | enum: conference.floor.changed | The type of event being delivered. |
| `id` | uuid | Identifies the type of resource. |
| `payload.call_control_id` | string | Call Control ID of the new speaker. |
| `payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `payload.call_leg_id` | string | Call Leg ID of the new speaker. |
| `payload.call_session_id` | string | Call Session ID of the new speaker. |
| `payload.client_state` | string | State received from a command. |
| `payload.conference_id` | string | Conference ID that had a speaker change event. |
| `payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceParticipantJoined`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.participant.joined | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.conference_id` | string | Conference ID that the participant joined. |

### `conferenceParticipantLeft`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.participant.left | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.conference_id` | string | Conference ID that the participant joined. |

### `conferenceParticipantPlaybackEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.participant.playback.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Participant's call ID used to issue commands via Call Control API. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceParticipantPlaybackStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.participant.playback.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Participant's call ID used to issue commands via Call Control API. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceParticipantSpeakEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.participant.speak.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Participant's call ID used to issue commands via Call Control API. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceParticipantSpeakStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.participant.speak.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Participant's call ID used to issue commands via Call Control API. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferencePlaybackEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.playback.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferencePlaybackStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.playback.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceRecordingSaved`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.recording.saved | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.call_control_id` | string | Participant's call ID used to issue commands via Call Control API. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.channels` | enum: single, dual | Whether recording was recorded in `single` or `dual` channel. |
| `data.payload.conference_id` | uuid | ID of the conference that is being recorded. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.format` | enum: wav, mp3 | The audio file format used when storing the call recording. |
| `data.payload.recording_ended_at` | date-time | ISO 8601 datetime of when recording ended. |
| `data.payload.recording_id` | uuid | ID of the conference recording. |
| `data.payload.recording_started_at` | date-time | ISO 8601 datetime of when recording started. |

### `conferenceSpeakEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.speak.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |

### `conferenceSpeakStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: conference.speak.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.creator_call_session_id` | string | ID that is unique to the call session that started the conference. |
| `data.payload.conference_id` | string | ID of the conference the text was spoken in. |
| `data.payload.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
