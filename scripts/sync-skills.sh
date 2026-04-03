#!/bin/bash
# Syncs skills from the canonical skills/ directory to provider plugin directories.
# Skills are flat at skills/<skill-name>/SKILL.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$REPO_ROOT/skills"

PROVIDERS=(
  "providers/claude/plugin/skills"
  "providers/cursor/plugin/skills"
)

for provider_skills in "${PROVIDERS[@]}"; do
  target="$REPO_ROOT/$provider_skills"
  echo "Syncing skills to $provider_skills ..."
  rm -rf "$target"
  mkdir -p "$target"

  # Copy each skill directory (skip non-directories like README.md)
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")
    cp -R "$skill_dir" "$target/$skill_name"
  done

  echo "  Done — $(find "$target" -name "SKILL.md" | wc -l | tr -d ' ') skills synced"
done

echo "All providers synced."
