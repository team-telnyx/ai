#!/usr/bin/env bash
#
# smoke-test.sh — Free smoke tests for Telnyx migration (no API costs)
#
# Usage: bash smoke-test.sh
#
# Checks:
#   - SDK import test (Python/Node.js based on detected language)
#   - API key validation via /v2/balance
#   - Account balance
#   - Phone number inventory
#   - Voice connection count
#   - Messaging profile count
#   - Webhook URL reachability (if TELNYX_WEBHOOK_URL is set)
#
# Exit codes:
#   0 — All critical checks passed
#   1 — One or more critical checks failed

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

# --- Help ---
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash smoke-test.sh"
  echo ""
  echo "Free smoke tests for Telnyx migration environment (no API costs)."
  echo "Checks SDK imports, API key, balance, numbers, connections, messaging profiles,"
  echo "and webhook URL reachability."
  echo ""
  echo "Environment variables:"
  echo "  TELNYX_API_KEY        (required) Your Telnyx API key"
  echo "  TELNYX_WEBHOOK_URL    (optional) Webhook URL to test reachability"
  exit 0
fi

echo -e "${BOLD}Telnyx Migration Smoke Test${NC}"
echo "==========================="
echo ""

# --- 1. SDK Import Test ---
echo -e "${BOLD}SDK Import${NC}"

SDK_FOUND=false

# Python
if command -v python3 &>/dev/null; then
  if python3 -c "import telnyx" 2>/dev/null; then
    TELNYX_PY_VER=$(python3 -c "import telnyx; print(getattr(telnyx, 'VERSION', 'unknown'))" 2>/dev/null || echo "unknown")
    check_pass "Python: import telnyx succeeded (version: $TELNYX_PY_VER)"
    SDK_FOUND=true
  else
    check_warn "Python: import telnyx failed — install with: pip install 'telnyx>=4.0,<5.0'"
  fi
else
  check_info "Python3 not found — skipping Python SDK check"
fi

# Node.js (check global first, then local node_modules)
if command -v node &>/dev/null; then
  if node -e "require('telnyx')" 2>/dev/null; then
    TELNYX_NODE_VER=$(node -e "try{console.log(require('telnyx/package.json').version)}catch(e){console.log('unknown')}" 2>/dev/null || echo "unknown")
    check_pass "Node.js: require('telnyx') succeeded (version: $TELNYX_NODE_VER)"
    SDK_FOUND=true
  elif [ -d "node_modules/telnyx" ]; then
    TELNYX_NODE_VER=$(node -e "try{console.log(require('./node_modules/telnyx/package.json').version)}catch(e){console.log('unknown')}" 2>/dev/null || echo "unknown")
    check_pass "Node.js: telnyx found in local node_modules (version: $TELNYX_NODE_VER)"
    SDK_FOUND=true
  else
    check_warn "Node.js: require('telnyx') failed — install with: npm install telnyx@^6"
  fi
else
  check_info "Node.js not found — skipping Node SDK check"
fi

# Ruby
if command -v ruby &>/dev/null; then
  if ruby -e "require 'telnyx'" 2>/dev/null; then
    check_pass "Ruby: require 'telnyx' succeeded"
    SDK_FOUND=true
  else
    check_info "Ruby: require 'telnyx' failed — install with: gem 'telnyx', '~> 5.0' in Gemfile"
  fi
fi

if [ "$SDK_FOUND" = false ]; then
  check_warn "No Telnyx SDK detected in any language"
fi

# --- 2. API Key Validation ---
echo ""
echo -e "${BOLD}API Key Validation${NC}"

if [ -z "${TELNYX_API_KEY:-}" ]; then
  check_fail "TELNYX_API_KEY is not set"
  echo ""
  echo "==========================="
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}: $PASS"
  echo -e "  ${RED}Fail${NC}: $FAIL"
  echo -e "  ${YELLOW}Warn${NC}: $WARN"
  echo ""
  echo -e "${RED}${BOLD}Cannot proceed without API key.${NC}"
  echo "  Set it with: export TELNYX_API_KEY='KEYxxxxxxxx'"
  exit 1
fi

KEY_PREFIX="${TELNYX_API_KEY:0:8}"
check_info "API key set (${KEY_PREFIX}...)"

if ! command -v curl &>/dev/null; then
  check_fail "curl is not installed — required for API checks"
  echo ""
  echo "==========================="
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}: $PASS"
  echo -e "  ${RED}Fail${NC}: $FAIL"
  echo -e "  ${YELLOW}Warn${NC}: $WARN"
  echo ""
  echo -e "${RED}${BOLD}curl is required for smoke tests.${NC}"
  exit 1
fi

BALANCE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/balance" 2>/dev/null || echo -e "\n000")

HTTP_BODY=$(echo "$BALANCE_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$BALANCE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  check_pass "API key is valid (HTTP 200)"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  check_fail "API key is invalid (HTTP $HTTP_CODE)"
  echo ""
  echo "==========================="
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}: $PASS"
  echo -e "  ${RED}Fail${NC}: $FAIL"
  echo -e "  ${YELLOW}Warn${NC}: $WARN"
  echo ""
  echo -e "${RED}${BOLD}Fix your API key before continuing.${NC}"
  exit 1
elif [ "$HTTP_CODE" = "000" ]; then
  check_fail "Cannot reach api.telnyx.com — check network connectivity"
  echo ""
  echo "==========================="
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}: $PASS"
  echo -e "  ${RED}Fail${NC}: $FAIL"
  echo -e "  ${YELLOW}Warn${NC}: $WARN"
  echo ""
  echo -e "${RED}${BOLD}Network issue. Check connectivity.${NC}"
  exit 1
else
  check_warn "Unexpected HTTP response: $HTTP_CODE"
fi

# --- 3. Balance Check ---
echo ""
echo -e "${BOLD}Account Balance${NC}"

HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
fi

if [ "$HTTP_CODE" = "200" ] && [ "$HAS_JQ" = true ]; then
  BALANCE=$(echo "$HTTP_BODY" | jq -r '.data.balance // empty' 2>/dev/null)
  CURRENCY=$(echo "$HTTP_BODY" | jq -r '.data.currency // "USD"' 2>/dev/null)
  if [ -n "$BALANCE" ]; then
    BALANCE_ABS="${BALANCE#-}"
    IS_LOW=0
    if command -v bc &>/dev/null; then
      IS_LOW=$(echo "$BALANCE_ABS < 1" | bc -l 2>/dev/null || echo "0")
    fi
    if [ "$IS_LOW" = "1" ]; then
      check_warn "Account balance is low: ${BALANCE} ${CURRENCY}"
    else
      check_pass "Account balance: ${BALANCE} ${CURRENCY}"
    fi
  else
    check_warn "Could not parse balance from response"
  fi
elif [ "$HAS_JQ" = false ]; then
  check_warn "jq not installed — cannot parse balance (install jq for better output)"
fi

# --- 4. Phone Number Inventory ---
echo ""
echo -e "${BOLD}Phone Number Inventory${NC}"

NUMBERS_RESPONSE=$(curl -s -g \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/phone_numbers?page[size]=1" 2>/dev/null || echo "")

if [ -n "$NUMBERS_RESPONSE" ] && [ "$HAS_JQ" = true ]; then
  NUM_COUNT=$(echo "$NUMBERS_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
  if [ -z "$NUM_COUNT" ] || [ "$NUM_COUNT" = "0" ] || [ "$NUM_COUNT" = "null" ]; then
    check_fail "No phone numbers in account (total_results = 0)"
  else
    check_pass "Phone numbers available: $NUM_COUNT"
  fi
elif [ "$HAS_JQ" = false ]; then
  # Fallback: check if response looks like it has data
  if echo "$NUMBERS_RESPONSE" | grep -q '"total_results"' 2>/dev/null; then
    check_info "Phone numbers endpoint responded (install jq for details)"
  else
    check_warn "Could not parse phone numbers response"
  fi
else
  check_warn "No response from phone numbers endpoint"
fi

# --- 5. Connection Check ---
echo ""
echo -e "${BOLD}Voice Connections${NC}"

CONN_RESPONSE=$(curl -s -g \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/connections?page[size]=1" 2>/dev/null || echo "")

if [ -n "$CONN_RESPONSE" ] && [ "$HAS_JQ" = true ]; then
  CONN_COUNT=$(echo "$CONN_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
  if [ -z "$CONN_COUNT" ] || [ "$CONN_COUNT" = "0" ] || [ "$CONN_COUNT" = "null" ]; then
    check_warn "No voice connections configured"
  else
    check_pass "Voice connections: $CONN_COUNT"
  fi
elif [ "$HAS_JQ" = false ]; then
  check_info "Connections endpoint responded (install jq for details)"
fi

# --- 6. Messaging Profile Check ---
echo ""
echo -e "${BOLD}Messaging Profiles${NC}"

MSG_RESPONSE=$(curl -s -g \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/messaging_profiles?page[size]=1" 2>/dev/null || echo "")

if [ -n "$MSG_RESPONSE" ] && [ "$HAS_JQ" = true ]; then
  MSG_COUNT=$(echo "$MSG_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
  if [ -z "$MSG_COUNT" ] || [ "$MSG_COUNT" = "0" ] || [ "$MSG_COUNT" = "null" ]; then
    check_warn "No messaging profiles configured"
  else
    check_pass "Messaging profiles: $MSG_COUNT"
  fi
elif [ "$HAS_JQ" = false ]; then
  check_info "Messaging profiles endpoint responded (install jq for details)"
fi

# --- 7. Webhook URL Reachability ---
echo ""
echo -e "${BOLD}Webhook URL${NC}"

if [ -n "${TELNYX_WEBHOOK_URL:-}" ]; then
  check_info "Testing webhook URL: ${TELNYX_WEBHOOK_URL}"
  WEBHOOK_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    "${TELNYX_WEBHOOK_URL}" 2>/dev/null || echo "000")

  if [ "$WEBHOOK_CODE" = "000" ]; then
    check_fail "Webhook URL is unreachable (connection failed or timeout)"
  elif [ "$WEBHOOK_CODE" -ge 200 ] && [ "$WEBHOOK_CODE" -lt 500 ] 2>/dev/null; then
    check_pass "Webhook URL is reachable (HTTP $WEBHOOK_CODE)"
  else
    check_warn "Webhook URL returned HTTP $WEBHOOK_CODE"
  fi
else
  check_info "TELNYX_WEBHOOK_URL not set — skipping reachability check"
fi

# --- Summary ---
echo ""
echo "==========================="
echo -e "${BOLD}Summary${NC}"
echo -e "  ${GREEN}Pass${NC}: $PASS"
echo -e "  ${RED}Fail${NC}: $FAIL"
echo -e "  ${YELLOW}Warn${NC}: $WARN"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Smoke test failed.${NC} Fix the issues above before proceeding."
  exit 1
else
  echo ""
  echo -e "${GREEN}${BOLD}Smoke test passed.${NC}"
  if [ "$WARN" -gt 0 ]; then
    echo -e "  Review warnings above for a smoother migration."
  fi
  exit 0
fi
