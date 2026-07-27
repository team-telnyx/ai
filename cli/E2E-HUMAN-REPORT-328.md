# E2E HUMAN DEV REPORT — AIF-328

**Branch:** `fix/aif-328-setup-voice-call-control-app`
**Date:** 2026-07-27
**Tester:** Agent Zero (human dev walkthrough)

## Summary

All tests PASS. The fix replaces credential connection creation with Call Control Application creation, making `setup-voice` output compatible with `call-dial`.

## Test Results

### 1. Typecheck
- `npm run typecheck` → PASS (0 errors)

### 2. Help text
- `help` lists `setup-voice` with "Zero to voice: create Call Control App, buy number, assign it" ✓
- `--webhook <url>` documented with default `https://example.com/webhook` ✓
- `--outbound-voice-profile-id` documented with "auto-detect first available" ✓
- Examples include `--outbound-voice-profile-id 2927726759434519857` ✓

### 3. Per-command --help
- `setup-voice --help` → shows help, does NOT run command ✓
- `setup-voice -h` → shows help ✓
- All 39 commands tested with `--help` → 39/39 PASS ✓
- 4 commands tested with `-h` → 4/4 PASS ✓

### 4. No API key
- `env -u TELNYX_API_KEY setup-voice --json` → "Fatal: No Telnyx API key found." exit 1 ✓
- `env -u TELNYX_API_KEY setup-voice` (human mode) → same clean error ✓

### 5. Source code audit
- Step 1: GETs `/outbound_voice_profiles` or uses `--outbound-voice-profile-id` ✓
- Step 2: POSTs to `/call_control_applications` (NOT `/credential_connections`) ✓
- Step 2 body includes `application_name`, `webhook_event_url`, `outbound.outbound_voice_profile_id` ✓
- Step 5: PATCHes `/phone_numbers/:id` with `connection_id` from CCA ✓
- NO `telnyxCli` import ✓
- `TelnyxAPIError` handled in errorMsg ✓
- `SetupVoiceResult` interface: `connection_id`, `connection_name`, `phone_number`, `phone_number_id`, `webhook_url`, `outbound_voice_profile_id`, `ready`, `steps` ✓
- Zero references to `sip_username`, `sip_password`, or `credential_connections` ✓

### 6. README
- Mentions "Call Control Application" ✓
- Mentions webhook URL + outbound voice profile ✓
- Examples include `--outbound-voice-profile-id` ✓
- Flags documented: `--webhook-url`/`--webhook`, `--outbound-voice-profile-id`, `--country` ✓
- Output format matches `SetupVoiceResult` interface ✓

### 7. Client.ts
- `TELNYX_API_BASE_URL` env support added ✓
- Comment block mentions `call_control_applications` and `outbound_voice_profiles` ✓

### 8. Index.ts
- `helpRequested` intercept present ✓
- Setup-voice help text mentions Call Control App ✓

### 9. Test suite
- `tests/setup-voice.test.ts` — 11 tests, all PASS ✓
  - POSTs to /call_control_applications (not /credential_connections) ✓
  - webhook_event_url + outbound_voice_profile_id in body ✓
  - GETs /outbound_voice_profiles when no --outbound-voice-profile-id ✓
  - Skips GET when --outbound-voice-profile-id provided ✓
  - Default webhook URL used ✓
  - --webhook alias works ✓
  - PATCH /phone_numbers with CCA connection_id ✓
  - Zero POSTs to /credential_connections ✓
  - JSON output has connection_id, phone_number, webhook_url, outbound_voice_profile_id ✓
  - 5 steps with correct names ✓
  - Help lists --outbound-voice-profile-id ✓

- `tests/setup-voice-edge.test.ts` — 4 tests, all PASS ✓
  - Empty outbound voice profiles → clear error ✓
  - CCA POST 422 → error in JSON ✓
  - PATCH error → step 5 failure, connection_id still set ✓
  - Human mode error output ✓

- Full suite: 212/212 PASS, 0 FAIL ✓

### 10. Try to break it
- `setup-voice --json --country XX` without API key → clean auth error ✓
- All 39 commands with `--help` → all show help ✓

## Verdict: PASS ✅
