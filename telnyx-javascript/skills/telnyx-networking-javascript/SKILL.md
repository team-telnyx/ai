---
name: telnyx-networking-javascript
description: >-
  Configure private networks, WireGuard VPN gateways, internet gateways, and
  virtual cross connects. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: networking
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - JavaScript

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

## List all clusters

`GET /ai/clusters`

```javascript
// Automatically fetches more pages as needed.
for await (const clusterListResponse of client.ai.clusters.list()) {
  console.log(clusterListResponse.task_id);
}
```

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered.

`POST /ai/clusters` — Required: `bucket`

Optional: `files` (array[string]), `min_cluster_size` (integer), `min_subcluster_size` (integer), `prefix` (string)

```javascript
const response = await client.ai.clusters.compute({ bucket: 'bucket' });

console.log(response.data);
```

## Fetch a cluster

`GET /ai/clusters/{task_id}`

```javascript
const cluster = await client.ai.clusters.retrieve('task_id');

console.log(cluster.data);
```

## Delete a cluster

`DELETE /ai/clusters/{task_id}`

```javascript
await client.ai.clusters.delete('task_id');
```

## Fetch a cluster visualization

`GET /ai/clusters/{task_id}/graph`

```javascript
const response = await client.ai.clusters.fetchGraph('task_id');

console.log(response);

const content = await response.blob();
console.log(content);
```

## List Integrations

List all available integrations.

`GET /ai/integrations`

```javascript
const integrations = await client.ai.integrations.list();

console.log(integrations.data);
```

## List User Integrations

List user setup integrations

`GET /ai/integrations/connections`

```javascript
const connections = await client.ai.integrations.connections.list();

console.log(connections.data);
```

## Get User Integration connection By Id

Get user setup integrations

`GET /ai/integrations/connections/{user_connection_id}`

```javascript
const connection = await client.ai.integrations.connections.retrieve('user_connection_id');

console.log(connection.data);
```

## Delete Integration Connection

Delete a specific integration connection.

`DELETE /ai/integrations/connections/{user_connection_id}`

```javascript
await client.ai.integrations.connections.delete('user_connection_id');
```

## List Integration By Id

Retrieve integration details

`GET /ai/integrations/{integration_id}`

```javascript
const integration = await client.ai.integrations.retrieve('integration_id');

console.log(integration.id);
```

## List all Global IP Allowed Ports

`GET /global_ip_allowed_ports`

```javascript
const globalIPAllowedPorts = await client.globalIPAllowedPorts.list();

console.log(globalIPAllowedPorts.data);
```

## Global IP Assignment Health Check Metrics

`GET /global_ip_assignment_health`

```javascript
const globalIPAssignmentHealth = await client.globalIPAssignmentHealth.retrieve();

console.log(globalIPAssignmentHealth.data);
```

## List all Global IP assignments

List all Global IP assignments.

`GET /global_ip_assignments`

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPAssignment of client.globalIPAssignments.list()) {
  console.log(globalIPAssignment.id);
}
```

## Create a Global IP assignment

Create a Global IP assignment.

`POST /global_ip_assignments`

```javascript
const globalIPAssignment = await client.globalIPAssignments.create();

console.log(globalIPAssignment.data);
```

## Retrieve a Global IP

Retrieve a Global IP assignment.

`GET /global_ip_assignments/{id}`

```javascript
const globalIPAssignment = await client.globalIPAssignments.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPAssignment.data);
```

## Update a Global IP assignment

Update a Global IP assignment.

`PATCH /global_ip_assignments/{id}`

```javascript
const globalIPAssignment = await client.globalIPAssignments.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { globalIpAssignmentUpdateRequest: {} },
);

console.log(globalIPAssignment.data);
```

## Delete a Global IP assignment

Delete a Global IP assignment.

`DELETE /global_ip_assignments/{id}`

```javascript
const globalIPAssignment = await client.globalIPAssignments.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPAssignment.data);
```

## Global IP Assignment Usage Metrics

`GET /global_ip_assignments_usage`

```javascript
const globalIPAssignmentsUsage = await client.globalIPAssignmentsUsage.retrieve();

console.log(globalIPAssignmentsUsage.data);
```

## List all Global IP Health check types

List all Global IP Health check types.

`GET /global_ip_health_check_types`

```javascript
const globalIPHealthCheckTypes = await client.globalIPHealthCheckTypes.list();

console.log(globalIPHealthCheckTypes.data);
```

## List all Global IP health checks

List all Global IP health checks.

`GET /global_ip_health_checks`

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPHealthCheckListResponse of client.globalIPHealthChecks.list()) {
  console.log(globalIPHealthCheckListResponse);
}
```

## Create a Global IP health check

Create a Global IP health check.

`POST /global_ip_health_checks`

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.create();

console.log(globalIPHealthCheck.data);
```

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`GET /global_ip_health_checks/{id}`

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPHealthCheck.data);
```

## Delete a Global IP health check

Delete a Global IP health check.

`DELETE /global_ip_health_checks/{id}`

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPHealthCheck.data);
```

## Global IP Latency Metrics

`GET /global_ip_latency`

```javascript
const globalIPLatency = await client.globalIPLatency.retrieve();

console.log(globalIPLatency.data);
```

## List all Global IP Protocols

`GET /global_ip_protocols`

```javascript
const globalIPProtocols = await client.globalIPProtocols.list();

console.log(globalIPProtocols.data);
```

## Global IP Usage Metrics

`GET /global_ip_usage`

```javascript
const globalIPUsage = await client.globalIPUsage.retrieve();

console.log(globalIPUsage.data);
```

## List all Global IPs

List all Global IPs.

`GET /global_ips`

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPListResponse of client.globalIPs.list()) {
  console.log(globalIPListResponse);
}
```

## Create a Global IP

Create a Global IP.

`POST /global_ips`

```javascript
const globalIP = await client.globalIPs.create();

console.log(globalIP.data);
```

## Retrieve a Global IP

Retrieve a Global IP.

`GET /global_ips/{id}`

```javascript
const globalIP = await client.globalIPs.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(globalIP.data);
```

## Delete a Global IP

Delete a Global IP.

`DELETE /global_ips/{id}`

```javascript
const globalIP = await client.globalIPs.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(globalIP.data);
```

## List all Networks

List all Networks.

`GET /networks`

```javascript
// Automatically fetches more pages as needed.
for await (const networkListResponse of client.networks.list()) {
  console.log(networkListResponse);
}
```

## Create a Network

Create a new Network.

`POST /networks`

```javascript
const network = await client.networks.create({ name: 'test network' });

console.log(network.data);
```

## Retrieve a Network

Retrieve a Network.

`GET /networks/{id}`

```javascript
const network = await client.networks.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(network.data);
```

## Update a Network

Update a Network.

`PATCH /networks/{id}`

```javascript
const network = await client.networks.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58', {
  name: 'test network',
});

console.log(network.data);
```

## Delete a Network

Delete a Network.

`DELETE /networks/{id}`

```javascript
const network = await client.networks.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(network.data);
```

## Get Default Gateway status.

`GET /networks/{id}/default_gateway`

```javascript
const defaultGateway = await client.networks.defaultGateway.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

## Create Default Gateway.

`POST /networks/{id}/default_gateway`

```javascript
const defaultGateway = await client.networks.defaultGateway.create(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

## Delete Default Gateway.

`DELETE /networks/{id}/default_gateway`

```javascript
const defaultGateway = await client.networks.defaultGateway.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

## List all Interfaces for a Network.

`GET /networks/{id}/network_interfaces`

```javascript
// Automatically fetches more pages as needed.
for await (const networkListInterfacesResponse of client.networks.listInterfaces(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
)) {
  console.log(networkListInterfacesResponse);
}
```

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`GET /private_wireless_gateways`

```javascript
// Automatically fetches more pages as needed.
for await (const privateWirelessGateway of client.privateWirelessGateways.list()) {
  console.log(privateWirelessGateway.id);
}
```

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network.

`POST /private_wireless_gateways` — Required: `network_id`, `name`

Optional: `region_code` (string)

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.create({
  name: 'My private wireless gateway',
  network_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
});

console.log(privateWirelessGateway.data);
```

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`GET /private_wireless_gateways/{id}`

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(privateWirelessGateway.data);
```

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`DELETE /private_wireless_gateways/{id}`

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(privateWirelessGateway.data);
```

## List all Public Internet Gateways

List all Public Internet Gateways.

`GET /public_internet_gateways`

```javascript
// Automatically fetches more pages as needed.
for await (const publicInternetGatewayListResponse of client.publicInternetGateways.list()) {
  console.log(publicInternetGatewayListResponse);
}
```

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`POST /public_internet_gateways`

```javascript
const publicInternetGateway = await client.publicInternetGateways.create();

console.log(publicInternetGateway.data);
```

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`GET /public_internet_gateways/{id}`

```javascript
const publicInternetGateway = await client.publicInternetGateways.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(publicInternetGateway.data);
```

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`DELETE /public_internet_gateways/{id}`

```javascript
const publicInternetGateway = await client.publicInternetGateways.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(publicInternetGateway.data);
```

## List all Regions

List all regions and the interfaces that region supports

`GET /regions`

```javascript
const regions = await client.regions.list();

console.log(regions.data);
```

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`GET /virtual_cross_connects`

```javascript
// Automatically fetches more pages as needed.
for await (const virtualCrossConnectListResponse of client.virtualCrossConnects.list()) {
  console.log(virtualCrossConnectListResponse);
}
```

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.<br /><br />For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later.

`POST /virtual_cross_connects`

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.create({ region_code: 'ashburn-va' });

console.log(virtualCrossConnect.data);
```

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`GET /virtual_cross_connects/{id}`

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.<br /><br />Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has bee...

`PATCH /virtual_cross_connects/{id}`

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`DELETE /virtual_cross_connects/{id}`

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.<br /><br />This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects_coverage`

```javascript
// Automatically fetches more pages as needed.
for await (const virtualCrossConnectsCoverageListResponse of client.virtualCrossConnectsCoverage.list()) {
  console.log(virtualCrossConnectsCoverageListResponse.available_bandwidth);
}
```

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`GET /wireguard_interfaces`

```javascript
// Automatically fetches more pages as needed.
for await (const wireguardInterfaceListResponse of client.wireguardInterfaces.list()) {
  console.log(wireguardInterfaceListResponse);
}
```

## Create a WireGuard Interface

Create a new WireGuard Interface.

`POST /wireguard_interfaces`

```javascript
const wireguardInterface = await client.wireguardInterfaces.create({ region_code: 'ashburn-va' });

console.log(wireguardInterface.data);
```

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`GET /wireguard_interfaces/{id}`

```javascript
const wireguardInterface = await client.wireguardInterfaces.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wireguardInterface.data);
```

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`DELETE /wireguard_interfaces/{id}`

```javascript
const wireguardInterface = await client.wireguardInterfaces.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wireguardInterface.data);
```

## List all WireGuard Peers

List all WireGuard peers.

`GET /wireguard_peers`

```javascript
// Automatically fetches more pages as needed.
for await (const wireguardPeerListResponse of client.wireguardPeers.list()) {
  console.log(wireguardPeerListResponse);
}
```

## Create a WireGuard Peer

Create a new WireGuard Peer.

`POST /wireguard_peers`

```javascript
const wireguardPeer = await client.wireguardPeers.create({
  wireguard_interface_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
});

console.log(wireguardPeer.data);
```

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`GET /wireguard_peers/{id}`

```javascript
const wireguardPeer = await client.wireguardPeers.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

## Update the WireGuard Peer

Update the WireGuard peer.

`PATCH /wireguard_peers/{id}`

Optional: `public_key` (string)

```javascript
const wireguardPeer = await client.wireguardPeers.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

## Delete the WireGuard Peer

Delete the WireGuard peer.

`DELETE /wireguard_peers/{id}`

```javascript
const wireguardPeer = await client.wireguardPeers.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

## Retrieve Wireguard config template for Peer

`GET /wireguard_peers/{id}/config`

```javascript
const response = await client.wireguardPeers.retrieveConfig('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response);
```
