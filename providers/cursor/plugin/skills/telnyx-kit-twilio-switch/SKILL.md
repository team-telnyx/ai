---
name: telnyx-kit-twilio-switch
description: >-
  Orient fast when moving from Twilio to Telnyx: concept and name mapping,
  the differences that silently break ported code, and when to hand off to
  the full telnyx-twilio-migration skill. Use when the user mentions Twilio,
  TwiML, a Messaging Service, or pasting Twilio code to convert.
metadata:
  author: telnyx
  product: platform
  kind: advisor
---

# Coming from Twilio

Most Twilio concepts have a Telnyx equivalent with a different name. The
danger is not the renames — it is the handful of differences that make ported
code fail **silently**, with a 200 response and nothing happening.

## Name mapping

| Twilio | Telnyx | Note |
|---|---|---|
| Account SID + Auth Token | API key v2 (`Authorization: Bearer`) | one credential, not a pair |
| Messaging Service SID | `messaging_profile_id` | per-request passing is an OVERRIDE; the sending number's assignment is the norm |
| TwiML | TeXML | overlapping verb vocabulary, different runtime — see silent breakage below |
| TwiML App | TeXML Application | |
| Programmable Voice REST | Call Control API | imperative commands against a `call_control_id` |
| Verify Service | Verify Profile | channel is chosen by the ENDPOINT (`/v2/verifications/sms\|call\|flashcall`), not a `type` body field |
| Lookup `Fields=` | `?type=carrier` / `?type=caller-name` | data is null unless requested |
| Access Token (Voice SDK) | Telephony Credential + short-lived JWT | generate JWTs on your backend; never expose the Telnyx API key or long-lived SIP password to clients |
| Twilio Pay / `<Pay>` | Pay over Voice | configure a Payment Connector; trigger through TeXML `<Pay>`, Voice API, or an AI Assistant |
| Studio flow | (no equivalent) | extract the logic, then migrate the code |
| TaskRouter, Flex, Sync | no direct managed equivalent | keep on Twilio, use a third party, or build on Call Control/WebRTC primitives |
| Proxy | custom number masking | build with Call Control/Messaging plus a number pool |
| Autopilot | AI Assistants or bring your own NLU | redesign and validate the conversation rather than mechanically translating it |

## The five silent breakers

1. **TeXML attributes are case-sensitive and unknown ones are ignored.**
   `transcribe=`, `Timeout=`, `numdigits=`, `speechModel=` are dead at runtime
   with no error — transcription and digit collection just never happen. Same
   for unknown verbs: dropped silently.
2. **Recording defaults vary by TeXML surface.** `<Record>` defaults to dual
   channels, while `<Dial recordingChannels>` defaults to single. Set the
   channel mode explicitly after reviewing the migrated flow; do not assume a
   single Telnyx-wide default.
3. **Delivery events differ.** Use `message.finalized` as final delivery truth.
   Iterate every entry in `data.payload.to` and correlate by `phone_number` for
   group or multi-recipient messages; use `data.payload.to[0].status` only when
   the send is guaranteed to target exactly one recipient. The synchronous
   response and intermediate events are not proof of delivery.
4. **Webhook shape depends on the API family.** API v2 events are nested JSON
   under `data.*`; TeXML POST callbacks remain flat
   `application/x-www-form-urlencoded` PascalCase fields (or query parameters
   for configured GET callbacks). Reusing either parser for the other route
   silently loses fields.
5. **Signatures are Ed25519, not HMAC-SHA1.** A ported verifier fails closed
   (or worse, is left disabled).

Two more worth knowing: Telnyx supports Pay over Voice through TeXML `<Pay>`,
the Voice API, and AI Assistants, but it is not a blind text substitution.
Configure a Payment Connector, start in test mode, preserve Telnyx's masking
boundary, exercise payment progress and completion callbacks, and keep payment
data out of recordings, logs, webhooks, and model context. Follow the
[Pay over Voice guide](https://developers.telnyx.com/docs/voice/programmable-voice/pay)
before switching the connector to live mode. Telnyx also returns structured
configuration/compliance failures
(for example `40312` for a disabled messaging profile) that Twilio code may
not handle. Branch on `errors[].code` and do not automatically back off and
retry an error that requires intervention.

## Choosing the voice path

- Twilio app is **TwiML-driven** → TeXML. This is the closest migration path,
  but not a blind drop-in: swap endpoint/auth, then validate every verb,
  attribute, callback shape, and default against the current TeXML runtime.
- Twilio app **drives calls from code** (dynamic routing, AI agents) → Call
  Control. Each action is a REST command; no XML round-trip.
- Twilio **Media Streams** (`<Connect><Stream>`) → TeXML `<Connect><Stream>`
  or Call Control streaming. Field renames: `streamSid` → `stream_id`,
  `callSid` → `call_control_id`.

## When to hand off

For anything beyond orientation — an actual codebase to migrate — switch to
the **`telnyx-twilio-migration`** skill (in the `telnyx-platform` plugin). It
runs a 6-phase migration with automated scanners, a TeXML validator that
catches the silent breakers above, per-language SDK references, and live
integration tests. This skill is the map; that one is the machinery.
