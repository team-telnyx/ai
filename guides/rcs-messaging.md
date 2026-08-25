# RCS Messaging

> Check recipient support, then send RCS text through an approved Telnyx RCS agent.

## Prerequisites

- A Telnyx API key ([get one](https://telnyx.com/agent-signup.md))
- An approved RCS agent ID
- A messaging profile associated with the agent
- Recipient numbers in E.164 format

For the complete API surface and SDK variants, use the canonical
[`skills/telnyx-messaging-hosted-curl/SKILL.md`](../skills/telnyx-messaging-hosted-curl/SKILL.md)
source. Provider skill copies are generated from `skills/` and should not be edited directly.

## Quick Start

Check the recipient before choosing rich content or an SMS fallback:

```bash
telnyx-agent rcs-capabilities \
  --agent-id AGENT_ID \
  --phone-number +15559876543 \
  --json
```

Then send a text message:

```bash
telnyx-agent rcs-send \
  --agent-id AGENT_ID \
  --messaging-profile-id PROFILE_ID \
  --to +15559876543 \
  --text "Hello from RCS"
```

## API Reference

### Check recipient capabilities

**`GET /v2/messaging/rcs/capabilities/{agent_id}/{phone_number}`**

```bash
curl "https://api.telnyx.com/v2/messaging/rcs/capabilities/AGENT_ID/%2B15559876543" \
  -H "Authorization: Bearer YOUR_TELNYX_API_KEY"
```

An array in `features` means RCS is enabled, including an empty array. A null
`features` value is different: preserve the accompanying `status`, which can
explain that RCS is disabled or the agent is not provisioned for the carrier.

### Send an RCS message

**`POST /v2/messages/rcs`**

```bash
curl -X POST "https://api.telnyx.com/v2/messages/rcs" \
  -H "Authorization: Bearer YOUR_TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "AGENT_ID",
    "messaging_profile_id": "PROFILE_ID",
    "to": "+15559876543",
    "agent_message": {"content_message": {"text": "Hello from RCS"}},
    "type": "RCS"
  }'
```

## Python Example

```python
import requests

response = requests.get(
    "https://api.telnyx.com/v2/messaging/rcs/capabilities/AGENT_ID/%2B15559876543",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)
capabilities = response.json()["data"]
if capabilities["features"] is None:
    print(capabilities["status"])
```

## TypeScript Example

```typescript
const response = await fetch(
  "https://api.telnyx.com/v2/messaging/rcs/capabilities/AGENT_ID/%2B15559876543",
  { headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` } },
);
const { data } = await response.json();
console.log(data.features === null ? data.status : data.features);
```

## Operational Notes

- Treat `features: null` as unavailable, not as an empty supported feature set.
- Use `GENERIC_RCS_FEATURE` for basic text only; avoid rich cards unless advertised.
- Keep an SMS fallback path for recipients without RCS support.
- Use `--ttl 300s` and `--webhook-url https://example.com/rcs-events` when needed.
