---
name: telnyx-sip-integrations-go
description: >-
  Manage call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking. This skill provides Go SDK examples.
metadata:
  author: telnyx
  product: sip-integrations
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Retrieve a stored credential

Returns the information about custom storage credentials.

`GET /custom_storage_credentials/{connection_id}`

```go
	customStorageCredential, err := client.CustomStorageCredentials.Get(context.TODO(), "connection_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", customStorageCredential.ConnectionID)
```

## Create a custom storage credential

Creates a custom storage credentials configuration.

`POST /custom_storage_credentials/{connection_id}`

```go
	customStorageCredential, err := client.CustomStorageCredentials.New(
		context.TODO(),
		"connection_id",
		telnyx.CustomStorageCredentialNewParams{
			CustomStorageConfiguration: telnyx.CustomStorageConfigurationParam{
				Backend: telnyx.CustomStorageConfigurationBackendGcs,
				Configuration: telnyx.CustomStorageConfigurationConfigurationUnionParam{
					OfGcs: &telnyx.GcsConfigurationDataParam{
						Backend: telnyx.GcsConfigurationDataBackendGcs,
					},
				},
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", customStorageCredential.ConnectionID)
```

## Update a stored credential

Updates a stored custom credentials configuration.

`PUT /custom_storage_credentials/{connection_id}`

```go
	customStorageCredential, err := client.CustomStorageCredentials.Update(
		context.TODO(),
		"connection_id",
		telnyx.CustomStorageCredentialUpdateParams{
			CustomStorageConfiguration: telnyx.CustomStorageConfigurationParam{
				Backend: telnyx.CustomStorageConfigurationBackendGcs,
				Configuration: telnyx.CustomStorageConfigurationConfigurationUnionParam{
					OfGcs: &telnyx.GcsConfigurationDataParam{
						Backend: telnyx.GcsConfigurationDataBackendGcs,
					},
				},
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", customStorageCredential.ConnectionID)
```

## Delete a stored credential

Deletes a stored custom credentials configuration.

`DELETE /custom_storage_credentials/{connection_id}`

```go
	err := client.CustomStorageCredentials.Delete(context.TODO(), "connection_id")
	if err != nil {
		panic(err.Error())
	}
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`GET /dialogflow_connections/{connection_id}`

```go
	dialogflowConnection, err := client.DialogflowConnections.Get(context.TODO(), "connection_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", dialogflowConnection.Data)
```

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`POST /dialogflow_connections/{connection_id}`

```go
	dialogflowConnection, err := client.DialogflowConnections.New(
		context.TODO(),
		"connection_id",
		telnyx.DialogflowConnectionNewParams{
			ServiceAccount: map[string]any{
				"type":                        "bar",
				"project_id":                  "bar",
				"private_key_id":              "bar",
				"private_key":                 "bar",
				"client_email":                "bar",
				"client_id":                   "bar",
				"auth_uri":                    "bar",
				"token_uri":                   "bar",
				"auth_provider_x509_cert_url": "bar",
				"client_x509_cert_url":        "bar",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", dialogflowConnection.Data)
```

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`PUT /dialogflow_connections/{connection_id}`

```go
	dialogflowConnection, err := client.DialogflowConnections.Update(
		context.TODO(),
		"connection_id",
		telnyx.DialogflowConnectionUpdateParams{
			ServiceAccount: map[string]any{
				"type":                        "bar",
				"project_id":                  "bar",
				"private_key_id":              "bar",
				"private_key":                 "bar",
				"client_email":                "bar",
				"client_id":                   "bar",
				"auth_uri":                    "bar",
				"token_uri":                   "bar",
				"auth_provider_x509_cert_url": "bar",
				"client_x509_cert_url":        "bar",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", dialogflowConnection.Data)
```

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`DELETE /dialogflow_connections/{connection_id}`

```go
	err := client.DialogflowConnections.Delete(context.TODO(), "connection_id")
	if err != nil {
		panic(err.Error())
	}
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response.

`GET /external_connections`

```go
	page, err := client.ExternalConnections.List(context.TODO(), telnyx.ExternalConnectionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request.

`POST /external_connections` — Required: `external_sip_connection`, `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	externalConnection, err := client.ExternalConnections.New(context.TODO(), telnyx.ExternalConnectionNewParams{
		ExternalSipConnection: telnyx.ExternalConnectionNewParamsExternalSipConnectionZoom,
		Outbound:              telnyx.ExternalConnectionNewParamsOutbound{},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`GET /external_connections/log_messages`

```go
	page, err := client.ExternalConnections.LogMessages.List(context.TODO(), telnyx.ExternalConnectionLogMessageListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`GET /external_connections/log_messages/{id}`

```go
	logMessage, err := client.ExternalConnections.LogMessages.Get(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", logMessage.LogMessages)
```

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`DELETE /external_connections/log_messages/{id}`

```go
	response, err := client.ExternalConnections.LogMessages.Dismiss(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Success)
```

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`GET /external_connections/{id}`

```go
	externalConnection, err := client.ExternalConnections.Get(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`PATCH /external_connections/{id}` — Required: `outbound`

Optional: `active` (boolean), `inbound` (object), `tags` (array[string]), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	externalConnection, err := client.ExternalConnections.Update(
		context.TODO(),
		"1293384261075731499",
		telnyx.ExternalConnectionUpdateParams{
			Outbound: telnyx.ExternalConnectionUpdateParamsOutbound{
				OutboundVoiceProfileID: "1911630617284445511",
			},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

## Deletes an External Connection

Permanently deletes an External Connection.

`DELETE /external_connections/{id}`

```go
	externalConnection, err := client.ExternalConnections.Delete(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`GET /external_connections/{id}/civic_addresses`

```go
	civicAddresses, err := client.ExternalConnections.CivicAddresses.List(
		context.TODO(),
		"1293384261075731499",
		telnyx.ExternalConnectionCivicAddressListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", civicAddresses.Data)
```

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`GET /external_connections/{id}/civic_addresses/{address_id}`

```go
	civicAddress, err := client.ExternalConnections.CivicAddresses.Get(
		context.TODO(),
		"318fb664-d341-44d2-8405-e6bfb9ced6d9",
		telnyx.ExternalConnectionCivicAddressGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", civicAddress.Data)
```

## Update a location's static emergency address

`PATCH /external_connections/{id}/locations/{location_id}` — Required: `static_emergency_address_id`

```go
	response, err := client.ExternalConnections.UpdateLocation(
		context.TODO(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ExternalConnectionUpdateLocationParams{
			ID:                       "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			StaticEmergencyAddressID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`GET /external_connections/{id}/phone_numbers`

```go
	page, err := client.ExternalConnections.PhoneNumbers.List(
		context.TODO(),
		"1293384261075731499",
		telnyx.ExternalConnectionPhoneNumberListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`GET /external_connections/{id}/phone_numbers/{phone_number_id}`

```go
	phoneNumber, err := client.ExternalConnections.PhoneNumbers.Get(
		context.TODO(),
		"1234567889",
		telnyx.ExternalConnectionPhoneNumberGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

Optional: `location_id` (uuid)

```go
	phoneNumber, err := client.ExternalConnections.PhoneNumbers.Update(
		context.TODO(),
		"1234567889",
		telnyx.ExternalConnectionPhoneNumberUpdateParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

## List all Releases

Returns a list of your Releases for the given external connection.

`GET /external_connections/{id}/releases`

```go
	page, err := client.ExternalConnections.Releases.List(
		context.TODO(),
		"1293384261075731499",
		telnyx.ExternalConnectionReleaseListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`GET /external_connections/{id}/releases/{release_id}`

```go
	release, err := client.ExternalConnections.Releases.Get(
		context.TODO(),
		"7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
		telnyx.ExternalConnectionReleaseGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", release.Data)
```

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`GET /external_connections/{id}/uploads`

```go
	page, err := client.ExternalConnections.Uploads.List(
		context.TODO(),
		"1293384261075731499",
		telnyx.ExternalConnectionUploadListParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers.

`POST /external_connections/{id}/uploads` — Required: `number_ids`

Optional: `additional_usages` (array[string]), `civic_address_id` (uuid), `location_id` (uuid), `usage` (enum)

```go
	upload, err := client.ExternalConnections.Uploads.New(
		context.TODO(),
		"1293384261075731499",
		telnyx.ExternalConnectionUploadNewParams{
			NumberIDs: []string{"3920457616934164700", "3920457616934164701", "3920457616934164702", "3920457616934164703"},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", upload.TicketID)
```

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`POST /external_connections/{id}/uploads/refresh`

```go
	response, err := client.ExternalConnections.Uploads.RefreshStatus(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Success)
```

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`GET /external_connections/{id}/uploads/status`

```go
	response, err := client.ExternalConnections.Uploads.PendingCount(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`GET /external_connections/{id}/uploads/{ticket_id}`

```go
	upload, err := client.ExternalConnections.Uploads.Get(
		context.TODO(),
		"7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
		telnyx.ExternalConnectionUploadGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", upload.Data)
```

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request.

`POST /external_connections/{id}/uploads/{ticket_id}/retry`

```go
	response, err := client.ExternalConnections.Uploads.Retry(
		context.TODO(),
		"7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
		telnyx.ExternalConnectionUploadRetryParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List uploaded media

Returns a list of stored media files.

`GET /media`

```go
	media, err := client.Media.List(context.TODO(), telnyx.MediaListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", media.Data)
```

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`POST /media` — Required: `media_url`

Optional: `media_name` (string), `ttl_secs` (integer)

```go
	response, err := client.Media.Upload(context.TODO(), telnyx.MediaUploadParams{
		MediaURL: "http://www.example.com/audio.mp3",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## Retrieve stored media

Returns the information about a stored media file.

`GET /media/{media_name}`

```go
	media, err := client.Media.Get(context.TODO(), "media_name")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", media.Data)
```

## Update stored media

Updates a stored media file.

`PUT /media/{media_name}`

Optional: `media_url` (string), `ttl_secs` (integer)

```go
	media, err := client.Media.Update(
		context.TODO(),
		"media_name",
		telnyx.MediaUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", media.Data)
```

## Deletes stored media

Deletes a stored media file.

`DELETE /media/{media_name}`

```go
	err := client.Media.Delete(context.TODO(), "media_name")
	if err != nil {
		panic(err.Error())
	}
```

## Download stored media

Downloads a stored media file.

`GET /media/{media_name}/download`

```go
	response, err := client.Media.Download(context.TODO(), "media_name")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response)
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user.

`POST /operator_connect/actions/refresh`

```go
	response, err := client.OperatorConnect.Actions.Refresh(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Message)
```

## List all recording transcriptions

Returns a list of your recording transcriptions.

`GET /recording_transcriptions`

```go
	recordingTranscriptions, err := client.RecordingTranscriptions.List(context.TODO())
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", recordingTranscriptions.Data)
```

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`GET /recording_transcriptions/{recording_transcription_id}`

```go
	recordingTranscription, err := client.RecordingTranscriptions.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", recordingTranscription.Data)
```

## Delete a recording transcription

Permanently deletes a recording transcription.

`DELETE /recording_transcriptions/{recording_transcription_id}`

```go
	recordingTranscription, err := client.RecordingTranscriptions.Delete(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", recordingTranscription.Data)
```

## List all call recordings

Returns a list of your call recordings.

`GET /recordings`

```go
	page, err := client.Recordings.List(context.TODO(), telnyx.RecordingListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`POST /recordings/actions/delete`

```go
	err := client.Recordings.Actions.Delete(context.TODO(), telnyx.RecordingActionDeleteParams{
		IDs: []string{"428c31b6-7af4-4bcb-b7f5-5013ef9657c1", "428c31b6-7af4-4bcb-b7f5-5013ef9657c2"},
	})
	if err != nil {
		panic(err.Error())
	}
```

## Retrieve a call recording

Retrieves the details of an existing call recording.

`GET /recordings/{recording_id}`

```go
	recording, err := client.Recordings.Get(context.TODO(), "recording_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", recording.Data)
```

## Delete a call recording

Permanently deletes a call recording.

`DELETE /recordings/{recording_id}`

```go
	recording, err := client.Recordings.Delete(context.TODO(), "recording_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", recording.Data)
```

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`POST /siprec_connectors`

```go
	siprecConnector, err := client.SiprecConnectors.New(context.TODO(), telnyx.SiprecConnectorNewParams{
		Host: "siprec.telnyx.com",
		Name: "my-siprec-connector",
		Port: 5060,
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", siprecConnector.Data)
```

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`GET /siprec_connectors/{connector_name}`

```go
	siprecConnector, err := client.SiprecConnectors.Get(context.TODO(), "connector_name")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", siprecConnector.Data)
```

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`PUT /siprec_connectors/{connector_name}`

```go
	siprecConnector, err := client.SiprecConnectors.Update(
		context.TODO(),
		"connector_name",
		telnyx.SiprecConnectorUpdateParams{
			Host: "siprec.telnyx.com",
			Name: "my-siprec-connector",
			Port: 5060,
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", siprecConnector.Data)
```

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`DELETE /siprec_connectors/{connector_name}`

```go
	err := client.SiprecConnectors.Delete(context.TODO(), "connector_name")
	if err != nil {
		panic(err.Error())
	}
```
