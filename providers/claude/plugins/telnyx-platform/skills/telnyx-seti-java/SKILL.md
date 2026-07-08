---
name: telnyx-seti-java
description: >-
  Access SETI (Space Exploration Telecommunications Infrastructure) APIs. This
  skill provides Java SDK examples.
metadata:
  author: telnyx
  product: seti
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Seti - Java

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

## Get Enum

`GET /10dlc/enum/{endpoint}`

```java
import com.telnyx.sdk.models.messaging10dlc.Messaging10dlcGetEnumParams;
import com.telnyx.sdk.models.messaging10dlc.Messaging10dlcGetEnumResponse;

Messaging10dlcGetEnumResponse response = client.messaging10dlc().getEnum(Messaging10dlcGetEnumParams.Endpoint.MNO);
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`GET /seti/black_box_test_results`

```java
import com.telnyx.sdk.models.seti.SetiRetrieveBlackBoxTestResultsParams;
import com.telnyx.sdk.models.seti.SetiRetrieveBlackBoxTestResultsResponse;

SetiRetrieveBlackBoxTestResultsResponse response = client.seti().retrieveBlackBoxTestResults();
```

Returns: `black_box_tests` (array[object]), `product` (string), `record_type` (string)
