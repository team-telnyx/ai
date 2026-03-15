<!-- SDK reference: telnyx-messaging-curl -->

# Telnyx Messaging - curl

## Core Workflow

### Prerequisites

1. Buy a phone number (see telnyx-numbers-curl)
2. Create a messaging profile and configure webhook URL (see telnyx-messaging-profiles-curl)
3. Assign the phone number to the messaging profile
4. For US A2P via long code: complete 10DLC registration — brand, campaign, number assignment (see telnyx-10dlc-curl)
5. For toll-free: complete toll-free verification

### Steps

1. **Search & buy number**
2. **Create messaging profile**
3. **Assign number to profile**
4. **Send SMS**
5. **Send MMS**

### Common mistakes

- NEVER send without assigning the number to a messaging profile — the from number will be rejected
- NEVER send US A2P traffic via long code without 10DLC registration — messages silently blocked by carriers
- NEVER use non-E.164 phone numbers — must be +[country code][number] with no spaces or dashes
- NEVER assume delivery receipt = delivery — some carriers never return delivery receipts
- For MMS: pass media_urls: ["https://..."] — URLs must be publicly accessible HTTPS (max 1 MB per file, 10 attachments, 2 MB total). type is auto-detected when media_urls is present

**Related skills**: telnyx-messaging-profiles-curl, telnyx-10dlc-curl, telnyx-numbers-curl

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Send a message

Send a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to send a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`POST /messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `from` | string (E.164) | Yes | Sending address (+E.164 formatted phone number, alphanumeric... |
| `text` | string | Yes | Message body (i.e., content) as a non-empty string. |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +7 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "to": "+13125550001",
      "from": "+18005550101",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages"
```

Key response fields: `.data.id, .data.to, .data.from`

## Send a message using an alphanumeric sender ID

Send an SMS message using an alphanumeric sender ID. This is SMS only.

`POST /messages/alphanumeric_sender_id`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | A valid alphanumeric sender ID on the user's account. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `text` | string | Yes | The message body. |
| `messaging_profile_id` | string (UUID) | Yes | The messaging profile ID to use. |
| `webhook_url` | string (URL) | No | Callback URL for delivery status updates. |
| `webhook_failover_url` | string (URL) | No | Failover callback URL for delivery status updates. |
| `use_profile_webhooks` | boolean | No | If true, use the messaging profile's webhook settings. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "from": "MyCompany",
  "to": "+13125550001",
  "text": "Hello from Telnyx!",
  "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/messages/alphanumeric_sender_id"
```

Key response fields: `.data.id, .data.to, .data.from`

## Send a group MMS message

`POST /messages/group_mms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | array[object] | Yes | A list of destinations. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +3 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+18005550101",
      "to": [
          "+13125550001"
      ],
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/group_mms"
```

Key response fields: `.data.id, .data.to, .data.from`

## Send a long code message

`POST /messages/long_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "+18005550101",
      "to": "+13125550001",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/long_code"
```

Key response fields: `.data.id, .data.to, .data.from`

## Send a message using number pool

`POST /messages/number_pool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000",
      "to": "+13125550001",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/number_pool"
```

Key response fields: `.data.id, .data.to, .data.from`

## Send a short code message

`POST /messages/short_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number, in +E.164 format, used to send the message. |
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | No | The failover URL where webhooks related to this message will... |
| ... | | | +6 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "from": "12345",
      "to": "+13125550001",
      "text": "Hello from Telnyx!"
  }' \
  "https://api.telnyx.com/v2/messages/short_code"
```

Key response fields: `.data.id, .data.to, .data.from`

## Schedule a message

Schedule a message with a Phone Number, Alphanumeric Sender ID, Short Code or Number Pool. This endpoint allows you to schedule a message with any messaging resource. Current messaging resources include: long-code, short-code, number-pool, and
alphanumeric-sender-id.

`POST /messages/schedule`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string (E.164) | Yes | Receiving address (+E.164 formatted phone number or short co... |
| `messaging_profile_id` | string (UUID) | No | Unique identifier for a messaging profile. |
| `media_urls` | array[string] | No | A list of media URLs. |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| ... | | | +8 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "to": "+13125550001",
      "from": "+18005550101",
      "text": "Appointment reminder",
      "send_at": "2025-07-01T15:00:00Z"
  }' \
  "https://api.telnyx.com/v2/messages/schedule"
```

Key response fields: `.data.id, .data.to, .data.from`

## Send a WhatsApp message

`POST /messages/whatsapp`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string (E.164) | Yes | Phone number in +E.164 format associated with Whatsapp accou... |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `whatsapp_message` | object | Yes |  |
| `type` | enum (WHATSAPP) | No | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "from": "+13125551234",
  "to": "+13125551234",
  "whatsapp_message": {}
}' \
  "https://api.telnyx.com/v2/messages/whatsapp"
```

Key response fields: `.data.id, .data.to, .data.from`

## Retrieve a message

Note: This API endpoint can only retrieve messages that are no older than 10 days since their creation. If you require messages older than this, please generate an [MDR report.](https://developers.telnyx.com/api-reference/mdr-usage-reports/create-mdr-usage-report)

`GET /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the message |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messages/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.data`

## Cancel a scheduled message

Cancel a scheduled message that has not yet been sent. Only messages with `status=scheduled` and `send_at` more than a minute from now can be cancelled.

`DELETE /messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the message to cancel |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/messages/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.to, .data.from`

## List alphanumeric sender IDs

List all alphanumeric sender IDs for the authenticated user.

`GET /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[messaging_profile_id]` | string (UUID) | No | Filter by messaging profile ID. |
| `page[number]` | integer | No | Page number. |
| `page[size]` | integer | No | Page size. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/alphanumeric_sender_ids"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.alphanumeric_sender_id`

## Create an alphanumeric sender ID

Create a new alphanumeric sender ID associated with a messaging profile.

`POST /alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `alphanumeric_sender_id` | string (UUID) | Yes | The alphanumeric sender ID string. |
| `messaging_profile_id` | string (UUID) | Yes | The messaging profile to associate the sender ID with. |
| `us_long_code_fallback` | string | No | A US long code number to use as fallback when sending to US ... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "alphanumeric_sender_id": "MyCompany",
  "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/alphanumeric_sender_ids"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.alphanumeric_sender_id`

## Retrieve an alphanumeric sender ID

Retrieve a specific alphanumeric sender ID.

`GET /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/alphanumeric_sender_ids/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.alphanumeric_sender_id`

## Delete an alphanumeric sender ID

Delete an alphanumeric sender ID and disassociate it from its messaging profile.

`DELETE /alphanumeric_sender_ids/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the alphanumeric sender ID. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/alphanumeric_sender_ids/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.alphanumeric_sender_id`

## Retrieve group MMS messages

Retrieve all messages in a group MMS conversation by the group message ID.

`GET /messages/group/{message_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message_id` | string (UUID) | Yes | The group message ID. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messages/group/{message_id}"
```

Key response fields: `.data.id, .data.to, .data.from`

## List messaging hosted numbers

List all hosted numbers associated with the authenticated user.

`GET /messaging_hosted_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort[phone_number]` | enum (asc, desc) | No | Sort by phone number. |
| `filter[messaging_profile_id]` | string (UUID) | No | Filter by messaging profile ID. |
| `filter[phone_number]` | string | No | Filter by exact phone number. |
| ... | | | +3 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_hosted_numbers"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Retrieve a messaging hosted number

Retrieve a specific messaging hosted number by its ID or phone number.

`GET /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID or phone number of the hosted number. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_hosted_numbers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## Update a messaging hosted number

Update the messaging settings for a hosted number.

`PATCH /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID or phone number of the hosted number. |
| `messaging_profile_id` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `tags` | array[string] | No | Tags to set on this phone number. |
| `messaging_product` | string | No | Configure the messaging product for this number:

* Omit thi... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/messaging_hosted_numbers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.phone_number, .data.type`

## List opt-outs

Retrieve a list of opt-out blocks.

`GET /messaging_optouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `redaction_enabled` | string | No | If receiving address (+E.164 formatted phone number) should ... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_optouts?redaction_enabled=+447766****"
```

Key response fields: `.data.to, .data.from, .data.messaging_profile_id`

## List high-level messaging profile metrics

List high-level metrics for all messaging profiles belonging to the authenticated user.

`GET /messaging_profile_metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `time_frame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profile_metrics"
```

Key response fields: `.data.data, .data.meta`

## Regenerate messaging profile secret

Regenerate the v1 secret for a messaging profile.

`POST /messaging_profiles/{id}/actions/regenerate_secret`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000/actions/regenerate_secret"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List alphanumeric sender IDs for a messaging profile

List all alphanumeric sender IDs associated with a specific messaging profile.

`GET /messaging_profiles/{id}/alphanumeric_sender_ids`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `page[number]` | integer | No |  |
| `page[size]` | integer | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000/alphanumeric_sender_ids"
```

Key response fields: `.data.id, .data.messaging_profile_id, .data.alphanumeric_sender_id`

## Get detailed messaging profile metrics

Get detailed metrics for a specific messaging profile, broken down by time interval.

`GET /messaging_profiles/{id}/metrics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The identifier of the messaging profile. |
| `time_frame` | enum (1h, 3h, 24h, 3d, 7d, ...) | No | The time frame for metrics aggregation. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/550e8400-e29b-41d4-a716-446655440000/metrics"
```

Key response fields: `.data.data`

## List Auto-Response Settings

`GET /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile_id` | string (UUID) | Yes |  |
| `country_code` | string (ISO 3166-1 alpha-2) | No |  |
| `created_at` | object | No | Consolidated created_at parameter (deepObject style). |
| `updated_at` | object | No | Consolidated updated_at parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/{profile_id}/autoresp_configs"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create auto-response setting

`POST /messaging_profiles/{profile_id}/autoresp_configs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `op` | enum (start, stop, info) | Yes |  |
| `keywords` | array[string] | Yes |  |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes |  |
| `profile_id` | string (UUID) | Yes |  |
| `resp_text` | string | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "op": "start",
  "keywords": [
    "keyword1",
    "keyword2"
  ],
  "country_code": "US"
}' \
  "https://api.telnyx.com/v2/messaging_profiles/{profile_id}/autoresp_configs"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get Auto-Response Setting

`GET /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile_id` | string (UUID) | Yes |  |
| `autoresp_cfg_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update Auto-Response Setting

`PUT /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `op` | enum (start, stop, info) | Yes |  |
| `keywords` | array[string] | Yes |  |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes |  |
| `profile_id` | string (UUID) | Yes |  |
| `autoresp_cfg_id` | string (UUID) | Yes |  |
| `resp_text` | string | No |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "op": "start",
  "keywords": [
    "keyword1",
    "keyword2"
  ],
  "country_code": "US"
}' \
  "https://api.telnyx.com/v2/messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete Auto-Response Setting

`DELETE /messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile_id` | string (UUID) | Yes |  |
| `autoresp_cfg_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/messaging_profiles/{profile_id}/autoresp_configs/{autoresp_cfg_id}"
```

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
| `deliveryUpdate` | `message.finalized` | Delivery Update |
| `inboundMessage` | `message.received` | Inbound Message |
| `replacedLinkClick` | `message.link_click` | Replaced Link Click |

Webhook payload field definitions are in the API Details section below.

---

# Messaging (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)
- [Webhook Payload Fields](#webhook-payload-fields)

## Response Schemas

**Returned by:** List alphanumeric sender IDs, Create an alphanumeric sender ID, Retrieve an alphanumeric sender ID, Delete an alphanumeric sender ID, List alphanumeric sender IDs for a messaging profile

| Field | Type |
|-------|------|
| `alphanumeric_sender_id` | string |
| `id` | uuid |
| `messaging_profile_id` | uuid |
| `organization_id` | string |
| `record_type` | enum: alphanumeric_sender_id |
| `us_long_code_fallback` | string |

**Returned by:** Send a message, Send a message using an alphanumeric sender ID, Retrieve group MMS messages, Send a group MMS message, Send a long code message, Send a message using number pool, Schedule a message, Send a short code message

| Field | Type |
|-------|------|
| `cc` | array[object] |
| `completed_at` | date-time |
| `cost` | object \| null |
| `cost_breakdown` | object \| null |
| `direction` | enum: outbound |
| `encoding` | string |
| `errors` | array[object] |
| `from` | object |
| `id` | uuid |
| `media` | array[object] |
| `messaging_profile_id` | string |
| `organization_id` | uuid |
| `parts` | integer |
| `received_at` | date-time |
| `record_type` | enum: message |
| `sent_at` | date-time |
| `smart_encoding_applied` | boolean |
| `subject` | string \| null |
| `tags` | array[string] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_id` | string \| null |
| `tcr_campaign_registered` | string \| null |
| `text` | string |
| `to` | array[object] |
| `type` | enum: SMS, MMS |
| `valid_until` | date-time |
| `wait_seconds` | float |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** Send a WhatsApp message

| Field | Type |
|-------|------|
| `body` | object |
| `direction` | string |
| `encoding` | string |
| `from` | object |
| `id` | string |
| `messaging_profile_id` | string |
| `organization_id` | string |
| `received_at` | date-time |
| `record_type` | string |
| `to` | array[object] |
| `type` | string |
| `wait_seconds` | float |

**Returned by:** Retrieve a message, Get detailed messaging profile metrics

| Field | Type |
|-------|------|
| `data` | object |

**Returned by:** Cancel a scheduled message

| Field | Type |
|-------|------|
| `cc` | array[object] |
| `completed_at` | date-time |
| `cost` | object \| null |
| `cost_breakdown` | object \| null |
| `direction` | enum: outbound |
| `encoding` | string |
| `errors` | array[object] |
| `from` | object |
| `id` | uuid |
| `media` | array[object] |
| `messaging_profile_id` | string |
| `organization_id` | uuid |
| `parts` | integer |
| `received_at` | date-time |
| `record_type` | enum: message |
| `sent_at` | date-time |
| `smart_encoding_applied` | boolean |
| `subject` | string \| null |
| `tags` | array[string] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_id` | string \| null |
| `tcr_campaign_registered` | string \| null |
| `text` | string |
| `to` | array[object] |
| `type` | enum: SMS, MMS |
| `valid_until` | date-time |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** List messaging hosted numbers, Retrieve a messaging hosted number, Update a messaging hosted number

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `eligible_messaging_products` | array[string] |
| `features` | object |
| `health` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: long-code, toll-free, short-code, longcode, tollfree, shortcode |
| `updated_at` | date-time |

**Returned by:** List opt-outs

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `from` | string |
| `keyword` | string \| null |
| `messaging_profile_id` | string \| null |
| `to` | string |

**Returned by:** List high-level messaging profile metrics

| Field | Type |
|-------|------|
| `data` | array[object] |
| `meta` | object |

**Returned by:** Regenerate messaging profile secret

| Field | Type |
|-------|------|
| `ai_assistant_id` | string \| null |
| `alpha_sender` | string \| null |
| `created_at` | date-time |
| `daily_spend_limit` | string |
| `daily_spend_limit_enabled` | boolean |
| `enabled` | boolean |
| `health_webhook_url` | url |
| `id` | uuid |
| `mms_fall_back_to_sms` | boolean |
| `mms_transcoding` | boolean |
| `mobile_only` | boolean |
| `name` | string |
| `number_pool_settings` | object \| null |
| `organization_id` | string |
| `record_type` | enum: messaging_profile |
| `redaction_enabled` | boolean |
| `redaction_level` | integer |
| `resource_group_id` | string \| null |
| `smart_encoding` | boolean |
| `updated_at` | date-time |
| `url_shortener_settings` | object \| null |
| `v1_secret` | string |
| `webhook_api_version` | enum: 1, 2, 2010-04-01 |
| `webhook_failover_url` | url |
| `webhook_url` | url |
| `whitelisted_destinations` | array[string] |

**Returned by:** List Auto-Response Settings, Create auto-response setting, Get Auto-Response Setting, Update Auto-Response Setting

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `id` | string |
| `keywords` | array[string] |
| `op` | enum: start, stop, info |
| `resp_text` | string |
| `updated_at` | date-time |

## Optional Parameters

### Create an alphanumeric sender ID

| Parameter | Type | Description |
|-----------|------|-------------|
| `us_long_code_fallback` | string | A US long code number to use as fallback when sending to US destinations. |

### Send a message

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messaging_profile_id` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `send_at` | string (date-time) | ISO 8601 formatted date indicating when to send the message - accurate up til... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a message using an alphanumeric sender ID

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook_url` | string (URL) | Callback URL for delivery status updates. |
| `webhook_failover_url` | string (URL) | Failover callback URL for delivery status updates. |
| `use_profile_webhooks` | boolean | If true, use the messaging profile's webhook settings. |

### Send a group MMS message

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |

### Send a long code message

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a message using number pool

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Schedule a message

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string (E.164) | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or sh... |
| `messaging_profile_id` | string (UUID) | Unique identifier for a messaging profile. |
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `send_at` | string (date-time) | ISO 8601 formatted date indicating when to send the message - accurate up til... |

### Send a short code message

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Message body (i.e., content) as a non-empty string. |
| `subject` | string | Subject of multimedia message |
| `media_urls` | array[string] | A list of media URLs. |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `webhook_failover_url` | string (URL) | The failover URL where webhooks related to this message will be sent if sendi... |
| `use_profile_webhooks` | boolean | If the profile this number is associated with has webhooks, use them for deli... |
| `type` | enum (SMS, MMS) | The protocol for sending the message, either SMS or MMS. |
| `auto_detect` | boolean | Automatically detect if an SMS message is unusually long and exceeds a recomm... |
| `encoding` | enum (auto, gsm7, ucs2) | Encoding to use for the message. |

### Send a WhatsApp message

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | enum (WHATSAPP) | Message type - must be set to "WHATSAPP" |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |

### Update a messaging hosted number

| Parameter | Type | Description |
|-----------|------|-------------|
| `messaging_profile_id` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `messaging_product` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `tags` | array[string] | Tags to set on this phone number. |

### Create auto-response setting

| Parameter | Type | Description |
|-----------|------|-------------|
| `resp_text` | string |  |

### Update Auto-Response Setting

| Parameter | Type | Description |
|-----------|------|-------------|
| `resp_text` | string |  |

## Webhook Payload Fields

### `deliveryUpdate`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum: message.sent, message.finalized | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum: message | Identifies the type of the resource. |
| `data.payload.direction` | enum: outbound | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | uuid | The id of the organization the messaging profile belongs to. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | string \| null | Subject of multimedia message |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | object \| null |  |
| `data.payload.cost_breakdown` | object \| null | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | string \| null | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | string \| null | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | ISO 8601 formatted date indicating when the message was sent. |
| `data.payload.completed_at` | date-time | ISO 8601 formatted date indicating when the message was finalized. |
| `data.payload.valid_until` | date-time | Message must be out of the queue by this time or else it will be discarded and marked as 'sending_failed'. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |
| `data.payload.smart_encoding_applied` | boolean | Indicates whether smart encoding was applied to this message. |
| `data.payload.wait_seconds` | float | Seconds the message is queued due to rate limiting before being sent to the carrier. |
| `meta.attempt` | integer | Number of attempts to deliver the webhook event. |
| `meta.delivered_to` | url | The webhook URL the event was delivered to. |

### `inboundMessage`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | enum: event | Identifies the type of the resource. |
| `data.id` | uuid | Identifies the type of resource. |
| `data.event_type` | enum: message.received | The type of event being delivered. |
| `data.occurred_at` | date-time | ISO 8601 formatted date indicating when the resource was created. |
| `data.payload.record_type` | enum: message | Identifies the type of the resource. |
| `data.payload.direction` | enum: inbound | The direction of the message. |
| `data.payload.id` | uuid | Identifies the type of resource. |
| `data.payload.type` | enum: SMS, MMS | The type of message. |
| `data.payload.messaging_profile_id` | string | Unique identifier for a messaging profile. |
| `data.payload.organization_id` | string | Unique identifier for a messaging profile. |
| `data.payload.to` | array[object] |  |
| `data.payload.cc` | array[object] |  |
| `data.payload.text` | string | Message body (i.e., content) as a non-empty string. |
| `data.payload.subject` | string \| null | Message subject. |
| `data.payload.media` | array[object] |  |
| `data.payload.webhook_url` | url | The URL where webhooks related to this message will be sent. |
| `data.payload.webhook_failover_url` | url | The failover URL where webhooks related to this message will be sent if sending to the primary URL fails. |
| `data.payload.encoding` | string | Encoding scheme used for the message body. |
| `data.payload.parts` | integer | Number of parts into which the message's body must be split. |
| `data.payload.tags` | array[string] | Tags associated with the resource. |
| `data.payload.cost` | object \| null |  |
| `data.payload.cost_breakdown` | object \| null | Detailed breakdown of the message cost components. |
| `data.payload.tcr_campaign_id` | string \| null | The Campaign Registry (TCR) campaign ID associated with the message. |
| `data.payload.tcr_campaign_billable` | boolean | Indicates whether the TCR campaign is billable. |
| `data.payload.tcr_campaign_registered` | string \| null | The registration status of the TCR campaign. |
| `data.payload.received_at` | date-time | ISO 8601 formatted date indicating when the message request was received. |
| `data.payload.sent_at` | date-time | Not used for inbound messages. |
| `data.payload.completed_at` | date-time | Not used for inbound messages. |
| `data.payload.valid_until` | date-time | Not used for inbound messages. |
| `data.payload.errors` | array[object] | These errors may point at addressees when referring to unsuccessful/unconfirmed delivery statuses. |

### `replacedLinkClick`

| Field | Type | Description |
|-------|------|-------------|
| `data.record_type` | string | Identifies the type of the resource. |
| `data.url` | string | The original link that was sent in the message. |
| `data.to` | string | Sending address (+E.164 formatted phone number, alphanumeric sender ID, or short code). |
| `data.message_id` | uuid | The message ID associated with the clicked link. |
| `data.time_clicked` | date-time | ISO 8601 formatted date indicating when the message request was received. |

### Field Type Notes

- `from` in responses/webhooks: object with sub-fields `phone_number` (string), `carrier` (string), `line_type` (string)
- `to` in responses/webhooks: array of objects, each with `phone_number` (string), `carrier` (string), `line_type` (string), `status` (string)
- `cost`: object with `amount` (string, decimal), `currency` (string, e.g., 'USD')
