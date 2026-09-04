---
name: telnyx-meeting-bot
description: >-
  Use when an agent must join, observe, react in, transcribe, summarize, or
  follow up on a Zoom, Google Meet, Microsoft Teams, or Webex meeting with
  Telnyx Meeting Bot. Handles vague requests, request-specific live polling,
  name/phrase and semantic triggers, explicitly authorized speak/chat actions,
  recovery, and all implemented transcript artifact types.
metadata:
  author: telnyx
  product: meeting-bot
  requires:
    env:
      - TELNYX_API_KEY
---

# Telnyx Meeting Bot

Use this skill to attend a meeting visibly, monitor its finalized transcript,
alert the requester, execute explicitly authorized live rules such as speaking
one response, and produce evidence-based meeting results. The bot is
**observe-only by default**: it must not speak, send chat, or make other
in-meeting changes unless the requester explicitly asks for that.

## Quick Workflow

1. Resolve only missing essentials: meeting URL, join now versus a scheduled time, desired live/final outputs, and trigger/action rules. Reuse authorized details; do not ask again.
2. Persist an operation record **before** creating the session and choose its transport. Ordinary sessions use MCP `join_meeting`. Any Portal Assistant or Anam avatar session uses REST `POST /v2/meeting_sessions` with the requested object(s). Persist one stable `idempotency_key`, the transport, and the exact logical create request; store only a secret reference for a write-only Anam key. REST-only sessions are immediate, so omit `join_at`; Assistant sessions also omit `barge_in`. For an ordinary session with an authorized later speech rule, set `barge_in: true` so human speech can stop bot output.
3. Poll `get_session`, `get_transcript`, and, when available, `get_events`. Select `wait_seconds` from the request—about `2` for “as soon as,” reactive speech, or urgent mentions—and persist cursors, seen segments, outboxes, claims, and IDs for recovery.
4. On each new final segment, evaluate requested literal or semantic rules; deliver mention notifications through the durable outbox, and atomically claim and execute each authorized `speak`/`send_chat` action at most once.
5. On a terminal session, drain transcript pages, wait a bounded time for `transcript.completed`, obtain requested implemented artifact types without duplicate creation, then deliver a Markdown report.

## Preconditions and Safe Defaults

- Require `TELNYX_API_KEY` in a backend secret store. Never include it in a URL, transcript, event, artifact, chat message, or user-facing report.
- Before joining, ensure the runtime can keep monitoring or can resume from durable background state. Do not promise end-to-end monitoring from a process that disappears without preserving and resuming the operation record.
- Verify authorization for a visible bot. A host may need to admit it; never bypass a waiting room, password, platform policy, or consent requirement.
- Default notification target: **this current conversation**. Do not configure a `webhook_url` merely to send requester notifications.
- Default behavior is immediate join, `summarize_on_end: true`, observe-only, and no recording-media deletion. `speak`, `send_chat`, `speak_on_enter`, and `chat_on_enter` are opt-in.
- An explicit conditional request such as “when someone asks about lunch, say ‘I want pizza’” authorizes exactly that action. Before join, persist trigger, exact payload, one-shot/repeat policy, and latency target; do not interrupt the workflow to ask again.
- Select monitoring cadence from the request: default immediate reactions and urgent mentions to `wait_seconds: 2`, never silently substituting a 15-second cadence for “as soon as.”
- If the link is missing, ask for it. If timing is ambiguous, ask only now versus specified time. If “my name” is not resolvable from authorized request/context/profile data, ask for name/phrases and optional variants.

## Connect to the Production MCP Server

Prefer the production Streamable HTTP MCP endpoint:

```text
https://api.telnyx.com/v2/meeting_bot/mcp
Authorization: Bearer ***
```

Use the service's exact tools: `join_meeting`, `get_session`, `list_sessions`, `get_transcript`, `get_events`, `leave_meeting`, `get_recordings`, `speak`, `stop_speaking`, `send_chat`, `create_artifact`, `get_artifact`, and `get_artifacts`.

MCP tools return one JSON text block. Decode `result.content[0].text` only after checking `result.isError`. HTTP/transport failures (for example 401, timeouts, or 5xx) differ from an HTTP-200 MCP tool failure with `result.isError: true`; preserve the error code/message and do not treat HTTP 200 as success alone.

If MCP is unavailable, use the equivalent production REST base:

```text
https://api.telnyx.com/v2/meeting_sessions
```

REST equivalents include `POST /`, `GET /{id}`, `POST /{id}/actions/speak`, `POST /{id}/actions/stop_speaking`, `POST /{id}/actions/send_chat`, `GET /{id}/transcript`, `GET /{id}/events`, `DELETE /{id}`, `GET /{id}/recordings`, `GET /{id}/artifacts`, `POST /{id}/artifacts`, and `GET /{id}/artifacts/{artifact_id}`. Send the standard bearer-token `Authorization` header. REST responses use `{ "data": ... }`. REST is a fallback transport for ordinary sessions when MCP is unavailable, but it is required for Portal Assistant and Anam avatar creates because MCP cannot express those objects. The lifecycle and durability rules remain the same.

## Create or Schedule Exactly Once

Before the first session create, checkpoint a durable operation record outside
transient chat memory whenever the host supports files, a task store, or durable
workflow state. Store at least:

```json
{
  "operation_id": "host-stable-id",
  "meeting_url": "redacted-or-secret-reference",
  "idempotency_key": "meeting-bot:<host-stable-id>",
  "create_transport": "mcp-or-rest",
  "create_request_without_write_only_secrets": {},
  "avatar_api_key_secret_ref": null,
  "session_id": null,
  "poll_wait_seconds": 2,
  "live_rules": [],
  "transcript_after_seq": 0,
  "event_after_seq": 0,
  "seen_transcript_seqs": [],
  "mention_alerts": [],
  "mentions": [],
  "action_claims": [],
  "artifact_requests": {},
  "known_manual_artifact_ids": [], "unreconciled_unknown_manual_creates": [],
  "transcript_completed_at": null, "summary_candidate_ids": [],
  "summary_artifact_id": null, "summary_poll_deadline_at": null,
  "summary_creation": {"state": "not_started", "attempt_count": 0, "max_pre_send_retries": 2, "artifact_id": null},
  "terminal_observed_at": null,
  "transcript_completed": false
}
```

Use a UUID or host-durable operation ID, not a new timestamp on retry. For an
ordinary session, call MCP `join_meeting` with the smallest safe argument set:

```json
{
  "meeting_url": "<resolved meeting URL>",
  "join_at": "<future RFC 3339 time only when scheduled>",
  "summarize_on_end": true,
  "idempotency_key": "meeting-bot:<host-stable-id>"
}
```

Omit `join_at` for an immediate join. Do not add greeting/chat/action arguments.
If the request contains an authorized later `speak` rule, include
`"barge_in": true`; this lets human speech stop bot output and does not itself
make the bot speak.

For a Portal Assistant, Anam avatar, or combined session, use REST instead and
persist the complete sanitized body from the sections below. Omit `join_at`; when
an Assistant is present, omit `barge_in`. Persist the returned `id` as
`session_id` immediately. After an uncertain create outcome, retry **only**
through the original transport with the same logical request and
`idempotency_key`; re-resolve an Anam key from its secret reference at dispatch
instead of persisting the value. Never issue a second key, which could place a
second bot in the meeting. If durable state is unavailable, disclose that
duplicate prevention across restart is not guaranteed and avoid unbounded retry.

## Live Session and Transcript Loop

Interleave session checks with transcript reads; a successful transcript read
alone is not proof the bot attended.

1. Call `get_session(id)` at startup, after errors, and on a bounded cadence.
   Use roughly every 5–10 seconds for a reactive workflow and 15–30 seconds for
   passive monitoring, with backoff after transient failures.
2. Treat `waiting_for_admission` as a request for a meeting host to admit the
   visible bot. Tell the requester promptly; keep monitoring rather than
   claiming attendance. A non-null `joined_at` is the positive evidence that
   the bot actually attended.
3. Treat `ended`, `failed`, and `admission_denied` as terminal. Record status,
   `status_detail` when present, and `joined_at`.
4. Long-poll finalized segments with
   `get_transcript(id, after_seq, limit, wait_seconds)`. Use `limit: 1000` and
   select/persist the wait from the request: `2` seconds for “as soon as,”
   reactive `speak`, or urgent mentions; `2`–`5` for ordinary live updates;
   `10`–`20` for summary-only passive attendance. The implemented integer range
   is `0`–`25`. The call returns as soon as new finalized speech exists, so the
   wait is a maximum held-request duration, not an added post-transcript delay.
5. Deduplicate by durable `seq`. For each new segment, persist it or its needed
   fields, process mentions, set `after_seq` to the **maximum processed seq**,
   and checkpoint before the next call.
6. If a response fills the page (`1000` rows), drain immediately with the
   updated cursor and `wait_seconds: 0` until the page is short. Then resume
   the short long-poll. Do not rely on a server `next_after` value in place of
   the maximum sequence you successfully processed, and never reset the cursor
   when a poll returns an empty page or a null continuation value. Return to the
   selected request cadence after the immediate drain.
7. Use `get_events(id, after_seq, limit)` on a bounded cadence as well; advance
   and persist its independent event cursor only after deduping event sequences.
   It is useful for lifecycle and `transcript.completed` evidence, but is not a
   replacement for transcript reads.

Use bounded retries for transient network/5xx/429 errors, for example delays of
1, 2, 4, 8, then at most 15 seconds with jitter. Keep the same session and
cursors. For authentication errors, malformed requests, `not_found`, or an MCP
`result.isError` that is not plausibly transient, stop automatic retries and
surface the actionable error without exposing credentials or meeting secrets.

## Live Trigger Detection, Alerts, and Actions

### Name/phrase alerts

Match **only finalized transcript segments** returned by `get_transcript`.
Normalize with Unicode case-folding and whitespace normalization. For each known
name or phrase variant, use escaped whole-phrase boundaries: it must not have a
letter or number immediately before or after the phrase. This lets “Ann Lee”
match “ann lee,” but not “ann leeds,” and avoids false positives such as `Ann`
inside `annual`. Keep variants only when known from the requester or authorized
profile/context; do not invent aliases.

For every new `(session_id, segment.seq, normalized_variant)` match, derive one
stable alert key and delivery ID such as
`mention:<session_id>:<segment.seq>:<normalized_variant>`. Persist the mention
and an outbox item **before** delivery:

```json
{
  "key": "mention:<session_id>:<seq>:<normalized_variant>",
  "delivery_id": "same-stable-value",
  "status": "pending",
  "attempts": 0,
  "last_error": null,
  "sent_at": null
}
```

If that key already has `status: "sent"`, skip it. If it is `pending`, reuse the
same outbox item rather than creating a second one. Send the notice to the
current conversation:

```text
Mention detected — <speaker_label or "Unknown speaker"> at +<relative_ts>:
“<exact segment text>”
```

Use the segment's `relative_ts` (format it as a relative timestamp if available)
and retain the exact quote without paraphrasing. Pass the stable `delivery_id`
to the host notification API when it supports idempotency. Mark the outbox item
`sent` only after confirmed delivery; otherwise leave it `pending`, increment
its attempt metadata, and retry it with bounded backoff without blocking later
transcript collection. On recovery, retry pending alerts before/alongside new
segments. If the host cannot deduplicate an ambiguous send, prefer at-least-once
delivery and note that a retry may duplicate the alert—never convert an unknown
outcome into `sent` and silently lose the requested notification.

A segment can produce alerts for distinct requested terms. Append every match
(term/variant, speaker, timestamp, seq, exact quote) to the durable mention log
for the final report, independent of its alert-delivery status.

### Explicit reactive `speak` or `send_chat`

Translate each authorized live rule into durable fields before joining:

- a stable `rule_id`;
- literal terms or a precise semantic condition;
- action type and exact text;
- one-shot versus explicitly requested repeat behavior;
- selected `poll_wait_seconds` (default `2` for immediate reactions).

For a literal rule, use the same boundary-safe matching as mention detection.
For a semantic condition such as “someone asks what we should have for lunch,”
evaluate each newest final segment with only a short trailing context window.
Require clear transcript evidence; do not trigger from an unrelated occurrence
of one keyword. Persist the evidence seq(s) and exact quote.

Before executing the first match, atomically create an action claim. A one-shot key uses only session and rule; trigger seq(s) are evidence.
For an explicitly repeating literal rule, atomically claim `action:<session_id>:<rule_id>:repeat:<segment.seq>` once per matching finalized segment.
For an explicitly repeating semantic rule, follow the [repeating-action protocol](references/repeating-semantic-actions.md); persist `occurrence_first_seq` and `evidence_seqs`.
Under its ordered lease/CAS, all workers use `action:<session_id>:<rule_id>:repeat:<occurrence_first_seq>` and reuse the active occurrence across windows.
Permit a new repeat key only after its stale-safe ordered clear commits; never key from the newest evaluation segment.

```json
{
  "key": "action:<session_id>:<rule_id>",
  "rule_id": "lunch-question",
  "type": "speak",
  "text": "I want pizza",
  "status": "claimed",
  "trigger_seqs": [42]
}
```

Creating the claim only reserves its key. Dispatch only if a CAS changes `claimed`
(or proven `pre_send_failed`) to `dispatching` immediately before the transport
call; a CAS loser skips. For MCP, call
`speak(id, text, voice?, interrupt?)`; for REST, call
`POST /{id}/actions/speak`. `text` is 1–4000 characters. Omit `interrupt`
unless replacing the bot's own current audio—it does not mean “interrupt the
human speaker.” The session must be `active`, support audio output, and have TTS
configured. `send_chat` is similarly opt-in and may be unsupported by the
meeting platform.

After MCP returns non-error `{ "accepted": true }` or REST returns 202, mark the
claim `accepted`; `bot.speak_requested` in `get_events` is additional durable
evidence. Accepted means TTS and the provider/page handoff succeeded, not proof
that every attendee heard the complete utterance. Because `speak` and
`send_chat` expose no caller idempotency key, do **not** automatically repeat an
accepted action or one whose transport outcome became ambiguous after dispatch.
Mark the latter `outcome_unknown`, tell the requester, and keep monitoring.
Within the same live attempt, only durable transport evidence that no request
bytes were sent may mark `pre_send_failed` and allow a bounded transition of that
same claim back to `dispatching`.

## Terminal Drain and Completeness

After a terminal status, do not conclude that an empty transcript poll means the
transcript is complete.

1. Record the first terminal observation time and repeatedly drain all available
   transcript pages as above.
2. Continue checking `get_events` for `transcript.completed` for a bounded
   settle window (for example up to 90 seconds, with 2–10 second backoff) while
   continuing short transcript drains.
3. If the completion event arrives, make one final full drain and mark transcript
   completeness as `confirmed by transcript.completed`.
4. If the bound expires without that event, make at least two empty-drain checks
   separated by a delay, then mark the report `not confirmed; bounded settle
   window expired`. Include the terminal status and never describe the summary
   as a complete account of the meeting in this case.

A failed or denied session with `joined_at: null` means no verified attendance;
report that honestly and do not invent a discussion summary.

## Choose and Obtain Artifacts Without Duplicating Work

The implementation defines exactly six artifact types:

| Type | Use for |
|---|---|
| `summary` | Concise factual TL;DR |
| `action_items` | Explicit tasks, or a statement that none were found |
| `decisions` | Decisions and named owners when present |
| `topics` | Discussed themes with short notes |
| `open_questions` | Unanswered questions and unresolved items |
| `custom` | A caller-supplied question answered only from transcript |

Only `custom` accepts `prompt` (required, 1–4000 trimmed characters); named types
reject `prompt`. Each create is asynchronous with `pending`, `completed`, or
`failed` status. Read `content.text` only after completion and retain
`model_provenance`/failure information. `summarize_on_end: true` attempts only a
`summary`; create other requested types separately.

For every manual artifact, follow the [artifact selection and creation recovery
protocol](references/artifact-selection-and-recovery.md). Keep its durable state
machine, fixed deadline, manual artifact IDs, and returned ID. Retry only a
proven `pre_send_failed` or confirmed pre-creation rejection; an ambiguous create
is `outcome_unknown` and may only be reconciled by listing.

At implementation commit `a9f6326`, generation reads at most the first 10,000
finalized transcript segments without exposing a truncation warning. For an
exceptionally long meeting, disclose that limit and prefer an agent-generated
result from the full transcript the agent actually collected.

### Summary flow

Follow the linked recovery protocol. Persist `transcript.completed.occurred_at`,
exclude `known_manual_artifact_ids`, and repeatedly re-list all post-completion
summary candidates. The API has no automatic-origin marker, so first identify the
unique closest candidate across **all statuses**. Use it only if completed and no
same-type manual create has an unreconciled unknown outcome; if pending, wait, and
if failed, fall back rather than choosing a later artifact. Equal-time candidates
are ambiguous. Because no ID was returned
and clocks may differ, never use artifact ID, list order, completion order, or
client-clock windows as an origin tie-breaker. Do not lock onto the first pending
artifact or silently use a pre-completion partial summary. Immediately before
fallback, re-list and poll every current candidate within the fixed deadline.

If no trustworthy automatic candidate appears, use the protocol's manual-create
state machine. A proven pre-send failure may retry within the original bound;
`dispatching` after a crash or any possibly sent/ambiguous call becomes
`outcome_unknown` and must never create again. Poll accepted IDs to terminal state
and retain pending/failed provenance before using the transcript fallback.

If service inference is unavailable, fails, or times out, still deliver an
**Agent-generated summary (service summary unavailable)** based solely on the
collected final transcript. Label transcript completeness and the inference
failure/caveat. Do not fill in decisions, owners, actions, or discussion that
the transcript does not support.

## Deliver the Final Markdown Artifact

Create a user-facing Markdown attachment or host-native artifact, retaining it
in durable host storage when supported. Include:

```markdown
# Meeting report
## Executive summary
- <service `content.text`, or an explicitly labeled transcript-grounded fallback>
## Topics, decisions, and action items
- Use requested service artifacts when completed; include only items supported by the transcript.
- Otherwise say “None identified in the collected transcript.”
## Mention log
- +00:00 — Speaker — matched term — alert sent|pending: “exact transcript quote”
## Live actions
- +00:00 — Rule — `speak|send_chat` — accepted|failed|outcome unknown — trigger quote
## Attendance and completeness
- Session: `mtgsess_...`
- Status: `ended|failed|admission_denied`
- Joined evidence: `joined_at` value, or “not verified”
- Transcript: confirmed by `transcript.completed` | not confirmed (reason)
## Provenance
- Transcript segment sequence range/count and collection caveats
- Service artifacts: `<type>: <id>, status, model_provenance>`
- Summary: service artifact `<id>` (`content.text`) | agent-generated fallback (reason)
```

Quote or link the meeting URL only where the recipient is already authorized;
otherwise redact it. Never claim attendees, decisions, outcomes, or completeness
that are absent from the session, events, or collected finalized transcript.

## Recovery Rules

On restart, load the durable operation record before doing anything. If it has a
`session_id`, resume `get_session`, event/transcript drains, and summary polling
from persisted cursors and outbox state—never create another session. Retry
pending mention alerts with their original delivery IDs and leave confirmed
`sent` items alone. A recovered `claimed` action may attempt the dispatch CAS. Before
evaluating triggers, atomically convert every recovered
live-action claim still marked `dispatching` to `outcome_unknown` unless durable
transport evidence proves no request bytes were sent; never redispatch it. Never
repeat actions marked `accepted` or `outcome_unknown`. Reconcile event history
where useful, but a missing event is not proof the side effect did not happen. Resume each
artifact request from its persisted ID/deadline and never repeat an ambiguous
create. If the record has an idempotency key but no saved session ID because
creation was interrupted, retry the original create through its recorded
transport with the same logical request and key only after checking any available
response/log receipt. Re-resolve a write-only Anam key from its secret reference;
never substitute MCP for a REST-only create. Persist every
state transition, alert/action state, cursor, terminal observation, and artifact
ID before relying on it.

If the requester asks to stop a non-terminal session, confirm the scope when
needed and use `leave_meeting(id)` (REST: `DELETE /{id}`); it leaves/cancels but
does not erase the durable session history. Do not use destructive recording
media deletion as a cleanup shortcut.

## Portal-configured Assistant (REST-only)

Use `POST /v2/meeting_sessions` (not MCP `join_meeting`) with an existing portal-configured Assistant `id` in the authenticated organization. Create it with the caller's normal Telnyx bearer key; production requires Gateway Rev2 authentication. Never put Assistant/API secrets, Call Control connection IDs, from numbers, SIP URIs, or authorization fields in `assistant`. Allowed fields are `id`, optional `audio_gate` (`half_duplex` default or `full_duplex`), optional string-map `dynamic_variables`, and optional `leave_on_end` (default `false`).

Assistant sessions are immediate-only: omit `join_at` and `barge_in`; the assistant handles interruption natively. A map has at most 63 customer entries; keys are 1–128 characters, values are strings up to 2048 characters, and reserved infrastructure keys are rejected. Poll ordinary status and `joined_at`, plus `assistant_state` (`starting|connected|failed|ended`) and its change timestamp. `connected` is readiness; non-null `joined_at` proves attendance. `full_duplex` continuously listens through per-participant audio and has higher meeting-media usage and cost, so use safe-default `half_duplex` unless native continuous barge-in is required. See the REST body and polling flow in [the guide](https://github.com/team-telnyx/ai/blob/main/guides/meeting-bot.md).

## Anam Avatar (REST-only)

Create an Anam avatar only through `POST /v2/meeting_sessions`, with `avatar.provider: "anam"`, `avatar_id`, and `api_key`; it is absent from MCP `join_meeting`. The key is write-only: never persist, log, or report it. Responses echo only provider/avatar ID and `avatar_state` (`starting|connected|degraded|disconnected`) with its change timestamp.

Avatar sessions are immediate-only: no `join_at`, calendar/scheduled flow, MCP, or mid-meeting toggle. `connected` means avatar media readiness, not attendance, so also require `joined_at`. Avatar webpage output wins over `camera_image`; `speak` routes through that page, and `speak_on_enter` waits for active plus avatar connected. Do not prewarm: the meeting media layer creates the Output Media page as part of session startup. See REST examples and recovery guidance in [the guide](https://github.com/team-telnyx/ai/blob/main/guides/meeting-bot.md).

## Combined Assistant + Avatar

One immediate REST create can include both objects: the Assistant supplies conversation and voice while the avatar lip-syncs it. Monitor assistant readiness, avatar readiness, and `joined_at` separately; do not add `barge_in` or `join_at`. See the complete create body in [the guide](https://github.com/team-telnyx/ai/blob/main/guides/meeting-bot.md).

## Worked Interpretations

### Mention alert and final summary

For: “Join this meeting and tell me what they discussed when it ends; if they mention my name, let me know.”

- If the message already includes a meeting URL and the requester identity/name is known from authorized conversation/profile context, join immediately with `summarize_on_end: true`, the stable idempotency key, no voice/chat actions, and that name plus known variants as terms.
- If the link is missing, ask only for the link. If it is unclear whether the meeting is now or later, ask only for join timing. If “my name” is not known, ask for the name/phrases and optional variants.
- Tell the requester if host admission is required; send mention alerts in this conversation; after completion, send the bounded, evidence-based report.

### Reactive lunch answer

For: “Join the meeting and as soon as someone asks what we should have for lunch, please use the speak request and say I want pizza.”

- Treat this as explicit authorization for one in-meeting `speak`; do not ask again when the condition occurs.
- Join immediately with `summarize_on_end: true`, stable idempotency, no entrance speech/chat, and `barge_in: true`.
- Persist a one-shot semantic rule and use `wait_seconds: 2`. Evaluate each new final segment plus a short trailing context window; require a clear lunch-choice question rather than the isolated word “lunch.”
- Atomically claim the first match and call `speak(id, text: "I want pizza")` with `interrupt` omitted. Mark accepted only from a non-error MCP result or REST 202; do not repeat an ambiguous dispatch.

### Demo: delegated attendance and TL;DR

For the on-screen request: “I can't join this meeting: `<meeting URL>`. Join as Anusha's bot, tell me when you're in, and send me a TL;DR when it ends.”

Join now as `Anusha's bot` with stable idempotency, `summarize_on_end: true`, and no unrequested speech/chat. Post joining/admission updates to Anusha's current conversation, then “Anusha's bot joined” only when `joined_at` is non-null. A summary-only demo may use a `10`–`20` second wait; use `2` seconds if it promises live reactions. At terminal status, drain final transcript and send the automatic `summary` with attendance, completeness, and provenance. The visible story is: Anusha cannot attend → texts her agent → colleagues see her bot join → her agent confirms attendance → she receives the TL;DR.

## Source Authority and References

Behavior in this skill is grounded in the current `meeting-bot-service`
`origin/main`, verified at commit
[`a9f6326bcaf7428364861290b787d5db1772e9f6`](https://github.com/team-telnyx/meeting-bot-service/tree/a9f6326bcaf7428364861290b787d5db1772e9f6).
Treat implementation and tests as authoritative when public documentation lags:

- [Artifact types](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/domain/artifact.ts) and [generation](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/services/artifactService.ts)
- [REST routes](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/routes/meetingSessions.ts), [MCP tools](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/mcp/server.ts), and [speech](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/src/services/sessionService.ts#L1021-L1142)
- [Session action tests](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/tests/sessionService.test.ts#L642-L708) and [artifact tests](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326bcaf7428364861290b787d5db1772e9f6/tests/artifactService.test.ts)

Public [Meeting Bot documentation](https://developers.telnyx.com/docs/meeting) is a
secondary navigation surface, not the source used to derive this workflow.

Recheck tool schemas with MCP `tools/list` when a deployed service changes, and
never copy credentials, private meeting URLs, webhook secrets, or transient
deployment details into this skill.
