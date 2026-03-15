---
name: telnyx-ai-assistants-go
description: >-
  AI voice assistants with custom instructions, knowledge bases, and tool
  integrations.
metadata:
  author: telnyx
  product: ai-assistants
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Assistants - Go

## Core Workflow

### Prerequisites

1. Create an AI Assistant with instructions (system prompt) and greeting
2. Select language model (e.g., gpt-4o, llama-4-maverick)
3. Configure voice: choose TTS provider (Telnyx, AWS, Azure, ElevenLabs, Inworld) and STT provider
4. For inbound calls: buy a phone number and assign to a Voice API Application or TeXML Application

### Steps

1. **Create assistant**: `client.Ai.Assistants.Create(ctx, params)`
2. **(Optional) Attach knowledge base**: `client.Ai.Assistants.Update(ctx, params)`
3. **(Optional) Configure tools**: `Webhook tools, transfer, DTMF, handoff, MCP servers`
4. **Assign to phone number**: `Via connection or TeXML app`
5. **Test**: `Call the number or use the portal test feature`

### Common mistakes

- NEVER use free-tier API keys for ElevenLabs or OpenAI providers — requests are rejected
- For multilingual: MUST set STT to openai/whisper-large-v3-turbo — default is English-only
- Only gpt-4o and llama-4-maverick support image/vision analysis — other models silently ignore images

**Related skills**: telnyx-voice-go, telnyx-texml-go, telnyx-numbers-go

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

result, err := client.Ai.Assistants.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create an assistant

Create a new AI Assistant.

`client.AI.Assistants.New()` — `POST /ai/assistants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes |  |
| `Model` | string | Yes | ID of the model to use. |
| `Instructions` | string | Yes | System instructions for the assistant. |
| `Tools` | array[object] | No | The tools that the assistant can use. |
| `Description` | string | No |  |
| `Greeting` | string | No | Text that the assistant will use to start the conversation. |
| ... | | | +11 optional params in [references/api-details.md](references/api-details.md) |

```go
	assistant, err := client.AI.Assistants.New(context.Background(), telnyx.AIAssistantNewParams{
		Instructions: "You are a helpful assistant.",
		Model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
		Name: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get an assistant

Retrieve an AI Assistant configuration by `assistant_id`.

`client.AI.Assistants.Get()` — `GET /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `CallControlId` | string (UUID) | No |  |
| `FetchDynamicVariablesFromWebhook` | boolean | No |  |
| `From` | string (E.164) | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an assistant

Update an AI Assistant's attributes.

`client.AI.Assistants.Update()` — `POST /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `Name` | string | No |  |
| `Model` | string | No | ID of the model to use. |
| `Instructions` | string | No | System instructions for the assistant. |
| ... | | | +15 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Assistant Chat (BETA)

This endpoint allows a client to send a chat message to a specific AI Assistant. The assistant processes the message and returns a relevant reply based on the current conversation context.

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

Key response fields: `response.data.content`

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`client.AI.Assistants.List()` — `GET /ai/assistants`

```go
	assistantsList, err := client.AI.Assistants.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantsList.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Import assistants from external provider

Import assistants from external providers. Any assistant that has already been imported will be overwritten with its latest version from the importing provider.

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get All Tags

`client.AI.Assistants.Tags.List()` — `GET /ai/assistants/tags`

```go
	tags, err := client.AI.Assistants.Tags.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", tags.Tags)
```

Key response fields: `response.data.tags`

## List assistant tests with pagination

Retrieves a paginated list of assistant tests with optional filtering capabilities

`client.AI.Assistants.Tests.List()` — `GET /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestSuite` | string | No | Filter tests by test suite name |
| `TelnyxConversationChannel` | string | No | Filter tests by communication channel (e.g., 'web_chat', 'sm... |
| `Destination` | string | No | Filter tests by destination (phone number, webhook URL, etc.... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.AI.Assistants.Tests.List(context.Background(), telnyx.AIAssistantTestListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Create a new assistant test

Creates a comprehensive test configuration for evaluating AI assistant performance

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
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`client.AI.Assistants.Tests.TestSuites.List()` — `GET /ai/assistants/tests/test-suites`

```go
	testSuites, err := client.AI.Assistants.Tests.TestSuites.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", testSuites.Data)
```

Key response fields: `response.data.data`

## Get test suite run history

Retrieves paginated history of test runs for a specific test suite with filtering options

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

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`client.AI.Assistants.Tests.TestSuites.Runs.Trigger()` — `POST /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SuiteName` | string | Yes |  |
| `DestinationVersionId` | string (UUID) | No | Optional assistant version ID to use for all test runs in th... |

```go
	testRunResponses, err := client.AI.Assistants.Tests.TestSuites.Runs.Trigger(
		context.Background(),
		"suite_name",
		telnyx.AIAssistantTestTestSuiteRunTriggerParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", testRunResponses)
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`client.AI.Assistants.Tests.Get()` — `GET /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestId` | string (UUID) | Yes |  |

```go
	assistantTest, err := client.AI.Assistants.Tests.Get(context.Background(), "test_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantTest.TestID)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Update an assistant test

Updates an existing assistant test configuration with new settings

`client.AI.Assistants.Tests.Update()` — `PUT /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestId` | string (UUID) | Yes |  |
| `TelnyxConversationChannel` | enum (phone_call, web_call, sms_chat, web_chat) | No |  |
| `Name` | string | No | Updated name for the assistant test. |
| `Description` | string | No | Updated description of the test's purpose and evaluation cri... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```go
	assistantTest, err := client.AI.Assistants.Tests.Update(
		context.Background(),
		"test_id",
		telnyx.AIAssistantTestUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantTest.TestID)
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Delete an assistant test

Permanently removes an assistant test and all associated data

`client.AI.Assistants.Tests.Delete()` — `DELETE /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestId` | string (UUID) | Yes |  |

```go
	err := client.AI.Assistants.Tests.Delete(context.Background(), "test_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`client.AI.Assistants.Tests.Runs.List()` — `GET /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestId` | string (UUID) | Yes |  |
| `Status` | string | No | Filter runs by execution status (pending, running, completed... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AI.Assistants.Tests.Runs.List(
		context.Background(),
		"test_id",
		telnyx.AIAssistantTestRunListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`client.AI.Assistants.Tests.Runs.Trigger()` — `POST /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestId` | string (UUID) | Yes |  |
| `DestinationVersionId` | string (UUID) | No | Optional assistant version ID to use for this test run. |

```go
	testRunResponse, err := client.AI.Assistants.Tests.Runs.Trigger(
		context.Background(),
		"test_id",
		telnyx.AIAssistantTestRunTriggerParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", testRunResponse.RunID)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Get specific test run details

Retrieves detailed information about a specific test run execution

`client.AI.Assistants.Tests.Runs.Get()` — `GET /ai/assistants/tests/{test_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TestId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	testRunResponse, err := client.AI.Assistants.Tests.Runs.Get(
		context.Background(),
		"run_id",
		telnyx.AIAssistantTestRunGetParams{
			TestID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", testRunResponse.RunID)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`client.AI.Assistants.Delete()` — `DELETE /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |

```go
	assistant, err := client.AI.Assistants.Delete(context.Background(), "assistant_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Key response fields: `response.data.id, response.data.deleted, response.data.object`

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant. Retrieves the current canary deploy configuration with all version IDs and their
traffic percentages for the specified assistant.

`client.AI.Assistants.CanaryDeploys.Get()` — `GET /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |

```go
	canaryDeployResponse, err := client.AI.Assistants.CanaryDeploys.Get(context.Background(), "assistant_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", canaryDeployResponse.AssistantID)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Create Canary Deploy

Endpoint to create a canary deploy configuration for an assistant. Creates a new canary deploy configuration with multiple version IDs and their traffic
percentages for A/B testing or gradual rollouts of assistant versions.

`client.AI.Assistants.CanaryDeploys.New()` — `POST /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Versions` | array[object] | Yes | List of version configurations |
| `AssistantId` | string (UUID) | Yes |  |

```go
	canaryDeployResponse, err := client.AI.Assistants.CanaryDeploys.New(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantCanaryDeployNewParams{
			CanaryDeploy: telnyx.CanaryDeployParam{
				Versions: []telnyx.VersionConfigParam{{
					Percentage: 1,
					VersionID: "550e8400-e29b-41d4-a716-446655440000",
				}},
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", canaryDeployResponse.AssistantID)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant. Updates the existing canary deploy configuration with new version IDs and percentages. All old versions and percentages are replaces by new ones from this request.

`client.AI.Assistants.CanaryDeploys.Update()` — `PUT /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Versions` | array[object] | Yes | List of version configurations |
| `AssistantId` | string (UUID) | Yes |  |

```go
	canaryDeployResponse, err := client.AI.Assistants.CanaryDeploys.Update(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantCanaryDeployUpdateParams{
			CanaryDeploy: telnyx.CanaryDeployParam{
				Versions: []telnyx.VersionConfigParam{{
					Percentage: 1,
					VersionID: "550e8400-e29b-41d4-a716-446655440000",
				}},
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", canaryDeployResponse.AssistantID)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant. Removes all canary deploy configurations for the specified assistant.

`client.AI.Assistants.CanaryDeploys.Delete()` — `DELETE /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |

```go
	err := client.AI.Assistants.CanaryDeploys.Delete(context.Background(), "assistant_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Assistant Sms Chat

Send an SMS message for an assistant. This endpoint: 
1. Validates the assistant exists and has messaging profile configured 
2.

`client.AI.Assistants.SendSMS()` — `POST /ai/assistants/{assistant_id}/chat/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `From` | string (E.164) | Yes |  |
| `To` | string (E.164) | Yes |  |
| `AssistantId` | string (UUID) | Yes |  |
| `Text` | string | No |  |
| `ConversationMetadata` | object | No |  |
| `ShouldCreateConversation` | boolean | No |  |

```go
	response, err := client.AI.Assistants.SendSMS(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantSendSMSParams{
			From: "+18005550101",
			To: "+13125550001",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.ConversationID)
```

Key response fields: `response.data.conversation_id`

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`client.AI.Assistants.Clone()` — `POST /ai/assistants/{assistant_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |

```go
	assistant, err := client.AI.Assistants.Clone(context.Background(), "assistant_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List scheduled events

Get scheduled events for an assistant with pagination and filtering

`client.AI.Assistants.ScheduledEvents.List()` — `GET /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `ConversationChannel` | enum (phone_call, sms_chat) | No |  |
| `FromDate` | string (date-time) | No |  |
| `ToDate` | string (date-time) | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.AI.Assistants.ScheduledEvents.List(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantScheduledEventListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.data, response.data.meta`

## Create a scheduled event

Create a scheduled event for an assistant

`client.AI.Assistants.ScheduledEvents.New()` — `POST /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TelnyxConversationChannel` | enum (phone_call, sms_chat) | Yes |  |
| `TelnyxEndUserTarget` | string | Yes | The phone number, SIP URI, to schedule the call or text to. |
| `TelnyxAgentTarget` | string | Yes | The phone number, SIP URI, to schedule the call or text from... |
| `ScheduledAtFixedDatetime` | string (date-time) | Yes | The datetime at which the event should be scheduled. |
| `AssistantId` | string (UUID) | Yes |  |
| `Text` | string | No | Required for sms scheduled events. |
| `ConversationMetadata` | object | No | Metadata associated with the conversation. |
| `DynamicVariables` | object | No | A map of dynamic variable names to values. |

```go
	scheduledEventResponse, err := client.AI.Assistants.ScheduledEvents.New(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantScheduledEventNewParams{
			ScheduledAtFixedDatetime:  time.Now(),
			TelnyxAgentTarget: "550e8400-e29b-41d4-a716-446655440000",
			TelnyxConversationChannel: telnyx.ConversationChannelTypePhoneCall,
			TelnyxEndUserTarget: "+13125550001",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", scheduledEventResponse)
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`client.AI.Assistants.ScheduledEvents.Get()` — `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `EventId` | string (UUID) | Yes |  |

```go
	scheduledEventResponse, err := client.AI.Assistants.ScheduledEvents.Get(
		context.Background(),
		"event_id",
		telnyx.AIAssistantScheduledEventGetParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", scheduledEventResponse)
```

## Delete a scheduled event

If the event is pending, this will cancel the event. Otherwise, this will simply remove the record of the event.

`client.AI.Assistants.ScheduledEvents.Delete()` — `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `EventId` | string (UUID) | Yes |  |

```go
	err := client.AI.Assistants.ScheduledEvents.Delete(
		context.Background(),
		"event_id",
		telnyx.AIAssistantScheduledEventDeleteParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Add Assistant Tag

`client.AI.Assistants.Tags.Add()` — `POST /ai/assistants/{assistant_id}/tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Tag` | string | Yes |  |
| `AssistantId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Assistants.Tags.Add(
		context.Background(),
		"assistant_id",
		telnyx.AIAssistantTagAddParams{
			Tag: "production",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Tags)
```

Key response fields: `response.data.tags`

## Remove Assistant Tag

`client.AI.Assistants.Tags.Remove()` — `DELETE /ai/assistants/{assistant_id}/tags/{tag}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `Tag` | string | Yes |  |

```go
	tag, err := client.AI.Assistants.Tags.Remove(
		context.Background(),
		"tag",
		telnyx.AIAssistantTagRemoveParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", tag.Tags)
```

Key response fields: `response.data.tags`

## Get assistant texml

Get an assistant texml by `assistant_id`.

`client.AI.Assistants.GetTexml()` — `GET /ai/assistants/{assistant_id}/texml`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Assistants.GetTexml(context.Background(), "assistant_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Test Assistant Tool

Test a webhook tool for an assistant

`client.AI.Assistants.Tools.Test()` — `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `ToolId` | string (UUID) | Yes |  |
| `Arguments` | object | No | Key-value arguments to use for the webhook test |
| `DynamicVariables` | object | No | Key-value dynamic variables to use for the webhook test |

```go
	response, err := client.AI.Assistants.Tools.Test(
		context.Background(),
		"tool_id",
		telnyx.AIAssistantToolTestParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.content_type, response.data.request, response.data.response`

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`client.AI.Assistants.Versions.List()` — `GET /ai/assistants/{assistant_id}/versions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |

```go
	assistantsList, err := client.AI.Assistants.Versions.List(context.Background(), "assistant_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistantsList.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a specific assistant version

Retrieves a specific version of an assistant by assistant_id and version_id

`client.AI.Assistants.Versions.Get()` — `GET /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `VersionId` | string (UUID) | Yes |  |
| `IncludeMcpServers` | boolean | No |  |

```go
	assistant, err := client.AI.Assistants.Versions.Get(
		context.Background(),
		"version_id",
		telnyx.AIAssistantVersionGetParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a specific assistant version

Updates the configuration of a specific assistant version. Can not update main version

`client.AI.Assistants.Versions.Update()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `VersionId` | string (UUID) | Yes |  |
| `Name` | string | No |  |
| `Model` | string | No | ID of the model to use. |
| `Instructions` | string | No | System instructions for the assistant. |
| ... | | | +14 optional params in [references/api-details.md](references/api-details.md) |

```go
	assistant, err := client.AI.Assistants.Versions.Update(
		context.Background(),
		"version_id",
		telnyx.AIAssistantVersionUpdateParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
			UpdateAssistant: telnyx.UpdateAssistantParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a specific assistant version

Permanently removes a specific version of an assistant. Can not delete main version

`client.AI.Assistants.Versions.Delete()` — `DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `VersionId` | string (UUID) | Yes |  |

```go
	err := client.AI.Assistants.Versions.Delete(
		context.Background(),
		"version_id",
		telnyx.AIAssistantVersionDeleteParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant. This will delete any existing canary deploy configuration and send all live production traffic to this version.

`client.AI.Assistants.Versions.Promote()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AssistantId` | string (UUID) | Yes |  |
| `VersionId` | string (UUID) | Yes |  |

```go
	assistant, err := client.AI.Assistants.Versions.Promote(
		context.Background(),
		"version_id",
		telnyx.AIAssistantVersionPromoteParams{
			AssistantID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", assistant.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List MCP Servers

Retrieve a list of MCP servers.

`client.AI.McpServers.List()` — `GET /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Type` | string | No |  |
| `Url` | string (URL) | No |  |
| `Page[size]` | integer | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.AI.McpServers.List(context.Background(), telnyx.AIMcpServerListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

## Create MCP Server

Create a new MCP server.

`client.AI.McpServers.New()` — `POST /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes |  |
| `Type` | string | Yes |  |
| `Url` | string (URL) | Yes |  |
| `ApiKeyRef` | string | No |  |
| `AllowedTools` | array[string] | No |  |

```go
	mcpServer, err := client.AI.McpServers.New(context.Background(), telnyx.AIMcpServerNewParams{
		Name: "my-resource",
		Type: "webhook",
		URL: "https://example.com/resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mcpServer.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get MCP Server

Retrieve details for a specific MCP server.

`client.AI.McpServers.Get()` — `GET /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `McpServerId` | string (UUID) | Yes |  |

```go
	mcpServer, err := client.AI.McpServers.Get(context.Background(), "mcp_server_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mcpServer.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update MCP Server

Update an existing MCP server.

`client.AI.McpServers.Update()` — `PUT /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `McpServerId` | string (UUID) | Yes |  |
| `Type` | string | No |  |
| `Id` | string (UUID) | No |  |
| `Name` | string | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	mcpServer, err := client.AI.McpServers.Update(
		context.Background(),
		"mcp_server_id",
		telnyx.AIMcpServerUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mcpServer.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete MCP Server

Delete a specific MCP server.

`client.AI.McpServers.Delete()` — `DELETE /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `McpServerId` | string (UUID) | Yes |  |

```go
	err := client.AI.McpServers.Delete(context.Background(), "mcp_server_id")
	if err != nil {
		log.Fatal(err)
	}
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
