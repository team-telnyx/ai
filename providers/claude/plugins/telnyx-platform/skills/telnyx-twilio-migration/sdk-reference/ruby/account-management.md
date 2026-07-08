<!-- SDK reference: telnyx-account-management-ruby -->

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.messages.send_(to: "+13125550001", from: "+13125550002", text: "Hello")
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

## Lists accounts managed by the current user.

Lists the accounts managed by the current user. Users need to be explictly approved by Telnyx in order to become manager accounts.

`GET /managed_accounts`

```ruby
page = client.managed_accounts.list

puts(page)
```

Returns: `api_user` (string), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Create a new managed account.

Create a new managed account owned by the authenticated user. You need to be explictly approved by Telnyx in order to become a manager account.

`POST /managed_accounts` — Required: `business_name`

Optional: `email` (string), `managed_account_allow_custom_pricing` (boolean), `password` (string), `rollup_billing` (boolean)

```ruby
managed_account = client.managed_accounts.create(business_name: "Larry's Cat Food Inc")

puts(managed_account)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Display information about allocatable global outbound channels for the current user.

Display information about allocatable global outbound channels for the current user. Only usable by account managers.

`GET /managed_accounts/allocatable_global_outbound_channels`

```ruby
response = client.managed_accounts.get_allocatable_global_outbound_channels

puts(response)
```

Returns: `allocatable_global_outbound_channels` (integer), `managed_account_allow_custom_pricing` (boolean), `record_type` (string), `total_global_channels_allocated` (integer)

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```ruby
managed_account = client.managed_accounts.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(managed_account)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```ruby
managed_account = client.managed_accounts.update("550e8400-e29b-41d4-a716-446655440000")

puts(managed_account)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages. Ongoing phone calls will not be affected. The managed account and its sub-users will no longer be able to log in via the mission control portal.

`POST /managed_accounts/{id}/actions/disable`

```ruby
response = client.managed_accounts.actions.disable("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```ruby
response = client.managed_accounts.actions.enable("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```ruby
response = client.managed_accounts.update_global_channel_limit("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

Returns: `channel_limit` (integer), `email` (string), `id` (string), `manager_account_id` (string), `record_type` (string)

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```ruby
page = client.organizations.users.list

puts(page)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Get organization users groups report

Returns a report of all users in your organization with their group memberships. This endpoint returns all users without pagination and always includes group information. The report can be retrieved in JSON or CSV format by sending specific content-type headers.

`GET /organizations/users/users_groups_report`

```ruby
response = client.organizations.users.get_groups_report

puts(response)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```ruby
user = client.organizations.users.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(user)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```ruby
action = client.organizations.users.actions.remove("550e8400-e29b-41d4-a716-446655440000")

puts(action)
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)
