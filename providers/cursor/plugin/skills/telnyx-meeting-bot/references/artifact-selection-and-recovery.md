# Artifact Selection and Creation Recovery

Use this protocol for final summaries and every manually requested transcript
artifact.

## Observable Implementation Contract

- When `summarize_on_end` is enabled, the finalizer appends
  `transcript.completed` and then calls the normal asynchronous
  `create_artifact(..., "summary")` path.
- `get_events` exposes each event's `occurred_at` timestamp.
- Artifact responses expose `id`, `type`, `status`, `content`, `prompt`,
  `model_provenance`, `failure_reason`, `created_at`, and `updated_at`.
- The public artifact shape has no `automatic`, `origin`, or final-summary marker.
- Artifact lists are newest-first by `created_at`; do not treat list position as
  proof of automatic origin.
- Creation is non-idempotent and returns a durable `pending` row before generation
  completes.

Do not invent an automatic-artifact marker that the implementation does not
provide.

## Durable State

Persist per session:

```json
{
  "transcript_completed_at": null,
  "known_manual_artifact_ids": [],
  "unreconciled_unknown_manual_creates": [],
  "summary_candidate_ids": [],
  "selected_summary_artifact_id": null,
  "summary_poll_deadline_at": null,
  "summary_creation": {
    "state": "not_started",
    "attempt_count": 0,
    "max_pre_send_retries": 2,
    "artifact_id": null,
    "last_error": null
  }
}
```

Creation states are `not_started`, `dispatching`, `accepted`,
`pre_send_failed`, `rejected`, and `outcome_unknown`. Set one fixed deadline
before the first attempt; recovery never extends it.

Every successful manual creation must add the returned ID to
`known_manual_artifact_ids` immediately. Keep the type, stable custom-prompt
hash, and dispatch start time in the corresponding manual request record. If a
manual create becomes `outcome_unknown`, add that request and artifact type to
`unreconciled_unknown_manual_creates`. Do not infer that any unrecognized
same-type artifact is automatic while that uncertainty remains: client and
service clocks need not be comparable, and the unknown create returned no ID.

## Select the End-of-Meeting Summary

1. Drain the final transcript and page `get_events` until `transcript.completed`
   appears. Persist its `occurred_at` as `transcript_completed_at`.
2. During the bounded automatic-summary window, repeatedly re-list artifacts.
   A likely automatic candidate has `type: "summary"`, an ID absent from
   `known_manual_artifact_ids`, and `created_at >= transcript_completed_at`.
3. Persist every candidate ID. Poll all current candidates; do not lock onto the
   first pending artifact and ignore summaries that appear or complete later.
4. First identify the candidate with the smallest non-negative
   `created_at - transcript_completed_at` delta because the implementation calls
   automatic creation immediately after appending `transcript.completed`. Rank
   **all statuses** before filtering by status. It must be the unique minimum and
   is eligible only when no same-type unknown create remains unreconciled. If two
   candidates share the minimum timestamp, origin is ambiguous. Never use
   artifact ID, list order, completion order, or client-clock windows as an
   origin tie-breaker; use the labeled transcript-grounded fallback instead.
5. Select that unique closest candidate only if it is `completed`. If it is
   `pending`, keep re-listing and polling it and every candidate through the fixed
   deadline; never skip to a later completed candidate. If the unique closest is
   `failed` at the final reconciliation, use the fallback rather than a later
   artifact.
6. Immediately before fallback, re-list once more and poll every current
   candidate to terminal status within the remaining deadline.

If `transcript.completed` was not observed, `ended_at` is only a weaker lower
bound. Label selection as unconfirmed and never present a summary created before
that bound as the final meeting summary.

Because the public API has no origin marker, an unknown external caller can create
a manual summary after `transcript.completed` that is indistinguishable from the
automatic one. An outcome-unknown create can likewise leave its ID absent from
`known_manual_artifact_ids`; conservatively quarantine automatic-origin
selection for that artifact type until the unknown request is reconciled to an
ID by stronger host evidence. If timing and known IDs do not identify one unique
candidate, say so and prefer the transcript-grounded fallback over claiming an
artifact is the automatic end-of-meeting summary.

## Manual Create State Machine

1. Persist the fixed poll deadline and bounded `max_pre_send_retries` before the
   first call.
2. Immediately before invoking REST or MCP, atomically move the request to
   `dispatching` and increment `attempt_count`.
3. If the client proves that no request bytes were sent—for example, local
   serialization/validation failure, client-queue rejection, or connection/TLS
   failure before request transmission—record `pre_send_failed`. The same durable
   request may return to `dispatching` and retry within its original deadline and
   retry budget because no artifact could have been created.
4. A complete implementation response with `invalid_request`, `invalid_state`,
   `not_configured`, or `not_found` is `rejected`; these checks occur before the
   artifact row is created. Correct the cause before any bounded retry.
5. Once any request bytes may have been sent, a timeout, disconnect, process
   interruption, malformed response, or unknown server error is
   `outcome_unknown`. Recovery from either `dispatching` or `outcome_unknown`
   must persist an unreconciled same-type unknown-create marker and
   re-list/reconcile only; it must not issue another create. Until stronger host
   evidence maps that request to a returned ID, every otherwise-unrecognized
   same-type artifact is possible manual output, not evidence of automatic
   origin.
6. When the response returns an artifact ID, atomically record `accepted`, the
   ID, and the manual ID set before polling it.

Never collapse `pre_send_failed` and `outcome_unknown` into one
`creation_attempted` boolean. Only a proven pre-send failure or a confirmed
pre-creation rejection may retry; ambiguous create outcomes never do.

## Polling and Fallback

Poll every accepted/candidate ID until `completed`, `failed`, or the original
fixed deadline. Read `content.text` only from `completed`. Preserve IDs, status,
provenance, and failure reason. Before falling back, perform the final list/poll
reconciliation above.

If no trustworthy completed service artifact is available, deliver the parent
skill's explicitly labeled transcript-grounded fallback and state whether final
transcript completeness was confirmed.
