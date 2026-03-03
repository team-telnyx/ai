---
name: telnyx-networking-python
description: >-
  Configure private networks, WireGuard VPN gateways, internet gateways, and
  virtual cross connects. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: networking
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Networking - Python

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

## List all clusters

`GET /ai/clusters`

```python
page = client.ai.clusters.list()
page = page.data[0]
print(page.task_id)
```

## Compute new clusters

Starts a background task to compute how the data in an [embedded storage bucket](https://developers.telnyx.com/api-reference/embeddings/embed-documents) is clustered.

`POST /ai/clusters` — Required: `bucket`

Optional: `files` (array[string]), `min_cluster_size` (integer), `min_subcluster_size` (integer), `prefix` (string)

```python
response = client.ai.clusters.compute(
    bucket="bucket",
)
print(response.data)
```

## Fetch a cluster

`GET /ai/clusters/{task_id}`

```python
cluster = client.ai.clusters.retrieve(
    task_id="task_id",
)
print(cluster.data)
```

## Delete a cluster

`DELETE /ai/clusters/{task_id}`

```python
client.ai.clusters.delete(
    "task_id",
)
```

## Fetch a cluster visualization

`GET /ai/clusters/{task_id}/graph`

```python
response = client.ai.clusters.fetch_graph(
    task_id="task_id",
)
print(response)
content = response.read()
print(content)
```

## List Integrations

List all available integrations.

`GET /ai/integrations`

```python
integrations = client.ai.integrations.list()
print(integrations.data)
```

## List User Integrations

List user setup integrations

`GET /ai/integrations/connections`

```python
connections = client.ai.integrations.connections.list()
print(connections.data)
```

## Get User Integration connection By Id

Get user setup integrations

`GET /ai/integrations/connections/{user_connection_id}`

```python
connection = client.ai.integrations.connections.retrieve(
    "user_connection_id",
)
print(connection.data)
```

## Delete Integration Connection

Delete a specific integration connection.

`DELETE /ai/integrations/connections/{user_connection_id}`

```python
client.ai.integrations.connections.delete(
    "user_connection_id",
)
```

## List Integration By Id

Retrieve integration details

`GET /ai/integrations/{integration_id}`

```python
integration = client.ai.integrations.retrieve(
    "integration_id",
)
print(integration.id)
```

## List all Global IP Allowed Ports

`GET /global_ip_allowed_ports`

```python
global_ip_allowed_ports = client.global_ip_allowed_ports.list()
print(global_ip_allowed_ports.data)
```

## Global IP Assignment Health Check Metrics

`GET /global_ip_assignment_health`

```python
global_ip_assignment_health = client.global_ip_assignment_health.retrieve()
print(global_ip_assignment_health.data)
```

## List all Global IP assignments

List all Global IP assignments.

`GET /global_ip_assignments`

```python
page = client.global_ip_assignments.list()
page = page.data[0]
print(page.id)
```

## Create a Global IP assignment

Create a Global IP assignment.

`POST /global_ip_assignments`

```python
global_ip_assignment = client.global_ip_assignments.create()
print(global_ip_assignment.data)
```

## Retrieve a Global IP

Retrieve a Global IP assignment.

`GET /global_ip_assignments/{id}`

```python
global_ip_assignment = client.global_ip_assignments.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_assignment.data)
```

## Update a Global IP assignment

Update a Global IP assignment.

`PATCH /global_ip_assignments/{id}`

```python
global_ip_assignment = client.global_ip_assignments.update(
    global_ip_assignment_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    global_ip_assignment_update_request={},
)
print(global_ip_assignment.data)
```

## Delete a Global IP assignment

Delete a Global IP assignment.

`DELETE /global_ip_assignments/{id}`

```python
global_ip_assignment = client.global_ip_assignments.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_assignment.data)
```

## Global IP Assignment Usage Metrics

`GET /global_ip_assignments_usage`

```python
global_ip_assignments_usage = client.global_ip_assignments_usage.retrieve()
print(global_ip_assignments_usage.data)
```

## List all Global IP Health check types

List all Global IP Health check types.

`GET /global_ip_health_check_types`

```python
global_ip_health_check_types = client.global_ip_health_check_types.list()
print(global_ip_health_check_types.data)
```

## List all Global IP health checks

List all Global IP health checks.

`GET /global_ip_health_checks`

```python
page = client.global_ip_health_checks.list()
page = page.data[0]
print(page)
```

## Create a Global IP health check

Create a Global IP health check.

`POST /global_ip_health_checks`

```python
global_ip_health_check = client.global_ip_health_checks.create()
print(global_ip_health_check.data)
```

## Retrieve a Global IP health check

Retrieve a Global IP health check.

`GET /global_ip_health_checks/{id}`

```python
global_ip_health_check = client.global_ip_health_checks.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_health_check.data)
```

## Delete a Global IP health check

Delete a Global IP health check.

`DELETE /global_ip_health_checks/{id}`

```python
global_ip_health_check = client.global_ip_health_checks.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip_health_check.data)
```

## Global IP Latency Metrics

`GET /global_ip_latency`

```python
global_ip_latency = client.global_ip_latency.retrieve()
print(global_ip_latency.data)
```

## List all Global IP Protocols

`GET /global_ip_protocols`

```python
global_ip_protocols = client.global_ip_protocols.list()
print(global_ip_protocols.data)
```

## Global IP Usage Metrics

`GET /global_ip_usage`

```python
global_ip_usage = client.global_ip_usage.retrieve()
print(global_ip_usage.data)
```

## List all Global IPs

List all Global IPs.

`GET /global_ips`

```python
page = client.global_ips.list()
page = page.data[0]
print(page)
```

## Create a Global IP

Create a Global IP.

`POST /global_ips`

```python
global_ip = client.global_ips.create()
print(global_ip.data)
```

## Retrieve a Global IP

Retrieve a Global IP.

`GET /global_ips/{id}`

```python
global_ip = client.global_ips.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip.data)
```

## Delete a Global IP

Delete a Global IP.

`DELETE /global_ips/{id}`

```python
global_ip = client.global_ips.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(global_ip.data)
```

## List all Networks

List all Networks.

`GET /networks`

```python
page = client.networks.list()
page = page.data[0]
print(page)
```

## Create a Network

Create a new Network.

`POST /networks`

```python
network = client.networks.create(
    name="test network",
)
print(network.data)
```

## Retrieve a Network

Retrieve a Network.

`GET /networks/{id}`

```python
network = client.networks.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(network.data)
```

## Update a Network

Update a Network.

`PATCH /networks/{id}`

```python
network = client.networks.update(
    network_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    name="test network",
)
print(network.data)
```

## Delete a Network

Delete a Network.

`DELETE /networks/{id}`

```python
network = client.networks.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(network.data)
```

## Get Default Gateway status.

`GET /networks/{id}/default_gateway`

```python
default_gateway = client.networks.default_gateway.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(default_gateway.data)
```

## Create Default Gateway.

`POST /networks/{id}/default_gateway`

```python
default_gateway = client.networks.default_gateway.create(
    network_identifier="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(default_gateway.data)
```

## Delete Default Gateway.

`DELETE /networks/{id}/default_gateway`

```python
default_gateway = client.networks.default_gateway.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(default_gateway.data)
```

## List all Interfaces for a Network.

`GET /networks/{id}/network_interfaces`

```python
page = client.networks.list_interfaces(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
page = page.data[0]
print(page)
```

## Get all Private Wireless Gateways

Get all Private Wireless Gateways belonging to the user.

`GET /private_wireless_gateways`

```python
page = client.private_wireless_gateways.list()
page = page.data[0]
print(page.id)
```

## Create a Private Wireless Gateway

Asynchronously create a Private Wireless Gateway for SIM cards for a previously created network.

`POST /private_wireless_gateways` — Required: `network_id`, `name`

Optional: `region_code` (string)

```python
private_wireless_gateway = client.private_wireless_gateways.create(
    name="My private wireless gateway",
    network_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(private_wireless_gateway.data)
```

## Get a Private Wireless Gateway

Retrieve information about a Private Wireless Gateway.

`GET /private_wireless_gateways/{id}`

```python
private_wireless_gateway = client.private_wireless_gateways.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(private_wireless_gateway.data)
```

## Delete a Private Wireless Gateway

Deletes the Private Wireless Gateway.

`DELETE /private_wireless_gateways/{id}`

```python
private_wireless_gateway = client.private_wireless_gateways.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(private_wireless_gateway.data)
```

## List all Public Internet Gateways

List all Public Internet Gateways.

`GET /public_internet_gateways`

```python
page = client.public_internet_gateways.list()
page = page.data[0]
print(page)
```

## Create a Public Internet Gateway

Create a new Public Internet Gateway.

`POST /public_internet_gateways`

```python
public_internet_gateway = client.public_internet_gateways.create()
print(public_internet_gateway.data)
```

## Retrieve a Public Internet Gateway

Retrieve a Public Internet Gateway.

`GET /public_internet_gateways/{id}`

```python
public_internet_gateway = client.public_internet_gateways.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(public_internet_gateway.data)
```

## Delete a Public Internet Gateway

Delete a Public Internet Gateway.

`DELETE /public_internet_gateways/{id}`

```python
public_internet_gateway = client.public_internet_gateways.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(public_internet_gateway.data)
```

## List all Regions

List all regions and the interfaces that region supports

`GET /regions`

```python
regions = client.regions.list()
print(regions.data)
```

## List all Virtual Cross Connects

List all Virtual Cross Connects.

`GET /virtual_cross_connects`

```python
page = client.virtual_cross_connects.list()
page = page.data[0]
print(page)
```

## Create a Virtual Cross Connect

Create a new Virtual Cross Connect.<br /><br />For AWS and GCE, you have the option of creating the primary connection first and the secondary connection later.

`POST /virtual_cross_connects`

```python
virtual_cross_connect = client.virtual_cross_connects.create(
    region_code="ashburn-va",
)
print(virtual_cross_connect.data)
```

## Retrieve a Virtual Cross Connect

Retrieve a Virtual Cross Connect.

`GET /virtual_cross_connects/{id}`

```python
virtual_cross_connect = client.virtual_cross_connects.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(virtual_cross_connect.data)
```

## Update the Virtual Cross Connect

Update the Virtual Cross Connect.<br /><br />Cloud IPs can only be patched during the `created` state, as GCE will only inform you of your generated IP once the pending connection requested has bee...

`PATCH /virtual_cross_connects/{id}`

```python
virtual_cross_connect = client.virtual_cross_connects.update(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(virtual_cross_connect.data)
```

## Delete a Virtual Cross Connect

Delete a Virtual Cross Connect.

`DELETE /virtual_cross_connects/{id}`

```python
virtual_cross_connect = client.virtual_cross_connects.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(virtual_cross_connect.data)
```

## List Virtual Cross Connect Cloud Coverage

List Virtual Cross Connects Cloud Coverage.<br /><br />This endpoint shows which cloud regions are available for the `location_code` your Virtual Cross Connect will be provisioned in.

`GET /virtual_cross_connects_coverage`

```python
page = client.virtual_cross_connects_coverage.list()
page = page.data[0]
print(page.available_bandwidth)
```

## List all WireGuard Interfaces

List all WireGuard Interfaces.

`GET /wireguard_interfaces`

```python
page = client.wireguard_interfaces.list()
page = page.data[0]
print(page)
```

## Create a WireGuard Interface

Create a new WireGuard Interface.

`POST /wireguard_interfaces`

```python
wireguard_interface = client.wireguard_interfaces.create(
    region_code="ashburn-va",
)
print(wireguard_interface.data)
```

## Retrieve a WireGuard Interfaces

Retrieve a WireGuard Interfaces.

`GET /wireguard_interfaces/{id}`

```python
wireguard_interface = client.wireguard_interfaces.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_interface.data)
```

## Delete a WireGuard Interface

Delete a WireGuard Interface.

`DELETE /wireguard_interfaces/{id}`

```python
wireguard_interface = client.wireguard_interfaces.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_interface.data)
```

## List all WireGuard Peers

List all WireGuard peers.

`GET /wireguard_peers`

```python
page = client.wireguard_peers.list()
page = page.data[0]
print(page)
```

## Create a WireGuard Peer

Create a new WireGuard Peer.

`POST /wireguard_peers`

```python
wireguard_peer = client.wireguard_peers.create(
    wireguard_interface_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

## Retrieve the WireGuard Peer

Retrieve the WireGuard peer.

`GET /wireguard_peers/{id}`

```python
wireguard_peer = client.wireguard_peers.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

## Update the WireGuard Peer

Update the WireGuard peer.

`PATCH /wireguard_peers/{id}`

Optional: `public_key` (string)

```python
wireguard_peer = client.wireguard_peers.update(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

## Delete the WireGuard Peer

Delete the WireGuard peer.

`DELETE /wireguard_peers/{id}`

```python
wireguard_peer = client.wireguard_peers.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireguard_peer.data)
```

## Retrieve Wireguard config template for Peer

`GET /wireguard_peers/{id}/config`

```python
response = client.wireguard_peers.retrieve_config(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response)
```
