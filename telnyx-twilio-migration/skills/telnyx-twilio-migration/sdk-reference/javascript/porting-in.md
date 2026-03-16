<!-- SDK reference: telnyx-porting-in-javascript -->

# Telnyx Porting In - JavaScript

## Core Workflow

### Prerequisites

1. Run portability check on all numbers before creating a port order
2. Have Letter of Authorization (LOA) and recent invoice from current carrier ready
3. Pre-create connection_id and/or messaging_profile_id to assign during fulfillment

### Steps

1. **Check portability**: `client.porting.portabilityChecks.create({phoneNumbers: [...]})`
2. **Create draft order**: `client.porting.orders.create({phoneNumbers: [...]})`
3. **Fulfill each split order**: `Upload LOA, invoice, end-user info, service address`
4. **Submit order**: `Transitions from draft to in-process`
5. **Monitor via webhooks**: `porting_order.status_changed, porting_order.new_comment`

### Common mistakes

- NEVER skip portability check — non-portable numbers cause downstream failures
- NEVER treat auto-split orders as a single entity — each split requires independent completion
- NEVER assume requested FOC date is guaranteed — the losing carrier determines the actual date
- ALWAYS monitor for Porting Operations comments — unanswered info requests kill the port

**Related skills**: telnyx-numbers-javascript, telnyx-numbers-config-javascript, telnyx-voice-javascript, telnyx-messaging-javascript

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
  const result = await client.porting.orders.create(params);
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Run a portability check

Runs a portability check, returning the results immediately.

`client.portabilityChecks.run()` — `POST /portability_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | No | The list of +E.164 formatted phone numbers to check for port... |

```javascript
const response = await client.portabilityChecks.run({
    phoneNumbers: ["+18005550101"],
});

console.log(response.data);
```

Key response fields: `response.data.phone_number, response.data.fast_portable, response.data.not_portable_reason`

## Create a porting order

Creates a new porting order object.

`client.portingOrders.create()` — `POST /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | The list of +E.164 formatted phone numbers |
| `customerReference` | string | No | A customer-specified reference number for customer bookkeepi... |
| `customerGroupReference` | string | No | A customer-specified group reference for customer bookkeepin... |

```javascript
const portingOrder = await client.portingOrders.create({
  phone_numbers: ['+13035550000', '+13035550001', '+13035550002'],
});

console.log(portingOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting order

Retrieves the details of an existing porting order.

`client.portingOrders.retrieve()` — `GET /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `includePhoneNumbers` | boolean | No | Include the first 50 phone number objects in the results |

```javascript
const portingOrder = await client.portingOrders.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(portingOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a porting order.

Confirm and submit your porting order.

`client.portingOrders.actions.confirm()` — `POST /porting_orders/{id}/actions/confirm`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.actions.confirm('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all porting events

Returns a list of all porting events.

`client.porting.events.list()` — `GET /porting/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const eventListResponse of client.porting.events.list()) {
  console.log(eventListResponse);
}
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Show a porting event

Show a specific porting event.

`client.porting.events.retrieve()` — `GET /porting/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the porting event. |

```javascript
const event = await client.porting.events.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(event.data);
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Republish a porting event

Republish a specific porting event.

`client.porting.events.republish()` — `POST /porting/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the porting event. |

```javascript
await client.porting.events.republish('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`client.porting.loaConfigurations.preview0()` — `POST /porting/loa_configuration/preview`

```javascript
const response = await client.porting.loaConfigurations.preview0({
  address: {
    city: 'Austin',
    country_code: 'US',
    state: 'TX',
    street_address: '600 Congress Avenue',
    zip_code: '78701',
  },
  company_name: 'Telnyx',
  contact: { email: 'testing@telnyx.com', phone_number: '+12003270001' },
  logo: { document_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
  name: 'My LOA Configuration',
});

console.log(response);

const content = await response.blob();
console.log(content);
```

## List LOA configurations

List the LOA configurations.

`client.porting.loaConfigurations.list()` — `GET /porting/loa_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingLoaConfiguration of client.porting.loaConfigurations.list()) {
  console.log(portingLoaConfiguration.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a LOA configuration

Create a LOA configuration.

`client.porting.loaConfigurations.create()` — `POST /porting/loa_configurations`

```javascript
const loaConfiguration = await client.porting.loaConfigurations.create({
  address: {
    city: 'Austin',
    country_code: 'US',
    state: 'TX',
    street_address: '600 Congress Avenue',
    zip_code: '78701',
  },
  company_name: 'Telnyx',
  contact: { email: 'testing@telnyx.com', phone_number: '+12003270001' },
  logo: { document_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
  name: 'My LOA Configuration',
});

console.log(loaConfiguration.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`client.porting.loaConfigurations.retrieve()` — `GET /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```javascript
const loaConfiguration = await client.porting.loaConfigurations.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(loaConfiguration.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a LOA configuration

Update a specific LOA configuration.

`client.porting.loaConfigurations.update()` — `PATCH /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```javascript
const loaConfiguration = await client.porting.loaConfigurations.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    address: {
      city: 'Austin',
      country_code: 'US',
      state: 'TX',
      street_address: '600 Congress Avenue',
      zip_code: '78701',
    },
    company_name: 'Telnyx',
    contact: { email: 'testing@telnyx.com', phone_number: '+12003270001' },
    logo: { document_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
    name: 'My LOA Configuration',
  },
);

console.log(loaConfiguration.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a LOA configuration

Delete a specific LOA configuration.

`client.porting.loaConfigurations.delete()` — `DELETE /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```javascript
await client.porting.loaConfigurations.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`client.porting.loaConfigurations.preview1()` — `GET /porting/loa_configurations/{id}/preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```javascript
const response = await client.porting.loaConfigurations.preview1(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response);

const content = await response.blob();
console.log(content);
```

## List porting related reports

List the reports generated about porting operations.

`client.porting.reports.list()` — `GET /porting/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingReport of client.porting.reports.list()) {
  console.log(portingReport.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a porting related report

Generate reports about porting operations.

`client.porting.reports.create()` — `POST /porting/reports`

```javascript
const report = await client.porting.reports.create({
  params: { filters: {} },
  report_type: 'export_porting_orders_csv',
});

console.log(report.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.porting.reports.retrieve()` — `GET /porting/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a report. |

```javascript
const report = await client.porting.reports.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(report.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List available carriers in the UK

List available carriers in the UK.

`client.porting.listUkCarriers()` — `GET /porting/uk_carriers`

```javascript
const response = await client.porting.listUkCarriers();

console.log(response.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all porting orders

Returns a list of your porting order.

`client.portingOrders.list()` — `GET /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `includePhoneNumbers` | boolean | No | Include the first 50 phone number objects in the results |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| ... | | | +1 optional params in the API Details section below |

```javascript
// Automatically fetches more pages as needed.
for await (const portingOrder of client.portingOrders.list()) {
  console.log(portingOrder.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all exception types

Returns a list of all possible exception types for a porting order.

`client.portingOrders.retrieveExceptionTypes()` — `GET /porting_orders/exception_types`

```javascript
const response = await client.portingOrders.retrieveExceptionTypes();

console.log(response.data);
```

Key response fields: `response.data.code, response.data.description`

## List all phone number configurations

Returns a list of phone number configurations paginated.

`client.portingOrders.phoneNumberConfigurations.list()` — `GET /porting_orders/phone_number_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const phoneNumberConfigurationListResponse of client.portingOrders.phoneNumberConfigurations.list()) {
  console.log(phoneNumberConfigurationListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of phone number configurations

Creates a list of phone number configurations.

`client.portingOrders.phoneNumberConfigurations.create()` — `POST /porting_orders/phone_number_configurations`

```javascript
const phoneNumberConfiguration = await client.portingOrders.phoneNumberConfigurations.create();

console.log(phoneNumberConfiguration.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Edit a porting order

Edits the details of an existing porting order. Any or all of a porting orders attributes may be included in the resource object included in a PATCH request. If a request does not include all of the attributes for a resource, the system will interpret the missing attributes as if they were included with their current values.

`client.portingOrders.update()` — `PATCH /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `webhookUrl` | string (URL) | No |  |
| `requirementGroupId` | string (UUID) | No | If present, we will read the current values from the specifi... |
| `misc` | object | No |  |
| ... | | | +9 optional params in the API Details section below |

```javascript
const portingOrder = await client.portingOrders.update('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(portingOrder.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a porting order

Deletes an existing porting order. This operation is restrict to porting orders in draft state.

`client.portingOrders.delete()` — `DELETE /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
await client.portingOrders.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously. This operation is limited to US FastPort orders only.

`client.portingOrders.actions.activate()` — `POST /porting_orders/{id}/actions/activate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.actions.activate(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a porting order

`client.portingOrders.actions.cancel()` — `POST /porting_orders/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.actions.cancel('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Share a porting order

Creates a sharing token for a porting order. The token can be used to share the porting order with non-Telnyx users.

`client.portingOrders.actions.share()` — `POST /porting_orders/{id}/actions/share`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.actions.share('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.expires_at`

## List all porting activation jobs

Returns a list of your porting activation jobs.

`client.portingOrders.activationJobs.list()` — `GET /porting_orders/{id}/activation_jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingOrdersActivationJob of client.portingOrders.activationJobs.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(portingOrdersActivationJob.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting activation job

Returns a porting activation job.

`client.portingOrders.activationJobs.retrieve()` — `GET /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `activationJobId` | string (UUID) | Yes | Activation Job Identifier |

```javascript
const activationJob = await client.portingOrders.activationJobs.retrieve(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(activationJob.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a porting activation job

Updates the activation time of a porting activation job.

`client.portingOrders.activationJobs.update()` — `PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `activationJobId` | string (UUID) | Yes | Activation Job Identifier |

```javascript
const activationJob = await client.portingOrders.activationJobs.update(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(activationJob.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List additional documents

Returns a list of additional documents for a porting order.

`client.portingOrders.additionalDocuments.list()` — `GET /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const additionalDocumentListResponse of client.portingOrders.additionalDocuments.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(additionalDocumentListResponse.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`client.portingOrders.additionalDocuments.create()` — `POST /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const additionalDocument = await client.portingOrders.additionalDocuments.create(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(additionalDocument.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an additional document

Deletes an additional document for a porting order.

`client.portingOrders.additionalDocuments.delete()` — `DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `additionalDocumentId` | string (UUID) | Yes | Additional document identification. |

```javascript
await client.portingOrders.additionalDocuments.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`client.portingOrders.retrieveAllowedFocWindows()` — `GET /porting_orders/{id}/allowed_foc_windows`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.retrieveAllowedFocWindows(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.ended_at, response.data.record_type, response.data.started_at`

## List all comments of a porting order

Returns a list of all comments of a porting order.

`client.portingOrders.comments.list()` — `GET /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const commentListResponse of client.portingOrders.comments.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(commentListResponse.id);
}
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment for a porting order

Creates a new comment for a porting order.

`client.portingOrders.comments.create()` — `POST /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `body` | string | No |  |

```javascript
const comment = await client.portingOrders.comments.create('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(comment.data);
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Download a porting order loa template

`client.portingOrders.retrieveLoaTemplate()` — `GET /porting_orders/{id}/loa_template`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `loaConfigurationId` | string (UUID) | No | The identifier of the LOA configuration to use for the templ... |

```javascript
const response = await client.portingOrders.retrieveLoaTemplate(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response);

const content = await response.blob();
console.log(content);
```

## List porting order requirements

Returns a list of all requirements based on country/number type for this porting order.

`client.portingOrders.retrieveRequirements()` — `GET /porting_orders/{id}/requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingOrderRetrieveRequirementsResponse of client.portingOrders.retrieveRequirements(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(portingOrderRetrieveRequirementsResponse.field_type);
}
```

Key response fields: `response.data.field_type, response.data.field_value, response.data.record_type`

## Retrieve the associated V1 sub_request_id and port_request_id

`client.portingOrders.retrieveSubRequest()` — `GET /porting_orders/{id}/sub_request`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.retrieveSubRequest(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.port_request_id, response.data.sub_request_id`

## List verification codes

Returns a list of verification codes for a porting order.

`client.portingOrders.verificationCodes.list()` — `GET /porting_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const verificationCodeListResponse of client.portingOrders.verificationCodes.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(verificationCodeListResponse.id);
}
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Send the verification codes

Send the verification code for all porting phone numbers.

`client.portingOrders.verificationCodes.send()` — `POST /porting_orders/{id}/verification_codes/send`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
await client.portingOrders.verificationCodes.send('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`client.portingOrders.verificationCodes.verify()` — `POST /porting_orders/{id}/verification_codes/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```javascript
const response = await client.portingOrders.verificationCodes.verify(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(response.data);
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`client.portingOrders.actionRequirements.list()` — `GET /porting_orders/{porting_order_id}/action_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | The ID of the porting order |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const actionRequirementListResponse of client.portingOrders.actionRequirements.list(
  'porting_order_id',
)) {
  console.log(actionRequirementListResponse.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`client.portingOrders.actionRequirements.initiate()` — `POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | The ID of the porting order |
| `id` | string (UUID) | Yes | The ID of the action requirement |

```javascript
const response = await client.portingOrders.actionRequirements.initiate('id', {
  porting_order_id: '550e8400-e29b-41d4-a716-446655440000',
  params: { first_name: 'John', last_name: 'Doe' },
});

console.log(response.data);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order. Associated phone numbers are used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.portingOrders.associatedPhoneNumbers.list()` — `GET /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingAssociatedPhoneNumber of client.portingOrders.associatedPhoneNumbers.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(portingAssociatedPhoneNumber.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an associated phone number

Creates a new associated phone number for a porting order. This is used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.portingOrders.associatedPhoneNumbers.create()` — `POST /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```javascript
const associatedPhoneNumber = await client.portingOrders.associatedPhoneNumbers.create(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    action: 'keep',
    phone_number_range: {},
  },
);

console.log(associatedPhoneNumber.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`client.portingOrders.associatedPhoneNumbers.delete()` — `DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the associated phone number to be deleted |

```javascript
const associatedPhoneNumber = await client.portingOrders.associatedPhoneNumbers.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { porting_order_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(associatedPhoneNumber.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`client.portingOrders.phoneNumberBlocks.list()` — `GET /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingPhoneNumberBlock of client.portingOrders.phoneNumberBlocks.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(portingPhoneNumberBlock.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number block

Creates a new phone number block.

`client.portingOrders.phoneNumberBlocks.create()` — `POST /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```javascript
const phoneNumberBlock = await client.portingOrders.phoneNumberBlocks.create(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    activation_ranges: [{ end_at: '+4930244999910', start_at: '+4930244999901' }],
    phone_number_range: { end_at: '+4930244999910', start_at: '+4930244999901' },
  },
);

console.log(phoneNumberBlock.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number block

Deletes a phone number block.

`client.portingOrders.phoneNumberBlocks.delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the phone number block to be deleted |

```javascript
const phoneNumberBlock = await client.portingOrders.phoneNumberBlocks.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { porting_order_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(phoneNumberBlock.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`client.portingOrders.phoneNumberExtensions.list()` — `GET /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingPhoneNumberExtension of client.portingOrders.phoneNumberExtensions.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(portingPhoneNumberExtension.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number extension

Creates a new phone number extension.

`client.portingOrders.phoneNumberExtensions.create()` — `POST /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```javascript
const phoneNumberExtension = await client.portingOrders.phoneNumberExtensions.create(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    activation_ranges: [{ end_at: 10, start_at: 1 }],
    extension_range: { end_at: 10, start_at: 1 },
    porting_phone_number_id: 'f24151b6-3389-41d3-8747-7dd8c681e5e2',
  },
);

console.log(phoneNumberExtension.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number extension

Deletes a phone number extension.

`client.portingOrders.phoneNumberExtensions.delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portingOrderId` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the phone number extension to be deleted |

```javascript
const phoneNumberExtension = await client.portingOrders.phoneNumberExtensions.delete(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { porting_order_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(phoneNumberExtension.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all porting phone numbers

Returns a list of your porting phone numbers.

`client.portingPhoneNumbers.list()` — `GET /porting_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const portingPhoneNumberListResponse of client.portingPhoneNumbers.list()) {
  console.log(portingPhoneNumberListResponse.porting_order_id);
}
```

Key response fields: `response.data.phone_number, response.data.activation_status, response.data.phone_number_type`

---

# Porting In (JavaScript) — API Details

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

### Run a portability check — `client.portabilityChecks.run()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `phoneNumbers` | array[string] | The list of +E.164 formatted phone numbers to check for portability |

### Create a porting order — `client.portingOrders.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerReference` | string | A customer-specified reference number for customer bookkeeping purposes |
| `customerGroupReference` | string | A customer-specified group reference for customer bookkeeping purposes |

### Edit a porting order — `client.portingOrders.update()`

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

### Create a comment for a porting order — `client.portingOrders.comments.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `body` | string |  |
