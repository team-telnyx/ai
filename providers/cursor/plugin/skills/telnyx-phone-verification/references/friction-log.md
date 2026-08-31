# Friction Log

Issues encountered during research and validation, with workarounds.

## FRIC-001: 10DLC Brand Vetting Has No Webhook (High Severity)

**Service:** 10DLC Registration
**What you'd expect:** A webhook event (e.g., `10dlc.brand.vetted`) fires when brand vetting completes.
**What actually happens:** You must poll `GET /v2/10dlc/brand/{brandId}` and check `identityStatus`. No async notification.
**Impact:** Cannot automate the setup flow without building a polling mechanism.
**Workaround:** Poll hourly with exponential backoff. Use toll-free numbers for testing while waiting.
**Agent-completable:** Yes (polling can be automated)

## FRIC-002: Verify Profile Has No Link to Messaging Profile (Medium Severity)

**Service:** Verify API
**What you'd expect:** Verify Profile should accept a `messaging_profile_id` so OTPs are sent from numbers in your configured pool.
**What actually happens:** Verify API manages number selection internally. There is no field to associate a messaging profile with a verify profile.
**Impact:** No control over which "from" number is used for verification SMS.
**Workaround:** Accept Telnyx's automatic number selection. If you need control, bypass Verify API and implement OTP logic manually using the Messaging API.
**Agent-completable:** No (API limitation)

## FRIC-003: 10DLC Uses Different Pagination Convention (Low Severity)

**Service:** 10DLC Registration
**What you'd expect:** Consistent pagination across all Telnyx APIs.
**What actually happens:** Most APIs use `page[number]` and `page[size]`. 10DLC uses `page` and `recordsPerPage`.
**Impact:** Code written for one API's pagination pattern won't work for 10DLC without modification.
**Workaround:** Handle both pagination styles in your API client.
**Agent-completable:** Yes (code adjustment)

## FRIC-004: Campaign Submission Uses Different Endpoint Than CRUD (Low Severity)

**Service:** 10DLC Registration
**What you'd expect:** Campaign creation via `POST /v2/10dlc/campaign`.
**What actually happens:** Campaign creation uses `POST /v2/10dlc/campaignBuilder` (separate endpoint). `POST /v2/10dlc/campaign` may not exist or behave differently.
**Impact:** Confusing for developers who expect standard REST conventions.
**Workaround:** Use `/v2/10dlc/campaignBuilder` for campaign creation. Use `/v2/10dlc/campaign/{id}` for GET/PUT/DELETE.
**Agent-completable:** Yes (use correct endpoint)

## FRIC-005: Phone Number URL Encoding for Verify by Phone Number (Low Severity)

**Service:** Verify API
**What you'd expect:** Pass `+13035551234` directly in the URL path.
**What actually happens:** The `+` must be URL-encoded as `%2B`. Some HTTP clients do this automatically, others don't.
**Impact:** 404 errors if `+` is not properly encoded.
**Workaround:** Always URL-encode the phone number: `%2B13035551234`. In Python: `urllib.parse.quote(phone_number, safe='')`.
**Agent-completable:** Yes (code adjustment)

## FRIC-006: 10DLC Brand Cannot Be Deleted If It Has Campaigns (Medium Severity)

**Service:** 10DLC Registration
**What you'd expect:** Ability to clean up test brands.
**What actually happens:** Brand deletion requires all campaigns to be deactivated AND at least 3 months old.
**Impact:** Test brands with campaigns cannot be cleaned up for at least 3 months. $4 cost per brand is non-refundable.
**Workaround:** Use `"mock": true` for testing to avoid real brand creation. Plan brand registration carefully.
**Agent-completable:** No (time-based restriction)

## FRIC-007: No Explicit Relationship Between Verify API and 10DLC (Medium Severity)

**Service:** Verify API + 10DLC
**What you'd expect:** Documentation clearly states that 10DLC registration is required for Verify API SMS to work in the US.
**What actually happens:** Verify API docs don't mention 10DLC. 10DLC docs don't mention Verify API. The connection is not documented.
**Impact:** Developers may set up Verify API without 10DLC and wonder why SMS messages aren't being delivered.
**Workaround:** This blueprint documents the dependency explicitly. Always complete 10DLC registration before using Verify API for US SMS.
**Agent-completable:** No (documentation gap)

## FRIC-008: Messaging Profile Requires whitelisted_destinations (High Severity)

**Service:** Messaging Profiles
**What you'd expect:** `whitelisted_destinations` is an optional field (not marked as required in the API reference).
**What actually happens:** The API returns error code `40331` if `whitelisted_destinations` is omitted. Profile creation fails with 422 Unprocessable Entity.
**Impact:** First-time developers hit an unexpected 422. Error message doesn't clearly indicate which field is missing.
**Workaround:** Always include `"whitelisted_destinations": ["US"]` (or your target countries).
**Agent-completable:** Yes (include field in request)

## FRIC-009: Number Search Results Expire Without Documented TTL (Medium Severity)

**Service:** Global Numbers / Number Orders
**What you'd expect:** Search results remain valid for a reasonable documented period, or the API provides a reservation mechanism.
**What actually happens:** Searching then purchasing later (even minutes later) can fail with error `10027` ("Number not available"). No documented cache TTL or reservation mechanism.
**Impact:** Agents and async workflows that separate search from purchase fail silently.
**Workaround:** Always search and purchase in immediate succession. Do not cache search results.
**Agent-completable:** Yes (workflow adjustment)

## FRIC-010: Curl Bracket Encoding for Filter Parameters (Low Severity)

**Service:** Multiple (any endpoint using filter brackets)
**What you'd expect:** Curl handles `[]` in URLs automatically, or the API returns a clear error.
**What actually happens:** Raw `[]` characters in curl URLs may silently return empty results instead of an error.
**Impact:** Copy-pasting documentation examples into terminals may silently fail.
**Workaround:** Always use `-G` flag with `--data-urlencode` for filter parameters.
**Agent-completable:** Yes (use correct curl syntax)

## FRIC-011: Verify Profile Requires Channel Settings (Medium Severity)

**Service:** Verify API
**What you'd expect:** Creating a verify profile with just a name and webhook URL should work.
**What actually happens:** Creating without at least one channel configuration block (`sms` or `call`) fails with `"No channel setting provided"`.
**Impact:** Developers must make a failed request to discover the required structure.
**Workaround:** Always include at least one channel block. Minimum: `"sms": {"app_name": "YourApp", "code_length": 6, "whitelisted_destinations": ["US"], "default_verification_timeout_secs": 300}`.
**Agent-completable:** Yes (include channel settings)

## Summary

| ID | Severity | Service | Agent-Completable |
|----|----------|---------|-------------------|
| FRIC-001 | High | 10DLC | Yes |
| FRIC-002 | Medium | Verify API | No |
| FRIC-003 | Low | 10DLC | Yes |
| FRIC-004 | Low | 10DLC | Yes |
| FRIC-005 | Low | Verify API | Yes |
| FRIC-006 | Medium | 10DLC | No |
| FRIC-007 | Medium | Verify + 10DLC | No |
| FRIC-008 | High | Messaging | Yes |
| FRIC-009 | Medium | Numbers | Yes |
| FRIC-010 | Low | Multiple | Yes |
| FRIC-011 | Medium | Verify API | Yes |
