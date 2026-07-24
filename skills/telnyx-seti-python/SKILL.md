---
name: telnyx-seti-python
description: "Query SETI (Space Exploration Telecommunications Infrastructure) black box test results and diagnostic data via the Telnyx Python SDK. Use when retrieving SETI test results, checking infrastructure diagnostics, or accessing space exploration telecommunications endpoints in Python."
metadata:
  author: telnyx
  product: seti
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx SETI - Python

Retrieve black box test results and diagnostic data from the Telnyx Space Exploration Telecommunications Infrastructure (SETI) API.

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),
)
```

All examples below assume `client` is already initialized as shown above.

## Retrieve Black Box Test Results

Returns the results of the various black box tests that validate SETI infrastructure status.

`GET /seti/black_box_test_results`

```python
response = client.seti.retrieve_black_box_test_results()
print(response.data)
```

Returns: `black_box_tests` (array[object]), `product` (string), `record_type` (string)

## Error Handling

```python
import telnyx

try:
    result = client.seti.retrieve_black_box_test_results()
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    import time
    time.sleep(1)
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
```
