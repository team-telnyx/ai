---
name: telnyx-ai-assistants-ruby
description: >-
  Create and manage AI voice assistants with custom personalities, knowledge
  bases, and tool integrations. This skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: ai-assistants
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Assistants - Ruby

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

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`GET /ai/assistants`

```ruby
assistants_list = client.ai.assistants.list

puts(assistants_list)
```

## Create an assistant

Create a new AI Assistant.

`POST /ai/assistants` — Required: `name`, `model`, `instructions`

Optional: `description` (string), `dynamic_variables` (object), `dynamic_variables_webhook_url` (string), `enabled_features` (array[object]), `greeting` (string), `insight_settings` (object), `llm_api_key_ref` (string), `messaging_settings` (object), `privacy_settings` (object), `telephony_settings` (object), `tools` (array[object]), `transcription` (object), `voice_settings` (object), `widget_settings` (object)

```ruby
assistant = client.ai.assistants.create(instructions: "instructions", model: "model", name: "name")

puts(assistant)
```

## Import assistants from external provider

Import assistants from external providers.

`POST /ai/assistants/import` — Required: `provider`, `api_key_ref`

Optional: `import_ids` (array[string])

```ruby
assistants_list = client.ai.assistants.imports(api_key_ref: "api_key_ref", provider: :elevenlabs)

puts(assistants_list)
```

## List assistant tests with pagination

Retrieves a paginated list of assistant tests with optional filtering capabilities

`GET /ai/assistants/tests`

```ruby
page = client.ai.assistants.tests.list

puts(page)
```

## Create a new assistant test

Creates a comprehensive test configuration for evaluating AI assistant performance

`POST /ai/assistants/tests` — Required: `name`, `destination`, `instructions`, `rubric`

Optional: `description` (string), `max_duration_seconds` (integer), `telnyx_conversation_channel` (object), `test_suite` (string)

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

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`GET /ai/assistants/tests/test-suites`

```ruby
test_suites = client.ai.assistants.tests.test_suites.list

puts(test_suites)
```

## Get test suite run history

Retrieves paginated history of test runs for a specific test suite with filtering options

`GET /ai/assistants/tests/test-suites/{suite_name}/runs`

```ruby
page = client.ai.assistants.tests.test_suites.runs.list("suite_name")

puts(page)
```

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`POST /ai/assistants/tests/test-suites/{suite_name}/runs`

Optional: `destination_version_id` (string)

```ruby
test_run_responses = client.ai.assistants.tests.test_suites.runs.trigger("suite_name")

puts(test_run_responses)
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`GET /ai/assistants/tests/{test_id}`

```ruby
assistant_test = client.ai.assistants.tests.retrieve("test_id")

puts(assistant_test)
```

## Update an assistant test

Updates an existing assistant test configuration with new settings

`PUT /ai/assistants/tests/{test_id}`

Optional: `description` (string), `destination` (string), `instructions` (string), `max_duration_seconds` (integer), `name` (string), `rubric` (array[object]), `telnyx_conversation_channel` (enum), `test_suite` (string)

```ruby
assistant_test = client.ai.assistants.tests.update("test_id")

puts(assistant_test)
```

## Delete an assistant test

Permanently removes an assistant test and all associated data

`DELETE /ai/assistants/tests/{test_id}`

```ruby
result = client.ai.assistants.tests.delete("test_id")

puts(result)
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`GET /ai/assistants/tests/{test_id}/runs`

```ruby
page = client.ai.assistants.tests.runs.list("test_id")

puts(page)
```

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`POST /ai/assistants/tests/{test_id}/runs`

Optional: `destination_version_id` (string)

```ruby
test_run_response = client.ai.assistants.tests.runs.trigger("test_id")

puts(test_run_response)
```

## Get specific test run details

Retrieves detailed information about a specific test run execution

`GET /ai/assistants/tests/{test_id}/runs/{run_id}`

```ruby
test_run_response = client.ai.assistants.tests.runs.retrieve("run_id", test_id: "test_id")

puts(test_run_response)
```

## Get an assistant

Retrieve an AI Assistant configuration by `assistant_id`.

`GET /ai/assistants/{assistant_id}`

```ruby
assistant = client.ai.assistants.retrieve("assistant_id")

puts(assistant)
```

## Update an assistant

Update an AI Assistant's attributes.

`POST /ai/assistants/{assistant_id}`

```ruby
assistant = client.ai.assistants.update("assistant_id")

puts(assistant)
```

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`DELETE /ai/assistants/{assistant_id}`

```ruby
assistant = client.ai.assistants.delete("assistant_id")

puts(assistant)
```

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant.

`GET /ai/assistants/{assistant_id}/canary-deploys`

```ruby
canary_deploy_response = client.ai.assistants.canary_deploys.retrieve("assistant_id")

puts(canary_deploy_response)
```

## Create Canary Deploy

Endpoint to create a canary deploy configuration for an assistant.

`POST /ai/assistants/{assistant_id}/canary-deploys` — Required: `versions`

```ruby
canary_deploy_response = client.ai.assistants.canary_deploys.create(
  "assistant_id",
  versions: [{percentage: 1, version_id: "version_id"}]
)

puts(canary_deploy_response)
```

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant.

`PUT /ai/assistants/{assistant_id}/canary-deploys` — Required: `versions`

```ruby
canary_deploy_response = client.ai.assistants.canary_deploys.update(
  "assistant_id",
  versions: [{percentage: 1, version_id: "version_id"}]
)

puts(canary_deploy_response)
```

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant.

`DELETE /ai/assistants/{assistant_id}/canary-deploys`

```ruby
result = client.ai.assistants.canary_deploys.delete("assistant_id")

puts(result)
```

## Assistant Chat (BETA)

This endpoint allows a client to send a chat message to a specific AI Assistant.

`POST /ai/assistants/{assistant_id}/chat` — Required: `content`, `conversation_id`

Optional: `name` (string)

```ruby
response = client.ai.assistants.chat(
  "assistant_id",
  content: "Tell me a joke about cats",
  conversation_id: "42b20469-1215-4a9a-8964-c36f66b406f4"
)

puts(response)
```

## Assistant Sms Chat

Send an SMS message for an assistant.

`POST /ai/assistants/{assistant_id}/chat/sms` — Required: `from`, `to`

Optional: `conversation_metadata` (object), `should_create_conversation` (boolean), `text` (string)

```ruby
response = client.ai.assistants.send_sms("assistant_id", from: "from", to: "to")

puts(response)
```

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`POST /ai/assistants/{assistant_id}/clone`

```ruby
assistant = client.ai.assistants.clone_("assistant_id")

puts(assistant)
```

## List scheduled events

Get scheduled events for an assistant with pagination and filtering

`GET /ai/assistants/{assistant_id}/scheduled_events`

```ruby
page = client.ai.assistants.scheduled_events.list("assistant_id")

puts(page)
```

## Create a scheduled event

Create a scheduled event for an assistant

`POST /ai/assistants/{assistant_id}/scheduled_events` — Required: `telnyx_conversation_channel`, `telnyx_end_user_target`, `telnyx_agent_target`, `scheduled_at_fixed_datetime`

Optional: `conversation_metadata` (object), `dynamic_variables` (object), `text` (string)

```ruby
scheduled_event_response = client.ai.assistants.scheduled_events.create(
  "assistant_id",
  scheduled_at_fixed_datetime: "2025-04-15T13:07:28.764Z",
  telnyx_agent_target: "telnyx_agent_target",
  telnyx_conversation_channel: :phone_call,
  telnyx_end_user_target: "telnyx_end_user_target"
)

puts(scheduled_event_response)
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

```ruby
scheduled_event_response = client.ai.assistants.scheduled_events.retrieve("event_id", assistant_id: "assistant_id")

puts(scheduled_event_response)
```

## Delete a scheduled event

If the event is pending, this will cancel the event.

`DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

```ruby
result = client.ai.assistants.scheduled_events.delete("event_id", assistant_id: "assistant_id")

puts(result)
```

## Get assistant texml

Get an assistant texml by `assistant_id`.

`GET /ai/assistants/{assistant_id}/texml`

```ruby
response = client.ai.assistants.get_texml("assistant_id")

puts(response)
```

## Test Assistant Tool

Test a webhook tool for an assistant

`POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

Optional: `arguments` (object), `dynamic_variables` (object)

```ruby
response = client.ai.assistants.tools.test_("tool_id", assistant_id: "assistant_id")

puts(response)
```

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`GET /ai/assistants/{assistant_id}/versions`

```ruby
assistants_list = client.ai.assistants.versions.list("assistant_id")

puts(assistants_list)
```

## Get a specific assistant version

Retrieves a specific version of an assistant by assistant_id and version_id

`GET /ai/assistants/{assistant_id}/versions/{version_id}`

```ruby
assistant = client.ai.assistants.versions.retrieve("version_id", assistant_id: "assistant_id")

puts(assistant)
```

## Update a specific assistant version

Updates the configuration of a specific assistant version.

`POST /ai/assistants/{assistant_id}/versions/{version_id}`

Optional: `description` (string), `dynamic_variables` (object), `dynamic_variables_webhook_url` (string), `enabled_features` (array[object]), `greeting` (string), `insight_settings` (object), `instructions` (string), `llm_api_key_ref` (string), `messaging_settings` (object), `model` (string), `name` (string), `privacy_settings` (object), `telephony_settings` (object), `tools` (array[object]), `transcription` (object), `voice_settings` (object), `widget_settings` (object)

```ruby
assistant = client.ai.assistants.versions.update("version_id", assistant_id: "assistant_id")

puts(assistant)
```

## Delete a specific assistant version

Permanently removes a specific version of an assistant.

`DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

```ruby
result = client.ai.assistants.versions.delete("version_id", assistant_id: "assistant_id")

puts(result)
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant.

`POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

```ruby
assistant = client.ai.assistants.versions.promote("version_id", assistant_id: "assistant_id")

puts(assistant)
```

## List MCP Servers

Retrieve a list of MCP servers.

`GET /ai/mcp_servers`

```ruby
page = client.ai.mcp_servers.list

puts(page)
```

## Create MCP Server

Create a new MCP server.

`POST /ai/mcp_servers` — Required: `name`, `type`, `url`

Optional: `allowed_tools` (['array', 'null']), `api_key_ref` (['string', 'null'])

```ruby
mcp_server = client.ai.mcp_servers.create(name: "name", type: "type", url: "url")

puts(mcp_server)
```

## Get MCP Server

Retrieve details for a specific MCP server.

`GET /ai/mcp_servers/{mcp_server_id}`

```ruby
mcp_server = client.ai.mcp_servers.retrieve("mcp_server_id")

puts(mcp_server)
```

## Update MCP Server

Update an existing MCP server.

`PUT /ai/mcp_servers/{mcp_server_id}`

Optional: `allowed_tools` (['array', 'null']), `api_key_ref` (['string', 'null']), `created_at` (date-time), `id` (string), `name` (string), `type` (string), `url` (string)

```ruby
mcp_server = client.ai.mcp_servers.update("mcp_server_id")

puts(mcp_server)
```

## Delete MCP Server

Delete a specific MCP server.

`DELETE /ai/mcp_servers/{mcp_server_id}`

```ruby
result = client.ai.mcp_servers.delete("mcp_server_id")

puts(result)
```
