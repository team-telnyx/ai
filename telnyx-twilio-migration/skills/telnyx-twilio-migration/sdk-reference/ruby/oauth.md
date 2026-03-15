<!-- SDK reference: telnyx-oauth-ruby -->

# Telnyx Oauth - Ruby

## Core Workflow

### Prerequisites

1. Create an OAuth client in the Telnyx Portal

### Steps

1. **Create OAuth client**: `client.oauth.clients.create(...: ...)`
2. **Get access token**: `POST /oauth/token with client_id and client_secret`

### Common mistakes

- OAuth tokens are short-lived — implement token refresh logic
- Use OAuth for third-party integrations; use API keys for your own services

**Related skills**: telnyx-account-access-ruby

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
  result = client.oauth.clients.create(params)
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
## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`client.well_known.retrieve_authorization_server_metadata()` — `GET /.well-known/oauth-authorization-server`

```ruby
response = client.well_known.retrieve_authorization_server_metadata

puts(response)
```

Key response fields: `response.data.authorization_endpoint, response.data.code_challenge_methods_supported, response.data.grant_types_supported`

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`client.well_known.retrieve_protected_resource_metadata()` — `GET /.well-known/oauth-protected-resource`

```ruby
response = client.well_known.retrieve_protected_resource_metadata

puts(response)
```

Key response fields: `response.data.authorization_servers, response.data.resource`

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`client.oauth.retrieve_authorize()` — `GET /oauth/authorize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code_challenge_method` | enum (plain, S256) | No | PKCE code challenge method |
| `scope` | string | No | Space-separated list of requested scopes |
| `state` | string | No | State parameter for CSRF protection |
| ... | | | +1 optional params in the API Details section below |

```ruby
result = client.oauth.retrieve_authorize(
  client_id: "550e8400-e29b-41d4-a716-446655440000",
  redirect_uri: "https://example.com",
  response_type: :code
)

puts(result)
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`client.oauth.retrieve()` — `GET /oauth/consent/{consent_token}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `consent_token` | string | Yes | OAuth consent token |

```ruby
oauth = client.oauth.retrieve("consent_token")

puts(oauth)
```

Key response fields: `response.data.name, response.data.client_id, response.data.logo_uri`

## Create OAuth grant

Create an OAuth authorization grant

`client.oauth.grants()` — `POST /oauth/grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `allowed` | boolean | Yes | Whether the grant is allowed |
| `consent_token` | string | Yes | Consent token |

```ruby
response = client.oauth.grants(allowed: true, consent_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example")

puts(response)
```

Key response fields: `response.data.redirect_uri`

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`client.oauth.introspect()` — `POST /oauth/introspect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The token to introspect |

```ruby
response = client.oauth.introspect(token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example")

puts(response)
```

Key response fields: `response.data.active, response.data.aud, response.data.client_id`

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`client.oauth.retrieve_jwks()` — `GET /oauth/jwks`

```ruby
response = client.oauth.retrieve_jwks

puts(response)
```

Key response fields: `response.data.keys`

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`client.oauth.register()` — `POST /oauth/register`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token_endpoint_auth_method` | enum (none, client_secret_basic, client_secret_post) | No | Authentication method for the token endpoint |
| `redirect_uris` | array[string] | No | Array of redirection URI strings for use in redirect-based f... |
| `client_name` | string | No | Human-readable string name of the client to be presented to ... |
| ... | | | +6 optional params in the API Details section below |

```ruby
response = client.oauth.register

puts(response)
```

Key response fields: `response.data.client_id, response.data.client_id_issued_at, response.data.client_name`

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`client.oauth.token()` — `POST /oauth/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | enum (client_credentials, authorization_code, refresh_token) | Yes | OAuth 2.0 grant type |
| `client_id` | string (UUID) | No | OAuth client ID (if not using HTTP Basic auth) |
| `scope` | string | No | Space-separated list of requested scopes (for client_credent... |
| `code` | string | No | Authorization code (for authorization_code flow) |
| ... | | | +4 optional params in the API Details section below |

```ruby
response = client.oauth.token(grant_type: :client_credentials)

puts(response)
```

Key response fields: `response.data.access_token, response.data.expires_in, response.data.refresh_token`

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`client.oauth_clients.list()` — `GET /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[client_type]` | enum (confidential, public) | No | Filter by client type |
| `filter[allowed_grant_types][contains]` | enum (client_credentials, authorization_code, refresh_token) | No | Filter by allowed grant type |
| `page[size]` | integer | No | Number of results per page |
| ... | | | +5 optional params in the API Details section below |

```ruby
page = client.oauth_clients.list

puts(page)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create OAuth client

Create a new OAuth client

`client.oauth_clients.create()` — `POST /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the OAuth client |
| `allowed_scopes` | array[string] | Yes | List of allowed OAuth scopes |
| `client_type` | enum (public, confidential) | Yes | OAuth client type |
| `allowed_grant_types` | array[string] | Yes | List of allowed OAuth grant types |
| `require_pkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| `redirect_uris` | array[string] | No | List of redirect URIs (required for authorization_code flow) |
| `logo_uri` | string (URL) | No | URL of the client logo |
| ... | | | +2 optional params in the API Details section below |

```ruby
oauth_client = client.oauth_clients.create(
  allowed_grant_types: [:client_credentials],
  allowed_scopes: ["admin"],
  client_type: :public,
  name: "My OAuth client"
)

puts(oauth_client)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Get OAuth client

Retrieve a single OAuth client by ID

`client.oauth_clients.retrieve()` — `GET /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```ruby
oauth_client = client.oauth_clients.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_client)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update OAuth client

Update an existing OAuth client

`client.oauth_clients.update()` — `PUT /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |
| `name` | string | No | The name of the OAuth client |
| `allowed_scopes` | array[string] | No | List of allowed OAuth scopes |
| `require_pkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| ... | | | +5 optional params in the API Details section below |

```ruby
oauth_client = client.oauth_clients.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_client)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete OAuth client

Delete an OAuth client

`client.oauth_clients.delete()` — `DELETE /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```ruby
result = client.oauth_clients.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`client.oauth_grants.list()` — `GET /oauth_grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[size]` | integer | No | Number of results per page |
| `page[number]` | integer | No | Page number |

```ruby
page = client.oauth_grants.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Get OAuth grant

Retrieve a single OAuth grant by ID

`client.oauth_grants.retrieve()` — `GET /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```ruby
oauth_grant = client.oauth_grants.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_grant)
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Revoke OAuth grant

Revoke an OAuth grant

`client.oauth_grants.delete()` — `DELETE /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```ruby
oauth_grant = client.oauth_grants.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_grant)
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

---

# OAuth (Ruby) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Authorization server metadata

| Field | Type |
|-------|------|
| `authorization_endpoint` | uri |
| `code_challenge_methods_supported` | array[string] |
| `grant_types_supported` | array[string] |
| `introspection_endpoint` | uri |
| `issuer` | uri |
| `jwks_uri` | uri |
| `registration_endpoint` | uri |
| `response_types_supported` | array[string] |
| `scopes_supported` | array[string] |
| `token_endpoint` | uri |
| `token_endpoint_auth_methods_supported` | array[string] |

**Returned by:** Protected resource metadata

| Field | Type |
|-------|------|
| `authorization_servers` | array[string] |
| `resource` | uri |

**Returned by:** Get OAuth consent token

| Field | Type |
|-------|------|
| `client_id` | string |
| `logo_uri` | uri |
| `name` | string |
| `policy_uri` | uri |
| `redirect_uri` | uri |
| `requested_scopes` | array[object] |
| `tos_uri` | uri |
| `verified` | boolean |

**Returned by:** Create OAuth grant

| Field | Type |
|-------|------|
| `redirect_uri` | uri |

**Returned by:** Token introspection

| Field | Type |
|-------|------|
| `active` | boolean |
| `aud` | string |
| `client_id` | string |
| `exp` | integer |
| `iat` | integer |
| `iss` | string |
| `scope` | string |

**Returned by:** JSON Web Key Set

| Field | Type |
|-------|------|
| `keys` | array[object] |

**Returned by:** Dynamic client registration

| Field | Type |
|-------|------|
| `client_id` | string |
| `client_id_issued_at` | integer |
| `client_name` | string |
| `client_secret` | string |
| `grant_types` | array[string] |
| `logo_uri` | uri |
| `policy_uri` | uri |
| `redirect_uris` | array[string] |
| `response_types` | array[string] |
| `scope` | string |
| `token_endpoint_auth_method` | string |
| `tos_uri` | uri |

**Returned by:** OAuth token endpoint

| Field | Type |
|-------|------|
| `access_token` | string |
| `expires_in` | integer |
| `refresh_token` | string |
| `scope` | string |
| `token_type` | enum: Bearer |

**Returned by:** List OAuth clients, Create OAuth client, Get OAuth client, Update OAuth client

| Field | Type |
|-------|------|
| `allowed_grant_types` | array[string] |
| `allowed_scopes` | array[string] |
| `client_id` | string |
| `client_secret` | string \| null |
| `client_type` | enum: public, confidential |
| `created_at` | date-time |
| `logo_uri` | uri |
| `name` | string |
| `org_id` | string |
| `policy_uri` | uri |
| `record_type` | enum: oauth_client |
| `redirect_uris` | array[string] |
| `require_pkce` | boolean |
| `tos_uri` | uri |
| `updated_at` | date-time |
| `user_id` | string |

**Returned by:** List OAuth grants, Get OAuth grant, Revoke OAuth grant

| Field | Type |
|-------|------|
| `client_id` | string |
| `created_at` | date-time |
| `id` | uuid |
| `last_used_at` | date-time |
| `record_type` | enum: oauth_grant |
| `scopes` | array[string] |

## Optional Parameters

### Dynamic client registration — `client.oauth.register()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `redirect_uris` | array[string] | Array of redirection URI strings for use in redirect-based flows |
| `client_name` | string | Human-readable string name of the client to be presented to the end-user |
| `grant_types` | array[string] | Array of OAuth 2.0 grant type strings that the client may use |
| `response_types` | array[string] | Array of the OAuth 2.0 response type strings that the client may use |
| `scope` | string | Space-separated string of scope values that the client may use |
| `token_endpoint_auth_method` | enum (none, client_secret_basic, client_secret_post) | Authentication method for the token endpoint |
| `logo_uri` | string (URL) | URL of the client logo |
| `tos_uri` | string (URL) | URL of the client's terms of service |
| `policy_uri` | string (URL) | URL of the client's privacy policy |

### OAuth token endpoint — `client.oauth.token()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `scope` | string | Space-separated list of requested scopes (for client_credentials) |
| `code` | string | Authorization code (for authorization_code flow) |
| `redirect_uri` | string (URL) | Redirect URI (for authorization_code flow) |
| `code_verifier` | string | PKCE code verifier (for authorization_code flow) |
| `refresh_token` | string | Refresh token (for refresh_token flow) |
| `client_id` | string (UUID) | OAuth client ID (if not using HTTP Basic auth) |
| `client_secret` | string | OAuth client secret (if not using HTTP Basic auth) |

### Create OAuth client — `client.oauth_clients.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `require_pkce` | boolean | Whether PKCE (Proof Key for Code Exchange) is required for this client |
| `redirect_uris` | array[string] | List of redirect URIs (required for authorization_code flow) |
| `logo_uri` | string (URL) | URL of the client logo |
| `policy_uri` | string (URL) | URL of the client's privacy policy |
| `tos_uri` | string (URL) | URL of the client's terms of service |

### Update OAuth client — `client.oauth_clients.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The name of the OAuth client |
| `allowed_scopes` | array[string] | List of allowed OAuth scopes |
| `require_pkce` | boolean | Whether PKCE (Proof Key for Code Exchange) is required for this client |
| `allowed_grant_types` | array[string] | List of allowed OAuth grant types |
| `redirect_uris` | array[string] | List of redirect URIs |
| `logo_uri` | string (URL) | URL of the client logo |
| `policy_uri` | string (URL) | URL of the client's privacy policy |
| `tos_uri` | string (URL) | URL of the client's terms of service |
