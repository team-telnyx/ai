---
name: telnyx-twilio-migration
description: >-
  Migrate from Twilio to Telnyx. Orchestrates a complete 6-phase migration:
  discovery, planning, setup, code migration, validation, and cleanup.
  Covers voice (TwiML to TeXML, Call Control API), messaging, WebRTC,
  SIP trunking, verify, fax, video, IoT, number lookup, and porting.
  Includes automated scanners, validation scripts, and integration tests.
user_invocable: true
metadata:
  author: telnyx
  product: migration
  compatibility: "Requires bash 4+, jq, curl. macOS ships bash 3.2 — scripts auto-upgrade via Homebrew bash if available (brew install bash)."
---

# Twilio to Telnyx Migration

You MUST follow these phases in order (0 → 1 → 2 → 3 → 4 → 5 → 6). Do NOT skip phases. Each phase has prerequisites and exit criteria — do not proceed until the exit criteria are met. You MUST run the scripts specified in each phase (do not substitute your own checks). You MUST modify the user's source files to complete the migration.

**Interaction model**: Phase 0 collects ALL user input (API key, phone number, cost approval). Phases 1–6 run **fully autonomously** — do NOT ask the user any questions. Make all decisions deterministically using the rules in each phase. The only exception: if a failure persists after 3 fix attempts, present the issue to the user with error details and what you tried.

**Context recovery**: If you lose context (e.g. after compaction), IMMEDIATELY run `bash {baseDir}/scripts/migration-state.sh status <project-root>` and `bash {baseDir}/scripts/migration-state.sh show <project-root>` to recover your current phase and all resource IDs. Then resume from that phase.

### Migration State Tracking

Track progress in `migration-state.json` via `bash {baseDir}/scripts/migration-state.sh <command> <project-root> [args]`. Commands: `init`, `set-phase <N>`, `set <key> <value>`, `add-product <product>`, `add-file <product> <file>`, `set-commit <phase>`, `status`, `show`. This preserves resource IDs across phases and enables resume after interruption. For a complete product mapping, see `{baseDir}/references/product-mapping.md`.

## Universal Changes (All Migrations)

1. **Authentication**: Basic Auth (`AccountSID:AuthToken`) → Bearer Token (`Authorization: Bearer $TELNYX_API_KEY`). Get key at https://portal.telnyx.com/#/app/api-keys
2. **Webhook Signatures**: HMAC-SHA1 → Ed25519. Get public key at https://portal.telnyx.com/#/app/account/public-key
3. **Webhook Payloads**: Flat form-encoded → nested JSON under `data.payload`. See `{baseDir}/references/webhook-migration.md`
4. **Recording Defaults**: Single → dual-channel. Set `channels="single"` to match Twilio behavior.

---

## Phase 0: Prerequisites (User Input — ONLY Interaction Point)

> **This is the ONLY phase that requires user interaction.** Collect all inputs now — Phases 1–6 run fully autonomously. Do not ask the user any further questions during migration unless you hit a failure you cannot resolve after 3 attempts.
>
> **Exit criteria**: `TELNYX_API_KEY` validates, user phone number collected, costs approved.

### Step 0.1: Collect All Required Information

Ask the user for these **three things** in a single message:

1. **`TELNYX_API_KEY`** — API key v2 from https://portal.telnyx.com/#/app/api-keys. If they don't have a Telnyx account yet, direct them to: create account (https://telnyx.com/sign-up), complete KYC, add payment method, then generate key.
2. **`TELNYX_TO_NUMBER`** — their personal phone number in E.164 format (e.g., `+15551234567`) for receiving test SMS/call/OTP during integration testing.
3. **Cost approval** — present this table and get explicit approval:

| Item | Cost | When Charged |
|------|------|-------------|
| Phone number (if account has none) | ~$1.00/month | Phase 5 integration tests |
| Integration tests (SMS + voice + verify + lookup + fax) | ~$0.144 total | Phase 5 |
| 10DLC registration (US A2P messaging only) | ~$19 | Phase 3 setup (only if applicable) |
| Number porting | Free | Post-migration (optional) |

**Total estimated cost for most migrations: under $1.20.** 10DLC adds ~$19 if applicable. Individual paid actions still have `--confirm` gates in the scripts.

**Do not proceed until the user provides all three items.** This is the last time you will ask the user for input.

### Step 0.2: Validate API Key & Initialize State

```bash
bash {baseDir}/scripts/migration-state.sh init <project-root>
export TELNYX_API_KEY="<user-provided-key>"
export TELNYX_TO_NUMBER="<user-provided-number>"
curl -s -H "Authorization: Bearer $TELNYX_API_KEY" https://api.telnyx.com/v2/balance
```

If validation fails, ask the user to check their key and try again. This is the only retry that requires user input.

**Phase 0 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 0`

---

## Phase 1: Discovery

> **Prerequisites**: Phase 0 complete (`TELNYX_API_KEY` valid, phone number collected, costs approved).
> **Exit criteria**: `twilio-scan.json` exists with scan results, migration scope determined.

### Step 1.1: Run Full Discovery

Run the discovery script — this executes preflight check, Twilio scan, deep scan, and partial migration check in one command:

```bash
bash {baseDir}/scripts/run-discovery.sh <project-root>
```

This produces `<project-root>/twilio-scan.json` (and optionally `twilio-deep-scan.json`).

**You must run this script.** Do not manually scan files or skip this step.

### Step 1.2: Triage and Determine Scope (Autonomous)

Review scan results and classify each match:
- **Active import/SDK call** (e.g., `from twilio.rest import Client`, `client.messages.create()`): Needs migration
- **String reference** (e.g., `# formerly used Twilio`, URL in docs, log message): Usually no code change needed — just update text
- **Config/env var** (e.g., `TWILIO_ACCOUNT_SID`): Needs env var rename (see Phase 3)
- **Test mock** (e.g., `mock_twilio_response`): Migrate in Phase 4 alongside product code

**Do NOT ask the user to confirm scope.** Migrate ALL detected Twilio products. Apply these rules automatically:

- **Supported products** (voice, messaging, verify, webrtc, sip, fax, video, lookup, numbers, porting): migrate
- **Unsupported products** (Flex, Studio, TaskRouter, Conversations, Sync, Notify, Proxy, Pay, Autopilot): automatically keep on Twilio — record in state and continue:

```bash
# Automatically record each unsupported product as kept on Twilio:
bash {baseDir}/scripts/migration-state.sh set <project-root> kept_on_twilio.<product> true
```

See `{baseDir}/references/unsupported-products.md` for alternatives to note in the migration report.

**Mobile platforms** (detected and guided): iOS native, Android native, React Native, Flutter. These require client-side SDK migration — see `{baseDir}/references/mobile-sdk-migration.md` for complete migration guides.

**Phase 1 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 1 && bash {baseDir}/scripts/migration-state.sh set <project-root> scan_file "twilio-scan.json"`

---

## Phase 2: Planning

> **Prerequisites**: Phase 1 complete, `twilio-scan.json` exists, scope determined.
> **Exit criteria**: `MIGRATION-PLAN.md` exists in project root.

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

### Step 2.2: Apply Decision Matrix (Autonomous)

**Do NOT ask the user to choose.** Apply these rules deterministically:

**Voice approach** — select automatically based on the codebase:

| If the codebase has... | Use... |
|---|---|
| TwiML/XML files, `VoiceResponse()` builders, simple IVR (Say, Gather, Dial, Record) | **TeXML** (minimal code changes, nearly 1:1) |
| Media streaming, real-time audio forking, `<Stream>` elements | **Call Control** (event-driven API) |
| Both patterns | **Both** — TeXML for inbound (webhook returns XML), Call Control for outbound |

**Migration strategy** — select automatically:

| If... | Use... |
|---|---|
| ≤10 files with Twilio code, single product | **Big-bang** (all at once) |
| >10 files or multiple products | **Incremental** — order: messaging → voice → verify → webhooks → other |

### Step 2.3: Generate Migration Plan

```bash
cp {baseDir}/templates/MIGRATION-PLAN.md <project-root>/MIGRATION-PLAN.md
```

Populate the plan based on the decisions above. Do not ask for user approval — proceed directly to Phase 3.

**Phase 2 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 2`

---

## Phase 3: Setup

> **Prerequisites**: Phase 2 complete, `MIGRATION-PLAN.md` exists.
> **Exit criteria**: Telnyx SDK installed, environment variables updated, setup committed to git.

### Step 3.1: Create Migration Branch

```bash
cd <project-root> && git checkout -b migrate/twilio-to-telnyx
```

### Step 3.2: Install Telnyx SDK (Keep Twilio Until Phase 6)

Install Telnyx SDK **alongside** Twilio — do NOT remove Twilio from the package manifest yet (removal is Phase 6). Keep `twilio` in `requirements.txt`/`package.json`/`Gemfile`/`go.mod` until Phase 6 so you can revert if validation fails.

**Server SDKs** — use these EXACT commands with version constraints (do NOT use `pip install telnyx` or `npm install telnyx` without a version range):
- Python: `pip install 'telnyx>=4.0,<5.0'` — and write `telnyx>=4.0,<5.0` in `requirements.txt` (NOT just `telnyx`). Initialize with `from telnyx import Telnyx; client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))`.
- Node: `npm install telnyx@^6` — writes `"telnyx": "^6.x.x"` in `package.json` automatically. Initialize with `const Telnyx = require('telnyx'); const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });` (CJS) or `import Telnyx from 'telnyx'` (ESM).
- Ruby: `gem 'telnyx', '~> 5.0'` in Gemfile + `bundle install`
- Go: `go get github.com/team-telnyx/telnyx-go`
- Java/PHP/C#: No official SDK — use REST API with `{baseDir}/sdk-reference/curl/` for API examples

**Client-side WebRTC SDK** (if WebRTC detected): `npm install @telnyx/webrtc` — see `{baseDir}/sdk-reference/webrtc-client/javascript.md` for the full API reference

**Supported languages**: Python, JavaScript/TypeScript, Go, Ruby have full SDKs with reference docs in `{baseDir}/sdk-reference/{lang}/`. Java, PHP, C#/.NET use REST/curl only via `{baseDir}/sdk-reference/curl/`. Client-side WebRTC SDKs exist for Swift (iOS), Kotlin (Android), React Native, Flutter — see `{baseDir}/references/mobile-sdk-migration.md`.

> **JavaScript module warning**: The `sdk-reference/javascript/` files use ESM syntax (`import Telnyx from 'telnyx'`). If the project uses CommonJS (`require`), translate to: `const Telnyx = require('telnyx'); const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });`. Do NOT copy ESM imports into CJS files unless `"type": "module"` is in `package.json`.

### Step 3.3: Update Environment Variables

| Twilio Variable | Telnyx Replacement | Notes |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `TELNYX_API_KEY` | Bearer token, get from portal |
| `TWILIO_AUTH_TOKEN` | `TELNYX_PUBLIC_KEY` | For webhook validation (Ed25519) |
| `TWILIO_API_KEY` / `_SECRET` / `_SID` | — | Not needed (single API key model) |
| `TWILIO_PHONE_NUMBER` | `TELNYX_PHONE_NUMBER` | Your Telnyx number (E.164) |
| `TWILIO_MESSAGING_SERVICE_SID` | `TELNYX_MESSAGING_PROFILE_ID` | Messaging profile UUID |
| `TWILIO_VERIFY_SERVICE_SID` | `TELNYX_VERIFY_PROFILE_ID` | Verify profile UUID |
| *(voice/SIP/WebRTC)* | `TELNYX_CONNECTION_ID` | The connection or application ID used for outbound calls. The value depends on your voice approach — see disambiguation below. |

> **`TELNYX_CONNECTION_ID` disambiguation** — all three are different Telnyx resources:
> - **TeXML**: This is a **TeXML Application ID** from `POST /v2/texml_applications`. It owns your webhook URLs and outbound calling config.
> - **Call Control**: This is a **Call Control Application ID** from `POST /v2/call_control_applications`. It routes inbound call events to your webhook.
> - **SIP trunking**: This is a **SIP Connection ID** from `POST /v2/credential_connections` or `POST /v2/ip_connections`. It's used for PBX/SBC trunking.
>
> Use a single `TELNYX_CONNECTION_ID` env var — its value is whichever ID matches your voice approach. If the app uses multiple approaches (e.g., TeXML for inbound + SIP for trunking), use separate env vars with descriptive names like `TELNYX_TEXML_APP_ID` and `TELNYX_SIP_CONNECTION_ID`.

Update `.env`, `.env.example`, secrets manager, CI/CD variables, and deployment configs. **Ensure every env var used in the migrated code is present in `.env.example`** — missing env vars are a top cause of runtime failures.

> **Whitelisted destinations (CRITICAL):** When creating or reusing Telnyx resources, you MUST ensure `whitelisted_destinations` includes the target country. Without this, sends/calls will fail silently or with cryptic errors.
> - **Messaging profiles**: `whitelisted_destinations` on the profile itself. Use `["*"]` for all countries or specify e.g. `["US", "GB", "IE"]`. Check existing profiles via `GET /v2/messaging_profiles/{id}` and update with `PATCH` if needed.
> - **Outbound Voice Profiles (OVP)**: `whitelisted_destinations` controls which countries you can call. Create/update OVP via `/v2/outbound_voice_profiles`. Assign the OVP to your Call Control app or TeXML app's `outbound.outbound_voice_profile_id`.
> - **Verify profiles**: `sms.whitelisted_destinations` inside the SMS channel config. Check existing profiles via `GET /v2/verify_profiles/{id}`.
> - The test scripts (`test-messaging.sh`, `test-voice.sh`, `test-verify.sh`) handle this automatically, but when writing migration code, always set `whitelisted_destinations` explicitly.

> **Rate limits**: Messaging: 1 msg/sec per number (10DLC), voice: varies by connection type. Implement exponential backoff for 429 responses.

### Step 3.4: Commit Setup Changes

```bash
git add <changed-files> && git commit -m "chore: add Telnyx SDK alongside Twilio, update env vars"
bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 3
bash {baseDir}/scripts/migration-state.sh set-commit <project-root> 3
```

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

**After all source files in the product area:**

7. **Migrate tests**: Find ALL test files for this product — `grep -rl -i "twilio\|TwilioVoice\|TwilioClient\|twilio_" *test* *Test* *spec* *Spec* 2>/dev/null`. Migrate every one: update imports, mock objects, mock payloads, assertions, and type references. Do NOT defer test files as "remaining manual steps" — they are part of the migration. Run the test suite to confirm.
8. **Lint**: `bash {baseDir}/scripts/lint-telnyx-correctness.sh <project-root> --product {product}` — catches common anti-patterns (wrong method names, wrong parameter names, missing profile IDs). Fix all ISSUE items before proceeding.
9. **Validate**: `bash {baseDir}/scripts/validate-migration.sh <project-root> --product {product} --scan-json <project-root>/twilio-scan.json`
10. **Fix** any validation failures or lint issues, re-run until both exit code 0
11. **Commit**: `git add <changed-files> && git commit -m "migrate: {product} — Twilio to Telnyx"`
12. **Track**: `bash {baseDir}/scripts/migration-state.sh add-product <project-root> {product}` (and `add-file` for each file migrated)

**After ALL product areas are migrated:**

13. **Env var audit**: Grep all migrated source files for `process.env.TELNYX_` / `os.environ["TELNYX_"]` / `ENV["TELNYX_"]` references. Verify EVERY referenced env var exists in `.env.example` (or equivalent config template). Missing env vars are the #1 cause of "works in dev, fails in prod" bugs.

### Post-Migration Documentation Update (MANDATORY)

After ALL product areas are migrated and committed, you MUST update documentation. This is NOT optional — agents that skip this step produce incomplete migrations.

1. **Find all docs**: `grep -rl -i "twilio" README.md README CONTRIBUTING.md docs/ *.md 2>/dev/null` (in project root)
2. **Update each file** — replace ALL of the following:
   - Project description: "uses Twilio" → "uses Telnyx"
   - Account setup instructions: Twilio Console → Telnyx Mission Control Portal (portal.telnyx.com)
   - API key generation: "Twilio Account SID and Auth Token" → "Telnyx API Key v2 from portal.telnyx.com/#/app/api-keys"
   - Environment variable names: every `TWILIO_*` → its `TELNYX_*` equivalent (see Phase 3 env var table)
   - API endpoint URLs: `api.twilio.com` → `api.telnyx.com/v2`
   - SDK install commands: `pip install twilio` → `pip install 'telnyx>=4.0,<5.0'`, `npm install twilio` → `npm install telnyx@^6`, etc.
   - Webhook setup instructions: update signature verification method
   - Badge URLs, status page links, support links
3. **Commit**: `git add <doc-files> && git commit -m "docs: update all documentation from Twilio to Telnyx"`

**Phase 4 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 4 && bash {baseDir}/scripts/migration-state.sh set-commit <project-root> 4`

If validation fails and you cannot fix the issue, document it and continue to the next product. Do not abandon the migration.

### Product-Specific Transform Guidance

**Voice (TeXML path):**
- **Static XML files**: Usually no changes needed — `<Response>`, `<Say>`, `<Gather>`, etc. are compatible
- **Dynamic XML (TwiML builder replacement)**: If the original code uses `VoiceResponse()` (Python) or `new twilio.twiml.VoiceResponse()` (Node) to build XML programmatically, replace with XML string templates. Telnyx has no builder class — return raw XML strings from your webhook endpoints. For dynamic content, use f-strings (Python) or template literals (JavaScript) with proper XML escaping (replace `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`, `"` with `&quot;` in user-provided values). See `{baseDir}/references/voice-migration.md` → "TwiML builder classes → raw XML strings" for complete before/after examples in Python and JavaScript. Do NOT install third-party XML builder libraries — raw strings are sufficient and avoid adding dependencies.
- Validate with: `bash {baseDir}/scripts/validate-texml.sh <file>`
- API calls: Change base URL from `api.twilio.com/2010-04-01/Accounts/{SID}` to `api.telnyx.com/v2/texml`
- Auth: Basic Auth → Bearer Token
- Recording: Set `channels="single"` if expecting mono
- **`speechModel` does NOT exist in TeXML** — remove it or replace with `transcriptionEngine` (e.g., `transcriptionEngine="Google"`). Using `speechModel` will be silently ignored.
- **Polly voices**: TeXML supports `voice="Polly.{VoiceId}"` and `voice="Polly.{VoiceId}-Neural"`. Always prefer Neural variants (e.g., `Polly.Amy-Neural` instead of `Polly.Amy`) — non-Neural voices may silently fall back to the default voice. If a specific Polly voice is unavailable, use `voice="woman"` with the appropriate `language` attribute.
- **Outbound calls**: Use the Telnyx SDK — do NOT use raw `fetch()` to the TeXML API. The SDK handles auth, retries, and response parsing. Pass the **TeXML Application ID** (from `TELNYX_CONNECTION_ID`, NOT a SIP connection ID) as the `connection_id` parameter. See `{baseDir}/sdk-reference/{language}/texml.md` for the exact method signature.

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
- **Client-side files**: Migrate browser JavaScript/HTML files that import `Twilio.Device`, `@twilio/voice-sdk`, or `twilio-client`. These are in frontend directories (e.g., `public/`, `src/`, `static/`, CDN `<script>` tags in HTML). Replace with `TelnyxRTC` — see `{baseDir}/sdk-reference/webrtc-client/javascript.md` for the full client API.
- **Mobile platforms**: Migrate `.swift`, `.kt`, `.java`, `.dart`, `.tsx` files that import Twilio mobile SDKs. Update `Podfile` (iOS), `build.gradle` (Android), `pubspec.yaml` (Flutter) dependencies. See `{baseDir}/references/mobile-sdk-migration.md`
- See `{baseDir}/references/webrtc-migration.md` → "TwiML Endpoint Analysis"

**Verify:**
- Verify Service SID → Verify Profile ID
- `channel` → `type` parameter
- `to` → `phone_number`
- Check response status mapping (when verifying a code): Twilio `approved` → Telnyx `accepted` (code correct), Twilio `pending` (code incorrect) → Telnyx `rejected` (code incorrect). Note: both platforms use `pending` when a verification is *created* (OTP sent, waiting for code) — the mapping above applies only to the code *check* response.

**Webhook Receivers (all products):**
- **You MUST migrate webhook handlers** — this is half the migration for most apps. See `{baseDir}/references/webhook-migration.md` for complete receive + parse + verify examples in Python (Flask, Django), JavaScript (Express), Ruby (Sinatra, **Rails**), and Go (net/http).
- Parse JSON body instead of form data: `request.json['data']['payload']` not `request.form`
- Access fields via `data.payload.*` — `from` is an object (`from.phone_number`), `to` is an array
- Replace HMAC-SHA1 (`RequestValidator`) with Ed25519 signature verification using `telnyx-signature-ed25519` + `telnyx-timestamp` headers
- **If the original code used `twilio.webhook()` middleware**, check the `validate` option:
  - If `validate: false` (or `enforce_https=False` in Python) was set, the middleware was a **no-op** — it performed no validation. Remove it entirely. Do NOT add Ed25519 verification (the original app intentionally skipped validation, so adding it would change behavior and risk breaking the app if misconfigured).
  - If `validate: true` (or no `validate` option, since `true` is the default), replace it with Telnyx Ed25519 verification. Do NOT just delete it — removing real webhook validation leaves endpoints unprotected in production.
- **Rails `before_action`**: If the original code used a Twilio `before_action` filter (e.g., `before_action :validate_twilio_request`), replace it with a Telnyx Ed25519 `before_action`. Also add `skip_before_action :verify_authenticity_token` since webhooks don't carry CSRF tokens. See `{baseDir}/references/webhook-migration.md` → "Rails" for the complete pattern.
- **Use the exact signature verification pattern from `webhook-migration.md`** — do NOT use patterns from your own training data. Do NOT use `new TelnyxWebhook()`.

> **CRITICAL (Express/Node.js only):** Webhook signature verification requires the **raw request body** (original bytes), NOT `JSON.stringify(req.body)`. You MUST add the `verify` callback to `express.json()` in your main app file AND use `req.rawBody` in your verification middleware:
>
> ```javascript
> // In index.js / app.js — capture raw body:
> app.use(express.json({
>   verify: (req, res, buf) => { req.rawBody = buf.toString('utf-8'); }
> }));
>
> // In webhook handler — verify with raw body:
> const event = await client.webhooks.unwrap(
>   req.rawBody,  // NOT JSON.stringify(req.body)
>   { headers: req.headers, key: process.env.TELNYX_PUBLIC_KEY }
> );
> ```
> Failing to use raw body means signatures will fail in production when JSON key order or whitespace differs from the original payload.

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

> **Prerequisites**: Phase 4 complete, all product migrations committed, `TELNYX_API_KEY` set, account has credit.
> **Exit criteria**: `run-validation.sh` exits 0, `lint-telnyx-correctness.sh` exits 0, integration tests pass.

### Step 5.1: Run Full Validation

Run the validation pipeline — this executes migration validation, TeXML validation, and smoke test in one command:

```bash
bash {baseDir}/scripts/run-validation.sh <project-root>
# If the migration includes voice/TeXML with XML files, also run:
bash {baseDir}/scripts/run-validation.sh <project-root> --include-texml
```

**You must run this script.** It checks for: residual Twilio imports, API URLs, env vars, signature patterns, Telnyx SDK presence, Bearer auth, Ed25519 validation code.

Also run the correctness linter across all products:
```bash
bash {baseDir}/scripts/lint-telnyx-correctness.sh <project-root>
```

**Gating rules:**
- **FAIL/ISSUE** (exit code 1) = **CRITICAL** — must fix before proceeding to Phase 6.
- **WARN** (exit code 0) = **informational** — review each WARN to confirm it's not a missed API call, document and proceed.
- **PASS** = check passed.

**Rule: 0 FAIL + 0 ISSUE = proceed to Phase 6.**

### Step 5.2: Integration Tests

Real API calls with small charges (~$0.144 total, already approved in Phase 0). The phone number was collected in Phase 0.

```bash
# TELNYX_TO_NUMBER was set in Phase 0 — do not ask again

# Run whichever tests match the migrated products:
bash {baseDir}/scripts/test-migration/test-messaging.sh --confirm  # ~$0.004
bash {baseDir}/scripts/test-migration/test-voice.sh --confirm      # ~$0.01
bash {baseDir}/scripts/test-migration/test-verify.sh --confirm --send-only  # ~$0.05
bash {baseDir}/scripts/test-migration/test-lookup.sh --confirm     # ~$0.01
bash {baseDir}/scripts/test-migration/test-fax.sh --confirm        # ~$0.07 (requires fax-capable destination)
bash {baseDir}/scripts/test-migration/test-sip.sh --confirm        # free (validates SIP trunking setup)
bash {baseDir}/scripts/test-migration/test-webrtc.sh --confirm     # free (credentials/tokens) + ~$0.01 live call if TELNYX_TO_NUMBER set
```

Only `TELNYX_API_KEY` and `TELNYX_TO_NUMBER` are required. All other resources (from number, profiles, connections) are auto-detected or auto-created by the scripts. If the account has no phone numbers, the scripts will purchase one (with `--confirm` gate — cost already approved in Phase 0).

**WebRTC projects**: Always run `test-webrtc.sh` with `TELNYX_TO_NUMBER` set — this enables the live call test that verifies end-to-end connectivity (your phone should ring). Without it, the test only validates credential/token generation but not actual calling.

### Step 5.3: Fix and Re-validate (Structured Retry)

If any validation, lint, or integration test fails:

1. **Diagnose**: Read the error message and identify which check failed
2. **Consult reference**: Look up the correct pattern in `{baseDir}/sdk-reference/{language}/{product}.md` or the relevant `{baseDir}/references/{product}-migration.md`
3. **Fix**: Apply the correction to the source file
4. **Re-run**: Run the failing check again
5. **Retry limit**: If the same check fails 3 times, stop and present the issue to the user with the error details and what you've tried. Do not loop indefinitely.

```bash
git add <changed-files> && git commit -m "fix: resolve migration validation issues"
bash {baseDir}/scripts/run-validation.sh <project-root>
bash {baseDir}/scripts/lint-telnyx-correctness.sh <project-root>
```

**Phase 5 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 5 && bash {baseDir}/scripts/migration-state.sh set-commit <project-root> 5`

---

## Resume / Recovery

If the migration is interrupted: run `bash {baseDir}/scripts/migration-state.sh status <project-root>` to see current phase, then `show` for full state including resource IDs. Resume from the current phase — all resource IDs are preserved. Run `bash {baseDir}/scripts/validate-migration.sh <project-root> --json` to check remaining work (exit 0 = complete).

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

### Step 6.1: Generate Migration Report & Present Checklist

```bash
cp {baseDir}/templates/MIGRATION-REPORT.md <project-root>/MIGRATION-REPORT.md
```

Fill in: summary metrics, changes by product, validation results, environment changes, dependency changes. Then present the post-migration checklist to the user:

- [ ] Port numbers via FastPort (see `{baseDir}/references/number-porting.md`)
- [ ] Update webhook URLs in load balancers, DNS, external services
- [ ] Update secrets manager + CI/CD env vars for production
- [ ] Update monitoring alerts for Telnyx error codes/webhook formats
- [ ] Deploy to staging → run e2e tests → deploy to production
- [ ] If hybrid: maintain both API keys, monitor both platforms, revisit kept products
- [ ] Cancel Twilio account after validation period (skip if hybrid)

**Phase 6 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 6 && bash {baseDir}/scripts/migration-state.sh set-commit <project-root> 6`

---

## Scripts Reference

All scripts are in `{baseDir}/scripts/`. Run them — do not substitute your own checks.

**State tracking**: `migration-state.sh init|status|show|set-phase|set|add-product|add-file|set-commit <root> [args]`
**Phase wrappers**: `run-discovery.sh <root>` (Phase 1), `run-validation.sh <root>` (Phase 5)
**Scanners (free)**: `preflight-check.sh [--quick]`, `scan-twilio-usage.sh <root>`, `scan-twilio-deep.py <root>`
**Validators (free)**: `validate-migration.sh <root> [--product X] [--json] [--exclude-dir D] [--scan-json F] [--state-file <path>]`, `validate-texml.sh <file>`, `lint-telnyx-correctness.sh <root> [--product X] [--json]`
**Tests (free)**: `test-migration/smoke-test.sh`, `test-migration/webhook-receiver.py`, `test-migration/test-webhooks-local.py`
**Tests (paid, --confirm)**: `test-migration/test-voice.sh` (~$0.01), `test-migration/test-messaging.sh` (~$0.004), `test-migration/test-verify.sh` (~$0.05), `test-migration/test-lookup.sh` (~$0.01), `test-migration/test-fax.sh` (~$0.07)
**Tests (free, --confirm)**: `test-migration/test-sip.sh` (SIP trunking setup), `test-migration/test-webrtc.sh` (WebRTC credentials/tokens)
