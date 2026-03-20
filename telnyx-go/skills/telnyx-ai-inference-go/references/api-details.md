# AI Inference (Go) — API Details

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

### Create a chat completion — `client.AI.Chat.NewCompletion()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Model` | string | The language model to chat with. |
| `ApiKeyRef` | string | If you are using an external inference provider like xAI or OpenAI, this fiel... |
| `Stream` | boolean | Whether or not to stream data-only server-sent events as they become available. |
| `Temperature` | number | Adjusts the "creativity" of the model. |
| `MaxTokens` | integer | Maximum number of completion tokens the model should generate. |
| `Tools` | array[object] | The `function` tool type follows the same schema as the [OpenAI Chat Completi... |
| `ToolChoice` | enum (none, auto, required) |  |
| `ResponseFormat` | object |  |
| `GuidedJson` | object | Must be a valid JSON schema. |
| `GuidedRegex` | string | If specified, the output will follow the regex pattern. |
| `GuidedChoice` | array[string] | If specified, the output will be exactly one of the choices. |
| `MinP` | number | This is an alternative to `top_p` that [many prefer](https://github.com/huggi... |
| `N` | number | This will return multiple choices for you instead of a single chat completion. |
| `UseBeamSearch` | boolean | Setting this to `true` will allow the model to [explore more completion optio... |
| `BestOf` | integer | This is used with `use_beam_search` to determine how many candidate beams to ... |
| `LengthPenalty` | number | This is used with `use_beam_search` to prefer shorter or longer completions. |
| `EarlyStopping` | boolean | This is used with `use_beam_search`. |
| `Logprobs` | boolean | Whether to return log probabilities of the output tokens or not. |
| `TopLogprobs` | integer | This is used with `logprobs`. |
| `FrequencyPenalty` | number | Higher values will penalize the model from repeating the same output tokens. |
| `PresencePenalty` | number | Higher values will penalize the model from repeating the same output tokens. |
| `TopP` | number | An alternative or complement to `temperature`. |
| `EnableThinking` | boolean | Whether to enable the thinking/reasoning phase for models that support it (e.... |

### Create a conversation — `client.AI.Conversations.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Metadata` | object | Metadata associated with the conversation. |

### Create Insight Template Group — `client.AI.Conversations.InsightGroups.InsightGroups()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Description` | string |  |
| `Webhook` | string |  |

### Update Insight Template Group — `client.AI.Conversations.InsightGroups.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Description` | string |  |
| `Webhook` | string |  |

### Create Insight Template — `client.AI.Conversations.Insights.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Webhook` | string |  |
| `JsonSchema` | object | If specified, the output will follow the JSON schema. |

### Update Insight Template — `client.AI.Conversations.Insights.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Instructions` | string |  |
| `Name` | string |  |
| `Webhook` | string |  |
| `JsonSchema` | object |  |

### Update conversation metadata — `client.AI.Conversations.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Metadata` | object | Metadata associated with the conversation. |

### Create Message — `client.AI.Conversations.AddMessage()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Content` | string |  |
| `Name` | string |  |
| `ToolChoice` | object |  |
| `ToolCalls` | array[object] |  |
| `ToolCallId` | string (UUID) |  |
| `SentAt` | string (date-time) |  |
| `Metadata` | object |  |

### Embed documents — `client.AI.Embeddings.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `DocumentChunkSize` | integer |  |
| `DocumentChunkOverlapSize` | integer |  |
| `EmbeddingModel` | object |  |
| `Loader` | object |  |

### Search for documents — `client.AI.Embeddings.SimilaritySearch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `NumOfDocs` | integer |  |

### Create a fine tuning job — `client.AI.FineTuning.Jobs.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Suffix` | string | Optional suffix to append to the fine tuned model's name. |
| `Hyperparameters` | object | The hyperparameters used for the fine-tuning job. |

### Create embeddings — `client.AI.OpenAI.Embeddings.NewEmbeddings()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `EncodingFormat` | enum (float, base64) | The format to return the embeddings in. |
| `Dimensions` | integer | The number of dimensions the resulting output embeddings should have. |
| `User` | string | A unique identifier representing your end-user for monitoring and abuse detec... |

### Summarize file content — `client.AI.Summarize()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `SystemPrompt` | string | A system prompt to guide the summary generation. |

### Generate speech from text — `client.TextToSpeech.Generate()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Voice` | string | Voice identifier in the format `provider.model_id.voice_id` or `provider.voic... |
| `Text` | string | The text to convert to speech. |
| `Provider` | enum (aws, telnyx, azure, elevenlabs, minimax, ...) | TTS provider. |
| `Language` | string | Language code (e.g. |
| `TextType` | enum (text, ssml) | Text type. |
| `OutputType` | enum (binary_output, base64_output) | Determines the response format. |
| `DisableCache` | boolean | When `true`, bypass the audio cache and generate fresh audio. |
| `VoiceSettings` | object | Provider-specific voice settings. |
| `Aws` | object | AWS Polly provider-specific parameters. |
| `Telnyx` | object | Telnyx provider-specific parameters. |
| `Azure` | object | Azure Cognitive Services provider-specific parameters. |
| `Elevenlabs` | object | ElevenLabs provider-specific parameters. |
| `Minimax` | object | Minimax provider-specific parameters. |
| `Rime` | object | Rime provider-specific parameters. |
| `Resemble` | object | Resemble AI provider-specific parameters. |
