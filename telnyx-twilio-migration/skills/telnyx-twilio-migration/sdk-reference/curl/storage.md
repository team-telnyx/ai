<!-- SDK reference: telnyx-storage-curl -->

# Telnyx Storage - curl

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Generate presigned URL**
2. **Check bucket usage**
3. **Manage SSL cert**

### Common mistakes

- Telnyx Storage is S3-compatible — you can also use any S3 client library with Telnyx credentials
- Presigned URLs are time-limited — generate fresh URLs for each access

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
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

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

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/buckets/{bucketName}/ssl_certificate"
```

Key response fields: `.data.id, .data.created_at, .data.issued_by`

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "certificate=@/path/to/file" \
  -F "private_key=@/path/to/file" \
  "https://api.telnyx.com/v2/storage/buckets/{bucketName}/ssl_certificate"
```

Key response fields: `.data.id, .data.created_at, .data.issued_by`

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | Bucket Name |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/storage/buckets/{bucketName}/ssl_certificate"
```

Key response fields: `.data.id, .data.created_at, .data.issued_by`

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/buckets/{bucketName}/usage/api?filter={'start_time': '2020-01-01T00:00:00.000Z', 'end_time': '2020-01-01T00:00:00.000Z'}"
```

Key response fields: `.data.categories, .data.timestamp, .data.total`

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/storage/buckets/{bucketName}/usage/storage"
```

Key response fields: `.data.num_objects, .data.size, .data.size_kb`

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL. 

Refer to: https://developers.telnyx.com/docs/cloud-storage/presigned-urls

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |
| `objectName` | string | Yes | The name of the object |
| `ttl` | integer | No | The time to live of the token in seconds |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/storage/buckets/{bucketName}/{objectName}/presigned_url"
```

Key response fields: `.data.content`

---

# Storage (curl) — API Details

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

### Create Presigned Object URL

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttl` | integer | The time to live of the token in seconds |
