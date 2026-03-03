---
name: telnyx-account-management-ruby
description: >-
  Manage sub-accounts for reseller and enterprise scenarios. This skill provides
  Ruby SDK examples.
metadata:
  author: telnyx
  product: account-management
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Management - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Lists accounts managed by the current user.

Lists the accounts managed by the current user.

`GET /managed_accounts`

```ruby
page = client.managed_accounts.list

puts(page)
```

## Create a new managed account.

Create a new managed account owned by the authenticated user.

`POST /managed_accounts` — Required: `business_name`

Optional: `email` (string), `managed_account_allow_custom_pricing` (boolean), `password` (string), `rollup_billing` (boolean)

```ruby
managed_account = client.managed_accounts.create(business_name: "Larry's Cat Food Inc")

puts(managed_account)
```

## Display information about allocatable global outbound channels for the current user.

`GET /managed_accounts/allocatable_global_outbound_channels`

```ruby
response = client.managed_accounts.get_allocatable_global_outbound_channels

puts(response)
```

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```ruby
managed_account = client.managed_accounts.retrieve("id")

puts(managed_account)
```

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```ruby
managed_account = client.managed_accounts.update("id")

puts(managed_account)
```

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages.

`POST /managed_accounts/{id}/actions/disable`

```ruby
response = client.managed_accounts.actions.disable("id")

puts(response)
```

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```ruby
response = client.managed_accounts.actions.enable("id")

puts(response)
```

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```ruby
response = client.managed_accounts.update_global_channel_limit("id")

puts(response)
```

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```ruby
page = client.organizations.users.list

puts(page)
```

## Get organization users groups report

Returns a report of all users in your organization with their group memberships.

`GET /organizations/users/users_groups_report`

```ruby
response = client.organizations.users.get_groups_report

puts(response)
```

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```ruby
user = client.organizations.users.retrieve("id")

puts(user)
```

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```ruby
action = client.organizations.users.actions.remove("id")

puts(action)
```
