#!/usr/bin/env bash
#
# validate-migration.sh — Post-migration validation for Twilio-to-Telnyx codebases
#
# Usage:
#   bash validate-migration.sh <project-root> [--product <name>] [--json]
#
# Options:
#   <project-root>       Path to the project to validate (required)
#   --product <name>     Only check patterns for a specific product:
#                        voice, messaging, verify, webrtc, sip, fax, video, iot, lookup
#   --json               Output results as machine-readable JSON
#
# Exit codes:
#   0 — Fully migrated (all checks pass or warn)
#   1 — Issues found (one or more FAIL)
#   2 — Usage error

set -euo pipefail

# --- Colors (disabled if not a terminal) ---
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

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
JSON_MODE=false
PRODUCT_FILTER="all"
PROJECT_ROOT=""

EXCLUDE_DIRS="node_modules .git vendor __pycache__ venv .venv dist build"
EXCLUDE_FILES="MIGRATION-PLAN.md MIGRATION-REPORT.md"
EXCLUDE_LOCK_FILES="--exclude=package-lock.json --exclude=yarn.lock --exclude=pnpm-lock.yaml --exclude=Gemfile.lock --exclude=Pipfile.lock --exclude=poetry.lock --exclude=go.sum"

# JSON accumulator
JSON_CHECKS="[]"

# --- Helpers ---

usage() {
  echo "Usage: $(basename "$0") <project-root> [--product <name>] [--json]"
  echo ""
  echo "Products: voice, messaging, verify, webrtc, sip, fax, video, iot, lookup"
  exit 2
}

check_pass() {
  local name="$1"
  local msg="$2"
  PASS_COUNT=$((PASS_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "pass" \
      '. + [{"name": $n, "status": $s, "details": null}]')
  else
    echo -e "  ${GREEN}PASS${NC}  $msg"
  fi
}

check_fail() {
  local name="$1"
  local msg="$2"
  local details="${3:-}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    if [ -n "$details" ]; then
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "fail" --argjson d "$details" \
        '. + [{"name": $n, "status": $s, "details": $d}]')
    else
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "fail" \
        '. + [{"name": $n, "status": $s, "details": null}]')
    fi
  else
    echo -e "  ${RED}FAIL${NC}  $msg"
    if [ -n "$details" ]; then
      echo "$details" | jq -r '.files[]' 2>/dev/null | while read -r f; do
        echo -e "        - $f"
      done
    fi
  fi
}

check_warn() {
  local name="$1"
  local msg="$2"
  local details="${3:-}"
  WARN_COUNT=$((WARN_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    if [ -n "$details" ]; then
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "warn" --argjson d "$details" \
        '. + [{"name": $n, "status": $s, "details": $d}]')
    else
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "warn" \
        '. + [{"name": $n, "status": $s, "details": null}]')
    fi
  else
    echo -e "  ${YELLOW}WARN${NC}  $msg"
    if [ -n "$details" ]; then
      echo "$details" | jq -r '.files[]' 2>/dev/null | while read -r f; do
        echo -e "        - $f"
      done
    fi
  fi
}

section_header() {
  if [ "$JSON_MODE" = false ]; then
    echo ""
    echo -e "${BOLD}$1${NC}"
  fi
}

# Build grep exclude arguments
build_exclude_args() {
  local args=""
  for d in $EXCLUDE_DIRS; do
    args="$args --exclude-dir=$d"
  done
  # Exclude lock files (contain dependency version strings, not source code)
  args="$args $EXCLUDE_LOCK_FILES"
  echo "$args"
}

GREP_EXCLUDES=""

# Search helper: returns matching file:line entries
# Usage: search_files <pattern> [file-glob...]
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

# Search helper that excludes .md files and minified JS (for config/env var checks)
# Avoids false positives from migration docs that reference old env var names
search_source_files() {
  local pattern="$1"
  shift
  local include_args=""
  for glob in "$@"; do
    include_args="$include_args --include=$glob"
  done
  # shellcheck disable=SC2086
  grep -rn $GREP_EXCLUDES --exclude='*.md' --exclude='*.min.js' $include_args -E "$pattern" "$PROJECT_ROOT" 2>/dev/null || true
}

# Search helper that filters out comment-only lines to reduce false positives.
# Strips lines where the match is in a comment (# // /* -- %) before counting.
search_code_only() {
  local pattern="$1"
  shift
  local raw
  raw=$(search_files "$pattern" "$@")
  if [ -z "$raw" ]; then
    echo ""
    return
  fi
  # Filter out lines that are comments (leading # // /* -- % after optional whitespace)
  echo "$raw" | grep -v '^\([^:]*:[0-9]*:\)\s*\(#\|//\|/\*\|\*\|--\|%\|<!--\)' || true
}

# Convert grep output lines to JSON files array
matches_to_json() {
  local matches="$1"
  local files_json
  files_json=$(echo "$matches" | head -20 | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null)
  echo "{\"files\": $files_json}"
}

count_matches() {
  local matches="$1"
  if [ -z "$matches" ]; then
    echo "0"
    return
  fi
  echo "$matches" | grep -c . 2>/dev/null
}

# --- Product filter helpers ---
# Returns 0 (true) if a check should run for the current product filter
product_applies() {
  local check_products="$1"  # comma-separated list, or "all"
  if [ "$PRODUCT_FILTER" = "all" ] || [ "$check_products" = "all" ]; then
    return 0
  fi
  echo "$check_products" | tr ',' '\n' | grep -qx "$PRODUCT_FILTER"
}

# --- Argument parsing ---
if [ $# -lt 1 ]; then
  usage
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --product)
      if [ $# -lt 2 ]; then
        echo "Error: --product requires a value" >&2
        usage
      fi
      PRODUCT_FILTER="$2"
      case "$PRODUCT_FILTER" in
        voice|messaging|verify|webrtc|sip|fax|video|iot|lookup) ;;
        *)
          echo "Error: Unknown product '$PRODUCT_FILTER'" >&2
          echo "Valid products: voice, messaging, verify, webrtc, sip, fax, video, iot, lookup" >&2
          exit 2
          ;;
      esac
      shift 2
      ;;
    --json)
      JSON_MODE=true
      shift
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

if [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: '$PROJECT_ROOT' is not a directory" >&2
  exit 2
fi

# Resolve to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

# Build grep exclude args
GREP_EXCLUDES=$(build_exclude_args)

# --- Header ---
if [ "$JSON_MODE" = false ]; then
  echo -e "${BOLD}Telnyx Migration Validation${NC}"
  printf '%.0s═' {1..27}
  echo ""
  echo ""
  echo "Project: $PROJECT_ROOT"
  echo "Product: $PRODUCT_FILTER"
fi

# ============================================================
# RESIDUAL TWILIO REFERENCES
# ============================================================
section_header "Residual Twilio References"

# --- Check 1: Twilio SDK imports ---
# Python
if product_applies "all"; then
  matches=$(search_files "(from twilio|import twilio)" "*.py")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_python_imports" "Twilio Python imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_python_imports" "No Twilio Python imports found"
  fi
fi

# JavaScript / TypeScript
if product_applies "all"; then
  matches=$(search_files "(require\(['\"]twilio['\"]|from ['\"]twilio['\"])" "*.js" "*.ts" "*.jsx" "*.tsx" "*.mjs" "*.cjs")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_js_imports" "Twilio JS/TS imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_js_imports" "No Twilio JS/TS imports found"
  fi
fi

# Go
if product_applies "all"; then
  matches=$(search_files "github\.com/twilio/twilio-go" "*.go" "go.mod" "go.sum")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_go_imports" "Twilio Go imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_go_imports" "No Twilio Go imports found"
  fi
fi

# Ruby
if product_applies "all"; then
  matches=$(search_files "(require ['\"]twilio-ruby['\"]|require ['\"]twilio['\"])" "*.rb")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_ruby_imports" "Twilio Ruby imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_ruby_imports" "No Twilio Ruby imports found"
  fi
fi

# Java
if product_applies "all"; then
  matches=$(search_files "import com\.twilio\." "*.java" "*.kt" "*.scala")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_java_imports" "Twilio Java imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_java_imports" "No Twilio Java imports found"
  fi
fi

# PHP
if product_applies "all"; then
  matches=$(search_files "(use Twilio|require.*twilio.php)" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_php_imports" "Twilio PHP imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_php_imports" "No Twilio PHP imports found"
  fi
fi

# C#
if product_applies "all"; then
  matches=$(search_files "using Twilio" "*.cs")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_csharp_imports" "Twilio C# imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_csharp_imports" "No Twilio C# imports found"
  fi
fi

# --- Check 2: Twilio API URLs (excludes .md docs and minified JS) ---
if product_applies "all"; then
  matches=$(search_source_files "(api\.twilio\.com|verify\.twilio\.com|video\.twilio\.com|taskrouter\.twilio\.com|chat\.twilio\.com|conversations\.twilio\.com|sync\.twilio\.com|proxy\.twilio\.com|studio\.twilio\.com)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_api_urls" "Twilio API URLs found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_api_urls" "No Twilio API URLs found"
  fi
fi

# --- Check 3: Twilio env vars (excludes .md docs and minified JS) ---
if product_applies "all"; then
  matches=$(search_source_files "(TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_API_KEY|TWILIO_API_SECRET|TWILIO_SID)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_env_vars" "Twilio environment variables found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_env_vars" "No Twilio environment variables found"
  fi
fi

# --- Check 4: Twilio signature validation ---
if product_applies "all"; then
  matches=$(search_files "(RequestValidator|X-Twilio-Signature|twilio\.validateRequest|validate_request)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_signature_validation" "Twilio signature validation patterns found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_signature_validation" "No Twilio signature validation patterns found"
  fi
fi

# --- Check 5: TwiML files ---
if product_applies "voice,messaging,fax"; then
  matches=$(search_files "(<Response>.*<(Say|Dial|Gather|Record|Message|Redirect|Reject|Pause|Enqueue|Play)|TwiML|twiml)" "*.xml" "*.twiml")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_warn "twiml_files" "TwiML patterns found in $count file(s) (may be intentional TeXML):" "$(matches_to_json "$matches")"
  else
    check_pass "twiml_files" "No TwiML files found"
  fi
fi

# ============================================================
# TELNYX SDK PRESENT
# ============================================================
section_header "Telnyx SDK Present"

# --- Check 6: Telnyx SDK in dependency files ---
if product_applies "all"; then
  dep_matches=""
  # Python
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/{requirements.txt,setup.py,setup.cfg,pyproject.toml,Pipfile} 2>/dev/null || true)
  # Node
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l '"telnyx"' "$PROJECT_ROOT"/package.json 2>/dev/null || true)
  # Ruby
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/Gemfile 2>/dev/null || true)
  # Go
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/go.mod 2>/dev/null || true)
  # Java
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/{pom.xml,build.gradle,build.gradle.kts} 2>/dev/null || true)
  # PHP
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/composer.json 2>/dev/null || true)
  # C#
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "Telnyx" "$PROJECT_ROOT"/*.csproj 2>/dev/null || true)

  dep_matches=$(echo "$dep_matches" | sed '/^$/d')
  count=$(count_matches "$dep_matches")
  if [ "$count" -gt 0 ]; then
    check_pass "telnyx_sdk_dependency" "Telnyx SDK found in dependency file(s)"
  else
    check_fail "telnyx_sdk_dependency" "Telnyx SDK not found in any dependency file (requirements.txt, package.json, Gemfile, etc.)"
  fi
fi

# --- Check 7: Telnyx imports in source code ---
if product_applies "all"; then
  matches=$(search_files "(import telnyx|from telnyx|require.*telnyx|use Telnyx|using Telnyx|github\.com/telnyx)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_pass "telnyx_source_imports" "Telnyx imports found in $count source file(s)"
  else
    check_warn "telnyx_source_imports" "No Telnyx imports found in source code (may use REST API directly)"
  fi
fi

# ============================================================
# AUTH PATTERNS
# ============================================================
section_header "Auth Patterns"

# --- Check 8: Bearer auth ---
if product_applies "all"; then
  matches=$(search_files "(Authorization.*Bearer|bearer.*auth|Bearer.*TELNYX|TELNYX.*Bearer)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_pass "bearer_auth" "Bearer auth pattern found in $count file(s)"
  else
    check_pass "bearer_auth" "No explicit Bearer auth pattern (SDK may handle this)"
  fi
fi

# --- Check 9: Basic auth (residual Twilio AccountSid:AuthToken) ---
if product_applies "all"; then
  matches=$(search_files "(Authorization.*Basic|BasicAuth|basic_auth.*account_sid|AccountSid.*AuthToken)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_warn "basic_auth_residual" "Basic auth patterns found in $count file(s) (could be residual Twilio AccountSid:AuthToken):" "$(matches_to_json "$matches")"
  else
    check_pass "basic_auth_residual" "No Basic auth patterns found (good — Telnyx uses Bearer tokens)"
  fi
fi

# ============================================================
# WEBHOOK VALIDATION
# ============================================================
section_header "Webhook Validation"

# --- Check 10: Ed25519 signature validation ---
if product_applies "voice,messaging,verify,sip,fax"; then
  matches=$(search_files "(ed25519|Ed25519|telnyx-signature-ed25519|verify_signature|webhook.*signature.*telnyx)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_pass "ed25519_validation" "Ed25519 webhook signature validation found in $count file(s)"
  else
    check_warn "ed25519_validation" "No Ed25519 webhook signature validation found (recommended for production)"
  fi
fi

# --- Check 11: HMAC-SHA1 patterns (Twilio's old validation) ---
if product_applies "all"; then
  matches=$(search_files "(hmac.*sha1|HMAC.*SHA1|hmac-sha1|createHmac.*sha1)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail "hmac_sha1_validation" "HMAC-SHA1 validation patterns found in $count file(s) (Twilio's webhook validation — replace with Ed25519):" "$(matches_to_json "$matches")"
  else
    check_pass "hmac_sha1_validation" "No HMAC-SHA1 validation patterns found"
  fi
fi

# ============================================================
# CONFIG CLEANUP
# ============================================================
section_header "Config Cleanup"

# --- Check 12: Twilio in dependency files ---
if product_applies "all"; then
  twilio_dep_matches=""
  twilio_dep_matches+=$(grep -rn "twilio" "$PROJECT_ROOT"/{requirements.txt,setup.py,setup.cfg,pyproject.toml,Pipfile} 2>/dev/null || true)
  twilio_dep_matches+=$(grep -rn '"twilio"' "$PROJECT_ROOT"/package.json 2>/dev/null || true)
  twilio_dep_matches+=$(grep -rn "twilio" "$PROJECT_ROOT"/Gemfile 2>/dev/null || true)
  twilio_dep_matches+=$(grep -rn "twilio" "$PROJECT_ROOT"/go.mod 2>/dev/null || true)
  twilio_dep_matches+=$(grep -rn "twilio" "$PROJECT_ROOT"/{pom.xml,build.gradle,build.gradle.kts} 2>/dev/null || true)
  twilio_dep_matches+=$(grep -rn "twilio" "$PROJECT_ROOT"/composer.json 2>/dev/null || true)
  twilio_dep_matches+=$(grep -rn "Twilio" "$PROJECT_ROOT"/*.csproj 2>/dev/null || true)

  twilio_dep_matches=$(echo "$twilio_dep_matches" | sed '/^$/d')
  count=$(count_matches "$twilio_dep_matches")
  if [ "$count" -gt 0 ]; then
    check_fail "twilio_in_dependencies" "Twilio still in dependency files ($count reference(s)):" "$(matches_to_json "$twilio_dep_matches")"
  else
    check_pass "twilio_in_dependencies" "No Twilio references in dependency files"
  fi
fi

# --- Check 13: TELNYX_API_KEY referenced ---
if product_applies "all"; then
  matches=$(search_files "TELNYX_API_KEY")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_pass "telnyx_api_key_config" "TELNYX_API_KEY referenced in $count file(s)"
  else
    check_warn "telnyx_api_key_config" "TELNYX_API_KEY not referenced in any config or source file"
  fi
fi

# ============================================================
# OUTPUT
# ============================================================

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))

if [ "$FAIL_COUNT" -gt 0 ]; then
  RESULT="incomplete"
  EXIT_CODE=1
else
  RESULT="complete"
  EXIT_CODE=0
fi

if [ "$JSON_MODE" = true ]; then
  jq -n \
    --arg root "$PROJECT_ROOT" \
    --arg product "$PRODUCT_FILTER" \
    --argjson checks "$JSON_CHECKS" \
    --argjson pass "$PASS_COUNT" \
    --argjson fail "$FAIL_COUNT" \
    --argjson warn "$WARN_COUNT" \
    --arg result "$RESULT" \
    '{
      project_root: $root,
      product_filter: $product,
      checks: $checks,
      summary: { pass: $pass, fail: $fail, warn: $warn },
      result: $result
    }'
else
  echo ""
  echo -e "─────────────────────────────────────"
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}: $PASS_COUNT"
  echo -e "  ${RED}Fail${NC}: $FAIL_COUNT"
  echo -e "  ${YELLOW}Warn${NC}: $WARN_COUNT"
  echo ""
  if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}${BOLD}MIGRATION INCOMPLETE${NC} — $FAIL_COUNT issue(s) require attention"
  else
    echo -e "${GREEN}${BOLD}MIGRATION COMPLETE${NC} — all checks passed"
  fi
fi

exit "$EXIT_CODE"
