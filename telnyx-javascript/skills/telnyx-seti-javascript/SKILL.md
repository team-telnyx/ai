---
name: telnyx-seti-javascript
description: >-
  Access SETI (Space Exploration Telecommunications Infrastructure) APIs. This
  skill provides JavaScript SDK examples.
metadata:
  internal: true
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

## Get Enum

`GET /10dlc/enum/{endpoint}`

```javascript
const response = await client.messaging10dlc.getEnum('mno');

console.log(response);
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`GET /seti/black_box_test_results`

```javascript
const response = await client.seti.retrieveBlackBoxTestResults();

console.log(response.data);
```

Returns: `black_box_tests` (array[object]), `product` (string), `record_type` (string)
