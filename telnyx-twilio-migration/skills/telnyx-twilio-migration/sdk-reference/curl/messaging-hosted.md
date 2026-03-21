<!-- SDK reference: telnyx-messaging-hosted-curl -->

# Telnyx Messaging Hosted - curl

## Core Workflow

### Prerequisites

1. Host phone numbers on Telnyx by completing the hosted number order process
2. For toll-free: submit toll-free verification request

### Steps

1. **Create hosted number order**
2. **Upload LOA**
3. **Monitor status**

### Common mistakes

- Hosted numbers remain with the original carrier — Telnyx routes messaging only
- Toll-free verification is required before sending A2P traffic on toll-free numbers

**Related skills**: telnyx-messaging-curl, telnyx-messaging-profiles-curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Send an RCS message

`POST /messages/rcs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS Agent ID |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `messaging_profile_id` | string (UUID) | Yes | A valid messaging profile ID |
| `agent_message` | object | Yes |  |
| `type` | enum (RCS) | No | Message type - must be set to "RCS" |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `sms_fallback` | object | No |  |
| ... | | | +1 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "agent_id": "Agent007",
  "to": "+13125551234",
  "messaging_profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_message": {}
}' \
  "https://api.telnyx.com/v2/messages/rcs"
```

Key response fields: `.data.id, .data.to, .data.from`

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`GET /messages/rcs/deeplinks/{agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS agent ID |
| `phone_number` | string (E.164) | No | Phone number in E164 format (URL encoded) |
| `body` | string | No | Pre-filled message body (URL encoded) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messages/rcs/deeplinks/{agent_id}?phone_number=%2B18445550001&body=hello%20world"
```

Key response fields: `.data.url`

## List all RCS agents

`GET /messaging/rcs/agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging/rcs/agents"
```

Key response fields: `.data.created_at, .data.updated_at, .data.agent_id`

## Retrieve an RCS agent

`GET /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging/rcs/agents/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.created_at, .data.updated_at, .data.agent_id`

## Modify an RCS agent

`PATCH /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `webhook_url` | string (URL) | No | URL to receive RCS events |
| `webhook_failover_url` | string (URL) | No | Failover URL to receive RCS events |
| `profile_id` | string (UUID) | No | Messaging profile ID associated with the RCS Agent |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/messaging/rcs/agents/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.created_at, .data.updated_at, .data.agent_id`

## Check RCS capabilities (batch)

`POST /messaging/rcs/bulk_capabilities`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS Agent ID |
| `phone_numbers` | array[string] | Yes | List of phone numbers to check |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "agent_id": "TestAgent",
  "phone_numbers": [
    "+13125551234"
  ]
}' \
  "https://api.telnyx.com/v2/messaging/rcs/bulk_capabilities"
```

Key response fields: `.data.phone_number, .data.agent_id, .data.agent_name`

## Check RCS capabilities

`GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS agent ID |
| `phone_number` | string (E.164) | Yes | Phone number in E164 format |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging/rcs/capabilities/{agent_id}/+13125550001"
```

Key response fields: `.data.phone_number, .data.agent_id, .data.agent_name`

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `phone_number` | string (E.164) | Yes | Phone number in E164 format to invite for testing |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/messaging/rcs/test_number_invite/550e8400-e29b-41d4-a716-446655440000/+13125550001"
```

Key response fields: `.data.status, .data.phone_number, .data.agent_id`

## List messaging hosted number orders

`GET /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_hosted_number_orders"
```

Key response fields: `.data.id, .data.status, .data.messaging_profile_id`

## Create a messaging hosted number order

`POST /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | No | Automatically associate the number with this messaging profi... |
| `phone_numbers` | array[string] | No | Phone numbers to be used for hosted messaging. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/messaging_hosted_number_orders"
```

Key response fields: `.data.id, .data.status, .data.messaging_profile_id`

## Check hosted messaging eligibility

`POST /messaging_hosted_number_orders/eligibility_numbers_check`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | List of phone numbers to check eligibility |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_numbers": [
    "+13125550001"
  ]
}' \
  "https://api.telnyx.com/v2/messaging_hosted_number_orders/eligibility_numbers_check"
```

Key response fields: `.data.phone_numbers`

## Retrieve a messaging hosted number order

`GET /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_hosted_number_orders/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.messaging_profile_id`

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`DELETE /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the messaging hosted number order to delete. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/messaging_hosted_number_orders/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.messaging_profile_id`

## Upload hosted number document

`POST /messaging_hosted_number_orders/{id}/actions/file_upload`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "loa=@/path/to/file" \
  -F "bill=@/path/to/file" \
  "https://api.telnyx.com/v2/messaging_hosted_number_orders/550e8400-e29b-41d4-a716-446655440000/actions/file_upload"
```

Key response fields: `.data.id, .data.status, .data.messaging_profile_id`

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order. The verification codes must be created in the verification codes endpoint.

`POST /messaging_hosted_number_orders/{id}/validation_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_codes` | array[object] | Yes |  |
| `id` | string (UUID) | Yes | Order ID related to the validation codes. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "verification_codes": [
    {}
  ]
}' \
  "https://api.telnyx.com/v2/messaging_hosted_number_orders/550e8400-e29b-41d4-a716-446655440000/validation_codes"
```

Key response fields: `.data.order_id, .data.phone_numbers`

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order. The verification codes will be sent to the numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |
| `verification_method` | enum (sms, call) | Yes |  |
| `id` | string (UUID) | Yes | Order ID to have a verification code created. |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "phone_numbers": [
    "+13125550001"
  ],
  "verification_method": "sms"
}' \
  "https://api.telnyx.com/v2/messaging_hosted_number_orders/550e8400-e29b-41d4-a716-446655440000/verification_codes"
```

Key response fields: `.data.phone_number, .data.type, .data.error`

## Delete a messaging hosted number

`DELETE /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/messaging_hosted_numbers/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.status, .data.messaging_profile_id`

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`GET /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (Verified, Rejected, Waiting For Vendor, Waiting For Customer, Waiting For Telnyx, ...) | No | Tollfree verification status |
| `date_start` | string (date-time) | No |  |
| `date_end` | string (date-time) | No |  |
| ... | | | +2 optional params in the API Details section below |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_tollfree/verification/requests"
```

Key response fields: `.data.records, .data.total_records`

## Submit Verification Request

Submit a new tollfree verification request

`POST /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessName` | string | Yes | Name of the business; there are no specific formatting requi... |
| `corporateWebsite` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `businessAddr1` | string | Yes | Line 1 of the business address |
| `businessCity` | string | Yes | The city of the business address; the first letter should be... |
| `businessState` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `businessZip` | string | Yes | The ZIP code of the business address |
| `businessContactFirstName` | string | Yes | First name of the business contact; there are no specific re... |
| `businessContactLastName` | string | Yes | Last name of the business contact; there are no specific req... |
| `businessContactEmail` | string | Yes | The email address of the business contact |
| `businessContactPhone` | string | Yes | The phone number of the business contact in E.164 format |
| `messageVolume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `phoneNumbers` | array[object] | Yes | The phone numbers to request the verification of |
| `useCase` | object | Yes | Machine-readable use-case for the phone numbers |
| `useCaseSummary` | string | Yes | Human-readable summary of the desired use-case |
| `productionMessageContent` | string | Yes | An example of a message that will be sent from the given pho... |
| `optInWorkflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `optInWorkflowImageURLs` | array[object] | Yes | Images showing the opt-in workflow |
| `additionalInformation` | string | Yes | Any additional information |
| `businessAddr2` | string | No | Line 2 of the business address |
| `isvReseller` | string | No | ISV name |
| `webhookUrl` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in the API Details section below |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "businessName": "Telnyx LLC",
  "corporateWebsite": "http://example.com",
  "businessAddr1": "600 Congress Avenue",
  "businessCity": "Austin",
  "businessState": "Texas",
  "businessZip": "78701",
  "businessContactFirstName": "John",
  "businessContactLastName": "Doe",
  "businessContactEmail": "email@example.com",
  "businessContactPhone": "+18005550100",
  "messageVolume": "100,000",
  "phoneNumbers": [
    {
      "phoneNumber": "+18773554398"
    },
    {
      "phoneNumber": "+18773554399"
    }
  ],
  "useCase": "2FA",
  "useCaseSummary": "This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal",
  "productionMessageContent": "Your Telnyx OTP is XXXX",
  "optInWorkflow": "User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
  "optInWorkflowImageURLs": [
    {
      "url": "https://telnyx.com/sign-up"
    },
    {
      "url": "https://telnyx.com/company/data-privacy"
    }
  ],
  "additionalInformation": "Additional context for this request."
}' \
  "https://api.telnyx.com/v2/messaging_tollfree/verification/requests"
```

Key response fields: `.data.id, .data.additionalInformation, .data.ageGatedContent`

## Get Verification Request

Get a single verification request by its ID.

`GET /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_tollfree/verification/requests/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.additionalInformation, .data.ageGatedContent`

## Update Verification Request

Update an existing tollfree verification request. This is particularly useful when there are pending customer actions to be taken.

`PATCH /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessName` | string | Yes | Name of the business; there are no specific formatting requi... |
| `corporateWebsite` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `businessAddr1` | string | Yes | Line 1 of the business address |
| `businessCity` | string | Yes | The city of the business address; the first letter should be... |
| `businessState` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `businessZip` | string | Yes | The ZIP code of the business address |
| `businessContactFirstName` | string | Yes | First name of the business contact; there are no specific re... |
| `businessContactLastName` | string | Yes | Last name of the business contact; there are no specific req... |
| `businessContactEmail` | string | Yes | The email address of the business contact |
| `businessContactPhone` | string | Yes | The phone number of the business contact in E.164 format |
| `messageVolume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `phoneNumbers` | array[object] | Yes | The phone numbers to request the verification of |
| `useCase` | object | Yes | Machine-readable use-case for the phone numbers |
| `useCaseSummary` | string | Yes | Human-readable summary of the desired use-case |
| `productionMessageContent` | string | Yes | An example of a message that will be sent from the given pho... |
| `optInWorkflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `optInWorkflowImageURLs` | array[object] | Yes | Images showing the opt-in workflow |
| `additionalInformation` | string | Yes | Any additional information |
| `id` | string (UUID) | Yes |  |
| `businessAddr2` | string | No | Line 2 of the business address |
| `isvReseller` | string | No | ISV name |
| `webhookUrl` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in the API Details section below |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "businessName": "Telnyx LLC",
  "corporateWebsite": "http://example.com",
  "businessAddr1": "600 Congress Avenue",
  "businessCity": "Austin",
  "businessState": "Texas",
  "businessZip": "78701",
  "businessContactFirstName": "John",
  "businessContactLastName": "Doe",
  "businessContactEmail": "email@example.com",
  "businessContactPhone": "+18005550100",
  "messageVolume": "100,000",
  "phoneNumbers": [
    {
      "phoneNumber": "+18773554398"
    },
    {
      "phoneNumber": "+18773554399"
    }
  ],
  "useCase": "2FA",
  "useCaseSummary": "This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal",
  "productionMessageContent": "Your Telnyx OTP is XXXX",
  "optInWorkflow": "User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
  "optInWorkflowImageURLs": [
    {
      "url": "https://telnyx.com/sign-up"
    },
    {
      "url": "https://telnyx.com/company/data-privacy"
    }
  ],
  "additionalInformation": "Additional context for this request."
}' \
  "https://api.telnyx.com/v2/messaging_tollfree/verification/requests/550e8400-e29b-41d4-a716-446655440000"
```

Key response fields: `.data.id, .data.additionalInformation, .data.ageGatedContent`

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state. * `HTTP 200`: request successfully deleted
* `HTTP 400`: request exists but can't be deleted (i.e. not rejected)
* `HTTP 404`: request unknown or already deleted

`DELETE /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/messaging_tollfree/verification/requests/550e8400-e29b-41d4-a716-446655440000"
```

## Get Verification Request Status History

Get the history of status changes for a verification request. Returns a paginated list of historical status changes including the reason for each change and when it occurred.

`GET /messaging_tollfree/verification/requests/{id}/status_history`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_tollfree/verification/requests/550e8400-e29b-41d4-a716-446655440000/status_history"
```

Key response fields: `.data.records, .data.total_records`

## List messaging URL domains

`GET /messaging_url_domains`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/messaging_url_domains"
```

Key response fields: `.data.id, .data.record_type, .data.url_domain`

---

# Messaging Hosted (curl) — API Details

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

### Send an RCS message

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | enum (RCS) | Message type - must be set to "RCS" |
| `webhook_url` | string (URL) | The URL where webhooks related to this message will be sent. |
| `sms_fallback` | object |  |
| `mms_fallback` | object |  |

### Modify an RCS agent

| Parameter | Type | Description |
|-----------|------|-------------|
| `profile_id` | string (UUID) | Messaging profile ID associated with the RCS Agent |
| `webhook_url` | string (URL) | URL to receive RCS events |
| `webhook_failover_url` | string (URL) | Failover URL to receive RCS events |

### Create a messaging hosted number order

| Parameter | Type | Description |
|-----------|------|-------------|
| `phone_numbers` | array[string] | Phone numbers to be used for hosted messaging. |
| `messaging_profile_id` | string (UUID) | Automatically associate the number with this messaging profile ID when the or... |

### Submit Verification Request

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessAddr2` | string | Line 2 of the business address |
| `isvReseller` | string | ISV name |
| `webhookUrl` | string | URL that should receive webhooks relating to this verification request |
| `businessRegistrationNumber` | string | Official business registration number (e.g., Employer Identification Number (... |
| `businessRegistrationType` | string | Type of business registration being provided. |
| `businessRegistrationCountry` | string | ISO 3166-1 alpha-2 country code of the issuing business authority. |
| `doingBusinessAs` | string | Doing Business As (DBA) name if different from legal name |
| `entityType` | object | Business entity classification. |
| `optInConfirmationResponse` | string | Message sent to users confirming their opt-in to receive messages |
| `helpMessageResponse` | string | The message returned when users text 'HELP' |
| `privacyPolicyURL` | string | URL pointing to the business's privacy policy. |
| `termsAndConditionURL` | string | URL pointing to the business's terms and conditions. |
| `ageGatedContent` | boolean | Indicates if messaging content requires age gating (e.g., 18+). |
| `optInKeywords` | string | Keywords used to collect and process consumer opt-ins |
| `campaignVerifyAuthorizationToken` | string | Campaign Verify Authorization Token required for Political use case submissio... |

### Update Verification Request

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessAddr2` | string | Line 2 of the business address |
| `isvReseller` | string | ISV name |
| `webhookUrl` | string | URL that should receive webhooks relating to this verification request |
| `businessRegistrationNumber` | string | Official business registration number (e.g., Employer Identification Number (... |
| `businessRegistrationType` | string | Type of business registration being provided. |
| `businessRegistrationCountry` | string | ISO 3166-1 alpha-2 country code of the issuing business authority. |
| `doingBusinessAs` | string | Doing Business As (DBA) name if different from legal name |
| `entityType` | object | Business entity classification. |
| `optInConfirmationResponse` | string | Message sent to users confirming their opt-in to receive messages |
| `helpMessageResponse` | string | The message returned when users text 'HELP' |
| `privacyPolicyURL` | string | URL pointing to the business's privacy policy. |
| `termsAndConditionURL` | string | URL pointing to the business's terms and conditions. |
| `ageGatedContent` | boolean | Indicates if messaging content requires age gating (e.g., 18+). |
| `optInKeywords` | string | Keywords used to collect and process consumer opt-ins |
| `campaignVerifyAuthorizationToken` | string | Campaign Verify Authorization Token required for Political use case submissio... |
