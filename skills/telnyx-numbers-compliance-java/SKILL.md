---
name: telnyx-numbers-compliance-java
description: >-
  Manage regulatory requirements, number bundles, supporting documents, and
  verified numbers for compliance. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: numbers-compliance
  language: java
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Compliance - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.97.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.97.0")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

// fromEnv() reads TELNYX_API_KEY and TELNYX_PUBLIC_KEY (the public key is required for
// client.webhooks().unwrap() — webhook verification)
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
        // Rate limited — wait, then retry the request (bounded exponential backoff)
        Thread.sleep(1000);
        // ...retry the call here (give up after a few attempts)
    }
    throw e; // Re-throw: a failed request must never look like success to the caller
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

## Retrieve Bundles

Returns a paginated list of the billing bundles available to your account, with support for filtering.

`GET /bundle_pricing/billing_bundles`

```java
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleListPage;
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleListParams;

BillingBundleListPage page = client.bundlePricing().billingBundles().list();
```

Returns: `cost_code` (string), `created_at` (date), `currency` (string), `id` (uuid), `is_public` (boolean), `mrc_price` (float), `name` (string), `slug` (string), `specs` (array[string])

## Get Bundle By Id

Returns the details of a single billing bundle by its ID, so you can inspect its contents before purchasing a user bundle.

`GET /bundle_pricing/billing_bundles/{bundle_id}`

```java
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleRetrieveParams;
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleRetrieveResponse;

BillingBundleRetrieveResponse billingBundle = client.bundlePricing().billingBundles().retrieve("8661948c-a386-4385-837f-af00f40f111a");
```

Returns: `active` (boolean), `bundle_limits` (array[object]), `cost_code` (string), `created_at` (date), `id` (uuid), `is_public` (boolean), `name` (string), `slug` (string)

## Get User Bundles

Returns a paginated list of the bundles active on your account, with support for filtering.

`GET /bundle_pricing/user_bundles`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListPage;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListParams;

UserBundleListPage page = client.bundlePricing().userBundles().list();
```

Returns: `active` (boolean), `billing_bundle` (object), `created_at` (date), `id` (uuid), `resources` (array[object]), `updated_at` (date), `user_id` (uuid)

## Create User Bundles

Creates multiple user bundles for the user.

`POST /bundle_pricing/user_bundles/bulk`

Optional: `idempotency_key` (uuid), `items` (array[object])

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleCreateParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleCreateResponse;

UserBundleCreateResponse userBundle = client.bundlePricing().userBundles().create();
```

Returns: `active` (boolean), `billing_bundle` (object), `created_at` (date), `id` (uuid), `resources` (array[object]), `updated_at` (date), `user_id` (uuid)

## Get Unused User Bundles

Returns all user bundles that aren't in use.

`GET /bundle_pricing/user_bundles/unused`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListUnusedParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListUnusedResponse;

UserBundleListUnusedResponse response = client.bundlePricing().userBundles().listUnused();
```

Returns: `billing_bundle` (object), `user_bundle_ids` (array[string])

## Get User Bundle by Id

Returns the details of a single user bundle on your account by its ID.

`GET /bundle_pricing/user_bundles/{user_bundle_id}`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleRetrieveParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleRetrieveResponse;

UserBundleRetrieveResponse userBundle = client.bundlePricing().userBundles().retrieve("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

Returns: `active` (boolean), `billing_bundle` (object), `created_at` (date), `id` (uuid), `resources` (array[object]), `updated_at` (date), `user_id` (uuid)

## Deactivate User Bundle

Deactivates the specified user bundle on your account and returns the deactivated bundle.

`DELETE /bundle_pricing/user_bundles/{user_bundle_id}`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleDeactivateParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleDeactivateResponse;

UserBundleDeactivateResponse response = client.bundlePricing().userBundles().deactivate("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

Returns: `active` (boolean), `billing_bundle` (object), `created_at` (date), `id` (uuid), `resources` (array[object]), `updated_at` (date), `user_id` (uuid)

## Get User Bundle Resources

Retrieves the resources of a user bundle by its ID.

`GET /bundle_pricing/user_bundles/{user_bundle_id}/resources`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListResourcesParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListResourcesResponse;

UserBundleListResourcesResponse response = client.bundlePricing().userBundles().listResources("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

Returns: `created_at` (date), `id` (uuid), `resource` (string), `resource_type` (string), `updated_at` (date)

## List all document links

List all documents links ordered by created_at descending.

`GET /document_links`

```java
import com.telnyx.sdk.models.documentlinks.DocumentLinkListPage;
import com.telnyx.sdk.models.documentlinks.DocumentLinkListParams;

DocumentLinkListPage page = client.documentLinks().list();
```

Returns: `created_at` (string), `document_id` (uuid), `id` (uuid), `linked_record_type` (string), `linked_resource_id` (string), `record_type` (string), `updated_at` (string)

## List all documents

List all documents ordered by created_at descending.

`GET /documents`

```java
import com.telnyx.sdk.models.documents.DocumentListPage;
import com.telnyx.sdk.models.documents.DocumentListParams;

DocumentListPage page = client.documents().list();
```

Returns: `av_scan_status` (enum: scanned, infected, pending_scan, not_scanned), `content_type` (string), `created_at` (string), `customer_reference` (string), `filename` (string), `id` (uuid), `record_type` (string), `sha256` (string), `size` (object), `status` (enum: pending, verified, denied), `updated_at` (string)

## Upload a document

Upload a document.  Uploaded files must be linked to a service within 30 minutes or they will be automatically deleted.

`POST /documents`

Optional: `customer_reference` (string), `file` (byte), `filename` (string), `url` (string)

```java
import com.telnyx.sdk.models.documents.DocumentUploadJsonParams;
import com.telnyx.sdk.models.documents.DocumentUploadJsonResponse;

DocumentUploadJsonResponse response = client.documents().uploadJson();
```

Returns: `av_scan_status` (enum: scanned, infected, pending_scan, not_scanned), `content_type` (string), `created_at` (string), `customer_reference` (string), `filename` (string), `id` (uuid), `record_type` (string), `sha256` (string), `size` (object), `status` (enum: pending, verified, denied), `updated_at` (string)

## Retrieve a document

Returns the details of a single document on your account, including its metadata.

`GET /documents/{id}`

```java
import com.telnyx.sdk.models.documents.DocumentRetrieveParams;
import com.telnyx.sdk.models.documents.DocumentRetrieveResponse;

DocumentRetrieveResponse document = client.documents().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Returns: `av_scan_status` (enum: scanned, infected, pending_scan, not_scanned), `content_type` (string), `created_at` (string), `customer_reference` (string), `filename` (string), `id` (uuid), `record_type` (string), `sha256` (string), `size` (object), `status` (enum: pending, verified, denied), `updated_at` (string)

## Update a document

Updates the specified document's attributes and returns the updated document.

`PATCH /documents/{id}`

Optional: `av_scan_status` (enum: scanned, infected, pending_scan, not_scanned), `content_type` (string), `created_at` (string), `customer_reference` (string), `filename` (string), `id` (uuid), `record_type` (string), `sha256` (string), `size` (object), `status` (enum: pending, verified, denied), `updated_at` (string)

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

Returns: `av_scan_status` (enum: scanned, infected, pending_scan, not_scanned), `content_type` (string), `created_at` (string), `customer_reference` (string), `filename` (string), `id` (uuid), `record_type` (string), `sha256` (string), `size` (object), `status` (enum: pending, verified, denied), `updated_at` (string)

## Delete a document

Delete a document.  A document can only be deleted if it's not linked to a service. If it is linked to a service, it must be unlinked prior to deleting.

`DELETE /documents/{id}`

```java
import com.telnyx.sdk.models.documents.DocumentDeleteParams;
import com.telnyx.sdk.models.documents.DocumentDeleteResponse;

DocumentDeleteResponse document = client.documents().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Returns: `av_scan_status` (enum: scanned, infected, pending_scan, not_scanned), `content_type` (string), `created_at` (string), `customer_reference` (string), `filename` (string), `id` (uuid), `record_type` (string), `sha256` (string), `size` (object), `status` (enum: pending, verified, denied), `updated_at` (string)

## Download a document

Downloads the raw file content of the specified document as originally uploaded.

`GET /documents/{id}/download`

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.documents.DocumentDownloadParams;

HttpResponse response = client.documents().download("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Generate a temporary download link for a document

Generates a temporary pre-signed URL that can be used to download the document directly from the storage backend without authentication.

`GET /documents/{id}/download_link`

```java
import com.telnyx.sdk.models.documents.DocumentGenerateDownloadLinkParams;
import com.telnyx.sdk.models.documents.DocumentGenerateDownloadLinkResponse;

DocumentGenerateDownloadLinkResponse response = client.documents().generateDownloadLink("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `url` (uri)

## Get action requirement details for a sub number order

Returns the input fields an action requirement needs and the current requirement action for a sub number order. Action requirements are fulfilled by an external step rather than by uploading documents. Australia mobile ID verification is currently the only action requirement.

`GET /external_requirements/{regulatory_requirement_id}/sub_number_orders/{sub_number_order_id}`

```java
var response = client.externalRequirements().subNumberOrders().retrieve("regulatory_requirement_id", "sub_number_order_id");
```

Returns: `fields_required` (array[object]), `regulatory_requirement_id` (uuid), `requirement_action` (object)

## Fulfill an action requirement for a sub number order

Submits the end user's details to the external verification provider and returns the requirement action. Australia mobile ID verification is currently the only action requirement. It generates a unique Onfido verification link, returned in `requirement_action.value`, which you share with the end user.

`POST /external_requirements/{regulatory_requirement_id}/sub_number_orders/{sub_number_order_id}` — Required: `requirement`

```java
import com.telnyx.sdk.models.externalRequirements.subNumberOrders.SubNumberOrderUpdateParams;

SubNumberOrderUpdateParams params = SubNumberOrderUpdateParams.builder()
    .requirement(null)
    .build();
var response = client.externalRequirements().subNumberOrders().update("regulatory_requirement_id", "sub_number_order_id", params);
```

Returns: `regulatory_requirement_id` (uuid), `requirement_action` (object), `sub_order_id` (uuid)

## Update requirement group for a phone number order

Associates an existing requirement group with a phone number in a number order. The response contains the updated number-order phone-number details.

`POST /number_order_phone_numbers/{id}/requirement_group` — Required: `requirement_group_id`

```java
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberUpdateRequirementGroupParams;
import com.telnyx.sdk.models.numberorderphonenumbers.NumberOrderPhoneNumberUpdateRequirementGroupResponse;

NumberOrderPhoneNumberUpdateRequirementGroupParams params = NumberOrderPhoneNumberUpdateRequirementGroupParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .requirementGroupId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
NumberOrderPhoneNumberUpdateRequirementGroupResponse response = client.numberOrderPhoneNumbers().updateRequirementGroup(params);
```

Returns: `bundle_id` (uuid), `country_code` (string), `deadline` (date-time), `id` (uuid), `is_block_number` (boolean), `locality` (string), `order_request_id` (uuid), `phone_number` (string), `phone_number_type` (string), `record_type` (string), `regulatory_requirements` (array[object]), `requirements_met` (boolean), `requirements_status` (string), `status` (string), `sub_number_order_id` (uuid)

## Retrieve regulatory requirements for a list of phone numbers

Returns the regulatory requirements that apply to the supplied comma-separated phone numbers. The response includes the matching requirement records and pagination metadata.

`GET /phone_numbers_regulatory_requirements`

```java
import com.telnyx.sdk.models.phonenumbersregulatoryrequirements.PhoneNumbersRegulatoryRequirementRetrieveParams;
import com.telnyx.sdk.models.phonenumbersregulatoryrequirements.PhoneNumbersRegulatoryRequirementRetrieveResponse;

PhoneNumbersRegulatoryRequirementRetrieveResponse phoneNumbersRegulatoryRequirement = client.phoneNumbersRegulatoryRequirements().retrieve();
```

Returns: `phone_number` (string), `phone_number_type` (string), `record_type` (string), `region_information` (array[object]), `regulatory_requirements` (array[object])

## Retrieve regulatory requirements

Returns regulatory requirements for number ordering, porting, or other supported actions. Results can be filtered by phone number, requirement group, country, number type, and action.

`GET /regulatory_requirements`

```java
import com.telnyx.sdk.models.regulatoryrequirements.RegulatoryRequirementRetrieveParams;
import com.telnyx.sdk.models.regulatoryrequirements.RegulatoryRequirementRetrieveResponse;

RegulatoryRequirementRetrieveResponse regulatoryRequirement = client.regulatoryRequirements().retrieve();
```

Returns: `action` (string), `country_code` (string), `phone_number_type` (string), `regulatory_requirements` (array[object])

## List requirement groups

Returns regulatory requirement groups for the account. Results can be filtered by country, number type, action, approval status, and customer reference.

`GET /requirement_groups`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupListParams;

List<RequirementGroup> requirementGroups = client.requirementGroups().list();
```

## Create a new requirement group

Creates a regulatory requirement group for a country, number type, and ordering or porting action. Optional customer-reference and requirement values are retained on the created group.

`POST /requirement_groups` — Required: `country_code`, `phone_number_type`, `action`

Optional: `customer_reference` (string), `regulatory_requirements` (array[object])

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

Returns: `action` (string), `country_code` (string), `created_at` (date-time), `customer_reference` (string), `id` (string), `phone_number_type` (string), `record_type` (string), `regulatory_requirements` (array[object]), `status` (enum: approved, unapproved, pending-approval, declined, expired), `updated_at` (date-time)

## Get a single requirement group by ID

Returns the regulatory requirement group identified by `id`, including its requirement values and current approval status.

`GET /requirement_groups/{id}`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupRetrieveParams;

RequirementGroup requirementGroup = client.requirementGroups().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `action` (string), `country_code` (string), `created_at` (date-time), `customer_reference` (string), `id` (string), `phone_number_type` (string), `record_type` (string), `regulatory_requirements` (array[object]), `status` (enum: approved, unapproved, pending-approval, declined, expired), `updated_at` (date-time)

## Update requirement values in requirement group

Updates the customer reference or regulatory requirement values on the specified requirement group. The response contains the updated group.

`PATCH /requirement_groups/{id}`

Optional: `customer_reference` (string), `regulatory_requirements` (array[object])

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupUpdateParams;

RequirementGroup requirementGroup = client.requirementGroups().update("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `action` (string), `country_code` (string), `created_at` (date-time), `customer_reference` (string), `id` (string), `phone_number_type` (string), `record_type` (string), `regulatory_requirements` (array[object]), `status` (enum: approved, unapproved, pending-approval, declined, expired), `updated_at` (date-time)

## Delete a requirement group by ID

Deletes the regulatory requirement group identified by `id`. The response contains the deleted requirement-group representation.

`DELETE /requirement_groups/{id}`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupDeleteParams;

RequirementGroup requirementGroup = client.requirementGroups().delete("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `action` (string), `country_code` (string), `created_at` (date-time), `customer_reference` (string), `id` (string), `phone_number_type` (string), `record_type` (string), `regulatory_requirements` (array[object]), `status` (enum: approved, unapproved, pending-approval, declined, expired), `updated_at` (date-time)

## Submit a Requirement Group for Approval

Submits the specified regulatory requirement group for approval. The response contains the requirement group with its resulting approval status.

`POST /requirement_groups/{id}/submit_for_approval`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupSubmitForApprovalParams;

RequirementGroup requirementGroup = client.requirementGroups().submitForApproval("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `action` (string), `country_code` (string), `created_at` (date-time), `customer_reference` (string), `id` (string), `phone_number_type` (string), `record_type` (string), `regulatory_requirements` (array[object]), `status` (enum: approved, unapproved, pending-approval, declined, expired), `updated_at` (date-time)

## List all requirement types

List all requirement types ordered by created_at descending

`GET /requirement_types`

```java
import com.telnyx.sdk.models.requirementtypes.RequirementTypeListParams;
import com.telnyx.sdk.models.requirementtypes.RequirementTypeListResponse;

RequirementTypeListResponse requirementTypes = client.requirementTypes().list();
```

Returns: `acceptance_criteria` (object), `created_at` (string), `description` (string), `example` (string), `id` (uuid), `name` (string), `record_type` (string), `type` (enum: document, address, textual), `updated_at` (string)

## Retrieve a requirement types

Returns the details of a single requirement type by its identifier, describing a kind of documentation needed for regulatory purposes.

`GET /requirement_types/{id}`

```java
import com.telnyx.sdk.models.requirementtypes.RequirementTypeRetrieveParams;
import com.telnyx.sdk.models.requirementtypes.RequirementTypeRetrieveResponse;

RequirementTypeRetrieveResponse requirementType = client.requirementTypes().retrieve("a38c217a-8019-48f8-bff6-0fdd9939075b");
```

Returns: `acceptance_criteria` (object), `created_at` (string), `description` (string), `example` (string), `id` (uuid), `name` (string), `record_type` (string), `type` (enum: document, address, textual), `updated_at` (string)

## List all requirements

List all requirements with filtering, sorting, and pagination

`GET /requirements`

```java
import com.telnyx.sdk.models.requirements.RequirementListPage;
import com.telnyx.sdk.models.requirements.RequirementListParams;

RequirementListPage page = client.requirements().list();
```

Returns: `action` (enum: both, branded_calling, ordering, porting), `country_code` (string), `created_at` (string), `effective_end_at` (date-time), `effective_start_at` (date-time), `id` (uuid), `locality` (string), `phone_number_type` (enum: local, mobile, multipurpose, national, shared_cost, toll_free), `record_type` (string), `requirement_types` (array[object]), `updated_at` (string), `version` (integer)

## Retrieve a document requirement

Returns a single document requirement record by its identifier, describing the documentation needed for number-related actions. A specific requirement version can be requested.

`GET /requirements/{id}`

```java
import com.telnyx.sdk.models.requirements.RequirementRetrieveParams;
import com.telnyx.sdk.models.requirements.RequirementRetrieveResponse;

RequirementRetrieveResponse requirement = client.requirements().retrieve("a9dad8d5-fdbd-49d7-aa23-39bb08a5ebaa");
```

Returns: `action` (enum: both, branded_calling, ordering, porting), `country_code` (string), `created_at` (string), `effective_end_at` (date-time), `effective_start_at` (date-time), `id` (uuid), `locality` (string), `phone_number_type` (enum: local, mobile, multipurpose, national, shared_cost, toll_free), `record_type` (string), `requirement_types` (array[object]), `updated_at` (string), `version` (integer)

## Update requirement group for a sub number order

Associates an existing requirement group with the specified sub number order. The response contains the updated sub number order requirement-group relationship.

`POST /sub_number_orders/{id}/requirement_group` — Required: `requirement_group_id`

```java
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderUpdateRequirementGroupParams;
import com.telnyx.sdk.models.subnumberorders.SubNumberOrderUpdateRequirementGroupResponse;

SubNumberOrderUpdateRequirementGroupParams params = SubNumberOrderUpdateRequirementGroupParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .requirementGroupId("a4b201f9-8646-4e54-a7d2-b2e403eeaf8c")
    .build();
SubNumberOrderUpdateRequirementGroupResponse response = client.subNumberOrders().updateRequirementGroup(params);
```

Returns: `country_code` (string), `created_at` (date-time), `customer_reference` (string), `id` (uuid), `is_block_sub_number_order` (boolean), `order_request_id` (uuid), `phone_number_type` (string), `phone_numbers` (array[object]), `phone_numbers_count` (integer), `record_type` (string), `regulatory_requirements` (array[object]), `requirements_met` (boolean), `status` (string), `updated_at` (date-time)

## List all user addresses

Returns a paginated list of your user addresses, with support for filtering and sorting.

`GET /user_addresses`

```java
import com.telnyx.sdk.models.useraddresses.UserAddressListPage;
import com.telnyx.sdk.models.useraddresses.UserAddressListParams;

UserAddressListPage page = client.userAddresses().list();
```

Returns: `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (uuid), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string)

## Creates a user address

Creates a new user address from the provided details and returns the created address.

`POST /user_addresses` — Required: `first_name`, `last_name`, `business_name`, `street_address`, `locality`, `country_code`

Optional: `administrative_area` (string), `borough` (string), `customer_reference` (string), `extended_address` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `skip_address_verification` (boolean)

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

Returns: `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (uuid), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string)

## Retrieve a user address

Retrieves the details of an existing user address.

`GET /user_addresses/{id}`

```java
import com.telnyx.sdk.models.useraddresses.UserAddressRetrieveParams;
import com.telnyx.sdk.models.useraddresses.UserAddressRetrieveResponse;

UserAddressRetrieveResponse userAddress = client.userAddresses().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `administrative_area` (string), `borough` (string), `business_name` (string), `country_code` (string), `created_at` (string), `customer_reference` (string), `extended_address` (string), `first_name` (string), `id` (uuid), `last_name` (string), `locality` (string), `neighborhood` (string), `phone_number` (string), `postal_code` (string), `record_type` (string), `street_address` (string), `updated_at` (string)

## List all Verified Numbers

Gets a paginated list of Verified Numbers.

`GET /verified_numbers`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberListPage;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberListParams;

VerifiedNumberListPage page = client.verifiedNumbers().list();
```

Returns: `phone_number` (string), `record_type` (enum: verified_number), `verified_at` (string)

## Request phone number verification

Initiates phone number verification procedure. Supports DTMF extension dialing for voice calls to numbers behind IVR systems.

`POST /verified_numbers` — Required: `phone_number`, `verification_method`

Optional: `extension` (string)

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberCreateParams;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberCreateResponse;

VerifiedNumberCreateParams params = VerifiedNumberCreateParams.builder()
    .phoneNumber("+15551234567")
    .verificationMethod(VerifiedNumberCreateParams.VerificationMethod.SMS)
    .build();
VerifiedNumberCreateResponse verifiedNumber = client.verifiedNumbers().create(params);
```

Returns: `phone_number` (string), `verification_method` (string)

## Retrieve a verified number

Retrieve the details of a verified number on your account.

`GET /verified_numbers/{phone_number}`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberRetrieveParams;

VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().retrieve("+15551234567");
```

Returns: `phone_number` (string), `record_type` (enum: verified_number), `verified_at` (string)

## Delete a verified number

Remove a verified number from your account.

`DELETE /verified_numbers/{phone_number}`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDeleteParams;

VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().delete("+15551234567");
```

Returns: `phone_number` (string), `record_type` (enum: verified_number), `verified_at` (string)

## Submit verification code

Submit the verification code received via the selected verification method to verify a phone number.

`POST /verified_numbers/{phone_number}/actions/verify` — Required: `verification_code`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.actions.ActionSubmitVerificationCodeParams;

ActionSubmitVerificationCodeParams params = ActionSubmitVerificationCodeParams.builder()
    .phoneNumber("+15551234567")
    .verificationCode("123456")
    .build();
VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().actions().submitVerificationCode(params);
```

Returns: `phone_number` (string), `record_type` (enum: verified_number), `verified_at` (string)
