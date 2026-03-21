<!-- SDK reference: telnyx-storage-go -->

# Telnyx Storage - Go

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Generate presigned URL**: `client.Storage.PresignedUrls.Create(ctx, params)`
2. **Check bucket usage**: `client.Storage.BucketUsage.List(ctx, params)`
3. **Manage SSL cert**: `client.Storage.BucketSslCertificate.Create(ctx, params)`

### Common mistakes

- Telnyx Storage is S3-compatible — you can also use any S3 client library with Telnyx credentials
- Presigned URLs are time-limited — generate fresh URLs for each access

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Storage.PresignedUrls.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`client.Storage.Buckets.SslCertificate.Get()` — `GET /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes | The name of the bucket |

```go
	sslCertificate, err := client.Storage.Buckets.SslCertificate.Get(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", sslCertificate.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`client.Storage.Buckets.SslCertificate.New()` — `PUT /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes | The name of the bucket |

```go
	sslCertificate, err := client.Storage.Buckets.SslCertificate.New(
		context.Background(),
		"",
		telnyx.StorageBucketSslCertificateNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", sslCertificate.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`client.Storage.Buckets.SslCertificate.Delete()` — `DELETE /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes | Bucket Name |

```go
	sslCertificate, err := client.Storage.Buckets.SslCertificate.Delete(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", sslCertificate.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`client.Storage.Buckets.Usage.GetAPIUsage()` — `GET /storage/buckets/{bucketName}/usage/api`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes | The name of the bucket |

```go
	response, err := client.Storage.Buckets.Usage.GetAPIUsage(
		context.Background(),
		"",
		telnyx.StorageBucketUsageGetAPIUsageParams{
			Filter: telnyx.StorageBucketUsageGetAPIUsageParamsFilter{
				EndTime:   time.Now(),
				StartTime: time.Now(),
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.categories, response.data.timestamp, response.data.total`

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`client.Storage.Buckets.Usage.GetBucketUsage()` — `GET /storage/buckets/{bucketName}/usage/storage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes | The name of the bucket |

```go
	response, err := client.Storage.Buckets.Usage.GetBucketUsage(context.Background(), "")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.num_objects, response.data.size, response.data.size_kb`

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL. 

Refer to: https://developers.telnyx.com/docs/cloud-storage/presigned-urls

`client.Storage.Buckets.NewPresignedURL()` — `POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `BucketName` | string | Yes | The name of the bucket |
| `ObjectName` | string | Yes | The name of the object |
| `Ttl` | integer | No | The time to live of the token in seconds |

```go
	response, err := client.Storage.Buckets.NewPresignedURL(
		context.Background(),
		"",
		telnyx.StorageBucketNewPresignedURLParams{
			BucketName: "",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Content)
```

Key response fields: `response.data.content`

---

# Storage (Go) — API Details

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

### Create Presigned Object URL — `client.Storage.Buckets.NewPresignedURL()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Ttl` | integer | The time to live of the token in seconds |
