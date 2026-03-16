<!-- SDK reference: telnyx-webrtc-javascript -->

# Telnyx Webrtc - JavaScript

## Core Workflow

### Prerequisites

1. Create a Credential Connection for WebRTC authentication

### Steps

1. **Create credential**: `client.telephonyCredentials.create({connectionId: ..., name: ...})`
2. **Generate SIP token**: `client.telephonyCredentials.token.create({credentialId: ...})`
3. **Use in client SDK**: `Pass the token to Telnyx WebRTC SDK (JS, iOS, Android, Flutter, React Native)`

### Common mistakes

- SIP tokens are short-lived — generate a fresh token for each session
- For push notifications on mobile: configure push credentials for APNS (iOS) or FCM (Android)

**Related skills**: telnyx-sip-javascript, telnyx-video-javascript

## Installation

```bash
npm install telnyx
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
  const result = await client.telephony_credentials.create(params);
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List mobile push credentials

`client.mobilePushCredentials.list()` — `GET /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const pushCredential of client.mobilePushCredentials.list()) {
  console.log(pushCredential.id);
}
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Creates a new mobile push credential

`client.mobilePushCredentials.create()` — `POST /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (ios) | Yes | Type of mobile push credential. |
| `certificate` | string | Yes | Certificate as received from APNs |
| `privateKey` | string | Yes | Corresponding private key to the certificate as received fro... |
| `alias` | string | Yes | Alias to uniquely identify the credential |

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

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`client.mobilePushCredentials.retrieve()` — `GET /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pushCredentialId` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```javascript
const pushCredentialResponse = await client.mobilePushCredentials.retrieve(
  '0ccc7b76-4df3-4bca-a05a-3da1ecc389f0',
);

console.log(pushCredentialResponse.data);
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`client.mobilePushCredentials.delete()` — `DELETE /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pushCredentialId` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```javascript
await client.mobilePushCredentials.delete('0ccc7b76-4df3-4bca-a05a-3da1ecc389f0');
```

## List all credentials

List all On-demand Credentials.

`client.telephonyCredentials.list()` — `GET /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const telephonyCredential of client.telephonyCredentials.list()) {
  console.log(telephonyCredential.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a credential

Create a credential.

`client.telephonyCredentials.create()` — `POST /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Identifies the Credential Connection this credential is asso... |
| `name` | string | No |  |
| `tag` | string | No | Tags a credential. |
| `expiresAt` | string | No | ISO-8601 formatted date indicating when the credential will ... |

```javascript
const telephonyCredential = await client.telephonyCredentials.create({
  connection_id: '1234567890',
});

console.log(telephonyCredential.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a credential

Get the details of an existing On-demand Credential.

`client.telephonyCredentials.retrieve()` — `GET /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const telephonyCredential = await client.telephonyCredentials.retrieve('550e8400-e29b-41d4-a716-446655440000');

console.log(telephonyCredential.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a credential

Update an existing credential.

`client.telephonyCredentials.update()` — `PATCH /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connectionId` | string (UUID) | No | Identifies the Credential Connection this credential is asso... |
| `name` | string | No |  |
| `tag` | string | No | Tags a credential. |
| ... | | | +1 optional params in the API Details section below |

```javascript
const telephonyCredential = await client.telephonyCredentials.update('550e8400-e29b-41d4-a716-446655440000');

console.log(telephonyCredential.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a credential

Delete an existing credential.

`client.telephonyCredentials.delete()` — `DELETE /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```javascript
const telephonyCredential = await client.telephonyCredentials.delete('550e8400-e29b-41d4-a716-446655440000');

console.log(telephonyCredential.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

# WebRTC (JavaScript) — API Details

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

### Create a credential — `client.telephonyCredentials.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `tag` | string | Tags a credential. |
| `expiresAt` | string | ISO-8601 formatted date indicating when the credential will expire. |

### Update a credential — `client.telephonyCredentials.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `tag` | string | Tags a credential. |
| `connectionId` | string (UUID) | Identifies the Credential Connection this credential is associated with. |
| `expiresAt` | string | ISO-8601 formatted date indicating when the credential will expire. |
