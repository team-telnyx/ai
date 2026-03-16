# Video (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** View a list of room compositions., Create a room composition., View a room composition.

| Field | Type |
|-------|------|
| `completed_at` | date-time |
| `created_at` | date-time |
| `download_url` | string |
| `duration_secs` | integer |
| `ended_at` | date-time |
| `format` | enum: mp4 |
| `id` | uuid |
| `record_type` | string |
| `resolution` | string |
| `room_id` | uuid |
| `session_id` | uuid |
| `size_mb` | float |
| `started_at` | date-time |
| `status` | enum: completed, enqueued, processing |
| `updated_at` | date-time |
| `user_id` | uuid |
| `video_layout` | object |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer |

**Returned by:** View a list of room participants., View a room participant., View a list of room participants.

| Field | Type |
|-------|------|
| `context` | string |
| `id` | uuid |
| `joined_at` | date-time |
| `left_at` | date-time |
| `record_type` | string |
| `session_id` | uuid |
| `updated_at` | date-time |

**Returned by:** View a list of room recordings., View a room recording.

| Field | Type |
|-------|------|
| `codec` | string |
| `completed_at` | date-time |
| `created_at` | date-time |
| `download_url` | string |
| `duration_secs` | integer |
| `ended_at` | date-time |
| `id` | uuid |
| `participant_id` | uuid |
| `record_type` | string |
| `room_id` | uuid |
| `session_id` | uuid |
| `size_mb` | float |
| `started_at` | date-time |
| `status` | enum: completed, processing |
| `type` | enum: audio, video |
| `updated_at` | date-time |

**Returned by:** Delete several room recordings in a bulk.

| Field | Type |
|-------|------|
| `room_recordings` | integer |

**Returned by:** View a list of room sessions., View a room session., View a list of room sessions.

| Field | Type |
|-------|------|
| `active` | boolean |
| `created_at` | date-time |
| `ended_at` | date-time |
| `id` | uuid |
| `participants` | array[object] |
| `record_type` | string |
| `room_id` | uuid |
| `updated_at` | date-time |

**Returned by:** End a room session., Kick participants from a room session., Mute participants in room session., Unmute participants in room session.

| Field | Type |
|-------|------|
| `result` | string |

**Returned by:** View a list of rooms., Create a room., View a room., Update a room.

| Field | Type |
|-------|------|
| `active_session_id` | uuid |
| `created_at` | date-time |
| `enable_recording` | boolean |
| `id` | uuid |
| `max_participants` | integer |
| `record_type` | string |
| `sessions` | array[object] |
| `unique_name` | string |
| `updated_at` | date-time |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer |

**Returned by:** Create Client Token to join a room.

| Field | Type |
|-------|------|
| `refresh_token` | string |
| `refresh_token_expires_at` | date-time |
| `token` | string |
| `token_expires_at` | date-time |

**Returned by:** Refresh Client Token to join a room.

| Field | Type |
|-------|------|
| `token` | string |
| `token_expires_at` | date-time |

## Optional Parameters

### Create a room composition. — `client.RoomCompositions.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Format` | string | The desired format of the room composition. |
| `Resolution` | string | The desired resolution (width/height in pixels) of the resulting video of the... |
| `SessionId` | string (UUID) | id of the room session associated with the room composition. |
| `VideoLayout` | object | Describes the video layout of the room composition in terms of regions. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this room composition will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room composition will be sent... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Kick participants from a room session. — `client.Rooms.Sessions.Actions.Kick()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `Exclude` | array[string] | List of participant id to exclude from the action. |

### Mute participants in room session. — `client.Rooms.Sessions.Actions.Mute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `Exclude` | array[string] | List of participant id to exclude from the action. |

### Unmute participants in room session. — `client.Rooms.Sessions.Actions.Unmute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `Exclude` | array[string] | List of participant id to exclude from the action. |

### Create a room. — `client.Rooms.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `UniqueName` | string | The unique (within the Telnyx account scope) name of the room. |
| `MaxParticipants` | integer | The maximum amount of participants allowed in a room. |
| `EnableRecording` | boolean | Enable or disable recording for that room. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this room will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Update a room. — `client.Rooms.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `UniqueName` | string | The unique (within the Telnyx account scope) name of the room. |
| `MaxParticipants` | integer | The maximum amount of participants allowed in a room. |
| `EnableRecording` | boolean | Enable or disable recording for that room. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this room will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Create Client Token to join a room. — `client.Rooms.Actions.GenerateJoinClientToken()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TokenTtlSecs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
| `RefreshTokenTtlSecs` | integer | The time to live in seconds of the Refresh Token, after that time the Refresh... |

### Refresh Client Token to join a room. — `client.Rooms.Actions.RefreshClientToken()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TokenTtlSecs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
