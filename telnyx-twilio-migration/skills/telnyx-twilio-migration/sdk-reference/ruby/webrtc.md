<!-- SDK reference: telnyx-webrtc-ruby -->

# Telnyx Webrtc - Ruby

## Core Workflow

### Prerequisites

1. Create a Credential Connection for WebRTC authentication

### Steps

1. **Create credential**: `client.telephony_credentials.create(connection_id: ..., name: ...)`
2. **Generate SIP token**: `client.telephony_credentials.token.create(credential_id: ...)`
3. **Use in client SDK**: `Pass the token to Telnyx WebRTC SDK (JS, iOS, Android, Flutter, React Native)`

### Common mistakes

- SIP tokens are short-lived — generate a fresh token for each session
- For push notifications on mobile: configure push credentials for APNS (iOS) or FCM (Android)

**Related skills**: telnyx-sip-ruby, telnyx-video-ruby

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
  result = client.telephony_credentials.create(params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List mobile push credentials

`client.mobile_push_credentials.list()` — `GET /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.mobile_push_credentials.list

puts(page)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Creates a new mobile push credential

`client.mobile_push_credentials.create()` — `POST /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (ios) | Yes | Type of mobile push credential. |
| `certificate` | string | Yes | Certificate as received from APNs |
| `private_key` | string | Yes | Corresponding private key to the certificate as received fro... |
| `alias` | string | Yes | Alias to uniquely identify the credential |

```ruby
push_credential_response = client.mobile_push_credentials.create(
  create_mobile_push_credential_request: {
    alias: "LucyIosCredential",
    certificate: "-----BEGIN CERTIFICATE----- MIIGVDCCBTKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END CERTIFICATE-----",
    private_key: "-----BEGIN RSA PRIVATE KEY----- MIIEpQIBAAKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END RSA PRIVATE KEY-----",
    type: :ios
  }
)

puts(push_credential_response)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`client.mobile_push_credentials.retrieve()` — `GET /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `push_credential_id` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```ruby
push_credential_response = client.mobile_push_credentials.retrieve("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")

puts(push_credential_response)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`client.mobile_push_credentials.delete()` — `DELETE /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `push_credential_id` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```ruby
result = client.mobile_push_credentials.delete("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")

puts(result)
```

## List all credentials

List all On-demand Credentials.

`client.telephony_credentials.list()` — `GET /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```ruby
page = client.telephony_credentials.list

puts(page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a credential

Create a credential.

`client.telephony_credentials.create()` — `POST /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | Identifies the Credential Connection this credential is asso... |
| `name` | string | No |  |
| `tag` | string | No | Tags a credential. |
| `expires_at` | string | No | ISO-8601 formatted date indicating when the credential will ... |

```ruby
telephony_credential = client.telephony_credentials.create(connection_id: "1234567890")

puts(telephony_credential)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a credential

Get the details of an existing On-demand Credential.

`client.telephony_credentials.retrieve()` — `GET /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
telephony_credential = client.telephony_credentials.retrieve("550e8400-e29b-41d4-a716-446655440000")

puts(telephony_credential)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a credential

Update an existing credential.

`client.telephony_credentials.update()` — `PATCH /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connection_id` | string (UUID) | No | Identifies the Credential Connection this credential is asso... |
| `name` | string | No |  |
| `tag` | string | No | Tags a credential. |
| ... | | | +1 optional params in the API Details section below |

```ruby
telephony_credential = client.telephony_credentials.update("550e8400-e29b-41d4-a716-446655440000")

puts(telephony_credential)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a credential

Delete an existing credential.

`client.telephony_credentials.delete()` — `DELETE /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```ruby
telephony_credential = client.telephony_credentials.delete("550e8400-e29b-41d4-a716-446655440000")

puts(telephony_credential)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

# WebRTC (Ruby) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List mobile push credentials, Creates a new mobile push credential, Retrieves a mobile push credential

| Field | Type |
|-------|------|
| `alias` | string |
| `certificate` | string |
| `created_at` | date-time |
| `id` | string |
| `private_key` | string |
| `project_account_json_file` | object |
| `record_type` | string |
| `type` | string |
| `updated_at` | date-time |

**Returned by:** List all credentials, Create a credential, Get a credential, Update a credential, Delete a credential

| Field | Type |
|-------|------|
| `created_at` | string |
| `expired` | boolean |
| `expires_at` | string |
| `id` | string |
| `name` | string |
| `record_type` | string |
| `resource_id` | string |
| `sip_password` | string |
| `sip_username` | string |
| `updated_at` | string |
| `user_id` | string |

## Optional Parameters

### Create a credential — `client.telephony_credentials.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `tag` | string | Tags a credential. |
| `expires_at` | string | ISO-8601 formatted date indicating when the credential will expire. |

### Update a credential — `client.telephony_credentials.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `tag` | string | Tags a credential. |
| `connection_id` | string (UUID) | Identifies the Credential Connection this credential is associated with. |
| `expires_at` | string | ISO-8601 formatted date indicating when the credential will expire. |
