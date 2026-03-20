# Numbers Config (JavaScript) — API Details

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

### Bulk update phone number profiles — `client.messagingNumbersBulkUpdates.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignOnly` | boolean | If true, only assign numbers to the profile without changing other settings. |

### Update the emergency settings from a batch of numbers — `client.phoneNumbers.jobs.updateEmergencySettingsBatch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `emergencyAddressId` | string (UUID) | Identifies the address to be used with emergency services. |

### Update a batch of numbers — `client.phoneNumbers.jobs.updateBatch()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `externalPin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `customerReference` | string | A customer reference string for customer look ups. |
| `connectionId` | string (UUID) | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |
| `hdVoiceEnabled` | boolean | Indicates whether to enable or disable HD Voice on each phone number. |
| `deletionLockEnabled` | boolean | Indicates whether to enable or disable the deletion lock on each phone number. |
| `voice` | object |  |
| `filter` | object | Consolidated filter parameter (deepObject style). |

### Update a phone number — `client.phoneNumbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Identifies the type of resource. |
| `tags` | array[string] | A list of user-assigned tags to help organize phone numbers. |
| `externalPin` | string | If someone attempts to port your phone number away from Telnyx and your phone... |
| `hdVoiceEnabled` | boolean | Indicates whether HD voice is enabled for this number. |
| `customerReference` | string | A customer reference string for customer look ups. |
| `addressId` | string (UUID) | Identifies the address associated with the phone number. |
| `connectionId` | string (UUID) | Identifies the connection associated with the phone number. |
| `billingGroupId` | string (UUID) | Identifies the billing group associated with the phone number. |

### Update the messaging profile and/or messaging product of a phone number — `client.phoneNumbers.messaging.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `messagingProfileId` | string (UUID) | Configure the messaging profile this phone number is assigned to:

* Omit thi... |
| `messagingProduct` | string | Configure the messaging product for this number:

* Omit this field or set it... |
| `tags` | array[string] | Tags to set on this phone number. |

### Update a phone number with voice settings — `client.phoneNumbers.voice.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `techPrefixEnabled` | boolean | Controls whether a tech prefix is enabled for this phone number. |
| `translatedNumber` | string | This field allows you to rewrite the destination number of an inbound call be... |
| `callerIdNameEnabled` | boolean | Controls whether the caller ID name is enabled for this phone number. |
| `callForwarding` | object | The call forwarding settings for a phone number. |
| `cnamListing` | object | The CNAM listing settings for a phone number. |
| `usagePaymentMethod` | enum (pay-per-minute, channel) | Controls whether a number is billed per minute or uses your concurrent channels. |
| `mediaFeatures` | object | The media features settings for a phone number. |
| `callRecording` | object | The call recording settings for a phone number. |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) | The inbound_call_screening setting is a phone number configuration option var... |

### Update a Mobile Phone Number — `client.mobilePhoneNumbers.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string |  |
| `connectionId` | string (UUID) |  |
| `noiseSuppression` | boolean |  |
| `inboundCallScreening` | enum (disabled, reject_calls, flag_calls) |  |
| `callerIdNameEnabled` | boolean |  |
| `tags` | array[string] |  |
| `inbound` | object |  |
| `outbound` | object |  |
| `callForwarding` | object |  |
| `cnamListing` | object |  |
| `callRecording` | object |  |
