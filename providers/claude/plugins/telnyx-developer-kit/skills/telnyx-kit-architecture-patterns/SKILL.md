---
name: telnyx-kit-architecture-patterns
description: >-
  Reference architectures for Telnyx builds: AI voice agents, high-volume
  messaging, webhook processing, and multi-product apps. Use when DESIGNING a
  system (before code) to pick components, data flow, and failure handling. Do
  not use for a fixed-design guardrail review, a runtime incident diagnosis,
  or a channel/product comparison that does not request system architecture.
metadata:
  author: telnyx
  product: platform
  kind: architect
---

# Telnyx Architecture Patterns

## AI voice agent (the most requested build)

### TeXML flow

```
Caller → Telnyx number → TeXML app: <Connect><Stream url="wss://you"/></Connect>
       → your WebSocket: audio in → STT → LLM → TTS → audio out
       → later call steps through TeXML responses and verbs such as <Dial>/<Hangup>
```

- Answer + stream in one TeXML response; keep the webhook fast (<2s) —
  heavy work happens on the WebSocket, never in the webhook handler.
- Interruption handling: send `{"event":"clear"}` to flush queued audio when
  the caller barges in. `stream_id` appears on server-to-client events but is
  not part of the client clear frame.
- For a fully managed flow, `<Connect><AIAssistant>` connects the call to a
  configured Telnyx AI Assistant; your application does not run a media
  WebSocket server.
- `<Connect><ConversationRelay>` is different: configure its `url` as a
  reachable `wss://` application endpoint. Your server must accept the
  ConversationRelay WebSocket protocol and exchange the structured text and
  control messages that drive the conversation.
- Scale unit = concurrent streams. Key media WebSocket state on the received
  `stream_id`; reject missing identifiers instead of sharing a default/global state.
  TeXML HTTP callbacks use `CallSid` for call state and `StreamSid` for stream
  status callbacks. Those callback fields are not the media WebSocket field names.
  See [media frames](https://developers.telnyx.com/api-reference/websockets/stream-call-media-over-websocket)
  and [TeXML stream callbacks](https://developers.telnyx.com/api-reference/callbacks/texml-stream).
- Keep control in the TeXML model. Do not send Call Control commands against a
  TeXML-managed call; return the next XML response or use the appropriate
  TeXML verb for transfer and hangup behavior.

### Call Control flow

```
Caller → Telnyx number → Call Control app → call.initiated webhook
       → answer + streaming REST commands → your media/model pipeline
       → transfer/hangup REST commands
```

- Use this flow when application code must make imperative mid-call decisions.
  Key state on `call_control_id` and make commands idempotent with `command_id`;
  do not introduce a TeXML response loop into the same call.
- Keep webhook handling fast and perform media/model work outside the request
  handler.

For either flow:

- If the flow records or transcribes, put an explicit notice/consent gate
  before the first recording command. Persist that consent state across
  workers and failover, and design recording retention, access, and deletion
  before enabling capture — see telnyx-kit-guardrails.

## High-volume messaging

- One messaging profile per raw Messaging traffic class (for example,
  marketing vs transactional) — profiles carry throughput and webhook config.
  Route OTP and 2FA through the Verify API with a Verify profile instead of
  hand-rolling codes over raw Messaging. For US A2P, a local 10-digit
  long-code sender uses a messaging profile linked to its 10DLC campaign; a
  toll-free sender needs toll-free verification, while a short-code sender
  needs carrier approval/provisioning.
- Queue sends (worker + retry with backoff on 429 reading `Retry-After`);
  never loop sends inline in a request handler.
- Delivery truth: the `message.finalized` webhook. Iterate every entry in
  `data.payload.to` and correlate each recipient by `phone_number`; group MMS
  can contain different outcomes for different destinations. Use
  `data.payload.to[0].status` only when the originating request is guaranteed
  to have exactly one recipient. Dedupe deliveries on the event `data.id` and
  correlate business state on `data.payload.id`.
- Store conversation state server-side keyed on BOTH numbers (user × your
  number), with a TTL.

## Webhook processing by API family

For API v2 JSON event webhooks (including Messaging and Call Control):

- Verify the raw request bytes before parsing using the
  `telnyx-signature-ed25519` and `telnyx-timestamp` request headers plus the
  public key from Mission Control Portal (`TELNYX_PUBLIC_KEY`) — see
  telnyx-kit-guardrails.
- Return 200 fast; enqueue work. Telnyx retries on timeout — dedupe on the
  event `data.id` before side effects.
- The event envelope is nested: `data.event_type`, `data.payload.*`. Route on
  `data.event_type` with an explicit allowlist and a logged default arm.

TeXML instruction requests and status callbacks are a separate wire format:

- Configure authenticated callbacks as POST. They carry flat, PascalCase form
  fields as `application/x-www-form-urlencoded`; verify the exact raw body
  before decoding the form. Do not parse these as JSON or read `data.*`.
- Reject GET on authenticated callback routes. The signature covers
  `timestamp|raw_body`, not the query string, so query fields are not bound to
  an otherwise valid empty-body signature.
- Treat retries as duplicates and dedupe status callbacks on the composite
  `(CallSid, SequenceNumber)` rather than `data.id`.
- Keep API v2 JSON and TeXML routes separate so content-type, parsing,
  validation, and idempotency rules cannot be confused.

## Multi-product apps (e.g. contact center)

- Numbers are the join point: a number carries voice (connection) AND
  messaging (profile) assignments — provision both at purchase time.
- Use `connection_id` (voice) and `messaging_profile_id` (messaging)
  explicitly in config, never inferred at runtime.
- Keep provisioning (buy number, attach profile/connection) in setup
  scripts, not request paths — provisioning APIs have distinct rate/auth
  characteristics from runtime APIs.

## Failure design defaults

- Every Telnyx client call: timeout + surfaced error code (codes are
  precise — see telnyx-kit-debugging) + no retry on 4xx except 429.
- Automatic retries are limited to reads and operations protected by an
  endpoint-supported idempotency mechanism. Reconcile an ambiguous write by
  resource ID, status/list endpoint, or webhook before another attempt; require
  renewed human approval before repeating an unreconciled billable action.
- Idempotency: `command_id` on Call Control commands; message `id` dedupe
  on webhooks.
- Configure distinct primary and failover webhook URLs for critical call
  paths. Exercise failover before launch; both endpoints must verify
  signatures, share the same durable dedupe store, and fast-ack before work.
- Correlate identifiers within the selected API family: TeXML uses `CallSid`,
  `SequenceNumber`, and `StreamSid`; Call Control uses `data.id`,
  `call_control_id`, `call_session_id`, `call_leg_id`, and `command_id`.
  Include Telnyx request IDs and error codes across ingress, commands, and
  workers. Alert on primary/failover delivery failures, queue age, and
  duplicate suppression. Never log API keys or webhook secrets, recording
  URLs, recording media, or transcript content.
- In every architecture response that includes observability or recording,
  state that logging must exclude API keys, webhook secrets, recording URLs,
  recording media, and transcript content; do not leave this boundary implied.
- For a static single-tenant service, validate its process-wide API key,
  profile IDs, and connection IDs at startup. In a delegated multi-tenant
  service, validate the current tenant's credential and resource IDs before
  that request's first outbound Telnyx action; a tenant credential cannot be
  validated globally at process boot.
