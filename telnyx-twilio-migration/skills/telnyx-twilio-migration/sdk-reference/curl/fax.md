<!-- SDK reference: telnyx-fax-curl -->

# Telnyx Fax - curl

## Core Workflow

### Prerequisites

1. Buy or port a phone number with fax capability (see telnyx-numbers-curl)
2. Create a Fax Application with webhook URLs for inbound fax events
3. Assign the phone number to the Fax Application

### Steps

1. **Send fax**
2. **Check status**
3. **Receive inbound fax**

### Common mistakes

- media_url must be a publicly accessible URL to a PDF or TIFF file
- Fax delivery is not instant — monitor status via webhooks or polling

**Related skills**: telnyx-numbers-curl

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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Send a fax

Send a fax. Files have size limits and page count limit validations. If a file is bigger than 50MB or has more than 350 pages it will fail with `file_size_limit_exceeded` and `page_count_limit_exceeded` respectively.

`POST /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | The connection ID to send the fax with. |
| `to` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent to o... |
| `from` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent from... |
| `webhook_url` | string (URL) | No | Use this field to override the URL to which Telnyx will send... |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `quality` | enum (normal, high, very_high, ultra_light, ultra_dark) | No | The quality of the fax. |
| ... | | | +9 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "connection_id=234423" \
  -F "contents=@/path/to/file" \
  -F "to=+13127367276" \
  -F "from=+13125790015" \
  -F "quality=high" \
  -d '{
      "media_url": "https://example.com/document.pdf"
  }' \
  "https://api.telnyx.com/v2/faxes"
```

Key response fields: `.data.id, .data.status, .data.to`

## View a fax

`GET /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.to`

## Delete a fax

`DELETE /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000"
```

## List all Fax Applications

This endpoint returns a list of your Fax Applications inside the 'data' attribute of the response. You can adjust which applications are listed by using filters. Fax Applications are used to configure how you send and receive faxes using the Programmable Fax API with Telnyx.

`GET /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, application_name, active) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fax_applications?sort=application_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Creates a Fax Application

Creates a new Fax Application based on the parameters sent in the request. The application name and webhook URL are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`POST /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `tags` | array[string] | No | Tags associated with the Fax Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +4 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "application_name": "call-router",
  "webhook_event_url": "https://example.com"
}' \
  "https://api.telnyx.com/v2/fax_applications"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a Fax Application

Return the details of an existing Fax Application inside the 'data' attribute of the response.

`GET /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fax_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a Fax Application

Updates settings of an existing Fax Application based on the parameters of the request.

`PATCH /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the Fax Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +5 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "application_name": "call-router",
  "webhook_event_url": "https://example.com"
}' \
  "https://api.telnyx.com/v2/fax_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Deletes a Fax Application

Permanently deletes a Fax Application. Deletion may be prevented if the application is in use by phone numbers.

`DELETE /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fax_applications/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## View a list of faxes

`GET /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/faxes"
```

Key response fields: `.data.id, .data.status, .data.to`

## Cancel a fax

Cancel the outbound fax that is in one of the following states: `queued`, `media.processed`, `originated` or `sending`

`POST /faxes/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000/actions/cancel"
```

Key response fields: `.data.result`

## Refresh a fax

Refreshes the inbound fax's media_url when it has expired

`POST /faxes/{id}/actions/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000/actions/refresh"
```

Key response fields: `.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```bash
# Telnyx signs webhooks with Ed25519 (asymmetric — NOT HMAC/Standard Webhooks).
# Headers sent with each webhook:
#   telnyx-signature-ed25519: base64-encoded Ed25519 signature
#   telnyx-timestamp: Unix timestamp (reject if >5 minutes old for replay protection)
#
# Get your public key from: Telnyx Portal > Account Settings > Keys & Credentials
# Use the Telnyx SDK in your language for verification (client.webhooks.unwrap).
# Your endpoint MUST return 2xx within 2 seconds or Telnyx will retry (up to 3 attempts).
# Configure a failover URL in Telnyx Portal for additional reliability.
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `fax.delivered` | `fax.delivered` | Fax Delivered |
| `fax.failed` | `fax.failed` | Fax Failed |
| `fax.media.processed` | `fax.media.processed` | Fax Media Processed |
| `fax.queued` | `fax.queued` | Fax Queued |
| `fax.sending.started` | `fax.sending.started` | Fax Sending Started |

Webhook payload field definitions are in the API Details section below.

---

# Fax (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List all Fax Applications, Creates a Fax Application, Retrieve a Fax Application, Update a Fax Application, Deletes a Fax Application

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany |
| `application_name` | string |
| `created_at` | string |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | string |
| `tags` | array[string] |
| `updated_at` | string |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** View a list of faxes, Send a fax, View a fax

| Field | Type |
|-------|------|
| `client_state` | string |
| `connection_id` | string |
| `created_at` | date-time |
| `direction` | enum: inbound, outbound |
| `from` | string |
| `from_display_name` | string |
| `id` | uuid |
| `media_name` | string |
| `media_url` | string |
| `preview_url` | string |
| `quality` | enum: normal, high, very_high, ultra_light, ultra_dark |
| `record_type` | enum: fax |
| `status` | enum: queued, media.processed, originated, sending, delivered, failed, initiated, receiving, media.processing, received |
| `store_media` | boolean |
| `stored_media_url` | string |
| `to` | string |
| `updated_at` | date-time |
| `webhook_failover_url` | string |
| `webhook_url` | string |

**Returned by:** Cancel a fax, Refresh a fax

| Field | Type |
|-------|------|
| `result` | string |

## Optional Parameters

### Creates a Fax Application

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `tags` | array[string] | Tags associated with the Fax Application. |
| `inbound` | object |  |
| `outbound` | object |  |

### Update a Fax Application

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `fax_email_recipient` | string | Specifies an email address where faxes sent to this application will be forwa... |
| `tags` | array[string] | Tags associated with the Fax Application. |
| `inbound` | object |  |
| `outbound` | object |  |

### Send a fax

| Parameter | Type | Description |
|-----------|------|-------------|
| `media_url` | string (URL) | The URL (or list of URLs) to the PDF used for the fax's media. |
| `media_name` | string | The media_name used for the fax's media. |
| `from_display_name` | string | The `from_display_name` string to be used as the caller id name (SIP From Dis... |
| `quality` | enum (normal, high, very_high, ultra_light, ultra_dark) | The quality of the fax. |
| `t38_enabled` | boolean | The flag to disable the T.38 protocol. |
| `monochrome` | boolean | The flag to enable monochrome, true black and white fax results. |
| `black_threshold` | integer | The black threshold percentage for monochrome faxes. |
| `store_media` | boolean | Should fax media be stored on temporary URL. |
| `store_preview` | boolean | Should fax preview be stored on temporary URL. |
| `preview_format` | enum (pdf, tiff) | The format for the preview file in case the `store_preview` is `true`. |
| `webhook_url` | string (URL) | Use this field to override the URL to which Telnyx will send subsequent webho... |
| `client_state` | string | Use this field to add state to every subsequent webhook. |

## Webhook Payload Fields

### `fax.delivered`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.event_type` | enum: fax.delivered | The type of event being delivered. |
| `data.payload.call_duration_secs` | integer | The duration of the call in seconds. |
| `data.payload.connection_id` | string | The ID of the connection used to send the fax. |
| `data.payload.direction` | enum: inbound, outbound | The direction of the fax. |
| `data.payload.fax_id` | uuid | Identifies the fax. |
| `data.payload.original_media_url` | string | The original URL to the PDF used for the fax's media. |
| `data.payload.media_name` | string | The media_name used for the fax's media. |
| `data.payload.to` | string | The phone number, in E.164 format, the fax will be sent to or SIP URI |
| `data.payload.from` | string | The phone number, in E.164 format, the fax will be sent from. |
| `data.payload.user_id` | uuid | Identifier of the user to whom the fax belongs |
| `data.payload.page_count` | integer | Number of transferred pages |
| `data.payload.status` | enum: delivered | The status of the fax. |
| `data.payload.client_state` | string | State received from a command. |
| `meta.attempt` | integer | The delivery attempt number. |
| `meta.delivered_to` | uri | The URL the webhook was delivered to. |

### `fax.failed`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.event_type` | enum: fax.failed | The type of event being delivered. |
| `data.payload.connection_id` | string | The ID of the connection used to send the fax. |
| `data.payload.direction` | enum: inbound, outbound | The direction of the fax. |
| `data.payload.fax_id` | uuid | Identifies the fax. |
| `data.payload.original_media_url` | string | The original URL to the PDF used for the fax's media. |
| `data.payload.media_name` | string | The media_name used for the fax's media. |
| `data.payload.to` | string | The phone number, in E.164 format, the fax will be sent to or SIP URI |
| `data.payload.from` | string | The phone number, in E.164 format, the fax will be sent from. |
| `data.payload.user_id` | uuid | Identifier of the user to whom the fax belongs |
| `data.payload.failure_reason` | enum: rejected | Cause of the sending failure |
| `data.payload.status` | enum: failed | The status of the fax. |
| `data.payload.client_state` | string | State received from a command. |
| `meta.attempt` | integer | The delivery attempt number. |
| `meta.delivered_to` | uri | The URL the webhook was delivered to. |

### `fax.media.processed`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.event_type` | enum: fax.media.processed | The type of event being delivered. |
| `data.payload.connection_id` | string | The ID of the connection used to send the fax. |
| `data.payload.direction` | enum: inbound, outbound | The direction of the fax. |
| `data.payload.fax_id` | uuid | Identifies the fax. |
| `data.payload.original_media_url` | string | The original URL to the PDF used for the fax's media. |
| `data.payload.media_name` | string | The media_name used for the fax's media. |
| `data.payload.to` | string | The phone number, in E.164 format, the fax will be sent to or SIP URI |
| `data.payload.from` | string | The phone number, in E.164 format, the fax will be sent from. |
| `data.payload.user_id` | uuid | Identifier of the user to whom the fax belongs |
| `data.payload.status` | enum: media.processed | The status of the fax. |
| `data.payload.client_state` | string | State received from a command. |
| `meta.attempt` | integer | The delivery attempt number. |
| `meta.delivered_to` | uri | The URL the webhook was delivered to. |

### `fax.queued`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.event_type` | enum: fax.queued | The type of event being delivered. |
| `data.payload.connection_id` | string | The ID of the connection used to send the fax. |
| `data.payload.direction` | enum: inbound, outbound | The direction of the fax. |
| `data.payload.fax_id` | uuid | Identifies the fax. |
| `data.payload.original_media_url` | string | The original URL to the PDF used for the fax's media. |
| `data.payload.media_name` | string | The media_name used for the fax's media. |
| `data.payload.to` | string | The phone number, in E.164 format, the fax will be sent to or SIP URI |
| `data.payload.from` | string | The phone number, in E.164 format, the fax will be sent from. |
| `data.payload.user_id` | uuid | Identifier of the user to whom the fax belongs |
| `data.payload.status` | enum: queued | The status of the fax. |
| `data.payload.client_state` | string | State received from a command. |
| `meta.attempt` | integer | The delivery attempt number. |
| `meta.delivered_to` | uri | The URL the webhook was delivered to. |

### `fax.sending.started`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.event_type` | enum: fax.sending.started | The type of event being delivered. |
| `data.payload.connection_id` | string | The ID of the connection used to send the fax. |
| `data.payload.direction` | enum: inbound, outbound | The direction of the fax. |
| `data.payload.fax_id` | uuid | Identifies the fax. |
| `data.payload.original_media_url` | string | The original URL to the PDF used for the fax's media. |
| `data.payload.media_name` | string | The media_name used for the fax's media. |
| `data.payload.to` | string | The phone number, in E.164 format, the fax will be sent to or SIP URI |
| `data.payload.from` | string | The phone number, in E.164 format, the fax will be sent from. |
| `data.payload.user_id` | uuid | Identifier of the user to whom the fax belongs |
| `data.payload.status` | enum: sending | The status of the fax. |
| `data.payload.client_state` | string | State received from a command. |
| `meta.attempt` | integer | The delivery attempt number. |
| `meta.delivered_to` | uri | The URL the webhook was delivered to. |
