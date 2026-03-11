#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://api.telnyx.com/v2"

die() { echo "Error: $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: lookup.sh <phone_number> [--type carrier|caller-name] [--json] [--routing]

Options:
  --type        Lookup type: carrier (default) or caller-name
  --json        Output raw JSON
  --routing     Output verification routing recommendation

Environment:
  TELNYX_API_KEY    Required. Your Telnyx API v2 key.

Examples:
  lookup.sh +13035551234
  lookup.sh +13035551234 --routing
  lookup.sh +13035551234 --type caller-name --json
EOF
  exit 1
}

[[ $# -ge 1 ]] || usage
[[ -n "${TELNYX_API_KEY:-}" ]] || die "TELNYX_API_KEY environment variable not set"

phone="$1"; shift
lookup_type="carrier"
raw_json=false
routing=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) lookup_type="$2"; shift 2;;
    --json) raw_json=true; shift;;
    --routing) routing=true; shift;;
    *) die "Unknown option: $1";;
  esac
done

# Validate phone starts with +
[[ "$phone" == +* ]] || die "Phone number must be in E.164 format (start with +)"

# Make API call
response=$(curl -s -w "\n%{http_code}" -X GET \
  "${BASE_URL}/number_lookup/${phone}?type=${lookup_type}" \
  -H "Authorization: Bearer ${TELNYX_API_KEY}") || die "curl failed"

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" -ge 400 ]]; then
  echo "HTTP $http_code" >&2
  echo "$body" | jq . 2>/dev/null || echo "$body"
  exit 1
fi

# Raw JSON mode
if $raw_json; then
  echo "$body" | jq . 2>/dev/null || echo "$body"
  exit 0
fi

# Parse with jq if available
if command -v jq &>/dev/null; then
  carrier_name=$(echo "$body" | jq -r '.data.carrier.name // "Unknown"')
  carrier_type=$(echo "$body" | jq -r '.data.carrier.type // "unknown"')
  country=$(echo "$body" | jq -r '.data.country_code // "Unknown"')
  phone_number=$(echo "$body" | jq -r '.data.phone_number // "'"$phone"'"')

  # For caller-name lookups, show CNAM data instead of carrier fields
  if [[ "$lookup_type" == "caller-name" ]] && ! $routing && ! $raw_json; then
    cnam=$(echo "$body" | jq -r '.data.caller_name.caller_name // "Not available"')
    echo "Phone: $phone_number"
    echo "Caller Name: $cnam"
    echo "Country: $country"
    exit 0
  fi

  if $routing; then
    echo "Phone: $phone_number"
    [[ "$carrier_name" != "Unknown" && "$carrier_name" != "null" ]] && echo "Carrier: $carrier_name"
    echo "Type: $carrier_type"
    [[ "$country" != "Unknown" && "$country" != "null" ]] && echo "Country: $country"

    case "$carrier_type" in
      mobile|"fixed line or mobile")
        echo "Recommendation: SMS verification";;
      "fixed line"|landline|fixed_line)
        echo "Recommendation: Voice call verification";;
      voip)
        echo "Recommendation: SMS verification (VoIP — elevated fraud risk)";;
      "toll free"|toll_free|tollfree)
        echo "Recommendation: REJECT — Cannot verify toll-free numbers";;
      "premium rate"|premium_rate)
        echo "Recommendation: REJECT — Cannot verify premium rate numbers";;
      *)
        echo "Recommendation: SMS verification (unknown type — fallback to voice if fails)";;
    esac
  else
    echo "Phone: $phone_number"
    echo "Carrier: $carrier_name"
    echo "Type: $carrier_type"
    echo "Country: $country"
  fi
else
  # No jq — just output raw
  echo "$body"
fi
