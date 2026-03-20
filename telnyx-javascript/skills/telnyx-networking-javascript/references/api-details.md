# Networking (JavaScript) — API Details

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

### Compute new clusters — `client.ai.clusters.compute()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | string | Prefix to filter whcih files in the buckets are included. |
| `files` | array[string] | Array of files to filter which are included. |
| `minClusterSize` | integer | Smallest number of related text chunks to qualify as a cluster. |
| `minSubclusterSize` | integer | Smallest number of related text chunks to qualify as a sub-cluster. |

### Create a Global IP assignment — `client.globalIPAssignments.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `globalIpId` | string (UUID) | Global IP ID. |
| `wireguardPeerId` | string (UUID) | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `isConnected` | boolean | Wireguard peer is connected. |
| `isInMaintenance` | boolean | Enable/disable BGP announcement. |
| `isAnnounced` | boolean | Status of BGP announcement. |

### Update a Global IP assignment — `client.globalIPAssignments.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `globalIpId` | string (UUID) |  |
| `wireguardPeerId` | string (UUID) |  |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `isConnected` | boolean | Wireguard peer is connected. |
| `isInMaintenance` | boolean | Enable/disable BGP announcement. |
| `isAnnounced` | boolean | Status of BGP announcement. |

### Create a Global IP health check — `client.globalIPHealthChecks.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `healthCheckType` | string | The Global IP health check type. |
| `healthCheckParams` | object | A Global IP health check params. |
| `globalIpId` | string (UUID) | Global IP ID. |

### Create a Global IP — `client.globalIPs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `ipAddress` | string (IPv4/IPv6) | The Global IP address. |
| `ports` | object | A Global IP ports grouped by protocol code. |
| `name` | string | A user specified name for the address. |
| `description` | string | A user specified description for the address. |

### Create a Network — `client.networks.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Update a Network — `client.networks.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Create Default Gateway. — `client.networks.defaultGateway.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `networkId` | string (UUID) | Network ID. |
| `wireguardPeerId` | string (UUID) | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |

### Create a Private Wireless Gateway — `client.privateWirelessGateways.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regionCode` | string | The code of the region where the private wireless gateway will be assigned. |

### Create a Public Internet Gateway — `client.publicInternetGateways.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `networkId` | string (UUID) | The id of the network associated with the interface. |
| `name` | string | A user specified name for the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `regionCode` | string | The region interface is deployed to. |
| `publicIp` | string | The publically accessible ip for this interface. |

### Create a Virtual Cross Connect — `client.virtualCrossConnects.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `name` | string | A user specified name for the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `bandwidthMbps` | number | The desired throughput in Megabits per Second (Mbps) for your Virtual Cross C... |
| `primaryEnabled` | boolean | Indicates whether the primary circuit is enabled. |
| `primaryTelnyxIp` | string | The IP address assigned to the Telnyx side of the Virtual Cross Connect. |
| `primaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `primaryBgpKey` | string | The authentication key for BGP peer configuration. |
| `secondaryEnabled` | boolean | Indicates whether the secondary circuit is enabled. |
| `secondaryCloudAccountId` | string (UUID) | The identifier for your Virtual Private Cloud. |
| `secondaryTelnyxIp` | string | The IP address assigned to the Telnyx side of the Virtual Cross Connect. |
| `secondaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `secondaryBgpKey` | string | The authentication key for BGP peer configuration. |

### Update the Virtual Cross Connect — `client.virtualCrossConnects.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `primaryEnabled` | boolean | Indicates whether the primary circuit is enabled. |
| `primaryRoutingAnnouncement` | boolean | Whether the primary BGP route is being announced. |
| `primaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `secondaryEnabled` | boolean | Indicates whether the secondary circuit is enabled. |
| `secondaryRoutingAnnouncement` | boolean | Whether the secondary BGP route is being announced. |
| `secondaryCloudIp` | string | The IP address assigned for your side of the Virtual Cross Connect. |

### Create a WireGuard Interface — `client.wireguardInterfaces.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `name` | string | A user specified name for the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `endpoint` | string | The Telnyx WireGuard peers `Peer.endpoint` value. |
| `publicKey` | string | The Telnyx WireGuard peers `Peer.PublicKey`. |
| `enableSipTrunking` | boolean | Enable SIP traffic forwarding over VPN interface. |

### Create a WireGuard Peer — `client.wireguardPeers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `publicKey` | string | The WireGuard `PublicKey`. |
| `lastSeen` | string | ISO 8601 formatted date-time indicating when peer sent traffic last time. |
| `privateKey` | string | Your WireGuard `Interface.PrivateKey`. |

### Update the WireGuard Peer — `client.wireguardPeers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `publicKey` | string | The WireGuard `PublicKey`. |
