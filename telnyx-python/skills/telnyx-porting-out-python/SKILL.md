---
name: telnyx-porting-out-python
description: >-
  Manage port-out requests when numbers are being ported away from Telnyx. List,
  view, and update port-out status. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: porting-out
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting Out - Python

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

## List portout requests

Returns the portout requests according to filters

`GET /portouts`

```python
page = client.portouts.list()
page = page.data[0]
print(page.id)
```

## List all port-out events

Returns a list of all port-out events.

`GET /portouts/events`

```python
page = client.portouts.events.list()
page = page.data[0]
print(page)
```

## Show a port-out event

Show a specific port-out event.

`GET /portouts/events/{id}`

```python
event = client.portouts.events.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(event.data)
```

## Republish a port-out event

Republish a specific port-out event.

`POST /portouts/events/{id}/republish`

```python
client.portouts.events.republish(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`GET /portouts/rejections/{portout_id}`

```python
response = client.portouts.list_rejection_codes(
    portout_id="329d6658-8f93-405d-862f-648776e8afd7",
)
print(response.data)
```

## List port-out related reports

List the reports generated about port-out operations.

`GET /portouts/reports`

```python
page = client.portouts.reports.list()
page = page.data[0]
print(page.id)
```

## Create a port-out related report

Generate reports about port-out operations.

`POST /portouts/reports`

```python
report = client.portouts.reports.create(
    params={
        "filters": {}
    },
    report_type="export_portouts_csv",
)
print(report.data)
```

## Retrieve a report

Retrieve a specific report generated.

`GET /portouts/reports/{id}`

```python
report = client.portouts.reports.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(report.data)
```

## Get a portout request

Returns the portout request based on the ID provided

`GET /portouts/{id}`

```python
portout = client.portouts.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(portout.data)
```

## List all comments for a portout request

Returns a list of comments for a portout request.

`GET /portouts/{id}/comments`

```python
comments = client.portouts.comments.list(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(comments.data)
```

## Create a comment on a portout request

Creates a comment on a portout request.

`POST /portouts/{id}/comments`

Optional: `body` (string)

```python
comment = client.portouts.comments.create(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(comment.data)
```

## List supporting documents on a portout request

List every supporting documents for a portout request.

`GET /portouts/{id}/supporting_documents`

```python
supporting_documents = client.portouts.supporting_documents.list(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(supporting_documents.data)
```

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`POST /portouts/{id}/supporting_documents`

Optional: `documents` (array[object])

```python
supporting_document = client.portouts.supporting_documents.create(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(supporting_document.data)
```

## Update Status

Authorize or reject portout request

`PATCH /portouts/{id}/{status}` — Required: `reason`

Optional: `host_messaging` (boolean)

```python
response = client.portouts.update_status(
    status="authorized",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    reason="I do not recognize this transaction",
)
print(response.data)
```
