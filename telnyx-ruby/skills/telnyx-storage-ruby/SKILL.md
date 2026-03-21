---
name: telnyx-storage-ruby
description: >-
  S3-compatible cloud storage: buckets and objects.
metadata:
  author: telnyx
  product: storage
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - Ruby

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Generate presigned URL**: `client.storage.presigned_urls.create(bucket: ..., key: ..., method: ...)`
2. **Check bucket usage**: `client.storage.bucket_usage.list()`
3. **Manage SSL cert**: `client.storage.bucket_ssl_certificate.create(bucket: ...)`

### Common mistakes

- Telnyx Storage is S3-compatible — you can also use any S3 client library with Telnyx credentials
- Presigned URLs are time-limited — generate fresh URLs for each access

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
  result = client.storage.presigned_urls.create(params)
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

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`client.storage.buckets.ssl_certificate.retrieve()` — `GET /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```ruby
ssl_certificate = client.storage.buckets.ssl_certificate.retrieve("")

puts(ssl_certificate)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`client.storage.buckets.ssl_certificate.create()` — `PUT /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```ruby
ssl_certificate = client.storage.buckets.ssl_certificate.create("")

puts(ssl_certificate)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`client.storage.buckets.ssl_certificate.delete()` — `DELETE /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | Bucket Name |

```ruby
ssl_certificate = client.storage.buckets.ssl_certificate.delete("")

puts(ssl_certificate)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`client.storage.buckets.usage.get_api_usage()` — `GET /storage/buckets/{bucketName}/usage/api`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```ruby
response = client.storage.buckets.usage.get_api_usage(
  "",
  filter: {end_time: "2019-12-27T18:11:19.117Z", start_time: "2019-12-27T18:11:19.117Z"}
)

puts(response)
```

Key response fields: `response.data.categories, response.data.timestamp, response.data.total`

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`client.storage.buckets.usage.get_bucket_usage()` — `GET /storage/buckets/{bucketName}/usage/storage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | The name of the bucket |

```ruby
response = client.storage.buckets.usage.get_bucket_usage("")

puts(response)
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

```ruby
response = client.storage.buckets.create_presigned_url("", bucket_name: "")

puts(response)
```

Key response fields: `response.data.content`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
