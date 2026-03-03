---
name: telnyx-storage-python
description: >-
  Manage cloud storage buckets and objects using the S3-compatible Telnyx
  Storage API. This skill provides Python SDK examples.
metadata:
  author: telnyx
  product: storage
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - Python

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

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

```python
ssl_certificate = client.storage.buckets.ssl_certificate.retrieve(
    "",
)
print(ssl_certificate.data)
```

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

```python
ssl_certificate = client.storage.buckets.ssl_certificate.create(
    bucket_name="",
)
print(ssl_certificate.data)
```

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

```python
ssl_certificate = client.storage.buckets.ssl_certificate.delete(
    "",
)
print(ssl_certificate.data)
```

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

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

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

```python
response = client.storage.buckets.usage.get_bucket_usage(
    "",
)
print(response.data)
```

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object.

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

Optional: `ttl` (integer)

```python
response = client.storage.buckets.create_presigned_url(
    object_name="",
    bucket_name="",
)
print(response.content)
```
