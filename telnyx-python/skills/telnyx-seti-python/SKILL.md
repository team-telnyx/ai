---
name: telnyx-seti-python
description: >-
  Access SETI (Space Exploration Telecommunications Infrastructure) APIs. This
  skill provides Python SDK examples.
metadata:
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
