#!/bin/bash
# Checks that provider plugin skill directories match the canonical skills/ source.
# Both are flat: skills/<skill-name>/SKILL.md

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$REPO_ROOT/skills"
out_of_sync=false

# Check structure: skills must be flat (skills/<name>/SKILL.md, not nested)
nested=$(find "$SKILLS_SRC" -mindepth 2 -type d -name "skills" 2>/dev/null)
if [ -n "$nested" ]; then
  echo "ERROR: Nested skills/ directories found. Skills must be flat."
  echo "Expected: skills/<skill-name>/SKILL.md"
  echo "Found nested dirs:"
  echo "$nested"
  exit 1
fi

deep=$(find "$SKILLS_SRC" -name SKILL.md -mindepth 3 2>/dev/null)
if [ -n "$deep" ]; then
  echo "ERROR: SKILL.md files found too deep. Skills must be at skills/<name>/SKILL.md."
  echo "Found:"
  echo "$deep"
  exit 1
fi

for provider in claude cursor; do
  target="$REPO_ROOT/providers/$provider/plugin/skills"

  if [ ! -d "$target" ]; then
    echo "WARNING: $target does not exist"
    continue
  fi

  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    if ! diff -r "$skill_dir" "$target/$skill_name" > /dev/null 2>&1; then
      echo "Out of sync: providers/$provider/plugin/skills/$skill_name"
      out_of_sync=true
    fi
  done
done

if [ "$out_of_sync" = true ]; then
  echo ""
  echo "Provider skill directories are out of sync with skills/."
  echo "Run: ./scripts/sync-skills.sh"
  exit 1
fi

echo "All provider skill directories are in sync."
