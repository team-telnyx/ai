<!-- SDK reference: telnyx-sip-integrations-curl -->

# Telnyx Sip Integrations - curl

## Core Workflow

### Prerequisites

1. SIP connection configured (see telnyx-sip-curl)

### Steps

1. **List call recordings**
2. **Download recording**
3. **Upload media**

### Common mistakes

- Call recordings require recording to be enabled on the connection or via call control commands
- Recording files are temporary — download and store them in your own storage

**Related skills**: telnyx-sip-curl, telnyx-voice-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Retrieve a stored credential

Returns the information about custom storage credentials.

`GET /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/custom_storage_credentials/{connection_id}"
```

Key response fields: `.data.backend, .data.configuration`

## Create a custom storage credential

Creates a custom storage credentials configuration.

`POST /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/custom_storage_credentials/{connection_id}"
```

Key response fields: `.data.backend, .data.configuration`

## Update a stored credential

Updates a stored custom credentials configuration.

`PUT /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/custom_storage_credentials/{connection_id}"
```

Key response fields: `.data.backend, .data.configuration`

## Delete a stored credential

Deletes a stored custom credentials configuration.

`DELETE /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/custom_storage_credentials/{connection_id}"
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`GET /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/dialogflow_connections/{connection_id}"
```

Key response fields: `.data.connection_id, .data.conversation_profile_id, .data.environment`

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`POST /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/dialogflow_connections/{connection_id}"
```

Key response fields: `.data.connection_id, .data.conversation_profile_id, .data.environment`

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`PUT /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/dialogflow_connections/{connection_id}"
```

Key response fields: `.data.connection_id, .data.conversation_profile_id, .data.environment`

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`DELETE /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/dialogflow_connections/{connection_id}"
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response. External Connections are used by Telnyx customers to seamless configure SIP trunking integrations with Telnyx Partners, through External Voice Integrations in Mission Control Portal.

`GET /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for external connections (deepObject style)... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request. The external_sip_connection and outbound voice profile id are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`POST /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `external_sip_connection` | enum (zoom) | Yes | The service that will be consuming this connection. |
| `outbound` | object | Yes |  |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhook_event_url` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "external_sip_connection": "zoom",
  "outbound": {}
}' \
  "https://api.telnyx.com/v2/external_connections"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`GET /external_connections/log_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for log messages (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/log_messages"
```

Key response fields: `.data.log_messages, .data.meta`

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`GET /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/log_messages/1293384261075731499"
```

Key response fields: `.data.log_messages`

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`DELETE /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/external_connections/log_messages/1293384261075731499"
```

Key response fields: `.data.success`

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`GET /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`PATCH /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `outbound` | object | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhook_event_url` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "outbound": {}
}' \
  "https://api.telnyx.com/v2/external_connections/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Deletes an External Connection

Permanently deletes an External Connection. Deletion may be prevented if the application is in use by phone numbers, is active, or if it is an Operator Connect connection. To remove an Operator Connect integration please contact Telnyx support.

`DELETE /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/external_connections/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`GET /external_connections/{id}/civic_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for civic addresses (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/civic_addresses"
```

Key response fields: `.data.id, .data.city_or_town, .data.city_or_town_alias`

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`GET /external_connections/{id}/civic_addresses/{address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `address_id` | string (UUID) | Yes | Identifies a civic address or a location. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/civic_addresses/318fb664-d341-44d2-8405-e6bfb9ced6d9"
```

Key response fields: `.data.id, .data.city_or_town, .data.city_or_town_alias`

## Update a location's static emergency address

`PATCH /external_connections/{id}/locations/{location_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `static_emergency_address_id` | string (UUID) | Yes | A new static emergency address ID to update the location wit... |
| `id` | string (UUID) | Yes | The ID of the external connection |
| `location_id` | string (UUID) | Yes | The ID of the location to update |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "static_emergency_address_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/external_connections/550e8400-e29b-41d4-a716-446655440000/locations/{location_id}"
```

Key response fields: `.data.accepted_address_suggestions, .data.location_id, .data.static_emergency_address_id`

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`GET /external_connections/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for phone numbers (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/phone_numbers"
```

Key response fields: `.data.acquired_capabilities, .data.civic_address_id, .data.displayed_country_code`

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`GET /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phone_number_id` | string (UUID) | Yes | A phone number's ID via the Telnyx API |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/phone_numbers/1234567889"
```

Key response fields: `.data.acquired_capabilities, .data.civic_address_id, .data.displayed_country_code`

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phone_number_id` | string (UUID) | Yes | A phone number's ID via the Telnyx API |
| `location_id` | string (UUID) | No | Identifies the location to assign the phone number to. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/external_connections/1293384261075731499/phone_numbers/1234567889"
```

Key response fields: `.data.acquired_capabilities, .data.civic_address_id, .data.displayed_country_code`

## List all Releases

Returns a list of your Releases for the given external connection. These are automatically created when you change the `connection_id` of a phone number that is currently on Microsoft Teams.

`GET /external_connections/{id}/releases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for releases (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/releases"
```

Key response fields: `.data.status, .data.created_at, .data.error_message`

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`GET /external_connections/{id}/releases/{release_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `release_id` | string (UUID) | Yes | Identifies a Release request |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/releases/7b6a6449-b055-45a6-81f6-f6f0dffa4cc6"
```

Key response fields: `.data.status, .data.created_at, .data.error_message`

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`GET /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for uploads (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/uploads"
```

Key response fields: `.data.status, .data.available_usages, .data.error_code`

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers. Only one of civic_address_id or location_id must be provided, not both. The maximum allowed phone numbers for the numbers_ids array is 1000.

`POST /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number_ids` | array[string] | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | No | The use case of the upload request. |
| `location_id` | string (UUID) | No | Identifies the location to assign all phone numbers to. |
| `civic_address_id` | string (UUID) | No | Identifies the civic address to assign all phone numbers to. |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "number_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ]
}' \
  "https://api.telnyx.com/v2/external_connections/1293384261075731499/uploads"
```

Key response fields: `.data.success, .data.ticket_id`

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`POST /external_connections/{id}/uploads/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/external_connections/1293384261075731499/uploads/refresh"
```

Key response fields: `.data.success`

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`GET /external_connections/{id}/uploads/status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/uploads/status"
```

Key response fields: `.data.pending_numbers_count, .data.pending_orders_count`

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`GET /external_connections/{id}/uploads/{ticket_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticket_id` | string (UUID) | Yes | Identifies an Upload request |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/external_connections/1293384261075731499/uploads/7b6a6449-b055-45a6-81f6-f6f0dffa4cc6"
```

Key response fields: `.data.status, .data.available_usages, .data.error_code`

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request. In some cases this will reattempt the existing upload request, in other cases it may create a new upload request. Please check the ticket_id in the response to determine if a new upload request was created.

`POST /external_connections/{id}/uploads/{ticket_id}/retry`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticket_id` | string (UUID) | Yes | Identifies an Upload request |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/external_connections/1293384261075731499/uploads/7b6a6449-b055-45a6-81f6-f6f0dffa4cc6/retry"
```

Key response fields: `.data.status, .data.available_usages, .data.error_code`

## List uploaded media

Returns a list of stored media files.

`GET /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/media"
```

Key response fields: `.data.created_at, .data.updated_at, .data.content_type`

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`POST /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_url` | string (URL) | Yes | The URL where the media to be stored in Telnyx network is cu... |
| `ttl_secs` | integer | No | The number of seconds after which the media resource will be... |
| `media_name` | string | No | The unique identifier of a file. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "media=@/path/to/file" \
  -F "ttl_secs=86400" \
  -F "media_name=my_file" \
  "https://api.telnyx.com/v2/media"
```

Key response fields: `.data.created_at, .data.updated_at, .data.content_type`

## Retrieve stored media

Returns the information about a stored media file.

`GET /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/media/{media_name}"
```

Key response fields: `.data.created_at, .data.updated_at, .data.content_type`

## Update stored media

Updates a stored media file.

`PUT /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |
| `media_url` | string (URL) | No | The URL where the media to be stored in Telnyx network is cu... |
| `ttl_secs` | integer | No | The number of seconds after which the media resource will be... |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "media=@/path/to/file" \
  -F "ttl_secs=86400" \
  "https://api.telnyx.com/v2/media/{media_name}"
```

Key response fields: `.data.created_at, .data.updated_at, .data.content_type`

## Deletes stored media

Deletes a stored media file.

`DELETE /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/media/{media_name}"
```

## Download stored media

Downloads a stored media file.

`GET /media/{media_name}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media_name` | string | Yes | Uniquely identifies a media resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/media/{media_name}/download"
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user. This will create new external connections on the user's account if needed, and/or report the integration results as [log messages](https://developers.telnyx.com/api-reference/external-connections/list-all-log-messages#list-all-log-messages).

`POST /operator_connect/actions/refresh`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/operator_connect/actions/refresh"
```

Key response fields: `.data.message, .data.success`

## List all recording transcriptions

Returns a list of your recording transcriptions.

`GET /recording_transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recording transcriptions by various attributes. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/recording_transcriptions"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`GET /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_transcription_id` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/recording_transcriptions/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_transcription_id` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/recording_transcriptions/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List all call recordings

Returns a list of your call recordings.

`GET /recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recordings by various attributes. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/recordings"
```

Key response fields: `.data.id, .data.status, .data.to`

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`POST /recordings/actions/delete`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/recordings/actions/delete"
```

Key response fields: `.data.status`

## Retrieve a call recording

Retrieves the details of an existing call recording.

`GET /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_id` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/recordings/{recording_id}"
```

Key response fields: `.data.id, .data.status, .data.to`

## Delete a call recording

Permanently deletes a call recording.

`DELETE /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recording_id` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/recordings/{recording_id}"
```

Key response fields: `.data.id, .data.status, .data.to`

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`POST /siprec_connectors`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/siprec_connectors"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`GET /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/siprec_connectors/{connector_name}"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`PUT /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/siprec_connectors/{connector_name}"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`DELETE /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connector_name` | string | Yes | Uniquely identifies a SIPREC connector. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/siprec_connectors/{connector_name}"
```

---

# SIP Integrations (curl) — API Details

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

### Creates an External Connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `tags` | array[string] | Tags associated with the connection. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `inbound` | object |  |

### Update an External Connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `tags` | array[string] | Tags associated with the connection. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `inbound` | object |  |

### Update a phone number

| Parameter | Type | Description |
|-----------|------|-------------|
| `location_id` | string (UUID) | Identifies the location to assign the phone number to. |

### Creates an Upload request

| Parameter | Type | Description |
|-----------|------|-------------|
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | The use case of the upload request. |
| `additional_usages` | array[string] |  |
| `location_id` | string (UUID) | Identifies the location to assign all phone numbers to. |
| `civic_address_id` | string (UUID) | Identifies the civic address to assign all phone numbers to. |

### Upload media

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttl_secs` | integer | The number of seconds after which the media resource will be deleted, default... |
| `media_name` | string | The unique identifier of a file. |

### Update stored media

| Parameter | Type | Description |
|-----------|------|-------------|
| `media_url` | string (URL) | The URL where the media to be stored in Telnyx network is currently hosted. |
| `ttl_secs` | integer | The number of seconds after which the media resource will be deleted, default... |
