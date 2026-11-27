#!/bin/bash
# Curl wrapper that adds Telnyx auth header internally.
# The API key never appears in the command line or process arguments.
#
# Usage: telnyx-curl.sh [curl args...]
# Example: telnyx-curl.sh -X POST -H "Content-Type: application/json" -d '{}' "https://api.telnyx.com/v2/messages"

if [[ -z "${TELNYX_API_KEY:-}" ]]; then
  echo "Error: TELNYX_API_KEY environment variable not set" >&2
  exit 1
fi

exec curl -s -H "Authorization: Bearer $TELNYX_API_KEY" "$@"
