---
name: telnyx-texml-java
description: >-
  Build voice applications using TeXML markup language (TwiML-compatible).
  Manage applications, calls, conferences, recordings, queues, and streams. This
  skill provides Java SDK examples.
metadata:
  author: telnyx
  product: texml
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Fetch multiple call resources

Returns multiple call resources for an account.

`GET /texml/Accounts/{account_sid}/Calls`

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveCallsParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveCallsResponse;

CallRetrieveCallsResponse response = client.texml().accounts().calls().retrieveCalls("account_sid");
```

## Initiate an outbound call

Initiate an outbound TeXML call.

`POST /texml/Accounts/{account_sid}/Calls` — Required: `To`, `From`, `ApplicationSid`

Optional: `AsyncAmd` (boolean), `AsyncAmdStatusCallback` (string), `AsyncAmdStatusCallbackMethod` (enum), `CallerId` (string), `CancelPlaybackOnDetectMessageEnd` (boolean), `CancelPlaybackOnMachineDetection` (boolean), `CustomHeaders` (array[object]), `DetectionMode` (enum), `FallbackUrl` (string), `MachineDetection` (enum), `MachineDetectionSilenceTimeout` (integer), `MachineDetectionSpeechEndThreshold` (integer), `MachineDetectionSpeechThreshold` (integer), `MachineDetectionTimeout` (integer), `PreferredCodecs` (string), `Record` (boolean), `RecordingChannels` (enum), `RecordingStatusCallback` (string), `RecordingStatusCallbackEvent` (string), `RecordingStatusCallbackMethod` (enum), `RecordingTimeout` (integer), `RecordingTrack` (enum), `SendRecordingUrl` (boolean), `SipAuthPassword` (string), `SipAuthUsername` (string), `SipRegion` (enum), `StatusCallback` (string), `StatusCallbackEvent` (enum), `StatusCallbackMethod` (enum), `SuperviseCallSid` (string), `SupervisingRole` (enum), `Texml` (string), `TimeLimit` (integer), `Timeout` (integer), `Trim` (enum), `Url` (string), `UrlMethod` (enum)

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallCallsParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallCallsResponse;

CallCallsParams params = CallCallsParams.builder()
    .accountSid("account_sid")
    .applicationSid("example-app-sid")
    .from("+13120001234")
    .to("+13121230000")
    .build();
CallCallsResponse response = client.texml().accounts().calls().calls(params);
```

## Fetch a call

Returns an individual call identified by its CallSid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveResponse;

CallRetrieveParams params = CallRetrieveParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .build();
CallRetrieveResponse call = client.texml().accounts().calls().retrieve(params);
```

## Update call

Update TeXML call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallUpdateParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallUpdateResponse;
import com.telnyx.sdk.models.texml.accounts.calls.UpdateCall;

CallUpdateParams params = CallUpdateParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .updateCall(UpdateCall.builder().build())
    .build();
CallUpdateResponse call = client.texml().accounts().calls().update(params);
```

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRetrieveRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRetrieveRecordingsJsonResponse;

RecordingsJsonRetrieveRecordingsJsonParams params = RecordingsJsonRetrieveRecordingsJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .build();
RecordingsJsonRetrieveRecordingsJsonResponse response = client.texml().accounts().calls().recordingsJson().retrieveRecordingsJson(params);
```

## Request recording for a call

Starts recording with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRecordingsJsonResponse;

RecordingsJsonRecordingsJsonParams params = RecordingsJsonRecordingsJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .build();
RecordingsJsonRecordingsJsonResponse response = client.texml().accounts().calls().recordingsJson().recordingsJson(params);
```

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.recordings.RecordingRecordingSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.recordings.RecordingRecordingSidJsonResponse;

RecordingRecordingSidJsonParams params = RecordingRecordingSidJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .recordingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
RecordingRecordingSidJsonResponse response = client.texml().accounts().calls().recordings().recordingSidJson(params);
```

## Request siprec session for a call

Starts siprec session with specified parameters for call idientified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallSiprecJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallSiprecJsonResponse;

CallSiprecJsonParams params = CallSiprecJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .build();
CallSiprecJsonResponse response = client.texml().accounts().calls().siprecJson(params);
```

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.siprec.SiprecSiprecSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.siprec.SiprecSiprecSidJsonResponse;

SiprecSiprecSidJsonParams params = SiprecSiprecSidJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .siprecSid("siprec_sid")
    .build();
SiprecSiprecSidJsonResponse response = client.texml().accounts().calls().siprec().siprecSidJson(params);
```

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallStreamsJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallStreamsJsonResponse;

CallStreamsJsonParams params = CallStreamsJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .build();
CallStreamsJsonResponse response = client.texml().accounts().calls().streamsJson(params);
```

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.calls.streams.StreamStreamingSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.streams.StreamStreamingSidJsonResponse;

StreamStreamingSidJsonParams params = StreamStreamingSidJsonParams.builder()
    .accountSid("account_sid")
    .callSid("call_sid")
    .streamingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
StreamStreamingSidJsonResponse response = client.texml().accounts().calls().streams().streamingSidJson(params);
```

## List conference resources

Lists conference resources.

`GET /texml/Accounts/{account_sid}/Conferences`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveConferencesParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveConferencesResponse;

ConferenceRetrieveConferencesResponse response = client.texml().accounts().conferences().retrieveConferences("account_sid");
```

## Fetch a conference resource

Returns a conference resource.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveResponse;

ConferenceRetrieveParams params = ConferenceRetrieveParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .build();
ConferenceRetrieveResponse conference = client.texml().accounts().conferences().retrieve(params);
```

## Update a conference resource

Updates a conference resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceUpdateParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceUpdateResponse;

ConferenceUpdateParams params = ConferenceUpdateParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .build();
ConferenceUpdateResponse conference = client.texml().accounts().conferences().update(params);
```

## List conference participants

Lists conference participants

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveParticipantsParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveParticipantsResponse;

ParticipantRetrieveParticipantsParams params = ParticipantRetrieveParticipantsParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .build();
ParticipantRetrieveParticipantsResponse response = client.texml().accounts().conferences().participants().retrieveParticipants(params);
```

## Dial a new conference participant

Dials a new conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantParticipantsParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantParticipantsResponse;

ParticipantParticipantsParams params = ParticipantParticipantsParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .build();
ParticipantParticipantsResponse response = client.texml().accounts().conferences().participants().participants(params);
```

## Get conference participant resource

Gets conference participant resource

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveResponse;

ParticipantRetrieveParams params = ParticipantRetrieveParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .callSidOrParticipantLabel("call_sid_or_participant_label")
    .build();
ParticipantRetrieveResponse participant = client.texml().accounts().conferences().participants().retrieve(params);
```

## Update a conference participant

Updates a conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantUpdateParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantUpdateResponse;

ParticipantUpdateParams params = ParticipantUpdateParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .callSidOrParticipantLabel("call_sid_or_participant_label")
    .build();
ParticipantUpdateResponse participant = client.texml().accounts().conferences().participants().update(params);
```

## Delete a conference participant

Deletes a conference participant

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantDeleteParams;

ParticipantDeleteParams params = ParticipantDeleteParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .callSidOrParticipantLabel("call_sid_or_participant_label")
    .build();
client.texml().accounts().conferences().participants().delete(params);
```

## List conference recordings

Lists conference recordings

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsResponse;

ConferenceRetrieveRecordingsParams params = ConferenceRetrieveRecordingsParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .build();
ConferenceRetrieveRecordingsResponse response = client.texml().accounts().conferences().retrieveRecordings(params);
```

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsJsonResponse;

ConferenceRetrieveRecordingsJsonParams params = ConferenceRetrieveRecordingsJsonParams.builder()
    .accountSid("account_sid")
    .conferenceSid("conference_sid")
    .build();
ConferenceRetrieveRecordingsJsonResponse response = client.texml().accounts().conferences().retrieveRecordingsJson(params);
```

## List queue resources

Lists queue resources.

`GET /texml/Accounts/{account_sid}/Queues`

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueListPage;
import com.telnyx.sdk.models.texml.accounts.queues.QueueListParams;

QueueListPage page = client.texml().accounts().queues().list("account_sid");
```

## Create a new queue

Creates a new queue resource.

`POST /texml/Accounts/{account_sid}/Queues`

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueCreateParams;
import com.telnyx.sdk.models.texml.accounts.queues.QueueCreateResponse;

QueueCreateResponse queue = client.texml().accounts().queues().create("account_sid");
```

## Fetch a queue resource

Returns a queue resource.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.queues.QueueRetrieveResponse;

QueueRetrieveParams params = QueueRetrieveParams.builder()
    .accountSid("account_sid")
    .queueSid("queue_sid")
    .build();
QueueRetrieveResponse queue = client.texml().accounts().queues().retrieve(params);
```

## Update a queue resource

Updates a queue resource.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueUpdateParams;
import com.telnyx.sdk.models.texml.accounts.queues.QueueUpdateResponse;

QueueUpdateParams params = QueueUpdateParams.builder()
    .accountSid("account_sid")
    .queueSid("queue_sid")
    .build();
QueueUpdateResponse queue = client.texml().accounts().queues().update(params);
```

## Delete a queue resource

Delete a queue resource.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueDeleteParams;

QueueDeleteParams params = QueueDeleteParams.builder()
    .accountSid("account_sid")
    .queueSid("queue_sid")
    .build();
client.texml().accounts().queues().delete(params);
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

```java
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveRecordingsJsonResponse;

AccountRetrieveRecordingsJsonResponse response = client.texml().accounts().retrieveRecordingsJson("account_sid");
```

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.TexmlGetCallRecordingResponseBody;
import com.telnyx.sdk.models.texml.accounts.recordings.json.JsonRetrieveRecordingSidJsonParams;

JsonRetrieveRecordingSidJsonParams params = JsonRetrieveRecordingSidJsonParams.builder()
    .accountSid("account_sid")
    .recordingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
TexmlGetCallRecordingResponseBody texmlGetCallRecordingResponseBody = client.texml().accounts().recordings().json().retrieveRecordingSidJson(params);
```

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.recordings.json.JsonDeleteRecordingSidJsonParams;

JsonDeleteRecordingSidJsonParams params = JsonDeleteRecordingSidJsonParams.builder()
    .accountSid("account_sid")
    .recordingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
client.texml().accounts().recordings().json().deleteRecordingSidJson(params);
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

```java
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveTranscriptionsJsonParams;
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveTranscriptionsJsonResponse;

AccountRetrieveTranscriptionsJsonResponse response = client.texml().accounts().retrieveTranscriptionsJson("account_sid");
```

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.transcriptions.json.JsonRetrieveRecordingTranscriptionSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.transcriptions.json.JsonRetrieveRecordingTranscriptionSidJsonResponse;

JsonRetrieveRecordingTranscriptionSidJsonParams params = JsonRetrieveRecordingTranscriptionSidJsonParams.builder()
    .accountSid("account_sid")
    .recordingTranscriptionSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
JsonRetrieveRecordingTranscriptionSidJsonResponse response = client.texml().accounts().transcriptions().json().retrieveRecordingTranscriptionSidJson(params);
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```java
import com.telnyx.sdk.models.texml.accounts.transcriptions.json.JsonDeleteRecordingTranscriptionSidJsonParams;

JsonDeleteRecordingTranscriptionSidJsonParams params = JsonDeleteRecordingTranscriptionSidJsonParams.builder()
    .accountSid("account_sid")
    .recordingTranscriptionSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
client.texml().accounts().transcriptions().json().deleteRecordingTranscriptionSidJson(params);
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML.

`POST /texml/secrets` — Required: `name`, `value`

```java
import com.telnyx.sdk.models.texml.TexmlSecretsParams;
import com.telnyx.sdk.models.texml.TexmlSecretsResponse;

TexmlSecretsParams params = TexmlSecretsParams.builder()
    .name("My Secret Name")
    .value("My Secret Value")
    .build();
TexmlSecretsResponse response = client.texml().secrets(params);
```

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationListPage;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationListParams;

TexmlApplicationListPage page = client.texmlApplications().list();
```

## Creates a TeXML Application

Creates a TeXML Application.

`POST /texml_applications` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationCreateParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationCreateResponse;

TexmlApplicationCreateParams params = TexmlApplicationCreateParams.builder()
    .friendlyName("call-router")
    .voiceUrl("https://example.com")
    .build();
TexmlApplicationCreateResponse texmlApplication = client.texmlApplications().create(params);
```

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationRetrieveParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationRetrieveResponse;

TexmlApplicationRetrieveResponse texmlApplication = client.texmlApplications().retrieve("1293384261075731499");
```

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum)

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationUpdateParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationUpdateResponse;

TexmlApplicationUpdateParams params = TexmlApplicationUpdateParams.builder()
    .id("1293384261075731499")
    .friendlyName("call-router")
    .voiceUrl("https://example.com")
    .build();
TexmlApplicationUpdateResponse texmlApplication = client.texmlApplications().update(params);
```

## Deletes a TeXML Application

Deletes a TeXML Application.

`DELETE /texml_applications/{id}`

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationDeleteParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationDeleteResponse;

TexmlApplicationDeleteResponse texmlApplication = client.texmlApplications().delete("1293384261075731499");
```
