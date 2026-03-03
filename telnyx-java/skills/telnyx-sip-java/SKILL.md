---
name: telnyx-sip-java
description: >-
  Configure SIP trunking connections and outbound voice profiles. Use when
  connecting PBX systems or managing SIP infrastructure. This skill provides
  Java SDK examples.
metadata:
  author: telnyx
  product: sip
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## List all Access IP Ranges

`GET /access_ip_ranges`

```java
import com.telnyx.sdk.models.accessipranges.AccessIpRangeListPage;
import com.telnyx.sdk.models.accessipranges.AccessIpRangeListParams;

AccessIpRangeListPage page = client.accessIpRanges().list();
```

## Create new Access IP Range

`POST /access_ip_ranges` — Required: `cidr_block`

Optional: `description` (string)

```java
import com.telnyx.sdk.models.accessipranges.AccessIpRange;
import com.telnyx.sdk.models.accessipranges.AccessIpRangeCreateParams;

AccessIpRangeCreateParams params = AccessIpRangeCreateParams.builder()
    .cidrBlock("cidr_block")
    .build();
AccessIpRange accessIpRange = client.accessIpRanges().create(params);
```

## Delete access IP ranges

`DELETE /access_ip_ranges/{access_ip_range_id}`

```java
import com.telnyx.sdk.models.accessipranges.AccessIpRange;
import com.telnyx.sdk.models.accessipranges.AccessIpRangeDeleteParams;

AccessIpRange accessIpRange = client.accessIpRanges().delete("access_ip_range_id");
```

## List connections

Returns a list of your connections irrespective of type.

`GET /connections`

```java
import com.telnyx.sdk.models.connections.ConnectionListPage;
import com.telnyx.sdk.models.connections.ConnectionListParams;

ConnectionListPage page = client.connections().list();
```

## Retrieve a connection

Retrieves the high-level details of an existing connection.

`GET /connections/{id}`

```java
import com.telnyx.sdk.models.connections.ConnectionRetrieveParams;
import com.telnyx.sdk.models.connections.ConnectionRetrieveResponse;

ConnectionRetrieveResponse connection = client.connections().retrieve("id");
```

## List credential connections

Returns a list of your credential connections.

`GET /credential_connections`

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionListPage;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionListParams;

CredentialConnectionListPage page = client.credentialConnections().list();
```

## Create a credential connection

Creates a credential connection.

`POST /credential_connections` — Required: `user_name`, `password`, `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionCreateParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionCreateResponse;

CredentialConnectionCreateParams params = CredentialConnectionCreateParams.builder()
    .connectionName("my name")
    .password("my123secure456password789")
    .userName("myusername123")
    .build();
CredentialConnectionCreateResponse credentialConnection = client.credentialConnections().create(params);
```

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`GET /credential_connections/{id}`

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionRetrieveParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionRetrieveResponse;

CredentialConnectionRetrieveResponse credentialConnection = client.credentialConnections().retrieve("id");
```

## Update a credential connection

Updates settings of an existing credential connection.

`PATCH /credential_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `user_name` (string), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionUpdateParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionUpdateResponse;

CredentialConnectionUpdateResponse credentialConnection = client.credentialConnections().update("id");
```

## Delete a credential connection

Deletes an existing credential connection.

`DELETE /credential_connections/{id}`

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionDeleteParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionDeleteResponse;

CredentialConnectionDeleteResponse credentialConnection = client.credentialConnections().delete("id");
```

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`POST /credential_connections/{id}/actions/check_registration_status`

```java
import com.telnyx.sdk.models.credentialconnections.actions.ActionCheckRegistrationStatusParams;
import com.telnyx.sdk.models.credentialconnections.actions.ActionCheckRegistrationStatusResponse;

ActionCheckRegistrationStatusResponse response = client.credentialConnections().actions().checkRegistrationStatus("id");
```

## List FQDN connections

Returns a list of your FQDN connections.

`GET /fqdn_connections`

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionListPage;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionListParams;

FqdnConnectionListPage page = client.fqdnConnections().list();
```

## Create an FQDN connection

Creates a FQDN connection.

`POST /fqdn_connections` — Required: `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionCreateParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionCreateResponse;

FqdnConnectionCreateParams params = FqdnConnectionCreateParams.builder()
    .connectionName("string")
    .build();
FqdnConnectionCreateResponse fqdnConnection = client.fqdnConnections().create(params);
```

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`GET /fqdn_connections/{id}`

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionRetrieveParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionRetrieveResponse;

FqdnConnectionRetrieveResponse fqdnConnection = client.fqdnConnections().retrieve("1293384261075731499");
```

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`PATCH /fqdn_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionUpdateParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionUpdateResponse;

FqdnConnectionUpdateResponse fqdnConnection = client.fqdnConnections().update("1293384261075731499");
```

## Delete an FQDN connection

Deletes an FQDN connection.

`DELETE /fqdn_connections/{id}`

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionDeleteParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionDeleteResponse;

FqdnConnectionDeleteResponse fqdnConnection = client.fqdnConnections().delete("1293384261075731499");
```

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`GET /fqdns`

```java
import com.telnyx.sdk.models.fqdns.FqdnListPage;
import com.telnyx.sdk.models.fqdns.FqdnListParams;

FqdnListPage page = client.fqdns().list();
```

## Create an FQDN

Create a new FQDN object.

`POST /fqdns` — Required: `fqdn`, `dns_record_type`, `connection_id`

Optional: `port` (['integer', 'null'])

```java
import com.telnyx.sdk.models.fqdns.FqdnCreateParams;
import com.telnyx.sdk.models.fqdns.FqdnCreateResponse;

FqdnCreateParams params = FqdnCreateParams.builder()
    .connectionId("1516447646313612565")
    .dnsRecordType("a")
    .fqdn("example.com")
    .build();
FqdnCreateResponse fqdn = client.fqdns().create(params);
```

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`GET /fqdns/{id}`

```java
import com.telnyx.sdk.models.fqdns.FqdnRetrieveParams;
import com.telnyx.sdk.models.fqdns.FqdnRetrieveResponse;

FqdnRetrieveResponse fqdn = client.fqdns().retrieve("1517907029795014409");
```

## Update an FQDN

Update the details of a specific FQDN.

`PATCH /fqdns/{id}`

Optional: `connection_id` (string), `dns_record_type` (string), `fqdn` (string), `port` (['integer', 'null'])

```java
import com.telnyx.sdk.models.fqdns.FqdnUpdateParams;
import com.telnyx.sdk.models.fqdns.FqdnUpdateResponse;

FqdnUpdateResponse fqdn = client.fqdns().update("1517907029795014409");
```

## Delete an FQDN

Delete an FQDN.

`DELETE /fqdns/{id}`

```java
import com.telnyx.sdk.models.fqdns.FqdnDeleteParams;
import com.telnyx.sdk.models.fqdns.FqdnDeleteResponse;

FqdnDeleteResponse fqdn = client.fqdns().delete("1517907029795014409");
```

## List Ip connections

Returns a list of your IP connections.

`GET /ip_connections`

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionListPage;
import com.telnyx.sdk.models.ipconnections.IpConnectionListParams;

IpConnectionListPage page = client.ipConnections().list();
```

## Create an Ip connection

Creates an IP connection.

`POST /ip_connections`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionCreateParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionCreateResponse;

IpConnectionCreateResponse ipConnection = client.ipConnections().create();
```

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`GET /ip_connections/{id}`

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionRetrieveParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionRetrieveResponse;

IpConnectionRetrieveResponse ipConnection = client.ipConnections().retrieve("id");
```

## Update an Ip connection

Updates settings of an existing IP connection.

`PATCH /ip_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionUpdateParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionUpdateResponse;

IpConnectionUpdateResponse ipConnection = client.ipConnections().update("id");
```

## Delete an Ip connection

Deletes an existing IP connection.

`DELETE /ip_connections/{id}`

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionDeleteParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionDeleteResponse;

IpConnectionDeleteResponse ipConnection = client.ipConnections().delete("id");
```

## List Ips

Get all IPs belonging to the user that match the given filters.

`GET /ips`

```java
import com.telnyx.sdk.models.ips.IpListPage;
import com.telnyx.sdk.models.ips.IpListParams;

IpListPage page = client.ips().list();
```

## Create an Ip

Create a new IP object.

`POST /ips` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```java
import com.telnyx.sdk.models.ips.IpCreateParams;
import com.telnyx.sdk.models.ips.IpCreateResponse;

IpCreateParams params = IpCreateParams.builder()
    .ipAddress("192.168.0.0")
    .build();
IpCreateResponse ip = client.ips().create(params);
```

## Retrieve an Ip

Return the details regarding a specific IP.

`GET /ips/{id}`

```java
import com.telnyx.sdk.models.ips.IpRetrieveParams;
import com.telnyx.sdk.models.ips.IpRetrieveResponse;

IpRetrieveResponse ip = client.ips().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Update an Ip

Update the details of a specific IP.

`PATCH /ips/{id}` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```java
import com.telnyx.sdk.models.ips.IpUpdateParams;
import com.telnyx.sdk.models.ips.IpUpdateResponse;

IpUpdateParams params = IpUpdateParams.builder()
    .id("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .ipAddress("192.168.0.0")
    .build();
IpUpdateResponse ip = client.ips().update(params);
```

## Delete an Ip

Delete an IP.

`DELETE /ips/{id}`

```java
import com.telnyx.sdk.models.ips.IpDeleteParams;
import com.telnyx.sdk.models.ips.IpDeleteResponse;

IpDeleteResponse ip = client.ips().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`GET /outbound_voice_profiles`

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileListPage;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileListParams;

OutboundVoiceProfileListPage page = client.outboundVoiceProfiles().list();
```

## Create an outbound voice profile

Create an outbound voice profile.

`POST /outbound_voice_profiles` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileCreateParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileCreateResponse;

OutboundVoiceProfileCreateParams params = OutboundVoiceProfileCreateParams.builder()
    .name("office")
    .build();
OutboundVoiceProfileCreateResponse outboundVoiceProfile = client.outboundVoiceProfiles().create(params);
```

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`GET /outbound_voice_profiles/{id}`

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileRetrieveParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileRetrieveResponse;

OutboundVoiceProfileRetrieveResponse outboundVoiceProfile = client.outboundVoiceProfiles().retrieve("1293384261075731499");
```

## Updates an existing outbound voice profile.

`PATCH /outbound_voice_profiles/{id}` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileUpdateParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileUpdateResponse;

OutboundVoiceProfileUpdateParams params = OutboundVoiceProfileUpdateParams.builder()
    .id("1293384261075731499")
    .name("office")
    .build();
OutboundVoiceProfileUpdateResponse outboundVoiceProfile = client.outboundVoiceProfiles().update(params);
```

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`DELETE /outbound_voice_profiles/{id}`

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileDeleteParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileDeleteResponse;

OutboundVoiceProfileDeleteResponse outboundVoiceProfile = client.outboundVoiceProfiles().delete("1293384261075731499");
```
