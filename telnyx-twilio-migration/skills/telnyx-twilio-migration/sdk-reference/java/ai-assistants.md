<!-- SDK reference: telnyx-ai-assistants-java -->

# Telnyx Ai Assistants - Java

## Core Workflow

### Prerequisites

1. Create an AI Assistant with instructions (system prompt) and greeting
2. Select language model (e.g., gpt-4o, llama-4-maverick)
3. Configure voice: choose TTS provider (Telnyx, AWS, Azure, ElevenLabs, Inworld) and STT provider
4. For inbound calls: buy a phone number and assign to a Voice API Application or TeXML Application

### Steps

1. **Create assistant**: `client.ai().assistants().create(params)`
2. **(Optional) Attach knowledge base**: `client.ai().assistants().update(params)`
3. **(Optional) Configure tools**: `Webhook tools, transfer, DTMF, handoff, MCP servers`
4. **Assign to phone number**: `Via connection or TeXML app`
5. **Test**: `Call the number or use the portal test feature`

### Common mistakes

- NEVER use free-tier API keys for ElevenLabs or OpenAI providers — requests are rejected
- For multilingual: MUST set STT to openai/whisper-large-v3-turbo — default is English-only
- Only gpt-4o and llama-4-maverick support image/vision analysis — other models silently ignore images

**Related skills**: telnyx-voice-java, telnyx-texml-java, telnyx-numbers-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.ai().assistants().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create an assistant

Create a new AI Assistant.

`client.ai().assistants().create()` — `POST /ai/assistants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `model` | string | Yes | ID of the model to use. |
| `instructions` | string | Yes | System instructions for the assistant. |
| `tools` | array[object] | No | The tools that the assistant can use. |
| `description` | string | No |  |
| `greeting` | string | No | Text that the assistant will use to start the conversation. |
| ... | | | +11 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantCreateParams;
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;

AssistantCreateParams params = AssistantCreateParams.builder()
    .instructions("You are a helpful assistant.")
    .model("meta-llama/Meta-Llama-3.1-8B-Instruct")
    .name("my-resource")
    .build();
InferenceEmbedding assistant = client.ai().assistants().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get an assistant

Retrieve an AI Assistant configuration by `assistant_id`.

`client.ai().assistants().retrieve()` — `GET /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `callControlId` | string (UUID) | No |  |
| `fetchDynamicVariablesFromWebhook` | boolean | No |  |
| `from` | string (E.164) | No |  |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantRetrieveParams;
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;

InferenceEmbedding assistant = client.ai().assistants().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an assistant

Update an AI Assistant's attributes.

`client.ai().assistants().update()` — `POST /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +15 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantUpdateParams;
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;

InferenceEmbedding assistant = client.ai().assistants().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Assistant Chat (BETA)

This endpoint allows a client to send a chat message to a specific AI Assistant. The assistant processes the message and returns a relevant reply based on the current conversation context.

`client.ai().assistants().chat()` — `POST /ai/assistants/{assistant_id}/chat`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The message content sent by the client to the assistant |
| `conversationId` | string (UUID) | Yes | A unique identifier for the conversation thread, used to mai... |
| `assistantId` | string (UUID) | Yes |  |
| `name` | string | No | The optional display name of the user sending the message |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantChatParams;
import com.telnyx.sdk.models.ai.assistants.AssistantChatResponse;

AssistantChatParams params = AssistantChatParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .content("Tell me a joke about cats")
    .conversationId("42b20469-1215-4a9a-8964-c36f66b406f4")
    .build();
AssistantChatResponse response = client.ai().assistants().chat(params);
```

Key response fields: `response.data.content`

## List assistants

Retrieve a list of all AI Assistants configured by the user.

`client.ai().assistants().list()` — `GET /ai/assistants`

```java
import com.telnyx.sdk.models.ai.assistants.AssistantListParams;
import com.telnyx.sdk.models.ai.assistants.AssistantsList;

AssistantsList assistantsList = client.ai().assistants().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Import assistants from external provider

Import assistants from external providers. Any assistant that has already been imported will be overwritten with its latest version from the importing provider.

`client.ai().assistants().imports()` — `POST /ai/assistants/import`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (elevenlabs, vapi, retell) | Yes | The external provider to import assistants from. |
| `apiKeyRef` | string | Yes | Integration secret pointer that refers to the API key for th... |
| `importIds` | array[string] | No | Optional list of assistant IDs to import from the external p... |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantImportsParams;
import com.telnyx.sdk.models.ai.assistants.AssistantsList;

AssistantImportsParams params = AssistantImportsParams.builder()
    .apiKeyRef("my-openai-key")
    .provider(AssistantImportsParams.Provider.ELEVENLABS)
    .build();
AssistantsList assistantsList = client.ai().assistants().imports(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get All Tags

`client.ai().assistants().tags().list()` — `GET /ai/assistants/tags`

```java
import com.telnyx.sdk.models.ai.assistants.tags.TagListParams;
import com.telnyx.sdk.models.ai.assistants.tags.TagListResponse;

TagListResponse tags = client.ai().assistants().tags().list();
```

Key response fields: `response.data.tags`

## List assistant tests with pagination

Retrieves a paginated list of assistant tests with optional filtering capabilities

`client.ai().assistants().tests().list()` — `GET /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testSuite` | string | No | Filter tests by test suite name |
| `telnyxConversationChannel` | string | No | Filter tests by communication channel (e.g., 'web_chat', 'sm... |
| `destination` | string | No | Filter tests by destination (phone number, webhook URL, etc.... |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.tests.TestListPage;
import com.telnyx.sdk.models.ai.assistants.tests.TestListParams;

TestListPage page = client.ai().assistants().tests().list();
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Create a new assistant test

Creates a comprehensive test configuration for evaluating AI assistant performance

`client.ai().assistants().tests().create()` — `POST /ai/assistants/tests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A descriptive name for the assistant test. |
| `destination` | string | Yes | The target destination for the test conversation. |
| `instructions` | string | Yes | Detailed instructions that define the test scenario and what... |
| `rubric` | array[object] | Yes | Evaluation criteria used to assess the assistant's performan... |
| `description` | string | No | Optional detailed description of what this test evaluates an... |
| `telnyxConversationChannel` | object | No | The communication channel through which the test will be con... |
| `maxDurationSeconds` | integer | No | Maximum duration in seconds that the test conversation shoul... |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.tests.AssistantTest;
import com.telnyx.sdk.models.ai.assistants.tests.TestCreateParams;

TestCreateParams params = TestCreateParams.builder()
    .destination("+15551234567")
    .instructions("Act as a frustrated customer who received a damaged product. Ask for a refund and escalate if not satisfied with the initial response.")
    .name("Customer Support Bot Test")
    .addRubric(TestCreateParams.Rubric.builder()
        .criteria("Assistant responds within 30 seconds")
        .name("Response Time")
        .build())
    .addRubric(TestCreateParams.Rubric.builder()
        .criteria("Provides correct product information")
        .name("Accuracy")
        .build())
    .build();
AssistantTest assistantTest = client.ai().assistants().tests().create(params);
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Get all test suite names

Retrieves a list of all distinct test suite names available to the current user

`client.ai().assistants().tests().testSuites().list()` — `GET /ai/assistants/tests/test-suites`

```java
import com.telnyx.sdk.models.ai.assistants.tests.testsuites.TestSuiteListParams;
import com.telnyx.sdk.models.ai.assistants.tests.testsuites.TestSuiteListResponse;

TestSuiteListResponse testSuites = client.ai().assistants().tests().testSuites().list();
```

Key response fields: `response.data.data`

## Get test suite run history

Retrieves paginated history of test runs for a specific test suite with filtering options

`client.ai().assistants().tests().testSuites().runs().list()` — `GET /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suiteName` | string | Yes |  |
| `testSuiteRunId` | string (UUID) | No | Filter runs by specific suite execution batch ID |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ai.assistants.tests.testsuites.runs.RunListPage;
import com.telnyx.sdk.models.ai.assistants.tests.testsuites.runs.RunListParams;

RunListPage page = client.ai().assistants().tests().testSuites().runs().list("suite_name");
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger test suite execution

Executes all tests within a specific test suite as a batch operation

`client.ai().assistants().tests().testSuites().runs().trigger()` — `POST /ai/assistants/tests/test-suites/{suite_name}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `suiteName` | string | Yes |  |
| `destinationVersionId` | string (UUID) | No | Optional assistant version ID to use for all test runs in th... |

```java
import com.telnyx.sdk.models.ai.assistants.tests.runs.TestRunResponse;
import com.telnyx.sdk.models.ai.assistants.tests.testsuites.runs.RunTriggerParams;

List<TestRunResponse> testRunResponses = client.ai().assistants().tests().testSuites().runs().trigger("suite_name");
```

## Get assistant test by ID

Retrieves detailed information about a specific assistant test

`client.ai().assistants().tests().retrieve()` — `GET /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.tests.AssistantTest;
import com.telnyx.sdk.models.ai.assistants.tests.TestRetrieveParams;

AssistantTest assistantTest = client.ai().assistants().tests().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Update an assistant test

Updates an existing assistant test configuration with new settings

`client.ai().assistants().tests().update()` — `PUT /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `telnyxConversationChannel` | enum (phone_call, web_call, sms_chat, web_chat) | No |  |
| `name` | string | No | Updated name for the assistant test. |
| `description` | string | No | Updated description of the test's purpose and evaluation cri... |
| ... | | | +5 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.tests.AssistantTest;
import com.telnyx.sdk.models.ai.assistants.tests.TestUpdateParams;

AssistantTest assistantTest = client.ai().assistants().tests().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.name, response.data.created_at, response.data.description`

## Delete an assistant test

Permanently removes an assistant test and all associated data

`client.ai().assistants().tests().delete()` — `DELETE /ai/assistants/tests/{test_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.tests.TestDeleteParams;

client.ai().assistants().tests().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Get test run history for a specific test

Retrieves paginated execution history for a specific assistant test with filtering options

`client.ai().assistants().tests().runs().list()` — `GET /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `status` | string | No | Filter runs by execution status (pending, running, completed... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ai.assistants.tests.runs.RunListPage;
import com.telnyx.sdk.models.ai.assistants.tests.runs.RunListParams;

RunListPage page = client.ai().assistants().tests().runs().list("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Trigger a manual test run

Initiates immediate execution of a specific assistant test

`client.ai().assistants().tests().runs().trigger()` — `POST /ai/assistants/tests/{test_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `destinationVersionId` | string (UUID) | No | Optional assistant version ID to use for this test run. |

```java
import com.telnyx.sdk.models.ai.assistants.tests.runs.RunTriggerParams;
import com.telnyx.sdk.models.ai.assistants.tests.runs.TestRunResponse;

TestRunResponse testRunResponse = client.ai().assistants().tests().runs().trigger("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Get specific test run details

Retrieves detailed information about a specific test run execution

`client.ai().assistants().tests().runs().retrieve()` — `GET /ai/assistants/tests/{test_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.tests.runs.RunRetrieveParams;
import com.telnyx.sdk.models.ai.assistants.tests.runs.TestRunResponse;

RunRetrieveParams params = RunRetrieveParams.builder()
    .testId("550e8400-e29b-41d4-a716-446655440000")
    .runId("550e8400-e29b-41d4-a716-446655440000")
    .build();
TestRunResponse testRunResponse = client.ai().assistants().tests().runs().retrieve(params);
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Delete an assistant

Delete an AI Assistant by `assistant_id`.

`client.ai().assistants().delete()` — `DELETE /ai/assistants/{assistant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantDeleteParams;
import com.telnyx.sdk.models.ai.assistants.AssistantDeleteResponse;

AssistantDeleteResponse assistant = client.ai().assistants().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.deleted, response.data.object`

## Get Canary Deploy

Endpoint to get a canary deploy configuration for an assistant. Retrieves the current canary deploy configuration with all version IDs and their
traffic percentages for the specified assistant.

`client.ai().assistants().canaryDeploys().retrieve()` — `GET /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployResponse;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployRetrieveParams;

CanaryDeployResponse canaryDeployResponse = client.ai().assistants().canaryDeploys().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Create Canary Deploy

Endpoint to create a canary deploy configuration for an assistant. Creates a new canary deploy configuration with multiple version IDs and their traffic
percentages for A/B testing or gradual rollouts of assistant versions.

`client.ai().assistants().canaryDeploys().create()` — `POST /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeploy;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployCreateParams;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployResponse;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.VersionConfig;

CanaryDeployCreateParams params = CanaryDeployCreateParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .canaryDeploy(CanaryDeploy.builder()
        .addVersion(VersionConfig.builder()
            .percentage(1.0)
            .versionId("550e8400-e29b-41d4-a716-446655440000")
            .build())
        .build())
    .build();
CanaryDeployResponse canaryDeployResponse = client.ai().assistants().canaryDeploys().create(params);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Update Canary Deploy

Endpoint to update a canary deploy configuration for an assistant. Updates the existing canary deploy configuration with new version IDs and percentages. All old versions and percentages are replaces by new ones from this request.

`client.ai().assistants().canaryDeploys().update()` — `PUT /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | array[object] | Yes | List of version configurations |
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeploy;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployResponse;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployUpdateParams;
import com.telnyx.sdk.models.ai.assistants.canarydeploys.VersionConfig;

CanaryDeployUpdateParams params = CanaryDeployUpdateParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .canaryDeploy(CanaryDeploy.builder()
        .addVersion(VersionConfig.builder()
            .percentage(1.0)
            .versionId("550e8400-e29b-41d4-a716-446655440000")
            .build())
        .build())
    .build();
CanaryDeployResponse canaryDeployResponse = client.ai().assistants().canaryDeploys().update(params);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.assistant_id`

## Delete Canary Deploy

Endpoint to delete a canary deploy configuration for an assistant. Removes all canary deploy configurations for the specified assistant.

`client.ai().assistants().canaryDeploys().delete()` — `DELETE /ai/assistants/{assistant_id}/canary-deploys`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.canarydeploys.CanaryDeployDeleteParams;

client.ai().assistants().canaryDeploys().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Assistant Sms Chat

Send an SMS message for an assistant. This endpoint: 
1. Validates the assistant exists and has messaging profile configured 
2.

`client.ai().assistants().sendSms()` — `POST /ai/assistants/{assistant_id}/chat/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes |  |
| `to` | string (E.164) | Yes |  |
| `assistantId` | string (UUID) | Yes |  |
| `text` | string | No |  |
| `conversationMetadata` | object | No |  |
| `shouldCreateConversation` | boolean | No |  |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantSendSmsParams;
import com.telnyx.sdk.models.ai.assistants.AssistantSendSmsResponse;

AssistantSendSmsParams params = AssistantSendSmsParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .from("+18005550101")
    .to("+13125550001")
    .build();
AssistantSendSmsResponse response = client.ai().assistants().sendSms(params);
```

Key response fields: `response.data.conversation_id`

## Clone Assistant

Clone an existing assistant, excluding telephony and messaging settings.

`client.ai().assistants().clone()` — `POST /ai/assistants/{assistant_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantCloneParams;
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;

InferenceEmbedding assistant = client.ai().assistants().clone("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List scheduled events

Get scheduled events for an assistant with pagination and filtering

`client.ai().assistants().scheduledEvents().list()` — `GET /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `conversationChannel` | enum (phone_call, sms_chat) | No |  |
| `fromDate` | string (date-time) | No |  |
| `toDate` | string (date-time) | No |  |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventListPage;
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventListParams;

ScheduledEventListPage page = client.ai().assistants().scheduledEvents().list("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.data, response.data.meta`

## Create a scheduled event

Create a scheduled event for an assistant

`client.ai().assistants().scheduledEvents().create()` — `POST /ai/assistants/{assistant_id}/scheduled_events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyxConversationChannel` | enum (phone_call, sms_chat) | Yes |  |
| `telnyxEndUserTarget` | string | Yes | The phone number, SIP URI, to schedule the call or text to. |
| `telnyxAgentTarget` | string | Yes | The phone number, SIP URI, to schedule the call or text from... |
| `scheduledAtFixedDatetime` | string (date-time) | Yes | The datetime at which the event should be scheduled. |
| `assistantId` | string (UUID) | Yes |  |
| `text` | string | No | Required for sms scheduled events. |
| `conversationMetadata` | object | No | Metadata associated with the conversation. |
| `dynamicVariables` | object | No | A map of dynamic variable names to values. |

```java
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ConversationChannelType;
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventCreateParams;
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventResponse;
import java.time.OffsetDateTime;

ScheduledEventCreateParams params = ScheduledEventCreateParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .scheduledAtFixedDatetime(OffsetDateTime.parse("2025-04-15T13:07:28.764Z"))
    .telnyxAgentTarget("550e8400-e29b-41d4-a716-446655440000")
    .telnyxConversationChannel(ConversationChannelType.PHONE_CALL)
    .telnyxEndUserTarget("+13125550001")
    .build();
ScheduledEventResponse scheduledEventResponse = client.ai().assistants().scheduledEvents().create(params);
```

## Get a scheduled event

Retrieve a scheduled event by event ID

`client.ai().assistants().scheduledEvents().retrieve()` — `GET /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `eventId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventResponse;
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventRetrieveParams;

ScheduledEventRetrieveParams params = ScheduledEventRetrieveParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .eventId("550e8400-e29b-41d4-a716-446655440000")
    .build();
ScheduledEventResponse scheduledEventResponse = client.ai().assistants().scheduledEvents().retrieve(params);
```

## Delete a scheduled event

If the event is pending, this will cancel the event. Otherwise, this will simply remove the record of the event.

`client.ai().assistants().scheduledEvents().delete()` — `DELETE /ai/assistants/{assistant_id}/scheduled_events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `eventId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.scheduledevents.ScheduledEventDeleteParams;

ScheduledEventDeleteParams params = ScheduledEventDeleteParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .eventId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().assistants().scheduledEvents().delete(params);
```

## Add Assistant Tag

`client.ai().assistants().tags().add()` — `POST /ai/assistants/{assistant_id}/tags`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag` | string | Yes |  |
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.tags.TagAddParams;
import com.telnyx.sdk.models.ai.assistants.tags.TagAddResponse;

TagAddParams params = TagAddParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .tag("production")
    .build();
TagAddResponse response = client.ai().assistants().tags().add(params);
```

Key response fields: `response.data.tags`

## Remove Assistant Tag

`client.ai().assistants().tags().remove()` — `DELETE /ai/assistants/{assistant_id}/tags/{tag}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `tag` | string | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.tags.TagRemoveParams;
import com.telnyx.sdk.models.ai.assistants.tags.TagRemoveResponse;

TagRemoveParams params = TagRemoveParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .tag("production")
    .build();
TagRemoveResponse tag = client.ai().assistants().tags().remove(params);
```

Key response fields: `response.data.tags`

## Get assistant texml

Get an assistant texml by `assistant_id`.

`client.ai().assistants().getTexml()` — `GET /ai/assistants/{assistant_id}/texml`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantGetTexmlParams;

String response = client.ai().assistants().getTexml("550e8400-e29b-41d4-a716-446655440000");
```

## Test Assistant Tool

Test a webhook tool for an assistant

`client.ai().assistants().tools().test()` — `POST /ai/assistants/{assistant_id}/tools/{tool_id}/test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |
| `arguments` | object | No | Key-value arguments to use for the webhook test |
| `dynamicVariables` | object | No | Key-value dynamic variables to use for the webhook test |

```java
import com.telnyx.sdk.models.ai.assistants.tools.ToolTestParams;
import com.telnyx.sdk.models.ai.assistants.tools.ToolTestResponse;

ToolTestParams params = ToolTestParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .toolId("550e8400-e29b-41d4-a716-446655440000")
    .build();
ToolTestResponse response = client.ai().assistants().tools().test(params);
```

Key response fields: `response.data.content_type, response.data.request, response.data.response`

## Get all versions of an assistant

Retrieves all versions of a specific assistant with complete configuration and metadata

`client.ai().assistants().versions().list()` — `GET /ai/assistants/{assistant_id}/versions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.AssistantsList;
import com.telnyx.sdk.models.ai.assistants.versions.VersionListParams;

AssistantsList assistantsList = client.ai().assistants().versions().list("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a specific assistant version

Retrieves a specific version of an assistant by assistant_id and version_id

`client.ai().assistants().versions().retrieve()` — `GET /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |
| `includeMcpServers` | boolean | No |  |

```java
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;
import com.telnyx.sdk.models.ai.assistants.versions.VersionRetrieveParams;

VersionRetrieveParams params = VersionRetrieveParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .versionId("550e8400-e29b-41d4-a716-446655440000")
    .build();
InferenceEmbedding assistant = client.ai().assistants().versions().retrieve(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a specific assistant version

Updates the configuration of a specific assistant version. Can not update main version

`client.ai().assistants().versions().update()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |
| `name` | string | No |  |
| `model` | string | No | ID of the model to use. |
| `instructions` | string | No | System instructions for the assistant. |
| ... | | | +14 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;
import com.telnyx.sdk.models.ai.assistants.versions.UpdateAssistant;
import com.telnyx.sdk.models.ai.assistants.versions.VersionUpdateParams;

VersionUpdateParams params = VersionUpdateParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .versionId("550e8400-e29b-41d4-a716-446655440000")
    .updateAssistant(UpdateAssistant.builder().build())
    .build();
InferenceEmbedding assistant = client.ai().assistants().versions().update(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a specific assistant version

Permanently removes a specific version of an assistant. Can not delete main version

`client.ai().assistants().versions().delete()` — `DELETE /ai/assistants/{assistant_id}/versions/{version_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.versions.VersionDeleteParams;

VersionDeleteParams params = VersionDeleteParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .versionId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().assistants().versions().delete(params);
```

## Promote an assistant version to main

Promotes a specific version to be the main/current version of the assistant. This will delete any existing canary deploy configuration and send all live production traffic to this version.

`client.ai().assistants().versions().promote()` — `POST /ai/assistants/{assistant_id}/versions/{version_id}/promote`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistantId` | string (UUID) | Yes |  |
| `versionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.assistants.InferenceEmbedding;
import com.telnyx.sdk.models.ai.assistants.versions.VersionPromoteParams;

VersionPromoteParams params = VersionPromoteParams.builder()
    .assistantId("550e8400-e29b-41d4-a716-446655440000")
    .versionId("550e8400-e29b-41d4-a716-446655440000")
    .build();
InferenceEmbedding assistant = client.ai().assistants().versions().promote(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List MCP Servers

Retrieve a list of MCP servers.

`client.ai().mcpServers().list()` — `GET /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `url` | string (URL) | No |  |
| `page[size]` | integer | No |  |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.mcpservers.McpServerListPage;
import com.telnyx.sdk.models.ai.mcpservers.McpServerListParams;

McpServerListPage page = client.ai().mcpServers().list();
```

## Create MCP Server

Create a new MCP server.

`client.ai().mcpServers().create()` — `POST /ai/mcp_servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `type` | string | Yes |  |
| `url` | string (URL) | Yes |  |
| `apiKeyRef` | string | No |  |
| `allowedTools` | array[string] | No |  |

```java
import com.telnyx.sdk.models.ai.mcpservers.McpServerCreateParams;
import com.telnyx.sdk.models.ai.mcpservers.McpServerCreateResponse;

McpServerCreateParams params = McpServerCreateParams.builder()
    .name("my-resource")
    .type("webhook")
    .url("https://example.com/resource")
    .build();
McpServerCreateResponse mcpServer = client.ai().mcpServers().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get MCP Server

Retrieve details for a specific MCP server.

`client.ai().mcpServers().retrieve()` — `GET /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcpServerId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.mcpservers.McpServerRetrieveParams;
import com.telnyx.sdk.models.ai.mcpservers.McpServerRetrieveResponse;

McpServerRetrieveResponse mcpServer = client.ai().mcpServers().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update MCP Server

Update an existing MCP server.

`client.ai().mcpServers().update()` — `PUT /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcpServerId` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `id` | string (UUID) | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.mcpservers.McpServerUpdateParams;
import com.telnyx.sdk.models.ai.mcpservers.McpServerUpdateResponse;

McpServerUpdateResponse mcpServer = client.ai().mcpServers().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete MCP Server

Delete a specific MCP server.

`client.ai().mcpServers().delete()` — `DELETE /ai/mcp_servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mcpServerId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.mcpservers.McpServerDeleteParams;

client.ai().mcpServers().delete("550e8400-e29b-41d4-a716-446655440000");
```

---

# AI Assistants (Java) — API Details

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

### Create an assistant — `client.ai().assistants().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |

### Import assistants from external provider — `client.ai().assistants().imports()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `importIds` | array[string] | Optional list of assistant IDs to import from the external provider. |

### Create a new assistant test — `client.ai().assistants().tests().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Optional detailed description of what this test evaluates and its purpose. |
| `telnyxConversationChannel` | object | The communication channel through which the test will be conducted. |
| `maxDurationSeconds` | integer | Maximum duration in seconds that the test conversation should run before timi... |
| `testSuite` | string | Optional test suite name to group related tests together. |

### Trigger test suite execution — `client.ai().assistants().tests().testSuites().runs().trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `destinationVersionId` | string (UUID) | Optional assistant version ID to use for all test runs in this suite. |

### Update an assistant test — `client.ai().assistants().tests().update()`

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

### Trigger a manual test run — `client.ai().assistants().tests().runs().trigger()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `destinationVersionId` | string (UUID) | Optional assistant version ID to use for this test run. |

### Update an assistant — `client.ai().assistants().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |
| `promoteToMain` | boolean | Indicates whether the assistant should be promoted to the main version. |

### Assistant Chat (BETA) — `client.ai().assistants().chat()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The optional display name of the user sending the message |

### Assistant Sms Chat — `client.ai().assistants().sendSms()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string |  |
| `conversationMetadata` | object |  |
| `shouldCreateConversation` | boolean |  |

### Create a scheduled event — `client.ai().assistants().scheduledEvents().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Required for sms scheduled events. |
| `conversationMetadata` | object | Metadata associated with the conversation. |
| `dynamicVariables` | object | A map of dynamic variable names to values. |

### Test Assistant Tool — `client.ai().assistants().tools().test()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `arguments` | object | Key-value arguments to use for the webhook test |
| `dynamicVariables` | object | Key-value dynamic variables to use for the webhook test |

### Update a specific assistant version — `client.ai().assistants().versions().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `model` | string | ID of the model to use. |
| `instructions` | string | System instructions for the assistant. |
| `tools` | array[object] | The tools that the assistant can use. |
| `description` | string |  |
| `greeting` | string | Text that the assistant will use to start the conversation. |
| `llmApiKeyRef` | string | This is only needed when using third-party inference providers. |
| `voiceSettings` | object |  |
| `transcription` | object |  |
| `telephonySettings` | object |  |
| `messagingSettings` | object |  |
| `enabledFeatures` | array[object] |  |
| `insightSettings` | object |  |
| `privacySettings` | object |  |
| `dynamicVariablesWebhookUrl` | string (URL) | If the dynamic_variables_webhook_url is set for the assistant, we will send a... |
| `dynamicVariables` | object | Map of dynamic variables and their default values |
| `widgetSettings` | object | Configuration settings for the assistant's web widget. |

### Create MCP Server — `client.ai().mcpServers().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKeyRef` | string |  |
| `allowedTools` | array[string] |  |

### Update MCP Server — `client.ai().mcpServers().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `name` | string |  |
| `type` | string |  |
| `url` | string (URL) |  |
| `apiKeyRef` | string |  |
| `allowedTools` | array[string] |  |
| `createdAt` | string (date-time) |  |
