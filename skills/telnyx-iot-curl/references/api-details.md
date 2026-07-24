# Telnyx IoT API Details - curl

## SIM Card Response Schema

All SIM card endpoints return these fields in the `data` object:

| Field | Type |
|-------|------|
| `actions_in_progress` | boolean |
| `authorized_imeis` | array \| null |
| `created_at` | string |
| `current_billing_period_consumed_data` | object |
| `data_limit` | object |
| `eid` | string \| null |
| `esim_installation_status` | enum: released, disabled |
| `iccid` | string |
| `id` | uuid |
| `imsi` | string |
| `msisdn` | string |
| `record_type` | string |
| `sim_card_group_id` | uuid |
| `status` | object |
| `tags` | array[string] |
| `type` | enum: physical, esim |
| `updated_at` | string |
| `version` | string |
| `voice_enabled` | boolean |

Individual SIM card GET also returns: `current_device_location` (object), `current_imei` (string), `current_mcc` (string), `current_mnc` (string), `ipv4` (string), `ipv6` (string), `live_data_session` (enum), `pin_puk_codes` (object).

## SIM Card Group Response Schema

| Field | Type |
|-------|------|
| `consumed_data` | object |
| `created_at` | string |
| `data_limit` | object |
| `default` | boolean |
| `id` | uuid |
| `name` | string |
| `private_wireless_gateway_id` | uuid |
| `record_type` | string |
| `sim_card_count` | integer |
| `updated_at` | string |
| `wireless_blocklist_id` | uuid |

## SIM Card Data Usage Notifications

CRUD operations for monitoring SIM card data consumption thresholds.

### List Notifications

`GET /sim_card_data_usage_notifications?filter[sim_card_id]={sim_card_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications?filter[sim_card_id]=47a1c2b0-cc7b-4ab1-bb98-b33fb0fc61b9"
```

### Create Notification

`POST /sim_card_data_usage_notifications` — Required: `sim_card_id`, `threshold`

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sim_card_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58", "threshold": {}}' \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications"
```

### Get / Update / Delete Notification

```bash
# Get
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications/{id}"

# Update
curl -X PATCH -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications/{id}"

# Delete
curl -X DELETE -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications/{id}"
```

## SIM Card Group Actions

Async operations on SIM card groups (private wireless gateways, wireless blocklists).

### List / Get Group Actions

```bash
# List
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_group_actions?filter[sim_card_group_id]={group_id}"

# Get details
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_group_actions/{id}"
```

### Private Wireless Gateway Management

```bash
# Assign private wireless gateway to group
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"private_wireless_gateway_id": "{gateway_id}"}' \
  "https://api.telnyx.com/v2/sim_card_groups/{id}/actions/set_private_wireless_gateway"

# Remove private wireless gateway from group
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_groups/{id}/actions/remove_private_wireless_gateway"
```

### Wireless Blocklist Management

```bash
# Assign wireless blocklist to group
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"wireless_blocklist_id": "{blocklist_id}"}' \
  "https://api.telnyx.com/v2/sim_card_groups/{id}/actions/set_wireless_blocklist"

# Remove wireless blocklist from group
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_groups/{id}/actions/remove_wireless_blocklist"
```

## SIM Card Orders

### Preview / List / Create / Get Orders

```bash
# Preview order cost
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 21, "address_id": "1293384261075731499"}' \
  "https://api.telnyx.com/v2/sim_card_order_preview"

# List orders
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_orders"

# Create order
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address_id": "1293384261075731499", "quantity": 23}' \
  "https://api.telnyx.com/v2/sim_card_orders"

# Get order
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_orders/{id}"
```

## OTA Updates

Over the Air updates for SIM card network preferences.

```bash
# List OTA updates
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ota_updates"

# Get OTA update details
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ota_updates/{id}"
```

## Wireless Blocklists

Prevent SIMs from connecting to certain networks by country, MCC, or PLMN.

```bash
# List blocklists
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireless_blocklists"

# Create blocklist
curl -X POST -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Block US/CA", "type": "country", "values": ["CA", "US"]}' \
  "https://api.telnyx.com/v2/wireless_blocklists"

# Get / Update / Delete blocklist
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless_blocklists/{id}"
curl -X PATCH -H "Authorization: Bearer $TELNYX_API_KEY" -H "Content-Type: application/json" "https://api.telnyx.com/v2/wireless_blocklists/{id}"
curl -X DELETE -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless_blocklists/{id}"

# Get possible blocklist values
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireless_blocklist_values?type=country"
```

## Wireless Regions

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireless/regions?product=public_ips"
```

## Bulk SIM Card Actions

### List / Get Bulk Actions

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/bulk_sim_card_actions"

curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/bulk_sim_card_actions/{id}"
```

### List / Get Individual SIM Card Actions

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_actions"

curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_actions/{id}"
```

## Additional SIM Card Endpoints

```bash
# Get eSIM activation code
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/{id}/activation_code"

# Get device details
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/{id}/device_details"

# Get public IP
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/{id}/public_ip"

# List wireless connectivity logs
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/{id}/wireless_connectivity_logs"
```
