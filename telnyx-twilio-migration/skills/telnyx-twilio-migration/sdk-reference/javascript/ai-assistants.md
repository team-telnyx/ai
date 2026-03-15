<!-- SDK reference: telnyx-ai-assistants-javascript -->

# Telnyx Ai Assistants - JavaScript

## Core Workflow

### Prerequisites

1. Create an AI Assistant with instructions (system prompt) and greeting
2. Select language model (e.g., gpt-4o, llama-4-maverick)
3. Configure voice: choose TTS provider (Telnyx, AWS, Azure, ElevenLabs, Inworld) and STT provider
4. For inbound calls: buy a phone number and assign to a Voice API Application or TeXML Application

### Steps

1. **Create assistant**: `client.ai.assistants.create({instructions: ..., model: ...})`
2. **(Optional) Attach knowledge base**: `client.ai.assistants.update({knowledgeBaseIds: [...]})`
3. **(Optional) Configure tools**: `Webhook tools, transfer, DTMF, handoff, MCP servers`
4. **Assign to phone number**: `Via connection or TeXML app`
5. **Test**: `Call the number or use the portal test feature`

### Common mistakes

- NEVER use free-tier API keys for ElevenLabs or OpenAI providers — requests are rejected
- For multilingual: MUST set STT to openai/whisper-large-v3-turbo — default is English-only
- Only gpt-4o and llama-4-maverick support image/vision analysis — other models silently ignore images

**Related skills**: telnyx-voice-javascript, telnyx-texml-javascript, telnyx-numbers-javascript

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
  const result = await client.ai.assistants.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create an assistant

Create a new AI Assistant.

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get an assistant

Retrieve an AI Assistant configuration by `assistant_id`.

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an assistant

Update an AI Assistant's attributes.

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Assistant Chat (BETA)

This endpoint allows a client to send a chat message to a specific AI Assistant. The assistant processes the message and returns a relevant reply based on the current conversation context.

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

Key response fields: `response.data.content`

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`client.ai.assistants.list()` — `GET /ai/assistants`

```javascript
const assistantsList = await client.ai.assistants.list();

console.log(assistantsList.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Import assistants from external provider

Import assistants from external providers. Any assistant that has already been imported will be overwritten with its latest version from the importing provider.

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get All Tags

`client.ai.assistants.tags.list()` — `GET /ai/assistants/tags`

```javascript
const tags = await client.ai.assistants.tags.list();

console.log(tags.tags);
```

Key response fields: `response.data.tags`

## List assistant tests with pagination

Retrieves a paginated list of assistant tests with optional filtering capabilities

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

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Create a new assistant test

Creates a comprehensive test configuration for evaluating AI assistant performance

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

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`client.ai.assistants.tests.testSuites.list()` — `GET /ai/assistants/tests/test-suites`

```javascript
const testSuites = await client.ai.assistants.tests.testSuites.list();

console.log(testSuites.data);
```

Key response fields: `response.data.data`

## Get test suite run history

Retrieves paginated history of test runs for a specific test suite with filtering options

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

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`client.ai.assistants.tests.testSuites.runs.trigger()` — `POST /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suiteName` | string | Yes |  |
| `destinationVersionId` | string (UUID) | No | Optional assistant version ID to use for all test runs in th... |

```javascript
const testRunResponses = await client.ai.assistants.tests.testSuites.runs.trigger('suite_name');

console.log(testRunResponses);
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`client.ai.assistants.tests.retrieve()` — `GET /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |

```javascript
const assistantTest = await client.ai.assistants.tests.retrieve('test_id');

console.log(assistantTest.test_id);
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Update an assistant test

Updates an existing assistant test configuration with new settings

`client.ai.assistants.tests.update()` — `PUT /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `telnyxConversationChannel` | enum (phone_call, web_call, sms_chat, web_chat) | No |  |
| `name` | string | No | Updated name for the assistant test. |
| `description` | string | No | Updated description of the test's purpose and evaluation cri... |
| ... | | | +5 optional params in the API Details section below |

```javascript
const assistantTest = await client.ai.assistants.tests.update('test_id');

console.log(assistantTest.test_id);
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Delete an assistant test

Permanently removes an assistant test and all associated data

`client.ai.assistants.tests.delete()` — `DELETE /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |

```javascript
await client.ai.assistants.tests.delete('test_id');
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`client.ai.assistants.tests.runs.list()` — `GET /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const testRunResponse of client.ai.assistants.tests.runs.list('test_id')) {
  console.log(testRunResponse.run_id);
}
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`client.ai.assistants.tests.runs.trigger()` — `POST /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `destinationVersionId` | string (UUID) | No | Optional assistant version ID to use for this test run. |

```javascript
const testRunResponse = await client.ai.assistants.tests.runs.trigger('test_id');

console.log(testRunResponse.run_id);
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Get specific test run details

Retrieves detailed information about a specific test run execution

`client.ai.assistants.tests.runs.retrieve()` — `GET /ai/assistants/tests/{test_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const testRunResponse = await client.ai.assistants.tests.runs.retrieve('run_id', {
  test_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(testRunResponse.run_id);
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`client.ai.assistants.delete()` — `DELETE /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```javascript
const assistant = await client.ai.assistants.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(assistant.id);
```

Key response fields: `response.data.id, response.data.deleted, response.data.object`

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant. Retrieves the current canary deploy configuration with all version IDs and their
traffic percentages for the specified assistant.

`client.ai.assistants.canaryDeploys.retrieve()` — `GET /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```javascript
const canaryDeployResponse = await client.ai.assistants.canaryDeploys.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(canaryDeployResponse.assistant_id);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Create Canary Deploy

Endpoint to create a canary deploy configuration for an assistant. Creates a new canary deploy configuration with multiple version IDs and their traffic
percentages for A/B testing or gradual rollouts of assistant versions.

`client.ai.assistants.canaryDeploys.create()` — `POST /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistantId` | string (UUID) | Yes |  |

```javascript
const canaryDeployResponse = await client.ai.assistants.canaryDeploys.create('assistant_id', {
  versions: [{ percentage: 1, version_id: '550e8400-e29b-41d4-a716-446655440000' }],
});

console.log(canaryDeployResponse.assistant_id);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant. Updates the existing canary deploy configuration with new version IDs and percentages. All old versions and percentages are replaces by new ones from this request.

`client.ai.assistants.canaryDeploys.update()` — `PUT /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistantId` | string (UUID) | Yes |  |

```javascript
const canaryDeployResponse = await client.ai.assistants.canaryDeploys.update('assistant_id', {
  versions: [{ percentage: 1, version_id: '550e8400-e29b-41d4-a716-446655440000' }],
});

console.log(canaryDeployResponse.assistant_id);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant. Removes all canary deploy configurations for the specified assistant.

`client.ai.assistants.canaryDeploys.delete()` — `DELETE /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```javascript
await client.ai.assistants.canaryDeploys.delete('550e8400-e29b-41d4-a716-446655440000');
```

## Assistant Sms Chat

Send an SMS message for an assistant. This endpoint: 
1. Validates the assistant exists and has messaging profile configured 
2.

`client.ai.assistants.sendSMS()` — `POST /ai/assistants/{assistant_id}/chat/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes |  |
| `to` | string (E.164) | Yes |  |
| `assistantId` | string (UUID) | Yes |  |
| `text` | string | No |  |
| `conversationMetadata` | object | No |  |
| `shouldCreateConversation` | boolean | No |  |

```javascript
const response = await client.ai.assistants.sendSMS('assistant_id', { from: '+18005550101', to: '+13125550001' });

console.log(response.conversation_id);
```

Key response fields: `response.data.conversation_id`

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`client.ai.assistants.clone()` — `POST /ai/assistants/{assistant_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```javascript
const assistant = await client.ai.assistants.clone('550e8400-e29b-41d4-a716-446655440000');

console.log(assistant.id);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List scheduled events

Get scheduled events for an assistant with pagination and filtering

`client.ai.assistants.scheduledEvents.list()` — `GET /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `conversationChannel` | enum (phone_call, sms_chat) | No |  |
| `fromDate` | string (date-time) | No |  |
| `toDate` | string (date-time) | No |  |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const scheduledEventListResponse of client.ai.assistants.scheduledEvents.list(
  'assistant_id',
)) {
  console.log(scheduledEventListResponse);
}
```

Key response fields: `response.data.data, response.data.meta`

## Create a scheduled event

Create a scheduled event for an assistant

`client.ai.assistants.scheduledEvents.create()` — `POST /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyxConversationChannel` | enum (phone_call, sms_chat) | Yes |  |
| `telnyxEndUserTarget` | string | Yes | The phone number, SIP URI, to schedule the call or text to. |
| `telnyxAgentTarget` | string | Yes | The phone number, SIP URI, to schedule the call or text from... |
| `scheduledAtFixedDatetime` | string (date-time) | Yes | The datetime at which the event should be scheduled. |
| `assistantId` | string (UUID) | Yes |  |
| `text` | string | No | Required for sms scheduled events. |
| `conversationMetadata` | object | No | Metadata associated with the conversation. |
| `dynamicVariables` | object | No | A map of dynamic variable names to values. |

```javascript
const scheduledEventResponse = await client.ai.assistants.scheduledEvents.create('assistant_id', {
  scheduled_at_fixed_datetime: '2025-04-15T13:07:28.764Z',
  telnyx_agent_target: 'telnyx_agent_target',
  telnyx_conversation_channel: 'phone_call',
  telnyx_end_user_target: 'telnyx_end_user_target',
});

console.log(scheduledEventResponse);
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`client.ai.assistants.scheduledEvents.retrieve()` — `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `eventId` | string (UUID) | Yes |  |

```javascript
const scheduledEventResponse = await client.ai.assistants.scheduledEvents.retrieve('event_id', {
  assistant_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(scheduledEventResponse);
```

## Delete a scheduled event

If the event is pending, this will cancel the event. Otherwise, this will simply remove the record of the event.

`client.ai.assistants.scheduledEvents.delete()` — `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `eventId` | string (UUID) | Yes |  |

```javascript
await client.ai.assistants.scheduledEvents.delete('event_id', { assistant_id: '550e8400-e29b-41d4-a716-446655440000' });
```

## Add Assistant Tag

`client.ai.assistants.tags.add()` — `POST /ai/assistants/{assistant_id}/tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag` | string | Yes |  |
| `assistantId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.assistants.tags.add('assistant_id', { tag: 'production' });

console.log(response.tags);
```

Key response fields: `response.data.tags`

## Remove Assistant Tag

`client.ai.assistants.tags.remove()` — `DELETE /ai/assistants/{assistant_id}/tags/{tag}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `tag` | string | Yes |  |

```javascript
const tag = await client.ai.assistants.tags.remove('tag', { assistant_id: '550e8400-e29b-41d4-a716-446655440000' });

console.log(tag.tags);
```

Key response fields: `response.data.tags`

## Get assistant texml

Get an assistant texml by `assistant_id`.

`client.ai.assistants.getTexml()` — `GET /ai/assistants/{assistant_id}/texml`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.assistants.getTexml('550e8400-e29b-41d4-a716-446655440000');

console.log(response);
```

## Test Assistant Tool

Test a webhook tool for an assistant

`client.ai.assistants.tools.test()` — `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |
| `arguments` | object | No | Key-value arguments to use for the webhook test |
| `dynamicVariables` | object | No | Key-value dynamic variables to use for the webhook test |

```javascript
const response = await client.ai.assistants.tools.test('tool_id', { assistant_id: '550e8400-e29b-41d4-a716-446655440000' });

console.log(response.data);
```

Key response fields: `response.data.content_type, response.data.request, response.data.response`

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`client.ai.assistants.versions.list()` — `GET /ai/assistants/{assistant_id}/versions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```javascript
const assistantsList = await client.ai.assistants.versions.list('550e8400-e29b-41d4-a716-446655440000');

console.log(assistantsList.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a specific assistant version

Retrieves a specific version of an assistant by assistant_id and version_id

`client.ai.assistants.versions.retrieve()` — `GET /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |
| `includeMcpServers` | boolean | No |  |

```javascript
const assistant = await client.ai.assistants.versions.retrieve('version_id', {
  assistant_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(assistant.id);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a specific assistant version

Updates the configuration of a specific assistant version. Can not update main version

`client.ai.assistants.versions.update()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +14 optional params in the API Details section below |

```javascript
const assistant = await client.ai.assistants.versions.update('version_id', {
  assistant_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(assistant.id);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a specific assistant version

Permanently removes a specific version of an assistant. Can not delete main version

`client.ai.assistants.versions.delete()` — `DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |

```javascript
await client.ai.assistants.versions.delete('version_id', { assistant_id: '550e8400-e29b-41d4-a716-446655440000' });
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant. This will delete any existing canary deploy configuration and send all live production traffic to this version.

`client.ai.assistants.versions.promote()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |

```javascript
const assistant = await client.ai.assistants.versions.promote('version_id', {
  assistant_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(assistant.id);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List MCP Servers

Retrieve a list of MCP servers.

`client.ai.mcpServers.list()` — `GET /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `url` | string (URL) | No |  |
| `page[size]` | integer | No |  |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const mcpServerListResponse of client.ai.mcpServers.list()) {
  console.log(mcpServerListResponse.id);
}
```

## Create MCP Server

Create a new MCP server.

`client.ai.mcpServers.create()` — `POST /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `type` | string | Yes |  |
| `url` | string (URL) | Yes |  |
| `apiKeyRef` | string | No |  |
| `allowedTools` | array[string] | No |  |

```javascript
const mcpServer = await client.ai.mcpServers.create({
  name: 'my-resource',
  type: 'webhook',
  url: 'https://example.com/resource',
});

console.log(mcpServer.id);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get MCP Server

Retrieve details for a specific MCP server.

`client.ai.mcpServers.retrieve()` — `GET /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcpServerId` | string (UUID) | Yes |  |

```javascript
const mcpServer = await client.ai.mcpServers.retrieve('mcp_server_id');

console.log(mcpServer.id);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update MCP Server

Update an existing MCP server.

`client.ai.mcpServers.update()` — `PUT /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcpServerId` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `id` | string (UUID) | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in the API Details section below |

```javascript
const mcpServer = await client.ai.mcpServers.update('mcp_server_id');

console.log(mcpServer.id);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete MCP Server

Delete a specific MCP server.

`client.ai.mcpServers.delete()` — `DELETE /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcpServerId` | string (UUID) | Yes |  |

```javascript
await client.ai.mcpServers.delete('mcp_server_id');
```

---

# AI Assistants (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List assistants, Create an assistant, Import assistants from external provider, Get an assistant, Update an assistant, Clone Assistant, Get all versions of an assistant, Get a specific assistant version, Update a specific assistant version, Promote an assistant version to main

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `description` | string |
| `dynamic_variables` | object |
| `dynamic_variables_webhook_url` | string |
| `enabled_features` | array[object] |
| `greeting` | string |
| `id` | string |
| `import_metadata` | object |
| `insight_settings` | object |
| `instructions` | string |
| `llm_api_key_ref` | string |
| `messaging_settings` | object |
| `model` | string |
| `name` | string |
| `privacy_settings` | object |
| `telephony_settings` | object |
| `tools` | array[object] |
| `transcription` | object |
| `voice_settings` | object |
| `widget_settings` | object |

**Returned by:** Get All Tags, Add Assistant Tag, Remove Assistant Tag

| Field | Type |
|-------|------|
| `tags` | array[string] |

**Returned by:** List assistant tests with pagination, Create a new assistant test, Get assistant test by ID, Update an assistant test

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `description` | string |
| `destination` | string |
| `instructions` | string |
| `max_duration_seconds` | integer |
| `name` | string |
| `rubric` | array[object] |
| `telnyx_conversation_channel` | object |
| `test_id` | uuid |
| `test_suite` | string |

**Returned by:** Get all test suite names

| Field | Type |
|-------|------|
| `data` | array[string] |

**Returned by:** Get test suite run history, Get test run history for a specific test, Trigger a manual test run, Get specific test run details

| Field | Type |
|-------|------|
| `completed_at` | date-time |
| `conversation_id` | string |
| `conversation_insights_id` | string |
| `created_at` | date-time |
| `detail_status` | array[object] |
| `logs` | string |
| `run_id` | uuid |
| `status` | enum: pending, starting, running, passed, failed, error |
| `test_id` | uuid |
| `test_suite_run_id` | uuid |
| `triggered_by` | string |
| `updated_at` | date-time |

**Returned by:** Delete an assistant

| Field | Type |
|-------|------|
| `deleted` | boolean |
| `id` | string |
| `object` | string |

**Returned by:** Get Canary Deploy, Create Canary Deploy, Update Canary Deploy

| Field | Type |
|-------|------|
| `assistant_id` | string |
| `created_at` | date-time |
| `updated_at` | date-time |
| `versions` | array[object] |

**Returned by:** Assistant Chat (BETA)

| Field | Type |
|-------|------|
| `content` | string |

**Returned by:** Assistant Sms Chat

| Field | Type |
|-------|------|
| `conversation_id` | string |

**Returned by:** List scheduled events

| Field | Type |
|-------|------|
| `data` | array[object] |
| `meta` | object |

**Returned by:** Test Assistant Tool

| Field | Type |
|-------|------|
| `content_type` | string |
| `request` | object |
| `response` | string |
| `status_code` | integer |
| `success` | boolean |

**Returned by:** Create MCP Server, Get MCP Server, Update MCP Server

| Field | Type |
|-------|------|
| `allowed_tools` | array \| null |
| `api_key_ref` | string \| null |
| `created_at` | date-time |
| `id` | string |
| `name` | string |
| `type` | string |
| `url` | string |

## Optional Parameters

### Create an assistant — `client.ai.assistants.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |

### Import assistants from external provider — `client.ai.assistants.imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `importIds` | array[string] | Optional list of assistant IDs to import from the external provider. |

### Create a new assistant test — `client.ai.assistants.tests.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Optional detailed description of what this test evaluates and its purpose. |
| `telnyxConversationChannel` | object | The communication channel through which the test will be conducted. |
| `maxDurationSeconds` | integer | Maximum duration in seconds that the test conversation should run before timi... |
| `testSuite` | string | Optional test suite name to group related tests together. |

### Trigger test suite execution — `client.ai.assistants.tests.testSuites.runs.trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `destinationVersionId` | string (UUID) | Optional assistant version ID to use for all test runs in this suite. |

### Update an assistant test — `client.ai.assistants.tests.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Updated name for the assistant test. |
| `description` | string | Updated description of the test's purpose and evaluation criteria. |
| `telnyxConversationChannel` | enum (phone_call, web_call, sms_chat, web_chat) |  |
| `destination` | string | Updated target destination for test conversations. |
| `maxDurationSeconds` | integer | Updated maximum test duration in seconds. |
| `testSuite` | string | Updated test suite assignment for better organization. |
| `instructions` | string | Updated test scenario instructions and objectives. |
| `rubric` | array[object] | Updated evaluation criteria for assessing assistant performance. |

### Trigger a manual test run — `client.ai.assistants.tests.runs.trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `destinationVersionId` | string (UUID) | Optional assistant version ID to use for this test run. |

### Update an assistant — `client.ai.assistants.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |
| `promoteToMain` | boolean | Indicates whether the assistant should be promoted to the main version. |

### Assistant Chat (BETA) — `client.ai.assistants.chat()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The optional display name of the user sending the message |

### Assistant Sms Chat — `client.ai.assistants.sendSMS()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string |  |
| `conversationMetadata` | object |  |
| `shouldCreateConversation` | boolean |  |

### Create a scheduled event — `client.ai.assistants.scheduledEvents.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Required for sms scheduled events. |
| `conversationMetadata` | object | Metadata associated with the conversation. |
| `dynamicVariables` | object | A map of dynamic variable names to values. |

### Test Assistant Tool — `client.ai.assistants.tools.test()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `arguments` | object | Key-value arguments to use for the webhook test |
| `dynamicVariables` | object | Key-value dynamic variables to use for the webhook test |

### Update a specific assistant version — `client.ai.assistants.versions.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |

### Create MCP Server — `client.ai.mcpServers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKeyRef` | string |  |
| `allowedTools` | array[string] |  |

### Update MCP Server — `client.ai.mcpServers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `name` | string |  |
| `type` | string |  |
| `url` | string (URL) |  |
| `apiKeyRef` | string |  |
| `allowedTools` | array[string] |  |
| `createdAt` | string (date-time) |  |
