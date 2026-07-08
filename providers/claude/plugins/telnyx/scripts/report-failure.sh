#!/bin/bash
# PostToolUseFailure hook: report API friction via ffl-cli

PYTHON_USER_BIN=$(python3 -c "import site; print(site.getusersitepackages().replace('/lib/python','/bin'))" 2>/dev/null || echo "")
export PATH="${PYTHON_USER_BIN:+$PYTHON_USER_BIN:}$HOME/.local/bin:$PATH"

# ─── Consent check: exit early if user has not opted in ──────────────────────
CONFIG_FILE="${TELNYX_AI_HOME:-$HOME/.telnyx-ai}/config.json"
OPT_IN=$(python3 -c "
import json
try:
    with open('$CONFIG_FILE') as f:
        val = json.load(f).get('analyticsOptIn')
    print('null' if val is None else str(val).lower())
except Exception:
    print('null')
" 2>/dev/null)

if [[ "$OPT_IN" != "true" ]]; then
  exit 0
fi

if ! command -v jq &>/dev/null; then
  echo "[telnyx-ai:failure] jq not found, skipping" >&2
  exit 0
fi

INPUT=$(cat)

# Parse input
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
ERROR_MSG=$(echo "$INPUT" | jq -r '.error // "Unknown error"' 2>/dev/null)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.command // .tool_input // ""' 2>/dev/null)
CWD=$(echo "$INPUT" | jq -r '.cwd // ""' 2>/dev/null)
SESSION=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | cut -c1-8)

# Only Bash/exec tools
if [[ "$TOOL" != "Bash" && "$TOOL" != "exec" ]]; then
  exit 0
fi

# Only telnyx-related commands
if ! echo "$ARGS" | grep -qiE "telnyx|api\.telnyx\.com|messaging|verify|numbers"; then
  exit 0
fi

# Detect skill from path or cwd
SKILL_NAME=$(echo "$ARGS" | grep -oE 'skills/[a-zA-Z0-9_-]+' | head -1 | sed 's|skills/||' || echo "")
if [[ -z "$SKILL_NAME" && -n "$CWD" ]]; then
  SKILL_NAME=$(echo "$CWD" | grep -oE 'skills/[a-zA-Z0-9_-]+' | head -1 | sed 's|skills/||' || echo "")
fi
SKILL_NAME="${SKILL_NAME:-unknown}"

# Read team from SKILL.md metadata.product
SKILL_TEAM="default"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
SKILL_MD=""
if [[ -n "$PLUGIN_ROOT" && -f "$PLUGIN_ROOT/skills/$SKILL_NAME/SKILL.md" ]]; then
  SKILL_MD="$PLUGIN_ROOT/skills/$SKILL_NAME/SKILL.md"
elif [[ -n "$CWD" && -f "$CWD/SKILL.md" ]]; then
  SKILL_MD="$CWD/SKILL.md"
fi
if [[ -n "$SKILL_MD" ]]; then
  _product=$(sed -n '/^---$/,/^---$/p' "$SKILL_MD" | grep '^ *product:' | sed 's/.*product:[[:space:]]*//' | tr -d '"' | head -1)
  [[ -n "$_product" ]] && SKILL_TEAM="$_product"
fi

# Extract HTTP status code
HTTP_CODE=$(echo "$ERROR_MSG" | grep -oE 'HTTP[/ ][0-9]{3}' | head -1 | grep -oE '[0-9]{3}' || echo "")

# Classify
SEVERITY="major"
TYPE="api"
if [[ "$HTTP_CODE" == "401" || "$HTTP_CODE" == "403" ]]; then
  SEVERITY="blocker"; TYPE="auth"
elif [[ "$HTTP_CODE" == "400" || "$HTTP_CODE" == "422" ]]; then
  TYPE="parameter"
elif [[ "$HTTP_CODE" == "404" ]]; then
  TYPE="parameter"
elif [[ "$HTTP_CODE" == "429" ]]; then
  TYPE="api"; SEVERITY="minor"
elif [[ "$HTTP_CODE" == "500" || "$HTTP_CODE" == "502" || "$HTTP_CODE" == "503" ]]; then
  TYPE="api"
fi

# Extract error details from JSON
ERROR_TITLE=$(echo "$ERROR_MSG" | jq -r 'select(type=="object") | .errors[0].title // empty' 2>/dev/null || echo "")
ERROR_DETAIL=$(echo "$ERROR_MSG" | jq -r 'select(type=="object") | .errors[0].detail // empty' 2>/dev/null || echo "")
# Fallback: try extracting embedded JSON string
if [[ -z "$ERROR_TITLE" && -z "$ERROR_DETAIL" ]]; then
  ERROR_TITLE=$(echo "$ERROR_MSG" | jq -R 'fromjson? // null | select(.!=null) | .errors[0].title // empty' 2>/dev/null || echo "")
  ERROR_DETAIL=$(echo "$ERROR_MSG" | jq -R 'fromjson? // null | select(.!=null) | .errors[0].detail // empty' 2>/dev/null || echo "")
fi

if [[ -n "$ERROR_TITLE" && -n "$ERROR_DETAIL" ]]; then
  SHORT_ERROR="HTTP ${HTTP_CODE}: ${ERROR_TITLE} - ${ERROR_DETAIL}"
elif [[ -n "$ERROR_TITLE" ]]; then
  SHORT_ERROR="HTTP ${HTTP_CODE}: ${ERROR_TITLE}"
elif [[ -n "$HTTP_CODE" ]]; then
  SHORT_ERROR="HTTP ${HTTP_CODE} error"
else
  SHORT_ERROR=$(echo "$ERROR_MSG" | head -1)
fi
SHORT_ERROR=$(echo "$SHORT_ERROR" | cut -c1-180)

# Redact secrets and build context
SAFE_ARGS=$(echo "$ARGS" | sed -E 's/KEY[A-Za-z0-9_]+/***REDACTED***/g; s/Bearer [^ "]+/Bearer ***REDACTED***/g')
ENDPOINT=$(echo "$ARGS" | grep -oE 'api\.telnyx\.com/v2/[^ "]+' | head -1 || echo "")

CONTEXT_JSON=$(jq -n \
  --arg session "$SESSION" \
  --arg command "$SAFE_ARGS" \
  --arg http_code "$HTTP_CODE" \
  --arg endpoint "$ENDPOINT" \
  '{session_id: $session, command: $command, http_code: $http_code, endpoint: $endpoint}')

# Output mode
OUTPUT_MODE="both"
if [[ -z "${TELNYX_API_KEY:-}" ]]; then
  OUTPUT_MODE="local"
fi

# Send report
if ! command -v friction-report &>/dev/null; then
  echo "[telnyx-ai:failure] friction-report not installed, skipping" >&2
  exit 0
fi

echo "[telnyx-ai:failure] reporting: skill=$SKILL_NAME team=$SKILL_TEAM type=$TYPE severity=$SEVERITY" >&2
echo "[telnyx-ai:failure] $SHORT_ERROR" >&2

friction-report \
  --skill "$SKILL_NAME" \
  --team "$SKILL_TEAM" \
  --type "$TYPE" \
  --severity "$SEVERITY" \
  --message "API failed: $SHORT_ERROR" \
  --context "$CONTEXT_JSON" \
  --output "$OUTPUT_MODE" 2>/dev/null && \
echo "[telnyx-ai:failure] report sent" >&2 || \
echo "[telnyx-ai:failure] report failed" >&2

exit 0
