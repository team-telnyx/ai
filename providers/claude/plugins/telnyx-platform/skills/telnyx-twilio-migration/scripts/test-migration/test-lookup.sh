#!/usr/bin/env bash
#
# test-lookup.sh — Test number lookup via Telnyx Lookup API
#
# Usage: bash test-lookup.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to actually run the lookup
#   --dry-run    Validate setup without running lookup
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY       Your Telnyx API key
#
# Environment variables (optional):
#   TELNYX_LOOKUP_NUMBER   Number to look up (defaults to TELNYX_TO_NUMBER or a test number)
#
# Exit codes:
#   0 — Lookup successful
#   1 — Lookup failed or setup error

set -euo pipefail

# --- Colors (disabled if not a terminal) ---
# shellcheck disable=SC2034  # BLUE reserved for info lines; kept for palette consistency
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
      echo "Usage: bash test-lookup.sh --confirm [--dry-run]"
      echo ""
      echo "Tests number lookup via Telnyx Lookup API."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to actually run the lookup"
      echo "  --dry-run    Validate setup without running lookup"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY         (required) Your Telnyx API key"
      echo "  TELNYX_LOOKUP_NUMBER   (optional) Number to look up (E.164 format)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx Number Lookup Test${NC}"
echo "========================="
echo ""
echo -e "${YELLOW}${BOLD}COST WARNING: This test performs a number lookup (~\$0.01)${NC}"
echo ""

# --- Validate prerequisites ---
ERRORS=0

if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_API_KEY is not set"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_API_KEY is set (${TELNYX_API_KEY:0:8}...)"
fi

# Determine number to look up
LOOKUP_NUMBER="${TELNYX_LOOKUP_NUMBER:-${TELNYX_TO_NUMBER:-}}"
if [ -z "$LOOKUP_NUMBER" ]; then
  echo -e "  ${RED}FAIL${NC}  No number to look up. Set TELNYX_LOOKUP_NUMBER or TELNYX_TO_NUMBER"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  Lookup number: ${LOOKUP_NUMBER}"
fi

if ! command -v curl &>/dev/null; then
  echo -e "  ${RED}FAIL${NC}  curl is not installed"
  ERRORS=$((ERRORS + 1))
fi

if ! command -v jq &>/dev/null; then
  echo -e "  ${YELLOW}WARN${NC}  jq not installed — output will be raw JSON"
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

# --- Dry run exits here ---
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${BOLD}Dry run complete.${NC} Setup looks good."
  echo "  Would look up: ${LOOKUP_NUMBER}"
  echo "  Estimated cost: ~\$0.01"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Look up carrier and line type for ${LOOKUP_NUMBER}"
  echo "  2. Report carrier name, line type, and country code"
  echo ""
  echo "  Estimated cost: ~\$0.01"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Perform lookup ---
echo ""
echo -e "${BOLD}Looking up number...${NC}"
echo "  Number: ${LOOKUP_NUMBER}"
echo ""

# URL-encode the + sign
ENCODED_NUMBER="${LOOKUP_NUMBER/+/%2B}"

LOOKUP_RESPONSE=$(curl -s \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/number_lookup/${ENCODED_NUMBER}" 2>/dev/null || echo "")

if [ -z "$LOOKUP_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API"
  exit 1
fi

# Check for errors
if command -v jq &>/dev/null; then
  API_ERROR=$(echo "$LOOKUP_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
  if [ -n "$API_ERROR" ]; then
    echo -e "  ${RED}FAIL${NC}  API error: $API_ERROR"
    exit 1
  fi

  # Extract results
  CARRIER_NAME=$(echo "$LOOKUP_RESPONSE" | jq -r '.data.carrier.name // "unknown"' 2>/dev/null)
  LINE_TYPE=$(echo "$LOOKUP_RESPONSE" | jq -r '.data.carrier.type // "unknown"' 2>/dev/null)
  COUNTRY_CODE=$(echo "$LOOKUP_RESPONSE" | jq -r '.data.country_code // "unknown"' 2>/dev/null)
  PHONE_NUMBER=$(echo "$LOOKUP_RESPONSE" | jq -r '.data.phone_number // "unknown"' 2>/dev/null)
  PORTABILITY_STATUS=$(echo "$LOOKUP_RESPONSE" | jq -r '.data.portability.status // "unknown"' 2>/dev/null)

  echo -e "  ${GREEN}PASS${NC}  Lookup successful"
  echo ""
  echo "========================="
  echo -e "${BOLD}Results${NC}"
  echo "  Phone Number:  ${PHONE_NUMBER}"
  echo "  Country:       ${COUNTRY_CODE}"
  echo "  Carrier:       ${CARRIER_NAME}"
  echo "  Line Type:     ${LINE_TYPE}"
  echo "  Portability:   ${PORTABILITY_STATUS}"
else
  echo "  Response: $LOOKUP_RESPONSE"
fi

echo ""
echo -e "  ${GREEN}${BOLD}PASS${NC}  Number lookup completed successfully"
exit 0
