<!-- SDK reference: telnyx-texml-go -->

# Telnyx Texml - Go

## Core Workflow

### Prerequisites

1. Buy a phone number with voice capability (see telnyx-numbers-go)
2. Create a TeXML Application with primary webhook URL (where Telnyx fetches XML instructions)
3. Host TeXML XML instructions at an accessible URL (TeXML Bin or any public URL)
4. Assign the phone number to the TeXML Application

### Steps

1. **Create TeXML app**: `client.TexmlApplications.Create(ctx, params)`
2. **Author XML instructions**: `<Response><Say>Hello!</Say><Hangup/></Response>`
3. **Assign number**: `client.PhoneNumbers.Update(ctx, params)`
4. **Handle inbound calls**: `Telnyx fetches XML from your webhook URL`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Declarative XML call flows, Twilio/TwiML migration | TeXML (this skill) |
| Programmatic event-driven call control | Call Control API (see telnyx-voice-go) |
| LLM-powered voice agents | AI Assistants (see telnyx-ai-assistants-go) |

### Common mistakes

- ALWAYS end XML flows with <Hangup/> — omitting it causes dead silence with no termination
- ALWAYS configure a failover webhook URL — if primary is unreachable, call drops immediately
- NEVER use unreachable webhook URLs — TeXML fetches instructions from the URL on every call

**Related skills**: telnyx-voice-go, telnyx-ai-assistants-go, telnyx-numbers-go

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.TexmlApplications.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Creates a TeXML Application

Creates a TeXML Application.

`client.TexmlApplications.New()` — `POST /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `FriendlyName` | string | Yes | A user-assigned name to help manage the application. |
| `VoiceUrl` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `Tags` | array[string] | No | Tags associated with the Texml Application. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in the API Details section below |

```go
	texmlApplication, err := client.TexmlApplications.New(context.Background(), telnyx.TexmlApplicationNewParams{
		FriendlyName: "call-router",
		VoiceURL:     "https://example.com",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Initiate an outbound call

Initiate an outbound TeXML call. Telnyx will request TeXML from the XML Request URL configured for the connection in the Mission Control Portal.

`client.Texml.Accounts.Calls.Calls()` — `POST /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ApplicationSid` | string | Yes | The ID of the TeXML Application. |
| `To` | string (E.164) | Yes | The phone number of the called party. |
| `From` | string (E.164) | Yes | The phone number of the party that initiated the call. |
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `UrlMethod` | enum (GET, POST) | No | HTTP request type used for `Url`. |
| `StatusCallbackMethod` | enum (GET, POST) | No | HTTP request type used for `StatusCallback`. |
| `StatusCallbackEvent` | enum (initiated, ringing, answered, completed) | No | The call events for which Telnyx should send a webhook. |
| ... | | | +34 optional params in the API Details section below |

```go
	response, err := client.Texml.Accounts.Calls.Calls(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountCallCallsParams{
			ApplicationSid: "example-app-sid",
			From:           "+13120001234",
			To:             "+13121230000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.From)
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## Fetch a call

Returns an individual call identified by its CallSid. This endpoint is eventually consistent.

`client.Texml.Accounts.Calls.Get()` — `GET /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```go
	call, err := client.Texml.Accounts.Calls.Get(
		context.Background(),
		"call_sid",
		telnyx.TexmlAccountCallGetParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", call.AccountSid)
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## Update call

Update TeXML call. Please note that the keys present in the payload MUST BE formatted in CamelCase as specified in the example.

`client.Texml.Accounts.Calls.Update()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```go
	call, err := client.Texml.Accounts.Calls.Update(
		context.Background(),
		"call_sid",
		telnyx.TexmlAccountCallUpdateParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			UpdateCall: telnyx.UpdateCallParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", call.AccountSid)
```

Key response fields: `response.data.status, response.data.to, response.data.from`

## List conference resources

Lists conference resources.

`client.Texml.Accounts.Conferences.GetConferences()` — `GET /texml/Accounts/{account_sid}/Conferences`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (init, in-progress, completed) | No | Filters conferences by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| ... | | | +4 optional params in the API Details section below |

```go
	response, err := client.Texml.Accounts.Conferences.GetConferences(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountConferenceGetConferencesParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Conferences)
```

Key response fields: `response.data.conferences, response.data.end, response.data.first_page_uri`

## Fetch multiple call resources

Returns multiple call resources for an account. This endpoint is eventually consistent.

`client.Texml.Accounts.Calls.GetCalls()` — `GET /texml/Accounts/{account_sid}/Calls`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Status` | enum (canceled, completed, failed, busy, no-answer) | No | Filters calls by status. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| ... | | | +9 optional params in the API Details section below |

```go
	response, err := client.Texml.Accounts.Calls.GetCalls(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountCallGetCallsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Calls)
```

Key response fields: `response.data.calls, response.data.end, response.data.first_page_uri`

## Fetch recordings for a call

Returns recordings for a call identified by call_sid.

`client.Texml.Accounts.Calls.RecordingsJson.GetRecordingsJson()` — `GET /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```go
	response, err := client.Texml.Accounts.Calls.RecordingsJson.GetRecordingsJson(
		context.Background(),
		"call_sid",
		telnyx.TexmlAccountCallRecordingsJsonGetRecordingsJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.End)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Request recording for a call

Starts recording with specified parameters for call identified by call_sid.

`client.Texml.Accounts.Calls.RecordingsJson.RecordingsJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```go
	response, err := client.Texml.Accounts.Calls.RecordingsJson.RecordingsJson(
		context.Background(),
		"call_sid",
		telnyx.TexmlAccountCallRecordingsJsonRecordingsJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.account_sid, response.data.call_sid, response.data.channels`

## Update recording on a call

Updates recording resource for particular call.

`client.Texml.Accounts.Calls.Recordings.RecordingSidJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `RecordingSid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```go
	response, err := client.Texml.Accounts.Calls.Recordings.RecordingSidJson(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountCallRecordingRecordingSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			CallSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.account_sid, response.data.call_sid, response.data.channels`

## Request siprec session for a call

Starts siprec session with specified parameters for call identified by call_sid.

`client.Texml.Accounts.Calls.SiprecJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```go
	response, err := client.Texml.Accounts.Calls.SiprecJson(
		context.Background(),
		"call_sid",
		telnyx.TexmlAccountCallSiprecJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Updates siprec session for a call

Updates siprec session identified by siprec_sid.

`client.Texml.Accounts.Calls.Siprec.SiprecSidJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Siprec/{siprec_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `SiprecSid` | string (UUID) | Yes | The SiprecSid that uniquely identifies the Sip Recording. |

```go
	response, err := client.Texml.Accounts.Calls.Siprec.SiprecSidJson(
		context.Background(),
		"siprec_sid",
		telnyx.TexmlAccountCallSiprecSiprecSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			CallSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Start streaming media from a call.

Starts streaming media from a call to a specific WebSocket address.

`client.Texml.Accounts.Calls.StreamsJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |

```go
	response, err := client.Texml.Accounts.Calls.StreamsJson(
		context.Background(),
		"call_sid",
		telnyx.TexmlAccountCallStreamsJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.status, response.data.name, response.data.account_sid`

## Update streaming on a call

Updates streaming resource for particular call.

`client.Texml.Accounts.Calls.Streams.StreamingSidJson()` — `POST /texml/Accounts/{account_sid}/Calls/{call_sid}/Streams/{streaming_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `CallSid` | string (UUID) | Yes | The CallSid that identifies the call to update. |
| `StreamingSid` | string (UUID) | Yes | Uniquely identifies the streaming by id. |

```go
	response, err := client.Texml.Accounts.Calls.Streams.StreamingSidJson(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountCallStreamStreamingSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			CallSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Fetch a conference resource

Returns a conference resource.

`client.Texml.Accounts.Conferences.Get()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```go
	conference, err := client.Texml.Accounts.Conferences.Get(
		context.Background(),
		"conference_sid",
		telnyx.TexmlAccountConferenceGetParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conference.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Update a conference resource

Updates a conference resource.

`client.Texml.Accounts.Conferences.Update()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```go
	conference, err := client.Texml.Accounts.Conferences.Update(
		context.Background(),
		"conference_sid",
		telnyx.TexmlAccountConferenceUpdateParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", conference.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## List conference participants

Lists conference participants

`client.Texml.Accounts.Conferences.Participants.GetParticipants()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```go
	response, err := client.Texml.Accounts.Conferences.Participants.GetParticipants(
		context.Background(),
		"conference_sid",
		telnyx.TexmlAccountConferenceParticipantGetParticipantsParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.End)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Dial a new conference participant

Dials a new conference participant

`client.Texml.Accounts.Conferences.Participants.Participants()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```go
	response, err := client.Texml.Accounts.Conferences.Participants.Participants(
		context.Background(),
		"conference_sid",
		telnyx.TexmlAccountConferenceParticipantParticipantsParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.call_sid`

## Get conference participant resource

Gets conference participant resource

`client.Texml.Accounts.Conferences.Participants.Get()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `CallSidOrParticipantLabel` | string | Yes | CallSid or Label of the Participant to update. |

```go
	participant, err := client.Texml.Accounts.Conferences.Participants.Get(
		context.Background(),
		"call_sid_or_participant_label",
		telnyx.TexmlAccountConferenceParticipantGetParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			ConferenceSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", participant.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Update a conference participant

Updates a conference participant

`client.Texml.Accounts.Conferences.Participants.Update()` — `POST /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `CallSidOrParticipantLabel` | string | Yes | CallSid or Label of the Participant to update. |

```go
	participant, err := client.Texml.Accounts.Conferences.Participants.Update(
		context.Background(),
		"call_sid_or_participant_label",
		telnyx.TexmlAccountConferenceParticipantUpdateParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			ConferenceSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", participant.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Delete a conference participant

Deletes a conference participant

`client.Texml.Accounts.Conferences.Participants.Delete()` — `DELETE /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Participants/{call_sid_or_participant_label}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |
| `CallSidOrParticipantLabel` | string | Yes | CallSid or Label of the Participant to update. |

```go
	err := client.Texml.Accounts.Conferences.Participants.Delete(
		context.Background(),
		"call_sid_or_participant_label",
		telnyx.TexmlAccountConferenceParticipantDeleteParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
			ConferenceSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List conference recordings

Lists conference recordings

`client.Texml.Accounts.Conferences.GetRecordings()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```go
	response, err := client.Texml.Accounts.Conferences.GetRecordings(
		context.Background(),
		"conference_sid",
		telnyx.TexmlAccountConferenceGetRecordingsParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.End)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch recordings for a conference

Returns recordings for a conference identified by conference_sid.

`client.Texml.Accounts.Conferences.GetRecordingsJson()` — `GET /texml/Accounts/{account_sid}/Conferences/{conference_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `ConferenceSid` | string (UUID) | Yes | The ConferenceSid that uniquely identifies a conference. |

```go
	response, err := client.Texml.Accounts.Conferences.GetRecordingsJson(
		context.Background(),
		"conference_sid",
		telnyx.TexmlAccountConferenceGetRecordingsJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.End)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## List queue resources

Lists queue resources.

`client.Texml.Accounts.Queues.List()` — `GET /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| `PageToken` | string | No | Used to request the next page of results. |
| ... | | | +2 optional params in the API Details section below |

```go
	page, err := client.Texml.Accounts.Queues.List(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountQueueListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Create a new queue

Creates a new queue resource.

`client.Texml.Accounts.Queues.New()` — `POST /texml/Accounts/{account_sid}/Queues`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |

```go
	queue, err := client.Texml.Accounts.Queues.New(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountQueueNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", queue.AccountSid)
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Fetch a queue resource

Returns a queue resource.

`client.Texml.Accounts.Queues.Get()` — `GET /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `QueueSid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```go
	queue, err := client.Texml.Accounts.Queues.Get(
		context.Background(),
		"queue_sid",
		telnyx.TexmlAccountQueueGetParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", queue.AccountSid)
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Update a queue resource

Updates a queue resource.

`client.Texml.Accounts.Queues.Update()` — `POST /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `QueueSid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```go
	queue, err := client.Texml.Accounts.Queues.Update(
		context.Background(),
		"queue_sid",
		telnyx.TexmlAccountQueueUpdateParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", queue.AccountSid)
```

Key response fields: `response.data.account_sid, response.data.average_wait_time, response.data.current_size`

## Delete a queue resource

Delete a queue resource.

`client.Texml.Accounts.Queues.Delete()` — `DELETE /texml/Accounts/{account_sid}/Queues/{queue_sid}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `QueueSid` | string (UUID) | Yes | The QueueSid that identifies the call queue. |

```go
	err := client.Texml.Accounts.Queues.Delete(
		context.Background(),
		"queue_sid",
		telnyx.TexmlAccountQueueDeleteParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Fetch multiple recording resources

Returns multiple recording resources for an account.

`client.Texml.Accounts.GetRecordingsJson()` — `GET /texml/Accounts/{account_sid}/Recordings.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `Page` | integer | No | The number of the page to be displayed, zero-indexed, should... |
| `PageSize` | integer | No | The number of records to be displayed on a page |
| `DateCreated` | string (date-time) | No | Filters recording by the creation date. |

```go
	response, err := client.Texml.Accounts.GetRecordingsJson(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountGetRecordingsJsonParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.End)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch recording resource

Returns recording resource identified by recording id.

`client.Texml.Accounts.Recordings.Json.GetRecordingSidJson()` — `GET /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `RecordingSid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```go
	texmlGetCallRecordingResponseBody, err := client.Texml.Accounts.Recordings.Json.GetRecordingSidJson(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountRecordingJsonGetRecordingSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", texmlGetCallRecordingResponseBody.AccountSid)
```

Key response fields: `response.data.status, response.data.media_url, response.data.account_sid`

## Delete recording resource

Deletes recording resource identified by recording id.

`client.Texml.Accounts.Recordings.Json.DeleteRecordingSidJson()` — `DELETE /texml/Accounts/{account_sid}/Recordings/{recording_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `RecordingSid` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```go
	err := client.Texml.Accounts.Recordings.Json.DeleteRecordingSidJson(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountRecordingJsonDeleteRecordingSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List recording transcriptions

Returns multiple recording transcription resources for an account.

`client.Texml.Accounts.GetTranscriptionsJson()` — `GET /texml/Accounts/{account_sid}/Transcriptions.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `PageToken` | string | No | Used to request the next page of results. |
| `PageSize` | integer | No | The number of records to be displayed on a page |

```go
	response, err := client.Texml.Accounts.GetTranscriptionsJson(
		context.Background(),
		"account_sid",
		telnyx.TexmlAccountGetTranscriptionsJsonParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.End)
```

Key response fields: `response.data.end, response.data.first_page_uri, response.data.next_page_uri`

## Fetch a recording transcription resource

Returns the recording transcription resource identified by its ID.

`client.Texml.Accounts.Transcriptions.Json.GetRecordingTranscriptionSidJson()` — `GET /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `RecordingTranscriptionSid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```go
	response, err := client.Texml.Accounts.Transcriptions.Json.GetRecordingTranscriptionSidJson(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountTranscriptionJsonGetRecordingTranscriptionSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccountSid)
```

Key response fields: `response.data.status, response.data.account_sid, response.data.api_version`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.Texml.Accounts.Transcriptions.Json.DeleteRecordingTranscriptionSidJson()` — `DELETE /texml/Accounts/{account_sid}/Transcriptions/{recording_transcription_sid}.json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccountSid` | string (UUID) | Yes | The id of the account the resource belongs to. |
| `RecordingTranscriptionSid` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```go
	err := client.Texml.Accounts.Transcriptions.Json.DeleteRecordingTranscriptionSidJson(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.TexmlAccountTranscriptionJsonDeleteRecordingTranscriptionSidJsonParams{
			AccountSid: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## Create a TeXML secret

Create a TeXML secret which can be later used as a Dynamic Parameter for TeXML when using Mustache Templates in your TeXML. In your TeXML you will be able to use your secret name, and this name will be replaced by the actual secret value when processing the TeXML on Telnyx side. The secrets are not visible in any logs.

`client.Texml.Secrets()` — `POST /texml/secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | Name used as a reference for the secret, if the name already... |
| `Value` | string | Yes | Secret value which will be used when rendering the TeXML tem... |

```go
	response, err := client.Texml.Secrets(context.Background(), telnyx.TexmlSecretsParams{
		Name:  "My Secret Name",
		Value: "My Secret Value",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.name, response.data.value`

## List all TeXML Applications

Returns a list of your TeXML Applications.

`client.TexmlApplications.List()` — `GET /texml_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, friendly_name, active) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.TexmlApplications.List(context.Background(), telnyx.TexmlApplicationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a TeXML Application

Retrieves the details of an existing TeXML Application.

`client.TexmlApplications.Get()` — `GET /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	texmlApplication, err := client.TexmlApplications.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a TeXML Application

Updates settings of an existing TeXML Application.

`client.TexmlApplications.Update()` — `PATCH /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `FriendlyName` | string | Yes | A user-assigned name to help manage the application. |
| `VoiceUrl` | string (URL) | Yes | URL to which Telnyx will deliver your XML Translator webhook... |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | Tags associated with the Texml Application. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | No | Sets the type of DTMF digits sent from Telnyx to this Connec... |
| ... | | | +10 optional params in the API Details section below |

```go
	texmlApplication, err := client.TexmlApplications.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.TexmlApplicationUpdateParams{
			FriendlyName: "call-router",
			VoiceURL:     "https://example.com",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes a TeXML Application

Deletes a TeXML Application.

`client.TexmlApplications.Delete()` — `DELETE /texml_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	texmlApplication, err := client.TexmlApplications.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", texmlApplication.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

# TeXML (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Fetch multiple call resources

| Field | Type |
|-------|------|
| `calls` | array[object] |
| `end` | integer |
| `first_page_uri` | string |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `start` | integer |
| `uri` | string |

**Returned by:** Initiate an outbound call

| Field | Type |
|-------|------|
| `from` | string |
| `status` | string |
| `to` | string |

**Returned by:** Fetch a call, Update call

| Field | Type |
|-------|------|
| `account_sid` | string |
| `answered_by` | enum: human, machine, not_sure |
| `caller_name` | string |
| `date_created` | string |
| `date_updated` | string |
| `direction` | enum: inbound, outbound |
| `duration` | string |
| `end_time` | string |
| `from` | string |
| `from_formatted` | string |
| `price` | string |
| `price_unit` | string |
| `sid` | string |
| `start_time` | string |
| `status` | enum: ringing, in-progress, canceled, completed, failed, busy, no-answer |
| `to` | string |
| `to_formatted` | string |
| `uri` | string |

**Returned by:** Fetch recordings for a call, Fetch recordings for a conference, Fetch multiple recording resources

| Field | Type |
|-------|------|
| `end` | integer |
| `first_page_uri` | uri |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `previous_page_uri` | uri |
| `recordings` | array[object] |
| `start` | integer |
| `uri` | string |

**Returned by:** Request recording for a call, Update recording on a call

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `channels` | enum: 1, 2 |
| `conference_sid` | uuid |
| `date_created` | date-time |
| `date_updated` | date-time |
| `duration` | string \| null |
| `error_code` | string \| null |
| `price` | string \| null |
| `price_unit` | string \| null |
| `sid` | string |
| `source` | enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking |
| `start_time` | date-time |
| `track` | enum: inbound, outbound, both |
| `uri` | string |

**Returned by:** Request siprec session for a call

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `date_created` | string |
| `date_updated` | string |
| `error_code` | string |
| `sid` | string |
| `start_time` | string |
| `status` | enum: in-progress, stopped |
| `track` | enum: both_tracks, inbound_track, outbound_track |
| `uri` | string |

**Returned by:** Updates siprec session for a call

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `date_updated` | string |
| `error_code` | string |
| `sid` | string |
| `status` | enum: in-progress, stopped |
| `uri` | string |

**Returned by:** Start streaming media from a call.

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `date_updated` | date-time |
| `name` | string |
| `sid` | string |
| `status` | enum: in-progress |
| `uri` | string |

**Returned by:** Update streaming on a call

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `date_updated` | date-time |
| `sid` | string |
| `status` | enum: stopped |
| `uri` | string |

**Returned by:** List conference resources

| Field | Type |
|-------|------|
| `conferences` | array[object] |
| `end` | integer |
| `first_page_uri` | string |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `start` | integer |
| `uri` | string |

**Returned by:** Fetch a conference resource, Update a conference resource

| Field | Type |
|-------|------|
| `account_sid` | string |
| `api_version` | string |
| `call_sid_ending_conference` | string |
| `date_created` | string |
| `date_updated` | string |
| `friendly_name` | string |
| `reason_conference_ended` | enum: participant-with-end-conference-on-exit-left, last-participant-left, conference-ended-via-api, time-exceeded |
| `region` | string |
| `sid` | string |
| `status` | enum: init, in-progress, completed |
| `subresource_uris` | object |
| `uri` | string |

**Returned by:** List conference participants

| Field | Type |
|-------|------|
| `end` | integer |
| `first_page_uri` | string |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `participants` | array[object] |
| `start` | integer |
| `uri` | string |

**Returned by:** Dial a new conference participant

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `coaching` | boolean |
| `coaching_call_sid` | string |
| `conference_sid` | uuid |
| `end_conference_on_exit` | boolean |
| `hold` | boolean |
| `muted` | boolean |
| `status` | enum: connecting, connected, completed |
| `uri` | string |

**Returned by:** Get conference participant resource, Update a conference participant

| Field | Type |
|-------|------|
| `account_sid` | string |
| `api_version` | string |
| `call_sid` | string |
| `call_sid_legacy` | string |
| `coaching` | boolean |
| `coaching_call_sid` | string |
| `coaching_call_sid_legacy` | string |
| `conference_sid` | uuid |
| `date_created` | string |
| `date_updated` | string |
| `end_conference_on_exit` | boolean |
| `hold` | boolean |
| `muted` | boolean |
| `status` | enum: connecting, connected, completed |
| `uri` | string |

**Returned by:** List conference recordings

| Field | Type |
|-------|------|
| `end` | integer |
| `first_page_uri` | string |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `participants` | array[object] |
| `recordings` | array[object] |
| `start` | integer |
| `uri` | string |

**Returned by:** List queue resources

| Field | Type |
|-------|------|
| `end` | integer |
| `first_page_uri` | string |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `queues` | array[object] |
| `start` | integer |
| `uri` | string |

**Returned by:** Create a new queue, Fetch a queue resource, Update a queue resource

| Field | Type |
|-------|------|
| `account_sid` | string |
| `average_wait_time` | integer |
| `current_size` | integer |
| `date_created` | string |
| `date_updated` | string |
| `max_size` | integer |
| `sid` | string |
| `subresource_uris` | object |
| `uri` | string |

**Returned by:** Fetch recording resource

| Field | Type |
|-------|------|
| `account_sid` | string |
| `call_sid` | string |
| `channels` | enum: 1, 2 |
| `conference_sid` | uuid |
| `date_created` | date-time |
| `date_updated` | date-time |
| `duration` | string \| null |
| `error_code` | string \| null |
| `media_url` | uri |
| `sid` | string |
| `source` | enum: StartCallRecordingAPI, StartConferenceRecordingAPI, OutboundAPI, DialVerb, Conference, RecordVerb, Trunking |
| `start_time` | date-time |
| `status` | enum: in-progress, completed, paused, stopped |
| `subresources_uris` | object |
| `uri` | string |

**Returned by:** List recording transcriptions

| Field | Type |
|-------|------|
| `end` | integer |
| `first_page_uri` | uri |
| `next_page_uri` | string |
| `page` | integer |
| `page_size` | integer |
| `previous_page_uri` | uri |
| `start` | integer |
| `transcriptions` | array[object] |
| `uri` | string |

**Returned by:** Fetch a recording transcription resource

| Field | Type |
|-------|------|
| `account_sid` | string |
| `api_version` | string |
| `call_sid` | string |
| `date_created` | date-time |
| `date_updated` | date-time |
| `duration` | string \| null |
| `recording_sid` | string |
| `sid` | string |
| `status` | enum: in-progress, completed |
| `transcription_text` | string |
| `uri` | string |

**Returned by:** Create a TeXML secret

| Field | Type |
|-------|------|
| `name` | string |
| `value` | enum: REDACTED |

**Returned by:** List all TeXML Applications, Creates a TeXML Application, Retrieve a TeXML Application, Update a TeXML Application, Deletes a TeXML Application

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany |
| `call_cost_in_webhooks` | boolean |
| `created_at` | string |
| `dtmf_type` | enum: RFC 2833, Inband, SIP INFO |
| `first_command_timeout` | boolean |
| `first_command_timeout_secs` | integer |
| `friendly_name` | string |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | string |
| `status_callback` | uri |
| `status_callback_method` | enum: get, post |
| `tags` | array[string] |
| `updated_at` | string |
| `voice_fallback_url` | uri |
| `voice_method` | enum: get, post |
| `voice_url` | uri |

## Optional Parameters

### Initiate an outbound call — `client.Texml.Accounts.Calls.Calls()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CallerId` | string (UUID) | To be used as the caller id name (SIP From Display Name) presented to the des... |
| `Url` | string (URL) | The URL from which Telnyx will retrieve the TeXML call instructions. |
| `UrlMethod` | enum (GET, POST) | HTTP request type used for `Url`. |
| `FallbackUrl` | string | A failover URL for which Telnyx will retrieve the TeXML call instructions if ... |
| `StatusCallback` | string | URL destination for Telnyx to send status callback events to for the call. |
| `StatusCallbackMethod` | enum (GET, POST) | HTTP request type used for `StatusCallback`. |
| `StatusCallbackEvent` | enum (initiated, ringing, answered, completed) | The call events for which Telnyx should send a webhook. |
| `MachineDetection` | enum (Enable, Disable, DetectMessageEnd) | Enables Answering Machine Detection. |
| `DetectionMode` | enum (Premium, Regular) | Allows you to chose between Premium and Standard detections. |
| `AsyncAmd` | boolean | Select whether to perform answering machine detection in the background. |
| `AsyncAmdStatusCallback` | string | URL destination for Telnyx to send AMD callback events to for the call. |
| `AsyncAmdStatusCallbackMethod` | enum (GET, POST) | HTTP request type used for `AsyncAmdStatusCallback`. |
| `MachineDetectionTimeout` | integer | Maximum timeout threshold in milliseconds for overall detection. |
| `MachineDetectionSpeechThreshold` | integer | Maximum threshold of a human greeting. |
| `MachineDetectionSpeechEndThreshold` | integer | Silence duration threshold after a greeting message or voice for it be consid... |
| `MachineDetectionSilenceTimeout` | integer | If initial silence duration is greater than this value, consider it a machine. |
| `CancelPlaybackOnMachineDetection` | boolean | Whether to cancel ongoing playback on `machine` detection. |
| `CancelPlaybackOnDetectMessageEnd` | boolean | Whether to cancel ongoing playback on `greeting ended` detection. |
| `PreferredCodecs` | string | The list of comma-separated codecs to be offered on a call. |
| `Record` | boolean | Whether to record the entire participant's call leg. |
| `RecordingChannels` | enum (mono, dual) | The number of channels in the final recording. |
| `RecordingStatusCallback` | string | The URL the recording callbacks will be sent to. |
| `RecordingStatusCallbackMethod` | enum (GET, POST) | HTTP request type used for `RecordingStatusCallback`. |
| `RecordingStatusCallbackEvent` | string | The changes to the recording's state that should generate a call to `Recoridn... |
| `RecordingTimeout` | integer | The number of seconds that Telnyx will wait for the recording to be stopped i... |
| `RecordingTrack` | enum (inbound, outbound, both) | The audio track to record for the call. |
| `SendRecordingUrl` | boolean | Whether to send RecordingUrl in webhooks. |
| `SipAuthPassword` | string | The password to use for SIP authentication. |
| `SipAuthUsername` | string | The username to use for SIP authentication. |
| `Trim` | enum (trim-silence, do-not-trim) | Whether to trim any leading and trailing silence from the recording. |
| `CustomHeaders` | array[object] | Custom HTTP headers to be sent with the call. |
| `SipRegion` | enum (US, Europe, Canada, Australia, Middle East) | Defines the SIP region to be used for the call. |
| `SuperviseCallSid` | string | The call control ID of the existing call to supervise. |
| `SupervisingRole` | enum (barge, whisper, monitor) | The supervising role for the new leg. |
| `Timeout` | integer | The number of seconds to wait for the called party to answer the call before ... |
| `TimeLimit` | integer | The maximum duration of the call in seconds. |
| `Texml` | string | TeXML to be used as instructions for the call. |

### Creates a TeXML Application — `client.TexmlApplications.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Specifies whether the connection can be used. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `FirstCommandTimeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `FirstCommandTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `Tags` | array[string] | Tags associated with the Texml Application. |
| `VoiceFallbackUrl` | string (URL) | URL to which Telnyx will deliver your XML Translator webhooks if we get an er... |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this TeXML Application. |
| `VoiceMethod` | enum (get, post) | HTTP request method Telnyx will use to interact with your XML Translator webh... |
| `StatusCallback` | string (URL) | URL for Telnyx to send requests to containing information about call progress... |
| `StatusCallbackMethod` | enum (get, post) | HTTP request method Telnyx should use when requesting the status_callback URL. |
| `Inbound` | object |  |
| `Outbound` | object |  |

### Update a TeXML Application — `client.TexmlApplications.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Specifies whether the connection can be used. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `FirstCommandTimeout` | boolean | Specifies whether calls to phone numbers associated with this connection shou... |
| `FirstCommandTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a dial command. |
| `VoiceFallbackUrl` | string (URL) | URL to which Telnyx will deliver your XML Translator webhooks if we get an er... |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this TeXML Application. |
| `VoiceMethod` | enum (get, post) | HTTP request method Telnyx will use to interact with your XML Translator webh... |
| `StatusCallback` | string (URL) | URL for Telnyx to send requests to containing information about call progress... |
| `StatusCallbackMethod` | enum (get, post) | HTTP request method Telnyx should use when requesting the status_callback URL. |
| `Tags` | array[string] | Tags associated with the Texml Application. |
| `Inbound` | object |  |
| `Outbound` | object |  |
