---
name: telnyx-messaging-hosted-javascript
description: >-
  Hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging.
metadata:
  author: telnyx
  product: messaging-hosted
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - JavaScript

## Core Workflow

### Prerequisites

1. Host phone numbers on Telnyx by completing the hosted number order process
2. For toll-free: submit toll-free verification request

### Steps

1. **Create hosted number order**: `client.hostedNumberOrders.create({...: ...})`
2. **Upload LOA**: `Provide Letter of Authorization for the numbers`
3. **Monitor status**: `client.hostedNumberOrders.retrieve({id: ...})`

### Common mistakes

- Hosted numbers remain with the original carrier — Telnyx routes messaging only
- Toll-free verification is required before sending A2P traffic on toll-free numbers

**Related skills**: telnyx-messaging-javascript, telnyx-messaging-profiles-javascript

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.hosted_number_orders.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send an RCS message

`client.messages.rcs.send()` — `POST /messages/rcs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS Agent ID |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `messagingProfileId` | string (UUID) | Yes | A valid messaging profile ID |
| `agentMessage` | object | Yes |  |
| `type` | enum (RCS) | No | Message type - must be set to "RCS" |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `smsFallback` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.messages.rcs.send({
  agent_id: 'Agent007',
  agent_message: {},
  messaging_profile_id: '550e8400-e29b-41d4-a716-446655440000',
  to: '+13125551234',
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`client.messages.rcs.generateDeeplink()` — `GET /messages/rcs/deeplinks/{agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS agent ID |
| `phoneNumber` | string (E.164) | No | Phone number in E164 format (URL encoded) |
| `body` | string | No | Pre-filled message body (URL encoded) |

```javascript
const response = await client.messages.rcs.generateDeeplink('agent_id');

console.log(response.data);
```

Key response fields: `response.data.url`

## List all RCS agents

`client.messaging.rcs.agents.list()` — `GET /messaging/rcs/agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const rcsAgent of client.messaging.rcs.agents.list()) {
  console.log(rcsAgent.agent_id);
}
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Retrieve an RCS agent

`client.messaging.rcs.agents.retrieve()` — `GET /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |

```javascript
const rcsAgentResponse = await client.messaging.rcs.agents.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(rcsAgentResponse.data);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Modify an RCS agent

`client.messaging.rcs.agents.update()` — `PATCH /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `webhookUrl` | string (URL) | No | URL to receive RCS events |
| `webhookFailoverUrl` | string (URL) | No | Failover URL to receive RCS events |
| `profileId` | string (UUID) | No | Messaging profile ID associated with the RCS Agent |

```javascript
const rcsAgentResponse = await client.messaging.rcs.agents.update('550e8400-e29b-41d4-a716-446655440000');

console.log(rcsAgentResponse.data);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Check RCS capabilities (batch)

`client.messaging.rcs.listBulkCapabilities()` — `POST /messaging/rcs/bulk_capabilities`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS Agent ID |
| `phoneNumbers` | array[string] | Yes | List of phone numbers to check |

```javascript
const response = await client.messaging.rcs.listBulkCapabilities({
  agent_id: 'TestAgent',
  phone_numbers: ['+13125551234'],
});

console.log(response.data);
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Check RCS capabilities

`client.messaging.rcs.retrieveCapabilities()` — `GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS agent ID |
| `phoneNumber` | string (E.164) | Yes | Phone number in E164 format |

```javascript
const response = await client.messaging.rcs.retrieveCapabilities('phone_number', {
  agent_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response.data);
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`client.messaging.rcs.inviteTestNumber()` — `PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `phoneNumber` | string (E.164) | Yes | Phone number in E164 format to invite for testing |

```javascript
const response = await client.messaging.rcs.inviteTestNumber('phone_number', { id: '550e8400-e29b-41d4-a716-446655440000' });

console.log(response.data);
```

Key response fields: `response.data.status, response.data.phone_number, response.data.agent_id`

## List messaging hosted number orders

`client.messagingHostedNumberOrders.list()` — `GET /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const messagingHostedNumberOrder of client.messagingHostedNumberOrders.list()) {
  console.log(messagingHostedNumberOrder.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Create a messaging hosted number order

`client.messagingHostedNumberOrders.create()` — `POST /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | No | Automatically associate the number with this messaging profi... |
| `phoneNumbers` | array[string] | No | Phone numbers to be used for hosted messaging. |

```javascript
const messagingHostedNumberOrder = await client.messagingHostedNumberOrders.create();

console.log(messagingHostedNumberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Check hosted messaging eligibility

`client.messagingHostedNumberOrders.checkEligibility()` — `POST /messaging_hosted_number_orders/eligibility_numbers_check`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | List of phone numbers to check eligibility |

```javascript
const response = await client.messagingHostedNumberOrders.checkEligibility({
  phone_numbers: ['string'],
});

console.log(response.phone_numbers);
```

Key response fields: `response.data.phone_numbers`

## Retrieve a messaging hosted number order

`client.messagingHostedNumberOrders.retrieve()` — `GET /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const messagingHostedNumberOrder = await client.messagingHostedNumberOrders.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(messagingHostedNumberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`client.messagingHostedNumberOrders.delete()` — `DELETE /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the messaging hosted number order to delete. |

```javascript
const messagingHostedNumberOrder = await client.messagingHostedNumberOrders.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(messagingHostedNumberOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Upload hosted number document

`client.messagingHostedNumberOrders.actions.uploadFile()` — `POST /messaging_hosted_number_orders/{id}/actions/file_upload`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const response = await client.messagingHostedNumberOrders.actions.uploadFile('550e8400-e29b-41d4-a716-446655440000');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order. The verification codes must be created in the verification codes endpoint.

`client.messagingHostedNumberOrders.validateCodes()` — `POST /messaging_hosted_number_orders/{id}/validation_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationCodes` | array[object] | Yes |  |
| `id` | string (UUID) | Yes | Order ID related to the validation codes. |

```javascript
const response = await client.messagingHostedNumberOrders.validateCodes('id', {
  verification_codes: [{ code: 'code', phone_number: 'phone_number' }],
});

console.log(response.data);
```

Key response fields: `response.data.order_id, response.data.phone_numbers`

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order. The verification codes will be sent to the numbers of the hosted order.

`client.messagingHostedNumberOrders.createVerificationCodes()` — `POST /messaging_hosted_number_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |
| `verificationMethod` | enum (sms, call) | Yes |  |
| `id` | string (UUID) | Yes | Order ID to have a verification code created. |

```javascript
const response = await client.messagingHostedNumberOrders.createVerificationCodes('id', {
  phone_numbers: ['string'],
  verification_method: 'sms',
});

console.log(response.data);
```

Key response fields: `response.data.phone_number, response.data.type, response.data.error`

## Delete a messaging hosted number

`client.messagingHostedNumbers.delete()` — `DELETE /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```javascript
const messagingHostedNumber = await client.messagingHostedNumbers.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(messagingHostedNumber.data);
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`client.messagingTollfree.verification.requests.list()` — `GET /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (Verified, Rejected, Waiting For Vendor, Waiting For Customer, Waiting For Telnyx, ...) | No | Tollfree verification status |
| `dateStart` | string (date-time) | No |  |
| `dateEnd` | string (date-time) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const verificationRequestStatus of client.messagingTollfree.verification.requests.list({
  page: 1,
  page_size: 1,
})) {
  console.log(verificationRequestStatus.id);
}
```

Key response fields: `response.data.records, response.data.total_records`

## Submit Verification Request

Submit a new tollfree verification request

`client.messagingTollfree.verification.requests.create()` — `POST /messaging_tollfree/verification/requests`

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
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const verificationRequestEgress = await client.messagingTollfree.verification.requests.create({
  additionalInformation: 'Additional context for this request.',
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

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Get Verification Request

Get a single verification request by its ID.

`client.messagingTollfree.verification.requests.retrieve()` — `GET /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const verificationRequestStatus = await client.messagingTollfree.verification.requests.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(verificationRequestStatus.id);
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Update Verification Request

Update an existing tollfree verification request. This is particularly useful when there are pending customer actions to be taken.

`client.messagingTollfree.verification.requests.update()` — `PATCH /messaging_tollfree/verification/requests/{id}`

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
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const verificationRequestEgress = await client.messagingTollfree.verification.requests.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    additionalInformation: 'Additional context for this request.',
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

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state. * `HTTP 200`: request successfully deleted
* `HTTP 400`: request exists but can't be deleted (i.e. not rejected)
* `HTTP 404`: request unknown or already deleted

`client.messagingTollfree.verification.requests.delete()` — `DELETE /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
await client.messagingTollfree.verification.requests.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Get Verification Request Status History

Get the history of status changes for a verification request. Returns a paginated list of historical status changes including the reason for each change and when it occurred.

`client.messagingTollfree.verification.requests.retrieveStatusHistory()` — `GET /messaging_tollfree/verification/requests/{id}/status_history`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```javascript
const response = await client.messagingTollfree.verification.requests.retrieveStatusHistory(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { 'page[number]': 1, 'page[size]': 1 },
);

console.log(response.records);
```

Key response fields: `response.data.records, response.data.total_records`

## List messaging URL domains

`client.messagingURLDomains.list()` — `GET /messaging_url_domains`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const messagingURLDomainListResponse of client.messagingURLDomains.list()) {
  console.log(messagingURLDomainListResponse.id);
}
```

Key response fields: `response.data.id, response.data.record_type, response.data.url_domain`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
