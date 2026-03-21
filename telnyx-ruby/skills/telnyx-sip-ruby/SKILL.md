---
name: telnyx-sip-ruby
description: >-
  SIP trunking connections and outbound voice profiles. Use for PBX or SIP
  infrastructure.
metadata:
  author: telnyx
  product: sip
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - Ruby

## Core Workflow

### Prerequisites

1. Choose connection type based on your PBX: IP (static IP), FQDN (dynamic IP/DNS), or Credential (username/password)
2. Create an outbound voice profile for caller ID and billing settings

### Steps

1. **Create connection**: `client.ip_connections.create()`
2. **Create outbound profile**: `client.outbound_voice_profiles.create(name: ...)`
3. **Assign numbers**: `client.phone_numbers.voice.update(id: ..., connection_id: ...)`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| PBX with static IP address | IP Connection |
| PBX with dynamic IP or DNS hostname | FQDN Connection |
| SIP phone/softphone with username/password auth | Credential Connection |

### Common mistakes

- NEVER mix connection types for the same trunk — choose one and be consistent
- Outbound voice profile controls caller ID, number selection, and billing — required for outbound calls via SIP

**Related skills**: telnyx-numbers-ruby, telnyx-numbers-config-ruby, telnyx-voice-ruby

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.ip_connections.create(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create a credential connection

Creates a credential connection.

`client.credential_connections.create()` — `POST /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_name` | string | Yes | The user name to be used as part of the credentials. |
| `password` | string | Yes | The password to be used as part of the credentials. |
| `connection_name` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sip_uri_calling_preference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +19 optional params in [references/api-details.md](references/api-details.md) |

```ruby
credential_connection = client.credential_connections.create(
  connection_name: "my name",
  password: "my123secure456password789",
  user_name: "myusername123"
)

puts(credential_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an Ip connection

Creates an IP connection.

`client.ip_connections.create()` — `POST /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```ruby
ip_connection = client.ip_connections.create(connection_name: "my-ip-connection")
puts(ip_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an FQDN connection

Creates a FQDN connection.

`client.fqdn_connections.create()` — `POST /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_name` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```ruby
fqdn_connection = client.fqdn_connections.create(connection_name: "my-resource")

puts(fqdn_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an outbound voice profile

Create an outbound voice profile.

`client.outbound_voice_profiles.create()` — `POST /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `tags` | array[string] | No |  |
| `billing_group_id` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `traffic_type` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```ruby
outbound_voice_profile = client.outbound_voice_profiles.create(name: "office")

puts(outbound_voice_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List connections

Returns a list of your connections irrespective of type.

`client.connections.list()` — `GET /connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.connections.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Access IP Ranges

`client.access_ip_ranges.list()` — `GET /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.access_ip_ranges.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Range

`client.access_ip_ranges.create()` — `POST /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cidr_block` | string | Yes |  |
| `description` | string | No |  |

```ruby
access_ip_range = client.access_ip_ranges.create(cidr_block: "203.0.113.0/24")

puts(access_ip_range)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP ranges

`client.access_ip_ranges.delete()` — `DELETE /access_ip_ranges/{access_ip_range_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_range_id` | string (UUID) | Yes |  |

```ruby
access_ip_range = client.access_ip_ranges.delete("550e8400-e29b-41d4-a716-446655440000")

puts(access_ip_range)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a connection

Retrieves the high-level details of an existing connection. To retrieve specific authentication information, use the endpoint for the specific connection type.

`client.connections.retrieve()` — `GET /connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```ruby
connection = client.connections.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List credential connections

Returns a list of your credential connections.

`client.credential_connections.list()` — `GET /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.credential_connections.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`client.credential_connections.retrieve()` — `GET /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
credential_connection = client.credential_connections.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(credential_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a credential connection

Updates settings of an existing credential connection.

`client.credential_connections.update()` — `PATCH /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sip_uri_calling_preference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +22 optional params in [references/api-details.md](references/api-details.md) |

```ruby
credential_connection = client.credential_connections.update("550e8400-e29b-41d4-a716-446655440000")

puts(credential_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a credential connection

Deletes an existing credential connection.

`client.credential_connections.delete()` — `DELETE /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
credential_connection = client.credential_connections.delete("550e8400-e29b-41d4-a716-446655440000")

puts(credential_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`client.credential_connections.actions.check_registration_status()` — `POST /credential_connections/{id}/actions/check_registration_status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.credential_connections.actions.check_registration_status("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Key response fields: `response.data.status, response.data.ip_address, response.data.last_registration`

## List FQDN connections

Returns a list of your FQDN connections.

`client.fqdn_connections.list()` — `GET /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.fqdn_connections.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`client.fqdn_connections.retrieve()` — `GET /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
fqdn_connection = client.fqdn_connections.retrieve("1293384261075731499")

puts(fqdn_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`client.fqdn_connections.update()` — `PATCH /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```ruby
fqdn_connection = client.fqdn_connections.update("1293384261075731499")

puts(fqdn_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an FQDN connection

Deletes an FQDN connection.

`client.fqdn_connections.delete()` — `DELETE /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
fqdn_connection = client.fqdn_connections.delete("1293384261075731499")

puts(fqdn_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`client.fqdns.list()` — `GET /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.fqdns.list

puts(page)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an FQDN

Create a new FQDN object.

`client.fqdns.create()` — `POST /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | Yes | FQDN represented by this resource. |
| `dns_record_type` | string | Yes | The DNS record type for the FQDN. |
| `port` | integer | No | Port to use when connecting to this FQDN. |

```ruby
fqdn = client.fqdns.create(connection_id: "1516447646313612565", dns_record_type: "a", fqdn: "example.com")

puts(fqdn)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`client.fqdns.retrieve()` — `GET /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
fqdn = client.fqdns.retrieve("1517907029795014409")

puts(fqdn)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an FQDN

Update the details of a specific FQDN.

`client.fqdns.update()` — `PATCH /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connection_id` | string (UUID) | No | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | No | FQDN represented by this resource. |
| `port` | integer | No | Port to use when connecting to this FQDN. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```ruby
fqdn = client.fqdns.update("1517907029795014409")

puts(fqdn)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an FQDN

Delete an FQDN.

`client.fqdns.delete()` — `DELETE /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
fqdn = client.fqdns.delete("1517907029795014409")

puts(fqdn)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## List Ip connections

Returns a list of your IP connections.

`client.ip_connections.list()` — `GET /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.ip_connections.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`client.ip_connections.retrieve()` — `GET /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```ruby
ip_connection = client.ip_connections.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(ip_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an Ip connection

Updates settings of an existing IP connection.

`client.ip_connections.update()` — `PATCH /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```ruby
ip_connection = client.ip_connections.update("550e8400-e29b-41d4-a716-446655440000")

puts(ip_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an Ip connection

Deletes an existing IP connection.

`client.ip_connections.delete()` — `DELETE /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```ruby
ip_connection = client.ip_connections.delete("550e8400-e29b-41d4-a716-446655440000")

puts(ip_connection)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List Ips

Get all IPs belonging to the user that match the given filters.

`client.ips.list()` — `GET /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.ips.list

puts(page)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an Ip

Create a new IP object.

`client.ips.create()` — `POST /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `connection_id` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

```ruby
ip = client.ips.create(ip_address: "192.168.0.0")

puts(ip)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an Ip

Return the details regarding a specific IP.

`client.ips.retrieve()` — `GET /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```ruby
ip = client.ips.retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58")

puts(ip)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an Ip

Update the details of a specific IP.

`client.ips.update()` — `PATCH /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `connection_id` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

```ruby
ip = client.ips.update("6a09cdc3-8948-47f0-aa62-74ac943d6c58", ip_address: "192.168.0.0")

puts(ip)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an Ip

Delete an IP.

`client.ips.delete()` — `DELETE /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```ruby
ip = client.ips.delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58")

puts(ip)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`client.outbound_voice_profiles.list()` — `GET /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (enabled, -enabled, created_at, -created_at, name, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.outbound_voice_profiles.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`client.outbound_voice_profiles.retrieve()` — `GET /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
outbound_voice_profile = client.outbound_voice_profiles.retrieve("1293384261075731499")

puts(outbound_voice_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Updates an existing outbound voice profile.

`client.outbound_voice_profiles.update()` — `PATCH /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No |  |
| `billing_group_id` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `traffic_type` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```ruby
outbound_voice_profile = client.outbound_voice_profiles.update("1293384261075731499", name: "office")

puts(outbound_voice_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`client.outbound_voice_profiles.delete()` — `DELETE /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
outbound_voice_profile = client.outbound_voice_profiles.delete("1293384261075731499")

puts(outbound_voice_profile)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
