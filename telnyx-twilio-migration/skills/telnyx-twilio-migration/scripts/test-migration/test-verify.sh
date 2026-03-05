#!/usr/bin/env bash
#
# test-verify.sh — Send and verify a real OTP via Telnyx Verify API
#
# Usage: bash test-verify.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to actually send the OTP
#   --dry-run    Validate setup without sending
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY             Your Telnyx API key
#   TELNYX_TO_NUMBER           Destination number (E.164 format) — agent should ask user
#
# Environment variables (optional — auto-detected/created if not set):
#   TELNYX_VERIFY_PROFILE_ID   Verify profile ID (auto-detected/created if not set)
#
# Exit codes:
#   0 — Verification completed successfully
#   1 — Verification failed or setup error

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

# --- Parse arguments ---
CONFIRMED=false
DRY_RUN=false
SEND_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --confirm) CONFIRMED=true ;;
    --dry-run) DRY_RUN=true ;;
    --send-only) SEND_ONLY=true ;;
    --help|-h)
      echo "Usage: bash test-verify.sh --confirm [--dry-run]"
      echo ""
      echo "Sends a real OTP via Telnyx Verify API and prompts for verification."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to actually send the OTP"
      echo "  --dry-run    Validate setup without sending"
      echo "  --send-only  Send OTP but skip interactive code entry (for automated testing)"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY             (required) Your Telnyx API key"
      echo "  TELNYX_TO_NUMBER           (required) Destination number, E.164 format"
      echo "  TELNYX_VERIFY_PROFILE_ID   (optional) Verify profile ID (auto-detected/created if not set)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx Verify Test${NC}"
echo "==================="
echo ""
echo -e "${YELLOW}${BOLD}COST WARNING: This test sends a real OTP (~\$0.05)${NC}"
echo ""

# --- Validate prerequisites ---
ERRORS=0

if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_API_KEY is not set"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_API_KEY is set (${TELNYX_API_KEY:0:8}...)"
fi

if [ -z "${TELNYX_VERIFY_PROFILE_ID:-}" ]; then
  echo -e "  ${BLUE}INFO${NC}  TELNYX_VERIFY_PROFILE_ID not set — will auto-detect or create"
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_VERIFY_PROFILE_ID: ${TELNYX_VERIFY_PROFILE_ID}"
fi

if [ -z "${TELNYX_TO_NUMBER:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_TO_NUMBER is not set"
  echo -e "         The agent should ask the user for their phone number to receive the OTP."
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_TO_NUMBER: ${TELNYX_TO_NUMBER}"
fi

if ! command -v curl &>/dev/null; then
  echo -e "  ${RED}FAIL${NC}  curl is not installed"
  ERRORS=$((ERRORS + 1))
fi

HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
  echo -e "  ${GREEN}PASS${NC}  jq is available"
else
  echo -e "  ${YELLOW}WARN${NC}  jq not installed — required for auto-setup. Install with: brew install jq / apt install jq"
  ERRORS=$((ERRORS + 1))
fi

# Check stdin is a terminal (needed for code input)
if [ ! -t 0 ]; then
  echo -e "  ${YELLOW}WARN${NC}  stdin is not a terminal — code entry may not work"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Setup validation failed. Fix the errors above.${NC}"
  exit 1
fi

# --- Validate API key ---
echo ""
echo -e "${BOLD}Validating API key...${NC}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/balance" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "  ${RED}FAIL${NC}  API key validation failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo -e "  ${GREEN}PASS${NC}  API key is valid"

# --- Auto-detect or create verify profile ---
VERIFY_PROFILE_ID="${TELNYX_VERIFY_PROFILE_ID:-}"
if [ -z "$VERIFY_PROFILE_ID" ]; then
  echo ""
  echo -e "${BOLD}Auto-detecting verify profile...${NC}"

  HAS_JQ_EARLY=false
  if command -v jq &>/dev/null; then
    HAS_JQ_EARLY=true
  fi

  # Try to find an existing verify profile
  # Note: GET /v2/verify_profiles may return 10009 when no profiles exist (API quirk)
  VP_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/verify_profiles" 2>/dev/null || echo "")
  if [ "$HAS_JQ_EARLY" = true ] && [ -n "$VP_RESPONSE" ]; then
    VP_ERROR_CODE=$(echo "$VP_RESPONSE" | jq -r '.errors[0].code // empty' 2>/dev/null)
    if [ "$VP_ERROR_CODE" != "10009" ]; then
      VERIFY_PROFILE_ID=$(echo "$VP_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
  fi

  if [ -n "$VERIFY_PROFILE_ID" ]; then
    echo -e "  ${GREEN}PASS${NC}  Using existing verify profile: ${VERIFY_PROFILE_ID}"
  else
    # Auto-create a verify profile with SMS channel + whitelisted destinations
    echo -e "  ${BLUE}INFO${NC}  No verify profile found — creating one..."
    VP_CREATE_RESPONSE=$(curl -s -g -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Migration Test Verify $(date +%s)\",
        \"default_timeout_secs\": 300,
        \"sms\": {
          \"messaging_enabled\": true,
          \"whitelisted_destinations\": [\"*\"]
        }
      }" \
      "https://api.telnyx.com/v2/verify_profiles" 2>/dev/null || echo "")
    if [ "$HAS_JQ_EARLY" = true ] && [ -n "$VP_CREATE_RESPONSE" ]; then
      VERIFY_PROFILE_ID=$(echo "$VP_CREATE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
      VP_CREATE_ERROR=$(echo "$VP_CREATE_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
      if [ -n "$VP_CREATE_ERROR" ]; then
        echo -e "  ${RED}FAIL${NC}  Could not create verify profile: $VP_CREATE_ERROR"
        exit 1
      fi
    fi
    if [ -n "$VERIFY_PROFILE_ID" ]; then
      echo -e "  ${GREEN}PASS${NC}  Created verify profile: ${VERIFY_PROFILE_ID}"
    else
      echo -e "  ${RED}FAIL${NC}  Could not create verify profile"
      echo -e "         Create one manually at: https://portal.telnyx.com/#/app/verify/profiles"
      exit 1
    fi
  fi
  # Export for use in the rest of the script
  TELNYX_VERIFY_PROFILE_ID="$VERIFY_PROFILE_ID"
fi

# --- Dry run exits here ---
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${BOLD}Dry run complete.${NC} Setup looks good."
  echo "  Would send OTP to: ${TELNYX_TO_NUMBER}"
  echo "  Verify profile: ${TELNYX_VERIFY_PROFILE_ID}"
  echo "  Estimated cost: ~\$0.05"
  echo ""
  echo "Run with --confirm to send the OTP."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Send a verification code to ${TELNYX_TO_NUMBER} via SMS"
  echo "  2. Prompt you to enter the code you receive"
  echo "  3. Verify the code via the Telnyx API"
  echo "  4. Report verification status"
  echo ""
  echo "  Estimated cost: ~\$0.05"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Send verification ---
echo ""
echo -e "${BOLD}Sending verification code...${NC}"
echo "  To: ${TELNYX_TO_NUMBER}"
echo "  Profile: ${TELNYX_VERIFY_PROFILE_ID}"
echo ""

VERIFY_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone_number\": \"${TELNYX_TO_NUMBER}\",
    \"verify_profile_id\": \"${TELNYX_VERIFY_PROFILE_ID}\",
    \"type\": \"sms\"
  }" \
  "https://api.telnyx.com/v2/verifications" 2>/dev/null || echo "")

if [ -z "$VERIFY_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API"
  exit 1
fi

# Extract verification ID
VERIFICATION_ID=""
if [ "$HAS_JQ" = true ]; then
  VERIFICATION_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
  VERIFY_STATUS=$(echo "$VERIFY_RESPONSE" | jq -r '.data.status // empty' 2>/dev/null)
  API_ERROR=$(echo "$VERIFY_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)

  if [ -n "$API_ERROR" ]; then
    echo -e "  ${RED}FAIL${NC}  API error: $API_ERROR"
    ERROR_CODE=$(echo "$VERIFY_RESPONSE" | jq -r '.errors[0].code // empty' 2>/dev/null)
    if [ -n "$ERROR_CODE" ]; then
      echo -e "  ${BLUE}INFO${NC}  Error code: $ERROR_CODE"
    fi
    exit 1
  fi
fi

if [ -z "$VERIFICATION_ID" ]; then
  echo -e "  ${RED}FAIL${NC}  Could not extract verification ID from response"
  if [ "$HAS_JQ" = true ]; then
    echo "  Response: $(echo "$VERIFY_RESPONSE" | jq -c . 2>/dev/null || echo "$VERIFY_RESPONSE")"
  fi
  exit 1
fi

echo -e "  ${GREEN}PASS${NC}  Verification sent"
echo "  Verification ID: ${VERIFICATION_ID}"
echo "  Status:          ${VERIFY_STATUS:-pending}"

# --- Send-only mode exits here ---
if [ "$SEND_ONLY" = true ]; then
  echo ""
  echo "==================="
  echo -e "${BOLD}Results (send-only mode)${NC}"
  echo "  Verification ID: ${VERIFICATION_ID}"
  echo "  Phone Number:    ${TELNYX_TO_NUMBER}"
  echo "  Status:          ${VERIFY_STATUS:-pending}"
  echo ""
  echo -e "  ${GREEN}${BOLD}PASS${NC}  OTP sent successfully (code verification skipped — use without --send-only to verify interactively)"
  exit 0
fi

# --- Prompt for code ---
echo ""
echo -e "${BOLD}Enter the verification code you received:${NC}"

# URL-encode the phone number for the API path
# Replace + with %2B
ENCODED_PHONE=$(echo "${TELNYX_TO_NUMBER}" | sed 's/+/%2B/g')

# Read code from stdin
read -r -p "  Code: " VERIFY_CODE

if [ -z "$VERIFY_CODE" ]; then
  echo -e "  ${RED}FAIL${NC}  No code entered"
  exit 1
fi

# Trim whitespace
VERIFY_CODE=$(echo "$VERIFY_CODE" | tr -d '[:space:]')

echo ""
echo -e "${BOLD}Verifying code...${NC}"

# --- Verify the code ---
VERIFY_CHECK_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"${VERIFY_CODE}\"
  }" \
  "https://api.telnyx.com/v2/verifications/by_phone_number/${ENCODED_PHONE}/actions/verify" 2>/dev/null || echo "")

if [ -z "$VERIFY_CHECK_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from verification API"
  exit 1
fi

# Parse result
VERIFY_RESULT=""
if [ "$HAS_JQ" = true ]; then
  VERIFY_RESULT=$(echo "$VERIFY_CHECK_RESPONSE" | jq -r '.data.response_code // empty' 2>/dev/null)
  VERIFY_FINAL_STATUS=$(echo "$VERIFY_CHECK_RESPONSE" | jq -r '.data.status // empty' 2>/dev/null)
  CHECK_ERROR=$(echo "$VERIFY_CHECK_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)

  if [ -n "$CHECK_ERROR" ]; then
    echo -e "  ${RED}FAIL${NC}  Verification error: $CHECK_ERROR"
    exit 1
  fi
fi

# --- Report ---
echo ""
echo "==================="
echo -e "${BOLD}Results${NC}"
echo "  Verification ID: ${VERIFICATION_ID}"
echo "  Phone Number:    ${TELNYX_TO_NUMBER}"
echo "  Code Entered:    ${VERIFY_CODE}"
echo "  Response Code:   ${VERIFY_RESULT:-unknown}"
echo "  Status:          ${VERIFY_FINAL_STATUS:-unknown}"

if [ "$VERIFY_RESULT" = "accepted" ] || [ "$VERIFY_FINAL_STATUS" = "accepted" ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}PASS${NC}  Verification successful"
  exit 0
elif [ "$VERIFY_RESULT" = "rejected" ] || [ "$VERIFY_FINAL_STATUS" = "rejected" ]; then
  echo ""
  echo -e "  ${RED}${BOLD}FAIL${NC}  Verification code was rejected (wrong code)"
  exit 1
elif [ "$VERIFY_RESULT" = "expired" ] || [ "$VERIFY_FINAL_STATUS" = "expired" ]; then
  echo ""
  echo -e "  ${RED}${BOLD}FAIL${NC}  Verification code has expired"
  exit 1
else
  echo ""
  echo -e "  ${YELLOW}${BOLD}WARN${NC}  Unexpected verification result: ${VERIFY_RESULT:-${VERIFY_FINAL_STATUS:-unknown}}"
  echo "  Check the Telnyx portal for details."
  exit 1
fi
