# Networking (Ruby) — API Details

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
| `min_cluster_size` | integer | Smallest number of related text chunks to qualify as a cluster. |
| `min_subcluster_size` | integer | Smallest number of related text chunks to qualify as a sub-cluster. |

### Create a Global IP assignment — `client.global_ip_assignments.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `global_ip_id` | string (UUID) | Global IP ID. |
| `wireguard_peer_id` | string (UUID) | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `is_connected` | boolean | Wireguard peer is connected. |
| `is_in_maintenance` | boolean | Enable/disable BGP announcement. |
| `is_announced` | boolean | Status of BGP announcement. |

### Update a Global IP assignment — `client.global_ip_assignments.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `global_ip_id` | string (UUID) |  |
| `wireguard_peer_id` | string (UUID) |  |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `is_connected` | boolean | Wireguard peer is connected. |
| `is_in_maintenance` | boolean | Enable/disable BGP announcement. |
| `is_announced` | boolean | Status of BGP announcement. |

### Create a Global IP health check — `client.global_ip_health_checks.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `health_check_type` | string | The Global IP health check type. |
| `health_check_params` | object | A Global IP health check params. |
| `global_ip_id` | string (UUID) | Global IP ID. |

### Create a Global IP — `client.global_ips.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `ip_address` | string (IPv4/IPv6) | The Global IP address. |
| `ports` | object | A Global IP ports grouped by protocol code. |
| `name` | string | A user specified name for the address. |
| `description` | string | A user specified description for the address. |

### Create a Network — `client.networks.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Update a Network — `client.networks.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Create Default Gateway. — `client.networks.default_gateway.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `network_id` | string (UUID) | Network ID. |
| `wireguard_peer_id` | string (UUID) | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |

### Create a Private Wireless Gateway — `client.private_wireless_gateways.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `region_code` | string | The code of the region where the private wireless gateway will be assigned. |

### Create a Public Internet Gateway — `client.public_internet_gateways.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `network_id` | string (UUID) | The id of the network associated with the interface. |
| `name` | string | A user specified name for the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `region_code` | string | The region interface is deployed to. |
| `public_ip` | string | The publically accessible ip for this interface. |

### Create a Virtual Cross Connect — `client.virtual_cross_connects.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `name` | string | A user specified name for the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `bandwidth_mbps` | number | The desired throughput in Megabits per Second (Mbps) for your Virtual Cross C... |
| `primary_enabled` | boolean | Indicates whether the primary circuit is enabled. |
| `primary_telnyx_ip` | string | The IP address assigned to the Telnyx side of the Virtual Cross Connect. |
| `primary_cloud_ip` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `primary_bgp_key` | string | The authentication key for BGP peer configuration. |
| `secondary_enabled` | boolean | Indicates whether the secondary circuit is enabled. |
| `secondary_cloud_account_id` | string (UUID) | The identifier for your Virtual Private Cloud. |
| `secondary_telnyx_ip` | string | The IP address assigned to the Telnyx side of the Virtual Cross Connect. |
| `secondary_cloud_ip` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `secondary_bgp_key` | string | The authentication key for BGP peer configuration. |

### Update the Virtual Cross Connect — `client.virtual_cross_connects.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `primary_enabled` | boolean | Indicates whether the primary circuit is enabled. |
| `primary_routing_announcement` | boolean | Whether the primary BGP route is being announced. |
| `primary_cloud_ip` | string | The IP address assigned for your side of the Virtual Cross Connect. |
| `secondary_enabled` | boolean | Indicates whether the secondary circuit is enabled. |
| `secondary_routing_announcement` | boolean | Whether the secondary BGP route is being announced. |
| `secondary_cloud_ip` | string | The IP address assigned for your side of the Virtual Cross Connect. |

### Create a WireGuard Interface — `client.wireguard_interfaces.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `name` | string | A user specified name for the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | The current status of the interface deployment. |
| `endpoint` | string | The Telnyx WireGuard peers `Peer.endpoint` value. |
| `public_key` | string | The Telnyx WireGuard peers `Peer.PublicKey`. |
| `enable_sip_trunking` | boolean | Enable SIP traffic forwarding over VPN interface. |

### Create a WireGuard Peer — `client.wireguard_peers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `public_key` | string | The WireGuard `PublicKey`. |
| `last_seen` | string | ISO 8601 formatted date-time indicating when peer sent traffic last time. |
| `private_key` | string | Your WireGuard `Interface.PrivateKey`. |

### Update the WireGuard Peer — `client.wireguard_peers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `public_key` | string | The WireGuard `PublicKey`. |
