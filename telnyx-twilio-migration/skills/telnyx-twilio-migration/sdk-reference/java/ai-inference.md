<!-- SDK reference: telnyx-ai-inference-java -->

# Telnyx Ai Inference - Java

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Chat completion**: `client.ai().chat().completions().create(params)`
2. **Generate embeddings**: `client.ai().embeddings().create(params)`
3. **Text-to-speech**: `client.ai().tts().create(params)`

### Common mistakes

- NEVER use non-Telnyx model names (e.g., 'gpt-4o') — only models listed at api.telnyx.com/v2/ai/models are available. Use client.ai.models.list() to see available models
- ALWAYS set max_tokens to prevent runaway generation — omitting it may consume excessive credits
- For streaming responses, ALWAYS iterate over the SSE stream — do not try to read the entire response body at once
- Telnyx AI Inference is OpenAI-compatible — use the same request/response format but with Telnyx base URL and API key

**Related skills**: telnyx-ai-assistants-java

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
    var result = client.ai().chat().completions().create(params);
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

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Transcribe speech to text

Transcribe speech to text. This endpoint is consistent with the [OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/createTranscription) and may be used with the OpenAI JS or Python SDK.

`client.ai().audio().transcribe()` — `POST /ai/audio/transcriptions`

```java
import com.telnyx.sdk.models.ai.audio.AudioTranscribeParams;
import com.telnyx.sdk.models.ai.audio.AudioTranscribeResponse;

AudioTranscribeParams params = AudioTranscribeParams.builder()
    .model(AudioTranscribeParams.Model.DISTIL_WHISPER_DISTIL_LARGE_V2)
    .build();
AudioTranscribeResponse response = client.ai().audio().transcribe(params);
```

Key response fields: `response.data.text, response.data.duration, response.data.segments`

## Create a chat completion

Chat with a language model. This endpoint is consistent with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) and may be used with the OpenAI JS or Python SDK.

`client.ai().chat().createCompletion()` — `POST /ai/chat/completions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | array[object] | Yes | A list of the previous chat messages for context. |
| `toolChoice` | enum (none, auto, required) | No |  |
| `model` | string | No | The language model to chat with. |
| `apiKeyRef` | string | No | If you are using an external inference provider like xAI or ... |
| ... | | | +20 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.chat.ChatCreateCompletionParams;
import com.telnyx.sdk.models.ai.chat.ChatCreateCompletionResponse;

ChatCreateCompletionParams params = ChatCreateCompletionParams.builder()
    .addMessage(ChatCreateCompletionParams.Message.builder()
        .content("You are a friendly chatbot.")
        .role(ChatCreateCompletionParams.Message.Role.SYSTEM)
        .build())
    .addMessage(ChatCreateCompletionParams.Message.builder()
        .content("Hello, world!")
        .role(ChatCreateCompletionParams.Message.Role.USER)
        .build())
    .build();
ChatCreateCompletionResponse response = client.ai().chat().createCompletion(params);
```

## List conversations

Retrieve a list of all AI conversations configured by the user. Supports [PostgREST-style query parameters](https://postgrest.org/en/stable/api.html#horizontal-filtering-rows) for filtering. Examples are included for the standard metadata fields, but you can filter on any field in the metadata JSON object.

`client.ai().conversations().list()` — `GET /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metadata->assistantId` | string (UUID) | No | Filter by assistant ID (e.g., `metadata->assistant_id=eq.ass... |
| `metadata->callControlId` | string (UUID) | No | Filter by call control ID (e.g., `metadata->call_control_id=... |
| `id` | string (UUID) | No | Filter by conversation ID (e.g. |
| ... | | | +9 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.conversations.ConversationListParams;
import com.telnyx.sdk.models.ai.conversations.ConversationListResponse;

ConversationListResponse conversations = client.ai().conversations().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a conversation

Create a new AI Conversation.

`client.ai().conversations().create()` — `POST /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No |  |
| `metadata` | object | No | Metadata associated with the conversation. |

```java
import com.telnyx.sdk.models.ai.conversations.Conversation;
import com.telnyx.sdk.models.ai.conversations.ConversationCreateParams;

Conversation conversation = client.ai().conversations().create();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template Groups

Get all insight groups

`client.ai().conversations().insightGroups().retrieveInsightGroups()` — `GET /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightGroupRetrieveInsightGroupsPage;
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightGroupRetrieveInsightGroupsParams;

InsightGroupRetrieveInsightGroupsPage page = client.ai().conversations().insightGroups().retrieveInsightGroups();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create Insight Template Group

Create a new insight group

`client.ai().conversations().insightGroups().insightGroups()` — `POST /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `description` | string | No |  |
| `webhook` | string | No |  |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightGroupInsightGroupsParams;
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightTemplateGroupDetail;

InsightGroupInsightGroupsParams params = InsightGroupInsightGroupsParams.builder()
    .name("my-resource")
    .build();
InsightTemplateGroupDetail insightTemplateGroupDetail = client.ai().conversations().insightGroups().insightGroups(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template Group

Get insight group by ID

`client.ai().conversations().insightGroups().retrieve()` — `GET /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string (UUID) | Yes | The ID of the insight group |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightGroupRetrieveParams;
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightTemplateGroupDetail;

InsightTemplateGroupDetail insightTemplateGroupDetail = client.ai().conversations().insightGroups().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Insight Template Group

Update an insight template group

`client.ai().conversations().insightGroups().update()` — `PUT /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string (UUID) | Yes | The ID of the insight group |
| `name` | string | No |  |
| `description` | string | No |  |
| `webhook` | string | No |  |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightGroupUpdateParams;
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightTemplateGroupDetail;

InsightTemplateGroupDetail insightTemplateGroupDetail = client.ai().conversations().insightGroups().update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Insight Template Group

Delete insight group by ID

`client.ai().conversations().insightGroups().delete()` — `DELETE /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string (UUID) | Yes | The ID of the insight group |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.InsightGroupDeleteParams;

client.ai().conversations().insightGroups().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Assign Insight Template To Group

Assign an insight to a group

`client.ai().conversations().insightGroups().insights().assign()` — `POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string (UUID) | Yes | The ID of the insight group |
| `insightId` | string (UUID) | Yes | The ID of the insight |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.insights.InsightAssignParams;

InsightAssignParams params = InsightAssignParams.builder()
    .groupId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .insightId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
client.ai().conversations().insightGroups().insights().assign(params);
```

## Unassign Insight Template From Group

Remove an insight from a group

`client.ai().conversations().insightGroups().insights().deleteUnassign()` — `DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string (UUID) | Yes | The ID of the insight group |
| `insightId` | string (UUID) | Yes | The ID of the insight |

```java
import com.telnyx.sdk.models.ai.conversations.insightgroups.insights.InsightDeleteUnassignParams;

InsightDeleteUnassignParams params = InsightDeleteUnassignParams.builder()
    .groupId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .insightId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
client.ai().conversations().insightGroups().insights().deleteUnassign(params);
```

## Get Insight Templates

Get all insights

`client.ai().conversations().insights().list()` — `GET /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ai.conversations.insights.InsightListPage;
import com.telnyx.sdk.models.ai.conversations.insights.InsightListParams;

InsightListPage page = client.ai().conversations().insights().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create Insight Template

Create a new insight

`client.ai().conversations().insights().create()` — `POST /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instructions` | string | Yes |  |
| `name` | string | Yes |  |
| `webhook` | string | No |  |
| `jsonSchema` | object | No | If specified, the output will follow the JSON schema. |

```java
import com.telnyx.sdk.models.ai.conversations.insights.InsightCreateParams;
import com.telnyx.sdk.models.ai.conversations.insights.InsightTemplateDetail;

InsightCreateParams params = InsightCreateParams.builder()
    .instructions("You are a helpful assistant.")
    .name("my-resource")
    .build();
InsightTemplateDetail insightTemplateDetail = client.ai().conversations().insights().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template

Get insight by ID

`client.ai().conversations().insights().retrieve()` — `GET /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insightId` | string (UUID) | Yes | The ID of the insight |

```java
import com.telnyx.sdk.models.ai.conversations.insights.InsightRetrieveParams;
import com.telnyx.sdk.models.ai.conversations.insights.InsightTemplateDetail;

InsightTemplateDetail insightTemplateDetail = client.ai().conversations().insights().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Insight Template

Update an insight template

`client.ai().conversations().insights().update()` — `PUT /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insightId` | string (UUID) | Yes | The ID of the insight |
| `instructions` | string | No |  |
| `name` | string | No |  |
| `webhook` | string | No |  |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.conversations.insights.InsightTemplateDetail;
import com.telnyx.sdk.models.ai.conversations.insights.InsightUpdateParams;

InsightTemplateDetail insightTemplateDetail = client.ai().conversations().insights().update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Insight Template

Delete insight by ID

`client.ai().conversations().insights().delete()` — `DELETE /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insightId` | string (UUID) | Yes | The ID of the insight |

```java
import com.telnyx.sdk.models.ai.conversations.insights.InsightDeleteParams;

client.ai().conversations().insights().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`client.ai().conversations().retrieve()` — `GET /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string (UUID) | Yes | The ID of the conversation to retrieve |

```java
import com.telnyx.sdk.models.ai.conversations.ConversationRetrieveParams;
import com.telnyx.sdk.models.ai.conversations.ConversationRetrieveResponse;

ConversationRetrieveResponse conversation = client.ai().conversations().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update conversation metadata

Update metadata for a specific conversation.

`client.ai().conversations().update()` — `PUT /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string (UUID) | Yes | The ID of the conversation to update |
| `metadata` | object | No | Metadata associated with the conversation. |

```java
import com.telnyx.sdk.models.ai.conversations.ConversationUpdateParams;
import com.telnyx.sdk.models.ai.conversations.ConversationUpdateResponse;

ConversationUpdateResponse conversation = client.ai().conversations().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a conversation

Delete a specific conversation by its ID.

`client.ai().conversations().delete()` — `DELETE /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string (UUID) | Yes | The ID of the conversation to delete |

```java
import com.telnyx.sdk.models.ai.conversations.ConversationDeleteParams;

client.ai().conversations().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`client.ai().conversations().retrieveConversationsInsights()` — `GET /ai/conversations/{conversation_id}/conversations-insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.conversations.ConversationRetrieveConversationsInsightsParams;
import com.telnyx.sdk.models.ai.conversations.ConversationRetrieveConversationsInsightsResponse;

ConversationRetrieveConversationsInsightsResponse response = client.ai().conversations().retrieveConversationsInsights("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Message

Add a new message to the conversation. Used to insert a new messages to a conversation manually ( without using chat endpoint )

`client.ai().conversations().addMessage()` — `POST /ai/conversations/{conversation_id}/message`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | Yes |  |
| `conversationId` | string (UUID) | Yes | The ID of the conversation |
| `toolCallId` | string (UUID) | No |  |
| `content` | string | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.conversations.ConversationAddMessageParams;

ConversationAddMessageParams params = ConversationAddMessageParams.builder()
    .conversationId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .role("user")
    .build();
client.ai().conversations().addMessage(params);
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`client.ai().conversations().messages().list()` — `GET /ai/conversations/{conversation_id}/messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.conversations.messages.MessageListParams;
import com.telnyx.sdk.models.ai.conversations.messages.MessageListResponse;

MessageListResponse messages = client.ai().conversations().messages().list("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.text, response.data.created_at, response.data.role`

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string. Defaults to `queued` and `processing`.

`client.ai().embeddings().list()` — `GET /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | array[string] | No | List of task statuses i.e. |

```java
import com.telnyx.sdk.models.ai.embeddings.EmbeddingListParams;
import com.telnyx.sdk.models.ai.embeddings.EmbeddingListResponse;

EmbeddingListResponse embeddings = client.ai().embeddings().list();
```

Key response fields: `response.data.status, response.data.created_at, response.data.bucket`

## Embed documents

Perform embedding on a Telnyx Storage Bucket using an embedding model. The current supported file types are:
- PDF
- HTML
- txt/unstructured text files
- json
- csv
- audio / video (mp3, mp4, mpeg, mpga, m4a, wav, or webm ) - Max of 100mb file size. Any files not matching the above types will be attempted to be embedded as unstructured text.

`client.ai().embeddings().create()` — `POST /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes |  |
| `documentChunkSize` | integer | No |  |
| `documentChunkOverlapSize` | integer | No |  |
| `embeddingModel` | object | No |  |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ai.embeddings.EmbeddingCreateParams;
import com.telnyx.sdk.models.ai.embeddings.EmbeddingResponse;

EmbeddingCreateParams params = EmbeddingCreateParams.builder()
    .bucketName("my-bucket")
    .build();
EmbeddingResponse embeddingResponse = client.ai().embeddings().create(params);
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## List embedded buckets

Get all embedding buckets for a user.

`client.ai().embeddings().buckets().list()` — `GET /ai/embeddings/buckets`

```java
import com.telnyx.sdk.models.ai.embeddings.buckets.BucketListParams;
import com.telnyx.sdk.models.ai.embeddings.buckets.BucketListResponse;

BucketListResponse buckets = client.ai().embeddings().buckets().list();
```

Key response fields: `response.data.buckets`

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`client.ai().embeddings().buckets().retrieve()` — `GET /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes |  |

```java
import com.telnyx.sdk.models.ai.embeddings.buckets.BucketRetrieveParams;
import com.telnyx.sdk.models.ai.embeddings.buckets.BucketRetrieveResponse;

BucketRetrieveResponse bucket = client.ai().embeddings().buckets().retrieve("bucket_name");
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`client.ai().embeddings().buckets().delete()` — `DELETE /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes |  |

```java
import com.telnyx.sdk.models.ai.embeddings.buckets.BucketDeleteParams;

client.ai().embeddings().buckets().delete("bucket_name");
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query. Currently the only available distance metric is cosine similarity which will return a `distance` between 0 and 1. The lower the distance, the more similar the returned document chunks are to the query.

`client.ai().embeddings().similaritySearch()` — `POST /ai/embeddings/similarity-search`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes |  |
| `query` | string | Yes |  |
| `numOfDocs` | integer | No |  |

```java
import com.telnyx.sdk.models.ai.embeddings.EmbeddingSimilaritySearchParams;
import com.telnyx.sdk.models.ai.embeddings.EmbeddingSimilaritySearchResponse;

EmbeddingSimilaritySearchParams params = EmbeddingSimilaritySearchParams.builder()
    .bucketName("my-bucket")
    .query("What is Telnyx?")
    .build();
EmbeddingSimilaritySearchResponse response = client.ai().embeddings().similaritySearch(params);
```

Key response fields: `response.data.distance, response.data.document_chunk, response.data.metadata`

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain. The process crawls and loads content from the main URL and its linked pages into a Telnyx Cloud Storage bucket.

`client.ai().embeddings().url()` — `POST /ai/embeddings/url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | Yes | The URL of the webpage to embed |
| `bucketName` | string | Yes | Name of the bucket to store the embeddings. |

```java
import com.telnyx.sdk.models.ai.embeddings.EmbeddingResponse;
import com.telnyx.sdk.models.ai.embeddings.EmbeddingUrlParams;

EmbeddingUrlParams params = EmbeddingUrlParams.builder()
    .bucketName("my-bucket")
    .url("https://example.com/resource")
    .build();
EmbeddingResponse embeddingResponse = client.ai().embeddings().url(params);
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## Get an embedding task's status

Check the status of a current embedding task. Will be one of the following:
- `queued` - Task is waiting to be picked up by a worker
- `processing` - The embedding task is running
- `success` - Task completed successfully and the bucket is embedded
- `failure` - Task failed and no files were embedded successfully
- `partial_success` - Some files were embedded successfully, but at least one failed

`client.ai().embeddings().retrieve()` — `GET /ai/embeddings/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.embeddings.EmbeddingRetrieveParams;
import com.telnyx.sdk.models.ai.embeddings.EmbeddingRetrieveResponse;

EmbeddingRetrieveResponse embedding = client.ai().embeddings().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`client.ai().fineTuning().jobs().list()` — `GET /ai/fine_tuning/jobs`

```java
import com.telnyx.sdk.models.ai.finetuning.jobs.JobListParams;
import com.telnyx.sdk.models.ai.finetuning.jobs.JobListResponse;

JobListResponse jobs = client.ai().fineTuning().jobs().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a fine tuning job

Create a new fine tuning job.

`client.ai().fineTuning().jobs().create()` — `POST /ai/fine_tuning/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | The base model that is being fine-tuned. |
| `trainingFile` | string | Yes | The storage bucket or object used for training. |
| `suffix` | string | No | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | No | The hyperparameters used for the fine-tuning job. |

```java
import com.telnyx.sdk.models.ai.finetuning.jobs.FineTuningJob;
import com.telnyx.sdk.models.ai.finetuning.jobs.JobCreateParams;

JobCreateParams params = JobCreateParams.builder()
    .model("meta-llama/Meta-Llama-3.1-8B-Instruct")
    .trainingFile("training-data.jsonl")
    .build();
FineTuningJob fineTuningJob = client.ai().fineTuning().jobs().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`client.ai().fineTuning().jobs().retrieve()` — `GET /ai/fine_tuning/jobs/{job_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.finetuning.jobs.FineTuningJob;
import com.telnyx.sdk.models.ai.finetuning.jobs.JobRetrieveParams;

FineTuningJob fineTuningJob = client.ai().fineTuning().jobs().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a fine tuning job

Cancel a fine tuning job.

`client.ai().fineTuning().jobs().cancel()` — `POST /ai/fine_tuning/jobs/{job_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.finetuning.jobs.FineTuningJob;
import com.telnyx.sdk.models.ai.finetuning.jobs.JobCancelParams;

FineTuningJob fineTuningJob = client.ai().fineTuning().jobs().cancel("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.    **Note**: Model `id`'s will be in the form `{source}/{model_name}`. For example `openai/gpt-4` or `mistralai/Mistral-7B-Instruct-v0.1` consistent with HuggingFace naming conventions.

`client.ai().retrieveModels()` — `GET /ai/models`

```java
import com.telnyx.sdk.models.ai.AiRetrieveModelsParams;
import com.telnyx.sdk.models.ai.AiRetrieveModelsResponse;

AiRetrieveModelsResponse response = client.ai().retrieveModels();
```

Key response fields: `response.data.id, response.data.created, response.data.object`

## Create embeddings

Creates an embedding vector representing the input text. This endpoint is compatible with the [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings) and may be used with the OpenAI JS or Python SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.

`client.ai().openai().embeddings().createEmbeddings()` — `POST /ai/openai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | object | Yes | Input text to embed. |
| `model` | string | Yes | ID of the model to use. |
| `encodingFormat` | enum (float, base64) | No | The format to return the embeddings in. |
| `dimensions` | integer | No | The number of dimensions the resulting output embeddings sho... |
| `user` | string | No | A unique identifier representing your end-user for monitorin... |

```java
import com.telnyx.sdk.models.ai.openai.embeddings.EmbeddingCreateEmbeddingsParams;
import com.telnyx.sdk.models.ai.openai.embeddings.EmbeddingCreateEmbeddingsResponse;

EmbeddingCreateEmbeddingsParams params = EmbeddingCreateEmbeddingsParams.builder()
    .input("The quick brown fox jumps over the lazy dog")
    .model("thenlper/gte-large")
    .build();
EmbeddingCreateEmbeddingsResponse response = client.ai().openai().embeddings().createEmbeddings(params);
```

Key response fields: `response.data.data, response.data.model, response.data.object`

## List embedding models

Returns a list of available embedding models. This endpoint is compatible with the OpenAI Models API format.

`client.ai().openai().embeddings().listEmbeddingModels()` — `GET /ai/openai/embeddings/models`

```java
import com.telnyx.sdk.models.ai.openai.embeddings.EmbeddingListEmbeddingModelsParams;
import com.telnyx.sdk.models.ai.openai.embeddings.EmbeddingListEmbeddingModelsResponse;

EmbeddingListEmbeddingModelsResponse response = client.ai().openai().embeddings().listEmbeddingModels();
```

Key response fields: `response.data.id, response.data.created, response.data.object`

## Summarize file content

Generate a summary of a file's contents. Supports the following text formats: 
- PDF, HTML, txt, json, csv

 Supports the following media formats (billed for both the transcription and summary): 
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
- Up to 100 MB

`client.ai().summarize()` — `POST /ai/summarize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | The name of the bucket that contains the file to be summariz... |
| `filename` | string | Yes | The name of the file to be summarized. |
| `systemPrompt` | string | No | A system prompt to guide the summary generation. |

```java
import com.telnyx.sdk.models.ai.AiSummarizeParams;
import com.telnyx.sdk.models.ai.AiSummarizeResponse;

AiSummarizeParams params = AiSummarizeParams.builder()
    .bucket("my-bucket")
    .filename("data.csv")
    .build();
AiSummarizeResponse response = client.ai().summarize(params);
```

Key response fields: `response.data.summary`

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`client.legacy().reporting().batchDetailRecords().speechToText().list()` — `GET /legacy/reporting/batch_detail_records/speech_to_text`

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextListParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextListResponse;

SpeechToTextListResponse speechToTexts = client.legacy().reporting().batchDetailRecords().speechToText().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`client.legacy().reporting().batchDetailRecords().speechToText().create()` — `POST /legacy/reporting/batch_detail_records/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (date-time) | Yes | Start date in ISO format with timezone |
| `endDate` | string (date-time) | Yes | End date in ISO format with timezone (date range must be up ... |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextCreateParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextCreateResponse;
import java.time.OffsetDateTime;

SpeechToTextCreateParams params = SpeechToTextCreateParams.builder()
    .endDate(OffsetDateTime.parse("2020-07-01T00:00:00-06:00"))
    .startDate(OffsetDateTime.parse("2020-07-01T00:00:00-06:00"))
    .build();
SpeechToTextCreateResponse speechToText = client.legacy().reporting().batchDetailRecords().speechToText().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`client.legacy().reporting().batchDetailRecords().speechToText().retrieve()` — `GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextRetrieveParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextRetrieveResponse;

SpeechToTextRetrieveResponse speechToText = client.legacy().reporting().batchDetailRecords().speechToText().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`client.legacy().reporting().batchDetailRecords().speechToText().delete()` — `DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextDeleteParams;
import com.telnyx.sdk.models.legacy.reporting.batchdetailrecords.speechtotext.SpeechToTextDeleteResponse;

SpeechToTextDeleteResponse speechToText = client.legacy().reporting().batchDetailRecords().speechToText().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`client.legacy().reporting().usageReports().retrieveSpeechToText()` — `GET /legacy/reporting/usage_reports/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (date-time) | No |  |
| `endDate` | string (date-time) | No |  |

```java
import com.telnyx.sdk.models.legacy.reporting.usagereports.UsageReportRetrieveSpeechToTextParams;
import com.telnyx.sdk.models.legacy.reporting.usagereports.UsageReportRetrieveSpeechToTextResponse;

UsageReportRetrieveSpeechToTextResponse response = client.legacy().reporting().usageReports().retrieveSpeechToText();
```

Key response fields: `response.data.data`

## Generate speech from text

Generate synthesized speech audio from text input. Returns audio in the requested format (binary audio stream, base64-encoded JSON, or an audio URL for later retrieval). Authentication is provided via the standard `Authorization: Bearer ` header.

`client.textToSpeech().generate()` — `POST /text-to-speech/speech`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | TTS provider. |
| `textType` | enum (text, ssml) | No | Text type. |
| `outputType` | enum (binary_output, base64_output) | No | Determines the response format. |
| ... | | | +12 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.texttospeech.TextToSpeechGenerateParams;
import com.telnyx.sdk.models.texttospeech.TextToSpeechGenerateResponse;

TextToSpeechGenerateResponse response = client.textToSpeech().generate();
```

Key response fields: `response.data.base64_audio`

## List available voices

Retrieve a list of available voices from one or all TTS providers. When `provider` is specified, returns voices for that provider only. Otherwise, returns voices from all providers.

`client.textToSpeech().listVoices()` — `GET /text-to-speech/voices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | Filter voices by provider. |
| `apiKey` | string | No | API key for providers that require one to list voices (e.g. |

```java
import com.telnyx.sdk.models.texttospeech.TextToSpeechListVoicesParams;
import com.telnyx.sdk.models.texttospeech.TextToSpeechListVoicesResponse;

TextToSpeechListVoicesResponse response = client.textToSpeech().listVoices();
```

Key response fields: `response.data.voices`

---

# AI Inference (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Transcribe speech to text

| Field | Type |
|-------|------|
| `duration` | number |
| `segments` | array[object] |
| `text` | string |

**Returned by:** List conversations, Create a conversation, Get a conversation, Update conversation metadata

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `last_message_at` | date-time |
| `metadata` | object |
| `name` | string |

**Returned by:** Get Insight Template Groups, Create Insight Template Group, Get Insight Template Group, Update Insight Template Group

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `description` | string |
| `id` | uuid |
| `insights` | array[object] |
| `name` | string |
| `webhook` | string |

**Returned by:** Get Insight Templates, Create Insight Template, Get Insight Template, Update Insight Template

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `insight_type` | enum: custom, default |
| `instructions` | string |
| `json_schema` | object |
| `name` | string |
| `webhook` | string |

**Returned by:** Get insights for a conversation

| Field | Type |
|-------|------|
| `conversation_insights` | array[object] |
| `created_at` | date-time |
| `id` | string |
| `status` | enum: pending, in_progress, completed, failed |

**Returned by:** Get conversation messages

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `role` | enum: user, assistant, tool |
| `sent_at` | date-time |
| `text` | string |
| `tool_calls` | array[object] |

**Returned by:** Get Tasks by Status

| Field | Type |
|-------|------|
| `bucket` | string |
| `created_at` | date-time |
| `finished_at` | date-time |
| `status` | enum: queued, processing, success, failure, partial_success |
| `task_id` | string |
| `task_name` | string |
| `user_id` | string |

**Returned by:** Embed documents, Embed URL content

| Field | Type |
|-------|------|
| `created_at` | string |
| `finished_at` | string \| null |
| `status` | string |
| `task_id` | uuid |
| `task_name` | string |
| `user_id` | uuid |

**Returned by:** List embedded buckets

| Field | Type |
|-------|------|
| `buckets` | array[string] |

**Returned by:** Get file-level embedding statuses for a bucket

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `error_reason` | string |
| `filename` | string |
| `last_embedded_at` | date-time |
| `status` | string |
| `updated_at` | date-time |

**Returned by:** Search for documents

| Field | Type |
|-------|------|
| `distance` | number |
| `document_chunk` | string |
| `metadata` | object |

**Returned by:** Get an embedding task's status

| Field | Type |
|-------|------|
| `created_at` | string |
| `finished_at` | string |
| `status` | enum: queued, processing, success, failure, partial_success |
| `task_id` | uuid |
| `task_name` | string |

**Returned by:** List fine tuning jobs, Create a fine tuning job, Get a fine tuning job, Cancel a fine tuning job

| Field | Type |
|-------|------|
| `created_at` | integer |
| `finished_at` | integer \| null |
| `hyperparameters` | object |
| `id` | string |
| `model` | string |
| `organization_id` | string |
| `status` | enum: queued, running, succeeded, failed, cancelled |
| `trained_tokens` | integer \| null |
| `training_file` | string |

**Returned by:** Get available models, List embedding models

| Field | Type |
|-------|------|
| `created` | integer |
| `id` | string |
| `object` | string |
| `owned_by` | string |

**Returned by:** Create embeddings

| Field | Type |
|-------|------|
| `data` | array[object] |
| `model` | string |
| `object` | string |
| `usage` | object |

**Returned by:** Summarize file content

| Field | Type |
|-------|------|
| `summary` | string |

**Returned by:** Get all Speech to Text batch report requests, Create a new Speech to Text batch report request, Get a specific Speech to Text batch report request, Delete a Speech to Text batch report request

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `download_link` | string |
| `end_date` | date-time |
| `id` | string |
| `record_type` | string |
| `start_date` | date-time |
| `status` | enum: PENDING, COMPLETE, FAILED, EXPIRED |

**Returned by:** Get speech to text usage report

| Field | Type |
|-------|------|
| `data` | object |

**Returned by:** Generate speech from text

| Field | Type |
|-------|------|
| `base64_audio` | string |

**Returned by:** List available voices

| Field | Type |
|-------|------|
| `voices` | array[object] |

## Optional Parameters

### Create a chat completion — `client.ai().chat().createCompletion()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | The language model to chat with. |
| `apiKeyRef` | string | If you are using an external inference provider like xAI or OpenAI, this fiel... |
| `stream` | boolean | Whether or not to stream data-only server-sent events as they become available. |
| `temperature` | number | Adjusts the "creativity" of the model. |
| `maxTokens` | integer | Maximum number of completion tokens the model should generate. |
| `tools` | array[object] | The `function` tool type follows the same schema as the [OpenAI Chat Completi... |
| `toolChoice` | enum (none, auto, required) |  |
| `responseFormat` | object |  |
| `guidedJson` | object | Must be a valid JSON schema. |
| `guidedRegex` | string | If specified, the output will follow the regex pattern. |
| `guidedChoice` | array[string] | If specified, the output will be exactly one of the choices. |
| `minP` | number | This is an alternative to `top_p` that [many prefer](https://github.com/huggi... |
| `n` | number | This will return multiple choices for you instead of a single chat completion. |
| `useBeamSearch` | boolean | Setting this to `true` will allow the model to [explore more completion optio... |
| `bestOf` | integer | This is used with `use_beam_search` to determine how many candidate beams to ... |
| `lengthPenalty` | number | This is used with `use_beam_search` to prefer shorter or longer completions. |
| `earlyStopping` | boolean | This is used with `use_beam_search`. |
| `logprobs` | boolean | Whether to return log probabilities of the output tokens or not. |
| `topLogprobs` | integer | This is used with `logprobs`. |
| `frequencyPenalty` | number | Higher values will penalize the model from repeating the same output tokens. |
| `presencePenalty` | number | Higher values will penalize the model from repeating the same output tokens. |
| `topP` | number | An alternative or complement to `temperature`. |
| `enableThinking` | boolean | Whether to enable the thinking/reasoning phase for models that support it (e.... |

### Create a conversation — `client.ai().conversations().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `metadata` | object | Metadata associated with the conversation. |

### Create Insight Template Group — `client.ai().conversations().insightGroups().insightGroups()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |
| `webhook` | string |  |

### Update Insight Template Group — `client.ai().conversations().insightGroups().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `description` | string |  |
| `webhook` | string |  |

### Create Insight Template — `client.ai().conversations().insights().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook` | string |  |
| `jsonSchema` | object | If specified, the output will follow the JSON schema. |

### Update Insight Template — `client.ai().conversations().insights().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `instructions` | string |  |
| `name` | string |  |
| `webhook` | string |  |
| `jsonSchema` | object |  |

### Update conversation metadata — `client.ai().conversations().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `metadata` | object | Metadata associated with the conversation. |

### Create Message — `client.ai().conversations().addMessage()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | string |  |
| `name` | string |  |
| `toolChoice` | object |  |
| `toolCalls` | array[object] |  |
| `toolCallId` | string (UUID) |  |
| `sentAt` | string (date-time) |  |
| `metadata` | object |  |

### Embed documents — `client.ai().embeddings().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `documentChunkSize` | integer |  |
| `documentChunkOverlapSize` | integer |  |
| `embeddingModel` | object |  |
| `loader` | object |  |

### Search for documents — `client.ai().embeddings().similaritySearch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `numOfDocs` | integer |  |

### Create a fine tuning job — `client.ai().fineTuning().jobs().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `suffix` | string | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | The hyperparameters used for the fine-tuning job. |

### Create embeddings — `client.ai().openai().embeddings().createEmbeddings()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `encodingFormat` | enum (float, base64) | The format to return the embeddings in. |
| `dimensions` | integer | The number of dimensions the resulting output embeddings should have. |
| `user` | string | A unique identifier representing your end-user for monitoring and abuse detec... |

### Summarize file content — `client.ai().summarize()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `systemPrompt` | string | A system prompt to guide the summary generation. |

### Generate speech from text — `client.textToSpeech().generate()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `voice` | string | Voice identifier in the format `provider.model_id.voice_id` or `provider.voic... |
| `text` | string | The text to convert to speech. |
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | TTS provider. |
| `language` | string | Language code (e.g. |
| `textType` | enum (text, ssml) | Text type. |
| `outputType` | enum (binary_output, base64_output) | Determines the response format. |
| `disableCache` | boolean | When `true`, bypass the audio cache and generate fresh audio. |
| `voiceSettings` | object | Provider-specific voice settings. |
| `aws` | object | AWS Polly provider-specific parameters. |
| `telnyx` | object | Telnyx provider-specific parameters. |
| `azure` | object | Azure Cognitive Services provider-specific parameters. |
| `elevenlabs` | object | ElevenLabs provider-specific parameters. |
| `minimax` | object | Minimax provider-specific parameters. |
| `rime` | object | Rime provider-specific parameters. |
| `resemble` | object | Resemble AI provider-specific parameters. |
