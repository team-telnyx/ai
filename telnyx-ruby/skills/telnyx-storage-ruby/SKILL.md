---
name: telnyx-storage-ruby
description: >-
  Manage cloud storage buckets and objects using the S3-compatible Telnyx
  Storage API. This skill provides Ruby SDK examples.
metadata:
  author: telnyx
  product: storage
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - Ruby

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

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

```ruby
ssl_certificate = client.storage.buckets.ssl_certificate.retrieve("")

puts(ssl_certificate)
```

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

```ruby
ssl_certificate = client.storage.buckets.ssl_certificate.create("")

puts(ssl_certificate)
```

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

```ruby
ssl_certificate = client.storage.buckets.ssl_certificate.delete("")

puts(ssl_certificate)
```

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

```ruby
response = client.storage.buckets.usage.get_api_usage(
  "",
  filter: {end_time: "2019-12-27T18:11:19.117Z", start_time: "2019-12-27T18:11:19.117Z"}
)

puts(response)
```

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

```ruby
response = client.storage.buckets.usage.get_bucket_usage("")

puts(response)
```

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object.

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

Optional: `ttl` (integer)

```ruby
response = client.storage.buckets.create_presigned_url("", bucket_name: "")

puts(response)
```
