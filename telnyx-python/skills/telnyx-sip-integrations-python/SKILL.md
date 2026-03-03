---
name: telnyx-sip-integrations-python
description: >-
  Manage call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: sip-integrations
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - Python

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

## Retrieve a stored credential

Returns the information about custom storage credentials.

`GET /custom_storage_credentials/{connection_id}`

```python
custom_storage_credential = client.custom_storage_credentials.retrieve(
    "connection_id",
)
print(custom_storage_credential.connection_id)
```

## Create a custom storage credential

Creates a custom storage credentials configuration.

`POST /custom_storage_credentials/{connection_id}`

```python
custom_storage_credential = client.custom_storage_credentials.create(
    connection_id="connection_id",
    backend="gcs",
    configuration={
        "backend": "gcs"
    },
)
print(custom_storage_credential.connection_id)
```

## Update a stored credential

Updates a stored custom credentials configuration.

`PUT /custom_storage_credentials/{connection_id}`

```python
custom_storage_credential = client.custom_storage_credentials.update(
    connection_id="connection_id",
    backend="gcs",
    configuration={
        "backend": "gcs"
    },
)
print(custom_storage_credential.connection_id)
```

## Delete a stored credential

Deletes a stored custom credentials configuration.

`DELETE /custom_storage_credentials/{connection_id}`

```python
client.custom_storage_credentials.delete(
    "connection_id",
)
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`GET /dialogflow_connections/{connection_id}`

```python
dialogflow_connection = client.dialogflow_connections.retrieve(
    "connection_id",
)
print(dialogflow_connection.data)
```

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`POST /dialogflow_connections/{connection_id}`

```python
dialogflow_connection = client.dialogflow_connections.create(
    connection_id="connection_id",
    service_account={
        "type": "bar",
        "project_id": "bar",
        "private_key_id": "bar",
        "private_key": "bar",
        "client_email": "bar",
        "client_id": "bar",
        "auth_uri": "bar",
        "token_uri": "bar",
        "auth_provider_x509_cert_url": "bar",
        "client_x509_cert_url": "bar",
    },
)
print(dialogflow_connection.data)
```

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`PUT /dialogflow_connections/{connection_id}`

```python
dialogflow_connection = client.dialogflow_connections.update(
    connection_id="connection_id",
    service_account={
        "type": "bar",
        "project_id": "bar",
        "private_key_id": "bar",
        "private_key": "bar",
        "client_email": "bar",
        "client_id": "bar",
        "auth_uri": "bar",
        "token_uri": "bar",
        "auth_provider_x509_cert_url": "bar",
        "client_x509_cert_url": "bar",
    },
)
print(dialogflow_connection.data)
```

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`DELETE /dialogflow_connections/{connection_id}`

```python
client.dialogflow_connections.delete(
    "connection_id",
)
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response.

`GET /external_connections`

```python
page = client.external_connections.list()
page = page.data[0]
print(page.id)
```

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request.

`POST /external_connections` — Required: `external_sip_connection`, `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```python
external_connection = client.external_connections.create(
    external_sip_connection="zoom",
    outbound={},
)
print(external_connection.data)
```

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`GET /external_connections/log_messages`

```python
page = client.external_connections.log_messages.list()
page = page.log_messages[0]
print(page.code)
```

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`GET /external_connections/log_messages/{id}`

```python
log_message = client.external_connections.log_messages.retrieve(
    "1293384261075731499",
)
print(log_message.log_messages)
```

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`DELETE /external_connections/log_messages/{id}`

```python
response = client.external_connections.log_messages.dismiss(
    "1293384261075731499",
)
print(response.success)
```

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`GET /external_connections/{id}`

```python
external_connection = client.external_connections.retrieve(
    "1293384261075731499",
)
print(external_connection.data)
```

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`PATCH /external_connections/{id}` — Required: `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```python
external_connection = client.external_connections.update(
    id="1293384261075731499",
    outbound={
        "outbound_voice_profile_id": "1911630617284445511"
    },
)
print(external_connection.data)
```

## Deletes an External Connection

Permanently deletes an External Connection.

`DELETE /external_connections/{id}`

```python
external_connection = client.external_connections.delete(
    "1293384261075731499",
)
print(external_connection.data)
```

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`GET /external_connections/{id}/civic_addresses`

```python
civic_addresses = client.external_connections.civic_addresses.list(
    id="1293384261075731499",
)
print(civic_addresses.data)
```

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`GET /external_connections/{id}/civic_addresses/{address_id}`

```python
civic_address = client.external_connections.civic_addresses.retrieve(
    address_id="318fb664-d341-44d2-8405-e6bfb9ced6d9",
    id="1293384261075731499",
)
print(civic_address.data)
```

## Update a location's static emergency address

`PATCH /external_connections/{id}/locations/{location_id}` — Required: `static_emergency_address_id`

```python
response = client.external_connections.update_location(
    location_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    static_emergency_address_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`GET /external_connections/{id}/phone_numbers`

```python
page = client.external_connections.phone_numbers.list(
    id="1293384261075731499",
)
page = page.data[0]
print(page.civic_address_id)
```

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`GET /external_connections/{id}/phone_numbers/{phone_number_id}`

```python
phone_number = client.external_connections.phone_numbers.retrieve(
    phone_number_id="1234567889",
    id="1293384261075731499",
)
print(phone_number.data)
```

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

Optional: `location_id` (uuid)

```python
phone_number = client.external_connections.phone_numbers.update(
    phone_number_id="1234567889",
    id="1293384261075731499",
)
print(phone_number.data)
```

## List all Releases

Returns a list of your Releases for the given external connection.

`GET /external_connections/{id}/releases`

```python
page = client.external_connections.releases.list(
    id="1293384261075731499",
)
page = page.data[0]
print(page.tenant_id)
```

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`GET /external_connections/{id}/releases/{release_id}`

```python
release = client.external_connections.releases.retrieve(
    release_id="7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
    id="1293384261075731499",
)
print(release.data)
```

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`GET /external_connections/{id}/uploads`

```python
page = client.external_connections.uploads.list(
    id="1293384261075731499",
)
page = page.data[0]
print(page.location_id)
```

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers.

`POST /external_connections/{id}/uploads` — Required: `number_ids`

Optional: `additional_usages` (array[string]), `civic_address_id` (uuid), `location_id` (uuid), `usage` (enum)

```python
upload = client.external_connections.uploads.create(
    id="1293384261075731499",
    number_ids=["3920457616934164700", "3920457616934164701", "3920457616934164702", "3920457616934164703"],
)
print(upload.ticket_id)
```

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`POST /external_connections/{id}/uploads/refresh`

```python
response = client.external_connections.uploads.refresh_status(
    "1293384261075731499",
)
print(response.success)
```

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`GET /external_connections/{id}/uploads/status`

```python
response = client.external_connections.uploads.pending_count(
    "1293384261075731499",
)
print(response.data)
```

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`GET /external_connections/{id}/uploads/{ticket_id}`

```python
upload = client.external_connections.uploads.retrieve(
    ticket_id="7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
    id="1293384261075731499",
)
print(upload.data)
```

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request.

`POST /external_connections/{id}/uploads/{ticket_id}/retry`

```python
response = client.external_connections.uploads.retry(
    ticket_id="7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
    id="1293384261075731499",
)
print(response.data)
```

## List uploaded media

Returns a list of stored media files.

`GET /media`

```python
media = client.media.list()
print(media.data)
```

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`POST /media` — Required: `media_url`

Optional: `media_name` (string), `ttl_secs` (integer)

```python
response = client.media.upload(
    media_url="http://www.example.com/audio.mp3",
)
print(response.data)
```

## Retrieve stored media

Returns the information about a stored media file.

`GET /media/{media_name}`

```python
media = client.media.retrieve(
    "media_name",
)
print(media.data)
```

## Update stored media

Updates a stored media file.

`PUT /media/{media_name}`

Optional: `media_url` (string), `ttl_secs` (integer)

```python
media = client.media.update(
    media_name="media_name",
)
print(media.data)
```

## Deletes stored media

Deletes a stored media file.

`DELETE /media/{media_name}`

```python
client.media.delete(
    "media_name",
)
```

## Download stored media

Downloads a stored media file.

`GET /media/{media_name}/download`

```python
response = client.media.download(
    "media_name",
)
print(response)
content = response.read()
print(content)
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user.

`POST /operator_connect/actions/refresh`

```python
response = client.operator_connect.actions.refresh()
print(response.message)
```

## List all recording transcriptions

Returns a list of your recording transcriptions.

`GET /recording_transcriptions`

```python
recording_transcriptions = client.recording_transcriptions.list()
print(recording_transcriptions.data)
```

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`GET /recording_transcriptions/{recording_transcription_id}`

```python
recording_transcription = client.recording_transcriptions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(recording_transcription.data)
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /recording_transcriptions/{recording_transcription_id}`

```python
recording_transcription = client.recording_transcriptions.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(recording_transcription.data)
```

## List all call recordings

Returns a list of your call recordings.

`GET /recordings`

```python
page = client.recordings.list()
page = page.data[0]
print(page.id)
```

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`POST /recordings/actions/delete`

```python
client.recordings.actions.delete(
    ids=["428c31b6-7af4-4bcb-b7f5-5013ef9657c1", "428c31b6-7af4-4bcb-b7f5-5013ef9657c2"],
)
```

## Retrieve a call recording

Retrieves the details of an existing call recording.

`GET /recordings/{recording_id}`

```python
recording = client.recordings.retrieve(
    "recording_id",
)
print(recording.data)
```

## Delete a call recording

Permanently deletes a call recording.

`DELETE /recordings/{recording_id}`

```python
recording = client.recordings.delete(
    "recording_id",
)
print(recording.data)
```

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`POST /siprec_connectors`

```python
siprec_connector = client.siprec_connectors.create(
    host="siprec.telnyx.com",
    name="my-siprec-connector",
    port=5060,
)
print(siprec_connector.data)
```

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`GET /siprec_connectors/{connector_name}`

```python
siprec_connector = client.siprec_connectors.retrieve(
    "connector_name",
)
print(siprec_connector.data)
```

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`PUT /siprec_connectors/{connector_name}`

```python
siprec_connector = client.siprec_connectors.update(
    connector_name="connector_name",
    host="siprec.telnyx.com",
    name="my-siprec-connector",
    port=5060,
)
print(siprec_connector.data)
```

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`DELETE /siprec_connectors/{connector_name}`

```python
client.siprec_connectors.delete(
    "connector_name",
)
```
