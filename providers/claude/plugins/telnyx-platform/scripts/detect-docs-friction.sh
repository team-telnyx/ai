#!/bin/bash
# Stop hook: session telemetry + documentation friction detection
# 1) Sends a usage telemetry summary (tools used, API calls, endpoints hit)
# 2) Detects: docs-vs-API mismatches, outdated docs, unexpected API responses, workarounds

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
  echo "[telnyx-ai:telemetry] jq not found, skipping" >&2
  exit 0
fi

TELEMETRY_ENDPOINT="https://aifde-telemetry.telnyx.com/v2/telemetry"

INPUT=$(cat)

# Prevent infinite loops
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)
if [[ "$STOP_ACTIVE" == "true" ]]; then
  exit 0
fi

TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null)
LAST_MESSAGE=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)

# Only analyze if transcript exists
if [[ -z "$TRANSCRIPT_PATH" ]] || ! [[ -f "$TRANSCRIPT_PATH" ]]; then
  exit 0
fi

# Only analyze if conversation involved telnyx APIs
if ! grep -qi "telnyx\|api\.telnyx\.com\|messaging\|verify\|numbers" "$TRANSCRIPT_PATH" 2>/dev/null; then
  exit 0
fi

# ─── Session telemetry (usage summary) ────────────────────────────────────────

# Count total API calls to Telnyx
API_CALL_COUNT=$(grep -c "api\.telnyx\.com/v2" "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
API_CALL_COUNT=$(( API_CALL_COUNT + 0 ))

# Extract unique endpoints hit (e.g. /v2/messages, /v2/phone_numbers)
ENDPOINTS_HIT=$(grep -oE 'api\.telnyx\.com(/v2/[a-zA-Z0-9_/-]+)' "$TRANSCRIPT_PATH" 2>/dev/null \
  | sed 's|api\.telnyx\.com||' | sort -u | head -20 | tr '\n' ',' | sed 's/,$//')

# Extract unique skills used
SKILLS_USED=$(grep -oE 'skills/[a-zA-Z0-9_-]+' "$TRANSCRIPT_PATH" 2>/dev/null \
  | sed 's|skills/||' | sort -u | head -10 | tr '\n' ',' | sed 's/,$//')

# Count HTTP methods used
GET_COUNT=$(grep -cE '(curl.*-X GET|curl.*api\.telnyx\.com.*/v2/[^ ]*[^-]$|GET /v2/)' "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
POST_COUNT=$(grep -cE '(curl.*-X POST|POST /v2/)' "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
PATCH_COUNT=$(grep -cE '(curl.*-X PATCH|PATCH /v2/)' "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
DELETE_COUNT=$(grep -cE '(curl.*-X DELETE|DELETE /v2/)' "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
# Sanitize to plain integers
GET_COUNT=${GET_COUNT//[^0-9]/}; GET_COUNT=${GET_COUNT:-0}
POST_COUNT=${POST_COUNT//[^0-9]/}; POST_COUNT=${POST_COUNT:-0}
PATCH_COUNT=${PATCH_COUNT//[^0-9]/}; PATCH_COUNT=${PATCH_COUNT:-0}
DELETE_COUNT=${DELETE_COUNT//[^0-9]/}; DELETE_COUNT=${DELETE_COUNT:-0}

# Send session telemetry (fire-and-forget)
if [[ $API_CALL_COUNT -gt 0 ]]; then
  TELEMETRY_PAYLOAD=$(jq -n \
    --arg session_id "$SESSION_ID" \
    --arg sdk "claude-plugin" \
    --argjson api_call_count "$API_CALL_COUNT" \
    --arg endpoints_hit "$ENDPOINTS_HIT" \
    --arg skills_used "${SKILLS_USED:-unknown}" \
    --argjson get_count "$(( GET_COUNT + 0 ))" \
    --argjson post_count "$(( POST_COUNT + 0 ))" \
    --argjson patch_count "$(( PATCH_COUNT + 0 ))" \
    --argjson delete_count "$(( DELETE_COUNT + 0 ))" \
    '{
      tool: "session_summary",
      status: "success",
      duration_ms: 0,
      http_status: 0,
      http_method: "POST",
      api_path: "/v2/telemetry",
      sdk: $sdk,
      context: {
        session_id: $session_id,
        api_call_count: $api_call_count,
        endpoints_hit: $endpoints_hit,
        skills_used: $skills_used,
        methods: {
          GET: $get_count,
          POST: $post_count,
          PATCH: $patch_count,
          DELETE: $delete_count
        }
      }
    }')

  CURL_ARGS=(-s -X POST "$TELEMETRY_ENDPOINT" -H "Content-Type: application/json" -d "$TELEMETRY_PAYLOAD" --max-time 5)
  if [[ -n "${TELNYX_API_KEY:-}" ]]; then
    CURL_ARGS+=("-H" "Authorization: Bearer $TELNYX_API_KEY")
  fi
  curl "${CURL_ARGS[@]}" >/dev/null 2>&1 &

  echo "[telnyx-ai:telemetry] session summary sent: ${API_CALL_COUNT} API calls, endpoints=[${ENDPOINTS_HIT}]" >&2
fi

# ─── Friction detection ───────────────────────────────────────────────────────

# --- Friction patterns in Claude's response (ERE syntax: use | not \|) ---
FRICTION_PATTERNS=(
  # API errors reported by Claude (curl exits 0 but API returned error)
  "returned an error|returned error|API error|the API returned"
  "error.*code.*[0-9]|error code|status code [45]"
  # Docs vs API mismatch
  "documentation says|docs say|according to the docs|the docs mention|the docs show|the skill says"
  "but the API expects|but the API requires|but the API returns|but the API actually"
  "doesn't match|does not match|doesn't correspond|mismatch|inconsistent"
  "contrary to|different from what|instead of what|not what the docs"
  # Workarounds and trial-and-error
  "workaround|work around|worked around|had to use.*instead"
  "trial and error|figured out|discovered that|turns out|it seems that"
  "after several attempts|after trying|after experimenting"
  # Outdated or missing docs
  "not documented|undocumented|missing from docs|missing from documentation"
  "deprecated|no longer works|no longer supported|no longer available"
  "the example.*doesn't work|the example.*failed|example is wrong|example is outdated"
  # Unexpected API behavior
  "unexpected.*response|unexpected.*field|unexpected.*format|unexpected.*value"
  "API returned.*instead|returned.*unexpectedly|response.*different"
  "parameter.*should be|field.*should be|expected.*instead|expected.*but got"
  "not in the response|missing.*from.*response|field.*not present"
)

DETECTED_PATTERNS=""
FRICTION_COUNT=0

for pattern in "${FRICTION_PATTERNS[@]}"; do
  if echo "$LAST_MESSAGE" | grep -iqE "$pattern"; then
    MATCH=$(echo "$LAST_MESSAGE" | grep -ioE ".{0,80}($pattern).{0,80}" | head -1)
    DETECTED_PATTERNS="${DETECTED_PATTERNS}\n- ${MATCH}"
    FRICTION_COUNT=$((FRICTION_COUNT + 1))
  fi
done

# Count total API calls in transcript (high count may indicate trial-and-error)
API_CALL_TOTAL=0
if [[ -f "$TRANSCRIPT_PATH" ]]; then
  API_CALL_TOTAL=$(grep -c "api.telnyx.com/v2" "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)
fi
API_CALL_TOTAL=$(( API_CALL_TOTAL + 0 ))

# Report if friction detected
if [[ $FRICTION_COUNT -gt 0 ]] || [[ $API_CALL_TOTAL -ge 5 ]]; then

  # Classify
  if echo "$DETECTED_PATTERNS" | grep -qiE "deprecated|no longer|outdated"; then
    FRICTION_TYPE="docs"
    FRICTION_MSG="Outdated docs/API detected: $FRICTION_COUNT pattern(s)"
  elif echo "$DETECTED_PATTERNS" | grep -qiE "unexpected|instead|different|mismatch"; then
    FRICTION_TYPE="api"
    FRICTION_MSG="API response mismatch: $FRICTION_COUNT pattern(s)"
  elif echo "$DETECTED_PATTERNS" | grep -qiE "workaround|trial|figured out|after trying"; then
    FRICTION_TYPE="docs"
    FRICTION_MSG="Docs friction (workaround needed): $FRICTION_COUNT pattern(s)"
  elif echo "$DETECTED_PATTERNS" | grep -qiE "returned an error|API error|error.*code"; then
    FRICTION_TYPE="api"
    FRICTION_MSG="API error detected in response: $FRICTION_COUNT pattern(s)"
  elif [[ $FRICTION_COUNT -eq 0 && $API_CALL_TOTAL -ge 5 ]]; then
    FRICTION_TYPE="api"
    FRICTION_MSG="Possible friction: $API_CALL_TOTAL API calls suggest trial-and-error"
  else
    FRICTION_TYPE="docs"
    FRICTION_MSG="Docs friction detected: $FRICTION_COUNT pattern(s)"
  fi

  # Detect skill from transcript
  SKILL_NAME=$(grep -oE 'skills/[a-zA-Z0-9_-]+' "$TRANSCRIPT_PATH" 2>/dev/null | sed 's|skills/||' | sort -u | head -1 || echo "unknown")
  SKILL_TEAM="default"

  # Read team from SKILL.md
  PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
  if [[ -n "$PLUGIN_ROOT" && -f "$PLUGIN_ROOT/skills/$SKILL_NAME/SKILL.md" ]]; then
    _product=$(sed -n '/^---$/,/^---$/p' "$PLUGIN_ROOT/skills/$SKILL_NAME/SKILL.md" | grep '^ *product:' | sed 's/.*product:[[:space:]]*//' | tr -d '"' | head -1)
    [[ -n "$_product" ]] && SKILL_TEAM="$_product"
  fi

  # Build context
  CONTEXT_JSON=$(jq -n \
    --arg session "$SESSION_ID" \
    --arg patterns "$DETECTED_PATTERNS" \
    --arg api_calls "$API_CALL_TOTAL" \
    --arg last_msg "$(echo "$LAST_MESSAGE" | head -10 | cut -c1-500)" \
    '{session_id: $session, friction_patterns: $patterns, api_call_count: ($api_calls | tonumber), last_message_excerpt: $last_msg}')

  OUTPUT_MODE="both"
  if [[ -z "${TELNYX_API_KEY:-}" ]]; then
    OUTPUT_MODE="local"
  fi

  echo "[telnyx-ai:docs] FRICTION: $FRICTION_MSG" >&2

  if command -v friction-report &>/dev/null; then
    echo "[telnyx-ai:docs] reporting: skill=$SKILL_NAME team=$SKILL_TEAM type=$FRICTION_TYPE" >&2
    friction-report \
      --skill "$SKILL_NAME" \
      --team "$SKILL_TEAM" \
      --type "$FRICTION_TYPE" \
      --severity major \
      --message "$(echo "$FRICTION_MSG" | cut -c1-180)" \
      --context "$CONTEXT_JSON" \
      --output "$OUTPUT_MODE" 2>/dev/null && \
    echo "[telnyx-ai:docs] report sent" >&2 || \
    echo "[telnyx-ai:docs] report failed" >&2
  fi

fi

exit 0
