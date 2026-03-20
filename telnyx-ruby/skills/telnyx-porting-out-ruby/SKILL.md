---
name: telnyx-porting-out-ruby
description: >-
  Manage port-out requests when numbers leave Telnyx. List, view, and update
  status.
metadata:
  author: telnyx
  product: porting-out
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Porting Out - Ruby

## Core Workflow

### Prerequisites

1. Port-out requests are initiated by the GAINING carrier, not by you

### Steps

1. **List port-out requests**: `client.portouts.list()`
2. **View details**: `client.portouts.retrieve(id: ...)`
3. **Update status**: `client.portouts.update(id: ..., status: ...)`

### Common mistakes

- You cannot create port-out requests — they appear when another carrier requests your numbers
- Respond promptly to port-out requests — regulatory deadlines apply

**Related skills**: telnyx-numbers-ruby, telnyx-porting-in-ruby

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.portouts.list(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List portout requests

Returns the portout requests according to filters

`client.portouts.list()` — `GET /portouts`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.portouts.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.state`

## List all port-out events

Returns a list of all port-out events.

`client.portouts.events.list()` — `GET /portouts/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.portouts.events.list

puts(page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Show a port-out event

Show a specific port-out event.

`client.portouts.events.retrieve()` — `GET /portouts/events/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the port-out event. |

```ruby
event = client.portouts.events.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(event)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Republish a port-out event

Republish a specific port-out event.

`client.portouts.events.republish()` — `POST /portouts/events/{id}/republish`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the port-out event. |

```ruby
result = client.portouts.events.republish("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## List eligible port-out rejection codes for a specific order

Given a port-out ID, list rejection codes that are eligible for that port-out

`client.portouts.list_rejection_codes()` — `GET /portouts/rejections/{portout_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `portout_id` | string (UUID) | Yes | Identifies a port out order. |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
response = client.portouts.list_rejection_codes("329d6658-8f93-405d-862f-648776e8afd7")

puts(response)
```

Key response fields: `response.data.code, response.data.description, response.data.reason_required`

## List port-out related reports

List the reports generated about port-out operations.

`client.portouts.reports.list()` — `GET /portouts/reports`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.portouts.reports.list

puts(page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a port-out related report

Generate reports about port-out operations.

`client.portouts.reports.create()` — `POST /portouts/reports`

```ruby
report = client.portouts.reports.create(params: {filters: {}}, report_type: :export_portouts_csv)

puts(report)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a report

Retrieve a specific report generated.

`client.portouts.reports.retrieve()` — `GET /portouts/reports/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies a report. |

```ruby
report = client.portouts.reports.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(report)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a portout request

Returns the portout request based on the ID provided

`client.portouts.retrieve()` — `GET /portouts/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```ruby
portout = client.portouts.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(portout)
```

Key response fields: `response.data.id, response.data.status, response.data.state`

## List all comments for a portout request

Returns a list of comments for a portout request.

`client.portouts.comments.list()` — `GET /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```ruby
comments = client.portouts.comments.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(comments)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## Create a comment on a portout request

Creates a comment on a portout request.

`client.portouts.comments.create()` — `POST /portouts/{id}/comments`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |
| `body` | string | No | Comment to post on this portout request |

```ruby
comment = client.portouts.comments.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(comment)
```

Key response fields: `response.data.id, response.data.body, response.data.created_at`

## List supporting documents on a portout request

List every supporting documents for a portout request.

`client.portouts.supporting_documents.list()` — `GET /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |

```ruby
supporting_documents = client.portouts.supporting_documents.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(supporting_documents)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Create a list of supporting documents on a portout request

Creates a list of supporting documents on a portout request.

`client.portouts.supporting_documents.create()` — `POST /portouts/{id}/supporting_documents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Portout id |
| `documents` | array[object] | No | List of supporting documents parameters |

```ruby
supporting_document = client.portouts.supporting_documents.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(supporting_document)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Update Status

Authorize or reject portout request

`client.portouts.update_status()` — `PATCH /portouts/{id}/{status}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | Yes | Provide a reason if rejecting the port out request |
| `id` | string (UUID) | Yes | Portout id |
| `status` | enum (authorized, rejected-pending) | Yes | Updated portout status |
| `host_messaging` | boolean | No | Indicates whether messaging services should be maintained wi... |

```ruby
response = client.portouts.update_status(
  :authorized,
  id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  reason: "I do not recognize this transaction"
)

puts(response)
```

Key response fields: `response.data.id, response.data.status, response.data.state`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
