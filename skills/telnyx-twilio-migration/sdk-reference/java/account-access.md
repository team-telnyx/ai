<!-- SDK reference: telnyx-account-access-java -->

# Telnyx Account Access - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.36.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.36.0")
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
    var result = client.messages().send(params);
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

## List all Access IP Addresses

`GET /access_ip_address`

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressListPage;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressListParams;

AccessIpAddressListPage page = client.accessIpAddress().list();
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Create new Access IP Address

`POST /access_ip_address` — Required: `ip_address`

Optional: `description` (string)

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressCreateParams;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;

AccessIpAddressCreateParams params = AccessIpAddressCreateParams.builder()
    .ipAddress("203.0.113.10")
    .build();
AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().create(params);
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Retrieve an access IP address

`GET /access_ip_address/{access_ip_address_id}`

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressRetrieveParams;

AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Delete access IP address

`DELETE /access_ip_address/{access_ip_address_id}`

```java
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressDeleteParams;
import com.telnyx.sdk.models.accessipaddress.AccessIpAddressResponse;

AccessIpAddressResponse accessIpAddressResponse = client.accessIpAddress().delete("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## List all addresses

Returns a list of your addresses.

`GET /addresses`

```java
import com.telnyx.sdk.models.addresses.AddressListPage;
import com.telnyx.sdk.models.addresses.AddressListParams;

AddressListPage page = client.addresses().list();
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

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

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

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

Returns: `errors` (array[object]), `record_type` (string), `result` (enum: valid, invalid), `suggested` (object)

## Retrieve an address

Retrieves the details of an existing address.

`GET /addresses/{id}`

```java
import com.telnyx.sdk.models.addresses.AddressRetrieveParams;
import com.telnyx.sdk.models.addresses.AddressRetrieveResponse;

AddressRetrieveResponse address = client.addresses().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Deletes an address

Deletes an existing address.

`DELETE /addresses/{id}`

```java
import com.telnyx.sdk.models.addresses.AddressDeleteParams;
import com.telnyx.sdk.models.addresses.AddressDeleteResponse;

AddressDeleteResponse address = client.addresses().delete("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`POST /addresses/{id}/actions/accept_suggestions`

Optional: `id` (string)

```java
import com.telnyx.sdk.models.addresses.actions.ActionAcceptSuggestionsParams;
import com.telnyx.sdk.models.addresses.actions.ActionAcceptSuggestionsResponse;

ActionAcceptSuggestionsResponse response = client.addresses().actions().acceptSuggestions("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `accepted` (boolean), `id` (uuid), `record_type` (enum: address_suggestion)

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`GET /authentication_providers`

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderListPage;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderListParams;

AuthenticationProviderListPage page = client.authenticationProviders().list();
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

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

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`GET /authentication_providers/{id}`

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderRetrieveParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderRetrieveResponse;

AuthenticationProviderRetrieveResponse authenticationProvider = client.authenticationProviders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Update an authentication provider

Updates settings of an existing authentication provider.

`PATCH /authentication_providers/{id}`

Optional: `active` (boolean), `name` (string), `settings` (object), `settings_url` (uri), `short_name` (string)

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderUpdateParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderUpdateResponse;

AuthenticationProviderUpdateResponse authenticationProvider = client.authenticationProviders().update("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Deletes an authentication provider

Deletes an existing authentication provider.

`DELETE /authentication_providers/{id}`

```java
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderDeleteParams;
import com.telnyx.sdk.models.authenticationproviders.AuthenticationProviderDeleteResponse;

AuthenticationProviderDeleteResponse authenticationProvider = client.authenticationProviders().delete("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## List all billing groups

`GET /billing_groups`

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupListPage;
import com.telnyx.sdk.models.billinggroups.BillingGroupListParams;

BillingGroupListPage page = client.billingGroups().list();
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Create a billing group

`POST /billing_groups`

Optional: `name` (string)

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupCreateParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupCreateResponse;

BillingGroupCreateResponse billingGroup = client.billingGroups().create();
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Get a billing group

`GET /billing_groups/{id}`

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupRetrieveParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupRetrieveResponse;

BillingGroupRetrieveResponse billingGroup = client.billingGroups().retrieve("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Update a billing group

`PATCH /billing_groups/{id}`

Optional: `name` (string)

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupUpdateParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupUpdateResponse;

BillingGroupUpdateResponse billingGroup = client.billingGroups().update("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Delete a billing group

`DELETE /billing_groups/{id}`

```java
import com.telnyx.sdk.models.billinggroups.BillingGroupDeleteParams;
import com.telnyx.sdk.models.billinggroups.BillingGroupDeleteResponse;

BillingGroupDeleteResponse billingGroup = client.billingGroups().delete("f5586561-8ff0-4291-a0ac-84fe544797bd");
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`GET /integration_secrets`

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretListPage;
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretListParams;

IntegrationSecretListPage page = client.integrationSecrets().list();
```

Returns: `created_at` (date-time), `id` (string), `identifier` (string), `record_type` (string), `updated_at` (date-time)

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

Returns: `created_at` (date-time), `id` (string), `identifier` (string), `record_type` (string), `updated_at` (date-time)

## Delete an integration secret

Delete an integration secret given its ID.

`DELETE /integration_secrets/{id}`

```java
import com.telnyx.sdk.models.integrationsecrets.IntegrationSecretDeleteParams;

client.integrationSecrets().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`POST /telephony_credentials/{id}/token`

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateTokenParams;

String response = client.telephonyCredentials().createToken("550e8400-e29b-41d4-a716-446655440000");
```
