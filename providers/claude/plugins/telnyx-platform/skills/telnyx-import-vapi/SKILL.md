---
name: telnyx-import-vapi
description: >-
  Import Vapi voice assistants into Telnyx with all configurations —
  instructions, greeting, voice settings, tools, and call analysis.
  Supports selective import by assistant ID and covers all SDK languages.
user_invocable: true
metadata:
  author: telnyx
  product: import-vapi
  compatibility: "Requires a Telnyx API key and a Vapi API key stored as a Telnyx integration secret."
---

# Import Vapi Assistants into Telnyx

Migrate your Vapi voice assistants to Telnyx in minutes. The import API pulls assistant configurations directly from Vapi using your API key and recreates them as Telnyx AI Assistants.

**Interaction model**: Collect the user's Telnyx API key and Vapi API key, store the Vapi key as a Telnyx integration secret, run the import, then verify. Do NOT skip the secret-creation step — the import endpoint requires a secret reference, not a raw key.

## What Gets Imported

| Component | Imported? | Notes |
|-----------|-----------|-------|
| Instructions | Yes | Imported as-is |
| Greeting / first message | Yes | Maps to assistant `greeting` |
| Voice configuration | Yes | Voice provider and voice ID preserved |
| Dynamic variables | Yes | Default values carried over |
| Tools (hangup, transfer, webhook) | Yes | Tool definitions and configurations |
| MCP Server integrations | Yes | Server URLs and tool mappings |
| Call analysis / insights | Yes | Mapped to `insight_settings` |
| Data retention preferences | Yes | Mapped to `privacy_settings` |
| Knowledge base | **No** | Must be manually added post-import |
| Secrets (API keys in tools) | **Partial** | Placeholder secrets created — you must re-enter values in the Telnyx portal |

## Prerequisites

1. **Telnyx API key** — get one at https://portal.telnyx.com/#/app/api-keys
2. **Vapi API key** — from your Vapi dashboard
3. Store the Vapi API key as a Telnyx integration secret at https://portal.telnyx.com/#/app/integration-secrets

## Step 1: Store Your Vapi API Key as a Telnyx Secret

Before importing, store your Vapi API key as an integration secret in Telnyx. Note the secret reference name (e.g., `vapi_api_key`) — you'll use it in the import call.

You can create integration secrets via the Telnyx Portal under **Integration Secrets**, or via the API.

## Step 2: Import All Vapi Assistants

Import every assistant from your Vapi account:

### curl

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "provider": "vapi",
  "api_key_ref": "vapi_api_key"
}' \
  "https://api.telnyx.com/v2/ai/assistants/import"
```

### Python

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))

assistants = client.ai.assistants.imports(
    provider="vapi",
    api_key_ref="vapi_api_key",
)

for assistant in assistants.data:
    print(f"Imported: {assistant.name} (ID: {assistant.id})")
```

### JavaScript

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx();

const assistants = await client.ai.assistants.imports({
  provider: 'vapi',
  api_key_ref: 'vapi_api_key',
});

for (const assistant of assistants.data) {
  console.log(`Imported: ${assistant.name} (ID: ${assistant.id})`);
}
```

### Go

```go
assistants, err := client.AI.Assistants.Imports(context.TODO(), telnyx.AIAssistantImportsParams{
    Provider:  telnyx.AIAssistantImportsParamsProviderVapi,
    APIKeyRef: "vapi_api_key",
})
if err != nil {
    panic(err.Error())
}
for _, a := range assistants.Data {
    fmt.Printf("Imported: %s (ID: %s)\n", a.Name, a.ID)
}
```

### Java

```java
import com.telnyx.sdk.models.ai.assistants.AssistantImportsParams;
import com.telnyx.sdk.models.ai.assistants.AssistantsList;

AssistantImportsParams params = AssistantImportsParams.builder()
    .provider(AssistantImportsParams.Provider.VAPI)
    .apiKeyRef("vapi_api_key")
    .build();
AssistantsList assistants = client.ai().assistants().imports(params);
assistants.getData().forEach(a ->
    System.out.printf("Imported: %s (ID: %s)%n", a.getName(), a.getId()));
```

### Ruby

```ruby
assistants = client.ai.assistants.imports(
  provider: :vapi,
  api_key_ref: "vapi_api_key"
)

assistants.data.each do |a|
  puts "Imported: #{a.name} (ID: #{a.id})"
end
```

## Step 2 (Alternative): Import Specific Assistants

To import only certain assistants, pass their Vapi assistant IDs in `import_ids`:

### curl

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "provider": "vapi",
  "api_key_ref": "vapi_api_key",
  "import_ids": ["vapi-assistant-id-1", "vapi-assistant-id-2"]
}' \
  "https://api.telnyx.com/v2/ai/assistants/import"
```

### Python

```python
assistants = client.ai.assistants.imports(
    provider="vapi",
    api_key_ref="vapi_api_key",
    import_ids=["vapi-assistant-id-1", "vapi-assistant-id-2"],
)
```

### JavaScript

```javascript
const assistants = await client.ai.assistants.imports({
  provider: 'vapi',
  api_key_ref: 'vapi_api_key',
  import_ids: ['vapi-assistant-id-1', 'vapi-assistant-id-2'],
});
```

## Step 3: Verify the Import

List your Telnyx assistants to confirm the import succeeded:

### curl

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants"
```

### Python

```python
assistants = client.ai.assistants.list()
for a in assistants.data:
    print(f"{a.name} — {a.id} — imported: {a.import_metadata}")
```

### JavaScript

```javascript
const assistants = await client.ai.assistants.list();
for (const a of assistants.data) {
  console.log(`${a.name} — ${a.id} — imported:`, a.import_metadata);
}
```

## Step 4: Post-Import Checklist

After importing, complete these manual steps:

1. **Re-enter secrets** — Any API keys referenced by tools were imported as placeholders. Go to https://portal.telnyx.com/#/app/integration-secrets and supply the actual values.
2. **Add knowledge bases** — Knowledge base content is not imported. Upload files or add URLs in the assistant's Knowledge Base settings.
3. **Assign a phone number** — Connect a Telnyx phone number to your imported assistant to start receiving calls.
4. **Test the assistant** — Use the Telnyx assistant testing API or make a test call to verify behavior.

## Re-importing

Running the import again for the same Vapi assistants will **overwrite** the existing Telnyx copies with the latest configuration from Vapi. This is useful for syncing changes during a gradual migration.

## API Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | Must be `"vapi"` |
| `api_key_ref` | string | Yes | Name of the Telnyx integration secret containing your Vapi API key |
| `import_ids` | array[string] | No | Specific Vapi assistant IDs to import. Omit to import all. |

Endpoint: `POST https://api.telnyx.com/v2/ai/assistants/import`

Full API docs: https://developers.telnyx.com/api-reference/assistants/import-assistants-from-external-provider
