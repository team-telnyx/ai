---
name: telnyx-texml-python
description: >-
  Build voice applications using TeXML markup language (TwiML-compatible).
  Manage applications, calls, conferences, recordings, queues, and streams. This
  skill provides Python SDK examples.
metadata:
  author: telnyx
  product: texml
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - Python

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

## Fetch multiple call resources

Returns multiple call resources for an account.

`GET /texml/Accounts/{account_sid}/Calls`

```python
response = client.texml.accounts.calls.retrieve_calls(
    account_sid="account_sid",
)
print(response.calls)
```

## Initiate an outbound call

Initiate an outbound TeXML call.

`POST /texml/Accounts/{account_sid}/Calls` — Required: `To`, `From`, `ApplicationSid`

Optional: `AsyncAmd` (boolean), `AsyncAmdStatusCallback` (string), `AsyncAmdStatusCallbackMethod` (enum), `CallerId` (string), `CancelPlaybackOnDetectMessageEnd` (boolean), `CancelPlaybackOnMachineDetection` (boolean), `CustomHeaders` (array[object]), `DetectionMode` (enum), `FallbackUrl` (string), `MachineDetection` (enum), `MachineDetectionSilenceTimeout` (integer), `MachineDetectionSpeechEndThreshold` (integer), `MachineDetectionSpeechThreshold` (integer), `MachineDetectionTimeout` (integer), `PreferredCodecs` (string), `Record` (boolean), `RecordingChannels` (enum), `RecordingStatusCallback` (string), `RecordingStatusCallbackEvent` (string), `RecordingStatusCallbackMethod` (enum), `RecordingTimeout` (integer), `RecordingTrack` (enum), `SendRecordingUrl` (boolean), `SipAuthPassword` (string), `SipAuthUsername` (string), `SipRegion` (enum), `StatusCallback` (string), `StatusCallbackEvent` (enum), `StatusCallbackMethod` (enum), `SuperviseCallSid` (string), `SupervisingRole` (enum), `Texml` (string), `TimeLimit` (integer), `Timeout` (integer), `Trim` (enum), `Url` (string), `UrlMethod` (enum)

```python
response = client.texml.accounts.calls.calls(
    account_sid="account_sid",
    application_sid="example-app-sid",
    from_="+13120001234",
    to="+13121230000",
)
print(response.from_)
```

## Fetch a call

Returns an individual call identified by its CallSid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

```python
call = client.texml.accounts.calls.retrieve(
    call_sid="call_sid",
    account_sid="account_sid",
)
print(call.account_sid)
```

## Update call

Update TeXML call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

```python
call = client.texml.accounts.calls.update(
    call_sid="call_sid",
    account_sid="account_sid",
)
print(call.account_sid)
```

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```python
response = client.texml.accounts.calls.recordings_json.retrieve_recordings_json(
    call_sid="call_sid",
    account_sid="account_sid",
)
print(response.end)
```

## Request recording for a call

Starts recording with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```python
response = client.texml.accounts.calls.recordings_json.recordings_json(
    call_sid="call_sid",
    account_sid="account_sid",
)
print(response.account_sid)
```

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

```python
response = client.texml.accounts.calls.recordings.recording_sid_json(
    recording_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="account_sid",
    call_sid="call_sid",
)
print(response.account_sid)
```

## Request siprec session for a call

Starts siprec session with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

```python
response = client.texml.accounts.calls.siprec_json(
    call_sid="call_sid",
    account_sid="account_sid",
)
print(response.account_sid)
```

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

```python
response = client.texml.accounts.calls.siprec.siprec_sid_json(
    siprec_sid="siprec_sid",
    account_sid="account_sid",
    call_sid="call_sid",
)
print(response.account_sid)
```

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

```python
response = client.texml.accounts.calls.streams_json(
    call_sid="call_sid",
    account_sid="account_sid",
)
print(response.account_sid)
```

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

```python
response = client.texml.accounts.calls.streams.streaming_sid_json(
    streaming_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="account_sid",
    call_sid="call_sid",
)
print(response.account_sid)
```

## List conference resources

Lists conference resources.

`GET /texml/Accounts/{account_sid}/Conferences`

```python
response = client.texml.accounts.conferences.retrieve_conferences(
    account_sid="account_sid",
)
print(response.conferences)
```

## Fetch a conference resource

Returns a conference resource.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```python
conference = client.texml.accounts.conferences.retrieve(
    conference_sid="conference_sid",
    account_sid="account_sid",
)
print(conference.account_sid)
```

## Update a conference resource

Updates a conference resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```python
conference = client.texml.accounts.conferences.update(
    conference_sid="conference_sid",
    account_sid="account_sid",
)
print(conference.account_sid)
```

## List conference participants

Lists conference participants

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```python
response = client.texml.accounts.conferences.participants.retrieve_participants(
    conference_sid="conference_sid",
    account_sid="account_sid",
)
print(response.end)
```

## Dial a new conference participant

Dials a new conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```python
response = client.texml.accounts.conferences.participants.participants(
    conference_sid="conference_sid",
    account_sid="account_sid",
)
print(response.account_sid)
```

## Get conference participant resource

Gets conference participant resource

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```python
participant = client.texml.accounts.conferences.participants.retrieve(
    call_sid_or_participant_label="call_sid_or_participant_label",
    account_sid="account_sid",
    conference_sid="conference_sid",
)
print(participant.account_sid)
```

## Update a conference participant

Updates a conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```python
participant = client.texml.accounts.conferences.participants.update(
    call_sid_or_participant_label="call_sid_or_participant_label",
    account_sid="account_sid",
    conference_sid="conference_sid",
)
print(participant.account_sid)
```

## Delete a conference participant

Deletes a conference participant

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```python
client.texml.accounts.conferences.participants.delete(
    call_sid_or_participant_label="call_sid_or_participant_label",
    account_sid="account_sid",
    conference_sid="conference_sid",
)
```

## List conference recordings

Lists conference recordings

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

```python
response = client.texml.accounts.conferences.retrieve_recordings(
    conference_sid="conference_sid",
    account_sid="account_sid",
)
print(response.end)
```

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

```python
response = client.texml.accounts.conferences.retrieve_recordings_json(
    conference_sid="conference_sid",
    account_sid="account_sid",
)
print(response.end)
```

## List queue resources

Lists queue resources.

`GET /texml/Accounts/{account_sid}/Queues`

```python
page = client.texml.accounts.queues.list(
    account_sid="account_sid",
)
page = page.queues[0]
print(page.account_sid)
```

## Create a new queue

Creates a new queue resource.

`POST /texml/Accounts/{account_sid}/Queues`

```python
queue = client.texml.accounts.queues.create(
    account_sid="account_sid",
)
print(queue.account_sid)
```

## Fetch a queue resource

Returns a queue resource.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```python
queue = client.texml.accounts.queues.retrieve(
    queue_sid="queue_sid",
    account_sid="account_sid",
)
print(queue.account_sid)
```

## Update a queue resource

Updates a queue resource.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```python
queue = client.texml.accounts.queues.update(
    queue_sid="queue_sid",
    account_sid="account_sid",
)
print(queue.account_sid)
```

## Delete a queue resource

Delete a queue resource.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```python
client.texml.accounts.queues.delete(
    queue_sid="queue_sid",
    account_sid="account_sid",
)
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

```python
response = client.texml.accounts.retrieve_recordings_json(
    account_sid="account_sid",
)
print(response.end)
```

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```python
texml_get_call_recording_response_body = client.texml.accounts.recordings.json.retrieve_recording_sid_json(
    recording_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="account_sid",
)
print(texml_get_call_recording_response_body.account_sid)
```

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```python
client.texml.accounts.recordings.json.delete_recording_sid_json(
    recording_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="account_sid",
)
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

```python
response = client.texml.accounts.retrieve_transcriptions_json(
    account_sid="account_sid",
)
print(response.end)
```

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```python
response = client.texml.accounts.transcriptions.json.retrieve_recording_transcription_sid_json(
    recording_transcription_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="account_sid",
)
print(response.account_sid)
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```python
client.texml.accounts.transcriptions.json.delete_recording_transcription_sid_json(
    recording_transcription_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="account_sid",
)
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML.

`POST /texml/secrets` — Required: `name`, `value`

```python
response = client.texml.secrets(
    name="My Secret Name",
    value="My Secret Value",
)
print(response.data)
```

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

```python
page = client.texml_applications.list()
page = page.data[0]
print(page.id)
```

## Creates a TeXML Application

Creates a TeXML Application.

`POST /texml_applications` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```python
texml_application = client.texml_applications.create(
    friendly_name="call-router",
    voice_url="https://example.com",
)
print(texml_application.data)
```

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

```python
texml_application = client.texml_applications.retrieve(
    "1293384261075731499",
)
print(texml_application.data)
```

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```python
texml_application = client.texml_applications.update(
    id="1293384261075731499",
    friendly_name="call-router",
    voice_url="https://example.com",
)
print(texml_application.data)
```

## Deletes a TeXML Application

Deletes a TeXML Application.

`DELETE /texml_applications/{id}`

```python
texml_application = client.texml_applications.delete(
    "1293384261075731499",
)
print(texml_application.data)
```
