---
name: telnyx-ai-assistants-curl
description: >-
  AI voice assistants with custom instructions, knowledge bases, and tool
  integrations.
metadata:
  author: telnyx
  product: ai-assistants
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Assistants - curl

## Core Workflow

### Prerequisites

1. Create an AI Assistant with instructions (system prompt) and greeting
2. Select language model (e.g., gpt-4o, llama-4-maverick)
3. Configure voice: choose TTS provider (Telnyx, AWS, Azure, ElevenLabs, Inworld) and STT provider
4. For inbound calls: buy a phone number and assign to a Voice API Application or TeXML Application

### Steps

1. **Create assistant**
2. **(Optional) Attach knowledge base**
3. **(Optional) Configure tools**
4. **Assign to phone number**
5. **Test**

### Common mistakes

- NEVER use free-tier API keys for ElevenLabs or OpenAI providers — requests are rejected
- For multilingual: MUST set STT to openai/whisper-large-v3-turbo — default is English-only
- Only gpt-4o and llama-4-maverick support image/vision analysis — other models silently ignore images

**Related skills**: telnyx-voice-curl, telnyx-texml-curl, telnyx-numbers-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create an assistant

Create a new AI Assistant.

`POST /ai/assistants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `model` | string | Yes | ID of the model to use. |
| `instructions` | string | Yes | System instructions for the assistant. |
| `tools` | array[object] | No | The tools that the assistant can use. |
| `description` | string | No |  |
| `greeting` | string | No | Text that the assistant will use to start the conversation. |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource",
  "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "instructions": "You are a helpful assistant."
}' \
  "https://api.telnyx.com/v2/ai/assistants"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get an assistant

Retrieve an AI Assistant configuration by `assistant_id`.

`GET /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `call_control_id` | string (UUID) | No |  |
| `fetch_dynamic_variables_from_webhook` | boolean | No |  |
| `from` | string (E.164) | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update an assistant

Update an AI Assistant's attributes.

`POST /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +15 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Assistant Chat (BETA)

This endpoint allows a client to send a chat message to a specific AI Assistant. The assistant processes the message and returns a relevant reply based on the current conversation context.

`POST /ai/assistants/{assistant_id}/chat`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The message content sent by the client to the assistant |
| `conversation_id` | string (UUID) | Yes | A unique identifier for the conversation thread, used to mai... |
| `assistant_id` | string (UUID) | Yes |  |
| `name` | string | No | The optional display name of the user sending the message |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "content": "Tell me a joke about cats",
  "conversation_id": "42b20469-1215-4a9a-8964-c36f66b406f4"
}' \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/chat"
```

Key response fields: `.data.content`

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`GET /ai/assistants`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Import assistants from external provider

Import assistants from external providers. Any assistant that has already been imported will be overwritten with its latest version from the importing provider.

`POST /ai/assistants/import`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (elevenlabs, vapi, retell) | Yes | The external provider to import assistants from. |
| `api_key_ref` | string | Yes | Integration secret pointer that refers to the API key for th... |
| `import_ids` | array[string] | No | Optional list of assistant IDs to import from the external p... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "provider": "elevenlabs",
  "api_key_ref": "my-openai-key"
}' \
  "https://api.telnyx.com/v2/ai/assistants/import"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get All Tags

`GET /ai/assistants/tags`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tags"
```

Key response fields: `.data.tags`

## List assistant tests with pagination

Retrieves a paginated list of assistant tests with optional filtering capabilities

`GET /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_suite` | string | No | Filter tests by test suite name |
| `telnyx_conversation_channel` | string | No | Filter tests by communication channel (e.g., 'web_chat', 'sm... |
| `destination` | string | No | Filter tests by destination (phone number, webhook URL, etc.... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests"
```

Key response fields: `.data.name, .data.created_at, .data.description`

## Create a new assistant test

Creates a comprehensive test configuration for evaluating AI assistant performance

`POST /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A descriptive name for the assistant test. |
| `destination` | string | Yes | The target destination for the test conversation. |
| `instructions` | string | Yes | Detailed instructions that define the test scenario and what... |
| `rubric` | array[object] | Yes | Evaluation criteria used to assess the assistant's performan... |
| `description` | string | No | Optional detailed description of what this test evaluates an... |
| `telnyx_conversation_channel` | object | No | The communication channel through which the test will be con... |
| `max_duration_seconds` | integer | No | Maximum duration in seconds that the test conversation shoul... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Customer Support Bot Test",
  "destination": "+15551234567",
  "instructions": "Act as a frustrated customer who received a damaged product. Ask for a refund and escalate if not satisfied with the initial response.",
  "rubric": [
    {
      "criteria": "Assistant responds within 30 seconds",
      "name": "Response Time"
    },
    {
      "criteria": "Provides correct product information",
      "name": "Accuracy"
    }
  ]
}' \
  "https://api.telnyx.com/v2/ai/assistants/tests"
```

Key response fields: `.data.name, .data.created_at, .data.description`

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`GET /ai/assistants/tests/test-suites`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests/test-suites"
```

Key response fields: `.data.data`

## Get test suite run history

Retrieves paginated history of test runs for a specific test suite with filtering options

`GET /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suite_name` | string | Yes |  |
| `test_suite_run_id` | string (UUID) | No | Filter runs by specific suite execution batch ID |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests/test-suites/{suite_name}/runs"
```

Key response fields: `.data.status, .data.created_at, .data.updated_at`

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`POST /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suite_name` | string | Yes |  |
| `destination_version_id` | string (UUID) | No | Optional assistant version ID to use for all test runs in th... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/tests/test-suites/{suite_name}/runs"
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`GET /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests/{test_id}"
```

Key response fields: `.data.name, .data.created_at, .data.description`

## Update an assistant test

Updates an existing assistant test configuration with new settings

`PUT /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `telnyx_conversation_channel` | enum (phone_call, web_call, sms_chat, web_chat) | No |  |
| `name` | string | No | Updated name for the assistant test. |
| `description` | string | No | Updated description of the test's purpose and evaluation cri... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/tests/{test_id}"
```

Key response fields: `.data.name, .data.created_at, .data.description`

## Delete an assistant test

Permanently removes an assistant test and all associated data

`DELETE /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants/tests/{test_id}"
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`GET /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests/{test_id}/runs"
```

Key response fields: `.data.status, .data.created_at, .data.updated_at`

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`POST /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `destination_version_id` | string (UUID) | No | Optional assistant version ID to use for this test run. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/tests/{test_id}/runs"
```

Key response fields: `.data.status, .data.created_at, .data.updated_at`

## Get specific test run details

Retrieves detailed information about a specific test run execution

`GET /ai/assistants/tests/{test_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests/{test_id}/runs/{run_id}"
```

Key response fields: `.data.status, .data.created_at, .data.updated_at`

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`DELETE /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.deleted, .data.object`

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant. Retrieves the current canary deploy configuration with all version IDs and their
traffic percentages for the specified assistant.

`GET /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/canary-deploys"
```

Key response fields: `.data.created_at, .data.updated_at, .data.assistant_id`

## Create Canary Deploy

Endpoint to create a canary deploy configuration for an assistant. Creates a new canary deploy configuration with multiple version IDs and their traffic
percentages for A/B testing or gradual rollouts of assistant versions.

`POST /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "versions": [
    "v1"
  ]
}' \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/canary-deploys"
```

Key response fields: `.data.created_at, .data.updated_at, .data.assistant_id`

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant. Updates the existing canary deploy configuration with new version IDs and percentages. All old versions and percentages are replaces by new ones from this request.

`PUT /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "versions": [
    "v1"
  ]
}' \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/canary-deploys"
```

Key response fields: `.data.created_at, .data.updated_at, .data.assistant_id`

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant. Removes all canary deploy configurations for the specified assistant.

`DELETE /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/canary-deploys"
```

## Assistant Sms Chat

Send an SMS message for an assistant. This endpoint: 
1. Validates the assistant exists and has messaging profile configured 
2.

`POST /ai/assistants/{assistant_id}/chat/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes |  |
| `to` | string (E.164) | Yes |  |
| `assistant_id` | string (UUID) | Yes |  |
| `text` | string | No |  |
| `conversation_metadata` | object | No |  |
| `should_create_conversation` | boolean | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "from": "+18005550101",
  "to": "+13125550001"
}' \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/chat/sms"
```

Key response fields: `.data.conversation_id`

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`POST /ai/assistants/{assistant_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/clone"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List scheduled events

Get scheduled events for an assistant with pagination and filtering

`GET /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `conversation_channel` | enum (phone_call, sms_chat) | No |  |
| `from_date` | string (date-time) | No |  |
| `to_date` | string (date-time) | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/scheduled_events"
```

Key response fields: `.data.data, .data.meta`

## Create a scheduled event

Create a scheduled event for an assistant

`POST /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyx_conversation_channel` | enum (phone_call, sms_chat) | Yes |  |
| `telnyx_end_user_target` | string | Yes | The phone number, SIP URI, to schedule the call or text to. |
| `telnyx_agent_target` | string | Yes | The phone number, SIP URI, to schedule the call or text from... |
| `scheduled_at_fixed_datetime` | string (date-time) | Yes | The datetime at which the event should be scheduled. |
| `assistant_id` | string (UUID) | Yes |  |
| `text` | string | No | Required for sms scheduled events. |
| `conversation_metadata` | object | No | Metadata associated with the conversation. |
| `dynamic_variables` | object | No | A map of dynamic variable names to values. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "telnyx_conversation_channel": "phone_call",
  "telnyx_end_user_target": "+13125550001",
  "telnyx_agent_target": "550e8400-e29b-41d4-a716-446655440000",
  "scheduled_at_fixed_datetime": "2025-04-15T13:07:28.764Z"
}' \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/scheduled_events"
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/scheduled_events/{event_id}"
```

## Delete a scheduled event

If the event is pending, this will cancel the event. Otherwise, this will simply remove the record of the event.

`DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/scheduled_events/{event_id}"
```

## Add Assistant Tag

`POST /ai/assistants/{assistant_id}/tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag` | string | Yes |  |
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "tag": "production"
}' \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/tags"
```

Key response fields: `.data.tags`

## Remove Assistant Tag

`DELETE /ai/assistants/{assistant_id}/tags/{tag}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `tag` | string | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/tags/{tag}"
```

Key response fields: `.data.tags`

## Get assistant texml

Get an assistant texml by `assistant_id`.

`GET /ai/assistants/{assistant_id}/texml`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/texml"
```

## Test Assistant Tool

Test a webhook tool for an assistant

`POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |
| `arguments` | object | No | Key-value arguments to use for the webhook test |
| `dynamic_variables` | object | No | Key-value dynamic variables to use for the webhook test |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/tools/{tool_id}/test"
```

Key response fields: `.data.content_type, .data.request, .data.response`

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`GET /ai/assistants/{assistant_id}/versions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/versions"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get a specific assistant version

Retrieves a specific version of an assistant by assistant_id and version_id

`GET /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |
| `include_mcp_servers` | boolean | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/versions/{version_id}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a specific assistant version

Updates the configuration of a specific assistant version. Can not update main version

`POST /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +14 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/versions/{version_id}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a specific assistant version

Permanently removes a specific version of an assistant. Can not delete main version

`DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/versions/{version_id}"
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant. This will delete any existing canary deploy configuration and send all live production traffic to this version.

`POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/assistants/550e8400-e29b-41d4-a716-446655440000/versions/{version_id}/promote"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List MCP Servers

Retrieve a list of MCP servers.

`GET /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `url` | string (URL) | No |  |
| `page[size]` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/mcp_servers"
```

## Create MCP Server

Create a new MCP server.

`POST /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `type` | string | Yes |  |
| `url` | string (URL) | Yes |  |
| `api_key_ref` | string | No |  |
| `allowed_tools` | array[string] | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource",
  "type": "sse",
  "url": "https://example.com/resource"
}' \
  "https://api.telnyx.com/v2/ai/mcp_servers"
```

Key response fields: `.data.id, .data.name, .data.type`

## Get MCP Server

Retrieve details for a specific MCP server.

`GET /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/mcp_servers/{mcp_server_id}"
```

Key response fields: `.data.id, .data.name, .data.type`

## Update MCP Server

Update an existing MCP server.

`PUT /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `id` | string (UUID) | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/mcp_servers/{mcp_server_id}"
```

Key response fields: `.data.id, .data.name, .data.type`

## Delete MCP Server

Delete a specific MCP server.

`DELETE /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/mcp_servers/{mcp_server_id}"
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
