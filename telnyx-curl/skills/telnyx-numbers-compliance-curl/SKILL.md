---
name: telnyx-numbers-compliance-curl
description: >-
  Regulatory requirements, number bundles, supporting documents, and verified
  numbers.
metadata:
  author: telnyx
  product: numbers-compliance
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Compliance - curl

## Core Workflow

### Prerequisites

1. Check regulatory requirements for the target country before ordering numbers
2. For regulated countries: prepare supporting documents (ID, address proof, etc.)

### Steps

1. **Check requirements**
2. **Create bundle**
3. **Upload documents**
4. **Submit for review**

### Common mistakes

- Requirements vary by country and number type — always check before ordering
- Document review can take business days — submit early

**Related skills**: telnyx-numbers-curl

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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Retrieve Bundles

Get all allowed bundles.

`GET /bundle_pricing/billing_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bundle_pricing/billing_bundles"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get Bundle By Id

Get a single bundle by ID.

`GET /bundle_pricing/billing_bundles/{bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundle_id` | string (UUID) | Yes | Billing bundle's ID, this is used to identify the billing bu... |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bundle_pricing/billing_bundles/8661948c-a386-4385-837f-af00f40f111a"
```

Key response fields: `.data.id, .data.name, .data.created_at`

## Get User Bundles

Get a paginated list of user bundles.

`GET /bundle_pricing/user_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bundle_pricing/user_bundles"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Create User Bundles

Creates multiple user bundles for the user.

`POST /bundle_pricing/user_bundles/bulk`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `idempotency_key` | string (UUID) | No | Idempotency key for the request. |
| `items` | array[object] | No |  |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/bundle_pricing/user_bundles/bulk"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get Unused User Bundles

Returns all user bundles that aren't in use.

`GET /bundle_pricing/user_bundles/unused`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bundle_pricing/user_bundles/unused"
```

Key response fields: `.data.billing_bundle, .data.user_bundle_ids`

## Get User Bundle by Id

Retrieves a user bundle by its ID.

`GET /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_bundle_id` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bundle_pricing/user_bundles/ca1d2263-d1f1-43ac-ba53-248e7a4bb26a"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Deactivate User Bundle

Deactivates a user bundle by its ID.

`DELETE /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_bundle_id` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/bundle_pricing/user_bundles/ca1d2263-d1f1-43ac-ba53-248e7a4bb26a"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Get User Bundle Resources

Retrieves the resources of a user bundle by its ID.

`GET /bundle_pricing/user_bundles/{user_bundle_id}/resources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_bundle_id` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorization_bearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/bundle_pricing/user_bundles/ca1d2263-d1f1-43ac-ba53-248e7a4bb26a/resources"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List all document links

List all documents links ordered by created_at descending.

`GET /document_links`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for document links (deepObject... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/document_links"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## List all documents

List all documents ordered by created_at descending.

`GET /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for documents (deepObject styl... |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/documents?filter={'filename': {'contains': 'invoice'}, 'customer_reference': {'in': ['REF001', 'REF002']}, 'created_at': {'gt': '2021-01-01T00:00:00Z'}}&sort=['filename']"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Upload a document

Upload a document.  Uploaded files must be linked to a service within 30 minutes or they will be automatically deleted.

`POST /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | No | If the file is already hosted publicly, you can provide a UR... |
| `file` | string | No | Alternatively, instead of the URL you can provide the Base64... |
| `filename` | string | No | The filename of the document. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "file=@/path/to/file" \
  -F "customer_reference=MY REF 001" \
  "https://api.telnyx.com/v2/documents"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Retrieve a document

Retrieve a document.

`GET /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/documents/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Update a document

Update a document.

`PATCH /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `status` | enum (pending, verified, denied) | No | Indicates the current document reviewing status |
| `av_scan_status` | enum (scanned, infected, pending_scan, not_scanned) | No | The antivirus scan status of the document. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/documents/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a document

Delete a document.  A document can only be deleted if it's not linked to a service. If it is linked to a service, it must be unlinked prior to deleting.

`DELETE /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/documents/6a09cdc3-8948-47f0-aa62-74ac943d6c58"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Download a document

Download a document.

`GET /documents/{id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/documents/6a09cdc3-8948-47f0-aa62-74ac943d6c58/download"
```

## Generate a temporary download link for a document

Generates a temporary pre-signed URL that can be used to download the document directly from the storage backend without authentication.

`GET /documents/{id}/download_link`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the document |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/documents/550e8400-e29b-41d4-a716-446655440000/download_link"
```

Key response fields: `.data.url`

## Update requirement group for a phone number order

`POST /number_order_phone_numbers/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirement_group_id` | string (UUID) | Yes | The ID of the requirement group to associate |
| `id` | string (UUID) | Yes | The unique identifier of the number order phone number |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "requirement_group_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/number_order_phone_numbers/550e8400-e29b-41d4-a716-446655440000/requirement_group"
```

Key response fields: `.data.id, .data.status, .data.phone_number`

## Retrieve regulatory requirements for a list of phone numbers

`GET /phone_numbers_regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/phone_numbers_regulatory_requirements"
```

Key response fields: `.data.phone_number, .data.phone_number_type, .data.record_type`

## Retrieve regulatory requirements

`GET /regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/regulatory_requirements"
```

Key response fields: `.data.action, .data.country_code, .data.phone_number_type`

## List requirement groups

`GET /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/requirement_groups"
```

## Create a new requirement group

`POST /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | ISO alpha 2 country code |
| `phone_number_type` | enum (local, toll_free, mobile, national, shared_cost) | Yes |  |
| `action` | enum (ordering, porting) | Yes |  |
| `customer_reference` | string | No |  |
| `regulatory_requirements` | array[object] | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "country_code": "US",
  "phone_number_type": "local",
  "action": "ordering"
}' \
  "https://api.telnyx.com/v2/requirement_groups"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Get a single requirement group by ID

`GET /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group to retrieve |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/requirement_groups/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Update requirement values in requirement group

`PATCH /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group |
| `customer_reference` | string | No | Reference for the customer |
| `regulatory_requirements` | array[object] | No |  |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/requirement_groups/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Delete a requirement group by ID

`DELETE /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/requirement_groups/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## Submit a Requirement Group for Approval

`POST /requirement_groups/{id}/submit_for_approval`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group to submit |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/requirement_groups/550e8400-e29b-41d4-a716-446655440000/submit_for_approval"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List all requirement types

List all requirement types ordered by created_at descending

`GET /requirement_types`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for requirement types (deepObj... |
| `sort` | array[string] | No | Specifies the sort order for results. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/requirement_types?sort=['name']"
```

Key response fields: `.data.id, .data.name, .data.type`

## Retrieve a requirement types

Retrieve a requirement type by id

`GET /requirement_types/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/requirement_types/a38c217a-8019-48f8-bff6-0fdd9939075b"
```

Key response fields: `.data.id, .data.name, .data.type`

## List all requirements

List all requirements with filtering, sorting, and pagination

`GET /requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for requirements (deepObject s... |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/requirements?sort=['country_code']"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Retrieve a document requirement

Retrieve a document requirement record

`GET /requirements/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/requirements/a9dad8d5-fdbd-49d7-aa23-39bb08a5ebaa"
```

Key response fields: `.data.id, .data.created_at, .data.updated_at`

## Update requirement group for a sub number order

`POST /sub_number_orders/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirement_group_id` | string (UUID) | Yes | The ID of the requirement group to associate |
| `id` | string (UUID) | Yes | The ID of the sub number order |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "requirement_group_id": "a4b201f9-8646-4e54-a7d2-b2e403eeaf8c"
}' \
  "https://api.telnyx.com/v2/sub_number_orders/550e8400-e29b-41d4-a716-446655440000/requirement_group"
```

Key response fields: `.data.id, .data.status, .data.created_at`

## List all user addresses

Returns a list of your user addresses.

`GET /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/user_addresses?sort=street_address"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Creates a user address

Creates a user address.

`POST /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | Yes | The first name associated with the user address. |
| `last_name` | string | Yes | The last name associated with the user address. |
| `business_name` | string | Yes | The business name associated with the user address. |
| `street_address` | string | Yes | The primary street address information about the user addres... |
| `locality` | string | Yes | The locality of the user address. |
| `country_code` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the u... |
| `customer_reference` | string | No | A customer reference string for customer look ups. |
| `phone_number` | string (E.164) | No | The phone number associated with the user address. |
| `extended_address` | string | No | Additional street address information about the user address... |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

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
  "https://api.telnyx.com/v2/user_addresses"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## Retrieve a user address

Retrieves the details of an existing user address.

`GET /user_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | user address ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/user_addresses/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.phone_number, .data.created_at`

## List all Verified Numbers

Gets a paginated list of Verified Numbers.

`GET /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verified_numbers"
```

Key response fields: `.data.phone_number, .data.record_type, .data.verified_at`

## Request phone number verification

Initiates phone number verification procedure. Supports DTMF extension dialing for voice calls to numbers behind IVR systems.

`POST /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes |  |
| `verification_method` | enum (sms, call) | Yes | Verification method. |
| `extension` | string | No | Optional DTMF extension sequence to dial after the call is a... |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_number": "+15551234567",
  "verification_method": "sms"
}' \
  "https://api.telnyx.com/v2/verified_numbers"
```

Key response fields: `.data.phone_number, .data.verification_method`

## Retrieve a verified number

`GET /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/verified_numbers/+15551234567"
```

Key response fields: `.data.phone_number, .data.record_type, .data.verified_at`

## Delete a verified number

`DELETE /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/verified_numbers/+15551234567"
```

Key response fields: `.data.phone_number, .data.record_type, .data.verified_at`

## Submit verification code

`POST /verified_numbers/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_code` | string | Yes |  |
| `phone_number` | string (E.164) | Yes | +E164 formatted phone number. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "verification_code": "123456"
}' \
  "https://api.telnyx.com/v2/verified_numbers/+15551234567/actions/verify"
```

Key response fields: `.data.phone_number, .data.record_type, .data.verified_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
