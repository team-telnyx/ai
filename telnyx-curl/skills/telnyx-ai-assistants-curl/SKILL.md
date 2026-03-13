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
  profile: northstar-v2
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx AI Assistants - curl

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

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read [references/api-details.md](references/api-details.md) before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas).

## Core Tasks

### Create an assistant

Assistant creation is the entrypoint for any AI assistant integration. Agents need the exact creation method and the top-level fields returned by the SDK.

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

Primary response fields:
- `.data.id`
- `.data.name`
- `.data.model`
- `.data.instructions`
- `.data.created_at`
- `.data.description`

### Chat with an assistant

Chat is the primary runtime path. Agents need the exact assistant method and the response content field.

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

Primary response fields:
- `.data.content`

### Create an assistant test

Test creation is the main validation path for production assistant behavior before deployment.

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

Primary response fields:
- `.data.test_id`
- `.data.name`
- `.data.destination`
- `.data.created_at`
- `.data.instructions`
- `.data.description`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Get an assistant

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Primary response fields:
- `.data.id`
- `.data.name`
- `.data.created_at`
- `.data.description`
- `.data.dynamic_variables`
- `.data.dynamic_variables_webhook_url`

### Update an assistant

Create or provision an additional resource when the core tasks do not cover this flow.

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

Primary response fields:
- `.data.id`
- `.data.name`
- `.data.created_at`
- `.data.description`
- `.data.dynamic_variables`
- `.data.dynamic_variables_webhook_url`

### List assistants

Inspect available resources or choose an existing resource before mutating it.

`GET /ai/assistants`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants"
```

Response wrapper:
- items: `.data`

Primary item fields:
- `id`
- `name`
- `created_at`
- `description`
- `dynamic_variables`
- `dynamic_variables_webhook_url`

### Import assistants from external provider

Import existing assistants from an external provider instead of creating from scratch.

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

Response wrapper:
- items: `.data`

Primary item fields:
- `id`
- `name`
- `created_at`
- `description`
- `dynamic_variables`
- `dynamic_variables_webhook_url`

### Get All Tags

Inspect available resources or choose an existing resource before mutating it.

`GET /ai/assistants/tags`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tags"
```

Primary response fields:
- `.data.tags`

### List assistant tests with pagination

Inspect available resources or choose an existing resource before mutating it.

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

Response wrapper:
- items: `.data`
- pagination: `.meta`

Primary item fields:
- `name`
- `created_at`
- `description`
- `destination`
- `instructions`
- `max_duration_seconds`

### Get all test suite names

Inspect available resources or choose an existing resource before mutating it.

`GET /ai/assistants/tests/test-suites`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/assistants/tests/test-suites"
```

Response wrapper:
- items: `.data`

Primary item fields:
- `data`

### Get test suite run history

Fetch the current state before updating, deleting, or making control-flow decisions.

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

Response wrapper:
- items: `.data`
- pagination: `.meta`

Primary item fields:
- `status`
- `created_at`
- `updated_at`
- `completed_at`
- `conversation_id`
- `conversation_insights_id`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use [references/api-details.md](references/api-details.md) for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](references/api-details.md#optional-parameters) and [the response-schemas section](references/api-details.md#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Trigger test suite execution | HTTP only | `POST /ai/assistants/tests/test-suites/{suite_name}/runs` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `suite_name` |
| Get assistant test by ID | HTTP only | `GET /ai/assistants/tests/{test_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `test_id` |
| Update an assistant test | HTTP only | `PUT /ai/assistants/tests/{test_id}` | Modify an existing resource without recreating it. | `test_id` |
| Delete an assistant test | HTTP only | `DELETE /ai/assistants/tests/{test_id}` | Remove, detach, or clean up an existing resource. | `test_id` |
| Get test run history for a specific test | HTTP only | `GET /ai/assistants/tests/{test_id}/runs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `test_id` |
| Trigger a manual test run | HTTP only | `POST /ai/assistants/tests/{test_id}/runs` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `test_id` |
| Get specific test run details | HTTP only | `GET /ai/assistants/tests/{test_id}/runs/{run_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `test_id`, `run_id` |
| Delete an assistant | HTTP only | `DELETE /ai/assistants/{assistant_id}` | Remove, detach, or clean up an existing resource. | `assistant_id` |
| Get Canary Deploy | HTTP only | `GET /ai/assistants/{assistant_id}/canary-deploys` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistant_id` |
| Create Canary Deploy | HTTP only | `POST /ai/assistants/{assistant_id}/canary-deploys` | Create or provision an additional resource when the core tasks do not cover this flow. | `versions`, `assistant_id` |
| Update Canary Deploy | HTTP only | `PUT /ai/assistants/{assistant_id}/canary-deploys` | Modify an existing resource without recreating it. | `versions`, `assistant_id` |
| Delete Canary Deploy | HTTP only | `DELETE /ai/assistants/{assistant_id}/canary-deploys` | Remove, detach, or clean up an existing resource. | `assistant_id` |
| Assistant Sms Chat | HTTP only | `POST /ai/assistants/{assistant_id}/chat/sms` | Run assistant chat over SMS instead of direct API chat. | `from`, `to`, `assistant_id` |
| Clone Assistant | HTTP only | `POST /ai/assistants/{assistant_id}/clone` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `assistant_id` |
| List scheduled events | HTTP only | `GET /ai/assistants/{assistant_id}/scheduled_events` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistant_id` |
| Create a scheduled event | HTTP only | `POST /ai/assistants/{assistant_id}/scheduled_events` | Create or provision an additional resource when the core tasks do not cover this flow. | `telnyx_conversation_channel`, `telnyx_end_user_target`, `telnyx_agent_target`, `scheduled_at_fixed_datetime`, +1 more |
| Get a scheduled event | HTTP only | `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistant_id`, `event_id` |
| Delete a scheduled event | HTTP only | `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}` | Remove, detach, or clean up an existing resource. | `assistant_id`, `event_id` |
| Add Assistant Tag | HTTP only | `POST /ai/assistants/{assistant_id}/tags` | Create or provision an additional resource when the core tasks do not cover this flow. | `tag`, `assistant_id` |
| Remove Assistant Tag | HTTP only | `DELETE /ai/assistants/{assistant_id}/tags/{tag}` | Remove, detach, or clean up an existing resource. | `assistant_id`, `tag` |
| Get assistant texml | HTTP only | `GET /ai/assistants/{assistant_id}/texml` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistant_id` |
| Test Assistant Tool | HTTP only | `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `assistant_id`, `tool_id` |
| Get all versions of an assistant | HTTP only | `GET /ai/assistants/{assistant_id}/versions` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistant_id` |
| Get a specific assistant version | HTTP only | `GET /ai/assistants/{assistant_id}/versions/{version_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `assistant_id`, `version_id` |
| Update a specific assistant version | HTTP only | `POST /ai/assistants/{assistant_id}/versions/{version_id}` | Create or provision an additional resource when the core tasks do not cover this flow. | `assistant_id`, `version_id` |
| Delete a specific assistant version | HTTP only | `DELETE /ai/assistants/{assistant_id}/versions/{version_id}` | Remove, detach, or clean up an existing resource. | `assistant_id`, `version_id` |
| Promote an assistant version to main | HTTP only | `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `assistant_id`, `version_id` |
| List MCP Servers | HTTP only | `GET /ai/mcp_servers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create MCP Server | HTTP only | `POST /ai/mcp_servers` | Create or provision an additional resource when the core tasks do not cover this flow. | `name`, `type`, `url` |
| Get MCP Server | HTTP only | `GET /ai/mcp_servers/{mcp_server_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `mcp_server_id` |
| Update MCP Server | HTTP only | `PUT /ai/mcp_servers/{mcp_server_id}` | Modify an existing resource without recreating it. | `mcp_server_id` |
| Delete MCP Server | HTTP only | `DELETE /ai/mcp_servers/{mcp_server_id}` | Remove, detach, or clean up an existing resource. | `mcp_server_id` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see [references/api-details.md](references/api-details.md).
