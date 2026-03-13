---
name: telnyx-webrtc-go
description: >-
  Manage WebRTC credentials and mobile push notification settings. Use when
  building browser-based or mobile softphone applications. This skill provides
  Go SDK examples.
metadata:
  internal: true
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

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Messages.Send(ctx, params)
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

## List mobile push credentials

`GET /mobile_push_credentials`

```go
	page, err := client.MobilePushCredentials.List(context.TODO(), telnyx.MobilePushCredentialListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

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

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

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

Returns: `alias` (string), `certificate` (string), `created_at` (date-time), `id` (string), `private_key` (string), `project_account_json_file` (object), `record_type` (string), `type` (string), `updated_at` (date-time)

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

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

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

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

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

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

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

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)

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

Returns: `created_at` (string), `expired` (boolean), `expires_at` (string), `id` (string), `name` (string), `record_type` (string), `resource_id` (string), `sip_password` (string), `sip_username` (string), `updated_at` (string), `user_id` (string)
