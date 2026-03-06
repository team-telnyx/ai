#!/usr/bin/env bash
#
# post-test-diagnostic.sh — Run after a migration test to capture diagnostics for skill improvement
#
# Usage: bash post-test-diagnostic.sh <project-root> [--agent-output <file>]
#
# Arguments:
#   <project-root>              Path to the migrated project
#   --agent-output <file>       Optional: file containing the agent's terminal output (copy-paste from session)
#
# Output: Writes a diagnostic report to <project-root>/SKILL-DIAGNOSTIC.json
#         Also prints a human-readable summary to stdout
#
# This captures what went WRONG with the skill (not just what Twilio code remains).
# Share the output JSON when reporting skill issues.

set -euo pipefail

# --- Colors ---
if [ -t 1 ]; then
  RED='\033[0;31m' YELLOW='\033[0;33m' GREEN='\033[0;32m' BLUE='\033[0;34m' BOLD='\033[1m' NC='\033[0m'
else
  RED='' YELLOW='' GREEN='' BLUE='' BOLD='' NC=''
fi

# --- Args ---
PROJECT_ROOT=""
AGENT_OUTPUT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --agent-output) AGENT_OUTPUT="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: bash post-test-diagnostic.sh <project-root> [--agent-output <file>]"
      echo ""
      echo "Run after a migration test to capture diagnostics for skill improvement."
      echo "Share the output SKILL-DIAGNOSTIC.json when reporting issues."
      exit 0 ;;
    *) PROJECT_ROOT="$1"; shift ;;
  esac
done

if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: provide a valid project root directory" >&2
  echo "Usage: bash post-test-diagnostic.sh <project-root>" >&2
  exit 1
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" && pwd)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${BOLD}Post-Test Diagnostic${NC}"
echo "==================="
echo "  Project: $PROJECT_ROOT"
echo ""

# --- 1. Project metadata ---
echo -e "${BOLD}1. Project metadata${NC}"

LANGUAGES=""
[ -f "$PROJECT_ROOT/package.json" ] && LANGUAGES="$LANGUAGES javascript"
[ -f "$PROJECT_ROOT/Podfile" ] || [ -f "$PROJECT_ROOT/Package.swift" ] && LANGUAGES="$LANGUAGES swift"
find "$PROJECT_ROOT" -maxdepth 3 -name "build.gradle*" -print -quit 2>/dev/null | grep -q . && LANGUAGES="$LANGUAGES kotlin/java"
[ -f "$PROJECT_ROOT/pubspec.yaml" ] && LANGUAGES="$LANGUAGES dart"
[ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/Pipfile" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ] && LANGUAGES="$LANGUAGES python"
[ -f "$PROJECT_ROOT/Gemfile" ] && LANGUAGES="$LANGUAGES ruby"
[ -f "$PROJECT_ROOT/go.mod" ] && LANGUAGES="$LANGUAGES go"
LANGUAGES=$(echo "$LANGUAGES" | xargs)

TOTAL_FILES=$(find "$PROJECT_ROOT" -type f \
  \( -name node_modules -o -name .git -o -name vendor -o -name __pycache__ \
     -o -name venv -o -name .venv -o -name dist -o -name build -o -name Pods \) -prune \
  -o -type f -print 2>/dev/null | wc -l | tr -d ' ')

echo "  Languages: ${LANGUAGES:-unknown}"
echo "  Files: $TOTAL_FILES"

# --- 2. Residual Twilio references (the core signal) ---
echo ""
echo -e "${BOLD}2. Residual Twilio references${NC}"

TWILIO_FILES=$(grep -rl -i "twilio" "$PROJECT_ROOT" \
  --include="*.py" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" \
  --include="*.rb" --include="*.go" --include="*.java" --include="*.kt" --include="*.swift" \
  --include="*.dart" --include="*.php" --include="*.cs" --include="*.xml" --include="*.yaml" \
  --include="*.yml" --include="*.json" --include="*.md" --include="*.txt" --include="*.sh" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor --exclude-dir=__pycache__ \
  --exclude-dir=venv --exclude-dir=.venv --exclude-dir=build --exclude-dir=dist --exclude-dir=Pods \
  --exclude="package-lock.json" --exclude="yarn.lock" --exclude="pnpm-lock.yaml" \
  --exclude="Gemfile.lock" --exclude="Pipfile.lock" --exclude="go.sum" \
  --exclude="twilio-scan.json" --exclude="twilio-deep-scan.json" \
  --exclude="migration-state.json" --exclude="MIGRATION-PLAN.md" --exclude="MIGRATION-REPORT.md" \
  --exclude="SKILL-DIAGNOSTIC.json" \
  2>/dev/null || true)

TWILIO_FILE_COUNT=$(echo "$TWILIO_FILES" | sed '/^$/d' | wc -l | tr -d ' ')

# Categorize: source code vs docs vs config vs test
SRC_TWILIO="" TEST_TWILIO="" DOC_TWILIO="" CONFIG_TWILIO=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  rel=$(echo "$f" | sed "s|$PROJECT_ROOT/||")
  case "$rel" in
    *test*|*Test*|*spec*|*Spec*|*__tests__*) TEST_TWILIO="$TEST_TWILIO$rel"$'\n' ;;
    *.md|*.txt|*.rst|README*|CONTRIBUTING*|CHANGELOG*|LICENSE*) DOC_TWILIO="$DOC_TWILIO$rel"$'\n' ;;
    *.json|*.yaml|*.yml|*.toml|*.cfg|*.ini|*.env*|*config*|*Config*) CONFIG_TWILIO="$CONFIG_TWILIO$rel"$'\n' ;;
    *) SRC_TWILIO="$SRC_TWILIO$rel"$'\n' ;;
  esac
done <<< "$TWILIO_FILES"

SRC_COUNT=$(echo "$SRC_TWILIO" | sed '/^$/d' | wc -l | tr -d ' ')
TEST_COUNT=$(echo "$TEST_TWILIO" | sed '/^$/d' | wc -l | tr -d ' ')
DOC_COUNT=$(echo "$DOC_TWILIO" | sed '/^$/d' | wc -l | tr -d ' ')
CONFIG_COUNT=$(echo "$CONFIG_TWILIO" | sed '/^$/d' | wc -l | tr -d ' ')

echo "  Total files with 'twilio': $TWILIO_FILE_COUNT"
echo "    Source code: $SRC_COUNT"
echo "    Test files:  $TEST_COUNT"
echo "    Docs:        $DOC_COUNT"
echo "    Config:      $CONFIG_COUNT"

if [ "$SRC_COUNT" -gt 0 ]; then
  echo -e "  ${RED}ISSUE${NC}  Source files still reference Twilio — migration incomplete"
fi
if [ "$TEST_COUNT" -gt 0 ]; then
  echo -e "  ${RED}ISSUE${NC}  Test files still reference Twilio — tests not migrated"
fi

# --- 3. Twilio directory names ---
echo ""
echo -e "${BOLD}3. Directory names with 'twilio'${NC}"

TWILIO_DIRS=$(find "$PROJECT_ROOT" -mindepth 1 \
  \( -name node_modules -o -name .git -o -name vendor -o -name __pycache__ \
     -o -name venv -o -name .venv -o -name dist -o -name build -o -name Pods \) -prune \
  -o -type d -iname '*twilio*' -print 2>/dev/null || true)
TWILIO_DIR_COUNT=$(echo "$TWILIO_DIRS" | sed '/^$/d' | wc -l | tr -d ' ')

if [ "$TWILIO_DIR_COUNT" -gt 0 ] && [ -n "$(echo "$TWILIO_DIRS" | sed '/^$/d')" ]; then
  echo -e "  ${RED}ISSUE${NC}  $TWILIO_DIR_COUNT directory name(s) still contain 'twilio':"
  echo "$TWILIO_DIRS" | sed '/^$/d' | while read -r d; do
    echo "    $(echo "$d" | sed "s|$PROJECT_ROOT/||")"
  done
else
  TWILIO_DIR_COUNT=0
  echo -e "  ${GREEN}PASS${NC}  No directories named with 'twilio'"
fi

# --- 4. Telnyx SDK presence ---
echo ""
echo -e "${BOLD}4. Telnyx SDK adoption${NC}"

TELNYX_IMPORTS=$(grep -rl -i "telnyx" "$PROJECT_ROOT" \
  --include="*.py" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" \
  --include="*.rb" --include="*.go" --include="*.java" --include="*.kt" --include="*.swift" \
  --include="*.dart" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor --exclude-dir=__pycache__ \
  --exclude-dir=venv --exclude-dir=.venv --exclude-dir=build --exclude-dir=dist --exclude-dir=Pods \
  2>/dev/null || true)
TELNYX_FILE_COUNT=$(echo "$TELNYX_IMPORTS" | sed '/^$/d' | wc -l | tr -d ' ')

echo "  Files referencing 'telnyx': $TELNYX_FILE_COUNT"
if [ "$TELNYX_FILE_COUNT" -eq 0 ]; then
  echo -e "  ${RED}ISSUE${NC}  No Telnyx references found — migration may not have started"
else
  echo -e "  ${GREEN}PASS${NC}  Telnyx SDK present in codebase"
fi

# --- 5. Migration state ---
echo ""
echo -e "${BOLD}5. Migration state file${NC}"

STATE_FILE="$PROJECT_ROOT/migration-state.json"
if [ -f "$STATE_FILE" ]; then
  echo -e "  ${GREEN}FOUND${NC}  migration-state.json"
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
with open('$STATE_FILE') as f:
    state = json.load(f)
products = state.get('products', {})
for name, info in products.items():
    status = info.get('status', 'unknown')
    files = len(info.get('files_migrated', []))
    print(f'    {name}: {status} ({files} files)')
phases = state.get('phases', {})
for phase, info in phases.items():
    status = info.get('status', 'unknown')
    print(f'    Phase {phase}: {status}')
" 2>/dev/null || echo "    (could not parse)"
  fi
else
  echo -e "  ${YELLOW}WARN${NC}  No migration-state.json — agent may not have tracked state"
fi

# --- 6. Lint script results ---
echo ""
echo -e "${BOLD}6. Lint results${NC}"

LINT_SCRIPT="$SCRIPT_DIR/lint-telnyx-correctness.sh"
LINT_JSON=""
if [ -f "$LINT_SCRIPT" ]; then
  SCAN_ARG=""
  [ -f "$PROJECT_ROOT/twilio-scan.json" ] && SCAN_ARG="--scan-json $PROJECT_ROOT/twilio-scan.json"
  LINT_JSON=$(bash "$LINT_SCRIPT" --json $SCAN_ARG "$PROJECT_ROOT" 2>/dev/null || echo "")
  if [ -n "$LINT_JSON" ]; then
    LINT_ISSUES=$(echo "$LINT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('issues',0))" 2>/dev/null || echo "?")
    LINT_WARNS=$(echo "$LINT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('warnings',0))" 2>/dev/null || echo "?")
    LINT_PASSES=$(echo "$LINT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('passes',0))" 2>/dev/null || echo "?")
    echo "  Issues: $LINT_ISSUES  Warnings: $LINT_WARNS  Passes: $LINT_PASSES"

    # Show issue details
    echo "$LINT_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for check in d.get('checks', []):
    if check.get('status') == 'issue':
        print(f\"    ISSUE: {check.get('name', '?')} — {check.get('message', check.get('fix', '?'))}\")
    elif check.get('status') == 'warn':
        print(f\"    WARN:  {check.get('name', '?')} — {check.get('message', check.get('fix', '?'))}\")
" 2>/dev/null || true
  else
    echo "  (lint script failed to produce output)"
  fi
else
  echo "  (lint script not found)"
fi

# --- 7. Validate script results ---
echo ""
echo -e "${BOLD}7. Validate results${NC}"

VALIDATE_SCRIPT="$SCRIPT_DIR/validate-migration.sh"
VALIDATE_JSON=""
if [ -f "$VALIDATE_SCRIPT" ]; then
  SCAN_ARG=""
  [ -f "$PROJECT_ROOT/twilio-scan.json" ] && SCAN_ARG="--scan-json $PROJECT_ROOT/twilio-scan.json"
  VALIDATE_JSON=$(bash "$VALIDATE_SCRIPT" --json $SCAN_ARG "$PROJECT_ROOT" 2>/dev/null || echo "")
  if [ -n "$VALIDATE_JSON" ]; then
    VAL_FAILS=$(echo "$VALIDATE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('fail_count',0))" 2>/dev/null || echo "?")
    VAL_WARNS=$(echo "$VALIDATE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('warn_count',0))" 2>/dev/null || echo "?")
    VAL_PASSES=$(echo "$VALIDATE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('pass_count',0))" 2>/dev/null || echo "?")
    echo "  Fails: $VAL_FAILS  Warnings: $VAL_WARNS  Passes: $VAL_PASSES"

    echo "$VALIDATE_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for check in d.get('checks', []):
    if check.get('status') == 'FAIL':
        print(f\"    FAIL: {check.get('name', '?')}\")
    elif check.get('status') == 'WARN':
        print(f\"    WARN: {check.get('name', '?')}\")
" 2>/dev/null || true
  else
    echo "  (validate script failed to produce output)"
  fi
else
  echo "  (validate script not found)"
fi

# --- 8. Agent behavior signals (from agent output if provided) ---
echo ""
echo -e "${BOLD}8. Agent behavior signals${NC}"

DEFERRED_ITEMS="" COMPACTION_COUNT=0 MANUAL_STEPS=""

# Auto-detect Claude Code JSONL transcript if no agent output specified
if [ -z "$AGENT_OUTPUT" ]; then
  CLAUDE_PROJECT_DIR="$HOME/.claude/projects"
  if [ -d "$CLAUDE_PROJECT_DIR" ]; then
    # Find the most recent JSONL transcript
    LATEST_JSONL=$(find "$CLAUDE_PROJECT_DIR" -name "*.jsonl" -type f -newer "$PROJECT_ROOT" 2>/dev/null | head -1 || true)
    if [ -z "$LATEST_JSONL" ]; then
      LATEST_JSONL=$(find "$CLAUDE_PROJECT_DIR" -name "*.jsonl" -type f 2>/dev/null | xargs ls -t 2>/dev/null | head -1 || true)
    fi
    if [ -n "$LATEST_JSONL" ]; then
      echo "  Auto-detected Claude Code transcript: $(basename "$LATEST_JSONL")"
      AGENT_OUTPUT="$LATEST_JSONL"
    fi
  fi
fi

if [ -n "$AGENT_OUTPUT" ] && [ -f "$AGENT_OUTPUT" ]; then
  echo "  Analyzing: $(basename "$AGENT_OUTPUT")"

  # Handle JSONL (Claude Code transcripts) — extract text content
  AGENT_TEXT=""
  if echo "$AGENT_OUTPUT" | grep -q '\.jsonl$'; then
    AGENT_TEXT=$(python3 -c "
import json, sys
for line in open('$AGENT_OUTPUT'):
    try:
        msg = json.loads(line)
        # Extract assistant message text
        if msg.get('type') == 'assistant':
            for block in msg.get('message', {}).get('content', []):
                if isinstance(block, dict) and block.get('type') == 'text':
                    print(block['text'])
                elif isinstance(block, str):
                    print(block)
    except: pass
" 2>/dev/null || echo "")
  else
    AGENT_TEXT=$(cat "$AGENT_OUTPUT" 2>/dev/null || echo "")
  fi

  if [ -n "$AGENT_TEXT" ]; then
    # Count compaction events
    COMPACTION_COUNT=$(echo "$AGENT_TEXT" | grep -c -i "compacting\|conversation was compressed\|context.*compact\|context recovery" 2>/dev/null || echo "0")
    echo "  Compaction events: $COMPACTION_COUNT"

    # Find deferred/skipped items
    DEFERRED_ITEMS=$(echo "$AGENT_TEXT" | grep -i "manual.*step\|remaining.*step\|defer\|skip\|TODO.*manual\|left as.*exercise\|out of scope" 2>/dev/null | head -20 || true)
    DEFERRED_COUNT=$(echo "$DEFERRED_ITEMS" | sed '/^$/d' | wc -l | tr -d ' ')
    if [ "$DEFERRED_COUNT" -gt 0 ]; then
      echo -e "  ${YELLOW}WARN${NC}  Agent deferred $DEFERRED_COUNT item(s) — check if these should have been migrated"
    else
      echo -e "  ${GREEN}PASS${NC}  No deferred items detected"
    fi

    # Find errors/failures
    ERROR_LINES=$(echo "$AGENT_TEXT" | grep -i "error\|fail\|exception\|could not\|unable to" 2>/dev/null | grep -v "test.*pass\|PASS\|success\|SKILL-DIAGNOSTIC\|exit code" | head -10 || true)
    ERROR_COUNT=$(echo "$ERROR_LINES" | sed '/^$/d' | wc -l | tr -d ' ')
    if [ "$ERROR_COUNT" -gt 0 ]; then
      echo -e "  ${YELLOW}WARN${NC}  $ERROR_COUNT potential error(s) in agent output"
    fi
  else
    echo "  (could not extract text from agent output)"
  fi
else
  echo "  No agent output found"
  echo "  Tip: run again after the Claude Code session ends — the transcript will be auto-detected"
fi

# --- 9. Git diff summary (if git repo) ---
echo ""
echo -e "${BOLD}9. Git changes${NC}"

GIT_DIFF_STAT=""
if [ -d "$PROJECT_ROOT/.git" ]; then
  GIT_DIFF_STAT=$(cd "$PROJECT_ROOT" && git diff --stat HEAD~1 2>/dev/null || git diff --stat 2>/dev/null || echo "")
  FILES_CHANGED=$(cd "$PROJECT_ROOT" && git diff --shortstat HEAD~1 2>/dev/null || git diff --shortstat 2>/dev/null || echo "")
  if [ -n "$FILES_CHANGED" ]; then
    echo "  $FILES_CHANGED"
  else
    echo "  (no git changes detected — agent may not have committed)"
  fi
else
  echo "  (not a git repo)"
fi

# --- Write JSON report ---
echo ""
echo -e "${BOLD}Writing diagnostic report...${NC}"

OUTPUT_FILE="$PROJECT_ROOT/SKILL-DIAGNOSTIC.json"

python3 -c "
import json, sys

report = {
    'version': '1.0',
    'project_root': '$PROJECT_ROOT',
    'languages': '${LANGUAGES}'.split(),
    'total_files': $TOTAL_FILES,
    'residual_twilio': {
        'total': $TWILIO_FILE_COUNT,
        'source': $SRC_COUNT,
        'test': $TEST_COUNT,
        'docs': $DOC_COUNT,
        'config': $CONFIG_COUNT,
        'source_files': [f for f in '''$(echo "$SRC_TWILIO")'''.strip().split('\n') if f],
        'test_files': [f for f in '''$(echo "$TEST_TWILIO")'''.strip().split('\n') if f],
    },
    'twilio_directories': {
        'count': $TWILIO_DIR_COUNT,
        'paths': [d.replace('$PROJECT_ROOT/', '') for d in '''$(echo "$TWILIO_DIRS")'''.strip().split('\n') if d],
    },
    'telnyx_adoption': {
        'files_with_telnyx': $TELNYX_FILE_COUNT,
    },
    'compaction_events': $COMPACTION_COUNT,
    'agent_deferred_items': [d for d in '''$(echo "$DEFERRED_ITEMS")'''.strip().split('\n') if d],
}

# Add lint results if available
lint_json = '''$(echo "$LINT_JSON" | sed "s/'/\\\\'/g")'''
if lint_json.strip():
    try:
        report['lint'] = json.loads(lint_json)
    except:
        pass

# Add validate results if available
validate_json = '''$(echo "$VALIDATE_JSON" | sed "s/'/\\\\'/g")'''
if validate_json.strip():
    try:
        report['validate'] = json.loads(validate_json)
    except:
        pass

with open('$OUTPUT_FILE', 'w') as f:
    json.dump(report, f, indent=2)

print(f'  Written to: $OUTPUT_FILE')
" 2>/dev/null || echo "  (failed to write JSON — check python3)"

# --- Summary ---
echo ""
echo "==================="
echo -e "${BOLD}Summary${NC}"
TOTAL_ISSUES=0
[ "$SRC_COUNT" -gt 0 ] && echo -e "  ${RED}!!${NC}  $SRC_COUNT source files still reference Twilio" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$TEST_COUNT" -gt 0 ] && echo -e "  ${RED}!!${NC}  $TEST_COUNT test files still reference Twilio" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$TWILIO_DIR_COUNT" -gt 0 ] && echo -e "  ${RED}!!${NC}  $TWILIO_DIR_COUNT directories still named with 'twilio'" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$TELNYX_FILE_COUNT" -eq 0 ] && echo -e "  ${RED}!!${NC}  No Telnyx references found at all" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$COMPACTION_COUNT" -gt 0 ] && echo -e "  ${YELLOW}!!${NC}  $COMPACTION_COUNT compaction event(s) — agent may have lost context" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))

if [ "$TOTAL_ISSUES" -eq 0 ]; then
  echo -e "  ${GREEN}All clear${NC} — no obvious skill issues detected"
fi

echo ""
echo "Share SKILL-DIAGNOSTIC.json when reporting skill issues."
echo ""
