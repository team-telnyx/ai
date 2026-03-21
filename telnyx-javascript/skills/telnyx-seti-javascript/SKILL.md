---
name: telnyx-seti-javascript
description: >-
  SETI (Space Exploration Telecommunications Infrastructure) APIs.
metadata:
  author: telnyx
  product: seti
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Seti - JavaScript

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
  const result = await client.messages.send({ to: '+13125550001', from: '+13125550002', text: 'Hello' });
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Get Enum

`client.messaging10dlc.getEnum()` — `GET /10dlc/enum/{endpoint}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endpoint` | enum (mno, optionalAttributes, usecase, vertical, altBusinessIdType, ...) | Yes |  |

```javascript
const response = await client.messaging10dlc.getEnum('mno');

console.log(response);
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`client.seti.retrieveBlackBoxTestResults()` — `GET /seti/black_box_test_results`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
const response = await client.seti.retrieveBlackBoxTestResults();

console.log(response.data);
```

Key response fields: `response.data.black_box_tests, response.data.product, response.data.record_type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
