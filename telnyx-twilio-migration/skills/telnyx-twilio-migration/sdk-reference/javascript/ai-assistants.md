<!-- SDK reference: telnyx-ai-assistants-javascript -->

# Telnyx AI Assistants - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const assistant = await client.ai.assistants.create({
    instructions: 'You are a helpful assistant.',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    name: 'my-resource',
  });
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).

## Core Tasks

### Create an assistant

Assistant creation is the entrypoint for any AI assistant integration. Agents need the exact creation method and the top-level fields returned by the SDK.

`client.ai.assistants.create()` — `POST /ai/assistants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `model` | string | Yes | ID of the model to use. |
| `instructions` | string | Yes | System instructions for the assistant. |
| `tools` | array[object] | No | The tools that the assistant can use. |
| `description` | string | No |  |
| `greeting` | string | No | Text that the assistant will use to start the conversation. |
| ... | | | +11 optional params in the API Details section below |

```javascript
const assistant = await client.ai.assistants.create({
  instructions: 'You are a helpful assistant.',
  model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  name: 'my-resource',
});

console.log(assistant.id);
```

Primary response fields:
- `assistant.id`
- `assistant.name`
- `assistant.model`
- `assistant.instructions`
- `assistant.createdAt`
- `assistant.description`

### Chat with an assistant

Chat is the primary runtime path. Agents need the exact assistant method and the response content field.

`client.ai.assistants.chat()` — `POST /ai/assistants/{assistant_id}/chat`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The message content sent by the client to the assistant |
| `conversationId` | string (UUID) | Yes | A unique identifier for the conversation thread, used to mai... |
| `assistantId` | string (UUID) | Yes |  |
| `name` | string | No | The optional display name of the user sending the message |

```javascript
const response = await client.ai.assistants.chat('assistant_id', {
  content: 'Tell me a joke about cats',
  conversation_id: '42b20469-1215-4a9a-8964-c36f66b406f4',
});

console.log(response.content);
```

Primary response fields:
- `response.content`

### Create an assistant test

Test creation is the main validation path for production assistant behavior before deployment.

`client.ai.assistants.tests.create()` — `POST /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A descriptive name for the assistant test. |
| `destination` | string | Yes | The target destination for the test conversation. |
| `instructions` | string | Yes | Detailed instructions that define the test scenario and what... |
| `rubric` | array[object] | Yes | Evaluation criteria used to assess the assistant's performan... |
| `description` | string | No | Optional detailed description of what this test evaluates an... |
| `telnyxConversationChannel` | object | No | The communication channel through which the test will be con... |
| `maxDurationSeconds` | integer | No | Maximum duration in seconds that the test conversation shoul... |
| ... | | | +1 optional params in the API Details section below |

```javascript
const assistantTest = await client.ai.assistants.tests.create({
  destination: '+15551234567',
  instructions:
    'Act as a frustrated customer who received a damaged product. Ask for a refund and escalate if not satisfied with the initial response.',
  name: 'Customer Support Bot Test',
  rubric: [
    { criteria: 'Assistant responds within 30 seconds', name: 'Response Time' },
    { criteria: 'Provides correct product information', name: 'Accuracy' },
  ],
});

console.log(assistantTest.test_id);
```

Primary response fields:
- `assistantTest.testId`
- `assistantTest.name`
- `assistantTest.destination`
- `assistantTest.createdAt`
- `assistantTest.instructions`
- `assistantTest.description`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Get an assistant

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.ai.assistants.retrieve()` — `GET /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `callControlId` | string (UUID) | No |  |
| `fetchDynamicVariablesFromWebhook` | boolean | No |  |
| `from` | string (E.164) | No |  |
| ... | | | +1 optional params in the API Details section below |

```javascript
const assistant = await client.ai.assistants.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(assistant.id);
```

Primary response fields:
- `assistant.id`
- `assistant.name`
- `assistant.createdAt`
- `assistant.description`
- `assistant.dynamicVariables`
- `assistant.dynamicVariablesWebhookUrl`

### Update an assistant

Create or provision an additional resource when the core tasks do not cover this flow.

`client.ai.assistants.update()` — `POST /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +15 optional params in the API Details section below |

```javascript
const assistant = await client.ai.assistants.update('550e8400-e29b-41d4-a716-446655440000');

console.log(assistant.id);
```

Primary response fields:
- `assistant.id`
- `assistant.name`
- `assistant.createdAt`
- `assistant.description`
- `assistant.dynamicVariables`
- `assistant.dynamicVariablesWebhookUrl`

### List assistants

Inspect available resources or choose an existing resource before mutating it.

`client.ai.assistants.list()` — `GET /ai/assistants`

```javascript
const assistantsList = await client.ai.assistants.list();

console.log(assistantsList.data);
```

Response wrapper:
- items: `assistantsList.data`

Primary item fields:
- `id`
- `name`
- `createdAt`
- `description`
- `dynamicVariables`
- `dynamicVariablesWebhookUrl`

### Import assistants from external provider

Import existing assistants from an external provider instead of creating from scratch.

`client.ai.assistants.imports()` — `POST /ai/assistants/import`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (elevenlabs, vapi, retell) | Yes | The external provider to import assistants from. |
| `apiKeyRef` | string | Yes | Integration secret pointer that refers to the API key for th... |
| `importIds` | array[string] | No | Optional list of assistant IDs to import from the external p... |

```javascript
const assistantsList = await client.ai.assistants.imports({
  api_key_ref: 'api_key_ref',
  provider: 'elevenlabs',
});

console.log(assistantsList.data);
```

Response wrapper:
- items: `assistantsList.data`

Primary item fields:
- `id`
- `name`
- `createdAt`
- `description`
- `dynamicVariables`
- `dynamicVariablesWebhookUrl`

### Get All Tags

Inspect available resources or choose an existing resource before mutating it.

`client.ai.assistants.tags.list()` — `GET /ai/assistants/tags`

```javascript
const tags = await client.ai.assistants.tags.list();

console.log(tags.tags);
```

Primary response fields:
- `tags.tags`

### List assistant tests with pagination

Inspect available resources or choose an existing resource before mutating it.

`client.ai.assistants.tests.list()` — `GET /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testSuite` | string | No | Filter tests by test suite name |
| `telnyxConversationChannel` | string | No | Filter tests by communication channel (e.g., 'web_chat', 'sm... |
| `destination` | string | No | Filter tests by destination (phone number, webhook URL, etc.... |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const assistantTest of client.ai.assistants.tests.list()) {
  console.log(assistantTest.test_id);
}
```

Response wrapper:
- items: `assistantTest.data`
- pagination: `assistantTest.meta`

Primary item fields:
- `name`
- `createdAt`
- `description`
- `destination`
- `instructions`
- `maxDurationSeconds`

### Get all test suite names

Inspect available resources or choose an existing resource before mutating it.

`client.ai.assistants.tests.testSuites.list()` — `GET /ai/assistants/tests/test-suites`

```javascript
const testSuites = await client.ai.assistants.tests.testSuites.list();

console.log(testSuites.data);
```

Response wrapper:
- items: `testSuites.data`

Primary item fields:
- `data`

### Get test suite run history

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.ai.assistants.tests.testSuites.runs.list()` — `GET /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suiteName` | string | Yes |  |
| `testSuiteRunId` | string (UUID) | No | Filter runs by specific suite execution batch ID |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const testRunResponse of client.ai.assistants.tests.testSuites.runs.list('suite_name')) {
  console.log(testRunResponse.run_id);
}
```

Response wrapper:
- items: `testRunResponse.data`
- pagination: `testRunResponse.meta`

Primary item fields:
- `status`
- `createdAt`
- `updatedAt`
- `completedAt`
- `conversationId`
- `conversationInsightsId`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Trigger test suite execution | `client.ai.assistants.tests.testSuites.runs.trigger()` | `POST /ai/assistants/tests/test-suites/{suite_name}/runs` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `suiteName` |
| Get assistant test by ID | `client.ai.assistants.tests.retrieve()` | `GET /ai/assistants/tests/{test_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `testId` |
| Update an assistant test | `client.ai.assistants.tests.update()` | `PUT /ai/assistants/tests/{test_id}` | Modify an existing resource without recreating it. | `testId` |
| Delete an assistant test | `client.ai.assistants.tests.delete()` | `DELETE /ai/assistants/tests/{test_id}` | Remove, detach, or clean up an existing resource. | `testId` |
| Get test run history for a specific test | `client.ai.assistants.tests.runs.list()` | `GET /ai/assistants/tests/{test_id}/runs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `testId` |
| Trigger a manual test run | `client.ai.assistants.tests.runs.trigger()` | `POST /ai/assistants/tests/{test_id}/runs` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `testId` |
| Get specific test run details | `client.ai.assistants.tests.runs.retrieve()` | `GET /ai/assistants/tests/{test_id}/runs/{run_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `testId`, `runId` |
| Delete an assistant | `client.ai.assistants.delete()` | `DELETE /ai/assistants/{assistant_id}` | Remove, detach, or clean up an existing resource. | `assistantId` |
| Get Canary Deploy | `client.ai.assistants.canaryDeploys.retrieve()` | `GET /ai/assistants/{assistant_id}/canary-deploys` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistantId` |
| Create Canary Deploy | `client.ai.assistants.canaryDeploys.create()` | `POST /ai/assistants/{assistant_id}/canary-deploys` | Create or provision an additional resource when the core tasks do not cover this flow. | `versions`, `assistantId` |
| Update Canary Deploy | `client.ai.assistants.canaryDeploys.update()` | `PUT /ai/assistants/{assistant_id}/canary-deploys` | Modify an existing resource without recreating it. | `versions`, `assistantId` |
| Delete Canary Deploy | `client.ai.assistants.canaryDeploys.delete()` | `DELETE /ai/assistants/{assistant_id}/canary-deploys` | Remove, detach, or clean up an existing resource. | `assistantId` |
| Assistant Sms Chat | `client.ai.assistants.sendSMS()` | `POST /ai/assistants/{assistant_id}/chat/sms` | Run assistant chat over SMS instead of direct API chat. | `from`, `to`, `assistantId` |
| Clone Assistant | `client.ai.assistants.clone()` | `POST /ai/assistants/{assistant_id}/clone` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `assistantId` |
| List scheduled events | `client.ai.assistants.scheduledEvents.list()` | `GET /ai/assistants/{assistant_id}/scheduled_events` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistantId` |
| Create a scheduled event | `client.ai.assistants.scheduledEvents.create()` | `POST /ai/assistants/{assistant_id}/scheduled_events` | Create or provision an additional resource when the core tasks do not cover this flow. | `telnyxConversationChannel`, `telnyxEndUserTarget`, `telnyxAgentTarget`, `scheduledAtFixedDatetime`, +1 more |
| Get a scheduled event | `client.ai.assistants.scheduledEvents.retrieve()` | `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistantId`, `eventId` |
| Delete a scheduled event | `client.ai.assistants.scheduledEvents.delete()` | `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}` | Remove, detach, or clean up an existing resource. | `assistantId`, `eventId` |
| Add Assistant Tag | `client.ai.assistants.tags.add()` | `POST /ai/assistants/{assistant_id}/tags` | Create or provision an additional resource when the core tasks do not cover this flow. | `tag`, `assistantId` |
| Remove Assistant Tag | `client.ai.assistants.tags.remove()` | `DELETE /ai/assistants/{assistant_id}/tags/{tag}` | Remove, detach, or clean up an existing resource. | `assistantId`, `tag` |
| Get assistant texml | `client.ai.assistants.getTexml()` | `GET /ai/assistants/{assistant_id}/texml` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistantId` |
| Test Assistant Tool | `client.ai.assistants.tools.test()` | `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `assistantId`, `toolId` |
| Get all versions of an assistant | `client.ai.assistants.versions.list()` | `GET /ai/assistants/{assistant_id}/versions` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistantId` |
| Get a specific assistant version | `client.ai.assistants.versions.retrieve()` | `GET /ai/assistants/{assistant_id}/versions/{version_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistantId`, `versionId` |
| Update a specific assistant version | `client.ai.assistants.versions.update()` | `POST /ai/assistants/{assistant_id}/versions/{version_id}` | Create or provision an additional resource when the core tasks do not cover this flow. | `assistantId`, `versionId` |
| Delete a specific assistant version | `client.ai.assistants.versions.delete()` | `DELETE /ai/assistants/{assistant_id}/versions/{version_id}` | Remove, detach, or clean up an existing resource. | `assistantId`, `versionId` |
| Promote an assistant version to main | `client.ai.assistants.versions.promote()` | `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `assistantId`, `versionId` |
| List MCP Servers | `client.ai.mcpServers.list()` | `GET /ai/mcp_servers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create MCP Server | `client.ai.mcpServers.create()` | `POST /ai/mcp_servers` | Create or provision an additional resource when the core tasks do not cover this flow. | `name`, `type`, `url` |
| Get MCP Server | `client.ai.mcpServers.retrieve()` | `GET /ai/mcp_servers/{mcp_server_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `mcpServerId` |
| Update MCP Server | `client.ai.mcpServers.update()` | `PUT /ai/mcp_servers/{mcp_server_id}` | Modify an existing resource without recreating it. | `mcpServerId` |
| Delete MCP Server | `client.ai.mcpServers.delete()` | `DELETE /ai/mcp_servers/{mcp_server_id}` | Remove, detach, or clean up an existing resource. | `mcpServerId` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
