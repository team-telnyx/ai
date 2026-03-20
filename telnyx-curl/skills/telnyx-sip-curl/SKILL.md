---
name: telnyx-sip-curl
description: >-
  SIP trunking connections and outbound voice profiles. Use for PBX or SIP
  infrastructure.
metadata:
  author: telnyx
  product: sip
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - curl

## Core Workflow

### Prerequisites

1. Choose connection type based on your PBX: IP (static IP), FQDN (dynamic IP/DNS), or Credential (username/password)
2. Create an outbound voice profile for caller ID and billing settings

### Steps

1. **Create connection**
2. **Create outbound profile**
3. **Assign numbers**

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| PBX with static IP address | IP Connection |
| PBX with dynamic IP or DNS hostname | FQDN Connection |
| SIP phone/softphone with username/password auth | Credential Connection |

### Common mistakes

- NEVER mix connection types for the same trunk — choose one and be consistent
- Outbound voice profile controls caller ID, number selection, and billing — required for outbound calls via SIP

**Related skills**: telnyx-numbers-curl, telnyx-numbers-config-curl, telnyx-voice-curl

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
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create a credential connection

Creates a credential connection.

`POST /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_name` | string | Yes | The user name to be used as part of the credentials. |
| `password` | string | Yes | The password to be used as part of the credentials. |
| `connection_name` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sip_uri_calling_preference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +19 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create an Ip connection

Creates an IP connection.

`POST /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create an FQDN connection

Creates a FQDN connection.

`POST /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_name` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create an outbound voice profile

Create an outbound voice profile.

`POST /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `tags` | array[string] | No |  |
| `billing_group_id` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `traffic_type` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `.data.id, .data.name, .data.created_at`

## List connections

Returns a list of your connections irrespective of type.

`GET /connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/connections?sort=connection_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List all Access IP Ranges

`GET /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/access_ip_ranges"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create new Access IP Range

`POST /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cidr_block` | string | Yes |  |
| `description` | string | No |  |

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

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete access IP ranges

`DELETE /access_ip_ranges/{access_ip_range_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_range_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/access_ip_ranges/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve a connection

Retrieves the high-level details of an existing connection. To retrieve specific authentication information, use the endpoint for the specific connection type.

`GET /connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List credential connections

Returns a list of your credential connections.

`GET /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/credential_connections?sort=connection_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`GET /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a credential connection

Updates settings of an existing credential connection.

`PATCH /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sip_uri_calling_preference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +22 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete a credential connection

Deletes an existing credential connection.

`DELETE /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`POST /credential_connections/{id}/actions/check_registration_status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/credential_connections/550e8400-e29b-41d4-a716-446655440000/actions/check_registration_status"
```

Key response fields: `.data.status, .data.ip_address, .data.last_registration`

## List FQDN connections

Returns a list of your FQDN connections.

`GET /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdn_connections?sort=connection_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`GET /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdn_connections/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`PATCH /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/fqdn_connections/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete an FQDN connection

Deletes an FQDN connection.

`DELETE /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fqdn_connections/1293384261075731499"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`GET /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdns"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Create an FQDN

Create a new FQDN object.

`POST /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | Yes | FQDN represented by this resource. |
| `dns_record_type` | string | Yes | The DNS record type for the FQDN. |
| `port` | integer | No | Port to use when connecting to this FQDN. |

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

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`GET /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/fqdns/1517907029795014409"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Update an FQDN

Update the details of a specific FQDN.

`PATCH /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connection_id` | string (UUID) | No | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | No | FQDN represented by this resource. |
| `port` | integer | No | Port to use when connecting to this FQDN. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/fqdns/1517907029795014409"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Delete an FQDN

Delete an FQDN.

`DELETE /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fqdns/1517907029795014409"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## List Ip connections

Returns a list of your IP connections.

`GET /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ip_connections?sort=connection_name"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`GET /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ip_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update an Ip connection

Updates settings of an existing IP connection.

`PATCH /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transport_protocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ip_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete an Ip connection

Deletes an existing IP connection.

`DELETE /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ip_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List Ips

Get all IPs belonging to the user that match the given filters.

`GET /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ips"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Create an Ip

Create a new IP object.

`POST /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `connection_id` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

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

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Retrieve an Ip

Return the details regarding a specific IP.

`GET /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Update an Ip

Update the details of a specific IP.

`PATCH /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `connection_id` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

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

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Delete an Ip

Delete an IP.

`DELETE /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.connection_id, .data.created_at`

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`GET /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (enabled, -enabled, created_at, -created_at, name, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/outbound_voice_profiles?sort=name"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`GET /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/outbound_voice_profiles/1293384261075731499"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Updates an existing outbound voice profile.

`PATCH /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No |  |
| `billing_group_id` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `traffic_type` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`DELETE /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/outbound_voice_profiles/1293384261075731499"
```

Key response fields: `.data.id, .data.name, .data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
