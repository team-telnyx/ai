<!-- SDK reference: telnyx-verify-javascript -->

# Telnyx Verify - JavaScript

## Core Workflow

### Prerequisites

1. Create a Verify Profile with channel settings (SMS, Call, Flashcall, RCS, DTMF)

### Steps

1. **Create profile**: `client.verifyProfiles.create({name: ..., defaultTimeoutSecs: ...})`
2. **Trigger verification**: `client.verifications.triggerSms({phoneNumber: ..., verifyProfileId: ...})`
3. **User receives code**: `Via SMS, call, flashcall, RCS, or DTMF`
4. **Submit code**: `client.verifications.byPhoneNumber.actions.verify({phoneNumber: ..., code: ..., verifyProfileId: ...})`

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

**Related skills**: telnyx-messaging-javascript, telnyx-voice-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.verifications.trigger_sms(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## Trigger SMS verification

`client.verifications.triggerSMS()` — `POST /verifications/sms`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeoutSecs` | integer | No | The number of seconds the verification code is valid for. |
| `customCode` | string | No | Send a self-generated numeric code to the end-user |

```javascript
const createVerificationResponse = await client.verifications.triggerSMS({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by phone number

`client.verifications.byPhoneNumber.actions.verify()` — `POST /verifications/by_phone_number/{phone_number}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | This is the code the user submits for verification. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```javascript
const verifyVerificationCodeResponse = await client.verifications.byPhoneNumber.actions.verify(
  '+13035551234',
  { code: '17686', verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292' },
);

console.log(verifyVerificationCodeResponse.data);
```

Key response fields: `response.data.phone_number, response.data.response_code`

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`client.verifyProfiles.create()` — `POST /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `webhookUrl` | string (URL) | No |  |
| `webhookFailoverUrl` | string (URL) | No |  |
| `sms` | object | No |  |
| ... | | | +4 optional params in the API Details section below |

```javascript
const verifyProfileData = await client.verifyProfiles.create({ name: 'Test Profile' });

console.log(verifyProfileData.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Trigger Call verification

`client.verifications.triggerCall()` — `POST /verifications/call`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeoutSecs` | integer | No | The number of seconds the verification code is valid for. |
| `customCode` | string | No | Send a self-generated numeric code to the end-user |
| `extension` | string | No | Optional extension to dial after call is answered using DTMF... |

```javascript
const createVerificationResponse = await client.verifications.triggerCall({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Lookup phone number data

Returns information about the provided phone number.

`client.numberLookup.retrieve()` — `GET /number_lookup/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | The phone number to be looked up |
| `type` | enum (carrier, caller-name) | No | Specifies the type of number lookup to be performed |

```javascript
const numberLookup = await client.numberLookup.retrieve('+18665552368');

console.log(numberLookup.data);
```

Key response fields: `response.data.phone_number, response.data.caller_name, response.data.carrier`

## List verifications by phone number

`client.verifications.byPhoneNumber.list()` — `GET /verifications/by_phone_number/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |

```javascript
const byPhoneNumbers = await client.verifications.byPhoneNumber.list('+13035551234');

console.log(byPhoneNumbers.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Trigger Flash call verification

`client.verifications.triggerFlashcall()` — `POST /verifications/flashcall`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string (E.164) | Yes | +E164 formatted phone number. |
| `verifyProfileId` | string (UUID) | Yes | The identifier of the associated Verify profile. |
| `timeoutSecs` | integer | No | The number of seconds the verification code is valid for. |

```javascript
const createVerificationResponse = await client.verifications.triggerFlashcall({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Retrieve verification

`client.verifications.retrieve()` — `GET /verifications/{verification_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationId` | string (UUID) | Yes | The identifier of the verification to retrieve. |

```javascript
const verification = await client.verifications.retrieve('12ade33a-21c0-473b-b055-b3c836e1c292');

console.log(verification.data);
```

Key response fields: `response.data.id, response.data.status, response.data.phone_number`

## Verify verification code by ID

`client.verifications.actions.verify()` — `POST /verifications/{verification_id}/actions/verify`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationId` | string (UUID) | Yes | The identifier of the verification to retrieve. |
| `status` | enum (accepted, rejected) | No | Identifies if the verification code has been accepted or rej... |
| `code` | string | No | This is the code the user submits for verification. |

```javascript
const verifyVerificationCodeResponse = await client.verifications.actions.verify(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyVerificationCodeResponse.data);
```

Key response fields: `response.data.phone_number, response.data.response_code`

## List all Verify profiles

Gets a paginated list of Verify profiles.

`client.verifyProfiles.list()` — `GET /verify_profiles`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```javascript
// Automatically fetches more pages as needed.
for await (const verifyProfile of client.verifyProfiles.list()) {
  console.log(verifyProfile.id);
}
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Retrieve Verify profile message templates

List all Verify profile message templates.

`client.verifyProfiles.retrieveTemplates()` — `GET /verify_profiles/templates`

```javascript
const response = await client.verifyProfiles.retrieveTemplates();

console.log(response.data);
```

Key response fields: `response.data.id, response.data.text`

## Create message template

Create a new Verify profile message template.

`client.verifyProfiles.createTemplate()` — `POST /verify_profiles/templates`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |

```javascript
const messageTemplate = await client.verifyProfiles.createTemplate({
  text: 'Your {{app_name}} verification code is: {{code}}.',
});

console.log(messageTemplate.data);
```

Key response fields: `response.data.id, response.data.text`

## Update message template

Update an existing Verify profile message template.

`client.verifyProfiles.updateTemplate()` — `PATCH /verify_profiles/templates/{template_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text content of the message template. |
| `templateId` | string (UUID) | Yes | The identifier of the message template to update. |

```javascript
const messageTemplate = await client.verifyProfiles.updateTemplate(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
  { text: 'Your {{app_name}} verification code is: {{code}}.' },
);

console.log(messageTemplate.data);
```

Key response fields: `response.data.id, response.data.text`

## Retrieve Verify profile

Gets a single Verify profile.

`client.verifyProfiles.retrieve()` — `GET /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to retrieve. |

```javascript
const verifyProfileData = await client.verifyProfiles.retrieve(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update Verify profile

`client.verifyProfiles.update()` — `PATCH /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to update. |
| `webhookUrl` | string (URL) | No |  |
| `webhookFailoverUrl` | string (URL) | No |  |
| `name` | string | No |  |
| ... | | | +5 optional params in the API Details section below |

```javascript
const verifyProfileData = await client.verifyProfiles.update(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Delete Verify profile

`client.verifyProfiles.delete()` — `DELETE /verify_profiles/{verify_profile_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verifyProfileId` | string (UUID) | Yes | The identifier of the Verify profile to delete. |

```javascript
const verifyProfileData = await client.verifyProfiles.delete(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

---

# Verify (JavaScript) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Lookup phone number data

| Field | Type |
|-------|------|
| `caller_name` | object |
| `carrier` | object |
| `country_code` | string |
| `fraud` | string \| null |
| `national_format` | string |
| `phone_number` | string |
| `portability` | object |
| `record_type` | string |

**Returned by:** List verifications by phone number, Trigger Call verification, Trigger Flash call verification, Trigger SMS verification, Retrieve verification

| Field | Type |
|-------|------|
| `created_at` | string |
| `custom_code` | string \| null |
| `id` | uuid |
| `phone_number` | string |
| `record_type` | enum: verification |
| `status` | enum: pending, accepted, invalid, expired, error |
| `timeout_secs` | integer |
| `type` | enum: sms, call, flashcall |
| `updated_at` | string |
| `verify_profile_id` | uuid |

**Returned by:** Verify verification code by phone number, Verify verification code by ID

| Field | Type |
|-------|------|
| `phone_number` | string |
| `response_code` | enum: accepted, rejected |

**Returned by:** List all Verify profiles, Create a Verify profile, Retrieve Verify profile, Update Verify profile, Delete Verify profile

| Field | Type |
|-------|------|
| `call` | object |
| `created_at` | string |
| `flashcall` | object |
| `id` | uuid |
| `language` | string |
| `name` | string |
| `rcs` | object |
| `record_type` | enum: verification_profile |
| `sms` | object |
| `updated_at` | string |
| `webhook_failover_url` | string |
| `webhook_url` | string |

**Returned by:** Retrieve Verify profile message templates, Create message template, Update message template

| Field | Type |
|-------|------|
| `id` | uuid |
| `text` | string |

## Optional Parameters

### Trigger Call verification — `client.verifications.triggerCall()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customCode` | string | Send a self-generated numeric code to the end-user |
| `timeoutSecs` | integer | The number of seconds the verification code is valid for. |
| `extension` | string | Optional extension to dial after call is answered using DTMF digits. |

### Trigger Flash call verification — `client.verifications.triggerFlashcall()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `timeoutSecs` | integer | The number of seconds the verification code is valid for. |

### Trigger SMS verification — `client.verifications.triggerSMS()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `customCode` | string | Send a self-generated numeric code to the end-user |
| `timeoutSecs` | integer | The number of seconds the verification code is valid for. |

### Verify verification code by ID — `client.verifications.actions.verify()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | This is the code the user submits for verification. |
| `status` | enum (accepted, rejected) | Identifies if the verification code has been accepted or rejected. |

### Create a Verify profile — `client.verifyProfiles.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookUrl` | string (URL) |  |
| `webhookFailoverUrl` | string (URL) |  |
| `sms` | object |  |
| `call` | object |  |
| `flashcall` | object |  |
| `language` | string |  |
| `rcs` | object |  |

### Update Verify profile — `client.verifyProfiles.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `webhookUrl` | string (URL) |  |
| `webhookFailoverUrl` | string (URL) |  |
| `sms` | object |  |
| `call` | object |  |
| `flashcall` | object |  |
| `language` | string |  |
| `rcs` | object |  |
