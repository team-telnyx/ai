---
name: telnyx-ai-inference-curl
description: >-
  Access Telnyx LLM inference APIs, embeddings, and AI analytics for call
  insights and summaries. This skill provides REST API (curl) examples.
metadata:
  author: telnyx
  product: ai-inference
  language: curl
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Inference - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## Transcribe speech to text

Transcribe speech to text. This endpoint is consistent with the [OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/createTranscription) and may be used with the OpenAI JS or Python SDK.

`POST /ai/audio/transcriptions`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "file=@/path/to/file" \
  -F "file_url=https://example.com/file.mp3" \
  -F "model=distil-whisper/distil-large-v2" \
  -F "response_format=json" \
  -F "timestamp_granularities[]=segment" \
  -F "language=en-US" \
  -F "model_config={'smart_format': True, 'punctuate': True}" \
  "https://api.telnyx.com/v2/ai/audio/transcriptions"
```

Returns: `duration` (number), `segments` (array[object]), `text` (string), `words` (array[object])

## Create a chat completion

**Deprecated**: Use `POST /v2/ai/openai/chat/completions` instead. Chat with a language model. This endpoint is consistent with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) and may be used with the OpenAI JS or Python SDK.

`POST /ai/chat/completions` — Required: `messages`

Optional: `api_key_ref` (string), `best_of` (integer), `early_stopping` (boolean), `enable_thinking` (boolean), `frequency_penalty` (number), `length_penalty` (number), `logprobs` (boolean), `max_tokens` (integer | null), `min_p` (number), `mode` (enum: preferred, strict), `model` (string), `n` (number), `presence_penalty` (number), `reasoning_effort` (enum: none, minimal, low, medium, high, xhigh, max), `region` (enum: USA, EU, AUS, UAE), `response_format` (object), `seed` (integer), `service_tier` (string), `stop` (object), `stream` (boolean), `temperature` (number), `tool_choice` (enum: none, auto, required), `tools` (array[object]), `top_logprobs` (integer), `top_p` (number), `use_beam_search` (boolean)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "messages": [
    {
      "role": "system",
      "content": "You are a friendly chatbot."
    },
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ]
}' \
  "https://api.telnyx.com/v2/ai/chat/completions"
```

## List conversations

Retrieve a list of all AI conversations configured by the user. Supports [PostgREST-style query parameters](https://postgrest.org/en/stable/api.html#horizontal-filtering-rows) for filtering. Examples are included for the standard metadata fields, but you can filter on any field in the metadata JSON object.

`GET /ai/conversations`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations"
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Create a conversation

Creates a new AI conversation, the container for messages exchanged with an assistant, and returns the created conversation.

`POST /ai/conversations`

Optional: `metadata` (object), `name` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource"
}' \
  "https://api.telnyx.com/v2/ai/conversations"
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Aggregate Conversation Insights

Aggregate conversation insights by specified fields

`GET /ai/conversations/conversation-insights/aggregates`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/conversation-insights/aggregates"
```

Returns: `record_count` (integer)

## Get Insight Template Groups

Returns a paginated list of your insight template groups. Groups organize related insight templates that are applied together when analyzing conversations.

`GET /ai/conversations/insight-groups`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insight-groups"
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Create Insight Template Group

Creates a new insight template group for organizing related insight templates, and returns the created group.

`POST /ai/conversations/insight-groups` — Required: `name`

Optional: `description` (string), `webhook` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Name",
  "description": "Description",
  "webhook": ""
}' \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups"
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Get Insight Template Group

Returns the details of a single insight template group, including the insight templates assigned to it.

`GET /ai/conversations/insight-groups/{group_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}"
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Update Insight Template Group

Updates the specified insight template group and returns the updated group.

`PUT /ai/conversations/insight-groups/{group_id}`

Optional: `description` (string), `name` (string), `webhook` (string)

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Name",
  "description": "Description",
  "webhook": "Webhook"
}' \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}"
```

Returns: `created_at` (date-time), `description` (string), `id` (uuid), `insights` (array[object]), `name` (string), `webhook` (string)

## Delete Insight Template Group

Permanently deletes the specified insight template group by its ID.

`DELETE /ai/conversations/insight-groups/{group_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}"
```

## Assign Insight Template To Group

Assigns the specified insight template to the specified insight template group.

`POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign"
```

## Unassign Insight Template From Group

Removes the specified insight template from the specified group. The insight template itself is not deleted.

`DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign"
```

## Get Insight Templates

Returns a paginated list of your insight templates. Insight templates define analyses that run over AI conversations to extract structured findings.

`GET /ai/conversations/insights`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insights"
```

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Create Insight Template

Creates a new insight template defining an analysis to run over conversations, and returns the created template.

`POST /ai/conversations/insights` — Required: `instructions`, `name`

Optional: `json_schema` (object), `webhook` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "instructions": "Instructions",
  "name": "Name",
  "webhook": "",
  "json_schema": "string"
}' \
  "https://api.telnyx.com/v2/ai/conversations/insights"
```

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Get Insight Template

Returns the details of a single insight template by its ID, including its configuration.

`GET /ai/conversations/insights/{insight_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insights/{insight_id}"
```

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Update Insight Template

Updates the specified insight template and returns the updated template.

`PUT /ai/conversations/insights/{insight_id}`

Optional: `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "instructions": "Instructions",
  "name": "Name",
  "webhook": "Webhook",
  "json_schema": "string"
}' \
  "https://api.telnyx.com/v2/ai/conversations/insights/{insight_id}"
```

Returns: `created_at` (date-time), `id` (uuid), `insight_type` (enum: custom, default), `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

## Delete Insight Template

Permanently deletes the specified insight template by its ID.

`DELETE /ai/conversations/insights/{insight_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/insights/{insight_id}"
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`GET /ai/conversations/{conversation_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Update conversation metadata

Update metadata for a specific conversation.

`PUT /ai/conversations/{conversation_id}`

Optional: `metadata` (object)

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "metadata": {
    "ai_disabled": "true"
  }
}' \
  "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `created_at` (date-time), `id` (uuid), `last_message_at` (date-time), `metadata` (object), `name` (string)

## Delete a conversation

Delete a specific conversation by its ID.

`DELETE /ai/conversations/{conversation_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000"
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`GET /ai/conversations/{conversation_id}/conversations-insights`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000/conversations-insights"
```

Returns: `conversation_insights` (array[object]), `created_at` (date-time), `id` (string), `status` (enum: pending, in_progress, completed, failed)

## Create Message

Add a new message to the conversation. Used to insert a new messages to a conversation manually ( without using chat endpoint )

`POST /ai/conversations/{conversation_id}/message` — Required: `role`

Optional: `content` (string), `metadata` (object), `name` (string), `sent_at` (date-time), `tool_call_id` (string), `tool_calls` (array[object]), `tool_choice` (object)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "role": "Role",
  "content": "",
  "name": "Name",
  "tool_choice": "string",
  "tool_calls": [],
  "tool_call_id": "Tool Call Id",
  "sent_at": "2024-01-23T18:10:02.574Z"
}' \
  "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000/message"
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`GET /ai/conversations/{conversation_id}/messages`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000/messages"
```

Returns: `created_at` (date-time), `metadata` (object), `role` (enum: user, assistant, tool), `sent_at` (date-time), `text` (string), `tool_calls` (array[object])

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string. Defaults to `queued` and `processing`.

`GET /ai/embeddings`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings"
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

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket_name": "Bucket Name",
  "document_chunk_size": 1024,
  "document_chunk_overlap_size": 512,
  "embedding_model": "intfloat/multilingual-e5-large",
  "loader": "default"
}' \
  "https://api.telnyx.com/v2/ai/embeddings"
```

Returns: `created_at` (string), `finished_at` (string | null), `status` (string), `task_id` (uuid), `task_name` (string), `user_id` (uuid)

## List embedded buckets

Returns the list of storage buckets that have been embedded for your account, for use with similarity search.

`GET /ai/embeddings/buckets`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings/buckets"
```

Returns: `buckets` (array[string])

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`GET /ai/embeddings/buckets/{bucket_name}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings/buckets/{bucket_name}"
```

Returns: `created_at` (date-time), `error_reason` (string), `filename` (string), `last_embedded_at` (date-time), `status` (string), `updated_at` (date-time)

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`DELETE /ai/embeddings/buckets/{bucket_name}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/embeddings/buckets/{bucket_name}"
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query. Currently the only available distance metric is cosine similarity which will return a `distance` between 0 and 1. The lower the distance, the more similar the returned document chunks are to the query.

`POST /ai/embeddings/similarity-search` — Required: `bucket_name`, `query`

Optional: `num_of_docs` (integer)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket_name": "Bucket Name",
  "query": "Query",
  "num_of_docs": 3
}' \
  "https://api.telnyx.com/v2/ai/embeddings/similarity-search"
```

Returns: `distance` (number), `document_chunk` (string), `metadata` (object)

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain. The process crawls and loads content from the main URL and its linked pages into a Telnyx Cloud Storage bucket.

`POST /ai/embeddings/url` — Required: `url`, `bucket_name`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "url": "URL",
  "bucket_name": "Bucket Name"
}' \
  "https://api.telnyx.com/v2/ai/embeddings/url"
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

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings/{task_id}"
```

Returns: `created_at` (string), `finished_at` (string), `status` (enum: queued, processing, success, failure, partial_success), `task_id` (uuid), `task_name` (string)

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`GET /ai/fine_tuning/jobs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/fine_tuning/jobs"
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Create a fine tuning job

Creates a new fine-tuning job that trains a model on the provided dataset, and returns the created job.

`POST /ai/fine_tuning/jobs` — Required: `model`, `training_file`

Optional: `hyperparameters` (object), `suffix` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "model": "openai/gpt-4o",
  "training_file": "training-data.jsonl",
  "suffix": "string",
  "hyperparameters": {
    "n_epochs": 3
  }
}' \
  "https://api.telnyx.com/v2/ai/fine_tuning/jobs"
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Get a fine tuning job

Returns the details of a single fine-tuning job by its job_id, including its current status.

`GET /ai/fine_tuning/jobs/{job_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/fine_tuning/jobs/{job_id}"
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Cancel a fine tuning job

Cancels the specified in-progress fine-tuning job and returns the updated job.

`POST /ai/fine_tuning/jobs/{job_id}/cancel`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/fine_tuning/jobs/{job_id}/cancel"
```

Returns: `created_at` (integer), `finished_at` (integer | null), `hyperparameters` (object), `id` (string), `model` (string), `organization_id` (string), `status` (enum: queued, running, succeeded, failed, cancelled), `trained_tokens` (integer | null), `training_file` (string)

## Get available models

**Deprecated**: Use `GET /v2/ai/openai/models` instead. Returns the same `ModelsResponse` payload as the OpenAI-compatible endpoint — open-source LLMs hosted on Telnyx (e.g. `moonshotai/Kimi-K2.6`, `zai-org/GLM-5.1-FP8`, `MiniMaxAI/MiniMax-M2.7`), embedding models, and fine-tuned models — kept around for backwards compatibility.

`GET /ai/models`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/models"
```

Returns: `base_model` (string | null), `context_length` (integer), `created` (date-time), `description` (string | null), `id` (string), `is_fine_tunable` (boolean), `is_vision_supported` (boolean), `languages` (array[string]), `license` (string), `max_completion_tokens` (integer | null), `object` (string), `organization` (string), `owned_by` (string), `parameters` (integer), `parameters_str` (string | null), `pricing` (object), `recommended_for_assistants` (boolean), `regions` (array[string]), `service_tiers` (array[string]), `task` (string), `tier` (enum: small, medium, large, unlisted)

## Create embeddings

Creates an embedding vector representing the input text. This endpoint is compatible with the [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings) and may be used with the OpenAI JS or Python SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.

`POST /ai/openai/embeddings` — Required: `input`, `model`

Optional: `dimensions` (integer), `encoding_format` (enum: float, base64), `user` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "input": "The quick brown fox jumps over the lazy dog",
  "model": "thenlper/gte-large"
}' \
  "https://api.telnyx.com/v2/ai/openai/embeddings"
```

Returns: `data` (array[object]), `model` (string), `object` (string), `usage` (object)

## List embedding models

Returns a list of available embedding models. This endpoint is compatible with the OpenAI Models API format.

`GET /ai/openai/embeddings/models`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/openai/embeddings/models"
```

Returns: `created` (integer), `id` (string), `object` (string), `owned_by` (string)

## Create a response

**Deprecated**: Use `POST /v2/ai/openai/responses` instead. This endpoint is compatible with the [OpenAI Responses API](https://developers.openai.com/api/reference/responses/overview) and may be used with the OpenAI JS or Python SDK. Response id parameter is not supported at the moment. Use the `conversation` parameter with a Telnyx Conversation ID to leverage persistent conversations.

`POST /ai/responses`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "model": "zai-org/GLM-5.1-FP8",
  "input": [
    {
      "role": "system",
      "content": [
        {
          "type": "input_text",
          "text": "You are a friendly chatbot."
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Hello, world!"
        }
      ]
    }
  ]
}' \
  "https://api.telnyx.com/v2/ai/responses"
```

## Summarize file content

Generate a summary of a file's contents. Supports the following text formats: 
- PDF, HTML, txt, json, csv

 Supports the following media formats (billed for both the transcription and summary): 
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
- Up to 100 MB

`POST /ai/summarize` — Required: `bucket`, `filename`

Optional: `system_prompt` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket": "my-bucket",
  "filename": "data.csv",
  "system_prompt": "string"
}' \
  "https://api.telnyx.com/v2/ai/summarize"
```

Returns: `summary` (string)

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`GET /legacy/reporting/batch/detail/records/speech/to/text`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch/detail/records/speech/to/text"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`POST /legacy/reporting/batch/detail/records/speech/to/text` — Required: `start_date`, `end_date`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "start_date": "2020-07-01T00:00:00-06:00",
  "end_date": "2020-07-01T00:00:00-06:00"
}' \
  "https://api.telnyx.com/v2/legacy/reporting/batch/detail/records/speech/to/text"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`GET /legacy/reporting/batch/detail/records/speech/to/text/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch/detail/records/speech/to/text/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`DELETE /legacy/reporting/batch/detail/records/speech/to/text/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch/detail/records/speech/to/text/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/speech_to_text`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`POST /legacy/reporting/batch_detail_records/speech_to_text` — Required: `start_date`, `end_date`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "start_date": "2020-07-01T00:00:00-06:00",
  "end_date": "2020-07-01T00:00:00-06:00"
}' \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `created_at` (date-time), `download_link` (string), `end_date` (date-time), `id` (string), `record_type` (string), `start_date` (date-time), `status` (enum: PENDING, COMPLETE, FAILED, EXPIRED)

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`GET /legacy/reporting/usage_reports/speech_to_text`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/speech_to_text?start_date=2020-07-02T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00"
```

Returns: `data` (object)

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`GET /legacy_reporting/usage_reports/speech_to_text`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy_reporting/usage_reports/speech_to_text?start_date=2020-07-02T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00"
```

Returns: `data` (object)

## Speech to text over WebSocket

Open a WebSocket connection to stream audio and receive transcriptions in real-time. Authentication is provided via the standard `Authorization: Bearer ` header. Supported engines: `Azure`, `Deepgram`, `Google`, `Telnyx`, `xAI`, `Speechmatics`, `Soniox`, `Parakeet`, `Humain`, `Reson8`, `Cohere`.

`GET /speech-to-text/transcription`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/speech-to-text/transcription?transcription_engine=Telnyx&input_format=mp3&sample_rate=16000&language=en-US&interim_results=True&endpointing=500&redact=pci&keyterm=Telnyx&keywords=Telnyx,SIP,WebRTC"
```

## Stream text to speech over WebSocket

Open a WebSocket connection to stream text and receive synthesized audio in real time. Authentication is provided via the standard `Authorization: Bearer ` header. Send JSON frames with text to synthesize; receive JSON frames containing base64-encoded audio chunks.

`GET /text-to-speech/speech`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/text-to-speech/speech"
```

## Generate speech from text

Generate synthesized speech audio from text input. Returns audio in the requested format (binary audio stream, base64-encoded JSON, or an audio URL for later retrieval). Authentication is provided via the standard `Authorization: Bearer ` header.

`POST /text-to-speech/speech`

Optional: `aws` (object), `azure` (object), `disable_cache` (boolean), `elevenlabs` (object), `humain` (object), `language` (string), `minimax` (object), `output_type` (enum: binary_output, base64_output), `provider` (enum: aws, telnyx, azure, elevenlabs, minimax, resemble, xai, humain, soniox), `resemble` (object), `soniox` (object), `telnyx` (object), `text` (string), `text_type` (enum: text, ssml), `voice` (string), `voice_settings` (object), `xai` (object)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "voice": "string",
  "text": "string",
  "provider": "aws",
  "language": "string",
  "text_type": "text",
  "output_type": "binary_output",
  "disable_cache": false,
  "aws": {
    "language_code": "string",
    "text_type": "text",
    "lexicon_names": [
      "string"
    ],
    "output_format": "string",
    "sample_rate": "string"
  },
  "telnyx": {
    "voice_speed": 1.0,
    "response_format": "mp3",
    "sampling_rate": 24000,
    "volume": 1.0,
    "emotion": "neutral"
  },
  "azure": {
    "language_code": "en-US",
    "output_format": "audio-24khz-160kbitrate-mono-mp3",
    "text_type": "text",
    "api_key": "string",
    "region": "string",
    "deployment_id": "string",
    "effect": "string",
    "gender": "string"
  },
  "elevenlabs": {
    "language_code": "string",
    "api_key": "string"
  },
  "minimax": {
    "speed": 0,
    "vol": 0,
    "pitch": 0,
    "response_format": "string",
    "language_boost": "string"
  },
  "resemble": {
    "precision": "string",
    "sample_rate": "string",
    "format": "string"
  },
  "xai": {
    "voice_id": "eve",
    "language": "auto",
    "output_format": "mp3",
    "sample_rate": 24000
  },
  "humain": {
    "voice_id": "sara-en",
    "ttfb_eagerness": 0
  },
  "soniox": {
    "voice_id": "Emma",
    "model_id": "tts-rt-v2",
    "language": "en",
    "speed": 1.0,
    "audio_format": "mp3"
  }
}' \
  "https://api.telnyx.com/v2/text-to-speech/speech"
```

Returns: `base64_audio` (string)

## List available voices

Retrieve a list of available voices from one or all TTS providers. When `provider` is specified, returns voices for that provider only. Otherwise, returns voices from all providers.

`GET /text-to-speech/voices`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/text-to-speech/voices"
```

Returns: `voices` (array[object])
