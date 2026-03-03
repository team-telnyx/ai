---
name: telnyx-sip-integrations-java
description: >-
  Manage call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking. This skill provides Java SDK examples.
metadata:
  author: telnyx
  product: sip-integrations
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - Java

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

## Retrieve a stored credential

Returns the information about custom storage credentials.

`GET /custom_storage_credentials/{connection_id}`

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialRetrieveParams;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialRetrieveResponse;

CustomStorageCredentialRetrieveResponse customStorageCredential = client.customStorageCredentials().retrieve("connection_id");
```

## Create a custom storage credential

Creates a custom storage credentials configuration.

`POST /custom_storage_credentials/{connection_id}`

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageConfiguration;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialCreateParams;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialCreateResponse;
import com.telnyx.sdk.models.customstoragecredentials.GcsConfigurationData;

CustomStorageCredentialCreateParams params = CustomStorageCredentialCreateParams.builder()
    .connectionId("connection_id")
    .customStorageConfiguration(CustomStorageConfiguration.builder()
        .backend(CustomStorageConfiguration.Backend.GCS)
        .configuration(GcsConfigurationData.builder()
            .backend(GcsConfigurationData.Backend.GCS)
            .build())
        .build())
    .build();
CustomStorageCredentialCreateResponse customStorageCredential = client.customStorageCredentials().create(params);
```

## Update a stored credential

Updates a stored custom credentials configuration.

`PUT /custom_storage_credentials/{connection_id}`

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageConfiguration;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialUpdateParams;
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialUpdateResponse;
import com.telnyx.sdk.models.customstoragecredentials.GcsConfigurationData;

CustomStorageCredentialUpdateParams params = CustomStorageCredentialUpdateParams.builder()
    .connectionId("connection_id")
    .customStorageConfiguration(CustomStorageConfiguration.builder()
        .backend(CustomStorageConfiguration.Backend.GCS)
        .configuration(GcsConfigurationData.builder()
            .backend(GcsConfigurationData.Backend.GCS)
            .build())
        .build())
    .build();
CustomStorageCredentialUpdateResponse customStorageCredential = client.customStorageCredentials().update(params);
```

## Delete a stored credential

Deletes a stored custom credentials configuration.

`DELETE /custom_storage_credentials/{connection_id}`

```java
import com.telnyx.sdk.models.customstoragecredentials.CustomStorageCredentialDeleteParams;

client.customStorageCredentials().delete("connection_id");
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`GET /dialogflow_connections/{connection_id}`

```java
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionRetrieveParams;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionRetrieveResponse;

DialogflowConnectionRetrieveResponse dialogflowConnection = client.dialogflowConnections().retrieve("connection_id");
```

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`POST /dialogflow_connections/{connection_id}`

```java
import com.telnyx.sdk.core.JsonValue;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionCreateParams;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionCreateResponse;

DialogflowConnectionCreateParams params = DialogflowConnectionCreateParams.builder()
    .connectionId("connection_id")
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

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`PUT /dialogflow_connections/{connection_id}`

```java
import com.telnyx.sdk.core.JsonValue;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionUpdateParams;
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionUpdateResponse;

DialogflowConnectionUpdateParams params = DialogflowConnectionUpdateParams.builder()
    .connectionId("connection_id")
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

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`DELETE /dialogflow_connections/{connection_id}`

```java
import com.telnyx.sdk.models.dialogflowconnections.DialogflowConnectionDeleteParams;

client.dialogflowConnections().delete("connection_id");
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response.

`GET /external_connections`

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionListPage;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionListParams;

ExternalConnectionListPage page = client.externalConnections().list();
```

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request.

`POST /external_connections` — Required: `external_sip_connection`, `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionCreateParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionCreateResponse;

ExternalConnectionCreateParams params = ExternalConnectionCreateParams.builder()
    .externalSipConnection(ExternalConnectionCreateParams.ExternalSipConnection.ZOOM)
    .outbound(ExternalConnectionCreateParams.Outbound.builder().build())
    .build();
ExternalConnectionCreateResponse externalConnection = client.externalConnections().create(params);
```

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`GET /external_connections/log_messages`

```java
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageListPage;
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageListParams;

LogMessageListPage page = client.externalConnections().logMessages().list();
```

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`GET /external_connections/log_messages/{id}`

```java
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageRetrieveParams;
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageRetrieveResponse;

LogMessageRetrieveResponse logMessage = client.externalConnections().logMessages().retrieve("1293384261075731499");
```

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`DELETE /external_connections/log_messages/{id}`

```java
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageDismissParams;
import com.telnyx.sdk.models.externalconnections.logmessages.LogMessageDismissResponse;

LogMessageDismissResponse response = client.externalConnections().logMessages().dismiss("1293384261075731499");
```

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`GET /external_connections/{id}`

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionRetrieveParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionRetrieveResponse;

ExternalConnectionRetrieveResponse externalConnection = client.externalConnections().retrieve("1293384261075731499");
```

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`PATCH /external_connections/{id}` — Required: `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

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

## Deletes an External Connection

Permanently deletes an External Connection.

`DELETE /external_connections/{id}`

```java
import com.telnyx.sdk.models.externalconnections.ExternalConnectionDeleteParams;
import com.telnyx.sdk.models.externalconnections.ExternalConnectionDeleteResponse;

ExternalConnectionDeleteResponse externalConnection = client.externalConnections().delete("1293384261075731499");
```

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`GET /external_connections/{id}/civic_addresses`

```java
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressListParams;
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressListResponse;

CivicAddressListResponse civicAddresses = client.externalConnections().civicAddresses().list("1293384261075731499");
```

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`GET /external_connections/{id}/civic_addresses/{address_id}`

```java
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressRetrieveParams;
import com.telnyx.sdk.models.externalconnections.civicaddresses.CivicAddressRetrieveResponse;

CivicAddressRetrieveParams params = CivicAddressRetrieveParams.builder()
    .id("1293384261075731499")
    .addressId("318fb664-d341-44d2-8405-e6bfb9ced6d9")
    .build();
CivicAddressRetrieveResponse civicAddress = client.externalConnections().civicAddresses().retrieve(params);
```

## Update a location's static emergency address

`PATCH /external_connections/{id}/locations/{location_id}` — Required: `static_emergency_address_id`

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

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`GET /external_connections/{id}/phone_numbers`

```java
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberListPage;
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberListParams;

PhoneNumberListPage page = client.externalConnections().phoneNumbers().list("1293384261075731499");
```

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`GET /external_connections/{id}/phone_numbers/{phone_number_id}`

```java
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberRetrieveParams;
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberRetrieveResponse;

PhoneNumberRetrieveParams params = PhoneNumberRetrieveParams.builder()
    .id("1293384261075731499")
    .phoneNumberId("1234567889")
    .build();
PhoneNumberRetrieveResponse phoneNumber = client.externalConnections().phoneNumbers().retrieve(params);
```

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

Optional: `location_id` (uuid)

```java
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberUpdateParams;
import com.telnyx.sdk.models.externalconnections.phonenumbers.PhoneNumberUpdateResponse;

PhoneNumberUpdateParams params = PhoneNumberUpdateParams.builder()
    .id("1293384261075731499")
    .phoneNumberId("1234567889")
    .build();
PhoneNumberUpdateResponse phoneNumber = client.externalConnections().phoneNumbers().update(params);
```

## List all Releases

Returns a list of your Releases for the given external connection.

`GET /external_connections/{id}/releases`

```java
import com.telnyx.sdk.models.externalconnections.releases.ReleaseListPage;
import com.telnyx.sdk.models.externalconnections.releases.ReleaseListParams;

ReleaseListPage page = client.externalConnections().releases().list("1293384261075731499");
```

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`GET /external_connections/{id}/releases/{release_id}`

```java
import com.telnyx.sdk.models.externalconnections.releases.ReleaseRetrieveParams;
import com.telnyx.sdk.models.externalconnections.releases.ReleaseRetrieveResponse;

ReleaseRetrieveParams params = ReleaseRetrieveParams.builder()
    .id("1293384261075731499")
    .releaseId("7b6a6449-b055-45a6-81f6-f6f0dffa4cc6")
    .build();
ReleaseRetrieveResponse release = client.externalConnections().releases().retrieve(params);
```

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`GET /external_connections/{id}/uploads`

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadListPage;
import com.telnyx.sdk.models.externalconnections.uploads.UploadListParams;

UploadListPage page = client.externalConnections().uploads().list("1293384261075731499");
```

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers.

`POST /external_connections/{id}/uploads` — Required: `number_ids`

Optional: `additional_usages` (array[string]), `civic_address_id` (uuid), `location_id` (uuid), `usage` (enum)

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

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`POST /external_connections/{id}/uploads/refresh`

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadRefreshStatusParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadRefreshStatusResponse;

UploadRefreshStatusResponse response = client.externalConnections().uploads().refreshStatus("1293384261075731499");
```

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`GET /external_connections/{id}/uploads/status`

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadPendingCountParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadPendingCountResponse;

UploadPendingCountResponse response = client.externalConnections().uploads().pendingCount("1293384261075731499");
```

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`GET /external_connections/{id}/uploads/{ticket_id}`

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetrieveParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetrieveResponse;

UploadRetrieveParams params = UploadRetrieveParams.builder()
    .id("1293384261075731499")
    .ticketId("7b6a6449-b055-45a6-81f6-f6f0dffa4cc6")
    .build();
UploadRetrieveResponse upload = client.externalConnections().uploads().retrieve(params);
```

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request.

`POST /external_connections/{id}/uploads/{ticket_id}/retry`

```java
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetryParams;
import com.telnyx.sdk.models.externalconnections.uploads.UploadRetryResponse;

UploadRetryParams params = UploadRetryParams.builder()
    .id("1293384261075731499")
    .ticketId("7b6a6449-b055-45a6-81f6-f6f0dffa4cc6")
    .build();
UploadRetryResponse response = client.externalConnections().uploads().retry(params);
```

## List uploaded media

Returns a list of stored media files.

`GET /media`

```java
import com.telnyx.sdk.models.media.MediaListParams;
import com.telnyx.sdk.models.media.MediaListResponse;

MediaListResponse media = client.media().list();
```

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`POST /media` — Required: `media_url`

Optional: `media_name` (string), `ttl_secs` (integer)

```java
import com.telnyx.sdk.models.media.MediaUploadParams;
import com.telnyx.sdk.models.media.MediaUploadResponse;

MediaUploadParams params = MediaUploadParams.builder()
    .mediaUrl("http://www.example.com/audio.mp3")
    .build();
MediaUploadResponse response = client.media().upload(params);
```

## Retrieve stored media

Returns the information about a stored media file.

`GET /media/{media_name}`

```java
import com.telnyx.sdk.models.media.MediaRetrieveParams;
import com.telnyx.sdk.models.media.MediaRetrieveResponse;

MediaRetrieveResponse media = client.media().retrieve("media_name");
```

## Update stored media

Updates a stored media file.

`PUT /media/{media_name}`

Optional: `media_url` (string), `ttl_secs` (integer)

```java
import com.telnyx.sdk.models.media.MediaUpdateParams;
import com.telnyx.sdk.models.media.MediaUpdateResponse;

MediaUpdateResponse media = client.media().update("media_name");
```

## Deletes stored media

Deletes a stored media file.

`DELETE /media/{media_name}`

```java
import com.telnyx.sdk.models.media.MediaDeleteParams;

client.media().delete("media_name");
```

## Download stored media

Downloads a stored media file.

`GET /media/{media_name}/download`

```java
import com.telnyx.sdk.core.http.HttpResponse;
import com.telnyx.sdk.models.media.MediaDownloadParams;

HttpResponse response = client.media().download("media_name");
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user.

`POST /operator_connect/actions/refresh`

```java
import com.telnyx.sdk.models.operatorconnect.actions.ActionRefreshParams;
import com.telnyx.sdk.models.operatorconnect.actions.ActionRefreshResponse;

ActionRefreshResponse response = client.operatorConnect().actions().refresh();
```

## List all recording transcriptions

Returns a list of your recording transcriptions.

`GET /recording_transcriptions`

```java
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionListParams;
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionListResponse;

RecordingTranscriptionListResponse recordingTranscriptions = client.recordingTranscriptions().list();
```

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`GET /recording_transcriptions/{recording_transcription_id}`

```java
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionRetrieveParams;
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionRetrieveResponse;

RecordingTranscriptionRetrieveResponse recordingTranscription = client.recordingTranscriptions().retrieve("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /recording_transcriptions/{recording_transcription_id}`

```java
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionDeleteParams;
import com.telnyx.sdk.models.recordingtranscriptions.RecordingTranscriptionDeleteResponse;

RecordingTranscriptionDeleteResponse recordingTranscription = client.recordingTranscriptions().delete("6a09cdc3-8948-47f0-aa62-74ac943d6c58");
```

## List all call recordings

Returns a list of your call recordings.

`GET /recordings`

```java
import com.telnyx.sdk.models.recordings.RecordingListPage;
import com.telnyx.sdk.models.recordings.RecordingListParams;

RecordingListPage page = client.recordings().list();
```

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`POST /recordings/actions/delete`

```java
import com.telnyx.sdk.models.recordings.actions.ActionDeleteParams;

ActionDeleteParams params = ActionDeleteParams.builder()
    .addId("428c31b6-7af4-4bcb-b7f5-5013ef9657c1")
    .addId("428c31b6-7af4-4bcb-b7f5-5013ef9657c2")
    .build();
client.recordings().actions().delete(params);
```

## Retrieve a call recording

Retrieves the details of an existing call recording.

`GET /recordings/{recording_id}`

```java
import com.telnyx.sdk.models.recordings.RecordingRetrieveParams;
import com.telnyx.sdk.models.recordings.RecordingRetrieveResponse;

RecordingRetrieveResponse recording = client.recordings().retrieve("recording_id");
```

## Delete a call recording

Permanently deletes a call recording.

`DELETE /recordings/{recording_id}`

```java
import com.telnyx.sdk.models.recordings.RecordingDeleteParams;
import com.telnyx.sdk.models.recordings.RecordingDeleteResponse;

RecordingDeleteResponse recording = client.recordings().delete("recording_id");
```

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`POST /siprec_connectors`

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

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`GET /siprec_connectors/{connector_name}`

```java
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorRetrieveParams;
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorRetrieveResponse;

SiprecConnectorRetrieveResponse siprecConnector = client.siprecConnectors().retrieve("connector_name");
```

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`PUT /siprec_connectors/{connector_name}`

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

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`DELETE /siprec_connectors/{connector_name}`

```java
import com.telnyx.sdk.models.siprecconnectors.SiprecConnectorDeleteParams;

client.siprecConnectors().delete("connector_name");
```
