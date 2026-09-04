# Meeting Bot

> Join Zoom, Google Meet, Microsoft Teams, or Webex with a visible bot; react to finalized speech; and collect transcript-derived results.

This guide is grounded in the current
[`meeting-bot-service` implementation at `a9f6326`](https://github.com/team-telnyx/meeting-bot-service/tree/a9f6326bcaf7428364861290b787d5db1772e9f6).
Treat its routes, MCP schemas, domain types, services, and tests as the behavioral
authority. Public documentation is linked for navigation, but may lag the
implementation. MCP agents should call `tools/list` against the deployed server
before relying on a cached schema.

## Prerequisites

- A Telnyx API key ([get one](https://telnyx.com/agent-signup.md))
- A supported meeting URL that the requester is authorized to have a bot attend
- Host admission when the meeting uses a waiting room
- A durable worker or scheduler for long-running monitoring

For intent parsing, crash recovery, reactive actions, and final delivery, use the
canonical [`telnyx-meeting-bot` skill](../skills/telnyx-meeting-bot/SKILL.md).

## Quick Start

Create the session with one persisted idempotency key. Reuse that exact key after
an uncertain create outcome so a retry cannot place a second bot in the meeting.

```bash
curl -X POST "https://api.telnyx.com/v2/meeting_sessions" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "bot_name": "Project Notetaker",
    "summarize_on_end": true,
    "idempotency_key": "meeting-bot:stable-operation-id"
  }'
```

Save `data.id` immediately. A future RFC 3339 `join_at` schedules the join.
When a request includes a future speaking rule, set `barge_in: true` at creation
so new human speech can stop the bot's output.

Poll status until the session is active or terminal:

```bash
curl "https://api.telnyx.com/v2/meeting_sessions/mtgsess_REPLACE_ME" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

`waiting_for_admission` means a host must admit the visible bot. A non-null
`joined_at` is positive attendance evidence.

For immediate mention or action requests, long-poll finalized transcript with a
2-second wait:

```bash
curl "https://api.telnyx.com/v2/meeting_sessions/mtgsess_REPLACE_ME/transcript?after=0&limit=1000&wait_seconds=2" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

The request returns as soon as new finalized speech is available; two seconds is
the maximum held-request wait, not an added delay after speech arrives. Advance
`after` to the maximum processed `seq`. Use `wait_seconds: 0` only to drain an
already-full page immediately.

## Choose Polling Cadence From the Request

| Request intent | Starting `wait_seconds` |
|---|---:|
| “As soon as…”, reactive `speak`, or urgent mention alert | `2` |
| Ordinary live updates | `2`–`5` |
| Attend silently and summarize only after the meeting | `10`–`20`, or webhook-driven |

The implementation accepts integer values from `0` through `25`. Preserve the
requester's latency expectation in durable state. Back off transient failures,
but return to the selected cadence after recovery. Finalized transcript and TTS
introduce their own latency, so “as soon as” means as soon as the agent observes
a matching **final** segment—not raw-audio instantaneous reaction.

## React Once With Speech

The implemented MCP tool is:

```json
{
  "name": "speak",
  "arguments": {
    "id": "mtgsess_REPLACE_ME",
    "text": "I want pizza"
  }
}
```

REST equivalent:

```bash
curl -X POST "https://api.telnyx.com/v2/meeting_sessions/mtgsess_REPLACE_ME/actions/speak" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"I want pizza"}'
```

`speak` accepts `text` (1–4000 characters), optional `voice`, and optional
`interrupt`. `interrupt: true` stops the **bot's current audio** before playing
the replacement; it does not mean “interrupt a human.” The session must be
`active`, support audio output, and have TTS configured.

The service synthesizes and hands off audio before returning `{ "accepted": true
}` and appending `bot.speak_requested`. That is accepted handoff, not proof that
every participant audibly heard the whole utterance. Because `speak` has no
caller-supplied idempotency key, first persist a `claimed` rule, then require a
successful `claimed` → `dispatching` CAS immediately before transport. After an
ambiguous transport timeout, mark the action outcome unknown and do not
automatically speak again. On restart, convert any recovered
`dispatching` speech/chat claim to `outcome_unknown` before evaluating triggers
unless durable transport evidence proves that no request bytes were sent.

## API Reference

### Production MCP endpoint

```text
https://api.telnyx.com/v2/meeting_bot/mcp
```

Use the standard bearer-token `Authorization` header and
`Accept: application/json, text/event-stream`. Implemented session tools include
`join_meeting`, `get_session`, `list_sessions`, `get_transcript`, `get_events`,
`speak`, `stop_speaking`, `send_chat`, `leave_meeting`, `get_recordings`,
`create_artifact`, `get_artifact`, and `get_artifacts`.

MCP tool failures can use HTTP 200 with `result.isError: true`; check that before
parsing `result.content[0].text`. Transport and authentication failures use HTTP
error statuses.

### REST operations

| Operation | Endpoint |
|---|---|
| Create or schedule | `POST /v2/meeting_sessions` |
| Retrieve status | `GET /v2/meeting_sessions/{id}` |
| Speak | `POST /v2/meeting_sessions/{id}/actions/speak` |
| Stop bot speech | `POST /v2/meeting_sessions/{id}/actions/stop_speaking` |
| Send meeting chat | `POST /v2/meeting_sessions/{id}/actions/send_chat` |
| Follow transcript | `GET /v2/meeting_sessions/{id}/transcript` |
| Read events | `GET /v2/meeting_sessions/{id}/events` |
| Leave or cancel | `DELETE /v2/meeting_sessions/{id}` |
| List recordings | `GET /v2/meeting_sessions/{id}/recordings` |
| Create an artifact | `POST /v2/meeting_sessions/{id}/artifacts` |
| List artifacts | `GET /v2/meeting_sessions/{id}/artifacts` |
| Retrieve an artifact | `GET /v2/meeting_sessions/{id}/artifacts/{artifact_id}` |

## REST-only Portal Assistants and Anam Avatars

Both capabilities are REST-only and absent from MCP `join_meeting`. Use the same
persisted `idempotency_key` for an uncertain create retry; retrieve the resulting
session with `GET /v2/meeting_sessions/{id}` rather than attempting a second join.
They are creation-time choices, not scheduled/calendar features or mid-meeting
toggles.

### Portal Assistant REST create

Use an existing Assistant ID already configured in the authenticated Telnyx
organization. Production Assistant creation requires Gateway Rev2 authentication:
call this production REST endpoint with the caller's normal Telnyx bearer key. Do
not create an Assistant here or put assistant/API secrets, Call Control connection
IDs, from numbers, SIP URIs, or authorization fields inside `assistant`.

```json
{
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "assistant": {
    "id": "assistant_REPLACE_ME",
    "audio_gate": "half_duplex",
    "dynamic_variables": {"customer_name": "Example User"},
    "leave_on_end": false
  },
  "idempotency_key": "meeting-bot:assistant-operation-id"
}
```

```bash
curl -X POST "https://api.telnyx.com/v2/meeting_sessions" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary '{
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "assistant": {
      "id": "assistant_REPLACE_ME",
      "audio_gate": "half_duplex",
      "dynamic_variables": {"customer_name": "Example User"},
      "leave_on_end": false
    },
    "idempotency_key": "meeting-bot:assistant-operation-id"
  }'
```

`id` is required. `audio_gate` is `half_duplex` (default) or `full_duplex`;
`leave_on_end` is optional and defaults to `false`. `dynamic_variables` is an
optional string map: the current service cap is 63 customer entries, keys are
1–128 characters, values are at most 2048 characters, and reserved infrastructure
keys are rejected. The body is strict, so do not add unrelated connection,
telephone, SIP, secret, or authorization data.

Assistant sessions are immediate-only: do not send `join_at` or `barge_in`.
The Assistant handles interruption itself. Poll ordinary `status` and `joined_at`
alongside `assistant_state` (`starting`, `connected`, `failed`, `ended`) and
`assistant_state_changed_at`. `connected` means its conversation transport is
ready; `joined_at` is attendance evidence after the meeting host admits the bot.

Use default `half_duplex` unless continuous native barge-in is required.
`full_duplex` continuously listens using per-participant audio (excluding the
bot's own stream) and has higher meeting-media usage and cost; it is not a free
improvement.

### Anam avatar REST create

An Anam avatar requires `provider: "anam"`, `avatar_id`, and `api_key`:

```json
{
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "avatar": {
    "provider": "anam",
    "avatar_id": "avatar_REPLACE_ME",
    "api_key": "***"
  },
  "idempotency_key": "meeting-bot:anam-operation-id"
}
```

The Anam API key is write-only and must not be persisted, logged, or reported;
it also must not be expanded into process arguments. Assume `ANAM_API_KEY` is
already exported from a backend secret store. Let `jq` read it from the
environment, safely encode the JSON, and stream the request body to `curl`; never
write a secret-bearing JSON file:

```bash
jq -n \
  --arg meeting_url "https://meet.google.com/abc-defg-hij" \
  --arg avatar_id "avatar_REPLACE_ME" \
  --arg idempotency_key "meeting-bot:anam-operation-id" \
  '{meeting_url: $meeting_url, avatar: {provider: "anam", avatar_id: $avatar_id, api_key: env.ANAM_API_KEY}, idempotency_key: $idempotency_key}' | curl -X POST "https://api.telnyx.com/v2/meeting_sessions" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @-
```

Responses echo only `avatar.provider` and `avatar.avatar_id`, plus `avatar_state`
(`starting`, `connected`, `degraded`, `disconnected`) and
`avatar_state_changed_at`. A connected avatar is media readiness, not proof the
bot entered the meeting; use `joined_at` too.

Avatar creation is immediate-only: do not send `join_at`; it has no MCP,
calendar/scheduled flow, or mid-meeting toggle. The avatar webpage output wins
over `camera_image`; `speak` routes through the avatar page. `speak_on_enter`
waits until the session is active and the avatar is connected. There is no
supported prewarm before the meeting media layer creates the Output Media page;
that page hosts the avatar runtime.

### Combined REST create

Put both objects in one immediate REST create: the Assistant provides the
conversation and voice; the avatar lip-syncs its speech.

```json
{
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "assistant": {
    "id": "assistant_REPLACE_ME",
    "audio_gate": "half_duplex",
    "dynamic_variables": {"customer_name": "Example User"},
    "leave_on_end": false
  },
  "avatar": {
    "provider": "anam",
    "avatar_id": "avatar_REPLACE_ME",
    "api_key": "***"
  },
  "idempotency_key": "meeting-bot:assistant-avatar-operation-id"
}
```

Monitor both readiness axes (`assistant_state` and `avatar_state`) and `joined_at`.
Do not add `barge_in` or `join_at`: this combined flow is immediate-only and the
Assistant owns interruption.

### Implemented artifact types

The source defines exactly these artifact types:

| Type | Result |
|---|---|
| `summary` | Concise factual meeting summary |
| `action_items` | Clear actionable items, or an explicit statement that none were found |
| `decisions` | Decisions and named owners when supported by transcript |
| `topics` | Discussed themes with short notes |
| `open_questions` | Unanswered questions and unresolved items |
| `custom` | Answer to a caller-supplied transcript-grounded prompt |

Only `custom` accepts `prompt` (1–4000 trimmed characters); it requires one. The
named types reject `prompt`. Creation returns an asynchronous artifact with
`pending`, `completed`, or `failed` status. On completion, read `content.text`;
responses also expose `model_provenance` and a failure reason when applicable.

`summarize_on_end: true` attempts only a `summary`. The public artifact shape has
no automatic-origin marker: persist `transcript.completed.occurred_at`, exclude
known manual IDs, re-list all post-completion summary candidates, and prefer the
unique closest candidate across all statuses. Select it only when completed and
no outcome-unknown manual summary create remains unreconciled; wait if it is
pending and fall back if it fails rather than choosing a later artifact. Equal-time
candidates and all unrecognized candidates during same-type uncertainty are
ambiguous; never use artifact ID, list order, completion order, or client-clock
windows to break an origin tie. Re-list and poll every candidate before fallback
rather than locking onto the first pending summary.

Manual creation is non-idempotent. Persist a create state that distinguishes
`pre_send_failed` (the client proved no request bytes were sent, so a bounded
retry is safe) from `outcome_unknown` (bytes may have been sent, so recovery may
only re-list). At this source revision, artifact generation reads at most the
first 10,000 transcript segments and does not expose a truncation warning; caveat
exceptionally long meetings or build the final report from the agent's fully
collected transcript.

### Python

```python
import os
import requests

base = "https://api.telnyx.com/v2/meeting_sessions"
headers = {"Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}"}
session_id = "mtgsess_REPLACE_ME"
after = 0

response = requests.get(
    f"{base}/{session_id}/transcript",
    headers=headers,
    params={"after": after, "limit": 1000, "wait_seconds": 2},
    timeout=10,
)
response.raise_for_status()
segments = response.json()["data"]
if segments:
    after = max(segment["seq"] for segment in segments)
```

### TypeScript

```typescript
const sessionId = "mtgsess_REPLACE_ME";
let after = 0;
const url = new URL(
  `https://api.telnyx.com/v2/meeting_sessions/${sessionId}/transcript`,
);
url.searchParams.set("after", String(after));
url.searchParams.set("limit", "1000");
url.searchParams.set("wait_seconds", "2");

const apiKey = process.env.TELNYX_API_KEY;
if (!apiKey) throw new Error("TELNYX_API_KEY is required");
const headers = new Headers();
headers.set("Authorization", ["Bearer", apiKey].join(" "));
const response = await fetch(url, { headers });
if (!response.ok) throw new Error(`Transcript request failed: ${response.status}`);
const { data: segments } = await response.json();
if (segments.length) after = Math.max(...segments.map((segment: any) => segment.seq));
```

## Demo: Delegated Attendance and TL;DR

Example message shown on screen:

> I can't join this meeting: `<meeting URL>`. Join as Anusha's bot, let me know
> when you're in, and send me a TL;DR when it ends.

Expected visible sequence:

1. The agent persists the operation and joins immediately as `Anusha's bot` with
   `summarize_on_end: true` and no unrequested speech or chat.
2. If status is `waiting_for_admission`, the agent tells Anusha that a host must
   admit the bot.
3. When `joined_at` becomes non-null, the agent posts “Anusha's bot joined the
   meeting” in Anusha's conversation. That chat update is not spoken in-meeting.
4. The agent follows the transcript in the background and checkpoints its cursor.
5. At terminal status, it drains final segments, obtains the `summary` artifact,
   and sends the TL;DR with attendance, completeness, and provenance.

## Example: Reactive Lunch Answer

> Join the meeting and, as soon as someone asks what we should have for lunch,
> use the speak request and say “I want pizza.”

Interpret this as an immediate join plus a one-shot semantic trigger. Use
`wait_seconds: 2`; evaluate each new final segment and a short trailing context
window; atomically claim the first clear match; then call `speak` once with exact
text `I want pizza`. Do not wait for another approval—the original request is the
authorization. Do not repeat after an accepted or outcome-unknown dispatch.

## Source References

- [Artifact domain types](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/domain/artifact.ts)
- [Artifact generation behavior](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/services/artifactService.ts)
- [Meeting-session REST routes](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/routes/meetingSessions.ts)
- [MCP tool definitions](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/mcp/server.ts)
- [Speech implementation](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/services/sessionService.ts#L1021-L1142)
- [Meeting overview](https://developers.telnyx.com/docs/meeting) (secondary)
