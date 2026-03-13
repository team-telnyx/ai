---
name: telnyx-account-management-go
description: >-
  Manage sub-accounts for reseller and enterprise scenarios. This skill provides
  Go SDK examples.
metadata:
  internal: true
  author: telnyx
  product: account-management
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Management - Go

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

result, err := client.Messages.Send(ctx, params)
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

## Lists accounts managed by the current user.

Lists the accounts managed by the current user. Users need to be explictly approved by Telnyx in order to become manager accounts.

`GET /managed_accounts`

```go
	page, err := client.ManagedAccounts.List(context.TODO(), telnyx.ManagedAccountListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

Returns: `api_user` (string), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Create a new managed account.

Create a new managed account owned by the authenticated user. You need to be explictly approved by Telnyx in order to become a manager account.

`POST /managed_accounts` — Required: `business_name`

Optional: `email` (string), `managed_account_allow_custom_pricing` (boolean), `password` (string), `rollup_billing` (boolean)

```go
	managedAccount, err := client.ManagedAccounts.New(context.TODO(), telnyx.ManagedAccountNewParams{
		BusinessName: "Larry's Cat Food Inc",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", managedAccount.Data)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Display information about allocatable global outbound channels for the current user.

Display information about allocatable global outbound channels for the current user. Only usable by account managers.

`GET /managed_accounts/allocatable_global_outbound_channels`

```go
	response, err := client.ManagedAccounts.GetAllocatableGlobalOutboundChannels(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `allocatable_global_outbound_channels` (integer), `managed_account_allow_custom_pricing` (boolean), `record_type` (string), `total_global_channels_allocated` (integer)

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```go
	managedAccount, err := client.ManagedAccounts.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", managedAccount.Data)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```go
	managedAccount, err := client.ManagedAccounts.Update(
		context.TODO(),
		"id",
		telnyx.ManagedAccountUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", managedAccount.Data)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages. Ongoing phone calls will not be affected. The managed account and its sub-users will no longer be able to log in via the mission control portal.

`POST /managed_accounts/{id}/actions/disable`

```go
	response, err := client.ManagedAccounts.Actions.Disable(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```go
	response, err := client.ManagedAccounts.Actions.Enable(
		context.TODO(),
		"id",
		telnyx.ManagedAccountActionEnableParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```go
	response, err := client.ManagedAccounts.UpdateGlobalChannelLimit(
		context.TODO(),
		"id",
		telnyx.ManagedAccountUpdateGlobalChannelLimitParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `channel_limit` (integer), `email` (string), `id` (string), `manager_account_id` (string), `record_type` (string)

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```go
	page, err := client.Organizations.Users.List(context.TODO(), telnyx.OrganizationUserListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Get organization users groups report

Returns a report of all users in your organization with their group memberships. This endpoint returns all users without pagination and always includes group information. The report can be retrieved in JSON or CSV format by sending specific content-type headers.

`GET /organizations/users/users_groups_report`

```go
	response, err := client.Organizations.Users.GetGroupsReport(context.TODO(), telnyx.OrganizationUserGetGroupsReportParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```go
	user, err := client.Organizations.Users.Get(
		context.TODO(),
		"id",
		telnyx.OrganizationUserGetParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", user.Data)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```go
	action, err := client.Organizations.Users.Actions.Remove(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", action.Data)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)
