---
name: telnyx-ai-assistants-python
description: >-
  AI voice assistants with custom instructions, knowledge bases, and tool
  integrations.
metadata:
  author: telnyx
  product: ai-assistants
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Assistants - Python

## Core Workflow

### Prerequisites

1. Create an AI Assistant with instructions (system prompt) and greeting
2. Select language model (e.g., gpt-4o, llama-4-maverick)
3. Configure voice: choose TTS provider (Telnyx, AWS, Azure, ElevenLabs, Inworld) and STT provider
4. For inbound calls: buy a phone number and assign to a Voice API Application or TeXML Application

### Steps

1. **Create assistant**: `client.ai.assistants.create(instructions=..., model=...)`
2. **(Optional) Attach knowledge base**: `client.ai.assistants.update(knowledge_base_ids=[...])`
3. **(Optional) Configure tools**: `Webhook tools, transfer, DTMF, handoff, MCP servers`
4. **Assign to phone number**: `Via connection or TeXML app`
5. **Test**: `Call the number or use the portal test feature`

### Common mistakes

- NEVER use free-tier API keys for ElevenLabs or OpenAI providers — requests are rejected
- For multilingual: MUST set STT to openai/whisper-large-v3-turbo — default is English-only
- Only gpt-4o and llama-4-maverick support image/vision analysis — other models silently ignore images

**Related skills**: telnyx-voice-python, telnyx-texml-python, telnyx-numbers-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.ai.assistants.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

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
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```python
assistant = client.ai.assistants.create(
    instructions="You are a helpful assistant.",
    model="meta-llama/Meta-Llama-3.1-8B-Instruct",
    name="my-resource",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get an assistant

Retrieve an AI Assistant configuration by `assistant_id`.

`client.ai.assistants.retrieve()` — `GET /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `call_control_id` | string (UUID) | No |  |
| `fetch_dynamic_variables_from_webhook` | boolean | No |  |
| `from_` | string (E.164) | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
assistant = client.ai.assistants.retrieve(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an assistant

Update an AI Assistant's attributes.

`client.ai.assistants.update()` — `POST /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +15 optional params in [references/api-details.md](references/api-details.md) |

```python
assistant = client.ai.assistants.update(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Assistant Chat (BETA)

This endpoint allows a client to send a chat message to a specific AI Assistant. The assistant processes the message and returns a relevant reply based on the current conversation context.

`client.ai.assistants.chat()` — `POST /ai/assistants/{assistant_id}/chat`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The message content sent by the client to the assistant |
| `conversation_id` | string (UUID) | Yes | A unique identifier for the conversation thread, used to mai... |
| `assistant_id` | string (UUID) | Yes |  |
| `name` | string | No | The optional display name of the user sending the message |

```python
response = client.ai.assistants.chat(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
    content="Tell me a joke about cats",
    conversation_id="42b20469-1215-4a9a-8964-c36f66b406f4",
)
print(response.content)
```

Key response fields: `response.data.content`

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`client.ai.assistants.list()` — `GET /ai/assistants`

```python
assistants_list = client.ai.assistants.list()
print(assistants_list.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Import assistants from external provider

Import assistants from external providers. Any assistant that has already been imported will be overwritten with its latest version from the importing provider.

`client.ai.assistants.imports()` — `POST /ai/assistants/import`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (elevenlabs, vapi, retell) | Yes | The external provider to import assistants from. |
| `api_key_ref` | string | Yes | Integration secret pointer that refers to the API key for th... |
| `import_ids` | array[string] | No | Optional list of assistant IDs to import from the external p... |

```python
assistants_list = client.ai.assistants.imports(
    api_key_ref="my-openai-key",
    provider="elevenlabs",
)
print(assistants_list.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get All Tags

`client.ai.assistants.tags.list()` — `GET /ai/assistants/tags`

```python
tags = client.ai.assistants.tags.list()
print(tags.tags)
```

Key response fields: `response.data.tags`

## List assistant tests with pagination

Retrieves a paginated list of assistant tests with optional filtering capabilities

`client.ai.assistants.tests.list()` — `GET /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_suite` | string | No | Filter tests by test suite name |
| `telnyx_conversation_channel` | string | No | Filter tests by communication channel (e.g., 'web_chat', 'sm... |
| `destination` | string | No | Filter tests by destination (phone number, webhook URL, etc.... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.ai.assistants.tests.list()
page = page.data[0]
print(page.test_id)
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
| `telnyx_conversation_channel` | object | No | The communication channel through which the test will be con... |
| `max_duration_seconds` | integer | No | Maximum duration in seconds that the test conversation shoul... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
assistant_test = client.ai.assistants.tests.create(
    destination="+15551234567",
    instructions="Act as a frustrated customer who received a damaged product. Ask for a refund and escalate if not satisfied with the initial response.",
    name="Customer Support Bot Test",
    rubric=[{
        "criteria": "Assistant responds within 30 seconds",
        "name": "Response Time",
    }, {
        "criteria": "Provides correct product information",
        "name": "Accuracy",
    }],
)
print(assistant_test.test_id)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`client.ai.assistants.tests.test_suites.list()` — `GET /ai/assistants/tests/test-suites`

```python
test_suites = client.ai.assistants.tests.test_suites.list()
print(test_suites.data)
```

Key response fields: `response.data.data`

## Get test suite run history

Retrieves paginated history of test runs for a specific test suite with filtering options

`client.ai.assistants.tests.test_suites.runs.list()` — `GET /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suite_name` | string | Yes |  |
| `test_suite_run_id` | string (UUID) | No | Filter runs by specific suite execution batch ID |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.ai.assistants.tests.test_suites.runs.list(
    suite_name="my-test-suite",
)
page = page.data[0]
print(page.run_id)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`client.ai.assistants.tests.test_suites.runs.trigger()` — `POST /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suite_name` | string | Yes |  |
| `destination_version_id` | string (UUID) | No | Optional assistant version ID to use for all test runs in th... |

```python
test_run_responses = client.ai.assistants.tests.test_suites.runs.trigger(
    suite_name="my-test-suite",
)
print(test_run_responses)
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`client.ai.assistants.tests.retrieve()` — `GET /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |

```python
assistant_test = client.ai.assistants.tests.retrieve(
    "test_id",
)
print(assistant_test.test_id)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Update an assistant test

Updates an existing assistant test configuration with new settings

`client.ai.assistants.tests.update()` — `PUT /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `telnyx_conversation_channel` | enum (phone_call, web_call, sms_chat, web_chat) | No |  |
| `name` | string | No | Updated name for the assistant test. |
| `description` | string | No | Updated description of the test's purpose and evaluation cri... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```python
assistant_test = client.ai.assistants.tests.update(
    test_id="550e8400-e29b-41d4-a716-446655440000",
)
print(assistant_test.test_id)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Delete an assistant test

Permanently removes an assistant test and all associated data

`client.ai.assistants.tests.delete()` — `DELETE /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |

```python
client.ai.assistants.tests.delete(
    "test_id",
)
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`client.ai.assistants.tests.runs.list()` — `GET /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.ai.assistants.tests.runs.list(
    test_id="550e8400-e29b-41d4-a716-446655440000",
)
page = page.data[0]
print(page.run_id)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`client.ai.assistants.tests.runs.trigger()` — `POST /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `destination_version_id` | string (UUID) | No | Optional assistant version ID to use for this test run. |

```python
test_run_response = client.ai.assistants.tests.runs.trigger(
    test_id="550e8400-e29b-41d4-a716-446655440000",
)
print(test_run_response.run_id)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Get specific test run details

Retrieves detailed information about a specific test run execution

`client.ai.assistants.tests.runs.retrieve()` — `GET /ai/assistants/tests/{test_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```python
test_run_response = client.ai.assistants.tests.runs.retrieve(
    run_id="550e8400-e29b-41d4-a716-446655440000",
    test_id="550e8400-e29b-41d4-a716-446655440000",
)
print(test_run_response.run_id)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`client.ai.assistants.delete()` — `DELETE /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```python
assistant = client.ai.assistants.delete(
    "assistant_id",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.deleted, response.data.object`

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant. Retrieves the current canary deploy configuration with all version IDs and their
traffic percentages for the specified assistant.

`client.ai.assistants.canary_deploys.retrieve()` — `GET /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```python
canary_deploy_response = client.ai.assistants.canary_deploys.retrieve(
    "assistant_id",
)
print(canary_deploy_response.assistant_id)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Create Canary Deploy

Endpoint to create a canary deploy configuration for an assistant. Creates a new canary deploy configuration with multiple version IDs and their traffic
percentages for A/B testing or gradual rollouts of assistant versions.

`client.ai.assistants.canary_deploys.create()` — `POST /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistant_id` | string (UUID) | Yes |  |

```python
canary_deploy_response = client.ai.assistants.canary_deploys.create(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
    versions=[{
        "percentage": 1,
        "version_id": "version_id",
    }],
)
print(canary_deploy_response.assistant_id)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant. Updates the existing canary deploy configuration with new version IDs and percentages. All old versions and percentages are replaces by new ones from this request.

`client.ai.assistants.canary_deploys.update()` — `PUT /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistant_id` | string (UUID) | Yes |  |

```python
canary_deploy_response = client.ai.assistants.canary_deploys.update(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
    versions=[{
        "percentage": 1,
        "version_id": "version_id",
    }],
)
print(canary_deploy_response.assistant_id)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant. Removes all canary deploy configurations for the specified assistant.

`client.ai.assistants.canary_deploys.delete()` — `DELETE /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```python
client.ai.assistants.canary_deploys.delete(
    "assistant_id",
)
```

## Assistant Sms Chat

Send an SMS message for an assistant. This endpoint: 
1. Validates the assistant exists and has messaging profile configured 
2.

`client.ai.assistants.send_sms()` — `POST /ai/assistants/{assistant_id}/chat/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_` | string (E.164) | Yes |  |
| `to` | string (E.164) | Yes |  |
| `assistant_id` | string (UUID) | Yes |  |
| `text` | string | No |  |
| `conversation_metadata` | object | No |  |
| `should_create_conversation` | boolean | No |  |

```python
response = client.ai.assistants.send_sms(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
    from_="+18005550101",
    to="+13125550001",
)
print(response.conversation_id)
```

Key response fields: `response.data.conversation_id`

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`client.ai.assistants.clone()` — `POST /ai/assistants/{assistant_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```python
assistant = client.ai.assistants.clone(
    "assistant_id",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List scheduled events

Get scheduled events for an assistant with pagination and filtering

`client.ai.assistants.scheduled_events.list()` — `GET /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `conversation_channel` | enum (phone_call, sms_chat) | No |  |
| `from_date` | string (date-time) | No |  |
| `to_date` | string (date-time) | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.ai.assistants.scheduled_events.list(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
page = page.data[0]
print(page)
```

Key response fields: `response.data.data, response.data.meta`

## Create a scheduled event

Create a scheduled event for an assistant

`client.ai.assistants.scheduled_events.create()` — `POST /ai/assistants/{assistant_id}/scheduled_events`

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

```python
from datetime import datetime

scheduled_event_response = client.ai.assistants.scheduled_events.create(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
    scheduled_at_fixed_datetime=datetime.fromisoformat("2025-04-15T13:07:28.764"),
    telnyx_agent_target="550e8400-e29b-41d4-a716-446655440000",
    telnyx_conversation_channel="phone_call",
    telnyx_end_user_target="+13125550001",
)
print(scheduled_event_response)
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`client.ai.assistants.scheduled_events.retrieve()` — `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```python
scheduled_event_response = client.ai.assistants.scheduled_events.retrieve(
    event_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(scheduled_event_response)
```

## Delete a scheduled event

If the event is pending, this will cancel the event. Otherwise, this will simply remove the record of the event.

`client.ai.assistants.scheduled_events.delete()` — `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```python
client.ai.assistants.scheduled_events.delete(
    event_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
```

## Add Assistant Tag

`client.ai.assistants.tags.add()` — `POST /ai/assistants/{assistant_id}/tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag` | string | Yes |  |
| `assistant_id` | string (UUID) | Yes |  |

```python
response = client.ai.assistants.tags.add(
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
    tag="production",
)
print(response.tags)
```

Key response fields: `response.data.tags`

## Remove Assistant Tag

`client.ai.assistants.tags.remove()` — `DELETE /ai/assistants/{assistant_id}/tags/{tag}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `tag` | string | Yes |  |

```python
tag = client.ai.assistants.tags.remove(
    tag="production",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(tag.tags)
```

Key response fields: `response.data.tags`

## Get assistant texml

Get an assistant texml by `assistant_id`.

`client.ai.assistants.get_texml()` — `GET /ai/assistants/{assistant_id}/texml`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```python
response = client.ai.assistants.get_texml(
    "assistant_id",
)
print(response)
```

## Test Assistant Tool

Test a webhook tool for an assistant

`client.ai.assistants.tools.test()` — `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |
| `arguments` | object | No | Key-value arguments to use for the webhook test |
| `dynamic_variables` | object | No | Key-value dynamic variables to use for the webhook test |

```python
response = client.ai.assistants.tools.test(
    tool_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.content_type, response.data.request, response.data.response`

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`client.ai.assistants.versions.list()` — `GET /ai/assistants/{assistant_id}/versions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```python
assistants_list = client.ai.assistants.versions.list(
    "assistant_id",
)
print(assistants_list.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a specific assistant version

Retrieves a specific version of an assistant by assistant_id and version_id

`client.ai.assistants.versions.retrieve()` — `GET /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |
| `include_mcp_servers` | boolean | No |  |

```python
assistant = client.ai.assistants.versions.retrieve(
    version_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a specific assistant version

Updates the configuration of a specific assistant version. Can not update main version

`client.ai.assistants.versions.update()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +14 optional params in [references/api-details.md](references/api-details.md) |

```python
assistant = client.ai.assistants.versions.update(
    version_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a specific assistant version

Permanently removes a specific version of an assistant. Can not delete main version

`client.ai.assistants.versions.delete()` — `DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |

```python
client.ai.assistants.versions.delete(
    version_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant. This will delete any existing canary deploy configuration and send all live production traffic to this version.

`client.ai.assistants.versions.promote()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |

```python
assistant = client.ai.assistants.versions.promote(
    version_id="550e8400-e29b-41d4-a716-446655440000",
    assistant_id="550e8400-e29b-41d4-a716-446655440000",
)
print(assistant.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List MCP Servers

Retrieve a list of MCP servers.

`client.ai.mcp_servers.list()` — `GET /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type_` | string | No |  |
| `url` | string (URL) | No |  |
| `page[size]` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.ai.mcp_servers.list()
page = page.items[0]
print(page.id)
```

## Create MCP Server

Create a new MCP server.

`client.ai.mcp_servers.create()` — `POST /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `type_` | string | Yes |  |
| `url` | string (URL) | Yes |  |
| `api_key_ref` | string | No |  |
| `allowed_tools` | array[string] | No |  |

```python
mcp_server = client.ai.mcp_servers.create(
    name="my-resource",
    type="type",
    url="https://example.com/resource",
)
print(mcp_server.id)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get MCP Server

Retrieve details for a specific MCP server.

`client.ai.mcp_servers.retrieve()` — `GET /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |

```python
mcp_server = client.ai.mcp_servers.retrieve(
    "mcp_server_id",
)
print(mcp_server.id)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update MCP Server

Update an existing MCP server.

`client.ai.mcp_servers.update()` — `PUT /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |
| `type_` | string | No |  |
| `id` | string (UUID) | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
mcp_server = client.ai.mcp_servers.update(
    mcp_server_id="550e8400-e29b-41d4-a716-446655440000",
)
print(mcp_server.id)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete MCP Server

Delete a specific MCP server.

`client.ai.mcp_servers.delete()` — `DELETE /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |

```python
client.ai.mcp_servers.delete(
    "mcp_server_id",
)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
