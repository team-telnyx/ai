---
name: telnyx-texml-curl
description: >-
  TeXML (TwiML-compatible) voice applications. Manage apps, calls, conferences,
  recordings, queues, and streams.
metadata:
  author: telnyx
  product: texml
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - curl

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-curl)
2. Create a TeXML Application with primary webhook URL (where Telnyx fetches XML instructions)
3. Host TeXML XML instructions at an accessible URL (TeXML Bin or any public URL)
4. Assign the phone number to the TeXML Application

### Steps

1. **Create TeXML app**
2. **Author XML instructions**
3. **Assign number**
4. **Handle inbound calls**

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Declarative XML call flows, Twilio/TwiML migration | TeXML (this skill) |
| Programmatic event-driven call control | Call Control API (see telnyx-voice-curl) |
| LLM-powered voice agents | AI Assistants (see telnyx-ai-assistants-curl) |

### Common mistakes

- ALWAYS end XML flows with <Hangup/> — omitting it causes dead silence with no termination
- ALWAYS configure a failover webhook URL — if primary is unreachable, call drops immediately
- NEVER use unreachable webhook URLs — TeXML fetches instructions from the URL on every call

**Related skills**: telnyx-voice-curl, telnyx-ai-assistants-curl, telnyx-numbers-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Creates a TeXML Application

Creates a TeXML Application.

`POST /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `friendly_name` | string | Yes | A user-assigned name to help manage the application. |
| `voice_url` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `tags` | array[string] | No | Tags associated with the Texml Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "friendly_name": "call-router",
  "voice_url": "https://example.com"
}' \
  "https://api.telnyx.com/v2/texml_applications"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Initiate an outbound call

Initiate an outbound TeXML call. Telnyx will request TeXML from the XML Request URL configured for the connection in the Mission Control Portal.

`POST /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationSid` | string | Yes | The ID of the TeXML Application. |
| `To` | string (E.164) | Yes | The phone number of the called party. |
| `From` | string (E.164) | Yes | The phone number of the party that initiated the call. |
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `UrlMethod` | enum (GET, POST) | No | HTTP request type used for `Url`. |
| `StatusCallbackMethod` | enum (GET, POST) | No | HTTP request type used for `StatusCallback`. |
| `StatusCallbackEvent` | enum (initiated, ringing, answered, completed) | No | The call events for which Telnyx should send a webhook. |
| ... | | | +34 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "ApplicationSid": "550e8400-e29b-41d4-a716-446655440000",
  "To": "+16175551212",
  "From": "+16175551212"
}' \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls"
```

Key response fields: `.data.status, .data.to, .data.from`

## Fetch a call

Returns an individual call identified by its CallSid. This endpoint is eventually consistent.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}"
```

Key response fields: `.data.status, .data.to, .data.from`

## Update call

Update TeXML call. Please note that the keys present in the payload MUST BE formatted in CamelCase as specified in the example.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}"
```

Key response fields: `.data.status, .data.to, .data.from`

## List conference resources

Lists conference resources.

`GET /texml/Accounts/{account_sid}/Conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (init, in-progress, completed) | No | Filters conferences by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences?Page=1&PageSize=10&FriendlyName=weekly_review_call&Status=in-progress&DateCreated=>=2023-05-22&DateUpdated=>=2023-05-22"
```

Key response fields: `.data.conferences, .data.end, .data.first_page_uri`

## Fetch multiple call resources

Returns multiple call resources for an account. This endpoint is eventually consistent.

`GET /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (canceled, completed, failed, busy, no-answer) | No | Filters calls by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls?Page=1&PageSize=10&To=+1312345678&From=+1312345678&Status=no-answer&StartTime=2023-05-22&StartTime_gt=2023-05-22&StartTime_lt=2023-05-22&EndTime=2023-05-22&EndTime_gt=2023-05-22&EndTime_lt=2023-05-22"
```

Key response fields: `.data.calls, .data.end, .data.first_page_uri`

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## Request recording for a call

Starts recording with specified parameters for call identified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json"
```

Key response fields: `.data.account_sid, .data.call_sid, .data.channels`

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `recording_sid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Key response fields: `.data.account_sid, .data.call_sid, .data.channels`

## Request siprec session for a call

Starts siprec session with specified parameters for call identified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json"
```

Key response fields: `.data.status, .data.account_sid, .data.call_sid`

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `siprec_sid` | string (UUID) | Yes | The SiprecSid that uniquely identifies the Sip Recording. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json"
```

Key response fields: `.data.status, .data.account_sid, .data.call_sid`

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json"
```

Key response fields: `.data.status, .data.name, .data.account_sid`

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `call_sid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `streaming_sid` | string (UUID) | Yes | Uniquely identifies the streaming by id. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Key response fields: `.data.status, .data.account_sid, .data.call_sid`

## Fetch a conference resource

Returns a conference resource.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}"
```

Key response fields: `.data.status, .data.account_sid, .data.api_version`

## Update a conference resource

Updates a conference resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}"
```

Key response fields: `.data.status, .data.account_sid, .data.api_version`

## List conference participants

Lists conference participants

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## Dial a new conference participant

Dials a new conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants"
```

Key response fields: `.data.status, .data.account_sid, .data.call_sid`

## Get conference participant resource

Gets conference participant resource

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `call_sid_or_participant_label` | string | Yes | CallSid or Label of the Participant to update. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}"
```

Key response fields: `.data.status, .data.account_sid, .data.api_version`

## Update a conference participant

Updates a conference participant

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `call_sid_or_participant_label` | string | Yes | CallSid or Label of the Participant to update. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}"
```

Key response fields: `.data.status, .data.account_sid, .data.api_version`

## Delete a conference participant

Deletes a conference participant

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `call_sid_or_participant_label` | string | Yes | CallSid or Label of the Participant to update. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}"
```

## List conference recordings

Lists conference recordings

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `conference_sid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## List queue resources

Lists queue resources.

`GET /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| `PageToken` | string | No | Used to request the next page of results. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Queues?Page=1&PageSize=10&DateCreated=>=2023-05-22&DateUpdated=>=2023-05-22"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## Create a new queue

Creates a new queue resource.

`POST /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Queues"
```

Key response fields: `.data.account_sid, .data.average_wait_time, .data.current_size`

## Fetch a queue resource

Returns a queue resource.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queue_sid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Queues/{queue_sid}"
```

Key response fields: `.data.account_sid, .data.average_wait_time, .data.current_size`

## Update a queue resource

Updates a queue resource.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queue_sid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Queues/{queue_sid}"
```

Key response fields: `.data.account_sid, .data.average_wait_time, .data.current_size`

## Delete a queue resource

Delete a queue resource.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `queue_sid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Queues/{queue_sid}"
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| `DateCreated` | string (date-time) | No | Filters recording by the creation date. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Recordings.json?Page=1&PageSize=10&DateCreated=2023-05-22T00:00:00Z"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_sid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Recordings/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Key response fields: `.data.status, .data.media_url, .data.account_sid`

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_sid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Recordings/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `PageToken` | string | No | Used to request the next page of results. |
| `PageSize` | integer | No | The number of records to be displayed on a page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Transcriptions.json?PageSize=10"
```

Key response fields: `.data.end, .data.first_page_uri, .data.next_page_uri`

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_transcription_sid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Transcriptions/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Key response fields: `.data.status, .data.account_sid, .data.api_version`

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_sid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `recording_transcription_sid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/{account_sid}/Transcriptions/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML. In your TeXML you will be able to use your secret name, and this name will be replaced by the actual secret value when processing the TeXML on Telnyx side. The secrets are not visible in any logs.

`POST /texml/secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name used as a reference for the secret, if the name already... |
| `value` | string | Yes | Secret value which will be used when rendering the TeXML tem... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "My Secret Name",
  "value": "My Secret Value"
}' \
  "https://api.telnyx.com/v2/texml/secrets"
```

Key response fields: `.data.name, .data.value`

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, friendly_name, active) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml_applications?sort=friendly_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `friendly_name` | string | Yes | A user-assigned name to help manage the application. |
| `voice_url` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the Texml Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "friendly_name": "call-router",
  "voice_url": "https://example.com"
}' \
  "https://api.telnyx.com/v2/texml_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Deletes a TeXML Application

Deletes a TeXML Application.

`DELETE /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
