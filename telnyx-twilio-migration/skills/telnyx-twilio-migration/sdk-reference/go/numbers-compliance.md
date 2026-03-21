<!-- SDK reference: telnyx-numbers-compliance-go -->

# Telnyx Numbers Compliance - Go

## Core Workflow

### Prerequisites

1. Check regulatory requirements for the target country before ordering numbers
2. For regulated countries: prepare supporting documents (ID, address proof, etc.)

### Steps

1. **Check requirements**: `client.RegulatoryRequirements.List(ctx, params)`
2. **Create bundle**: `client.Bundles.Create(ctx, params)`
3. **Upload documents**: `client.Documents.Create(ctx, params)`
4. **Submit for review**: `Status transitions from draft to pending_review to approved`

### Common mistakes

- Requirements vary by country and number type — always check before ordering
- Document review can take business days — submit early

**Related skills**: telnyx-numbers-go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Bundles.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Retrieve Bundles

Get all allowed bundles.

`client.BundlePricing.BillingBundles.List()` — `GET /bundle_pricing/billing_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	page, err := client.BundlePricing.BillingBundles.List(context.Background(), telnyx.BundlePricingBillingBundleListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get Bundle By Id

Get a single bundle by ID.

`client.BundlePricing.BillingBundles.Get()` — `GET /bundle_pricing/billing_bundles/{bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BundleId` | string (UUID) | Yes | Billing bundle's ID, this is used to identify the billing bu... |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	billingBundle, err := client.BundlePricing.BillingBundles.Get(
		context.Background(),
		"8661948c-a386-4385-837f-af00f40f111a",
		telnyx.BundlePricingBillingBundleGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", billingBundle.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get User Bundles

Get a paginated list of user bundles.

`client.BundlePricing.UserBundles.List()` — `GET /bundle_pricing/user_bundles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	page, err := client.BundlePricing.UserBundles.List(context.Background(), telnyx.BundlePricingUserBundleListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create User Bundles

Creates multiple user bundles for the user.

`client.BundlePricing.UserBundles.New()` — `POST /bundle_pricing/user_bundles/bulk`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `IdempotencyKey` | string (UUID) | No | Idempotency key for the request. |
| `Items` | array[object] | No |  |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	userBundle, err := client.BundlePricing.UserBundles.New(context.Background(), telnyx.BundlePricingUserBundleNewParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", userBundle.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get Unused User Bundles

Returns all user bundles that aren't in use.

`client.BundlePricing.UserBundles.ListUnused()` — `GET /bundle_pricing/user_bundles/unused`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	response, err := client.BundlePricing.UserBundles.ListUnused(context.Background(), telnyx.BundlePricingUserBundleListUnusedParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.billing_bundle, response.data.user_bundle_ids`

## Get User Bundle by Id

Retrieves a user bundle by its ID.

`client.BundlePricing.UserBundles.Get()` — `GET /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UserBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	userBundle, err := client.BundlePricing.UserBundles.Get(
		context.Background(),
		"ca1d2263-d1f1-43ac-ba53-248e7a4bb26a",
		telnyx.BundlePricingUserBundleGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", userBundle.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deactivate User Bundle

Deactivates a user bundle by its ID.

`client.BundlePricing.UserBundles.Deactivate()` — `DELETE /bundle_pricing/user_bundles/{user_bundle_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UserBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	response, err := client.BundlePricing.UserBundles.Deactivate(
		context.Background(),
		"ca1d2263-d1f1-43ac-ba53-248e7a4bb26a",
		telnyx.BundlePricingUserBundleDeactivateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Get User Bundle Resources

Retrieves the resources of a user bundle by its ID.

`client.BundlePricing.UserBundles.ListResources()` — `GET /bundle_pricing/user_bundles/{user_bundle_id}/resources`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UserBundleId` | string (UUID) | Yes | User bundle's ID, this is used to identify the user bundle i... |
| `AuthorizationBearer` | string | No | Authenticates the request with your Telnyx API V2 KEY |

```go
	response, err := client.BundlePricing.UserBundles.ListResources(
		context.Background(),
		"ca1d2263-d1f1-43ac-ba53-248e7a4bb26a",
		telnyx.BundlePricingUserBundleListResourcesParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all document links

List all documents links ordered by created_at descending.

`client.DocumentLinks.List()` — `GET /document_links`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for document links (deepObject... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.DocumentLinks.List(context.Background(), telnyx.DocumentLinkListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all documents

List all documents ordered by created_at descending.

`client.Documents.List()` — `GET /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for documents (deepObject styl... |
| `Sort` | array[string] | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Documents.List(context.Background(), telnyx.DocumentListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Upload a document

Upload a document.  Uploaded files must be linked to a service within 30 minutes or they will be automatically deleted.

`client.Documents.UploadJson()` — `POST /documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Url` | string (URL) | No | If the file is already hosted publicly, you can provide a UR... |
| `File` | string | No | Alternatively, instead of the URL you can provide the Base64... |
| `Filename` | string | No | The filename of the document. |
| ... | | | +1 optional params in the API Details section below |

```go
	response, err := client.Documents.UploadJson(context.Background(), telnyx.DocumentUploadJsonParams{
		Document: telnyx.DocumentUploadJsonParamsDocument{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a document

Retrieve a document.

`client.Documents.Get()` — `GET /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	document, err := client.Documents.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", document.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a document

Update a document.

`client.Documents.Update()` — `PATCH /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Status` | enum (pending, verified, denied) | No | Indicates the current document reviewing status |
| `AvScanStatus` | enum (scanned, infected, pending_scan, not_scanned) | No | The antivirus scan status of the document. |
| `Id` | string (UUID) | No | Identifies the resource. |
| ... | | | +8 optional params in the API Details section below |

```go
	document, err := client.Documents.Update(
		context.Background(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.DocumentUpdateParams{
			DocServiceDocument: telnyx.DocServiceDocumentParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", document.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a document

Delete a document.  A document can only be deleted if it's not linked to a service. If it is linked to a service, it must be unlinked prior to deleting.

`client.Documents.Delete()` — `DELETE /documents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	document, err := client.Documents.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", document.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Download a document

Download a document.

`client.Documents.Download()` — `GET /documents/{id}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.Documents.Download(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Generate a temporary download link for a document

Generates a temporary pre-signed URL that can be used to download the document directly from the storage backend without authentication.

`client.Documents.GenerateDownloadLink()` — `GET /documents/{id}/download_link`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the document |

```go
	response, err := client.Documents.GenerateDownloadLink(context.Background(), "550e8400-e29b-41d4-a716-446655440000")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.url`

## Update requirement group for a phone number order

`client.NumberOrderPhoneNumbers.UpdateRequirementGroup()` — `POST /number_order_phone_numbers/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RequirementGroupId` | string (UUID) | Yes | The ID of the requirement group to associate |
| `Id` | string (UUID) | Yes | The unique identifier of the number order phone number |

```go
	response, err := client.NumberOrderPhoneNumbers.UpdateRequirementGroup(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.NumberOrderPhoneNumberUpdateRequirementGroupParams{
			RequirementGroupID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve regulatory requirements for a list of phone numbers

`client.PhoneNumbersRegulatoryRequirements.Get()` — `GET /phone_numbers_regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	phoneNumbersRegulatoryRequirement, err := client.PhoneNumbersRegulatoryRequirements.Get(context.Background(), telnyx.PhoneNumbersRegulatoryRequirementGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumbersRegulatoryRequirement.Data)
```

Key response fields: `response.data.phone_number, response.data.phone_number_type, response.data.record_type`

## Retrieve regulatory requirements

`client.RegulatoryRequirements.Get()` — `GET /regulatory_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	regulatoryRequirement, err := client.RegulatoryRequirements.Get(context.Background(), telnyx.RegulatoryRequirementGetParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", regulatoryRequirement.Data)
```

Key response fields: `response.data.action, response.data.country_code, response.data.phone_number_type`

## List requirement groups

`client.RequirementGroups.List()` — `GET /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	requirementGroups, err := client.RequirementGroups.List(context.Background(), telnyx.RequirementGroupListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementGroups)
```

## Create a new requirement group

`client.RequirementGroups.New()` — `POST /requirement_groups`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes | ISO alpha 2 country code |
| `PhoneNumberType` | enum (local, toll_free, mobile, national, shared_cost) | Yes |  |
| `Action` | enum (ordering, porting) | Yes |  |
| `CustomerReference` | string | No |  |
| `RegulatoryRequirements` | array[object] | No |  |

```go
	requirementGroup, err := client.RequirementGroups.New(context.Background(), telnyx.RequirementGroupNewParams{
		Action:          telnyx.RequirementGroupNewParamsActionOrdering,
		CountryCode:     "US",
		PhoneNumberType: telnyx.RequirementGroupNewParamsPhoneNumberTypeLocal,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementGroup.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a single requirement group by ID

`client.RequirementGroups.Get()` — `GET /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | ID of the requirement group to retrieve |

```go
	requirementGroup, err := client.RequirementGroups.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementGroup.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update requirement values in requirement group

`client.RequirementGroups.Update()` — `PATCH /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | ID of the requirement group |
| `CustomerReference` | string | No | Reference for the customer |
| `RegulatoryRequirements` | array[object] | No |  |

```go
	requirementGroup, err := client.RequirementGroups.Update(
		context.Background(),
		"id",
		telnyx.RequirementGroupUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementGroup.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a requirement group by ID

`client.RequirementGroups.Delete()` — `DELETE /requirement_groups/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | ID of the requirement group |

```go
	requirementGroup, err := client.RequirementGroups.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementGroup.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a Requirement Group for Approval

`client.RequirementGroups.SubmitForApproval()` — `POST /requirement_groups/{id}/submit_for_approval`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | ID of the requirement group to submit |

```go
	requirementGroup, err := client.RequirementGroups.SubmitForApproval(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementGroup.ID)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all requirement types

List all requirement types ordered by created_at descending

`client.RequirementTypes.List()` — `GET /requirement_types`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for requirement types (deepObj... |
| `Sort` | array[string] | No | Specifies the sort order for results. |

```go
	requirementTypes, err := client.RequirementTypes.List(context.Background(), telnyx.RequirementTypeListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementTypes.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## Retrieve a requirement types

Retrieve a requirement type by id

`client.RequirementTypes.Get()` — `GET /requirement_types/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```go
	requirementType, err := client.RequirementTypes.Get(context.Background(), "a38c217a-8019-48f8-bff6-0fdd9939075b")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirementType.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.type`

## List all requirements

List all requirements with filtering, sorting, and pagination

`client.Requirements.List()` — `GET /requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter for requirements (deepObject s... |
| `Sort` | array[string] | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.Requirements.List(context.Background(), telnyx.RequirementListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a document requirement

Retrieve a document requirement record

`client.Requirements.Get()` — `GET /requirements/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Uniquely identifies the requirement_type record |

```go
	requirement, err := client.Requirements.Get(context.Background(), "a9dad8d5-fdbd-49d7-aa23-39bb08a5ebaa")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", requirement.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update requirement group for a sub number order

`client.SubNumberOrders.UpdateRequirementGroup()` — `POST /sub_number_orders/{id}/requirement_group`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RequirementGroupId` | string (UUID) | Yes | The ID of the requirement group to associate |
| `Id` | string (UUID) | Yes | The ID of the sub number order |

```go
	response, err := client.SubNumberOrders.UpdateRequirementGroup(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.SubNumberOrderUpdateRequirementGroupParams{
			RequirementGroupID: "a4b201f9-8646-4e54-a7d2-b2e403eeaf8c",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all user addresses

Returns a list of your user addresses.

`client.UserAddresses.List()` — `GET /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at, first_name, last_name, business_name, street_address) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.UserAddresses.List(context.Background(), telnyx.UserAddressListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Creates a user address

Creates a user address.

`client.UserAddresses.New()` — `POST /user_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `FirstName` | string | Yes | The first name associated with the user address. |
| `LastName` | string | Yes | The last name associated with the user address. |
| `BusinessName` | string | Yes | The business name associated with the user address. |
| `StreetAddress` | string | Yes | The primary street address information about the user addres... |
| `Locality` | string | Yes | The locality of the user address. |
| `CountryCode` | string (ISO 3166-1 alpha-2) | Yes | The two-character (ISO 3166-1 alpha-2) country code of the u... |
| `CustomerReference` | string | No | A customer reference string for customer look ups. |
| `PhoneNumber` | string (E.164) | No | The phone number associated with the user address. |
| `ExtendedAddress` | string | No | Additional street address information about the user address... |
| ... | | | +5 optional params in the API Details section below |

```go
	userAddress, err := client.UserAddresses.New(context.Background(), telnyx.UserAddressNewParams{
		BusinessName:  "Toy-O'Kon",
		CountryCode:   "US",
		FirstName:     "Alfred",
		LastName:      "Foster",
		Locality:      "Austin",
		StreetAddress: "600 Congress Avenue",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", userAddress.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Retrieve a user address

Retrieves the details of an existing user address.

`client.UserAddresses.Get()` — `GET /user_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | user address ID |

```go
	userAddress, err := client.UserAddresses.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", userAddress.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List all Verified Numbers

Gets a paginated list of Verified Numbers.

`client.VerifiedNumbers.List()` — `GET /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.VerifiedNumbers.List(context.Background(), telnyx.VerifiedNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Request phone number verification

Initiates phone number verification procedure. Supports DTMF extension dialing for voice calls to numbers behind IVR systems.

`client.VerifiedNumbers.New()` — `POST /verified_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes |  |
| `VerificationMethod` | enum (sms, call) | Yes | Verification method. |
| `Extension` | string | No | Optional DTMF extension sequence to dial after the call is a... |

```go
	verifiedNumber, err := client.VerifiedNumbers.New(context.Background(), telnyx.VerifiedNumberNewParams{
		PhoneNumber:        "+15551234567",
		VerificationMethod: telnyx.VerifiedNumberNewParamsVerificationMethodSMS,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifiedNumber.PhoneNumber)
```

Key response fields: `response.data.phone_number, response.data.verification_method`

## Retrieve a verified number

`client.VerifiedNumbers.Get()` — `GET /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```go
	verifiedNumberDataWrapper, err := client.VerifiedNumbers.Get(context.Background(), "+15551234567")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifiedNumberDataWrapper.Data)
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Delete a verified number

`client.VerifiedNumbers.Delete()` — `DELETE /verified_numbers/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```go
	verifiedNumberDataWrapper, err := client.VerifiedNumbers.Delete(context.Background(), "+15551234567")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifiedNumberDataWrapper.Data)
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

## Submit verification code

`client.VerifiedNumbers.Actions.SubmitVerificationCode()` — `POST /verified_numbers/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerificationCode` | string | Yes |  |
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```go
	verifiedNumberDataWrapper, err := client.VerifiedNumbers.Actions.SubmitVerificationCode(
		context.Background(),
		"+15551234567",
		telnyx.VerifiedNumberActionSubmitVerificationCodeParams{
			VerificationCode: "123456",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifiedNumberDataWrapper.Data)
```

Key response fields: `response.data.phone_number, response.data.record_type, response.data.verified_at`

---

# Numbers Compliance (Go) — API Details

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

### Create User Bundles — `client.BundlePricing.UserBundles.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `IdempotencyKey` | string (UUID) | Idempotency key for the request. |
| `Items` | array[object] |  |
| `AuthorizationBearer` | string | Authenticates the request with your Telnyx API V2 KEY |

### Upload a document — `client.Documents.UploadJson()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Url` | string (URL) | If the file is already hosted publicly, you can provide a URL and have the do... |
| `File` | string | Alternatively, instead of the URL you can provide the Base64 encoded contents... |
| `Filename` | string | The filename of the document. |
| `CustomerReference` | string | A customer reference string for customer look ups. |

### Update a document — `client.Documents.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the resource. |
| `RecordType` | string | Identifies the type of the resource. |
| `CreatedAt` | string | ISO 8601 formatted date-time indicating when the resource was created. |
| `UpdatedAt` | string | ISO 8601 formatted date-time indicating when the resource was updated. |
| `ContentType` | string | The document's content_type. |
| `Size` | object | Indicates the document's filesize |
| `Status` | enum (pending, verified, denied) | Indicates the current document reviewing status |
| `Sha256` | string | The document's SHA256 hash provided for optional verification purposes. |
| `Filename` | string | The filename of the document. |
| `CustomerReference` | string | Optional reference string for customer tracking. |
| `AvScanStatus` | enum (scanned, infected, pending_scan, not_scanned) | The antivirus scan status of the document. |

### Create a new requirement group — `client.RequirementGroups.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomerReference` | string |  |
| `RegulatoryRequirements` | array[object] |  |

### Update requirement values in requirement group — `client.RequirementGroups.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomerReference` | string | Reference for the customer |
| `RegulatoryRequirements` | array[object] |  |

### Creates a user address — `client.UserAddresses.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomerReference` | string | A customer reference string for customer look ups. |
| `PhoneNumber` | string (E.164) | The phone number associated with the user address. |
| `ExtendedAddress` | string | Additional street address information about the user address such as, but not... |
| `AdministrativeArea` | string | The locality of the user address. |
| `Neighborhood` | string | The neighborhood of the user address. |
| `Borough` | string | The borough of the user address. |
| `PostalCode` | string | The postal code of the user address. |
| `SkipAddressVerification` | boolean | An optional boolean value specifying if verification of the address should be... |

### Request phone number verification — `client.VerifiedNumbers.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Extension` | string | Optional DTMF extension sequence to dial after the call is answered. |
