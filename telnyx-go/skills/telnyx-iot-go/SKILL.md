---
name: telnyx-iot-go
description: >-
  IoT SIM cards, eSIMs, data plans, and wireless connectivity for M2M solutions.
metadata:
  author: telnyx
  product: iot
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Iot - Go

## Core Workflow

### Prerequisites

1. Purchase SIM cards (physical SIM, eSIM chip MFF2, or eSIM OTA)
2. For physical SIMs: register via 10-digit code or CSV batch upload
3. Insert SIM and configure APN: Name='Telnyx', APN='data00.telnyx' (leave all other fields blank)
4. Enable data roaming on device and reboot

### Steps

1. **Order SIMs**: `client.SimCards.List(ctx, params)`
2. **Register SIMs**: `client.SimCards.Register(ctx, params)`
3. **Activate SIM**: `client.SimCards.Activate(ctx, params)`
4. **Monitor usage**: `client.SimCards.Retrieve(ctx, params)`

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

**Related skills**: telnyx-networking-go

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.SimCards.List(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.  
If `sim_card_group_id` is provided, the eSIMs will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.Actions.Purchase.New()` — `POST /actions/purchase/esims`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Amount` | integer | Yes | The amount of eSIMs to be purchased. |
| `Tags` | array[string] | No | Searchable tags associated with the SIM cards |
| `SimCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| `Status` | enum (enabled, disabled, standby) | No | Status on which the SIM cards will be set after being succes... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	purchase, err := client.Actions.Purchase.New(context.Background(), telnyx.ActionPurchaseNewParams{
		Amount: 10,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", purchase.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.  
If `sim_card_group_id` is provided, the SIM cards will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.Actions.Register.New()` — `POST /actions/register/sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RegistrationCodes` | array[string] | Yes |  |
| `Tags` | array[string] | No | Searchable tags associated with the SIM card |
| `SimCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| `Status` | enum (enabled, disabled, standby) | No | Status on which the SIM card will be set after being success... |

```go
	register, err := client.Actions.Register.New(context.Background(), telnyx.ActionRegisterNewParams{
		RegistrationCodes: []string{"0000000001", "0000000002", "0000000003"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", register.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`client.SimCards.List()` — `GET /sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (current_billing_period_consumed_data.amount, -current_billing_period_consumed_data.amount) | No | Sorts SIM cards by the given field. |
| `Filter` | object | No | Consolidated filter parameter for SIM cards (deepObject styl... |
| `Page` | object | No | Consolidated pagination parameter (deepObject style). |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.SimCards.List(context.Background(), telnyx.SimCardListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card

Returns the details regarding a specific SIM card.

`client.SimCards.Get()` — `GET /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |
| `IncludeSimCardGroup` | boolean | No | It includes the associated SIM card group object in the resp... |
| `IncludePinPukCodes` | boolean | No | When set to true, includes the PIN and PUK codes in the resp... |

```go
	simCard, err := client.SimCards.Get(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCard.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Create a SIM card order

Creates a new order for SIM cards.

`client.SimCardOrders.New()` — `POST /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AddressId` | string (UUID) | Yes | Uniquely identifies the address for the order. |
| `Quantity` | integer | Yes | The amount of SIM cards to order. |

```go
	simCardOrder, err := client.SimCardOrders.New(context.Background(), telnyx.SimCardOrderNewParams{
		AddressID: "1293384261075731499",
		Quantity:  23,
		SimCardGroupID: "550e8400-e29b-41d4-a716-446655440000",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a SIM card group

Creates a new SIM card group object

`client.SimCardGroups.New()` — `POST /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | A user friendly name for the SIM card group. |
| `DataLimit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```go
	simCardGroup, err := client.SimCardGroups.New(context.Background(), telnyx.SimCardGroupNewParams{
		Name: "My Test Group",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.BulkSimCardActions.List()` — `GET /bulk_sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter[actionType]` | enum (bulk_set_public_ips) | No | Filter by action type. |
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |

```go
	page, err := client.BulkSimCardActions.List(context.Background(), telnyx.BulkSimCardActionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.BulkSimCardActions.Get()` — `GET /bulk_sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	bulkSimCardAction, err := client.BulkSimCardActions.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", bulkSimCardAction.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List OTA updates

`client.OtaUpdates.List()` — `GET /ota_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for OTA updates (deepObject st... |
| `Page` | object | No | Consolidated pagination parameter (deepObject style). |

```go
	page, err := client.OtaUpdates.List(context.Background(), telnyx.OtaUpdateListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`client.OtaUpdates.Get()` — `GET /ota_updates/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	otaUpdate, err := client.OtaUpdates.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", otaUpdate.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List SIM card actions

This API lists a paginated collection of SIM card actions. It enables exploring a collection of existing asynchronous operations using specific filters.

`client.SimCards.Actions.List()` — `GET /sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for SIM card actions (deepObje... |
| `Page` | object | No | Consolidated pagination parameter (deepObject style). |

```go
	page, err := client.SimCards.Actions.List(context.Background(), telnyx.SimCardActionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`client.SimCards.Actions.Get()` — `GET /sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	action, err := client.SimCards.Actions.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", action.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications. It enables exploring the collection using specific filters.

`client.SimCardDataUsageNotifications.List()` — `GET /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |
| `Filter[simCardId]` | string (UUID) | No | A valid SIM card ID. |

```go
	page, err := client.SimCardDataUsageNotifications.List(context.Background(), telnyx.SimCardDataUsageNotificationListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`client.SimCardDataUsageNotifications.New()` — `POST /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SimCardId` | string (UUID) | Yes | The identification UUID of the related SIM card resource. |
| `Threshold` | object | Yes | Data usage threshold that will trigger the notification. |

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.New(context.Background(), telnyx.SimCardDataUsageNotificationNewParams{
		SimCardID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		Threshold: telnyx.SimCardDataUsageNotificationNewParamsThreshold{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`client.SimCardDataUsageNotifications.Get()` — `GET /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`client.SimCardDataUsageNotifications.Update()` — `PATCH /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `SimCardId` | string (UUID) | No | The identification UUID of the related SIM card resource. |
| `Id` | string (UUID) | No | Identifies the resource. |
| `RecordType` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardDataUsageNotificationUpdateParams{
			SimCardDataUsageNotification: telnyx.SimCardDataUsageNotificationParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`client.SimCardDataUsageNotifications.Delete()` — `DELETE /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	simCardDataUsageNotification, err := client.SimCardDataUsageNotifications.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardDataUsageNotification.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions. It allows to explore a collection of existing asynchronous operation using specific filters.

`client.SimCardGroups.Actions.List()` — `GET /sim_card_group_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter[status]` | enum (in-progress, completed, failed) | No | Filter by a specific status of the resource's lifecycle. |
| `Filter[type]` | enum (set_private_wireless_gateway, remove_private_wireless_gateway, set_wireless_blocklist, remove_wireless_blocklist) | No | Filter by action type. |
| `Page[number]` | integer | No | The page number to load. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.SimCardGroups.Actions.List(context.Background(), telnyx.SimCardGroupActionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`client.SimCardGroups.Actions.Get()` — `GET /sim_card_group_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	action, err := client.SimCardGroups.Actions.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", action.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`client.SimCardGroups.List()` — `GET /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |
| `Filter[name]` | string | No | A valid SIM card group name. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.SimCardGroups.List(context.Background(), telnyx.SimCardGroupListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get SIM card group

Returns the details regarding a specific SIM card group

`client.SimCardGroups.Get()` — `GET /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM group. |
| `IncludeIccids` | boolean | No | It includes a list of associated ICCIDs. |

```go
	simCardGroup, err := client.SimCardGroups.Get(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a SIM card group

Updates a SIM card group

`client.SimCardGroups.Update()` — `PATCH /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM group. |
| `Name` | string | No | A user friendly name for the SIM card group. |
| `DataLimit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```go
	simCardGroup, err := client.SimCardGroups.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a SIM card group

Permanently deletes a SIM card group

`client.SimCardGroups.Delete()` — `DELETE /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM group. |

```go
	simCardGroup, err := client.SimCardGroups.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic handled by Telnyx's default mobile network configuration.

`client.SimCardGroups.Actions.RemovePrivateWirelessGateway()` — `POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM group. |

```go
	response, err := client.SimCardGroups.Actions.RemovePrivateWirelessGateway(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`client.SimCardGroups.Actions.RemoveWirelessBlocklist()` — `POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM group. |

```go
	response, err := client.SimCardGroups.Actions.RemoveWirelessBlocklist(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic controlled by the associated Private Wireless Gateway. This operation will also imply that new SIM cards assigned to a group will inherit its network definitions.

`client.SimCardGroups.Actions.SetPrivateWirelessGateway()` — `POST /sim_card_groups/{id}/actions/set_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PrivateWirelessGatewayId` | string (UUID) | Yes | The identification of the related Private Wireless Gateway r... |
| `Id` | string (UUID) | Yes | Identifies the SIM group. |

```go
	response, err := client.SimCardGroups.Actions.SetPrivateWirelessGateway(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupActionSetPrivateWirelessGatewayParams{
			PrivateWirelessGatewayID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`client.SimCardGroups.Actions.SetWirelessBlocklist()` — `POST /sim_card_groups/{id}/actions/set_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `WirelessBlocklistId` | string (UUID) | Yes | The identification of the related Wireless Blocklist resourc... |
| `Id` | string (UUID) | Yes | Identifies the SIM group. |

```go
	response, err := client.SimCardGroups.Actions.SetWirelessBlocklist(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardGroupActionSetWirelessBlocklistParams{
			WirelessBlocklistID: "6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Preview SIM card orders

Preview SIM card order purchases.

`client.SimCardOrderPreview.Preview()` — `POST /sim_card_order_preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Quantity` | integer | Yes | The amount of SIM cards that the user would like to purchase... |
| `AddressId` | string (UUID) | Yes | Uniquely identifies the address for the order. |

```go
	response, err := client.SimCardOrderPreview.Preview(context.Background(), telnyx.SimCardOrderPreviewPreviewParams{
		AddressID: "1293384261075731499",
		Quantity:  21,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.quantity, response.data.record_type, response.data.shipping_cost`

## Get all SIM card orders

Get all SIM card orders according to filters.

`client.SimCardOrders.List()` — `GET /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for SIM card orders (deepObjec... |
| `Page` | object | No | Consolidated pagination parameter (deepObject style). |

```go
	page, err := client.SimCardOrders.List(context.Background(), telnyx.SimCardOrderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single SIM card order

Get a single SIM card order by its ID.

`client.SimCardOrders.Get()` — `GET /sim_card_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	simCardOrder, err := client.SimCardOrders.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCardOrder.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request bulk disabling voice on SIM cards.

This API triggers an asynchronous operation to disable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.SimCards.Actions.BulkDisableVoice()` — `POST /sim_cards/actions/bulk_disable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SimCardGroupId` | string (UUID) | Yes |  |

```go
	response, err := client.SimCards.Actions.BulkDisableVoice(context.Background(), telnyx.SimCardActionBulkDisableVoiceParams{
		SimCardGroupID: "6b14e151-8493-4fa1-8664-1cc4e6d14158",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk enabling voice on SIM cards.

This API triggers an asynchronous operation to enable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.SimCards.Actions.BulkEnableVoice()` — `POST /sim_cards/actions/bulk_enable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SimCardGroupId` | string (UUID) | Yes |  |

```go
	response, err := client.SimCards.Actions.BulkEnableVoice(context.Background(), telnyx.SimCardActionBulkEnableVoiceParams{
		SimCardGroupID: "6b14e151-8493-4fa1-8664-1cc4e6d14158",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards. 
For each SIM Card a SIM Card Action will be generated. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.SimCards.Actions.BulkSetPublicIPs()` — `POST /sim_cards/actions/bulk_set_public_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SimCardIds` | array[object] | Yes |  |

```go
	response, err := client.SimCards.Actions.BulkSetPublicIPs(context.Background(), telnyx.SimCardActionBulkSetPublicIPsParams{
		SimCardIDs: []string{"6b14e151-8493-4fa1-8664-1cc4e6d14158"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`client.SimCards.Actions.ValidateRegistrationCodes()` — `POST /sim_cards/actions/validate_registration_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RegistrationCodes` | array[string] | No |  |

```go
	response, err := client.SimCards.Actions.ValidateRegistrationCodes(context.Background(), telnyx.SimCardActionValidateRegistrationCodesParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.invalid_detail, response.data.record_type, response.data.registration_code`

## Update a SIM card

Updates SIM card data

`client.SimCards.Update()` — `PATCH /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |
| `Type` | enum (physical, esim) | No | The type of SIM card |
| `Tags` | array[string] | No | Searchable tags associated with the SIM card |
| `SimCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| ... | | | +25 optional params in [references/api-details.md](references/api-details.md) |

```go
	simCard, err := client.SimCards.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardUpdateParams{
			SimCard: telnyx.SimCardParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCard.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged. The SIM card won't be able to connect to the network after the deletion is completed, thus making it impossible to consume data. 
Transitioning to the disabled state may take a period of time.

`client.SimCards.Delete()` — `DELETE /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |
| `ReportLost` | boolean | No | Enables deletion of disabled eSIMs that can't be uninstalled... |

```go
	simCard, err := client.SimCards.Delete(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardDeleteParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", simCard.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the disabled state may take a period of time.

`client.SimCards.Actions.Disable()` — `POST /sim_cards/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.Actions.Disable(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data. 
To enable a SIM card, it must be associated with a SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the enabled state may take a period of time.

`client.SimCards.Actions.Enable()` — `POST /sim_cards/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.Actions.Enable(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.SimCards.Actions.RemovePublicIP()` — `POST /sim_cards/{id}/actions/remove_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.Actions.RemovePublicIP(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action.

`client.SimCards.Actions.SetPublicIP()` — `POST /sim_cards/{id}/actions/set_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |
| `RegionCode` | string | No | The code of the region where the public IP should be assigne... |

```go
	response, err := client.SimCards.Actions.SetPublicIP(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardActionSetPublicIPParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data. 
To set a SIM card to standby, it must be associated with SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the standby state may take a period of time.

`client.SimCards.Actions.SetStandby()` — `POST /sim_cards/{id}/actions/set_standby`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.Actions.SetStandby(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get activation code for an eSIM

It returns the activation code for an eSIM.  
 This API is only available for eSIMs. If the given SIM is a physical SIM card, or has already been installed, an error will be returned.

`client.SimCards.GetActivationCode()` — `GET /sim_cards/{id}/activation_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.GetActivationCode(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.activation_code, response.data.record_type`

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`client.SimCards.GetDeviceDetails()` — `GET /sim_cards/{id}/device_details`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.GetDeviceDetails(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.brand_name, response.data.device_type, response.data.imei`

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`client.SimCards.GetPublicIP()` — `GET /sim_cards/{id}/public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |

```go
	response, err := client.SimCards.GetPublicIP(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.type, response.data.created_at, response.data.updated_at`

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`client.SimCards.ListWirelessConnectivityLogs()` — `GET /sim_cards/{id}/wireless_connectivity_logs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the SIM. |
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |

```go
	page, err := client.SimCards.ListWirelessConnectivityLogs(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.SimCardListWirelessConnectivityLogsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.state, response.data.created_at`

## List Migration Source coverage

`client.Storage.ListMigrationSourceCoverage()` — `GET /storage/migration_source_coverage`

```go
	response, err := client.Storage.ListMigrationSourceCoverage(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.provider, response.data.source_region`

## List all Migration Sources

`client.Storage.MigrationSources.List()` — `GET /storage/migration_sources`

```go
	migrationSources, err := client.Storage.MigrationSources.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migrationSources.Data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Create a Migration Source

Create a source from which data can be migrated from.

`client.Storage.MigrationSources.New()` — `POST /storage/migration_sources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Provider` | enum (aws, telnyx) | Yes | Cloud provider from which to migrate data. |
| `ProviderAuth` | object | Yes |  |
| `BucketName` | string | Yes | Bucket name to migrate the data from. |
| `Id` | string (UUID) | No | Unique identifier for the data migration source. |
| `SourceRegion` | string | No | For intra-Telnyx buckets migration, specify the source bucke... |

```go
	migrationSource, err := client.Storage.MigrationSources.New(context.Background(), telnyx.StorageMigrationSourceNewParams{
		MigrationSourceParams: telnyx.MigrationSourceParams{
			BucketName: "my-bucket",
			Provider:     telnyx.MigrationSourceParamsProviderAws,
			ProviderAuth: telnyx.MigrationSourceParamsProviderAuth{},
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migrationSource.Data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Get a Migration Source

`client.Storage.MigrationSources.Get()` — `GET /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```go
	migrationSource, err := client.Storage.MigrationSources.Get(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migrationSource.Data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Delete a Migration Source

`client.Storage.MigrationSources.Delete()` — `DELETE /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```go
	migrationSource, err := client.Storage.MigrationSources.Delete(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migrationSource.Data)
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## List all Migrations

`client.Storage.Migrations.List()` — `GET /storage/migrations`

```go
	migrations, err := client.Storage.Migrations.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migrations.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage. Currently, only S3 is supported.

`client.Storage.Migrations.New()` — `POST /storage/migrations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SourceId` | string (UUID) | Yes | ID of the Migration Source from which to migrate data. |
| `TargetBucketName` | string | Yes | Bucket name to migrate the data into. |
| `TargetRegion` | string | Yes | Telnyx Cloud Storage region to migrate the data to. |
| `Status` | enum (pending, checking, migrating, complete, error, ...) | No | Status of the migration. |
| `Id` | string (UUID) | No | Unique identifier for the data migration. |
| `Refresh` | boolean | No | If true, will continue to poll the source bucket to ensure n... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	migration, err := client.Storage.Migrations.New(context.Background(), telnyx.StorageMigrationNewParams{
		MigrationParams: telnyx.MigrationParams{
			SourceID: "550e8400-e29b-41d4-a716-446655440000",
			TargetBucketName: "my-target-bucket",
			TargetRegion: "us-central-1",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migration.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Migration

`client.Storage.Migrations.Get()` — `GET /storage/migrations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Unique identifier for the data migration. |

```go
	migration, err := client.Storage.Migrations.Get(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", migration.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Stop a Migration

`client.Storage.Migrations.Actions.Stop()` — `POST /storage/migrations/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Unique identifier for the data migration. |

```go
	response, err := client.Storage.Migrations.Actions.Stop(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Mobile Voice Connections

`client.MobileVoiceConnections.List()` — `GET /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load |
| `Page[size]` | integer | No | The size of the page |
| `Filter[connectionName][contains]` | string | No | Filter by connection name containing the given string |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.MobileVoiceConnections.List(context.Background(), telnyx.MobileVoiceConnectionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Mobile Voice Connection

`client.MobileVoiceConnections.New()` — `POST /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Tags` | array[string] | No |  |
| `WebhookApiVersion` | enum (1, 2) | No |  |
| `Active` | boolean | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.New(context.Background(), telnyx.MobileVoiceConnectionNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Mobile Voice Connection

`client.MobileVoiceConnections.Get()` — `GET /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID of the mobile voice connection |

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Mobile Voice Connection

`client.MobileVoiceConnections.Update()` — `PATCH /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID of the mobile voice connection |
| `Tags` | array[string] | No |  |
| `WebhookApiVersion` | enum (1, 2) | No |  |
| `Active` | boolean | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.Update(
		context.Background(),
		"id",
		telnyx.MobileVoiceConnectionUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Mobile Voice Connection

`client.MobileVoiceConnections.Delete()` — `DELETE /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID of the mobile voice connection |

```go
	mobileVoiceConnection, err := client.MobileVoiceConnections.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobileVoiceConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get all wireless regions

Retrieve all wireless regions for the given product.

`client.Wireless.GetRegions()` — `GET /wireless/regions`

```go
	response, err := client.Wireless.GetRegions(context.Background(), telnyx.WirelessGetRegionsParams{
		Product: "public_ips",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.name, response.data.updated_at, response.data.code`

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`client.WirelessBlocklistValues.List()` — `GET /wireless_blocklist_values`

```go
	wirelessBlocklistValues, err := client.WirelessBlocklistValues.List(context.Background(), telnyx.WirelessBlocklistValueListParams{
		Type: telnyx.WirelessBlocklistValueListParamsTypeCountry,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wirelessBlocklistValues.Data)
```

Key response fields: `response.data.data, response.data.meta`

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`client.WirelessBlocklists.List()` — `GET /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load. |
| `Page[size]` | integer | No | The size of the page. |
| `Filter[name]` | string | No | The name of the Wireless Blocklist. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.WirelessBlocklists.List(context.Background(), telnyx.WirelessBlocklistListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`client.WirelessBlocklists.New()` — `POST /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | The name of the Wireless Blocklist. |
| `Type` | enum (country, mcc, plmn) | Yes | The type of wireless blocklist. |
| `Values` | array[object] | Yes | Values to block. |

```go
	wirelessBlocklist, err := client.WirelessBlocklists.New(context.Background(), telnyx.WirelessBlocklistNewParams{
		Name:   "My Wireless Blocklist",
		Type:   telnyx.WirelessBlocklistNewParamsTypeCountry,
		Values: []string{"CA", "US"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`client.WirelessBlocklists.Update()` — `PATCH /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Type` | enum (country, mcc, plmn) | No | The type of wireless blocklist. |
| `Name` | string | No | The name of the Wireless Blocklist. |
| `Values` | array[object] | No | Values to block. |

```go
	wirelessBlocklist, err := client.WirelessBlocklists.Update(context.Background(), telnyx.WirelessBlocklistUpdateParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`client.WirelessBlocklists.Get()` — `GET /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```go
	wirelessBlocklist, err := client.WirelessBlocklists.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`client.WirelessBlocklists.Delete()` — `DELETE /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```go
	wirelessBlocklist, err := client.WirelessBlocklists.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", wirelessBlocklist.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
