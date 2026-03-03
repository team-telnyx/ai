---
name: telnyx-webrtc-go
description: >-
  Manage WebRTC credentials and mobile push notification settings. Use when
  building browser-based or mobile softphone applications. This skill provides
  Go SDK examples.
metadata:
  author: telnyx
  product: webrtc
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Webrtc - Go

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

## List mobile push credentials

`GET /mobile_push_credentials`

```go
	page, err := client.MobilePushCredentials.List(context.TODO(), telnyx.MobilePushCredentialListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Creates a new mobile push credential

`POST /mobile_push_credentials`

```go
	pushCredentialResponse, err := client.MobilePushCredentials.New(context.TODO(), telnyx.MobilePushCredentialNewParams{
		OfIos: &telnyx.MobilePushCredentialNewParamsCreateMobilePushCredentialRequestIos{
			Alias:       "LucyIosCredential",
			Certificate: "-----BEGIN CERTIFICATE----- MIIGVDCCBTKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END CERTIFICATE-----",
			PrivateKey:  "-----BEGIN RSA PRIVATE KEY----- MIIEpQIBAAKCAQEAsNlRJVZn9ZvXcECQm65czs... -----END RSA PRIVATE KEY-----",
		},
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", pushCredentialResponse.Data)
```

## Retrieves a mobile push credential

Retrieves mobile push credential based on the given `push_credential_id`

`GET /mobile_push_credentials/{push_credential_id}`

```go
	pushCredentialResponse, err := client.MobilePushCredentials.Get(context.TODO(), "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", pushCredentialResponse.Data)
```

## Deletes a mobile push credential

Deletes a mobile push credential based on the given `push_credential_id`

`DELETE /mobile_push_credentials/{push_credential_id}`

```go
	err := client.MobilePushCredentials.Delete(context.TODO(), "0ccc7b76-4df3-4bca-a05a-3da1ecc389f0")
	if err != nil {
		panic(err.Error())
	}
```

## List all credentials

List all On-demand Credentials.

`GET /telephony_credentials`

```go
	page, err := client.TelephonyCredentials.List(context.TODO(), telnyx.TelephonyCredentialListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a credential

Create a credential.

`POST /telephony_credentials` — Required: `connection_id`

Optional: `expires_at` (string), `name` (string), `tag` (string)

```go
	telephonyCredential, err := client.TelephonyCredentials.New(context.TODO(), telnyx.TelephonyCredentialNewParams{
		ConnectionID: "1234567890",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

## Get a credential

Get the details of an existing On-demand Credential.

`GET /telephony_credentials/{id}`

```go
	telephonyCredential, err := client.TelephonyCredentials.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

## Update a credential

Update an existing credential.

`PATCH /telephony_credentials/{id}`

Optional: `connection_id` (string), `expires_at` (string), `name` (string), `tag` (string)

```go
	telephonyCredential, err := client.TelephonyCredentials.Update(
		context.TODO(),
		"id",
		telnyx.TelephonyCredentialUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```

## Delete a credential

Delete an existing credential.

`DELETE /telephony_credentials/{id}`

```go
	telephonyCredential, err := client.TelephonyCredentials.Delete(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", telephonyCredential.Data)
```
