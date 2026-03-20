---
name: telnyx-oauth-javascript
description: >-
  OAuth 2.0 authentication flows for Telnyx API access.
metadata:
  author: telnyx
  product: oauth
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Oauth - JavaScript

## Core Workflow

### Prerequisites

1. Create an OAuth client in the Telnyx Portal

### Steps

1. **Create OAuth client**: `client.oauth.clients.create({...: ...})`
2. **Get access token**: `POST /oauth/token with client_id and client_secret`

### Common mistakes

- OAuth tokens are short-lived — implement token refresh logic
- Use OAuth for third-party integrations; use API keys for your own services

**Related skills**: telnyx-account-access-javascript

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
  const result = await client.oauth.clients.create(params);
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

## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`client.wellKnown.retrieveAuthorizationServerMetadata()` — `GET /.well-known/oauth-authorization-server`

```javascript
const response = await client.wellKnown.retrieveAuthorizationServerMetadata();

console.log(response.authorization_endpoint);
```

Key response fields: `response.data.authorization_endpoint, response.data.code_challenge_methods_supported, response.data.grant_types_supported`

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`client.wellKnown.retrieveProtectedResourceMetadata()` — `GET /.well-known/oauth-protected-resource`

```javascript
const response = await client.wellKnown.retrieveProtectedResourceMetadata();

console.log(response.authorization_servers);
```

Key response fields: `response.data.authorization_servers, response.data.resource`

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`client.oauth.retrieveAuthorize()` — `GET /oauth/authorize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `codeChallengeMethod` | enum (plain, S256) | No | PKCE code challenge method |
| `scope` | string | No | Space-separated list of requested scopes |
| `state` | string | No | State parameter for CSRF protection |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
await client.oauth.retrieveAuthorize({
  client_id: '550e8400-e29b-41d4-a716-446655440000',
  redirect_uri: 'https://example.com',
  response_type: 'code',
});
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`client.oauth.retrieve()` — `GET /oauth/consent/{consent_token}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `consentToken` | string | Yes | OAuth consent token |

```javascript
const oauth = await client.oauth.retrieve('consent_token');

console.log(oauth.data);
```

Key response fields: `response.data.name, response.data.client_id, response.data.logo_uri`

## Create OAuth grant

Create an OAuth authorization grant

`client.oauth.grants()` — `POST /oauth/grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `allowed` | boolean | Yes | Whether the grant is allowed |
| `consentToken` | string | Yes | Consent token |

```javascript
const response = await client.oauth.grants({ allowed: true, consent_token: 'consent_token' });

console.log(response.redirect_uri);
```

Key response fields: `response.data.redirect_uri`

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`client.oauth.introspect()` — `POST /oauth/introspect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The token to introspect |

```javascript
const response = await client.oauth.introspect({ token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example' });

console.log(response.client_id);
```

Key response fields: `response.data.active, response.data.aud, response.data.client_id`

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`client.oauth.retrieveJwks()` — `GET /oauth/jwks`

```javascript
const response = await client.oauth.retrieveJwks();

console.log(response.keys);
```

Key response fields: `response.data.keys`

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`client.oauth.register()` — `POST /oauth/register`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenEndpointAuthMethod` | enum (none, client_secret_basic, client_secret_post) | No | Authentication method for the token endpoint |
| `redirectUris` | array[string] | No | Array of redirection URI strings for use in redirect-based f... |
| `clientName` | string | No | Human-readable string name of the client to be presented to ... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.oauth.register();

console.log(response.client_id);
```

Key response fields: `response.data.client_id, response.data.client_id_issued_at, response.data.client_name`

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`client.oauth.token()` — `POST /oauth/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grantType` | enum (client_credentials, authorization_code, refresh_token) | Yes | OAuth 2.0 grant type |
| `clientId` | string (UUID) | No | OAuth client ID (if not using HTTP Basic auth) |
| `scope` | string | No | Space-separated list of requested scopes (for client_credent... |
| `code` | string | No | Authorization code (for authorization_code flow) |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.oauth.token({ grant_type: 'client_credentials' });

console.log(response.access_token);
```

Key response fields: `response.data.access_token, response.data.expires_in, response.data.refresh_token`

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`client.oauthClients.list()` — `GET /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[clientType]` | enum (confidential, public) | No | Filter by client type |
| `filter[allowedGrantTypes][contains]` | enum (client_credentials, authorization_code, refresh_token) | No | Filter by allowed grant type |
| `page[size]` | integer | No | Number of results per page |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const oauthClient of client.oauthClients.list()) {
  console.log(oauthClient.client_id);
}
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create OAuth client

Create a new OAuth client

`client.oauthClients.create()` — `POST /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the OAuth client |
| `allowedScopes` | array[string] | Yes | List of allowed OAuth scopes |
| `clientType` | enum (public, confidential) | Yes | OAuth client type |
| `allowedGrantTypes` | array[string] | Yes | List of allowed OAuth grant types |
| `requirePkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| `redirectUris` | array[string] | No | List of redirect URIs (required for authorization_code flow) |
| `logoUri` | string (URL) | No | URL of the client logo |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const oauthClient = await client.oauthClients.create({
  allowed_grant_types: ['client_credentials'],
  allowed_scopes: ['admin'],
  client_type: 'public',
  name: 'My OAuth client',
});

console.log(oauthClient.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Get OAuth client

Retrieve a single OAuth client by ID

`client.oauthClients.retrieve()` — `GET /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```javascript
const oauthClient = await client.oauthClients.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthClient.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update OAuth client

Update an existing OAuth client

`client.oauthClients.update()` — `PUT /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |
| `name` | string | No | The name of the OAuth client |
| `allowedScopes` | array[string] | No | List of allowed OAuth scopes |
| `requirePkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const oauthClient = await client.oauthClients.update('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthClient.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete OAuth client

Delete an OAuth client

`client.oauthClients.delete()` — `DELETE /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```javascript
await client.oauthClients.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`client.oauthGrants.list()` — `GET /oauth_grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[size]` | integer | No | Number of results per page |
| `page[number]` | integer | No | Page number |

```javascript
// Automatically fetches more pages as needed.
for await (const oauthGrant of client.oauthGrants.list()) {
  console.log(oauthGrant.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Get OAuth grant

Retrieve a single OAuth grant by ID

`client.oauthGrants.retrieve()` — `GET /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```javascript
const oauthGrant = await client.oauthGrants.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthGrant.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Revoke OAuth grant

Revoke an OAuth grant

`client.oauthGrants.delete()` — `DELETE /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```javascript
const oauthGrant = await client.oauthGrants.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthGrant.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
