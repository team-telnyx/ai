---
name: telnyx-account-access-curl
description: >-
  Account addresses, auth providers, IP access controls, billing groups,
  integration secrets.
metadata:
  author: telnyx
  product: account-access
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Access - curl

## Core Workflow

### Steps

1. **Manage addresses**
2. **Configure IP access**
3. **Manage billing groups**

### Common mistakes

- IP access restrictions apply to API and portal — ensure you don't lock yourself out

**Related skills**: telnyx-account-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List all Access IP Addresses

`GET /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/access_ip_address"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Create new Access IP Address

`POST /access_ip_address`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ip_address` | string (IPv4/IPv6) | Yes |  |
| `description` | string | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "ip_address": "203.0.113.10"
}' \
  "https://api.telnyx.com/v2/access_ip_address"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve an access IP address

`GET /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_address_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/access_ip_address/{access_ip_address_id}"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete access IP address

`DELETE /access_ip_address/{access_ip_address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_ip_address_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/access_ip_address/{access_ip_address_id}"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List all addresses

Returns a list of your addresses.

`GET /addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/addresses?sort=street_address"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Creates an address

Creates an address.

`POST /addresses`

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

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "first_name": "Alfred",
  "last_name": "Foster",
  "business_name": "Toy-O'Kon",
  "street_address": "600 Congress Avenue",
  "locality": "Austin",
  "country_code": "US"
}' \
  "https://api.telnyx.com/v2/addresses"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Validate an address

Validates an address for emergency services.

`POST /addresses/actions/validate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `street_address` | string | Yes | The primary street address information about the address. |
| `postal_code` | string | Yes | The postal code of the address. |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the a... |
| `extended_address` | string | No | Additional street address information about the address such... |
| `locality` | string | No | The locality of the address. |
| `administrative_area` | string | No | The locality of the address. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "street_address": "600 Congress Avenue",
  "postal_code": "78701",
  "country_code": "US"
}' \
  "https://api.telnyx.com/v2/addresses/actions/validate"
```

Key response fields: `.data.errors, .data.record_type, .data.result`

## Retrieve an address

Retrieves the details of an existing address.

`GET /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/addresses/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Deletes an address

Deletes an existing address.

`DELETE /addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | address ID |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/addresses/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

`POST /addresses/{id}/actions/accept_suggestions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The UUID of the address that should be accepted. |
| `id` | string (UUID) | No | The ID of the address. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/addresses/550e8400-e29b-41d4-a716-446655440000/actions/accept_suggestions"
```

Key response fields: `.data.id, .data.accepted, .data.record_type`

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`GET /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (name, -name, short_name, -short_name, active, ...) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/authentication_providers?sort=name"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Creates an authentication provider

Creates an authentication provider.

`POST /authentication_providers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name associated with the authentication provider. |
| `short_name` | string | Yes | The short name associated with the authentication provider. |
| `settings` | object | Yes | The settings associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| `settings_url` | string (URL) | No | The URL for the identity provider metadata file to populate ... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Okta",
  "short_name": "myorg",
  "settings": {}
}' \
  "https://api.telnyx.com/v2/authentication_providers"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`GET /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/authentication_providers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update an authentication provider

Updates settings of an existing authentication provider.

`PATCH /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `name` | string | No | The name associated with the authentication provider. |
| `short_name` | string | No | The short name associated with the authentication provider. |
| `active` | boolean | No | The active status of the authentication provider |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Okta",
  "short_name": "myorg",
  "active": true,
  "settings": {
    "idp_entity_id": "https://myorg.myidp.com/saml/metadata",
    "idp_sso_target_url": "https://myorg.myidp.com/trust/saml2/http-post/sso",
    "idp_cert_fingerprint": "13:38:C7:BB:C9:FF:4A:70:38:3A:E3:D9:5C:CD:DB:2E:50:1E:80:A7",
    "idp_cert_fingerprint_algorithm": "sha1"
  }
}' \
  "https://api.telnyx.com/v2/authentication_providers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Deletes an authentication provider

Deletes an existing authentication provider.

`DELETE /authentication_providers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | authentication provider ID |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/authentication_providers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List all billing groups

`GET /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/billing_groups"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Create a billing group

`POST /billing_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | A name for the billing group |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource"
}' \
  "https://api.telnyx.com/v2/billing_groups"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get a billing group

`GET /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/billing_groups/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Update a billing group

`PATCH /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |
| `name` | string | No | A name for the billing group |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource"
}' \
  "https://api.telnyx.com/v2/billing_groups/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Delete a billing group

`DELETE /billing_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the billing group |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/billing_groups/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`GET /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/integration_secrets"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`POST /integration_secrets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | The unique identifier of the secret. |
| `type` | enum (bearer, basic) | Yes | The type of secret. |
| `token` | string | No | The token for the secret. |
| `username` | string | No | The username for the secret. |
| `password` | string | No | The password for the secret. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "identifier": "user@example.com",
  "type": "bearer"
}' \
  "https://api.telnyx.com/v2/integration_secrets"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Delete an integration secret

Delete an integration secret given its ID.

`DELETE /integration_secrets/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/integration_secrets/550e8400-e29b-41d4-a716-446655440000"
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`POST /telephony_credentials/{id}/token`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/telephony_credentials/550e8400-e29b-41d4-a716-446655440000/token"
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
