<!-- SDK reference: telnyx-account-access-java -->

# Telnyx Account Access - Java

## Core Workflow

### Steps

1. **Manage addresses**: `client.addresses().create(params)`
2. **Configure IP access**: `client.ipAddresses().create(params)`
3. **Manage billing groups**: `client.billingGroups().create(params)`

### Common mistakes

- IP access restrictions apply to API and portal — ensure you don't lock yourself out

**Related skills**: telnyx-account-java

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
    var result = client.addresses().list(params);
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
## List all Access IP Addresses

`client.accessIpAddress().list()` — `GET /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressListPage;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressListParams;

AccessIpAddressListPage page = client.accessIpAddress().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Address

`client.accessIpAddress().create()` — `POST /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ipAddress` | string (IPv4/IPv6) | Yes |  |
| `description` | string | No |  |

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressCreateParams;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;

AccessIpAddressCreateParams params = AccessIpAddressCreateParams.builder()
    .ipAddress("203.0.113.10")
    .build();
AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve an access IP address

`client.accessIpAddress().retrieve()` — `GET /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accessIpAddressId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressRetrieveParams;

AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP address

`client.accessIpAddress().delete()` — `DELETE /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accessIpAddressId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressDeleteParams;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;

AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all addresses

Returns a list of your addresses.

`client.addresses().list()` — `GET /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.addresses.AddressListPage;
import com.telnyx.sdk.models.addresses.AddressListParams;

AddressListPage page = client.addresses().list();
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates an address

Creates an address.

`client.addresses().create()` — `POST /addresses`

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
| ... | | | +6 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.addresses.AddressCreateParams;
import com.telnyx.sdk.models.addresses.AddressCreateResponse;

AddressCreateParams params = AddressCreateParams.builder()
    .businessName("Toy-O'Kon")
    .countryCode("US")
    .firstName("Alfred")
    .lastName("Foster")
    .locality("Austin")
    .streetAddress("600 Congress Avenue")
    .build();
AddressCreateResponse address = client.addresses().create(params);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Validate an address

Validates an address for emergency services.

`client.addresses().actions().validate()` — `POST /addresses/actions/validate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `streetAddress` | string | Yes | The primary street address information about the address. |
| `postalCode` | string | Yes | The postal code of the address. |
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `extendedAddress` | string | No | Additional street address information about the address such... |
| `locality` | string | No | The locality of the address. |
| `administrativeArea` | string | No | The locality of the address. |

```java
import com.telnyx.sdk.models.addresses.actions.ActionValidateParams;
import com.telnyx.sdk.models.addresses.actions.ActionValidateResponse;

ActionValidateParams params = ActionValidateParams.builder()
    .countryCode("US")
    .postalCode("78701")
    .streetAddress("600 Congress Avenue")
    .build();
ActionValidateResponse response = client.addresses().actions().validate(params);
```

Key response fields: `response.data.errors, response.data.record_type, response.data.result`

## Retrieve an address

Retrieves the details of an existing address.

`client.addresses().retrieve()` — `GET /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```java
import com.telnyx.sdk.models.addresses.AddressRetrieveParams;
import com.telnyx.sdk.models.addresses.AddressRetrieveResponse;

AddressRetrieveResponse address = client.addresses().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Deletes an address

Deletes an existing address.

`client.addresses().delete()` — `DELETE /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```java
import com.telnyx.sdk.models.addresses.AddressDeleteParams;
import com.telnyx.sdk.models.addresses.AddressDeleteResponse;

AddressDeleteResponse address = client.addresses().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`client.addresses().actions().acceptSuggestions()` — `POST /addresses/{id}/actions/accept_suggestions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The UUID of the address that should be accepted. |
| `id` | string (UUID) | No | The ID of the address. |

```java
import com.telnyx.sdk.models.addresses.actions.ActionAcceptSuggestionsParams;
import com.telnyx.sdk.models.addresses.actions.ActionAcceptSuggestionsResponse;

ActionAcceptSuggestionsResponse response = client.addresses().actions().acceptSuggestions("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.accepted, response.data.record_type`

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`client.authenticationProviders().list()` — `GET /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (name, -name, short_name, -short_name, active, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderListPage;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderListParams;

AuthenticationProviderListPage page = client.authenticationProviders().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Creates an authentication provider

Creates an authentication provider.

`client.authenticationProviders().create()` — `POST /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name associated with the authentication provider. |
| `shortName` | string | Yes | The short name associated with the authentication provider. |
| `settings` | object | Yes | The settings associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| `settingsUrl` | string (URL) | No | The URL for the identity provider metadata file to populate ... |

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderCreateParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderCreateResponse;
import com.telnyx.sdk.models.authenticationproviders.Settings;

AuthenticationProviderCreateParams params = AuthenticationProviderCreateParams.builder()
    .name("Okta")
    .settings(Settings.builder()
        .idpCertFingerprint("13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7")
        .idpEntityId("https://myorg.myidp.com/saml/metadata")
        .idpSsoTargetUrl("https://myorg.myidp.com/trust/saml2/http-post/sso")
        .build())
    .shortName("myorg")
    .build();
AuthenticationProviderCreateResponse authenticationProvider = client.authenticationProviders().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`client.authenticationProviders().retrieve()` — `GET /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderRetrieveParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderRetrieveResponse;

AuthenticationProviderRetrieveResponse authenticationProvider = client.authenticationProviders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an authentication provider

Updates settings of an existing authentication provider.

`client.authenticationProviders().update()` — `PATCH /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `name` | string | No | The name associated with the authentication provider. |
| `shortName` | string | No | The short name associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| ... | | | +2 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderUpdateParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderUpdateResponse;

AuthenticationProviderUpdateResponse authenticationProvider = client.authenticationProviders().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Deletes an authentication provider

Deletes an existing authentication provider.

`client.authenticationProviders().delete()` — `DELETE /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderDeleteParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderDeleteResponse;

AuthenticationProviderDeleteResponse authenticationProvider = client.authenticationProviders().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all billing groups

`client.billingGroups().list()` — `GET /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupListPage;
import com.telnyx.sdk.models.billinggroups.BillingGroupListParams;

BillingGroupListPage page = client.billingGroups().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a billing group

`client.billingGroups().create()` — `POST /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | A name for the billing group |

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupCreateParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupCreateResponse;

BillingGroupCreateResponse billingGroup = client.billingGroups().create();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a billing group

`client.billingGroups().retrieve()` — `GET /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupRetrieveParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupRetrieveResponse;

BillingGroupRetrieveResponse billingGroup = client.billingGroups().retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a billing group

`client.billingGroups().update()` — `PATCH /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |
| `name` | string | No | A name for the billing group |

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupUpdateParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupUpdateResponse;

BillingGroupUpdateResponse billingGroup = client.billingGroups().update("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a billing group

`client.billingGroups().delete()` — `DELETE /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupDeleteParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupDeleteResponse;

BillingGroupDeleteResponse billingGroup = client.billingGroups().delete("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`client.integrationSecrets().list()` — `GET /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretListPage;
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretListParams;

IntegrationSecretListPage page = client.integrationSecrets().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`client.integrationSecrets().create()` — `POST /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | The unique identifier of the secret. |
| `type` | enum (bearer, basic) | Yes | The type of secret. |
| `token` | string | No | The token for the secret. |
| `username` | string | No | The username for the secret. |
| `password` | string | No | The password for the secret. |

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretCreateParams;
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretCreateResponse;

IntegrationSecretCreateParams params = IntegrationSecretCreateParams.builder()
    .identifier("my_secret")
    .type(IntegrationSecretCreateParams.Type.BEARER)
    .build();
IntegrationSecretCreateResponse integrationSecret = client.integrationSecrets().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an integration secret

Delete an integration secret given its ID.

`client.integrationSecrets().delete()` — `DELETE /integration_secrets/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretDeleteParams;

client.integrationSecrets().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`client.telephonyCredentials().createToken()` — `POST /telephony_credentials/{id}/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateTokenParams;

String response = client.telephonyCredentials().createToken("550e8400-e29b-41d4-a716-446655440000");
```

---

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
