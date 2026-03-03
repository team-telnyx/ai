---
name: telnyx-texml-go
description: >-
  Build voice applications using TeXML markup language (TwiML-compatible).
  Manage applications, calls, conferences, recordings, queues, and streams. This
  skill provides Go SDK examples.
metadata:
  author: telnyx
  product: texml
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - Go

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

## Fetch multiple call resources

Returns multiple call resources for an account.

`GET /texml/Accounts/{account_sid}/Calls`

```go
	response, err := client.Texml.Accounts.Calls.GetCalls(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountCallGetCallsParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Calls)
```

## Initiate an outbound call

Initiate an outbound TeXML call.

`POST /texml/Accounts/{account_sid}/Calls` — Required: `To`, `From`, `ApplicationSid`

Optional: `AsyncAmd` (boolean), `AsyncAmdStatusCallback` (string), `AsyncAmdStatusCallbackMethod` (enum), `CallerId` (string), `CancelPlaybackOnDetectMessageEnd` (boolean), `CancelPlaybackOnMachineDetection` (boolean), `CustomHeaders` (array[object]), `DetectionMode` (enum), `FallbackUrl` (string), `MachineDetection` (enum), `MachineDetectionSilenceTimeout` (integer), `MachineDetectionSpeechEndThreshold` (integer), `MachineDetectionSpeechThreshold` (integer), `MachineDetectionTimeout` (integer), `PreferredCodecs` (string), `Record` (boolean), `RecordingChannels` (enum), `RecordingStatusCallback` (string), `RecordingStatusCallbackEvent` (string), `RecordingStatusCallbackMethod` (enum), `RecordingTimeout` (integer), `RecordingTrack` (enum), `SendRecordingUrl` (boolean), `SipAuthPassword` (string), `SipAuthUsername` (string), `SipRegion` (enum), `StatusCallback` (string), `StatusCallbackEvent` (enum), `StatusCallbackMethod` (enum), `SuperviseCallSid` (string), `SupervisingRole` (enum), `Texml` (string), `TimeLimit` (integer), `Timeout` (integer), `Trim` (enum), `Url` (string), `UrlMethod` (enum)

```go
	response, err := client.Texml.Accounts.Calls.Calls(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountCallCallsParams{
			ApplicationSid: "example-app-sid",
			From:           "+13120001234",
			To:             "+13121230000",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.From)
```

## Fetch a call

Returns an individual call identified by its CallSid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

```go
	call, err := client.Texml.Accounts.Calls.Get(
		context.TODO(),
		"call_sid",
		telnyx.TexmlAccountCallGetParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", call.AccountSid)
```

## Update call

Update TeXML call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

```go
	call, err := client.Texml.Accounts.Calls.Update(
		context.TODO(),
		"call_sid",
		telnyx.TexmlAccountCallUpdateParams{
			AccountSid: "account_sid",
			UpdateCall: telnyx.UpdateCallParam{},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", call.AccountSid)
```

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```go
	response, err := client.Texml.Accounts.Calls.RecordingsJson.GetRecordingsJson(
		context.TODO(),
		"call_sid",
		telnyx.TexmlAccountCallRecordingsJsonGetRecordingsJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.End)
```

## Request recording for a call

Starts recording with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```go
	response, err := client.Texml.Accounts.Calls.RecordingsJson.RecordingsJson(
		context.TODO(),
		"call_sid",
		telnyx.TexmlAccountCallRecordingsJsonRecordingsJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

```go
	response, err := client.Texml.Accounts.Calls.Recordings.RecordingSidJson(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountCallRecordingRecordingSidJsonParams{
			AccountSid: "account_sid",
			CallSid:    "call_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Request siprec session for a call

Starts siprec session with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

```go
	response, err := client.Texml.Accounts.Calls.SiprecJson(
		context.TODO(),
		"call_sid",
		telnyx.TexmlAccountCallSiprecJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

```go
	response, err := client.Texml.Accounts.Calls.Siprec.SiprecSidJson(
		context.TODO(),
		"siprec_sid",
		telnyx.TexmlAccountCallSiprecSiprecSidJsonParams{
			AccountSid: "account_sid",
			CallSid:    "call_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

```go
	response, err := client.Texml.Accounts.Calls.StreamsJson(
		context.TODO(),
		"call_sid",
		telnyx.TexmlAccountCallStreamsJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

```go
	response, err := client.Texml.Accounts.Calls.Streams.StreamingSidJson(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountCallStreamStreamingSidJsonParams{
			AccountSid: "account_sid",
			CallSid:    "call_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## List conference resources

Lists conference resources.

`GET /texml/Accounts/{account_sid}/Conferences`

```go
	response, err := client.Texml.Accounts.Conferences.GetConferences(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountConferenceGetConferencesParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Conferences)
```

## Fetch a conference resource

Returns a conference resource.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```go
	conference, err := client.Texml.Accounts.Conferences.Get(
		context.TODO(),
		"conference_sid",
		telnyx.TexmlAccountConferenceGetParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", conference.AccountSid)
```

## Update a conference resource

Updates a conference resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```go
	conference, err := client.Texml.Accounts.Conferences.Update(
		context.TODO(),
		"conference_sid",
		telnyx.TexmlAccountConferenceUpdateParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", conference.AccountSid)
```

## List conference participants

Lists conference participants

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```go
	response, err := client.Texml.Accounts.Conferences.Participants.GetParticipants(
		context.TODO(),
		"conference_sid",
		telnyx.TexmlAccountConferenceParticipantGetParticipantsParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.End)
```

## Dial a new conference participant

Dials a new conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```go
	response, err := client.Texml.Accounts.Conferences.Participants.Participants(
		context.TODO(),
		"conference_sid",
		telnyx.TexmlAccountConferenceParticipantParticipantsParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Get conference participant resource

Gets conference participant resource

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```go
	participant, err := client.Texml.Accounts.Conferences.Participants.Get(
		context.TODO(),
		"call_sid_or_participant_label",
		telnyx.TexmlAccountConferenceParticipantGetParams{
			AccountSid:    "account_sid",
			ConferenceSid: "conference_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", participant.AccountSid)
```

## Update a conference participant

Updates a conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```go
	participant, err := client.Texml.Accounts.Conferences.Participants.Update(
		context.TODO(),
		"call_sid_or_participant_label",
		telnyx.TexmlAccountConferenceParticipantUpdateParams{
			AccountSid:    "account_sid",
			ConferenceSid: "conference_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", participant.AccountSid)
```

## Delete a conference participant

Deletes a conference participant

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```go
	err := client.Texml.Accounts.Conferences.Participants.Delete(
		context.TODO(),
		"call_sid_or_participant_label",
		telnyx.TexmlAccountConferenceParticipantDeleteParams{
			AccountSid:    "account_sid",
			ConferenceSid: "conference_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## List conference recordings

Lists conference recordings

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

```go
	response, err := client.Texml.Accounts.Conferences.GetRecordings(
		context.TODO(),
		"conference_sid",
		telnyx.TexmlAccountConferenceGetRecordingsParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.End)
```

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

```go
	response, err := client.Texml.Accounts.Conferences.GetRecordingsJson(
		context.TODO(),
		"conference_sid",
		telnyx.TexmlAccountConferenceGetRecordingsJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.End)
```

## List queue resources

Lists queue resources.

`GET /texml/Accounts/{account_sid}/Queues`

```go
	page, err := client.Texml.Accounts.Queues.List(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountQueueListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a new queue

Creates a new queue resource.

`POST /texml/Accounts/{account_sid}/Queues`

```go
	queue, err := client.Texml.Accounts.Queues.New(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountQueueNewParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", queue.AccountSid)
```

## Fetch a queue resource

Returns a queue resource.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```go
	queue, err := client.Texml.Accounts.Queues.Get(
		context.TODO(),
		"queue_sid",
		telnyx.TexmlAccountQueueGetParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", queue.AccountSid)
```

## Update a queue resource

Updates a queue resource.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```go
	queue, err := client.Texml.Accounts.Queues.Update(
		context.TODO(),
		"queue_sid",
		telnyx.TexmlAccountQueueUpdateParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", queue.AccountSid)
```

## Delete a queue resource

Delete a queue resource.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```go
	err := client.Texml.Accounts.Queues.Delete(
		context.TODO(),
		"queue_sid",
		telnyx.TexmlAccountQueueDeleteParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

```go
	response, err := client.Texml.Accounts.GetRecordingsJson(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountGetRecordingsJsonParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.End)
```

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```go
	texmlGetCallRecordingResponseBody, err := client.Texml.Accounts.Recordings.Json.GetRecordingSidJson(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountRecordingJsonGetRecordingSidJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", texmlGetCallRecordingResponseBody.AccountSid)
```

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```go
	err := client.Texml.Accounts.Recordings.Json.DeleteRecordingSidJson(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountRecordingJsonDeleteRecordingSidJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

```go
	response, err := client.Texml.Accounts.GetTranscriptionsJson(
		context.TODO(),
		"account_sid",
		telnyx.TexmlAccountGetTranscriptionsJsonParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.End)
```

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```go
	response, err := client.Texml.Accounts.Transcriptions.Json.GetRecordingTranscriptionSidJson(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountTranscriptionJsonGetRecordingTranscriptionSidJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```go
	err := client.Texml.Accounts.Transcriptions.Json.DeleteRecordingTranscriptionSidJson(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountTranscriptionJsonDeleteRecordingTranscriptionSidJsonParams{
			AccountSid: "account_sid",
		},
	)
	if err != nil {
		panic(err.Error())
	}
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML.

`POST /texml/secrets` — Required: `name`, `value`

```go
	response, err := client.Texml.Secrets(context.TODO(), telnyx.TexmlSecretsParams{
		Name:  "My Secret Name",
		Value: "My Secret Value",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

```go
	page, err := client.TexmlApplications.List(context.TODO(), telnyx.TexmlApplicationListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Creates a TeXML Application

Creates a TeXML Application.

`POST /texml_applications` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```go
	texmlApplication, err := client.TexmlApplications.New(context.TODO(), telnyx.TexmlApplicationNewParams{
		FriendlyName: "call-router",
		VoiceURL:     "https://example.com",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

```go
	texmlApplication, err := client.TexmlApplications.Get(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```go
	texmlApplication, err := client.TexmlApplications.Update(
		context.TODO(),
		"1293384261075731499",
		telnyx.TexmlApplicationUpdateParams{
			FriendlyName: "call-router",
			VoiceURL:     "https://example.com",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

## Deletes a TeXML Application

Deletes a TeXML Application.

`DELETE /texml_applications/{id}`

```go
	texmlApplication, err := client.TexmlApplications.Delete(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```
