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
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Verify - JavaScript

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

## Lookup phone number data

Returns information about the provided phone number.

`GET /number_lookup/{phone_number}`

```javascript
const numberLookup = await client.numberLookup.retrieve('+18665552368');

console.log(numberLookup.data);
```

## List verifications by phone number

`GET /verifications/by_phone_number/{phone_number}`

```javascript
const byPhoneNumbers = await client.verifications.byPhoneNumber.list('+13035551234');

console.log(byPhoneNumbers.data);
```

## Verify verification code by phone number

`POST /verifications/by_phone_number/{phone_number}/actions/verify` — Required: `code`, `verify_profile_id`

```javascript
const verifyVerificationCodeResponse = await client.verifications.byPhoneNumber.actions.verify(
  '+13035551234',
  { code: '17686', verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292' },
);

console.log(verifyVerificationCodeResponse.data);
```

## Trigger Call verification

`POST /verifications/call` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (['string', 'null']), `extension` (['string', 'null']), `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerCall({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

## Trigger Flash call verification

`POST /verifications/flashcall` — Required: `phone_number`, `verify_profile_id`

Optional: `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerFlashcall({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

## Trigger SMS verification

`POST /verifications/sms` — Required: `phone_number`, `verify_profile_id`

Optional: `custom_code` (['string', 'null']), `timeout_secs` (integer)

```javascript
const createVerificationResponse = await client.verifications.triggerSMS({
  phone_number: '+13035551234',
  verify_profile_id: '12ade33a-21c0-473b-b055-b3c836e1c292',
});

console.log(createVerificationResponse.data);
```

## Retrieve verification

`GET /verifications/{verification_id}`

```javascript
const verification = await client.verifications.retrieve('12ade33a-21c0-473b-b055-b3c836e1c292');

console.log(verification.data);
```

## Verify verification code by ID

`POST /verifications/{verification_id}/actions/verify`

Optional: `code` (string), `status` (enum)

```javascript
const verifyVerificationCodeResponse = await client.verifications.actions.verify(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyVerificationCodeResponse.data);
```

## List all Verify profiles

Gets a paginated list of Verify profiles.

`GET /verify_profiles`

```javascript
// Automatically fetches more pages as needed.
for await (const verifyProfile of client.verifyProfiles.list()) {
  console.log(verifyProfile.id);
}
```

## Create a Verify profile

Creates a new Verify profile to associate verifications with.

`POST /verify_profiles` — Required: `name`

Optional: `call` (object), `flashcall` (object), `language` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```javascript
const verifyProfileData = await client.verifyProfiles.create({ name: 'Test Profile' });

console.log(verifyProfileData.data);
```

## Retrieve Verify profile message templates

List all Verify profile message templates.

`GET /verify_profiles/templates`

```javascript
const response = await client.verifyProfiles.retrieveTemplates();

console.log(response.data);
```

## Create message template

Create a new Verify profile message template.

`POST /verify_profiles/templates` — Required: `text`

```javascript
const messageTemplate = await client.verifyProfiles.createTemplate({
  text: 'Your {{app_name}} verification code is: {{code}}.',
});

console.log(messageTemplate.data);
```

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

## Retrieve Verify profile

Gets a single Verify profile.

`GET /verify_profiles/{verify_profile_id}`

```javascript
const verifyProfileData = await client.verifyProfiles.retrieve(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

## Update Verify profile

`PATCH /verify_profiles/{verify_profile_id}`

Optional: `call` (object), `flashcall` (object), `language` (string), `name` (string), `rcs` (object), `sms` (object), `webhook_failover_url` (string), `webhook_url` (string)

```javascript
const verifyProfileData = await client.verifyProfiles.update(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```

## Delete Verify profile

`DELETE /verify_profiles/{verify_profile_id}`

```javascript
const verifyProfileData = await client.verifyProfiles.delete(
  '12ade33a-21c0-473b-b055-b3c836e1c292',
);

console.log(verifyProfileData.data);
```
