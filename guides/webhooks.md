# Webhooks

> Set up real-time event notifications for messaging, voice, and account events.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- A publicly accessible HTTPS endpoint to receive webhooks

## What Are Webhooks?

Webhooks are HTTP POST requests that Telnyx sends to your server when events occur — message delivered, call answered, etc. They enable real-time reactions without polling.

## Quick Start

```bash
# Configure webhook URL on a messaging profile
curl -X PATCH "https://api.telnyx.com/v2/messaging_profiles/{profile_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-app.com/webhooks/telnyx"
  }'
```

## API Reference

### List Webhook Deliveries

**`GET /v2/webhook_deliveries`**

```bash
curl "https://api.telnyx.com/v2/webhook_deliveries?page[size]=20" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Response:**

```json
{
  "data": [
    {
      "id": "delivery-uuid",
      "record_type": "webhook_delivery",
      "status": "delivered",
      "started_at": "2024-01-15T12:00:00Z",
      "finished_at": "2024-01-15T12:00:01Z",
      "webhook": {
        "url": "https://your-app.com/webhooks",
        "event_type": "message.delivered"
      },
      "attempts": [
        {
          "status": "delivered",
          "started_at": "2024-01-15T12:00:00Z",
          "finished_at": "2024-01-15T12:00:01Z",
          "http": {
            "request": {
              "url": "https://your-app.com/webhooks",
              "method": "POST"
            }
          },
          "errors": []
        }
      ]
    }
  ]
}
```

**Filters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page[size]` | integer | Results per page (max 250) |
| `filter[status]` | string | `success`, `failed` |
| `filter[event_type]` | string | e.g. `message.delivered`, `call.answered` |

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# List recent deliveries
deliveries = requests.get(
    f"{BASE_URL}/webhook_deliveries",
    headers=headers,
    params={"page[size]": 20}
).json()

for d in deliveries["data"]:
    event_type = d["webhook"]["event_type"]
    status = d["status"]
    print(f"{event_type} → {status}")
```

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;

const response = await fetch(
  "https://api.telnyx.com/v2/webhook_deliveries?page[size]=20",
  { headers: { Authorization: `Bearer ${API_KEY}` } }
);
const { data } = await response.json();

for (const delivery of data) {
  console.log(`${delivery.webhook.event_type} → ${delivery.status}`);
}
```

### Get Webhook Delivery Details

**`GET /v2/webhook_deliveries/{id}`**

```bash
curl "https://api.telnyx.com/v2/webhook_deliveries/{delivery_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Response:**

```json
{
  "data": {
    "id": "delivery-uuid",
    "record_type": "webhook_delivery",
    "status": "delivered",
    "started_at": "2024-01-15T12:00:00Z",
    "finished_at": "2024-01-15T12:00:01Z",
    "webhook": {
      "url": "https://your-app.com/webhooks",
      "event_type": "message.delivered"
    },
    "attempts": [
      {
        "status": "delivered",
        "started_at": "2024-01-15T12:00:00Z",
        "finished_at": "2024-01-15T12:00:01Z",
        "http": {
          "request": {
            "url": "https://your-app.com/webhooks",
            "method": "POST"
          }
        },
        "errors": []
      }
    ]
  }
}
```

```python
# Get delivery details
delivery_id = "delivery-uuid"
detail = requests.get(
    f"{BASE_URL}/webhook_deliveries/{delivery_id}",
    headers=headers
).json()
print(f"Status: {detail['data']['status']}")
print(f"Webhook URL: {detail['data']['webhook']['url']}")
```

```typescript
const deliveryId = "delivery-uuid";
const detail = await fetch(
  `https://api.telnyx.com/v2/webhook_deliveries/${deliveryId}`,
  { headers: { Authorization: `Bearer ${API_KEY}` } }
);
const { data: delivery } = await detail.json();
console.log(`Status: ${delivery.status}, URL: ${delivery.webhook.url}`);
```

## Setting Up Webhooks

### Messaging Profile Webhooks

**`PATCH /v2/messaging_profiles/{id}`**

```bash
curl -X PATCH "https://api.telnyx.com/v2/messaging_profiles/{profile_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-app.com/webhooks/sms",
    "number_pool_settings": {
      "webhook_url": "https://your-app.com/webhooks/sms-pool"
    }
  }'
```

### Voice Connection Webhooks

**`PATCH /v2/connections/{id}`**

```bash
curl -X PATCH "https://api.telnyx.com/v2/connections/{connection_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_api_url": "https://your-app.com/webhooks/voice"
  }'
```

### Phone Number Webhooks

Override profile-level webhooks for specific numbers:

**`PATCH /v2/phone_numbers/{id}`**

```bash
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/{number_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-app.com/webhooks/custom"
  }'
```

## Webhook Payload Format

### Message Delivered

```json
{
  "data": {
    "event_type": "message.delivered",
    "id": "uuid",
    "occurred_at": "2024-01-15T12:00:00Z",
    "record_type": "event",
    "payload": {
      "to": "+15559876543",
      "from": "+15551234567",
      "message_id": "msg-uuid",
      "status": "delivered",
      "delivered_at": "2024-01-15T12:00:05Z"
    }
  }
}
```

### Message Received (Inbound)

```json
{
  "data": {
    "event_type": "message.received",
    "id": "uuid",
    "occurred_at": "2024-01-15T12:00:00Z",
    "payload": {
      "to": "+15551234567",
      "from": "+15559876543",
      "text": "Hello!",
      "message_id": "msg-uuid"
    }
  }
}
```

### Call Events

```json
{
  "data": {
    "event_type": "call.answered",
    "id": "uuid",
    "occurred_at": "2024-01-15T12:00:00Z",
    "payload": {
      "call_control_id": "v3:abc123",
      "call_leg_id": "uuid",
      "from": "+15551234567",
      "to": "+15559876543"
    }
  }
}
```

## Verifying Webhook Signatures

Telnyx signs webhooks with Ed25519. Verify the signature to ensure requests are authentic.

```python
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature
import base64
import json
import time

PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

def verify_telnyx_signature(payload: bytes, signature_header: str, timestamp_header: str, tolerance_seconds: int = 300) -> bool:
    """Verify Telnyx webhook signature."""
    # Check timestamp
    timestamp = int(timestamp_header)
    if abs(time.time() - timestamp) > tolerance_seconds:
        return False
    
    # Decode signature
    signature = base64.b64decode(signature_header)
    
    # Load public key
    public_key = serialization.load_pem_public_key(PUBLIC_KEY_PEM.encode())
    
    # Verify
    try:
        public_key.verify(signature, payload)
        return True
    except InvalidSignature:
        return False
```

## Debugging Webhooks

### List Recent Deliveries

**`GET /v2/webhook_deliveries`**

```bash
curl "https://api.telnyx.com/v2/webhook_deliveries?page[size]=20" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Response:**

```json
{
  "data": [
    {
      "id": "delivery-uuid",
      "record_type": "webhook_delivery",
      "status": "delivered",
      "started_at": "2024-01-15T12:00:00Z",
      "finished_at": "2024-01-15T12:00:01Z",
      "webhook": {
        "url": "https://your-app.com/webhooks",
        "event_type": "message.delivered"
      },
      "attempts": [
        {
          "status": "delivered",
          "started_at": "2024-01-15T12:00:00Z",
          "finished_at": "2024-01-15T12:00:01Z",
          "http": {
            "request": {
              "url": "https://your-app.com/webhooks",
              "method": "POST"
            }
          },
          "errors": []
        }
      ]
    }
  ]
}
```

### Get Delivery Details

**`GET /v2/webhook_deliveries/{id}`**

```bash
curl "https://api.telnyx.com/v2/webhook_deliveries/{delivery_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Testing Locally with ngrok

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL for your webhook
# https://abc123.ngrok.io/webhooks/telnyx

# Configure in messaging profile
curl -X PATCH "https://api.telnyx.com/v2/messaging_profiles/{id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://abc123.ngrok.io/webhooks/telnyx"}'
```

## Python Webhook Handler

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/webhooks/telnyx", methods=["POST"])
def handle_webhook():
    payload = request.json
    event_type = payload.get("data", {}).get("event_type")
    
    if event_type == "message.received":
        handle_inbound_sms(payload["data"]["payload"])
    elif event_type == "message.delivered":
        log_delivery(payload["data"]["payload"])
    elif event_type == "call.answered":
        handle_call_answered(payload["data"]["payload"])
    
    return jsonify({"status": "ok"}), 200

def handle_inbound_sms(payload):
    from_number = payload["from"]
    text = payload["text"]
    print(f"SMS from {from_number}: {text}")
```

## TypeScript Webhook Handler

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.post("/webhooks/telnyx", (req, res) => {
  const eventType = req.body?.data?.event_type;
  const payload = req.body?.data?.payload;

  switch (eventType) {
    case "message.received":
      console.log(`SMS from ${payload.from}: ${payload.text}`);
      break;
    case "message.delivered":
      console.log(`Delivered to ${payload.to}`);
      break;
    case "call.answered":
      console.log(`Call answered: ${payload.call_control_id}`);
      break;
  }

  res.json({ status: "ok" });
});

app.listen(3000, () => console.log("Webhook server on :3000"));
```

## Common Failure Modes

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| Invalid URL | 404 responses | Check URL is accessible |
| SSL errors | Delivery failures | Ensure valid TLS certificate |
| Timeout | Retries increasing | Respond within 10 seconds |
| Wrong content-type | Parse errors | Expect `application/json` |
| Signature mismatch | Rejected requests | Verify signature correctly |

## Retry Behavior

Telnyx retries failed webhooks:
- **Attempt 1:** Immediate
- **Attempt 2:** 1 minute
- **Attempt 3:** 5 minutes
- **Attempt 4:** 15 minutes
- **Attempt 5:** 1 hour

After 5 failures, the webhook is marked as failed.

## Best Practices

1. **Respond quickly** — Return 200 within 10 seconds, process async
2. **Verify signatures** — Ensure requests are from Telnyx
3. **Handle duplicates** — Same event may be delivered twice
4. **Log everything** — Store raw payloads for debugging
5. **Monitor deliveries** — Check webhook_deliveries API regularly

## Resources

- [Webhook API Reference](https://developers.telnyx.com/docs/api/v2/webhooks)
- [Webhook Security](https://developers.telnyx.com/docs/webhooks/security)
