---
name: telnyx-seti-ruby
description: >-
  Access SETI (Space Exploration Telecommunications Infrastructure) APIs. This
  skill provides Ruby SDK examples.
metadata:
  internal: true
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

## Get Enum

`GET /10dlc/enum/{endpoint}`

```ruby
response = client.messaging_10dlc.get_enum(:mno)

puts(response)
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`GET /seti/black_box_test_results`

```ruby
response = client.seti.retrieve_black_box_test_results

puts(response)
```

Returns: `black_box_tests` (array[object]), `product` (string), `record_type` (string)
