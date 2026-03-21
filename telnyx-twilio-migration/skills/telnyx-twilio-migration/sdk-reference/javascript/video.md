<!-- SDK reference: telnyx-video-javascript -->

# Telnyx Video - JavaScript

## Core Workflow

### Prerequisites

1. No phone number needed — video rooms are standalone

### Steps

1. **Create room**: `client.rooms.create({uniqueName: ..., maxParticipants: ...})`
2. **Generate client token**: `client.rooms.clientTokens.create({roomId: ..., tokenTtlSecs: ...})`
3. **Join from client**: `Use the client token in a WebRTC client SDK`
4. **List recordings**: `client.roomRecordings.list()`

### Common mistakes

- Client tokens are short-lived — generate a new one for each participant session
- Room unique_name must be globally unique — use UUIDs or prefixed names

**Related skills**: telnyx-webrtc-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.rooms.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a room.

Synchronously create a Room.

`client.rooms.create()` — `POST /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uniqueName` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `maxParticipants` | integer | No | The maximum amount of participants allowed in a room. |
| `enableRecording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in the API Details section below |

```javascript
const room = await client.rooms.create({
    uniqueName: 'my-meeting-room',
    maxParticipants: 10,
});

console.log(room.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create Client Token to join a room.

Synchronously create an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`, a Refresh Token is also provided to refresh a Client Token, the Refresh Token expires after `refresh_token_ttl_secs`.

`client.rooms.actions.generateJoinClientToken()` — `POST /rooms/{room_id}/actions/generate_join_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `tokenTtlSecs` | integer | No | The time to live in seconds of the Client Token, after that ... |
| `refreshTokenTtlSecs` | integer | No | The time to live in seconds of the Refresh Token, after that... |

```javascript
const response = await client.rooms.actions.generateJoinClientToken(
  '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
);

console.log(response.data);
```

Key response fields: `response.data.refresh_token, response.data.refresh_token_expires_at, response.data.token`

## View a list of rooms.

`client.rooms.list()` — `GET /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeSessions` | boolean | No | To decide if room sessions should be included in the respons... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const room of client.rooms.list()) {
  console.log(room.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room.

`client.rooms.retrieve()` — `GET /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `includeSessions` | boolean | No | To decide if room sessions should be included in the respons... |

```javascript
const room = await client.rooms.retrieve('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(room.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a room composition.

Asynchronously create a room composition.

`client.roomCompositions.create()` — `POST /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string (UUID) | No | id of the room session associated with the room composition. |
| `format` | string | No | The desired format of the room composition. |
| `resolution` | string | No | The desired resolution (width/height in pixels) of the resul... |
| ... | | | +4 optional params in the API Details section below |

```javascript
const roomComposition = await client.roomCompositions.create();

console.log(roomComposition.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a list of room compositions.

`client.roomCompositions.list()` — `GET /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const roomComposition of client.roomCompositions.list()) {
  console.log(roomComposition.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a room composition.

`client.roomCompositions.retrieve()` — `GET /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomCompositionId` | string (UUID) | Yes | The unique identifier of a room composition. |

```javascript
const roomComposition = await client.roomCompositions.retrieve(
  '5219b3af-87c6-4c08-9b58-5a533d893e21',
);

console.log(roomComposition.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a room composition.

Synchronously delete a room composition.

`client.roomCompositions.delete()` — `DELETE /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomCompositionId` | string (UUID) | Yes | The unique identifier of a room composition. |

```javascript
await client.roomCompositions.delete('5219b3af-87c6-4c08-9b58-5a533d893e21');
```

## View a list of room participants.

`client.roomParticipants.list()` — `GET /room_participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const roomParticipant of client.roomParticipants.list()) {
  console.log(roomParticipant.id);
}
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a room participant.

`client.roomParticipants.retrieve()` — `GET /room_participants/{room_participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomParticipantId` | string (UUID) | Yes | The unique identifier of a room participant. |

```javascript
const roomParticipant = await client.roomParticipants.retrieve(
  '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
);

console.log(roomParticipant.data);
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a list of room recordings.

`client.roomRecordings.list()` — `GET /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const roomRecordingListResponse of client.roomRecordings.list()) {
  console.log(roomRecordingListResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete several room recordings in a bulk.

`client.roomRecordings.deleteBulk()` — `DELETE /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
const response = await client.roomRecordings.deleteBulk();

console.log(response.data);
```

Key response fields: `response.data.room_recordings`

## View a room recording.

`client.roomRecordings.retrieve()` — `GET /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomRecordingId` | string (UUID) | Yes | The unique identifier of a room recording. |

```javascript
const roomRecording = await client.roomRecordings.retrieve('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(roomRecording.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a room recording.

Synchronously delete a Room Recording.

`client.roomRecordings.delete()` — `DELETE /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomRecordingId` | string (UUID) | Yes | The unique identifier of a room recording. |

```javascript
await client.roomRecordings.delete('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');
```

## View a list of room sessions.

`client.rooms.sessions.list0()` — `GET /room_sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeParticipants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const roomSession of client.rooms.sessions.list0()) {
  console.log(roomSession.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room session.

`client.rooms.sessions.retrieve()` — `GET /room_sessions/{room_session_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `includeParticipants` | boolean | No | To decide if room participants should be included in the res... |

```javascript
const session = await client.rooms.sessions.retrieve('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(session.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## End a room session.

Note: this will also kick all participants currently present in the room

`client.rooms.sessions.actions.end()` — `POST /room_sessions/{room_session_id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |

```javascript
const response = await client.rooms.sessions.actions.end('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(response.data);
```

Key response fields: `response.data.result`

## Kick participants from a room session.

`client.rooms.sessions.actions.kick()` — `POST /room_sessions/{room_session_id}/actions/kick`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```javascript
const response = await client.rooms.sessions.actions.kick('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(response.data);
```

Key response fields: `response.data.result`

## Mute participants in room session.

`client.rooms.sessions.actions.mute()` — `POST /room_sessions/{room_session_id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```javascript
const response = await client.rooms.sessions.actions.mute('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(response.data);
```

Key response fields: `response.data.result`

## Unmute participants in room session.

`client.rooms.sessions.actions.unmute()` — `POST /room_sessions/{room_session_id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```javascript
const response = await client.rooms.sessions.actions.unmute('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(response.data);
```

Key response fields: `response.data.result`

## View a list of room participants.

`client.rooms.sessions.retrieveParticipants()` — `GET /room_sessions/{room_session_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const roomParticipant of client.rooms.sessions.retrieveParticipants(
  '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
)) {
  console.log(roomParticipant.id);
}
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## Update a room.

Synchronously update a Room.

`client.rooms.update()` — `PATCH /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `uniqueName` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `maxParticipants` | integer | No | The maximum amount of participants allowed in a room. |
| `enableRecording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in the API Details section below |

```javascript
const room = await client.rooms.update('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');

console.log(room.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a room.

Synchronously delete a Room. Participants from that room will be kicked out, they won't be able to join that room anymore, and you won't be charged anymore for that room.

`client.rooms.delete()` — `DELETE /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |

```javascript
await client.rooms.delete('0ccc7b54-4df3-4bca-a65a-3da1ecc777f0');
```

## Refresh Client Token to join a room.

Synchronously refresh an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`.

`client.rooms.actions.refreshClientToken()` — `POST /rooms/{room_id}/actions/refresh_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refreshToken` | string | Yes |  |
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `tokenTtlSecs` | integer | No | The time to live in seconds of the Client Token, after that ... |

```javascript
const response = await client.rooms.actions.refreshClientToken(
  '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
  {
    refresh_token:
      'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZWxueXhfdGVsZXBob255IiwiZXhwIjoxNTkwMDEwMTQzLCJpYXQiOjE1ODc1OTA5NDMsImlzcyI6InRlbG55eF90ZWxlcGhvbnkiLCJqdGkiOiJiOGM3NDgzNy1kODllLTRhNjUtOWNmMi0zNGM3YTZmYTYwYzgiLCJuYmYiOjE1ODc1OTA5NDIsInN1YiI6IjVjN2FjN2QwLWRiNjUtNGYxMS05OGUxLWVlYzBkMWQ1YzZhZSIsInRlbF90b2tlbiI6InJqX1pra1pVT1pNeFpPZk9tTHBFVUIzc2lVN3U2UmpaRmVNOXMtZ2JfeENSNTZXRktGQUppTXlGMlQ2Q0JSbWxoX1N5MGlfbGZ5VDlBSThzRWlmOE1USUlzenl6U2xfYURuRzQ4YU81MHlhSEd1UlNZYlViU1ltOVdJaVEwZz09IiwidHlwIjoiYWNjZXNzIn0.gNEwzTow5MLLPLQENytca7pUN79PmPj6FyqZWW06ZeEmesxYpwKh0xRtA0TzLh6CDYIRHrI8seofOO0YFGDhpQ',
  },
);

console.log(response.data);
```

Key response fields: `response.data.token, response.data.token_expires_at`

## View a list of room sessions.

`client.rooms.sessions.list1()` — `GET /rooms/{room_id}/sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `includeParticipants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const roomSession of client.rooms.sessions.list1(
  '0ccc7b54-4df3-4bca-a65a-3da1ecc777f0',
)) {
  console.log(roomSession.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

# Video (JavaScript) — API Details

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

### Create a room composition. — `client.roomCompositions.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | The desired format of the room composition. |
| `resolution` | string | The desired resolution (width/height in pixels) of the resulting video of the... |
| `sessionId` | string (UUID) | id of the room session associated with the room composition. |
| `videoLayout` | object | Describes the video layout of the room composition in terms of regions. |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this room composition will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room composition will be sent... |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Kick participants from a room session. — `client.rooms.sessions.actions.kick()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `exclude` | array[string] | List of participant id to exclude from the action. |

### Mute participants in room session. — `client.rooms.sessions.actions.mute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `exclude` | array[string] | List of participant id to exclude from the action. |

### Unmute participants in room session. — `client.rooms.sessions.actions.unmute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `participants` | object | Either a list of participant id to perform the action on, or the keyword "all... |
| `exclude` | array[string] | List of participant id to exclude from the action. |

### Create a room. — `client.rooms.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `uniqueName` | string | The unique (within the Telnyx account scope) name of the room. |
| `maxParticipants` | integer | The maximum amount of participants allowed in a room. |
| `enableRecording` | boolean | Enable or disable recording for that room. |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this room will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Update a room. — `client.rooms.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `uniqueName` | string | The unique (within the Telnyx account scope) name of the room. |
| `maxParticipants` | integer | The maximum amount of participants allowed in a room. |
| `enableRecording` | boolean | Enable or disable recording for that room. |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this room will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Create Client Token to join a room. — `client.rooms.actions.generateJoinClientToken()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenTtlSecs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
| `refreshTokenTtlSecs` | integer | The time to live in seconds of the Refresh Token, after that time the Refresh... |

### Refresh Client Token to join a room. — `client.rooms.actions.refreshClientToken()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenTtlSecs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
