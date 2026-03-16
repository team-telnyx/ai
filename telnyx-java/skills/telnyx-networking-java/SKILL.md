---
name: telnyx-networking-java
description: >-
  Private networks, WireGuard VPN gateways, internet gateways, and virtual cross
  connects.
metadata:
  author: telnyx
  product: networking
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - Java

## Core Workflow

### Prerequisites

1. Contact Telnyx support to enable private networking features on your account

### Steps

1. **Create network**: `client.networks().create(params)`
2. **Create WireGuard interface**: `client.wireguardInterfaces().create(params)`
3. **Create gateway**: `client.privateWirelessGateways().create(params)`

### Common mistakes

- Private networking requires account-level enablement — contact support first
- WireGuard peer configuration is returned once at creation — save it immediately

**Related skills**: telnyx-iot-java

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
    var result = client.networks().create(params);
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all clusters

`client.ai().clusters().list()` — `GET /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.ai.clusters.ClusterListPage;
import com.telnyx.sdk.models.ai.clusters.ClusterListParams;

ClusterListPage page = client.ai().clusters().list();
```

Key response fields: `response.data.status, response.data.created_at, response.data.bucket`

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`client.ai().clusters().compute()` — `POST /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | The embedded storage bucket to compute the clusters from. |
| `prefix` | string | No | Prefix to filter whcih files in the buckets are included. |
| `files` | array[string] | No | Array of files to filter which are included. |
| `minClusterSize` | integer | No | Smallest number of related text chunks to qualify as a clust... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.ai.clusters.ClusterComputeParams;
import com.telnyx.sdk.models.ai.clusters.ClusterComputeResponse;

ClusterComputeParams params = ClusterComputeParams.builder()
    .bucket("my-bucket")
    .build();
ClusterComputeResponse response = client.ai().clusters().compute(params);
```

Key response fields: `response.data.task_id`

## Fetch a cluster

`client.ai().clusters().retrieve()` — `GET /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `topNNodes` | integer | No | The number of nodes in the cluster to return in the response... |
| `showSubclusters` | boolean | No | Whether or not to include subclusters and their nodes in the... |

```java
import com.telnyx.sdk.models.ai.clusters.ClusterRetrieveParams;
import com.telnyx.sdk.models.ai.clusters.ClusterRetrieveResponse;

ClusterRetrieveResponse cluster = client.ai().clusters().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.status, response.data.bucket, response.data.clusters`

## Delete a cluster

`client.ai().clusters().delete()` — `DELETE /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.clusters.ClusterDeleteParams;

client.ai().clusters().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Fetch a cluster visualization

`client.ai().clusters().fetchGraph()` — `GET /ai/clusters/{task_id}/graph`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes |  |
| `clusterId` | integer | No |  |

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.ai.clusters.ClusterFetchGraphParams;

HttpResponse response = client.ai().clusters().fetchGraph("550e8400-e29b-41d4-a716-446655440000");
```

## List Integrations

List all available integrations.

`client.ai().integrations().list()` — `GET /ai/integrations`

```java
import com.telnyx.sdk.models.ai.integrations.IntegrationListParams;
import com.telnyx.sdk.models.ai.integrations.IntegrationListResponse;

IntegrationListResponse integrations = client.ai().integrations().list();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List User Integrations

List user setup integrations

`client.ai().integrations().connections().list()` — `GET /ai/integrations/connections`

```java
import com.telnyx.sdk.models.ai.integrations.connections.ConnectionListParams;
import com.telnyx.sdk.models.ai.integrations.connections.ConnectionListResponse;

ConnectionListResponse connections = client.ai().integrations().connections().list();
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Get User Integration connection By Id

Get user setup integrations

`client.ai().integrations().connections().retrieve()` — `GET /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userConnectionId` | string (UUID) | Yes | The connection id |

```java
import com.telnyx.sdk.models.ai.integrations.connections.ConnectionRetrieveParams;
import com.telnyx.sdk.models.ai.integrations.connections.ConnectionRetrieveResponse;

ConnectionRetrieveResponse connection = client.ai().integrations().connections().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Delete Integration Connection

Delete a specific integration connection.

`client.ai().integrations().connections().delete()` — `DELETE /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userConnectionId` | string (UUID) | Yes | The user integration connection identifier |

```java
import com.telnyx.sdk.models.ai.integrations.connections.ConnectionDeleteParams;

client.ai().integrations().connections().delete("550e8400-e29b-41d4-a716-446655440000");
```

## List Integration By Id

Retrieve integration details

`client.ai().integrations().retrieve()` — `GET /ai/integrations/{integration_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `integrationId` | string (UUID) | Yes | The integration id |

```java
import com.telnyx.sdk.models.ai.integrations.IntegrationRetrieveParams;
import com.telnyx.sdk.models.ai.integrations.IntegrationRetrieveResponse;

IntegrationRetrieveResponse integration = client.ai().integrations().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Global IP Allowed Ports

`client.globalIpAllowedPorts().list()` — `GET /global_ip_allowed_ports`

```java
import com.telnyx.sdk.models.globalipallowedports.GlobalIpAllowedPortListParams;
import com.telnyx.sdk.models.globalipallowedports.GlobalIpAllowedPortListResponse;

GlobalIpAllowedPortListResponse globalIpAllowedPorts = client.globalIpAllowedPorts().list();
```

Key response fields: `response.data.id, response.data.name, response.data.first_port`

## Global IP Assignment Health Check Metrics

`client.globalIpAssignmentHealth().retrieve()` — `GET /global_ip_assignment_health`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globalipassignmenthealth.GlobalIpAssignmentHealthRetrieveParams;
import com.telnyx.sdk.models.globalipassignmenthealth.GlobalIpAssignmentHealthRetrieveResponse;

GlobalIpAssignmentHealthRetrieveResponse globalIpAssignmentHealth = client.globalIpAssignmentHealth().retrieve();
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.health`

## List all Global IP assignments

List all Global IP assignments.

`client.globalIpAssignments().list()` — `GET /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentListPage;
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentListParams;

GlobalIpAssignmentListPage page = client.globalIpAssignments().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Global IP assignment

Create a Global IP assignment.

`client.globalIpAssignments().create()` — `POST /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `globalIpId` | string (UUID) | No | Global IP ID. |
| `wireguardPeerId` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignment;
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentCreateParams;
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentCreateResponse;

GlobalIpAssignment params = GlobalIpAssignment.builder().build();
GlobalIpAssignmentCreateResponse globalIpAssignment = client.globalIpAssignments().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP assignment.

`client.globalIpAssignments().retrieve()` — `GET /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentRetrieveParams;
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentRetrieveResponse;

GlobalIpAssignmentRetrieveResponse globalIpAssignment = client.globalIpAssignments().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a Global IP assignment

Update a Global IP assignment.

`client.globalIpAssignments().update()` — `PATCH /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `globalIpId` | string (UUID) | No |  |
| `wireguardPeerId` | string (UUID) | No |  |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentUpdateParams;
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentUpdateResponse;

GlobalIpAssignmentUpdateResponse globalIpAssignment = client.globalIpAssignments().update("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Global IP assignment

Delete a Global IP assignment.

`client.globalIpAssignments().delete()` — `DELETE /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentDeleteParams;
import com.telnyx.sdk.models.globalipassignments.GlobalIpAssignmentDeleteResponse;

GlobalIpAssignmentDeleteResponse globalIpAssignment = client.globalIpAssignments().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Global IP Assignment Usage Metrics

`client.globalIpAssignmentsUsage().retrieve()` — `GET /global_ip_assignments_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globalipassignmentsusage.GlobalIpAssignmentsUsageRetrieveParams;
import com.telnyx.sdk.models.globalipassignmentsusage.GlobalIpAssignmentsUsageRetrieveResponse;

GlobalIpAssignmentsUsageRetrieveResponse globalIpAssignmentsUsage = client.globalIpAssignmentsUsage().retrieve();
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.received`

## List all Global IP Health check types

List all Global IP Health check types.

`client.globalIpHealthCheckTypes().list()` — `GET /global_ip_health_check_types`

```java
import com.telnyx.sdk.models.globaliphealthchecktypes.GlobalIpHealthCheckTypeListParams;
import com.telnyx.sdk.models.globaliphealthchecktypes.GlobalIpHealthCheckTypeListResponse;

GlobalIpHealthCheckTypeListResponse globalIpHealthCheckTypes = client.globalIpHealthCheckTypes().list();
```

Key response fields: `response.data.health_check_params, response.data.health_check_type, response.data.record_type`

## List all Global IP health checks

List all Global IP health checks.

`client.globalIpHealthChecks().list()` — `GET /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckListPage;
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckListParams;

GlobalIpHealthCheckListPage page = client.globalIpHealthChecks().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Global IP health check

Create a Global IP health check.

`client.globalIpHealthChecks().create()` — `POST /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `globalIpId` | string (UUID) | No | Global IP ID. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckCreateParams;
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckCreateResponse;

GlobalIpHealthCheckCreateResponse globalIpHealthCheck = client.globalIpHealthChecks().create();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`client.globalIpHealthChecks().retrieve()` — `GET /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckRetrieveParams;
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckRetrieveResponse;

GlobalIpHealthCheckRetrieveResponse globalIpHealthCheck = client.globalIpHealthChecks().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Global IP health check

Delete a Global IP health check.

`client.globalIpHealthChecks().delete()` — `DELETE /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckDeleteParams;
import com.telnyx.sdk.models.globaliphealthchecks.GlobalIpHealthCheckDeleteResponse;

GlobalIpHealthCheckDeleteResponse globalIpHealthCheck = client.globalIpHealthChecks().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Global IP Latency Metrics

`client.globalIpLatency().retrieve()` — `GET /global_ip_latency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globaliplatency.GlobalIpLatencyRetrieveParams;
import com.telnyx.sdk.models.globaliplatency.GlobalIpLatencyRetrieveResponse;

GlobalIpLatencyRetrieveResponse globalIpLatency = client.globalIpLatency().retrieve();
```

Key response fields: `response.data.global_ip, response.data.mean_latency, response.data.percentile_latency`

## List all Global IP Protocols

`client.globalIpProtocols().list()` — `GET /global_ip_protocols`

```java
import com.telnyx.sdk.models.globalipprotocols.GlobalIpProtocolListParams;
import com.telnyx.sdk.models.globalipprotocols.GlobalIpProtocolListResponse;

GlobalIpProtocolListResponse globalIpProtocols = client.globalIpProtocols().list();
```

Key response fields: `response.data.name, response.data.code, response.data.record_type`

## Global IP Usage Metrics

`client.globalIpUsage().retrieve()` — `GET /global_ip_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globalipusage.GlobalIpUsageRetrieveParams;
import com.telnyx.sdk.models.globalipusage.GlobalIpUsageRetrieveResponse;

GlobalIpUsageRetrieveResponse globalIpUsage = client.globalIpUsage().retrieve();
```

Key response fields: `response.data.global_ip, response.data.received, response.data.timestamp`

## List all Global IPs

List all Global IPs.

`client.globalIps().list()` — `GET /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.globalips.GlobalIpListPage;
import com.telnyx.sdk.models.globalips.GlobalIpListParams;

GlobalIpListPage page = client.globalIps().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Global IP

Create a Global IP.

`client.globalIps().create()` — `POST /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.globalips.GlobalIpCreateParams;
import com.telnyx.sdk.models.globalips.GlobalIpCreateResponse;

GlobalIpCreateResponse globalIp = client.globalIps().create();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP.

`client.globalIps().retrieve()` — `GET /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.globalips.GlobalIpRetrieveParams;
import com.telnyx.sdk.models.globalips.GlobalIpRetrieveResponse;

GlobalIpRetrieveResponse globalIp = client.globalIps().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Global IP

Delete a Global IP.

`client.globalIps().delete()` — `DELETE /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.globalips.GlobalIpDeleteParams;
import com.telnyx.sdk.models.globalips.GlobalIpDeleteResponse;

GlobalIpDeleteResponse globalIp = client.globalIps().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Networks

List all Networks.

`client.networks().list()` — `GET /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.networks.NetworkListPage;
import com.telnyx.sdk.models.networks.NetworkListParams;

NetworkListPage page = client.networks().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Network

Create a new Network.

`client.networks().create()` — `POST /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.networks.NetworkCreate;
import com.telnyx.sdk.models.networks.NetworkCreateParams;
import com.telnyx.sdk.models.networks.NetworkCreateResponse;

NetworkCreate params = NetworkCreate.builder()
    .name("test network")
    .build();
NetworkCreateResponse network = client.networks().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Network

Retrieve a Network.

`client.networks().retrieve()` — `GET /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.networks.NetworkRetrieveParams;
import com.telnyx.sdk.models.networks.NetworkRetrieveResponse;

NetworkRetrieveResponse network = client.networks().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a Network

Update a Network.

`client.networks().update()` — `PATCH /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.networks.NetworkCreate;
import com.telnyx.sdk.models.networks.NetworkUpdateParams;
import com.telnyx.sdk.models.networks.NetworkUpdateResponse;

NetworkUpdateParams params = NetworkUpdateParams.builder()
    .networkId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .networkCreate(NetworkCreate.builder()
        .name("test network")
        .build())
    .build();
NetworkUpdateResponse network = client.networks().update(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Network

Delete a Network.

`client.networks().delete()` — `DELETE /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.networks.NetworkDeleteParams;
import com.telnyx.sdk.models.networks.NetworkDeleteResponse;

NetworkDeleteResponse network = client.networks().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Default Gateway status.

`client.networks().defaultGateway().retrieve()` — `GET /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.networks.defaultgateway.DefaultGatewayRetrieveParams;
import com.telnyx.sdk.models.networks.defaultgateway.DefaultGatewayRetrieveResponse;

DefaultGatewayRetrieveResponse defaultGateway = client.networks().defaultGateway().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Default Gateway.

`client.networks().defaultGateway().create()` — `POST /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `networkId` | string (UUID) | No | Network ID. |
| `wireguardPeerId` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.networks.defaultgateway.DefaultGatewayCreateParams;
import com.telnyx.sdk.models.networks.defaultgateway.DefaultGatewayCreateResponse;

DefaultGatewayCreateResponse defaultGateway = client.networks().defaultGateway().create("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete Default Gateway.

`client.networks().defaultGateway().delete()` — `DELETE /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.networks.defaultgateway.DefaultGatewayDeleteParams;
import com.telnyx.sdk.models.networks.defaultgateway.DefaultGatewayDeleteResponse;

DefaultGatewayDeleteResponse defaultGateway = client.networks().defaultGateway().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all Interfaces for a Network.

`client.networks().listInterfaces()` — `GET /networks/{id}/network_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.networks.NetworkListInterfacesPage;
import com.telnyx.sdk.models.networks.NetworkListInterfacesParams;

NetworkListInterfacesPage page = client.networks().listInterfaces("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`client.privateWirelessGateways().list()` — `GET /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Private Wireless Gateway. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayListPage;
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayListParams;

PrivateWirelessGatewayListPage page = client.privateWirelessGateways().list();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`client.privateWirelessGateways().create()` — `POST /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | Yes | The identification of the related network resource. |
| `name` | string | Yes | The private wireless gateway name. |
| `regionCode` | string | No | The code of the region where the private wireless gateway wi... |

```java
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayCreateParams;
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayCreateResponse;

PrivateWirelessGatewayCreateParams params = PrivateWirelessGatewayCreateParams.builder()
    .name("My private wireless gateway")
    .networkId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
PrivateWirelessGatewayCreateResponse privateWirelessGateway = client.privateWirelessGateways().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`client.privateWirelessGateways().retrieve()` — `GET /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```java
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayRetrieveParams;
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayRetrieveResponse;

PrivateWirelessGatewayRetrieveResponse privateWirelessGateway = client.privateWirelessGateways().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`client.privateWirelessGateways().delete()` — `DELETE /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```java
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayDeleteParams;
import com.telnyx.sdk.models.privatewirelessgateways.PrivateWirelessGatewayDeleteResponse;

PrivateWirelessGatewayDeleteResponse privateWirelessGateway = client.privateWirelessGateways().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Public Internet Gateways

List all Public Internet Gateways.

`client.publicInternetGateways().list()` — `GET /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayListPage;
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayListParams;

PublicInternetGatewayListPage page = client.publicInternetGateways().list();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`client.publicInternetGateways().create()` — `POST /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | No | The id of the network associated with the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayCreateParams;
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayCreateResponse;

PublicInternetGatewayCreateResponse publicInternetGateway = client.publicInternetGateways().create();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`client.publicInternetGateways().retrieve()` — `GET /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayRetrieveParams;
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayRetrieveResponse;

PublicInternetGatewayRetrieveResponse publicInternetGateway = client.publicInternetGateways().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`client.publicInternetGateways().delete()` — `DELETE /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayDeleteParams;
import com.telnyx.sdk.models.publicinternetgateways.PublicInternetGatewayDeleteResponse;

PublicInternetGatewayDeleteResponse publicInternetGateway = client.publicInternetGateways().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Regions

List all regions and the interfaces that region supports

`client.regions().list()` — `GET /regions`

```java
import com.telnyx.sdk.models.regions.RegionListParams;
import com.telnyx.sdk.models.regions.RegionListResponse;

RegionListResponse regions = client.regions().list();
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`client.virtualCrossConnects().list()` — `GET /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectListPage;
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectListParams;

VirtualCrossConnectListPage page = client.virtualCrossConnects().list();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`client.virtualCrossConnects().create()` — `POST /virtual_cross_connects`

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

```java
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectCreateParams;
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectCreateResponse;

VirtualCrossConnectCreateParams params = VirtualCrossConnectCreateParams.builder()
    .regionCode("ashburn-va")
    .build();
VirtualCrossConnectCreateResponse virtualCrossConnect = client.virtualCrossConnects().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`client.virtualCrossConnects().retrieve()` — `GET /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectRetrieveParams;
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectRetrieveResponse;

VirtualCrossConnectRetrieveResponse virtualCrossConnect = client.virtualCrossConnects().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`client.virtualCrossConnects().update()` — `PATCH /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `primaryEnabled` | boolean | No | Indicates whether the primary circuit is enabled. |
| `primaryRoutingAnnouncement` | boolean | No | Whether the primary BGP route is being announced. |
| `primaryCloudIp` | string | No | The IP address assigned for your side of the Virtual Cross C... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectUpdateParams;
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectUpdateResponse;

VirtualCrossConnectUpdateResponse virtualCrossConnect = client.virtualCrossConnects().update("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`client.virtualCrossConnects().delete()` — `DELETE /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectDeleteParams;
import com.telnyx.sdk.models.virtualcrossconnects.VirtualCrossConnectDeleteResponse;

VirtualCrossConnectDeleteResponse virtualCrossConnect = client.virtualCrossConnects().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`client.virtualCrossConnectsCoverage().list()` — `GET /virtual_cross_connects_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.virtualcrossconnectscoverage.VirtualCrossConnectsCoverageListPage;
import com.telnyx.sdk.models.virtualcrossconnectscoverage.VirtualCrossConnectsCoverageListParams;

VirtualCrossConnectsCoverageListPage page = client.virtualCrossConnectsCoverage().list();
```

Key response fields: `response.data.available_bandwidth, response.data.cloud_provider, response.data.cloud_provider_region`

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`client.wireguardInterfaces().list()` — `GET /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceListPage;
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceListParams;

WireguardInterfaceListPage page = client.wireguardInterfaces().list();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`client.wireguardInterfaces().create()` — `POST /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `networkId` | string (UUID) | Yes | The id of the network associated with the interface. |
| `regionCode` | string | Yes | The region the interface should be deployed to. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceCreateParams;
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceCreateResponse;

WireguardInterfaceCreateResponse wireguardInterface = client.wireguardInterfaces().create();
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`client.wireguardInterfaces().retrieve()` — `GET /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceRetrieveParams;
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceRetrieveResponse;

WireguardInterfaceRetrieveResponse wireguardInterface = client.wireguardInterfaces().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`client.wireguardInterfaces().delete()` — `DELETE /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceDeleteParams;
import com.telnyx.sdk.models.wireguardinterfaces.WireguardInterfaceDeleteResponse;

WireguardInterfaceDeleteResponse wireguardInterface = client.wireguardInterfaces().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all WireGuard Peers

List all WireGuard peers.

`client.wireguardPeers().list()` — `GET /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerListPage;
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerListParams;

WireguardPeerListPage page = client.wireguardPeers().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`client.wireguardPeers().create()` — `POST /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wireguardInterfaceId` | string (UUID) | Yes | The id of the wireguard interface associated with the peer. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No | Identifies the type of the resource. |
| `createdAt` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerCreateParams;
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerCreateResponse;

WireguardPeerCreateParams params = WireguardPeerCreateParams.builder()
    .wireguardInterfaceId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
WireguardPeerCreateResponse wireguardPeer = client.wireguardPeers().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`client.wireguardPeers().retrieve()` — `GET /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerRetrieveParams;
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerRetrieveResponse;

WireguardPeerRetrieveResponse wireguardPeer = client.wireguardPeers().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update the WireGuard Peer

Update the WireGuard peer.

`client.wireguardPeers().update()` — `PATCH /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `publicKey` | string | No | The WireGuard `PublicKey`. |

```java
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerPatch;
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerUpdateParams;
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerUpdateResponse;

WireguardPeerUpdateParams params = WireguardPeerUpdateParams.builder()
    .id("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .wireguardPeerPatch(WireguardPeerPatch.builder().build())
    .build();
WireguardPeerUpdateResponse wireguardPeer = client.wireguardPeers().update(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete the WireGuard Peer

Delete the WireGuard peer.

`client.wireguardPeers().delete()` — `DELETE /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerDeleteParams;
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerDeleteResponse;

WireguardPeerDeleteResponse wireguardPeer = client.wireguardPeers().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve Wireguard config template for Peer

`client.wireguardPeers().retrieveConfig()` — `GET /wireguard_peers/{id}/config`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.wireguardpeers.WireguardPeerRetrieveConfigParams;

String response = client.wireguardPeers().retrieveConfig("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
