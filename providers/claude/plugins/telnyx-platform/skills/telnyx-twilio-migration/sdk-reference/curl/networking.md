<!-- SDK reference: telnyx-networking-curl -->

# Telnyx Networking - curl

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
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

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

## List all clusters

Retrieve a paginated list of clustering tasks and their statuses.

`GET /ai/clusters`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/clusters"
```

Returns: `bucket` (string), `created_at` (date-time), `finished_at` (date-time), `min_cluster_size` (integer), `min_subcluster_size` (integer), `status` (enum: pending, starting, running, completed, failed), `task_id` (string)

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered. This helps identify common themes and patterns in the data.

`POST /ai/clusters` — Required: `bucket`

Optional: `files` (array[string]), `min_cluster_size` (integer), `min_subcluster_size` (integer), `prefix` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "bucket": "my-bucket",
  "prefix": "string",
  "files": [
    "string"
  ],
  "min_cluster_size": 25,
  "min_subcluster_size": 5
}' \
  "https://api.telnyx.com/v2/ai/clusters"
```

Returns: `task_id` (string)

## Fetch a cluster

Fetch the results of a clustering task, including the discovered clusters.

`GET /ai/clusters/{task_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/clusters/{task_id}"
```

Returns: `bucket` (string), `clusters` (array[object]), `status` (enum: pending, starting, running, completed, failed)

## Delete a cluster

Delete a clustering task and its computed results.

`DELETE /ai/clusters/{task_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/clusters/{task_id}"
```

## Fetch a cluster visualization

Fetch a visualization image of the clusters computed by a clustering task.

`GET /ai/clusters/{task_id}/graph`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/clusters/{task_id}/graph"
```

## List Integrations

Returns the list of third-party integrations available to connect to your AI assistants and workflows.

`GET /ai/integrations`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations"
```

Returns: `available_tools` (array[string]), `description` (string), `display_name` (string), `id` (string), `logo_url` (string), `name` (string), `status` (enum: disconnected, connected)

## List User Integrations

Returns the list of integration connections you have set up, linking your account to third-party services.

`GET /ai/integrations/connections`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations/connections"
```

Returns: `allowed_tools` (array[string]), `id` (string), `integration_id` (string)

## Get User Integration connection By Id

Returns the details of a single integration connection by its ID.

`GET /ai/integrations/connections/{user_connection_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations/connections/{user_connection_id}"
```

Returns: `allowed_tools` (array[string]), `id` (string), `integration_id` (string)

## Delete Integration Connection

Delete a specific integration connection.

`DELETE /ai/integrations/connections/{user_connection_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/integrations/connections/{user_connection_id}"
```

## List Integration By Id

Returns the details of a single available integration, including its configuration details.

`GET /ai/integrations/{integration_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/integrations/{integration_id}"
```

Returns: `available_tools` (array[string]), `description` (string), `display_name` (string), `id` (string), `logo_url` (string), `name` (string), `status` (enum: disconnected, connected)

## List all Global IP Allowed Ports

Returns the ports allowed for Global IP traffic, for use when configuring Global IP resources.

`GET /global_ip_allowed_ports`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_allowed_ports"
```

Returns: `first_port` (integer), `id` (uuid), `last_port` (integer), `name` (string), `protocol_code` (string), `record_type` (string)

## Global IP Assignment Health Check Metrics

Retrieve health check metrics for your Global IP assignments.

`GET /global_ip_assignment_health`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignment_health"
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `health` (object), `timestamp` (date-time)

## List all Global IP assignments

Returns a paginated list of your Global IP assignments, the links between Global IPs and the WireGuard peers that receive their traffic.

`GET /global_ip_assignments`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Create a Global IP assignment

Assigns a Global IP to a WireGuard peer so traffic destined for the IP is delivered over that peer's tunnel. Assignment is asynchronous, so the request is accepted and completes in the background.

`POST /global_ip_assignments`

Optional: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ip_assignments"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Global IP Assignment Usage Metrics

Retrieve usage metrics for your Global IP assignments.

`GET /global_ip_assignments/usage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments/usage"
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## Retrieve a Global IP assignment

Returns the details of a single Global IP assignment, including the Global IP and WireGuard peer it links.

`GET /global_ip_assignments/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Update a Global IP assignment

Updates the specified Global IP assignment with the provided fields and returns the updated assignment.

`PATCH /global_ip_assignments/{id}`

Optional: `created_at` (string), `global_ip_id` (string), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (string)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ip_assignments/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Delete a Global IP assignment

Deletes the specified Global IP assignment, detaching the Global IP from its WireGuard peer.

`DELETE /global_ip_assignments/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/global_ip_assignments/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `id` (uuid), `is_announced` (boolean), `is_connected` (boolean), `is_in_maintenance` (boolean), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Global IP Assignment Usage Metrics

Retrieve usage metrics for your Global IP assignments.

`GET /global_ip_assignments_usage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_assignments_usage"
```

Returns: `global_ip` (object), `global_ip_assignment` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## List all Global IP Health check types

Returns the health check types available for Global IPs, for use when creating Global IP health checks.

`GET /global_ip_health_check_types`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_health_check_types"
```

Returns: `health_check_params` (object), `health_check_type` (string), `record_type` (string)

## List all Global IP health checks

Returns a paginated list of the Global IP health checks configured on your account.

`GET /global_ip_health_checks`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_health_checks"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Create a Global IP health check

Creates a health check for a Global IP to monitor the health of its assignments. Creation is asynchronous, so the request is accepted and the health check becomes active once provisioning completes.

`POST /global_ip_health_checks`

Optional: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ip_health_checks"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Retrieve a Global IP health check

Returns the details of a single Global IP health check, including its type and configuration.

`GET /global_ip_health_checks/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_health_checks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Delete a Global IP health check

Deletes the specified Global IP health check so it no longer monitors the Global IP's assignments.

`DELETE /global_ip_health_checks/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/global_ip_health_checks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `global_ip_id` (uuid), `health_check_params` (object), `health_check_type` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

## Global IP Latency Metrics

Retrieve latency metrics measured for your Global IPs.

`GET /global_ip_latency`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_latency"
```

Returns: `global_ip` (object), `mean_latency` (object), `percentile_latency` (object), `prober_location` (object), `timestamp` (date-time)

## List all Global IP Protocols

Returns the network protocols supported for Global IP traffic, for use when configuring Global IP resources.

`GET /global_ip_protocols`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_protocols"
```

Returns: `code` (string), `name` (string), `record_type` (string)

## Global IP Usage Metrics

Retrieve usage metrics for your Global IPs.

`GET /global_ip_usage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ip_usage"
```

Returns: `global_ip` (object), `received` (object), `timestamp` (date-time), `transmitted` (object)

## List all Global IPs

Returns a paginated list of the Global IPs on your account, including each IP's address and configuration.

`GET /global_ips`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ips"
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Create a Global IP

Requests creation of a new Global IP, a static IP address announced from the Telnyx network. Provisioning is asynchronous, so the request is accepted and the Global IP becomes available once provisioning completes.

`POST /global_ips`

Optional: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/global_ips"
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Retrieve a Global IP

Returns the details of a single Global IP, including its address and current configuration.

`GET /global_ips/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/global_ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## Delete a Global IP

Deletes the specified Global IP and releases its address back to Telnyx.

`DELETE /global_ips/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/global_ips/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `description` (string), `id` (uuid), `ip_address` (string), `name` (string), `ports` (object), `record_type` (string), `updated_at` (string)

## List all Networks

Returns a paginated list of the private networks on your account, with support for filtering.

`GET /networks`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Create a Network

Creates a new private network, the container that links your WireGuard interfaces, gateways, and cross connects.

`POST /networks` — Required: `name`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

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

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Retrieve a Network

Returns the details of a single network by its identifier.

`GET /networks/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Update a Network

Updates the specified network's attributes and returns the updated network.

`PATCH /networks/{id}` — Required: `name`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `updated_at` (string)

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

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Delete a Network

Permanently deletes the specified network from your account.

`DELETE /networks/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `record_type` (string), `updated_at` (string)

## Get Default Gateway status.

Returns the status of the default gateway configured on the specified network.

`GET /networks/{id}/default_gateway`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/default_gateway"
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Create Default Gateway.

Creates a default gateway on the specified network, directing the network's outbound traffic through the chosen gateway.

`POST /networks/{id}/default_gateway`

Optional: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/default_gateway"
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## Delete Default Gateway.

Removes the default gateway from the specified network.

`DELETE /networks/{id}/default_gateway`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/default_gateway"
```

Returns: `created_at` (string), `id` (uuid), `network_id` (uuid), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string), `wireguard_peer_id` (uuid)

## List all Interfaces for a Network.

Returns a paginated list of the interfaces attached to the specified network, with support for filtering.

`GET /networks/{id}/network_interfaces`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/networks/6a09cdc3-8948-47f0-aa62-74ac943d6c58/network_interfaces"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `type` (string), `updated_at` (string)

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`GET /private_wireless_gateways`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/private_wireless_gateways?filter[name]=my private gateway&filter[ip_range]=192.168.0.0/24&filter[region_code]=dc2&filter[created_at]=2018-02-02T22:25:27.521Z&filter[updated_at]=2018-02-02T22:25:27.521Z"
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network. This operation may take several minutes so you can check the Private Wireless Gateway status at the section Get a Private Wireless Gateway.

`POST /private_wireless_gateways` — Required: `network_id`, `name`

Optional: `address_mode` (enum: static, dynamic), `region_code` (string)

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

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`GET /private_wireless_gateways/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/private_wireless_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## Delete a Private Wireless Gateway

Permanently deletes the specified Private Wireless Gateway from your account.

`DELETE /private_wireless_gateways/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/private_wireless_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `address_mode` (enum: static, dynamic), `assigned_resources` (array[object]), `created_at` (string), `id` (uuid), `ip_range` (string), `name` (string), `network_id` (uuid), `record_type` (string), `region_code` (string), `status` (object), `updated_at` (string)

## List all Public Internet Gateways

Returns a paginated list of the public internet gateways on your account, with support for filtering.

`GET /public_internet_gateways`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/public_internet_gateways"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a Public Internet Gateway

Requests creation of a public internet gateway on the specified network, giving the network internet egress. Creation is asynchronous, so the request is accepted and completes in the background.

`POST /public_internet_gateways`

Optional: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/public_internet_gateways"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a Public Internet Gateway

Returns the details of a single public internet gateway by its identifier.

`GET /public_internet_gateways/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/public_internet_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a Public Internet Gateway

Deletes the specified public internet gateway, removing internet egress through it.

`DELETE /public_internet_gateways/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/public_internet_gateways/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_ip` (string), `record_type` (string), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List all Regions

List all regions and the interfaces that region supports

`GET /regions`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/regions"
```

Returns: `code` (string), `created_at` (string), `name` (string), `record_type` (string), `supported_interfaces` (array[string]), `updated_at` (string)

## List all Virtual Cross Connects

Returns a paginated list of the virtual cross connects on your account, with support for filtering.

`GET /virtual_cross_connects`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects"
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.  For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later. You also have the option of disabling the primary and/or secondary connections at any time and later re-enabling them. With Azure, you do not have this option.

`POST /virtual_cross_connects` — Required: `network_id`, `region_code`, `cloud_provider`, `cloud_provider_region`, `bgp_asn`, `primary_cloud_account_id`

Optional: `bandwidth_mbps` (number), `created_at` (string), `id` (uuid), `name` (string), `primary_bgp_key` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

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

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects/coverage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects/coverage"
```

Returns: `available_bandwidth` (array[number]), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `location` (object), `record_type` (string)

## Retrieve a Virtual Cross Connect

Returns the details of a single virtual cross connect by its identifier.

`GET /virtual_cross_connects/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.  Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has been accepted.

`PATCH /virtual_cross_connects/{id}`

Optional: `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/virtual_cross_connects/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a Virtual Cross Connect

Deletes the specified virtual cross connect from your account.

`DELETE /virtual_cross_connects/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/virtual_cross_connects/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `bandwidth_mbps` (number), `bgp_asn` (number), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `created_at` (string), `id` (uuid), `name` (string), `network_id` (uuid), `primary_bgp_key` (string), `primary_cloud_account_id` (string), `primary_cloud_ip` (string), `primary_enabled` (boolean), `primary_routing_announcement` (boolean), `primary_telnyx_ip` (string), `record_type` (string), `region` (object), `region_code` (string), `secondary_bgp_key` (string), `secondary_cloud_account_id` (string), `secondary_cloud_ip` (string), `secondary_enabled` (boolean), `secondary_routing_announcement` (boolean), `secondary_telnyx_ip` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.  This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects_coverage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/virtual_cross_connects_coverage"
```

Returns: `available_bandwidth` (array[number]), `cloud_provider` (enum: aws, azure, gce), `cloud_provider_region` (string), `location` (object), `record_type` (string)

## List all WireGuard Interfaces

Returns a paginated list of the WireGuard interfaces on your account, with support for filtering.

`GET /wireguard_interfaces`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_interfaces"
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Create a WireGuard Interface

Create a new WireGuard Interface. Current limitation of 10 interfaces per user can be created.

`POST /wireguard_interfaces` — Required: `network_id`, `region_code`

Optional: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `public_key` (string), `record_type` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

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

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Retrieve a WireGuard Interfaces

Returns the details of a single WireGuard interface by its identifier.

`GET /wireguard_interfaces/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_interfaces/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## Delete a WireGuard Interface

Deletes the specified WireGuard interface from its network.

`DELETE /wireguard_interfaces/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireguard_interfaces/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `enable_sip_trunking` (boolean), `endpoint` (string), `id` (uuid), `name` (string), `network_id` (uuid), `public_key` (string), `record_type` (string), `region` (object), `region_code` (string), `status` (enum: created, provisioning, provisioned, deleting), `updated_at` (string)

## List all WireGuard Peers

Returns a paginated list of your WireGuard peers, with support for filtering.

`GET /wireguard_peers`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_peers"
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Create a WireGuard Peer

Create a new WireGuard Peer. Current limitation of 5 peers per interface can be created.

`POST /wireguard_peers` — Required: `wireguard_interface_id`

Optional: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string)

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

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Retrieve the WireGuard Peer

Returns the details of a single WireGuard peer by its identifier.

`GET /wireguard_peers/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Update the WireGuard Peer

Updates the specified WireGuard peer and returns the updated peer.

`PATCH /wireguard_peers/{id}`

Optional: `public_key` (string)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Delete the WireGuard Peer

Deletes the specified WireGuard peer from its interface.

`DELETE /wireguard_peers/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Returns: `created_at` (string), `id` (uuid), `last_seen` (string), `private_key` (string), `public_key` (string), `record_type` (string), `updated_at` (string), `wireguard_interface_id` (uuid)

## Retrieve Wireguard config template for Peer

`GET /wireguard_peers/{id}/config`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireguard_peers/6a09cdc3-8948-47f0-aa62-74ac943d6c58/config"
```
