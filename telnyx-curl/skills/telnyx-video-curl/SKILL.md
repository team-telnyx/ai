---
name: telnyx-video-curl
description: >-
  Video rooms for real-time communication and conferencing.
metadata:
  author: telnyx
  product: video
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Video - curl

## Core Workflow

### Prerequisites

1. No phone number needed — video rooms are standalone

### Steps

1. **Create room**
2. **Generate client token**
3. **Join from client**
4. **List recordings**

### Common mistakes

- Client tokens are short-lived — generate a new one for each participant session
- Room unique_name must be globally unique — use UUIDs or prefixed names

**Related skills**: telnyx-webrtc-curl

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create a room.

Synchronously create a Room.

`POST /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unique_name` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `max_participants` | integer | No | The maximum amount of participants allowed in a room. |
| `enable_recording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "unique_name": "my-meeting-room",
      "max_participants": 10
  }' \
  "https://api.telnyx.com/v2/rooms"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create Client Token to join a room.

Synchronously create an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`, a Refresh Token is also provided to refresh a Client Token, the Refresh Token expires after `refresh_token_ttl_secs`.

`POST /rooms/{room_id}/actions/generate_join_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `token_ttl_secs` | integer | No | The time to live in seconds of the Client Token, after that ... |
| `refresh_token_ttl_secs` | integer | No | The time to live in seconds of the Refresh Token, after that... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/rooms/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/actions/generate_join_client_token"
```

Key response fields: `.data.refresh_token, .data.refresh_token_expires_at, .data.token`

## View a list of rooms.

`GET /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_sessions` | boolean | No | To decide if room sessions should be included in the respons... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/rooms?include_sessions=True"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## View a room.

`GET /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `include_sessions` | boolean | No | To decide if room sessions should be included in the respons... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/rooms/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0?include_sessions=True"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a room composition.

Asynchronously create a room composition.

`POST /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string (UUID) | No | id of the room session associated with the room composition. |
| `format` | string | No | The desired format of the room composition. |
| `resolution` | string | No | The desired resolution (width/height in pixels) of the resul... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/room_compositions"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## View a list of room compositions.

`GET /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_compositions"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## View a room composition.

`GET /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_composition_id` | string (UUID) | Yes | The unique identifier of a room composition. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_compositions/5219b3af-87c6-4c08-9b58-5a533d893e21"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a room composition.

Synchronously delete a room composition.

`DELETE /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_composition_id` | string (UUID) | Yes | The unique identifier of a room composition. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/room_compositions/5219b3af-87c6-4c08-9b58-5a533d893e21"
```

## View a list of room participants.

`GET /room_participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_participants"
```

Key response fields: `.data.id, .data.updated_at, .data.context`

## View a room participant.

`GET /room_participants/{room_participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_participant_id` | string (UUID) | Yes | The unique identifier of a room participant. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_participants/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0"
```

Key response fields: `.data.id, .data.updated_at, .data.context`

## View a list of room recordings.

`GET /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_recordings"
```

Key response fields: `.data.id, .data.status, .data.type`

## Delete several room recordings in a bulk.

`DELETE /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/room_recordings"
```

Key response fields: `.data.room_recordings`

## View a room recording.

`GET /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_recording_id` | string (UUID) | Yes | The unique identifier of a room recording. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_recordings/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0"
```

Key response fields: `.data.id, .data.status, .data.type`

## Delete a room recording.

Synchronously delete a Room Recording.

`DELETE /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_recording_id` | string (UUID) | Yes | The unique identifier of a room recording. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/room_recordings/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0"
```

## View a list of room sessions.

`GET /room_sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_participants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_sessions?include_participants=True"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## View a room session.

`GET /room_sessions/{room_session_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `include_participants` | boolean | No | To decide if room participants should be included in the res... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_sessions/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0?include_participants=True"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## End a room session.

Note: this will also kick all participants currently present in the room

`POST /room_sessions/{room_session_id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/room_sessions/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/actions/end"
```

Key response fields: `.data.result`

## Kick participants from a room session.

`POST /room_sessions/{room_session_id}/actions/kick`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/room_sessions/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/actions/kick"
```

Key response fields: `.data.result`

## Mute participants in room session.

`POST /room_sessions/{room_session_id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/room_sessions/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/actions/mute"
```

Key response fields: `.data.result`

## Unmute participants in room session.

`POST /room_sessions/{room_session_id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/room_sessions/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/actions/unmute"
```

Key response fields: `.data.result`

## View a list of room participants.

`GET /room_sessions/{room_session_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_session_id` | string (UUID) | Yes | The unique identifier of a room session. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/room_sessions/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/participants"
```

Key response fields: `.data.id, .data.updated_at, .data.context`

## Update a room.

Synchronously update a Room.

`PATCH /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `unique_name` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `max_participants` | integer | No | The maximum amount of participants allowed in a room. |
| `enable_recording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/rooms/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete a room.

Synchronously delete a Room. Participants from that room will be kicked out, they won't be able to join that room anymore, and you won't be charged anymore for that room.

`DELETE /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/rooms/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0"
```

## Refresh Client Token to join a room.

Synchronously refresh an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`.

`POST /rooms/{room_id}/actions/refresh_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refresh_token` | string | Yes |  |
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `token_ttl_secs` | integer | No | The time to live in seconds of the Client Token, after that ... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "refresh_token": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZWxueXhfdGVsZXBob255IiwiZXhwIjoxNTkwMDEwMTQzLCJpYXQiOjE1ODc1OTA5NDMsImlzcyI6InRlbG55eF90ZWxlcGhvbnkiLCJqdGkiOiJiOGM3NDgzNy1kODllLTRhNjUtOWNmMi0zNGM3YTZmYTYwYzgiLCJuYmYiOjE1ODc1OTA5NDIsInN1YiI6IjVjN2FjN2QwLWRiNjUtNGYxMS05OGUxLWVlYzBkMWQ1YzZhZSIsInRlbF90b2tlbiI6InJqX1pra1pVT1pNeFpPZk9tTHBFVUIzc2lVN3U2UmpaRmVNOXMtZ2JfeENSNTZXRktGQUppTXlGMlQ2Q0JSbWxoX1N5MGlfbGZ5VDlBSThzRWlmOE1USUlzenl6U2xfYURuRzQ4YU81MHlhSEd1UlNZYlViU1ltOVdJaVEwZz09IiwidHlwIjoiYWNjZXNzIn0.gNEwzTow5MLLPLQENytca7pUN79PmPj6FyqZWW06ZeEmesxYpwKh0xRtA0TzLh6CDYIRHrI8seofOO0YFGDhpQ"
}' \
  "https://api.telnyx.com/v2/rooms/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/actions/refresh_client_token"
```

Key response fields: `.data.token, .data.token_expires_at`

## View a list of room sessions.

`GET /rooms/{room_id}/sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room_id` | string (UUID) | Yes | The unique identifier of a room. |
| `include_participants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/rooms/0ccc7b54-4df3-4bca-a65a-3da1ecc777f0/sessions?include_participants=True"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
