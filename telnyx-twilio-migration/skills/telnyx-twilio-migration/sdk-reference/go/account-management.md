<!-- SDK reference: telnyx-account-management-go -->

# Telnyx Account Management - Go

## Core Workflow

### Prerequisites

1. Managed account features must be enabled on your account

### Steps

1. **Create sub-account**: `client.ManagedAccounts.Create(ctx, params)`
2. **List sub-accounts**: `client.ManagedAccounts.List(ctx, params)`

### Common mistakes

- Sub-accounts are fully isolated — they have their own API keys, numbers, and billing

**Related skills**: telnyx-account-go

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

result, err := client.ManagedAccounts.List(ctx, params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Lists accounts managed by the current user.

Lists the accounts managed by the current user. Users need to be explictly approved by Telnyx in order to become manager accounts.

`client.ManagedAccounts.List()` — `GET /managed_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, email) | No | Specifies the sort order for results. |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```go
	page, err := client.ManagedAccounts.List(context.Background(), telnyx.ManagedAccountListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a new managed account.

Create a new managed account owned by the authenticated user. You need to be explictly approved by Telnyx in order to become a manager account.

`client.ManagedAccounts.New()` — `POST /managed_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BusinessName` | string | Yes | The name of the business for which the new managed account i... |
| `Email` | string | No | The email address for the managed account. |
| `Password` | string | No | Password for the managed account. |
| `ManagedAccountAllowCustomPricing` | boolean | No | Boolean value that indicates if the managed account is able ... |
| ... | | | +1 optional params in the API Details section below |

```go
	managedAccount, err := client.ManagedAccounts.New(context.Background(), telnyx.ManagedAccountNewParams{
		BusinessName: "Larry's Cat Food Inc",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", managedAccount.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Display information about allocatable global outbound channels for the current user.

Display information about allocatable global outbound channels for the current user. Only usable by account managers.

`client.ManagedAccounts.GetAllocatableGlobalOutboundChannels()` — `GET /managed_accounts/allocatable_global_outbound_channels`

```go
	response, err := client.ManagedAccounts.GetAllocatableGlobalOutboundChannels(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.allocatable_global_outbound_channels, response.data.managed_account_allow_custom_pricing, response.data.record_type`

## Retrieve a managed account

Retrieves the details of a single managed account.

`client.ManagedAccounts.Get()` — `GET /managed_accounts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Managed Account User ID |

```go
	managedAccount, err := client.ManagedAccounts.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", managedAccount.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a managed account

Update a single managed account.

`client.ManagedAccounts.Update()` — `PATCH /managed_accounts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Managed Account User ID |
| `ManagedAccountAllowCustomPricing` | boolean | No | Boolean value that indicates if the managed account is able ... |

```go
	managedAccount, err := client.ManagedAccounts.Update(
		context.Background(),
		"id",
		telnyx.ManagedAccountUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", managedAccount.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages. Ongoing phone calls will not be affected. The managed account and its sub-users will no longer be able to log in via the mission control portal.

`client.ManagedAccounts.Actions.Disable()` — `POST /managed_accounts/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Managed Account User ID |

```go
	response, err := client.ManagedAccounts.Actions.Disable(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`client.ManagedAccounts.Actions.Enable()` — `POST /managed_accounts/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Managed Account User ID |
| `ReenableAllConnections` | boolean | No | When true, all connections owned by this managed account wil... |

```go
	response, err := client.ManagedAccounts.Actions.Enable(
		context.Background(),
		"id",
		telnyx.ManagedAccountActionEnableParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`client.ManagedAccounts.UpdateGlobalChannelLimit()` — `PATCH /managed_accounts/{id}/update_global_channel_limit`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Managed Account User ID |
| `ChannelLimit` | integer | No | Integer value that indicates the number of allocatable globa... |

```go
	response, err := client.ManagedAccounts.UpdateGlobalChannelLimit(
		context.Background(),
		"id",
		telnyx.ManagedAccountUpdateGlobalChannelLimitParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.channel_limit, response.data.email`

## List organization users

Returns a list of the users in your organization.

`client.Organizations.Users.List()` — `GET /organizations/users`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter[userStatus]` | enum (enabled, disabled, blocked) | No | Filter by user status |
| `Page[number]` | integer | No | The page number to load |
| `Page[size]` | integer | No | The size of the page |
| ... | | | +2 optional params in the API Details section below |

```go
	page, err := client.Organizations.Users.List(context.Background(), telnyx.OrganizationUserListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

## Get organization users groups report

Returns a report of all users in your organization with their group memberships. This endpoint returns all users without pagination and always includes group information. The report can be retrieved in JSON or CSV format by sending specific content-type headers.

`client.Organizations.Users.GetGroupsReport()` — `GET /organizations/users/users_groups_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Accept` | enum (application/json, text/csv) | No | Specify the response format. |

```go
	response, err := client.Organizations.Users.GetGroupsReport(context.Background(), telnyx.OrganizationUserGetGroupsReportParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

## Get organization user

Returns a user in your organization.

`client.Organizations.Users.Get()` — `GET /organizations/users/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Organization User ID |
| `IncludeGroups` | boolean | No | When set to true, includes the groups array for each user in... |

```go
	user, err := client.Organizations.Users.Get(
		context.Background(),
		"id",
		telnyx.OrganizationUserGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", user.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

## Delete organization user

Deletes a user in your organization.

`client.Organizations.Users.Actions.Remove()` — `POST /organizations/users/{id}/actions/remove`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Organization User ID |

```go
	action, err := client.Organizations.Users.Actions.Remove(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", action.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

---

# Account Management (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Lists accounts managed by the current user.

| Field | Type |
|-------|------|
| `api_user` | string |
| `created_at` | string |
| `email` | email |
| `id` | uuid |
| `managed_account_allow_custom_pricing` | boolean |
| `manager_account_id` | string |
| `organization_name` | string |
| `record_type` | enum: managed_account |
| `rollup_billing` | boolean |
| `updated_at` | string |

**Returned by:** Create a new managed account., Retrieve a managed account, Update a managed account, Disables a managed account, Enables a managed account

| Field | Type |
|-------|------|
| `api_key` | string |
| `api_token` | string |
| `api_user` | string |
| `balance` | object |
| `created_at` | string |
| `email` | email |
| `id` | uuid |
| `managed_account_allow_custom_pricing` | boolean |
| `manager_account_id` | string |
| `organization_name` | string |
| `record_type` | enum: managed_account |
| `rollup_billing` | boolean |
| `updated_at` | string |

**Returned by:** Display information about allocatable global outbound channels for the current user.

| Field | Type |
|-------|------|
| `allocatable_global_outbound_channels` | integer |
| `managed_account_allow_custom_pricing` | boolean |
| `record_type` | string |
| `total_global_channels_allocated` | integer |

**Returned by:** Update the amount of allocatable global outbound channels allocated to a specific managed account.

| Field | Type |
|-------|------|
| `channel_limit` | integer |
| `email` | string |
| `id` | string |
| `manager_account_id` | string |
| `record_type` | string |

**Returned by:** List organization users, Get organization users groups report, Get organization user, Delete organization user

| Field | Type |
|-------|------|
| `created_at` | string |
| `email` | email |
| `groups` | array[object] |
| `id` | string |
| `last_sign_in_at` | string \| null |
| `organization_user_bypasses_sso` | boolean |
| `record_type` | string |
| `user_status` | enum: enabled, disabled, blocked |

## Optional Parameters

### Create a new managed account. — `client.ManagedAccounts.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Email` | string | The email address for the managed account. |
| `Password` | string | Password for the managed account. |
| `ManagedAccountAllowCustomPricing` | boolean | Boolean value that indicates if the managed account is able to have custom pr... |
| `RollupBilling` | boolean | Boolean value that indicates if the billing information and charges to the ma... |

### Update a managed account — `client.ManagedAccounts.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ManagedAccountAllowCustomPricing` | boolean | Boolean value that indicates if the managed account is able to have custom pr... |

### Enables a managed account — `client.ManagedAccounts.Actions.Enable()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ReenableAllConnections` | boolean | When true, all connections owned by this managed account will automatically b... |

### Update the amount of allocatable global outbound channels allocated to a specific managed account. — `client.ManagedAccounts.UpdateGlobalChannelLimit()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ChannelLimit` | integer | Integer value that indicates the number of allocatable global outbound channe... |
