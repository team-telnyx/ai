# MPP Payments (Machine Payment Protocol)

> Fund your Telnyx account through an HTTP `402 Payment Required` flow, paying with a Stripe Link agent wallet or USDC from a Tempo wallet.

This is **authenticated account funding**: every call carries your Telnyx API key, and the credit lands on the account that owns the key. A funded balance pays for any Telnyx product. For paying per request without any Telnyx account (inference/TTS/STT only), use the keyless x402 endpoints at [x402.telnyx.com](https://x402.telnyx.com/) instead; for funding with USDC on Base rather than Link/Tempo, see [x402-payments.md](./x402-payments.md).

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md)) for the account you want to credit
- Node.js, npm, and `curl`
- One of:
  - **Stripe Link** — an eligible card issued in the United States or Canada, paid via `@stripe/link-cli`
  - **Tempo** — a funded mainnet USDC wallet, paid via `mppx`
- Account must be active and eligible for machine payments (a `403` means it isn't — contact Telnyx Support)

**Endpoint:** `POST https://api.telnyx.com/v2/machine-payments/account-credit`

## How the flow works

1. You `POST` the amount to the endpoint with your API key. The response is HTTP `402 Payment Required` carrying a payment challenge — this is expected, not an error.
2. A payment client (Link CLI or `mppx`) reads the challenge, collects an approved payment, and retries the request with proof of payment.
3. Telnyx records the credit against the account that owns the API key and returns HTTP `201` with a transaction record.

Send only `amount_usd` in the request body (positive USD, max two decimal places). Do not send `account_id` — Telnyx derives the account from your API key.

## Quick Start

```bash
export TELNYX_API_KEY='KEYxxxxx'
export MPP_AMOUNT_USD='12.00'
export MPP_ENDPOINT='https://api.telnyx.com/v2/machine-payments/account-credit'

# Step 1: Request the payment challenge (expect HTTP 402)
curl -sS -X POST "$MPP_ENDPOINT" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"amount_usd\":\"$MPP_AMOUNT_USD\"}"
```

### Pay with Stripe Link

```bash
# Sign in and pick a card marked eligible for agentic payments (US/CA-issued only)
npx --yes @stripe/link-cli@0.11.0 auth login --client-name 'Telnyx MPP payer' --timeout 600
npx --yes @stripe/link-cli@0.11.0 payment-methods list --format json
export LINK_PAYMENT_METHOD_ID='<csmrpd-id>'

# Decode the 402 challenge (the WWW-Authenticate: Payment header from Step 1)
# and copy methodDetails.networkId from the output
npx --yes @stripe/link-cli@0.11.0 mpp decode \
  --challenge '<complete Stripe Payment challenge header value>'
export LINK_NETWORK_ID='<networkId-from-current-challenge>'

# Create a one-time spend request (amount in cents), approve it in the
# browser URL it prints, then wait for status "approved"
npx --yes @stripe/link-cli@0.11.0 spend-request create \
  --payment-method-id "$LINK_PAYMENT_METHOD_ID" \
  --credential-type shared_payment_token \
  --network-id "$LINK_NETWORK_ID" \
  --amount '<amount-in-cents>' \
  --currency usd \
  --context 'Add USD credit to my Telnyx account via MPP.' \
  --request-approval
export LINK_SPEND_REQUEST_ID='<lsrq-id>'
npx --yes @stripe/link-cli@0.11.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID"

# Pay (each spend request is single-use)
npx --yes @stripe/link-cli@0.11.0 mpp pay "$MPP_ENDPOINT" \
  --spend-request-id "$LINK_SPEND_REQUEST_ID" \
  --method POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data "{\"amount_usd\":\"$MPP_AMOUNT_USD\"}" \
  --format json
```

### Pay with Tempo USDC

```bash
npx mppx --include --network mainnet --account my-telnyx-payer \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'Content-Type: application/json' \
  -J "{\"amount_usd\":\"$MPP_AMOUNT_USD\"}" \
  "$MPP_ENDPOINT"
```

## API Reference

### Request the payment challenge

**`POST /v2/machine-payments/account-credit`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount_usd` | string | Yes | Positive USD amount, max two decimal places (e.g. `"12.00"`). Do not send `account_id` — the account comes from the API key. |

The first (unpaid) request returns HTTP `402 Payment Required` with a `WWW-Authenticate: Payment ...` challenge header. The payment client pays the challenge and retries the same request with proof of payment; the paid retry returns HTTP `201`.

**Python** (challenge request):

```python
import os
import requests

resp = requests.post(
    "https://api.telnyx.com/v2/machine-payments/account-credit",
    headers={"Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}"},
    json={"amount_usd": "12.00"},
)
assert resp.status_code == 402  # expected: payment challenge
challenge = resp.headers["WWW-Authenticate"]
request_id = resp.headers.get("X-Request-Id")  # save for support tracing
```

**TypeScript** (challenge request):

```typescript
const resp = await fetch(
  "https://api.telnyx.com/v2/machine-payments/account-credit",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount_usd: "12.00" }),
  }
);
// 402 is expected — it carries the payment challenge
const challenge = resp.headers.get("www-authenticate");
const requestId = resp.headers.get("x-request-id"); // save for support tracing
```

The paid retry itself is performed by the payment client (`@stripe/link-cli` or `mppx`) — see [Quick Start](#quick-start).

## Response

A newly recorded credit returns HTTP `201` with the Telnyx transaction `id`, credited `account_id`, amount, currency, provider receipt reference, `status: "settled"`, and `created: true`. Re-submitting an already completed payment returns HTTP `200` with `created: false` — the existing transaction, not a duplicate charge.

## Verify the credit

```bash
# Find the transaction
curl -sS --get 'https://api.telnyx.com/v2/payment/crypto_transactions' \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[number]=1' --data-urlencode 'page[size]=20'

# Check the balance
curl -sS 'https://api.telnyx.com/v2/balance' \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Error Handling

| HTTP Status | Meaning | Resolution |
|-------------|---------|------------|
| `401` | Bad or missing API key | Use `Authorization: Bearer` with a key for the account to credit |
| `402` | Payment challenge (expected) | Continue the flow with Link or `mppx` |
| `403` | Account not eligible for machine payments | Contact Telnyx Support with the request ID |
| `422` | Invalid `amount_usd` | Positive USD, max two decimals; don't send `account_id` |

## Safety notes

- These payments move real funds — confirm the amount, payment method, and account before approving.
- Spend requests, Shared Payment Tokens, Tempo credentials, and completed challenges are one-time use. Never reuse them, and never pay again just because a response was lost — check the transaction list and balance first.
- Never print, commit, or share your API key, Link access token, Shared Payment Token, wallet private key, or `Authorization: Payment` value.
- Save the `X-Request-Id` headers, transaction ID, and receipt reference for support tracing.

## Full skill

For the complete step-by-step flow (challenge decoding, spend-request approval, verification, and support handoff), install the `telnyx-mpp-payment` skill:

```bash
npx skills add team-telnyx/ai --skill telnyx-mpp-payment --agent <AGENT>
```
