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
