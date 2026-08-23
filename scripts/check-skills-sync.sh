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

# Claude uses per-product plugins (providers/claude/plugins/<plugin>/skills/<name>).
# sync-skills.sh routes every canonical skill into exactly one plugin; validate
# against that routing, not just "present in some plugin". PLUGIN_PATTERNS is
# read from sync-skills.sh so there is a single source of truth.
eval "$(sed -n '/^PLUGIN_PATTERNS=(/,/^)/p' "$REPO_ROOT/scripts/sync-skills.sh")"
if [ "${#PLUGIN_PATTERNS[@]}" -eq 0 ]; then
  echo "ERROR: could not read PLUGIN_PATTERNS from scripts/sync-skills.sh"
  exit 1
fi

expected_plugin() {
  local skill_name="$1" entry plugin_name prefixes catch_all prefix catch_all_plugin=""
  for entry in "${PLUGIN_PATTERNS[@]}"; do
    IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
    if [ "$catch_all" = "1" ]; then
      catch_all_plugin="$plugin_name"
      continue
    fi
    IFS=',' read -ra prefix_list <<< "$prefixes"
    for prefix in "${prefix_list[@]}"; do
      if [[ "$skill_name" == "$prefix"* ]]; then
        echo "$plugin_name"
        return
      fi
    done
  done
  echo "$catch_all_plugin"
}

for skill_dir in "$SKILLS_SRC"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  plugin="$(expected_plugin "$skill_name")"
  expected="$REPO_ROOT/providers/claude/plugins/$plugin/skills/$skill_name"

  if [ ! -d "$expected" ]; then
    echo "Out of sync: $skill_name missing from providers/claude/plugins/$plugin/skills"
    out_of_sync=true
  elif ! diff -r "$skill_dir" "$expected" > /dev/null 2>&1; then
    echo "Out of sync: ${expected#$REPO_ROOT/}"
    out_of_sync=true
  fi

  for candidate in "$REPO_ROOT"/providers/claude/plugins/*/skills/"$skill_name"; do
    [ -d "$candidate" ] || continue
    if [ "$candidate" != "$expected" ]; then
      echo "Out of sync: $skill_name misplaced in ${candidate#$REPO_ROOT/} (belongs in $plugin)"
      out_of_sync=true
    fi
  done
done

# Orphans: provider copies whose canonical skill was deleted. sync-skills.sh
# rebuilds every provider tree from scratch, so anything not in skills/ is stale.
for orphan in "$REPO_ROOT"/providers/claude/plugins/*/skills/*/; do
  [ -d "$orphan" ] || continue
  skill_name="$(basename "$orphan")"
  if [ ! -d "$SKILLS_SRC/$skill_name" ]; then
    rel="${orphan%/}"; echo "Out of sync: ${rel#$REPO_ROOT/} has no canonical skills/$skill_name (orphaned copy)"
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
  for orphan in "$target"/*/; do
    [ -d "$orphan" ] || continue
    skill_name="$(basename "$orphan")"
    if [ ! -d "$SKILLS_SRC/$skill_name" ]; then
      echo "Out of sync: providers/cursor/plugin/skills/$skill_name has no canonical skill (orphaned copy)"
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
