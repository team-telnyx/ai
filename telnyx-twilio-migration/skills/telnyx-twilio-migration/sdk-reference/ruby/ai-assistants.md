<!-- SDK reference: telnyx-ai-assistants-ruby -->

# Telnyx Ai Assistants - Ruby

## Core Workflow

### Prerequisites

1. Create an AI Assistant with instructions (system prompt) and greeting
2. Select language model (e.g., gpt-4o, llama-4-maverick)
3. Configure voice: choose TTS provider (Telnyx, AWS, Azure, ElevenLabs, Inworld) and STT provider
4. For inbound calls: buy a phone number and assign to a Voice API Application or TeXML Application

### Steps

1. **Create assistant**: `client.ai.assistants.create(instructions: ..., model: ...)`
2. **(Optional) Attach knowledge base**: `client.ai.assistants.update(knowledge_base_ids: [...])`
3. **(Optional) Configure tools**: `Webhook tools, transfer, DTMF, handoff, MCP servers`
4. **Assign to phone number**: `Via connection or TeXML app`
5. **Test**: `Call the number or use the portal test feature`

### Common mistakes

- NEVER use free-tier API keys for ElevenLabs or OpenAI providers — requests are rejected
- For multilingual: MUST set STT to openai/whisper-large-v3-turbo — default is English-only
- Only gpt-4o and llama-4-maverick support image/vision analysis — other models silently ignore images

**Related skills**: telnyx-voice-ruby, telnyx-texml-ruby, telnyx-numbers-ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.ai.assistants.create(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

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

```ruby
assistant = client.ai.assistants.create(instructions: "You are a helpful assistant.", model: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "my-resource")

puts(assistant)
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
| `from` | string (E.164) | No |  |
| ... | | | +1 optional params in the API Details section below |

```ruby
assistant = client.ai.assistants.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
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
| ... | | | +15 optional params in the API Details section below |

```ruby
assistant = client.ai.assistants.update("550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
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

```ruby
response = client.ai.assistants.chat(
  "assistant_id",
  content: "Tell me a joke about cats",
  conversation_id: "42b20469-1215-4a9a-8964-c36f66b406f4"
)

puts(response)
```

Key response fields: `response.data.content`

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`client.ai.assistants.list()` — `GET /ai/assistants`

```ruby
assistants_list = client.ai.assistants.list

puts(assistants_list)
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

```ruby
assistants_list = client.ai.assistants.imports(api_key_ref: "my-openai-key", provider: :elevenlabs)

puts(assistants_list)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get All Tags

`client.ai.assistants.tags.list()` — `GET /ai/assistants/tags`

```ruby
tags = client.ai.assistants.tags.list

puts(tags)
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
| ... | | | +1 optional params in the API Details section below |

```ruby
page = client.ai.assistants.tests.list

puts(page)
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
| ... | | | +1 optional params in the API Details section below |

```ruby
assistant_test = client.ai.assistants.tests.create(
  destination: "+15551234567",
  instructions: "Act as a frustrated customer who received a damaged product. Ask for a refund and escalate if not satisfied with the initial response.",
  name: "Customer Support Bot Test",
  rubric: [
    {criteria: "Assistant responds within 30 seconds", name: "Response Time"},
    {criteria: "Provides correct product information", name: "Accuracy"}
  ]
)

puts(assistant_test)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`client.ai.assistants.tests.test_suites.list()` — `GET /ai/assistants/tests/test-suites`

```ruby
test_suites = client.ai.assistants.tests.test_suites.list

puts(test_suites)
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

```ruby
page = client.ai.assistants.tests.test_suites.runs.list("suite_name")

puts(page)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`client.ai.assistants.tests.test_suites.runs.trigger()` — `POST /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suite_name` | string | Yes |  |
| `destination_version_id` | string (UUID) | No | Optional assistant version ID to use for all test runs in th... |

```ruby
test_run_responses = client.ai.assistants.tests.test_suites.runs.trigger("suite_name")

puts(test_run_responses)
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`client.ai.assistants.tests.retrieve()` — `GET /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |

```ruby
assistant_test = client.ai.assistants.tests.retrieve("test_id")

puts(assistant_test)
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
| ... | | | +5 optional params in the API Details section below |

```ruby
assistant_test = client.ai.assistants.tests.update("test_id")

puts(assistant_test)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Delete an assistant test

Permanently removes an assistant test and all associated data

`client.ai.assistants.tests.delete()` — `DELETE /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.assistants.tests.delete("test_id")

puts(result)
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`client.ai.assistants.tests.runs.list()` — `GET /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.ai.assistants.tests.runs.list("test_id")

puts(page)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`client.ai.assistants.tests.runs.trigger()` — `POST /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `destination_version_id` | string (UUID) | No | Optional assistant version ID to use for this test run. |

```ruby
test_run_response = client.ai.assistants.tests.runs.trigger("test_id")

puts(test_run_response)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Get specific test run details

Retrieves detailed information about a specific test run execution

`client.ai.assistants.tests.runs.retrieve()` — `GET /ai/assistants/tests/{test_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
test_run_response = client.ai.assistants.tests.runs.retrieve("run_id", test_id: "550e8400-e29b-41d4-a716-446655440000")

puts(test_run_response)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`client.ai.assistants.delete()` — `DELETE /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```ruby
assistant = client.ai.assistants.delete("550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
```

Key response fields: `response.data.id, response.data.deleted, response.data.object`

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant. Retrieves the current canary deploy configuration with all version IDs and their
traffic percentages for the specified assistant.

`client.ai.assistants.canary_deploys.retrieve()` — `GET /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```ruby
canary_deploy_response = client.ai.assistants.canary_deploys.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(canary_deploy_response)
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

```ruby
canary_deploy_response = client.ai.assistants.canary_deploys.create(
  "assistant_id",
  versions: [{percentage: 1, version_id: "550e8400-e29b-41d4-a716-446655440000"}]
)

puts(canary_deploy_response)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant. Updates the existing canary deploy configuration with new version IDs and percentages. All old versions and percentages are replaces by new ones from this request.

`client.ai.assistants.canary_deploys.update()` — `PUT /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistant_id` | string (UUID) | Yes |  |

```ruby
canary_deploy_response = client.ai.assistants.canary_deploys.update(
  "assistant_id",
  versions: [{percentage: 1, version_id: "550e8400-e29b-41d4-a716-446655440000"}]
)

puts(canary_deploy_response)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant. Removes all canary deploy configurations for the specified assistant.

`client.ai.assistants.canary_deploys.delete()` — `DELETE /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.assistants.canary_deploys.delete("550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## Assistant Sms Chat

Send an SMS message for an assistant. This endpoint: 
1. Validates the assistant exists and has messaging profile configured 
2.

`client.ai.assistants.send_sms()` — `POST /ai/assistants/{assistant_id}/chat/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes |  |
| `to` | string (E.164) | Yes |  |
| `assistant_id` | string (UUID) | Yes |  |
| `text` | string | No |  |
| `conversation_metadata` | object | No |  |
| `should_create_conversation` | boolean | No |  |

```ruby
response = client.ai.assistants.send_sms("assistant_id", from: "+18005550101", to: "+13125550001")

puts(response)
```

Key response fields: `response.data.conversation_id`

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`client.ai.assistants.clone_()` — `POST /ai/assistants/{assistant_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```ruby
assistant = client.ai.assistants.clone_("550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
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
| ... | | | +1 optional params in the API Details section below |

```ruby
page = client.ai.assistants.scheduled_events.list("550e8400-e29b-41d4-a716-446655440000")

puts(page)
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

```ruby
scheduled_event_response = client.ai.assistants.scheduled_events.create(
  "assistant_id",
  scheduled_at_fixed_datetime: "2025-04-15T13:07:28.764Z",
  telnyx_agent_target: "550e8400-e29b-41d4-a716-446655440000",
  telnyx_conversation_channel: :phone_call,
  telnyx_end_user_target: "+13125550001"
)

puts(scheduled_event_response)
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`client.ai.assistants.scheduled_events.retrieve()` — `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```ruby
scheduled_event_response = client.ai.assistants.scheduled_events.retrieve("event_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(scheduled_event_response)
```

## Delete a scheduled event

If the event is pending, this will cancel the event. Otherwise, this will simply remove the record of the event.

`client.ai.assistants.scheduled_events.delete()` — `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.assistants.scheduled_events.delete("event_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## Add Assistant Tag

`client.ai.assistants.tags.add()` — `POST /ai/assistants/{assistant_id}/tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag` | string | Yes |  |
| `assistant_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.assistants.tags.add("assistant_id", tag: "production")

puts(response)
```

Key response fields: `response.data.tags`

## Remove Assistant Tag

`client.ai.assistants.tags.remove()` — `DELETE /ai/assistants/{assistant_id}/tags/{tag}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `tag` | string | Yes |  |

```ruby
tag = client.ai.assistants.tags.remove("tag", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(tag)
```

Key response fields: `response.data.tags`

## Get assistant texml

Get an assistant texml by `assistant_id`.

`client.ai.assistants.get_texml()` — `GET /ai/assistants/{assistant_id}/texml`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.assistants.get_texml("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Test Assistant Tool

Test a webhook tool for an assistant

`client.ai.assistants.tools.test_()` — `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |
| `arguments` | object | No | Key-value arguments to use for the webhook test |
| `dynamic_variables` | object | No | Key-value dynamic variables to use for the webhook test |

```ruby
response = client.ai.assistants.tools.test_("tool_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Key response fields: `response.data.content_type, response.data.request, response.data.response`

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`client.ai.assistants.versions.list()` — `GET /ai/assistants/{assistant_id}/versions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |

```ruby
assistants_list = client.ai.assistants.versions.list("550e8400-e29b-41d4-a716-446655440000")

puts(assistants_list)
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

```ruby
assistant = client.ai.assistants.versions.retrieve("version_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
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
| ... | | | +14 optional params in the API Details section below |

```ruby
assistant = client.ai.assistants.versions.update("version_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a specific assistant version

Permanently removes a specific version of an assistant. Can not delete main version

`client.ai.assistants.versions.delete()` — `DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.assistants.versions.delete("version_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant. This will delete any existing canary deploy configuration and send all live production traffic to this version.

`client.ai.assistants.versions.promote()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes |  |
| `version_id` | string (UUID) | Yes |  |

```ruby
assistant = client.ai.assistants.versions.promote("version_id", assistant_id: "550e8400-e29b-41d4-a716-446655440000")

puts(assistant)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List MCP Servers

Retrieve a list of MCP servers.

`client.ai.mcp_servers.list()` — `GET /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `url` | string (URL) | No |  |
| `page[size]` | integer | No |  |
| ... | | | +1 optional params in the API Details section below |

```ruby
page = client.ai.mcp_servers.list

puts(page)
```

## Create MCP Server

Create a new MCP server.

`client.ai.mcp_servers.create()` — `POST /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `type` | string | Yes |  |
| `url` | string (URL) | Yes |  |
| `api_key_ref` | string | No |  |
| `allowed_tools` | array[string] | No |  |

```ruby
mcp_server = client.ai.mcp_servers.create(name: "my-resource", type: "webhook", url: "https://example.com/resource")

puts(mcp_server)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get MCP Server

Retrieve details for a specific MCP server.

`client.ai.mcp_servers.retrieve()` — `GET /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |

```ruby
mcp_server = client.ai.mcp_servers.retrieve("mcp_server_id")

puts(mcp_server)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update MCP Server

Update an existing MCP server.

`client.ai.mcp_servers.update()` — `PUT /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `id` | string (UUID) | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in the API Details section below |

```ruby
mcp_server = client.ai.mcp_servers.update("mcp_server_id")

puts(mcp_server)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete MCP Server

Delete a specific MCP server.

`client.ai.mcp_servers.delete()` — `DELETE /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcp_server_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.mcp_servers.delete("mcp_server_id")

puts(result)
```

---

# AI Assistants (Ruby) — API Details

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
| `llm_api_key_ref` | string | This is only needed when using third-party inference providers. |
| `voice_settings` | object |  |
| `transcription` | object |  |
| `telephony_settings` | object |  |
| `messaging_settings` | object |  |
| `enabled_features` | array[object] |  |
| `insight_settings` | object |  |
| `privacy_settings` | object |  |
| `dynamic_variables_webhook_url` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamic_variables` | object | Map of dynamic variables and their default values |
| `widget_settings` | object | Configuration settings for the assistant's web widget. |

### Import assistants from external provider — `client.ai.assistants.imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `import_ids` | array[string] | Optional list of assistant IDs to import from the external provider. |

### Create a new assistant test — `client.ai.assistants.tests.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Optional detailed description of what this test evaluates and its purpose. |
| `telnyx_conversation_channel` | object | The communication channel through which the test will be conducted. |
| `max_duration_seconds` | integer | Maximum duration in seconds that the test conversation should run before timi... |
| `test_suite` | string | Optional test suite name to group related tests together. |

### Trigger test suite execution — `client.ai.assistants.tests.test_suites.runs.trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `destination_version_id` | string (UUID) | Optional assistant version ID to use for all test runs in this suite. |

### Update an assistant test — `client.ai.assistants.tests.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Updated name for the assistant test. |
| `description` | string | Updated description of the test's purpose and evaluation criteria. |
| `telnyx_conversation_channel` | enum (phone_call, web_call, sms_chat, web_chat) |  |
| `destination` | string | Updated target destination for test conversations. |
| `max_duration_seconds` | integer | Updated maximum test duration in seconds. |
| `test_suite` | string | Updated test suite assignment for better organization. |
| `instructions` | string | Updated test scenario instructions and objectives. |
| `rubric` | array[object] | Updated evaluation criteria for assessing assistant performance. |

### Trigger a manual test run — `client.ai.assistants.tests.runs.trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `destination_version_id` | string (UUID) | Optional assistant version ID to use for this test run. |

### Update an assistant — `client.ai.assistants.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llm_api_key_ref` | string | This is only needed when using third-party inference providers. |
| `voice_settings` | object |  |
| `transcription` | object |  |
| `telephony_settings` | object |  |
| `messaging_settings` | object |  |
| `enabled_features` | array[object] |  |
| `insight_settings` | object |  |
| `privacy_settings` | object |  |
| `dynamic_variables_webhook_url` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamic_variables` | object | Map of dynamic variables and their default values |
| `widget_settings` | object | Configuration settings for the assistant's web widget. |
| `promote_to_main` | boolean | Indicates whether the assistant should be promoted to the main version. |

### Assistant Chat (BETA) — `client.ai.assistants.chat()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The optional display name of the user sending the message |

### Assistant Sms Chat — `client.ai.assistants.send_sms()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string |  |
| `conversation_metadata` | object |  |
| `should_create_conversation` | boolean |  |

### Create a scheduled event — `client.ai.assistants.scheduled_events.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Required for sms scheduled events. |
| `conversation_metadata` | object | Metadata associated with the conversation. |
| `dynamic_variables` | object | A map of dynamic variable names to values. |

### Test Assistant Tool — `client.ai.assistants.tools.test_()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `arguments` | object | Key-value arguments to use for the webhook test |
| `dynamic_variables` | object | Key-value dynamic variables to use for the webhook test |

### Update a specific assistant version — `client.ai.assistants.versions.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llm_api_key_ref` | string | This is only needed when using third-party inference providers. |
| `voice_settings` | object |  |
| `transcription` | object |  |
| `telephony_settings` | object |  |
| `messaging_settings` | object |  |
| `enabled_features` | array[object] |  |
| `insight_settings` | object |  |
| `privacy_settings` | object |  |
| `dynamic_variables_webhook_url` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamic_variables` | object | Map of dynamic variables and their default values |
| `widget_settings` | object | Configuration settings for the assistant's web widget. |

### Create MCP Server — `client.ai.mcp_servers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `api_key_ref` | string |  |
| `allowed_tools` | array[string] |  |

### Update MCP Server — `client.ai.mcp_servers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `name` | string |  |
| `type` | string |  |
| `url` | string (URL) |  |
| `api_key_ref` | string |  |
| `allowed_tools` | array[string] |  |
| `created_at` | string (date-time) |  |
