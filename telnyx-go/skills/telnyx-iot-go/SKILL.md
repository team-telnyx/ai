---
name: telnyx-iot-go
description: >-
  Manage IoT SIM cards, eSIMs, data plans, and wireless connectivity. Use when
  building IoT/M2M solutions. This skill provides Go SDK examples.
metadata:
  author: telnyx
  product: iot
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Iot - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.<br/><br/>
If <code>sim_card_group_id</code> is provided, the eSIMs will be associated with that group.

`POST /actions/purchase/esims` — Required: `amount`

Optional: `product` (string), `sim_card_group_id` (uuid), `status` (enum), `tags` (array[string]), `whitelabel_name` (string)

```go
	purchase, err := client.Actions.Purchase.New(context.TODO(), telnyx.ActionPurchaseNewParams{
		Amount: 10,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", purchase.Data)
```

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.<br/><br/>
If <code>sim_card_group_id</code> is provided, the SIM cards will be associated with ...

`POST /actions/register/sim_cards` — Required: `registration_codes`

Optional: `sim_card_group_id` (uuid), `status` (enum), `tags` (array[string])

```go
	register, err := client.Actions.Register.New(context.TODO(), telnyx.ActionRegisterNewParams{
		RegistrationCodes: []string{"0000000001", "0000000002", "0000000003"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", register.Data)
```

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions.

`GET /bulk_sim_card_actions`

```go
	page, err := client.BulkSimCardActions.List(context.TODO(), telnyx.BulkSimCardActionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action.

`GET /bulk_sim_card_actions/{id}`

```go
	bulkSimCardAction, err := client.BulkSimCardActions.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", bulkSimCardAction.Data)
```

## List OTA updates

`GET /ota_updates`

```go
	page, err := client.OtaUpdates.List(context.TODO(), telnyx.OtaUpdateListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`GET /ota_updates/{id}`

```go
	otaUpdate, err := client.OtaUpdates.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", otaUpdate.Data)
```

## List SIM card actions

This API lists a paginated collection of SIM card actions.

`GET /sim_card_actions`

```go
	page, err := client.SimCards.Actions.List(context.TODO(), telnyx.SimCardActionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`GET /sim_card_actions/{id}`

```go
	action, err := client.SimCards.Actions.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", action.Data)
```

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications.

`GET /sim_card_data_usage_notifications`

```go
	page, err := client.SimCardDataUsageNotifications.List(context.TODO(), telnyx.SimCardDataUsageNotificationListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`POST /sim_card_data_usage_notifications` — Required: `sim_card_id`, `threshold`

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.New(context.TODO(), telnyx.SimCardDataUsageNotificationNewParams{
		SimCardID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		Threshold: telnyx.SimCardDataUsageNotificationNewParamsThreshold{},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`GET /sim_card_data_usage_notifications/{id}`

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`PATCH /sim_card_data_usage_notifications/{id}`

Optional: `created_at` (string), `id` (uuid), `record_type` (string), `sim_card_id` (uuid), `threshold` (object), `updated_at` (string)

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.Update(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardDataUsageNotificationUpdateParams{
			SimCardDataUsageNotification: telnyx.SimCardDataUsageNotificationParam{},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`DELETE /sim_card_data_usage_notifications/{id}`

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.Delete(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions.

`GET /sim_card_group_actions`

```go
	page, err := client.SimCardGroups.Actions.List(context.TODO(), telnyx.SimCardGroupActionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`GET /sim_card_group_actions/{id}`

```go
	action, err := client.SimCardGroups.Actions.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", action.Data)
```

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`GET /sim_card_groups`

```go
	page, err := client.SimCardGroups.List(context.TODO(), telnyx.SimCardGroupListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a SIM card group

Creates a new SIM card group object

`POST /sim_card_groups` — Required: `name`

Optional: `data_limit` (object)

```go
	simCardGroup, err := client.SimCardGroups.New(context.TODO(), telnyx.SimCardGroupNewParams{
		Name: "My Test Group",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

## Get SIM card group

Returns the details regarding a specific SIM card group

`GET /sim_card_groups/{id}`

```go
	simCardGroup, err := client.SimCardGroups.Get(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupGetParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

## Update a SIM card group

Updates a SIM card group

`PATCH /sim_card_groups/{id}`

Optional: `data_limit` (object), `name` (string)

```go
	simCardGroup, err := client.SimCardGroups.Update(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

## Delete a SIM card group

Permanently deletes a SIM card group

`DELETE /sim_card_groups/{id}`

```go
	simCardGroup, err := client.SimCardGroups.Delete(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group.

`POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

```go
	response, err := client.SimCardGroups.Actions.RemovePrivateWirelessGateway(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

```go
	response, err := client.SimCardGroups.Actions.RemoveWirelessBlocklist(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group.

`POST /sim_card_groups/{id}/actions/set_private_wireless_gateway` — Required: `private_wireless_gateway_id`

```go
	response, err := client.SimCardGroups.Actions.SetPrivateWirelessGateway(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupActionSetPrivateWirelessGatewayParams{
			PrivateWirelessGatewayID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`POST /sim_card_groups/{id}/actions/set_wireless_blocklist` — Required: `wireless_blocklist_id`

```go
	response, err := client.SimCardGroups.Actions.SetWirelessBlocklist(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupActionSetWirelessBlocklistParams{
			WirelessBlocklistID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Preview SIM card orders

Preview SIM card order purchases.

`POST /sim_card_order_preview` — Required: `quantity`, `address_id`

```go
	response, err := client.SimCardOrderPreview.Preview(context.TODO(), telnyx.SimCardOrderPreviewPreviewParams{
		AddressID: "1293384261075731499",
		Quantity:  21,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get all SIM card orders

Get all SIM card orders according to filters.

`GET /sim_card_orders`

```go
	page, err := client.SimCardOrders.List(context.TODO(), telnyx.SimCardOrderListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a SIM card order

Creates a new order for SIM cards.

`POST /sim_card_orders` — Required: `address_id`, `quantity`

```go
	simCardOrder, err := client.SimCardOrders.New(context.TODO(), telnyx.SimCardOrderNewParams{
		AddressID: "1293384261075731499",
		Quantity:  23,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardOrder.Data)
```

## Get a single SIM card order

Get a single SIM card order by its ID.

`GET /sim_card_orders/{id}`

```go
	simCardOrder, err := client.SimCardOrders.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCardOrder.Data)
```

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`GET /sim_cards`

```go
	page, err := client.SimCards.List(context.TODO(), telnyx.SimCardListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards.<br/>
For each SIM Card a SIM Card Action will be generated.

`POST /sim_cards/actions/bulk_set_public_ips` — Required: `sim_card_ids`

```go
	response, err := client.SimCards.Actions.BulkSetPublicIPs(context.TODO(), telnyx.SimCardActionBulkSetPublicIPsParams{
		SimCardIDs: []string{"6b14e151-8493-4fa1-8664-1cc4e6d14158"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`POST /sim_cards/actions/validate_registration_codes`

Optional: `registration_codes` (array[string])

```go
	response, err := client.SimCards.Actions.ValidateRegistrationCodes(context.TODO(), telnyx.SimCardActionValidateRegistrationCodesParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get SIM card

Returns the details regarding a specific SIM card.

`GET /sim_cards/{id}`

```go
	simCard, err := client.SimCards.Get(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGetParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCard.Data)
```

## Update a SIM card

Updates SIM card data

`PATCH /sim_cards/{id}`

Optional: `actions_in_progress` (boolean), `authorized_imeis` (['array', 'null']), `created_at` (string), `current_billing_period_consumed_data` (object), `current_device_location` (object), `current_imei` (string), `current_mcc` (string), `current_mnc` (string), `data_limit` (object), `eid` (['string', 'null']), `esim_installation_status` (enum), `iccid` (string), `id` (uuid), `imsi` (string), `ipv4` (string), `ipv6` (string), `live_data_session` (enum), `msisdn` (string), `pin_puk_codes` (object), `record_type` (string), `resources_with_in_progress_actions` (array[object]), `sim_card_group_id` (uuid), `status` (object), `tags` (array[string]), `type` (enum), `updated_at` (string), `version` (string)

```go
	simCard, err := client.SimCards.Update(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardUpdateParams{
			SimCard: telnyx.SimCardParam{},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCard.Data)
```

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged.<br />The SIM card won't be able to connect to the network after the deletion is completed, thus makin...

`DELETE /sim_cards/{id}`

```go
	simCard, err := client.SimCards.Delete(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardDeleteParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", simCard.Data)
```

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data.<br/>
The API will trigger an asynchronous operation called a SIM Card Action.

`POST /sim_cards/{id}/actions/disable`

```go
	response, err := client.SimCards.Actions.Disable(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data.<br/>
To enable a SIM card, it must be associated with a SIM card group.<br/>
The API will trigger a...

`POST /sim_cards/{id}/actions/enable`

```go
	response, err := client.SimCards.Actions.Enable(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.

`POST /sim_cards/{id}/actions/remove_public_ip`

```go
	response, err := client.SimCards.Actions.RemovePublicIP(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.

`POST /sim_cards/{id}/actions/set_public_ip`

```go
	response, err := client.SimCards.Actions.SetPublicIP(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardActionSetPublicIPParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data.<br/>
To set a SIM card to standby, it must be ...

`POST /sim_cards/{id}/actions/set_standby`

```go
	response, err := client.SimCards.Actions.SetStandby(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get activation code for an eSIM

It returns the activation code for an eSIM.<br/><br/>
 This API is only available for eSIMs.

`GET /sim_cards/{id}/activation_code`

```go
	response, err := client.SimCards.GetActivationCode(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`GET /sim_cards/{id}/device_details`

```go
	response, err := client.SimCards.GetDeviceDetails(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`GET /sim_cards/{id}/public_ip`

```go
	response, err := client.SimCards.GetPublicIP(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`GET /sim_cards/{id}/wireless_connectivity_logs`

```go
	page, err := client.SimCards.ListWirelessConnectivityLogs(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardListWirelessConnectivityLogsParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## List Migration Source coverage

`GET /storage/migration_source_coverage`

```go
	response, err := client.Storage.ListMigrationSourceCoverage(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all Migration Sources

`GET /storage/migration_sources`

```go
	migrationSources, err := client.Storage.MigrationSources.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migrationSources.Data)
```

## Create a Migration Source

Create a source from which data can be migrated from.

`POST /storage/migration_sources` — Required: `provider`, `provider_auth`, `bucket_name`

Optional: `id` (string), `source_region` (string)

```go
	migrationSource, err := client.Storage.MigrationSources.New(context.TODO(), telnyx.StorageMigrationSourceNewParams{
		MigrationSourceParams: telnyx.MigrationSourceParams{
			BucketName:   "bucket_name",
			Provider:     telnyx.MigrationSourceParamsProviderAws,
			ProviderAuth: telnyx.MigrationSourceParamsProviderAuth{},
		},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migrationSource.Data)
```

## Get a Migration Source

`GET /storage/migration_sources/{id}`

```go
	migrationSource, err := client.Storage.MigrationSources.Get(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migrationSource.Data)
```

## Delete a Migration Source

`DELETE /storage/migration_sources/{id}`

```go
	migrationSource, err := client.Storage.MigrationSources.Delete(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migrationSource.Data)
```

## List all Migrations

`GET /storage/migrations`

```go
	migrations, err := client.Storage.Migrations.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migrations.Data)
```

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage.

`POST /storage/migrations` — Required: `source_id`, `target_bucket_name`, `target_region`

Optional: `bytes_migrated` (integer), `bytes_to_migrate` (integer), `created_at` (date-time), `eta` (date-time), `id` (string), `last_copy` (date-time), `refresh` (boolean), `speed` (integer), `status` (enum)

```go
	migration, err := client.Storage.Migrations.New(context.TODO(), telnyx.StorageMigrationNewParams{
		MigrationParams: telnyx.MigrationParams{
			SourceID:         "source_id",
			TargetBucketName: "target_bucket_name",
			TargetRegion:     "target_region",
		},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migration.Data)
```

## Get a Migration

`GET /storage/migrations/{id}`

```go
	migration, err := client.Storage.Migrations.Get(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", migration.Data)
```

## Stop a Migration

`POST /storage/migrations/{id}/actions/stop`

```go
	response, err := client.Storage.Migrations.Actions.Stop(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List Mobile Voice Connections

`GET /v2/mobile_voice_connections`

```go
	page, err := client.MobileVoiceConnections.List(context.TODO(), telnyx.MobileVoiceConnectionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a Mobile Voice Connection

`POST /v2/mobile_voice_connections`

Optional: `active` (boolean), `connection_name` (string), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (['string', 'null']), `webhook_event_url` (['string', 'null']), `webhook_timeout_secs` (['integer', 'null'])

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.New(context.TODO(), telnyx.MobileVoiceConnectionNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

## Retrieve a Mobile Voice Connection

`GET /v2/mobile_voice_connections/{id}`

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

## Update a Mobile Voice Connection

`PATCH /v2/mobile_voice_connections/{id}`

Optional: `active` (boolean), `connection_name` (string), `inbound` (object), `outbound` (object), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (['string', 'null']), `webhook_event_url` (['string', 'null']), `webhook_timeout_secs` (integer)

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.Update(
		context.TODO(),
		"id",
		telnyx.MobileVoiceConnectionUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

## Delete a Mobile Voice Connection

`DELETE /v2/mobile_voice_connections/{id}`

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.Delete(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

## Get all wireless regions

Retrieve all wireless regions for the given product.

`GET /wireless/regions`

```go
	response, err := client.Wireless.GetRegions(context.TODO(), telnyx.WirelessGetRegionsParams{
		Product: "public_ips",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`GET /wireless_blocklist_values`

```go
	wirelessBlocklistValues, err := client.WirelessBlocklistValues.List(context.TODO(), telnyx.WirelessBlocklistValueListParams{
		Type: telnyx.WirelessBlocklistValueListParamsTypeCountry,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", wirelessBlocklistValues.Data)
```

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`GET /wireless_blocklists`

```go
	page, err := client.WirelessBlocklists.List(context.TODO(), telnyx.WirelessBlocklistListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`POST /wireless_blocklists` — Required: `name`, `type`, `values`

```go
	wirelessBlocklist, err := client.WirelessBlocklists.New(context.TODO(), telnyx.WirelessBlocklistNewParams{
		Name:   "My Wireless Blocklist",
		Type:   telnyx.WirelessBlocklistNewParamsTypeCountry,
		Values: []string{"CA", "US"},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`PATCH /wireless_blocklists`

Optional: `name` (string), `type` (enum), `values` (array[object])

```go
	wirelessBlocklist, err := client.WirelessBlocklists.Update(context.TODO(), telnyx.WirelessBlocklistUpdateParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`GET /wireless_blocklists/{id}`

```go
	wirelessBlocklist, err := client.WirelessBlocklists.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`DELETE /wireless_blocklists/{id}`

```go
	wirelessBlocklist, err := client.WirelessBlocklists.Delete(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```
