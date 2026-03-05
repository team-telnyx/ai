#!/usr/bin/env bash
#
# test-voice.sh — Make a real outbound test call via Telnyx Call Control API
#
# Usage: bash test-voice.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to actually place the call
#   --dry-run    Validate setup without making a call
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY       Your Telnyx API key
#   TELNYX_TO_NUMBER     Destination number (E.164 format) — agent should ask user
#
# Environment variables (optional — auto-detected/created if not set):
#   TELNYX_FROM_NUMBER     Caller ID (auto-detected from account if not set)
#   TELNYX_CONNECTION_ID   Connection ID (auto-detected/created if not set)
#
# Exit codes:
#   0 — Call completed successfully
#   1 — Call failed or setup error

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
      echo "Usage: bash test-voice.sh --confirm [--dry-run]"
      echo ""
      echo "Makes a real outbound test call via Telnyx Call Control API."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to actually place the call"
      echo "  --dry-run    Validate setup without making a call"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY       (required) Your Telnyx API key"
      echo "  TELNYX_TO_NUMBER     (required) Destination phone number, E.164 format"
      echo "  TELNYX_FROM_NUMBER   (optional) Caller ID (auto-detected from account)"
      echo "  TELNYX_CONNECTION_ID (optional) Connection ID (auto-created if needed)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx Voice Test${NC}"
echo "=================="
echo ""
echo -e "${YELLOW}${BOLD}COST WARNING: This test makes a real outbound call (~\$0.01)${NC}"
echo ""

# --- Validate hard prerequisites ---
ERRORS=0

if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_API_KEY is not set"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_API_KEY is set (${TELNYX_API_KEY:0:8}...)"
fi

if [ -z "${TELNYX_TO_NUMBER:-}" ]; then
  echo -e "  ${RED}FAIL${NC}  TELNYX_TO_NUMBER is not set"
  echo -e "         The agent should ask the user for their phone number to receive the test call."
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
  echo -e "${BOLD}Auto-detecting caller ID number...${NC}"
  NUMS_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=50&filter[status]=active" 2>/dev/null || echo "")
  NUM_TOTAL=$(echo "$NUMS_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
  if [ "$NUM_TOTAL" = "0" ] || [ -z "$NUM_TOTAL" ]; then
    echo -e "  ${YELLOW}WARN${NC}  No phone numbers on account"
    echo -e "  ${BLUE}INFO${NC}  Searching for a voice-capable number to purchase..."
    TO_COUNTRY="US"
    if [[ "${TELNYX_TO_NUMBER}" == +353* ]]; then TO_COUNTRY="IE"
    elif [[ "${TELNYX_TO_NUMBER}" == +44* ]]; then TO_COUNTRY="GB"
    elif [[ "${TELNYX_TO_NUMBER}" == +1* ]]; then TO_COUNTRY="US"
    elif [[ "${TELNYX_TO_NUMBER}" == +61* ]]; then TO_COUNTRY="AU"
    elif [[ "${TELNYX_TO_NUMBER}" == +49* ]]; then TO_COUNTRY="DE"
    elif [[ "${TELNYX_TO_NUMBER}" == +33* ]]; then TO_COUNTRY="FR"
    fi
    SEARCH_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=${TO_COUNTRY}&filter[features][]=voice&filter[limit]=1" 2>/dev/null || echo "")
    AVAIL_NUMBER=$(echo "$SEARCH_RESPONSE" | jq -r '.data[0].phone_number // empty' 2>/dev/null)
    if [ -n "$AVAIL_NUMBER" ]; then
      echo -e "  ${YELLOW}${BOLD}PURCHASE REQUIRED${NC}: Need to buy a number for testing"
      echo -e "  Available: ${AVAIL_NUMBER} (${TO_COUNTRY})"
      if [ "$CONFIRMED" = true ]; then
        echo -e "  ${BLUE}INFO${NC}  Purchasing ${AVAIL_NUMBER}..."
        ORDER_RESPONSE=$(curl -s -X POST \
          -H "Authorization: Bearer ${TELNYX_API_KEY}" \
          -H "Content-Type: application/json" \
          -d "{\"phone_numbers\": [{\"phone_number\": \"${AVAIL_NUMBER}\"}]}" \
          "https://api.telnyx.com/v2/number_orders" 2>/dev/null || echo "")
        ORDER_ERROR=$(echo "$ORDER_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
        if [ -n "$ORDER_ERROR" ]; then
          echo -e "  ${RED}FAIL${NC}  Could not purchase number: $ORDER_ERROR"
          exit 1
        fi
        echo -e "  ${GREEN}PASS${NC}  Number ordered: ${AVAIL_NUMBER}"
        sleep 3
        TELNYX_FROM_NUMBER="$AVAIL_NUMBER"
      else
        echo -e "  Run with --confirm to auto-purchase this number."
        exit 0
      fi
    else
      echo -e "  ${RED}FAIL${NC}  No voice-capable numbers available in ${TO_COUNTRY}"
      echo -e "         Purchase a number at https://portal.telnyx.com/#/app/numbers/search-numbers"
      exit 1
    fi
  else
    # Pick a caller ID — prefer same-country number with a connection assigned
    TO_PREFIX=$(echo "${TELNYX_TO_NUMBER}" | grep -o '^+[0-9]\{1,3\}')
    # Same-country with connection
    TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r --arg pfx "$TO_PREFIX" '
      [.data[] | select(.phone_number | startswith($pfx)) | select(.connection_id != null and .connection_id != "")] | .[0].phone_number // empty
    ' 2>/dev/null)
    # Same-country without connection
    if [ -z "$TELNYX_FROM_NUMBER" ]; then
      TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r --arg pfx "$TO_PREFIX" '
        [.data[] | select(.phone_number | startswith($pfx))] | .[0].phone_number // empty
      ' 2>/dev/null)
    fi
    # Any number with connection
    if [ -z "$TELNYX_FROM_NUMBER" ]; then
      TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r '
        [.data[] | select(.connection_id != null and .connection_id != "")] | .[0].phone_number // empty
      ' 2>/dev/null)
    fi
    # Any number at all
    if [ -z "$TELNYX_FROM_NUMBER" ]; then
      TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r '.data[0].phone_number // empty' 2>/dev/null)
    fi
    if [ -n "$TELNYX_FROM_NUMBER" ]; then
      echo -e "  ${GREEN}PASS${NC}  Auto-detected caller ID: ${TELNYX_FROM_NUMBER}"
    else
      echo -e "  ${RED}FAIL${NC}  Could not determine a caller ID from account"
      exit 1
    fi
  fi
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_FROM_NUMBER: ${TELNYX_FROM_NUMBER}"
fi

# --- Dry run exits here ---
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${BOLD}Dry run complete.${NC} Setup looks good."
  echo "  Would call: ${TELNYX_FROM_NUMBER} -> ${TELNYX_TO_NUMBER}"
  echo "  Estimated cost: ~\$0.01"
  echo ""
  echo "Run with --confirm to place the call."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Place an outbound call from ${TELNYX_FROM_NUMBER} to ${TELNYX_TO_NUMBER}"
  echo "  2. Play a short TTS message when answered"
  echo "  3. Hang up after the message"
  echo "  4. Report call status and duration"
  echo ""
  echo "  Estimated cost: ~\$0.01"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Build connection_id if needed ---
CONNECTION_ID="${TELNYX_CONNECTION_ID:-}"
if [ -z "$CONNECTION_ID" ]; then
  echo ""
  echo -e "${BOLD}Auto-detecting connection ID...${NC}"

  # Determine destination country for OVP matching
  TO_COUNTRY="US"
  if [[ "${TELNYX_TO_NUMBER}" == +353* ]]; then TO_COUNTRY="IE"
  elif [[ "${TELNYX_TO_NUMBER}" == +44* ]]; then TO_COUNTRY="GB"
  elif [[ "${TELNYX_TO_NUMBER}" == +1* ]]; then TO_COUNTRY="US"
  elif [[ "${TELNYX_TO_NUMBER}" == +61* ]]; then TO_COUNTRY="AU"
  elif [[ "${TELNYX_TO_NUMBER}" == +49* ]]; then TO_COUNTRY="DE"
  elif [[ "${TELNYX_TO_NUMBER}" == +33* ]]; then TO_COUNTRY="FR"
  fi

  # First check Call Control Applications (the right type for voice calls)
  CCA_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/call_control_applications?page[size]=10" 2>/dev/null || echo "")
  if [ "$HAS_JQ" = true ] && [ -n "$CCA_RESPONSE" ]; then
    # Get all apps with OVPs
    APPS_WITH_OVP=$(echo "$CCA_RESPONSE" | jq -r '
      [.data[] | select(.outbound.outbound_voice_profile_id != null and .outbound.outbound_voice_profile_id != "")]
    ' 2>/dev/null)
    APP_COUNT=$(echo "$APPS_WITH_OVP" | jq -r 'length' 2>/dev/null)

    # Check each app's OVP for destination country whitelisting
    if [ "$APP_COUNT" -gt 0 ] 2>/dev/null; then
      for i in $(seq 0 $((APP_COUNT - 1))); do
        CANDIDATE_ID=$(echo "$APPS_WITH_OVP" | jq -r ".[$i].id" 2>/dev/null)
        CANDIDATE_OVP=$(echo "$APPS_WITH_OVP" | jq -r ".[$i].outbound.outbound_voice_profile_id" 2>/dev/null)
        # Check if this OVP whitelists the destination country
        OVP_DETAILS=$(curl -s -g \
          -H "Authorization: Bearer ${TELNYX_API_KEY}" \
          "https://api.telnyx.com/v2/outbound_voice_profiles/${CANDIDATE_OVP}" 2>/dev/null || echo "")
        COUNTRY_MATCH=$(echo "$OVP_DETAILS" | jq -r ".data.whitelisted_destinations // [] | map(select(. == \"${TO_COUNTRY}\" or . == \"*\")) | length" 2>/dev/null)
        if [ "$COUNTRY_MATCH" -gt 0 ] 2>/dev/null; then
          CONNECTION_ID="$CANDIDATE_ID"
          echo -e "  ${GREEN}PASS${NC}  Using Call Control app with OVP whitelisting ${TO_COUNTRY}: ${CONNECTION_ID}"
          break
        fi
      done

      # Fall back to first app with OVP if no country match
      if [ -z "$CONNECTION_ID" ]; then
        CONNECTION_ID=$(echo "$APPS_WITH_OVP" | jq -r '.[0].id' 2>/dev/null)
        echo -e "  ${YELLOW}WARN${NC}  Using Call Control app (OVP may not whitelist ${TO_COUNTRY}): ${CONNECTION_ID}"
        echo -e "  ${BLUE}INFO${NC}  If call fails with D13, add ${TO_COUNTRY} to the OVP's whitelisted destinations in portal"
      fi
    else
      # Fall back to any Call Control app
      CONNECTION_ID=$(echo "$CCA_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
      if [ -n "$CONNECTION_ID" ]; then
        echo -e "  ${GREEN}PASS${NC}  Using existing Call Control app: ${CONNECTION_ID}"
        echo -e "  ${YELLOW}WARN${NC}  This app has no Outbound Voice Profile — call may fail"
      fi
    fi
  fi

  # Fall back to generic connections endpoint
  if [ -z "$CONNECTION_ID" ]; then
    CONN_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/connections?page[size]=1" 2>/dev/null || echo "")
    if [ "$HAS_JQ" = true ] && [ -n "$CONN_RESPONSE" ]; then
      CONNECTION_ID=$(echo "$CONN_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
    if [ -n "$CONNECTION_ID" ]; then
      echo -e "  ${GREEN}PASS${NC}  Using existing connection: ${CONNECTION_ID}"
    fi
  fi

  if [ -z "$CONNECTION_ID" ]; then
    # Auto-create: first create an Outbound Voice Profile, then the Call Control app
    echo -e "  ${BLUE}INFO${NC}  No connection found — creating Call Control app..."

    # Create OVP with destination country whitelisted (TO_COUNTRY set above)
    UNIQUE_SUFFIX=$(date +%s)
    OVP_RESPONSE=$(curl -s -g -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Migration Test OVP ${UNIQUE_SUFFIX}\",
        \"whitelisted_destinations\": [\"US\", \"${TO_COUNTRY}\"]
      }" \
      "https://api.telnyx.com/v2/outbound_voice_profiles" 2>/dev/null || echo "")
    OVP_ID=""
    if [ "$HAS_JQ" = true ] && [ -n "$OVP_RESPONSE" ]; then
      OVP_ID=$(echo "$OVP_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
      OVP_ERROR=$(echo "$OVP_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
      if [ -n "$OVP_ERROR" ]; then
        echo -e "  ${YELLOW}WARN${NC}  Could not create OVP: $OVP_ERROR"
      fi
    fi
    if [ -n "$OVP_ID" ]; then
      echo -e "  ${GREEN}PASS${NC}  Created Outbound Voice Profile: ${OVP_ID} (whitelisted: US, ${TO_COUNTRY})"
    fi

    # Build the Call Control app payload with OVP if available
    CCA_PAYLOAD="{
      \"application_name\": \"Migration Test ${UNIQUE_SUFFIX}\",
      \"webhook_event_url\": \"https://example.com/webhooks\""
    if [ -n "$OVP_ID" ]; then
      CCA_PAYLOAD="${CCA_PAYLOAD}, \"outbound\": {\"outbound_voice_profile_id\": \"${OVP_ID}\"}"
    fi
    CCA_PAYLOAD="${CCA_PAYLOAD}}"

    CONN_CREATE_RESPONSE=$(curl -s -g -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$CCA_PAYLOAD" \
      "https://api.telnyx.com/v2/call_control_applications" 2>/dev/null || echo "")
    if [ "$HAS_JQ" = true ] && [ -n "$CONN_CREATE_RESPONSE" ]; then
      CONNECTION_ID=$(echo "$CONN_CREATE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
      CONN_CREATE_ERROR=$(echo "$CONN_CREATE_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
      if [ -n "$CONN_CREATE_ERROR" ]; then
        echo -e "  ${RED}FAIL${NC}  Could not create connection: $CONN_CREATE_ERROR"
        exit 1
      fi
    fi
    if [ -n "$CONNECTION_ID" ]; then
      echo -e "  ${GREEN}PASS${NC}  Created Call Control app: ${CONNECTION_ID}"
      # Assign the from number to this connection
      echo -e "  ${BLUE}INFO${NC}  Assigning ${TELNYX_FROM_NUMBER} to connection..."
      NUM_RESPONSE=$(curl -s -g \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        "https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${TELNYX_FROM_NUMBER}&page[size]=1" 2>/dev/null || echo "")
      PHONE_ID=""
      if [ "$HAS_JQ" = true ] && [ -n "$NUM_RESPONSE" ]; then
        PHONE_ID=$(echo "$NUM_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
      fi
      if [ -n "$PHONE_ID" ]; then
        ASSIGN_RESPONSE=$(curl -s -g -X PATCH \
          -H "Authorization: Bearer ${TELNYX_API_KEY}" \
          -H "Content-Type: application/json" \
          -d "{\"connection_id\": \"${CONNECTION_ID}\"}" \
          "https://api.telnyx.com/v2/phone_numbers/${PHONE_ID}" 2>/dev/null || echo "")
        ASSIGN_ERROR=""
        if [ "$HAS_JQ" = true ] && [ -n "$ASSIGN_RESPONSE" ]; then
          ASSIGN_ERROR=$(echo "$ASSIGN_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
        fi
        if [ -n "$ASSIGN_ERROR" ]; then
          echo -e "  ${YELLOW}WARN${NC}  Could not assign number to connection: $ASSIGN_ERROR"
        else
          echo -e "  ${GREEN}PASS${NC}  Number assigned to connection"
        fi
      else
        echo -e "  ${YELLOW}WARN${NC}  Could not find phone number ID for ${TELNYX_FROM_NUMBER}"
      fi
    else
      echo -e "  ${RED}FAIL${NC}  Could not create connection. Create one in the Telnyx portal or set TELNYX_CONNECTION_ID."
      exit 1
    fi
  fi
fi

# --- Place the call ---
echo ""
echo -e "${BOLD}Placing call...${NC}"
echo "  From: ${TELNYX_FROM_NUMBER}"
echo "  To:   ${TELNYX_TO_NUMBER}"
echo ""

CALL_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"connection_id\": \"${CONNECTION_ID}\",
    \"to\": \"${TELNYX_TO_NUMBER}\",
    \"from\": \"${TELNYX_FROM_NUMBER}\",
    \"answering_machine_detection\": \"disabled\",
    \"webhook_url\": \"https://example.com/null\"
  }" \
  "https://api.telnyx.com/v2/calls" 2>/dev/null || echo "")

if [ -z "$CALL_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API"
  exit 1
fi

# Extract call control ID
CALL_CONTROL_ID=""
CALL_LEG_ID=""
if [ "$HAS_JQ" = true ]; then
  CALL_CONTROL_ID=$(echo "$CALL_RESPONSE" | jq -r '.data.call_control_id // empty' 2>/dev/null)
  CALL_LEG_ID=$(echo "$CALL_RESPONSE" | jq -r '.data.call_leg_id // empty' 2>/dev/null)
  API_ERROR=$(echo "$CALL_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)

  if [ -n "$API_ERROR" ]; then
    echo -e "  ${RED}FAIL${NC}  API error: $API_ERROR"
    exit 1
  fi
fi

if [ -z "$CALL_CONTROL_ID" ]; then
  echo -e "  ${RED}FAIL${NC}  Could not extract call_control_id from response"
  if [ "$HAS_JQ" = true ]; then
    echo "  Response: $(echo "$CALL_RESPONSE" | jq -c . 2>/dev/null || echo "$CALL_RESPONSE")"
  fi
  exit 1
fi

echo -e "  ${GREEN}PASS${NC}  Call initiated"
echo "  Call Control ID: ${CALL_CONTROL_ID}"
echo "  Call Leg ID:     ${CALL_LEG_ID}"

# --- Monitor call status ---
echo ""
echo -e "${BOLD}Monitoring call status...${NC}"

CALL_START=$(date +%s)
MAX_WAIT=60
LAST_STATE=""
REACHED_ANSWERED=false
STATUS_LOG=""

cleanup_call() {
  if [ -n "$CALL_CONTROL_ID" ]; then
    echo ""
    echo -e "${BOLD}Cleaning up (hanging up if active)...${NC}"
    curl -s -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"call_control_id\": \"${CALL_CONTROL_ID}\"}" \
      "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}/actions/hangup" >/dev/null 2>&1 || true
    echo -e "  ${BLUE}INFO${NC}  Hangup sent"
  fi
}

# Ensure cleanup on exit
trap cleanup_call EXIT

while true; do
  ELAPSED=$(( $(date +%s) - CALL_START ))

  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo -e "  ${YELLOW}WARN${NC}  Timeout after ${MAX_WAIT}s"
    break
  fi

  # Poll call status
  STATUS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}" 2>/dev/null || echo "")

  CURRENT_STATE=""
  if [ "$HAS_JQ" = true ] && [ -n "$STATUS_RESPONSE" ]; then
    # Call Control GET returns is_alive (boolean) and call_duration, not a state name
    IS_ALIVE=$(echo "$STATUS_RESPONSE" | jq -r '.data.is_alive // empty' 2>/dev/null)
    CALL_DURATION=$(echo "$STATUS_RESPONSE" | jq -r '.data.call_duration // empty' 2>/dev/null)
    if [ "$IS_ALIVE" = "true" ]; then
      CURRENT_STATE="active"
    elif [ "$IS_ALIVE" = "false" ]; then
      CURRENT_STATE="ended"
    else
      CURRENT_STATE=""
    fi
  fi

  # Report state changes
  if [ -n "$CURRENT_STATE" ] && [ "$CURRENT_STATE" != "$LAST_STATE" ]; then
    echo -e "  ${BLUE}INFO${NC}  State: ${CURRENT_STATE} (${ELAPSED}s)"
    STATUS_LOG="${STATUS_LOG}${CURRENT_STATE} -> "
    LAST_STATE="$CURRENT_STATE"

    if [ "$CURRENT_STATE" = "answered" ] || [ "$CURRENT_STATE" = "active" ] || [ "$IS_ALIVE" = "true" ]; then
      REACHED_ANSWERED=true

      # Send TTS speak command
      echo -e "  ${BLUE}INFO${NC}  Sending TTS message..."
      curl -s -X POST \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
          \"call_control_id\": \"${CALL_CONTROL_ID}\",
          \"payload\": \"This is a test call from Telnyx. Your migration is working correctly. Goodbye.\",
          \"voice\": \"female\",
          \"language\": \"en-US\"
        }" \
        "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}/actions/speak" >/dev/null 2>&1 || true

      # Wait for TTS to play, then hang up
      sleep 5
      break
    fi

    if [ "$CURRENT_STATE" = "completed" ] || [ "$CURRENT_STATE" = "hangup" ]; then
      break
    fi
  fi

  # Check if call is no longer alive
  if [ "${IS_ALIVE:-}" = "false" ]; then
    echo -e "  ${BLUE}INFO${NC}  Call ended (${ELAPSED}s)"
    break
  fi

  sleep 2
done

CALL_END=$(date +%s)
CALL_DURATION=$(( CALL_END - CALL_START ))

# Disable cleanup trap if we handle it ourselves
trap - EXIT

# Final hangup
echo ""
echo -e "${BOLD}Hanging up...${NC}"
curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"call_control_id\": \"${CALL_CONTROL_ID}\"}" \
  "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}/actions/hangup" >/dev/null 2>&1 || true

# --- Report ---
echo ""
echo "=================="
echo -e "${BOLD}Results${NC}"
echo "  Call Control ID: ${CALL_CONTROL_ID}"
echo "  Status Flow:     ${STATUS_LOG%% -> }"
echo "  Total Duration:  ${CALL_DURATION}s"
echo "  Cost Estimate:   ~\$0.01"

if [ "$REACHED_ANSWERED" = true ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}PASS${NC}  Call was answered and TTS was played"
  exit 0
else
  echo ""
  echo -e "  ${RED}${BOLD}FAIL${NC}  Call did not reach answered state"
  echo "  Check that the destination number is valid and can receive calls."
  exit 1
fi
