# Networking (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List all clusters

| Field | Type |
|-------|------|
| `bucket` | string |
| `created_at` | date-time |
| `finished_at` | date-time |
| `min_cluster_size` | integer |
| `min_subcluster_size` | integer |
| `status` | enum: pending, starting, running, completed, failed |
| `task_id` | string |

**Returned by:** Compute new clusters

| Field | Type |
|-------|------|
| `task_id` | string |

**Returned by:** Fetch a cluster

| Field | Type |
|-------|------|
| `bucket` | string |
| `clusters` | array[object] |
| `status` | enum: pending, starting, running, completed, failed |

**Returned by:** List Integrations, List Integration By Id

| Field | Type |
|-------|------|
| `available_tools` | array[string] |
| `description` | string |
| `display_name` | string |
| `id` | string |
| `logo_url` | string |
| `name` | string |
| `status` | enum: disconnected, connected |

**Returned by:** List User Integrations, Get User Integration connection By Id

| Field | Type |
|-------|------|
| `allowed_tools` | array[string] |
| `id` | string |
| `integration_id` | string |

**Returned by:** List all Global IP Allowed Ports

| Field | Type |
|-------|------|
| `first_port` | integer |
| `id` | uuid |
| `last_port` | integer |
| `name` | string |
| `protocol_code` | string |
| `record_type` | string |

**Returned by:** Global IP Assignment Health Check Metrics

| Field | Type |
|-------|------|
| `global_ip` | object |
| `global_ip_assignment` | object |
| `health` | object |
| `timestamp` | date-time |

**Returned by:** List all Global IP assignments, Create a Global IP assignment, Retrieve a Global IP, Update a Global IP assignment, Delete a Global IP assignment

| Field | Type |
|-------|------|
| `created_at` | string |
| `global_ip_id` | uuid |
| `id` | uuid |
| `is_announced` | boolean |
| `is_connected` | boolean |
| `is_in_maintenance` | boolean |
| `record_type` | string |
| `status` | enum: created, provisioning, provisioned, deleting |
| `updated_at` | string |
| `wireguard_peer_id` | uuid |

**Returned by:** Global IP Assignment Usage Metrics

| Field | Type |
|-------|------|
| `global_ip` | object |
| `global_ip_assignment` | object |
| `received` | object |
| `timestamp` | date-time |
| `transmitted` | object |

**Returned by:** List all Global IP Health check types

| Field | Type |
|-------|------|
| `health_check_params` | object |
| `health_check_type` | string |
| `record_type` | string |

**Returned by:** List all Global IP health checks, Create a Global IP health check, Retrieve a Global IP health check, Delete a Global IP health check

| Field | Type |
|-------|------|
| `created_at` | string |
| `global_ip_id` | uuid |
| `health_check_params` | object |
| `health_check_type` | string |
| `id` | uuid |
| `record_type` | string |
| `updated_at` | string |

**Returned by:** Global IP Latency Metrics

| Field | Type |
|-------|------|
| `global_ip` | object |
| `mean_latency` | object |
| `percentile_latency` | object |
| `prober_location` | object |
| `timestamp` | date-time |

**Returned by:** List all Global IP Protocols

| Field | Type |
|-------|------|
| `code` | string |
| `name` | string |
| `record_type` | string |

**Returned by:** Global IP Usage Metrics

| Field | Type |
|-------|------|
| `global_ip` | object |
| `received` | object |
| `timestamp` | date-time |
| `transmitted` | object |

**Returned by:** List all Global IPs, Create a Global IP, Retrieve a Global IP, Delete a Global IP

| Field | Type |
|-------|------|
| `created_at` | string |
| `description` | string |
| `id` | uuid |
| `ip_address` | string |
| `name` | string |
| `ports` | object |
| `record_type` | string |
| `updated_at` | string |

**Returned by:** List all Networks, Create a Network, Retrieve a Network, Update a Network, Delete a Network

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `name` | string |
| `record_type` | string |
| `updated_at` | string |

**Returned by:** Get Default Gateway status., Create Default Gateway., Delete Default Gateway.

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `network_id` | uuid |
| `record_type` | string |
| `status` | enum: created, provisioning, provisioned, deleting |
| `updated_at` | string |
| `wireguard_peer_id` | uuid |

**Returned by:** List all Interfaces for a Network.

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `name` | string |
| `network_id` | uuid |
| `record_type` | string |
| `region` | object |
| `region_code` | string |
| `status` | enum: created, provisioning, provisioned, deleting |
| `type` | string |
| `updated_at` | string |

**Returned by:** Get all Private Wireless Gateways, Create a Private Wireless Gateway, Get a Private Wireless Gateway, Delete a Private Wireless Gateway

| Field | Type |
|-------|------|
| `assigned_resources` | array[object] |
| `created_at` | string |
| `id` | uuid |
| `ip_range` | string |
| `name` | string |
| `network_id` | uuid |
| `record_type` | string |
| `region_code` | string |
| `status` | object |
| `updated_at` | string |

**Returned by:** List all Public Internet Gateways, Create a Public Internet Gateway, Retrieve a Public Internet Gateway, Delete a Public Internet Gateway

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `name` | string |
| `network_id` | uuid |
| `public_ip` | string |
| `record_type` | string |
| `region_code` | string |
| `status` | enum: created, provisioning, provisioned, deleting |
| `updated_at` | string |

**Returned by:** List all Regions

| Field | Type |
|-------|------|
| `code` | string |
| `created_at` | string |
| `name` | string |
| `record_type` | string |
| `supported_interfaces` | array[string] |
| `updated_at` | string |

**Returned by:** List all Virtual Cross Connects, Create a Virtual Cross Connect, Retrieve a Virtual Cross Connect, Update the Virtual Cross Connect, Delete a Virtual Cross Connect

| Field | Type |
|-------|------|
| `bandwidth_mbps` | number |
| `bgp_asn` | number |
| `cloud_provider` | enum: aws, azure, gce |
| `cloud_provider_region` | string |
| `created_at` | string |
| `id` | uuid |
| `name` | string |
| `network_id` | uuid |
| `primary_bgp_key` | string |
| `primary_cloud_account_id` | string |
| `primary_cloud_ip` | string |
| `primary_enabled` | boolean |
| `primary_routing_announcement` | boolean |
| `primary_telnyx_ip` | string |
| `record_type` | string |
| `region` | object |
| `region_code` | string |
| `secondary_bgp_key` | string |
| `secondary_cloud_account_id` | string |
| `secondary_cloud_ip` | string |
| `secondary_enabled` | boolean |
| `secondary_routing_announcement` | boolean |
| `secondary_telnyx_ip` | string |
| `status` | enum: created, provisioning, provisioned, deleting |
| `updated_at` | string |

**Returned by:** List Virtual Cross Connect Cloud Coverage

| Field | Type |
|-------|------|
| `available_bandwidth` | array[number] |
| `cloud_provider` | enum: aws, azure, gce |
| `cloud_provider_region` | string |
| `location` | object |
| `record_type` | string |

**Returned by:** List all WireGuard Interfaces, Create a WireGuard Interface, Retrieve a WireGuard Interfaces, Delete a WireGuard Interface

| Field | Type |
|-------|------|
| `created_at` | string |
| `enable_sip_trunking` | boolean |
| `endpoint` | string |
| `id` | uuid |
| `name` | string |
| `network_id` | uuid |
| `public_key` | string |
| `record_type` | string |
| `region` | object |
| `region_code` | string |
| `status` | enum: created, provisioning, provisioned, deleting |
| `updated_at` | string |

**Returned by:** List all WireGuard Peers, Create a WireGuard Peer, Retrieve the WireGuard Peer, Update the WireGuard Peer, Delete the WireGuard Peer

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `last_seen` | string |
| `private_key` | string |
| `public_key` | string |
| `record_type` | string |
| `updated_at` | string |
| `wireguard_interface_id` | uuid |

## Optional Parameters

### Compute new clusters — `client.AI.Clusters.Compute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Prefix` | string | Prefix to filter whcih files in the buckets are included. |
| `Files` | array[string] | Array of files to filter which are included. |
| `MinClusterSize` | integer | Smallest number of related text chunks to qualify as a cluster. |
| `MinSubclusterSize` | integer | Smallest number of related text chunks to qualify as a sub-cluster. |

### Create a Global IP assignment — `client.GlobalIPAssignments.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `GlobalIpId` | string (UUID) | Global IP ID. |
| `WireguardPeerId` | string (UUID) | Wireguard peer ID. |
| `Status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `IsConnected` | boolean | Wireguard peer is connected. |
| `IsInMaintenance` | boolean | Enable/disable BGP announcement. |
| `IsAnnounced` | boolean | Status of BGP announcement. |

### Update a Global IP assignment — `client.GlobalIPAssignments.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `GlobalIpId` | string (UUID) |  |
| `WireguardPeerId` | string (UUID) |  |
| `Status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `IsConnected` | boolean | Wireguard peer is connected. |
| `IsInMaintenance` | boolean | Enable/disable BGP announcement. |
| `IsAnnounced` | boolean | Status of BGP announcement. |

### Create a Global IP health check — `client.GlobalIPHealthChecks.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `HealthCheckType` | string | The Global IP health check type. |
| `HealthCheckParams` | object | A Global IP health check params. |
| `GlobalIpId` | string (UUID) | Global IP ID. |

### Create a Global IP — `client.GlobalIPs.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `IpAddress` | string (IPv4/IPv6) | The Global IP address. |
| `Ports` | object | A Global IP ports grouped by protocol code. |
| `Name` | string | A user specified name for the address. |
| `Description` | string | A user specified description for the address. |

### Create a Network — `client.Networks.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Update a Network — `client.Networks.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Create Default Gateway. — `client.Networks.DefaultGateway.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `NetworkId` | string (UUID) | Network ID. |
| `WireguardPeerId` | string (UUID) | Wireguard peer ID. |
| `Status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |

### Create a Private Wireless Gateway — `client.PrivateWirelessGateways.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RegionCode` | string | The code of the region where the private wireless gateway will be assigned. |

### Create a Public Internet Gateway — `client.PublicInternetGateways.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `NetworkId` | string (UUID) | The id of the network associated with the interface. |
| `Name` | string | A user specified name for the interface. |
| `Status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `RegionCode` | string | The region interface is deployed to. |
| `PublicIp` | string | The publically accessible ip for this interface. |

### Create a Virtual Cross Connect — `client.VirtualCrossConnects.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `Name` | string | A user specified name for the interface. |
| `Status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `BandwidthMbps` | number | The desired throughput in Megabits per Second (Mbps) for your Virtual Cross C... |
| `PrimaryEnabled` | boolean | Indicates whether the primary circuit is enabled. |
| `PrimaryTelnyxIp` | string | The IP address assigned to the Telnyx side of the Virtual Cross Connect. |
| `PrimaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `PrimaryBgpKey` | string | The authentication key for BGP peer configuration. |
| `SecondaryEnabled` | boolean | Indicates whether the secondary circuit is enabled. |
| `SecondaryCloudAccountId` | string (UUID) | The identifier for your Virtual Private Cloud. |
| `SecondaryTelnyxIp` | string | The IP address assigned to the Telnyx side of the Virtual Cross Connect. |
| `SecondaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `SecondaryBgpKey` | string | The authentication key for BGP peer configuration. |

### Update the Virtual Cross Connect — `client.VirtualCrossConnects.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `PrimaryEnabled` | boolean | Indicates whether the primary circuit is enabled. |
| `PrimaryRoutingAnnouncement` | boolean | Whether the primary BGP route is being announced. |
| `PrimaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `SecondaryEnabled` | boolean | Indicates whether the secondary circuit is enabled. |
| `SecondaryRoutingAnnouncement` | boolean | Whether the secondary BGP route is being announced. |
| `SecondaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |

### Create a WireGuard Interface — `client.WireguardInterfaces.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `Name` | string | A user specified name for the interface. |
| `Status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `Endpoint` | string | The Telnyx WireGuard peers `Peer.endpoint` value. |
| `PublicKey` | string | The Telnyx WireGuard peers `Peer.PublicKey`. |
| `EnableSipTrunking` | boolean | Enable SIP traffic forwarding over VPN interface. |

### Create a WireGuard Peer — `client.WireguardPeers.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `PublicKey` | string | The WireGuard `PublicKey`. |
| `LastSeen` | string | ISO 8601 formatted date-time indicating when peer sent traffic last time. |
| `PrivateKey` | string | Your WireGuard `Interface.PrivateKey`. |

### Update the WireGuard Peer — `client.WireguardPeers.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `PublicKey` | string | The WireGuard `PublicKey`. |
