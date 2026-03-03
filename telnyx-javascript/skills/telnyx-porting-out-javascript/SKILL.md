---
name: telnyx-porting-out-javascript
description: >-
  Manage port-out requests when numbers are being ported away from Telnyx. List,
  view, and update port-out status. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: porting-out
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting Out - JavaScript

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

## List portout requests

Returns the portout requests according to filters

`GET /portouts`

```javascript
// Automatically fetches more pages as needed.
for await (const portoutDetails of client.portouts.list()) {
  console.log(portoutDetails.id);
}
```

## List all port-out events

Returns a list of all port-out events.

`GET /portouts/events`

```javascript
// Automatically fetches more pages as needed.
for await (const eventListResponse of client.portouts.events.list()) {
  console.log(eventListResponse);
}
```

## Show a port-out event

Show a specific port-out event.

`GET /portouts/events/{id}`

```javascript
const event = await client.portouts.events.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(event.data);
```

## Republish a port-out event

Republish a specific port-out event.

`POST /portouts/events/{id}/republish`

```javascript
await client.portouts.events.republish('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`GET /portouts/rejections/{portout_id}`

```javascript
const response = await client.portouts.listRejectionCodes('329d6658-8f93-405d-862f-648776e8afd7');

console.log(response.data);
```

## List port-out related reports

List the reports generated about port-out operations.

`GET /portouts/reports`

```javascript
// Automatically fetches more pages as needed.
for await (const portoutReport of client.portouts.reports.list()) {
  console.log(portoutReport.id);
}
```

## Create a port-out related report

Generate reports about port-out operations.

`POST /portouts/reports`

```javascript
const report = await client.portouts.reports.create({
  params: { filters: {} },
  report_type: 'export_portouts_csv',
});

console.log(report.data);
```

## Retrieve a report

Retrieve a specific report generated.

`GET /portouts/reports/{id}`

```javascript
const report = await client.portouts.reports.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(report.data);
```

## Get a portout request

Returns the portout request based on the ID provided

`GET /portouts/{id}`

```javascript
const portout = await client.portouts.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(portout.data);
```

## List all comments for a portout request

Returns a list of comments for a portout request.

`GET /portouts/{id}/comments`

```javascript
const comments = await client.portouts.comments.list('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(comments.data);
```

## Create a comment on a portout request

Creates a comment on a portout request.

`POST /portouts/{id}/comments`

Optional: `body` (string)

```javascript
const comment = await client.portouts.comments.create('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(comment.data);
```

## List supporting documents on a portout request

List every supporting documents for a portout request.

`GET /portouts/{id}/supporting_documents`

```javascript
const supportingDocuments = await client.portouts.supportingDocuments.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(supportingDocuments.data);
```

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`POST /portouts/{id}/supporting_documents`

Optional: `documents` (array[object])

```javascript
const supportingDocument = await client.portouts.supportingDocuments.create(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
);

console.log(supportingDocument.data);
```

## Update Status

Authorize or reject portout request

`PATCH /portouts/{id}/{status}` — Required: `reason`

Optional: `host_messaging` (boolean)

```javascript
const response = await client.portouts.updateStatus('authorized', {
  id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  reason: 'I do not recognize this transaction',
});

console.log(response.data);
```
