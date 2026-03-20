---
name: telnyx-sip-integrations-go
description: >-
  Call recordings, media storage, Dialogflow integration, and external
  connections for SIP trunking.
metadata:
  author: telnyx
  product: sip-integrations
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip Integrations - Go

## Core Workflow

### Prerequisites

1. SIP connection configured (see telnyx-sip-go)

### Steps

1. **List call recordings**: `client.CallRecordings.List(ctx, params)`
2. **Download recording**: `client.CallRecordings.Retrieve(ctx, params)`
3. **Upload media**: `client.MediaStorage.Create(ctx, params)`

### Common mistakes

- Call recordings require recording to be enabled on the connection or via call control commands
- Recording files are temporary — download and store them in your own storage

**Related skills**: telnyx-sip-go, telnyx-voice-go

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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.CallRecordings.List(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Retrieve a stored credential

Returns the information about custom storage credentials.

`client.CustomStorageCredentials.Get()` — `GET /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```go
	customStorageCredential, err := client.CustomStorageCredentials.Get(context.Background(), "connection_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", customStorageCredential.ConnectionID)
```

Key response fields: `response.data.backend, response.data.configuration`

## Create a custom storage credential

Creates a custom storage credentials configuration.

`client.CustomStorageCredentials.New()` — `POST /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```go
	customStorageCredential, err := client.CustomStorageCredentials.New(
		context.Background(),
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
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", customStorageCredential.ConnectionID)
```

Key response fields: `response.data.backend, response.data.configuration`

## Update a stored credential

Updates a stored custom credentials configuration.

`client.CustomStorageCredentials.Update()` — `PUT /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```go
	customStorageCredential, err := client.CustomStorageCredentials.Update(
		context.Background(),
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
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", customStorageCredential.ConnectionID)
```

Key response fields: `response.data.backend, response.data.configuration`

## Delete a stored credential

Deletes a stored custom credentials configuration.

`client.CustomStorageCredentials.Delete()` — `DELETE /custom_storage_credentials/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control, TeXM... |

```go
	err := client.CustomStorageCredentials.Delete(context.Background(), "connection_id")
	if err != nil {
		log.Fatal(err)
	}
```

## Retrieve stored Dialogflow Connection

Return details of the Dialogflow connection associated with the given CallControl connection.

`client.DialogflowConnections.Get()` — `GET /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```go
	dialogflowConnection, err := client.DialogflowConnections.Get(context.Background(), "connection_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dialogflowConnection.Data)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Create a Dialogflow Connection

Save Dialogflow Credentiails to Telnyx, so it can be used with other Telnyx services.

`client.DialogflowConnections.New()` — `POST /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```go
	dialogflowConnection, err := client.DialogflowConnections.New(
		context.Background(),
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
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dialogflowConnection.Data)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Update stored Dialogflow Connection

Updates a stored Dialogflow Connection.

`client.DialogflowConnections.Update()` — `PUT /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```go
	dialogflowConnection, err := client.DialogflowConnections.Update(
		context.Background(),
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
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dialogflowConnection.Data)
```

Key response fields: `response.data.connection_id, response.data.conversation_profile_id, response.data.environment`

## Delete stored Dialogflow Connection

Deletes a stored Dialogflow Connection.

`client.DialogflowConnections.Delete()` — `DELETE /dialogflow_connections/{connection_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Uniquely identifies a Telnyx application (Call Control). |

```go
	err := client.DialogflowConnections.Delete(context.Background(), "connection_id")
	if err != nil {
		log.Fatal(err)
	}
```

## List all External Connections

This endpoint returns a list of your External Connections inside the 'data' attribute of the response. External Connections are used by Telnyx customers to seamless configure SIP trunking integrations with Telnyx Partners, through External Voice Integrations in Mission Control Portal.

`client.ExternalConnections.List()` — `GET /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Filter parameter for external connections (deepObject style)... |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ExternalConnections.List(context.Background(), telnyx.ExternalConnectionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates an External Connection

Creates a new External Connection based on the parameters sent in the request. The external_sip_connection and outbound voice profile id are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.ExternalConnections.New()` — `POST /external_connections`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ExternalSipConnection` | enum (zoom) | Yes | The service that will be consuming this connection. |
| `Outbound` | object | Yes |  |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `Active` | boolean | No | Specifies whether the connection can be used. |
| `WebhookEventUrl` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	externalConnection, err := client.ExternalConnections.New(context.Background(), telnyx.ExternalConnectionNewParams{
		ExternalSipConnection: telnyx.ExternalConnectionNewParamsExternalSipConnectionZoom,
		Outbound:              telnyx.ExternalConnectionNewParamsOutbound{},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all log messages

Retrieve a list of log messages for all external connections associated with your account.

`client.ExternalConnections.LogMessages.List()` — `GET /external_connections/log_messages`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Filter parameter for log messages (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ExternalConnections.LogMessages.List(context.Background(), telnyx.ExternalConnectionLogMessageListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.log_messages, response.data.meta`

## Retrieve a log message

Retrieve a log message for an external connection associated with your account.

`client.ExternalConnections.LogMessages.Get()` — `GET /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	logMessage, err := client.ExternalConnections.LogMessages.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", logMessage.LogMessages)
```

Key response fields: `response.data.log_messages`

## Dismiss a log message

Dismiss a log message for an external connection associated with your account.

`client.ExternalConnections.LogMessages.Dismiss()` — `DELETE /external_connections/log_messages/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.ExternalConnections.LogMessages.Dismiss(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Success)
```

Key response fields: `response.data.success`

## Retrieve an External Connection

Return the details of an existing External Connection inside the 'data' attribute of the response.

`client.ExternalConnections.Get()` — `GET /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	externalConnection, err := client.ExternalConnections.Get(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update an External Connection

Updates settings of an existing External Connection based on the parameters of the request.

`client.ExternalConnections.Update()` — `PATCH /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Outbound` | object | Yes |  |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Tags` | array[string] | No | Tags associated with the connection. |
| `Active` | boolean | No | Specifies whether the connection can be used. |
| `WebhookEventUrl` | string (URL) | No | The URL where webhooks related to this connection will be se... |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	externalConnection, err := client.ExternalConnections.Update(
		context.Background(),
		"1293384261075731499",
		telnyx.ExternalConnectionUpdateParams{
			Outbound: telnyx.ExternalConnectionUpdateParamsOutbound{
				OutboundVoiceProfileID: "1911630617284445511",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes an External Connection

Permanently deletes an External Connection. Deletion may be prevented if the application is in use by phone numbers, is active, or if it is an Operator Connect connection. To remove an Operator Connect integration please contact Telnyx support.

`client.ExternalConnections.Delete()` — `DELETE /external_connections/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	externalConnection, err := client.ExternalConnections.Delete(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", externalConnection.Data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## List all civic addresses and locations

Returns the civic addresses and locations from Microsoft Teams.

`client.ExternalConnections.CivicAddresses.List()` — `GET /external_connections/{id}/civic_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Filter` | object | No | Filter parameter for civic addresses (deepObject style). |

```go
	civicAddresses, err := client.ExternalConnections.CivicAddresses.List(
		context.Background(),
		"1293384261075731499",
		telnyx.ExternalConnectionCivicAddressListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", civicAddresses.Data)
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Retrieve a Civic Address

Return the details of an existing Civic Address with its Locations inside the 'data' attribute of the response.

`client.ExternalConnections.CivicAddresses.Get()` — `GET /external_connections/{id}/civic_addresses/{address_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `AddressId` | string (UUID) | Yes | Identifies a civic address or a location. |

```go
	civicAddress, err := client.ExternalConnections.CivicAddresses.Get(
		context.Background(),
		"318fb664-d341-44d2-8405-e6bfb9ced6d9",
		telnyx.ExternalConnectionCivicAddressGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", civicAddress.Data)
```

Key response fields: `response.data.id, response.data.city_or_town, response.data.city_or_town_alias`

## Update a location's static emergency address

`client.ExternalConnections.UpdateLocation()` — `PATCH /external_connections/{id}/locations/{location_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `StaticEmergencyAddressId` | string (UUID) | Yes | A new static emergency address ID to update the location wit... |
| `Id` | string (UUID) | Yes | The ID of the external connection |
| `LocationId` | string (UUID) | Yes | The ID of the location to update |

```go
	response, err := client.ExternalConnections.UpdateLocation(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.ExternalConnectionUpdateLocationParams{
			ID:                       "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			StaticEmergencyAddressID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.accepted_address_suggestions, response.data.location_id, response.data.static_emergency_address_id`

## List all phone numbers

Returns a list of all active phone numbers associated with the given external connection.

`client.ExternalConnections.PhoneNumbers.List()` — `GET /external_connections/{id}/phone_numbers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Filter` | object | No | Filter parameter for phone numbers (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ExternalConnections.PhoneNumbers.List(
		context.Background(),
		"1293384261075731499",
		telnyx.ExternalConnectionPhoneNumberListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Retrieve a phone number

Return the details of a phone number associated with the given external connection.

`client.ExternalConnections.PhoneNumbers.Get()` — `GET /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `PhoneNumberId` | string (UUID) | Yes | A phone number's ID via the Telnyx API |

```go
	phoneNumber, err := client.ExternalConnections.PhoneNumbers.Get(
		context.Background(),
		"1234567889",
		telnyx.ExternalConnectionPhoneNumberGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## Update a phone number

Asynchronously update settings of the phone number associated with the given external connection.

`client.ExternalConnections.PhoneNumbers.Update()` — `PATCH /external_connections/{id}/phone_numbers/{phone_number_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `PhoneNumberId` | string (UUID) | Yes | A phone number's ID via the Telnyx API |
| `LocationId` | string (UUID) | No | Identifies the location to assign the phone number to. |

```go
	phoneNumber, err := client.ExternalConnections.PhoneNumbers.Update(
		context.Background(),
		"1234567889",
		telnyx.ExternalConnectionPhoneNumberUpdateParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", phoneNumber.Data)
```

Key response fields: `response.data.acquired_capabilities, response.data.civic_address_id, response.data.displayed_country_code`

## List all Releases

Returns a list of your Releases for the given external connection. These are automatically created when you change the `connection_id` of a phone number that is currently on Microsoft Teams.

`client.ExternalConnections.Releases.List()` — `GET /external_connections/{id}/releases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Filter` | object | No | Filter parameter for releases (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ExternalConnections.Releases.List(
		context.Background(),
		"1293384261075731499",
		telnyx.ExternalConnectionReleaseListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## Retrieve a Release request

Return the details of a Release request and its phone numbers.

`client.ExternalConnections.Releases.Get()` — `GET /external_connections/{id}/releases/{release_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `ReleaseId` | string (UUID) | Yes | Identifies a Release request |

```go
	release, err := client.ExternalConnections.Releases.Get(
		context.Background(),
		"7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
		telnyx.ExternalConnectionReleaseGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", release.Data)
```

Key response fields: `response.data.status, response.data.created_at, response.data.error_message`

## List all Upload requests

Returns a list of your Upload requests for the given external connection.

`client.ExternalConnections.Uploads.List()` — `GET /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Filter` | object | No | Filter parameter for uploads (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ExternalConnections.Uploads.List(
		context.Background(),
		"1293384261075731499",
		telnyx.ExternalConnectionUploadListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Creates an Upload request

Creates a new Upload request to Microsoft teams with the included phone numbers. Only one of civic_address_id or location_id must be provided, not both. The maximum allowed phone numbers for the numbers_ids array is 1000.

`client.ExternalConnections.Uploads.New()` — `POST /external_connections/{id}/uploads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `NumberIds` | array[string] | Yes |  |
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `Usage` | enum (calling_user_assignment, first_party_app_assignment) | No | The use case of the upload request. |
| `LocationId` | string (UUID) | No | Identifies the location to assign all phone numbers to. |
| `CivicAddressId` | string (UUID) | No | Identifies the civic address to assign all phone numbers to. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	upload, err := client.ExternalConnections.Uploads.New(
		context.Background(),
		"1293384261075731499",
		telnyx.ExternalConnectionUploadNewParams{
			NumberIDs: []string{"3920457616934164700", "3920457616934164701", "3920457616934164702", "3920457616934164703"},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", upload.TicketID)
```

Key response fields: `response.data.success, response.data.ticket_id`

## Refresh the status of all Upload requests

Forces a recheck of the status of all pending Upload requests for the given external connection in the background.

`client.ExternalConnections.Uploads.RefreshStatus()` — `POST /external_connections/{id}/uploads/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.ExternalConnections.Uploads.RefreshStatus(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Success)
```

Key response fields: `response.data.success`

## Get the count of pending upload requests

Returns the count of all pending upload requests for the given external connection.

`client.ExternalConnections.Uploads.PendingCount()` — `GET /external_connections/{id}/uploads/status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	response, err := client.ExternalConnections.Uploads.PendingCount(context.Background(), "1293384261075731499")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.pending_numbers_count, response.data.pending_orders_count`

## Retrieve an Upload request

Return the details of an Upload request and its phone numbers.

`client.ExternalConnections.Uploads.Get()` — `GET /external_connections/{id}/uploads/{ticket_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `TicketId` | string (UUID) | Yes | Identifies an Upload request |

```go
	upload, err := client.ExternalConnections.Uploads.Get(
		context.Background(),
		"7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
		telnyx.ExternalConnectionUploadGetParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", upload.Data)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## Retry an Upload request

If there were any errors during the upload process, this endpoint will retry the upload request. In some cases this will reattempt the existing upload request, in other cases it may create a new upload request. Please check the ticket_id in the response to determine if a new upload request was created.

`client.ExternalConnections.Uploads.Retry()` — `POST /external_connections/{id}/uploads/{ticket_id}/retry`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `TicketId` | string (UUID) | Yes | Identifies an Upload request |

```go
	response, err := client.ExternalConnections.Uploads.Retry(
		context.Background(),
		"7b6a6449-b055-45a6-81f6-f6f0dffa4cc6",
		telnyx.ExternalConnectionUploadRetryParams{
			ID: "1293384261075731499",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.available_usages, response.data.error_code`

## List uploaded media

Returns a list of stored media files.

`client.Media.List()` — `GET /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	media, err := client.Media.List(context.Background(), telnyx.MediaListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", media.Data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Upload media

Upload media file to Telnyx so it can be used with other Telnyx services

`client.Media.Upload()` — `POST /media`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MediaUrl` | string (URL) | Yes | The URL where the media to be stored in Telnyx network is cu... |
| `TtlSecs` | integer | No | The number of seconds after which the media resource will be... |
| `MediaName` | string | No | The unique identifier of a file. |

```go
	response, err := client.Media.Upload(context.Background(), telnyx.MediaUploadParams{
		MediaURL: "http://www.example.com/audio.mp3",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Retrieve stored media

Returns the information about a stored media file.

`client.Media.Get()` — `GET /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MediaName` | string | Yes | Uniquely identifies a media resource. |

```go
	media, err := client.Media.Get(context.Background(), "media_name")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", media.Data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Update stored media

Updates a stored media file.

`client.Media.Update()` — `PUT /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MediaName` | string | Yes | Uniquely identifies a media resource. |
| `MediaUrl` | string (URL) | No | The URL where the media to be stored in Telnyx network is cu... |
| `TtlSecs` | integer | No | The number of seconds after which the media resource will be... |

```go
	media, err := client.Media.Update(
		context.Background(),
		"media_name",
		telnyx.MediaUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", media.Data)
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.content_type`

## Deletes stored media

Deletes a stored media file.

`client.Media.Delete()` — `DELETE /media/{media_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MediaName` | string | Yes | Uniquely identifies a media resource. |

```go
	err := client.Media.Delete(context.Background(), "media_name")
	if err != nil {
		log.Fatal(err)
	}
```

## Download stored media

Downloads a stored media file.

`client.Media.Download()` — `GET /media/{media_name}/download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MediaName` | string | Yes | Uniquely identifies a media resource. |

```go
	response, err := client.Media.Download(context.Background(), "media_name")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Refresh Operator Connect integration

This endpoint will make an asynchronous request to refresh the Operator Connect integration with Microsoft Teams for the current user. This will create new external connections on the user's account if needed, and/or report the integration results as [log messages](https://developers.telnyx.com/api-reference/external-connections/list-all-log-messages#list-all-log-messages).

`client.OperatorConnect.Actions.Refresh()` — `POST /operator_connect/actions/refresh`

```go
	response, err := client.OperatorConnect.Actions.Refresh(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Message)
```

Key response fields: `response.data.message, response.data.success`

## List all recording transcriptions

Returns a list of your recording transcriptions.

`client.RecordingTranscriptions.List()` — `GET /recording_transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Filter recording transcriptions by various attributes. |

```go
	page, err := client.RecordingTranscriptions.List(context.Background(), telnyx.RecordingTranscriptionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Retrieve a recording transcription

Retrieves the details of an existing recording transcription.

`client.RecordingTranscriptions.Get()` — `GET /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RecordingTranscriptionId` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```go
	recordingTranscription, err := client.RecordingTranscriptions.Get(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", recordingTranscription.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a recording transcription

Permanently deletes a recording transcription.

`client.RecordingTranscriptions.Delete()` — `DELETE /recording_transcriptions/{recording_transcription_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RecordingTranscriptionId` | string (UUID) | Yes | Uniquely identifies the recording transcription by id. |

```go
	recordingTranscription, err := client.RecordingTranscriptions.Delete(context.Background(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", recordingTranscription.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List all call recordings

Returns a list of your call recordings.

`client.Recordings.List()` — `GET /recordings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Filter recordings by various attributes. |

```go
	page, err := client.Recordings.List(context.Background(), telnyx.RecordingListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a list of call recordings

Permanently deletes a list of call recordings.

`client.Recordings.Actions.Delete()` — `POST /recordings/actions/delete`

```go
	action, err := client.Recordings.Actions.Delete(context.Background(), telnyx.RecordingActionDeleteParams{
		IDs: []string{"428c31b6-7af4-4bcb-b7f5-5013ef9657c1", "428c31b6-7af4-4bcb-b7f5-5013ef9657c2"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", action.Status)
```

Key response fields: `response.data.status`

## Retrieve a call recording

Retrieves the details of an existing call recording.

`client.Recordings.Get()` — `GET /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RecordingId` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```go
	recording, err := client.Recordings.Get(context.Background(), "recording_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", recording.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a call recording

Permanently deletes a call recording.

`client.Recordings.Delete()` — `DELETE /recordings/{recording_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RecordingId` | string (UUID) | Yes | Uniquely identifies the recording by id. |

```go
	recording, err := client.Recordings.Delete(context.Background(), "recording_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", recording.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Create a SIPREC connector

Creates a new SIPREC connector configuration.

`client.SiprecConnectors.New()` — `POST /siprec_connectors`

```go
	siprecConnector, err := client.SiprecConnectors.New(context.Background(), telnyx.SiprecConnectorNewParams{
		Host: "siprec.telnyx.com",
		Name: "my-siprec-connector",
		Port: 5060,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", siprecConnector.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Retrieve a SIPREC connector

Returns details of a stored SIPREC connector.

`client.SiprecConnectors.Get()` — `GET /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```go
	siprecConnector, err := client.SiprecConnectors.Get(context.Background(), "connector_name")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", siprecConnector.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update a SIPREC connector

Updates a stored SIPREC connector configuration.

`client.SiprecConnectors.Update()` — `PUT /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```go
	siprecConnector, err := client.SiprecConnectors.Update(
		context.Background(),
		"connector_name",
		telnyx.SiprecConnectorUpdateParams{
			Host: "siprec.telnyx.com",
			Name: "my-siprec-connector",
			Port: 5060,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", siprecConnector.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete a SIPREC connector

Deletes a stored SIPREC connector.

`client.SiprecConnectors.Delete()` — `DELETE /siprec_connectors/{connector_name}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectorName` | string | Yes | Uniquely identifies a SIPREC connector. |

```go
	err := client.SiprecConnectors.Delete(context.Background(), "connector_name")
	if err != nil {
		log.Fatal(err)
	}
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
