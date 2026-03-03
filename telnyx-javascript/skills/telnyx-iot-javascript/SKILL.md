---
name: telnyx-iot-javascript
description: >-
  Manage IoT SIM cards, eSIMs, data plans, and wireless connectivity. Use when
  building IoT/M2M solutions. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: iot
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Iot - JavaScript

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

## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.<br/><br/>
If <code>sim_card_group_id</code> is provided, the eSIMs will be associated with that group.

`POST /actions/purchase/esims` — Required: `amount`

Optional: `product` (string), `sim_card_group_id` (uuid), `status` (enum), `tags` (array[string]), `whitelabel_name` (string)

```javascript
const purchase = await client.actions.purchase.create({ amount: 10 });

console.log(purchase.data);
```

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.<br/><br/>
If <code>sim_card_group_id</code> is provided, the SIM cards will be associated with ...

`POST /actions/register/sim_cards` — Required: `registration_codes`

Optional: `sim_card_group_id` (uuid), `status` (enum), `tags` (array[string])

```javascript
const register = await client.actions.register.create({
  registration_codes: ['0000000001', '0000000002', '0000000003'],
});

console.log(register.data);
```

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions.

`GET /bulk_sim_card_actions`

```javascript
// Automatically fetches more pages as needed.
for await (const bulkSimCardActionListResponse of client.bulkSimCardActions.list()) {
  console.log(bulkSimCardActionListResponse.id);
}
```

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action.

`GET /bulk_sim_card_actions/{id}`

```javascript
const bulkSimCardAction = await client.bulkSimCardActions.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(bulkSimCardAction.data);
```

## List OTA updates

`GET /ota_updates`

```javascript
// Automatically fetches more pages as needed.
for await (const otaUpdateListResponse of client.otaUpdates.list()) {
  console.log(otaUpdateListResponse.id);
}
```

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`GET /ota_updates/{id}`

```javascript
const otaUpdate = await client.otaUpdates.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(otaUpdate.data);
```

## List SIM card actions

This API lists a paginated collection of SIM card actions.

`GET /sim_card_actions`

```javascript
// Automatically fetches more pages as needed.
for await (const simCardAction of client.simCards.actions.list()) {
  console.log(simCardAction.id);
}
```

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`GET /sim_card_actions/{id}`

```javascript
const action = await client.simCards.actions.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(action.data);
```

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications.

`GET /sim_card_data_usage_notifications`

```javascript
// Automatically fetches more pages as needed.
for await (const simCardDataUsageNotification of client.simCardDataUsageNotifications.list()) {
  console.log(simCardDataUsageNotification.id);
}
```

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`POST /sim_card_data_usage_notifications` — Required: `sim_card_id`, `threshold`

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.create({
  sim_card_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  threshold: {},
});

console.log(simCardDataUsageNotification.data);
```

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`GET /sim_card_data_usage_notifications/{id}`

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(simCardDataUsageNotification.data);
```

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`PATCH /sim_card_data_usage_notifications/{id}`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `sim_card_id` (uuid), `threshold` (object), `updated_at` (string)

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.update(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(simCardDataUsageNotification.data);
```

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`DELETE /sim_card_data_usage_notifications/{id}`

```javascript
const simCardDataUsageNotification = await client.simCardDataUsageNotifications.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(simCardDataUsageNotification.data);
```

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions.

`GET /sim_card_group_actions`

```javascript
// Automatically fetches more pages as needed.
for await (const simCardGroupAction of client.simCardGroups.actions.list()) {
  console.log(simCardGroupAction.id);
}
```

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`GET /sim_card_group_actions/{id}`

```javascript
const action = await client.simCardGroups.actions.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(action.data);
```

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`GET /sim_card_groups`

```javascript
// Automatically fetches more pages as needed.
for await (const simCardGroupListResponse of client.simCardGroups.list()) {
  console.log(simCardGroupListResponse.id);
}
```

## Create a SIM card group

Creates a new SIM card group object

`POST /sim_card_groups` — Required: `name`

Optional: `data_limit` (object)

```javascript
const simCardGroup = await client.simCardGroups.create({ name: 'My Test Group' });

console.log(simCardGroup.data);
```

## Get SIM card group

Returns the details regarding a specific SIM card group

`GET /sim_card_groups/{id}`

```javascript
const simCardGroup = await client.simCardGroups.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardGroup.data);
```

## Update a SIM card group

Updates a SIM card group

`PATCH /sim_card_groups/{id}`

Optional: `data_limit` (object), `name` (string)

```javascript
const simCardGroup = await client.simCardGroups.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardGroup.data);
```

## Delete a SIM card group

Permanently deletes a SIM card group

`DELETE /sim_card_groups/{id}`

```javascript
const simCardGroup = await client.simCardGroups.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardGroup.data);
```

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group.

`POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

```javascript
const response = await client.simCardGroups.actions.removePrivateWirelessGateway(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(response.data);
```

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

```javascript
const response = await client.simCardGroups.actions.removeWirelessBlocklist(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(response.data);
```

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group.

`POST /sim_card_groups/{id}/actions/set_private_wireless_gateway` — Required: `private_wireless_gateway_id`

```javascript
const response = await client.simCardGroups.actions.setPrivateWirelessGateway(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { private_wireless_gateway_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58' },
);

console.log(response.data);
```

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/set_wireless_blocklist` — Required: `wireless_blocklist_id`

```javascript
const response = await client.simCardGroups.actions.setWirelessBlocklist(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
  { wireless_blocklist_id: '6a09cdc3-8948-47f0-aa62-74ac943d6c58' },
);

console.log(response.data);
```

## Preview SIM card orders

Preview SIM card order purchases.

`POST /sim_card_order_preview` — Required: `quantity`, `address_id`

```javascript
const response = await client.simCardOrderPreview.preview({
  address_id: '1293384261075731499',
  quantity: 21,
});

console.log(response.data);
```

## Get all SIM card orders

Get all SIM card orders according to filters.

`GET /sim_card_orders`

```javascript
// Automatically fetches more pages as needed.
for await (const simCardOrder of client.simCardOrders.list()) {
  console.log(simCardOrder.id);
}
```

## Create a SIM card order

Creates a new order for SIM cards.

`POST /sim_card_orders` — Required: `address_id`, `quantity`

```javascript
const simCardOrder = await client.simCardOrders.create({
  address_id: '1293384261075731499',
  quantity: 23,
});

console.log(simCardOrder.data);
```

## Get a single SIM card order

Get a single SIM card order by its ID.

`GET /sim_card_orders/{id}`

```javascript
const simCardOrder = await client.simCardOrders.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCardOrder.data);
```

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`GET /sim_cards`

```javascript
// Automatically fetches more pages as needed.
for await (const simpleSimCard of client.simCards.list()) {
  console.log(simpleSimCard.id);
}
```

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards.<br/>
For each SIM Card a SIM Card Action will be generated.

`POST /sim_cards/actions/bulk_set_public_ips` — Required: `sim_card_ids`

```javascript
const response = await client.simCards.actions.bulkSetPublicIPs({
  sim_card_ids: ['6b14e151-8493-4fa1-8664-1cc4e6d14158'],
});

console.log(response.data);
```

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`POST /sim_cards/actions/validate_registration_codes`

Optional: `registration_codes` (array[string])

```javascript
const response = await client.simCards.actions.validateRegistrationCodes();

console.log(response.data);
```

## Get SIM card

Returns the details regarding a specific SIM card.

`GET /sim_cards/{id}`

```javascript
const simCard = await client.simCards.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCard.data);
```

## Update a SIM card

Updates SIM card data

`PATCH /sim_cards/{id}`

Optional: `actions_in_progress` (boolean), `authorized_imeis` (['array', 'null']), `created_at` (string), `current_billing_period_consumed_data` (object), `current_device_location` (object), `current_imei` (string), `current_mcc` (string), `current_mnc` (string), `data_limit` (object), `eid` (['string', 'null']), `esim_installation_status` (enum), `iccid` (string), `id` (uuid), `imsi` (string), `ipv4` (string), `ipv6` (string), `live_data_session` (enum), `msisdn` (string), `pin_puk_codes` (object), `record_type` (string), `resources_with_in_progress_actions` (array[object]), `sim_card_group_id` (uuid), `status` (object), `tags` (array[string]), `type` (enum), `updated_at` (string), `version` (string)

```javascript
const simCard = await client.simCards.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCard.data);
```

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged.<br />The SIM card won't be able to connect to the network after the deletion is completed, thus makin...

`DELETE /sim_cards/{id}`

```javascript
const simCard = await client.simCards.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(simCard.data);
```

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data.<br/>
The API will trigger an asynchronous operation called a SIM Card Action.

`POST /sim_cards/{id}/actions/disable`

```javascript
const response = await client.simCards.actions.disable('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data.<br/>
To enable a SIM card, it must be associated with a SIM card group.<br/>
The API will trigger a...

`POST /sim_cards/{id}/actions/enable`

```javascript
const response = await client.simCards.actions.enable('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.

`POST /sim_cards/{id}/actions/remove_public_ip`

```javascript
const response = await client.simCards.actions.removePublicIP(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(response.data);
```

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.

`POST /sim_cards/{id}/actions/set_public_ip`

```javascript
const response = await client.simCards.actions.setPublicIP('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data.<br/>
To set a SIM card to standby, it must be ...

`POST /sim_cards/{id}/actions/set_standby`

```javascript
const response = await client.simCards.actions.setStandby('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## Get activation code for an eSIM

It returns the activation code for an eSIM.<br/><br/>
 This API is only available for eSIMs.

`GET /sim_cards/{id}/activation_code`

```javascript
const response = await client.simCards.getActivationCode('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`GET /sim_cards/{id}/device_details`

```javascript
const response = await client.simCards.getDeviceDetails('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`GET /sim_cards/{id}/public_ip`

```javascript
const response = await client.simCards.getPublicIP('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response.data);
```

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`GET /sim_cards/{id}/wireless_connectivity_logs`

```javascript
// Automatically fetches more pages as needed.
for await (const simCardListWirelessConnectivityLogsResponse of client.simCards.listWirelessConnectivityLogs(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
)) {
  console.log(simCardListWirelessConnectivityLogsResponse.id);
}
```

## List Migration Source coverage

`GET /storage/migration_source_coverage`

```javascript
const response = await client.storage.listMigrationSourceCoverage();

console.log(response.data);
```

## List all Migration Sources

`GET /storage/migration_sources`

```javascript
const migrationSources = await client.storage.migrationSources.list();

console.log(migrationSources.data);
```

## Create a Migration Source

Create a source from which data can be migrated from.

`POST /storage/migration_sources` — Required: `provider`, `provider_auth`, `bucket_name`

Optional: `id` (string), `source_region` (string)

```javascript
const migrationSource = await client.storage.migrationSources.create({
  bucket_name: 'bucket_name',
  provider: 'aws',
  provider_auth: {},
});

console.log(migrationSource.data);
```

## Get a Migration Source

`GET /storage/migration_sources/{id}`

```javascript
const migrationSource = await client.storage.migrationSources.retrieve('');

console.log(migrationSource.data);
```

## Delete a Migration Source

`DELETE /storage/migration_sources/{id}`

```javascript
const migrationSource = await client.storage.migrationSources.delete('');

console.log(migrationSource.data);
```

## List all Migrations

`GET /storage/migrations`

```javascript
const migrations = await client.storage.migrations.list();

console.log(migrations.data);
```

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage.

`POST /storage/migrations` — Required: `source_id`, `target_bucket_name`, `target_region`

Optional: `bytes_migrated` (integer), `bytes_to_migrate` (integer), `created_at` (date-time), `eta` (date-time), `id` (string), `last_copy` (date-time), `refresh` (boolean), `speed` (integer), `status` (enum)

```javascript
const migration = await client.storage.migrations.create({
  source_id: 'source_id',
  target_bucket_name: 'target_bucket_name',
  target_region: 'target_region',
});

console.log(migration.data);
```

## Get a Migration

`GET /storage/migrations/{id}`

```javascript
const migration = await client.storage.migrations.retrieve('');

console.log(migration.data);
```

## Stop a Migration

`POST /storage/migrations/{id}/actions/stop`

```javascript
const response = await client.storage.migrations.actions.stop('');

console.log(response.data);
```

## List Mobile Voice Connections

`GET /v2/mobile_voice_connections`

```javascript
// Automatically fetches more pages as needed.
for await (const mobileVoiceConnection of client.mobileVoiceConnections.list()) {
  console.log(mobileVoiceConnection.id);
}
```

## Create a Mobile Voice Connection

`POST /v2/mobile_voice_connections`

Optional: `active` (boolean), `connection_name` (string), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (['string', 'null']), `webhook_event_url` (['string', 'null']), `webhook_timeout_secs` (['integer', 'null'])

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.create();

console.log(mobileVoiceConnection.data);
```

## Retrieve a Mobile Voice Connection

`GET /v2/mobile_voice_connections/{id}`

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.retrieve('id');

console.log(mobileVoiceConnection.data);
```

## Update a Mobile Voice Connection

`PATCH /v2/mobile_voice_connections/{id}`

Optional: `active` (boolean), `connection_name` (string), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (['string', 'null']), `webhook_event_url` (['string', 'null']), `webhook_timeout_secs` (integer)

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.update('id');

console.log(mobileVoiceConnection.data);
```

## Delete a Mobile Voice Connection

`DELETE /v2/mobile_voice_connections/{id}`

```javascript
const mobileVoiceConnection = await client.mobileVoiceConnections.delete('id');

console.log(mobileVoiceConnection.data);
```

## Get all wireless regions

Retrieve all wireless regions for the given product.

`GET /wireless/regions`

```javascript
const response = await client.wireless.retrieveRegions({ product: 'public_ips' });

console.log(response.data);
```

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`GET /wireless_blocklist_values`

```javascript
const wirelessBlocklistValues = await client.wirelessBlocklistValues.list({ type: 'country' });

console.log(wirelessBlocklistValues.data);
```

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`GET /wireless_blocklists`

```javascript
// Automatically fetches more pages as needed.
for await (const wirelessBlocklist of client.wirelessBlocklists.list()) {
  console.log(wirelessBlocklist.id);
}
```

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`POST /wireless_blocklists` — Required: `name`, `type`, `values`

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.create({
  name: 'My Wireless Blocklist',
  type: 'country',
  values: ['CA', 'US'],
});

console.log(wirelessBlocklist.data);
```

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`PATCH /wireless_blocklists`

Optional: `name` (string), `type` (enum), `values` (array[object])

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.update();

console.log(wirelessBlocklist.data);
```

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`GET /wireless_blocklists/{id}`

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.retrieve(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wirelessBlocklist.data);
```

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`DELETE /wireless_blocklists/{id}`

```javascript
const wirelessBlocklist = await client.wirelessBlocklists.delete(
  '6a09cdc3-8948-47f0-aa62-74ac943d6c58',
);

console.log(wirelessBlocklist.data);
```
