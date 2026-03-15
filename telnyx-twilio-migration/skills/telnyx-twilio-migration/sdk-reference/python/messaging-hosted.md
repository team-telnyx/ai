<!-- SDK reference: telnyx-messaging-hosted-python -->

# Telnyx Messaging Hosted - Python

## Core Workflow

### Prerequisites

1. Host phone numbers on Telnyx by completing the hosted number order process
2. For toll-free: submit toll-free verification request

### Steps

1. **Create hosted number order**: `client.hosted_number_orders.create(...)`
2. **Upload LOA**: `Provide Letter of Authorization for the numbers`
3. **Monitor status**: `client.hosted_number_orders.retrieve(id=...)`

### Common mistakes

- Hosted numbers remain with the original carrier — Telnyx routes messaging only
- Toll-free verification is required before sending A2P traffic on toll-free numbers

**Related skills**: telnyx-messaging-python, telnyx-messaging-profiles-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.hosted_number_orders.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Send an RCS message

`client.messages.rcs.send()` — `POST /messages/rcs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS Agent ID |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `messaging_profile_id` | string (UUID) | Yes | A valid messaging profile ID |
| `agent_message` | object | Yes |  |
| `type_` | enum (RCS) | No | Message type - must be set to "RCS" |
| `webhook_url` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `sms_fallback` | object | No |  |
| ... | | | +1 optional params in the API Details section below |

```python
response = client.messages.rcs.send(
    agent_id="Agent007",
    agent_message={},
    messaging_profile_id="550e8400-e29b-41d4-a716-446655440000",
    to="+13125551234",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`client.messages.rcs.generate_deeplink()` — `GET /messages/rcs/deeplinks/{agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS agent ID |
| `phone_number` | string (E.164) | No | Phone number in E164 format (URL encoded) |
| `body` | string | No | Pre-filled message body (URL encoded) |

```python
response = client.messages.rcs.generate_deeplink(
    agent_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.url`

## List all RCS agents

`client.messaging.rcs.agents.list()` — `GET /messaging/rcs/agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.messaging.rcs.agents.list()
page = page.data[0]
print(page.agent_id)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Retrieve an RCS agent

`client.messaging.rcs.agents.retrieve()` — `GET /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |

```python
rcs_agent_response = client.messaging.rcs.agents.retrieve(
    "id",
)
print(rcs_agent_response.data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Modify an RCS agent

`client.messaging.rcs.agents.update()` — `PATCH /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `webhook_url` | string (URL) | No | URL to receive RCS events |
| `webhook_failover_url` | string (URL) | No | Failover URL to receive RCS events |
| `profile_id` | string (UUID) | No | Messaging profile ID associated with the RCS Agent |

```python
rcs_agent_response = client.messaging.rcs.agents.update(
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(rcs_agent_response.data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Check RCS capabilities (batch)

`client.messaging.rcs.list_bulk_capabilities()` — `POST /messaging/rcs/bulk_capabilities`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS Agent ID |
| `phone_numbers` | array[string] | Yes | List of phone numbers to check |

```python
response = client.messaging.rcs.list_bulk_capabilities(
    agent_id="TestAgent",
    phone_numbers=["+13125551234"],
)
print(response.data)
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Check RCS capabilities

`client.messaging.rcs.retrieve_capabilities()` — `GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string (UUID) | Yes | RCS agent ID |
| `phone_number` | string (E.164) | Yes | Phone number in E164 format |

```python
response = client.messaging.rcs.retrieve_capabilities(
    phone_number="+13125550001",
    agent_id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`client.messaging.rcs.invite_test_number()` — `PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `phone_number` | string (E.164) | Yes | Phone number in E164 format to invite for testing |

```python
response = client.messaging.rcs.invite_test_number(
    phone_number="+13125550001",
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.status, response.data.phone_number, response.data.agent_id`

## List messaging hosted number orders

`client.messaging_hosted_number_orders.list()` — `GET /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.messaging_hosted_number_orders.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Create a messaging hosted number order

`client.messaging_hosted_number_orders.create()` — `POST /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messaging_profile_id` | string (UUID) | No | Automatically associate the number with this messaging profi... |
| `phone_numbers` | array[string] | No | Phone numbers to be used for hosted messaging. |

```python
messaging_hosted_number_order = client.messaging_hosted_number_orders.create()
print(messaging_hosted_number_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Check hosted messaging eligibility

`client.messaging_hosted_number_orders.check_eligibility()` — `POST /messaging_hosted_number_orders/eligibility_numbers_check`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | List of phone numbers to check eligibility |

```python
response = client.messaging_hosted_number_orders.check_eligibility(
    phone_numbers=["string"],
)
print(response.phone_numbers)
```

Key response fields: `response.data.phone_numbers`

## Retrieve a messaging hosted number order

`client.messaging_hosted_number_orders.retrieve()` — `GET /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```python
messaging_hosted_number_order = client.messaging_hosted_number_orders.retrieve(
    "id",
)
print(messaging_hosted_number_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`client.messaging_hosted_number_orders.delete()` — `DELETE /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the messaging hosted number order to delete. |

```python
messaging_hosted_number_order = client.messaging_hosted_number_orders.delete(
    "id",
)
print(messaging_hosted_number_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Upload hosted number document

`client.messaging_hosted_number_orders.actions.upload_file()` — `POST /messaging_hosted_number_orders/{id}/actions/file_upload`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```python
response = client.messaging_hosted_number_orders.actions.upload_file(
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order. The verification codes must be created in the verification codes endpoint.

`client.messaging_hosted_number_orders.validate_codes()` — `POST /messaging_hosted_number_orders/{id}/validation_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verification_codes` | array[object] | Yes |  |
| `id` | string (UUID) | Yes | Order ID related to the validation codes. |

```python
response = client.messaging_hosted_number_orders.validate_codes(
    id="550e8400-e29b-41d4-a716-446655440000",
    verification_codes=[{
        "code": "code",
        "phone_number": "phone_number",
    }],
)
print(response.data)
```

Key response fields: `response.data.order_id, response.data.phone_numbers`

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order. The verification codes will be sent to the numbers of the hosted order.

`client.messaging_hosted_number_orders.create_verification_codes()` — `POST /messaging_hosted_number_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes |  |
| `verification_method` | enum (sms, call) | Yes |  |
| `id` | string (UUID) | Yes | Order ID to have a verification code created. |

```python
response = client.messaging_hosted_number_orders.create_verification_codes(
    id="550e8400-e29b-41d4-a716-446655440000",
    phone_numbers=["string"],
    verification_method="sms",
)
print(response.data)
```

Key response fields: `response.data.phone_number, response.data.type, response.data.error`

## Delete a messaging hosted number

`client.messaging_hosted_numbers.delete()` — `DELETE /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```python
messaging_hosted_number = client.messaging_hosted_numbers.delete(
    "id",
)
print(messaging_hosted_number.data)
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`client.messaging_tollfree.verification.requests.list()` — `GET /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (Verified, Rejected, Waiting For Vendor, Waiting For Customer, Waiting For Telnyx, ...) | No | Tollfree verification status |
| `date_start` | string (date-time) | No |  |
| `date_end` | string (date-time) | No |  |
| ... | | | +2 optional params in the API Details section below |

```python
page = client.messaging_tollfree.verification.requests.list(
    page=1,
    page_size=1,
)
page = page.records[0]
print(page.id)
```

Key response fields: `response.data.records, response.data.total_records`

## Submit Verification Request

Submit a new tollfree verification request

`client.messaging_tollfree.verification.requests.create()` — `POST /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `business_name` | string | Yes | Name of the business; there are no specific formatting requi... |
| `corporate_website` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `business_addr1` | string | Yes | Line 1 of the business address |
| `business_city` | string | Yes | The city of the business address; the first letter should be... |
| `business_state` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `business_zip` | string | Yes | The ZIP code of the business address |
| `business_contact_first_name` | string | Yes | First name of the business contact; there are no specific re... |
| `business_contact_last_name` | string | Yes | Last name of the business contact; there are no specific req... |
| `business_contact_email` | string | Yes | The email address of the business contact |
| `business_contact_phone` | string | Yes | The phone number of the business contact in E.164 format |
| `message_volume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `phone_numbers` | array[object] | Yes | The phone numbers to request the verification of |
| `use_case` | object | Yes | Machine-readable use-case for the phone numbers |
| `use_case_summary` | string | Yes | Human-readable summary of the desired use-case |
| `production_message_content` | string | Yes | An example of a message that will be sent from the given pho... |
| `opt_in_workflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `opt_in_workflow_image_ur_ls` | array[object] | Yes | Images showing the opt-in workflow |
| `additional_information` | string | Yes | Any additional information |
| `business_addr2` | string | No | Line 2 of the business address |
| `isv_reseller` | string | No | ISV name |
| `webhook_url` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in the API Details section below |

```python
verification_request_egress = client.messaging_tollfree.verification.requests.create(
    additional_information="additionalInformation",
    business_addr1="600 Congress Avenue",
    business_city="Austin",
    business_contact_email="email@example.com",
    business_contact_first_name="John",
    business_contact_last_name="Doe",
    business_contact_phone="+18005550100",
    business_name="Telnyx LLC",
    business_state="Texas",
    business_zip="78701",
    corporate_website="http://example.com",
    message_volume="100,000",
    opt_in_workflow="User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
    opt_in_workflow_image_urls=[{
        "url": "https://telnyx.com/sign-up"
    }, {
        "url": "https://telnyx.com/company/data-privacy"
    }],
    phone_numbers=[{
        "phone_number": "+18773554398"
    }, {
        "phone_number": "+18773554399"
    }],
    production_message_content="Your Telnyx OTP is XXXX",
    use_case="2FA",
    use_case_summary="This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal",
)
print(verification_request_egress.id)
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Get Verification Request

Get a single verification request by its ID.

`client.messaging_tollfree.verification.requests.retrieve()` — `GET /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
verification_request_status = client.messaging_tollfree.verification.requests.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(verification_request_status.id)
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Update Verification Request

Update an existing tollfree verification request. This is particularly useful when there are pending customer actions to be taken.

`client.messaging_tollfree.verification.requests.update()` — `PATCH /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `business_name` | string | Yes | Name of the business; there are no specific formatting requi... |
| `corporate_website` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `business_addr1` | string | Yes | Line 1 of the business address |
| `business_city` | string | Yes | The city of the business address; the first letter should be... |
| `business_state` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `business_zip` | string | Yes | The ZIP code of the business address |
| `business_contact_first_name` | string | Yes | First name of the business contact; there are no specific re... |
| `business_contact_last_name` | string | Yes | Last name of the business contact; there are no specific req... |
| `business_contact_email` | string | Yes | The email address of the business contact |
| `business_contact_phone` | string | Yes | The phone number of the business contact in E.164 format |
| `message_volume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `phone_numbers` | array[object] | Yes | The phone numbers to request the verification of |
| `use_case` | object | Yes | Machine-readable use-case for the phone numbers |
| `use_case_summary` | string | Yes | Human-readable summary of the desired use-case |
| `production_message_content` | string | Yes | An example of a message that will be sent from the given pho... |
| `opt_in_workflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `opt_in_workflow_image_ur_ls` | array[object] | Yes | Images showing the opt-in workflow |
| `additional_information` | string | Yes | Any additional information |
| `id` | string (UUID) | Yes |  |
| `business_addr2` | string | No | Line 2 of the business address |
| `isv_reseller` | string | No | ISV name |
| `webhook_url` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in the API Details section below |

```python
verification_request_egress = client.messaging_tollfree.verification.requests.update(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    additional_information="additionalInformation",
    business_addr1="600 Congress Avenue",
    business_city="Austin",
    business_contact_email="email@example.com",
    business_contact_first_name="John",
    business_contact_last_name="Doe",
    business_contact_phone="+18005550100",
    business_name="Telnyx LLC",
    business_state="Texas",
    business_zip="78701",
    corporate_website="http://example.com",
    message_volume="100,000",
    opt_in_workflow="User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
    opt_in_workflow_image_urls=[{
        "url": "https://telnyx.com/sign-up"
    }, {
        "url": "https://telnyx.com/company/data-privacy"
    }],
    phone_numbers=[{
        "phone_number": "+18773554398"
    }, {
        "phone_number": "+18773554399"
    }],
    production_message_content="Your Telnyx OTP is XXXX",
    use_case="2FA",
    use_case_summary="This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal",
)
print(verification_request_egress.id)
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state. * `HTTP 200`: request successfully deleted
* `HTTP 400`: request exists but can't be deleted (i.e. not rejected)
* `HTTP 404`: request unknown or already deleted

`client.messaging_tollfree.verification.requests.delete()` — `DELETE /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
client.messaging_tollfree.verification.requests.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Get Verification Request Status History

Get the history of status changes for a verification request. Returns a paginated list of historical status changes including the reason for each change and when it occurred.

`client.messaging_tollfree.verification.requests.retrieve_status_history()` — `GET /messaging_tollfree/verification/requests/{id}/status_history`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```python
response = client.messaging_tollfree.verification.requests.retrieve_status_history(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    page_number=1,
    page_size=1,
)
print(response.records)
```

Key response fields: `response.data.records, response.data.total_records`

## List messaging URL domains

`client.messaging_url_domains.list()` — `GET /messaging_url_domains`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.messaging_url_domains.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.record_type, response.data.url_domain`

---

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
