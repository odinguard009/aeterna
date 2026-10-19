# Parallel lanes (P1, v0.63.1)

Two sessions at the same time: a **ui** lane and a **card** lane, each on its own branch, then one merge + release on `main`.
Opt-in: without a lane everything works as before (one session on `main`). Goal: shorter wall-clock time; total tokens do not drop.

## Files
| Lane | Owns (only this lane edits) |
|---|---|
| ui | `apps/web/src/`, `src/styles.css`, `docs/DESIGN.md`, `docs/design/`, `docs/ai/lanes/ui.md` |
| card | `packages/engine/src/` (except the `VERSION` line), `data/`, `tests/scenarios/`, compiler/import tools, `docs/ai/lanes/card.md` |
| shared (merge step only) | `package.json`, `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `index.html`, `docs/progress.html`, `docs/roadmap.html`, `docs/roadmap-data.json`, `docs/ai/roadmap-open.md`, `docs/ai/code-map.md`, `docs/reports/unlock-report.md`, `docs/reports/mechanic-inventory.md` |

Everything else (`tests/unit/`, `tests/suites/`, other tools and docs) is free for both; new files rarely clash.
The list lives in `tools/lanes.mjs` (`node tools/lanes.mjs --owner <path>`). The pre-commit hook refuses shared files, the other
lane's files and a changed `VERSION` line on a `lane/*` branch; `node tools/lanes.mjs --unstage-shared` drops the generated files
that `npm run -s loop` rewrote. The pre-push hook skips the build check there (the merge step rebuilds).

## Team session (one chat; owner, 2026-10-19 07:02; the default since then)
One roadmap session runs main + agents in ONE chat (CLAUDE.md "Team session", skill `bs-session-runner` step 8). Main works on `main`
(engine + current card head = card-lane files) and holds the gate. Agents with write work get a git worktree of the same clone:
A1 UI on `lane/ui` (`../wt-ui`), A5 Q3 on `lane/q3` (`../wt-q3`); the pre-commit hook enforces their lane files, they commit locally
and never fetch or push. Before the final push main runs `bash tools/lane_merge.sh --local` (merges the local lane branches, prints
their notes, rebuilds), applies the notes, gets the A7 review, and releases once. Unfinished lane work at the end is pushed as
`lane/<x>` and continued by the next session's agent. The two-chat lane session below still works for manual use.

| Lane | Owns |
|---|---|
| q3 | `docs/rules/`, `tools/rules_kb.py`, `tools/rules_kb/`, `tests/unit/rules_kb.test.mjs`, `docs/ai/lanes/q3.md` |

## Lane session ("Lanjutkan roadmap ui" / "Lanjutkan roadmap card")
1. `bash tools/session_start.sh --lane ui` (or `card`): overlap guard for that lane only, branch `lane/<lane>` (new from `main`, or the
   unmerged remote branch with `main` merged in; never a force-push).
2. `bash tools/session_gate.sh manual ui` (scheduled runs: `lock ui`). A mark with a lane blocks only that lane; a mark without a
   lane still blocks everything.
3. Work as usual (one commit per task, `npm run -s loop`), but no version bump, no CHANGELOG, no roadmap edits: write what the
   shared files need as `- [ ]` lines in `docs/ai/lanes/<lane>.md` (CHANGELOG bullets, roadmap lines, minor or patch).
4. Push the branch (`git push origin lane/<lane>`), then `bash tools/session_gate.sh lanedone <lane> lane/<lane>`.
5. The lane that finishes second (the other lane shows `LANEDONE` in `session_gate.sh status`, or has no new commits) runs the merge step.

## Merge step (on `main`)
`bash tools/lane_merge.sh`: merges each lane branch with new commits (`--no-ff`), prints the open notes, rebuilds. Then apply the
notes (tick them `- [x]`), one version bump (minor if any lane says minor), CHANGELOG, player-view pass when due, commit, push,
release and `bash tools/session_gate.sh done vX.Y.Z next=Opus` (skill `bs-session-runner` End). Exit 4 = conflict, `main` unchanged.

## Limits
- Sessions never create or change schedules, so auto mode stays one session at a time until the owner adds a second scheduled
  task for the second lane. Manual lanes (two chats) work now.
- Quota rule unchanged: on a usage / rate-limit error each lane pushes what is committed, `unlock <lane>`, stops.
- `MAX_AUTO_24H` and the no-progress count are over both lanes.

## First pair and measurement
U2 (ui) with Soul Magic (card). Compare wall-clock against the serial pair v0.62.0 / v0.63.0 and count merge conflicts. No time gain,
or more than one shared-file conflict per merge: go back to one lane and record why in `docs/ai/roadmap-open.md`.

## Revert
Lanes are opt-in: sessions without `--lane` are unchanged. To remove: revert the v0.63.1 lane commit (gate, hooks,
`tools/lanes.mjs`, `tools/lane_merge.sh`, this folder); backup of the previous state: branch `backup/v0.63.0`.
