# IoT Migration: Twilio Super SIM to Telnyx IoT SIM

Migrate from Twilio Super SIM to Telnyx IoT SIM for cellular IoT device connectivity.

## Table of Contents

- [Overview](#overview)
- [Key Differences](#key-differences)
- [Concept Mapping](#concept-mapping)
- [Step 1: Order SIM Cards](#step-1-order-sim-cards)
- [Step 2: Register and Activate SIMs](#step-2-register-and-activate-sims)
- [Step 3: Configure SIM Card Groups](#step-3-configure-sim-card-groups)
- [Step 4: Manage Network Preferences](#step-4-manage-network-preferences)
- [Step 5: Monitor Data Usage](#step-5-monitor-data-usage)
- [eSIM Support](#esim-support)
- [Private Wireless Gateway](#private-wireless-gateway)
- [APN Configuration](#apn-configuration)
- [SIM Lifecycle States](#sim-lifecycle-states)
- [API Endpoint Mapping](#api-endpoint-mapping)
- [Common Pitfalls](#common-pitfalls)

## Overview

Twilio Super SIM provides global cellular connectivity for IoT devices. Telnyx IoT SIM offers equivalent functionality with coverage in over 100 countries across 500+ networks, supporting 2G through 4G LTE and 25 CAT-M networks across North America and Europe.

Telnyx differentiates with **Private Wireless Gateways** — dedicated infrastructure that routes your IoT device traffic through a siloed, private network on Telnyx's MPLS backbone. This has no Twilio equivalent.

## Key Differences

1. **Private Wireless Gateway** — Telnyx offers dedicated, siloed infrastructure for IoT traffic. No equivalent in Twilio Super SIM.
2. **SIM Card Group model** — Twilio uses Fleets; Telnyx uses SIM Card Groups. Both manage sets of SIMs with shared configuration.
3. **Network preference control** — Telnyx gives you direct control over which mobile networks your SIMs prefer.
4. **Data limit enforcement** — Telnyx SIM Card Groups support data usage caps that automatically disable SIMs when exceeded (state: `data_limit_exceeded`).
5. **eSIM support** — Both platforms support eSIM. Telnyx provides an activation code API for eSIM provisioning.
6. **API authentication** — Twilio uses Basic Auth (SID:Token). Telnyx uses Bearer Token.

## Concept Mapping

| Twilio Super SIM Concept | Telnyx Equivalent | Notes |
|---|---|---|
| Fleet | SIM Card Group | Shared configuration for a set of SIMs |
| SIM Resource | SIM Card | Individual SIM management |
| SIM SID | SIM Card `id` (UUID) | Different ID format |
| ICCID | ICCID | Same — physical SIM identifier |
| Fleet Network Access Profile | Network Preferences | Per-group network configuration |
| Fleet Data Metering | SIM Card Group Data Limit | Set usage caps per group |
| SMS Commands | N/A | Telnyx IoT focuses on data connectivity |
| IP Commands | Private Wireless Gateway | More capable — full private networking |
| Super SIM eSIM | Telnyx eSIM | Activation code API available |
| `ready` / `active` / `inactive` | `registering` / `enabled` / `disabled` | Different state names |

## Step 1: Order SIM Cards

### Order Physical SIMs

Order SIM cards through the Telnyx Mission Control Portal or via API:

```bash
curl -X POST https://api.telnyx.com/v2/sim_card_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 100,
    "address_id": "YOUR_SHIPPING_ADDRESS_ID"
  }'
```

### Purchase eSIMs

```bash
curl -X POST https://api.telnyx.com/v2/actions/purchase/esims \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 10,
    "sim_card_group_id": "YOUR_SIM_GROUP_ID"
  }'
```

```python
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

# Purchase eSIMs
order = client.actions.purchase.create(
    amount=10,
    sim_card_group_id="YOUR_SIM_GROUP_ID"
)
```

## Step 2: Register and Activate SIMs

After receiving physical SIMs, register them with their ICCID codes, then enable them.

### Register SIMs

```bash
curl -X POST https://api.telnyx.com/v2/actions/register/sim_cards \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_codes": ["89011234567890123456", "89011234567890123457"],
    "sim_card_group_id": "YOUR_SIM_GROUP_ID"
  }'
```

```python
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

client.actions.register.create(
    registration_codes=["89011234567890123456", "89011234567890123457"],
    sim_card_group_id="YOUR_SIM_GROUP_ID"
)
```

### Enable a SIM Card

Once registered, enable the SIM to connect it to the network:

```bash
curl -X POST "https://api.telnyx.com/v2/sim_cards/$SIM_CARD_ID/actions/enable" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Important:** A SIM must be associated with a SIM Card Group before it can be enabled. The SIM Card Group defines data limits, network preferences, and other shared configuration.

### Disable a SIM Card

```bash
curl -X POST "https://api.telnyx.com/v2/sim_cards/$SIM_CARD_ID/actions/disable" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Step 3: Configure SIM Card Groups

SIM Card Groups are the Telnyx equivalent of Twilio Fleets. They define shared configuration for sets of SIMs.

### Create a SIM Card Group

```bash
curl -X POST https://api.telnyx.com/v2/sim_card_groups \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fleet-north-america",
    "data_limit": {
      "amount": 5.0,
      "unit": "GB"
    }
  }'
```

```python
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

group = client.sim_card_groups.create(
    name="fleet-north-america",
    data_limit={"amount": 5.0, "unit": "GB"}
)
print(group.id)
```

### Update a SIM Card Group

```bash
curl -X PATCH "https://api.telnyx.com/v2/sim_card_groups/$GROUP_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "data_limit": {
      "amount": 10.0,
      "unit": "GB"
    }
  }'
```

**SIM Card Group settings:**

| Setting | Description |
|---|---|
| `name` | Group name for identification |
| `data_limit` | Data usage cap (amount + unit: MB/GB). SIMs exceeding this transition to `data_limit_exceeded` state |
| `private_wireless_gateway_id` | Associate with a Private Wireless Gateway |
| Network preferences | Configure preferred mobile networks |

## Step 4: Manage Network Preferences

Telnyx gives you control over which mobile networks your SIMs prefer. This is configured at the SIM Card Group level.

```bash
# Set network preferences for a SIM card group
curl -X PUT "https://api.telnyx.com/v2/sim_card_groups/$GROUP_ID/actions/set_network_preferences" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_operator_networks_preferences": [
      {
        "mobile_operator_network_id": "OPERATOR_ID",
        "priority": 1
      }
    ]
  }'
```

**Comparison with Twilio:**

| Aspect | Twilio Super SIM | Telnyx IoT SIM |
|---|---|---|
| Network control | Network Access Profile on Fleet | Network Preferences on SIM Card Group |
| Granularity | Per-Fleet | Per-SIM Card Group |
| Priority setting | Ordered list | Explicit priority values |
| Network technologies | 2G-5G | 2G-4G LTE, 25 CAT-M networks |

## Step 5: Monitor Data Usage

### Get SIM Card Details (includes usage)

```bash
curl -X GET "https://api.telnyx.com/v2/sim_cards/$SIM_CARD_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Get Device Details

```bash
curl -X GET "https://api.telnyx.com/v2/sim_cards/$SIM_CARD_ID/device_details" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### List SIM Card Actions (activity log)

```bash
curl -X GET "https://api.telnyx.com/v2/sim_card_actions?filter[sim_card_id]=$SIM_CARD_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

```python
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

sim = client.sim_cards.retrieve("SIM_CARD_ID")
print(f"ICCID: {sim.iccid}")
print(f"Status: {sim.status}")
```

## eSIM Support

Telnyx supports eSIM for IoT deployments that require remote SIM provisioning without physical SIM cards.

### Purchase eSIMs

See [Step 1: Order SIM Cards](#step-1-order-sim-cards) for the purchase endpoint.

### Get eSIM Activation Code

After purchasing, retrieve the activation code to provision the eSIM on a device:

```bash
curl -X GET "https://api.telnyx.com/v2/sim_cards/$SIM_CARD_ID/activation_code" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

The activation code is used by the device's eUICC to download the eSIM profile.

**eSIM comparison:**

| Aspect | Twilio Super SIM | Telnyx IoT SIM |
|---|---|---|
| eSIM support | Yes | Yes |
| Activation method | QR code or activation code | Activation code via API |
| Bulk provisioning | Via API | Via API (`/actions/purchase/esims`) |
| Profile management | Twilio Console | Mission Control Portal + API |

## Private Wireless Gateway

**This is a Telnyx-only feature with no Twilio equivalent.**

A Private Wireless Gateway (PWG) provides dedicated infrastructure that routes your IoT device traffic through a completely siloed private network. The PWG connects to a virtual routing and forwarding (VRF) defined network on top of Telnyx's MPLS backbone.

Benefits:
- **Complete traffic isolation** — Your device data never shares infrastructure with other customers
- **Private IP addressing** — Assign private IPs to your SIM cards
- **Edge connectivity** — Deploy devices directly to the edge of your corporate network
- **Enhanced security** — No public internet exposure for device-to-server communication

```bash
# Create a Private Wireless Gateway
curl -X POST https://api.telnyx.com/v2/private_wireless_gateways \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-iot-gateway",
    "network_id": "YOUR_NETWORK_ID"
  }'
```

Then associate the gateway with a SIM Card Group to route that group's traffic through the private gateway.

## APN Configuration

Configure the Access Point Name (APN) on your IoT devices to connect through Telnyx:

| APN Setting | Value |
|---|---|
| **Standard APN** | `data.telnyx` |
| **Private gateway (static IP)** | `data.net` |
| **Private gateway (dynamic IP)** | `data00.telnyx` |

For devices using Private Wireless Gateways, the APN determines IP assignment behavior:
- `data.net` — Static IP assignment
- `data00.telnyx` — Dynamic IP assignment

**Twilio APN comparison:**

| Aspect | Twilio Super SIM | Telnyx IoT SIM |
|---|---|---|
| Standard APN | `super` | `data.telnyx` |
| Private networking APN | N/A | `data.net` or `data00.telnyx` |
| Configuration | Device-side | Device-side |

## SIM Lifecycle States

| Telnyx State | Description | Twilio Equivalent |
|---|---|---|
| `registering` | SIM registration in progress | `new` |
| `enabling` | SIM activation in progress | N/A (transitional) |
| `enabled` | SIM is active and connected | `active` |
| `disabling` | SIM deactivation in progress | N/A (transitional) |
| `disabled` | SIM is paused (no data, reduced cost) | `inactive` |
| `data_limit_exceeded` | SIM exceeded group data limit | N/A (Telnyx-specific) |
| `setting_standby` | Transitioning to standby | N/A (transitional) |
| `standby` | Low-power standby mode | N/A (Telnyx-specific) |

## API Endpoint Mapping

| Operation | Twilio Endpoint | Telnyx Endpoint |
|---|---|---|
| List SIMs | `GET /v1/Sims` | `GET /v2/sim_cards` |
| Get SIM | `GET /v1/Sims/{SID}` | `GET /v2/sim_cards/{id}` |
| Update SIM | `POST /v1/Sims/{SID}` | `PATCH /v2/sim_cards/{id}` |
| Activate SIM | `POST /v1/Sims/{SID} (status=active)` | `POST /v2/sim_cards/{id}/actions/enable` |
| Deactivate SIM | `POST /v1/Sims/{SID} (status=inactive)` | `POST /v2/sim_cards/{id}/actions/disable` |
| List Fleets/Groups | `GET /v1/Fleets` | `GET /v2/sim_card_groups` |
| Create Fleet/Group | `POST /v1/Fleets` | `POST /v2/sim_card_groups` |
| Update Fleet/Group | `POST /v1/Fleets/{SID}` | `PATCH /v2/sim_card_groups/{id}` |
| Register SIMs | N/A | `POST /v2/actions/register/sim_cards` |
| Purchase eSIMs | N/A | `POST /v2/actions/purchase/esims` |
| Get eSIM activation code | N/A | `GET /v2/sim_cards/{id}/activation_code` |
| Get device details | N/A | `GET /v2/sim_cards/{id}/device_details` |
| List SIM actions | N/A | `GET /v2/sim_card_actions` |
| Set network preferences | `POST /Fleets/{SID}/NetworkAccessProfiles` | `PUT /v2/sim_card_groups/{id}/actions/set_network_preferences` |
| Create private gateway | N/A | `POST /v2/private_wireless_gateways` |
| Order SIMs | Console only | `POST /v2/sim_card_orders` |
| Bulk update SIMs | N/A | `POST /v2/sim_cards/actions/bulk_update` |

## Common Pitfalls

1. **SIM must belong to a group before enabling** — Unlike Twilio where you assign a SIM to a Fleet after activation, Telnyx requires a SIM Card Group association before you can enable the SIM.

2. **Data limit enforcement is automatic** — When a SIM exceeds its group's data limit, it transitions to `data_limit_exceeded` and stops passing data. Increase the limit or reset it to restore connectivity.

3. **APN must be configured on the device** — The APN `data.telnyx` must be set on each IoT device. Devices migrated from Twilio still have the `super` APN configured. Update the APN before or during migration.

4. **Registration is a separate step** — Physical SIMs must be registered with their ICCID before they can be enabled. This is an explicit API call, not automatic on first use.

5. **Private Wireless Gateway requires planning** — If you need private networking (Telnyx-only feature), set up the PWG and associate it with your SIM Card Group before enabling SIMs. Changing the gateway later requires SIM reconfiguration.

6. **Network preference changes take time** — Updating network preferences on a SIM Card Group does not immediately switch active SIMs to the new network. Devices may need to be power-cycled or will switch on next network reselection.

7. **eSIM activation codes are one-time use** — Each activation code can only be used once. If provisioning fails, you may need to purchase a replacement eSIM.
