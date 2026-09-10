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
STATE_FILE=""
SCAN_JSON=""

# A `for arg in "$@"` loop cannot `shift`, so a flag that takes a VALUE
# could not consume it - the value fell through to the positional branch
# and was rejected as an extra argument. Parse with while/shift instead.
while [ $# -gt 0 ]; do
  arg="$1"
  case "$arg" in
    --include-texml) INCLUDE_TEXML=true ;;
    # Phase 5 must run its children with the SAME context the operator gave it.
    # Rejecting these flags and forwarding neither meant run-validation.sh
    # contradicted the very scripts it wraps: a hybrid deployment validated
    # clean directly but FAILED through the pipeline, and vice versa.
    --state-file)
      if [ -z "${2:-}" ]; then echo "Error: --state-file requires a value" >&2; exit 2; fi
      STATE_FILE="$2"; shift ;;
    --scan-json)
      if [ -z "${2:-}" ]; then echo "Error: --scan-json requires a value" >&2; exit 2; fi
      SCAN_JSON="$2"; shift ;;
    --json) JSON_MODE=true ;;
    --help|-h)
      echo "Usage: bash run-validation.sh <project-root> [--include-texml] [--json] [--state-file <path>] [--scan-json <path>]"
      echo ""
      echo "Runs the full Phase 5 validation pipeline:"
      echo "  1. Migration validation (residual Twilio patterns)"
      echo "  2. TeXML validation (if --include-texml)"
      echo "  3. Smoke test (API key, balance, SDK, numbers)"
      echo ""
      echo "Exit code 0 = all checks passed."
      exit 0
      ;;
    -*)
      echo "Error: Unknown option '$arg'" >&2
      exit 2
      ;;
    *)
      if [ -z "$PROJECT_ROOT" ]; then
        PROJECT_ROOT="$arg"
      else
        echo "Error: Unexpected extra argument '$arg'" >&2
        exit 2
      fi
      ;;
  esac
  shift
done

if [ -z "$PROJECT_ROOT" ]; then
  echo "Usage: bash run-validation.sh <project-root> [--include-texml] [--json] [--state-file <path>] [--scan-json <path>]" >&2
  exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
  echo -e "${RED}ERROR${NC}  Project root does not exist: $PROJECT_ROOT" >&2
  exit 2
fi

# The migration workflow writes its hybrid decisions here. Requiring every
# prescribed validation command to repeat --state-file made the default Phase 5
# path contradict the recorded plan.
if [ -z "$STATE_FILE" ] && [ -f "$PROJECT_ROOT/migration-state.json" ]; then
  STATE_FILE="$PROJECT_ROOT/migration-state.json"
fi
if [ -z "$SCAN_JSON" ] && [ -f "$PROJECT_ROOT/twilio-scan.json" ]; then
  SCAN_JSON="$PROJECT_ROOT/twilio-scan.json"
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
[ -n "$STATE_FILE" ] && VALIDATE_ARGS+=("--state-file" "$STATE_FILE")
[ -n "$SCAN_JSON" ] && VALIDATE_ARGS+=("--scan-json" "$SCAN_JSON")
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

# --- Step 5.1b: Telnyx Correctness Linter ---
# This integration belongs with the source-aware analyzer. Without it the full
# Phase 5 wrapper can certify a required sender that lacks
# messaging_profile_id even though the standalone linter would block it.
echo -e "${BOLD}Step 5.1b: Telnyx Correctness${NC}"
echo "────────────────────────────────"

CORRECTNESS_ARGS=("$PROJECT_ROOT")
# Keep the correctness linter in the same hybrid scope as migration
# validation. An external state file is not discoverable from PROJECT_ROOT.
[ -n "$STATE_FILE" ] && CORRECTNESS_ARGS+=("--state-file" "$STATE_FILE")
# Discovery records whether the original app intentionally omitted webhook
# validation. Preserve that context so the wrapper and standalone linter reach
# the same verdict instead of upgrading an intentional warning to an issue.
[ -n "$SCAN_JSON" ] && CORRECTNESS_ARGS+=("--scan-json" "$SCAN_JSON")
bash "$SCRIPT_DIR/lint-telnyx-correctness.sh" "${CORRECTNESS_ARGS[@]}"
CORRECTNESS_EXIT=$?
if [ "$CORRECTNESS_EXIT" -eq 0 ]; then
  echo ""
  echo -e "  ${GREEN}PASS${NC}  Correctness checks passed"
  RESULTS="${RESULTS}correctness:pass,"
else
  echo ""
  echo -e "  ${RED}FAIL${NC}  Correctness checks failed (exit code: $CORRECTNESS_EXIT)"
  OVERALL_PASS=false
  RESULTS="${RESULTS}correctness:fail,"
fi

echo ""

# --- Step 5.2: TeXML Validation (optional) ---
if [ "$INCLUDE_TEXML" = true ]; then
  echo -e "${BOLD}Step 5.2: TeXML Validation${NC}"
  echo "────────────────────────────"

  if ! command -v python3 >/dev/null 2>&1; then
    echo -e "  ${RED}FAIL${NC}  python3 is required for TeXML discovery and validation"
    OVERALL_PASS=false
    RESULTS="${RESULTS}texml:fail,"
    TEXML_PREREQUISITES_OK=false
  else
    TEXML_PREREQUISITES_OK=true
  fi

  # Same generated-output policy as every other tool in the pipeline
  # (EXCLUDE_DIRS in validate-migration.sh / scan-twilio-usage.sh). Excluding
  # only node_modules/.git meant step 5.1 ignored dist/ while this step
  # failed the run on a stale bundle inside it - one run contradicting
  # itself on the same tree.
  TEXML_FILES=()
  TEXML_INVALID_ROOTS=()
  TEXML_DISCOVERY_ERRORS=()
  if [ "$TEXML_PREREQUISITES_OK" = true ]; then
    while IFS= read -r -d '' file; do
    # Only TeXML documents belong in validate-texml.sh. Every *.xml went in
    # before, so a Maven pom.xml or Android layout was "validated" as TeXML
    # and blocked a fully migrated project. TeXML's root element is
    # <Response>; anything else is not ours to judge.
    # A TeXML document's root element is <Response>. Ask the XML parser for
    # the first start element instead of trying to strip declarations, DTDs,
    # and comments with regular expressions. Internal DTD subsets may contain
    # element-looking entity values, and a regex can mistake those for the
    # document root. validate-texml.sh already requires python3, so relying on
    # ElementTree here adds no dependency.
    if ! probe=$(python3 - "$file" <<'PYEOF' 2>/dev/null
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

path = pathlib.Path(sys.argv[1])
source = path.read_text(encoding="utf-8", errors="replace")
texml_intent = bool(re.search(
    r"<\s*/?\s*(?:Resp[a-zA-Z]*|Say|Play|Gather|Dial|Record|Hangup|Pause|"
    r"Redirect|Reject|Refer|Enqueue|Leave|Start|Stop|Connect|Pay|"
    r"HttpRequest|AIGather)\b",
    source,
    re.IGNORECASE,
))
try:
    element = ET.parse(path).getroot()
except (ET.ParseError, OSError):
    print(f"\t{int(texml_intent)}\t0")
    sys.exit(0)

tag = element.tag if isinstance(element.tag, str) else ""
root = tag.rsplit("}", 1)[-1].split(":", 1)[-1]
print(f"{root}\t{int(texml_intent)}\t1")
PYEOF
); then
      TEXML_DISCOVERY_ERRORS+=("$file")
      continue
    fi
    root=${probe%%$'\t'*}
    _probe_rest=${probe#*$'\t'}
    texml_intent=${_probe_rest%%$'\t'*}
    xml_parsed=${_probe_rest#*$'\t'}
    # A namespace-prefixed root is still an intended TeXML document. The
    # parser reports its local name as Response; validate-texml.sh then rejects
    # the unsupported namespace instead of letting discovery skip the file.
    if [ "$root" = "Response" ]; then
      TEXML_FILES+=("$file")
    else
      # A DEDICATED .twiml/.texml extension declares the file's intent: it is
      # meant to be a TeXML document, so a root that is not <Response> is a
      # BROKEN document, not someone else's XML. Skipping it silently meant a
      # misspelled or unconverted root (<Respones>, or a left-behind TwiML
      # wrapper) was never validated and the migration certified clean.
      # A generic .xml stays exempt - a pom.xml or an Android layout genuinely
      # is not ours to judge.
      # ${var,,} is a bash 4 substitution. macOS ships bash 3.2, where it is a
      # SYNTAX ERROR - the whole branch aborted, no invalid root was ever
      # recorded, and the run still ended "All validation checks passed" with
      # exit 0. Use tr, which is portable, so the gate works on a stock Mac.
      _lower=$(printf '%s' "$file" | tr '[:upper:]' '[:lower:]')
      case "$_lower" in
        *.twiml|*.texml) TEXML_INVALID_ROOTS+=("$file:${root:-<no element>}") ;;
        *.xml)
          # A well-formed document with another root belongs to another XML
          # vocabulary even if a comment or nested element happens to use a
          # TeXML verb name. The intent probe is only a recovery heuristic for
          # malformed generic XML, where there is no trustworthy root.
          if [ "$xml_parsed" != "1" ] && [ "$texml_intent" = "1" ]; then
            TEXML_INVALID_ROOTS+=("$file:${root:-<no element>}")
          elif [ "$xml_parsed" = "1" ]; then
            case "$root" in
              Resp*|resp*|TwiML|Twiml|twiml|TeXML|Texml|texml)
                TEXML_INVALID_ROOTS+=("$file:${root:-<no element>}") ;;
            esac
          fi
          ;;
      esac
    fi
    done < <(find "$PROJECT_ROOT" \
      \( -name node_modules -o -name .git -o -name vendor -o -name __pycache__ \
         -o -name venv -o -name .venv -o -name dist -o -name build \
         -o -name .next -o -name .nuxt -o -name coverage -o -name .tox \) -prune \
      -o \( -iname "*.xml" -o -iname "*.twiml" -o -iname "*.texml" \) -print0 2>/dev/null)
  fi

  # Reported BEFORE the "no documents found" branch: a tree whose only TeXML
  # files all have broken roots would otherwise print "none found - skipping"
  # and pass, which is the silent certification this check exists to prevent.
  if [ "$TEXML_PREREQUISITES_OK" != true ]; then
    : # Failure and result were recorded before discovery.
  elif [ ${#TEXML_DISCOVERY_ERRORS[@]} -gt 0 ]; then
    for file in "${TEXML_DISCOVERY_ERRORS[@]}"; do
      echo -e "  ${RED}FAIL${NC}  $(basename "$file") — could not read or inspect XML during TeXML discovery"
    done
    OVERALL_PASS=false
    RESULTS="${RESULTS}texml:fail,"
  elif [ ${#TEXML_INVALID_ROOTS[@]} -gt 0 ]; then
    for entry in "${TEXML_INVALID_ROOTS[@]}"; do
      echo -e "  ${RED}FAIL${NC}  $(basename "${entry%:*}") — root element is <${entry##*:}>, expected <Response>"
    done
    # OVERALL_PASS must flip too. Printing FAIL and recording texml:fail without
    # it meant the run still ended "All validation checks passed" and exited 0 -
    # reintroducing, one branch over, exactly the silent certification this
    # check was added to prevent.
    OVERALL_PASS=false
    RESULTS="${RESULTS}texml:fail,"
  elif [ ${#TEXML_FILES[@]} -eq 0 ]; then
    echo -e "  ${BLUE}INFO${NC}  No TeXML documents found — skipping TeXML validation"
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
