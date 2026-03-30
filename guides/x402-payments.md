# x402 Cryptocurrency Payments

> Fund your Telnyx account with USDC on the Base blockchain using the x402 payment protocol.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- Crypto wallet with USDC on Base network (chain ID: 8453)
- Feature flag enabled: `X402_PAYMENTS_ENABLED`

**USDC contract on Base:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Quick Start

```bash
# Step 1: Get a quote
curl -X POST "https://api.telnyx.com/v2/x402/credit_account/quote" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usd": "50.00"}'

# Step 2: Sign payment client-side (requires crypto wallet)
# See "Signing the Payment" section below

# Step 3: Submit signed payment
curl -X POST "https://api.telnyx.com/v2/x402/credit_account" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "quote-id", "payment_signature": "base64-encoded-payload"}'
```

## API Reference

### Get a Quote

**`POST /v2/x402/credit_account/quote`**

Request a quote for the USD amount to fund. Minimum $5.00, maximum $10,000.00. Quotes expire after 5 minutes.

```bash
curl -X POST "https://api.telnyx.com/v2/x402/credit_account/quote" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usd": "50.00"}'
```

**Response:**

```json
{
  "data": {
    "id": "quote_abc123",
    "record_type": "quote",
    "amount_usd": "50.00",
    "amount_crypto": "50000000",
    "network": "eip155:8453",
    "expires_at": "2024-01-15T12:05:00Z",
    "payment_requirements": {
      "x402Version": 2,
      "accepts": [{
        "scheme": "exact",
        "network": "eip155:8453",
        "amount": "50000000",
        "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "payTo": "0xRecipientAddress",
        "extra": {
          "quoteId": "quote_abc123",
          "facilitatorUrl": "https://www.x402.org/facilitator",
          "name": "USD Coin",
          "version": "2"
        }
      }]
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `id` | Quote identifier (use in submission) |
| `amount_crypto` | USDC amount in smallest unit (6 decimals) |
| `expires_at` | Quote expiry (5 minutes from creation) |

### Submit Payment

**`POST /v2/x402/credit_account`**

Submit the signed payment payload.

```bash
curl -X POST "https://api.telnyx.com/v2/x402/credit_account" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "quote_abc123",
    "payment_signature": "base64-encoded-payload"
  }'
```

**Response:**

```json
{
  "data": {
    "id": "txn-uuid",
    "record_type": "x402_transaction",
    "amount": "50.00",
    "currency": "USD",
    "status": "settled",
    "tx_hash": "0x..."
  }
}
```

**Status values:** `verified` (pending on-chain), `settled` (confirmed)

## Signing the Payment

The payment must be signed client-side using an EIP-712 typed data message. This requires ethers.js, viem, or similar.

**EIP-712 Domain:**

```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 8453,
  "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

**EIP-712 Types:**

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

## Payment Payload Structure

The `payment_signature` is a base64-encoded JSON object:

```json
{
  "x402Version": 2,
  "accepted": {
    "scheme": "exact",
    "network": "eip155:8453",
    "amount": "50000000",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "payTo": "0xRecipientAddress",
    "extra": {
      "quoteId": "quote_abc123",
      "facilitatorUrl": "https://www.x402.org/facilitator",
      "name": "USD Coin",
      "version": "2"
    }
  },
  "payload": {
    "signature": "0x...",
    "authorization": {
      "from": "0xYourWalletAddress",
      "to": "0xRecipientAddress",
      "value": "50000000",
      "validAfter": "0",
      "validBefore": "1705312800",
      "nonce": "0x..."
    }
  }
}
```

**Critical:** `payload` is a top-level sibling of `accepted`, NOT nested inside it.

## Python Example (Quote Only)

```python
import requests
import base64
import json

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Get quote
quote = requests.post(
    f"{BASE_URL}/x402/credit_account/quote",
    headers=headers,
    json={"amount_usd": "50.00"}
).json()

quote_id = quote["data"]["id"]
amount_crypto = quote["data"]["amount_crypto"]
pay_to = quote["data"]["payment_requirements"]["accepts"][0]["payTo"]

print(f"Quote ID: {quote_id}")
print(f"Amount (USDC): {int(amount_crypto) / 1_000_000} USDC")
print(f"Send to: {pay_to}")

# Signing must be done client-side with crypto wallet
# Then submit:
# payload = {...}  # Constructed from signing step
# encoded = base64.b64encode(json.dumps(payload).encode()).decode()
# response = requests.post(
#     f"{BASE_URL}/x402/credit_account",
#     headers=headers,
#     json={"id": quote_id, "payment_signature": encoded}
# )
```

## TypeScript Example (Quote + Submit)

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Get a quote
const quoteRes = await fetch(`${BASE_URL}/x402/credit_account/quote`, {
  method: "POST",
  headers,
  body: JSON.stringify({ amount_usd: "50.00" }),
});
const { data: quote } = await quoteRes.json();
console.log(`Quote ID: ${quote.id}`);
console.log(`USDC amount: ${Number(quote.amount_crypto) / 1_000_000}`);

// Sign payment client-side with ethers.js / viem
// const signature = await wallet.signTypedData(domain, types, value);

// Submit signed payment
// const submitRes = await fetch(`${BASE_URL}/x402/credit_account`, {
//   method: "POST",
//   headers,
//   body: JSON.stringify({
//     id: quote.id,
//     payment_signature: btoa(JSON.stringify(paymentPayload)),
//   }),
// });
// const { data: txn } = await submitRes.json();
// console.log(`Transaction: ${txn.tx_hash}`);
```

## Agent Toolkit Examples

Use the `telnyx-agent-toolkit` Python package for simplified tool execution:

```python
from telnyx_agent_toolkit import TelnyxToolkit

toolkit = TelnyxToolkit(api_key="KEY...")

# Get a payment quote
quote = toolkit.execute("get_payment_quote", {"amount_usd": "50.00"})
print(f"Quote ID: {quote['data']['id']}")
print(f"USDC amount: {int(quote['data']['amount_crypto']) / 1_000_000}")

# Submit payment (after client-side signing)
# result = toolkit.execute("submit_payment", {
#     "id": quote["data"]["id"],
#     "payment_signature": "base64-encoded-payload"
# })
```

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `amount_usd must be at least 5.00` | 422 | Minimum is $5.00 |
| `amount_usd must not exceed 10000.00` | 422 | Maximum is $10,000 |
| `insufficient_balance` | 422 | Wallet lacks USDC |
| `expired_authorization` | 400 | Quote expired — get new one |
| `invalid_signature` | 400 | Verify EIP-712 signing parameters |
| `facilitator_unavailable` | 502 | Retry after a moment |

## Common Mistakes

### Wrong: Nesting `payload` inside `accepted`

```json
{
  "accepted": {
    "scheme": "exact",
    "payload": {...}  // ❌ WRONG
  }
}
```

**Fix:** `payload` is a top-level sibling of `accepted`.

### Missing `0x` prefix on signature

```json
"signature": "abc123..."  // ❌ WRONG
```

**Fix:** Always include `0x`: `"signature": "0xabc123..."`

## Resources

- [x402 Protocol](https://x402.org)
- [Base Network](https://base.org)
- [Account Balance API](https://developers.telnyx.com/docs/api/v2/account)
