# Messaging Hosted (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Send an RCS message

| Field | Type |
|-------|------|
| `body` | object |
| `direction` | string |
| `encoding` | string |
| `from` | object |
| `id` | string |
| `messaging_profile_id` | string |
| `organization_id` | string |
| `received_at` | date-time |
| `record_type` | string |
| `to` | array[object] |
| `type` | string |
| `wait_seconds` | float |

**Returned by:** Generate RCS deeplink

| Field | Type |
|-------|------|
| `url` | string |

**Returned by:** List all RCS agents, Retrieve an RCS agent, Modify an RCS agent

| Field | Type |
|-------|------|
| `agent_id` | string |
| `agent_name` | string |
| `created_at` | date-time |
| `enabled` | boolean |
| `profile_id` | uuid |
| `updated_at` | date-time |
| `user_id` | string |
| `webhook_failover_url` | url |
| `webhook_url` | url |

**Returned by:** Check RCS capabilities (batch), Check RCS capabilities

| Field | Type |
|-------|------|
| `agent_id` | string |
| `agent_name` | string |
| `features` | array[string] |
| `phone_number` | string |
| `record_type` | enum: rcs.capabilities |

**Returned by:** Add RCS test number

| Field | Type |
|-------|------|
| `agent_id` | string |
| `phone_number` | string |
| `record_type` | enum: rcs.test_number_invite |
| `status` | string |

**Returned by:** List messaging hosted number orders, Create a messaging hosted number order, Retrieve a messaging hosted number order, Delete a messaging hosted number order, Upload hosted number document, Delete a messaging hosted number

| Field | Type |
|-------|------|
| `id` | uuid |
| `messaging_profile_id` | string \| null |
| `phone_numbers` | array[object] |
| `record_type` | string |
| `status` | enum: carrier_rejected, compliance_review_failed, deleted, failed, incomplete_documentation, incorrect_billing_information, ineligible_carrier, loa_file_invalid, loa_file_successful, pending, provisioning, successful |

**Returned by:** Check hosted messaging eligibility

| Field | Type |
|-------|------|
| `phone_numbers` | array[object] |

**Returned by:** Validate hosted number codes

| Field | Type |
|-------|------|
| `order_id` | uuid |
| `phone_numbers` | array[object] |

**Returned by:** Create hosted number verification codes

| Field | Type |
|-------|------|
| `error` | string |
| `phone_number` | string |
| `type` | enum: sms, call |
| `verification_code_id` | uuid |

**Returned by:** List Verification Requests, Get Verification Request Status History

| Field | Type |
|-------|------|
| `records` | array[object] |
| `total_records` | integer |

**Returned by:** Submit Verification Request, Update Verification Request

| Field | Type |
|-------|------|
| `additionalInformation` | string |
| `ageGatedContent` | boolean |
| `businessAddr1` | string |
| `businessAddr2` | string |
| `businessCity` | string |
| `businessContactEmail` | string |
| `businessContactFirstName` | string |
| `businessContactLastName` | string |
| `businessContactPhone` | string |
| `businessName` | string |
| `businessRegistrationCountry` | string |
| `businessRegistrationNumber` | string |
| `businessRegistrationType` | string |
| `businessState` | string |
| `businessZip` | string |
| `campaignVerifyAuthorizationToken` | string \| null |
| `corporateWebsite` | string |
| `doingBusinessAs` | string |
| `entityType` | object |
| `helpMessageResponse` | string |
| `id` | uuid |
| `isvReseller` | string |
| `messageVolume` | object |
| `optInConfirmationResponse` | string |
| `optInKeywords` | string |
| `optInWorkflow` | string |
| `optInWorkflowImageURLs` | array[object] |
| `phoneNumbers` | array[object] |
| `privacyPolicyURL` | string |
| `productionMessageContent` | string |
| `termsAndConditionURL` | string |
| `useCase` | object |
| `useCaseSummary` | string |
| `verificationRequestId` | string |
| `verificationStatus` | object |
| `webhookUrl` | string |

**Returned by:** Get Verification Request

| Field | Type |
|-------|------|
| `additionalInformation` | string |
| `ageGatedContent` | boolean |
| `businessAddr1` | string |
| `businessAddr2` | string |
| `businessCity` | string |
| `businessContactEmail` | string |
| `businessContactFirstName` | string |
| `businessContactLastName` | string |
| `businessContactPhone` | string |
| `businessName` | string |
| `businessRegistrationCountry` | string |
| `businessRegistrationNumber` | string |
| `businessRegistrationType` | string |
| `businessState` | string |
| `businessZip` | string |
| `campaignVerifyAuthorizationToken` | string \| null |
| `corporateWebsite` | string |
| `createdAt` | date-time |
| `doingBusinessAs` | string |
| `entityType` | object |
| `helpMessageResponse` | string |
| `id` | uuid |
| `isvReseller` | string |
| `messageVolume` | object |
| `optInConfirmationResponse` | string |
| `optInKeywords` | string |
| `optInWorkflow` | string |
| `optInWorkflowImageURLs` | array[object] |
| `phoneNumbers` | array[object] |
| `privacyPolicyURL` | string |
| `productionMessageContent` | string |
| `reason` | string |
| `termsAndConditionURL` | string |
| `updatedAt` | date-time |
| `useCase` | object |
| `useCaseSummary` | string |
| `verificationStatus` | object |
| `webhookUrl` | string |

**Returned by:** List messaging URL domains

| Field | Type |
|-------|------|
| `id` | string |
| `record_type` | string |
| `url_domain` | string |
| `use_case` | string |

## Optional Parameters

### Send an RCS message — `client.messages.rcs.send()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `type_` | enum (RCS) | Message type - must be set to "RCS" |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `sms_fallback` | object |  |
| `mms_fallback` | object |  |

### Modify an RCS agent — `client.messaging.rcs.agents.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `profile_id` | string (UUID) | Messaging profile ID associated with the RCS Agent |
| `webhook_url` | string (URL) | URL to receive RCS events |
| `webhook_failover_url` | string (URL) | Failover URL to receive RCS events |

### Create a messaging hosted number order — `client.messaging_hosted_number_orders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phone_numbers` | array[string] | Phone numbers to be used for hosted messaging. |
| `messaging_profile_id` | string (UUID) | Automatically associate the number with this messaging profile ID when the or... |

### Submit Verification Request — `client.messaging_tollfree.verification.requests.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `business_addr2` | string | Line 2 of the business address |
| `isv_reseller` | string | ISV name |
| `webhook_url` | string | URL that should receive webhooks relating to this verification request |
| `business_registration_number` | string | Official business registration number (e.g., Employer Identification Number (... |
| `business_registration_type` | string | Type of business registration being provided. |
| `business_registration_country` | string | ISO 3166-1 alpha-2 country code of the issuing business authority. |
| `doing_business_as` | string | Doing Business As (DBA) name if different from legal name |
| `entity_type` | object | Business entity classification. |
| `opt_in_confirmation_response` | string | Message sent to users confirming their opt-in to receive messages |
| `help_message_response` | string | The message returned when users text 'HELP' |
| `privacy_policy_url` | string | URL pointing to the business's privacy policy. |
| `terms_and_condition_url` | string | URL pointing to the business's terms and conditions. |
| `age_gated_content` | boolean | Indicates if messaging content requires age gating (e.g., 18+). |
| `opt_in_keywords` | string | Keywords used to collect and process consumer opt-ins |
| `campaign_verify_authorization_token` | string | Campaign Verify Authorization Token required for Political use case submissio... |

### Update Verification Request — `client.messaging_tollfree.verification.requests.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `business_addr2` | string | Line 2 of the business address |
| `isv_reseller` | string | ISV name |
| `webhook_url` | string | URL that should receive webhooks relating to this verification request |
| `business_registration_number` | string | Official business registration number (e.g., Employer Identification Number (... |
| `business_registration_type` | string | Type of business registration being provided. |
| `business_registration_country` | string | ISO 3166-1 alpha-2 country code of the issuing business authority. |
| `doing_business_as` | string | Doing Business As (DBA) name if different from legal name |
| `entity_type` | object | Business entity classification. |
| `opt_in_confirmation_response` | string | Message sent to users confirming their opt-in to receive messages |
| `help_message_response` | string | The message returned when users text 'HELP' |
| `privacy_policy_url` | string | URL pointing to the business's privacy policy. |
| `terms_and_condition_url` | string | URL pointing to the business's terms and conditions. |
| `age_gated_content` | boolean | Indicates if messaging content requires age gating (e.g., 18+). |
| `opt_in_keywords` | string | Keywords used to collect and process consumer opt-ins |
| `campaign_verify_authorization_token` | string | Campaign Verify Authorization Token required for Political use case submissio... |
