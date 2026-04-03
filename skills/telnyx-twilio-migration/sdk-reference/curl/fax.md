<!-- SDK reference: telnyx-fax-curl -->

# Telnyx Fax - curl

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
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

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

## List all Fax Applications

This endpoint returns a list of your Fax Applications inside the 'data' attribute of the response. You can adjust which applications are listed by using filters. Fax Applications are used to configure how you send and receive faxes using the Programmable Fax API with Telnyx.

`GET /fax_applications`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fax_applications?sort=application_name"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `application_name` (string), `created_at` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Creates a Fax Application

Creates a new Fax Application based on the parameters sent in the request. The application name and webhook URL are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`POST /fax_applications` — Required: `application_name`, `webhook_event_url`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_timeout_secs` (integer | null)

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

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `application_name` (string), `created_at` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Retrieve a Fax Application

Return the details of an existing Fax Application inside the 'data' attribute of the response.

`GET /fax_applications/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fax_applications/1293384261075731499"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `application_name` (string), `created_at` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Update a Fax Application

Updates settings of an existing Fax Application based on the parameters of the request.

`PATCH /fax_applications/{id}` — Required: `application_name`, `webhook_event_url`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `fax_email_recipient` (string | null), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_timeout_secs` (integer | null)

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

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `application_name` (string), `created_at` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Deletes a Fax Application

Permanently deletes a Fax Application. Deletion may be prevented if the application is in use by phone numbers.

`DELETE /fax_applications/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fax_applications/1293384261075731499"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `application_name` (string), `created_at` (string), `id` (string), `inbound` (object), `outbound` (object), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## View a list of faxes

`GET /faxes`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/faxes"
```

Returns: `client_state` (string), `connection_id` (string), `created_at` (date-time), `direction` (enum: inbound, outbound), `from` (string), `from_display_name` (string), `id` (uuid), `media_name` (string), `media_url` (string), `preview_url` (string), `quality` (enum: normal, high, very_high, ultra_light, ultra_dark), `record_type` (enum: fax), `status` (enum: queued, media.processed, originated, sending, delivered, failed, initiated, receiving, media.processing, received), `store_media` (boolean), `stored_media_url` (string), `to` (string), `updated_at` (date-time), `webhook_failover_url` (string), `webhook_url` (string)

## Send a fax

Send a fax. Files have size limits and page count limit validations. If a file is bigger than 50MB or has more than 350 pages it will fail with `file_size_limit_exceeded` and `page_count_limit_exceeded` respectively.

`POST /faxes` — Required: `connection_id`, `from`, `to`

Optional: `black_threshold` (integer), `client_state` (string), `from_display_name` (string), `media_name` (string), `media_url` (string), `monochrome` (boolean), `preview_format` (enum: pdf, tiff), `quality` (enum: normal, high, very_high, ultra_light, ultra_dark), `store_media` (boolean), `store_preview` (boolean), `t38_enabled` (boolean), `webhook_url` (string)

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

Returns: `client_state` (string), `connection_id` (string), `created_at` (date-time), `direction` (enum: inbound, outbound), `from` (string), `from_display_name` (string), `id` (uuid), `media_name` (string), `media_url` (string), `preview_url` (string), `quality` (enum: normal, high, very_high, ultra_light, ultra_dark), `record_type` (enum: fax), `status` (enum: queued, media.processed, originated, sending, delivered, failed, initiated, receiving, media.processing, received), `store_media` (boolean), `stored_media_url` (string), `to` (string), `updated_at` (date-time), `webhook_failover_url` (string), `webhook_url` (string)

## View a fax

`GET /faxes/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `client_state` (string), `connection_id` (string), `created_at` (date-time), `direction` (enum: inbound, outbound), `from` (string), `from_display_name` (string), `id` (uuid), `media_name` (string), `media_url` (string), `preview_url` (string), `quality` (enum: normal, high, very_high, ultra_light, ultra_dark), `record_type` (enum: fax), `status` (enum: queued, media.processed, originated, sending, delivered, failed, initiated, receiving, media.processing, received), `store_media` (boolean), `stored_media_url` (string), `to` (string), `updated_at` (date-time), `webhook_failover_url` (string), `webhook_url` (string)

## Delete a fax

`DELETE /faxes/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000"
```

## Cancel a fax

Cancel the outbound fax that is in one of the following states: `queued`, `media.processed`, `originated` or `sending`

`POST /faxes/{id}/actions/cancel`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000/actions/cancel"
```

Returns: `result` (string)

## Refresh a fax

Refreshes the inbound fax's media_url when it has expired

`POST /faxes/{id}/actions/refresh`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/faxes/550e8400-e29b-41d4-a716-446655440000/actions/refresh"
```

Returns: `result` (string)

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

| Event | Description |
|-------|-------------|
| `fax.delivered` | Fax Delivered |
| `fax.failed` | Fax Failed |
| `fax.media.processed` | Fax Media Processed |
| `fax.queued` | Fax Queued |
| `fax.sending.started` | Fax Sending Started |

### Webhook payload fields

**`fax.delivered`**

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

**`fax.failed`**

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

**`fax.media.processed`**

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

**`fax.queued`**

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

**`fax.sending.started`**

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
