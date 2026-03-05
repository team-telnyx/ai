# Verify Migration: Twilio Verify to Telnyx Verify

Migrate from Twilio Verify to the Telnyx Verify API for phone number verification and 2FA.

> **CRITICAL: `verify_profile_id` is REQUIRED on every Telnyx Verify API call.** Unlike Twilio where the Service SID is in the URL path, Telnyx requires `verify_profile_id` as a body parameter on both send and check requests. Omitting it will cause a 422 error. Create a profile first (see Setup below), then include it in every request.

## Table of Contents

- [Overview](#overview)
- [Verification Methods](#verification-methods)
- [Setup](#setup)
- [Sending Verification Codes](#sending-verification-codes)
- [Checking Verification Codes](#checking-verification-codes)
- [Flash Calling](#flash-calling)
- [Concept Mapping](#concept-mapping)
- [Webhook Differences](#webhook-differences)

## Overview

Telnyx Verify is not a drop-in replacement for Twilio Verify. The API surface is different, but the functionality is equivalent. Key differences:

- Telnyx uses a **Verify Profile** (analogous to Twilio's Verify Service)
- Different endpoint structure and parameter names
- Telnyx supports flash calling (missed-call verification) which Twilio does not offer on Verify
- PSD2 (Payment Services Directive 2) compliance built-in

## Verification Methods

| Method | Twilio Verify | Telnyx Verify |
|---|---|---|
| SMS OTP | Yes | Yes |
| Voice call OTP | Yes | Yes (`call` channel) |
| Email OTP | Yes | No |
| Push notification | Yes (Authy) | No |
| TOTP | Yes (Authy) | No |
| Flash calling | No | Yes — verification via missed call (caller ID matching) |
| vSMS (templated) | No | Yes — SMS with pre-approved carrier templates |
| PSD2 | No native support | Yes — built-in PSD2-compliant verification |

## Setup

### Create a Verify Profile

```bash
curl -X POST https://api.telnyx.com/v2/verify_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Verification",
    "messaging_enabled": true,
    "rcs_enabled": false,
    "default_timeout_secs": 300
  }'
```

Note the `id` in the response — this is your Verify Profile ID.

### Twilio Setup (for comparison)

```javascript
// Twilio: create Verify Service
const service = await client.verify.v2.services.create({
  friendlyName: 'My App Verification'
});
// service.sid = 'VA...'
```

## Sending Verification Codes

### SMS Verification

```python
# Twilio
verification = client.verify.v2 \
    .services('VA...') \
    .verifications \
    .create(to='+15559876543', channel='sms')

# Telnyx
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_API_KEY")
verification = client.verifications.trigger_sms(
    phone_number="+15559876543",
    verify_profile_id="YOUR_PROFILE_ID"
)
```

```javascript
// Twilio
const verification = await client.verify.v2
  .services('VA...')
  .verifications
  .create({ to: '+15559876543', channel: 'sms' });

// Telnyx
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_API_KEY' });
const verification = await client.verifications.triggerSMS({
  phone_number: '+15559876543',
  verify_profile_id: 'YOUR_PROFILE_ID'
});
```

```bash
# Twilio
curl -X POST "https://verify.twilio.com/v2/Services/$SERVICE_SID/Verifications" \
  -u "$SID:$AUTH_TOKEN" \
  -d "To=+15559876543" -d "Channel=sms"

# Telnyx
curl -X POST https://api.telnyx.com/v2/verifications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15559876543",
    "verify_profile_id": "YOUR_PROFILE_ID",
    "type": "sms"
  }'
```

```go
// Go — Twilio
import "github.com/twilio/twilio-go"
import verify "github.com/twilio/twilio-go/rest/verify/v2"

client := twilio.NewRestClient()
params := &verify.CreateVerificationParams{}
params.SetTo("+15559876543")
params.SetChannel("sms")
resp, _ := client.VerifyV2.CreateVerification("VA...", params)

// Go — Telnyx (REST API)
// POST https://api.telnyx.com/v2/verifications
// {"phone_number":"+15559876543","verify_profile_id":"...","type":"sms"}
```

```ruby
# Twilio
verification = client.verify.v2
  .services('VA...')
  .verifications
  .create(to: '+15559876543', channel: 'sms')

# Telnyx
client = Telnyx::Client.new(api_key: 'YOUR_API_KEY')
verification = client.verifications.trigger_sms(
  phone_number: '+15559876543',
  verify_profile_id: 'YOUR_PROFILE_ID'
)
```

```java
// Twilio
import com.twilio.rest.verify.v2.service.Verification;

Verification verification = Verification.creator("VA...", "+15559876543", "sms").create();

// Telnyx — use REST API
// POST https://api.telnyx.com/v2/verifications with JSON body
```

### Voice Call Verification

```python
# Twilio
verification = client.verify.v2 \
    .services('VA...') \
    .verifications \
    .create(to='+15559876543', channel='call')

# Telnyx
verification = client.verifications.trigger_call(
    phone_number="+15559876543",
    verify_profile_id="YOUR_PROFILE_ID"
)
```

### Parameter Mapping

| Twilio | Telnyx | Notes |
|---|---|---|
| `to` | `phone_number` | E.164 format |
| `channel` | `type` | `sms`, `call`, `flash_call`, `psd2` |
| Service SID (`VA...`) | `verify_profile_id` | Profile ID from setup |
| `locale` | Not specified | Language determined by phone number region |
| `customCode` | `custom_code` | Use your own code (optional) |
| `amount` + `payee` | `amount` + `payee` | For PSD2 verification |

## Checking Verification Codes

```python
# Twilio
check = client.verify.v2 \
    .services('VA...') \
    .verification_checks \
    .create(to='+15559876543', code='123456')
# check.status == 'approved' or 'pending'

# Telnyx
result = client.verifications.by_phone_number.actions.verify(
    phone_number="+15559876543",
    code="123456",
    verify_profile_id="YOUR_PROFILE_ID"
)
# result.response_code == 'accepted' or 'rejected'
```

```javascript
// Twilio
const check = await client.verify.v2
  .services('VA...')
  .verificationChecks
  .create({ to: '+15559876543', code: '123456' });
// check.status === 'approved'

// Telnyx
const result = await client.verifications.byPhoneNumber.actions.verify(
  '+15559876543',
  { code: '123456', verify_profile_id: 'YOUR_PROFILE_ID' }
);
// result.data.response_code === 'accepted'
```

```bash
# Twilio
curl -X POST "https://verify.twilio.com/v2/Services/$SERVICE_SID/VerificationChecks" \
  -u "$SID:$AUTH_TOKEN" \
  -d "To=+15559876543" -d "Code=123456"

# Telnyx
curl -X POST "https://api.telnyx.com/v2/verifications/by_phone_number/+15559876543/actions/verify" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456", "verify_profile_id": "YOUR_PROFILE_ID"}'
```

### Status Mapping

| Twilio Status | Telnyx Response Code | Meaning |
|---|---|---|
| `approved` | `accepted` | Code is correct |
| `pending` | `rejected` | Code is incorrect or expired |
| `canceled` | N/A | Verification was canceled |

## Flash Calling

Telnyx-only feature. Verification via a missed call — the user's phone displays a caller ID, and the last N digits of that number are the verification code. No SMS charges, faster in some markets.

```python
verification = client.verifications.trigger_flashcall(
    phone_number="+15559876543",
    verify_profile_id="YOUR_PROFILE_ID"
)
```

The user sees an incoming call that auto-disconnects. Your app reads the caller ID and extracts the code automatically (or prompts the user to enter it).

**Flash Call Configuration on Verify Profile:**

```bash
curl -X PATCH https://api.telnyx.com/v2/verify_profiles/YOUR_PROFILE_ID \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flash_call_enabled": true,
    "call_enabled": true
  }'
```

**How it works:**
1. Your app calls `POST /v2/verifications` with `type: "flash_call"`
2. Telnyx places a call to the user's phone that auto-disconnects after 1 ring
3. The caller ID of that call contains the verification digits
4. Your mobile app detects the incoming call's caller ID and extracts the code automatically
5. Call `POST /v2/verifications/by_phone_number` with the extracted code to verify

**Benefits over SMS OTP:** No SMS charges, faster delivery, works even with SMS delivery issues, harder to intercept.

## vSMS (Verified SMS Templates)

Telnyx vSMS uses carrier-verified message templates for OTP delivery. This provides:
- Higher deliverability (carrier-approved, bypasses some spam filters)
- Branded sender experience on supported carriers
- Template-based formatting

```python
verification = client.verifications.trigger_sms(
    phone_number="+15559876543",
    verify_profile_id="YOUR_PROFILE_ID",
    template_id="YOUR_TEMPLATE_ID"  # Pre-approved template
)
```

## PSD2 (Payment Services Directive 2)

For payment authorization in the EU, Telnyx Verify supports PSD2-compliant verification with amount and payee in the message:

```python
# Telnyx PSD2 verification
verification = client.verifications.trigger_sms(
    phone_number="+353851234567",
    verify_profile_id="YOUR_PROFILE_ID",
    amount="25.00",
    payee="Acme Corp"
)
```

The verification message includes the transaction amount and payee name, meeting Strong Customer Authentication (SCA) requirements.

## Concept Mapping

| Twilio Concept | Telnyx Concept |
|---|---|
| Verify Service (`VA...`) | Verify Profile |
| Verification SID | Verification ID |
| Channel (`sms`, `call`, `email`) | Type (`sms`, `call`, `flash_call`, `psd2`) |
| `approved` / `pending` | `accepted` / `rejected` |
| Rate limits (per Service) | Rate limits (per Profile) |
| Fraud Guard | Built-in fraud detection |

## Webhook Differences

Twilio Verify does not use webhooks for verification results — you poll with VerificationChecks.

Telnyx Verify also primarily uses a request/response pattern (create verification → check code). However, Telnyx sends webhook events for verification status changes if configured on your Verify Profile:

- `verification.sent` — code was sent
- `verification.accepted` — code was correctly verified
- `verification.rejected` — incorrect code submitted
- `verification.expired` — code expired without verification

## Testing

When migrating verify tests, the key change is the response field names.

### Mock Patterns

**Python (pytest/unittest):**
```python
# Twilio mock:
# @patch('twilio.rest.Client')
# def test_verify(mock_client):
#     mock_client.return_value.verify.v2.services('VA...').verification_checks.create.return_value.status = 'approved'

# Telnyx mock (v4 SDK — client.verify.verifications.submit_verification):
@patch('your_module.client.verify.verifications.submit_verification')  # patch where client is used
def test_verify_code(mock_submit):
    mock_submit.return_value = type('obj', (object,), {
        'data': type('obj', (object,), {
            'phone_number': '+15559876543',
            'verify_profile_id': 'uuid-here',
            'response_code': 'accepted',  # NOT 'approved'
        })()
    })()
    result = verify_code('+15559876543', '123456')
    assert result.data.response_code == 'accepted'
```

**JavaScript (Jest):**
```javascript
jest.mock('telnyx', () => {
  return jest.fn().mockImplementation(() => ({
    verifications: {
      byPhoneNumber: jest.fn().mockReturnValue({
        submit: jest.fn().mockResolvedValue({
          data: {
            phone_number: '+15559876543',
            verify_profile_id: 'uuid-here',
            response_code: 'accepted',
          }
        })
      })
    }
  }));
});
```

### Assertion Changes

| Twilio Assertion | Telnyx Assertion |
|---|---|
| `assert result.status == 'approved'` | `assert result.data.response_code == 'accepted'` |
| `assert result.status == 'pending'` | `assert result.data.status == 'pending'` (on create) |
| `assert result.sid.startswith('VE')` | `assert result.data.verify_profile_id is not None` |
| `assert result.channel == 'sms'` | `assert result.data.type == 'sms'` |
