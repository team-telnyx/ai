---
name: telnyx-account-management-python
description: >-
  Manage sub-accounts for reseller and enterprise scenarios. This skill provides
  Python SDK examples.
metadata:
  author: telnyx
  product: account-management
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Management - Python

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

## Lists accounts managed by the current user.

Lists the accounts managed by the current user.

`GET /managed_accounts`

```python
page = client.managed_accounts.list()
page = page.data[0]
print(page.id)
```

## Create a new managed account.

Create a new managed account owned by the authenticated user.

`POST /managed_accounts` — Required: `business_name`

Optional: `email` (string), `managed_account_allow_custom_pricing` (boolean), `password` (string), `rollup_billing` (boolean)

```python
managed_account = client.managed_accounts.create(
    business_name="Larry's Cat Food Inc",
)
print(managed_account.data)
```

## Display information about allocatable global outbound channels for the current user.

`GET /managed_accounts/allocatable_global_outbound_channels`

```python
response = client.managed_accounts.get_allocatable_global_outbound_channels()
print(response.data)
```

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```python
managed_account = client.managed_accounts.retrieve(
    "id",
)
print(managed_account.data)
```

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```python
managed_account = client.managed_accounts.update(
    id="id",
)
print(managed_account.data)
```

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages.

`POST /managed_accounts/{id}/actions/disable`

```python
response = client.managed_accounts.actions.disable(
    "id",
)
print(response.data)
```

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```python
response = client.managed_accounts.actions.enable(
    id="id",
)
print(response.data)
```

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```python
response = client.managed_accounts.update_global_channel_limit(
    id="id",
)
print(response.data)
```

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```python
page = client.organizations.users.list()
page = page.data[0]
print(page.id)
```

## Get organization users groups report

Returns a report of all users in your organization with their group memberships.

`GET /organizations/users/users_groups_report`

```python
response = client.organizations.users.get_groups_report()
print(response.data)
```

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```python
user = client.organizations.users.retrieve(
    id="id",
)
print(user.data)
```

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```python
action = client.organizations.users.actions.remove(
    "id",
)
print(action.data)
```
