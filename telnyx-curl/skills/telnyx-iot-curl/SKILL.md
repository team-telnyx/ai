---
name: telnyx-iot-curl
description: >-
  IoT SIM cards, eSIMs, data plans, and wireless connectivity for M2M solutions.
metadata:
  author: telnyx
  product: iot
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Iot - curl

## Core Workflow

### Prerequisites

1. Purchase SIM cards (physical SIM, eSIM chip MFF2, or eSIM OTA)
2. For physical SIMs: register via 10-digit code or CSV batch upload
3. Insert SIM and configure APN: Name='Telnyx', APN='data00.telnyx' (leave all other fields blank)
4. Enable data roaming on device and reboot

### Steps

1. **Order SIMs**
2. **Register SIMs**
3. **Activate SIM**
4. **Monitor usage**

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Traditional device, replaceable SIM | Physical IoT SIM Card |
| Embedded/soldered into device | eSIM Chip (MFF2) |
| Software-only, no physical card | eSIM (OTA) |

### Common mistakes

- NEVER modify APN fields beyond Name and APN — causes connectivity failures
- NEVER forget to enable data roaming on the device — no connectivity without it
- NEVER skip device reboot after APN configuration changes
- For fleet deployments: use CSV batch registration, not one-by-one

**Related skills**: telnyx-networking-curl

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

## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.  
If `sim_card_group_id` is provided, the eSIMs will be associated with that group. Otherwise, the default group for the current user will be used.  

`POST /actions/purchase/esims`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | integer | Yes | The amount of eSIMs to be purchased. |
| `tags` | array[string] | No | Searchable tags associated with the SIM cards |
| `sim_card_group_id` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM cards will be set after being succes... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "amount": 10
}' \
  "https://api.telnyx.com/v2/actions/purchase/esims"
```

Key response fields: `.data.id, .data.status, .data.type`

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.  
If `sim_card_group_id` is provided, the SIM cards will be associated with that group. Otherwise, the default group for the current user will be used.  

`POST /actions/register/sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registration_codes` | array[string] | Yes |  |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `sim_card_group_id` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM card will be set after being success... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "registration_codes": [
    "0000000001",
    "0000000002",
    "0000000003"
  ]
}' \
  "https://api.telnyx.com/v2/actions/register/sim_cards"
```

Key response fields: `.data.id, .data.status, .data.type`

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`GET /sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (current_billing_period_consumed_data.amount, -current_billing_period_consumed_data.amount) | No | Sorts SIM cards by the given field. |
| `filter` | object | No | Consolidated filter parameter for SIM cards (deepObject styl... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_cards?include_sim_card_group=True&filter[sim_card_group_id]=47a1c2b0-cc7b-4ab1-bb98-b33fb0fc61b9&sort=-current_billing_period_consumed_data.amount"
```

Key response fields: `.data.id, .data.status, .data.type`

## Get SIM card

Returns the details regarding a specific SIM card.

`GET /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `include_sim_card_group` | boolean | No | It includes the associated SIM card group object in the resp... |
| `include_pin_puk_codes` | boolean | No | When set to true, includes the PIN and PUK codes in the resp... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58?include_sim_card_group=True"
```

Key response fields: `.data.id, .data.status, .data.type`

## Create a SIM card order

Creates a new order for SIM cards.

`POST /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address_id` | string (UUID) | Yes | Uniquely identifies the address for the order. |
| `quantity` | integer | Yes | The amount of SIM cards to order. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "address_id": "1293384261075731499",
      "quantity": 23,
      "sim_card_group_id": "550e8400-e29b-41d4-a716-446655440000"
  }' \
  "https://api.telnyx.com/v2/sim_card_orders"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a SIM card group

Creates a new SIM card group object

`POST /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the SIM card group. |
| `data_limit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "My Test Group"
}' \
  "https://api.telnyx.com/v2/sim_card_groups"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions. A bulk SIM card action contains details about a collection of individual SIM card actions.

`GET /bulk_sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[action_type]` | enum (bulk_disable_voice, bulk_enable_voice, bulk_set_public_ips) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bulk_sim_card_actions?filter[action_type]=bulk_set_public_ips"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action. A bulk SIM card action contains details about a collection of individual SIM card actions.

`GET /bulk_sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bulk_sim_card_actions/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List OTA updates

`GET /ota_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for OTA updates (deepObject st... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ota_updates"
```

Key response fields: `.data.id, .data.status, .data.type`

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`GET /ota_updates/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ota_updates/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.type`

## List SIM card actions

This API lists a paginated collection of SIM card actions. It enables exploring a collection of existing asynchronous operations using specific filters.

`GET /sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card actions (deepObje... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_actions"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`GET /sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_actions/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications. It enables exploring the collection using specific filters.

`GET /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[sim_card_id]` | string (UUID) | No | A valid SIM card ID. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_data_usage_notifications?filter[sim_card_id]=47a1c2b0-cc7b-4ab1-bb98-b33fb0fc61b9"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`POST /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_id` | string (UUID) | Yes | The identification UUID of the related SIM card resource. |
| `threshold` | object | Yes | Data usage threshold that will trigger the notification. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "sim_card_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
  "threshold": {}
}' \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`GET /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_data_usage_notifications/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`PATCH /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `sim_card_id` | string (UUID) | No | The identification UUID of the related SIM card resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`DELETE /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_data_usage_notifications/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions. It allows to explore a collection of existing asynchronous operation using specific filters.

`GET /sim_card_group_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[status]` | enum (in-progress, completed, failed) | No | Filter by a specific status of the resource's lifecycle. |
| `filter[type]` | enum (set_private_wireless_gateway, remove_private_wireless_gateway, set_wireless_blocklist, remove_wireless_blocklist) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_group_actions?filter[sim_card_group_id]=47a1c2b0-cc7b-4ab1-bb98-b33fb0fc61b9&filter[status]=in-progress&filter[type]=set_private_wireless_gateway"
```

Key response fields: `.data.id, .data.status, .data.type`

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`GET /sim_card_group_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_group_actions/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.type`

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`GET /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | A valid SIM card group name. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_groups?filter[name]=My Test Group&filter[private_wireless_gateway_id]=7606c6d3-ff7c-49c1-943d-68879e9d584d&filter[wireless_blocklist_id]=0f3f490e-c4d3-4cf5-838a-9970f10ee259"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get SIM card group

Returns the details regarding a specific SIM card group

`GET /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `include_iccids` | boolean | No | It includes a list of associated ICCIDs. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58?include_iccids=True"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a SIM card group

Updates a SIM card group

`PATCH /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `name` | string | No | A user friendly name for the SIM card group. |
| `data_limit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a SIM card group

Permanently deletes a SIM card group

`DELETE /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic handled by Telnyx's default mobile network configuration.

`POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/remove_private_wireless_gateway"
```

Key response fields: `.data.id, .data.status, .data.type`

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/remove_wireless_blocklist"
```

Key response fields: `.data.id, .data.status, .data.type`

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic controlled by the associated Private Wireless Gateway. This operation will also imply that new SIM cards assigned to a group will inherit its network definitions.

`POST /sim_card_groups/{id}/actions/set_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `private_wireless_gateway_id` | string (UUID) | Yes | The identification of the related Private Wireless Gateway r... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "private_wireless_gateway_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58"
}' \
  "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/set_private_wireless_gateway"
```

Key response fields: `.data.id, .data.status, .data.type`

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/set_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wireless_blocklist_id` | string (UUID) | Yes | The identification of the related Wireless Blocklist resourc... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "wireless_blocklist_id": "6a09cdc3-8948-47f0-aa62-74ac943d6c58"
}' \
  "https://api.telnyx.com/v2/sim_card_groups/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/set_wireless_blocklist"
```

Key response fields: `.data.id, .data.status, .data.type`

## Preview SIM card orders

Preview SIM card order purchases.

`POST /sim_card_order_preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quantity` | integer | Yes | The amount of SIM cards that the user would like to purchase... |
| `address_id` | string (UUID) | Yes | Uniquely identifies the address for the order. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "quantity": 21,
  "address_id": "1293384261075731499"
}' \
  "https://api.telnyx.com/v2/sim_card_order_preview"
```

Key response fields: `.data.quantity, .data.record_type, .data.shipping_cost`

## Get all SIM card orders

Get all SIM card orders according to filters.

`GET /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card orders (deepObjec... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_orders"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a single SIM card order

Get a single SIM card order by its ID.

`GET /sim_card_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_card_orders/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Request bulk disabling voice on SIM cards.

This API triggers an asynchronous operation to disable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`POST /sim_cards/actions/bulk_disable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_group_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "sim_card_group_id": "6b14e151-8493-4fa1-8664-1cc4e6d14158"
}' \
  "https://api.telnyx.com/v2/sim_cards/actions/bulk_disable_voice"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Request bulk enabling voice on SIM cards.

This API triggers an asynchronous operation to enable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`POST /sim_cards/actions/bulk_enable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_group_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "sim_card_group_id": "6b14e151-8493-4fa1-8664-1cc4e6d14158"
}' \
  "https://api.telnyx.com/v2/sim_cards/actions/bulk_enable_voice"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards. 
For each SIM Card a SIM Card Action will be generated. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`POST /sim_cards/actions/bulk_set_public_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_ids` | array[object] | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "sim_card_ids": [
    "6b14e151-8493-4fa1-8664-1cc4e6d14158"
  ]
}' \
  "https://api.telnyx.com/v2/sim_cards/actions/bulk_set_public_ips"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`POST /sim_cards/actions/validate_registration_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registration_codes` | array[string] | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/actions/validate_registration_codes"
```

Key response fields: `.data.invalid_detail, .data.record_type, .data.registration_code`

## Update a SIM card

Updates SIM card data

`PATCH /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `type` | enum (physical, esim) | No | The type of SIM card |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `sim_card_group_id` | string (UUID) | No | The group SIMCardGroup identification. |
| ... | | | +25 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.type`

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged. The SIM card won't be able to connect to the network after the deletion is completed, thus making it impossible to consume data. 
Transitioning to the disabled state may take a period of time.

`DELETE /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `report_lost` | boolean | No | Enables deletion of disabled eSIMs that can't be uninstalled... |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.type`

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the disabled state may take a period of time.

`POST /sim_cards/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/disable"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data. 
To enable a SIM card, it must be associated with a SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the enabled state may take a period of time.

`POST /sim_cards/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/enable"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`POST /sim_cards/{id}/actions/remove_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/remove_public_ip"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action.

`POST /sim_cards/{id}/actions/set_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `region_code` | string | No | The code of the region where the public IP should be assigne... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/set_public_ip"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data. 
To set a SIM card to standby, it must be associated with SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the standby state may take a period of time.

`POST /sim_cards/{id}/actions/set_standby`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/actions/set_standby"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get activation code for an eSIM

It returns the activation code for an eSIM.  
 This API is only available for eSIMs. If the given SIM is a physical SIM card, or has already been installed, an error will be returned.

`GET /sim_cards/{id}/activation_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/activation_code"
```

Key response fields: `.data.activation_code, .data.record_type`

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`GET /sim_cards/{id}/device_details`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/device_details"
```

Key response fields: `.data.brand_name, .data.device_type, .data.imei`

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`GET /sim_cards/{id}/public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/public_ip"
```

Key response fields: `.data.type, .data.created_at, .data.updated_at`

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`GET /sim_cards/{id}/wireless_connectivity_logs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/sim_cards/6a09cdc3-8948-47f0-aa62-74ac943d6c58/wireless_connectivity_logs"
```

Key response fields: `.data.id, .data.state, .data.created_at`

## List Migration Source coverage

`GET /storage/migration_source_coverage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/migration_source_coverage"
```

Key response fields: `.data.provider, .data.source_region`

## List all Migration Sources

`GET /storage/migration_sources`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/migration_sources"
```

Key response fields: `.data.id, .data.bucket_name, .data.provider`

## Create a Migration Source

Create a source from which data can be migrated from.

`POST /storage/migration_sources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx) | Yes | Cloud provider from which to migrate data. |
| `provider_auth` | object | Yes |  |
| `bucket_name` | string | Yes | Bucket name to migrate the data from. |
| `id` | string (UUID) | No | Unique identifier for the data migration source. |
| `source_region` | string | No | For intra-Telnyx buckets migration, specify the source bucke... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "provider": "aws",
  "provider_auth": {},
  "bucket_name": "my-bucket"
}' \
  "https://api.telnyx.com/v2/storage/migration_sources"
```

Key response fields: `.data.id, .data.bucket_name, .data.provider`

## Get a Migration Source

`GET /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/migration_sources/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.bucket_name, .data.provider`

## Delete a Migration Source

`DELETE /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/storage/migration_sources/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.bucket_name, .data.provider`

## List all Migrations

`GET /storage/migrations`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/migrations"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage. Currently, only S3 is supported.

`POST /storage/migrations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_id` | string (UUID) | Yes | ID of the Migration Source from which to migrate data. |
| `target_bucket_name` | string | Yes | Bucket name to migrate the data into. |
| `target_region` | string | Yes | Telnyx Cloud Storage region to migrate the data to. |
| `status` | enum (pending, checking, migrating, complete, error, ...) | No | Status of the migration. |
| `id` | string (UUID) | No | Unique identifier for the data migration. |
| `refresh` | boolean | No | If true, will continue to poll the source bucket to ensure n... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_bucket_name": "my-target-bucket",
  "target_region": "us-central-1"
}' \
  "https://api.telnyx.com/v2/storage/migrations"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a Migration

`GET /storage/migrations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/migrations/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Stop a Migration

`POST /storage/migrations/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/storage/migrations/550e8400-e29b-41d4-a716-446655440000/actions/stop"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List Mobile Voice Connections

`GET /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |
| `filter[connection_name][contains]` | string | No | Filter by connection name containing the given string |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/v2/mobile_voice_connections"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a Mobile Voice Connection

`POST /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No |  |
| `webhook_api_version` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/v2/mobile_voice_connections"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a Mobile Voice Connection

`GET /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/v2/mobile_voice_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a Mobile Voice Connection

`PATCH /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |
| `tags` | array[string] | No |  |
| `webhook_api_version` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/v2/mobile_voice_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete a Mobile Voice Connection

`DELETE /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/v2/mobile_voice_connections/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get all wireless regions

Retrieve all wireless regions for the given product.

`GET /wireless/regions`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless/regions?product=public_ips"
```

Key response fields: `.data.name, .data.updated_at, .data.code`

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`GET /wireless_blocklist_values`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless_blocklist_values?type=country"
```

Key response fields: `.data.data, .data.meta`

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`GET /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Wireless Blocklist. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless_blocklists?filter[name]=my private gateway&filter[type]=country&filter[values]=US,CA"
```

Key response fields: `.data.id, .data.name, .data.type`

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`POST /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the Wireless Blocklist. |
| `type` | enum (country, mcc, plmn) | Yes | The type of wireless blocklist. |
| `values` | array[object] | Yes | Values to block. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "My Wireless Blocklist",
  "type": "country",
  "values": [
    "CA",
    "US"
  ]
}' \
  "https://api.telnyx.com/v2/wireless_blocklists"
```

Key response fields: `.data.id, .data.name, .data.type`

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`PATCH /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (country, mcc, plmn) | No | The type of wireless blocklist. |
| `name` | string | No | The name of the Wireless Blocklist. |
| `values` | array[object] | No | Values to block. |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/wireless_blocklists"
```

Key response fields: `.data.id, .data.name, .data.type`

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`GET /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/wireless_blocklists/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.type`

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`DELETE /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/wireless_blocklists/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.name, .data.type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
