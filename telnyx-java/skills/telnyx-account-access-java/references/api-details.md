# Account Access (Java) — API Details

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

### Create new Access IP Address — `client.accessIpAddress().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |

### Creates an address — `client.addresses().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string | A customer reference string for customer look ups. |
| `phoneNumber` | string (E.164) | The phone number associated with the address. |
| `extendedAddress` | string | Additional street address information about the address such as, but not limi... |
| `administrativeArea` | string | The locality of the address. |
| `neighborhood` | string | The neighborhood of the address. |
| `borough` | string | The borough of the address. |
| `postalCode` | string | The postal code of the address. |
| `addressBook` | boolean | Indicates whether or not the address should be considered part of your list o... |
| `validateAddress` | boolean | Indicates whether or not the address should be validated for emergency use up... |

### Validate an address — `client.addresses().actions().validate()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `extendedAddress` | string | Additional street address information about the address such as, but not limi... |
| `locality` | string | The locality of the address. |
| `administrativeArea` | string | The locality of the address. |

### Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft. — `client.addresses().actions().acceptSuggestions()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | The ID of the address. |

### Creates an authentication provider — `client.authenticationProviders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | The active status of the authentication provider |
| `settingsUrl` | string (URL) | The URL for the identity provider metadata file to populate the settings auto... |

### Update an authentication provider — `client.authenticationProviders().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | The name associated with the authentication provider. |
| `shortName` | string | The short name associated with the authentication provider. |
| `active` | boolean | The active status of the authentication provider |
| `settings` | object | The settings associated with the authentication provider. |
| `settingsUrl` | string (URL) | The URL for the identity provider metadata file to populate the settings auto... |

### Create a billing group — `client.billingGroups().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | A name for the billing group |

### Update a billing group — `client.billingGroups().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | A name for the billing group |

### Create a secret — `client.integrationSecrets().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | The token for the secret. |
| `username` | string | The username for the secret. |
| `password` | string | The password for the secret. |
