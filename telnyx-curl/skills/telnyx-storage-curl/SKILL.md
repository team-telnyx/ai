---
name: telnyx-storage-curl
description: >-
  Manage cloud storage buckets and objects using the S3-compatible Telnyx
  Storage API. This skill provides REST API (curl) examples.
metadata:
  internal: true
  author: telnyx
  product: storage
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/buckets/{bucketName}/ssl_certificate"
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "certificate=@/path/to/file" \
  -F "private_key=@/path/to/file" \
  "https://api.telnyx.com/v2/storage/buckets/{bucketName}/ssl_certificate"
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/storage/buckets/{bucketName}/ssl_certificate"
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/buckets/{bucketName}/usage/api?filter={'start_time': '2020-01-01T00:00:00.000Z', 'end_time': '2020-01-01T00:00:00.000Z'}"
```

Returns: `categories` (array[object]), `timestamp` (date-time), `total` (object)

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/buckets/{bucketName}/usage/storage"
```

Returns: `num_objects` (integer), `size` (integer), `size_kb` (integer), `timestamp` (date-time)

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL.

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

Optional: `ttl` (integer)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "ttl": 60
}' \
  "https://api.telnyx.com/v2/storage/buckets/{bucketName}/{objectName}/presigned_url"
```

Returns: `content` (object)
