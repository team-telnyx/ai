---
name: telnyx-numbers-services-go
description: >-
  Voicemail, voice channels, and emergency (E911) services for phone numbers.
metadata:
  author: telnyx
  product: numbers-services
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Numbers Services - Go

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-go)

### Steps

1. **Set up voicemail**: `client.Voicemail.Create(ctx, params)`
2. **Configure E911**: `client.DynamicEmergencyEndpoints.Create(ctx, params)`

### Common mistakes

- E911 addresses must be validated — invalid addresses will cause regulatory issues

**Related skills**: telnyx-numbers-go, telnyx-numbers-config-go

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

result, err := client.Voicemail.Create(ctx, params)
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

## List your voice channels for non-US zones

Returns the non-US voice channels for your account. voice channels allow you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.ChannelZones.List()` — `GET /channel_zones`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.ChannelZones.List(context.Background(), telnyx.ChannelZoneListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones. This allows your account to handle multiple simultaneous inbound calls to Non-US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.ChannelZones.Update()` — `PUT /channel_zones/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Channels` | integer | Yes | The number of reserved channels |

```go
	channelZone, err := client.ChannelZones.Update(
		context.Background(),
		"channel_zone_id",
		telnyx.ChannelZoneUpdateParams{
			Channels: 0,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", channelZone.ID)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`client.DynamicEmergencyAddresses.List()` — `GET /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.DynamicEmergencyAddresses.List(context.Background(), telnyx.DynamicEmergencyAddressListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency address.

Creates a dynamic emergency address.

`client.DynamicEmergencyAddresses.New()` — `POST /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `HouseNumber` | string | Yes |  |
| `StreetName` | string | Yes |  |
| `Locality` | string | Yes |  |
| `AdministrativeArea` | string | Yes |  |
| `PostalCode` | string | Yes |  |
| `CountryCode` | enum (US, CA, PR) | Yes |  |
| `SipGeolocationId` | string (UUID) | No | Unique location reference string to be used in SIP INVITE fr... |
| `Status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `Id` | string (UUID) | No |  |
| ... | | | +8 optional params in [references/api-details.md](references/api-details.md) |

```go
	dynamicEmergencyAddress, err := client.DynamicEmergencyAddresses.New(context.Background(), telnyx.DynamicEmergencyAddressNewParams{
		DynamicEmergencyAddress: telnyx.DynamicEmergencyAddressParam{
			AdministrativeArea: "TX",
			CountryCode:        telnyx.DynamicEmergencyAddressCountryCodeUs,
			HouseNumber:        "600",
			Locality:           "Austin",
			PostalCode:         "78701",
			StreetName:         "Congress",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dynamicEmergencyAddress.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`client.DynamicEmergencyAddresses.Get()` — `GET /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Dynamic Emergency Address id |

```go
	dynamicEmergencyAddress, err := client.DynamicEmergencyAddresses.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dynamicEmergencyAddress.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`client.DynamicEmergencyAddresses.Delete()` — `DELETE /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Dynamic Emergency Address id |

```go
	dynamicEmergencyAddress, err := client.DynamicEmergencyAddresses.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dynamicEmergencyAddress.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`client.DynamicEmergencyEndpoints.List()` — `GET /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page` | object | No | Consolidated page parameter (deepObject style). |
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |

```go
	page, err := client.DynamicEmergencyEndpoints.List(context.Background(), telnyx.DynamicEmergencyEndpointListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency endpoint.

Creates a dynamic emergency endpoints.

`client.DynamicEmergencyEndpoints.New()` — `POST /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `DynamicEmergencyAddressId` | string (UUID) | Yes | An id of a currently active dynamic emergency location. |
| `CallbackNumber` | string | Yes |  |
| `CallerName` | string | Yes |  |
| `Status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `SipFromId` | string (UUID) | No |  |
| `Id` | string (UUID) | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	dynamicEmergencyEndpoint, err := client.DynamicEmergencyEndpoints.New(context.Background(), telnyx.DynamicEmergencyEndpointNewParams{
		DynamicEmergencyEndpoint: telnyx.DynamicEmergencyEndpointParam{
			CallbackNumber:            "+13125550000",
			CallerName:                "Jane Doe Desk Phone",
			DynamicEmergencyAddressID: "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dynamicEmergencyEndpoint.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`client.DynamicEmergencyEndpoints.Get()` — `GET /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```go
	dynamicEmergencyEndpoint, err := client.DynamicEmergencyEndpoints.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dynamicEmergencyEndpoint.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`client.DynamicEmergencyEndpoints.Delete()` — `DELETE /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```go
	dynamicEmergencyEndpoint, err := client.DynamicEmergencyEndpoints.Delete(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", dynamicEmergencyEndpoint.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List your voice channels for US Zone

Returns the US Zone voice channels for your account. voice channels allows you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.InboundChannels.List()` — `GET /inbound_channels`

```go
	inboundChannels, err := client.InboundChannels.List(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", inboundChannels.Data)
```

Key response fields: `response.data.channels, response.data.record_type`

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone. This allows your account to handle multiple simultaneous inbound calls to US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.InboundChannels.Update()` — `PATCH /inbound_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Channels` | integer | Yes | The new number of concurrent channels for the account |

```go
	inboundChannel, err := client.InboundChannels.Update(context.Background(), telnyx.InboundChannelUpdateParams{
		Channels: 7,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", inboundChannel.Data)
```

Key response fields: `response.data.channels, response.data.record_type`

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`client.List.GetAll()` — `GET /list`

```go
	response, err := client.List.GetAll(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`client.List.GetByZone()` — `GET /list/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ChannelZoneId` | string (UUID) | Yes | Channel zone identifier |

```go
	response, err := client.List.GetByZone(context.Background(), "channel_zone_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## Get voicemail

Returns the voicemail settings for a phone number

`client.PhoneNumbers.Voicemail.Get()` — `GET /phone_numbers/{phone_number_id}/voicemail`

```go
	voicemail, err := client.PhoneNumbers.Voicemail.Get(context.Background(), "123455678900")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voicemail.Data)
```

Key response fields: `response.data.enabled, response.data.pin`

## Create voicemail

Create voicemail settings for a phone number

`client.PhoneNumbers.Voicemail.New()` — `POST /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Pin` | string | No | The pin used for voicemail |
| `Enabled` | boolean | No | Whether voicemail is enabled. |

```go
	voicemail, err := client.PhoneNumbers.Voicemail.New(
		context.Background(),
		"123455678900",
		telnyx.PhoneNumberVoicemailNewParams{
			VoicemailRequest: telnyx.VoicemailRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voicemail.Data)
```

Key response fields: `response.data.enabled, response.data.pin`

## Update voicemail

Update voicemail settings for a phone number

`client.PhoneNumbers.Voicemail.Update()` — `PATCH /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Pin` | string | No | The pin used for voicemail |
| `Enabled` | boolean | No | Whether voicemail is enabled. |

```go
	voicemail, err := client.PhoneNumbers.Voicemail.Update(
		context.Background(),
		"123455678900",
		telnyx.PhoneNumberVoicemailUpdateParams{
			VoicemailRequest: telnyx.VoicemailRequestParam{},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", voicemail.Data)
```

Key response fields: `response.data.enabled, response.data.pin`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
