---
name: telnyx-sip-integrations-python
description: >-
  Call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking.
metadata:
  author: telnyx
  product: sip-integrations
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - Python

## Core Workflow

### Prerequisites

1. SIP connection configured (see telnyx-sip-python)

### Steps

1. **List call recordings**: `client.call_recordings.list()`
2. **Download recording**: `client.call_recordings.retrieve(id=...) — returns download URL`
3. **Upload media**: `client.media_storage.create(media_url=...)`

### Common mistakes

- Call recordings require recording to be enabled on the connection or via call control commands
- Recording files are temporary — download and store them in your own storage

**Related skills**: telnyx-sip-python, telnyx-voice-python

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.call_recordings.list(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Retrieve a stored credential

Returns the information about custom storage credentials.

`client.custom_storage_credentials.retrieve()` — `GET /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```python
custom_storage_credential = client.custom_storage_credentials.retrieve(
    "connection_id",
)
print(custom_storage_credential.connection_id)
```

Key response fields: `response.data.backend, response.data.configuration`

## Create a custom storage credential

Creates a custom storage credentials configuration.

`client.custom_storage_credentials.create()` — `POST /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```python
custom_storage_credential = client.custom_storage_credentials.create(
    connection_id="550e8400-e29b-41d4-a716-446655440000",
    backend="gcs",
    configuration={
        "backend": "gcs"
    },
)
print(custom_storage_credential.connection_id)
```

Key response fields: `response.data.backend, response.data.configuration`

## Update a stored credential

Updates a stored custom credentials configuration.

`client.custom_storage_credentials.update()` — `PUT /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```python
custom_storage_credential = client.custom_storage_credentials.update(
    connection_id="550e8400-e29b-41d4-a716-446655440000",
    backend="gcs",
    configuration={
        "backend": "gcs"
    },
)
print(custom_storage_credential.connection_id)
```

Key response fields: `response.data.backend, response.data.configuration`

## Delete a stored credential

Deletes a stored custom credentials configuration.

`client.custom_storage_credentials.delete()` — `DELETE /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```python
client.custom_storage_credentials.delete(
    "connection_id",
)
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`client.dialogflow_connections.retrieve()` — `GET /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```python
dialogflow_connection = client.dialogflow_connections.retrieve(
    "connection_id",
)
print(dialogflow_connection.data)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`client.dialogflow_connections.create()` — `POST /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```python
dialogflow_connection = client.dialogflow_connections.create(
    connection_id="550e8400-e29b-41d4-a716-446655440000",
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

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`client.dialogflow_connections.update()` — `PUT /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```python
dialogflow_connection = client.dialogflow_connections.update(
    connection_id="550e8400-e29b-41d4-a716-446655440000",
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

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`client.dialogflow_connections.delete()` — `DELETE /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```python
client.dialogflow_connections.delete(
    "connection_id",
)
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response. External Connections are used by Telnyx customers to seamless configure SIP trunking integrations with Telnyx Partners, through External Voice Integrations in Mission Control Portal.

`client.external_connections.list()` — `GET /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for external connections (deepObject style)... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.external_connections.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request. The external_sip_connection and outbound voice profile id are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.external_connections.create()` — `POST /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `external_sip_connection` | enum (zoom) | Yes | The service that will be consuming this connection. |
| `outbound` | object | Yes |  |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhook_event_url` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```python
external_connection = client.external_connections.create(
    external_sip_connection="zoom",
    outbound={},
)
print(external_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`client.external_connections.log_messages.list()` — `GET /external_connections/log_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for log messages (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.external_connections.log_messages.list()
page = page.log_messages[0]
print(page.code)
```

Key response fields: `response.data.log_messages, response.data.meta`

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`client.external_connections.log_messages.retrieve()` — `GET /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
log_message = client.external_connections.log_messages.retrieve(
    "1293384261075731499",
)
print(log_message.log_messages)
```

Key response fields: `response.data.log_messages`

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`client.external_connections.log_messages.dismiss()` — `DELETE /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.external_connections.log_messages.dismiss(
    "1293384261075731499",
)
print(response.success)
```

Key response fields: `response.data.success`

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`client.external_connections.retrieve()` — `GET /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
external_connection = client.external_connections.retrieve(
    "1293384261075731499",
)
print(external_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`client.external_connections.update()` — `PATCH /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `outbound` | object | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhook_event_url` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```python
external_connection = client.external_connections.update(
    id="1293384261075731499",
    outbound={
        "outbound_voice_profile_id": "1911630617284445511"
    },
)
print(external_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes an External Connection

Permanently deletes an External Connection. Deletion may be prevented if the application is in use by phone numbers, is active, or if it is an Operator Connect connection. To remove an Operator Connect integration please contact Telnyx support.

`client.external_connections.delete()` — `DELETE /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
external_connection = client.external_connections.delete(
    "1293384261075731499",
)
print(external_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`client.external_connections.civic_addresses.list()` — `GET /external_connections/{id}/civic_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for civic addresses (deepObject style). |

```python
civic_addresses = client.external_connections.civic_addresses.list(
    id="1293384261075731499",
)
print(civic_addresses.data)
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`client.external_connections.civic_addresses.retrieve()` — `GET /external_connections/{id}/civic_addresses/{address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `address_id` | string (UUID) | Yes | Identifies a civic address or a location. |

```python
civic_address = client.external_connections.civic_addresses.retrieve(
    address_id="318fb664-d341-44d2-8405-e6bfb9ced6d9",
    id="1293384261075731499",
)
print(civic_address.data)
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Update a location's static emergency address

`client.external_connections.update_location()` — `PATCH /external_connections/{id}/locations/{location_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `static_emergency_address_id` | string (UUID) | Yes | A new static emergency address ID to update the location wit... |
| `id` | string (UUID) | Yes | The ID of the external connection |
| `location_id` | string (UUID) | Yes | The ID of the location to update |

```python
response = client.external_connections.update_location(
    location_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    static_emergency_address_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.accepted_address_suggestions, response.data.location_id, response.data.static_emergency_address_id`

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`client.external_connections.phone_numbers.list()` — `GET /external_connections/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for phone numbers (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.external_connections.phone_numbers.list(
    id="1293384261075731499",
)
page = page.data[0]
print(page.civic_address_id)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`client.external_connections.phone_numbers.retrieve()` — `GET /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phone_number_id` | string (UUID) | Yes | A phone number's ID via the Telnyx API |

```python
phone_number = client.external_connections.phone_numbers.retrieve(
    phone_number_id="1234567889",
    id="1293384261075731499",
)
print(phone_number.data)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`client.external_connections.phone_numbers.update()` — `PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phone_number_id` | string (UUID) | Yes | A phone number's ID via the Telnyx API |
| `location_id` | string (UUID) | No | Identifies the location to assign the phone number to. |

```python
phone_number = client.external_connections.phone_numbers.update(
    phone_number_id="1234567889",
    id="1293384261075731499",
)
print(phone_number.data)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## List all Releases

Returns a list of your Releases for the given external connection. These are automatically created when you change the `connection_id` of a phone number that is currently on Microsoft Teams.

`client.external_connections.releases.list()` — `GET /external_connections/{id}/releases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for releases (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.external_connections.releases.list(
    id="1293384261075731499",
)
page = page.data[0]
print(page.tenant_id)
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`client.external_connections.releases.retrieve()` — `GET /external_connections/{id}/releases/{release_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `release_id` | string (UUID) | Yes | Identifies a Release request |

```python
release = client.external_connections.releases.retrieve(
    release_id="7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
    id="1293384261075731499",
)
print(release.data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`client.external_connections.uploads.list()` — `GET /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for uploads (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.external_connections.uploads.list(
    id="1293384261075731499",
)
page = page.data[0]
print(page.location_id)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers. Only one of civic_address_id or location_id must be provided, not both. The maximum allowed phone numbers for the numbers_ids array is 1000.

`client.external_connections.uploads.create()` — `POST /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_ids` | array[string] | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | No | The use case of the upload request. |
| `location_id` | string (UUID) | No | Identifies the location to assign all phone numbers to. |
| `civic_address_id` | string (UUID) | No | Identifies the civic address to assign all phone numbers to. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
upload = client.external_connections.uploads.create(
    id="1293384261075731499",
    number_ids=["3920457616934164700", "3920457616934164701", "3920457616934164702", "3920457616934164703"],
)
print(upload.ticket_id)
```

Key response fields: `response.data.success, response.data.ticket_id`

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`client.external_connections.uploads.refresh_status()` — `POST /external_connections/{id}/uploads/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.external_connections.uploads.refresh_status(
    "1293384261075731499",
)
print(response.success)
```

Key response fields: `response.data.success`

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`client.external_connections.uploads.pending_count()` — `GET /external_connections/{id}/uploads/status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.external_connections.uploads.pending_count(
    "1293384261075731499",
)
print(response.data)
```

Key response fields: `response.data.pending_numbers_count, response.data.pending_orders_count`

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`client.external_connections.uploads.retrieve()` — `GET /external_connections/{id}/uploads/{ticket_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticket_id` | string (UUID) | Yes | Identifies an Upload request |

```python
upload = client.external_connections.uploads.retrieve(
    ticket_id="7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
    id="1293384261075731499",
)
print(upload.data)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request. In some cases this will reattempt the existing upload request, in other cases it may create a new upload request. Please check the ticket_id in the response to determine if a new upload request was created.

`client.external_connections.uploads.retry()` — `POST /external_connections/{id}/uploads/{ticket_id}/retry`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticket_id` | string (UUID) | Yes | Identifies an Upload request |

```python
response = client.external_connections.uploads.retry(
    ticket_id="7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
    id="1293384261075731499",
)
print(response.data)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## List uploaded media

Returns a list of stored media files.

`client.media.list()` — `GET /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
media = client.media.list()
print(media.data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`client.media.upload()` — `POST /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_url` | string (URL) | Yes | The URL where the media to be stored in Telnyx network is cu... |
| `ttl_secs` | integer | No | The number of seconds after which the media resource will be... |
| `media_name` | string | No | The unique identifier of a file. |

```python
response = client.media.upload(
    media_url="http://www.example.com/audio.mp3",
)
print(response.data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Retrieve stored media

Returns the information about a stored media file.

`client.media.retrieve()` — `GET /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```python
media = client.media.retrieve(
    "media_name",
)
print(media.data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Update stored media

Updates a stored media file.

`client.media.update()` — `PUT /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |
| `media_url` | string (URL) | No | The URL where the media to be stored in Telnyx network is cu... |
| `ttl_secs` | integer | No | The number of seconds after which the media resource will be... |

```python
media = client.media.update(
    media_name="media_name",
)
print(media.data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Deletes stored media

Deletes a stored media file.

`client.media.delete()` — `DELETE /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```python
client.media.delete(
    "media_name",
)
```

## Download stored media

Downloads a stored media file.

`client.media.download()` — `GET /media/{media_name}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```python
response = client.media.download(
    "media_name",
)
print(response)
content = response.read()
print(content)
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user. This will create new external connections on the user's account if needed, and/or report the integration results as [log messages](https://developers.telnyx.com/api-reference/external-connections/list-all-log-messages#list-all-log-messages).

`client.operator_connect.actions.refresh()` — `POST /operator_connect/actions/refresh`

```python
response = client.operator_connect.actions.refresh()
print(response.message)
```

Key response fields: `response.data.message, response.data.success`

## List all recording transcriptions

Returns a list of your recording transcriptions.

`client.recording_transcriptions.list()` — `GET /recording_transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recording transcriptions by various attributes. |

```python
page = client.recording_transcriptions.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`client.recording_transcriptions.retrieve()` — `GET /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_transcription_id` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```python
recording_transcription = client.recording_transcriptions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(recording_transcription.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.recording_transcriptions.delete()` — `DELETE /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_transcription_id` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```python
recording_transcription = client.recording_transcriptions.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(recording_transcription.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all call recordings

Returns a list of your call recordings.

`client.recordings.list()` — `GET /recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recordings by various attributes. |

```python
page = client.recordings.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`client.recordings.actions.delete()` — `POST /recordings/actions/delete`

```python
action = client.recordings.actions.delete(
    ids=["428c31b6-7af4-4bcb-b7f5-5013ef9657c1", "428c31b6-7af4-4bcb-b7f5-5013ef9657c2"],
)
print(action.status)
```

Key response fields: `response.data.status`

## Retrieve a call recording

Retrieves the details of an existing call recording.

`client.recordings.retrieve()` — `GET /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_id` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```python
recording = client.recordings.retrieve(
    "recording_id",
)
print(recording.data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a call recording

Permanently deletes a call recording.

`client.recordings.delete()` — `DELETE /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_id` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```python
recording = client.recordings.delete(
    "recording_id",
)
print(recording.data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`client.siprec_connectors.create()` — `POST /siprec_connectors`

```python
siprec_connector = client.siprec_connectors.create(
    host="siprec.telnyx.com",
    name="my-siprec-connector",
    port=5060,
)
print(siprec_connector.data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`client.siprec_connectors.retrieve()` — `GET /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```python
siprec_connector = client.siprec_connectors.retrieve(
    "connector_name",
)
print(siprec_connector.data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`client.siprec_connectors.update()` — `PUT /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```python
siprec_connector = client.siprec_connectors.update(
    connector_name="connector_name",
    host="siprec.telnyx.com",
    name="my-siprec-connector",
    port=5060,
)
print(siprec_connector.data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`client.siprec_connectors.delete()` — `DELETE /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```python
client.siprec_connectors.delete(
    "connector_name",
)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
