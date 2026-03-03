---
name: telnyx-account-management-go
description: >-
  Manage sub-accounts for reseller and enterprise scenarios. This skill provides
  Go SDK examples.
metadata:
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

## Lists accounts managed by the current user.

Lists the accounts managed by the current user.

`GET /managed_accounts`

```go
	page, err := client.ManagedAccounts.List(context.TODO(), telnyx.ManagedAccountListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a new managed account.

Create a new managed account owned by the authenticated user.

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

## Display information about allocatable global outbound channels for the current user.

`GET /managed_accounts/allocatable_global_outbound_channels`

```go
	response, err := client.ManagedAccounts.GetAllocatableGlobalOutboundChannels(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

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

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages.

`POST /managed_accounts/{id}/actions/disable`

```go
	response, err := client.ManagedAccounts.Actions.Disable(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

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

## Get organization users groups report

Returns a report of all users in your organization with their group memberships.

`GET /organizations/users/users_groups_report`

```go
	response, err := client.Organizations.Users.GetGroupsReport(context.TODO(), telnyx.OrganizationUserGetGroupsReportParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

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
