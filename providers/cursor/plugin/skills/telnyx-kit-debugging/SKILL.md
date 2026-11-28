---
name: telnyx-kit-debugging
description: >-
  Triage Telnyx API errors and runtime failures fast: exact error-code
  meanings, retryability, silent-failure traps (TeXML attribute case, dead
  webhooks, 10DLC filtering), and where to look when calls or messages fail
  with no error at all. Do not use for pre-launch architecture or compliance
  review when no runtime failure has occurred.
metadata:
  author: telnyx
  product: platform
  kind: guardrail
---

# Telnyx Debugging & Observability

## Error-code triage (product and retry context are part of the code)

| Product/API | Code | Meaning | Retry? |
|---|---|---|---|
| API v2 | 10009 | Bad/missing API key | No — fix auth |
| Messaging SMS/MMS | 40310 | Invalid `to` address | No — fix input |
| Messaging SMS/MMS | 40305 | Invalid `from` address or sender/profile association | No — fix provisioning |
| Messaging SMS/MMS | 40312 | Messaging profile disabled | No — enable the intended profile only after reviewing that change |
| Messaging SMS/MMS API request | 40300 | Recipient opted out (STOP) | Never — compliance stop |
| Messaging SMS/MMS delivery | 40300 | Context-dependent delivery error | Inspect title/detail; a confirmed STOP is terminal, otherwise diagnose the reported carrier, content, or routing cause |
| WhatsApp/Meta | 40008 | Meta catch-all error | No blind retry — inspect template parameters, number formatting, and the 24-hour window |
| Messaging SMS/MMS delivery | 40008 | Undeliverable | Bounded retry only after inspecting number validity and delivery detail; preserve send and spend caps |
| API v2 | 10004 | Missing required parameter | No — add the required field |
| API v2 | 10005 | Resource or URL not found | No — fix the ID or path |
| Any | — | Rate limited | Honor `Retry-After`; retry only a safe read or an idempotency-protected operation |
| Any | — | Upstream 5xx | Automatic retry only for reads or operations protected by an endpoint-supported idempotency mechanism |

- Retry safety is separate from HTTP status. For a write, reuse the same
  endpoint-supported idempotency key; never invent client-side deduplication
  and assume the server honors it. If a write may have succeeded, reconcile
  through its resource ID, status/list endpoint, or webhook before another
  attempt. Do not repeat an ambiguous billable write without reconciliation
  or explicit human approval.

- Do not infer the HTTP status from the Telnyx error-code prefix or hard-code
  one status for every endpoint. Branch on both the response status and the
  exact `errors[0].code`; the code carries the product-specific meaning.
- SDK errors (Node telnyx@6): HTTP status is `err.status`; the Telnyx code
  is `err.error?.errors?.[0]?.code`. (`err.statusCode` and `err.rawErrors`
  are undefined — dead branches if you use them.)

## Silent failures (no error, nothing happens)

- **TeXML attributes are case-sensitive and unknown ones are silently
  ignored** — `transcribe=`, `Timeout=`, `numdigits=`, `speechModel=` are
  dead at runtime. Same for unknown verbs: silently dropped. Validate
  documents against the current Telnyx TeXML Verbs & Nouns reference before
  deploying; do not rely on a fixed verb count. The current vocabulary
  includes newer instructions such as `<AIGather>`, `<AIAssistant>`,
  `<ConversationRelay>`, and `<HttpRequest>`.
- **Messages "sent" but never delivered**: delivery outcome only exists in
  `message.finalized`; there is no `message.delivered` event. Iterate every
  `data.payload.to` entry and correlate by `phone_number` for group or
  multi-recipient messages. Index zero is sufficient only when the request was
  guaranteed to contain exactly one recipient.
- **US SMS delivered=false with no API error**: check sender-specific carrier
  readiness before blaming code. US local long-code SMS needs 10DLC campaign
  linkage; toll-free traffic needs toll-free verification, while short-code
  traffic needs carrier approval.
- **Webhooks not arriving**: first inspect the application/profile default and
  any endpoint-supported per-request override. Messaging sends can set
  `webhook_url` and `webhook_failover_url`, which take priority over the
  profile; those values must still come from trusted static configuration, not
  dynamic user/model input. Inspect Webhook Deliveries, endpoint TLS, and
  response time (slow 200 = retry storm). For API v2 JSON events, trace
  `data.id`; for flat TeXML callbacks, trace `(CallSid, SequenceNumber)` and
  confirm the route requires POST, verifies the raw form body, rejects GET,
  and never expects `data.*`.
- **Push notifications never arrive (WebRTC mobile)**: a push credential
  that exists but is not ATTACHED to the credential connection delivers
  nothing — set `ios_push_credential_id`/`android_push_credential_id` on
  the connection.

## Observability defaults

- Log Telnyx request id + error code + `detail` on every failure (codes are
  specific; `detail` names the offending field via `source.pointer`).
- Emit metrics per error code, not per HTTP status — 40305 and 40310 are
  different bugs.
- Keep a replayable, access-controlled store of webhook envelopes (they are
  the ground truth for delivery disputes), with personal content redacted or
  encrypted and a defined retention/deletion policy.
- Correlate identifiers by API family: event `data.id`, `call_session_id`,
  `call_leg_id`, and `command_id` for API v2/Call Control; TeXML `CallSid`,
  `SequenceNumber`, and `StreamSid` for TeXML. Include the Telnyx request ID
  and error code. Monitor primary/failover delivery failures, queue age, and
  duplicates instead of relying on unstructured logs.
