---
name: telnyx-ai-inference-go
description: >-
  Access Telnyx LLM inference APIs, embeddings, and AI analytics for call
  insights and summaries. This skill provides Go SDK examples.
metadata:
  author: telnyx
  product: ai-inference
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

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

## Transcribe speech to text

Transcribe speech to text.

`POST /ai/audio/transcriptions`

```go
	response, err := client.AI.Audio.Transcribe(context.TODO(), telnyx.AIAudioTranscribeParams{
		Model: telnyx.AIAudioTranscribeParamsModelDistilWhisperDistilLargeV2,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Text)
```

## Create a chat completion

Chat with a language model.

`POST /ai/chat/completions` — Required: `messages`

Optional: `api_key_ref` (string), `best_of` (integer), `early_stopping` (boolean), `frequency_penalty` (number), `guided_choice` (array[string]), `guided_json` (object), `guided_regex` (string), `length_penalty` (number), `logprobs` (boolean), `max_tokens` (integer), `min_p` (number), `model` (string), `n` (number), `presence_penalty` (number), `response_format` (object), `stream` (boolean), `temperature` (number), `tool_choice` (enum), `tools` (array[object]), `top_logprobs` (integer), `top_p` (number), `use_beam_search` (boolean)

```go
	response, err := client.AI.Chat.NewCompletion(context.TODO(), telnyx.AIChatNewCompletionParams{
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
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## List conversations

Retrieve a list of all AI conversations configured by the user.

`GET /ai/conversations`

```go
	conversations, err := client.AI.Conversations.List(context.TODO(), telnyx.AIConversationListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", conversations.Data)
```

## Create a conversation

Create a new AI Conversation.

`POST /ai/conversations`

Optional: `metadata` (object), `name` (string)

```go
	conversation, err := client.AI.Conversations.New(context.TODO(), telnyx.AIConversationNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", conversation.ID)
```

## Get Insight Template Groups

Get all insight groups

`GET /ai/conversations/insight-groups`

```go
	page, err := client.AI.Conversations.InsightGroups.GetInsightGroups(context.TODO(), telnyx.AIConversationInsightGroupGetInsightGroupsParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create Insight Template Group

Create a new insight group

`POST /ai/conversations/insight-groups` — Required: `name`

Optional: `description` (string), `webhook` (string)

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.InsightGroups(context.TODO(), telnyx.AIConversationInsightGroupInsightGroupsParams{
		Name: "name",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

## Get Insight Template Group

Get insight group by ID

`GET /ai/conversations/insight-groups/{group_id}`

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

## Update Insight Template Group

Update an insight template group

`PUT /ai/conversations/insight-groups/{group_id}`

Optional: `description` (string), `name` (string), `webhook` (string)

```go
	insightTemplateGroupDetail, err := client.AI.Conversations.InsightGroups.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightGroupUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", insightTemplateGroupDetail.Data)
```

## Delete Insight Template Group

Delete insight group by ID

`DELETE /ai/conversations/insight-groups/{group_id}`

```go
	err := client.AI.Conversations.InsightGroups.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## Assign Insight Template To Group

Assign an insight to a group

`POST /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign`

```go
	err := client.AI.Conversations.InsightGroups.Insights.Assign(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightGroupInsightAssignParams{
			GroupID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## Unassign Insight Template From Group

Remove an insight from a group

`DELETE /ai/conversations/insight-groups/{group_id}/insights/{insight_id}/unassign`

```go
	err := client.AI.Conversations.InsightGroups.Insights.DeleteUnassign(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightGroupInsightDeleteUnassignParams{
			GroupID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## Get Insight Templates

Get all insights

`GET /ai/conversations/insights`

```go
	page, err := client.AI.Conversations.Insights.List(context.TODO(), telnyx.AIConversationInsightListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create Insight Template

Create a new insight

`POST /ai/conversations/insights` — Required: `instructions`, `name`

Optional: `json_schema` (object), `webhook` (string)

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.New(context.TODO(), telnyx.AIConversationInsightNewParams{
		Instructions: "instructions",
		Name:         "name",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

## Get Insight Template

Get insight by ID

`GET /ai/conversations/insights/{insight_id}`

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

## Update Insight Template

Update an insight template

`PUT /ai/conversations/insights/{insight_id}`

Optional: `instructions` (string), `json_schema` (object), `name` (string), `webhook` (string)

```go
	insightTemplateDetail, err := client.AI.Conversations.Insights.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationInsightUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", insightTemplateDetail.Data)
```

## Delete Insight Template

Delete insight by ID

`DELETE /ai/conversations/insights/{insight_id}`

```go
	err := client.AI.Conversations.Insights.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## Get a conversation

Retrieve a specific AI conversation by its ID.

`GET /ai/conversations/{conversation_id}`

```go
	conversation, err := client.AI.Conversations.Get(context.TODO(), "conversation_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", conversation.Data)
```

## Update conversation metadata

Update metadata for a specific conversation.

`PUT /ai/conversations/{conversation_id}`

Optional: `metadata` (object)

```go
	conversation, err := client.AI.Conversations.Update(
		context.TODO(),
		"conversation_id",
		telnyx.AIConversationUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", conversation.Data)
```

## Delete a conversation

Delete a specific conversation by its ID.

`DELETE /ai/conversations/{conversation_id}`

```go
	err := client.AI.Conversations.Delete(context.TODO(), "conversation_id")
	if err != nil {
		panic(err.Error())
	}
```

## Get insights for a conversation

Retrieve insights for a specific conversation

`GET /ai/conversations/{conversation_id}/conversations-insights`

```go
	response, err := client.AI.Conversations.GetConversationsInsights(context.TODO(), "conversation_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Create Message

Add a new message to the conversation.

`POST /ai/conversations/{conversation_id}/message` — Required: `role`

Optional: `content` (string), `metadata` (object), `name` (string), `sent_at` (date-time), `tool_call_id` (string), `tool_calls` (array[object]), `tool_choice` (object)

```go
	err := client.AI.Conversations.AddMessage(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIConversationAddMessageParams{
			Role: "role",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## Get conversation messages

Retrieve messages for a specific conversation, including tool calls made by the assistant.

`GET /ai/conversations/{conversation_id}/messages`

```go
	messages, err := client.AI.Conversations.Messages.List(context.TODO(), "conversation_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", messages.Data)
```

## Get Tasks by Status

Retrieve tasks for the user that are either `queued`, `processing`, `failed`, `success` or `partial_success` based on the query string.

`GET /ai/embeddings`

```go
	embeddings, err := client.AI.Embeddings.List(context.TODO(), telnyx.AIEmbeddingListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", embeddings.Data)
```

## Embed documents

Perform embedding on a Telnyx Storage Bucket using an embedding model.

`POST /ai/embeddings` — Required: `bucket_name`

Optional: `document_chunk_overlap_size` (integer), `document_chunk_size` (integer), `embedding_model` (object), `loader` (object)

```go
	embeddingResponse, err := client.AI.Embeddings.New(context.TODO(), telnyx.AIEmbeddingNewParams{
		BucketName: "bucket_name",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", embeddingResponse.Data)
```

## List embedded buckets

Get all embedding buckets for a user.

`GET /ai/embeddings/buckets`

```go
	buckets, err := client.AI.Embeddings.Buckets.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", buckets.Data)
```

## Get file-level embedding statuses for a bucket

Get all embedded files for a given user bucket, including their processing status.

`GET /ai/embeddings/buckets/{bucket_name}`

```go
	bucket, err := client.AI.Embeddings.Buckets.Get(context.TODO(), "bucket_name")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", bucket.Data)
```

## Disable AI for an Embedded Bucket

Deletes an entire bucket's embeddings and disables the bucket for AI-use, returning it to normal storage pricing.

`DELETE /ai/embeddings/buckets/{bucket_name}`

```go
	err := client.AI.Embeddings.Buckets.Delete(context.TODO(), "bucket_name")
	if err != nil {
		panic(err.Error())
	}
```

## Search for documents

Perform a similarity search on a Telnyx Storage Bucket, returning the most similar `num_docs` document chunks to the query.

`POST /ai/embeddings/similarity-search` — Required: `bucket_name`, `query`

Optional: `num_of_docs` (integer)

```go
	response, err := client.AI.Embeddings.SimilaritySearch(context.TODO(), telnyx.AIEmbeddingSimilaritySearchParams{
		BucketName: "bucket_name",
		Query:      "query",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Embed URL content

Embed website content from a specified URL, including child pages up to 5 levels deep within the same domain.

`POST /ai/embeddings/url` — Required: `url`, `bucket_name`

```go
	embeddingResponse, err := client.AI.Embeddings.URL(context.TODO(), telnyx.AIEmbeddingURLParams{
		BucketName: "bucket_name",
		URL:        "url",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", embeddingResponse.Data)
```

## Get an embedding task's status

Check the status of a current embedding task.

`GET /ai/embeddings/{task_id}`

```go
	embedding, err := client.AI.Embeddings.Get(context.TODO(), "task_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", embedding.Data)
```

## List fine tuning jobs

Retrieve a list of all fine tuning jobs created by the user.

`GET /ai/fine_tuning/jobs`

```go
	jobs, err := client.AI.FineTuning.Jobs.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", jobs.Data)
```

## Create a fine tuning job

Create a new fine tuning job.

`POST /ai/fine_tuning/jobs` — Required: `model`, `training_file`

Optional: `hyperparameters` (object), `suffix` (string)

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.New(context.TODO(), telnyx.AIFineTuningJobNewParams{
		Model:        "model",
		TrainingFile: "training_file",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

## Get a fine tuning job

Retrieve a fine tuning job by `job_id`.

`GET /ai/fine_tuning/jobs/{job_id}`

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.Get(context.TODO(), "job_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

## Cancel a fine tuning job

Cancel a fine tuning job.

`POST /ai/fine_tuning/jobs/{job_id}/cancel`

```go
	fineTuningJob, err := client.AI.FineTuning.Jobs.Cancel(context.TODO(), "job_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fineTuningJob.ID)
```

## Get available models

This endpoint returns a list of Open Source and OpenAI models that are available for use.

`GET /ai/models`

```go
	response, err := client.AI.GetModels(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Create embeddings

Creates an embedding vector representing the input text.

`POST /ai/openai/embeddings` — Required: `input`, `model`

Optional: `dimensions` (integer), `encoding_format` (enum), `user` (string)

```go
	response, err := client.AI.OpenAI.Embeddings.NewEmbeddings(context.TODO(), telnyx.AIOpenAIEmbeddingNewEmbeddingsParams{
		Input: telnyx.AIOpenAIEmbeddingNewEmbeddingsParamsInputUnion{
			OfString: telnyx.String("The quick brown fox jumps over the lazy dog"),
		},
		Model: "thenlper/gte-large",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List embedding models

Returns a list of available embedding models.

`GET /ai/openai/embeddings/models`

```go
	response, err := client.AI.OpenAI.Embeddings.ListEmbeddingModels(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Summarize file content

Generate a summary of a file's contents.

`POST /ai/summarize` — Required: `bucket`, `filename`

Optional: `system_prompt` (string)

```go
	response, err := client.AI.Summarize(context.TODO(), telnyx.AISummarizeParams{
		Bucket:   "bucket",
		Filename: "filename",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get all Speech to Text batch report requests

Retrieves all Speech to Text batch report requests for the authenticated user

`GET /legacy/reporting/batch_detail_records/speech_to_text`

```go
	speechToTexts, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", speechToTexts.Data)
```

## Create a new Speech to Text batch report request

Creates a new Speech to Text batch report request with the specified filters

`POST /legacy/reporting/batch_detail_records/speech_to_text` — Required: `start_date`, `end_date`

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.New(context.TODO(), telnyx.LegacyReportingBatchDetailRecordSpeechToTextNewParams{
		EndDate:   time.Now(),
		StartDate: time.Now(),
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

## Get a specific Speech to Text batch report request

Retrieves a specific Speech to Text batch report request by ID

`GET /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

## Delete a Speech to Text batch report request

Deletes a specific Speech to Text batch report request by ID

`DELETE /legacy/reporting/batch_detail_records/speech_to_text/{id}`

```go
	speechToText, err := client.Legacy.Reporting.BatchDetailRecords.SpeechToText.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", speechToText.Data)
```

## Get speech to text usage report

Generate and fetch speech to text usage report synchronously.

`GET /legacy/reporting/usage_reports/speech_to_text`

```go
	response, err := client.Legacy.Reporting.UsageReports.GetSpeechToText(context.TODO(), telnyx.LegacyReportingUsageReportGetSpeechToTextParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Speech to text over websocket

Transcribe audio streams to text over WebSocket.

`GET /speech-to-text/transcription`

```go
	err := client.SpeechToText.Transcribe(context.TODO(), telnyx.SpeechToTextTranscribeParams{
		InputFormat:         telnyx.SpeechToTextTranscribeParamsInputFormatMP3,
		TranscriptionEngine: telnyx.SpeechToTextTranscribeParamsTranscriptionEngineAzure,
	})
	if err != nil {
		panic(err.Error())
	}
```

## Stream text to speech over WebSocket

Open a WebSocket connection to stream text and receive synthesized audio in real time.

`GET /text-to-speech/speech`

```go
	err := client.TextToSpeech.Stream(context.TODO(), telnyx.TextToSpeechStreamParams{})
	if err != nil {
		panic(err.Error())
	}
```

## Generate speech from text

Generate synthesized speech audio from text input.

`POST /text-to-speech/speech`

Optional: `aws` (object), `azure` (object), `disable_cache` (boolean), `elevenlabs` (object), `language` (string), `minimax` (object), `output_type` (enum), `provider` (enum), `resemble` (object), `rime` (object), `telnyx` (object), `text` (string), `text_type` (enum), `voice` (string), `voice_settings` (object)

```go
	response, err := client.TextToSpeech.Generate(context.TODO(), telnyx.TextToSpeechGenerateParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Base64Audio)
```

## List available voices

Retrieve a list of available voices from one or all TTS providers.

`GET /text-to-speech/voices`

```go
	response, err := client.TextToSpeech.ListVoices(context.TODO(), telnyx.TextToSpeechListVoicesParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Voices)
```

## Get all Wireless Detail Records (WDRs) Reports

Returns the WDR Reports that match the given parameters.

`GET /wireless/detail_records_reports`

```go
	detailRecordsReports, err := client.Wireless.DetailRecordsReports.List(context.TODO(), telnyx.WirelessDetailRecordsReportListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", detailRecordsReports.Data)
```

## Create a Wireless Detail Records (WDRs) Report

Asynchronously create a report containing Wireless Detail Records (WDRs) for the SIM cards that consumed wireless data in the given time period.

`POST /wireless/detail_records_reports`

Optional: `end_time` (string), `start_time` (string)

```go
	detailRecordsReport, err := client.Wireless.DetailRecordsReports.New(context.TODO(), telnyx.WirelessDetailRecordsReportNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", detailRecordsReport.Data)
```

## Get a Wireless Detail Record (WDR) Report

Returns one specific WDR report

`GET /wireless/detail_records_reports/{id}`

```go
	detailRecordsReport, err := client.Wireless.DetailRecordsReports.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", detailRecordsReport.Data)
```

## Delete a Wireless Detail Record (WDR) Report

Deletes one specific WDR report.

`DELETE /wireless/detail_records_reports/{id}`

```go
	detailRecordsReport, err := client.Wireless.DetailRecordsReports.Delete(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", detailRecordsReport.Data)
```
