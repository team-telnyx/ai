# AI Voice Assistants

> Deploy AI-powered voice assistants that answer calls with custom personalities and tools.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- A phone number only when using PSTN calls; assistant creation and WebSocket conversations do not require one
- AI credits or pay-as-you-go enabled

## Quick Start

```bash
# Create an assistant
curl -X POST "https://api.telnyx.com/v2/ai/assistants" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "instructions": "You are a helpful customer support assistant. Be friendly and concise.",
    "greeting": "Hello! How can I help you?"
  }'

# Save the returned assistant ID. Test over WebSocket before provisioning telephony.
# See "Test Without a Phone Number" below.
```

## API Reference

### Create Assistant

**`POST /v2/ai/assistants`**

```bash
curl -X POST "https://api.telnyx.com/v2/ai/assistants" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Assistant",
    "instructions": "You are a sales representative for Acme Corp. Help customers find the right product. Be enthusiastic but not pushy. Ask qualifying questions about their needs and budget.",
    "model": "meta-llama/Llama-3.3-70B-Instruct",
    "greeting": "Hello! Thanks for calling Acme Corp. How can I help you today?"
  }'
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Assistant name |
| `instructions` | string | System prompt / personality |
| `voice_settings` | object | Optional voice configuration; see the current API reference for supported providers and fields. |
| `model` | string | LLM model — use `GET /v2/ai/models` or `telnyx ai models` to list available models. Not all inference models work for assistants. |
| `greeting` | string | Initial greeting message |

**Response:**

```json
{
  "id": "assistant-uuid",
  "name": "Sales Assistant",
  "instructions": "...",
  "model": "meta-llama/Llama-3.3-70B-Instruct",
  "created_at": "2024-01-15T12:00:00Z"
}
```

> **Response handling:** Assistant examples below accept both a top-level object and a `data`-wrapped object, as the CLI does. List responses use `data`. Validate that creation returned an ID before continuing.

### List Assistants

**`GET /v2/ai/assistants`**

```bash
curl "https://api.telnyx.com/v2/ai/assistants" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Get Assistant

**`GET /v2/ai/assistants/{id}`**

```bash
curl "https://api.telnyx.com/v2/ai/assistants/{assistant_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Update Assistant

**`POST /v2/ai/assistants/{id}`**

```bash
curl -X POST "https://api.telnyx.com/v2/ai/assistants/{assistant_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instructions": "Updated instructions here",
    "greeting": "Hi! How can I help?"
  }'
```

### Delete Assistant

**`DELETE /v2/ai/assistants/{id}`**

```bash
curl -X DELETE "https://api.telnyx.com/v2/ai/assistants/{assistant_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Tools and Knowledge

For new integrations, create shared tools and attach their IDs using `tool_ids`.
The inline `tools` field is deprecated for new integrations. Use the
[current assistant API reference](../skills/telnyx-ai-assistants-curl/references/api-details.md)
for supported tool, retrieval, and configuration fields.

For knowledge ingestion and retrieval, see the
[AI collection commands](../cli/README.md). Wait for ingestion to finish before testing retrieval.

## Conversation History

Assistants maintain conversation context automatically. To view history:

**`GET /v2/ai/conversations`**

```bash
curl "https://api.telnyx.com/v2/ai/conversations?assistant_id={id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**`GET /v2/ai/conversations/{conversation_id}`**

```bash
curl "https://api.telnyx.com/v2/ai/conversations/{conversation_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Create assistant
create_response = requests.post(
    f"{BASE_URL}/ai/assistants",
    headers=headers,
    json={
        "name": "Support Bot",
        "instructions": "You are a helpful customer support agent.",
        "model": "meta-llama/Llama-3.3-70B-Instruct",
        "greeting": "Hello! How can I help you today?"
    }
)
create_response.raise_for_status()
payload = create_response.json()
assistant = payload.get("data", payload)
assistant_id = assistant["id"]
print(f"Created: {assistant_id}")

# List assistants
assistants = requests.get(f"{BASE_URL}/ai/assistants", headers=headers).json()
for a in assistants["data"]:
    print(f"{a['id']}: {a['name']}")

# Update
requests.post(
    f"{BASE_URL}/ai/assistants/{assistant_id}",
    headers=headers,
    json={"greeting": "Hi there! What can I do for you?"}
)

# Delete
requests.delete(f"{BASE_URL}/ai/assistants/{assistant_id}", headers=headers)
```

## TypeScript Examples

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Create assistant
const createRes = await fetch(`${BASE_URL}/ai/assistants`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "Support Bot",
    instructions: "You are a helpful customer support agent.",
    model: "meta-llama/Llama-3.3-70B-Instruct",
    greeting: "Hello! How can I help you today?",
  }),
});
if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
const payload = await createRes.json();
const assistant = payload.data ?? payload;
if (!assistant.id) throw new Error("Create response has no assistant ID");
console.log(`Created: ${assistant.id}`);

// List assistants
const listRes = await fetch(`${BASE_URL}/ai/assistants`, { headers });
const { data: assistants } = await listRes.json();
assistants.forEach((a: any) => console.log(`${a.id}: ${a.name}`));

// Update
await fetch(`${BASE_URL}/ai/assistants/${assistant.id}`, {
  method: "POST",
  headers,
  body: JSON.stringify({ greeting: "Hi there! What can I do for you?" }),
});

// Delete
await fetch(`${BASE_URL}/ai/assistants/${assistant.id}`, {
  method: "DELETE",
  headers,
});
```

## Agent Toolkit Examples

For framework-specific Python toolkit initialization and response handling, use
[the Python toolkit README](../tools/python/README.md). The REST examples above
can be used directly without a framework adapter.

## Test Without a Phone Number

An assistant can receive audio through
`wss://api.telnyx.com/v2/ai/assistants/{assistant_id}/conversation` without a
phone number or PSTN connection. This still uses billable AI processing.
Follow the [WebSocket conversation guide](https://telnyx.com/release-notes/voice-ai-websocket-conversations)
for authentication, PCM16 input, sample rates, and lifecycle events. Keep the
account API key on a trusted server rather than embedding it in a browser.

## Wiring to a Phone Number

For a new assistant and a new number, the agent CLI provisions and wires the resources:

```bash
# Creates an assistant and purchases a phone number; incurs recurring number charges.
telnyx-agent setup-ai --name "Support Bot" --instructions "You are a helpful assistant." --json
```

This is a provisioning command, not a way to attach the assistant created above.
For an existing assistant/number, use the [Voice Call Control guide](voice-call-control.md)
and the assistant API reference. Preserve resource IDs if setup fails; do not
blindly rerun a command that creates paid resources.

## Available Voices

Discover voices with `telnyx-agent tts-voices --json`, then check the assistant's
`voice_settings` contract for the selected provider. A standalone TTS voice list
does not guarantee that every voice is supported by assistants.

## Pricing

- **AI model:** Per-token pricing (pricing varies by model)
- **Voice engine:** Per-minute orchestration and included hosted STT/TTS; optional providers/add-ons may have separate charges.
- **Phone call:** Separate telephony rates and number rental.

See [current Voice AI pricing](https://telnyx.com/pricing/voice-ai-agents), including
billing increments. Standalone TTS per-character prices are not the bundled voice-engine rate.

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `insufficient_credits` | 402 | Add AI credits |
| `model_not_available` | 400 | Check model name |
| `voice_not_found` | 400 | Verify voice_id |

## Resources

- [AI Assistants API Reference](https://developers.telnyx.com/docs/api/v2/ai-assistants)
- [AI Assistants Documentation](https://developers.telnyx.com/docs/ai/assistants)
- [Voice Call Control Guide](/guides/voice-call-control.md)
