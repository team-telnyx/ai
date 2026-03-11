#!/usr/bin/env bash
set -euo pipefail

# check-delivery.sh — Check delivery status of sent campaign messages
# Usage: bash check-delivery.sh --campaign-log campaign-YYYY-MM-DD.json [--wait]

###############################################################################
# Config
###############################################################################
API_BASE="https://api.telnyx.com/v2"
POLL_INTERVAL=30   # seconds between polls when --wait
POLL_TIMEOUT=300   # max wait time in seconds (5 min)
CHECK_RATE=20      # status checks per second

###############################################################################
# Helpers
###############################################################################
die() { echo "[delivery] ERROR: $*" >&2; exit 1; }
log() { echo "[delivery] $*" >&2; }

###############################################################################
# Parse arguments
###############################################################################
LOGFILE=""
WAIT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --campaign-log) LOGFILE="$2"; shift 2 ;;
    --wait)         WAIT=true; shift ;;
    -h|--help)
      cat <<EOF >&2
Usage: $(basename "$0") --campaign-log FILE.json [--wait]

Options:
  --campaign-log FILE   Campaign log JSON from send-campaign.sh (required)
  --wait                Poll pending messages (every ${POLL_INTERVAL}s, up to ${POLL_TIMEOUT}s)
  -h, --help            Show this help
EOF
      exit 0
      ;;
    *) die "Unknown option: $1" ;;
  esac
done

###############################################################################
# Validate
###############################################################################
[[ -z "${TELNYX_API_KEY:-}" ]] && die "TELNYX_API_KEY not set"
[[ -z "$LOGFILE" ]]            && die "--campaign-log is required"
[[ ! -f "$LOGFILE" ]]         && die "Log file not found: $LOGFILE"
command -v jq >/dev/null       || die "jq is required"
command -v curl >/dev/null     || die "curl is required"

###############################################################################
# Extract message IDs
###############################################################################
# Get messages that were actually queued (have a message_id)
MESSAGES=$(jq -r '.[] | select(.message_id != null and .status == "queued") | "\(.message_id)|\(.to)"' "$LOGFILE" 2>/dev/null)

if [[ -z "$MESSAGES" ]]; then
  log "No queued messages found in $LOGFILE"
  exit 0
fi

TOTAL=$(echo "$MESSAGES" | wc -l | tr -d ' ')
log "Campaign: $LOGFILE"
log "Checking delivery status for $TOTAL messages..."

###############################################################################
# Check delivery status
###############################################################################
DELAY_MS=$((1000 / CHECK_RATE))

sleep_ms() {
  local ms=$1
  if [[ "$OSTYPE" == "darwin"* ]]; then
    perl -e "select(undef,undef,undef,$ms/1000)" 2>/dev/null || sleep 1
  else
    sleep "$(awk "BEGIN {printf \"%.3f\", $ms/1000}")"
  fi
}

check_all() {
  local delivered=0 failed=0 pending=0 unknown=0
  local failed_numbers=()

  while IFS='|' read -r msg_id to_number; do
    [[ -z "$msg_id" ]] && continue

    response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $TELNYX_API_KEY" \
      "$API_BASE/messages/$msg_id" 2>/dev/null)

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" != "200" ]]; then
      unknown=$((unknown + 1))
      sleep_ms "$DELAY_MS"
      continue
    fi

    # Check the to[].status field for delivery status
    status=$(echo "$body" | jq -r '
      .data.to[0].status // .data.status // "unknown"
    ' 2>/dev/null)

    case "$status" in
      delivered|delivery_confirmed)
        delivered=$((delivered + 1))
        ;;
      sending_failed|delivery_failed|delivery_unconfirmed)
        failed=$((failed + 1))
        failed_numbers+=("$to_number")
        ;;
      queued|sent|sending)
        pending=$((pending + 1))
        ;;
      *)
        unknown=$((unknown + 1))
        ;;
    esac

    sleep_ms "$DELAY_MS"
  done <<< "$MESSAGES"

  # Output stats
  local delivery_rate=0
  if [[ $((delivered + failed)) -gt 0 ]]; then
    delivery_rate=$(awk "BEGIN {printf \"%.1f\", ($delivered / ($delivered + $failed)) * 100}")
  fi

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Total: $TOTAL | Delivered: $delivered | Failed: $failed | Pending: $pending | Unknown: $unknown"
  log "Delivery rate: ${delivery_rate}%"

  # Write failed numbers to CSV
  if [[ ${#failed_numbers[@]} -gt 0 ]]; then
    local failed_file="failed-$(basename "$LOGFILE" .json).csv"
    echo "phone_number" > "$failed_file"
    for fn in "${failed_numbers[@]}"; do
      echo "$fn" >> "$failed_file"
    done
    log "Failed numbers written to: $failed_file"
  fi

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Return pending count for --wait mode
  echo "$pending"
}

###############################################################################
# Main
###############################################################################
if $WAIT; then
  elapsed=0
  while [[ $elapsed -lt $POLL_TIMEOUT ]]; do
    pending=$(check_all)

    if [[ "$pending" -eq 0 ]]; then
      log "All messages resolved."
      exit 0
    fi

    log "Waiting ${POLL_INTERVAL}s for $pending pending messages... (${elapsed}s / ${POLL_TIMEOUT}s)"
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  log "Timeout reached. $pending messages still pending."
else
  check_all > /dev/null
fi
