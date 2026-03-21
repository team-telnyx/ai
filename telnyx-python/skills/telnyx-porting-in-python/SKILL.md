---
name: telnyx-porting-in-python
description: >-
  Port numbers into Telnyx: portability checks, port orders, LOA upload, status
  tracking.
metadata:
  author: telnyx
  product: porting-in
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting In - Python

## Core Workflow

### Prerequisites

1. Run portability check on all numbers before creating a port order
2. Have Letter of Authorization (LOA) and recent invoice from current carrier ready
3. Pre-create connection_id and/or messaging_profile_id to assign during fulfillment

### Steps

1. **Check portability**: `client.porting.portability_checks.create(phone_numbers=[...])`
2. **Create draft order**: `client.porting.orders.create(phone_numbers=[...]) — auto-splits by country/type/carrier`
3. **Fulfill each split order**: `Upload LOA, invoice, end-user info, service address`
4. **Submit order**: `Transitions from draft to in-process`
5. **Monitor via webhooks**: `porting_order.status_changed, porting_order.new_comment`

### Common mistakes

- NEVER skip portability check — non-portable numbers cause downstream failures
- NEVER treat auto-split orders as a single entity — each split requires independent completion
- NEVER assume requested FOC date is guaranteed — the losing carrier determines the actual date
- ALWAYS monitor for Porting Operations comments — unanswered info requests kill the port

**Related skills**: telnyx-numbers-python, telnyx-numbers-config-python, telnyx-voice-python, telnyx-messaging-python

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
    result = client.porting.orders.create(params)
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

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Run a portability check

Runs a portability check, returning the results immediately.

`client.portability_checks.run()` — `POST /portability_checks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | No | The list of +E.164 formatted phone numbers to check for port... |

```python
response = client.portability_checks.run(
    phone_numbers=["+18005550101"],
)
print(response.data)
```

Key response fields: `response.data.phone_number, response.data.fast_portable, response.data.not_portable_reason`

## Create a porting order

Creates a new porting order object.

`client.porting_orders.create()` — `POST /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_numbers` | array[string] | Yes | The list of +E.164 formatted phone numbers |
| `customer_reference` | string | No | A customer-specified reference number for customer bookkeepi... |
| `customer_group_reference` | string | No | A customer-specified group reference for customer bookkeepin... |

```python
porting_order = client.porting_orders.create(
    phone_numbers=["+13035550000", "+13035550001", "+13035550002"],
)
print(porting_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting order

Retrieves the details of an existing porting order.

`client.porting_orders.retrieve()` — `GET /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `include_phone_numbers` | boolean | No | Include the first 50 phone number objects in the results |

```python
porting_order = client.porting_orders.retrieve(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(porting_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Submit a porting order.

Confirm and submit your porting order.

`client.porting_orders.actions.confirm()` — `POST /porting_orders/{id}/actions/confirm`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.actions.confirm(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all porting events

Returns a list of all porting events.

`client.porting.events.list()` — `GET /porting/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.porting.events.list()
page = page.data[0]
print(page)
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Show a porting event

Show a specific porting event.

`client.porting.events.retrieve()` — `GET /porting/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the porting event. |

```python
event = client.porting.events.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(event.data)
```

Key response fields: `response.data.id, response.data.available_notification_methods, response.data.event_type`

## Republish a porting event

Republish a specific porting event.

`client.porting.events.republish()` — `POST /porting/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the porting event. |

```python
client.porting.events.republish(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## List LOA configurations

List the LOA configurations.

`client.porting.loa_configurations.list()` — `GET /porting/loa_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.porting.loa_configurations.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a LOA configuration

Create a LOA configuration.

`client.porting.loa_configurations.create()` — `POST /porting/loa_configurations`

```python
loa_configuration = client.porting.loa_configurations.create(
    address={
        "city": "Austin",
        "country_code": "US",
        "state": "TX",
        "street_address": "600 Congress Avenue",
        "zip_code": "78701",
    },
    company_name="Telnyx",
    contact={
        "email": "testing@telnyx.com",
        "phone_number": "+12003270001",
    },
    logo={
        "document_id": "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
    },
    name="My LOA Configuration",
)
print(loa_configuration.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`client.porting.loa_configurations.preview()` — `POST /porting/loa_configurations/preview`

```python
response = client.porting.loa_configurations.preview(
    address={
        "city": "Austin",
        "country_code": "US",
        "state": "TX",
        "street_address": "600 Congress Avenue",
        "zip_code": "78701",
    },
    company_name="Telnyx",
    contact={
        "email": "testing@telnyx.com",
        "phone_number": "+12003270001",
    },
    logo={
        "document_id": "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
    },
    name="My LOA Configuration",
)
print(response)
content = response.read()
print(content)
```

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`client.porting.loa_configurations.retrieve()` — `GET /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```python
loa_configuration = client.porting.loa_configurations.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(loa_configuration.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a LOA configuration

Update a specific LOA configuration.

`client.porting.loa_configurations.update()` — `PATCH /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```python
loa_configuration = client.porting.loa_configurations.update(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    address={
        "city": "Austin",
        "country_code": "US",
        "state": "TX",
        "street_address": "600 Congress Avenue",
        "zip_code": "78701",
    },
    company_name="Telnyx",
    contact={
        "email": "testing@telnyx.com",
        "phone_number": "+12003270001",
    },
    logo={
        "document_id": "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
    },
    name="My LOA Configuration",
)
print(loa_configuration.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a LOA configuration

Delete a specific LOA configuration.

`client.porting.loa_configurations.delete()` — `DELETE /porting/loa_configurations/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```python
client.porting.loa_configurations.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`client.porting.loa_configurations.preview_1()` — `GET /porting/loa_configurations/{id}/preview`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a LOA configuration. |

```python
response = client.porting.loa_configurations.preview_1(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response)
content = response.read()
print(content)
```

## List porting related reports

List the reports generated about porting operations.

`client.porting.reports.list()` — `GET /porting/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.porting.reports.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a porting related report

Generate reports about porting operations.

`client.porting.reports.create()` — `POST /porting/reports`

```python
report = client.porting.reports.create(
    params={
        "filters": {}
    },
    report_type="export_porting_orders_csv",
)
print(report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.porting.reports.retrieve()` — `GET /porting/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a report. |

```python
report = client.porting.reports.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(report.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List available carriers in the UK

List available carriers in the UK.

`client.porting.list_uk_carriers()` — `GET /porting/uk_carriers`

```python
response = client.porting.list_uk_carriers()
print(response.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List all porting orders

Returns a list of your porting order.

`client.porting_orders.list()` — `GET /porting_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `include_phone_numbers` | boolean | No | Include the first 50 phone number objects in the results |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
page = client.porting_orders.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all exception types

Returns a list of all possible exception types for a porting order.

`client.porting_orders.retrieve_exception_types()` — `GET /porting_orders/exception_types`

```python
response = client.porting_orders.retrieve_exception_types()
print(response.data)
```

Key response fields: `response.data.code, response.data.description`

## List all phone number configurations

Returns a list of phone number configurations paginated.

`client.porting_orders.phone_number_configurations.list()` — `GET /porting_orders/phone_number_configurations`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.phone_number_configurations.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of phone number configurations

Creates a list of phone number configurations.

`client.porting_orders.phone_number_configurations.create()` — `POST /porting_orders/phone_number_configurations`

```python
phone_number_configuration = client.porting_orders.phone_number_configurations.create()
print(phone_number_configuration.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Edit a porting order

Edits the details of an existing porting order. Any or all of a porting orders attributes may be included in the resource object included in a PATCH request. If a request does not include all of the attributes for a resource, the system will interpret the missing attributes as if they were included with their current values.

`client.porting_orders.update()` — `PATCH /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `webhook_url` | string (URL) | No |  |
| `requirement_group_id` | string (UUID) | No | If present, we will read the current values from the specifi... |
| `misc` | object | No |  |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```python
porting_order = client.porting_orders.update(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(porting_order.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a porting order

Deletes an existing porting order. This operation is restrict to porting orders in draft state.

`client.porting_orders.delete()` — `DELETE /porting_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
client.porting_orders.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously. This operation is limited to US FastPort orders only.

`client.porting_orders.actions.activate()` — `POST /porting_orders/{id}/actions/activate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.actions.activate(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Cancel a porting order

`client.porting_orders.actions.cancel()` — `POST /porting_orders/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.actions.cancel(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Share a porting order

Creates a sharing token for a porting order. The token can be used to share the porting order with non-Telnyx users.

`client.porting_orders.actions.share()` — `POST /porting_orders/{id}/actions/share`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.actions.share(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.expires_at`

## List all porting activation jobs

Returns a list of your porting activation jobs.

`client.porting_orders.activation_jobs.list()` — `GET /porting_orders/{id}/activation_jobs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.porting_orders.activation_jobs.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a porting activation job

Returns a porting activation job.

`client.porting_orders.activation_jobs.retrieve()` — `GET /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `activation_job_id` | string (UUID) | Yes | Activation Job Identifier |

```python
activation_job = client.porting_orders.activation_jobs.retrieve(
    activation_job_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(activation_job.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Update a porting activation job

Updates the activation time of a porting activation job.

`client.porting_orders.activation_jobs.update()` — `PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `activation_job_id` | string (UUID) | Yes | Activation Job Identifier |

```python
activation_job = client.porting_orders.activation_jobs.update(
    activation_job_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(activation_job.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List additional documents

Returns a list of additional documents for a porting order.

`client.porting_orders.additional_documents.list()` — `GET /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.additional_documents.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`client.porting_orders.additional_documents.create()` — `POST /porting_orders/{id}/additional_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
additional_document = client.porting_orders.additional_documents.create(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(additional_document.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an additional document

Deletes an additional document for a porting order.

`client.porting_orders.additional_documents.delete()` — `DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `additional_document_id` | string (UUID) | Yes | Additional document identification. |

```python
client.porting_orders.additional_documents.delete(
    additional_document_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`client.porting_orders.retrieve_allowed_foc_windows()` — `GET /porting_orders/{id}/allowed_foc_windows`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.retrieve_allowed_foc_windows(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.ended_at, response.data.record_type, response.data.started_at`

## List all comments of a porting order

Returns a list of all comments of a porting order.

`client.porting_orders.comments.list()` — `GET /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.porting_orders.comments.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment for a porting order

Creates a new comment for a porting order.

`client.porting_orders.comments.create()` — `POST /porting_orders/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `body` | string | No |  |

```python
comment = client.porting_orders.comments.create(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(comment.data)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Download a porting order loa template

`client.porting_orders.retrieve_loa_template()` — `GET /porting_orders/{id}/loa_template`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `loa_configuration_id` | string (UUID) | No | The identifier of the LOA configuration to use for the templ... |

```python
response = client.porting_orders.retrieve_loa_template(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response)
content = response.read()
print(content)
```

## List porting order requirements

Returns a list of all requirements based on country/number type for this porting order.

`client.porting_orders.retrieve_requirements()` — `GET /porting_orders/{id}/requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```python
page = client.porting_orders.retrieve_requirements(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.field_type)
```

Key response fields: `response.data.field_type, response.data.field_value, response.data.record_type`

## Retrieve the associated V1 sub_request_id and port_request_id

`client.porting_orders.retrieve_sub_request()` — `GET /porting_orders/{id}/sub_request`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.retrieve_sub_request(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.port_request_id, response.data.sub_request_id`

## List verification codes

Returns a list of verification codes for a porting order.

`client.porting_orders.verification_codes.list()` — `GET /porting_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.verification_codes.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## Send the verification codes

Send the verification code for all porting phone numbers.

`client.porting_orders.verification_codes.send()` — `POST /porting_orders/{id}/verification_codes/send`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
client.porting_orders.verification_codes.send(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`client.porting_orders.verification_codes.verify()` — `POST /porting_orders/{id}/verification_codes/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Porting Order id |

```python
response = client.porting_orders.verification_codes.verify(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.id, response.data.phone_number, response.data.created_at`

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`client.porting_orders.action_requirements.list()` — `GET /porting_orders/{porting_order_id}/action_requirements`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | The ID of the porting order |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.action_requirements.list(
    porting_order_id="550e8400-e29b-41d4-a716-446655440000",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`client.porting_orders.action_requirements.initiate()` — `POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | The ID of the porting order |
| `id` | string (UUID) | Yes | The ID of the action requirement |

```python
response = client.porting_orders.action_requirements.initiate(
    id="550e8400-e29b-41d4-a716-446655440000",
    porting_order_id="550e8400-e29b-41d4-a716-446655440000",
    params={
        "first_name": "John",
        "last_name": "Doe",
    },
)
print(response.data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order. Associated phone numbers are used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.porting_orders.associated_phone_numbers.list()` — `GET /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.associated_phone_numbers.list(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create an associated phone number

Creates a new associated phone number for a porting order. This is used for partial porting in GB to specify which phone numbers should be kept or disconnected.

`client.porting_orders.associated_phone_numbers.create()` — `POST /porting_orders/{porting_order_id}/associated_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```python
associated_phone_number = client.porting_orders.associated_phone_numbers.create(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    action="keep",
    phone_number_range={},
)
print(associated_phone_number.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`client.porting_orders.associated_phone_numbers.delete()` — `DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the associated phone number to be deleted |

```python
associated_phone_number = client.porting_orders.associated_phone_numbers.delete(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(associated_phone_number.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`client.porting_orders.phone_number_blocks.list()` — `GET /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.phone_number_blocks.list(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number block

Creates a new phone number block.

`client.porting_orders.phone_number_blocks.create()` — `POST /porting_orders/{porting_order_id}/phone_number_blocks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```python
phone_number_block = client.porting_orders.phone_number_blocks.create(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    activation_ranges=[{
        "end_at": "+4930244999910",
        "start_at": "+4930244999901",
    }],
    phone_number_range={
        "end_at": "+4930244999910",
        "start_at": "+4930244999901",
    },
)
print(phone_number_block.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number block

Deletes a phone number block.

`client.porting_orders.phone_number_blocks.delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the phone number block to be deleted |

```python
phone_number_block = client.porting_orders.phone_number_blocks.delete(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(phone_number_block.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`client.porting_orders.phone_number_extensions.list()` — `GET /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `sort` | object | No | Consolidated sort parameter (deepObject style). |

```python
page = client.porting_orders.phone_number_extensions.list(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Create a phone number extension

Creates a new phone number extension.

`client.porting_orders.phone_number_extensions.create()` — `POST /porting_orders/{porting_order_id}/phone_number_extensions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |

```python
phone_number_extension = client.porting_orders.phone_number_extensions.create(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    activation_ranges=[{
        "end_at": 10,
        "start_at": 1,
    }],
    extension_range={
        "end_at": 10,
        "start_at": 1,
    },
    porting_phone_number_id="f24151b6-3389-41d3-8747-7dd8c681e5e2",
)
print(phone_number_extension.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Delete a phone number extension

Deletes a phone number extension.

`client.porting_orders.phone_number_extensions.delete()` — `DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `porting_order_id` | string (UUID) | Yes | Identifies the Porting Order associated with the phone numbe... |
| `id` | string (UUID) | Yes | Identifies the phone number extension to be deleted |

```python
phone_number_extension = client.porting_orders.phone_number_extensions.delete(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(phone_number_extension.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all porting phone numbers

Returns a list of your porting phone numbers.

`client.porting_phone_numbers.list()` — `GET /porting_phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.porting_phone_numbers.list()
page = page.data[0]
print(page.porting_order_id)
```

Key response fields: `response.data.phone_number, response.data.activation_status, response.data.phone_number_type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
