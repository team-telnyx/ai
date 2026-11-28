---
name: telnyx-kit-guardrails
description: >-
  Security and compliance guardrails for any Telnyx build: webhook signature
  verification, API key handling, 10DLC compliance, spend controls, and
  agent-safety rules. Use BEFORE shipping anything that touches production
  Telnyx resources, and while reviewing generated code.
metadata:
  author: telnyx
  product: platform
  kind: guardrail
---

# Telnyx Guardrails

## API keys

- One key per app/environment; env var (`TELNYX_API_KEY`) or secret manager,
  never source, never logs, never URLs (Bearer header only).
- Rotate any key that has EVER appeared in a chat, log file, or commit —
  session logs count.
- A static single-tenant service with a process-wide key must validate its
  presence at startup; a missing key fails boot, not first traffic.
- A delegated multi-tenant service that receives a tenant credential per
  request cannot validate every credential at process boot. Validate the
  credential and tenant/resource binding before that request's first outbound
  Telnyx action, fail that request closed, and never cache one tenant's
  credential for another.

## Webhook signatures (non-negotiable)

Every public webhook endpoint MUST verify Ed25519 signatures before
processing:

- Headers: `telnyx-signature-ed25519`, `telnyx-timestamp`; public key from
  portal (`TELNYX_PUBLIC_KEY` env).
- Verify over `timestamp|raw_body`, reject stale timestamps (>5 min) to
  block replays.
- Parse only after verification and branch by API family: API v2 events are
  JSON under `data.*`; TeXML callbacks use flat, form-encoded PascalCase
  fields. Configure authenticated TeXML callbacks as POST, verify the exact
  raw form body, and reject GET before trusting any callback field: the
  signature covers `timestamp|raw_body`, not query parameters.
- Verification must be a runtime code path, not a code comment — a string
  match on "TELNYX_PUBLIC_KEY" in the repo proves nothing.

## Recording and privacy

- Before enabling call recording or transcription, determine the consent and
  notice requirements that apply to every participant and jurisdiction. Give
  the required notice and obtain the required consent before recording starts;
  never assume one-party consent is sufficient.
- Minimize what is recorded and how long it is retained. Encrypt recordings,
  restrict access, define deletion and legal-hold paths, and keep recording
  URLs, transcripts, and access credentials out of logs and model context.
- A failover path must preserve the same consent state. Never let failover or
  retry logic begin recording before the consent gate has completed.
- For Pay over Voice, use a configured Payment Connector and the Telnyx Pay
  session. Never expose card or bank data to application logs, recordings,
  transcripts, webhook dumps, or model context; begin in test mode.

## US A2P sender registration and consent

- Registration depends on sender type:
  - Local 10-digit long code: 10DLC brand + campaign linked to the sending
    number's messaging profile.
  - Toll-free: toll-free verification.
  - Short code: carrier approval/provisioning.
- Pre-flight the sender-appropriate registration and profile assignment in
  code. Surface a clear readiness error instead of letting carriers filter
  silently.
- Honor consent and opt-outs (STOP) for every SMS/MMS sender type. For
  Messaging SMS/MMS API requests, Telnyx reports an opted-out recipient as
  error 40300. Never attempt to bypass one; treat that code as a compliance
  stop, not a transient failure. Do not infer that every asynchronous delivery
  event with code 40300 is an opt-out: classify it from its title and detail,
  and still treat a confirmed STOP as terminal. Error 40008 is a general asynchronous
  undeliverable result, not an opt-out signal: inspect the delivery detail and
  number validity, and retry only with bounded backoff and the existing send
  and spend ceilings. Do not apply either interpretation to another product
  merely because its numeric code matches; WhatsApp/Meta also uses 40008 as a
  catch-all error.

## Spend controls

- Number purchases and calls/messages are billable. In any automated flow:
  surface the cost (`cost_information.monthly_cost` for numbers) and get
  explicit human approval BEFORE the purchase call.
- Number Lookup enrichment is also billable. Name the single requested lookup
  type, disclose that the request can incur a charge, obtain explicit approval
  for that call in a separate API integration. The hosted Developer Kit connector
  does not expose Number Lookup, even with approval. Do not attempt a substitute
  hosted tool or request an API key in chat.
- Cap loops that touch billable endpoints (max sends/calls per run); a bug
  or prompt injection must hit a ceiling, not a credit card.
- Automatically retry only reads or writes protected by an idempotency
  mechanism the endpoint explicitly supports. Reconcile an ambiguous write
  through its resource ID, status/list endpoint, or webhook; never repeat a
  possibly accepted billable action without reconciliation or renewed human
  approval.
- Treat terminal configuration errors such as 40312 (messaging profile
  disabled) as non-retryable regardless of the accompanying HTTP status;
  review and fix the intended resource state instead of blind backoff.

## Agent-safety rules (when AI writes or runs the code)

- Never let generated code PATCH/DELETE an existing production resource
  (connection, profile, number) without explicit human opt-in naming the
  exact resource — create-your-own resources instead for tests.
- Refuse blanket account-wide deletion, release, or credential revocation.
  Require an enumerated resource-ID scope, dependency and impact review,
  export or recovery plan, safe ordering (credentials last), and explicit
  confirmation of the final reviewed set before any destructive action.
- No per-call/per-command webhook URL overrides from dynamic input — a
  planted `webhook_url` exfiltrates call events. Configure webhooks
  statically on the application/profile.
- Validate command allowlists: only forward documented fields to Telnyx
  APIs; reject unknown keys from model- or user-supplied objects.

## Review checklist

- [ ] Static key from env/secret manager and validated at startup, or delegated
      tenant credential validated before that request's first Telnyx action;
      all credentials absent from logs
- [ ] Every webhook route verifies Ed25519 + timestamp before side effects
- [ ] API v2 JSON dedupes on `data.id`; authenticated TeXML callbacks require
      POST, parse the verified form body, and dedupe on
      `(CallSid, SequenceNumber)`
- [ ] US SMS paths check sender-appropriate registration and treat STOP/40300
      as terminal
- [ ] Recording/transcription starts only after applicable notice and consent;
      retention, access, deletion, and failover preserve the same policy
- [ ] Billable actions carry human approval and loop ceilings
- [ ] No mutation of pre-existing account resources without named opt-in
- [ ] Destructive work has exact IDs, impact and recovery review, safe order,
      and final confirmation; no blanket account-wide deletion is accepted
- [ ] Primary and failover webhook paths are exercised, share idempotency
      state, fast-ack, and emit correlated delivery/failure metrics
