<!-- SDK reference: telnyx-webrtc-java -->

# Telnyx Webrtc - Java

## Core Workflow

### Prerequisites

1. Create a Credential Connection for WebRTC authentication

### Steps

1. **Create credential**: `client.telephonyCredentials().create(params)`
2. **Generate SIP token**: `client.telephonyCredentials().token().create(params)`
3. **Use in client SDK**: `Pass the token to Telnyx WebRTC SDK (JS, iOS, Android, Flutter, React Native)`

### Common mistakes

- SIP tokens are short-lived — generate a fresh token for each session
- For push notifications on mobile: configure push credentials for APNS (iOS) or FCM (Android)

**Related skills**: telnyx-sip-java, telnyx-video-java

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
    var result = client.telephonyCredentials().create(params);
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

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List mobile push credentials

`client.mobilePushCredentials().list()` — `GET /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialListPage;
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialListParams;

MobilePushCredentialListPage page = client.mobilePushCredentials().list();
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Creates a new mobile push credential

`client.mobilePushCredentials().create()` — `POST /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (ios) | Yes | Type of mobile push credential. |
| `certificate` | string | Yes | Certificate as received from APNs |
| `privateKey` | string | Yes | Corresponding private key to the certificate as received fro... |
| `alias` | string | Yes | Alias to uniquely identify the credential |

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

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`client.mobilePushCredentials().retrieve()` — `GET /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pushCredentialId` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialRetrieveParams;
import com.telnyx.sdk.models.mobilepushcredentials.PushCredentialResponse;

PushCredentialResponse pushCredentialResponse = client.mobilePushCredentials().retrieve("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0");
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`client.mobilePushCredentials().delete()` — `DELETE /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pushCredentialId` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```java
import com.telnyx.sdk.models.mobilepushcredentials.MobilePushCredentialDeleteParams;

client.mobilePushCredentials().delete("0ccc7b76-4df3-4bca-a05a-3da1ecc389f0");
```

## List all credentials

List all On-demand Credentials.

`client.telephonyCredentials().list()` — `GET /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialListPage;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialListParams;

TelephonyCredentialListPage page = client.telephonyCredentials().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a credential

Create a credential.

`client.telephonyCredentials().create()` — `POST /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Identifies the Credential Connection this credential is asso... |
| `name` | string | No |  |
| `tag` | string | No | Tags a credential. |
| `expiresAt` | string | No | ISO-8601 formatted date indicating when the credential will ... |

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialCreateResponse;

TelephonyCredentialCreateParams params = TelephonyCredentialCreateParams.builder()
    .connectionId("1234567890")
    .build();
TelephonyCredentialCreateResponse telephonyCredential = client.telephonyCredentials().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a credential

Get the details of an existing On-demand Credential.

`client.telephonyCredentials().retrieve()` — `GET /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialRetrieveParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialRetrieveResponse;

TelephonyCredentialRetrieveResponse telephonyCredential = client.telephonyCredentials().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a credential

Update an existing credential.

`client.telephonyCredentials().update()` — `PATCH /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `connectionId` | string (UUID) | No | Identifies the Credential Connection this credential is asso... |
| `name` | string | No |  |
| `tag` | string | No | Tags a credential. |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialUpdateParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialUpdateResponse;

TelephonyCredentialUpdateResponse telephonyCredential = client.telephonyCredentials().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a credential

Delete an existing credential.

`client.telephonyCredentials().delete()` — `DELETE /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialDeleteParams;
import com.telnyx.sdk.models.telephonycredentials.TelephonyCredentialDeleteResponse;

TelephonyCredentialDeleteResponse telephonyCredential = client.telephonyCredentials().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

# WebRTC (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List mobile push credentials, Creates a new mobile push credential, Retrieves a mobile push credential

| Field | Type |
|-------|------|
| `alias` | string |
| `certificate` | string |
| `created_at` | date-time |
| `id` | string |
| `private_key` | string |
| `project_account_json_file` | object |
| `record_type` | string |
| `type` | string |
| `updated_at` | date-time |

**Returned by:** List all credentials, Create a credential, Get a credential, Update a credential, Delete a credential

| Field | Type |
|-------|------|
| `created_at` | string |
| `expired` | boolean |
| `expires_at` | string |
| `id` | string |
| `name` | string |
| `record_type` | string |
| `resource_id` | string |
| `sip_password` | string |
| `sip_username` | string |
| `updated_at` | string |
| `user_id` | string |

## Optional Parameters

### Create a credential — `client.telephonyCredentials().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `tag` | string | Tags a credential. |
| `expiresAt` | string | ISO-8601 formatted date indicating when the credential will expire. |

### Update a credential — `client.telephonyCredentials().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `tag` | string | Tags a credential. |
| `connectionId` | string (UUID) | Identifies the Credential Connection this credential is associated with. |
| `expiresAt` | string | ISO-8601 formatted date indicating when the credential will expire. |
