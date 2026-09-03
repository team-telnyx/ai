# Repeating Semantic Action Protocol

Use this protocol only when the requester explicitly asks a semantic `speak` or
`send_chat` rule to repeat. One-shot rules use the simpler session-and-rule claim
key in the parent skill.

## Persisted Rule State

Persist one record scoped by `(session_id, rule_id)`:

```json
{
  "lease_owner": null,
  "lease_expires_at": null,
  "generation": 0,
  "last_evaluated_seq": 0,
  "context_segments": 3,
  "active_occurrence": null
}
```

When active, `active_occurrence` is:

```json
{
  "occurrence_first_seq": 41,
  "evidence_seqs": [41, 42],
  "claim_key": "action:<session_id>:<rule_id>:repeat:41",
  "status": "active"
}
```

Persist the semantic condition, action payload, classifier/configuration, and
fixed `context_segments` with the rule. Do not change them while the rule is
active.

## Ordered Evaluation and Canonical Evidence

1. Acquire a durable exclusive lease for `(session_id, rule_id)` with an atomic
   compare-and-swap (CAS). Only the current lease owner may classify transcript
   windows or update this rule state. A replacement worker must wait for lease
   expiry and then acquire a newer `generation`.
2. Consume finalized transcript segments in strictly increasing `seq` order.
   Evaluate each sequence once using the fixed trailing window ending at that
   sequence, but do not advance the durable cursor in a separate write.
3. When no occurrence is active and the condition becomes true, choose the
   **shortest contiguous suffix ending at the current sequence** that still
   satisfies the persisted semantic condition. This structurally determines one
   evidence list; its first element is `occurrence_first_seq`. If semantic
   classification is stochastic, only the lease owner runs it and persists the
   selected evidence through the transaction below—other workers never
   independently classify a committed sequence.
4. For every evaluated sequence, execute one per-sequence CAS transaction that
   compares the prior `generation`, lease owner/validity, and prior
   `last_evaluated_seq`. That same transaction must advance `last_evaluated_seq`,
   persist the evaluation result and canonical `evidence_seqs`, and perform the
   applicable occurrence transition: create `active_occurrence` plus the durable
   `claimed` action `action:<session_id>:<rule_id>:repeat:<occurrence_first_seq>`,
   retain the active occurrence, atomically clear it, or retain no occurrence.
5. After that transaction commits, dispatch only if a second CAS changes that
   claim from `claimed` to `dispatching` immediately before transport invocation.
   A CAS loser reloads state without dispatching.
6. While an occurrence is active, every positive overlapping window reuses its
   persisted claim key. It cannot create another claim, even if the newest
   evaluation sequence differs or a shorter evidence suffix later appears.

## Clearing and Re-arming

Clear `active_occurrence` only when a later ordered evaluation satisfies both:

- its fixed context window contains none of the persisted `evidence_seqs`; and
- the persisted semantic condition evaluates false.

The clear is the occurrence transition inside the same per-sequence transaction
that advances `last_evaluated_seq`; never advance the cursor and clear in separate
writes. Compare the current `generation`, lease owner/validity, active claim key,
and prior cursor. An older/stale worker must fail that CAS and reload without
clearing. A new repeat claim is permitted only after the clear commits and a
still-later ordered evaluation produces a new false-to-true transition.

## Crash Recovery

- Resume from the persisted `last_evaluated_seq`; its evaluation and occurrence
  transition committed in the same transaction, so never reclassify it.
- If the lease expired, acquire a newer generation before evaluating.
- If `active_occurrence` exists, reuse its claim key and action state.
- A recovered `claimed` action may compete once for the `claimed` → `dispatching`
  CAS. A recovered `dispatching` action becomes `outcome_unknown` before any
  trigger evaluation unless durable transport evidence proves no bytes were sent.
- Preserve the parent skill's side-effect rule: never automatically repeat an
  accepted or outcome-unknown `speak`/`send_chat` dispatch.

This protocol intentionally favors at-most-once action delivery over reacting to
ambiguous consecutive utterances that never produce a clear transition.
