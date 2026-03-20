---
name: telnyx-account-access-javascript
description: >-
  Account addresses, auth providers, IP access controls, billing groups,
  integration secrets.
metadata:
  author: telnyx
  product: account-access
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - JavaScript

## Core Workflow

### Steps

1. **Manage addresses**: `client.addresses.create({...: ...})`
2. **Configure IP access**: `client.ipAddresses.create({...: ...})`
3. **Manage billing groups**: `client.billingGroups.create({name: ...})`

### Common mistakes

- IP access restrictions apply to API and portal — ensure you don't lock yourself out

**Related skills**: telnyx-account-javascript

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
  const result = await client.addresses.list(params);
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

## List all Access IP Addresses

`client.accessIPAddress.list()` — `GET /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const accessIPAddressResponse of client.accessIPAddress.list()) {
  console.log(accessIPAddressResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Address

`client.accessIPAddress.create()` — `POST /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ipAddress` | string (IPv4/IPv6) | Yes |  |
| `description` | string | No |  |

```javascript
const accessIPAddressResponse = await client.accessIPAddress.create({ ip_address: 'ip_address' });

console.log(accessIPAddressResponse.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve an access IP address

`client.accessIPAddress.retrieve()` — `GET /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accessIpAddressId` | string (UUID) | Yes |  |

```javascript
const accessIPAddressResponse = await client.accessIPAddress.retrieve('access_ip_address_id');

console.log(accessIPAddressResponse.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP address

`client.accessIPAddress.delete()` — `DELETE /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accessIpAddressId` | string (UUID) | Yes |  |

```javascript
const accessIPAddressResponse = await client.accessIPAddress.delete('access_ip_address_id');

console.log(accessIPAddressResponse.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all addresses

Returns a list of your addresses.

`client.addresses.list()` — `GET /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const address of client.addresses.list()) {
  console.log(address.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates an address

Creates an address.

`client.addresses.create()` — `POST /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firstName` | string | Yes | The first name associated with the address. |
| `lastName` | string | Yes | The last name associated with the address. |
| `businessName` | string | Yes | The business name associated with the address. |
| `streetAddress` | string | Yes | The primary street address information about the address. |
| `locality` | string | Yes | The locality of the address. |
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `customerReference` | string | No | A customer reference string for customer look ups. |
| `phoneNumber` | string (E.164) | No | The phone number associated with the address. |
| `extendedAddress` | string | No | Additional street address information about the address such... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const address = await client.addresses.create({
  business_name: "Toy-O'Kon",
  country_code: 'US',
  first_name: 'Alfred',
  last_name: 'Foster',
  locality: 'Austin',
  street_address: '600 Congress Avenue',
});

console.log(address.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Validate an address

Validates an address for emergency services.

`client.addresses.actions.validate()` — `POST /addresses/actions/validate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `streetAddress` | string | Yes | The primary street address information about the address. |
| `postalCode` | string | Yes | The postal code of the address. |
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `extendedAddress` | string | No | Additional street address information about the address such... |
| `locality` | string | No | The locality of the address. |
| `administrativeArea` | string | No | The locality of the address. |

```javascript
const response = await client.addresses.actions.validate({
  country_code: 'US',
  postal_code: '78701',
  street_address: '600 Congress Avenue',
});

console.log(response.data);
```

Key response fields: `response.data.errors, response.data.record_type, response.data.result`

## Retrieve an address

Retrieves the details of an existing address.

`client.addresses.retrieve()` — `GET /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```javascript
const address = await client.addresses.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(address.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Deletes an address

Deletes an existing address.

`client.addresses.delete()` — `DELETE /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```javascript
const address = await client.addresses.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(address.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`client.addresses.actions.acceptSuggestions()` — `POST /addresses/{id}/actions/accept_suggestions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The UUID of the address that should be accepted. |
| `id` | string (UUID) | No | The ID of the address. |

```javascript
const response = await client.addresses.actions.acceptSuggestions(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.accepted, response.data.record_type`

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`client.authenticationProviders.list()` — `GET /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (name, -name, short_name, -short_name, active, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const authenticationProvider of client.authenticationProviders.list()) {
  console.log(authenticationProvider.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Creates an authentication provider

Creates an authentication provider.

`client.authenticationProviders.create()` — `POST /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name associated with the authentication provider. |
| `shortName` | string | Yes | The short name associated with the authentication provider. |
| `settings` | object | Yes | The settings associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| `settingsUrl` | string (URL) | No | The URL for the identity provider metadata file to populate ... |

```javascript
const authenticationProvider = await client.authenticationProviders.create({
  name: 'Okta',
  settings: {
    idp_cert_fingerprint: '13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7',
    idp_entity_id: 'https://myorg.myidp.com/saml/metadata',
    idp_sso_target_url: 'https://myorg.myidp.com/trust/saml2/http-post/sso',
  },
  short_name: 'myorg',
});

console.log(authenticationProvider.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`client.authenticationProviders.retrieve()` — `GET /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```javascript
const authenticationProvider = await client.authenticationProviders.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(authenticationProvider.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an authentication provider

Updates settings of an existing authentication provider.

`client.authenticationProviders.update()` — `PATCH /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `name` | string | No | The name associated with the authentication provider. |
| `shortName` | string | No | The short name associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const authenticationProvider = await client.authenticationProviders.update('id', {
  active: true,
  name: 'Okta',
  settings: {
    idp_entity_id: 'https://myorg.myidp.com/saml/metadata',
    idp_sso_target_url: 'https://myorg.myidp.com/trust/saml2/http-post/sso',
    idp_cert_fingerprint: '13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7',
    idp_cert_fingerprint_algorithm: 'sha1',
  },
  short_name: 'myorg',
});

console.log(authenticationProvider.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Deletes an authentication provider

Deletes an existing authentication provider.

`client.authenticationProviders.delete()` — `DELETE /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```javascript
const authenticationProvider = await client.authenticationProviders.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(authenticationProvider.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all billing groups

`client.billingGroups.list()` — `GET /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const billingGroup of client.billingGroups.list()) {
  console.log(billingGroup.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a billing group

`client.billingGroups.create()` — `POST /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | A name for the billing group |

```javascript
const billingGroup = await client.billingGroups.create({ name: 'my-resource' });

console.log(billingGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a billing group

`client.billingGroups.retrieve()` — `GET /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```javascript
const billingGroup = await client.billingGroups.retrieve('f5586561-8ff0-4291-a0ac-84fe544797bd');

console.log(billingGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a billing group

`client.billingGroups.update()` — `PATCH /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |
| `name` | string | No | A name for the billing group |

```javascript
const billingGroup = await client.billingGroups.update('f5586561-8ff0-4291-a0ac-84fe544797bd', {
  name: 'my-resource',
});

console.log(billingGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a billing group

`client.billingGroups.delete()` — `DELETE /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```javascript
const billingGroup = await client.billingGroups.delete('f5586561-8ff0-4291-a0ac-84fe544797bd');

console.log(billingGroup.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`client.integrationSecrets.list()` — `GET /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const integrationSecret of client.integrationSecrets.list()) {
  console.log(integrationSecret.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`client.integrationSecrets.create()` — `POST /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | The unique identifier of the secret. |
| `type` | enum (bearer, basic) | Yes | The type of secret. |
| `token` | string | No | The token for the secret. |
| `username` | string | No | The username for the secret. |
| `password` | string | No | The password for the secret. |

```javascript
const integrationSecret = await client.integrationSecrets.create({
  identifier: 'my_secret',
  type: 'bearer',
  token: 'my_secret_value',
});

console.log(integrationSecret.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an integration secret

Delete an integration secret given its ID.

`client.integrationSecrets.delete()` — `DELETE /integration_secrets/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
await client.integrationSecrets.delete('550e8400-e29b-41d4-a716-446655440000');
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`client.telephonyCredentials.createToken()` — `POST /telephony_credentials/{id}/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.telephonyCredentials.createToken('550e8400-e29b-41d4-a716-446655440000');

console.log(response);
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
