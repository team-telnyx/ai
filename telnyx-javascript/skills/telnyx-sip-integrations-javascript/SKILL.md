---
name: telnyx-sip-integrations-javascript
description: >-
  Manage call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: sip-integrations
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - JavaScript

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

## Retrieve a stored credential

Returns the information about custom storage credentials.

`GET /custom_storage_credentials/{connection_id}`

```javascript
const customStorageCredential = await client.customStorageCredentials.retrieve('connection_id');

console.log(customStorageCredential.connection_id);
```

## Create a custom storage credential

Creates a custom storage credentials configuration.

`POST /custom_storage_credentials/{connection_id}`

```javascript
const customStorageCredential = await client.customStorageCredentials.create('connection_id', {
  backend: 'gcs',
  configuration: { backend: 'gcs' },
});

console.log(customStorageCredential.connection_id);
```

## Update a stored credential

Updates a stored custom credentials configuration.

`PUT /custom_storage_credentials/{connection_id}`

```javascript
const customStorageCredential = await client.customStorageCredentials.update('connection_id', {
  backend: 'gcs',
  configuration: { backend: 'gcs' },
});

console.log(customStorageCredential.connection_id);
```

## Delete a stored credential

Deletes a stored custom credentials configuration.

`DELETE /custom_storage_credentials/{connection_id}`

```javascript
await client.customStorageCredentials.delete('connection_id');
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`GET /dialogflow_connections/{connection_id}`

```javascript
const dialogflowConnection = await client.dialogflowConnections.retrieve('connection_id');

console.log(dialogflowConnection.data);
```

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`POST /dialogflow_connections/{connection_id}`

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

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`PUT /dialogflow_connections/{connection_id}`

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

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`DELETE /dialogflow_connections/{connection_id}`

```javascript
await client.dialogflowConnections.delete('connection_id');
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response.

`GET /external_connections`

```javascript
// Automatically fetches more pages as needed.
for await (const externalConnection of client.externalConnections.list()) {
  console.log(externalConnection.id);
}
```

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request.

`POST /external_connections` — Required: `external_sip_connection`, `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const externalConnection = await client.externalConnections.create({
  external_sip_connection: 'zoom',
  outbound: {},
});

console.log(externalConnection.data);
```

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`GET /external_connections/log_messages`

```javascript
// Automatically fetches more pages as needed.
for await (const logMessageListResponse of client.externalConnections.logMessages.list()) {
  console.log(logMessageListResponse.code);
}
```

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`GET /external_connections/log_messages/{id}`

```javascript
const logMessage = await client.externalConnections.logMessages.retrieve('1293384261075731499');

console.log(logMessage.log_messages);
```

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`DELETE /external_connections/log_messages/{id}`

```javascript
const response = await client.externalConnections.logMessages.dismiss('1293384261075731499');

console.log(response.success);
```

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`GET /external_connections/{id}`

```javascript
const externalConnection = await client.externalConnections.retrieve('1293384261075731499');

console.log(externalConnection.data);
```

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`PATCH /external_connections/{id}` — Required: `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const externalConnection = await client.externalConnections.update('1293384261075731499', {
  outbound: { outbound_voice_profile_id: '1911630617284445511' },
});

console.log(externalConnection.data);
```

## Deletes an External Connection

Permanently deletes an External Connection.

`DELETE /external_connections/{id}`

```javascript
const externalConnection = await client.externalConnections.delete('1293384261075731499');

console.log(externalConnection.data);
```

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`GET /external_connections/{id}/civic_addresses`

```javascript
const civicAddresses = await client.externalConnections.civicAddresses.list('1293384261075731499');

console.log(civicAddresses.data);
```

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`GET /external_connections/{id}/civic_addresses/{address_id}`

```javascript
const civicAddress = await client.externalConnections.civicAddresses.retrieve(
  '318fb664-d341-44d2-8405-e6bfb9ced6d9',
  { id: '1293384261075731499' },
);

console.log(civicAddress.data);
```

## Update a location's static emergency address

`PATCH /external_connections/{id}/locations/{location_id}` — Required: `static_emergency_address_id`

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

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`GET /external_connections/{id}/phone_numbers`

```javascript
// Automatically fetches more pages as needed.
for await (const externalConnectionPhoneNumber of client.externalConnections.phoneNumbers.list(
  '1293384261075731499',
)) {
  console.log(externalConnectionPhoneNumber.civic_address_id);
}
```

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`GET /external_connections/{id}/phone_numbers/{phone_number_id}`

```javascript
const phoneNumber = await client.externalConnections.phoneNumbers.retrieve('1234567889', {
  id: '1293384261075731499',
});

console.log(phoneNumber.data);
```

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

Optional: `location_id` (uuid)

```javascript
const phoneNumber = await client.externalConnections.phoneNumbers.update('1234567889', {
  id: '1293384261075731499',
});

console.log(phoneNumber.data);
```

## List all Releases

Returns a list of your Releases for the given external connection.

`GET /external_connections/{id}/releases`

```javascript
// Automatically fetches more pages as needed.
for await (const releaseListResponse of client.externalConnections.releases.list(
  '1293384261075731499',
)) {
  console.log(releaseListResponse.tenant_id);
}
```

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`GET /external_connections/{id}/releases/{release_id}`

```javascript
const release = await client.externalConnections.releases.retrieve(
  '7b6a6449-b055-45a6-81f6-f6f0dffa4cc6',
  { id: '1293384261075731499' },
);

console.log(release.data);
```

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`GET /external_connections/{id}/uploads`

```javascript
// Automatically fetches more pages as needed.
for await (const upload of client.externalConnections.uploads.list('1293384261075731499')) {
  console.log(upload.location_id);
}
```

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers.

`POST /external_connections/{id}/uploads` — Required: `number_ids`

Optional: `additional_usages` (array[string]), `civic_address_id` (uuid), `location_id` (uuid), `usage` (enum)

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

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`POST /external_connections/{id}/uploads/refresh`

```javascript
const response = await client.externalConnections.uploads.refreshStatus('1293384261075731499');

console.log(response.success);
```

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`GET /external_connections/{id}/uploads/status`

```javascript
const response = await client.externalConnections.uploads.pendingCount('1293384261075731499');

console.log(response.data);
```

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`GET /external_connections/{id}/uploads/{ticket_id}`

```javascript
const upload = await client.externalConnections.uploads.retrieve(
  '7b6a6449-b055-45a6-81f6-f6f0dffa4cc6',
  { id: '1293384261075731499' },
);

console.log(upload.data);
```

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request.

`POST /external_connections/{id}/uploads/{ticket_id}/retry`

```javascript
const response = await client.externalConnections.uploads.retry(
  '7b6a6449-b055-45a6-81f6-f6f0dffa4cc6',
  { id: '1293384261075731499' },
);

console.log(response.data);
```

## List uploaded media

Returns a list of stored media files.

`GET /media`

```javascript
const media = await client.media.list();

console.log(media.data);
```

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`POST /media` — Required: `media_url`

Optional: `media_name` (string), `ttl_secs` (integer)

```javascript
const response = await client.media.upload({ media_url: 'http://www.example.com/audio.mp3' });

console.log(response.data);
```

## Retrieve stored media

Returns the information about a stored media file.

`GET /media/{media_name}`

```javascript
const media = await client.media.retrieve('media_name');

console.log(media.data);
```

## Update stored media

Updates a stored media file.

`PUT /media/{media_name}`

Optional: `media_url` (string), `ttl_secs` (integer)

```javascript
const media = await client.media.update('media_name');

console.log(media.data);
```

## Deletes stored media

Deletes a stored media file.

`DELETE /media/{media_name}`

```javascript
await client.media.delete('media_name');
```

## Download stored media

Downloads a stored media file.

`GET /media/{media_name}/download`

```javascript
const response = await client.media.download('media_name');

console.log(response);

const content = await response.blob();
console.log(content);
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user.

`POST /operator_connect/actions/refresh`

```javascript
const response = await client.operatorConnect.actions.refresh();

console.log(response.message);
```

## List all recording transcriptions

Returns a list of your recording transcriptions.

`GET /recording_transcriptions`

```javascript
const recordingTranscriptions = await client.recordingTranscriptions.list();

console.log(recordingTranscriptions.data);
```

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`GET /recording_transcriptions/{recording_transcription_id}`

```javascript
const recordingTranscription = await client.recordingTranscriptions.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(recordingTranscription.data);
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /recording_transcriptions/{recording_transcription_id}`

```javascript
const recordingTranscription = await client.recordingTranscriptions.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(recordingTranscription.data);
```

## List all call recordings

Returns a list of your call recordings.

`GET /recordings`

```javascript
// Automatically fetches more pages as needed.
for await (const recordingResponseData of client.recordings.list()) {
  console.log(recordingResponseData.id);
}
```

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`POST /recordings/actions/delete`

```javascript
await client.recordings.actions.delete({
  ids: ['428c31b6-7af4-4bcb-b7f5-5013ef9657c1', '428c31b6-7af4-4bcb-b7f5-5013ef9657c2'],
});
```

## Retrieve a call recording

Retrieves the details of an existing call recording.

`GET /recordings/{recording_id}`

```javascript
const recording = await client.recordings.retrieve('recording_id');

console.log(recording.data);
```

## Delete a call recording

Permanently deletes a call recording.

`DELETE /recordings/{recording_id}`

```javascript
const recording = await client.recordings.delete('recording_id');

console.log(recording.data);
```

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`POST /siprec_connectors`

```javascript
const siprecConnector = await client.siprecConnectors.create({
  host: 'siprec.telnyx.com',
  name: 'my-siprec-connector',
  port: 5060,
});

console.log(siprecConnector.data);
```

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`GET /siprec_connectors/{connector_name}`

```javascript
const siprecConnector = await client.siprecConnectors.retrieve('connector_name');

console.log(siprecConnector.data);
```

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`PUT /siprec_connectors/{connector_name}`

```javascript
const siprecConnector = await client.siprecConnectors.update('connector_name', {
  host: 'siprec.telnyx.com',
  name: 'my-siprec-connector',
  port: 5060,
});

console.log(siprecConnector.data);
```

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`DELETE /siprec_connectors/{connector_name}`

```javascript
await client.siprecConnectors.delete('connector_name');
```
