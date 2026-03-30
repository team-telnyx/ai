# SMS Messaging

> Send and receive SMS/MMS messages worldwide with delivery tracking and webhook notifications.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- A messaging profile
- At least one phone number (for sending)
- 10DLC registration (for US A2P messaging) — see [10DLC Registration](/guides/10dlc-registration.md)

## Quick Start

```bash
# Send an SMS
curl -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15551234567",
    "to": "+15559876543",
    "text": "Hello from Telnyx!"
  }'
```

## API Reference

### Send SMS

**`POST /v2/messages`**

```bash
curl -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15551234567",
    "to": "+15559876543",
    "text": "Your verification code is 123456",
    "messaging_profile_id": "your-profile-id"
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Sender phone number (E.164) |
| `to` | string | Yes | Recipient phone number (E.164) |
| `text` | string | Yes | Message body (max 1600 chars) |
| `messaging_profile_id` | string | No | Specific profile to use |
| `webhook_url` | string | No | Override webhook for this message |
| `use_profile_webhooks` | boolean | No | Use profile webhooks (default: true) |

**Response:**

```json
{
  "data": {
    "id": "uuid-here",
    "record_type": "message",
    "from": "+15551234567",
    "to": "+15559876543",
    "text": "Your verification code is 123456",
    "status": "queued",
    "direction": "outbound"
  }
}
```

### Send MMS

**`POST /v2/messages`** (with media)

```bash
curl -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15551234567",
    "to": "+15559876543",
    "text": "Check out this image!",
    "media_urls": ["https://example.com/image.jpg"]
  }'
```

### Get Message Status

**`GET /v2/messages/{message_id}`**

```bash
curl "https://api.telnyx.com/v2/messages/{message_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Status values:** `queued`, `sending`, `sent`, `delivered`, `undelivered`, `failed`

### List Messages

**`GET /v2/messages`**

```bash
curl "https://api.telnyx.com/v2/messages?filter[direction]=outbound&page[size]=20" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Create Messaging Profile

**`POST /v2/messaging_profiles`**

```bash
curl -X POST "https://api.telnyx.com/v2/messaging_profiles" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Profile",
    "whitelisted_destinations": ["US"],
    "webhook_url": "https://your-app.com/webhooks/sms"
  }'
```

### List Messaging Profiles

**`GET /v2/messaging_profiles`**

```bash
curl "https://api.telnyx.com/v2/messaging_profiles" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Send SMS
response = requests.post(
    f"{BASE_URL}/messages",
    headers=headers,
    json={
        "from": "+15551234567",
        "to": "+15559876543",
        "text": "Hello from Python!"
    }
)
message = response.json()
print(f"Message ID: {message['data']['id']}")

# Check status
message_id = message['data']['id']
status = requests.get(f"{BASE_URL}/messages/{message_id}", headers=headers)
print(f"Status: {status.json()['data']['status']}")
```

## TypeScript Examples

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Send SMS
const sendRes = await fetch(`${BASE_URL}/messages`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    from: "+15551234567",
    to: "+15559876543",
    text: "Hello from TypeScript!",
  }),
});
const { data: message } = await sendRes.json();
console.log(`Message ID: ${message.id}`);

// Check status
const statusRes = await fetch(`${BASE_URL}/messages/${message.id}`, { headers });
const { data: status } = await statusRes.json();
console.log(`Status: ${status.status}`);

// List messages
const listRes = await fetch(
  `${BASE_URL}/messages?filter[direction]=outbound&page[size]=20`,
  { headers }
);
const { data: messages } = await listRes.json();
messages.forEach((m: any) => console.log(`${m.id}: ${m.status}`));
```

## Agent Toolkit Examples

Use the `telnyx-agent-toolkit` Python package for simplified tool execution:

```python
from telnyx_agent_toolkit import TelnyxToolkit

toolkit = TelnyxToolkit(api_key="KEY...")

# Send an SMS
result = toolkit.execute("send_sms", {
    "from_": "+15551234567",
    "to": "+15559876543",
    "text": "Hello from the agent toolkit!"
})
print(f"Message ID: {result['data']['id']}")

# List messaging profiles
profiles = toolkit.execute("list_messaging_profiles", {"page_size": 10})
for p in profiles["data"]:
    print(f"{p['id']}: {p['name']}")

# Create a messaging profile
profile = toolkit.execute("create_messaging_profile", {
    "name": "My App Profile",
    "webhook_url": "https://your-app.com/webhooks/sms"
})
```

## Common Patterns

### Verification Code

```python
import random

def send_verification_code(phone: str) -> str:
    code = str(random.randint(100000, 999999))
    requests.post(
        f"{BASE_URL}/messages",
        headers=headers,
        json={
            "from": "+15551234567",
            "to": phone,
            "text": f"Your verification code is: {code}"
        }
    )
    return code
```

### Bulk SMS

```python
def send_bulk_sms(recipients: list[str], message: str):
    for phone in recipients:
        requests.post(
            f"{BASE_URL}/messages",
            headers=headers,
            json={"from": "+15551234567", "to": phone, "text": message}
        )
```

### Opt-Out Handling

```python
# Always include opt-out instructions for marketing
message = "Special offer! Reply STOP to unsubscribe."
```

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `invalid_phone_number` | 422 | Use E.164 format: `+15551234567` |
| `insufficient_funds` | 402 | Add funds to account |
| `messaging_profile_not_found` | 404 | Verify profile ID |
| `phone_number_not_owned` | 403 | Number must be in your account |
| `not_10dlc_registered` | 403 | Register brand/campaign for US |

## Limits

- **SMS:** 1600 characters max per message
- **MMS:** 5MB total media size
- **Rate limit:** 100 messages/second (default)
- **Bulk:** 1000 recipients max per request

## Webhooks

Configure webhook URLs in your messaging profile to receive delivery reports and inbound messages.

**Delivery status webhook:**

```json
{
  "data": {
    "event_type": "message.delivered",
    "id": "uuid",
    "occurred_at": "2024-01-15T12:00:00Z",
    "payload": {
      "to": "+15559876543",
      "from": "+15551234567",
      "status": "delivered"
    }
  }
}
```

**Inbound message webhook:**

```json
{
  "data": {
    "event_type": "message.received",
    "payload": {
      "to": "+15551234567",
      "from": "+15559876543",
      "text": "Hello!"
    }
  }
}
```

## Resources

- [Messaging API Reference](https://developers.telnyx.com/docs/api/v2/messaging)
- [10DLC Registration Guide](/guides/10dlc-registration.md)
- [Webhooks Guide](/guides/webhooks.md)
