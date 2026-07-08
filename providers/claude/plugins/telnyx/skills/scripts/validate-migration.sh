#!/usr/bin/env bash
#
# validate-migration.sh — Post-migration validation for Twilio-to-Telnyx codebases
#
# Usage:
#   bash validate-migration.sh <project-root> [--product <name>] [--json]
#                        [--exclude-dir <dir>] [--scan-json <path>]
#
# Options:
#   <project-root>       Path to the project to validate (required)
#   --product <name>     Only check patterns for a specific product:
#                        voice, messaging, verify, webrtc, sip, fax, video, iot, lookup
#   --json               Output results as machine-readable JSON
#   --exclude-dir <dir>  Additional directory to exclude (repeatable)
#   --scan-json <path>   Path to twilio-scan.json for context-aware checks
#
# Exit codes:
#   0 — Fully migrated (all checks pass or warn)
#   1 — Issues found (one or more FAIL)
#   2 — Usage error

set -euo pipefail

# --- Colors (disabled if not a terminal) ---
# shellcheck disable=SC2034  # BLUE reserved for info lines; kept for palette consistency
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
STATE_FILE=""
SCAN_JSON=""
KEPT_ON_TWILIO=""
EXTRA_EXCLUDE_DIRS=""

EXCLUDE_DIRS="node_modules .git vendor __pycache__ venv .venv dist build"
EXCLUDE_FILES="MIGRATION-PLAN.md MIGRATION-REPORT.md twilio-scan.json twilio-deep-scan.json migration-state.json"
EXCLUDE_LOCK_FILES="--exclude=package-lock.json --exclude=yarn.lock --exclude=pnpm-lock.yaml --exclude=Gemfile.lock --exclude=Pipfile.lock --exclude=poetry.lock --exclude=go.sum"

# JSON accumulator
JSON_CHECKS="[]"

# --- Helpers ---

usage() {
  echo "Usage: $(basename "$0") <project-root> [--product <name>] [--json] [--state-file <path>]"
  echo "       [--exclude-dir <dir>] [--scan-json <path>]"
  echo ""
  echo "Products: voice, messaging, verify, webrtc, sip, fax, video, iot, lookup"
  echo ""
  echo "Options:"
  echo "  --state-file <path>   Path to migration-state.json for hybrid deployment awareness"
  echo "  --exclude-dir <dir>   Additional directory to exclude from scanning (repeatable)"
  echo "  --scan-json <path>    Path to twilio-scan.json for context-aware validation"
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

# Downgrade FAIL to WARN when hybrid deployment keeps some products on Twilio.
# Use this instead of check_fail for checks that flag residual Twilio references
# (imports, env vars, dependencies) which are expected in hybrid mode.
check_fail_or_hybrid_warn() {
  if [ -n "$KEPT_ON_TWILIO" ]; then
    check_warn "$1" "$2 (hybrid deployment — $KEPT_ON_TWILIO kept on Twilio)" "${3:-}"
  else
    check_fail "$1" "$2" "${3:-}"
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
  for d in $EXCLUDE_DIRS $EXTRA_EXCLUDE_DIRS; do
    args="$args --exclude-dir=$d"
  done
  # Exclude lock files (contain dependency version strings, not source code)
  args="$args $EXCLUDE_LOCK_FILES"
  # Exclude migration artifacts (contain Twilio references by design)
  for f in $EXCLUDE_FILES; do
    args="$args --exclude=$f"
  done
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
    --state-file)
      if [ $# -lt 2 ]; then
        echo "Error: --state-file requires a value" >&2
        usage
      fi
      STATE_FILE="$2"
      shift 2
      ;;
    --exclude-dir)
      if [ $# -lt 2 ]; then
        echo "Error: --exclude-dir requires a value" >&2
        usage
      fi
      EXTRA_EXCLUDE_DIRS="$EXTRA_EXCLUDE_DIRS $2"
      shift 2
      ;;
    --scan-json)
      if [ $# -lt 2 ]; then
        echo "Error: --scan-json requires a value" >&2
        usage
      fi
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

# Verify jq is available when JSON mode is requested
if [ "$JSON_MODE" = true ] && ! command -v jq >/dev/null 2>&1; then
  echo "Error: --json requires jq. Install: brew install jq / apt-get install jq" >&2
  exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: '$PROJECT_ROOT' is not a directory" >&2
  exit 2
fi

# Resolve to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

# Load hybrid deployment state if state file provided
if [ -n "$STATE_FILE" ] && [ -f "$STATE_FILE" ]; then
  if command -v jq >/dev/null 2>&1; then
    KEPT_ON_TWILIO=$(jq -r '.kept_on_twilio // {} | keys | join(",")' "$STATE_FILE" 2>/dev/null || true)
  fi
elif [ -n "$STATE_FILE" ] && [ ! -f "$STATE_FILE" ]; then
  echo "Warning: --state-file '$STATE_FILE' not found, ignoring" >&2
fi

# Load scan context if provided (for context-aware checks like TeXML detection)
SCAN_PRODUCTS=""
ORIGINAL_HAD_WEBHOOK_VALIDATION="unknown"
if [ -n "$SCAN_JSON" ] && [ -f "$SCAN_JSON" ] && command -v jq >/dev/null 2>&1; then
  SCAN_PRODUCTS=$(jq -r '.products_used // [] | map(ascii_downcase) | join(",")' "$SCAN_JSON" 2>/dev/null || true)
  ORIGINAL_HAD_WEBHOOK_VALIDATION=$(jq -r '.has_webhook_validation // false' "$SCAN_JSON" 2>/dev/null || echo "unknown")
fi

# Helper: returns 0 if project is TeXML/voice-only (no SDK imports expected)
is_texml_only() {
  if [ -z "$SCAN_PRODUCTS" ]; then
    return 1  # no scan data, can't determine
  fi
  # If products are only voice/texml (no messaging, verify, etc.), it's TeXML-only
  local non_voice
  non_voice=$(echo "$SCAN_PRODUCTS" | tr ',' '\n' | grep -v -E '^(voice|texml|fax)$' | head -1)
  [ -z "$non_voice" ]
}

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
    check_fail_or_hybrid_warn "twilio_python_imports" "Twilio Python imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_python_imports" "No Twilio Python imports found"
  fi
fi

# JavaScript / TypeScript
if product_applies "all"; then
  matches=$(search_files "(require\(['\"]twilio['\"]|from ['\"]twilio['\"])" "*.js" "*.ts" "*.jsx" "*.tsx" "*.mjs" "*.cjs")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_js_imports" "Twilio JS/TS imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_js_imports" "No Twilio JS/TS imports found"
  fi
fi

# Go
if product_applies "all"; then
  matches=$(search_files "github\.com/twilio/twilio-go" "*.go" "go.mod" "go.sum")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_go_imports" "Twilio Go imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_go_imports" "No Twilio Go imports found"
  fi
fi

# Ruby
if product_applies "all"; then
  matches=$(search_files "(require ['\"]twilio-ruby['\"]|require ['\"]twilio['\"])" "*.rb")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_ruby_imports" "Twilio Ruby imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_ruby_imports" "No Twilio Ruby imports found"
  fi
fi

# Java
if product_applies "all"; then
  matches=$(search_files "import com\.twilio\." "*.java" "*.kt" "*.scala")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_java_imports" "Twilio Java imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_java_imports" "No Twilio Java imports found"
  fi
fi

# PHP
if product_applies "all"; then
  matches=$(search_files "(use Twilio|require.*twilio.php)" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_php_imports" "Twilio PHP imports found in $count file(s):" "$(matches_to_json "$matches")"
  else
    check_pass "twilio_php_imports" "No Twilio PHP imports found"
  fi
fi

# C#
if product_applies "all"; then
  matches=$(search_files "using Twilio" "*.cs")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_csharp_imports" "Twilio C# imports found in $count file(s):" "$(matches_to_json "$matches")"
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
  matches=$(search_source_files "(TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_API_KEY|TWILIO_API_SECRET|TWILIO_SID|TWILIO_NUMBER|TWILIO_PHONE_NUMBER|TWILIO_MESSAGING_SERVICE_SID|TWILIO_VERIFY_SERVICE_SID|TWILIO_TWIML_APP_SID)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_fail_or_hybrid_warn "twilio_env_vars" "Twilio environment variables found in $count file(s):" "$(matches_to_json "$matches")"
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
  # Python (root + subdirectories)
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 \( -name requirements.txt -o -name setup.py -o -name setup.cfg -o -name pyproject.toml -o -name Pipfile \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/vendor/*" -exec grep -l "telnyx" {} \; 2>/dev/null || true)
  # Node (root + subdirectories)
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name package.json -not -path "*/node_modules/*" -not -path "*/.git/*" -exec grep -l '"telnyx"\|"@telnyx/' {} \; 2>/dev/null || true)
  # Ruby
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name Gemfile -not -path "*/vendor/*" -exec grep -l "telnyx" {} \; 2>/dev/null || true)
  # Go
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/go.mod 2>/dev/null || true)
  # Java/Kotlin (build.gradle, build.gradle.kts, pom.xml, libs.versions.toml)
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 4 \( -name pom.xml -o -name build.gradle -o -name build.gradle.kts -o -name "libs.versions.toml" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/build/*" -exec grep -l "telnyx" {} \; 2>/dev/null || true)
  # iOS (Swift Package Manager — project.pbxproj, Package.swift)
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 4 \( -name "project.pbxproj" -o -name "Package.swift" \) -not -path "*/.git/*" -exec grep -l -i "telnyx" {} \; 2>/dev/null || true)
  # PHP
  dep_matches+=$(grep -rn $GREP_EXCLUDES -l "telnyx" "$PROJECT_ROOT"/composer.json 2>/dev/null || true)
  # C#
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name "*.csproj" -exec grep -l "Telnyx" {} \; 2>/dev/null || true)
  # Flutter
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name pubspec.yaml -exec grep -l "telnyx" {} \; 2>/dev/null || true)
  # CocoaPods
  dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name Podfile -exec grep -l -i "telnyx" {} \; 2>/dev/null || true)

  dep_matches=$(echo "$dep_matches" | sed '/^$/d')
  count=$(count_matches "$dep_matches")
  if [ "$count" -gt 0 ]; then
    check_pass "telnyx_sdk_dependency" "Telnyx SDK found in dependency file(s)"
  elif is_texml_only; then
    check_pass "telnyx_sdk_dependency" "No Telnyx SDK in dependencies (expected for TeXML/voice-only apps)"
  else
    # Before failing, check if Telnyx imports exist in source — if so, SDK is present
    # but in a dependency file we don't recognize (e.g., monorepo, custom build system)
    source_imports=$(search_files "(import telnyx|from telnyx|require.*telnyx|use Telnyx|using Telnyx|github\.com/telnyx|@telnyx/|com\.telnyx\.|TelnyxRTC|TelnyxClient)")
    source_count=$(count_matches "$source_imports")
    if [ "$source_count" -gt 0 ]; then
      check_warn "telnyx_sdk_dependency" "Telnyx SDK not found in standard dependency files, but Telnyx imports found in $source_count source file(s) — likely using a non-standard dependency manager"
    else
      check_fail "telnyx_sdk_dependency" "Telnyx SDK not found in any dependency file (requirements.txt, package.json, Gemfile, build.gradle, project.pbxproj, etc.)"
    fi
  fi

  # --- Check 6a: Telnyx SDK version pinning ---
  version_pinned=false
  # Python: check for version constraint (>=, <, ~=, ==)
  if grep -qE 'telnyx[><=~!]+' "$PROJECT_ROOT"/{requirements.txt,setup.py,setup.cfg,pyproject.toml,Pipfile} 2>/dev/null; then
    version_pinned=true
  fi
  # Node: check package.json for version constraint (^, ~, >=)
  if grep -qE '"telnyx"\s*:\s*"[\^~>=]' "$PROJECT_ROOT"/package.json 2>/dev/null; then
    version_pinned=true
  fi
  # Ruby: check Gemfile for version constraint (~>)
  if grep -qE "gem\s+['\"]telnyx['\"].*~>" "$PROJECT_ROOT"/Gemfile 2>/dev/null; then
    version_pinned=true
  fi
  # If no dependency files found at all, skip the check
  has_deps=false
  for f in requirements.txt setup.py setup.cfg pyproject.toml Pipfile package.json Gemfile go.mod; do
    if [ -f "$PROJECT_ROOT/$f" ]; then has_deps=true; break; fi
  done
  if [ "$has_deps" = true ]; then
    if [ "$version_pinned" = true ]; then
      check_pass "telnyx_sdk_version_pinned" "Telnyx SDK version is pinned in dependency file"
    else
      check_warn "telnyx_sdk_version_pinned" "Telnyx SDK has no version constraint — pin to a major version (e.g., telnyx>=4.0,<5.0 for Python, telnyx@^6 for Node, ~> 5.0 for Ruby) to prevent breaking changes on upgrade"
    fi
  fi
fi

# --- Check 6b: Telnyx mobile SDK in dependency files ---
if product_applies "webrtc"; then
  mobile_dep_matches=""
  # iOS (CocoaPods)
  mobile_dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name Podfile -exec grep -l -i "TelnyxRTC\|TelnyxVideo\|telnyx" {} \; 2>/dev/null || true)
  # iOS (Swift Package Manager — Package.swift and project.pbxproj)
  mobile_dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 4 \( -name "Package.swift" -o -name "project.pbxproj" \) -not -path "*/.git/*" -exec grep -l -i "telnyx" {} \; 2>/dev/null || true)
  # Android (Kotlin/Java — build.gradle, build.gradle.kts, libs.versions.toml)
  mobile_dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 4 \( -name "build.gradle" -o -name "build.gradle.kts" -o -name "libs.versions.toml" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/build/*" -exec grep -l -i "telnyx" {} \; 2>/dev/null || true)
  # React Native
  mobile_dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name package.json -not -path "*/node_modules/*" -exec grep -l "@telnyx/react-native\|@telnyx/webrtc" {} \; 2>/dev/null || true)
  # Flutter (Dart)
  mobile_dep_matches+=$(find "$PROJECT_ROOT" -maxdepth 3 -name pubspec.yaml -exec grep -l "telnyx" {} \; 2>/dev/null || true)

  mobile_dep_matches=$(echo "$mobile_dep_matches" | sed '/^$/d')
  count=$(count_matches "$mobile_dep_matches")
  if [ "$count" -gt 0 ]; then
    check_pass "telnyx_mobile_sdk_dependency" "Telnyx mobile SDK found in dependency file(s)"
  else
    # Only warn if we detected Twilio mobile SDKs
    twilio_mobile=$(search_files "(TwilioVoiceSDK|import TwilioVoice|com\.twilio\.voice|com\.twilio:voice-android|@twilio/voice-react-native|twilio_voice)" "*.swift" "*.kt" "*.java" "*.dart" "*.tsx" "*.ts" "*.js")
    twilio_mobile_count=$(count_matches "$twilio_mobile")
    if [ "$twilio_mobile_count" -gt 0 ]; then
      check_warn "telnyx_mobile_sdk_dependency" "Twilio mobile SDK detected but no Telnyx mobile SDK found in dependencies (Podfile, pubspec.yaml, build.gradle)"
    fi
  fi
fi

# --- Check 7: Telnyx imports in source code ---
if product_applies "all"; then
  matches=$(search_files "(import telnyx|from telnyx|require.*telnyx|use Telnyx|using Telnyx|github\.com/telnyx)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_pass "telnyx_source_imports" "Telnyx imports found in $count source file(s)"
  elif is_texml_only; then
    check_pass "telnyx_source_imports" "No Telnyx imports (expected for TeXML/voice-only apps that return XML directly)"
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
  matches=$(search_files "(ed25519|Ed25519|telnyx-signature-ed25519|verify_signature|construct_event|webhooks\.unwrap|webhook.*signature.*telnyx)")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    check_pass "ed25519_validation" "Ed25519 webhook signature validation found in $count file(s)"
  else
    # Check if the project has webhook handlers — if so, missing validation is a FAIL
    webhook_handlers=$(search_files "(app\.(post|put)|router\.(post|put)|@app\.route|@csrf_exempt|HandleFunc|post '/)" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
    webhook_count=$(count_matches "$webhook_handlers")
    # Also check for Telnyx webhook payload parsing (data.payload, event_type)
    telnyx_webhook_parse=$(search_files "(data\.payload|data\[.payload.\]|event_type|data\.event_type)" "*.py" "*.js" "*.ts" "*.rb" "*.go")
    telnyx_parse_count=$(count_matches "$telnyx_webhook_parse")
    if [ "$telnyx_parse_count" -gt 0 ]; then
      if [ "$ORIGINAL_HAD_WEBHOOK_VALIDATION" = "false" ]; then
        check_warn "ed25519_validation" "No Ed25519 webhook signature validation found — original code did not validate webhooks either (no RequestValidator/X-Twilio-Signature detected in scan). Consider adding Ed25519 for production security, but this is not a regression."
      else
        check_fail "ed25519_validation" "Webhook handlers parse Telnyx payloads but NO Ed25519 signature validation found — production webhooks are vulnerable to spoofing. Add verification using the pattern in references/webhook-migration.md"
      fi
    elif [ "$webhook_count" -gt 0 ]; then
      if [ "$ORIGINAL_HAD_WEBHOOK_VALIDATION" = "false" ]; then
        check_pass "ed25519_validation" "No Ed25519 webhook signature validation found — original code did not validate webhooks either (not a regression)"
      else
        check_warn "ed25519_validation" "No Ed25519 webhook signature validation found — add verification for production security (see references/webhook-migration.md)"
      fi
    else
      check_pass "ed25519_validation" "No webhook handlers detected — Ed25519 validation not applicable"
    fi
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
    check_warn "twilio_in_dependencies" "Twilio still in dependency files ($count reference(s)) — remove in Phase 6 cleanup:" "$(matches_to_json "$twilio_dep_matches")"
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

if [ "$FAIL_COUNT" -gt 0 ]; then
  RESULT="incomplete"
  EXIT_CODE=1
else
  RESULT="complete"
  EXIT_CODE=0
fi

if [ "$JSON_MODE" = true ]; then
  HYBRID_JSON="null"
  if [ -n "$KEPT_ON_TWILIO" ]; then
    HYBRID_JSON=$(echo "$KEPT_ON_TWILIO" | tr ',' '\n' | jq -R -s 'split("\n") | map(select(length > 0))')
  fi
  jq -n \
    --arg root "$PROJECT_ROOT" \
    --arg product "$PRODUCT_FILTER" \
    --argjson checks "$JSON_CHECKS" \
    --argjson pass "$PASS_COUNT" \
    --argjson fail "$FAIL_COUNT" \
    --argjson warn "$WARN_COUNT" \
    --arg result "$RESULT" \
    --argjson hybrid "$HYBRID_JSON" \
    '{
      project_root: $root,
      product_filter: $product,
      checks: $checks,
      summary: { pass: $pass, fail: $fail, warn: $warn },
      result: $result,
      hybrid_products_on_twilio: $hybrid
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
  if [ -n "$KEPT_ON_TWILIO" ]; then
    echo ""
    echo -e "${YELLOW}${BOLD}HYBRID DEPLOYMENT${NC} — products kept on Twilio: $KEPT_ON_TWILIO"
    echo -e "  Twilio SDK and env vars are expected for these products."
  fi
fi

exit "$EXIT_CODE"
