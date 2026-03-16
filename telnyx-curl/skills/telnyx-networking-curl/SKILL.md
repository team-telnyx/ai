---
name: telnyx-networking-curl
description: >-
  Private networks, WireGuard VPN gateways, internet gateways, and virtual cross
  connects.
metadata:
  author: telnyx
  product: networking
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - curl

## Core Workflow

### Prerequisites

1. Contact Telnyx support to enable private networking features on your account

### Steps

1. **Create network**
2. **Create WireGuard interface**
3. **Create gateway**

### Common mistakes

- Private networking requires account-level enablement — contact support first
- WireGuard peer configuration is returned once at creation — save it immediately

**Related skills**: telnyx-iot-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all clusters

`GET /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/clusters"
```

Key response fields: `.data.status, .data.created_at, .data.bucket`

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`POST /ai/clusters`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | The embedded storage bucket to compute the clusters from. |
| `prefix` | string | No | Prefix to filter whcih files in the buckets are included. |
| `files` | array[string] | No | Array of files to filter which are included. |
| `min_cluster_size` | integer | No | Smallest number of related text chunks to qualify as a clust... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket": "my-bucket"
}' \
  "https://api.telnyx.com/v2/ai/clusters"
```

Key response fields: `.data.task_id`

## Fetch a cluster

`GET /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |
| `top_n_nodes` | integer | No | The number of nodes in the cluster to return in the response... |
| `show_subclusters` | boolean | No | Whether or not to include subclusters and their nodes in the... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/clusters/{task_id}"
```

Key response fields: `.data.status, .data.bucket, .data.clusters`

## Delete a cluster

`DELETE /ai/clusters/{task_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/clusters/{task_id}"
```

## Fetch a cluster visualization

`GET /ai/clusters/{task_id}/graph`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string (UUID) | Yes |  |
| `cluster_id` | integer | No |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/clusters/{task_id}/graph"
```

## List Integrations

List all available integrations.

`GET /ai/integrations`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations"
```

Key response fields: `.data.id, .data.status, .data.name`

## List User Integrations

List user setup integrations

`GET /ai/integrations/connections`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations/connections"
```

Key response fields: `.data.id, .data.allowed_tools, .data.integration_id`

## Get User Integration connection By Id

Get user setup integrations

`GET /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_connection_id` | string (UUID) | Yes | The connection id |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations/connections/{user_connection_id}"
```

Key response fields: `.data.id, .data.allowed_tools, .data.integration_id`

## Delete Integration Connection

Delete a specific integration connection.

`DELETE /ai/integrations/connections/{user_connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_connection_id` | string (UUID) | Yes | The user integration connection identifier |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/integrations/connections/{user_connection_id}"
```

## List Integration By Id

Retrieve integration details

`GET /ai/integrations/{integration_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `integration_id` | string (UUID) | Yes | The integration id |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations/{integration_id}"
```

Key response fields: `.data.id, .data.status, .data.name`

## List all Global IP Allowed Ports

`GET /global_ip_allowed_ports`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_allowed_ports"
```

Key response fields: `.data.id, .data.name, .data.first_port`

## Global IP Assignment Health Check Metrics

`GET /global_ip_assignment_health`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignment_health"
```

Key response fields: `.data.global_ip, .data.global_ip_assignment, .data.health`

## List all Global IP assignments

List all Global IP assignments.

`GET /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a Global IP assignment

Create a Global IP assignment.

`POST /global_ip_assignments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `global_ip_id` | string (UUID) | No | Global IP ID. |
| `wireguard_peer_id` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ip_assignments"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve a Global IP

Retrieve a Global IP assignment.

`GET /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Update a Global IP assignment

Update a Global IP assignment.

`PATCH /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `global_ip_id` | string (UUID) | No |  |
| `wireguard_peer_id` | string (UUID) | No |  |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +7 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ip_assignments/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a Global IP assignment

Delete a Global IP assignment.

`DELETE /global_ip_assignments/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/global_ip_assignments/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Global IP Assignment Usage Metrics

`GET /global_ip_assignments_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments_usage"
```

Key response fields: `.data.global_ip, .data.global_ip_assignment, .data.received`

## List all Global IP Health check types

List all Global IP Health check types.

`GET /global_ip_health_check_types`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_health_check_types"
```

Key response fields: `.data.health_check_params, .data.health_check_type, .data.record_type`

## List all Global IP health checks

List all Global IP health checks.

`GET /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_health_checks"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a Global IP health check

Create a Global IP health check.

`POST /global_ip_health_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `global_ip_id` | string (UUID) | No | Global IP ID. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ip_health_checks"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`GET /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_health_checks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete a Global IP health check

Delete a Global IP health check.

`DELETE /global_ip_health_checks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/global_ip_health_checks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Global IP Latency Metrics

`GET /global_ip_latency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_latency"
```

Key response fields: `.data.global_ip, .data.mean_latency, .data.percentile_latency`

## List all Global IP Protocols

`GET /global_ip_protocols`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_protocols"
```

Key response fields: `.data.name, .data.code, .data.record_type`

## Global IP Usage Metrics

`GET /global_ip_usage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_usage"
```

Key response fields: `.data.global_ip, .data.received, .data.timestamp`

## List all Global IPs

List all Global IPs.

`GET /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ips"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create a Global IP

Create a Global IP.

`POST /global_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ips"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve a Global IP

Retrieve a Global IP.

`GET /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a Global IP

Delete a Global IP.

`DELETE /global_ips/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/global_ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List all Networks

List all Networks.

`GET /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create a Network

Create a new Network.

`POST /networks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "test network"
}' \
  "https://api.telnyx.com/v2/networks"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve a Network

Retrieve a Network.

`GET /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a Network

Update a Network.

`PATCH /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user specified name for the network. |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "test network"
}' \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a Network

Delete a Network.

`DELETE /networks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get Default Gateway status.

`GET /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/default_gateway"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create Default Gateway.

`POST /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `network_id` | string (UUID) | No | Network ID. |
| `wireguard_peer_id` | string (UUID) | No | Wireguard peer ID. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/default_gateway"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete Default Gateway.

`DELETE /networks/{id}/default_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/default_gateway"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List all Interfaces for a Network.

`GET /networks/{id}/network_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/network_interfaces"
```

Key response fields: `.data.id, .data.status, .data.name`

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`GET /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Private Wireless Gateway. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/private_wireless_gateways?filter[name]=my private gateway&filter[ip_range]=192.168.0.0/24&filter[region_code]=dc2&filter[created_at]=2018-02-02T22:25:27.521Z&filter[updated_at]=2018-02-02T22:25:27.521Z"
```

Key response fields: `.data.id, .data.status, .data.name`

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`POST /private_wireless_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | Yes | The identification of the related network resource. |
| `name` | string | Yes | The private wireless gateway name. |
| `region_code` | string | No | The code of the region where the private wireless gateway wi... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "network_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  "name": "My private wireless gateway"
}' \
  "https://api.telnyx.com/v2/private_wireless_gateways"
```

Key response fields: `.data.id, .data.status, .data.name`

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`GET /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/private_wireless_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`DELETE /private_wireless_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the private wireless gateway. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/private_wireless_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## List all Public Internet Gateways

List all Public Internet Gateways.

`GET /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/public_internet_gateways"
```

Key response fields: `.data.id, .data.status, .data.name`

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`POST /public_internet_gateways`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | No | The id of the network associated with the interface. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/public_internet_gateways"
```

Key response fields: `.data.id, .data.status, .data.name`

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`GET /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/public_internet_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`DELETE /public_internet_gateways/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/public_internet_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## List all Regions

List all regions and the interfaces that region supports

`GET /regions`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/regions"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`GET /virtual_cross_connects`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects"
```

Key response fields: `.data.id, .data.status, .data.name`

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`POST /virtual_cross_connects`

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

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "network_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  "cloud_provider": "aws",
  "cloud_provider_region": "us-east-1",
  "bgp_asn": 1234,
  "primary_cloud_account_id": "123456789012",
  "region_code": "ashburn-va"
}' \
  "https://api.telnyx.com/v2/virtual_cross_connects"
```

Key response fields: `.data.id, .data.status, .data.name`

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`GET /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`PATCH /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `primary_enabled` | boolean | No | Indicates whether the primary circuit is enabled. |
| `primary_routing_announcement` | boolean | No | Whether the primary BGP route is being announced. |
| `primary_cloud_ip` | string | No | The IP address assigned for your side of the Virtual Cross C... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/virtual_cross_connects/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`DELETE /virtual_cross_connects/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/virtual_cross_connects/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects_coverage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Consolidated filters parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects_coverage"
```

Key response fields: `.data.available_bandwidth, .data.cloud_provider, .data.cloud_provider_region`

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`GET /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_interfaces"
```

Key response fields: `.data.id, .data.status, .data.name`

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`POST /wireguard_interfaces`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network_id` | string (UUID) | Yes | The id of the network associated with the interface. |
| `region_code` | string | Yes | The region the interface should be deployed to. |
| `status` | enum (created, provisioning, provisioned, deleting) | No | The current status of the interface deployment. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "network_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  "region_code": "ashburn-va"
}' \
  "https://api.telnyx.com/v2/wireguard_interfaces"
```

Key response fields: `.data.id, .data.status, .data.name`

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`GET /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_interfaces/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`DELETE /wireguard_interfaces/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireguard_interfaces/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.name`

## List all WireGuard Peers

List all WireGuard peers.

`GET /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_peers"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`POST /wireguard_peers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wireguard_interface_id` | string (UUID) | Yes | The id of the wireguard interface associated with the peer. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No | Identifies the type of the resource. |
| `created_at` | string | No | ISO 8601 formatted date-time indicating when the resource wa... |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "wireguard_interface_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58"
}' \
  "https://api.telnyx.com/v2/wireguard_peers"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`GET /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update the WireGuard Peer

Update the WireGuard peer.

`PATCH /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `public_key` | string | No | The WireGuard `PublicKey`. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete the WireGuard Peer

Delete the WireGuard peer.

`DELETE /wireguard_peers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve Wireguard config template for Peer

`GET /wireguard_peers/{id}/config`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58/config"
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
