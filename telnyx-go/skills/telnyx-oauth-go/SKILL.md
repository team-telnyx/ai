---
name: telnyx-oauth-go
description: >-
  Implement OAuth 2.0 authentication flows for Telnyx API access. This skill
  provides Go SDK examples.
metadata:
  author: telnyx
  product: oauth
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Oauth - Go

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

## Authorization server metadata

OAuth 2.0 Authorization Server Metadata (RFC 8414)

`GET /.well-known/oauth-authorization-server`

```go
	response, err := client.WellKnown.GetAuthorizationServerMetadata(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AuthorizationEndpoint)
```

## Protected resource metadata

OAuth 2.0 Protected Resource Metadata for resource discovery

`GET /.well-known/oauth-protected-resource`

```go
	response, err := client.WellKnown.GetProtectedResourceMetadata(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AuthorizationServers)
```

## OAuth authorization endpoint

OAuth 2.0 authorization endpoint for the authorization code flow

`GET /oauth/authorize`

```go
	err := client.OAuth.GetAuthorize(context.TODO(), telnyx.OAuthGetAuthorizeParams{
		ClientID:     "client_id",
		RedirectUri:  "https://example.com",
		ResponseType: telnyx.OAuthGetAuthorizeParamsResponseTypeCode,
	})
	if err != nil {
		panic(err.Error())
	}
```

## Get OAuth consent token

Retrieve details about an OAuth consent token

`GET /oauth/consent/{consent_token}`

```go
	oauth, err := client.OAuth.Get(context.TODO(), "consent_token")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", oauth.Data)
```

## Create OAuth grant

Create an OAuth authorization grant

`POST /oauth/grants` — Required: `allowed`, `consent_token`

```go
	response, err := client.OAuth.Grants(context.TODO(), telnyx.OAuthGrantsParams{
		Allowed:      true,
		ConsentToken: "consent_token",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.RedirectUri)
```

## Token introspection

Introspect an OAuth access token to check its validity and metadata

`POST /oauth/introspect` — Required: `token`

```go
	response, err := client.OAuth.Introspect(context.TODO(), telnyx.OAuthIntrospectParams{
		Token: "token",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.ClientID)
```

## JSON Web Key Set

Retrieve the JSON Web Key Set for token verification

`GET /oauth/jwks`

```go
	response, err := client.OAuth.GetJwks(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Keys)
```

## Dynamic client registration

Register a new OAuth client dynamically (RFC 7591)

`POST /oauth/register`

Optional: `client_name` (string), `grant_types` (array[string]), `logo_uri` (uri), `policy_uri` (uri), `redirect_uris` (array[string]), `response_types` (array[string]), `scope` (string), `token_endpoint_auth_method` (enum), `tos_uri` (uri)

```go
	response, err := client.OAuth.Register(context.TODO(), telnyx.OAuthRegisterParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.ClientID)
```

## OAuth token endpoint

Exchange authorization code, client credentials, or refresh token for access token

`POST /oauth/token` — Required: `grant_type`

Optional: `client_id` (string), `client_secret` (string), `code` (string), `code_verifier` (string), `redirect_uri` (uri), `refresh_token` (string), `scope` (string)

```go
	response, err := client.OAuth.Token(context.TODO(), telnyx.OAuthTokenParams{
		GrantType: telnyx.OAuthTokenParamsGrantTypeClientCredentials,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.AccessToken)
```

## List OAuth clients

Retrieve a paginated list of OAuth clients for the authenticated user

`GET /oauth_clients`

```go
	page, err := client.OAuthClients.List(context.TODO(), telnyx.OAuthClientListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create OAuth client

Create a new OAuth client

`POST /oauth_clients` — Required: `name`, `allowed_scopes`, `client_type`, `allowed_grant_types`

Optional: `logo_uri` (uri), `policy_uri` (uri), `redirect_uris` (array[string]), `require_pkce` (boolean), `tos_uri` (uri)

```go
	oauthClient, err := client.OAuthClients.New(context.TODO(), telnyx.OAuthClientNewParams{
		AllowedGrantTypes: []string{"client_credentials"},
		AllowedScopes:     []string{"admin"},
		ClientType:        telnyx.OAuthClientNewParamsClientTypePublic,
		Name:              "My OAuth client",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", oauthClient.Data)
```

## Get OAuth client

Retrieve a single OAuth client by ID

`GET /oauth_clients/{id}`

```go
	oauthClient, err := client.OAuthClients.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", oauthClient.Data)
```

## Update OAuth client

Update an existing OAuth client

`PUT /oauth_clients/{id}`

Optional: `allowed_grant_types` (array[string]), `allowed_scopes` (array[string]), `logo_uri` (uri), `name` (string), `policy_uri` (uri), `redirect_uris` (array[string]), `require_pkce` (boolean), `tos_uri` (uri)

```go
	oauthClient, err := client.OAuthClients.Update(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.OAuthClientUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", oauthClient.Data)
```

## Delete OAuth client

Delete an OAuth client

`DELETE /oauth_clients/{id}`

```go
	err := client.OAuthClients.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
```

## List OAuth grants

Retrieve a paginated list of OAuth grants for the authenticated user

`GET /oauth_grants`

```go
	page, err := client.OAuthGrants.List(context.TODO(), telnyx.OAuthGrantListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Get OAuth grant

Retrieve a single OAuth grant by ID

`GET /oauth_grants/{id}`

```go
	oauthGrant, err := client.OAuthGrants.Get(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", oauthGrant.Data)
```

## Revoke OAuth grant

Revoke an OAuth grant

`DELETE /oauth_grants/{id}`

```go
	oauthGrant, err := client.OAuthGrants.Delete(context.TODO(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", oauthGrant.Data)
```
