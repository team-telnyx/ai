---
name: telnyx-messaging-hosted-python
description: >-
  Set up hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging features. This skill provides
  Python SDK examples.
metadata:
  author: telnyx
  product: messaging-hosted
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - Python

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

## Send an RCS message

`POST /messages/rcs` — Required: `agent_id`, `to`, `messaging_profile_id`, `agent_message`

Optional: `mms_fallback` (object), `sms_fallback` (object), `type` (enum), `webhook_url` (url)

```python
response = client.messages.rcs.send(
    agent_id="Agent007",
    agent_message={},
    messaging_profile_id="messaging_profile_id",
    to="+13125551234",
)
print(response.data)
```

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`GET /messages/rcs/deeplinks/{agent_id}`

```python
response = client.messages.rcs.generate_deeplink(
    agent_id="agent_id",
)
print(response.data)
```

## List all RCS agents

`GET /messaging/rcs/agents`

```python
page = client.messaging.rcs.agents.list()
page = page.data[0]
print(page.agent_id)
```

## Retrieve an RCS agent

`GET /messaging/rcs/agents/{id}`

```python
rcs_agent_response = client.messaging.rcs.agents.retrieve(
    "id",
)
print(rcs_agent_response.data)
```

## Modify an RCS agent

`PATCH /messaging/rcs/agents/{id}`

Optional: `profile_id` (uuid), `webhook_failover_url` (url), `webhook_url` (url)

```python
rcs_agent_response = client.messaging.rcs.agents.update(
    id="id",
)
print(rcs_agent_response.data)
```

## Check RCS capabilities (batch)

`POST /messaging/rcs/bulk_capabilities` — Required: `agent_id`, `phone_numbers`

```python
response = client.messaging.rcs.list_bulk_capabilities(
    agent_id="TestAgent",
    phone_numbers=["+13125551234"],
)
print(response.data)
```

## Check RCS capabilities

`GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

```python
response = client.messaging.rcs.retrieve_capabilities(
    phone_number="phone_number",
    agent_id="agent_id",
)
print(response.data)
```

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

```python
response = client.messaging.rcs.invite_test_number(
    phone_number="phone_number",
    id="id",
)
print(response.data)
```

## List messaging hosted number orders

`GET /messaging_hosted_number_orders`

```python
page = client.messaging_hosted_number_orders.list()
page = page.data[0]
print(page.id)
```

## Create a messaging hosted number order

`POST /messaging_hosted_number_orders`

Optional: `messaging_profile_id` (string), `phone_numbers` (array[string])

```python
messaging_hosted_number_order = client.messaging_hosted_number_orders.create()
print(messaging_hosted_number_order.data)
```

## Check hosted messaging eligibility

`POST /messaging_hosted_number_orders/eligibility_numbers_check` — Required: `phone_numbers`

```python
response = client.messaging_hosted_number_orders.check_eligibility(
    phone_numbers=["string"],
)
print(response.phone_numbers)
```

## Retrieve a messaging hosted number order

`GET /messaging_hosted_number_orders/{id}`

```python
messaging_hosted_number_order = client.messaging_hosted_number_orders.retrieve(
    "id",
)
print(messaging_hosted_number_order.data)
```

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`DELETE /messaging_hosted_number_orders/{id}`

```python
messaging_hosted_number_order = client.messaging_hosted_number_orders.delete(
    "id",
)
print(messaging_hosted_number_order.data)
```

## Upload hosted number document

`POST /messaging_hosted_number_orders/{id}/actions/file_upload`

```python
response = client.messaging_hosted_number_orders.actions.upload_file(
    id="id",
)
print(response.data)
```

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/validation_codes` — Required: `verification_codes`

```python
response = client.messaging_hosted_number_orders.validate_codes(
    id="id",
    verification_codes=[{
        "code": "code",
        "phone_number": "phone_number",
    }],
)
print(response.data)
```

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/verification_codes` — Required: `phone_numbers`, `verification_method`

```python
response = client.messaging_hosted_number_orders.create_verification_codes(
    id="id",
    phone_numbers=["string"],
    verification_method="sms",
)
print(response.data)
```

## Delete a messaging hosted number

`DELETE /messaging_hosted_numbers/{id}`

```python
messaging_hosted_number = client.messaging_hosted_numbers.delete(
    "id",
)
print(messaging_hosted_number.data)
```

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`GET /messaging_tollfree/verification/requests`

```python
page = client.messaging_tollfree.verification.requests.list(
    page=1,
    page_size=1,
)
page = page.records[0]
print(page.id)
```

## Submit Verification Request

Submit a new tollfree verification request

`POST /messaging_tollfree/verification/requests` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

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

## Get Verification Request

Get a single verification request by its ID.

`GET /messaging_tollfree/verification/requests/{id}`

```python
verification_request_status = client.messaging_tollfree.verification.requests.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(verification_request_status.id)
```

## Update Verification Request

Update an existing tollfree verification request.

`PATCH /messaging_tollfree/verification/requests/{id}` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

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

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state.

`DELETE /messaging_tollfree/verification/requests/{id}`

```python
client.messaging_tollfree.verification.requests.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Get Verification Request Status History

Get the history of status changes for a verification request.

`GET /messaging_tollfree/verification/requests/{id}/status_history`

```python
response = client.messaging_tollfree.verification.requests.retrieve_status_history(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    page_number=1,
    page_size=1,
)
print(response.records)
```

## List messaging URL domains

`GET /messaging_url_domains`

```python
page = client.messaging_url_domains.list()
page = page.data[0]
print(page.id)
```
