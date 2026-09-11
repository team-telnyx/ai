# ACP Payments (Agentic Commerce Protocol)

> Fund your Telnyx account through an Agentic Commerce Protocol (ACP) checkout, paying with a Stripe Link agent wallet or USDC from a Tempo wallet.

This is **authenticated account funding**: every call carries your Telnyx API key, and the credit lands on the account that owns the key. A funded balance pays for any Telnyx product. ACP wraps the same Link and Tempo payment steps as [MPP](./mpp-payments.md) in a checkout you can create, retrieve, complete, and cancel, with idempotency keys on every write and an order record on completion. For the single-request HTTP `402` version see [mpp-payments.md](./mpp-payments.md); for funding with USDC on Base see [x402-payments.md](./x402-payments.md); for paying per request without any Telnyx account (inference/TTS/STT only), use the keyless x402 endpoints at [x402.telnyx.com](https://x402.telnyx.com/).

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md)) for the account you want to credit
- `curl`, `jq`, Node.js, and npm
- One of:
  - **Stripe Link** — an eligible card in a supported region (currently cards issued in the United States or Canada), paid via `@stripe/link-cli@0.16.0`
  - **Tempo** — a funded mainnet USDC wallet, paid via `mppx@0.6.28`
- ACP checkout must be available for your account (a `403` with code `acp_unavailable` means it isn't — contact Telnyx Support)

**Endpoints:**

| Operation | Endpoint |
|---|---|
| Create checkout | `POST https://api.telnyx.com/v2/checkout_sessions` |
| Retrieve checkout | `GET https://api.telnyx.com/v2/checkout_sessions/{checkout_id}` |
| Complete checkout | `POST https://api.telnyx.com/v2/checkout_sessions/{checkout_id}/complete` |
| Cancel checkout | `POST https://api.telnyx.com/v2/checkout_sessions/{checkout_id}/cancel` |

Every request needs `Authorization: Bearer <key>` and `API-Version: 2026-04-17`. Every `POST` needs a fresh `Idempotency-Key`. Checkouts cannot be updated (`POST /v2/checkout_sessions/{id}` returns `400 checkout_not_updatable`); create a new one instead.

## How the flow works

1. You `POST` a checkout for the catalog item `account_credit_usd` with the amount in whole US cents. The response is HTTP `201` with `status: "ready_for_payment"` and the payment handlers the checkout accepts.
2. You pick a handler and pay it: `com.telnyx.mpp.stripe` (handler ID `stripe_shared_payment_token`) with a Link Shared Payment Token, or `com.telnyx.mpp.tempo` (handler ID `tempo_usdc_mpp`) by signing the handler's MPP challenge with `mppx`.
3. You `POST` the credential to `/complete` exactly once. Telnyx returns HTTP `200`, `status: "completed"`, and an `order` whose `id` is the Telnyx transaction for the credit.

Do not send `account_id` — Telnyx derives the account from your API key. Per-payment amount limits apply and may change; error responses state the current values.

## Quick Start

```bash
export TELNYX_API_KEY='KEYxxxxx'
export ACP_AMOUNT_CENTS='1200'     # $12.00
export ACP_BASE_URL='https://api.telnyx.com'

# Step 1: Create the checkout (expect HTTP 201, status ready_for_payment)
umask 077
CHECKOUT="$(mktemp /tmp/telnyx-acp-checkout.XXXXXX.json)"
curl -sS --output "$CHECKOUT" --write-out '%{http_code}\n' \
  -X POST "$ACP_BASE_URL/v2/checkout_sessions" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')" \
  -H 'Content-Type: application/json' \
  --data "{\"line_items\":[{\"id\":\"account_credit_usd\",\"unit_amount\":$ACP_AMOUNT_CENTS}],\"currency\":\"usd\",\"capabilities\":{}}"
export ACP_CHECKOUT_ID="$(jq -r '.id' "$CHECKOUT")"
jq '{status, expires_at, handlers: [.capabilities.payment.handlers[] | {id, name}]}' "$CHECKOUT"
```

### Pay with Stripe Link

```bash
# Sign in and pick a card marked eligible for agentic payments (supported regions — currently US/CA)
npx --yes @stripe/link-cli@0.16.0 auth status
npx --yes @stripe/link-cli@0.16.0 payment-methods list --format json
export LINK_PAYMENT_METHOD_ID='<csmrpd-id>'

# The merchant to pay comes from the checkout's Stripe handler
export LINK_NETWORK_ID="$(jq -r '.capabilities.payment.handlers[] | select(.name=="com.telnyx.mpp.stripe") | .config.merchant_id' "$CHECKOUT")"

# Create a one-time spend request, approve it at the URL it prints
npx --yes @stripe/link-cli@0.16.0 spend-request create \
  --payment-method-id "$LINK_PAYMENT_METHOD_ID" \
  --credential-type shared_payment_token \
  --network-id "$LINK_NETWORK_ID" \
  --amount "$ACP_AMOUNT_CENTS" --currency usd \
  --context 'Add USD credit to my Telnyx account via an ACP checkout.' \
  --request-approval --format json
export LINK_SPEND_REQUEST_ID='<lsrq-id>'

# Retrieve the approved token into a private file and complete once
SPEND="$(mktemp /tmp/telnyx-acp-spend.XXXXXX.json)"
COMPLETE_BODY="$(mktemp /tmp/telnyx-acp-complete.XXXXXX.json)"
npx --yes @stripe/link-cli@0.16.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID" \
  --include shared_payment_token --format json > "$SPEND"
jq '{payment_data: {handler_id: "stripe_shared_payment_token",
     instrument: {type: "card", credential: {type: "spt", token: .shared_payment_token.id}}}}' \
  "$SPEND" > "$COMPLETE_BODY"
curl -sS -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/complete" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')" \
  -H 'Content-Type: application/json' \
  --data-binary "@$COMPLETE_BODY"
```

### Pay with Tempo USDC

```bash
# Extract the Tempo handler's MPP challenge, sign it once with mppx, complete once
TEMPO_CHALLENGE="$(mktemp /tmp/telnyx-acp-tempo-challenge.XXXXXX)"
TEMPO_CREDENTIAL="$(mktemp /tmp/telnyx-acp-tempo-credential.XXXXXX)"
jq -r '.capabilities.payment.handlers[] | select(.name=="com.telnyx.mpp.tempo") | .config.challenge' "$CHECKOUT" > "$TEMPO_CHALLENGE"
# Validate, then sign with mppx (signing authorizes the transfer — once per checkout)
npx --yes mppx@0.6.28 sign --network mainnet --dry-run --challenge "$(cat "$TEMPO_CHALLENGE")"
npx --yes mppx@0.6.28 sign --account my-telnyx-payer --network mainnet --format json \
  --challenge "$(cat "$TEMPO_CHALLENGE")" | jq -r '.authorization' > "$TEMPO_CREDENTIAL"
COMPLETE_BODY="$(mktemp /tmp/telnyx-acp-complete.XXXXXX.json)"
jq -Rs '{payment_data: {handler_id: "tempo_usdc_mpp",
        instrument: {type: "tempo_usdc", credential: {type: "mpp_payment", token: (. | rtrimstr("\n"))}}}}' \
  "$TEMPO_CREDENTIAL" > "$COMPLETE_BODY"
curl -sS -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/complete" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')" \
  -H 'Content-Type: application/json' \
  --data-binary "@$COMPLETE_BODY"
```

## API Reference

### Create a checkout

**`POST /v2/checkout_sessions`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `line_items[0].id` | string | Yes | Must be `account_credit_usd` |
| `line_items[0].unit_amount` | integer | Yes | Amount in whole US cents (e.g. `1200`) |
| `currency` | string | Yes | Must be `usd` |
| `capabilities` | object | Yes | Send `{}` |

Returns HTTP `201` with the checkout: `id`, `status`, `currency`, `line_items`, `totals`, `expires_at`, and `capabilities.payment.handlers[]`. Each handler has `id`, `name`, and a `config` carrying the MPP `challenge`; the Stripe handler also carries `config.merchant_id`. Re-sending the same key and body returns the same checkout with `Idempotent-Replayed: true`.

**Python** (create):

```python
import os
import uuid
import requests

resp = requests.post(
    "https://api.telnyx.com/v2/checkout_sessions",
    headers={
        "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
        "API-Version": "2026-04-17",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json={
        "line_items": [{"id": "account_credit_usd", "unit_amount": 1200}],
        "currency": "usd",
        "capabilities": {},
    },
)
assert resp.status_code == 201
checkout = resp.json()
handlers = {h["name"]: h for h in checkout["capabilities"]["payment"]["handlers"]}
```

**TypeScript** (create):

```typescript
const resp = await fetch("https://api.telnyx.com/v2/checkout_sessions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
    "API-Version": "2026-04-17",
    "Idempotency-Key": crypto.randomUUID(),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    line_items: [{ id: "account_credit_usd", unit_amount: 1200 }],
    currency: "usd",
    capabilities: {},
  }),
});
const checkout = await resp.json(); // status 201, checkout.status === "ready_for_payment"
```

### Complete a checkout

**`POST /v2/checkout_sessions/{checkout_id}/complete`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_data.handler_id` | string | Yes | `stripe_shared_payment_token` or `tempo_usdc_mpp` |
| `payment_data.instrument` | object | Yes | Link: `{"type":"card","credential":{"type":"spt","token":"spt_..."}}`. Tempo: `{"type":"tempo_usdc","credential":{"type":"mpp_payment","token":"Payment ..."}}` |

Returns HTTP `200` with `status: "completed"` and an `order` (`id`, `checkout_session_id`, `status`, `line_items`, `totals`). `order.id` is the Telnyx transaction ID. HTTP `202` means the provider outcome is not yet known: retrieve the checkout, do not resubmit.

### Retrieve and cancel

**`GET /v2/checkout_sessions/{checkout_id}`** returns the current checkout. Statuses: `ready_for_payment`, `complete_in_progress`, `completed`, `canceled`.

**`POST /v2/checkout_sessions/{checkout_id}/cancel`** cancels a `ready_for_payment` checkout. Completed or already cancelled checkouts return HTTP `405`.

## Verify the credit

```bash
# The order ID is the Telnyx transaction
curl -sS "https://api.telnyx.com/v2/payment/crypto_transactions/<order-id>" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Check the balance
curl -sS 'https://api.telnyx.com/v2/balance' \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Error Handling

Errors use the ACP shape `{"type","code","message"}`.

| HTTP Status | Code | Meaning | Resolution |
|-------------|------|---------|------------|
| `400` | `invalid_request` | Bad `API-Version`, missing `Idempotency-Key`, or malformed body | Fix the headers or body |
| `400` | `checkout_not_updatable` | Checkouts cannot be changed | Create a new checkout |
| `401` | — | Bad or missing API key | Use `Authorization: Bearer` with a key for the account to credit |
| `403` | `acp_unavailable` / `forbidden` | ACP not available for this account, or rejected by policy | Contact Telnyx Support |
| `404` | `checkout_not_found` | Unknown checkout or wrong account | Check the ID and key |
| `405` | `checkout_not_cancelable` | Already completed or cancelled | Nothing to do |
| `422` | `checkout_not_payable` | Expired, cancelled, or already complete | Create a new checkout |
| `422` | `idempotency_conflict` | Key reused with a different body | Use a new key |

## Safety notes

- These payments move real funds — confirm the amount, payment method, and account before approving.
- Complete a checkout exactly once. Spend requests, Shared Payment Tokens, and Tempo credentials are one-time use. Never pay again just because a response was lost — retrieve the checkout and check the balance first.
- Never print, commit, or share your API key, Link access token, Shared Payment Token, wallet private key, or signed `Payment ...` credential.
- Save the checkout ID, both idempotency keys, and the order ID for support tracing.

## Full skill

For the complete step-by-step flow (handler validation, spend-request approval, the Tempo signing script, verification, and support handoff), install the `telnyx-acp-payment` skill:

```bash
npx skills add team-telnyx/ai --skill telnyx-acp-payment --agent <AGENT>
```
