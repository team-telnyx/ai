<!-- SDK reference: telnyx-oauth-go -->

# Telnyx Oauth - Go

## Core Workflow

### Prerequisites

1. Create an OAuth client in the Telnyx Portal

### Steps

1. **Create OAuth client**: `client.Oauth.Clients.Create(ctx, params)`
2. **Get access token**: `POST /oauth/token with client_id and client_secret`

### Common mistakes

- OAuth tokens are short-lived — implement token refresh logic
- Use OAuth for third-party integrations; use API keys for your own services

**Related skills**: telnyx-account-access-go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Oauth.Clients.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`client.WellKnown.GetAuthorizationServerMetadata()` — `GET /.well-known/oauth-authorization-server`

```go
	response, err := client.WellKnown.GetAuthorizationServerMetadata(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AuthorizationEndpoint)
```

Key response fields: `response.data.authorization_endpoint, response.data.code_challenge_methods_supported, response.data.grant_types_supported`

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`client.WellKnown.GetProtectedResourceMetadata()` — `GET /.well-known/oauth-protected-resource`

```go
	response, err := client.WellKnown.GetProtectedResourceMetadata(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AuthorizationServers)
```

Key response fields: `response.data.authorization_servers, response.data.resource`

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`client.OAuth.GetAuthorize()` — `GET /oauth/authorize`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CodeChallengeMethod` | enum (plain, S256) | No | PKCE code challenge method |
| `Scope` | string | No | Space-separated list of requested scopes |
| `State` | string | No | State parameter for CSRF protection |
| ... | | | +1 optional params in the API Details section below |

```go
	err := client.OAuth.GetAuthorize(context.Background(), telnyx.OAuthGetAuthorizeParams{
		ClientID: "550e8400-e29b-41d4-a716-446655440000",
		RedirectUri:  "https://example.com",
		ResponseType: telnyx.OAuthGetAuthorizeParamsResponseTypeCode,
	})
	if err != nil {
		log.Fatal(err)
	}
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`client.OAuth.Get()` — `GET /oauth/consent/{consent_token}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConsentToken` | string | Yes | OAuth consent token |

```go
	oauth, err := client.OAuth.Get(context.Background(), "consent_token")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", oauth.Data)
```

Key response fields: `response.data.name, response.data.client_id, response.data.logo_uri`

## Create OAuth grant

Create an OAuth authorization grant

`client.OAuth.Grants()` — `POST /oauth/grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Allowed` | boolean | Yes | Whether the grant is allowed |
| `ConsentToken` | string | Yes | Consent token |

```go
	response, err := client.OAuth.Grants(context.Background(), telnyx.OAuthGrantsParams{
		Allowed:      true,
		ConsentToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.RedirectUri)
```

Key response fields: `response.data.redirect_uri`

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`client.OAuth.Introspect()` — `POST /oauth/introspect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Token` | string | Yes | The token to introspect |

```go
	response, err := client.OAuth.Introspect(context.Background(), telnyx.OAuthIntrospectParams{
		Token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.ClientID)
```

Key response fields: `response.data.active, response.data.aud, response.data.client_id`

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`client.OAuth.GetJwks()` — `GET /oauth/jwks`

```go
	response, err := client.OAuth.GetJwks(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Keys)
```

Key response fields: `response.data.keys`

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`client.OAuth.Register()` — `POST /oauth/register`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TokenEndpointAuthMethod` | enum (none, client_secret_basic, client_secret_post) | No | Authentication method for the token endpoint |
| `RedirectUris` | array[string] | No | Array of redirection URI strings for use in redirect-based f... |
| `ClientName` | string | No | Human-readable string name of the client to be presented to ... |
| ... | | | +6 optional params in the API Details section below |

```go
	response, err := client.OAuth.Register(context.Background(), telnyx.OAuthRegisterParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.ClientID)
```

Key response fields: `response.data.client_id, response.data.client_id_issued_at, response.data.client_name`

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`client.OAuth.Token()` — `POST /oauth/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `GrantType` | enum (client_credentials, authorization_code, refresh_token) | Yes | OAuth 2.0 grant type |
| `ClientId` | string (UUID) | No | OAuth client ID (if not using HTTP Basic auth) |
| `Scope` | string | No | Space-separated list of requested scopes (for client_credent... |
| `Code` | string | No | Authorization code (for authorization_code flow) |
| ... | | | +4 optional params in the API Details section below |

```go
	response, err := client.OAuth.Token(context.Background(), telnyx.OAuthTokenParams{
		GrantType: telnyx.OAuthTokenParamsGrantTypeClientCredentials,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.AccessToken)
```

Key response fields: `response.data.access_token, response.data.expires_in, response.data.refresh_token`

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`client.OAuthClients.List()` — `GET /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter[clientType]` | enum (confidential, public) | No | Filter by client type |
| `Filter[allowedGrantTypes][contains]` | enum (client_credentials, authorization_code, refresh_token) | No | Filter by allowed grant type |
| `Page[size]` | integer | No | Number of results per page |
| ... | | | +5 optional params in the API Details section below |

```go
	page, err := client.OAuthClients.List(context.Background(), telnyx.OAuthClientListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create OAuth client

Create a new OAuth client

`client.OAuthClients.New()` — `POST /oauth_clients`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | The name of the OAuth client |
| `AllowedScopes` | array[string] | Yes | List of allowed OAuth scopes |
| `ClientType` | enum (public, confidential) | Yes | OAuth client type |
| `AllowedGrantTypes` | array[string] | Yes | List of allowed OAuth grant types |
| `RequirePkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| `RedirectUris` | array[string] | No | List of redirect URIs (required for authorization_code flow) |
| `LogoUri` | string (URL) | No | URL of the client logo |
| ... | | | +2 optional params in the API Details section below |

```go
	oauthClient, err := client.OAuthClients.New(context.Background(), telnyx.OAuthClientNewParams{
		AllowedGrantTypes: []string{"client_credentials"},
		AllowedScopes:     []string{"admin"},
		ClientType:        telnyx.OAuthClientNewParamsClientTypePublic,
		Name:              "My OAuth client",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", oauthClient.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Get OAuth client

Retrieve a single OAuth client by ID

`client.OAuthClients.Get()` — `GET /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | OAuth client ID |

```go
	oauthClient, err := client.OAuthClients.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", oauthClient.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update OAuth client

Update an existing OAuth client

`client.OAuthClients.Update()` — `PUT /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | OAuth client ID |
| `Name` | string | No | The name of the OAuth client |
| `AllowedScopes` | array[string] | No | List of allowed OAuth scopes |
| `RequirePkce` | boolean | No | Whether PKCE (Proof Key for Code Exchange) is required for t... |
| ... | | | +5 optional params in the API Details section below |

```go
	oauthClient, err := client.OAuthClients.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.OAuthClientUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", oauthClient.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete OAuth client

Delete an OAuth client

`client.OAuthClients.Delete()` — `DELETE /oauth_clients/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | OAuth client ID |

```go
	err := client.OAuthClients.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`client.OAuthGrants.List()` — `GET /oauth_grants`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[size]` | integer | No | Number of results per page |
| `Page[number]` | integer | No | Page number |

```go
	page, err := client.OAuthGrants.List(context.Background(), telnyx.OAuthGrantListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Get OAuth grant

Retrieve a single OAuth grant by ID

`client.OAuthGrants.Get()` — `GET /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | OAuth grant ID |

```go
	oauthGrant, err := client.OAuthGrants.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", oauthGrant.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

## Revoke OAuth grant

Revoke an OAuth grant

`client.OAuthGrants.Delete()` — `DELETE /oauth_grants/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | OAuth grant ID |

```go
	oauthGrant, err := client.OAuthGrants.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", oauthGrant.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.client_id`

---

# OAuth (Go) — API Details

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

### Dynamic client registration — `client.OAuth.Register()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RedirectUris` | array[string] | Array of redirection URI strings for use in redirect-based flows |
| `ClientName` | string | Human-readable string name of the client to be presented to the end-user |
| `GrantTypes` | array[string] | Array of OAuth 2.0 grant type strings that the client may use |
| `ResponseTypes` | array[string] | Array of the OAuth 2.0 response type strings that the client may use |
| `Scope` | string | Space-separated string of scope values that the client may use |
| `TokenEndpointAuthMethod` | enum (none, client_secret_basic, client_secret_post) | Authentication method for the token endpoint |
| `LogoUri` | string (URL) | URL of the client logo |
| `TosUri` | string (URL) | URL of the client's terms of service |
| `PolicyUri` | string (URL) | URL of the client's privacy policy |

### OAuth token endpoint — `client.OAuth.Token()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Scope` | string | Space-separated list of requested scopes (for client_credentials) |
| `Code` | string | Authorization code (for authorization_code flow) |
| `RedirectUri` | string (URL) | Redirect URI (for authorization_code flow) |
| `CodeVerifier` | string | PKCE code verifier (for authorization_code flow) |
| `RefreshToken` | string | Refresh token (for refresh_token flow) |
| `ClientId` | string (UUID) | OAuth client ID (if not using HTTP Basic auth) |
| `ClientSecret` | string | OAuth client secret (if not using HTTP Basic auth) |

### Create OAuth client — `client.OAuthClients.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `RequirePkce` | boolean | Whether PKCE (Proof Key for Code Exchange) is required for this client |
| `RedirectUris` | array[string] | List of redirect URIs (required for authorization_code flow) |
| `LogoUri` | string (URL) | URL of the client logo |
| `PolicyUri` | string (URL) | URL of the client's privacy policy |
| `TosUri` | string (URL) | URL of the client's terms of service |

### Update OAuth client — `client.OAuthClients.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string | The name of the OAuth client |
| `AllowedScopes` | array[string] | List of allowed OAuth scopes |
| `RequirePkce` | boolean | Whether PKCE (Proof Key for Code Exchange) is required for this client |
| `AllowedGrantTypes` | array[string] | List of allowed OAuth grant types |
| `RedirectUris` | array[string] | List of redirect URIs |
| `LogoUri` | string (URL) | URL of the client logo |
| `PolicyUri` | string (URL) | URL of the client's privacy policy |
| `TosUri` | string (URL) | URL of the client's terms of service |
