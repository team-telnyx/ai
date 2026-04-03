#!/usr/bin/env bash
#
# run-discovery.sh — Phase 1: Full discovery pipeline
#
# Runs all Phase 1 steps in order: Twilio usage scan (no API key needed),
# preflight check, and optionally the deep scanner.
#
# The scanner runs FIRST so you can inspect Twilio usage even without
# a Telnyx API key. Preflight failures are reported as warnings — they
# don't block scan results.
#
# Usage: bash run-discovery.sh <project-root>
#
# Environment variables (optional for scan, required for preflight):
#   TELNYX_API_KEY   Your Telnyx API key
#
# Output:
#   <project-root>/twilio-scan.json       Scan results (products, files, patterns)
#   <project-root>/twilio-deep-scan.json  Deep scan results (if Python available)
#   stdout: Preflight report + scan summary
#
# Exit codes:
#   0 — Discovery complete (scan succeeded; preflight may have warnings)
#   2 — Invalid arguments (project root doesn't exist, etc.)

set -uo pipefail

# --- bash 4+ auto-upgrade (macOS ships bash 3.2, sub-scripts need bash 4+) ---
if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  for _alt_bash in /opt/homebrew/bin/bash /usr/local/bin/bash; do
    if [ -x "$_alt_bash" ] && "$_alt_bash" -c 'exit $(( BASH_VERSINFO[0] < 4 ))' 2>/dev/null; then
      exec "$_alt_bash" "$0" "$@"
    fi
  done
  echo "Warning: bash 4+ recommended for full functionality. Install: brew install bash" >&2
  echo "  Continuing with bash ${BASH_VERSION} — some sub-scripts may fail." >&2
fi

# --- Resolve script directory ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Colors ---
if [ -t 1 ]; then
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' YELLOW='' GREEN='' BLUE='' BOLD='' NC=''
fi

# --- Parse arguments ---
if [ $# -lt 1 ] || [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: bash run-discovery.sh <project-root>"
  echo ""
  echo "Runs the full Phase 1 discovery pipeline:"
  echo "  1. Twilio usage scan (grep-based, no API key needed)"
  echo "  2. Preflight check (API key, account, tools)"
  echo "  3. Deep scan (AST-based, if Python available)"
  echo ""
  echo "Produces: twilio-scan.json and twilio-deep-scan.json in <project-root>"
  exit 0
fi

PROJECT_ROOT="$1"

if [ ! -d "$PROJECT_ROOT" ]; then
  echo -e "${RED}ERROR${NC}  Project root does not exist: $PROJECT_ROOT" >&2
  exit 2
fi

echo -e "${BOLD}═══════════════════════════════════${NC}"
echo -e "${BOLD}  Phase 1: Discovery${NC}"
echo -e "${BOLD}═══════════════════════════════════${NC}"
echo ""

# --- Step 1.1: Scan for Twilio Usage (no API key needed) ---
echo -e "${BOLD}Step 1.1: Twilio Usage Scan${NC}"
echo "─────────────────────────────"
echo -e "  ${BLUE}INFO${NC}  Scanning source code for Twilio patterns (no API key required)..."
echo ""

SCAN_OUTPUT="$PROJECT_ROOT/twilio-scan.json"
bash "$SCRIPT_DIR/scan-twilio-usage.sh" "$PROJECT_ROOT" > "$SCAN_OUTPUT" 2>/dev/null
SCAN_EXIT=$?

if [ "$SCAN_EXIT" -ne 0 ]; then
  echo -e "  ${YELLOW}WARN${NC}  Scanner exited with code $SCAN_EXIT"
fi

if [ -f "$SCAN_OUTPUT" ] && [ -s "$SCAN_OUTPUT" ]; then
  echo -e "  ${GREEN}PASS${NC}  Scan results saved to: $SCAN_OUTPUT"

  # Print summary if jq is available
  if command -v jq &>/dev/null; then
    PRODUCTS=$(jq -r '.products_used // [] | join(", ")' "$SCAN_OUTPUT" 2>/dev/null || echo "unknown")
    FILE_COUNT=$(jq -r '.files | length // 0' "$SCAN_OUTPUT" 2>/dev/null || echo "0")
    LANGUAGES=$(jq -r '.languages_detected // [] | join(", ")' "$SCAN_OUTPUT" 2>/dev/null || echo "unknown")
    echo ""
    echo -e "  ${BOLD}Scan Summary:${NC}"
    echo "  Languages:  $LANGUAGES"
    echo "  Products:   $PRODUCTS"
    echo "  Files:      $FILE_COUNT files with Twilio patterns"
  fi
else
  echo -e "  ${YELLOW}WARN${NC}  Scan produced no output — the project may have no Twilio code"
fi

echo ""

# --- Step 1.2: Preflight Check (API key, account, tools) ---
echo -e "${BOLD}Step 1.2: Preflight Check${NC}"
echo "─────────────────────────"

API_KEY_OK=true
if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${YELLOW}WARN${NC}  TELNYX_API_KEY is not set"
  echo "  Set it with: export TELNYX_API_KEY='KEY...'"
  echo "  Get one at:  https://portal.telnyx.com/#/app/api-keys"
  echo -e "  ${BLUE}INFO${NC}  Scan results above are still valid — set the key and re-run for full preflight."
  API_KEY_OK=false
else
  bash "$SCRIPT_DIR/preflight-check.sh" "$PROJECT_ROOT"
  PREFLIGHT_EXIT=$?
  if [ "$PREFLIGHT_EXIT" -ne 0 ]; then
    echo ""
    echo -e "  ${YELLOW}WARN${NC}  Preflight check had failures. Scan results above are still valid."
    echo "  Fix preflight issues before proceeding to Phase 2."
    API_KEY_OK=false
  fi
fi

echo ""

# --- Step 1.3: Deep Scan (optional) ---
echo -e "${BOLD}Step 1.3: Deep Scan (AST-based)${NC}"
echo "──────────────────────────────────"

DEEP_SCAN_OUTPUT="$PROJECT_ROOT/twilio-deep-scan.json"

if command -v python3 &>/dev/null; then
  if [ -f "$SCRIPT_DIR/scan-twilio-deep.py" ]; then
    echo -e "  ${BLUE}INFO${NC}  Running scan-twilio-deep.py..."
    python3 "$SCRIPT_DIR/scan-twilio-deep.py" "$PROJECT_ROOT" > "$DEEP_SCAN_OUTPUT" 2>/dev/null
    DEEP_EXIT=$?
    if [ "$DEEP_EXIT" -eq 0 ] && [ -f "$DEEP_SCAN_OUTPUT" ] && [ -s "$DEEP_SCAN_OUTPUT" ]; then
      echo -e "  ${GREEN}PASS${NC}  Deep scan results saved to: $DEEP_SCAN_OUTPUT"
    else
      echo -e "  ${YELLOW}WARN${NC}  Deep scan failed or produced no output (exit code: $DEEP_EXIT)"
    fi
  else
    echo -e "  ${BLUE}INFO${NC}  Deep scanner not available — skipping"
  fi
else
  echo -e "  ${BLUE}INFO${NC}  Python3 not available — skipping deep scan"
  echo "  The grep-based scan above is sufficient for most projects."
fi

echo ""

# --- Step 1.4: Check for Partial Migration ---
echo -e "${BOLD}Step 1.4: Partial Migration Check${NC}"
echo "────────────────────────────────────"

if command -v git &>/dev/null && [ -d "$PROJECT_ROOT/.git" ]; then
  UNCOMMITTED=$(cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UNCOMMITTED" -gt 0 ]; then
    echo -e "  ${YELLOW}WARN${NC}  $UNCOMMITTED uncommitted changes detected"
    # Check if any changes contain Telnyx patterns (partial migration)
    TELNYX_IN_DIFF=$(cd "$PROJECT_ROOT" && git diff 2>/dev/null | grep -c -i "telnyx" || true)
    TELNYX_IN_DIFF="${TELNYX_IN_DIFF:-0}"
    if [ "$TELNYX_IN_DIFF" -gt 0 ]; then
      echo -e "  ${YELLOW}WARN${NC}  Telnyx patterns found in uncommitted changes — possible partial migration"
      echo "  Review with: cd $PROJECT_ROOT && git diff --stat"
    fi
  else
    echo -e "  ${GREEN}PASS${NC}  Git working tree is clean"
  fi
else
  echo -e "  ${BLUE}INFO${NC}  Not a git repository — skipping partial migration check"
fi

# --- Summary ---
echo ""
echo -e "${BOLD}═══════════════════════════════════${NC}"
echo -e "${BOLD}  Phase 1 Complete${NC}"
echo -e "${BOLD}═══════════════════════════════════${NC}"
echo ""
echo "  Scan results:      $SCAN_OUTPUT"
if [ -f "$DEEP_SCAN_OUTPUT" ] && [ -s "$DEEP_SCAN_OUTPUT" ]; then
  echo "  Deep scan results: $DEEP_SCAN_OUTPUT"
fi
echo ""
echo "  Next: Review scan results, triage matches, then proceed to Phase 2 (Planning)."

if [ "$API_KEY_OK" = false ]; then
  echo -e "  ${YELLOW}NOTE${NC}  Set TELNYX_API_KEY and re-run preflight before starting Phase 2."
fi
