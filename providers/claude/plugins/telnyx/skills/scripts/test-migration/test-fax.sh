#!/usr/bin/env bash
#
# test-fax.sh — Send a real test fax via Telnyx Fax API
#
# Usage: bash test-fax.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to actually send the fax
#   --dry-run    Validate setup without sending
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY       Your Telnyx API key
#   TELNYX_FAX_TO        Destination fax number (E.164 format)
#
# Environment variables (optional — auto-detected if not set):
#   TELNYX_FROM_NUMBER   Sender number (auto-detected from account if not set)
#   TELNYX_CONNECTION_ID Fax-enabled connection ID (auto-detected if not set)
#
# Exit codes:
#   0 — Fax sent successfully
#   1 — Fax failed or setup error

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

for arg in "$@"; do
  case "$arg" in
    --confirm) CONFIRMED=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: bash test-fax.sh --confirm [--dry-run]"
      echo ""
      echo "Sends a real test fax via Telnyx Fax API."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to actually send the fax"
      echo "  --dry-run    Validate setup without sending"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY         (required) Your Telnyx API key"
      echo "  TELNYX_FAX_TO          (required) Destination fax number (E.164 format)"
      echo "  TELNYX_FROM_NUMBER     (optional) Sender number (auto-detected from account)"
      echo "  TELNYX_CONNECTION_ID   (optional) Fax-enabled connection ID (auto-detected)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx Fax Test${NC}"
echo "==============="
echo ""
echo -e "${YELLOW}${BOLD}COST WARNING: This test sends a real fax (~\$0.07/page)${NC}"
echo ""

# --- Validate prerequisites ---
ERRORS=0

if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_API_KEY is not set"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_API_KEY is set (${TELNYX_API_KEY:0:8}...)"
fi

if [ -z "${TELNYX_FAX_TO:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_FAX_TO is not set"
  echo -e "         Set this to the destination fax number (E.164 format)"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_FAX_TO: ${TELNYX_FAX_TO}"
fi

if ! command -v curl &>/dev/null; then
  echo -e "  ${RED}FAIL${NC}  curl is not installed"
  ERRORS=$((ERRORS + 1))
fi

if command -v jq &>/dev/null; then
  echo -e "  ${GREEN}PASS${NC}  jq is available"
else
  echo -e "  ${YELLOW}WARN${NC}  jq not installed — required for auto-setup"
  ERRORS=$((ERRORS + 1))
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

# --- Auto-detect TELNYX_FROM_NUMBER if not set ---
if [ -z "${TELNYX_FROM_NUMBER:-}" ]; then
  echo ""
  echo -e "${BOLD}Auto-detecting sender number...${NC}"
  NUMS_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=50&filter[status]=active" 2>/dev/null || echo "")
  if [ -n "$NUMS_RESPONSE" ]; then
    TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r '.data[0].phone_number // empty' 2>/dev/null)
    if [ -n "$TELNYX_FROM_NUMBER" ]; then
      echo -e "  ${GREEN}PASS${NC}  Auto-detected sender: ${TELNYX_FROM_NUMBER}"
    else
      echo -e "  ${RED}FAIL${NC}  No phone numbers on account"
      exit 1
    fi
  else
    echo -e "  ${RED}FAIL${NC}  Could not fetch phone numbers from API"
    exit 1
  fi
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_FROM_NUMBER: ${TELNYX_FROM_NUMBER}"
fi

# --- Auto-detect connection ID if not set ---
CONNECTION_ID="${TELNYX_CONNECTION_ID:-}"
if [ -z "$CONNECTION_ID" ]; then
  echo ""
  echo -e "${BOLD}Auto-detecting fax connection...${NC}"
  CONN_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/fax_applications?page[size]=5" 2>/dev/null || echo "")
  CONN_COUNT=$(echo "$CONN_RESPONSE" | jq -r '.data | length' 2>/dev/null || echo "0")
  if [ "$CONN_COUNT" -gt 0 ] 2>/dev/null; then
    CONNECTION_ID=$(echo "$CONN_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
    echo -e "  ${GREEN}PASS${NC}  Using fax application: ${CONNECTION_ID}"
  else
    echo -e "  ${YELLOW}WARN${NC}  No fax application found — sending without connection_id"
  fi
fi

# --- Dry run exits here ---
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${BOLD}Dry run complete.${NC} Setup looks good."
  echo "  Would send fax: ${TELNYX_FROM_NUMBER} -> ${TELNYX_FAX_TO}"
  echo "  Connection: ${CONNECTION_ID:-none}"
  echo "  Estimated cost: ~\$0.07/page"
  echo ""
  echo "Run with --confirm to send the fax."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Send a 1-page test fax from ${TELNYX_FROM_NUMBER} to ${TELNYX_FAX_TO}"
  echo "  2. Poll for delivery status"
  echo "  3. Report fax ID and status"
  echo ""
  echo "  Estimated cost: ~\$0.07"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Send the fax ---
echo ""
echo -e "${BOLD}Sending fax...${NC}"
echo "  From: ${TELNYX_FROM_NUMBER}"
echo "  To:   ${TELNYX_FAX_TO}"
echo ""

# Use a publicly accessible test PDF
TEST_MEDIA_URL="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

PAYLOAD="{
  \"from\": \"${TELNYX_FROM_NUMBER}\",
  \"to\": \"${TELNYX_FAX_TO}\",
  \"media_url\": \"${TEST_MEDIA_URL}\""

if [ -n "$CONNECTION_ID" ]; then
  PAYLOAD="${PAYLOAD},
  \"connection_id\": \"${CONNECTION_ID}\""
fi

PAYLOAD="${PAYLOAD}
}"

SEND_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://api.telnyx.com/v2/faxes" 2>/dev/null || echo "")

if [ -z "$SEND_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API"
  exit 1
fi

# Extract fax ID
FAX_ID=$(echo "$SEND_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
API_ERROR=$(echo "$SEND_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)

if [ -n "$API_ERROR" ]; then
  echo -e "  ${RED}FAIL${NC}  API error: $API_ERROR"
  exit 1
fi

if [ -z "$FAX_ID" ]; then
  echo -e "  ${RED}FAIL${NC}  Could not extract fax ID from response"
  exit 1
fi

echo -e "  ${GREEN}PASS${NC}  Fax submitted"
echo "  Fax ID: ${FAX_ID}"

# --- Poll for status ---
echo ""
echo -e "${BOLD}Polling fax status...${NC}"

MAX_POLL=60
POLL_INTERVAL=5
POLL_START=$(date +%s)
FINAL_STATUS=""

while true; do
  ELAPSED=$(( $(date +%s) - POLL_START ))

  if [ "$ELAPSED" -ge "$MAX_POLL" ]; then
    echo -e "  ${YELLOW}WARN${NC}  Polling timeout after ${MAX_POLL}s"
    break
  fi

  sleep "$POLL_INTERVAL"

  STATUS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/faxes/${FAX_ID}" 2>/dev/null || echo "")

  if [ -n "$STATUS_RESPONSE" ]; then
    CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status // empty' 2>/dev/null)

    if [ -n "$CURRENT_STATUS" ] && [ "$CURRENT_STATUS" != "$FINAL_STATUS" ]; then
      echo -e "  ${BLUE}INFO${NC}  Status: ${CURRENT_STATUS} (${ELAPSED}s)"
      FINAL_STATUS="$CURRENT_STATUS"
    fi

    case "$CURRENT_STATUS" in
      delivered|sent)
        break
        ;;
      queued|sending|initiated)
        # Still in progress
        ;;
      failed|media.failed)
        echo -e "  ${RED}FAIL${NC}  Fax delivery failed: ${CURRENT_STATUS}"
        break
        ;;
    esac
  fi
done

# --- Report ---
echo ""
echo "==============="
echo -e "${BOLD}Results${NC}"
echo "  Fax ID:       ${FAX_ID}"
echo "  Final Status: ${FINAL_STATUS:-unknown}"

case "$FINAL_STATUS" in
  delivered|sent)
    echo ""
    echo -e "  ${GREEN}${BOLD}PASS${NC}  Fax sent successfully"
    exit 0
    ;;
  queued|sending|initiated)
    echo ""
    echo -e "  ${YELLOW}${BOLD}WARN${NC}  Fax submitted but delivery not confirmed within polling window"
    echo "  Check the Telnyx portal for final status."
    exit 0
    ;;
  *)
    echo ""
    echo -e "  ${RED}${BOLD}FAIL${NC}  Fax was not delivered"
    exit 1
    ;;
esac
