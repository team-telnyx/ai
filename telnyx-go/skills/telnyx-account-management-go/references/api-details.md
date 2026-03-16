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
