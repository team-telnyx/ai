---
name: telnyx-texml-curl
description: >-
  Build voice applications using TeXML markup language (TwiML-compatible).
  Manage applications, calls, conferences, recordings, queues, and streams. This
  skill provides REST API (curl) examples.
metadata:
  author: telnyx
  product: texml
  language: curl
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Texml - curl

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
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

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

## Fetch multiple call resources

Returns multiple call resources for an account. This endpoint is eventually consistent.

`GET /texml/Accounts/{account_sid}/Calls`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls?Page=1&PageSize=10&To=+1312345678&From=+1312345678&Status=no-answer&StartTime=2023-05-22&StartTime>=2023-05-22&StartTime<=2023-05-22&EndTime=2023-05-22&EndTime>=2023-05-22&EndTime<=2023-05-22"
```

Returns: `calls` (array[object]), `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `start` (integer), `uri` (string)

## Initiate an outbound call

Initiate an outbound TeXML call. Telnyx will request TeXML from the XML Request URL configured for the TeXML Application in the Mission Control Portal.

`POST /texml/Accounts/{account_sid}/Calls` — Required: `Url`

Optional: `Texml` (object)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls"
```

Returns: `from` (string), `status` (string), `to` (string)

## Fetch a call

Returns an individual call identified by its CallSid. This endpoint is eventually consistent.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}"
```

Returns: `account_sid` (string), `answered_by` (enum: human, machine, not_sure), `caller_name` (string), `date_created` (string), `date_updated` (string), `direction` (enum: inbound, outbound), `duration` (string), `end_time` (string), `from` (string), `from_formatted` (string), `price` (string), `price_unit` (string), `sid` (string), `start_time` (string), `status` (enum: ringing, in-progress, canceled, completed, failed, busy, no-answer), `to` (string), `to_formatted` (string), `uri` (string)

## Update call

Update TeXML call. Please note that the keys present in the payload MUST BE formatted in CamelCase as specified in the example.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}"
```

Returns: `account_sid` (string), `answered_by` (enum: human, machine, not_sure), `caller_name` (string), `date_created` (string), `date_updated` (string), `direction` (enum: inbound, outbound), `duration` (string), `end_time` (string), `from` (string), `from_formatted` (string), `price` (string), `price_unit` (string), `sid` (string), `start_time` (string), `status` (enum: ringing, in-progress, canceled, completed, failed, busy, no-answer), `to` (string), `to_formatted` (string), `uri` (string)

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Recordings.json"
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `recordings` (array[object]), `start` (integer), `uri` (string)

## Request recording for a call

Starts recording with specified parameters for call identified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Recordings.json"
```

Returns: `account_sid` (string), `call_sid` (string), `channels` (enum: 1, 2), `conference_sid` (uuid), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `error_code` (string | null), `price` (string | null), `price_unit` (string | null), `sid` (string), `source` (enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking), `start_time` (date-time), `track` (enum: inbound, outbound, both), `uri` (string)

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Recordings/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Returns: `account_sid` (string), `call_sid` (string), `channels` (enum: 1, 2), `conference_sid` (uuid), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `error_code` (string | null), `price` (string | null), `price_unit` (string | null), `sid` (string), `source` (enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking), `start_time` (date-time), `track` (enum: inbound, outbound, both), `uri` (string)

## Request siprec session for a call

Starts siprec session with specified parameters for call identified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Siprec.json"
```

Returns: `account_sid` (string), `call_sid` (string), `date_created` (string), `date_updated` (string), `error_code` (string), `sid` (string), `start_time` (string), `status` (enum: in-progress, stopped), `track` (enum: both_tracks, inbound_track, outbound_track), `uri` (string)

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Siprec/{siprec_sid}.json"
```

Returns: `account_sid` (string), `call_sid` (string), `date_updated` (string), `error_code` (string), `sid` (string), `status` (enum: in-progress, stopped), `uri` (string)

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Streams.json"
```

Returns: `account_sid` (string), `call_sid` (string), `date_updated` (date-time), `name` (string), `sid` (string), `status` (enum: in-progress), `uri` (string)

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Calls/{call_sid}/Streams/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Returns: `account_sid` (string), `call_sid` (string), `date_updated` (date-time), `sid` (string), `status` (enum: stopped), `uri` (string)

## List conference resources

Returns a paginated list of conference resources for the account, with support for filtering by friendly name, status, and creation or update dates.

`GET /texml/Accounts/{account_sid}/Conferences`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences?Page=1&PageSize=10&FriendlyName=weekly_review_call&Status=in-progress&DateCreated=>=2023-05-22&DateUpdated=>=2023-05-22"
```

Returns: `conferences` (array[object]), `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `start` (integer), `uri` (string)

## Fetch a conference resource

Returns a single conference resource for the account by its ConferenceSid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}"
```

Returns: `account_sid` (string), `api_version` (string), `call_sid_ending_conference` (string), `date_created` (string), `date_updated` (string), `friendly_name` (string), `reason_conference_ended` (enum: participant-with-end-conference-on-exit-left, last-participant-left, conference-ended-via-api, time-exceeded), `region` (string), `sid` (string), `status` (enum: init, in-progress, completed), `subresource_uris` (object), `uri` (string)

## Update a conference resource

Updates the specified conference resource, for example to modify its status, and returns the updated conference.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}"
```

Returns: `account_sid` (string), `api_version` (string), `call_sid_ending_conference` (string), `date_created` (string), `date_updated` (string), `friendly_name` (string), `reason_conference_ended` (enum: participant-with-end-conference-on-exit-left, last-participant-left, conference-ended-via-api, time-exceeded), `region` (string), `sid` (string), `status` (enum: init, in-progress, completed), `subresource_uris` (object), `uri` (string)

## List conference participants

Returns the list of participants currently in the specified conference.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Participants"
```

Returns: `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `participants` (array[object]), `start` (integer), `uri` (string)

## Dial a new conference participant

Dials a new participant into the specified conference and returns the created participant resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Participants"
```

Returns: `account_sid` (string), `call_sid` (string), `coaching` (boolean), `coaching_call_sid` (string), `conference_sid` (uuid), `end_conference_on_exit` (boolean), `hold` (boolean), `muted` (boolean), `status` (enum: connecting, connected, completed), `uri` (string)

## Get conference participant resource

Returns a single conference participant resource by call SID or participant label.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}"
```

Returns: `account_sid` (string), `api_version` (string), `call_sid` (string), `call_sid_legacy` (string), `coaching` (boolean), `coaching_call_sid` (string), `coaching_call_sid_legacy` (string), `conference_sid` (uuid), `date_created` (string), `date_updated` (string), `end_conference_on_exit` (boolean), `hold` (boolean), `muted` (boolean), `status` (enum: connecting, connected, completed), `uri` (string)

## Update a conference participant

Updates the specified conference participant, for example muting or holding them, and returns the updated participant.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}"
```

Returns: `account_sid` (string), `api_version` (string), `call_sid` (string), `call_sid_legacy` (string), `coaching` (boolean), `coaching_call_sid` (string), `coaching_call_sid_legacy` (string), `conference_sid` (uuid), `date_created` (string), `date_updated` (string), `end_conference_on_exit` (boolean), `hold` (boolean), `muted` (boolean), `status` (enum: connecting, connected, completed), `uri` (string)

## Delete a conference participant

Removes the specified participant from the conference, ending their leg of the call.

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}"
```

## List conference recordings

Returns the list of recordings made for the specified conference.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Recordings"
```

Returns: `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `participants` (array[object]), `recordings` (array[object]), `start` (integer), `uri` (string)

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Conferences/{conference_sid}/Recordings.json"
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `recordings` (array[object]), `start` (integer), `uri` (string)

## List queue resources

Returns a paginated list of queue resources for the account, with support for filtering by creation or update dates.

`GET /texml/Accounts/{account_sid}/Queues`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Queues?Page=1&PageSize=10&DateCreated=>=2023-05-22&DateUpdated=>=2023-05-22"
```

Returns: `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `queues` (array[object]), `start` (integer), `uri` (string)

## Create a new queue

Creates a new queue resource for the account with the provided settings and returns it.

`POST /texml/Accounts/{account_sid}/Queues`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Queues"
```

Returns: `account_sid` (string), `average_wait_time` (integer), `current_size` (integer), `date_created` (string), `date_updated` (string), `max_size` (integer), `sid` (string), `subresource_uris` (object), `uri` (string)

## Fetch a queue resource

Returns a single queue resource for the account by its QueueSid.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Queues/{queue_sid}"
```

Returns: `account_sid` (string), `average_wait_time` (integer), `current_size` (integer), `date_created` (string), `date_updated` (string), `max_size` (integer), `sid` (string), `subresource_uris` (object), `uri` (string)

## Update a queue resource

Updates the specified queue resource's settings and returns the updated queue.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Queues/{queue_sid}"
```

Returns: `account_sid` (string), `average_wait_time` (integer), `current_size` (integer), `date_created` (string), `date_updated` (string), `max_size` (integer), `sid` (string), `subresource_uris` (object), `uri` (string)

## Delete a queue resource

Permanently deletes the specified queue resource from the account.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Queues/{queue_sid}"
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Recordings.json?Page=1&PageSize=10&DateCreated=2023-05-22T00:00:00Z"
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `recordings` (array[object]), `start` (integer), `uri` (string)

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Recordings/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Returns: `account_sid` (string), `call_sid` (string), `channels` (enum: 1, 2), `conference_sid` (uuid), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `error_code` (string | null), `media_url` (uri), `sid` (string), `source` (enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking), `start_time` (date-time), `status` (enum: in-progress, completed, paused, stopped), `subresources_uris` (object), `uri` (string)

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Recordings/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Transcriptions.json?PageSize=10"
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `start` (integer), `transcriptions` (array[object]), `uri` (string)

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Transcriptions/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

Returns: `account_sid` (string), `api_version` (string), `call_sid` (string), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `recording_sid` (string), `sid` (string), `status` (enum: in-progress, completed), `transcription_text` (string), `uri` (string)

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml/Accounts/f5586561-8ff0-4291-a51b-c7dfe4139ff9/Transcriptions/6a09cdc3-8948-47f0-aa62-74ac943d6c58.json"
```

## Initiate an outbound AI call

Initiate an outbound AI call with warm-up support: Telnyx attempts to warm up the assistant identified by `AIAssistantId` before placing the call and starts it automatically when the called party answers.

`POST /texml/ai_calls/{connection_id}` — Required: `From`, `To`, `AIAssistantId`

Optional: `AIAssistantDynamicVariables` (object), `AIAssistantVersion` (string), `AsyncAmd` (boolean), `AsyncAmdStatusCallback` (string), `AsyncAmdStatusCallbackMethod` (enum: GET, POST), `CallerId` (string), `ConversationCallback` (string), `ConversationCallbackMethod` (enum: GET, POST), `ConversationCallbacks` (array[string]), `CustomHeaders` (array[object]), `DetectionMode` (enum: Premium, Regular, PremiumCallScreening), `MachineDetection` (enum: Enable, Disable, DetectMessageEnd), `MachineDetectionBeepMaxFrequency` (int32), `MachineDetectionBeepMinFrequency` (int32), `MachineDetectionBeepMinToneDuration` (int32), `MachineDetectionBeepProfile` (enum: both, freq_only), `MachineDetectionBeepSpectralConfirmation` (boolean), `MachineDetectionBeepSpectralMinPurity` (number), `MachineDetectionBeepSpectralRejectFaxCng` (boolean), `MachineDetectionBeepSpectralWindow` (int32), `MachineDetectionPromptEndTimeout` (integer), `MachineDetectionSilenceTimeout` (integer), `MachineDetectionSpeechEndThreshold` (integer), `MachineDetectionSpeechThreshold` (integer), `MachineDetectionTimeout` (integer), `Passports` (string), `PreferredCodecs` (string), `Record` (boolean), `RecordingChannels` (enum: mono, dual), `RecordingStatusCallback` (string), `RecordingStatusCallbackEvent` (string), `RecordingStatusCallbackMethod` (enum: GET, POST), `RecordingTimeout` (integer), `RecordingTrack` (enum: inbound, outbound, both), `SendRecordingUrl` (boolean), `SipAuthPassword` (string), `SipAuthUsername` (string), `SipRegion` (enum: US, Europe, Canada, Australia, Middle East), `StatusCallback` (string), `StatusCallbackEvent` (string), `StatusCallbackMethod` (enum: GET, POST), `StatusCallbacks` (array[string]), `TimeLimit` (integer), `Timeout` (integer), `Trim` (enum: trim-silence, do-not-trim)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "From": "+16175551212",
  "To": "+16175551212",
  "AIAssistantId": "string"
}' \
  "https://api.telnyx.com/v2/texml/ai_calls/{connection_id}"
```

Returns: `call_sid` (string), `from` (string), `status` (string), `to` (string)

## Create a connection-scoped TeXML call

Initiate an outbound TeXML call using a TeXML application connection ID, not an account SID. Request parameter names are case-sensitive. From and To are required; Texml supplies inline instructions and Url overrides the application XML request URL. When neither is supplied, the application configuration supplies the instructions. The response is a flat call object without a data wrapper.

`POST /texml/calls/{connection_id}` — Required: `From`, `To`

Optional: `Method` (enum: GET, POST), `Texml` (string), `Url` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "From": "+13120001234",
  "To": "+13121230000",
  "Texml": "<Response><Say>Hello</Say></Response>"
}' \
  "https://api.telnyx.com/v2/texml/calls/1234567890"
```

Returns: `call_sid` (string), `from` (string), `status` (enum: queued), `to` (string)

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML. In your TeXML you will be able to use your secret name, and this name will be replaced by the actual secret value when processing the TeXML on Telnyx side. The secrets are not visible in any logs.

`POST /texml/secrets` — Required: `name`, `value`

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

Returns: `name` (string), `value` (enum: REDACTED)

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml_applications?sort=friendly_name"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Creates a TeXML Application

Creates a TeXML application, which defines the voice URLs and settings used to serve TeXML instructions for calls, and returns the created application.

`POST /texml_applications` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum: get, post)

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

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/texml_applications/1293384261075731499"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum: get, post)

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

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Deletes a TeXML Application

Permanently deletes the specified TeXML application from your account.

`DELETE /texml_applications/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/texml_applications/1293384261075731499"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)
