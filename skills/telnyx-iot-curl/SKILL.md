---
name: telnyx-iot-curl
description: "Purchase, register, activate, and monitor IoT SIM cards and eSIMs via the Telnyx REST API. Create SIM card groups, set data limits, configure wireless blocklists, manage public IPs, and track connectivity logs. Use when provisioning IoT/M2M devices, managing cellular connectivity, ordering physical or eSIM cards, or monitoring SIM data usage with curl."
metadata:
  author: telnyx
  product: iot
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx IoT - curl

Manage IoT SIM cards, eSIMs, data plans, and wireless connectivity via the Telnyx REST API.

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

## Quick Start: Provision IoT SIMs

1. **Create a SIM card group** to organize and apply shared settings
2. **Purchase eSIMs** or **register physical SIM cards** to the group
3. **Enable SIM cards** to connect them to the network
4. **Monitor data usage** via connectivity logs or data usage notifications

## Important Notes

- **Pagination**: List endpoints use `page[number]` and `page[size]` query parameters. Check `meta.total_pages` in the response.
- **Async operations**: Enable/disable/standby actions are asynchronous — check status via SIM card actions endpoints.

## SIM Card Groups

### Create a Group

`POST /sim_card_groups` — Required: `name`

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My IoT Fleet", "data_limit": {"value": "2048.0", "unit": "MB"}}' \
  "https://api.telnyx.com/v2/sim_card_groups"
```

### List / Get / Update / Delete Groups

```bash
# List all groups
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_groups"

# Get specific group
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_groups/{id}"

# Update group
curl -X PATCH -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Fleet"}' \
  "https://api.telnyx.com/v2/sim_card_groups/{id}"

# Delete group
curl -X DELETE -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_groups/{id}"
```

## Purchase eSIMs

`POST /actions/purchase/esims` — Required: `amount`

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "sim_card_group_id": "{group_id}"}' \
  "https://api.telnyx.com/v2/actions/purchase/esims"
```

## Register Physical SIM Cards

`POST /actions/register/sim_cards` — Required: `registration_codes`

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"registration_codes": ["0000000001", "0000000002"], "sim_card_group_id": "{group_id}"}' \
  "https://api.telnyx.com/v2/actions/register/sim_cards"
```

### Validate Registration Codes

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"registration_codes": ["0000000001"]}' \
  "https://api.telnyx.com/v2/sim_cards/actions/validate_registration_codes"
```

## Manage SIM Cards

### List / Get / Update / Delete SIM Cards

```bash
# List all SIM cards (with sorting and filtering)
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards?include_sim_card_group=True&filter[sim_card_group_id]={group_id}"

# Get SIM card details
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/{id}"

# Update SIM card
curl -X PATCH -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["production"]}' \
  "https://api.telnyx.com/v2/sim_cards/{id}"

# Delete (decommission) SIM card
curl -X DELETE -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/{id}"
```

### Enable / Disable / Standby

```bash
# Enable (connect to network)
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/{id}/actions/enable"

# Disable (disconnect from network)
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/{id}/actions/disable"

# Set to standby
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/{id}/actions/set_standby"
```

### Public IP Management

```bash
# Assign public IP
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/{id}/actions/set_public_ip"

# Remove public IP
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/{id}/actions/remove_public_ip"
```

### Bulk Voice Operations

```bash
# Bulk enable voice for a group
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sim_card_group_id": "{group_id}"}' \
  "https://api.telnyx.com/v2/sim_cards/actions/bulk_enable_voice"

# Bulk disable voice for a group
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sim_card_group_id": "{group_id}"}' \
  "https://api.telnyx.com/v2/sim_cards/actions/bulk_disable_voice"

# Bulk set public IPs
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sim_card_ids": ["{sim_id_1}", "{sim_id_2}"]}' \
  "https://api.telnyx.com/v2/sim_cards/actions/bulk_set_public_ips"
```

See [references/api-details.md](references/api-details.md) for full response schemas, data usage notifications, SIM card orders, OTA updates, wireless blocklists, and additional endpoints.
