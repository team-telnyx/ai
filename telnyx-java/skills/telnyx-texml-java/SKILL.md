---
name: telnyx-texml-java
description: >-
  TeXML (TwiML-compatible) voice applications. Manage apps, calls, conferences,
  recordings, queues, and streams.
metadata:
  author: telnyx
  product: texml
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - Java

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-java)
2. Create a TeXML Application with primary webhook URL (where Telnyx fetches XML instructions)
3. Host TeXML XML instructions at an accessible URL (TeXML Bin or any public URL)
4. Assign the phone number to the TeXML Application

### Steps

1. **Create TeXML app**: `client.texmlApplications().create(params)`
2. **Author XML instructions**: `<Response><Say>Hello!</Say><Hangup/></Response>`
3. **Assign number**: `client.phoneNumbers().update(params)`
4. **Handle inbound calls**: `Telnyx fetches XML from your webhook URL`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Declarative XML call flows, Twilio/TwiML migration | TeXML (this skill) |
| Programmatic event-driven call control | Call Control API (see telnyx-voice-java) |
| LLM-powered voice agents | AI Assistants (see telnyx-ai-assistants-java) |

### Common mistakes

- ALWAYS end XML flows with <Hangup/> — omitting it causes dead silence with no termination
- ALWAYS configure a failover webhook URL — if primary is unreachable, call drops immediately
- NEVER use unreachable webhook URLs — TeXML fetches instructions from the URL on every call

**Related skills**: telnyx-voice-java, telnyx-ai-assistants-java, telnyx-numbers-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.texmlApplications().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Creates a TeXML Application

Creates a TeXML Application.

`client.texmlApplications().create()` — `POST /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `friendlyName` | string | Yes | A user-assigned name to help manage the application. |
| `voiceUrl` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `tags` | array[string] | No | Tags associated with the Texml Application. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationCreateParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationCreateResponse;

TexmlApplicationCreateParams params = TexmlApplicationCreateParams.builder()
    .friendlyName("call-router")
    .voiceUrl("https://example.com")
    .build();
TexmlApplicationCreateResponse texmlApplication = client.texmlApplications().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Initiate an outbound call

Initiate an outbound TeXML call. Telnyx will request TeXML from the XML Request URL configured for the connection in the Mission Control Portal.

`client.texml().accounts().calls().calls()` — `POST /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationSid` | string | Yes | The ID of the TeXML Application. |
| `To` | string (E.164) | Yes | The phone number of the called party. |
| `From` | string (E.164) | Yes | The phone number of the party that initiated the call. |
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `UrlMethod` | enum (GET, POST) | No | HTTP request type used for `Url`. |
| `StatusCallbackMethod` | enum (GET, POST) | No | HTTP request type used for `StatusCallback`. |
| `StatusCallbackEvent` | enum (initiated, ringing, answered, completed) | No | The call events for which Telnyx should send a webhook. |
| ... | | | +34 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallCallsParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallCallsResponse;

CallCallsParams params = CallCallsParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .applicationSid("example-app-sid")
    .from("+13120001234")
    .to("+13121230000")
    .build();
CallCallsResponse response = client.texml().accounts().calls().calls(params);
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## Fetch a call

Returns an individual call identified by its CallSid. This endpoint is eventually consistent.

`client.texml().accounts().calls().retrieve()` — `GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveResponse;

CallRetrieveParams params = CallRetrieveParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
CallRetrieveResponse call = client.texml().accounts().calls().retrieve(params);
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## Update call

Update TeXML call. Please note that the keys present in the payload MUST BE formatted in CamelCase as specified in the example.

`client.texml().accounts().calls().update()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallUpdateParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallUpdateResponse;
import com.telnyx.sdk.models.texml.accounts.calls.UpdateCall;

CallUpdateParams params = CallUpdateParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .updateCall(UpdateCall.builder().build())
    .build();
CallUpdateResponse call = client.texml().accounts().calls().update(params);
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## List conference resources

Lists conference resources.

`client.texml().accounts().conferences().retrieveConferences()` — `GET /texml/Accounts/{account_sid}/Conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (init, in-progress, completed) | No | Filters conferences by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveConferencesParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveConferencesResponse;

ConferenceRetrieveConferencesResponse response = client.texml().accounts().conferences().retrieveConferences("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.conferences, response.data.end, response.data.first_page_uri`

## Fetch multiple call resources

Returns multiple call resources for an account. This endpoint is eventually consistent.

`client.texml().accounts().calls().retrieveCalls()` — `GET /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (canceled, completed, failed, busy, no-answer) | No | Filters calls by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveCallsParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallRetrieveCallsResponse;

CallRetrieveCallsResponse response = client.texml().accounts().calls().retrieveCalls("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.calls, response.data.end, response.data.first_page_uri`

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`client.texml().accounts().calls().recordingsJson().retrieveRecordingsJson()` — `GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRetrieveRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRetrieveRecordingsJsonResponse;

RecordingsJsonRetrieveRecordingsJsonParams params = RecordingsJsonRetrieveRecordingsJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
RecordingsJsonRetrieveRecordingsJsonResponse response = client.texml().accounts().calls().recordingsJson().retrieveRecordingsJson(params);
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Request recording for a call

Starts recording with specified parameters for call identified by call_sid.

`client.texml().accounts().calls().recordingsJson().recordingsJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.recordingsjson.RecordingsJsonRecordingsJsonResponse;

RecordingsJsonRecordingsJsonParams params = RecordingsJsonRecordingsJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
RecordingsJsonRecordingsJsonResponse response = client.texml().accounts().calls().recordingsJson().recordingsJson(params);
```

Key response fields: `response.data.account_sid, response.data.call_sid, response.data.channels`

## Update recording on a call

Updates recording resource for particular call.

`client.texml().accounts().calls().recordings().recordingSidJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `recordingSid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.recordings.RecordingRecordingSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.recordings.RecordingRecordingSidJsonResponse;

RecordingRecordingSidJsonParams params = RecordingRecordingSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .recordingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
RecordingRecordingSidJsonResponse response = client.texml().accounts().calls().recordings().recordingSidJson(params);
```

Key response fields: `response.data.account_sid, response.data.call_sid, response.data.channels`

## Request siprec session for a call

Starts siprec session with specified parameters for call identified by call_sid.

`client.texml().accounts().calls().siprecJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallSiprecJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallSiprecJsonResponse;

CallSiprecJsonParams params = CallSiprecJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
CallSiprecJsonResponse response = client.texml().accounts().calls().siprecJson(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`client.texml().accounts().calls().siprec().siprecSidJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `siprecSid` | string (UUID) | Yes | The SiprecSid that uniquely identifies the Sip Recording. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.siprec.SiprecSiprecSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.siprec.SiprecSiprecSidJsonResponse;

SiprecSiprecSidJsonParams params = SiprecSiprecSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .siprecSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
SiprecSiprecSidJsonResponse response = client.texml().accounts().calls().siprec().siprecSidJson(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`client.texml().accounts().calls().streamsJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.CallStreamsJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.CallStreamsJsonResponse;

CallStreamsJsonParams params = CallStreamsJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
CallStreamsJsonResponse response = client.texml().accounts().calls().streamsJson(params);
```

Key response fields: `response.data.status, response.data.name, response.data.account_sid`

## Update streaming on a call

Updates streaming resource for particular call.

`client.texml().accounts().calls().streams().streamingSidJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `callSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `streamingSid` | string (UUID) | Yes | Uniquely identifies the streaming by id. |

```java
import com.telnyx.sdk.models.texml.accounts.calls.streams.StreamStreamingSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.calls.streams.StreamStreamingSidJsonResponse;

StreamStreamingSidJsonParams params = StreamStreamingSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .callSid("550e8400-e29b-41d4-a716-446655440000")
    .streamingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
StreamStreamingSidJsonResponse response = client.texml().accounts().calls().streams().streamingSidJson(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Fetch a conference resource

Returns a conference resource.

`client.texml().accounts().conferences().retrieve()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveResponse;

ConferenceRetrieveParams params = ConferenceRetrieveParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
ConferenceRetrieveResponse conference = client.texml().accounts().conferences().retrieve(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Update a conference resource

Updates a conference resource.

`client.texml().accounts().conferences().update()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceUpdateParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceUpdateResponse;

ConferenceUpdateParams params = ConferenceUpdateParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
ConferenceUpdateResponse conference = client.texml().accounts().conferences().update(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## List conference participants

Lists conference participants

`client.texml().accounts().conferences().participants().retrieveParticipants()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveParticipantsParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveParticipantsResponse;

ParticipantRetrieveParticipantsParams params = ParticipantRetrieveParticipantsParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
ParticipantRetrieveParticipantsResponse response = client.texml().accounts().conferences().participants().retrieveParticipants(params);
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Dial a new conference participant

Dials a new conference participant

`client.texml().accounts().conferences().participants().participants()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantParticipantsParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantParticipantsResponse;

ParticipantParticipantsParams params = ParticipantParticipantsParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
ParticipantParticipantsResponse response = client.texml().accounts().conferences().participants().participants(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Get conference participant resource

Gets conference participant resource

`client.texml().accounts().conferences().participants().retrieve()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `callSidOrParticipantLabel` | string | Yes | CallSid or Label of the Participant to update. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantRetrieveResponse;

ParticipantRetrieveParams params = ParticipantRetrieveParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .callSidOrParticipantLabel("participant-1")
    .build();
ParticipantRetrieveResponse participant = client.texml().accounts().conferences().participants().retrieve(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Update a conference participant

Updates a conference participant

`client.texml().accounts().conferences().participants().update()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `callSidOrParticipantLabel` | string | Yes | CallSid or Label of the Participant to update. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantUpdateParams;
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantUpdateResponse;

ParticipantUpdateParams params = ParticipantUpdateParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .callSidOrParticipantLabel("participant-1")
    .build();
ParticipantUpdateResponse participant = client.texml().accounts().conferences().participants().update(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Delete a conference participant

Deletes a conference participant

`client.texml().accounts().conferences().participants().delete()` — `DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `callSidOrParticipantLabel` | string | Yes | CallSid or Label of the Participant to update. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.participants.ParticipantDeleteParams;

ParticipantDeleteParams params = ParticipantDeleteParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .callSidOrParticipantLabel("participant-1")
    .build();
client.texml().accounts().conferences().participants().delete(params);
```

## List conference recordings

Lists conference recordings

`client.texml().accounts().conferences().retrieveRecordings()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsResponse;

ConferenceRetrieveRecordingsParams params = ConferenceRetrieveRecordingsParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
ConferenceRetrieveRecordingsResponse response = client.texml().accounts().conferences().retrieveRecordings(params);
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`client.texml().accounts().conferences().retrieveRecordingsJson()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```java
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.conferences.ConferenceRetrieveRecordingsJsonResponse;

ConferenceRetrieveRecordingsJsonParams params = ConferenceRetrieveRecordingsJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .conferenceSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
ConferenceRetrieveRecordingsJsonResponse response = client.texml().accounts().conferences().retrieveRecordingsJson(params);
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## List queue resources

Lists queue resources.

`client.texml().accounts().queues().list()` — `GET /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| `PageToken` | string | No | Used to request the next page of results. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueListPage;
import com.telnyx.sdk.models.texml.accounts.queues.QueueListParams;

QueueListPage page = client.texml().accounts().queues().list("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Create a new queue

Creates a new queue resource.

`client.texml().accounts().queues().create()` — `POST /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueCreateParams;
import com.telnyx.sdk.models.texml.accounts.queues.QueueCreateResponse;

QueueCreateResponse queue = client.texml().accounts().queues().create("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Fetch a queue resource

Returns a queue resource.

`client.texml().accounts().queues().retrieve()` — `GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queueSid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueRetrieveParams;
import com.telnyx.sdk.models.texml.accounts.queues.QueueRetrieveResponse;

QueueRetrieveParams params = QueueRetrieveParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .queueSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
QueueRetrieveResponse queue = client.texml().accounts().queues().retrieve(params);
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Update a queue resource

Updates a queue resource.

`client.texml().accounts().queues().update()` — `POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queueSid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueUpdateParams;
import com.telnyx.sdk.models.texml.accounts.queues.QueueUpdateResponse;

QueueUpdateParams params = QueueUpdateParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .queueSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
QueueUpdateResponse queue = client.texml().accounts().queues().update(params);
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Delete a queue resource

Delete a queue resource.

`client.texml().accounts().queues().delete()` — `DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queueSid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```java
import com.telnyx.sdk.models.texml.accounts.queues.QueueDeleteParams;

QueueDeleteParams params = QueueDeleteParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .queueSid("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.texml().accounts().queues().delete(params);
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`client.texml().accounts().retrieveRecordingsJson()` — `GET /texml/Accounts/{account_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| `DateCreated` | string (date-time) | No | Filters recording by the creation date. |

```java
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveRecordingsJsonParams;
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveRecordingsJsonResponse;

AccountRetrieveRecordingsJsonResponse response = client.texml().accounts().retrieveRecordingsJson("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch recording resource

Returns recording resource identified by recording id.

`client.texml().accounts().recordings().json().retrieveRecordingSidJson()` — `GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recordingSid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```java
import com.telnyx.sdk.models.texml.accounts.TexmlGetCallRecordingResponseBody;
import com.telnyx.sdk.models.texml.accounts.recordings.json.JsonRetrieveRecordingSidJsonParams;

JsonRetrieveRecordingSidJsonParams params = JsonRetrieveRecordingSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .recordingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
TexmlGetCallRecordingResponseBody texmlGetCallRecordingResponseBody = client.texml().accounts().recordings().json().retrieveRecordingSidJson(params);
```

Key response fields: `response.data.status, response.data.media_url, response.data.account_sid`

## Delete recording resource

Deletes recording resource identified by recording id.

`client.texml().accounts().recordings().json().deleteRecordingSidJson()` — `DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recordingSid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```java
import com.telnyx.sdk.models.texml.accounts.recordings.json.JsonDeleteRecordingSidJsonParams;

JsonDeleteRecordingSidJsonParams params = JsonDeleteRecordingSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .recordingSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
client.texml().accounts().recordings().json().deleteRecordingSidJson(params);
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`client.texml().accounts().retrieveTranscriptionsJson()` — `GET /texml/Accounts/{account_sid}/Transcriptions.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `PageToken` | string | No | Used to request the next page of results. |
| `PageSize` | integer | No | The number of records to be displayed on a page |

```java
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveTranscriptionsJsonParams;
import com.telnyx.sdk.models.texml.accounts.AccountRetrieveTranscriptionsJsonResponse;

AccountRetrieveTranscriptionsJsonResponse response = client.texml().accounts().retrieveTranscriptionsJson("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`client.texml().accounts().transcriptions().json().retrieveRecordingTranscriptionSidJson()` — `GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recordingTranscriptionSid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```java
import com.telnyx.sdk.models.texml.accounts.transcriptions.json.JsonRetrieveRecordingTranscriptionSidJsonParams;
import com.telnyx.sdk.models.texml.accounts.transcriptions.json.JsonRetrieveRecordingTranscriptionSidJsonResponse;

JsonRetrieveRecordingTranscriptionSidJsonParams params = JsonRetrieveRecordingTranscriptionSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .recordingTranscriptionSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
JsonRetrieveRecordingTranscriptionSidJsonResponse response = client.texml().accounts().transcriptions().json().retrieveRecordingTranscriptionSidJson(params);
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.texml().accounts().transcriptions().json().deleteRecordingTranscriptionSidJson()` — `DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recordingTranscriptionSid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```java
import com.telnyx.sdk.models.texml.accounts.transcriptions.json.JsonDeleteRecordingTranscriptionSidJsonParams;

JsonDeleteRecordingTranscriptionSidJsonParams params = JsonDeleteRecordingTranscriptionSidJsonParams.builder()
    .accountSid("550e8400-e29b-41d4-a716-446655440000")
    .recordingTranscriptionSid("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
client.texml().accounts().transcriptions().json().deleteRecordingTranscriptionSidJson(params);
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML. In your TeXML you will be able to use your secret name, and this name will be replaced by the actual secret value when processing the TeXML on Telnyx side. The secrets are not visible in any logs.

`client.texml().secrets()` — `POST /texml/secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name used as a reference for the secret, if the name already... |
| `value` | string | Yes | Secret value which will be used when rendering the TeXML tem... |

```java
import com.telnyx.sdk.models.texml.TexmlSecretsParams;
import com.telnyx.sdk.models.texml.TexmlSecretsResponse;

TexmlSecretsParams params = TexmlSecretsParams.builder()
    .name("My Secret Name")
    .value("My Secret Value")
    .build();
TexmlSecretsResponse response = client.texml().secrets(params);
```

Key response fields: `response.data.name, response.data.value`

## List all TeXML Applications

Returns a list of your TeXML Applications.

`client.texmlApplications().list()` — `GET /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, friendly_name, active) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationListPage;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationListParams;

TexmlApplicationListPage page = client.texmlApplications().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`client.texmlApplications().retrieve()` — `GET /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationRetrieveParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationRetrieveResponse;

TexmlApplicationRetrieveResponse texmlApplication = client.texmlApplications().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`client.texmlApplications().update()` — `PATCH /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `friendlyName` | string | Yes | A user-assigned name to help manage the application. |
| `voiceUrl` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the Texml Application. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes a TeXML Application

Deletes a TeXML Application.

`client.texmlApplications().delete()` — `DELETE /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationDeleteParams;
import com.telnyx.sdk.models.texmlapplications.TexmlApplicationDeleteResponse;

TexmlApplicationDeleteResponse texmlApplication = client.texmlApplications().delete("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
