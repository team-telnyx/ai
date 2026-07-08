#!/usr/bin/env bash
# migration-state.sh — Read/write/update migration-state.json
# Tracks: current phase, resource IDs, completed products, migrated files, commit SHAs
#
# Usage:
#   migration-state.sh init <project-root>          — Create fresh state file
#   migration-state.sh get <project-root> <key>     — Read a value (dot-notation: resources.messaging_profile_id)
#   migration-state.sh set <project-root> <key> <value> — Set a value
#   migration-state.sh add-product <project-root> <product> — Mark product as completed
#   migration-state.sh add-file <project-root> <product> <file> — Track migrated file
#   migration-state.sh set-phase <project-root> <phase> — Update current phase (0-6)
#   migration-state.sh set-commit <project-root> <phase> — Record current HEAD as phase commit
#   migration-state.sh show <project-root>          — Pretty-print current state
#   migration-state.sh status <project-root>        — One-line status summary

set -euo pipefail

STATE_FILE="migration-state.json"

die() { echo "ERROR: $*" >&2; exit 1; }

state_path() {
  local root="$1"
  echo "${root%/}/$STATE_FILE"
}

ensure_jq() {
  command -v jq >/dev/null 2>&1 || die "jq is required. Install: brew install jq / apt-get install jq"
}

cmd_init() {
  local root="${1:?Usage: migration-state.sh init <project-root>}"
  local path
  path=$(state_path "$root")

  if [[ -f "$path" ]]; then
    echo "State file already exists at $path"
    echo "Use 'set' commands to update, or delete the file to reinitialize."
    return 0
  fi

  cat > "$path" <<'TEMPLATE'
{
  "version": 1,
  "current_phase": 0,
  "started_at": "",
  "updated_at": "",
  "resources": {
    "messaging_profile_id": null,
    "voice_connection_id": null,
    "verify_profile_id": null,
    "texml_app_id": null,
    "sip_connection_id": null,
    "fax_app_id": null
  },
  "completed_products": [],
  "migrated_files": {},
  "phase_commits": {},
  "scan_file": null,
  "migration_plan_file": null,
  "notes": []
}
TEMPLATE

  # Set timestamps
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local tmp
  tmp=$(jq --arg t "$now" '.started_at = $t | .updated_at = $t' "$path")
  echo "$tmp" > "$path"

  echo "Initialized migration state at $path"
}

cmd_get() {
  local root="${1:?Usage: migration-state.sh get <project-root> <key>}"
  local key="${2:?Usage: migration-state.sh get <project-root> <key>}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  jq -r ".$key // empty" "$path"
}

cmd_set() {
  local root="${1:?Usage: migration-state.sh set <project-root> <key> <value>}"
  local key="${2:?}"
  local value="${3:?}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Determine if value is a number, boolean, null, or string
  local tmp
  if [[ "$value" =~ ^[0-9]+$ ]] || [[ "$value" == "true" ]] || [[ "$value" == "false" ]] || [[ "$value" == "null" ]]; then
    tmp=$(jq --arg t "$now" ".$key = $value | .updated_at = \$t" "$path")
  else
    tmp=$(jq --arg t "$now" --arg v "$value" ".$key = \$v | .updated_at = \$t" "$path")
  fi
  echo "$tmp" > "$path"
  echo "Set $key = $value"
}

cmd_add_product() {
  local root="${1:?Usage: migration-state.sh add-product <project-root> <product>}"
  local product="${2:?}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local tmp
  tmp=$(jq --arg t "$now" --arg p "$product" \
    'if (.completed_products | index($p)) then . else .completed_products += [$p] end | .updated_at = $t' \
    "$path")
  echo "$tmp" > "$path"
  echo "Marked product '$product' as completed"
}

cmd_add_file() {
  local root="${1:?Usage: migration-state.sh add-file <project-root> <product> <file>}"
  local product="${2:?}"
  local file="${3:?}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local tmp
  tmp=$(jq --arg t "$now" --arg p "$product" --arg f "$file" \
    '.migrated_files[$p] = ((.migrated_files[$p] // []) + [$f] | unique) | .updated_at = $t' \
    "$path")
  echo "$tmp" > "$path"
  echo "Tracked file '$file' under product '$product'"
}

cmd_set_phase() {
  local root="${1:?Usage: migration-state.sh set-phase <project-root> <phase>}"
  local phase="${2:?}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  [[ "$phase" =~ ^[0-6]$ ]] || die "Phase must be 0-6, got: $phase"

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local tmp
  tmp=$(jq --arg t "$now" ".current_phase = $phase | .updated_at = \$t" "$path")
  echo "$tmp" > "$path"
  echo "Phase updated to $phase"
}

cmd_set_commit() {
  local root="${1:?Usage: migration-state.sh set-commit <project-root> <phase>}"
  local phase="${2:?}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  local sha
  sha=$(cd "$root" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local tmp
  tmp=$(jq --arg t "$now" --arg p "phase_$phase" --arg s "$sha" \
    '.phase_commits[$p] = $s | .updated_at = $t' "$path")
  echo "$tmp" > "$path"
  echo "Recorded commit $sha for phase $phase"
}

cmd_show() {
  local root="${1:?Usage: migration-state.sh show <project-root>}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || die "No state file at $path — run 'init' first"

  jq '.' "$path"
}

cmd_status() {
  local root="${1:?Usage: migration-state.sh status <project-root>}"
  local path
  path=$(state_path "$root")
  [[ -f "$path" ]] || { echo "No migration state — run 'migration-state.sh init <root>' to start"; return 0; }

  local phase products file_count
  phase=$(jq -r '.current_phase' "$path")
  products=$(jq -r '.completed_products | join(", ")' "$path")
  file_count=$(jq '[.migrated_files[] | length] | add // 0' "$path")

  echo "Phase $phase/6 | Products done: ${products:-none} | Files migrated: $file_count"
}

# Main dispatch
ensure_jq

case "${1:-}" in
  init)       shift; cmd_init "$@" ;;
  get)        shift; cmd_get "$@" ;;
  set)        shift; cmd_set "$@" ;;
  add-product) shift; cmd_add_product "$@" ;;
  add-file)   shift; cmd_add_file "$@" ;;
  set-phase)  shift; cmd_set_phase "$@" ;;
  set-commit) shift; cmd_set_commit "$@" ;;
  show)       shift; cmd_show "$@" ;;
  status)     shift; cmd_status "$@" ;;
  *)
    echo "Usage: migration-state.sh <command> <project-root> [args...]"
    echo ""
    echo "Commands:"
    echo "  init <root>                    Create fresh migration-state.json"
    echo "  get <root> <key>               Read value (dot-notation: resources.messaging_profile_id)"
    echo "  set <root> <key> <value>       Set a value"
    echo "  add-product <root> <product>   Mark product as completed"
    echo "  add-file <root> <product> <file>  Track migrated file"
    echo "  set-phase <root> <phase>       Update current phase (0-6)"
    echo "  set-commit <root> <phase>      Record current HEAD as phase commit"
    echo "  show <root>                    Pretty-print state"
    echo "  status <root>                  One-line summary"
    exit 1
    ;;
esac
