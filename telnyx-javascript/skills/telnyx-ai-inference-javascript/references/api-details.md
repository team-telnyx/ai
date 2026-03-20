# AI Inference (JavaScript) — API Details

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

### Create a chat completion — `client.ai.chat.createCompletion()`

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

### Create a conversation — `client.ai.conversations.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `metadata` | object | Metadata associated with the conversation. |

### Create Insight Template Group — `client.ai.conversations.insightGroups.insightGroups()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |
| `webhook` | string |  |

### Update Insight Template Group — `client.ai.conversations.insightGroups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `description` | string |  |
| `webhook` | string |  |

### Create Insight Template — `client.ai.conversations.insights.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook` | string |  |
| `jsonSchema` | object | If specified, the output will follow the JSON schema. |

### Update Insight Template — `client.ai.conversations.insights.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `instructions` | string |  |
| `name` | string |  |
| `webhook` | string |  |
| `jsonSchema` | object |  |

### Update conversation metadata — `client.ai.conversations.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `metadata` | object | Metadata associated with the conversation. |

### Create Message — `client.ai.conversations.addMessage()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | string |  |
| `name` | string |  |
| `toolChoice` | object |  |
| `toolCalls` | array[object] |  |
| `toolCallId` | string (UUID) |  |
| `sentAt` | string (date-time) |  |
| `metadata` | object |  |

### Embed documents — `client.ai.embeddings.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `documentChunkSize` | integer |  |
| `documentChunkOverlapSize` | integer |  |
| `embeddingModel` | object |  |
| `loader` | object |  |

### Search for documents — `client.ai.embeddings.similaritySearch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `numOfDocs` | integer |  |

### Create a fine tuning job — `client.ai.fineTuning.jobs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `suffix` | string | Optional suffix to append to the fine tuned model's name. |
| `hyperparameters` | object | The hyperparameters used for the fine-tuning job. |

### Create embeddings — `client.ai.openai.embeddings.createEmbeddings()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `encodingFormat` | enum (float, base64) | The format to return the embeddings in. |
| `dimensions` | integer | The number of dimensions the resulting output embeddings should have. |
| `user` | string | A unique identifier representing your end-user for monitoring and abuse detec... |

### Summarize file content — `client.ai.summarize()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `systemPrompt` | string | A system prompt to guide the summary generation. |

### Generate speech from text — `client.textToSpeech.generate()`

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
