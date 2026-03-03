---
name: telnyx-porting-out-ruby
description: >-
  Manage port-out requests when numbers are being ported away from Telnyx. List,
  view, and update port-out status. This skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: porting-out
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting Out - Ruby

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

## List portout requests

Returns the portout requests according to filters

`GET /portouts`

```ruby
page = client.portouts.list

puts(page)
```

## List all port-out events

Returns a list of all port-out events.

`GET /portouts/events`

```ruby
page = client.portouts.events.list

puts(page)
```

## Show a port-out event

Show a specific port-out event.

`GET /portouts/events/{id}`

```ruby
event = client.portouts.events.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(event)
```

## Republish a port-out event

Republish a specific port-out event.

`POST /portouts/events/{id}/republish`

```ruby
result = client.portouts.events.republish("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`GET /portouts/rejections/{portout_id}`

```ruby
response = client.portouts.list_rejection_codes("329d6658-8f93-405d-862f-648776e8afd7")

puts(response)
```

## List port-out related reports

List the reports generated about port-out operations.

`GET /portouts/reports`

```ruby
page = client.portouts.reports.list

puts(page)
```

## Create a port-out related report

Generate reports about port-out operations.

`POST /portouts/reports`

```ruby
report = client.portouts.reports.create(params: {filters: {}}, report_type: :export_portouts_csv)

puts(report)
```

## Retrieve a report

Retrieve a specific report generated.

`GET /portouts/reports/{id}`

```ruby
report = client.portouts.reports.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(report)
```

## Get a portout request

Returns the portout request based on the ID provided

`GET /portouts/{id}`

```ruby
portout = client.portouts.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(portout)
```

## List all comments for a portout request

Returns a list of comments for a portout request.

`GET /portouts/{id}/comments`

```ruby
comments = client.portouts.comments.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(comments)
```

## Create a comment on a portout request

Creates a comment on a portout request.

`POST /portouts/{id}/comments`

Optional: `body` (string)

```ruby
comment = client.portouts.comments.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(comment)
```

## List supporting documents on a portout request

List every supporting documents for a portout request.

`GET /portouts/{id}/supporting_documents`

```ruby
supporting_documents = client.portouts.supporting_documents.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(supporting_documents)
```

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`POST /portouts/{id}/supporting_documents`

Optional: `documents` (array[object])

```ruby
supporting_document = client.portouts.supporting_documents.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(supporting_document)
```

## Update Status

Authorize or reject portout request

`PATCH /portouts/{id}/{status}` — Required: `reason`

Optional: `host_messaging` (boolean)

```ruby
response = client.portouts.update_status(
  :authorized,
  id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  reason: "I do not recognize this transaction"
)

puts(response)
```
