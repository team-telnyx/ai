# AI Assistants — API Details

## Table of Contents

- [Response Schemas](#response-schemas)

## Response Schemas

**Returned by:** List assistants, Create an assistant, Import assistants from external provider, Get an assistant, Update an assistant, Clone Assistant, Get all versions of an assistant, Get a specific assistant version, Update a specific assistant version, Promote an assistant version to main

| Field | Type |
|-------|------|
| `conversation_flow` | object |
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
