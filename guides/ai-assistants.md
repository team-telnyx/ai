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
    "greeting": "Hello! Thanks for calling Acme Corp. How can I help you today?"
  }'
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Assistant name |
| `instructions` | string | System prompt / personality |
| `voice_settings` | object | Optional voice configuration; see the current API reference for supported providers and fields. |
| `model` | string | Optional. Omit it to use the current assistant default. Inference-model availability does not imply assistant support; an unsupported explicit model is rejected at creation. |
| `greeting` | string | Initial greeting message |

**Response:**

```json
{
  "id": "assistant-uuid",
  "name": "Sales Assistant",
  "instructions": "...",
  "model": "MODEL_RETURNED_BY_API",
  "created_at": "2024-01-15T12:00:00Z"
}
```

> **Response handling:** Assistant examples below accept both a top-level object and a `data`-wrapped object, as the CLI does. List responses use `data`. Validate that creation returned an ID before continuing.

The examples omit `model`, `voice_settings` (TTS), and `transcription` (STT) to
use the current assistant API defaults. Inspect those fields in the response
and select explicit supported settings when you need a fixed configuration.
A model listed for inference may still be unavailable for assistants.

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
ASSISTANT_ID="YOUR_ASSISTANT_ID"
curl --get "https://api.telnyx.com/v2/ai/conversations" \
  --data-urlencode "metadata->assistant_id=eq.$ASSISTANT_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**`GET /v2/ai/conversations/{conversation_id}`**

```bash
curl "https://api.telnyx.com/v2/ai/conversations/{conversation_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Python Examples

```python
import os
import requests

API_KEY = os.environ["TELNYX_API_KEY"]
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Create assistant
create_response = requests.post(
    f"{BASE_URL}/ai/assistants",
    headers=headers,
    json={
        "name": "Support Bot",
        "instructions": "You are a helpful customer support agent.",
        "greeting": "Hello! How can I help you today?"
    }
)
create_response.raise_for_status()
payload = create_response.json()
assistant = payload.get("data", payload)
assistant_id = assistant["id"]
if not isinstance(assistant_id, str) or not assistant_id.strip():
    raise ValueError("Create response has no valid assistant ID")
print(f"Created: {assistant_id}")

# List assistants
list_response = requests.get(f"{BASE_URL}/ai/assistants", headers=headers)
list_response.raise_for_status()
assistants = list_response.json()
for a in assistants["data"]:
    print(f"{a['id']}: {a['name']}")

# Update
update_response = requests.post(
    f"{BASE_URL}/ai/assistants/{assistant_id}",
    headers=headers,
    json={"greeting": "Hi there! What can I do for you?"}
)
update_response.raise_for_status()

# Delete
delete_response = requests.delete(f"{BASE_URL}/ai/assistants/{assistant_id}", headers=headers)
delete_response.raise_for_status()
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
    greeting: "Hello! How can I help you today?",
  }),
});
if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
const payload = await createRes.json();
const assistant = payload.data ?? payload;
if (typeof assistant.id !== "string" || !assistant.id.trim()) {
  throw new Error("Create response has no valid assistant ID");
}
console.log(`Created: ${assistant.id}`);

// List assistants
const listRes = await fetch(`${BASE_URL}/ai/assistants`, { headers });
if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`);
const { data: assistants } = await listRes.json();
assistants.forEach((a: any) => console.log(`${a.id}: ${a.name}`));

// Update
const updateRes = await fetch(`${BASE_URL}/ai/assistants/${assistant.id}`, {
  method: "POST",
  headers,
  body: JSON.stringify({ greeting: "Hi there! What can I do for you?" }),
});
if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}`);

// Delete
const deleteRes = await fetch(`${BASE_URL}/ai/assistants/${assistant.id}`, {
  method: "DELETE",
  headers,
});
if (!deleteRes.ok) throw new Error(`Delete failed: ${deleteRes.status}`);
```

## Agent Toolkit Examples

For framework-specific Python toolkit initialization and response handling, use
[the Python toolkit README](../tools/python/README.md). The REST examples above
can be used directly without a framework adapter.

## Test Without a Phone Number

An assistant can receive audio through
`wss://api.telnyx.com/v2/ai/assistants/{assistant_id}/conversation` without a
phone number or PSTN connection. This still uses billable AI processing.
Follow the [WebSocket conversation guide](https://developers.telnyx.com/docs/inference/ai-assistants/realtime-conversations)
for authentication, PCM16 input, sample rates, and lifecycle events. Keep the
account API key on a trusted server rather than embedding it in a browser.

## Wiring to a Phone Number

Create the assistant with the API examples above. If you need a new number,
follow the [Phone Numbers guide](phone-numbers.md) to search with
`filter[features]=voice`, check its cost, and place the order. New numbers incur
recurring rental charges. Wait for the order to complete, then retrieve the
owned number's resource ID; the order ID and E.164 number are not that ID.

Once you have an assistant and an owned number, retrieve the assistant's default
TeXML app, validate its routing, and assign the number to that app:

```bash
set -euo pipefail
ASSISTANT_ID="YOUR_ASSISTANT_ID"
PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_RESOURCE_ID"
BASE_URL="https://api.telnyx.com/v2"

assistant=$(curl --fail-with-body -sS "$BASE_URL/ai/assistants/$ASSISTANT_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY")
app_id=$(jq -er '(.data // .).telephony_settings.default_texml_app_id | select(type == "string" and length > 0)' <<< "$assistant")
curl --fail-with-body -sS "$BASE_URL/texml_applications/$app_id" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | \
  jq -e --arg app "$app_id" --arg url "$BASE_URL/ai/assistants/$ASSISTANT_ID/texml" \
    '(.data // .) | .id == $app and .active == true and .voice_url == $url and (.voice_method | ascii_upcase) == "GET"' >/dev/null

# Refuse to replace a different connection. Reconcile unexpected assignments first.
curl --fail-with-body -sS "$BASE_URL/phone_numbers/$PHONE_NUMBER_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | \
  jq -e --arg id "$PHONE_NUMBER_ID" --arg app "$app_id" \
    '(.data // .) | .id == $id and ((.connection_id // "") == "" or .connection_id == $app)' >/dev/null
curl --fail-with-body -sS -X PATCH "$BASE_URL/phone_numbers/$PHONE_NUMBER_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg app "$app_id" '{connection_id: $app}')" | \
  jq -e --arg id "$PHONE_NUMBER_ID" --arg app "$app_id" \
    '(.data // .) | .id == $id and .connection_id == $app'
```

This Bash example requires `jq` and uses the phone number's resource ID, not its
E.164 value. If the assistant has no default app or the routing check fails,
inspect its configuration before assigning a number. The supported voice route
is `GET /v2/ai/assistants/{assistant_id}/texml`, not `/call`. These read/assign
steps are not atomic with concurrent number updates. Confirm a real test call
after assignment; a successful PATCH only verifies the connection ID.

Preserve resource IDs if setup fails; do not blindly rerun a command that creates
paid resources.

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
| `10027` with an unavailable assistant-model detail | 422 | Omit `model` for the current default or select a model supported by assistants |
| `voice_not_found` | 400 | Verify voice_id |

## Resources

- [AI Assistants API Reference](https://developers.telnyx.com/docs/api/v2/ai-assistants)
- [AI Assistants Documentation](https://developers.telnyx.com/docs/ai/assistants)
- [Voice Call Control Guide](/guides/voice-call-control.md)
