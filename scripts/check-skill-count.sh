#!/usr/bin/env bash
# Verify <!-- SKILL_COUNT -->N<!-- /SKILL_COUNT --> markers match the on-disk
# canonical skill count. The publish pipeline rewrites these markers on every
# skills update; this check catches drift from skills added or removed by hand
# between publishes. Docs without markers are skipped, so the check is safe to
# land before the markers themselves.
set -euo pipefail
cd "$(dirname "$0")/.."

actual=$(find skills -name SKILL.md | wc -l | tr -d ' ')
status=0
found=0
for f in README.md AGENTS.md; do
  [ -f "$f" ] || continue
  while read -r n; do
    [ -n "$n" ] || continue
    found=1
    if [ "$n" != "$actual" ]; then
      echo "FAIL: $f states skill count $n but skills/ contains $actual SKILL.md files." >&2
      echo "      Update the marker (or let the next skills publish refresh it)." >&2
      status=1
    fi
  done < <(grep -o '<!-- SKILL_COUNT -->[0-9]*<!-- /SKILL_COUNT -->' "$f" 2>/dev/null | grep -o '[0-9]*' || true)
done

if [ "$found" = 0 ]; then
  echo "No SKILL_COUNT markers found — nothing to check."
  exit 0
fi
if [ "$status" = 0 ]; then
  echo "OK: all SKILL_COUNT markers match on-disk count ($actual)."
fi
exit $status
