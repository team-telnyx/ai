---
name: telnyx-voice-conferencing-javascript
description: >-
  Conference calls, queues, and multi-party sessions. Use for call centers or
  conferencing apps.
metadata:
  author: telnyx
  product: voice-conferencing
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Voice Conferencing - JavaScript

## Core Workflow

### Prerequisites

1. Active calls via Call Control API (see telnyx-voice-javascript)

### Steps

1. **Create conference**: `client.conferences.create({callControlId: ..., name: ...})`
2. **Join participants**: `Additional calls join via the conference ID or name`
3. **Mute/hold**: `client.conferences.mute({id: ...})`
4. **End conference**: `client.conferences.leave({id: ..., callControlIds: [...]})`

### Common mistakes

- First participant's call_control_id creates the conference — others join by conference ID
- Conference webhooks (conference.participant.joined, etc.) fire for lifecycle events — handle them for participant tracking
- Queue commands (enqueue/leave_queue) are also in this skill — use for call center queue management

**Related skills**: telnyx-voice-javascript

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
  const result = await client.conferences.create(params);
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

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create conference

Create a conference from an existing call leg using a `call_control_id` and a conference name. Upon creating the conference, the call will be automatically bridged to the conference. Conferences will expire after all participants have left the conference or after 4 hours regardless of the number of active participants.

`client.conferences.create()` — `POST /conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `name` | string | Yes | Name of the conference |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `beepEnabled` | enum (always, never, on_enter, on_exit) | No | Whether a beep sound should be played when participants join... |
| `commandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const conference = await client.conferences.create({
  call_control_id: 'v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg',
  name: 'Business',
});

console.log(conference.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Join a conference

Join an existing call leg to a conference. Issue the Join Conference command with the conference ID in the path and the `call_control_id` of the leg you wish to join to the conference as an attribute. The conference can have up to a certain amount of active participants, as set by the `max_participants` parameter in conference creation request.

`client.conferences.actions.join()` — `POST /conferences/{id}/actions/join`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `supervisorRole` | enum (barge, monitor, none, whisper) | No | Sets the joining participant as a supervisor for the confere... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.join('id', {
  call_control_id: 'v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg',
});

console.log(response.data);
```

Key response fields: `response.data.result`

## Mute conference participants

Mute a list of participants in a conference call

`client.conferences.actions.mute()` — `POST /conferences/{id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `callControlIds` | array[string] | No | Array of unique identifiers and tokens for controlling the c... |

```javascript
const response = await client.conferences.actions.mute('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Unmute conference participants

Unmute a list of participants in a conference call

`client.conferences.actions.unmute()` — `POST /conferences/{id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `callControlIds` | array[string] | No | List of unique identifiers and tokens for controlling the ca... |

```javascript
const response = await client.conferences.actions.unmute('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Play audio to conference participants

Play audio to all or some participants on a conference call.

`client.conferences.actions.play()` — `POST /conferences/{id}/actions/play`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `audioUrl` | string (URL) | No | The URL of a file to be played back in the conference. |
| `mediaName` | string | No | The media_name of a file to be played back in the conference... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.play('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Speak text to conference participants

Convert text to speech and play it to all or some participants.

`client.conferences.actions.speak()` — `POST /conferences/{id}/actions/speak`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | Yes | The text or SSML to be converted into speech. |
| `voice` | string | Yes | Specifies the voice used in speech synthesis. |
| `id` | string (UUID) | Yes | Specifies the conference by id or name |
| `payloadType` | enum (text, ssml) | No | The type of the provided payload. |
| `language` | enum (arb, cmn-CN, cy-GB, da-DK, de-DE, ...) | No | The language you want spoken. |
| `commandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.speak('id', {
  payload: 'Say this to participants',
  voice: 'female',
});

console.log(response.data);
```

Key response fields: `response.data.result`

## Conference recording start

Start recording the conference. Recording will stop on conference end, or via the Stop Recording command. **Expected Webhooks:**

- `conference.recording.saved`

`client.conferences.actions.recordStart()` — `POST /conferences/{id}/actions/record_start`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum (wav, mp3) | Yes | The audio file format used when storing the conference recor... |
| `id` | string (UUID) | Yes | Specifies the conference to record by id or name |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `channels` | enum (single, dual) | No | When `dual`, final audio file will be stereo recorded with t... |
| `trim` | enum (trim-silence) | No | When set to `trim-silence`, silence will be removed from the... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.recordStart('id', { format: 'wav' });

console.log(response.data);
```

Key response fields: `response.data.result`

## Conference recording stop

Stop recording the conference. **Expected Webhooks:**

- `conference.recording.saved`

`client.conferences.actions.recordStop()` — `POST /conferences/{id}/actions/record_stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Specifies the conference to stop the recording for by id or ... |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | No | Uniquely identifies the resource. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.recordStop('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## End a conference

End a conference and terminate all active participants.

`client.conferences.actions.endConference()` — `POST /conferences/{id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```javascript
const response = await client.conferences.actions.endConference(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.result`

## List conferences

Lists conferences. Conferences are created on demand, and will expire after all participants have left the conference or after 4 hours regardless of the number of active participants. Conferences are listed in descending order by `expires_at`.

`client.conferences.list()` — `GET /conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const conference of client.conferences.list()) {
  console.log(conference.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Enqueue call

Put the call in a queue.

`client.calls.actions.enqueue()` — `POST /calls/{call_control_id}/actions/enqueue`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | The name of the queue the call should be put in. |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `maxWaitTimeSecs` | integer | No | The number of seconds after which the call will be removed f... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.calls.actions.enqueue('call_control_id', { queue_name: 'support' });

console.log(response.data);
```

Key response fields: `response.data.result`

## Remove call from a queue

Removes the call from a queue.

`client.calls.actions.leaveQueue()` — `POST /calls/{call_control_id}/actions/leave_queue`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |

```javascript
const response = await client.calls.actions.leaveQueue('v3:550e8400-e29b-41d4-a716-446655440000_gRU1OGRkYQ');

console.log(response.data);
```

Key response fields: `response.data.result`

## List conference participants

Lists conference participants

`client.conferences.listParticipants()` — `GET /conferences/{conference_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conferenceId` | string (UUID) | Yes | Uniquely identifies the conference by id |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const conferenceListParticipantsResponse of client.conferences.listParticipants(
  'conference_id',
)) {
  console.log(conferenceListParticipantsResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.call_control_id`

## Retrieve a conference

Retrieve an existing conference

`client.conferences.retrieve()` — `GET /conferences/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located |

```javascript
const conference = await client.conferences.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(conference.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Gather DTMF using audio prompt in a conference

Play an audio file to a specific conference participant and gather DTMF input.

`client.conferences.actions.gatherDtmfAudio()` — `POST /conferences/{id}/actions/gather_using_audio`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call leg tha... |
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `gatherId` | string (UUID) | No | Identifier for this gather command. |
| `audioUrl` | string (URL) | No | The URL of the audio file to play as the gather prompt. |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.gatherDtmfAudio(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { call_control_id: 'v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg' },
);

console.log(response.data);
```

Key response fields: `response.data.result`

## Hold conference participants

Hold a list of participants in a conference call

`client.conferences.actions.hold()` — `POST /conferences/{id}/actions/hold`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `callControlIds` | array[string] | No | List of unique identifiers and tokens for controlling the ca... |
| `audioUrl` | string (URL) | No | The URL of a file to be played to the participants when they... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.conferences.actions.hold('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Leave a conference

Removes a call leg from a conference and moves it back to parked state. **Expected Webhooks:**

- `conference.participant.left`

`client.conferences.actions.leave()` — `POST /conferences/{id}/actions/leave`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `commandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `beepEnabled` | enum (always, never, on_enter, on_exit) | No | Whether a beep sound should be played when the participant l... |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```javascript
const response = await client.conferences.actions.leave('id', {
  call_control_id: 'c46e06d7-b78f-4b13-96b6-c576af9640ff',
});

console.log(response.data);
```

Key response fields: `response.data.result`

## Conference recording pause

Pause conference recording.

`client.conferences.actions.recordPause()` — `POST /conferences/{id}/actions/record_pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Specifies the conference by id or name |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | No | Use this field to pause specific recording. |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```javascript
const response = await client.conferences.actions.recordPause('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Conference recording resume

Resume conference recording.

`client.conferences.actions.recordResume()` — `POST /conferences/{id}/actions/record_resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Specifies the conference by id or name |
| `commandId` | string (UUID) | No | Use this field to avoid duplicate commands. |
| `recordingId` | string (UUID) | No | Use this field to resume specific recording. |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```javascript
const response = await client.conferences.actions.recordResume('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Send DTMF to conference participants

Send DTMF tones to one or more conference participants.

`client.conferences.actions.sendDtmf()` — `POST /conferences/{id}/actions/send_dtmf`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `digits` | string | Yes | DTMF digits to send. |
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `callControlIds` | array[string] | No | Array of participant call control IDs to send DTMF to. |
| `durationMillis` | integer | No | Duration of each DTMF digit in milliseconds. |

```javascript
const response = await client.conferences.actions.sendDtmf('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  digits: '1234#',
});

console.log(response.data);
```

Key response fields: `response.data.result`

## Stop audio being played on the conference

Stop audio being played to all or some participants on a conference call.

`client.conferences.actions.stop()` — `POST /conferences/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `callControlIds` | array[string] | No | List of call control ids identifying participants the audio ... |

```javascript
const response = await client.conferences.actions.stop('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.result`

## Unhold conference participants

Unhold a list of participants in a conference call

`client.conferences.actions.unhold()` — `POST /conferences/{id}/actions/unhold`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlIds` | array[string] | Yes | List of unique identifiers and tokens for controlling the ca... |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |

```javascript
const response = await client.conferences.actions.unhold('id', {
  call_control_ids: ['v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg'],
});

console.log(response.data);
```

Key response fields: `response.data.result`

## Update conference participant

Update conference participant supervisor_role

`client.conferences.actions.update()` — `POST /conferences/{id}/actions/update`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `supervisorRole` | enum (barge, monitor, none, whisper) | Yes | Sets the participant as a supervisor for the conference. |
| `id` | string (UUID) | Yes | Uniquely identifies the conference by id or name |
| `commandId` | string (UUID) | No | Use this field to avoid execution of duplicate commands. |
| `region` | enum (Australia, Europe, Middle East, US) | No | Region where the conference data is located. |
| `whisperCallControlIds` | array[string] | No | Array of unique call_control_ids the supervisor can whisper ... |

```javascript
const action = await client.conferences.actions.update('id', {
  call_control_id: 'v3:MdI91X4lWFEs7IgbBEOT9M4AigoY08M0WWZFISt1Yw2axZ_IiE4pqg',
  supervisor_role: 'whisper',
});

console.log(action.data);
```

Key response fields: `response.data.result`

## Retrieve a conference participant

Retrieve details of a specific conference participant by their ID or label.

`client.conferences.retrieveParticipant()` — `GET /conferences/{id}/participants/{participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `participantId` | string (UUID) | Yes | Uniquely identifies the participant by their ID or label. |

```javascript
const response = await client.conferences.retrieveParticipant('participant_id', {
  id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.call_control_id`

## Update a conference participant

Update properties of a conference participant.

`client.conferences.updateParticipant()` — `PATCH /conferences/{id}/participants/{participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the conference. |
| `participantId` | string (UUID) | Yes | Uniquely identifies the participant. |
| `beepEnabled` | enum (always, never, on_enter, on_exit) | No | Whether entry/exit beeps are enabled for this participant. |
| `endConferenceOnExit` | boolean | No | Whether the conference should end when this participant exit... |
| `softEndConferenceOnExit` | boolean | No | Whether the conference should soft-end when this participant... |

```javascript
const response = await client.conferences.updateParticipant('participant_id', {
  id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.call_control_id`

## List queues

List all queues for the authenticated user.

`client.queues.list()` — `GET /queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |

```javascript
// Automatically fetches more pages as needed.
for await (const queue of client.queues.list()) {
  console.log(queue.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a queue

Create a new call queue.

`client.queues.create()` — `POST /queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | The name of the queue. |
| `maxSize` | integer | No | The maximum number of calls allowed in the queue. |

```javascript
const queue = await client.queues.create({ queue_name: 'tier_1_support' });

console.log(queue.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a call queue

Retrieve an existing call queue

`client.queues.retrieve()` — `GET /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | Uniquely identifies the queue by name |

```javascript
const queue = await client.queues.retrieve('queue_name');

console.log(queue.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a queue

Update properties of an existing call queue.

`client.queues.update()` — `POST /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `maxSize` | integer | Yes | The maximum number of calls allowed in the queue. |
| `queueName` | string | Yes | Uniquely identifies the queue by name |

```javascript
const queue = await client.queues.update('queue_name', { max_size: 200 });

console.log(queue.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a queue

Delete an existing call queue.

`client.queues.delete()` — `DELETE /queues/{queue_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | Uniquely identifies the queue by name |

```javascript
await client.queues.delete('queue_name');
```

## Retrieve calls from a queue

Retrieve the list of calls in an existing queue

`client.queues.calls.list()` — `GET /queues/{queue_name}/calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | Uniquely identifies the queue by name |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const callListResponse of client.queues.calls.list('queue_name')) {
  console.log(callListResponse.call_control_id);
}
```

Key response fields: `response.data.to, response.data.from, response.data.connection_id`

## Retrieve a call from a queue

Retrieve an existing call from an existing queue

`client.queues.calls.retrieve()` — `GET /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | Uniquely identifies the queue by name |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```javascript
const call = await client.queues.calls.retrieve('call_control_id', { queue_name: 'queue_name' });

console.log(call.data);
```

Key response fields: `response.data.to, response.data.from, response.data.connection_id`

## Update queued call

Update queued call's keep_after_hangup flag

`client.queues.calls.update()` — `PATCH /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | Uniquely identifies the queue by name |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |
| `keepAfterHangup` | boolean | No | Whether the call should remain in queue after hangup. |

```javascript
await client.queues.calls.update('call_control_id', { queue_name: 'queue_name' });
```

## Force remove a call from a queue

Removes an inactive call from a queue. If the call is no longer active, use this command to remove it from the queue.

`client.queues.calls.remove()` — `DELETE /queues/{queue_name}/calls/{call_control_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | string | Yes | Uniquely identifies the queue by name |
| `callControlId` | string (UUID) | Yes | Unique identifier and token for controlling the call |

```javascript
await client.queues.calls.remove('call_control_id', { queue_name: 'queue_name' });
```

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```javascript
// In your webhook handler (e.g., Express — use raw body, not parsed JSON):
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body.toString(), {
      headers: req.headers,
    });
    // Signature valid — event is the parsed webhook payload
    console.log('Received event:', event.data.event_type);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
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
