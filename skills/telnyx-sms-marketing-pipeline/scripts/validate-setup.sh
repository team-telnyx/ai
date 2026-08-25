#!/usr/bin/env bash
#
# validate-setup.sh — Verify SMS Marketing Pipeline infrastructure is configured correctly
#
# Usage: bash validate-setup.sh
#
# Checks:
#   - TELNYX_API_KEY environment variable
#   - API connectivity
#   - Phone numbers with SMS capability (assigned to a messaging profile)
#   - Messaging profile with webhook URL
#   - 10DLC brand status (VERIFIED)
#   - 10DLC campaign status (MARKETING/MIXED, MNO_PROVISIONED)
#   - Phone number-to-campaign assignment
#
# All checks are correlated: the script identifies a specific pipeline
# (number → messaging profile → campaign → assignment) and validates
# that the resources belong together, not just that they exist somewhere
# on the account.
#
# Exit codes:
#   0 = all checks pass (no failures, no blocking warnings)
#   1 = one or more failures or blocking warnings
#
# Non-blocking warnings (informational) do not cause nonzero exit.

set -uo pipefail

PASS=0
FAIL=0
WARN_BLOCK=0   # Blocking warnings (cause exit 1)
WARN_INFO=0    # Non-blocking informational warnings

# Pipeline-correlated IDs — populated as checks progress
PIPELINE_PROFILE_ID=""
PIPELINE_PHONE_NUMBERS=()
PIPELINE_CAMPAIGN_ID=""

pass()      { echo "  ✅ $1"; ((PASS++)); }
fail()      { echo "  ❌ $1"; ((FAIL++)); }
warn_block() { echo "  ⚠️  $1 [BLOCKING]"; ((WARN_BLOCK++)); }
warn_info()  { echo "  ⚠️  $1"; ((WARN_INFO++)); }

echo "SMS Marketing Pipeline — Infrastructure Validation"
echo "===================================================="
echo ""

# ── Check 1: API Key ────────────────────────────────────────────────────────
echo "[1/7] API Key..."
if [ -z "${TELNYX_API_KEY:-}" ]; then
    fail "TELNYX_API_KEY not set"
    echo "       Set it with: export TELNYX_API_KEY=\"***\""
    echo ""
    echo "Cannot continue without API key."
    exit 1
else
    KEY_PREVIEW="${TELNYX_API_KEY:0:8}...${TELNYX_API_KEY: -4}"
    pass "TELNYX_API_KEY set ($KEY_PREVIEW)"
fi

# ── Check 2: API Connectivity ───────────────────────────────────────────────
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
    warn_info "Unexpected response (HTTP $HTTP_CODE)"
fi

# ── Check 3: Phone Numbers with SMS (messaging profile assigned) ────────────
echo ""
echo "[3/7] SMS-capable Phone Numbers..."
NUMBERS_JSON=$(curl -s --globoff \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=50" 2>/dev/null)

# Numbers assigned to a messaging profile are SMS-enabled
SMS_NUMBERS=$(echo "$NUMBERS_JSON" | jq -c '[.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "")]' 2>/dev/null || echo "[]")
SMS_COUNT=$(echo "$SMS_NUMBERS" | jq 'length' 2>/dev/null || echo "0")
TOTAL_COUNT=$(echo "$NUMBERS_JSON" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$SMS_COUNT" -gt 0 ]; then
    pass "$SMS_COUNT phone number(s) assigned to messaging profiles (SMS-capable)"
    echo "$SMS_NUMBERS" | jq -r '.[] | "       \(.phone_number) → profile \(.messaging_profile_id)"' 2>/dev/null | head -5

    # Pick the first SMS number's messaging profile as the pipeline profile
    PIPELINE_PROFILE_ID=$(echo "$SMS_NUMBERS" | jq -r '.[0].messaging_profile_id' 2>/dev/null)

    # Collect all numbers on this specific profile
    PIPELINE_NUMBERS_JSON=$(echo "$SMS_NUMBERS" | jq -c --arg pid "$PIPELINE_PROFILE_ID" '[.[] | select(.messaging_profile_id == $pid)]' 2>/dev/null)
    while IFS= read -r num; do
        PIPELINE_PHONE_NUMBERS+=("$num")
    done < <(echo "$PIPELINE_NUMBERS_JSON" | jq -r '.[].phone_number' 2>/dev/null)

    PIPELINE_NUM_COUNT=${#PIPELINE_PHONE_NUMBERS[@]}
    if [ "$PIPELINE_NUM_COUNT" -gt 0 ]; then
        pass "$PIPELINE_NUM_COUNT number(s) on pipeline profile $PIPELINE_PROFILE_ID"
    fi
elif [ "$TOTAL_COUNT" -gt 0 ]; then
    warn_block "$TOTAL_COUNT phone number(s) found but none assigned to a messaging profile"
    echo "       Assign to a profile: see SKILL.md Step 3"
else
    fail "No phone numbers found"
    echo "       Purchase one: see SKILL.md Step 1"
fi

# ── Check 4: Messaging Profile with webhook URL (pipeline-correlated) ───────
echo ""
echo "[4/7] Messaging Profile..."
if [ -n "$PIPELINE_PROFILE_ID" ]; then
    # Fetch the specific profile our numbers are on
    PROFILE_JSON=$(curl -s --globoff \
        -H "Authorization: Bearer $TELNYX_API_KEY" \
        "https://api.telnyx.com/v2/messaging_profiles/$PIPELINE_PROFILE_ID" 2>/dev/null)

    PROFILE_NAME=$(echo "$PROFILE_JSON" | jq -r '.data.name // "unnamed"' 2>/dev/null)
    PROFILE_ENABLED=$(echo "$PROFILE_JSON" | jq -r '.data.enabled // false' 2>/dev/null)
    WEBHOOK_URL=$(echo "$PROFILE_JSON" | jq -r '.data.webhook_url // ""' 2>/dev/null)

    if [ "$PROFILE_ENABLED" = "true" ]; then
        pass "Messaging profile \"$PROFILE_NAME\" ($PIPELINE_PROFILE_ID) is enabled"
    else
        fail "Messaging profile \"$PROFILE_NAME\" ($PIPELINE_PROFILE_ID) is disabled"
    fi

    if [ -n "$WEBHOOK_URL" ] && [ "$WEBHOOK_URL" != "null" ] && [ "$WEBHOOK_URL" != "" ]; then
        pass "Webhook URL configured: $WEBHOOK_URL"
    else
        warn_block "Messaging profile \"$PROFILE_NAME\" has no webhook URL configured"
        echo "       Webhook URL is required for delivery receipts and opt-out handling"
        echo "       Update profile: see SKILL.md Step 2"
    fi
else
    # No pipeline profile identified — fall back to account-wide check
    PROFILES_JSON=$(curl -s --globoff \
        -H "Authorization: Bearer $TELNYX_API_KEY" \
        "https://api.telnyx.com/v2/messaging_profiles?page[size]=10" 2>/dev/null)

    PROFILE_COUNT=$(echo "$PROFILES_JSON" | jq '.data | length' 2>/dev/null || echo "0")

    if [ "$PROFILE_COUNT" -gt 0 ]; then
        warn_info "$PROFILE_COUNT messaging profile(s) found but none linked to pipeline numbers"
    else
        fail "No messaging profiles found"
        echo "       Create one: see SKILL.md Step 2"
    fi
fi

# ── Check 5: 10DLC Brand ───────────────────────────────────────────────────
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
        warn_block "$BRAND_COUNT brand(s) found but none verified yet"
        echo "       Brand vetting takes 1-7 business days (no webhook — must poll)"
        echo "$BRAND_JSON" | jq -r '.records[] | "       \(.displayName): \(.identityStatus)"' 2>/dev/null | head -5
    fi
else
    fail "No 10DLC brands registered"
    echo "       Register one: see SKILL.md Step 4"
fi

# ── Check 6: 10DLC Campaign (MARKETING or MIXED) ───────────────────────────
# NOTE: Uses .records not .data (FRIC-004)
echo ""
echo "[6/7] 10DLC Campaign (MARKETING/MIXED)..."
CAMPAIGN_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/campaign?page=1&recordsPerPage=10" 2>/dev/null)

CAMPAIGN_COUNT=$(echo "$CAMPAIGN_JSON" | jq '.records | length' 2>/dev/null || echo "0")

if [ "$CAMPAIGN_COUNT" -gt 0 ]; then
    MARKETING_COUNT=$(echo "$CAMPAIGN_JSON" | jq '[.records[] | select(.usecase == "MARKETING" or .usecase == "MIXED")] | length' 2>/dev/null || echo "0")
    ACTIVE_CAMPAIGNS=$(echo "$CAMPAIGN_JSON" | jq -c '[.records[] | select((.usecase == "MARKETING" or .usecase == "MIXED") and (.campaignStatus == "MNO_PROVISIONED" or .campaignStatus == "MNO_ACCEPTED"))]' 2>/dev/null || echo "[]")
    ACTIVE_COUNT=$(echo "$ACTIVE_CAMPAIGNS" | jq 'length' 2>/dev/null || echo "0")

    if [ "$ACTIVE_COUNT" -gt 0 ]; then
        # Pick the first active marketing campaign as the pipeline campaign
        PIPELINE_CAMPAIGN_ID=$(echo "$ACTIVE_CAMPAIGNS" | jq -r '.[0].campaignId' 2>/dev/null)
        pass "$ACTIVE_COUNT active MARKETING/MIXED campaign(s)"
        echo "$ACTIVE_CAMPAIGNS" | jq -r '.[] | "       \(.usecase): \(.campaignStatus) (ID: \(.campaignId))"' 2>/dev/null | head -5
    elif [ "$MARKETING_COUNT" -gt 0 ]; then
        warn_block "$MARKETING_COUNT MARKETING/MIXED campaign(s) found but not yet fully provisioned"
        echo "$CAMPAIGN_JSON" | jq -r '.records[] | select(.usecase == "MARKETING" or .usecase == "MIXED") | "       \(.usecase): \(.campaignStatus)"' 2>/dev/null | head -5
    else
        warn_block "$CAMPAIGN_COUNT campaign(s) found but none are MARKETING or MIXED type"
        echo "       For SMS marketing, create a MARKETING or MIXED campaign"
        echo "$CAMPAIGN_JSON" | jq -r '.records[] | "       \(.usecase): \(.campaignStatus)"' 2>/dev/null | head -5
    fi
else
    fail "No 10DLC campaigns found"
    echo "       Create one: see SKILL.md Step 5 (requires verified brand)"
fi

# ── Check 7: Phone Number Campaign Assignments (pipeline-correlated) ────────
echo ""
echo "[7/7] Phone Number Campaign Assignments..."
ASSIGNMENT_JSON=$(curl -s \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "https://api.telnyx.com/v2/10dlc/phone_number_campaigns?page=1&recordsPerPage=50" 2>/dev/null)

ASSIGNMENT_COUNT=$(echo "$ASSIGNMENT_JSON" | jq '.records | length' 2>/dev/null || echo "0")

if [ "$ASSIGNMENT_COUNT" -gt 0 ]; then
    if [ -n "$PIPELINE_CAMPAIGN_ID" ] && [ ${#PIPELINE_PHONE_NUMBERS[@]} -gt 0 ]; then
        # Pipeline-correlated check: verify our specific numbers are assigned to our specific campaign
        PIPELINE_ASSIGNED=0
        PIPELINE_MISSING=()
        for pnum in "${PIPELINE_PHONE_NUMBERS[@]}"; do
            # Check if this number is assigned to our pipeline campaign
            MATCH=$(echo "$ASSIGNMENT_JSON" | jq --arg num "$pnum" --arg cid "$PIPELINE_CAMPAIGN_ID" \
                '[.records[] | select(.phoneNumber == $num and .campaignId == $cid and (.assignmentStatus == "ASSIGNED" or .assignmentStatus == "CONFIRMED"))] | length' 2>/dev/null || echo "0")
            if [ "$MATCH" -gt 0 ]; then
                ((PIPELINE_ASSIGNED++))
            else
                PIPELINE_MISSING+=("$pnum")
            fi
        done

        if [ "$PIPELINE_ASSIGNED" -eq ${#PIPELINE_PHONE_NUMBERS[@]} ]; then
            pass "$PIPELINE_ASSIGNED pipeline number(s) assigned to campaign $PIPELINE_CAMPAIGN_ID"
        elif [ "$PIPELINE_ASSIGNED" -gt 0 ]; then
            warn_block "$PIPELINE_ASSIGNED of ${#PIPELINE_PHONE_NUMBERS[@]} pipeline numbers assigned to campaign $PIPELINE_CAMPAIGN_ID"
            for mnum in "${PIPELINE_MISSING[@]}"; do
                echo "       Missing: $mnum → campaign $PIPELINE_CAMPAIGN_ID"
            done
            echo "       Assign numbers: see SKILL.md Step 6"
        else
            fail "No pipeline numbers assigned to campaign $PIPELINE_CAMPAIGN_ID"
            echo "       Assign numbers: see SKILL.md Step 6"
        fi
    else
        # Fallback: no specific pipeline identified — check account-wide
        ASSIGNED_COUNT=$(echo "$ASSIGNMENT_JSON" | jq '[.records[] | select(.assignmentStatus == "ASSIGNED" or .assignmentStatus == "CONFIRMED")] | length' 2>/dev/null || echo "0")
        if [ "$ASSIGNED_COUNT" -gt 0 ]; then
            warn_info "$ASSIGNED_COUNT phone number(s) assigned to campaigns (could not verify pipeline correlation)"
            echo "$ASSIGNMENT_JSON" | jq -r '.records[] | select(.assignmentStatus == "ASSIGNED" or .assignmentStatus == "CONFIRMED") | "       \(.phoneNumber) → Campaign \(.campaignId): \(.assignmentStatus)"' 2>/dev/null | head -5
        else
            warn_block "$ASSIGNMENT_COUNT assignment(s) found but none fully confirmed"
            echo "$ASSIGNMENT_JSON" | jq -r '.records[] | "       \(.phoneNumber) → \(.assignmentStatus)"' 2>/dev/null | head -5
        fi
    fi
else
    fail "No phone numbers assigned to campaigns"
    echo "       Assign numbers: see SKILL.md Step 6"
fi

# ── Pipeline Correlation Summary ────────────────────────────────────────────
if [ -n "$PIPELINE_PROFILE_ID" ] || [ -n "$PIPELINE_CAMPAIGN_ID" ]; then
    echo ""
    echo "Pipeline Resources:"
    [ -n "$PIPELINE_PROFILE_ID" ] && echo "  Messaging Profile: $PIPELINE_PROFILE_ID"
    [ ${#PIPELINE_PHONE_NUMBERS[@]} -gt 0 ] && echo "  Phone Numbers:     ${PIPELINE_PHONE_NUMBERS[*]}"
    [ -n "$PIPELINE_CAMPAIGN_ID" ] && echo "  Campaign:          $PIPELINE_CAMPAIGN_ID"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "===================================================="
TOTAL_WARN=$((WARN_BLOCK + WARN_INFO))
echo "Results: $PASS passed, $FAIL failed, $TOTAL_WARN warnings ($WARN_BLOCK blocking, $WARN_INFO informational)"
echo ""

if [ "$FAIL" -gt 0 ] || [ "$WARN_BLOCK" -gt 0 ]; then
    echo "❌ Infrastructure incomplete — fix the failures and blocking warnings above before sending marketing SMS."
    exit 1
elif [ "$WARN_INFO" -gt 0 ]; then
    echo "⚠️  All critical checks passed — review informational warnings above."
    exit 0
else
    echo "✅ All checks passed — infrastructure is ready for SMS marketing campaigns!"
    exit 0
fi
