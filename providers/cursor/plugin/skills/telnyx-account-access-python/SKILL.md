---
name: telnyx-account-access-python
description: >-
  Configure account addresses, authentication providers, IP access controls,
  billing groups, and integration secrets. This skill provides Python SDK
  examples.
metadata:
  author: telnyx
  product: account-access
  language: python
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - Python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
    public_key=os.environ.get("TELNYX_PUBLIC_KEY"),  # Required for client.webhooks.unwrap() (webhook verification)
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.messages.send(to="+13125550001", from_="+13125550002", text="Hello")
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
    raise
except telnyx.RateLimitError:
    # 429: rate limited — wait, then retry the request (bounded exponential backoff)
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
    # ...retry the call here (give up after a few attempts); otherwise re-raise:
    raise
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
    raise  # A failed request must never look like success to the caller
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

## List all Access IP Addresses

Retrieve a paginated list of access IP addresses configured on your account.

`GET /access_ip_address`

```python
page = client.access_ip_address.list()
page = page.data[0]
print(page.id)
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Create new Access IP Address

Create a new access IP address entry on your account.

`POST /access_ip_address` — Required: `ip_address`

Optional: `description` (string)

```python
access_ip_address_response = client.access_ip_address.create(
    ip_address="203.0.113.10",
)
print(access_ip_address_response.id)
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Retrieve an access IP address

Retrieve the details of a specific access IP address.

`GET /access_ip_address/{access_ip_address_id}`

```python
access_ip_address_response = client.access_ip_address.retrieve(
    "access_ip_address_id",
)
print(access_ip_address_response.id)
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Delete access IP address

Delete an access IP address entry from your account.

`DELETE /access_ip_address/{access_ip_address_id}`

```python
access_ip_address_response = client.access_ip_address.delete(
    "access_ip_address_id",
)
print(access_ip_address_response.id)
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## List all addresses

Returns a paginated list of the addresses on your account, with support for filtering and sorting.

`GET /addresses`

```python
page = client.addresses.list()
page = page.data[0]
print(page.id)
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Creates an address

Creates a new address on your account from the provided details, for use with services that require a physical address such as emergency calling and regulatory compliance. By default, the new record is validated for emergency use at creation time.

`POST /addresses` — Required: `first_name`, `last_name`, `business_name`, `street_address`, `locality`, `country_code`

Optional: `address_book` (boolean), `administrative_area` (string), `borough` (string), `customer_reference` (string), `extended_address` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `validate_address` (boolean)

```python
address = client.addresses.create(
    business_name="Toy-O'Kon",
    country_code="US",
    first_name="Alfred",
    last_name="Foster",
    locality="Austin",
    street_address="600 Congress Avenue",
)
print(address.data)
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Validate an address

Validates an address for emergency services.

`POST /addresses/actions/validate` — Required: `country_code`, `street_address`, `postal_code`

Optional: `administrative_area` (string), `extended_address` (string), `locality` (string)

```python
response = client.addresses.actions.validate(
    country_code="US",
    postal_code="78701",
    street_address="600 Congress Avenue",
)
print(response.data)
```

Returns: `data` (object)

## Retrieve an address

Retrieves the details of an existing address.

`GET /addresses/{id}`

```python
address = client.addresses.retrieve("550e8400-e29b-41d4-a716-446655440000",
)
print(address.data)
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Deletes an address

Permanently deletes the specified address from your account.

`DELETE /addresses/{id}`

```python
address = client.addresses.delete("550e8400-e29b-41d4-a716-446655440000",
)
print(address.data)
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

Accept the validated address suggestion for this address, replacing the original values, and finish uploading the numbers associated with it to Microsoft for Operator Connect.

`POST /addresses/{id}/actions/accept_suggestions`

Optional: `id` (string)

```python
response = client.addresses.actions.accept_suggestions(
    address_uuid="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Returns: `accepted` (boolean), `id` (uuid), `record_type` (enum: address_suggestion)

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`GET /authentication_providers`

```python
page = client.authentication_providers.list()
page = page.data[0]
print(page.id)
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Creates an authentication provider

Creates a new authentication provider for single sign-on, configured from the provided identity provider details, and returns the created resource.

`POST /authentication_providers` — Required: `name`, `short_name`, `settings`

Optional: `active` (boolean), `settings_url` (uri)

```python
authentication_provider = client.authentication_providers.create(
    name="Okta",
    settings={
        "idp_cert_fingerprint": "13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7",
        "idp_entity_id": "https://myorg.myidp.com/saml/metadata",
        "idp_sso_target_url": "https://myorg.myidp.com/trust/saml2/http-post/sso",
    },
    short_name="myorg",
)
print(authentication_provider.data)
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`GET /authentication_providers/{id}`

```python
authentication_provider = client.authentication_providers.retrieve("550e8400-e29b-41d4-a716-446655440000",
)
print(authentication_provider.data)
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Update an authentication provider

Updates settings of an existing authentication provider.

`PATCH /authentication_providers/{id}`

Optional: `active` (boolean), `name` (string), `settings` (object), `settings_url` (uri), `short_name` (string)

```python
authentication_provider = client.authentication_providers.update(
    id="550e8400-e29b-41d4-a716-446655440000",
    active=True,
    name="Okta",
    settings={
        "idp_entity_id": "https://myorg.myidp.com/saml/metadata",
        "idp_sso_target_url": "https://myorg.myidp.com/trust/saml2/http-post/sso",
        "idp_cert_fingerprint": "13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7",
        "idp_cert_fingerprint_algorithm": "sha1",
    },
    short_name="myorg",
)
print(authentication_provider.data)
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Deletes an authentication provider

Deletes an existing authentication provider.

`DELETE /authentication_providers/{id}`

```python
authentication_provider = client.authentication_providers.delete("550e8400-e29b-41d4-a716-446655440000",
)
print(authentication_provider.data)
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## List all billing groups

Retrieve a paginated list of billing groups on your account.

`GET /billing_groups`

```python
page = client.billing_groups.list()
page = page.data[0]
print(page.id)
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Create a billing group

Create a new billing group, which can be used to organize resources for billing purposes.

`POST /billing_groups`

Optional: `name` (string)

```python
billing_group = client.billing_groups.create(
    name="my-resource",
)
print(billing_group.data)
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Get a billing group

Retrieve the details of a specific billing group.

`GET /billing_groups/{id}`

```python
billing_group = client.billing_groups.retrieve(
    "f5586561-8ff0-4291-a0ac-84fe544797bd",
)
print(billing_group.data)
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Update a billing group

Update the properties of an existing billing group.

`PATCH /billing_groups/{id}`

Optional: `name` (string)

```python
billing_group = client.billing_groups.update(
    id="f5586561-8ff0-4291-a0ac-84fe544797bd",
    name="my-resource",
)
print(billing_group.data)
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Delete a billing group

Delete a billing group from your account.

`DELETE /billing_groups/{id}`

```python
billing_group = client.billing_groups.delete(
    "f5586561-8ff0-4291-a0ac-84fe544797bd",
)
print(billing_group.data)
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`GET /integration_secrets`

```python
page = client.integration_secrets.list()
page = page.data[0]
print(page.id)
```

Returns: `created_at` (date-time), `id` (string), `identifier` (string), `record_type` (string), `updated_at` (date-time)

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`POST /integration_secrets` — Required: `identifier`, `type`

Optional: `password` (string), `token` (string), `username` (string)

```python
integration_secret = client.integration_secrets.create(
    identifier="my_secret",
    type="bearer",
    token="my_secret_value",
)
print(integration_secret.data)
```

Returns: `created_at` (date-time), `id` (string), `identifier` (string), `record_type` (string), `updated_at` (date-time)

## Delete an integration secret

Delete an integration secret given its ID.

`DELETE /integration_secrets/{id}`

```python
client.integration_secrets.delete("550e8400-e29b-41d4-a716-446655440000",
)
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`POST /telephony_credentials/{id}/token`

```python
response = client.telephony_credentials.create_token("550e8400-e29b-41d4-a716-446655440000",
)
print(response)
```
