---
name: telnyx-account-access-python
description: >-
  Account addresses, auth providers, IP access controls, billing groups,
  integration secrets.
metadata:
  author: telnyx
  product: account-access
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - Python

## Core Workflow

### Steps

1. **Manage addresses**: `client.addresses.create(...)`
2. **Configure IP access**: `client.ip_addresses.create(...)`
3. **Manage billing groups**: `client.billing_groups.create(name=...)`

### Common mistakes

- IP access restrictions apply to API and portal — ensure you don't lock yourself out

**Related skills**: telnyx-account-python

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
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.addresses.list(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all Access IP Addresses

`client.access_ip_address.list()` — `GET /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.access_ip_address.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create new Access IP Address

`client.access_ip_address.create()` — `POST /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes |  |
| `description` | string | No |  |

```python
access_ip_address_response = client.access_ip_address.create(
    ip_address="203.0.113.10",
)
print(access_ip_address_response.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve an access IP address

`client.access_ip_address.retrieve()` — `GET /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_address_id` | string (UUID) | Yes |  |

```python
access_ip_address_response = client.access_ip_address.retrieve(
    "access_ip_address_id",
)
print(access_ip_address_response.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete access IP address

`client.access_ip_address.delete()` — `DELETE /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_address_id` | string (UUID) | Yes |  |

```python
access_ip_address_response = client.access_ip_address.delete(
    "access_ip_address_id",
)
print(access_ip_address_response.id)
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

```python
page = client.addresses.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates an address

Creates an address.

`client.addresses.create()` — `POST /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | Yes | The first name associated with the address. |
| `last_name` | string | Yes | The last name associated with the address. |
| `business_name` | string | Yes | The business name associated with the address. |
| `street_address` | string | Yes | The primary street address information about the address. |
| `locality` | string | Yes | The locality of the address. |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `customer_reference` | string | No | A customer reference string for customer look ups. |
| `phone_number` | string (E.164) | No | The phone number associated with the address. |
| `extended_address` | string | No | Additional street address information about the address such... |
| ... | | | +6 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Validate an address

Validates an address for emergency services.

`client.addresses.actions.validate()` — `POST /addresses/actions/validate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `street_address` | string | Yes | The primary street address information about the address. |
| `postal_code` | string | Yes | The postal code of the address. |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `extended_address` | string | No | Additional street address information about the address such... |
| `locality` | string | No | The locality of the address. |
| `administrative_area` | string | No | The locality of the address. |

```python
response = client.addresses.actions.validate(
    country_code="US",
    postal_code="78701",
    street_address="600 Congress Avenue",
)
print(response.data)
```

Key response fields: `response.data.errors, response.data.record_type, response.data.result`

## Retrieve an address

Retrieves the details of an existing address.

`client.addresses.retrieve()` — `GET /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```python
address = client.addresses.retrieve(
    "id",
)
print(address.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Deletes an address

Deletes an existing address.

`client.addresses.delete()` — `DELETE /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```python
address = client.addresses.delete(
    "id",
)
print(address.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`client.addresses.actions.accept_suggestions()` — `POST /addresses/{id}/actions/accept_suggestions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The UUID of the address that should be accepted. |
| `id` | string (UUID) | No | The ID of the address. |

```python
response = client.addresses.actions.accept_suggestions(
    address_uuid="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.accepted, response.data.record_type`

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`client.authentication_providers.list()` — `GET /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (name, -name, short_name, -short_name, active, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.authentication_providers.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Creates an authentication provider

Creates an authentication provider.

`client.authentication_providers.create()` — `POST /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name associated with the authentication provider. |
| `short_name` | string | Yes | The short name associated with the authentication provider. |
| `settings` | object | Yes | The settings associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| `settings_url` | string (URL) | No | The URL for the identity provider metadata file to populate ... |

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`client.authentication_providers.retrieve()` — `GET /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```python
authentication_provider = client.authentication_providers.retrieve(
    "id",
)
print(authentication_provider.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update an authentication provider

Updates settings of an existing authentication provider.

`client.authentication_providers.update()` — `PATCH /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `name` | string | No | The name associated with the authentication provider. |
| `short_name` | string | No | The short name associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

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

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Deletes an authentication provider

Deletes an existing authentication provider.

`client.authentication_providers.delete()` — `DELETE /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```python
authentication_provider = client.authentication_providers.delete(
    "id",
)
print(authentication_provider.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all billing groups

`client.billing_groups.list()` — `GET /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.billing_groups.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a billing group

`client.billing_groups.create()` — `POST /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | A name for the billing group |

```python
billing_group = client.billing_groups.create(
    name="my-resource",
)
print(billing_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a billing group

`client.billing_groups.retrieve()` — `GET /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```python
billing_group = client.billing_groups.retrieve(
    "f5586561-8ff0-4291-a0ac-84fe544797bd",
)
print(billing_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a billing group

`client.billing_groups.update()` — `PATCH /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |
| `name` | string | No | A name for the billing group |

```python
billing_group = client.billing_groups.update(
    id="f5586561-8ff0-4291-a0ac-84fe544797bd",
    name="my-resource",
)
print(billing_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a billing group

`client.billing_groups.delete()` — `DELETE /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```python
billing_group = client.billing_groups.delete(
    "f5586561-8ff0-4291-a0ac-84fe544797bd",
)
print(billing_group.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`client.integration_secrets.list()` — `GET /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.integration_secrets.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`client.integration_secrets.create()` — `POST /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | The unique identifier of the secret. |
| `type_` | enum (bearer, basic) | Yes | The type of secret. |
| `token` | string | No | The token for the secret. |
| `username` | string | No | The username for the secret. |
| `password` | string | No | The password for the secret. |

```python
integration_secret = client.integration_secrets.create(
    identifier="my_secret",
    type="bearer",
    token="my_secret_value",
)
print(integration_secret.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an integration secret

Delete an integration secret given its ID.

`client.integration_secrets.delete()` — `DELETE /integration_secrets/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
client.integration_secrets.delete(
    "id",
)
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`client.telephony_credentials.create_token()` — `POST /telephony_credentials/{id}/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
response = client.telephony_credentials.create_token(
    "id",
)
print(response)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
