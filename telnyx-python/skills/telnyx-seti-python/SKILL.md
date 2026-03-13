---
name: telnyx-seti-python
description: >-
  Access SETI (Space Exploration Telecommunications Infrastructure) APIs. This
  skill provides Python SDK examples.
metadata:
  internal: true
  author: telnyx
  product: seti
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Seti - Python

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
    result = client.messages.send(to="+13125550001", from_="+13125550002", text="Hello")
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

## Get Enum

`GET /10dlc/enum/{endpoint}`

```python
response = client.messaging_10dlc.get_enum(
    "mno",
)
print(response)
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`GET /seti/black_box_test_results`

```python
response = client.seti.retrieve_black_box_test_results()
print(response.data)
```

Returns: `black_box_tests` (array[object]), `product` (string), `record_type` (string)
