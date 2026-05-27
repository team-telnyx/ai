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
| `dynamic_variables_webhook_timeout_ms` | integer |
| `dynamic_variables_webhook_url` | string |
| `enabled_features` | array[object] |
| `external_llm` | object |
| `fallback_config` | object |
| `greeting` | string |
| `id` | string |
| `import_metadata` | object |
| `insight_settings` | object |
| `instructions` | string |
| `integrations` | array[object] |
| `interruption_settings` | object |
| `llm_api_key_ref` | string |
| `mcp_servers` | array[object] |
| `messaging_settings` | object |
| `model` | string |
| `name` | string |
| `observability_settings` | object |
| `post_conversation_settings` | object |
| `privacy_settings` | object |
| `related_mission_ids` | array[string] |
| `tags` | array[string] |
| `telephony_settings` | object |
| `tools` | array[object] |
| `transcription` | object |
| `version_created_at` | date-time |
| `version_id` | string |
| `version_name` | string |
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
| `rules` | array[object] |
| `updated_at` | date-time |

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

### Create an assistant — `client.ai.assistants.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | ID of the model to use when `external_llm` is not set. |
| `tools` | array[object] | Deprecated for new integrations. |
| `mcpServers` | array[object] | MCP servers attached to the assistant. |
| `toolIds` | array[string] | IDs of shared tools to attach to the assistant. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers selected by `m... |
| `externalLlm` | object |  |
| `fallbackConfig` | object |  |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If `dynamic_variables_webhook_url` is set, Telnyx sends a POST request to thi... |
| `dynamicVariablesWebhookTimeoutMs` | integer | Timeout in milliseconds for the dynamic variables webhook. |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |
| `interruptionSettings` | object | Settings for interruptions and how the assistant decides the user has finishe... |
| `integrations` | array[object] | Connected integrations attached to the assistant. |
| `observabilitySettings` | object |  |
| `tags` | array[string] | Tags associated with the assistant. |
| `postConversationSettings` | object | Configuration for post-conversation processing. |

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
| `model` | string | ID of the model to use when `external_llm` is not set. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | Deprecated for new integrations. |
| `mcpServers` | array[object] | MCP servers attached to the assistant. |
| `toolIds` | array[string] | IDs of shared tools to attach to the assistant. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers selected by `m... |
| `externalLlm` | object |  |
| `fallbackConfig` | object |  |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If `dynamic_variables_webhook_url` is set, Telnyx sends a POST request to thi... |
| `dynamicVariablesWebhookTimeoutMs` | integer | Timeout in milliseconds for the dynamic variables webhook. |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |
| `interruptionSettings` | object | Settings for interruptions and how the assistant decides the user has finishe... |
| `integrations` | array[object] | Connected integrations attached to the assistant. |
| `observabilitySettings` | object |  |
| `tags` | array[string] | Tags associated with the assistant. |
| `versionName` | string | Human-readable name for the assistant version. |
| `postConversationSettings` | object | Configuration for post-conversation processing. |
| `promoteToMain` | boolean | Indicates whether the assistant should be promoted to the main version. |

### Create Canary Deploy — `client.ai.assistants.canaryDeploys.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `rules` | array[object] |  |

### Update Canary Deploy — `client.ai.assistants.canaryDeploys.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `rules` | array[object] |  |

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
| `maxRetriesClientErrors` | integer | Configure number of retries on client errors: busy, no-answer, failed, cancel... |
| `retryIntervalSecs` | integer |  |

### Test Assistant Tool — `client.ai.assistants.tools.test()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `arguments` | object | Key-value arguments to use for the webhook test |
| `dynamicVariables` | object | Key-value dynamic variables to use for the webhook test |

### Update a specific assistant version — `client.ai.assistants.versions.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use when `external_llm` is not set. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | Deprecated for new integrations. |
| `mcpServers` | array[object] | MCP servers attached to the assistant. |
| `toolIds` | array[string] | IDs of shared tools to attach to the assistant. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers selected by `m... |
| `externalLlm` | object |  |
| `fallbackConfig` | object |  |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If `dynamic_variables_webhook_url` is set, Telnyx sends a POST request to thi... |
| `dynamicVariablesWebhookTimeoutMs` | integer | Timeout in milliseconds for the dynamic variables webhook. |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |
| `interruptionSettings` | object | Settings for interruptions and how the assistant decides the user has finishe... |
| `integrations` | array[object] | Connected integrations attached to the assistant. |
| `observabilitySettings` | object |  |
| `tags` | array[string] | Tags associated with the assistant. |
| `versionName` | string | Human-readable name for the assistant version. |
| `postConversationSettings` | object | Configuration for post-conversation processing. |

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

### Create Tool — `client.ai.tools.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `function` | object |  |
| `retrieval` | object |  |
| `handoff` | object |  |
| `invite` | object |  |
| `webhook` | object |  |
| `timeoutMs` | integer |  |

### Update Tool — `client.ai.tools.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string |  |
| `displayName` | string |  |
| `function` | object |  |
| `retrieval` | object |  |
| `handoff` | object |  |
| `invite` | object |  |
| `webhook` | object |  |
| `timeoutMs` | integer |  |
