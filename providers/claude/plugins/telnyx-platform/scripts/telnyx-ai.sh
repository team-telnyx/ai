#!/bin/bash
# telnyx-ai — CLI for managing analytics opt-in preferences
# Usage:
#   telnyx-ai analytics --opt-in    Enable analytics (install ffl-cli + telemetry)
#   telnyx-ai analytics --opt-out   Disable analytics (remove ffl-cli, stop reporting)
#   telnyx-ai analytics --status    Show current opt-in status
#   telnyx-ai analytics --reset     Reset to undecided (will prompt again next session)

set -euo pipefail

CONFIG_DIR="${TELNYX_AI_HOME:-$HOME/.telnyx-ai}"
CONFIG_FILE="$CONFIG_DIR/config.json"
VERSION=1

# ─── Helpers ──────────────────────────────────────────────────────────────────

init_config() {
  mkdir -p "$CONFIG_DIR"
  if [[ ! -f "$CONFIG_FILE" ]]; then
    cat > "$CONFIG_FILE" <<EOJSON
{
  "analyticsOptIn": null,
  "telemetryEnabled": false,
  "frictionReportingEnabled": false,
  "askedAt": null,
  "version": $VERSION
}
EOJSON
    chmod 600 "$CONFIG_FILE"
  fi
}

read_field() {
  python3 - "$CONFIG_FILE" "$1" <<'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        cfg = json.load(f)
    val = cfg.get(sys.argv[2], None)
    print('null' if val is None else str(val).lower())
except Exception:
    print('null')
PYEOF
}

write_field() {
  local key="$1"
  local value="$2"
  python3 - "$CONFIG_FILE" "$key" "$value" <<'PYEOF'
import json, datetime, sys
config_path, key, raw_value = sys.argv[1], sys.argv[2], sys.argv[3]
VALUE_MAP = {"True": True, "False": False, "None": None}
value = VALUE_MAP.get(raw_value, raw_value)
with open(config_path) as f:
    cfg = json.load(f)
cfg[key] = value
if key == "analyticsOptIn":
    cfg["askedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
with open(config_path, "w") as f:
    json.dump(cfg, f, indent=2)
PYEOF
}

install_ffl_cli() {
  PYTHON_USER_BIN=$(python3 -c "import site; print(site.getusersitepackages().replace('/lib/python','/bin'))" 2>/dev/null || echo "")
  export PATH="${PYTHON_USER_BIN:+$PYTHON_USER_BIN:}$HOME/.local/bin:$PATH"
  if command -v friction-report &>/dev/null; then
    echo "[telnyx-ai] friction-report already installed"
  else
    echo "[telnyx-ai] installing friction-report CLI..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    python3 -m pip install --user --quiet "$SCRIPT_DIR/../../../tools/ffl-cli" 2>&1 | tail -3
    if command -v friction-report &>/dev/null; then
      echo "[telnyx-ai] ✅ friction-report installed"
    else
      echo "[telnyx-ai] ⚠️  failed to install friction-report"
    fi
  fi
}

uninstall_ffl_cli() {
  PYTHON_USER_BIN=$(python3 -c "import site; print(site.getusersitepackages().replace('/lib/python','/bin'))" 2>/dev/null || echo "")
  export PATH="${PYTHON_USER_BIN:+$PYTHON_USER_BIN:}$HOME/.local/bin:$PATH"
  if command -v friction-report &>/dev/null; then
    echo "[telnyx-ai] removing friction-report CLI..."
    python3 -m pip uninstall --user --quiet telnyx-ffl-cli 2>/dev/null || true
    echo "[telnyx-ai] ✅ friction-report removed"
  else
    echo "[telnyx-ai] friction-report not installed, nothing to remove"
  fi
}

# ─── Commands ─────────────────────────────────────────────────────────────────

cmd_opt_in() {
  init_config
  write_field "analyticsOptIn" "True"
  write_field "frictionReportingEnabled" "True"
  write_field "telemetryEnabled" "True"
  install_ffl_cli
  echo ""
  echo "[telnyx-ai] ✅ Analytics enabled. Thank you for helping improve Telnyx products!"
  echo "[telnyx-ai]    Friction reporting: ON"
  echo "[telnyx-ai]    Telemetry: ON"
  echo "[telnyx-ai]    You can opt out anytime: telnyx-ai analytics --opt-out"
}

cmd_opt_out() {
  init_config
  write_field "analyticsOptIn" "False"
  write_field "frictionReportingEnabled" "False"
  write_field "telemetryEnabled" "False"
  uninstall_ffl_cli
  echo ""
  echo "[telnyx-ai] ✅ Analytics disabled. No data will be collected."
  echo "[telnyx-ai]    Skills work normally without analytics."
  echo "[telnyx-ai]    You can opt in anytime: telnyx-ai analytics --opt-in"
}

cmd_status() {
  init_config
  local opt_in
  opt_in=$(read_field "analyticsOptIn")

  echo "[telnyx-ai] Analytics status:"
  case "$opt_in" in
    "true")
      echo "  Opt-in: ✅ Enabled"
      echo "  Friction reporting: ON"
      echo "  Telemetry: ON"
      echo "  Config: $CONFIG_FILE"
      ;;
    "false")
      echo "  Opt-in: ❌ Disabled"
      echo "  Friction reporting: OFF"
      echo "  Telemetry: OFF"
      echo "  Config: $CONFIG_FILE"
      ;;
    *)
      echo "  Opt-in: ⏳ Not decided yet"
      echo "  Friction reporting: OFF (pending decision)"
      echo "  Telemetry: OFF (pending decision)"
      echo ""
      echo "  To enable:  telnyx-ai analytics --opt-in"
      echo "  To disable: telnyx-ai analytics --opt-out"
      ;;
  esac
}

cmd_reset() {
  init_config
  write_field "analyticsOptIn" "None"
  write_field "frictionReportingEnabled" "False"
  write_field "telemetryEnabled" "False"
  echo "[telnyx-ai] ✅ Analytics preference reset. You will be prompted again next session."
}

# ─── Main ─────────────────────────────────────────────────────────────────────

init_config

case "${1:-} ${2:-}" in
  "analytics --opt-in")  cmd_opt_in ;;
  "analytics --opt-out") cmd_opt_out ;;
  "analytics --status")  cmd_status ;;
  "analytics --reset")   cmd_reset ;;
  *)
    echo "Usage: telnyx-ai <command>"
    echo ""
    echo "Commands:"
    echo "  analytics --opt-in    Enable analytics (install ffl-cli + telemetry)"
    echo "  analytics --opt-out   Disable analytics (remove ffl-cli, stop reporting)"
    echo "  analytics --status    Show current opt-in status"
    echo "  analytics --reset     Reset to undecided (will prompt again next session)"
    exit 1
    ;;
esac
