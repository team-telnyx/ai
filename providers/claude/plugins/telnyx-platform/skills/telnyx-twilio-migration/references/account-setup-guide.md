# Telnyx Account Setup Guide

Prerequisites and automated API setup for migrating from Twilio to Telnyx.

## What You Must Do Manually (Portal)

These steps **cannot** be automated via API — the user must complete them at [portal.telnyx.com](https://portal.telnyx.com):

1. **Create a Telnyx account** — Sign up at https://telnyx.com/sign-up
2. **Complete KYC verification** — Identity verification required before API access
3. **Add payment method** — Credit card or ACH required for purchases
4. **Accept Terms of Service** — Must be accepted in the portal
5. **Generate API Key v2** — https://portal.telnyx.com/#/app/api-keys
6. **Note your Public Key** — https://portal.telnyx.com/#/app/account/public-key (for webhook signature validation)

## What Can Be Automated (API)

Once the user has an API key, the agent can create the following resources via API based on scan results. The integration test scripts (`test-messaging.sh`, `test-voice.sh`, `test-verify.sh`) also auto-create these resources if they don't exist — so a brand new account with only an API key and payment method will work end-to-end.

### Messaging Profile (required for messaging)

```bash
curl -X POST https://api.telnyx.com/v2/messaging_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Migration - Messaging Profile",
    "webhook_url": "https://example.com/webhooks/messaging",
    "webhook_failover_url": "https://example.com/webhooks/messaging-backup"
  }'
```

Save the returned `id` as `TELNYX_MESSAGING_PROFILE_ID`.

### Voice Connection (required for voice/TeXML)

**TeXML Application:**
```bash
curl -X POST https://api.telnyx.com/v2/texml_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "Migration - TeXML App",
    "voice_url": "https://example.com/voice",
    "voice_method": "POST",
    "status_callback": "https://example.com/status",
    "status_callback_method": "POST"
  }'
```

**Call Control Application:**
```bash
curl -X POST https://api.telnyx.com/v2/call_control_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "application_name": "Migration - Call Control App",
    "webhook_event_url": "https://example.com/webhooks/voice",
    "webhook_event_failover_url": "https://example.com/webhooks/voice-backup",
    "webhook_api_version": "2"
  }'
```

### Outbound Voice Profile (required for outbound calls)

```bash
curl -X POST https://api.telnyx.com/v2/outbound_voice_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Migration - Outbound Profile",
    "traffic_type": "conversational",
    "enabled": true
  }'
```

### Phone Number Purchase (requires user approval — costs money)

```bash
# Search for available numbers
curl -X GET "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=US&filter[features][]=sms&filter[features][]=voice" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Purchase (REQUIRES USER APPROVAL before executing)
curl -X POST https://api.telnyx.com/v2/number_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [{"phone_number": "+15551234567"}],
    "connection_id": "YOUR_CONNECTION_ID",
    "messaging_profile_id": "YOUR_MESSAGING_PROFILE_ID"
  }'
```

### Number Assignment to Connection/Profile

```bash
# Assign number to voice connection
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/+15551234567" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "YOUR_CONNECTION_ID"}'

# Assign number to messaging profile
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/+15551234567" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messaging_profile_id": "YOUR_MESSAGING_PROFILE_ID"}'
```

### Verify Profile (required for verify/2FA)

```bash
curl -X POST https://api.telnyx.com/v2/verify_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Migration - Verify Profile",
    "messaging_enabled": true,
    "default_timeout_secs": 300
  }'
```

### Fax Application (required for fax)

```bash
curl -X POST https://api.telnyx.com/v2/fax_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "application_name": "Migration - Fax App",
    "webhook_event_url": "https://example.com/webhooks/fax",
    "active": true
  }'
```

### 10DLC Registration (required for US A2P messaging)

10DLC registration must be done via the Mission Control Portal or API:

1. **Register brand**: `POST /v2/brand` with business details
2. **Create campaign**: `POST /v2/campaign` with use case
3. **Assign numbers**: Link phone numbers to the campaign

> See `{baseDir}/sdk-reference/{lang}/10dlc.md` for complete API examples.

### Webhook Configuration

After creating resources, configure webhook URLs to point to your application server. If migrating incrementally, you can use the same URLs as your Twilio webhooks (the handler code will be updated in Phase 4).

## Approval Gates

The agent MUST get user approval before:

- **Purchasing phone numbers** — costs money
- **Creating 10DLC campaigns** — costs money and involves compliance
- **Porting numbers from Twilio** — irreversible once completed
- **Setting up production webhook URLs** — affects live traffic

## What's Needed Per Product

| Detected Product | Resources to Create |
|---|---|
| messaging | Messaging Profile, phone number(s) |
| voice / texml | TeXML App OR Call Control App, Outbound Voice Profile, phone number(s) |
| verify | Verify Profile |
| fax | Fax Application, phone number(s) |
| sip / sip-integrations | SIP Connection (IP/Credential/FQDN), Outbound Voice Profile |
| webrtc | Credential Connection with SIP subdomain |
| iot | SIM Card Group(s) |
| 10dlc | Brand registration, campaign(s) |

## New Account (No Numbers or Resources)

For a brand new Telnyx account with no phone numbers:
1. The integration test scripts auto-detect the user's country from `TELNYX_TO_NUMBER` and search for an available number
2. With `--confirm`, they auto-purchase the number (~$1/month)
3. They then auto-create the required profile/connection and assign the number

The only env vars needed are `TELNYX_API_KEY` and `TELNYX_TO_NUMBER` (the user's personal phone number to receive tests). Everything else is bootstrapped automatically.

## Existing Telnyx Users

If the user already has a Telnyx account with existing resources, the preflight check (`scripts/preflight-check.sh`) and test scripts will detect:
- Existing messaging profiles (reused automatically)
- Existing voice connections (reused automatically)
- Existing phone numbers (auto-selected, preferring numbers already assigned to profiles/connections)
- Account balance

The test scripts prefer existing resources over creating new ones. Ask the user whether to reuse existing resources or create new ones only if there's a specific reason (e.g., isolating test traffic).
