# AI Assistants (Go) — API Details

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

**Returned by:** List Tools, Create Tool, Get Tool, Update Tool

| Field | Type |
|-------|------|
| `created_at` | string |
| `display_name` | string |
| `id` | string |
| `timeout_ms` | integer |
| `tool_definition` | object |
| `type` | string |

## Optional Parameters

### Create an assistant — `client.AI.Assistants.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Tools` | array[object] | The tools that the assistant can use. |
| `ToolIds` | array[string] |  |
| `Description` | string |  |
| `Greeting` | string | Text that the assistant will use to start the conversation. |
| `LlmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `VoiceSettings` | object |  |
| `Transcription` | object |  |
| `TelephonySettings` | object |  |
| `MessagingSettings` | object |  |
| `EnabledFeatures` | array[object] |  |
| `InsightSettings` | object |  |
| `PrivacySettings` | object |  |
| `DynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `DynamicVariables` | object | Map of dynamic variables and their default values |
| `WidgetSettings` | object | Configuration settings for the assistant's web widget. |

### Import assistants from external provider — `client.AI.Assistants.Imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ImportIds` | array[string] | Optional list of assistant IDs to import from the external provider. |

### Create a new assistant test — `client.AI.Assistants.Tests.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Description` | string | Optional detailed description of what this test evaluates and its purpose. |
| `TelnyxConversationChannel` | object | The communication channel through which the test will be conducted. |
| `MaxDurationSeconds` | integer | Maximum duration in seconds that the test conversation should run before timi... |
| `TestSuite` | string | Optional test suite name to group related tests together. |

### Trigger test suite execution — `client.AI.Assistants.Tests.TestSuites.Runs.Trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `DestinationVersionId` | string (UUID) | Optional assistant version ID to use for all test runs in this suite. |

### Update an assistant test — `client.AI.Assistants.Tests.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string | Updated name for the assistant test. |
| `Description` | string | Updated description of the test's purpose and evaluation criteria. |
| `TelnyxConversationChannel` | enum (phone_call, web_call, sms_chat, web_chat) |  |
| `Destination` | string | Updated target destination for test conversations. |
| `MaxDurationSeconds` | integer | Updated maximum test duration in seconds. |
| `TestSuite` | string | Updated test suite assignment for better organization. |
| `Instructions` | string | Updated test scenario instructions and objectives. |
| `Rubric` | array[object] | Updated evaluation criteria for assessing assistant performance. |

### Trigger a manual test run — `client.AI.Assistants.Tests.Runs.Trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `DestinationVersionId` | string (UUID) | Optional assistant version ID to use for this test run. |

### Update an assistant — `client.AI.Assistants.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Model` | string | ID of the model to use. |
| `Instructions` | string | System instructions for the assistant. |
| `Tools` | array[object] | The tools that the assistant can use. |
| `ToolIds` | array[string] |  |
| `Description` | string |  |
| `Greeting` | string | Text that the assistant will use to start the conversation. |
| `LlmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `VoiceSettings` | object |  |
| `Transcription` | object |  |
| `TelephonySettings` | object |  |
| `MessagingSettings` | object |  |
| `EnabledFeatures` | array[object] |  |
| `InsightSettings` | object |  |
| `PrivacySettings` | object |  |
| `DynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `DynamicVariables` | object | Map of dynamic variables and their default values |
| `WidgetSettings` | object | Configuration settings for the assistant's web widget. |
| `PromoteToMain` | boolean | Indicates whether the assistant should be promoted to the main version. |

### Assistant Chat (BETA) — `client.AI.Assistants.Chat()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string | The optional display name of the user sending the message |

### Assistant Sms Chat — `client.AI.Assistants.SendSMS()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Text` | string |  |
| `ConversationMetadata` | object |  |
| `ShouldCreateConversation` | boolean |  |

### Create a scheduled event — `client.AI.Assistants.ScheduledEvents.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Text` | string | Required for sms scheduled events. |
| `ConversationMetadata` | object | Metadata associated with the conversation. |
| `DynamicVariables` | object | A map of dynamic variable names to values. |

### Test Assistant Tool — `client.AI.Assistants.Tools.Test()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Arguments` | object | Key-value arguments to use for the webhook test |
| `DynamicVariables` | object | Key-value dynamic variables to use for the webhook test |

### Update a specific assistant version — `client.AI.Assistants.Versions.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Model` | string | ID of the model to use. |
| `Instructions` | string | System instructions for the assistant. |
| `Tools` | array[object] | The tools that the assistant can use. |
| `ToolIds` | array[string] |  |
| `Description` | string |  |
| `Greeting` | string | Text that the assistant will use to start the conversation. |
| `LlmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `VoiceSettings` | object |  |
| `Transcription` | object |  |
| `TelephonySettings` | object |  |
| `MessagingSettings` | object |  |
| `EnabledFeatures` | array[object] |  |
| `InsightSettings` | object |  |
| `PrivacySettings` | object |  |
| `DynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `DynamicVariables` | object | Map of dynamic variables and their default values |
| `WidgetSettings` | object | Configuration settings for the assistant's web widget. |

### Create MCP Server — `client.AI.McpServers.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ApiKeyRef` | string |  |
| `AllowedTools` | array[string] |  |

### Update MCP Server — `client.AI.McpServers.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) |  |
| `Name` | string |  |
| `Type` | string |  |
| `Url` | string (URL) |  |
| `ApiKeyRef` | string |  |
| `AllowedTools` | array[string] |  |
| `CreatedAt` | string (date-time) |  |

### Create Tool — `client.AI.Tools.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Function` | object |  |
| `Retrieval` | object |  |
| `Handoff` | object |  |
| `Invite` | object |  |
| `Webhook` | object |  |
| `TimeoutMs` | integer |  |

### Update Tool — `client.AI.Tools.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | string |  |
| `DisplayName` | string |  |
| `Function` | object |  |
| `Retrieval` | object |  |
| `Handoff` | object |  |
| `Invite` | object |  |
| `Webhook` | object |  |
| `TimeoutMs` | integer |  |
