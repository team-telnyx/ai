<!-- SDK reference: telnyx-account-access-curl -->

# Telnyx Account Access - curl

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
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

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

## List all Access IP Addresses

Retrieve a paginated list of access IP addresses configured on your account.

`GET /access_ip_address`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/access_ip_address"
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Create new Access IP Address

Create a new access IP address entry on your account.

`POST /access_ip_address` — Required: `ip_address`

Optional: `description` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "ip_address": "Ip Address",
  "description": "Description"
}' \
  "https://api.telnyx.com/v2/access_ip_address"
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Retrieve an access IP address

Retrieve the details of a specific access IP address.

`GET /access_ip_address/{access_ip_address_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/access_ip_address/{access_ip_address_id}"
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## Delete access IP address

Delete an access IP address entry from your account.

`DELETE /access_ip_address/{access_ip_address_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/access_ip_address/{access_ip_address_id}"
```

Returns: `created_at` (date-time), `description` (string), `id` (string), `ip_address` (string), `source` (string), `status` (enum: pending, added), `updated_at` (date-time), `user_id` (string)

## List all addresses

Returns a paginated list of the addresses on your account, with support for filtering and sorting.

`GET /addresses`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/addresses?sort=street_address"
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Creates an address

Creates a new address on your account from the provided details, for use with services that require a physical address such as emergency calling and regulatory compliance. By default, the new record is validated for emergency use at creation time.

`POST /addresses` — Required: `first_name`, `last_name`, `business_name`, `street_address`, `locality`, `country_code`

Optional: `address_book` (boolean), `administrative_area` (string), `borough` (string), `customer_reference` (string), `extended_address` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `validate_address` (boolean)

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

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Validate an address

Validates an address for emergency services.

`POST /addresses/actions/validate` — Required: `country_code`, `street_address`, `postal_code`

Optional: `administrative_area` (string), `extended_address` (string), `locality` (string)

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

Returns: `data` (object)

## Retrieve an address

Retrieves the details of an existing address.

`GET /addresses/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/addresses/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Deletes an address

Permanently deletes the specified address from your account.

`DELETE /addresses/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/addresses/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `address_book` (boolean), `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (string), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string), `validate_address` (boolean)

## Accepts this address suggestion as a new emergency address for Operator Connect and finishes the uploads of the numbers associated with it to Microsoft.

Accept the validated address suggestion for this address, replacing the original values, and finish uploading the numbers associated with it to Microsoft for Operator Connect.

`POST /addresses/{id}/actions/accept_suggestions`

Optional: `id` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/addresses/550e8400-e29b-41d4-a716-446655440000/actions/accept_suggestions"
```

Returns: `accepted` (boolean), `id` (uuid), `record_type` (enum: address_suggestion)

## List all SSO authentication providers

Returns a list of your SSO authentication providers.

`GET /authentication_providers`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/authentication_providers?sort=name"
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Creates an authentication provider

Creates a new authentication provider for single sign-on, configured from the provided identity provider details, and returns the created resource.

`POST /authentication_providers` — Required: `name`, `short_name`, `settings`

Optional: `active` (boolean), `settings_url` (uri)

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

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Retrieve an authentication provider

Retrieves the details of an existing authentication provider.

`GET /authentication_providers/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/authentication_providers/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Update an authentication provider

Updates settings of an existing authentication provider.

`PATCH /authentication_providers/{id}`

Optional: `active` (boolean), `name` (string), `settings` (object), `settings_url` (uri), `short_name` (string)

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

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## Deletes an authentication provider

Deletes an existing authentication provider.

`DELETE /authentication_providers/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/authentication_providers/550e8400-e29b-41d4-a716-446655440000"
```

Returns: `activated_at` (date-time), `active` (boolean), `created_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (string), `settings` (object), `short_name` (string), `updated_at` (date-time)

## List all billing groups

Retrieve a paginated list of billing groups on your account.

`GET /billing_groups`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/billing_groups"
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Create a billing group

Create a new billing group, which can be used to organize resources for billing purposes.

`POST /billing_groups`

Optional: `name` (string)

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

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Get a billing group

Retrieve the details of a specific billing group.

`GET /billing_groups/{id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/billing_groups/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Update a billing group

Update the properties of an existing billing group.

`PATCH /billing_groups/{id}`

Optional: `name` (string)

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

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## Delete a billing group

Delete a billing group from your account.

`DELETE /billing_groups/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/billing_groups/f5586561-8ff0-4291-a0ac-84fe544797bd"
```

Returns: `created_at` (date-time), `deleted_at` (date-time), `id` (uuid), `name` (string), `organization_id` (uuid), `record_type` (enum: billing_group), `updated_at` (date-time)

## List integration secrets

Retrieve a list of all integration secrets configured by the user.

`GET /integration_secrets`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/integration_secrets"
```

Returns: `created_at` (date-time), `id` (string), `identifier` (string), `record_type` (string), `updated_at` (date-time)

## Create a secret

Create a new secret with an associated identifier that can be used to securely integrate with other services.

`POST /integration_secrets` — Required: `identifier`, `type`

Optional: `password` (string), `token` (string), `username` (string)

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

Returns: `created_at` (date-time), `id` (string), `identifier` (string), `record_type` (string), `updated_at` (date-time)

## Delete an integration secret

Delete an integration secret given its ID.

`DELETE /integration_secrets/{id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/integration_secrets/550e8400-e29b-41d4-a716-446655440000"
```

## Create an Access Token.

Create an Access Token (JWT) for the credential.

`POST /telephony_credentials/{id}/token`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/telephony_credentials/550e8400-e29b-41d4-a716-446655440000/token"
```

## Retrieve token material.

Returns the material a server needs to mint login tokens for the credential locally, with no request per token: `kid`, `tel_token` and `signing_secret`. The same material is in the response of `POST /telephony_credentials`. Treat it like the SIP password.

`GET /telephony_credentials/{id}/token_material`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/telephony_credentials/550e8400-e29b-41d4-a716-446655440000/token_material"
```

Returns: `kid` (string), `signing_secret` (string), `tel_token` (string)
