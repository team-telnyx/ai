---
name: telnyx-texml-python
description: >-
  TeXML (TwiML-compatible) voice applications. Manage apps, calls, conferences,
  recordings, queues, and streams.
metadata:
  author: telnyx
  product: texml
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - Python

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-python)
2. Create a TeXML Application with primary webhook URL (where Telnyx fetches XML instructions)
3. Host TeXML XML instructions at an accessible URL (TeXML Bin or any public URL)
4. Assign the phone number to the TeXML Application

### Steps

1. **Create TeXML app**: `client.texml_applications.create(webhook_event_url=...)`
2. **Author XML instructions**: `<Response><Say>Hello!</Say><Hangup/></Response>`
3. **Assign number**: `client.phone_numbers.update(connection_id=...)`
4. **Handle inbound calls**: `Telnyx fetches XML from your webhook URL`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Declarative XML call flows, Twilio/TwiML migration | TeXML (this skill) |
| Programmatic event-driven call control | Call Control API (see telnyx-voice-python) |
| LLM-powered voice agents | AI Assistants (see telnyx-ai-assistants-python) |

### Common mistakes

- ALWAYS end XML flows with <Hangup/> — omitting it causes dead silence with no termination
- ALWAYS configure a failover webhook URL — if primary is unreachable, call drops immediately
- NEVER use unreachable webhook URLs — TeXML fetches instructions from the URL on every call

**Related skills**: telnyx-voice-python, telnyx-ai-assistants-python, telnyx-numbers-python

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
    result = client.texml_applications.create(params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Creates a TeXML Application

Creates a TeXML Application.

`client.texml_applications.create()` — `POST /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `friendly_name` | string | Yes | A user-assigned name to help manage the application. |
| `voice_url` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `tags` | array[string] | No | Tags associated with the Texml Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```python
texml_application = client.texml_applications.create(
    friendly_name="call-router",
    voice_url="https://example.com",
)
print(texml_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Initiate an outbound call

Initiate an outbound TeXML call. Telnyx will request TeXML from the XML Request URL configured for the connection in the Mission Control Portal.

`client.texml.accounts.calls.calls()` — `POST /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_sid` | string | Yes | The ID of the TeXML Application. |
| `To` | string (E.164) | Yes | The phone number of the called party. |
| `From` | string (E.164) | Yes | The phone number of the party that initiated the call. |
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `url_method` | enum (GET, POST) | No | HTTP request type used for `Url`. |
| `status_callback_method` | enum (GET, POST) | No | HTTP request type used for `StatusCallback`. |
| `status_callback_event` | enum (initiated, ringing, answered, completed) | No | The call events for which Telnyx should send a webhook. |
| ... | | | +34 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.texml.accounts.calls.calls(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    application_sid="example-app-sid",
    from_="+13120001234",
    to="+13121230000",
)
print(response.from_)
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## Fetch a call

Returns an individual call identified by its CallSid. This endpoint is eventually consistent.

`client.texml.accounts.calls.retrieve()` — `GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```python
call = client.texml.accounts.calls.retrieve(
    call_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(call.account_sid)
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## Update call

Update TeXML call. Please note that the keys present in the payload MUST BE formatted in CamelCase as specified in the example.

`client.texml.accounts.calls.update()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```python
call = client.texml.accounts.calls.update(
    call_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(call.account_sid)
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## List conference resources

Lists conference resources.

`client.texml.accounts.conferences.retrieve_conferences()` — `GET /texml/Accounts/{account_sid}/Conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (init, in-progress, completed) | No | Filters conferences by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `page_size` | integer | No | The number of records to be displayed on a page |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.texml.accounts.conferences.retrieve_conferences(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.conferences)
```

Key response fields: `response.data.conferences, response.data.end, response.data.first_page_uri`

## Fetch multiple call resources

Returns multiple call resources for an account. This endpoint is eventually consistent.

`client.texml.accounts.calls.retrieve_calls()` — `GET /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (canceled, completed, failed, busy, no-answer) | No | Filters calls by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `page_size` | integer | No | The number of records to be displayed on a page |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.texml.accounts.calls.retrieve_calls(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.calls)
```

Key response fields: `response.data.calls, response.data.end, response.data.first_page_uri`

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`client.texml.accounts.calls.recordings_json.retrieve_recordings_json()` — `GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```python
response = client.texml.accounts.calls.recordings_json.retrieve_recordings_json(
    call_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.end)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Request recording for a call

Starts recording with specified parameters for call identified by call_sid.

`client.texml.accounts.calls.recordings_json.recordings_json()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```python
response = client.texml.accounts.calls.recordings_json.recordings_json(
    call_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.account_sid, response.data.call_sid, response.data.channels`

## Update recording on a call

Updates recording resource for particular call.

`client.texml.accounts.calls.recordings.recording_sid_json()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `recording_sid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```python
response = client.texml.accounts.calls.recordings.recording_sid_json(
    recording_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    call_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.account_sid, response.data.call_sid, response.data.channels`

## Request siprec session for a call

Starts siprec session with specified parameters for call identified by call_sid.

`client.texml.accounts.calls.siprec_json()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```python
response = client.texml.accounts.calls.siprec_json(
    call_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`client.texml.accounts.calls.siprec.siprec_sid_json()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `siprec_sid` | string (UUID) | Yes | The SiprecSid that uniquely identifies the Sip Recording. |

```python
response = client.texml.accounts.calls.siprec.siprec_sid_json(
    siprec_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    call_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`client.texml.accounts.calls.streams_json()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```python
response = client.texml.accounts.calls.streams_json(
    call_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.status, response.data.name, response.data.account_sid`

## Update streaming on a call

Updates streaming resource for particular call.

`client.texml.accounts.calls.streams.streaming_sid_json()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `streaming_sid` | string (UUID) | Yes | Uniquely identifies the streaming by id. |

```python
response = client.texml.accounts.calls.streams.streaming_sid_json(
    streaming_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    call_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Fetch a conference resource

Returns a conference resource.

`client.texml.accounts.conferences.retrieve()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```python
conference = client.texml.accounts.conferences.retrieve(
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(conference.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Update a conference resource

Updates a conference resource.

`client.texml.accounts.conferences.update()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```python
conference = client.texml.accounts.conferences.update(
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(conference.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## List conference participants

Lists conference participants

`client.texml.accounts.conferences.participants.retrieve_participants()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```python
response = client.texml.accounts.conferences.participants.retrieve_participants(
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.end)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Dial a new conference participant

Dials a new conference participant

`client.texml.accounts.conferences.participants.participants()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```python
response = client.texml.accounts.conferences.participants.participants(
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Get conference participant resource

Gets conference participant resource

`client.texml.accounts.conferences.participants.retrieve()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `call_sid_or_participant_label` | string | Yes | CallSid or Label of the Participant to update. |

```python
participant = client.texml.accounts.conferences.participants.retrieve(
    call_sid_or_participant_label="participant-1",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(participant.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Update a conference participant

Updates a conference participant

`client.texml.accounts.conferences.participants.update()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `call_sid_or_participant_label` | string | Yes | CallSid or Label of the Participant to update. |

```python
participant = client.texml.accounts.conferences.participants.update(
    call_sid_or_participant_label="participant-1",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(participant.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Delete a conference participant

Deletes a conference participant

`client.texml.accounts.conferences.participants.delete()` — `DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `call_sid_or_participant_label` | string | Yes | CallSid or Label of the Participant to update. |

```python
client.texml.accounts.conferences.participants.delete(
    call_sid_or_participant_label="participant-1",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
)
```

## List conference recordings

Lists conference recordings

`client.texml.accounts.conferences.retrieve_recordings()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```python
response = client.texml.accounts.conferences.retrieve_recordings(
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.end)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`client.texml.accounts.conferences.retrieve_recordings_json()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```python
response = client.texml.accounts.conferences.retrieve_recordings_json(
    conference_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.end)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## List queue resources

Lists queue resources.

`client.texml.accounts.queues.list()` — `GET /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `page_size` | integer | No | The number of records to be displayed on a page |
| `page_token` | string | No | Used to request the next page of results. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.texml.accounts.queues.list(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
page = page.queues[0]
print(page.account_sid)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Create a new queue

Creates a new queue resource.

`client.texml.accounts.queues.create()` — `POST /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```python
queue = client.texml.accounts.queues.create(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(queue.account_sid)
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Fetch a queue resource

Returns a queue resource.

`client.texml.accounts.queues.retrieve()` — `GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queue_sid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```python
queue = client.texml.accounts.queues.retrieve(
    queue_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(queue.account_sid)
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Update a queue resource

Updates a queue resource.

`client.texml.accounts.queues.update()` — `POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queue_sid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```python
queue = client.texml.accounts.queues.update(
    queue_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(queue.account_sid)
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Delete a queue resource

Delete a queue resource.

`client.texml.accounts.queues.delete()` — `DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queue_sid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```python
client.texml.accounts.queues.delete(
    queue_sid="550e8400-e29b-41d4-a716-446655440000",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`client.texml.accounts.retrieve_recordings_json()` — `GET /texml/Accounts/{account_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `page_size` | integer | No | The number of records to be displayed on a page |
| `date_created` | string (date-time) | No | Filters recording by the creation date. |

```python
response = client.texml.accounts.retrieve_recordings_json(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.end)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch recording resource

Returns recording resource identified by recording id.

`client.texml.accounts.recordings.json.retrieve_recording_sid_json()` — `GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_sid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```python
texml_get_call_recording_response_body = client.texml.accounts.recordings.json.retrieve_recording_sid_json(
    recording_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(texml_get_call_recording_response_body.account_sid)
```

Key response fields: `response.data.status, response.data.media_url, response.data.account_sid`

## Delete recording resource

Deletes recording resource identified by recording id.

`client.texml.accounts.recordings.json.delete_recording_sid_json()` — `DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_sid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```python
client.texml.accounts.recordings.json.delete_recording_sid_json(
    recording_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`client.texml.accounts.retrieve_transcriptions_json()` — `GET /texml/Accounts/{account_sid}/Transcriptions.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `page_token` | string | No | Used to request the next page of results. |
| `page_size` | integer | No | The number of records to be displayed on a page |

```python
response = client.texml.accounts.retrieve_transcriptions_json(
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.end)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`client.texml.accounts.transcriptions.json.retrieve_recording_transcription_sid_json()` — `GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_transcription_sid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```python
response = client.texml.accounts.transcriptions.json.retrieve_recording_transcription_sid_json(
    recording_transcription_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
print(response.account_sid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.texml.accounts.transcriptions.json.delete_recording_transcription_sid_json()` — `DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_transcription_sid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```python
client.texml.accounts.transcriptions.json.delete_recording_transcription_sid_json(
    recording_transcription_sid="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    account_sid="550e8400-e29b-41d4-a716-446655440000",
)
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML. In your TeXML you will be able to use your secret name, and this name will be replaced by the actual secret value when processing the TeXML on Telnyx side. The secrets are not visible in any logs.

`client.texml.secrets()` — `POST /texml/secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name used as a reference for the secret, if the name already... |
| `value` | string | Yes | Secret value which will be used when rendering the TeXML tem... |

```python
response = client.texml.secrets(
    name="My Secret Name",
    value="My Secret Value",
)
print(response.data)
```

Key response fields: `response.data.name, response.data.value`

## List all TeXML Applications

Returns a list of your TeXML Applications.

`client.texml_applications.list()` — `GET /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, friendly_name, active) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.texml_applications.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`client.texml_applications.retrieve()` — `GET /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
texml_application = client.texml_applications.retrieve(
    "1293384261075731499",
)
print(texml_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`client.texml_applications.update()` — `PATCH /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `friendly_name` | string | Yes | A user-assigned name to help manage the application. |
| `voice_url` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the Texml Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```python
texml_application = client.texml_applications.update(
    id="1293384261075731499",
    friendly_name="call-router",
    voice_url="https://example.com",
)
print(texml_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes a TeXML Application

Deletes a TeXML Application.

`client.texml_applications.delete()` — `DELETE /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
texml_application = client.texml_applications.delete(
    "1293384261075731499",
)
print(texml_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
