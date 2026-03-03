---
name: telnyx-messaging-hosted-javascript
description: >-
  Set up hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging features. This skill provides
  JavaScript SDK examples.
metadata:
  author: telnyx
  product: messaging-hosted
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Send an RCS message

`POST /messages/rcs` — Required: `agent_id`, `to`, `messaging_profile_id`, `agent_message`

Optional: `mms_fallback` (object), `sms_fallback` (object), `type` (enum), `webhook_url` (url)

```javascript
const response = await client.messages.rcs.send({
  agent_id: 'Agent007',
  agent_message: {},
  messaging_profile_id: 'messaging_profile_id',
  to: '+13125551234',
});

console.log(response.data);
```

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`GET /messages/rcs/deeplinks/{agent_id}`

```javascript
const response = await client.messages.rcs.generateDeeplink('agent_id');

console.log(response.data);
```

## List all RCS agents

`GET /messaging/rcs/agents`

```javascript
// Automatically fetches more pages as needed.
for await (const rcsAgent of client.messaging.rcs.agents.list()) {
  console.log(rcsAgent.agent_id);
}
```

## Retrieve an RCS agent

`GET /messaging/rcs/agents/{id}`

```javascript
const rcsAgentResponse = await client.messaging.rcs.agents.retrieve('id');

console.log(rcsAgentResponse.data);
```

## Modify an RCS agent

`PATCH /messaging/rcs/agents/{id}`

Optional: `profile_id` (uuid), `webhook_failover_url` (url), `webhook_url` (url)

```javascript
const rcsAgentResponse = await client.messaging.rcs.agents.update('id');

console.log(rcsAgentResponse.data);
```

## Check RCS capabilities (batch)

`POST /messaging/rcs/bulk_capabilities` — Required: `agent_id`, `phone_numbers`

```javascript
const response = await client.messaging.rcs.listBulkCapabilities({
  agent_id: 'TestAgent',
  phone_numbers: ['+13125551234'],
});

console.log(response.data);
```

## Check RCS capabilities

`GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

```javascript
const response = await client.messaging.rcs.retrieveCapabilities('phone_number', {
  agent_id: 'agent_id',
});

console.log(response.data);
```

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

```javascript
const response = await client.messaging.rcs.inviteTestNumber('phone_number', { id: 'id' });

console.log(response.data);
```

## List messaging hosted number orders

`GET /messaging_hosted_number_orders`

```javascript
// Automatically fetches more pages as needed.
for await (const messagingHostedNumberOrder of client.messagingHostedNumberOrders.list()) {
  console.log(messagingHostedNumberOrder.id);
}
```

## Create a messaging hosted number order

`POST /messaging_hosted_number_orders`

Optional: `messaging_profile_id` (string), `phone_numbers` (array[string])

```javascript
const messagingHostedNumberOrder = await client.messagingHostedNumberOrders.create();

console.log(messagingHostedNumberOrder.data);
```

## Check hosted messaging eligibility

`POST /messaging_hosted_number_orders/eligibility_numbers_check` — Required: `phone_numbers`

```javascript
const response = await client.messagingHostedNumberOrders.checkEligibility({
  phone_numbers: ['string'],
});

console.log(response.phone_numbers);
```

## Retrieve a messaging hosted number order

`GET /messaging_hosted_number_orders/{id}`

```javascript
const messagingHostedNumberOrder = await client.messagingHostedNumberOrders.retrieve('id');

console.log(messagingHostedNumberOrder.data);
```

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`DELETE /messaging_hosted_number_orders/{id}`

```javascript
const messagingHostedNumberOrder = await client.messagingHostedNumberOrders.delete('id');

console.log(messagingHostedNumberOrder.data);
```

## Upload hosted number document

`POST /messaging_hosted_number_orders/{id}/actions/file_upload`

```javascript
const response = await client.messagingHostedNumberOrders.actions.uploadFile('id');

console.log(response.data);
```

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/validation_codes` — Required: `verification_codes`

```javascript
const response = await client.messagingHostedNumberOrders.validateCodes('id', {
  verification_codes: [{ code: 'code', phone_number: 'phone_number' }],
});

console.log(response.data);
```

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/verification_codes` — Required: `phone_numbers`, `verification_method`

```javascript
const response = await client.messagingHostedNumberOrders.createVerificationCodes('id', {
  phone_numbers: ['string'],
  verification_method: 'sms',
});

console.log(response.data);
```

## Delete a messaging hosted number

`DELETE /messaging_hosted_numbers/{id}`

```javascript
const messagingHostedNumber = await client.messagingHostedNumbers.delete('id');

console.log(messagingHostedNumber.data);
```

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`GET /messaging_tollfree/verification/requests`

```javascript
// Automatically fetches more pages as needed.
for await (const verificationRequestStatus of client.messagingTollfree.verification.requests.list({
  page: 1,
  page_size: 1,
})) {
  console.log(verificationRequestStatus.id);
}
```

## Submit Verification Request

Submit a new tollfree verification request

`POST /messaging_tollfree/verification/requests` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

```javascript
const verificationRequestEgress = await client.messagingTollfree.verification.requests.create({
  additionalInformation: 'additionalInformation',
  businessAddr1: '600 Congress Avenue',
  businessCity: 'Austin',
  businessContactEmail: 'email@example.com',
  businessContactFirstName: 'John',
  businessContactLastName: 'Doe',
  businessContactPhone: '+18005550100',
  businessName: 'Telnyx LLC',
  businessState: 'Texas',
  businessZip: '78701',
  corporateWebsite: 'http://example.com',
  messageVolume: '100,000',
  optInWorkflow:
    "User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
  optInWorkflowImageURLs: [
    { url: 'https://telnyx.com/sign-up' },
    { url: 'https://telnyx.com/company/data-privacy' },
  ],
  phoneNumbers: [{ phoneNumber: '+18773554398' }, { phoneNumber: '+18773554399' }],
  productionMessageContent: 'Your Telnyx OTP is XXXX',
  useCase: '2FA',
  useCaseSummary:
    'This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal',
});

console.log(verificationRequestEgress.id);
```

## Get Verification Request

Get a single verification request by its ID.

`GET /messaging_tollfree/verification/requests/{id}`

```javascript
const verificationRequestStatus = await client.messagingTollfree.verification.requests.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(verificationRequestStatus.id);
```

## Update Verification Request

Update an existing tollfree verification request.

`PATCH /messaging_tollfree/verification/requests/{id}` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

```javascript
const verificationRequestEgress = await client.messagingTollfree.verification.requests.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    additionalInformation: 'additionalInformation',
    businessAddr1: '600 Congress Avenue',
    businessCity: 'Austin',
    businessContactEmail: 'email@example.com',
    businessContactFirstName: 'John',
    businessContactLastName: 'Doe',
    businessContactPhone: '+18005550100',
    businessName: 'Telnyx LLC',
    businessState: 'Texas',
    businessZip: '78701',
    corporateWebsite: 'http://example.com',
    messageVolume: '100,000',
    optInWorkflow:
      "User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset",
    optInWorkflowImageURLs: [
      { url: 'https://telnyx.com/sign-up' },
      { url: 'https://telnyx.com/company/data-privacy' },
    ],
    phoneNumbers: [{ phoneNumber: '+18773554398' }, { phoneNumber: '+18773554399' }],
    productionMessageContent: 'Your Telnyx OTP is XXXX',
    useCase: '2FA',
    useCaseSummary:
      'This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal',
  },
);

console.log(verificationRequestEgress.id);
```

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state.

`DELETE /messaging_tollfree/verification/requests/{id}`

```javascript
await client.messagingTollfree.verification.requests.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Get Verification Request Status History

Get the history of status changes for a verification request.

`GET /messaging_tollfree/verification/requests/{id}/status_history`

```javascript
const response = await client.messagingTollfree.verification.requests.retrieveStatusHistory(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { 'page[number]': 1, 'page[size]': 1 },
);

console.log(response.records);
```

## List messaging URL domains

`GET /messaging_url_domains`

```javascript
// Automatically fetches more pages as needed.
for await (const messagingURLDomainListResponse of client.messagingURLDomains.list()) {
  console.log(messagingURLDomainListResponse.id);
}
```
