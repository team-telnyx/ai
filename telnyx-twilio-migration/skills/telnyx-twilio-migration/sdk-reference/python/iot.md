<!-- SDK reference: telnyx-iot-python -->

# Telnyx Iot - Python

## Core Workflow

### Prerequisites

1. Purchase SIM cards (physical SIM, eSIM chip MFF2, or eSIM OTA)
2. For physical SIMs: register via 10-digit code or CSV batch upload
3. Insert SIM and configure APN: Name='Telnyx', APN='data00.telnyx' (leave all other fields blank)
4. Enable data roaming on device and reboot

### Steps

1. **Order SIMs**: `client.sim_cards.list() or purchase via portal`
2. **Register SIMs**: `client.sim_cards.register(sim_card_id=..., registration_code=...)`
3. **Activate SIM**: `client.sim_cards.activate(sim_card_id=...)`
4. **Monitor usage**: `client.sim_cards.retrieve(sim_card_id=...)`

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

**Related skills**: telnyx-networking-python

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
    result = client.sim_cards.list(params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.  
If `sim_card_group_id` is provided, the eSIMs will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.actions.purchase.create()` — `POST /actions/purchase/esims`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | integer | Yes | The amount of eSIMs to be purchased. |
| `tags` | array[string] | No | Searchable tags associated with the SIM cards |
| `sim_card_group_id` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM cards will be set after being succes... |
| ... | | | +2 optional params in the API Details section below |

```python
purchase = client.actions.purchase.create(
    amount=10,
)
print(purchase.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.  
If `sim_card_group_id` is provided, the SIM cards will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.actions.register.create()` — `POST /actions/register/sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registration_codes` | array[string] | Yes |  |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `sim_card_group_id` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM card will be set after being success... |

```python
register = client.actions.register.create(
    registration_codes=["0000000001", "0000000002", "0000000003"],
)
print(register.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`client.sim_cards.list()` — `GET /sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (current_billing_period_consumed_data.amount, -current_billing_period_consumed_data.amount) | No | Sorts SIM cards by the given field. |
| `filter` | object | No | Consolidated filter parameter for SIM cards (deepObject styl... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |
| ... | | | +2 optional params in the API Details section below |

```python
page = client.sim_cards.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card

Returns the details regarding a specific SIM card.

`client.sim_cards.retrieve()` — `GET /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `include_sim_card_group` | boolean | No | It includes the associated SIM card group object in the resp... |
| `include_pin_puk_codes` | boolean | No | When set to true, includes the PIN and PUK codes in the resp... |

```python
sim_card = client.sim_cards.retrieve(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Create a SIM card order

Creates a new order for SIM cards.

`client.sim_card_orders.create()` — `POST /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address_id` | string (UUID) | Yes | Uniquely identifies the address for the order. |
| `quantity` | integer | Yes | The amount of SIM cards to order. |

```python
sim_card_order = client.sim_card_orders.create(
    address_id="1293384261075731499",
    quantity=23,
    sim_card_group_id="550e8400-e29b-41d4-a716-446655440000",
)
print(sim_card_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a SIM card group

Creates a new SIM card group object

`client.sim_card_groups.create()` — `POST /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the SIM card group. |
| `data_limit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```python
sim_card_group = client.sim_card_groups.create(
    name="My Test Group",
)
print(sim_card_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.bulk_sim_card_actions.list()` — `GET /bulk_sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[action_type]` | enum (bulk_disable_voice, bulk_enable_voice, bulk_set_public_ips) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```python
page = client.bulk_sim_card_actions.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.bulk_sim_card_actions.retrieve()` — `GET /bulk_sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
bulk_sim_card_action = client.bulk_sim_card_actions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(bulk_sim_card_action.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List OTA updates

`client.ota_updates.list()` — `GET /ota_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for OTA updates (deepObject st... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```python
page = client.ota_updates.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`client.ota_updates.retrieve()` — `GET /ota_updates/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
ota_update = client.ota_updates.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(ota_update.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List SIM card actions

This API lists a paginated collection of SIM card actions. It enables exploring a collection of existing asynchronous operations using specific filters.

`client.sim_cards.actions.list()` — `GET /sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card actions (deepObje... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```python
page = client.sim_cards.actions.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`client.sim_cards.actions.retrieve()` — `GET /sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
action = client.sim_cards.actions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(action.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications. It enables exploring the collection using specific filters.

`client.sim_card_data_usage_notifications.list()` — `GET /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[sim_card_id]` | string (UUID) | No | A valid SIM card ID. |

```python
page = client.sim_card_data_usage_notifications.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`client.sim_card_data_usage_notifications.create()` — `POST /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_id` | string (UUID) | Yes | The identification UUID of the related SIM card resource. |
| `threshold` | object | Yes | Data usage threshold that will trigger the notification. |

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.create(
    sim_card_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    threshold={},
)
print(sim_card_data_usage_notification.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`client.sim_card_data_usage_notifications.retrieve()` — `GET /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_data_usage_notification.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`client.sim_card_data_usage_notifications.update()` — `PATCH /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `sim_card_id` | string (UUID) | No | The identification UUID of the related SIM card resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `record_type` | string | No |  |
| ... | | | +3 optional params in the API Details section below |

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.update(
    sim_card_data_usage_notification_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_data_usage_notification.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`client.sim_card_data_usage_notifications.delete()` — `DELETE /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_data_usage_notification.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions. It allows to explore a collection of existing asynchronous operation using specific filters.

`client.sim_card_groups.actions.list()` — `GET /sim_card_group_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[status]` | enum (in-progress, completed, failed) | No | Filter by a specific status of the resource's lifecycle. |
| `filter[type]` | enum (set_private_wireless_gateway, remove_private_wireless_gateway, set_wireless_blocklist, remove_wireless_blocklist) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| ... | | | +2 optional params in the API Details section below |

```python
page = client.sim_card_groups.actions.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`client.sim_card_groups.actions.retrieve()` — `GET /sim_card_group_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
action = client.sim_card_groups.actions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(action.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`client.sim_card_groups.list()` — `GET /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | A valid SIM card group name. |
| ... | | | +2 optional params in the API Details section below |

```python
page = client.sim_card_groups.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get SIM card group

Returns the details regarding a specific SIM card group

`client.sim_card_groups.retrieve()` — `GET /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `include_iccids` | boolean | No | It includes a list of associated ICCIDs. |

```python
sim_card_group = client.sim_card_groups.retrieve(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a SIM card group

Updates a SIM card group

`client.sim_card_groups.update()` — `PATCH /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `name` | string | No | A user friendly name for the SIM card group. |
| `data_limit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```python
sim_card_group = client.sim_card_groups.update(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a SIM card group

Permanently deletes a SIM card group

`client.sim_card_groups.delete()` — `DELETE /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```python
sim_card_group = client.sim_card_groups.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic handled by Telnyx's default mobile network configuration.

`client.sim_card_groups.actions.remove_private_wireless_gateway()` — `POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```python
response = client.sim_card_groups.actions.remove_private_wireless_gateway(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`client.sim_card_groups.actions.remove_wireless_blocklist()` — `POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```python
response = client.sim_card_groups.actions.remove_wireless_blocklist(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic controlled by the associated Private Wireless Gateway. This operation will also imply that new SIM cards assigned to a group will inherit its network definitions.

`client.sim_card_groups.actions.set_private_wireless_gateway()` — `POST /sim_card_groups/{id}/actions/set_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `private_wireless_gateway_id` | string (UUID) | Yes | The identification of the related Private Wireless Gateway r... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```python
response = client.sim_card_groups.actions.set_private_wireless_gateway(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    private_wireless_gateway_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`client.sim_card_groups.actions.set_wireless_blocklist()` — `POST /sim_card_groups/{id}/actions/set_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wireless_blocklist_id` | string (UUID) | Yes | The identification of the related Wireless Blocklist resourc... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```python
response = client.sim_card_groups.actions.set_wireless_blocklist(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    wireless_blocklist_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Preview SIM card orders

Preview SIM card order purchases.

`client.sim_card_order_preview.preview()` — `POST /sim_card_order_preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quantity` | integer | Yes | The amount of SIM cards that the user would like to purchase... |
| `address_id` | string (UUID) | Yes | Uniquely identifies the address for the order. |

```python
response = client.sim_card_order_preview.preview(
    address_id="1293384261075731499",
    quantity=21,
)
print(response.data)
```

Key response fields: `response.data.quantity, response.data.record_type, response.data.shipping_cost`

## Get all SIM card orders

Get all SIM card orders according to filters.

`client.sim_card_orders.list()` — `GET /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card orders (deepObjec... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```python
page = client.sim_card_orders.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single SIM card order

Get a single SIM card order by its ID.

`client.sim_card_orders.retrieve()` — `GET /sim_card_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
sim_card_order = client.sim_card_orders.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request bulk disabling voice on SIM cards.

This API triggers an asynchronous operation to disable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.sim_cards.actions.bulk_disable_voice()` — `POST /sim_cards/actions/bulk_disable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_group_id` | string (UUID) | Yes |  |

```python
response = client.sim_cards.actions.bulk_disable_voice(
    sim_card_group_id="6b14e151-8493-4fa1-8664-1cc4e6d14158",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk enabling voice on SIM cards.

This API triggers an asynchronous operation to enable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.sim_cards.actions.bulk_enable_voice()` — `POST /sim_cards/actions/bulk_enable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_group_id` | string (UUID) | Yes |  |

```python
response = client.sim_cards.actions.bulk_enable_voice(
    sim_card_group_id="6b14e151-8493-4fa1-8664-1cc4e6d14158",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards. 
For each SIM Card a SIM Card Action will be generated. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.sim_cards.actions.bulk_set_public_ips()` — `POST /sim_cards/actions/bulk_set_public_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sim_card_ids` | array[object] | Yes |  |

```python
response = client.sim_cards.actions.bulk_set_public_ips(
    sim_card_ids=["6b14e151-8493-4fa1-8664-1cc4e6d14158"],
)
print(response.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`client.sim_cards.actions.validate_registration_codes()` — `POST /sim_cards/actions/validate_registration_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registration_codes` | array[string] | No |  |

```python
response = client.sim_cards.actions.validate_registration_codes()
print(response.data)
```

Key response fields: `response.data.invalid_detail, response.data.record_type, response.data.registration_code`

## Update a SIM card

Updates SIM card data

`client.sim_cards.update()` — `PATCH /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `type_` | enum (physical, esim) | No | The type of SIM card |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `sim_card_group_id` | string (UUID) | No | The group SIMCardGroup identification. |
| ... | | | +25 optional params in the API Details section below |

```python
sim_card = client.sim_cards.update(
    sim_card_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged. The SIM card won't be able to connect to the network after the deletion is completed, thus making it impossible to consume data. 
Transitioning to the disabled state may take a period of time.

`client.sim_cards.delete()` — `DELETE /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `report_lost` | boolean | No | Enables deletion of disabled eSIMs that can't be uninstalled... |

```python
sim_card = client.sim_cards.delete(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card.data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the disabled state may take a period of time.

`client.sim_cards.actions.disable()` — `POST /sim_cards/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.actions.disable(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data. 
To enable a SIM card, it must be associated with a SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the enabled state may take a period of time.

`client.sim_cards.actions.enable()` — `POST /sim_cards/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.actions.enable(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.sim_cards.actions.remove_public_ip()` — `POST /sim_cards/{id}/actions/remove_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.actions.remove_public_ip(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action.

`client.sim_cards.actions.set_public_ip()` — `POST /sim_cards/{id}/actions/set_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `region_code` | string | No | The code of the region where the public IP should be assigne... |

```python
response = client.sim_cards.actions.set_public_ip(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data. 
To set a SIM card to standby, it must be associated with SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the standby state may take a period of time.

`client.sim_cards.actions.set_standby()` — `POST /sim_cards/{id}/actions/set_standby`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.actions.set_standby(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get activation code for an eSIM

It returns the activation code for an eSIM.  
 This API is only available for eSIMs. If the given SIM is a physical SIM card, or has already been installed, an error will be returned.

`client.sim_cards.get_activation_code()` — `GET /sim_cards/{id}/activation_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.get_activation_code(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.activation_code, response.data.record_type`

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`client.sim_cards.get_device_details()` — `GET /sim_cards/{id}/device_details`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.get_device_details(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.brand_name, response.data.device_type, response.data.imei`

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`client.sim_cards.get_public_ip()` — `GET /sim_cards/{id}/public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```python
response = client.sim_cards.get_public_ip(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

Key response fields: `response.data.type, response.data.created_at, response.data.updated_at`

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`client.sim_cards.list_wireless_connectivity_logs()` — `GET /sim_cards/{id}/wireless_connectivity_logs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```python
page = client.sim_cards.list_wireless_connectivity_logs(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.state, response.data.created_at`

## List Migration Source coverage

`client.storage.list_migration_source_coverage()` — `GET /storage/migration_source_coverage`

```python
response = client.storage.list_migration_source_coverage()
print(response.data)
```

Key response fields: `response.data.provider, response.data.source_region`

## List all Migration Sources

`client.storage.migration_sources.list()` — `GET /storage/migration_sources`

```python
migration_sources = client.storage.migration_sources.list()
print(migration_sources.data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Create a Migration Source

Create a source from which data can be migrated from.

`client.storage.migration_sources.create()` — `POST /storage/migration_sources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx) | Yes | Cloud provider from which to migrate data. |
| `provider_auth` | object | Yes |  |
| `bucket_name` | string | Yes | Bucket name to migrate the data from. |
| `id` | string (UUID) | No | Unique identifier for the data migration source. |
| `source_region` | string | No | For intra-Telnyx buckets migration, specify the source bucke... |

```python
migration_source = client.storage.migration_sources.create(
    bucket_name="my-bucket",
    provider="aws",
    provider_auth={},
)
print(migration_source.data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Get a Migration Source

`client.storage.migration_sources.retrieve()` — `GET /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```python
migration_source = client.storage.migration_sources.retrieve(
    "",
)
print(migration_source.data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Delete a Migration Source

`client.storage.migration_sources.delete()` — `DELETE /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```python
migration_source = client.storage.migration_sources.delete(
    "",
)
print(migration_source.data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## List all Migrations

`client.storage.migrations.list()` — `GET /storage/migrations`

```python
migrations = client.storage.migrations.list()
print(migrations.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage. Currently, only S3 is supported.

`client.storage.migrations.create()` — `POST /storage/migrations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_id` | string (UUID) | Yes | ID of the Migration Source from which to migrate data. |
| `target_bucket_name` | string | Yes | Bucket name to migrate the data into. |
| `target_region` | string | Yes | Telnyx Cloud Storage region to migrate the data to. |
| `status` | enum (pending, checking, migrating, complete, error, ...) | No | Status of the migration. |
| `id` | string (UUID) | No | Unique identifier for the data migration. |
| `refresh` | boolean | No | If true, will continue to poll the source bucket to ensure n... |
| ... | | | +6 optional params in the API Details section below |

```python
migration = client.storage.migrations.create(
    source_id="550e8400-e29b-41d4-a716-446655440000",
    target_bucket_name="my-target-bucket",
    target_region="us-central-1",
)
print(migration.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Migration

`client.storage.migrations.retrieve()` — `GET /storage/migrations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```python
migration = client.storage.migrations.retrieve(
    "",
)
print(migration.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Stop a Migration

`client.storage.migrations.actions.stop()` — `POST /storage/migrations/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```python
response = client.storage.migrations.actions.stop(
    "",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Mobile Voice Connections

`client.mobile_voice_connections.list()` — `GET /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |
| `filter[connection_name][contains]` | string | No | Filter by connection name containing the given string |
| ... | | | +1 optional params in the API Details section below |

```python
page = client.mobile_voice_connections.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Mobile Voice Connection

`client.mobile_voice_connections.create()` — `POST /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No |  |
| `webhook_api_version` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in the API Details section below |

```python
mobile_voice_connection = client.mobile_voice_connections.create()
print(mobile_voice_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Mobile Voice Connection

`client.mobile_voice_connections.retrieve()` — `GET /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```python
mobile_voice_connection = client.mobile_voice_connections.retrieve(
    "id",
)
print(mobile_voice_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Mobile Voice Connection

`client.mobile_voice_connections.update()` — `PATCH /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |
| `tags` | array[string] | No |  |
| `webhook_api_version` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in the API Details section below |

```python
mobile_voice_connection = client.mobile_voice_connections.update(
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(mobile_voice_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Mobile Voice Connection

`client.mobile_voice_connections.delete()` — `DELETE /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```python
mobile_voice_connection = client.mobile_voice_connections.delete(
    "id",
)
print(mobile_voice_connection.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get all wireless regions

Retrieve all wireless regions for the given product.

`client.wireless.retrieve_regions()` — `GET /wireless/regions`

```python
response = client.wireless.retrieve_regions(
    product="public_ips",
)
print(response.data)
```

Key response fields: `response.data.name, response.data.updated_at, response.data.code`

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`client.wireless_blocklist_values.list()` — `GET /wireless_blocklist_values`

```python
wireless_blocklist_values = client.wireless_blocklist_values.list(
    type="country",
)
print(wireless_blocklist_values.data)
```

Key response fields: `response.data.data, response.data.meta`

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`client.wireless_blocklists.list()` — `GET /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Wireless Blocklist. |
| ... | | | +2 optional params in the API Details section below |

```python
page = client.wireless_blocklists.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`client.wireless_blocklists.create()` — `POST /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the Wireless Blocklist. |
| `type_` | enum (country, mcc, plmn) | Yes | The type of wireless blocklist. |
| `values` | array[object] | Yes | Values to block. |

```python
wireless_blocklist = client.wireless_blocklists.create(
    name="My Wireless Blocklist",
    type="country",
    values=["CA", "US"],
)
print(wireless_blocklist.data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`client.wireless_blocklists.update()` — `PATCH /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type_` | enum (country, mcc, plmn) | No | The type of wireless blocklist. |
| `name` | string | No | The name of the Wireless Blocklist. |
| `values` | array[object] | No | Values to block. |

```python
wireless_blocklist = client.wireless_blocklists.update()
print(wireless_blocklist.data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`client.wireless_blocklists.retrieve()` — `GET /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```python
wireless_blocklist = client.wireless_blocklists.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireless_blocklist.data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`client.wireless_blocklists.delete()` — `DELETE /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```python
wireless_blocklist = client.wireless_blocklists.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireless_blocklist.data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

---

# IoT (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Purchase eSIMs, Register SIM cards, Get all SIM cards

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
| `resources_with_in_progress_actions` | array[object] |
| `sim_card_group_id` | uuid |
| `status` | object |
| `tags` | array[string] |
| `type` | enum: physical, esim |
| `updated_at` | string |
| `version` | string |
| `voice_enabled` | boolean |

**Returned by:** List bulk SIM card actions, Get bulk SIM card action details

| Field | Type |
|-------|------|
| `action_type` | enum: bulk_disable_voice, bulk_enable_voice, bulk_set_public_ips |
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `settings` | object |
| `sim_card_actions_summary` | array[object] |
| `updated_at` | string |

**Returned by:** List OTA updates

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `sim_card_id` | uuid |
| `status` | enum: in-progress, completed, failed |
| `type` | enum: sim_card_network_preferences |
| `updated_at` | string |

**Returned by:** Get OTA update

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `settings` | object |
| `sim_card_id` | uuid |
| `status` | enum: in-progress, completed, failed |
| `type` | enum: sim_card_network_preferences |
| `updated_at` | string |

**Returned by:** List SIM card actions, Get SIM card action details, Request a SIM card disable, Request a SIM card enable, Request removing a SIM card public IP, Request setting a SIM card public IP, Request setting a SIM card to standby

| Field | Type |
|-------|------|
| `action_type` | enum: enable, enable_standby_sim_card, disable, set_standby |
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `settings` | object \| null |
| `sim_card_id` | uuid |
| `status` | object |
| `updated_at` | string |

**Returned by:** List SIM card data usage notifications, Create a new SIM card data usage notification, Get a single SIM card data usage notification, Updates information for a SIM Card Data Usage Notification, Delete SIM card data usage notifications

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `sim_card_id` | uuid |
| `threshold` | object |
| `updated_at` | string |

**Returned by:** List SIM card group actions, Get SIM card group action details, Request Private Wireless Gateway removal from SIM card group, Request Wireless Blocklist removal from SIM card group, Request Private Wireless Gateway assignment for SIM card group, Request Wireless Blocklist assignment for SIM card group

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `settings` | object |
| `sim_card_group_id` | uuid |
| `status` | enum: in-progress, completed, failed |
| `type` | enum: set_private_wireless_gateway, remove_private_wireless_gateway, set_wireless_blocklist, remove_wireless_blocklist |
| `updated_at` | string |

**Returned by:** Get all SIM card groups

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

**Returned by:** Create a SIM card group, Get SIM card group, Update a SIM card group, Delete a SIM card group

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
| `updated_at` | string |
| `wireless_blocklist_id` | uuid |

**Returned by:** Preview SIM card orders

| Field | Type |
|-------|------|
| `quantity` | integer |
| `record_type` | string |
| `shipping_cost` | object |
| `sim_cards_cost` | object |
| `total_cost` | object |

**Returned by:** Get all SIM card orders, Create a SIM card order, Get a single SIM card order

| Field | Type |
|-------|------|
| `cost` | object |
| `created_at` | string |
| `id` | uuid |
| `order_address` | object |
| `quantity` | integer |
| `record_type` | string |
| `status` | enum: pending, processing, ready_to_ship, shipped, delivered, canceled |
| `tracking_url` | uri |
| `updated_at` | string |

**Returned by:** Request bulk disabling voice on SIM cards., Request bulk enabling voice on SIM cards., Request bulk setting SIM card public IPs.

| Field | Type |
|-------|------|
| `action_type` | enum: bulk_disable_voice, bulk_enable_voice, bulk_set_public_ips |
| `created_at` | string |
| `id` | uuid |
| `record_type` | string |
| `settings` | object |
| `updated_at` | string |

**Returned by:** Validate SIM cards registration codes

| Field | Type |
|-------|------|
| `invalid_detail` | string \| null |
| `record_type` | string |
| `registration_code` | string |
| `valid` | boolean |

**Returned by:** Get SIM card, Update a SIM card, Deletes a SIM card

| Field | Type |
|-------|------|
| `actions_in_progress` | boolean |
| `authorized_imeis` | array \| null |
| `created_at` | string |
| `current_billing_period_consumed_data` | object |
| `current_device_location` | object |
| `current_imei` | string |
| `current_mcc` | string |
| `current_mnc` | string |
| `data_limit` | object |
| `eid` | string \| null |
| `esim_installation_status` | enum: released, disabled |
| `iccid` | string |
| `id` | uuid |
| `imsi` | string |
| `ipv4` | string |
| `ipv6` | string |
| `live_data_session` | enum: connected, disconnected, unknown |
| `msisdn` | string |
| `pin_puk_codes` | object |
| `record_type` | string |
| `resources_with_in_progress_actions` | array[object] |
| `sim_card_group_id` | uuid |
| `status` | object |
| `tags` | array[string] |
| `type` | enum: physical, esim |
| `updated_at` | string |
| `version` | string |
| `voice_enabled` | boolean |

**Returned by:** Get activation code for an eSIM

| Field | Type |
|-------|------|
| `activation_code` | string |
| `record_type` | string |

**Returned by:** Get SIM card device details

| Field | Type |
|-------|------|
| `brand_name` | string |
| `device_type` | string |
| `imei` | string |
| `model_name` | string |
| `operating_system` | string |
| `record_type` | string |

**Returned by:** Get SIM card public IP definition

| Field | Type |
|-------|------|
| `created_at` | string |
| `ip` | string |
| `record_type` | string |
| `region_code` | string |
| `sim_card_id` | uuid |
| `type` | enum: ipv4 |
| `updated_at` | string |

**Returned by:** List wireless connectivity logs

| Field | Type |
|-------|------|
| `apn` | string |
| `cell_id` | string |
| `created_at` | string |
| `id` | integer |
| `imei` | string |
| `imsi` | string |
| `ipv4` | string |
| `ipv6` | string |
| `last_seen` | string |
| `log_type` | enum: registration, data |
| `mobile_country_code` | string |
| `mobile_network_code` | string |
| `radio_access_technology` | string |
| `record_type` | string |
| `sim_card_id` | uuid |
| `start_time` | string |
| `state` | string |
| `stop_time` | string |

**Returned by:** List Migration Source coverage

| Field | Type |
|-------|------|
| `provider` | enum: aws |
| `source_region` | string |

**Returned by:** List all Migration Sources, Create a Migration Source, Get a Migration Source, Delete a Migration Source

| Field | Type |
|-------|------|
| `bucket_name` | string |
| `id` | string |
| `provider` | enum: aws, telnyx |
| `provider_auth` | object |
| `source_region` | string |

**Returned by:** List all Migrations, Create a Migration, Get a Migration, Stop a Migration

| Field | Type |
|-------|------|
| `bytes_migrated` | integer |
| `bytes_to_migrate` | integer |
| `created_at` | date-time |
| `eta` | date-time |
| `id` | string |
| `last_copy` | date-time |
| `refresh` | boolean |
| `source_id` | string |
| `speed` | integer |
| `status` | enum: pending, checking, migrating, complete, error, stopped |
| `target_bucket_name` | string |
| `target_region` | string |

**Returned by:** List Mobile Voice Connections, Create a Mobile Voice Connection, Retrieve a Mobile Voice Connection, Update a Mobile Voice Connection, Delete a Mobile Voice Connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `connection_name` | string |
| `created_at` | date-time |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | enum: mobile_voice_connection |
| `tags` | array[string] |
| `updated_at` | date-time |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | string \| null |
| `webhook_event_url` | string \| null |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** Get all wireless regions

| Field | Type |
|-------|------|
| `code` | string |
| `inserted_at` | date-time |
| `name` | string |
| `updated_at` | date-time |

**Returned by:** Get all possible wireless blocklist values

| Field | Type |
|-------|------|
| `data` | object |
| `meta` | object |

**Returned by:** Get all Wireless Blocklists, Create a Wireless Blocklist, Update a Wireless Blocklist, Get a Wireless Blocklist, Delete a Wireless Blocklist

| Field | Type |
|-------|------|
| `created_at` | string |
| `id` | uuid |
| `name` | string |
| `record_type` | string |
| `type` | enum: country, mcc, plmn |
| `updated_at` | string |
| `values` | array[object] |

## Optional Parameters

### Purchase eSIMs — `client.actions.purchase.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `sim_card_group_id` | string (UUID) | The group SIMCardGroup identification. |
| `tags` | array[string] | Searchable tags associated with the SIM cards |
| `product` | string | Type of product to be purchased, specify "whitelabel" to use a custom SPN |
| `whitelabel_name` | string | Service Provider Name (SPN) for the Whitelabel eSIM product. |
| `status` | enum (enabled, disabled, standby) | Status on which the SIM cards will be set after being successfully registered. |

### Register SIM cards — `client.actions.register.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `sim_card_group_id` | string (UUID) | The group SIMCardGroup identification. |
| `tags` | array[string] | Searchable tags associated with the SIM card |
| `status` | enum (enabled, disabled, standby) | Status on which the SIM card will be set after being successful registered. |

### Updates information for a SIM Card Data Usage Notification — `client.sim_card_data_usage_notifications.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `sim_card_id` | string (UUID) | The identification UUID of the related SIM card resource. |
| `record_type` | string |  |
| `threshold` | object | Data usage threshold that will trigger the notification. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Create a SIM card group — `client.sim_card_groups.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `data_limit` | object | Upper limit on the amount of data the SIM cards, within the group, can use. |

### Update a SIM card group — `client.sim_card_groups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | A user friendly name for the SIM card group. |
| `data_limit` | object | Upper limit on the amount of data the SIM cards, within the group, can use. |

### Validate SIM cards registration codes — `client.sim_cards.actions.validate_registration_codes()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `registration_codes` | array[string] |  |

### Update a SIM card — `client.sim_cards.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string |  |
| `status` | object |  |
| `type_` | enum (physical, esim) | The type of SIM card |
| `iccid` | string | The ICCID is the identifier of the specific SIM card/chip. |
| `imsi` | string | SIM cards are identified on their individual network operators by a unique In... |
| `msisdn` | string | Mobile Station International Subscriber Directory Number (MSISDN) is a number... |
| `sim_card_group_id` | string (UUID) | The group SIMCardGroup identification. |
| `tags` | array[string] | Searchable tags associated with the SIM card |
| `authorized_imeis` | array[string] | List of IMEIs authorized to use a given SIM card. |
| `current_imei` | string | IMEI of the device where a given SIM card is currently being used. |
| `data_limit` | object | The SIM card individual data limit configuration. |
| `current_billing_period_consumed_data` | object | The SIM card consumption so far in the current billing cycle. |
| `actions_in_progress` | boolean | Indicate whether the SIM card has any pending (in-progress) actions. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `ipv4` | string | The SIM's address in the currently connected network. |
| `ipv6` | string | The SIM's address in the currently connected network. |
| `current_device_location` | object | Current physical location data of a given SIM card. |
| `current_mnc` | string | Mobile Network Code of the current network to which the SIM card is connected. |
| `current_mcc` | string | Mobile Country Code of the current network to which the SIM card is connected. |
| `live_data_session` | enum (connected, disconnected, unknown) | Indicates whether the device is actively connected to a network and able to r... |
| `pin_puk_codes` | object | PIN and PUK codes for the SIM card. |
| `esim_installation_status` | enum (released, disabled) | The installation status of the eSIM. |
| `version` | string | The version of the SIM card. |
| `resources_with_in_progress_actions` | array[object] | List of resources with actions in progress. |
| `eid` | string | The Embedded Identity Document (eID) for eSIM cards. |
| `voice_enabled` | boolean | Indicates whether voice services are enabled for the SIM card. |

### Request setting a SIM card public IP — `client.sim_cards.actions.set_public_ip()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `region_code` | string | The code of the region where the public IP should be assigned. |

### Create a Migration Source — `client.storage.migration_sources.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Unique identifier for the data migration source. |
| `source_region` | string | For intra-Telnyx buckets migration, specify the source bucket region in this ... |

### Create a Migration — `client.storage.migrations.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Unique identifier for the data migration. |
| `refresh` | boolean | If true, will continue to poll the source bucket to ensure new data is contin... |
| `last_copy` | string (date-time) | Time when data migration was last copied from the source. |
| `status` | enum (pending, checking, migrating, complete, error, ...) | Status of the migration. |
| `bytes_to_migrate` | integer | Total amount of data found in source bucket to migrate. |
| `bytes_migrated` | integer | Total amount of data that has been succesfully migrated. |
| `speed` | integer | Current speed of the migration. |
| `eta` | string (date-time) | Estimated time the migration will complete. |
| `created_at` | string (date-time) | Time when data migration was created |

### Create a Mobile Voice Connection — `client.mobile_voice_connections.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean |  |
| `connection_name` | string |  |
| `webhook_event_url` | string (URL) |  |
| `webhook_event_failover_url` | string (URL) |  |
| `webhook_api_version` | enum (1, 2) |  |
| `webhook_timeout_secs` | integer |  |
| `tags` | array[string] |  |
| `outbound` | object |  |
| `inbound` | object |  |

### Update a Mobile Voice Connection — `client.mobile_voice_connections.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean |  |
| `connection_name` | string |  |
| `webhook_event_url` | string (URL) |  |
| `webhook_event_failover_url` | string (URL) |  |
| `webhook_api_version` | enum (1, 2) |  |
| `webhook_timeout_secs` | integer |  |
| `tags` | array[string] |  |
| `outbound` | object |  |
| `inbound` | object |  |

### Update a Wireless Blocklist — `client.wireless_blocklists.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The name of the Wireless Blocklist. |
| `type_` | enum (country, mcc, plmn) | The type of wireless blocklist. |
| `values` | array[object] | Values to block. |
