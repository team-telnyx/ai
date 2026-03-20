<!-- SDK reference: telnyx-ai-inference-curl -->

# Telnyx Ai Inference - curl

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Chat completion**
2. **Generate embeddings**
3. **Text-to-speech**

### Common mistakes

- NEVER use non-Telnyx model names (e.g., 'gpt-4o') — only models listed at api.telnyx.com/v2/ai/models are available. Use client.ai.models.list() to see available models
- ALWAYS set max_tokens to prevent runaway generation — omitting it may consume excessive credits
- For streaming responses, ALWAYS iterate over the SSE stream — do not try to read the entire response body at once
- Telnyx AI Inference is OpenAI-compatible — use the same request/response format but with Telnyx base URL and API key

**Related skills**: telnyx-ai-assistants-curl

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
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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

Key response fields: `.data.text, .data.duration, .data.segments`

## Create a chat completion

Chat with a language model. This endpoint is consistent with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) and may be used with the OpenAI JS or Python SDK.

`POST /ai/chat/completions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | array[object] | Yes | A list of the previous chat messages for context. |
| `tool_choice` | enum (none, auto, required) | No |  |
| `model` | string | No | The language model to chat with. |
| `api_key_ref` | string | No | If you are using an external inference provider like xAI or ... |
| ... | | | +20 optional params in the API Details section below |

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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metadata->assistant_id` | string (UUID) | No | Filter by assistant ID (e.g., `metadata->assistant_id=eq.ass... |
| `metadata->call_control_id` | string (UUID) | No | Filter by call control ID (e.g., `metadata->call_control_id=... |
| `id` | string (UUID) | No | Filter by conversation ID (e.g. |
| ... | | | +9 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create a conversation

Create a new AI Conversation.

`POST /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No |  |
| `metadata` | object | No | Metadata associated with the conversation. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/conversations"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get Insight Template Groups

Get all insight groups

`GET /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insight-groups"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create Insight Template Group

Create a new insight group

`POST /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `description` | string | No |  |
| `webhook` | string | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource"
}' \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get Insight Template Group

Get insight group by ID

`GET /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update Insight Template Group

Update an insight template group

`PUT /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |
| `name` | string | No |  |
| `description` | string | No |  |
| `webhook` | string | No |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete Insight Template Group

Delete insight group by ID

`DELETE /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}"
```

## Assign Insight Template To Group

Assign an insight to a group

`POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign"
```

## Unassign Insight Template From Group

Remove an insight from a group

`DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign"
```

## Get Insight Templates

Get all insights

`GET /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insights"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create Insight Template

Create a new insight

`POST /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instructions` | string | Yes |  |
| `name` | string | Yes |  |
| `webhook` | string | No |  |
| `json_schema` | object | No | If specified, the output will follow the JSON schema. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "instructions": "You are a helpful assistant.",
  "name": "my-resource"
}' \
  "https://api.telnyx.com/v2/ai/conversations/insights"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get Insight Template

Get insight by ID

`GET /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/insights/{insight_id}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update Insight Template

Update an insight template

`PUT /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insight_id` | string (UUID) | Yes | The ID of the insight |
| `instructions` | string | No |  |
| `name` | string | No |  |
| `webhook` | string | No |  |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/conversations/insights/{insight_id}"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete Insight Template

Delete insight by ID

`DELETE /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/insights/{insight_id}"
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`GET /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes | The ID of the conversation to retrieve |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update conversation metadata

Update metadata for a specific conversation.

`PUT /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes | The ID of the conversation to update |
| `metadata` | object | No | Metadata associated with the conversation. |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a conversation

Delete a specific conversation by its ID.

`DELETE /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes | The ID of the conversation to delete |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000"
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`GET /ai/conversations/{conversation_id}/conversations-insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000/conversations-insights"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create Message

Add a new message to the conversation. Used to insert a new messages to a conversation manually ( without using chat endpoint )

`POST /ai/conversations/{conversation_id}/message`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | Yes |  |
| `conversation_id` | string (UUID) | Yes | The ID of the conversation |
| `tool_call_id` | string (UUID) | No |  |
| `content` | string | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "role": "user"
}' \
  "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000/message"
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`GET /ai/conversations/{conversation_id}/messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/conversations/550e8400-e29b-41d4-a716-446655440000/messages"
```

Key response fields: `.data.text, .data.created_at, .data.role`

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string. Defaults to `queued` and `processing`.

`GET /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | array[string] | No | List of task statuses i.e. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings"
```

Key response fields: `.data.status, .data.created_at, .data.bucket`

## Embed documents

Perform embedding on a Telnyx Storage Bucket using an embedding model. The current supported file types are:
- PDF
- HTML
- txt/unstructured text files
- json
- csv
- audio / video (mp3, mp4, mpeg, mpga, m4a, wav, or webm ) - Max of 100mb file size. Any files not matching the above types will be attempted to be embedded as unstructured text.

`POST /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |
| `document_chunk_size` | integer | No |  |
| `document_chunk_overlap_size` | integer | No |  |
| `embedding_model` | object | No |  |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket_name": "my-bucket"
}' \
  "https://api.telnyx.com/v2/ai/embeddings"
```

Key response fields: `.data.status, .data.created_at, .data.finished_at`

## List embedded buckets

Get all embedding buckets for a user.

`GET /ai/embeddings/buckets`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings/buckets"
```

Key response fields: `.data.buckets`

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`GET /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings/buckets/{bucket_name}"
```

Key response fields: `.data.status, .data.created_at, .data.updated_at`

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`DELETE /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/embeddings/buckets/{bucket_name}"
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query. Currently the only available distance metric is cosine similarity which will return a `distance` between 0 and 1. The lower the distance, the more similar the returned document chunks are to the query.

`POST /ai/embeddings/similarity-search`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |
| `query` | string | Yes |  |
| `num_of_docs` | integer | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket_name": "my-bucket",
  "query": "What is Telnyx?"
}' \
  "https://api.telnyx.com/v2/ai/embeddings/similarity-search"
```

Key response fields: `.data.distance, .data.document_chunk, .data.metadata`

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain. The process crawls and loads content from the main URL and its linked pages into a Telnyx Cloud Storage bucket.

`POST /ai/embeddings/url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | Yes | The URL of the webpage to embed |
| `bucket_name` | string | Yes | Name of the bucket to store the embeddings. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "url": "https://example.com/resource",
  "bucket_name": "my-bucket"
}' \
  "https://api.telnyx.com/v2/ai/embeddings/url"
```

Key response fields: `.data.status, .data.created_at, .data.finished_at`

## Get an embedding task's status

Check the status of a current embedding task. Will be one of the following:
- `queued` - Task is waiting to be picked up by a worker
- `processing` - The embedding task is running
- `success` - Task completed successfully and the bucket is embedded
- `failure` - Task failed and no files were embedded successfully
- `partial_success` - Some files were embedded successfully, but at least one failed

`GET /ai/embeddings/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/embeddings/{task_id}"
```

Key response fields: `.data.status, .data.created_at, .data.finished_at`

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`GET /ai/fine_tuning/jobs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/fine_tuning/jobs"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a fine tuning job

Create a new fine tuning job.

`POST /ai/fine_tuning/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | The base model that is being fine-tuned. |
| `training_file` | string | Yes | The storage bucket or object used for training. |
| `suffix` | string | No | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | No | The hyperparameters used for the fine-tuning job. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "training_file": "training-data.jsonl"
}' \
  "https://api.telnyx.com/v2/ai/fine_tuning/jobs"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`GET /ai/fine_tuning/jobs/{job_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/fine_tuning/jobs/{job_id}"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Cancel a fine tuning job

Cancel a fine tuning job.

`POST /ai/fine_tuning/jobs/{job_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/fine_tuning/jobs/{job_id}/cancel"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.    **Note**: Model `id`'s will be in the form `{source}/{model_name}`. For example `openai/gpt-4` or `mistralai/Mistral-7B-Instruct-v0.1` consistent with HuggingFace naming conventions.

`GET /ai/models`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/models"
```

Key response fields: `.data.id, .data.created, .data.object`

## Create embeddings

Creates an embedding vector representing the input text. This endpoint is compatible with the [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings) and may be used with the OpenAI JS or Python SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.

`POST /ai/openai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | object | Yes | Input text to embed. |
| `model` | string | Yes | ID of the model to use. |
| `encoding_format` | enum (float, base64) | No | The format to return the embeddings in. |
| `dimensions` | integer | No | The number of dimensions the resulting output embeddings sho... |
| `user` | string | No | A unique identifier representing your end-user for monitorin... |

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

Key response fields: `.data.data, .data.model, .data.object`

## List embedding models

Returns a list of available embedding models. This endpoint is compatible with the OpenAI Models API format.

`GET /ai/openai/embeddings/models`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/openai/embeddings/models"
```

Key response fields: `.data.id, .data.created, .data.object`

## Summarize file content

Generate a summary of a file's contents. Supports the following text formats: 
- PDF, HTML, txt, json, csv

 Supports the following media formats (billed for both the transcription and summary): 
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
- Up to 100 MB

`POST /ai/summarize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | The name of the bucket that contains the file to be summariz... |
| `filename` | string | Yes | The name of the file to be summarized. |
| `system_prompt` | string | No | A system prompt to guide the summary generation. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket": "my-bucket",
  "filename": "data.csv"
}' \
  "https://api.telnyx.com/v2/ai/summarize"
```

Key response fields: `.data.summary`

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/speech_to_text`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`POST /legacy/reporting/batch_detail_records/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | Yes | Start date in ISO format with timezone |
| `end_date` | string (date-time) | Yes | End date in ISO format with timezone (date range must be up ... |

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

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/legacy/reporting/batch_detail_records/speech_to_text/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`GET /legacy/reporting/usage_reports/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | No |  |
| `end_date` | string (date-time) | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/legacy/reporting/usage_reports/speech_to_text?start_date=2020-07-02T00:00:00-06:00&end_date=2020-07-01T00:00:00-06:00"
```

Key response fields: `.data.data`

## Speech to text over WebSocket

Open a WebSocket connection to stream audio and receive transcriptions in real-time. Authentication is provided via the standard `Authorization: Bearer ` header. Supported engines: `Azure`, `Deepgram`, `Google`, `Telnyx`.

`GET /speech-to-text/transcription`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `language` | string | No | The language spoken in the audio stream. |
| `interim_results` | boolean | No | Whether to receive interim transcription results. |
| `model` | object | No | The specific model to use within the selected transcription ... |
| ... | | | +4 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/speech-to-text/transcription?transcription_engine=Telnyx&input_format=mp3&language=en-US&interim_results=True&endpointing=500&redact=pci&keyterm=Telnyx&keywords=Telnyx,SIP,WebRTC"
```

## Stream text to speech over WebSocket

Open a WebSocket connection to stream text and receive synthesized audio in real time. Authentication is provided via the standard `Authorization: Bearer ` header. Send JSON frames with text to synthesize; receive JSON frames containing base64-encoded audio chunks.

`GET /text-to-speech/speech`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | TTS provider. |
| `model_id` | string (UUID) | No | Model identifier for the chosen provider. |
| `voice_id` | string (UUID) | No | Voice identifier for the chosen provider. |
| ... | | | +4 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/text-to-speech/speech"
```

## Generate speech from text

Generate synthesized speech audio from text input. Returns audio in the requested format (binary audio stream, base64-encoded JSON, or an audio URL for later retrieval). Authentication is provided via the standard `Authorization: Bearer ` header.

`POST /text-to-speech/speech`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | TTS provider. |
| `text_type` | enum (text, ssml) | No | Text type. |
| `output_type` | enum (binary_output, base64_output) | No | Determines the response format. |
| ... | | | +12 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/text-to-speech/speech"
```

Key response fields: `.data.base64_audio`

## List available voices

Retrieve a list of available voices from one or all TTS providers. When `provider` is specified, returns voices for that provider only. Otherwise, returns voices from all providers.

`GET /text-to-speech/voices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | Filter voices by provider. |
| `api_key` | string | No | API key for providers that require one to list voices (e.g. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/text-to-speech/voices"
```

Key response fields: `.data.voices`

---

# AI Inference (curl) — API Details

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

### Create a chat completion

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | The language model to chat with. |
| `api_key_ref` | string | If you are using an external inference provider like xAI or OpenAI, this fiel... |
| `stream` | boolean | Whether or not to stream data-only server-sent events as they become available. |
| `temperature` | number | Adjusts the "creativity" of the model. |
| `max_tokens` | integer | Maximum number of completion tokens the model should generate. |
| `tools` | array[object] | The `function` tool type follows the same schema as the [OpenAI Chat Completi... |
| `tool_choice` | enum (none, auto, required) |  |
| `response_format` | object |  |
| `guided_json` | object | Must be a valid JSON schema. |
| `guided_regex` | string | If specified, the output will follow the regex pattern. |
| `guided_choice` | array[string] | If specified, the output will be exactly one of the choices. |
| `min_p` | number | This is an alternative to `top_p` that [many prefer](https://github.com/huggi... |
| `n` | number | This will return multiple choices for you instead of a single chat completion. |
| `use_beam_search` | boolean | Setting this to `true` will allow the model to [explore more completion optio... |
| `best_of` | integer | This is used with `use_beam_search` to determine how many candidate beams to ... |
| `length_penalty` | number | This is used with `use_beam_search` to prefer shorter or longer completions. |
| `early_stopping` | boolean | This is used with `use_beam_search`. |
| `logprobs` | boolean | Whether to return log probabilities of the output tokens or not. |
| `top_logprobs` | integer | This is used with `logprobs`. |
| `frequency_penalty` | number | Higher values will penalize the model from repeating the same output tokens. |
| `presence_penalty` | number | Higher values will penalize the model from repeating the same output tokens. |
| `top_p` | number | An alternative or complement to `temperature`. |
| `enable_thinking` | boolean | Whether to enable the thinking/reasoning phase for models that support it (e.... |

### Create a conversation

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `metadata` | object | Metadata associated with the conversation. |

### Create Insight Template Group

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |
| `webhook` | string |  |

### Update Insight Template Group

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `description` | string |  |
| `webhook` | string |  |

### Create Insight Template

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook` | string |  |
| `json_schema` | object | If specified, the output will follow the JSON schema. |

### Update Insight Template

| Parameter | Type | Description |
|-----------|------|-------------|
| `instructions` | string |  |
| `name` | string |  |
| `webhook` | string |  |
| `json_schema` | object |  |

### Update conversation metadata

| Parameter | Type | Description |
|-----------|------|-------------|
| `metadata` | object | Metadata associated with the conversation. |

### Create Message

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | string |  |
| `name` | string |  |
| `tool_choice` | object |  |
| `tool_calls` | array[object] |  |
| `tool_call_id` | string (UUID) |  |
| `sent_at` | string (date-time) |  |
| `metadata` | object |  |

### Embed documents

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_chunk_size` | integer |  |
| `document_chunk_overlap_size` | integer |  |
| `embedding_model` | object |  |
| `loader` | object |  |

### Search for documents

| Parameter | Type | Description |
|-----------|------|-------------|
| `num_of_docs` | integer |  |

### Create a fine tuning job

| Parameter | Type | Description |
|-----------|------|-------------|
| `suffix` | string | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | The hyperparameters used for the fine-tuning job. |

### Create embeddings

| Parameter | Type | Description |
|-----------|------|-------------|
| `encoding_format` | enum (float, base64) | The format to return the embeddings in. |
| `dimensions` | integer | The number of dimensions the resulting output embeddings should have. |
| `user` | string | A unique identifier representing your end-user for monitoring and abuse detec... |

### Summarize file content

| Parameter | Type | Description |
|-----------|------|-------------|
| `system_prompt` | string | A system prompt to guide the summary generation. |

### Generate speech from text

| Parameter | Type | Description |
|-----------|------|-------------|
| `voice` | string | Voice identifier in the format `provider.model_id.voice_id` or `provider.voic... |
| `text` | string | The text to convert to speech. |
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | TTS provider. |
| `language` | string | Language code (e.g. |
| `text_type` | enum (text, ssml) | Text type. |
| `output_type` | enum (binary_output, base64_output) | Determines the response format. |
| `disable_cache` | boolean | When `true`, bypass the audio cache and generate fresh audio. |
| `voice_settings` | object | Provider-specific voice settings. |
| `aws` | object | AWS Polly provider-specific parameters. |
| `telnyx` | object | Telnyx provider-specific parameters. |
| `azure` | object | Azure Cognitive Services provider-specific parameters. |
| `elevenlabs` | object | ElevenLabs provider-specific parameters. |
| `minimax` | object | Minimax provider-specific parameters. |
| `rime` | object | Rime provider-specific parameters. |
| `resemble` | object | Resemble AI provider-specific parameters. |
