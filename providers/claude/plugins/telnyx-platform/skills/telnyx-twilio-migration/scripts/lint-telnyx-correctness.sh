#!/usr/bin/env bash
#
# lint-telnyx-correctness.sh — Check migrated code for known Telnyx anti-patterns
#
# Unlike validate-migration.sh (which checks "is Twilio code gone?"), this linter
# checks "is the Telnyx code correct?" — catching common mistakes agents make when
# translating Twilio patterns to Telnyx.
#
# Usage:
#   bash lint-telnyx-correctness.sh <project-root> [--product <name>] [--json]
#                                   [--scan-json <path>]
#
# Options:
#   <project-root>       Path to the project to lint (required)
#   --product <name>     Only check patterns for a specific product
#   --json               Output results as machine-readable JSON
#   --scan-json <path>   Path to twilio-scan.json for context-aware checks
#
# Exit codes:
#   0 — No issues found
#   1 — Issues found (details in output)
#   2 — Usage error

set -euo pipefail

# --- Colors ---
if [ -t 1 ]; then
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' YELLOW='' GREEN='' BLUE='' BOLD='' NC=''
fi

ISSUE_COUNT=0
WARN_COUNT=0
PASS_COUNT=0
JSON_MODE=false
PRODUCT_FILTER="all"
PROJECT_ROOT=""
SCAN_JSON=""
JSON_CHECKS="[]"

EXCLUDE_DIRS="node_modules .git vendor __pycache__ venv .venv dist build"
EXCLUDE_LOCK_FILES="--exclude=package-lock.json --exclude=yarn.lock --exclude=pnpm-lock.yaml --exclude=Gemfile.lock --exclude=Pipfile.lock --exclude=poetry.lock --exclude=go.sum"
EXCLUDE_SCAN_FILES="--exclude=twilio-scan.json --exclude=twilio-deep-scan.json --exclude=migration-state.json --exclude=MIGRATION-PLAN.md --exclude=MIGRATION-REPORT.md"

# --- Helpers ---

usage() {
  echo "Usage: $(basename "$0") <project-root> [--product <name>] [--json] [--scan-json <path>]"
  echo ""
  echo "Checks migrated Telnyx code for known anti-patterns and common mistakes."
  echo ""
  echo "Products: voice, messaging, verify, webrtc"
  exit 2
}

build_exclude_args() {
  local args=""
  for d in $EXCLUDE_DIRS; do
    args="$args --exclude-dir=$d"
  done
  args="$args $EXCLUDE_LOCK_FILES"
  args="$args $EXCLUDE_SCAN_FILES"
  args="$args --exclude=*.md --exclude=*.min.js"
  echo "$args"
}

GREP_EXCLUDES=""

search_files() {
  local pattern="$1"
  shift
  local include_args=""
  for glob in "$@"; do
    include_args="$include_args --include=$glob"
  done
  # shellcheck disable=SC2086
  grep -rn $GREP_EXCLUDES $include_args -E "$pattern" "$PROJECT_ROOT" 2>/dev/null || true
}

count_matches() {
  local matches="$1"
  if [ -z "$matches" ]; then
    echo "0"
    return
  fi
  echo "$matches" | grep -c . 2>/dev/null
}

matches_to_json() {
  local matches="$1"
  local files_json
  files_json=$(echo "$matches" | head -20 | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null)
  echo "{\"files\": $files_json}"
}

lint_issue() {
  local name="$1"
  local msg="$2"
  local fix="$3"
  local details="${4:-}"
  ISSUE_COUNT=$((ISSUE_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    if [ -n "$details" ]; then
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "issue" --arg f "$fix" --argjson d "$details" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": $d}]')
    else
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "issue" --arg f "$fix" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": null}]')
    fi
  else
    echo -e "  ${RED}ISSUE${NC}  $msg"
    echo -e "         ${BLUE}FIX${NC}:  $fix"
    if [ -n "$details" ]; then
      echo "$details" | jq -r '.files[]' 2>/dev/null | while read -r f; do
        echo -e "         - $f"
      done
    fi
  fi
}

lint_warn() {
  local name="$1"
  local msg="$2"
  local fix="$3"
  local details="${4:-}"
  WARN_COUNT=$((WARN_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    if [ -n "$details" ]; then
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "warn" --arg f "$fix" --argjson d "$details" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": $d}]')
    else
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "warn" --arg f "$fix" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": null}]')
    fi
  else
    echo -e "  ${YELLOW}WARN${NC}   $msg"
    echo -e "         ${BLUE}FIX${NC}:  $fix"
    if [ -n "$details" ]; then
      echo "$details" | jq -r '.files[]' 2>/dev/null | while read -r f; do
        echo -e "         - $f"
      done
    fi
  fi
}

lint_pass() {
  local name="$1"
  local msg="$2"
  PASS_COUNT=$((PASS_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "pass" \
      '. + [{"name": $n, "status": $s}]')
  else
    echo -e "  ${GREEN}PASS${NC}   $msg"
  fi
}

product_applies() {
  local check_products="$1"
  if [ "$PRODUCT_FILTER" = "all" ] || [ "$check_products" = "all" ]; then
    return 0
  fi
  echo "$check_products" | tr ',' '\n' | grep -qx "$PRODUCT_FILTER"
}

section_header() {
  if [ "$JSON_MODE" = false ]; then
    echo ""
    echo -e "${BOLD}$1${NC}"
  fi
}

# --- Argument parsing ---
if [ $# -lt 1 ]; then
  usage
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --product)
      if [ $# -lt 2 ]; then echo "Error: --product requires a value" >&2; usage; fi
      PRODUCT_FILTER="$2"
      shift 2
      ;;
    --json)
      JSON_MODE=true
      shift
      ;;
    --scan-json)
      if [ $# -lt 2 ]; then echo "Error: --scan-json requires a value" >&2; usage; fi
      SCAN_JSON="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Error: Unknown option '$1'" >&2
      usage
      ;;
    *)
      if [ -z "$PROJECT_ROOT" ]; then
        PROJECT_ROOT="$1"
      else
        echo "Error: Unexpected argument '$1'" >&2
        usage
      fi
      shift
      ;;
  esac
done

if [ -z "$PROJECT_ROOT" ]; then
  echo "Error: <project-root> is required" >&2
  usage
fi

if [ "$JSON_MODE" = true ] && ! command -v jq >/dev/null 2>&1; then
  echo "Error: --json requires jq" >&2
  exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: '$PROJECT_ROOT' is not a directory" >&2
  exit 2
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
GREP_EXCLUDES=$(build_exclude_args)

# Load scan context if provided (for context-aware checks like webhook validation)
ORIGINAL_HAD_WEBHOOK_VALIDATION="unknown"
SCAN_PRODUCTS=""
if [ -n "$SCAN_JSON" ] && [ -f "$SCAN_JSON" ] && command -v jq >/dev/null 2>&1; then
  ORIGINAL_HAD_WEBHOOK_VALIDATION=$(jq -r '.has_webhook_validation // false' "$SCAN_JSON" 2>/dev/null || echo "unknown")
  SCAN_PRODUCTS=$(jq -r '.products_used // [] | map(ascii_downcase) | join(",")' "$SCAN_JSON" 2>/dev/null || true)
fi

# Helper: returns 0 if a product was detected in the scan (or if no scan data)
scan_has_product() {
  local product="$1"
  if [ -z "$SCAN_PRODUCTS" ]; then
    return 0  # no scan data — be conservative, run the check
  fi
  echo "$SCAN_PRODUCTS" | tr ',' '\n' | grep -qx "$product"
}

# --- Header ---
if [ "$JSON_MODE" = false ]; then
  echo -e "${BOLD}Telnyx Correctness Linter${NC}"
  printf '%.0s═' {1..24}
  echo ""
  echo ""
  echo "Project: $PROJECT_ROOT"
  echo "Product: $PRODUCT_FILTER"
fi

# ============================================================
# MESSAGING ANTI-PATTERNS
# ============================================================
if product_applies "messaging"; then
  section_header "Messaging Correctness"

  # Check 1: .messages.create( — Twilio pattern, Telnyx uses .send() or messages.create differently
  matches=$(search_files '\.messages\.create\(' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "twilio_messages_create" \
      "Twilio .messages.create() pattern found in $count file(s)" \
      "Use telnyx.messages.send() (Python) or telnyx.messages.create() with text parameter (JS/Ruby)" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "twilio_messages_create" "No Twilio .messages.create() pattern found"
  fi

  # Check 2: body= or body: in message send context — Telnyx uses 'text' not 'body'
  matches=$(search_files '(\.send\(|\.create\().*body[=:]' "*.py" "*.js" "*.ts" "*.rb")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    # Filter to only lines that also reference telnyx or messaging context
    telnyx_context=$(echo "$matches" | grep -iE "telnyx|message|sms|mms" || true)
    tcount=$(count_matches "$telnyx_context")
    if [ "$tcount" -gt 0 ]; then
      lint_issue "body_not_text" \
        "Message send with 'body' parameter found in $tcount file(s)" \
        "Telnyx uses 'text' not 'body' for message content" \
        "$(matches_to_json "$telnyx_context")"
    else
      lint_pass "body_not_text" "No 'body' parameter in Telnyx messaging context"
    fi
  else
    lint_pass "body_not_text" "No 'body' parameter in message send calls"
  fi

  # Check 3: messaging_profile_id missing in send calls (skip if messaging not detected in scan)
  if scan_has_product "messaging"; then
    telnyx_send=$(search_files '(telnyx.*message|message.*send|messages\.create)' "*.py" "*.js" "*.ts" "*.rb" "*.go")
    send_count=$(count_matches "$telnyx_send")
    if [ "$send_count" -gt 0 ]; then
      profile_refs=$(search_files 'messaging_profile_id' "*.py" "*.js" "*.ts" "*.rb" "*.go")
      profile_count=$(count_matches "$profile_refs")
      if [ "$profile_count" -eq 0 ]; then
        lint_warn "missing_messaging_profile_id" \
          "Telnyx messaging calls found but no messaging_profile_id reference" \
          "Include messaging_profile_id in send calls or set a default on the messaging profile"
      else
        lint_pass "missing_messaging_profile_id" "messaging_profile_id referenced in code"
      fi
    fi
  fi

  # Check 4: MessagingResponse builder class (doesn't exist in Telnyx)
  matches=$(search_files 'MessagingResponse\(' "*.py" "*.js" "*.ts" "*.rb")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "messaging_response_builder" \
      "Twilio MessagingResponse() builder found in $count file(s)" \
      "Telnyx has no MessagingResponse builder — return JSON or use the SDK to send replies" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "messaging_response_builder" "No Twilio MessagingResponse builder found"
  fi
fi

# ============================================================
# VOICE ANTI-PATTERNS
# ============================================================
if product_applies "voice"; then
  section_header "Voice Correctness"

  # Check 5: VoiceResponse builder (Twilio TwiML — doesn't exist in Telnyx SDK)
  matches=$(search_files 'VoiceResponse\(' "*.py" "*.js" "*.ts" "*.rb" "*.java" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "voice_response_builder" \
      "Twilio VoiceResponse() builder found in $count file(s)" \
      "Telnyx uses TeXML (return XML directly) or Call Control API — no VoiceResponse builder class" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "voice_response_builder" "No Twilio VoiceResponse builder found"
  fi

  # Check 6: speechModel in TeXML/XML (not a valid Telnyx attribute)
  matches=$(search_files 'speechModel' "*.xml" "*.py" "*.js" "*.ts" "*.rb" "*.java" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "speech_model_attr" \
      "speechModel attribute found in $count file(s)" \
      "Remove speechModel — Telnyx uses transcriptionEngine for speech recognition config" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "speech_model_attr" "No speechModel attribute found"
  fi

  # Check 7: Recording URL stored without download logic (10-min expiry)
  # Skip if voice/recording not detected in scan
  if scan_has_product "voice"; then
    matches=$(search_files '(recording.*url|RecordingUrl|recording_url)' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java")
    count=$(count_matches "$matches")
    if [ "$count" -gt 0 ]; then
      lint_warn "recording_url_expiry" \
        "Recording URL references found in $count file(s)" \
        "Telnyx recording URLs expire after 10 minutes — download immediately upon receipt" \
        "$(matches_to_json "$matches")"
    else
      lint_pass "recording_url_expiry" "No recording URL references found"
    fi
  fi
fi

# ============================================================
# VERIFY ANTI-PATTERNS
# ============================================================
if product_applies "verify"; then
  section_header "Verify Correctness"

  # Check 8: status === 'approved' (Twilio) — Telnyx uses response_code === 'accepted'
  matches=$(search_files "(status.*[=!]=.*['\"]approved['\"]|['\"]approved['\"].*[=!]=.*status)" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "verify_status_approved" \
      "Twilio Verify status === 'approved' pattern found in $count file(s)" \
      "Telnyx uses response_code === 'accepted' (not status === 'approved')" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "verify_status_approved" "No Twilio Verify 'approved' status check found"
  fi

  # Check 9: verify_profile_id missing (skip if verify not detected in scan)
  if scan_has_product "verify"; then
    telnyx_verify=$(search_files '(telnyx.*verif|verif.*telnyx|verify_profile|verification)' "*.py" "*.js" "*.ts" "*.rb" "*.go")
    verify_count=$(count_matches "$telnyx_verify")
    if [ "$verify_count" -gt 0 ]; then
      profile_refs=$(search_files 'verify_profile_id' "*.py" "*.js" "*.ts" "*.rb" "*.go")
      profile_count=$(count_matches "$profile_refs")
      if [ "$profile_count" -eq 0 ]; then
        lint_warn "missing_verify_profile_id" \
          "Telnyx verify calls found but no verify_profile_id reference" \
          "Include verify_profile_id in verification requests"
      else
        lint_pass "missing_verify_profile_id" "verify_profile_id referenced in code"
      fi
    fi
  fi
fi

# ============================================================
# HALLUCINATED TELNYX METHOD NAMES (all products)
# ============================================================
# Catches common agent hallucinations — methods that don't exist in the Telnyx
# SDKs but look plausible by analogy to Twilio, Stripe, or older Telnyx APIs.
# Keep entries high-confidence (zero false-positive risk).
if product_applies "all"; then
  section_header "Hallucinated Method Names"

  # Entries must be high-confidence: the pattern should be something a user is
  # extremely unlikely to write for a legitimate non-Telnyx reason. Plain
  # `messages.create(` is intentionally NOT here — it's already covered by the
  # Twilio-pattern check in the Messaging section above, and matching it at
  # file-scope here produces false positives against internal app code that
  # happens to have a `messages` service/model.
  HALLUCINATED_METHODS=(
    'verifications\.submitVerification'   # correct: verifications.byPhoneNumber.actions.verify
    'verifications\.checkVerification'    # correct: verifications.byPhoneNumber.actions.verify
    'new TelnyxWebhook\('                 # not a real class — use client.webhooks.unwrap()
    'telnyx\.Webhook\.construct'          # Stripe-style, not Telnyx — use client.webhooks.unwrap()
  )

  hallucinated_hits=0
  for pattern in "${HALLUCINATED_METHODS[@]}"; do
    matches=$(search_files "$pattern" "*.py" "*.js" "*.ts" "*.rb" "*.go")
    count=$(count_matches "$matches")
    if [ "$count" -gt 0 ]; then
      hallucinated_hits=$((hallucinated_hits + count))
      lint_issue "hallucinated_method" \
        "Non-existent Telnyx method pattern '$pattern' found in $count location(s)" \
        "Consult {baseDir}/sdk-reference/{language}/{product}.md for the correct method signature" \
        "$(matches_to_json "$matches")"
    fi
  done
  if [ "$hallucinated_hits" -eq 0 ]; then
    lint_pass "hallucinated_method" "No hallucinated Telnyx method names found"
  fi
fi

# ============================================================
# WEBHOOK SIGNATURE VALIDATION
# ============================================================
if product_applies "all"; then
  section_header "Webhook Signature Validation"

  # Check 12: Webhook handlers without Ed25519 signature verification
  webhook_handlers=$(search_files "(app\.(post|put)|router\.(post|put)|@app\.route|@csrf_exempt|http\.HandleFunc|post.*do)" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
  webhook_count=$(count_matches "$webhook_handlers")
  if [ "$webhook_count" -gt 0 ]; then
    ed25519_refs=$(search_files "(telnyx-signature-ed25519|ed25519|verify_signature|verifySignature|construct_event|webhooks\.unwrap|TELNYX_PUBLIC_KEY)" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
    ed25519_count=$(count_matches "$ed25519_refs")
    telnyx_webhook_parse=$(search_files "(data\.payload|data\[.payload.\]|data\.event_type|data\[.event_type.\])" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
    telnyx_parse_count=$(count_matches "$telnyx_webhook_parse")
    if [ "$telnyx_parse_count" -gt 0 ] && [ "$ed25519_count" -eq 0 ]; then
      if [ "$ORIGINAL_HAD_WEBHOOK_VALIDATION" = "false" ]; then
        lint_warn "webhook_ed25519_missing" \
          "No Ed25519 signature verification found — original code did not validate webhooks either (not a regression)" \
          "Consider adding Ed25519 for production security, but this matches original behavior"
      else
        lint_issue "webhook_ed25519_missing" \
          "Webhook handlers parse Telnyx payloads but no Ed25519 signature verification found" \
          "Add Ed25519 verification using telnyx-signature-ed25519 + telnyx-timestamp headers. See webhook-migration.md" \
          "$(matches_to_json "$telnyx_webhook_parse")"
      fi
    elif [ "$ed25519_count" -gt 0 ]; then
      lint_pass "webhook_ed25519_missing" "Ed25519 webhook signature verification found"
    fi
  fi

  # Check 13: twilio.webhook() middleware still present (must be replaced, not just removed)
  # Use specific Twilio patterns to avoid false positives from generic validateRequest functions
  twilio_webhook_mw=$(search_files "(twilio\.webhook\(|@validate_twilio_request|RequestValidator\(|twilio.*validateRequest|validateExpressRequest)" "*.py" "*.js" "*.ts" "*.rb")
  twilio_mw_count=$(count_matches "$twilio_webhook_mw")
  if [ "$twilio_mw_count" -gt 0 ]; then
    lint_issue "twilio_webhook_middleware" \
      "Twilio webhook middleware/validator still present in $twilio_mw_count file(s)" \
      "Remove if original had validate:false (it was a no-op). Replace with Ed25519 if original actually validated." \
      "$(matches_to_json "$twilio_webhook_mw")"
  else
    lint_pass "twilio_webhook_middleware" "No Twilio webhook middleware found"
  fi
fi

# ============================================================
# POLLY VOICE COMPATIBILITY
# ============================================================
if product_applies "voice"; then
  section_header "Polly Voice Compatibility"

  # Check 14: Non-Neural Polly voices (may fall back to default voice)
  polly_refs=$(search_files "Polly\.[A-Z][a-z]+" "*.xml" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
  polly_count=$(count_matches "$polly_refs")
  if [ "$polly_count" -gt 0 ]; then
    non_neural=$(echo "$polly_refs" | grep -v "\-Neural" || true)
    non_neural_count=$(count_matches "$non_neural")
    if [ "$non_neural_count" -gt 0 ]; then
      lint_warn "polly_non_neural" \
        "Non-Neural Polly voice(s) found in $non_neural_count file(s) — may fall back to default voice" \
        "Prefer Neural variants: Polly.Amy-Neural instead of Polly.Amy. Or use voice=\"woman\" with language attribute." \
        "$(matches_to_json "$non_neural")"
    else
      lint_pass "polly_non_neural" "All Polly voices use Neural variants"
    fi
  else
    lint_pass "polly_non_neural" "No Polly voice references found"
  fi
fi

# ============================================================
# DOCUMENTATION FRESHNESS
# ============================================================
section_header "Documentation Updates"

# Check 15: README and docs still referencing Twilio
doc_files=""
for f in README.md README README.rst CONTRIBUTING.md; do
  if [ -f "$PROJECT_ROOT/$f" ]; then
    twilio_in_doc=$(grep -in "twilio" "$PROJECT_ROOT/$f" 2>/dev/null | grep -v -iE '(migrat|port|formerly|previously|was twilio|from twilio to)' || true)
    if [ -n "$twilio_in_doc" ]; then
      doc_files+="$PROJECT_ROOT/$f"$'\n'
    fi
  fi
done
doc_files=$(echo "$doc_files" | sed '/^$/d')
doc_count=$(echo "$doc_files" | sed '/^$/d' | wc -l | tr -d ' ')
if [ "$doc_count" -gt 0 ]; then
  lint_issue "docs_still_twilio" \
    "Documentation files still reference Twilio (not migration-related references) in $doc_count file(s)" \
    "Update README/docs: replace Twilio service names, env vars, setup instructions, and URLs with Telnyx equivalents" \
    "$(echo "$doc_files" | sed '/^$/d' | head -10 | jq -R -s '{files: (split("\n") | map(select(length > 0)))}' 2>/dev/null || echo '{"files":[]}')"
else
  lint_pass "docs_still_twilio" "No Twilio references in documentation files (README, CONTRIBUTING)"
fi

# ============================================================
# RESIDUAL TWILIO CODE
# ============================================================
section_header "Residual Twilio Patterns"

# Check 10: Residual Twilio imports still present alongside Telnyx code
matches=$(search_files '(from twilio|import twilio|require.*twilio|using Twilio)' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php" "*.cs")
count=$(count_matches "$matches")
if [ "$count" -gt 0 ]; then
  lint_issue "residual_twilio_imports" \
    "Residual Twilio imports found in $count file(s)" \
    "Remove Twilio imports — migration should replace them with Telnyx equivalents" \
    "$(matches_to_json "$matches")"
else
  lint_pass "residual_twilio_imports" "No residual Twilio imports found"
fi

# Check 11: Twilio client instantiation patterns
matches=$(search_files '(Client\(.*account_sid|Twilio\(|twilio\.Twilio\(|new Twilio\.)' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
count=$(count_matches "$matches")
if [ "$count" -gt 0 ]; then
  lint_issue "twilio_client_instantiation" \
    "Twilio client instantiation found in $count file(s)" \
    "Replace with Telnyx client: from telnyx import Telnyx; client = Telnyx(api_key=...) (Python) or new Telnyx({ apiKey: ... }) (JS)" \
    "$(matches_to_json "$matches")"
else
  lint_pass "twilio_client_instantiation" "No Twilio client instantiation found"
fi

# Check 12: Directory/path names containing "twilio"
twilio_dirs=$(find "$PROJECT_ROOT" -mindepth 1 \
  \( -name node_modules -o -name .git -o -name vendor -o -name __pycache__ \
     -o -name venv -o -name .venv -o -name dist -o -name build \) -prune \
  -o -type d -iname '*twilio*' -print 2>/dev/null || true)
twilio_dir_count=$(echo "$twilio_dirs" | sed '/^$/d' | wc -l | tr -d ' ')
if [ "$twilio_dir_count" -gt 0 ] && [ -n "$(echo "$twilio_dirs" | sed '/^$/d')" ]; then
  lint_issue "twilio_directory_names" \
    "Found $twilio_dir_count directory name(s) containing 'twilio'" \
    "Rename directories: replace 'twilio' with 'telnyx' in directory names (e.g., feature/twilio/ → feature/telnyx/)" \
    "$(echo "$twilio_dirs" | sed '/^$/d' | head -10 | jq -R -s '{directories: (split("\n") | map(select(length > 0)))}' 2>/dev/null || echo '{"directories":[]}')"
else
  lint_pass "twilio_directory_names" "No directory names containing 'twilio'"
fi

# ============================================================
# OUTPUT
# ============================================================

if [ "$JSON_MODE" = true ]; then
  jq -n \
    --arg root "$PROJECT_ROOT" \
    --arg product "$PRODUCT_FILTER" \
    --argjson checks "$JSON_CHECKS" \
    --argjson issues "$ISSUE_COUNT" \
    --argjson warns "$WARN_COUNT" \
    --argjson passes "$PASS_COUNT" \
    '{
      project_root: $root,
      product_filter: $product,
      checks: $checks,
      summary: { issues: $issues, warnings: $warns, passes: $passes },
      result: (if $issues > 0 then "issues_found" else "clean" end)
    }'
else
  echo ""
  echo -e "─────────────────────────────────────"
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}:    $PASS_COUNT"
  echo -e "  ${RED}Issues${NC}:  $ISSUE_COUNT"
  echo -e "  ${YELLOW}Warns${NC}:   $WARN_COUNT"
  echo ""
  if [ "$ISSUE_COUNT" -gt 0 ]; then
    echo -e "${RED}${BOLD}ISSUES FOUND${NC} — $ISSUE_COUNT correctness issue(s) in migrated code"
    echo "  Fix these before proceeding. Consult sdk-reference/ for correct Telnyx patterns."
  else
    echo -e "${GREEN}${BOLD}CLEAN${NC} — no correctness issues detected"
  fi
fi

if [ "$ISSUE_COUNT" -gt 0 ]; then
  exit 1
else
  exit 0
fi
