---
name: telnyx-iot-java
description: >-
  IoT SIM cards, eSIMs, data plans, and wireless connectivity for M2M solutions.
metadata:
  author: telnyx
  product: iot
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Iot - Java

## Core Workflow

### Prerequisites

1. Purchase SIM cards (physical SIM, eSIM chip MFF2, or eSIM OTA)
2. For physical SIMs: register via 10-digit code or CSV batch upload
3. Insert SIM and configure APN: Name='Telnyx', APN='data00.telnyx' (leave all other fields blank)
4. Enable data roaming on device and reboot

### Steps

1. **Order SIMs**: `client.simCards().list(params)`
2. **Register SIMs**: `client.simCards().register(params)`
3. **Activate SIM**: `client.simCards().activate(params)`
4. **Monitor usage**: `client.simCards().retrieve(params)`

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

**Related skills**: telnyx-networking-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.simCards().list(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Purchase eSIMs

Purchases and registers the specified amount of eSIMs to the current user's account.  
If `sim_card_group_id` is provided, the eSIMs will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.actions().purchase().create()` — `POST /actions/purchase/esims`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | integer | Yes | The amount of eSIMs to be purchased. |
| `tags` | array[string] | No | Searchable tags associated with the SIM cards |
| `simCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM cards will be set after being succes... |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.actions.purchase.PurchaseCreateParams;
import com.telnyx.sdk.models.actions.purchase.PurchaseCreateResponse;

PurchaseCreateParams params = PurchaseCreateParams.builder()
    .amount(10L)
    .build();
PurchaseCreateResponse purchase = client.actions().purchase().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Register SIM cards

Register the SIM cards associated with the provided registration codes to the current user's account.  
If `sim_card_group_id` is provided, the SIM cards will be associated with that group. Otherwise, the default group for the current user will be used.  

`client.actions().register().create()` — `POST /actions/register/sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registrationCodes` | array[string] | Yes |  |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `simCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| `status` | enum (enabled, disabled, standby) | No | Status on which the SIM card will be set after being success... |

```java
import com.telnyx.sdk.models.actions.register.RegisterCreateParams;
import com.telnyx.sdk.models.actions.register.RegisterCreateResponse;
import java.util.List;

RegisterCreateParams params = RegisterCreateParams.builder()
    .registrationCodes(List.of(
      "0000000001",
      "0000000002",
      "0000000003"
    ))
    .build();
RegisterCreateResponse register = client.actions().register().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM cards

Get all SIM cards belonging to the user that match the given filters.

`client.simCards().list()` — `GET /sim_cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (current_billing_period_consumed_data.amount, -current_billing_period_consumed_data.amount) | No | Sorts SIM cards by the given field. |
| `filter` | object | No | Consolidated filter parameter for SIM cards (deepObject styl... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.simcards.SimCardListPage;
import com.telnyx.sdk.models.simcards.SimCardListParams;

SimCardListPage page = client.simCards().list();
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card

Returns the details regarding a specific SIM card.

`client.simCards().retrieve()` — `GET /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `includeSimCardGroup` | boolean | No | It includes the associated SIM card group object in the resp... |
| `includePinPukCodes` | boolean | No | When set to true, includes the PIN and PUK codes in the resp... |

```java
import com.telnyx.sdk.models.simcards.SimCardRetrieveParams;
import com.telnyx.sdk.models.simcards.SimCardRetrieveResponse;

SimCardRetrieveResponse simCard = client.simCards().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Create a SIM card order

Creates a new order for SIM cards.

`client.simCardOrders().create()` — `POST /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addressId` | string (UUID) | Yes | Uniquely identifies the address for the order. |
| `quantity` | integer | Yes | The amount of SIM cards to order. |

```java
import com.telnyx.sdk.models.simcardorders.SimCardOrderCreateParams;
import com.telnyx.sdk.models.simcardorders.SimCardOrderCreateResponse;

SimCardOrderCreateParams params = SimCardOrderCreateParams.builder()
    .addressId("1293384261075731499")
    .quantity(23L)
    .simCardGroupId("550e8400-e29b-41d4-a716-446655440000")
    .build();
SimCardOrderCreateResponse simCardOrder = client.simCardOrders().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a SIM card group

Creates a new SIM card group object

`client.simCardGroups().create()` — `POST /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the SIM card group. |
| `dataLimit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```java
import com.telnyx.sdk.models.simcardgroups.SimCardGroupCreateParams;
import com.telnyx.sdk.models.simcardgroups.SimCardGroupCreateResponse;

SimCardGroupCreateParams params = SimCardGroupCreateParams.builder()
    .name("My Test Group")
    .build();
SimCardGroupCreateResponse simCardGroup = client.simCardGroups().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List bulk SIM card actions

This API lists a paginated collection of bulk SIM card actions. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.bulkSimCardActions().list()` — `GET /bulk_sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[actionType]` | enum (bulk_set_public_ips) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```java
import com.telnyx.sdk.models.bulksimcardactions.BulkSimCardActionListPage;
import com.telnyx.sdk.models.bulksimcardactions.BulkSimCardActionListParams;

BulkSimCardActionListPage page = client.bulkSimCardActions().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get bulk SIM card action details

This API fetches information about a bulk SIM card action. A bulk SIM card action contains details about a collection of individual SIM card actions.

`client.bulkSimCardActions().retrieve()` — `GET /bulk_sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.bulksimcardactions.BulkSimCardActionRetrieveParams;
import com.telnyx.sdk.models.bulksimcardactions.BulkSimCardActionRetrieveResponse;

BulkSimCardActionRetrieveResponse bulkSimCardAction = client.bulkSimCardActions().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List OTA updates

`client.otaUpdates().list()` — `GET /ota_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for OTA updates (deepObject st... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```java
import com.telnyx.sdk.models.otaupdates.OtaUpdateListPage;
import com.telnyx.sdk.models.otaupdates.OtaUpdateListParams;

OtaUpdateListPage page = client.otaUpdates().list();
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get OTA update

This API returns the details of an Over the Air (OTA) update.

`client.otaUpdates().retrieve()` — `GET /ota_updates/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.otaupdates.OtaUpdateRetrieveParams;
import com.telnyx.sdk.models.otaupdates.OtaUpdateRetrieveResponse;

OtaUpdateRetrieveResponse otaUpdate = client.otaUpdates().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List SIM card actions

This API lists a paginated collection of SIM card actions. It enables exploring a collection of existing asynchronous operations using specific filters.

`client.simCards().actions().list()` — `GET /sim_card_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card actions (deepObje... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```java
import com.telnyx.sdk.models.simcards.actions.ActionListPage;
import com.telnyx.sdk.models.simcards.actions.ActionListParams;

ActionListPage page = client.simCards().actions().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get SIM card action details

This API fetches detailed information about a SIM card action to follow-up on an existing asynchronous operation.

`client.simCards().actions().retrieve()` — `GET /sim_card_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.simcards.actions.ActionRetrieveParams;
import com.telnyx.sdk.models.simcards.actions.ActionRetrieveResponse;

ActionRetrieveResponse action = client.simCards().actions().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List SIM card data usage notifications

Lists a paginated collection of SIM card data usage notifications. It enables exploring the collection using specific filters.

`client.simCardDataUsageNotifications().list()` — `GET /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[simCardId]` | string (UUID) | No | A valid SIM card ID. |

```java
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationListPage;
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationListParams;

SimCardDataUsageNotificationListPage page = client.simCardDataUsageNotifications().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a new SIM card data usage notification

Creates a new SIM card data usage notification.

`client.simCardDataUsageNotifications().create()` — `POST /sim_card_data_usage_notifications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardId` | string (UUID) | Yes | The identification UUID of the related SIM card resource. |
| `threshold` | object | Yes | Data usage threshold that will trigger the notification. |

```java
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationCreateParams;
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationCreateResponse;

SimCardDataUsageNotificationCreateParams params = SimCardDataUsageNotificationCreateParams.builder()
    .simCardId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .threshold(SimCardDataUsageNotificationCreateParams.Threshold.builder().build())
    .build();
SimCardDataUsageNotificationCreateResponse simCardDataUsageNotification = client.simCardDataUsageNotifications().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get a single SIM card data usage notification

Get a single SIM Card Data Usage Notification.

`client.simCardDataUsageNotifications().retrieve()` — `GET /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationRetrieveParams;
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationRetrieveResponse;

SimCardDataUsageNotificationRetrieveResponse simCardDataUsageNotification = client.simCardDataUsageNotifications().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Updates information for a SIM Card Data Usage Notification

Updates information for a SIM Card Data Usage Notification.

`client.simCardDataUsageNotifications().update()` — `PATCH /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `simCardId` | string (UUID) | No | The identification UUID of the related SIM card resource. |
| `id` | string (UUID) | No | Identifies the resource. |
| `recordType` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotification;
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationUpdateParams;
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationUpdateResponse;

SimCardDataUsageNotificationUpdateParams params = SimCardDataUsageNotificationUpdateParams.builder()
    .simCardDataUsageNotificationId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .simCardDataUsageNotification(SimCardDataUsageNotification.builder().build())
    .build();
SimCardDataUsageNotificationUpdateResponse simCardDataUsageNotification = client.simCardDataUsageNotifications().update(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete SIM card data usage notifications

Delete the SIM Card Data Usage Notification.

`client.simCardDataUsageNotifications().delete()` — `DELETE /sim_card_data_usage_notifications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationDeleteParams;
import com.telnyx.sdk.models.simcarddatausagenotifications.SimCardDataUsageNotificationDeleteResponse;

SimCardDataUsageNotificationDeleteResponse simCardDataUsageNotification = client.simCardDataUsageNotifications().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List SIM card group actions

This API allows listing a paginated collection a SIM card group actions. It allows to explore a collection of existing asynchronous operation using specific filters.

`client.simCardGroups().actions().list()` — `GET /sim_card_group_actions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[status]` | enum (in-progress, completed, failed) | No | Filter by a specific status of the resource's lifecycle. |
| `filter[type]` | enum (set_private_wireless_gateway, remove_private_wireless_gateway, set_wireless_blocklist, remove_wireless_blocklist) | No | Filter by action type. |
| `page[number]` | integer | No | The page number to load. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.simcardgroups.actions.ActionListPage;
import com.telnyx.sdk.models.simcardgroups.actions.ActionListParams;

ActionListPage page = client.simCardGroups().actions().list();
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get SIM card group action details

This API allows fetching detailed information about a SIM card group action resource to make follow-ups in an existing asynchronous operation.

`client.simCardGroups().actions().retrieve()` — `GET /sim_card_group_actions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.simcardgroups.actions.ActionRetrieveParams;
import com.telnyx.sdk.models.simcardgroups.actions.ActionRetrieveResponse;

ActionRetrieveResponse action = client.simCardGroups().actions().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Get all SIM card groups

Get all SIM card groups belonging to the user that match the given filters.

`client.simCardGroups().list()` — `GET /sim_card_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | A valid SIM card group name. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.simcardgroups.SimCardGroupListPage;
import com.telnyx.sdk.models.simcardgroups.SimCardGroupListParams;

SimCardGroupListPage page = client.simCardGroups().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get SIM card group

Returns the details regarding a specific SIM card group

`client.simCardGroups().retrieve()` — `GET /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `includeIccids` | boolean | No | It includes a list of associated ICCIDs. |

```java
import com.telnyx.sdk.models.simcardgroups.SimCardGroupRetrieveParams;
import com.telnyx.sdk.models.simcardgroups.SimCardGroupRetrieveResponse;

SimCardGroupRetrieveResponse simCardGroup = client.simCardGroups().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a SIM card group

Updates a SIM card group

`client.simCardGroups().update()` — `PATCH /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |
| `name` | string | No | A user friendly name for the SIM card group. |
| `dataLimit` | object | No | Upper limit on the amount of data the SIM cards, within the ... |

```java
import com.telnyx.sdk.models.simcardgroups.SimCardGroupUpdateParams;
import com.telnyx.sdk.models.simcardgroups.SimCardGroupUpdateResponse;

SimCardGroupUpdateResponse simCardGroup = client.simCardGroups().update("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a SIM card group

Permanently deletes a SIM card group

`client.simCardGroups().delete()` — `DELETE /sim_card_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```java
import com.telnyx.sdk.models.simcardgroups.SimCardGroupDeleteParams;
import com.telnyx.sdk.models.simcardgroups.SimCardGroupDeleteResponse;

SimCardGroupDeleteResponse simCardGroup = client.simCardGroups().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Request Private Wireless Gateway removal from SIM card group

This action will asynchronously remove an existing Private Wireless Gateway definition from a SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic handled by Telnyx's default mobile network configuration.

`client.simCardGroups().actions().removePrivateWirelessGateway()` — `POST /sim_card_groups/{id}/actions/remove_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```java
import com.telnyx.sdk.models.simcardgroups.actions.ActionRemovePrivateWirelessGatewayParams;
import com.telnyx.sdk.models.simcardgroups.actions.ActionRemovePrivateWirelessGatewayResponse;

ActionRemovePrivateWirelessGatewayResponse response = client.simCardGroups().actions().removePrivateWirelessGateway("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist removal from SIM card group

This action will asynchronously remove an existing Wireless Blocklist to all the SIMs in the SIM card group.

`client.simCardGroups().actions().removeWirelessBlocklist()` — `POST /sim_card_groups/{id}/actions/remove_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```java
import com.telnyx.sdk.models.simcardgroups.actions.ActionRemoveWirelessBlocklistParams;
import com.telnyx.sdk.models.simcardgroups.actions.ActionRemoveWirelessBlocklistResponse;

ActionRemoveWirelessBlocklistResponse response = client.simCardGroups().actions().removeWirelessBlocklist("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Private Wireless Gateway assignment for SIM card group

This action will asynchronously assign a provisioned Private Wireless Gateway to the SIM card group. Completing this operation defines that all SIM cards in the SIM card group will get their traffic controlled by the associated Private Wireless Gateway. This operation will also imply that new SIM cards assigned to a group will inherit its network definitions.

`client.simCardGroups().actions().setPrivateWirelessGateway()` — `POST /sim_card_groups/{id}/actions/set_private_wireless_gateway`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `privateWirelessGatewayId` | string (UUID) | Yes | The identification of the related Private Wireless Gateway r... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```java
import com.telnyx.sdk.models.simcardgroups.actions.ActionSetPrivateWirelessGatewayParams;
import com.telnyx.sdk.models.simcardgroups.actions.ActionSetPrivateWirelessGatewayResponse;

ActionSetPrivateWirelessGatewayParams params = ActionSetPrivateWirelessGatewayParams.builder()
    .id("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .privateWirelessGatewayId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
ActionSetPrivateWirelessGatewayResponse response = client.simCardGroups().actions().setPrivateWirelessGateway(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request Wireless Blocklist assignment for SIM card group

This action will asynchronously assign a Wireless Blocklist to all the SIMs in the SIM card group.

`client.simCardGroups().actions().setWirelessBlocklist()` — `POST /sim_card_groups/{id}/actions/set_wireless_blocklist`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wirelessBlocklistId` | string (UUID) | Yes | The identification of the related Wireless Blocklist resourc... |
| `id` | string (UUID) | Yes | Identifies the SIM group. |

```java
import com.telnyx.sdk.models.simcardgroups.actions.ActionSetWirelessBlocklistParams;
import com.telnyx.sdk.models.simcardgroups.actions.ActionSetWirelessBlocklistResponse;

ActionSetWirelessBlocklistParams params = ActionSetWirelessBlocklistParams.builder()
    .id("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .wirelessBlocklistId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .build();
ActionSetWirelessBlocklistResponse response = client.simCardGroups().actions().setWirelessBlocklist(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Preview SIM card orders

Preview SIM card order purchases.

`client.simCardOrderPreview().preview()` — `POST /sim_card_order_preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quantity` | integer | Yes | The amount of SIM cards that the user would like to purchase... |
| `addressId` | string (UUID) | Yes | Uniquely identifies the address for the order. |

```java
import com.telnyx.sdk.models.simcardorderpreview.SimCardOrderPreviewPreviewParams;
import com.telnyx.sdk.models.simcardorderpreview.SimCardOrderPreviewPreviewResponse;

SimCardOrderPreviewPreviewParams params = SimCardOrderPreviewPreviewParams.builder()
    .addressId("1293384261075731499")
    .quantity(21L)
    .build();
SimCardOrderPreviewPreviewResponse response = client.simCardOrderPreview().preview(params);
```

Key response fields: `response.data.quantity, response.data.record_type, response.data.shipping_cost`

## Get all SIM card orders

Get all SIM card orders according to filters.

`client.simCardOrders().list()` — `GET /sim_card_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for SIM card orders (deepObjec... |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```java
import com.telnyx.sdk.models.simcardorders.SimCardOrderListPage;
import com.telnyx.sdk.models.simcardorders.SimCardOrderListParams;

SimCardOrderListPage page = client.simCardOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single SIM card order

Get a single SIM card order by its ID.

`client.simCardOrders().retrieve()` — `GET /sim_card_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.simcardorders.SimCardOrderRetrieveParams;
import com.telnyx.sdk.models.simcardorders.SimCardOrderRetrieveResponse;

SimCardOrderRetrieveResponse simCardOrder = client.simCardOrders().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request bulk disabling voice on SIM cards.

This API triggers an asynchronous operation to disable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.simCards().actions().bulkDisableVoice()` — `POST /sim_cards/actions/bulk_disable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardGroupId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.simcards.actions.ActionBulkDisableVoiceParams;
import com.telnyx.sdk.models.simcards.actions.ActionBulkDisableVoiceResponse;

ActionBulkDisableVoiceParams params = ActionBulkDisableVoiceParams.builder()
    .simCardGroupId("6b14e151-8493-4fa1-8664-1cc4e6d14158")
    .build();
ActionBulkDisableVoiceResponse response = client.simCards().actions().bulkDisableVoice(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk enabling voice on SIM cards.

This API triggers an asynchronous operation to enable voice on SIM cards belonging to a specified SIM Card Group. 
For each SIM Card a SIM Card Action will be generated.

`client.simCards().actions().bulkEnableVoice()` — `POST /sim_cards/actions/bulk_enable_voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardGroupId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.simcards.actions.ActionBulkEnableVoiceParams;
import com.telnyx.sdk.models.simcards.actions.ActionBulkEnableVoiceResponse;

ActionBulkEnableVoiceParams params = ActionBulkEnableVoiceParams.builder()
    .simCardGroupId("6b14e151-8493-4fa1-8664-1cc4e6d14158")
    .build();
ActionBulkEnableVoiceResponse response = client.simCards().actions().bulkEnableVoice(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Request bulk setting SIM card public IPs.

This API triggers an asynchronous operation to set a public IP for each of the specified SIM cards. 
For each SIM Card a SIM Card Action will be generated. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.simCards().actions().bulkSetPublicIps()` — `POST /sim_cards/actions/bulk_set_public_ips`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `simCardIds` | array[object] | Yes |  |

```java
import com.telnyx.sdk.models.simcards.actions.ActionBulkSetPublicIpsParams;
import com.telnyx.sdk.models.simcards.actions.ActionBulkSetPublicIpsResponse;

ActionBulkSetPublicIpsParams params = ActionBulkSetPublicIpsParams.builder()
    .addSimCardId("6b14e151-8493-4fa1-8664-1cc4e6d14158")
    .build();
ActionBulkSetPublicIpsResponse response = client.simCards().actions().bulkSetPublicIps(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Validate SIM cards registration codes

It validates whether SIM card registration codes are valid or not.

`client.simCards().actions().validateRegistrationCodes()` — `POST /sim_cards/actions/validate_registration_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registrationCodes` | array[string] | No |  |

```java
import com.telnyx.sdk.models.simcards.actions.ActionValidateRegistrationCodesParams;
import com.telnyx.sdk.models.simcards.actions.ActionValidateRegistrationCodesResponse;

ActionValidateRegistrationCodesResponse response = client.simCards().actions().validateRegistrationCodes();
```

Key response fields: `response.data.invalid_detail, response.data.record_type, response.data.registration_code`

## Update a SIM card

Updates SIM card data

`client.simCards().update()` — `PATCH /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `type` | enum (physical, esim) | No | The type of SIM card |
| `tags` | array[string] | No | Searchable tags associated with the SIM card |
| `simCardGroupId` | string (UUID) | No | The group SIMCardGroup identification. |
| ... | | | +25 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.simcards.SimCard;
import com.telnyx.sdk.models.simcards.SimCardUpdateParams;
import com.telnyx.sdk.models.simcards.SimCardUpdateResponse;

SimCardUpdateParams params = SimCardUpdateParams.builder()
    .simCardId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .simCard(SimCard.builder().build())
    .build();
SimCardUpdateResponse simCard = client.simCards().update(params);
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Deletes a SIM card

The SIM card will be decommissioned, removed from your account and you will stop being charged. The SIM card won't be able to connect to the network after the deletion is completed, thus making it impossible to consume data. 
Transitioning to the disabled state may take a period of time.

`client.simCards().delete()` — `DELETE /sim_cards/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `reportLost` | boolean | No | Enables deletion of disabled eSIMs that can't be uninstalled... |

```java
import com.telnyx.sdk.models.simcards.SimCardDeleteParams;
import com.telnyx.sdk.models.simcards.SimCardDeleteResponse;

SimCardDeleteResponse simCard = client.simCards().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Request a SIM card disable

This API disables a SIM card, disconnecting it from the network and making it impossible to consume data. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the disabled state may take a period of time.

`client.simCards().actions().disable()` — `POST /sim_cards/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.actions.ActionDisableParams;
import com.telnyx.sdk.models.simcards.actions.ActionDisableResponse;

ActionDisableResponse response = client.simCards().actions().disable("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request a SIM card enable

This API enables a SIM card, connecting it to the network and making it possible to consume data. 
To enable a SIM card, it must be associated with a SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the enabled state may take a period of time.

`client.simCards().actions().enable()` — `POST /sim_cards/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.actions.ActionEnableParams;
import com.telnyx.sdk.models.simcards.actions.ActionEnableResponse;

ActionEnableResponse response = client.simCards().actions().enable("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request removing a SIM card public IP

This API removes an existing public IP from a SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action. The status of the SIM Card Action can be followed through the [List SIM Card Action](https://developers.telnyx.com/api-reference/sim-card-actions/list-sim-card-actions) API.

`client.simCards().actions().removePublicIp()` — `POST /sim_cards/{id}/actions/remove_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.actions.ActionRemovePublicIpParams;
import com.telnyx.sdk.models.simcards.actions.ActionRemovePublicIpResponse;

ActionRemovePublicIpResponse response = client.simCards().actions().removePublicIp("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card public IP

This API makes a SIM card reachable on the public internet by mapping a random public IP to the SIM card.   
 The API will trigger an asynchronous operation called a SIM Card Action.

`client.simCards().actions().setPublicIp()` — `POST /sim_cards/{id}/actions/set_public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `regionCode` | string | No | The code of the region where the public IP should be assigne... |

```java
import com.telnyx.sdk.models.simcards.actions.ActionSetPublicIpParams;
import com.telnyx.sdk.models.simcards.actions.ActionSetPublicIpResponse;

ActionSetPublicIpResponse response = client.simCards().actions().setPublicIp("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Request setting a SIM card to standby

The SIM card will be able to connect to the network once the process to set it to standby has been completed, thus making it possible to consume data. 
To set a SIM card to standby, it must be associated with SIM card group. 
The API will trigger an asynchronous operation called a SIM Card Action. Transitioning to the standby state may take a period of time.

`client.simCards().actions().setStandby()` — `POST /sim_cards/{id}/actions/set_standby`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.actions.ActionSetStandbyParams;
import com.telnyx.sdk.models.simcards.actions.ActionSetStandbyResponse;

ActionSetStandbyResponse response = client.simCards().actions().setStandby("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get activation code for an eSIM

It returns the activation code for an eSIM.  
 This API is only available for eSIMs. If the given SIM is a physical SIM card, or has already been installed, an error will be returned.

`client.simCards().getActivationCode()` — `GET /sim_cards/{id}/activation_code`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.SimCardGetActivationCodeParams;
import com.telnyx.sdk.models.simcards.SimCardGetActivationCodeResponse;

SimCardGetActivationCodeResponse response = client.simCards().getActivationCode("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.activation_code, response.data.record_type`

## Get SIM card device details

It returns the device details where a SIM card is currently being used.

`client.simCards().getDeviceDetails()` — `GET /sim_cards/{id}/device_details`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.SimCardGetDeviceDetailsParams;
import com.telnyx.sdk.models.simcards.SimCardGetDeviceDetailsResponse;

SimCardGetDeviceDetailsResponse response = client.simCards().getDeviceDetails("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.brand_name, response.data.device_type, response.data.imei`

## Get SIM card public IP definition

It returns the public IP requested for a SIM card.

`client.simCards().getPublicIp()` — `GET /sim_cards/{id}/public_ip`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |

```java
import com.telnyx.sdk.models.simcards.SimCardGetPublicIpParams;
import com.telnyx.sdk.models.simcards.SimCardGetPublicIpResponse;

SimCardGetPublicIpResponse response = client.simCards().getPublicIp("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.type, response.data.created_at, response.data.updated_at`

## List wireless connectivity logs

This API allows listing a paginated collection of Wireless Connectivity Logs associated with a SIM Card, for troubleshooting purposes.

`client.simCards().listWirelessConnectivityLogs()` — `GET /sim_cards/{id}/wireless_connectivity_logs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the SIM. |
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |

```java
import com.telnyx.sdk.models.simcards.SimCardListWirelessConnectivityLogsPage;
import com.telnyx.sdk.models.simcards.SimCardListWirelessConnectivityLogsParams;

SimCardListWirelessConnectivityLogsPage page = client.simCards().listWirelessConnectivityLogs("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.state, response.data.created_at`

## List Migration Source coverage

`client.storage().listMigrationSourceCoverage()` — `GET /storage/migration_source_coverage`

```java
import com.telnyx.sdk.models.storage.StorageListMigrationSourceCoverageParams;
import com.telnyx.sdk.models.storage.StorageListMigrationSourceCoverageResponse;

StorageListMigrationSourceCoverageResponse response = client.storage().listMigrationSourceCoverage();
```

Key response fields: `response.data.provider, response.data.source_region`

## List all Migration Sources

`client.storage().migrationSources().list()` — `GET /storage/migration_sources`

```java
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceListParams;
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceListResponse;

MigrationSourceListResponse migrationSources = client.storage().migrationSources().list();
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Create a Migration Source

Create a source from which data can be migrated from.

`client.storage().migrationSources().create()` — `POST /storage/migration_sources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum (aws, telnyx) | Yes | Cloud provider from which to migrate data. |
| `providerAuth` | object | Yes |  |
| `bucketName` | string | Yes | Bucket name to migrate the data from. |
| `id` | string (UUID) | No | Unique identifier for the data migration source. |
| `sourceRegion` | string | No | For intra-Telnyx buckets migration, specify the source bucke... |

```java
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceCreateParams;
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceCreateResponse;
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceParams;

MigrationSourceParams params = MigrationSourceParams.builder()
    .bucketName("my-bucket")
    .provider(MigrationSourceParams.Provider.AWS)
    .providerAuth(MigrationSourceParams.ProviderAuth.builder().build())
    .build();
MigrationSourceCreateResponse migrationSource = client.storage().migrationSources().create(params);
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Get a Migration Source

`client.storage().migrationSources().retrieve()` — `GET /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```java
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceRetrieveParams;
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceRetrieveResponse;

MigrationSourceRetrieveResponse migrationSource = client.storage().migrationSources().retrieve("");
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## Delete a Migration Source

`client.storage().migrationSources().delete()` — `DELETE /storage/migration_sources/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration source. |

```java
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceDeleteParams;
import com.telnyx.sdk.models.storage.migrationsources.MigrationSourceDeleteResponse;

MigrationSourceDeleteResponse migrationSource = client.storage().migrationSources().delete("");
```

Key response fields: `response.data.id, response.data.bucket_name, response.data.provider`

## List all Migrations

`client.storage().migrations().list()` — `GET /storage/migrations`

```java
import com.telnyx.sdk.models.storage.migrations.MigrationListParams;
import com.telnyx.sdk.models.storage.migrations.MigrationListResponse;

MigrationListResponse migrations = client.storage().migrations().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a Migration

Initiate a migration of data from an external provider into Telnyx Cloud Storage. Currently, only S3 is supported.

`client.storage().migrations().create()` — `POST /storage/migrations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceId` | string (UUID) | Yes | ID of the Migration Source from which to migrate data. |
| `targetBucketName` | string | Yes | Bucket name to migrate the data into. |
| `targetRegion` | string | Yes | Telnyx Cloud Storage region to migrate the data to. |
| `status` | enum (pending, checking, migrating, complete, error, ...) | No | Status of the migration. |
| `id` | string (UUID) | No | Unique identifier for the data migration. |
| `refresh` | boolean | No | If true, will continue to poll the source bucket to ensure n... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.storage.migrations.MigrationCreateParams;
import com.telnyx.sdk.models.storage.migrations.MigrationCreateResponse;
import com.telnyx.sdk.models.storage.migrations.MigrationParams;

MigrationParams params = MigrationParams.builder()
    .sourceId("550e8400-e29b-41d4-a716-446655440000")
    .targetBucketName("my-target-bucket")
    .targetRegion("us-central-1")
    .build();
MigrationCreateResponse migration = client.storage().migrations().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a Migration

`client.storage().migrations().retrieve()` — `GET /storage/migrations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```java
import com.telnyx.sdk.models.storage.migrations.MigrationRetrieveParams;
import com.telnyx.sdk.models.storage.migrations.MigrationRetrieveResponse;

MigrationRetrieveResponse migration = client.storage().migrations().retrieve("");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Stop a Migration

`client.storage().migrations().actions().stop()` — `POST /storage/migrations/{id}/actions/stop`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier for the data migration. |

```java
import com.telnyx.sdk.models.storage.migrations.actions.ActionStopParams;
import com.telnyx.sdk.models.storage.migrations.actions.ActionStopResponse;

ActionStopResponse response = client.storage().migrations().actions().stop("");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List Mobile Voice Connections

`client.mobileVoiceConnections().list()` — `GET /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |
| `filter[connectionName][contains]` | string | No | Filter by connection name containing the given string |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionListPage;
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionListParams;

MobileVoiceConnectionListPage page = client.mobileVoiceConnections().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a Mobile Voice Connection

`client.mobileVoiceConnections().create()` — `POST /v2/mobile_voice_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tags` | array[string] | No |  |
| `webhookApiVersion` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionCreateParams;
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionCreateResponse;

MobileVoiceConnectionCreateResponse mobileVoiceConnection = client.mobileVoiceConnections().create();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Mobile Voice Connection

`client.mobileVoiceConnections().retrieve()` — `GET /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```java
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionRetrieveParams;
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionRetrieveResponse;

MobileVoiceConnectionRetrieveResponse mobileVoiceConnection = client.mobileVoiceConnections().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Mobile Voice Connection

`client.mobileVoiceConnections().update()` — `PATCH /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |
| `tags` | array[string] | No |  |
| `webhookApiVersion` | enum (1, 2) | No |  |
| `active` | boolean | No |  |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionUpdateParams;
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionUpdateResponse;

MobileVoiceConnectionUpdateResponse mobileVoiceConnection = client.mobileVoiceConnections().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a Mobile Voice Connection

`client.mobileVoiceConnections().delete()` — `DELETE /v2/mobile_voice_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The ID of the mobile voice connection |

```java
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionDeleteParams;
import com.telnyx.sdk.models.mobilevoiceconnections.MobileVoiceConnectionDeleteResponse;

MobileVoiceConnectionDeleteResponse mobileVoiceConnection = client.mobileVoiceConnections().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get all wireless regions

Retrieve all wireless regions for the given product.

`client.wireless().retrieveRegions()` — `GET /wireless/regions`

```java
import com.telnyx.sdk.models.wireless.WirelessRetrieveRegionsParams;
import com.telnyx.sdk.models.wireless.WirelessRetrieveRegionsResponse;

WirelessRetrieveRegionsParams params = WirelessRetrieveRegionsParams.builder()
    .product("public_ips")
    .build();
WirelessRetrieveRegionsResponse response = client.wireless().retrieveRegions(params);
```

Key response fields: `response.data.name, response.data.updated_at, response.data.code`

## Get all possible wireless blocklist values

Retrieve all wireless blocklist values for a given blocklist type.

`client.wirelessBlocklistValues().list()` — `GET /wireless_blocklist_values`

```java
import com.telnyx.sdk.models.wirelessblocklistvalues.WirelessBlocklistValueListParams;
import com.telnyx.sdk.models.wirelessblocklistvalues.WirelessBlocklistValueListResponse;

WirelessBlocklistValueListParams params = WirelessBlocklistValueListParams.builder()
    .type(WirelessBlocklistValueListParams.Type.COUNTRY)
    .build();
WirelessBlocklistValueListResponse wirelessBlocklistValues = client.wirelessBlocklistValues().list(params);
```

Key response fields: `response.data.data, response.data.meta`

## Get all Wireless Blocklists

Get all Wireless Blocklists belonging to the user.

`client.wirelessBlocklists().list()` — `GET /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | The page number to load. |
| `page[size]` | integer | No | The size of the page. |
| `filter[name]` | string | No | The name of the Wireless Blocklist. |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistListPage;
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistListParams;

WirelessBlocklistListPage page = client.wirelessBlocklists().list();
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Create a Wireless Blocklist

Create a Wireless Blocklist to prevent SIMs from connecting to certain networks.

`client.wirelessBlocklists().create()` — `POST /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the Wireless Blocklist. |
| `type` | enum (country, mcc, plmn) | Yes | The type of wireless blocklist. |
| `values` | array[object] | Yes | Values to block. |

```java
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistCreateParams;
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistCreateResponse;

WirelessBlocklistCreateParams params = WirelessBlocklistCreateParams.builder()
    .name("My Wireless Blocklist")
    .type(WirelessBlocklistCreateParams.Type.COUNTRY)
    .addValue("CA")
    .addValue("US")
    .build();
WirelessBlocklistCreateResponse wirelessBlocklist = client.wirelessBlocklists().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Update a Wireless Blocklist

Update a Wireless Blocklist.

`client.wirelessBlocklists().update()` — `PATCH /wireless_blocklists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (country, mcc, plmn) | No | The type of wireless blocklist. |
| `name` | string | No | The name of the Wireless Blocklist. |
| `values` | array[object] | No | Values to block. |

```java
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistUpdateParams;
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistUpdateResponse;

WirelessBlocklistUpdateResponse wirelessBlocklist = client.wirelessBlocklists().update();
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Get a Wireless Blocklist

Retrieve information about a Wireless Blocklist.

`client.wirelessBlocklists().retrieve()` — `GET /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```java
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistRetrieveParams;
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistRetrieveResponse;

WirelessBlocklistRetrieveResponse wirelessBlocklist = client.wirelessBlocklists().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Delete a Wireless Blocklist

Deletes the Wireless Blocklist.

`client.wirelessBlocklists().delete()` — `DELETE /wireless_blocklists/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the wireless blocklist. |

```java
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistDeleteParams;
import com.telnyx.sdk.models.wirelessblocklists.WirelessBlocklistDeleteResponse;

WirelessBlocklistDeleteResponse wirelessBlocklist = client.wirelessBlocklists().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.name, response.data.type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
