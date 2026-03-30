# CLI E2E Test Results

**Date:** 2026-03-20  
**Environment:** Real Telnyx API (production account)  
**Runner:** Olitron (automated sub-agent)

## Summary

| Command | Result | Notes |
|---------|--------|-------|
| `status` | ✅ PASS | All 5 concurrent API queries successful |
| `capabilities` | ✅ PASS | No API calls, pure output |
| `setup-sms` | ✅ PASS | After 3 fixes (see below) |
| `setup-voice` | ✅ PASS | After 2 fixes (see below) |
| `setup-ai` | ✅ PASS | After 3 fixes (see below) |
| `setup-iot` | ✅ PASS | Graceful "no inactive SIMs" handling |

## Fixes Applied

### 1. Messaging profile requires `whitelisted_destinations` (setup-sms)
**Error:** `Messaging profile is missing whitelisted destinations. (HTTP 400)`  
**Fix:** Added `whitelisted_destinations: [country]` to the messaging profile creation payload.

### 2. Number order returns wrong ID type (setup-sms, setup-voice, setup-ai)
**Error:** `The requested resource or URL could not be found. (HTTP 404)` on step 4  
**Root cause:** `/number_orders` response contains `number_order_phone_number` IDs (UUIDs like `817c2ecf-...`), NOT the actual phone number resource IDs (numeric like `2919762866204575273`).  
**Fix:** Created shared `utils/number-order.ts` that:
- Places the order
- Polls until order status is `success` (handles async orders)
- Resolves the real phone number resource ID via `/phone_numbers?filter[phone_number]=+1...`
- Retries lookup up to 5 times (number may take a moment to appear)

### 3. Messaging profile assignment uses wrong endpoint (setup-sms)
**Error:** `The field messaging_profile_id is not reachable here (HTTP 422)`  
**Fix:** Changed from `PATCH /phone_numbers/:id` to `PATCH /phone_numbers/:id/messaging` for messaging profile assignment.

### 4. Credential connection requires username/password (setup-voice)
**Error:** `can't be blank (HTTP 422)`  
**Fix:** Auto-generate alphanumeric SIP username and password when creating credential connections.

### 5. Voice connection assignment uses wrong endpoint (setup-voice)
**Fix:** Changed from `PATCH /phone_numbers/:id` to `PATCH /phone_numbers/:id/voice` for connection_id assignment.

### 6. AI assistant model outdated (setup-ai)
**Error:** `Model meta-llama/Meta-Llama-3.1-70B-Instruct is not available for AI Assistants. (HTTP 422)`  
**Fix:** Updated default model to `Qwen/Qwen3-235B-A22B` (confirmed working on account).

### 7. AI assistant response structure different (setup-ai)
**Error:** `Cannot read properties of undefined (reading 'id')`  
**Root cause:** AI assistants API returns data at top level, not nested under `.data` like other v2 endpoints.  
**Fix:** Added fallback: `assistantRes.data ?? assistantRes`.

### 8. AI assistant phone number wiring (setup-ai)
**Error:** Tags with colons rejected; `/ai/assistants/:id/phone_numbers` endpoint doesn't exist  
**Fix:** Create a TeXML application linked to the assistant, then assign the TeXML app to the phone number via the voice settings endpoint.

## New Files

- `src/utils/number-order.ts` — Shared helper for ordering numbers with polling and ID resolution

## Test Output Samples

### status --json
```json
{
  "balance": { "amount": "-1.65", "currency": "USD", "credit_limit": "100.00" },
  "phone_numbers": { "total": 36, "active": 36 },
  "messaging_profiles": { "total": 3 },
  "connections": { "total": 47 },
  "ai_assistants": { "total": 6 },
  "warnings": ["Low balance: $-1.65 — consider topping up"]
}
```

### setup-sms --country US --json (final passing run)
```json
{
  "profile_id": "40019d0b-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "profile_name": "Agent SMS Profile - 2026-03-20 12:10:02",
  "phone_number": "+1XXXXXXXXXX",
  "phone_number_id": "29197640XXXXXXXXXXX",
  "ready": true,
  "steps": [4 steps all "completed"]
}
```

### setup-voice --country US --json (final passing run)
```json
{
  "connection_id": "29197645XXXXXXXXXXX",
  "connection_name": "Agent Voice Connection - 2026-03-20 12:10:53",
  "phone_number": "+1XXXXXXXXXX",
  "phone_number_id": "29197645XXXXXXXXXXX",
  "sip_username": "<REDACTED>",
  "sip_password": "<REDACTED>",
  "ready": true,
  "steps": [4 steps all "completed"]
}
```

### setup-ai --instructions "..." --json (final passing run)
```json
{
  "assistant_id": "assistant-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "assistant_name": "Agent AI Assistant",
  "phone_number": "+1XXXXXXXXXX",
  "phone_number_id": "29197657XXXXXXXXXXX",
  "test_command": "Call +1XXXXXXXXXX to talk to your AI assistant",
  "ready": true,
  "steps": [4 steps all "completed"]
}
```

### setup-iot --json (expected: no inactive SIMs)
```json
{
  "status": "no_sims",
  "message": "No inactive/disabled SIM cards found. Purchase SIMs via the Telnyx portal first.",
  "ready": false,
  "steps": [1 completed, 3 skipped]
}
```
