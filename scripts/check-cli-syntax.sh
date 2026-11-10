#!/bin/bash
# Fails if docs, manifests, or examples reference CLI commands that do not
# exist in the current Telnyx CLIs.
#
# Two current CLIs are documented in this repo:
#   - telnyx-agent  (@telnyx/agent-cli, cli/)           — preferred in docs
#   - telnyx        (Go telnyx-cli, vendored by agent-cli) — `telnyx <resource[:sub]> <verb>`
#
# The deprecated @telnyx/api-cli also installed a `telnyx` binary but with a
# different grammar (`telnyx <noun> <verb>`, e.g. `telnyx number search`).
# Its commands silently fail on the Go CLI, so this check blocks them.
#
# Allowlist: cli/tests exercises the api-cli resolution shim on purpose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

INCLUDE=(--include='*.md' --include='*.mdc' --include='*.json' --include='*.sh' --include='*.ts' --include='*.mjs' --include='*.py' --include='*.yaml' --include='*.yml')
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor --exclude-dir=dist)
ALLOW='^(\./)?cli/tests/|^(\./)?scripts/check-cli-syntax\.sh'

# 1. Deprecated @telnyx/api-cli grammar: `telnyx <noun> <verb>` with api-cli nouns.
API_CLI_NOUNS='assistant|number|message|messaging-profile|call|auth|sim|fax|storage|lookup|verify|profile|billing|connection|e911|porting|usage|video|voice-profile|10dlc|debugger'
DEPRECATED="(^|[^-/.@a-z_])telnyx ($API_CLI_NOUNS) [a-z]"

# 2. Go CLI verbs that don't exist (common guesses from api-cli habits).
PHANTOM='(^|[^-/.@a-z_])telnyx (messages create|calls create|assistants create|assistants list|balance get|ai models|ai chat)\b'

# 3. Installing the deprecated package. Prose that merely mentions it is fine.
PACKAGE='(npm (install|i) (-g |--global )?|npx )@telnyx/api-cli'

fail=false
report() {
  local label="$1" pattern="$2"
  local hits
  hits="$(grep -rnE "${INCLUDE[@]}" "${EXCLUDE[@]}" -- "$pattern" . | grep -vE "$ALLOW" || true)"
  if [ -n "$hits" ]; then
    echo "ERROR: $label"
    echo "$hits" | sed 's/^/  /'
    echo ""
    fail=true
  fi
}

report "deprecated @telnyx/api-cli command syntax (use telnyx-agent, or Go CLI 'telnyx <resource[:sub]> <verb>')" "$DEPRECATED"
report "command does not exist in the Go telnyx CLI" "$PHANTOM"
report "deprecated package @telnyx/api-cli referenced (current package is @telnyx/agent-cli)" "$PACKAGE"

if [ "$fail" = true ]; then
  echo "See cli/README.md for telnyx-agent commands; run 'telnyx <resource> --help' for Go CLI verbs."
  exit 1
fi

echo "No deprecated or phantom CLI command references found."
