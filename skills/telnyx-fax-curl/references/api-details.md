# Telnyx Fax API Details - curl

## Fax Application Response Schema

All fax application endpoints return these fields in the `data` object:

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago IL, Ashburn VA, San Jose CA, Sydney Australia, Amsterdam Netherlands, London UK, Toronto Canada, Vancouver Canada, Frankfurt Germany |
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

## Fax Resource Response Schema

All fax resource endpoints return these fields in the `data` object:

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

## Webhook Payload Fields

All fax webhook events share these common fields:

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.occurred_at` | date-time | ISO 8601 datetime of when the event occurred. |
| `data.event_type` | string | The type of event (e.g., `fax.delivered`, `fax.failed`). |
| `data.payload.connection_id` | string | The ID of the connection used to send the fax. |
| `data.payload.direction` | enum: inbound, outbound | The direction of the fax. |
| `data.payload.fax_id` | uuid | Identifies the fax. |
| `data.payload.original_media_url` | string | The original URL to the PDF used for the fax's media. |
| `data.payload.media_name` | string | The media_name used for the fax's media. |
| `data.payload.to` | string | The phone number (E.164) the fax was sent to, or SIP URI. |
| `data.payload.from` | string | The phone number (E.164) the fax was sent from. |
| `data.payload.user_id` | uuid | Identifier of the user to whom the fax belongs. |
| `data.payload.status` | string | The status of the fax. |
| `data.payload.client_state` | string | State received from a command. |
| `meta.attempt` | integer | The delivery attempt number. |
| `meta.delivered_to` | uri | The URL the webhook was delivered to. |

### Event-specific fields

- **`fax.delivered`**: adds `data.payload.call_duration_secs` (integer) and `data.payload.page_count` (integer)
- **`fax.failed`**: adds `data.payload.failure_reason` (enum: rejected)

## Optional Parameters for Fax Application Endpoints

### Create/Update Fax Application

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Whether the application is active |
| `anchorsite_override` | enum | Override the anchorsite location |
| `inbound` | object | Inbound settings |
| `outbound` | object | Outbound settings |
| `tags` | array[string] | Tags for the application |
| `webhook_event_failover_url` | uri | Failover webhook URL |
| `webhook_timeout_secs` | integer \| null | Webhook timeout in seconds |
| `fax_email_recipient` | string \| null | Email to receive faxes (update only) |

### Send Fax Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `black_threshold` | integer | Black threshold for fax quality |
| `client_state` | string | Client state passed through webhooks |
| `from_display_name` | string | Display name for the sender |
| `media_name` | string | Name for the media |
| `media_url` | string | URL of the document to fax |
| `monochrome` | boolean | Send in monochrome |
| `preview_format` | enum: pdf, tiff | Format for fax preview |
| `quality` | enum: normal, high, very_high, ultra_light, ultra_dark | Fax quality |
| `store_media` | boolean | Store the fax media |
| `store_preview` | boolean | Store a preview of the fax |
| `t38_enabled` | boolean | Enable T.38 fax protocol |
| `webhook_url` | string | Override webhook URL for this fax |
