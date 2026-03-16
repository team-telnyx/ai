---
name: telnyx-seti-ruby
description: >-
  SETI (Space Exploration Telecommunications Infrastructure) APIs.
metadata:
  author: telnyx
  product: seti
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Seti - Ruby

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
  result = client.messages.send_(to: "+13125550001", from: "+13125550002", text: "Hello")
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Get Enum

`client.messaging_10dlc.get_enum()` — `GET /10dlc/enum/{endpoint}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endpoint` | enum (mno, optionalAttributes, usecase, vertical, altBusinessIdType, ...) | Yes |  |

```ruby
response = client.messaging_10dlc.get_enum(:mno)

puts(response)
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`client.seti.retrieve_black_box_test_results()` — `GET /seti/black_box_test_results`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
response = client.seti.retrieve_black_box_test_results

puts(response)
```

Key response fields: `response.data.black_box_tests, response.data.product, response.data.record_type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
