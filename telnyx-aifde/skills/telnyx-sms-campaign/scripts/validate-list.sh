#!/usr/bin/env bash
set -euo pipefail

# validate-list.sh — Validate recipient list via Telnyx Number Lookup API
# Filters out landlines and invalid numbers. Outputs validated CSV to stdout.
# Usage: bash validate-list.sh [--strict] recipients.csv > validated.csv

###############################################################################
# Config
###############################################################################
API_BASE="https://api.telnyx.com/v2"
LOOKUP_RATE=10  # lookups per second (API limit friendly)

###############################################################################
# Helpers
###############################################################################
die() { echo "[validate] ERROR: $*" >&2; exit 1; }
log() { echo "[validate] $*" >&2; }

###############################################################################
# Parse arguments
###############################################################################
STRICT=false
INPUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict) STRICT=true; shift ;;
    -h|--help)
      cat <<EOF >&2
Usage: $(basename "$0") [--strict] INPUT.csv > validated.csv

Options:
  --strict    Also filter out VoIP numbers (default: keep VoIP)
  -h, --help  Show this help

Input CSV must have a 'phone_number' column. Additional columns are preserved.
Stats are printed to stderr. Validated rows go to stdout.
EOF
      exit 0
      ;;
    *)
      [[ -z "$INPUT" ]] && INPUT="$1" || die "Unexpected argument: $1"
      shift
      ;;
  esac
done

###############################################################################
# Validate
###############################################################################
[[ -z "${TELNYX_API_KEY:-}" ]] && die "TELNYX_API_KEY not set"
[[ -z "$INPUT" ]]              && die "Input CSV file required. Usage: $(basename "$0") [--strict] file.csv"
[[ ! -f "$INPUT" ]]           && die "File not found: $INPUT"
command -v jq >/dev/null       || die "jq is required"
command -v curl >/dev/null     || die "curl is required"

###############################################################################
# Find phone_number column
###############################################################################
HEADER=$(head -1 "$INPUT")
PHONE_COL=""
IFS=',' read -ra COLS <<< "$HEADER"
for i in "${!COLS[@]}"; do
  col=$(echo "${COLS[$i]}" | tr -d '[:space:]"')
  if [[ "$col" == "phone_number" ]]; then
    PHONE_COL=$((i + 1))
    break
  fi
done
[[ -z "$PHONE_COL" ]] && die "CSV must have a 'phone_number' column header"

###############################################################################
# Process numbers
###############################################################################
TOTAL=0
MOBILE=0
LANDLINE=0
VOIP=0
INVALID=0

# Output header
echo "$HEADER"

DELAY_MS=$((1000 / LOOKUP_RATE))

sleep_ms() {
  local ms=$1
  if [[ "$OSTYPE" == "darwin"* ]]; then
    perl -e "select(undef,undef,undef,$ms/1000)" 2>/dev/null || sleep 1
  else
    sleep "$(awk "BEGIN {printf \"%.3f\", $ms/1000}")"
  fi
}

while IFS= read -r line; do
  num=$(echo "$line" | cut -d',' -f"$PHONE_COL" | tr -d '[:space:]"')

  # Skip empty or non-E.164
  if [[ -z "$num" || ! "$num" =~ ^\+ ]]; then
    continue
  fi

  TOTAL=$((TOTAL + 1))

  # URL-encode the + sign
  encoded_num="${num/+/%2B}"

  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    "$API_BASE/number_lookup/$encoded_num?type=carrier" 2>/dev/null)

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" != "200" ]]; then
    INVALID=$((INVALID + 1))
    log "INVALID $num (HTTP $http_code)"
    sleep_ms "$DELAY_MS"
    continue
  fi

  carrier_type=$(echo "$body" | jq -r '.data.carrier.type // "unknown"' 2>/dev/null)

  case "$carrier_type" in
    mobile|"mobile or fixed line"|"fixed line or mobile")
      MOBILE=$((MOBILE + 1))
      echo "$line"
      ;;
    voip)
      VOIP=$((VOIP + 1))
      if ! $STRICT; then
        echo "$line"
      else
        log "FILTERED (VoIP): $num"
      fi
      ;;
    landline|"fixed line")
      LANDLINE=$((LANDLINE + 1))
      log "FILTERED (landline): $num"
      ;;
    *)
      INVALID=$((INVALID + 1))
      log "UNKNOWN carrier type '$carrier_type': $num"
      ;;
  esac

  # Rate limit
  sleep_ms "$DELAY_MS"

  # Progress every 100
  if [[ $((TOTAL % 100)) -eq 0 ]]; then
    log "Progress: $TOTAL processed..."
  fi

done < <(tail -n +2 "$INPUT")

###############################################################################
# Summary
###############################################################################
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Total: $TOTAL | Mobile: $MOBILE | Landline: $LANDLINE | VoIP: $VOIP | Invalid: $INVALID"
if $STRICT; then
  log "Mode: strict (VoIP filtered out)"
  PASSED=$MOBILE
else
  log "Mode: normal (VoIP included)"
  PASSED=$((MOBILE + VOIP))
fi
log "Passed: $PASSED / $TOTAL"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
