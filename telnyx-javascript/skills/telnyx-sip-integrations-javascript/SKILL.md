---
name: telnyx-sip-integrations-javascript
description: >-
  Call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking.
metadata:
  author: telnyx
  product: sip-integrations
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - JavaScript

## Core Workflow

### Prerequisites

1. SIP connection configured (see telnyx-sip-javascript)

### Steps

1. **List call recordings**: `client.callRecordings.list()`
2. **Download recording**: `client.callRecordings.retrieve({id: ...})`
3. **Upload media**: `client.mediaStorage.create({mediaUrl: ...})`

### Common mistakes

- Call recordings require recording to be enabled on the connection or via call control commands
- Recording files are temporary — download and store them in your own storage

**Related skills**: telnyx-sip-javascript, telnyx-voice-javascript

## Installation

```bash
npm install telnyx
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
  const result = await client.call_recordings.list(params);
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Retrieve a stored credential

Returns the information about custom storage credentials.

`client.customStorageCredentials.retrieve()` — `GET /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```javascript
const customStorageCredential = await client.customStorageCredentials.retrieve('connection_id');

console.log(customStorageCredential.connection_id);
```

Key response fields: `response.data.backend, response.data.configuration`

## Create a custom storage credential

Creates a custom storage credentials configuration.

`client.customStorageCredentials.create()` — `POST /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```javascript
const customStorageCredential = await client.customStorageCredentials.create('connection_id', {
  backend: 'gcs',
  configuration: { backend: 'gcs' },
});

console.log(customStorageCredential.connection_id);
```

Key response fields: `response.data.backend, response.data.configuration`

## Update a stored credential

Updates a stored custom credentials configuration.

`client.customStorageCredentials.update()` — `PUT /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```javascript
const customStorageCredential = await client.customStorageCredentials.update('connection_id', {
  backend: 'gcs',
  configuration: { backend: 'gcs' },
});

console.log(customStorageCredential.connection_id);
```

Key response fields: `response.data.backend, response.data.configuration`

## Delete a stored credential

Deletes a stored custom credentials configuration.

`client.customStorageCredentials.delete()` — `DELETE /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```javascript
await client.customStorageCredentials.delete('connection_id');
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`client.dialogflowConnections.retrieve()` — `GET /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```javascript
const dialogflowConnection = await client.dialogflowConnections.retrieve('connection_id');

console.log(dialogflowConnection.data);
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`client.dialogflowConnections.create()` — `POST /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```javascript
const dialogflowConnection = await client.dialogflowConnections.create('connection_id', {
  service_account: {
    type: 'bar',
    project_id: 'bar',
    private_key_id: 'bar',
    private_key: 'bar',
    client_email: 'bar',
    client_id: 'bar',
    auth_uri: 'bar',
    token_uri: 'bar',
    auth_provider_x509_cert_url: 'bar',
    client_x509_cert_url: 'bar',
  },
});

console.log(dialogflowConnection.data);
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`client.dialogflowConnections.update()` — `PUT /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```javascript
const dialogflowConnection = await client.dialogflowConnections.update('connection_id', {
  service_account: {
    type: 'bar',
    project_id: 'bar',
    private_key_id: 'bar',
    private_key: 'bar',
    client_email: 'bar',
    client_id: 'bar',
    auth_uri: 'bar',
    token_uri: 'bar',
    auth_provider_x509_cert_url: 'bar',
    client_x509_cert_url: 'bar',
  },
});

console.log(dialogflowConnection.data);
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`client.dialogflowConnections.delete()` — `DELETE /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```javascript
await client.dialogflowConnections.delete('connection_id');
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response. External Connections are used by Telnyx customers to seamless configure SIP trunking integrations with Telnyx Partners, through External Voice Integrations in Mission Control Portal.

`client.externalConnections.list()` — `GET /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for external connections (deepObject style)... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const externalConnection of client.externalConnections.list()) {
  console.log(externalConnection.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request. The external_sip_connection and outbound voice profile id are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.externalConnections.create()` — `POST /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `externalSipConnection` | enum (zoom) | Yes | The service that will be consuming this connection. |
| `outbound` | object | Yes |  |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhookEventUrl` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const externalConnection = await client.externalConnections.create({
  external_sip_connection: 'zoom',
  outbound: {},
});

console.log(externalConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`client.externalConnections.logMessages.list()` — `GET /external_connections/log_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for log messages (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const logMessageListResponse of client.externalConnections.logMessages.list()) {
  console.log(logMessageListResponse.code);
}
```

Key response fields: `response.data.log_messages, response.data.meta`

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`client.externalConnections.logMessages.retrieve()` — `GET /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const logMessage = await client.externalConnections.logMessages.retrieve('1293384261075731499');

console.log(logMessage.log_messages);
```

Key response fields: `response.data.log_messages`

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`client.externalConnections.logMessages.dismiss()` — `DELETE /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.externalConnections.logMessages.dismiss('1293384261075731499');

console.log(response.success);
```

Key response fields: `response.data.success`

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`client.externalConnections.retrieve()` — `GET /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const externalConnection = await client.externalConnections.retrieve('1293384261075731499');

console.log(externalConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`client.externalConnections.update()` — `PATCH /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `outbound` | object | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhookEventUrl` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const externalConnection = await client.externalConnections.update('1293384261075731499', {
  outbound: { outbound_voice_profile_id: '1911630617284445511' },
});

console.log(externalConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes an External Connection

Permanently deletes an External Connection. Deletion may be prevented if the application is in use by phone numbers, is active, or if it is an Operator Connect connection. To remove an Operator Connect integration please contact Telnyx support.

`client.externalConnections.delete()` — `DELETE /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const externalConnection = await client.externalConnections.delete('1293384261075731499');

console.log(externalConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`client.externalConnections.civicAddresses.list()` — `GET /external_connections/{id}/civic_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for civic addresses (deepObject style). |

```javascript
const civicAddresses = await client.externalConnections.civicAddresses.list('1293384261075731499');

console.log(civicAddresses.data);
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`client.externalConnections.civicAddresses.retrieve()` — `GET /external_connections/{id}/civic_addresses/{address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `addressId` | string (UUID) | Yes | Identifies a civic address or a location. |

```javascript
const civicAddress = await client.externalConnections.civicAddresses.retrieve(
  '318fb664-d341-44d2-8405-e6bfb9ced6d9',
  { id: '1293384261075731499' },
);

console.log(civicAddress.data);
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Update a location's static emergency address

`client.externalConnections.updateLocation()` — `PATCH /external_connections/{id}/locations/{location_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staticEmergencyAddressId` | string (UUID) | Yes | A new static emergency address ID to update the location wit... |
| `id` | string (UUID) | Yes | The ID of the external connection |
| `locationId` | string (UUID) | Yes | The ID of the location to update |

```javascript
const response = await client.externalConnections.updateLocation(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
    static_emergency_address_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  },
);

console.log(response.data);
```

Key response fields: `response.data.accepted_address_suggestions, response.data.location_id, response.data.static_emergency_address_id`

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`client.externalConnections.phoneNumbers.list()` — `GET /external_connections/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for phone numbers (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const externalConnectionPhoneNumber of client.externalConnections.phoneNumbers.list(
  '1293384261075731499',
)) {
  console.log(externalConnectionPhoneNumber.civic_address_id);
}
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`client.externalConnections.phoneNumbers.retrieve()` — `GET /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phoneNumberId` | string (UUID) | Yes | A phone number's ID via the Telnyx API |

```javascript
const phoneNumber = await client.externalConnections.phoneNumbers.retrieve('1234567889', {
  id: '1293384261075731499',
});

console.log(phoneNumber.data);
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`client.externalConnections.phoneNumbers.update()` — `PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phoneNumberId` | string (UUID) | Yes | A phone number's ID via the Telnyx API |
| `locationId` | string (UUID) | No | Identifies the location to assign the phone number to. |

```javascript
const phoneNumber = await client.externalConnections.phoneNumbers.update('1234567889', {
  id: '1293384261075731499',
});

console.log(phoneNumber.data);
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## List all Releases

Returns a list of your Releases for the given external connection. These are automatically created when you change the `connection_id` of a phone number that is currently on Microsoft Teams.

`client.externalConnections.releases.list()` — `GET /external_connections/{id}/releases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for releases (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const releaseListResponse of client.externalConnections.releases.list(
  '1293384261075731499',
)) {
  console.log(releaseListResponse.tenant_id);
}
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`client.externalConnections.releases.retrieve()` — `GET /external_connections/{id}/releases/{release_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `releaseId` | string (UUID) | Yes | Identifies a Release request |

```javascript
const release = await client.externalConnections.releases.retrieve(
  '7b6a6449-b055-45a6-81f6-f6f0dffa4cc6',
  { id: '1293384261075731499' },
);

console.log(release.data);
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`client.externalConnections.uploads.list()` — `GET /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for uploads (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const upload of client.externalConnections.uploads.list('1293384261075731499')) {
  console.log(upload.location_id);
}
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers. Only one of civic_address_id or location_id must be provided, not both. The maximum allowed phone numbers for the numbers_ids array is 1000.

`client.externalConnections.uploads.create()` — `POST /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberIds` | array[string] | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | No | The use case of the upload request. |
| `locationId` | string (UUID) | No | Identifies the location to assign all phone numbers to. |
| `civicAddressId` | string (UUID) | No | Identifies the civic address to assign all phone numbers to. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const upload = await client.externalConnections.uploads.create('1293384261075731499', {
  number_ids: [
    '3920457616934164700',
    '3920457616934164701',
    '3920457616934164702',
    '3920457616934164703',
  ],
});

console.log(upload.ticket_id);
```

Key response fields: `response.data.success, response.data.ticket_id`

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`client.externalConnections.uploads.refreshStatus()` — `POST /external_connections/{id}/uploads/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.externalConnections.uploads.refreshStatus('1293384261075731499');

console.log(response.success);
```

Key response fields: `response.data.success`

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`client.externalConnections.uploads.pendingCount()` — `GET /external_connections/{id}/uploads/status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.externalConnections.uploads.pendingCount('1293384261075731499');

console.log(response.data);
```

Key response fields: `response.data.pending_numbers_count, response.data.pending_orders_count`

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`client.externalConnections.uploads.retrieve()` — `GET /external_connections/{id}/uploads/{ticket_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticketId` | string (UUID) | Yes | Identifies an Upload request |

```javascript
const upload = await client.externalConnections.uploads.retrieve(
  '7b6a6449-b055-45a6-81f6-f6f0dffa4cc6',
  { id: '1293384261075731499' },
);

console.log(upload.data);
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request. In some cases this will reattempt the existing upload request, in other cases it may create a new upload request. Please check the ticket_id in the response to determine if a new upload request was created.

`client.externalConnections.uploads.retry()` — `POST /external_connections/{id}/uploads/{ticket_id}/retry`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticketId` | string (UUID) | Yes | Identifies an Upload request |

```javascript
const response = await client.externalConnections.uploads.retry(
  '7b6a6449-b055-45a6-81f6-f6f0dffa4cc6',
  { id: '1293384261075731499' },
);

console.log(response.data);
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## List uploaded media

Returns a list of stored media files.

`client.media.list()` — `GET /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const media = await client.media.list();

console.log(media.data);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`client.media.upload()` — `POST /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaUrl` | string (URL) | Yes | The URL where the media to be stored in Telnyx network is cu... |
| `ttlSecs` | integer | No | The number of seconds after which the media resource will be... |
| `mediaName` | string | No | The unique identifier of a file. |

```javascript
const response = await client.media.upload({ media_url: 'http://www.example.com/audio.mp3' });

console.log(response.data);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Retrieve stored media

Returns the information about a stored media file.

`client.media.retrieve()` — `GET /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |

```javascript
const media = await client.media.retrieve('media_name');

console.log(media.data);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Update stored media

Updates a stored media file.

`client.media.update()` — `PUT /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |
| `mediaUrl` | string (URL) | No | The URL where the media to be stored in Telnyx network is cu... |
| `ttlSecs` | integer | No | The number of seconds after which the media resource will be... |

```javascript
const media = await client.media.update('media_name');

console.log(media.data);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Deletes stored media

Deletes a stored media file.

`client.media.delete()` — `DELETE /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |

```javascript
await client.media.delete('media_name');
```

## Download stored media

Downloads a stored media file.

`client.media.download()` — `GET /media/{media_name}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |

```javascript
const response = await client.media.download('media_name');

console.log(response);

const content = await response.blob();
console.log(content);
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user. This will create new external connections on the user's account if needed, and/or report the integration results as [log messages](https://developers.telnyx.com/api-reference/external-connections/list-all-log-messages#list-all-log-messages).

`client.operatorConnect.actions.refresh()` — `POST /operator_connect/actions/refresh`

```javascript
const response = await client.operatorConnect.actions.refresh();

console.log(response.message);
```

Key response fields: `response.data.message, response.data.success`

## List all recording transcriptions

Returns a list of your recording transcriptions.

`client.recordingTranscriptions.list()` — `GET /recording_transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recording transcriptions by various attributes. |

```javascript
// Automatically fetches more pages as needed.
for await (const recordingTranscription of client.recordingTranscriptions.list()) {
  console.log(recordingTranscription.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`client.recordingTranscriptions.retrieve()` — `GET /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingTranscriptionId` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```javascript
const recordingTranscription = await client.recordingTranscriptions.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(recordingTranscription.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.recordingTranscriptions.delete()` — `DELETE /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingTranscriptionId` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```javascript
const recordingTranscription = await client.recordingTranscriptions.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(recordingTranscription.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all call recordings

Returns a list of your call recordings.

`client.recordings.list()` — `GET /recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recordings by various attributes. |

```javascript
// Automatically fetches more pages as needed.
for await (const recordingResponseData of client.recordings.list()) {
  console.log(recordingResponseData.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`client.recordings.actions.delete()` — `POST /recordings/actions/delete`

```javascript
const action = await client.recordings.actions.delete({
  ids: ['428c31b6-7af4-4bcb-b7f5-5013ef9657c1', '428c31b6-7af4-4bcb-b7f5-5013ef9657c2'],
});

console.log(action.status);
```

Key response fields: `response.data.status`

## Retrieve a call recording

Retrieves the details of an existing call recording.

`client.recordings.retrieve()` — `GET /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingId` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```javascript
const recording = await client.recordings.retrieve('recording_id');

console.log(recording.data);
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a call recording

Permanently deletes a call recording.

`client.recordings.delete()` — `DELETE /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingId` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```javascript
const recording = await client.recordings.delete('recording_id');

console.log(recording.data);
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`client.siprecConnectors.create()` — `POST /siprec_connectors`

```javascript
const siprecConnector = await client.siprecConnectors.create({
  host: 'siprec.telnyx.com',
  name: 'my-siprec-connector',
  port: 5060,
});

console.log(siprecConnector.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`client.siprecConnectors.retrieve()` — `GET /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```javascript
const siprecConnector = await client.siprecConnectors.retrieve('connector_name');

console.log(siprecConnector.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`client.siprecConnectors.update()` — `PUT /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```javascript
const siprecConnector = await client.siprecConnectors.update('connector_name', {
  host: 'siprec.telnyx.com',
  name: 'my-siprec-connector',
  port: 5060,
});

console.log(siprecConnector.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`client.siprecConnectors.delete()` — `DELETE /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```javascript
await client.siprecConnectors.delete('connector_name');
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
