#!/bin/bash
# Read-only compatibility entrypoint used by CI and contributors.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$REPO_ROOT/scripts/sync-skills.sh" --check
