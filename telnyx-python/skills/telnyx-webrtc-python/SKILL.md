---
name: telnyx-webrtc-python
description: >-
  WebRTC credentials and push notification settings. Use for browser or mobile
  softphone apps.
metadata:
  author: telnyx
  product: webrtc
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Webrtc - Python

## Core Workflow

### Prerequisites

1. Create a Credential Connection for WebRTC authentication

### Steps

1. **Create credential**: `client.telephony_credentials.create(connection_id=..., name=...)`
2. **Generate SIP token**: `client.telephony_credentials.token.create(credential_id=...)`
3. **Use in client SDK**: `Pass the token to Telnyx WebRTC SDK (JS, iOS, Android, Flutter, React Native)`

### Common mistakes

- SIP tokens are short-lived — generate a fresh token for each session
- For push notifications on mobile: configure push credentials for APNS (iOS) or FCM (Android)

**Related skills**: telnyx-sip-python, telnyx-video-python

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.telephony_credentials.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List mobile push credentials

`client.mobile_push_credentials.list()` — `GET /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.mobile_push_credentials.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Creates a new mobile push credential

`client.mobile_push_credentials.create()` — `POST /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type_` | enum (ios) | Yes | Type of mobile push credential. |
| `certificate` | string | Yes | Certificate as received from APNs |
| `private_key` | string | Yes | Corresponding private key to the certificate as received fro... |
| `alias` | string | Yes | Alias to uniquely identify the credential |

```python
push_credential_response = client.mobile_push_credentials.create(
    create_mobile_push_credential_request={
        "alias": "LucyIosCredential",
        "certificate": "-----BEGIN CERTIFICATE----- MIIGVDCCBTKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END CERTIFICATE-----",
        "private_key": "-----BEGIN RSA PRIVATE KEY----- MIIEpQIBAAKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END RSA PRIVATE KEY-----",
        "type": "ios",
    },
)
print(push_credential_response.data)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`client.mobile_push_credentials.retrieve()` — `GET /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `push_credential_id` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```python
push_credential_response = client.mobile_push_credentials.retrieve(
    "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0",
)
print(push_credential_response.data)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`client.mobile_push_credentials.delete()` — `DELETE /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `push_credential_id` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```python
client.mobile_push_credentials.delete(
    "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0",
)
```

## List all credentials

List all On-demand Credentials.

`client.telephony_credentials.list()` — `GET /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.telephony_credentials.list()
page = page.data[0]
print(page.id)
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

```python
telephony_credential = client.telephony_credentials.create(
    connection_id="1234567890",
)
print(telephony_credential.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a credential

Get the details of an existing On-demand Credential.

`client.telephony_credentials.retrieve()` — `GET /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
telephony_credential = client.telephony_credentials.retrieve(
    "id",
)
print(telephony_credential.data)
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
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```python
telephony_credential = client.telephony_credentials.update(
    id="550e8400-e29b-41d4-a716-446655440000",
)
print(telephony_credential.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a credential

Delete an existing credential.

`client.telephony_credentials.delete()` — `DELETE /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
telephony_credential = client.telephony_credentials.delete(
    "id",
)
print(telephony_credential.data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
