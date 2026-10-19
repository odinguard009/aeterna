#!/usr/bin/env bash
# Regenerates every generated doc of a release in ONE call (owner, 2026-10-20: docs go into the release commit, no separate
# `docs:` commit, so a release costs one pre-push run instead of two). Run it after the last task commit and BEFORE the push:
#   bash tools/release_docs.sh && git add -A && git commit --amend --no-edit
# Hand-written parts stay yours: docs/roadmap-data.json (statuses, updated, next), the CLAUDE.md **Next:** line and the finished
# items in docs/ai/roadmap-open.md; edit them first, then run this (the mind map is generated from roadmap-data.json).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/unlock_report.py > /dev/null && echo "unlock report ok"
python3 tools/pack_plan.py --measure --steps 60 | tail -1
# mechanic inventory only when this session touched mechanics or imports (P0 B6)
base=$(git rev-parse --verify -q origin/main || echo HEAD~1)
if ! git diff --quiet "$base" -- data/glossary/mechanics.json data/import; then python3 tools/mechanic_inventory.py | tail -1; fi
node tools/gen_roadmap.mjs | tail -1
