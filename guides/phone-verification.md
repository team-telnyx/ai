# Phone Verification

> Send and verify one-time passcodes (OTP) via SMS, voice call, or flash call for 2FA and authentication.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- A verify profile (created below)

## Quick Start

```bash
# 1. Create a verify profile
curl -X POST "https://api.telnyx.com/v2/verify_profiles" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App Verification"}'

# 2. Send SMS verification
curl -X POST "https://api.telnyx.com/v2/verifications/sms" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15559876543",
    "verify_profile_id": "your-profile-id"
  }'

# 3. Verify the code
curl -X POST "https://api.telnyx.com/v2/verifications/{verification_id}/actions/verify" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

## API Reference

### Create Verify Profile

**`POST /v2/verify_profiles`**

```bash
curl -X POST "https://api.telnyx.com/v2/verify_profiles" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "sms": {
      "app_name": "MyApp",
      "code_length": 6,
      "default_verification_timeout_secs": 300
    }
  }'
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | — | Profile name |
| `sms.app_name` | string | — | App name in message: "Your {app_name} code is..." |
| `sms.code_length` | integer | 6 | OTP length (4-10 digits) |
| `sms.default_verification_timeout_secs` | integer | 300 | Code expiry in seconds |

### List Verify Profiles

**`GET /v2/verify_profiles`**

```bash
curl "https://api.telnyx.com/v2/verify_profiles" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Send SMS Verification

**`POST /v2/verifications/sms`**

```bash
curl -X POST "https://api.telnyx.com/v2/verifications/sms" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15559876543",
    "verify_profile_id": "your-profile-id"
  }'
```

**Response:**

```json
{
  "data": {
    "id": "verification-uuid",
    "record_type": "verification",
    "phone_number": "+15559876543",
    "status": "pending"
  }
}
```

### Send Voice Call Verification

**`POST /v2/verifications/call`**

Best for landline numbers.

```bash
curl -X POST "https://api.telnyx.com/v2/verifications/call" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15559876543",
    "verify_profile_id": "your-profile-id"
  }'
```

### Send Flash Call Verification

**`POST /v2/verifications/flashcall`**

The caller ID *is* the code. Mobile only.

```bash
curl -X POST "https://api.telnyx.com/v2/verifications/flashcall" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15559876543",
    "verify_profile_id": "your-profile-id"
  }'
```

### Verify Code

**`POST /v2/verifications/{verification_id}/actions/verify`**

```bash
curl -X POST "https://api.telnyx.com/v2/verifications/{verification_id}/actions/verify" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

**Response:**

```json
{
  "data": {
    "id": "verification-uuid",
    "response_code": "accepted",
    "status": "verified"
  }
}
```

`response_code` is either `"accepted"` (correct) or `"rejected"` (wrong/expired).

### Verify by Phone Number

**`POST /v2/verifications/by_phone_number/{phone_number}/actions/verify`**

No need to store verification ID.

```bash
curl -X POST "https://api.telnyx.com/v2/verifications/by_phone_number/%2B15559876543/actions/verify" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "verify_profile_id": "your-profile-id"
  }'
```

> Note: URL-encode the `+` as `%2B` in the phone number.

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Create profile
profile = requests.post(
    f"{BASE_URL}/verify_profiles",
    headers=headers,
    json={"name": "My App", "sms": {"app_name": "MyApp", "code_length": 6}}
).json()
profile_id = profile["data"]["id"]

# Send verification
verification = requests.post(
    f"{BASE_URL}/verifications/sms",
    headers=headers,
    json={"phone_number": "+15559876543", "verify_profile_id": profile_id}
).json()
verification_id = verification["data"]["id"]

# Verify code
result = requests.post(
    f"{BASE_URL}/verifications/{verification_id}/actions/verify",
    headers=headers,
    json={"code": "123456"}
).json()
print(f"Status: {result['data']['response_code']}")  # accepted or rejected
```

## TypeScript Examples

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Create verify profile
const profileRes = await fetch(`${BASE_URL}/verify_profiles`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "My App",
    sms: { app_name: "MyApp", code_length: 6 },
  }),
});
const { data: profile } = await profileRes.json();

// Send verification
const verifyRes = await fetch(`${BASE_URL}/verifications/sms`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    phone_number: "+15559876543",
    verify_profile_id: profile.id,
  }),
});
const { data: verification } = await verifyRes.json();

// Check code
const checkRes = await fetch(
  `${BASE_URL}/verifications/${verification.id}/actions/verify`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "123456" }),
  }
);
const { data: result } = await checkRes.json();
console.log(`Result: ${result.response_code}`); // accepted or rejected
```

## Agent Toolkit Examples

Use the `telnyx-agent-toolkit` Python package for simplified tool execution:

```python
from telnyx_agent_toolkit import TelnyxToolkit

toolkit = TelnyxToolkit(api_key="KEY...")

# Send a verification code
verification = toolkit.execute("verify_phone", {
    "phone_number": "+15559876543",
    "verify_profile_id": "your-profile-id",
    "type": "sms"
})
print(f"Verification ID: {verification['data']['id']}")

# Verify the code
result = toolkit.execute("verify_code", {
    "phone_number": "+15559876543",
    "verify_profile_id": "your-profile-id",
    "code": "123456"
})
print(f"Result: {result['data']['response_code']}")  # accepted or rejected
```

## Channel Routing

| Number Type | Recommended Channel |
|-------------|-------------------|
| Mobile | SMS |
| VoIP | SMS |
| Landline | Voice call |
| Toll-free | Cannot verify |

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `422 Unprocessable` | 422 | Phone must be E.164 format (`+1...`) |
| `404 Not Found` | 404 | Wrong verification ID |
| `response_code: rejected` | 200 | Code wrong or expired — resend |
| `403 Forbidden` | 403 | Invalid API key |

## Limits

- **Code length:** 4-10 digits
- **Default timeout:** 300 seconds (5 minutes)
- **Max attempts:** 5 per verification

## Resources

- [Verify API Reference](https://developers.telnyx.com/docs/api/v2/verify)
- [Verify Documentation](https://developers.telnyx.com/docs/verify)
