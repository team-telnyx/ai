---
name: telnyx-verify
description: "Manage Telnyx Verify API — create profiles, send OTP codes (SMS/voice/flashcall), verify codes, and manage message templates. Use when implementing phone verification, 2FA, or OTP flows."
author: "Ifthikar Razik (AI FDE)"
version: "1.0.0"
metadata:
  clawdbot:
    emoji: "🔐"
    requires:
      env: ["TELNYX_API_KEY"]
      bins: ["curl"]
---

# Telnyx Verify API

Send and verify one-time passcodes (OTP) via SMS, voice call, or flash call using the Telnyx Verify API.

## Prerequisites

- `TELNYX_API_KEY` environment variable set
- `curl` installed
- `jq` recommended (for formatted output; works without it)

## Quick Start

```bash
# 1. Create a verify profile
./scripts/verify.sh create-profile --name "My App" --app-name "MyApp"

# 2. Send SMS verification
./scripts/verify.sh send-sms --phone "+13035551234" --profile-id "<profile-uuid>"

# 3. Verify the code user enters
./scripts/verify.sh check-code --verification-id "<verification-uuid>" --code "123456"

# Or verify by phone number (no need to store verification ID):
./scripts/verify.sh check-by-phone --phone "+13035551234" --profile-id "<profile-uuid>" --code "123456"
```

## Commands

### Profile Management

#### create-profile
Create a new Verify profile with OTP settings.

```bash
./scripts/verify.sh create-profile \
  --name "My App Verification" \
  --app-name "MyApp" \
  --code-length 6 \
  --timeout 300 \
  --webhook-url "https://example.com/webhooks/verify" \
  --destinations '["US","CA"]' \
  --language "en-US"
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--name` | Yes | — | Profile name |
| `--app-name` | No | — | App name shown in OTP message: "Your {app} code is..." |
| `--code-length` | No | 6 | OTP code length (4-10 digits) |
| `--timeout` | No | 300 | Code expiry in seconds |
| `--webhook-url` | No | — | URL for verification status events |
| `--destinations` | No | `["US","CA"]` | Allowed country codes (JSON array) |
| `--language` | No | en-US | Message language |

#### list-profiles
```bash
./scripts/verify.sh list-profiles [--name "filter"] [--page-size 20]
```

#### get-profile
```bash
./scripts/verify.sh get-profile --profile-id <uuid>
```

#### update-profile
```bash
./scripts/verify.sh update-profile --profile-id <uuid> --name "New Name" --webhook-url "https://new-url.com"
```

#### delete-profile
```bash
./scripts/verify.sh delete-profile --profile-id <uuid>
```

### Send Verification

#### send-sms
Send OTP via SMS. Best for mobile and VoIP numbers.
```bash
./scripts/verify.sh send-sms --phone "+13035551234" --profile-id <uuid> [--timeout 300] [--custom-code "12345"]
```

#### send-call
Send OTP via voice call. Best for landline numbers.
```bash
./scripts/verify.sh send-call --phone "+13035551234" --profile-id <uuid> [--timeout 300]
```

#### send-flashcall
Send OTP via flash call (caller ID is the code). Mobile only.
```bash
./scripts/verify.sh send-flashcall --phone "+13035551234" --profile-id <uuid> [--timeout 300]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--phone` | Yes | E.164 phone number (e.g., +13035551234) |
| `--profile-id` | Yes | Verify profile UUID |
| `--timeout` | No | Override default code expiry (seconds) |
| `--custom-code` | No | Supply your own code (SMS/call only) |

### Verify Code

#### check-code
Verify by verification ID (if you stored it from the send response).
```bash
./scripts/verify.sh check-code --verification-id <uuid> --code "123456"
```

#### check-by-phone
Verify by phone number (no need to store verification ID).
```bash
./scripts/verify.sh check-by-phone --phone "+13035551234" --profile-id <uuid> --code "123456"
```

**Response:** `response_code` will be `"accepted"` (correct) or `"rejected"` (wrong/expired).

#### list-by-phone
List all verifications for a phone number.
```bash
./scripts/verify.sh list-by-phone --phone "+13035551234"
```

### Message Templates

#### list-templates
```bash
./scripts/verify.sh list-templates
```

#### create-template
Template must include `{{code}}` variable.
```bash
./scripts/verify.sh create-template --text "Your {{app_name}} verification code is: {{code}}. Valid for 5 minutes."
```

## Verification Flow

```
1. create-profile → Get profile UUID
2. send-sms (or send-call) → Get verification UUID
3. User receives code
4. check-code (or check-by-phone) → accepted/rejected
```

## Channel Routing Guide

| Number Type | Recommended Channel | Command |
|-------------|-------------------|---------|
| Mobile | SMS | `send-sms` |
| VoIP | SMS | `send-sms` |
| Landline | Voice call | `send-call` |
| Toll-free | ❌ Cannot verify | — |

Use the `telnyx-number-lookup` skill with `--routing` to automatically determine the best channel.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `422 Unprocessable` | Phone not in E.164 format | Add `+` and country code |
| `404 Not Found` | Wrong verification ID or `+` not encoded | Check ID; for by-phone, `+` is auto-encoded by script |
| `response_code: rejected` | Code wrong or expired | Resend with `send-sms` and try again |
| `403 Forbidden` | Invalid API key | Check `TELNYX_API_KEY` |
| SMS not delivered | No 10DLC registration | Register brand + campaign for US A2P messaging |
