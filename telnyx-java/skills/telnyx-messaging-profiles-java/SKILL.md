---
name: telnyx-messaging-profiles-java
description: >-
  Messaging profiles: number pools, sticky sender, geomatch, short codes.
  Controls routing and webhook config for messaging.
metadata:
  author: telnyx
  product: messaging-profiles
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Profiles - Java

## Core Workflow

### Prerequisites

1. Buy phone number(s) to assign to the profile (see telnyx-numbers-java)

### Steps

1. **Create profile**: `client.messagingProfiles().create(params)`
2. **Configure webhooks**: `client.messagingProfiles().update(params)`
3. **Assign numbers**: `client.phoneNumbers().messaging().update(params)`
4. **(Optional) Enable number pool**: `client.messagingProfiles().update(params)`

### Common mistakes

- NEVER omit whitelisted_destinations — messages fail if the destination country is not whitelisted
- NEVER send messages with a disabled messaging profile — error 40312
- NEVER forget to assign numbers to the profile — the from number will be rejected
- Number pool requires number_pool_settings to be set AND multiple numbers assigned
- Setting messaging_profile_id to empty string unassigns the number — use null/omit to keep current value

**Related skills**: telnyx-messaging-java, telnyx-numbers-java, telnyx-10dlc-java

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
    var result = client.messagingProfiles().create(params);
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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Create a messaging profile

`client.messagingProfiles().create()` — `POST /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | A user friendly name for the messaging profile. |
| `whitelistedDestinations` | array[string] | Yes | Destinations to which the messaging profile is allowed to se... |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `webhookApiVersion` | enum (1, 2, 2010-04-01) | No | Determines which webhook format will be used, Telnyx API v1,... |
| ... | | | +13 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileCreateParams;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileCreateResponse;

MessagingProfileCreateParams params = MessagingProfileCreateParams.builder()
    .name("My name")
    .addWhitelistedDestination("US")
    .build();
MessagingProfileCreateResponse messagingProfile = client.messagingProfiles().create(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List messaging profiles

`client.messagingProfiles().list()` — `GET /messaging_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter[name][eq]` | string | No | Filter profiles by exact name match. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileListPage;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileListParams;

MessagingProfileListPage page = client.messagingProfiles().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve a messaging profile

`client.messagingProfiles().retrieve()` — `GET /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileRetrieveParams;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileRetrieveResponse;

MessagingProfileRetrieveResponse messagingProfile = client.messagingProfiles().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a messaging profile

`client.messagingProfiles().update()` — `PATCH /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this messaging profile wil... |
| `webhookFailoverUrl` | string (URL) | No | The failover URL where webhooks related to this messaging pr... |
| `recordType` | enum (messaging_profile) | No | Identifies the type of the resource. |
| ... | | | +17 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileUpdateParams;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileUpdateResponse;

MessagingProfileUpdateResponse messagingProfile = client.messagingProfiles().update("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List phone numbers associated with a messaging profile

`client.messagingProfiles().listPhoneNumbers()` — `GET /messaging_profiles/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileListPhoneNumbersPage;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileListPhoneNumbersParams;

MessagingProfileListPhoneNumbersPage page = client.messagingProfiles().listPhoneNumbers("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.phone_number, response.data.type`

## Delete a messaging profile

`client.messagingProfiles().delete()` — `DELETE /messaging_profiles/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileDeleteParams;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileDeleteResponse;

MessagingProfileDeleteResponse messagingProfile = client.messagingProfiles().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List short codes associated with a messaging profile

`client.messagingProfiles().listShortCodes()` — `GET /messaging_profiles/{id}/short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the messaging profile to retrieve |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileListShortCodesPage;
import com.telnyx.sdk.models.messagingprofiles.MessagingProfileListShortCodesParams;

MessagingProfileListShortCodesPage page = client.messagingProfiles().listShortCodes("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## List short codes

`client.shortCodes().list()` — `GET /short_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.shortcodes.ShortCodeListPage;
import com.telnyx.sdk.models.shortcodes.ShortCodeListParams;

ShortCodeListPage page = client.shortCodes().list();
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Retrieve a short code

`client.shortCodes().retrieve()` — `GET /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The id of the short code |

```java
import com.telnyx.sdk.models.shortcodes.ShortCodeRetrieveParams;
import com.telnyx.sdk.models.shortcodes.ShortCodeRetrieveResponse;

ShortCodeRetrieveResponse shortCode = client.shortCodes().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

## Update short code

Update the settings for a specific short code. To unbind a short code from a profile, set the `messaging_profile_id` to `null` or an empty string. To add or update tags, include the tags field as an array of strings.

`client.shortCodes().update()` — `PATCH /short_codes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | Yes | Unique identifier for a messaging profile. |
| `id` | string (UUID) | Yes | The id of the short code |
| `tags` | array[string] | No |  |

```java
import com.telnyx.sdk.models.shortcodes.ShortCodeUpdateParams;
import com.telnyx.sdk.models.shortcodes.ShortCodeUpdateResponse;

ShortCodeUpdateParams params = ShortCodeUpdateParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .messagingProfileId("abc85f64-5717-4562-b3fc-2c9600000000")
    .build();
ShortCodeUpdateResponse shortCode = client.shortCodes().update(params);
```

Key response fields: `response.data.id, response.data.messaging_profile_id, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
