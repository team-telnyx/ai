#!/usr/bin/env bash
#
# lint-telnyx-correctness.sh — Check migrated code for known Telnyx anti-patterns
#
# Unlike validate-migration.sh (which checks "is Twilio code gone?"), this linter
# checks "is the Telnyx code correct?" — catching common mistakes agents make when
# translating Twilio patterns to Telnyx.
#
# Usage:
#   bash lint-telnyx-correctness.sh <project-root> [--product <name>] [--json]
#                                   [--state-file <path>] [--scan-json <path>]
#
# Options:
#   <project-root>       Path to the project to lint (required)
#   --product <name>     Only check patterns for a specific product
#   --json               Output results as machine-readable JSON
#   --state-file <path>  Path to migration-state.json for hybrid context
#   --scan-json <path>   Path to twilio-scan.json for context-aware checks
#
# Exit codes:
#   0 — No issues found
#   1 — Issues found (details in output)
#   2 — Usage error

set -euo pipefail

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

ISSUE_COUNT=0
WARN_COUNT=0
PASS_COUNT=0
JSON_MODE=false
PRODUCT_FILTER="all"
PROJECT_ROOT=""
SCAN_JSON=""
STATE_FILE=""
HYBRID_PRODUCTS=""
MIGRATED_FILES_JSON="[]"
JSON_CHECKS="[]"

EXCLUDE_DIRS="node_modules .git vendor __pycache__ venv .venv dist build .next .nuxt coverage .tox"
EXCLUDE_LOCK_FILES="--exclude=package-lock.json --exclude=yarn.lock --exclude=pnpm-lock.yaml --exclude=Gemfile.lock --exclude=Pipfile.lock --exclude=poetry.lock --exclude=go.sum"
EXCLUDE_SCAN_FILES="--exclude=twilio-scan.json --exclude=twilio-deep-scan.json --exclude=migration-state.json --exclude=MIGRATION-PLAN.md --exclude=MIGRATION-REPORT.md"

# --- Helpers ---

usage() {
  echo "Usage: $(basename "$0") <project-root> [--product <name>] [--json] [--state-file <path>] [--scan-json <path>]"
  echo ""
  echo "Checks migrated Telnyx code for known anti-patterns and common mistakes."
  echo ""
  echo "Products: voice, messaging, verify, webrtc"
  exit 2
}

build_exclude_args() {
  local args=""
  for d in $EXCLUDE_DIRS; do
    args="$args --exclude-dir=$d"
  done
  args="$args $EXCLUDE_LOCK_FILES"
  args="$args $EXCLUDE_SCAN_FILES"
  args="$args --exclude=*.md --exclude=*.min.js --exclude=*.min.css --exclude=*.bundle.js --exclude=*.chunk.js"
  echo "$args"
}

GREP_EXCLUDES=""

# Finding records are LF-delimited, so path identity uses a reversible display
# encoding. Escape backslashes first to distinguish a literal `\n` filename
# segment from an actual newline. The Python analyzer and grep adapter use this
# exact contract too.
escape_record_path() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//$'\r'/\\r}
  value=${value//$'\n'/\\n}
  printf '%s' "$value"
}

# Build every find(1) prune expression from the same policy as grep.  Keeping
# literal copies in each traversal caused generated directories to re-enter
# through the directory-name and shebang scans after source scanning excluded
# them.
FIND_EXCLUDE_EXPR=()
for excluded_dir in $EXCLUDE_DIRS; do
  if [ ${#FIND_EXCLUDE_EXPR[@]} -gt 0 ]; then
    FIND_EXCLUDE_EXPR+=(-o)
  fi
  FIND_EXCLUDE_EXPR+=(-name "$excluded_dir")
done


# grep --include globs are case-sensitive; SEND.JS is the same JavaScript as
# send.js. Rewrite '*.ext' into a character-class glob matching any casing.
ci_glob() {
  local glob="$1"
  case "$glob" in
    \*.*)
      local ext="${glob#\*.}" out="*." i c upper
      for ((i = 0; i < ${#ext}; i++)); do
        c="${ext:$i:1}"
        if [[ "$c" == [a-z] ]]; then
          upper=$(printf '%s' "$c" | tr '[:lower:]' '[:upper:]')
          out+="[${c}${upper}]"
        else
          out+="$c"
        fi
      done
      echo "$out"
      ;;
    *) echo "$glob" ;;
  esac
}

# grep returns 1 when it found no matches and >1 for an operational error.
# Static-analysis discovery may accept the former, but must never translate
# the latter into a clean migration result.
grep_allow_no_match() {
  local status
  set +e
  grep "$@"
  status=$?
  set -e
  if [ "$status" -gt 1 ]; then
    return "$status"
  fi
  return 0
}

# Extensionless executables with shebangs (package.json "bin" entry points,
# repo CLIs) are source files no --include glob can ever match; the Phase-1
# scanner greps without includes and sees them, so skipping them here made
# the validator certify trees the scanner had put in migration scope.
SHEBANG_FILES=()
SHEBANG_CATEGORIES=()

collect_shebang_files() {
  local _f _first _category
  while IFS= read -r -d '' _f; do
    _first=""
    IFS= read -r _first < "$_f" 2>/dev/null || [ -n "$_first" ] || _first=""
    case "$_first" in
      '#!'*node*)   _category="javascript" ;;
      '#!'*python*) _category="python" ;;
      '#!'*ruby*)   _category="ruby" ;;
      '#!'*sh*)     _category="shell" ;;
      *)            _category="" ;;
    esac
    if [ -n "$_category" ]; then
      # Bash variables cannot contain NUL, and LF-delimited path lists cannot
      # represent every legal pathname. Indexed arrays retain each `find
      # -print0` record as one argument all the way through grep.
      SHEBANG_FILES+=("$_f")
      SHEBANG_CATEGORIES+=("$_category")
    fi
  done < <(find "$PROJECT_ROOT" \
    \( "${FIND_EXCLUDE_EXPR[@]}" \) -prune \
    -o -type f ! -name '*.*' -size -1048576c -print0 2>/dev/null)
}

grep_shebang_files() {
  local pattern="$1"; shift
  local glob _index _f category seen_categories=""
  for glob in "$@"; do
    case "$glob" in
      '*.js'|'*.ts') category="javascript" ;;
      '*.py') category="python" ;;
      '*.rb') category="ruby" ;;
      '*.sh') category="shell" ;;
      *) category="" ;;
    esac
    [ -z "$category" ] && continue
    case " $seen_categories " in
      *" $category "*) continue ;;
    esac
    seen_categories="$seen_categories $category"
    for _index in "${!SHEBANG_FILES[@]}"; do
      [ "${SHEBANG_CATEGORIES[$_index]}" = "$category" ] || continue
      _f=${SHEBANG_FILES[$_index]}
      grep_allow_no_match -a -nH --null -E "$pattern" "$_f"
    done
  done
}

# A caller asking for "*.js" means "JavaScript", not "files whose name ends in
# .js". Node resolves .cjs/.mjs, bundlers resolve .jsx/.tsx/.mts/.cts, and
# component frameworks embed JavaScript in .vue/.svelte/.astro files. A check
# that only globs the bare extension silently passes projects using them.
# Expanding here fixes every call site at once; per-call glob lists drift apart
# as checks are added.
expand_source_globs() {
  local glob
  for glob in "$@"; do
    case "$glob" in
      '*.js') echo '*.js' '*.jsx' '*.cjs' '*.mjs' '*.vue' '*.svelte' '*.astro' '*.ejs' ;;
      '*.ts') echo '*.ts' '*.tsx' '*.mts' '*.cts' ;;
      '*.py') echo '*.py' '*.pyw' ;;
      '*.rb') echo '*.rb' '*.rake' 'Rakefile' 'rakefile' '*.erb' ;;
      '*.php') echo '*.php' '*.phtml' ;;
      '*.java') echo '*.java' '*.kt' '*.kts' '*.scala' '*.jsp' ;;
      '*.cs') echo '*.cs' '*.cshtml' '*.razor' ;;
      *) echo "$glob" ;;
    esac
  done
}

# Filter grep hits through the same lexer used by the messaging-profile
# analyzer.  Line-prefix filters cannot distinguish a trailing dead comment
# from live code, and syntax checks must not treat a quoted migration note as
# an executable builder call.  `comments` preserves string literals (needed
# for imports, URLs, and configuration); `code` masks both comments and
# strings (needed for identifiers such as VoiceResponse()).
filter_source_matches() {
  local mode="$1"
  local pattern="$2"
  local scripts_dir
  scripts_dir=$(cd "$(dirname "$0")" && pwd)
  python3 -B "$scripts_dir/filter-source-matches.py" \
    --mode "$mode" --pattern "$pattern" \
    --analyzer "$scripts_dir/lint-required-messaging-profile.py"
}

filter_backend_matches() {
  local pattern="$1"
  local scripts_dir
  scripts_dir=$(cd "$(dirname "$0")" && pwd)
  python3 -B "$scripts_dir/filter-source-matches.py" \
    --mode comments --region backend --pattern "$pattern" \
    --exclude-suffix .vue --exclude-suffix .svelte --exclude-suffix .astro \
    --analyzer "$scripts_dir/lint-required-messaging-profile.py"
}

search_live_files() {
  local mode="$1"
  local pattern="$2"
  shift 2
  search_raw_files "$pattern" "$@" | filter_source_matches "$mode" "$pattern"
}

search_files() {
  local pattern="$1"
  shift
  # All source searches share the executable-region/comment contract. This
  # keeps component markup and server-template prose out of semantic checks;
  # callers needing identifiers with strings masked use search_live_files code.
  search_raw_files "$pattern" "$@" | filter_source_matches comments "$pattern"
}

search_raw_files() {
  local pattern="$1"
  shift
  local include_args=""
  local glob
  # shellcheck disable=SC2046
  # `for glob in $(...)` lets the shell PATHNAME-EXPAND each glob against the
  # CALLER'S cwd: if a matching file happens to exist there the glob collapses
  # to that basename, silently restricting grep to it; if none matches the glob
  # survives. Either way whole languages could stop being scanned. set -f keeps
  # the patterns literal.
  set -f
  for glob in $(expand_source_globs "$@"); do
    include_args="$include_args --include=$(ci_glob "$glob")"
  done
  # shellcheck disable=SC2086
  set +f
  grep_allow_no_match -a -rnH --null $include_args $GREP_EXCLUDES -E "$pattern" "$PROJECT_ROOT"
  grep_shebang_files "$pattern" "$@"
}

count_matches() {
  local matches="$1"
  if [ -z "$matches" ]; then
    echo "0"
    return
  fi
  echo "$matches" | grep -c . 2>/dev/null
}

matches_to_json() {
  local matches="$1"
  local files_json
  files_json=$(echo "$matches" | head -20 | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null)
  echo "{\"files\": $files_json}"
}

lint_issue() {
  local name="$1"
  local msg="$2"
  local fix="$3"
  local details="${4:-}"
  ISSUE_COUNT=$((ISSUE_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    if [ -n "$details" ]; then
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "issue" --arg f "$fix" --argjson d "$details" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": $d}]')
    else
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "issue" --arg f "$fix" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": null}]')
    fi
  else
    echo -e "  ${RED}ISSUE${NC}  $msg"
    echo -e "         ${BLUE}FIX${NC}:  $fix"
    if [ -n "$details" ]; then
      echo "$details" | jq -r '.files[]' 2>/dev/null | while read -r f; do
        echo -e "         - $f"
      done
    fi
  fi
}

lint_warn() {
  local name="$1"
  local msg="$2"
  local fix="$3"
  local details="${4:-}"
  WARN_COUNT=$((WARN_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    if [ -n "$details" ]; then
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "warn" --arg f "$fix" --argjson d "$details" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": $d}]')
    else
      JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "warn" --arg f "$fix" \
        '. + [{"name": $n, "status": $s, "fix": $f, "details": null}]')
    fi
  else
    echo -e "  ${YELLOW}WARN${NC}   $msg"
    echo -e "         ${BLUE}FIX${NC}:  $fix"
    if [ -n "$details" ]; then
      echo "$details" | jq -r '.files[]' 2>/dev/null | while read -r f; do
        echo -e "         - $f"
      done
    fi
  fi
}

lint_pass() {
  local name="$1"
  local msg="$2"
  PASS_COUNT=$((PASS_COUNT + 1))
  if [ "$JSON_MODE" = true ]; then
    JSON_CHECKS=$(echo "$JSON_CHECKS" | jq --arg n "$name" --arg s "pass" \
      '. + [{"name": $n, "status": $s}]')
  else
    echo -e "  ${GREEN}PASS${NC}   $msg"
  fi
}

product_applies() {
  local check_products="$1"
  if [ "$check_products" != "all" ] && [ -n "$HYBRID_PRODUCTS" ]; then
    local candidate
    for candidate in $(echo "$check_products" | tr ',' ' '); do
      if echo "$HYBRID_PRODUCTS" | tr ',' '\n' | grep -qx "$candidate"; then
        return 1
      fi
    done
  fi
  if [ "$PRODUCT_FILTER" = "all" ] || [ "$check_products" = "all" ]; then
    return 0
  fi
  echo "$check_products" | tr ',' '\n' | grep -qx "$PRODUCT_FILTER"
}

hybrid_waiver_applies() {
  [ -n "$HYBRID_PRODUCTS" ] || return 1
  # The prescribed Phase-5 command is an all-products scan. In a recorded
  # hybrid migration, generic Twilio imports and directory names cannot be
  # attributed to one product by grep alone, so keep them visible as warnings
  # rather than making a legitimate retained product fail the required gate.
  if [ "$PRODUCT_FILTER" = "all" ]; then
    # A retained product never waives a residual inside a file explicitly
    # recorded as migrated. Only downgrade when every matched path is outside
    # that set; mixed or migrated-only results must keep the gate blocking.
    [ "$MIGRATED_FILES_JSON" != "[]" ] || return 0
    while IFS= read -r match; do
      [ -n "$match" ] || continue
      while IFS= read -r -d '' migrated_file; do
        [ -n "$migrated_file" ] || continue
        migrated_path=$(escape_record_path "$PROJECT_ROOT/$migrated_file")
        # Filtered grep output is `<absolute path>:<line>:<text>`. Do not
        # recover the path with a colon regex: POSIX paths may themselves
        # contain `:<digits>:`. Instead compare each complete, known migrated
        # path and then validate only its numeric locator suffix.
        remainder=${match#"$migrated_path:"}
        if [ "$remainder" != "$match" ] && [[ "$remainder" =~ ^[0-9]+: ]]; then
          return 1
        fi
        # A directory finding covers every file below it. Do not waive a
        # Twilio-named directory when any explicitly migrated file lives in
        # that directory, even though the grep finding names only the parent.
        if [ "$migrated_path" = "$match" ] || [[ "$migrated_path" = "$match"/* ]]; then
          return 1
        fi
      done < <(printf '%s' "$MIGRATED_FILES_JSON" | jq -j '.[] | ., "\u0000"')
    done <<<"${1:-}"
    return 0
  fi
  echo "$HYBRID_PRODUCTS" | tr ',' '\n' | grep -qx "$PRODUCT_FILTER"
}

section_header() {
  if [ "$JSON_MODE" = false ]; then
    echo ""
    echo -e "${BOLD}$1${NC}"
  fi
}

# --- Argument parsing ---
if [ $# -lt 1 ]; then
  usage
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --product)
      if [ $# -lt 2 ]; then echo "Error: --product requires a value" >&2; usage; fi
      PRODUCT_FILTER="$2"
      # An unvalidated value silently matches no check_products list, so a typo
      # skips every product-scoped check and still exits 0 — a silent pass.
      # Same accepted set as validate-migration.sh.
      case "$PRODUCT_FILTER" in
        all|voice|messaging|verify|webrtc|sip|fax|video|iot|lookup|numbers|phone-numbers|porting) ;;
        *)
          echo "Error: Unknown product '$PRODUCT_FILTER'" >&2
          echo "Valid products: all, voice, messaging, verify, webrtc, sip, fax, video, iot, lookup, numbers, phone-numbers, porting" >&2
          exit 2
          ;;
      esac
      shift 2
      ;;
    --json)
      JSON_MODE=true
      shift
      ;;
    --scan-json)
      if [ $# -lt 2 ]; then echo "Error: --scan-json requires a value" >&2; usage; fi
      SCAN_JSON="$2"
      shift 2
      ;;
    --state-file)
      if [ $# -lt 2 ]; then echo "Error: --state-file requires a value" >&2; usage; fi
      STATE_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Error: Unknown option '$1'" >&2
      usage
      ;;
    *)
      if [ -z "$PROJECT_ROOT" ]; then
        PROJECT_ROOT="$1"
      else
        echo "Error: Unexpected argument '$1'" >&2
        usage
      fi
      shift
      ;;
  esac
done

if [ -z "$PROJECT_ROOT" ]; then
  echo "Error: <project-root> is required" >&2
  usage
fi

if [ "$JSON_MODE" = true ] && ! command -v jq >/dev/null 2>&1; then
  echo "Error: --json requires jq" >&2
  exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: '$PROJECT_ROOT' is not a directory" >&2
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1 || ! python3 -c \
  'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' \
  >/dev/null 2>&1; then
  echo "Error: python3 is required for correctness analysis; Python 3.10+ is required for correctness analysis" >&2
  exit 2
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
GREP_EXCLUDES=$(build_exclude_args)
collect_shebang_files

if [ -z "$STATE_FILE" ] && [ -f "$PROJECT_ROOT/migration-state.json" ]; then
  STATE_FILE="$PROJECT_ROOT/migration-state.json"
fi

if [ -n "$STATE_FILE" ]; then
  if [ ! -f "$STATE_FILE" ]; then
    echo "Warning: --state-file '$STATE_FILE' not found, ignoring" >&2
  elif ! command -v jq >/dev/null 2>&1; then
    echo "Error: --state-file requires jq" >&2
    exit 2
  else
    HYBRID_PRODUCTS=$(jq -r '
      if type == "object" and ((.kept_on_twilio? // {}) | type == "object")
      then (.kept_on_twilio // {} | to_entries | map(select(.value) | .key | ascii_downcase) | join(","))
      else error("invalid migration state") end
    ' "$STATE_FILE" 2>/dev/null) || {
      echo "Error: --state-file '$STATE_FILE' is not valid migration state JSON" >&2
      exit 2
    }
    MIGRATED_FILES_JSON=$(jq -c --arg root "$PROJECT_ROOT/" '
      [(.migrated_files? // {}) | .. | arrays | .[]?
       | select(type == "string")
       | if startswith($root) then .[($root | length):]
         elif startswith("./") then .[2:]
         else . end]
      | unique
    ' "$STATE_FILE" 2>/dev/null) || {
      echo "Error: --state-file '$STATE_FILE' has invalid migrated_files" >&2
      exit 2
    }
  fi
fi
# Load scan context if provided (for context-aware checks like webhook validation)
ORIGINAL_HAD_WEBHOOK_VALIDATION="unknown"
SCAN_PRODUCTS=""
if [ -n "$SCAN_JSON" ] && [ -f "$SCAN_JSON" ] && command -v jq >/dev/null 2>&1; then
  ORIGINAL_HAD_WEBHOOK_VALIDATION=$(jq -r 'if (.summary.has_webhook_validation != null) then .summary.has_webhook_validation elif (.has_webhook_validation != null) then .has_webhook_validation else "unknown" end' "$SCAN_JSON" 2>/dev/null || echo "unknown")
  SCAN_PRODUCTS=$(jq -r '.products_used // [] | map(ascii_downcase) | join(",")' "$SCAN_JSON" 2>/dev/null || true)
fi

# Helper: returns 0 if a product was detected in the scan (or if no scan data)
scan_has_product() {
  local product="$1"
  if [ -z "$SCAN_PRODUCTS" ]; then
    return 0  # no scan data — be conservative, run the check
  fi
  echo "$SCAN_PRODUCTS" | tr ',' '\n' | grep -qx "$product"
}

# --- Header ---
if [ "$JSON_MODE" = false ]; then
  echo -e "${BOLD}Telnyx Correctness Linter${NC}"
  printf '%.0s═' {1..24}
  echo ""
  echo ""
  echo "Project: $PROJECT_ROOT"
  echo "Product: $PRODUCT_FILTER"
fi

# ============================================================
# MESSAGING ANTI-PATTERNS
# ============================================================
if product_applies "messaging"; then
  section_header "Messaging Correctness"

  # Check 1: Twilio and Telnyx both expose messages.create() in some SDKs.
  # Classify the call by its request field: Twilio uses `body`, while Telnyx
  # uses `text`. Reuse the quote-aware source lexer so strings, comments, URLs,
  # nested objects, and adjacent calls cannot create false classifications.
  messaging_source_analyzer="$(cd "$(dirname "$0")" && pwd)/lint-required-messaging-profile.py"
  if ! command -v python3 >/dev/null 2>&1 || [ ! -f "$messaging_source_analyzer" ]; then
    echo "Error: messaging source analysis requires python3 and $messaging_source_analyzer" >&2
    exit 2
  fi
  if ! twilio_create_calls=$(python3 -B "$messaging_source_analyzer" --twilio-body-fields --kept-products "$HYBRID_PRODUCTS" "$PROJECT_ROOT"); then
    echo "Error: Twilio messages.create analysis failed" >&2
    exit 2
  fi
  count=$(count_matches "$twilio_create_calls")
  if [ "$count" -gt 0 ]; then
    lint_issue "twilio_messages_create" \
      "Twilio .messages.create() request using body found at $count call site(s)" \
      "Use telnyx.messages.send() (Python) or telnyx.messages.create() with the text parameter (JavaScript/Ruby)" \
      "$(matches_to_json "$twilio_create_calls")"
  else
    lint_pass "twilio_messages_create" "No Twilio .messages.create() request using body found"
  fi

  # Check 2: body= or body: in message send context — Telnyx uses 'text' not 'body'
  if ! matches=$(python3 -B "$messaging_source_analyzer" --message-body-fields --kept-products "$HYBRID_PRODUCTS" "$PROJECT_ROOT"); then
    echo "Error: messaging body-field analysis failed" >&2
    exit 2
  fi
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "body_not_text" \
      "Message send with 'body' parameter found at $count call site(s)" \
      "Telnyx uses 'text' not 'body' for message content" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "body_not_text" "No 'body' parameter in message send calls"
  fi

  # Check 3: number-pool and alphanumeric-sender sends require a Messaging
  # Profile ID. Normal phone-number sends may omit it when the sender already
  # belongs to the intended profile, which source inspection cannot infer.
  # Run the source analyzer unconditionally inside the messaging section.
  # The scanner and analyzer intentionally recognize different evidence; using
  # scanner attribution as a gate let newly-supported URL builders disappear
  # before the analyzer could evaluate them (a silent false pass).
  if ! required_profile_analysis=$(python3 -B "$messaging_source_analyzer" "$PROJECT_ROOT"); then
    echo "Error: required Messaging Profile analysis failed" >&2
    exit 2
  fi
  required_sender_count=$(printf '%s\n' "$required_profile_analysis" | sed -n '1p')
  case "$required_sender_count" in
    ''|*[!0-9]*)
      echo "Error: required Messaging Profile analysis returned an invalid count" >&2
      exit 2
      ;;
  esac
  missing_profile_calls=$(printf '%s\n' "$required_profile_analysis" | sed '1d; /^$/d')
  missing_profile_count=$(count_matches "$missing_profile_calls")

  if [ "$missing_profile_count" -gt 0 ]; then
    lint_issue "required_messaging_profile_id" \
      "Number-pool or dedicated alphanumeric-sender call sites found without a messaging_profile_id ($missing_profile_count)" \
      "Include messaging_profile_id for every number-pool or alphanumeric-sender send. Phone-number sends may omit it when from already resolves to the intended Messaging Profile." \
      "$(matches_to_json "$missing_profile_calls")"
  elif [ "$required_sender_count" -gt 0 ]; then
    lint_pass "required_messaging_profile_id" "Every detected required-profile messaging call has a messaging_profile_id"
  else
    lint_pass "required_messaging_profile_id" "No dedicated number-pool or alphanumeric-sender call sites detected"
  fi

  # Check 4: MessagingResponse builder class (doesn't exist in Telnyx)
  matches=$(search_live_files code 'MessagingResponse\(' "*.py" "*.js" "*.ts" "*.rb")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "messaging_response_builder" \
      "Twilio MessagingResponse() builder found in $count file(s)" \
      "Telnyx has no MessagingResponse builder — return JSON or use the SDK to send replies" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "messaging_response_builder" "No Twilio MessagingResponse builder found"
  fi
fi

# ============================================================
# VOICE ANTI-PATTERNS
# ============================================================
if product_applies "voice"; then
  section_header "Voice Correctness"

  # Check 5: VoiceResponse builder (Twilio TwiML — doesn't exist in Telnyx SDK)
  matches=$(search_live_files code 'VoiceResponse\(' "*.py" "*.js" "*.ts" "*.rb" "*.java" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "voice_response_builder" \
      "Twilio VoiceResponse() builder found in $count file(s)" \
      "Telnyx uses TeXML (return XML directly) or Call Control API — no VoiceResponse builder class" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "voice_response_builder" "No Twilio VoiceResponse builder found"
  fi

  # Check 6: speechModel must be translated on Gather/Transcription, but it is
  # a documented attribute on a Language child of ConversationRelay. Inspect
  # tag ancestry instead of rejecting every textual occurrence.
  speech_source_analyzer="$(cd "$(dirname "$0")" && pwd)/lint-required-messaging-profile.py"
  matches=$(python3 -B - "$PROJECT_ROOT" "$speech_source_analyzer" "$EXCLUDE_DIRS" <<'PYEOF'
import importlib.util
import os
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
analyzer_path = Path(sys.argv[2])
spec = importlib.util.spec_from_file_location("telnyx_source_lexer", analyzer_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load {analyzer_path}")
analyzer = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = analyzer
spec.loader.exec_module(analyzer)
excluded_dirs = set(sys.argv[3].split())
excluded_files = {
    "MIGRATION-PLAN.md", "MIGRATION-REPORT.md", "migration-state.json",
    "twilio-deep-scan.json", "twilio-scan.json",
}
suffixes = {
    ".astro", ".bash", ".cjs", ".cs", ".cshtml", ".razor", ".dart", ".ejs", ".erb",
    ".ksh", ".zsh", ".go", ".handlebars", ".hbs", ".java", ".jinja",
    ".jinja2", ".cts", ".j2", ".js", ".jsp", ".jsx", ".kt", ".kts",
    ".mjs", ".mts", ".mustache", ".php", ".phtml", ".py", ".pyw",
    ".rb", ".rake", ".scala", ".sh", ".svelte", ".swift", ".texml",
    ".tmpl", ".ts", ".tsx", ".twiml", ".twig", ".vue", ".xml",
}
tag_pattern = re.compile(
    r"<(?P<closing>/)?\s*(?P<tag>[A-Za-z_][\w:.-]*)"
    r"(?P<attrs>(?:\"[^\"]*\"|'[^']*'|[^>])*)>",
    re.DOTALL,
)
speech_model = re.compile(r"(?<![\w:.-])speechModel\s*(?:=|:)")

for directory, child_dirs, filenames in os.walk(root):
    child_dirs[:] = sorted(name for name in child_dirs if name not in excluded_dirs)
    for filename in sorted(filenames):
        path = Path(directory, filename)
        if filename in excluded_files or path.suffix.lower() not in suffixes:
            continue
        source = path.read_text(encoding="utf-8", errors="replace")
        executable = analyzer.executable_source(path, source)
        masked_executable = analyzer.lex_source(
            executable, analyzer.canonical_suffix(path)
        ).without_comments
        scan_source = "".join(
            masked if code != " " or raw in "\r\n" else raw
            for raw, code, masked in zip(source, executable, masked_executable)
        )
        scan_source = re.sub(
            r"<!--.*?-->|<!\[CDATA\[.*?\]\]>|"
            r"<%#.*?%>|<%--.*?--%>|"
            r"\{\{!--.*?--\}\}|\{\{!.*?\}\}|\{#.*?#\}",
            lambda match: "".join(
                char if char in "\r\n" else " " for char in match.group(0)
            ),
            scan_source,
            flags=re.DOTALL,
        )
        stack = []
        tagged_speech_model = set()
        for match in tag_pattern.finditer(scan_source):
            tag = match.group("tag").rsplit(":", 1)[-1]
            if match.group("closing"):
                if stack and stack[-1] == tag:
                    stack.pop()
                else:
                    stack.clear()
                continue
            attr_start = match.start("attrs")
            attr_occurrences = list(speech_model.finditer(match.group("attrs")))
            tagged_speech_model.update(
                attr_start + occurrence.start() for occurrence in attr_occurrences
            )
            if attr_occurrences and not (
                tag == "Language" and stack[-1:] == ["ConversationRelay"]
            ):
                line = scan_source.count("\n", 0, match.start()) + 1
                print(f"{path}:{line}: <{tag}> speechModel")
            if not match.group("attrs").rstrip().endswith("/"):
                stack.append(tag)
        for occurrence in speech_model.finditer(scan_source):
            if occurrence.start() in tagged_speech_model:
                continue
            line = scan_source.count("\n", 0, occurrence.start()) + 1
            print(f"{path}:{line}: non-XML speechModel")
PYEOF
)
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "speech_model_attr" \
      "speechModel requiring migration found in $count location(s)" \
      "Map Gather/Transcription speechModel to the documented TeXML model configuration; preserve ConversationRelay Language speechModel" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "speech_model_attr" "No speechModel attribute found"
  fi

  # Check 7: Recording URL stored without download logic (10-min expiry)
  # Skip if voice/recording not detected in scan
  if scan_has_product "voice"; then
    matches=$(search_files '(recording.*url|RecordingUrl|recording_url)' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java")
    count=$(count_matches "$matches")
    if [ "$count" -gt 0 ]; then
      lint_warn "recording_url_expiry" \
        "Recording URL references found in $count file(s)" \
        "Telnyx recording URLs expire after 10 minutes — download immediately upon receipt" \
        "$(matches_to_json "$matches")"
    else
      lint_pass "recording_url_expiry" "No recording URL references found"
    fi
  fi
fi

# ============================================================
# VERIFY ANTI-PATTERNS
# ============================================================
if product_applies "verify"; then
  section_header "Verify Correctness"

  # Check 8: status === 'approved' (Twilio) — Telnyx uses response_code === 'accepted'
  matches=$(search_files "(status.*[=!]=.*['\"]approved['\"]|['\"]approved['\"].*[=!]=.*status)" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
  count=$(count_matches "$matches")
  if [ "$count" -gt 0 ]; then
    lint_issue "verify_status_approved" \
      "Twilio Verify status === 'approved' pattern found in $count file(s)" \
      "Telnyx uses response_code === 'accepted' (not status === 'approved')" \
      "$(matches_to_json "$matches")"
  else
    lint_pass "verify_status_approved" "No Twilio Verify 'approved' status check found"
  fi

  # Check 9: verify_profile_id missing (skip if verify not detected in scan)
  if scan_has_product "verify"; then
    # "verification" alone matched WEBHOOK SIGNATURE verification - which every
    # correctly migrated app now has - so repos with no Verify product at all
    # were told to add a verify_profile_id. Match the Verify PRODUCT's own API
    # surface instead, and exclude the signature/webhook sense explicitly.
    telnyx_verify=$(search_files \
      '(telnyx.*\bverifications?\b|\bverifications?\b.*telnyx|verify_profile|/v2/verifications|verifications\.(create|by_phone_number)|\bVerifyProfile\b)' \
      "*.py" "*.js" "*.ts" "*.rb" "*.go" \
      | grep -v -iE '(webhook|signature|ed25519|unwrap|construct_event|verify_webhook|verification_key|public_key)' || true)
    verify_count=$(count_matches "$telnyx_verify")
    if [ "$verify_count" -gt 0 ]; then
      profile_refs=$(search_files 'verify_profile_id' "*.py" "*.js" "*.ts" "*.rb" "*.go")
      profile_count=$(count_matches "$profile_refs")
      if [ "$profile_count" -eq 0 ]; then
        lint_warn "missing_verify_profile_id" \
          "Telnyx verify calls found but no verify_profile_id reference" \
          "Include verify_profile_id in verification requests"
      else
        lint_pass "missing_verify_profile_id" "verify_profile_id referenced in code"
      fi
    fi
  fi
fi

# ============================================================
# HALLUCINATED TELNYX METHOD NAMES (all products)
# ============================================================
# Catches common agent hallucinations — methods that don't exist in the Telnyx
# SDKs but look plausible by analogy to Twilio, Stripe, or older Telnyx APIs.
# Keep entries high-confidence (zero false-positive risk).
if product_applies "all"; then
  section_header "Hallucinated Method Names"

  # Entries must be high-confidence: the pattern should be something a user is
  # extremely unlikely to write for a legitimate non-Telnyx reason. Plain
  # `messages.create(` is intentionally NOT here — it's already covered by the
  # Twilio-pattern check in the Messaging section above, and matching it at
  # file-scope here produces false positives against internal app code that
  # happens to have a `messages` service/model.
  HALLUCINATED_METHODS=(
    'verifications\.submitVerification'   # correct: verifications.byPhoneNumber.actions.verify
    'verifications\.checkVerification'    # correct: verifications.byPhoneNumber.actions.verify
    'new TelnyxWebhook\('                 # not a real class — use client.webhooks.unwrap()
    'telnyx\.Webhook\.construct'          # Stripe-style, not Telnyx — use client.webhooks.unwrap()
  )

  hallucinated_hits=0
  for pattern in "${HALLUCINATED_METHODS[@]}"; do
    matches=$(search_files "$pattern" "*.py" "*.js" "*.ts" "*.rb" "*.go")
    count=$(count_matches "$matches")
    if [ "$count" -gt 0 ]; then
      hallucinated_hits=$((hallucinated_hits + count))
      lint_issue "hallucinated_method" \
        "Non-existent Telnyx method pattern '$pattern' found in $count location(s)" \
        "Consult {baseDir}/sdk-reference/{language}/{product}.md for the correct method signature" \
        "$(matches_to_json "$matches")"
    fi
  done
  if [ "$hallucinated_hits" -eq 0 ]; then
    lint_pass "hallucinated_method" "No hallucinated Telnyx method names found"
  fi
fi

# ============================================================
# WEBHOOK SIGNATURE VALIDATION
# ============================================================
if product_applies "all"; then
  section_header "Webhook Signature Validation"

  # Check 12: Webhook handlers without Ed25519 signature verification
  # Vue/Svelte/Astro expressions are executable client code, but never server
  # route declarations. Exclude those component files from this backend-only
  # cross-file heuristic after applying the normal executable-source filter.
  webhook_pattern="(app\.(post|put)|router\.(post|put)|@app\.route|@csrf_exempt|http\.HandleFunc|post.*do)"
  webhook_handlers=$(search_raw_files "$webhook_pattern" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php" \
    | filter_backend_matches "$webhook_pattern")
  webhook_count=$(count_matches "$webhook_handlers")
  if [ "$webhook_count" -gt 0 ]; then
    ed25519_pattern="(telnyx-signature-ed25519|ed25519|verify_signature|verifySignature|construct_event|webhooks\.unwrap|TELNYX_PUBLIC_KEY)"
    ed25519_refs=$(search_raw_files "$ed25519_pattern" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php" \
      | filter_backend_matches "$ed25519_pattern")
    ed25519_count=$(count_matches "$ed25519_refs")
    webhook_parse_pattern="(data\.payload|data\[.payload.\]|data\.event_type|data\[.event_type.\])"
    telnyx_webhook_parse=$(search_raw_files "$webhook_parse_pattern" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php" \
      | filter_backend_matches "$webhook_parse_pattern")
    telnyx_parse_count=$(count_matches "$telnyx_webhook_parse")
    if [ "$telnyx_parse_count" -gt 0 ] && [ "$ed25519_count" -eq 0 ]; then
      lint_issue "webhook_ed25519_missing" \
        "Webhook handlers parse Telnyx payloads but no Ed25519 signature verification found" \
        "Add Ed25519 verification using telnyx-signature-ed25519 + telnyx-timestamp headers. See webhook-migration.md" \
        "$(matches_to_json "$telnyx_webhook_parse")"
    elif [ "$ed25519_count" -gt 0 ]; then
      lint_pass "webhook_ed25519_missing" "Ed25519 webhook signature verification found"
    fi
  fi

  # Check 13: twilio.webhook() middleware still present (must be replaced, not just removed)
  # Use specific Twilio patterns to avoid false positives from generic validateRequest functions
  twilio_webhook_mw=$(search_files "(twilio\.webhook\(|@validate_twilio_request|RequestValidator\(|twilio.*validateRequest|validateExpressRequest)" "*.py" "*.js" "*.ts" "*.rb")
  twilio_mw_count=$(count_matches "$twilio_webhook_mw")
  if [ "$twilio_mw_count" -gt 0 ]; then
    if hybrid_waiver_applies "$twilio_webhook_mw"; then
      lint_warn "twilio_webhook_middleware" \
        "Twilio webhook middleware/validator remains while selected products are intentionally hybrid" \
        "Confirm each validator belongs only to kept products: $HYBRID_PRODUCTS" \
        "$(matches_to_json "$twilio_webhook_mw")"
    else
      lint_issue "twilio_webhook_middleware" \
        "Twilio webhook middleware/validator still present in $twilio_mw_count file(s)" \
        "Remove if original had validate:false (it was a no-op). Replace with Ed25519 if original actually validated." \
        "$(matches_to_json "$twilio_webhook_mw")"
    fi
  else
    lint_pass "twilio_webhook_middleware" "No Twilio webhook middleware found"
  fi
fi

# ============================================================
# POLLY VOICE COMPATIBILITY
# ============================================================
if product_applies "voice"; then
  section_header "Polly Voice Compatibility"

  # Check 14: Named Polly voices are valid and must retain caller-facing audio.
  polly_refs=$(search_files "Polly\.[A-Z][a-z]+" "*.xml" "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
  polly_count=$(count_matches "$polly_refs")
  if [ "$polly_count" -gt 0 ]; then
    non_neural=$(echo "$polly_refs" | grep -v "\-Neural" || true)
    non_neural_count=$(count_matches "$non_neural")
    if [ "$non_neural_count" -gt 0 ]; then
      lint_pass "polly_non_neural" \
        "Documented non-Neural Polly voice references are preserved; do not replace them with man/woman"
    else
      lint_pass "polly_non_neural" "All Polly voices use Neural variants"
    fi
  else
    lint_pass "polly_non_neural" "No Polly voice references found"
  fi
fi

# ============================================================
# DOCUMENTATION FRESHNESS
# ============================================================
section_header "Documentation Updates"

# Check 15: README and docs still referencing Twilio
doc_files=""
while IFS= read -r -d '' doc_path; do
    # Prose EXPLAINING the migration is not residual Twilio. Two defects here:
    #  - 'formerly' did not cover 'the former Twilio Verify SID', so an
    #    operator's mapping note gated a correctly migrated repo with exit 1;
    #  - bare 'port' matched inside 'support', 'important' and 'export', which
    #    silently excluded real leftovers. Both are now word-anchored.
    # A HYBRID deployment also documents its remaining Twilio use on purpose -
    # the skill mandates recording it - so those lines are expected too.
    # Upstream repository ownership is historical provenance, not a runtime
    # dependency. Rewriting a TwilioDevEd badge/clone URL would create a dead
    # link while leaving the actual migration unchanged.
    # NOTE: no \b before 'behaviour change'. Markdown bold writes
    # __Behavior change from the Twilio integration__, and '_' is a WORD
    # character, so \bbehavior could never match after it - the same
    # word-boundary trap that made (?<![\w$]) never match $var in shell.
    doc_exclusions='(\bmigrat|\bported\b|\bporting\b|\bformer|\bpreviousl|\bwas twilio\b|from twilio to|\breplaces?\b|\bno longer\b|\binstead of\b|\bequivalent\b|behaviou?r change|\btwilio integration\b|\bcounterpart\b|\bunlike twilio\b|\bcompared (to|with)\b|\bhybrid\b|\bstill uses? twilio\b|\bno telnyx equivalent\b|github\.com[:/]twiliodeved/)'
    twilio_in_doc=$(grep -in "twilio" "$doc_path" 2>/dev/null | grep -v -iE "$doc_exclusions" || true)
    if [ -n "$twilio_in_doc" ]; then
      doc_files+="$doc_path"$'\n'
    fi
done < <(find "$PROJECT_ROOT" -maxdepth 1 -type f \
  \( -iname README -o -iname README.md -o -iname README.rst -o -iname CONTRIBUTING.md \) \
  -print0 2>/dev/null)
doc_files=$(echo "$doc_files" | sed '/^$/d')
doc_count=$(echo "$doc_files" | sed '/^$/d' | wc -l | tr -d ' ')
if [ "$doc_count" -gt 0 ]; then
  lint_issue "docs_still_twilio" \
    "Documentation files still reference Twilio (not migration-related references) in $doc_count file(s)" \
    "Update README/docs: replace Twilio service names, env vars, setup instructions, and URLs with Telnyx equivalents" \
    "$(echo "$doc_files" | sed '/^$/d' | head -10 | jq -R -s '{files: (split("\n") | map(select(length > 0)))}' 2>/dev/null || echo '{"files":[]}')"
else
  lint_pass "docs_still_twilio" "No Twilio references in documentation files (README, CONTRIBUTING)"
fi

# ============================================================
# RESIDUAL TWILIO CODE
# ============================================================
section_header "Residual Twilio Patterns"

# Check 10: Residual Twilio imports still present alongside Telnyx code
matches=$(search_live_files comments '(from twilio|import[ (=].*twilio|require.*twilio|using Twilio|import com\.twilio|use[[:space:]]+\\?Twilio|new[[:space:]]+\\?Twilio)' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php" "*.cs")
count=$(count_matches "$matches")
if [ "$count" -gt 0 ]; then
  if hybrid_waiver_applies "$matches"; then
    lint_warn "residual_twilio_imports" \
      "Residual Twilio imports found in $count file(s) while products remain intentionally hybrid" \
      "Confirm each import belongs only to kept products: $HYBRID_PRODUCTS" \
      "$(matches_to_json "$matches")"
  else
    lint_issue "residual_twilio_imports" \
      "Residual Twilio imports found in $count file(s)" \
      "Remove Twilio imports — migration should replace them with Telnyx equivalents" \
      "$(matches_to_json "$matches")"
  fi
else
  lint_pass "residual_twilio_imports" "No residual Twilio imports found"
fi

# Check 11: Twilio client instantiation patterns
matches=$(search_live_files code '(Client\(.*account_sid|Twilio\(|twilio\.Twilio\(|new Twilio\.)' "*.py" "*.js" "*.ts" "*.rb" "*.go" "*.java" "*.php")
count=$(count_matches "$matches")
if [ "$count" -gt 0 ]; then
  if hybrid_waiver_applies "$matches"; then
    lint_warn "twilio_client_instantiation" \
      "Twilio client instantiation found in $count file(s) while products remain intentionally hybrid" \
      "Confirm each client belongs only to kept products: $HYBRID_PRODUCTS" \
      "$(matches_to_json "$matches")"
  else
    lint_issue "twilio_client_instantiation" \
      "Twilio client instantiation found in $count file(s)" \
      "Replace with Telnyx client: from telnyx import Telnyx; client = Telnyx(api_key=...) (Python) or new Telnyx({ apiKey: ... }) (JS)" \
      "$(matches_to_json "$matches")"
  fi
else
  lint_pass "twilio_client_instantiation" "No Twilio client instantiation found"
fi

# Check 12: Directory/path names containing "twilio"
twilio_dirs=""
while IFS= read -r -d '' twilio_dir; do
  twilio_dirs+="$(escape_record_path "$twilio_dir")"$'\n'
done < <(find "$PROJECT_ROOT" -mindepth 1 \
  \( "${FIND_EXCLUDE_EXPR[@]}" \) -prune \
  -o -type d -iname '*twilio*' -print0 2>/dev/null || true)
twilio_dir_count=$(echo "$twilio_dirs" | sed '/^$/d' | wc -l | tr -d ' ')
if [ "$twilio_dir_count" -gt 0 ] && [ -n "$(echo "$twilio_dirs" | sed '/^$/d')" ]; then
  if hybrid_waiver_applies "$twilio_dirs"; then
    lint_warn "twilio_directory_names" \
      "Found $twilio_dir_count Twilio-named directory/directories while selected products are intentionally hybrid" \
      "Confirm each directory belongs only to kept products: $HYBRID_PRODUCTS" \
      "$(echo "$twilio_dirs" | sed '/^$/d' | head -10 | jq -R -s '{files: (split("\n") | map(select(length > 0)))}' 2>/dev/null || echo '{"files":[]}')"
  else
    lint_issue "twilio_directory_names" \
      "Found $twilio_dir_count directory name(s) containing 'twilio'" \
      "Rename directories: replace 'twilio' with 'telnyx' in directory names (e.g., feature/twilio/ → feature/telnyx/)" \
      "$(echo "$twilio_dirs" | sed '/^$/d' | head -10 | jq -R -s '{files: (split("\n") | map(select(length > 0)))}' 2>/dev/null || echo '{"files":[]}')"
  fi
else
  lint_pass "twilio_directory_names" "No directory names containing 'twilio'"
fi

# ============================================================
# OUTPUT
# ============================================================

if [ "$JSON_MODE" = true ]; then
  jq -n \
    --arg root "$PROJECT_ROOT" \
    --arg product "$PRODUCT_FILTER" \
    --argjson checks "$JSON_CHECKS" \
    --argjson issues "$ISSUE_COUNT" \
    --argjson warns "$WARN_COUNT" \
    --argjson passes "$PASS_COUNT" \
    '{
      project_root: $root,
      product_filter: $product,
      checks: $checks,
      summary: { issues: $issues, warnings: $warns, passes: $passes },
      result: (if $issues > 0 then "issues_found" else "clean" end)
    }'
else
  echo ""
  echo -e "─────────────────────────────────────"
  echo -e "${BOLD}Summary${NC}"
  echo -e "  ${GREEN}Pass${NC}:    $PASS_COUNT"
  echo -e "  ${RED}Issues${NC}:  $ISSUE_COUNT"
  echo -e "  ${YELLOW}Warns${NC}:   $WARN_COUNT"
  echo ""
  if [ "$ISSUE_COUNT" -gt 0 ]; then
    echo -e "${RED}${BOLD}ISSUES FOUND${NC} — $ISSUE_COUNT correctness issue(s) in migrated code"
    echo "  Fix these before proceeding. Consult sdk-reference/ for correct Telnyx patterns."
  else
    echo -e "${GREEN}${BOLD}CLEAN${NC} — no correctness issues detected"
  fi
fi

if [ "$ISSUE_COUNT" -gt 0 ]; then
  exit 1
else
  exit 0
fi
