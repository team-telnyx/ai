---
name: telnyx-account-access-java
description: >-
  Configure account addresses, authentication providers, IP access controls,
  billing groups, and integration secrets. This skill provides Java SDK
  examples.
metadata:
  author: telnyx
  product: account-access
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## List all Access IP Addresses

`GET /access_ip_address`

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressListPage;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressListParams;

AccessIpAddressListPage page = client.accessIpAddress().list();
```

## Create new Access IP Address

`POST /access_ip_address` — Required: `ip_address`

Optional: `description` (string)

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressCreateParams;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;

AccessIpAddressCreateParams params = AccessIpAddressCreateParams.builder()
    .ipAddress("ip_address")
    .build();
AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().create(params);
```

## Retrieve an access IP address

`GET /access_ip_address/{access_ip_address_id}`

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressRetrieveParams;

AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().retrieve("access_ip_address_id");
```

## Delete access IP address

`DELETE /access_ip_address/{access_ip_address_id}`

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressDeleteParams;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;

AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().delete("access_ip_address_id");
```

## List all addresses

Returns a list of your addresses.

`GET /addresses`

```java
import com.telnyx.sdk.models.addresses.AddressListPage;
import com.telnyx.sdk.models.addresses.AddressListParams;

AddressListPage page = client.addresses().list();
```

## Creates an address

Creates an address.

`POST /addresses` — Required: `first_name`, `last_name`, `business_name`, `street_address`, `locality`, `country_code`

Optional: `address_book` (boolean), `administrative_area` (string), `borough` (string), `customer_reference` (string), `extended_address` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `validate_address` (boolean)

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

## Validate an address

Validates an address for emergency services.

`POST /addresses/actions/validate` — Required: `country_code`, `street_address`, `postal_code`

Optional: `administrative_area` (string), `extended_address` (string), `locality` (string)

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

## Retrieve an address

Retrieves the details of an existing address.

`GET /addresses/{id}`

```java
import com.telnyx.sdk.models.addresses.AddressRetrieveParams;
import com.telnyx.sdk.models.addresses.AddressRetrieveResponse;

AddressRetrieveResponse address = client.addresses().retrieve("id");
```

## Deletes an address

Deletes an existing address.

`DELETE /addresses/{id}`

```java
import com.telnyx.sdk.models.addresses.AddressDeleteParams;
import com.telnyx.sdk.models.addresses.AddressDeleteResponse;

AddressDeleteResponse address = client.addresses().delete("id");
```

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`POST /addresses/{id}/actions/accept_suggestions`

Optional: `id` (string)

```java
import com.telnyx.sdk.models.addresses.actions.ActionAcceptSuggestionsParams;
import com.telnyx.sdk.models.addresses.actions.ActionAcceptSuggestionsResponse;

ActionAcceptSuggestionsResponse response = client.addresses().actions().acceptSuggestions("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`GET /authentication_providers`

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderListPage;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderListParams;

AuthenticationProviderListPage page = client.authenticationProviders().list();
```

## Creates an authentication provider

Creates an authentication provider.

`POST /authentication_providers` — Required: `name`, `short_name`, `settings`

Optional: `active` (boolean), `settings_url` (uri)

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

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`GET /authentication_providers/{id}`

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderRetrieveParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderRetrieveResponse;

AuthenticationProviderRetrieveResponse authenticationProvider = client.authenticationProviders().retrieve("id");
```

## Update an authentication provider

Updates settings of an existing authentication provider.

`PATCH /authentication_providers/{id}`

Optional: `active` (boolean), `name` (string), `settings` (object), `settings_url` (uri), `short_name` (string)

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderUpdateParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderUpdateResponse;

AuthenticationProviderUpdateResponse authenticationProvider = client.authenticationProviders().update("id");
```

## Deletes an authentication provider

Deletes an existing authentication provider.

`DELETE /authentication_providers/{id}`

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderDeleteParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderDeleteResponse;

AuthenticationProviderDeleteResponse authenticationProvider = client.authenticationProviders().delete("id");
```

## List all billing groups

`GET /billing_groups`

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupListPage;
import com.telnyx.sdk.models.billinggroups.BillingGroupListParams;

BillingGroupListPage page = client.billingGroups().list();
```

## Create a billing group

`POST /billing_groups`

Optional: `name` (string)

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupCreateParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupCreateResponse;

BillingGroupCreateResponse billingGroup = client.billingGroups().create();
```

## Get a billing group

`GET /billing_groups/{id}`

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupRetrieveParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupRetrieveResponse;

BillingGroupRetrieveResponse billingGroup = client.billingGroups().retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

## Update a billing group

`PATCH /billing_groups/{id}`

Optional: `name` (string)

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupUpdateParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupUpdateResponse;

BillingGroupUpdateResponse billingGroup = client.billingGroups().update("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

## Delete a billing group

`DELETE /billing_groups/{id}`

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupDeleteParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupDeleteResponse;

BillingGroupDeleteResponse billingGroup = client.billingGroups().delete("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`GET /integration_secrets`

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretListPage;
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretListParams;

IntegrationSecretListPage page = client.integrationSecrets().list();
```

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`POST /integration_secrets` — Required: `identifier`, `type`

Optional: `password` (string), `token` (string), `username` (string)

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretCreateParams;
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretCreateResponse;

IntegrationSecretCreateParams params = IntegrationSecretCreateParams.builder()
    .identifier("my_secret")
    .type(IntegrationSecretCreateParams.Type.BEARER)
    .build();
IntegrationSecretCreateResponse integrationSecret = client.integrationSecrets().create(params);
```

## Delete an integration secret

Delete an integration secret given its ID.

`DELETE /integration_secrets/{id}`

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretDeleteParams;

client.integrationSecrets().delete("id");
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`POST /telephony_credentials/{id}/token`

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateTokenParams;

String response = client.telephonyCredentials().createToken("id");
```
