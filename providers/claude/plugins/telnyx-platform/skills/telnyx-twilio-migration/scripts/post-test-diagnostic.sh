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
# shellcheck disable=SC2034  # BLUE reserved for info lines; kept for palette consistency
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
  # shellcheck disable=SC2221,SC2222  # bash case is case-sensitive: *test* and *Test* are distinct
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

TOTAL_MESSAGES=0 TOTAL_TOOL_CALLS=0 DEFERRED_COUNT=0

# List available transcripts if none specified
if [ -z "$AGENT_OUTPUT" ]; then
  CLAUDE_PROJECT_DIR="$HOME/.claude/projects"
  if [ -d "$CLAUDE_PROJECT_DIR" ]; then
    RECENT_JSONLS=$(find "$CLAUDE_PROJECT_DIR" -maxdepth 2 -name "*.jsonl" -not -path "*/subagents/*" -type f 2>/dev/null | xargs ls -t 2>/dev/null | head -5 || true)
    if [ -n "$RECENT_JSONLS" ]; then
      echo "  No --agent-output specified. Recent transcripts:"
      echo "$RECENT_JSONLS" | while IFS= read -r f; do
        SIZE=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
        MOD=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$f" 2>/dev/null || stat -c "%y" "$f" 2>/dev/null | cut -d. -f1 || echo "?")
        echo "    $f  ($SIZE lines, $MOD)"
      done
      echo ""
      echo "  Re-run with: --agent-output <path-to-jsonl>"
    fi
  fi
fi

AGENT_ANALYSIS_FILE=$(mktemp)
if [ -n "$AGENT_OUTPUT" ] && [ -f "$AGENT_OUTPUT" ]; then
  echo "  Analyzing: $(basename "$AGENT_OUTPUT")"

  python3 - "$AGENT_OUTPUT" "$AGENT_ANALYSIS_FILE" << 'PYEOF'
import json, sys, re, os

transcript_path = sys.argv[1]
output_file = sys.argv[2]

total_messages = 0
total_tool_calls = 0
deferred_lines = []
texts = []

if transcript_path.endswith('.jsonl'):
    for line in open(transcript_path):
        try:
            msg = json.loads(line)
            if msg.get('type') == 'assistant':
                total_messages += 1
                for block in msg.get('message', {}).get('content', []):
                    if isinstance(block, dict):
                        if block.get('type') == 'text':
                            texts.append(block['text'])
                        elif block.get('type') == 'tool_use':
                            total_tool_calls += 1
        except:
            pass
else:
    texts = [open(transcript_path).read()]

defer_pattern = re.compile(
    r'.*(manual.{0,20}step|remaining.{0,20}step|defer(?:red|ring)|TODO.{0,10}manual|left as.{0,20}exercise|out of scope).*',
    re.IGNORECASE
)
for text in texts:
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped and defer_pattern.match(stripped):
            if not stripped.startswith(('#', '//', '```', '*', '-')):
                deferred_lines.append(stripped)

result = {
    'total_messages': total_messages,
    'total_tool_calls': total_tool_calls,
    'deferred_count': len(deferred_lines),
    'deferred_items': deferred_lines[:20],
}

with open(output_file, 'w') as f:
    json.dump(result, f)
PYEOF

  if [ -f "$AGENT_ANALYSIS_FILE" ]; then
    TOTAL_MESSAGES=$(python3 -c "import json; print(json.load(open('$AGENT_ANALYSIS_FILE')).get('total_messages',0))" 2>/dev/null || echo "0")
    TOTAL_TOOL_CALLS=$(python3 -c "import json; print(json.load(open('$AGENT_ANALYSIS_FILE')).get('total_tool_calls',0))" 2>/dev/null || echo "0")
    DEFERRED_COUNT=$(python3 -c "import json; print(json.load(open('$AGENT_ANALYSIS_FILE')).get('deferred_count',0))" 2>/dev/null || echo "0")

    echo "  Agent messages: $TOTAL_MESSAGES"
    echo "  Tool calls: $TOTAL_TOOL_CALLS"

    if [ "$DEFERRED_COUNT" -gt 0 ]; then
      echo -e "  ${YELLOW}WARN${NC}  Agent deferred $DEFERRED_COUNT item(s) — check if these should have been migrated:"
      python3 -c "
import json
for item in json.load(open('$AGENT_ANALYSIS_FILE')).get('deferred_items',[])[:5]:
    print(f'    {item}')
" 2>/dev/null || true
    else
      echo -e "  ${GREEN}PASS${NC}  No deferred items detected"
    fi
  else
    echo "  (could not analyze transcript)"
  fi
else
  echo "  No agent output found"
  echo "  Tip: run again after the Claude Code session ends — the transcript will be auto-detected"
fi

# --- 9. Git diff summary (if git repo) ---
echo ""
echo -e "${BOLD}9. Git changes${NC}"

if [ -d "$PROJECT_ROOT/.git" ]; then
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

# Write all data to temp files, then let python assemble the JSON safely
SRC_TWILIO_FILE=$(mktemp)
TEST_TWILIO_FILE=$(mktemp)
TWILIO_DIRS_FILE=$(mktemp)
LINT_FILE=$(mktemp)
VALIDATE_FILE=$(mktemp)

echo "$SRC_TWILIO" | sed '/^$/d' > "$SRC_TWILIO_FILE"
echo "$TEST_TWILIO" | sed '/^$/d' > "$TEST_TWILIO_FILE"
echo "$TWILIO_DIRS" | sed '/^$/d' | sed "s|$PROJECT_ROOT/||g" > "$TWILIO_DIRS_FILE"
echo "$LINT_JSON" > "$LINT_FILE"
echo "$VALIDATE_JSON" > "$VALIDATE_FILE"

python3 - "$OUTPUT_FILE" "$PROJECT_ROOT" "$LANGUAGES" \
  "$TOTAL_FILES" "$TWILIO_FILE_COUNT" "$SRC_COUNT" "$TEST_COUNT" "$DOC_COUNT" "$CONFIG_COUNT" \
  "$TWILIO_DIR_COUNT" "$TELNYX_FILE_COUNT" \
  "$TOTAL_MESSAGES" "$TOTAL_TOOL_CALLS" "$DEFERRED_COUNT" \
  "$SRC_TWILIO_FILE" "$TEST_TWILIO_FILE" "$TWILIO_DIRS_FILE" \
  "$LINT_FILE" "$VALIDATE_FILE" "$AGENT_ANALYSIS_FILE" << 'PYEOF'
import json, sys

args = sys.argv[1:]
output_file = args[0]
project_root = args[1]

def read_lines(path):
    try:
        return [l.strip() for l in open(path) if l.strip()]
    except:
        return []

def read_json(path):
    try:
        content = open(path).read().strip()
        if content:
            return json.loads(content)
    except:
        pass
    return None

def safe_int(val):
    try:
        return int(val)
    except:
        return 0

report = {
    'version': '1.0',
    'project_root': project_root,
    'languages': args[2].split(),
    'total_files': safe_int(args[3]),
    'residual_twilio': {
        'total': safe_int(args[4]),
        'source': safe_int(args[5]),
        'test': safe_int(args[6]),
        'docs': safe_int(args[7]),
        'config': safe_int(args[8]),
        'source_files': read_lines(args[14]),
        'test_files': read_lines(args[15]),
    },
    'twilio_directories': {
        'count': safe_int(args[9]),
        'paths': read_lines(args[16]),
    },
    'telnyx_adoption': {
        'files_with_telnyx': safe_int(args[10]),
    },
    'agent': {
        'messages': safe_int(args[11]),
        'tool_calls': safe_int(args[12]),
        'deferred_count': safe_int(args[13]),
    },
}

# Add agent deferred items
agent_data = read_json(args[19])
if agent_data:
    report['agent']['deferred_items'] = agent_data.get('deferred_items', [])

# Add lint results
lint_data = read_json(args[17])
if lint_data:
    report['lint'] = lint_data

# Add validate results
validate_data = read_json(args[18])
if validate_data:
    report['validate'] = validate_data

with open(output_file, 'w') as f:
    json.dump(report, f, indent=2)

print(f'  Written to: {output_file}')
PYEOF

WRITE_OK=$?
rm -f "$SRC_TWILIO_FILE" "$TEST_TWILIO_FILE" "$TWILIO_DIRS_FILE" "$LINT_FILE" "$VALIDATE_FILE" "$AGENT_ANALYSIS_FILE" 2>/dev/null

if [ "$WRITE_OK" -ne 0 ]; then
  echo "  (failed to write JSON — check python3)"
fi

# --- Summary ---
echo ""
echo "==================="
echo -e "${BOLD}Summary${NC}"
TOTAL_ISSUES=0
[ "$SRC_COUNT" -gt 0 ] && echo -e "  ${RED}!!${NC}  $SRC_COUNT source files still reference Twilio" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$TEST_COUNT" -gt 0 ] && echo -e "  ${RED}!!${NC}  $TEST_COUNT test files still reference Twilio" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$TWILIO_DIR_COUNT" -gt 0 ] && echo -e "  ${RED}!!${NC}  $TWILIO_DIR_COUNT directories still named with 'twilio'" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$TELNYX_FILE_COUNT" -eq 0 ] && echo -e "  ${RED}!!${NC}  No Telnyx references found at all" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$DEFERRED_COUNT" -gt 0 ] && echo -e "  ${YELLOW}!!${NC}  Agent deferred $DEFERRED_COUNT item(s)" && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))

if [ "$TOTAL_ISSUES" -eq 0 ]; then
  echo -e "  ${GREEN}All clear${NC} — no obvious skill issues detected"
fi

echo ""
echo "Share SKILL-DIAGNOSTIC.json when reporting skill issues."
echo ""
