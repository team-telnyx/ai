---
name: telnyx-oauth-ruby
description: >-
  Implement OAuth 2.0 authentication flows for Telnyx API access. This skill
  provides Ruby SDK examples.
metadata:
  author: telnyx
  product: oauth
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Oauth - Ruby

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

## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`GET /.well-known/oauth-authorization-server`

```ruby
response = client.well_known.retrieve_authorization_server_metadata

puts(response)
```

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`GET /.well-known/oauth-protected-resource`

```ruby
response = client.well_known.retrieve_protected_resource_metadata

puts(response)
```

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`GET /oauth/authorize`

```ruby
result = client.oauth.retrieve_authorize(
  client_id: "client_id",
  redirect_uri: "https://example.com",
  response_type: :code
)

puts(result)
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`GET /oauth/consent/{consent_token}`

```ruby
oauth = client.oauth.retrieve("consent_token")

puts(oauth)
```

## Create OAuth grant

Create an OAuth authorization grant

`POST /oauth/grants` — Required: `allowed`, `consent_token`

```ruby
response = client.oauth.grants(allowed: true, consent_token: "consent_token")

puts(response)
```

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`POST /oauth/introspect` — Required: `token`

```ruby
response = client.oauth.introspect(token: "token")

puts(response)
```

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`GET /oauth/jwks`

```ruby
response = client.oauth.retrieve_jwks

puts(response)
```

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`POST /oauth/register`

Optional: `client_name` (string), `grant_types` (array[string]), `logo_uri` (uri), `policy_uri` (uri), `redirect_uris` (array[string]), `response_types` (array[string]), `scope` (string), `token_endpoint_auth_method` (enum), `tos_uri` (uri)

```ruby
response = client.oauth.register

puts(response)
```

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`POST /oauth/token` — Required: `grant_type`

Optional: `client_id` (string), `client_secret` (string), `code` (string), `code_verifier` (string), `redirect_uri` (uri), `refresh_token` (string), `scope` (string)

```ruby
response = client.oauth.token(grant_type: :client_credentials)

puts(response)
```

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`GET /oauth_clients`

```ruby
page = client.oauth_clients.list

puts(page)
```

## Create OAuth client

Create a new OAuth client

`POST /oauth_clients` — Required: `name`, `allowed_scopes`, `client_type`, `allowed_grant_types`

Optional: `logo_uri` (uri), `policy_uri` (uri), `redirect_uris` (array[string]), `require_pkce` (boolean), `tos_uri` (uri)

```ruby
oauth_client = client.oauth_clients.create(
  allowed_grant_types: [:client_credentials],
  allowed_scopes: ["admin"],
  client_type: :public,
  name: "My OAuth client"
)

puts(oauth_client)
```

## Get OAuth client

Retrieve a single OAuth client by ID

`GET /oauth_clients/{id}`

```ruby
oauth_client = client.oauth_clients.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_client)
```

## Update OAuth client

Update an existing OAuth client

`PUT /oauth_clients/{id}`

Optional: `allowed_grant_types` (array[string]), `allowed_scopes` (array[string]), `logo_uri` (uri), `name` (string), `policy_uri` (uri), `redirect_uris` (array[string]), `require_pkce` (boolean), `tos_uri` (uri)

```ruby
oauth_client = client.oauth_clients.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_client)
```

## Delete OAuth client

Delete an OAuth client

`DELETE /oauth_clients/{id}`

```ruby
result = client.oauth_clients.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`GET /oauth_grants`

```ruby
page = client.oauth_grants.list

puts(page)
```

## Get OAuth grant

Retrieve a single OAuth grant by ID

`GET /oauth_grants/{id}`

```ruby
oauth_grant = client.oauth_grants.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_grant)
```

## Revoke OAuth grant

Revoke an OAuth grant

`DELETE /oauth_grants/{id}`

```ruby
oauth_grant = client.oauth_grants.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(oauth_grant)
```
