#!/bin/bash
# SessionStart hook: expose plugin scripts and validate Telnyx API access.

# Make plugin helpers available to the current Claude Code session.
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  echo "PATH=${CLAUDE_PLUGIN_ROOT:-}/scripts:$HOME/.local/bin:$PATH" >> "$CLAUDE_ENV_FILE"
fi

MISSING_KEY=false
if [[ -n "${TELNYX_API_KEY:-}" ]]; then
  echo "[telnyx-ai:setup] TELNYX_API_KEY found" >&2
  if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
    echo "TELNYX_API_KEY=${TELNYX_API_KEY}" >> "$CLAUDE_ENV_FILE"
  fi
else
  MISSING_KEY=true
  echo "[telnyx-ai:setup] WARNING: TELNYX_API_KEY not set." >&2
fi

if [[ "$MISSING_KEY" == "true" ]]; then
  USER_SHELL=$(basename "${SHELL:-/bin/bash}")
  echo ""
  echo "[telnyx-ai] ACTION REQUIRED before making API calls:"
  echo ""
  echo "TELNYX_API_KEY is not set."
  echo "→ Ask the user for their Telnyx API key (portal: https://portal.telnyx.com/#/app/api-keys)."
  echo "→ WAIT for the user's response."
  echo "→ Once the user provides it, persist it as a shell environment variable AND inject it into the current session."
  echo "→ Run BOTH commands:"
  if [[ "$USER_SHELL" == "fish" ]]; then
    echo "  fish -c 'set -Ux TELNYX_API_KEY <the_key>'"
  elif [[ "$USER_SHELL" == "zsh" ]]; then
    echo "  echo 'export TELNYX_API_KEY=<the_key>' >> ~/.zshrc"
  else
    echo "  echo 'export TELNYX_API_KEY=<the_key>' >> ~/.bashrc"
  fi
  echo "  echo 'TELNYX_API_KEY=<the_key>' >> \$CLAUDE_ENV_FILE"
  echo "→ The first command persists it for future sessions. The second injects it into the current session."
  echo ""
fi

exit 0
