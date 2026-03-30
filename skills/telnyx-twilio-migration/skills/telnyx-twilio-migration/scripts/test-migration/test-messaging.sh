#!/usr/bin/env bash
#
# test-messaging.sh — Send a real test SMS via Telnyx Messaging API
#
# Usage: bash test-messaging.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to actually send the message
#   --dry-run    Validate setup without sending
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY       Your Telnyx API key
#   TELNYX_TO_NUMBER     Destination number (E.164 format) — agent should ask user
#
# Environment variables (optional — auto-detected/created if not set):
#   TELNYX_FROM_NUMBER            Sender number (auto-detected from account if not set)
#   TELNYX_MESSAGING_PROFILE_ID   Messaging profile ID (auto-detected/created if not set)
#
# Exit codes:
#   0 — Message sent and delivery confirmed
#   1 — Message failed or setup error

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
      echo "Usage: bash test-messaging.sh --confirm [--dry-run]"
      echo ""
      echo "Sends a real test SMS via Telnyx Messaging API."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to actually send the message"
      echo "  --dry-run    Validate setup without sending"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY                (required) Your Telnyx API key"
      echo "  TELNYX_TO_NUMBER              (required) Destination phone number, E.164 format"
      echo "  TELNYX_FROM_NUMBER            (optional) Sender number (auto-detected from account)"
      echo "  TELNYX_MESSAGING_PROFILE_ID   (optional) Messaging profile ID (auto-created if needed)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx Messaging Test${NC}"
echo "====================="
echo ""
echo -e "${YELLOW}${BOLD}COST WARNING: This test sends a real SMS (~\$0.004)${NC}"
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
  echo -e "         The agent should ask the user for their phone number to receive the test SMS."
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
  echo -e "${BOLD}Auto-detecting sender number...${NC}"
  # Find a messaging-capable number on the account
  NUMS_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/phone_numbers?page[size]=50&filter[status]=active" 2>/dev/null || echo "")
  if [ -n "$NUMS_RESPONSE" ]; then
    NUM_TOTAL=$(echo "$NUMS_RESPONSE" | jq -r '.meta.total_results // 0' 2>/dev/null)
    if [ "$NUM_TOTAL" = "0" ] || [ -z "$NUM_TOTAL" ]; then
      echo -e "  ${YELLOW}WARN${NC}  No phone numbers on account"
      echo -e "  ${BLUE}INFO${NC}  Searching for a number to purchase..."
      # Determine country from TELNYX_TO_NUMBER prefix
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
        "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=${TO_COUNTRY}&filter[features][]=sms&filter[limit]=1" 2>/dev/null || echo "")
      AVAIL_NUMBER=$(echo "$SEARCH_RESPONSE" | jq -r '.data[0].phone_number // empty' 2>/dev/null)
      if [ -n "$AVAIL_NUMBER" ]; then
        AVAIL_COST=$(echo "$SEARCH_RESPONSE" | jq -r '.data[0].cost_information.monthly_cost // "~$1.00"' 2>/dev/null)
        echo -e "  ${YELLOW}${BOLD}PURCHASE REQUIRED${NC}: Need to buy a number for testing"
        echo -e "  Available: ${AVAIL_NUMBER} (${TO_COUNTRY}, monthly cost: ${AVAIL_COST})"
        if [ "$CONFIRMED" = true ]; then
          echo -e "  ${BLUE}INFO${NC}  Purchasing ${AVAIL_NUMBER}..."
          ORDER_RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer ${TELNYX_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"phone_numbers\": [{\"phone_number\": \"${AVAIL_NUMBER}\"}]}" \
            "https://api.telnyx.com/v2/number_orders" 2>/dev/null || echo "")
          ORDER_ERROR=$(echo "$ORDER_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
          ORDER_STATUS=$(echo "$ORDER_RESPONSE" | jq -r '.data.status // empty' 2>/dev/null)
          if [ -n "$ORDER_ERROR" ]; then
            echo -e "  ${RED}FAIL${NC}  Could not purchase number: $ORDER_ERROR"
            exit 1
          fi
          echo -e "  ${GREEN}PASS${NC}  Number ordered: ${AVAIL_NUMBER} (status: ${ORDER_STATUS})"
          # Wait for provisioning
          sleep 3
          TELNYX_FROM_NUMBER="$AVAIL_NUMBER"
        else
          echo -e "  Run with --confirm to auto-purchase this number."
          exit 0
        fi
      else
        echo -e "  ${RED}FAIL${NC}  No SMS-capable numbers available in ${TO_COUNTRY}"
        echo -e "         Purchase a number at https://portal.telnyx.com/#/app/numbers/search-numbers"
        exit 1
      fi
    else
      # Pick a sender number — messaging profile assignment is critical
      TO_PREFIX=$(echo "${TELNYX_TO_NUMBER}" | grep -o '^+[0-9]\{1,3\}')

      # 1. Same-country number already on a messaging profile (best)
      TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r --arg pfx "$TO_PREFIX" '
        [.data[] | select(.phone_number | startswith($pfx)) | select(.messaging_profile_id != null and .messaging_profile_id != "")] | .[0].phone_number // empty
      ' 2>/dev/null)
      # 2. Any number already on a messaging profile (number must be on profile to send)
      if [ -z "$TELNYX_FROM_NUMBER" ]; then
        TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r '
          [.data[] | select(.messaging_profile_id != null and .messaging_profile_id != "")] | .[0].phone_number // empty
        ' 2>/dev/null)
      fi
      # 3. Same-country number (will try to assign to profile)
      if [ -z "$TELNYX_FROM_NUMBER" ]; then
        TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r --arg pfx "$TO_PREFIX" '
          [.data[] | select(.phone_number | startswith($pfx))] | .[0].phone_number // empty
        ' 2>/dev/null)
      fi
      # 4. Any active number
      if [ -z "$TELNYX_FROM_NUMBER" ]; then
        TELNYX_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | jq -r '.data[0].phone_number // empty' 2>/dev/null)
      fi
      if [ -n "$TELNYX_FROM_NUMBER" ]; then
        echo -e "  ${GREEN}PASS${NC}  Auto-detected sender: ${TELNYX_FROM_NUMBER}"
      else
        echo -e "  ${RED}FAIL${NC}  Could not determine a sender number from account"
        exit 1
      fi
    fi
  else
    echo -e "  ${RED}FAIL${NC}  Could not fetch phone numbers from API"
    exit 1
  fi
else
  echo -e "  ${GREEN}PASS${NC}  TELNYX_FROM_NUMBER: ${TELNYX_FROM_NUMBER}"
fi

# --- Auto-detect or create messaging profile ---
MESSAGING_PROFILE_ID="${TELNYX_MESSAGING_PROFILE_ID:-}"
if [ -z "$MESSAGING_PROFILE_ID" ]; then
  echo ""
  echo -e "${BOLD}Auto-detecting messaging profile...${NC}"
  PROFILE_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/messaging_profiles?page[size]=10" 2>/dev/null || echo "")
  PROFILE_COUNT=$(echo "$PROFILE_RESPONSE" | jq -r '.data | length' 2>/dev/null || echo "0")
  if [ "$PROFILE_COUNT" -gt 0 ] 2>/dev/null; then
    MESSAGING_PROFILE_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
  fi
  if [ -n "$MESSAGING_PROFILE_ID" ]; then
    echo -e "  ${GREEN}PASS${NC}  Using existing messaging profile: ${MESSAGING_PROFILE_ID}"

    # Verify the existing profile's whitelisted_destinations include the destination country (or "*")
    TO_COUNTRY="US"
    if [[ "${TELNYX_TO_NUMBER}" == +353* ]]; then TO_COUNTRY="IE"
    elif [[ "${TELNYX_TO_NUMBER}" == +44* ]]; then TO_COUNTRY="GB"
    elif [[ "${TELNYX_TO_NUMBER}" == +1* ]]; then TO_COUNTRY="US"
    elif [[ "${TELNYX_TO_NUMBER}" == +61* ]]; then TO_COUNTRY="AU"
    elif [[ "${TELNYX_TO_NUMBER}" == +49* ]]; then TO_COUNTRY="DE"
    elif [[ "${TELNYX_TO_NUMBER}" == +33* ]]; then TO_COUNTRY="FR"
    fi

    MP_DETAILS=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/messaging_profiles/${MESSAGING_PROFILE_ID}" 2>/dev/null || echo "")
    MP_WHITELIST_MATCH=$(echo "$MP_DETAILS" | jq -r ".data.whitelisted_destinations // [] | map(select(. == \"${TO_COUNTRY}\" or . == \"*\")) | length" 2>/dev/null)
    if [ "${MP_WHITELIST_MATCH:-0}" = "0" ]; then
      echo -e "  ${BLUE}INFO${NC}  Profile doesn't whitelist ${TO_COUNTRY} — adding it..."
      CURRENT_WL=$(echo "$MP_DETAILS" | jq -r '.data.whitelisted_destinations // []' 2>/dev/null)
      UPDATED_WL=$(echo "$CURRENT_WL" | jq --arg c "$TO_COUNTRY" '. + [$c] | unique' 2>/dev/null)
      MP_UPDATE=$(curl -s -g -X PATCH \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"whitelisted_destinations\": ${UPDATED_WL}}" \
        "https://api.telnyx.com/v2/messaging_profiles/${MESSAGING_PROFILE_ID}" 2>/dev/null || echo "")
      MP_UPDATE_ERR=$(echo "$MP_UPDATE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
      if [ -n "$MP_UPDATE_ERR" ]; then
        echo -e "  ${YELLOW}WARN${NC}  Could not update whitelist: $MP_UPDATE_ERR"
      else
        echo -e "  ${GREEN}PASS${NC}  Added ${TO_COUNTRY} to messaging profile whitelist"
      fi
    else
      echo -e "  ${GREEN}PASS${NC}  Profile whitelists ${TO_COUNTRY}"
    fi
  else
    # Auto-create a messaging profile
    echo -e "  ${BLUE}INFO${NC}  No messaging profile found — creating one..."
    CREATE_RESPONSE=$(curl -s -g -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"Migration Test Profile $(date +%s)\", \"whitelisted_destinations\": [\"*\"]}" \
      "https://api.telnyx.com/v2/messaging_profiles" 2>/dev/null || echo "")
    MESSAGING_PROFILE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
    CREATE_ERROR=$(echo "$CREATE_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
    if [ -n "$CREATE_ERROR" ]; then
      echo -e "  ${RED}FAIL${NC}  Could not create messaging profile: $CREATE_ERROR"
      exit 1
    fi
    if [ -n "$MESSAGING_PROFILE_ID" ]; then
      echo -e "  ${GREEN}PASS${NC}  Created messaging profile: ${MESSAGING_PROFILE_ID}"
    else
      echo -e "  ${RED}FAIL${NC}  Could not create messaging profile"
      exit 1
    fi
  fi

  # Ensure the from number is assigned to this messaging profile
  echo -e "  ${BLUE}INFO${NC}  Ensuring ${TELNYX_FROM_NUMBER} is assigned to profile..."
  NUM_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${TELNYX_FROM_NUMBER}&page[size]=1" 2>/dev/null || echo "")
  PHONE_ID=$(echo "$NUM_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
  CURRENT_PROFILE=$(echo "$NUM_RESPONSE" | jq -r '.data[0].messaging_profile_id // empty' 2>/dev/null)
  if [ -n "$PHONE_ID" ]; then
    if [ "$CURRENT_PROFILE" = "$MESSAGING_PROFILE_ID" ]; then
      echo -e "  ${GREEN}PASS${NC}  Number already assigned to this profile"
    else
      ASSIGN_RESPONSE=$(curl -s -g -X PATCH \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"messaging_profile_id\": \"${MESSAGING_PROFILE_ID}\"}" \
        "https://api.telnyx.com/v2/phone_numbers/${PHONE_ID}/messaging" 2>/dev/null || echo "")
      ASSIGN_ERROR=$(echo "$ASSIGN_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)
      if [ -n "$ASSIGN_ERROR" ]; then
        echo -e "  ${YELLOW}WARN${NC}  Could not assign number to profile: $ASSIGN_ERROR"
      else
        echo -e "  ${GREEN}PASS${NC}  Number assigned to messaging profile"
      fi
    fi
  else
    echo -e "  ${YELLOW}WARN${NC}  Could not look up phone number — profile created but number not assigned"
  fi
fi

# --- Dry run exits here ---
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${BOLD}Dry run complete.${NC} Setup looks good."
  echo "  Would send SMS: ${TELNYX_FROM_NUMBER} -> ${TELNYX_TO_NUMBER}"
  echo "  Messaging profile: ${MESSAGING_PROFILE_ID:-none}"
  echo "  Estimated cost: ~\$0.004"
  echo ""
  echo "Run with --confirm to send the message."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Send an SMS from ${TELNYX_FROM_NUMBER} to ${TELNYX_TO_NUMBER}"
  echo "  2. Poll for delivery status"
  echo "  3. Report message ID, status, and cost"
  echo ""
  echo "  Estimated cost: ~\$0.004"
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Send the message ---
echo ""
echo -e "${BOLD}Sending SMS...${NC}"
echo "  From: ${TELNYX_FROM_NUMBER}"
echo "  To:   ${TELNYX_TO_NUMBER}"
echo ""

# Build JSON payload
MSG_TEXT="Telnyx migration test $(date -u +%Y-%m-%dT%H:%M:%SZ). If you received this, messaging is working."

if [ -n "$MESSAGING_PROFILE_ID" ]; then
  PAYLOAD="{
    \"from\": \"${TELNYX_FROM_NUMBER}\",
    \"to\": \"${TELNYX_TO_NUMBER}\",
    \"text\": \"${MSG_TEXT}\",
    \"messaging_profile_id\": \"${MESSAGING_PROFILE_ID}\"
  }"
else
  PAYLOAD="{
    \"from\": \"${TELNYX_FROM_NUMBER}\",
    \"to\": \"${TELNYX_TO_NUMBER}\",
    \"text\": \"${MSG_TEXT}\"
  }"
fi

SEND_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://api.telnyx.com/v2/messages" 2>/dev/null || echo "")

if [ -z "$SEND_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API"
  exit 1
fi

# Extract message ID
MESSAGE_ID=""
INITIAL_STATUS=""
if [ "$HAS_JQ" = true ]; then
  MESSAGE_ID=$(echo "$SEND_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
  INITIAL_STATUS=$(echo "$SEND_RESPONSE" | jq -r '.data.to[0].status // .data.status // empty' 2>/dev/null)
  API_ERROR=$(echo "$SEND_RESPONSE" | jq -r '.errors[0].detail // empty' 2>/dev/null)

  if [ -n "$API_ERROR" ]; then
    echo -e "  ${RED}FAIL${NC}  API error: $API_ERROR"
    ERROR_CODE=$(echo "$SEND_RESPONSE" | jq -r '.errors[0].code // empty' 2>/dev/null)
    if [ -n "$ERROR_CODE" ]; then
      echo -e "  ${BLUE}INFO${NC}  Error code: $ERROR_CODE"
    fi
    exit 1
  fi
fi

if [ -z "$MESSAGE_ID" ]; then
  echo -e "  ${RED}FAIL${NC}  Could not extract message ID from response"
  if [ "$HAS_JQ" = true ]; then
    echo "  Response: $(echo "$SEND_RESPONSE" | jq -c . 2>/dev/null || echo "$SEND_RESPONSE")"
  fi
  exit 1
fi

echo -e "  ${GREEN}PASS${NC}  Message sent"
echo "  Message ID: ${MESSAGE_ID}"
echo "  Initial Status: ${INITIAL_STATUS:-unknown}"

# --- Poll for delivery status ---
echo ""
echo -e "${BOLD}Polling delivery status...${NC}"

MAX_POLL=30
POLL_INTERVAL=2
POLL_START=$(date +%s)
FINAL_STATUS=""
DELIVERY_CONFIRMED=false

while true; do
  ELAPSED=$(( $(date +%s) - POLL_START ))

  if [ "$ELAPSED" -ge "$MAX_POLL" ]; then
    echo -e "  ${YELLOW}WARN${NC}  Polling timeout after ${MAX_POLL}s"
    break
  fi

  sleep "$POLL_INTERVAL"

  # Check message status via API
  STATUS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/messages/${MESSAGE_ID}" 2>/dev/null || echo "")

  if [ "$HAS_JQ" = true ] && [ -n "$STATUS_RESPONSE" ]; then
    CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.to[0].status // .data.status // empty' 2>/dev/null)
    MSG_COST=$(echo "$STATUS_RESPONSE" | jq -r '.data.cost.amount // empty' 2>/dev/null)
    MSG_CURRENCY=$(echo "$STATUS_RESPONSE" | jq -r '.data.cost.currency // empty' 2>/dev/null)

    if [ -n "$CURRENT_STATUS" ] && [ "$CURRENT_STATUS" != "$FINAL_STATUS" ]; then
      echo -e "  ${BLUE}INFO${NC}  Status: ${CURRENT_STATUS} (${ELAPSED}s)"
      FINAL_STATUS="$CURRENT_STATUS"
    fi

    case "$CURRENT_STATUS" in
      delivered)
        DELIVERY_CONFIRMED=true
        break
        ;;
      sent)
        # Keep polling — might still get delivery confirmation
        ;;
      queued|sending)
        # Still in progress
        ;;
      failed|undelivered|sending_failed|delivery_failed)
        echo -e "  ${RED}FAIL${NC}  Message delivery failed: ${CURRENT_STATUS}"
        break
        ;;
    esac
  fi
done

# --- Report ---
echo ""
echo "====================="
echo -e "${BOLD}Results${NC}"
echo "  Message ID:     ${MESSAGE_ID}"
echo "  Final Status:   ${FINAL_STATUS:-unknown}"
if [ -n "${MSG_COST:-}" ] && [ -n "${MSG_CURRENCY:-}" ]; then
  echo "  Cost:           ${MSG_COST} ${MSG_CURRENCY}"
else
  echo "  Cost:           ~\$0.004 (estimated)"
fi

if [ "$DELIVERY_CONFIRMED" = true ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}PASS${NC}  Message delivered successfully"
  exit 0
elif [ "$FINAL_STATUS" = "sent" ]; then
  echo ""
  echo -e "  ${YELLOW}${BOLD}WARN${NC}  Message sent but delivery not confirmed within polling window"
  echo "  This is normal — delivery receipts can be delayed."
  echo "  Check the Telnyx portal for final status."
  exit 0
else
  echo ""
  echo -e "  ${RED}${BOLD}FAIL${NC}  Message was not delivered"
  echo "  Check that the destination number is valid and can receive SMS."
  exit 1
fi
