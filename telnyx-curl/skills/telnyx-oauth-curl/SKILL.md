---
name: telnyx-oauth-curl
description: >-
  OAuth 2.0 authentication flows for Telnyx API access.
metadata:
  author: telnyx
  product: oauth
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Oauth - curl

## Core Workflow

### Prerequisites

1. Create an OAuth client in the Telnyx Portal

### Steps

1. **Create OAuth client**
2. **Get access token**

### Common mistakes

- OAuth tokens are short-lived — implement token refresh logic
- Use OAuth for third-party integrations; use API keys for your own services

**Related skills**: telnyx-account-access-curl

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`GET /.well-known/oauth-authorization-server`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/.well-known/oauth-authorization-server"
```

Key response fields: `.data.authorization_endpoint, .data.code_challenge_methods_supported, .data.grant_types_supported`

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`GET /.well-known/oauth-protected-resource`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/.well-known/oauth-protected-resource"
```

Key response fields: `.data.authorization_servers, .data.resource`

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`GET /oauth/authorize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code_challenge_method` | enum (plain, S256) | No | PKCE code challenge method |
| `scope` | string | No | Space-separated list of requested scopes |
| `state` | string | No | State parameter for CSRF protection |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth/authorize?scope=admin"
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`GET /oauth/consent/{consent_token}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `consent_token` | string | Yes | OAuth consent token |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth/consent/{consent_token}"
```

Key response fields: `.data.name, .data.client_id, .data.logo_uri`

## Create OAuth grant

Create an OAuth authorization grant

`POST /oauth/grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `allowed` | boolean | Yes | Whether the grant is allowed |
| `consent_token` | string | Yes | Consent token |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "allowed": true,
  "consent_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example"
}' \
  "https://api.telnyx.com/v2/oauth/grants"
```

Key response fields: `.data.redirect_uri`

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`POST /oauth/introspect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The token to introspect |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example"
}' \
  "https://api.telnyx.com/v2/oauth/introspect"
```

Key response fields: `.data.active, .data.aud, .data.client_id`

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`GET /oauth/jwks`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth/jwks"
```

Key response fields: `.data.keys`

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`POST /oauth/register`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token_endpoint_auth_method` | enum (none, client_secret_basic, client_secret_post) | No | Authentication method for the token endpoint |
| `redirect_uris` | array[string] | No | Array of redirection URI strings for use in redirect-based f... |
| `client_name` | string | No | Human-readable string name of the client to be presented to ... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/oauth/register"
```

Key response fields: `.data.client_id, .data.client_id_issued_at, .data.client_name`

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`POST /oauth/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | enum (client_credentials, authorization_code, refresh_token) | Yes | OAuth 2.0 grant type |
| `client_id` | string (UUID) | No | OAuth client ID (if not using HTTP Basic auth) |
| `scope` | string | No | Space-separated list of requested scopes (for client_credent... |
| `code` | string | No | Authorization code (for authorization_code flow) |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "grant_type": "client_credentials"
}' \
  "https://api.telnyx.com/v2/oauth/token"
```

Key response fields: `.data.access_token, .data.expires_in, .data.refresh_token`

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`GET /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[client_type]` | enum (confidential, public) | No | Filter by client type |
| `filter[allowed_grant_types][contains]` | enum (client_credentials, authorization_code, refresh_token) | No | Filter by allowed grant type |
| `page[size]` | integer | No | Number of results per page |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth_clients"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Create OAuth client

Create a new OAuth client

`POST /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the OAuth client |
| `allowed_scopes` | array[string] | Yes | List of allowed OAuth scopes |
| `client_type` | enum (public, confidential) | Yes | OAuth client type |
| `allowed_grant_types` | array[string] | Yes | List of allowed OAuth grant types |
| `require_pkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| `redirect_uris` | array[string] | No | List of redirect URIs (required for authorization_code flow) |
| `logo_uri` | string (URL) | No | URL of the client logo |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "My OAuth client",
  "allowed_scopes": [
    "admin"
  ],
  "client_type": "public",
  "allowed_grant_types": [
    "client_credentials"
  ]
}' \
  "https://api.telnyx.com/v2/oauth_clients"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Get OAuth client

Retrieve a single OAuth client by ID

`GET /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth_clients/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Update OAuth client

Update an existing OAuth client

`PUT /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |
| `name` | string | No | The name of the OAuth client |
| `allowed_scopes` | array[string] | No | List of allowed OAuth scopes |
| `require_pkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/oauth_clients/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Delete OAuth client

Delete an OAuth client

`DELETE /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/oauth_clients/550e8400-e29b-41d4-a716-446655440000"
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`GET /oauth_grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[size]` | integer | No | Number of results per page |
| `page[number]` | integer | No | Page number |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth_grants"
```

Key response fields: `.data.id, .data.created_at, .data.client_id`

## Get OAuth grant

Retrieve a single OAuth grant by ID

`GET /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/oauth_grants/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.client_id`

## Revoke OAuth grant

Revoke an OAuth grant

`DELETE /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/oauth_grants/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.created_at, .data.client_id`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
