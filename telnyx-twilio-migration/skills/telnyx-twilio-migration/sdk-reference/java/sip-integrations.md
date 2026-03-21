<!-- SDK reference: telnyx-sip-integrations-java -->

# Telnyx Sip Integrations - Java

## Core Workflow

### Prerequisites

1. SIP connection configured (see telnyx-sip-java)

### Steps

1. **List call recordings**: `client.callRecordings().list(params)`
2. **Download recording**: `client.callRecordings().retrieve(params)`
3. **Upload media**: `client.mediaStorage().create(params)`

### Common mistakes

- Call recordings require recording to be enabled on the connection or via call control commands
- Recording files are temporary — download and store them in your own storage

**Related skills**: telnyx-sip-java, telnyx-voice-java

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
    var result = client.callRecordings().list(params);
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
## Retrieve a stored credential

Returns the information about custom storage credentials.

`client.customStorageCredentials().retrieve()` — `GET /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialRetrieveParams;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialRetrieveResponse;

CustomStorageCredentialRetrieveResponse customStorageCredential = client.customStorageCredentials().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.backend, response.data.configuration`

## Create a custom storage credential

Creates a custom storage credentials configuration.

`client.customStorageCredentials().create()` — `POST /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageConfiguration;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialCreateParams;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialCreateResponse;
import com.telnyx.sdk.models.customstoragecredentials.GcsConfigurationData;

CustomStorageCredentialCreateParams params = CustomStorageCredentialCreateParams.builder()
    .connectionId("550e8400-e29b-41d4-a716-446655440000")
    .customStorageConfiguration(CustomStorageConfiguration.builder()
        .backend(CustomStorageConfiguration.Backend.GCS)
        .configuration(GcsConfigurationData.builder()
            .backend(GcsConfigurationData.Backend.GCS)
            .build())
        .build())
    .build();
CustomStorageCredentialCreateResponse customStorageCredential = client.customStorageCredentials().create(params);
```

Key response fields: `response.data.backend, response.data.configuration`

## Update a stored credential

Updates a stored custom credentials configuration.

`client.customStorageCredentials().update()` — `PUT /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageConfiguration;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialUpdateParams;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialUpdateResponse;
import com.telnyx.sdk.models.customstoragecredentials.GcsConfigurationData;

CustomStorageCredentialUpdateParams params = CustomStorageCredentialUpdateParams.builder()
    .connectionId("550e8400-e29b-41d4-a716-446655440000")
    .customStorageConfiguration(CustomStorageConfiguration.builder()
        .backend(CustomStorageConfiguration.Backend.GCS)
        .configuration(GcsConfigurationData.builder()
            .backend(GcsConfigurationData.Backend.GCS)
            .build())
        .build())
    .build();
CustomStorageCredentialUpdateResponse customStorageCredential = client.customStorageCredentials().update(params);
```

Key response fields: `response.data.backend, response.data.configuration`

## Delete a stored credential

Deletes a stored custom credentials configuration.

`client.customStorageCredentials().delete()` — `DELETE /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialDeleteParams;

client.customStorageCredentials().delete("550e8400-e29b-41d4-a716-446655440000");
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`client.dialogflowConnections().retrieve()` — `GET /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```java
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionRetrieveParams;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionRetrieveResponse;

DialogflowConnectionRetrieveResponse dialogflowConnection = client.dialogflowConnections().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`client.dialogflowConnections().create()` — `POST /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```java
import com.telnyx.sdk.core.JsonValue;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionCreateParams;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionCreateResponse;

DialogflowConnectionCreateParams params = DialogflowConnectionCreateParams.builder()
    .connectionId("550e8400-e29b-41d4-a716-446655440000")
    .serviceAccount(DialogflowConnectionCreateParams.ServiceAccount.builder()
        .putAdditionalProperty("type", JsonValue.from("bar"))
        .putAdditionalProperty("project_id", JsonValue.from("bar"))
        .putAdditionalProperty("private_key_id", JsonValue.from("bar"))
        .putAdditionalProperty("private_key", JsonValue.from("bar"))
        .putAdditionalProperty("client_email", JsonValue.from("bar"))
        .putAdditionalProperty("client_id", JsonValue.from("bar"))
        .putAdditionalProperty("auth_uri", JsonValue.from("bar"))
        .putAdditionalProperty("token_uri", JsonValue.from("bar"))
        .putAdditionalProperty("auth_provider_x509_cert_url", JsonValue.from("bar"))
        .putAdditionalProperty("client_x509_cert_url", JsonValue.from("bar"))
        .build())
    .build();
DialogflowConnectionCreateResponse dialogflowConnection = client.dialogflowConnections().create(params);
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`client.dialogflowConnections().update()` — `PUT /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```java
import com.telnyx.sdk.core.JsonValue;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionUpdateParams;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionUpdateResponse;

DialogflowConnectionUpdateParams params = DialogflowConnectionUpdateParams.builder()
    .connectionId("550e8400-e29b-41d4-a716-446655440000")
    .serviceAccount(DialogflowConnectionUpdateParams.ServiceAccount.builder()
        .putAdditionalProperty("type", JsonValue.from("bar"))
        .putAdditionalProperty("project_id", JsonValue.from("bar"))
        .putAdditionalProperty("private_key_id", JsonValue.from("bar"))
        .putAdditionalProperty("private_key", JsonValue.from("bar"))
        .putAdditionalProperty("client_email", JsonValue.from("bar"))
        .putAdditionalProperty("client_id", JsonValue.from("bar"))
        .putAdditionalProperty("auth_uri", JsonValue.from("bar"))
        .putAdditionalProperty("token_uri", JsonValue.from("bar"))
        .putAdditionalProperty("auth_provider_x509_cert_url", JsonValue.from("bar"))
        .putAdditionalProperty("client_x509_cert_url", JsonValue.from("bar"))
        .build())
    .build();
DialogflowConnectionUpdateResponse dialogflowConnection = client.dialogflowConnections().update(params);
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`client.dialogflowConnections().delete()` — `DELETE /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```java
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionDeleteParams;

client.dialogflowConnections().delete("550e8400-e29b-41d4-a716-446655440000");
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response. External Connections are used by Telnyx customers to seamless configure SIP trunking integrations with Telnyx Partners, through External Voice Integrations in Mission Control Portal.

`client.externalConnections().list()` — `GET /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for external connections (deepObject style)... |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionListPage;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionListParams;

ExternalConnectionListPage page = client.externalConnections().list();
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request. The external_sip_connection and outbound voice profile id are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.externalConnections().create()` — `POST /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `externalSipConnection` | enum (zoom) | Yes | The service that will be consuming this connection. |
| `outbound` | object | Yes |  |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhookEventUrl` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionCreateParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionCreateResponse;

ExternalConnectionCreateParams params = ExternalConnectionCreateParams.builder()
    .externalSipConnection(ExternalConnectionCreateParams.ExternalSipConnection.ZOOM)
    .outbound(ExternalConnectionCreateParams.Outbound.builder().build())
    .build();
ExternalConnectionCreateResponse externalConnection = client.externalConnections().create(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`client.externalConnections().logMessages().list()` — `GET /external_connections/log_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Filter parameter for log messages (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageListPage;
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageListParams;

LogMessageListPage page = client.externalConnections().logMessages().list();
```

Key response fields: `response.data.log_messages, response.data.meta`

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`client.externalConnections().logMessages().retrieve()` — `GET /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageRetrieveParams;
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageRetrieveResponse;

LogMessageRetrieveResponse logMessage = client.externalConnections().logMessages().retrieve("1293384261075731499");
```

Key response fields: `response.data.log_messages`

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`client.externalConnections().logMessages().dismiss()` — `DELETE /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageDismissParams;
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageDismissResponse;

LogMessageDismissResponse response = client.externalConnections().logMessages().dismiss("1293384261075731499");
```

Key response fields: `response.data.success`

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`client.externalConnections().retrieve()` — `GET /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionRetrieveParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionRetrieveResponse;

ExternalConnectionRetrieveResponse externalConnection = client.externalConnections().retrieve("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`client.externalConnections().update()` — `PATCH /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `outbound` | object | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the connection. |
| `active` | boolean | No | Specifies whether the connection can be used. |
| `webhookEventUrl` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionUpdateParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionUpdateResponse;

ExternalConnectionUpdateParams params = ExternalConnectionUpdateParams.builder()
    .id("1293384261075731499")
    .outbound(ExternalConnectionUpdateParams.Outbound.builder()
        .outboundVoiceProfileId("1911630617284445511")
        .build())
    .build();
ExternalConnectionUpdateResponse externalConnection = client.externalConnections().update(params);
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes an External Connection

Permanently deletes an External Connection. Deletion may be prevented if the application is in use by phone numbers, is active, or if it is an Operator Connect connection. To remove an Operator Connect integration please contact Telnyx support.

`client.externalConnections().delete()` — `DELETE /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionDeleteParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionDeleteResponse;

ExternalConnectionDeleteResponse externalConnection = client.externalConnections().delete("1293384261075731499");
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`client.externalConnections().civicAddresses().list()` — `GET /external_connections/{id}/civic_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for civic addresses (deepObject style). |

```java
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressListParams;
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressListResponse;

CivicAddressListResponse civicAddresses = client.externalConnections().civicAddresses().list("1293384261075731499");
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`client.externalConnections().civicAddresses().retrieve()` — `GET /external_connections/{id}/civic_addresses/{address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `addressId` | string (UUID) | Yes | Identifies a civic address or a location. |

```java
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressRetrieveParams;
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressRetrieveResponse;

CivicAddressRetrieveParams params = CivicAddressRetrieveParams.builder()
    .id("1293384261075731499")
    .addressId("318fb664-d341-44d2-8405-e6bfb9ced6d9")
    .build();
CivicAddressRetrieveResponse civicAddress = client.externalConnections().civicAddresses().retrieve(params);
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Update a location's static emergency address

`client.externalConnections().updateLocation()` — `PATCH /external_connections/{id}/locations/{location_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staticEmergencyAddressId` | string (UUID) | Yes | A new static emergency address ID to update the location wit... |
| `id` | string (UUID) | Yes | The ID of the external connection |
| `locationId` | string (UUID) | Yes | The ID of the location to update |

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionUpdateLocationParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionUpdateLocationResponse;

ExternalConnectionUpdateLocationParams params = ExternalConnectionUpdateLocationParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .locationId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .staticEmergencyAddressId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
ExternalConnectionUpdateLocationResponse response = client.externalConnections().updateLocation(params);
```

Key response fields: `response.data.accepted_address_suggestions, response.data.location_id, response.data.static_emergency_address_id`

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`client.externalConnections().phoneNumbers().list()` — `GET /external_connections/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for phone numbers (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberListPage;
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberListParams;

PhoneNumberListPage page = client.externalConnections().phoneNumbers().list("1293384261075731499");
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`client.externalConnections().phoneNumbers().retrieve()` — `GET /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phoneNumberId` | string (UUID) | Yes | A phone number's ID via the Telnyx API |

```java
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberRetrieveParams;
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberRetrieveResponse;

PhoneNumberRetrieveParams params = PhoneNumberRetrieveParams.builder()
    .id("1293384261075731499")
    .phoneNumberId("1234567889")
    .build();
PhoneNumberRetrieveResponse phoneNumber = client.externalConnections().phoneNumbers().retrieve(params);
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`client.externalConnections().phoneNumbers().update()` — `PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `phoneNumberId` | string (UUID) | Yes | A phone number's ID via the Telnyx API |
| `locationId` | string (UUID) | No | Identifies the location to assign the phone number to. |

```java
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberUpdateParams;
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberUpdateResponse;

PhoneNumberUpdateParams params = PhoneNumberUpdateParams.builder()
    .id("1293384261075731499")
    .phoneNumberId("1234567889")
    .build();
PhoneNumberUpdateResponse phoneNumber = client.externalConnections().phoneNumbers().update(params);
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## List all Releases

Returns a list of your Releases for the given external connection. These are automatically created when you change the `connection_id` of a phone number that is currently on Microsoft Teams.

`client.externalConnections().releases().list()` — `GET /external_connections/{id}/releases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for releases (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.externalconnections.releases.ReleaseListPage;
import com.telnyx.sdk.models.externalconnections.releases.ReleaseListParams;

ReleaseListPage page = client.externalConnections().releases().list("1293384261075731499");
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`client.externalConnections().releases().retrieve()` — `GET /external_connections/{id}/releases/{release_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `releaseId` | string (UUID) | Yes | Identifies a Release request |

```java
import com.telnyx.sdk.models.externalconnections.releases.ReleaseRetrieveParams;
import com.telnyx.sdk.models.externalconnections.releases.ReleaseRetrieveResponse;

ReleaseRetrieveParams params = ReleaseRetrieveParams.builder()
    .id("1293384261075731499")
    .releaseId("7b6a6449-b055-45a6-81f6-f6f0dffa4cc6")
    .build();
ReleaseRetrieveResponse release = client.externalConnections().releases().retrieve(params);
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`client.externalConnections().uploads().list()` — `GET /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `filter` | object | No | Filter parameter for uploads (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadListPage;
import com.telnyx.sdk.models.externalconnections.uploads.UploadListParams;

UploadListPage page = client.externalConnections().uploads().list("1293384261075731499");
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers. Only one of civic_address_id or location_id must be provided, not both. The maximum allowed phone numbers for the numbers_ids array is 1000.

`client.externalConnections().uploads().create()` — `POST /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `numberIds` | array[string] | Yes |  |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | No | The use case of the upload request. |
| `locationId` | string (UUID) | No | Identifies the location to assign all phone numbers to. |
| `civicAddressId` | string (UUID) | No | Identifies the civic address to assign all phone numbers to. |
| ... | | | +1 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadCreateParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadCreateResponse;
import java.util.List;

UploadCreateParams params = UploadCreateParams.builder()
    .id("1293384261075731499")
    .numberIds(List.of(
      "3920457616934164700",
      "3920457616934164701",
      "3920457616934164702",
      "3920457616934164703"
    ))
    .build();
UploadCreateResponse upload = client.externalConnections().uploads().create(params);
```

Key response fields: `response.data.success, response.data.ticket_id`

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`client.externalConnections().uploads().refreshStatus()` — `POST /external_connections/{id}/uploads/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadRefreshStatusParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadRefreshStatusResponse;

UploadRefreshStatusResponse response = client.externalConnections().uploads().refreshStatus("1293384261075731499");
```

Key response fields: `response.data.success`

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`client.externalConnections().uploads().pendingCount()` — `GET /external_connections/{id}/uploads/status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadPendingCountParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadPendingCountResponse;

UploadPendingCountResponse response = client.externalConnections().uploads().pendingCount("1293384261075731499");
```

Key response fields: `response.data.pending_numbers_count, response.data.pending_orders_count`

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`client.externalConnections().uploads().retrieve()` — `GET /external_connections/{id}/uploads/{ticket_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticketId` | string (UUID) | Yes | Identifies an Upload request |

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetrieveParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetrieveResponse;

UploadRetrieveParams params = UploadRetrieveParams.builder()
    .id("1293384261075731499")
    .ticketId("7b6a6449-b055-45a6-81f6-f6f0dffa4cc6")
    .build();
UploadRetrieveResponse upload = client.externalConnections().uploads().retrieve(params);
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request. In some cases this will reattempt the existing upload request, in other cases it may create a new upload request. Please check the ticket_id in the response to determine if a new upload request was created.

`client.externalConnections().uploads().retry()` — `POST /external_connections/{id}/uploads/{ticket_id}/retry`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |
| `ticketId` | string (UUID) | Yes | Identifies an Upload request |

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetryParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetryResponse;

UploadRetryParams params = UploadRetryParams.builder()
    .id("1293384261075731499")
    .ticketId("7b6a6449-b055-45a6-81f6-f6f0dffa4cc6")
    .build();
UploadRetryResponse response = client.externalConnections().uploads().retry(params);
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## List uploaded media

Returns a list of stored media files.

`client.media().list()` — `GET /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.media.MediaListParams;
import com.telnyx.sdk.models.media.MediaListResponse;

MediaListResponse media = client.media().list();
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`client.media().upload()` — `POST /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaUrl` | string (URL) | Yes | The URL where the media to be stored in Telnyx network is cu... |
| `ttlSecs` | integer | No | The number of seconds after which the media resource will be... |
| `mediaName` | string | No | The unique identifier of a file. |

```java
import com.telnyx.sdk.models.media.MediaUploadParams;
import com.telnyx.sdk.models.media.MediaUploadResponse;

MediaUploadParams params = MediaUploadParams.builder()
    .mediaUrl("http://www.example.com/audio.mp3")
    .build();
MediaUploadResponse response = client.media().upload(params);
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Retrieve stored media

Returns the information about a stored media file.

`client.media().retrieve()` — `GET /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |

```java
import com.telnyx.sdk.models.media.MediaRetrieveParams;
import com.telnyx.sdk.models.media.MediaRetrieveResponse;

MediaRetrieveResponse media = client.media().retrieve("media_name");
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Update stored media

Updates a stored media file.

`client.media().update()` — `PUT /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |
| `mediaUrl` | string (URL) | No | The URL where the media to be stored in Telnyx network is cu... |
| `ttlSecs` | integer | No | The number of seconds after which the media resource will be... |

```java
import com.telnyx.sdk.models.media.MediaUpdateParams;
import com.telnyx.sdk.models.media.MediaUpdateResponse;

MediaUpdateResponse media = client.media().update("media_name");
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Deletes stored media

Deletes a stored media file.

`client.media().delete()` — `DELETE /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |

```java
import com.telnyx.sdk.models.media.MediaDeleteParams;

client.media().delete("media_name");
```

## Download stored media

Downloads a stored media file.

`client.media().download()` — `GET /media/{media_name}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaName` | string | Yes | Uniquely identifies a media resource. |

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.media.MediaDownloadParams;

HttpResponse response = client.media().download("media_name");
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user. This will create new external connections on the user's account if needed, and/or report the integration results as [log messages](https://developers.telnyx.com/api-reference/external-connections/list-all-log-messages#list-all-log-messages).

`client.operatorConnect().actions().refresh()` — `POST /operator_connect/actions/refresh`

```java
import com.telnyx.sdk.models.operatorconnect.actions.ActionRefreshParams;
import com.telnyx.sdk.models.operatorconnect.actions.ActionRefreshResponse;

ActionRefreshResponse response = client.operatorConnect().actions().refresh();
```

Key response fields: `response.data.message, response.data.success`

## List all recording transcriptions

Returns a list of your recording transcriptions.

`client.recordingTranscriptions().list()` — `GET /recording_transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recording transcriptions by various attributes. |

```java
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionListPage;
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionListParams;

RecordingTranscriptionListPage page = client.recordingTranscriptions().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`client.recordingTranscriptions().retrieve()` — `GET /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingTranscriptionId` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```java
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionRetrieveParams;
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionRetrieveResponse;

RecordingTranscriptionRetrieveResponse recordingTranscription = client.recordingTranscriptions().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.recordingTranscriptions().delete()` — `DELETE /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingTranscriptionId` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```java
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionDeleteParams;
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionDeleteResponse;

RecordingTranscriptionDeleteResponse recordingTranscription = client.recordingTranscriptions().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all call recordings

Returns a list of your call recordings.

`client.recordings().list()` — `GET /recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Filter recordings by various attributes. |

```java
import com.telnyx.sdk.models.recordings.RecordingListPage;
import com.telnyx.sdk.models.recordings.RecordingListParams;

RecordingListPage page = client.recordings().list();
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`client.recordings().actions().delete()` — `POST /recordings/actions/delete`

```java
import com.telnyx.sdk.models.recordings.actions.ActionDeleteParams;
import com.telnyx.sdk.models.recordings.actions.ActionDeleteResponse;

ActionDeleteParams params = ActionDeleteParams.builder()
    .addId("428c31b6-7af4-4bcb-b7f5-5013ef9657c1")
    .addId("428c31b6-7af4-4bcb-b7f5-5013ef9657c2")
    .build();
ActionDeleteResponse action = client.recordings().actions().delete(params);
```

Key response fields: `response.data.status`

## Retrieve a call recording

Retrieves the details of an existing call recording.

`client.recordings().retrieve()` — `GET /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingId` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```java
import com.telnyx.sdk.models.recordings.RecordingRetrieveParams;
import com.telnyx.sdk.models.recordings.RecordingRetrieveResponse;

RecordingRetrieveResponse recording = client.recordings().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a call recording

Permanently deletes a call recording.

`client.recordings().delete()` — `DELETE /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordingId` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```java
import com.telnyx.sdk.models.recordings.RecordingDeleteParams;
import com.telnyx.sdk.models.recordings.RecordingDeleteResponse;

RecordingDeleteResponse recording = client.recordings().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`client.siprecConnectors().create()` — `POST /siprec_connectors`

```java
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorCreateParams;
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorCreateResponse;

SiprecConnectorCreateParams params = SiprecConnectorCreateParams.builder()
    .host("siprec.telnyx.com")
    .name("my-siprec-connector")
    .port(5060L)
    .build();
SiprecConnectorCreateResponse siprecConnector = client.siprecConnectors().create(params);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`client.siprecConnectors().retrieve()` — `GET /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```java
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorRetrieveParams;
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorRetrieveResponse;

SiprecConnectorRetrieveResponse siprecConnector = client.siprecConnectors().retrieve("connector_name");
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`client.siprecConnectors().update()` — `PUT /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```java
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorUpdateParams;
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorUpdateResponse;

SiprecConnectorUpdateParams params = SiprecConnectorUpdateParams.builder()
    .connectorName("connector_name")
    .host("siprec.telnyx.com")
    .name("my-siprec-connector")
    .port(5060L)
    .build();
SiprecConnectorUpdateResponse siprecConnector = client.siprecConnectors().update(params);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`client.siprecConnectors().delete()` — `DELETE /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```java
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorDeleteParams;

client.siprecConnectors().delete("connector_name");
```

---

# SIP Integrations (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Retrieve a stored credential, Create a custom storage credential, Update a stored credential

| Field | Type |
|-------|------|
| `backend` | enum: gcs, s3, azure |
| `configuration` | object |

**Returned by:** Retrieve stored Dialogflow Connection, Create a Dialogflow Connection, Update stored Dialogflow Connection

| Field | Type |
|-------|------|
| `connection_id` | string |
| `conversation_profile_id` | string |
| `environment` | string |
| `record_type` | string |
| `service_account` | string |

**Returned by:** List all External Connections, Creates an External Connection, Retrieve an External Connection, Update an External Connection, Deletes an External Connection

| Field | Type |
|-------|------|
| `active` | boolean |
| `created_at` | string |
| `credential_active` | boolean |
| `external_sip_connection` | enum: zoom, operator_connect |
| `id` | string |
| `inbound` | object |
| `outbound` | object |
| `record_type` | string |
| `tags` | array[string] |
| `updated_at` | string |
| `webhook_api_version` | enum: 1, 2 |
| `webhook_event_failover_url` | uri |
| `webhook_event_url` | uri |
| `webhook_timeout_secs` | integer \| null |

**Returned by:** List all log messages

| Field | Type |
|-------|------|
| `log_messages` | array[object] |
| `meta` | object |

**Returned by:** Retrieve a log message

| Field | Type |
|-------|------|
| `log_messages` | array[object] |

**Returned by:** Dismiss a log message, Refresh the status of all Upload requests

| Field | Type |
|-------|------|
| `success` | boolean |

**Returned by:** List all civic addresses and locations, Retrieve a Civic Address

| Field | Type |
|-------|------|
| `city_or_town` | string |
| `city_or_town_alias` | string |
| `company_name` | string |
| `country` | string |
| `country_or_district` | string |
| `default_location_id` | uuid |
| `description` | string |
| `house_number` | string |
| `house_number_suffix` | string |
| `id` | uuid |
| `locations` | array[object] |
| `postal_or_zip_code` | string |
| `record_type` | string |
| `state_or_province` | string |
| `street_name` | string |
| `street_suffix` | string |

**Returned by:** Update a location's static emergency address

| Field | Type |
|-------|------|
| `accepted_address_suggestions` | boolean |
| `location_id` | uuid |
| `static_emergency_address_id` | uuid |

**Returned by:** List all phone numbers, Retrieve a phone number, Update a phone number

| Field | Type |
|-------|------|
| `acquired_capabilities` | array[string] |
| `civic_address_id` | uuid |
| `displayed_country_code` | string |
| `location_id` | uuid |
| `number_id` | string |
| `telephone_number` | string |
| `ticket_id` | uuid |

**Returned by:** List all Releases, Retrieve a Release request

| Field | Type |
|-------|------|
| `created_at` | string |
| `error_message` | string |
| `status` | enum: pending_upload, pending, in_progress, complete, failed, expired, unknown |
| `telephone_numbers` | array[object] |
| `tenant_id` | uuid |
| `ticket_id` | uuid |

**Returned by:** List all Upload requests, Retrieve an Upload request, Retry an Upload request

| Field | Type |
|-------|------|
| `available_usages` | array[string] |
| `error_code` | string |
| `error_message` | string |
| `location_id` | uuid |
| `status` | enum: pending_upload, pending, in_progress, partial_success, success, error |
| `tenant_id` | uuid |
| `ticket_id` | uuid |
| `tn_upload_entries` | array[object] |

**Returned by:** Creates an Upload request

| Field | Type |
|-------|------|
| `success` | boolean |
| `ticket_id` | uuid |

**Returned by:** Get the count of pending upload requests

| Field | Type |
|-------|------|
| `pending_numbers_count` | integer |
| `pending_orders_count` | integer |

**Returned by:** List uploaded media, Upload media, Retrieve stored media, Update stored media

| Field | Type |
|-------|------|
| `content_type` | string |
| `created_at` | string |
| `expires_at` | string |
| `media_name` | string |
| `updated_at` | string |

**Returned by:** Refresh Operator Connect integration

| Field | Type |
|-------|------|
| `message` | string |
| `success` | boolean |

**Returned by:** List all recording transcriptions, Retrieve a recording transcription, Delete a recording transcription

| Field | Type |
|-------|------|
| `created_at` | string |
| `duration_millis` | int32 |
| `id` | string |
| `record_type` | enum: recording_transcription |
| `recording_id` | string |
| `status` | enum: in-progress, completed |
| `transcription_text` | string |
| `updated_at` | string |

**Returned by:** List all call recordings, Retrieve a call recording, Delete a call recording

| Field | Type |
|-------|------|
| `call_control_id` | string |
| `call_leg_id` | string |
| `call_session_id` | string |
| `channels` | enum: single, dual |
| `conference_id` | string |
| `connection_id` | string |
| `created_at` | string |
| `download_urls` | object |
| `duration_millis` | int32 |
| `from` | string |
| `id` | string |
| `initiated_by` | string |
| `record_type` | enum: recording |
| `recording_ended_at` | string |
| `recording_started_at` | string |
| `source` | enum: conference, call |
| `status` | enum: completed |
| `to` | string |
| `updated_at` | string |

**Returned by:** Delete a list of call recordings

| Field | Type |
|-------|------|
| `status` | enum: ok |

**Returned by:** Create a SIPREC connector, Retrieve a SIPREC connector, Update a SIPREC connector

| Field | Type |
|-------|------|
| `app_subdomain` | string |
| `created_at` | string |
| `host` | string |
| `name` | string |
| `port` | integer |
| `record_type` | string |
| `updated_at` | string |

## Optional Parameters

### Creates an External Connection — `client.externalConnections().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `tags` | array[string] | Tags associated with the connection. |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `inbound` | object |  |

### Update an External Connection — `client.externalConnections().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Specifies whether the connection can be used. |
| `webhookEventUrl` | string (URL) | The URL where webhooks related to this connection will be sent. |
| `webhookEventFailoverUrl` | string (URL) | The failover URL where webhooks related to this connection will be sent if se... |
| `tags` | array[string] | Tags associated with the connection. |
| `webhookTimeoutSecs` | integer | Specifies how many seconds to wait before timing out a webhook. |
| `inbound` | object |  |

### Update a phone number — `client.externalConnections().phoneNumbers().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `locationId` | string (UUID) | Identifies the location to assign the phone number to. |

### Creates an Upload request — `client.externalConnections().uploads().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `usage` | enum (calling_user_assignment, first_party_app_assignment) | The use case of the upload request. |
| `additionalUsages` | array[string] |  |
| `locationId` | string (UUID) | Identifies the location to assign all phone numbers to. |
| `civicAddressId` | string (UUID) | Identifies the civic address to assign all phone numbers to. |

### Upload media — `client.media().upload()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttlSecs` | integer | The number of seconds after which the media resource will be deleted, default... |
| `mediaName` | string | The unique identifier of a file. |

### Update stored media — `client.media().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `mediaUrl` | string (URL) | The URL where the media to be stored in Telnyx network is currently hosted. |
| `ttlSecs` | integer | The number of seconds after which the media resource will be deleted, default... |
