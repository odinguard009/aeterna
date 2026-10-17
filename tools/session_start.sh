#!/usr/bin/env bash
# One-call session setup for Aeterna.
#
# Usage (inside an existing clone):   bash tools/session_start.sh
# Usage (fresh machine, no clone yet): bash <(curl -fsSL https://raw.githubusercontent.com/odinguard009/aeterna/main/tools/session_start.sh)
#   (on a fresh session the repo must be attached first; then the clone
#    line below is what this script runs for you when it is started outside a clone.)
#
# What it does, in order, and stops at the first real failure:
#   1. Clone (light, sparse) if there is no clone yet.
#   2. Point git at .githooks (pre-push runs check_renames.py).
#   3. Run `npm run -s loop` once as a baseline so a broken state is seen before any edit.
#   0. Overlap guard (owner, 2026-10-16): if the newest commit on origin/main is a v* release commit under 30 minutes old (chore/docs commits do not count) another
#      session may still be running: print OVERLAP and exit 3 (tell the owner instead of starting parallel work).
#      --force skips the guard (owner present and sure).
# Optional: --with-sources adds data/sources (only needed for the Fandom import).
set -euo pipefail

REPO_URL="https://github.com/odinguard009/aeterna"
DEST="${BS_DEST:-aeterna}"
WITH_SOURCES=0; FORCE=0; BUSY=""
for a in "$@"; do [ "$a" = "--with-sources" ] && WITH_SOURCES=1; [ "$a" = "--force" ] && FORCE=1; done

# Already inside a clone?
if git rev-parse --show-toplevel >/dev/null 2>&1 && [ -f "$(git rev-parse --show-toplevel)/tools/loop.mjs" ]; then
  ROOT="$(git rev-parse --show-toplevel)"
elif [ -d "$DEST/.git" ]; then
  ROOT="$(cd "$DEST" && pwd)"
else
  echo "[session_start] cloning (light, sparse) into $DEST"
  git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$DEST"
  git -C "$DEST" sparse-checkout set --no-cone '/*' '!/data/sources/' '!/docs/red-cards-check-table.html'
  ROOT="$(cd "$DEST" && pwd)"
fi

cd "$ROOT"
git config core.hooksPath .githooks
if [ "$WITH_SOURCES" = 1 ]; then
  git sparse-checkout add data/sources
fi

git fetch -q origin main 2>/dev/null || true
AGE_MIN=$(( ( $(date +%s) - $(git log -1 --format=%ct origin/main 2>/dev/null || git log -1 --format=%ct) ) / 60 ))
echo "[session_start] newest commit on main: ${AGE_MIN} min ago"
SUBJ=$(git log -1 --format=%s origin/main 2>/dev/null || git log -1 --format=%s)
case "$SUBJ" in v[0-9]*) IS_V=1 ;; *) IS_V=0 ;; esac
# Preferred guard (idle chain, 2026-10-16): the session state on issue #1 (LOCK / MANUAL without DONE or UNLOCK).
# The commit-age rule below is only the fallback when gh cannot read the issue.
if [ "$FORCE" = 0 ] && BUSY=$(bash tools/session_gate.sh busy 2>/dev/null; echo "rc=$?"); [ "${BUSY##*rc=}" != 1 ] && [ -n "${BUSY%%rc=*}" ]; then
  if [ "${BUSY##*rc=}" = 3 ]; then
    echo "[session_start] OVERLAP: ${BUSY%%rc=*}" | tr -d '\n'; echo " - another session is active. Stop and tell the owner (or rerun with --force)."
    exit 3
  fi
elif [ "$AGE_MIN" -lt 30 ] && [ "$FORCE" = 0 ] && [ "$IS_V" = 1 ]; then
  echo "[session_start] OVERLAP: main changed ${AGE_MIN} min ago, another session may still be running. Stop and tell the owner (or rerun with --force)."
  exit 3
fi
echo "[session_start] HEAD: $(git log --oneline -1)"
echo "[session_start] baseline loop (build + lint + quick tests)"
npm run -s loop
# short summary (owner, 2026-10-16): enough context to pick the work without reading more files
echo "[session_start] version $(node -p "require('./package.json').version")"
git log --oneline -5 | sed 's/^/[session_start]   /'
grep -m1 -o '\*\*Next:.*' CLAUDE.md | cut -c1-400 | sed 's/^/[session_start] /' || true
python3 tools/unlock_report.py --line 2>/dev/null | sed 's/^/[session_start] /' || true
python3 tools/rules_audit.py --line 2>/dev/null | sed 's/^/[session_start] /' || true
RC=$(python3 -c "import json;print(json.load(open('docs/rules-audit-verdicts.json'))['checked'])" 2>/dev/null || echo 2000-01-01)
[ $(( ( $(date +%s) - $(date -d "$RC" +%s) ) / 86400 )) -gt 30 ] && echo "[session_start] WARNING rules checked $RC (>30 days): repeat Rules audit R1 (docs/manual-notes.md sources table)" || true
if command -v gh >/dev/null 2>&1; then
  gh api "repos/odinguard009/aeterna/issues?state=open" --jq '.[] | "[session_start] issue #\(.number) \(.title)"' 2>/dev/null || echo "[session_start] open issues: use list_issues (gh failed)"
else echo "[session_start] open issues: gh not available here, use the GitHub tools (list_issues)"; fi
echo "[session_start] ready"
