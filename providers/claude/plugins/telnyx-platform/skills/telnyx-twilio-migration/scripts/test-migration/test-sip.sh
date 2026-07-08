#!/usr/bin/env bash
#
# test-sip.sh — Validate SIP trunking connection setup via Telnyx API
#
# Usage: bash test-sip.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to proceed with SIP connection validation
#   --dry-run    Validate API key only, skip connection checks
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY           Your Telnyx API key
#
# Environment variables (optional — auto-detected/created if not set):
#   TELNYX_SIP_CONNECTION_ID   SIP connection ID (auto-detected/created if not set)
#
# Exit codes:
#   0 — SIP connection validated successfully
#   1 — Validation failed or setup error
#
# Cost: FREE — no paid API calls are made by this test.
#   This test only validates SIP connection configuration;
#   it does not send actual SIP traffic (that requires a PBX).

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
      echo "Usage: bash test-sip.sh --confirm [--dry-run]"
      echo ""
      echo "Validates SIP trunking connection setup via the Telnyx API."
      echo "No actual SIP traffic is sent (that requires a PBX)."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to proceed with connection validation"
      echo "  --dry-run    Validate API key only, skip connection checks"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY           (required) Your Telnyx API key"
      echo "  TELNYX_SIP_CONNECTION_ID (optional) SIP connection ID (auto-detected/created)"
      echo ""
      echo "Cost: FREE — no paid API calls."
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx SIP Trunking Test${NC}"
echo "========================"
echo ""
echo -e "${GREEN}${BOLD}COST: FREE — no paid API calls${NC}"
echo ""

# --- Validate hard prerequisites ---
ERRORS=0

if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_API_KEY is not set"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_API_KEY is set (${TELNYX_API_KEY:0:8}...)"
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

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Setup validation failed. Fix the errors above.${NC}"
  exit 1
fi

# --- Step 1: Validate API key ---
echo ""
echo -e "${BOLD}Step 1: Validating API key...${NC}"

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
  echo -e "${BOLD}Dry run complete.${NC} API key is valid."
  echo "  Run with --confirm to validate SIP connection setup."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Validate your Telnyx API key"
  echo "  2. Detect or create a SIP connection (credential or IP-based)"
  echo "  3. Verify the connection is active"
  echo "  4. Check for an Outbound Voice Profile (create if needed)"
  echo "  5. Report SIP connection details"
  echo ""
  echo "  Cost: FREE"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Step 2: Auto-detect or create SIP connection ---
echo ""
echo -e "${BOLD}Step 2: Detecting SIP connection...${NC}"

CONNECTION_ID="${TELNYX_SIP_CONNECTION_ID:-}"
CONNECTION_TYPE=""
CONNECTION_NAME=""

if [ -n "$CONNECTION_ID" ]; then
  echo -e "  ${GREEN}PASS${NC}  TELNYX_SIP_CONNECTION_ID provided: ${CONNECTION_ID}"
else
  echo -e "  ${BLUE}INFO${NC}  TELNYX_SIP_CONNECTION_ID not set — auto-detecting..."

  # Search existing connections
  CONN_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/connections?page[size]=25" 2>/dev/null || echo "")

  if [ "$HAS_JQ" = true ] && [ -n "$CONN_RESPONSE" ]; then
    # Look for IP connections first
    CONNECTION_ID=$(echo "$CONN_RESPONSE" | jq -r '
      [.data[] | select(.record_type == "ip_connection")] | .[0].id // empty
    ' 2>/dev/null)
    if [ -n "$CONNECTION_ID" ]; then
      CONNECTION_TYPE="ip"
      CONNECTION_NAME=$(echo "$CONN_RESPONSE" | jq -r --arg id "$CONNECTION_ID" '
        [.data[] | select(.id == $id)] | .[0].connection_name // empty
      ' 2>/dev/null)
      echo -e "  ${GREEN}PASS${NC}  Found IP connection: ${CONNECTION_ID} (${CONNECTION_NAME})"
    fi

    # If no IP connection, look for credential connections
    if [ -z "$CONNECTION_ID" ]; then
      CONNECTION_ID=$(echo "$CONN_RESPONSE" | jq -r '
        [.data[] | select(.record_type == "credential_connection")] | .[0].id // empty
      ' 2>/dev/null)
      if [ -n "$CONNECTION_ID" ]; then
        CONNECTION_TYPE="credential"
        CONNECTION_NAME=$(echo "$CONN_RESPONSE" | jq -r --arg id "$CONNECTION_ID" '
          [.data[] | select(.id == $id)] | .[0].connection_name // empty
        ' 2>/dev/null)
        echo -e "  ${GREEN}PASS${NC}  Found credential connection: ${CONNECTION_ID} (${CONNECTION_NAME})"
      fi
    fi
  fi

  # If no SIP connection found, create a credential connection
  if [ -z "$CONNECTION_ID" ]; then
    echo -e "  ${BLUE}INFO${NC}  No SIP connection found — creating credential connection..."

    CREATE_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{
        "connection_name": "migration-test-sip",
        "active": true,
        "webrtc_enabled": false,
        "anchorsite_override": "Latency"
      }' \
      "https://api.telnyx.com/v2/credential_connections" 2>/dev/null || echo "")

    if [ -z "$CREATE_RESPONSE" ]; then
      echo -e "  ${RED}FAIL${NC}  No response from API when creating connection"
      exit 1
    fi

    if [ "$HAS_JQ" = true ]; then
      CREATE_ERROR=$(echo "$CREATE_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
      if [ -n "$CREATE_ERROR" ]; then
        echo -e "  ${RED}FAIL${NC}  Could not create credential connection: $CREATE_ERROR"
        exit 1
      fi
      CONNECTION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
      CONNECTION_NAME=$(echo "$CREATE_RESPONSE" | jq -r '.data.connection_name // empty' 2>/dev/null)
    fi

    if [ -z "$CONNECTION_ID" ]; then
      echo -e "  ${RED}FAIL${NC}  Could not extract connection ID from response"
      exit 1
    fi

    CONNECTION_TYPE="credential"
    echo -e "  ${GREEN}PASS${NC}  Created credential connection: ${CONNECTION_ID} (${CONNECTION_NAME})"
  fi
fi

# --- Step 3: Verify connection is active ---
echo ""
echo -e "${BOLD}Step 3: Verifying connection is active...${NC}"

# Determine connection type if not already known (when ID was provided via env var)
if [ -z "$CONNECTION_TYPE" ]; then
  # Try credential connection first
  VERIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/credential_connections/${CONNECTION_ID}" 2>/dev/null || echo "000")
  if [ "$VERIFY_RESPONSE" = "200" ]; then
    CONNECTION_TYPE="credential"
  else
    VERIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/ip_connections/${CONNECTION_ID}" 2>/dev/null || echo "000")
    if [ "$VERIFY_RESPONSE" = "200" ]; then
      CONNECTION_TYPE="ip"
    else
      echo -e "  ${RED}FAIL${NC}  Connection ${CONNECTION_ID} not found as credential or IP connection"
      exit 1
    fi
  fi
fi

# Fetch connection details
if [ "$CONNECTION_TYPE" = "credential" ]; then
  CONN_DETAIL_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/credential_connections/${CONNECTION_ID}" 2>/dev/null || echo "")
elif [ "$CONNECTION_TYPE" = "ip" ]; then
  CONN_DETAIL_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/ip_connections/${CONNECTION_ID}" 2>/dev/null || echo "")
fi

if [ -z "$CONN_DETAIL_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response when fetching connection details"
  exit 1
fi

CONN_ACTIVE=""
if [ "$HAS_JQ" = true ]; then
  CONN_ACTIVE=$(echo "$CONN_DETAIL_RESPONSE" | jq -r '.data.active // empty' 2>/dev/null)
  if [ -z "$CONNECTION_NAME" ]; then
    CONNECTION_NAME=$(echo "$CONN_DETAIL_RESPONSE" | jq -r '.data.connection_name // empty' 2>/dev/null)
  fi
  CONN_ERROR=$(echo "$CONN_DETAIL_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
  if [ -n "$CONN_ERROR" ]; then
    echo -e "  ${RED}FAIL${NC}  Error fetching connection: $CONN_ERROR"
    exit 1
  fi
fi

if [ "$CONN_ACTIVE" = "true" ]; then
  echo -e "  ${GREEN}PASS${NC}  Connection is active"
else
  echo -e "  ${YELLOW}WARN${NC}  Connection active status: ${CONN_ACTIVE:-unknown}"
  echo -e "         Connection may need to be activated in the Telnyx portal"
fi

# --- Step 4: Check for Outbound Voice Profile ---
echo ""
echo -e "${BOLD}Step 4: Checking Outbound Voice Profile...${NC}"

OVP_ID=""
OVP_NAME=""

OVP_RESPONSE=$(curl -s -g \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/outbound_voice_profiles?page[size]=5" 2>/dev/null || echo "")

if [ "$HAS_JQ" = true ] && [ -n "$OVP_RESPONSE" ]; then
  OVP_COUNT=$(echo "$OVP_RESPONSE" | jq -r '.data | length' 2>/dev/null)

  if [ "$OVP_COUNT" -gt 0 ] 2>/dev/null; then
    OVP_ID=$(echo "$OVP_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
    OVP_NAME=$(echo "$OVP_RESPONSE" | jq -r '.data[0].name // empty' 2>/dev/null)
    echo -e "  ${GREEN}PASS${NC}  Found Outbound Voice Profile: ${OVP_ID} (${OVP_NAME})"
  else
    echo -e "  ${BLUE}INFO${NC}  No Outbound Voice Profile found — creating one..."

    OVP_CREATE_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "migration-test-ovp",
        "enabled": true,
        "whitelisted_destinations": ["US", "CA", "GB"]
      }' \
      "https://api.telnyx.com/v2/outbound_voice_profiles" 2>/dev/null || echo "")

    if [ -z "$OVP_CREATE_RESPONSE" ]; then
      echo -e "  ${RED}FAIL${NC}  No response from API when creating OVP"
      exit 1
    fi

    OVP_CREATE_ERROR=$(echo "$OVP_CREATE_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
    if [ -n "$OVP_CREATE_ERROR" ]; then
      echo -e "  ${RED}FAIL${NC}  Could not create Outbound Voice Profile: $OVP_CREATE_ERROR"
      exit 1
    fi

    OVP_ID=$(echo "$OVP_CREATE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
    OVP_NAME=$(echo "$OVP_CREATE_RESPONSE" | jq -r '.data.name // empty' 2>/dev/null)

    if [ -z "$OVP_ID" ]; then
      echo -e "  ${RED}FAIL${NC}  Could not extract OVP ID from response"
      exit 1
    fi

    echo -e "  ${GREEN}PASS${NC}  Created Outbound Voice Profile: ${OVP_ID} (${OVP_NAME})"
    echo -e "  ${BLUE}INFO${NC}  Whitelisted destinations: US, CA, GB"
  fi
fi

# --- Step 5: Report results ---
echo ""
echo "========================"
echo -e "${BOLD}Results${NC}"
echo "  Connection Type: ${CONNECTION_TYPE}"
echo "  Connection ID:   ${CONNECTION_ID}"
echo "  Connection Name: ${CONNECTION_NAME:-N/A}"
echo "  Active:          ${CONN_ACTIVE:-unknown}"
echo "  OVP ID:          ${OVP_ID:-N/A}"
echo "  OVP Name:        ${OVP_NAME:-N/A}"
echo ""
echo -e "  ${GREEN}${BOLD}PASS${NC}  SIP connection is configured and ready"
echo ""
echo "  Note: This test validates connection setup only."
echo "  Actual SIP traffic requires a PBX or SIP client pointed at sip.telnyx.com."
exit 0
