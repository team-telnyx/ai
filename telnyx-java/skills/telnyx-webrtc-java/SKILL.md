---
name: telnyx-webrtc-java
description: >-
  Manage WebRTC credentials and mobile push notification settings. Use when
  building browser-based or mobile softphone applications. This skill provides
  Java SDK examples.
metadata:
  author: telnyx
  product: webrtc
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Webrtc - Java

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

## List mobile push credentials

`GET /mobile_push_credentials`

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialListPage;
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialListParams;

MobilePushCredentialListPage page = client.mobilePushCredentials().list();
```

## Creates a new mobile push credential

`POST /mobile_push_credentials`

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialCreateParams;
import com.telnyx.sdk.models.mobilepushcredentials.PushCredentialResponse;

MobilePushCredentialCreateParams.CreateMobilePushCredentialRequest.Ios params = MobilePushCredentialCreateParams.CreateMobilePushCredentialRequest.Ios.builder()
    .alias("LucyIosCredential")
    .certificate("-----BEGIN CERTIFICATE----- MIIGVDCCBTKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END CERTIFICATE-----")
    .privateKey("-----BEGIN RSA PRIVATE KEY----- MIIEpQIBAAKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END RSA PRIVATE KEY-----")
    .build();
PushCredentialResponse pushCredentialResponse = client.mobilePushCredentials().create(params);
```

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`GET /mobile_push_credentials/{push_credential_id}`

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialRetrieveParams;
import com.telnyx.sdk.models.mobilepushcredentials.PushCredentialResponse;

PushCredentialResponse pushCredentialResponse = client.mobilePushCredentials().retrieve("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0");
```

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`DELETE /mobile_push_credentials/{push_credential_id}`

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialDeleteParams;

client.mobilePushCredentials().delete("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0");
```

## List all credentials

List all On-demand Credentials.

`GET /telephony_credentials`

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialListPage;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialListParams;

TelephonyCredentialListPage page = client.telephonyCredentials().list();
```

## Create a credential

Create a credential.

`POST /telephony_credentials` — Required: `connection_id`

Optional: `expires_at` (string), `name` (string), `tag` (string)

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateResponse;

TelephonyCredentialCreateParams params = TelephonyCredentialCreateParams.builder()
    .connectionId("1234567890")
    .build();
TelephonyCredentialCreateResponse telephonyCredential = client.telephonyCredentials().create(params);
```

## Get a credential

Get the details of an existing On-demand Credential.

`GET /telephony_credentials/{id}`

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialRetrieveParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialRetrieveResponse;

TelephonyCredentialRetrieveResponse telephonyCredential = client.telephonyCredentials().retrieve("id");
```

## Update a credential

Update an existing credential.

`PATCH /telephony_credentials/{id}`

Optional: `connection_id` (string), `expires_at` (string), `name` (string), `tag` (string)

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialUpdateParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialUpdateResponse;

TelephonyCredentialUpdateResponse telephonyCredential = client.telephonyCredentials().update("id");
```

## Delete a credential

Delete an existing credential.

`DELETE /telephony_credentials/{id}`

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialDeleteParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialDeleteResponse;

TelephonyCredentialDeleteResponse telephonyCredential = client.telephonyCredentials().delete("id");
```
