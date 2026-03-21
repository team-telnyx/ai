<!-- SDK reference: telnyx-video-python -->

# Telnyx Video - Python

## Core Workflow

### Prerequisites

1. No phone number needed — video rooms are standalone

### Steps

1. **Create room**: `client.rooms.create(unique_name=..., max_participants=...)`
2. **Generate client token**: `client.rooms.client_tokens.create(room_id=..., token_ttl_secs=...)`
3. **Join from client**: `Use the client token in a WebRTC client SDK`
4. **List recordings**: `client.room_recordings.list()`

### Common mistakes

- Client tokens are short-lived — generate a new one for each participant session
- Room unique_name must be globally unique — use UUIDs or prefixed names

**Related skills**: telnyx-webrtc-python

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
    result = client.rooms.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a room.

Synchronously create a Room.

`client.rooms.create()` — `POST /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unique_name` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `max_participants` | integer | No | The maximum amount of participants allowed in a room. |
| `enable_recording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in the API Details section below |

```python
room = client.rooms.create(
    unique_name="my-meeting-room",
    max_participants=10,
)
print(room.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create Client Token to join a room.

Synchronously create an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`, a Refresh Token is also provided to refresh a Client Token, the Refresh Token expires after `refresh_token_ttl_secs`.

`client.rooms.actions.generate_join_client_token()` — `POST /rooms/{room_id}/actions/generate_join_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `token_ttl_secs` | integer | No | The time to live in seconds of the Client Token, after that ... |
| `refresh_token_ttl_secs` | integer | No | The time to live in seconds of the Refresh Token, after that... |

```python
response = client.rooms.actions.generate_join_client_token(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Key response fields: `response.data.refresh_token, response.data.refresh_token_expires_at, response.data.token`

## View a list of rooms.

`client.rooms.list()` — `GET /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_sessions` | boolean | No | To decide if room sessions should be included in the respons... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.rooms.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room.

`client.rooms.retrieve()` — `GET /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `include_sessions` | boolean | No | To decide if room sessions should be included in the respons... |

```python
room = client.rooms.retrieve(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a room composition.

Asynchronously create a room composition.

`client.room_compositions.create()` — `POST /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string (UUID) | No | id of the room session associated with the room composition. |
| `format` | string | No | The desired format of the room composition. |
| `resolution` | string | No | The desired resolution (width/height in pixels) of the resul... |
| ... | | | +4 optional params in the API Details section below |

```python
room_composition = client.room_compositions.create()
print(room_composition.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a list of room compositions.

`client.room_compositions.list()` — `GET /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.room_compositions.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a room composition.

`client.room_compositions.retrieve()` — `GET /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_composition_id` | string (UUID) | Yes | The unique identifier of a room composition. |

```python
room_composition = client.room_compositions.retrieve(
    "5219b3af-87c6-4c08-9b58-5a533d893e21",
)
print(room_composition.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a room composition.

Synchronously delete a room composition.

`client.room_compositions.delete()` — `DELETE /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_composition_id` | string (UUID) | Yes | The unique identifier of a room composition. |

```python
client.room_compositions.delete(
    "5219b3af-87c6-4c08-9b58-5a533d893e21",
)
```

## View a list of room participants.

`client.room_participants.list()` — `GET /room_participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.room_participants.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a room participant.

`client.room_participants.retrieve()` — `GET /room_participants/{room_participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_participant_id` | string (UUID) | Yes | The unique identifier of a room participant. |

```python
room_participant = client.room_participants.retrieve(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room_participant.data)
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a list of room recordings.

`client.room_recordings.list()` — `GET /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.room_recordings.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete several room recordings in a bulk.

`client.room_recordings.delete_bulk()` — `DELETE /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
response = client.room_recordings.delete_bulk()
print(response.data)
```

Key response fields: `response.data.room_recordings`

## View a room recording.

`client.room_recordings.retrieve()` — `GET /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_recording_id` | string (UUID) | Yes | The unique identifier of a room recording. |

```python
room_recording = client.room_recordings.retrieve(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room_recording.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a room recording.

Synchronously delete a Room Recording.

`client.room_recordings.delete()` — `DELETE /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_recording_id` | string (UUID) | Yes | The unique identifier of a room recording. |

```python
client.room_recordings.delete(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
```

## View a list of room sessions.

`client.rooms.sessions.list_0()` — `GET /room_sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_participants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.rooms.sessions.list_0()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room session.

`client.rooms.sessions.retrieve()` — `GET /room_sessions/{room_session_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `include_participants` | boolean | No | To decide if room participants should be included in the res... |

```python
session = client.rooms.sessions.retrieve(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(session.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## End a room session.

Note: this will also kick all participants currently present in the room

`client.rooms.sessions.actions.end()` — `POST /room_sessions/{room_session_id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |

```python
response = client.rooms.sessions.actions.end(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Key response fields: `response.data.result`

## Kick participants from a room session.

`client.rooms.sessions.actions.kick()` — `POST /room_sessions/{room_session_id}/actions/kick`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```python
response = client.rooms.sessions.actions.kick(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Key response fields: `response.data.result`

## Mute participants in room session.

`client.rooms.sessions.actions.mute()` — `POST /room_sessions/{room_session_id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```python
response = client.rooms.sessions.actions.mute(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Key response fields: `response.data.result`

## Unmute participants in room session.

`client.rooms.sessions.actions.unmute()` — `POST /room_sessions/{room_session_id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```python
response = client.rooms.sessions.actions.unmute(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Key response fields: `response.data.result`

## View a list of room participants.

`client.rooms.sessions.retrieve_participants()` — `GET /room_sessions/{room_session_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.rooms.sessions.retrieve_participants(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## Update a room.

Synchronously update a Room.

`client.rooms.update()` — `PATCH /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `unique_name` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `max_participants` | integer | No | The maximum amount of participants allowed in a room. |
| `enable_recording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in the API Details section below |

```python
room = client.rooms.update(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a room.

Synchronously delete a Room. Participants from that room will be kicked out, they won't be able to join that room anymore, and you won't be charged anymore for that room.

`client.rooms.delete()` — `DELETE /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |

```python
client.rooms.delete(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
```

## Refresh Client Token to join a room.

Synchronously refresh an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`.

`client.rooms.actions.refresh_client_token()` — `POST /rooms/{room_id}/actions/refresh_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refresh_token` | string | Yes |  |
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `token_ttl_secs` | integer | No | The time to live in seconds of the Client Token, after that ... |

```python
response = client.rooms.actions.refresh_client_token(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
    refresh_token="eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZWxueXhfdGVsZXBob255IiwiZXhwIjoxNTkwMDEwMTQzLCJpYXQiOjE1ODc1OTA5NDMsImlzcyI6InRlbG55eF90ZWxlcGhvbnkiLCJqdGkiOiJiOGM3NDgzNy1kODllLTRhNjUtOWNmMi0zNGM3YTZmYTYwYzgiLCJuYmYiOjE1ODc1OTA5NDIsInN1YiI6IjVjN2FjN2QwLWRiNjUtNGYxMS05OGUxLWVlYzBkMWQ1YzZhZSIsInRlbF90b2tlbiI6InJqX1pra1pVT1pNeFpPZk9tTHBFVUIzc2lVN3U2UmpaRmVNOXMtZ2JfeENSNTZXRktGQUppTXlGMlQ2Q0JSbWxoX1N5MGlfbGZ5VDlBSThzRWlmOE1USUlzenl6U2xfYURuRzQ4YU81MHlhSEd1UlNZYlViU1ltOVdJaVEwZz09IiwidHlwIjoiYWNjZXNzIn0.gNEwzTow5MLLPLQENytca7pUN79PmPj6FyqZWW06ZeEmesxYpwKh0xRtA0TzLh6CDYIRHrI8seofOO0YFGDhpQ",
)
print(response.data)
```

Key response fields: `response.data.token, response.data.token_expires_at`

## View a list of room sessions.

`client.rooms.sessions.list_1()` — `GET /rooms/{room_id}/sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `include_participants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.rooms.sessions.list_1(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

# Video (Python) — API Details

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

### Create a room composition. — `client.room_compositions.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | The desired format of the room composition. |
| `resolution` | string | The desired resolution (width/height in pixels) of the resulting video of the... |
| `session_id` | string (UUID) | id of the room session associated with the room composition. |
| `video_layout` | object | Describes the video layout of the room composition in terms of regions. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this room composition will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this room composition will be sent... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |

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
| `unique_name` | string | The unique (within the Telnyx account scope) name of the room. |
| `max_participants` | integer | The maximum amount of participants allowed in a room. |
| `enable_recording` | boolean | Enable or disable recording for that room. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this room will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Update a room. — `client.rooms.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `unique_name` | string | The unique (within the Telnyx account scope) name of the room. |
| `max_participants` | integer | The maximum amount of participants allowed in a room. |
| `enable_recording` | boolean | Enable or disable recording for that room. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this room will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this room will be sent if sending ... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |

### Create Client Token to join a room. — `client.rooms.actions.generate_join_client_token()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_ttl_secs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
| `refresh_token_ttl_secs` | integer | The time to live in seconds of the Refresh Token, after that time the Refresh... |

### Refresh Client Token to join a room. — `client.rooms.actions.refresh_client_token()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_ttl_secs` | integer | The time to live in seconds of the Client Token, after that time the Client T... |
