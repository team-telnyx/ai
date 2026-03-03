---
name: telnyx-ai-inference-javascript
description: >-
  Access Telnyx LLM inference APIs, embeddings, and AI analytics for call
  insights and summaries. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: ai-inference
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Ai Inference - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Transcribe speech to text

Transcribe speech to text.

`POST /ai/audio/transcriptions`

```javascript
const response = await client.ai.audio.transcribe({ model: 'distil-whisper/distil-large-v2' });

console.log(response.text);
```

## Create a chat completion

Chat with a language model.

`POST /ai/chat/completions` — Required: `messages`

Optional: `api_key_ref` (string), `best_of` (integer), `early_stopping` (boolean), `frequency_penalty` (number), `guided_choice` (array[string]), `guided_json` (object), `guided_regex` (string), `length_penalty` (number), `logprobs` (boolean), `max_tokens` (integer), `min_p` (number), `model` (string), `n` (number), `presence_penalty` (number), `response_format` (object), `stream` (boolean), `temperature` (number), `tool_choice` (enum), `tools` (array[object]), `top_logprobs` (integer), `top_p` (number), `use_beam_search` (boolean)

```javascript
const response = await client.ai.chat.createCompletion({
  messages: [
    { role: 'system', content: 'You are a friendly chatbot.' },
    { role: 'user', content: 'Hello, world!' },
  ],
});

console.log(response);
```

## List conversations

Retrieve a list of all AI conversations configured by the user.

`GET /ai/conversations`

```javascript
const conversations = await client.ai.conversations.list();

console.log(conversations.data);
```

## Create a conversation

Create a new AI Conversation.

`POST /ai/conversations`

Optional: `metadata` (object), `name` (string)

```javascript
const conversation = await client.ai.conversations.create();

console.log(conversation.id);
```

## Get Insight Template Groups

Get all insight groups

`GET /ai/conversations/insight-groups`

```javascript
// Automatically fetches more pages as needed.
for await (const insightTemplateGroup of client.ai.conversations.insightGroups.retrieveInsightGroups()) {
  console.log(insightTemplateGroup.id);
}
```

## Create Insight Template Group

Create a new insight group

`POST /ai/conversations/insight-groups` — Required: `name`

Optional: `description` (string), `webhook` (string)

```javascript
const insightTemplateGroupDetail = await client.ai.conversations.insightGroups.insightGroups({
  name: 'name',
});

console.log(insightTemplateGroupDetail.data);
```

## Get Insight Template Group

Get insight group by ID

`GET /ai/conversations/insight-groups/{group_id}`

```javascript
const insightTemplateGroupDetail = await client.ai.conversations.insightGroups.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(insightTemplateGroupDetail.data);
```

## Update Insight Template Group

Update an insight template group

`PUT /ai/conversations/insight-groups/{group_id}`

Optional: `description` (string), `name` (string), `webhook` (string)

```javascript
const insightTemplateGroupDetail = await client.ai.conversations.insightGroups.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(insightTemplateGroupDetail.data);
```

## Delete Insight Template Group

Delete insight group by ID

`DELETE /ai/conversations/insight-groups/{group_id}`

```javascript
await client.ai.conversations.insightGroups.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Assign Insight Template To Group

Assign an insight to a group

`POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

```javascript
await client.ai.conversations.insightGroups.insights.assign(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { group_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);
```

## Unassign Insight Template From Group

Remove an insight from a group

`DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

```javascript
await client.ai.conversations.insightGroups.insights.deleteUnassign(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { group_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);
```

## Get Insight Templates

Get all insights

`GET /ai/conversations/insights`

```javascript
// Automatically fetches more pages as needed.
for await (const insightTemplate of client.ai.conversations.insights.list()) {
  console.log(insightTemplate.id);
}
```

## Create Insight Template

Create a new insight

`POST /ai/conversations/insights` — Required: `instructions`, `name`

Optional: `json_schema` (object), `webhook` (string)

```javascript
const insightTemplateDetail = await client.ai.conversations.insights.create({
  instructions: 'instructions',
  name: 'name',
});

console.log(insightTemplateDetail.data);
```

## Get Insight Template

Get insight by ID

`GET /ai/conversations/insights/{insight_id}`

```javascript
const insightTemplateDetail = await client.ai.conversations.insights.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(insightTemplateDetail.data);
```

## Update Insight Template

Update an insight template

`PUT /ai/conversations/insights/{insight_id}`

Optional: `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

```javascript
const insightTemplateDetail = await client.ai.conversations.insights.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(insightTemplateDetail.data);
```

## Delete Insight Template

Delete insight by ID

`DELETE /ai/conversations/insights/{insight_id}`

```javascript
await client.ai.conversations.insights.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`GET /ai/conversations/{conversation_id}`

```javascript
const conversation = await client.ai.conversations.retrieve('conversation_id');

console.log(conversation.data);
```

## Update conversation metadata

Update metadata for a specific conversation.

`PUT /ai/conversations/{conversation_id}`

Optional: `metadata` (object)

```javascript
const conversation = await client.ai.conversations.update('conversation_id');

console.log(conversation.data);
```

## Delete a conversation

Delete a specific conversation by its ID.

`DELETE /ai/conversations/{conversation_id}`

```javascript
await client.ai.conversations.delete('conversation_id');
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`GET /ai/conversations/{conversation_id}/conversations-insights`

```javascript
const response = await client.ai.conversations.retrieveConversationsInsights('conversation_id');

console.log(response.data);
```

## Create Message

Add a new message to the conversation.

`POST /ai/conversations/{conversation_id}/message` — Required: `role`

Optional: `content` (string), `metadata` (object), `name` (string), `sent_at` (date-time), `tool_call_id` (string), `tool_calls` (array[object]), `tool_choice` (object)

```javascript
await client.ai.conversations.addMessage('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', { role: 'role' });
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`GET /ai/conversations/{conversation_id}/messages`

```javascript
const messages = await client.ai.conversations.messages.list('conversation_id');

console.log(messages.data);
```

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string.

`GET /ai/embeddings`

```javascript
const embeddings = await client.ai.embeddings.list();

console.log(embeddings.data);
```

## Embed documents

Perform embedding on a Telnyx Storage Bucket using an embedding model.

`POST /ai/embeddings` — Required: `bucket_name`

Optional: `document_chunk_overlap_size` (integer), `document_chunk_size` (integer), `embedding_model` (object), `loader` (object)

```javascript
const embeddingResponse = await client.ai.embeddings.create({ bucket_name: 'bucket_name' });

console.log(embeddingResponse.data);
```

## List embedded buckets

Get all embedding buckets for a user.

`GET /ai/embeddings/buckets`

```javascript
const buckets = await client.ai.embeddings.buckets.list();

console.log(buckets.data);
```

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`GET /ai/embeddings/buckets/{bucket_name}`

```javascript
const bucket = await client.ai.embeddings.buckets.retrieve('bucket_name');

console.log(bucket.data);
```

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`DELETE /ai/embeddings/buckets/{bucket_name}`

```javascript
await client.ai.embeddings.buckets.delete('bucket_name');
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query.

`POST /ai/embeddings/similarity-search` — Required: `bucket_name`, `query`

Optional: `num_of_docs` (integer)

```javascript
const response = await client.ai.embeddings.similaritySearch({
  bucket_name: 'bucket_name',
  query: 'query',
});

console.log(response.data);
```

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain.

`POST /ai/embeddings/url` — Required: `url`, `bucket_name`

```javascript
const embeddingResponse = await client.ai.embeddings.url({
  bucket_name: 'bucket_name',
  url: 'url',
});

console.log(embeddingResponse.data);
```

## Get an embedding task's status

Check the status of a current embedding task.

`GET /ai/embeddings/{task_id}`

```javascript
const embedding = await client.ai.embeddings.retrieve('task_id');

console.log(embedding.data);
```

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`GET /ai/fine_tuning/jobs`

```javascript
const jobs = await client.ai.fineTuning.jobs.list();

console.log(jobs.data);
```

## Create a fine tuning job

Create a new fine tuning job.

`POST /ai/fine_tuning/jobs` — Required: `model`, `training_file`

Optional: `hyperparameters` (object), `suffix` (string)

```javascript
const fineTuningJob = await client.ai.fineTuning.jobs.create({
  model: 'model',
  training_file: 'training_file',
});

console.log(fineTuningJob.id);
```

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`GET /ai/fine_tuning/jobs/{job_id}`

```javascript
const fineTuningJob = await client.ai.fineTuning.jobs.retrieve('job_id');

console.log(fineTuningJob.id);
```

## Cancel a fine tuning job

Cancel a fine tuning job.

`POST /ai/fine_tuning/jobs/{job_id}/cancel`

```javascript
const fineTuningJob = await client.ai.fineTuning.jobs.cancel('job_id');

console.log(fineTuningJob.id);
```

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.

`GET /ai/models`

```javascript
const response = await client.ai.retrieveModels();

console.log(response.data);
```

## Create embeddings

Creates an embedding vector representing the input text.

`POST /ai/openai/embeddings` — Required: `input`, `model`

Optional: `dimensions` (integer), `encoding_format` (enum), `user` (string)

```javascript
const response = await client.ai.openai.embeddings.createEmbeddings({
  input: 'The quick brown fox jumps over the lazy dog',
  model: 'thenlper/gte-large',
});

console.log(response.data);
```

## List embedding models

Returns a list of available embedding models.

`GET /ai/openai/embeddings/models`

```javascript
const response = await client.ai.openai.embeddings.listEmbeddingModels();

console.log(response.data);
```

## Summarize file content

Generate a summary of a file's contents.

`POST /ai/summarize` — Required: `bucket`, `filename`

Optional: `system_prompt` (string)

```javascript
const response = await client.ai.summarize({ bucket: 'bucket', filename: 'filename' });

console.log(response.data);
```

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/speech_to_text`

```javascript
const speechToTexts = await client.legacy.reporting.batchDetailRecords.speechToText.list();

console.log(speechToTexts.data);
```

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`POST /legacy/reporting/batch_detail_records/speech_to_text` — Required: `start_date`, `end_date`

```javascript
const speechToText = await client.legacy.reporting.batchDetailRecords.speechToText.create({
  end_date: '2020-07-01T00:00:00-06:00',
  start_date: '2020-07-01T00:00:00-06:00',
});

console.log(speechToText.data);
```

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```javascript
const speechToText = await client.legacy.reporting.batchDetailRecords.speechToText.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(speechToText.data);
```

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```javascript
const speechToText = await client.legacy.reporting.batchDetailRecords.speechToText.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(speechToText.data);
```

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously.

`GET /legacy/reporting/usage_reports/speech_to_text`

```javascript
const response = await client.legacy.reporting.usageReports.retrieveSpeechToText();

console.log(response.data);
```

## Speech to text over websocket

Transcribe audio streams to text over WebSocket.

`GET /speech-to-text/transcription`

```javascript
await client.speechToText.transcribe({ input_format: 'mp3', transcription_engine: 'Azure' });
```

## Stream text to speech over WebSocket

Open a WebSocket connection to stream text and receive synthesized audio in real time.

`GET /text-to-speech/speech`

```javascript
await client.textToSpeech.stream();
```

## Generate speech from text

Generate synthesized speech audio from text input.

`POST /text-to-speech/speech`

Optional: `aws` (object), `azure` (object), `disable_cache` (boolean), `elevenlabs` (object), `language` (string), `minimax` (object), `output_type` (enum), `provider` (enum), `resemble` (object), `rime` (object), `telnyx` (object), `text` (string), `text_type` (enum), `voice` (string), `voice_settings` (object)

```javascript
const response = await client.textToSpeech.generate();

console.log(response.base64_audio);
```

## List available voices

Retrieve a list of available voices from one or all TTS providers.

`GET /text-to-speech/voices`

```javascript
const response = await client.textToSpeech.listVoices();

console.log(response.voices);
```

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`GET /wireless/detail_records_reports`

```javascript
const detailRecordsReports = await client.wireless.detailRecordsReports.list();

console.log(detailRecordsReports.data);
```

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`POST /wireless/detail_records_reports`

Optional: `end_time` (string), `start_time` (string)

```javascript
const detailRecordsReport = await client.wireless.detailRecordsReports.create();

console.log(detailRecordsReport.data);
```

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`GET /wireless/detail_records_reports/{id}`

```javascript
const detailRecordsReport = await client.wireless.detailRecordsReports.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(detailRecordsReport.data);
```

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`DELETE /wireless/detail_records_reports/{id}`

```javascript
const detailRecordsReport = await client.wireless.detailRecordsReports.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(detailRecordsReport.data);
```
