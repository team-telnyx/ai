<!-- SDK reference: telnyx-video-python -->

# Telnyx Video - Python

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
    public_key=os.environ.get("TELNYX_PUBLIC_KEY"),  # Required for client.webhooks.unwrap() (webhook verification)
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.messages.send(to="+13125550001", from_="+13125550002", text="Hello")
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
    raise
except telnyx.RateLimitError:
    # 429: rate limited — wait, then retry the request (bounded exponential backoff)
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
    # ...retry the call here (give up after a few attempts); otherwise re-raise:
    raise
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
    raise  # A failed request must never look like success to the caller
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## View a list of room compositions.

Returns a paginated list of room compositions. Filter compositions by creation date, room session, or processing status.

`GET /room_compositions`

```python
page = client.room_compositions.list()
page = page.data[0]
print(page.id)
```

Returns: `completed_at` (date-time), `created_at` (date-time), `download_url` (string), `duration_secs` (integer), `ended_at` (date-time), `format` (enum: mp4), `id` (uuid), `record_type` (string), `resolution` (string), `room_id` (uuid), `session_id` (uuid), `size_mb` (float), `started_at` (date-time), `status` (enum: completed, enqueued, processing), `updated_at` (date-time), `user_id` (uuid), `video_layout` (object), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## Create a room composition.

Asynchronously create a room composition.

`POST /room_compositions`

Optional: `format` (string), `resolution` (string), `session_id` (uuid), `video_layout` (object), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

```python
room_composition = client.room_compositions.create()
print(room_composition.data)
```

Returns: `completed_at` (date-time), `created_at` (date-time), `download_url` (string), `duration_secs` (integer), `ended_at` (date-time), `format` (enum: mp4), `id` (uuid), `record_type` (string), `resolution` (string), `room_id` (uuid), `session_id` (uuid), `size_mb` (float), `started_at` (date-time), `status` (enum: completed, enqueued, processing), `updated_at` (date-time), `user_id` (uuid), `video_layout` (object), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## View a room composition.

Returns the composition identified by `room_composition_id`, including its room and session, processing status, media details, video layout, lifecycle timestamps, and download URL.

`GET /room_compositions/{room_composition_id}`

```python
room_composition = client.room_compositions.retrieve(
    "5219b3af-87c6-4c08-9b58-5a533d893e21",
)
print(room_composition.data)
```

Returns: `completed_at` (date-time), `created_at` (date-time), `download_url` (string), `duration_secs` (integer), `ended_at` (date-time), `format` (enum: mp4), `id` (uuid), `record_type` (string), `resolution` (string), `room_id` (uuid), `session_id` (uuid), `size_mb` (float), `started_at` (date-time), `status` (enum: completed, enqueued, processing), `updated_at` (date-time), `user_id` (uuid), `video_layout` (object), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## Delete a room composition.

Synchronously delete a room composition.

`DELETE /room_compositions/{room_composition_id}`

```python
client.room_compositions.delete(
    "5219b3af-87c6-4c08-9b58-5a533d893e21",
)
```

## View a list of room participants.

Returns a paginated list of room participants across sessions. Filter participants by session, join, update, or leave date and by participant context.

`GET /room_participants`

```python
page = client.room_participants.list()
page = page.data[0]
print(page.id)
```

Returns: `context` (string), `id` (uuid), `joined_at` (date-time), `left_at` (date-time), `record_type` (string), `session_id` (uuid), `updated_at` (date-time)

## View a room participant.

Returns the participant identified by `room_participant_id`, including its session, context, and join, update, and leave timestamps.

`GET /room_participants/{room_participant_id}`

```python
room_participant = client.room_participants.retrieve(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room_participant.data)
```

Returns: `context` (string), `id` (uuid), `joined_at` (date-time), `left_at` (date-time), `record_type` (string), `session_id` (uuid), `updated_at` (date-time)

## View a list of room recordings.

Returns a paginated list of room recordings. Filter recordings by room, session, participant, recording type, status, duration, or start and end dates.

`GET /room_recordings`

```python
page = client.room_recordings.list()
page = page.data[0]
print(page.id)
```

Returns: `codec` (string), `completed_at` (date-time), `created_at` (date-time), `download_url` (string), `duration_secs` (integer), `ended_at` (date-time), `id` (uuid), `participant_id` (uuid), `record_type` (string), `room_id` (uuid), `session_id` (uuid), `size_mb` (float), `started_at` (date-time), `status` (enum: completed, processing), `type` (enum: audio, video), `updated_at` (date-time)

## Delete several room recordings in a bulk.

Deletes the room recordings that match the supplied filters and returns the number of recordings affected. Filters support room, session, participant, recording type, status, duration, and start or end dates.

`DELETE /room_recordings`

```python
response = client.room_recordings.delete_bulk()
print(response.data)
```

Returns: `room_recordings` (integer)

## View a room recording.

Returns the recording identified by `room_recording_id`, including its room, session, participant, status, media details, lifecycle timestamps, and download URL.

`GET /room_recordings/{room_recording_id}`

```python
room_recording = client.room_recordings.retrieve(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room_recording.data)
```

Returns: `codec` (string), `completed_at` (date-time), `created_at` (date-time), `download_url` (string), `duration_secs` (integer), `ended_at` (date-time), `id` (uuid), `participant_id` (uuid), `record_type` (string), `room_id` (uuid), `session_id` (uuid), `size_mb` (float), `started_at` (date-time), `status` (enum: completed, processing), `type` (enum: audio, video), `updated_at` (date-time)

## Delete a room recording.

Synchronously deletes the specified video room recording. The recording's media is removed permanently.

`DELETE /room_recordings/{room_recording_id}`

```python
client.room_recordings.delete(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
```

## View a list of room sessions.

Returns a paginated list of room sessions across the account. Filter sessions by room, creation, update, or end date and active status, and use `include_participants` to include participant records.

`GET /room_sessions`

```python
page = client.rooms.sessions.list_0()
page = page.data[0]
print(page.id)
```

Returns: `active` (boolean), `created_at` (date-time), `ended_at` (date-time), `id` (uuid), `participants` (array[object]), `record_type` (string), `room_id` (uuid), `updated_at` (date-time)

## View a room session.

Returns the room session identified by `room_session_id`, including its room, active status, and lifecycle timestamps. Use `include_participants` to include its participant records.

`GET /room_sessions/{room_session_id}`

```python
session = client.rooms.sessions.retrieve(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(session.data)
```

Returns: `active` (boolean), `created_at` (date-time), `ended_at` (date-time), `id` (uuid), `participants` (array[object]), `record_type` (string), `room_id` (uuid), `updated_at` (date-time)

## End a room session.

Note: this will also kick all participants currently present in the room

`POST /room_sessions/{room_session_id}/actions/end`

```python
response = client.rooms.sessions.actions.end(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Returns: `result` (string)

## Kick participants from a room session.

Removes the selected participants from the specified room session. Apply the action to a list of participant IDs or to `all`, with optional participant IDs excluded from the action.

`POST /room_sessions/{room_session_id}/actions/kick`

Optional: `exclude` (array[string]), `participants` (object)

```python
response = client.rooms.sessions.actions.kick(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Returns: `result` (string)

## Mute participants in room session.

Mutes the selected participants in the specified room session. Apply the action to a list of participant IDs or to `all`, with optional participant IDs excluded from the action.

`POST /room_sessions/{room_session_id}/actions/mute`

Optional: `exclude` (array[string]), `participants` (object)

```python
response = client.rooms.sessions.actions.mute(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Returns: `result` (string)

## Unmute participants in room session.

Unmutes the selected participants in the specified room session. Apply the action to a list of participant IDs or to `all`, with optional participant IDs excluded from the action.

`POST /room_sessions/{room_session_id}/actions/unmute`

Optional: `exclude` (array[string]), `participants` (object)

```python
response = client.rooms.sessions.actions.unmute(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Returns: `result` (string)

## View a list of room participants.

Returns a paginated list of participants for the specified room session. Filter participants by join, update, or leave date and by participant context.

`GET /room_sessions/{room_session_id}/participants`

```python
page = client.rooms.sessions.retrieve_participants(
    room_session_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
page = page.data[0]
print(page.id)
```

Returns: `context` (string), `id` (uuid), `joined_at` (date-time), `left_at` (date-time), `record_type` (string), `session_id` (uuid), `updated_at` (date-time)

## View a list of rooms.

Returns a paginated list of rooms. Filter the results by creation or update date and unique name, and use `include_sessions` to include each room’s sessions.

`GET /rooms`

```python
page = client.rooms.list()
page = page.data[0]
print(page.id)
```

Returns: `active_session_id` (uuid), `created_at` (date-time), `enable_recording` (boolean), `id` (uuid), `max_participants` (integer), `record_type` (string), `sessions` (array[object]), `unique_name` (string), `updated_at` (date-time), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## Create a room.

Synchronously creates a new video room with the provided configuration and returns the created room.

`POST /rooms`

Optional: `enable_recording` (boolean), `max_participants` (integer), `unique_name` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

```python
room = client.rooms.create(
    unique_name="my-meeting-room",
    max_participants=10,
)
print(room.data)
```

Returns: `active_session_id` (uuid), `created_at` (date-time), `enable_recording` (boolean), `id` (uuid), `max_participants` (integer), `record_type` (string), `sessions` (array[object]), `unique_name` (string), `updated_at` (date-time), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## View a room.

Returns the room identified by `room_id`, including its participant limit, recording and webhook configuration, and active session identifier. Use `include_sessions` to include its sessions.

`GET /rooms/{room_id}`

```python
room = client.rooms.retrieve(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room.data)
```

Returns: `active_session_id` (uuid), `created_at` (date-time), `enable_recording` (boolean), `id` (uuid), `max_participants` (integer), `record_type` (string), `sessions` (array[object]), `unique_name` (string), `updated_at` (date-time), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## Update a room.

Synchronously updates the specified video room's configuration and returns the updated room.

`PATCH /rooms/{room_id}`

Optional: `enable_recording` (boolean), `max_participants` (integer), `unique_name` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

```python
room = client.rooms.update(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(room.data)
```

Returns: `active_session_id` (uuid), `created_at` (date-time), `enable_recording` (boolean), `id` (uuid), `max_participants` (integer), `record_type` (string), `sessions` (array[object]), `unique_name` (string), `updated_at` (date-time), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer)

## Delete a room.

Synchronously delete a Room. Participants from that room will be kicked out, they won't be able to join that room anymore, and you won't be charged anymore for that room.

`DELETE /rooms/{room_id}`

```python
client.rooms.delete(
    "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
```

## Create Client Token to join a room.

Synchronously create an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`, a Refresh Token is also provided to refresh a Client Token, the Refresh Token expires after `refresh_token_ttl_secs`.

`POST /rooms/{room_id}/actions/generate_join_client_token`

Optional: `refresh_token_ttl_secs` (integer), `token_ttl_secs` (integer)

```python
response = client.rooms.actions.generate_join_client_token(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
print(response.data)
```

Returns: `refresh_token` (string), `refresh_token_expires_at` (date-time), `token` (string), `token_expires_at` (date-time)

## Refresh Client Token to join a room.

Synchronously refresh an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`.

`POST /rooms/{room_id}/actions/refresh_client_token` — Required: `refresh_token`

Optional: `token_ttl_secs` (integer)

```python
response = client.rooms.actions.refresh_client_token(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
    refresh_token="eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZWxueXhfdGVsZXBob255IiwiZXhwIjoxNTkwMDEwMTQzLCJpYXQiOjE1ODc1OTA5NDMsImlzcyI6InRlbG55eF90ZWxlcGhvbnkiLCJqdGkiOiJiOGM3NDgzNy1kODllLTRhNjUtOWNmMi0zNGM3YTZmYTYwYzgiLCJuYmYiOjE1ODc1OTA5NDIsInN1YiI6IjVjN2FjN2QwLWRiNjUtNGYxMS05OGUxLWVlYzBkMWQ1YzZhZSIsInRlbF90b2tlbiI6InJqX1pra1pVT1pNeFpPZk9tTHBFVUIzc2lVN3U2UmpaRmVNOXMtZ2JfeENSNTZXRktGQUppTXlGMlQ2Q0JSbWxoX1N5MGlfbGZ5VDlBSThzRWlmOE1USUlzenl6U2xfYURuRzQ4YU81MHlhSEd1UlNZYlViU1ltOVdJaVEwZz09IiwidHlwIjoiYWNjZXNzIn0.gNEwzTow5MLLPLQENytca7pUN79PmPj6FyqZWW06ZeEmesxYpwKh0xRtA0TzLh6CDYIRHrI8seofOO0YFGDhpQ",
)
print(response.data)
```

Returns: `token` (string), `token_expires_at` (date-time)

## View a list of room sessions.

Returns a paginated list of sessions for the specified room. Filter sessions by creation, update, or end date and active status, and use `include_participants` to include participant records.

`GET /rooms/{room_id}/sessions`

```python
page = client.rooms.sessions.list_1(
    room_id="0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
)
page = page.data[0]
print(page.id)
```

Returns: `active` (boolean), `created_at` (date-time), `ended_at` (date-time), `id` (uuid), `participants` (array[object]), `record_type` (string), `room_id` (uuid), `updated_at` (date-time)
