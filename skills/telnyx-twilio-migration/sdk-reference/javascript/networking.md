<!-- SDK reference: telnyx-networking-javascript -->

# Telnyx Networking - JavaScript

## Installation

```bash
npm install telnyx@6.74.2
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
  const result = await client.messages.send({ to: '+13125550001', from: '+13125550002', text: 'Hello' });
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

## List all clusters

Retrieve a paginated list of clustering tasks and their statuses.

`GET /ai/clusters`

```javascript
// Automatically fetches more pages as needed.
for await (const clusterListResponse of client.ai.clusters.list()) {
  console.log(clusterListResponse.task_id);
}
```

Returns: `bucket` (string), `created_at` (date-time), `finished_at` (date-time), `min_cluster_size` (integer), `min_subcluster_size` (integer), `status` (enum: pending, starting, running, completed, failed), `task_id` (string)

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`POST /ai/clusters` — Required: `bucket`

Optional: `files` (array[string]), `min_cluster_size` (integer), `min_subcluster_size` (integer), `prefix` (string)

```javascript
const response = await client.ai.clusters.compute({ bucket: 'my-bucket' });

console.log(response.data);
```

Returns: `task_id` (string)

## Fetch a cluster

Fetch the results of a clustering task, including the discovered clusters.

`GET /ai/clusters/{task_id}`

```javascript
const cluster = await client.ai.clusters.retrieve('task_id');

console.log(cluster.data);
```

Returns: `bucket` (string), `clusters` (array[object]), `status` (enum: pending, starting, running, completed, failed)

## Delete a cluster

Delete a clustering task and its computed results.

`DELETE /ai/clusters/{task_id}`

```javascript
await client.ai.clusters.delete('task_id');
```

## Fetch a cluster visualization

Fetch a visualization image of the clusters computed by a clustering task.

`GET /ai/clusters/{task_id}/graph`

```javascript
const response = await client.ai.clusters.fetchGraph('task_id');

console.log(response);

const content = await response.blob();
console.log(content);
```

## List Integrations

Returns the list of third-party integrations available to connect to your AI assistants and workflows.

`GET /ai/integrations`

```javascript
const integrations = await client.ai.integrations.list();

console.log(integrations.data);
```

Returns: `available_tools` (array[string]), `description` (string), `display_name` (string), `id` (string), `logo_url` (string), `name` (string), `status` (enum: disconnected, connected)

## List User Integrations

Returns the list of integration connections you have set up, linking your account to third-party services.

`GET /ai/integrations/connections`

```javascript
const connections = await client.ai.integrations.connections.list();

console.log(connections.data);
```

Returns: `allowed_tools` (array[string]), `id` (string), `integration_id` (string)

## Get User Integration connection By Id

Returns the details of a single integration connection by its ID.

`GET /ai/integrations/connections/{user_connection_id}`

```javascript
const connection = await client.ai.integrations.connections.retrieve('user_connection_id');

console.log(connection.data);
```

Returns: `allowed_tools` (array[string]), `id` (string), `integration_id` (string)

## Delete Integration Connection

Delete a specific integration connection.

`DELETE /ai/integrations/connections/{user_connection_id}`

```javascript
await client.ai.integrations.connections.delete('user_connection_id');
```

## List Integration By Id

Returns the details of a single available integration, including its configuration details.

`GET /ai/integrations/{integration_id}`

```javascript
const integration = await client.ai.integrations.retrieve('integration_id');

console.log(integration.id);
```

Returns: `available_tools` (array[string]), `description` (string), `display_name` (string), `id` (string), `logo_url` (string), `name` (string), `status` (enum: disconnected, connected)

## List all Global IP Allowed Ports

Returns the ports allowed for Global IP traffic, for use when configuring Global IP resources.

`GET /global_ip_allowed_ports`

```javascript
const globalIPAllowedPorts = await client.globalIPAllowedPorts.list();

console.log(globalIPAllowedPorts.data);
```

Returns: `first_port` (integer), `id` (uuid), `last_port` (integer), `name` (string), `protocol_code` (string), `record_type` (string)

## Global IP Assignment Health Check Metrics

Retrieve health check metrics for your Global IP assignments.

`GET /global_ip_assignment_health`

```javascript
const globalIPAssignmentHealth = await client.globalIPAssignmentHealth.retrieve();

console.log(globalIPAssignmentHealth.data);
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `health` (object), `timestamp` (date-time)

## List all Global IP assignments

Returns a paginated list of your Global IP assignments, the links between Global IPs and the WireGuard peers that receive their traffic.

`GET /global_ip_assignments`

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPAssignment of client.globalIPAssignments.list()) {
  console.log(globalIPAssignment.id);
}
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Create a Global IP assignment

Assigns a Global IP to a WireGuard peer so traffic destined for the IP is delivered over that peer's tunnel. Assignment is asynchronous, so the request is accepted and completes in the background.

`POST /global_ip_assignments`

Optional: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

```javascript
const globalIPAssignment = await client.globalIPAssignments.create();

console.log(globalIPAssignment.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Retrieve a Global IP assignment

Returns the details of a single Global IP assignment, including the Global IP and WireGuard peer it links.

`GET /global_ip_assignments/{id}`

```javascript
const globalIPAssignment = await client.globalIPAssignments.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPAssignment.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Update a Global IP assignment

Updates the specified Global IP assignment with the provided fields and returns the updated assignment.

`PATCH /global_ip_assignments/{id}`

Optional: `created_at` (string), `global_ip_id` (string), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (string)

```javascript
const globalIPAssignment = await client.globalIPAssignments.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { globalIpAssignmentUpdateRequest: {} },
);

console.log(globalIPAssignment.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Delete a Global IP assignment

Deletes the specified Global IP assignment, detaching the Global IP from its WireGuard peer.

`DELETE /global_ip_assignments/{id}`

```javascript
const globalIPAssignment = await client.globalIPAssignments.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPAssignment.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Global IP Assignment Usage Metrics

Retrieve usage metrics for your Global IP assignments.

`GET /global_ip_assignments_usage`

```javascript
const globalIPAssignmentsUsage = await client.globalIPAssignmentsUsage.retrieve();

console.log(globalIPAssignmentsUsage.data);
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## List all Global IP Health check types

Returns the health check types available for Global IPs, for use when creating Global IP health checks.

`GET /global_ip_health_check_types`

```javascript
const globalIPHealthCheckTypes = await client.globalIPHealthCheckTypes.list();

console.log(globalIPHealthCheckTypes.data);
```

Returns: `health_check_params` (object), `health_check_type` (string), `record_type` (string)

## List all Global IP health checks

Returns a paginated list of the Global IP health checks configured on your account.

`GET /global_ip_health_checks`

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPHealthCheckListResponse of client.globalIPHealthChecks.list()) {
  console.log(globalIPHealthCheckListResponse);
}
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Create a Global IP health check

Creates a health check for a Global IP to monitor the health of its assignments. Creation is asynchronous, so the request is accepted and the health check becomes active once provisioning completes.

`POST /global_ip_health_checks`

Optional: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.create();

console.log(globalIPHealthCheck.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Retrieve a Global IP health check

Returns the details of a single Global IP health check, including its type and configuration.

`GET /global_ip_health_checks/{id}`

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPHealthCheck.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Delete a Global IP health check

Deletes the specified Global IP health check so it no longer monitors the Global IP's assignments.

`DELETE /global_ip_health_checks/{id}`

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPHealthCheck.data);
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Global IP Latency Metrics

Retrieve latency metrics measured for your Global IPs.

`GET /global_ip_latency`

```javascript
const globalIPLatency = await client.globalIPLatency.retrieve();

console.log(globalIPLatency.data);
```

Returns: `global_ip` (object), `mean_latency` (object), `percentile_latency` (object), `prober_location` (object), `timestamp` (date-time)

## List all Global IP Protocols

Returns the network protocols supported for Global IP traffic, for use when configuring Global IP resources.

`GET /global_ip_protocols`

```javascript
const globalIPProtocols = await client.globalIPProtocols.list();

console.log(globalIPProtocols.data);
```

Returns: `code` (string), `name` (string), `record_type` (string)

## Global IP Usage Metrics

Retrieve usage metrics for your Global IPs.

`GET /global_ip_usage`

```javascript
const globalIPUsage = await client.globalIPUsage.retrieve();

console.log(globalIPUsage.data);
```

Returns: `global_ip` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## List all Global IPs

Returns a paginated list of the Global IPs on your account, including each IP's address and configuration.

`GET /global_ips`

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPListResponse of client.globalIPs.list()) {
  console.log(globalIPListResponse);
}
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Create a Global IP

Requests creation of a new Global IP, a static IP address announced from the Telnyx network. Provisioning is asynchronous, so the request is accepted and the Global IP becomes available once provisioning completes.

`POST /global_ips`

Optional: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

```javascript
const globalIP = await client.globalIPs.create();

console.log(globalIP.data);
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Retrieve a Global IP

Returns the details of a single Global IP, including its address and current configuration.

`GET /global_ips/{id}`

```javascript
const globalIP = await client.globalIPs.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(globalIP.data);
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Delete a Global IP

Deletes the specified Global IP and releases its address back to Telnyx.

`DELETE /global_ips/{id}`

```javascript
const globalIP = await client.globalIPs.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(globalIP.data);
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## List all Networks

Returns a paginated list of the private networks on your account, with support for filtering.

`GET /networks`

```javascript
// Automatically fetches more pages as needed.
for await (const networkListResponse of client.networks.list()) {
  console.log(networkListResponse);
}
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Create a Network

Creates a new private network, the container that links your WireGuard interfaces, gateways, and cross connects.

`POST /networks` — Required: `name`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

```javascript
const network = await client.networks.create({ name: 'test network' });

console.log(network.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Retrieve a Network

Returns the details of a single network by its identifier.

`GET /networks/{id}`

```javascript
const network = await client.networks.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(network.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Update a Network

Updates the specified network's attributes and returns the updated network.

`PATCH /networks/{id}` — Required: `name`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

```javascript
const network = await client.networks.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58', {
  name: 'test network',
});

console.log(network.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Delete a Network

Permanently deletes the specified network from your account.

`DELETE /networks/{id}`

```javascript
const network = await client.networks.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(network.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Get Default Gateway status.

Returns the status of the default gateway configured on the specified network.

`GET /networks/{id}/default_gateway`

```javascript
const defaultGateway = await client.networks.defaultGateway.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Create Default Gateway.

Creates a default gateway on the specified network, directing the network's outbound traffic through the chosen gateway.

`POST /networks/{id}/default_gateway`

Optional: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

```javascript
const defaultGateway = await client.networks.defaultGateway.create(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Delete Default Gateway.

Removes the default gateway from the specified network.

`DELETE /networks/{id}/default_gateway`

```javascript
const defaultGateway = await client.networks.defaultGateway.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## List all Interfaces for a Network.

Returns a paginated list of the interfaces attached to the specified network, with support for filtering.

`GET /networks/{id}/network_interfaces`

```javascript
// Automatically fetches more pages as needed.
for await (const networkListInterfacesResponse of client.networks.listInterfaces(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
)) {
  console.log(networkListInterfacesResponse);
}
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `type` (string), `updated_at` (string)

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`GET /private_wireless_gateways`

```javascript
// Automatically fetches more pages as needed.
for await (const privateWirelessGateway of client.privateWirelessGateways.list()) {
  console.log(privateWirelessGateway.id);
}
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`POST /private_wireless_gateways` — Required: `network_id`, `name`

Optional: `address_mode` (enum: static, dynamic), `region_code` (string)

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.create({
  name: 'My private wireless gateway',
  network_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
});

console.log(privateWirelessGateway.data);
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`GET /private_wireless_gateways/{id}`

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(privateWirelessGateway.data);
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Delete a Private Wireless Gateway

Permanently deletes the specified Private Wireless Gateway from your account.

`DELETE /private_wireless_gateways/{id}`

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(privateWirelessGateway.data);
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## List all Public Internet Gateways

Returns a paginated list of the public internet gateways on your account, with support for filtering.

`GET /public_internet_gateways`

```javascript
// Automatically fetches more pages as needed.
for await (const publicInternetGatewayListResponse of client.publicInternetGateways.list()) {
  console.log(publicInternetGatewayListResponse);
}
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a Public Internet Gateway

Requests creation of a public internet gateway on the specified network, giving the network internet egress. Creation is asynchronous, so the request is accepted and completes in the background.

`POST /public_internet_gateways`

Optional: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```javascript
const publicInternetGateway = await client.publicInternetGateways.create();

console.log(publicInternetGateway.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a Public Internet Gateway

Returns the details of a single public internet gateway by its identifier.

`GET /public_internet_gateways/{id}`

```javascript
const publicInternetGateway = await client.publicInternetGateways.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(publicInternetGateway.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a Public Internet Gateway

Deletes the specified public internet gateway, removing internet egress through it.

`DELETE /public_internet_gateways/{id}`

```javascript
const publicInternetGateway = await client.publicInternetGateways.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(publicInternetGateway.data);
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List all Regions

List all regions and the interfaces that region supports

`GET /regions`

```javascript
const regions = await client.regions.list();

console.log(regions.data);
```

Returns: `code` (string), `created_at` (string), `name` (string), `record_type` (string), `supported_interfaces` (array[string]), `updated_at` (string)

## List all Virtual Cross Connects

Returns a paginated list of the virtual cross connects on your account, with support for filtering.

`GET /virtual_cross_connects`

```javascript
// Automatically fetches more pages as needed.
for await (const virtualCrossConnectListResponse of client.virtualCrossConnects.list()) {
  console.log(virtualCrossConnectListResponse);
}
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`POST /virtual_cross_connects` — Required: `network_id`, `region_code`, `cloud_provider`, `cloud_provider_region`, `bgp_asn`, `primary_cloud_account_id`

Optional: `bandwidth_mbps` (number), `created_at` (string), `id` (uuid), `name` (string), `primary_bgp_key` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.create({ region_code: 'ashburn-va' });

console.log(virtualCrossConnect.data);
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a Virtual Cross Connect

Returns the details of a single virtual cross connect by its identifier.

`GET /virtual_cross_connects/{id}`

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`PATCH /virtual_cross_connects/{id}`

Optional: `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean)

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a Virtual Cross Connect

Deletes the specified virtual cross connect from your account.

`DELETE /virtual_cross_connects/{id}`

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects_coverage`

```javascript
// Automatically fetches more pages as needed.
for await (const virtualCrossConnectsCoverageListResponse of client.virtualCrossConnectsCoverage.list()) {
  console.log(virtualCrossConnectsCoverageListResponse.available_bandwidth);
}
```

Returns: `available_bandwidth` (array[number]), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `location` (object), `record_type` (string)

## List all WireGuard Interfaces

Returns a paginated list of the WireGuard interfaces on your account, with support for filtering.

`GET /wireguard_interfaces`

```javascript
// Automatically fetches more pages as needed.
for await (const wireguardInterfaceListResponse of client.wireguardInterfaces.list()) {
  console.log(wireguardInterfaceListResponse);
}
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`POST /wireguard_interfaces` — Required: `network_id`, `region_code`

Optional: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `public_key` (string), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```javascript
const wireguardInterface = await client.wireguardInterfaces.create({ region_code: 'ashburn-va' });

console.log(wireguardInterface.data);
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a WireGuard Interfaces

Returns the details of a single WireGuard interface by its identifier.

`GET /wireguard_interfaces/{id}`

```javascript
const wireguardInterface = await client.wireguardInterfaces.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wireguardInterface.data);
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a WireGuard Interface

Deletes the specified WireGuard interface from its network.

`DELETE /wireguard_interfaces/{id}`

```javascript
const wireguardInterface = await client.wireguardInterfaces.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wireguardInterface.data);
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List all WireGuard Peers

Returns a paginated list of your WireGuard peers, with support for filtering.

`GET /wireguard_peers`

```javascript
// Automatically fetches more pages as needed.
for await (const wireguardPeerListResponse of client.wireguardPeers.list()) {
  console.log(wireguardPeerListResponse);
}
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`POST /wireguard_peers` — Required: `wireguard_interface_id`

Optional: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string)

```javascript
const wireguardPeer = await client.wireguardPeers.create({
  wireguard_interface_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
});

console.log(wireguardPeer.data);
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Retrieve the WireGuard Peer

Returns the details of a single WireGuard peer by its identifier.

`GET /wireguard_peers/{id}`

```javascript
const wireguardPeer = await client.wireguardPeers.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Update the WireGuard Peer

Updates the specified WireGuard peer and returns the updated peer.

`PATCH /wireguard_peers/{id}`

Optional: `public_key` (string)

```javascript
const wireguardPeer = await client.wireguardPeers.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Delete the WireGuard Peer

Deletes the specified WireGuard peer from its interface.

`DELETE /wireguard_peers/{id}`

```javascript
const wireguardPeer = await client.wireguardPeers.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Retrieve Wireguard config template for Peer

`GET /wireguard_peers/{id}/config`

```javascript
const response = await client.wireguardPeers.retrieveConfig('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response);
```
