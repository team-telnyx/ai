---
name: telnyx-iot-python
description: >-
  Manage IoT SIM cards, eSIMs, data plans, and wireless connectivity. Use when
  building IoT/M2M solutions. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: iot
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Iot - Python

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

## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.<br/><br/>
If <code>sim_card_group_id</code> is provided, the eSIMs will be associated with that group.

`POST /actions/purchase/esims` — Required: `amount`

Optional: `product` (string), `sim_card_group_id` (uuid), `status` (enum), `tags` (array[string]), `whitelabel_name` (string)

```python
purchase = client.actions.purchase.create(
    amount=10,
)
print(purchase.data)
```

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.<br/><br/>
If <code>sim_card_group_id</code> is provided, the SIM cards will be associated with ...

`POST /actions/register/sim_cards` — Required: `registration_codes`

Optional: `sim_card_group_id` (uuid), `status` (enum), `tags` (array[string])

```python
register = client.actions.register.create(
    registration_codes=["0000000001", "0000000002", "0000000003"],
)
print(register.data)
```

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions.

`GET /bulk_sim_card_actions`

```python
page = client.bulk_sim_card_actions.list()
page = page.data[0]
print(page.id)
```

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action.

`GET /bulk_sim_card_actions/{id}`

```python
bulk_sim_card_action = client.bulk_sim_card_actions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(bulk_sim_card_action.data)
```

## List OTA updates

`GET /ota_updates`

```python
page = client.ota_updates.list()
page = page.data[0]
print(page.id)
```

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`GET /ota_updates/{id}`

```python
ota_update = client.ota_updates.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(ota_update.data)
```

## List SIM card actions

This API lists a paginated collection of SIM card actions.

`GET /sim_card_actions`

```python
page = client.sim_cards.actions.list()
page = page.data[0]
print(page.id)
```

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`GET /sim_card_actions/{id}`

```python
action = client.sim_cards.actions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(action.data)
```

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications.

`GET /sim_card_data_usage_notifications`

```python
page = client.sim_card_data_usage_notifications.list()
page = page.data[0]
print(page.id)
```

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`POST /sim_card_data_usage_notifications` — Required: `sim_card_id`, `threshold`

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.create(
    sim_card_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    threshold={},
)
print(sim_card_data_usage_notification.data)
```

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`GET /sim_card_data_usage_notifications/{id}`

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_data_usage_notification.data)
```

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`PATCH /sim_card_data_usage_notifications/{id}`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `sim_card_id` (uuid), `threshold` (object), `updated_at` (string)

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.update(
    sim_card_data_usage_notification_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_data_usage_notification.data)
```

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`DELETE /sim_card_data_usage_notifications/{id}`

```python
sim_card_data_usage_notification = client.sim_card_data_usage_notifications.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_data_usage_notification.data)
```

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions.

`GET /sim_card_group_actions`

```python
page = client.sim_card_groups.actions.list()
page = page.data[0]
print(page.id)
```

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`GET /sim_card_group_actions/{id}`

```python
action = client.sim_card_groups.actions.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(action.data)
```

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`GET /sim_card_groups`

```python
page = client.sim_card_groups.list()
page = page.data[0]
print(page.id)
```

## Create a SIM card group

Creates a new SIM card group object

`POST /sim_card_groups` — Required: `name`

Optional: `data_limit` (object)

```python
sim_card_group = client.sim_card_groups.create(
    name="My Test Group",
)
print(sim_card_group.data)
```

## Get SIM card group

Returns the details regarding a specific SIM card group

`GET /sim_card_groups/{id}`

```python
sim_card_group = client.sim_card_groups.retrieve(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_group.data)
```

## Update a SIM card group

Updates a SIM card group

`PATCH /sim_card_groups/{id}`

Optional: `data_limit` (object), `name` (string)

```python
sim_card_group = client.sim_card_groups.update(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_group.data)
```

## Delete a SIM card group

Permanently deletes a SIM card group

`DELETE /sim_card_groups/{id}`

```python
sim_card_group = client.sim_card_groups.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_group.data)
```

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group.

`POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

```python
response = client.sim_card_groups.actions.remove_private_wireless_gateway(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

```python
response = client.sim_card_groups.actions.remove_wireless_blocklist(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group.

`POST /sim_card_groups/{id}/actions/set_private_wireless_gateway` — Required: `private_wireless_gateway_id`

```python
response = client.sim_card_groups.actions.set_private_wireless_gateway(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    private_wireless_gateway_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/set_wireless_blocklist` — Required: `wireless_blocklist_id`

```python
response = client.sim_card_groups.actions.set_wireless_blocklist(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
    wireless_blocklist_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Preview SIM card orders

Preview SIM card order purchases.

`POST /sim_card_order_preview` — Required: `quantity`, `address_id`

```python
response = client.sim_card_order_preview.preview(
    address_id="1293384261075731499",
    quantity=21,
)
print(response.data)
```

## Get all SIM card orders

Get all SIM card orders according to filters.

`GET /sim_card_orders`

```python
page = client.sim_card_orders.list()
page = page.data[0]
print(page.id)
```

## Create a SIM card order

Creates a new order for SIM cards.

`POST /sim_card_orders` — Required: `address_id`, `quantity`

```python
sim_card_order = client.sim_card_orders.create(
    address_id="1293384261075731499",
    quantity=23,
)
print(sim_card_order.data)
```

## Get a single SIM card order

Get a single SIM card order by its ID.

`GET /sim_card_orders/{id}`

```python
sim_card_order = client.sim_card_orders.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card_order.data)
```

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`GET /sim_cards`

```python
page = client.sim_cards.list()
page = page.data[0]
print(page.id)
```

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards.<br/>
For each SIM Card a SIM Card Action will be generated.

`POST /sim_cards/actions/bulk_set_public_ips` — Required: `sim_card_ids`

```python
response = client.sim_cards.actions.bulk_set_public_ips(
    sim_card_ids=["6b14e151-8493-4fa1-8664-1cc4e6d14158"],
)
print(response.data)
```

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`POST /sim_cards/actions/validate_registration_codes`

Optional: `registration_codes` (array[string])

```python
response = client.sim_cards.actions.validate_registration_codes()
print(response.data)
```

## Get SIM card

Returns the details regarding a specific SIM card.

`GET /sim_cards/{id}`

```python
sim_card = client.sim_cards.retrieve(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card.data)
```

## Update a SIM card

Updates SIM card data

`PATCH /sim_cards/{id}`

Optional: `actions_in_progress` (boolean), `authorized_imeis` (['array', 'null']), `created_at` (string), `current_billing_period_consumed_data` (object), `current_device_location` (object), `current_imei` (string), `current_mcc` (string), `current_mnc` (string), `data_limit` (object), `eid` (['string', 'null']), `esim_installation_status` (enum), `iccid` (string), `id` (uuid), `imsi` (string), `ipv4` (string), `ipv6` (string), `live_data_session` (enum), `msisdn` (string), `pin_puk_codes` (object), `record_type` (string), `resources_with_in_progress_actions` (array[object]), `sim_card_group_id` (uuid), `status` (object), `tags` (array[string]), `type` (enum), `updated_at` (string), `version` (string)

```python
sim_card = client.sim_cards.update(
    sim_card_id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card.data)
```

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged.<br />The SIM card won't be able to connect to the network after the deletion is completed, thus makin...

`DELETE /sim_cards/{id}`

```python
sim_card = client.sim_cards.delete(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(sim_card.data)
```

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data.<br/>
The API will trigger an asynchronous operation called a SIM Card Action.

`POST /sim_cards/{id}/actions/disable`

```python
response = client.sim_cards.actions.disable(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data.<br/>
To enable a SIM card, it must be associated with a SIM card group.<br/>
The API will trigger a...

`POST /sim_cards/{id}/actions/enable`

```python
response = client.sim_cards.actions.enable(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.

`POST /sim_cards/{id}/actions/remove_public_ip`

```python
response = client.sim_cards.actions.remove_public_ip(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.

`POST /sim_cards/{id}/actions/set_public_ip`

```python
response = client.sim_cards.actions.set_public_ip(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data.<br/>
To set a SIM card to standby, it must be ...

`POST /sim_cards/{id}/actions/set_standby`

```python
response = client.sim_cards.actions.set_standby(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Get activation code for an eSIM

It returns the activation code for an eSIM.<br/><br/>
 This API is only available for eSIMs.

`GET /sim_cards/{id}/activation_code`

```python
response = client.sim_cards.get_activation_code(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`GET /sim_cards/{id}/device_details`

```python
response = client.sim_cards.get_device_details(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`GET /sim_cards/{id}/public_ip`

```python
response = client.sim_cards.get_public_ip(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(response.data)
```

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`GET /sim_cards/{id}/wireless_connectivity_logs`

```python
page = client.sim_cards.list_wireless_connectivity_logs(
    id="6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
page = page.data[0]
print(page.id)
```

## List Migration Source coverage

`GET /storage/migration_source_coverage`

```python
response = client.storage.list_migration_source_coverage()
print(response.data)
```

## List all Migration Sources

`GET /storage/migration_sources`

```python
migration_sources = client.storage.migration_sources.list()
print(migration_sources.data)
```

## Create a Migration Source

Create a source from which data can be migrated from.

`POST /storage/migration_sources` — Required: `provider`, `provider_auth`, `bucket_name`

Optional: `id` (string), `source_region` (string)

```python
migration_source = client.storage.migration_sources.create(
    bucket_name="bucket_name",
    provider="aws",
    provider_auth={},
)
print(migration_source.data)
```

## Get a Migration Source

`GET /storage/migration_sources/{id}`

```python
migration_source = client.storage.migration_sources.retrieve(
    "",
)
print(migration_source.data)
```

## Delete a Migration Source

`DELETE /storage/migration_sources/{id}`

```python
migration_source = client.storage.migration_sources.delete(
    "",
)
print(migration_source.data)
```

## List all Migrations

`GET /storage/migrations`

```python
migrations = client.storage.migrations.list()
print(migrations.data)
```

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage.

`POST /storage/migrations` — Required: `source_id`, `target_bucket_name`, `target_region`

Optional: `bytes_migrated` (integer), `bytes_to_migrate` (integer), `created_at` (date-time), `eta` (date-time), `id` (string), `last_copy` (date-time), `refresh` (boolean), `speed` (integer), `status` (enum)

```python
migration = client.storage.migrations.create(
    source_id="source_id",
    target_bucket_name="target_bucket_name",
    target_region="target_region",
)
print(migration.data)
```

## Get a Migration

`GET /storage/migrations/{id}`

```python
migration = client.storage.migrations.retrieve(
    "",
)
print(migration.data)
```

## Stop a Migration

`POST /storage/migrations/{id}/actions/stop`

```python
response = client.storage.migrations.actions.stop(
    "",
)
print(response.data)
```

## List Mobile Voice Connections

`GET /v2/mobile_voice_connections`

```python
page = client.mobile_voice_connections.list()
page = page.data[0]
print(page.id)
```

## Create a Mobile Voice Connection

`POST /v2/mobile_voice_connections`

Optional: `active` (boolean), `connection_name` (string), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (['string', 'null']), `webhook_event_url` (['string', 'null']), `webhook_timeout_secs` (['integer', 'null'])

```python
mobile_voice_connection = client.mobile_voice_connections.create()
print(mobile_voice_connection.data)
```

## Retrieve a Mobile Voice Connection

`GET /v2/mobile_voice_connections/{id}`

```python
mobile_voice_connection = client.mobile_voice_connections.retrieve(
    "id",
)
print(mobile_voice_connection.data)
```

## Update a Mobile Voice Connection

`PATCH /v2/mobile_voice_connections/{id}`

Optional: `active` (boolean), `connection_name` (string), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (['string', 'null']), `webhook_event_url` (['string', 'null']), `webhook_timeout_secs` (integer)

```python
mobile_voice_connection = client.mobile_voice_connections.update(
    id="id",
)
print(mobile_voice_connection.data)
```

## Delete a Mobile Voice Connection

`DELETE /v2/mobile_voice_connections/{id}`

```python
mobile_voice_connection = client.mobile_voice_connections.delete(
    "id",
)
print(mobile_voice_connection.data)
```

## Get all wireless regions

Retrieve all wireless regions for the given product.

`GET /wireless/regions`

```python
response = client.wireless.retrieve_regions(
    product="public_ips",
)
print(response.data)
```

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`GET /wireless_blocklist_values`

```python
wireless_blocklist_values = client.wireless_blocklist_values.list(
    type="country",
)
print(wireless_blocklist_values.data)
```

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`GET /wireless_blocklists`

```python
page = client.wireless_blocklists.list()
page = page.data[0]
print(page.id)
```

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`POST /wireless_blocklists` — Required: `name`, `type`, `values`

```python
wireless_blocklist = client.wireless_blocklists.create(
    name="My Wireless Blocklist",
    type="country",
    values=["CA", "US"],
)
print(wireless_blocklist.data)
```

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`PATCH /wireless_blocklists`

Optional: `name` (string), `type` (enum), `values` (array[object])

```python
wireless_blocklist = client.wireless_blocklists.update()
print(wireless_blocklist.data)
```

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`GET /wireless_blocklists/{id}`

```python
wireless_blocklist = client.wireless_blocklists.retrieve(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireless_blocklist.data)
```

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`DELETE /wireless_blocklists/{id}`

```python
wireless_blocklist = client.wireless_blocklists.delete(
    "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
)
print(wireless_blocklist.data)
```
