<!-- SDK reference: telnyx-account-management-curl -->

# Telnyx Account Management - curl

## Core Workflow

### Prerequisites

1. Managed account features must be enabled on your account

### Steps

1. **Create sub-account**
2. **List sub-accounts**

### Common mistakes

- Sub-accounts are fully isolated — they have their own API keys, numbers, and billing

**Related skills**: telnyx-account-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Lists accounts managed by the current user.

Lists the accounts managed by the current user. Users need to be explictly approved by Telnyx in order to become manager accounts.

`GET /managed_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, email) | No | Specifies the sort order for results. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/managed_accounts?filter={'email': {'contains': 'john'}, 'organization_name': {'eq': 'Example Company LLC'}}&sort=email&include_cancelled_accounts=True"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a new managed account.

Create a new managed account owned by the authenticated user. You need to be explictly approved by Telnyx in order to become a manager account.

`POST /managed_accounts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `business_name` | string | Yes | The name of the business for which the new managed account i... |
| `email` | string | No | The email address for the managed account. |
| `password` | string | No | Password for the managed account. |
| `managed_account_allow_custom_pricing` | boolean | No | Boolean value that indicates if the managed account is able ... |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "business_name": "Larry's Cat Food Inc"
}' \
  "https://api.telnyx.com/v2/managed_accounts"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Display information about allocatable global outbound channels for the current user.

Display information about allocatable global outbound channels for the current user. Only usable by account managers.

`GET /managed_accounts/allocatable_global_outbound_channels`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/managed_accounts/allocatable_global_outbound_channels"
```

Key response fields: `.data.allocatable_global_outbound_channels, .data.managed_account_allow_custom_pricing, .data.record_type`

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/managed_accounts/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |
| `managed_account_allow_custom_pricing` | boolean | No | Boolean value that indicates if the managed account is able ... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/managed_accounts/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages. Ongoing phone calls will not be affected. The managed account and its sub-users will no longer be able to log in via the mission control portal.

`POST /managed_accounts/{id}/actions/disable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/managed_accounts/550e8400-e29b-41d4-a716-446655440000/actions/disable"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |
| `reenable_all_connections` | boolean | No | When true, all connections owned by this managed account wil... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/managed_accounts/550e8400-e29b-41d4-a716-446655440000/actions/enable"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Managed Account User ID |
| `channel_limit` | integer | No | Integer value that indicates the number of allocatable globa... |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/managed_accounts/550e8400-e29b-41d4-a716-446655440000/update_global_channel_limit"
```

Key response fields: `.data.id, .data.channel_limit, .data.email`

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[user_status]` | enum (enabled, disabled, blocked) | No | Filter by user status |
| `page[number]` | integer | No | The page number to load |
| `page[size]` | integer | No | The size of the page |
| ... | | | +2 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/organizations/users"
```

Key response fields: `.data.id, .data.created_at, .data.email`

## Get organization users groups report

Returns a report of all users in your organization with their group memberships. This endpoint returns all users without pagination and always includes group information. The report can be retrieved in JSON or CSV format by sending specific content-type headers.

`GET /organizations/users/users_groups_report`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Accept` | enum (application/json, text/csv) | No | Specify the response format. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/organizations/users/users_groups_report"
```

Key response fields: `.data.id, .data.created_at, .data.email`

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Organization User ID |
| `include_groups` | boolean | No | When set to true, includes the groups array for each user in... |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/organizations/users/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.email`

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Organization User ID |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/organizations/users/550e8400-e29b-41d4-a716-446655440000/actions/remove"
```

Key response fields: `.data.id, .data.created_at, .data.email`

---

# Account Management (curl) — API Details

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

### Create a new managed account.

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | string | The email address for the managed account. |
| `password` | string | Password for the managed account. |
| `managed_account_allow_custom_pricing` | boolean | Boolean value that indicates if the managed account is able to have custom pr... |
| `rollup_billing` | boolean | Boolean value that indicates if the billing information and charges to the ma... |

### Update a managed account

| Parameter | Type | Description |
|-----------|------|-------------|
| `managed_account_allow_custom_pricing` | boolean | Boolean value that indicates if the managed account is able to have custom pr... |

### Enables a managed account

| Parameter | Type | Description |
|-----------|------|-------------|
| `reenable_all_connections` | boolean | When true, all connections owned by this managed account will automatically b... |

### Update the amount of allocatable global outbound channels allocated to a specific managed account.

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_limit` | integer | Integer value that indicates the number of allocatable global outbound channe... |
