<!-- SDK reference: telnyx-sip-go -->

# Telnyx Sip - Go

## Core Workflow

### Prerequisites

1. Choose connection type based on your PBX: IP (static IP), FQDN (dynamic IP/DNS), or Credential (username/password)
2. Create an outbound voice profile for caller ID and billing settings

### Steps

1. **Create connection**: `client.IpConnections.Create(ctx, params)`
2. **Create outbound profile**: `client.OutboundVoiceProfiles.Create(ctx, params)`
3. **Assign numbers**: `client.PhoneNumbers.Voice.Update(ctx, params)`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| PBX with static IP address | IP Connection |
| PBX with dynamic IP or DNS hostname | FQDN Connection |
| SIP phone/softphone with username/password auth | Credential Connection |

### Common mistakes

- NEVER mix connection types for the same trunk — choose one and be consistent
- Outbound voice profile controls caller ID, number selection, and billing — required for outbound calls via SIP

**Related skills**: telnyx-numbers-go, telnyx-numbers-config-go, telnyx-voice-go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.IpConnections.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Create a credential connection

Creates a credential connection.

`client.CredentialConnections.New()` — `POST /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UserName` | string | Yes | The user name to be used as part of the credentials. |
| `Password` | string | Yes | The password to be used as part of the credentials. |
| `ConnectionName` | string | Yes | A user-assigned name to help manage the connection. |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `SipUriCallingPreference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +19 optional params in the API Details section below |

```go
	credentialConnection, err := client.CredentialConnections.New(context.Background(), telnyx.CredentialConnectionNewParams{
		ConnectionName: "my name",
		Password:       "my123secure456password789",
		UserName:       "myusername123",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an Ip connection

Creates an IP connection.

`client.IPConnections.New()` — `POST /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Tags` | array[string] | No | Tags associated with the connection. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `TransportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```go
	ipConnection, err := client.IPConnections.New(context.Background(), telnyx.IPConnectionNewParams{
		ConnectionName: "my-ip-connection",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an FQDN connection

Creates a FQDN connection.

`client.FqdnConnections.New()` — `POST /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionName` | string | Yes | A user-assigned name to help manage the connection. |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `TransportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```go
	fqdnConnection, err := client.FqdnConnections.New(context.Background(), telnyx.FqdnConnectionNewParams{
		ConnectionName: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an outbound voice profile

Create an outbound voice profile.

`client.OutboundVoiceProfiles.New()` — `POST /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A user-supplied name to help with organization. |
| `Tags` | array[string] | No |  |
| `BillingGroupId` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `TrafficType` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in the API Details section below |

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.New(context.Background(), telnyx.OutboundVoiceProfileNewParams{
		Name: "office",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List connections

Returns a list of your connections irrespective of type.

`client.Connections.List()` — `GET /connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Connections.List(context.Background(), telnyx.ConnectionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all Access IP Ranges

`client.AccessIPRanges.List()` — `GET /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AccessIPRanges.List(context.Background(), telnyx.AccessIPRangeListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Range

`client.AccessIPRanges.New()` — `POST /access_ip_ranges`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CidrBlock` | string | Yes |  |
| `Description` | string | No |  |

```go
	accessIPRange, err := client.AccessIPRanges.New(context.Background(), telnyx.AccessIPRangeNewParams{
		CidrBlock: "203.0.113.0/24",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", accessIPRange.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP ranges

`client.AccessIPRanges.Delete()` — `DELETE /access_ip_ranges/{access_ip_range_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccessIpRangeId` | string (UUID) | Yes |  |

```go
	accessIPRange, err := client.AccessIPRanges.Delete(context.Background(), "access_ip_range_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", accessIPRange.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a connection

Retrieves the high-level details of an existing connection. To retrieve specific authentication information, use the endpoint for the specific connection type.

`client.Connections.Get()` — `GET /connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | IP Connection ID |

```go
	connection, err := client.Connections.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", connection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List credential connections

Returns a list of your credential connections.

`client.CredentialConnections.List()` — `GET /credential_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.CredentialConnections.List(context.Background(), telnyx.CredentialConnectionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`client.CredentialConnections.Get()` — `GET /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	credentialConnection, err := client.CredentialConnections.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a credential connection

Updates settings of an existing credential connection.

`client.CredentialConnections.Update()` — `PATCH /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `SipUriCallingPreference` | enum (disabled, unrestricted, internal) | No | This feature enables inbound SIP URI calls to your Credentia... |
| ... | | | +22 optional params in the API Details section below |

```go
	credentialConnection, err := client.CredentialConnections.Update(
		context.Background(),
		"id",
		telnyx.CredentialConnectionUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a credential connection

Deletes an existing credential connection.

`client.CredentialConnections.Delete()` — `DELETE /credential_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	credentialConnection, err := client.CredentialConnections.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`client.CredentialConnections.Actions.CheckRegistrationStatus()` — `POST /credential_connections/{id}/actions/check_registration_status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.CredentialConnections.Actions.CheckRegistrationStatus(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.ip_address, response.data.last_registration`

## List FQDN connections

Returns a list of your FQDN connections.

`client.FqdnConnections.List()` — `GET /fqdn_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.FqdnConnections.List(context.Background(), telnyx.FqdnConnectionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`client.FqdnConnections.Get()` — `GET /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	fqdnConnection, err := client.FqdnConnections.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`client.FqdnConnections.Update()` — `PATCH /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `TransportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```go
	fqdnConnection, err := client.FqdnConnections.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.FqdnConnectionUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an FQDN connection

Deletes an FQDN connection.

`client.FqdnConnections.Delete()` — `DELETE /fqdn_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	fqdnConnection, err := client.FqdnConnections.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`client.Fqdns.List()` — `GET /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Fqdns.List(context.Background(), telnyx.FqdnListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an FQDN

Create a new FQDN object.

`client.Fqdns.New()` — `POST /fqdns`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | ID of the FQDN connection to which this IP should be attache... |
| `Fqdn` | string | Yes | FQDN represented by this resource. |
| `DnsRecordType` | string | Yes | The DNS record type for the FQDN. |
| `Port` | integer | No | Port to use when connecting to this FQDN. |

```go
	fqdn, err := client.Fqdns.New(context.Background(), telnyx.FqdnNewParams{
		ConnectionID:  "1516447646313612565",
		DNSRecordType: "a",
		Fqdn:          "example.com",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`client.Fqdns.Get()` — `GET /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	fqdn, err := client.Fqdns.Get(context.Background(), "1517907029795014409")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an FQDN

Update the details of a specific FQDN.

`client.Fqdns.Update()` — `PATCH /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `ConnectionId` | string (UUID) | No | ID of the FQDN connection to which this IP should be attache... |
| `Fqdn` | string | No | FQDN represented by this resource. |
| `Port` | integer | No | Port to use when connecting to this FQDN. |
| ... | | | +1 optional params in the API Details section below |

```go
	fqdn, err := client.Fqdns.Update(
		context.Background(),
		"1517907029795014409",
		telnyx.FqdnUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an FQDN

Delete an FQDN.

`client.Fqdns.Delete()` — `DELETE /fqdns/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	fqdn, err := client.Fqdns.Delete(context.Background(), "1517907029795014409")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## List Ip connections

Returns a list of your IP connections.

`client.IPConnections.List()` — `GET /ip_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, connection_name, active) | No | Specifies the sort order for results. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.IPConnections.List(context.Background(), telnyx.IPConnectionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`client.IPConnections.Get()` — `GET /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | IP Connection ID |

```go
	ipConnection, err := client.IPConnections.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an Ip connection

Updates settings of an existing IP connection.

`client.IPConnections.Update()` — `PATCH /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `AnchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `TransportProtocol` | enum (UDP, TCP, TLS) | No | One of UDP, TLS, or TCP. |
| ... | | | +20 optional params in the API Details section below |

```go
	ipConnection, err := client.IPConnections.Update(
		context.Background(),
		"id",
		telnyx.IPConnectionUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an Ip connection

Deletes an existing IP connection.

`client.IPConnections.Delete()` — `DELETE /ip_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	ipConnection, err := client.IPConnections.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List Ips

Get all IPs belonging to the user that match the given filters.

`client.IPs.List()` — `GET /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.IPs.List(context.Background(), telnyx.IPListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Create an Ip

Create a new IP object.

`client.IPs.New()` — `POST /ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IpAddress` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `ConnectionId` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `Port` | integer | No | Port to use when connecting to this IP. |

```go
	ip, err := client.IPs.New(context.Background(), telnyx.IPNewParams{
		IPAddress: "192.168.0.0",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ip.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Retrieve an Ip

Return the details regarding a specific IP.

`client.IPs.Get()` — `GET /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	ip, err := client.IPs.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ip.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Update an Ip

Update the details of a specific IP.

`client.IPs.Update()` — `PATCH /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IpAddress` | string (IPv4/IPv6) | Yes | IP adddress represented by this resource. |
| `Id` | string (UUID) | Yes | Identifies the type of resource. |
| `ConnectionId` | string (UUID) | No | ID of the IP Connection to which this IP should be attached. |
| `Port` | integer | No | Port to use when connecting to this IP. |

```go
	ip, err := client.IPs.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.IPUpdateParams{
			IPAddress: "192.168.0.0",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ip.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Delete an Ip

Delete an IP.

`client.IPs.Delete()` — `DELETE /ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	ip, err := client.IPs.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", ip.Data)
```

Key response fields: `response.data.id, response.data.connection_id, response.data.created_at`

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`client.OutboundVoiceProfiles.List()` — `GET /outbound_voice_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (enabled, -enabled, created_at, -created_at, name, ...) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.OutboundVoiceProfiles.List(context.Background(), telnyx.OutboundVoiceProfileListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`client.OutboundVoiceProfiles.Get()` — `GET /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Updates an existing outbound voice profile.

`client.OutboundVoiceProfiles.Update()` — `PATCH /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A user-supplied name to help with organization. |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No |  |
| `BillingGroupId` | string (UUID) | No | The ID of the billing group associated with the outbound pro... |
| `TrafficType` | enum (conversational) | No | Specifies the type of traffic allowed in this profile. |
| ... | | | +10 optional params in the API Details section below |

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.OutboundVoiceProfileUpdateParams{
			Name: "office",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`client.OutboundVoiceProfiles.Delete()` — `DELETE /outbound_voice_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

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
