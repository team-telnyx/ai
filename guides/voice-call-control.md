# Voice Call Control

> Make, manage, and automate voice calls with real-time control — IVR, conferencing, recording, and TTS.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- A voice connection (Telnyx SIP connection or Call Control application)
- At least one phone number assigned to your connection

## Quick Start

```bash
# Make an outbound call
curl -X POST "https://api.telnyx.com/v2/calls" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15559876543",
    "from": "+15551234567",
    "connection_id": "your-connection-id",
    "webhook_url": "https://your-app.com/webhooks/voice"
  }'
```

## API Reference

### Make a Call

**`POST /v2/calls`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15559876543",
    "from": "+15551234567",
    "connection_id": "your-connection-id",
    "webhook_url": "https://your-app.com/webhooks/voice"
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | Yes | Destination phone number (E.164 format) |
| `from` | string | Yes | Caller ID (must be a number you own) |
| `connection_id` | string | Yes | Your Call Control connection ID |
| `webhook_url` | string | No | Webhook URL for call control events |

### Hang Up a Call

**`POST /v2/calls/{call_control_id}/actions/hangup`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/hangup" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Transfer a Call

**`POST /v2/calls/{call_control_id}/actions/transfer`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/transfer" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+15555555555"}'
```

### Play Audio (TTS)

**`POST /v2/calls/{call_control_id}/actions/speak`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/speak" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "Your order has been confirmed!",
    "voice": "female",
    "language": "en-US"
  }'
```

### Gather DTMF (IVR)

**`POST /v2/calls/{call_control_id}/actions/gather_using_speak`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/gather_using_speak" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "Press 1 for sales, 2 for support.",
    "voice": "female",
    "language": "en-US",
    "valid_digits": "12",
    "max_digits": 1
  }'
```

### Record a Call

**`POST /v2/calls/{call_control_id}/actions/record_start`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/record_start" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"format": "wav"}'
```

### Conference Calls

**`POST /v2/conferences`**

```bash
curl -X POST "https://api.telnyx.com/v2/conferences" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "team-meeting"}'
```

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Make a call
response = requests.post(
    f"{BASE_URL}/calls",
    headers=headers,
    json={
        "to": "+15559876543",
        "from": "+15551234567",
        "connection_id": "your-connection-id",
        "webhook_url": "https://your-app.com/webhooks/voice"
    }
)
call = response.json()
print(f"Call ID: {call['data']['call_control_id']}")

# Hang up
call_control_id = call['data']['call_control_id']
requests.post(f"{BASE_URL}/calls/{call_control_id}/actions/hangup", headers=headers)
```

## TypeScript Examples

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Make a call
const callRes = await fetch(`${BASE_URL}/calls`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    to: "+15559876543",
    from: "+15551234567",
    connection_id: "your-connection-id",
    webhook_url: "https://your-app.com/webhooks/voice",
  }),
});
const { data: call } = await callRes.json();
console.log(`Call ID: ${call.call_control_id}`);

// Speak TTS
await fetch(`${BASE_URL}/calls/${call.call_control_id}/actions/speak`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    payload: "Hello from TypeScript!",
    voice: "female",
    language: "en-US",
  }),
});

// Hang up
await fetch(`${BASE_URL}/calls/${call.call_control_id}/actions/hangup`, {
  method: "POST",
  headers,
});
```

## Agent Toolkit Examples

Use the `telnyx-agent-toolkit` Python package for simplified tool execution:

```python
from telnyx_agent_toolkit import TelnyxToolkit

toolkit = TelnyxToolkit(api_key="KEY...")

# Make an outbound call
call = toolkit.execute("make_call", {
    "to": "+15559876543",
    "from_": "+15551234567",
    "connection_id": "your-connection-id",
    "webhook_url": "https://your-app.com/webhooks/voice"
})
print(f"Call ID: {call['data']['call_control_id']}")

# List voice connections
connections = toolkit.execute("list_connections", {"page_size": 10})
for c in connections["data"]:
    print(f"{c['id']}: {c.get('connection_name')}")
```

## Common Patterns

### Notification Call

```python
def notify_customer(phone: str, message: str):
    # Place the call
    response = requests.post(
        f"{BASE_URL}/calls",
        headers=headers,
        json={
            "to": phone,
            "from": "+15551234567",
            "connection_id": CONNECTION_ID,
            "webhook_url": "https://your-app.com/webhooks/voice"
        }
    )
    call = response.json()
    call_control_id = call["data"]["call_control_id"]
    # Use TTS via the speak action once the call is answered
    # (triggered from your webhook handler on call.answered event)
    return call
```

### IVR Menu

```python
def handle_ivr(call_control_id: str, digits: str):
    routes = {"1": "sales", "2": "support", "0": "operator"}
    if digits in routes:
        requests.post(
            f"{BASE_URL}/calls/{call_control_id}/actions/speak",
            headers=headers,
            json={"payload": f"Transferring to {routes[digits]}...", "voice": "female"}
        )
```

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `invalid_phone_number` | 422 | Use E.164 format: `+15551234567` |
| `call_failed` | 400 | Check destination number and routing |
| `insufficient_funds` | 402 | Add funds to account |
| `connection_not_found` | 404 | Verify connection exists |

## Resources

- [Call Control API Reference](https://developers.telnyx.com/docs/api/v2/call-control)
- [Call Control Documentation](https://developers.telnyx.com/docs/voice/call-control)
