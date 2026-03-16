---
name: telnyx-networking-python
description: >-
  Private networks, WireGuard VPN gateways, internet gateways, and virtual cross
  connects.
metadata:
  author: telnyx
  product: networking
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - Python

## Core Workflow

### Prerequisites

1. Contact Telnyx support to enable private networking features on your account

### Steps

1. **Create network**: `client.networks.create(name=...)`
2. **Create WireGuard interface**: `client.wireguard_interfaces.create(network_id=..., ...)`
3. **Create gateway**: `client.private_wireless_gateways.create(network_id=..., ...)`

### Common mistakes

- Private networking requires account-level enablement — contact support first
- WireGuard peer configuration is returned once at creation — save it immediately

**Related skills**: telnyx-iot-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.networks.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all clusters

`client.ai.clusters.list()` — `GET /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.ai.clusters.list()
page = page.data[0]
print(page.task_id)
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
| `min_cluster_size` | integer | No | Smallest number of related text chunks to qualify as a clust... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
response = client.ai.clusters.compute(
    bucket="my-bucket",
)
print(response.data)
```

Key response fields: `response.data.task_id`

## Fetch a cluster

`client.ai.clusters.retrieve()` — `GET /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |
| `top_n_nodes` | integer | No | The number of nodes in the cluster to return in the response... |
| `show_subclusters` | boolean | No | Whether or not to include subclusters and their nodes in the... |

```python
cluster = client.ai.clusters.retrieve(
    task_id="550e8400-e29b-41d4-a716-446655440000",
)
print(cluster.data)
```

Key response fields: `response.data.status, response.data.bucket, response.data.clusters`

## Delete a cluster

`client.ai.clusters.delete()` — `DELETE /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |

```python
client.ai.clusters.delete(
    "task_id",
)
```

## Fetch a cluster visualization

`client.ai.clusters.fetch_graph()` — `GET /ai/clusters/{task_id}/graph`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |
| `cluster_id` | integer | No |  |

```python
response = client.ai.clusters.fetch_graph(
    task_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response)
content = response.read()
print(content)
```

## List Integrations

List all available integrations.

`client.ai.integrations.list()` — `GET /ai/integrations`

```python
integrations = client.ai.integrations.list()
print(integrations.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List User Integrations

List user setup integrations

`client.ai.integrations.connections.list()` — `GET /ai/integrations/connections`

```python
connections = client.ai.integrations.connections.list()
print(connections.data)
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Get User Integration connection By Id

Get user setup integrations

`client.ai.integrations.connections.retrieve()` — `GET /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_connection_id` | string (UUID) | Yes | The connection id |

```python
connection = client.ai.integrations.connections.retrieve(
    "user_connection_id",
)
print(connection.data)
```

Key response fields: `response.data.id, response.data.allowed_tools, response.data.integration_id`

## Delete Integration Connection

Delete a specific integration connection.

`client.ai.integrations.connections.delete()` — `DELETE /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_connection_id` | string (UUID) | Yes | The user integration connection identifier |

```python
client.ai.integrations.connections.delete(
    "user_connection_id",
)
```

## List Integration By Id

Retrieve integration details

`client.ai.integrations.retrieve()` — `GET /ai/integrations/{integration_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `integration_id` | string (UUID) | Yes | The integration id |

```python
integration = client.ai.integrations.retrieve(
    "integration_id",
)
print(integration.id)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Global IP Allowed Ports

`client.global_ip_allowed_ports.list()` — `GET /global_ip_allowed_ports`

```python
global_ip_allowed_ports = client.global_ip_allowed_ports.list()
print(global_ip_allowed_ports.data)
```

Key response fields: `response.data.id, response.data.name, response.data.first_port`

## Global IP Assignment Health Check Metrics

`client.global_ip_assignment_health.retrieve()` — `GET /global_ip_assignment_health`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
global_ip_assignment_health = client.global_ip_assignment_health.retrieve()
print(global_ip_assignment_health.data)
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.health`

## List all Global IP assignments

List all Global IP assignments.

`client.global_ip_assignments.list()` — `GET /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.global_ip_assignments.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Global IP assignment

Create a Global IP assignment.

`client.global_ip_assignments.create()` — `POST /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `global_ip_id` | string (UUID) | No | Global IP ID. |
| `wireguard_peer_id` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```python
global_ip_assignment = client.global_ip_assignments.create()
print(global_ip_assignment.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP assignment.

`client.global_ip_assignments.retrieve()` — `GET /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
global_ip_assignment = client.global_ip_assignments.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_assignment.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a Global IP assignment

Update a Global IP assignment.

`client.global_ip_assignments.update()` — `PATCH /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `global_ip_id` | string (UUID) | No |  |
| `wireguard_peer_id` | string (UUID) | No |  |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```python
global_ip_assignment = client.global_ip_assignments.update(
    global_ip_assignment_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    global_ip_assignment_update_request={},
)
print(global_ip_assignment.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a Global IP assignment

Delete a Global IP assignment.

`client.global_ip_assignments.delete()` — `DELETE /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
global_ip_assignment = client.global_ip_assignments.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_assignment.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Global IP Assignment Usage Metrics

`client.global_ip_assignments_usage.retrieve()` — `GET /global_ip_assignments_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
global_ip_assignments_usage = client.global_ip_assignments_usage.retrieve()
print(global_ip_assignments_usage.data)
```

Key response fields: `response.data.global_ip, response.data.global_ip_assignment, response.data.received`

## List all Global IP Health check types

List all Global IP Health check types.

`client.global_ip_health_check_types.list()` — `GET /global_ip_health_check_types`

```python
global_ip_health_check_types = client.global_ip_health_check_types.list()
print(global_ip_health_check_types.data)
```

Key response fields: `response.data.health_check_params, response.data.health_check_type, response.data.record_type`

## List all Global IP health checks

List all Global IP health checks.

`client.global_ip_health_checks.list()` — `GET /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.global_ip_health_checks.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Global IP health check

Create a Global IP health check.

`client.global_ip_health_checks.create()` — `POST /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `global_ip_id` | string (UUID) | No | Global IP ID. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
global_ip_health_check = client.global_ip_health_checks.create()
print(global_ip_health_check.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`client.global_ip_health_checks.retrieve()` — `GET /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
global_ip_health_check = client.global_ip_health_checks.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_health_check.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Global IP health check

Delete a Global IP health check.

`client.global_ip_health_checks.delete()` — `DELETE /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
global_ip_health_check = client.global_ip_health_checks.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_health_check.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Global IP Latency Metrics

`client.global_ip_latency.retrieve()` — `GET /global_ip_latency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
global_ip_latency = client.global_ip_latency.retrieve()
print(global_ip_latency.data)
```

Key response fields: `response.data.global_ip, response.data.mean_latency, response.data.percentile_latency`

## List all Global IP Protocols

`client.global_ip_protocols.list()` — `GET /global_ip_protocols`

```python
global_ip_protocols = client.global_ip_protocols.list()
print(global_ip_protocols.data)
```

Key response fields: `response.data.name, response.data.code, response.data.record_type`

## Global IP Usage Metrics

`client.global_ip_usage.retrieve()` — `GET /global_ip_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
global_ip_usage = client.global_ip_usage.retrieve()
print(global_ip_usage.data)
```

Key response fields: `response.data.global_ip, response.data.received, response.data.timestamp`

## List all Global IPs

List all Global IPs.

`client.global_ips.list()` — `GET /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.global_ips.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Global IP

Create a Global IP.

`client.global_ips.create()` — `POST /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```python
global_ip = client.global_ips.create()
print(global_ip.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Global IP

Retrieve a Global IP.

`client.global_ips.retrieve()` — `GET /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
global_ip = client.global_ips.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Global IP

Delete a Global IP.

`client.global_ips.delete()` — `DELETE /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
global_ip = client.global_ips.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all Networks

List all Networks.

`client.networks.list()` — `GET /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.networks.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a Network

Create a new Network.

`client.networks.create()` — `POST /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
network = client.networks.create(
    name="test network",
)
print(network.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a Network

Retrieve a Network.

`client.networks.retrieve()` — `GET /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
network = client.networks.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(network.data)
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
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
network = client.networks.update(
    network_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    name="test network",
)
print(network.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a Network

Delete a Network.

`client.networks.delete()` — `DELETE /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
network = client.networks.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(network.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Default Gateway status.

`client.networks.default_gateway.retrieve()` — `GET /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
default_gateway = client.networks.default_gateway.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(default_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create Default Gateway.

`client.networks.default_gateway.create()` — `POST /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `network_id` | string (UUID) | No | Network ID. |
| `wireguard_peer_id` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
default_gateway = client.networks.default_gateway.create(
    network_identifier="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(default_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete Default Gateway.

`client.networks.default_gateway.delete()` — `DELETE /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
default_gateway = client.networks.default_gateway.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(default_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all Interfaces for a Network.

`client.networks.list_interfaces()` — `GET /networks/{id}/network_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.networks.list_interfaces(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`client.private_wireless_gateways.list()` — `GET /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Private Wireless Gateway. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.private_wireless_gateways.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`client.private_wireless_gateways.create()` — `POST /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | Yes | The identification of the related network resource. |
| `name` | string | Yes | The private wireless gateway name. |
| `region_code` | string | No | The code of the region where the private wireless gateway wi... |

```python
private_wireless_gateway = client.private_wireless_gateways.create(
    name="My private wireless gateway",
    network_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(private_wireless_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`client.private_wireless_gateways.retrieve()` — `GET /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```python
private_wireless_gateway = client.private_wireless_gateways.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(private_wireless_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`client.private_wireless_gateways.delete()` — `DELETE /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```python
private_wireless_gateway = client.private_wireless_gateways.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(private_wireless_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Public Internet Gateways

List all Public Internet Gateways.

`client.public_internet_gateways.list()` — `GET /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.public_internet_gateways.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`client.public_internet_gateways.create()` — `POST /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | No | The id of the network associated with the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```python
public_internet_gateway = client.public_internet_gateways.create()
print(public_internet_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`client.public_internet_gateways.retrieve()` — `GET /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
public_internet_gateway = client.public_internet_gateways.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(public_internet_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`client.public_internet_gateways.delete()` — `DELETE /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
public_internet_gateway = client.public_internet_gateways.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(public_internet_gateway.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all Regions

List all regions and the interfaces that region supports

`client.regions.list()` — `GET /regions`

```python
regions = client.regions.list()
print(regions.data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`client.virtual_cross_connects.list()` — `GET /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.virtual_cross_connects.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`client.virtual_cross_connects.create()` — `POST /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | Yes | The id of the network associated with the interface. |
| `cloud_provider` | enum (aws, azure, gce) | Yes | The Virtual Private Cloud with which you would like to estab... |
| `cloud_provider_region` | string | Yes | The region where your Virtual Private Cloud hosts are locate... |
| `bgp_asn` | number | Yes | The Border Gateway Protocol (BGP) Autonomous System Number (... |
| `primary_cloud_account_id` | string (UUID) | Yes | The identifier for your Virtual Private Cloud. |
| `region_code` | string | Yes | The region the interface should be deployed to. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `secondary_cloud_account_id` | string (UUID) | No | The identifier for your Virtual Private Cloud. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +13 optional params in [references/api-details.md](references/api-details.md) |

```python
virtual_cross_connect = client.virtual_cross_connects.create(
    region_code="ashburn-va",
)
print(virtual_cross_connect.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`client.virtual_cross_connects.retrieve()` — `GET /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
virtual_cross_connect = client.virtual_cross_connects.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(virtual_cross_connect.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`client.virtual_cross_connects.update()` — `PATCH /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `primary_enabled` | boolean | No | Indicates whether the primary circuit is enabled. |
| `primary_routing_announcement` | boolean | No | Whether the primary BGP route is being announced. |
| `primary_cloud_ip` | string | No | The IP address assigned for your side of the Virtual Cross C... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```python
virtual_cross_connect = client.virtual_cross_connects.update(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(virtual_cross_connect.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`client.virtual_cross_connects.delete()` — `DELETE /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
virtual_cross_connect = client.virtual_cross_connects.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(virtual_cross_connect.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`client.virtual_cross_connects_coverage.list()` — `GET /virtual_cross_connects_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.virtual_cross_connects_coverage.list()
page = page.data[0]
print(page.available_bandwidth)
```

Key response fields: `response.data.available_bandwidth, response.data.cloud_provider, response.data.cloud_provider_region`

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`client.wireguard_interfaces.list()` — `GET /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.wireguard_interfaces.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`client.wireguard_interfaces.create()` — `POST /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | Yes | The id of the network associated with the interface. |
| `region_code` | string | Yes | The region the interface should be deployed to. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```python
wireguard_interface = client.wireguard_interfaces.create(
    region_code="ashburn-va",
)
print(wireguard_interface.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`client.wireguard_interfaces.retrieve()` — `GET /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
wireguard_interface = client.wireguard_interfaces.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_interface.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`client.wireguard_interfaces.delete()` — `DELETE /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
wireguard_interface = client.wireguard_interfaces.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_interface.data)
```

Key response fields: `response.data.id, response.data.status, response.data.name`

## List all WireGuard Peers

List all WireGuard peers.

`client.wireguard_peers.list()` — `GET /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.wireguard_peers.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`client.wireguard_peers.create()` — `POST /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wireguard_interface_id` | string (UUID) | Yes | The id of the wireguard interface associated with the peer. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
wireguard_peer = client.wireguard_peers.create(
    wireguard_interface_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`client.wireguard_peers.retrieve()` — `GET /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
wireguard_peer = client.wireguard_peers.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update the WireGuard Peer

Update the WireGuard peer.

`client.wireguard_peers.update()` — `PATCH /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `public_key` | string | No | The WireGuard `PublicKey`. |

```python
wireguard_peer = client.wireguard_peers.update(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete the WireGuard Peer

Delete the WireGuard peer.

`client.wireguard_peers.delete()` — `DELETE /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
wireguard_peer = client.wireguard_peers.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve Wireguard config template for Peer

`client.wireguard_peers.retrieve_config()` — `GET /wireguard_peers/{id}/config`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.wireguard_peers.retrieve_config(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
