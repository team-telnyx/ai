<!-- SDK reference: telnyx-account-access-go -->

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
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
| ... | | | +6 optional params in the API Details section below |

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
| ... | | | +2 optional params in the API Details section below |

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

# Account Access (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List all Access IP Addresses, Create new Access IP Address, Retrieve an access IP address, Delete access IP address

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `description` | string |
| `id` | string |
| `ip_address` | string |
| `source` | string |
| `status` | enum: pending, added |
| `updated_at` | date-time |
| `user_id` | string |

**Returned by:** List all addresses, Creates an address, Retrieve an address, Deletes an address

| Field | Type |
|-------|------|
| `address_book` | boolean |
| `administrative_area` | string |
| `borough` | string |
| `business_name` | string |
| `country_code` | string |
| `created_at` | string |
| `customer_reference` | string |
| `extended_address` | string |
| `first_name` | string |
| `id` | string |
| `last_name` | string |
| `locality` | string |
| `neighborhood` | string |
| `phone_number` | string |
| `postal_code` | string |
| `record_type` | string |
| `street_address` | string |
| `updated_at` | string |
| `validate_address` | boolean |

**Returned by:** Validate an address

| Field | Type |
|-------|------|
| `errors` | array[object] |
| `record_type` | string |
| `result` | enum: valid, invalid |
| `suggested` | object |

**Returned by:** Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

| Field | Type |
|-------|------|
| `accepted` | boolean |
| `id` | uuid |
| `record_type` | enum: address_suggestion |

**Returned by:** List all SSO authentication providers, Creates an authentication provider, Retrieve an authentication provider, Update an authentication provider, Deletes an authentication provider

| Field | Type |
|-------|------|
| `activated_at` | date-time |
| `active` | boolean |
| `created_at` | date-time |
| `id` | uuid |
| `name` | string |
| `organization_id` | uuid |
| `record_type` | string |
| `settings` | object |
| `short_name` | string |
| `updated_at` | date-time |

**Returned by:** List all billing groups, Create a billing group, Get a billing group, Update a billing group, Delete a billing group

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `deleted_at` | date-time |
| `id` | uuid |
| `name` | string |
| `organization_id` | uuid |
| `record_type` | enum: billing_group |
| `updated_at` | date-time |

**Returned by:** List integration secrets, Create a secret

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `identifier` | string |
| `record_type` | string |
| `updated_at` | date-time |

## Optional Parameters

### Create new Access IP Address — `client.AccessIPAddress.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Description` | string |  |

### Creates an address — `client.Addresses.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomerReference` | string | A customer reference string for customer look ups. |
| `PhoneNumber` | string (E.164) | The phone number associated with the address. |
| `ExtendedAddress` | string | Additional street address information about the address such as, but not limi... |
| `AdministrativeArea` | string | The locality of the address. |
| `Neighborhood` | string | The neighborhood of the address. |
| `Borough` | string | The borough of the address. |
| `PostalCode` | string | The postal code of the address. |
| `AddressBook` | boolean | Indicates whether or not the address should be considered part of your list o... |
| `ValidateAddress` | boolean | Indicates whether or not the address should be validated for emergency use up... |

### Validate an address — `client.Addresses.Actions.Validate()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ExtendedAddress` | string | Additional street address information about the address such as, but not limi... |
| `Locality` | string | The locality of the address. |
| `AdministrativeArea` | string | The locality of the address. |

### Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft. — `client.Addresses.Actions.AcceptSuggestions()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | The ID of the address. |

### Creates an authentication provider — `client.AuthenticationProviders.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Active` | boolean | The active status of the authentication provider |
| `SettingsUrl` | string (URL) | The URL for the identity provider metadata file to populate the settings auto... |

### Update an authentication provider — `client.AuthenticationProviders.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string | The name associated with the authentication provider. |
| `ShortName` | string | The short name associated with the authentication provider. |
| `Active` | boolean | The active status of the authentication provider |
| `Settings` | object | The settings associated with the authentication provider. |
| `SettingsUrl` | string (URL) | The URL for the identity provider metadata file to populate the settings auto... |

### Create a billing group — `client.BillingGroups.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string | A name for the billing group |

### Update a billing group — `client.BillingGroups.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string | A name for the billing group |

### Create a secret — `client.IntegrationSecrets.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Token` | string | The token for the secret. |
| `Username` | string | The username for the secret. |
| `Password` | string | The password for the secret. |
