#!/usr/bin/env bash
#
# validate-setup.sh — Verify Phone Verification Blueprint infrastructure is configured correctly
#
# Usage: bash validate-setup.sh
#
# Checks:
#   - TELNYX_API_KEY environment variable
#   - API connectivity
#   - Phone numbers with SMS capability + messaging profile assignment
#   - Messaging profiles
#   - 10DLC brand status
#   - 10DLC campaign status (requires MNO_PROVISIONED)
#   - Verify profiles
#
# Exit codes: 0 = all checks pass, 1 = one or more checks failed, 2 = warnings (pending states)

set -euo pipefail

PASS=0
FAIL=0
WARN=0

# Collected resource IDs for chain validation
FOUND_PHONE=""
FOUND_PHONE_MP_ID=""

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

# Helper: make an authenticated curl request with --globoff
telnyx_get() {
  printf 'header = "Authorization: Bearer %s"\n' "$TELNYX_API_KEY" \
    | curl -s -g --config - "$@" 2>/dev/null || echo "{}"
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
HTTP_CODE=$(printf 'header = "Authorization: Bearer %s"\n' "$TELNYX_API_KEY" \
    | curl -s -g --config - -o /dev/null -w "%{http_code}" \
    "https://api.telnyx.com/v2/phone_numbers?page%5Bsize%5D=1" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    pass "API reachable (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    fail "API key invalid or expired (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    fail "Cannot reach api.telnyx.com — check your internet connection"
else
    warn "Unexpected response (HTTP $HTTP_CODE)"
fi

# Check 3: Phone Numbers with SMS + messaging profile assignment
echo ""
echo "[3/7] SMS-capable Phone Numbers..."
NUMBERS_JSON=$(telnyx_get "https://api.telnyx.com/v2/phone_numbers?page%5Bsize%5D=50")

# Find numbers that have a messaging_profile_id assigned (indicates SMS setup).
# The v2 phone_numbers endpoint does not expose a `.features[]` array;
# a non-null messaging_profile_id is the reliable indicator that messaging is configured.
SMS_COUNT=$(jq_count "$NUMBERS_JSON" '[.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "")] | length')

if [ "$SMS_COUNT" -gt 0 ] 2>/dev/null; then
    pass "$SMS_COUNT phone number(s) with messaging profile assigned"
    # Save the first number and its messaging_profile_id for chain validation
    FOUND_PHONE=$(jq_print "$NUMBERS_JSON" '[.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "")][0].phone_number')
    FOUND_PHONE_MP_ID=$(jq_print "$NUMBERS_JSON" '[.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "")][0].messaging_profile_id')
    jq_print "$NUMBERS_JSON" '.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "") | "       \(.phone_number) → profile \(.messaging_profile_id)"' | head -5
else
    fail "No phone numbers with messaging profile assigned"
    echo "       Purchase a number and assign a messaging profile: see SKILL.md Steps 1-3"
fi

# Check 4: Messaging Profiles (validate the one linked to our number)
echo ""
echo "[4/7] Messaging Profiles..."
PROFILES_JSON=$(telnyx_get "https://api.telnyx.com/v2/messaging_profiles?page%5Bsize%5D=10")

PROFILE_COUNT=$(jq_count "$PROFILES_JSON" '.data | length')

if [ "$PROFILE_COUNT" -gt 0 ] 2>/dev/null; then
    if [ -n "$FOUND_PHONE_MP_ID" ] && [ "$FOUND_PHONE_MP_ID" != "null" ]; then
        # Verify the specific profile linked to our phone number exists
        LINKED_PROFILE=$(jq_count "$PROFILES_JSON" "[.data[] | select(.id == \"$FOUND_PHONE_MP_ID\")] | length")
        if [ "$LINKED_PROFILE" -gt 0 ] 2>/dev/null; then
            LINKED_NAME=$(jq_print "$PROFILES_JSON" ".data[] | select(.id == \"$FOUND_PHONE_MP_ID\") | .name // \"unnamed\"")
            pass "Messaging profile '$LINKED_NAME' ($FOUND_PHONE_MP_ID) linked to $FOUND_PHONE"
        else
            fail "Phone number $FOUND_PHONE references messaging profile $FOUND_PHONE_MP_ID but it was not found"
        fi
    else
        pass "$PROFILE_COUNT messaging profile(s) found"
        jq_print "$PROFILES_JSON" '.data[] | "       \(.name // "unnamed") (\(.id))"' | head -5
    fi
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
BRAND_JSON=$(telnyx_get "https://api.telnyx.com/v2/10dlc/brand?page=1&recordsPerPage=10")

BRAND_COUNT=$(jq_count "$BRAND_JSON" '.records | length')

if [ "$BRAND_COUNT" -gt 0 ] 2>/dev/null; then
    VERIFIED_COUNT=$(jq_count "$BRAND_JSON" '[.records[] | select(.identityStatus == "VERIFIED" or .identityStatus == "VETTED_VERIFIED")] | length')
    if [ "$VERIFIED_COUNT" -gt 0 ] 2>/dev/null; then
        pass "$VERIFIED_COUNT verified brand(s)"
    else
        fail "$BRAND_COUNT brand(s) found but none verified yet — 10DLC requires a verified brand"
        jq_print "$BRAND_JSON" '.records[] | "       \(.displayName): \(.identityStatus)"' | head -5
    fi
else
    fail "No 10DLC brands registered"
    echo "       Register one: see SKILL.md Step 4"
fi

# Check 6: 10DLC Campaign — require MNO_PROVISIONED for the phone number
echo ""
echo "[6/7] 10DLC Campaign..."

# First check if we have a specific phone number to validate against
if [ -n "$FOUND_PHONE" ] && [ "$FOUND_PHONE" != "null" ]; then
    # Use per-number campaign endpoint (URL-encode the +)
    ENCODED_PHONE=$(echo "$FOUND_PHONE" | sed 's/+/%2B/g')
    PHONE_CAMPAIGN_JSON=$(telnyx_get "https://api.telnyx.com/v2/10dlc/phone_number_campaigns/${ENCODED_PHONE}")
    ASSIGNMENT_STATUS=$(jq_print "$PHONE_CAMPAIGN_JSON" '.assignmentStatus // empty')

    if [ "$ASSIGNMENT_STATUS" = "ASSIGNED" ]; then
        CAMPAIGN_STATUS_VAL=$(jq_print "$PHONE_CAMPAIGN_JSON" '.campaignStatus // empty')
        if [ "$CAMPAIGN_STATUS_VAL" = "MNO_PROVISIONED" ]; then
            pass "Phone number $FOUND_PHONE assigned to campaign (MNO_PROVISIONED)"
        elif [ "$CAMPAIGN_STATUS_VAL" = "MNO_ACCEPTED" ]; then
            fail "Campaign for $FOUND_PHONE is MNO_ACCEPTED but not yet MNO_PROVISIONED — SMS may fail"
            echo "       Wait for carrier provisioning to complete (can take up to 24 hours)"
        else
            fail "Campaign for $FOUND_PHONE is in state: ${CAMPAIGN_STATUS_VAL:-unknown} — not ready"
            echo "       Campaign must reach MNO_PROVISIONED before SMS delivery works"
        fi
    elif [ -n "$ASSIGNMENT_STATUS" ]; then
        fail "Phone number $FOUND_PHONE campaign assignment status: $ASSIGNMENT_STATUS (expected ASSIGNED)"
    else
        # Fallback: check if any campaigns exist at all
        CAMPAIGN_JSON=$(telnyx_get "https://api.telnyx.com/v2/10dlc/campaign?page=1&recordsPerPage=10")
        CAMPAIGN_COUNT=$(jq_count "$CAMPAIGN_JSON" '.records | length')
        if [ "$CAMPAIGN_COUNT" -gt 0 ] 2>/dev/null; then
            PROVISIONED_COUNT=$(jq_count "$CAMPAIGN_JSON" '[.records[] | select(.campaignStatus == "MNO_PROVISIONED")] | length')
            if [ "$PROVISIONED_COUNT" -gt 0 ] 2>/dev/null; then
                warn "$PROVISIONED_COUNT provisioned campaign(s) found but $FOUND_PHONE is not assigned to any"
                echo "       Assign the number: see SKILL.md Step 6"
            else
                ACCEPTED_COUNT=$(jq_count "$CAMPAIGN_JSON" '[.records[] | select(.campaignStatus == "MNO_ACCEPTED")] | length')
                if [ "$ACCEPTED_COUNT" -gt 0 ] 2>/dev/null; then
                    fail "$ACCEPTED_COUNT campaign(s) at MNO_ACCEPTED but not yet MNO_PROVISIONED"
                    echo "       Wait for carrier provisioning, then assign number"
                else
                    fail "$CAMPAIGN_COUNT campaign(s) found but none provisioned"
                    jq_print "$CAMPAIGN_JSON" '.records[] | "       \(.usecase): \(.campaignStatus)"' | head -5
                fi
            fi
        else
            fail "No 10DLC campaigns found"
            echo "       Create one: see SKILL.md Step 5"
        fi
    fi
else
    # No phone number found — just check for any campaigns
    CAMPAIGN_JSON=$(telnyx_get "https://api.telnyx.com/v2/10dlc/campaign?page=1&recordsPerPage=10")
    CAMPAIGN_COUNT=$(jq_count "$CAMPAIGN_JSON" '.records | length')
    if [ "$CAMPAIGN_COUNT" -gt 0 ] 2>/dev/null; then
        PROVISIONED_COUNT=$(jq_count "$CAMPAIGN_JSON" '[.records[] | select(.campaignStatus == "MNO_PROVISIONED")] | length')
        if [ "$PROVISIONED_COUNT" -gt 0 ] 2>/dev/null; then
            pass "$PROVISIONED_COUNT fully provisioned campaign(s)"
        else
            fail "$CAMPAIGN_COUNT campaign(s) found but none at MNO_PROVISIONED"
            jq_print "$CAMPAIGN_JSON" '.records[] | "       \(.usecase): \(.campaignStatus)"' | head -5
        fi
    else
        fail "No 10DLC campaigns found"
        echo "       Create one: see SKILL.md Step 5"
    fi
fi

# Check 7: Verify Profiles
echo ""
echo "[7/7] Verify Profiles..."
VERIFY_JSON=$(telnyx_get "https://api.telnyx.com/v2/verify_profiles")

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
