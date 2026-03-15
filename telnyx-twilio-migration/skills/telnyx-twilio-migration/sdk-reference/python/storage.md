<!-- SDK reference: telnyx-storage-python -->

# Telnyx Storage - Python

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Generate presigned URL**: `client.storage.presigned_urls.create(bucket=..., key=..., method=...)`
2. **Check bucket usage**: `client.storage.bucket_usage.list()`
3. **Manage SSL cert**: `client.storage.bucket_ssl_certificate.create(bucket=...)`

### Common mistakes

- Telnyx Storage is S3-compatible — you can also use any S3 client library with Telnyx credentials
- Presigned URLs are time-limited — generate fresh URLs for each access

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
    result = client.storage.presigned_urls.create(params)
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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`client.storage.buckets.ssl_certificate.retrieve()` — `GET /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```python
ssl_certificate = client.storage.buckets.ssl_certificate.retrieve(
    "",
)
print(ssl_certificate.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`client.storage.buckets.ssl_certificate.create()` — `PUT /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```python
ssl_certificate = client.storage.buckets.ssl_certificate.create(
    bucket_name="",
)
print(ssl_certificate.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`client.storage.buckets.ssl_certificate.delete()` — `DELETE /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | Bucket Name |

```python
ssl_certificate = client.storage.buckets.ssl_certificate.delete(
    "",
)
print(ssl_certificate.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`client.storage.buckets.usage.get_api_usage()` — `GET /storage/buckets/{bucketName}/usage/api`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```python
from datetime import datetime

response = client.storage.buckets.usage.get_api_usage(
    bucket_name="",
    filter={
        "end_time": datetime.fromisoformat("2019-12-27T18:11:19.117"),
        "start_time": datetime.fromisoformat("2019-12-27T18:11:19.117"),
    },
)
print(response.data)
```

Key response fields: `response.data.categories, response.data.timestamp, response.data.total`

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`client.storage.buckets.usage.get_bucket_usage()` — `GET /storage/buckets/{bucketName}/usage/storage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```python
response = client.storage.buckets.usage.get_bucket_usage(
    "",
)
print(response.data)
```

Key response fields: `response.data.num_objects, response.data.size, response.data.size_kb`

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL. 

Refer to: https://developers.telnyx.com/docs/cloud-storage/presigned-urls

`client.storage.buckets.create_presigned_url()` — `POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |
| `object_name` | string | Yes | The name of the object |
| `ttl` | integer | No | The time to live of the token in seconds |

```python
response = client.storage.buckets.create_presigned_url(
    object_name="",
    bucket_name="",
)
print(response.content)
```

Key response fields: `response.data.content`

---

# Storage (Python) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Get Bucket SSL Certificate, Add SSL Certificate, Remove SSL Certificate

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `issued_by` | object |
| `issued_to` | object |
| `valid_from` | date-time |
| `valid_to` | date-time |

**Returned by:** Get API Usage

| Field | Type |
|-------|------|
| `categories` | array[object] |
| `timestamp` | date-time |
| `total` | object |

**Returned by:** Get Bucket Usage

| Field | Type |
|-------|------|
| `num_objects` | integer |
| `size` | integer |
| `size_kb` | integer |
| `timestamp` | date-time |

**Returned by:** Create Presigned Object URL

| Field | Type |
|-------|------|
| `content` | object |

## Optional Parameters

### Create Presigned Object URL — `client.storage.buckets.create_presigned_url()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttl` | integer | The time to live of the token in seconds |
