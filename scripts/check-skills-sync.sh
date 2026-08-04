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

# Claude uses per-product plugins (providers/claude/plugins/<plugin>/skills/<name>);
# sync-skills.sh routes every canonical skill into exactly one plugin.
for skill_dir in "$SKILLS_SRC"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"

  matches=()
  for candidate in "$REPO_ROOT"/providers/claude/plugins/*/skills/"$skill_name"; do
    [ -d "$candidate" ] && matches+=("$candidate")
  done

  if [ "${#matches[@]}" -eq 0 ]; then
    echo "Out of sync: $skill_name missing from providers/claude/plugins/*/skills"
    out_of_sync=true
    continue
  fi
  if [ "${#matches[@]}" -gt 1 ]; then
    echo "Out of sync: $skill_name present in multiple claude plugins: ${matches[*]#$REPO_ROOT/}"
    out_of_sync=true
    continue
  fi
  if ! diff -r "$skill_dir" "${matches[0]}" > /dev/null 2>&1; then
    echo "Out of sync: ${matches[0]#$REPO_ROOT/}"
    out_of_sync=true
  fi
done

target="$REPO_ROOT/providers/cursor/plugin/skills"
if [ ! -d "$target" ]; then
  echo "WARNING: $target does not exist"
else
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    if ! diff -r "$skill_dir" "$target/$skill_name" > /dev/null 2>&1; then
      echo "Out of sync: providers/cursor/plugin/skills/$skill_name"
      out_of_sync=true
    fi
  done
fi

if [ "$out_of_sync" = true ]; then
  echo ""
  echo "Provider skill directories are out of sync with skills/."
  echo "Run: ./scripts/sync-skills.sh"
  exit 1
fi

echo "All provider skill directories are in sync."
