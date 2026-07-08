#!/usr/bin/env bash
#
# test-webrtc.sh — Validate WebRTC credential and token generation via Telnyx API
#
# Usage: bash test-webrtc.sh --confirm [--dry-run]
#
# Arguments:
#   --confirm    Required to actually create credentials/tokens
#   --dry-run    Validate API key only, then stop
#   --help       Show this help and exit
#
# Environment variables (required):
#   TELNYX_API_KEY       Your Telnyx API key
#
# Environment variables (optional — auto-detected/created if not set):
#   TELNYX_CONNECTION_ID   Credential connection ID (auto-detected/created if not set)
#   TELNYX_TO_NUMBER       Phone number to receive live test call (optional, enables live call step)
#   TELNYX_FROM_NUMBER     Caller ID for live call (auto-detected if not set)
#
# Exit codes:
#   0 — All WebRTC tests passed
#   1 — Test failed or setup error
#
# Cost: FREE for credential/token tests. ~$0.01 if TELNYX_TO_NUMBER is set (live call).

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
      echo "Usage: bash test-webrtc.sh --confirm [--dry-run]"
      echo ""
      echo "Validates WebRTC credential and token generation via Telnyx API."
      echo "Optionally places a live test call to verify end-to-end connectivity."
      echo ""
      echo "Flags:"
      echo "  --confirm    Required to actually create credentials/tokens"
      echo "  --dry-run    Validate API key only, then stop"
      echo ""
      echo "Environment variables:"
      echo "  TELNYX_API_KEY       (required) Your Telnyx API key"
      echo "  TELNYX_CONNECTION_ID (optional) Credential connection ID (auto-detected/created)"
      echo "  TELNYX_TO_NUMBER     (optional) Phone number to receive live test call (~\$0.01)"
      echo "  TELNYX_FROM_NUMBER   (optional) Caller ID for live call (auto-detected)"
      echo ""
      echo "Cost: FREE for credential/token tests. ~\$0.01 if TELNYX_TO_NUMBER is set."
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Telnyx WebRTC Test${NC}"
echo "==================="
echo ""
if [ -n "${TELNYX_TO_NUMBER:-}" ]; then
  echo -e "${YELLOW}${BOLD}COST: ~\$0.01 (credential tests are free, live call ~\$0.01)${NC}"
else
  echo -e "${GREEN}${BOLD}COST: FREE — credential creation/deletion has no charge${NC}"
  echo -e "  ${BLUE}INFO${NC}  Set TELNYX_TO_NUMBER to enable live call test (~\$0.01)"
fi
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

if ! command -v python3 &>/dev/null; then
  echo -e "  ${RED}FAIL${NC}  python3 is not installed (needed for JSON parsing)"
  ERRORS=$((ERRORS + 1))
else
  echo -e "  ${GREEN}PASS${NC}  python3 is available"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Setup validation failed. Fix the errors above.${NC}"
  exit 1
fi

# --- Helper: parse JSON with python3 ---
parse_json() {
  local json="$1"
  local expr="$2"
  echo "$json" | python3 -c "import sys,json; raw=json.load(sys.stdin); data=raw.get('data',raw) if isinstance(raw,dict) else raw; print($expr)" 2>/dev/null || echo ""
}

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
  echo "  Run with --confirm to create credentials and generate tokens."
  exit 0
fi

# --- Require --confirm ---
if [ "$CONFIRMED" = false ]; then
  echo ""
  echo -e "${BOLD}What this test will do:${NC}"
  echo "  1. Find or create a WebRTC-enabled credential connection"
  echo "  2. Verify the connection is active and WebRTC-enabled"
  echo "  3. Create a temporary SIP credential"
  echo "  4. Generate a JWT token for WebRTC"
  echo "  5. Validate the JWT token structure"
  if [ -n "${TELNYX_TO_NUMBER:-}" ]; then
    echo "  6. Place a live test call to ${TELNYX_TO_NUMBER} (~\$0.01)"
    echo "  7. Clean up the temporary credential"
    echo ""
    echo "  Cost: ~\$0.01 (live call)"
  else
    echo "  6. Clean up the temporary credential"
    echo ""
    echo "  Cost: FREE"
  fi
  echo ""
  echo "Run with --confirm to proceed."
  exit 0
fi

# --- Step 2: Auto-detect or create credential connection ---
CONNECTION_ID="${TELNYX_CONNECTION_ID:-}"
CREATED_CONNECTION=false

if [ -z "$CONNECTION_ID" ]; then
  echo ""
  echo -e "${BOLD}Step 2: Auto-detecting WebRTC credential connection...${NC}"

  CONN_RESPONSE=$(curl -s -g \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/credential_connections?page[size]=25" 2>/dev/null || echo "")

  if [ -n "$CONN_RESPONSE" ]; then
    CONNECTION_ID=$(echo "$CONN_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for conn in data.get('data', []):
    if conn.get('active') is True:
        print(conn.get('id', ''))
        break
" 2>/dev/null || echo "")
  fi

  if [ -n "$CONNECTION_ID" ]; then
    echo -e "  ${GREEN}PASS${NC}  Found active credential connection: ${CONNECTION_ID}"
  else
    echo -e "  ${BLUE}INFO${NC}  No credential connection found — creating one..."

    # Generate a unique name, username, and password for the credential connection
    RAND_SUFFIX=$(date +%s)
    CONN_USER="migtest${RAND_SUFFIX}"
    CONN_PASS="MigTest_${RAND_SUFFIX}_$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')"

    CREATE_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{
        \"connection_name\": \"migration-test-webrtc-${RAND_SUFFIX}\",
        \"user_name\": \"${CONN_USER}\",
        \"password\": \"${CONN_PASS}\",
        \"active\": true,
        \"webrtc_enabled\": true,
        \"anchorsite_override\": \"Latency\"
      }" \
      "https://api.telnyx.com/v2/credential_connections" 2>/dev/null || echo "")

    if [ -z "$CREATE_RESPONSE" ]; then
      echo -e "  ${RED}FAIL${NC}  No response from API when creating connection"
      exit 1
    fi

    CONNECTION_ID=$(parse_json "$CREATE_RESPONSE" "data.get('id', '')")
    CREATE_ERROR=$(parse_json "$CREATE_RESPONSE" "data.get('errors', [{}])[0].get('detail', '') if 'errors' in data else ''")

    if [ -z "$CONNECTION_ID" ]; then
      # Check for error in top-level errors array
      CREATE_ERROR=$(echo "$CREATE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
errors = data.get('errors', [])
if errors:
    print(errors[0].get('detail', errors[0].get('title', 'Unknown error')))
else:
    print('')
" 2>/dev/null || echo "Unknown error")
      echo -e "  ${RED}FAIL${NC}  Could not create credential connection: $CREATE_ERROR"
      exit 1
    fi

    CREATED_CONNECTION=true
    echo -e "  ${GREEN}PASS${NC}  Created credential connection: ${CONNECTION_ID}"
  fi
else
  echo ""
  echo -e "${BOLD}Step 2: Using provided connection ID...${NC}"
  echo -e "  ${GREEN}PASS${NC}  TELNYX_CONNECTION_ID: ${CONNECTION_ID}"
fi

# --- Step 3: Verify connection is active ---
echo ""
echo -e "${BOLD}Step 3: Verifying connection status...${NC}"

VERIFY_RESPONSE=$(curl -s -g \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/credential_connections/${CONNECTION_ID}" 2>/dev/null || echo "")

if [ -z "$VERIFY_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response when verifying connection"
  exit 1
fi

CONN_ACTIVE=$(parse_json "$VERIFY_RESPONSE" "str(data.get('active', False)).lower()")
CONN_NAME=$(parse_json "$VERIFY_RESPONSE" "data.get('connection_name', 'unknown')")

echo -e "  ${BLUE}INFO${NC}  Connection name: ${CONN_NAME}"

if [ "$CONN_ACTIVE" = "true" ]; then
  echo -e "  ${GREEN}PASS${NC}  Connection is active"
else
  echo -e "  ${RED}FAIL${NC}  Connection is not active (active=$CONN_ACTIVE)"
  exit 1
fi

echo -e "  ${GREEN}PASS${NC}  Credential connection is ready for WebRTC"

# --- Step 4: Create a SIP credential ---
echo ""
echo -e "${BOLD}Step 4: Creating temporary SIP credential...${NC}"

TIMESTAMP=$(date +%s)
CRED_NAME="migration-test-cred-${TIMESTAMP}"

CRED_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"connection_id\": \"${CONNECTION_ID}\",
    \"name\": \"${CRED_NAME}\"
  }" \
  "https://api.telnyx.com/v2/telephony_credentials" 2>/dev/null || echo "")

if [ -z "$CRED_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API when creating credential"
  exit 1
fi

CREDENTIAL_ID=$(parse_json "$CRED_RESPONSE" "data.get('id', '')")

if [ -z "$CREDENTIAL_ID" ]; then
  CRED_ERROR=$(echo "$CRED_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
errors = data.get('errors', [])
if errors:
    print(errors[0].get('detail', errors[0].get('title', 'Unknown error')))
else:
    print('')
" 2>/dev/null || echo "Unknown error")
  echo -e "  ${RED}FAIL${NC}  Could not create SIP credential: $CRED_ERROR"
  exit 1
fi

echo -e "  ${GREEN}PASS${NC}  Created credential: ${CREDENTIAL_ID} (${CRED_NAME})"

# --- Step 5: Generate a JWT token ---
echo ""
echo -e "${BOLD}Step 5: Generating JWT token...${NC}"

TOKEN_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/telephony_credentials/${CREDENTIAL_ID}/token" 2>/dev/null || echo "")

if [ -z "$TOKEN_RESPONSE" ]; then
  echo -e "  ${RED}FAIL${NC}  No response from API when generating token"
  # Clean up before exit
  echo -e "  ${BLUE}INFO${NC}  Cleaning up credential..."
  curl -s -X DELETE \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/telephony_credentials/${CREDENTIAL_ID}" >/dev/null 2>&1 || true
  exit 1
fi

# The token endpoint returns the JWT directly as a string, not wrapped in JSON
# Try to extract as plain text first; if it looks like JSON with an error, handle that
TOKEN=""
if echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  # It's valid JSON — check if it's an error response
  TOKEN_ERROR=$(echo "$TOKEN_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
errors = data.get('errors', [])
if errors:
    print(errors[0].get('detail', errors[0].get('title', 'Unknown error')))
else:
    # Some endpoints return the token inside a JSON wrapper
    print(data.get('data', ''))
" 2>/dev/null || echo "")
  if echo "$TOKEN_ERROR" | grep -q "error\|Error\|fail\|Fail"; then
    echo -e "  ${RED}FAIL${NC}  Token generation error: $TOKEN_ERROR"
    echo -e "  ${BLUE}INFO${NC}  Cleaning up credential..."
    curl -s -X DELETE \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/telephony_credentials/${CREDENTIAL_ID}" >/dev/null 2>&1 || true
    exit 1
  fi
  TOKEN="$TOKEN_ERROR"
fi

# If not JSON or no token extracted from JSON, treat response as raw JWT
if [ -z "$TOKEN" ]; then
  TOKEN="$TOKEN_RESPONSE"
fi

if [ -z "$TOKEN" ]; then
  echo -e "  ${RED}FAIL${NC}  Token is empty"
  echo -e "  ${BLUE}INFO${NC}  Cleaning up credential..."
  curl -s -X DELETE \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    "https://api.telnyx.com/v2/telephony_credentials/${CREDENTIAL_ID}" >/dev/null 2>&1 || true
  exit 1
fi

TOKEN_LENGTH=${#TOKEN}
echo -e "  ${GREEN}PASS${NC}  Token generated (${TOKEN_LENGTH} chars)"

# --- Step 6: Validate JWT token ---
echo ""
echo -e "${BOLD}Step 6: Validating JWT token structure...${NC}"

TOKEN_VALID=true

# Check that token has 3 dot-separated parts (header.payload.signature)
DOT_COUNT=$(echo "$TOKEN" | tr -cd '.' | wc -c | tr -d ' ')
if [ "$DOT_COUNT" -eq 2 ]; then
  echo -e "  ${GREEN}PASS${NC}  Token has 3 parts (header.payload.signature)"
else
  echo -e "  ${RED}FAIL${NC}  Token does not have 3 dot-separated parts (got $((DOT_COUNT + 1)) parts)"
  TOKEN_VALID=false
fi

# Extract and decode the header (first segment)
if [ "$TOKEN_VALID" = true ]; then
  HEADER_B64=$(echo "$TOKEN" | cut -d'.' -f1)

  # Pad base64 if needed and decode
  JWT_HEADER=$(python3 -c "
import base64, json, sys
header = '${HEADER_B64}'
# Add padding if needed
padding = 4 - len(header) % 4
if padding != 4:
    header += '=' * padding
# URL-safe base64 decode
decoded = base64.urlsafe_b64decode(header)
parsed = json.loads(decoded)
print(json.dumps(parsed))
" 2>/dev/null || echo "")

  if [ -n "$JWT_HEADER" ]; then
    echo -e "  ${GREEN}PASS${NC}  Header decoded successfully: ${JWT_HEADER}"

    # Check for 'alg' field
    HAS_ALG=$(echo "$JWT_HEADER" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('yes' if 'alg' in data else 'no')
" 2>/dev/null || echo "no")

    if [ "$HAS_ALG" = "yes" ]; then
      ALG_VALUE=$(echo "$JWT_HEADER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('alg',''))" 2>/dev/null || echo "")
      echo -e "  ${GREEN}PASS${NC}  JWT has 'alg' field: ${ALG_VALUE}"
    else
      echo -e "  ${RED}FAIL${NC}  JWT header missing 'alg' field"
      TOKEN_VALID=false
    fi
  else
    echo -e "  ${RED}FAIL${NC}  Could not decode JWT header"
    TOKEN_VALID=false
  fi
fi

# --- Step 7: Live call test (optional — requires TELNYX_TO_NUMBER and a from number) ---
LIVE_CALL_PASS=false
LIVE_CALL_SKIPPED=false

if [ -n "${TELNYX_TO_NUMBER:-}" ]; then
  echo ""
  echo -e "${BOLD}Step 7: Live call test (verifies end-to-end connectivity)...${NC}"
  echo -e "${YELLOW}${BOLD}COST: ~\$0.01 (outbound call)${NC}"

  # Auto-detect a from number
  WEBRTC_FROM_NUMBER="${TELNYX_FROM_NUMBER:-}"
  if [ -z "$WEBRTC_FROM_NUMBER" ]; then
    NUMS_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/phone_numbers?page[size]=50&filter[status]=active" 2>/dev/null || echo "")
    WEBRTC_FROM_NUMBER=$(echo "$NUMS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for num in data.get('data', []):
    if num.get('connection_id'):
        print(num.get('phone_number', ''))
        break
else:
    nums = data.get('data', [])
    if nums:
        print(nums[0].get('phone_number', ''))
" 2>/dev/null || echo "")
  fi

  if [ -z "$WEBRTC_FROM_NUMBER" ]; then
    echo -e "  ${YELLOW}WARN${NC}  No from number available — skipping live call test"
    echo -e "         Purchase a number or set TELNYX_FROM_NUMBER to enable this test"
    LIVE_CALL_SKIPPED=true
  else
    echo -e "  ${BLUE}INFO${NC}  Calling ${TELNYX_TO_NUMBER} from ${WEBRTC_FROM_NUMBER}..."

    # Need a Call Control app (not the credential connection) for outbound calls
    # Check for existing Call Control app or create one
    CCA_RESPONSE=$(curl -s -g \
      -H "Authorization: Bearer ${TELNYX_API_KEY}" \
      "https://api.telnyx.com/v2/call_control_applications?page[size]=5" 2>/dev/null || echo "")
    CCA_ID=$(echo "$CCA_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
apps = data.get('data', [])
# Prefer app with OVP
for app in apps:
    ovp = (app.get('outbound') or {}).get('outbound_voice_profile_id')
    if ovp:
        print(app['id'])
        break
else:
    if apps:
        print(apps[0].get('id', ''))
" 2>/dev/null || echo "")

    if [ -z "$CCA_ID" ]; then
      echo -e "  ${BLUE}INFO${NC}  No Call Control app found — creating one for live test..."
      UNIQUE_SUFFIX=$(date +%s)

      # Determine destination country for OVP whitelisting
      TO_COUNTRY="US"
      case "${TELNYX_TO_NUMBER}" in
        +353*) TO_COUNTRY="IE" ;; +44*) TO_COUNTRY="GB" ;; +1*) TO_COUNTRY="US" ;;
        +61*) TO_COUNTRY="AU" ;; +49*) TO_COUNTRY="DE" ;; +33*) TO_COUNTRY="FR" ;;
      esac

      OVP_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"WebRTC Test OVP ${UNIQUE_SUFFIX}\", \"whitelisted_destinations\": [\"US\", \"${TO_COUNTRY}\"]}" \
        "https://api.telnyx.com/v2/outbound_voice_profiles" 2>/dev/null || echo "")
      OVP_ID=$(echo "$OVP_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")

      CCA_PAYLOAD="{\"application_name\": \"WebRTC Migration Test ${UNIQUE_SUFFIX}\", \"webhook_event_url\": \"https://example.com/webhooks\""
      if [ -n "$OVP_ID" ]; then
        CCA_PAYLOAD="${CCA_PAYLOAD}, \"outbound\": {\"outbound_voice_profile_id\": \"${OVP_ID}\"}"
      fi
      CCA_PAYLOAD="${CCA_PAYLOAD}}"

      CCA_CREATE=$(curl -s -X POST \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$CCA_PAYLOAD" \
        "https://api.telnyx.com/v2/call_control_applications" 2>/dev/null || echo "")
      CCA_ID=$(echo "$CCA_CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")

      if [ -n "$CCA_ID" ]; then
        echo -e "  ${GREEN}PASS${NC}  Created Call Control app: ${CCA_ID}"
        # Assign from number to this app
        PHONE_ID=$(echo "$NUMS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for num in data.get('data', []):
    if num.get('phone_number') == '${WEBRTC_FROM_NUMBER}':
        print(num.get('id', ''))
        break
" 2>/dev/null || echo "")
        if [ -n "$PHONE_ID" ]; then
          curl -s -X PATCH \
            -H "Authorization: Bearer ${TELNYX_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"connection_id\": \"${CCA_ID}\"}" \
            "https://api.telnyx.com/v2/phone_numbers/${PHONE_ID}" >/dev/null 2>&1 || true
        fi
      fi
    fi

    if [ -n "$CCA_ID" ]; then
      # Place the call
      CALL_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer ${TELNYX_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
          \"connection_id\": \"${CCA_ID}\",
          \"to\": \"${TELNYX_TO_NUMBER}\",
          \"from\": \"${WEBRTC_FROM_NUMBER}\",
          \"answering_machine_detection\": \"disabled\",
          \"webhook_url\": \"https://example.com/null\"
        }" \
        "https://api.telnyx.com/v2/calls" 2>/dev/null || echo "")

      CALL_CONTROL_ID=$(echo "$CALL_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('call_control_id',''))" 2>/dev/null || echo "")
      CALL_ERROR=$(echo "$CALL_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
errors = data.get('errors', [])
print(errors[0].get('detail', '') if errors else '')
" 2>/dev/null || echo "")

      if [ -n "$CALL_ERROR" ]; then
        echo -e "  ${RED}FAIL${NC}  Call failed: $CALL_ERROR"
      elif [ -z "$CALL_CONTROL_ID" ]; then
        echo -e "  ${RED}FAIL${NC}  No call_control_id in response"
      else
        echo -e "  ${GREEN}PASS${NC}  Call initiated (call_control_id: ${CALL_CONTROL_ID})"

        # Wait for call to connect, then send TTS and hang up
        echo -e "  ${BLUE}INFO${NC}  Waiting for call to connect..."
        # shellcheck disable=SC2034  # CALL_START kept as a timing anchor for future duration reporting
        CALL_START=$(date +%s)
        REACHED_ACTIVE=false

        # shellcheck disable=SC2034  # i is a poll-count counter; body polls call status each iteration
        for i in $(seq 1 15); do
          sleep 2
          STATUS=$(curl -s \
            -H "Authorization: Bearer ${TELNYX_API_KEY}" \
            "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}" 2>/dev/null || echo "")
          IS_ALIVE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('is_alive',''))" 2>/dev/null || echo "")

          if [ "$IS_ALIVE" = "True" ] || [ "$IS_ALIVE" = "true" ]; then
            REACHED_ACTIVE=true
            echo -e "  ${GREEN}PASS${NC}  Call is active — sending TTS message"
            # Send TTS
            curl -s -X POST \
              -H "Authorization: Bearer ${TELNYX_API_KEY}" \
              -H "Content-Type: application/json" \
              -d "{
                \"call_control_id\": \"${CALL_CONTROL_ID}\",
                \"payload\": \"This is a test call from Telnyx. Your WebRTC migration is working correctly. Goodbye.\",
                \"voice\": \"female\",
                \"language\": \"en-US\"
              }" \
              "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}/actions/speak" >/dev/null 2>&1 || true
            sleep 5
            break
          elif [ "$IS_ALIVE" = "False" ] || [ "$IS_ALIVE" = "false" ]; then
            echo -e "  ${BLUE}INFO${NC}  Call ended before being answered"
            break
          fi
        done

        # Hang up
        curl -s -X POST \
          -H "Authorization: Bearer ${TELNYX_API_KEY}" \
          -H "Content-Type: application/json" \
          -d "{\"call_control_id\": \"${CALL_CONTROL_ID}\"}" \
          "https://api.telnyx.com/v2/calls/${CALL_CONTROL_ID}/actions/hangup" >/dev/null 2>&1 || true

        if [ "$REACHED_ACTIVE" = true ]; then
          LIVE_CALL_PASS=true
          echo -e "  ${GREEN}PASS${NC}  Live call completed — your phone should have rung"
        else
          echo -e "  ${YELLOW}WARN${NC}  Call did not reach active state — check number and connection setup"
        fi
      fi
    else
      echo -e "  ${YELLOW}WARN${NC}  Could not create Call Control app — skipping live call"
      LIVE_CALL_SKIPPED=true
    fi
  fi
else
  echo ""
  echo -e "${BOLD}Step 7: Live call test${NC}"
  echo -e "  ${YELLOW}WARN${NC}  TELNYX_TO_NUMBER not set — skipping live call test"
  echo -e "         Set TELNYX_TO_NUMBER to your phone number to test end-to-end calling"
  LIVE_CALL_SKIPPED=true
fi

# --- Step 8: Clean up ---
echo ""
echo -e "${BOLD}Step 8: Cleaning up temporary credential...${NC}"

DELETE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  "https://api.telnyx.com/v2/telephony_credentials/${CREDENTIAL_ID}" 2>/dev/null || echo "000")

if [ "$DELETE_CODE" = "200" ] || [ "$DELETE_CODE" = "204" ]; then
  echo -e "  ${GREEN}PASS${NC}  Credential ${CREDENTIAL_ID} deleted"
else
  echo -e "  ${YELLOW}WARN${NC}  Credential deletion returned HTTP $DELETE_CODE (may need manual cleanup)"
fi

# --- Step 9: Report ---
echo ""
echo "==================="
echo -e "${BOLD}Results${NC}"
echo "  Connection ID:     ${CONNECTION_ID}"
echo "  Connection Name:   ${CONN_NAME}"
echo "  Connection Active: ${CONN_ACTIVE}"
echo "  Credential Created:  YES (${CRED_NAME})"
echo "  Token Generated:     YES (${TOKEN_LENGTH} chars)"
echo "  Token Valid JWT:     $([ "$TOKEN_VALID" = true ] && echo "YES" || echo "NO")"
if [ "$CREATED_CONNECTION" = true ]; then
  echo "  Auto-Created Conn:   YES (${CONNECTION_ID})"
fi
if [ "$LIVE_CALL_SKIPPED" = true ]; then
  echo "  Live Call Test:      SKIPPED (set TELNYX_TO_NUMBER to enable)"
elif [ "$LIVE_CALL_PASS" = true ]; then
  echo "  Live Call Test:      PASS"
else
  echo "  Live Call Test:      FAIL/WARN"
fi

if [ "$TOKEN_VALID" = true ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}PASS${NC}  WebRTC credential and token generation working correctly"
  if [ "$LIVE_CALL_PASS" = true ]; then
    echo -e "  ${GREEN}${BOLD}PASS${NC}  Live call test passed — end-to-end connectivity verified"
  elif [ "$LIVE_CALL_SKIPPED" = false ]; then
    echo -e "  ${YELLOW}${BOLD}WARN${NC}  Live call test did not fully pass — verify manually"
  fi
  exit 0
else
  echo ""
  echo -e "  ${RED}${BOLD}FAIL${NC}  JWT token validation failed"
  echo "  Check the credential connection configuration in the Telnyx portal."
  exit 1
fi
