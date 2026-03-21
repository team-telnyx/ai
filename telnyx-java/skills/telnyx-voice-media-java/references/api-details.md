# Voice Media (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** Play audio URL, Stop audio playback, Record pause, Record resume, Recording start, Recording stop, Speak text

| Field | Type |
|-------|------|
| `result` | string |

## Optional Parameters

### Play audio URL — `client.calls().actions().startPlayback()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `audioUrl` | string (URL) | The URL of a file to be played back on the call. |
| `mediaName` | string | The media_name of a file to be played back on the call. |
| `loop` | string |  |
| `overlay` | boolean | When enabled, audio will be mixed on top of any other audio that is actively ... |
| `stop` | string | When specified, it stops the current audio being played. |
| `targetLegs` | string | Specifies the leg or legs on which audio will be played. |
| `cacheAudio` | boolean | Caches the audio file. |
| `audioType` | enum (mp3, wav) | Specifies the type of audio provided in `audio_url` or `playback_content`. |
| `playbackContent` | string | Allows a user to provide base64 encoded mp3 or wav. |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Stop audio playback — `client.calls().actions().stopPlayback()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `overlay` | boolean | When enabled, it stops the audio being played in the overlay queue. |
| `stop` | string | Use `current` to stop the current audio being played. |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |

### Record pause — `client.calls().actions().pauseRecording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | Uniquely identifies the resource. |

### Record resume — `client.calls().actions().resumeRecording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | Uniquely identifies the resource. |

### Recording start — `client.calls().actions().startRecording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `playBeep` | boolean | If enabled, a beep sound will be played at the start of a recording. |
| `maxLength` | integer | Defines the maximum length for the recording in seconds. |
| `timeoutSecs` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `recordingTrack` | enum (both, inbound, outbound) | The audio track to be recorded. |
| `trim` | enum (trim-silence) | When set to `trim-silence`, silence will be removed from the beginning and en... |
| `customFileName` | string | The custom recording file name to be used instead of the default `call_leg_id`. |
| `transcription` | boolean | Enable post recording transcription. |
| `transcriptionEngine` | enum (A, B, deepgram/nova-3) | Engine to use for speech recognition. |
| `transcriptionLanguage` | enum (af, af-ZA, am, am-ET, ar, ...) | Language code for transcription. |
| `transcriptionProfanityFilter` | boolean | Enables profanity_filter. |
| `transcriptionSpeakerDiarization` | boolean | Enables speaker diarization. |
| `transcriptionMinSpeakerCount` | integer | Defines minimum number of speakers in the conversation. |
| `transcriptionMaxSpeakerCount` | integer | Defines maximum number of speakers in the conversation. |

### Recording stop — `client.calls().actions().stopRecording()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | Uniquely identifies the resource. |

### Speak text — `client.calls().actions().speak()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `payloadType` | enum (text, ssml) | The type of the provided payload. |
| `serviceLevel` | enum (basic, premium) | This parameter impacts speech quality, language options and payload types. |
| `stop` | string | When specified, it stops the current audio being played. |
| `voiceSettings` | object | The settings associated with the voice selected |
| `language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | The language you want spoken. |
| `clientState` | string | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | Use this field to avoid duplicate commands. |
| `loop` | string |  |
| `targetLegs` | enum (self, opposite, both) | Specifies which legs of the call should receive the spoken audio. |

## Webhook Payload Fields

### `callPlaybackEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.playback.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.overlay` | boolean | Whether the stopped audio was in overlay mode or not. |
| `data.payload.status` | enum: file_not_found, call_hangup, unknown, cancelled, cancelled_amd, completed, failed | Reflects how command ended. |
| `data.payload.status_detail` | string | Provides details in case of failure. |

### `callPlaybackStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.playback.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.media_url` | string | The audio URL being played back, if audio_url has been used to start. |
| `data.payload.media_name` | string | The name of the audio media file being played back, if media_name has been used to start. |
| `data.payload.overlay` | boolean | Whether the audio is going to be played in overlay mode or not. |

### `callRecordingError`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.recording.error | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.reason` | enum: Failed to authorize with storage using custom credentials, Invalid credentials json, Unsupported backend, Internal server error | Indication that there was a problem recording the call. |

### `callRecordingSaved`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.recording.saved | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.recording_started_at` | date-time | ISO 8601 datetime of when recording started. |
| `data.payload.recording_ended_at` | date-time | ISO 8601 datetime of when recording ended. |
| `data.payload.channels` | enum: single, dual | Whether recording was recorded in `single` or `dual` channel. |

### `callRecordingTranscriptionSaved`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.recording.transcription.saved | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.calling_party_type` | enum: pstn, sip | The type of calling party connection. |
| `data.payload.recording_id` | string | ID that is unique to the recording session and can be used to correlate webhook events. |
| `data.payload.recording_transcription_id` | string | ID that is unique to the transcription process and can be used to correlate webhook events. |
| `data.payload.status` | enum: completed | The transcription status. |
| `data.payload.transcription_text` | string | The transcribed text |

### `callSpeakEnded`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.speak.ended | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
| `data.payload.status` | enum: completed, call_hangup, cancelled_amd | Reflects how the command ended. |

### `callSpeakStarted`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.event_type` | enum: call.speak.started | The type of event being delivered. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.payload.call_control_id` | string | Call ID used to issue commands via Call Control API. |
| `data.payload.connection_id` | string | Call Control App ID (formerly Telnyx connection ID) used in the call. |
| `data.payload.call_leg_id` | string | ID that is unique to the call and can be used to correlate webhook events. |
| `data.payload.call_session_id` | string | ID that is unique to the call session and can be used to correlate webhook events. |
| `data.payload.client_state` | string | State received from a command. |
