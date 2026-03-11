#!/usr/bin/env bash
set -euo pipefail

# send-campaign.sh — Send SMS campaign with rate limiting via Telnyx Messages API
# Usage: bash send-campaign.sh --from "+1..." --profile-id "..." --message "..." --recipients file.csv [--rate 10] [--dry-run]

###############################################################################
# Config
###############################################################################
API_BASE="https://api.telnyx.com/v2"
MAX_RETRIES=3
RETRY_BACKOFF_BASE=2
DEFAULT_RATE=10
RATE_LIMIT_FACTOR=0.8  # send at 80% of specified rate

###############################################################################
# Helpers
###############################################################################
die() { echo "[send] ERROR: $*" >&2; exit 1; }
log() { echo "[send] $*" >&2; }

usage() {
  cat <<EOF >&2
Usage: $(basename "$0") [OPTIONS]

Options:
  --from PHONE          Sending phone number (E.164, required)
  --profile-id ID       Messaging profile ID (required)
  --message TEXT        Message body (required, must include opt-out language)
  --recipients FILE     CSV with phone_number column (required)
  --rate N              Messages per second (default: $DEFAULT_RATE)
  --dry-run             Print what would be sent without sending
  -h, --help            Show this help
EOF
  exit 1
}

###############################################################################
# Parse arguments
###############################################################################
FROM=""
PROFILE_ID=""
MESSAGE=""
RECIPIENTS=""
RATE="$DEFAULT_RATE"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)       FROM="$2"; shift 2 ;;
    --profile-id) PROFILE_ID="$2"; shift 2 ;;
    --message)    MESSAGE="$2"; shift 2 ;;
    --recipients) RECIPIENTS="$2"; shift 2 ;;
    --rate)       RATE="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    -h|--help)    usage ;;
    *)            die "Unknown option: $1" ;;
  esac
done

###############################################################################
# Validate
###############################################################################
[[ -z "${TELNYX_API_KEY:-}" ]] && die "TELNYX_API_KEY not set"
[[ -z "$FROM" ]]              && die "--from is required"
[[ -z "$PROFILE_ID" ]]       && die "--profile-id is required"
[[ -z "$MESSAGE" ]]          && die "--message is required"
[[ -z "$RECIPIENTS" ]]       && die "--recipients is required"
[[ ! -f "$RECIPIENTS" ]]     && die "Recipients file not found: $RECIPIENTS"
command -v jq >/dev/null      || die "jq is required"
command -v curl >/dev/null    || die "curl is required"

# Warn if no opt-out language detected
if ! echo "$MESSAGE" | grep -qiE '(stop|opt.out|unsubscribe)'; then
  log "WARNING: Message does not appear to contain opt-out language (STOP/opt out/unsubscribe)"
  log "WARNING: This is required for compliance. Continuing anyway..."
fi

###############################################################################
# Extract phone numbers from CSV
###############################################################################
# Find the phone_number column index
HEADER=$(head -1 "$RECIPIENTS")
PHONE_COL=""
IFS=',' read -ra COLS <<< "$HEADER"
for i in "${!COLS[@]}"; do
  col=$(echo "${COLS[$i]}" | tr -d '[:space:]' | tr -d '"')
  if [[ "$col" == "phone_number" ]]; then
    PHONE_COL=$((i + 1))
    break
  fi
done
[[ -z "$PHONE_COL" ]] && die "CSV must have a 'phone_number' column header"

NUMBERS=()
while IFS= read -r line; do
  num=$(echo "$line" | cut -d',' -f"$PHONE_COL" | tr -d '[:space:]"')
  [[ -n "$num" && "$num" =~ ^\+ ]] && NUMBERS+=("$num")
done < <(tail -n +2 "$RECIPIENTS")

TOTAL=${#NUMBERS[@]}
[[ $TOTAL -eq 0 ]] && die "No valid phone numbers found in $RECIPIENTS"

log "Campaign: $TOTAL recipients | Rate: $RATE msg/s | From: $FROM"
log "Message: ${MESSAGE:0:80}..."

###############################################################################
# Rate limiting (token bucket at 80% capacity)
###############################################################################
# Calculate delay between messages in milliseconds
EFFECTIVE_RATE=$(awk "BEGIN {printf \"%.2f\", $RATE * $RATE_LIMIT_FACTOR}")
DELAY_MS=$(awk "BEGIN {printf \"%.0f\", 1000 / $EFFECTIVE_RATE}")

sleep_ms() {
  local ms=$1
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use perl for sub-second sleep
    perl -e "select(undef,undef,undef,$ms/1000)" 2>/dev/null || sleep 1
  else
    sleep "$(awk "BEGIN {printf \"%.3f\", $ms/1000}")"
  fi
}

###############################################################################
# Send messages
###############################################################################
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
LOGFILE="campaign-$(date +%Y-%m-%d-%H%M%S).json"
SENT=0
FAILED=0
SKIPPED=0

# Start JSON array
echo "[" > "$LOGFILE"
FIRST=true

send_one() {
  local to="$1"
  local attempt=0
  local response status msg_id

  while [[ $attempt -lt $MAX_RETRIES ]]; do
    if $DRY_RUN; then
      echo "{\"to\":\"$to\",\"status\":\"dry-run\",\"timestamp\":\"$TIMESTAMP\"}"
      return 0
    fi

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/messages" \
      -H "Authorization: Bearer $TELNYX_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$(jq -n \
        --arg from "$FROM" \
        --arg to "$to" \
        --arg text "$MESSAGE" \
        --arg profile "$PROFILE_ID" \
        '{
          from: $from,
          to: $to,
          text: $text,
          messaging_profile_id: $profile,
          type: "SMS"
        }')" 2>/dev/null)

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    case "$http_code" in
      200|201|202)
        msg_id=$(echo "$body" | jq -r '.data.id // "unknown"')
        echo "{\"message_id\":\"$msg_id\",\"to\":\"$to\",\"status\":\"queued\",\"timestamp\":\"$TIMESTAMP\"}"
        return 0
        ;;
      422)
        # Permanent failure — skip
        local err_msg
        err_msg=$(echo "$body" | jq -r '.errors[0].detail // "unprocessable"' 2>/dev/null || echo "unprocessable")
        log "SKIP $to: $err_msg"
        jq -nc --arg to "$to" --arg err "$err_msg" --arg ts "$TIMESTAMP" \
          '{message_id: null, to: $to, status: "skipped", error: $err, timestamp: $ts}'
        return 1
        ;;
      429)
        # Rate limited — backoff and retry
        attempt=$((attempt + 1))
        local wait=$((RETRY_BACKOFF_BASE ** attempt))
        log "Rate limited, retry $attempt/$MAX_RETRIES in ${wait}s..."
        sleep "$wait"
        ;;
      5*)
        # Server error — retry
        attempt=$((attempt + 1))
        local wait=$((RETRY_BACKOFF_BASE ** attempt))
        log "Server error ($http_code), retry $attempt/$MAX_RETRIES in ${wait}s..."
        sleep "$wait"
        ;;
      *)
        log "Unexpected HTTP $http_code for $to"
        echo "{\"message_id\":null,\"to\":\"$to\",\"status\":\"failed\",\"error\":\"http_$http_code\",\"timestamp\":\"$TIMESTAMP\"}"
        return 1
        ;;
    esac
  done

  # Exhausted retries
  log "FAILED $to after $MAX_RETRIES retries"
  echo "{\"message_id\":null,\"to\":\"$to\",\"status\":\"failed\",\"error\":\"max_retries\",\"timestamp\":\"$TIMESTAMP\"}"
  return 1
}

for num in "${NUMBERS[@]}"; do
  result=$(send_one "$num") || true

  # Append to log file
  if $FIRST; then
    FIRST=false
  else
    echo "," >> "$LOGFILE"
  fi
  echo "  $result" >> "$LOGFILE"

  # Count results
  status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "unknown")
  case "$status" in
    queued|dry-run) SENT=$((SENT + 1)) ;;
    skipped)        SKIPPED=$((SKIPPED + 1)) ;;
    *)              FAILED=$((FAILED + 1)) ;;
  esac

  # Rate limit delay
  sleep_ms "$DELAY_MS"

  # Progress every 50 messages
  PROCESSED=$((SENT + FAILED + SKIPPED))
  if [[ $((PROCESSED % 50)) -eq 0 && $PROCESSED -gt 0 ]]; then
    log "Progress: $PROCESSED/$TOTAL (sent=$SENT, skipped=$SKIPPED, failed=$FAILED)"
  fi
done

# Close JSON array
echo "" >> "$LOGFILE"
echo "]" >> "$LOGFILE"

###############################################################################
# Summary
###############################################################################
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Campaign complete!"
log "Total: $TOTAL | Sent: $SENT | Skipped: $SKIPPED | Failed: $FAILED"
log "Log: $LOGFILE"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
