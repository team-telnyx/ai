#!/bin/bash
set -euo pipefail

# validate-setup.sh — Telnyx Contact Center (AIF-273)
# Validates infrastructure: API key, connectivity, phone numbers, CCA, OVP, credentials.
# Exit 0 = all pass, exit 1 = any failure.

PASS=0
FAIL=0
WARN=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Safe jq extractors
jq_count() {
  local json="$1"
  echo "$json" | jq -r '.data | length' 2>/dev/null || echo "0"
}

jq_print() {
  local json="$1"
  local filter="$2"
  echo "$json" | jq -r "$filter" 2>/dev/null || echo "N/A"
}

pass() {
  PASS=$((PASS + 1))
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo -e "${RED}✗ FAIL${NC}: $1"
}

warn() {
  WARN=$((WARN + 1))
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Resolve telnyx-curl.sh wrapper — works inside Claude plugin or standalone
if [ -z "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
  if [ -f "${SCRIPT_DIR}/scripts/telnyx-curl.sh" ]; then
    CLAUDE_PLUGIN_ROOT="$SCRIPT_DIR"
  fi
fi
# telnyx_curl: wrapper function — uses plugin curl wrapper if available, else direct curl
telnyx_curl() {
  if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh" ]; then
    bash "${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh" "$@"
  else
    curl -s -H "Authorization: Bearer ${TELNYX_API_KEY}" "$@"
  fi
}

echo "============================================"
echo "  Telnyx Contact Center — Setup Validation"
echo "  Blueprint: AIF-273"
echo "============================================"
echo ""

# --- Check 1: TELNYX_API_KEY environment variable ---
if [[ -n "${TELNYX_API_KEY:-}" ]]; then
  pass "TELNYX_API_KEY is set"
else
  fail "TELNYX_API_KEY is not set — export TELNYX_API_KEY=your-key before running"
  echo ""
  echo "============================================"
  echo "  Results: ${PASS} pass, ${FAIL} fail, ${WARN} warn"
  echo "============================================"
  exit 1
fi

# --- Check 2: API connectivity (GET /v2/call_control_applications) ---
echo ""
echo "→ Check 2: API connectivity"
CCA_RESPONSE=$(telnyx_curl --globoff -s -w "\n%{http_code}" "https://api.telnyx.com/v2/call_control_applications" 2>&1) || true
HTTP_CODE=$(echo "$CCA_RESPONSE" | tail -1)
BODY=$(echo "$CCA_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  pass "API connectivity — GET /v2/call_control_applications returned 200"
  CCA_COUNT=$(jq_count "$BODY")
  if [[ "$CCA_COUNT" -gt 0 ]]; then
    pass "Found $CCA_COUNT Call Control Application(s)"
    # Use saved CCA ID from .telnyx-contact-center.json if available, else fall back to first result
    SAVED_CCA_ID=""
    if [ -f ".telnyx-contact-center.json" ]; then
      SAVED_CCA_ID=$(jq -r '.call_control_app_id // empty' .telnyx-contact-center.json 2>/dev/null)
    fi
    if [ -n "$SAVED_CCA_ID" ]; then
      # Verify the saved CCA still exists by fetching it directly
      CCA_DIRECT=$(telnyx_curl --globoff -s -w "\n%{http_code}" "https://api.telnyx.com/v2/call_control_applications/${SAVED_CCA_ID}" 2>&1) || true
      CCA_DIRECT_HTTP=$(echo "$CCA_DIRECT" | tail -1)
      CCA_DIRECT_BODY=$(echo "$CCA_DIRECT" | sed '$d')
      if [[ "$CCA_DIRECT_HTTP" == "200" ]]; then
        CCA_ID="$SAVED_CCA_ID"
        CCA_NAME=$(jq_print "$CCA_DIRECT_BODY" '.data.name')
        CCA_OVP=$(jq_print "$CCA_DIRECT_BODY" '.data.outbound.outbound_voice_profile_id // empty')
        CCA_WEBHOOK=$(jq_print "$CCA_DIRECT_BODY" '.data.webhook_event_url // empty')
        echo "  Using saved CCA ID: $CCA_ID"
      else
        warn "Saved CCA ID $SAVED_CCA_ID not found (HTTP $CCA_DIRECT_HTTP) — falling back to first result"
        SAVED_CCA_ID=""
      fi
    fi
    if [ -z "$SAVED_CCA_ID" ]; then
      CCA_ID=$(jq_print "$BODY" '.data[0].id')
      CCA_NAME=$(jq_print "$BODY" '.data[0].name')
      CCA_OVP=$(jq_print "$BODY" '.data[0].outbound.outbound_voice_profile_id // empty')
      CCA_WEBHOOK=$(jq_print "$BODY" '.data[0].webhook_event_url // empty')
      echo "  Using first CCA (no saved ID found)"
    fi
    echo "  App ID:    $CCA_ID"
    echo "  App Name:  $CCA_NAME"
    echo "  Webhook:   $CCA_WEBHOOK"
    echo "  OVP ID:    ${CCA_OVP:-<not set>}"
  else
    warn "No Call Control Applications found — create one in Step 2"
    CCA_ID=""
    CCA_OVP=""
  fi
else
  fail "API connectivity — HTTP $HTTP_CODE (expected 200)"
  echo "  Response: $BODY"
fi

# --- Check 3: Active phone numbers ---
echo ""
echo "→ Check 3: Active phone numbers"
NUMBERS_RESPONSE=$(telnyx_curl --globoff -s -w "\n%{http_code}" "https://api.telnyx.com/v2/phone_numbers?filter%5Bstatus%5D=active" 2>&1) || true
NUM_HTTP_CODE=$(echo "$NUMBERS_RESPONSE" | tail -1)
HTTP_CODE="$NUM_HTTP_CODE"
BODY=$(echo "$NUMBERS_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  NUM_COUNT=$(jq_count "$BODY")
  if [[ "$NUM_COUNT" -gt 0 ]]; then
    pass "Found $NUM_COUNT active phone number(s)"
    # Show first few numbers
    echo "$BODY" | jq -r '.data[:5] | .[] | "  \(.phone_number) | connection_id: \(.connection_id // "none")"' 2>/dev/null || true
  else
    fail "No active phone numbers found — purchase one in Step 1"
  fi
else
  fail "Phone numbers query — HTTP $HTTP_CODE"
fi

# --- Check 4: Call Control Application exists ---
echo ""
echo "→ Check 4: Call Control Application exists"
if [[ -n "${CCA_ID:-}" ]]; then
  pass "Call Control Application exists: $CCA_ID ($CCA_NAME)"
else
  fail "No Call Control Application found — create one in Step 2"
fi

# --- Check 5: Phone number assigned to CCA (connection_id matches) ---
echo ""
echo "→ Check 5: Phone number assigned to CCA"
if [[ "${NUM_HTTP_CODE:-}" != "200" ]]; then
  # Distinguish a failed numbers request from a genuine empty result so we
  # don't misreport a transport/auth failure as "no number assigned".
  fail "Cannot verify phone-CCA assignment — phone numbers query failed (HTTP ${NUM_HTTP_CODE:-000})"
  echo "  Re-run after resolving the API error above (check TELNYX_API_KEY and connectivity)"
elif [[ -z "${CCA_ID:-}" ]]; then
  warn "Cannot verify phone-CCA assignment (no Call Control Application found — see Check 4)"
else
  NUM_BODY=$(echo "$NUMBERS_RESPONSE" | sed '$d')
  # Check if any number's connection_id matches the CCA ID
  MATCHING=$(echo "$NUM_BODY" | jq -r --arg cca "$CCA_ID" '.data[] | select(.connection_id == $cca) | .phone_number' 2>/dev/null | head -1)
  if [[ -n "$MATCHING" ]]; then
    pass "Phone number $MATCHING is assigned to CCA ($CCA_ID)"
  else
    # Check if any number has a connection_id at all
    ASSIGNED=$(echo "$NUM_BODY" | jq -r '.data[] | select(.connection_id != null) | .phone_number' 2>/dev/null | head -1)
    if [[ -n "$ASSIGNED" ]]; then
      warn "Phone number $ASSIGNED has a connection_id but it does not match CCA ($CCA_ID)"
      echo "  Assign with: PATCH /v2/phone_numbers/{id}/voice with connection_id=$CCA_ID"
    else
      fail "No phone number is assigned to a Call Control Application"
      echo "  Assign with: PATCH /v2/phone_numbers/{id}/voice with connection_id=$CCA_ID"
    fi
  fi
fi

# --- Check 6: Outbound Voice Profile assigned to CCA ---
echo ""
echo "→ Check 6: Outbound Voice Profile assigned to CCA"
if [[ -n "${CCA_OVP:-}" && "${CCA_OVP}" != "null" && "${CCA_OVP}" != "N/A" ]]; then
  pass "OVP assigned to CCA: $CCA_OVP"

  # Verify OVP exists and get details
  OVP_RESPONSE=$(telnyx_curl --globoff -s -w "\n%{http_code}" "https://api.telnyx.com/v2/outbound_voice_profiles/${CCA_OVP}" 2>&1) || true
  OVP_HTTP=$(echo "$OVP_RESPONSE" | tail -1)
  OVP_BODY=$(echo "$OVP_RESPONSE" | sed '$d')

  if [[ "$OVP_HTTP" == "200" ]]; then
    OVP_NAME=$(jq_print "$OVP_BODY" '.data.name')
    pass "OVP exists: $OVP_NAME ($CCA_OVP)"
  else
    warn "OVP query returned HTTP $OVP_HTTP — OVP may have been deleted"
  fi
else
  fail "No Outbound Voice Profile assigned to CCA — all outbound calls will fail with D38"
  echo "  Assign with: PATCH /v2/call_control_applications/{id} with outbound_voice_profile_id"

  # Check if any OVPs exist that could be assigned
  OVP_LIST=$(telnyx_curl --globoff -s "https://api.telnyx.com/v2/outbound_voice_profiles" 2>&1) || true
  OVP_COUNT=$(jq_count "$OVP_LIST")
  if [[ "$OVP_COUNT" -gt 0 ]]; then
    warn "Found $OVP_COUNT existing OVP(s) that could be assigned"
    echo "$OVP_LIST" | jq -r '.data[:3] | .[] | "  OVP ID: \(.id) | Name: \(.name)"' 2>/dev/null || true
  else
    warn "No OVPs exist — create one with POST /v2/outbound_voice_profiles"
  fi
fi

# --- Check 7: OVP has whitelisted destinations ---
echo ""
echo "→ Check 7: OVP whitelisted destinations"
if [[ -n "${CCA_OVP:-}" && "${CCA_OVP}" != "null" && "${CCA_OVP}" != "N/A" ]]; then
  if [[ -n "${OVP_BODY:-}" ]]; then
    WHITELIST=$(echo "$OVP_BODY" | jq -r '.data.whitelisted_destinations // [] | join(", ")' 2>/dev/null)
    if [[ -n "$WHITELIST" && "$WHITELIST" != "null" ]]; then
      pass "OVP whitelisted destinations: $WHITELIST"
    else
      warn "OVP has no whitelisted destinations — outbound calls to agent countries will fail with D13"
      echo "  Add with: PATCH /v2/outbound_voice_profiles/{id} with whitelisted_destinations=[\"US\",\"GB\",\"...\" ]"
    fi
  else
    warn "Cannot verify whitelisted destinations (OVP query failed)"
  fi
else
  warn "Cannot check whitelisted destinations (no OVP assigned)"
fi

# --- Check 8: SIP/WebRTC credentials exist ---
echo ""
echo "→ Check 8: SIP/WebRTC credential connections"
CRED_RESPONSE=$(telnyx_curl --globoff -s -w "\n%{http_code}" "https://api.telnyx.com/v2/credential_connections" 2>&1) || true
HTTP_CODE=$(echo "$CRED_RESPONSE" | tail -1)
BODY=$(echo "$CRED_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  CRED_COUNT=$(jq_count "$BODY")
  if [[ "$CRED_COUNT" -gt 0 ]]; then
    pass "Found $CRED_COUNT credential connection(s)"
    echo "$BODY" | jq -r '.data[:5] | .[] | "  \(.id) | \(.sip_username // "N/A") | type: \(.credential_type // "sip")"' 2>/dev/null || true
  else
    warn "No SIP/WebRTC credential connections found"
    echo "  Only required for Path B (SIP softphone) or Path C (WebRTC browser)"
    echo "  Create with: POST /v2/credential_connections"
  fi
else
  warn "Credential connections query — HTTP $HTTP_CODE"
fi

# --- Summary ---
echo ""
echo "============================================"
echo "  Results: ${PASS} pass, ${FAIL} fail, ${WARN} warn"
echo "============================================"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
else
  exit 0
fi
