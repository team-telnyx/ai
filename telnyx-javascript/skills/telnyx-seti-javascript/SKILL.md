---
name: telnyx-seti-javascript
description: >-
  Access SETI (Space Exploration Telecommunications Infrastructure) APIs. This
  skill provides JavaScript SDK examples.
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
