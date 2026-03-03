---
name: telnyx-porting-in-python
description: >-
  Port phone numbers into Telnyx. Check portability, create port orders, upload
  LOA documents, and track porting status. This skill provides Python SDK
  examples.
metadata:
  author: telnyx
  product: porting-in
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting In - Python

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

## Run a portability check

Runs a portability check, returning the results immediately.

`POST /portability_checks`

Optional: `phone_numbers` (array[string])

```python
response = client.portability_checks.run()
print(response.data)
```

## List all porting events

Returns a list of all porting events.

`GET /porting/events`

```python
page = client.porting.events.list()
page = page.data[0]
print(page)
```

## Show a porting event

Show a specific porting event.

`GET /porting/events/{id}`

```python
event = client.porting.events.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(event.data)
```

## Republish a porting event

Republish a specific porting event.

`POST /porting/events/{id}/republish`

```python
client.porting.events.republish(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`POST /porting/loa_configuration/preview`

```python
response = client.porting.loa_configurations.preview_0(
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

## List LOA configurations

List the LOA configurations.

`GET /porting/loa_configurations`

```python
page = client.porting.loa_configurations.list()
page = page.data[0]
print(page.id)
```

## Create a LOA configuration

Create a LOA configuration.

`POST /porting/loa_configurations`

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

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`GET /porting/loa_configurations/{id}`

```python
loa_configuration = client.porting.loa_configurations.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(loa_configuration.data)
```

## Update a LOA configuration

Update a specific LOA configuration.

`PATCH /porting/loa_configurations/{id}`

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

## Delete a LOA configuration

Delete a specific LOA configuration.

`DELETE /porting/loa_configurations/{id}`

```python
client.porting.loa_configurations.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`GET /porting/loa_configurations/{id}/preview`

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

`GET /porting/reports`

```python
page = client.porting.reports.list()
page = page.data[0]
print(page.id)
```

## Create a porting related report

Generate reports about porting operations.

`POST /porting/reports`

```python
report = client.porting.reports.create(
    params={
        "filters": {}
    },
    report_type="export_porting_orders_csv",
)
print(report.data)
```

## Retrieve a report

Retrieve a specific report generated.

`GET /porting/reports/{id}`

```python
report = client.porting.reports.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(report.data)
```

## List available carriers in the UK

List available carriers in the UK.

`GET /porting/uk_carriers`

```python
response = client.porting.list_uk_carriers()
print(response.data)
```

## List all porting orders

Returns a list of your porting order.

`GET /porting_orders`

```python
page = client.porting_orders.list()
page = page.data[0]
print(page.id)
```

## Create a porting order

Creates a new porting order object.

`POST /porting_orders` — Required: `phone_numbers`

Optional: `customer_group_reference` (string), `customer_reference` (['string', 'null'])

```python
porting_order = client.porting_orders.create(
    phone_numbers=["+13035550000", "+13035550001", "+13035550002"],
)
print(porting_order.data)
```

## List all exception types

Returns a list of all possible exception types for a porting order.

`GET /porting_orders/exception_types`

```python
response = client.porting_orders.retrieve_exception_types()
print(response.data)
```

## List all phone number configurations

Returns a list of phone number configurations paginated.

`GET /porting_orders/phone_number_configurations`

```python
page = client.porting_orders.phone_number_configurations.list()
page = page.data[0]
print(page.id)
```

## Create a list of phone number configurations

Creates a list of phone number configurations.

`POST /porting_orders/phone_number_configurations`

```python
phone_number_configuration = client.porting_orders.phone_number_configurations.create()
print(phone_number_configuration.data)
```

## Retrieve a porting order

Retrieves the details of an existing porting order.

`GET /porting_orders/{id}`

```python
porting_order = client.porting_orders.retrieve(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(porting_order.data)
```

## Edit a porting order

Edits the details of an existing porting order.

`PATCH /porting_orders/{id}`

Optional: `activation_settings` (object), `customer_group_reference` (string), `customer_reference` (string), `documents` (object), `end_user` (object), `messaging` (object), `misc` (object), `phone_number_configuration` (object), `requirement_group_id` (uuid), `requirements` (array[object]), `user_feedback` (object), `webhook_url` (uri)

```python
porting_order = client.porting_orders.update(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(porting_order.data)
```

## Delete a porting order

Deletes an existing porting order.

`DELETE /porting_orders/{id}`

```python
client.porting_orders.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously.

`POST /porting_orders/{id}/actions/activate`

```python
response = client.porting_orders.actions.activate(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Cancel a porting order

`POST /porting_orders/{id}/actions/cancel`

```python
response = client.porting_orders.actions.cancel(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Submit a porting order.

Confirm and submit your porting order.

`POST /porting_orders/{id}/actions/confirm`

```python
response = client.porting_orders.actions.confirm(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Share a porting order

Creates a sharing token for a porting order.

`POST /porting_orders/{id}/actions/share`

```python
response = client.porting_orders.actions.share(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List all porting activation jobs

Returns a list of your porting activation jobs.

`GET /porting_orders/{id}/activation_jobs`

```python
page = client.porting_orders.activation_jobs.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Retrieve a porting activation job

Returns a porting activation job.

`GET /porting_orders/{id}/activation_jobs/{activationJobId}`

```python
activation_job = client.porting_orders.activation_jobs.retrieve(
    activation_job_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(activation_job.data)
```

## Update a porting activation job

Updates the activation time of a porting activation job.

`PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

```python
activation_job = client.porting_orders.activation_jobs.update(
    activation_job_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(activation_job.data)
```

## List additional documents

Returns a list of additional documents for a porting order.

`GET /porting_orders/{id}/additional_documents`

```python
page = client.porting_orders.additional_documents.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`POST /porting_orders/{id}/additional_documents`

```python
additional_document = client.porting_orders.additional_documents.create(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(additional_document.data)
```

## Delete an additional document

Deletes an additional document for a porting order.

`DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

```python
client.porting_orders.additional_documents.delete(
    additional_document_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`GET /porting_orders/{id}/allowed_foc_windows`

```python
response = client.porting_orders.retrieve_allowed_foc_windows(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List all comments of a porting order

Returns a list of all comments of a porting order.

`GET /porting_orders/{id}/comments`

```python
page = client.porting_orders.comments.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Create a comment for a porting order

Creates a new comment for a porting order.

`POST /porting_orders/{id}/comments`

Optional: `body` (string)

```python
comment = client.porting_orders.comments.create(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(comment.data)
```

## Download a porting order loa template

`GET /porting_orders/{id}/loa_template`

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

`GET /porting_orders/{id}/requirements`

```python
page = client.porting_orders.retrieve_requirements(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.field_type)
```

## Retrieve the associated V1 sub_request_id and port_request_id

`GET /porting_orders/{id}/sub_request`

```python
response = client.porting_orders.retrieve_sub_request(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List verification codes

Returns a list of verification codes for a porting order.

`GET /porting_orders/{id}/verification_codes`

```python
page = client.porting_orders.verification_codes.list(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Send the verification codes

Send the verification code for all porting phone numbers.

`POST /porting_orders/{id}/verification_codes/send`

```python
client.porting_orders.verification_codes.send(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`POST /porting_orders/{id}/verification_codes/verify`

```python
response = client.porting_orders.verification_codes.verify(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`GET /porting_orders/{porting_order_id}/action_requirements`

```python
page = client.porting_orders.action_requirements.list(
    porting_order_id="porting_order_id",
)
page = page.data[0]
print(page.id)
```

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

```python
response = client.porting_orders.action_requirements.initiate(
    id="id",
    porting_order_id="porting_order_id",
    params={
        "first_name": "John",
        "last_name": "Doe",
    },
)
print(response.data)
```

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order.

`GET /porting_orders/{porting_order_id}/associated_phone_numbers`

```python
page = client.porting_orders.associated_phone_numbers.list(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Create an associated phone number

Creates a new associated phone number for a porting order.

`POST /porting_orders/{porting_order_id}/associated_phone_numbers`

```python
associated_phone_number = client.porting_orders.associated_phone_numbers.create(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    action="keep",
    phone_number_range={},
)
print(associated_phone_number.data)
```

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

```python
associated_phone_number = client.porting_orders.associated_phone_numbers.delete(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(associated_phone_number.data)
```

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`GET /porting_orders/{porting_order_id}/phone_number_blocks`

```python
page = client.porting_orders.phone_number_blocks.list(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Create a phone number block

Creates a new phone number block.

`POST /porting_orders/{porting_order_id}/phone_number_blocks`

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

## Delete a phone number block

Deletes a phone number block.

`DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

```python
phone_number_block = client.porting_orders.phone_number_blocks.delete(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(phone_number_block.data)
```

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`GET /porting_orders/{porting_order_id}/phone_number_extensions`

```python
page = client.porting_orders.phone_number_extensions.list(
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.id)
```

## Create a phone number extension

Creates a new phone number extension.

`POST /porting_orders/{porting_order_id}/phone_number_extensions`

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

## Delete a phone number extension

Deletes a phone number extension.

`DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

```python
phone_number_extension = client.porting_orders.phone_number_extensions.delete(
    id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    porting_order_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(phone_number_extension.data)
```

## List all porting phone numbers

Returns a list of your porting phone numbers.

`GET /porting_phone_numbers`

```python
page = client.porting_phone_numbers.list()
page = page.data[0]
print(page.porting_order_id)
```
