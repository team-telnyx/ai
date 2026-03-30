# WireGuard Networking

> Create private mesh networks and expose services to the internet via Telnyx WireGuard infrastructure.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- WireGuard installed on your machine

**Install WireGuard:**
```bash
# macOS
brew install wireguard-tools

# Ubuntu/Debian
sudo apt install wireguard

# Windows
# Download from https://www.wireguard.com/install/
```

## Quick Start

```bash
# 1. Create a network
curl -X POST "https://api.telnyx.com/v2/networks" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-network"}'

# 2. Create WireGuard interface (gateway)
curl -X POST "https://api.telnyx.com/v2/wireguard_interfaces" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "network_id": "network-id",
    "region_code": "ashburn-va"
  }'

# 3. Create a peer (your machine)
curl -X POST "https://api.telnyx.com/v2/wireguard_peers" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "wireguard_interface_id": "interface-id",
    "name": "my-laptop"
  }'

# 4. Get peer config and apply locally
curl "https://api.telnyx.com/v2/wireguard_peers/{peer_id}/config" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## API Reference

### Create Network

**`POST /v2/networks`**

```bash
curl -X POST "https://api.telnyx.com/v2/networks" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-network"}'
```

**Response:**

```json
{
  "data": {
    "id": "network-uuid",
    "name": "my-network",
    "record_type": "network"
  }
}
```

### List Regions

**`GET /v2/network_coverage`**

```bash
curl "https://api.telnyx.com/v2/network_coverage?filter[available_services][contains]=cloud_vpn" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Common regions:**

| Region | Code | Location |
|--------|------|----------|
| US East | `ashburn-va` | Ashburn, VA |
| US Central | `chicago-il` | Chicago, IL |
| EU | `frankfurt-de` | Frankfurt, DE |
| EU | `amsterdam-nl` | Amsterdam, NL |

### Create WireGuard Interface

**`POST /v2/wireguard_interfaces`**

Creates a WireGuard gateway. Cost: $10/month.

```bash
curl -X POST "https://api.telnyx.com/v2/wireguard_interfaces" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "network_id": "network-id",
    "name": "my-gateway",
    "region_code": "ashburn-va"
  }'
```

**Response:**

```json
{
  "data": {
    "id": "interface-uuid",
    "endpoint": "64.16.1.2:51820",
    "public_key": "abc123...",
    "server_ip_address": "172.27.0.1/24"
  }
}
```

### Create Peer

**`POST /v2/wireguard_peers`**

```bash
curl -X POST "https://api.telnyx.com/v2/wireguard_peers" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "wireguard_interface_id": "interface-id",
    "name": "my-laptop"
  }'
```

**Response includes private key — save it!**

### Get Peer Config

**`GET /v2/wireguard_peers/{peer_id}/config`**

Returns a WireGuard config file you can save and use.

```bash
curl "https://api.telnyx.com/v2/wireguard_peers/{peer_id}/config" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### List Peers

**`GET /v2/wireguard_peers`**

```bash
curl "https://api.telnyx.com/v2/wireguard_peers?filter[wireguard_interface_id]=interface-id" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Add Internet Gateway (Public IP)

**`POST /v2/public_internet_gateways`**

Get a public IP for your network. Cost: $50/month.

```bash
curl -X POST "https://api.telnyx.com/v2/public_internet_gateways" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "network_id": "network-id",
    "name": "my-public-gateway",
    "region_code": "ashburn-va"
  }'
```

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Create network
network = requests.post(
    f"{BASE_URL}/networks",
    headers=headers,
    json={"name": "my-mesh"}
).json()
network_id = network["data"]["id"]

# Create WireGuard gateway
wg = requests.post(
    f"{BASE_URL}/wireguard_interfaces",
    headers=headers,
    json={
        "network_id": network_id,
        "region_code": "ashburn-va"
    }
).json()
wg_id = wg["data"]["id"]
endpoint = wg["data"]["endpoint"]
print(f"Gateway: {endpoint}")

# Create peer
peer = requests.post(
    f"{BASE_URL}/wireguard_peers",
    headers=headers,
    json={"wireguard_interface_id": wg_id, "name": "laptop"}
).json()
peer_id = peer["data"]["id"]

# Get config
config = requests.get(
    f"{BASE_URL}/wireguard_peers/{peer_id}/config",
    headers=headers
).text
print(config)
```

## TypeScript Examples

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Create network
const netRes = await fetch(`${BASE_URL}/networks`, {
  method: "POST",
  headers,
  body: JSON.stringify({ name: "my-mesh" }),
});
const { data: network } = await netRes.json();

// Create WireGuard interface
const wgRes = await fetch(`${BASE_URL}/wireguard_interfaces`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    network_id: network.id,
    region_code: "ashburn-va",
  }),
});
const { data: wg } = await wgRes.json();
console.log(`Gateway endpoint: ${wg.endpoint}`);

// Create peer
const peerRes = await fetch(`${BASE_URL}/wireguard_peers`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    wireguard_interface_id: wg.id,
    name: "my-laptop",
  }),
});
const { data: peer } = await peerRes.json();

// Get config
const configRes = await fetch(
  `${BASE_URL}/wireguard_peers/${peer.id}/config`,
  { headers }
);
const config = await configRes.text();
console.log(config);
```

## Applying Config Locally

```bash
# Save config to file
echo "$CONFIG" > /etc/wireguard/telnyx0.conf

# Bring up interface
sudo wg-quick up telnyx0

# Check status
sudo wg show

# Bring down
sudo wg-quick down telnyx0
```

## Exposing Ports

After adding an internet gateway, expose ports with iptables:

```bash
# Allow traffic on port 443
sudo iptables -A INPUT -i telnyx0 -p tcp --dport 443 -j ACCEPT

# View rules
sudo iptables -L -n
```

## Common Patterns

### Multi-Node Mesh

```python
# Create network and gateway once
network_id = create_network()
wg_id = create_wireguard_interface(network_id, "ashburn-va")

# Create peers for each machine
for name in ["laptop", "server", "raspberry-pi"]:
    peer = create_peer(wg_id, name)
    save_config(peer["id"], f"/tmp/{name}.conf")
```

### Expose Web Service

```bash
# After connecting to mesh with public IP
sudo iptables -A INPUT -i telnyx0 -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -i telnyx0 -p tcp --dport 80 -j ACCEPT

# Your service is now accessible at the public IP
```

## Pricing

| Component | Monthly Cost |
|-----------|--------------|
| Network | Free |
| WireGuard Gateway | $10 |
| Internet Gateway | $50 |
| Peers | Free |
| Traffic | Free (beta) |

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `Network not found` | 404 | Verify network ID |
| `Region not available` | 400 | Check available regions |
| `Interface still provisioning` | 400 | Wait 5-10 minutes |

## Resources

- [WireGuard Documentation](https://www.wireguard.com/)
- [Networking API Reference](https://developers.telnyx.com/docs/api/v2/networking)
