#!/usr/bin/env bash
#
# validate-setup.sh — Verify SMS Marketing Pipeline infrastructure is configured correctly
#
# Usage: bash validate-setup.sh
#
# Checks:
#   - TELNYX_API_KEY environment variable
#   - API connectivity
#   - Phone numbers with SMS capability
#   - Messaging profile with webhook URL
#   - 10DLC brand status (VERIFIED)
#   - 10DLC campaign status (MARKETING/MIXED, MNO_PROVISIONED)
#   - Phone number-to-campaign assignment
#
# Exit codes: 0 = all checks pass, 1 = one or more checks failed

set -uo pipefail

PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ $1"; ((PASS++)); }
fail() { echo "  ❌ $1"; ((FAIL++)); }
warn() { echo "  ⚠️  $1"; ((WARN++)); }

echo "SMS Marketing Pipeline — Infrastructure Validation"
echo "===================================================="
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
HTTP_CODE=$(curl -s --globoff -o /dev/null -w "%{http_code}" \
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
NUMBERS_JSON=$(curl -s --globoff \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=50" 2>/dev/null)

# /v2/phone_numbers doesn't return features — check for numbers with a messaging profile assigned
# (numbers assigned to a messaging profile are SMS-enabled)
SMS_COUNT=$(echo "$NUMBERS_JSON" | jq '[.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "")] | length' 2>/dev/null || echo "0")
TOTAL_COUNT=$(echo "$NUMBERS_JSON" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$SMS_COUNT" -gt 0 ]; then
    pass "$SMS_COUNT phone number(s) assigned to messaging profiles (SMS-capable)"
    echo "$NUMBERS_JSON" | jq -r '.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "") | "       \(.phone_number) → \(.messaging_profile_name // "unnamed")"' 2>/dev/null | head -5
elif [ "$TOTAL_COUNT" -gt 0 ]; then
    warn "$TOTAL_COUNT phone number(s) found but none assigned to a messaging profile"
    echo "       Assign to a profile: see SKILL.md Step 3"
else
    fail "No phone numbers found"
    echo "       Purchase one: see SKILL.md Step 1"
fi

# Check 4: Messaging Profiles (with webhook URL)
echo ""
echo "[4/7] Messaging Profiles..."
PROFILES_JSON=$(curl -s --globoff \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/messaging_profiles?page[size]=10" 2>/dev/null)

PROFILE_COUNT=$(echo "$PROFILES_JSON" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$PROFILE_COUNT" -gt 0 ]; then
    pass "$PROFILE_COUNT messaging profile(s) found"
    # Check if any have a webhook URL configured
    WEBHOOK_COUNT=$(echo "$PROFILES_JSON" | jq '[.data[] | select(.webhook_url != null and .webhook_url != "")] | length' 2>/dev/null || echo "0")
    if [ "$WEBHOOK_COUNT" -gt 0 ]; then
        pass "Webhook URL configured on $WEBHOOK_COUNT profile(s)"
        echo "$PROFILES_JSON" | jq -r '.data[] | select(.webhook_url != null and .webhook_url != "") | "       \(.name // "unnamed") → \(.webhook_url)"' 2>/dev/null | head -5
    else
        warn "No messaging profiles have a webhook URL configured"
        echo "       Webhook URL is needed for delivery receipts and opt-out handling"
        echo "       Update profile: see SKILL.md Step 2"
    fi
else
    fail "No messaging profiles found"
    echo "       Create one: see SKILL.md Step 2"
fi

# Check 5: 10DLC Brand
# NOTE: 10DLC endpoints use .records (not .data) and different pagination
# params (page/recordsPerPage instead of page[number]/page[size]).
# This is a known inconsistency — see FRIC-004 in references/friction-log.md.
echo ""
echo "[5/7] 10DLC Brand..."
BRAND_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/brand?page=1&recordsPerPage=10" 2>/dev/null)

BRAND_COUNT=$(echo "$BRAND_JSON" | jq '.records | length' 2>/dev/null || echo "0")

if [ "$BRAND_COUNT" -gt 0 ]; then
    VERIFIED_COUNT=$(echo "$BRAND_JSON" | jq '[.records[] | select(.identityStatus == "VERIFIED" or .identityStatus == "VETTED_VERIFIED")] | length' 2>/dev/null || echo "0")
    if [ "$VERIFIED_COUNT" -gt 0 ]; then
        pass "$VERIFIED_COUNT verified brand(s)"
        echo "$BRAND_JSON" | jq -r '.records[] | select(.identityStatus == "VERIFIED" or .identityStatus == "VETTED_VERIFIED") | "       \(.displayName): \(.identityStatus)"' 2>/dev/null | head -5
    else
        warn "$BRAND_COUNT brand(s) found but none verified yet"
        echo "       Brand vetting takes 1-7 business days (no webhook — must poll)"
        echo "$BRAND_JSON" | jq -r '.records[] | "       \(.displayName): \(.identityStatus)"' 2>/dev/null | head -5
    fi
else
    fail "No 10DLC brands registered"
    echo "       Register one: see SKILL.md Step 4"
fi

# Check 6: 10DLC Campaign (MARKETING or MIXED)
# NOTE: Uses .records not .data (FRIC-004)
echo ""
echo "[6/7] 10DLC Campaign (MARKETING/MIXED)..."
CAMPAIGN_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/campaign?page=1&recordsPerPage=10" 2>/dev/null)

CAMPAIGN_COUNT=$(echo "$CAMPAIGN_JSON" | jq '.records | length' 2>/dev/null || echo "0")

if [ "$CAMPAIGN_COUNT" -gt 0 ]; then
    # Check for MARKETING or MIXED campaigns
    MARKETING_COUNT=$(echo "$CAMPAIGN_JSON" | jq '[.records[] | select(.usecase == "MARKETING" or .usecase == "MIXED")] | length' 2>/dev/null || echo "0")
    ACTIVE_COUNT=$(echo "$CAMPAIGN_JSON" | jq '[.records[] | select((.usecase == "MARKETING" or .usecase == "MIXED") and (.campaignStatus == "MNO_PROVISIONED" or .campaignStatus == "MNO_ACCEPTED"))] | length' 2>/dev/null || echo "0")
    
    if [ "$ACTIVE_COUNT" -gt 0 ]; then
        pass "$ACTIVE_COUNT active MARKETING/MIXED campaign(s)"
        echo "$CAMPAIGN_JSON" | jq -r '.records[] | select((.usecase == "MARKETING" or .usecase == "MIXED") and (.campaignStatus == "MNO_PROVISIONED" or .campaignStatus == "MNO_ACCEPTED")) | "       \(.usecase): \(.campaignStatus) (ID: \(.campaignId))"' 2>/dev/null | head -5
    elif [ "$MARKETING_COUNT" -gt 0 ]; then
        warn "$MARKETING_COUNT MARKETING/MIXED campaign(s) found but not yet fully provisioned"
        echo "$CAMPAIGN_JSON" | jq -r '.records[] | select(.usecase == "MARKETING" or .usecase == "MIXED") | "       \(.usecase): \(.campaignStatus)"' 2>/dev/null | head -5
    else
        warn "$CAMPAIGN_COUNT campaign(s) found but none are MARKETING or MIXED type"
        echo "       For SMS marketing, create a MARKETING or MIXED campaign"
        echo "$CAMPAIGN_JSON" | jq -r '.records[] | "       \(.usecase): \(.campaignStatus)"' 2>/dev/null | head -5
    fi
else
    fail "No 10DLC campaigns found"
    echo "       Create one: see SKILL.md Step 5 (requires verified brand)"
fi

# Check 7: Phone Number-to-Campaign Assignment
echo ""
echo "[7/7] Phone Number Campaign Assignments..."
ASSIGNMENT_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/phone_number_campaigns?page=1&recordsPerPage=10" 2>/dev/null)

ASSIGNMENT_COUNT=$(echo "$ASSIGNMENT_JSON" | jq '.records | length' 2>/dev/null || echo "0")

if [ "$ASSIGNMENT_COUNT" -gt 0 ]; then
    ASSIGNED_COUNT=$(echo "$ASSIGNMENT_JSON" | jq '[.records[] | select(.assignmentStatus == "ASSIGNED" or .assignmentStatus == "CONFIRMED")] | length' 2>/dev/null || echo "0")
    if [ "$ASSIGNED_COUNT" -gt 0 ]; then
        pass "$ASSIGNED_COUNT phone number(s) assigned to campaigns"
        echo "$ASSIGNMENT_JSON" | jq -r '.records[] | select(.assignmentStatus == "ASSIGNED" or .assignmentStatus == "CONFIRMED") | "       \(.phoneNumber) → Campaign \(.campaignId): \(.assignmentStatus)"' 2>/dev/null | head -5
    else
        warn "$ASSIGNMENT_COUNT assignment(s) found but none fully confirmed"
        echo "$ASSIGNMENT_JSON" | jq -r '.records[] | "       \(.phoneNumber) → \(.assignmentStatus)"' 2>/dev/null | head -5
    fi
else
    fail "No phone numbers assigned to campaigns"
    echo "       Assign numbers: see SKILL.md Step 6"
fi

# Summary
echo ""
echo "===================================================="
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "❌ Infrastructure incomplete — fix the failures above before sending marketing SMS."
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo "⚠️  Infrastructure mostly ready — check warnings above."
    exit 0
else
    echo "✅ All checks passed — infrastructure is ready for SMS marketing campaigns!"
    exit 0
fi
