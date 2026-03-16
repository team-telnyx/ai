---
name: telnyx-networking-javascript
description: >-
  Private networks, WireGuard VPN gateways, internet gateways, and virtual cross
  connects.
metadata:
  author: telnyx
  product: networking
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - JavaScript

## Core Workflow

### Prerequisites

1. Contact Telnyx support to enable private networking features on your account

### Steps

1. **Create network**: `client.networks.create({name: ...})`
2. **Create WireGuard interface**: `client.wireguardInterfaces.create({networkId: ..., ...: ...})`
3. **Create gateway**: `client.privateWirelessGateways.create({networkId: ..., ...: ...})`

### Common mistakes

- Private networking requires account-level enablement — contact support first
- WireGuard peer configuration is returned once at creation — save it immediately

**Related skills**: telnyx-iot-javascript

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
  const result = await client.networks.create(params);
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

## List all clusters

`client.ai.clusters.list()` — `GET /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const clusterListResponse of client.ai.clusters.list()) {
  console.log(clusterListResponse.task_id);
}
```

Key response fields: `response.data.status, response.data.created_at, response.data.bucket`

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`client.ai.clusters.compute()` — `POST /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | The embedded storage bucket to compute the clusters from. |
| `prefix` | string | No | Prefix to filter whcih files in the buckets are included. |
| `files` | array[string] | No | Array of files to filter which are included. |
| `minClusterSize` | integer | No | Smallest number of related text chunks to qualify as a clust... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.ai.clusters.compute({ bucket: 'my-bucket' });

console.log(response.data);
```

Key response fields: `response.data.task_id`

## Fetch a cluster

`client.ai.clusters.retrieve()` — `GET /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `topNNodes` | integer | No | The number of nodes in the cluster to return in the response... |
| `showSubclusters` | boolean | No | Whether or not to include subclusters and their nodes in the... |

```javascript
const cluster = await client.ai.clusters.retrieve('task_id');

console.log(cluster.data);
```

Key response fields: `response.data.status, response.data.bucket, response.data.clusters`

## Delete a cluster

`client.ai.clusters.delete()` — `DELETE /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |

```javascript
await client.ai.clusters.delete('task_id');
```

## Fetch a cluster visualization

`client.ai.clusters.fetchGraph()` — `GET /ai/clusters/{task_id}/graph`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `clusterId` | integer | No |  |

```javascript
const response = await client.ai.clusters.fetchGraph('task_id');

console.log(response);

const content = await response.blob();
console.log(content);
```

## List Integrations

List all available integrations.

`client.ai.integrations.list()` — `GET /ai/integrations`

```javascript
const integrations = await client.ai.integrations.list();

console.log(integrations.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List User Integrations

List user setup integrations

`client.ai.integrations.connections.list()` — `GET /ai/integrations/connections`

```javascript
const connections = await client.ai.integrations.connections.list();

console.log(connections.data);
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Get User Integration connection By Id

Get user setup integrations

`client.ai.integrations.connections.retrieve()` — `GET /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userConnectionId` | string (UUID) | Yes | The connection id |

```javascript
const connection = await client.ai.integrations.connections.retrieve('user_connection_id');

console.log(connection.data);
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Delete Integration Connection

Delete a specific integration connection.

`client.ai.integrations.connections.delete()` — `DELETE /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userConnectionId` | string (UUID) | Yes | The user integration connection identifier |

```javascript
await client.ai.integrations.connections.delete('user_connection_id');
```

## List Integration By Id

Retrieve integration details

`client.ai.integrations.retrieve()` — `GET /ai/integrations/{integration_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `integrationId` | string (UUID) | Yes | The integration id |

```javascript
const integration = await client.ai.integrations.retrieve('integration_id');

console.log(integration.id);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Global IP Allowed Ports

`client.globalIPAllowedPorts.list()` — `GET /global_ip_allowed_ports`

```javascript
const globalIPAllowedPorts = await client.globalIPAllowedPorts.list();

console.log(globalIPAllowedPorts.data);
```

Key response fields: `response.data.id, response.data.name, response.data.first_port`

## Global IP Assignment Health Check Metrics

`client.globalIPAssignmentHealth.retrieve()` — `GET /global_ip_assignment_health`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const globalIPAssignmentHealth = await client.globalIPAssignmentHealth.retrieve();

console.log(globalIPAssignmentHealth.data);
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.health`

## List all Global IP assignments

List all Global IP assignments.

`client.globalIPAssignments.list()` — `GET /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPAssignment of client.globalIPAssignments.list()) {
  console.log(globalIPAssignment.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Global IP assignment

Create a Global IP assignment.

`client.globalIPAssignments.create()` — `POST /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `globalIpId` | string (UUID) | No | Global IP ID. |
| `wireguardPeerId` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const globalIPAssignment = await client.globalIPAssignments.create();

console.log(globalIPAssignment.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP assignment.

`client.globalIPAssignments.retrieve()` — `GET /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const globalIPAssignment = await client.globalIPAssignments.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPAssignment.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a Global IP assignment

Update a Global IP assignment.

`client.globalIPAssignments.update()` — `PATCH /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `globalIpId` | string (UUID) | No |  |
| `wireguardPeerId` | string (UUID) | No |  |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const globalIPAssignment = await client.globalIPAssignments.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { globalIpAssignmentUpdateRequest: {} },
);

console.log(globalIPAssignment.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Global IP assignment

Delete a Global IP assignment.

`client.globalIPAssignments.delete()` — `DELETE /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const globalIPAssignment = await client.globalIPAssignments.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPAssignment.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Global IP Assignment Usage Metrics

`client.globalIPAssignmentsUsage.retrieve()` — `GET /global_ip_assignments_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const globalIPAssignmentsUsage = await client.globalIPAssignmentsUsage.retrieve();

console.log(globalIPAssignmentsUsage.data);
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.received`

## List all Global IP Health check types

List all Global IP Health check types.

`client.globalIPHealthCheckTypes.list()` — `GET /global_ip_health_check_types`

```javascript
const globalIPHealthCheckTypes = await client.globalIPHealthCheckTypes.list();

console.log(globalIPHealthCheckTypes.data);
```

Key response fields: `response.data.health_check_params, response.data.health_check_type, response.data.record_type`

## List all Global IP health checks

List all Global IP health checks.

`client.globalIPHealthChecks.list()` — `GET /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPHealthCheckListResponse of client.globalIPHealthChecks.list()) {
  console.log(globalIPHealthCheckListResponse);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Global IP health check

Create a Global IP health check.

`client.globalIPHealthChecks.create()` — `POST /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `globalIpId` | string (UUID) | No | Global IP ID. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.create();

console.log(globalIPHealthCheck.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`client.globalIPHealthChecks.retrieve()` — `GET /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPHealthCheck.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Global IP health check

Delete a Global IP health check.

`client.globalIPHealthChecks.delete()` — `DELETE /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const globalIPHealthCheck = await client.globalIPHealthChecks.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(globalIPHealthCheck.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Global IP Latency Metrics

`client.globalIPLatency.retrieve()` — `GET /global_ip_latency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const globalIPLatency = await client.globalIPLatency.retrieve();

console.log(globalIPLatency.data);
```

Key response fields: `response.data.global_ip, response.data.mean_latency, response.data.percentile_latency`

## List all Global IP Protocols

`client.globalIPProtocols.list()` — `GET /global_ip_protocols`

```javascript
const globalIPProtocols = await client.globalIPProtocols.list();

console.log(globalIPProtocols.data);
```

Key response fields: `response.data.name, response.data.code, response.data.record_type`

## Global IP Usage Metrics

`client.globalIPUsage.retrieve()` — `GET /global_ip_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const globalIPUsage = await client.globalIPUsage.retrieve();

console.log(globalIPUsage.data);
```

Key response fields: `response.data.global_ip, response.data.received, response.data.timestamp`

## List all Global IPs

List all Global IPs.

`client.globalIPs.list()` — `GET /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const globalIPListResponse of client.globalIPs.list()) {
  console.log(globalIPListResponse);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Global IP

Create a Global IP.

`client.globalIPs.create()` — `POST /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const globalIP = await client.globalIPs.create();

console.log(globalIP.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP.

`client.globalIPs.retrieve()` — `GET /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const globalIP = await client.globalIPs.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(globalIP.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Global IP

Delete a Global IP.

`client.globalIPs.delete()` — `DELETE /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const globalIP = await client.globalIPs.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(globalIP.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Networks

List all Networks.

`client.networks.list()` — `GET /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const networkListResponse of client.networks.list()) {
  console.log(networkListResponse);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Network

Create a new Network.

`client.networks.create()` — `POST /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const network = await client.networks.create({ name: 'test network' });

console.log(network.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Network

Retrieve a Network.

`client.networks.retrieve()` — `GET /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const network = await client.networks.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(network.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a Network

Update a Network.

`client.networks.update()` — `PATCH /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const network = await client.networks.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58', {
  name: 'test network',
});

console.log(network.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Network

Delete a Network.

`client.networks.delete()` — `DELETE /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const network = await client.networks.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(network.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Default Gateway status.

`client.networks.defaultGateway.retrieve()` — `GET /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const defaultGateway = await client.networks.defaultGateway.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Default Gateway.

`client.networks.defaultGateway.create()` — `POST /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `networkId` | string (UUID) | No | Network ID. |
| `wireguardPeerId` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const defaultGateway = await client.networks.defaultGateway.create(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete Default Gateway.

`client.networks.defaultGateway.delete()` — `DELETE /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const defaultGateway = await client.networks.defaultGateway.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(defaultGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all Interfaces for a Network.

`client.networks.listInterfaces()` — `GET /networks/{id}/network_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const networkListInterfacesResponse of client.networks.listInterfaces(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
)) {
  console.log(networkListInterfacesResponse);
}
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`client.privateWirelessGateways.list()` — `GET /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Private Wireless Gateway. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const privateWirelessGateway of client.privateWirelessGateways.list()) {
  console.log(privateWirelessGateway.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`client.privateWirelessGateways.create()` — `POST /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | Yes | The identification of the related network resource. |
| `name` | string | Yes | The private wireless gateway name. |
| `regionCode` | string | No | The code of the region where the private wireless gateway wi... |

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.create({
  name: 'My private wireless gateway',
  network_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
});

console.log(privateWirelessGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`client.privateWirelessGateways.retrieve()` — `GET /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(privateWirelessGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`client.privateWirelessGateways.delete()` — `DELETE /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```javascript
const privateWirelessGateway = await client.privateWirelessGateways.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(privateWirelessGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Public Internet Gateways

List all Public Internet Gateways.

`client.publicInternetGateways.list()` — `GET /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const publicInternetGatewayListResponse of client.publicInternetGateways.list()) {
  console.log(publicInternetGatewayListResponse);
}
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`client.publicInternetGateways.create()` — `POST /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | No | The id of the network associated with the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const publicInternetGateway = await client.publicInternetGateways.create();

console.log(publicInternetGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`client.publicInternetGateways.retrieve()` — `GET /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const publicInternetGateway = await client.publicInternetGateways.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(publicInternetGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`client.publicInternetGateways.delete()` — `DELETE /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const publicInternetGateway = await client.publicInternetGateways.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(publicInternetGateway.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Regions

List all regions and the interfaces that region supports

`client.regions.list()` — `GET /regions`

```javascript
const regions = await client.regions.list();

console.log(regions.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`client.virtualCrossConnects.list()` — `GET /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const virtualCrossConnectListResponse of client.virtualCrossConnects.list()) {
  console.log(virtualCrossConnectListResponse);
}
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`client.virtualCrossConnects.create()` — `POST /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | Yes | The id of the network associated with the interface. |
| `cloudProvider` | enum (aws, azure, gce) | Yes | The Virtual Private Cloud with which you would like to estab... |
| `cloudProviderRegion` | string | Yes | The region where your Virtual Private Cloud hosts are locate... |
| `bgpAsn` | number | Yes | The Border Gateway Protocol (BGP) Autonomous System Number (... |
| `primaryCloudAccountId` | string (UUID) | Yes | The identifier for your Virtual Private Cloud. |
| `regionCode` | string | Yes | The region the interface should be deployed to. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `secondaryCloudAccountId` | string (UUID) | No | The identifier for your Virtual Private Cloud. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +13 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.create({ region_code: 'ashburn-va' });

console.log(virtualCrossConnect.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`client.virtualCrossConnects.retrieve()` — `GET /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`client.virtualCrossConnects.update()` — `PATCH /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `primaryEnabled` | boolean | No | Indicates whether the primary circuit is enabled. |
| `primaryRoutingAnnouncement` | boolean | No | Whether the primary BGP route is being announced. |
| `primaryCloudIp` | string | No | The IP address assigned for your side of the Virtual Cross C... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`client.virtualCrossConnects.delete()` — `DELETE /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const virtualCrossConnect = await client.virtualCrossConnects.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(virtualCrossConnect.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`client.virtualCrossConnectsCoverage.list()` — `GET /virtual_cross_connects_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const virtualCrossConnectsCoverageListResponse of client.virtualCrossConnectsCoverage.list()) {
  console.log(virtualCrossConnectsCoverageListResponse.available_bandwidth);
}
```

Key response fields: `response.data.available_bandwidth, response.data.cloud_provider, response.data.cloud_provider_region`

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`client.wireguardInterfaces.list()` — `GET /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const wireguardInterfaceListResponse of client.wireguardInterfaces.list()) {
  console.log(wireguardInterfaceListResponse);
}
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`client.wireguardInterfaces.create()` — `POST /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | Yes | The id of the network associated with the interface. |
| `regionCode` | string | Yes | The region the interface should be deployed to. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const wireguardInterface = await client.wireguardInterfaces.create({ region_code: 'ashburn-va' });

console.log(wireguardInterface.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`client.wireguardInterfaces.retrieve()` — `GET /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const wireguardInterface = await client.wireguardInterfaces.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wireguardInterface.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`client.wireguardInterfaces.delete()` — `DELETE /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const wireguardInterface = await client.wireguardInterfaces.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wireguardInterface.data);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all WireGuard Peers

List all WireGuard peers.

`client.wireguardPeers.list()` — `GET /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const wireguardPeerListResponse of client.wireguardPeers.list()) {
  console.log(wireguardPeerListResponse);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`client.wireguardPeers.create()` — `POST /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wireguardInterfaceId` | string (UUID) | Yes | The id of the wireguard interface associated with the peer. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const wireguardPeer = await client.wireguardPeers.create({
  wireguard_interface_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
});

console.log(wireguardPeer.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`client.wireguardPeers.retrieve()` — `GET /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const wireguardPeer = await client.wireguardPeers.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update the WireGuard Peer

Update the WireGuard peer.

`client.wireguardPeers.update()` — `PATCH /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `publicKey` | string | No | The WireGuard `PublicKey`. |

```javascript
const wireguardPeer = await client.wireguardPeers.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete the WireGuard Peer

Delete the WireGuard peer.

`client.wireguardPeers.delete()` — `DELETE /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const wireguardPeer = await client.wireguardPeers.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(wireguardPeer.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve Wireguard config template for Peer

`client.wireguardPeers.retrieveConfig()` — `GET /wireguard_peers/{id}/config`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.wireguardPeers.retrieveConfig('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response);
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
