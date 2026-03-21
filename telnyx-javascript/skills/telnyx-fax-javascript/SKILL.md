---
name: telnyx-fax-javascript
description: >-
  Send and receive faxes programmatically. Manage fax apps and media.
metadata:
  author: telnyx
  product: fax
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Fax - JavaScript

## Core Workflow

### Prerequisites

1. Buy or port a phone number with fax capability (see telnyx-numbers-javascript)
2. Create a Fax Application with webhook URLs for inbound fax events
3. Assign the phone number to the Fax Application

### Steps

1. **Send fax**: `client.faxes.create({connectionId: ..., to: ..., from: ..., mediaUrl: ...})`
2. **Check status**: `client.faxes.retrieve({id: ...})`
3. **Receive inbound fax**: `Handle fax.received webhook — media_url in payload`

### Common mistakes

- media_url must be a publicly accessible URL to a PDF or TIFF file
- Fax delivery is not instant — monitor status via webhooks or polling

**Related skills**: telnyx-numbers-javascript

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
  const result = await client.faxes.create(params);
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

## Send a fax

Send a fax. Files have size limits and page count limit validations. If a file is bigger than 50MB or has more than 350 pages it will fail with `file_size_limit_exceeded` and `page_count_limit_exceeded` respectively.

`client.faxes.create()` — `POST /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | The connection ID to send the fax with. |
| `to` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent to o... |
| `from` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent from... |
| `webhookUrl` | string (URL) | No | Use this field to override the URL to which Telnyx will send... |
| `clientState` | string | No | Use this field to add state to every subsequent webhook. |
| `quality` | enum (normal, high, very_high, ultra_light, ultra_dark) | No | The quality of the fax. |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const fax = await client.faxes.create({
  connection_id: '234423',
  from: '+13125790015',
  to: '+13127367276',
    mediaUrl: 'https://example.com/document.pdf',
});

console.log(fax.data);
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## View a fax

`client.faxes.retrieve()` — `GET /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```javascript
const fax = await client.faxes.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(fax.data);
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a fax

`client.faxes.delete()` — `DELETE /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```javascript
await client.faxes.delete('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## List all Fax Applications

This endpoint returns a list of your Fax Applications inside the 'data' attribute of the response. You can adjust which applications are listed by using filters. Fax Applications are used to configure how you send and receive faxes using the Programmable Fax API with Telnyx.

`client.faxApplications.list()` — `GET /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, application_name, active) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const faxApplication of client.faxApplications.list()) {
  console.log(faxApplication.id);
}
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates a Fax Application

Creates a new Fax Application based on the parameters sent in the request. The application name and webhook URL are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.faxApplications.create()` — `POST /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationName` | string | Yes | A user-assigned name to help manage the application. |
| `webhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `tags` | array[string] | No | Tags associated with the Fax Application. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const faxApplication = await client.faxApplications.create({
  application_name: 'fax-router',
  webhook_event_url: 'https://example.com',
});

console.log(faxApplication.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Fax Application

Return the details of an existing Fax Application inside the 'data' attribute of the response.

`client.faxApplications.retrieve()` — `GET /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const faxApplication = await client.faxApplications.retrieve('1293384261075731499');

console.log(faxApplication.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Fax Application

Updates settings of an existing Fax Application based on the parameters of the request.

`client.faxApplications.update()` — `PATCH /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationName` | string | Yes | A user-assigned name to help manage the application. |
| `webhookEventUrl` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the Fax Application. |
| `anchorsiteOverride` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const faxApplication = await client.faxApplications.update('1293384261075731499', {
  application_name: 'fax-router',
  webhook_event_url: 'https://example.com',
});

console.log(faxApplication.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes a Fax Application

Permanently deletes a Fax Application. Deletion may be prevented if the application is in use by phone numbers.

`client.faxApplications.delete()` — `DELETE /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const faxApplication = await client.faxApplications.delete('1293384261075731499');

console.log(faxApplication.data);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a list of faxes

`client.faxes.list()` — `GET /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const fax of client.faxes.list()) {
  console.log(fax.id);
}
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Cancel a fax

Cancel the outbound fax that is in one of the following states: `queued`, `media.processed`, `originated` or `sending`

`client.faxes.actions.cancel()` — `POST /faxes/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```javascript
const response = await client.faxes.actions.cancel('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.data);
```

Key response fields: `response.data.result`

## Refresh a fax

Refreshes the inbound fax's media_url when it has expired

`client.faxes.actions.refresh()` — `POST /faxes/{id}/actions/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```javascript
const response = await client.faxes.actions.refresh('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.data);
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```javascript
// In your webhook handler (e.g., Express — use raw body, not parsed JSON):
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body.toString(), {
      headers: req.headers,
    });
    // Signature valid — event is the parsed webhook payload
    console.log('Received event:', event.data.event_type);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `fax.delivered` | `fax.delivered` | Fax Delivered |
| `fax.failed` | `fax.failed` | Fax Failed |
| `fax.media.processed` | `fax.media.processed` | Fax Media Processed |
| `fax.queued` | `fax.queued` | Fax Queued |
| `fax.sending.started` | `fax.sending.started` | Fax Sending Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
