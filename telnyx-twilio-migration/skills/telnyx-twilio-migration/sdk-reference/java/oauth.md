<!-- SDK reference: telnyx-oauth-java -->

# Telnyx Oauth - Java

## Core Workflow

### Prerequisites

1. Create an OAuth client in the Telnyx Portal

### Steps

1. **Create OAuth client**: `client.oauth().clients().create(params)`
2. **Get access token**: `POST /oauth/token with client_id and client_secret`

### Common mistakes

- OAuth tokens are short-lived — implement token refresh logic
- Use OAuth for third-party integrations; use API keys for your own services

**Related skills**: telnyx-account-access-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.oauth().clients().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`client.wellKnown().retrieveAuthorizationServerMetadata()` — `GET /.well-known/oauth-authorization-server`

```java
import com.telnyx.sdk.models.wellknown.WellKnownRetrieveAuthorizationServerMetadataParams;
import com.telnyx.sdk.models.wellknown.WellKnownRetrieveAuthorizationServerMetadataResponse;

WellKnownRetrieveAuthorizationServerMetadataResponse response = client.wellKnown().retrieveAuthorizationServerMetadata();
```

Key response fields: `response.data.authorization_endpoint, response.data.code_challenge_methods_supported, response.data.grant_types_supported`

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`client.wellKnown().retrieveProtectedResourceMetadata()` — `GET /.well-known/oauth-protected-resource`

```java
import com.telnyx.sdk.models.wellknown.WellKnownRetrieveProtectedResourceMetadataParams;
import com.telnyx.sdk.models.wellknown.WellKnownRetrieveProtectedResourceMetadataResponse;

WellKnownRetrieveProtectedResourceMetadataResponse response = client.wellKnown().retrieveProtectedResourceMetadata();
```

Key response fields: `response.data.authorization_servers, response.data.resource`

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`client.oauth().retrieveAuthorize()` — `GET /oauth/authorize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `codeChallengeMethod` | enum (plain, S256) | No | PKCE code challenge method |
| `scope` | string | No | Space-separated list of requested scopes |
| `state` | string | No | State parameter for CSRF protection |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.oauth.OAuthRetrieveAuthorizeParams;

OAuthRetrieveAuthorizeParams params = OAuthRetrieveAuthorizeParams.builder()
    .clientId("550e8400-e29b-41d4-a716-446655440000")
    .redirectUri("https://example.com")
    .responseType(OAuthRetrieveAuthorizeParams.ResponseType.CODE)
    .build();
client.oauth().retrieveAuthorize(params);
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`client.oauth().retrieve()` — `GET /oauth/consent/{consent_token}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `consentToken` | string | Yes | OAuth consent token |

```java
import com.telnyx.sdk.models.oauth.OAuthRetrieveParams;
import com.telnyx.sdk.models.oauth.OAuthRetrieveResponse;

OAuthRetrieveResponse oauth = client.oauth().retrieve("consent_token");
```

Key response fields: `response.data.name, response.data.client_id, response.data.logo_uri`

## Create OAuth grant

Create an OAuth authorization grant

`client.oauth().grants()` — `POST /oauth/grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `allowed` | boolean | Yes | Whether the grant is allowed |
| `consentToken` | string | Yes | Consent token |

```java
import com.telnyx.sdk.models.oauth.OAuthGrantsParams;
import com.telnyx.sdk.models.oauth.OAuthGrantsResponse;

OAuthGrantsParams params = OAuthGrantsParams.builder()
    .allowed(true)
    .consentToken("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example")
    .build();
OAuthGrantsResponse response = client.oauth().grants(params);
```

Key response fields: `response.data.redirect_uri`

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`client.oauth().introspect()` — `POST /oauth/introspect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The token to introspect |

```java
import com.telnyx.sdk.models.oauth.OAuthIntrospectParams;
import com.telnyx.sdk.models.oauth.OAuthIntrospectResponse;

OAuthIntrospectParams params = OAuthIntrospectParams.builder()
    .token("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example")
    .build();
OAuthIntrospectResponse response = client.oauth().introspect(params);
```

Key response fields: `response.data.active, response.data.aud, response.data.client_id`

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`client.oauth().retrieveJwks()` — `GET /oauth/jwks`

```java
import com.telnyx.sdk.models.oauth.OAuthRetrieveJwksParams;
import com.telnyx.sdk.models.oauth.OAuthRetrieveJwksResponse;

OAuthRetrieveJwksResponse response = client.oauth().retrieveJwks();
```

Key response fields: `response.data.keys`

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`client.oauth().register()` — `POST /oauth/register`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenEndpointAuthMethod` | enum (none, client_secret_basic, client_secret_post) | No | Authentication method for the token endpoint |
| `redirectUris` | array[string] | No | Array of redirection URI strings for use in redirect-based f... |
| `clientName` | string | No | Human-readable string name of the client to be presented to ... |
| ... | | | +6 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.oauth.OAuthRegisterParams;
import com.telnyx.sdk.models.oauth.OAuthRegisterResponse;

OAuthRegisterResponse response = client.oauth().register();
```

Key response fields: `response.data.client_id, response.data.client_id_issued_at, response.data.client_name`

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`client.oauth().token()` — `POST /oauth/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grantType` | enum (client_credentials, authorization_code, refresh_token) | Yes | OAuth 2.0 grant type |
| `clientId` | string (UUID) | No | OAuth client ID (if not using HTTP Basic auth) |
| `scope` | string | No | Space-separated list of requested scopes (for client_credent... |
| `code` | string | No | Authorization code (for authorization_code flow) |
| ... | | | +4 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.oauth.OAuthTokenParams;
import com.telnyx.sdk.models.oauth.OAuthTokenResponse;

OAuthTokenParams params = OAuthTokenParams.builder()
    .grantType(OAuthTokenParams.GrantType.CLIENT_CREDENTIALS)
    .build();
OAuthTokenResponse response = client.oauth().token(params);
```

Key response fields: `response.data.access_token, response.data.expires_in, response.data.refresh_token`

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`client.oauthClients().list()` — `GET /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[clientType]` | enum (confidential, public) | No | Filter by client type |
| `filter[allowedGrantTypes][contains]` | enum (client_credentials, authorization_code, refresh_token) | No | Filter by allowed grant type |
| `page[size]` | integer | No | Number of results per page |
| ... | | | +5 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.oauthclients.OAuthClientListPage;
import com.telnyx.sdk.models.oauthclients.OAuthClientListParams;

OAuthClientListPage page = client.oauthClients().list();
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create OAuth client

Create a new OAuth client

`client.oauthClients().create()` — `POST /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the OAuth client |
| `allowedScopes` | array[string] | Yes | List of allowed OAuth scopes |
| `clientType` | enum (public, confidential) | Yes | OAuth client type |
| `allowedGrantTypes` | array[string] | Yes | List of allowed OAuth grant types |
| `requirePkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| `redirectUris` | array[string] | No | List of redirect URIs (required for authorization_code flow) |
| `logoUri` | string (URL) | No | URL of the client logo |
| ... | | | +2 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.oauthclients.OAuthClientCreateParams;
import com.telnyx.sdk.models.oauthclients.OAuthClientCreateResponse;

OAuthClientCreateParams params = OAuthClientCreateParams.builder()
    .addAllowedGrantType(OAuthClientCreateParams.AllowedGrantType.CLIENT_CREDENTIALS)
    .addAllowedScope("admin")
    .clientType(OAuthClientCreateParams.ClientType.PUBLIC)
    .name("My OAuth client")
    .build();
OAuthClientCreateResponse oauthClient = client.oauthClients().create(params);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Get OAuth client

Retrieve a single OAuth client by ID

`client.oauthClients().retrieve()` — `GET /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```java
import com.telnyx.sdk.models.oauthclients.OAuthClientRetrieveParams;
import com.telnyx.sdk.models.oauthclients.OAuthClientRetrieveResponse;

OAuthClientRetrieveResponse oauthClient = client.oauthClients().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update OAuth client

Update an existing OAuth client

`client.oauthClients().update()` — `PUT /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |
| `name` | string | No | The name of the OAuth client |
| `allowedScopes` | array[string] | No | List of allowed OAuth scopes |
| `requirePkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| ... | | | +5 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.oauthclients.OAuthClientUpdateParams;
import com.telnyx.sdk.models.oauthclients.OAuthClientUpdateResponse;

OAuthClientUpdateResponse oauthClient = client.oauthClients().update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete OAuth client

Delete an OAuth client

`client.oauthClients().delete()` — `DELETE /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth client ID |

```java
import com.telnyx.sdk.models.oauthclients.OAuthClientDeleteParams;

client.oauthClients().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`client.oauthGrants().list()` — `GET /oauth_grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[size]` | integer | No | Number of results per page |
| `page[number]` | integer | No | Page number |

```java
import com.telnyx.sdk.models.oauthgrants.OAuthGrantListPage;
import com.telnyx.sdk.models.oauthgrants.OAuthGrantListParams;

OAuthGrantListPage page = client.oauthGrants().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Get OAuth grant

Retrieve a single OAuth grant by ID

`client.oauthGrants().retrieve()` — `GET /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```java
import com.telnyx.sdk.models.oauthgrants.OAuthGrantRetrieveParams;
import com.telnyx.sdk.models.oauthgrants.OAuthGrantRetrieveResponse;

OAuthGrantRetrieveResponse oauthGrant = client.oauthGrants().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Revoke OAuth grant

Revoke an OAuth grant

`client.oauthGrants().delete()` — `DELETE /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | OAuth grant ID |

```java
import com.telnyx.sdk.models.oauthgrants.OAuthGrantDeleteParams;
import com.telnyx.sdk.models.oauthgrants.OAuthGrantDeleteResponse;

OAuthGrantDeleteResponse oauthGrant = client.oauthGrants().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

---

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
