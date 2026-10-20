<!-- SDK reference: telnyx-webrtc-javascript -->

# Telnyx Webrtc - JavaScript

## Installation

```bash
npm install telnyx@6.74.2
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.messages.send({ to: '+13125550001', from: '+13125550002', text: 'Hello' });
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

## List mobile push credentials

Returns a paginated list of the mobile push credentials on your account, with support for filtering.

`GET /mobile_push_credentials`

```javascript
// Automatically fetches more pages as needed.
for await (const pushCredential of client.mobilePushCredentials.list()) {
  console.log(pushCredential.id);
}
```

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

## Creates a new mobile push credential

Creates a new mobile push credential for delivering push notifications to iOS or Android apps, and returns the created credential.

`POST /mobile_push_credentials` — Required: `type`, `certificate`, `private_key`, `alias`

```javascript
const pushCredentialResponse = await client.mobilePushCredentials.create({
  createMobilePushCredentialRequest: {
    alias: 'LucyIosCredential',
    certificate:
      '-----BEGIN CERTIFICATE----- MIIGVDCCBTKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END CERTIFICATE-----',
    private_key:
      '-----BEGIN RSA PRIVATE KEY----- MIIEpQIBAAKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END RSA PRIVATE KEY-----',
    type: 'ios',
  },
});

console.log(pushCredentialResponse.data);
```

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`GET /mobile_push_credentials/{push_credential_id}`

```javascript
const pushCredentialResponse = await client.mobilePushCredentials.retrieve(
  '0ccc7b76-4df3-4bca-a05a-3da1ecc389f0',
);

console.log(pushCredentialResponse.data);
```

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`DELETE /mobile_push_credentials/{push_credential_id}`

```javascript
await client.mobilePushCredentials.delete('0ccc7b76-4df3-4bca-a05a-3da1ecc389f0');
```

## List all credentials

Returns a paginated list of the on-demand telephony credentials on your account, with support for filtering.

`GET /telephony_credentials`

```javascript
// Automatically fetches more pages as needed.
for await (const telephonyCredential of client.telephonyCredentials.list()) {
  console.log(telephonyCredential.id);
}
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Create a credential

Creates a new on-demand telephony credential for the specified connection. The credential can then be used to generate access tokens for SIP or WebRTC clients.

`POST /telephony_credentials` — Required: `connection_id`

Optional: `expires_at` (string), `name` (string), `tag` (string)

```javascript
const telephonyCredential = await client.telephonyCredentials.create({
  connection_id: '1234567890',
});

console.log(telephonyCredential.data);
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Get a credential

Get the details of an existing On-demand Credential.

`GET /telephony_credentials/{id}`

```javascript
const telephonyCredential = await client.telephonyCredentials.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(telephonyCredential.data);
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Update a credential

Updates the specified telephony credential and returns the updated credential.

`PATCH /telephony_credentials/{id}`

Optional: `connection_id` (string), `expires_at` (string), `name` (string), `tag` (string)

```javascript
const telephonyCredential = await client.telephonyCredentials.update('550e8400-e29b-41d4-a716-446655440000');

console.log(telephonyCredential.data);
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

## Delete a credential

Permanently deletes the specified telephony credential, revoking any access it provided.

`DELETE /telephony_credentials/{id}`

```javascript
const telephonyCredential = await client.telephonyCredentials.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(telephonyCredential.data);
```

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)
