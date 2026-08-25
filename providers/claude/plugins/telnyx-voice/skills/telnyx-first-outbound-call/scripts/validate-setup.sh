#!/usr/bin/env bash
#
# validate-setup.sh — Pre-flight checker for First Outbound Call blueprint
#
# Verifies all 4 components needed for outbound calls:
#   1. API key is valid and account has balance
#   2. At least one Call Control Application exists with an OVP linked
#   3. At least one Outbound Voice Profile exists and is enabled
#   4. At least one phone number is assigned to a Call Control Application
#
# Usage:
#   export TELNYX_API_KEY="KEY..."
#   bash validate-setup.sh
#
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

# curl wrapper — avoids leaking the API key in `ps` argv.
# Passes the key via --config on stdin instead of -H on the command line.
telnyx_curl() {
  curl -s --globoff --config - "$@" <<< "header = \"Authorization: Bearer ${TELNYX_API_KEY}\""
}

pass() { echo -e "  ${GREEN}✅ $1${NC}"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}❌ $1${NC}"; echo -e "       Fix: $2"; FAIL=$((FAIL + 1)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; WARN=$((WARN + 1)); }

echo ""
echo "First Outbound Call — Infrastructure Validation"
echo "================================================="
echo ""

# ─── Check 1: API Key ───
echo "[1/4] API Key..."
if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${RED}❌ TELNYX_API_KEY not set${NC}"
  echo "       Set it with: export TELNYX_API_KEY=\"KEY...\""
  echo ""
  echo "Cannot continue without API key."
  exit 1
fi

echo -e "  ${GREEN}✅ TELNYX_API_KEY set (${TELNYX_API_KEY:0:8}...)${NC}"
PASS=$((PASS + 1))

# Test API connectivity
HTTP_CODE=$(telnyx_curl -o /tmp/validate-foc-balance.json -w "%{http_code}" \
  "https://api.telnyx.com/v2/balance" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  BALANCE=$(jq -r '.data.balance // "unknown"' /tmp/validate-foc-balance.json 2>/dev/null || echo "unknown")
  CURRENCY=$(jq -r '.data.currency // "USD"' /tmp/validate-foc-balance.json 2>/dev/null || echo "USD")
  pass "API reachable — Balance: $BALANCE $CURRENCY"
  if echo "$BALANCE" | jq -e 'tonumber < 1' >/dev/null 2>&1; then
    warn "Balance below \$1 — you may not have enough credit for calls"
  fi
else
  fail "Cannot reach api.telnyx.com (HTTP $HTTP_CODE)" \
    "Check your internet connection and API key validity"
  echo ""
  echo "========================================================="
  echo "Results: 1 passed, 1 failed, 0 warnings"
  echo ""
  echo "❌ Cannot validate without API connectivity."
  rm -f /tmp/validate-foc-balance.json
  exit 1
fi
rm -f /tmp/validate-foc-balance.json
echo ""

# ─── Check 2: Call Control Applications ───
echo "[2/4] Call Control Applications..."
CC_RESP=$(telnyx_curl \
  "https://api.telnyx.com/v2/call_control_applications?page[size]=50" 2>/dev/null || echo '{"data":[]}')

APP_COUNT=$(echo "$CC_RESP" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$APP_COUNT" = "0" ] || [ "$APP_COUNT" = "" ]; then
  fail "No Call Control Applications found" \
    "Create one: see SKILL.md Step 1"
else
  pass "Found $APP_COUNT Call Control Application(s)"

  APPS_WITH_OVP=$(echo "$CC_RESP" | jq '[.data[] | select(.active == true and .outbound.outbound_voice_profile_id != null and .outbound.outbound_voice_profile_id != "")] | length' 2>/dev/null || echo "0")
  APPS_NO_OVP=$(echo "$CC_RESP" | jq '[.data[] | select(.active == true and (.outbound.outbound_voice_profile_id == null or .outbound.outbound_voice_profile_id == ""))] | length' 2>/dev/null || echo "0")

  if [ "$APPS_WITH_OVP" -gt 0 ]; then
    pass "$APPS_WITH_OVP app(s) active with OVP linked"
    echo "       Checking nested field: .outbound.outbound_voice_profile_id"
    echo "$CC_RESP" | jq -r '.data[] | select(.active == true and .outbound.outbound_voice_profile_id != null and .outbound.outbound_voice_profile_id != "") | "       → \(.application_name) (ID: \(.id)) — OVP: \(.outbound.outbound_voice_profile_id)"'
  else
    fail "No active Call Control Application has an OVP linked" \
      "Link an OVP to your app: see SKILL.md Step 2"
  fi

  if [ "$APPS_NO_OVP" -gt 0 ]; then
    warn "$APPS_NO_OVP other active app(s) without an OVP (non-blocking — not this blueprint's app)"
    echo "$CC_RESP" | jq -r '.data[] | select(.active == true and (.outbound.outbound_voice_profile_id == null or .outbound.outbound_voice_profile_id == "")) | "       → \(.application_name) (ID: \(.id))"'
  fi
fi
echo ""

# ─── Check 3: Outbound Voice Profiles ───
echo "[3/4] Outbound Voice Profiles..."
OVP_RESP=$(telnyx_curl \
  "https://api.telnyx.com/v2/outbound_voice_profiles?page[size]=50" 2>/dev/null || echo '{"data":[]}')

OVP_COUNT=$(echo "$OVP_RESP" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$OVP_COUNT" = "0" ] || [ "$OVP_COUNT" = "" ]; then
  fail "No outbound voice profiles found" \
    "Create one: see SKILL.md Step 2"
else
  pass "Found $OVP_COUNT outbound voice profile(s)"

  ENABLED_OVP=$(echo "$OVP_RESP" | jq '[.data[] | select(.enabled == true)] | length' 2>/dev/null || echo "0")
  if [ "$ENABLED_OVP" -gt 0 ]; then
    pass "$ENABLED_OVP OVP(s) enabled"
    echo "$OVP_RESP" | jq -r '.data[] | select(.enabled == true) | "       → \(.name) (ID: \(.id)) — destinations: \(.whitelisted_destinations | join(", "))"'

    HAS_US=$(echo "$OVP_RESP" | jq '[.data[] | select(.enabled == true) | select(.whitelisted_destinations | index("US"))] | length' 2>/dev/null || echo "0")
    if [ "$HAS_US" = "0" ]; then
      warn "No enabled OVP has 'US' in whitelisted destinations — US calls will fail with SIP 403"
    fi
  else
    fail "No enabled OVPs found" \
      "Enable your OVP or create a new one: see SKILL.md Step 2"
  fi
fi
echo ""

# ─── Check 4: Phone Numbers Assigned to Applications ───
echo "[4/4] Phone Numbers..."
NUM_RESP=$(telnyx_curl \
  "https://api.telnyx.com/v2/phone_numbers?page[size]=50" 2>/dev/null || echo '{"data":[]}')

NUM_COUNT=$(echo "$NUM_RESP" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$NUM_COUNT" = "0" ] || [ "$NUM_COUNT" = "" ]; then
  fail "No phone numbers found" \
    "Buy one: see SKILL.md Step 3"
else
  pass "Found $NUM_COUNT phone number(s)"

  ASSIGNED=$(echo "$NUM_RESP" | jq '[.data[] | select(.connection_id != null and .connection_id != "")] | length' 2>/dev/null || echo "0")
  UNASSIGNED=$(echo "$NUM_RESP" | jq '[.data[] | select(.connection_id == null or .connection_id == "")] | length' 2>/dev/null || echo "0")

  if [ "$ASSIGNED" -gt 0 ]; then
    pass "$ASSIGNED number(s) assigned to a Call Control Application"
    # Cross-check that the assigned number's connection_id matches one of the OVP-linked app IDs
    # Cross-check: number's connection_id must match an active app whose linked OVP is ENABLED
    # 1. Get enabled OVP IDs from Check 3
    ENABLED_OVP_IDS=$(echo "$OVP_RESP" | jq -r '[.data[] | select(.enabled == true) | .id] | join("|")' 2>/dev/null || echo "")
    # 2. Get active app IDs where linked OVP is in the enabled set
    USABLE_APP_IDS=$(echo "$CC_RESP" | jq -r --arg eovps "$ENABLED_OVP_IDS" \
      '[.data[] | select(.active == true and .outbound.outbound_voice_profile_id != null and .outbound.outbound_voice_profile_id != "") | select(($eovps | split("|")) as $elist | .outbound.outbound_voice_profile_id as $ovpid | ($elist | any(. == $ovpid))) | .id] | join("|")' 2>/dev/null || echo "")
    if [ -n "$USABLE_APP_IDS" ]; then
      # 3. Count numbers whose connection_id is in the usable app set (fix: use any() not index())
      MATCHED=$(echo "$NUM_RESP" | jq --arg ids "$USABLE_APP_IDS" \
        '[.data[] | select(.connection_id != null and .connection_id != "") | select(($ids | split("|")) as $idlist | .connection_id as $cid | ($idlist | any(. == $cid)))] | length' 2>/dev/null || echo "0")
      if [ "$MATCHED" -gt 0 ]; then
        pass "$MATCHED number(s) assigned to an app with enabled OVP (blueprint-ready)"
        echo "$NUM_RESP" | jq -r --arg ids "$USABLE_APP_IDS" \
          '.data[] | select(.connection_id != null and .connection_id != "") | select(($ids | split("|")) as $idlist | .connection_id as $cid | ($idlist | any(. == $cid))) | "       → \(.phone_number) → app: \(.connection_name // .connection_id)"'
      else
        warn "Numbers are assigned, but none to an app with an enabled OVP — calls will fail"
      fi
    else
      warn "No active app has a linked + enabled OVP — number assignment cannot be validated"
    fi
  else
    fail "No phone numbers assigned to a Call Control Application" \
      "Assign one: see SKILL.md Step 4"
  fi

  if [ "$UNASSIGNED" -gt 0 ]; then
    warn "$UNASSIGNED number(s) NOT assigned to any application"
    echo "$NUM_RESP" | jq -r '.data[] | select(.connection_id == null or .connection_id == "") | "       → \(.phone_number) — NOT ASSIGNED"'
  fi
fi
echo ""

# ─── Summary ───
echo "========================================================="
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}🎉 All checks passed! You should be able to make outbound calls.${NC}"
  echo ""
  echo "Make a test call:"
  echo "  curl -s -X POST https://api.telnyx.com/v2/calls \\"
  echo "    -H \"Authorization: Bearer \$TELNYX_API_KEY\" \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"connection_id\":\"YOUR_APP_ID\",\"to\":\"+1XXXXXXXXXX\",\"from\":\"+1YOUR_NUMBER\"}'"
else
  echo -e "  ${RED}❌ $FAIL check(s) failed. Fix the issues above before making calls.${NC}"
  echo ""
  echo "Most common fix: Create an Outbound Voice Profile and link it to your"
  echo "Call Control Application. See SKILL.md Step 2."
fi
echo ""

# Clean up
rm -f /tmp/validate-foc-*.json 2>/dev/null

exit $FAIL
