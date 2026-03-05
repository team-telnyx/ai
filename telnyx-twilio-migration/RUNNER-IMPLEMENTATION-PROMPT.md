# Runner Implementation Prompt

> **Purpose**: This document is a self-contained prompt for a new Claude Code session. It describes a complete architectural change to the Telnyx Twilio Migration skill — converting from a prose-based SKILL.md (where the LLM interprets 470 lines of instructions and decides what to do) to a step-by-step runner pattern (where a bash script controls flow and tells the LLM exactly what to do at each step).
>
> **How to use**: Open a new Claude Code session in the repo root (`/Users/aislingcahill/telnyx-work/telnyx-skills/telnyx-twilio-migration/`), paste this document, and let the agent execute it.

---

## Context

### Repository
- **Repo**: `team-telnyx/telnyx-skills` (public)
- **Skill dir**: `skills/telnyx-twilio-migration/`
- **Current branch**: `fix/e2e-test-issues`
- **Create new branch from it**: `feature/runner-architecture`

### What This Skill Does
Migrates a user's entire application from Twilio to Telnyx. It's an agentskills.io SKILL.md file that any coding agent (Claude Code, Codex, Cursor, Gemini CLI) can load. The migration has 7 phases: Prerequisites (user input) → Discovery (scan codebase) → Planning → Setup (install SDK, env vars) → Migration (transform code) → Validation (integration tests) → Cleanup (report).

### The Problem
The current SKILL.md is 475 lines of natural language instructions that the LLM reads and follows. This has failure modes:
1. **Phase skipping** — LLM jumps ahead without completing prerequisites
2. **Context loss** — on large codebases, the LLM's context window fills up and it forgets where it is
3. **Resume failure** — after a crash/timeout, the LLM must re-read the entire SKILL.md and figure out where to pick up
4. **Agent variance** — weaker agents (Cursor, Copilot) may not follow the 475-line instruction set reliably
5. **State disconnection** — `migration-state.sh` tracks state but the phase wrapper scripts never read/write it

### The Solution: Step-by-Step Runner
Build a `runner.sh` that:
- Controls all flow (phase ordering, prerequisites, gating)
- Persists state to a JSON file (step-level granularity, retry counts, results)
- On each `--next` call, either executes a deterministic script step OR outputs an instruction for the agent to do creative work (code transformation)
- Shows all script output transparently (not abstracted — full stdout/stderr piped through)
- Makes the SKILL.md tiny (~30 lines: "run `--next` in a loop")

---

## Architecture

### Interaction Model

```
SKILL.md (tiny) tells the agent:
  "Run runner.sh --init, then loop runner.sh --next until WORKFLOW_COMPLETE"
      │
      ▼
runner.sh --next
      │
      ├─ If next step is SCRIPT type:
      │    Runner executes it, shows full output, records result, advances state
      │    Agent just calls --next again
      │
      ├─ If next step is AGENT type:
      │    Runner outputs INSTRUCTION with exactly what the agent should do
      │    Agent does the work (reads files, transforms code, writes files)
      │    Agent calls: runner.sh --done <step-id>
      │    Runner validates the work (runs lint/validate), records result, advances
      │
      ├─ If next step is GATE type:
      │    Runner checks prerequisites, outputs PROCEED or BLOCKED with reason
      │    If BLOCKED, agent must fix the issue and call --next again
      │
      └─ If next step is INPUT type:
           Runner outputs what to ask the user
           Agent asks user, then calls: runner.sh --set <key> <value>
```

### File Structure (New/Changed Files)

```
skills/telnyx-twilio-migration/
├── SKILL.md                          # REWRITE: ~40 lines (was 475)
├── scripts/
│   ├── runner.sh                     # NEW: ~600-800 lines, the core orchestrator
│   ├── workflow.sh                   # NEW: ~400 lines, step definitions (the "state machine")
│   ├── migration-state.sh            # EXTEND: add step-level tracking, retry counts
│   ├── run-discovery.sh              # KEEP AS-IS (runner calls it directly)
│   ├── run-validation.sh             # KEEP AS-IS (runner calls it directly)
│   ├── preflight-check.sh            # KEEP AS-IS
│   ├── scan-twilio-usage.sh          # KEEP AS-IS
│   ├── scan-twilio-deep.py           # KEEP AS-IS
│   ├── validate-migration.sh         # KEEP AS-IS
│   ├── validate-texml.sh             # KEEP AS-IS
│   ├── lint-telnyx-correctness.sh    # KEEP AS-IS
│   └── test-migration/              # ALL KEEP AS-IS
│       ├── test-messaging.sh
│       ├── test-voice.sh
│       ├── test-verify.sh
│       ├── test-lookup.sh
│       ├── test-fax.sh
│       ├── test-sip.sh
│       ├── test-webrtc.sh
│       ├── smoke-test.sh
│       ├── webhook-receiver.py
│       └── test-webhooks-local.py
├── references/                       # ALL KEEP AS-IS (18 files)
├── sdk-reference/                    # ALL KEEP AS-IS (203 files)
├── templates/                        # ALL KEEP AS-IS (2 files)
└── assets/                           # KEEP AS-IS
```

### What NOT to Change
- All 18 reference docs in `references/` — these are the migration knowledge base
- All 203 SDK reference files in `sdk-reference/` — these are code transform examples
- All 10 test scripts in `scripts/test-migration/` — these are self-contained integration tests
- All existing scripts (`scan-twilio-usage.sh`, `validate-migration.sh`, etc.) — the runner calls these, doesn't replace them
- Templates in `templates/`

---

## Step Definitions

The runner executes steps sequentially. Each step has: an ID, a type, a phase, prerequisites, a command or instruction, and success criteria. Below is the complete step list.

### Phase 0: Prerequisites

```
STEP: phase0_collect_input
TYPE: INPUT
PHASE: 0
PREREQS: none
ASK_USER: |
  I need three things to begin the migration:
  1. Your Telnyx API key (from portal.telnyx.com → API Keys)
  2. Your phone number in E.164 format (e.g., +15551234567) — for receiving test SMS/calls
  3. Cost approval — integration tests cost ~$0.15 total (messaging ~$0.004, voice ~$0.01, verify ~$0.05, lookup ~$0.01, fax ~$0.07). A phone number (~$1/month) may be auto-purchased if your account has none.
  Do you approve these costs? (yes/no)
SAVES: TELNYX_API_KEY, TELNYX_TO_NUMBER, cost_approved
SUCCESS: All three values provided, cost_approved=true

STEP: phase0_validate_api_key
TYPE: SCRIPT
PHASE: 0
PREREQS: phase0_collect_input
COMMAND: |
  curl -s -o /tmp/telnyx-balance.json -w "%{http_code}" \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/balance"
SUCCESS: HTTP 200
FAILURE: Ask user to re-check API key

STEP: phase0_init_state
TYPE: SCRIPT
PHASE: 0
PREREQS: phase0_validate_api_key
COMMAND: bash ${SKILL_DIR}/scripts/migration-state.sh init ${PROJECT_ROOT}
SUCCESS: migration-state.json exists
```

### Phase 1: Discovery

```
STEP: phase1_gate
TYPE: GATE
PHASE: 1
PREREQS: phase0_init_state
CHECK: TELNYX_API_KEY validates, TELNYX_TO_NUMBER set, cost_approved=true

STEP: phase1_run_discovery
TYPE: SCRIPT
PHASE: 1
PREREQS: phase1_gate
COMMAND: bash ${SKILL_DIR}/scripts/run-discovery.sh ${PROJECT_ROOT}
SUCCESS: ${PROJECT_ROOT}/twilio-scan.json exists and is non-empty
OUTPUT_CAPTURES: scan_file=${PROJECT_ROOT}/twilio-scan.json

STEP: phase1_triage_scope
TYPE: AGENT
PHASE: 1
PREREQS: phase1_run_discovery
INSTRUCTION: |
  Read ${PROJECT_ROOT}/twilio-scan.json.
  For each detected product, classify as:
    - MIGRATE: voice, messaging, verify, webrtc, sip, fax, video, lookup, numbers, porting
    - KEEP_ON_TWILIO: Flex, Studio, TaskRouter, Conversations, Sync, Notify, Proxy, Pay, Autopilot
  Do NOT ask the user — apply these rules deterministically.
  After classifying, run these commands to record the results:
    For each product to migrate: bash ${SKILL_DIR}/scripts/migration-state.sh add-product ${PROJECT_ROOT} <product>
    For each kept product: bash ${SKILL_DIR}/scripts/migration-state.sh set ${PROJECT_ROOT} kept_on_twilio.<product> true
VALIDATE_WITH: bash ${SKILL_DIR}/scripts/migration-state.sh show ${PROJECT_ROOT} | jq '.completed_products | length > 0'
SUCCESS: At least one product classified for migration
```

### Phase 2: Planning

```
STEP: phase2_gate
TYPE: GATE
PHASE: 2
PREREQS: phase1_triage_scope
CHECK: current_phase >= 1, twilio-scan.json exists, at least one product classified

STEP: phase2_decide_approach
TYPE: SCRIPT
PHASE: 2
PREREQS: phase2_gate
COMMAND: bash ${SKILL_DIR}/scripts/decide-approach.sh ${PROJECT_ROOT}
SUCCESS: Exit 0, outputs voice_approach and migration_strategy to state
NOTE: THIS SCRIPT MUST BE CREATED — see "New Scripts to Build" section below

STEP: phase2_generate_plan
TYPE: AGENT
PHASE: 2
PREREQS: phase2_decide_approach
INSTRUCTION: |
  Read these files:
    - ${SKILL_DIR}/templates/MIGRATION-PLAN.md (template)
    - ${PROJECT_ROOT}/twilio-scan.json (scan results)
    - Run: bash ${SKILL_DIR}/scripts/migration-state.sh show ${PROJECT_ROOT}
  Copy the template to ${PROJECT_ROOT}/MIGRATION-PLAN.md and populate it with:
    - Products to migrate (from state)
    - Voice approach: read from state key 'voice_approach' (texml/call_control/both)
    - Migration strategy: read from state key 'migration_strategy' (big_bang/incremental)
    - File list per product (from scan JSON)
  Do NOT ask the user for approval — fill it in deterministically.
VALIDATE_WITH: test -f ${PROJECT_ROOT}/MIGRATION-PLAN.md && test -s ${PROJECT_ROOT}/MIGRATION-PLAN.md
SUCCESS: MIGRATION-PLAN.md exists and is non-empty
```

### Phase 3: Setup

```
STEP: phase3_gate
TYPE: GATE
PHASE: 3
PREREQS: phase2_generate_plan
CHECK: current_phase >= 2, MIGRATION-PLAN.md exists

STEP: phase3_create_branch
TYPE: SCRIPT
PHASE: 3
PREREQS: phase3_gate
COMMAND: cd ${PROJECT_ROOT} && git checkout -b migrate/twilio-to-telnyx 2>/dev/null || git checkout migrate/twilio-to-telnyx
SUCCESS: On branch migrate/twilio-to-telnyx

STEP: phase3_install_sdk
TYPE: AGENT
PHASE: 3
PREREQS: phase3_create_branch
INSTRUCTION: |
  Detect the project's language(s) from package files in ${PROJECT_ROOT}.
  Install Telnyx SDK ALONGSIDE Twilio (do NOT remove Twilio yet):
    Python: pip install 'telnyx>=2.0,<3.0' and add to requirements.txt
    Node: npm install telnyx@^2
    Ruby: add gem 'telnyx', '~> 2.0' to Gemfile, bundle install
    Go: go get github.com/team-telnyx/telnyx-go
    Java/PHP/C#: No SDK — will use REST API
  If WebRTC detected in scan: also npm install @telnyx/webrtc
  IMPORTANT: Do NOT remove twilio from any dependency file.
  Record the language: bash ${SKILL_DIR}/scripts/migration-state.sh set ${PROJECT_ROOT} language <detected-language>
VALIDATE_WITH: bash ${SKILL_DIR}/scripts/migration-state.sh get ${PROJECT_ROOT} language
SUCCESS: Language is recorded in state

STEP: phase3_update_env_vars
TYPE: AGENT
PHASE: 3
PREREQS: phase3_install_sdk
INSTRUCTION: |
  Update environment variable files in ${PROJECT_ROOT}. Apply this mapping:
    TWILIO_ACCOUNT_SID → TELNYX_API_KEY
    TWILIO_AUTH_TOKEN → TELNYX_PUBLIC_KEY
    TWILIO_PHONE_NUMBER → TELNYX_PHONE_NUMBER
    TWILIO_MESSAGING_SERVICE_SID → TELNYX_MESSAGING_PROFILE_ID
    TWILIO_VERIFY_SERVICE_SID → TELNYX_VERIFY_PROFILE_ID
    (If TeXML voice) add TELNYX_CONNECTION_ID
  Files to check: .env, .env.example, .env.sample, docker-compose*.yml, CI configs
  Add Telnyx vars alongside existing Twilio vars (do not remove Twilio vars yet).
  CRITICAL: Ensure every new TELNYX_* var exists in .env.example.
VALIDATE_WITH: grep -r "TELNYX_API_KEY" ${PROJECT_ROOT}/.env* 2>/dev/null | head -1
SUCCESS: At least one env file contains TELNYX_API_KEY

STEP: phase3_commit
TYPE: SCRIPT
PHASE: 3
PREREQS: phase3_update_env_vars
COMMAND: cd ${PROJECT_ROOT} && git add -A && git diff --cached --quiet || git commit -m "chore: add Telnyx SDK alongside Twilio, update env vars"
SUCCESS: Commit created or nothing to commit
```

### Phase 4: Migration (Dynamic Loop)

This is the most complex phase. The runner must dynamically generate steps based on the scan results.

```
STEP: phase4_gate
TYPE: GATE
PHASE: 4
PREREQS: phase3_commit
CHECK: current_phase >= 3, SDK installed, env vars updated

# The runner dynamically generates the following steps for EACH product
# detected in twilio-scan.json, in priority order:
# messaging → voice → verify → numbers → lookup → webrtc → sip → fax → video → porting

# For each product, the runner generates this sequence:
# phase4_migrate_{product} (AGENT) → phase4_lint_{product} (SCRIPT) →
# phase4_validate_{product} (SCRIPT) → phase4_commit_{product} (SCRIPT)

STEP: phase4_migrate_{product}   (generated per product)
TYPE: AGENT
PHASE: 4
PREREQS: phase4_gate (first product) or phase4_commit_{prev_product} (subsequent)
INSTRUCTION: |
  You are migrating the "{product}" product from Twilio to Telnyx.

  REQUIRED READING (do this first):
    1. Read ${SKILL_DIR}/references/{product}-migration.md — this is your primary guide
    2. Read ${SKILL_DIR}/references/webhook-migration.md — webhook changes apply to ALL products
    3. For SDK method signatures: ${SKILL_DIR}/sdk-reference/{language}/{product}.md

  FILES TO TRANSFORM (from scan):
    {list of files from twilio-scan.json for this product}

  FOR EACH FILE:
    1. Read the file
    2. Identify all Twilio patterns (imports, client init, API calls, webhooks, env vars)
    3. Transform each pattern using the reference guide's before/after examples
    4. If the reference doesn't cover a specific API call, check sdk-reference/{language}/{product}.md
    5. Write the transformed file
    6. Re-read and verify no Twilio patterns remain

  PRODUCT-SPECIFIC RULES:
    {product-specific rules inserted by runner based on product type — see below}

  WEBHOOK RULES (ALL PRODUCTS):
    - Parse JSON body, not form data: request.json['data']['payload'] not request.form
    - from is an object: data.payload.from.phone_number
    - to is an array: data.payload.to[0].phone_number
    - Replace HMAC-SHA1 with Ed25519 verification
    - Express/Node: MUST capture raw body via verify callback on express.json()

  After transforming all files, also migrate any test files for this product.
  Then run: bash ${SKILL_DIR}/scripts/migration-state.sh add-file ${PROJECT_ROOT} {product} <each-file>
VALIDATE_WITH: bash ${SKILL_DIR}/scripts/lint-telnyx-correctness.sh ${PROJECT_ROOT} --product {product}
SUCCESS: Lint exits 0

STEP: phase4_lint_{product}   (generated per product)
TYPE: SCRIPT
PHASE: 4
PREREQS: phase4_migrate_{product}
COMMAND: bash ${SKILL_DIR}/scripts/lint-telnyx-correctness.sh ${PROJECT_ROOT} --product {product}
SUCCESS: Exit 0
RETRY: 3 (on failure, output goes back to agent as FIX_INSTRUCTION)

STEP: phase4_validate_{product}   (generated per product)
TYPE: SCRIPT
PHASE: 4
PREREQS: phase4_lint_{product}
COMMAND: bash ${SKILL_DIR}/scripts/validate-migration.sh ${PROJECT_ROOT} --product {product} --scan-json ${PROJECT_ROOT}/twilio-scan.json
SUCCESS: Exit 0
RETRY: 3

STEP: phase4_commit_{product}   (generated per product)
TYPE: SCRIPT
PHASE: 4
PREREQS: phase4_validate_{product}
COMMAND: cd ${PROJECT_ROOT} && git add -A && git diff --cached --quiet || git commit -m "migrate: {product} — Twilio to Telnyx"
SUCCESS: Commit created

# After ALL products:

STEP: phase4_env_audit
TYPE: AGENT
PHASE: 4
PREREQS: all phase4_commit_{product} steps
INSTRUCTION: |
  Audit environment variables. Grep all source files in ${PROJECT_ROOT} for TELNYX_* references:
    - process.env.TELNYX_ (JavaScript)
    - os.environ["TELNYX_"] or os.getenv("TELNYX_") (Python)
    - ENV["TELNYX_"] (Ruby)
    - os.Getenv("TELNYX_") (Go)
  Verify EVERY referenced var exists in .env.example (or equivalent config template).
  If any are missing, add them and commit.
VALIDATE_WITH: echo "manual check — agent verifies"
SUCCESS: All env vars accounted for
```

### Phase 5: Validation

```
STEP: phase5_gate
TYPE: GATE
PHASE: 5
PREREQS: phase4_env_audit
CHECK: current_phase >= 4, all products committed

STEP: phase5_run_validation
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_gate
COMMAND: bash ${SKILL_DIR}/scripts/run-validation.sh ${PROJECT_ROOT}
SUCCESS: Exit 0
RETRY: 3

STEP: phase5_run_lint
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_gate
COMMAND: bash ${SKILL_DIR}/scripts/lint-telnyx-correctness.sh ${PROJECT_ROOT}
SUCCESS: Exit 0
RETRY: 3

# Integration tests — runner generates one per detected product:

STEP: phase5_test_messaging   (conditional: messaging detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-messaging.sh --confirm
ENV: TELNYX_API_KEY, TELNYX_TO_NUMBER
SUCCESS: Exit 0
RETRY: 3
COST: ~$0.004

STEP: phase5_test_voice   (conditional: voice detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-voice.sh --confirm
ENV: TELNYX_API_KEY, TELNYX_TO_NUMBER
SUCCESS: Exit 0
RETRY: 3
COST: ~$0.01

STEP: phase5_test_verify   (conditional: verify detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-verify.sh --confirm --send-only
ENV: TELNYX_API_KEY, TELNYX_TO_NUMBER
SUCCESS: Exit 0
RETRY: 3
COST: ~$0.05

STEP: phase5_test_lookup   (conditional: lookup detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-lookup.sh --confirm
ENV: TELNYX_API_KEY, TELNYX_TO_NUMBER
SUCCESS: Exit 0
RETRY: 3
COST: ~$0.01

STEP: phase5_test_fax   (conditional: fax detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-fax.sh --confirm
ENV: TELNYX_API_KEY, TELNYX_TO_NUMBER
SUCCESS: Exit 0
RETRY: 3
COST: ~$0.07

STEP: phase5_test_sip   (conditional: sip detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-sip.sh --confirm
ENV: TELNYX_API_KEY
SUCCESS: Exit 0
RETRY: 3
COST: Free

STEP: phase5_test_webrtc   (conditional: webrtc detected)
TYPE: SCRIPT
PHASE: 5
PREREQS: phase5_run_validation, phase5_run_lint
COMMAND: bash ${SKILL_DIR}/scripts/test-migration/test-webrtc.sh --confirm
ENV: TELNYX_API_KEY
SUCCESS: Exit 0
RETRY: 3
COST: Free
```

### Phase 6: Cleanup

```
STEP: phase6_gate
TYPE: GATE
PHASE: 6
PREREQS: all phase5 tests pass
CHECK: validation + lint exit 0, all applicable integration tests exit 0

STEP: phase6_check_hybrid
TYPE: SCRIPT
PHASE: 6
PREREQS: phase6_gate
COMMAND: bash ${SKILL_DIR}/scripts/migration-state.sh show ${PROJECT_ROOT} | jq '.kept_on_twilio // {} | length'
SUCCESS: Always succeeds (output is 0 for full migration, >0 for hybrid)
OUTPUT_CAPTURES: is_hybrid (0=full, >0=hybrid)

STEP: phase6_remove_twilio_sdk   (conditional: is_hybrid=0)
TYPE: AGENT
PHASE: 6
PREREQS: phase6_check_hybrid (result: is_hybrid=0)
INSTRUCTION: |
  Remove the Twilio SDK from ${PROJECT_ROOT}:
    Python: pip uninstall twilio -y, remove from requirements.txt
    Node: npm uninstall twilio
    Ruby: remove twilio-ruby from Gemfile, bundle install
    Go: go get -u github.com/twilio/twilio-go@none && go mod tidy
  Also remove any remaining TWILIO_* env var definitions from .env files.
  Commit: git add -A && git commit -m "chore: remove Twilio SDK — migration complete"
VALIDATE_WITH: ! grep -r "twilio" ${PROJECT_ROOT}/package.json ${PROJECT_ROOT}/requirements.txt ${PROJECT_ROOT}/Gemfile ${PROJECT_ROOT}/go.mod 2>/dev/null
SUCCESS: No twilio references in dependency files

STEP: phase6_generate_report
TYPE: AGENT
PHASE: 6
PREREQS: phase6_remove_twilio_sdk OR phase6_check_hybrid (if hybrid)
INSTRUCTION: |
  Copy ${SKILL_DIR}/templates/MIGRATION-REPORT.md to ${PROJECT_ROOT}/MIGRATION-REPORT.md.
  Populate with actual data:
    - Read migration-state.json for products migrated, files changed, resource IDs
    - Include integration test results (from runner state)
    - If hybrid: list products kept on Twilio and why
    - Include the post-migration checklist
  Commit: git add MIGRATION-REPORT.md && git commit -m "docs: add migration report"
VALIDATE_WITH: test -f ${PROJECT_ROOT}/MIGRATION-REPORT.md && test -s ${PROJECT_ROOT}/MIGRATION-REPORT.md
SUCCESS: Report exists and is non-empty

STEP: phase6_present_checklist
TYPE: AGENT
PHASE: 6
PREREQS: phase6_generate_report
INSTRUCTION: |
  Present the post-migration checklist to the user:
    - [ ] Port numbers via FastPort (see references/number-porting.md)
    - [ ] Update webhook URLs in load balancers/DNS/external services
    - [ ] Update secrets manager + CI/CD env vars for production
    - [ ] Update monitoring alerts for Telnyx error codes/webhook formats
    - [ ] Deploy to staging → run e2e tests → deploy to production
    {If hybrid:}
    - [ ] Maintain both API keys, monitor both platforms
    - [ ] Revisit kept products periodically for Telnyx support
    {If full migration:}
    - [ ] Cancel Twilio account after validation period
  This is the final step. Output WORKFLOW_COMPLETE after presenting.
```

---

## New Scripts to Build

### 1. `runner.sh` (~600-800 lines)

The core orchestrator. Commands:

```bash
runner.sh --init <project-root>          # Initialize workflow state, detect skill dir
runner.sh --next                         # Execute or output the next step
runner.sh --done <step-id>               # Mark an AGENT step as complete, run validation
runner.sh --set <key> <value>            # Set a value (for INPUT steps)
runner.sh --status                       # Show current position and progress
runner.sh --retry                        # Re-run the current failed step
```

#### Key Design Decisions

1. **State file**: `.migration-runner-state.json` in project root (separate from `migration-state.json` — runner state tracks workflow position/steps, migration state tracks migration-specific data like resource IDs and product lists). The runner reads/writes both.

2. **Step execution output format** (for SCRIPT steps):
```
════════════════════════════════════════════════════
STEP: phase1_run_discovery (3 of 47)
PHASE: 1 — Discovery
════════════════════════════════════════════════════

ACTION: script
RUNNING: bash /path/to/scripts/run-discovery.sh /user/project

--- output begins ---
{full stdout/stderr from the script, unmodified}
--- output ends ---

EXIT_CODE: 0
RESULT: pass
NEXT: phase1_triage_scope
```

3. **Step instruction output format** (for AGENT steps):
```
════════════════════════════════════════════════════
STEP: phase4_migrate_messaging (12 of 47)
PHASE: 4 — Migration
════════════════════════════════════════════════════

ACTION: agent
INSTRUCTION:
  You are migrating the "messaging" product from Twilio to Telnyx.

  REQUIRED READING (do this first):
    1. Read /path/to/references/messaging-migration.md
    2. Read /path/to/references/webhook-migration.md
    3. For SDK methods: /path/to/sdk-reference/javascript/messaging.md

  FILES TO TRANSFORM:
    - src/messaging.js (lines 1-45: Twilio client init, sendSMS function)
    - src/routes/sms-webhook.js (lines 1-30: webhook handler)

  [... full product-specific rules ...]

WHEN_DONE: bash /path/to/runner.sh --done phase4_migrate_messaging
```

4. **Failure/retry output format**:
```
════════════════════════════════════════════════════
STEP: phase4_lint_messaging (13 of 47) — RETRY 2 of 3
PHASE: 4 — Migration
════════════════════════════════════════════════════

ACTION: script
RUNNING: bash /path/to/scripts/lint-telnyx-correctness.sh /user/project --product messaging

--- output begins ---
  ISSUE  src/messaging.js:42 — uses 'body' parameter (should be 'text')
  ISSUE  src/messaging.js:67 — missing messaging_profile_id in send call
2 issues found
--- output ends ---

EXIT_CODE: 1
RESULT: fail (attempt 2 of 3)
FIX_INSTRUCTION: Fix the 2 issues listed above, then call:
  bash /path/to/runner.sh --next
```

5. **BLOCKED output format** (for failed gates):
```
════════════════════════════════════════════════════
STEP: phase4_gate
PHASE: 4 — Migration
════════════════════════════════════════════════════

RESULT: BLOCKED
REASON: Phase 3 is not complete. Current phase: 2
REQUIRED: Complete Phase 3 (Setup) first.
  Missing: SDK not installed, env vars not updated.
```

6. **Dynamic step generation**: When the runner reaches Phase 4, it reads `twilio-scan.json` to determine which products were detected. It generates steps dynamically:
   - For each product in priority order (messaging → voice → verify → numbers → lookup → webrtc → sip → fax → video → porting):
     - `phase4_migrate_{product}` (AGENT)
     - `phase4_lint_{product}` (SCRIPT)
     - `phase4_validate_{product}` (SCRIPT)
     - `phase4_commit_{product}` (SCRIPT)
   - Similarly for Phase 5 integration tests — only generate test steps for detected products.

7. **Product-specific rules injection**: When generating `phase4_migrate_{product}` instructions, the runner injects product-specific rules:
   - **messaging**: body→text, from_→from, add messaging_profile_id, StatusCallback→profile webhook
   - **voice (texml)**: XML usually untouched, change base URL, Basic→Bearer, remove speechModel, use Neural Polly voices, use SDK for outbound
   - **voice (call_control)**: Replace TwiML with API commands, use client_state (base64 JSON)
   - **verify**: Service SID→Profile ID, channel→type, to→phone_number, approved→accepted
   - **webrtc**: Delete simple dial TwiML, replace access token with SIP creds, @twilio/voice-sdk→@telnyx/webrtc, migrate client-side files
   - **sip**: Trunk→Connection, IP ACL→IP Auth, separate OVP for outbound
   - **fax**: Twilio Fax→Telnyx Fax API, SIP INVITE for receive
   - **lookup**: carrier/line_type fields differ, portability check available
   - **numbers**: Number management API differences
   - **porting**: FastPort process, LOA requirements

### 2. `workflow.sh` (~400 lines)

Contains the step definitions as bash functions/arrays. Separated from `runner.sh` for clarity. Exports:
- `get_static_steps()` — returns the fixed steps (phases 0-3, phase 4 gate, phase 4 env audit, phases 5-6)
- `get_dynamic_steps()` — reads scan JSON, returns generated steps for phases 4-5
- `get_step_definition()` — given a step ID, returns its type, command, instruction, prerequisites, etc.
- `get_product_rules()` — given a product name and language, returns the product-specific migration rules text

### 3. `decide-approach.sh` (~150 lines)

New script that reads `twilio-scan.json` and deterministically decides:
- `voice_approach`: `texml` | `call_control` | `both` | `none`
  - If scan shows VoiceResponse/TwiML/XML files and NO streaming/forking → `texml`
  - If scan shows <Stream>, media streaming, audio forking → `call_control`
  - If both patterns → `both`
  - If no voice detected → `none`
- `migration_strategy`: `big_bang` | `incremental`
  - If ≤10 Twilio files AND single product → `big_bang`
  - Otherwise → `incremental`

Writes results to migration state:
```bash
migration-state.sh set "$ROOT" voice_approach "$APPROACH"
migration-state.sh set "$ROOT" migration_strategy "$STRATEGY"
```

### 4. Extensions to `migration-state.sh`

Add these capabilities (extend the existing script, don't rewrite it):

```bash
# New commands:
migration-state.sh step-start <root> <step-id>        # Record step start time
migration-state.sh step-done <root> <step-id> <result> # Record step completion (pass/fail/skip)
migration-state.sh step-status <root> <step-id>        # Get step status
migration-state.sh get-retry-count <root> <step-id>    # Get retry count for a step
migration-state.sh increment-retry <root> <step-id>    # Increment retry count
migration-state.sh get-current-step <root>              # Get current step ID
migration-state.sh set-current-step <root> <step-id>    # Set current step
```

New JSON structure additions (under existing schema):
```json
{
  "runner": {
    "current_step": "phase4_migrate_messaging",
    "total_steps": 47,
    "completed_steps": 12,
    "steps": {
      "phase0_collect_input": {"status": "pass", "started_at": "...", "completed_at": "...", "retries": 0},
      "phase1_run_discovery": {"status": "pass", "started_at": "...", "completed_at": "...", "retries": 0, "exit_code": 0},
      "phase4_lint_messaging": {"status": "fail", "started_at": "...", "retries": 2, "exit_code": 1, "last_error": "2 issues found"}
    }
  }
}
```

---

## SKILL.md Rewrite

The new SKILL.md should be approximately 40-50 lines. Here is the target content:

```markdown
---
name: telnyx-twilio-migration
description: >-
  Migrate from Twilio to Telnyx. A step-by-step runner orchestrates the entire
  6-phase migration: discovery, planning, setup, code transformation, validation
  (with real integration tests), and cleanup. Supports voice (TwiML→TeXML, Call
  Control), messaging, WebRTC, SIP trunking, verify, fax, video, lookup, and
  number porting. Works with any coding agent.
metadata:
  author: telnyx
  product: migration
  compatibility: "Requires bash 4+, jq, curl. macOS ships bash 3.2 — install bash via Homebrew (brew install bash)."
---

# Twilio to Telnyx Migration

This skill uses a **step-by-step runner** that controls the entire migration workflow. You do NOT need to memorize phases or follow complex instructions — just run the commands below.

## How It Works

1. **Initialize**: `bash {baseDir}/scripts/runner.sh --init <project-root>`
2. **Loop**: Run `bash {baseDir}/scripts/runner.sh --next` repeatedly
3. **Follow instructions**:
   - If output shows `ACTION: script` — the runner already executed it. Call `--next` again.
   - If output shows `ACTION: agent` — do what `INSTRUCTION` says, then call `bash {baseDir}/scripts/runner.sh --done <step-id>`
   - If output shows `RESULT: BLOCKED` — fix the issue described, then call `--next` again.
   - If output shows `RESULT: fail` — fix the issues listed, then call `--next` again (auto-retries up to 3x).
4. **Stop**: When output shows `WORKFLOW_COMPLETE`, the migration is done.

## Key Rules

- **Do NOT skip steps** — the runner enforces ordering and prerequisites.
- **Do NOT substitute your own checks** — always use the runner's built-in validation.
- **Read the reference files** when instructed — they contain the correct Twilio→Telnyx patterns. Do NOT use patterns from your own training data.
- **Phase 0 is the only user interaction** — the runner will ask for API key, phone number, and cost approval. After that, everything is autonomous.
- **If a step fails 3 times**, the runner will output `ESCALATE` — present the error to the user and ask for help.

## Quick Commands

| Command | Purpose |
|---------|---------|
| `runner.sh --init <root>` | Start a new migration |
| `runner.sh --next` | Execute/get the next step |
| `runner.sh --done <step-id>` | Mark an agent step as complete |
| `runner.sh --set <key> <value>` | Provide a value (API key, phone number) |
| `runner.sh --status` | Check progress |
| `runner.sh --retry` | Re-attempt a failed step |

## Reference Files

The `{baseDir}/references/` directory contains migration guides for each product. The runner will tell you exactly which files to read at each step. Do not read them all upfront — load them on demand as instructed.

The `{baseDir}/sdk-reference/{language}/` directories contain Telnyx SDK method signatures. Use these as the source of truth for API calls.
```

---

## Implementation Order

Build in this order to enable incremental testing:

1. **`decide-approach.sh`** — small, self-contained, testable immediately
2. **Extensions to `migration-state.sh`** — add step tracking commands
3. **`workflow.sh`** — step definitions (start with phases 0-1, add phases incrementally)
4. **`runner.sh`** — core orchestrator (start with --init and --next for SCRIPT steps only, then add AGENT/GATE/INPUT handling)
5. **SKILL.md rewrite** — do this last, after the runner is working

## Testing Strategy

1. **Unit test `decide-approach.sh`**: Create mock `twilio-scan.json` files with different product combos, verify correct approach/strategy output
2. **Unit test `migration-state.sh` extensions**: Test each new command
3. **Integration test runner phases 0-1**: Run `--init` then `--next` through discovery on a real Twilio project (use `/tmp/browser-calls-flask` as test target)
4. **Integration test runner phase 4**: Test dynamic step generation — verify correct steps are created for detected products
5. **Full E2E test**: Run the entire runner on `/tmp/browser-calls-flask` and verify it produces the same migration result as the current SKILL.md approach

## Critical Requirements

1. **All script output must be shown verbatim** — never summarize, filter, or swallow stdout/stderr from called scripts. The runner adds framing (step header, exit code, result) but the script output between `--- output begins ---` and `--- output ends ---` must be exactly what the script produced.

2. **State must survive crashes** — every state mutation must be written to disk immediately via `migration-state.sh`. If the process is killed mid-step, `--next` must resume from the correct position.

3. **No new dependencies beyond jq** — the runner must work with bash + jq + curl (already required by existing scripts). Do NOT require yq, python, node, or any other tool for the runner itself.

4. **Backward compatibility** — all existing scripts must continue to work independently. Someone should still be able to run `test-messaging.sh --confirm` without the runner.

5. **Transparent error output** — when a step fails, show the full error. When suggesting a fix, reference the specific lines/files from the error output. Never say "something went wrong" without details.

6. **The test scripts should exit 2 (not 0) for dry runs** — currently `test-messaging.sh` without `--confirm` exits 0 (looks like success). Change all test scripts to exit 2 when run without `--confirm`, so the runner can distinguish "test passed" (exit 0) from "test not actually run" (exit 2). This is a small change to each test script's `if [ "$CONFIRMED" = false ]` block.

## What Success Looks Like

When complete, an agent running this skill will:
1. Read the tiny SKILL.md (~40 lines)
2. Run `runner.sh --init /path/to/project`
3. Call `runner.sh --next` in a loop
4. For each step, either see the script execute automatically or get a precise instruction for what to do
5. Never lose track of where it is (state is in a file, not in context)
6. Never skip a phase (gates prevent it)
7. Never miss a product (dynamic step generation from scan results)
8. Complete the entire migration, including real integration tests, and output `WORKFLOW_COMPLETE`

The north star: **any coding agent can run this skill and fully migrate an entire application from Twilio to Telnyx, producing fully end-to-end tested production code that works without human developer input, for all products and all application types.**
