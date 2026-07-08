#!/usr/bin/env bash
#
# preflight-check.sh — Validate migration environment readiness
#
# Usage: bash preflight-check.sh [<project-root>] [--quick]
#
# Arguments:
#   <project-root>  Optional path to the project being migrated (enables project-specific checks)
#   --quick         Skip API calls, only run local checks
#
# Checks:
#   - TELNYX_API_KEY environment variable
#   - API connectivity to api.telnyx.com
#   - Account balance (warn if < $1)
#   - Phone number inventory
#   - Connection / TeXML app check
#   - Messaging profile check
#   - Installed Twilio SDKs (to confirm what's being replaced)
#   - Installed Telnyx SDKs
#   - jq availability
#   - Git status (uncommitted changes warning)
#
# Output: Structured report with pass/fail per check
# Exit codes:
#   0 — All critical checks passed
#   1 — One or more critical checks failed

set -uo pipefail

# --- Parse arguments ---
PROJECT_ROOT=""
QUICK_MODE=false

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK_MODE=true ;;
    --help|-h)
      echo "Usage: bash preflight-check.sh [<project-root>] [--quick]"
      echo ""
      echo "Arguments:"
      echo "  <project-root>  Path to the project being migrated"
      echo "  --quick         Skip API calls, only run local checks"
      exit 0
      ;;
    *)
      if [ -z "$PROJECT_ROOT" ]; then
        PROJECT_ROOT="$arg"
      else
        echo "Error: unexpected argument '$arg'" >&2
        exit 2
      fi
      ;;
  esac
done

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

PASS=0
FAIL=0
WARN=0

check_pass() {
  echo -e "  ${GREEN}PASS${NC}  $1"
  PASS=$((PASS + 1))
}

check_fail() {
  echo -e "  ${RED}FAIL${NC}  $1"
  FAIL=$((FAIL + 1))
}

check_warn() {
  echo -e "  ${YELLOW}WARN${NC}  $1"
  WARN=$((WARN + 1))
}

check_info() {
  echo -e "  ${BLUE}INFO${NC}  $1"
}

echo -e "${BOLD}Telnyx Migration Preflight Check${NC}"
echo "═══════════════════════════════════"

if [ -n "$PROJECT_ROOT" ]; then
  if [ -d "$PROJECT_ROOT" ]; then
    check_info "Project root: $PROJECT_ROOT"
  else
    echo -e "  ${RED}ERROR${NC}  Project root does not exist: $PROJECT_ROOT"
    exit 2
  fi
fi

if [ "$QUICK_MODE" = true ]; then
  check_info "Quick mode — skipping API calls"
fi

# --- 1. Tool Availability ---
echo ""
echo -e "${BOLD}Tool Availability${NC}"

if command -v curl &>/dev/null; then
  check_pass "curl is available"
else
  check_fail "curl is not installed (required for API checks)"
fi

if command -v jq &>/dev/null; then
  check_pass "jq is available ($(jq --version 2>/dev/null || echo 'version unknown'))"
else
  check_warn "jq is not installed — JSON output from scripts will need manual parsing"
fi

if command -v git &>/dev/null; then
  check_pass "git is available"
else
  check_warn "git is not installed — cannot check working tree status"
fi

# --- 2. TELNYX_API_KEY ---
echo ""
echo -e "${BOLD}Telnyx Credentials${NC}"

if [ -n "${TELNYX_API_KEY:-}" ]; then
  KEY_PREFIX="${TELNYX_API_KEY:0:8}"
  check_pass "TELNYX_API_KEY is set (${KEY_PREFIX}...)"

  # Validate key format
  if [[ "${TELNYX_API_KEY}" == KEY* ]]; then
    check_pass "API key has valid format (KEY...)"
  else
    check_warn "API key does not start with 'KEY' — may be a v1 key or test key"
  fi
else
  check_fail "TELNYX_API_KEY is not set. Get one at https://portal.telnyx.com/#/app/api-keys"
fi

# --- 3. API Connectivity & Account Checks ---
echo ""
echo -e "${BOLD}API Connectivity${NC}"

if [ "$QUICK_MODE" = true ]; then
  check_info "Skipped (quick mode)"
elif ! command -v curl &>/dev/null; then
  check_warn "Skipped (curl not available)"
elif [ -z "${TELNYX_API_KEY:-}" ]; then
  check_warn "Skipped (no API key)"
else
  # Basic connectivity
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/balance" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    check_pass "api.telnyx.com is reachable and API key is valid (HTTP $HTTP_CODE)"

    # Balance check
    BALANCE_RESPONSE=$(curl -s \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/balance" 2>/dev/null || echo "")
    if [ -n "$BALANCE_RESPONSE" ] && command -v jq &>/dev/null; then
      BALANCE=$(echo "$BALANCE_RESPONSE" | jq -r '.data.balance // empty' 2>/dev/null)
      CURRENCY=$(echo "$BALANCE_RESPONSE" | jq -r '.data.currency // "USD"' 2>/dev/null)
      if [ -n "$BALANCE" ]; then
        # Compare balance (strip negative sign for display, check if < 1)
        BALANCE_ABS="${BALANCE#-}"
        if command -v bc &>/dev/null; then
          IS_LOW=$(echo "$BALANCE_ABS < 1" | bc -l 2>/dev/null || echo "0")
        else
          IS_LOW=0
        fi
        if [ "$IS_LOW" = "1" ]; then
          check_warn "Account balance is low: ${BALANCE} ${CURRENCY} — top up before testing"
        else
          check_pass "Account balance: ${BALANCE} ${CURRENCY}"
        fi
      fi
    fi

    # Phone number inventory
    NUMBERS_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/phone_numbers?page[size]=1" 2>/dev/null || echo "")
    if [ -n "$NUMBERS_RESPONSE" ] && command -v jq &>/dev/null; then
      NUM_COUNT=$(echo "$NUMBERS_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
      if [ "$NUM_COUNT" = "0" ] || [ -z "$NUM_COUNT" ]; then
        check_warn "No phone numbers in account — you'll need numbers to test voice/messaging"
      else
        check_pass "Phone numbers available: $NUM_COUNT"
      fi
    fi

    # Connection check (Voice)
    CONN_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/connections?page[size]=1" 2>/dev/null || echo "")
    if [ -n "$CONN_RESPONSE" ] && command -v jq &>/dev/null; then
      CONN_COUNT=$(echo "$CONN_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
      if [ "$CONN_COUNT" = "0" ] || [ -z "$CONN_COUNT" ]; then
        check_info "No voice connections configured — create one for voice/TeXML migration"
      else
        check_pass "Voice connections available: $CONN_COUNT"
      fi
    fi

    # Messaging profile check
    MSG_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/messaging_profiles?page[size]=1" 2>/dev/null || echo "")
    if [ -n "$MSG_RESPONSE" ] && command -v jq &>/dev/null; then
      MSG_COUNT=$(echo "$MSG_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
      if [ "$MSG_COUNT" = "0" ] || [ -z "$MSG_COUNT" ]; then
        check_info "No messaging profiles configured — create one for messaging migration"
      else
        check_pass "Messaging profiles available: $MSG_COUNT"
      fi
    fi

  elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    check_fail "api.telnyx.com is reachable but API key is invalid (HTTP $HTTP_CODE)"
  elif [ "$HTTP_CODE" = "000" ]; then
    check_fail "Cannot reach api.telnyx.com — check network connectivity"
  else
    check_warn "api.telnyx.com returned HTTP $HTTP_CODE — check API key and account status"
  fi
fi

# --- 4. Twilio SDK Detection ---
echo ""
echo -e "${BOLD}Twilio SDKs Detected (to be replaced)${NC}"

TWILIO_FOUND=false

# Python
if python3 -c "import twilio" 2>/dev/null; then
  TWILIO_VER=$(python3 -c "import twilio; print(twilio.__version__)" 2>/dev/null || echo "unknown")
  check_info "Python: twilio $TWILIO_VER"
  TWILIO_FOUND=true
elif python -c "import twilio" 2>/dev/null; then
  check_info "Python: twilio (version unknown)"
  TWILIO_FOUND=true
fi

# Node.js
if [ -n "$PROJECT_ROOT" ] && [ -d "$PROJECT_ROOT/node_modules/twilio" ]; then
  TWILIO_NODE_VER=$(node -e "console.log(require('$PROJECT_ROOT/node_modules/twilio/package.json').version)" 2>/dev/null || echo "unknown")
  check_info "Node.js: twilio $TWILIO_NODE_VER"
  TWILIO_FOUND=true
elif [ -d "node_modules/twilio" ] 2>/dev/null; then
  TWILIO_NODE_VER=$(node -e "console.log(require('twilio/package.json').version)" 2>/dev/null || echo "unknown")
  check_info "Node.js: twilio $TWILIO_NODE_VER"
  TWILIO_FOUND=true
elif npm list twilio 2>/dev/null | grep -q twilio; then
  check_info "Node.js: twilio (installed globally or in project)"
  TWILIO_FOUND=true
fi

# Ruby
if gem list twilio-ruby 2>/dev/null | grep -q twilio-ruby; then
  TWILIO_RUBY_VER=$(gem list twilio-ruby 2>/dev/null | grep -o '([^)]*)')
  check_info "Ruby: twilio-ruby $TWILIO_RUBY_VER"
  TWILIO_FOUND=true
fi

# Go
if [ -n "$PROJECT_ROOT" ] && [ -f "$PROJECT_ROOT/go.mod" ]; then
  if grep -q "twilio" "$PROJECT_ROOT/go.mod" 2>/dev/null; then
    check_info "Go: twilio-go (found in project go.mod)"
    TWILIO_FOUND=true
  fi
elif go list -m github.com/twilio/twilio-go 2>/dev/null; then
  check_info "Go: twilio-go (found in go.mod)"
  TWILIO_FOUND=true
fi

# Java (check for jar in common locations)
SEARCH_DIR="${PROJECT_ROOT:-.}"
if find "$SEARCH_DIR" -name "twilio-*.jar" -maxdepth 3 2>/dev/null | grep -q twilio; then
  check_info "Java: twilio jar found in project"
  TWILIO_FOUND=true
fi

# PHP
if [ -n "$PROJECT_ROOT" ] && [ -f "$PROJECT_ROOT/composer.json" ]; then
  if grep -q "twilio" "$PROJECT_ROOT/composer.json" 2>/dev/null; then
    check_info "PHP: twilio/sdk found in composer.json"
    TWILIO_FOUND=true
  fi
fi

# C#/.NET
if [ -n "$PROJECT_ROOT" ]; then
  if find "$PROJECT_ROOT" -name "*.csproj" -maxdepth 3 2>/dev/null | xargs grep -l "Twilio" 2>/dev/null | head -1 | grep -q .; then
    check_info "C#/.NET: Twilio package found in .csproj"
    TWILIO_FOUND=true
  fi
fi

if [ "$TWILIO_FOUND" = false ]; then
  check_info "No Twilio SDKs detected in current environment"
fi

# --- 5. Telnyx SDK Detection ---
echo ""
echo -e "${BOLD}Telnyx SDKs Installed${NC}"

TELNYX_FOUND=false

# Python
if python3 -c "import telnyx" 2>/dev/null; then
  TELNYX_PY_VER=$(python3 -c "import telnyx; print(telnyx.VERSION)" 2>/dev/null || echo "unknown")
  check_pass "Python: telnyx $TELNYX_PY_VER"
  TELNYX_FOUND=true
fi

# Node.js
if [ -n "$PROJECT_ROOT" ] && [ -d "$PROJECT_ROOT/node_modules/telnyx" ]; then
  TELNYX_NODE_VER=$(node -e "console.log(require('$PROJECT_ROOT/node_modules/telnyx/package.json').version)" 2>/dev/null || echo "unknown")
  check_pass "Node.js: telnyx $TELNYX_NODE_VER"
  TELNYX_FOUND=true
elif [ -d "node_modules/telnyx" ] 2>/dev/null; then
  TELNYX_NODE_VER=$(node -e "console.log(require('telnyx/package.json').version)" 2>/dev/null || echo "unknown")
  check_pass "Node.js: telnyx $TELNYX_NODE_VER"
  TELNYX_FOUND=true
elif npm list telnyx 2>/dev/null | grep -q telnyx; then
  check_pass "Node.js: telnyx (installed)"
  TELNYX_FOUND=true
fi

# Ruby
if gem list telnyx 2>/dev/null | grep -q "^telnyx "; then
  TELNYX_RUBY_VER=$(gem list telnyx 2>/dev/null | grep "^telnyx " | grep -o '([^)]*)')
  check_pass "Ruby: telnyx $TELNYX_RUBY_VER"
  TELNYX_FOUND=true
fi

# Go
if [ -n "$PROJECT_ROOT" ] && [ -f "$PROJECT_ROOT/go.mod" ]; then
  if grep -q "telnyx" "$PROJECT_ROOT/go.mod" 2>/dev/null; then
    check_pass "Go: telnyx-go (found in project go.mod)"
    TELNYX_FOUND=true
  fi
elif go list -m github.com/telnyx/telnyx-go 2>/dev/null; then
  check_pass "Go: telnyx-go (found in go.mod)"
  TELNYX_FOUND=true
fi

if [ "$TELNYX_FOUND" = false ]; then
  check_warn "No Telnyx SDKs detected. Install one: pip install 'telnyx>=4.0,<5.0' / npm install telnyx@^6 / gem 'telnyx', '~> 5.0'"
fi

# --- 6. Project-Specific Checks ---
if [ -n "$PROJECT_ROOT" ]; then
  echo ""
  echo -e "${BOLD}Project Context${NC}"

  # Git status
  if command -v git &>/dev/null && [ -d "$PROJECT_ROOT/.git" ]; then
    UNCOMMITTED=$(cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$UNCOMMITTED" -gt 0 ]; then
      check_warn "Project has $UNCOMMITTED uncommitted changes — commit or stash before migration"
    else
      check_pass "Git working tree is clean"
    fi

    BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "unknown")
    check_info "Current branch: $BRANCH"
  fi

  # Detect project language(s) from files
  LANG_HINTS=""
  [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/setup.py" ] && LANG_HINTS="$LANG_HINTS python"
  [ -f "$PROJECT_ROOT/package.json" ] && LANG_HINTS="$LANG_HINTS javascript"
  [ -f "$PROJECT_ROOT/go.mod" ] && LANG_HINTS="$LANG_HINTS go"
  [ -f "$PROJECT_ROOT/Gemfile" ] && LANG_HINTS="$LANG_HINTS ruby"
  [ -f "$PROJECT_ROOT/pom.xml" ] || [ -f "$PROJECT_ROOT/build.gradle" ] && LANG_HINTS="$LANG_HINTS java"
  [ -f "$PROJECT_ROOT/composer.json" ] && LANG_HINTS="$LANG_HINTS php"
  if find "$PROJECT_ROOT" -maxdepth 2 -name "*.csproj" 2>/dev/null | head -1 | grep -q .; then
    LANG_HINTS="$LANG_HINTS csharp"
  fi

  if [ -n "$LANG_HINTS" ]; then
    check_info "Detected languages:$LANG_HINTS"
  fi
fi

# --- Summary ---
echo ""
echo "═══════════════════════════════════"
echo -e "${BOLD}Summary${NC}"
echo -e "  ${GREEN}Pass${NC}: $PASS"
echo -e "  ${RED}Fail${NC}: $FAIL"
echo -e "  ${YELLOW}Warn${NC}: $WARN"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Not ready for migration.${NC} Fix the failures above before proceeding."
  exit 1
else
  echo ""
  echo -e "${GREEN}${BOLD}Environment is ready for migration.${NC}"
  if [ "$WARN" -gt 0 ]; then
    echo -e "  Review the warnings above for a smoother migration."
  fi
  exit 0
fi
