# Friction Log

Issues encountered during end-to-end validation of the SMS Marketing Pipeline blueprint (2026-03-07). Every friction point below was **reproduced live** during testing — nothing is carried from documentation alone.

---

## FRIC-001: Messaging Profile Requires `whitelisted_destinations` (High Severity)

**Service:** Messaging Profiles
**How we hit it:** Created a messaging profile without `whitelisted_destinations` — got error `40331` (422).
**What you'd expect:** Docs say it's optional.
**What actually happens:** API rejects the request. Error message doesn't clearly indicate which field is missing.
**Workaround:** Always include `"whitelisted_destinations": ["US"]`.
**Agent-completable:** Yes

## FRIC-002: Smart Encoding Field Name Undocumented (Medium Severity)

**Service:** Messaging Profiles
**How we hit it:** Tried `PATCH` with `"enabled_smart_encoding": true` — got error `10004` ("No valid parameters were supplied"). No hint about the correct field name.
**What you'd expect:** Error message suggests the correct field, or docs clearly show it.
**What actually happens:** Generic error. Had to `GET` the profile and inspect response keys to discover the field is `smart_encoding`.
**Workaround:** Use `"smart_encoding": true`. Discover fields by inspecting GET response.
**Agent-completable:** Yes

## FRIC-003: Filter Bracket Encoding Returns Silent Empty Results (Low Severity)

**Service:** Multiple
**How we hit it:** `GET /v2/phone_numbers?page[size]=10` with raw brackets returned **zero results**. Same call with `--data-urlencode` returned **7 numbers**. No error — just silently wrong data.
**What you'd expect:** Either the API handles brackets or returns an error.
**What actually happens:** Empty results with no indication anything is wrong.
**Workaround:** Always use `-G` with `--data-urlencode` for filter parameters in curl.
**Agent-completable:** Yes

## FRIC-004: 10DLC Response Structure Inconsistent (Low Severity)

**Service:** 10DLC Registration
**How we hit it:** `POST /v2/10dlc/brand` returned `brandId` at the top level. Code expecting `.data.brandId` (standard Telnyx pattern) broke.
**What you'd expect:** `.data` wrapper like every other Telnyx API.
**What actually happens:** 10DLC uses top-level fields. Pagination also uses `page`/`recordsPerPage` instead of `page[number]`/`page[size]`.
**Workaround:** Handle both response structures in API client code.
**Agent-completable:** Yes

## FRIC-005: Campaign Creation Uses Non-Standard Endpoint (Low Severity)

**Service:** 10DLC Registration
**How we hit it:** Tried `POST /v2/10dlc/campaign` — got 404. The correct endpoint is `POST /v2/10dlc/campaignBuilder`.
**What you'd expect:** Standard REST: `POST /v2/10dlc/campaign`.
**What actually happens:** Creation uses `/campaignBuilder`. CRUD uses `/campaign/{id}`.
**Workaround:** Use `/v2/10dlc/campaignBuilder` for creation.
**Agent-completable:** Yes

## FRIC-006: 10DLC Brand Vetting Has No Webhook (High Severity)

**Service:** 10DLC Registration
**How we hit it:** Registered a mock brand via `POST /v2/10dlc/brand`. Needed to check `identityStatus` — only option was polling `GET /v2/10dlc/brand/{brandId}`. No webhook event exists.
**What you'd expect:** A webhook fires when vetting completes.
**What actually happens:** Must poll manually. For marketing campaigns, this blocks campaign creation for 1–7 business days with no async notification.
**Workaround:** Poll hourly. Use toll-free numbers for testing while waiting.
**Agent-completable:** Yes

## FRIC-007: Messaging Profile Deletion Requires Number Removal First (Low Severity)

**Service:** Messaging Profiles
**How we hit it:** Tried `DELETE` on a messaging profile — got error `40158`. Had to release numbers first, then delete profile.
**What you'd expect:** Either cascade-unassign or clear error upfront.
**What actually happens:** Generic delete failure. Must remove all number assignments first.
**Workaround:** Release or unassign all phone numbers before deleting the profile.
**Agent-completable:** Yes

## FRIC-008: Mock Brand Cannot Be Deleted in Pending State (Low Severity)

**Service:** 10DLC Registration
**How we hit it:** Created a mock brand (`mock: true`), then tried to delete it — error `10015` ("Brand cannot be deleted because it is in a pending state"). Still stuck on the account.
**What you'd expect:** Mock brands should be easily disposable for test cleanup.
**What actually happens:** Brand in pending state cannot be deleted.
**Workaround:** Wait for mock brand to resolve, or contact Telnyx support.
**Agent-completable:** No

## FRIC-009: `optoutMessage` Required But Not in Docs (Medium Severity)

**Service:** 10DLC Registration
**How we hit it:** Submitted a campaign via `POST /v2/10dlc/campaignBuilder` without the `optoutMessage` field — API rejected the request. The field is not listed in the API documentation as required.
**What you'd expect:** Docs clearly list all required fields, or the API provides a descriptive error naming the missing field.
**What actually happens:** Campaign creation fails. The `optoutMessage` field (the auto-reply text sent when a recipient texts STOP) must be included but isn't documented as required in the API reference.
**Workaround:** Always include `optoutMessage` in campaign creation requests. Example: `"optoutMessage": "You have been unsubscribed from [Brand] messages. No more messages will be sent. Reply START to re-subscribe."`
**Agent-completable:** Yes

---

## Summary

| ID | Severity | Service | Reproduced | Agent-Completable |
|----|----------|---------|------------|-------------------|
| FRIC-001 | High | Messaging Profiles | ✅ Profile creation failed without field | Yes |
| FRIC-002 | Medium | Messaging Profiles | ✅ Wrong field name, generic error | Yes |
| FRIC-003 | Low | Multiple | ✅ Raw brackets returned 0 of 7 numbers | Yes |
| FRIC-004 | Low | 10DLC | ✅ Brand response used top-level fields | Yes |
| FRIC-005 | Low | 10DLC | ✅ POST /campaign returned 404 | Yes |
| FRIC-006 | High | 10DLC | ✅ Polled brand status, no webhook | Yes |
| FRIC-007 | Low | Messaging Profiles | ✅ Delete blocked by assigned numbers | Yes |
| FRIC-008 | Low | 10DLC | ✅ Mock brand undeletable | No |
| FRIC-009 | Medium | 10DLC | ✅ `optoutMessage` required but not in docs | Yes |
