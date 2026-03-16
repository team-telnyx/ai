---
name: telnyx-webrtc-go
description: >-
  WebRTC credentials and push notification settings. Use for browser or mobile
  softphone apps.
metadata:
  author: telnyx
  product: webrtc
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Webrtc - Go

## Core Workflow

### Prerequisites

1. Create a Credential Connection for WebRTC authentication

### Steps

1. **Create credential**: `client.TelephonyCredentials.Create(ctx, params)`
2. **Generate SIP token**: `client.TelephonyCredentials.Token.Create(ctx, params)`
3. **Use in client SDK**: `Pass the token to Telnyx WebRTC SDK (JS, iOS, Android, Flutter, React Native)`

### Common mistakes

- SIP tokens are short-lived — generate a fresh token for each session
- For push notifications on mobile: configure push credentials for APNS (iOS) or FCM (Android)

**Related skills**: telnyx-sip-go, telnyx-video-go

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

result, err := client.TelephonyCredentials.Create(ctx, params)
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

## List mobile push credentials

`client.MobilePushCredentials.List()` — `GET /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.MobilePushCredentials.List(context.Background(), telnyx.MobilePushCredentialListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Creates a new mobile push credential

`client.MobilePushCredentials.New()` — `POST /mobile_push_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Type` | enum (ios) | Yes | Type of mobile push credential. |
| `Certificate` | string | Yes | Certificate as received from APNs |
| `PrivateKey` | string | Yes | Corresponding private key to the certificate as received fro... |
| `Alias` | string | Yes | Alias to uniquely identify the credential |

```go
	pushCredentialResponse, err := client.MobilePushCredentials.New(context.Background(), telnyx.MobilePushCredentialNewParams{
		OfIos: &telnyx.MobilePushCredentialNewParamsCreateMobilePushCredentialRequestIos{
			Alias:       "LucyIosCredential",
			Certificate: "-----BEGIN CERTIFICATE----- MIIGVDCCBTKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END CERTIFICATE-----",
			PrivateKey:  "-----BEGIN RSA PRIVATE KEY----- MIIEpQIBAAKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END RSA PRIVATE KEY-----",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", pushCredentialResponse.Data)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`client.MobilePushCredentials.Get()` — `GET /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PushCredentialId` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```go
	pushCredentialResponse, err := client.MobilePushCredentials.Get(context.Background(), "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", pushCredentialResponse.Data)
```

Key response fields: `response.data.id, response.data.type, response.data.created_at`

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`client.MobilePushCredentials.Delete()` — `DELETE /mobile_push_credentials/{push_credential_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PushCredentialId` | string (UUID) | Yes | The unique identifier of a mobile push credential |

```go
	err := client.MobilePushCredentials.Delete(context.Background(), "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")
	if err != nil {
		log.Fatal(err)
	}
```

## List all credentials

List all On-demand Credentials.

`client.TelephonyCredentials.List()` — `GET /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.TelephonyCredentials.List(context.Background(), telnyx.TelephonyCredentialListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Create a credential

Create a credential.

`client.TelephonyCredentials.New()` — `POST /telephony_credentials`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ConnectionId` | string (UUID) | Yes | Identifies the Credential Connection this credential is asso... |
| `Name` | string | No |  |
| `Tag` | string | No | Tags a credential. |
| `ExpiresAt` | string | No | ISO-8601 formatted date indicating when the credential will ... |

```go
	telephonyCredential, err := client.TelephonyCredentials.New(context.Background(), telnyx.TelephonyCredentialNewParams{
		ConnectionID: "1234567890",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Get a credential

Get the details of an existing On-demand Credential.

`client.TelephonyCredentials.Get()` — `GET /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	telephonyCredential, err := client.TelephonyCredentials.Get(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update a credential

Update an existing credential.

`client.TelephonyCredentials.Update()` — `PATCH /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |
| `ConnectionId` | string (UUID) | No | Identifies the Credential Connection this credential is asso... |
| `Name` | string | No |  |
| `Tag` | string | No | Tags a credential. |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	telephonyCredential, err := client.TelephonyCredentials.Update(
		context.Background(),
		"id",
		telnyx.TelephonyCredentialUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete a credential

Delete an existing credential.

`client.TelephonyCredentials.Delete()` — `DELETE /telephony_credentials/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Identifies the resource. |

```go
	telephonyCredential, err := client.TelephonyCredentials.Delete(context.Background(), "id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
