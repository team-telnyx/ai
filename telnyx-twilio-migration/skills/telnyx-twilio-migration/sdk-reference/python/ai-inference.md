<!-- SDK reference: telnyx-ai-inference-python -->

# Telnyx Ai Inference - Python

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Chat completion**: `client.ai.chat.completions.create(model=..., messages=[...])`
2. **Generate embeddings**: `client.ai.embeddings.create(model=..., input=...)`
3. **Text-to-speech**: `client.ai.tts.create(model=..., input=..., voice=...)`

### Common mistakes

- NEVER use non-Telnyx model names (e.g., 'gpt-4o') — only models listed at api.telnyx.com/v2/ai/models are available. Use client.ai.models.list() to see available models
- ALWAYS set max_tokens to prevent runaway generation — omitting it may consume excessive credits
- For streaming responses, ALWAYS iterate over the SSE stream — do not try to read the entire response body at once
- Telnyx AI Inference is OpenAI-compatible — use the same request/response format but with Telnyx base URL and API key

**Related skills**: telnyx-ai-assistants-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.ai.chat.completions.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Transcribe speech to text

Transcribe speech to text. This endpoint is consistent with the [OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/createTranscription) and may be used with the OpenAI JS or Python SDK.

`client.ai.audio.transcribe()` — `POST /ai/audio/transcriptions`

```python
response = client.ai.audio.transcribe(
    model="distil-whisper/distil-large-v2",
)
print(response.text)
```

Key response fields: `response.data.text, response.data.duration, response.data.segments`

## Create a chat completion

Chat with a language model. This endpoint is consistent with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) and may be used with the OpenAI JS or Python SDK.

`client.ai.chat.create_completion()` — `POST /ai/chat/completions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | array[object] | Yes | A list of the previous chat messages for context. |
| `tool_choice` | enum (none, auto, required) | No |  |
| `model` | string | No | The language model to chat with. |
| `api_key_ref` | string | No | If you are using an external inference provider like xAI or ... |
| ... | | | +20 optional params in the API Details section below |

```python
response = client.ai.chat.create_completion(
    messages=[{
        "role": "system",
        "content": "You are a friendly chatbot.",
    }, {
        "role": "user",
        "content": "Hello, world!",
    }],
)
print(response)
```

## List conversations

Retrieve a list of all AI conversations configured by the user. Supports [PostgREST-style query parameters](https://postgrest.org/en/stable/api.html#horizontal-filtering-rows) for filtering. Examples are included for the standard metadata fields, but you can filter on any field in the metadata JSON object.

`client.ai.conversations.list()` — `GET /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metadata->assistant_id` | string (UUID) | No | Filter by assistant ID (e.g., `metadata->assistant_id=eq.ass... |
| `metadata->call_control_id` | string (UUID) | No | Filter by call control ID (e.g., `metadata->call_control_id=... |
| `id` | string (UUID) | No | Filter by conversation ID (e.g. |
| ... | | | +9 optional params in the API Details section below |

```python
conversations = client.ai.conversations.list()
print(conversations.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a conversation

Create a new AI Conversation.

`client.ai.conversations.create()` — `POST /ai/conversations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No |  |
| `metadata` | object | No | Metadata associated with the conversation. |

```python
conversation = client.ai.conversations.create()
print(conversation.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template Groups

Get all insight groups

`client.ai.conversations.insight_groups.retrieve_insight_groups()` — `GET /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.ai.conversations.insight_groups.retrieve_insight_groups()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create Insight Template Group

Create a new insight group

`client.ai.conversations.insight_groups.insight_groups()` — `POST /ai/conversations/insight-groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `description` | string | No |  |
| `webhook` | string | No |  |

```python
insight_template_group_detail = client.ai.conversations.insight_groups.insight_groups(
    name="my-resource",
)
print(insight_template_group_detail.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template Group

Get insight group by ID

`client.ai.conversations.insight_groups.retrieve()` — `GET /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |

```python
insight_template_group_detail = client.ai.conversations.insight_groups.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(insight_template_group_detail.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Insight Template Group

Update an insight template group

`client.ai.conversations.insight_groups.update()` — `PUT /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |
| `name` | string | No |  |
| `description` | string | No |  |
| `webhook` | string | No |  |

```python
insight_template_group_detail = client.ai.conversations.insight_groups.update(
    group_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(insight_template_group_detail.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Insight Template Group

Delete insight group by ID

`client.ai.conversations.insight_groups.delete()` — `DELETE /ai/conversations/insight-groups/{group_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |

```python
client.ai.conversations.insight_groups.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Assign Insight Template To Group

Assign an insight to a group

`client.ai.conversations.insight_groups.insights.assign()` — `POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```python
client.ai.conversations.insight_groups.insights.assign(
    insight_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    group_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Unassign Insight Template From Group

Remove an insight from a group

`client.ai.conversations.insight_groups.insights.delete_unassign()` — `DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | string (UUID) | Yes | The ID of the insight group |
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```python
client.ai.conversations.insight_groups.insights.delete_unassign(
    insight_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    group_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Get Insight Templates

Get all insights

`client.ai.conversations.insights.list()` — `GET /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.ai.conversations.insights.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create Insight Template

Create a new insight

`client.ai.conversations.insights.create()` — `POST /ai/conversations/insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instructions` | string | Yes |  |
| `name` | string | Yes |  |
| `webhook` | string | No |  |
| `json_schema` | object | No | If specified, the output will follow the JSON schema. |

```python
insight_template_detail = client.ai.conversations.insights.create(
    instructions="You are a helpful assistant.",
    name="my-resource",
)
print(insight_template_detail.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Insight Template

Get insight by ID

`client.ai.conversations.insights.retrieve()` — `GET /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```python
insight_template_detail = client.ai.conversations.insights.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(insight_template_detail.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Insight Template

Update an insight template

`client.ai.conversations.insights.update()` — `PUT /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insight_id` | string (UUID) | Yes | The ID of the insight |
| `instructions` | string | No |  |
| `name` | string | No |  |
| `webhook` | string | No |  |
| ... | | | +1 optional params in the API Details section below |

```python
insight_template_detail = client.ai.conversations.insights.update(
    insight_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(insight_template_detail.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Insight Template

Delete insight by ID

`client.ai.conversations.insights.delete()` — `DELETE /ai/conversations/insights/{insight_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insight_id` | string (UUID) | Yes | The ID of the insight |

```python
client.ai.conversations.insights.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`client.ai.conversations.retrieve()` — `GET /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes | The ID of the conversation to retrieve |

```python
conversation = client.ai.conversations.retrieve(
    "conversation_id",
)
print(conversation.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update conversation metadata

Update metadata for a specific conversation.

`client.ai.conversations.update()` — `PUT /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes | The ID of the conversation to update |
| `metadata` | object | No | Metadata associated with the conversation. |

```python
conversation = client.ai.conversations.update(
    conversation_id="550e8400-e29b-41d4-a716-446655440000",
)
print(conversation.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a conversation

Delete a specific conversation by its ID.

`client.ai.conversations.delete()` — `DELETE /ai/conversations/{conversation_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes | The ID of the conversation to delete |

```python
client.ai.conversations.delete(
    "conversation_id",
)
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`client.ai.conversations.retrieve_conversations_insights()` — `GET /ai/conversations/{conversation_id}/conversations-insights`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes |  |

```python
response = client.ai.conversations.retrieve_conversations_insights(
    "conversation_id",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Message

Add a new message to the conversation. Used to insert a new messages to a conversation manually ( without using chat endpoint )

`client.ai.conversations.add_message()` — `POST /ai/conversations/{conversation_id}/message`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | Yes |  |
| `conversation_id` | string (UUID) | Yes | The ID of the conversation |
| `tool_call_id` | string (UUID) | No |  |
| `content` | string | No |  |
| `name` | string | No |  |
| ... | | | +4 optional params in the API Details section below |

```python
client.ai.conversations.add_message(
    conversation_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    role="user",
)
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`client.ai.conversations.messages.list()` — `GET /ai/conversations/{conversation_id}/messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversation_id` | string (UUID) | Yes |  |

```python
messages = client.ai.conversations.messages.list(
    "conversation_id",
)
print(messages.data)
```

Key response fields: `response.data.text, response.data.created_at, response.data.role`

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string. Defaults to `queued` and `processing`.

`client.ai.embeddings.list()` — `GET /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | array[string] | No | List of task statuses i.e. |

```python
embeddings = client.ai.embeddings.list()
print(embeddings.data)
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

`client.ai.embeddings.create()` — `POST /ai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |
| `document_chunk_size` | integer | No |  |
| `document_chunk_overlap_size` | integer | No |  |
| `embedding_model` | object | No |  |
| ... | | | +1 optional params in the API Details section below |

```python
embedding_response = client.ai.embeddings.create(
    bucket_name="my-bucket",
)
print(embedding_response.data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## List embedded buckets

Get all embedding buckets for a user.

`client.ai.embeddings.buckets.list()` — `GET /ai/embeddings/buckets`

```python
buckets = client.ai.embeddings.buckets.list()
print(buckets.data)
```

Key response fields: `response.data.buckets`

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`client.ai.embeddings.buckets.retrieve()` — `GET /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |

```python
bucket = client.ai.embeddings.buckets.retrieve(
    "bucket_name",
)
print(bucket.data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.updated_at`

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`client.ai.embeddings.buckets.delete()` — `DELETE /ai/embeddings/buckets/{bucket_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |

```python
client.ai.embeddings.buckets.delete(
    "bucket_name",
)
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query. Currently the only available distance metric is cosine similarity which will return a `distance` between 0 and 1. The lower the distance, the more similar the returned document chunks are to the query.

`client.ai.embeddings.similarity_search()` — `POST /ai/embeddings/similarity-search`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes |  |
| `query` | string | Yes |  |
| `num_of_docs` | integer | No |  |

```python
response = client.ai.embeddings.similarity_search(
    bucket_name="my-bucket",
    query="What is Telnyx?",
)
print(response.data)
```

Key response fields: `response.data.distance, response.data.document_chunk, response.data.metadata`

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain. The process crawls and loads content from the main URL and its linked pages into a Telnyx Cloud Storage bucket.

`client.ai.embeddings.url()` — `POST /ai/embeddings/url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | Yes | The URL of the webpage to embed |
| `bucket_name` | string | Yes | Name of the bucket to store the embeddings. |

```python
embedding_response = client.ai.embeddings.url(
    bucket_name="my-bucket",
    url="https://example.com/resource",
)
print(embedding_response.data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## Get an embedding task's status

Check the status of a current embedding task. Will be one of the following:
- `queued` - Task is waiting to be picked up by a worker
- `processing` - The embedding task is running
- `success` - Task completed successfully and the bucket is embedded
- `failure` - Task failed and no files were embedded successfully
- `partial_success` - Some files were embedded successfully, but at least one failed

`client.ai.embeddings.retrieve()` — `GET /ai/embeddings/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |

```python
embedding = client.ai.embeddings.retrieve(
    "task_id",
)
print(embedding.data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.finished_at`

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`client.ai.fine_tuning.jobs.list()` — `GET /ai/fine_tuning/jobs`

```python
jobs = client.ai.fine_tuning.jobs.list()
print(jobs.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a fine tuning job

Create a new fine tuning job.

`client.ai.fine_tuning.jobs.create()` — `POST /ai/fine_tuning/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | The base model that is being fine-tuned. |
| `training_file` | string | Yes | The storage bucket or object used for training. |
| `suffix` | string | No | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | No | The hyperparameters used for the fine-tuning job. |

```python
fine_tuning_job = client.ai.fine_tuning.jobs.create(
    model="meta-llama/Meta-Llama-3.1-8B-Instruct",
    training_file="training-data.jsonl",
)
print(fine_tuning_job.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`client.ai.fine_tuning.jobs.retrieve()` — `GET /ai/fine_tuning/jobs/{job_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | string (UUID) | Yes |  |

```python
fine_tuning_job = client.ai.fine_tuning.jobs.retrieve(
    "job_id",
)
print(fine_tuning_job.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a fine tuning job

Cancel a fine tuning job.

`client.ai.fine_tuning.jobs.cancel()` — `POST /ai/fine_tuning/jobs/{job_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | string (UUID) | Yes |  |

```python
fine_tuning_job = client.ai.fine_tuning.jobs.cancel(
    "job_id",
)
print(fine_tuning_job.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.    **Note**: Model `id`'s will be in the form `{source}/{model_name}`. For example `openai/gpt-4` or `mistralai/Mistral-7B-Instruct-v0.1` consistent with HuggingFace naming conventions.

`client.ai.retrieve_models()` — `GET /ai/models`

```python
response = client.ai.retrieve_models()
print(response.data)
```

Key response fields: `response.data.id, response.data.created, response.data.object`

## Create embeddings

Creates an embedding vector representing the input text. This endpoint is compatible with the [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings) and may be used with the OpenAI JS or Python SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.

`client.ai.openai.embeddings.create_embeddings()` — `POST /ai/openai/embeddings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | object | Yes | Input text to embed. |
| `model` | string | Yes | ID of the model to use. |
| `encoding_format` | enum (float, base64) | No | The format to return the embeddings in. |
| `dimensions` | integer | No | The number of dimensions the resulting output embeddings sho... |
| `user` | string | No | A unique identifier representing your end-user for monitorin... |

```python
response = client.ai.openai.embeddings.create_embeddings(
    input="The quick brown fox jumps over the lazy dog",
    model="thenlper/gte-large",
)
print(response.data)
```

Key response fields: `response.data.data, response.data.model, response.data.object`

## List embedding models

Returns a list of available embedding models. This endpoint is compatible with the OpenAI Models API format.

`client.ai.openai.embeddings.list_embedding_models()` — `GET /ai/openai/embeddings/models`

```python
response = client.ai.openai.embeddings.list_embedding_models()
print(response.data)
```

Key response fields: `response.data.id, response.data.created, response.data.object`

## Summarize file content

Generate a summary of a file's contents. Supports the following text formats: 
- PDF, HTML, txt, json, csv

 Supports the following media formats (billed for both the transcription and summary): 
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
- Up to 100 MB

`client.ai.summarize()` — `POST /ai/summarize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | The name of the bucket that contains the file to be summariz... |
| `filename` | string | Yes | The name of the file to be summarized. |
| `system_prompt` | string | No | A system prompt to guide the summary generation. |

```python
response = client.ai.summarize(
    bucket="my-bucket",
    filename="data.csv",
)
print(response.data)
```

Key response fields: `response.data.summary`

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`client.legacy.reporting.batch_detail_records.speech_to_text.list()` — `GET /legacy/reporting/batch_detail_records/speech_to_text`

```python
speech_to_texts = client.legacy.reporting.batch_detail_records.speech_to_text.list()
print(speech_to_texts.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`client.legacy.reporting.batch_detail_records.speech_to_text.create()` — `POST /legacy/reporting/batch_detail_records/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | Yes | Start date in ISO format with timezone |
| `end_date` | string (date-time) | Yes | End date in ISO format with timezone (date range must be up ... |

```python
from datetime import datetime

speech_to_text = client.legacy.reporting.batch_detail_records.speech_to_text.create(
    end_date=datetime.fromisoformat("2020-07-01T00:00:00-06:00"),
    start_date=datetime.fromisoformat("2020-07-01T00:00:00-06:00"),
)
print(speech_to_text.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`client.legacy.reporting.batch_detail_records.speech_to_text.retrieve()` — `GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
speech_to_text = client.legacy.reporting.batch_detail_records.speech_to_text.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(speech_to_text.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`client.legacy.reporting.batch_detail_records.speech_to_text.delete()` — `DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
speech_to_text = client.legacy.reporting.batch_detail_records.speech_to_text.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(speech_to_text.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously. This endpoint will both generate and fetch the speech to text report over a specified time period.

`client.legacy.reporting.usage_reports.retrieve_speech_to_text()` — `GET /legacy/reporting/usage_reports/speech_to_text`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (date-time) | No |  |
| `end_date` | string (date-time) | No |  |

```python
response = client.legacy.reporting.usage_reports.retrieve_speech_to_text()
print(response.data)
```

Key response fields: `response.data.data`

## Generate speech from text

Generate synthesized speech audio from text input. Returns audio in the requested format (binary audio stream, base64-encoded JSON, or an audio URL for later retrieval). Authentication is provided via the standard `Authorization: Bearer ` header.

`client.text_to_speech.generate()` — `POST /text-to-speech/speech`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | TTS provider. |
| `text_type` | enum (text, ssml) | No | Text type. |
| `output_type` | enum (binary_output, base64_output) | No | Determines the response format. |
| ... | | | +12 optional params in the API Details section below |

```python
response = client.text_to_speech.generate()
print(response.base64_audio)
```

Key response fields: `response.data.base64_audio`

## List available voices

Retrieve a list of available voices from one or all TTS providers. When `provider` is specified, returns voices for that provider only. Otherwise, returns voices from all providers.

`client.text_to_speech.list_voices()` — `GET /text-to-speech/voices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | No | Filter voices by provider. |
| `api_key` | string | No | API key for providers that require one to list voices (e.g. |

```python
response = client.text_to_speech.list_voices()
print(response.voices)
```

Key response fields: `response.data.voices`

---

# AI Inference (Python) — API Details

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

### Create a chat completion — `client.ai.chat.create_completion()`

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

### Create a conversation — `client.ai.conversations.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `metadata` | object | Metadata associated with the conversation. |

### Create Insight Template Group — `client.ai.conversations.insight_groups.insight_groups()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |
| `webhook` | string |  |

### Update Insight Template Group — `client.ai.conversations.insight_groups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `description` | string |  |
| `webhook` | string |  |

### Create Insight Template — `client.ai.conversations.insights.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook` | string |  |
| `json_schema` | object | If specified, the output will follow the JSON schema. |

### Update Insight Template — `client.ai.conversations.insights.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `instructions` | string |  |
| `name` | string |  |
| `webhook` | string |  |
| `json_schema` | object |  |

### Update conversation metadata — `client.ai.conversations.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `metadata` | object | Metadata associated with the conversation. |

### Create Message — `client.ai.conversations.add_message()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | string |  |
| `name` | string |  |
| `tool_choice` | object |  |
| `tool_calls` | array[object] |  |
| `tool_call_id` | string (UUID) |  |
| `sent_at` | string (date-time) |  |
| `metadata` | object |  |

### Embed documents — `client.ai.embeddings.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_chunk_size` | integer |  |
| `document_chunk_overlap_size` | integer |  |
| `embedding_model` | object |  |
| `loader` | object |  |

### Search for documents — `client.ai.embeddings.similarity_search()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `num_of_docs` | integer |  |

### Create a fine tuning job — `client.ai.fine_tuning.jobs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `suffix` | string | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | The hyperparameters used for the fine-tuning job. |

### Create embeddings — `client.ai.openai.embeddings.create_embeddings()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `encoding_format` | enum (float, base64) | The format to return the embeddings in. |
| `dimensions` | integer | The number of dimensions the resulting output embeddings should have. |
| `user` | string | A unique identifier representing your end-user for monitoring and abuse detec... |

### Summarize file content — `client.ai.summarize()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `system_prompt` | string | A system prompt to guide the summary generation. |

### Generate speech from text — `client.text_to_speech.generate()`

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
