<!-- SDK reference: telnyx-sip-curl -->

# Telnyx Sip - curl

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

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## List all Access IP Ranges

`GET /access_ip_ranges`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/access_ip_ranges"
```

Returns: `cidr_block` (string), `created_at` (date-time), `description` (string), `id` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Create new Access IP Range

`POST /access_ip_ranges` — Required: `cidr_block`

Optional: `description` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "cidr_block": "203.0.113.0/24"
}' \
  "https://api.telnyx.com/v2/access_ip_ranges"
```

Returns: `cidr_block` (string), `created_at` (date-time), `description` (string), `id` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Delete access IP ranges

`DELETE /access_ip_ranges/{access_ip_range_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/access_ip_ranges/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `cidr_block` (string), `created_at` (date-time), `description` (string), `id` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## List connections

Returns a list of your connections irrespective of type.

`GET /connections`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/connections?sort=connection_name"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `connection_name` (string), `created_at` (string), `id` (string), `outbound_voice_profile_id` (string), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri)

## Retrieve a connection

Retrieves the high-level details of an existing connection. To retrieve specific authentication information, use the endpoint for the specific connection type.

`GET /connections/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `connection_name` (string), `created_at` (string), `id` (string), `outbound_voice_profile_id` (string), `record_type` (string), `tags` (array[string]), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri)

## List credential connections

Returns a list of your credential connections.

`GET /credential_connections`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/credential_connections?sort=connection_name"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Create a credential connection

Creates a credential connection.

`POST /credential_connections` — Required: `user_name`, `password`, `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `webhook_api_version` (enum: 1, 2, texml), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "user_name": "myusername123",
  "password": "my123secure456password789",
  "connection_name": "office-connection"
}' \
  "https://api.telnyx.com/v2/credential_connections"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`GET /credential_connections/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Update a credential connection

Updates settings of an existing credential connection.

`PATCH /credential_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Delete a credential connection

Deletes an existing credential connection.

`DELETE /credential_connections/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum: disabled, unrestricted, internal), `tags` (array[string]), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`POST /credential_connections/{id}/actions/check_registration_status`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000/actions/check_registration_status"
```

Returns: `ip_address` (string), `last_registration` (string), `port` (integer), `record_type` (string), `sip_username` (string), `status` (enum: Not Applicable, Not Registered, Failed, Expired, Registered, Unregistered), `transport` (string), `user_agent` (string)

## List FQDN connections

Returns a list of your FQDN connections.

`GET /fqdn_connections`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdn_connections?sort=connection_name"
```

Returns: `active` (boolean), `adjust_dtmf_timestamp` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_enabled` (boolean), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `ignore_dtmf_duration` (boolean), `ignore_mark_bit` (boolean), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `rtp_pass_codecs_on_stream_change` (boolean), `send_normalized_timestamps` (boolean), `tags` (array[string]), `third_party_control_enabled` (boolean), `transport_protocol` (enum: UDP, TCP, TLS), `txt_name` (string), `txt_ttl` (integer), `txt_value` (string), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Create an FQDN connection

Creates a FQDN connection.

`POST /fqdn_connections` — Required: `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "connection_name": "office-connection"
}' \
  "https://api.telnyx.com/v2/fqdn_connections"
```

Returns: `active` (boolean), `adjust_dtmf_timestamp` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_enabled` (boolean), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `ignore_dtmf_duration` (boolean), `ignore_mark_bit` (boolean), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `rtp_pass_codecs_on_stream_change` (boolean), `send_normalized_timestamps` (boolean), `tags` (array[string]), `third_party_control_enabled` (boolean), `transport_protocol` (enum: UDP, TCP, TLS), `txt_name` (string), `txt_ttl` (integer), `txt_value` (string), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`GET /fqdn_connections/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdn_connections/1293384261075731499"
```

Returns: `active` (boolean), `adjust_dtmf_timestamp` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_enabled` (boolean), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `ignore_dtmf_duration` (boolean), `ignore_mark_bit` (boolean), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `rtp_pass_codecs_on_stream_change` (boolean), `send_normalized_timestamps` (boolean), `tags` (array[string]), `third_party_control_enabled` (boolean), `transport_protocol` (enum: UDP, TCP, TLS), `txt_name` (string), `txt_ttl` (integer), `txt_value` (string), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`PATCH /fqdn_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/fqdn_connections/1293384261075731499"
```

Returns: `active` (boolean), `adjust_dtmf_timestamp` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_enabled` (boolean), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `ignore_dtmf_duration` (boolean), `ignore_mark_bit` (boolean), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `rtp_pass_codecs_on_stream_change` (boolean), `send_normalized_timestamps` (boolean), `tags` (array[string]), `third_party_control_enabled` (boolean), `transport_protocol` (enum: UDP, TCP, TLS), `txt_name` (string), `txt_ttl` (integer), `txt_value` (string), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Delete an FQDN connection

Deletes an FQDN connection.

`DELETE /fqdn_connections/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fqdn_connections/1293384261075731499"
```

Returns: `active` (boolean), `adjust_dtmf_timestamp` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_enabled` (boolean), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `ignore_dtmf_duration` (boolean), `ignore_mark_bit` (boolean), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `record_type` (string), `rtcp_settings` (object), `rtp_pass_codecs_on_stream_change` (boolean), `send_normalized_timestamps` (boolean), `tags` (array[string]), `third_party_control_enabled` (boolean), `transport_protocol` (enum: UDP, TCP, TLS), `txt_name` (string), `txt_ttl` (integer), `txt_value` (string), `updated_at` (string), `user_name` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`GET /fqdns`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdns"
```

Returns: `connection_id` (string), `created_at` (string), `dns_record_type` (string), `fqdn` (string), `id` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Create an FQDN

Create a new FQDN object.

`POST /fqdns` — Required: `fqdn`, `dns_record_type`, `connection_id`

Optional: `port` (integer | null)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "fqdn": "example.com",
  "dns_record_type": "a"
}' \
  "https://api.telnyx.com/v2/fqdns"
```

Returns: `connection_id` (string), `created_at` (string), `dns_record_type` (string), `fqdn` (string), `id` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`GET /fqdns/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdns/1517907029795014409"
```

Returns: `connection_id` (string), `created_at` (string), `dns_record_type` (string), `fqdn` (string), `id` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Update an FQDN

Update the details of a specific FQDN.

`PATCH /fqdns/{id}`

Optional: `connection_id` (string), `dns_record_type` (string), `fqdn` (string), `port` (integer | null)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/fqdns/1517907029795014409"
```

Returns: `connection_id` (string), `created_at` (string), `dns_record_type` (string), `fqdn` (string), `id` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Delete an FQDN

Delete an FQDN.

`DELETE /fqdns/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fqdns/1517907029795014409"
```

Returns: `connection_id` (string), `created_at` (string), `dns_record_type` (string), `fqdn` (string), `id` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## List Ip connections

Returns a list of your IP connections.

`GET /ip_connections`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ip_connections?sort=connection_name"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `record_type` (string), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Create an Ip connection

Creates an IP connection.

`POST /ip_connections`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "connection_name": "my-ip-connection"
  }' \
  "https://api.telnyx.com/v2/ip_connections"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `record_type` (string), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`GET /ip_connections/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ip_connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `record_type` (string), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Update an Ip connection

Updates settings of an existing IP connection.

`PATCH /ip_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ip_connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `record_type` (string), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## Delete an Ip connection

Deletes an existing IP connection.

`DELETE /ip_connections/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ip_connections/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `active` (boolean), `anchorsite_override` (enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany), `android_push_credential_id` (string | null), `call_cost_in_webhooks` (boolean), `connection_name` (string), `created_at` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum: RFC 2833, Inband, SIP INFO), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum: SRTP, None), `id` (string), `inbound` (object), `ios_push_credential_id` (string | null), `jitter_buffer` (object), `noise_suppression` (enum: inbound, outbound, both, disabled), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `record_type` (string), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum: UDP, TCP, TLS), `updated_at` (string), `webhook_api_version` (enum: 1, 2), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (integer | null)

## List Ips

Get all IPs belonging to the user that match the given filters.

`GET /ips`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ips"
```

Returns: `connection_id` (string), `created_at` (string), `id` (string), `ip_address` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Create an Ip

Create a new IP object.

`POST /ips` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "ip_address": "192.168.0.0"
}' \
  "https://api.telnyx.com/v2/ips"
```

Returns: `connection_id` (string), `created_at` (string), `id` (string), `ip_address` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Retrieve an Ip

Return the details regarding a specific IP.

`GET /ips/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `connection_id` (string), `created_at` (string), `id` (string), `ip_address` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Update an Ip

Update the details of a specific IP.

`PATCH /ips/{id}` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "ip_address": "192.168.0.0"
}' \
  "https://api.telnyx.com/v2/ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `connection_id` (string), `created_at` (string), `id` (string), `ip_address` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Delete an Ip

Delete an IP.

`DELETE /ips/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `connection_id` (string), `created_at` (string), `id` (string), `ip_address` (string), `port` (integer), `record_type` (string), `updated_at` (string)

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`GET /outbound_voice_profiles`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/outbound_voice_profiles?sort=name"
```

Returns: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `connections_count` (integer), `created_at` (string), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (string), `max_destination_rate` (number), `name` (string), `record_type` (string), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `updated_at` (string), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])

## Create an outbound voice profile

Create an outbound voice profile.

`POST /outbound_voice_profiles` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "office"
}' \
  "https://api.telnyx.com/v2/outbound_voice_profiles"
```

Returns: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `connections_count` (integer), `created_at` (string), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (string), `max_destination_rate` (number), `name` (string), `record_type` (string), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `updated_at` (string), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`GET /outbound_voice_profiles/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/outbound_voice_profiles/1293384261075731499"
```

Returns: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `connections_count` (integer), `created_at` (string), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (string), `max_destination_rate` (number), `name` (string), `record_type` (string), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `updated_at` (string), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])

## Updates an existing outbound voice profile.

`PATCH /outbound_voice_profiles/{id}` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "office"
}' \
  "https://api.telnyx.com/v2/outbound_voice_profiles/1293384261075731499"
```

Returns: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `connections_count` (integer), `created_at` (string), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (string), `max_destination_rate` (number), `name` (string), `record_type` (string), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `updated_at` (string), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`DELETE /outbound_voice_profiles/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/outbound_voice_profiles/1293384261075731499"
```

Returns: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (integer | null), `connections_count` (integer), `created_at` (string), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `id` (string), `max_destination_rate` (number), `name` (string), `record_type` (string), `service_plan` (enum: global), `tags` (array[string]), `traffic_type` (enum: conversational), `updated_at` (string), `usage_payment_method` (enum: rate-deck), `whitelisted_destinations` (array[string])
