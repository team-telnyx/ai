<!-- SDK reference: telnyx-webrtc-ruby -->

# Telnyx Webrtc - Ruby

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

## List mobile push credentials

`GET /mobile_push_credentials`

```ruby
page = client.mobile_push_credentials.list

puts(page)
```

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

## Creates a new mobile push credential

`POST /mobile_push_credentials`

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

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`GET /mobile_push_credentials/{push_credential_id}`

```ruby
push_credential_response = client.mobile_push_credentials.retrieve("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")

puts(push_credential_response)
```

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`DELETE /mobile_push_credentials/{push_credential_id}`

```ruby
result = client.mobile_push_credentials.delete("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")

puts(result)
```

## List all credentials

List all On-demand Credentials.

`GET /telephony_credentials`

```ruby
page = client.telephony_credentials.list

puts(page)
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Create a credential

Create a credential.

`POST /telephony_credentials` — Required: `connection_id`

Optional: `expires_at` (string), `name` (string), `tag` (string)

```ruby
telephony_credential = client.telephony_credentials.create(connection_id: "1234567890")

puts(telephony_credential)
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Get a credential

Get the details of an existing On-demand Credential.

`GET /telephony_credentials/{id}`

```ruby
telephony_credential = client.telephony_credentials.retrieve("id")

puts(telephony_credential)
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Update a credential

Update an existing credential.

`PATCH /telephony_credentials/{id}`

Optional: `connection_id` (string), `expires_at` (string), `name` (string), `tag` (string)

```ruby
telephony_credential = client.telephony_credentials.update("id")

puts(telephony_credential)
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Delete a credential

Delete an existing credential.

`DELETE /telephony_credentials/{id}`

```ruby
telephony_credential = client.telephony_credentials.delete("id")

puts(telephony_credential)
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)
