<!-- SDK reference: telnyx-storage-java -->

# Telnyx Storage - Java

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Generate presigned URL**: `client.storage().presignedUrls().create(params)`
2. **Check bucket usage**: `client.storage().bucketUsage().list(params)`
3. **Manage SSL cert**: `client.storage().bucketSslCertificate().create(params)`

### Common mistakes

- Telnyx Storage is S3-compatible — you can also use any S3 client library with Telnyx credentials
- Presigned URLs are time-limited — generate fresh URLs for each access

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.storage().presignedUrls().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`client.storage().buckets().sslCertificate().retrieve()` — `GET /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```java
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateRetrieveParams;
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateRetrieveResponse;

SslCertificateRetrieveResponse sslCertificate = client.storage().buckets().sslCertificate().retrieve("");
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`client.storage().buckets().sslCertificate().create()` — `PUT /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```java
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateCreateParams;
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateCreateResponse;

SslCertificateCreateResponse sslCertificate = client.storage().buckets().sslCertificate().create("");
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`client.storage().buckets().sslCertificate().delete()` — `DELETE /storage/buckets/{bucketName}/ssl_certificate`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | Bucket Name |

```java
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateDeleteParams;
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateDeleteResponse;

SslCertificateDeleteResponse sslCertificate = client.storage().buckets().sslCertificate().delete("");
```

Key response fields: `response.data.id, response.data.created_at, response.data.issued_by`

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`client.storage().buckets().usage().getApiUsage()` — `GET /storage/buckets/{bucketName}/usage/api`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```java
import com.telnyx.sdk.models.storage.buckets.usage.UsageGetApiUsageParams;
import com.telnyx.sdk.models.storage.buckets.usage.UsageGetApiUsageResponse;
import java.time.OffsetDateTime;

UsageGetApiUsageParams params = UsageGetApiUsageParams.builder()
    .bucketName("")
    .filter(UsageGetApiUsageParams.Filter.builder()
        .endTime(OffsetDateTime.parse("2019-12-27T18:11:19.117Z"))
        .startTime(OffsetDateTime.parse("2019-12-27T18:11:19.117Z"))
        .build())
    .build();
UsageGetApiUsageResponse response = client.storage().buckets().usage().getApiUsage(params);
```

Key response fields: `response.data.categories, response.data.timestamp, response.data.total`

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`client.storage().buckets().usage().getBucketUsage()` — `GET /storage/buckets/{bucketName}/usage/storage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |

```java
import com.telnyx.sdk.models.storage.buckets.usage.UsageGetBucketUsageParams;
import com.telnyx.sdk.models.storage.buckets.usage.UsageGetBucketUsageResponse;

UsageGetBucketUsageResponse response = client.storage().buckets().usage().getBucketUsage("");
```

Key response fields: `response.data.num_objects, response.data.size, response.data.size_kb`

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL. 

Refer to: https://developers.telnyx.com/docs/cloud-storage/presigned-urls

`client.storage().buckets().createPresignedUrl()` — `POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucketName` | string | Yes | The name of the bucket |
| `objectName` | string | Yes | The name of the object |
| `ttl` | integer | No | The time to live of the token in seconds |

```java
import com.telnyx.sdk.models.storage.buckets.BucketCreatePresignedUrlParams;
import com.telnyx.sdk.models.storage.buckets.BucketCreatePresignedUrlResponse;

BucketCreatePresignedUrlParams params = BucketCreatePresignedUrlParams.builder()
    .bucketName("")
    .objectName("")
    .build();
BucketCreatePresignedUrlResponse response = client.storage().buckets().createPresignedUrl(params);
```

Key response fields: `response.data.content`

---

# Storage (Java) — API Details

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

### Create Presigned Object URL — `client.storage().buckets().createPresignedUrl()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttl` | integer | The time to live of the token in seconds |
