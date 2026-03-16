# Porting In (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Run a portability check

| Field | Type |
|-------|------|
| `fast_portable` | boolean |
| `not_portable_reason` | string |
| `phone_number` | string |
| `portable` | boolean |
| `record_type` | string |

**Returned by:** List all porting events, Show a porting event

| Field | Type |
|-------|------|
| `available_notification_methods` | array[string] |
| `event_type` | enum: porting_order.deleted |
| `id` | uuid |
| `payload` | object |
| `payload_status` | enum: created, completed |
| `porting_order_id` | uuid |

**Returned by:** List LOA configurations, Create a LOA configuration, Retrieve a LOA configuration, Update a LOA configuration

| Field | Type |
|-------|------|
| `address` | object |
| `company_name` | string |
| `contact` | object |
| `created_at` | date-time |
| `id` | uuid |
| `logo` | object |
| `name` | string |
| `organization_id` | string |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List porting related reports, Create a porting related report, Retrieve a report

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `document_id` | uuid |
| `id` | uuid |
| `params` | object |
| `record_type` | string |
| `report_type` | enum: export_porting_orders_csv |
| `status` | enum: pending, completed |
| `updated_at` | date-time |

**Returned by:** List available carriers in the UK

| Field | Type |
|-------|------|
| `alternative_cupids` | array[string] |
| `created_at` | date-time |
| `cupid` | string |
| `id` | uuid |
| `name` | string |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all porting orders, Create a porting order, Retrieve a porting order, Edit a porting order, Cancel a porting order, Submit a porting order.

| Field | Type |
|-------|------|
| `activation_settings` | object |
| `additional_steps` | array[string] |
| `created_at` | date-time |
| `customer_group_reference` | string \| null |
| `customer_reference` | string \| null |
| `description` | string |
| `documents` | object |
| `end_user` | object |
| `id` | uuid |
| `messaging` | object |
| `misc` | object |
| `old_service_provider_ocn` | string |
| `parent_support_key` | string \| null |
| `phone_number_configuration` | object |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `phone_numbers` | array[object] |
| `porting_phone_numbers_count` | integer |
| `record_type` | string |
| `requirements` | array[object] |
| `requirements_met` | boolean |
| `status` | object |
| `support_key` | string \| null |
| `updated_at` | date-time |
| `user_feedback` | object |
| `user_id` | uuid |
| `webhook_url` | uri |

**Returned by:** List all exception types

| Field | Type |
|-------|------|
| `code` | enum: ACCOUNT_NUMBER_MISMATCH, AUTH_PERSON_MISMATCH, BTN_ATN_MISMATCH, ENTITY_NAME_MISMATCH, FOC_EXPIRED, FOC_REJECTED, LOCATION_MISMATCH, LSR_PENDING, MAIN_BTN_PORTING, OSP_IRRESPONSIVE, OTHER, PASSCODE_PIN_INVALID, PHONE_NUMBER_HAS_SPECIAL_FEATURE, PHONE_NUMBER_MISMATCH, PHONE_NUMBER_NOT_PORTABLE, PORT_TYPE_INCORRECT, PORTING_ORDER_SPLIT_REQUIRED, POSTAL_CODE_MISMATCH, RATE_CENTER_NOT_PORTABLE, SV_CONFLICT, SV_UNKNOWN_FAILURE |
| `description` | string |

**Returned by:** List all phone number configurations, Create a list of phone number configurations

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `porting_phone_number_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |
| `user_bundle_id` | uuid |

**Returned by:** Activate every number in a porting order asynchronously., List all porting activation jobs, Retrieve a porting activation job, Update a porting activation job

| Field | Type |
|-------|------|
| `activate_at` | date-time |
| `activation_type` | enum: scheduled, on-demand |
| `activation_windows` | array[object] |
| `created_at` | date-time |
| `id` | uuid |
| `record_type` | string |
| `status` | enum: created, in-process, completed, failed |
| `updated_at` | date-time |

**Returned by:** Share a porting order

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `expires_at` | date-time |
| `expires_in_seconds` | integer |
| `id` | uuid |
| `permissions` | array[string] |
| `porting_order_id` | uuid |
| `record_type` | string |
| `token` | string |

**Returned by:** List additional documents, Create a list of additional documents

| Field | Type |
|-------|------|
| `content_type` | string |
| `created_at` | date-time |
| `document_id` | uuid |
| `document_type` | enum: loa, invoice, csr, other |
| `filename` | string |
| `id` | uuid |
| `porting_order_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List allowed FOC dates

| Field | Type |
|-------|------|
| `ended_at` | date-time |
| `record_type` | string |
| `started_at` | date-time |

**Returned by:** List all comments of a porting order, Create a comment for a porting order

| Field | Type |
|-------|------|
| `body` | string |
| `created_at` | date-time |
| `id` | uuid |
| `porting_order_id` | uuid |
| `record_type` | string |
| `user_type` | enum: admin, user, system |

**Returned by:** List porting order requirements

| Field | Type |
|-------|------|
| `field_type` | enum: document, textual |
| `field_value` | string |
| `record_type` | string |
| `requirement_status` | string |
| `requirement_type` | object |

**Returned by:** Retrieve the associated V1 sub_request_id and port_request_id

| Field | Type |
|-------|------|
| `port_request_id` | string |
| `sub_request_id` | string |

**Returned by:** List verification codes, Verify the verification code for a list of phone numbers

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | uuid |
| `phone_number` | string |
| `porting_order_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |
| `verified` | boolean |

**Returned by:** List action requirements for a porting order, Initiate an action requirement

| Field | Type |
|-------|------|
| `action_type` | string |
| `action_url` | string \| null |
| `cancel_reason` | string \| null |
| `created_at` | date-time |
| `id` | string |
| `porting_order_id` | string |
| `record_type` | enum: porting_action_requirement |
| `requirement_type_id` | string |
| `status` | enum: created, pending, completed, cancelled, failed |
| `updated_at` | date-time |

**Returned by:** List all associated phone numbers, Create an associated phone number, Delete an associated phone number

| Field | Type |
|-------|------|
| `action` | enum: keep, disconnect |
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `phone_number_range` | object |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `porting_order_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all phone number blocks, Create a phone number block, Delete a phone number block

| Field | Type |
|-------|------|
| `activation_ranges` | array[object] |
| `country_code` | string |
| `created_at` | date-time |
| `id` | uuid |
| `phone_number_range` | object |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all phone number extensions, Create a phone number extension, Delete a phone number extension

| Field | Type |
|-------|------|
| `activation_ranges` | array[object] |
| `created_at` | date-time |
| `extension_range` | object |
| `id` | uuid |
| `porting_phone_number_id` | uuid |
| `record_type` | string |
| `updated_at` | date-time |

**Returned by:** List all porting phone numbers

| Field | Type |
|-------|------|
| `activation_status` | enum: New, Pending, Conflict, Cancel Pending, Failed, Concurred, Activate RDY, Disconnect Pending, Concurrence Sent, Old, Sending, Active, Cancelled |
| `phone_number` | string |
| `phone_number_type` | enum: landline, local, mobile, national, shared_cost, toll_free |
| `portability_status` | enum: pending, confirmed, provisional |
| `porting_order_id` | uuid |
| `porting_order_status` | enum: draft, in-process, submitted, exception, foc-date-confirmed, cancel-pending, ported, cancelled |
| `record_type` | string |
| `requirements_status` | enum: requirement-info-pending, requirement-info-under-review, requirement-info-exception, approved |
| `support_key` | string |

## Optional Parameters

### Run a portability check — `client.portabilityChecks().run()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phoneNumbers` | array[string] | The list of +E.164 formatted phone numbers to check for portability |

### Create a porting order — `client.portingOrders().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string | A customer-specified reference number for customer bookkeeping purposes |
| `customerGroupReference` | string | A customer-specified group reference for customer bookkeeping purposes |

### Edit a porting order — `client.portingOrders().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `misc` | object |  |
| `endUser` | object |  |
| `documents` | object | Can be specified directly or via the `requirement_group_id` parameter. |
| `activationSettings` | object |  |
| `phoneNumberConfiguration` | object |  |
| `requirementGroupId` | string (UUID) | If present, we will read the current values from the specified Requirement Gr... |
| `requirements` | array[object] | List of requirements for porting numbers. |
| `userFeedback` | object |  |
| `webhookUrl` | string (URL) |  |
| `customerReference` | string |  |
| `customerGroupReference` | string |  |
| `messaging` | object |  |

### Create a comment for a porting order — `client.portingOrders().comments().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `body` | string |  |
