<!-- SDK reference: telnyx-numbers-compliance-javascript -->

# Telnyx Numbers Compliance - JavaScript

## Core Workflow

### Prerequisites

1. Check regulatory requirements for the target country before ordering numbers
2. For regulated countries: prepare supporting documents (ID, address proof, etc.)

### Steps

1. **Check requirements**: `client.regulatoryRequirements.list({filter: {country_code: ...}})`
2. **Create bundle**: `client.bundles.create({...: ...})`
3. **Upload documents**: `client.documents.create({...: ...})`
4. **Submit for review**: `Status transitions from draft to pending_review to approved`

### Common mistakes

- Requirements vary by country and number type — always check before ordering
- Document review can take business days — submit early

**Related skills**: telnyx-numbers-javascript

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.bundles.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Retrieve Bundles

Get all allowed bundles.

`client.bundlePricing.billingBundles.list()` — `GET /bundle_pricing/billing_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
// Automatically fetches more pages as needed.
for await (const billingBundleSummary of client.bundlePricing.billingBundles.list()) {
  console.log(billingBundleSummary.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Bundle By Id

Get a single bundle by ID.

`client.bundlePricing.billingBundles.retrieve()` — `GET /bundle_pricing/billing_bundles/{bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundleId` | string (UUID) | Yes | Billing bundle's ID, this is used to identify the billing bu... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const billingBundle = await client.bundlePricing.billingBundles.retrieve(
  '8661948c-a386-4385-837f-af00f40f111a',
);

console.log(billingBundle.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get User Bundles

Get a paginated list of user bundles.

`client.bundlePricing.userBundles.list()` — `GET /bundle_pricing/user_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
// Automatically fetches more pages as needed.
for await (const userBundle of client.bundlePricing.userBundles.list()) {
  console.log(userBundle.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create User Bundles

Creates multiple user bundles for the user.

`client.bundlePricing.userBundles.create()` — `POST /bundle_pricing/user_bundles/bulk`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `idempotencyKey` | string (UUID) | No | Idempotency key for the request. |
| `items` | array[object] | No |  |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const userBundle = await client.bundlePricing.userBundles.create();

console.log(userBundle.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get Unused User Bundles

Returns all user bundles that aren't in use.

`client.bundlePricing.userBundles.listUnused()` — `GET /bundle_pricing/user_bundles/unused`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const response = await client.bundlePricing.userBundles.listUnused();

console.log(response.data);
```

Key response fields: `response.data.billing_bundle, response.data.user_bundle_ids`

## Get User Bundle by Id

Retrieves a user bundle by its ID.

`client.bundlePricing.userBundles.retrieve()` — `GET /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const userBundle = await client.bundlePricing.userBundles.retrieve(
  'ca1d2263-d1f1-43ac-ba53-248e7a4bb26a',
);

console.log(userBundle.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deactivate User Bundle

Deactivates a user bundle by its ID.

`client.bundlePricing.userBundles.deactivate()` — `DELETE /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const response = await client.bundlePricing.userBundles.deactivate(
  'ca1d2263-d1f1-43ac-ba53-248e7a4bb26a',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get User Bundle Resources

Retrieves the resources of a user bundle by its ID.

`client.bundlePricing.userBundles.listResources()` — `GET /bundle_pricing/user_bundles/{user_bundle_id}/resources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```javascript
const response = await client.bundlePricing.userBundles.listResources(
  'ca1d2263-d1f1-43ac-ba53-248e7a4bb26a',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all document links

List all documents links ordered by created_at descending.

`client.documentLinks.list()` — `GET /document_links`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for document links (deepObject... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const documentLinkListResponse of client.documentLinks.list()) {
  console.log(documentLinkListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all documents

List all documents ordered by created_at descending.

`client.documents.list()` — `GET /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for documents (deepObject styl... |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const docServiceDocument of client.documents.list()) {
  console.log(docServiceDocument.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Upload a document

Upload a document.  Uploaded files must be linked to a service within 30 minutes or they will be automatically deleted.

`client.documents.uploadJson()` — `POST /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | No | If the file is already hosted publicly, you can provide a UR... |
| `file` | string | No | Alternatively, instead of the URL you can provide the Base64... |
| `filename` | string | No | The filename of the document. |
| ... | | | +1 optional params in the API Details section below |

```javascript
const response = await client.documents.uploadJson({ document: {} });

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a document

Retrieve a document.

`client.documents.retrieve()` — `GET /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const document = await client.documents.retrieve('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(document.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a document

Update a document.

`client.documents.update()` — `PATCH /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `status` | enum (pending, verified, denied) | No | Indicates the current document reviewing status |
| `avScanStatus` | enum (scanned, infected, pending_scan, not_scanned) | No | The antivirus scan status of the document. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +8 optional params in the API Details section below |

```javascript
const document = await client.documents.update('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(document.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a document

Delete a document.  A document can only be deleted if it's not linked to a service. If it is linked to a service, it must be unlinked prior to deleting.

`client.documents.delete()` — `DELETE /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const document = await client.documents.delete('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(document.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a document

Download a document.

`client.documents.download()` — `GET /documents/{id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const response = await client.documents.download('6a09cdc3-8948-47f0-aa62-74ac943d6c58');

console.log(response);

const content = await response.blob();
console.log(content);
```

## Generate a temporary download link for a document

Generates a temporary pre-signed URL that can be used to download the document directly from the storage backend without authentication.

`client.documents.generateDownloadLink()` — `GET /documents/{id}/download_link`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the document |

```javascript
const response = await client.documents.generateDownloadLink(
  '550e8400-e29b-41d4-a716-446655440000',
);

console.log(response.data);
```

Key response fields: `response.data.url`

## Update requirement group for a phone number order

`client.numberOrderPhoneNumbers.updateRequirementGroup()` — `POST /number_order_phone_numbers/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirementGroupId` | string (UUID) | Yes | The ID of the requirement group to associate |
| `id` | string (UUID) | Yes | The unique identifier of the number order phone number |

```javascript
const response = await client.numberOrderPhoneNumbers.updateRequirementGroup(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { requirement_group_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve regulatory requirements for a list of phone numbers

`client.phoneNumbersRegulatoryRequirements.retrieve()` — `GET /phone_numbers_regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const phoneNumbersRegulatoryRequirement =
  await client.phoneNumbersRegulatoryRequirements.retrieve();

console.log(phoneNumbersRegulatoryRequirement.data);
```

Key response fields: `response.data.phone_number, response.data.phone_number_type, response.data.record_type`

## Retrieve regulatory requirements

`client.regulatoryRequirements.retrieve()` — `GET /regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const regulatoryRequirement = await client.regulatoryRequirements.retrieve();

console.log(regulatoryRequirement.data);
```

Key response fields: `response.data.action, response.data.country_code, response.data.phone_number_type`

## List requirement groups

`client.requirementGroups.list()` — `GET /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const requirementGroups = await client.requirementGroups.list();

console.log(requirementGroups);
```

## Create a new requirement group

`client.requirementGroups.create()` — `POST /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | ISO alpha 2 country code |
| `phoneNumberType` | enum (local, toll_free, mobile, national, shared_cost) | Yes |  |
| `action` | enum (ordering, porting) | Yes |  |
| `customerReference` | string | No |  |
| `regulatoryRequirements` | array[object] | No |  |

```javascript
const requirementGroup = await client.requirementGroups.create({
  action: 'ordering',
  country_code: 'US',
  phone_number_type: 'local',
});

console.log(requirementGroup.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single requirement group by ID

`client.requirementGroups.retrieve()` — `GET /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group to retrieve |

```javascript
const requirementGroup = await client.requirementGroups.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(requirementGroup.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update requirement values in requirement group

`client.requirementGroups.update()` — `PATCH /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group |
| `customerReference` | string | No | Reference for the customer |
| `regulatoryRequirements` | array[object] | No |  |

```javascript
const requirementGroup = await client.requirementGroups.update('550e8400-e29b-41d4-a716-446655440000');

console.log(requirementGroup.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a requirement group by ID

`client.requirementGroups.delete()` — `DELETE /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group |

```javascript
const requirementGroup = await client.requirementGroups.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(requirementGroup.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a Requirement Group for Approval

`client.requirementGroups.submitForApproval()` — `POST /requirement_groups/{id}/submit_for_approval`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group to submit |

```javascript
const requirementGroup = await client.requirementGroups.submitForApproval('550e8400-e29b-41d4-a716-446655440000');

console.log(requirementGroup.id);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all requirement types

List all requirement types ordered by created_at descending

`client.requirementTypes.list()` — `GET /requirement_types`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for requirement types (deepObj... |
| `sort` | array[string] | No | Specifies the sort order for results. |

```javascript
const requirementTypes = await client.requirementTypes.list();

console.log(requirementTypes.data);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Retrieve a requirement types

Retrieve a requirement type by id

`client.requirementTypes.retrieve()` — `GET /requirement_types/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```javascript
const requirementType = await client.requirementTypes.retrieve(
  'a38c217a-8019-48f8-bff6-0fdd9939075b',
);

console.log(requirementType.data);
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## List all requirements

List all requirements with filtering, sorting, and pagination

`client.requirements.list()` — `GET /requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for requirements (deepObject s... |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const requirementListResponse of client.requirements.list()) {
  console.log(requirementListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a document requirement

Retrieve a document requirement record

`client.requirements.retrieve()` — `GET /requirements/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```javascript
const requirement = await client.requirements.retrieve('a9dad8d5-fdbd-49d7-aa23-39bb08a5ebaa');

console.log(requirement.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update requirement group for a sub number order

`client.subNumberOrders.updateRequirementGroup()` — `POST /sub_number_orders/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirementGroupId` | string (UUID) | Yes | The ID of the requirement group to associate |
| `id` | string (UUID) | Yes | The ID of the sub number order |

```javascript
const response = await client.subNumberOrders.updateRequirementGroup(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { requirement_group_id: 'a4b201f9-8646-4e54-a7d2-b2e403eeaf8c' },
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all user addresses

Returns a list of your user addresses.

`client.userAddresses.list()` — `GET /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const userAddress of client.userAddresses.list()) {
  console.log(userAddress.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates a user address

Creates a user address.

`client.userAddresses.create()` — `POST /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firstName` | string | Yes | The first name associated with the user address. |
| `lastName` | string | Yes | The last name associated with the user address. |
| `businessName` | string | Yes | The business name associated with the user address. |
| `streetAddress` | string | Yes | The primary street address information about the user addres... |
| `locality` | string | Yes | The locality of the user address. |
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the u... |
| `customerReference` | string | No | A customer reference string for customer look ups. |
| `phoneNumber` | string (E.164) | No | The phone number associated with the user address. |
| `extendedAddress` | string | No | Additional street address information about the user address... |
| ... | | | +5 optional params in the API Details section below |

```javascript
const userAddress = await client.userAddresses.create({
  business_name: "Toy-O'Kon",
  country_code: 'US',
  first_name: 'Alfred',
  last_name: 'Foster',
  locality: 'Austin',
  street_address: '600 Congress Avenue',
});

console.log(userAddress.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Retrieve a user address

Retrieves the details of an existing user address.

`client.userAddresses.retrieve()` — `GET /user_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | user address ID |

```javascript
const userAddress = await client.userAddresses.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(userAddress.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List all Verified Numbers

Gets a paginated list of Verified Numbers.

`client.verifiedNumbers.list()` — `GET /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const verifiedNumber of client.verifiedNumbers.list()) {
  console.log(verifiedNumber.phone_number);
}
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Request phone number verification

Initiates phone number verification procedure. Supports DTMF extension dialing for voice calls to numbers behind IVR systems.

`client.verifiedNumbers.create()` — `POST /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |
| `verificationMethod` | enum (sms, call) | Yes | Verification method. |
| `extension` | string | No | Optional DTMF extension sequence to dial after the call is a... |

```javascript
const verifiedNumber = await client.verifiedNumbers.create({
  phone_number: '+15551234567',
  verification_method: 'sms',
});

console.log(verifiedNumber.phone_number);
```

Key response fields: `response.data.phone_number, response.data.verification_method`

## Retrieve a verified number

`client.verifiedNumbers.retrieve()` — `GET /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```javascript
const verifiedNumberDataWrapper = await client.verifiedNumbers.retrieve('+15551234567');

console.log(verifiedNumberDataWrapper.data);
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Delete a verified number

`client.verifiedNumbers.delete()` — `DELETE /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```javascript
const verifiedNumberDataWrapper = await client.verifiedNumbers.delete('+15551234567');

console.log(verifiedNumberDataWrapper.data);
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Submit verification code

`client.verifiedNumbers.actions.submitVerificationCode()` — `POST /verified_numbers/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationCode` | string | Yes |  |
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```javascript
const verifiedNumberDataWrapper = await client.verifiedNumbers.actions.submitVerificationCode(
  '+15551234567',
  { verification_code: '123456' },
);

console.log(verifiedNumberDataWrapper.data);
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

---

# Numbers Compliance (JavaScript) — API Details

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

### Create User Bundles — `client.bundlePricing.userBundles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `idempotencyKey` | string (UUID) | Idempotency key for the request. |
| `items` | array[object] |  |
| `authorizationBearer` | string | Authenticates the request with your Telnyx API V2 KEY |

### Upload a document — `client.documents.uploadJson()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string (URL) | If the file is already hosted publicly, you can provide a URL and have the do... |
| `file` | string | Alternatively, instead of the URL you can provide the Base64 encoded contents... |
| `filename` | string | The filename of the document. |
| `customerReference` | string | A customer reference string for customer look ups. |

### Update a document — `client.documents.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the resource. |
| `recordType` | string | Identifies the type of the resource. |
| `createdAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `updatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `contentType` | string | The document's content_type. |
| `size` | object | Indicates the document's filesize |
| `status` | enum (pending, verified, denied) | Indicates the current document reviewing status |
| `sha256` | string | The document's SHA256 hash provided for optional verification purposes. |
| `filename` | string | The filename of the document. |
| `customerReference` | string | Optional reference string for customer tracking. |
| `avScanStatus` | enum (scanned, infected, pending_scan, not_scanned) | The antivirus scan status of the document. |

### Create a new requirement group — `client.requirementGroups.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string |  |
| `regulatoryRequirements` | array[object] |  |

### Update requirement values in requirement group — `client.requirementGroups.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string | Reference for the customer |
| `regulatoryRequirements` | array[object] |  |

### Creates a user address — `client.userAddresses.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string | A customer reference string for customer look ups. |
| `phoneNumber` | string (E.164) | The phone number associated with the user address. |
| `extendedAddress` | string | Additional street address information about the user address such as, but not... |
| `administrativeArea` | string | The locality of the user address. |
| `neighborhood` | string | The neighborhood of the user address. |
| `borough` | string | The borough of the user address. |
| `postalCode` | string | The postal code of the user address. |
| `skipAddressVerification` | boolean | An optional boolean value specifying if verification of the address should be... |

### Request phone number verification — `client.verifiedNumbers.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `extension` | string | Optional DTMF extension sequence to dial after the call is answered. |
