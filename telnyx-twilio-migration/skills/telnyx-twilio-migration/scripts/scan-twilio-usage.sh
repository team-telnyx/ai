#!/usr/bin/env bash
# scan-twilio-usage.sh — Grep-based Twilio codebase scanner
# Outputs structured JSON describing Twilio SDK usage, products, env vars,
# config files, TwiML templates, webhook handlers, and API URLs.
#
# Usage: ./scan-twilio-usage.sh <project-root>

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

usage() {
  echo "Usage: $0 <project-root>" >&2
  exit 1
}

log() {
  echo "[scan] $*" >&2
}

# Escape a string for safe embedding inside a JSON string value.
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------

if [[ $# -lt 1 ]]; then
  usage
fi

PROJECT_ROOT="$1"

if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "Error: directory '$PROJECT_ROOT' does not exist." >&2
  exit 1
fi

# Resolve to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

# ---------------------------------------------------------------------------
# Exclude directories (passed to grep via --exclude-dir)
# ---------------------------------------------------------------------------

EXCLUDE_DIRS=(
  node_modules .git vendor __pycache__ venv .venv
  dist build .next .nuxt coverage .tox
)

EXCLUDE_ARGS=()
for d in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_ARGS+=(--exclude-dir="$d")
done
# Exclude minified/bundled files (can cause grep OOM and produce false positives)
EXCLUDE_ARGS+=(--exclude='*.min.js' --exclude='*.min.css' --exclude='*.bundle.js' --exclude='*.chunk.js')
# Exclude lock files (contain Twilio version strings but aren't source code)
EXCLUDE_ARGS+=(--exclude='package-lock.json' --exclude='yarn.lock' --exclude='pnpm-lock.yaml' --exclude='Gemfile.lock' --exclude='Pipfile.lock' --exclude='poetry.lock' --exclude='go.sum')

# ---------------------------------------------------------------------------
# State — associative arrays / arrays collected during the scan
# ---------------------------------------------------------------------------

declare -A LANG_SET          # languages_detected  (key=lang, value=1)
declare -A PRODUCT_SET       # products_used        (key=product, value=1)

# Per-file info stored as parallel indexed arrays
declare -a FILE_PATHS=()     # relative paths
declare -a FILE_LANGS=()     # language per file
declare -a FILE_PRODUCTS=()  # comma-separated products per file
declare -a FILE_PATTERNS=()  # comma-separated matched patterns per file

declare -a ENV_NAMES=()      # env var names
declare -a ENV_FILES=()      # comma-separated files per env var
declare -A ENV_MAP           # name -> comma-separated files

declare -a CFG_PATHS=()      # config file relative paths
declare -a CFG_TYPES=()      # config types (pip, npm, gem, ...)
declare -a CFG_LINES=()      # matching line content

declare -a TWIML_FILES=()    # TwiML template paths

declare -a WH_PATHS=()       # webhook handler file paths
declare -a WH_PATTERNS=()    # webhook matched pattern

declare -a API_URLS=()       # unique API URLs found
declare -a API_URL_FILES=()  # comma-separated files per URL
declare -A API_URL_MAP       # url -> comma-separated files

# ---------------------------------------------------------------------------
# Scanning helpers
# ---------------------------------------------------------------------------

# run_grep <label> <extra-grep-args...>
# Runs grep -rn inside PROJECT_ROOT with standard excludes and returns
# matching lines (path:lineno:content). Returns 0 even if nothing matched.
run_grep() {
  grep -rn "${EXCLUDE_ARGS[@]}" "$@" "$PROJECT_ROOT" 2>/dev/null || true
}

# Detect language from file extension
detect_language() {
  local f="$1"
  case "$f" in
    *.py)                     echo "python" ;;
    *.js|*.mjs|*.cjs)        echo "javascript" ;;
    *.ts|*.tsx)               echo "typescript" ;;
    *.go)                     echo "go" ;;
    *.rb)                     echo "ruby" ;;
    *.java)                   echo "java" ;;
    *.php)                    echo "php" ;;
    *.cs)                     echo "csharp" ;;
    *.sh|*.bash)              echo "shell" ;;
    *.xml)                    echo "xml" ;;
    *.json)                   echo "json" ;;
    *.yml|*.yaml)             echo "yaml" ;;
    *.env|*.env.*)            echo "env" ;;
    *.toml)                   echo "toml" ;;
    *.cfg)                    echo "config" ;;
    *.txt)                    echo "text" ;;
    *.gradle)                 echo "groovy" ;;
    *.csproj)                 echo "xml" ;;
    *)                        echo "unknown" ;;
  esac
}

# Map a matched pattern to zero or more products (space-separated)
pattern_to_products() {
  local pat="$1"
  local products=""
  # Voice
  if echo "$pat" | grep -qiE 'twiml|VoiceResponse|CallResource|voice'; then
    products="$products voice"
  fi
  # Messaging
  if echo "$pat" | grep -qiE 'Messages\.create|MessageResource|messaging'; then
    products="$products messaging"
  fi
  # Video
  if echo "$pat" | grep -qiE 'twilio-video|VideoGrant|Room'; then
    products="$products video"
  fi
  # Verify
  if echo "$pat" | grep -qiE 'twilio/rest/verify|VerificationResource|verify'; then
    products="$products verify"
  fi
  # Fax
  if echo "$pat" | grep -qiE 'twilio/rest/fax|FaxResource|fax'; then
    products="$products fax"
  fi
  # Lookup
  if echo "$pat" | grep -qiE 'twilio/rest/lookups|PhoneNumber|lookups'; then
    products="$products lookup"
  fi
  # TeXML (TwiML)
  if echo "$pat" | grep -qiE 'twilio/twiml|texml'; then
    products="$products texml"
  fi
  # Webhook validation
  if echo "$pat" | grep -qiE 'RequestValidator|validateRequest|X-Twilio-Signature'; then
    products="$products webhook-validation"
  fi
  # SIP trunking
  if echo "$pat" | grep -qiE 'trunking|TrunkingGrant|SipGrant'; then
    products="$products sip"
  fi
  # IoT / Wireless
  if echo "$pat" | grep -qiE 'wireless|supersim|SuperSim|SimResource|fleet\.create'; then
    products="$products iot"
  fi
  # Conversations
  if echo "$pat" | grep -qiE 'conversations\.v1|ConversationResource'; then
    products="$products conversations"
  fi
  # Notify
  if echo "$pat" | grep -qiE 'notify\.v1|NotificationResource'; then
    products="$products notify"
  fi
  # Proxy
  if echo "$pat" | grep -qiE 'proxy\.v1|ProxyService'; then
    products="$products proxy"
  fi
  # Autopilot
  if echo "$pat" | grep -qiE 'autopilot\.v1|AutopilotTask'; then
    products="$products autopilot"
  fi
  # TaskRouter
  if echo "$pat" | grep -qiE 'taskrouter|TaskRouterWorker|WorkflowResource'; then
    products="$products taskrouter"
  fi
  # Studio
  if echo "$pat" | grep -qiE 'studio\.v2|studio\.v1|flow\.create'; then
    products="$products studio"
  fi
  echo "$products"
}

# Register a file hit: record_file <rel_path> <language> <product> <pattern>
# Accumulates products and patterns for files already seen.
declare -A FILE_INDEX  # rel_path -> index into FILE_* arrays

record_file() {
  local rel="$1" lang="$2" product="$3" pattern="$4"
  if [[ -n "$lang" && "$lang" != "unknown" ]]; then
    LANG_SET["$lang"]=1
  fi
  if [[ -n "$product" ]]; then
    PRODUCT_SET["$product"]=1
  fi

  if [[ -v FILE_INDEX["$rel"] ]]; then
    local idx="${FILE_INDEX[$rel]}"
    # Append product if not already listed
    if [[ -n "$product" ]] && ! echo ",${FILE_PRODUCTS[$idx]}," | grep -q ",$product,"; then
      FILE_PRODUCTS[$idx]="${FILE_PRODUCTS[$idx]},$product"
    fi
    # Append pattern if not already listed
    local escaped_pattern
    escaped_pattern="$(json_escape "$pattern")"
    if ! echo "||${FILE_PATTERNS[$idx]}||" | grep -qF "||$escaped_pattern||"; then
      FILE_PATTERNS[$idx]="${FILE_PATTERNS[$idx]}||$escaped_pattern"
    fi
  else
    local idx=${#FILE_PATHS[@]}
    FILE_INDEX["$rel"]=$idx
    FILE_PATHS+=("$rel")
    FILE_LANGS+=("$lang")
    FILE_PRODUCTS+=("$product")
    FILE_PATTERNS+=("$(json_escape "$pattern")")
  fi
}

# ---------------------------------------------------------------------------
# 1. SDK imports
# ---------------------------------------------------------------------------

log "Scanning SDK imports..."

SDK_PATTERNS=(
  # Python
  'from twilio'
  'import twilio'
  # JavaScript / TypeScript
  "require('twilio')"
  'require("twilio")'
  "from 'twilio'"
  'from "twilio"'
  # Go
  'github.com/twilio/twilio-go'
  # Ruby
  "require 'twilio-ruby'"
  'require "twilio-ruby"'
  "gem 'twilio-ruby'"
  # Java
  'import com.twilio'
  'com.twilio.'
  # PHP
  'use Twilio\\'
  'Twilio\\'
  # C# / .NET
  'using Twilio'
  'Twilio.'
  # curl
  'api.twilio.com'
)

# Also catch JS/TS `import ... twilio` via regex
SDK_REGEX_PATTERNS=(
  'import.*twilio'
)

for pat in "${SDK_PATTERNS[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rest="${line#*:}"
    content="${rest#*:}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    lang="$(detect_language "$rel")"
    trimmed="$(echo "$content" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    products="$(pattern_to_products "$trimmed")"
    if [[ -z "$products" ]]; then
      # Generic SDK import — no specific product
      record_file "$rel" "$lang" "" "$trimmed"
    else
      for p in $products; do
        record_file "$rel" "$lang" "$p" "$trimmed"
      done
    fi
  done < <(run_grep -F "$pat")
done

for pat in "${SDK_REGEX_PATTERNS[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rest="${line#*:}"
    content="${rest#*:}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    lang="$(detect_language "$rel")"
    trimmed="$(echo "$content" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    products="$(pattern_to_products "$trimmed")"
    if [[ -z "$products" ]]; then
      record_file "$rel" "$lang" "" "$trimmed"
    else
      for p in $products; do
        record_file "$rel" "$lang" "$p" "$trimmed"
      done
    fi
  done < <(run_grep -E "$pat")
done

# ---------------------------------------------------------------------------
# 2. Product-specific patterns (deeper detection)
# ---------------------------------------------------------------------------

log "Scanning product-specific patterns..."

PRODUCT_PATTERNS_FIXED=(
  'VoiceResponse:voice'
  'CallResource:voice'
  'MessageResource:messaging'
  'VideoGrant:video'
  'twilio-video:video'
  'VerificationResource:verify'
  'FaxResource:fax'
  'RequestValidator:webhook-validation'
  'validateRequest:webhook-validation'
  # SIP trunking
  'TrunkingGrant:sip'
  'SipGrant:sip'
  # IoT / Wireless
  'SuperSim:iot'
  'SimResource:iot'
  # Conversations
  'ConversationResource:conversations'
  # Notify
  'NotificationResource:notify'
  # Proxy
  'ProxyService:proxy'
  # Autopilot
  'AutopilotTask:autopilot'
  # TaskRouter
  'TaskRouterWorker:taskrouter'
  'WorkflowResource:taskrouter'
)

for entry in "${PRODUCT_PATTERNS_FIXED[@]}"; do
  pat="${entry%%:*}"
  product="${entry#*:}"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rest="${line#*:}"
    content="${rest#*:}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    lang="$(detect_language "$rel")"
    trimmed="$(echo "$content" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    record_file "$rel" "$lang" "$product" "$trimmed"
  done < <(run_grep -F "$pat")
done

# Case-insensitive regex patterns for common method calls
PRODUCT_PATTERNS_REGEX=(
  'messages\.create:messaging'
  'messages\.list:messaging'
  '\.calls\.create:voice'
  '\.calls\.list:voice'
  'verify\.v2:verify'
  'verifications\.create:verify'
  'verification_checks:verify'
  '\.fax\.:fax'
  'faxes\.create:fax'
  'lookups\.v1:lookup'
  'lookups\.v2:lookup'
  'phone_numbers\.fetch:lookup'
  'twiml\.voice:voice'
  'twiml\.messaging:messaging'
  'VoiceGrant:voice'
  'SipGrant:voice'
  # SIP trunking
  'twilio\.rest\.trunking:sip'
  'trunking\.v1:sip'
  'trunk\.create:sip'
  # IoT / Wireless / Super SIM
  'twilio\.rest\.wireless:iot'
  'twilio\.rest\.supersim:iot'
  'wireless\.v1:iot'
  'supersim\.v1:iot'
  'sim\.create:iot'
  'fleet\.create:iot'
  # Conversations
  'twilio\.rest\.conversations:conversations'
  'conversations\.v1:conversations'
  'conversation\.create:conversations'
  # Sync
  'twilio\.rest\.sync:sync'
  'sync\.v1:sync'
  # Notify
  'twilio\.rest\.notify:notify'
  'notify\.v1:notify'
  # Proxy
  'twilio\.rest\.proxy:proxy'
  'proxy\.v1:proxy'
  # Autopilot
  'twilio\.rest\.autopilot:autopilot'
  'autopilot\.v1:autopilot'
  # TaskRouter
  'twilio\.rest\.taskrouter:taskrouter'
  'taskrouter\.v1:taskrouter'
  # Studio
  'twilio\.rest\.studio:studio'
  'studio\.v2:studio'
  'flow\.create:studio'
)

for entry in "${PRODUCT_PATTERNS_REGEX[@]}"; do
  pat="${entry%%:*}"
  product="${entry#*:}"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rest="${line#*:}"
    content="${rest#*:}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    lang="$(detect_language "$rel")"
    trimmed="$(echo "$content" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    record_file "$rel" "$lang" "$product" "$trimmed"
  done < <(run_grep -iE "$pat")
done

# ---------------------------------------------------------------------------
# 3. Environment variables
# ---------------------------------------------------------------------------

log "Scanning environment variables..."

ENV_VAR_NAMES=(
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_API_KEY
  TWILIO_API_KEY_SECRET
  TWILIO_API_KEY_SID
)

for varname in "${ENV_VAR_NAMES[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    if [[ -v ENV_MAP["$varname"] ]]; then
      if ! echo ",${ENV_MAP[$varname]}," | grep -q ",$rel,"; then
        ENV_MAP["$varname"]="${ENV_MAP[$varname]},$rel"
      fi
    else
      ENV_MAP["$varname"]="$rel"
    fi
  done < <(run_grep -F "$varname")
done

for varname in "${!ENV_MAP[@]}"; do
  ENV_NAMES+=("$varname")
  ENV_FILES+=("${ENV_MAP[$varname]}")
done

# ---------------------------------------------------------------------------
# 4. API URLs
# ---------------------------------------------------------------------------

log "Scanning API URLs..."

API_URL_LIST=(
  api.twilio.com
  verify.twilio.com
  messaging.twilio.com
  video.twilio.com
  trunking.twilio.com
  lookups.twilio.com
  fax.twilio.com
)

for url in "${API_URL_LIST[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    if [[ -v API_URL_MAP["$url"] ]]; then
      if ! echo ",${API_URL_MAP[$url]}," | grep -q ",$rel,"; then
        API_URL_MAP["$url"]="${API_URL_MAP[$url]},$rel"
      fi
    else
      API_URL_MAP["$url"]="$rel"
    fi
  done < <(run_grep -F "$url")
done

for url in "${!API_URL_MAP[@]}"; do
  API_URLS+=("$url")
  API_URL_FILES+=("${API_URL_MAP[$url]}")
done

# ---------------------------------------------------------------------------
# 5. Config / dependency files
# ---------------------------------------------------------------------------

log "Scanning config files..."

CONFIG_FILES=(
  "requirements.txt:pip"
  "package.json:npm"
  "Gemfile:gem"
  "go.mod:gomod"
  "pom.xml:maven"
  "build.gradle:gradle"
  "composer.json:composer"
  "Pipfile:pipenv"
  "setup.py:setuptools"
  "setup.cfg:setuptools"
  "pyproject.toml:pyproject"
)

CSPROJ_PATTERN="*.csproj:nuget"

# Scan known config filenames
for entry in "${CONFIG_FILES[@]}"; do
  filename="${entry%%:*}"
  cfgtype="${entry#*:}"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rest="${line#*:}"
    content="${rest#*:}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    trimmed="$(echo "$content" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    CFG_PATHS+=("$rel")
    CFG_TYPES+=("$cfgtype")
    CFG_LINES+=("$(json_escape "$trimmed")")
  done < <(run_grep -F "twilio" --include="$filename")
done

# Scan *.csproj files
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  filepath="${line%%:*}"
  rest="${line#*:}"
  content="${rest#*:}"
  rel="${filepath#"$PROJECT_ROOT"/}"
  trimmed="$(echo "$content" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
  CFG_PATHS+=("$rel")
  CFG_TYPES+=("nuget")
  CFG_LINES+=("$(json_escape "$trimmed")")
done < <(run_grep -F "Twilio" --include="*.csproj")

# ---------------------------------------------------------------------------
# 6. TwiML files — XML files containing <Response> with voice verbs
# ---------------------------------------------------------------------------

log "Scanning TwiML files..."

TWIML_VERBS='<Say>|<Play>|<Dial>|<Gather>|<Record>|<Hangup>|<Redirect>|<Pause>|<Enqueue>'

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  filepath="${line%%:*}"
  rel="${filepath#"$PROJECT_ROOT"/}"
  # Verify the file also contains <Response>
  if grep -q '<Response>' "$filepath" 2>/dev/null; then
    # Deduplicate
    local_found=0
    for existing in "${TWIML_FILES[@]+"${TWIML_FILES[@]}"}"; do
      if [[ "$existing" == "$rel" ]]; then
        local_found=1
        break
      fi
    done
    if [[ $local_found -eq 0 ]]; then
      TWIML_FILES+=("$rel")
    fi
  fi
done < <(run_grep -E "$TWIML_VERBS" --include="*.xml")

# ---------------------------------------------------------------------------
# 7. Webhook validation handlers
# ---------------------------------------------------------------------------

log "Scanning webhook handlers..."

WH_TERMS=("RequestValidator" "validateRequest" "X-Twilio-Signature")

for term in "${WH_TERMS[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    filepath="${line%%:*}"
    rel="${filepath#"$PROJECT_ROOT"/}"
    # Deduplicate by rel+term
    dup=0
    for i in "${!WH_PATHS[@]}"; do
      if [[ "${WH_PATHS[$i]}" == "$rel" && "${WH_PATTERNS[$i]}" == "$term" ]]; then
        dup=1
        break
      fi
    done
    if [[ $dup -eq 0 ]]; then
      WH_PATHS+=("$rel")
      WH_PATTERNS+=("$term")
    fi
  done < <(run_grep -F "$term")
done

# ---------------------------------------------------------------------------
# Build JSON output
# ---------------------------------------------------------------------------

log "Building JSON output..."

SCAN_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# --- languages_detected ---
lang_json=""
for lang in "${!LANG_SET[@]}"; do
  [[ -n "$lang_json" ]] && lang_json="$lang_json, "
  lang_json="$lang_json\"$lang\""
done

# --- products_used ---
prod_json=""
for prod in "${!PRODUCT_SET[@]}"; do
  [[ -n "$prod_json" ]] && prod_json="$prod_json, "
  prod_json="$prod_json\"$prod\""
done

# --- files array ---
files_json=""
for i in "${!FILE_PATHS[@]}"; do
  [[ -n "$files_json" ]] && files_json="$files_json,"
  rel="$(json_escape "${FILE_PATHS[$i]}")"
  lang="${FILE_LANGS[$i]}"
  # Build products array from comma-separated
  prods_arr=""
  IFS=',' read -ra plist <<< "${FILE_PRODUCTS[$i]}"
  for p in "${plist[@]}"; do
    p="$(echo "$p" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    [[ -z "$p" ]] && continue
    [[ -n "$prods_arr" ]] && prods_arr="$prods_arr, "
    prods_arr="$prods_arr\"$p\""
  done
  # Build patterns array from ||-separated
  pats_arr=""
  IFS=$'\x1f' read -ra patlist <<< "${FILE_PATTERNS[$i]//'||'/$'\x1f'}"
  for pt in "${patlist[@]}"; do
    [[ -z "$pt" ]] && continue
    [[ -n "$pats_arr" ]] && pats_arr="$pats_arr, "
    pats_arr="$pats_arr\"$pt\""
  done
  files_json="$files_json
    {
      \"path\": \"$rel\",
      \"language\": \"$lang\",
      \"products\": [$prods_arr],
      \"patterns_matched\": [$pats_arr]
    }"
done

# --- env_vars array ---
env_json=""
for i in "${!ENV_NAMES[@]}"; do
  [[ -n "$env_json" ]] && env_json="$env_json,"
  name="${ENV_NAMES[$i]}"
  files_list=""
  IFS=',' read -ra elist <<< "${ENV_FILES[$i]}"
  for ef in "${elist[@]}"; do
    ef="$(echo "$ef" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    [[ -z "$ef" ]] && continue
    [[ -n "$files_list" ]] && files_list="$files_list, "
    files_list="$files_list\"$(json_escape "$ef")\""
  done
  env_json="$env_json
    {
      \"name\": \"$name\",
      \"files\": [$files_list]
    }"
done

# --- config_files array ---
cfg_json=""
for i in "${!CFG_PATHS[@]}"; do
  [[ -n "$cfg_json" ]] && cfg_json="$cfg_json,"
  cfg_json="$cfg_json
    {
      \"path\": \"$(json_escape "${CFG_PATHS[$i]}")\",
      \"type\": \"${CFG_TYPES[$i]}\",
      \"line\": \"${CFG_LINES[$i]}\"
    }"
done

# --- twiml_files array ---
twiml_json=""
for tf in "${TWIML_FILES[@]+"${TWIML_FILES[@]}"}"; do
  [[ -n "$twiml_json" ]] && twiml_json="$twiml_json, "
  twiml_json="$twiml_json\"$(json_escape "$tf")\""
done

# --- webhook_handlers array ---
wh_json=""
for i in "${!WH_PATHS[@]}"; do
  [[ -n "$wh_json" ]] && wh_json="$wh_json,"
  wh_json="$wh_json
    {
      \"path\": \"$(json_escape "${WH_PATHS[$i]}")\",
      \"pattern\": \"$(json_escape "${WH_PATTERNS[$i]}")\"
    }"
done

# --- api_urls array ---
api_json=""
for i in "${!API_URLS[@]}"; do
  [[ -n "$api_json" ]] && api_json="$api_json,"
  url="${API_URLS[$i]}"
  files_list=""
  IFS=',' read -ra alist <<< "${API_URL_FILES[$i]}"
  for af in "${alist[@]}"; do
    af="$(echo "$af" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    [[ -z "$af" ]] && continue
    [[ -n "$files_list" ]] && files_list="$files_list, "
    files_list="$files_list\"$(json_escape "$af")\""
  done
  api_json="$api_json
    {
      \"url\": \"$url\",
      \"files\": [$files_list]
    }"
done

# --- summary ---
total_files=0
[[ ${FILE_PATHS[@]+x} ]] && total_files=${#FILE_PATHS[@]}
total_products=0
[[ ${PRODUCT_SET[@]+x} ]] && total_products=${#PRODUCT_SET[@]}
total_languages=0
[[ ${LANG_SET[@]+x} ]] && total_languages=${#LANG_SET[@]}
has_webhook="false"
[[ ${WH_PATHS[@]+x} ]] && [[ ${#WH_PATHS[@]} -gt 0 ]] && has_webhook="true"
has_twiml="false"
[[ ${TWIML_FILES[@]+x} ]] && [[ ${#TWIML_FILES[@]} -gt 0 ]] && has_twiml="true"
has_env="false"
[[ ${ENV_NAMES[@]+x} ]] && [[ ${#ENV_NAMES[@]} -gt 0 ]] && has_env="true"

# ---------------------------------------------------------------------------
# Print final JSON to stdout
# ---------------------------------------------------------------------------

cat <<ENDJSON
{
  "scan_version": "1.0.0",
  "project_root": "$(json_escape "$PROJECT_ROOT")",
  "scan_time": "$SCAN_TIME",
  "languages_detected": [$lang_json],
  "products_used": [$prod_json],
  "files": [${files_json}
  ],
  "env_vars": [${env_json}
  ],
  "config_files": [${cfg_json}
  ],
  "twiml_files": [${twiml_json}],
  "webhook_handlers": [${wh_json}
  ],
  "api_urls": [${api_json}
  ],
  "summary": {
    "total_files": $total_files,
    "total_products": $total_products,
    "total_languages": $total_languages,
    "has_webhook_validation": $has_webhook,
    "has_twiml": $has_twiml,
    "has_env_vars": $has_env
  }
}
ENDJSON

log "Scan complete. Found $total_files files, $total_products products, $total_languages languages."
