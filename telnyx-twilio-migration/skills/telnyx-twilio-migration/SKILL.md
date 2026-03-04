---
name: telnyx-twilio-migration
description: >-
  Migrate from Twilio to Telnyx. Orchestrates a complete 6-phase migration:
  discovery, planning, setup, code migration, validation, and cleanup.
  Covers voice (TwiML to TeXML, Call Control API), messaging, WebRTC,
  SIP trunking, verify, fax, video, IoT, number lookup, and porting.
  Includes automated scanners, validation scripts, and integration tests.
metadata:
  author: telnyx
  product: migration
---

# Twilio to Telnyx Migration

You MUST follow these phases in order (0 → 1 → 2 → 3 → 4 → 5 → 6). Do NOT skip phases. Each phase has prerequisites and exit criteria — do not proceed until the exit criteria are met. You MUST run the scripts specified in each phase (do not substitute your own checks). You MUST modify the user's source files to complete the migration.

### Migration State Tracking

Track migration progress in `migration-state.json` using the state script. This preserves resource IDs (messaging_profile_id, connection_id, verify_profile_id) across phases and enables resume after interruption.

```bash
# Initialize at start of migration (Phase 0):
bash {baseDir}/scripts/migration-state.sh init <project-root>

# Update phase at each phase boundary:
bash {baseDir}/scripts/migration-state.sh set-phase <project-root> <phase>

# Store resource IDs when created (Phase 0/3):
bash {baseDir}/scripts/migration-state.sh set <project-root> resources.messaging_profile_id <id>

# Track completed products and files (Phase 4):
bash {baseDir}/scripts/migration-state.sh add-product <project-root> <product>
bash {baseDir}/scripts/migration-state.sh add-file <project-root> <product> <file>

# Record commits at phase boundaries:
bash {baseDir}/scripts/migration-state.sh set-commit <project-root> <phase>

# Check current status (resume after interruption):
bash {baseDir}/scripts/migration-state.sh status <project-root>
```

For a complete product mapping, see `{baseDir}/references/product-mapping.md`.

## Universal Changes (All Migrations)

1. **Authentication**: Basic Auth (`AccountSID:AuthToken`) → Bearer Token (`Authorization: Bearer $TELNYX_API_KEY`). Get key at https://portal.telnyx.com/#/app/api-keys
2. **Webhook Signatures**: HMAC-SHA1 → Ed25519. Get public key at https://portal.telnyx.com/#/app/account/public-key
3. **Webhook Payloads**: Flat form-encoded → nested JSON under `data.payload`. See `{baseDir}/references/webhook-migration.md`
4. **Recording Defaults**: Single → dual-channel. Set `channels="single"` to match Twilio behavior.

---

## Phase 0: Account & Cost Approval

> **Prerequisites**: User has a Telnyx account with KYC complete and payment method added.
> **Exit criteria**: `TELNYX_API_KEY` validates successfully, user has approved estimated costs.

### Step 0.1: Initialize State & Verify API Key

```bash
bash {baseDir}/scripts/migration-state.sh init <project-root>
if [ -z "$TELNYX_API_KEY" ]; then echo "ERROR: Set TELNYX_API_KEY first"; exit 1; fi
curl -s -H "Authorization: Bearer $TELNYX_API_KEY" https://api.telnyx.com/v2/balance
```

If this fails, the user must: create account (https://telnyx.com/sign-up), complete KYC, add payment method, generate API Key v2 (https://portal.telnyx.com/#/app/api-keys).

### Step 0.2: Present Cost Estimate and Get Approval

**Before proceeding, present the following cost estimate to the user and get explicit approval:**

| Item | Cost | When Charged | Required? |
|------|------|-------------|-----------|
| Phone number (if account has none) | ~$1.00/month | Phase 5 integration tests | Only if no numbers on account |
| Integration test — SMS | ~$0.004 | Phase 5 (opt-in) | Recommended |
| Integration test — Voice | ~$0.01 | Phase 5 (opt-in) | Recommended |
| Integration test — Verify OTP | ~$0.05 | Phase 5 (opt-in) | Recommended |
| 10DLC brand registration (US A2P messaging only) | ~$4.00 one-time | Phase 3 setup | Only for US messaging |
| 10DLC campaign (US A2P messaging only) | ~$15.00/quarter | Phase 3 setup | Only for US messaging |
| Number porting (if porting from Twilio) | Free | Post-migration | Optional |

**Total estimated cost for most migrations: $0.064 — $1.064** (test costs + optional number purchase). 10DLC adds ~$19 if applicable.

Ask the user: *"The migration itself is free — only integration testing and resource setup have small costs. The estimated total is $X. Do you approve proceeding? I will confirm again before any individual purchase."*

**Do not proceed until the user explicitly approves.** The scripts also have `--confirm` gates on individual paid actions.

### Step 0.3: Resource Setup (After Phase 1 Scan)

Return here after Phase 1 scanning to create Telnyx resources per detected products. The integration test scripts auto-create missing resources (messaging profiles, voice connections, verify profiles), but for production use, create them now via `{baseDir}/references/account-setup-guide.md`.

---

## Phase 1: Discovery

> **Prerequisites**: `TELNYX_API_KEY` is set and valid, user has approved costs.
> **Exit criteria**: `twilio-scan.json` exists with scan results, user has confirmed migration scope.

### Step 1.1: Run Full Discovery

Run the discovery script — this executes preflight check, Twilio scan, deep scan, and partial migration check in one command:

```bash
bash {baseDir}/scripts/run-discovery.sh <project-root>
```

This produces `<project-root>/twilio-scan.json` (and optionally `twilio-deep-scan.json`).

**You must run this script.** Do not manually scan files or skip this step.

### Step 1.2: Triage and Confirm Scope

Review scan results and classify each match:
- **Active import/SDK call** (e.g., `from twilio.rest import Client`, `client.messages.create()`): Needs migration
- **String reference** (e.g., `# formerly used Twilio`, URL in docs, log message): Usually no code change needed — just update text
- **Config/env var** (e.g., `TWILIO_ACCOUNT_SID`): Needs env var rename (see Phase 3)
- **Test mock** (e.g., `mock_twilio_response`): Migrate in Phase 5 with test migration

Present the triaged results to the user. Confirm:
- Which products are in scope for migration
- Which files will be modified (exclude string-only references)
- Any products that are **out of scope** — see `{baseDir}/references/unsupported-products.md`

**Out-of-scope products** (no Telnyx equivalent): Flex, Studio, TaskRouter, Conversations, Sync, Notify, Proxy, Pay, Autopilot. If detected, present alternatives from `unsupported-products.md` and ask the user to decide: keep on Twilio, replace with alternative, or remove. **Record each "keep on Twilio" decision in migration state** so Phase 6 knows whether the Twilio SDK can be safely removed:

```bash
# For each product the user decides to keep on Twilio:
bash {baseDir}/scripts/migration-state.sh set <project-root> kept_on_twilio.<product> true
# Example: bash {baseDir}/scripts/migration-state.sh set <project-root> kept_on_twilio.flex true
```

**Mobile platforms** (detected and guided): iOS native, Android native, React Native, Flutter. These require client-side SDK migration — see `{baseDir}/references/mobile-sdk-migration.md` for complete migration guides.

**Phase 1 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 1 && bash {baseDir}/scripts/migration-state.sh set <project-root> scan_file "twilio-scan.json"`

---

## Phase 2: Planning

> **Prerequisites**: Phase 1 complete, `twilio-scan.json` exists, user has confirmed scope.
> **Exit criteria**: `MIGRATION-PLAN.md` exists in project root, user has approved the plan.

### Step 2.1: Read Relevant References

For each product detected in the scan, read the corresponding reference file:

| Detected Product | Read This Reference |
|---|---|
| `voice`, `texml` | `{baseDir}/references/voice-migration.md` and `{baseDir}/references/texml-verbs.md` |
| `messaging` | `{baseDir}/references/messaging-migration.md` |
| `webrtc` | `{baseDir}/references/webrtc-migration.md` and `{baseDir}/references/mobile-sdk-migration.md` |
| `verify` | `{baseDir}/references/verify-migration.md` |
| `sip`, `sip-integrations` | `{baseDir}/references/sip-trunking-migration.md` |
| `fax` | `{baseDir}/references/fax-migration.md` |
| `video` | `{baseDir}/references/video-migration.md` |
| `iot` | `{baseDir}/references/iot-migration.md` |
| `lookup` | `{baseDir}/references/lookup-migration.md` |
| `numbers`, `numbers-config` | `{baseDir}/references/numbers-migration.md` |
| `porting-in`, `porting-out` | `{baseDir}/references/number-porting.md` |
| *(all products)* | `{baseDir}/references/webhook-migration.md` |

### Step 2.2: Present Decision Points

**Voice approach** — use this decision matrix:

| Choose TeXML when... | Choose Call Control when... |
|---|---|
| App uses TwiML/XML extensively | App needs mid-call branching logic |
| Simple IVR (Say, Gather, Dial, Record) | Real-time media streaming needed |
| Want minimal code changes (TwiML → TeXML is nearly 1:1) | Need to fork audio, transcribe live |
| Status callbacks are sufficient | Need granular call events (ringing, answered, bridged) |

> **Mixed pattern**: You CAN use both. TeXML for inbound (webhook returns XML) AND Call Control for outbound (REST API). They coexist on the same account.

**Migration strategy**:
- **Big-bang** (all at once): <10 files, single product, small team
- **Incremental** (product by product): >10 files, multiple products, need app running during migration
- **Migration order** when incremental: messaging → voice → verify → webhooks → other products

### Step 2.3: Generate Migration Plan

```bash
cp {baseDir}/templates/MIGRATION-PLAN.md <project-root>/MIGRATION-PLAN.md
```

Populate and present to user for approval before proceeding.

---

## Phase 3: Setup

> **Prerequisites**: Phase 2 complete, user has approved the migration plan.
> **Exit criteria**: Telnyx SDK installed, environment variables updated, setup committed to git.

### Step 3.1: Create Migration Branch

```bash
cd <project-root> && git checkout -b migrate/twilio-to-telnyx
```

### Step 3.2: Install Telnyx SDK (Keep Twilio Until Phase 6)

Install Telnyx SDK **alongside** Twilio — do NOT remove Twilio from the package manifest yet (removal is Phase 6). Keep `twilio` in `requirements.txt`/`package.json`/`Gemfile`/`go.mod` until Phase 6 so you can revert if validation fails.

Python: `pip install telnyx` | Node: `npm install telnyx` | Ruby: `gem 'telnyx'` in Gemfile + `bundle install` | Go: `go get github.com/team-telnyx/telnyx-go` | Java/PHP/C#: No official SDK — use REST API with `{baseDir}/sdk-reference/curl/` for API examples

### Step 3.3: Update Environment Variables

| Twilio Variable | Telnyx Replacement | Notes |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `TELNYX_API_KEY` | Bearer token, get from portal |
| `TWILIO_AUTH_TOKEN` | `TELNYX_PUBLIC_KEY` | For webhook validation (Ed25519) |
| `TWILIO_API_KEY` / `_SECRET` / `_SID` | — | Not needed (single API key model) |
| `TWILIO_PHONE_NUMBER` | `TELNYX_PHONE_NUMBER` | Your Telnyx number (E.164) |
| `TWILIO_MESSAGING_SERVICE_SID` | `TELNYX_MESSAGING_PROFILE_ID` | Messaging profile UUID |
| `TWILIO_VERIFY_SERVICE_SID` | `TELNYX_VERIFY_PROFILE_ID` | Verify profile UUID |
| *(voice with TeXML)* | `TELNYX_CONNECTION_ID` | TeXML App connection ID (required for outbound calls) |

Update `.env`, `.env.example`, secrets manager, CI/CD variables, and deployment configs. **Ensure every env var used in the migrated code is present in `.env.example`** — missing env vars are a top cause of runtime failures.

> **Rate limits**: Messaging: 1 msg/sec per number (10DLC), voice: varies by connection type. Implement exponential backoff for 429 responses.

### Step 3.4: Commit Setup Changes

```bash
git add <changed-files> && git commit -m "chore: add Telnyx SDK alongside Twilio, update env vars"
bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 3
bash {baseDir}/scripts/migration-state.sh set-commit <project-root> 3
```

---

## Supported Languages

**Full SDK**: Python (`telnyx` pip), JavaScript/TypeScript (`telnyx` npm), Go (`telnyx-go`), Ruby (`telnyx` gem) — all v2 Stainless clients with sdk-reference docs in `{baseDir}/sdk-reference/{lang}/`
**REST/curl only**: Java, PHP, C#/.NET — no official SDK. Use `{baseDir}/sdk-reference/curl/{product}.md` for complete REST API examples with all parameters.
**Client-side WebRTC SDKs**: Swift (iOS), Kotlin (Android), React Native (TypeScript), Flutter (Dart) — these cover client-side WebRTC SDK migration from Twilio. See `{baseDir}/references/mobile-sdk-migration.md`.

> **JavaScript module warning**: The `sdk-reference/javascript/` files use ESM syntax (`import Telnyx from 'telnyx'`). If the project uses CommonJS (`require`), translate to: `const Telnyx = require('telnyx'); const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });`. Do NOT copy ESM imports into CJS files — it will break unless `"type": "module"` is in `package.json`.

---

## Phase 4: Migration

> **Prerequisites**: Phase 3 complete, Telnyx SDK installed, env vars updated, setup committed.
> **Exit criteria**: All source files transformed, per-product validation passes, all changes committed.

Transform code file-by-file, grouped by product area. **You must actually modify the user's source files** — reading references alone is not sufficient.

### Migration Loop

Process each product area in priority order: **messaging → voice → verify → numbers → others**.

**For each product area:**

1. Read `{baseDir}/references/{product}-migration.md` — this is the **primary source** with Twilio→Telnyx before/after code, parameter mappings, and pitfall warnings
2. Collect all files for this product from the scan manifest (`twilio-scan.json`)

**For each file in the product area:**

1. **Read** the user's source file
2. **Identify** every Twilio pattern (imports, client init, API calls, webhooks, env vars)
3. **Transform** each pattern using the reference guide's before/after examples
4. **If the reference doesn't cover a specific API call**, look it up in `{baseDir}/sdk-reference/{language}/{product}.md` for the exact Telnyx method signature. The `{baseDir}/sdk-reference/curl/{product}.md` files have the richest examples with optional fields.
5. **Write** the transformed file
6. **Self-check**: Re-read the file and verify no Twilio patterns remain

**After all files in the product area:**

7. **Validate**: `bash {baseDir}/scripts/validate-migration.sh <project-root> --product {product}`
8. **Fix** any validation failures, re-validate until exit code is 0
9. **Commit**: `git add <changed-files> && git commit -m "migrate: {product} — Twilio to Telnyx"`
10. **Track**: `bash {baseDir}/scripts/migration-state.sh add-product <project-root> {product}` (and `add-file` for each file migrated)

**After ALL product areas are migrated:**

11. **Env var audit**: Grep all migrated source files for `process.env.TELNYX_` / `os.environ["TELNYX_"]` / `ENV["TELNYX_"]` references. Verify EVERY referenced env var exists in `.env.example` (or equivalent config template). Missing env vars are the #1 cause of "works in dev, fails in prod" bugs.

**Phase 4 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 4 && bash {baseDir}/scripts/migration-state.sh set-commit <project-root> 4`

If validation fails and you cannot fix the issue, document it and continue to the next product. Do not abandon the migration.

### Product-Specific Transform Guidance

**Voice (TeXML path):**
- XML files: Usually no changes needed — `<Response>`, `<Say>`, `<Gather>`, etc. are compatible
- Validate with: `bash {baseDir}/scripts/validate-texml.sh <file>`
- API calls: Change base URL from `api.twilio.com/2010-04-01/Accounts/{SID}` to `api.telnyx.com/v2/texml`
- Auth: Basic Auth → Bearer Token
- Recording: Set `channels="single"` if expecting mono

**Voice (Call Control path):**
- Replace TwiML response generation with Call Control API commands
- Use `client_state` (base64 JSON) for stateless server architecture
- See `{baseDir}/references/voice-migration.md` → "Advanced Voice Patterns"

**Messaging:**
- `body` → `text` parameter name change
- `from_` → `from` (same in most SDKs)
- `StatusCallback` per-message → configure on Messaging Profile
- `MessagingServiceSid` → `messaging_profile_id`
- **Always include `messaging_profile_id`** in send requests — messages without a profile will fail
- Webhook payload: flat `{From, Body}` → nested `{data.payload.from.phone_number, data.payload.text}`
- **10DLC blocker**: US A2P SMS requires 10DLC campaign registration. See `{baseDir}/references/messaging-migration.md` → "10DLC Registration".

**WebRTC:**
- Delete simple dial TwiML endpoints (use `client.newCall()` instead)
- Convert complex TwiML endpoints to TeXML
- Replace Access Token generation with SIP credentials
- Update client SDK: `@twilio/voice-sdk` → `@telnyx/webrtc`
- For native mobile clients (iOS/Android/React Native/Flutter), see `{baseDir}/references/mobile-sdk-migration.md`
- See `{baseDir}/references/webrtc-migration.md` → "TwiML Endpoint Analysis"

**Verify:**
- Verify Service SID → Verify Profile ID
- `channel` → `type` parameter
- `to` → `phone_number`
- Check response: `approved` → `accepted`, `pending` → `rejected`

**Webhook Receivers (all products):**
- **You MUST migrate webhook handlers** — this is half the migration for most apps. See `{baseDir}/references/webhook-migration.md` for complete receive + parse + verify examples in Python (Flask), JavaScript (Express), Ruby (Sinatra), and Go (net/http).
- Parse JSON body instead of form data: `request.json['data']['payload']` not `request.form`
- Access fields via `data.payload.*` — `from` is an object (`from.phone_number`), `to` is an array
- Replace HMAC-SHA1 (`RequestValidator`) with Ed25519 signature verification using `telnyx-signature-ed25519` + `telnyx-timestamp` headers
- **Use the exact signature verification pattern from `webhook-migration.md`** — do NOT use patterns from your own training data. The correct Node.js pattern is `client.webhooks.signature.verifySignature(rawBody, signatureHeader, timestampHeader, publicKey)`, NOT `new TelnyxWebhook()`.

**Error Handling (all products):**
When transforming API calls, always wrap in try/catch with proper error handling. Telnyx errors return `{ "errors": [{ "code": "...", "title": "...", "detail": "..." }] }`. Handle these HTTP status codes:
- **400** — Bad request: check parameter values and format
- **401** — Authentication failed: verify `TELNYX_API_KEY` is set and valid
- **404** — Resource not found: check resource ID (profile, connection, call control ID)
- **422** — Validation error: check field values (e.g., E.164 format, valid profile ID)
- **429** — Rate limited: implement exponential backoff with jitter

See `{baseDir}/references/error-code-mapping.md` for the full Twilio→Telnyx error code mapping and before/after code examples.

---

## Phase 5: Validation

> **Prerequisites**: Phase 4 complete, all product migrations committed.
> **Exit criteria**: `run-validation.sh` exits 0, smoke test passes. Integration tests recommended.

### Step 5.1: Run Full Validation

Run the validation pipeline — this executes migration validation, TeXML validation, and smoke test in one command:

```bash
bash {baseDir}/scripts/run-validation.sh <project-root>
# If the migration includes voice/TeXML with XML files, also run:
bash {baseDir}/scripts/run-validation.sh <project-root> --include-texml
```

**You must run this script.** It checks for: residual Twilio imports, API URLs, env vars, signature patterns, Telnyx SDK presence, Bearer auth, Ed25519 validation code.

**Validation gating rules:**
- **FAIL** (exit code 1) = **CRITICAL** — migration is incomplete. Residual Twilio imports, API URLs, SDK usage, or missing Telnyx SDK. **You MUST fix all FAIL items before proceeding.** Do not proceed to Phase 6 with any FAIL.
- **WARN** (exit code 0) = **informational** — potential issues that may not need fixing (e.g., Twilio string in a comment, docs reference, or test mock). Document WARN items but proceed. The agent should review each WARN to confirm it's not an actual API call missed by pattern matching.
- **PASS** = check passed, no action needed.

**Rule: 0 FAIL items = proceed to Phase 6. 1+ FAIL items = stop and fix.**

### Step 5.2: Integration Tests (Recommended)

Real API calls with small charges (~$0.064 total). **Ask the user for their phone number** (E.164 format, e.g., `+15551234567`) to receive the test SMS/call/OTP.

```bash
export TELNYX_TO_NUMBER="+1XXXXXXXXXX"  # Ask user for this number

# Run whichever tests match the migrated products:
bash {baseDir}/scripts/test-migration/test-messaging.sh --confirm  # ~$0.004
bash {baseDir}/scripts/test-migration/test-voice.sh --confirm      # ~$0.01
bash {baseDir}/scripts/test-migration/test-verify.sh --confirm     # ~$0.05
```

Only `TELNYX_API_KEY` and `TELNYX_TO_NUMBER` are required. All other resources (from number, profiles, connections) are auto-detected or auto-created by the scripts. If the account has no phone numbers, the scripts will purchase one (with `--confirm` gate — cost already approved in Phase 0).

### Step 5.3: Migrate Tests

If the project has unit or integration tests that reference Twilio:
1. Update test imports from Twilio to Telnyx
2. Update mock payloads from Twilio format to Telnyx format (see `{baseDir}/references/webhook-migration.md`)
3. Update assertions for new response field names
4. Run the full test suite: Python: `pytest` | Node: `npm test` | Go: `go test ./...` | Ruby: `bundle exec rspec`

### Step 5.4: Fix and Re-validate

If any check fails, fix the issue, re-run validation, and commit:

```bash
git add <changed-files> && git commit -m "fix: resolve migration validation issues"
bash {baseDir}/scripts/run-validation.sh <project-root>
```

### Resume / Recovery

If the migration is interrupted:
1. Run `bash {baseDir}/scripts/migration-state.sh status <project-root>` to see current phase and completed products
2. Run `bash {baseDir}/scripts/migration-state.sh show <project-root>` for full state including resource IDs
3. Resume from the current phase — resource IDs (messaging_profile_id, connection_id, etc.) are preserved in state
4. Run `bash {baseDir}/scripts/validate-migration.sh <project-root> --json` to check remaining work
5. Validation exit code 0 = migration complete, non-zero = work remaining

---

## Phase 6: Cleanup & Handoff

> **Prerequisites**: Phase 5 validation passes (exit code 0).
> **Exit criteria**: Twilio SDK removed (or retained for hybrid deployment), migration report generated, post-migration checklist presented.

### Step 6.0: Remove Twilio SDK (Conditional)

Check whether any products were kept on Twilio during Phase 1 triage:

```bash
bash {baseDir}/scripts/migration-state.sh show <project-root> | grep kept_on_twilio
```

**If no products kept on Twilio** — remove the Twilio SDK:

Python: `pip uninstall twilio -y` | Node: `npm uninstall twilio` | Ruby: remove `twilio-ruby` from Gemfile + `bundle install` | Go: `go get -u github.com/twilio/twilio-go@none && go mod tidy` | PHP: `composer remove twilio/sdk`

```bash
git add <changed-files> && git commit -m "chore: remove Twilio SDK — migration complete"
```

**If products were kept on Twilio** — do NOT remove the Twilio SDK. This is a hybrid deployment (Telnyx + Twilio). Instead:
1. Keep the Twilio SDK in the dependency manifest
2. Note in the migration report which products remain on Twilio and why
3. Recommend revisiting when Telnyx alternatives become available

```bash
git add <changed-files> && git commit -m "chore: migration complete — hybrid deployment, Twilio SDK retained for kept products"
```

### Step 6.1: Generate Migration Report

```bash
cp {baseDir}/templates/MIGRATION-REPORT.md <project-root>/MIGRATION-REPORT.md
```

Fill in: summary metrics, changes by product, validation results, environment changes, dependency changes, remaining manual steps.

### Step 6.2: Post-Migration Checklist

Present to user:
- [ ] Port numbers via FastPort (see `{baseDir}/references/number-porting.md`)
- [ ] Update webhook URLs in load balancers, DNS, external services
- [ ] Update secrets manager + CI/CD env vars for production
- [ ] Update monitoring alerts for Telnyx error codes/webhook formats
- [ ] Deploy to staging → run e2e tests → deploy to production
- [ ] If hybrid deployment: maintain both Twilio and Telnyx API keys, monitor usage on both platforms, revisit kept products periodically
- [ ] Cancel Twilio account after validation period (skip if hybrid — only cancel when all products are fully migrated)

---

## Scripts Reference

All scripts are in `{baseDir}/scripts/`. Run them — do not substitute your own checks.

**State tracking**: `migration-state.sh init|status|show|set-phase|set|add-product|add-file|set-commit <root> [args]`
**Phase wrappers**: `run-discovery.sh <root>` (Phase 1), `run-validation.sh <root>` (Phase 5)
**Scanners (free)**: `preflight-check.sh [--quick]`, `scan-twilio-usage.sh <root>`, `scan-twilio-deep.py <root>`
**Validators (free)**: `validate-migration.sh <root> [--product X] [--json]`, `validate-texml.sh <file>`
**Tests (free)**: `test-migration/smoke-test.sh`, `test-migration/webhook-receiver.py`, `test-migration/test-webhooks-local.py`
**Tests (paid, --confirm)**: `test-migration/test-voice.sh` (~$0.01), `test-migration/test-messaging.sh` (~$0.004), `test-migration/test-verify.sh` (~$0.05)
