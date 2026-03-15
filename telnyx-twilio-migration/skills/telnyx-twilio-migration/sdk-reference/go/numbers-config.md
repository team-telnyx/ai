<!-- SDK reference: telnyx-numbers-config-go -->

# Telnyx Numbers Config - Go

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-go)

### Steps

1. **List your numbers**: `client.PhoneNumbers.List(ctx, params)`
2. **Update voice settings**: `client.PhoneNumbers.Voice.Update(ctx, params)`
3. **Update messaging settings**: `client.PhoneNumbers.Messaging.Update(ctx, params)`

### Common mistakes

- Use phone_numbers.voice.update() for voice/connection settings and phone_numbers.messaging.update() for messaging/profile settings — they are SEPARATE endpoints
- Bulk operations are available for updating many numbers at once — see bulk_phone_number_operations endpoints

**Related skills**: telnyx-numbers-go, telnyx-messaging-profiles-go, telnyx-voice-go

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

result, err := client.PhoneNumbers.List(ctx, params)
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
## Bulk update phone number profiles

`client.MessagingNumbersBulkUpdates.New()` — `POST /messaging_numbers_bulk_updates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MessagingProfileId` | string (UUID) | Yes | Configure the messaging profile these phone numbers are assi... |
| `Numbers` | array[string] | Yes | The list of phone numbers to update. |
| `AssignOnly` | boolean | No | If true, only assign numbers to the profile without changing... |

```go
	messagingNumbersBulkUpdate, err := client.MessagingNumbersBulkUpdates.New(context.Background(), telnyx.MessagingNumbersBulkUpdateNewParams{
		MessagingProfileID: "00000000-0000-0000-0000-000000000000",
		Numbers:            []string{"+18880000000", "+18880000001", "+18880000002"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingNumbersBulkUpdate.Data)
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## Retrieve bulk update status

`client.MessagingNumbersBulkUpdates.Get()` — `GET /messaging_numbers_bulk_updates/{order_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `OrderId` | string (UUID) | Yes | Order ID to verify bulk update status. |

```go
	messagingNumbersBulkUpdate, err := client.MessagingNumbersBulkUpdates.Get(context.Background(), "order_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingNumbersBulkUpdate.Data)
```

Key response fields: `response.data.failed, response.data.order_id, response.data.pending`

## List mobile phone numbers with messaging settings

`client.MobilePhoneNumbers.Messaging.List()` — `GET /mobile_phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.MobilePhoneNumbers.Messaging.List(context.Background(), telnyx.MobilePhoneNumberMessagingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a mobile phone number with messaging settings

`client.MobilePhoneNumbers.Messaging.Get()` — `GET /mobile_phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	messaging, err := client.MobilePhoneNumbers.Messaging.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## List phone numbers

`client.PhoneNumbers.List()` — `GET /phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `HandleMessagingProfileError` | enum (true, false) | No | Although it is an infrequent occurrence, due to the highly d... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```go
	page, err := client.PhoneNumbers.List(context.Background(), telnyx.PhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`client.PhoneNumbers.Actions.VerifyOwnership()` — `POST /phone_numbers/actions/verify_ownership`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes | Array of phone numbers to verify ownership for |

```go
	response, err := client.PhoneNumbers.Actions.VerifyOwnership(context.Background(), telnyx.PhoneNumberActionVerifyOwnershipParams{
		PhoneNumbers: []string{"+15551234567"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.found, response.data.not_found, response.data.record_type`

## Lists the phone numbers jobs

`client.PhoneNumbers.Jobs.List()` — `GET /phone_numbers/jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (created_at) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.PhoneNumbers.Jobs.List(context.Background(), telnyx.PhoneNumberJobListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`client.PhoneNumbers.Jobs.DeleteBatch()` — `POST /phone_numbers/jobs/delete_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes |  |

```go
	response, err := client.PhoneNumbers.Jobs.DeleteBatch(context.Background(), telnyx.PhoneNumberJobDeleteBatchParams{
		PhoneNumbers: []string{"+19705555098", "+19715555098", "32873127836"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers. At most one thousand numbers can be updated per API call.

`client.PhoneNumbers.Jobs.UpdateEmergencySettingsBatch()` — `POST /phone_numbers/jobs/update_emergency_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes |  |
| `EmergencyEnabled` | boolean | Yes | Indicates whether to enable or disable emergency services on... |
| `EmergencyAddressId` | string (UUID) | No | Identifies the address to be used with emergency services. |

```go
	response, err := client.PhoneNumbers.Jobs.UpdateEmergencySettingsBatch(context.Background(), telnyx.PhoneNumberJobUpdateEmergencySettingsBatchParams{
		EmergencyEnabled: true,
		PhoneNumbers:     []string{"+19705555098", "+19715555098", "32873127836"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Update a batch of numbers

Creates a new background job to update a batch of numbers. At most one thousand numbers can be updated per API call. At least one of the updateable fields must be submitted.

`client.PhoneNumbers.Jobs.UpdateBatch()` — `POST /phone_numbers/jobs/update_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumbers` | array[string] | Yes | Array of phone number ids and/or phone numbers in E164 forma... |
| `Tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `ConnectionId` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `BillingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +6 optional params in the API Details section below |

```go
	response, err := client.PhoneNumbers.Jobs.UpdateBatch(context.Background(), telnyx.PhoneNumberJobUpdateBatchParams{
		PhoneNumbers: []string{"1583466971586889004", "+13127367254"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## Retrieve a phone numbers job

`client.PhoneNumbers.Jobs.Get()` — `GET /phone_numbers/jobs/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the Phone Numbers Job. |

```go
	job, err := client.PhoneNumbers.Jobs.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", job.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.type`

## List phone numbers with messaging settings

`client.PhoneNumbers.Messaging.List()` — `GET /phone_numbers/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter[type]` | enum (tollfree, longcode, shortcode) | No | Filter by phone number type. |
| `Sort[phoneNumber]` | enum (asc, desc) | No | Sort by phone number. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| ... | | | +3 optional params in the API Details section below |

```go
	page, err := client.PhoneNumbers.Messaging.List(context.Background(), telnyx.PhoneNumberMessagingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`client.PhoneNumbers.SlimList()` — `GET /phone_numbers/slim`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `IncludeConnection` | boolean | No | Include the connection associated with the phone number. |
| ... | | | +2 optional params in the API Details section below |

```go
	page, err := client.PhoneNumbers.SlimList(context.Background(), telnyx.PhoneNumberSlimListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## List phone numbers with voice settings

`client.PhoneNumbers.Voice.List()` — `GET /phone_numbers/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Sort` | enum (purchased_at, phone_number, connection_name, usage_payment_method) | No | Specifies the sort order for results. |
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.PhoneNumbers.Voice.List(context.Background(), telnyx.PhoneNumberVoiceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number

`client.PhoneNumbers.Get()` — `GET /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	phoneNumber, err := client.PhoneNumbers.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a phone number

`client.PhoneNumbers.Update()` — `PATCH /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | A list of user-assigned tags to help organize phone numbers. |
| `ConnectionId` | string (UUID) | No | Identifies the connection associated with the phone number. |
| `BillingGroupId` | string (UUID) | No | Identifies the billing group associated with the phone numbe... |
| ... | | | +5 optional params in the API Details section below |

```go
	phoneNumber, err := client.PhoneNumbers.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.PhoneNumberUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Delete a phone number

`client.PhoneNumbers.Delete()` — `DELETE /phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	phoneNumber, err := client.PhoneNumbers.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

`client.PhoneNumbers.Actions.ChangeBundleStatus()` — `PATCH /phone_numbers/{id}/actions/bundle_status_change`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BundleId` | string (UUID) | Yes | The new bundle_id setting for the number. |
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.PhoneNumbers.Actions.ChangeBundleStatus(
		context.Background(),
		"1293384261075731499",
		telnyx.PhoneNumberActionChangeBundleStatusParams{
			BundleID: "5194d8fc-87e6-4188-baa9-1c434bbe861b",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Enable emergency for a phone number

`client.PhoneNumbers.Actions.EnableEmergency()` — `POST /phone_numbers/{id}/actions/enable_emergency`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EmergencyEnabled` | boolean | Yes | Indicates whether to enable emergency services on this numbe... |
| `EmergencyAddressId` | string (UUID) | Yes | Identifies the address to be used with emergency services. |
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.PhoneNumbers.Actions.EnableEmergency(
		context.Background(),
		"1293384261075731499",
		telnyx.PhoneNumberActionEnableEmergencyParams{
			EmergencyAddressID: "53829456729313",
			EmergencyEnabled:   true,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Retrieve a phone number with messaging settings

`client.PhoneNumbers.Messaging.Get()` — `GET /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the type of resource. |

```go
	messaging, err := client.PhoneNumbers.Messaging.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Update the messaging profile and/or messaging product of a phone number

`client.PhoneNumbers.Messaging.Update()` — `PATCH /phone_numbers/{id}/messaging`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The phone number to update. |
| `MessagingProfileId` | string (UUID) | No | Configure the messaging profile this phone number is assigne... |
| `Tags` | array[string] | No | Tags to set on this phone number. |
| `MessagingProduct` | string | No | Configure the messaging product for this number:

* Omit thi... |

```go
	messaging, err := client.PhoneNumbers.Messaging.Update(
		context.Background(),
		"id",
		telnyx.PhoneNumberMessagingUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Retrieve a phone number with voice settings

`client.PhoneNumbers.Voice.Get()` — `GET /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	voice, err := client.PhoneNumbers.Voice.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## Update a phone number with voice settings

`client.PhoneNumbers.Voice.Update()` — `PATCH /phone_numbers/{id}/voice`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `UsagePaymentMethod` | enum (pay-per-minute, channel) | No | Controls whether a number is billed per minute or uses your ... |
| `InboundCallScreening` | enum (disabled, reject_calls, flag_calls) | No | The inbound_call_screening setting is a phone number configu... |
| `TechPrefixEnabled` | boolean | No | Controls whether a tech prefix is enabled for this phone num... |
| ... | | | +6 optional params in the API Details section below |

```go
	voice, err := client.PhoneNumbers.Voice.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.PhoneNumberVoiceUpdateParams{
			UpdateVoiceSettings: telnyx.UpdateVoiceSettingsParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.connection_id`

## List Mobile Phone Numbers

`client.MobilePhoneNumbers.List()` — `GET /v2/mobile_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | The page number to load |
| `Page[size]` | integer | No | The size of the page |

```go
	page, err := client.MobilePhoneNumbers.List(context.Background(), telnyx.MobilePhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve a Mobile Phone Number

`client.MobilePhoneNumbers.Get()` — `GET /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID of the mobile phone number |

```go
	mobilePhoneNumber, err := client.MobilePhoneNumbers.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobilePhoneNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Update a Mobile Phone Number

`client.MobilePhoneNumbers.Update()` — `PATCH /v2/mobile_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | The ID of the mobile phone number |
| `ConnectionId` | string (UUID) | No |  |
| `Tags` | array[string] | No |  |
| `InboundCallScreening` | enum (disabled, reject_calls, flag_calls) | No |  |
| ... | | | +8 optional params in the API Details section below |

```go
	mobilePhoneNumber, err := client.MobilePhoneNumbers.Update(
		context.Background(),
		"id",
		telnyx.MobilePhoneNumberUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobilePhoneNumber.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

---

# Numbers Config (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Bulk update phone number profiles, Retrieve bulk update status

| Field | Type |
|-------|------|
| `failed` | array[string] |
| `order_id` | uuid |
| `pending` | array[string] |
| `record_type` | enum: messaging_numbers_bulk_update |
| `success` | array[string] |

**Returned by:** List mobile phone numbers with messaging settings, Retrieve a mobile phone number with messaging settings

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `features` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: longcode |
| `updated_at` | date-time |

**Returned by:** List phone numbers, Retrieve a phone number, Update a phone number

| Field | Type |
|-------|------|
| `billing_group_id` | string \| null |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string \| null |
| `connection_name` | string \| null |
| `country_iso_alpha2` | string |
| `created_at` | date-time |
| `customer_reference` | string \| null |
| `deletion_lock_enabled` | boolean |
| `emergency_address_id` | string \| null |
| `emergency_enabled` | boolean |
| `emergency_status` | enum: active, deprovisioning, disabled, provisioning, provisioning-failed |
| `external_pin` | string \| null |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `messaging_profile_id` | string \| null |
| `messaging_profile_name` | string \| null |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode |
| `purchased_at` | string |
| `record_type` | string |
| `source_type` | object |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending |
| `t38_fax_gateway_enabled` | boolean |
| `tags` | array[string] |
| `updated_at` | string |

**Returned by:** Verify ownership of phone numbers

| Field | Type |
|-------|------|
| `found` | array[object] |
| `not_found` | array[string] |
| `record_type` | string |

**Returned by:** Lists the phone numbers jobs, Delete a batch of numbers, Update the emergency settings from a batch of numbers, Update a batch of numbers, Retrieve a phone numbers job

| Field | Type |
|-------|------|
| `created_at` | string |
| `etc` | date-time |
| `failed_operations` | array[object] |
| `id` | uuid |
| `pending_operations` | array[object] |
| `phone_numbers` | array[object] |
| `record_type` | string |
| `status` | enum: pending, in_progress, completed, failed, expired |
| `successful_operations` | array[object] |
| `type` | enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers |
| `updated_at` | string |

**Returned by:** List phone numbers with messaging settings, Retrieve a phone number with messaging settings, Update the messaging profile and/or messaging product of a phone number

| Field | Type |
|-------|------|
| `country_code` | string |
| `created_at` | date-time |
| `eligible_messaging_products` | array[string] |
| `features` | object |
| `health` | object |
| `id` | string |
| `messaging_product` | string |
| `messaging_profile_id` | string \| null |
| `organization_id` | string |
| `phone_number` | string |
| `record_type` | enum: messaging_phone_number, messaging_settings |
| `tags` | array[string] |
| `traffic_type` | string |
| `type` | enum: long-code, toll-free, short-code, longcode, tollfree, shortcode |
| `updated_at` | date-time |

**Returned by:** Slim List phone numbers

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string |
| `country_iso_alpha2` | string |
| `created_at` | string |
| `customer_reference` | string |
| `emergency_address_id` | string |
| `emergency_enabled` | boolean |
| `emergency_status` | enum: active, deprovisioning, disabled, provisioning, provisioning-failed |
| `external_pin` | string |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode |
| `purchased_at` | string |
| `record_type` | string |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending |
| `t38_fax_gateway_enabled` | boolean |
| `updated_at` | string |

**Returned by:** List phone numbers with voice settings, Change the bundle status for a phone number (set to being in a bundle or remove from a bundle), Enable emergency for a phone number, Retrieve a phone number with voice settings, Update a phone number with voice settings

| Field | Type |
|-------|------|
| `call_forwarding` | object |
| `call_recording` | object |
| `cnam_listing` | object |
| `connection_id` | string |
| `customer_reference` | string |
| `emergency` | object |
| `id` | string |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `media_features` | object |
| `phone_number` | string |
| `record_type` | string |
| `tech_prefix_enabled` | boolean |
| `translated_number` | string |
| `usage_payment_method` | enum: pay-per-minute, channel |

**Returned by:** Delete a phone number

| Field | Type |
|-------|------|
| `billing_group_id` | string |
| `call_forwarding_enabled` | boolean |
| `call_recording_enabled` | boolean |
| `caller_id_name_enabled` | boolean |
| `cnam_listing_enabled` | boolean |
| `connection_id` | string |
| `connection_name` | string |
| `created_at` | string |
| `customer_reference` | string |
| `deletion_lock_enabled` | boolean |
| `emergency_address_id` | string |
| `emergency_enabled` | boolean |
| `external_pin` | string |
| `hd_voice_enabled` | boolean |
| `id` | string |
| `messaging_profile_id` | string |
| `messaging_profile_name` | string |
| `phone_number` | string |
| `phone_number_type` | enum: local, toll_free, mobile, national, shared_cost, landline |
| `purchased_at` | string |
| `record_type` | string |
| `status` | enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending |
| `t38_fax_gateway_enabled` | boolean |
| `tags` | array[string] |
| `updated_at` | string |

**Returned by:** List Mobile Phone Numbers, Retrieve a Mobile Phone Number, Update a Mobile Phone Number

| Field | Type |
|-------|------|
| `call_forwarding` | object |
| `call_recording` | object |
| `caller_id_name_enabled` | boolean |
| `cnam_listing` | object |
| `connection_id` | string \| null |
| `connection_name` | string \| null |
| `connection_type` | string \| null |
| `country_iso_alpha2` | string |
| `created_at` | date-time |
| `customer_reference` | string \| null |
| `id` | string |
| `inbound` | object |
| `inbound_call_screening` | enum: disabled, reject_calls, flag_calls |
| `mobile_voice_enabled` | boolean |
| `noise_suppression` | enum: inbound, outbound, both, disabled |
| `outbound` | object |
| `phone_number` | string |
| `record_type` | string |
| `sim_card_id` | uuid |
| `status` | string |
| `tags` | array[string] |
| `updated_at` | date-time |

## Optional Parameters

### Bulk update phone number profiles — `client.MessagingNumbersBulkUpdates.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `AssignOnly` | boolean | If true, only assign numbers to the profile without changing other settings. |

### Update the emergency settings from a batch of numbers — `client.PhoneNumbers.Jobs.UpdateEmergencySettingsBatch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `EmergencyAddressId` | string (UUID) | Identifies the address to be used with emergency services. |

### Update a batch of numbers — `client.PhoneNumbers.Jobs.UpdateBatch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `ExternalPin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `CustomerReference` | string | A customer reference string for customer look ups. |
| `ConnectionId` | string (UUID) | Identifies the connection associated with the phone number. |
| `BillingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |
| `HdVoiceEnabled` | boolean | Indicates whether to enable or disable HD Voice on each phone number. |
| `DeletionLockEnabled` | boolean | Indicates whether to enable or disable the deletion lock on each phone number. |
| `Voice` | object |  |
| `Filter` | object | Consolidated filter parameter (deepObject style). |

### Update a phone number — `client.PhoneNumbers.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Id` | string (UUID) | Identifies the type of resource. |
| `Tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `ExternalPin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `HdVoiceEnabled` | boolean | Indicates whether HD voice is enabled for this number. |
| `CustomerReference` | string | A customer reference string for customer look ups. |
| `AddressId` | string (UUID) | Identifies the address associated with the phone number. |
| `ConnectionId` | string (UUID) | Identifies the connection associated with the phone number. |
| `BillingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |

### Update the messaging profile and/or messaging product of a phone number — `client.PhoneNumbers.Messaging.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `MessagingProfileId` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `MessagingProduct` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `Tags` | array[string] | Tags to set on this phone number. |

### Update a phone number with voice settings — `client.PhoneNumbers.Voice.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `TechPrefixEnabled` | boolean | Controls whether a tech prefix is enabled for this phone number. |
| `TranslatedNumber` | string | This field allows you to rewrite the destination number of an inbound call be... |
| `CallerIdNameEnabled` | boolean | Controls whether the caller ID name is enabled for this phone number. |
| `CallForwarding` | object | The call forwarding settings for a phone number. |
| `CnamListing` | object | The CNAM listing settings for a phone number. |
| `UsagePaymentMethod` | enum (pay-per-minute, channel) | Controls whether a number is billed per minute or uses your concurrent channels. |
| `MediaFeatures` | object | The media features settings for a phone number. |
| `CallRecording` | object | The call recording settings for a phone number. |
| `InboundCallScreening` | enum (disabled, reject_calls, flag_calls) | The inbound_call_screening setting is a phone number configuration option var... |

### Update a Mobile Phone Number — `client.MobilePhoneNumbers.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `CustomerReference` | string |  |
| `ConnectionId` | string (UUID) |  |
| `NoiseSuppression` | boolean |  |
| `InboundCallScreening` | enum (disabled, reject_calls, flag_calls) |  |
| `CallerIdNameEnabled` | boolean |  |
| `Tags` | array[string] |  |
| `Inbound` | object |  |
| `Outbound` | object |  |
| `CallForwarding` | object |  |
| `CnamListing` | object |  |
| `CallRecording` | object |  |
