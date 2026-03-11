#!/usr/bin/env bash
set -euo pipefail

# Telnyx Verify API CLI
# Wraps all Verify API endpoints for phone verification workflows.
# Requires: TELNYX_API_KEY environment variable, curl, jq (optional)

BASE_URL="https://api.telnyx.com/v2"

die() { echo "Error: $*" >&2; exit 1; }

check_key() {
  [[ -n "${TELNYX_API_KEY:-}" ]] || die "TELNYX_API_KEY environment variable not set"
}

# Generic API call with error handling
api() {
  local method="$1" endpoint="$2"; shift 2
  local url="${BASE_URL}${endpoint}"
  local response http_code body

  response=$(curl -s --globoff -w "\n%{http_code}" -X "$method" "$url" \
    -H "Authorization: Bearer ${TELNYX_API_KEY}" \
    -H "Content-Type: application/json" \
    "$@") || die "curl request failed"

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    echo "HTTP $http_code" >&2
    if command -v jq &>/dev/null; then
      echo "$body" | jq . 2>/dev/null || echo "$body" >&2
    else
      echo "$body" >&2
    fi
    exit 1
  fi

  if command -v jq &>/dev/null; then
    echo "$body" | jq .
  else
    echo "$body"
  fi
}

# Build JSON payload safely (handles special chars in values)
json_string() {
  # Escape special JSON characters — returns a quoted JSON string
  if command -v python3 &>/dev/null; then
    printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()), end="")'
  elif command -v jq &>/dev/null; then
    printf '%s' "$1" | jq -Rs .
  else
    # Minimal fallback: escape backslash, double-quote, and control chars
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    printf '"%s"' "$s"
  fi
}

usage() {
  cat <<'EOF'
Usage: verify.sh <command> [options]

Commands:
  create-profile    Create a new Verify profile
  list-profiles     List all Verify profiles
  get-profile       Get a Verify profile by ID
  update-profile    Update a Verify profile
  delete-profile    Delete a Verify profile
  send-sms          Send SMS verification code
  send-call         Send voice call verification code
  send-flashcall    Send flash call verification
  check-code        Verify a code by verification ID
  check-by-phone    Verify a code by phone number
  list-by-phone     List verifications for a phone number
  list-templates    List message templates
  create-template   Create a message template

Environment:
  TELNYX_API_KEY    Required. Your Telnyx API v2 key.

Examples:
  verify.sh create-profile --name "My App" --app-name "MyApp" --code-length 6
  verify.sh send-sms --phone "+13035551234" --profile-id "uuid-here"
  verify.sh check-code --verification-id "uuid" --code "123456"
  verify.sh check-by-phone --phone "+13035551234" --profile-id "uuid" --code "123456"
EOF
  exit 1
}

# ─── Profile Commands ──────────────────────────────────────────────

cmd_create_profile() {
  local name="" webhook_url="" app_name="" code_length="6" timeout="300"
  local destinations='["US","CA"]' language="en-US"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift 2;;
      --webhook-url) webhook_url="$2"; shift 2;;
      --app-name) app_name="$2"; shift 2;;
      --code-length) code_length="$2"; shift 2;;
      --timeout) timeout="$2"; shift 2;;
      --destinations) destinations="$2"; shift 2;;
      --language) language="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  [[ -n "$name" ]] || die "Usage: verify.sh create-profile --name <name> [--app-name <name>] [--code-length 4-10] [--timeout <seconds>] [--webhook-url <url>] [--destinations '[\"US\"]'] [--language en-US]"

  # Build channel settings block (sms + call) when any channel-related option is provided
  local channel_block=""
  if [[ -n "$app_name" || "$code_length" != "6" || "$timeout" != "300" || "$destinations" != '["US","CA"]' ]]; then
    local app_name_field=""
    [[ -n "$app_name" ]] && app_name_field="\"app_name\":$(json_string "$app_name"),"
    channel_block=",\"sms\":{${app_name_field}\"code_length\":${code_length},\"whitelisted_destinations\":${destinations},\"default_verification_timeout_secs\":${timeout}},\"call\":{${app_name_field}\"code_length\":${code_length},\"whitelisted_destinations\":${destinations},\"default_verification_timeout_secs\":${timeout}}"
  fi

  local webhook_block=""
  [[ -n "$webhook_url" ]] && webhook_block=",\"webhook_url\":$(json_string "$webhook_url")"

  local payload="{\"name\":$(json_string "$name")${webhook_block},\"language\":$(json_string "$language")${channel_block}}"

  api POST "/verify_profiles" -d "$payload"
}

cmd_list_profiles() {
  local filter_name="" page_size="20"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) filter_name="$2"; shift 2;;
      --page-size) page_size="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  local query="?page[size]=${page_size}"
  [[ -n "$filter_name" ]] && query+="&filter[name]=${filter_name}"

  api GET "/verify_profiles${query}"
}

cmd_get_profile() {
  local profile_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in --profile-id) profile_id="$2"; shift 2;; *) die "Unknown option: $1";; esac
  done
  [[ -n "$profile_id" ]] || die "Usage: verify.sh get-profile --profile-id <uuid>"
  api GET "/verify_profiles/${profile_id}"
}

cmd_update_profile() {
  local profile_id="" payload="{"
  local has_field=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --profile-id) profile_id="$2"; shift 2;;
      --name)
        $has_field && payload+=","
        payload+="\"name\":$(json_string "$2")"
        has_field=true; shift 2;;
      --webhook-url)
        $has_field && payload+=","
        payload+="\"webhook_url\":$(json_string "$2")"
        has_field=true; shift 2;;
      --language)
        $has_field && payload+=","
        payload+="\"language\":$(json_string "$2")"
        has_field=true; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done
  payload+="}"

  [[ -n "$profile_id" ]] || die "Usage: verify.sh update-profile --profile-id <uuid> [--name <name>] [--webhook-url <url>] [--language <lang>]"
  $has_field || die "No fields to update. Use --name, --webhook-url, or --language."

  api PATCH "/verify_profiles/${profile_id}" -d "$payload"
}

cmd_delete_profile() {
  local profile_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in --profile-id) profile_id="$2"; shift 2;; *) die "Unknown option: $1";; esac
  done
  [[ -n "$profile_id" ]] || die "Usage: verify.sh delete-profile --profile-id <uuid>"
  api DELETE "/verify_profiles/${profile_id}"
}

# ─── Verification Commands ──────────────────────────────────────────

cmd_send_verification() {
  local type="$1"; shift
  local phone="" profile_id="" timeout="" custom_code=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --phone) phone="$2"; shift 2;;
      --profile-id) profile_id="$2"; shift 2;;
      --timeout) timeout="$2"; shift 2;;
      --custom-code) custom_code="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  [[ -n "$phone" && -n "$profile_id" ]] || die "Usage: verify.sh send-${type} --phone <E.164> --profile-id <uuid> [--timeout <seconds>] [--custom-code <code>]"

  # Validate E.164 format
  [[ "$phone" == +* ]] || die "Phone number must be in E.164 format (start with +)"

  local payload="{\"phone_number\":$(json_string "$phone"),\"verify_profile_id\":$(json_string "$profile_id")"
  [[ -n "$timeout" ]] && payload+=",\"timeout_secs\":${timeout}"
  [[ -n "$custom_code" ]] && payload+=",\"custom_code\":$(json_string "$custom_code")"
  payload+="}"

  api POST "/verifications/${type}" -d "$payload"
}

cmd_check_code() {
  local verification_id="" code=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --verification-id) verification_id="$2"; shift 2;;
      --code) code="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  [[ -n "$verification_id" && -n "$code" ]] || die "Usage: verify.sh check-code --verification-id <uuid> --code <code>"

  api POST "/verifications/${verification_id}/actions/verify" -d "{\"code\":$(json_string "$code")}"
}

cmd_check_by_phone() {
  local phone="" profile_id="" code=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --phone) phone="$2"; shift 2;;
      --profile-id) profile_id="$2"; shift 2;;
      --code) code="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  [[ -n "$phone" && -n "$profile_id" && -n "$code" ]] || die "Usage: verify.sh check-by-phone --phone <E.164> --profile-id <uuid> --code <code>"

  # URL-encode the + as %2B
  local encoded_phone="${phone/+/%2B}"

  api POST "/verifications/by_phone_number/${encoded_phone}/actions/verify" \
    -d "{\"code\":$(json_string "$code"),\"verify_profile_id\":$(json_string "$profile_id")}"
}

cmd_list_by_phone() {
  local phone=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --phone) phone="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  [[ -n "$phone" ]] || die "Usage: verify.sh list-by-phone --phone <E.164>"

  local encoded_phone="${phone/+/%2B}"
  api GET "/verifications/by_phone_number/${encoded_phone}"
}

# ─── Template Commands ──────────────────────────────────────────────

cmd_list_templates() {
  api GET "/verify_profiles/templates"
}

cmd_create_template() {
  local text=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --text) text="$2"; shift 2;;
      *) die "Unknown option: $1";;
    esac
  done

  [[ -n "$text" ]] || die "Usage: verify.sh create-template --text <template_text>\n  Template must include {{code}} variable."

  api POST "/verify_profiles/templates" -d "{\"text\":$(json_string "$text")}"
}

# ─── Main ──────────────────────────────────────────────────────────

[[ $# -ge 1 ]] || usage
check_key

command="$1"; shift
case "$command" in
  create-profile)  cmd_create_profile "$@";;
  list-profiles)   cmd_list_profiles "$@";;
  get-profile)     cmd_get_profile "$@";;
  update-profile)  cmd_update_profile "$@";;
  delete-profile)  cmd_delete_profile "$@";;
  send-sms)        cmd_send_verification sms "$@";;
  send-call)       cmd_send_verification call "$@";;
  send-flashcall)  cmd_send_verification flashcall "$@";;
  check-code)      cmd_check_code "$@";;
  check-by-phone)  cmd_check_by_phone "$@";;
  list-by-phone)   cmd_list_by_phone "$@";;
  list-templates)  cmd_list_templates "$@";;
  create-template) cmd_create_template "$@";;
  help|--help|-h)  usage;;
  *) echo "Unknown command: $command" >&2; usage;;
esac
