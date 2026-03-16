---
name: telnyx-sip-javascript
description: >-
  SIP trunking connections and outbound voice profiles. Use for PBX or SIP
  infrastructure.
metadata:
  author: telnyx
  product: sip
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - JavaScript

## Core Workflow

### Prerequisites

1. Choose connection type based on your PBX: IP (static IP), FQDN (dynamic IP/DNS), or Credential (username/password)
2. Create an outbound voice profile for caller ID and billing settings

### Steps

1. **Create connection**: `client.ipConnections.create()`
2. **Create outbound profile**: `client.outboundVoiceProfiles.create({name: ...})`
3. **Assign numbers**: `client.phoneNumbers.voice.update({id: ..., connectionId: ...})`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| PBX with static IP address | IP Connection |
| PBX with dynamic IP or DNS hostname | FQDN Connection |
| SIP phone/softphone with username/password auth | Credential Connection |

### Common mistakes

- NEVER mix connection types for the same trunk — choose one and be consistent
- Outbound voice profile controls caller ID, number selection, and billing — required for outbound calls via SIP

**Related skills**: telnyx-numbers-javascript, telnyx-numbers-config-javascript, telnyx-voice-javascript

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.ip_connections.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create a credential connection

Creates a credential connection.

`client.credentialConnections.create()` — `POST /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Yes | The user name to be used as part of the credentials. |
| `password` | string | Yes | The password to be used as part of the credentials. |
| `connectionName` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sipUriCallingPreference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +19 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const credentialConnection = await client.credentialConnections.create({
  connection_name: 'my name',
  password: 'my123secure456password789',
  user_name: 'myusername123',
});

console.log(credentialConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an Ip connection

Creates an IP connection.

`client.ipConnections.create()` — `POST /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const ipConnection = await client.ipConnections.create({
    connectionName: 'my-ip-connection',
});

console.log(ipConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an FQDN connection

Creates a FQDN connection.

`client.fqdnConnections.create()` — `POST /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionName` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const fqdnConnection = await client.fqdnConnections.create({ connection_name: 'my-resource' });

console.log(fqdnConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an outbound voice profile

Create an outbound voice profile.

`client.outboundVoiceProfiles.create()` — `POST /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `tags` | array[string] | No |  |
| `billingGroupId` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `trafficType` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.create({ name: 'office' });

console.log(outboundVoiceProfile.data);
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

```javascript
// Automatically fetches more pages as needed.
for await (const connectionListResponse of client.connections.list()) {
  console.log(connectionListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Access IP Ranges

`client.accessIPRanges.list()` — `GET /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const accessIPRange of client.accessIPRanges.list()) {
  console.log(accessIPRange.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Range

`client.accessIPRanges.create()` — `POST /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cidrBlock` | string | Yes |  |
| `description` | string | No |  |

```javascript
const accessIPRange = await client.accessIPRanges.create({ cidr_block: 'cidr_block' });

console.log(accessIPRange.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP ranges

`client.accessIPRanges.delete()` — `DELETE /access_ip_ranges/{access_ip_range_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accessIpRangeId` | string (UUID) | Yes |  |

```javascript
const accessIPRange = await client.accessIPRanges.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(accessIPRange.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a connection

Retrieves the high-level details of an existing connection. To retrieve specific authentication information, use the endpoint for the specific connection type.

`client.connections.retrieve()` — `GET /connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```javascript
const connection = await client.connections.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(connection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List credential connections

Returns a list of your credential connections.

`client.credentialConnections.list()` — `GET /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const credentialConnection of client.credentialConnections.list()) {
  console.log(credentialConnection.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`client.credentialConnections.retrieve()` — `GET /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const credentialConnection = await client.credentialConnections.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(credentialConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a credential connection

Updates settings of an existing credential connection.

`client.credentialConnections.update()` — `PATCH /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sipUriCallingPreference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +22 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const credentialConnection = await client.credentialConnections.update('550e8400-e29b-41d4-a716-446655440000');

console.log(credentialConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a credential connection

Deletes an existing credential connection.

`client.credentialConnections.delete()` — `DELETE /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const credentialConnection = await client.credentialConnections.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(credentialConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`client.credentialConnections.actions.checkRegistrationStatus()` — `POST /credential_connections/{id}/actions/check_registration_status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.credentialConnections.actions.checkRegistrationStatus('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.status, response.data.ip_address, response.data.last_registration`

## List FQDN connections

Returns a list of your FQDN connections.

`client.fqdnConnections.list()` — `GET /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const fqdnConnection of client.fqdnConnections.list()) {
  console.log(fqdnConnection.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`client.fqdnConnections.retrieve()` — `GET /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const fqdnConnection = await client.fqdnConnections.retrieve('1293384261075731499');

console.log(fqdnConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`client.fqdnConnections.update()` — `PATCH /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const fqdnConnection = await client.fqdnConnections.update('1293384261075731499');

console.log(fqdnConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an FQDN connection

Deletes an FQDN connection.

`client.fqdnConnections.delete()` — `DELETE /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const fqdnConnection = await client.fqdnConnections.delete('1293384261075731499');

console.log(fqdnConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`client.fqdns.list()` — `GET /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const fqdn of client.fqdns.list()) {
  console.log(fqdn.id);
}
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an FQDN

Create a new FQDN object.

`client.fqdns.create()` — `POST /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | Yes | FQDN represented by this resource. |
| `dnsRecordType` | string | Yes | The DNS record type for the FQDN. |
| `port` | integer | No | Port to use when connecting to this FQDN. |

```javascript
const fqdn = await client.fqdns.create({
  connection_id: '1516447646313612565',
  dns_record_type: 'a',
  fqdn: 'example.com',
});

console.log(fqdn.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`client.fqdns.retrieve()` — `GET /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const fqdn = await client.fqdns.retrieve('1517907029795014409');

console.log(fqdn.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an FQDN

Update the details of a specific FQDN.

`client.fqdns.update()` — `PATCH /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connectionId` | string (UUID) | No | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | No | FQDN represented by this resource. |
| `port` | integer | No | Port to use when connecting to this FQDN. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const fqdn = await client.fqdns.update('1517907029795014409');

console.log(fqdn.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an FQDN

Delete an FQDN.

`client.fqdns.delete()` — `DELETE /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const fqdn = await client.fqdns.delete('1517907029795014409');

console.log(fqdn.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## List Ip connections

Returns a list of your IP connections.

`client.ipConnections.list()` — `GET /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const ipConnection of client.ipConnections.list()) {
  console.log(ipConnection.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`client.ipConnections.retrieve()` — `GET /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```javascript
const ipConnection = await client.ipConnections.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(ipConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an Ip connection

Updates settings of an existing IP connection.

`client.ipConnections.update()` — `PATCH /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const ipConnection = await client.ipConnections.update('550e8400-e29b-41d4-a716-446655440000');

console.log(ipConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an Ip connection

Deletes an existing IP connection.

`client.ipConnections.delete()` — `DELETE /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const ipConnection = await client.ipConnections.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(ipConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List Ips

Get all IPs belonging to the user that match the given filters.

`client.ips.list()` — `GET /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const ip of client.ips.list()) {
  console.log(ip.id);
}
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an Ip

Create a new IP object.

`client.ips.create()` — `POST /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ipAddress` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `connectionId` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

```javascript
const ip = await client.ips.create({ ip_address: '192.168.0.0' });

console.log(ip.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an Ip

Return the details regarding a specific IP.

`client.ips.retrieve()` — `GET /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const ip = await client.ips.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(ip.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an Ip

Update the details of a specific IP.

`client.ips.update()` — `PATCH /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ipAddress` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `connectionId` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

```javascript
const ip = await client.ips.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58', {
  ip_address: '192.168.0.0',
});

console.log(ip.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an Ip

Delete an IP.

`client.ips.delete()` — `DELETE /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const ip = await client.ips.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(ip.data);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`client.outboundVoiceProfiles.list()` — `GET /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (enabled, -enabled, created_at, -created_at, name, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const outboundVoiceProfile of client.outboundVoiceProfiles.list()) {
  console.log(outboundVoiceProfile.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`client.outboundVoiceProfiles.retrieve()` — `GET /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.retrieve('1293384261075731499');

console.log(outboundVoiceProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Updates an existing outbound voice profile.

`client.outboundVoiceProfiles.update()` — `PATCH /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No |  |
| `billingGroupId` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `trafficType` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.update('1293384261075731499', {
  name: 'office',
});

console.log(outboundVoiceProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`client.outboundVoiceProfiles.delete()` — `DELETE /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const outboundVoiceProfile = await client.outboundVoiceProfiles.delete('1293384261075731499');

console.log(outboundVoiceProfile.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
