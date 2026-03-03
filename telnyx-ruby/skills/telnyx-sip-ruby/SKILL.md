---
name: telnyx-sip-ruby
description: >-
  Configure SIP trunking connections and outbound voice profiles. Use when
  connecting PBX systems or managing SIP infrastructure. This skill provides
  Ruby SDK examples.
metadata:
  author: telnyx
  product: sip
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## List all Access IP Ranges

`GET /access_ip_ranges`

```ruby
page = client.access_ip_ranges.list

puts(page)
```

## Create new Access IP Range

`POST /access_ip_ranges` — Required: `cidr_block`

Optional: `description` (string)

```ruby
access_ip_range = client.access_ip_ranges.create(cidr_block: "cidr_block")

puts(access_ip_range)
```

## Delete access IP ranges

`DELETE /access_ip_ranges/{access_ip_range_id}`

```ruby
access_ip_range = client.access_ip_ranges.delete("access_ip_range_id")

puts(access_ip_range)
```

## List connections

Returns a list of your connections irrespective of type.

`GET /connections`

```ruby
page = client.connections.list

puts(page)
```

## Retrieve a connection

Retrieves the high-level details of an existing connection.

`GET /connections/{id}`

```ruby
connection = client.connections.retrieve("id")

puts(connection)
```

## List credential connections

Returns a list of your credential connections.

`GET /credential_connections`

```ruby
page = client.credential_connections.list

puts(page)
```

## Create a credential connection

Creates a credential connection.

`POST /credential_connections` — Required: `user_name`, `password`, `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```ruby
credential_connection = client.credential_connections.create(
  connection_name: "my name",
  password: "my123secure456password789",
  user_name: "myusername123"
)

puts(credential_connection)
```

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`GET /credential_connections/{id}`

```ruby
credential_connection = client.credential_connections.retrieve("id")

puts(credential_connection)
```

## Update a credential connection

Updates settings of an existing credential connection.

`PATCH /credential_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `user_name` (string), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```ruby
credential_connection = client.credential_connections.update("id")

puts(credential_connection)
```

## Delete a credential connection

Deletes an existing credential connection.

`DELETE /credential_connections/{id}`

```ruby
credential_connection = client.credential_connections.delete("id")

puts(credential_connection)
```

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`POST /credential_connections/{id}/actions/check_registration_status`

```ruby
response = client.credential_connections.actions.check_registration_status("id")

puts(response)
```

## List FQDN connections

Returns a list of your FQDN connections.

`GET /fqdn_connections`

```ruby
page = client.fqdn_connections.list

puts(page)
```

## Create an FQDN connection

Creates a FQDN connection.

`POST /fqdn_connections` — Required: `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```ruby
fqdn_connection = client.fqdn_connections.create(connection_name: "string")

puts(fqdn_connection)
```

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`GET /fqdn_connections/{id}`

```ruby
fqdn_connection = client.fqdn_connections.retrieve("1293384261075731499")

puts(fqdn_connection)
```

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`PATCH /fqdn_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```ruby
fqdn_connection = client.fqdn_connections.update("1293384261075731499")

puts(fqdn_connection)
```

## Delete an FQDN connection

Deletes an FQDN connection.

`DELETE /fqdn_connections/{id}`

```ruby
fqdn_connection = client.fqdn_connections.delete("1293384261075731499")

puts(fqdn_connection)
```

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`GET /fqdns`

```ruby
page = client.fqdns.list

puts(page)
```

## Create an FQDN

Create a new FQDN object.

`POST /fqdns` — Required: `fqdn`, `dns_record_type`, `connection_id`

Optional: `port` (['integer', 'null'])

```ruby
fqdn = client.fqdns.create(connection_id: "1516447646313612565", dns_record_type: "a", fqdn: "example.com")

puts(fqdn)
```

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`GET /fqdns/{id}`

```ruby
fqdn = client.fqdns.retrieve("1517907029795014409")

puts(fqdn)
```

## Update an FQDN

Update the details of a specific FQDN.

`PATCH /fqdns/{id}`

Optional: `connection_id` (string), `dns_record_type` (string), `fqdn` (string), `port` (['integer', 'null'])

```ruby
fqdn = client.fqdns.update("1517907029795014409")

puts(fqdn)
```

## Delete an FQDN

Delete an FQDN.

`DELETE /fqdns/{id}`

```ruby
fqdn = client.fqdns.delete("1517907029795014409")

puts(fqdn)
```

## List Ip connections

Returns a list of your IP connections.

`GET /ip_connections`

```ruby
page = client.ip_connections.list

puts(page)
```

## Create an Ip connection

Creates an IP connection.

`POST /ip_connections`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```ruby
ip_connection = client.ip_connections.create

puts(ip_connection)
```

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`GET /ip_connections/{id}`

```ruby
ip_connection = client.ip_connections.retrieve("id")

puts(ip_connection)
```

## Update an Ip connection

Updates settings of an existing IP connection.

`PATCH /ip_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```ruby
ip_connection = client.ip_connections.update("id")

puts(ip_connection)
```

## Delete an Ip connection

Deletes an existing IP connection.

`DELETE /ip_connections/{id}`

```ruby
ip_connection = client.ip_connections.delete("id")

puts(ip_connection)
```

## List Ips

Get all IPs belonging to the user that match the given filters.

`GET /ips`

```ruby
page = client.ips.list

puts(page)
```

## Create an Ip

Create a new IP object.

`POST /ips` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```ruby
ip = client.ips.create(ip_address: "192.168.0.0")

puts(ip)
```

## Retrieve an Ip

Return the details regarding a specific IP.

`GET /ips/{id}`

```ruby
ip = client.ips.retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58")

puts(ip)
```

## Update an Ip

Update the details of a specific IP.

`PATCH /ips/{id}` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```ruby
ip = client.ips.update("6a09cdc3-8948-47f0-aa62-74ac943d6c58", ip_address: "192.168.0.0")

puts(ip)
```

## Delete an Ip

Delete an IP.

`DELETE /ips/{id}`

```ruby
ip = client.ips.delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58")

puts(ip)
```

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`GET /outbound_voice_profiles`

```ruby
page = client.outbound_voice_profiles.list

puts(page)
```

## Create an outbound voice profile

Create an outbound voice profile.

`POST /outbound_voice_profiles` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```ruby
outbound_voice_profile = client.outbound_voice_profiles.create(name: "office")

puts(outbound_voice_profile)
```

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`GET /outbound_voice_profiles/{id}`

```ruby
outbound_voice_profile = client.outbound_voice_profiles.retrieve("1293384261075731499")

puts(outbound_voice_profile)
```

## Updates an existing outbound voice profile.

`PATCH /outbound_voice_profiles/{id}` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```ruby
outbound_voice_profile = client.outbound_voice_profiles.update("1293384261075731499", name: "office")

puts(outbound_voice_profile)
```

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`DELETE /outbound_voice_profiles/{id}`

```ruby
outbound_voice_profile = client.outbound_voice_profiles.delete("1293384261075731499")

puts(outbound_voice_profile)
```
