---
name: telnyx-networking-go
description: >-
  Configure private networks, WireGuard VPN gateways, internet gateways, and
  virtual cross connects. This skill provides Go SDK examples.
metadata:
  author: telnyx
  product: networking
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - Go

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

result, err := client.Messages.Send(ctx, params)
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

## List all clusters

`GET /ai/clusters`

```go
	page, err := client.AI.Clusters.List(context.Background(), telnyx.AIClusterListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `bucket` (string), `created_at` (date-time), `finished_at` (date-time), `min_cluster_size` (integer), `min_subcluster_size` (integer), `status` (enum: pending, starting, running, completed, failed), `task_id` (string)

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`POST /ai/clusters` — Required: `bucket`

Optional: `files` (array[string]), `min_cluster_size` (integer), `min_subcluster_size` (integer), `prefix` (string)

```go
	response, err := client.AI.Clusters.Compute(context.Background(), telnyx.AIClusterComputeParams{
		Bucket: "my-bucket",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `task_id` (string)

## Fetch a cluster

`GET /ai/clusters/{task_id}`

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

Returns: `bucket` (string), `clusters` (array[object]), `status` (enum: pending, starting, running, completed, failed)

## Delete a cluster

`DELETE /ai/clusters/{task_id}`

```go
	err := client.AI.Clusters.Delete(context.Background(), "task_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Fetch a cluster visualization

`GET /ai/clusters/{task_id}/graph`

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

`GET /ai/integrations`

```go
	integrations, err := client.AI.Integrations.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", integrations.Data)
```

Returns: `available_tools` (array[string]), `description` (string), `display_name` (string), `id` (string), `logo_url` (string), `name` (string), `status` (enum: disconnected, connected)

## List User Integrations

List user setup integrations

`GET /ai/integrations/connections`

```go
	connections, err := client.AI.Integrations.Connections.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", connections.Data)
```

Returns: `allowed_tools` (array[string]), `id` (string), `integration_id` (string)

## Get User Integration connection By Id

Get user setup integrations

`GET /ai/integrations/connections/{user_connection_id}`

```go
	connection, err := client.AI.Integrations.Connections.Get(context.Background(), "user_connection_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", connection.Data)
```

Returns: `allowed_tools` (array[string]), `id` (string), `integration_id` (string)

## Delete Integration Connection

Delete a specific integration connection.

`DELETE /ai/integrations/connections/{user_connection_id}`

```go
	err := client.AI.Integrations.Connections.Delete(context.Background(), "user_connection_id")
	if err != nil {
		log.Fatal(err)
	}
```

## List Integration By Id

Retrieve integration details

`GET /ai/integrations/{integration_id}`

```go
	integration, err := client.AI.Integrations.Get(context.Background(), "integration_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", integration.ID)
```

Returns: `available_tools` (array[string]), `description` (string), `display_name` (string), `id` (string), `logo_url` (string), `name` (string), `status` (enum: disconnected, connected)

## List all Global IP Allowed Ports

`GET /global_ip_allowed_ports`

```go
	globalIPAllowedPorts, err := client.GlobalIPAllowedPorts.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAllowedPorts.Data)
```

Returns: `first_port` (integer), `id` (uuid), `last_port` (integer), `name` (string), `protocol_code` (string), `record_type` (string)

## Global IP Assignment Health Check Metrics

`GET /global_ip_assignment_health`

```go
	globalIPAssignmentHealth, err := client.GlobalIPAssignmentHealth.Get(context.Background(), telnyx.GlobalIPAssignmentHealthGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignmentHealth.Data)
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `health` (object), `timestamp` (date-time)

## List all Global IP assignments

List all Global IP assignments.

`GET /global_ip_assignments`

```go
	page, err := client.GlobalIPAssignments.List(context.Background(), telnyx.GlobalIPAssignmentListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Create a Global IP assignment

Create a Global IP assignment.

`POST /global_ip_assignments`

Optional: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

```go
	globalIPAssignment, err := client.GlobalIPAssignments.New(context.Background(), telnyx.GlobalIPAssignmentNewParams{
		GlobalIPAssignment: telnyx.GlobalIPAssignmentParam{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Retrieve a Global IP

Retrieve a Global IP assignment.

`GET /global_ip_assignments/{id}`

```go
	globalIPAssignment, err := client.GlobalIPAssignments.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Update a Global IP assignment

Update a Global IP assignment.

`PATCH /global_ip_assignments/{id}`

Optional: `created_at` (string), `global_ip_id` (string), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (string)

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

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Delete a Global IP assignment

Delete a Global IP assignment.

`DELETE /global_ip_assignments/{id}`

```go
	globalIPAssignment, err := client.GlobalIPAssignments.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignment.Data)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Global IP Assignment Usage Metrics

`GET /global_ip_assignments_usage`

```go
	globalIPAssignmentsUsage, err := client.GlobalIPAssignmentsUsage.Get(context.Background(), telnyx.GlobalIPAssignmentsUsageGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPAssignmentsUsage.Data)
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## List all Global IP Health check types

List all Global IP Health check types.

`GET /global_ip_health_check_types`

```go
	globalIPHealthCheckTypes, err := client.GlobalIPHealthCheckTypes.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheckTypes.Data)
```

Returns: `health_check_params` (object), `health_check_type` (string), `record_type` (string)

## List all Global IP health checks

List all Global IP health checks.

`GET /global_ip_health_checks`

```go
	page, err := client.GlobalIPHealthChecks.List(context.Background(), telnyx.GlobalIPHealthCheckListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Create a Global IP health check

Create a Global IP health check.

`POST /global_ip_health_checks`

Optional: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

```go
	globalIPHealthCheck, err := client.GlobalIPHealthChecks.New(context.Background(), telnyx.GlobalIPHealthCheckNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheck.Data)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`GET /global_ip_health_checks/{id}`

```go
	globalIPHealthCheck, err := client.GlobalIPHealthChecks.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheck.Data)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Delete a Global IP health check

Delete a Global IP health check.

`DELETE /global_ip_health_checks/{id}`

```go
	globalIPHealthCheck, err := client.GlobalIPHealthChecks.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPHealthCheck.Data)
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Global IP Latency Metrics

`GET /global_ip_latency`

```go
	globalIPLatency, err := client.GlobalIPLatency.Get(context.Background(), telnyx.GlobalIPLatencyGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPLatency.Data)
```

Returns: `global_ip` (object), `mean_latency` (object), `percentile_latency` (object), `prober_location` (object), `timestamp` (date-time)

## List all Global IP Protocols

`GET /global_ip_protocols`

```go
	globalIPProtocols, err := client.GlobalIPProtocols.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPProtocols.Data)
```

Returns: `code` (string), `name` (string), `record_type` (string)

## Global IP Usage Metrics

`GET /global_ip_usage`

```go
	globalIPUsage, err := client.GlobalIPUsage.Get(context.Background(), telnyx.GlobalIPUsageGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIPUsage.Data)
```

Returns: `global_ip` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## List all Global IPs

List all Global IPs.

`GET /global_ips`

```go
	page, err := client.GlobalIPs.List(context.Background(), telnyx.GlobalIPListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Create a Global IP

Create a Global IP.

`POST /global_ips`

Optional: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

```go
	globalIP, err := client.GlobalIPs.New(context.Background(), telnyx.GlobalIPNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIP.Data)
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Retrieve a Global IP

Retrieve a Global IP.

`GET /global_ips/{id}`

```go
	globalIP, err := client.GlobalIPs.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIP.Data)
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Delete a Global IP

Delete a Global IP.

`DELETE /global_ips/{id}`

```go
	globalIP, err := client.GlobalIPs.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", globalIP.Data)
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## List all Networks

List all Networks.

`GET /networks`

```go
	page, err := client.Networks.List(context.Background(), telnyx.NetworkListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Create a Network

Create a new Network.

`POST /networks` — Required: `name`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

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

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Retrieve a Network

Retrieve a Network.

`GET /networks/{id}`

```go
	network, err := client.Networks.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", network.Data)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Update a Network

Update a Network.

`PATCH /networks/{id}` — Required: `name`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

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

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Delete a Network

Delete a Network.

`DELETE /networks/{id}`

```go
	network, err := client.Networks.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", network.Data)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Get Default Gateway status.

`GET /networks/{id}/default_gateway`

```go
	defaultGateway, err := client.Networks.DefaultGateway.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", defaultGateway.Data)
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Create Default Gateway.

`POST /networks/{id}/default_gateway`

Optional: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

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

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Delete Default Gateway.

`DELETE /networks/{id}/default_gateway`

```go
	defaultGateway, err := client.Networks.DefaultGateway.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", defaultGateway.Data)
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## List all Interfaces for a Network.

`GET /networks/{id}/network_interfaces`

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

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `type` (string), `updated_at` (string)

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`GET /private_wireless_gateways`

```go
	page, err := client.PrivateWirelessGateways.List(context.Background(), telnyx.PrivateWirelessGatewayListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`POST /private_wireless_gateways` — Required: `network_id`, `name`

Optional: `region_code` (string)

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

Returns: `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`GET /private_wireless_gateways/{id}`

```go
	privateWirelessGateway, err := client.PrivateWirelessGateways.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", privateWirelessGateway.Data)
```

Returns: `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`DELETE /private_wireless_gateways/{id}`

```go
	privateWirelessGateway, err := client.PrivateWirelessGateways.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", privateWirelessGateway.Data)
```

Returns: `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## List all Public Internet Gateways

List all Public Internet Gateways.

`GET /public_internet_gateways`

```go
	page, err := client.PublicInternetGateways.List(context.Background(), telnyx.PublicInternetGatewayListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`POST /public_internet_gateways`

Optional: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```go
	publicInternetGateway, err := client.PublicInternetGateways.New(context.Background(), telnyx.PublicInternetGatewayNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", publicInternetGateway.Data)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`GET /public_internet_gateways/{id}`

```go
	publicInternetGateway, err := client.PublicInternetGateways.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", publicInternetGateway.Data)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`DELETE /public_internet_gateways/{id}`

```go
	publicInternetGateway, err := client.PublicInternetGateways.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", publicInternetGateway.Data)
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List all Regions

List all regions and the interfaces that region supports

`GET /regions`

```go
	regions, err := client.Regions.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", regions.Data)
```

Returns: `code` (string), `created_at` (string), `name` (string), `record_type` (string), `supported_interfaces` (array[string]), `updated_at` (string)

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`GET /virtual_cross_connects`

```go
	page, err := client.VirtualCrossConnects.List(context.Background(), telnyx.VirtualCrossConnectListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`POST /virtual_cross_connects` — Required: `network_id`, `region_code`, `cloud_provider`, `cloud_provider_region`, `bgp_asn`, `primary_cloud_account_id`

Optional: `bandwidth_mbps` (number), `created_at` (string), `id` (uuid), `name` (string), `primary_bgp_key` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.New(context.Background(), telnyx.VirtualCrossConnectNewParams{
		RegionCode: "ashburn-va",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`GET /virtual_cross_connects/{id}`

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`PATCH /virtual_cross_connects/{id}`

Optional: `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean)

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

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`DELETE /virtual_cross_connects/{id}`

```go
	virtualCrossConnect, err := client.VirtualCrossConnects.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", virtualCrossConnect.Data)
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects_coverage`

```go
	page, err := client.VirtualCrossConnectsCoverage.List(context.Background(), telnyx.VirtualCrossConnectsCoverageListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `available_bandwidth` (array[number]), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `location` (object), `record_type` (string)

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`GET /wireguard_interfaces`

```go
	page, err := client.WireguardInterfaces.List(context.Background(), telnyx.WireguardInterfaceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`POST /wireguard_interfaces` — Required: `network_id`, `region_code`

Optional: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `public_key` (string), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```go
	wireguardInterface, err := client.WireguardInterfaces.New(context.Background(), telnyx.WireguardInterfaceNewParams{
		RegionCode: "ashburn-va",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardInterface.Data)
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`GET /wireguard_interfaces/{id}`

```go
	wireguardInterface, err := client.WireguardInterfaces.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardInterface.Data)
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`DELETE /wireguard_interfaces/{id}`

```go
	wireguardInterface, err := client.WireguardInterfaces.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardInterface.Data)
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List all WireGuard Peers

List all WireGuard peers.

`GET /wireguard_peers`

```go
	page, err := client.WireguardPeers.List(context.Background(), telnyx.WireguardPeerListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`POST /wireguard_peers` — Required: `wireguard_interface_id`

Optional: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string)

```go
	wireguardPeer, err := client.WireguardPeers.New(context.Background(), telnyx.WireguardPeerNewParams{
		WireguardInterfaceID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`GET /wireguard_peers/{id}`

```go
	wireguardPeer, err := client.WireguardPeers.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Update the WireGuard Peer

Update the WireGuard peer.

`PATCH /wireguard_peers/{id}`

Optional: `public_key` (string)

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

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Delete the WireGuard Peer

Delete the WireGuard peer.

`DELETE /wireguard_peers/{id}`

```go
	wireguardPeer, err := client.WireguardPeers.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wireguardPeer.Data)
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Retrieve Wireguard config template for Peer

`GET /wireguard_peers/{id}/config`

```go
	response, err := client.WireguardPeers.GetConfig(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```
