#!/usr/bin/env bash
#
# validate-setup.sh — Verify Phone Verification Blueprint infrastructure is configured correctly
#
# Usage: bash validate-setup.sh
#
# Checks:
#   - TELNYX_API_KEY environment variable
#   - API connectivity
#   - Phone numbers with SMS capability
#   - Messaging profiles
#   - 10DLC brand status
#   - 10DLC campaign status
#   - Verify profiles
#
# Exit codes: 0 = all checks pass, 1 = one or more checks failed

set -euo pipefail

PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN + 1)); }

# Safely extract JSON field — returns 0 on any error/empty
jq_count() {
  local json="$1"
  local filter="$2"
  local result
  result=$(echo "$json" | jq "$filter" 2>/dev/null) || result=""
  echo "${result:-0}"
}

# Safely extract and print JSON values — returns empty on error
jq_print() {
  local json="$1"
  local filter="$2"
  echo "$json" | jq -r "$filter" 2>/dev/null || true
}

echo "Phone Verification Blueprint — Infrastructure Validation"
echo "========================================================="
echo ""

# Check 1: API Key
echo "[1/7] API Key..."
if [ -z "${TELNYX_API_KEY:-}" ]; then
    fail "TELNYX_API_KEY not set"
    echo "       Set it with: export TELNYX_API_KEY=\"YOUR_KEY\""
    echo ""
    echo "Cannot continue without API key."
    exit 1
else
    KEY_PREVIEW="${TELNYX_API_KEY:0:8}...${TELNYX_API_KEY: -4}"
    pass "TELNYX_API_KEY set ($KEY_PREVIEW)"
fi

# Check 2: API Connectivity
echo ""
echo "[2/7] API Connectivity..."
HTTP_CODE=$(curl -s -g -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=1" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    pass "API reachable (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    fail "API key invalid or expired (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    fail "Cannot reach api.telnyx.com — check your internet connection"
else
    warn "Unexpected response (HTTP $HTTP_CODE)"
fi

# Check 3: Phone Numbers with SMS
echo ""
echo "[3/7] SMS-capable Phone Numbers..."
NUMBERS_JSON=$(curl -s -g \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=50" 2>/dev/null || echo "{}")

# The API returns `messaging_product` (string) to indicate SMS capability,
# not a `features` array with `name` fields.
SMS_COUNT=$(jq_count "$NUMBERS_JSON" '[.data[] | select(.messaging_product == "SMS")] | length')

if [ "$SMS_COUNT" -gt 0 ] 2>/dev/null; then
    pass "$SMS_COUNT phone number(s) with SMS capability"
    jq_print "$NUMBERS_JSON" '.data[] | select(.messaging_product == "SMS") | "       \(.phone_number)"' | head -5
else
    fail "No SMS-capable phone numbers found"
    echo "       Purchase one: see SKILL.md Step 1"
fi

# Check 4: Messaging Profiles
echo ""
echo "[4/7] Messaging Profiles..."
PROFILES_JSON=$(curl -s -g \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/messaging_profiles?page[size]=10" 2>/dev/null || echo "{}")

PROFILE_COUNT=$(jq_count "$PROFILES_JSON" '.data | length')

if [ "$PROFILE_COUNT" -gt 0 ] 2>/dev/null; then
    pass "$PROFILE_COUNT messaging profile(s) found"
    jq_print "$PROFILES_JSON" '.data[] | "       \(.name // "unnamed") (\(.id))"' | head -5
else
    fail "No messaging profiles found"
    echo "       Create one: see SKILL.md Step 2"
fi

# Check 5: 10DLC Brand
# NOTE: 10DLC endpoints use .records (not .data) and different pagination
# params (page/recordsPerPage instead of page[number]/page[size]).
# This is a known inconsistency — see FRIC-003 in references/friction-log.md.
echo ""
echo "[5/7] 10DLC Brand..."
BRAND_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/brand?page=1&recordsPerPage=10" 2>/dev/null || echo "{}")

BRAND_COUNT=$(jq_count "$BRAND_JSON" '.records | length')

if [ "$BRAND_COUNT" -gt 0 ] 2>/dev/null; then
    VERIFIED_COUNT=$(jq_count "$BRAND_JSON" '[.records[] | select(.identityStatus == "VERIFIED" or .identityStatus == "VETTED_VERIFIED")] | length')
    if [ "$VERIFIED_COUNT" -gt 0 ] 2>/dev/null; then
        pass "$VERIFIED_COUNT verified brand(s)"
    else
        warn "$BRAND_COUNT brand(s) found but none verified yet"
        jq_print "$BRAND_JSON" '.records[] | "       \(.displayName): \(.identityStatus)"' | head -5
    fi
else
    fail "No 10DLC brands registered"
    echo "       Register one: see SKILL.md Step 4"
fi

# Check 6: 10DLC Campaign
echo ""
echo "[6/7] 10DLC Campaign..."
CAMPAIGN_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/campaign?page=1&recordsPerPage=10" 2>/dev/null || echo "{}")

CAMPAIGN_COUNT=$(jq_count "$CAMPAIGN_JSON" '.records | length')

if [ "$CAMPAIGN_COUNT" -gt 0 ] 2>/dev/null; then
    ACTIVE_COUNT=$(jq_count "$CAMPAIGN_JSON" '[.records[] | select(.campaignStatus == "MNO_PROVISIONED" or .campaignStatus == "MNO_ACCEPTED")] | length')
    if [ "$ACTIVE_COUNT" -gt 0 ] 2>/dev/null; then
        pass "$ACTIVE_COUNT active campaign(s)"
    else
        warn "$CAMPAIGN_COUNT campaign(s) found but none fully provisioned"
        jq_print "$CAMPAIGN_JSON" '.records[] | "       \(.usecase): \(.campaignStatus)"' | head -5
    fi
else
    fail "No 10DLC campaigns found"
    echo "       Create one: see SKILL.md Step 5"
fi

# Check 7: Verify Profiles
echo ""
echo "[7/7] Verify Profiles..."
VERIFY_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/verify_profiles" 2>/dev/null || echo "{}")

VERIFY_COUNT=$(jq_count "$VERIFY_JSON" '.data | length')

if [ "$VERIFY_COUNT" -gt 0 ] 2>/dev/null; then
    pass "$VERIFY_COUNT verify profile(s) found"
    jq_print "$VERIFY_JSON" '.data[] | "       \(.name) (\(.id))"' | head -5
else
    fail "No verify profiles found"
    echo "       Create one: see SKILL.md Step 7"
fi

# Summary
echo ""
echo "========================================================="
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "❌ Infrastructure incomplete — fix the failures above before using verification."
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo "⚠️  Infrastructure not fully ready — resolve warnings above before proceeding."
    echo "   Pending 10DLC brand/campaign means SMS may fail silently."
    exit 2
else
    echo "✅ All checks passed — infrastructure is ready for phone verification!"
    exit 0
fi
