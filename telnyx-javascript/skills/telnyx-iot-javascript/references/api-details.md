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
