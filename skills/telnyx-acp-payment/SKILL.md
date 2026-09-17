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
- Per-payment amount limits apply and may change. An amount outside them is rejected with a generic `400 invalid_request` that does not state the limits; if a well-formed create request gets that error, try a smaller amount or contact Telnyx Support.
- Send `API-Version: 2026-04-17` on every request. Other versions are rejected.
- Generate and save one `Idempotency-Key` per logical operation (create, complete, cancel) before you start. Re-use that key if you have to re-send the same request after a network failure; never mint a new key per attempt, and never use a new key to get past a conflict.
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
| `ACP_CREATE_KEY`, `ACP_COMPLETE_KEY`, `ACP_CANCEL_KEY` | Yes | One `Idempotency-Key` per logical operation, generated up front and kept for support |
| `ACP_CHECKOUT_ID` | After create | Checkout `id` returned by the create request |
| `LINK_PAYMENT_METHOD_ID` | Link only | Eligible Link card payment-method ID |
| `LINK_NETWORK_ID` | Link only | `config.merchant_id` from the checkout's Stripe handler |
| `LINK_SPEND_REQUEST_ID` | Link only | Approved, one-time Link spend-request ID |

Keep the API key in your shell environment rather than putting it directly in a command or file:

```sh
export TELNYX_API_KEY='KEYxxxxx'
export ACP_AMOUNT_CENTS='1200'
export ACP_BASE_URL='https://api.telnyx.com'
export ACP_CREATE_KEY="$(node -e 'console.log(crypto.randomUUID())')"
export ACP_COMPLETE_KEY="$(node -e 'console.log(crypto.randomUUID())')"
export ACP_CANCEL_KEY="$(node -e 'console.log(crypto.randomUUID())')"
echo "create=$ACP_CREATE_KEY complete=$ACP_COMPLETE_KEY cancel=$ACP_CANCEL_KEY"
```

Record the three keys now. Support can trace an operation by its key, and the same key is what you re-send if a request is interrupted.

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
  -H "Idempotency-Key: $ACP_CREATE_KEY" \
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

The block checks that an `spt_...` token is present before it builds the body, and stops otherwise:

```sh
COMPLETE_BODY="$(mktemp /tmp/telnyx-acp-complete.XXXXXX)"
COMPLETE_RESULT="$(mktemp /tmp/telnyx-acp-result.XXXXXX)"

if jq -e '.shared_payment_token.id | strings | startswith("spt_")' "$SPEND" > /dev/null \
  && jq '{payment_data: {handler_id: "stripe_shared_payment_token",
          instrument: {type: "card", credential: {type: "spt", token: .shared_payment_token.id}}}}' \
       "$SPEND" > "$COMPLETE_BODY"; then
  COMPLETE_STATUS="$(curl -sS --output "$COMPLETE_RESULT" --write-out '%{http_code}' \
    -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/complete" \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    -H 'API-Version: 2026-04-17' \
    -H "Idempotency-Key: $ACP_COMPLETE_KEY" \
    -H 'Content-Type: application/json' \
    --data-binary "@$COMPLETE_BODY")"
  echo "completion HTTP $COMPLETE_STATUS"
else
  echo 'STOPPED: no Shared Payment Token in the spend request. Retrieve it again after approval; do not complete.'
fi
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

The dry run only checks that the challenge parses; it prints `Challenge is valid.` (on stderr) and nothing else. It does not check your funds, the expiry, or payment readiness. Confirm the checkout has not expired (`jq -r '.expires_at' "$CHECKOUT"` against `date -u`), then confirm in the decoded request before you sign:

| Field | Expected |
|---|---|
| `methodDetails.chainId` | `4217` (Tempo mainnet) |
| `currency` | `0x20C000000000000000000000b9537d11c60E8b50` (USDC.e on Tempo, 6 decimals) |
| `amount` | A string equal to `ACP_AMOUNT_CENTS` × 10000 (for example `1200` cents → `"12000000"`) |
| `externalId` | `telnyx:account-credit:<account id>:usd:<dollars>` where `<dollars>` is the amount with two decimals (for example `12.00`). The account identifier is that of the account that owns your API key (it may be UUID-shaped); if you do not know it, check only the shape |
| `recipient` | The Tempo deposit address Telnyx assigned to this checkout. It can differ between checkouts and there is no published value to compare it with; the signed challenge binds it. Record it for your records; it is where your USDC goes |

### Sign and complete in one step

Signing authorizes the USDC transfer, so treat it as the payment step. The signed credential is only valid for a short window (roughly 25 seconds, less by the time the CLI returns), so signing and submission are one block: do not split them into separate steps, and do not sign again if the submission fails. Everything above must be prepared first.

`mppx` signs with `MPPX_PRIVATE_KEY` if that variable is set, ignoring the named wallet. The block stops if it is set so you can decide which wallet you approved:

```sh
COMPLETE_BODY="$(mktemp /tmp/telnyx-acp-complete.XXXXXX)"
COMPLETE_RESULT="$(mktemp /tmp/telnyx-acp-result.XXXXXX)"

if [ -n "${MPPX_PRIVATE_KEY:-}" ]; then
  echo 'STOP: MPPX_PRIVATE_KEY is set, so mppx would sign with that key instead of the named wallet. Unset it, or confirm it is the wallet you approved, then run this block again.'
elif npx --yes mppx@0.6.28 sign --account my-telnyx-payer --network mainnet --format json \
       --challenge "$(cat "$TEMPO_CHALLENGE")" | jq -r '.authorization // empty' > "$TEMPO_CREDENTIAL" \
  && grep -q '^Payment ' "$TEMPO_CREDENTIAL" \
  && jq -Rs '{payment_data: {handler_id: "tempo_usdc_mpp",
              instrument: {type: "tempo_usdc", credential: {type: "mpp_payment", token: (. | rtrimstr("\n"))}}}}' \
       "$TEMPO_CREDENTIAL" > "$COMPLETE_BODY"; then
  COMPLETE_STATUS="$(curl -sS --output "$COMPLETE_RESULT" --write-out '%{http_code}' \
    -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/complete" \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    -H 'API-Version: 2026-04-17' \
    -H "Idempotency-Key: $ACP_COMPLETE_KEY" \
    -H 'Content-Type: application/json' \
    --data-binary "@$COMPLETE_BODY")"
  echo "completion HTTP $COMPLETE_STATUS"
else
  echo 'STOPPED before completion: signing failed or produced no credential. Read the error; do not sign again until you understand it. Nothing was submitted to Telnyx.'
fi
```

`mppx` never prints your private key. If the response is slow or interrupted, check the checkout and your wallet activity before doing anything else; a credential that was submitted may have been accepted even if you did not see the response.

## Check whether the payment went through

### Read the completion response

A successful completion returns HTTP `200` with `status: "completed"` and an `order` object:

```sh
jq '{status, order: {id: .order.id, checkout_session_id: .order.checkout_session_id, status: .order.status,
     fulfilled: (.order.line_items[0].status)}, matches_checkout: (.order.checkout_session_id == env.ACP_CHECKOUT_ID)}' "$COMPLETE_RESULT"
```

`COMPLETE_STATUS` must be `200` and `matches_checkout` must be `true`.

`order.checkout_session_id` must equal `ACP_CHECKOUT_ID`. `order.id` is the Telnyx transaction ID for the credit. Save it for Support: the checkout retrieval below returns it again if you lose this response, but the transaction-detail endpoint behind it is not available to API-key authentication. Verification is the retrieved checkout, the payment source, and the balance, below. The checkout `status` of `completed` is the success signal; `order.status` is `created` on a successful completion, and its line item shows `status: "fulfilled"`.

HTTP `202`, or a retrieved status of `complete_in_progress`, means Telnyx could not confirm the payment provider's outcome. The payment may have succeeded. Retrieving the checkout shows updates but does not reconcile it, and it can stay unresolved until Telnyx investigates. Do not submit the completion again, do not sign again, and do not create a replacement checkout. Retrieve the checkout every 5 seconds for up to a minute; if it is still unresolved, save the identifiers below and contact Telnyx Support.

### Retrieve the checkout

```sh
curl -sS "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17'
```

| `status` | Meaning |
|---|---|
| `ready_for_payment` | Created and payable until `expires_at` |
| `complete_in_progress` | A completion was submitted and its outcome is not yet known. Wait and retrieve again; it may need Support to resolve |
| `completed` | Paid and credited. `order` is present |
| `canceled` | Cancelled before payment |

### Check your Telnyx balance

```sh
curl -sS "$ACP_BASE_URL/v2/balance" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Confirm that `data.available_credit` rose by about the checkout amount. Balance visibility can lag completion, and concurrent usage or other credits change the delta, so treat it as corroboration rather than proof. Check again after a brief wait before contacting support.

### Check Link or Tempo

For Link, retrieve the spend request without the token:

```sh
npx --yes @stripe/link-cli@0.16.0 spend-request retrieve "$LINK_SPEND_REQUEST_ID" --format json
```

A completed Link payment shows `status: "succeeded"` and a successful payment outcome. For Tempo, confirm the transfer in your wallet tooling or a Tempo block explorer using the transaction hash your wallet reports. Telnyx does not expose that hash through the API key; if you need it correlated, give Support the `order.id`.

## Cancel a checkout you will not pay

```sh
curl -sS \
  -X POST "$ACP_BASE_URL/v2/checkout_sessions/$ACP_CHECKOUT_ID/cancel" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H 'API-Version: 2026-04-17' \
  -H "Idempotency-Key: $ACP_CANCEL_KEY"
```

Only a checkout in `ready_for_payment` can be cancelled. Repeating the cancel with the same `ACP_CANCEL_KEY` returns the cancelled checkout again. A completed or already cancelled checkout returns HTTP `405`.

## Clean up

Delete the temporary files once you have recorded the checkout ID, order ID, and balance:

```sh
rm -f "$CHECKOUT" "$SPEND" "$COMPLETE_BODY" "$COMPLETE_RESULT" "$TEMPO_CHALLENGE" "$TEMPO_CREDENTIAL"
```

## What to save for support

Save these details for each payment:

- checkout `id`, `created_at`, and `expires_at`;
- `ACP_CREATE_KEY`, `ACP_COMPLETE_KEY`, and `ACP_CANCEL_KEY` if used;
- `COMPLETE_STATUS` and the completion response body, with the token removed;
- `order.id` from the completion response;
- amount in cents and currency;
- handler `id` you used;
- Link spend-request ID, if you used Link;
- Tempo transaction hash and the recipient address from the challenge, if you used Tempo;
- the approximate UTC time you completed the checkout; and
- the final HTTP status and error body if the payment did not complete.

Send these identifiers to Telnyx Support if you need help tracing a payment. Do not send your API key, wallet private key, Link access token, Shared Payment Token, or signed `Payment ...` credential in a normal support message. Use a secure channel if support asks for sensitive material.

## If something goes wrong

Checkout errors use the ACP error shape: `{"type": "...", "code": "...", "message": "..."}`. Platform-level failures such as authentication (`401`) or rate limiting use the standard Telnyx envelope instead: `{"errors": [{"code": "10009", "title": "Authentication failed", "detail": "..."}]}`.

### HTTP `400`

`API-Version` is missing or not `2026-04-17`, `Idempotency-Key` is missing, the body is malformed, or the amount is outside the current per-payment limits (the message is a generic `Invalid ACP request` in that case). A `checkout_not_updatable` code means you sent `POST /v2/checkout_sessions/{id}` to change a checkout. Checkouts cannot be changed; create a new one.

### HTTP `401`

Make sure the request used `Authorization: Bearer $TELNYX_API_KEY` and that the key belongs to the account you want to credit.

### HTTP `403`

`acp_unavailable` means ACP checkout is not available for your account. `forbidden` means the request was rejected by policy. Contact Telnyx Support with the checkout ID if you have one.

### HTTP `404`

The checkout does not exist or belongs to a different account.

### HTTP `405`

`checkout_not_cancelable`: the checkout is already completed or cancelled.

### HTTP `422`

`checkout_not_payable` means the checkout is not in `ready_for_payment`, usually because it expired, was cancelled, or is already complete. Before any payment step you can start a new checkout; after a completion was submitted, retrieve the checkout and check your payment source first.

`idempotency_conflict` means the request conflicts with committed state for that checkout. Before payment that usually means a key was reused with a different body. After a signed credential or a submitted completion it can mean more, so do not retry with a new key: retrieve the checkout, check the Link spend request or your wallet, and contact Telnyx Support if it is unresolved.

### Link or Tempo shows success, but your balance did not change

Do not pay again right away. Retrieve the checkout, check the balance, then check the Link spend request or Tempo transaction. If the credit still does not appear, contact Telnyx Support with the saved identifiers, including `order.id`.

### You lost the response or do not know whether payment completed

Retrieve the checkout by ID. If it is `completed`, the payment went through. If it is `complete_in_progress`, a completion was submitted and needs the steps above. If it is still `ready_for_payment`, no completion was recorded, but check the Link spend request or your Tempo wallet before doing anything else, because funds may have moved. Do not reuse a one-time credential, repeat the completion, or start a replacement checkout just because the original response was lost. Contact Telnyx Support if those checks do not resolve it.
