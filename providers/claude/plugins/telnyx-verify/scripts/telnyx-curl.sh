#!/bin/bash
# Curl wrapper that adds Telnyx auth header internally.
# The API key is passed via curl's --config on stdin so it never
# appears in process argv (visible in ps / /proc/*/cmdline).
#
# Usage: telnyx-curl.sh [curl args...]
# Example: telnyx-curl.sh -X POST -H "Content-Type: application/json" -d '{}' "https://api.telnyx.com/v2/messages"

if [[ -z "${TELNYX_API_KEY:-}" ]]; then
  echo "Error: TELNYX_API_KEY environment variable not set" >&2
  exit 1
fi

printf 'header = "Authorization: Bearer %s"\n' "$TELNYX_API_KEY" | exec curl -s --config - "$@"
