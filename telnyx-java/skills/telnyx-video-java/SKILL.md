---
name: telnyx-video-java
description: >-
  Video rooms for real-time communication and conferencing.
metadata:
  author: telnyx
  product: video
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Video - Java

## Core Workflow

### Prerequisites

1. No phone number needed — video rooms are standalone

### Steps

1. **Create room**: `client.rooms().create(params)`
2. **Generate client token**: `client.rooms().clientTokens().create(params)`
3. **Join from client**: `Use the client token in a WebRTC client SDK`
4. **List recordings**: `client.roomRecordings().list(params)`

### Common mistakes

- Client tokens are short-lived — generate a new one for each participant session
- Room unique_name must be globally unique — use UUIDs or prefixed names

**Related skills**: telnyx-webrtc-java

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
    var result = client.rooms().create(params);
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create a room.

Synchronously create a Room.

`client.rooms().create()` — `POST /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uniqueName` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `maxParticipants` | integer | No | The maximum amount of participants allowed in a room. |
| `enableRecording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.rooms.RoomCreateParams;
import com.telnyx.sdk.models.rooms.RoomCreateResponse;

RoomCreateParams params = RoomCreateParams.builder()

    .uniqueName("my-meeting-room")

    .maxParticipants(10)

    .build();

RoomCreateResponse room = client.rooms().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create Client Token to join a room.

Synchronously create an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`, a Refresh Token is also provided to refresh a Client Token, the Refresh Token expires after `refresh_token_ttl_secs`.

`client.rooms().actions().generateJoinClientToken()` — `POST /rooms/{room_id}/actions/generate_join_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `tokenTtlSecs` | integer | No | The time to live in seconds of the Client Token, after that ... |
| `refreshTokenTtlSecs` | integer | No | The time to live in seconds of the Refresh Token, after that... |

```java
import com.telnyx.sdk.models.rooms.actions.ActionGenerateJoinClientTokenParams;
import com.telnyx.sdk.models.rooms.actions.ActionGenerateJoinClientTokenResponse;

ActionGenerateJoinClientTokenResponse response = client.rooms().actions().generateJoinClientToken("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.refresh_token, response.data.refresh_token_expires_at, response.data.token`

## View a list of rooms.

`client.rooms().list()` — `GET /rooms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeSessions` | boolean | No | To decide if room sessions should be included in the respons... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.rooms.RoomListPage;
import com.telnyx.sdk.models.rooms.RoomListParams;

RoomListPage page = client.rooms().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room.

`client.rooms().retrieve()` — `GET /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `includeSessions` | boolean | No | To decide if room sessions should be included in the respons... |

```java
import com.telnyx.sdk.models.rooms.RoomRetrieveParams;
import com.telnyx.sdk.models.rooms.RoomRetrieveResponse;

RoomRetrieveResponse room = client.rooms().retrieve("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a room composition.

Asynchronously create a room composition.

`client.roomCompositions().create()` — `POST /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string (UUID) | No | id of the room session associated with the room composition. |
| `format` | string | No | The desired format of the room composition. |
| `resolution` | string | No | The desired resolution (width/height in pixels) of the resul... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.roomcompositions.RoomCompositionCreateParams;
import com.telnyx.sdk.models.roomcompositions.RoomCompositionCreateResponse;

RoomCompositionCreateResponse roomComposition = client.roomCompositions().create();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a list of room compositions.

`client.roomCompositions().list()` — `GET /room_compositions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.roomcompositions.RoomCompositionListPage;
import com.telnyx.sdk.models.roomcompositions.RoomCompositionListParams;

RoomCompositionListPage page = client.roomCompositions().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## View a room composition.

`client.roomCompositions().retrieve()` — `GET /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomCompositionId` | string (UUID) | Yes | The unique identifier of a room composition. |

```java
import com.telnyx.sdk.models.roomcompositions.RoomCompositionRetrieveParams;
import com.telnyx.sdk.models.roomcompositions.RoomCompositionRetrieveResponse;

RoomCompositionRetrieveResponse roomComposition = client.roomCompositions().retrieve("5219b3af-87c6-4c08-9b58-5a533d893e21");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a room composition.

Synchronously delete a room composition.

`client.roomCompositions().delete()` — `DELETE /room_compositions/{room_composition_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomCompositionId` | string (UUID) | Yes | The unique identifier of a room composition. |

```java
import com.telnyx.sdk.models.roomcompositions.RoomCompositionDeleteParams;

client.roomCompositions().delete("5219b3af-87c6-4c08-9b58-5a533d893e21");
```

## View a list of room participants.

`client.roomParticipants().list()` — `GET /room_participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.roomparticipants.RoomParticipantListPage;
import com.telnyx.sdk.models.roomparticipants.RoomParticipantListParams;

RoomParticipantListPage page = client.roomParticipants().list();
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a room participant.

`client.roomParticipants().retrieve()` — `GET /room_participants/{room_participant_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomParticipantId` | string (UUID) | Yes | The unique identifier of a room participant. |

```java
import com.telnyx.sdk.models.roomparticipants.RoomParticipantRetrieveParams;
import com.telnyx.sdk.models.roomparticipants.RoomParticipantRetrieveResponse;

RoomParticipantRetrieveResponse roomParticipant = client.roomParticipants().retrieve("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## View a list of room recordings.

`client.roomRecordings().list()` — `GET /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.roomrecordings.RoomRecordingListPage;
import com.telnyx.sdk.models.roomrecordings.RoomRecordingListParams;

RoomRecordingListPage page = client.roomRecordings().list();
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete several room recordings in a bulk.

`client.roomRecordings().deleteBulk()` — `DELETE /room_recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.roomrecordings.RoomRecordingDeleteBulkParams;
import com.telnyx.sdk.models.roomrecordings.RoomRecordingDeleteBulkResponse;

RoomRecordingDeleteBulkResponse response = client.roomRecordings().deleteBulk();
```

Key response fields: `response.data.room_recordings`

## View a room recording.

`client.roomRecordings().retrieve()` — `GET /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomRecordingId` | string (UUID) | Yes | The unique identifier of a room recording. |

```java
import com.telnyx.sdk.models.roomrecordings.RoomRecordingRetrieveParams;
import com.telnyx.sdk.models.roomrecordings.RoomRecordingRetrieveResponse;

RoomRecordingRetrieveResponse roomRecording = client.roomRecordings().retrieve("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a room recording.

Synchronously delete a Room Recording.

`client.roomRecordings().delete()` — `DELETE /room_recordings/{room_recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomRecordingId` | string (UUID) | Yes | The unique identifier of a room recording. |

```java
import com.telnyx.sdk.models.roomrecordings.RoomRecordingDeleteParams;

client.roomRecordings().delete("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

## View a list of room sessions.

`client.rooms().sessions().list0()` — `GET /room_sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeParticipants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.rooms.sessions.SessionList0Page;
import com.telnyx.sdk.models.rooms.sessions.SessionList0Params;

SessionList0Page page = client.rooms().sessions().list0();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a room session.

`client.rooms().sessions().retrieve()` — `GET /room_sessions/{room_session_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `includeParticipants` | boolean | No | To decide if room participants should be included in the res... |

```java
import com.telnyx.sdk.models.rooms.sessions.SessionRetrieveParams;
import com.telnyx.sdk.models.rooms.sessions.SessionRetrieveResponse;

SessionRetrieveResponse session = client.rooms().sessions().retrieve("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## End a room session.

Note: this will also kick all participants currently present in the room

`client.rooms().sessions().actions().end()` — `POST /room_sessions/{room_session_id}/actions/end`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |

```java
import com.telnyx.sdk.models.rooms.sessions.actions.ActionEndParams;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionEndResponse;

ActionEndResponse response = client.rooms().sessions().actions().end("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.result`

## Kick participants from a room session.

`client.rooms().sessions().actions().kick()` — `POST /room_sessions/{room_session_id}/actions/kick`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```java
import com.telnyx.sdk.models.rooms.sessions.actions.ActionKickParams;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionKickResponse;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionsParticipantsRequest;

ActionKickParams params = ActionKickParams.builder()
    .roomSessionId("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
    .actionsParticipantsRequest(ActionsParticipantsRequest.builder().build())
    .build();
ActionKickResponse response = client.rooms().sessions().actions().kick(params);
```

Key response fields: `response.data.result`

## Mute participants in room session.

`client.rooms().sessions().actions().mute()` — `POST /room_sessions/{room_session_id}/actions/mute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```java
import com.telnyx.sdk.models.rooms.sessions.actions.ActionMuteParams;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionMuteResponse;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionsParticipantsRequest;

ActionMuteParams params = ActionMuteParams.builder()
    .roomSessionId("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
    .actionsParticipantsRequest(ActionsParticipantsRequest.builder().build())
    .build();
ActionMuteResponse response = client.rooms().sessions().actions().mute(params);
```

Key response fields: `response.data.result`

## Unmute participants in room session.

`client.rooms().sessions().actions().unmute()` — `POST /room_sessions/{room_session_id}/actions/unmute`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `participants` | object | No | Either a list of participant id to perform the action on, or... |
| `exclude` | array[string] | No | List of participant id to exclude from the action. |

```java
import com.telnyx.sdk.models.rooms.sessions.actions.ActionUnmuteParams;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionUnmuteResponse;
import com.telnyx.sdk.models.rooms.sessions.actions.ActionsParticipantsRequest;

ActionUnmuteParams params = ActionUnmuteParams.builder()
    .roomSessionId("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
    .actionsParticipantsRequest(ActionsParticipantsRequest.builder().build())
    .build();
ActionUnmuteResponse response = client.rooms().sessions().actions().unmute(params);
```

Key response fields: `response.data.result`

## View a list of room participants.

`client.rooms().sessions().retrieveParticipants()` — `GET /room_sessions/{room_session_id}/participants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomSessionId` | string (UUID) | Yes | The unique identifier of a room session. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.rooms.sessions.SessionRetrieveParticipantsPage;
import com.telnyx.sdk.models.rooms.sessions.SessionRetrieveParticipantsParams;

SessionRetrieveParticipantsPage page = client.rooms().sessions().retrieveParticipants("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.updated_at, response.data.context`

## Update a room.

Synchronously update a Room.

`client.rooms().update()` — `PATCH /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `uniqueName` | string | No | The unique (within the Telnyx account scope) name of the roo... |
| `maxParticipants` | integer | No | The maximum amount of participants allowed in a room. |
| `enableRecording` | boolean | No | Enable or disable recording for that room. |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.rooms.RoomUpdateParams;
import com.telnyx.sdk.models.rooms.RoomUpdateResponse;

RoomUpdateResponse room = client.rooms().update("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a room.

Synchronously delete a Room. Participants from that room will be kicked out, they won't be able to join that room anymore, and you won't be charged anymore for that room.

`client.rooms().delete()` — `DELETE /rooms/{room_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |

```java
import com.telnyx.sdk.models.rooms.RoomDeleteParams;

client.rooms().delete("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

## Refresh Client Token to join a room.

Synchronously refresh an Client Token to join a Room. Client Token is necessary to join a Telnyx Room. Client Token will expire after `token_ttl_secs`.

`client.rooms().actions().refreshClientToken()` — `POST /rooms/{room_id}/actions/refresh_client_token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refreshToken` | string | Yes |  |
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `tokenTtlSecs` | integer | No | The time to live in seconds of the Client Token, after that ... |

```java
import com.telnyx.sdk.models.rooms.actions.ActionRefreshClientTokenParams;
import com.telnyx.sdk.models.rooms.actions.ActionRefreshClientTokenResponse;

ActionRefreshClientTokenParams params = ActionRefreshClientTokenParams.builder()
    .roomId("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
    .refreshToken("eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZWxueXhfdGVsZXBob255IiwiZXhwIjoxNTkwMDEwMTQzLCJpYXQiOjE1ODc1OTA5NDMsImlzcyI6InRlbG55eF90ZWxlcGhvbnkiLCJqdGkiOiJiOGM3NDgzNy1kODllLTRhNjUtOWNmMi0zNGM3YTZmYTYwYzgiLCJuYmYiOjE1ODc1OTA5NDIsInN1YiI6IjVjN2FjN2QwLWRiNjUtNGYxMS05OGUxLWVlYzBkMWQ1YzZhZSIsInRlbF90b2tlbiI6InJqX1pra1pVT1pNeFpPZk9tTHBFVUIzc2lVN3U2UmpaRmVNOXMtZ2JfeENSNTZXRktGQUppTXlGMlQ2Q0JSbWxoX1N5MGlfbGZ5VDlBSThzRWlmOE1USUlzenl6U2xfYURuRzQ4YU81MHlhSEd1UlNZYlViU1ltOVdJaVEwZz09IiwidHlwIjoiYWNjZXNzIn0.gNEwzTow5MLLPLQENytca7pUN79PmPj6FyqZWW06ZeEmesxYpwKh0xRtA0TzLh6CDYIRHrI8seofOO0YFGDhpQ")
    .build();
ActionRefreshClientTokenResponse response = client.rooms().actions().refreshClientToken(params);
```

Key response fields: `response.data.token, response.data.token_expires_at`

## View a list of room sessions.

`client.rooms().sessions().list1()` — `GET /rooms/{room_id}/sessions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string (UUID) | Yes | The unique identifier of a room. |
| `includeParticipants` | boolean | No | To decide if room participants should be included in the res... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.rooms.sessions.SessionList1Page;
import com.telnyx.sdk.models.rooms.sessions.SessionList1Params;

SessionList1Page page = client.rooms().sessions().list1("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
