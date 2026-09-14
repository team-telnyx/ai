---
name: telnyx-kit-quickstart
description: >-
  Go from zero to a working Telnyx integration in one session: account and key
  setup, the first verified API call, and the provisioning each product needs
  before it will work. Use when starting a NEW Telnyx build or when a first
  call fails with an auth, provisioning, or compliance error.
metadata:
  author: telnyx
  product: platform
  kind: setup
---

# Telnyx Quickstart

The fastest correct path from nothing to a working call or message. Do these
in order — most first-call failures are a skipped step here, not a code bug.

## 1. Key and connectivity (2 minutes)

```bash
export TELNYX_API_KEY="KEY..."   # portal.telnyx.com/#/app/api-keys
curl -s -H "Authorization: Bearer $TELNYX_API_KEY" https://api.telnyx.com/v2/balance
```

A `200` with a balance object means auth works. `401` with code `10009` means
the key is wrong or missing — fix that before anything else. Put the key in an
env var or secret manager, never in source (see `telnyx-kit-guardrails`).

Check `available_credit`, not the sign of `balance`: credit accounts can report
a negative balance while still having usable credit. If `available_credit` is
absent, compute `balance + credit_limit`. Billable actions are blocked when
the resulting available credit is negative.

## 2. A number, with the right capability

```bash
# search (free, read-only)
curl -s -G -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "filter[country_code]=US" \
  --data-urlencode "filter[features][]=sms" \
  --data-urlencode "filter[features][]=voice" \
  --data-urlencode "filter[limit]=5" \
  "https://api.telnyx.com/v2/available_phone_numbers"

# order (BILLABLE — recurring monthly charge; confirm the cost first)
ORDER_RESPONSE=$(curl -fsS -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers":[{"phone_number":"+1..."}]}' \
  "https://api.telnyx.com/v2/number_orders")
ORDER_ID=$(printf '%s' "$ORDER_RESPONSE" | jq -er '.data.id')

# ordering is asynchronous; poll with a ceiling and provision only on success
ORDER_STATUS=pending
for attempt in $(seq 1 30); do
  ORDER_RESPONSE=$(curl -fsS \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/number_orders/$ORDER_ID")
  ORDER_STATUS=$(printf '%s' "$ORDER_RESPONSE" | jq -r '.data.status')
  case "$ORDER_STATUS" in
    success) break ;;
    failure|cancelled|deleted) printf 'Number order stopped: %s\n' "$ORDER_STATUS" >&2; exit 1 ;;
    pending) sleep 2 ;;
    *) printf 'Unexpected number-order status: %s\n' "$ORDER_STATUS" >&2; exit 1 ;;
  esac
done
[ "$ORDER_STATUS" = success ] || {
  printf 'Order still pending; inspect requirements before continuing.\n' >&2
  exit 1
}
```

Numbers carry capabilities. A voice-only number will not send SMS no matter
how correct your code is — filter on the features you need at search time.
Immediately before ordering, re-query the selected number, present its current
authoritative upfront and recurring costs with currency, and obtain explicit
human approval naming that number. Do not approve against a caller-supplied or
stale quote. A `pending` order means its numbers are not active. Inspect its
sub-number orders and regulatory requirements, satisfy any outstanding items,
and continue to provisioning only after the number-order status is `success`.

## 3. Provisioning per product (the step people skip)

A number alone is not enough. Each product needs its own association before
traffic flows:

| To do this | The number needs | Set via |
|---|---|---|
| Send/receive SMS | a **messaging profile** assigned | `PATCH /v2/phone_numbers/{id}/messaging` (separate sub-resource — not the base PATCH) |
| Receive calls to your app | a **connection / Call Control app** assigned | `PATCH /v2/phone_numbers/{id}` with `connection_id` (not `/voice`; that endpoint changes voice settings but does not accept `connection_id`) |
| Make outbound calls | application/connection + an **outbound voice profile** attached to it | Call Control: `PATCH /v2/call_control_applications/{id}`; TeXML: `PATCH /v2/texml_applications/{id}`; SIP: `PATCH /v2/{credential\|fqdn\|ip}_connections/{id}`; set `outbound.outbound_voice_profile_id` |
| Send US A2P SMS | messaging profile plus sender-appropriate registration | 10DLC for local long codes; toll-free verification or short-code approval for those sender types |
| Send/receive fax | a **fax application** assigned to the number (`connection_id` is also required on send); outbound fax also needs an **outbound voice profile** on the app | Create with `POST /v2/fax_applications`, assign the number with `PATCH /v2/phone_numbers/{id}` using the Fax Application ID as `connection_id`, and for outbound set `outbound.outbound_voice_profile_id` on the Fax Application |

Note the internal id vs E.164 distinction: `PATCH`/`DELETE` on numbers take the
**internal numeric id**, not the phone number. Look it up first:

```bash
PHONE_NUMBER_ID=$(curl -fsS -G \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "filter[phone_number]=+1..." \
  "https://api.telnyx.com/v2/phone_numbers" | jq -er '.data[0].id')
```

## 4. First verified send

Send one message to your own phone and confirm delivery end to end. This is a
billable action: first check the current price for the exact sender,
destination, and route; present a one-message maximum with currency; and get
explicit human approval for that cap. Do not infer approval from the presence
of a destination number or API key.

```bash
curl -s -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"+1YOURNUMBER","from":"+1YOURTELNYXNUMBER","text":"hello"}' \
  "https://api.telnyx.com/v2/messages"
```

Then fetch the message by id. This quickstart sends to exactly one recipient,
so delivery truth is `data.to[0].status`, not the send response. `queued` or
`sending` is not delivered — poll or use the
`message.finalized` webhook.

## 5. Webhooks, if your product needs them

Voice (beyond fire-and-forget), inbound SMS, fax, and verify all deliver
results by webhook. Before writing handlers:

- Configure the default webhook URL on the **application/profile**. Use a
  per-request override only when that endpoint explicitly supports one (for
  example, Messaging `webhook_url`).
- Verify Ed25519 signatures before processing (`telnyx-kit-guardrails`).
- API v2 event webhooks are JSON under `data.event_type` and `data.payload.*`.
  Return `200` fast, enqueue work, and dedupe on `data.id`.
- Configure authenticated TeXML callbacks as POST with flat
  `application/x-www-form-urlencoded` PascalCase fields. Verify the exact raw
  form body before parsing, and reject GET before trusting callback fields:
  the signature covers `timestamp|raw_body`, not query parameters.
  Instruction URLs must return TeXML promptly; callback routes
  should dedupe on TeXML identifiers rather than looking for `data.id`.

For local development, expose a tunnel (ngrok or similar) and point the
application's webhook URL at it — Telnyx must reach your endpoint from the
public internet.

## First-call failure decode

| Symptom | Cause | Fix |
|---|---|---|
| `10009` | bad or missing key | check `TELNYX_API_KEY` |
| `40305` | `from` number not on the sending messaging profile | assign the number to the profile |
| `40312` | messaging profile disabled | enable it, then retry deliberately |
| synchronous `40300` whose title/detail says `Blocked due to STOP message` | STOP compliance block | terminal — do not work around; an async delivery `40300` must be classified from its title/detail, not the code alone |
| `10004` | required parameter missing (e.g. fax `connection_id`) | add the parameter |
| `10005` | resource or URL not found | verify the resource id and API path |
| API success but nothing arrives | provisioning or sender-registration filtering | check step 3, then `telnyx-kit-debugging` |

HTTP status can vary by endpoint and validation stage; use the structured
`errors[].code` and detail together with the transport status.

Deeper triage lives in `telnyx-kit-debugging`; product selection in
`telnyx-kit-product-navigator`; the compliance and safety rules you should
apply from day one in `telnyx-kit-guardrails`.
