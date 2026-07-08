#!/usr/bin/env bash
#
# run-validation.sh — Phase 5: Full validation pipeline
#
# Runs all validation steps in order: migration validation, TeXML validation,
# smoke test. Reports pass/fail for each and exits with overall status.
#
# Usage: bash run-validation.sh <project-root> [--include-texml] [--json]
#
# Arguments:
#   <project-root>      Path to the migrated project
#   --include-texml     Also validate TeXML/XML files
#   --json              Output machine-readable JSON summary
#
# Environment variables (required):
#   TELNYX_API_KEY   Your Telnyx API key (for smoke test)
#
# Exit codes:
#   0 — All validation checks passed
#   1 — One or more checks failed

set -uo pipefail

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
PROJECT_ROOT=""
INCLUDE_TEXML=false
JSON_MODE=false

for arg in "$@"; do
  case "$arg" in
    --include-texml) INCLUDE_TEXML=true ;;
    --json) JSON_MODE=true ;;
    --help|-h)
      echo "Usage: bash run-validation.sh <project-root> [--include-texml] [--json]"
      echo ""
      echo "Runs the full Phase 5 validation pipeline:"
      echo "  1. Migration validation (residual Twilio patterns)"
      echo "  2. TeXML validation (if --include-texml)"
      echo "  3. Smoke test (API key, balance, SDK, numbers)"
      echo ""
      echo "Exit code 0 = all checks passed."
      exit 0
      ;;
    *)
      if [ -z "$PROJECT_ROOT" ]; then
        PROJECT_ROOT="$arg"
      fi
      ;;
  esac
done

if [ -z "$PROJECT_ROOT" ]; then
  echo "Usage: bash run-validation.sh <project-root> [--include-texml] [--json]" >&2
  exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
  echo -e "${RED}ERROR${NC}  Project root does not exist: $PROJECT_ROOT" >&2
  exit 2
fi

OVERALL_PASS=true
RESULTS=""

echo -e "${BOLD}═══════════════════════════════════${NC}"
echo -e "${BOLD}  Phase 5: Validation${NC}"
echo -e "${BOLD}═══════════════════════════════════${NC}"
echo ""

# --- Step 5.1: Migration Validation ---
echo -e "${BOLD}Step 5.1: Migration Validation${NC}"
echo "────────────────────────────────"

VALIDATE_ARGS=("$PROJECT_ROOT")
[ "$JSON_MODE" = true ] && VALIDATE_ARGS+=("--json")
bash "$SCRIPT_DIR/validate-migration.sh" "${VALIDATE_ARGS[@]}"
VALIDATE_EXIT=$?

if [ "$VALIDATE_EXIT" -eq 0 ]; then
  echo ""
  echo -e "  ${GREEN}PASS${NC}  Migration validation passed"
  RESULTS="${RESULTS}migration:pass,"
else
  echo ""
  echo -e "  ${RED}FAIL${NC}  Migration validation failed (exit code: $VALIDATE_EXIT)"
  echo -e "  ${BLUE}INFO${NC}  Fix the issues above, then re-run this script."
  OVERALL_PASS=false
  RESULTS="${RESULTS}migration:fail,"
fi

echo ""

# --- Step 5.2: TeXML Validation (optional) ---
if [ "$INCLUDE_TEXML" = true ]; then
  echo -e "${BOLD}Step 5.2: TeXML Validation${NC}"
  echo "────────────────────────────"

  TEXML_FILES=()
  while IFS= read -r -d '' file; do
    TEXML_FILES+=("$file")
  done < <(find "$PROJECT_ROOT" -name "*.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" -print0 2>/dev/null)

  if [ ${#TEXML_FILES[@]} -eq 0 ]; then
    echo -e "  ${BLUE}INFO${NC}  No XML files found — skipping TeXML validation"
    RESULTS="${RESULTS}texml:skip,"
  else
    TEXML_PASS=true
    for xml_file in "${TEXML_FILES[@]}"; do
      if bash "$SCRIPT_DIR/validate-texml.sh" "$xml_file" >/dev/null 2>&1; then
        echo -e "  ${GREEN}PASS${NC}  $(basename "$xml_file")"
      else
        echo -e "  ${RED}FAIL${NC}  $(basename "$xml_file")"
        TEXML_PASS=false
      fi
    done
    if [ "$TEXML_PASS" = true ]; then
      RESULTS="${RESULTS}texml:pass,"
    else
      RESULTS="${RESULTS}texml:fail,"
      OVERALL_PASS=false
    fi
  fi
  echo ""
fi

# --- Step 5.3: Smoke Test ---
echo -e "${BOLD}Step 5.3: Smoke Test${NC}"
echo "──────────────────────"

if [ -z "${TELNYX_API_KEY:-}" ]; then
  echo -e "  ${YELLOW}WARN${NC}  TELNYX_API_KEY not set — skipping smoke test"
  RESULTS="${RESULTS}smoke:skip,"
else
  # Run smoke test from project root so it finds local node_modules
  (cd "$PROJECT_ROOT" && bash "$SCRIPT_DIR/test-migration/smoke-test.sh")
  SMOKE_EXIT=$?

  if [ "$SMOKE_EXIT" -eq 0 ]; then
    echo ""
    echo -e "  ${GREEN}PASS${NC}  Smoke test passed"
    RESULTS="${RESULTS}smoke:pass,"
  else
    echo ""
    echo -e "  ${RED}FAIL${NC}  Smoke test failed"
    echo -e "  ${BLUE}INFO${NC}  Fix the issues above before running integration tests."
    OVERALL_PASS=false
    RESULTS="${RESULTS}smoke:fail,"
  fi
fi

# --- Summary ---
echo ""
echo -e "${BOLD}═══════════════════════════════════${NC}"
echo -e "${BOLD}  Phase 5 Summary${NC}"
echo -e "${BOLD}═══════════════════════════════════${NC}"
echo ""
echo "  Results: ${RESULTS%,}"
echo ""

if [ "$OVERALL_PASS" = true ]; then
  echo -e "  ${GREEN}${BOLD}All validation checks passed.${NC}"
  echo ""
  echo "  Next steps:"
  echo "    - Run integration tests (optional, costs ~\$0.064 total):"
  echo "      bash $SCRIPT_DIR/test-migration/test-messaging.sh --confirm"
  echo "      bash $SCRIPT_DIR/test-migration/test-voice.sh --confirm"
  echo "      bash $SCRIPT_DIR/test-migration/test-verify.sh --confirm"
  echo "    - Or proceed to Phase 6 (Cleanup & Handoff)"
  exit 0
else
  echo -e "  ${RED}${BOLD}Validation failed.${NC} Fix the failing checks and re-run:"
  echo "    bash $SCRIPT_DIR/run-validation.sh $PROJECT_ROOT"
  echo ""
  echo "  Do NOT proceed to Phase 6 until all checks pass."
  exit 1
fi
