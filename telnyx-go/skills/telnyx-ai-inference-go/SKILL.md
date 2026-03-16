---
name: telnyx-ai-inference-go
description: >-
  Telnyx LLM inference, embeddings, and AI analytics for call insights and
  summaries.
metadata:
  author: telnyx
  product: ai-inference
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Inference - Go

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Chat completion**: `client.Ai.Chat.Completions.Create(ctx, params)`
2. **Generate embeddings**: `client.Ai.Embeddings.Create(ctx, params)`
3. **Text-to-speech**: `client.Ai.Tts.Create(ctx, params)`

### Common mistakes

- NEVER use non-Telnyx model names (e.g., 'gpt-4o') — only models listed at api.telnyx.com/v2/ai/models are available. Use client.ai.models.list() to see available models
- ALWAYS set max_tokens to prevent runaway generation — omitting it may consume excessive credits
- For streaming responses, ALWAYS iterate over the SSE stream — do not try to read the entire response body at once
- Telnyx AI Inference is OpenAI-compatible — use the same request/response format but with Telnyx base URL and API key

**Related skills**: telnyx-ai-assistants-go

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

result, err := client.Ai.Chat.Completions.Create(ctx, params)
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

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Transcribe speech to text

Transcribe speech to text. This endpoint is consistent with the [OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/createTranscription) and may be used with the OpenAI JS or Python SDK.

`client.AI.Audio.Transcribe()` — `POST /ai/audio/transcriptions`

```go
	response, err := client.AI.Audio.Transcribe(context.Background(), telnyx.AIAudioTranscribeParams{
		Model: telnyx.AIAudioTranscribeParamsModelDistilWhisperDistilLargeV2,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Text)
```

Key response fields: `response.data.text, response.data.duration, response.data.segments`

## Create a chat completion

Chat with a language model. This endpoint is consistent with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) and may be used with the OpenAI JS or Python SDK.

`client.AI.Chat.NewCompletion()` — `POST /ai/chat/completions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Messages` | array[object] | Yes | A list of the previous chat messages for context. |
| `ToolChoice` | enum (none, auto, required) | No |  |
| `Model` | string | No | The language model to chat with. |
| `ApiKeyRef` | string | No | If you are using an external inference provider like xAI or ... |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.AI.Chat.NewCompletion(context.Background(), telnyx.AIChatNewCompletionParams{
		Messages: []telnyx.AIChatNewCompletionParamsMessage{{
			Role: "system",
			Content: telnyx.AIChatNewCompletionParamsMessageContentUnion{
				OfString: telnyx.String("You are a friendly chatbot."),
			},
		}, {
			Role: "user",
			Content: telnyx.AIChatNewCompletionParamsMessageContentUnion{
				OfString: telnyx.String("Hello, world!"),
			},
		}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List conversations

Retrieve a list of all AI conversations configured by the user. Supports [PostgREST-style query parameters](https://postgrest.org/en/stable/api.html#horizontal-filtering-rows) for filtering. Examples are included for the standard metadata fields, but you can filter on any field in the metadata JSON object.

`client.AI.Conversations.List()` — `GET /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Metadata->assistantId` | string (UUID) | No | Filter by assistant ID (e.g., `metadata->assistant_id=eq.ass... |
| `Metadata->callControlId` | string (UUID) | No | Filter by call control ID (e.g., `metadata->call_control_id=... |
| `Id` | string (UUID) | No | Filter by conversation ID (e.g. |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```go
	conversations, err := client.AI.Conversations.List(context.Background(), telnyx.AIConversationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversations.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a conversation

Create a new AI Conversation.

`client.AI.Conversations.New()` — `POST /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | No |  |
| `Metadata` | object | No | Metadata associated with the conversation. |

```go
	conversation, err := client.AI.Conversations.New(context.Background(), telnyx.AIConversationNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversation.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template Groups

Get all insight groups

`client.AI.Conversations.InsightGroups.GetInsightGroups()` — `GET /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AI.Conversations.InsightGroups.GetInsightGroups(context.Background(), telnyx.AIConversationInsightGroupGetInsightGroupsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create Insight Template Group

Create a new insight group

`client.AI.Conversations.InsightGroups.InsightGroups()` — `POST /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes |  |
| `Description` | string | No |  |
| `Webhook` | string | No |  |

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.InsightGroups(context.Background(), telnyx.AIConversationInsightGroupInsightGroupsParams{
		Name: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template Group

Get insight group by ID

`client.AI.Conversations.InsightGroups.Get()` — `GET /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GroupId` | string (UUID) | Yes | The ID of the insight group |

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Insight Template Group

Update an insight template group

`client.AI.Conversations.InsightGroups.Update()` — `PUT /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GroupId` | string (UUID) | Yes | The ID of the insight group |
| `Name` | string | No |  |
| `Description` | string | No |  |
| `Webhook` | string | No |  |

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightGroupUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Insight Template Group

Delete insight group by ID

`client.AI.Conversations.InsightGroups.Delete()` — `DELETE /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GroupId` | string (UUID) | Yes | The ID of the insight group |

```go
	err := client.AI.Conversations.InsightGroups.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Assign Insight Template To Group

Assign an insight to a group

`client.AI.Conversations.InsightGroups.Insights.Assign()` — `POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GroupId` | string (UUID) | Yes | The ID of the insight group |
| `InsightId` | string (UUID) | Yes | The ID of the insight |

```go
	err := client.AI.Conversations.InsightGroups.Insights.Assign(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightGroupInsightAssignParams{
			GroupID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Unassign Insight Template From Group

Remove an insight from a group

`client.AI.Conversations.InsightGroups.Insights.DeleteUnassign()` — `DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GroupId` | string (UUID) | Yes | The ID of the insight group |
| `InsightId` | string (UUID) | Yes | The ID of the insight |

```go
	err := client.AI.Conversations.InsightGroups.Insights.DeleteUnassign(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightGroupInsightDeleteUnassignParams{
			GroupID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Get Insight Templates

Get all insights

`client.AI.Conversations.Insights.List()` — `GET /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AI.Conversations.Insights.List(context.Background(), telnyx.AIConversationInsightListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create Insight Template

Create a new insight

`client.AI.Conversations.Insights.New()` — `POST /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Instructions` | string | Yes |  |
| `Name` | string | Yes |  |
| `Webhook` | string | No |  |
| `JsonSchema` | object | No | If specified, the output will follow the JSON schema. |

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.New(context.Background(), telnyx.AIConversationInsightNewParams{
		Instructions: "You are a helpful assistant.",
		Name: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template

Get insight by ID

`client.AI.Conversations.Insights.Get()` — `GET /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `InsightId` | string (UUID) | Yes | The ID of the insight |

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Insight Template

Update an insight template

`client.AI.Conversations.Insights.Update()` — `PUT /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `InsightId` | string (UUID) | Yes | The ID of the insight |
| `Instructions` | string | No |  |
| `Name` | string | No |  |
| `Webhook` | string | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Insight Template

Delete insight by ID

`client.AI.Conversations.Insights.Delete()` — `DELETE /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `InsightId` | string (UUID) | Yes | The ID of the insight |

```go
	err := client.AI.Conversations.Insights.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`client.AI.Conversations.Get()` — `GET /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConversationId` | string (UUID) | Yes | The ID of the conversation to retrieve |

```go
	conversation, err := client.AI.Conversations.Get(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversation.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update conversation metadata

Update metadata for a specific conversation.

`client.AI.Conversations.Update()` — `PUT /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConversationId` | string (UUID) | Yes | The ID of the conversation to update |
| `Metadata` | object | No | Metadata associated with the conversation. |

```go
	conversation, err := client.AI.Conversations.Update(
		context.Background(),
		"conversation_id",
		telnyx.AIConversationUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversation.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a conversation

Delete a specific conversation by its ID.

`client.AI.Conversations.Delete()` — `DELETE /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConversationId` | string (UUID) | Yes | The ID of the conversation to delete |

```go
	err := client.AI.Conversations.Delete(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`client.AI.Conversations.GetConversationsInsights()` — `GET /ai/conversations/{conversation_id}/conversations-insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConversationId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Conversations.GetConversationsInsights(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Message

Add a new message to the conversation. Used to insert a new messages to a conversation manually ( without using chat endpoint )

`client.AI.Conversations.AddMessage()` — `POST /ai/conversations/{conversation_id}/message`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Role` | string | Yes |  |
| `ConversationId` | string (UUID) | Yes | The ID of the conversation |
| `ToolCallId` | string (UUID) | No |  |
| `Content` | string | No |  |
| `Name` | string | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	err := client.AI.Conversations.AddMessage(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationAddMessageParams{
			Role: "user",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`client.AI.Conversations.Messages.List()` — `GET /ai/conversations/{conversation_id}/messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConversationId` | string (UUID) | Yes |  |

```go
	messages, err := client.AI.Conversations.Messages.List(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messages.Data)
```

Key response fields: `response.data.text, response.data.created_at, response.data.role`

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string. Defaults to `queued` and `processing`.

`client.AI.Embeddings.List()` — `GET /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Status` | array[string] | No | List of task statuses i.e. |

```go
	embeddings, err := client.AI.Embeddings.List(context.Background(), telnyx.AIEmbeddingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embeddings.Data)
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

`client.AI.Embeddings.New()` — `POST /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes |  |
| `DocumentChunkSize` | integer | No |  |
| `DocumentChunkOverlapSize` | integer | No |  |
| `EmbeddingModel` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	embeddingResponse, err := client.AI.Embeddings.New(context.Background(), telnyx.AIEmbeddingNewParams{
		BucketName: "my-bucket",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embeddingResponse.Data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## List embedded buckets

Get all embedding buckets for a user.

`client.AI.Embeddings.Buckets.List()` — `GET /ai/embeddings/buckets`

```go
	buckets, err := client.AI.Embeddings.Buckets.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", buckets.Data)
```

Key response fields: `response.data.buckets`

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`client.AI.Embeddings.Buckets.Get()` — `GET /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes |  |

```go
	bucket, err := client.AI.Embeddings.Buckets.Get(context.Background(), "bucket_name")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", bucket.Data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`client.AI.Embeddings.Buckets.Delete()` — `DELETE /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes |  |

```go
	err := client.AI.Embeddings.Buckets.Delete(context.Background(), "bucket_name")
	if err != nil {
		log.Fatal(err)
	}
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query. Currently the only available distance metric is cosine similarity which will return a `distance` between 0 and 1. The lower the distance, the more similar the returned document chunks are to the query.

`client.AI.Embeddings.SimilaritySearch()` — `POST /ai/embeddings/similarity-search`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes |  |
| `Query` | string | Yes |  |
| `NumOfDocs` | integer | No |  |

```go
	response, err := client.AI.Embeddings.SimilaritySearch(context.Background(), telnyx.AIEmbeddingSimilaritySearchParams{
		BucketName: "my-bucket",
		Query: "What is Telnyx?",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.distance, response.data.document_chunk, response.data.metadata`

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain. The process crawls and loads content from the main URL and its linked pages into a Telnyx Cloud Storage bucket.

`client.AI.Embeddings.URL()` — `POST /ai/embeddings/url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Url` | string (URL) | Yes | The URL of the webpage to embed |
| `BucketName` | string | Yes | Name of the bucket to store the embeddings. |

```go
	embeddingResponse, err := client.AI.Embeddings.URL(context.Background(), telnyx.AIEmbeddingURLParams{
		BucketName: "my-bucket",
		URL: "https://example.com/resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embeddingResponse.Data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## Get an embedding task's status

Check the status of a current embedding task. Will be one of the following:
- `queued` - Task is waiting to be picked up by a worker
- `processing` - The embedding task is running
- `success` - Task completed successfully and the bucket is embedded
- `failure` - Task failed and no files were embedded successfully
- `partial_success` - Some files were embedded successfully, but at least one failed

`client.AI.Embeddings.Get()` — `GET /ai/embeddings/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TaskId` | string (UUID) | Yes |  |

```go
	embedding, err := client.AI.Embeddings.Get(context.Background(), "task_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embedding.Data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`client.AI.FineTuning.Jobs.List()` — `GET /ai/fine_tuning/jobs`

```go
	jobs, err := client.AI.FineTuning.Jobs.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", jobs.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a fine tuning job

Create a new fine tuning job.

`client.AI.FineTuning.Jobs.New()` — `POST /ai/fine_tuning/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Model` | string | Yes | The base model that is being fine-tuned. |
| `TrainingFile` | string | Yes | The storage bucket or object used for training. |
| `Suffix` | string | No | Optional suffix to append to the fine tuned model's name. |
| `Hyperparameters` | object | No | The hyperparameters used for the fine-tuning job. |

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.New(context.Background(), telnyx.AIFineTuningJobNewParams{
		Model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
		TrainingFile: "training-data.jsonl",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`client.AI.FineTuning.Jobs.Get()` — `GET /ai/fine_tuning/jobs/{job_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `JobId` | string (UUID) | Yes |  |

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.Get(context.Background(), "job_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a fine tuning job

Cancel a fine tuning job.

`client.AI.FineTuning.Jobs.Cancel()` — `POST /ai/fine_tuning/jobs/{job_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `JobId` | string (UUID) | Yes |  |

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.Cancel(context.Background(), "job_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.    **Note**: Model `id`'s will be in the form `{source}/{model_name}`. For example `openai/gpt-4` or `mistralai/Mistral-7B-Instruct-v0.1` consistent with HuggingFace naming conventions.

`client.AI.GetModels()` — `GET /ai/models`

```go
	response, err := client.AI.GetModels(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created, response.data.object`

## Create embeddings

Creates an embedding vector representing the input text. This endpoint is compatible with the [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings) and may be used with the OpenAI JS or Python SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.

`client.AI.OpenAI.Embeddings.NewEmbeddings()` — `POST /ai/openai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Input` | object | Yes | Input text to embed. |
| `Model` | string | Yes | ID of the model to use. |
| `EncodingFormat` | enum (float, base64) | No | The format to return the embeddings in. |
| `Dimensions` | integer | No | The number of dimensions the resulting output embeddings sho... |
| `User` | string | No | A unique identifier representing your end-user for monitorin... |

```go
	response, err := client.AI.OpenAI.Embeddings.NewEmbeddings(context.Background(), telnyx.AIOpenAIEmbeddingNewEmbeddingsParams{
		Input: telnyx.AIOpenAIEmbeddingNewEmbeddingsParamsInputUnion{
			OfString: telnyx.String("The quick brown fox jumps over the lazy dog"),
		},
		Model: "thenlper/gte-large",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.data, response.data.model, response.data.object`

## List embedding models

Returns a list of available embedding models. This endpoint is compatible with the OpenAI Models API format.

`client.AI.OpenAI.Embeddings.ListEmbeddingModels()` — `GET /ai/openai/embeddings/models`

```go
	response, err := client.AI.OpenAI.Embeddings.ListEmbeddingModels(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created, response.data.object`

## Summarize file content

Generate a summary of a file's contents. Supports the following text formats: 
- PDF, HTML, txt, json, csv

 Supports the following media formats (billed for both the transcription and summary): 
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
- Up to 100 MB

`client.AI.Summarize()` — `POST /ai/summarize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Bucket` | string | Yes | The name of the bucket that contains the file to be summariz... |
| `Filename` | string | Yes | The name of the file to be summarized. |
| `SystemPrompt` | string | No | A system prompt to guide the summary generation. |

```go
	response, err := client.AI.Summarize(context.Background(), telnyx.AISummarizeParams{
		Bucket: "my-bucket",
		Filename: "data.csv",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.summary`

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`client.Legacy.Reporting.BatchDetailRecords.SpeechToText.List()` — `GET /legacy/reporting/batch_detail_records/speech_to_text`

```go
	speechToTexts, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToTexts.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`client.Legacy.Reporting.BatchDetailRecords.SpeechToText.New()` — `POST /legacy/reporting/batch_detail_records/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartDate` | string (date-time) | Yes | Start date in ISO format with timezone |
| `EndDate` | string (date-time) | Yes | End date in ISO format with timezone (date range must be up ... |

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.New(context.Background(), telnyx.LegacyReportingBatchDetailRecordSpeechToTextNewParams{
		EndDate:   time.Now(),
		StartDate: time.Now(),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Get()` — `GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Delete()` — `DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`client.Legacy.Reporting.UsageReports.GetSpeechToText()` — `GET /legacy/reporting/usage_reports/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StartDate` | string (date-time) | No |  |
| `EndDate` | string (date-time) | No |  |

```go
	response, err := client.Legacy.Reporting.UsageReports.GetSpeechToText(context.Background(), telnyx.LegacyReportingUsageReportGetSpeechToTextParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.data`

## Generate speech from text

Generate synthesized speech audio from text input. Returns audio in the requested format (binary audio stream, base64-encoded JSON, or an audio URL for later retrieval). Authentication is provided via the standard `Authorization: Bearer ` header.

`client.TextToSpeech.Generate()` — `POST /text-to-speech/speech`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | TTS provider. |
| `TextType` | enum (text, ssml) | No | Text type. |
| `OutputType` | enum (binary_output, base64_output) | No | Determines the response format. |
| ... | | | +13 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.TextToSpeech.Generate(context.Background(), telnyx.TextToSpeechGenerateParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Base64Audio)
```

Key response fields: `response.data.base64_audio`

## List available voices

Retrieve a list of available voices from one or all TTS providers. When `provider` is specified, returns voices for that provider only. Otherwise, returns voices from all providers.

`client.TextToSpeech.ListVoices()` — `GET /text-to-speech/voices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | Filter voices by provider. |
| `ApiKey` | string | No | API key for providers that require one to list voices (e.g. |

```go
	response, err := client.TextToSpeech.ListVoices(context.Background(), telnyx.TextToSpeechListVoicesParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Voices)
```

Key response fields: `response.data.voices`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
