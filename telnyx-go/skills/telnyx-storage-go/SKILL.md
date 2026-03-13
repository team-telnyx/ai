---
name: telnyx-storage-go
description: >-
  Manage cloud storage buckets and objects using the S3-compatible Telnyx
  Storage API. This skill provides Go SDK examples.
metadata:
  internal: true
  author: telnyx
  product: storage
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - Go

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

result, err := client.Messages.Send(ctx, params)
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

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

```go
	sslCertificate, err := client.Storage.Buckets.SslCertificate.Get(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", sslCertificate.Data)
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

```go
	sslCertificate, err := client.Storage.Buckets.SslCertificate.New(
		context.TODO(),
		"",
		telnyx.StorageBucketSslCertificateNewParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", sslCertificate.Data)
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

```go
	sslCertificate, err := client.Storage.Buckets.SslCertificate.Delete(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", sslCertificate.Data)
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

```go
	response, err := client.Storage.Buckets.Usage.GetAPIUsage(
		context.TODO(),
		"",
		telnyx.StorageBucketUsageGetAPIUsageParams{
			Filter: telnyx.StorageBucketUsageGetAPIUsageParamsFilter{
				EndTime:   time.Now(),
				StartTime: time.Now(),
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `categories` (array[object]), `timestamp` (date-time), `total` (object)

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

```go
	response, err := client.Storage.Buckets.Usage.GetBucketUsage(context.TODO(), "")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

Returns: `num_objects` (integer), `size` (integer), `size_kb` (integer), `timestamp` (date-time)

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL.

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

Optional: `ttl` (integer)

```go
	response, err := client.Storage.Buckets.NewPresignedURL(
		context.TODO(),
		"",
		telnyx.StorageBucketNewPresignedURLParams{
			BucketName: "",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Content)
```

Returns: `content` (object)
