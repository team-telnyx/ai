# TeXML Verb Reference

Complete reference for all TeXML verbs and nouns. TeXML is Telnyx's TwiML-compatible XML markup language for voice call control.

## Table of Contents

- [Document Structure](#document-structure)
- [Nesting Rules](#nesting-rules)
- [Verbs](#verbs): Say, Play, Gather, Dial, Record, Hangup, Pause, Redirect, Reject, Refer, Enqueue, Leave, Start, Stop, Connect
- [Nouns](#nouns): Number, Sip, Queue, Conference, Stream, Transcription, Suppression, Siprec
- [Common Patterns](#common-patterns)
- [Telnyx-Only Features](#telnyx-only-features)
- [TwiML Verbs Not Supported](#twiml-verbs-not-supported)

## Document Structure

Every TeXML document is wrapped in a `<Response>` root element. Verbs execute sequentially from top to bottom.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Welcome to Telnyx.</Say>
  <Pause length="1"/>
  <Gather input="dtmf" numDigits="1" action="/handle-input">
    <Say>Press 1 for sales. Press 2 for support.</Say>
  </Gather>
  <Say>We didn't receive any input. Goodbye.</Say>
  <Hangup/>
</Response>
```

## Nesting Rules

```
<Response>
  ├── <Say>                     top-level or inside <Gather>
  ├── <Play>                    top-level or inside <Gather>
  ├── <Gather>                  top-level only
  │     ├── <Say>
  │     └── <Play>
  ├── <Dial>                    top-level only
  │     ├── <Number>
  │     ├── <Sip>
  │     ├── <Queue>
  │     └── <Conference>
  ├── <Record>                  top-level only
  ├── <Hangup>                  top-level only
  ├── <Pause>                   top-level only
  ├── <Redirect>                top-level only (terminal)
  ├── <Reject>                  top-level only (terminal)
  ├── <Refer>                   top-level only
  │     └── <Sip>
  ├── <Enqueue>                 top-level only
  ├── <Leave>                   top-level or in waitUrl context
  ├── <Start>                   top-level only (async)
  │     ├── <Stream>
  │     ├── <Transcription>
  │     ├── <Suppression>
  │     └── <Siprec>
  ├── <Stop>                    top-level only
  │     ├── <Stream>
  │     ├── <Transcription>
  │     ├── <Suppression>
  │     └── <Siprec>
  └── <Connect>                 top-level only (sync)
        └── <Stream>
```

## Verbs

### `<Say>` — Text-to-Speech

Converts text to speech and plays it to the caller.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `voice` | string | `man` | Voice selection. Options: `man`, `woman`, `alice` (multi-language via Polly), `Polly.{VoiceId}`, `Polly.{VoiceId}-Neural`, `ElevenLabs.{ModelId}.{VoiceId}` |

> **Polly voice compatibility:** TeXML supports Amazon Polly voices via `voice="Polly.{VoiceId}"` and `voice="Polly.{VoiceId}-Neural"`. Prefer Neural variants (e.g., `Polly.Amy-Neural` instead of `Polly.Amy`) — non-Neural voices may fall back to the default voice. If a specific Polly voice is unavailable, use `voice="woman"` with the appropriate `language` attribute, or switch to ElevenLabs for higher quality.
| `language` | string | `en-US` | ISO language code. Only applies to `alice` voice. |
| `loop` | integer | `1` | Repetitions (0-10). Set to `0` for infinite loop. |

```xml
<Say voice="Polly.Joanna-Neural">Hello, welcome to our service.</Say>
```

### `<Play>` — Audio Playback

Plays an audio file or DTMF tones.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `loop` | integer | `1` | Repetitions. |
| `mediaStorage` | boolean | `false` | Use Telnyx media storage instead of URL. Body becomes `media_name`. |
| `digits` | string | — | DTMF tones to play. Characters: `0-9`, `*`, `#`, `w` (0.5s pause). |

```xml
<Play>https://example.com/hold-music.mp3</Play>
<Play digits="wwww1928"/>
```

### `<Gather>` — Collect DTMF or Speech Input

Collects touch-tone digits or speech from the caller.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `input` | string | `dtmf` | Input type: `dtmf`, `speech`, or `dtmf speech` |
| `numDigits` | integer | — | Exact number of digits to collect |
| `minDigits` | integer | `1` | Minimum digits (1-128) |
| `maxDigits` | integer | `128` | Maximum digits (1-128) |
| `validDigits` | string | — | Restrict which digits are accepted |
| `finishOnKey` | string | `#` | Key that ends input. Set to empty string to disable. |
| `timeout` | integer | `5` | Seconds to wait between inputs (1-120) |
| `speechTimeout` | integer | — | Seconds to wait after speech ends |
| `action` | URL | — | Callback URL when gathering completes |
| `method` | string | `POST` | HTTP method for action URL |
| `invalidDigitsAction` | URL | — | Callback for invalid input |
| `partialResultCallback` | URL | — | URL for intermediate speech results |
| `partialResultCallbackMethod` | string | `POST` | HTTP method for partial results |
| `transcriptionEngine` | string | — | STT engine: `Google`, `Telnyx`, `Deepgram`, `Azure` |
| `language` | string | `en-US` | Speech recognition language |
| `useEnhanced` | boolean | — | Use enhanced transcription model |
| `hints` | string | — | Speech recognition hints (comma-separated) |
| `profanityFilter` | boolean | — | Filter profanity from results |
| `apiKeyRef` | string | — | Secret name for Azure auth |
| `region` | string | — | Azure region (required when using Azure engine) |

Can contain `<Say>` and `<Play>` as child elements (played while waiting for input).

```xml
<Gather input="dtmf speech" numDigits="1" action="/handle-menu" language="en-US">
  <Say>Press 1 or say sales. Press 2 or say support.</Say>
</Gather>
```

### `<Dial>` — Transfer or Bridge Calls

Connects the current call to another phone number, SIP endpoint, queue, or conference.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `action` | URL | — | Callback when dialed call ends |
| `method` | string | `POST` | HTTP method for action |
| `callerId` | string | — | Caller ID (E.164 format) |
| `fromDisplayName` | string | — | Display name (max 128 chars) |
| `hangupOnStar` | boolean | `false` | Allow caller to hang up leg by pressing `*` |
| `timeout` | integer | `30` | Ring duration in seconds (5-120) |
| `timeLimit` | integer | `14400` | Max call duration in seconds (60-14400) |
| `ringTone` | string | `us` | Country-specific ringback tone (supports 37+ countries) |
| `record` | string | `do-not-record` | Options: `do-not-record`, `record-from-answer`, `record-from-ringing`, `record-from-answer-dual`, `record-from-ringing-dual` |
| `recordingChannels` | string | — | `single` or `dual` |
| `recordMaxLength` | integer | — | Max recording length (0-14400 seconds) |
| `recordingStatusCallback` | URL | — | Recording event webhook |
| `recordingStatusCallbackMethod` | string | `POST` | HTTP method |
| `recordingStatusCallbackEvent` | string | — | Events: `in-progress`, `completed`, `absent` |
| `sendRecordingUrl` | boolean | — | Include recording URL in callback |

Contains `<Number>`, `<Sip>`, `<Queue>`, or `<Conference>` nouns. Multiple `<Number>` or `<Sip>` elements enable simultaneous dialing (first to answer wins).

```xml
<Dial callerId="+15551234567" timeout="30" record="record-from-answer-dual">
  <Number>+15559876543</Number>
</Dial>
```

### `<Record>` — Record Audio

Records audio from the caller.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `action` | URL | — | Callback when recording ends |
| `method` | string | `POST` | HTTP method for action |
| `finishOnKey` | string | all keys | Key that stops recording (`0-9`, `#`, `*`) |
| `timeout` | integer | `0` | Seconds of silence before stopping (0 = infinite) |
| `maxLength` | integer | `3600` | Max recording length in seconds (0-14400) |
| `playBeep` | boolean | `true` | Play beep before recording |
| `trim` | string | — | `trim-silence` to remove leading/trailing silence |
| `channels` | string | `dual` | `single` or `dual`. **Note: Telnyx defaults to dual, Twilio defaults to single.** |
| `recordingStatusCallback` | URL | — | Recording event webhook |
| `transcription` | boolean | `false` | Enable post-call transcription |
| `transcriptionCallback` | URL | — | Transcription result webhook |
| `transcriptionEngine` | string | — | Transcription engine |

Recording URLs are valid for 10 minutes after the call ends.

```xml
<Say>Please leave a message after the beep.</Say>
<Record maxLength="120" action="/handle-recording" transcription="true"/>
```

### `<Hangup>` — End Call

Ends the current call. No attributes. Self-closing tag.

```xml
<Say>Thank you for calling. Goodbye.</Say>
<Hangup/>
```

### `<Pause>` — Silent Interval

Waits silently for a specified duration.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `length` | integer | `1` | Seconds to pause (1-180) |

```xml
<Say>Please hold.</Say>
<Pause length="3"/>
<Say>Connecting you now.</Say>
```

### `<Redirect>` — Transfer to Another TeXML Document

Transfers call control to a new TeXML document URL. This is a terminal verb.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `method` | string | `POST` | HTTP method (`GET` or `POST`) |

```xml
<Redirect>https://example.com/next-step</Redirect>
```

### `<Reject>` — Reject Incoming Call

Rejects an incoming call without billing. Must be the first verb. Terminal.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `reason` | string | `rejected` | `rejected` (404) or `busy` (486) |

```xml
<Reject reason="busy"/>
```

### `<Refer>` — SIP Transfer

Performs a SIP REFER to transfer the call to another SIP endpoint.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `action` | URL | — | Callback when transfer completes |
| `method` | string | `POST` | HTTP method for action |

Contains a `<Sip>` noun with the target SIP URI.

```xml
<Refer action="/refer-complete">
  <Sip>sip:agent@pbx.example.com</Sip>
</Refer>
```

### `<Enqueue>` — Place Call in Queue

Places the caller into a named queue.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `action` | URL | — | Callback when call leaves queue |
| `method` | string | `POST` | HTTP method for action |
| `waitUrl` | URL | — | TeXML document for hold experience |
| `waitUrlMethod` | string | `POST` | HTTP method for waitUrl |

The `waitUrl` document can use: `<Play>`, `<Say>`, `<Gather>`, `<Pause>`, `<Hangup>`, `<Redirect>`, `<Leave>`.

```xml
<Enqueue waitUrl="/hold-music" action="/queue-complete">support</Enqueue>
```

### `<Leave>` — Exit Queue

Removes the caller from the current queue. Execution continues with the next verb after the original `<Enqueue>`. No attributes.

```xml
<Leave/>
```

### `<Start>` — Start Asynchronous Service

Starts a background service (streaming, transcription, suppression, or SIPREC). Call processing continues immediately with the next verb.

Contains: `<Stream>`, `<Transcription>`, `<Suppression>`, or `<Siprec>`.

```xml
<Start>
  <Transcription transcriptionEngine="Deepgram" transcriptionCallback="/transcripts"/>
</Start>
<Dial>
  <Number>+15559876543</Number>
</Dial>
```

### `<Stop>` — Stop Asynchronous Service

Stops a previously started background service.

Contains: `<Stream>`, `<Transcription>`, `<Suppression>`, or `<Siprec>`. Use the `name` attribute to identify which service to stop.

```xml
<Stop>
  <Transcription/>
</Stop>
```

### `<Connect>` — Start Synchronous Service

Starts a service and waits for it to complete before continuing. Unlike `<Start>`, execution blocks until the service ends.

Contains: `<Stream>`.

```xml
<Connect>
  <Stream url="wss://example.com/audio-processor"/>
</Connect>
<Say>Processing complete.</Say>
```

## Nouns

### `<Number>` — Phone Number (inside `<Dial>`)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `statusCallback` | URL | — | Event webhook for this leg |
| `statusCallbackEvent` | string | — | Events: `initiated`, `ringing`, `answered`, `amd`, `dtmf`, `completed` |
| `statusCallbackMethod` | string | `POST` | HTTP method |
| `url` | URL | — | TeXML document to execute on the dialed party |
| `method` | string | `POST` | HTTP method for url |
| `sendDigits` | string | — | DTMF digits to send after connection |
| `machineDetection` | string | `Disable` | `Enable`, `DetectMessageEnd`, `Disable` |
| `detectionMode` | string | `Regular` | `Regular` or `Premium` |
| `machineDetectionTimeout` | integer | `3500` | Timeout in ms (500-60000) |

```xml
<Dial>
  <Number machineDetection="Enable" sendDigits="wwww1234">+15559876543</Number>
</Dial>
```

### `<Sip>` — SIP Endpoint (inside `<Dial>` or `<Refer>`)

Same attributes as `<Number>` plus:

| Attribute | Type | Default | Description |
|---|---|---|---|
| `username` | string | — | SIP authentication username |
| `password` | string | — | SIP authentication password |

```xml
<Dial>
  <Sip username="agent" password="secret">sip:agent@pbx.example.com</Sip>
</Dial>
```

### `<Queue>` — Named Queue (inside `<Dial>`)

Connects the call to a caller waiting in the named queue.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `url` | URL | — | TeXML document executed on dequeue |
| `method` | string | `POST` | HTTP method for url |

```xml
<Dial>
  <Queue url="/dequeue-handler">support</Queue>
</Dial>
```

### `<Conference>` — Conference Room (inside `<Dial>`)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `muted` | boolean | `false` | Join muted |
| `startConferenceOnEnter` | boolean | `true` | Start conference when this participant joins |
| `endConferenceOnExit` | boolean | `false` | End conference when this participant leaves |
| `maxParticipants` | integer | `250` | Maximum participants (2-250) |
| `beep` | string | `true` | Beep on join/leave: `true`, `false`, `onEnter`, `onExit` |
| `participantLabel` | string | — | Unique label for REST API management |
| `record` | string | `do-not-record` | `do-not-record` or `record-from-start` |
| `recordBeep` | boolean | `true` | Beep when recording starts |
| `recordingTimeout` | integer | `0` | Max recording length (0 = unlimited, max 14400) |
| `trim` | string | `do-not-trim` | `trim-silence` or `do-not-trim` |
| `recordingStatusCallback` | URL | — | Recording event webhook |
| `sendRecordingUrl` | boolean | `true` | Include recording URL in callback |
| `statusCallback` | URL | — | Conference event webhook |
| `statusCallbackEvent` | string | — | Events: `start`, `end`, `join`, `leave`, `speaker` |
| `waitUrl` | URL | — | Hold music/instructions URL |
| `waitMethod` | string | `POST` | HTTP method for waitUrl |

```xml
<Dial>
  <Conference startConferenceOnEnter="true" record="record-from-start"
    statusCallback="/conf-events" statusCallbackEvent="join leave"
    waitUrl="/hold-music">team-standup</Conference>
</Dial>
```

### `<Stream>` — WebSocket Media Streaming (inside `<Start>`, `<Stop>`, `<Connect>`)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `url` | string | **required** | WebSocket endpoint (`wss://`) |
| `track` | string | `inbound_track` | `inbound_track`, `outbound_track`, `both_tracks` |
| `name` | string | — | Identifier for stopping a specific stream |
| `codec` | string | `default` | `PCMU`, `PCMA`, `G722`, `OPUS`, `AMR-WB`, `default` |
| `bidirectionalMode` | string | `mp3` | `mp3` or `rtp` (for bidirectional streams) |
| `bidirectionalCodec` | string | `PCMU` | Codec for return audio |
| `bidirectionalSamplingRate` | string | `8000` | `8000`, `16000`, `24000` |
| `statusCallback` | URL | — | Events: `stream-started`, `stream-stopped`, `stream-failed` |

```xml
<Start>
  <Stream url="wss://example.com/audio" track="both_tracks" name="my-stream"/>
</Start>
```

### `<Transcription>` — Real-Time Speech-to-Text (inside `<Start>`, `<Stop>`)

**Telnyx-only.** No TwiML equivalent.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `language` | string | `en` | Transcription language |
| `interimResults` | boolean | `false` | Send partial results (Google engine only) |
| `transcriptionEngine` | string | `Google` | Engine: `Google`, `Telnyx`, `Deepgram`, `Azure` |
| `transcriptionTracks` | string | `inbound` | `inbound`, `outbound`, `both` |
| `transcriptionCallback` | URL | **required** | Webhook for transcription results |
| `transcriptionCallbackMethod` | string | `POST` | HTTP method |
| `model` | string | — | Engine-specific model (e.g., `deepgram/nova-3`, `openai/whisper-large-v3-turbo`) |
| `apiKeyRef` | string | — | Secret name for Azure authentication |
| `region` | string | — | Azure region (required for Azure engine) |

```xml
<Start>
  <Transcription transcriptionEngine="Deepgram" model="deepgram/nova-3"
    transcriptionCallback="/transcripts" transcriptionTracks="both"/>
</Start>
```

### `<Suppression>` — Audio Suppression (inside `<Start>`, `<Stop>`)

**Telnyx-only.** Suppresses audio on a call leg.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `inbound` | `inbound`, `outbound`, `both` |

```xml
<Start>
  <Suppression direction="inbound"/>
</Start>
```

### `<Siprec>` — SIPREC Session (inside `<Start>`, `<Stop>`)

**Telnyx-only.** Starts a SIPREC recording session to an external recorder.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `connectorName` | string | **required** | SIPREC connector name configured in Mission Control |
| `statusCallback` | URL | — | Session event webhook |
| `statusCallbackMethod` | string | `POST` | HTTP method |
| `track` | string | `both_tracks` | `inbound_track`, `outbound_track`, `both_tracks` |
| `name` | string | — | Session identifier for stopping |
| `secure` | boolean | `false` | Use SRTP/TLS |
| `sessionTimeoutSecs` | integer | `1800` | Session timeout (90-14440 seconds) |

```xml
<Start>
  <Siprec connectorName="my-recorder" track="both_tracks" name="session-1"/>
</Start>
```

## Common Patterns

### IVR Menu with Speech and DTMF

```xml
<Response>
  <Gather input="dtmf speech" numDigits="1" action="/handle-menu"
    timeout="5" language="en-US" hints="sales,support,billing">
    <Say voice="Polly.Joanna-Neural">
      Welcome to Acme Corp. Press 1 or say sales.
      Press 2 or say support. Press 3 or say billing.
    </Say>
  </Gather>
  <Say>Sorry, we didn't get your input.</Say>
  <Redirect>/retry-menu</Redirect>
</Response>
```

### Call Recording with Transcription

```xml
<Response>
  <Say>This call may be recorded for quality purposes.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="/recording-events">
    <Number>+15559876543</Number>
  </Dial>
</Response>
```

### Conference with Hold Music

```xml
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="false"
      waitUrl="/hold-music" record="record-from-start"
      maxParticipants="50">team-meeting</Conference>
  </Dial>
</Response>
```

### Real-Time Transcription + Bridged Call

```xml
<Response>
  <Start>
    <Transcription transcriptionEngine="Deepgram" model="deepgram/nova-3"
      transcriptionCallback="/live-transcript" transcriptionTracks="both"/>
  </Start>
  <Dial>
    <Number>+15559876543</Number>
  </Dial>
</Response>
```

### WebSocket Media Streaming (Bidirectional)

```xml
<Response>
  <Connect>
    <Stream url="wss://ai.example.com/voice-bot" track="both_tracks"
      bidirectionalMode="rtp" bidirectionalCodec="PCMU"/>
  </Connect>
  <Say>The AI assistant has ended the conversation. Goodbye.</Say>
  <Hangup/>
</Response>
```

### Simultaneous Dial (Ring Multiple Numbers)

```xml
<Response>
  <Dial timeout="20" callerId="+15551234567">
    <Number>+15559876543</Number>
    <Number>+15558765432</Number>
    <Number>+15557654321</Number>
  </Dial>
  <Say>No one was available. Please try again later.</Say>
  <Hangup/>
</Response>
```

## Telnyx-Only Features

These capabilities exist in TeXML but have no TwiML equivalent:

| Feature | How to Use |
|---|---|
| Real-time transcription | `<Transcription>` noun inside `<Start>` / `<Stop>` |
| Audio suppression | `<Suppression>` noun inside `<Start>` / `<Stop>` |
| SIPREC integration | `<Siprec>` noun inside `<Start>` / `<Stop>` |
| Multiple STT engines in `<Gather>` | `transcriptionEngine` attribute: Google, Telnyx, Deepgram, Azure |
| ElevenLabs voices in `<Say>` | `voice="ElevenLabs.{ModelId}.{VoiceId}"` |
| Bidirectional WebSocket streaming | `bidirectionalMode` and `bidirectionalCodec` on `<Stream>` |
| Country-specific ringback tones | `ringTone` attribute on `<Dial>` (37+ countries) |
| Synchronous streaming | `<Connect>` verb (blocks until stream ends) |
| Telnyx media storage | `mediaStorage="true"` on `<Play>` |

## TwiML Verbs Not Supported

| TwiML Verb | TeXML Status | Alternative |
|---|---|---|
| `<Pay>` | Not supported | No equivalent. Handle payments outside the call flow. |
