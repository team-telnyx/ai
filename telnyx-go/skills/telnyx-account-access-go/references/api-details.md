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
