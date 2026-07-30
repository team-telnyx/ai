---
name: telnyx-x402-payment
description: >-
  Make cryptocurrency payments to fund a Telnyx account using the x402
  protocol (USDC on Base). Covers quoting, EIP-712 signing, and settlement.
metadata:
  author: telnyx
  product: payments
  requires:
    bins:
      - curl
      - jq
    env:
      - TELNYX_API_KEY
---

# Telnyx x402 Cryptocurrency Payment

Fund a Telnyx account with USDC on the Base blockchain using the x402 payment protocol. The flow has three steps: get a quote, sign the payment client-side, and submit for settlement.

> **Feature Flag:** x402 payments are gated behind the `X402_PAYMENTS_ENABLED` feature flag. If not enabled for the account, the API returns `403 Forbidden`.

## Prerequisites

- **Telnyx API key** (`TELNYX_API_KEY`)
- **Crypto wallet** with USDC on Base network (chain ID: `eip155:8453`)
- USDC contract on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELNYX_API_KEY` | Yes | Telnyx API v2 key |

## Step 1: Get a Quote

Request a quote for the USD amount to fund. Minimum $5.00, maximum $10,000.00. Quotes expire after 5 minutes.

```bash
curl -s -X POST "https://api.telnyx.com/v2/x402/credit_account/quote" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usd": "50.00"}' | jq .
```

Response:

```json
{
  "data": {
    "id": "quote_abc123",
    "record_type": "quote",
    "amount_usd": "50.00",
    "amount_crypto": "50000000",
    "network": "eip155:8453",
    "expires_at": "2026-03-09T19:00:00Z",
    "payment_requirements": {
      "x402Version": 2,
      "resource": {
        "url": "payment:quote_abc123",
        "description": "Payment of $50.00 USD",
        "mimeType": "application/json"
      },
      "accepts": [
        {
          "scheme": "exact",
          "network": "eip155:8453",
          "amount": "50000000",
          "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "payTo": "0xRecipientAddress",
          "maxTimeoutSeconds": 300,
          "extra": {
            "quoteId": "quote_abc123",
            "facilitatorUrl": "https://www.x402.org/facilitator",
            "name": "USD Coin",
            "version": "2"
          }
        }
      ]
    }
  }
}
```

### Quote Response Fields

| Field | Description |
|-------|-------------|
| `id` | Quote identifier (use in submission) |
| `record_type` | Always `"quote"` |
| `amount_usd` | Requested USD amount |
| `amount_crypto` | USDC amount in smallest unit (6 decimals: $50.00 → `"50000000"`) |
| `network` | CAIP-2 network identifier (e.g. `"eip155:8453"`) |
| `expires_at` | ISO 8601 quote expiry (5 minutes from creation) |
| `payment_requirements` | x402 V2 payment requirements (see below) |

### Payment Requirements (x402 V2)

The `payment_requirements` object follows the x402 protocol V2 structure:

- **`x402Version`** — Protocol version (`2`)
- **`resource`** — The resource being paid for:
  - `url` — Canonical resource URL (included in the payment signature)
  - `description` — Human-readable description
  - `mimeType` — Response content type
- **`accepts`** — Array of accepted payment methods, each containing:
  - `scheme` — Payment scheme (`"exact"` for fixed-amount transfers)
  - `network` — CAIP-2 network (e.g. `"eip155:8453"`)
  - `amount` — Amount in token smallest units
  - `asset` — Token contract address
  - `payTo` — Recipient wallet address
  - `maxTimeoutSeconds` — Maximum time before quote expires
  - `extra` — Additional metadata: `quoteId`, `facilitatorUrl`, and EIP-712 domain fields `name` and `version`. Note: `chainId` is derived from `network` (e.g., `eip155:8453` → `8453`) and `verifyingContract` is the same as `asset`

## Step 2: Sign the Payment (Client-Side)

The user must sign an EIP-712 typed data message authorizing a USDC `transferWithAuthorization` (EIP-3009). This is done client-side using ethers.js, viem, or any EIP-712 signing library.

> ⚠️ **Security:** Never hardcode private keys in source code or commit them to version control. Use environment variables, a hardware wallet, or a secure key management service.

**Required inputs:**

- Payer wallet's private key
- Quote details from `payment_requirements.accepts[0]`: `payTo`, `amount`, and the EIP-712 domain from `extra`
- A random 32-byte nonce
- Validity period (current time → quote expiry)

**EIP-712 domain** (assembled from multiple sources):

```json
{
  "name": "USD Coin",              // ← from quote: accepts[0].extra.name
  "version": "2",                  // ← from quote: accepts[0].extra.version
  "chainId": 8453,                 // ← client must know: Base mainnet chain ID (NOT in quote response)
  "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // ← client must know: USDC contract address on Base (NOT in quote response)
}
```

> **Important:** Only `name` and `version` are provided in the quote response (`accepts[0].extra`). The client must derive the remaining EIP-712 domain fields:
> - **`chainId`**: Parse from the CAIP-2 network string in `accepts[0].network` (e.g., `"eip155:8453"` → `8453`)
> - **`verifyingContract`**: Same as `accepts[0].asset` — the USDC token contract address
>
> These are **not** included in the quote response; they are derived from other fields in `accepts[0]`.

**EIP-712 types (TransferWithAuthorization):**

```json
{
  "TransferWithAuthorization": [
    { "name": "from", "type": "address" },
    { "name": "to", "type": "address" },
    { "name": "value", "type": "uint256" },
    { "name": "validAfter", "type": "uint256" },
    { "name": "validBefore", "type": "uint256" },
    { "name": "nonce", "type": "bytes32" }
  ]
}
```

The signing produces a signature (`r`, `s`, `v`) that authorizes the USDC transfer without requiring an on-chain transaction from the user.

**This step cannot be done with curl alone** — it requires a crypto signing library. Guide the user to use ethers.js, viem, or a similar tool.

### Building the `payment_signature` Payload

After signing, you must construct the payment payload JSON and base64-encode it.

> ⚠️ **Critical:** The PaymentPayload v2 has THREE top-level keys: `x402Version`, `accepted`, and `payload`. The `payload` (signature + authorization) is a **top-level sibling** of `accepted`, NOT nested inside it.

**PaymentPayload v2 structure:**

```
PaymentPayload v2:
├── x402Version: 2
├── resource (optional): ← What is being paid for
│   ├── url
│   ├── description
│   └── mimeType
├── accepted:          ← WHAT is being paid (exact copy of accepts[0])
│   ├── scheme
│   ├── network
│   ├── amount
│   ├── asset
│   ├── payTo
│   ├── maxTimeoutSeconds
│   └── extra: { quoteId, facilitatorUrl, name, version }
└── payload:           ← PROOF of payment authorization (top-level!)
    ├── signature
    └── authorization: { from, to, value, validAfter, validBefore, nonce }
```

**Correct v2 format (complete example with realistic values):**

```json
{
  "x402Version": 2,
  "resource": {
    "url": "payment:quote_abc123",
    "description": "Payment of $50.00 USD",
    "mimeType": "application/json"
  },
  "accepted": {
    "scheme": "exact",
    "network": "eip155:8453",
    "amount": "50000000",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "payTo": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
    "maxTimeoutSeconds": 300,
    "extra": {
      "quoteId": "quote_abc123",
      "facilitatorUrl": "https://www.x402.org/facilitator",
      "name": "USD Coin",
      "version": "2"
    }
  },
  "payload": {
    "signature": "0xe0fbde58a3c04dc2bae26f25ed36c7802f9214c88b3e26e6e9f79a2838a9c4651d2f7e8a90b45c31d8e5f720ca9d9b13f6d8a2e5c1b4f7e8d9a0b3c6d5e4f2a71b",
    "authorization": {
      "from": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      "to": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
      "value": "50000000",
      "validAfter": "0",
      "validBefore": "1773166865",
      "nonce": "0x8a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b"
    }
  }
}
```

> **Note:** The `resource` field is optional per the `@x402/core` schema, but the working e2e implementation includes it. When you include it, copy `payment_requirements.resource` **verbatim** from the quote response — do not substitute the API endpoint URL or any other value. The v2 client constructs the payload's `resource` by copying the quoted one, and a mismatched `resource` can fail verification.

### Full Flow: Quote → PaymentPayload → Submit

**1. You receive a quote response** (from Step 1):

```json
{
  "data": {
    "id": "quote_78ab4393-b7c1-4949-a6df-9ffa56642252",
    "amount_crypto": "50000000",
    "payment_requirements": {
      "resource": {
        "url": "payment:quote_78ab4393-b7c1-4949-a6df-9ffa56642252",
        "description": "Payment of $50.00 USD",
        "mimeType": "application/json"
      },
      "accepts": [{
        "scheme": "exact",
        "network": "eip155:8453",
        "amount": "50000000",
        "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "payTo": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
        "maxTimeoutSeconds": 300,
        "extra": { "quoteId": "quote_78ab4393-b7c1-4949-a6df-9ffa56642252", "facilitatorUrl": "https://www.x402.org/facilitator", "name": "USD Coin", "version": "2" }
      }]
    }
  }
}
```

**2. You construct the PaymentPayload:**

**`accepted`** — Copy `payment_requirements.accepts[0]` from your quote response **exactly** as the `accepted` value. Do not modify or omit any fields.

**`payload`** — Constructed by the client:

| PaymentPayload field | Source |
|---|---|
| `payload.signature` | Your EIP-712 signature (`0x`-prefixed) |
| `payload.authorization.from` | Your wallet address |
| `payload.authorization.to` | Same as `accepted.payTo` |
| `payload.authorization.value` | Same as `accepted.amount` |
| `payload.authorization.validAfter` | `"0"` (immediate) |
| `payload.authorization.validBefore` | Unix timestamp (quote expiry) |
| `payload.authorization.nonce` | Random 32-byte hex (`0x`-prefixed) |

**`resource`** *(optional)* — Copy `payment_requirements.resource` from your quote response **exactly**, the same way you copy `accepts[0]` into `accepted`. The `@x402/core` schema considers this optional, but including the verbatim quoted value is recommended. Never replace it with the API endpoint URL.

**3. Base64-encode and submit:**

```bash
PAYMENT_PAYLOAD='{"x402Version":2,"resource":{"url":"payment:quote_78ab4393-b7c1-4949-a6df-9ffa56642252","description":"Payment of $50.00 USD","mimeType":"application/json"},"accepted":{"scheme":"exact","network":"eip155:8453","amount":"50000000","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","payTo":"0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97","maxTimeoutSeconds":300,"extra":{"quoteId":"quote_78ab4393-b7c1-4949-a6df-9ffa56642252","facilitatorUrl":"https://www.x402.org/facilitator","name":"USD Coin","version":"2"}},"payload":{"signature":"0xe0fbde58a3c04dc2bae26f25ed36c7802f9214c88b3e26e6e9f79a2838a9c4651d2f7e8a90b45c31d8e5f720ca9d9b13f6d8a2e5c1b4f7e8d9a0b3c6d5e4f2a71b","authorization":{"from":"0x71C7656EC7ab88b098defB751B7401B5f6d8976F","to":"0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97","value":"50000000","validAfter":"0","validBefore":"1773166865","nonce":"0x8a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b"}}}'

# tr strips the line wraps GNU base64 inserts at 76 chars — they would corrupt the JSON below
ENCODED=$(echo -n "$PAYMENT_PAYLOAD" | base64 | tr -d '\n')

curl -X POST "https://api.telnyx.com/v2/x402/credit_account" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"quote_78ab4393-b7c1-4949-a6df-9ffa56642252","payment_signature":"'"$ENCODED"'"}' | jq .
```

## Step 3: Submit the Payment

### Request Body

`POST /v2/x402/credit_account`

The request body is a JSON object with exactly two required fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | The quote ID returned from the quote endpoint. Format: `quote_<uuid>` (e.g. `quote_78ab4393-b7c1-4949-a6df-9ffa56642252`) |
| `payment_signature` | string | **Yes** | Base64-encoded JSON string of the PaymentPayload v2 structure (see [Building the `payment_signature` Payload](#building-the-payment_signature-payload) above) |

Both fields are required. The `id` must reference a valid, unexpired quote. The `payment_signature` must be the **entire PaymentPayload v2 JSON** (with the `accepted` wrapper), base64-encoded.

### Complete Example

See the [full flow example](#full-flow-quote--paymentpayload--submit) in Step 2 above for the complete quote → payload → submit workflow.

> **Note:** The `PAYMENT-SIGNATURE` header approach is not currently supported at the API gateway level. Use the `payment_signature` body parameter instead.

### Settlement Status

Success response (201 Created):

```json
{
  "data": {
    "id": "txn_uuid",
    "record_type": "x402_transaction",
    "amount": "50.00",
    "currency": "USD",
    "status": "settled",
    "quote_id": "quote_abc123",
    "tx_hash": "0x...",
    "created_at": "2026-03-09T19:00:00Z"
  }
}
```

The `status` field can be:

- **`verified`** — Payment signature verified, settlement pending on-chain
- **`settled`** — On-chain transaction confirmed, platform credit applied

Settlement is nearly instant (~2 seconds on Base L2). Platform credit is applied upon reaching `settled` status.

## Error Handling

| Error Code | HTTP Status | Meaning | Resolution |
|------------|-------------|---------|------------|
| `amount_usd must be at least 5.00` | 422 | Below minimum | Use $5.00 or more |
| `amount_usd must not exceed 10000.00` | 422 | Above maximum | Use $10,000.00 or less |
| `insufficient_balance` | 422 | Wallet lacks USDC | Fund the wallet with USDC on Base |
| `insufficient_funds` | 422 | Wallet lacks USDC (alias) | Fund the wallet with USDC on Base |
| `insufficient_allowance` | 422 | Facilitator reported an allowance problem | Not expected in this flow — EIP-3009 `transferWithAuthorization` does not use ERC-20 allowances, and no spender address is published to approve. Do not grant token approvals. Verify the authorization fields match the quote, then contact Telnyx Support with the response details if it persists |
| `expired_authorization` | 400 | Quote/authorization expired | Request a new quote |
| `invalid_signature` | 400 | Signature check failed | Verify EIP-712 domain, types, and signing parameters |
| `invalid_nonce` | 400 | Authorization already used or cancelled | Generate a new nonce and re-sign |
| `facilitator_unavailable` | 502 | On-chain facilitator unreachable | Retry after a moment |
| `facilitator_timeout` | 503 | Payment processing timed out | Funds not transferred; retry |
| `settlement_timeout` | 503 | Settlement taking too long | Check wallet balance before retrying |
| `transaction_failed` | 502 | On-chain transaction failed | Funds not transferred; retry or contact support |

## Common Mistakes

### ❌ Wrong: Putting fields at root level (v1-style)

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "eip155:8453",
  "payload": {
    "signature": "e0fbde...",
    "authorization": { "from": "...", "to": "...", "value": "..." }
  }
}
```

**Error:** `"Invalid PaymentPayload structure: accepted: Required"`

**Fix:** Wrap `scheme`, `network`, and payment requirement fields inside an `accepted` object. Keep `payload` at the top level alongside `accepted`.

### ❌ Wrong: Nesting `payload` inside `accepted`

```json
{
  "x402Version": 2,
  "accepted": {
    "scheme": "exact",
    "network": "eip155:8453",
    "amount": "50000000",
    "payload": { "signature": "0x...", "authorization": { ... } }
  }
}
```

**Error:** `"Invalid PaymentPayload structure: payload: Required"`

**Fix:** `payload` is a **top-level sibling** of `accepted`, not nested inside it. Move `payload` out to the root level of the JSON object.

### ❌ Missing `0x` prefix on signature

```json
"signature": "e0fbde58a3..."
```

**Fix:** Always include the `0x` prefix: `"signature": "0xe0fbde58a3..."`

### ❌ Mismatched values from the quote

If `amount`, `payTo`, or `network` in your payload don't match the quote's values, you'll get validation errors (e.g., amount mismatch, network mismatch). Always copy these values directly from `payment_requirements.accepts[0]`.

## Important Notes

- Payments are in USDC on the Base blockchain (Layer 2)
- The facilitator (x402.org) handles on-chain settlement
- The quote ID is idempotent — submitting the same quote twice returns the existing transaction
- This is a documentation-only skill; the signing step requires a crypto wallet library
