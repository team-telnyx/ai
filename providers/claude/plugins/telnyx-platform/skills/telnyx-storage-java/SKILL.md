---
name: telnyx-storage-java
description: >-
  Manage cloud storage buckets and objects using the S3-compatible Telnyx
  Storage API. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: storage
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.36.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.36.0")
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
    var result = client.messages().send(params);
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

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

```java
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateRetrieveParams;
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateRetrieveResponse;

SslCertificateRetrieveResponse sslCertificate = client.storage().buckets().sslCertificate().retrieve("");
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

```java
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateCreateParams;
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateCreateResponse;

SslCertificateCreateResponse sslCertificate = client.storage().buckets().sslCertificate().create("");
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

```java
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateDeleteParams;
import com.telnyx.sdk.models.storage.buckets.sslcertificate.SslCertificateDeleteResponse;

SslCertificateDeleteResponse sslCertificate = client.storage().buckets().sslCertificate().delete("");
```

Returns: `created_at` (date-time), `id` (string), `issued_by` (object), `issued_to` (object), `valid_from` (date-time), `valid_to` (date-time)

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

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

Returns: `categories` (array[object]), `timestamp` (date-time), `total` (object)

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

```java
import com.telnyx.sdk.models.storage.buckets.usage.UsageGetBucketUsageParams;
import com.telnyx.sdk.models.storage.buckets.usage.UsageGetBucketUsageResponse;

UsageGetBucketUsageResponse response = client.storage().buckets().usage().getBucketUsage("");
```

Returns: `num_objects` (integer), `size` (integer), `size_kb` (integer), `timestamp` (date-time)

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object. This is the equivalent to AWS S3’s “presigned” URL. Please note that Telnyx performs authentication differently from AWS S3 and you MUST NOT use the presign method of AWS s3api CLI or SDK to generate the presigned URL. 

Refer to: https://developers.telnyx.com/docs/cloud-storage/presigned-urls

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

Optional: `ttl` (integer)

```java
import com.telnyx.sdk.models.storage.buckets.BucketCreatePresignedUrlParams;
import com.telnyx.sdk.models.storage.buckets.BucketCreatePresignedUrlResponse;

BucketCreatePresignedUrlParams params = BucketCreatePresignedUrlParams.builder()
    .bucketName("")
    .objectName("")
    .build();
BucketCreatePresignedUrlResponse response = client.storage().buckets().createPresignedUrl(params);
```

Returns: `content` (object)
