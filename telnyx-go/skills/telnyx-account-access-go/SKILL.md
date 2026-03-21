---
name: telnyx-account-access-go
description: >-
  Account addresses, auth providers, IP access controls, billing groups,
  integration secrets.
metadata:
  author: telnyx
  product: account-access
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - Go

## Core Workflow

### Steps

1. **Manage addresses**: `client.Addresses.Create(ctx, params)`
2. **Configure IP access**: `client.IpAddresses.Create(ctx, params)`
3. **Manage billing groups**: `client.BillingGroups.Create(ctx, params)`

### Common mistakes

- IP access restrictions apply to API and portal — ensure you don't lock yourself out

**Related skills**: telnyx-account-go

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

result, err := client.Addresses.List(ctx, params)
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all Access IP Addresses

`client.AccessIPAddress.List()` — `GET /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AccessIPAddress.List(context.Background(), telnyx.AccessIPAddressListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Address

`client.AccessIPAddress.New()` — `POST /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IpAddress` | string (IPv4/IPv6) | Yes |  |
| `Description` | string | No |  |

```go
	accessIPAddressResponse, err := client.AccessIPAddress.New(context.Background(), telnyx.AccessIPAddressNewParams{
		IPAddress: "203.0.113.10",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", accessIPAddressResponse.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve an access IP address

`client.AccessIPAddress.Get()` — `GET /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccessIpAddressId` | string (UUID) | Yes |  |

```go
	accessIPAddressResponse, err := client.AccessIPAddress.Get(context.Background(), "access_ip_address_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", accessIPAddressResponse.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP address

`client.AccessIPAddress.Delete()` — `DELETE /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AccessIpAddressId` | string (UUID) | Yes |  |

```go
	accessIPAddressResponse, err := client.AccessIPAddress.Delete(context.Background(), "access_ip_address_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", accessIPAddressResponse.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all addresses

Returns a list of your addresses.

`client.Addresses.List()` — `GET /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.Addresses.List(context.Background(), telnyx.AddressListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates an address

Creates an address.

`client.Addresses.New()` — `POST /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `FirstName` | string | Yes | The first name associated with the address. |
| `LastName` | string | Yes | The last name associated with the address. |
| `BusinessName` | string | Yes | The business name associated with the address. |
| `StreetAddress` | string | Yes | The primary street address information about the address. |
| `Locality` | string | Yes | The locality of the address. |
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `CustomerReference` | string | No | A customer reference string for customer look ups. |
| `PhoneNumber` | string (E.164) | No | The phone number associated with the address. |
| `ExtendedAddress` | string | No | Additional street address information about the address such... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```go
	address, err := client.Addresses.New(context.Background(), telnyx.AddressNewParams{
		BusinessName:  "Toy-O'Kon",
		CountryCode:   "US",
		FirstName:     "Alfred",
		LastName:      "Foster",
		Locality:      "Austin",
		StreetAddress: "600 Congress Avenue",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", address.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Validate an address

Validates an address for emergency services.

`client.Addresses.Actions.Validate()` — `POST /addresses/actions/validate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StreetAddress` | string | Yes | The primary street address information about the address. |
| `PostalCode` | string | Yes | The postal code of the address. |
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `ExtendedAddress` | string | No | Additional street address information about the address such... |
| `Locality` | string | No | The locality of the address. |
| `AdministrativeArea` | string | No | The locality of the address. |

```go
	response, err := client.Addresses.Actions.Validate(context.Background(), telnyx.AddressActionValidateParams{
		CountryCode:   "US",
		PostalCode:    "78701",
		StreetAddress: "600 Congress Avenue",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.errors, response.data.record_type, response.data.result`

## Retrieve an address

Retrieves the details of an existing address.

`client.Addresses.Get()` — `GET /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | address ID |

```go
	address, err := client.Addresses.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", address.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Deletes an address

Deletes an existing address.

`client.Addresses.Delete()` — `DELETE /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | address ID |

```go
	address, err := client.Addresses.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", address.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`client.Addresses.Actions.AcceptSuggestions()` — `POST /addresses/{id}/actions/accept_suggestions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The UUID of the address that should be accepted. |
| `Id` | string (UUID) | No | The ID of the address. |

```go
	response, err := client.Addresses.Actions.AcceptSuggestions(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AddressActionAcceptSuggestionsParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.accepted, response.data.record_type`

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`client.AuthenticationProviders.List()` — `GET /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (name, -name, short_name, -short_name, active, ...) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.AuthenticationProviders.List(context.Background(), telnyx.AuthenticationProviderListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Creates an authentication provider

Creates an authentication provider.

`client.AuthenticationProviders.New()` — `POST /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | The name associated with the authentication provider. |
| `ShortName` | string | Yes | The short name associated with the authentication provider. |
| `Settings` | object | Yes | The settings associated with the authentication provider. |
| `Active` | boolean | No | The active status of the authentication provider |
| `SettingsUrl` | string (URL) | No | The URL for the identity provider metadata file to populate ... |

```go
	authenticationProvider, err := client.AuthenticationProviders.New(context.Background(), telnyx.AuthenticationProviderNewParams{
		Name: "Okta",
		Settings: telnyx.SettingsParam{
			IdpCertFingerprint: "13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7",
			IdpEntityID:        "https://myorg.myidp.com/saml/metadata",
			IdpSSOTargetURL:    "https://myorg.myidp.com/trust/saml2/http-post/sso",
		},
		ShortName: "myorg",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", authenticationProvider.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`client.AuthenticationProviders.Get()` — `GET /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | authentication provider ID |

```go
	authenticationProvider, err := client.AuthenticationProviders.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", authenticationProvider.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an authentication provider

Updates settings of an existing authentication provider.

`client.AuthenticationProviders.Update()` — `PATCH /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Name` | string | No | The name associated with the authentication provider. |
| `ShortName` | string | No | The short name associated with the authentication provider. |
| `Active` | boolean | No | The active status of the authentication provider |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	authenticationProvider, err := client.AuthenticationProviders.Update(
		context.Background(),
		"id",
		telnyx.AuthenticationProviderUpdateParams{
			Active: telnyx.Bool(true),
			Name:   telnyx.String("Okta"),
			Settings: telnyx.SettingsParam{
				IdpEntityID:                 "https://myorg.myidp.com/saml/metadata",
				IdpSSOTargetURL:             "https://myorg.myidp.com/trust/saml2/http-post/sso",
				IdpCertFingerprint:          "13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7",
				IdpCertFingerprintAlgorithm: telnyx.SettingsIdpCertFingerprintAlgorithmSha1,
			},
			ShortName: telnyx.String("myorg"),
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", authenticationProvider.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Deletes an authentication provider

Deletes an existing authentication provider.

`client.AuthenticationProviders.Delete()` — `DELETE /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | authentication provider ID |

```go
	authenticationProvider, err := client.AuthenticationProviders.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", authenticationProvider.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all billing groups

`client.BillingGroups.List()` — `GET /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.BillingGroups.List(context.Background(), telnyx.BillingGroupListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a billing group

`client.BillingGroups.New()` — `POST /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | No | A name for the billing group |

```go
	billingGroup, err := client.BillingGroups.New(context.Background(), telnyx.BillingGroupNewParams{
		Name: telnyx.String("string"),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", billingGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a billing group

`client.BillingGroups.Get()` — `GET /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the billing group |

```go
	billingGroup, err := client.BillingGroups.Get(context.Background(), "f5586561-8ff0-4291-a0ac-84fe544797bd")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", billingGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a billing group

`client.BillingGroups.Update()` — `PATCH /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the billing group |
| `Name` | string | No | A name for the billing group |

```go
	billingGroup, err := client.BillingGroups.Update(
		context.Background(),
		"f5586561-8ff0-4291-a0ac-84fe544797bd",
		telnyx.BillingGroupUpdateParams{
			Name: telnyx.String("string"),
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", billingGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a billing group

`client.BillingGroups.Delete()` — `DELETE /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The id of the billing group |

```go
	billingGroup, err := client.BillingGroups.Delete(context.Background(), "f5586561-8ff0-4291-a0ac-84fe544797bd")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", billingGroup.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`client.IntegrationSecrets.List()` — `GET /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.IntegrationSecrets.List(context.Background(), telnyx.IntegrationSecretListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`client.IntegrationSecrets.New()` — `POST /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Identifier` | string | Yes | The unique identifier of the secret. |
| `Type` | enum (bearer, basic) | Yes | The type of secret. |
| `Token` | string | No | The token for the secret. |
| `Username` | string | No | The username for the secret. |
| `Password` | string | No | The password for the secret. |

```go
	integrationSecret, err := client.IntegrationSecrets.New(context.Background(), telnyx.IntegrationSecretNewParams{
		Identifier: "my_secret",
		Type:       telnyx.IntegrationSecretNewParamsTypeBearer,
		Token:      telnyx.String("my_secret_value"),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", integrationSecret.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an integration secret

Delete an integration secret given its ID.

`client.IntegrationSecrets.Delete()` — `DELETE /integration_secrets/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes |  |

```go
	err := client.IntegrationSecrets.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`client.TelephonyCredentials.NewToken()` — `POST /telephony_credentials/{id}/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.TelephonyCredentials.NewToken(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
