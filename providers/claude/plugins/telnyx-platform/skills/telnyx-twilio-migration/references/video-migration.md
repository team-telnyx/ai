# Video Migration: Twilio Video to Telnyx Video Rooms

Migrate from Twilio Video (retired December 5, 2024) to the Telnyx Video Rooms API.

## Table of Contents

- [Overview](#overview)
- [Key Differences](#key-differences)
- [Concept Mapping](#concept-mapping)
- [Step 1: Create a Video Room](#step-1-create-a-video-room)
- [Step 2: Generate Client Tokens](#step-2-generate-client-tokens)
- [Step 3: Connect Clients via SDK](#step-3-connect-clients-via-sdk)
- [Step 4: Manage Participants](#step-4-manage-participants)
- [Step 5: Recording](#step-5-recording)
- [Room Sessions and Lifecycle](#room-sessions-and-lifecycle)
- [Client SDK Migration](#client-sdk-migration)
- [Compositions](#compositions)
- [API Endpoint Mapping](#api-endpoint-mapping)
- [Common Pitfalls](#common-pitfalls)

## Overview

Twilio retired its Video product on December 5, 2024. If you are migrating from Twilio Video, Telnyx Video Rooms provides a comparable platform for adding real-time audio and video capabilities to web, iOS, and Android applications.

Telnyx Video Rooms consists of:
- **REST API (v2)** for server-side room management, token generation, and recording
- **Client SDKs** (JavaScript, iOS, Android) for browser and mobile integration
- **Compositions API** for combining recordings into a single output

## Key Differences

1. **Twilio Video is retired** — As of December 5, 2024, Twilio Video is no longer available. Telnyx Video Rooms is actively supported.
2. **Room model** — Twilio used Room Types (Group, Peer-to-Peer, Go). Telnyx uses a single room model with configurable `max_participants`.
3. **Token format** — Twilio used Access Tokens (JWT with Video Grant). Telnyx uses Client Join Tokens (JWT) generated via a dedicated API endpoint.
4. **Refresh tokens** — Telnyx provides a Refresh Token alongside the Client Join Token for extending sessions without re-authenticating.
5. **Server-side participant control** — Telnyx provides REST API endpoints to mute, unmute, and kick participants from active sessions.
6. **Webhook signatures** — Twilio used HMAC-SHA1. Telnyx uses Ed25519.

## Concept Mapping

| Twilio Video Concept | Telnyx Equivalent | Notes |
|---|---|---|
| Room | Room | Created via `POST /v2/rooms` |
| Room SID | Room `id` (UUID) | Different ID format |
| Room Type (Group, P2P, Go) | `max_participants` setting | No named types; configure participant limit |
| Room UniqueName | `unique_name` | Same concept |
| Access Token (JWT + Video Grant) | Client Join Token (JWT) | Generated via `POST /v2/rooms/{id}/actions/generate_join_client_token` |
| N/A | Refresh Token | Provided with join token for session extension |
| Participant SID | Participant `id` | Managed via Sessions API |
| Room Session | Room Session | `POST /v2/rooms/{id}/sessions` to manage |
| Composition | Composition | `POST /v2/rooms/compositions` |
| Recording | Recording | Per-room recording management |
| Track (Audio/Video/Data) | Media streams | Managed via Client SDK |
| Room Status Callback | Webhook events on room | Configured via `webhook_event_url` |
| Twilio Video JS SDK | `@telnyx/video` JS SDK | Different API surface |
| Twilio Video iOS SDK | Telnyx Video iOS SDK | See iOS client SDK docs |
| Twilio Video Android SDK | Telnyx Video Android SDK | See Android client SDK docs |

## Step 1: Create a Video Room

### curl

```bash
# Twilio (no longer available)
curl -X POST "https://video.twilio.com/v1/Rooms" \
  -u "$TWILIO_SID:$TWILIO_AUTH_TOKEN" \
  -d "UniqueName=my-meeting" \
  -d "Type=group" \
  -d "MaxParticipants=10" \
  -d "RecordParticipantsOnConnect=true" \
  -d "StatusCallback=https://example.com/video-events"

# Telnyx
curl -X POST https://api.telnyx.com/v2/rooms \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "unique_name": "my-meeting",
    "max_participants": 10,
    "enable_recording": true,
    "webhook_event_url": "https://example.com/video-events"
  }'
```

### Python

```python
# Twilio (no longer available)
from twilio.rest import Client
client = Client(account_sid, auth_token)
room = client.video.rooms.create(
    unique_name="my-meeting",
    type="group",
    max_participants=10,
    record_participants_on_connect=True,
    status_callback="https://example.com/video-events"
)

# Telnyx
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

room = client.rooms.create(
    unique_name="my-meeting",
    max_participants=10,
    enable_recording=True,
    webhook_event_url="https://example.com/video-events"
)
print(room.id)
```

### JavaScript

```javascript
// Twilio (no longer available)
const twilio = require('twilio');
const client = twilio(accountSid, authToken);
const room = await client.video.rooms.create({
  uniqueName: 'my-meeting',
  type: 'group',
  maxParticipants: 10,
  recordParticipantsOnConnect: true,
  statusCallback: 'https://example.com/video-events'
});

// Telnyx
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_TELNYX_API_KEY' });

const room = await client.rooms.create({
  unique_name: 'my-meeting',
  max_participants: 10,
  enable_recording: true,
  webhook_event_url: 'https://example.com/video-events'
});
console.log(room.data.id);
```

**Room creation parameters:**

| Parameter | Description |
|---|---|
| `unique_name` | Human-readable room identifier |
| `max_participants` | Maximum number of concurrent participants |
| `enable_recording` | Enable automatic recording (boolean) |
| `webhook_event_url` | URL for room and participant events |
| `webhook_event_failover_url` | Backup webhook URL |
| `webhook_timeout_secs` | Webhook delivery timeout |

**Room response fields:**

| Field | Description |
|---|---|
| `id` | Room UUID |
| `unique_name` | The name you assigned |
| `max_participants` | Configured limit |
| `enable_recording` | Recording status |
| `video_codecs` | Supported codecs (e.g., `["h264", "vp8"]`) |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

## Step 2: Generate Client Tokens

Clients need a JWT token to join a room. In Twilio, you generated Access Tokens server-side with a Video Grant. In Telnyx, you use a dedicated token generation endpoint.

### curl

```bash
# Twilio (no longer available) — generated server-side with SDK
# Required: AccountSID, API Key SID, API Key Secret, Room Name

# Telnyx
curl -X POST "https://api.telnyx.com/v2/rooms/$ROOM_ID/actions/generate_join_client_token" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token_ttl_secs": 3600,
    "token_ttl_secs": 600
  }'
```

### Python

```python
# Twilio (no longer available)
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
token = AccessToken(account_sid, api_key_sid, api_key_secret, identity="user-1")
token.add_grant(VideoGrant(room="my-meeting"))
jwt_token = token.to_jwt()

# Telnyx
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

token_response = client.rooms.actions.generate_join_client_token(
    room_id,
    refresh_token_ttl_secs=3600,
    token_ttl_secs=600
)
client_token = token_response.data.token
refresh_token = token_response.data.refresh_token
```

### JavaScript

```javascript
// Twilio (no longer available)
const { jwt: { AccessToken } } = require('twilio');
const { VideoGrant } = AccessToken;
const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity: 'user-1' });
token.addGrant(new VideoGrant({ room: 'my-meeting' }));
const jwtToken = token.toJwt();

// Telnyx
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_TELNYX_API_KEY' });

const tokenResponse = await client.rooms.actions.generateJoinClientToken(roomId, {
  refresh_token_ttl_secs: 3600,
  token_ttl_secs: 600
});
const clientToken = tokenResponse.data.token;
const refreshToken = tokenResponse.data.refresh_token;
```

The **Refresh Token** is a Telnyx-specific feature with no Twilio equivalent. Use it to extend a participant's session without generating a new join token from your server.

## Step 3: Connect Clients via SDK

### JavaScript Client

```javascript
// Twilio (no longer available)
import Video from 'twilio-video';
const room = await Video.connect(token, { name: 'my-meeting' });
room.on('participantConnected', participant => {
  console.log(`${participant.identity} joined`);
});

// Telnyx
import { Room } from '@telnyx/video';
const room = new Room(clientToken);
await room.connect();
room.on('participantJoined', (participant) => {
  console.log(`${participant.id} joined`);
});
room.on('participantLeft', (participant) => {
  console.log(`${participant.id} left`);
});
```

**SDK event mapping:**

| Twilio Video JS Event | Telnyx Video JS Event | Notes |
|---|---|---|
| `participantConnected` | `participantJoined` | Different event name |
| `participantDisconnected` | `participantLeft` | Different event name |
| `trackSubscribed` | `trackStarted` | Media track events |
| `trackUnsubscribed` | `trackStopped` | Media track events |
| `disconnected` | `disconnected` | Same event name |
| `reconnecting` | `reconnecting` | Same event name |
| `reconnected` | `reconnected` | Same event name |

## Step 4: Manage Participants

Telnyx provides server-side REST API endpoints for participant management that Twilio offered through its Data Track API or REST API:

### Mute a Participant

```bash
curl -X POST "https://api.telnyx.com/v2/rooms/$ROOM_ID/sessions/$SESSION_ID/participants/$PARTICIPANT_ID/actions/mute" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Unmute a Participant

```bash
curl -X POST "https://api.telnyx.com/v2/rooms/$ROOM_ID/sessions/$SESSION_ID/participants/$PARTICIPANT_ID/actions/unmute" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Kick a Participant

```bash
curl -X POST "https://api.telnyx.com/v2/rooms/$ROOM_ID/sessions/$SESSION_ID/participants/$PARTICIPANT_ID/actions/kick" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Search Participants

```bash
curl -X GET "https://api.telnyx.com/v2/rooms/$ROOM_ID/participants?filter[session_id]=$SESSION_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Step 5: Recording

Telnyx Video supports room-level recording. Enable recording when creating the room or update an existing room.

### List Recordings

```bash
curl -X GET "https://api.telnyx.com/v2/rooms/$ROOM_ID/recordings" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### View a Recording

```bash
curl -X GET "https://api.telnyx.com/v2/rooms/recordings/$RECORDING_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Delete Recordings

```bash
# Bulk delete
curl -X DELETE "https://api.telnyx.com/v2/rooms/recordings" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recording_ids": ["rec_id_1", "rec_id_2"]}'
```

**Recording comparison:**

| Aspect | Twilio Video (was) | Telnyx Video |
|---|---|---|
| Enable recording | `RecordParticipantsOnConnect` | `enable_recording` on room |
| Recording scope | Per-participant tracks | Per-room |
| Storage | Twilio media storage | Telnyx media storage |
| Composition | Compositions API | Compositions API |
| Download | REST API + media URL | REST API + media URL |

## Room Sessions and Lifecycle

A **Room Session** represents a single period of activity in a room. When the first participant joins, a session starts. When the last participant leaves, the session ends. A room can have multiple sessions over its lifetime.

```bash
# List sessions for a room
curl -X GET "https://api.telnyx.com/v2/rooms/$ROOM_ID/sessions" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# View a specific session
curl -X GET "https://api.telnyx.com/v2/rooms/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# End a session (disconnect all participants)
curl -X POST "https://api.telnyx.com/v2/rooms/$ROOM_ID/sessions/$SESSION_ID/actions/end" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Room lifecycle comparison:**

| Twilio | Telnyx |
|---|---|
| Room auto-closes when empty | Session ends when empty; room persists |
| Room has single lifecycle | Room has multiple sessions |
| Complete a room via API | End a session via API |
| Room is a one-time resource | Room is reusable |

## Client SDK Migration

| Twilio SDK | Telnyx SDK | Install |
|---|---|---|
| `twilio-video` (npm) | `@telnyx/video` (npm) | `npm install @telnyx/video` |
| `TwilioVideo` (CocoaPods) | Telnyx Video iOS SDK | See iOS SDK docs |
| `com.twilio:video-android` | Telnyx Video Android SDK | See Android SDK docs |

The JavaScript SDK is the most mature Telnyx Video client SDK. For iOS and Android, consult the Telnyx developer documentation for the latest SDK availability and setup instructions.

## Compositions

Compositions combine individual participant recordings into a single media file. This is useful for archiving meetings or creating shareable recordings.

```bash
# Create a composition
curl -X POST https://api.telnyx.com/v2/rooms/compositions \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "room_session_id": "SESSION_ID",
    "video_layout": "grid"
  }'

# List compositions
curl -X GET "https://api.telnyx.com/v2/rooms/compositions" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## API Endpoint Mapping

| Operation | Twilio Endpoint (was) | Telnyx Endpoint |
|---|---|---|
| Create room | `POST /v1/Rooms` | `POST /v2/rooms` |
| List rooms | `GET /v1/Rooms` | `GET /v2/rooms` |
| Get room | `GET /v1/Rooms/{SID}` | `GET /v2/rooms/{id}` |
| Update room | `POST /v1/Rooms/{SID}` | `PATCH /v2/rooms/{id}` |
| Delete room | N/A | `DELETE /v2/rooms/{id}` |
| Generate token | Server-side SDK (Access Token) | `POST /v2/rooms/{id}/actions/generate_join_client_token` |
| List participants | `GET /v1/Rooms/{SID}/Participants` | `GET /v2/rooms/{id}/participants` |
| Mute participant | Client-side only | `POST /v2/rooms/{id}/sessions/{sid}/participants/{pid}/actions/mute` |
| Kick participant | `POST /Participants/{SID} (Status=disconnected)` | `POST /v2/rooms/{id}/sessions/{sid}/participants/{pid}/actions/kick` |
| List sessions | N/A | `GET /v2/rooms/{id}/sessions` |
| End session | `POST /Rooms/{SID} (Status=completed)` | `POST /v2/rooms/{id}/sessions/{sid}/actions/end` |
| List recordings | `GET /v1/Rooms/{SID}/Recordings` | `GET /v2/rooms/{id}/recordings` |
| Get recording | `GET /v1/Recordings/{SID}` | `GET /v2/rooms/recordings/{id}` |
| Delete recordings | `DELETE /v1/Recordings/{SID}` | `DELETE /v2/rooms/recordings` (bulk) |
| Create composition | `POST /v1/Compositions` | `POST /v2/rooms/compositions` |

## Common Pitfalls

1. **Token generation is server-side only** — Unlike Twilio where you generated Access Tokens using SDK helper classes, Telnyx token generation is a REST API call. Your server must call the Telnyx API and pass the token to the client.

2. **Room type does not exist** — Twilio had Group, Peer-to-Peer, and Go room types. Telnyx uses a single room model. Set `max_participants` to control room capacity. For 1:1 calls, set `max_participants: 2`.

3. **Client SDK event names differ** — `participantConnected` becomes `participantJoined`, `participantDisconnected` becomes `participantLeft`. Update all event listeners.

4. **Sessions vs rooms** — Telnyx rooms are persistent and reusable. A single room can host multiple sessions. If your Twilio code creates a new room per meeting, you may want to reuse Telnyx rooms and track sessions instead.

5. **Refresh tokens are new** — Telnyx provides refresh tokens for extending sessions. Implement refresh logic in your client to avoid disconnections when the join token expires.

6. **Recording scope is room-level** — Twilio recorded individual participant tracks. Telnyx records at the room level. Use the Compositions API to combine recordings if needed.

7. **Webhook payload structure** — Telnyx webhooks use the standard nested structure (`event.data.event_type`, `event.data.payload`). This differs from Twilio's Status Callback format.

8. **Video codec configuration** — Telnyx rooms support H.264 and VP8 codecs. The `video_codecs` field in the room response shows which codecs are available. Ensure your client SDK is configured for a compatible codec.
