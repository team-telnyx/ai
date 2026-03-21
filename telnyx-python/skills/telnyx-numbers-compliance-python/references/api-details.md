# Numbers Compliance (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Retrieve Bundles

| Field | Type |
|-------|------|
| `cost_code` | string |
| `created_at` | date |
| `currency` | string |
| `id` | uuid |
| `is_public` | boolean |
| `mrc_price` | float |
| `name` | string |
| `slug` | string |
| `specs` | array[string] |

**Returned by:** Get Bundle By Id

| Field | Type |
|-------|------|
| `active` | boolean |
| `bundle_limits` | array[object] |
| `cost_code` | string |
| `created_at` | date |
| `id` | uuid |
| `is_public` | boolean |
| `name` | string |
| `slug` | string |

**Returned by:** Get User Bundles, Create User Bundles, Get User Bundle by Id, Deactivate User Bundle

| Field | Type |
|-------|------|
| `active` | boolean |
| `billing_bundle` | object |
| `created_at` | date |
| `id` | uuid |
| `resources` | array[object] |
| `updated_at` | date |
| `user_id` | uuid |

**Returned by:** Get Unused User Bundles

| Field | Type |
|-------|------|
| `billing_bundle` | object |
| `user_bundle_ids` | array[string] |

**Returned by:** Get User Bundle Resources

| Field | Type |
|-------|------|
| `created_at` | date |
| `id` | uuid |
| `resource` | string |
| `resource_type` | string |
| `updated_at` | date |

**Returned by:** List all document links

| Field | Type |
|-------|------|
| `created_at` | string |
| `document_id` | uuid |
| `id` | uuid |
| `linked_record_type` | string |
| `linked_resource_id` | string |
| `record_type` | string |
| `updated_at` | string |

**Returned by:** List all documents, Upload a document, Retrieve a document, Update a document, Delete a document

| Field | Type |
|-------|------|
| `av_scan_status` | enum: scanned, infected, pending_scan, not_scanned |
| `content_type` | string |
| `created_at` | string |
| `customer_reference` | string |
| `filename` | string |
| `id` | uuid |
| `record_type` | string |
| `sha256` | string |
| `size` | object |
| `status` | enum: pending, verified, denied |
| `updated_at` | string |

**Returned by:** Generate a temporary download link for a document

| Field | Type |
|-------|------|
| `url` | uri |

**Returned by:** Update requirement group for a phone number order

| Field | Type |
|-------|------|
| `bundle_id` | uuid |
| `country_code` | string |
| `deadline` | date-time |
| `id` | uuid |
| `is_block_number` | boolean |
| `locality` | string |
| `order_request_id` | uuid |
| `phone_number` | string |
| `phone_number_type` | string |
| `record_type` | string |
| `regulatory_requirements` | array[object] |
| `requirements_met` | boolean |
| `requirements_status` | string |
| `status` | string |
| `sub_number_order_id` | uuid |

**Returned by:** Retrieve regulatory requirements for a list of phone numbers

| Field | Type |
|-------|------|
| `phone_number` | string |
| `phone_number_type` | string |
| `record_type` | string |
| `region_information` | array[object] |
| `regulatory_requirements` | array[object] |

**Returned by:** Retrieve regulatory requirements

| Field | Type |
|-------|------|
| `action` | string |
| `country_code` | string |
| `phone_number_type` | string |
| `regulatory_requirements` | array[object] |

**Returned by:** Create a new requirement group, Get a single requirement group by ID, Update requirement values in requirement group, Delete a requirement group by ID, Submit a Requirement Group for Approval

| Field | Type |
|-------|------|
| `action` | string |
| `country_code` | string |
| `created_at` | date-time |
| `customer_reference` | string |
| `id` | string |
| `phone_number_type` | string |
| `record_type` | string |
| `regulatory_requirements` | array[object] |
| `status` | enum: approved, unapproved, pending-approval, declined, expired |
| `updated_at` | date-time |

**Returned by:** List all requirement types, Retrieve a requirement types

| Field | Type |
|-------|------|
| `acceptance_criteria` | object |
| `created_at` | string |
| `description` | string |
| `example` | string |
| `id` | uuid |
| `name` | string |
| `record_type` | string |
| `type` | enum: document, address, textual |
| `updated_at` | string |

**Returned by:** List all requirements, Retrieve a document requirement

| Field | Type |
|-------|------|
| `action` | enum: both, branded_calling, ordering, porting |
| `country_code` | string |
| `created_at` | string |
| `id` | uuid |
| `locality` | string |
| `phone_number_type` | enum: local, national, toll_free |
| `record_type` | string |
| `requirements_types` | array[object] |
| `updated_at` | string |

**Returned by:** Update requirement group for a sub number order

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `customer_reference` | string |
| `id` | uuid |
| `is_block_sub_number_order` | boolean |
| `order_request_id` | uuid |
| `phone_number_type` | string |
| `phone_numbers` | array[object] |
| `phone_numbers_count` | integer |
| `record_type` | string |
| `regulatory_requirements` | array[object] |
| `requirements_met` | boolean |
| `status` | string |
| `updated_at` | date-time |

**Returned by:** List all user addresses, Creates a user address, Retrieve a user address

| Field | Type |
|-------|------|
| `administrative_area` | string |
| `borough` | string |
| `business_name` | string |
| `country_code` | string |
| `created_at` | string |
| `customer_reference` | string |
| `extended_address` | string |
| `first_name` | string |
| `id` | uuid |
| `last_name` | string |
| `locality` | string |
| `neighborhood` | string |
| `phone_number` | string |
| `postal_code` | string |
| `record_type` | string |
| `street_address` | string |
| `updated_at` | string |

**Returned by:** List all Verified Numbers, Retrieve a verified number, Delete a verified number, Submit verification code

| Field | Type |
|-------|------|
| `phone_number` | string |
| `record_type` | enum: verified_number |
| `verified_at` | string |

**Returned by:** Request phone number verification

| Field | Type |
|-------|------|
| `phone_number` | string |
| `verification_method` | string |

## Optional Parameters

### Create User Bundles — `client.bundle_pricing.user_bundles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `idempotency_key` | string (UUID) | Idempotency key for the request. |
| `items` | array[object] |  |
| `authorization_bearer` | string | Authenticates the request with your Telnyx API V2 KEY |

### Upload a document — `client.documents.upload_json()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string (URL) | If the file is already hosted publicly, you can provide a URL and have the do... |
| `file` | string | Alternatively, instead of the URL you can provide the Base64 encoded contents... |
| `filename` | string | The filename of the document. |
| `customer_reference` | string | A customer reference string for customer look ups. |

### Update a document — `client.documents.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `record_type` | string | Identifies the type of the resource. |
| `created_at` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updated_at` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `content_type` | string | The document's content_type. |
| `size` | object | Indicates the document's filesize |
| `status` | enum (pending, verified, denied) | Indicates the current document reviewing status |
| `sha256` | string | The document's SHA256 hash provided for optional verification purposes. |
| `filename` | string | The filename of the document. |
| `customer_reference` | string | Optional reference string for customer tracking. |
| `av_scan_status` | enum (scanned, infected, pending_scan, not_scanned) | The antivirus scan status of the document. |

### Create a new requirement group — `client.requirement_groups.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer_reference` | string |  |
| `regulatory_requirements` | array[object] |  |

### Update requirement values in requirement group — `client.requirement_groups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer_reference` | string | Reference for the customer |
| `regulatory_requirements` | array[object] |  |

### Creates a user address — `client.user_addresses.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer_reference` | string | A customer reference string for customer look ups. |
| `phone_number` | string (E.164) | The phone number associated with the user address. |
| `extended_address` | string | Additional street address information about the user address such as, but not... |
| `administrative_area` | string | The locality of the user address. |
| `neighborhood` | string | The neighborhood of the user address. |
| `borough` | string | The borough of the user address. |
| `postal_code` | string | The postal code of the user address. |
| `skip_address_verification` | boolean | An optional boolean value specifying if verification of the address should be... |

### Request phone number verification — `client.verified_numbers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `extension` | string | Optional DTMF extension sequence to dial after the call is answered. |
