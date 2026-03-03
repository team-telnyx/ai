---
name: telnyx-numbers-compliance-java
description: >-
  Manage regulatory requirements, number bundles, supporting documents, and
  verified numbers for compliance. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: numbers-compliance
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Compliance - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Retrieve Bundles

Get all allowed bundles.

`GET /bundle_pricing/billing_bundles`

```java
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleListPage;
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleListParams;

BillingBundleListPage page = client.bundlePricing().billingBundles().list();
```

## Get Bundle By Id

Get a single bundle by ID.

`GET /bundle_pricing/billing_bundles/{bundle_id}`

```java
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleRetrieveParams;
import com.telnyx.sdk.models.bundlepricing.billingbundles.BillingBundleRetrieveResponse;

BillingBundleRetrieveResponse billingBundle = client.bundlePricing().billingBundles().retrieve("8661948c-a386-4385-837f-af00f40f111a");
```

## Get User Bundles

Get a paginated list of user bundles.

`GET /bundle_pricing/user_bundles`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListPage;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListParams;

UserBundleListPage page = client.bundlePricing().userBundles().list();
```

## Create User Bundles

Creates multiple user bundles for the user.

`POST /bundle_pricing/user_bundles/bulk`

Optional: `idempotency_key` (uuid), `items` (array[object])

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleCreateParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleCreateResponse;

UserBundleCreateResponse userBundle = client.bundlePricing().userBundles().create();
```

## Get Unused User Bundles

Returns all user bundles that aren't in use.

`GET /bundle_pricing/user_bundles/unused`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListUnusedParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListUnusedResponse;

UserBundleListUnusedResponse response = client.bundlePricing().userBundles().listUnused();
```

## Get User Bundle by Id

Retrieves a user bundle by its ID.

`GET /bundle_pricing/user_bundles/{user_bundle_id}`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleRetrieveParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleRetrieveResponse;

UserBundleRetrieveResponse userBundle = client.bundlePricing().userBundles().retrieve("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

## Deactivate User Bundle

Deactivates a user bundle by its ID.

`DELETE /bundle_pricing/user_bundles/{user_bundle_id}`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleDeactivateParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleDeactivateResponse;

UserBundleDeactivateResponse response = client.bundlePricing().userBundles().deactivate("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

## Get User Bundle Resources

Retrieves the resources of a user bundle by its ID.

`GET /bundle_pricing/user_bundles/{user_bundle_id}/resources`

```java
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListResourcesParams;
import com.telnyx.sdk.models.bundlepricing.userbundles.UserBundleListResourcesResponse;

UserBundleListResourcesResponse response = client.bundlePricing().userBundles().listResources("ca1d2263-d1f1-43ac-ba53-248e7a4bb26a");
```

## List all document links

List all documents links ordered by created_at descending.

`GET /document_links`

```java
import com.telnyx.sdk.models.documentlinks.DocumentLinkListPage;
import com.telnyx.sdk.models.documentlinks.DocumentLinkListParams;

DocumentLinkListPage page = client.documentLinks().list();
```

## List all documents

List all documents ordered by created_at descending.

`GET /documents`

```java
import com.telnyx.sdk.models.documents.DocumentListPage;
import com.telnyx.sdk.models.documents.DocumentListParams;

DocumentListPage page = client.documents().list();
```

## Upload a document

Upload a document.<br /><br />Uploaded files must be linked to a service within 30 minutes or they will be automatically deleted.

`POST /documents`

Optional: `customer_reference` (string), `file` (byte), `filename` (string), `url` (string)

```java
import com.telnyx.sdk.models.documents.DocumentUploadJsonParams;
import com.telnyx.sdk.models.documents.DocumentUploadJsonResponse;

DocumentUploadJsonResponse response = client.documents().uploadJson();
```

## Retrieve a document

Retrieve a document.

`GET /documents/{id}`

```java
import com.telnyx.sdk.models.documents.DocumentRetrieveParams;
import com.telnyx.sdk.models.documents.DocumentRetrieveResponse;

DocumentRetrieveResponse document = client.documents().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Update a document

Update a document.

`PATCH /documents/{id}`

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

## Delete a document

Delete a document.<br /><br />A document can only be deleted if it's not linked to a service.

`DELETE /documents/{id}`

```java
import com.telnyx.sdk.models.documents.DocumentDeleteParams;
import com.telnyx.sdk.models.documents.DocumentDeleteResponse;

DocumentDeleteResponse document = client.documents().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Download a document

Download a document.

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

## Update requirement group for a phone number order

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

## Retrieve regulatory requirements for a list of phone numbers

`GET /phone_numbers_regulatory_requirements`

```java
import com.telnyx.sdk.models.phonenumbersregulatoryrequirements.PhoneNumbersRegulatoryRequirementRetrieveParams;
import com.telnyx.sdk.models.phonenumbersregulatoryrequirements.PhoneNumbersRegulatoryRequirementRetrieveResponse;

PhoneNumbersRegulatoryRequirementRetrieveResponse phoneNumbersRegulatoryRequirement = client.phoneNumbersRegulatoryRequirements().retrieve();
```

## Retrieve regulatory requirements

`GET /regulatory_requirements`

```java
import com.telnyx.sdk.models.regulatoryrequirements.RegulatoryRequirementRetrieveParams;
import com.telnyx.sdk.models.regulatoryrequirements.RegulatoryRequirementRetrieveResponse;

RegulatoryRequirementRetrieveResponse regulatoryRequirement = client.regulatoryRequirements().retrieve();
```

## List requirement groups

`GET /requirement_groups`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupListParams;

List<RequirementGroup> requirementGroups = client.requirementGroups().list();
```

## Create a new requirement group

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

## Get a single requirement group by ID

`GET /requirement_groups/{id}`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupRetrieveParams;

RequirementGroup requirementGroup = client.requirementGroups().retrieve("id");
```

## Update requirement values in requirement group

`PATCH /requirement_groups/{id}`

Optional: `customer_reference` (string), `regulatory_requirements` (array[object])

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupUpdateParams;

RequirementGroup requirementGroup = client.requirementGroups().update("id");
```

## Delete a requirement group by ID

`DELETE /requirement_groups/{id}`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupDeleteParams;

RequirementGroup requirementGroup = client.requirementGroups().delete("id");
```

## Submit a Requirement Group for Approval

`POST /requirement_groups/{id}/submit_for_approval`

```java
import com.telnyx.sdk.models.requirementgroups.RequirementGroup;
import com.telnyx.sdk.models.requirementgroups.RequirementGroupSubmitForApprovalParams;

RequirementGroup requirementGroup = client.requirementGroups().submitForApproval("id");
```

## List all requirement types

List all requirement types ordered by created_at descending

`GET /requirement_types`

```java
import com.telnyx.sdk.models.requirementtypes.RequirementTypeListParams;
import com.telnyx.sdk.models.requirementtypes.RequirementTypeListResponse;

RequirementTypeListResponse requirementTypes = client.requirementTypes().list();
```

## Retrieve a requirement types

Retrieve a requirement type by id

`GET /requirement_types/{id}`

```java
import com.telnyx.sdk.models.requirementtypes.RequirementTypeRetrieveParams;
import com.telnyx.sdk.models.requirementtypes.RequirementTypeRetrieveResponse;

RequirementTypeRetrieveResponse requirementType = client.requirementTypes().retrieve("a38c217a-8019-48f8-bff6-0fdd9939075b");
```

## List all requirements

List all requirements with filtering, sorting, and pagination

`GET /requirements`

```java
import com.telnyx.sdk.models.requirements.RequirementListPage;
import com.telnyx.sdk.models.requirements.RequirementListParams;

RequirementListPage page = client.requirements().list();
```

## Retrieve a document requirement

Retrieve a document requirement record

`GET /requirements/{id}`

```java
import com.telnyx.sdk.models.requirements.RequirementRetrieveParams;
import com.telnyx.sdk.models.requirements.RequirementRetrieveResponse;

RequirementRetrieveResponse requirement = client.requirements().retrieve("a9dad8d5-fdbd-49d7-aa23-39bb08a5ebaa");
```

## Update requirement group for a sub number order

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

## List all user addresses

Returns a list of your user addresses.

`GET /user_addresses`

```java
import com.telnyx.sdk.models.useraddresses.UserAddressListPage;
import com.telnyx.sdk.models.useraddresses.UserAddressListParams;

UserAddressListPage page = client.userAddresses().list();
```

## Creates a user address

Creates a user address.

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

## Retrieve a user address

Retrieves the details of an existing user address.

`GET /user_addresses/{id}`

```java
import com.telnyx.sdk.models.useraddresses.UserAddressRetrieveParams;
import com.telnyx.sdk.models.useraddresses.UserAddressRetrieveResponse;

UserAddressRetrieveResponse userAddress = client.userAddresses().retrieve("id");
```

## List all Verified Numbers

Gets a paginated list of Verified Numbers.

`GET /verified_numbers`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberListPage;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberListParams;

VerifiedNumberListPage page = client.verifiedNumbers().list();
```

## Request phone number verification

Initiates phone number verification procedure.

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

## Retrieve a verified number

`GET /verified_numbers/{phone_number}`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberRetrieveParams;

VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().retrieve("+15551234567");
```

## Delete a verified number

`DELETE /verified_numbers/{phone_number}`

```java
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDataWrapper;
import com.telnyx.sdk.models.verifiednumbers.VerifiedNumberDeleteParams;

VerifiedNumberDataWrapper verifiedNumberDataWrapper = client.verifiedNumbers().delete("+15551234567");
```

## Submit verification code

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
