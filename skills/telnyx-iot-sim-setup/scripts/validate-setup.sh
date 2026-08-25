#!/usr/bin/env bash
set -euo pipefail

# IoT SIM Setup Validation Script
# Checks: API key, API reachability, SIMs exist, groups exist, at least one SIM enabled

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  TELNYX_CURL="${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh"
elif [ -x "$SCRIPT_DIR/../../../scripts/telnyx-curl.sh" ]; then
  TELNYX_CURL="$SCRIPT_DIR/../../../scripts/telnyx-curl.sh"
elif [ -x "$SCRIPT_DIR/../../../providers/claude/plugins/telnyx-platform/scripts/telnyx-curl.sh" ]; then
  TELNYX_CURL="$SCRIPT_DIR/../../../providers/claude/plugins/telnyx-platform/scripts/telnyx-curl.sh"
else
  echo "Error: could not find telnyx-curl.sh. Set CLAUDE_PLUGIN_ROOT to an installed Telnyx plugin root." >&2
  exit 1
fi
API_BASE="https://api.telnyx.com/v2"

PASS=0
FAIL=0
CHECKS=()

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "true" ]; then
    CHECKS+=("✅ $name")
    PASS=$((PASS + 1))
  else
    CHECKS+=("❌ $name")
    FAIL=$((FAIL + 1))
  fi
}

# Check 1: TELNYX_API_KEY is set
if [ -n "${TELNYX_API_KEY:-}" ]; then
  check "TELNYX_API_KEY is set" "true"
else
  check "TELNYX_API_KEY is set" "false"
  echo "=========================================="
  echo "IoT SIM Setup Validation"
  echo "=========================================="
  for c in "${CHECKS[@]}"; do echo "  $c"; done
  echo ""
  echo "⚠️  Cannot proceed without TELNYX_API_KEY"
  echo "    Set it with: export TELNYX_API_KEY=\"your-key-here\""
  exit 1
fi

# Check 2: Can list SIM cards (API reachable + auth works)
SIMS_RESPONSE=$(bash "$TELNYX_CURL" --globoff "${API_BASE}/sim_cards?page[size]=5" 2>&1) || true
if echo "$SIMS_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'data' in d" 2>/dev/null; then
  check "API reachable and authenticated" "true"
  SIM_COUNT=$(echo "$SIMS_RESPONSE" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['data']))" 2>/dev/null || echo "0")
else
  check "API reachable and authenticated" "false"
  SIM_COUNT=0
fi

# Check 3: Has at least one registered SIM
if [ "${SIM_COUNT:-0}" -gt 0 ] 2>/dev/null; then
  check "At least one SIM registered ($SIM_COUNT found)" "true"
else
  check "At least one SIM registered" "false"
fi

# Check 4: Can list SIM card groups
GROUPS_RESPONSE=$(bash "$TELNYX_CURL" --globoff "${API_BASE}/sim_card_groups?page[size]=5" 2>&1) || true
if echo "$GROUPS_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'data' in d" 2>/dev/null; then
  GROUP_COUNT=$(echo "$GROUPS_RESPONSE" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['data']))" 2>/dev/null || echo "0")
  check "SIM card groups accessible (${GROUP_COUNT} found)" "true"
else
  check "SIM card groups accessible" "false"
  GROUP_COUNT=0
fi

# Check 5: At least one SIM is enabled
ENABLED_RESPONSE=$(bash "$TELNYX_CURL" --globoff "${API_BASE}/sim_cards?filter[status]=enabled&page[size]=1" 2>&1) || true
ENABLED_COUNT=$(echo "$ENABLED_RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin).get('data', [])
print(len(data))
" 2>/dev/null || echo "0")

if [ "${ENABLED_COUNT:-0}" -gt 0 ] 2>/dev/null; then
  check "At least one SIM enabled ($ENABLED_COUNT active)" "true"
else
  check "At least one SIM enabled" "false"
fi

# Summary
echo "=========================================="
echo "IoT SIM Setup Validation"
echo "=========================================="
for c in "${CHECKS[@]}"; do echo "  $c"; done
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "🎉 All checks passed! IoT SIM environment is ready."
  exit 0
else
  echo "⚠️  $FAIL check(s) failed. Review the issues above."
  exit 1
fi
