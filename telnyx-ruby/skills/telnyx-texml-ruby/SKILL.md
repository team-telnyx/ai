---
name: telnyx-texml-ruby
description: >-
  Build voice applications using TeXML markup language (TwiML-compatible).
  Manage applications, calls, conferences, recordings, queues, and streams. This
  skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: texml
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Fetch multiple call resources

Returns multiple call resources for an account.

`GET /texml/Accounts/{account_sid}/Calls`

```ruby
response = client.texml.accounts.calls.retrieve_calls("account_sid")

puts(response)
```

## Initiate an outbound call

Initiate an outbound TeXML call.

`POST /texml/Accounts/{account_sid}/Calls` — Required: `To`, `From`, `ApplicationSid`

Optional: `AsyncAmd` (boolean), `AsyncAmdStatusCallback` (string), `AsyncAmdStatusCallbackMethod` (enum), `CallerId` (string), `CancelPlaybackOnDetectMessageEnd` (boolean), `CancelPlaybackOnMachineDetection` (boolean), `CustomHeaders` (array[object]), `DetectionMode` (enum), `FallbackUrl` (string), `MachineDetection` (enum), `MachineDetectionSilenceTimeout` (integer), `MachineDetectionSpeechEndThreshold` (integer), `MachineDetectionSpeechThreshold` (integer), `MachineDetectionTimeout` (integer), `PreferredCodecs` (string), `Record` (boolean), `RecordingChannels` (enum), `RecordingStatusCallback` (string), `RecordingStatusCallbackEvent` (string), `RecordingStatusCallbackMethod` (enum), `RecordingTimeout` (integer), `RecordingTrack` (enum), `SendRecordingUrl` (boolean), `SipAuthPassword` (string), `SipAuthUsername` (string), `SipRegion` (enum), `StatusCallback` (string), `StatusCallbackEvent` (enum), `StatusCallbackMethod` (enum), `SuperviseCallSid` (string), `SupervisingRole` (enum), `Texml` (string), `TimeLimit` (integer), `Timeout` (integer), `Trim` (enum), `Url` (string), `UrlMethod` (enum)

```ruby
response = client.texml.accounts.calls.calls(
  "account_sid",
  application_sid: "example-app-sid",
  from: "+13120001234",
  to: "+13121230000"
)

puts(response)
```

## Fetch a call

Returns an individual call identified by its CallSid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

```ruby
call = client.texml.accounts.calls.retrieve("call_sid", account_sid: "account_sid")

puts(call)
```

## Update call

Update TeXML call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

```ruby
call = client.texml.accounts.calls.update("call_sid", account_sid: "account_sid")

puts(call)
```

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```ruby
response = client.texml.accounts.calls.recordings_json.retrieve_recordings_json(
  "call_sid",
  account_sid: "account_sid"
)

puts(response)
```

## Request recording for a call

Starts recording with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```ruby
response = client.texml.accounts.calls.recordings_json.recordings_json("call_sid", account_sid: "account_sid")

puts(response)
```

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

```ruby
response = client.texml.accounts.calls.recordings.recording_sid_json(
  "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  account_sid: "account_sid",
  call_sid: "call_sid"
)

puts(response)
```

## Request siprec session for a call

Starts siprec session with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

```ruby
response = client.texml.accounts.calls.siprec_json("call_sid", account_sid: "account_sid")

puts(response)
```

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

```ruby
response = client.texml.accounts.calls.siprec.siprec_sid_json(
  "siprec_sid",
  account_sid: "account_sid",
  call_sid: "call_sid"
)

puts(response)
```

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

```ruby
response = client.texml.accounts.calls.streams_json("call_sid", account_sid: "account_sid")

puts(response)
```

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

```ruby
response = client.texml.accounts.calls.streams.streaming_sid_json(
  "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  account_sid: "account_sid",
  call_sid: "call_sid"
)

puts(response)
```

## List conference resources

Lists conference resources.

`GET /texml/Accounts/{account_sid}/Conferences`

```ruby
response = client.texml.accounts.conferences.retrieve_conferences("account_sid")

puts(response)
```

## Fetch a conference resource

Returns a conference resource.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```ruby
conference = client.texml.accounts.conferences.retrieve("conference_sid", account_sid: "account_sid")

puts(conference)
```

## Update a conference resource

Updates a conference resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```ruby
conference = client.texml.accounts.conferences.update("conference_sid", account_sid: "account_sid")

puts(conference)
```

## List conference participants

Lists conference participants

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```ruby
response = client.texml.accounts.conferences.participants.retrieve_participants(
  "conference_sid",
  account_sid: "account_sid"
)

puts(response)
```

## Dial a new conference participant

Dials a new conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```ruby
response = client.texml.accounts.conferences.participants.participants("conference_sid", account_sid: "account_sid")

puts(response)
```

## Get conference participant resource

Gets conference participant resource

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```ruby
participant = client.texml.accounts.conferences.participants.retrieve(
  "call_sid_or_participant_label",
  account_sid: "account_sid",
  conference_sid: "conference_sid"
)

puts(participant)
```

## Update a conference participant

Updates a conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```ruby
participant = client.texml.accounts.conferences.participants.update(
  "call_sid_or_participant_label",
  account_sid: "account_sid",
  conference_sid: "conference_sid"
)

puts(participant)
```

## Delete a conference participant

Deletes a conference participant

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```ruby
result = client.texml.accounts.conferences.participants.delete(
  "call_sid_or_participant_label",
  account_sid: "account_sid",
  conference_sid: "conference_sid"
)

puts(result)
```

## List conference recordings

Lists conference recordings

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

```ruby
response = client.texml.accounts.conferences.retrieve_recordings("conference_sid", account_sid: "account_sid")

puts(response)
```

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

```ruby
response = client.texml.accounts.conferences.retrieve_recordings_json("conference_sid", account_sid: "account_sid")

puts(response)
```

## List queue resources

Lists queue resources.

`GET /texml/Accounts/{account_sid}/Queues`

```ruby
page = client.texml.accounts.queues.list("account_sid")

puts(page)
```

## Create a new queue

Creates a new queue resource.

`POST /texml/Accounts/{account_sid}/Queues`

```ruby
queue = client.texml.accounts.queues.create("account_sid")

puts(queue)
```

## Fetch a queue resource

Returns a queue resource.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```ruby
queue = client.texml.accounts.queues.retrieve("queue_sid", account_sid: "account_sid")

puts(queue)
```

## Update a queue resource

Updates a queue resource.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```ruby
queue = client.texml.accounts.queues.update("queue_sid", account_sid: "account_sid")

puts(queue)
```

## Delete a queue resource

Delete a queue resource.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```ruby
result = client.texml.accounts.queues.delete("queue_sid", account_sid: "account_sid")

puts(result)
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

```ruby
response = client.texml.accounts.retrieve_recordings_json("account_sid")

puts(response)
```

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```ruby
texml_get_call_recording_response_body = client.texml.accounts.recordings.json.retrieve_recording_sid_json(
  "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  account_sid: "account_sid"
)

puts(texml_get_call_recording_response_body)
```

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```ruby
result = client.texml.accounts.recordings.json.delete_recording_sid_json(
  "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  account_sid: "account_sid"
)

puts(result)
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

```ruby
response = client.texml.accounts.retrieve_transcriptions_json("account_sid")

puts(response)
```

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```ruby
response = client.texml.accounts.transcriptions.json.retrieve_recording_transcription_sid_json(
  "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  account_sid: "account_sid"
)

puts(response)
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```ruby
result = client.texml.accounts.transcriptions.json.delete_recording_transcription_sid_json(
  "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  account_sid: "account_sid"
)

puts(result)
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML.

`POST /texml/secrets` — Required: `name`, `value`

```ruby
response = client.texml.secrets(name: "My Secret Name", value: "My Secret Value")

puts(response)
```

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

```ruby
page = client.texml_applications.list

puts(page)
```

## Creates a TeXML Application

Creates a TeXML Application.

`POST /texml_applications` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```ruby
texml_application = client.texml_applications.create(friendly_name: "call-router", voice_url: "https://example.com")

puts(texml_application)
```

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

```ruby
texml_application = client.texml_applications.retrieve("1293384261075731499")

puts(texml_application)
```

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```ruby
texml_application = client.texml_applications.update(
  "1293384261075731499",
  friendly_name: "call-router",
  voice_url: "https://example.com"
)

puts(texml_application)
```

## Deletes a TeXML Application

Deletes a TeXML Application.

`DELETE /texml_applications/{id}`

```ruby
texml_application = client.texml_applications.delete("1293384261075731499")

puts(texml_application)
```
