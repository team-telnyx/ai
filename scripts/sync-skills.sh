#!/bin/bash
# Syncs canonical skills into generated provider/plugin skill trees.
#
# Use --check to build the expected trees in a temporary directory and compare
# them with the repository without modifying tracked files.

set -euo pipefail

MODE="sync"
case "${1:-}" in
  "")
    ;;
  --check)
    MODE="check"
    ;;
  *)
    echo "Usage: $0 [--check]" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$REPO_ROOT/skills"

# Format: "plugin_name|prefix1,prefix2,...|catch_all_flag"
# catch_all_flag=1 means this plugin gets every skill not matched elsewhere.
PLUGIN_PATTERNS=(
  "telnyx-whatsapp|telnyx-whatsapp-|0"
  "telnyx-voice|telnyx-voice-,telnyx-ai-outbound-voice|0"
  "telnyx-messaging|telnyx-messaging-|0"
  "telnyx-tts|telnyx-tts-|0"
  "telnyx-stt|telnyx-stt-|0"
  "telnyx-verify|telnyx-verify-|0"
  "telnyx-ai|telnyx-ai-assistants-,telnyx-ai-inference-,telnyx-meeting-bot|0"
  "telnyx-numbers|telnyx-numbers-,telnyx-10dlc-,telnyx-porting-|0"
  "telnyx-webrtc|telnyx-webrtc-,telnyx-video-|0"
  "telnyx-email|telnyx-email-|0"
  "telnyx-platform||1"
)

CODEX_DEVELOPER_KIT_SKILLS=(
  "telnyx-kit-product-navigator"
  "telnyx-kit-architecture-patterns"
  "telnyx-kit-guardrails"
  "telnyx-kit-debugging"
)

skill_matches_prefixes() {
  local skill_name="$1"
  local prefixes="$2"
  local prefix
  local -a prefix_list=()

  IFS=',' read -ra prefix_list <<< "$prefixes"
  for prefix in "${prefix_list[@]}"; do
    if [ -n "$prefix" ] && [[ "$skill_name" == "$prefix"* ]]; then
      return 0
    fi
  done
  return 1
}

assert_repo_path_has_no_symlink_components() {
  local target="$1"
  local relative
  local current="$REPO_ROOT"
  local component
  local -a components=()

  case "$target" in
    "$REPO_ROOT"/*)
      relative="${target#"$REPO_ROOT"/}"
      ;;
    *)
      echo "ERROR: Refusing to inspect path outside repository: $target" >&2
      exit 1
      ;;
  esac

  IFS='/' read -ra components <<< "$relative"
  for component in "${components[@]}"; do
    current="$current/$component"
    if [ -L "$current" ]; then
      echo "ERROR: Refusing generated-tree operation through symlink: $current" >&2
      exit 1
    fi
  done
}

validate_source_tree() {
  local nested
  local deep
  local symlinks
  local skill_dir
  local skill_name
  local claims
  local catch_all_count=0
  local entry
  local plugin_name
  local prefixes
  local catch_all
  local seen_plugin_names="|"

  if [ ! -d "$SKILLS_SRC" ]; then
    echo "ERROR: Canonical skills directory not found: $SKILLS_SRC" >&2
    exit 1
  fi

  symlinks="$(find "$SKILLS_SRC" -type l -print 2>/dev/null)"
  if [ -n "$symlinks" ]; then
    echo "ERROR: Canonical skills tree must not contain symlinks." >&2
    echo "$symlinks" >&2
    exit 1
  fi

  nested="$(find "$SKILLS_SRC" -mindepth 2 -type d -name "skills" 2>/dev/null)"
  if [ -n "$nested" ]; then
    echo "ERROR: Nested skills/ directories found. Skills must be flat." >&2
    echo "$nested" >&2
    exit 1
  fi

  deep="$(find "$SKILLS_SRC" -name "SKILL.md" -mindepth 3 2>/dev/null)"
  if [ -n "$deep" ]; then
    echo "ERROR: SKILL.md files must be at skills/<name>/SKILL.md." >&2
    echo "$deep" >&2
    exit 1
  fi

  for entry in "${PLUGIN_PATTERNS[@]}"; do
    IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
    if [[ "$seen_plugin_names" == *"|$plugin_name|"* ]]; then
      echo "ERROR: Duplicate Claude plugin name: $plugin_name" >&2
      exit 1
    fi
    seen_plugin_names="${seen_plugin_names}${plugin_name}|"

    if [ "$catch_all" = "1" ]; then
      catch_all_count=$((catch_all_count + 1))
    fi
  done
  if [ "$catch_all_count" -ne 1 ]; then
    echo "ERROR: Exactly one Claude plugin must be the catch-all." >&2
    exit 1
  fi

  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    if [ ! -f "$skill_dir/SKILL.md" ]; then
      echo "ERROR: Missing $skill_dir/SKILL.md" >&2
      exit 1
    fi

    claims=0
    for entry in "${PLUGIN_PATTERNS[@]}"; do
      IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
      [ "$catch_all" = "1" ] && continue
      if skill_matches_prefixes "$skill_name" "$prefixes"; then
        claims=$((claims + 1))
      fi
    done
    if [ "$claims" -gt 1 ]; then
      echo "ERROR: $skill_name matches more than one Claude plugin." >&2
      exit 1
    fi
  done

  for skill_name in "${CODEX_DEVELOPER_KIT_SKILLS[@]}"; do
    if [ ! -f "$SKILLS_SRC/$skill_name/SKILL.md" ]; then
      echo "ERROR: Missing canonical Codex skill: $skill_name" >&2
      exit 1
    fi
  done
}

validate_source_tree

# Refuse to traverse symlinked provider/plugin ancestors before any generated
# tree is compared or reset. Without this check, a repository-local path such
# as providers/cursor/plugin/skills could resolve into an unrelated directory.
for entry in "${PLUGIN_PATTERNS[@]}"; do
  IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
  assert_repo_path_has_no_symlink_components \
    "$REPO_ROOT/providers/claude/plugins/$plugin_name/skills"
done
assert_repo_path_has_no_symlink_components \
  "$REPO_ROOT/providers/cursor/plugin/skills"
assert_repo_path_has_no_symlink_components \
  "$REPO_ROOT/plugins/telnyx-developer-kit/skills"

TEMP_ROOT=""
if [ "$MODE" = "check" ]; then
  TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/telnyx-skills-sync.XXXXXX")"
  SYNC_ROOT="$TEMP_ROOT"

  cleanup() {
    if [ -n "$TEMP_ROOT" ] && [ -d "$TEMP_ROOT" ]; then
      rm -rf -- "$TEMP_ROOT"
    fi
  }
  trap cleanup EXIT

  for entry in "${PLUGIN_PATTERNS[@]}"; do
    IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
    mkdir -p "$SYNC_ROOT/providers/claude/plugins/$plugin_name"
  done
  mkdir -p "$SYNC_ROOT/providers/cursor/plugin"
  mkdir -p "$SYNC_ROOT/plugins/telnyx-developer-kit"
  echo "Building expected generated skill trees ..."
else
  SYNC_ROOT="$REPO_ROOT"

  for entry in "${PLUGIN_PATTERNS[@]}"; do
    IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
    if [ ! -d "$SYNC_ROOT/providers/claude/plugins/$plugin_name" ]; then
      echo "ERROR: Configured Claude plugin directory not found: $plugin_name" >&2
      exit 1
    fi
  done
  if [ ! -d "$SYNC_ROOT/providers/cursor/plugin" ]; then
    echo "ERROR: Cursor plugin directory not found." >&2
    exit 1
  fi
  if [ ! -d "$SYNC_ROOT/plugins/telnyx-developer-kit" ]; then
    echo "ERROR: Codex developer kit directory not found." >&2
    exit 1
  fi
  echo "Syncing generated skill trees ..."
fi

reset_skills_dir() {
  local target="$1"

  case "$target" in
    "$SYNC_ROOT"/providers/claude/plugins/*/skills | \
    "$SYNC_ROOT"/providers/cursor/plugin/skills | \
    "$SYNC_ROOT"/plugins/telnyx-developer-kit/skills)
      ;;
    *)
      echo "ERROR: Refusing to reset unexpected path: $target" >&2
      exit 1
      ;;
  esac

  rm -rf -- "$target"
  mkdir -p "$target"
}

# Claude Code: each canonical skill belongs to exactly one modular plugin.
CLAUDE_PLUGINS="$SYNC_ROOT/providers/claude/plugins"
for entry in "${PLUGIN_PATTERNS[@]}"; do
  IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
  skills_dir="$CLAUDE_PLUGINS/$plugin_name/skills"
  reset_skills_dir "$skills_dir"

  count=0
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    match=0

    if [ "$catch_all" = "1" ]; then
      match=1
      for other in "${PLUGIN_PATTERNS[@]}"; do
        IFS='|' read -r other_name other_prefixes other_catch <<< "$other"
        [ "$other_catch" = "1" ] && continue
        if skill_matches_prefixes "$skill_name" "$other_prefixes"; then
          match=0
          break
        fi
      done
    elif skill_matches_prefixes "$skill_name" "$prefixes"; then
      match=1
    fi

    if [ "$match" = "1" ]; then
      cp -R "$skill_dir" "$skills_dir/$skill_name"
      count=$((count + 1))
    fi
  done
  echo "  Claude/$plugin_name — $count skills"
done

# Cursor: one flat plugin containing every canonical skill.
CURSOR_SKILLS="$SYNC_ROOT/providers/cursor/plugin/skills"
reset_skills_dir "$CURSOR_SKILLS"
for skill_dir in "$SKILLS_SRC"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  cp -R "$skill_dir" "$CURSOR_SKILLS/$skill_name"
done
total_cursor="$(find "$CURSOR_SKILLS" -name "SKILL.md" | wc -l | tr -d ' ')"
echo "  Cursor — $total_cursor skills"

# Codex: an isolated developer kit containing only the four canonical kit skills.
CODEX_SKILLS="$SYNC_ROOT/plugins/telnyx-developer-kit/skills"
reset_skills_dir "$CODEX_SKILLS"
for skill_name in "${CODEX_DEVELOPER_KIT_SKILLS[@]}"; do
  cp -R "$SKILLS_SRC/$skill_name" "$CODEX_SKILLS/$skill_name"
done
total_codex="$(find "$CODEX_SKILLS" -name "SKILL.md" | wc -l | tr -d ' ')"
echo "  Codex/telnyx-developer-kit — $total_codex skills"

if [ "$MODE" = "sync" ]; then
  echo "All generated skill trees synced."
  exit 0
fi

out_of_sync=false
compare_tree() {
  local relative_path="$1"
  local expected="$SYNC_ROOT/$relative_path"
  local actual="$REPO_ROOT/$relative_path"
  local diff_output

  if [ ! -d "$actual" ]; then
    echo "Out of sync: missing $relative_path"
    out_of_sync=true
    return
  fi

  if diff_output="$(diff -qr "$expected" "$actual")"; then
    return
  fi

  echo "Out of sync: $relative_path"
  echo "$diff_output"
  out_of_sync=true
}

for entry in "${PLUGIN_PATTERNS[@]}"; do
  IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
  compare_tree "providers/claude/plugins/$plugin_name/skills"
done
compare_tree "providers/cursor/plugin/skills"
compare_tree "plugins/telnyx-developer-kit/skills"

is_configured_claude_plugin() {
  local candidate="$1"
  local configured_entry
  local configured_name
  local configured_prefixes
  local configured_catch_all

  for configured_entry in "${PLUGIN_PATTERNS[@]}"; do
    IFS='|' read -r configured_name configured_prefixes configured_catch_all \
      <<< "$configured_entry"
    if [ "$candidate" = "$configured_name" ]; then
      return 0
    fi
  done
  return 1
}

for actual_skills_dir in "$REPO_ROOT"/providers/claude/plugins/*/skills; do
  [ -d "$actual_skills_dir" ] || continue
  actual_plugin_name="$(basename "$(dirname "$actual_skills_dir")")"
  if ! is_configured_claude_plugin "$actual_plugin_name"; then
    echo "Out of sync: unexpected Claude skill tree for $actual_plugin_name"
    out_of_sync=true
  fi
done

if [ "$out_of_sync" = true ]; then
  echo
  echo "Generated skill trees are out of sync. Run: ./scripts/sync-skills.sh"
  exit 1
fi

echo "All generated skill trees are in sync."
