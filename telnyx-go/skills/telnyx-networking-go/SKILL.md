---
name: telnyx-networking-go
description: >-
  Private networks, WireGuard VPN gateways, internet gateways, and virtual cross
  connects.
metadata:
  author: telnyx
  product: networking
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - Go

## Core Workflow

### Prerequisites

1. Contact Telnyx support to enable private networking features on your account

### Steps

1. **Create network**: `client.Networks.Create(ctx, params)`
2. **Create WireGuard interface**: `client.WireguardInterfaces.Create(ctx, params)`
3. **Create gateway**: `client.PrivateWirelessGateways.Create(ctx, params)`

### Common mistakes

- Private networking requires account-level enablement — contact support first
- WireGuard peer configuration is returned once at creation — save it immediately

**Related skills**: telnyx-iot-go

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

result, err := client.Networks.Create(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all clusters

`client.AI.Clusters.List()` — `GET /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AI.Clusters.List(context.Background(), telnyx.AIClusterListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.created_at, response.data.bucket`

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`client.AI.Clusters.Compute()` — `POST /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Bucket` | string | Yes | The embedded storage bucket to compute the clusters from. |
| `Prefix` | string | No | Prefix to filter whcih files in the buckets are included. |
| `Files` | array[string] | No | Array of files to filter which are included. |
| `MinClusterSize` | integer | No | Smallest number of related text chunks to qualify as a clust... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.AI.Clusters.Compute(context.Background(), telnyx.AIClusterComputeParams{
		Bucket: "my-bucket",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.task_id`

## Fetch a cluster

`client.AI.Clusters.Get()` — `GET /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TaskId` | string (UUID) | Yes |  |
| `TopNNodes` | integer | No | The number of nodes in the cluster to return in the response... |
| `ShowSubclusters` | boolean | No | Whether or not to include subclusters and their nodes in the... |

```go
	cluster, err := client.AI.Clusters.Get(
		context.Background(),
		"task_id",
		telnyx.AIClusterGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", cluster.Data)
```

Key response fields: `response.data.status, response.data.bucket, response.data.clusters`

## Delete a cluster

`client.AI.Clusters.Delete()` — `DELETE /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TaskId` | string (UUID) | Yes |  |

```go
	err := client.AI.Clusters.Delete(context.Background(), "task_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Fetch a cluster visualization

`client.AI.Clusters.FetchGraph()` — `GET /ai/clusters/{task_id}/graph`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TaskId` | string (UUID) | Yes |  |
| `ClusterId` | integer | No |  |

```go
	response, err := client.AI.Clusters.FetchGraph(
		context.Background(),
		"task_id",
		telnyx.AIClusterFetchGraphParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List Integrations

List all available integrations.

`client.AI.Integrations.List()` — `GET /ai/integrations`

```go
	integrations, err := client.AI.Integrations.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", integrations.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List User Integrations

List user setup integrations

`client.AI.Integrations.Connections.List()` — `GET /ai/integrations/connections`

```go
	connections, err := client.AI.Integrations.Connections.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", connections.Data)
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Get User Integration connection By Id

Get user setup integrations

`client.AI.Integrations.Connections.Get()` — `GET /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UserConnectionId` | string (UUID) | Yes | The connection id |

```go
	connection, err := client.AI.Integrations.Connections.Get(context.Background(), "user_connection_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", connection.Data)
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Delete Integration Connection

Delete a specific integration connection.

`client.AI.Integrations.Connections.Delete()` — `DELETE /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UserConnectionId` | string (UUID) | Yes | The user integration connection identifier |

```go
	err := client.AI.Integrations.Connections.Delete(context.Background(), "user_connection_id")
	if err != nil {
		log.Fatal(err)
	}
```

## List Integration By Id

Retrieve integration details

`client.AI.Integrations.Get()` — `GET /ai/integrations/{integration_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IntegrationId` | string (UUID) | Yes | The integration id |

```go
	integration, err := client.AI.Integrations.Get(context.Background(), "integration_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", integration.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Global IP Allowed Ports

`client.GlobalIPAllowedPorts.List()` — `GET /global_ip_allowed_ports`

```go
	globalIPAllowedPorts, err := client.GlobalIPAllowedPorts.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAllowedPorts.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.first_port`

## Global IP Assignment Health Check Metrics

`client.GlobalIPAssignmentHealth.Get()` — `GET /global_ip_assignment_health`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	globalIPAssignmentHealth, err := client.GlobalIPAssignmentHealth.Get(context.Background(), telnyx.GlobalIPAssignmentHealthGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignmentHealth.Data)
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.health`

## List all Global IP assignments

List all Global IP assignments.

`client.GlobalIPAssignments.List()` — `GET /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.GlobalIPAssignments.List(context.Background(), telnyx.GlobalIPAssignmentListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Global IP assignment

Create a Global IP assignment.

`client.GlobalIPAssignments.New()` — `POST /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GlobalIpId` | string (UUID) | No | Global IP ID. |
| `WireguardPeerId` | string (UUID) | No | Wireguard peer ID. |
| `Status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```go
	globalIPAssignment, err := client.GlobalIPAssignments.New(context.Background(), telnyx.GlobalIPAssignmentNewParams{
		GlobalIPAssignment: telnyx.GlobalIPAssignmentParam{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP assignment.

`client.GlobalIPAssignments.Get()` — `GET /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	globalIPAssignment, err := client.GlobalIPAssignments.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a Global IP assignment

Update a Global IP assignment.

`client.GlobalIPAssignments.Update()` — `PATCH /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `GlobalIpId` | string (UUID) | No |  |
| `WireguardPeerId` | string (UUID) | No |  |
| `Status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```go
	globalIPAssignment, err := client.GlobalIPAssignments.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.GlobalIPAssignmentUpdateParams{
			GlobalIPAssignmentUpdateRequest: telnyx.GlobalIPAssignmentUpdateParamsGlobalIPAssignmentUpdateRequest{
				GlobalIPAssignmentParam: telnyx.GlobalIPAssignmentParam{},
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Global IP assignment

Delete a Global IP assignment.

`client.GlobalIPAssignments.Delete()` — `DELETE /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	globalIPAssignment, err := client.GlobalIPAssignments.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Global IP Assignment Usage Metrics

`client.GlobalIPAssignmentsUsage.Get()` — `GET /global_ip_assignments_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	globalIPAssignmentsUsage, err := client.GlobalIPAssignmentsUsage.Get(context.Background(), telnyx.GlobalIPAssignmentsUsageGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignmentsUsage.Data)
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.received`

## List all Global IP Health check types

List all Global IP Health check types.

`client.GlobalIPHealthCheckTypes.List()` — `GET /global_ip_health_check_types`

```go
	globalIPHealthCheckTypes, err := client.GlobalIPHealthCheckTypes.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheckTypes.Data)
```

Key response fields: `response.data.health_check_params, response.data.health_check_type, response.data.record_type`

## List all Global IP health checks

List all Global IP health checks.

`client.GlobalIPHealthChecks.List()` — `GET /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.GlobalIPHealthChecks.List(context.Background(), telnyx.GlobalIPHealthCheckListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Global IP health check

Create a Global IP health check.

`client.GlobalIPHealthChecks.New()` — `POST /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GlobalIpId` | string (UUID) | No | Global IP ID. |
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No | Identifies the type of the resource. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	globalIPHealthCheck, err := client.GlobalIPHealthChecks.New(context.Background(), telnyx.GlobalIPHealthCheckNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheck.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`client.GlobalIPHealthChecks.Get()` — `GET /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	globalIPHealthCheck, err := client.GlobalIPHealthChecks.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheck.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Global IP health check

Delete a Global IP health check.

`client.GlobalIPHealthChecks.Delete()` — `DELETE /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	globalIPHealthCheck, err := client.GlobalIPHealthChecks.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheck.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Global IP Latency Metrics

`client.GlobalIPLatency.Get()` — `GET /global_ip_latency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	globalIPLatency, err := client.GlobalIPLatency.Get(context.Background(), telnyx.GlobalIPLatencyGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPLatency.Data)
```

Key response fields: `response.data.global_ip, response.data.mean_latency, response.data.percentile_latency`

## List all Global IP Protocols

`client.GlobalIPProtocols.List()` — `GET /global_ip_protocols`

```go
	globalIPProtocols, err := client.GlobalIPProtocols.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPProtocols.Data)
```

Key response fields: `response.data.name, response.data.code, response.data.record_type`

## Global IP Usage Metrics

`client.GlobalIPUsage.Get()` — `GET /global_ip_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	globalIPUsage, err := client.GlobalIPUsage.Get(context.Background(), telnyx.GlobalIPUsageGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPUsage.Data)
```

Key response fields: `response.data.global_ip, response.data.received, response.data.timestamp`

## List all Global IPs

List all Global IPs.

`client.GlobalIPs.List()` — `GET /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.GlobalIPs.List(context.Background(), telnyx.GlobalIPListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Global IP

Create a Global IP.

`client.GlobalIPs.New()` — `POST /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No | Identifies the type of the resource. |
| `CreatedAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```go
	globalIP, err := client.GlobalIPs.New(context.Background(), telnyx.GlobalIPNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIP.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP.

`client.GlobalIPs.Get()` — `GET /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	globalIP, err := client.GlobalIPs.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIP.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Global IP

Delete a Global IP.

`client.GlobalIPs.Delete()` — `DELETE /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	globalIP, err := client.GlobalIPs.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIP.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Networks

List all Networks.

`client.Networks.List()` — `GET /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Networks.List(context.Background(), telnyx.NetworkListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Network

Create a new Network.

`client.Networks.New()` — `POST /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A user specified name for the network. |
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No | Identifies the type of the resource. |
| `CreatedAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	network, err := client.Networks.New(context.Background(), telnyx.NetworkNewParams{
		NetworkCreate: telnyx.NetworkCreateParam{
			RecordParam: telnyx.RecordParam{},
			Name:        "test network",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", network.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Network

Retrieve a Network.

`client.Networks.Get()` — `GET /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	network, err := client.Networks.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", network.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a Network

Update a Network.

`client.Networks.Update()` — `PATCH /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A user specified name for the network. |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No | Identifies the type of the resource. |
| `CreatedAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	network, err := client.Networks.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.NetworkUpdateParams{
			NetworkCreate: telnyx.NetworkCreateParam{
				RecordParam: telnyx.RecordParam{},
				Name:        "test network",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", network.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Network

Delete a Network.

`client.Networks.Delete()` — `DELETE /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	network, err := client.Networks.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", network.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Default Gateway status.

`client.Networks.DefaultGateway.Get()` — `GET /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	defaultGateway, err := client.Networks.DefaultGateway.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", defaultGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Default Gateway.

`client.Networks.DefaultGateway.New()` — `POST /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `NetworkId` | string (UUID) | No | Network ID. |
| `WireguardPeerId` | string (UUID) | No | Wireguard peer ID. |
| `Status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	defaultGateway, err := client.Networks.DefaultGateway.New(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.NetworkDefaultGatewayNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", defaultGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete Default Gateway.

`client.Networks.DefaultGateway.Delete()` — `DELETE /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	defaultGateway, err := client.Networks.DefaultGateway.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", defaultGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all Interfaces for a Network.

`client.Networks.ListInterfaces()` — `GET /networks/{id}/network_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Networks.ListInterfaces(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.NetworkListInterfacesParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`client.PrivateWirelessGateways.List()` — `GET /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |
| `Filter[name]` | string | No | The name of the Private Wireless Gateway. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.PrivateWirelessGateways.List(context.Background(), telnyx.PrivateWirelessGatewayListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`client.PrivateWirelessGateways.New()` — `POST /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NetworkId` | string (UUID) | Yes | The identification of the related network resource. |
| `Name` | string | Yes | The private wireless gateway name. |
| `RegionCode` | string | No | The code of the region where the private wireless gateway wi... |

```go
	privateWirelessGateway, err := client.PrivateWirelessGateways.New(context.Background(), telnyx.PrivateWirelessGatewayNewParams{
		Name:      "My private wireless gateway",
		NetworkID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", privateWirelessGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`client.PrivateWirelessGateways.Get()` — `GET /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```go
	privateWirelessGateway, err := client.PrivateWirelessGateways.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", privateWirelessGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`client.PrivateWirelessGateways.Delete()` — `DELETE /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```go
	privateWirelessGateway, err := client.PrivateWirelessGateways.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", privateWirelessGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Public Internet Gateways

List all Public Internet Gateways.

`client.PublicInternetGateways.List()` — `GET /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.PublicInternetGateways.List(context.Background(), telnyx.PublicInternetGatewayListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`client.PublicInternetGateways.New()` — `POST /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NetworkId` | string (UUID) | No | The id of the network associated with the interface. |
| `Status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `Id` | string (UUID) | No | Identifies the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	publicInternetGateway, err := client.PublicInternetGateways.New(context.Background(), telnyx.PublicInternetGatewayNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", publicInternetGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`client.PublicInternetGateways.Get()` — `GET /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	publicInternetGateway, err := client.PublicInternetGateways.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", publicInternetGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`client.PublicInternetGateways.Delete()` — `DELETE /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	publicInternetGateway, err := client.PublicInternetGateways.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", publicInternetGateway.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Regions

List all regions and the interfaces that region supports

`client.Regions.List()` — `GET /regions`

```go
	regions, err := client.Regions.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", regions.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`client.VirtualCrossConnects.List()` — `GET /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.VirtualCrossConnects.List(context.Background(), telnyx.VirtualCrossConnectListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`client.VirtualCrossConnects.New()` — `POST /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NetworkId` | string (UUID) | Yes | The id of the network associated with the interface. |
| `CloudProvider` | enum (aws, azure, gce) | Yes | The Virtual Private Cloud with which you would like to estab... |
| `CloudProviderRegion` | string | Yes | The region where your Virtual Private Cloud hosts are locate... |
| `BgpAsn` | number | Yes | The Border Gateway Protocol (BGP) Autonomous System Number (... |
| `PrimaryCloudAccountId` | string (UUID) | Yes | The identifier for your Virtual Private Cloud. |
| `RegionCode` | string | Yes | The region the interface should be deployed to. |
| `Status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `SecondaryCloudAccountId` | string (UUID) | No | The identifier for your Virtual Private Cloud. |
| `Id` | string (UUID) | No | Identifies the resource. |
| ... | | | +13 optional params in [references/api-details.md](references/api-details.md) |

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.New(context.Background(), telnyx.VirtualCrossConnectNewParams{
		RegionCode: "ashburn-va",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`client.VirtualCrossConnects.Get()` — `GET /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`client.VirtualCrossConnects.Update()` — `PATCH /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `PrimaryEnabled` | boolean | No | Indicates whether the primary circuit is enabled. |
| `PrimaryRoutingAnnouncement` | boolean | No | Whether the primary BGP route is being announced. |
| `PrimaryCloudIp` | string | No | The IP address assigned for your side of the Virtual Cross C... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.VirtualCrossConnectUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`client.VirtualCrossConnects.Delete()` — `DELETE /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`client.VirtualCrossConnectsCoverage.List()` — `GET /virtual_cross_connects_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filters` | object | No | Consolidated filters parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.VirtualCrossConnectsCoverage.List(context.Background(), telnyx.VirtualCrossConnectsCoverageListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.available_bandwidth, response.data.cloud_provider, response.data.cloud_provider_region`

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`client.WireguardInterfaces.List()` — `GET /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.WireguardInterfaces.List(context.Background(), telnyx.WireguardInterfaceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`client.WireguardInterfaces.New()` — `POST /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NetworkId` | string (UUID) | Yes | The id of the network associated with the interface. |
| `RegionCode` | string | Yes | The region the interface should be deployed to. |
| `Status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No | Identifies the type of the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	wireguardInterface, err := client.WireguardInterfaces.New(context.Background(), telnyx.WireguardInterfaceNewParams{
		RegionCode: "ashburn-va",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardInterface.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`client.WireguardInterfaces.Get()` — `GET /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	wireguardInterface, err := client.WireguardInterfaces.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardInterface.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`client.WireguardInterfaces.Delete()` — `DELETE /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	wireguardInterface, err := client.WireguardInterfaces.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardInterface.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all WireGuard Peers

List all WireGuard peers.

`client.WireguardPeers.List()` — `GET /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.WireguardPeers.List(context.Background(), telnyx.WireguardPeerListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`client.WireguardPeers.New()` — `POST /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `WireguardInterfaceId` | string (UUID) | Yes | The id of the wireguard interface associated with the peer. |
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No | Identifies the type of the resource. |
| `CreatedAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	wireguardPeer, err := client.WireguardPeers.New(context.Background(), telnyx.WireguardPeerNewParams{
		WireguardInterfaceID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`client.WireguardPeers.Get()` — `GET /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	wireguardPeer, err := client.WireguardPeers.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update the WireGuard Peer

Update the WireGuard peer.

`client.WireguardPeers.Update()` — `PATCH /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `PublicKey` | string | No | The WireGuard `PublicKey`. |

```go
	wireguardPeer, err := client.WireguardPeers.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.WireguardPeerUpdateParams{
			WireguardPeerPatch: telnyx.WireguardPeerPatchParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete the WireGuard Peer

Delete the WireGuard peer.

`client.WireguardPeers.Delete()` — `DELETE /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	wireguardPeer, err := client.WireguardPeers.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve Wireguard config template for Peer

`client.WireguardPeers.GetConfig()` — `GET /wireguard_peers/{id}/config`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.WireguardPeers.GetConfig(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
