#!/usr/bin/env bash
# Usage: scaffold-domain.sh <vault-root> <slug> "<Human title>"
set -euo pipefail
ROOT="${1:?vault root}"
SLUG="${2:?slug}"
TITLE="${3:-$SLUG}"
DEST="$ROOT/domains/$SLUG"
mkdir -p "$DEST"/{agent,indexes,relationships,entries}
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

sed "s/{{title}}/$TITLE/g" "$SKILL_DIR/assets/domain-readme-template.md" > "$DEST/README.md"
sed "s/{{title}}/$TITLE/g" "$SKILL_DIR/assets/playbook-template.md" > "$DEST/agent/PLAYBOOK.md"
cat > "$DEST/agent/DISCLAIMER.md" << EOF
# Disclaimer — $TITLE

Literature mapping only. Not medical advice. See vault-root agent/DISCLAIMER.md.
EOF
printf '# Full list — %s\n\nAdd roster names here. Mark [note] when entries/*.md exists.\n' "$TITLE" > "$DEST/indexes/FULL-LIST.md"
printf '# By goal / system — %s\n\n' "$TITLE" > "$DEST/indexes/BY-GOAL.md"
printf '# Graph — %s\n\n| A | relation | B | note |\n|---|---|---|---|\n' "$TITLE" > "$DEST/relationships/GRAPH.md"
cp "$SKILL_DIR/assets/entry-template.md" "$DEST/entries/_TEMPLATE.md"

mkdir -p "$ROOT/agent"
if [ ! -f "$ROOT/agent/ROUTER.md" ]; then
  printf '# Router\n\n- %s → [[domains/%s/README]]\n' "$TITLE" "$SLUG" > "$ROOT/agent/ROUTER.md"
else
  grep -q "domains/$SLUG/README" "$ROOT/agent/ROUTER.md" || printf '\n- %s → [[domains/%s/README]]\n' "$TITLE" "$SLUG" >> "$ROOT/agent/ROUTER.md"
fi
echo "[OK] $DEST"
