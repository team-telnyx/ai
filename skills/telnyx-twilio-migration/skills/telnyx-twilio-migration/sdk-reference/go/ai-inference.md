<!-- SDK reference: telnyx-ai-inference-go -->

# Telnyx Ai Inference - Go

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

result, err := client.Messages.Send(ctx, params)
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

## Transcribe speech to text

Transcribe speech to text. This endpoint is consistent with the [OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/createTranscription) and may be used with the OpenAI JS or Python SDK.

`POST /ai/audio/transcriptions`

```go
	response, err := client.AI.Audio.Transcribe(context.Background(), telnyx.AIAudioTranscribeParams{
		Model: telnyx.AIAudioTranscribeParamsModelDistilWhisperDistilLargeV2,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Text)
```

Returns: `duration` (number), `segments` (array[object]), `text` (string)

## Create a chat completion

Chat with a language model. This endpoint is consistent with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) and may be used with the OpenAI JS or Python SDK.

`POST /ai/chat/completions` — Required: `messages`

Optional: `api_key_ref` (string), `best_of` (integer), `early_stopping` (boolean), `enable_thinking` (boolean), `frequency_penalty` (number), `guided_choice` (array[string]), `guided_json` (object), `guided_regex` (string), `length_penalty` (number), `logprobs` (boolean), `max_tokens` (integer), `min_p` (number), `model` (string), `n` (number), `presence_penalty` (number), `response_format` (object), `stream` (boolean), `temperature` (number), `tool_choice` (enum: none, auto, required), `tools` (array[object]), `top_logprobs` (integer), `top_p` (number), `use_beam_search` (boolean)

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

`GET /ai/conversations`

```go
	conversations, err := client.AI.Conversations.List(context.Background(), telnyx.AIConversationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversations.Data)
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Create a conversation

Create a new AI Conversation.

`POST /ai/conversations`

Optional: `metadata` (object), `name` (string)

```go
	conversation, err := client.AI.Conversations.New(context.Background(), telnyx.AIConversationNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversation.ID)
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Get Insight Template Groups

Get all insight groups

`GET /ai/conversations/insight-groups`

```go
	page, err := client.AI.Conversations.InsightGroups.GetInsightGroups(context.Background(), telnyx.AIConversationInsightGroupGetInsightGroupsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Create Insight Template Group

Create a new insight group

`POST /ai/conversations/insight-groups` — Required: `name`

Optional: `description` (string), `webhook` (string)

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.InsightGroups(context.Background(), telnyx.AIConversationInsightGroupInsightGroupsParams{
		Name: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Get Insight Template Group

Get insight group by ID

`GET /ai/conversations/insight-groups/{group_id}`

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Update Insight Template Group

Update an insight template group

`PUT /ai/conversations/insight-groups/{group_id}`

Optional: `description` (string), `name` (string), `webhook` (string)

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

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Delete Insight Template Group

Delete insight group by ID

`DELETE /ai/conversations/insight-groups/{group_id}`

```go
	err := client.AI.Conversations.InsightGroups.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Assign Insight Template To Group

Assign an insight to a group

`POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

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

`DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

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

`GET /ai/conversations/insights`

```go
	page, err := client.AI.Conversations.Insights.List(context.Background(), telnyx.AIConversationInsightListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Create Insight Template

Create a new insight

`POST /ai/conversations/insights` — Required: `instructions`, `name`

Optional: `json_schema` (object), `webhook` (string)

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

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Get Insight Template

Get insight by ID

`GET /ai/conversations/insights/{insight_id}`

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Update Insight Template

Update an insight template

`PUT /ai/conversations/insights/{insight_id}`

Optional: `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

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

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Delete Insight Template

Delete insight by ID

`DELETE /ai/conversations/insights/{insight_id}`

```go
	err := client.AI.Conversations.Insights.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`GET /ai/conversations/{conversation_id}`

```go
	conversation, err := client.AI.Conversations.Get(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conversation.Data)
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Update conversation metadata

Update metadata for a specific conversation.

`PUT /ai/conversations/{conversation_id}`

Optional: `metadata` (object)

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

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Delete a conversation

Delete a specific conversation by its ID.

`DELETE /ai/conversations/{conversation_id}`

```go
	err := client.AI.Conversations.Delete(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`GET /ai/conversations/{conversation_id}/conversations-insights`

```go
	response, err := client.AI.Conversations.GetConversationsInsights(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `conversation_insights` (array[object]), `created_at` (date-time), `id` (string), `status` (enum: pending, in_progress, completed, failed)

## Create Message

Add a new message to the conversation. Used to insert a new messages to a conversation manually ( without using chat endpoint )

`POST /ai/conversations/{conversation_id}/message` — Required: `role`

Optional: `content` (string), `metadata` (object), `name` (string), `sent_at` (date-time), `tool_call_id` (string), `tool_calls` (array[object]), `tool_choice` (object)

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

`GET /ai/conversations/{conversation_id}/messages`

```go
	messages, err := client.AI.Conversations.Messages.List(context.Background(), "conversation_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messages.Data)
```

Returns: `created_at` (date-time), `role` (enum: user, assistant, tool), `sent_at` (date-time), `text` (string), `tool_calls` (array[object])

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string. Defaults to `queued` and `processing`.

`GET /ai/embeddings`

```go
	embeddings, err := client.AI.Embeddings.List(context.Background(), telnyx.AIEmbeddingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embeddings.Data)
```

Returns: `bucket` (string), `created_at` (date-time), `finished_at` (date-time), `status` (enum: queued, processing, success, failure, partial_success), `task_id` (string), `task_name` (string), `user_id` (string)

## Embed documents

Perform embedding on a Telnyx Storage Bucket using an embedding model. The current supported file types are:
- PDF
- HTML
- txt/unstructured text files
- json
- csv
- audio / video (mp3, mp4, mpeg, mpga, m4a, wav, or webm ) - Max of 100mb file size. Any files not matching the above types will be attempted to be embedded as unstructured text.

`POST /ai/embeddings` — Required: `bucket_name`

Optional: `document_chunk_overlap_size` (integer), `document_chunk_size` (integer), `embedding_model` (object), `loader` (object)

```go
	embeddingResponse, err := client.AI.Embeddings.New(context.Background(), telnyx.AIEmbeddingNewParams{
		BucketName: "my-bucket",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embeddingResponse.Data)
```

Returns: `created_at` (string), `finished_at` (string | null), `status` (string), `task_id` (uuid), `task_name` (string), `user_id` (uuid)

## List embedded buckets

Get all embedding buckets for a user.

`GET /ai/embeddings/buckets`

```go
	buckets, err := client.AI.Embeddings.Buckets.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", buckets.Data)
```

Returns: `buckets` (array[string])

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`GET /ai/embeddings/buckets/{bucket_name}`

```go
	bucket, err := client.AI.Embeddings.Buckets.Get(context.Background(), "bucket_name")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", bucket.Data)
```

Returns: `created_at` (date-time), `error_reason` (string), `filename` (string), `last_embedded_at` (date-time), `status` (string), `updated_at` (date-time)

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`DELETE /ai/embeddings/buckets/{bucket_name}`

```go
	err := client.AI.Embeddings.Buckets.Delete(context.Background(), "bucket_name")
	if err != nil {
		log.Fatal(err)
	}
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query. Currently the only available distance metric is cosine similarity which will return a `distance` between 0 and 1. The lower the distance, the more similar the returned document chunks are to the query.

`POST /ai/embeddings/similarity-search` — Required: `bucket_name`, `query`

Optional: `num_of_docs` (integer)

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

Returns: `distance` (number), `document_chunk` (string), `metadata` (object)

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain. The process crawls and loads content from the main URL and its linked pages into a Telnyx Cloud Storage bucket.

`POST /ai/embeddings/url` — Required: `url`, `bucket_name`

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

Returns: `created_at` (string), `finished_at` (string | null), `status` (string), `task_id` (uuid), `task_name` (string), `user_id` (uuid)

## Get an embedding task's status

Check the status of a current embedding task. Will be one of the following:
- `queued` - Task is waiting to be picked up by a worker
- `processing` - The embedding task is running
- `success` - Task completed successfully and the bucket is embedded
- `failure` - Task failed and no files were embedded successfully
- `partial_success` - Some files were embedded successfully, but at least one failed

`GET /ai/embeddings/{task_id}`

```go
	embedding, err := client.AI.Embeddings.Get(context.Background(), "task_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", embedding.Data)
```

Returns: `created_at` (string), `finished_at` (string), `status` (enum: queued, processing, success, failure, partial_success), `task_id` (uuid), `task_name` (string)

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`GET /ai/fine_tuning/jobs`

```go
	jobs, err := client.AI.FineTuning.Jobs.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", jobs.Data)
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Create a fine tuning job

Create a new fine tuning job.

`POST /ai/fine_tuning/jobs` — Required: `model`, `training_file`

Optional: `hyperparameters` (object), `suffix` (string)

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.New(context.Background(), telnyx.AIFineTuningJobNewParams{
		Model: "openai/gpt-4o",
		TrainingFile: "training-data.jsonl",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`GET /ai/fine_tuning/jobs/{job_id}`

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.Get(context.Background(), "job_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Cancel a fine tuning job

Cancel a fine tuning job.

`POST /ai/fine_tuning/jobs/{job_id}/cancel`

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.Cancel(context.Background(), "job_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.    **Note**: Model `id`'s will be in the form `{source}/{model_name}`. For example `openai/gpt-4` or `mistralai/Mistral-7B-Instruct-v0.1` consistent with HuggingFace naming conventions.

`GET /ai/models`

```go
	response, err := client.AI.GetModels(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `created` (integer), `id` (string), `object` (string), `owned_by` (string)

## Create embeddings

Creates an embedding vector representing the input text. This endpoint is compatible with the [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings) and may be used with the OpenAI JS or Python SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.

`POST /ai/openai/embeddings` — Required: `input`, `model`

Optional: `dimensions` (integer), `encoding_format` (enum: float, base64), `user` (string)

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

Returns: `data` (array[object]), `model` (string), `object` (string), `usage` (object)

## List embedding models

Returns a list of available embedding models. This endpoint is compatible with the OpenAI Models API format.

`GET /ai/openai/embeddings/models`

```go
	response, err := client.AI.OpenAI.Embeddings.ListEmbeddingModels(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `created` (integer), `id` (string), `object` (string), `owned_by` (string)

## Summarize file content

Generate a summary of a file's contents. Supports the following text formats: 
- PDF, HTML, txt, json, csv

 Supports the following media formats (billed for both the transcription and summary): 
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
- Up to 100 MB

`POST /ai/summarize` — Required: `bucket`, `filename`

Optional: `system_prompt` (string)

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

Returns: `summary` (string)

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/speech_to_text`

```go
	speechToTexts, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToTexts.Data)
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`POST /legacy/reporting/batch_detail_records/speech_to_text` — Required: `start_date`, `end_date`

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

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`GET /legacy/reporting/usage_reports/speech_to_text`

```go
	response, err := client.Legacy.Reporting.UsageReports.GetSpeechToText(context.Background(), telnyx.LegacyReportingUsageReportGetSpeechToTextParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `data` (object)

## Generate speech from text

Generate synthesized speech audio from text input. Returns audio in the requested format (binary audio stream, base64-encoded JSON, or an audio URL for later retrieval). Authentication is provided via the standard `Authorization: Bearer ` header.

`POST /text-to-speech/speech`

Optional: `aws` (object), `azure` (object), `disable_cache` (boolean), `elevenlabs` (object), `language` (string), `minimax` (object), `output_type` (enum: binary_output, base64_output), `provider` (enum: aws, telnyx, azure, elevenlabs, minimax, rime, resemble), `resemble` (object), `rime` (object), `telnyx` (object), `text` (string), `text_type` (enum: text, ssml), `voice` (string), `voice_settings` (object)

```go
	response, err := client.TextToSpeech.Generate(context.Background(), telnyx.TextToSpeechGenerateParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Base64Audio)
```

Returns: `base64_audio` (string)

## List available voices

Retrieve a list of available voices from one or all TTS providers. When `provider` is specified, returns voices for that provider only. Otherwise, returns voices from all providers.

`GET /text-to-speech/voices`

```go
	response, err := client.TextToSpeech.ListVoices(context.Background(), telnyx.TextToSpeechListVoicesParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Voices)
```

Returns: `voices` (array[object])
