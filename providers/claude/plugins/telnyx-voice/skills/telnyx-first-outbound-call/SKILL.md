---
name: telnyx-first-outbound-call
description: >-
  Reference skill for the First Outbound Call blueprint. Documents the
  Call Control API setup flow, architecture, code examples, friction
  points, and troubleshooting guide for making your first programmatic
  outbound call on Telnyx.
user_invocable: false
metadata:
  author: telnyx
  product: voice
  blueprint-id: AIF-75
  version: "1.0"
---

# First Outbound Call — Reference Skill

This skill provides reference material for the `first-outbound-call-developer` agent. It is not user-invocable — the agent is the entry point.

## What This Blueprint Does

1. **Creates a Call Control Application** — the entry point for API-driven calls
2. **Configures an Outbound Voice Profile** — required for routing and destination whitelisting
3. **Purchases a voice-enabled phone number** — used as the outbound caller ID
4. **Assigns the number** to the Call Control Application
5. **Makes the outbound call** via `POST /v2/calls` and verifies it succeeds

## Components

| Component | Purpose | Required? |
|-----------|---------|-----------|
| Call Control Application | Routes calls to your webhook, enables programmatic call control | Yes |
| Outbound Voice Profile (OVP) | Controls routing, destination countries, concurrent call limits | Yes |
| Phone Number | Your outbound caller ID — must be voice-enabled and assigned to the app | Yes |
| Webhook URL | Receives call lifecycle events (call.initiated, call.answered, call.hangup) | Yes (can override per-call) |

## Critical Dependency Chain

```
API Key
  └── Call Control Application (webhook URL required)
        ├── Outbound Voice Profile (MUST BE LINKED to app)
        └── Phone Number (MUST BE ASSIGNED to app)
              └── POST /v2/calls → call.initiated → call.answered ✅
```

> ⚠️ Missing any one component causes silent failure. The API returns 200 OK even when the call will fail — failures arrive asynchronously via webhooks with `telnyx_error: null`.

## Setup Steps

### Step 1 — Create a Call Control Application

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "application_name": "My First App",
    "webhook_event_url": "https://your-server.com/webhooks/telnyx",
    "webhook_api_version": "2",
    "active": true,
    "first_command_timeout": true,
    "first_command_timeout_secs": 30
  }' \
  "https://api.telnyx.com/v2/call_control_applications"
```

Save: `APP_ID` (from `data.id`)

> ⚠️ Do NOT use a Credential Connection. Credential connections are for SIP trunking. For `POST /v2/calls`, you need a Call Control Application.

### Step 2 — Create an Outbound Voice Profile and Link It

> ⚠️ This is where 90% of first-call failures happen. Without an OVP linked to your application, every call fires `call.initiated` and immediately hangs up with SIP 500 / `telnyx_error: null`.

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Outbound Profile",
    "traffic_type": "conversational",
    "service_plan": "global",
    "concurrent_call_limit": 10,
    "enabled": true,
    "whitelisted_destinations": ["US", "CA"]
  }' \
  "https://api.telnyx.com/v2/outbound_voice_profiles"
```

Save: `OVP_ID` (from `data.id`)

Link OVP to your Call Control Application:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -X PATCH \
  -H "Content-Type: application/json" \
  -d "{\"outbound\": {\"outbound_voice_profile_id\": \"$OVP_ID\"}}" \
  "https://api.telnyx.com/v2/call_control_applications/$APP_ID"
```

When validating the link, check the nested response field:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh \
  "https://api.telnyx.com/v2/call_control_applications/$APP_ID" | \
  jq -r '.data.outbound.outbound_voice_profile_id'
```

Do not check for a top-level `outbound_voice_profile_id`; Call Control Application responses store the link under `.data.outbound.outbound_voice_profile_id`.

> ⚠️ `whitelisted_destinations` controls which countries you can dial. Calling a number outside this list **silently fails with SIP 403**. Add every country you need. Common codes: `US`, `CA`, `GB`, `AU`, `IN`, `LK`, `PH`, `DE`, `FR`.

### Step 3 — Buy a Voice-Enabled Phone Number

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -G \
  "https://api.telnyx.com/v2/available_phone_numbers" \
  --data-urlencode "filter[country_code]=US" \
  --data-urlencode "filter[features][]=voice" \
  --data-urlencode "filter[phone_number_type]=local" \
  --data-urlencode "filter[limit]=5"
```

> ⚠️ Always use `-G` with `--data-urlencode` for filter parameters — raw brackets silently return empty results (FRIC-006).

Purchase immediately — search results expire without documented TTL (FRIC-007):
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers": [{"phone_number": "+19705551234"}]}' \
  "https://api.telnyx.com/v2/number_orders"
```

Wait 3–5 seconds for provisioning, then verify:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -G \
  --data-urlencode "filter[phone_number]=$MY_NUMBER" \
  "https://api.telnyx.com/v2/phone_numbers" | jq '{status: .data[0].status, id: .data[0].id}'
# Must return status "active"
```

Save: `MY_NUMBER`, `PHONE_NUMBER_ID` (from `.data[0].id` above)

### Step 4 — Assign the Number to Your Application

> ⚠️ Second most common failure. The number exists in your account but isn't linked — calls fail silently.

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -X PATCH \
  -H "Content-Type: application/json" \
  -d "{\"connection_id\": \"$APP_ID\"}" \
  "https://api.telnyx.com/v2/phone_numbers/$PHONE_NUMBER_ID/voice"
```

Verify: `data.connection_id` matches your `APP_ID`.

### Step 5 — Make the Call

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"connection_id\": \"$APP_ID\",
    \"to\": \"$TO_NUMBER\",
    \"from\": \"$MY_NUMBER\",
    \"from_display_name\": \"Test Call\",
    \"webhook_url\": \"$WEBHOOK_URL\"
  }" \
  "https://api.telnyx.com/v2/calls"
```

Success: `data.call_control_id` returned, no `errors` field.

> 💡 `is_alive: null` in the immediate response is normal — it means the call was accepted and is being set up.

### Step 6 — Verify via CDR

Check Mission Control → Reporting → Call Detail Records:
- Direction: `outbound`
- Status: `completed`
- Duration: > 0 seconds
- SIP Response: `200`

## Validation

Run the validation script to check all 4 components:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/telnyx-first-outbound-call/scripts/validate-setup.sh
```

## Reference Documents

- `references/architecture.md` — Component dependency diagrams, call flow sequences (success + failure paths)
- `references/code-examples.md` — Python, Node.js, curl end-to-end examples including webhook handler
- `references/troubleshooting.md` — Expanded SIP codes, webhook event reference, CDR interpretation guide, diagnostic decision tree
- `references/friction-log.md` — 8 friction points discovered during validation (FRIC-001 to FRIC-008)

## Related Blueprints

- One-Way Audio / NAT Fix — for post-connect audio issues (AIF-76)
- Phone Verification Flow — SMS/voice OTP (AIF-23)
