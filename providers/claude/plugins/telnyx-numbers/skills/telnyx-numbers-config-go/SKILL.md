---
name: telnyx-numbers-config-go
description: >-
  Configure phone number settings including caller ID, call forwarding,
  messaging enablement, and connection assignments. This skill provides Go SDK
  examples.
metadata:
  author: telnyx
  product: numbers-config
  language: go
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Config - Go

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

result, err := client.Messages.Send(ctx, params)
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

## Bulk update phone number profiles

Starts a bulk update of messaging-profile assignments for the supplied phone numbers. The response identifies the order used to monitor processing.

`POST /messaging_numbers_bulk_updates` — Required: `messaging_profile_id`, `numbers`

Optional: `assign_only` (boolean)

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

Returns: `failed` (array[string]), `order_id` (uuid), `pending` (array[string]), `record_type` (enum: messaging_numbers_bulk_update), `success` (array[string])

## Retrieve bulk update status

Returns processing status and results for a bulk messaging-settings update order.

`GET /messaging_numbers_bulk_updates/{order_id}`

```go
	messagingNumbersBulkUpdate, err := client.MessagingNumbersBulkUpdates.Get(context.Background(), "order_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messagingNumbersBulkUpdate.Data)
```

Returns: `failed` (array[string]), `order_id` (uuid), `pending` (array[string]), `record_type` (enum: messaging_numbers_bulk_update), `success` (array[string])

## List mobile phone numbers with messaging settings

Returns mobile phone numbers with their current messaging configuration.

`GET /mobile_phone_numbers/messaging`

```go
	page, err := client.MobilePhoneNumbers.Messaging.List(context.Background(), telnyx.MobilePhoneNumberMessagingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `country_code` (string), `created_at` (date-time), `features` (object), `id` (string), `messaging_product` (string), `messaging_profile_id` (string | null), `organization_id` (string), `phone_number` (string), `record_type` (enum: messaging_phone_number, messaging_settings), `tags` (array[string]), `traffic_type` (string), `type` (enum: longcode), `updated_at` (date-time)

## Retrieve a mobile phone number with messaging settings

Returns the messaging configuration for the specified mobile phone number.

`GET /mobile_phone_numbers/{id}/messaging`

```go
	messaging, err := client.MobilePhoneNumbers.Messaging.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Returns: `country_code` (string), `created_at` (date-time), `features` (object), `id` (string), `messaging_product` (string), `messaging_profile_id` (string | null), `organization_id` (string), `phone_number` (string), `record_type` (enum: messaging_phone_number, messaging_settings), `tags` (array[string]), `traffic_type` (string), `type` (enum: longcode), `updated_at` (date-time)

## List phone numbers

Returns phone numbers associated with the account. Results support pagination, sorting, and filters for number attributes, status, source, connections, billing groups, emergency addresses, tags, and customer references.

`GET /phone_numbers`

```go
	page, err := client.PhoneNumbers.List(context.Background(), telnyx.PhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `activated_at` (object), `billing_group_id` (string | null), `call_forwarding_enabled` (boolean), `call_recording_enabled` (boolean), `caller_id_name_enabled` (boolean), `cnam_listing_enabled` (boolean), `connection_id` (string | null), `connection_name` (string | null), `country_iso_alpha2` (string), `created_at` (date-time), `customer_reference` (string | null), `deletion_lock_enabled` (boolean), `emergency_address_id` (string | null), `emergency_enabled` (boolean), `emergency_status` (enum: active, deprovisioning, disabled, provisioning, provisioning-failed), `external_pin` (string | null), `hd_voice_enabled` (boolean), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `messaging_campaign_id` (string | null), `messaging_profile_id` (string | null), `messaging_profile_name` (string | null), `phone_number` (string), `phone_number_type` (enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode), `purchased_at` (string), `record_type` (string), `source_type` (object), `status` (enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending), `t38_fax_gateway_enabled` (boolean), `tags` (array[string]), `updated_at` (string)

## Verify ownership of phone numbers

Verifies ownership of the provided phone numbers and returns a mapping of numbers to their IDs, plus a list of numbers not found in the account.

`POST /phone_numbers/actions/verify_ownership` — Required: `phone_numbers`

```go
	response, err := client.PhoneNumbers.Actions.VerifyOwnership(context.Background(), telnyx.PhoneNumberActionVerifyOwnershipParams{
		PhoneNumbers: []string{"+15551234567"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `found` (array[object]), `not_found` (array[string]), `record_type` (string)

## Lists the phone numbers jobs

Returns background jobs that operate on phone numbers. Filter by job type, target phone numbers, job status, or creation-time customer reference, and sort by creation time. Multiple phone-number or status values use OR semantics within that filter; different filter categories use AND semantics.

`GET /phone_numbers/jobs`

```go
	page, err := client.PhoneNumbers.Jobs.List(context.Background(), telnyx.PhoneNumberJobListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (string), `etc` (date-time), `failed_operations` (array[object]), `id` (uuid), `parameters` (object), `pending_operations` (array[object]), `phone_numbers` (array[object]), `record_type` (string), `status` (enum: pending, in_progress, completed, failed, expired), `successful_operations` (array[object]), `type` (enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers), `updated_at` (string)

## Delete a batch of numbers

Creates a new background job to delete a batch of numbers. At most one thousand numbers can be updated per API call.

`POST /phone_numbers/jobs/delete_phone_numbers` — Required: `phone_numbers`

```go
	response, err := client.PhoneNumbers.Jobs.DeleteBatch(context.Background(), telnyx.PhoneNumberJobDeleteBatchParams{
		PhoneNumbers: []string{"+19705555098", "+19715555098", "32873127836"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `created_at` (string), `etc` (date-time), `failed_operations` (array[object]), `id` (uuid), `parameters` (object), `pending_operations` (array[object]), `phone_numbers` (array[object]), `record_type` (string), `status` (enum: pending, in_progress, completed, failed, expired), `successful_operations` (array[object]), `type` (enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers), `updated_at` (string)

## Update the emergency settings from a batch of numbers

Creates a background job to update the emergency settings of a collection of phone numbers. At most one thousand numbers can be updated per API call.

`POST /phone_numbers/jobs/update_emergency_settings` — Required: `emergency_enabled`, `phone_numbers`

Optional: `emergency_address_id` (string | null)

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

Returns: `created_at` (string), `etc` (date-time), `failed_operations` (array[object]), `id` (uuid), `parameters` (object), `pending_operations` (array[object]), `phone_numbers` (array[object]), `record_type` (string), `status` (enum: pending, in_progress, completed, failed, expired), `successful_operations` (array[object]), `type` (enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers), `updated_at` (string)

## Update a batch of numbers

Creates a new background job to update a batch of numbers. At most one thousand numbers can be updated per API call. At least one of the updateable fields must be submitted.

`POST /phone_numbers/jobs/update_phone_numbers` — Required: `phone_numbers`

Optional: `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `deletion_lock_enabled` (boolean), `external_pin` (string), `hd_voice_enabled` (boolean), `tags` (array[string]), `voice` (object)

```go
	response, err := client.PhoneNumbers.Jobs.UpdateBatch(context.Background(), telnyx.PhoneNumberJobUpdateBatchParams{
		PhoneNumbers: []string{"1583466971586889004", "+13127367254"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `created_at` (string), `etc` (date-time), `failed_operations` (array[object]), `id` (uuid), `parameters` (object), `pending_operations` (array[object]), `phone_numbers` (array[object]), `record_type` (string), `status` (enum: pending, in_progress, completed, failed, expired), `successful_operations` (array[object]), `type` (enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers), `updated_at` (string)

## Retrieve a phone numbers job

Returns the status and details of the phone-number background job identified by `id`.

`GET /phone_numbers/jobs/{id}`

```go
	job, err := client.PhoneNumbers.Jobs.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", job.Data)
```

Returns: `created_at` (string), `etc` (date-time), `failed_operations` (array[object]), `id` (uuid), `parameters` (object), `pending_operations` (array[object]), `phone_numbers` (array[object]), `record_type` (string), `status` (enum: pending, in_progress, completed, failed, expired), `successful_operations` (array[object]), `type` (enum: update_emergency_settings, delete_phone_numbers, update_phone_numbers), `updated_at` (string)

## List phone numbers with messaging settings

Returns phone numbers with their current messaging product and messaging-profile assignments.

`GET /phone_numbers/messaging`

```go
	page, err := client.PhoneNumbers.Messaging.List(context.Background(), telnyx.PhoneNumberMessagingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `country_code` (string), `created_at` (date-time), `eligible_messaging_products` (array[string]), `features` (object), `health` (object), `id` (string), `messaging_product` (string), `messaging_profile_id` (string | null), `organization_id` (string), `phone_number` (string), `record_type` (enum: messaging_phone_number, messaging_settings), `tags` (array[string]), `traffic_type` (string), `type` (enum: long-code, toll-free, short-code, longcode, tollfree, shortcode), `updated_at` (date-time)

## Slim List phone numbers

List phone numbers, This endpoint is a lighter version of the /phone_numbers endpoint having higher performance and rate limit.

`GET /phone_numbers/slim`

```go
	page, err := client.PhoneNumbers.SlimList(context.Background(), telnyx.PhoneNumberSlimListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `activated_at` (object), `billing_group_id` (string), `call_forwarding_enabled` (boolean), `call_recording_enabled` (boolean), `caller_id_name_enabled` (boolean), `cnam_listing_enabled` (boolean), `connection_id` (string), `country_iso_alpha2` (string), `created_at` (string), `customer_reference` (string), `emergency_address_id` (string), `emergency_enabled` (boolean), `emergency_status` (enum: active, deprovisioning, disabled, provisioning, provisioning-failed), `external_pin` (string), `hd_voice_enabled` (boolean), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `phone_number` (string), `phone_number_type` (enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode), `purchased_at` (string), `record_type` (string), `status` (enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending), `t38_fax_gateway_enabled` (boolean), `updated_at` (string)

## List phone numbers with voice settings

Returns account phone numbers together with their voice settings. Results support pagination, sorting, and filters for number, connection name, customer reference, and voice usage payment method.

`GET /phone_numbers/voice`

```go
	page, err := client.PhoneNumbers.Voice.List(context.Background(), telnyx.PhoneNumberVoiceListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `call_forwarding` (object), `call_recording` (object), `cnam_listing` (object), `connection_id` (string), `customer_reference` (string), `emergency` (object), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `media_features` (object), `phone_number` (string), `record_type` (string), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum: pay-per-minute, channel)

## Retrieve a phone number

Returns the detailed configuration and current state of the phone number identified by `id`.

`GET /phone_numbers/{id}`

```go
	phoneNumber, err := client.PhoneNumbers.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Returns: `activated_at` (object), `billing_group_id` (string | null), `call_forwarding_enabled` (boolean), `call_recording_enabled` (boolean), `caller_id_name_enabled` (boolean), `cnam_listing_enabled` (boolean), `connection_id` (string | null), `connection_name` (string | null), `country_iso_alpha2` (string), `created_at` (date-time), `customer_reference` (string | null), `deletion_lock_enabled` (boolean), `emergency_address_id` (string | null), `emergency_enabled` (boolean), `emergency_status` (enum: active, deprovisioning, disabled, provisioning, provisioning-failed), `external_pin` (string | null), `hd_voice_enabled` (boolean), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `messaging_campaign_id` (string | null), `messaging_profile_id` (string | null), `messaging_profile_name` (string | null), `phone_number` (string), `phone_number_type` (enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode), `purchased_at` (string), `record_type` (string), `source_type` (object), `status` (enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending), `t38_fax_gateway_enabled` (boolean), `tags` (array[string]), `updated_at` (string)

## Update a phone number

Updates the configurable settings of the specified phone number. The response contains the complete updated phone-number representation.

`PATCH /phone_numbers/{id}`

Optional: `address_id` (string), `billing_group_id` (string), `connection_id` (string), `customer_reference` (string), `external_pin` (string), `hd_voice_enabled` (boolean), `id` (string), `tags` (array[string])

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

Returns: `activated_at` (object), `billing_group_id` (string | null), `call_forwarding_enabled` (boolean), `call_recording_enabled` (boolean), `caller_id_name_enabled` (boolean), `cnam_listing_enabled` (boolean), `connection_id` (string | null), `connection_name` (string | null), `country_iso_alpha2` (string), `created_at` (date-time), `customer_reference` (string | null), `deletion_lock_enabled` (boolean), `emergency_address_id` (string | null), `emergency_enabled` (boolean), `emergency_status` (enum: active, deprovisioning, disabled, provisioning, provisioning-failed), `external_pin` (string | null), `hd_voice_enabled` (boolean), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `messaging_campaign_id` (string | null), `messaging_profile_id` (string | null), `messaging_profile_name` (string | null), `phone_number` (string), `phone_number_type` (enum: local, toll_free, mobile, national, shared_cost, landline, tollfree, shortcode, longcode), `purchased_at` (string), `record_type` (string), `source_type` (object), `status` (enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending, requirement-info-pending, requirement-info-under-review, requirement-info-exception, provision-pending), `t38_fax_gateway_enabled` (boolean), `tags` (array[string]), `updated_at` (string)

## Delete a phone number

Deletes the specified phone number from the account. The response contains the phone number's final deleted representation.

`DELETE /phone_numbers/{id}`

```go
	phoneNumber, err := client.PhoneNumbers.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Returns: `activated_at` (object), `billing_group_id` (string), `call_forwarding_enabled` (boolean), `call_recording_enabled` (boolean), `caller_id_name_enabled` (boolean), `cnam_listing_enabled` (boolean), `connection_id` (string), `connection_name` (string), `created_at` (string), `customer_reference` (string), `deletion_lock_enabled` (boolean), `emergency_address_id` (string), `emergency_enabled` (boolean), `external_pin` (string), `hd_voice_enabled` (boolean), `id` (string), `messaging_profile_id` (string), `messaging_profile_name` (string), `phone_number` (string), `phone_number_type` (enum: local, toll_free, mobile, national, shared_cost, landline), `purchased_at` (string), `record_type` (string), `status` (enum: purchase-pending, purchase-failed, port-pending, port-failed, active, deleted, emergency-only, ported-out, port-out-pending), `t38_fax_gateway_enabled` (boolean), `tags` (array[string]), `updated_at` (string)

## Change the bundle status for a phone number (set to being in a bundle or remove from a bundle)

Adds the specified phone number to a bundle or removes it from a bundle according to the requested status change. The response contains the phone number with its updated bundle state.

`PATCH /phone_numbers/{id}/actions/bundle_status_change` — Required: `bundle_id`

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

Returns: `call_forwarding` (object), `call_recording` (object), `cnam_listing` (object), `connection_id` (string), `customer_reference` (string), `emergency` (object), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `media_features` (object), `phone_number` (string), `record_type` (string), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum: pay-per-minute, channel)

## Enable emergency for a phone number

Associates emergency-service settings with the specified phone number. The operation returns the updated phone-number configuration when completed immediately or an accepted state when processing continues asynchronously.

`POST /phone_numbers/{id}/actions/enable_emergency` — Required: `emergency_enabled`, `emergency_address_id`

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

Returns: `call_forwarding` (object), `call_recording` (object), `cnam_listing` (object), `connection_id` (string), `customer_reference` (string), `emergency` (object), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `media_features` (object), `phone_number` (string), `record_type` (string), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum: pay-per-minute, channel)

## Retrieve a phone number with messaging settings

Returns the messaging product and messaging-profile assignment for the specified phone number.

`GET /phone_numbers/{id}/messaging`

```go
	messaging, err := client.PhoneNumbers.Messaging.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messaging.Data)
```

Returns: `country_code` (string), `created_at` (date-time), `eligible_messaging_products` (array[string]), `features` (object), `health` (object), `id` (string), `messaging_product` (string), `messaging_profile_id` (string | null), `organization_id` (string), `phone_number` (string), `record_type` (enum: messaging_phone_number, messaging_settings), `tags` (array[string]), `traffic_type` (string), `type` (enum: long-code, toll-free, short-code, longcode, tollfree, shortcode), `updated_at` (date-time)

## Update the messaging profile and/or messaging product of a phone number

Updates the messaging product, messaging profile, or both for the specified phone number.

`PATCH /phone_numbers/{id}/messaging`

Optional: `messaging_product` (string), `messaging_profile_id` (string), `tags` (array[string])

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

Returns: `country_code` (string), `created_at` (date-time), `eligible_messaging_products` (array[string]), `features` (object), `health` (object), `id` (string), `messaging_product` (string), `messaging_profile_id` (string | null), `organization_id` (string), `phone_number` (string), `record_type` (enum: messaging_phone_number, messaging_settings), `tags` (array[string]), `traffic_type` (string), `type` (enum: long-code, toll-free, short-code, longcode, tollfree, shortcode), `updated_at` (date-time)

## Retrieve a phone number with voice settings

Returns the specified phone number together with its current voice configuration.

`GET /phone_numbers/{id}/voice`

```go
	voice, err := client.PhoneNumbers.Voice.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voice.Data)
```

Returns: `call_forwarding` (object), `call_recording` (object), `cnam_listing` (object), `connection_id` (string), `customer_reference` (string), `emergency` (object), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `media_features` (object), `phone_number` (string), `record_type` (string), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum: pay-per-minute, channel)

## Update a phone number with voice settings

Updates the voice configuration for the specified phone number. The response contains the phone number with its updated voice settings.

`PATCH /phone_numbers/{id}/voice`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `media_features` (object), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum: pay-per-minute, channel)

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

Returns: `call_forwarding` (object), `call_recording` (object), `cnam_listing` (object), `connection_id` (string), `customer_reference` (string), `emergency` (object), `id` (string), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `media_features` (object), `phone_number` (string), `record_type` (string), `tech_prefix_enabled` (boolean), `translated_number` (string), `usage_payment_method` (enum: pay-per-minute, channel)

## List Mobile Phone Numbers

Retrieve a paginated list of mobile phone numbers on your account.

`GET /v2/mobile_phone_numbers`

```go
	page, err := client.MobilePhoneNumbers.List(context.Background(), telnyx.MobilePhoneNumberListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (string | null), `connection_name` (string | null), `connection_type` (string | null), `country_iso_alpha2` (string), `created_at` (date-time), `customer_reference` (string | null), `id` (string), `inbound` (object), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `mobile_voice_enabled` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `outbound` (object), `phone_number` (string), `record_type` (string), `sim_card_id` (uuid), `status` (string), `tags` (array[string]), `updated_at` (date-time)

## Retrieve a Mobile Phone Number

Retrieve the details of a specific mobile phone number.

`GET /v2/mobile_phone_numbers/{id}`

```go
	mobilePhoneNumber, err := client.MobilePhoneNumbers.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mobilePhoneNumber.Data)
```

Returns: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (string | null), `connection_name` (string | null), `connection_type` (string | null), `country_iso_alpha2` (string), `created_at` (date-time), `customer_reference` (string | null), `id` (string), `inbound` (object), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `mobile_voice_enabled` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `outbound` (object), `phone_number` (string), `record_type` (string), `sim_card_id` (uuid), `status` (string), `tags` (array[string]), `updated_at` (date-time)

## Update a Mobile Phone Number

Update the settings of a specific mobile phone number.

`PATCH /v2/mobile_phone_numbers/{id}`

Optional: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (string | null), `customer_reference` (string | null), `inbound` (object), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `noise_suppression` (boolean), `outbound` (object), `tags` (array[string])

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

Returns: `call_forwarding` (object), `call_recording` (object), `caller_id_name_enabled` (boolean), `cnam_listing` (object), `connection_id` (string | null), `connection_name` (string | null), `connection_type` (string | null), `country_iso_alpha2` (string), `created_at` (date-time), `customer_reference` (string | null), `id` (string), `inbound` (object), `inbound_call_screening` (enum: disabled, reject_calls, flag_calls), `mobile_voice_enabled` (boolean), `noise_suppression` (enum: inbound, outbound, both, disabled), `outbound` (object), `phone_number` (string), `record_type` (string), `sim_card_id` (uuid), `status` (string), `tags` (array[string]), `updated_at` (date-time)
