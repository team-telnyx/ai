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
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

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
