---
name: telnyx-oauth-javascript
description: >-
  Implement OAuth 2.0 authentication flows for Telnyx API access. This skill
  provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: oauth
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Oauth - JavaScript

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

## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`GET /.well-known/oauth-authorization-server`

```javascript
const response = await client.wellKnown.retrieveAuthorizationServerMetadata();

console.log(response.authorization_endpoint);
```

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`GET /.well-known/oauth-protected-resource`

```javascript
const response = await client.wellKnown.retrieveProtectedResourceMetadata();

console.log(response.authorization_servers);
```

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`GET /oauth/authorize`

```javascript
await client.oauth.retrieveAuthorize({
  client_id: 'client_id',
  redirect_uri: 'https://example.com',
  response_type: 'code',
});
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`GET /oauth/consent/{consent_token}`

```javascript
const oauth = await client.oauth.retrieve('consent_token');

console.log(oauth.data);
```

## Create OAuth grant

Create an OAuth authorization grant

`POST /oauth/grants` — Required: `allowed`, `consent_token`

```javascript
const response = await client.oauth.grants({ allowed: true, consent_token: 'consent_token' });

console.log(response.redirect_uri);
```

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`POST /oauth/introspect` — Required: `token`

```javascript
const response = await client.oauth.introspect({ token: 'token' });

console.log(response.client_id);
```

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`GET /oauth/jwks`

```javascript
const response = await client.oauth.retrieveJwks();

console.log(response.keys);
```

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`POST /oauth/register`

Optional: `client_name` (string), `grant_types` (array[string]), `logo_uri` (uri), `policy_uri` (uri), `redirect_uris` (array[string]), `response_types` (array[string]), `scope` (string), `token_endpoint_auth_method` (enum), `tos_uri` (uri)

```javascript
const response = await client.oauth.register();

console.log(response.client_id);
```

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`POST /oauth/token` — Required: `grant_type`

Optional: `client_id` (string), `client_secret` (string), `code` (string), `code_verifier` (string), `redirect_uri` (uri), `refresh_token` (string), `scope` (string)

```javascript
const response = await client.oauth.token({ grant_type: 'client_credentials' });

console.log(response.access_token);
```

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`GET /oauth_clients`

```javascript
// Automatically fetches more pages as needed.
for await (const oauthClient of client.oauthClients.list()) {
  console.log(oauthClient.client_id);
}
```

## Create OAuth client

Create a new OAuth client

`POST /oauth_clients` — Required: `name`, `allowed_scopes`, `client_type`, `allowed_grant_types`

Optional: `logo_uri` (uri), `policy_uri` (uri), `redirect_uris` (array[string]), `require_pkce` (boolean), `tos_uri` (uri)

```javascript
const oauthClient = await client.oauthClients.create({
  allowed_grant_types: ['client_credentials'],
  allowed_scopes: ['admin'],
  client_type: 'public',
  name: 'My OAuth client',
});

console.log(oauthClient.data);
```

## Get OAuth client

Retrieve a single OAuth client by ID

`GET /oauth_clients/{id}`

```javascript
const oauthClient = await client.oauthClients.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthClient.data);
```

## Update OAuth client

Update an existing OAuth client

`PUT /oauth_clients/{id}`

Optional: `allowed_grant_types` (array[string]), `allowed_scopes` (array[string]), `logo_uri` (uri), `name` (string), `policy_uri` (uri), `redirect_uris` (array[string]), `require_pkce` (boolean), `tos_uri` (uri)

```javascript
const oauthClient = await client.oauthClients.update('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthClient.data);
```

## Delete OAuth client

Delete an OAuth client

`DELETE /oauth_clients/{id}`

```javascript
await client.oauthClients.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`GET /oauth_grants`

```javascript
// Automatically fetches more pages as needed.
for await (const oauthGrant of client.oauthGrants.list()) {
  console.log(oauthGrant.id);
}
```

## Get OAuth grant

Retrieve a single OAuth grant by ID

`GET /oauth_grants/{id}`

```javascript
const oauthGrant = await client.oauthGrants.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthGrant.data);
```

## Revoke OAuth grant

Revoke an OAuth grant

`DELETE /oauth_grants/{id}`

```javascript
const oauthGrant = await client.oauthGrants.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(oauthGrant.data);
```
