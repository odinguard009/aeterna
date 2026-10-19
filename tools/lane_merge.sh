#!/usr/bin/env bash
# P1 parallel lanes (v0.63.1): merge step on main. Run by the lane session that finishes second, or a short merge session.
# Flow and rules: docs/ai/lanes/README.md. Steps:
#   1. fetch main and the lane branches; merge every lane branch that has commits not on main (--no-ff, one merge commit each)
#   2. print the open notes of docs/ai/lanes/<lane>.md (shared changes the lanes asked for) for the session to apply
#   3. rebuild (npm run -s loop): index.html, progress page, mind map, code map and README line come from the merged sources
# After it: apply the notes, one version bump + CHANGELOG heading (minor if any lane is minor), player-view pass when due,
# commit, push, release (skill bs-session-runner End), `bash tools/session_gate.sh done vX.Y.Z next=Opus`.
# --local (team session, owner 2026-10-19): merge the LOCAL lane branches made in git worktrees (no lane fetch, nothing pushed).
# Exit 4 = a merge conflict (the merge is aborted, main is unchanged): resolve by hand or stop and tell the owner.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
LOCAL=0; [ "${1:-}" = --local ] && LOCAL=1
[ "$(git symbolic-ref --short HEAD)" = main ] || git checkout -q main
git fetch -q --depth=200 origin main
git merge -q --ff-only origin/main
merged=""
for l in ui card q3; do
  b="lane/$l"
  if [ "$LOCAL" = 1 ]; then
    ref="$b"; git rev-parse -q --verify "refs/heads/$b" >/dev/null || { echo "[lane_merge] $b: no local branch"; continue; }
  else
    ref="origin/$b"; git fetch -q --depth=200 origin "$b:refs/remotes/origin/$b" 2>/dev/null || { echo "[lane_merge] $b: not on origin"; continue; }
  fi
  n=$(git rev-list --count "HEAD..$ref")
  if [ "$n" = 0 ]; then echo "[lane_merge] $b: nothing new"; continue; fi
  git merge -q --no-ff --no-edit -m "merge $b ($n commits)" "$ref" || {
    git merge --abort; echo "[lane_merge] $b: CONFLICT, merge aborted (main unchanged)"; exit 4; }
  merged="$merged $l"; echo "[lane_merge] $b: merged $n commits"
done
for l in ui card q3; do
  f="docs/ai/lanes/$l.md"
  [ -f "$f" ] && grep -q '^- \[ \]' "$f" && { echo "[lane_merge] open notes in $f:"; grep '^- \[ \]' "$f" | sed 's/^/  /'; }
done
[ -z "$merged" ] && { echo "[lane_merge] no lane had new commits"; exit 0; }
npm run -s loop
echo "[lane_merge] merged:$merged. Next: apply the notes (tick them '- [x]'), bump the version once, CHANGELOG, commit, push, release."
