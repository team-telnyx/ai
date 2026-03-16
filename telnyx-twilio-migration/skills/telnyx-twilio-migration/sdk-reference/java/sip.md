<!-- SDK reference: telnyx-sip-java -->

# Telnyx Sip - Java

## Core Workflow

### Prerequisites

1. Choose connection type based on your PBX: IP (static IP), FQDN (dynamic IP/DNS), or Credential (username/password)
2. Create an outbound voice profile for caller ID and billing settings

### Steps

1. **Create connection**: `client.ipConnections().create(params)`
2. **Create outbound profile**: `client.outboundVoiceProfiles().create(params)`
3. **Assign numbers**: `client.phoneNumbers().voice().update(params)`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| PBX with static IP address | IP Connection |
| PBX with dynamic IP or DNS hostname | FQDN Connection |
| SIP phone/softphone with username/password auth | Credential Connection |

### Common mistakes

- NEVER mix connection types for the same trunk — choose one and be consistent
- Outbound voice profile controls caller ID, number selection, and billing — required for outbound calls via SIP

**Related skills**: telnyx-numbers-java, telnyx-numbers-config-java, telnyx-voice-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.ipConnections().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a credential connection

Creates a credential connection.

`client.credentialConnections().create()` — `POST /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userName` | string | Yes | The user name to be used as part of the credentials. |
| `password` | string | Yes | The password to be used as part of the credentials. |
| `connectionName` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sipUriCallingPreference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +19 optional params in the API Details section below |

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

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an Ip connection

Creates an IP connection.

`client.ipConnections().create()` — `POST /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionCreateParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionCreateResponse;

IpConnectionCreateParams params = IpConnectionCreateParams.builder()

    .connectionName("my-ip-connection")

    .build();

IpConnectionCreateResponse ipConnection = client.ipConnections().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an FQDN connection

Creates a FQDN connection.

`client.fqdnConnections().create()` — `POST /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionName` | string | Yes | A user-assigned name to help manage the connection. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionCreateParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionCreateResponse;

FqdnConnectionCreateParams params = FqdnConnectionCreateParams.builder()
    .connectionName("my-sip-connection")
    .build();
FqdnConnectionCreateResponse fqdnConnection = client.fqdnConnections().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an outbound voice profile

Create an outbound voice profile.

`client.outboundVoiceProfiles().create()` — `POST /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `tags` | array[string] | No |  |
| `billingGroupId` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `trafficType` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileCreateParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileCreateResponse;

OutboundVoiceProfileCreateParams params = OutboundVoiceProfileCreateParams.builder()
    .name("office")
    .build();
OutboundVoiceProfileCreateResponse outboundVoiceProfile = client.outboundVoiceProfiles().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List connections

Returns a list of your connections irrespective of type.

`client.connections().list()` — `GET /connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.connections.ConnectionListPage;
import com.telnyx.sdk.models.connections.ConnectionListParams;

ConnectionListPage page = client.connections().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Access IP Ranges

`client.accessIpRanges().list()` — `GET /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.accessipranges.AccessIpRangeListPage;
import com.telnyx.sdk.models.accessipranges.AccessIpRangeListParams;

AccessIpRangeListPage page = client.accessIpRanges().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Range

`client.accessIpRanges().create()` — `POST /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cidrBlock` | string | Yes |  |
| `description` | string | No |  |

```java
import com.telnyx.sdk.models.accessipranges.AccessIpRange;
import com.telnyx.sdk.models.accessipranges.AccessIpRangeCreateParams;

AccessIpRangeCreateParams params = AccessIpRangeCreateParams.builder()
    .cidrBlock("203.0.113.0/24")
    .build();
AccessIpRange accessIpRange = client.accessIpRanges().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP ranges

`client.accessIpRanges().delete()` — `DELETE /access_ip_ranges/{access_ip_range_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accessIpRangeId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.accessipranges.AccessIpRange;
import com.telnyx.sdk.models.accessipranges.AccessIpRangeDeleteParams;

AccessIpRange accessIpRange = client.accessIpRanges().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a connection

Retrieves the high-level details of an existing connection. To retrieve specific authentication information, use the endpoint for the specific connection type.

`client.connections().retrieve()` — `GET /connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```java
import com.telnyx.sdk.models.connections.ConnectionRetrieveParams;
import com.telnyx.sdk.models.connections.ConnectionRetrieveResponse;

ConnectionRetrieveResponse connection = client.connections().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List credential connections

Returns a list of your credential connections.

`client.credentialConnections().list()` — `GET /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionListPage;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionListParams;

CredentialConnectionListPage page = client.credentialConnections().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`client.credentialConnections().retrieve()` — `GET /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionRetrieveParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionRetrieveResponse;

CredentialConnectionRetrieveResponse credentialConnection = client.credentialConnections().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a credential connection

Updates settings of an existing credential connection.

`client.credentialConnections().update()` — `PATCH /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `sipUriCallingPreference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +22 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionUpdateParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionUpdateResponse;

CredentialConnectionUpdateResponse credentialConnection = client.credentialConnections().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a credential connection

Deletes an existing credential connection.

`client.credentialConnections().delete()` — `DELETE /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionDeleteParams;
import com.telnyx.sdk.models.credentialconnections.CredentialConnectionDeleteResponse;

CredentialConnectionDeleteResponse credentialConnection = client.credentialConnections().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`client.credentialConnections().actions().checkRegistrationStatus()` — `POST /credential_connections/{id}/actions/check_registration_status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.credentialconnections.actions.ActionCheckRegistrationStatusParams;
import com.telnyx.sdk.models.credentialconnections.actions.ActionCheckRegistrationStatusResponse;

ActionCheckRegistrationStatusResponse response = client.credentialConnections().actions().checkRegistrationStatus("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.status, response.data.ip_address, response.data.last_registration`

## List FQDN connections

Returns a list of your FQDN connections.

`client.fqdnConnections().list()` — `GET /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionListPage;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionListParams;

FqdnConnectionListPage page = client.fqdnConnections().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`client.fqdnConnections().retrieve()` — `GET /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionRetrieveParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionRetrieveResponse;

FqdnConnectionRetrieveResponse fqdnConnection = client.fqdnConnections().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`client.fqdnConnections().update()` — `PATCH /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionUpdateParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionUpdateResponse;

FqdnConnectionUpdateResponse fqdnConnection = client.fqdnConnections().update("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an FQDN connection

Deletes an FQDN connection.

`client.fqdnConnections().delete()` — `DELETE /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionDeleteParams;
import com.telnyx.sdk.models.fqdnconnections.FqdnConnectionDeleteResponse;

FqdnConnectionDeleteResponse fqdnConnection = client.fqdnConnections().delete("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`client.fqdns().list()` — `GET /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.fqdns.FqdnListPage;
import com.telnyx.sdk.models.fqdns.FqdnListParams;

FqdnListPage page = client.fqdns().list();
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an FQDN

Create a new FQDN object.

`client.fqdns().create()` — `POST /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | Yes | FQDN represented by this resource. |
| `dnsRecordType` | string | Yes | The DNS record type for the FQDN. |
| `port` | integer | No | Port to use when connecting to this FQDN. |

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

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`client.fqdns().retrieve()` — `GET /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.fqdns.FqdnRetrieveParams;
import com.telnyx.sdk.models.fqdns.FqdnRetrieveResponse;

FqdnRetrieveResponse fqdn = client.fqdns().retrieve("1517907029795014409");
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an FQDN

Update the details of a specific FQDN.

`client.fqdns().update()` — `PATCH /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connectionId` | string (UUID) | No | ID of the FQDN connection to which this IP should be attache... |
| `fqdn` | string | No | FQDN represented by this resource. |
| `port` | integer | No | Port to use when connecting to this FQDN. |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.fqdns.FqdnUpdateParams;
import com.telnyx.sdk.models.fqdns.FqdnUpdateResponse;

FqdnUpdateResponse fqdn = client.fqdns().update("1517907029795014409");
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an FQDN

Delete an FQDN.

`client.fqdns().delete()` — `DELETE /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.fqdns.FqdnDeleteParams;
import com.telnyx.sdk.models.fqdns.FqdnDeleteResponse;

FqdnDeleteResponse fqdn = client.fqdns().delete("1517907029795014409");
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## List Ip connections

Returns a list of your IP connections.

`client.ipConnections().list()` — `GET /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionListPage;
import com.telnyx.sdk.models.ipconnections.IpConnectionListParams;

IpConnectionListPage page = client.ipConnections().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`client.ipConnections().retrieve()` — `GET /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | IP Connection ID |

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionRetrieveParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionRetrieveResponse;

IpConnectionRetrieveResponse ipConnection = client.ipConnections().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an Ip connection

Updates settings of an existing IP connection.

`client.ipConnections().update()` — `PATCH /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `transportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionUpdateParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionUpdateResponse;

IpConnectionUpdateResponse ipConnection = client.ipConnections().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an Ip connection

Deletes an existing IP connection.

`client.ipConnections().delete()` — `DELETE /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.ipconnections.IpConnectionDeleteParams;
import com.telnyx.sdk.models.ipconnections.IpConnectionDeleteResponse;

IpConnectionDeleteResponse ipConnection = client.ipConnections().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List Ips

Get all IPs belonging to the user that match the given filters.

`client.ips().list()` — `GET /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ips.IpListPage;
import com.telnyx.sdk.models.ips.IpListParams;

IpListPage page = client.ips().list();
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an Ip

Create a new IP object.

`client.ips().create()` — `POST /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ipAddress` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `connectionId` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

```java
import com.telnyx.sdk.models.ips.IpCreateParams;
import com.telnyx.sdk.models.ips.IpCreateResponse;

IpCreateParams params = IpCreateParams.builder()
    .ipAddress("192.168.0.0")
    .build();
IpCreateResponse ip = client.ips().create(params);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an Ip

Return the details regarding a specific IP.

`client.ips().retrieve()` — `GET /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.ips.IpRetrieveParams;
import com.telnyx.sdk.models.ips.IpRetrieveResponse;

IpRetrieveResponse ip = client.ips().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an Ip

Update the details of a specific IP.

`client.ips().update()` — `PATCH /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ipAddress` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `id` | string (UUID) | Yes | Identifies the type of resource. |
| `connectionId` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | No | Port to use when connecting to this IP. |

```java
import com.telnyx.sdk.models.ips.IpUpdateParams;
import com.telnyx.sdk.models.ips.IpUpdateResponse;

IpUpdateParams params = IpUpdateParams.builder()
    .id("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .ipAddress("192.168.0.0")
    .build();
IpUpdateResponse ip = client.ips().update(params);
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an Ip

Delete an IP.

`client.ips().delete()` — `DELETE /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.ips.IpDeleteParams;
import com.telnyx.sdk.models.ips.IpDeleteResponse;

IpDeleteResponse ip = client.ips().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`client.outboundVoiceProfiles().list()` — `GET /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (enabled, -enabled, created_at, -created_at, name, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileListPage;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileListParams;

OutboundVoiceProfileListPage page = client.outboundVoiceProfiles().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`client.outboundVoiceProfiles().retrieve()` — `GET /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileRetrieveParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileRetrieveResponse;

OutboundVoiceProfileRetrieveResponse outboundVoiceProfile = client.outboundVoiceProfiles().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Updates an existing outbound voice profile.

`client.outboundVoiceProfiles().update()` — `PATCH /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user-supplied name to help with organization. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No |  |
| `billingGroupId` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `trafficType` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileUpdateParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileUpdateResponse;

OutboundVoiceProfileUpdateParams params = OutboundVoiceProfileUpdateParams.builder()
    .id("1293384261075731499")
    .name("office")
    .build();
OutboundVoiceProfileUpdateResponse outboundVoiceProfile = client.outboundVoiceProfiles().update(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`client.outboundVoiceProfiles().delete()` — `DELETE /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileDeleteParams;
import com.telnyx.sdk.models.outboundvoiceprofiles.OutboundVoiceProfileDeleteResponse;

OutboundVoiceProfileDeleteResponse outboundVoiceProfile = client.outboundVoiceProfiles().delete("1293384261075731499");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

# SIP (Java) — API Details

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

### Create new Access IP Range — `client.accessIpRanges().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |

### Create a credential connection — `client.credentialConnections().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `sipUriCallingPreference` | enum (disabled, unrestricted, internal) | This feature enables inbound SIP URI calls to your Credential Auth Connection. |
| `defaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `iosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `androidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookApiVersion` | enum (1, 2, texml) | Determines which webhook format will be used, Telnyx API v1, v2 or texml. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcpSettings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `jitterBuffer` | object | Configuration options for Jitter Buffer. |

### Update a credential connection — `client.credentialConnections().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `userName` | string | The user name to be used as part of the credentials. |
| `password` | string | The password to be used as part of the credentials. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connectionName` | string | A user-assigned name to help manage the connection. |
| `sipUriCallingPreference` | enum (disabled, unrestricted, internal) | This feature enables inbound SIP URI calls to your Credential Auth Connection. |
| `defaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `iosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `androidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcpSettings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `jitterBuffer` | object | Configuration options for Jitter Buffer. |

### Create an FQDN connection — `client.fqdnConnections().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `transportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `defaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `microsoftTeamsSbc` | boolean | When enabled, the connection will be created for Microsoft Teams Direct Routing. |
| `onnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `tags` | array[string] | Tags associated with the connection. |
| `iosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `androidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `rtcpSettings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `jitterBuffer` | object | Configuration options for Jitter Buffer. |

### Update an FQDN connection — `client.fqdnConnections().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connectionName` | string | A user-assigned name to help manage the connection. |
| `transportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `defaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer that the sender and receiver negotiate T38 di... |
| `tags` | array[string] | Tags associated with the connection. |
| `iosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `androidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `rtcpSettings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `jitterBuffer` | object | Configuration options for Jitter Buffer. |

### Create an FQDN — `client.fqdns().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `port` | integer | Port to use when connecting to this FQDN. |

### Update an FQDN — `client.fqdns().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | string (UUID) | ID of the FQDN connection to which this IP should be attached. |
| `fqdn` | string | FQDN represented by this resource. |
| `port` | integer | Port to use when connecting to this FQDN. |
| `dnsRecordType` | string | The DNS record type for the FQDN. |

### Create an Ip connection — `client.ipConnections().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connectionName` | string |  |
| `transportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `defaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `iosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `androidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcpSettings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `jitterBuffer` | object | Configuration options for Jitter Buffer. |

### Update an Ip connection — `client.ipConnections().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Defaults to true |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | `Latency` directs Telnyx to route media through the site with the lowest roun... |
| `connectionName` | string |  |
| `transportProtocol` | enum (UDP, TCP, TLS) | One of UDP, TLS, or TCP. |
| `defaultOnHoldComfortNoiseEnabled` | boolean | When enabled, Telnyx will generate comfort noise when you place the call on h... |
| `dtmfType` | enum (RFC 2833, Inband, SIP INFO) | Sets the type of DTMF digits sent from Telnyx to this Connection. |
| `encodeContactHeaderEnabled` | boolean | Encode the SIP contact header sent by Telnyx to avoid issues for NAT or ALG s... |
| `encryptedMedia` | enum (SRTP, None) | Enable use of SRTP for encryption. |
| `onnetT38PassthroughEnabled` | boolean | Enable on-net T38 if you prefer the sender and receiver negotiating T38 direc... |
| `iosPushCredentialId` | string (UUID) | The uuid of the push credential for Ios |
| `androidPushCredentialId` | string (UUID) | The uuid of the push credential for Android |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookApiVersion` | enum (1, 2) | Determines which webhook format will be used, Telnyx API v1 or v2. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `callCostInWebhooks` | boolean | Specifies if call cost webhooks should be sent for this connection. |
| `tags` | array[string] | Tags associated with the connection. |
| `rtcpSettings` | object |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `noiseSuppression` | enum (inbound, outbound, both, disabled) | Controls when noise suppression is applied to calls. |
| `noiseSuppressionDetails` | object | Configuration options for noise suppression. |
| `jitterBuffer` | object | Configuration options for Jitter Buffer. |

### Create an Ip — `client.ips().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | string (UUID) | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | Port to use when connecting to this IP. |

### Update an Ip — `client.ips().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | string (UUID) | ID of the IP Connection to which this IP should be attached. |
| `port` | integer | Port to use when connecting to this IP. |

### Create an outbound voice profile — `client.outboundVoiceProfiles().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `trafficType` | enum (conversational) | Specifies the type of traffic allowed in this profile. |
| `servicePlan` | enum (global) | Indicates the coverage of the termination regions. |
| `concurrentCallLimit` | integer | Must be no more than your global concurrent call limit. |
| `enabled` | boolean | Specifies whether the outbound voice profile can be used. |
| `tags` | array[string] |  |
| `usagePaymentMethod` | enum (rate-deck) | Setting for how costs for outbound profile are calculated. |
| `whitelistedDestinations` | array[string] | The list of destinations you want to be able to call using this outbound voic... |
| `maxDestinationRate` | number | Maximum rate (price per minute) for a Destination to be allowed when making o... |
| `dailySpendLimit` | string | The maximum amount of usage charges, in USD, you want Telnyx to allow on this... |
| `dailySpendLimitEnabled` | boolean | Specifies whether to enforce the daily_spend_limit on this outbound voice pro... |
| `callRecording` | object |  |
| `billingGroupId` | string (UUID) | The ID of the billing group associated with the outbound proflile. |
| `callingWindow` | object | (BETA) Specifies the time window and call limits for calls made using this ou... |

### Updates an existing outbound voice profile. — `client.outboundVoiceProfiles().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `trafficType` | enum (conversational) | Specifies the type of traffic allowed in this profile. |
| `servicePlan` | enum (global) | Indicates the coverage of the termination regions. |
| `concurrentCallLimit` | integer | Must be no more than your global concurrent call limit. |
| `enabled` | boolean | Specifies whether the outbound voice profile can be used. |
| `tags` | array[string] |  |
| `usagePaymentMethod` | enum (rate-deck) | Setting for how costs for outbound profile are calculated. |
| `whitelistedDestinations` | array[string] | The list of destinations you want to be able to call using this outbound voic... |
| `maxDestinationRate` | number | Maximum rate (price per minute) for a Destination to be allowed when making o... |
| `dailySpendLimit` | string | The maximum amount of usage charges, in USD, you want Telnyx to allow on this... |
| `dailySpendLimitEnabled` | boolean | Specifies whether to enforce the daily_spend_limit on this outbound voice pro... |
| `callRecording` | object |  |
| `billingGroupId` | string (UUID) | The ID of the billing group associated with the outbound proflile. |
| `callingWindow` | object | (BETA) Specifies the time window and call limits for calls made using this ou... |
