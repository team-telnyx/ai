---
name: telnyx-account-access-javascript
description: >-
  Configure account addresses, authentication providers, IP access controls,
  billing groups, and integration secrets. This skill provides JavaScript SDK
  examples.
metadata:
  author: telnyx
  product: account-access
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - JavaScript

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

## List all Access IP Addresses

`GET /access_ip_address`

```javascript
// Automatically fetches more pages as needed.
for await (const accessIPAddressResponse of client.accessIPAddress.list()) {
  console.log(accessIPAddressResponse.id);
}
```

## Create new Access IP Address

`POST /access_ip_address` — Required: `ip_address`

Optional: `description` (string)

```javascript
const accessIPAddressResponse = await client.accessIPAddress.create({ ip_address: 'ip_address' });

console.log(accessIPAddressResponse.id);
```

## Retrieve an access IP address

`GET /access_ip_address/{access_ip_address_id}`

```javascript
const accessIPAddressResponse = await client.accessIPAddress.retrieve('access_ip_address_id');

console.log(accessIPAddressResponse.id);
```

## Delete access IP address

`DELETE /access_ip_address/{access_ip_address_id}`

```javascript
const accessIPAddressResponse = await client.accessIPAddress.delete('access_ip_address_id');

console.log(accessIPAddressResponse.id);
```

## List all addresses

Returns a list of your addresses.

`GET /addresses`

```javascript
// Automatically fetches more pages as needed.
for await (const address of client.addresses.list()) {
  console.log(address.id);
}
```

## Creates an address

Creates an address.

`POST /addresses` — Required: `first_name`, `last_name`, `business_name`, `street_address`, `locality`, `country_code`

Optional: `address_book` (boolean), `administrative_area` (string), `borough` (string), `customer_reference` (string), `extended_address` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `validate_address` (boolean)

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

## Validate an address

Validates an address for emergency services.

`POST /addresses/actions/validate` — Required: `country_code`, `street_address`, `postal_code`

Optional: `administrative_area` (string), `extended_address` (string), `locality` (string)

```javascript
const response = await client.addresses.actions.validate({
  country_code: 'US',
  postal_code: '78701',
  street_address: '600 Congress Avenue',
});

console.log(response.data);
```

## Retrieve an address

Retrieves the details of an existing address.

`GET /addresses/{id}`

```javascript
const address = await client.addresses.retrieve('id');

console.log(address.data);
```

## Deletes an address

Deletes an existing address.

`DELETE /addresses/{id}`

```javascript
const address = await client.addresses.delete('id');

console.log(address.data);
```

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`POST /addresses/{id}/actions/accept_suggestions`

Optional: `id` (string)

```javascript
const response = await client.addresses.actions.acceptSuggestions(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`GET /authentication_providers`

```javascript
// Automatically fetches more pages as needed.
for await (const authenticationProvider of client.authenticationProviders.list()) {
  console.log(authenticationProvider.id);
}
```

## Creates an authentication provider

Creates an authentication provider.

`POST /authentication_providers` — Required: `name`, `short_name`, `settings`

Optional: `active` (boolean), `settings_url` (uri)

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

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`GET /authentication_providers/{id}`

```javascript
const authenticationProvider = await client.authenticationProviders.retrieve('id');

console.log(authenticationProvider.data);
```

## Update an authentication provider

Updates settings of an existing authentication provider.

`PATCH /authentication_providers/{id}`

Optional: `active` (boolean), `name` (string), `settings` (object), `settings_url` (uri), `short_name` (string)

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

## Deletes an authentication provider

Deletes an existing authentication provider.

`DELETE /authentication_providers/{id}`

```javascript
const authenticationProvider = await client.authenticationProviders.delete('id');

console.log(authenticationProvider.data);
```

## List all billing groups

`GET /billing_groups`

```javascript
// Automatically fetches more pages as needed.
for await (const billingGroup of client.billingGroups.list()) {
  console.log(billingGroup.id);
}
```

## Create a billing group

`POST /billing_groups`

Optional: `name` (string)

```javascript
const billingGroup = await client.billingGroups.create({ name: 'string' });

console.log(billingGroup.data);
```

## Get a billing group

`GET /billing_groups/{id}`

```javascript
const billingGroup = await client.billingGroups.retrieve('f5586561-8ff0-4291-a0ac-84fe544797bd');

console.log(billingGroup.data);
```

## Update a billing group

`PATCH /billing_groups/{id}`

Optional: `name` (string)

```javascript
const billingGroup = await client.billingGroups.update('f5586561-8ff0-4291-a0ac-84fe544797bd', {
  name: 'string',
});

console.log(billingGroup.data);
```

## Delete a billing group

`DELETE /billing_groups/{id}`

```javascript
const billingGroup = await client.billingGroups.delete('f5586561-8ff0-4291-a0ac-84fe544797bd');

console.log(billingGroup.data);
```

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`GET /integration_secrets`

```javascript
// Automatically fetches more pages as needed.
for await (const integrationSecret of client.integrationSecrets.list()) {
  console.log(integrationSecret.id);
}
```

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`POST /integration_secrets` — Required: `identifier`, `type`

Optional: `password` (string), `token` (string), `username` (string)

```javascript
const integrationSecret = await client.integrationSecrets.create({
  identifier: 'my_secret',
  type: 'bearer',
  token: 'my_secret_value',
});

console.log(integrationSecret.data);
```

## Delete an integration secret

Delete an integration secret given its ID.

`DELETE /integration_secrets/{id}`

```javascript
await client.integrationSecrets.delete('id');
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`POST /telephony_credentials/{id}/token`

```javascript
const response = await client.telephonyCredentials.createToken('id');

console.log(response);
```
