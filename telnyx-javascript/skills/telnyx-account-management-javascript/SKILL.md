---
name: telnyx-account-management-javascript
description: >-
  Sub-account management for reseller and enterprise scenarios.
metadata:
  author: telnyx
  product: account-management
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Management - JavaScript

## Core Workflow

### Prerequisites

1. Managed account features must be enabled on your account

### Steps

1. **Create sub-account**: `client.managedAccounts.create({...: ...})`
2. **List sub-accounts**: `client.managedAccounts.list()`

### Common mistakes

- Sub-accounts are fully isolated — they have their own API keys, numbers, and billing

**Related skills**: telnyx-account-javascript

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.managed_accounts.list(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Lists accounts managed by the current user.

Lists the accounts managed by the current user. Users need to be explictly approved by Telnyx in order to become manager accounts.

`client.managedAccounts.list()` — `GET /managed_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, email) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const managedAccountListResponse of client.managedAccounts.list()) {
  console.log(managedAccountListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a new managed account.

Create a new managed account owned by the authenticated user. You need to be explictly approved by Telnyx in order to become a manager account.

`client.managedAccounts.create()` — `POST /managed_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessName` | string | Yes | The name of the business for which the new managed account i... |
| `email` | string | No | The email address for the managed account. |
| `password` | string | No | Password for the managed account. |
| `managedAccountAllowCustomPricing` | boolean | No | Boolean value that indicates if the managed account is able ... |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const managedAccount = await client.managedAccounts.create({
  business_name: "Larry's Cat Food Inc",
});

console.log(managedAccount.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Display information about allocatable global outbound channels for the current user.

Display information about allocatable global outbound channels for the current user. Only usable by account managers.

`client.managedAccounts.getAllocatableGlobalOutboundChannels()` — `GET /managed_accounts/allocatable_global_outbound_channels`

```javascript
const response = await client.managedAccounts.getAllocatableGlobalOutboundChannels();

console.log(response.data);
```

Key response fields: `response.data.allocatable_global_outbound_channels, response.data.managed_account_allow_custom_pricing, response.data.record_type`

## Retrieve a managed account

Retrieves the details of a single managed account.

`client.managedAccounts.retrieve()` — `GET /managed_accounts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |

```javascript
const managedAccount = await client.managedAccounts.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(managedAccount.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a managed account

Update a single managed account.

`client.managedAccounts.update()` — `PATCH /managed_accounts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |
| `managedAccountAllowCustomPricing` | boolean | No | Boolean value that indicates if the managed account is able ... |

```javascript
const managedAccount = await client.managedAccounts.update('550e8400-e29b-41d4-a716-446655440000');

console.log(managedAccount.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages. Ongoing phone calls will not be affected. The managed account and its sub-users will no longer be able to log in via the mission control portal.

`client.managedAccounts.actions.disable()` — `POST /managed_accounts/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |

```javascript
const response = await client.managedAccounts.actions.disable('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`client.managedAccounts.actions.enable()` — `POST /managed_accounts/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |
| `reenableAllConnections` | boolean | No | When true, all connections owned by this managed account wil... |

```javascript
const response = await client.managedAccounts.actions.enable('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`client.managedAccounts.updateGlobalChannelLimit()` — `PATCH /managed_accounts/{id}/update_global_channel_limit`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |
| `channelLimit` | integer | No | Integer value that indicates the number of allocatable globa... |

```javascript
const response = await client.managedAccounts.updateGlobalChannelLimit('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.channel_limit, response.data.email`

## List organization users

Returns a list of the users in your organization.

`client.organizations.users.list()` — `GET /organizations/users`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[userStatus]` | enum (enabled, disabled, blocked) | No | Filter by user status |
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const organizationUser of client.organizations.users.list()) {
  console.log(organizationUser.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

## Get organization users groups report

Returns a report of all users in your organization with their group memberships. This endpoint returns all users without pagination and always includes group information. The report can be retrieved in JSON or CSV format by sending specific content-type headers.

`client.organizations.users.getGroupsReport()` — `GET /organizations/users/users_groups_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Accept` | enum (application/json, text/csv) | No | Specify the response format. |

```javascript
const response = await client.organizations.users.getGroupsReport();

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

## Get organization user

Returns a user in your organization.

`client.organizations.users.retrieve()` — `GET /organizations/users/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Organization User ID |
| `includeGroups` | boolean | No | When set to true, includes the groups array for each user in... |

```javascript
const user = await client.organizations.users.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(user.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

## Delete organization user

Deletes a user in your organization.

`client.organizations.users.actions.remove()` — `POST /organizations/users/{id}/actions/remove`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Organization User ID |

```javascript
const action = await client.organizations.users.actions.remove('550e8400-e29b-41d4-a716-446655440000');

console.log(action.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.email`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
