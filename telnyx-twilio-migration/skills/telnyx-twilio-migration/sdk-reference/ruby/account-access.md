<!-- SDK reference: telnyx-account-access-ruby -->

# Telnyx Account Access - Ruby

## Core Workflow

### Steps

1. **Manage addresses**: `client.addresses.create(...: ...)`
2. **Configure IP access**: `client.ip_addresses.create(...: ...)`
3. **Manage billing groups**: `client.billing_groups.create(name: ...)`

### Common mistakes

- IP access restrictions apply to API and portal — ensure you don't lock yourself out

**Related skills**: telnyx-account-ruby

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
  result = client.addresses.list(params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List all Access IP Addresses

`client.access_ip_address.list()` — `GET /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.access_ip_address.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Address

`client.access_ip_address.create()` — `POST /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes |  |
| `description` | string | No |  |

```ruby
access_ip_address_response = client.access_ip_address.create(ip_address: "203.0.113.10")

puts(access_ip_address_response)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve an access IP address

`client.access_ip_address.retrieve()` — `GET /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_address_id` | string (UUID) | Yes |  |

```ruby
access_ip_address_response = client.access_ip_address.retrieve("access_ip_address_id")

puts(access_ip_address_response)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP address

`client.access_ip_address.delete()` — `DELETE /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_address_id` | string (UUID) | Yes |  |

```ruby
access_ip_address_response = client.access_ip_address.delete("access_ip_address_id")

puts(access_ip_address_response)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all addresses

Returns a list of your addresses.

`client.addresses.list()` — `GET /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.addresses.list

puts(page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates an address

Creates an address.

`client.addresses.create()` — `POST /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | Yes | The first name associated with the address. |
| `last_name` | string | Yes | The last name associated with the address. |
| `business_name` | string | Yes | The business name associated with the address. |
| `street_address` | string | Yes | The primary street address information about the address. |
| `locality` | string | Yes | The locality of the address. |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `customer_reference` | string | No | A customer reference string for customer look ups. |
| `phone_number` | string (E.164) | No | The phone number associated with the address. |
| `extended_address` | string | No | Additional street address information about the address such... |
| ... | | | +6 optional params in the API Details section below |

```ruby
address = client.addresses.create(
  business_name: "Toy-O'Kon",
  country_code: "US",
  first_name: "Alfred",
  last_name: "Foster",
  locality: "Austin",
  street_address: "600 Congress Avenue"
)

puts(address)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Validate an address

Validates an address for emergency services.

`client.addresses.actions.validate()` — `POST /addresses/actions/validate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `street_address` | string | Yes | The primary street address information about the address. |
| `postal_code` | string | Yes | The postal code of the address. |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `extended_address` | string | No | Additional street address information about the address such... |
| `locality` | string | No | The locality of the address. |
| `administrative_area` | string | No | The locality of the address. |

```ruby
response = client.addresses.actions.validate(
  country_code: "US",
  postal_code: "78701",
  street_address: "600 Congress Avenue"
)

puts(response)
```

Key response fields: `response.data.errors, response.data.record_type, response.data.result`

## Retrieve an address

Retrieves the details of an existing address.

`client.addresses.retrieve()` — `GET /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```ruby
address = client.addresses.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(address)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Deletes an address

Deletes an existing address.

`client.addresses.delete()` — `DELETE /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```ruby
address = client.addresses.delete("550e8400-e29b-41d4-a716-446655440000")

puts(address)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`client.addresses.actions.accept_suggestions()` — `POST /addresses/{id}/actions/accept_suggestions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The UUID of the address that should be accepted. |
| `id` | string (UUID) | No | The ID of the address. |

```ruby
response = client.addresses.actions.accept_suggestions("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Key response fields: `response.data.id, response.data.accepted, response.data.record_type`

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`client.authentication_providers.list()` — `GET /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (name, -name, short_name, -short_name, active, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.authentication_providers.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Creates an authentication provider

Creates an authentication provider.

`client.authentication_providers.create()` — `POST /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name associated with the authentication provider. |
| `short_name` | string | Yes | The short name associated with the authentication provider. |
| `settings` | object | Yes | The settings associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| `settings_url` | string (URL) | No | The URL for the identity provider metadata file to populate ... |

```ruby
authentication_provider = client.authentication_providers.create(
  name: "Okta",
  settings: {
    idp_cert_fingerprint: "13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7",
    idp_entity_id: "https://myorg.myidp.com/saml/metadata",
    idp_sso_target_url: "https://myorg.myidp.com/trust/saml2/http-post/sso"
  },
  short_name: "myorg"
)

puts(authentication_provider)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`client.authentication_providers.retrieve()` — `GET /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```ruby
authentication_provider = client.authentication_providers.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(authentication_provider)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an authentication provider

Updates settings of an existing authentication provider.

`client.authentication_providers.update()` — `PATCH /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `name` | string | No | The name associated with the authentication provider. |
| `short_name` | string | No | The short name associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| ... | | | +2 optional params in the API Details section below |

```ruby
authentication_provider = client.authentication_providers.update("550e8400-e29b-41d4-a716-446655440000")

puts(authentication_provider)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Deletes an authentication provider

Deletes an existing authentication provider.

`client.authentication_providers.delete()` — `DELETE /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```ruby
authentication_provider = client.authentication_providers.delete("550e8400-e29b-41d4-a716-446655440000")

puts(authentication_provider)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all billing groups

`client.billing_groups.list()` — `GET /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```ruby
page = client.billing_groups.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a billing group

`client.billing_groups.create()` — `POST /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | A name for the billing group |

```ruby
billing_group = client.billing_groups.create

puts(billing_group)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a billing group

`client.billing_groups.retrieve()` — `GET /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```ruby
billing_group = client.billing_groups.retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd")

puts(billing_group)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a billing group

`client.billing_groups.update()` — `PATCH /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |
| `name` | string | No | A name for the billing group |

```ruby
billing_group = client.billing_groups.update("f5586561-8ff0-4291-a0ac-84fe544797bd")

puts(billing_group)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a billing group

`client.billing_groups.delete()` — `DELETE /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```ruby
billing_group = client.billing_groups.delete("f5586561-8ff0-4291-a0ac-84fe544797bd")

puts(billing_group)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`client.integration_secrets.list()` — `GET /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.integration_secrets.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`client.integration_secrets.create()` — `POST /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | The unique identifier of the secret. |
| `type` | enum (bearer, basic) | Yes | The type of secret. |
| `token` | string | No | The token for the secret. |
| `username` | string | No | The username for the secret. |
| `password` | string | No | The password for the secret. |

```ruby
integration_secret = client.integration_secrets.create(identifier: "my_secret", type: :bearer)

puts(integration_secret)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an integration secret

Delete an integration secret given its ID.

`client.integration_secrets.delete()` — `DELETE /integration_secrets/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```ruby
result = client.integration_secrets.delete("550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`client.telephony_credentials.create_token()` — `POST /telephony_credentials/{id}/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
response = client.telephony_credentials.create_token("550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

---

# Account Access (Ruby) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List all Access IP Addresses, Create new Access IP Address, Retrieve an access IP address, Delete access IP address

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `description` | string |
| `id` | string |
| `ip_address` | string |
| `source` | string |
| `status` | enum: pending, added |
| `updated_at` | date-time |
| `user_id` | string |

**Returned by:** List all addresses, Creates an address, Retrieve an address, Deletes an address

| Field | Type |
|-------|------|
| `address_book` | boolean |
| `administrative_area` | string |
| `borough` | string |
| `business_name` | string |
| `country_code` | string |
| `created_at` | string |
| `customer_reference` | string |
| `extended_address` | string |
| `first_name` | string |
| `id` | string |
| `last_name` | string |
| `locality` | string |
| `neighborhood` | string |
| `phone_number` | string |
| `postal_code` | string |
| `record_type` | string |
| `street_address` | string |
| `updated_at` | string |
| `validate_address` | boolean |

**Returned by:** Validate an address

| Field | Type |
|-------|------|
| `errors` | array[object] |
| `record_type` | string |
| `result` | enum: valid, invalid |
| `suggested` | object |

**Returned by:** Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

| Field | Type |
|-------|------|
| `accepted` | boolean |
| `id` | uuid |
| `record_type` | enum: address_suggestion |

**Returned by:** List all SSO authentication providers, Creates an authentication provider, Retrieve an authentication provider, Update an authentication provider, Deletes an authentication provider

| Field | Type |
|-------|------|
| `activated_at` | date-time |
| `active` | boolean |
| `created_at` | date-time |
| `id` | uuid |
| `name` | string |
| `organization_id` | uuid |
| `record_type` | string |
| `settings` | object |
| `short_name` | string |
| `updated_at` | date-time |

**Returned by:** List all billing groups, Create a billing group, Get a billing group, Update a billing group, Delete a billing group

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `deleted_at` | date-time |
| `id` | uuid |
| `name` | string |
| `organization_id` | uuid |
| `record_type` | enum: billing_group |
| `updated_at` | date-time |

**Returned by:** List integration secrets, Create a secret

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `identifier` | string |
| `record_type` | string |
| `updated_at` | date-time |

## Optional Parameters

### Create new Access IP Address — `client.access_ip_address.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |

### Creates an address — `client.addresses.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer_reference` | string | A customer reference string for customer look ups. |
| `phone_number` | string (E.164) | The phone number associated with the address. |
| `extended_address` | string | Additional street address information about the address such as, but not limi... |
| `administrative_area` | string | The locality of the address. |
| `neighborhood` | string | The neighborhood of the address. |
| `borough` | string | The borough of the address. |
| `postal_code` | string | The postal code of the address. |
| `address_book` | boolean | Indicates whether or not the address should be considered part of your list o... |
| `validate_address` | boolean | Indicates whether or not the address should be validated for emergency use up... |

### Validate an address — `client.addresses.actions.validate()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `extended_address` | string | Additional street address information about the address such as, but not limi... |
| `locality` | string | The locality of the address. |
| `administrative_area` | string | The locality of the address. |

### Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft. — `client.addresses.actions.accept_suggestions()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | The ID of the address. |

### Creates an authentication provider — `client.authentication_providers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | The active status of the authentication provider |
| `settings_url` | string (URL) | The URL for the identity provider metadata file to populate the settings auto... |

### Update an authentication provider — `client.authentication_providers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The name associated with the authentication provider. |
| `short_name` | string | The short name associated with the authentication provider. |
| `active` | boolean | The active status of the authentication provider |
| `settings` | object | The settings associated with the authentication provider. |
| `settings_url` | string (URL) | The URL for the identity provider metadata file to populate the settings auto... |

### Create a billing group — `client.billing_groups.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | A name for the billing group |

### Update a billing group — `client.billing_groups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | A name for the billing group |

### Create a secret — `client.integration_secrets.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | The token for the secret. |
| `username` | string | The username for the secret. |
| `password` | string | The password for the secret. |
