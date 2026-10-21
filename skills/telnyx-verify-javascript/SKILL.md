---
name: telnyx-verify-javascript
description: >-
  Look up phone number information (carrier, type, caller name) and verify users
  via SMS/voice OTP. Use for phone verification and data enrichment. This skill
  provides JavaScript SDK examples.
metadata:
  author: telnyx
  product: verify
  language: javascript
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - JavaScript

## Installation

```bash
npm install telnyx@6.74.2
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
  publicKey: process.env['TELNYX_PUBLIC_KEY'], // Required for client.webhooks.unwrap() (webhook verification)
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.messages.send({ to: '+13125550001', from: '+13125550002', text: 'Hello' });
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait, then retry the request (bounded exponential backoff)
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    // ...retry the call here (give up after a few attempts)
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
  throw err; // Re-throw: a failed request must never look like success to the caller
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

## Lookup phone number data

Returns information about the provided phone number.

`GET /number_lookup/{phone_number}`

```javascript
const numberLookup = await client.numberLookup.retrieve('+18665552368');

console.log(numberLookup.data);
```

Returns: `caller_name` (object), `carrier` (object), `country_code` (string), `fraud` (string | null), `national_format` (string), `phone_number` (string), `portability` (object), `record_type` (string)

## List verifications by phone number

Returns a paginated list of verifications associated with the specified phone number.

`GET /verifications/by_phone_number/{phone_number}`

```javascript
const byPhoneNumbers = await client.verifications.byPhoneNumber.list('+13035551234');

console.log(byPhoneNumbers.data);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall, whatsapp), `updated_at` (string), `verify_profile_id` (uuid)

## Verify verification code by phone number

Submits a verification code for the specified phone number and Verify profile. The response indicates whether the code was accepted or rejected.

`POST /verifications/by_phone_number/{phone_number}/actions/verify` — Required: `code`, `verify_profile_id`

```javascript
const verifyVerificationCodeResponse = await client.verifications.byPhoneNumber.actions.verify(
  '+13035551234',
  { code: '17686', verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292' },
);

console.log(verifyVerificationCodeResponse.data);
```

Returns: `phone_number` (string), `response_code` (enum: accepted, rejected)

## Trigger Call verification

Starts a verification for the specified phone number and delivers its code in a voice call using the selected Verify profile. Returns the pending verification record.

`POST /verifications/call` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (string | null), `extension` (string | null), `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerCall({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall, whatsapp), `updated_at` (string), `verify_profile_id` (uuid)

## Trigger Flash call verification

Starts a verification for the specified phone number and places a brief call with the code embedded in the caller ID. Returns the pending verification record.

`POST /verifications/flashcall` — Required: `phone_number`, `verify_profile_id`

Optional: `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerFlashcall({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall, whatsapp), `updated_at` (string), `verify_profile_id` (uuid)

## Trigger SMS verification

Starts a verification for the specified phone number and sends its code by SMS using the selected Verify profile. Returns the pending verification record.

`POST /verifications/sms` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (string | null), `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerSMS({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall, whatsapp), `updated_at` (string), `verify_profile_id` (uuid)

## Trigger WhatsApp verification

Starts a verification for the specified phone number and sends its code over WhatsApp using the selected Verify profile. Returns the pending verification record.

`POST /verifications/whatsapp` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (string | null), `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerWhatsappVerification({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall, whatsapp), `updated_at` (string), `verify_profile_id` (uuid)

## Retrieve verification

Returns the verification identified by ID, including its channel, phone number, Verify profile, timeout, and current status.

`GET /verifications/{verification_id}`

```javascript
const verification = await client.verifications.retrieve('12ade33a-21c0-473b-b055-b3c836e1c292');

console.log(verification.data);
```

Returns: `created_at` (string), `custom_code` (string | null), `id` (uuid), `phone_number` (string), `record_type` (enum: verification), `status` (enum: pending, accepted, invalid, expired, error), `timeout_secs` (integer), `type` (enum: sms, call, flashcall, whatsapp), `updated_at` (string), `verify_profile_id` (uuid)

## Verify verification code by ID

Checks the supplied code, or the supplied status for a custom-code verification, against the verification identified by ID. The response indicates whether the verification was accepted or rejected.

`POST /verifications/{verification_id}/actions/verify`

Optional: `code` (string), `status` (enum: accepted, rejected)

```javascript
const verifyVerificationCodeResponse = await client.verifications.actions.verify(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyVerificationCodeResponse.data);
```

Returns: `phone_number` (string), `response_code` (enum: accepted, rejected)

## List all Verify profiles

Gets a paginated list of Verify profiles.

`GET /verify_profiles`

```javascript
// Automatically fetches more pages as needed.
for await (const verifyProfile of client.verifyProfiles.list()) {
  console.log(verifyProfile.id);
}
```

Returns: `call` (object), `created_at` (string), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`POST /verify_profiles` — Required: `name`

Optional: `call` (object), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `flashcall` (object), `language` (string), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)

```javascript
const verifyProfileData = await client.verifyProfiles.create({ name: 'Test Profile' });

console.log(verifyProfileData.data);
```

Returns: `call` (object), `created_at` (string), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)

## Retrieve Verify profile message templates

List all Verify profile message templates.

`GET /verify_profiles/templates`

```javascript
const response = await client.verifyProfiles.retrieveTemplates();

console.log(response.data);
```

Returns: `id` (uuid), `text` (string)

## Create message template

Create a new Verify profile message template.

`POST /verify_profiles/templates` — Required: `text`

```javascript
const messageTemplate = await client.verifyProfiles.createTemplate({
  text: 'Your {{app_name}} verification code is: {{code}}.',
});

console.log(messageTemplate.data);
```

Returns: `id` (uuid), `text` (string)

## Update message template

Update an existing Verify profile message template.

`PATCH /verify_profiles/templates/{template_id}` — Required: `text`

```javascript
const messageTemplate = await client.verifyProfiles.updateTemplate(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
  { text: 'Your {{app_name}} verification code is: {{code}}.' },
);

console.log(messageTemplate.data);
```

Returns: `id` (uuid), `text` (string)

## Retrieve Verify profile

Returns the details of a single Verify profile by its ID, including its verification channel configuration.

`GET /verify_profiles/{verify_profile_id}`

```javascript
const verifyProfileData = await client.verifyProfiles.retrieve(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

Returns: `call` (object), `created_at` (string), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)

## Update Verify profile

Updates the specified Verify profile's name, webhook destinations, language, daily spend limits, or channel-specific settings. Returns the updated profile.

`PATCH /verify_profiles/{verify_profile_id}`

Optional: `call` (object), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `language` (string), `name` (string), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)

```javascript
const verifyProfileData = await client.verifyProfiles.update(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

Returns: `call` (object), `created_at` (string), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)

## Delete Verify profile

Deletes the specified Verify profile and returns the deleted profile record.

`DELETE /verify_profiles/{verify_profile_id}`

```javascript
const verifyProfileData = await client.verifyProfiles.delete(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

Returns: `call` (object), `created_at` (string), `daily_spend_limit` (number), `daily_spend_limit_enabled` (boolean), `flashcall` (object), `id` (uuid), `language` (string), `name` (string), `record_type` (enum: verification_profile), `sms` (object), `updated_at` (string), `webhook_failover_url` (string), `webhook_url` (string), `whatsapp` (object)
