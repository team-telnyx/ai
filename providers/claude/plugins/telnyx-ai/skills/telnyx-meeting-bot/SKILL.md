---
name: telnyx-meeting-bot
description: >-
  Use when an agent must safely join, observe, monitor, transcribe, summarize,
  or follow up on a Zoom, Google Meet, Microsoft Teams, or Webex meeting with
  Telnyx Meeting Bot. Handles vague requests, scheduled joins, admission,
  durable transcript polling, name/phrase alerts, recovery, and final meeting
  artifacts without speaking or sending chat by default.
metadata:
  author: telnyx
  product: meeting-bot
  requires:
    env:
      - TELNYX_API_KEY
---

# Telnyx Meeting Bot

Use this skill to attend a meeting visibly as an **observe-only** bot, monitor
its finalized transcript, alert the requester about selected mentions, and
produce an evidence-based meeting report. The bot must not speak, send chat, or
make other in-meeting changes unless the requester explicitly asks for that.

## Quick Workflow

1. Resolve only missing essentials: meeting URL, join now versus a scheduled
   time, and mention terms. Reuse terms already stated in the request or known
   from the current conversation/profile; do not ask again or guess a person's
   name.
2. Persist an operation record **before** creating the session. Generate and
   retain one stable `idempotency_key`; call `join_meeting` with
   `summarize_on_end: true`, no `speak_on_enter`, and no `chat_on_enter`.
3. Poll `get_session`, `get_transcript`, and (when available) `get_events`.
   Persist cursors, seen segment sequences, sent mention-alert keys, and IDs so
   a restart resumes safely.
4. On each new final transcript segment, detect whole-name/phrase mentions and
   alert the requester in the current conversation once per segment/match.
5. On a terminal session, drain transcript pages, wait a bounded time for
   `transcript.completed`, obtain an existing summary artifact or create only
   one fallback summary artifact, then deliver a Markdown report.

## Preconditions and Safe Defaults

- Require `TELNYX_API_KEY` in a backend secret store. Never include it in a URL,
  transcript, event, artifact, chat message, or user-facing report.
- Before joining, ensure the runtime can keep monitoring or can resume from a
  durable background task. Do not promise end-to-end monitoring from a process
  that will disappear without preserving and resuming the operation record.
- Verify the requester is authorized to have a visible bot attend this meeting.
  The bot may need a host to admit it; never try to bypass a waiting room,
  password, platform policy, or consent requirement.
- Default notification target: **this current conversation**. Do not configure a
  `webhook_url` merely to send the requester notifications.
- Default behavior: immediate join if no future time was requested,
  `summarize_on_end: true`, observe-only, and no recording-media deletion.
  `speak`, `send_chat`, `speak_on_enter`, and `chat_on_enter` are opt-in actions.
- If a meeting link is not present, ask for it. If time is ambiguous, ask only
  whether to join now or at a specified time. If “my name” is not resolvable
  from the request, current conversation, or authorized profile context, ask
  which name/phrases (and optional variants) to watch for.

## Connect to the Production MCP Server

Prefer the production Streamable HTTP MCP endpoint:

```text
https://api.telnyx.com/v2/meeting_bot/mcp
Authorization: Bearer <TELNYX_API_KEY>
```

Use the service's exact tools: `join_meeting`, `get_session`, `list_sessions`,
`get_transcript`, `get_events`, `leave_meeting`, `get_recordings`, `speak`,
`stop_speaking`, `send_chat`, `create_artifact`, `get_artifact`, and
`get_artifacts`.

MCP tools return one JSON text block. Decode `result.content[0].text` as JSON
only after checking `result.isError`. HTTP/transport failures (for example 401,
timeouts, or a 5xx) are different from an HTTP-200 MCP tool failure with
`result.isError: true`; handle both, preserve the error code/message, and do
not treat an HTTP 200 as success by itself.

If MCP is unavailable, use the equivalent production REST base:

```text
https://api.telnyx.com/v2/meeting_sessions
```

REST equivalents are `POST /`, `GET /{id}`, `GET /{id}/transcript`,
`GET /{id}/events`, `DELETE /{id}`, `GET /{id}/artifacts`,
`POST /{id}/artifacts`, and `GET /{id}/artifacts/{artifact_id}`. Send
`Authorization: Bearer <TELNYX_API_KEY>`. REST responses use `{ "data": ... }`.
Use REST only as a transport fallback—the lifecycle and durability rules below
remain the same.

## Create or Schedule Exactly Once

Before the first `join_meeting`, checkpoint a durable operation record outside
transient chat memory whenever the host supports files, a task store, or durable
workflow state. Store at least:

```json
{
  "operation_id": "host-stable-id",
  "meeting_url": "redacted-or-secret-reference",
  "idempotency_key": "meeting-bot:<host-stable-id>",
  "session_id": null,
  "transcript_after_seq": 0,
  "event_after_seq": 0,
  "seen_transcript_seqs": [],
  "mention_alert_keys": [],
  "mentions": [],
  "summary_artifact_id": null,
  "summary_creation_attempted": false,
  "summary_poll_deadline_at": null,
  "terminal_observed_at": null,
  "transcript_completed": false
}
```

Use a UUID or a host-durable operation ID, not a new timestamp on retry. Then
call `join_meeting` with the smallest safe argument set:

```json
{
  "meeting_url": "<resolved meeting URL>",
  "join_at": "<future RFC 3339 time only when scheduled>",
  "summarize_on_end": true,
  "idempotency_key": "meeting-bot:<host-stable-id>"
}
```

Omit `join_at` for an immediate join. Do not add greeting/chat/action arguments.
Persist the returned `id` as `session_id` immediately. If the create request has an
uncertain transport outcome, retry **only** with the same persisted
`idempotency_key`; never issue a second key, which could place a second bot in
the meeting. If the host cannot persist state, state that duplicate-prevention
across a restart cannot be guaranteed and avoid an unbounded retry.

## Live Session and Transcript Loop

Interleave session checks with transcript reads; a successful transcript read
alone is not proof the bot attended.

1. Call `get_session(id)` at startup, after errors, and on a bounded cadence
   (for example every 15–30 seconds while joining/active, with backoff after
   transient failures).
2. Treat `waiting_for_admission` as a request for a meeting host to admit the
   visible bot. Tell the requester promptly; keep monitoring rather than
   claiming attendance. A non-null `joined_at` is the positive evidence that
   the bot actually attended.
3. Treat `ended`, `failed`, and `admission_denied` as terminal. Record status,
   `failure_reason`/status detail when present, and `joined_at`.
4. Long-poll finalized segments with
   `get_transcript(id, after_seq, limit, wait_seconds)`. Use `limit: 1000` and
   `wait_seconds: 15` to `20` (never above the service maximum of 25 seconds).
5. Deduplicate by durable `seq`. For each new segment, persist it or its needed
   fields, process mentions, set `after_seq` to the **maximum processed seq**,
   and checkpoint before the next call.
6. If a response fills the page (`1000` rows), drain immediately with the
   updated cursor and `wait_seconds: 0` until the page is short. Then resume
   the short long-poll. Do not rely on a server `next_after` value in place of
   the maximum sequence you successfully processed, and never reset the cursor
   when a poll returns an empty page or a null continuation value.
7. Use `get_events(id, after_seq, limit)` on a bounded cadence as well; advance
   and persist its independent event cursor only after deduping event sequences.
   It is useful for lifecycle and `transcript.completed` evidence, but is not a
   replacement for transcript reads.

Use bounded retries for transient network/5xx/429 errors, for example delays of
1, 2, 4, 8, then at most 15 seconds with jitter. Keep the same session and
cursors. For authentication errors, malformed requests, `not_found`, or an MCP
`result.isError` that is not plausibly transient, stop automatic retries and
surface the actionable error without exposing credentials or meeting secrets.

## Mention Detection and Prompt Alerts

Match **only finalized transcript segments** returned by `get_transcript`.
Normalize with Unicode case-folding and whitespace normalization. For each known
name or phrase variant, use escaped whole-phrase boundaries: it must not have a
letter or number immediately before or after the phrase. This lets “Ann Lee”
match “ann lee,” but not “ann leeds,” and avoids false positives such as `Ann`
inside `annual`. Keep variants only when known from the requester or authorized
profile/context; do not invent aliases.

For every new `(session_id, segment.seq, normalized_variant)` match, persist an
alert key before/with delivery and send one prompt notice to the current
conversation:

```text
Mention detected — <speaker_label or "Unknown speaker"> at +<relative_ts>:
“<exact segment text>”
```

Use the segment's `relative_ts` (format it as a relative timestamp if available)
and retain the exact quote without paraphrasing. A segment can produce alerts
for distinct requested terms, but never repeat the same segment/term after a
retry or resume. Append every alert record (term/variant, speaker, timestamp,
seq, exact quote) to the durable mention log for the final report.

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

## Obtain a Summary Without Duplicating Work

First use `get_artifacts(id)` to find existing `type: "summary"` artifacts,
especially the one expected from `summarize_on_end: true`. Poll the selected
artifact via `get_artifact(id, artifact_id)` until `status` is `completed` or
`failed` or a persisted deadline expires; use `content.text` only when
completed. When selecting any pending summary, persist its ID and one fixed
`summary_poll_deadline_at` (for example five minutes from the first selection).
Recovery must reuse, never extend, that deadline. During the normal automatic
summary delay, poll the list on a bounded cadence (for example 2, 5, then 10
seconds, for up to two minutes after transcript completion/settle).

If no summary exists after that bounded wait:

1. Check the durable record. If `summary_artifact_id` exists, poll it using the
   original persisted deadline. If `summary_creation_attempted` is true but no
   ID was returned, do **not** create another artifact—re-list only until that
   same deadline, then report the ambiguous outcome and use the fallback.
2. Otherwise persist `summary_creation_attempted: true`, call
   `create_artifact(id, type: "summary")` **exactly once**, and immediately
   persist the returned artifact ID. Set the fixed summary-poll deadline before
   the call so an interrupted or ambiguous create cannot restart the clock.
3. Poll that ID with `get_artifact` using bounded backoff until `completed`,
   `failed`, or the persisted deadline expires. Artifact creation is
   non-idempotent, so never retry an uncertain create call by creating another
   summary. If the deadline expires while the artifact is still pending, keep
   its ID/status for provenance and move to the transcript-grounded fallback.

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
- Include only items supported by the transcript; otherwise say “None identified in the collected transcript.”

## Mention log
- +00:00 — Speaker — matched term: “exact transcript quote”

## Attendance and completeness
- Session: `mtgsess_...`
- Status: `ended|failed|admission_denied`
- Joined evidence: `joined_at` value, or “not verified”
- Transcript: confirmed by `transcript.completed` | not confirmed (reason)

## Provenance
- Transcript segment sequence range/count and collection caveats
- Summary: service artifact `<id>` (`content.text`) | agent-generated fallback (reason)
```

Quote or link the meeting URL only where the recipient is already authorized;
otherwise redact it. Never claim attendees, decisions, outcomes, or completeness
that are absent from the session, events, or collected finalized transcript.

## Recovery Rules

On restart, load the durable operation record before doing anything. If it has a
`session_id`, resume `get_session`, event/transcript drains, and summary polling
from persisted cursors and dedupe keys—never call `join_meeting` again. If it has
an idempotency key but no saved session ID because creation was interrupted,
retry the original `join_meeting` arguments with that same key only after
checking any available response/log receipt. Persist every state transition,
alert key, cursor, terminal observation, and artifact ID before relying on it.

If the requester asks to stop a non-terminal session, confirm the scope when
needed and use `leave_meeting(id)` (REST: `DELETE /{id}`); it leaves/cancels but
does not erase the durable session history. Do not use destructive recording
media deletion as a cleanup shortcut.

## Worked Interpretation of a Vague Request

For: “Join this meeting and tell me what they discussed when it ends; if they
mention my name, let me know.”

- If the message already includes a meeting URL and the requester identity/name
  is known from authorized conversation/profile context, join immediately with
  `summarize_on_end: true`, the stable idempotency key, no voice/chat actions,
  and that name plus known variants as terms.
- If the link is missing, ask only for the link. If it is unclear whether the
  meeting is now or later, ask only for join timing. If “my name” is not known,
  ask for the name/phrases and optional variants.
- Tell the requester if host admission is required; send mention alerts in this
  conversation; after completion, send the bounded, evidence-based report.

## References

Use the public Meeting Bot documentation as the consumer-facing contract:

- [Meeting Bot overview](https://developers.telnyx.com/docs/meeting)
- [Meeting Bot quick start](https://developers.telnyx.com/docs/meeting/quick-start)
- [Meeting Bot MCP reference](https://developers.telnyx.com/docs/meeting/mcp)
- [Collect results](https://developers.telnyx.com/docs/meeting/collect-results)

This workflow was also checked against the service implementation at commit
[`a9f6326`](https://github.com/team-telnyx/meeting-bot-service/tree/a9f6326):

- [Service README](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326/README.md)
- [Production REST demo](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326/docs/basic-rest-demo.md)
- [Meeting-session REST routes](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326/src/routes/meetingSessions.ts)
- [MCP tool definitions](https://github.com/team-telnyx/meeting-bot-service/blob/a9f6326/src/mcp/server.ts)

Recheck tool schemas with MCP `tools/list` when a deployed service changes, and
never copy credentials, private meeting URLs, webhook secrets, or transient
deployment details into this skill.
