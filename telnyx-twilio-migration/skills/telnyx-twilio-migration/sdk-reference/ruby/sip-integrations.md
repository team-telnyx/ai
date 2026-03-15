<!-- SDK reference: telnyx-sip-integrations-ruby -->

# Telnyx Sip Integrations - Ruby

## Core Workflow

### Prerequisites

1. SIP connection configured (see telnyx-sip-ruby)

### Steps

1. **List call recordings**: `client.call_recordings.list()`
2. **Download recording**: `client.call_recordings.retrieve(id: ...)`
3. **Upload media**: `client.media_storage.create(media_url: ...)`

### Common mistakes

- Call recordings require recording to be enabled on the connection or via call control commands
- Recording files are temporary — download and store them in your own storage

**Related skills**: telnyx-sip-ruby, telnyx-voice-ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.call_recordings.list(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Retrieve a stored credential

Returns the information about custom storage credentials.

`client.custom_storage_credentials.retrieve()` — `GET /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```ruby
custom_storage_credential = client.custom_storage_credentials.retrieve("connection_id")

puts(custom_storage_credential)
```

Key response fields: `response.data.backend, response.data.configuration`

## Create a custom storage credential

Creates a custom storage credentials configuration.

`client.custom_storage_credentials.create()` — `POST /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```ruby
custom_storage_credential = client.custom_storage_credentials.create("connection_id", backend: :gcs, configuration: {backend: :gcs})

puts(custom_storage_credential)
```

Key response fields: `response.data.backend, response.data.configuration`

## Update a stored credential

Updates a stored custom credentials configuration.

`client.custom_storage_credentials.update()` — `PUT /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```ruby
custom_storage_credential = client.custom_storage_credentials.update("connection_id", backend: :gcs, configuration: {backend: :gcs})

puts(custom_storage_credential)
```

Key response fields: `response.data.backend, response.data.configuration`

## Delete a stored credential

Deletes a stored custom credentials configuration.

`client.custom_storage_credentials.delete()` — `DELETE /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```ruby
result = client.custom_storage_credentials.delete("connection_id")

puts(result)
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`client.dialogflow_connections.retrieve()` — `GET /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```ruby
dialogflow_connection = client.dialogflow_connections.retrieve("connection_id")

puts(dialogflow_connection)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`client.dialogflow_connections.create()` — `POST /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```ruby
dialogflow_connection = client.dialogflow_connections.create(
  "connection_id",
  service_account: {
    type: "bar",
    project_id: "bar",
    private_key_id: "bar",
    private_key: "bar",
    client_email: "bar",
    client_id: "bar",
    auth_uri: "bar",
    token_uri: "bar",
    auth_provider_x509_cert_url: "bar",
    client_x509_cert_url: "bar"
  }
)

puts(dialogflow_connection)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`client.dialogflow_connections.update()` — `PUT /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```ruby
dialogflow_connection = client.dialogflow_connections.update(
  "connection_id",
  service_account: {
    type: "bar",
    project_id: "bar",
    private_key_id: "bar",
    private_key: "bar",
    client_email: "bar",
    client_id: "bar",
    auth_uri: "bar",
    token_uri: "bar",
    auth_provider_x509_cert_url: "bar",
    client_x509_cert_url: "bar"
  }
)

puts(dialogflow_connection)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`client.dialogflow_connections.delete()` — `DELETE /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```ruby
result = client.dialogflow_connections.delete("connection_id")

puts(result)
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response. External Connections are used by Telnyx customers to seamless configure SIP trunking integrations with Telnyx Partners, through External Voice Integrations in Mission Control Portal.

`client.external_connections.list()` — `GET /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for external connections (deepObject style)... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.external_connections.list

puts(page)
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
| ... | | | +3 optional params in the API Details section below |

```ruby
external_connection = client.external_connections.create(external_sip_connection: :zoom, outbound: {})

puts(external_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`client.external_connections.log_messages.list()` — `GET /external_connections/log_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for log messages (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.external_connections.log_messages.list

puts(page)
```

Key response fields: `response.data.log_messages, response.data.meta`

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`client.external_connections.log_messages.retrieve()` — `GET /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
log_message = client.external_connections.log_messages.retrieve("1293384261075731499")

puts(log_message)
```

Key response fields: `response.data.log_messages`

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`client.external_connections.log_messages.dismiss()` — `DELETE /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.external_connections.log_messages.dismiss("1293384261075731499")

puts(response)
```

Key response fields: `response.data.success`

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`client.external_connections.retrieve()` — `GET /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
external_connection = client.external_connections.retrieve("1293384261075731499")

puts(external_connection)
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
| ... | | | +3 optional params in the API Details section below |

```ruby
external_connection = client.external_connections.update(
  "1293384261075731499",
  outbound: {outbound_voice_profile_id: "1911630617284445511"}
)

puts(external_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes an External Connection

Permanently deletes an External Connection. Deletion may be prevented if the application is in use by phone numbers, is active, or if it is an Operator Connect connection. To remove an Operator Connect integration please contact Telnyx support.

`client.external_connections.delete()` — `DELETE /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
external_connection = client.external_connections.delete("1293384261075731499")

puts(external_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`client.external_connections.civic_addresses.list()` — `GET /external_connections/{id}/civic_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for civic addresses (deepObject style). |

```ruby
civic_addresses = client.external_connections.civic_addresses.list("1293384261075731499")

puts(civic_addresses)
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`client.external_connections.civic_addresses.retrieve()` — `GET /external_connections/{id}/civic_addresses/{address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `address_id` | string (UUID) | Yes | Identifies a civic address or a location. |

```ruby
civic_address = client.external_connections.civic_addresses.retrieve(
  "318fb664-d341-44d2-8405-e6bfb9ced6d9",
  id: "1293384261075731499"
)

puts(civic_address)
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Update a location's static emergency address

`client.external_connections.update_location()` — `PATCH /external_connections/{id}/locations/{location_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `static_emergency_address_id` | string (UUID) | Yes | A new static emergency address ID to update the location wit... |
| `id` | string (UUID) | Yes | The ID of the external connection |
| `location_id` | string (UUID) | Yes | The ID of the location to update |

```ruby
response = client.external_connections.update_location(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  static_emergency_address_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
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

```ruby
page = client.external_connections.phone_numbers.list("1293384261075731499")

puts(page)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`client.external_connections.phone_numbers.retrieve()` — `GET /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phone_number_id` | string (UUID) | Yes | A phone number's ID via the Telnyx API |

```ruby
phone_number = client.external_connections.phone_numbers.retrieve("1234567889", id: "1293384261075731499")

puts(phone_number)
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

```ruby
phone_number = client.external_connections.phone_numbers.update("1234567889", id: "1293384261075731499")

puts(phone_number)
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

```ruby
page = client.external_connections.releases.list("1293384261075731499")

puts(page)
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`client.external_connections.releases.retrieve()` — `GET /external_connections/{id}/releases/{release_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `release_id` | string (UUID) | Yes | Identifies a Release request |

```ruby
release = client.external_connections.releases.retrieve(
  "7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
  id: "1293384261075731499"
)

puts(release)
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

```ruby
page = client.external_connections.uploads.list("1293384261075731499")

puts(page)
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
| ... | | | +1 optional params in the API Details section below |

```ruby
upload = client.external_connections.uploads.create(
  "1293384261075731499",
  number_ids: ["3920457616934164700", "3920457616934164701", "3920457616934164702", "3920457616934164703"]
)

puts(upload)
```

Key response fields: `response.data.success, response.data.ticket_id`

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`client.external_connections.uploads.refresh_status()` — `POST /external_connections/{id}/uploads/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.external_connections.uploads.refresh_status("1293384261075731499")

puts(response)
```

Key response fields: `response.data.success`

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`client.external_connections.uploads.pending_count()` — `GET /external_connections/{id}/uploads/status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.external_connections.uploads.pending_count("1293384261075731499")

puts(response)
```

Key response fields: `response.data.pending_numbers_count, response.data.pending_orders_count`

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`client.external_connections.uploads.retrieve()` — `GET /external_connections/{id}/uploads/{ticket_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticket_id` | string (UUID) | Yes | Identifies an Upload request |

```ruby
upload = client.external_connections.uploads.retrieve(
  "7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
  id: "1293384261075731499"
)

puts(upload)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request. In some cases this will reattempt the existing upload request, in other cases it may create a new upload request. Please check the ticket_id in the response to determine if a new upload request was created.

`client.external_connections.uploads.retry_()` — `POST /external_connections/{id}/uploads/{ticket_id}/retry`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticket_id` | string (UUID) | Yes | Identifies an Upload request |

```ruby
response = client.external_connections.uploads.retry_(
  "7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
  id: "1293384261075731499"
)

puts(response)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## List uploaded media

Returns a list of stored media files.

`client.media.list()` — `GET /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
media = client.media.list

puts(media)
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

```ruby
response = client.media.upload(media_url: "http://www.example.com/audio.mp3")

puts(response)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Retrieve stored media

Returns the information about a stored media file.

`client.media.retrieve()` — `GET /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```ruby
media = client.media.retrieve("media_name")

puts(media)
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

```ruby
media = client.media.update("media_name")

puts(media)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Deletes stored media

Deletes a stored media file.

`client.media.delete()` — `DELETE /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```ruby
result = client.media.delete("media_name")

puts(result)
```

## Download stored media

Downloads a stored media file.

`client.media.download()` — `GET /media/{media_name}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```ruby
response = client.media.download("media_name")

puts(response)
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user. This will create new external connections on the user's account if needed, and/or report the integration results as [log messages](https://developers.telnyx.com/api-reference/external-connections/list-all-log-messages#list-all-log-messages).

`client.operator_connect.actions.refresh()` — `POST /operator_connect/actions/refresh`

```ruby
response = client.operator_connect.actions.refresh

puts(response)
```

Key response fields: `response.data.message, response.data.success`

## List all recording transcriptions

Returns a list of your recording transcriptions.

`client.recording_transcriptions.list()` — `GET /recording_transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recording transcriptions by various attributes. |

```ruby
page = client.recording_transcriptions.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`client.recording_transcriptions.retrieve()` — `GET /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_transcription_id` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```ruby
recording_transcription = client.recording_transcriptions.retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58")

puts(recording_transcription)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.recording_transcriptions.delete()` — `DELETE /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_transcription_id` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```ruby
recording_transcription = client.recording_transcriptions.delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58")

puts(recording_transcription)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all call recordings

Returns a list of your call recordings.

`client.recordings.list()` — `GET /recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recordings by various attributes. |

```ruby
page = client.recordings.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`client.recordings.actions.delete()` — `POST /recordings/actions/delete`

```ruby
action = client.recordings.actions.delete(
  ids: ["428c31b6-7af4-4bcb-b7f5-5013ef9657c1", "428c31b6-7af4-4bcb-b7f5-5013ef9657c2"]
)

puts(action)
```

Key response fields: `response.data.status`

## Retrieve a call recording

Retrieves the details of an existing call recording.

`client.recordings.retrieve()` — `GET /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_id` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```ruby
recording = client.recordings.retrieve("recording_id")

puts(recording)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a call recording

Permanently deletes a call recording.

`client.recordings.delete()` — `DELETE /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_id` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```ruby
recording = client.recordings.delete("recording_id")

puts(recording)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`client.siprec_connectors.create()` — `POST /siprec_connectors`

```ruby
siprec_connector = client.siprec_connectors.create(host: "siprec.client.com", name: "my-siprec-connector", port: 5060)

puts(siprec_connector)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`client.siprec_connectors.retrieve()` — `GET /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```ruby
siprec_connector = client.siprec_connectors.retrieve("connector_name")

puts(siprec_connector)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`client.siprec_connectors.update()` — `PUT /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```ruby
siprec_connector = client.siprec_connectors.update(
  "connector_name",
  host: "siprec.client.com",
  name: "my-siprec-connector",
  port: 5060
)

puts(siprec_connector)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`client.siprec_connectors.delete()` — `DELETE /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```ruby
result = client.siprec_connectors.delete("connector_name")

puts(result)
```

---

# SIP Integrations (Ruby) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Retrieve a stored credential, Create a custom storage credential, Update a stored credential

| Field | Type |
|-------|------|
| `backend` | enum: gcs, s3, azure |
| `configuration` | object |

**Returned by:** Retrieve stored Dialogflow Connection, Create a Dialogflow Connection, Update stored Dialogflow Connection

| Field | Type |
|-------|------|
| `connection_id` | string |
| `conversation_profile_id` | string |
| `environment` | string |
| `record_type` | string |
| `service_account` | string |

**Returned by:** List all External Connections, Creates an External Connection, Retrieve an External Connection, Update an External Connection, Deletes an External Connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `created_at` | string |
| `credential_active` | boolean |
| `external_sip_connection` | enum: zoom, operator_connect |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | string |
| `tags` | array[string] |
| `updated_at` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** List all log messages

| Field | Type |
|-------|------|
| `log_messages` | array[object] |
| `meta` | object |

**Returned by:** Retrieve a log message

| Field | Type |
|-------|------|
| `log_messages` | array[object] |

**Returned by:** Dismiss a log message, Refresh the status of all Upload requests

| Field | Type |
|-------|------|
| `success` | boolean |

**Returned by:** List all civic addresses and locations, Retrieve a Civic Address

| Field | Type |
|-------|------|
| `city_or_town` | string |
| `city_or_town_alias` | string |
| `company_name` | string |
| `country` | string |
| `country_or_district` | string |
| `default_location_id` | uuid |
| `description` | string |
| `house_number` | string |
| `house_number_suffix` | string |
| `id` | uuid |
| `locations` | array[object] |
| `postal_or_zip_code` | string |
| `record_type` | string |
| `state_or_province` | string |
| `street_name` | string |
| `street_suffix` | string |

**Returned by:** Update a location's static emergency address

| Field | Type |
|-------|------|
| `accepted_address_suggestions` | boolean |
| `location_id` | uuid |
| `static_emergency_address_id` | uuid |

**Returned by:** List all phone numbers, Retrieve a phone number, Update a phone number

| Field | Type |
|-------|------|
| `acquired_capabilities` | array[string] |
| `civic_address_id` | uuid |
| `displayed_country_code` | string |
| `location_id` | uuid |
| `number_id` | string |
| `telephone_number` | string |
| `ticket_id` | uuid |

**Returned by:** List all Releases, Retrieve a Release request

| Field | Type |
|-------|------|
| `created_at` | string |
| `error_message` | string |
| `status` | enum: pending_upload, pending, in_progress, complete, failed, expired, unknown |
| `telephone_numbers` | array[object] |
| `tenant_id` | uuid |
| `ticket_id` | uuid |

**Returned by:** List all Upload requests, Retrieve an Upload request, Retry an Upload request

| Field | Type |
|-------|------|
| `available_usages` | array[string] |
| `error_code` | string |
| `error_message` | string |
| `location_id` | uuid |
| `status` | enum: pending_upload, pending, in_progress, partial_success, success, error |
| `tenant_id` | uuid |
| `ticket_id` | uuid |
| `tn_upload_entries` | array[object] |

**Returned by:** Creates an Upload request

| Field | Type |
|-------|------|
| `success` | boolean |
| `ticket_id` | uuid |

**Returned by:** Get the count of pending upload requests

| Field | Type |
|-------|------|
| `pending_numbers_count` | integer |
| `pending_orders_count` | integer |

**Returned by:** List uploaded media, Upload media, Retrieve stored media, Update stored media

| Field | Type |
|-------|------|
| `content_type` | string |
| `created_at` | string |
| `expires_at` | string |
| `media_name` | string |
| `updated_at` | string |

**Returned by:** Refresh Operator Connect integration

| Field | Type |
|-------|------|
| `message` | string |
| `success` | boolean |

**Returned by:** List all recording transcriptions, Retrieve a recording transcription, Delete a recording transcription

| Field | Type |
|-------|------|
| `created_at` | string |
| `duration_millis` | int32 |
| `id` | string |
| `record_type` | enum: recording_transcription |
| `recording_id` | string |
| `status` | enum: in-progress, completed |
| `transcription_text` | string |
| `updated_at` | string |

**Returned by:** List all call recordings, Retrieve a call recording, Delete a call recording

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_leg_id` | string |
| `call_session_id` | string |
| `channels` | enum: single, dual |
| `conference_id` | string |
| `connection_id` | string |
| `created_at` | string |
| `download_urls` | object |
| `duration_millis` | int32 |
| `from` | string |
| `id` | string |
| `initiated_by` | string |
| `record_type` | enum: recording |
| `recording_ended_at` | string |
| `recording_started_at` | string |
| `source` | enum: conference, call |
| `status` | enum: completed |
| `to` | string |
| `updated_at` | string |

**Returned by:** Delete a list of call recordings

| Field | Type |
|-------|------|
| `status` | enum: ok |

**Returned by:** Create a SIPREC connector, Retrieve a SIPREC connector, Update a SIPREC connector

| Field | Type |
|-------|------|
| `app_subdomain` | string |
| `created_at` | string |
| `host` | string |
| `name` | string |
| `port` | integer |
| `record_type` | string |
| `updated_at` | string |

## Optional Parameters

### Creates an External Connection — `client.external_connections.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `tags` | array[string] | Tags associated with the connection. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `inbound` | object |  |

### Update an External Connection — `client.external_connections.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `tags` | array[string] | Tags associated with the connection. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `inbound` | object |  |

### Update a phone number — `client.external_connections.phone_numbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `location_id` | string (UUID) | Identifies the location to assign the phone number to. |

### Creates an Upload request — `client.external_connections.uploads.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | The use case of the upload request. |
| `additional_usages` | array[string] |  |
| `location_id` | string (UUID) | Identifies the location to assign all phone numbers to. |
| `civic_address_id` | string (UUID) | Identifies the civic address to assign all phone numbers to. |

### Upload media — `client.media.upload()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttl_secs` | integer | The number of seconds after which the media resource will be deleted, default... |
| `media_name` | string | The unique identifier of a file. |

### Update stored media — `client.media.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `media_url` | string (URL) | The URL where the media to be stored in Telnyx network is currently hosted. |
| `ttl_secs` | integer | The number of seconds after which the media resource will be deleted, default... |
