# SIP Integrations (Go) — API Details

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

### Creates an External Connection — `client.ExternalConnections.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Specifies whether the connection can be used. |
| `Tags` | array[string] | Tags associated with the connection. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `Inbound` | object |  |

### Update an External Connection — `client.ExternalConnections.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Specifies whether the connection can be used. |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `Tags` | array[string] | Tags associated with the connection. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `Inbound` | object |  |

### Update a phone number — `client.ExternalConnections.PhoneNumbers.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `LocationId` | string (UUID) | Identifies the location to assign the phone number to. |

### Creates an Upload request — `client.ExternalConnections.Uploads.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Usage` | enum (calling_user_assignment, first_party_app_assignment) | The use case of the upload request. |
| `AdditionalUsages` | array[string] |  |
| `LocationId` | string (UUID) | Identifies the location to assign all phone numbers to. |
| `CivicAddressId` | string (UUID) | Identifies the civic address to assign all phone numbers to. |

### Upload media — `client.Media.Upload()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TtlSecs` | integer | The number of seconds after which the media resource will be deleted, default... |
| `MediaName` | string | The unique identifier of a file. |

### Update stored media — `client.Media.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `MediaUrl` | string (URL) | The URL where the media to be stored in Telnyx network is currently hosted. |
| `TtlSecs` | integer | The number of seconds after which the media resource will be deleted, default... |
