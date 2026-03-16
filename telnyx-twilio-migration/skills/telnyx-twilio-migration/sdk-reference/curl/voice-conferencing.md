<!-- SDK reference: telnyx-voice-conferencing-curl -->

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +7 optional params in the API Details section below |

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
| ... | | | +10 optional params in the API Details section below |

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
| ... | | | +2 optional params in the API Details section below |

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
| ... | | | +3 optional params in the API Details section below |

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
| ... | | | +3 optional params in the API Details section below |

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
| ... | | | +1 optional params in the API Details section below |

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
| ... | | | +2 optional params in the API Details section below |

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
| ... | | | +12 optional params in the API Details section below |

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
| ... | | | +1 optional params in the API Details section below |

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

Webhook payload field definitions are in the API Details section below.

---

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
