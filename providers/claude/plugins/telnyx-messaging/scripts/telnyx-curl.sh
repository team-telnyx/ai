#!/bin/bash
# Curl wrapper that adds Telnyx auth header internally.
# The API key is passed via curl's --config stdin so it never appears
# in the process argument vector (ps, /proc/*/cmdline, watchdog logs).
#
# Usage: telnyx-curl.sh [curl args...]
# Example: telnyx-curl.sh -X POST -H "Content-Type: application/json" -d '{}' "https://api.telnyx.com/v2/messages"

if [[ -z "${TELNYX_API_KEY:-}" ]]; then
  echo "Error: TELNYX_API_KEY environment variable not set" >&2
  exit 1
fi

# --config - reads configuration lines from stdin.
# The header directive adds Authorization without exposing it in argv.
exec curl -s --config - "$@" <<EOF
header = "Authorization: Bearer ${TELNYX_API_KEY}"
EOF
