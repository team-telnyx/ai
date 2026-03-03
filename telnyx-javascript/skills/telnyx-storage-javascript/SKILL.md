---
name: telnyx-storage-javascript
description: >-
  Manage cloud storage buckets and objects using the S3-compatible Telnyx
  Storage API. This skill provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: storage
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Storage - JavaScript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Get Bucket SSL Certificate

Returns the stored certificate detail of a bucket, if applicable.

`GET /storage/buckets/{bucketName}/ssl_certificate`

```javascript
const sslCertificate = await client.storage.buckets.sslCertificate.retrieve('');

console.log(sslCertificate.data);
```

## Add SSL Certificate

Uploads an SSL certificate and its matching secret so that you can use Telnyx's storage as your CDN.

`PUT /storage/buckets/{bucketName}/ssl_certificate`

```javascript
const sslCertificate = await client.storage.buckets.sslCertificate.create('');

console.log(sslCertificate.data);
```

## Remove SSL Certificate

Deletes an SSL certificate and its matching secret.

`DELETE /storage/buckets/{bucketName}/ssl_certificate`

```javascript
const sslCertificate = await client.storage.buckets.sslCertificate.delete('');

console.log(sslCertificate.data);
```

## Get API Usage

Returns the detail on API usage on a bucket of a particular time period, group by method category.

`GET /storage/buckets/{bucketName}/usage/api`

```javascript
const response = await client.storage.buckets.usage.getAPIUsage('', {
  filter: { end_time: '2019-12-27T18:11:19.117Z', start_time: '2019-12-27T18:11:19.117Z' },
});

console.log(response.data);
```

## Get Bucket Usage

Returns the amount of storage space and number of files a bucket takes up.

`GET /storage/buckets/{bucketName}/usage/storage`

```javascript
const response = await client.storage.buckets.usage.getBucketUsage('');

console.log(response.data);
```

## Create Presigned Object URL

Returns a timed and authenticated URL to download (GET) or upload (PUT) an object.

`POST /storage/buckets/{bucketName}/{objectName}/presigned_url`

Optional: `ttl` (integer)

```javascript
const response = await client.storage.buckets.createPresignedURL('', { bucketName: '' });

console.log(response.content);
```
