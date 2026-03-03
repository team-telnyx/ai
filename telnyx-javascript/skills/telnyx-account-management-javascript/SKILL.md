---
name: telnyx-account-management-javascript
description: >-
  Manage sub-accounts for reseller and enterprise scenarios. This skill provides
  JavaScript SDK examples.
metadata:
  author: telnyx
  product: account-management
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Management - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Lists accounts managed by the current user.

Lists the accounts managed by the current user.

`GET /managed_accounts`

```javascript
// Automatically fetches more pages as needed.
for await (const managedAccountListResponse of client.managedAccounts.list()) {
  console.log(managedAccountListResponse.id);
}
```

## Create a new managed account.

Create a new managed account owned by the authenticated user.

`POST /managed_accounts` — Required: `business_name`

Optional: `email` (string), `managed_account_allow_custom_pricing` (boolean), `password` (string), `rollup_billing` (boolean)

```javascript
const managedAccount = await client.managedAccounts.create({
  business_name: "Larry's Cat Food Inc",
});

console.log(managedAccount.data);
```

## Display information about allocatable global outbound channels for the current user.

`GET /managed_accounts/allocatable_global_outbound_channels`

```javascript
const response = await client.managedAccounts.getAllocatableGlobalOutboundChannels();

console.log(response.data);
```

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```javascript
const managedAccount = await client.managedAccounts.retrieve('id');

console.log(managedAccount.data);
```

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```javascript
const managedAccount = await client.managedAccounts.update('id');

console.log(managedAccount.data);
```

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages.

`POST /managed_accounts/{id}/actions/disable`

```javascript
const response = await client.managedAccounts.actions.disable('id');

console.log(response.data);
```

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```javascript
const response = await client.managedAccounts.actions.enable('id');

console.log(response.data);
```

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```javascript
const response = await client.managedAccounts.updateGlobalChannelLimit('id');

console.log(response.data);
```

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```javascript
// Automatically fetches more pages as needed.
for await (const organizationUser of client.organizations.users.list()) {
  console.log(organizationUser.id);
}
```

## Get organization users groups report

Returns a report of all users in your organization with their group memberships.

`GET /organizations/users/users_groups_report`

```javascript
const response = await client.organizations.users.getGroupsReport();

console.log(response.data);
```

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```javascript
const user = await client.organizations.users.retrieve('id');

console.log(user.data);
```

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```javascript
const action = await client.organizations.users.actions.remove('id');

console.log(action.data);
```
