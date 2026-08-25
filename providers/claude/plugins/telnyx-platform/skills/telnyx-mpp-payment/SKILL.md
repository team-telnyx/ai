---
name: telnyx-mpp-payment
description: >-
  Add credit to a Telnyx account through Machine Payment Protocol (MPP)
  using Stripe Link or Tempo USDC, then verify the transaction and balance.
metadata:
  author: telnyx
  product: payments
  requires:
    bins:
      - curl
      - node
      - npm
      - npx
    env:
      - TELNYX_API_KEY
---

# Pay into your Telnyx account with MPP

Use Machine Payment Protocol (MPP) to add USD credit to your Telnyx account. You can pay with a Stripe Link agent wallet backed by an eligible card, or with USDC from a funded Tempo wallet.

## When to use this skill

Use this skill when you want to add Telnyx account credit through an HTTP `402 Payment Required` flow using Stripe Link or Tempo USDC. It guides you through setup, payment approval, the paid retry, status checks, and safe support handoff.

All Telnyx MPP account-credit payments use this endpoint:

```text
https://api.telnyx.com/v2/machine-payments/account-credit
```

The first request returns HTTP `402 Payment Required`. This is an expected part of the payment flow. Link CLI or `mppx` reads the challenge, pays it, and retries the request with proof of payment. Telnyx credits the account that owns the API key used for the first request.

## Before you pay

- These payments move real funds. Check the amount, payment method, and Telnyx account before you approve anything.
- Use an API key for the account you want to credit.
- Send only `amount_usd` in the request body. Do not send `account_id`; Telnyx gets the account from your API key.
- Write the amount as a positive USD value with no more than two decimal places, such as `12.00`.
- The maximum amount payable in a single MPP transaction may vary.
- Your Telnyx account must be active and eligible for machine payments.
- The payment is tied to the account and amount in the challenge. Do not change either after you approve or sign it.
- Never reuse a Link spend request, Shared Payment Token, Tempo payment credential, or completed challenge.
- Link accepts eligible cards in supported regions — currently cards issued in the United States or Canada.
- Never print, commit, or send your API key, Link access token, Shared Payment Token, wallet private key, or `Authorization: Payment` value.

## Setup

You need Node.js, npm, `curl`, and a Telnyx API key. Link payments use `@stripe/link-cli@0.11.0`. Tempo payments use `mppx` and a funded Tempo wallet.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TELNYX_API_KEY` | Yes | API key for the Telnyx account that will receive the credit |
| `MPP_AMOUNT_USD` | Yes | Positive USD amount with no more than two decimal places |
| `MPP_ENDPOINT` | Yes | Telnyx MPP account-credit endpoint shown below |
| `LINK_PAYMENT_METHOD_ID` | Link only | Eligible Link card payment-method ID |
| `LINK_NETWORK_ID` | Link only | Network ID decoded from the current payment challenge |
| `LINK_SPEND_REQUEST_ID` | Link only | Approved, one-time Link spend-request ID |
| `TELNYX_TRANSACTION_ID` | Status check only | Transaction ID returned by a completed payment |

Keep the API key in your shell environment rather than putting it directly in a command or file:

```sh
export TELNYX_API_KEY='KEYxxxxx'
export MPP_AMOUNT_USD='12.00'
export MPP_ENDPOINT='https://api.telnyx.com/v2/machine-payments/account-credit'
```

## Pay with Link

### Sign in

```sh
npx --yes @stripe/link-cli@0.11.0 auth login \
  --client-name 'Telnyx MPP payer' \
  --timeout 600
```

Open the URL shown by the CLI, confirm the phrase, and approve access. Check that the sign-in completed:

```sh
npx --yes @stripe/link-cli@0.11.0 auth status
```

### Choose a card

```sh
npx --yes @stripe/link-cli@0.11.0 payment-methods list --format json
```

Choose a card marked as eligible for agentic payments. Link accepts eligible cards in supported regions — currently cards issued in the United States or Canada.

```sh
export LINK_PAYMENT_METHOD_ID='<csmrpd-id>'
```

### Get a fresh payment challenge

Save the response headers and body in private temporary files:

```sh
umask 077
CHALLENGE_HEADERS="$(mktemp /tmp/telnyx-mpp-headers.XXXXXX)"
CHALLENGE_BODY="$(mktemp /tmp/telnyx-mpp-body.XXXXXX)"

curl -sS \
  --dump-header "$CHALLENGE_HEADERS" \
  --output "$CHALLENGE_BODY" \
  --write-out '%{http_code}\n' \
  -X POST "$MPP_ENDPOINT" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"amount_usd\":\"$MPP_AMOUNT_USD\"}"
```

The response should be HTTP `402`. Find the Stripe `WWW-Authenticate: Payment ...` header and decode it:

```sh
npx --yes @stripe/link-cli@0.11.0 mpp decode \
  --challenge '<complete Stripe Payment challenge header value>'
```

Copy `methodDetails.networkId` from the decoded challenge:

```sh
export LINK_NETWORK_ID='<networkId-from-current-challenge>'
```

Always use the value from the current challenge. Save the `X-Request-Id` response header as well; Telnyx Support can use it to trace this request. Keep the full challenge private because it contains the account and amount for the payment.

### Create and approve the spend request

Link expects the amount in cents. Convert `MPP_AMOUNT_USD` to cents and use that integer for `--amount`.

```sh
npx --yes @stripe/link-cli@0.11.0 spend-request create \
  --payment-method-id "$LINK_PAYMENT_METHOD_ID" \
  --credential-type shared_payment_token \
  --network-id "$LINK_NETWORK_ID" \
  --amount '<amount-in-cents>' \
  --currency usd \
  --context 'Authorize one card payment to add the specified USD credit to my Telnyx account through Machine Payment Protocol using Stripe Link.' \
  --request-approval
```

Open the approval URL and check the card and amount before clicking **Approve**. Save the spend-request ID and retrieve it until its status is `approved`:

```sh
export LINK_SPEND_REQUEST_ID='<lsrq-id>'
npx --yes @stripe/link-cli@0.11.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID"
```

Each spend request can be used once. Create and approve a new one for every Link payment.

### Pay

Write the response to a private file because it can contain receipt information:

```sh
umask 077
LINK_RESULT="$(mktemp /tmp/telnyx-mpp-link-result.XXXXXX.json)"

npx --yes @stripe/link-cli@0.11.0 mpp pay \
  "$MPP_ENDPOINT" \
  --spend-request-id "$LINK_SPEND_REQUEST_ID" \
  --method POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data "{\"amount_usd\":\"$MPP_AMOUNT_USD\"}" \
  --format json > "$LINK_RESULT"
```

Do not submit the same spend request again. A newly recorded credit returns HTTP `201`. The response includes the Telnyx transaction `id`, credited `account_id`, amount, currency, Stripe `payment_intent_id`, `receipt_reference`, `status`, and `created_at`. It should show:

```json
{
  "provider": "stripe",
  "payment_method": "stripe_spt",
  "status": "settled",
  "created": true
}
```

A repeat of an already completed payment can return HTTP `200` with `created: false`. This means Telnyx returned the existing transaction instead of adding the credit twice.

## Pay with Tempo USDC

### Prepare your wallet

Create a named mainnet wallet if you do not already have one:

```sh
npx mppx account create --account my-telnyx-payer --network mainnet
```

Back up the wallet and keep its private key secret. Transfer enough USDC to cover the payment and network fees, then check the wallet:

```sh
npx mppx account view --account my-telnyx-payer --network mainnet
```

### Pay

```sh
umask 077
TEMPO_RESULT="$(mktemp /tmp/telnyx-mpp-tempo-result.XXXXXX.json)"

npx mppx \
  --include \
  --network mainnet \
  --account my-telnyx-payer \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'Content-Type: application/json' \
  -J "{\"amount_usd\":\"$MPP_AMOUNT_USD\"}" \
  "$MPP_ENDPOINT" > "$TEMPO_RESULT"
```

`mppx` reads the HTTP `402` challenge, signs the USDC payment, and submits the paid request. If the response is slow or interrupted, check the saved output and wallet activity before running another payment.

A newly recorded credit returns HTTP `201`. The response includes the Telnyx transaction `id`, credited `account_id`, amount, currency, Tempo transaction hash in `receipt_reference`, `status`, and `created_at`. It should show:

```json
{
  "provider": "tempo",
  "payment_method": "tempo_usdc",
  "status": "settled",
  "created": true
}
```

Save the Tempo transaction hash, Telnyx transaction ID, and any `X-Request-Id` shown by the client. You can look up the hash in your wallet or a Tempo transaction viewer.

## Check whether the payment went through

### Read the payment response

The paid response should contain the account and amount you expected, `status: "settled"`, a Telnyx transaction `id`, and a `receipt_reference`. A new credit has `created: true`. The response should also include a `Payment-Receipt` header.

This confirms that Telnyx recorded the payment. Check the balance separately to confirm that the credit is available on the account.

Keep the raw receipt private. Save its reference information and whether the header was present.

### Find the transaction in Telnyx

List your recent crypto and machine-payment transactions:

```sh
curl -sS --get \
  'https://api.telnyx.com/v2/payment/crypto_transactions' \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode 'page[number]=1' \
  --data-urlencode 'page[size]=20'
```

Find the `id` returned by the paid response. You can then request that transaction directly:

```sh
export TELNYX_TRANSACTION_ID='<transaction-id-from-paid-response>'

curl -sS \
  "https://api.telnyx.com/v2/payment/crypto_transactions/$TELNYX_TRANSACTION_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

A completed transaction normally has `status: "settled"`. Its payment entry may also contain `status: "settled"`, `payment_settled_at`, and a transaction URL.

### Check your Telnyx balance

```sh
curl -sS \
  'https://api.telnyx.com/v2/balance' \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Confirm that the available credit includes your payment. The balance may update shortly after the payment response, so check again after a brief wait before contacting support.

### Check Link or Tempo

For Link, retrieve the spend request:

```sh
npx --yes @stripe/link-cli@0.11.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID"
```

A completed Link payment should show a successful payment outcome. Keep the spend-request ID and Stripe `payment_intent_id`.

For Tempo, look up the `receipt_reference` transaction hash in your wallet or a Tempo transaction viewer and confirm that it succeeded.

## What to save for support

Save these details for each payment:

- `X-Request-Id` from the HTTP `402` response;
- `X-Request-Id` from the paid response, if your client shows it;
- Telnyx transaction `id` and `account_id`;
- amount and currency;
- payment method;
- `receipt_reference`;
- Stripe `payment_intent_id` and Link spend-request ID, if you used Link;
- Tempo transaction hash, if you used Tempo;
- `created_at` and the approximate UTC time you paid; and
- the final HTTP status and error body if the payment did not complete.

Send these identifiers to Telnyx Support if you need help tracing a payment. Do not send your API key, wallet private key, Link access token, Shared Payment Token, `Authorization: Payment` value, or full raw receipt in a normal support message. Use a secure channel if support asks for sensitive material.

## If something goes wrong

### HTTP `401`

Make sure the first request used `Authorization: Bearer $TELNYX_API_KEY` and that the key belongs to the account you want to credit.

### HTTP `402`

This is the payment challenge. It does not mean that payment has completed. Continue with either Link or Tempo using the current challenge.

### HTTP `403`

Machine payments may not be available for your account, or your account may not be eligible. Contact Telnyx Support and include the request ID.

### HTTP `422`

Make sure `amount_usd` is present, positive, and has no more than two decimal places. Payment limits can vary. Do not add `account_id` to the request.

### Link or Tempo shows success, but your balance did not change

Do not pay again right away. Check the Telnyx transaction endpoint and balance, then check the Link spend request or Tempo transaction. If the credit still does not appear, contact Telnyx Support with the saved identifiers.

### You lost the response or do not know whether payment completed

Check the transaction list, the specific Telnyx transaction if you have its ID, your account balance, and the Link or Tempo status. Do not reuse a one-time credential or repeat the payment just because the original response was lost. Contact Telnyx Support if those checks do not resolve it.
