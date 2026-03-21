# OAuth (Java) — API Details

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

### Dynamic client registration — `client.oauth().register()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `redirectUris` | array[string] | Array of redirection URI strings for use in redirect-based flows |
| `clientName` | string | Human-readable string name of the client to be presented to the end-user |
| `grantTypes` | array[string] | Array of OAuth 2.0 grant type strings that the client may use |
| `responseTypes` | array[string] | Array of the OAuth 2.0 response type strings that the client may use |
| `scope` | string | Space-separated string of scope values that the client may use |
| `tokenEndpointAuthMethod` | enum (none, client_secret_basic, client_secret_post) | Authentication method for the token endpoint |
| `logoUri` | string (URL) | URL of the client logo |
| `tosUri` | string (URL) | URL of the client's terms of service |
| `policyUri` | string (URL) | URL of the client's privacy policy |

### OAuth token endpoint — `client.oauth().token()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `scope` | string | Space-separated list of requested scopes (for client_credentials) |
| `code` | string | Authorization code (for authorization_code flow) |
| `redirectUri` | string (URL) | Redirect URI (for authorization_code flow) |
| `codeVerifier` | string | PKCE code verifier (for authorization_code flow) |
| `refreshToken` | string | Refresh token (for refresh_token flow) |
| `clientId` | string (UUID) | OAuth client ID (if not using HTTP Basic auth) |
| `clientSecret` | string | OAuth client secret (if not using HTTP Basic auth) |

### Create OAuth client — `client.oauthClients().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `requirePkce` | boolean | Whether PKCE (Proof Key for Code Exchange) is required for this client |
| `redirectUris` | array[string] | List of redirect URIs (required for authorization_code flow) |
| `logoUri` | string (URL) | URL of the client logo |
| `policyUri` | string (URL) | URL of the client's privacy policy |
| `tosUri` | string (URL) | URL of the client's terms of service |

### Update OAuth client — `client.oauthClients().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The name of the OAuth client |
| `allowedScopes` | array[string] | List of allowed OAuth scopes |
| `requirePkce` | boolean | Whether PKCE (Proof Key for Code Exchange) is required for this client |
| `allowedGrantTypes` | array[string] | List of allowed OAuth grant types |
| `redirectUris` | array[string] | List of redirect URIs |
| `logoUri` | string (URL) | URL of the client logo |
| `policyUri` | string (URL) | URL of the client's privacy policy |
| `tosUri` | string (URL) | URL of the client's terms of service |
