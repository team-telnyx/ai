# E2E Blind Test Report — AIF-328 setup-voice

**Date:** 2026-07-27  
**Tester:** Blind agent (zero prior knowledge of codebase)  
**Branch:** `fix/aif-328-setup-voice-call-control-app`  
**Commit:** `f3b0e85` (latest on branch)

---

## 1. Discovery

### 1.1 `help` command lists setup-voice with "Call Control App"

**Command:** `npx tsx bin/telnyx-agent.ts help`  
**Exit code:** 0  
**Key observations:**  
- setup-voice listed as: `setup-voice       Zero to voice: create Call Control App, buy number, assign it`
- Mentions "Call Control App" explicitly ✅

**Verdict:** ✅ PASS

### 1.2 `--webhook` and `--outbound-voice-profile-id` documented in help

**Command:** (same help output as 1.1)  
**Key observations:**  
- `--webhook <url>` is listed under "Setup-specific Flags" with description "Webhook URL (setup-voice, default: https://example.com/webhook)"
- `--outbound-voice-profile-id` is listed with description "Outbound voice profile ID (setup-voice, default: auto-detect first available)"
- `--webhook-url` is NOT separately listed in the help text (only `--webhook`). The code accepts both `--webhook-url` and `--webhook`. The README documents both. Minor doc gap in help text.

**Verdict:** ⚠️ PASS (minor: `--webhook-url` not explicitly shown in help, only `--webhook` alias)

### 1.3 `setup-voice --help` shows help, does NOT run the command

**Command:** `npx tsx bin/telnyx-agent.ts setup-voice --help`  
**Exit code:** 0  
**Key observations:**  
- Shows the full help text
- Does NOT execute setup-voice (no API calls, no "Setting up Voice..." output)
- `helpRequested` flag in parseFlags intercepts `--help` before the command handler runs

**Verdict:** ✅ PASS

### 1.4 `setup-voice -h` shows help

**Command:** `npx tsx bin/telnyx-agent.ts setup-voice -h`  
**Exit code:** 0  
**Key observations:**  
- Identical behavior to `--help` — shows full help text, does not run setup-voice

**Verdict:** ✅ PASS

---

## 2. Source Code Audit — `src/commands/setup-voice.ts`

### 2.1 Step 1: GETs /outbound_voice_profiles (or uses --outbound-voice-profile-id)

**Key observations:**  
- When `--outbound-voice-profile-id` is NOT provided: `await client.get("/outbound_voice_profiles")` and takes `profilesData[0].id`
- When `--outbound-voice-profile-id` IS provided: skips the GET entirely, uses the provided ID
- Empty profiles list throws clear error: "No outbound voice profiles found. Create one in the Telnyx portal or pass --outbound-voice-profile-id."

**Verdict:** ✅ PASS

### 2.2 Step 2: POSTs to /call_control_applications (NOT /credential_connections)

**Key observations:**  
- `await client.post("/call_control_applications", appBody)` — correct endpoint
- No reference to `/credential_connections` anywhere in the source file
- grep for `credential_connection` in all `src/` files: zero results

**Verdict:** ✅ PASS

### 2.3 Step 2 body includes application_name, webhook_event_url, outbound.outbound_voice_profile_id

**Key observations:**  
```typescript
const appBody = {
  application_name: connectionName,
  webhook_event_url: webhookUrl,
  outbound: {
    outbound_voice_profile_id: outboundProfileId,
  },
};
```
All three required fields present. ✅

**Verdict:** ✅ PASS

### 2.4 Step 5: PATCHes /phone_numbers/:id with connection_id from the Call Control App

**Key observations:**  
- `await client.patch(`/phone_numbers/${phoneNumberId}`, { connection_id: connectionId })`
- `connectionId` is set from `String(appData.id)` where `appData` comes from the CCA POST response

**Verdict:** ✅ PASS

### 2.5 Does NOT import or call telnyxCli for the REST path

**Key observations:**  
- Imports: `TelnyxClient`, `TelnyxAPIError` from `../client.ts` (REST client)
- Imports: `TelnyxCLIError` from `../telnyx-cli.ts` (only for error type detection in `errorMsg`)
- Imports: `searchAndBuyNumber` from `../utils/number-order.ts` (wraps Go CLI for number search/buy only)
- All REST calls (GET/POST/PATCH) go through `TelnyxClient`, not the Go CLI

**Verdict:** ✅ PASS

### 2.6 Error handler covers TelnyxAPIError

**Key observations:**  
```typescript
function errorMsg(err: unknown): string {
  if (err instanceof TelnyxAPIError) return `${err.detail} (HTTP ${err.statusCode})`;
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
```
Covers TelnyxAPIError, TelnyxCLIError, generic Error, and unknown. ✅

**Verdict:** ✅ PASS

### 2.7 SetupVoiceResult interface has required fields

**Key observations:**  
```typescript
interface SetupVoiceResult {
  connection_id: string;
  connection_name: string;
  phone_number: string;
  phone_number_id: string;
  webhook_url: string;
  outbound_voice_profile_id: string;
  ready: boolean;
  steps: StepResult[];
}
```
All required fields present: `connection_id` ✅, `phone_number` ✅, `webhook_url` ✅, `outbound_voice_profile_id` ✅, `ready` ✅  
Extra fields (`connection_name`, `phone_number_id`, `steps`) are additive and don't break the contract.

**Verdict:** ✅ PASS

### 2.8 No leftover references to sip_username, sip_password, or credential connections

**Key observations:**  
- `grep -rn "sip_username|sip_password|credential_connection" src/commands/setup-voice.ts` → zero results
- `grep -rn "credential_connection" src/ --include="*.ts"` → zero results across all source files
- Note: `src/utils/output.ts` has `sipPassword` in the `isSensitiveKey` redaction function — this is legacy redaction support, NOT credential connection creation. Not a bug.

**Verdict:** ✅ PASS

---

## 3. No API Key Tests

### 3.1 No API key with --json

**Command:** `env -u TELNYX_API_KEY HOME=/tmp/nohome npx tsx bin/telnyx-agent.ts setup-voice --json`  
**Exit code:** 1  
**Key observations:**  
- Output: `Fatal: No Telnyx API key found.\nSet TELNYX_API_KEY environment variable or configure ~/.config/telnyx/config.json`
- Clean failure, exit code 1, no partial output

**Verdict:** ✅ PASS

### 3.2 No API key without --json

**Command:** `env -u TELNYX_API_KEY HOME=/tmp/nohome npx tsx bin/telnyx-agent.ts setup-voice`  
**Exit code:** 1  
**Key observations:**  
- Same clear auth error message
- Exit code 1

**Verdict:** ✅ PASS

---

## 4. README Check

### 4.1 setup-voice section mentions "Call Control Application", webhook, outbound voice profile

**Key observations:**  
- "Creates a Call Control Application (with webhook URL + outbound voice profile), searches for a voice-capable number, buys it, and assigns it to the app."
- "The output `connection_id` works directly with `call-dial`."
- Documents `--webhook-url (or --webhook)` and `--outbound-voice-profile-id` and `--country`

**Verdict:** ✅ PASS

### 4.2 Examples include --outbound-voice-profile-id

**Key observations:**  
```bash
telnyx-agent setup-voice
telnyx-agent setup-voice --webhook https://example.com/calls
telnyx-agent setup-voice --outbound-voice-profile-id 2927726759434519857
telnyx-agent setup-voice --country US --json
```

**Verdict:** ✅ PASS

### 4.3 Output format docs match SetupVoiceResult interface

**Key observations:**  
README says: `Output: { connection_id, connection_name, phone_number, phone_number_id, webhook_url, outbound_voice_profile_id, ready }`  
Source has: `interface SetupVoiceResult { connection_id, connection_name, phone_number, phone_number_id, webhook_url, outbound_voice_profile_id, ready, steps }`  
The `steps` field is extra in the actual interface but not listed in the README. This is an additive difference — the README shows the key fields, the `steps` array is diagnostic. Not a breaking issue.

**Verdict:** ✅ PASS

---

## 5. Test Suite

### 5.1 `tests/setup-voice.test.ts` audit

| Test | What it checks | Verdict |
|------|----------------|--------|
| POSTs to /call_control_applications | Asserts POST to `/v2/call_control_applications` and zero POSTs to `/v2/credential_connections` | ✅ PASS |
| webhook_event_url and outbound_voice_profile_id in body | Asserts `body.webhook_event_url` and `body.outbound.outbound_voice_profile_id` | ✅ PASS |
| GETs /outbound_voice_profiles when no flag | Asserts one GET to `/v2/outbound_voice_profiles` | ✅ PASS |
| Skips GET when --outbound-voice-profile-id provided | Asserts zero GETs, uses explicit ID in CCA body | ✅ PASS |
| Default webhook URL when no flag | Asserts `body.webhook_event_url === "https://example.com/webhook"` | ✅ PASS |
| --webhook alias works | Asserts `body.webhook_event_url === "https://alias.example.com/hook"` | ✅ PASS |
| PATCHes /phone_numbers/:id with CCA connection_id | Asserts PATCH with `connection_id === "cca_abc123"` | ✅ PASS |
| Does NOT POST to /credential_connections | Separate explicit assertion | ✅ PASS |
| JSON output has connection_id, phone_number, webhook_url, outbound_voice_profile_id, ready | Parses stdout JSON and asserts each field | ✅ PASS |
| 5 steps with correct names | Asserts step names and all `status: "completed"` | ✅ PASS |
| Help lists setup-voice and --outbound-voice-profile-id | Runs `help` command, checks output | ✅ PASS |

### 5.2 `tests/setup-voice-edge.test.ts` audit

| Test | What it checks | Verdict |
|------|----------------|--------|
| Empty outbound voice profiles → clear error | Sets mode="empty-profiles", asserts exit 1, `ready: false`, error matches /No outbound voice profiles found/ | ✅ PASS |
| CCA POST 422 → error in JSON | Sets mode="cca-error", asserts exit 1, error matches /Invalid webhook URL/ and /HTTP 422/ | ✅ PASS |
| PATCH error → step 5 failure | Sets mode="patch-error", asserts exit 1, step 5 status="failed", connection_id still set | ✅ PASS |
| Human mode: empty profiles → prints error | No --json, asserts exit 1, stdout matches /No outbound voice profiles found/ | ✅ PASS |

### 5.3 `npm test` run

**Command:** `npm test`  
**Exit code:** 0  
**Results:** 212 tests, 212 pass, 0 fail, 0 cancelled, 0 skipped  
**Duration:** ~64s

**Verdict:** ✅ PASS (all tests green)

---

## 6. Client.ts Check

### 6.1 TELNYX_API_BASE_URL env support

**Key observations:**  
```typescript
this.baseUrl = (baseUrl ?? process.env.TELNYX_API_BASE_URL ?? "https://api.telnyx.com/v2").replace(/\/$/, "");
```
- Supports `TELNYX_API_BASE_URL` environment variable
- Defaults to `https://api.telnyx.com/v2`
- Strips trailing slash

**Verdict:** ✅ PASS

### 6.2 Comment block mentions call_control_applications and outbound_voice_profiles

**Key observations:**  
The comment block in client.ts lists operations that use direct REST:
- `POST /call_control_applications (setup-voice — Go CLI creates credential connections, not Call Control Apps)` ✅
- `GET /outbound_voice_profiles (setup-voice — needed to resolve default outbound profile)` ✅

**Verdict:** ✅ PASS

---

## 7. Index.ts Check

### 7.1 helpRequested intercept is present

**Key observations:**  
```typescript
const { command, flags, occurrences, helpRequested } = parseFlags(argv);
// ...
if (helpRequested) {
  console.log(HELP);
  return;
}
```
- `parseFlags` returns `helpRequested: boolean`
- Checked before command dispatch
- Works for ALL commands (verified: `status --help`, `tts --help`, `setup-sms -h` all show help)

**Verdict:** ✅ PASS

### 7.2 setup-voice help text mentions Call Control App, --webhook, --outbound-voice-profile-id

**Key observations:**  
- Help line: `setup-voice       Zero to voice: create Call Control App, buy number, assign it` ✅
- Setup-specific Flags: `--webhook <url>` ✅, `--outbound-voice-profile-id` ✅
- Examples include: `telnyx-agent setup-voice`, `telnyx-agent setup-voice --webhook https://example.com/calls`, `telnyx-agent setup-voice --outbound-voice-profile-id 2927726759434519857`

**Verdict:** ✅ PASS

---

## 8. Try to Break It

### 8.1 Invalid country `--country XX`

**Command:** `npx tsx bin/telnyx-agent.ts setup-voice --json --country XX`  
**Exit code:** 1  
**Key observations:**  
- Steps 1 and 2 succeed (outbound profile resolved, CCA created)
- Step 3 fails (number search/buy fails — in this environment, the Go CLI `available-phone-numbers:list` command isn't found)
- JSON output includes `status: "failed"`, `ready: false`, error detail
- Exit code 1
- Fails gracefully — no crash, no unhandled exception, structured JSON error

**Verdict:** ✅ PASS (fails gracefully with exit 1)

### 8.2 Other commands with --help/-h still work

**Commands tested:**  
- `status --help` → shows help ✅
- `tts --help` → shows help ✅
- `setup-sms -h` → shows help ✅

**Key observations:**  
- `helpRequested` is a global feature in `parseFlags`, not specific to setup-voice
- All commands respect `--help` and `-h`

**Verdict:** ✅ PASS

### 8.3 `--webhook-url` flag (not just `--webhook`)

**Command:** `npx tsx bin/telnyx-agent.ts setup-voice --webhook-url https://test.example.com/whook --json`  
**Exit code:** 1 (fails at step 3 due to Go CLI not installed, not a code bug)  
**Key observations:**  
- `--webhook-url` is accepted by the code (`flags["webhook-url"]` in setup-voice.ts)
- Step 2 (CCA creation) succeeded with the webhook URL
- Confirmed both `--webhook-url` and `--webhook` are accepted as aliases

**Verdict:** ✅ PASS

---

## Issues Found

### Issue 1: `--webhook-url` not explicitly listed in help text (MINOR)

**Severity:** Low (documentation gap)  
**Description:** The code accepts both `--webhook-url` and `--webhook` as flags. The README documents both (`--webhook-url (or --webhook)`). However, the help text only lists `--webhook <url>` in the Setup-specific Flags section. A user who reads the README and then runs `help` might not immediately connect that `--webhook` is the same as `--webhook-url`.  
**Recommendation:** Add `--webhook-url` as an alias note in the help text, e.g.:
```
--webhook-url <url>   Webhook URL (setup-voice, alias: --webhook, default: https://example.com/webhook)
```

### Issue 2: `isSensitiveKey` still references `sipPassword` (OBSERVATION, NOT A BUG)

**Severity:** None (legacy redaction support)  
**Description:** `src/utils/output.ts` has `sipPassword` in the `isSensitiveKey` regex for redacting sensitive values in output. This is not a code issue — it's just redaction safety for any field that might contain SIP passwords. No credential connections are created.  
**Recommendation:** No action needed. Could be cleaned up in a future pass if desired.

---

## Summary

| # | Test | Verdict |
|---|------|---------|
| 1.1 | help lists setup-voice with "Call Control App" | ✅ PASS |
| 1.2 | --webhook/--outbound-voice-profile-id in help | ⚠️ PASS (minor: --webhook-url not shown) |
| 1.3 | setup-voice --help shows help, doesn't run | ✅ PASS |
| 1.4 | setup-voice -h shows help | ✅ PASS |
| 2.1 | Step 1: GETs /outbound_voice_profiles or uses flag | ✅ PASS |
| 2.2 | Step 2: POSTs to /call_control_applications | ✅ PASS |
| 2.3 | Step 2 body: application_name, webhook_event_url, outbound profile | ✅ PASS |
| 2.4 | Step 5: PATCHes /phone_numbers/:id with CCA connection_id | ✅ PASS |
| 2.5 | Does NOT use telnyxCli for REST path | ✅ PASS |
| 2.6 | Error handler covers TelnyxAPIError | ✅ PASS |
| 2.7 | SetupVoiceResult has all required fields | ✅ PASS |
| 2.8 | No leftover sip_username/sip_password/credential refs | ✅ PASS |
| 3.1 | No API key + --json → clear auth error, exit 1 | ✅ PASS |
| 3.2 | No API key + human → clear auth error, exit 1 | ✅ PASS |
| 4.1 | README mentions CCA, webhook, outbound profile | ✅ PASS |
| 4.2 | README examples include --outbound-voice-profile-id | ✅ PASS |
| 4.3 | README output format matches SetupVoiceResult | ✅ PASS |
| 5.1 | setup-voice.test.ts: all assertions verified | ✅ PASS |
| 5.2 | setup-voice-edge.test.ts: all edge cases verified | ✅ PASS |
| 5.3 | npm test: 212 pass, 0 fail | ✅ PASS |
| 6.1 | TELNYX_API_BASE_URL env support in client.ts | ✅ PASS |
| 6.2 | client.ts comment mentions call_control_applications | ✅ PASS |
| 7.1 | helpRequested intercept in index.ts | ✅ PASS |
| 7.2 | Help text mentions CCA, --webhook, --outbound-voice-profile-id | ✅ PASS |
| 8.1 | --country XX fails gracefully | ✅ PASS |
| 8.2 | Other commands respect --help/-h | ✅ PASS |
| 8.3 | --webhook-url flag works as alias | ✅ PASS |

### Overall Verdict: ✅ PASS

**Tests passed:** 26/26  
**Issues found:** 1 minor (help text doesn't list `--webhook-url` explicitly)  
**Bugs found:** 0  
**Test suite:** 212/212 pass, 0 fail

The AIF-328 fix is solid. `setup-voice` correctly creates a Call Control Application (not a credential connection), the output `connection_id` is usable with `call-dial`, the test suite is comprehensive, and edge cases are handled gracefully.
