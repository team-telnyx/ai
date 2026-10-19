<!-- SDK reference: telnyx-texml-javascript -->

# Telnyx Texml - JavaScript

## Installation

```bash
npm install telnyx@6.74.2
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.messages.send({ to: '+13125550001', from: '+13125550002', text: 'Hello' });
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

## Fetch multiple call resources

Returns multiple call resources for an account. This endpoint is eventually consistent.

`GET /texml/Accounts/{account_sid}/Calls`

```javascript
const response = await client.texml.accounts.calls.retrieveCalls('account_sid');

console.log(response.calls);
```

Returns: `calls` (array[object]), `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `start` (integer), `uri` (string)

## Initiate an outbound call

Initiate an outbound TeXML call. Telnyx will request TeXML from the XML Request URL configured for the connection in the Mission Control Portal.

`POST /texml/Accounts/{account_sid}/Calls` — Required: `Url`

Optional: `Texml` (object)

```javascript
const response = await client.texml.accounts.calls.calls('account_sid', {
  params: { Url: 'https://www.example.com/texml.xml' },
});

console.log(response.from);
```

Returns: `from` (string), `status` (string), `to` (string)

## Fetch a call

Returns an individual call identified by its CallSid. This endpoint is eventually consistent.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

```javascript
const call = await client.texml.accounts.calls.retrieve('call_sid', { account_sid: '550e8400-e29b-41d4-a716-446655440000' });

console.log(call.account_sid);
```

Returns: `account_sid` (string), `answered_by` (enum: human, machine, not_sure), `caller_name` (string), `date_created` (string), `date_updated` (string), `direction` (enum: inbound, outbound), `duration` (string), `end_time` (string), `from` (string), `from_formatted` (string), `price` (string), `price_unit` (string), `sid` (string), `start_time` (string), `status` (enum: ringing, in-progress, canceled, completed, failed, busy, no-answer), `to` (string), `to_formatted` (string), `uri` (string)

## Update call

Update TeXML call. Please note that the keys present in the payload MUST BE formatted in CamelCase as specified in the example.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

```javascript
const call = await client.texml.accounts.calls.update('call_sid', { account_sid: '550e8400-e29b-41d4-a716-446655440000' });

console.log(call.account_sid);
```

Returns: `account_sid` (string), `answered_by` (enum: human, machine, not_sure), `caller_name` (string), `date_created` (string), `date_updated` (string), `direction` (enum: inbound, outbound), `duration` (string), `end_time` (string), `from` (string), `from_formatted` (string), `price` (string), `price_unit` (string), `sid` (string), `start_time` (string), `status` (enum: ringing, in-progress, canceled, completed, failed, busy, no-answer), `to` (string), `to_formatted` (string), `uri` (string)

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```javascript
const response = await client.texml.accounts.calls.recordingsJson.retrieveRecordingsJson(
  'call_sid',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(response.end);
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `recordings` (array[object]), `start` (integer), `uri` (string)

## Request recording for a call

Starts recording with specified parameters for call identified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

```javascript
const response = await client.texml.accounts.calls.recordingsJson.recordingsJson('call_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `channels` (enum: 1, 2), `conference_sid` (uuid), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `error_code` (string | null), `price` (string | null), `price_unit` (string | null), `sid` (string), `source` (enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking), `start_time` (date-time), `track` (enum: inbound, outbound, both), `uri` (string)

## Update recording on a call

Updates recording resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

```javascript
const response = await client.texml.accounts.calls.recordings.recordingSidJson(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000', call_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `channels` (enum: 1, 2), `conference_sid` (uuid), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `error_code` (string | null), `price` (string | null), `price_unit` (string | null), `sid` (string), `source` (enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking), `start_time` (date-time), `track` (enum: inbound, outbound, both), `uri` (string)

## Request siprec session for a call

Starts siprec session with specified parameters for call identified by call_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

```javascript
const response = await client.texml.accounts.calls.siprecJson('call_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `date_created` (string), `date_updated` (string), `error_code` (string), `sid` (string), `start_time` (string), `status` (enum: in-progress, stopped), `track` (enum: both_tracks, inbound_track, outbound_track), `uri` (string)

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

```javascript
const response = await client.texml.accounts.calls.siprec.siprecSidJson('siprec_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
  call_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `date_updated` (string), `error_code` (string), `sid` (string), `status` (enum: in-progress, stopped), `uri` (string)

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

```javascript
const response = await client.texml.accounts.calls.streamsJson('call_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `date_updated` (date-time), `name` (string), `sid` (string), `status` (enum: in-progress), `uri` (string)

## Update streaming on a call

Updates streaming resource for particular call.

`POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

```javascript
const response = await client.texml.accounts.calls.streams.streamingSidJson(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000', call_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `date_updated` (date-time), `sid` (string), `status` (enum: stopped), `uri` (string)

## List conference resources

Returns a paginated list of conference resources for the account, with support for filtering by friendly name, status, and creation or update dates.

`GET /texml/Accounts/{account_sid}/Conferences`

```javascript
const response = await client.texml.accounts.conferences.retrieveConferences('account_sid');

console.log(response.conferences);
```

Returns: `conferences` (array[object]), `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `start` (integer), `uri` (string)

## Fetch a conference resource

Returns a single conference resource for the account by its ConferenceSid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```javascript
const conference = await client.texml.accounts.conferences.retrieve('conference_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(conference.account_sid);
```

Returns: `account_sid` (string), `api_version` (string), `call_sid_ending_conference` (string), `date_created` (string), `date_updated` (string), `friendly_name` (string), `reason_conference_ended` (enum: participant-with-end-conference-on-exit-left, last-participant-left, conference-ended-via-api, time-exceeded), `region` (string), `sid` (string), `status` (enum: init, in-progress, completed), `subresource_uris` (object), `uri` (string)

## Update a conference resource

Updates the specified conference resource, for example to modify its status, and returns the updated conference.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

```javascript
const conference = await client.texml.accounts.conferences.update('conference_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(conference.account_sid);
```

Returns: `account_sid` (string), `api_version` (string), `call_sid_ending_conference` (string), `date_created` (string), `date_updated` (string), `friendly_name` (string), `reason_conference_ended` (enum: participant-with-end-conference-on-exit-left, last-participant-left, conference-ended-via-api, time-exceeded), `region` (string), `sid` (string), `status` (enum: init, in-progress, completed), `subresource_uris` (object), `uri` (string)

## List conference participants

Returns the list of participants currently in the specified conference.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```javascript
const response = await client.texml.accounts.conferences.participants.retrieveParticipants(
  'conference_sid',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(response.end);
```

Returns: `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `participants` (array[object]), `start` (integer), `uri` (string)

## Dial a new conference participant

Dials a new participant into the specified conference and returns the created participant resource.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

```javascript
const response = await client.texml.accounts.conferences.participants.participants(
  'conference_sid',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(response.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `coaching` (boolean), `coaching_call_sid` (string), `conference_sid` (uuid), `end_conference_on_exit` (boolean), `hold` (boolean), `muted` (boolean), `status` (enum: connecting, connected, completed), `uri` (string)

## Get conference participant resource

Returns a single conference participant resource by call SID or participant label.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```javascript
const participant = await client.texml.accounts.conferences.participants.retrieve(
  'call_sid_or_participant_label',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000', conference_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(participant.account_sid);
```

Returns: `account_sid` (string), `api_version` (string), `call_sid` (string), `call_sid_legacy` (string), `coaching` (boolean), `coaching_call_sid` (string), `coaching_call_sid_legacy` (string), `conference_sid` (uuid), `date_created` (string), `date_updated` (string), `end_conference_on_exit` (boolean), `hold` (boolean), `muted` (boolean), `status` (enum: connecting, connected, completed), `uri` (string)

## Update a conference participant

Updates the specified conference participant, for example muting or holding them, and returns the updated participant.

`POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```javascript
const participant = await client.texml.accounts.conferences.participants.update(
  'call_sid_or_participant_label',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000', conference_sid: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(participant.account_sid);
```

Returns: `account_sid` (string), `api_version` (string), `call_sid` (string), `call_sid_legacy` (string), `coaching` (boolean), `coaching_call_sid` (string), `coaching_call_sid_legacy` (string), `conference_sid` (uuid), `date_created` (string), `date_updated` (string), `end_conference_on_exit` (boolean), `hold` (boolean), `muted` (boolean), `status` (enum: connecting, connected, completed), `uri` (string)

## Delete a conference participant

Removes the specified participant from the conference, ending their leg of the call.

`DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

```javascript
await client.texml.accounts.conferences.participants.delete('call_sid_or_participant_label', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
  conference_sid: '550e8400-e29b-41d4-a716-446655440000',
});
```

## List conference recordings

Returns the list of recordings made for the specified conference.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

```javascript
const response = await client.texml.accounts.conferences.retrieveRecordings('conference_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.end);
```

Returns: `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `participants` (array[object]), `recordings` (array[object]), `start` (integer), `uri` (string)

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

```javascript
const response = await client.texml.accounts.conferences.retrieveRecordingsJson('conference_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.end);
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `recordings` (array[object]), `start` (integer), `uri` (string)

## List queue resources

Returns a paginated list of queue resources for the account, with support for filtering by creation or update dates.

`GET /texml/Accounts/{account_sid}/Queues`

```javascript
// Automatically fetches more pages as needed.
for await (const queueListResponse of client.texml.accounts.queues.list('account_sid')) {
  console.log(queueListResponse.account_sid);
}
```

Returns: `end` (integer), `first_page_uri` (string), `next_page_uri` (string), `page` (integer), `page_size` (integer), `queues` (array[object]), `start` (integer), `uri` (string)

## Create a new queue

Creates a new queue resource for the account with the provided settings and returns it.

`POST /texml/Accounts/{account_sid}/Queues`

```javascript
const queue = await client.texml.accounts.queues.create('account_sid');

console.log(queue.account_sid);
```

Returns: `account_sid` (string), `average_wait_time` (integer), `current_size` (integer), `date_created` (string), `date_updated` (string), `max_size` (integer), `sid` (string), `subresource_uris` (object), `uri` (string)

## Fetch a queue resource

Returns a single queue resource for the account by its QueueSid.

`GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```javascript
const queue = await client.texml.accounts.queues.retrieve('queue_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(queue.account_sid);
```

Returns: `account_sid` (string), `average_wait_time` (integer), `current_size` (integer), `date_created` (string), `date_updated` (string), `max_size` (integer), `sid` (string), `subresource_uris` (object), `uri` (string)

## Update a queue resource

Updates the specified queue resource's settings and returns the updated queue.

`POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```javascript
const queue = await client.texml.accounts.queues.update('queue_sid', {
  account_sid: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(queue.account_sid);
```

Returns: `account_sid` (string), `average_wait_time` (integer), `current_size` (integer), `date_created` (string), `date_updated` (string), `max_size` (integer), `sid` (string), `subresource_uris` (object), `uri` (string)

## Delete a queue resource

Permanently deletes the specified queue resource from the account.

`DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

```javascript
await client.texml.accounts.queues.delete('queue_sid', { account_sid: '550e8400-e29b-41d4-a716-446655440000' });
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`GET /texml/Accounts/{account_sid}/Recordings.json`

```javascript
const response = await client.texml.accounts.retrieveRecordingsJson('account_sid');

console.log(response.end);
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `recordings` (array[object]), `start` (integer), `uri` (string)

## Fetch recording resource

Returns recording resource identified by recording id.

`GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```javascript
const texmlGetCallRecordingResponseBody =
  await client.texml.accounts.recordings.json.retrieveRecordingSidJson(
    '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
    { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
  );

console.log(texmlGetCallRecordingResponseBody.account_sid);
```

Returns: `account_sid` (string), `call_sid` (string), `channels` (enum: 1, 2), `conference_sid` (uuid), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `error_code` (string | null), `media_url` (uri), `sid` (string), `source` (enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking), `start_time` (date-time), `status` (enum: in-progress, completed, paused, stopped), `subresources_uris` (object), `uri` (string)

## Delete recording resource

Deletes recording resource identified by recording id.

`DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

```javascript
await client.texml.accounts.recordings.json.deleteRecordingSidJson(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
);
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`GET /texml/Accounts/{account_sid}/Transcriptions.json`

```javascript
const response = await client.texml.accounts.retrieveTranscriptionsJson('account_sid');

console.log(response.end);
```

Returns: `end` (integer), `first_page_uri` (uri), `next_page_uri` (string), `page` (integer), `page_size` (integer), `previous_page_uri` (uri), `start` (integer), `transcriptions` (array[object]), `uri` (string)

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```javascript
const response =
  await client.texml.accounts.transcriptions.json.retrieveRecordingTranscriptionSidJson(
    '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
    { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
  );

console.log(response.account_sid);
```

Returns: `account_sid` (string), `api_version` (string), `call_sid` (string), `date_created` (date-time), `date_updated` (date-time), `duration` (string | null), `recording_sid` (string), `sid` (string), `status` (enum: in-progress, completed), `transcription_text` (string), `uri` (string)

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

```javascript
await client.texml.accounts.transcriptions.json.deleteRecordingTranscriptionSidJson(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { account_sid: '550e8400-e29b-41d4-a716-446655440000' },
);
```

## Initiate an outbound AI call

Initiate an outbound AI call with warm-up support: Telnyx attempts to warm up the assistant identified by `AIAssistantId` before placing the call and starts it automatically when the called party answers.

`POST /texml/ai_calls/{connection_id}` — Required: `From`, `To`, `AIAssistantId`

Optional: `AIAssistantDynamicVariables` (object), `AIAssistantVersion` (string), `AsyncAmd` (boolean), `AsyncAmdStatusCallback` (string), `AsyncAmdStatusCallbackMethod` (enum: GET, POST), `CallerId` (string), `ConversationCallback` (string), `ConversationCallbackMethod` (enum: GET, POST), `ConversationCallbacks` (array[string]), `CustomHeaders` (array[object]), `DetectionMode` (enum: Premium, Regular, PremiumCallScreening), `MachineDetection` (enum: Enable, Disable, DetectMessageEnd), `MachineDetectionBeepMaxFrequency` (int32), `MachineDetectionBeepMinFrequency` (int32), `MachineDetectionBeepMinToneDuration` (int32), `MachineDetectionBeepProfile` (enum: both, freq_only), `MachineDetectionBeepSpectralConfirmation` (boolean), `MachineDetectionBeepSpectralMinPurity` (number), `MachineDetectionBeepSpectralRejectFaxCng` (boolean), `MachineDetectionBeepSpectralWindow` (int32), `MachineDetectionPromptEndTimeout` (integer), `MachineDetectionSilenceTimeout` (integer), `MachineDetectionSpeechEndThreshold` (integer), `MachineDetectionSpeechThreshold` (integer), `MachineDetectionTimeout` (integer), `Passports` (string), `PreferredCodecs` (string), `Record` (boolean), `RecordingChannels` (enum: mono, dual), `RecordingStatusCallback` (string), `RecordingStatusCallbackEvent` (string), `RecordingStatusCallbackMethod` (enum: GET, POST), `RecordingTimeout` (integer), `RecordingTrack` (enum: inbound, outbound, both), `SendRecordingUrl` (boolean), `SipAuthPassword` (string), `SipAuthUsername` (string), `SipRegion` (enum: US, Europe, Canada, Australia, Middle East), `StatusCallback` (string), `StatusCallbackEvent` (string), `StatusCallbackMethod` (enum: GET, POST), `StatusCallbacks` (array[string]), `TimeLimit` (integer), `Timeout` (integer), `Trim` (enum: trim-silence, do-not-trim)

```javascript
const response = await client.texml.initiateAICall('connection_id', {
  AIAssistantId: 'ai-assistant-id-123',
  From: '+13120001234',
  To: '+13121230000',
});

console.log(response.call_sid);
```

Returns: `call_sid` (string), `from` (string), `status` (string), `to` (string)

## Create a connection-scoped TeXML call

Initiate an outbound TeXML call using a TeXML application connection ID, not an account SID. Request parameter names are case-sensitive. From and To are required; Texml supplies inline instructions and Url overrides the application XML request URL. When neither is supplied, the application configuration supplies the instructions. The response is a flat call object without a data wrapper.

`POST /texml/calls/{connection_id}` — Required: `From`, `To`

Optional: `Method` (enum: GET, POST), `Texml` (string), `Url` (string)

```javascript
const response = await client.texml.calls.create('connection_id', {
  From: '+13120001234',
  To: '+13121230000',
});

console.log(response.call_sid);
```

Returns: `call_sid` (string), `from` (string), `status` (enum: queued), `to` (string)

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML. In your TeXML you will be able to use your secret name, and this name will be replaced by the actual secret value when processing the TeXML on Telnyx side. The secrets are not visible in any logs.

`POST /texml/secrets` — Required: `name`, `value`

```javascript
const response = await client.texml.secrets({ name: 'My Secret Name', value: 'My Secret Value' });

console.log(response.data);
```

Returns: `name` (string), `value` (enum: REDACTED)

## List all TeXML Applications

Returns a list of your TeXML Applications.

`GET /texml_applications`

```javascript
// Automatically fetches more pages as needed.
for await (const texmlApplication of client.texmlApplications.list()) {
  console.log(texmlApplication.id);
}
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Creates a TeXML Application

Creates a TeXML application, which defines the voice URLs and settings used to serve TeXML instructions for calls, and returns the created application.

`POST /texml_applications` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum: get, post)

```javascript
const texmlApplication = await client.texmlApplications.create({
  friendly_name: 'call-router',
  voice_url: 'https://example.com',
});

console.log(texmlApplication.data);
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`GET /texml_applications/{id}`

```javascript
const texmlApplication = await client.texmlApplications.retrieve('1293384261075731499');

console.log(texmlApplication.data);
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`PATCH /texml_applications/{id}` — Required: `friendly_name`, `voice_url`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `inbound` (object), `outbound` (object), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `voice_fallback_url` (uri), `voice_method` (enum: get, post)

```javascript
const texmlApplication = await client.texmlApplications.update('1293384261075731499', {
  friendly_name: 'call-router',
  voice_url: 'https://example.com',
});

console.log(texmlApplication.data);
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)

## Deletes a TeXML Application

Permanently deletes the specified TeXML application from your account.

`DELETE /texml_applications/{id}`

```javascript
const texmlApplication = await client.texmlApplications.delete('1293384261075731499');

console.log(texmlApplication.data);
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `call_cost_in_webhooks` (boolean), `created_at` (string), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `first_command_timeout` (boolean), `first_command_timeout_secs` (integer), `friendly_name` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `status_callback` (uri), `status_callback_method` (enum: get, post), `tags` (array[string]), `updated_at` (string), `voice_fallback_url` (uri), `voice_method` (enum: get, post), `voice_url` (uri)
