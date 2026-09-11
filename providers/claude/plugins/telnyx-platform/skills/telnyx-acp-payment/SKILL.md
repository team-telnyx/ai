---
name: telnyx-acp-payment
description: >-
  Add credit to a Telnyx account through an Agentic Commerce Protocol (ACP)
  checkout, paying with a Stripe Link agent wallet or Tempo USDC, then verify
  the order and balance.
metadata:
  author: telnyx
  product: payments
  requires:
    bins:
      - curl
      - jq
      - node
      - npm
      - npx
    env:
      - TELNYX_API_KEY
---

# Pay into your Telnyx account with ACP

Use Agentic Commerce Protocol (ACP) to add USD credit to your Telnyx account. You create a checkout, pay it with a Stripe Link agent wallet backed by an eligible card or with USDC from a funded Tempo wallet, and complete the checkout once. Telnyx credits the account that owns the API key.

## When to use this skill

Use this skill when you want an ACP checkout lifecycle around a Telnyx account-credit payment: a checkout you can retrieve, cancel, and reconcile, with idempotency keys on every write and an order record when it completes. If you only want the single-request HTTP `402` flow, the `telnyx-mpp-payment` skill funds the same account with the same Link or Tempo credentials.

All Telnyx ACP account-credit checkouts use these endpoints:

```text
POST https://api.telnyx.com/v2/checkout_sessions
GET  https://api.telnyx.com/v2/checkout_sessions/{checkout_id}
POST https://api.telnyx.com/v2/checkout_sessions/{checkout_id}/complete
POST https://api.telnyx.com/v2/checkout_sessions/{checkout_id}/cancel
```

There is one product: USD account credit, catalog item `account_credit_usd`. Each checkout advertises the payment handlers it accepts. Telnyx uses Machine Payment Protocol (MPP) challenges inside those handlers, so the Link and Tempo payment steps are the same ones used for a direct MPP payment.

## Before you pay

- These payments move real funds. Check the amount, payment method, and Telnyx account before you approve anything.
- Use an API key for the account you want to credit. Telnyx gets the account from your API key. Do not send `account_id`.
- Write the amount in whole US cents as an integer, such as `1200` for `$12.00`.
- Per-payment amount limits apply and may change. An error response states the current values.
- Send `API-Version: 2026-04-17` on every request. Other versions are rejected.
- Send a fresh `Idempotency-Key` on every `POST`. Use a different key for the create, complete, and cancel requests of the same checkout.
- A checkout expires. Check `expires_at` and start a new checkout if it has passed. Checkouts cannot be updated; create a new one instead.
- The payment is tied to the account and amount in the checkout's challenge. Do not change either after you approve or sign it.
- Complete a checkout exactly once. Never reuse a Link spend request, Shared Payment Token, Tempo payment credential, or completed challenge.
- Link accepts eligible cards in supported regions — currently cards issued in the United States or Canada.
- Never print, commit, or send your API key, Link access token, Shared Payment Token, wallet private key, or a signed `Payment ...` credential.

## Setup

You need `curl`, `jq`, Node.js, npm, and a Telnyx API key. Link payments use `@stripe/link-cli@0.16.0`. Tempo payments use `mppx@0.6.28` and a funded Tempo wallet. Both tools run through `npx`, so nothing is installed into your project.

Run every command block below in the same shell session. Later blocks reuse variables such as `CHECKOUT` and `ACP_CHECKOUT_ID` that earlier blocks set.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TELNYX_API_KEY` | Yes | API key for the Telnyx account that will receive the credit |
| `ACP_AMOUNT_CENTS` | Yes | Positive integer amount in US cents |
| `ACP_BASE_URL` | Yes | `https://api.telnyx.com` |
| `ACP_CHECKOUT_ID` | After create | Checkout `id` returned by the create request |
| `LINK_PAYMENT_METHOD_ID` | Link only | Eligible Link card payment-method ID |
| `LINK_NETWORK_ID` | Link only | `config.merchant_id` from the checkout's Stripe handler |
| `LINK_SPEND_REQUEST_ID` | Link only | Approved, one-time Link spend-request ID |

Keep the API key in your shell environment rather than putting it directly in a command or file:

```sh
export TELNYX_API_KEY='KEYxxxxx'
export ACP_AMOUNT_CENTS='1200'
export ACP_BASE_URL='https://api.telnyx.com'
```

## Read your starting balance

```sh
curl -sS "$ACP_BASE_URL/v2/balance" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Save `data.available_credit` so you can confirm the credit later.

## Create the checkout

Save the response in a private temporary file because it contains the payment challenge for your account:

```sh
umask 077
CHECKOUT="$(mktemp /tmp/telnyx-acp-checkout.XXXXXX)"

curl -sS \
  --output "$CHECKOUT" \
  --write-out '%{http_code}\n' \
  -X POST "$ACP_BASE_URL/v2/checkout_sessions" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')" \
  -H 'Content-Type: application/json' \
  --data "{\"line_items\":[{\"id\":\"account_credit_usd\",\"unit_amount\":$ACP_AMOUNT_CENTS}],\"currency\":\"usd\",\"capabilities\":{}}"
```

The response should be HTTP `201` with `status: "ready_for_payment"`. Check the checkout before you pay:

```sh
jq '{id, status, currency, total: (.totals[] | select(.type=="total") | .amount), expires_at,
     handlers: [.capabilities.payment.handlers[] | {id, name}]}' "$CHECKOUT"
export ACP_CHECKOUT_ID="$(jq -r '.id' "$CHECKOUT")"
```

Confirm that the total equals `ACP_AMOUNT_CENTS`, that `expires_at` is in the future, and that the handler you plan to use is listed:

| Handler `name` | Handler `id` | Pays with |
|---|---|---|
| `com.telnyx.mpp.stripe` | `stripe_shared_payment_token` | Stripe Link Shared Payment Token backed by an eligible card |
| `com.telnyx.mpp.tempo` | `tempo_usdc_mpp` | USDC on Tempo from a funded wallet |

Each handler's `config.challenge` is an MPP `Payment ...` challenge bound to your account and amount. Keep it private. Repeating the create request with the same `Idempotency-Key` and body returns the same checkout with an `Idempotent-Replayed: true` header instead of creating a second one.

## Pay with Link

### Sign in

```sh
npx --yes @stripe/link-cli@0.16.0 auth status
```

If you are not signed in:

```sh
npx --yes @stripe/link-cli@0.16.0 auth login \
  --client-name 'Telnyx ACP payer' \
  --timeout 600
```

Open the URL shown by the CLI, confirm the phrase, and approve access.

### Choose a card

```sh
npx --yes @stripe/link-cli@0.16.0 payment-methods list --format json
```

Choose a card whose `capabilities.agentic_payments.eligible` is not `false`. Link accepts eligible cards in supported regions — currently cards issued in the United States or Canada.

```sh
export LINK_PAYMENT_METHOD_ID='<csmrpd-id>'
```

### Read the merchant from the checkout

The Stripe handler carries the merchant profile that Link must pay. Always take it from the current checkout:

```sh
export LINK_NETWORK_ID="$(jq -r '.capabilities.payment.handlers[] | select(.name=="com.telnyx.mpp.stripe") | .config.merchant_id' "$CHECKOUT")"
echo "$LINK_NETWORK_ID"
```

The value looks like `profile_...`.

### Create and approve the spend request

```sh
npx --yes @stripe/link-cli@0.16.0 spend-request create \
  --payment-method-id "$LINK_PAYMENT_METHOD_ID" \
  --credential-type shared_payment_token \
  --network-id "$LINK_NETWORK_ID" \
  --amount "$ACP_AMOUNT_CENTS" \
  --currency usd \
  --context 'Authorize one card payment to add the specified USD credit to my Telnyx account through an ACP checkout using Stripe Link.' \
  --request-approval \
  --format json
```

The output includes the spend-request `id` and an approval URL of the form `https://app.link.com/activity/approve/<lsrq-id>`. The CLI may return at once with `status: "pending_approval"` or keep waiting until the request is approved, denied, or expired. Either way, open the URL, check the card and amount, and click **Approve**. Save the spend-request ID:

```sh
export LINK_SPEND_REQUEST_ID='<lsrq-id>'
```

Each spend request can be used once. Create and approve a new one for every payment.

### Retrieve the token

Write the token to a private file. Never put the token in a command argument:

```sh
umask 077
SPEND="$(mktemp /tmp/telnyx-acp-spend.XXXXXX)"

npx --yes @stripe/link-cli@0.16.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID" \
  --include shared_payment_token --format json > "$SPEND"

jq -e '.status == "approved" or .status == "succeeded"' "$SPEND" > /dev/null \
  && echo 'APPROVED' \
  || echo 'NOT APPROVED: wait for the Link approval, then run this block again'
```

Continue only when the check prints `APPROVED`. If it prints `NOT APPROVED`, wait about 10 seconds and run this block again; give up and cancel the checkout if the spend request is denied or expires.

### Complete the checkout

```sh
COMPLETE_BODY="$(mktemp /tmp/telnyx-acp-complete.XXXXXX)"
COMPLETE_RESULT="$(mktemp /tmp/telnyx-acp-result.XXXXXX)"

jq '{payment_data: {handler_id: "stripe_shared_payment_token",
     instrument: {type: "card", credential: {type: "spt", token: .shared_payment_token.id}}}}' \
  "$SPEND" > "$COMPLETE_BODY"

curl -sS \
  --output "$COMPLETE_RESULT" \
  --write-out '%{http_code}\n' \
  -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/complete" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')" \
  -H 'Content-Type: application/json' \
  --data-binary "@$COMPLETE_BODY"
```

Submit the completion once. Read [Check whether the payment went through](#check-whether-the-payment-went-through) before doing anything else.

## Pay with Tempo USDC

### Prepare your wallet

Create a named mainnet wallet if you do not already have one:

```sh
npx --yes mppx@0.6.28 account create --account my-telnyx-payer --network mainnet
```

Back up the wallet and keep its private key secret. Transfer enough USDC.e (`0x20C000000000000000000000b9537d11c60E8b50` on Tempo) to cover the payment plus network fees, then confirm the wallet address and check its balance in your wallet tooling:

```sh
npx --yes mppx@0.6.28 account view --account my-telnyx-payer --network mainnet --format json
```

### Inspect the checkout's challenge

The Tempo handler's `config.challenge` is the exact MPP challenge to pay. Save it, validate it, and decode its `request` parameter (base64url JSON):

```sh
umask 077
TEMPO_CHALLENGE="$(mktemp /tmp/telnyx-acp-tempo-challenge.XXXXXX)"
TEMPO_CREDENTIAL="$(mktemp /tmp/telnyx-acp-tempo-credential.XXXXXX)"
jq -r '.capabilities.payment.handlers[] | select(.name=="com.telnyx.mpp.tempo") | .config.challenge' "$CHECKOUT" > "$TEMPO_CHALLENGE"

npx --yes mppx@0.6.28 sign --network mainnet --dry-run --challenge "$(cat "$TEMPO_CHALLENGE")"

sed -E 's/.*request="([^"]+)".*/\1/' "$TEMPO_CHALLENGE" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(Buffer.from(s.trim(),"base64url").toString()),null,2)))'
```

The dry run prints `Challenge is valid.` (on stderr) and nothing else. In the decoded request, confirm before you sign:

| Field | Expected |
|---|---|
| `methodDetails.chainId` | `4217` (Tempo mainnet) |
| `currency` | `0x20C000000000000000000000b9537d11c60E8b50` (USDC.e on Tempo, 6 decimals) |
| `amount` | A string equal to `ACP_AMOUNT_CENTS` × 10000 (for example `1200` cents → `"12000000"`) |
| `externalId` | `telnyx:account-credit:<account id>:usd:<dollars>` where `<dollars>` is the amount with two decimals (for example `12.00`). The account ID is the numeric ID of the account that owns your API key; if you do not know it, check only the shape |
| `recipient` | The Tempo deposit address Telnyx assigned to this checkout. It can differ between checkouts and there is no published value to compare it with; the signed challenge binds it. Record it for your records; it is where your USDC goes |

### Sign the challenge

Signing authorizes the USDC transfer, so treat it as the payment step. Sign once per checkout:

```sh
npx --yes mppx@0.6.28 sign --account my-telnyx-payer --network mainnet --format json \
  --challenge "$(cat "$TEMPO_CHALLENGE")" \
  | jq -r '.authorization' > "$TEMPO_CREDENTIAL"
test -s "$TEMPO_CREDENTIAL" && echo 'credential saved'
```

`mppx` signs the exact challenge and writes the `Payment ...` credential to the private file. It never prints your private key. If `credential saved` is not printed, the file is empty: do not continue, check the wallet has enough USDC.e and fees, and do not run the sign again until you have read the error.

### Complete the checkout

```sh
COMPLETE_BODY="$(mktemp /tmp/telnyx-acp-complete.XXXXXX)"
COMPLETE_RESULT="$(mktemp /tmp/telnyx-acp-result.XXXXXX)"

jq -Rs '{payment_data: {handler_id: "tempo_usdc_mpp",
        instrument: {type: "tempo_usdc", credential: {type: "mpp_payment", token: (. | rtrimstr("\n"))}}}}' \
  "$TEMPO_CREDENTIAL" > "$COMPLETE_BODY"

curl -sS \
  --output "$COMPLETE_RESULT" \
  --write-out '%{http_code}\n' \
  -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/complete" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')" \
  -H 'Content-Type: application/json' \
  --data-binary "@$COMPLETE_BODY"
```

Submit the completion once. If the response is slow or interrupted, check the checkout and your wallet activity before doing anything else.

## Check whether the payment went through

### Read the completion response

A successful completion returns HTTP `200` with `status: "completed"` and an `order` object:

```sh
jq '{status, order: {id: .order.id, checkout_session_id: .order.checkout_session_id, status: .order.status,
     fulfilled: (.order.line_items[0].status)}, matches_checkout: (.order.checkout_session_id == env.ACP_CHECKOUT_ID)}' "$COMPLETE_RESULT"
```

`matches_checkout` must be `true`.

`order.checkout_session_id` must equal `ACP_CHECKOUT_ID`. `order.id` is the Telnyx transaction ID for the credit. Save both. The checkout `status` of `completed` is the success signal; `order.status` is `created` on a successful completion, and its line item shows `status: "fulfilled"`.

HTTP `202` means Telnyx could not confirm the payment provider's outcome yet. Do not submit the completion again and do not create a replacement checkout. Retrieve the checkout every 5 seconds for up to a minute until its status settles, then follow the balance and support steps below if it has not.

### Retrieve the checkout

```sh
curl -sS "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17'
```

| `status` | Meaning |
|---|---|
| `ready_for_payment` | Created and payable until `expires_at` |
| `complete_in_progress` | A completion is being processed. Wait and retrieve again |
| `completed` | Paid and credited. `order` is present |
| `canceled` | Cancelled before payment |

### Find the transaction in Telnyx

```sh
curl -sS "$ACP_BASE_URL/v2/payment/crypto_transactions/<order-id>" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Despite the path name, this endpoint lists every machine payment, including Link card payments. A completed transaction normally has `status: "settled"`. For Tempo payments its `receipt_reference` is the on-chain transaction hash. The list endpoint `GET /v2/payment/crypto_transactions` shows recent machine payments if you lost the order ID.

### Check your Telnyx balance

```sh
curl -sS "$ACP_BASE_URL/v2/balance" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Confirm that `data.available_credit` rose by the checkout amount. The balance may update shortly after the completion response, so check again after a brief wait before contacting support.

### Check Link or Tempo

For Link, retrieve the spend request without the token:

```sh
npx --yes @stripe/link-cli@0.16.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID" --format json
```

A completed Link payment shows `status: "succeeded"` and a successful payment outcome. For Tempo, take the `receipt_reference` hash from the Telnyx transaction above and confirm in your wallet or a Tempo block explorer that it succeeded.

## Cancel a checkout you will not pay

```sh
curl -sS \
  -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/cancel" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $(node -e 'console.log(crypto.randomUUID())')"
```

Only a checkout in `ready_for_payment` can be cancelled. A completed or already cancelled checkout returns HTTP `405`.

## Clean up

Delete the temporary files once you have recorded the checkout ID, order ID, and balance:

```sh
rm -f "$CHECKOUT" "$SPEND" "$COMPLETE_BODY" "$COMPLETE_RESULT" "$TEMPO_CHALLENGE" "$TEMPO_CREDENTIAL"
```

## What to save for support

Save these details for each payment:

- checkout `id`, `created_at`, and `expires_at`;
- the `Idempotency-Key` values you used for create and complete;
- `order.id` from the completion response;
- amount in cents and currency;
- handler `id` you used;
- Link spend-request ID, if you used Link;
- Tempo transaction hash and the recipient address from the challenge, if you used Tempo;
- the approximate UTC time you completed the checkout; and
- the final HTTP status and error body if the payment did not complete.

Send these identifiers to Telnyx Support if you need help tracing a payment. Do not send your API key, wallet private key, Link access token, Shared Payment Token, or signed `Payment ...` credential in a normal support message. Use a secure channel if support asks for sensitive material.

## If something goes wrong

Checkout errors use the ACP error shape: `{"type": "...", "code": "...", "message": "..."}`. Authentication failures (`401`) use the standard Telnyx envelope instead: `{"errors": [{"code": "10009", "title": "Authentication failed", "detail": "..."}]}`.

### HTTP `400`

`API-Version` is missing or not `2026-04-17`, `Idempotency-Key` is missing, or the body is malformed. A `checkout_not_updatable` code means you sent `POST /v2/checkout_sessions/{id}` to change a checkout. Checkouts cannot be changed; create a new one.

### HTTP `401`

Make sure the request used `Authorization: Bearer $TELNYX_API_KEY` and that the key belongs to the account you want to credit.

### HTTP `403`

`acp_unavailable` means ACP checkout is not available for your account. `forbidden` means the request was rejected by policy. Contact Telnyx Support with the checkout ID if you have one.

### HTTP `404`

The checkout does not exist or belongs to a different account.

### HTTP `405`

`checkout_not_cancelable`: the checkout is already completed or cancelled.

### HTTP `422`

`checkout_not_payable` means the checkout is not in `ready_for_payment`, usually because it expired, was cancelled, or is already complete. `idempotency_conflict` means you reused an `Idempotency-Key` with a different body. Use a new key.

### Link or Tempo shows success, but your balance did not change

Do not pay again right away. Retrieve the checkout and the Telnyx transaction, check the balance, then check the Link spend request or Tempo transaction. If the credit still does not appear, contact Telnyx Support with the saved identifiers.

### You lost the response or do not know whether payment completed

Retrieve the checkout by ID. If it is `completed`, the payment went through. If it is still `ready_for_payment`, no completion was recorded, but check the Link spend request or your Tempo wallet before signing again. Do not reuse a one-time credential or repeat the completion just because the original response was lost. Contact Telnyx Support if those checks do not resolve it.
