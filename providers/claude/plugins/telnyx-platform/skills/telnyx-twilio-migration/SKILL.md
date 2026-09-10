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
  compatibility: "Requires bash 4+, Python 3.10+, jq, curl. macOS ships bash 3.2 — scripts auto-upgrade via Homebrew bash if available (brew install bash)."
---

# Twilio to Telnyx Migration

> **Path convention:** `{baseDir}` in this document is the directory containing this `SKILL.md` file (e.g., `/path/to/skills/telnyx-twilio-migration`). Substitute the absolute path before running any script shown below — do not pass the literal string `{baseDir}` to bash.

You MUST follow these phases in order (0 → 1 → 2 → 3 → 4 → 5 → 6). Do NOT skip phases. Each phase has prerequisites and exit criteria — do not proceed until the exit criteria are met. You MUST run the scripts specified in each phase (do not substitute your own checks). You MUST modify the user's source files to complete the migration.

**Interaction model**: Phase 0 collects confirmation that `TELNYX_API_KEY` is set securely, the destinations required by the products in scope, an ISO-2 country for each destination (or explicit opt-in to a billed lookup), and an approved maximum spend based on a current price check. A live WebRTC-to-PSTN call requires its own opt-in. Never ask the user to paste an API key into chat. Phases 1–6 run autonomously except for one scoped Phase-1 decision if discovery finds unsupported products, a new or increased paid-action approval, and a failure that persists after 3 fix attempts.

**Context recovery**: If you lose context (e.g. after compaction), IMMEDIATELY run `bash {baseDir}/scripts/migration-state.sh status <project-root>` and `bash {baseDir}/scripts/migration-state.sh show <project-root>` to recover your current phase and all resource IDs. Then resume from that phase.

### Migration State Tracking

Track progress in `migration-state.json` via `bash {baseDir}/scripts/migration-state.sh <command> <project-root> [args]`. Commands: `init`, `set-phase <N>`, `set <key> <value>`, `add-product <product>`, `add-file <product> <file>`, `set-commit <phase>`, `status`, `show`. This preserves resource IDs across phases and enables resume after interruption. For a complete product mapping, see `{baseDir}/references/product-mapping.md`.

## Universal Changes (All Migrations)

1. **Authentication**: Basic Auth (`AccountSID:AuthToken`) → Bearer Token (`Authorization: Bearer $TELNYX_API_KEY`). Get key at https://portal.telnyx.com/#/app/api-keys
2. **Webhook Signatures**: HMAC-SHA1 → Ed25519. Get public key at https://portal.telnyx.com/#/app/account/public-key
3. **Webhook Payloads**: Messaging and Call Control move from flat form data to nested JSON under `data.payload`; TeXML callbacks remain form-encoded. See `{baseDir}/references/webhook-migration.md`.
4. **Recording Defaults**: TeXML `<Record>` defaults to dual-channel. Set `channels="single"` when the Twilio flow expects mono. `<Dial recordingChannels>` defaults to `single` and `recordMaxLength` defaults to `0`, as documented in the [Telnyx `<Dial>` reference](https://developers.telnyx.com/docs/voice/programmable-voice/texml-verbs/dial).

---

## Phase 0: Prerequisites (Primary User-Input Phase)

> **This is the primary input phase.** Collect prerequisites now. Later interaction is limited to the bundled unsupported-product decision, approval for a new or increased paid action, or a failure that persists after 3 attempts.
>
> **Exit criteria**: `TELNYX_API_KEY` validates; every applicable product destination and its ISO-2 country (or billed-lookup opt-in) are recorded; current prices were checked; the user approved a maximum total charge and currency for the paid tests in scope; and the WebRTC live-call choice is recorded separately.

### Step 0.1: Collect All Required Information

Ask the user for these **five things** in a single message:

1. **Secure API-key setup confirmation** — ask them to set `TELNYX_API_KEY` in their own local environment or secret store and reply only when it is present. Never request, display, log, or repeat the key value. If they do not have an account, direct them to https://telnyx.com/sign-up and https://portal.telnyx.com/#/app/api-keys. KYC and a payment method may still be required before paid capabilities.
2. **Product-specific destinations** — collect E.164 values only for products that will be tested:
   - `TELNYX_TO_NUMBER` for messaging, voice, Verify, and an optional WebRTC live call.
   - `TELNYX_FAX_TO` as a distinct, confirmed fax-capable destination when fax is in scope. Never assume the common SMS/voice test number receives faxes.
   - `TELNYX_LOOKUP_NUMBER` only when Number Lookup should target a different number; otherwise the lookup script falls back to `TELNYX_TO_NUMBER`.
3. **Country resolution** — collect the destination's ISO 3166-1 alpha-2 code alongside every destination. The scripts use `TELNYX_TO_COUNTRY`, so export the code that matches the destination immediately before each test. If the user cannot provide it, obtain explicit approval for the billed Number Lookup and set `TELNYX_ALLOW_COUNTRY_LOOKUP=yes`; count that lookup against the approved maximum. Dry runs never perform this lookup implicitly.
4. **Paid-test approval** — check the [current Telnyx pricing](https://telnyx.com/pricing/) for each exact product, destination, routing type, and account-specific rate before quoting a test. Present the estimated charge for each paid action and a maximum total charge with its currency, then obtain explicit approval for that maximum. Price strings printed by test scripts are non-binding examples, not quotes; `--confirm` is an execution guard and does not replace the price check or spend approval. If a current price is unavailable or the possible charge cannot be bounded, do not run the paid action. Phone-number purchase, 10DLC registration/vetting, and porting are separate workflows that require their own current quote and explicit approval; Phase 5 tests never purchase persistent numbers.
5. **WebRTC live-call decision** — the default WebRTC test validates credentials and token issuance without placing a PSTN call. A live call is a separate paid action: check its current price, obtain explicit approval under the maximum spend, and set `TELNYX_WEBRTC_LIVE_CALL=yes` only when the user opts in.

**Do not proceed until the user confirms every applicable item.** If unsupported products are discovered later, use the one scoped Phase-1 decision described below. If later discovery adds a paid product or changes the quoted maximum, stop and obtain an updated approval before that action.

### Step 0.2: Validate API Key & Initialize State

```bash
bash {baseDir}/scripts/migration-state.sh init <project-root>
test -n "${TELNYX_API_KEY:-}" || { echo "Set TELNYX_API_KEY securely in your local environment" >&2; exit 1; }
# Record the non-secret approval boundary for recovery/audit; use the exact values the user approved.
bash {baseDir}/scripts/migration-state.sh set <project-root> approvals.paid_test_scope "<product-list>"
bash {baseDir}/scripts/migration-state.sh set <project-root> approvals.maximum_charge "<amount>"
bash {baseDir}/scripts/migration-state.sh set <project-root> approvals.currency "<ISO-4217-code>"
bash {baseDir}/scripts/migration-state.sh set <project-root> approvals.webrtc_live_call "<true-or-false>"
export TELNYX_TO_NUMBER="<user-provided-number>"
# Before each destination-scoped test, set the ISO-2 code that matches that test's destination:
export TELNYX_TO_COUNTRY="US"
# Set only when the corresponding product/destination is in scope:
export TELNYX_FAX_TO="<user-provided-fax-capable-number>"
export TELNYX_LOOKUP_NUMBER="<user-provided-lookup-number>"
# Set only after the separate approvals described above:
# export TELNYX_ALLOW_COUNTRY_LOOKUP=yes
# export TELNYX_WEBRTC_LIVE_CALL=yes
curl -s -H "Authorization: Bearer $TELNYX_API_KEY" https://api.telnyx.com/v2/balance
```

If validation fails, ask the user to check their key and try again. This is the only retry that requires user input.

**Phase 0 exit**: `bash {baseDir}/scripts/migration-state.sh set-phase <project-root> 0`

---

## Phase 1: Discovery

> **Prerequisites**: Phase 0 complete (`TELNYX_API_KEY` valid; applicable destinations and country-resolution choices recorded; current-price estimates and a maximum spend approved; WebRTC live-call choice recorded).
> **Exit criteria**: `twilio-scan.json` exists with scan results, migration scope determined.

### Step 1.1: Run Full Discovery

Run the discovery script — this executes preflight check, Twilio scan, deep scan, and partial migration check in one command:

```bash
bash {baseDir}/scripts/run-discovery.sh <project-root>
```

This produces `<project-root>/twilio-scan.json` (and optionally `twilio-deep-scan.json`).

**You must run this script.** Do not manually scan files or skip this step.

### Step 1.2: Triage and Determine Scope

Review scan results and classify each match:
- **Active import/SDK call** (e.g., `from twilio.rest import Client`, `client.messages.create()`): Needs migration
- **String reference** (e.g., `# formerly used Twilio`, URL in docs, log message): Usually no code change needed — just update text
- **Config/env var** (e.g., `TWILIO_ACCOUNT_SID`): Needs env var rename (see Phase 3)
- **Test mock** (e.g., `mock_twilio_response`): Migrate in Phase 4 alongside product code

Migrate all detected supported Twilio products. Apply these rules:

- **Supported products** (voice, messaging, verify, webrtc, sip, fax, video, lookup, numbers, porting, pay): migrate — `<Pay>` is implemented by the TeXML runtime and has a dedicated public verb reference (see `references/texml-verbs.md`); never drop or externalize in-call payment flows
- **Unsupported products** (Flex, Studio, TaskRouter, Conversations, Sync, Notify, Proxy, Autopilot): present all detected products and the alternatives from `references/unsupported-products.md` in one bundled decision. Ask whether each should be kept on Twilio, replaced, or removed. Do not modify or remove unsupported-product code before that answer. Record each decision in state, for example:

```bash
# Example after the user chooses to keep a product on Twilio:
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

Install Telnyx SDK **alongside** Twilio — do NOT remove Twilio from the package manifest yet (removal is Phase 6). Keep `twilio` in `requirements.txt`/`package.json`/`Gemfile`/`go.mod`, or `com.twilio.sdk:twilio` in `pom.xml`/`build.gradle`, until Phase 6 so you can revert if validation fails.

**Server SDKs** — use these EXACT commands with version constraints (do NOT use `pip install telnyx` or `npm install telnyx` without a version range):
- Python: `pip install 'telnyx>=4.0,<5.0'` — and write `telnyx>=4.0,<5.0` in `requirements.txt` (NOT just `telnyx`). Initialize with `from telnyx import Telnyx; client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))`.
- Node: `npm install telnyx@^6 ws@^8` — writes `"telnyx": "^6.x.x"` in `package.json` automatically. Initialize with `const Telnyx = require('telnyx'); const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });` (CJS) or `import Telnyx from 'telnyx'` (ESM).
  - **`ws` is required.** `telnyx@6` declares `ws` as an *optional* peer dependency (npm 10 skips optional peers), but `resources/index.js` unconditionally loads text-to-speech → `require('ws')`. Installing `telnyx@^6` alone therefore produces an SDK that throws `Error: Cannot find module 'ws'` on the very first `require('telnyx')`. Always install `ws` alongside it.
- Ruby: `gem 'telnyx', '~> 5.0'` in Gemfile + `bundle install`
- Go: `go get github.com/team-telnyx/telnyx-go/v4`
- Java: Use the official Telnyx Java SDK. Read `{baseDir}/sdk-reference/java/{product}.md` for the pinned Maven/Gradle dependency and exact SDK examples.
- PHP: An official SDK is available, but this skill does not yet bundle PHP reference examples. Use the official SDK documentation or the REST examples in `{baseDir}/sdk-reference/curl/`.
- C#/.NET: No official server SDK is currently listed — use REST API with `{baseDir}/sdk-reference/curl/` for API examples

**Client-side WebRTC SDK** (if WebRTC detected): `npm install @telnyx/webrtc` — see `{baseDir}/sdk-reference/webrtc-client/javascript.md` for the full API reference

**Bundled language references**: Python, JavaScript/TypeScript, Go, Ruby, and Java have full SDK examples in `{baseDir}/sdk-reference/{lang}/`. PHP uses the official SDK documentation or `{baseDir}/sdk-reference/curl/`; C#/.NET uses REST/curl. Client-side WebRTC SDKs exist for Swift (iOS), Kotlin (Android), React Native, and Flutter — see `{baseDir}/references/mobile-sdk-migration.md`.

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

> **Destination allowlists (CRITICAL):** Determine the target countries as ISO 3166-1 alpha-2 codes before creating Telnyx resources. Use explicit countries by default; use `["*"]` only after an explicit decision to allow every destination. Without the correct allowlist, sends and calls fail.
> - **Messaging profiles**: set `whitelisted_destinations` on the profile itself.
> - **Outbound Voice Profiles (OVP)**: set `whitelisted_destinations`, then assign the OVP to the Call Control or TeXML application's `outbound.outbound_voice_profile_id`.
> - **Verify profiles**: set `sms.whitelisted_destinations` inside the SMS channel configuration.
> - **New run-owned resources**: create them with only the destinations needed for the test or migration.
> - **Existing resources**: inspect only. Never expand a Messaging Profile, OVP, or Verify Profile allowlist without an explicit opt-in naming the resource and countries. A `PATCH /v2/outbound_voice_profiles/{id}` request must also include the existing OVP `name`.
> - `--dry-run` is read-only. Test scripts must fail with remediation instead of changing an existing resource unless the product-specific opt-in and `--confirm` are both present.

> **Rate limits**: Messaging throughput varies by sender type, country, campaign, carrier, and vetting level; 10DLC is not a fixed 1 MPS. Respect current profile/campaign limits and Telnyx rate-limit response headers, queue traffic, and implement exponential backoff for 429 responses. Voice limits also vary by connection type.

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
   - SDK install commands: `pip install twilio` → `pip install 'telnyx>=4.0,<5.0'`, `npm install twilio` → `npm install telnyx@^6 ws@^8` (the `ws` peer is required — see Phase 3), etc.
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
- **Translate `speechModel` by element; do not apply a global rename.** Twilio `<Gather speechModel="...">` and `<Transcription speechModel="...">` map to the corresponding TeXML element's `model` attribute, while `transcriptionEngine` remains the provider. Translate the value to a model supported by the selected TeXML engine; do not blindly copy a Twilio-only model name. `<Language speechModel="...">` under TeXML `<ConversationRelay>` is already valid and must be preserved. See `{baseDir}/references/texml-verbs.md` for the element-specific mappings.
- **Polly voices**: TeXML supports `voice="Polly.{VoiceId}"` and `voice="Polly.{VoiceId}-Neural"`. **Keep the original voice verbatim** — the runtime preserves every voice in its supported Polly set (see the list in `{baseDir}/references/texml-verbs.md`), and named non-Neural voices are valid; they do NOT fall back to a default. Never replace a caller-facing Polly voice with `voice="woman"` — that audibly changes the migrated application. Only if a voice is absent from the supported set, pick the closest supported Polly voice (same language/gender) and record the substitution in the migration report.
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
- `messaging_profile_id` is sender-dependent:
  - **Phone-number or short-code send**: the request schema does not require it when `from` already resolves to the intended Messaging Profile; pass it only as an intentional override.
  - **Number-pool or alphanumeric-sender send**: it is required by the Messages API.
  - Every send still needs a valid profile through the applicable path.
- Webhook payload: flat `{From, Body}` → nested `{data.payload.from.phone_number, data.payload.text}`
- **10DLC blocker**: US A2P SMS requires 10DLC campaign registration. See `{baseDir}/references/messaging-migration.md` → "10DLC Registration".

**WebRTC:**
- **Check each TwiML endpoint's call direction before deciding its fate** (see webrtc-migration.md → "TwiML Endpoint Analysis"): delete an endpoint only if it is reached exclusively by WebRTC clients (browser-originated outbound — `client.newCall()` replaces it). An endpoint that answers inbound PSTN calls (e.g. a webhook returning `<Dial><Client>agent</Client></Dial>`) must be CONVERTED to TeXML, not deleted — deleting it leaves inbound callers with a dead route
- Convert complex or inbound-facing TwiML endpoints to TeXML
- Replace Access Token generation with a per-user Telephony Credential and a backend endpoint that mints short-lived Telnyx JWTs. Direct SIP-credential login is supported only as an explicit lower-security/simple-deployment choice; never expose the Telnyx API key to browser or mobile code.
- Update client SDK: `@twilio/voice-sdk` → `@telnyx/webrtc`
- **Client-side files**: Migrate browser JavaScript/HTML files that import `Twilio.Device`, `@twilio/voice-sdk`, or `twilio-client`. These are in frontend directories (e.g., `public/`, `src/`, `static/`, CDN `<script>` tags in HTML). Replace with `TelnyxRTC` — see `{baseDir}/sdk-reference/webrtc-client/javascript.md` for the full client API.
- **Mobile platforms**: Migrate `.swift`, `.kt`, `.java`, `.dart`, `.tsx` files that import Twilio mobile SDKs. Update `Podfile` (iOS), `build.gradle` (Android), `pubspec.yaml` (Flutter) dependencies. See `{baseDir}/references/mobile-sdk-migration.md`
- See `{baseDir}/references/webrtc-migration.md` → "TwiML Endpoint Analysis"

**Verify:**
- Verify Service SID → Verify Profile ID
- `channel` maps to the endpoint path — send via `POST /v2/verifications/{sms|call|flashcall|whatsapp}` (there is no `type` request parameter; `type` appears only in responses)
- `to` → `phone_number`
- Check response status mapping (when verifying a code): Twilio `approved` → Telnyx `accepted` (code correct), Twilio `pending` (code incorrect) → Telnyx `rejected` (code incorrect). Note: both platforms use `pending` when a verification is *created* (OTP sent, waiting for code) — the mapping above applies only to the code *check* response.

**Webhook Receivers (all products):**
- **You MUST migrate webhook handlers** — this is half the migration for most apps. See `{baseDir}/references/webhook-migration.md` for complete receive + parse + verify examples in Python (Flask, Django), JavaScript (Express), Ruby (Sinatra, **Rails**), and Go (net/http).
- Parse according to the product contract; do not apply one payload shape to every webhook:
  - **Messaging**: JSON under `data.payload`; `from` is an object such as `from.phone_number`, and `to` is an array.
  - **Call Control**: JSON under `data.payload`; voice fields such as `from` and `to` are strings.
  - **TeXML callbacks**: form-urlencoded, top-level CamelCase fields; do not replace `request.form` with JSON parsing.
- Replace HMAC-SHA1 (`RequestValidator`) with Ed25519 signature verification using `telnyx-signature-ed25519` + `telnyx-timestamp` headers
- **If the original code used `twilio.webhook()` middleware**, check the `validate` option:
  - If `validate: false` (or `enforce_https=False` in Python) was set, treat the unauthenticated production webhook as a blocking security decision. Add Telnyx Ed25519 verification for production; if local development needs a bypass, make it explicit, environment-gated, and disabled by default.
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

Run only the product tests in scope. Before each paid `--confirm` invocation, re-check that the current one-action estimate and the cumulative worst-case charge remain within the user-approved maximum from Phase 0. If pricing changed, the test scope grew, or the maximum would be exceeded, stop and obtain a new approval. Any approximate price printed by a script is a non-binding example and must not be treated as a current quote.

```bash
# Phase 0 recorded the applicable destinations and country codes — do not ask again
# Export TELNYX_TO_COUNTRY to match the destination used by the next test.

# Run whichever tests match the migrated products:
bash {baseDir}/scripts/test-migration/test-messaging.sh --confirm
bash {baseDir}/scripts/test-migration/test-voice.sh --confirm
# Full Verify E2E: run in an interactive terminal, enter the received OTP, and
# require the verify action to return response_code=accepted.
bash {baseDir}/scripts/test-migration/test-verify.sh --confirm
# Automation-only partial check (trigger accepted; no delivery/code proof):
bash {baseDir}/scripts/test-migration/test-verify.sh --confirm --send-only
bash {baseDir}/scripts/test-migration/test-lookup.sh --confirm
# Fax requires the separately collected TELNYX_FAX_TO and its matching TELNYX_TO_COUNTRY.
bash {baseDir}/scripts/test-migration/test-fax.sh --confirm
bash {baseDir}/scripts/test-migration/test-sip.sh --confirm        # read/config validation
bash {baseDir}/scripts/test-migration/test-webrtc.sh --confirm     # credential/token test; no live call
# Optional, separately priced and approved outbound prerequisite check:
TELNYX_WEBRTC_LIVE_CALL=yes bash {baseDir}/scripts/test-migration/test-webrtc.sh --confirm
```

`TELNYX_API_KEY`, the applicable product destination, and that destination's `TELNYX_TO_COUNTRY` ISO-2 code are the common minimum inputs for destination-scoped tests. Messaging, voice, and Verify use `TELNYX_TO_NUMBER`; fax uses the distinct `TELNYX_FAX_TO`; lookup uses `TELNYX_LOOKUP_NUMBER` when set and otherwise falls back to `TELNYX_TO_NUMBER`. If the country is omitted, a script fails closed unless the user separately opts into the billed Number Lookup with `TELNYX_ALLOW_COUNTRY_LOOKUP=yes`; dry-run never performs that lookup implicitly. Product-specific resources may be discovered, or a confirmed run may create a dedicated run-owned resource. Discovery never authorizes changing existing routing, assignments, allowlists, or push credentials: those changes require the corresponding explicit opt-in. Test scripts never purchase persistent phone numbers; purchase is a separate approval workflow using a current authoritative quote. Account level, payment, inventory, destination approval, 10DLC/toll-free registration, or regulatory requirements can still block an otherwise valid test.

**WebRTC projects**: The default confirmed run is credential/token-only even when `TELNYX_TO_NUMBER` is already exported; it does not place a live call. `TELNYX_WEBRTC_LIVE_CALL=yes` is a separate, currently priced and explicitly approved opt-in that adds a Call Control PSTN call to check the account's outbound voice prerequisites (the destination should ring) and counts against the approved maximum. It does **not** exercise browser/SDK registration, WebRTC signaling, or media. Perform a real SDK client login/call separately for browser-to-PSTN end-to-end coverage, with its own pricing and approval if it incurs charges.

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

Python: `pip uninstall twilio -y` | Node: `npm uninstall twilio` | Ruby: remove `twilio-ruby` from Gemfile + `bundle install` | Go: `go get -u github.com/twilio/twilio-go@none && go mod tidy` | Java: remove `com.twilio.sdk:twilio` from `pom.xml`/`build.gradle` + run `mvn test` or `./gradlew test` | PHP: `composer remove twilio/sdk`

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
**Tests (paid, --confirm and current-price approval)**: `test-migration/test-voice.sh`, `test-migration/test-messaging.sh`, `test-migration/test-verify.sh`, `test-migration/test-lookup.sh`, `test-migration/test-fax.sh`
**Tests (no paid traffic by default, --confirm)**: `test-migration/test-sip.sh` (SIP trunking setup), `test-migration/test-webrtc.sh` (WebRTC credentials/tokens). The optional WebRTC live call sets `TELNYX_WEBRTC_LIVE_CALL=yes` and is a separately priced and approved paid test.
