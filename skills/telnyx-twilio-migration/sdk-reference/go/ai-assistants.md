<!-- SDK reference: telnyx-ai-assistants-go -->

# Telnyx AI Assistants - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

assistant, err := client.AI.Assistants.New(context.Background(), telnyx.AIAssistantNewParams{
		Instructions: "You are a helpful assistant.",
		Name: "my-resource",
		Model: "openai/gpt-4o",
	})
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

## Reference Use Rules

Do not invent Telnyx parameters, enums, response fields, or webhook fields.

- If the parameter, enum, or response field you need is not shown inline in this skill, read the API Details section below before writing code.
- Before using any operation in `## Additional Operations`, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas).

## Core Tasks

### Create an assistant

Assistant creation is the entrypoint for any AI assistant integration. Agents need the exact creation method and the top-level fields returned by the SDK.

`client.AI.Assistants.New()` — `POST /ai/assistants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes |  |
| `Instructions` | string | Yes | System instructions for the assistant. |
| `Tags` | array[string] | No | Tags associated with the assistant. |
| `Model` | string | No | ID of the model to use when `external_llm` is not set. |
| `Tools` | array[object] | No | Deprecated for new integrations. |
| ... | | | +22 optional params in the API Details section below |

```go
	assistant, err := client.AI.Assistants.New(context.Background(), telnyx.AIAssistantNewParams{
		Instructions: "You are a helpful assistant.",
		Name: "my-resource",
		Model: "openai/gpt-4o",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Primary response fields:
- `assistant.ID`
- `assistant.Name`
- `assistant.Model`
- `assistant.Instructions`
- `assistant.CreatedAt`
- `assistant.Description`

### Chat with an assistant

Chat is the primary runtime path. Agents need the exact assistant method and the response content field.

`client.AI.Assistants.Chat()` — `POST /ai/assistants/{assistant_id}/chat`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Content` | string | Yes | The message content sent by the client to the assistant |
| `ConversationId` | string (UUID) | Yes | A unique identifier for the conversation thread, used to mai... |
| `AssistantId` | string (UUID) | Yes |  |
| `Name` | string | No | The optional display name of the user sending the message |

```go
	response, err := client.AI.Assistants.Chat(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantChatParams{
			Content:        "Tell me a joke about cats",
			ConversationID: "42b20469-1215-4a9a-8964-c36f66b406f4",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Content)
```

Primary response fields:
- `response.Content`

### Create an assistant test

Test creation is the main validation path for production assistant behavior before deployment.

`client.AI.Assistants.Tests.New()` — `POST /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A descriptive name for the assistant test. |
| `Destination` | string | Yes | The target destination for the test conversation. |
| `Instructions` | string | Yes | Detailed instructions that define the test scenario and what... |
| `Rubric` | array[object] | Yes | Evaluation criteria used to assess the assistant's performan... |
| `Description` | string | No | Optional detailed description of what this test evaluates an... |
| `TelnyxConversationChannel` | object | No | The communication channel through which the test will be con... |
| `MaxDurationSeconds` | integer | No | Maximum duration in seconds that the test conversation shoul... |
| ... | | | +1 optional params in the API Details section below |

```go
	assistantTest, err := client.AI.Assistants.Tests.New(context.Background(), telnyx.AIAssistantTestNewParams{
		Destination:  "+15551234567",
		Instructions: "Act as a frustrated customer who received a damaged product. Ask for a refund and escalate if not satisfied with the initial response.",
		Name:         "Customer Support Bot Test",
		Rubric: []telnyx.AIAssistantTestNewParamsRubric{{
			Criteria: "Assistant responds within 30 seconds",
			Name:     "Response Time",
		}, {
			Criteria: "Provides correct product information",
			Name:     "Accuracy",
		}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantTest.TestID)
```

Primary response fields:
- `assistantTest.TestID`
- `assistantTest.Name`
- `assistantTest.Destination`
- `assistantTest.CreatedAt`
- `assistantTest.Instructions`
- `assistantTest.Description`

---

## Important Supporting Operations

Use these when the core tasks above are close to your flow, but you need a common variation or follow-up step.

### Get an assistant

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.AI.Assistants.Get()` — `GET /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `CallControlId` | string (UUID) | No |  |
| `FetchDynamicVariablesFromWebhook` | boolean | No |  |
| `From` | string (E.164) | No |  |
| ... | | | +1 optional params in the API Details section below |

```go
	assistant, err := client.AI.Assistants.Get(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Primary response fields:
- `assistant.ID`
- `assistant.Name`
- `assistant.CreatedAt`
- `assistant.Description`
- `assistant.DynamicVariables`
- `assistant.DynamicVariablesWebhookTimeoutMs`

### Update an assistant

Create or provision an additional resource when the core tasks do not cover this flow.

`client.AI.Assistants.Update()` — `POST /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `Tags` | array[string] | No | Tags associated with the assistant. |
| `Name` | string | No |  |
| `Model` | string | No | ID of the model to use when `external_llm` is not set. |
| ... | | | +26 optional params in the API Details section below |

```go
	assistant, err := client.AI.Assistants.Update(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Primary response fields:
- `assistant.ID`
- `assistant.Name`
- `assistant.CreatedAt`
- `assistant.Description`
- `assistant.DynamicVariables`
- `assistant.DynamicVariablesWebhookTimeoutMs`

### List assistants

Inspect available resources or choose an existing resource before mutating it.

`client.AI.Assistants.List()` — `GET /ai/assistants`

```go
	assistantsList, err := client.AI.Assistants.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantsList.Data)
```

Response wrapper:
- items: `assistantsList.data`

Primary item fields:
- `ID`
- `Name`
- `CreatedAt`
- `Description`
- `DynamicVariables`
- `DynamicVariablesWebhookTimeoutMs`

### Import assistants from external provider

Import existing assistants from an external provider instead of creating from scratch.

`client.AI.Assistants.Imports()` — `POST /ai/assistants/import`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Provider` | enum (elevenlabs, vapi, retell) | Yes | The external provider to import assistants from. |
| `ApiKeyRef` | string | Yes | Integration secret pointer that refers to the API key for th... |
| `ImportIds` | array[string] | No | Optional list of assistant IDs to import from the external p... |

```go
	assistantsList, err := client.AI.Assistants.Imports(context.Background(), telnyx.AIAssistantImportsParams{
		APIKeyRef: "my-openai-key",
		Provider:  telnyx.AIAssistantImportsParamsProviderElevenlabs,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantsList.Data)
```

Response wrapper:
- items: `assistantsList.data`

Primary item fields:
- `ID`
- `Name`
- `CreatedAt`
- `Description`
- `DynamicVariables`
- `DynamicVariablesWebhookTimeoutMs`

### Get All Tags

Inspect available resources or choose an existing resource before mutating it.

`client.AI.Assistants.Tags.List()` — `GET /ai/assistants/tags`

```go
	tags, err := client.AI.Assistants.Tags.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", tags.Tags)
```

Primary response fields:
- `tags.Tags`

### List assistant tests with pagination

Inspect available resources or choose an existing resource before mutating it.

`client.AI.Assistants.Tests.List()` — `GET /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestSuite` | string | No | Filter tests by test suite name |
| `TelnyxConversationChannel` | string | No | Filter tests by communication channel (e.g., 'web_chat', 'sm... |
| `Destination` | string | No | Filter tests by destination (phone number, webhook URL, etc.... |
| ... | | | +1 optional params in the API Details section below |

```go
	page, err := client.AI.Assistants.Tests.List(context.Background(), telnyx.AIAssistantTestListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `Name`
- `CreatedAt`
- `Description`
- `Destination`
- `Instructions`
- `MaxDurationSeconds`

### Get all test suite names

Inspect available resources or choose an existing resource before mutating it.

`client.AI.Assistants.Tests.TestSuites.List()` — `GET /ai/assistants/tests/test-suites`

```go
	testSuites, err := client.AI.Assistants.Tests.TestSuites.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", testSuites.Data)
```

Response wrapper:
- items: `testSuites.data`

Primary item fields:
- `Data`

### Get test suite run history

Fetch the current state before updating, deleting, or making control-flow decisions.

`client.AI.Assistants.Tests.TestSuites.Runs.List()` — `GET /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SuiteName` | string | Yes |  |
| `TestSuiteRunId` | string (UUID) | No | Filter runs by specific suite execution batch ID |
| `Status` | string | No | Filter runs by execution status (pending, running, completed... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AI.Assistants.Tests.TestSuites.Runs.List(
		context.Background(),
		"suite_name",
		telnyx.AIAssistantTestTestSuiteRunListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Response wrapper:
- items: `page.data`
- pagination: `page.meta`

Primary item fields:
- `Status`
- `CreatedAt`
- `UpdatedAt`
- `CompletedAt`
- `ConversationID`
- `ConversationInsightsID`

---

## Additional Operations

Use the core tasks above first. The operations below are indexed here with exact SDK methods and required params; use the API Details section below for full optional params, response schemas, and lower-frequency webhook payloads.
Before using any operation below, read [the optional-parameters section](#optional-parameters) and [the response-schemas section](#response-schemas) so you do not guess missing fields.

| Operation | SDK method | Endpoint | Use when | Required params |
|-----------|------------|----------|----------|-----------------|
| Trigger test suite execution | `client.AI.Assistants.Tests.TestSuites.Runs.Trigger()` | `POST /ai/assistants/tests/test-suites/{suite_name}/runs` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `SuiteName` |
| Get assistant test by ID | `client.AI.Assistants.Tests.Get()` | `GET /ai/assistants/tests/{test_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `TestId` |
| Update an assistant test | `client.AI.Assistants.Tests.Update()` | `PUT /ai/assistants/tests/{test_id}` | Modify an existing resource without recreating it. | `TestId` |
| Delete an assistant test | `client.AI.Assistants.Tests.Delete()` | `DELETE /ai/assistants/tests/{test_id}` | Remove, detach, or clean up an existing resource. | `TestId` |
| Get test run history for a specific test | `client.AI.Assistants.Tests.Runs.List()` | `GET /ai/assistants/tests/{test_id}/runs` | Fetch the current state before updating, deleting, or making control-flow decisions. | `TestId` |
| Trigger a manual test run | `client.AI.Assistants.Tests.Runs.Trigger()` | `POST /ai/assistants/tests/{test_id}/runs` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `TestId` |
| Get specific test run details | `client.AI.Assistants.Tests.Runs.Get()` | `GET /ai/assistants/tests/{test_id}/runs/{run_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `TestId`, `RunId` |
| Delete an assistant | `client.AI.Assistants.Delete()` | `DELETE /ai/assistants/{assistant_id}` | Remove, detach, or clean up an existing resource. | `AssistantId` |
| Get Canary Deploy | `client.AI.Assistants.CanaryDeploys.Get()` | `GET /ai/assistants/{assistant_id}/canary-deploys` | Fetch the current state before updating, deleting, or making control-flow decisions. | `AssistantId` |
| Create Canary Deploy | `client.AI.Assistants.CanaryDeploys.New()` | `POST /ai/assistants/{assistant_id}/canary-deploys` | Create or provision an additional resource when the core tasks do not cover this flow. | `AssistantId` |
| Update Canary Deploy | `client.AI.Assistants.CanaryDeploys.Update()` | `PUT /ai/assistants/{assistant_id}/canary-deploys` | Modify an existing resource without recreating it. | `AssistantId` |
| Delete Canary Deploy | `client.AI.Assistants.CanaryDeploys.Delete()` | `DELETE /ai/assistants/{assistant_id}/canary-deploys` | Remove, detach, or clean up an existing resource. | `AssistantId` |
| Assistant Sms Chat | `client.AI.Assistants.SendSMS()` | `POST /ai/assistants/{assistant_id}/chat/sms` | Run assistant chat over SMS instead of direct API chat. | `From`, `To`, `AssistantId` |
| Clone Assistant | `client.AI.Assistants.Clone()` | `POST /ai/assistants/{assistant_id}/clone` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `AssistantId` |
| List scheduled events | `client.AI.Assistants.ScheduledEvents.List()` | `GET /ai/assistants/{assistant_id}/scheduled_events` | Fetch the current state before updating, deleting, or making control-flow decisions. | `AssistantId` |
| Create a scheduled event | `client.AI.Assistants.ScheduledEvents.New()` | `POST /ai/assistants/{assistant_id}/scheduled_events` | Create or provision an additional resource when the core tasks do not cover this flow. | `TelnyxConversationChannel`, `TelnyxEndUserTarget`, `TelnyxAgentTarget`, `ScheduledAtFixedDatetime`, +1 more |
| Get a scheduled event | `client.AI.Assistants.ScheduledEvents.Get()` | `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `AssistantId`, `EventId` |
| Delete a scheduled event | `client.AI.Assistants.ScheduledEvents.Delete()` | `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}` | Remove, detach, or clean up an existing resource. | `AssistantId`, `EventId` |
| Add Assistant Tag | `client.AI.Assistants.Tags.Add()` | `POST /ai/assistants/{assistant_id}/tags` | Create or provision an additional resource when the core tasks do not cover this flow. | `Tag`, `AssistantId` |
| Remove Assistant Tag | `client.AI.Assistants.Tags.Remove()` | `DELETE /ai/assistants/{assistant_id}/tags/{tag}` | Remove, detach, or clean up an existing resource. | `AssistantId`, `Tag` |
| Get assistant texml | `client.AI.Assistants.GetTexml()` | `GET /ai/assistants/{assistant_id}/texml` | Fetch the current state before updating, deleting, or making control-flow decisions. | `AssistantId` |
| Add Assistant Tool | `client.AI.Assistants.Tools.Add()` | `PUT /ai/assistants/{assistant_id}/tools/{tool_id}` | Modify an existing resource without recreating it. | `AssistantId`, `ToolId` |
| Remove Assistant Tool | `client.AI.Assistants.Tools.Remove()` | `DELETE /ai/assistants/{assistant_id}/tools/{tool_id}` | Remove, detach, or clean up an existing resource. | `AssistantId`, `ToolId` |
| Test Assistant Tool | `client.AI.Assistants.Tools.Test()` | `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `AssistantId`, `ToolId` |
| Get all versions of an assistant | `client.AI.Assistants.Versions.List()` | `GET /ai/assistants/{assistant_id}/versions` | Fetch the current state before updating, deleting, or making control-flow decisions. | `AssistantId` |
| Get a specific assistant version | `client.AI.Assistants.Versions.Get()` | `GET /ai/assistants/{assistant_id}/versions/{version_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `AssistantId`, `VersionId` |
| Update a specific assistant version | `client.AI.Assistants.Versions.Update()` | `POST /ai/assistants/{assistant_id}/versions/{version_id}` | Create or provision an additional resource when the core tasks do not cover this flow. | `AssistantId`, `VersionId` |
| Delete a specific assistant version | `client.AI.Assistants.Versions.Delete()` | `DELETE /ai/assistants/{assistant_id}/versions/{version_id}` | Remove, detach, or clean up an existing resource. | `AssistantId`, `VersionId` |
| Promote an assistant version to main | `client.AI.Assistants.Versions.Promote()` | `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote` | Trigger a follow-up action in an existing workflow rather than creating a new top-level resource. | `AssistantId`, `VersionId` |
| List MCP Servers | `client.AI.McpServers.List()` | `GET /ai/mcp_servers` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create MCP Server | `client.AI.McpServers.New()` | `POST /ai/mcp_servers` | Create or provision an additional resource when the core tasks do not cover this flow. | `Name`, `Type`, `Url` |
| Get MCP Server | `client.AI.McpServers.Get()` | `GET /ai/mcp_servers/{mcp_server_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `McpServerId` |
| Update MCP Server | `client.AI.McpServers.Update()` | `PUT /ai/mcp_servers/{mcp_server_id}` | Modify an existing resource without recreating it. | `McpServerId` |
| Delete MCP Server | `client.AI.McpServers.Delete()` | `DELETE /ai/mcp_servers/{mcp_server_id}` | Remove, detach, or clean up an existing resource. | `McpServerId` |
| List Tools | `client.AI.Tools.List()` | `GET /ai/tools` | Inspect available resources or choose an existing resource before mutating it. | None |
| Create Tool | `client.AI.Tools.New()` | `POST /ai/tools` | Create or provision an additional resource when the core tasks do not cover this flow. | `Type`, `DisplayName` |
| Get Tool | `client.AI.Tools.Get()` | `GET /ai/tools/{tool_id}` | Fetch the current state before updating, deleting, or making control-flow decisions. | `ToolId` |
| Update Tool | `client.AI.Tools.Update()` | `PATCH /ai/tools/{tool_id}` | Modify an existing resource without recreating it. | `ToolId` |
| Delete Tool | `client.AI.Tools.Delete()` | `DELETE /ai/tools/{tool_id}` | Remove, detach, or clean up an existing resource. | `ToolId` |

---

For exhaustive optional parameters, full response schemas, and complete webhook payloads, see the API Details section below.
---

# AI Assistants (Go) — API Details

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

### Create an assistant — `client.AI.Assistants.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Model` | string | ID of the model to use when `external_llm` is not set. |
| `Tools` | array[object] | Deprecated for new integrations. |
| `McpServers` | array[object] | MCP servers attached to the assistant. |
| `ToolIds` | array[string] | IDs of shared tools to attach to the assistant. |
| `Description` | string |  |
| `Greeting` | string | Text that the assistant will use to start the conversation. |
| `LlmApiKeyRef` | string | This is only needed when using third-party inference providers selected by `m... |
| `ExternalLlm` | object |  |
| `FallbackConfig` | object |  |
| `VoiceSettings` | object |  |
| `Transcription` | object |  |
| `TelephonySettings` | object |  |
| `MessagingSettings` | object |  |
| `EnabledFeatures` | array[object] |  |
| `InsightSettings` | object |  |
| `PrivacySettings` | object |  |
| `DynamicVariablesWebhookUrl` | string (URL) | If `dynamic_variables_webhook_url` is set, Telnyx sends a POST request to thi... |
| `DynamicVariablesWebhookTimeoutMs` | integer | Timeout in milliseconds for the dynamic variables webhook. |
| `DynamicVariables` | object | Map of dynamic variables and their default values |
| `WidgetSettings` | object | Configuration settings for the assistant's web widget. |
| `InterruptionSettings` | object | Settings for interruptions and how the assistant decides the user has finishe... |
| `Integrations` | array[object] | Connected integrations attached to the assistant. |
| `ObservabilitySettings` | object |  |
| `Tags` | array[string] | Tags associated with the assistant. |
| `PostConversationSettings` | object | Configuration for post-conversation processing. |

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
| `Model` | string | ID of the model to use when `external_llm` is not set. |
| `Instructions` | string | System instructions for the assistant. |
| `Tools` | array[object] | Deprecated for new integrations. |
| `McpServers` | array[object] | MCP servers attached to the assistant. |
| `ToolIds` | array[string] | IDs of shared tools to attach to the assistant. |
| `Description` | string |  |
| `Greeting` | string | Text that the assistant will use to start the conversation. |
| `LlmApiKeyRef` | string | This is only needed when using third-party inference providers selected by `m... |
| `ExternalLlm` | object |  |
| `FallbackConfig` | object |  |
| `VoiceSettings` | object |  |
| `Transcription` | object |  |
| `TelephonySettings` | object |  |
| `MessagingSettings` | object |  |
| `EnabledFeatures` | array[object] |  |
| `InsightSettings` | object |  |
| `PrivacySettings` | object |  |
| `DynamicVariablesWebhookUrl` | string (URL) | If `dynamic_variables_webhook_url` is set, Telnyx sends a POST request to thi... |
| `DynamicVariablesWebhookTimeoutMs` | integer | Timeout in milliseconds for the dynamic variables webhook. |
| `DynamicVariables` | object | Map of dynamic variables and their default values |
| `WidgetSettings` | object | Configuration settings for the assistant's web widget. |
| `InterruptionSettings` | object | Settings for interruptions and how the assistant decides the user has finishe... |
| `Integrations` | array[object] | Connected integrations attached to the assistant. |
| `ObservabilitySettings` | object |  |
| `Tags` | array[string] | Tags associated with the assistant. |
| `VersionName` | string | Human-readable name for the assistant version. |
| `PostConversationSettings` | object | Configuration for post-conversation processing. |
| `PromoteToMain` | boolean | Indicates whether the assistant should be promoted to the main version. |

### Create Canary Deploy — `client.AI.Assistants.CanaryDeploys.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Rules` | array[object] |  |

### Update Canary Deploy — `client.AI.Assistants.CanaryDeploys.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Rules` | array[object] |  |

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
| `MaxRetriesClientErrors` | integer | Configure number of retries on client errors: busy, no-answer, failed, cancel... |
| `RetryIntervalSecs` | integer |  |

### Test Assistant Tool — `client.AI.Assistants.Tools.Test()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Arguments` | object | Key-value arguments to use for the webhook test |
| `DynamicVariables` | object | Key-value dynamic variables to use for the webhook test |

### Update a specific assistant version — `client.AI.Assistants.Versions.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Model` | string | ID of the model to use when `external_llm` is not set. |
| `Instructions` | string | System instructions for the assistant. |
| `Tools` | array[object] | Deprecated for new integrations. |
| `McpServers` | array[object] | MCP servers attached to the assistant. |
| `ToolIds` | array[string] | IDs of shared tools to attach to the assistant. |
| `Description` | string |  |
| `Greeting` | string | Text that the assistant will use to start the conversation. |
| `LlmApiKeyRef` | string | This is only needed when using third-party inference providers selected by `m... |
| `ExternalLlm` | object |  |
| `FallbackConfig` | object |  |
| `VoiceSettings` | object |  |
| `Transcription` | object |  |
| `TelephonySettings` | object |  |
| `MessagingSettings` | object |  |
| `EnabledFeatures` | array[object] |  |
| `InsightSettings` | object |  |
| `PrivacySettings` | object |  |
| `DynamicVariablesWebhookUrl` | string (URL) | If `dynamic_variables_webhook_url` is set, Telnyx sends a POST request to thi... |
| `DynamicVariablesWebhookTimeoutMs` | integer | Timeout in milliseconds for the dynamic variables webhook. |
| `DynamicVariables` | object | Map of dynamic variables and their default values |
| `WidgetSettings` | object | Configuration settings for the assistant's web widget. |
| `InterruptionSettings` | object | Settings for interruptions and how the assistant decides the user has finishe... |
| `Integrations` | array[object] | Connected integrations attached to the assistant. |
| `ObservabilitySettings` | object |  |
| `Tags` | array[string] | Tags associated with the assistant. |
| `VersionName` | string | Human-readable name for the assistant version. |
| `PostConversationSettings` | object | Configuration for post-conversation processing. |

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
