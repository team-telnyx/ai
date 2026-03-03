---
name: telnyx-porting-in-ruby
description: >-
  Port phone numbers into Telnyx. Check portability, create port orders, upload
  LOA documents, and track porting status. This skill provides Ruby SDK
  examples.
metadata:
  author: telnyx
  product: porting-in
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting In - Ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Run a portability check

Runs a portability check, returning the results immediately.

`POST /portability_checks`

Optional: `phone_numbers` (array[string])

```ruby
response = client.portability_checks.run

puts(response)
```

## List all porting events

Returns a list of all porting events.

`GET /porting/events`

```ruby
page = client.porting.events.list

puts(page)
```

## Show a porting event

Show a specific porting event.

`GET /porting/events/{id}`

```ruby
event = client.porting.events.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(event)
```

## Republish a porting event

Republish a specific porting event.

`POST /porting/events/{id}/republish`

```ruby
result = client.porting.events.republish("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Preview the LOA configuration parameters

Preview the LOA template that would be generated without need to create LOA configuration.

`POST /porting/loa_configuration/preview`

```ruby
response = client.porting.loa_configurations.preview_0(
  address: {city: "Austin", country_code: "US", state: "TX", street_address: "600 Congress Avenue", zip_code: "78701"},
  company_name: "Telnyx",
  contact: {email: "testing@client.com", phone_number: "+12003270001"},
  logo: {document_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"},
  name: "My LOA Configuration"
)

puts(response)
```

## List LOA configurations

List the LOA configurations.

`GET /porting/loa_configurations`

```ruby
page = client.porting.loa_configurations.list

puts(page)
```

## Create a LOA configuration

Create a LOA configuration.

`POST /porting/loa_configurations`

```ruby
loa_configuration = client.porting.loa_configurations.create(
  address: {city: "Austin", country_code: "US", state: "TX", street_address: "600 Congress Avenue", zip_code: "78701"},
  company_name: "Telnyx",
  contact: {email: "testing@client.com", phone_number: "+12003270001"},
  logo: {document_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"},
  name: "My LOA Configuration"
)

puts(loa_configuration)
```

## Retrieve a LOA configuration

Retrieve a specific LOA configuration.

`GET /porting/loa_configurations/{id}`

```ruby
loa_configuration = client.porting.loa_configurations.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(loa_configuration)
```

## Update a LOA configuration

Update a specific LOA configuration.

`PATCH /porting/loa_configurations/{id}`

```ruby
loa_configuration = client.porting.loa_configurations.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  address: {city: "Austin", country_code: "US", state: "TX", street_address: "600 Congress Avenue", zip_code: "78701"},
  company_name: "Telnyx",
  contact: {email: "testing@client.com", phone_number: "+12003270001"},
  logo: {document_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"},
  name: "My LOA Configuration"
)

puts(loa_configuration)
```

## Delete a LOA configuration

Delete a specific LOA configuration.

`DELETE /porting/loa_configurations/{id}`

```ruby
result = client.porting.loa_configurations.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Preview a LOA configuration

Preview a specific LOA configuration.

`GET /porting/loa_configurations/{id}/preview`

```ruby
response = client.porting.loa_configurations.preview_1("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List porting related reports

List the reports generated about porting operations.

`GET /porting/reports`

```ruby
page = client.porting.reports.list

puts(page)
```

## Create a porting related report

Generate reports about porting operations.

`POST /porting/reports`

```ruby
report = client.porting.reports.create(params: {filters: {}}, report_type: :export_porting_orders_csv)

puts(report)
```

## Retrieve a report

Retrieve a specific report generated.

`GET /porting/reports/{id}`

```ruby
report = client.porting.reports.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(report)
```

## List available carriers in the UK

List available carriers in the UK.

`GET /porting/uk_carriers`

```ruby
response = client.porting.list_uk_carriers

puts(response)
```

## List all porting orders

Returns a list of your porting order.

`GET /porting_orders`

```ruby
page = client.porting_orders.list

puts(page)
```

## Create a porting order

Creates a new porting order object.

`POST /porting_orders` — Required: `phone_numbers`

Optional: `customer_group_reference` (string), `customer_reference` (['string', 'null'])

```ruby
porting_order = client.porting_orders.create(phone_numbers: ["+13035550000", "+13035550001", "+13035550002"])

puts(porting_order)
```

## List all exception types

Returns a list of all possible exception types for a porting order.

`GET /porting_orders/exception_types`

```ruby
response = client.porting_orders.retrieve_exception_types

puts(response)
```

## List all phone number configurations

Returns a list of phone number configurations paginated.

`GET /porting_orders/phone_number_configurations`

```ruby
page = client.porting_orders.phone_number_configurations.list

puts(page)
```

## Create a list of phone number configurations

Creates a list of phone number configurations.

`POST /porting_orders/phone_number_configurations`

```ruby
phone_number_configuration = client.porting_orders.phone_number_configurations.create

puts(phone_number_configuration)
```

## Retrieve a porting order

Retrieves the details of an existing porting order.

`GET /porting_orders/{id}`

```ruby
porting_order = client.porting_orders.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(porting_order)
```

## Edit a porting order

Edits the details of an existing porting order.

`PATCH /porting_orders/{id}`

Optional: `activation_settings` (object), `customer_group_reference` (string), `customer_reference` (string), `documents` (object), `end_user` (object), `messaging` (object), `misc` (object), `phone_number_configuration` (object), `requirement_group_id` (uuid), `requirements` (array[object]), `user_feedback` (object), `webhook_url` (uri)

```ruby
porting_order = client.porting_orders.update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(porting_order)
```

## Delete a porting order

Deletes an existing porting order.

`DELETE /porting_orders/{id}`

```ruby
result = client.porting_orders.delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Activate every number in a porting order asynchronously.

Activate each number in a porting order asynchronously.

`POST /porting_orders/{id}/actions/activate`

```ruby
response = client.porting_orders.actions.activate("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## Cancel a porting order

`POST /porting_orders/{id}/actions/cancel`

```ruby
response = client.porting_orders.actions.cancel("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## Submit a porting order.

Confirm and submit your porting order.

`POST /porting_orders/{id}/actions/confirm`

```ruby
response = client.porting_orders.actions.confirm("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## Share a porting order

Creates a sharing token for a porting order.

`POST /porting_orders/{id}/actions/share`

```ruby
response = client.porting_orders.actions.share("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List all porting activation jobs

Returns a list of your porting activation jobs.

`GET /porting_orders/{id}/activation_jobs`

```ruby
page = client.porting_orders.activation_jobs.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Retrieve a porting activation job

Returns a porting activation job.

`GET /porting_orders/{id}/activation_jobs/{activationJobId}`

```ruby
activation_job = client.porting_orders.activation_jobs.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(activation_job)
```

## Update a porting activation job

Updates the activation time of a porting activation job.

`PATCH /porting_orders/{id}/activation_jobs/{activationJobId}`

```ruby
activation_job = client.porting_orders.activation_jobs.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(activation_job)
```

## List additional documents

Returns a list of additional documents for a porting order.

`GET /porting_orders/{id}/additional_documents`

```ruby
page = client.porting_orders.additional_documents.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Create a list of additional documents

Creates a list of additional documents for a porting order.

`POST /porting_orders/{id}/additional_documents`

```ruby
additional_document = client.porting_orders.additional_documents.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(additional_document)
```

## Delete an additional document

Deletes an additional document for a porting order.

`DELETE /porting_orders/{id}/additional_documents/{additional_document_id}`

```ruby
result = client.porting_orders.additional_documents.delete(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(result)
```

## List allowed FOC dates

Returns a list of allowed FOC dates for a porting order.

`GET /porting_orders/{id}/allowed_foc_windows`

```ruby
response = client.porting_orders.retrieve_allowed_foc_windows("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List all comments of a porting order

Returns a list of all comments of a porting order.

`GET /porting_orders/{id}/comments`

```ruby
page = client.porting_orders.comments.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Create a comment for a porting order

Creates a new comment for a porting order.

`POST /porting_orders/{id}/comments`

Optional: `body` (string)

```ruby
comment = client.porting_orders.comments.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(comment)
```

## Download a porting order loa template

`GET /porting_orders/{id}/loa_template`

```ruby
response = client.porting_orders.retrieve_loa_template("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List porting order requirements

Returns a list of all requirements based on country/number type for this porting order.

`GET /porting_orders/{id}/requirements`

```ruby
page = client.porting_orders.retrieve_requirements("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Retrieve the associated V1 sub_request_id and port_request_id

`GET /porting_orders/{id}/sub_request`

```ruby
response = client.porting_orders.retrieve_sub_request("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List verification codes

Returns a list of verification codes for a porting order.

`GET /porting_orders/{id}/verification_codes`

```ruby
page = client.porting_orders.verification_codes.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Send the verification codes

Send the verification code for all porting phone numbers.

`POST /porting_orders/{id}/verification_codes/send`

```ruby
result = client.porting_orders.verification_codes.send_("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Verify the verification code for a list of phone numbers

Verifies the verification code for a list of phone numbers.

`POST /porting_orders/{id}/verification_codes/verify`

```ruby
response = client.porting_orders.verification_codes.verify("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## List action requirements for a porting order

Returns a list of action requirements for a specific porting order.

`GET /porting_orders/{porting_order_id}/action_requirements`

```ruby
page = client.porting_orders.action_requirements.list("porting_order_id")

puts(page)
```

## Initiate an action requirement

Initiates a specific action requirement for a porting order.

`POST /porting_orders/{porting_order_id}/action_requirements/{id}/initiate`

```ruby
response = client.porting_orders.action_requirements.initiate(
  "id",
  porting_order_id: "porting_order_id",
  params: {first_name: "John", last_name: "Doe"}
)

puts(response)
```

## List all associated phone numbers

Returns a list of all associated phone numbers for a porting order.

`GET /porting_orders/{porting_order_id}/associated_phone_numbers`

```ruby
page = client.porting_orders.associated_phone_numbers.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Create an associated phone number

Creates a new associated phone number for a porting order.

`POST /porting_orders/{porting_order_id}/associated_phone_numbers`

```ruby
associated_phone_number = client.porting_orders.associated_phone_numbers.create(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  action: :keep,
  phone_number_range: {}
)

puts(associated_phone_number)
```

## Delete an associated phone number

Deletes an associated phone number from a porting order.

`DELETE /porting_orders/{porting_order_id}/associated_phone_numbers/{id}`

```ruby
associated_phone_number = client.porting_orders.associated_phone_numbers.delete(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  porting_order_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(associated_phone_number)
```

## List all phone number blocks

Returns a list of all phone number blocks of a porting order.

`GET /porting_orders/{porting_order_id}/phone_number_blocks`

```ruby
page = client.porting_orders.phone_number_blocks.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Create a phone number block

Creates a new phone number block.

`POST /porting_orders/{porting_order_id}/phone_number_blocks`

```ruby
phone_number_block = client.porting_orders.phone_number_blocks.create(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  activation_ranges: [{end_at: "+4930244999910", start_at: "+4930244999901"}],
  phone_number_range: {end_at: "+4930244999910", start_at: "+4930244999901"}
)

puts(phone_number_block)
```

## Delete a phone number block

Deletes a phone number block.

`DELETE /porting_orders/{porting_order_id}/phone_number_blocks/{id}`

```ruby
phone_number_block = client.porting_orders.phone_number_blocks.delete(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  porting_order_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(phone_number_block)
```

## List all phone number extensions

Returns a list of all phone number extensions of a porting order.

`GET /porting_orders/{porting_order_id}/phone_number_extensions`

```ruby
page = client.porting_orders.phone_number_extensions.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Create a phone number extension

Creates a new phone number extension.

`POST /porting_orders/{porting_order_id}/phone_number_extensions`

```ruby
phone_number_extension = client.porting_orders.phone_number_extensions.create(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  activation_ranges: [{end_at: 10, start_at: 1}],
  extension_range: {end_at: 10, start_at: 1},
  porting_phone_number_id: "f24151b6-3389-41d3-8747-7dd8c681e5e2"
)

puts(phone_number_extension)
```

## Delete a phone number extension

Deletes a phone number extension.

`DELETE /porting_orders/{porting_order_id}/phone_number_extensions/{id}`

```ruby
phone_number_extension = client.porting_orders.phone_number_extensions.delete(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  porting_order_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(phone_number_extension)
```

## List all porting phone numbers

Returns a list of your porting phone numbers.

`GET /porting_phone_numbers`

```ruby
page = client.porting_phone_numbers.list

puts(page)
```
