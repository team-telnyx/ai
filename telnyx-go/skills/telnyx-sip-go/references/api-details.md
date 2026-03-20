# SIP (Go) — API Details

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

### Create new Access IP Range — `client.AccessIPRanges.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Description` | string |  |

### Create a credential connection — `client.CredentialConnections.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Defaults to true |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `SipUriCallingPreference` | enum (disabled, unrestricted, internal) | This feature enables inbound SIP URI calls to your Credential Auth Connection. |
| `DefaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `EncodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `EncryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `OnnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `IosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `AndroidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookApiVersion` | enum (1, 2, texml) | Determines which webhook format will be used, Telnyx API v1, v2 or texml. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `Tags` | array[string] | Tags associated with the connection. |
| `RtcpSettings` | object |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `NoiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `NoiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `JitterBuffer` | object | Configuration options for Jitter Buffer. |

### Update a credential connection — `client.CredentialConnections.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Defaults to true |
| `UserName` | string | The user name to be used as part of the credentials. |
| `Password` | string | The password to be used as part of the credentials. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `ConnectionName` | string | A user-assigned name to help manage the connection. |
| `SipUriCallingPreference` | enum (disabled, unrestricted, internal) | This feature enables inbound SIP URI calls to your Credential Auth Connection. |
| `DefaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `EncodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `EncryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `OnnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `IosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `AndroidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `Tags` | array[string] | Tags associated with the connection. |
| `RtcpSettings` | object |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `NoiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `NoiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `JitterBuffer` | object | Configuration options for Jitter Buffer. |

### Create an FQDN connection — `client.FqdnConnections.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Defaults to true |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `TransportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `DefaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `EncodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `EncryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `MicrosoftTeamsSbc` | boolean | When enabled, the connection will be created for Microsoft Teams Direct Routing. |
| `OnnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `Tags` | array[string] | Tags associated with the connection. |
| `IosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `AndroidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `RtcpSettings` | object |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `NoiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `NoiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `JitterBuffer` | object | Configuration options for Jitter Buffer. |

### Update an FQDN connection — `client.FqdnConnections.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Defaults to true |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `ConnectionName` | string | A user-assigned name to help manage the connection. |
| `TransportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `DefaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `EncodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `EncryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `OnnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer that the sender and receiver negotiate T38 di... |
| `Tags` | array[string] | Tags associated with the connection. |
| `IosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `AndroidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `RtcpSettings` | object |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `NoiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `NoiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `JitterBuffer` | object | Configuration options for Jitter Buffer. |

### Create an FQDN — `client.Fqdns.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Port` | integer | Port to use when connecting to this FQDN. |

### Update an FQDN — `client.Fqdns.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ConnectionId` | string (UUID) | ID of the FQDN connection to which this IP should be attached. |
| `Fqdn` | string | FQDN represented by this resource. |
| `Port` | integer | Port to use when connecting to this FQDN. |
| `DnsRecordType` | string | The DNS record type for the FQDN. |

### Create an Ip connection — `client.IPConnections.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Defaults to true |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `ConnectionName` | string |  |
| `TransportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `DefaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `EncodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `EncryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `OnnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `IosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `AndroidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `Tags` | array[string] | Tags associated with the connection. |
| `RtcpSettings` | object |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `NoiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `NoiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `JitterBuffer` | object | Configuration options for Jitter Buffer. |

### Update an Ip connection — `client.IPConnections.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | Defaults to true |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `ConnectionName` | string |  |
| `TransportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `DefaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `DtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `EncodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `EncryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `OnnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `IosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `AndroidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `WebhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `WebhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `WebhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `WebhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `CallCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `Tags` | array[string] | Tags associated with the connection. |
| `RtcpSettings` | object |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `NoiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `NoiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `JitterBuffer` | object | Configuration options for Jitter Buffer. |

### Create an Ip — `client.IPs.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ConnectionId` | string (UUID) | ID of the IP Connection to which this IP should be attached. |
| `Port` | integer | Port to use when connecting to this IP. |

### Update an Ip — `client.IPs.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ConnectionId` | string (UUID) | ID of the IP Connection to which this IP should be attached. |
| `Port` | integer | Port to use when connecting to this IP. |

### Create an outbound voice profile — `client.OutboundVoiceProfiles.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TrafficType` | enum (conversational) | Specifies the type of traffic allowed in this profile. |
| `ServicePlan` | enum (global) | Indicates the coverage of the termination regions. |
| `ConcurrentCallLimit` | integer | Must be no more than your global concurrent call limit. |
| `Enabled` | boolean | Specifies whether the outbound voice profile can be used. |
| `Tags` | array[string] |  |
| `UsagePaymentMethod` | enum (rate-deck) | Setting for how costs for outbound profile are calculated. |
| `WhitelistedDestinations` | array[string] | The list of destinations you want to be able to call using this outbound voic... |
| `MaxDestinationRate` | number | Maximum rate (price per minute) for a Destination to be allowed when making o... |
| `DailySpendLimit` | string | The maximum amount of usage charges, in USD, you want Telnyx to allow on this... |
| `DailySpendLimitEnabled` | boolean | Specifies whether to enforce the daily_spend_limit on this outbound voice pro... |
| `CallRecording` | object |  |
| `BillingGroupId` | string (UUID) | The ID of the billing group associated with the outbound proflile. |
| `CallingWindow` | object | (BETA) Specifies the time window and call limits for calls made using this ou... |

### Updates an existing outbound voice profile. — `client.OutboundVoiceProfiles.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TrafficType` | enum (conversational) | Specifies the type of traffic allowed in this profile. |
| `ServicePlan` | enum (global) | Indicates the coverage of the termination regions. |
| `ConcurrentCallLimit` | integer | Must be no more than your global concurrent call limit. |
| `Enabled` | boolean | Specifies whether the outbound voice profile can be used. |
| `Tags` | array[string] |  |
| `UsagePaymentMethod` | enum (rate-deck) | Setting for how costs for outbound profile are calculated. |
| `WhitelistedDestinations` | array[string] | The list of destinations you want to be able to call using this outbound voic... |
| `MaxDestinationRate` | number | Maximum rate (price per minute) for a Destination to be allowed when making o... |
| `DailySpendLimit` | string | The maximum amount of usage charges, in USD, you want Telnyx to allow on this... |
| `DailySpendLimitEnabled` | boolean | Specifies whether to enforce the daily_spend_limit on this outbound voice pro... |
| `CallRecording` | object |  |
| `BillingGroupId` | string (UUID) | The ID of the billing group associated with the outbound proflile. |
| `CallingWindow` | object | (BETA) Specifies the time window and call limits for calls made using this ou... |
