---
name: telnyx-voice-conferencing-curl
description: >-
  Conference calls, queues, and multi-party sessions. Use for call centers or
  conferencing apps.
metadata:
  author: telnyx
  product: voice-conferencing
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Conferencing - curl

## Core Workflow

### Prerequisites

1. Active calls via Call Control API (see telnyx-voice-curl)

### Steps

1. **Create conference**
2. **Join participants**
3. **Mute/hold**
4. **End conference**

### Common mistakes

- First participant's call_control_id creates the conference — others join by conference ID
- Conference webhooks (conference.participant.joined, etc.) fire for lifecycle events — handle them for participant tracking
- Queue commands (enqueue/leave_queue) are also in this skill — use for call center queue management

**Related skills**: telnyx-voice-curl

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

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create conference

Create a conference from an existing call leg using a `call_control_id` and a conference name. Upon creating the conference, the call will be automatically bridged to the conference. Conferences will expire after all participants have left the conference or after 4 hours regardless of the number of active participants.

`POST /conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `name` | string | Yes | Name of the conference |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `beep_enabled` | enum (always, never, on_enter, on_exit) | No | Whether a beep sound should be played when participants join... |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_id": "v2:T02llQxIyaRkhfRKxgAP8nY511EhFLizdvdUKJiSw8d6A9BborherQczRrZvZakpWxBlpw48KyZQ==",
  "name": "Business"
}' \
  "https://api.telnyx.com/v2/conferences"
```

Key response fields: `.data.id, .data.status, .data.name`

## Join a conference

Join an existing call leg to a conference. Issue the Join Conference command with the conference ID in the path and the `call_control_id` of the leg you wish to join to the conference as an attribute. The conference can have up to a certain amount of active participants, as set by the `max_participants` parameter in conference creation request.

`POST /conferences/{id}/actions/join`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `supervisor_role` | enum (barge, monitor, none, whisper) | No | Sets the joining participant as a supervisor for the confere... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_id": "v2:T02llQxIyaRkhfRKxgAP8nY511EhFLizdvdUKJiSw8d6A9BborherQczRrZvZakpWxBlpw48KyZQ=="
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/join"
```

Key response fields: `.data.result`

## Mute conference participants

Mute a list of participants in a conference call

`POST /conferences/{id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `call_control_ids` | array[string] | No | Array of unique identifiers and tokens for controlling the c... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/mute"
```

Key response fields: `.data.result`

## Unmute conference participants

Unmute a list of participants in a conference call

`POST /conferences/{id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `call_control_ids` | array[string] | No | List of unique identifiers and tokens for controlling the ca... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/unmute"
```

Key response fields: `.data.result`

## Play audio to conference participants

Play audio to all or some participants on a conference call.

`POST /conferences/{id}/actions/play`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `audio_url` | string (URL) | No | The URL of a file to be played back in the conference. |
| `media_name` | string | No | The media_name of a file to be played back in the conference... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/play"
```

Key response fields: `.data.result`

## Speak text to conference participants

Convert text to speech and play it to all or some participants.

`POST /conferences/{id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `id` | string (UUID) | Yes | Specifies the conference by id or name |
| `payload_type` | enum (text, ssml) | No | The type of the provided payload. |
| `language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | No | The language you want spoken. |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "payload": "Say this to participants",
  "voice": "Telnyx.KokoroTTS.af"
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/speak"
```

Key response fields: `.data.result`

## Conference recording start

Start recording the conference. Recording will stop on conference end, or via the Stop Recording command. **Expected Webhooks:**

- `conference.recording.saved`

`POST /conferences/{id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (wav, mp3) | Yes | The audio file format used when storing the conference recor... |
| `id` | string (UUID) | Yes | Specifies the conference to record by id or name |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `channels` | enum (single, dual) | No | When `dual`, final audio file will be stereo recorded with t... |
| `trim` | enum (trim-silence) | No | When set to `trim-silence`, silence will be removed from the... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "format": "mp3"
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/record_start"
```

Key response fields: `.data.result`

## Conference recording stop

Stop recording the conference. **Expected Webhooks:**

- `conference.recording.saved`

`POST /conferences/{id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Specifies the conference to stop the recording for by id or ... |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Uniquely identifies the resource. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/record_stop"
```

Key response fields: `.data.result`

## End a conference

End a conference and terminate all active participants.

`POST /conferences/{id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/end"
```

Key response fields: `.data.result`

## List conferences

Lists conferences. Conferences are created on demand, and will expire after all participants have left the conference or after 4 hours regardless of the number of active participants. Conferences are listed in descending order by `expires_at`.

`GET /conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/conferences"
```

Key response fields: `.data.id, .data.status, .data.name`

## Enqueue call

Put the call in a queue.

`POST /calls/{call_control_id}/actions/enqueue`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | The name of the queue the call should be put in. |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `max_wait_time_secs` | integer | No | The number of seconds after which the call will be removed f... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "queue_name": "tier_1_support"
}' \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/enqueue"
```

Key response fields: `.data.result`

## Remove call from a queue

Removes the call from a queue.

`POST /calls/{call_control_id}/actions/leave_queue`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ/actions/leave_queue"
```

Key response fields: `.data.result`

## List conference participants

Lists conference participants

`GET /conferences/{conference_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conference_id` | string (UUID) | Yes | Uniquely identifies the conference by id |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/participants"
```

Key response fields: `.data.id, .data.status, .data.call_control_id`

## Retrieve a conference

Retrieve an existing conference

`GET /conferences/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.name`

## Gather DTMF using audio prompt in a conference

Play an audio file to a specific conference participant and gather DTMF input.

`POST /conferences/{id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call leg tha... |
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `gather_id` | string (UUID) | No | Identifier for this gather command. |
| `audio_url` | string (URL) | No | The URL of the audio file to play as the gather prompt. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_id": "v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg"
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/gather_using_audio"
```

Key response fields: `.data.result`

## Hold conference participants

Hold a list of participants in a conference call

`POST /conferences/{id}/actions/hold`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `call_control_ids` | array[string] | No | List of unique identifiers and tokens for controlling the ca... |
| `audio_url` | string (URL) | No | The URL of a file to be played to the participants when they... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/hold"
```

Key response fields: `.data.result`

## Leave a conference

Removes a call leg from a conference and moves it back to parked state. **Expected Webhooks:**

- `conference.participant.left`

`POST /conferences/{id}/actions/leave`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `beep_enabled` | enum (always, never, on_enter, on_exit) | No | Whether a beep sound should be played when the participant l... |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_id": "f91269aa-61d1-417f-97b3-10e020e8bc47"
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/leave"
```

Key response fields: `.data.result`

## Conference recording pause

Pause conference recording.

`POST /conferences/{id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Specifies the conference by id or name |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Use this field to pause specific recording. |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/record_pause"
```

Key response fields: `.data.result`

## Conference recording resume

Resume conference recording.

`POST /conferences/{id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Specifies the conference by id or name |
| `command_id` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recording_id` | string (UUID) | No | Use this field to resume specific recording. |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/record_resume"
```

Key response fields: `.data.result`

## Send DTMF to conference participants

Send DTMF tones to one or more conference participants.

`POST /conferences/{id}/actions/send_dtmf`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `digits` | string | Yes | DTMF digits to send. |
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `call_control_ids` | array[string] | No | Array of participant call control IDs to send DTMF to. |
| `duration_millis` | integer | No | Duration of each DTMF digit in milliseconds. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "digits": "1234#"
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/send_dtmf"
```

Key response fields: `.data.result`

## Stop audio being played on the conference

Stop audio being played to all or some participants on a conference call.

`POST /conferences/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `call_control_ids` | array[string] | No | List of call control ids identifying participants the audio ... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/stop"
```

Key response fields: `.data.result`

## Unhold conference participants

Unhold a list of participants in a conference call

`POST /conferences/{id}/actions/unhold`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_ids` | array[string] | Yes | List of unique identifiers and tokens for controlling the ca... |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_ids": [
    "v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ"
  ]
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/unhold"
```

Key response fields: `.data.result`

## Update conference participant

Update conference participant supervisor_role

`POST /conferences/{id}/actions/update`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `supervisor_role` | enum (barge, monitor, none, whisper) | Yes | Sets the participant as a supervisor for the conference. |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `command_id` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `whisper_call_control_ids` | array[string] | No | Array of unique call_control_ids the supervisor can whisper ... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "call_control_id": "v2:T02llQxIyaRkhfRKxgAP8nY511EhFLizdvdUKJiSw8d6A9BborherQczRrZvZakpWxBlpw48KyZQ==",
  "supervisor_role": "whisper"
}' \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/actions/update"
```

Key response fields: `.data.result`

## Retrieve a conference participant

Retrieve details of a specific conference participant by their ID or label.

`GET /conferences/{id}/participants/{participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `participant_id` | string (UUID) | Yes | Uniquely identifies the participant by their ID or label. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/participants/{participant_id}"
```

Key response fields: `.data.id, .data.status, .data.call_control_id`

## Update a conference participant

Update properties of a conference participant.

`PATCH /conferences/{id}/participants/{participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `participant_id` | string (UUID) | Yes | Uniquely identifies the participant. |
| `beep_enabled` | enum (always, never, on_enter, on_exit) | No | Whether entry/exit beeps are enabled for this participant. |
| `end_conference_on_exit` | boolean | No | Whether the conference should end when this participant exit... |
| `soft_end_conference_on_exit` | boolean | No | Whether the conference should soft-end when this participant... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/conferences/550e8400-e29b-41d4-a716-446655440000/participants/{participant_id}"
```

Key response fields: `.data.id, .data.status, .data.call_control_id`

## List queues

List all queues for the authenticated user.

`GET /queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/queues"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create a queue

Create a new call queue.

`POST /queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | The name of the queue. |
| `max_size` | integer | No | The maximum number of calls allowed in the queue. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "queue_name": "tier_1_support"
}' \
  "https://api.telnyx.com/v2/queues"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve a call queue

Retrieve an existing call queue

`GET /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | Uniquely identifies the queue by name |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/queues/{queue_name}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a queue

Update properties of an existing call queue.

`POST /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `max_size` | integer | Yes | The maximum number of calls allowed in the queue. |
| `queue_name` | string | Yes | Uniquely identifies the queue by name |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "max_size": 200
}' \
  "https://api.telnyx.com/v2/queues/{queue_name}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a queue

Delete an existing call queue.

`DELETE /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | Uniquely identifies the queue by name |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/queues/{queue_name}"
```

## Retrieve calls from a queue

Retrieve the list of calls in an existing queue

`GET /queues/{queue_name}/calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | Uniquely identifies the queue by name |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/queues/{queue_name}/calls"
```

Key response fields: `.data.to, .data.from, .data.connection_id`

## Retrieve a call from a queue

Retrieve an existing call from an existing queue

`GET /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | Uniquely identifies the queue by name |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/queues/{queue_name}/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ"
```

Key response fields: `.data.to, .data.from, .data.connection_id`

## Update queued call

Update queued call's keep_after_hangup flag

`PATCH /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | Uniquely identifies the queue by name |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `keep_after_hangup` | boolean | No | Whether the call should remain in queue after hangup. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/queues/{queue_name}/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ"
```

## Force remove a call from a queue

Removes an inactive call from a queue. If the call is no longer active, use this command to remove it from the queue.

`DELETE /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queue_name` | string | Yes | Uniquely identifies the queue by name |
| `call_control_id` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/queues/{queue_name}/calls/v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ"
```

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
| `callEnqueued` | `call.enqueued` | Call Enqueued |
| `callLeftQueue` | `call.left.queue` | Call Left Queue |
| `conferenceCreated` | `conference.created` | Conference Created |
| `conferenceEnded` | `conference.ended` | Conference Ended |
| `conferenceFloorChanged` | `conference.floor.changed` | Conference Floor Changed |
| `conferenceParticipantJoined` | `conference.participant.joined` | Conference Participant Joined |
| `conferenceParticipantLeft` | `conference.participant.left` | Conference Participant Left |
| `conferenceParticipantPlaybackEnded` | `conference.participant.playback.ended` | Conference Participant Playback Ended |
| `conferenceParticipantPlaybackStarted` | `conference.participant.playback.started` | Conference Participant Playback Started |
| `conferenceParticipantSpeakEnded` | `conference.participant.speak.ended` | Conference Participant Speak Ended |
| `conferenceParticipantSpeakStarted` | `conference.participant.speak.started` | Conference Participant Speak Started |
| `conferencePlaybackEnded` | `conference.playback.ended` | Conference Playback Ended |
| `conferencePlaybackStarted` | `conference.playback.started` | Conference Playback Started |
| `conferenceRecordingSaved` | `conference.recording.saved` | Conference Recording Saved |
| `conferenceSpeakEnded` | `conference.speak.ended` | Conference Speak Ended |
| `conferenceSpeakStarted` | `conference.speak.started` | Conference Speak Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
