#!/bin/bash
# Syncs skills from the canonical skills/ directory to provider plugin directories.
#
# Claude Code: multi-plugin structure under providers/claude/plugins/<plugin-name>/skills/
# Cursor: flat structure under providers/cursor/plugin/skills/
#
# Plugin groupings are defined by prefix patterns in this script.
# To add a new product plugin, add it to the PLUGIN_PATTERNS array.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$REPO_ROOT/skills"

# ── Plugin groupings ────────────────────────────────────────────────────────
# Format: "plugin_name|prefix1,prefix2,...|catch_all_flag"
# catch_all_flag=1 means this plugin gets all skills not matched by other plugins
PLUGIN_PATTERNS=(
  "telnyx-developer-kit|telnyx-kit-|0"
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

# ── Claude Code: multi-plugin sync ──────────────────────────────────────────
CLAUDE_PLUGINS="$REPO_ROOT/providers/claude/plugins"
echo "Syncing skills to Claude Code plugins ..."

for entry in "${PLUGIN_PATTERNS[@]}"; do
  IFS='|' read -r plugin_name prefixes catch_all <<< "$entry"
  plugin_dir="$CLAUDE_PLUGINS/$plugin_name"
  skills_dir="$plugin_dir/skills"

  if [ ! -d "$plugin_dir" ]; then
    echo "  ⚠ Skipping $plugin_name — plugin directory not found"
    continue
  fi

  rm -rf "$skills_dir"
  mkdir -p "$skills_dir"

  count=0
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")

    # Check if this skill matches any prefix for this plugin
    match=0
    if [ "$catch_all" = "1" ]; then
      # Catch-all plugin: check that no other plugin claimed this skill
      match=1
      for other in "${PLUGIN_PATTERNS[@]}"; do
        IFS='|' read -r other_name other_prefixes other_catch <<< "$other"
        [ "$other_catch" = "1" ] && continue
        [ "$other_name" = "$plugin_name" ] && continue
        IFS=',' read -ra prefix_list <<< "$other_prefixes"
        for prefix in "${prefix_list[@]}"; do
          if [[ "$skill_name" == "$prefix"* ]]; then
            match=0
            break
          fi
        done
        [ "$match" = "0" ] && break
      done
    else
      # Normal plugin: check prefixes
      IFS=',' read -ra prefix_list <<< "$prefixes"
      for prefix in "${prefix_list[@]}"; do
        if [[ "$skill_name" == "$prefix"* ]]; then
          match=1
          break
        fi
      done
    fi

    if [ "$match" = "1" ]; then
      cp -R "$skill_dir" "$skills_dir/$skill_name"
      ((++count))
    fi
  done

  echo "  $plugin_name — $count skills synced"
done

total_claude=$(find "$CLAUDE_PLUGINS" -name "SKILL.md" | wc -l | tr -d ' ')
echo "  Done — $total_claude skills across Claude Code plugins"

# ── Cursor: flat sync (all skills) ───────────────────────────────────────────
CURSOR_SKILLS="$REPO_ROOT/providers/cursor/plugin/skills"
echo "Syncing skills to Cursor plugin ..."
rm -rf "$CURSOR_SKILLS"
mkdir -p "$CURSOR_SKILLS"

for skill_dir in "$SKILLS_SRC"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  cp -R "$skill_dir" "$CURSOR_SKILLS/$skill_name"
done

total_cursor=$(find "$CURSOR_SKILLS" -name "SKILL.md" | wc -l | tr -d ' ')
echo "  Done — $total_cursor skills synced"

echo "All providers synced."
