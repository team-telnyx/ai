---
name: telnyx-verify-go
description: >-
  Phone verification via SMS/voice/flashcall OTP and number lookup (carrier,
  type, caller name).
metadata:
  author: telnyx
  product: verify
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - Go

## Core Workflow

### Prerequisites

1. Create a Verify Profile with channel settings (SMS, Call, Flashcall, RCS, DTMF)

### Steps

1. **Create profile**: `client.VerifyProfiles.Create(ctx, params)`
2. **Trigger verification**: `client.Verifications.TriggerSms(ctx, params)`
3. **User receives code**: `Via SMS, call, flashcall, RCS, or DTMF`
4. **Submit code**: `client.Verifications.ByPhoneNumber.Actions.Verify(ctx, params)`

### Which approach to use?

| Scenario | Recommendation |
|----------|---------------|
| Default, widest reach | SMS verification |
| Landlines or accessibility | Voice call verification |
| Frictionless mobile (code in caller ID) | Flashcall verification |
| Ownership confirmation without code entry | DTMF Confirm |
| Rich mobile UX with SMS fallback | RCS verification |

### Common mistakes

- NEVER use non-E.164 phone numbers — returns 400 Bad Request
- NEVER reuse expired verification IDs — must re-trigger verification
- For DTMF Confirm: result is ONLY delivered via webhook — configure your webhook endpoint in the Verify Profile settings. No verify webhooks are documented in this skill; handle the verify.dtmf_confirm event manually
- When verifying by ID, you MUST pass the code parameter — omitting it will not validate the user's input

**Related skills**: telnyx-messaging-go, telnyx-voice-go

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

result, err := client.Verifications.TriggerSms(ctx, params)
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Trigger SMS verification

`client.Verifications.TriggerSMS()` — `POST /verifications/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `TimeoutSecs` | integer | No | The number of seconds the verification code is valid for. |
| `CustomCode` | string | No | Send a self-generated numeric code to the end-user |

```go
	createVerificationResponse, err := client.Verifications.TriggerSMS(context.Background(), telnyx.VerificationTriggerSMSParams{
		PhoneNumber:     "+13035551234",
		VerifyProfileID: "12ade33a-21c0-473b-b055-b3c836e1c292",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", createVerificationResponse.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by phone number

`client.Verifications.ByPhoneNumber.Actions.Verify()` — `POST /verifications/by_phone_number/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Code` | string | Yes | This is the code the user submits for verification. |
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```go
	verifyVerificationCodeResponse, err := client.Verifications.ByPhoneNumber.Actions.Verify(
		context.Background(),
		"+13035551234",
		telnyx.VerificationByPhoneNumberActionVerifyParams{
			Code:            "17686",
			VerifyProfileID: "12ade33a-21c0-473b-b055-b3c836e1c292",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifyVerificationCodeResponse.Data)
```

Key response fields: `response.data.phone_number, response.data.response_code`

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`client.VerifyProfiles.New()` — `POST /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes |  |
| `WebhookUrl` | string (URL) | No |  |
| `WebhookFailoverUrl` | string (URL) | No |  |
| `Sms` | object | No |  |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```go
	verifyProfileData, err := client.VerifyProfiles.New(context.Background(), telnyx.VerifyProfileNewParams{
		Name: "Test Profile",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifyProfileData.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Trigger Call verification

`client.Verifications.TriggerCall()` — `POST /verifications/call`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `TimeoutSecs` | integer | No | The number of seconds the verification code is valid for. |
| `CustomCode` | string | No | Send a self-generated numeric code to the end-user |
| `Extension` | string | No | Optional extension to dial after call is answered using DTMF... |

```go
	createVerificationResponse, err := client.Verifications.TriggerCall(context.Background(), telnyx.VerificationTriggerCallParams{
		PhoneNumber:     "+13035551234",
		VerifyProfileID: "12ade33a-21c0-473b-b055-b3c836e1c292",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", createVerificationResponse.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Lookup phone number data

Returns information about the provided phone number.

`client.NumberLookup.Get()` — `GET /number_lookup/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | The phone number to be looked up |
| `Type` | enum (carrier, caller-name) | No | Specifies the type of number lookup to be performed |

```go
	numberLookup, err := client.NumberLookup.Get(
		context.Background(),
		"+18665552368",
		telnyx.NumberLookupGetParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", numberLookup.Data)
```

Key response fields: `response.data.phone_number, response.data.caller_name, response.data.carrier`

## List verifications by phone number

`client.Verifications.ByPhoneNumber.List()` — `GET /verifications/by_phone_number/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```go
	byPhoneNumbers, err := client.Verifications.ByPhoneNumber.List(context.Background(), "+13035551234")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", byPhoneNumbers.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Trigger Flash call verification

`client.Verifications.TriggerFlashcall()` — `POST /verifications/flashcall`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PhoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `TimeoutSecs` | integer | No | The number of seconds the verification code is valid for. |

```go
	createVerificationResponse, err := client.Verifications.TriggerFlashcall(context.Background(), telnyx.VerificationTriggerFlashcallParams{
		PhoneNumber:     "+13035551234",
		VerifyProfileID: "12ade33a-21c0-473b-b055-b3c836e1c292",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", createVerificationResponse.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve verification

`client.Verifications.Get()` — `GET /verifications/{verification_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerificationId` | string (UUID) | Yes | The identifier of the verification to retrieve. |

```go
	verification, err := client.Verifications.Get(context.Background(), "12ade33a-21c0-473b-b055-b3c836e1c292")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verification.Data)
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by ID

`client.Verifications.Actions.Verify()` — `POST /verifications/{verification_id}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerificationId` | string (UUID) | Yes | The identifier of the verification to retrieve. |
| `Status` | enum (accepted, rejected) | No | Identifies if the verification code has been accepted or rej... |
| `Code` | string | No | This is the code the user submits for verification. |

```go
	verifyVerificationCodeResponse, err := client.Verifications.Actions.Verify(
		context.Background(),
		"12ade33a-21c0-473b-b055-b3c836e1c292",
		telnyx.VerificationActionVerifyParams{
		Code: "12345",
	},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifyVerificationCodeResponse.Data)
```

Key response fields: `response.data.phone_number, response.data.response_code`

## List all Verify profiles

Gets a paginated list of Verify profiles.

`client.VerifyProfiles.List()` — `GET /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Filter` | object | No | Consolidated filter parameter (deepObject style). |
| `Page` | object | No | Consolidated page parameter (deepObject style). |

```go
	page, err := client.VerifyProfiles.List(context.Background(), telnyx.VerifyProfileListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve Verify profile message templates

List all Verify profile message templates.

`client.VerifyProfiles.GetTemplates()` — `GET /verify_profiles/templates`

```go
	response, err := client.VerifyProfiles.GetTemplates(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.id, response.data.text`

## Create message template

Create a new Verify profile message template.

`client.VerifyProfiles.NewTemplate()` — `POST /verify_profiles/templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Text` | string | Yes | The text content of the message template. |

```go
	messageTemplate, err := client.VerifyProfiles.NewTemplate(context.Background(), telnyx.VerifyProfileNewTemplateParams{
		Text: "Your {{app_name}} verification code is: {{code}}.",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messageTemplate.Data)
```

Key response fields: `response.data.id, response.data.text`

## Update message template

Update an existing Verify profile message template.

`client.VerifyProfiles.UpdateTemplate()` — `PATCH /verify_profiles/templates/{template_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Text` | string | Yes | The text content of the message template. |
| `TemplateId` | string (UUID) | Yes | The identifier of the message template to update. |

```go
	messageTemplate, err := client.VerifyProfiles.UpdateTemplate(
		context.Background(),
		"12ade33a-21c0-473b-b055-b3c836e1c292",
		telnyx.VerifyProfileUpdateTemplateParams{
			Text: "Your {{app_name}} verification code is: {{code}}.",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", messageTemplate.Data)
```

Key response fields: `response.data.id, response.data.text`

## Retrieve Verify profile

Gets a single Verify profile.

`client.VerifyProfiles.Get()` — `GET /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to retrieve. |

```go
	verifyProfileData, err := client.VerifyProfiles.Get(context.Background(), "12ade33a-21c0-473b-b055-b3c836e1c292")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifyProfileData.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Verify profile

`client.VerifyProfiles.Update()` — `PATCH /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to update. |
| `WebhookUrl` | string (URL) | No |  |
| `WebhookFailoverUrl` | string (URL) | No |  |
| `Name` | string | No |  |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```go
	verifyProfileData, err := client.VerifyProfiles.Update(
		context.Background(),
		"12ade33a-21c0-473b-b055-b3c836e1c292",
		telnyx.VerifyProfileUpdateParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifyProfileData.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Verify profile

`client.VerifyProfiles.Delete()` — `DELETE /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `VerifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to delete. |

```go
	verifyProfileData, err := client.VerifyProfiles.Delete(context.Background(), "12ade33a-21c0-473b-b055-b3c836e1c292")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", verifyProfileData.Data)
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
