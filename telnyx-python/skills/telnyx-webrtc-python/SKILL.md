---
name: telnyx-webrtc-python
description: >-
  Manage WebRTC credentials and mobile push notification settings. Use when
  building browser-based or mobile softphone applications. This skill provides
  Python SDK examples.
metadata:
  author: telnyx
  product: webrtc
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Webrtc - Python

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

## List mobile push credentials

`GET /mobile_push_credentials`

```python
page = client.mobile_push_credentials.list()
page = page.data[0]
print(page.id)
```

## Creates a new mobile push credential

`POST /mobile_push_credentials`

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

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`GET /mobile_push_credentials/{push_credential_id}`

```python
push_credential_response = client.mobile_push_credentials.retrieve(
    "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0",
)
print(push_credential_response.data)
```

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`DELETE /mobile_push_credentials/{push_credential_id}`

```python
client.mobile_push_credentials.delete(
    "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0",
)
```

## List all credentials

List all On-demand Credentials.

`GET /telephony_credentials`

```python
page = client.telephony_credentials.list()
page = page.data[0]
print(page.id)
```

## Create a credential

Create a credential.

`POST /telephony_credentials` — Required: `connection_id`

Optional: `expires_at` (string), `name` (string), `tag` (string)

```python
telephony_credential = client.telephony_credentials.create(
    connection_id="1234567890",
)
print(telephony_credential.data)
```

## Get a credential

Get the details of an existing On-demand Credential.

`GET /telephony_credentials/{id}`

```python
telephony_credential = client.telephony_credentials.retrieve(
    "id",
)
print(telephony_credential.data)
```

## Update a credential

Update an existing credential.

`PATCH /telephony_credentials/{id}`

Optional: `connection_id` (string), `expires_at` (string), `name` (string), `tag` (string)

```python
telephony_credential = client.telephony_credentials.update(
    id="id",
)
print(telephony_credential.data)
```

## Delete a credential

Delete an existing credential.

`DELETE /telephony_credentials/{id}`

```python
telephony_credential = client.telephony_credentials.delete(
    "id",
)
print(telephony_credential.data)
```
