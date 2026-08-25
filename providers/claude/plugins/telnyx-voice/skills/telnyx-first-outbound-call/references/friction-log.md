# Friction Log — First Outbound Call

Issues encountered during research and validation, with workarounds.

## FRIC-001: SIP 500 with null error gives no actionable information (Critical Severity)

**Service:** Call Control API
**What you'd expect:** When an outbound call fails because no OVP is linked, the `call.hangup` webhook event should contain a meaningful error like "No outbound voice profile configured."
**What actually happens:** `telnyx_error: null` and `sip_hangup_cause: "500"`. Zero indication that the OVP is missing.
**Impact:** This is the #1 developer pain point — calls fail with no actionable error. The API returns 200 OK even when the call will fail.
**Workaround:** Use the validation script or pre-flight checklist before making calls. Always verify OVP is linked at `.data.outbound.outbound_voice_profile_id` in the Call Control Application response; there is no top-level `outbound_voice_profile_id`.
**Agent-completable:** Yes (validation script automates the check)

## FRIC-002: POST /v2/calls returns 200 even when call will fail (High Severity)

**Service:** Call Control API
**What you'd expect:** The API should validate that the connection has an OVP and return an error synchronously.
**What actually happens:** 200 OK with `call_control_id` — the failure arrives asynchronously via webhook with `telnyx_error: null`.
**Impact:** Developers think the call succeeded until they check webhooks or CDRs.
**Workaround:** Never assume 200 = call will work. Always check webhook events or CDRs for actual call outcome.
**Agent-completable:** Yes (check CDRs after call initiation)

## FRIC-003: No documentation mentions OVP as a prerequisite for outbound calls (High Severity)

**Service:** Call Control API
**What you'd expect:** "Before making a call, ensure your connection has an Outbound Voice Profile" — front and center in the quickstart.
**What actually happens:** OVP is mentioned in its own docs section but not in the Call Control getting-started flow.
**Impact:** New developers skip the OVP step and hit the SIP 500 + null error with no guidance.
**Workaround:** This blueprint documents the dependency explicitly in the setup flow.
**Agent-completable:** No (documentation gap)

## FRIC-004: `is_alive` field in call initiation response causes confusion (Medium Severity)

**Service:** Call Control API
**What you'd expect:** `is_alive: true` when the call is accepted, or documentation explaining the field.
**What actually happens:** `is_alive: null` or `false` in the immediate response — becomes `true` only once the call starts ringing.
**Impact:** Developers don't know if the call was accepted or not.
**Workaround:** Check for absence of `errors` field instead of checking `is_alive`.
**Agent-completable:** Yes (check for errors field, not is_alive)

## FRIC-005: `whitelisted_destinations` default example causes silent SIP 403 for international callers (High Severity)

**Service:** Outbound Voice Profiles
**What you'd expect:** Documentation should warn that `whitelisted_destinations` only covers listed countries.
**What actually happens:** Examples only show `["US", "CA"]`. International developers calling other countries get SIP 403 with no indication why.
**Impact:** Silent failure for non-US/CA destinations.
**Workaround:** Add all required destination countries upfront. Common codes: US, CA, GB, AU, IN, LK, PH, DE, FR.
**Agent-completable:** Yes (include all needed countries)

## FRIC-006: Number order returns "pending" before "success" with no guidance to wait (Low Severity)

**Service:** Number Orders
**What you'd expect:** Blueprint/docs should mention `"pending"` is normal and to wait before proceeding.
**What actually happens:** Response is `"pending"` first — developers may think something went wrong.
**Impact:** Developers try to assign the number before it's active, which fails.
**Workaround:** Wait 3–5 seconds and verify with `GET /v2/phone_numbers` before proceeding.
**Agent-completable:** Yes (poll for active status)

## FRIC-007: Raw brackets in curl filter parameters silently return empty results (Low Severity)

**Service:** Multiple (any endpoint using filter brackets)
**What you'd expect:** Curl handles `[]` in URLs automatically, or the API returns a clear error.
**What actually happens:** Raw `[]` characters in curl URLs may silently return empty results.
**Impact:** Copy-pasting documentation examples into terminals may silently fail.
**Workaround:** Always use `-G` flag with `--data-urlencode` for filter parameters.
**Agent-completable:** Yes (use correct curl syntax)

## FRIC-008: OVP link appears missing if checked at the wrong JSON path (Medium Severity)

**Service:** Call Control Applications
**What you'd expect:** The application response would expose `outbound_voice_profile_id` at the top level, matching the field name used when patching the app.
**What actually happens:** The link is nested under `.data.outbound.outbound_voice_profile_id`. A top-level check reports missing/empty even when the OVP is correctly linked.
**Impact:** Developers can misdiagnose a working app as missing its OVP and waste time recreating resources or debugging routing.
**Workaround:** Always validate the nested field: `jq -r '.data.outbound.outbound_voice_profile_id'`.
**Agent-completable:** Yes (agent and validation script use the nested path and print it explicitly)

## Summary

| ID | Severity | Service | Agent-Completable |
|----|----------|---------|-------------------|
| FRIC-001 | Critical | Call Control API | Yes |
| FRIC-002 | High | Call Control API | Yes |
| FRIC-003 | High | Call Control API | No |
| FRIC-004 | Medium | Call Control API | Yes |
| FRIC-005 | High | Outbound Voice Profiles | Yes |
| FRIC-006 | Low | Number Orders | Yes |
| FRIC-007 | Low | Multiple | Yes |
| FRIC-008 | Medium | Call Control Applications | Yes |
