---
name: telnyx-numbers-compliance-java
description: >-
  Regulatory requirements, number bundles, supporting documents, and verified
  numbers.
metadata:
  author: telnyx
  product: numbers-compliance
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Compliance - Java

## Core Workflow

### Prerequisites

1. Check regulatory requirements for the target country before ordering numbers
2. For regulated countries: prepare supporting documents (ID, address proof, etc.)

### Steps

1. **Check requirements**: `client.regulatoryRequirements().list(params)`
2. **Create bundle**: `client.bundles().create(params)`
3. **Upload documents**: `client.documents().create(params)`
4. **Submit for review**: `Status transitions from draft to pending_review to approved`

### Common mistakes

- Requirements vary by country and number type — always check before ordering
- Document review can take business days — submit early

**Related skills**: telnyx-numbers-java

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
    var result = client.bundles().create(params);
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Retrieve Bundles

Get all allowed bundles.

`client.bundlePricing().billingBundles().list()` — `GET /bundle_pricing/billing_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleListPage;
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleListParams;

BillingBundleListPage page = client.bundlePricing().billingBundles().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Bundle By Id

Get a single bundle by ID.

`client.bundlePricing().billingBundles().retrieve()` — `GET /bundle_pricing/billing_bundles/{bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundleId` | string (UUID) | Yes | Billing bundle's ID, this is used to identify the billing bu... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleRetrieveParams;
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleRetrieveResponse;

BillingBundleRetrieveResponse billingBundle = client.bundlePricing().billingBundles().retrieve("8661948c-a386-4385-837f-af00f40f111a");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get User Bundles

Get a paginated list of user bundles.

`client.bundlePricing().userBundles().list()` — `GET /bundle_pricing/user_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListPage;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListParams;

UserBundleListPage page = client.bundlePricing().userBundles().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create User Bundles

Creates multiple user bundles for the user.

`client.bundlePricing().userBundles().create()` — `POST /bundle_pricing/user_bundles/bulk`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `idempotencyKey` | string (UUID) | No | Idempotency key for the request. |
| `items` | array[object] | No |  |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleCreateParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleCreateResponse;

UserBundleCreateResponse userBundle = client.bundlePricing().userBundles().create();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get Unused User Bundles

Returns all user bundles that aren't in use.

`client.bundlePricing().userBundles().listUnused()` — `GET /bundle_pricing/user_bundles/unused`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListUnusedParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListUnusedResponse;

UserBundleListUnusedResponse response = client.bundlePricing().userBundles().listUnused();
```

Key response fields: `response.data.billing_bundle, response.data.user_bundle_ids`

## Get User Bundle by Id

Retrieves a user bundle by its ID.

`client.bundlePricing().userBundles().retrieve()` — `GET /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleRetrieveParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleRetrieveResponse;

UserBundleRetrieveResponse userBundle = client.bundlePricing().userBundles().retrieve("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deactivate User Bundle

Deactivates a user bundle by its ID.

`client.bundlePricing().userBundles().deactivate()` — `DELETE /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleDeactivateParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleDeactivateResponse;

UserBundleDeactivateResponse response = client.bundlePricing().userBundles().deactivate("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get User Bundle Resources

Retrieves the resources of a user bundle by its ID.

`client.bundlePricing().userBundles().listResources()` — `GET /bundle_pricing/user_bundles/{user_bundle_id}/resources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `authorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListResourcesParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListResourcesResponse;

UserBundleListResourcesResponse response = client.bundlePricing().userBundles().listResources("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all document links

List all documents links ordered by created_at descending.

`client.documentLinks().list()` — `GET /document_links`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for document links (deepObject... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.documentlinks.DocumentLinkListPage;
import com.telnyx.sdk.models.documentlinks.DocumentLinkListParams;

DocumentLinkListPage page = client.documentLinks().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all documents

List all documents ordered by created_at descending.

`client.documents().list()` — `GET /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for documents (deepObject styl... |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.documents.DocumentListPage;
import com.telnyx.sdk.models.documents.DocumentListParams;

DocumentListPage page = client.documents().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Upload a document

Upload a document.  Uploaded files must be linked to a service within 30 minutes or they will be automatically deleted.

`client.documents().uploadJson()` — `POST /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | No | If the file is already hosted publicly, you can provide a UR... |
| `file` | string | No | Alternatively, instead of the URL you can provide the Base64... |
| `filename` | string | No | The filename of the document. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.documents.DocumentUploadJsonParams;
import com.telnyx.sdk.models.documents.DocumentUploadJsonResponse;

DocumentUploadJsonResponse response = client.documents().uploadJson();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a document

Retrieve a document.

`client.documents().retrieve()` — `GET /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.documents.DocumentRetrieveParams;
import com.telnyx.sdk.models.documents.DocumentRetrieveResponse;

DocumentRetrieveResponse document = client.documents().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a document

Update a document.

`client.documents().update()` — `PATCH /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `status` | enum (pending, verified, denied) | No | Indicates the current document reviewing status |
| `avScanStatus` | enum (scanned, infected, pending_scan, not_scanned) | No | The antivirus scan status of the document. |
| `id` | string (UUID) | No | Identifies the resource. |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.documents.DocServiceDocument;
import com.telnyx.sdk.models.documents.DocumentUpdateParams;
import com.telnyx.sdk.models.documents.DocumentUpdateResponse;

DocumentUpdateParams params = DocumentUpdateParams.builder()
    .documentId("6a09cdc3-8948-47f0-aa62-74ac943d6c58")
    .docServiceDocument(DocServiceDocument.builder().build())
    .build();
DocumentUpdateResponse document = client.documents().update(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a document

Delete a document.  A document can only be deleted if it's not linked to a service. If it is linked to a service, it must be unlinked prior to deleting.

`client.documents().delete()` — `DELETE /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.documents.DocumentDeleteParams;
import com.telnyx.sdk.models.documents.DocumentDeleteResponse;

DocumentDeleteResponse document = client.documents().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a document

Download a document.

`client.documents().download()` — `GET /documents/{id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.documents.DocumentDownloadParams;

HttpResponse response = client.documents().download("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Generate a temporary download link for a document

Generates a temporary pre-signed URL that can be used to download the document directly from the storage backend without authentication.

`client.documents().generateDownloadLink()` — `GET /documents/{id}/download_link`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the document |

```java
import com.telnyx.sdk.models.documents.DocumentGenerateDownloadLinkParams;
import com.telnyx.sdk.models.documents.DocumentGenerateDownloadLinkResponse;

DocumentGenerateDownloadLinkResponse response = client.documents().generateDownloadLink("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.url`

## Update requirement group for a phone number order

`client.numberOrderPhoneNumbers().updateRequirementGroup()` — `POST /number_order_phone_numbers/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirementGroupId` | string (UUID) | Yes | The ID of the requirement group to associate |
| `id` | string (UUID) | Yes | The unique identifier of the number order phone number |

```java
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberUpdateRequirementGroupParams;
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberUpdateRequirementGroupResponse;

NumberOrderPhoneNumberUpdateRequirementGroupParams params = NumberOrderPhoneNumberUpdateRequirementGroupParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .requirementGroupId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
NumberOrderPhoneNumberUpdateRequirementGroupResponse response = client.numberOrderPhoneNumbers().updateRequirementGroup(params);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve regulatory requirements for a list of phone numbers

`client.phoneNumbersRegulatoryRequirements().retrieve()` — `GET /phone_numbers_regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.phonenumbersregulatoryrequirements.PhoneNumbersRegulatoryRequirementRetrieveParams;
import com.telnyx.sdk.models.phonenumbersregulatoryrequirements.PhoneNumbersRegulatoryRequirementRetrieveResponse;

PhoneNumbersRegulatoryRequirementRetrieveResponse phoneNumbersRegulatoryRequirement = client.phoneNumbersRegulatoryRequirements().retrieve();
```

Key response fields: `response.data.phone_number, response.data.phone_number_type, response.data.record_type`

## Retrieve regulatory requirements

`client.regulatoryRequirements().retrieve()` — `GET /regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.regulatoryrequirements.RegulatoryRequirementRetrieveParams;
import com.telnyx.sdk.models.regulatoryrequirements.RegulatoryRequirementRetrieveResponse;

RegulatoryRequirementRetrieveResponse regulatoryRequirement = client.regulatoryRequirements().retrieve();
```

Key response fields: `response.data.action, response.data.country_code, response.data.phone_number_type`

## List requirement groups

`client.requirementGroups().list()` — `GET /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupListParams;

List<RequirementGroup> requirementGroups = client.requirementGroups().list();
```

## Create a new requirement group

`client.requirementGroups().create()` — `POST /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `countryCode` | string (ISO 3166-1 alpha-2) | Yes | ISO alpha 2 country code |
| `phoneNumberType` | enum (local, toll_free, mobile, national, shared_cost) | Yes |  |
| `action` | enum (ordering, porting) | Yes |  |
| `customerReference` | string | No |  |
| `regulatoryRequirements` | array[object] | No |  |

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupCreateParams;

RequirementGroupCreateParams params = RequirementGroupCreateParams.builder()
    .action(RequirementGroupCreateParams.Action.ORDERING)
    .countryCode("US")
    .phoneNumberType(RequirementGroupCreateParams.PhoneNumberType.LOCAL)
    .build();
RequirementGroup requirementGroup = client.requirementGroups().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single requirement group by ID

`client.requirementGroups().retrieve()` — `GET /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group to retrieve |

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupRetrieveParams;

RequirementGroup requirementGroup = client.requirementGroups().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update requirement values in requirement group

`client.requirementGroups().update()` — `PATCH /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group |
| `customerReference` | string | No | Reference for the customer |
| `regulatoryRequirements` | array[object] | No |  |

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupUpdateParams;

RequirementGroup requirementGroup = client.requirementGroups().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a requirement group by ID

`client.requirementGroups().delete()` — `DELETE /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group |

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupDeleteParams;

RequirementGroup requirementGroup = client.requirementGroups().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a Requirement Group for Approval

`client.requirementGroups().submitForApproval()` — `POST /requirement_groups/{id}/submit_for_approval`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ID of the requirement group to submit |

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupSubmitForApprovalParams;

RequirementGroup requirementGroup = client.requirementGroups().submitForApproval("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all requirement types

List all requirement types ordered by created_at descending

`client.requirementTypes().list()` — `GET /requirement_types`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for requirement types (deepObj... |
| `sort` | array[string] | No | Specifies the sort order for results. |

```java
import com.telnyx.sdk.models.requirementtypes.RequirementTypeListParams;
import com.telnyx.sdk.models.requirementtypes.RequirementTypeListResponse;

RequirementTypeListResponse requirementTypes = client.requirementTypes().list();
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Retrieve a requirement types

Retrieve a requirement type by id

`client.requirementTypes().retrieve()` — `GET /requirement_types/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```java
import com.telnyx.sdk.models.requirementtypes.RequirementTypeRetrieveParams;
import com.telnyx.sdk.models.requirementtypes.RequirementTypeRetrieveResponse;

RequirementTypeRetrieveResponse requirementType = client.requirementTypes().retrieve("a38c217a-8019-48f8-bff6-0fdd9939075b");
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## List all requirements

List all requirements with filtering, sorting, and pagination

`client.requirements().list()` — `GET /requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter for requirements (deepObject s... |
| `sort` | array[string] | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.requirements.RequirementListPage;
import com.telnyx.sdk.models.requirements.RequirementListParams;

RequirementListPage page = client.requirements().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a document requirement

Retrieve a document requirement record

`client.requirements().retrieve()` — `GET /requirements/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```java
import com.telnyx.sdk.models.requirements.RequirementRetrieveParams;
import com.telnyx.sdk.models.requirements.RequirementRetrieveResponse;

RequirementRetrieveResponse requirement = client.requirements().retrieve("a9dad8d5-fdbd-49d7-aa23-39bb08a5ebaa");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update requirement group for a sub number order

`client.subNumberOrders().updateRequirementGroup()` — `POST /sub_number_orders/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirementGroupId` | string (UUID) | Yes | The ID of the requirement group to associate |
| `id` | string (UUID) | Yes | The ID of the sub number order |

```java
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderUpdateRequirementGroupParams;
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderUpdateRequirementGroupResponse;

SubNumberOrderUpdateRequirementGroupParams params = SubNumberOrderUpdateRequirementGroupParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .requirementGroupId("a4b201f9-8646-4e54-a7d2-b2e403eeaf8c")
    .build();
SubNumberOrderUpdateRequirementGroupResponse response = client.subNumberOrders().updateRequirementGroup(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all user addresses

Returns a list of your user addresses.

`client.userAddresses().list()` — `GET /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.useraddresses.UserAddressListPage;
import com.telnyx.sdk.models.useraddresses.UserAddressListParams;

UserAddressListPage page = client.userAddresses().list();
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates a user address

Creates a user address.

`client.userAddresses().create()` — `POST /user_addresses`

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
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.useraddresses.UserAddressCreateParams;
import com.telnyx.sdk.models.useraddresses.UserAddressCreateResponse;

UserAddressCreateParams params = UserAddressCreateParams.builder()
    .businessName("Toy-O'Kon")
    .countryCode("US")
    .firstName("Alfred")
    .lastName("Foster")
    .locality("Austin")
    .streetAddress("600 Congress Avenue")
    .build();
UserAddressCreateResponse userAddress = client.userAddresses().create(params);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Retrieve a user address

Retrieves the details of an existing user address.

`client.userAddresses().retrieve()` — `GET /user_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | user address ID |

```java
import com.telnyx.sdk.models.useraddresses.UserAddressRetrieveParams;
import com.telnyx.sdk.models.useraddresses.UserAddressRetrieveResponse;

UserAddressRetrieveResponse userAddress = client.userAddresses().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List all Verified Numbers

Gets a paginated list of Verified Numbers.

`client.verifiedNumbers().list()` — `GET /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberListPage;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberListParams;

VerifiedNumberListPage page = client.verifiedNumbers().list();
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Request phone number verification

Initiates phone number verification procedure. Supports DTMF extension dialing for voice calls to numbers behind IVR systems.

`client.verifiedNumbers().create()` — `POST /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes |  |
| `verificationMethod` | enum (sms, call) | Yes | Verification method. |
| `extension` | string | No | Optional DTMF extension sequence to dial after the call is a... |

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberCreateParams;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberCreateResponse;

VerifiedNumberCreateParams params = VerifiedNumberCreateParams.builder()
    .phoneNumber("+15551234567")
    .verificationMethod(VerifiedNumberCreateParams.VerificationMethod.SMS)
    .build();
VerifiedNumberCreateResponse verifiedNumber = client.verifiedNumbers().create(params);
```

Key response fields: `response.data.phone_number, response.data.verification_method`

## Retrieve a verified number

`client.verifiedNumbers().retrieve()` — `GET /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberRetrieveParams;

VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().retrieve("+15551234567");
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Delete a verified number

`client.verifiedNumbers().delete()` — `DELETE /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDeleteParams;

VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().delete("+15551234567");
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Submit verification code

`client.verifiedNumbers().actions().submitVerificationCode()` — `POST /verified_numbers/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationCode` | string | Yes |  |
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.actions.ActionSubmitVerificationCodeParams;

ActionSubmitVerificationCodeParams params = ActionSubmitVerificationCodeParams.builder()
    .phoneNumber("+15551234567")
    .verificationCode("123456")
    .build();
VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().actions().submitVerificationCode(params);
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
