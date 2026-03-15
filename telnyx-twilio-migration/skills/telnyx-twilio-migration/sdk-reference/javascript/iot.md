<!-- SDK reference: telnyx-iot-javascript -->

# Telnyx Iot - JavaScript

## Core Workflow

### Prerequisites

1. Purchase SIM cards (physical SIM, eSIM chip MFF2, or eSIM OTA)
2. For physical SIMs: register via 10-digit code or CSV batch upload
3. Insert SIM and configure APN: Name='Telnyx', APN='data00.telnyx' (leave all other fields blank)
4. Enable data roaming on device and reboot

### Steps

1. **Order SIMs**: `client.simCards.list()`
2. **Register SIMs**: `client.simCards.register({simCardId: ..., registrationCode: ...})`
3. **Activate SIM**: `client.simCards.activate({simCardId: ...})`
4. **Monitor usage**: `client.simCards.retrieve({simCardId: ...})`

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

**Related skills**: telnyx-networking-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.sim_cards.list(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.  
If `sim_card_group_id` is provided, the eSIMs will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.actions.purchase.create()` — `POST /actions/purchase/esims`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | integer | Yes | The amount of eSIMs to be purchased. |
| `tags` | array[string] | No | Searchable tags associated with the SIM cards |
| `simCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM cards will be set after being succes... |
| ... | | | +2 optional params in the API Details section below |

```javascript
const purchase = await client.actions.purchase.create({ amount: 10 });

console.log(purchase.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.  
If `sim_card_group_id` is provided, the SIM cards will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.actions.register.create()` — `POST /actions/register/sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registrationCodes` | array[string] | Yes |  |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `simCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM card will be set after being success... |

```javascript
const register = await client.actions.register.create({
  registration_codes: ['0000000001', '0000000002', '0000000003'],
});

console.log(register.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`client.simCards.list()` — `GET /sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (current_billing_period_consumed_data.amount, -current_billing_period_consumed_data.amount) | No | Sorts SIM cards by the given field. |
| `filter` | object | No | Consolidated filter parameter for SIM cards (deepObject styl... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |
| ... | | | +2 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const simpleSimCard of client.simCards.list()) {
  console.log(simpleSimCard.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card

Returns the details regarding a specific SIM card.

`client.simCards.retrieve()` — `GET /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `includeSimCardGroup` | boolean | No | It includes the associated SIM card group object in the resp... |
| `includePinPukCodes` | boolean | No | When set to true, includes the PIN and PUK codes in the resp... |

```javascript
const simCard = await client.simCards.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCard.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Create a SIM card order

Creates a new order for SIM cards.

`client.simCardOrders.create()` — `POST /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addressId` | string (UUID) | Yes | Uniquely identifies the address for the order. |
| `quantity` | integer | Yes | The amount of SIM cards to order. |

```javascript
const simCardOrder = await client.simCardOrders.create({
  address_id: '1293384261075731499',
  quantity: 23,
    simCardGroupId: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(simCardOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a SIM card group

Creates a new SIM card group object

`client.simCardGroups.create()` — `POST /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the SIM card group. |
| `dataLimit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```javascript
const simCardGroup = await client.simCardGroups.create({ name: 'My Test Group' });

console.log(simCardGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.bulkSimCardActions.list()` — `GET /bulk_sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[actionType]` | enum (bulk_set_public_ips) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```javascript
// Automatically fetches more pages as needed.
for await (const bulkSimCardActionListResponse of client.bulkSimCardActions.list()) {
  console.log(bulkSimCardActionListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.bulkSimCardActions.retrieve()` — `GET /bulk_sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const bulkSimCardAction = await client.bulkSimCardActions.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(bulkSimCardAction.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List OTA updates

`client.otaUpdates.list()` — `GET /ota_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for OTA updates (deepObject st... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const otaUpdateListResponse of client.otaUpdates.list()) {
  console.log(otaUpdateListResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`client.otaUpdates.retrieve()` — `GET /ota_updates/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const otaUpdate = await client.otaUpdates.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(otaUpdate.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List SIM card actions

This API lists a paginated collection of SIM card actions. It enables exploring a collection of existing asynchronous operations using specific filters.

`client.simCards.actions.list()` — `GET /sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card actions (deepObje... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const simCardAction of client.simCards.actions.list()) {
  console.log(simCardAction.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`client.simCards.actions.retrieve()` — `GET /sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const action = await client.simCards.actions.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(action.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications. It enables exploring the collection using specific filters.

`client.simCardDataUsageNotifications.list()` — `GET /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[simCardId]` | string (UUID) | No | A valid SIM card ID. |

```javascript
// Automatically fetches more pages as needed.
for await (const simCardDataUsageNotification of client.simCardDataUsageNotifications.list()) {
  console.log(simCardDataUsageNotification.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`client.simCardDataUsageNotifications.create()` — `POST /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardId` | string (UUID) | Yes | The identification UUID of the related SIM card resource. |
| `threshold` | object | Yes | Data usage threshold that will trigger the notification. |

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.create({
  sim_card_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  threshold: {},
});

console.log(simCardDataUsageNotification.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`client.simCardDataUsageNotifications.retrieve()` — `GET /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(simCardDataUsageNotification.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`client.simCardDataUsageNotifications.update()` — `PATCH /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `simCardId` | string (UUID) | No | The identification UUID of the related SIM card resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No |  |
| ... | | | +3 optional params in the API Details section below |

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(simCardDataUsageNotification.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`client.simCardDataUsageNotifications.delete()` — `DELETE /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(simCardDataUsageNotification.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions. It allows to explore a collection of existing asynchronous operation using specific filters.

`client.simCardGroups.actions.list()` — `GET /sim_card_group_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[status]` | enum (in-progress, completed, failed) | No | Filter by a specific status of the resource's lifecycle. |
| `filter[type]` | enum (set_private_wireless_gateway, remove_private_wireless_gateway, set_wireless_blocklist, remove_wireless_blocklist) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| ... | | | +2 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const simCardGroupAction of client.simCardGroups.actions.list()) {
  console.log(simCardGroupAction.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`client.simCardGroups.actions.retrieve()` — `GET /sim_card_group_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const action = await client.simCardGroups.actions.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(action.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`client.simCardGroups.list()` — `GET /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | A valid SIM card group name. |
| ... | | | +2 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const simCardGroupListResponse of client.simCardGroups.list()) {
  console.log(simCardGroupListResponse.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get SIM card group

Returns the details regarding a specific SIM card group

`client.simCardGroups.retrieve()` — `GET /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `includeIccids` | boolean | No | It includes a list of associated ICCIDs. |

```javascript
const simCardGroup = await client.simCardGroups.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a SIM card group

Updates a SIM card group

`client.simCardGroups.update()` — `PATCH /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `name` | string | No | A user friendly name for the SIM card group. |
| `dataLimit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```javascript
const simCardGroup = await client.simCardGroups.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a SIM card group

Permanently deletes a SIM card group

`client.simCardGroups.delete()` — `DELETE /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```javascript
const simCardGroup = await client.simCardGroups.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic handled by Telnyx's default mobile network configuration.

`client.simCardGroups.actions.removePrivateWirelessGateway()` — `POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```javascript
const response = await client.simCardGroups.actions.removePrivateWirelessGateway(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`client.simCardGroups.actions.removeWirelessBlocklist()` — `POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```javascript
const response = await client.simCardGroups.actions.removeWirelessBlocklist(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic controlled by the associated Private Wireless Gateway. This operation will also imply that new SIM cards assigned to a group will inherit its network definitions.

`client.simCardGroups.actions.setPrivateWirelessGateway()` — `POST /sim_card_groups/{id}/actions/set_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `privateWirelessGatewayId` | string (UUID) | Yes | The identification of the related Private Wireless Gateway r... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```javascript
const response = await client.simCardGroups.actions.setPrivateWirelessGateway(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { private_wireless_gateway_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58' },
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`client.simCardGroups.actions.setWirelessBlocklist()` — `POST /sim_card_groups/{id}/actions/set_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wirelessBlocklistId` | string (UUID) | Yes | The identification of the related Wireless Blocklist resourc... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```javascript
const response = await client.simCardGroups.actions.setWirelessBlocklist(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { wireless_blocklist_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58' },
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Preview SIM card orders

Preview SIM card order purchases.

`client.simCardOrderPreview.preview()` — `POST /sim_card_order_preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quantity` | integer | Yes | The amount of SIM cards that the user would like to purchase... |
| `addressId` | string (UUID) | Yes | Uniquely identifies the address for the order. |

```javascript
const response = await client.simCardOrderPreview.preview({
  address_id: '1293384261075731499',
  quantity: 21,
});

console.log(response.data);
```

Key response fields: `response.data.quantity, response.data.record_type, response.data.shipping_cost`

## Get all SIM card orders

Get all SIM card orders according to filters.

`client.simCardOrders.list()` — `GET /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card orders (deepObjec... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const simCardOrder of client.simCardOrders.list()) {
  console.log(simCardOrder.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single SIM card order

Get a single SIM card order by its ID.

`client.simCardOrders.retrieve()` — `GET /sim_card_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const simCardOrder = await client.simCardOrders.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request bulk disabling voice on SIM cards.

This API triggers an asynchronous operation to disable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.simCards.actions.bulkDisableVoice()` — `POST /sim_cards/actions/bulk_disable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardGroupId` | string (UUID) | Yes |  |

```javascript
const response = await client.simCards.actions.bulkDisableVoice({
  sim_card_group_id: '6b14e151-8493-4fa1-8664-1cc4e6d14158',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk enabling voice on SIM cards.

This API triggers an asynchronous operation to enable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.simCards.actions.bulkEnableVoice()` — `POST /sim_cards/actions/bulk_enable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardGroupId` | string (UUID) | Yes |  |

```javascript
const response = await client.simCards.actions.bulkEnableVoice({
  sim_card_group_id: '6b14e151-8493-4fa1-8664-1cc4e6d14158',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards. 
For each SIM Card a SIM Card Action will be generated. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.simCards.actions.bulkSetPublicIPs()` — `POST /sim_cards/actions/bulk_set_public_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardIds` | array[object] | Yes |  |

```javascript
const response = await client.simCards.actions.bulkSetPublicIPs({
  sim_card_ids: ['6b14e151-8493-4fa1-8664-1cc4e6d14158'],
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`client.simCards.actions.validateRegistrationCodes()` — `POST /sim_cards/actions/validate_registration_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registrationCodes` | array[string] | No |  |

```javascript
const response = await client.simCards.actions.validateRegistrationCodes();

console.log(response.data);
```

Key response fields: `response.data.invalid_detail, response.data.record_type, response.data.registration_code`

## Update a SIM card

Updates SIM card data

`client.simCards.update()` — `PATCH /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `type` | enum (physical, esim) | No | The type of SIM card |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `simCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| ... | | | +25 optional params in the API Details section below |

```javascript
const simCard = await client.simCards.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCard.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged. The SIM card won't be able to connect to the network after the deletion is completed, thus making it impossible to consume data. 
Transitioning to the disabled state may take a period of time.

`client.simCards.delete()` — `DELETE /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `reportLost` | boolean | No | Enables deletion of disabled eSIMs that can't be uninstalled... |

```javascript
const simCard = await client.simCards.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCard.data);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the disabled state may take a period of time.

`client.simCards.actions.disable()` — `POST /sim_cards/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.actions.disable('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data. 
To enable a SIM card, it must be associated with a SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the enabled state may take a period of time.

`client.simCards.actions.enable()` — `POST /sim_cards/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.actions.enable('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.simCards.actions.removePublicIP()` — `POST /sim_cards/{id}/actions/remove_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.actions.removePublicIP(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action.

`client.simCards.actions.setPublicIP()` — `POST /sim_cards/{id}/actions/set_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `regionCode` | string | No | The code of the region where the public IP should be assigne... |

```javascript
const response = await client.simCards.actions.setPublicIP('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data. 
To set a SIM card to standby, it must be associated with SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the standby state may take a period of time.

`client.simCards.actions.setStandby()` — `POST /sim_cards/{id}/actions/set_standby`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.actions.setStandby('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get activation code for an eSIM

It returns the activation code for an eSIM.  
 This API is only available for eSIMs. If the given SIM is a physical SIM card, or has already been installed, an error will be returned.

`client.simCards.getActivationCode()` — `GET /sim_cards/{id}/activation_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.getActivationCode('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.activation_code, response.data.record_type`

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`client.simCards.getDeviceDetails()` — `GET /sim_cards/{id}/device_details`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.getDeviceDetails('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.brand_name, response.data.device_type, response.data.imei`

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`client.simCards.getPublicIP()` — `GET /sim_cards/{id}/public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```javascript
const response = await client.simCards.getPublicIP('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

Key response fields: `response.data.type, response.data.created_at, response.data.updated_at`

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`client.simCards.listWirelessConnectivityLogs()` — `GET /sim_cards/{id}/wireless_connectivity_logs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```javascript
// Automatically fetches more pages as needed.
for await (const simCardListWirelessConnectivityLogsResponse of client.simCards.listWirelessConnectivityLogs(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
)) {
  console.log(simCardListWirelessConnectivityLogsResponse.id);
}
```

Key response fields: `response.data.id, response.data.state, response.data.created_at`

## List Migration Source coverage

`client.storage.listMigrationSourceCoverage()` — `GET /storage/migration_source_coverage`

```javascript
const response = await client.storage.listMigrationSourceCoverage();

console.log(response.data);
```

Key response fields: `response.data.provider, response.data.source_region`

## List all Migration Sources

`client.storage.migrationSources.list()` — `GET /storage/migration_sources`

```javascript
const migrationSources = await client.storage.migrationSources.list();

console.log(migrationSources.data);
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Create a Migration Source

Create a source from which data can be migrated from.

`client.storage.migrationSources.create()` — `POST /storage/migration_sources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx) | Yes | Cloud provider from which to migrate data. |
| `providerAuth` | object | Yes |  |
| `bucketName` | string | Yes | Bucket name to migrate the data from. |
| `id` | string (UUID) | No | Unique identifier for the data migration source. |
| `sourceRegion` | string | No | For intra-Telnyx buckets migration, specify the source bucke... |

```javascript
const migrationSource = await client.storage.migrationSources.create({
  bucket_name: 'bucket_name',
  provider: 'aws',
  provider_auth: {},
});

console.log(migrationSource.data);
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Get a Migration Source

`client.storage.migrationSources.retrieve()` — `GET /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```javascript
const migrationSource = await client.storage.migrationSources.retrieve('');

console.log(migrationSource.data);
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Delete a Migration Source

`client.storage.migrationSources.delete()` — `DELETE /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```javascript
const migrationSource = await client.storage.migrationSources.delete('');

console.log(migrationSource.data);
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## List all Migrations

`client.storage.migrations.list()` — `GET /storage/migrations`

```javascript
const migrations = await client.storage.migrations.list();

console.log(migrations.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage. Currently, only S3 is supported.

`client.storage.migrations.create()` — `POST /storage/migrations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceId` | string (UUID) | Yes | ID of the Migration Source from which to migrate data. |
| `targetBucketName` | string | Yes | Bucket name to migrate the data into. |
| `targetRegion` | string | Yes | Telnyx Cloud Storage region to migrate the data to. |
| `status` | enum (pending, checking, migrating, complete, error, ...) | No | Status of the migration. |
| `id` | string (UUID) | No | Unique identifier for the data migration. |
| `refresh` | boolean | No | If true, will continue to poll the source bucket to ensure n... |
| ... | | | +6 optional params in the API Details section below |

```javascript
const migration = await client.storage.migrations.create({
  source_id: '550e8400-e29b-41d4-a716-446655440000',
  target_bucket_name: 'target_bucket_name',
  target_region: 'target_region',
});

console.log(migration.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Migration

`client.storage.migrations.retrieve()` — `GET /storage/migrations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```javascript
const migration = await client.storage.migrations.retrieve('');

console.log(migration.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Stop a Migration

`client.storage.migrations.actions.stop()` — `POST /storage/migrations/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```javascript
const response = await client.storage.migrations.actions.stop('');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Mobile Voice Connections

`client.mobileVoiceConnections.list()` — `GET /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |
| `filter[connectionName][contains]` | string | No | Filter by connection name containing the given string |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const mobileVoiceConnection of client.mobileVoiceConnections.list()) {
  console.log(mobileVoiceConnection.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Mobile Voice Connection

`client.mobileVoiceConnections.create()` — `POST /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No |  |
| `webhookApiVersion` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in the API Details section below |

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.create();

console.log(mobileVoiceConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Mobile Voice Connection

`client.mobileVoiceConnections.retrieve()` — `GET /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(mobileVoiceConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Mobile Voice Connection

`client.mobileVoiceConnections.update()` — `PATCH /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |
| `tags` | array[string] | No |  |
| `webhookApiVersion` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in the API Details section below |

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.update('550e8400-e29b-41d4-a716-446655440000');

console.log(mobileVoiceConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Mobile Voice Connection

`client.mobileVoiceConnections.delete()` — `DELETE /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(mobileVoiceConnection.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get all wireless regions

Retrieve all wireless regions for the given product.

`client.wireless.retrieveRegions()` — `GET /wireless/regions`

```javascript
const response = await client.wireless.retrieveRegions({ product: 'public_ips' });

console.log(response.data);
```

Key response fields: `response.data.name, response.data.updated_at, response.data.code`

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`client.wirelessBlocklistValues.list()` — `GET /wireless_blocklist_values`

```javascript
const wirelessBlocklistValues = await client.wirelessBlocklistValues.list({ type: 'country' });

console.log(wirelessBlocklistValues.data);
```

Key response fields: `response.data.data, response.data.meta`

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`client.wirelessBlocklists.list()` — `GET /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Wireless Blocklist. |
| ... | | | +2 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const wirelessBlocklist of client.wirelessBlocklists.list()) {
  console.log(wirelessBlocklist.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`client.wirelessBlocklists.create()` — `POST /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the Wireless Blocklist. |
| `type` | enum (country, mcc, plmn) | Yes | The type of wireless blocklist. |
| `values` | array[object] | Yes | Values to block. |

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.create({
  name: 'My Wireless Blocklist',
  type: 'country',
  values: ['CA', 'US'],
});

console.log(wirelessBlocklist.data);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`client.wirelessBlocklists.update()` — `PATCH /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (country, mcc, plmn) | No | The type of wireless blocklist. |
| `name` | string | No | The name of the Wireless Blocklist. |
| `values` | array[object] | No | Values to block. |

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.update();

console.log(wirelessBlocklist.data);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`client.wirelessBlocklists.retrieve()` — `GET /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wirelessBlocklist.data);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`client.wirelessBlocklists.delete()` — `DELETE /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wirelessBlocklist.data);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

---

# IoT (JavaScript) — API Details

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
| `simCardGroupId` | string (UUID) | The group SIMCardGroup identification. |
| `tags` | array[string] | Searchable tags associated with the SIM cards |
| `product` | string | Type of product to be purchased, specify "whitelabel" to use a custom SPN |
| `whitelabelName` | string | Service Provider Name (SPN) for the Whitelabel eSIM product. |
| `status` | enum (enabled, disabled, standby) | Status on which the SIM cards will be set after being successfully registered. |

### Register SIM cards — `client.actions.register.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `simCardGroupId` | string (UUID) | The group SIMCardGroup identification. |
| `tags` | array[string] | Searchable tags associated with the SIM card |
| `status` | enum (enabled, disabled, standby) | Status on which the SIM card will be set after being successful registered. |

### Updates information for a SIM Card Data Usage Notification — `client.simCardDataUsageNotifications.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `simCardId` | string (UUID) | The identification UUID of the related SIM card resource. |
| `recordType` | string |  |
| `threshold` | object | Data usage threshold that will trigger the notification. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |

### Create a SIM card group — `client.simCardGroups.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `dataLimit` | object | Upper limit on the amount of data the SIM cards, within the group, can use. |

### Update a SIM card group — `client.simCardGroups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | A user friendly name for the SIM card group. |
| `dataLimit` | object | Upper limit on the amount of data the SIM cards, within the group, can use. |

### Validate SIM cards registration codes — `client.simCards.actions.validateRegistrationCodes()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `registrationCodes` | array[string] |  |

### Update a SIM card — `client.simCards.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string |  |
| `status` | object |  |
| `type` | enum (physical, esim) | The type of SIM card |
| `iccid` | string | The ICCID is the identifier of the specific SIM card/chip. |
| `imsi` | string | SIM cards are identified on their individual network operators by a unique In... |
| `msisdn` | string | Mobile Station International Subscriber Directory Number (MSISDN) is a number... |
| `simCardGroupId` | string (UUID) | The group SIMCardGroup identification. |
| `tags` | array[string] | Searchable tags associated with the SIM card |
| `authorizedImeis` | array[string] | List of IMEIs authorized to use a given SIM card. |
| `currentImei` | string | IMEI of the device where a given SIM card is currently being used. |
| `dataLimit` | object | The SIM card individual data limit configuration. |
| `currentBillingPeriodConsumedData` | object | The SIM card consumption so far in the current billing cycle. |
| `actionsInProgress` | boolean | Indicate whether the SIM card has any pending (in-progress) actions. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `ipv4` | string | The SIM's address in the currently connected network. |
| `ipv6` | string | The SIM's address in the currently connected network. |
| `currentDeviceLocation` | object | Current physical location data of a given SIM card. |
| `currentMnc` | string | Mobile Network Code of the current network to which the SIM card is connected. |
| `currentMcc` | string | Mobile Country Code of the current network to which the SIM card is connected. |
| `liveDataSession` | enum (connected, disconnected, unknown) | Indicates whether the device is actively connected to a network and able to r... |
| `pinPukCodes` | object | PIN and PUK codes for the SIM card. |
| `esimInstallationStatus` | enum (released, disabled) | The installation status of the eSIM. |
| `version` | string | The version of the SIM card. |
| `resourcesWithInProgressActions` | array[object] | List of resources with actions in progress. |
| `eid` | string | The Embedded Identity Document (eID) for eSIM cards. |
| `voiceEnabled` | boolean | Indicates whether voice services are enabled for the SIM card. |

### Request setting a SIM card public IP — `client.simCards.actions.setPublicIP()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `regionCode` | string | The code of the region where the public IP should be assigned. |

### Create a Migration Source — `client.storage.migrationSources.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Unique identifier for the data migration source. |
| `sourceRegion` | string | For intra-Telnyx buckets migration, specify the source bucket region in this ... |

### Create a Migration — `client.storage.migrations.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Unique identifier for the data migration. |
| `refresh` | boolean | If true, will continue to poll the source bucket to ensure new data is contin... |
| `lastCopy` | string (date-time) | Time when data migration was last copied from the source. |
| `status` | enum (pending, checking, migrating, complete, error, ...) | Status of the migration. |
| `bytesToMigrate` | integer | Total amount of data found in source bucket to migrate. |
| `bytesMigrated` | integer | Total amount of data that has been succesfully migrated. |
| `speed` | integer | Current speed of the migration. |
| `eta` | string (date-time) | Estimated time the migration will complete. |
| `createdAt` | string (date-time) | Time when data migration was created |

### Create a Mobile Voice Connection — `client.mobileVoiceConnections.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean |  |
| `connectionName` | string |  |
| `webhookEventUrl` | string (URL) |  |
| `webhookEventFailoverUrl` | string (URL) |  |
| `webhookApiVersion` | enum (1, 2) |  |
| `webhookTimeoutSecs` | integer |  |
| `tags` | array[string] |  |
| `outbound` | object |  |
| `inbound` | object |  |

### Update a Mobile Voice Connection — `client.mobileVoiceConnections.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean |  |
| `connectionName` | string |  |
| `webhookEventUrl` | string (URL) |  |
| `webhookEventFailoverUrl` | string (URL) |  |
| `webhookApiVersion` | enum (1, 2) |  |
| `webhookTimeoutSecs` | integer |  |
| `tags` | array[string] |  |
| `outbound` | object |  |
| `inbound` | object |  |

### Update a Wireless Blocklist — `client.wirelessBlocklists.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The name of the Wireless Blocklist. |
| `type` | enum (country, mcc, plmn) | The type of wireless blocklist. |
| `values` | array[object] | Values to block. |
