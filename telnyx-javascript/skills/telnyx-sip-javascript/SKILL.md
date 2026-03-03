---
name: telnyx-sip-javascript
description: >-
  Configure SIP trunking connections and outbound voice profiles. Use when
  connecting PBX systems or managing SIP infrastructure. This skill provides
  JavaScript SDK examples.
metadata:
  author: telnyx
  product: sip
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## List all Access IP Ranges

`GET /access_ip_ranges`

```javascript
// Automatically fetches more pages as needed.
for await (const accessIPRange of client.accessIPRanges.list()) {
  console.log(accessIPRange.id);
}
```

## Create new Access IP Range

`POST /access_ip_ranges` — Required: `cidr_block`

Optional: `description` (string)

```javascript
const accessIPRange = await client.accessIPRanges.create({ cidr_block: 'cidr_block' });

console.log(accessIPRange.id);
```

## Delete access IP ranges

`DELETE /access_ip_ranges/{access_ip_range_id}`

```javascript
const accessIPRange = await client.accessIPRanges.delete('access_ip_range_id');

console.log(accessIPRange.id);
```

## List connections

Returns a list of your connections irrespective of type.

`GET /connections`

```javascript
// Automatically fetches more pages as needed.
for await (const connectionListResponse of client.connections.list()) {
  console.log(connectionListResponse.id);
}
```

## Retrieve a connection

Retrieves the high-level details of an existing connection.

`GET /connections/{id}`

```javascript
const connection = await client.connections.retrieve('id');

console.log(connection.data);
```

## List credential connections

Returns a list of your credential connections.

`GET /credential_connections`

```javascript
// Automatically fetches more pages as needed.
for await (const credentialConnection of client.credentialConnections.list()) {
  console.log(credentialConnection.id);
}
```

## Create a credential connection

Creates a credential connection.

`POST /credential_connections` — Required: `user_name`, `password`, `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const credentialConnection = await client.credentialConnections.create({
  connection_name: 'my name',
  password: 'my123secure456password789',
  user_name: 'myusername123',
});

console.log(credentialConnection.data);
```

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`GET /credential_connections/{id}`

```javascript
const credentialConnection = await client.credentialConnections.retrieve('id');

console.log(credentialConnection.data);
```

## Update a credential connection

Updates settings of an existing credential connection.

`PATCH /credential_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `user_name` (string), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const credentialConnection = await client.credentialConnections.update('id');

console.log(credentialConnection.data);
```

## Delete a credential connection

Deletes an existing credential connection.

`DELETE /credential_connections/{id}`

```javascript
const credentialConnection = await client.credentialConnections.delete('id');

console.log(credentialConnection.data);
```

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`POST /credential_connections/{id}/actions/check_registration_status`

```javascript
const response = await client.credentialConnections.actions.checkRegistrationStatus('id');

console.log(response.data);
```

## List FQDN connections

Returns a list of your FQDN connections.

`GET /fqdn_connections`

```javascript
// Automatically fetches more pages as needed.
for await (const fqdnConnection of client.fqdnConnections.list()) {
  console.log(fqdnConnection.id);
}
```

## Create an FQDN connection

Creates a FQDN connection.

`POST /fqdn_connections` — Required: `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const fqdnConnection = await client.fqdnConnections.create({ connection_name: 'string' });

console.log(fqdnConnection.data);
```

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`GET /fqdn_connections/{id}`

```javascript
const fqdnConnection = await client.fqdnConnections.retrieve('1293384261075731499');

console.log(fqdnConnection.data);
```

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`PATCH /fqdn_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const fqdnConnection = await client.fqdnConnections.update('1293384261075731499');

console.log(fqdnConnection.data);
```

## Delete an FQDN connection

Deletes an FQDN connection.

`DELETE /fqdn_connections/{id}`

```javascript
const fqdnConnection = await client.fqdnConnections.delete('1293384261075731499');

console.log(fqdnConnection.data);
```

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`GET /fqdns`

```javascript
// Automatically fetches more pages as needed.
for await (const fqdn of client.fqdns.list()) {
  console.log(fqdn.id);
}
```

## Create an FQDN

Create a new FQDN object.

`POST /fqdns` — Required: `fqdn`, `dns_record_type`, `connection_id`

Optional: `port` (['integer', 'null'])

```javascript
const fqdn = await client.fqdns.create({
  connection_id: '1516447646313612565',
  dns_record_type: 'a',
  fqdn: 'example.com',
});

console.log(fqdn.data);
```

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`GET /fqdns/{id}`

```javascript
const fqdn = await client.fqdns.retrieve('1517907029795014409');

console.log(fqdn.data);
```

## Update an FQDN

Update the details of a specific FQDN.

`PATCH /fqdns/{id}`

Optional: `connection_id` (string), `dns_record_type` (string), `fqdn` (string), `port` (['integer', 'null'])

```javascript
const fqdn = await client.fqdns.update('1517907029795014409');

console.log(fqdn.data);
```

## Delete an FQDN

Delete an FQDN.

`DELETE /fqdns/{id}`

```javascript
const fqdn = await client.fqdns.delete('1517907029795014409');

console.log(fqdn.data);
```

## List Ip connections

Returns a list of your IP connections.

`GET /ip_connections`

```javascript
// Automatically fetches more pages as needed.
for await (const ipConnection of client.ipConnections.list()) {
  console.log(ipConnection.id);
}
```

## Create an Ip connection

Creates an IP connection.

`POST /ip_connections`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const ipConnection = await client.ipConnections.create();

console.log(ipConnection.data);
```

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`GET /ip_connections/{id}`

```javascript
const ipConnection = await client.ipConnections.retrieve('id');

console.log(ipConnection.data);
```

## Update an Ip connection

Updates settings of an existing IP connection.

`PATCH /ip_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const ipConnection = await client.ipConnections.update('id');

console.log(ipConnection.data);
```

## Delete an Ip connection

Deletes an existing IP connection.

`DELETE /ip_connections/{id}`

```javascript
const ipConnection = await client.ipConnections.delete('id');

console.log(ipConnection.data);
```

## List Ips

Get all IPs belonging to the user that match the given filters.

`GET /ips`

```javascript
// Automatically fetches more pages as needed.
for await (const ip of client.ips.list()) {
  console.log(ip.id);
}
```

## Create an Ip

Create a new IP object.

`POST /ips` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```javascript
const ip = await client.ips.create({ ip_address: '192.168.0.0' });

console.log(ip.data);
```

## Retrieve an Ip

Return the details regarding a specific IP.

`GET /ips/{id}`

```javascript
const ip = await client.ips.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(ip.data);
```

## Update an Ip

Update the details of a specific IP.

`PATCH /ips/{id}` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```javascript
const ip = await client.ips.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58', {
  ip_address: '192.168.0.0',
});

console.log(ip.data);
```

## Delete an Ip

Delete an IP.

`DELETE /ips/{id}`

```javascript
const ip = await client.ips.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(ip.data);
```

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`GET /outbound_voice_profiles`

```javascript
// Automatically fetches more pages as needed.
for await (const outboundVoiceProfile of client.outboundVoiceProfiles.list()) {
  console.log(outboundVoiceProfile.id);
}
```

## Create an outbound voice profile

Create an outbound voice profile.

`POST /outbound_voice_profiles` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.create({ name: 'office' });

console.log(outboundVoiceProfile.data);
```

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`GET /outbound_voice_profiles/{id}`

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.retrieve('1293384261075731499');

console.log(outboundVoiceProfile.data);
```

## Updates an existing outbound voice profile.

`PATCH /outbound_voice_profiles/{id}` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.update('1293384261075731499', {
  name: 'office',
});

console.log(outboundVoiceProfile.data);
```

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`DELETE /outbound_voice_profiles/{id}`

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.delete('1293384261075731499');

console.log(outboundVoiceProfile.data);
```
