# SIP (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List all Access IP Ranges, Create new Access IP Range, Delete access IP ranges

| Field | Type |
|-------|------|
| `cidr_block` | string |
| `created_at` | date-time |
| `description` | string |
| `id` | string |
| `status` | enum: pending, added |
| `updated_at` | date-time |
| `user_id` | string |

**Returned by:** List connections, Retrieve a connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany |
| `connection_name` | string |
| `created_at` | string |
| `id` | string |
| `outbound_voice_profile_id` | string |
| `record_type` | string |
| `tags` | array[string] |
| `updated_at` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |

**Returned by:** List credential connections, Create a credential connection, Retrieve a credential connection, Update a credential connection, Delete a credential connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany |
| `android_push_credential_id` | string \| null |
| `call_cost_in_webhooks` | boolean |
| `connection_name` | string |
| `created_at` | string |
| `default_on_hold_comfort_noise_enabled` | boolean |
| `dtmf_type` | enum: RFC 2833, Inband, SIP INFO |
| `encode_contact_header_enabled` | boolean |
| `encrypted_media` | enum: SRTP, None |
| `id` | string |
| `inbound` | object |
| `ios_push_credential_id` | string \| null |
| `jitter_buffer` | object |
| `noise_suppression` | enum: inbound, outbound, both, disabled |
| `noise_suppression_details` | object |
| `onnet_t38_passthrough_enabled` | boolean |
| `outbound` | object |
| `password` | string |
| `record_type` | string |
| `rtcp_settings` | object |
| `sip_uri_calling_preference` | enum: disabled, unrestricted, internal |
| `tags` | array[string] |
| `updated_at` | string |
| `user_name` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** Check a Credential Connection Registration Status

| Field | Type |
|-------|------|
| `ip_address` | string |
| `last_registration` | string |
| `port` | integer |
| `record_type` | string |
| `sip_username` | string |
| `status` | enum: Not Applicable, Not Registered, Failed, Expired, Registered, Unregistered |
| `transport` | string |
| `user_agent` | string |

**Returned by:** List FQDN connections, Create an FQDN connection, Retrieve an FQDN connection, Update an FQDN connection, Delete an FQDN connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `adjust_dtmf_timestamp` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany |
| `android_push_credential_id` | string \| null |
| `call_cost_enabled` | boolean |
| `call_cost_in_webhooks` | boolean |
| `connection_name` | string |
| `created_at` | string |
| `default_on_hold_comfort_noise_enabled` | boolean |
| `dtmf_type` | enum: RFC 2833, Inband, SIP INFO |
| `encode_contact_header_enabled` | boolean |
| `encrypted_media` | enum: SRTP, None |
| `id` | string |
| `ignore_dtmf_duration` | boolean |
| `ignore_mark_bit` | boolean |
| `inbound` | object |
| `ios_push_credential_id` | string \| null |
| `jitter_buffer` | object |
| `microsoft_teams_sbc` | boolean |
| `noise_suppression` | enum: inbound, outbound, both, disabled |
| `noise_suppression_details` | object |
| `onnet_t38_passthrough_enabled` | boolean |
| `outbound` | object |
| `password` | string |
| `record_type` | string |
| `rtcp_settings` | object |
| `rtp_pass_codecs_on_stream_change` | boolean |
| `send_normalized_timestamps` | boolean |
| `tags` | array[string] |
| `third_party_control_enabled` | boolean |
| `transport_protocol` | enum: UDP, TCP, TLS |
| `txt_name` | string |
| `txt_ttl` | integer |
| `txt_value` | string |
| `updated_at` | string |
| `user_name` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** List FQDNs, Create an FQDN, Retrieve an FQDN, Update an FQDN, Delete an FQDN

| Field | Type |
|-------|------|
| `connection_id` | string |
| `created_at` | string |
| `dns_record_type` | string |
| `fqdn` | string |
| `id` | string |
| `port` | integer |
| `record_type` | string |
| `updated_at` | string |

**Returned by:** List Ip connections, Create an Ip connection, Retrieve an Ip connection, Update an Ip connection, Delete an Ip connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `anchorsite_override` | enum: Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, Amsterdam, Netherlands, London, UK, Toronto, Canada, Vancouver, Canada, Frankfurt, Germany |
| `android_push_credential_id` | string \| null |
| `call_cost_in_webhooks` | boolean |
| `connection_name` | string |
| `created_at` | string |
| `default_on_hold_comfort_noise_enabled` | boolean |
| `dtmf_type` | enum: RFC 2833, Inband, SIP INFO |
| `encode_contact_header_enabled` | boolean |
| `encrypted_media` | enum: SRTP, None |
| `id` | string |
| `inbound` | object |
| `ios_push_credential_id` | string \| null |
| `jitter_buffer` | object |
| `noise_suppression` | enum: inbound, outbound, both, disabled |
| `noise_suppression_details` | object |
| `onnet_t38_passthrough_enabled` | boolean |
| `outbound` | object |
| `record_type` | string |
| `rtcp_settings` | object |
| `tags` | array[string] |
| `transport_protocol` | enum: UDP, TCP, TLS |
| `updated_at` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** List Ips, Create an Ip, Retrieve an Ip, Update an Ip, Delete an Ip

| Field | Type |
|-------|------|
| `connection_id` | string |
| `created_at` | string |
| `id` | string |
| `ip_address` | string |
| `port` | integer |
| `record_type` | string |
| `updated_at` | string |

**Returned by:** Get all outbound voice profiles, Create an outbound voice profile, Retrieve an outbound voice profile, Updates an existing outbound voice profile., Delete an outbound voice profile

| Field | Type |
|-------|------|
| `billing_group_id` | uuid |
| `call_recording` | object |
| `calling_window` | object |
| `concurrent_call_limit` | integer \| null |
| `connections_count` | integer |
| `created_at` | string |
| `daily_spend_limit` | string |
| `daily_spend_limit_enabled` | boolean |
| `enabled` | boolean |
| `id` | string |
| `max_destination_rate` | number |
| `name` | string |
| `record_type` | string |
| `service_plan` | enum: global |
| `tags` | array[string] |
| `traffic_type` | enum: conversational |
| `updated_at` | string |
| `usage_payment_method` | enum: rate-deck |
| `whitelisted_destinations` | array[string] |

## Optional Parameters

### Create new Access IP Range

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |

### Create a credential connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `sip_uri_calling_preference` | enum (disabled, unrestricted, internal) | This feature enables inbound SIP URI calls to your Credential Auth Connection. |
| `default_on_hold_comfort_noise_enabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encode_contact_header_enabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encrypted_media` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnet_t38_passthrough_enabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `ios_push_credential_id` | string (UUID) | The uuid of the push credential for Ios |
| `android_push_credential_id` | string (UUID) | The uuid of the push credential for Android |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_api_version` | enum (1, 2, texml) | Determines which webhook format will be used, Telnyx API v1, v2 or texml. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcp_settings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noise_suppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noise_suppression_details` | object | Configuration options for noise suppression. |
| `jitter_buffer` | object | Configuration options for Jitter Buffer. |

### Update a credential connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `user_name` | string | The user name to be used as part of the credentials. |
| `password` | string | The password to be used as part of the credentials. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connection_name` | string | A user-assigned name to help manage the connection. |
| `sip_uri_calling_preference` | enum (disabled, unrestricted, internal) | This feature enables inbound SIP URI calls to your Credential Auth Connection. |
| `default_on_hold_comfort_noise_enabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encode_contact_header_enabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encrypted_media` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnet_t38_passthrough_enabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `ios_push_credential_id` | string (UUID) | The uuid of the push credential for Ios |
| `android_push_credential_id` | string (UUID) | The uuid of the push credential for Android |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcp_settings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noise_suppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noise_suppression_details` | object | Configuration options for noise suppression. |
| `jitter_buffer` | object | Configuration options for Jitter Buffer. |

### Create an FQDN connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `transport_protocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `default_on_hold_comfort_noise_enabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encode_contact_header_enabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encrypted_media` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `microsoft_teams_sbc` | boolean | When enabled, the connection will be created for Microsoft Teams Direct Routing. |
| `onnet_t38_passthrough_enabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `tags` | array[string] | Tags associated with the connection. |
| `ios_push_credential_id` | string (UUID) | The uuid of the push credential for Ios |
| `android_push_credential_id` | string (UUID) | The uuid of the push credential for Android |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `rtcp_settings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noise_suppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noise_suppression_details` | object | Configuration options for noise suppression. |
| `jitter_buffer` | object | Configuration options for Jitter Buffer. |

### Update an FQDN connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connection_name` | string | A user-assigned name to help manage the connection. |
| `transport_protocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `default_on_hold_comfort_noise_enabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encode_contact_header_enabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encrypted_media` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnet_t38_passthrough_enabled` | boolean | Enable on-net T38 if you prefer that the sender and receiver negotiate T38 di... |
| `tags` | array[string] | Tags associated with the connection. |
| `ios_push_credential_id` | string (UUID) | The uuid of the push credential for Ios |
| `android_push_credential_id` | string (UUID) | The uuid of the push credential for Android |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `rtcp_settings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noise_suppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noise_suppression_details` | object | Configuration options for noise suppression. |
| `jitter_buffer` | object | Configuration options for Jitter Buffer. |

### Create an FQDN

| Parameter | Type | Description |
|-----------|------|-------------|
| `port` | integer | Port to use when connecting to this FQDN. |

### Update an FQDN

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection_id` | string (UUID) | ID of the FQDN connection to which this IP should be attached. |
| `fqdn` | string | FQDN represented by this resource. |
| `port` | integer | Port to use when connecting to this FQDN. |
| `dns_record_type` | string | The DNS record type for the FQDN. |

### Create an Ip connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connection_name` | string |  |
| `transport_protocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `default_on_hold_comfort_noise_enabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encode_contact_header_enabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encrypted_media` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnet_t38_passthrough_enabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `ios_push_credential_id` | string (UUID) | The uuid of the push credential for Ios |
| `android_push_credential_id` | string (UUID) | The uuid of the push credential for Android |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcp_settings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noise_suppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noise_suppression_details` | object | Configuration options for noise suppression. |
| `jitter_buffer` | object | Configuration options for Jitter Buffer. |

### Update an Ip connection

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connection_name` | string |  |
| `transport_protocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `default_on_hold_comfort_noise_enabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmf_type` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encode_contact_header_enabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encrypted_media` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnet_t38_passthrough_enabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `ios_push_credential_id` | string (UUID) | The uuid of the push credential for Ios |
| `android_push_credential_id` | string (UUID) | The uuid of the push credential for Android |
| `webhook_event_url` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhook_event_failover_url` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhook_api_version` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhook_timeout_secs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `call_cost_in_webhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcp_settings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noise_suppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noise_suppression_details` | object | Configuration options for noise suppression. |
| `jitter_buffer` | object | Configuration options for Jitter Buffer. |

### Create an Ip

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection_id` | string (UUID) | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | Port to use when connecting to this IP. |

### Update an Ip

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection_id` | string (UUID) | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | Port to use when connecting to this IP. |

### Create an outbound voice profile

| Parameter | Type | Description |
|-----------|------|-------------|
| `traffic_type` | enum (conversational) | Specifies the type of traffic allowed in this profile. |
| `service_plan` | enum (global) | Indicates the coverage of the termination regions. |
| `concurrent_call_limit` | integer | Must be no more than your global concurrent call limit. |
| `enabled` | boolean | Specifies whether the outbound voice profile can be used. |
| `tags` | array[string] |  |
| `usage_payment_method` | enum (rate-deck) | Setting for how costs for outbound profile are calculated. |
| `whitelisted_destinations` | array[string] | The list of destinations you want to be able to call using this outbound voic... |
| `max_destination_rate` | number | Maximum rate (price per minute) for a Destination to be allowed when making o... |
| `daily_spend_limit` | string | The maximum amount of usage charges, in USD, you want Telnyx to allow on this... |
| `daily_spend_limit_enabled` | boolean | Specifies whether to enforce the daily_spend_limit on this outbound voice pro... |
| `call_recording` | object |  |
| `billing_group_id` | string (UUID) | The ID of the billing group associated with the outbound proflile. |
| `calling_window` | object | (BETA) Specifies the time window and call limits for calls made using this ou... |

### Updates an existing outbound voice profile.

| Parameter | Type | Description |
|-----------|------|-------------|
| `traffic_type` | enum (conversational) | Specifies the type of traffic allowed in this profile. |
| `service_plan` | enum (global) | Indicates the coverage of the termination regions. |
| `concurrent_call_limit` | integer | Must be no more than your global concurrent call limit. |
| `enabled` | boolean | Specifies whether the outbound voice profile can be used. |
| `tags` | array[string] |  |
| `usage_payment_method` | enum (rate-deck) | Setting for how costs for outbound profile are calculated. |
| `whitelisted_destinations` | array[string] | The list of destinations you want to be able to call using this outbound voic... |
| `max_destination_rate` | number | Maximum rate (price per minute) for a Destination to be allowed when making o... |
| `daily_spend_limit` | string | The maximum amount of usage charges, in USD, you want Telnyx to allow on this... |
| `daily_spend_limit_enabled` | boolean | Specifies whether to enforce the daily_spend_limit on this outbound voice pro... |
| `call_recording` | object |  |
| `billing_group_id` | string (UUID) | The ID of the billing group associated with the outbound proflile. |
| `calling_window` | object | (BETA) Specifies the time window and call limits for calls made using this ou... |
